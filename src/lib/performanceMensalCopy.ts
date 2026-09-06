import { formatBRL } from '@/lib/formatBRL';

/** Faixa típica de rendimento do sistema (PR) — cliente vê % de desempenho, sem fórmula. */
export const PR_FAIXA_MIN = 0.72;
export const PR_FAIXA_MAX = 0.8;

export interface PerformanceMensalInput {
  geracaoKwh: number;
  coberturaPct: number;
  economiaMensal: number;
  paybackTexto: string;
  tirTexto: string;
  /** R$/kWh usado no cálculo */
  tarifaKwh: number;
  /** PR com que a geração do card foi calculada (default = faixa máx.) */
  performanceRateRef?: number;
  prMin?: number;
  prMax?: number;
}

export interface PerformanceMensalView {
  titulo: string;
  geracaoFaixa: string;
  cobertura: string;
  rendimento: string;
  abatimentoMensal: string;
  abatimentoAnual: string;
  tarifa: string;
  payback: string;
  tir: string;
  /** HTML multilinha para templates */
  html: string;
}

export function parseMoneyLike(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  let s = String(value ?? '')
    .replace(/R\$\s?/gi, '')
    .replace(/\s/g, '')
    .trim();
  if (!s) return 0;
  if (s.includes(',') && s.includes('.')) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (s.includes(',')) {
    s = s.replace(',', '.');
  }
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

export function parseGeracaoKwh(geracao: unknown): number {
  if (typeof geracao === 'number') return geracao;
  const n = parseFloat(String(geracao ?? '').replace(/[^\d,.-]/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

export function parseCoberturaPct(cobertura: unknown): number {
  if (typeof cobertura === 'number') return cobertura;
  const n = parseFloat(String(cobertura ?? '').replace('%', '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

export function parseTarifaKwh(tarifa: unknown): number {
  if (typeof tarifa === 'number' && Number.isFinite(tarifa)) return tarifa;
  return parseMoneyLike(tarifa);
}

/**
 * Texto enriquecido da caixa Performance (card cliente).
 * Inclui faixa 72–80%, abatimento mensal/anual e tarifa — sem markup/custo/fórmulas internas.
 * Geração de referência (com bônus micro +5% se ativo) escala pela faixa PR;
 * abatimento = geração da faixa × tarifa.
 */
export function buildPerformanceMensalView(input: PerformanceMensalInput): PerformanceMensalView {
  const prMin = input.prMin ?? PR_FAIXA_MIN;
  const prMax = input.prMax ?? PR_FAIXA_MAX;
  const prRef =
    input.performanceRateRef && input.performanceRateRef > 0
      ? input.performanceRateRef
      : prMax;

  const gRef = Math.max(0, input.geracaoKwh || 0);
  const gMin = Math.round(gRef * (prMin / prRef));
  const gMax = Math.round(gRef * (prMax / prRef));

  const tarifa = input.tarifaKwh > 0 ? input.tarifaKwh : 0;
  const econRef = input.economiaMensal > 0 ? input.economiaMensal : gRef * tarifa;
  const econMin = tarifa > 0 ? gMin * tarifa : econRef * (prMin / prRef);
  const econMax = tarifa > 0 ? gMax * tarifa : econRef * (prMax / prRef);
  const anualMin = econMin * 12;
  const anualMax = econMax * 12;

  const cobertura = Math.round(input.coberturaPct || 0);
  const geracaoFaixa =
    gMin === gMax
      ? `${gMax.toLocaleString('pt-BR')} kWh/mês`
      : `${gMin.toLocaleString('pt-BR')} a ${gMax.toLocaleString('pt-BR')} kWh/mês`;

  const abatimentoMensal =
    Math.abs(econMax - econMin) < 0.5
      ? formatBRL(econMax)
      : `${formatBRL(econMin)} a ${formatBRL(econMax)}`;

  const abatimentoAnual =
    Math.abs(anualMax - anualMin) < 1
      ? formatBRL(anualMax)
      : `${formatBRL(anualMin)} a ${formatBRL(anualMax)}`;

  const rendimento = `${Math.round(prMin * 100)}% a ${Math.round(prMax * 100)}%`;
  const tarifaTxt = tarifa > 0 ? `${formatBRL(tarifa)}/kWh` : '—';

  const titulo = 'Desempenho e abatimento na conta';
  const payback = input.paybackTexto;
  const tir = input.tirTexto.includes('ano') ? input.tirTexto : `${input.tirTexto} ao ano`;

  const html = [
    `<strong>${titulo}</strong>`,
    `<div style="margin-top:8px"><strong>Geração estimada média entre:</strong><br><span style="white-space:nowrap">${geracaoFaixa}</span></div>`,
    `<div style="margin-top:8px"><strong>Abatimento mensal na conta de:</strong><br><span style="white-space:nowrap">${abatimentoMensal}</span></div>`,
    `<div style="margin-top:8px"><strong>Abatimento anual estimado de:</strong><br><span style="white-space:nowrap">${abatimentoAnual}</span></div>`,
    `<div style="margin-top:10px;padding-top:8px;border-top:1px solid #bbf7d0"><div><strong>Payback:</strong> <span style="white-space:nowrap">${payback}</span></div><div><strong>TIR:</strong> <span style="white-space:nowrap">${tir}</span></div></div>`,
  ].join('\n');

  return {
    titulo,
    geracaoFaixa,
    cobertura: `${cobertura}% do consumo`,
    rendimento,
    abatimentoMensal,
    abatimentoAnual,
    tarifa: tarifaTxt,
    payback,
    tir,
    html,
  };
}

/** Escala geração (kWh) da PR de referência para a faixa pessimista/otimista (72–80%). */
export function escalaGeracaoPorFaixaPr(
  geracaoRef: number,
  performanceRateRef: number,
  prMin = PR_FAIXA_MIN,
  prMax = PR_FAIXA_MAX
): { pessimista: number; otimista: number } {
  const gRef = Math.max(0, geracaoRef || 0);
  const prRef = performanceRateRef > 0 ? performanceRateRef : prMax;
  return {
    pessimista: Math.round(gRef * (prMin / prRef)),
    otimista: Math.round(gRef * (prMax / prRef)),
  };
}
