import { NextApiRequest, NextApiResponse } from 'next';
import { TemplateEngine } from '../../../../lib/templateEngine';
import path from 'path';
import fs from 'fs';
import yaml from 'js-yaml';
import { isServerlessFs } from '@/lib/serverlessFs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  if (isServerlessFs()) {
    return res.status(503).json({
      error: 'processar-modular exige Python + filesystem local. Use /api/gerar-proposta em produção.',
      serverless: true,
    });
  }

  const { cliente } = req.query;
  const { orcamentos, dadosCliente } = req.body;

  try {
    // 1. Estruturar dados no formato YAML
    const clienteData = {
      cliente: {
        nome: dadosCliente.nome,
        cidade: dadosCliente.cidade,
        estado: dadosCliente.estado,
        consumo_mensal_kwh: dadosCliente.consumo_mensal_kwh,
        tipo_imovel: dadosCliente.tipo_imovel,
        hsp_local: dadosCliente.hsp_local,
        tarifa_kwh: dadosCliente.tarifa_kwh
      },
      orcamentos: orcamentos.map((orc: any, index: number) => ({
        id: `orcamento_${index + 1}`,
        fornecedor: orc.fornecedor,
        potencia_total_kwp: orc.potencia_total_kwp,
        preco_custo: orc.preco_custo,
        preco_despesa: orc.preco_despesa,
        preco_total: orc.preco_custo + orc.preco_despesa,
        inversores: orc.inversores || [],
        modulos: orc.modulos || [],
        outros_componentes: orc.outros_componentes || []
      })),
      calculos_tecnicos: {
        performance_rate: 0.75,
        fator_capacidade: 0, // Será calculado pelo Python
        geracao_mensal_kwh: 0, // Será calculado pelo Python
        geracao_anual_kwh: 0, // Será calculado pelo Python
        cobertura_consumo: 0 // Será calculado pelo Python
      },
      analise_financeira: {
        payback_simples_meses: 0, // Será calculado pelo Python
        payback_descontado_meses: 0, // Será calculado pelo Python
        tir_anual: 0, // Será calculado pelo Python
        vpl_25_anos: 0, // Será calculado pelo Python
        economia_mensal: 0, // Será calculado pelo Python
        economia_anual: 0, // Será calculado pelo Python
        tarifa_tusd: 0.982 // Valor fixo TUSD
      },
      precos_comerciais: {
        preco_pix: 0, // Será calculado
        preco_12x: 0, // Será calculado
        preco_18x: 0, // Será calculado
        desconto_pix: 10, // 10% desconto PIX
        preco_riscado: 0 // Será calculado
      },
      metricas_comparativas: {
        menor_payback: 0, // Será calculado
        maior_tir: 0, // Será calculado
        melhor_cobertura: 0, // Será calculado
        sistema_recomendado: '', // Será calculado
        potencia_recomendada: '' // Será calculado
      },
      empresa: {
        nome: 'PIENG Soluções',
        contato: '(62) 99167-0536',
        email: 'contato@piengsolucoes.com.br',
        site: 'www.piengsolucoes.com.br',
        whatsapp: '5562991670536'
      },
      documento: {
        data_geracao: new Date().toLocaleDateString('pt-BR'),
        data_validade: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR'),
        versao_template: '2.0',
        status: 'processando'
      }
    };

    // 2. Salvar dados YAML
    const yamlPath = path.join(process.cwd(), `src/data/clientes/${cliente}/dados_tecnicos.yaml`);
    const yamlContent = yaml.dump(clienteData, { 
      indent: 2,
      lineWidth: 120,
      noRefs: true
    });
    
    // Criar diretório se não existir
    const dir = path.dirname(yamlPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(yamlPath, yamlContent, 'utf-8');

    // 3. Executar cálculos Python
    const pythonScript = path.join(process.cwd(), 'python/solar_calculator.py');
    const pythonData = {
      cliente: clienteData.cliente,
      orcamentos: clienteData.orcamentos
    };

    // Executar Python e obter resultados
    const { exec } = require('child_process');
    const pythonProcess = exec(`python ${pythonScript}`, (error: any, stdout: any, stderr: any) => {
      if (error) {
        console.error('Erro Python:', error);
        return res.status(500).json({ error: 'Erro nos cálculos Python' });
      }

      try {
        const resultados = JSON.parse(stdout);
        
        // 4. Atualizar dados com resultados Python
        clienteData.calculos_tecnicos = {
          performance_rate: 0.75,
          fator_capacidade: resultados.fator_capacidade || 0,
          geracao_mensal_kwh: resultados.geracao_mensal || 0,
          geracao_anual_kwh: resultados.geracao_anual || 0,
          cobertura_consumo: resultados.cobertura_consumo || 0
        };

        clienteData.analise_financeira = {
          payback_simples_meses: resultados.payback_simples || 0,
          payback_descontado_meses: resultados.payback_descontado || 0,
          tir_anual: resultados.tir_anual || 0,
          vpl_25_anos: resultados.vpl_25_anos || 0,
          economia_mensal: resultados.economia_mensal || 0,
          economia_anual: resultados.economia_anual || 0,
          tarifa_tusd: 0.982
        };

        // 5. Calcular métricas comparativas
        const paybacks = orcamentos.map((orc: any) => resultados.payback_simples || 0);
        const tirs = orcamentos.map((orc: any) => resultados.tir_anual || 0);
        const coberturas = orcamentos.map((orc: any) => resultados.cobertura_consumo || 0);

        clienteData.metricas_comparativas = {
          menor_payback: Math.min(...paybacks),
          maior_tir: Math.max(...tirs),
          melhor_cobertura: Math.max(...coberturas),
          sistema_recomendado: `Opção ${paybacks.indexOf(Math.min(...paybacks)) + 1}`,
          potencia_recomendada: `${orcamentos[paybacks.indexOf(Math.min(...paybacks))]?.potencia_total_kwp || 0} kWp`
        };

        // 6. Atualizar status
        clienteData.documento.status = 'concluido';

        // 7. Salvar dados atualizados
        const yamlContentFinal = yaml.dump(clienteData, { 
          indent: 2,
          lineWidth: 120,
          noRefs: true
        });
        fs.writeFileSync(yamlPath, yamlContentFinal, 'utf-8');

        // 8. Gerar HTML final
        const engine = new TemplateEngine(clienteData);
        const outputPath = path.join(process.cwd(), `proposta_pieng_${cliente}_${new Date().toISOString().split('T')[0]}.html`);
        engine.saveProposta(outputPath);

        res.status(200).json({
          success: true,
          message: 'Proposta processada com sucesso',
          yamlPath: yamlPath,
          htmlPath: outputPath,
          dados: clienteData
        });

      } catch (parseError) {
        console.error('Erro ao processar resultados Python:', parseError);
        res.status(500).json({ error: 'Erro ao processar resultados' });
      }
    });

    // Enviar dados para o Python
    pythonProcess.stdin?.write(JSON.stringify(pythonData));
    pythonProcess.stdin?.end();

  } catch (error) {
    console.error('Erro no processamento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
}
