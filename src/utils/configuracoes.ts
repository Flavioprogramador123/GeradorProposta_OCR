import {
  TAXA_CARTAO_MENSAL_REF,
  calcularPrecosDePix,
} from '@/lib/tabelaJurosCartao';

interface ConfiguracaoSistema {
  // Parâmetros Técnicos
  performanceRate: number;
  hspPadrao: number;
  margemSeguranca: number;
  eficienciaInversor: number;
  bonusMicroPercent: number;
  diasMes: number;
  placasPorMicro: number;
  /** Estoque mínimo para módulos (preço válido se estoque > este valor) */
  estoqueMinimoSoolar: number;
  /** Estoque mínimo para demais categorias (inversor, cabo, etc.) */
  estoqueMinimoOutros: number;

  // Parâmetros Financeiros
  taxaSelic: number;
  inflacaoAnual: number;
  reajusteEnergia: number;
  tarifaPadrao: number;

  // Markups Comerciais
  markupEconomico: number;
  markupStandard: number;
  markupPremium: number;

  // Parcelamento (legado + taxas cartão)
  jurosParcela12x: number;
  jurosParcela18x: number;
  descontoPix: number;
  /** Taxa mensal da maquininha (% a.m.) — calibração 1,51%; altera regenera 2×–18× */
  taxaCartaoMensal: number;
  taxaCartao12x: number;
  taxaCartao18x: number;
  fatorAvista: number;
  fatorParcelado: number;
  fator12x: number;
  fator18x: number;

  // Despesa PIENG (Gerador / V3)
  pdespesaFixo: number;
  pdespesaVariavel: number;
  fretePadrao: number;

  // Textos de Marketing (Variáveis)
  textoEconomiaAnual: string;
  textoPayback: string;
  textoTIR: string;
  textoValorizacaoImovel: string;
  textoSustentabilidade: string;

  // Configurações Regionais
  estadosPadrao: string[];
  hspPorEstado: { [key: string]: number };
}

const ESTADOS_PADRAO = ['GO', 'DF', 'MG', 'MT', 'MS', 'BA', 'TO'];
const HSP_POR_ESTADO_PADRAO: { [key: string]: number } = {
  GO: 5.21,
  DF: 5.08,
  MG: 4.95,
  MT: 5.43,
  MS: 5.12,
  BA: 5.67,
  TO: 5.34,
};

const CONFIG_PADRAO: ConfiguracaoSistema = {
  performanceRate: 0.75,
  hspPadrao: 5.21,
  margemSeguranca: 1.1,
  eficienciaInversor: 0.95,
  bonusMicroPercent: 5,
  diasMes: 30.4,
  placasPorMicro: 4,
  estoqueMinimoSoolar: 20,
  estoqueMinimoOutros: 5,

  taxaSelic: 11.25,
  inflacaoAnual: 4.5,
  reajusteEnergia: 8.2,
  tarifaPadrao: 1.17,

  markupEconomico: 1.8,
  markupStandard: 2.0,
  markupPremium: 2.3,

  jurosParcela12x: 2.5,
  jurosParcela18x: 3.2,
  /** Economia PIX vs à vista (âncora 12×) — espelhada da tabela (~10,55%) */
  descontoPix: 11.79, // ≈ (1,117943 − 1)×100 — sincronizado ao salvar taxaCartaoMensal
  taxaCartaoMensal: 1.51,
  /** Derivados da maquininha na taxa vigente */
  taxaCartao12x: 10.6,
  taxaCartao18x: 15.2,
  fatorAvista: 1 / 1.117943,
  fatorParcelado: 1.2,
  fator12x: 1 / 1.117943,
  fator18x: 1 / 1.179384,

  pdespesaFixo: 3000,
  pdespesaVariavel: 22,
  fretePadrao: 0,

  textoEconomiaAnual: 'Economia anual de R$ {valorEconomia} na conta de energia',
  textoPayback: 'Investimento se paga em apenas {mesesPayback} meses',
  textoTIR: 'Taxa Interna de Retorno de {percentualTIR}% ao ano',
  textoValorizacaoImovel: 'Valorização do imóvel em até {percentualValorizacao}%',
  textoSustentabilidade: 'Evita emissão de {tonelaCO2} toneladas de CO₂ em 25 anos (vida útil do sistema)',

  estadosPadrao: [...ESTADOS_PADRAO],
  hspPorEstado: { ...HSP_POR_ESTADO_PADRAO },
};

