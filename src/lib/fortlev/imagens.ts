/**
 * Imagens públicas de equipamentos Fortlev (IIN*).
 * Arquivos em `public/equipamentos/fortlev/{codigo}.png`
 * Catálogo: `src/data/knowledge/fortlev/imagens-map.json`
 */
export function fortlevImagemPublicUrl(codigo: string | null | undefined): string | null {
  const c = String(codigo || '')
    .trim()
    .toUpperCase();
  if (!/^IIN\d{5}$/.test(c)) return null;
  return `/equipamentos/fortlev/${c}.png`;
}

/** SKU interno V3 tipo INV-AUTO-IIN00521 → IIN00521 */
export function extrairCodigoFortlevDoSku(sku: string | null | undefined): string | null {
  const m = String(sku || '')
    .toUpperCase()
    .match(/\b(IIN\d{5})\b/);
  return m ? m[1] : null;
}
