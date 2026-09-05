/**
 * Processamento de orçamentos e montagem de PropostaData — mesma lógica do Gerador Rápido (/api/gerar-proposta).
 * Único engine usado pelo Consultor e pelo Gerador Rápido.
 */

import {
  calcularPerformanceCompleta,
  getBonusMicroAtivo,
} from '@/lib/calcularPerformance';
import { calcularPrecosDePix, tagEconomiaPix } from '@/lib/tabelaJurosCartao';
import { formatBRL } from '@/lib/formatBRL';

export interface PropostaConfigInput {
  hsp?: number;
  tarifa?: number;
  performanceRate?: number;
  consumoMensal?: number;
  pdespesaFixo?: number;
  pdespesaVariavel?: number;
  descontoPix?: number;
  fatorParcelado?: number;
  fator12x?: number;
  fator18x?: number;
  taxaCartaoMensal?: number;
  bonusMicroPercent?: number;
  metodo?: 'fixo' | 'variavel' | string;
}

export interface OrcamentoInput {
  nome?: string;
  distribuidora?: string;
  fornecedor?: string;
  pcusto?: number;
  modulos?: number;
  pot_modulo?: number;
  marca_modulo?: string;
  inversores?: number;
  pot_inv?: number;
  marca_inversor?: string;
  tipo_instalacao?: string;
  pdespesa_total?: number;
  pdespesa?: number;
  total_final?: number;
  ppix?: number;
  pavista?: number;
  priscado?: number;
  p12x?: number;
  p12x_total?: number;
  p18x_parcela?: number;
  p18x_total?: number;
  potTotal?: number;
  geracaoMensal?: number;
  cobertura?: number;
  economiaMensal?: number;
  paybackMeses?: number;
  tirAnual?: number;
  bonusMicroAtivo?: boolean;
  bonusMicroManual?: boolean;
  status?: string;
}

export interface SistemaProcessado {
  nome: string;
  potTotal: number;
  modulos: number;
  pot_modulo: number;
  marca_modulo: string;
  inversores: number;
  pot_inv: number;
  marca_inversor: string;
  tipo_instalacao: string;
  ppix: number;
  pavista: number;
  priscado: number;
  p12x: number;
  p12x_total: number;
  p18x_parcela: number;
  p18x_total: number;
  geracaoMensal: number;
  cobertura: number;
  economiaMensal: number;
  paybackMeses: number;
  tirAnual: number;
  isRecommended?: boolean;
}

export interface ClientePropostaInput {
  nome: string;
  cidade: string;
  consumo_mensal?: number;
  consumoMensal?: number;
  tipo_imovel?: string;
  tipo?: string;
  hsp?: number;
  tarifa?: number;
  tipoInstalacao?: string;
  tipo_instalacao?: string;
  instalacao?: string;
}

const CONFIG_PADRAO = {
  hsp: 5.21,
  tarifa: 1.1,
  performanceRate: 0.75,
  consumoMensal: 600,
  pdespesaFixo: 3000,
  pdespesaVariavel: 22,
  descontoPix: 0.1,
  fatorParcelado: 1.2,
  fator12x: 0.88,
  fator18x: 0.83,
  taxaCartaoMensal: 1.51,
  bonusMicroPercent: 5,
};

export function normalizeDescontoPix(raw: unknown, fallback = 0.1): number {
  const n = typeof raw === 'number' ? raw : parseFloat(String(raw ?? ''));
  if (!Number.isFinite(n) || n < 0) return fallback;
  return n > 1 ? n / 100 : n;
}

function toMoneyNumber(val: unknown): number {
  if (typeof val === 'number') return Number.isFinite(val) ? val : 0;
  if (val == null) return 0;
  let str = String(val).trim().replace(/[^\d,.-]/g, '');
  if (!str) return 0;
  if (str.includes(',') && str.includes('.')) {
    str = str.replace(/\./g, '').replace(',', '.');
  } else if (str.includes(',')) {
    const parts = str.split(',');
    str = parts[1] && parts[1].length <= 2 ? str.replace(',', '.') : str.replace(',', '');
  }
  const n = parseFloat(str);
  return Number.isFinite(n) ? n : 0;
}