function parseMaybeJson<T>(value: unknown, fallback: T): T {
  if (value == null) return fallback;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return value as T;
}

/** Merge seguro: API/Supabase às vezes devolve string no lugar de array/objeto */
export function mergeConfiguracoes(
  saved: Partial<ConfiguracaoSistema> | Record<string, unknown> | null | undefined
): ConfiguracaoSistema {
  const rawIn = (saved || {}) as Record<string, unknown>;
  // Legado: algumas bases só têm tarifaEnergia; a UI/V3 usam tarifaPadrao
  const raw: Record<string, unknown> = { ...rawIn };
  if (raw.tarifaPadrao == null && raw.tarifaEnergia != null) {
    const t = Number(raw.tarifaEnergia);
    if (Number.isFinite(t)) raw.tarifaPadrao = t;
  }

  let estados = parseMaybeJson<string[]>(raw.estadosPadrao, CONFIG_PADRAO.estadosPadrao);
  if (!Array.isArray(estados) || !estados.length) estados = [...ESTADOS_PADRAO];

  let hspMap = parseMaybeJson<Record<string, number>>(raw.hspPorEstado, CONFIG_PADRAO.hspPorEstado);
  if (!hspMap || typeof hspMap !== 'object' || Array.isArray(hspMap)) {
    hspMap = { ...HSP_POR_ESTADO_PADRAO };
  }

  const merged: ConfiguracaoSistema = {
    ...CONFIG_PADRAO,
    ...(raw as Partial<ConfiguracaoSistema>),
    estadosPadrao: estados,
    hspPorEstado: { ...HSP_POR_ESTADO_PADRAO, ...hspMap },
  };

  for (const k of [
    'pdespesaFixo',
    'pdespesaVariavel',
    'fretePadrao',
    'tarifaPadrao',
    'diasMes',
    'placasPorMicro',
    'estoqueMinimoSoolar',
    'estoqueMinimoOutros',
    'bonusMicroPercent',
    'hspPadrao',
    'performanceRate',
  ] as const) {
    const v = Number(merged[k]);
    merged[k] = Number.isFinite(v) ? v : CONFIG_PADRAO[k];
  }

  return merged;
}

// Função para carregar configurações do sistema
export async function carregarConfiguracoes(): Promise<ConfiguracaoSistema> {
  try {
    if (typeof window !== 'undefined') {
      const response = await fetch('/api/admin/config');
      if (response.ok) {
        const config = await response.json();
        return mergeConfiguracoes(config);
      }
    } else {
      const fs = require('fs').promises;
      const path = require('path');
      const configPath = path.join(process.cwd(), 'src/data/sistema/configuracoes.json');

      try {
        const configData = await fs.readFile(configPath, 'utf8');
        const config = JSON.parse(configData);
        return mergeConfiguracoes(config);
      } catch {
        // Arquivo não existe, usar padrão
      }
    }
  } catch (error) {
    console.warn('Erro ao carregar configurações, usando padrão:', error);
  }

  return { ...CONFIG_PADRAO };
}

