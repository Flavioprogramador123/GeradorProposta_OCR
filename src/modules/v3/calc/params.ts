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
  maxAlternativas: 3,
};

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
    return { ...DEFAULTS, ...JSON.parse(row.valor_json) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function setCalcParams(partial: Partial<CalcParams>): CalcParams {
  const current = getCalcParams();
  const next = { ...current, ...partial };
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