/** Recupera o desconto PIX real do card: (à vista − PIX) / PIX (= mult12 − 1). */
export function inferDescontoPixFromSistemas(
  sistemas: Array<{ ppix?: number; pavista?: number; precoPixDecimal?: number; priscado?: number }> | undefined
): number | undefined {
  if (!Array.isArray(sistemas)) return undefined;
  for (const sistema of sistemas) {
    const pix = toMoneyNumber(sistema.ppix ?? sistema.precoPixDecimal);
    const vista = toMoneyNumber(sistema.pavista);
    if (pix > 0 && vista > pix) {
      const desconto = (vista - pix) / pix;
      if (desconto > 0 && desconto < 0.8) {
        return Math.round(desconto * 1000) / 1000;
      }
    }
  }
  return undefined;
}

export function normalizePropostaConfig(config: PropostaConfigInput = {}) {
  const descontoPixRaw = config.descontoPix ?? CONFIG_PADRAO.descontoPix;
  const descontoPix = descontoPixRaw > 1 ? descontoPixRaw / 100 : descontoPixRaw;

  return {
    hsp: config.hsp ?? CONFIG_PADRAO.hsp,
    tarifa: config.tarifa ?? CONFIG_PADRAO.tarifa,
    performanceRate: config.performanceRate ?? CONFIG_PADRAO.performanceRate,
    consumoMensal: config.consumoMensal ?? CONFIG_PADRAO.consumoMensal,
    pdespesaFixo: config.pdespesaFixo ?? CONFIG_PADRAO.pdespesaFixo,
    pdespesaVariavel: config.pdespesaVariavel ?? CONFIG_PADRAO.pdespesaVariavel,
    descontoPix,
    fatorParcelado: config.fatorParcelado ?? CONFIG_PADRAO.fatorParcelado,
    fator12x: config.fator12x ?? CONFIG_PADRAO.fator12x,
    fator18x: config.fator18x ?? CONFIG_PADRAO.fator18x,
    taxaCartaoMensal: config.taxaCartaoMensal ?? CONFIG_PADRAO.taxaCartaoMensal,
    bonusMicroPercent: config.bonusMicroPercent ?? CONFIG_PADRAO.bonusMicroPercent,
    metodo: config.metodo,
  };
}

/** PIX = base; à vista = total 12× cartão; 12×/18× pela taxa mensal configurada. */
export function calcularPrecosProposta(totalFinal: number, config: ReturnType<typeof normalizePropostaConfig>) {
  return calcularPrecosDePix(totalFinal, config.fatorParcelado, config.taxaCartaoMensal);
}

export function calcularPdespesaProposta(pcusto: number, config: ReturnType<typeof normalizePropostaConfig>) {
  if (config.pdespesaVariavel === 0) return config.pdespesaFixo;
  if (config.pdespesaFixo === 0) return pcusto * (config.pdespesaVariavel / 100);
  return config.pdespesaFixo + pcusto * (config.pdespesaVariavel / 100);
}

export function calcularPerformanceProposta(
  potenciaKw: number,
  config: ReturnType<typeof normalizePropostaConfig>,
  investimentoPix: number,
  bonusMicroAtivo = false
) {
  const perf = calcularPerformanceCompleta(
    potenciaKw,
    config.hsp,
    config.performanceRate,
    config.consumoMensal,
    config.tarifa,
    investimentoPix,
    bonusMicroAtivo,
    config.bonusMicroPercent
  );

  return {
    ...perf,
    cobertura: Math.round(perf.cobertura),
  };
}

