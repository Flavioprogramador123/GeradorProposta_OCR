import {
  TAXA_CARTAO_MENSAL_REF,
  calcularPrecosDePix,
  buildTabelaCartao,
} from '@/lib/tabelaJurosCartao';
import {
  FAIXA_TON_PADRAO,
  PRAZO_RECEBIMENTO_PADRAO,
  type LinhasTon,
  type PrazoRecebimento,
} from '@/lib/maquininha/tonTabela';
import {
  ADQUIRENTE_PADRAO,
  TAXA_MENSAL_PAGSEGURO_PADRAO,
  type Adquirente,
} from '@/lib/maquininha/taxaAdapter';

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
  /** DC/AC (kWp/kW) — subcarga mínima */
  dcAcMin: number;
  /** DC/AC (kWp/kW) — sobrecarga alvo (soft) */
  dcAcMax: number;
  /** Tolerância de ajuste em pontos (ex.: 0,05 → teto = max+0,05) */
  dcAcTolPp: number;
  /**
   * Margem ±% em torno do alvo da Proposta automática (padrão 20).
   * Permite encaixar as 3 alternativas mesmo com granularidade de módulo/DC-AC.
   */
  varianciaAlvoPct: number;
  /**
   * Potência mínima do módulo (Wp) no auto V3.
   * Ex.: 500 exclui Maxeon 415 / módulos ~425 W que o time não quer.
   */
  moduloPotenciaMinW: number;
  /**
   * Potência mínima de inversor/micro (kW) no auto V3.
   * Ex.: 1 exclui Enphase IQ8 ~0,475 kW (caro / 1 MPPT).
   */
  inversorPotenciaMinKw: number;

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
  /** Taxa mensal da maquininha (% a.m.) — fallback/PagSeguro; a Ton vem do `tontaxa.json` */
  taxaCartaoMensal: number;
  taxaCartao12x: number;
  taxaCartao18x: number;
  fatorAvista: number;
  fatorParcelado: number;
  fator12x: number;
  fator18x: number;

  // Maquininha (tabela Ton + fallback PagSeguro)
  /** Adquirente vigente: `ton` (tabela) ou `pagseguro` (taxa manual) */
  adquirente: Adquirente | string;
  /** Prazo de recebimento da Ton: `naHora` ou `umDiaUtil` */
  prazoRecebimento: PrazoRecebimento | string;
  /** Faixa de faturamento mensal: 0 = até R$20 mil … 3 = acima de R$80 mil */
  faixaFaturamento: number;
  /** Taxa mensal por parcela do PagSeguro (fallback quando a Ton falha) */
  taxaMensalPagSeguro: number;
  /** Tabela da Ton resolvida (prazo × faixa) — juros % total por parcela */
  tonTotais?: LinhasTon | null;

  // Despesa PIENG (Gerador / V3)
  pdespesaFixo: number;
  pdespesaVariavel: number;
  fretePadrao: number;
  /**
   * Desconto % sobre o custo do kit Fortlev (portal kit ≈ mais barato que avulso).
   * Ex.: 11 ≈ aproximar PIX do pedido Fortlev vs soma avulsa no V3.
   */
  descontoFortlevCustoPct: number;

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
  GO: 5.45,
  DF: 5.48,
  MG: 5.45,
  MT: 5.43,
  MS: 5.32,
  BA: 5.99,
  TO: 5.34,
};

/**
 * Defaults do botão "Restaurar padrão" em `/admin/configuracoes`.
 * Montagem V3 (strings/cabos/marcas): ver `kitEngine.ts` + `modules/v3/README.md` — não entra nesta tela.
 */
