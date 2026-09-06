/**
 * Rótulo curto só para cards admin (Todos os Orçamentos): marca do equipamento.
 * Remove prefixos MODULO / INVERSOR / MICRO-INVERSOR — não altera nomes nas tabelas V3.
 *
 * Ex.: "MODULO 680W RENEPV BIFACIAL" → "RENEPV"
 *      "INVERSOR SAJ AFCI MONO 3K…" → "SAJ"
 *      "MODULO" / "INVERSOR" sozinhos → "" (genérico, sem marca)
 */
const PREFIXO_TIPO =
  /^(MICRO[-\s]?INVERSOR|INVERSOR|M[ÓO]DULO)\b/i;
const GENERICO =
  /^(MICRO[-\s]?INVERSOR|INVERSOR|M[ÓO]DULO|PADR[AÃ]O|N\/?A)$/i;
const SKIP =
  /^(ON[-]?GRID|MONO|TRIF[AÁ]SICO|TRIF|AFCI|BIFACIAL|HIBRIDO|H[ÍI]BRIDO)$/i;
const POT_LIKE = /^\d+([.,]\d+)?\s*(W|WP|KW|K)?$/i;

export function marcaCurtaEquipamento(nome: string | null | undefined): string {
  if (!nome || !String(nome).trim()) return '';
  let s = String(nome).trim();

  // Valor já era só o tipo (bug do first-token) → sem marca útil
  if (GENERICO.test(s)) return '';

  s = s.replace(PREFIXO_TIPO, '').trim();
  if (!s || GENERICO.test(s)) return '';

  const parts = s.split(/\s+/).filter(Boolean);
  const brand = parts.find((p) => /^[A-Za-zÀ-ÿ]/.test(p) && !SKIP.test(p) && !POT_LIKE.test(p));
  const raw = brand || parts.find((p) => !POT_LIKE.test(p)) || '';
  if (!raw || GENERICO.test(raw)) return '';
  // "DEYE-S2.25K-G4" → "DEYE"
  if (/^[A-Za-zÀ-ÿ]{2,}[-/]/.test(raw)) return raw.split(/[-/]/)[0];
  return raw;
}

/**
 * Tenta marcar a partir de tag explícita (scraping/catálogo), depois nome/especificação.
 * Prioridade: marca tag → nome completo → especificação.
 */
export function resolveMarcaCurtaCard(opts: {
  marca?: string | null;
  nomeCompleto?: string | null;
  especificacao?: string | null;
}): string {
  const tag = String(opts.marca || '')
    .trim()
    .replace(/\s+/g, '');
  if (tag && !GENERICO.test(tag) && !/^(GEN)$/i.test(tag)) {
    if (/^[A-Za-zÀ-ÿ]{2,}[-/]/.test(tag)) return tag.split(/[-/]/)[0].toUpperCase();
    return tag.toUpperCase();
  }
  const fromNome = marcaCurtaEquipamento(opts.nomeCompleto);
  if (fromNome) return fromNome;
  const esp = String(opts.especificacao || '');
  const m = esp.match(/(?:m[oó]dulos?|inversores?)\s+(.+)$/i);
  if (m?.[1]) return marcaCurtaEquipamento(m[1]);
  return marcaCurtaEquipamento(esp);
}

/** Ordena catálogo V3 pelo menor preço unitário (nulls no fim). */
export function sortByPrecoAsc<T extends { preco_custo?: number | null }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const pa =
      a.preco_custo != null && Number.isFinite(a.preco_custo)
        ? a.preco_custo
        : Number.POSITIVE_INFINITY;
    const pb =
      b.preco_custo != null && Number.isFinite(b.preco_custo)
        ? b.preco_custo
        : Number.POSITIVE_INFINITY;
    return pa - pb;
  });
}