/** Processa orçamentos com a mesma regra do /api/gerar-proposta */
export function processarOrcamentosParaSistemas(
  orcamentos: OrcamentoInput[],
  configInput: PropostaConfigInput = {}
): SistemaProcessado[] {
  const config = normalizePropostaConfig(configInput);

  const sistemas = orcamentos.map((orc, index) => {
    if (
      orc.ppix !== undefined &&
      orc.pavista !== undefined &&
      orc.geracaoMensal !== undefined &&
      orc.paybackMeses !== undefined
    ) {
      const potTotal =
        orc.potTotal !== undefined ? orc.potTotal : ((orc.modulos || 0) * (orc.pot_modulo || 580)) / 1000;
      const precos = calcularPrecosProposta(orc.ppix, config);

      return {
        nome: orc.nome || `Sistema ${index + 1}`,
        potTotal,
        modulos: orc.modulos ?? Math.round(potTotal * 1000 / 580),
        pot_modulo: orc.pot_modulo ?? 580,
        marca_modulo: orc.marca_modulo ?? 'N/A',
        inversores: orc.inversores ?? 1,
        pot_inv: orc.pot_inv ?? Math.ceil(potTotal),
        marca_inversor: orc.marca_inversor ?? 'N/A',
        tipo_instalacao: orc.tipo_instalacao || 'Telhado Fibrocimento',
        ppix: orc.ppix,
        pavista: orc.pavista ?? precos.pavista,
        priscado: orc.priscado ?? precos.priscado,
        p12x: orc.p12x ?? precos.p12x,
        p12x_total: orc.p12x_total ?? precos.p12x_total,
        p18x_parcela: orc.p18x_parcela ?? precos.p18x_parcela,
        p18x_total: orc.p18x_total ?? precos.p18x_total,
        geracaoMensal: orc.geracaoMensal,
        cobertura:
          orc.cobertura !== undefined
            ? Math.round(Number(orc.cobertura))
            : calcularPerformanceProposta(
                potTotal,
                config,
                orc.ppix,
                getBonusMicroAtivo(orc)
              ).cobertura,
        economiaMensal: orc.economiaMensal ?? orc.geracaoMensal * config.tarifa,
        paybackMeses: orc.paybackMeses,
        tirAnual:
          orc.tirAnual ??
          (orc.paybackMeses > 0 && orc.paybackMeses !== Infinity
            ? (12 / orc.paybackMeses) * 100
            : 0),
      };
    }

    const potTotal = ((orc.modulos || 0) * (orc.pot_modulo || 580)) / 1000;
    const pdespesa =
      orc.pdespesa_total ??
      orc.pdespesa ??
      calcularPdespesaProposta(orc.pcusto || 0, config);
    const totalFinal = orc.total_final ?? (orc.pcusto || 0) + pdespesa;
    const precos = calcularPrecosProposta(totalFinal, config);
    const performance = calcularPerformanceProposta(
      potTotal,
      config,
      precos.ppix,
      getBonusMicroAtivo(orc)
    );

    return {
      nome: orc.nome || `Sistema ${index + 1}`,
      potTotal,
      modulos: orc.modulos ?? Math.round(potTotal * 1000 / 580),
      pot_modulo: orc.pot_modulo ?? 580,
      marca_modulo: orc.marca_modulo ?? 'N/A',
      inversores: orc.inversores ?? 1,
      pot_inv: orc.pot_inv ?? Math.ceil(potTotal),
      marca_inversor: orc.marca_inversor ?? 'N/A',
      tipo_instalacao: orc.tipo_instalacao || 'Telhado Fibrocimento',
      ...precos,
      ...performance,
    };
  });

  if (sistemas.length > 0) {
    let melhorIdx = 0;
    let melhorPayback = sistemas[0].paybackMeses;
    sistemas.forEach((s, idx) => {
      if (s.paybackMeses < melhorPayback && s.paybackMeses > 0 && s.paybackMeses !== Infinity) {
        melhorPayback = s.paybackMeses;
        melhorIdx = idx;
      }
    });
    sistemas.forEach((s, idx) => {
      s.isRecommended = idx === melhorIdx;
    });
  }

  return sistemas;
}