const CONFIG_PADRAO: ConfiguracaoSistema = {
  performanceRate: 0.78,
  hspPadrao: 5.45,
  margemSeguranca: 1.1,
  eficienciaInversor: 0.98,
  bonusMicroPercent: 5,
  diasMes: 30.4,
  placasPorMicro: 4,
  estoqueMinimoSoolar: 10,
  estoqueMinimoOutros: 5,
  dcAcMin: 0.8,
  dcAcMax: 1.5,
  dcAcTolPp: 0.05,
  varianciaAlvoPct: 20,
  moduloPotenciaMinW: 500,
  inversorPotenciaMinKw: 1,

  taxaSelic: 11.25,
  inflacaoAnual: 4.5,
  reajusteEnergia: 8.2,
  tarifaPadrao: 1.17,

  markupEconomico: 1.8,
  markupStandard: 2.0,
  markupPremium: 2.3,

  jurosParcela12x: 2.5,
  jurosParcela18x: 3.2,
  /** Economia PIX vs à vista (âncora 12×) — sincronizada ao salvar a tabela */
  descontoPix: 11.79,
  taxaCartaoMensal: 1.51,
  /** Derivados da maquininha na taxa vigente */
  taxaCartao12x: 10.6,
  taxaCartao18x: 15.2,
  fatorAvista: 1 / 1.117943,
  fatorParcelado: 1.2,
  fator12x: 1 / 1.117943,
  fator18x: 1 / 1.179384,

  // Maquininha
  adquirente: ADQUIRENTE_PADRAO,
  prazoRecebimento: PRAZO_RECEBIMENTO_PADRAO,
  faixaFaturamento: FAIXA_TON_PADRAO,
  taxaMensalPagSeguro: TAXA_MENSAL_PAGSEGURO_PADRAO,
  tonTotais: null,

  pdespesaFixo: 3000,
  pdespesaVariavel: 30,
  fretePadrao: 400,
  /** Calibrado no pedido ~10,88 kWp (nosso PIX vs Fortlev ≈ −11% no kit) */
  descontoFortlevCustoPct: 11,

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
  // Legado: blob `sistema_config` (ex. hsp 5.3) não deve sobrescrever o flat atual
  const { sistema_config: _legadoIgnorado, ...rawSemLegado } = rawIn;
  // Legado: algumas bases só têm tarifaEnergia; a UI/V3 usam tarifaPadrao
  const raw: Record<string, unknown> = { ...rawSemLegado };
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

  // Maquininha: faixa/prazo/adquirente normalizados; tabela da Ton completada
  merged.faixaFaturamento = Number.isFinite(Number(merged.faixaFaturamento))
    ? Math.min(Math.max(0, Math.trunc(Number(merged.faixaFaturamento))), 3)
    : FAIXA_TON_PADRAO;
  merged.prazoRecebimento =
    merged.prazoRecebimento === 'naHora' || merged.prazoRecebimento === 'umDiaUtil'
      ? merged.prazoRecebimento
      : PRAZO_RECEBIMENTO_PADRAO;
  merged.adquirente =
    merged.adquirente === 'ton' || merged.adquirente === 'pagseguro'
      ? merged.adquirente
      : ADQUIRENTE_PADRAO;
  merged.taxaMensalPagSeguro = Number.isFinite(Number(merged.taxaMensalPagSeguro))
    ? Number(merged.taxaMensalPagSeguro)
    : TAXA_MENSAL_PAGSEGURO_PADRAO;
  merged.tonTotais = resolverTonTotais(merged);  for (const k of [
    'pdespesaFixo',
    'pdespesaVariavel',
    'fretePadrao',
    'descontoFortlevCustoPct',
    'tarifaPadrao',
    'diasMes',
    'placasPorMicro',
    'estoqueMinimoSoolar',
    'estoqueMinimoOutros',
    'dcAcMin',
    'dcAcMax',
    'dcAcTolPp',
    'varianciaAlvoPct',
    'moduloPotenciaMinW',
    'inversorPotenciaMinKw',
    'bonusMicroPercent',
    'hspPadrao',
    'performanceRate',
  ] as const) {
    const v = Number(merged[k]);
    merged[k] = Number.isFinite(v) ? v : CONFIG_PADRAO[k];
  }
  if (merged.descontoFortlevCustoPct < 0) merged.descontoFortlevCustoPct = 0;
  if (merged.descontoFortlevCustoPct > 40) merged.descontoFortlevCustoPct = 40;

  return merged;
}

