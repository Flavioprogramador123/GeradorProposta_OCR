import { NextApiRequest, NextApiResponse } from 'next';
import { promises as fs } from 'fs';
import path from 'path';
import { generateTemplateHtmlResultados } from '@/lib/templateEngine';
import type { ClientType, ComercialSubType } from '@/lib/variantConfig';

interface OrcamentoConsultor {
  id: string;
  nome?: string;
  fornecedor?: string;
  pcusto: number;
  modulos: number;
  pot_modulo: number;
  marca_modulo?: string;
  inversores: number;
  pot_inv: number;
  marca_inversor?: string;
  status: string;
}

interface ConsultorConfig {
  hsp: number;
  tarifa: number;
  performanceRate: number;
  consumoMensal: number;
  pdespesaFixo: number;
  pdespesaVariavel: number;
  descontoPix: number;
  fatorParcelado: number;
  fator12x: number;
  fator18x: number;
}

function calcularPdespesaTotal(orc: OrcamentoConsultor, config: ConsultorConfig): number {
  if (config.pdespesaVariavel === 0) return config.pdespesaFixo;
  if (config.pdespesaFixo === 0) return orc.pcusto * (config.pdespesaVariavel / 100);
  return config.pdespesaFixo + orc.pcusto * (config.pdespesaVariavel / 100);
}

