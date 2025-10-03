import { NextApiRequest, NextApiResponse } from 'next';
import { TemplateEngine } from '../../../../lib/templateEngine';
import path from 'path';
import fs from 'fs';
import yaml from 'js-yaml';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { cliente } = req.query;
  const { orcamentos, dadosCliente } = req.body;

  try {
    // Validação básica
    if (!cliente || !orcamentos || !dadosCliente) {
      return res.status(400).json({ error: 'Dados obrigatórios não fornecidos' });
    }

    // 1. Estruturar dados no formato YAML
    const clienteData = {
      cliente: {
        nome: dadosCliente.nome || 'Cliente Teste',
        cidade: dadosCliente.cidade || 'Anápolis',
        estado: dadosCliente.estado || 'GO',
        consumo_mensal_kwh: dadosCliente.consumo_mensal_kwh || 1000,
        tipo_imovel: dadosCliente.tipo_imovel || 'Residencial',
        hsp_local: dadosCliente.hsp_local || 5.21,
        tarifa_kwh: dadosCliente.tarifa_kwh || 0.982
      },
      orcamentos: orcamentos.map((orc: any, index: number) => ({
        id: `orcamento_${index + 1}`,
        fornecedor: orc.distribuidor || orc.fornecedor || `Fornecedor ${index + 1}`,
        potencia_total_kwp: orc.potencia_total_kwp || 10.0,
        preco_custo: orc.preco_custo || 15000,
        preco_despesa: orc.preco_despesa || 3000,
        preco_total: (orc.preco_custo || 15000) + (orc.preco_despesa || 3000),
        inversores: orc.inversores || [{
          marca: 'SMA',
          modelo: 'Sunny Boy 5.0',
          potencia_kw: 5.0,
          quantidade: 2
        }],
        modulos: orc.modulos || [{
          marca: 'Jinko',
          modelo: 'JKM550M-72HL4-B',
          potencia_wp: 550,
          quantidade: 20,
          tipo: 'Monofacial'
        }],
        outros_componentes: orc.outros_componentes || ['Estrutura em alumínio', 'Cabeamento CC/CA']
      })),
      calculos_tecnicos: {
        performance_rate: 0.75,
        fator_capacidade: 0.18,
        geracao_mensal_kwh: 1200,
        geracao_anual_kwh: 14400,
        cobertura_consumo: 100
      },
      analise_financeira: {
        payback_simples_meses: 48,
        payback_descontado_meses: 60,
        tir_anual: 18.5,
        vpl_25_anos: 45000,
        economia_mensal: 1200,
        economia_anual: 14400,
        tarifa_tusd: 0.982
      },
      precos_comerciais: {
        preco_pix: 18000,
        preco_12x: 20000,
        preco_18x: 22000,
        desconto_pix: 10,
        preco_riscado: 25000
      },
      metricas_comparativas: {
        menor_payback: 48,
        maior_tir: 18.5,
        melhor_cobertura: 100,
        sistema_recomendado: 'Opção 1',
        potencia_recomendada: '10.0 kWp'
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
        status: 'concluido'
      }
    };

    // 2. Salvar dados YAML
    const yamlPath = path.join(process.cwd(), `src/data/clientes/${cliente}/dados_tecnicos.yaml`);
    
    // Criar diretório se não existir
    const dir = path.dirname(yamlPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    const yamlContent = yaml.dump(clienteData, { 
      indent: 2,
      lineWidth: 120,
      noRefs: true
    });
    
    fs.writeFileSync(yamlPath, yamlContent, 'utf-8');

    // 3. Gerar HTML final
    const engine = new TemplateEngine(clienteData);
    const outputPath = path.join(process.cwd(), `proposta_pieng_${cliente}_${new Date().toISOString().split('T')[0]}.html`);
    engine.saveProposta(outputPath);

    res.status(200).json({
      success: true,
      message: 'Proposta processada com sucesso (versão simplificada)',
      yamlPath: yamlPath,
      htmlPath: outputPath,
      dados: clienteData,
      aviso: 'Esta é uma versão simplificada sem cálculos Python. Use o Extrator Manual para dados reais.'
    });

  } catch (error) {
    console.error('Erro no processamento:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}
