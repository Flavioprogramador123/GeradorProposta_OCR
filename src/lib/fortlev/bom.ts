/**
 * BOM Fortlev ≈ kit SOOLLAR 391003 (fibro + parafuso inox madeira · 4 mód).
 *
 * Trilho / cabo / MC4 NÃO entram aqui — continuam com as regras já do kitEngine.
 * O kit Fortlev é montado só com peças avulsas de fixação.
 *
 * Referência de composição (COD-391003):
 * - 6× grampo intermediário
 * - 4× grampo final/terminal
 * - 2× junção de perfil
 * - 8× suporte fixação + parafuso inox madeira M10×250
 */
export interface FortlevBomPeca {
  /** Papel no kit canônico */
  papel:
    | 'grampo_intermediario'
    | 'grampo_final'
    | 'juncao'
    | 'suporte_prisioneiro_m10x250';
  qty: number;
  /** Códigos Fortlev preferidos (primeiro match no catálogo). */
  codigosPreferidos: string[];
  /** Fallback por nome se código sumir do catálogo. */
  nomeMatch: RegExp;
}

export const FORTLEV_BOM_KIT_391003: FortlevBomPeca[] = [
  {
    papel: 'grampo_intermediario',
    qty: 6,
    codigosPreferidos: ['ILS00027', 'IEF00227', 'IEF00131'],
    nomeMatch: /GRAMPO\s+INTERMEDI/i,
  },
  {
    papel: 'grampo_final',
    qty: 4,
    codigosPreferidos: ['ILS00028', 'IEF00226', 'IEF00132'],
    nomeMatch: /GRAMPO\s+(FINAL|TERMINAL)/i,
  },
  {
    papel: 'juncao',
    qty: 2,
    codigosPreferidos: ['IEF00009', 'IEF00224'],
    nomeMatch: /JUN[CÇ][AÃ]O/i,
  },
  {
    papel: 'suporte_prisioneiro_m10x250',
    qty: 8,
    // Peça combinada Fortlev (suporte L + prisioneiro 250) ≈ item 391003
    codigosPreferidos: ['IEF00232'],
    nomeMatch: /PRISIONEIRO.+M10X250|M10X250.+PRISIONEIRO|SUPORTE\s*L.+M10X250/i,
  },
];

/** Nome/código sintéticos para casar EST-AUTO-391003 / KIT-ESTRUTURA-4MOD. */
export const FORTLEV_KIT_SINTETICO = {
  codigo: '391003',
  nome: 'KIT FIXAÇÃO TELHA FIBROCIMENTO PARAFUSO INOX MADEIRA PARA 4 MODULOS',
  skuCanonico: 'EST-AUTO-391003',
};

export interface FortlevProdutoLike {
  codigo: string;
  nome: string;
  preco: number;
}

export function montarBomKit391003(produtos: FortlevProdutoLike[]): {
  preco: number;
  pecas: Array<{ codigo: string; qty: number; precoUnit: number; nome: string; papel: string }>;
  faltando: string[];
} {
  const byCode = new Map(produtos.map((p) => [p.codigo.toUpperCase(), p]));
  const pecas: Array<{ codigo: string; qty: number; precoUnit: number; nome: string; papel: string }> =
    [];
  const faltando: string[] = [];

  for (const regra of FORTLEV_BOM_KIT_391003) {
    let hit: FortlevProdutoLike | undefined;
    for (const c of regra.codigosPreferidos) {
      hit = byCode.get(c.toUpperCase());
      if (hit) break;
    }
    if (!hit) {
      hit = produtos.find((p) => regra.nomeMatch.test(p.nome));
    }
    if (!hit || !(hit.preco > 0)) {
      faltando.push(regra.papel);
      continue;
    }
    pecas.push({
      codigo: hit.codigo,
      qty: regra.qty,
      precoUnit: hit.preco,
      nome: hit.nome,
      papel: regra.papel,
    });
  }

  const preco = Math.round(pecas.reduce((s, p) => s + p.precoUnit * p.qty, 0) * 100) / 100;
  return { preco, pecas, faltando };
}
