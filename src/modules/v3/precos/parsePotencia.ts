/** Parse de potência kW a partir do nome do catálogo (SOOLLAR / Fortlev). */

export function parsePotenciaKwDoNome(nome: string, sku?: string | null): number | null {
  const u = nome.toUpperCase();
  const kwM = u.match(/(\d+[.,]\d+|\d+)\s*K(?:W)?\b/);
  if (kwM) {
    const n = Number(kwM[1].replace(',', '.'));
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  // Micro: 1000W / 475W (não confundir com módulo 630WP)
  if (!/M[OÓ]DULO|PAINEL|WP\b/i.test(u)) {
    const wM = u.match(/(\d+[.,]\d+|\d+)\s*W\b/);
    if (wM) {
      const w = Number(wM[1].replace(',', '.'));
      if (Number.isFinite(w) && w >= 200 && w <= 5000) return Math.round((w / 1000) * 1000) / 1000;
    }
  }

  // Modelos Fortlev sem "kW" no texto (BDM-2250 → 2,25 kW)
  const blob = `${sku || ''} ${nome || ''}`
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (/IIN00521|BDM[\s-]?2500/.test(blob)) return 2.5;
  if (/IIN00349|BDM[\s-]?2250/.test(blob)) return 2.25;
  if (/IIN00225|FOXESS[^\n]{0,40}\bM1\b|\bM1\b[^\n]{0,20}1000/.test(blob)) return 1;
  const bdm = blob.match(/\bBDM[\s-]?(\d{4})\b/);
  if (bdm) {
    const w = Number(bdm[1]);
    if (Number.isFinite(w) && w >= 1000 && w <= 5000) {
      return Math.round((w / 1000) * 100) / 100;
    }
  }
  return null;
}

/** Nº de entradas MPPT no nome (ex.: "6 MPPT", "2MPPT"). */
export function parseMpptDoNome(nome: string): number | null {
  const m = nome.match(/(\d+)\s*MPPTS?\b/i);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n >= 1 && n <= 32 ? n : null;
}

/**
 * Entradas MPPT do micro/inversor: nome → override por modelo conhecido.
 * Foxess M1 = 2 entradas; NEP BDM-2500 = 6; BDM-2250 = 4.
 */
export function mpptDoEquipamento(nome: string, sku?: string | null): number | null {
  const fromName = parseMpptDoNome(nome);
  if (fromName) return fromName;

  const blob = `${sku || ''} ${nome || ''}`
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (/IIN00225|FOXESS[^\n]{0,40}\bM1\b|\bM1\b[^\n]{0,20}1000/.test(blob)) return 2;
  if (/IIN00521|BDM[\s-]?2500/.test(blob)) return 6;
  if (/IIN00349|BDM[\s-]?2250/.test(blob)) return 4;
  if (/IIN00299|ENPHASE|IQ8/.test(blob)) return 1;

  return null;
}
