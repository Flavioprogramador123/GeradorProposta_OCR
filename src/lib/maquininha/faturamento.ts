/**
 * Faixa de faturamento mensal da maquininha (Ton).
 *
 * A tabela da Ton muda a taxa conforme o faturamento mensal da empresa.
 * A PIENG começa na faixa 0 (até R$ 20 mil) e sobe quando passar o limite —
 * basta trocar `faixaFaturamento` nas configurações, sem mexer no código.
 */

import {
  parseTabelaTon,
  type LinhasTon,
  type PrazoRecebimento,
} from '@/lib/maquininha/tonTabela';
import {
  TON_TABELA_PUBLICA,
  type TaxaCartaoInput,
  type TaxaCartaoResolvida,
  parseTonTotais,
  resolverTaxaCartao,
} from '@/lib/maquininha/taxaAdapter';

export interface FaturamentoConfig {
  /** Faixa de faturamento mensal vigente (0 = até R$ 20 mil) */
  faixaFaturamento?: number | null;
  /** Prazo de recebimento vigente (`naHora` | `umDiaUtil`) */
  prazoRecebimento?: string | null;
  adquirente?: string | null;
  /** Tabela da Ton (array cru do `tontaxa.json`) — injetada na config */
  tonTotais?: LinhasTon | unknown[] | null;
  taxaMensalPagSeguro?: number | null;
  taxaCartaoMensal?: number | null;
}

/**
 * Resolve a taxa de cartão a partir de um objeto de configurações do sistema.
 * Fonte: `tontaxa.json` (Ton) com fallback para a taxa manual do PagSeguro.
 */
export function resolverTaxaCartaoDaConfig(
  config: FaturamentoConfig | null | undefined,
  fallbackPrazo: PrazoRecebimento = 'umDiaUtil'
): TaxaCartaoResolvida {
  const input: TaxaCartaoInput = {
    adquirente: config?.adquirente ?? null,
    tonTotais: parseTonTotais(config?.tonTotais),
    prazoRecebimento: config?.prazoRecebimento ?? fallbackPrazo,
    faixaFaturamento: config?.faixaFaturamento ?? 0,
    taxaMensalPagSeguro: config?.taxaMensalPagSeguro ?? null,
    taxaMensalFallback: config?.taxaCartaoMensal ?? null,
  };
  return resolverTaxaCartao(input);
}

/**
 * Lê a tabela da Ton no browser (cópia pública em `public/tontaxa.json`).
 * No servidor prefira ler o arquivo direto do filesystem.
 */
export async function carregarTabelaTonBrowser(
  prazo: PrazoRecebimento = 'umDiaUtil',
  faixa = 0
): Promise<LinhasTon | null> {
  if (typeof window === 'undefined') return null;
  try {
    const res = await fetch(TON_TABELA_PUBLICA, { cache: 'no-store' });
    if (!res.ok) return null;
    const json = await res.json();
    return parseTabelaTon(json, prazo, faixa);
  } catch {
    return null;
  }
}
