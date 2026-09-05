/**
 * Tokens visuais compartilhados pelos gráficos da proposta (React + HTML).
 * Mantém Performance, Geração sazonal e Payback Fio B no mesmo padrão.
 */
export const PIENG_CHART = {
  bar: '#16a34a',
  barMuted: '#86efac',
  accent: '#0ea5e9',
  primary: '#3366CC',
  recommended: '#16a34a',
  other: '#64748b',
  invest: '#dc2626',
  grid: '#e2e8f0',
  text: '#1e293b',
  muted: '#64748b',
  hint: '#94a3b8',
  surface: '#f8fafc',
  border: '#e2e8f0',
  tick: 11,
  height: 280,
  heightSm: 240,
  barRadius: [6, 6, 0, 0] as [number, number, number, number],
  margin: { top: 8, right: 12, left: 4, bottom: 4 },
} as const;

export const PIENG_CHART_SYSTEM_COLORS = [
  PIENG_CHART.primary,
  '#0ea5e9',
  '#16a34a',
  '#f59e0b',
  '#6366f1',
] as const;
