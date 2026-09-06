/**
 * Regras comerciais de dimensionamento CC/CA (string).
 *
 * - Sobrecarga alvo: kWp ≤ kW_inversor × 1,40 (+40%)
 * - Tolerância de ajuste: +5 p.p. → teto duro 1,45 (ex.: 6 kW → 8,4 kWp, folga até 8,7)
 * - Subcarga máxima: kWp ≥ kW_inversor × 0,50 (−50%) — evita inversor caro subutilizado
 * - Híbridos: fora da lista principal (seleção automática)
 */

export const DC_AC_SOBRECARGA_MAX = 1.4;
export const DC_AC_SOBRECARGA_TOL_PP = 0.05;
/** Teto duro: 1,40 + 0,05 = 1,45 */
export const DC_AC_SOBRECARGA_TETO = DC_AC_SOBRECARGA_MAX + DC_AC_SOBRECARGA_TOL_PP;
export const DC_AC_SUBCARGA_MIN = 0.5;

export function isInversorHibrido(inv: {
  nome?: string | null;
  marca?: string | null;
  sku_interno?: string | null;
}): boolean {
  const blob = `${inv.nome || ''} ${inv.marca || ''} ${inv.sku_interno || ''}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  return /\bhibrid|\bhybrid/.test(blob);
}

export function ratioDcAc(kwpModulos: number, potenciaInversorKw: number): number {
  if (!potenciaInversorKw || potenciaInversorKw <= 0) return Number.POSITIVE_INFINITY;
  return kwpModulos / potenciaInversorKw;
}

/** Adequação DC/AC: soft = só até +40%; hard = até +45% (tolerância). */
export function inversorAdequadoParaKwp(
  potenciaInversorKw: number,
  kwpModulos: number,
  modo: 'soft' | 'hard' = 'hard'
): boolean {
  const r = ratioDcAc(kwpModulos, potenciaInversorKw);
  const max = modo === 'soft' ? DC_AC_SOBRECARGA_MAX : DC_AC_SOBRECARGA_TETO;
  return r >= DC_AC_SUBCARGA_MIN && r <= max;
}

/** Faixa de kW do inversor compatível com um kWp de módulos. */
export function faixaKwInversorParaKwp(kwpModulos: number): { minKw: number; maxKw: number } {
  return {
    minKw: kwpModulos / DC_AC_SOBRECARGA_TETO,
    maxKw: kwpModulos / DC_AC_SUBCARGA_MIN,
  };
}

/** kWp máximo/mínimo de módulos para um inversor (teto com tolerância). */
export function faixaKwpParaInversor(potenciaInversorKw: number): {
  minKwp: number;
  maxKwpSoft: number;
  maxKwp: number;
} {
  return {
    minKwp: potenciaInversorKw * DC_AC_SUBCARGA_MIN,
    maxKwpSoft: potenciaInversorKw * DC_AC_SOBRECARGA_MAX,
    maxKwp: potenciaInversorKw * DC_AC_SOBRECARGA_TETO,
  };
}

/** Arredonda quantidade de módulos para par (strings típicas). */
export function clampQtdModulosPar(qtd: number, min = 4, max = 120): number {
  let n = Math.max(min, Math.min(max, Math.round(qtd)));
  if (n % 2 !== 0) n += 1;
  if (n > max) n = max - (max % 2 === 0 ? 0 : 1);
  if (n < min) n = min + (min % 2);
  return n;
}

/**
 * Ajusta qtd de módulos para caber na faixa DC/AC do inversor.
 * Preferência: não ultrapassar teto; se subcarga, sobe qtd (se possível).
 */
export function ajustarQtdModulosAoInversor(
  qtdMod: number,
  potenciaModuloW: number,
  potenciaInversorKw: number
): { qtdMod: number; potKwp: number; ratio: number; ajustou: boolean } {
  const wp = Math.max(1, potenciaModuloW);
  const { minKwp, maxKwp } = faixaKwpParaInversor(potenciaInversorKw);
  const maxQtd = clampQtdModulosPar(Math.floor((maxKwp * 1000) / wp), 2, 120);
  const minQtd = clampQtdModulosPar(Math.ceil((minKwp * 1000) / wp), 2, 120);

  let qtd = clampQtdModulosPar(qtdMod);
  const antes = qtd;
  if (qtd > maxQtd) qtd = Math.max(2, maxQtd);
  if (qtd < minQtd) qtd = minQtd;

  const potKwp = (qtd * wp) / 1000;
  return {
    qtdMod: qtd,
    potKwp,
    ratio: ratioDcAc(potKwp, potenciaInversorKw),
    ajustou: qtd !== antes,
  };
}