/** Monta PropostaData no formato esperado pelo templateEngine (Gerador Rápido) */
export function buildPropostaTemplateData(
  sistemas: SistemaProcessado[],
  cliente: ClientePropostaInput,
  configInput: PropostaConfigInput = {}
) {
  const config = normalizePropostaConfig(configInput);
  const consumo = cliente.consumo_mensal ?? cliente.consumoMensal ?? config.consumoMensal;
  const tarifa = cliente.tarifa ?? config.tarifa;
  const hsp = cliente.hsp ?? config.hsp;
  const dataAtual = new Date().toLocaleDateString('pt-BR');

  const melhor =
    sistemas.find((s) => s.isRecommended) ||
    sistemas.reduce((best, cur) =>
      cur.paybackMeses < best.paybackMeses ? cur : best
    , sistemas[0]);

  const sistemasTemplate = sistemas.map((sistema, index) => ({
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
    tipo_instalacao: sistema.tipo_instalacao,
    ppix: sistema.ppix,
    pavista: sistema.pavista,
    priscado: sistema.priscado,
    p12x: sistema.p12x,
    p12x_total: sistema.p12x_total,
    p18x_parcela: sistema.p18x_parcela,
    p18x_total: sistema.p18x_total,
    precoRiscado: formatBRL(sistema.priscado),
    precoAtual: formatBRL(sistema.pavista),
    tagDesconto: tagEconomiaPix(sistema.ppix, sistema.pavista),
    precoPixDecimal: sistema.ppix,
    preco12x: formatBRL(sistema.p12x),
    preco18x: formatBRL(sistema.p18x_parcela),
    geracaoMensal: sistema.geracaoMensal,
    cobertura: sistema.cobertura,
    economiaMensal: sistema.economiaMensal,
    paybackMeses: sistema.paybackMeses,
    tirAnual: sistema.tirAnual,
    geracao: `${(sistema.geracaoMensal || 0).toFixed(0)} kWh`,
    economia: `R$ ${(sistema.economiaMensal || 0).toFixed(2)}`,
    payback: `${(sistema.paybackMeses || 0).toFixed(1)} meses`,
    tir: `${(sistema.tirAnual || 0).toFixed(1)}%`,
    especificacoes: [
      `${sistema.modulos} módulos ${sistema.marca_modulo} ${sistema.pot_modulo}W`,
      `${sistema.inversores} inversor${sistema.inversores > 1 ? 'es' : ''} ${sistema.marca_inversor} ${sistema.pot_inv}kW`,
      'Estrutura de alumínio para telhado',
      'Cabeamento CC/CA completo',
      'String box DC/AC + proteções',
    ],
    isRecommended: sistema.isRecommended ?? index === 0,
    badge: sistema.isRecommended ? '⭐ MELHOR PAYBACK' : '',
  }));

  return {
    cliente: {
      nome: cliente.nome,
      cidade: cliente.cidade,
      consumoMensal: consumo,
      consumoKwh: String(consumo),
      tipo: cliente.tipo_imovel || cliente.tipo || 'residencial',
      hspLocal: String(hsp),
      tipoInstalacao: (
        cliente.tipoInstalacao ||
        cliente.tipo_instalacao ||
        cliente.instalacao ||
        'Telhado Fibrocimento'
      ).toString(),
      hsp,
    },
    sistemas: sistemasTemplate,
    analise: {
      paybackMin: sistemas.length > 0 ? Math.min(...sistemas.map((s) => s.paybackMeses)).toFixed(1) : '0',
      paybackMax: sistemas.length > 0 ? Math.max(...sistemas.map((s) => s.paybackMeses)).toFixed(1) : '0',
      melhorSistemaNome: melhor?.nome || 'Sistema Econômico',
      melhorSistemaPotencia: melhor ? `${melhor.potTotal.toFixed(2)} kWp` : '0 kWp',
      melhorSistemaPix: melhor ? `R$ ${melhor.ppix.toFixed(2)}` : 'R$ 0,00',
      melhorSistemaPayback: melhor ? `${melhor.paybackMeses.toFixed(1)} meses` : '0 meses',
      geracaoMax: sistemas.length > 0 ? Math.max(...sistemas.map((s) => s.geracaoMensal)).toFixed(0) : '0',
      coberturaMax:
        sistemas.length > 0 ? `${Math.max(...sistemas.map((s) => s.cobertura)).toFixed(0)}%` : '0%',
      tirMax:
        sistemas.length > 0 ? `${Math.max(...sistemas.map((s) => s.tirAnual)).toFixed(1)}%` : '0%',
      economiaTarifa: `R$ ${tarifa.toFixed(3)}`,
    },
    empresa: {
      contato: '(62) 99167-0536',
      email: 'contato@piengsolucoes.com.br',
      site: 'www.piengsolucoes.com.br',
      whatsapp: '5562991670536',
    },
    bannerUrgencia:
      'Oferta especial por tempo limitado! Orçamento válido por 2 dias ou até acabar o estoque.',
    dataGeracao: dataAtual,
    dataValidade: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR'),
  };
}