/** Extrato usado pelo V3 (proposta automática / motor) */
export function extrairDefaultsV3(config: ConfiguracaoSistema) {
  return {
    hsp: config.hspPadrao,
    tarifa: config.tarifaPadrao,
    performanceRate: config.performanceRate,
    diasMes: config.diasMes,
    bonusMicroPercent: config.bonusMicroPercent,
    placasPorMicro: config.placasPorMicro,
    estoqueMinimoSoolar: config.estoqueMinimoSoolar,
    estoqueMinimoOutros: config.estoqueMinimoOutros,
    pdespesaFixo: config.pdespesaFixo,
    pdespesaVariavel: config.pdespesaVariavel,
    fretePadrao: config.fretePadrao,
    fatorParcelado: config.fatorParcelado,
    taxaCartaoMensal: config.taxaCartaoMensal,
    descontoPix:
      typeof config.descontoPix === 'number' && config.descontoPix <= 1
        ? config.descontoPix * 100
        : config.descontoPix,
  };
}

// Função para calcular preço com desconto PIX
export function calcularPrecoPixComDesconto(precoBase: number, config: ConfiguracaoSistema): number {
  const desc = config.descontoPix <= 1 ? config.descontoPix : config.descontoPix / 100;
  return precoBase * (1 - desc);
}

// Função para calcular parcelas (usa taxa mensal da maquininha)
export function calcularParcelas(precoBase: number, config: ConfiguracaoSistema) {
  const precos = calcularPrecosDePix(
    precoBase,
    config.fatorParcelado || 1.2,
    config.taxaCartaoMensal ?? TAXA_CARTAO_MENSAL_REF
  );
  return {
    parcela12x: precos.p12x,
    parcela18x: precos.p18x_parcela,
    valor12x: precos.p12x_total,
    valor18x: precos.p18x_total,
  };
}

// Função para calcular potência necessária
export function calcularPotenciaNecessaria(
  consumoMensal: number,
  hsp: number,
  config: ConfiguracaoSistema
): number {
  const dias = config.diasMes || 30;
  return (consumoMensal * config.margemSeguranca) / (hsp * dias * config.performanceRate);
}

// Função para calcular payback
export function calcularPayback(
  investimento: number,
  economiaAnual: number,
  config: ConfiguracaoSistema
): number {
  const economiaAjustada = economiaAnual * (1 + config.reajusteEnergia / 100);
  return (investimento / economiaAjustada) * 12;
}

// Função para calcular TIR
export function calcularTIR(
  investimento: number,
  economiaAnual: number,
  anosVidaUtil: number = 25
): number {
  const fluxoAnual = economiaAnual;
  const tir = ((fluxoAnual * anosVidaUtil) / investimento - 1) / anosVidaUtil * 100;
  return Math.max(tir, 0);
}

// Função para aplicar markup
export function aplicarMarkup(
  pcusto: number,
  pdespesa: number,
  tipoSistema: 'economico' | 'standard' | 'premium',
  config: ConfiguracaoSistema
): number {
  const markups = {
    economico: config.markupEconomico,
    standard: config.markupStandard,
    premium: config.markupPremium,
  };

  return (pcusto + pdespesa) * markups[tipoSistema];
}

// Função para processar textos de marketing com variáveis
export function processarTextoMarketing(
  template: string,
  variaveis: { [key: string]: string | number }
): string {
  let texto = template;

  for (const [chave, valor] of Object.entries(variaveis)) {
    const regex = new RegExp(`\\{${chave}\\}`, 'g');
    texto = texto.replace(regex, valor.toString());
  }

  return texto;
}

// Função para obter HSP por estado
export function obterHSP(estado: string, config: ConfiguracaoSistema): number {
  return config.hspPorEstado?.[estado] || config.hspPadrao;
}

// Função para calcular economia de CO2
export function calcularEconomiaCO2(geracaoAnual: number): number {
  const fatorEmissao = 0.0896;
  const geracaoMWh = geracaoAnual / 1000;
  return geracaoMWh * fatorEmissao * 25;
}

// Função para calcular valorização do imóvel
export function calcularValorizacaoImovel(_investimento: number): number {
  return 5.0;
}

export type { ConfiguracaoSistema };
export { CONFIG_PADRAO, ESTADOS_PADRAO, HSP_POR_ESTADO_PADRAO };
