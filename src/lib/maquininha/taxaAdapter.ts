/**
 * Fonte de verdade das taxas de cartão da proposta.
 *
 * - `ton`       → `tontaxa.json` (prazo de recebimento × faixa de faturamento)
 * - `pagseguro` → taxa mensal digitada nas configurações (fallback quando a Ton falha)
 *
 * O que o motor de preços consome é sempre a **taxa mensal por parcela** na
 * condição de referência (12×, que é a âncora do "à vista" do card), mais a
 * tabela de juros por parcela (`jurosParcelaPercent`) para 2×–21×.
 */

import {
  FAIXA_TON_PADRAO,
  PRAZO_RECEBIMENTO_PADRAO,
  type LinhasTon,
  type PrazoRecebimento,
  jurosParcelaMensal,
  maxParcelasTon,
  multiplicadorFromTotal,
  parseTabelaTon,
} from '@/lib/maquininha/tonTabela';

export const ADQUIRENTES = {
  ton: 'ton',
  pagseguro: 'pagseguro',
} as const;

export type Adquirente = keyof typeof ADQUIRENTES;

export const ADQUIRENTE_PADRAO: Adquirente = 'ton';

/** Condição de referência do card: "à vista" = total em 12×. */
export const PARCELAS_REFERENCIA = 12;

/** Taxa mensal do PagSeguro (fallback) — 18× ≈ 15,00% de juros total. */
export const TAXA_MENSAL_PAGSEGURO_PADRAO = 1.3;


export interface TaxaCartaoInput {
  adquirente?: string | null;
  /** Tabela da Ton já parseada (vinha do `tontaxa.json`) */
  tonTotais?: LinhasTon | null;
  /** Prazo de recebimento vigente (`naHora` | `umDiaUtil`) */
  prazoRecebimento?: string | null;
  /** Faixa de faturamento vigente (0 = até R$ 20 mil) */
  faixaFaturamento?: number | null;
  /** Taxa mensal por parcela do PagSeguro (config manual) */
  taxaMensalPagSeguro?: number | null;
  /** Taxa mensal legada (fallback final) */
  taxaMensalFallback?: number | null;
}

export interface TaxaCartaoResolvida {
  adquirente: Adquirente;
  /** `true` quando a Ton falhou/listou incompleta e caiu no PagSeguro */
  fallbackAtivo: boolean;
  /** Motivo do fallback (para log/admin) */
  motivoFallback: string | null;
  prazoRecebimento: PrazoRecebimento;
  faixaFaturamento: number;
  /**
   * Taxa mensal por parcela (%) na condição de referência (12×).
   * É este número que regenera a tabela 2×–21×.
   */
  taxaMensal12x: number;
  /** Juros total (%) em 12× — referência. */
  jurosTotal12x: number;
  /** Multiplicador do "à vista" = (1 + jurosTotal12x/100). */
  multiplicadorAvista: number;
  /** Juros total (%) por parcela, quando a tabela da Ton está disponível. */
  jurosParcelaPercent?: LinhasTon;
  maxParcelas: number;
}

function clampPrazo(raw: unknown): PrazoRecebimento {
  return raw === 'naHora' || raw === 'umDiaUtil' ? raw : PRAZO_RECEBIMENTO_PADRAO;
}

function isAdquirente(raw: unknown): raw is Adquirente {
  return raw === 'ton' || raw === 'pagseguro';
}

function num(raw: unknown): number | null {
  const n = typeof raw === 'number' ? raw : parseFloat(String(raw ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/** Tabela da Ton utilizável? Precisa de 1× (à vista) e 12× (âncora do card). */
export function tonUtilizavel(totais: LinhasTon | null | undefined): boolean {
  return !!totais && totais[1] > 0 && totais[PARCELAS_REFERENCIA] > 0;
}

/** Resolve as taxas (e o fallback) a partir das configurações do sistema. */
export function resolverTaxaCartao(input: TaxaCartaoInput = {}): TaxaCartaoResolvida {
  const prazo = clampPrazo(input.prazoRecebimento);
  const faixa = Number.isFinite(Number(input.faixaFaturamento))
    ? Math.trunc(Number(input.faixaFaturamento))
    : FAIXA_TON_PADRAO;
  const pedido: Adquirente = isAdquirente(input.adquirente) ? input.adquirente : ADQUIRENTE_PADRAO;

  const taxaPagSeguro =
    num(input.taxaMensalPagSeguro) ?? num(input.taxaMensalFallback) ?? TAXA_MENSAL_PAGSEGURO_PADRAO;

  const usarTon = pedido === 'ton' && tonUtilizavel(input.tonTotais);

  if (usarTon) {
    const totais = input.tonTotais as LinhasTon;
    const jurosTotal12x = totais[PARCELAS_REFERENCIA];
    return {
      adquirente: 'ton',
      fallbackAtivo: false,
      motivoFallback: null,
      prazoRecebimento: prazo,
      faixaFaturamento: faixa,
      taxaMensal12x: jurosParcelaMensal(jurosTotal12x, PARCELAS_REFERENCIA),
      jurosTotal12x,
      multiplicadorAvista: multiplicadorFromTotal(jurosTotal12x),
      jurosParcelaPercent: totais,
      maxParcelas: maxParcelasTon(totais),
    };
  }

  // PagSeguro (ou fallback por tabela da Ton ausente/incompleta)
  const motivoFallback =
    pedido === 'pagseguro'
      ? null
      : !input.tonTotais
        ? 'tabela da Ton não carregada'
        : 'tabela da Ton incompleta (sem 1× ou 12×)';

  const multiplicadorAvista = 1 + taxaPagSeguro * PARCELAS_REFERENCIA / 100;
  const jurosTotal12x = Math.round((multiplicadorAvista - 1) * 1e6) / 1e6 * 100;

  return {
    adquirente: 'pagseguro',
    fallbackAtivo: pedido === 'ton',
    motivoFallback,
    prazoRecebimento: prazo,
    faixaFaturamento: faixa,
    taxaMensal12x: taxaPagSeguro,
    jurosTotal12x,
    multiplicadorAvista: Math.round(multiplicadorAvista * 1e6) / 1e6,
    maxParcelas: 18,
  };
}

/**
 * Nome do arquivo/URL do `tontaxa.json` para o browser (via `public/`).
 * O servidor lê direto do filesystem; o browser pega deste caminho.
 */
export const TON_TABELA_PUBLICA = '/tontaxa.json';

/** Parse defensivo do que vier da config/API. */
export function parseTonTotais(raw: unknown): LinhasTon | null {
  if (!raw) return null;
  try {
    if (typeof raw === 'string') return parseTabelaTon(raw);
    if (Array.isArray(raw)) return parseTabelaTon(raw);
    if (typeof raw === 'object') {
      const rec = raw as Record<string, unknown>;
      const out: LinhasTon = {};
      for (const [k, v] of Object.entries(rec)) {
        const n = Number(k);
        const valor = num(v);
        if (Number.isFinite(n) && n >= 1 && valor != null) out[n] = valor;
      }
      return Object.keys(out).length ? out : null;
    }
  } catch {
    return null;
  }
  return null;
}
