import { NextApiRequest, NextApiResponse } from 'next';
import { generateTemplateHtmlResultados } from '@/lib/templateEngine';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { clienteId, orcamentos, config, clientType, subType } = req.body;

    if (!clienteId || !orcamentos || !config) {
      return res.status(400).json({ error: 'Dados obrigatórios não fornecidos' });
    }
    
    // Log do template selecionado
    if (clientType) {
      console.log(`🎨 Template selecionado: ${clientType}${subType ? ` - ${subType}` : ''}`);
    }

    // Filtrar apenas orçamentos aprovados
    const orcamentosAprovados = orcamentos.filter((orc: any) => orc.status === 'aprovado');
    
    if (orcamentosAprovados.length === 0) {
      return res.status(400).json({ error: 'Nenhum orçamento aprovado encontrado' });
    }

    // Calcular melhor sistema baseado em payback
    const melhorOrcamento = orcamentosAprovados.reduce((melhor: any, atual: any) => {
      const potenciaAtual = (atual.modulos * atual.pot_modulo) / 1000;
      const pdespesaTotal = config.pdespesaVariavel === 0 
        ? config.pdespesaFixo 
        : config.pdespesaFixo === 0 
          ? (atual.pcusto * config.pdespesaVariavel / 100)
          : config.pdespesaFixo + (atual.pcusto * config.pdespesaVariavel / 100);
      
      const totalAtual = atual.pcusto + pdespesaTotal;
      const ppixAtual = totalAtual * (1 - config.descontoPix);
      const geracaoAtual = potenciaAtual * config.hsp * 30.4 * config.performanceRate;
      const economiaAtual = geracaoAtual * config.tarifa;
      const paybackAtual = economiaAtual > 0 ? ppixAtual / economiaAtual : Infinity;

      if (!melhor || paybackAtual < melhor.payback) {
        return {
          ...atual,
          payback: paybackAtual,
          potencia: potenciaAtual,
          total: totalAtual,
          ppix: ppixAtual,
          geracao: geracaoAtual,
          economia: economiaAtual
        };
      }
      return melhor;
    }, null);

    // Preparar dados usando MESMA ESTRUTURA do Gerador Rápido
    const clienteData = {
      cliente: {
        nome: `Cliente ${clienteId}`,
        cidade: 'São Paulo',
        consumoMensal: config.consumoMensal || 600,
        tipo: 'residencial',
        hsp: config.hsp
      },
      sistemas: orcamentosAprovados.map((orc: any, index: number) => {
        const potenciaTotal = (orc.modulos * orc.pot_modulo) / 1000;
        const pdespesaTotal = config.pdespesaVariavel === 0
          ? config.pdespesaFixo
          : config.pdespesaFixo === 0
            ? (orc.pcusto * config.pdespesaVariavel / 100)
            : config.pdespesaFixo + (orc.pcusto * config.pdespesaVariavel / 100);

        const valorTotal = orc.pcusto + pdespesaTotal;
        const ppix = valorTotal; // PIX = Total sem desconto adicional
        const pavista = ppix; // À vista = PIX (sem diferença)
        const priscado = ppix * config.fatorParcelado;
        const p12x_total = ppix / config.fator12x;
        const p12x = p12x_total / 12;
        const p18x_total = ppix / config.fator18x;
        const p18x_parcela = p18x_total / 18;

        const geracaoMensal = potenciaTotal * config.hsp * 30.4 * config.performanceRate;
        const economiaMensal = geracaoMensal * config.tarifa;
        const cobertura = (geracaoMensal / (config.consumoMensal || 600)) * 100;
        const paybackMeses = economiaMensal > 0 ? ppix / economiaMensal : Infinity;
        const tirAnual = paybackMeses > 0 && paybackMeses !== Infinity ? (12 / paybackMeses) * 100 : 0;

        return {
          nome: `Opção ${index + 1}`,
          potTotal: potenciaTotal,
          modulos: orc.modulos,
          pot_modulo: orc.pot_modulo,
          marca_modulo: orc.marca_modulo || 'N/A',
          inversores: orc.inversores,
          pot_inv: orc.pot_inv,
          marca_inversor: orc.marca_inversor || 'N/A',

          // Preços (mesma estrutura do Gerador Rápido)
          ppix,
          pavista,
          priscado,
          p12x,
          p12x_total,
          p18x_parcela,
          p18x_total,

          // Performance
          geracaoMensal,
          cobertura,
          economiaMensal,
          paybackMeses,
          tirAnual
        };
      }),
      analise: (() => {
        const sistemasProcessados = orcamentosAprovados.map((orc: any, index: number) => {
          const potenciaTotal = (orc.modulos * orc.pot_modulo) / 1000;
          const pdespesaTotal = config.pdespesaVariavel === 0
            ? config.pdespesaFixo
            : config.pdespesaFixo === 0
              ? (orc.pcusto * config.pdespesaVariavel / 100)
              : config.pdespesaFixo + (orc.pcusto * config.pdespesaVariavel / 100);
          const valorTotal = orc.pcusto + pdespesaTotal;
          const ppix = valorTotal;
          const geracaoMensal = potenciaTotal * config.hsp * 30.4 * config.performanceRate;
          const economiaMensal = geracaoMensal * config.tarifa;
          const cobertura = (geracaoMensal / (config.consumoMensal || 600)) * 100;
          const paybackMeses = economiaMensal > 0 ? ppix / economiaMensal : Infinity;
          const tirAnual = paybackMeses > 0 && paybackMeses !== Infinity ? (12 / paybackMeses) * 100 : 0;
          return { potenciaTotal, ppix, geracaoMensal, cobertura, paybackMeses, tirAnual, nome: `Opção ${index + 1}` };
        });

        const paybacks = sistemasProcessados.map(s => s.paybackMeses).filter(p => p !== Infinity);
        const geracoes = sistemasProcessados.map(s => s.geracaoMensal);
        const coberturas = sistemasProcessados.map(s => s.cobertura);
        const tirs = sistemasProcessados.map(s => s.tirAnual);
        const melhorSistema = sistemasProcessados.reduce((best, current) =>
          current.paybackMeses < best.paybackMeses ? current : best
        );

        return {
          paybackMin: paybacks.length > 0 ? Math.min(...paybacks).toFixed(1) : '0',
          paybackMax: paybacks.length > 0 ? Math.max(...paybacks).toFixed(1) : '0',
          melhorSistemaNome: melhorSistema.nome,
          melhorSistemaPotencia: `${melhorSistema.potenciaTotal.toFixed(2)} kWp`,
          melhorSistemaPix: `R$ ${melhorSistema.ppix.toFixed(2)}`,
          melhorSistemaPayback: `${melhorSistema.paybackMeses.toFixed(1)} meses`,
          geracaoMax: Math.max(...geracoes).toFixed(0),
          coberturaMax: `${Math.max(...coberturas).toFixed(0)}%`,
          tirMax: `${Math.max(...tirs).toFixed(1)}%`,
          economiaTarifa: `R$ ${(config.tarifa || 0.982).toFixed(3)}`
        };
      })(),
      empresa: {
        contato: '(62) 99167-0536',
        email: 'contato@piengsolucoes.com.br',
        site: 'www.piengsolucoes.com.br'
      },
      bannerUrgencia: '🚀 Oferta especial válida até o final do mês!',
      dataGeracao: new Date().toLocaleDateString('pt-BR'),
      dataValidade: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR')
    };

    // Gerar HTML usando o template engine (mesmo do Gerador Rápido)
    // Passa clientType e subType para aplicar a variante selecionada
    const htmlContent = await generateTemplateHtmlResultados(clienteData, clientType, subType);

    // Salvar arquivo HTML
    const fs = await import('fs');
    const path = await import('path');
    
    const fileName = `proposta-consultor-${clienteId}-${Date.now()}.html`;
    const filePath = path.join(process.cwd(), 'public', 'propostas', fileName);
    
    // Criar diretório se não existir
    const dirPath = path.dirname(filePath);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    
    fs.writeFileSync(filePath, htmlContent, 'utf8');

    // Retornar URL da proposta gerada
    const propostaUrl = `/propostas/${fileName}`;
    
    res.status(200).json({
      success: true,
      propostaUrl,
      fileName,
      orcamentosProcessados: orcamentosAprovados.length,
      melhorPayback: melhorOrcamento?.payback || 0,
      melhorTir: melhorOrcamento ? (12 / melhorOrcamento.payback) * 100 : 0,
      melhorPrecoPix: melhorOrcamento?.ppix || 0,
      melhorPotencia: melhorOrcamento?.potencia || 0,
      melhorGeracao: melhorOrcamento?.geracao || 0
    });

  } catch (error) {
    console.error('Erro ao gerar proposta:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}