/**
 * Lê o `tontaxa.json` do filesystem (servidor) no prazo × faixa vigentes.
 * Se a tabela vier persistida na config (produção sem arquivo), usa-a.
 */
function resolverTonTotais(config: ConfiguracaoSistema): LinhasTon | null {
  if (config.tonTotais && Object.keys(config.tonTotais).length) return config.tonTotais;
  return null;
}

/**
 * Completa `tonTotais` a partir do arquivo `tontaxa.json` (só no servidor).
 * A leitura do `fs` vive em `@/lib/maquininha/tonTotaisServer`, que nenhuma
 * página do cliente importa — por isso o bundle do browser não puxa `fs`.
 */
async function completarTonTotais(config: ConfiguracaoSistema): Promise<ConfiguracaoSistema> {
  if (config.tonTotais && Object.keys(config.tonTotais).length) return config;
  if (typeof window !== 'undefined') return config; // browser usa /tontaxa.json
  try {
    const { resolverTonTotaisServer } = await import('@/lib/maquininha/tonTotaisServer');
    const totais = await resolverTonTotaisServer(config.prazoRecebimento, config.faixaFaturamento);
    if (totais) config.tonTotais = totais;
  } catch {
    // sem arquivo/ambiente — segue com fallback PagSeguro
  }
  return config;
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
        // merge normaliza a maquininha; completarTonTotais lê o tontaxa.json
        return await completarTonTotais(mergeConfiguracoes(config));
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
    dcAcMin: config.dcAcMin,
    dcAcMax: config.dcAcMax,
    dcAcTolPp: config.dcAcTolPp,
    varianciaAlvoPct: config.varianciaAlvoPct,
    moduloPotenciaMinW: config.moduloPotenciaMinW,
    inversorPotenciaMinKw: config.inversorPotenciaMinKw,
    pdespesaFixo: config.pdespesaFixo,
    pdespesaVariavel: config.pdespesaVariavel,
    fretePadrao: config.fretePadrao,
    descontoFortlevCustoPct: config.descontoFortlevCustoPct,
    fatorParcelado: config.fatorParcelado,
    taxaCartaoMensal: config.taxaCartaoMensal,
    // Maquininha (Ton + fallback PagSeguro) — consumido pelo motor de preços
    adquirente: config.adquirente,
    prazoRecebimento: config.prazoRecebimento,
    faixaFaturamento: config.faixaFaturamento,
    taxaMensalPagSeguro: config.taxaMensalPagSeguro,
    tonTotais: config.tonTotais,
    descontoPix:
      typeof config.descontoPix === 'number' && config.descontoPix <= 1
        ? config.descontoPix * 100
        : config.descontoPix,
  };
}

/** Tabela de cartão vigente (Ton com fallback PagSeguro). */
export function tabelaCartaoDaConfig(config: ConfiguracaoSistema) {
  return buildTabelaCartao({
    adquirente: config.adquirente,
    prazoRecebimento: config.prazoRecebimento,
    faixaFaturamento: config.faixaFaturamento,
    tonTotais: config.tonTotais,
    taxaMensalPagSeguro: config.taxaMensalPagSeguro,
    taxaMensalFallback: config.taxaCartaoMensal,
  });
}

// Função para calcular preço com desconto PIX
export function calcularPrecoPixComDesconto(precoBase: number, config: ConfiguracaoSistema): number {
  const desc = config.descontoPix <= 1 ? config.descontoPix : config.descontoPix / 100;
  return precoBase * (1 - desc);
}

// Função para calcular parcelas (usa a tabela da maquininha vigente)
export function calcularParcelas(precoBase: number, config: ConfiguracaoSistema) {
  const precos = calcularPrecosDePix(
    precoBase,
    config.fatorParcelado || 1.2,
    tabelaCartaoDaConfig(config)
  );
  return {
    parcela12x: precos.p12x,
    parcela18x: precos.p18x_parcela,
    parcela21x: precos.p21x_parcela,
    valor12x: precos.p12x_total,
    valor18x: precos.p18x_total,
    valor21x: precos.p21x_total,
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
