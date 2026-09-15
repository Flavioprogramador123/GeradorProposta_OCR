import { getV3Db } from '../db/sqlite';

export interface CalcParams {
  hsp: number;
  performanceRate: number;
  diasMes: number;
  tarifa: number;
  percentualDespesa: number;
  descontoPix: number;
  bonusMicroPercent: number;
  placasPorMicro: number;
  coberturaAlvoMin: number;
  coberturaAlvoMax: number;
  maxAlternativas: number;
  /**
   * Margem ±% em torno do alvo (auditoria indigo) para encaixar até N propostas.
   * Ex.: 20 → aceita 80%–120% do alvo/faixa. Editável em /admin/configuracoes.
   */
  varianciaAlvoPct: number;
}

const DEFAULTS: CalcParams = {
  hsp: 5.21,
  performanceRate: 0.75,
  diasMes: 30.4,
  tarifa: 1.17,
  percentualDespesa: 30,
  descontoPix: 10,
  bonusMicroPercent: 5,
  placasPorMicro: 4,
  coberturaAlvoMin: 90,
  coberturaAlvoMax: 120,
  maxAlternativas: 6,
  varianciaAlvoPct: 20,
};

/** Clamp 0–50 (%). 0 = sem margem extra (faixa já expandida). */
export function sanitizeVarianciaAlvoPct(raw: unknown, fallback = 20): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(50, Math.max(0, Math.round(n * 10) / 10));
}

/** Fatores lo/hi a partir da margem % (20 → 0.8 / 1.2). */
export function fatoresVarianciaAlvo(pct: number): { baixo: number; alto: number } {
  const v = sanitizeVarianciaAlvoPct(pct) / 100;
  return { baixo: 1 - v, alto: 1 + v };
}

/**
 * Seed V3 (4a) — HSP/PR/tarifa aqui são fallback se admin não sobrescrever.
 * Strings/cabos: ver `kitEngine.estimarStringsInversor` (não duplicar neste objeto).
 */
const KEY = 'calc_params_v3';

export function getCalcParams(): CalcParams {
  const db = getV3Db();
  const row = db.prepare('SELECT valor_json FROM kits_regras WHERE chave = ?').get(KEY) as
    | { valor_json: string }
    | undefined;
  if (!row?.valor_json) {
    // seed
    db.prepare(
      `INSERT OR IGNORE INTO kits_regras (chave, valor_json, descricao)
       VALUES (?, ?, ?)`
    ).run(KEY, JSON.stringify(DEFAULTS), 'Parâmetros do motor de cálculo V3 (4a)');
    return { ...DEFAULTS };
  }
  try {
    const parsed = { ...DEFAULTS, ...JSON.parse(row.valor_json) } as CalcParams;
    parsed.varianciaAlvoPct = sanitizeVarianciaAlvoPct(parsed.varianciaAlvoPct, DEFAULTS.varianciaAlvoPct);
    return parsed;
  } catch {
    return { ...DEFAULTS };
  }
}

export function setCalcParams(partial: Partial<CalcParams>): CalcParams {
  const current = getCalcParams();
  const next: CalcParams = { ...current, ...partial };
  if (partial.varianciaAlvoPct != null) {
    next.varianciaAlvoPct = sanitizeVarianciaAlvoPct(partial.varianciaAlvoPct, current.varianciaAlvoPct);
  }
  const db = getV3Db();
  db.prepare(
    `INSERT INTO kits_regras (chave, valor_json, descricao) VALUES (?, ?, ?)
     ON CONFLICT(chave) DO UPDATE SET valor_json = excluded.valor_json`
  ).run(KEY, JSON.stringify(next), 'Parâmetros do motor de cálculo V3 (4a)');
  return next;
}

/** kWp → geração mensal (kWh) */
export function geracaoFromKwp(
  potenciaKwp: number,
  params: CalcParams,
  bonusMicro = false
): number {
  const fator = bonusMicro ? 1 + params.bonusMicroPercent / 100 : 1;
  return potenciaKwp * params.hsp * params.diasMes * params.performanceRate * fator;
}

/** geração mensal desejada → kWp necessário */
export function kwpFromGeracao(
  geracaoMensalKwh: number,
  params: CalcParams,
  bonusMicro = false
): number {
  const fator = bonusMicro ? 1 + params.bonusMicroPercent / 100 : 1;
  const den = params.hsp * params.diasMes * params.performanceRate * fator;
  if (den <= 0) return 0;
  return geracaoMensalKwh / den;
}

export function precificarCusto(custo: number, params: CalcParams) {
  const despesa = custo * (params.percentualDespesa / 100);
  const aVista = custo + despesa;
  const pix = aVista * (1 - params.descontoPix / 100);
  return {
    custo,
    despesa: Math.round(despesa * 100) / 100,
    aVista: Math.round(aVista * 100) / 100,
    pix: Math.round(pix * 100) / 100,
  };
}
