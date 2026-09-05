/**
 * Payback solar com Fio B (Lei 14.300) — Equatorial GO
 * Fonte: metodologia-payback-solar-fio-b-go.md
 *
 * TE/TUSD oficiais ANEEL; Fio B isolado = estimativa (30% do TUSD × fator tributário).
 */

/** TE + TUSD sem tributos (RH ANEEL 3.544/2025) — referência */
export const EQTL_GO_TE_KWH = 0.32414;
export const EQTL_GO_TUSD_KWH = 0.56767;

/** Fio B-base 2026 com tributos (estimativa: 30% TUSD × fator imposto) */
export const FIO_B_BASE_2026_COM_TRIBUTOS = 0.2234;

/** Ano-base do cronograma / tarifa do documento */
export const ANO_BASE_FIO_B = 2026;

export interface PaybackFioBInput {
  potenciaKwp: number;
  investimentoPix: number;
  /** Tarifa cheia com tributos (R$/kWh) — ano-base */
  tarifaCheia: number;
  /** HSP médio (kWh/m².dia) */
  hsp: number;
  performanceRate: number;
  diasMes?: number;
  /** % a.a. reajuste energia (ex.: 8.2) */
  reajusteEnergiaPct?: number;
  /** Fio B-base ano-base com tributos */
  fioBBase?: number;
  anosProjecao?: number;
  anoInicial?: number;
  /** Se informado, usa em vez de recalcular kWp×HSP×PR×dias×12 */
  geracaoAnualKwh?: number;
}

export interface PaybackFioBAno {
  ano: number;
  n: number;
  tarifaCheia: number;
  fioBEfetivo: number;
  pctFioB: number;
  custoSemSistema: number;
  custoComSistema: number;
  economiaAnual: number;
  economiaAcumulada: number;
  atingiuPayback: boolean;
}

export interface PaybackFioBResult {
  geracaoAnualKwh: number;
  geracaoMensalKwh: number;
  /** Série para o gráfico (horizonte `anosProjecao`) */
  serie: PaybackFioBAno[];
  paybackAno: number | null;
  paybackMeses: number | null;
  investimento: number;
  fioBEstimado: boolean;
  /** Economia acumulada em 25 anos (sempre calculada) */
  economia25Anos: number;
  /** Quanto pagaria sem geração em 25 anos (conta cheia) */
  gastoSemGeracao25Anos: number;
}

/** % do Fio B cobrado (não compensado) — Lei 14.300 Art. 27; pós-2028 = 90% (premissa) */
export function pctFioBCobrando(anoCalendario: number): number {
  if (anoCalendario <= 2023) return 0.15;
  if (anoCalendario === 2024) return 0.3;
  if (anoCalendario === 2025) return 0.45;
  if (anoCalendario === 2026) return 0.6;
  if (anoCalendario === 2027) return 0.75;
  return 0.9;
}

export function calcularPaybackFioB(input: PaybackFioBInput): PaybackFioBResult {
  const diasMes = input.diasMes ?? 30.4;
  const reajuste = (input.reajusteEnergiaPct ?? 8.2) / 100;
  const fioBBase = input.fioBBase ?? FIO_B_BASE_2026_COM_TRIBUTOS;
  const anosChart = input.anosProjecao ?? 10;
  const anosTotal = Math.max(anosChart, 25);
  const anoInicial = input.anoInicial ?? ANO_BASE_FIO_B;
  const investimento = Math.max(0, input.investimentoPix || 0);

  const geracaoMensal =
    input.geracaoAnualKwh != null && input.geracaoAnualKwh > 0
      ? input.geracaoAnualKwh / 12
      : input.potenciaKwp * input.hsp * input.performanceRate * diasMes;

  const geracaoAnual =
    input.geracaoAnualKwh != null && input.geracaoAnualKwh > 0
      ? input.geracaoAnualKwh
      : geracaoMensal * 12;

  const serieCompleta: PaybackFioBAno[] = [];
  let acumulada = 0;
  let gastoSem25 = 0;
  let paybackAno: number | null = null;
  let paybackMeses: number | null = null;
  let acumAntesDoCruzamento = 0;

  for (let i = 0; i < anosTotal; i++) {
    const ano = anoInicial + i;
    const n = ano - ANO_BASE_FIO_B;
    const fator = Math.pow(1 + reajuste, Math.max(0, n));
    const tarifaCheia = input.tarifaCheia * fator;
    const pct = pctFioBCobrando(ano);
    const fioBEfetivo = fioBBase * fator * pct;
    const custoSemSistema = tarifaCheia * geracaoAnual;
    const custoComSistema = fioBEfetivo * geracaoAnual;
    const economiaAnual = Math.max(0, custoSemSistema - custoComSistema);
    acumAntesDoCruzamento = acumulada;
    acumulada += economiaAnual;
    if (i < 25) gastoSem25 += custoSemSistema;

    const atingiu = investimento > 0 && acumulada >= investimento;
    if (atingiu && paybackAno == null) {
      paybackAno = ano;
      const falta = investimento - acumAntesDoCruzamento;
      const frac = economiaAnual > 0 ? falta / economiaAnual : 0;
      paybackMeses = Math.round((i + Math.min(1, Math.max(0, frac))) * 12 * 10) / 10;
    }

    serieCompleta.push({
      ano,
      n,
      tarifaCheia,
      fioBEfetivo,
      pctFioB: pct,
      custoSemSistema,
      custoComSistema,
      economiaAnual,
      economiaAcumulada: acumulada,
      atingiuPayback: atingiu,
    });
  }

  const row25 = serieCompleta[24];
  const economia25Anos = row25 ? row25.economiaAcumulada : acumulada;

  return {
    geracaoAnualKwh: geracaoAnual,
    geracaoMensalKwh: geracaoMensal,
    serie: serieCompleta.slice(0, anosChart),
    paybackAno,
    paybackMeses,
    investimento,
    fioBEstimado: true,
    economia25Anos,
    gastoSemGeracao25Anos: gastoSem25,
  };
}
