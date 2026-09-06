/**
 * Regras comerciais de dimensionamento CC/CA (string).
 * Módulo seguro para client + server (sem `fs`).
 *
 * Defaults: kWp/kW ∈ [0,80 ; 1,50] + tol 0,05 → teto 1,55.
 * Na API, chame `refreshDcAcLimitsFromAdmin` (dcAcLimitsConfig) antes de dimensionar.
 */

export interface DcAcLimits {
  min: number;
  max: number;
  tolPp: number;
  teto: number;
}

/** Defaults de código (= Restaurar padrão na UI) */
export const DC_AC_SUBCARGA_MIN = 0.8;
export const DC_AC_SOBRECARGA_MAX = 1.5;
export const DC_AC_SOBRECARGA_TOL_PP = 0.05;
/** Teto duro: max + tol (1,50 + 0,05 = 1,55) */
export const DC_AC_SOBRECARGA_TETO = DC_AC_SOBRECARGA_MAX + DC_AC_SOBRECARGA_TOL_PP;

const DEFAULTS: DcAcLimits = {
  min: DC_AC_SUBCARGA_MIN,
  max: DC_AC_SOBRECARGA_MAX,
  tolPp: DC_AC_SOBRECARGA_TOL_PP,
  teto: DC_AC_SOBRECARGA_TETO,
};

let cache: DcAcLimits | null = null;

export function sanitizeDcAcLimits(min: number, max: number, tolPp: number): DcAcLimits {
  let mn = Number.isFinite(min) ? min : DEFAULTS.min;
  let mx = Number.isFinite(max) ? max : DEFAULTS.max;
  let tol = Number.isFinite(tolPp) ? tolPp : DEFAULTS.tolPp;
  if (mn < 0.2) mn = 0.2;
  if (mn > 1.2) mn = 1.2;
  if (mx < 0.8) mx = 0.8;
  if (mx > 2.5) mx = 2.5;
  if (tol < 0) tol = 0;
  if (tol > 0.3) tol = 0.3;
  if (mn >= mx) mn = Math.min(mx - 0.05, DEFAULTS.min);
  return { min: mn, max: mx, tolPp: tol, teto: mx + tol };
}

/** Valores atuais (cache da API ou defaults). */
export function getDcAcLimits(): DcAcLimits {
  return cache ? { ...cache } : { ...DEFAULTS };
}

export function setDcAcLimitsOverride(v: Partial<DcAcLimits> | DcAcLimits) {
  const cur = getDcAcLimits();
  cache = sanitizeDcAcLimits(
    v.min ?? cur.min,
    v.max ?? cur.max,
    'tolPp' in v && v.tolPp != null ? v.tolPp : cur.tolPp
  );
}

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

/** Adequação DC/AC: soft = até max; hard = até teto (max+tol). */
export function inversorAdequadoParaKwp(
  potenciaInversorKw: number,
  kwpModulos: number,
  modo: 'soft' | 'hard' = 'hard'
): boolean {
  const lim = getDcAcLimits();
  const r = ratioDcAc(kwpModulos, potenciaInversorKw);
  const max = modo === 'soft' ? lim.max : lim.teto;
  return r >= lim.min && r <= max;
}

/** Faixa de kW do inversor compatível com um kWp de módulos. */
export function faixaKwInversorParaKwp(kwpModulos: number): { minKw: number; maxKw: number } {
  const lim = getDcAcLimits();
  return {
    minKw: kwpModulos / lim.teto,
    maxKw: kwpModulos / lim.min,
  };
}

/** kWp máximo/mínimo de módulos para um inversor (teto com tolerância). */
export function faixaKwpParaInversor(potenciaInversorKw: number): {
  minKwp: number;
  maxKwpSoft: number;
  maxKwp: number;
} {
  const lim = getDcAcLimits();
  return {
    minKwp: potenciaInversorKw * lim.min,
    maxKwpSoft: potenciaInversorKw * lim.max,
    maxKwp: potenciaInversorKw * lim.teto,
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