function processarSistemas(orcamentos: OrcamentoConsultor[], config: ConsultorConfig) {
  const consumo = config.consumoMensal || 600;
  const fator12x = config.fator12x || 0.88;
  const fator18x = config.fator18x || 0.83;
  const descontoPix = config.descontoPix ?? 0.1;
  const fatorParcelado = config.fatorParcelado || 1.2;

  const sistemas = orcamentos.map((orc, index) => {
    const potTotal = (orc.modulos * orc.pot_modulo) / 1000;
    const pdespesaTotal = calcularPdespesaTotal(orc, config);
    const pavista = orc.pcusto + pdespesaTotal;
    const ppix = pavista * (1 - descontoPix);
    const priscado = pavista * fatorParcelado;
    const p12x_total = ppix / fator12x;
    const p12x = p12x_total / 12;
    const p18x_total = ppix / fator18x;
    const p18x_parcela = p18x_total / 18;

    const geracaoMensal = potTotal * config.hsp * 30.4 * config.performanceRate;
    const cobertura = consumo > 0 ? (geracaoMensal / consumo) * 100 : 0;
    const economiaMensal = geracaoMensal * config.tarifa;
    const paybackMeses = economiaMensal > 0 ? ppix / economiaMensal : Infinity;
    const tirAnual =
      paybackMeses > 0 && paybackMeses !== Infinity ? (12 / paybackMeses) * 100 : 0;

    return {
      nome: orc.nome || `Sistema ${String(index + 1).padStart(2, '0')}`,
      potTotal,
      modulos: orc.modulos,
      pot_modulo: orc.pot_modulo,
      marca_modulo: orc.marca_modulo || 'monocristalino',
      inversores: orc.inversores,
      pot_inv: orc.pot_inv,
      marca_inversor: orc.marca_inversor || 'string',
      tipo_instalacao: 'Telhado Fibrocimento',
      ppix,
      pavista,
      priscado,
      p12x,
      p12x_total,
      p18x_parcela,
      p18x_total,
      geracaoMensal,
      cobertura: Math.round(cobertura),
      economiaMensal,
      paybackMeses,
      tirAnual,
      isRecommended: false,
    };
  });

  if (sistemas.length > 0) {
    let melhorIdx = 0;
    let melhorPayback = sistemas[0].paybackMeses;
    sistemas.forEach((s, idx) => {
      if (s.paybackMeses < melhorPayback) {
        melhorPayback = s.paybackMeses;
        melhorIdx = idx;
      }
    });
    sistemas[melhorIdx].isRecommended = true;
  }

  return sistemas;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const {
      clienteId: clienteIdBody,
      clientId,
      orcamentos,
      config,
      clientType,
      subType,
      cliente: clienteInfo,
    } = req.body;

    const clienteId = clienteIdBody || clientId;

    if (!clienteId || !orcamentos || !config) {
      return res.status(400).json({ error: 'Dados obrigatórios não fornecidos (clienteId, orcamentos, config)' });
    }

    const cfg: ConsultorConfig = {
      hsp: 5.21,
      tarifa: 1.1,
      performanceRate: 0.75,
      consumoMensal: 600,
      pdespesaFixo: 0,
      pdespesaVariavel: 0,
      descontoPix: 0.1,
      fatorParcelado: 1.2,
      fator12x: 0.88,
      fator18x: 0.83,
      ...(config as ConsultorConfig),
    };

    if (clientType) {
      console.log(`🎨 Template: ${clientType}${subType ? ` - ${subType}` : ''}`);
    }

    const orcamentosAprovados = (orcamentos as OrcamentoConsultor[]).filter(
      (orc) => orc.status === 'aprovado'
    );

    if (orcamentosAprovados.length === 0) {
      return res.status(400).json({ error: 'Nenhum orçamento aprovado encontrado' });
    }

    const sistemas = processarSistemas(orcamentosAprovados, cfg);
    const melhor = sistemas.find((s) => s.isRecommended) || sistemas[0];

    const paybacks = sistemas.map((s) => s.paybackMeses).filter((p) => p !== Infinity && p > 0);
    const geracoes = sistemas.map((s) => s.geracaoMensal);
    const coberturas = sistemas.map((s) => s.cobertura);
    const tirs = sistemas.map((s) => s.tirAnual);

    const templateData = {
      cliente: {
        nome: clienteInfo?.nome || `Cliente ${clienteId}`,
        cidade: clienteInfo?.cidade || 'São Paulo',
        consumoMensal: cfg.consumoMensal || 600,
        tipo: (clientType as string) || clienteInfo?.tipo || 'residencial',
        hsp: cfg.hsp || 5.21,
        tipoInstalacao: clienteInfo?.tipoInstalacao || 'Telhado Fibrocimento',
      },
      sistemas,
      analise: {
        paybackMin: paybacks.length > 0 ? Math.min(...paybacks).toFixed(1) : '0',
        paybackMax: paybacks.length > 0 ? Math.max(...paybacks).toFixed(1) : '0',
        melhorSistemaNome: melhor.nome,
        melhorSistemaPotencia: `${melhor.potTotal.toFixed(2)} kWp`,
        melhorSistemaPix: `R$ ${melhor.ppix.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        melhorSistemaPayback:
          melhor.paybackMeses !== Infinity
            ? `${melhor.paybackMeses.toFixed(1)} meses`
            : 'N/A',
        geracaoMax: Math.max(...geracoes).toFixed(0),
        coberturaMax: `${Math.max(...coberturas).toFixed(0)}%`,
        tirMax: `${Math.max(...tirs).toFixed(1)}%`,
        economiaTarifa: `R$ ${(cfg.tarifa || 0.982).toFixed(3)}`,
      },
      empresa: {
        contato: '(62) 99167-0536',
        email: 'contato@piengsolucoes.com.br',
        site: 'www.piengsolucoes.com.br',
        whatsapp: '5562991670536',
      },
      bannerUrgencia:
        'Oferta especial por tempo limitado! Orçamento válido por 2 dias ou até acabar o estoque.',
      dataGeracao: new Date().toLocaleDateString('pt-BR'),
      dataValidade: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR'),
    };

    const htmlContent = await generateTemplateHtmlResultados(
      templateData,
      clientType as ClientType | undefined,
      subType as ComercialSubType | undefined
    );

    let propostaUrl: string | null = null;
    const fileName = `proposta-consultor-${clienteId}-${Date.now()}.html`;

    const isServerless = Boolean(process.env.VERCEL || process.env.NETLIFY);

    if (!isServerless) {
      try {
        const filePath = path.join(process.cwd(), 'public', 'propostas', fileName);
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, htmlContent, 'utf8');
        propostaUrl = `/propostas/${fileName}`;
      } catch (writeError) {
        console.warn('⚠️ Não foi possível salvar HTML em disco:', writeError);
      }
    }

    const melhorPayback =
      melhor.paybackMeses !== Infinity ? melhor.paybackMeses : 0;
    const melhorTir =
      melhor.paybackMeses > 0 && melhor.paybackMeses !== Infinity
        ? (12 / melhor.paybackMeses) * 100
        : 0;

    return res.status(200).json({
      success: true,
      html: htmlContent,
      propostaUrl,
      fileName,
      orcamentosProcessados: orcamentosAprovados.length,
      melhorPayback,
      melhorTir,
      melhorPrecoPix: melhor.ppix,
      melhorPotencia: melhor.potTotal,
      melhorGeracao: melhor.geracaoMensal,
    });
  } catch (error) {
    console.error('Erro ao gerar proposta consultor:', error);
    return res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  }
}
