import { NextApiRequest, NextApiResponse } from 'next';
import { promises as fs } from 'fs';
import path from 'path';
import { generateTemplateHtmlPadrao, generateTemplateHtmlResultados } from '@/lib/templateEngine';
import { pythonCalculator } from '@/lib/python-calculator';

// Interface para dados de extração de PDFs
interface ExtractedData {
  fornecedor?: string;
  valorTotal?: number;
  dataOrcamento?: string;
  componentes?: {
    modulos?: {
      marca: string;
      modelo: string;
      potencia: number;
      quantidade: number;
      precoUnitario: number;
    };
    inversores?: {
      marca: string;
      modelo: string;
      potencia: number;
      quantidade: number;
      precoUnitario: number;
    };
    estrutura?: {
      tipo: string;
      quantidade: number;
      precoUnitario: number;
    };
    outros?: Array<{
      item: string;
      quantidade: number;
      precoUnitario: number;
    }>;
  };
}

// Função para carregar configurações dinâmicas da API de admin
async function carregarConfiguracoes() {
  try {
    // Tentar carregar da API de configurações primeiro
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/admin/config`);
    
    if (response.ok) {
      const configData = await response.json();
      console.log('📋 Configurações carregadas da API admin:', configData);
      return configData;
    }
    
    // Fallback: carregar do arquivo estático
    const configPath = path.join(process.cwd(), 'src/data/sistema/configuracoes.json');
    const configData = await fs.readFile(configPath, 'utf8');
    const parsedConfig = JSON.parse(configData);
    console.log('📋 Configurações carregadas do arquivo estático:', parsedConfig);
    return parsedConfig;
  } catch (error) {
    console.log('📋 Usando configurações padrão (erro ao carregar):', error instanceof Error ? error.message : 'Erro desconhecido');
    return {
      descontoPix: 10.0,
      fatorParcelado: 1.20,
      fator12x: 0.88,
      fator18x: 0.83,
      performanceRate: 0.75,
      jurosParcela12x: 2.5,
      jurosParcela18x: 3.2
    };
  }
}

// Função para validar dados com Python Calculator
async function validarDadosComPython(orcamentos: any[], cliente: any) {
  try {
    const validationResults = [];
    
    for (const orc of orcamentos) {
      if (orc.modulos && orc.pot_modulo && orc.pcusto) {
        const validationResult = await pythonCalculator.validateExtractedData({
          componentes: {
            modulos: {
              potencia: orc.pot_modulo,
              quantidade: orc.modulos,
              marca: orc.marca_modulo || 'N/A'
            },
            inversores: {
              potencia: orc.pot_inv || 0,
              quantidade: orc.inversores || 1,
              marca: orc.marca_inversor || 'N/A'
            }
          },
          valorTotal: orc.pcusto
        });
        
        validationResults.push({
          nome: orc.nome,
          validation: validationResult
        });
      }
    }
    
    return validationResults;
  } catch (error) {
    console.warn('⚠️ Validação Python não disponível:', error);
    return [];
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { cliente, orcamentos, config } = req.body;

    // Debug: mostrar dados recebidos
    console.log('📥 Dados recebidos na API:', {
      cliente: cliente,
      orcamentosCount: orcamentos?.length || 0,
      orcamentos: orcamentos?.map((orc: any) => ({
        nome: orc.nome,
        ppix: orc.ppix,
        pavista: orc.pavista,
        geracaoMensal: orc.geracaoMensal,
        paybackMeses: orc.paybackMeses
      })),
      config: config
    });

    // Validar dados
    if (!cliente || !orcamentos || !config) {
      return res.status(400).json({ message: 'Dados incompletos' });
    }

    // 🔧 NOVO: Carregar configurações dinâmicas do sistema
    const configSistema = await carregarConfiguracoes();
    console.log('📋 Configurações carregadas:', configSistema);

    // 🔧 NOVO: Validar dados com Python Calculator
    const validationResults = await validarDadosComPython(orcamentos, cliente);
    console.log('🐍 Validação Python:', validationResults.length, 'resultados');

    // Calcular preços usando configurações dinâmicas do sistema
    const calcularPrecos = (totalFinal: number) => {
      const ppix = totalFinal; // PIX = Total Final da tabela

      // 🔧 NOVO: Usar configurações dinâmicas do sistema
      // Verificar se descontoPix já está em decimal (0.1) ou percentual (10)
      const descontoPixRaw = configSistema.descontoPix || 10.0;
      const descontoPix = descontoPixRaw > 1 ? descontoPixRaw / 100 : descontoPixRaw; // Converter se for percentual
      const markupParcelado = configSistema.fatorParcelado || 1.20; // markup para parcelado
      const fator12x = configSistema.fator12x || 0.88; // fator 12x
      const fator18x = configSistema.fator18x || 0.83; // fator 18x
      
      console.log('🔧 Parâmetros de cálculo:', {
        descontoPixRaw,
        descontoPix,
        markupParcelado,
        fator12x,
        fator18x
      });

      const pavista = ppix / (1 - descontoPix); // À vista
      const priscado = ppix * markupParcelado; // Preço riscado
      const p12x_total = ppix / fator12x; // 12x com taxa
      const p12x = p12x_total / 12; // Parcela 12x
      const p18x_total = ppix / fator18x; // 18x com taxa
      const p18x_parcela = p18x_total / 18; // Parcela 18x

      return {ppix, pavista, priscado, p12x, p18x_parcela, p12x_total, p18x_total};
    };

    // Calcular performance usando configurações dinâmicas
    const calcularPerformance = (potenciaKw: number, hsp: number, consumoMensal: number, tarifa: number, investimentoPix: number) => {
      // 🔧 NOVO: Usar performanceRate das configurações do sistema
      const performanceRate = configSistema.performanceRate || config.performanceRate || 0.75;
      const geracaoMensal = potenciaKw * hsp * 30.4 * performanceRate;
      const cobertura = (geracaoMensal / consumoMensal) * 100;
      const economiaMensal = geracaoMensal * tarifa;
      const paybackMeses = investimentoPix / economiaMensal;
      const tirAnual = (12 / paybackMeses) * 100;
      
      return {geracaoMensal, cobertura, economiaMensal, paybackMeses, tirAnual};
    };

    // Processar orçamentos - USAR DADOS JÁ CALCULADOS DO FRONTEND
    const sistemas = orcamentos.map((orc: any, index: number) => {
      console.log(`🔍 Processando orçamento ${index + 1}:`, {
        nome: orc.nome,
        temPpix: !!orc.ppix,
        temPavista: !!orc.pavista,
        temGeracaoMensal: !!orc.geracaoMensal,
        temPaybackMeses: !!orc.paybackMeses,
        ppix: orc.ppix,
        pavista: orc.pavista,
        geracaoMensal: orc.geracaoMensal,
        paybackMeses: orc.paybackMeses
      });

      // Se os dados já vêm calculados do frontend, usar diretamente
      if (orc.ppix !== undefined && orc.pavista !== undefined && orc.geracaoMensal !== undefined && orc.paybackMeses !== undefined) {
        console.log(`✅ Usando dados calculados do frontend para ${orc.nome}`);

        // Calcular valores que podem estar faltando
        const potTotal = orc.potTotal || (orc.modulos * orc.pot_modulo) / 1000;
        const precos = calcularPrecos(orc.ppix);

        return {
          nome: orc.nome,
          potTotal: potTotal,
          pcusto: orc.pcusto || 0,
          pdespesa: orc.pdespesa_total || orc.pdespesa || 0,
          modulos: orc.modulos || Math.round(potTotal * 1000 / 580),
          pot_modulo: orc.pot_modulo || 580,
          marca_modulo: orc.marca_modulo || 'N/A',
          inversores: orc.inversores || 1,
          pot_inv: orc.pot_inv || Math.ceil(potTotal),
          marca_inversor: orc.marca_inversor || 'N/A',
          tipo_instalacao: orc.tipo_instalacao || 'Telhado Fibrocimento',
          // Usar dados já calculados do frontend ou calculados agora
          ppix: orc.ppix || 0,
          pavista: orc.pavista || precos.pavista || 0,
          priscado: orc.priscado || precos.priscado || 0,
          p12x: orc.p12x || precos.p12x || 0,
          p12x_total: orc.p12x_total || precos.p12x_total || 0,
          p18x_parcela: orc.p18x_parcela || precos.p18x_parcela || 0,
          p18x_total: orc.p18x_total || precos.p18x_total || 0,
          geracaoMensal: orc.geracaoMensal || 0,
          cobertura: orc.cobertura || (orc.geracaoMensal / config.consumoMensal) * 100 || 0,
          economiaMensal: orc.economiaMensal || (orc.geracaoMensal * config.tarifa) || 0,
          paybackMeses: orc.paybackMeses || 0,
          tirAnual: orc.tirAnual || (orc.paybackMeses > 0 ? (12 / orc.paybackMeses) * 100 : 0)
        };
      }

      // Fallback: calcular se os dados não vieram do frontend
      console.log(`⚠️ Calculando dados para ${orc.nome} (fallback)`);
      const potTotal = (orc.modulos * orc.pot_modulo) / 1000;
      const totalFinal = orc.total_final || (orc.pcusto + orc.pdespesa_total);
      const pdespesa = orc.pdespesa_total || (config.metodo === 'fixo' ? config.pdespesaFixo : orc.pcusto * (config.pdespesaVariavel / 100));
      const precos = calcularPrecos(totalFinal);
      const performance = calcularPerformance(potTotal, config.hsp, config.consumoMensal, config.tarifa, precos.ppix);

      return {
        nome: orc.nome,
        potTotal,
        pcusto: orc.pcusto,
        pdespesa,
        modulos: orc.modulos,
        pot_modulo: orc.pot_modulo,
        marca_modulo: orc.marca_modulo,
        inversores: orc.inversores,
        pot_inv: orc.pot_inv,
        marca_inversor: orc.marca_inversor,
        tipo_instalacao: orc.tipo_instalacao || 'Telhado Fibrocimento',
        ...precos,
        ...performance
      };
    });

    // Debug: mostrar sistemas processados
    console.log('🔍 Sistemas processados:', {
      count: sistemas.length,
      sistemas: sistemas.map((sistema: any, index: number) => ({
        index: index + 1,
        nome: sistema.nome,
        ppix: sistema.ppix,
        pavista: sistema.pavista,
        geracaoMensal: sistema.geracaoMensal,
        paybackMeses: sistema.paybackMeses,
        potTotal: sistema.potTotal
      }))
    });

    // Ordenar por PIX
    sistemas.sort((a: any, b: any) => a.ppix - b.ppix);

    // Gerar HTML da proposta
    const dataAtual = new Date().toLocaleDateString('pt-BR');
    // Normalizar slug removendo acentos e caracteres especiais
    const normalizeSlug = (text: string) => {
      return text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove acentos
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '') // Remove caracteres especiais
        .replace(/\s+/g, '-') // Substitui espaços por hífens
        .replace(/-+/g, '-') // Remove hífens duplicados
        .trim();
    };

    const slug = `${normalizeSlug(cliente.nome)}-${dataAtual.replace(/\//g, '-')}`;
    
    const htmlContent = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PIENG | Proposta Solar - ${cliente.nome}</title>
    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><defs><linearGradient id='piengGradient' x1='0%' y1='0%' x2='100%' y2='100%'><stop offset='0%' style='stop-color:%233366CC;stop-opacity:1' /><stop offset='100%' style='stop-color:%23FF6B35;stop-opacity:1' /></linearGradient></defs><circle cx='16' cy='16' r='15' fill='url(%23piengGradient)' stroke='%23ffffff' stroke-width='1'/><circle cx='16' cy='16' r='12' fill='none' stroke='rgba(0,0,0,0.1)' stroke-width='1'/><text x='16' y='22' text-anchor='middle' fill='white' font-family='Arial, sans-serif' font-size='18' font-weight='900' text-shadow='0 1px 2px rgba(0,0,0,0.3)'>P</text><ellipse cx='16' cy='8' rx='8' ry='3' fill='rgba(255,255,255,0.2)'/></svg>" type="image/svg+xml">
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 10px; padding: 30px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #e0e0e0; }
        .header h1 { color: #3366CC; font-size: 28px; margin-bottom: 10px; }
        .client-info { background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
        .systems-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .system-card { border: 1px solid #ddd; border-radius: 10px; padding: 20px; background: white; }
        .system-card h3 { color: #3366CC; margin-bottom: 15px; }
        .price-section { background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 15px; }
        .price-old { color: #e74c3c; text-decoration: line-through; font-size: 16px; margin-bottom: 8px; }
        .price-new { font-size: 24px; font-weight: bold; color: #3366CC; margin-bottom: 10px; }
        .price-tag { background: #e74c3c; color: white; padding: 4px 12px; border-radius: 15px; font-size: 12px; font-weight: bold; display: inline-block; margin-bottom: 15px; }
        .metrics { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
        .metric { text-align: center; }
        .metric-value { font-size: 18px; font-weight: bold; color: #3366CC; }
        .metric-label { font-size: 12px; color: #666; }
        .comparison-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        .comparison-table th, .comparison-table td { padding: 12px; text-align: center; border: 1px solid #ddd; }
        .comparison-table th { background: #3366CC; color: white; font-weight: bold; }
        .comparison-table tr:nth-child(even) { background: #f8f9fa; }
        .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⚡ PIENG Soluções Energéticas</h1>
            <p>Proposta Solar Personalizada</p>
        </div>

        <div class="client-info">
            <strong>Cliente:</strong> ${cliente.nome} | 
            <strong>Cidade:</strong> ${cliente.cidade} | 
            <strong>Consumo:</strong> ${cliente.consumo_mensal} kWh/mês | 
            <strong>Tipo:</strong> ${cliente.tipo_imovel}
        </div>

        <div class="systems-grid">
            ${sistemas.map((sistema: any, index: number) => `
                <div class="system-card">
                    <h3>OPÇÃO ${index + 1} ${index === 0 ? '⭐' : ''}</h3>
                    <div class="price-section">
                        <div class="price-old">De R$ ${(sistema.priscado || 0).toFixed(2)}</div>
                        <div class="price-new">À vista: R$ ${(sistema.pavista || 0).toFixed(2)}</div>
                        <div class="price-tag">ECONOMIA DE ${(((sistema.pavista || 0) - (sistema.ppix || 0)) / (sistema.pavista || 1) * 100).toFixed(0)}%</div>
                        <div><strong>PIX: R$ ${(sistema.ppix || 0).toFixed(2)}</strong></div>
                    </div>
                    <div class="metrics">
                        <div class="metric">
                            <div class="metric-value">${(sistema.geracaoMensal || 0).toFixed(0)} kWh</div>
                            <div class="metric-label">Geração/Mês</div>
                        </div>
                        <div class="metric">
                            <div class="metric-value">${(parseFloat(sistema.cobertura) || 0).toFixed(0)}%</div>
                            <div class="metric-label">Cobertura</div>
                        </div>
                        <div class="metric">
                            <div class="metric-value">${(sistema.paybackMeses || 0).toFixed(1)}m</div>
                            <div class="metric-label">Payback</div>
                        </div>
                        <div class="metric">
                            <div class="metric-value">${(sistema.tirAnual || 0).toFixed(1)}%</div>
                            <div class="metric-label">TIR</div>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>

        <table class="comparison-table">
            <thead>
                <tr>
                    <th>Sistema</th>
                    <th>Potência</th>
                    <th>PIX</th>
                    <th>12x S/Juros</th>
                    <th>18x Cartão</th>
                    <th>Geração/Mês</th>
                    <th>Payback</th>
                    <th>TIR</th>
                </tr>
            </thead>
            <tbody>
                ${sistemas.map((sistema: any, index: number) => `
                    <tr ${index === 0 ? 'style="background: rgba(46, 204, 113, 0.2); font-weight: bold;"' : ''}>
                        <td>OPÇÃO ${index + 1} ${index === 0 ? '⭐' : ''}</td>
                        <td>${sistema.potTotal.toFixed(2)} kWp</td>
                        <td><strong>R$ ${sistema.ppix.toFixed(2)}</strong></td>
                        <td>R$ ${sistema.p12x.toFixed(2)}</td>
                        <td>R$ ${sistema.p18x_parcela.toFixed(2)}</td>
                        <td>${(sistema.geracaoMensal || 0).toFixed(0)} kWh</td>
                        <td>${(sistema.paybackMeses || 0).toFixed(1)} meses</td>
                        <td>${(sistema.tirAnual || 0).toFixed(1)}%</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>

        <div class="footer">
            <p>PIENG Soluções Energéticas - ${dataAtual}</p>
            <p>Gerado automaticamente pelo Sistema PIENG v2.0</p>
        </div>
    </div>
</body>
</html>`;

    // 🔧 CORREÇÃO NETLIFY: Verificar se estamos em ambiente serverless (Netlify/Vercel)
    const isServerless = process.env.NETLIFY || process.env.VERCEL || process.env.NODE_ENV === 'production';
    
    // Em produção (Netlify), usar /tmp. Em dev local, usar src/data/clientes
    const baseDir = isServerless ? '/tmp' : path.join(process.cwd(), 'src/data/clientes');
    const clienteDir = path.join(baseDir, slug);
    
    try {
      await fs.mkdir(clienteDir, { recursive: true });
    } catch (mkdirError) {
      console.log('⚠️ Não foi possível criar diretório, salvando em /tmp');
      // Fallback: salvar diretamente em /tmp sem subpasta
      const tmpDir = '/tmp';
      await fs.mkdir(tmpDir, { recursive: true });
    }

    // 🚀 GERAR TEMPLATES USANDO ENGINE PADRÃO
    let arquivo = `proposta_${slug}.html`;
    let arquivoPath = path.join(clienteDir, arquivo);

    try {
      const templateData = {
        cliente: {
          nome: cliente.nome,
          cidade: cliente.cidade,
          consumoMensal: cliente.consumo_mensal,
          consumoKwh: cliente.consumo_mensal.toString(),
          tipo: cliente.tipo_imovel,
          hspLocal: (cliente.hsp || 5.21).toString(),
          // Novo: tipo de instalação vindo do payload/YAML
          tipoInstalacao: (cliente.tipoInstalacao || cliente.tipo_instalacao || cliente.instalacao || '').toString()
        },
        sistemas: sistemas.map((sistema: any) => ({
          // Dados básicos do sistema
          nome: sistema.nome,
          titulo: sistema.nome,
          potTotal: sistema.potTotal,
          potencia: `${sistema.potTotal.toFixed(2)} kWp`,
          modulos: sistema.modulos,
          pot_modulo: sistema.pot_modulo,
          marca_modulo: sistema.marca_modulo,
          inversores: sistema.inversores,
          pot_inv: sistema.pot_inv,
          marca_inversor: sistema.marca_inversor,
          tipo_instalacao: sistema.tipo_instalacao || 'Telhado Fibrocimento',

          // Preços (valores numéricos para template engine)
          ppix: sistema.ppix,
          pavista: sistema.pavista,
          priscado: sistema.priscado,
          p12x: sistema.p12x,
          p18x_parcela: sistema.p18x_parcela,

          // Formatados para Next.js
          precoRiscado: `R$ ${sistema.priscado.toFixed(2)}`,
          precoAtual: `R$ ${sistema.pavista.toFixed(2)}`,
          tagDesconto: `ECONOMIA DE ${((sistema.pavista - sistema.ppix) / sistema.pavista * 100).toFixed(0)}%`,
          precoPixDecimal: sistema.ppix,
          preco12x: `R$ ${sistema.p12x.toFixed(2)}`,
          preco18x: `R$ ${sistema.p18x_parcela.toFixed(2)}`,

          // Performance (valores numéricos para template engine)
          geracaoMensal: sistema.geracaoMensal,
          cobertura: (parseFloat(sistema.cobertura) || 0),
          economiaMensal: sistema.economiaMensal,
          paybackMeses: sistema.paybackMeses,
          tirAnual: sistema.tirAnual,

          // Formatados para Next.js
          geracao: `${(sistema.geracaoMensal || 0).toFixed(0)} kWh`,
          economia: `R$ ${(sistema.economiaMensal || 0).toFixed(2)}`,
          payback: `${(sistema.paybackMeses || 0).toFixed(1)} meses`,
          tir: `${(sistema.tirAnual || 0).toFixed(1)}%`,

          // Especificações
          especificacoes: [
            `${sistema.modulos || Math.round(sistema.potTotal * 1000 / 580)} módulos ${sistema.marca_modulo || 'N/A'} ${sistema.pot_modulo || 580}W`,
            `${sistema.inversores || 1} inversor${sistema.inversores > 1 ? 'es' : ''} ${sistema.marca_inversor || 'N/A'} ${sistema.pot_inv || Math.ceil(sistema.potTotal)}kW`,
            'Estrutura de alumínio para telhado',
            'Cabeamento CC/CA completo',
            'String box DC/AC + proteções'
          ],

          isRecommended: true,
          badge: '⭐ MELHOR PAYBACK'
        })),
        analise: {
          paybackMin: sistemas.length > 0 ? (sistemas[0].paybackMeses || 0).toFixed(1) : '0',
          paybackMax: sistemas.length > 0 ? (sistemas[sistemas.length - 1].paybackMeses || 0).toFixed(1) : '0',
          melhorSistemaNome: sistemas.length > 0 ? sistemas[0].nome : 'Sistema Econômico',
          melhorSistemaPotencia: sistemas.length > 0 ? `${sistemas[0].potTotal.toFixed(2)} kWp` : '0 kWp',
          melhorSistemaPix: sistemas.length > 0 ? `R$ ${sistemas[0].ppix.toFixed(2)}` : 'R$ 0,00',
          melhorSistemaPayback: sistemas.length > 0 ? `${(sistemas[0].paybackMeses || 0).toFixed(1)} meses` : '0 meses',
          geracaoMax: sistemas.length > 0 ? (sistemas[0].geracaoMensal || 0).toFixed(0) : '0',
          coberturaMax: sistemas.length > 0 ? `${(sistemas[0].cobertura || 0).toFixed(0)}%` : '0%',
          tirMax: sistemas.length > 0 ? `${(sistemas[0].tirAnual || 0).toFixed(1)}%` : '0%',
          economiaTarifa: `R$ ${(cliente.tarifa || 0.982).toFixed(3)}`
        },
        empresa: {
          contato: "(62) 99167-0536",
          email: "contato@piengsolucoes.com.br",
          site: "www.piengsolucoes.com.br"
        },
        bannerUrgencia: "🚀 Oferta especial válida até o final do mês!",
        dataGeracao: dataAtual,
        dataValidade: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR')
      };

      // 🚀 GERAR TEMPLATE PADRÃO usando template_proposta_pieng.html
      const templatePadraoHtml = await generateTemplateHtmlPadrao(templateData);
      await fs.writeFile(arquivoPath, templatePadraoHtml, 'utf8');

      console.log('✅ Template Padrão gerado:', arquivo);

      // Gerar template de Resultados Financeiros (novo padrão)
      const templateResultadosHtml = await generateTemplateHtmlResultados(templateData);
      const templateResultadosArquivo = `proposta_resultados_${slug}.html`;
      const templateResultadosArquivoPath = path.join(clienteDir, templateResultadosArquivo);
      await fs.writeFile(templateResultadosArquivoPath, templateResultadosHtml, 'utf8');

      console.log('✅ Template de Resultados Financeiros gerado:', templateResultadosArquivo);

      // 🚀 PERSISTÊNCIA VERCEL: Copiar HTMLs para pasta pública (sempre que possível)
      try {
        const publicPropostasDir = path.join(process.cwd(), 'public/propostas/orçamento/clientes');
        await fs.mkdir(publicPropostasDir, { recursive: true });

        // Copiar template padrão
        const publicArquivoPath = path.join(publicPropostasDir, arquivo);
        await fs.copyFile(arquivoPath, publicArquivoPath);
        console.log('✅ Template Padrão copiado para public/:', arquivo);

        // Copiar template de resultados
        const publicResultadosPath = path.join(publicPropostasDir, templateResultadosArquivo);
        await fs.copyFile(templateResultadosArquivoPath, publicResultadosPath);
        console.log('✅ Template Resultados copiado para public/:', templateResultadosArquivo);
      } catch (publicError) {
        console.log('⚠️ Não foi possível copiar para public/ (normal em serverless):', publicError instanceof Error ? publicError.message : 'Erro desconhecido');
      }
    } catch (templateError) {
      console.log('❌ Erro ao gerar templates:', templateError);
      // Fallback: gerar HTML simples se template der erro
      await fs.writeFile(arquivoPath, htmlContent, 'utf8');
      console.log('⚠️ Fallback: HTML simples gerado');
    }

    // Gerar dados JSON completos para a página dinâmica Next.js
    const propostaData = {
      cliente: {
        nome: cliente.nome,
        cidade: cliente.cidade,
        consumoMensal: cliente.consumo_mensal,
        consumoKwh: cliente.consumo_mensal.toString(),
        tipoImovel: cliente.tipo_imovel,
        tipo: cliente.tipo_imovel,
        hspLocal: (cliente.hsp || 5.21).toString()
      },
      sistemas: (() => {
        // Encontrar o sistema com melhor payback
        let melhorPayback = Infinity;
        let melhorIndice = 0;
        
        sistemas.forEach((sistema: any, index: number) => {
          const payback = sistema.paybackMeses || 0;
          if (payback < melhorPayback) {
            melhorPayback = payback;
            melhorIndice = index;
          }
        });

        return sistemas.map((sistema: any, index: number) => ({
          titulo: `Sistema ${String(index + 1).padStart(2, '0')}`,
          potencia: `${sistema.potTotal.toFixed(2)} kWp`,
          especificacoes: [
            `${sistema.modulos || Math.round(sistema.potTotal * 1000 / 580)} módulos ${sistema.marca_modulo || 'N/A'} ${sistema.pot_modulo || 580}W`,
            `${sistema.inversores || 1} inversor${sistema.inversores > 1 ? 'es' : ''} ${sistema.marca_inversor || 'N/A'} ${sistema.pot_inv || Math.ceil(sistema.potTotal)}kW`,
            'Estrutura de alumínio para telhado',
            'Cabeamento CC/CA completo',
            'String box DC/AC + proteções'
          ],
          precoRiscado: `R$ ${sistema.priscado.toFixed(2)}`,
          precoAtual: `R$ ${sistema.pavista.toFixed(2)}`,
          tagDesconto: `ECONOMIA DE ${((sistema.pavista - sistema.ppix) / sistema.pavista * 100).toFixed(0)}%`,
          precoPixDecimal: sistema.ppix,
          preco12x: `R$ ${sistema.p12x.toFixed(2)}`,
          preco18x: `R$ ${sistema.p18x_parcela.toFixed(2)}`,
          geracao: `${(sistema.geracaoMensal || 0).toFixed(0)} kWh`,
          cobertura: `${((parseFloat(sistema.cobertura) || 0) || 0).toFixed(0)}%`,
          economia: `R$ ${(sistema.economiaMensal || 0).toFixed(2)}`,
          payback: `${(sistema.paybackMeses || 0).toFixed(1)} meses`,
          tir: `${(sistema.tirAnual || 0).toFixed(1)}%`,
          isRecommended: index === melhorIndice,
          badge: index === melhorIndice ? '⭐ MELHOR PAYBACK' : ''
        }));
      })(),
      analise: (() => {
        if (sistemas.length === 0) {
          return {
            paybackMin: '0',
            paybackMax: '0',
            melhorSistemaNome: 'Sistema Econômico',
            melhorSistemaPotencia: '0 kWp',
            melhorSistemaPix: 'R$ 0,00',
            melhorSistemaPayback: '0 meses',
            geracaoMax: '0',
            coberturaMax: '0%',
            tirMax: '0%',
            economiaTarifa: `R$ ${(cliente.tarifa || 0.982).toFixed(3)}`
          };
        }

        // Encontrar o sistema com melhor payback
        let melhorPayback = Infinity;
        let melhorIndice = 0;
        
        sistemas.forEach((sistema: any, index: number) => {
          const payback = sistema.paybackMeses || 0;
          if (payback < melhorPayback) {
            melhorPayback = payback;
            melhorIndice = index;
          }
        });

        const melhorSistema = sistemas[melhorIndice];
        const paybacks = sistemas.map((s: any) => s.paybackMeses || 0);
        const geracoes = sistemas.map((s: any) => s.geracaoMensal || 0);
        const coberturas = sistemas.map((s: any) => s.cobertura || 0);
        const tirs = sistemas.map((s: any) => s.tirAnual || 0);

        return {
          paybackMin: Math.min(...paybacks).toFixed(1),
          paybackMax: Math.max(...paybacks).toFixed(1),
          melhorSistemaNome: melhorSistema.nome || `Sistema ${melhorIndice + 1}`,
          melhorSistemaPotencia: `${melhorSistema.potTotal.toFixed(2)} kWp`,
          melhorSistemaPix: `R$ ${melhorSistema.ppix.toFixed(2)}`,
          melhorSistemaPayback: `${melhorSistema.paybackMeses.toFixed(1)} meses`,
          geracaoMax: Math.max(...geracoes).toFixed(0),
          coberturaMax: `${Math.max(...coberturas).toFixed(0)}%`,
          tirMax: `${Math.max(...tirs).toFixed(1)}%`,
          economiaTarifa: `R$ ${(cliente.tarifa || 0.982).toFixed(3)}`
        };
      })(),
      empresa: {
        contato: "(62) 99167-0536",
        email: "contato@piengsolucoes.com.br",
        whatsapp: "5562991670536",
        site: "www.piengsolucoes.com.br"
      },
      dataGeracao: dataAtual,
      dataValidade: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR'),
      slug: slug,
      bannerUrgencia: "🚀 Oferta especial válida até o final do mês!"
    };

    // Salvar arquivo JSON para Next.js (apenas em desenvolvimento)
    if (!isServerless) {
      const jsonPath = path.join(clienteDir, 'proposta.json');
      await fs.writeFile(jsonPath, JSON.stringify(propostaData, null, 2), 'utf8');
    }

    // 🚀 OBRIGATÓRIO: SALVAR NO SUPABASE ANTES DE RETORNAR (PRODUÇÃO E DESENVOLVIMENTO)
    let propostaSalvaNoSupabase = false;
    let propostaSupabaseId: string | null = null;
    
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey) {
        console.warn('⚠️ Variáveis Supabase não configuradas - PROPOSTA NÃO SERÁ SALVA NO BANCO!');
        throw new Error('Variáveis Supabase não configuradas');
      }

      const supabase = createClient(supabaseUrl, supabaseKey);
      
      // Buscar ou criar cliente usando função helper
      const { findOrCreateCliente } = await import('@/lib/supabase');
      const estadoCliente = cliente.cidade?.includes('GO') ? 'GO' : (cliente.cidade?.includes('SP') ? 'SP' : cliente.estado || 'GO');
      
      console.log('💾 Salvando cliente no Supabase...');
      const clienteSupabase = await findOrCreateCliente({
        nome: cliente.nome,
        cidade: cliente.cidade,
        estado: estadoCliente,
        tipo_imovel: cliente.tipo_imovel?.toLowerCase() || 'residencial',
        consumo_mensal: cliente.consumo_mensal || 0,
        hsp_local: config.hsp || parseFloat(cliente.hspLocal?.toString() || '5.21'),
        email: cliente.email,
        telefone: cliente.telefone,
        pdespesa: cliente.pdespesa,
      });

      if (!clienteSupabase || !clienteSupabase.id) {
        throw new Error('Falha ao criar/buscar cliente no Supabase');
      }

      console.log('✅ Cliente salvo/buscado no Supabase:', clienteSupabase.id);

      // Ler HTML gerado
      const htmlGenerated = await fs.readFile(arquivoPath, 'utf8').catch(() => '');
      
      // Salvar proposta no Supabase (OBRIGATÓRIO)
      console.log('💾 Salvando proposta no Supabase...');
      const { data: propostaSalva, error: propostaError } = await supabase
        .from('propostas')
        .upsert({
          cliente_id: clienteSupabase.id,
          slug: slug,
          titulo: `Proposta Solar - ${cliente.nome}`,
          template_usado: 'pieng_basic',
          sistema_kwp: sistemas[0]?.potTotal || 0,
          geracao_mensal: sistemas[0]?.geracaoMensal || 0,
          geracao_anual: (sistemas[0]?.geracaoMensal || 0) * 12,
          valor_total: sistemas[0]?.ppix || 0,
          valor_kwp: (sistemas[0]?.ppix || 0) / (sistemas[0]?.potTotal || 1),
          payback: Math.round((sistemas[0]?.paybackMeses || 0) / 12),
          tir: sistemas[0]?.tirAnual || 0,
          dados_completos: propostaData,
          html_gerado: htmlGenerated,
          status: 'ativa',
        }, { onConflict: 'slug' })
        .select()
        .single();

      if (propostaError) {
        console.error('❌ Erro ao salvar proposta no Supabase:', propostaError);
        throw new Error(`Erro ao salvar proposta no Supabase: ${propostaError.message}`);
      }

      if (!propostaSalva) {
        throw new Error('Proposta não foi salva no Supabase');
      }

      propostaSalvaNoSupabase = true;
      propostaSupabaseId = propostaSalva.id;
      console.log('✅ Proposta salva no Supabase com sucesso! ID:', propostaSalva.id, 'Slug:', slug);

    } catch (supabaseError) {
      console.error('❌ ERRO CRÍTICO ao salvar no Supabase:', supabaseError);
      // Em produção, não permitir continuar sem salvar no Supabase
      if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
        throw new Error(`Falha ao persistir proposta no banco de dados: ${supabaseError instanceof Error ? supabaseError.message : 'Erro desconhecido'}`);
      } else {
        // Em desenvolvimento, avisar mas permitir continuar
        console.warn('⚠️ AVISO: Proposta NÃO foi salva no Supabase (modo desenvolvimento)');
      }
    }

    // 🔧 CORREÇÃO NETLIFY: Se em produção, retornar também o HTML inline
    const response: any = {
      message: propostaSalvaNoSupabase 
        ? 'Proposta gerada e salva no banco de dados com sucesso!' 
        : 'Proposta gerada com sucesso!',
      arquivo: arquivo,
      caminho: isServerless ? `/tmp/${slug}/${arquivo}` : arquivoPath,
      slug: slug,
      // 🗄️ Status do salvamento no Supabase
      supabase: {
        salva: propostaSalvaNoSupabase,
        propostaId: propostaSupabaseId,
        url: propostaSalvaNoSupabase ? `/proposta/${slug}` : null,
        message: propostaSalvaNoSupabase 
          ? '✅ Proposta persistida no banco de dados e disponível publicamente' 
          : '⚠️ Proposta não foi salva no banco de dados'
      },
      // 🔧 NOVO: Dados secundários incorporados
      metadata: {
        configuracaoUsada: configSistema,
        validacaoPython: validationResults,
        sistemasProcessados: sistemas.length,
        timestamp: new Date().toISOString(),
        versao: '2.0-enhanced'
      },
      // 🔧 NOVO: Informações de validação
      validation: {
        totalOrcamentos: orcamentos.length,
        validadosComPython: validationResults.length,
        warnings: validationResults.flatMap(r => r.validation?.warnings || []),
        errors: validationResults.flatMap(r => r.validation?.errors || [])
      }
    };

    // 🔧 SEMPRE retornar HTML na resposta para renderização no frontend
    try {
      const htmlGenerated = await fs.readFile(arquivoPath, 'utf8');
      response.htmlContent = htmlGenerated;
      response.downloadReady = true;
      response.url = `/proposta/${slug}`; // URL da página Next.js
      response.htmlUrl = `/propostas/orçamento/clientes/${arquivo}`; // URL direta do HTML se existir em public/
    } catch (readError) {
      console.log('⚠️ Aviso: Não foi possível ler HTML gerado:', readError instanceof Error ? readError.message : 'Erro desconhecido');
      response.downloadReady = false;
    }

    res.status(200).json(response);

  } catch (error) {
    console.error('❌ ERRO COMPLETO ao gerar proposta:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'N/A');
    
    res.status(500).json({ 
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined,
      details: {
        clienteRecebido: !!req.body?.cliente,
        sistemasRecebidos: req.body?.sistemas?.length || 0,
        orcamentosRecebidos: req.body?.orcamentos?.length || 0
      }
    });
  }
}