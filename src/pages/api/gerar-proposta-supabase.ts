import { NextApiRequest, NextApiResponse } from 'next';
import { supabase, upsertProposta, createCliente, getAllConfiguracoes } from '@/lib/supabase';

/**
 * API para gerar propostas usando Supabase
 * Substitui o sistema de arquivos pelo banco de dados
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { cliente, orcamentos, config } = req.body;

    console.log('📥 Dados recebidos na API Supabase:', {
      cliente: cliente,
      orcamentosCount: orcamentos?.length || 0,
    });

    // Validar dados
    if (!cliente || !orcamentos || !config) {
      return res.status(400).json({ message: 'Dados incompletos' });
    }

    // Criar slug normalizado
    const normalizeSlug = (text: string) => {
      return text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
    };

    const dataAtual = new Date().toLocaleDateString('pt-BR');
    const slug = `${normalizeSlug(cliente.nome)}-${dataAtual.replace(/\//g, '-')}`;

    // Processar sistemas (mantém lógica original)
    const sistemas = orcamentos.map((orc: any) => {
      const potTotal = orc.potTotal || (orc.modulos * orc.pot_modulo) / 1000;

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
        ppix: orc.ppix || 0,
        pavista: orc.pavista || 0,
        priscado: orc.priscado || 0,
        p12x: orc.p12x || 0,
        p12x_total: orc.p12x_total || 0,
        p18x_parcela: orc.p18x_parcela || 0,
        p18x_total: orc.p18x_total || 0,
        geracaoMensal: orc.geracaoMensal || 0,
        cobertura: orc.cobertura || 0,
        economiaMensal: orc.economiaMensal || 0,
        paybackMeses: orc.paybackMeses || 0,
        tirAnual: orc.tirAnual || 0
      };
    });

    // Ordenar por PIX
    sistemas.sort((a: any, b: any) => a.ppix - b.ppix);

    // Gerar HTML simplificado
    const htmlContent = gerarHTML(cliente, sistemas, dataAtual, slug);

    // ==========================
    // SALVAR NO SUPABASE
    // ==========================

    // 1. Criar/buscar cliente
    const { data: clienteExistente, error: clienteError } = await supabase
      .from('clientes')
      .select('*')
      .eq('nome', cliente.nome)
      .eq('cidade', cliente.cidade)
      .maybeSingle();

    let clienteId: string;

    if (clienteExistente) {
      clienteId = clienteExistente.id;
      console.log('✅ Cliente existente encontrado:', clienteId);
    } else {
      const novoCliente = await createCliente({
        nome: cliente.nome,
        cidade: cliente.cidade,
        estado: cliente.cidade.includes('GO') ? 'GO' : 'SP',
        tipo_imovel: cliente.tipo_imovel || 'residencial',
        consumo_mensal: cliente.consumo_mensal,
        hsp_local: config.hsp || 5.21,
        pdespesa: config.pdespesaFixo || 0,
      });
      clienteId = novoCliente.id;
      console.log('✅ Novo cliente criado:', clienteId);
    }

    // 2. Salvar proposta
    const proposta = await upsertProposta({
      cliente_id: clienteId,
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
      dados_completos: {
        cliente,
        sistemas,
        orcamentos,
        config,
        dataGeracao: dataAtual,
      },
      html_gerado: htmlContent,
      status: 'ativa',
    });

    console.log('✅ Proposta salva no Supabase:', proposta.id);

    // Retornar resposta
    return res.status(200).json({
      success: true,
      slug: slug,
      arquivo: `proposta_${slug}.html`,
      propostaId: proposta.id,
      clienteId: clienteId,
      url: `/proposta/${slug}`,
      htmlContent: htmlContent, // Retornar HTML inline
      sistemas: sistemas.length,
      message: '✅ Proposta gerada e salva no Supabase com sucesso!',
    });

  } catch (error) {
    console.error('❌ Erro ao gerar proposta:', error);

    return res.status(500).json({
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined,
    });
  }
}

// Função auxiliar para gerar HTML
function gerarHTML(cliente: any, sistemas: any[], dataAtual: string, slug: string): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PIENG | Proposta Solar - ${cliente.nome}</title>
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
        .price-new { font-size: 24px; font-weight: bold; color: #3366CC; margin-bottom: 10px; }
        .metrics { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
        .metric { text-align: center; }
        .metric-value { font-size: 18px; font-weight: bold; color: #3366CC; }
        .metric-label { font-size: 12px; color: #666; }
        .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⚡ PIENG Soluções Energéticas</h1>
            <p>Proposta Solar Personalizada - Gerado com Supabase</p>
        </div>

        <div class="client-info">
            <strong>Cliente:</strong> ${cliente.nome} |
            <strong>Cidade:</strong> ${cliente.cidade} |
            <strong>Consumo:</strong> ${cliente.consumo_mensal} kWh/mês
        </div>

        <div class="systems-grid">
            ${sistemas.map((sistema: any, index: number) => `
                <div class="system-card">
                    <h3>OPÇÃO ${index + 1} ${index === 0 ? '⭐ RECOMENDADO' : ''}</h3>
                    <div class="price-section">
                        <div class="price-new">PIX: R$ ${sistema.ppix.toFixed(2)}</div>
                        <p><strong>12x:</strong> R$ ${sistema.p12x.toFixed(2)}/mês</p>
                        <p><strong>18x:</strong> R$ ${sistema.p18x_parcela.toFixed(2)}/mês</p>
                    </div>
                    <div class="metrics">
                        <div class="metric">
                            <div class="metric-value">${sistema.potTotal.toFixed(2)} kWp</div>
                            <div class="metric-label">Potência</div>
                        </div>
                        <div class="metric">
                            <div class="metric-value">${sistema.geracaoMensal.toFixed(0)} kWh</div>
                            <div class="metric-label">Geração/Mês</div>
                        </div>
                        <div class="metric">
                            <div class="metric-value">${sistema.paybackMeses.toFixed(1)} meses</div>
                            <div class="metric-label">Payback</div>
                        </div>
                        <div class="metric">
                            <div class="metric-value">${sistema.tirAnual.toFixed(1)}%</div>
                            <div class="metric-label">TIR Anual</div>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>

        <div class="footer">
            <p>PIENG Soluções Energéticas - ${dataAtual}</p>
            <p>Proposta ID: ${slug}</p>
            <p>Gerado com Supabase - Sistema v2.2.0</p>
        </div>
    </div>
</body>
</html>`;
}
