import React, { useEffect, useState } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { PiengChartKpi, PiengChartKpiGrid, PiengChartSection } from '@/components/PiengChartSection';
import { calcularPaybackFioB, type PaybackFioBResult } from '@/lib/paybackFioB';
import { formatBRL } from '@/lib/formatBRL';
import { PIENG_CHART } from '@/lib/piengChartTheme';

interface PaybackFioBChartProps {
  potenciaKwp: number;
  investimentoPix: number;
  tarifaCheia: number;
  hsp: number;
  performanceRate?: number;
  reajusteEnergiaPct?: number;
  geracaoAnualKwh?: number;
  anosProjecao?: number;
}

function useReady() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(true);
  }, []);
  return ready;
}

function formatMil(v: number): string {
  if (v >= 1000) return `R$ ${(v / 1000).toFixed(0)}k`;
  return formatBRL(v);
}

const LEGEND_LABELS: Record<string, string> = {
  economiaAnual: 'Economia com solar',
  acumulada: 'Economia acumulada',
};

function htmlKpi(label: string, value: string, valueColor = '#1e293b'): string {
  return `<div style="background:${PIENG_CHART.surface};border:1px solid ${PIENG_CHART.border};border-radius:10px;padding:10px 12px;">
    <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.04em;color:${PIENG_CHART.muted};font-weight:600;">${label}</div>
    <div style="font-size:1.1rem;font-weight:700;color:${valueColor};margin-top:2px;">${value}</div>
  </div>`;
}

export function PaybackFioBChart(props: PaybackFioBChartProps) {
  const ready = useReady();
  const {
    potenciaKwp,
    investimentoPix,
    tarifaCheia,
    hsp,
    performanceRate = 0.78,
    reajusteEnergiaPct = 8.2,
    geracaoAnualKwh,
    anosProjecao = 10,
  } = props;

  if (!potenciaKwp || potenciaKwp <= 0 || !investimentoPix || investimentoPix <= 0) {
    return null;
  }

  const result: PaybackFioBResult = calcularPaybackFioB({
    potenciaKwp,
    investimentoPix,
    tarifaCheia: tarifaCheia > 0 ? tarifaCheia : 1.17,
    hsp: hsp > 0 ? hsp : 5.3,
    performanceRate,
    reajusteEnergiaPct,
    geracaoAnualKwh,
    anosProjecao,
  });

  const data = result.serie.map((row) => ({
    ano: String(row.ano),
    economiaAnual: Math.round(row.economiaAnual),
    acumulada: Math.round(row.economiaAcumulada),
  }));

  const potTxt = potenciaKwp.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const paybackTxt =
    result.paybackMeses != null
      ? result.paybackMeses < 24
        ? `~${result.paybackMeses.toFixed(0)} meses`
        : `~${(result.paybackMeses / 12).toFixed(1)} anos`
      : 'além do horizonte';

  return (
    <PiengChartSection
      title="Economia e payback ao longo dos anos"
      subtitle={`Sistema ${potTxt} kWp · investimento PIX ${formatBRL(investimentoPix)} · payback estimado ${paybackTxt}`}
      className="pieng-payback-fio-b"
      disclaimer="Projeção com reajuste de energia e cronograma do Fio B (Lei 14.300). O valor do Fio B usado é estimado (parcela da TUSD Equatorial GO)."
    >
      <PiengChartKpiGrid colsClassName="grid-cols-1 sm:grid-cols-2">
        <PiengChartKpi
          label="Economia em 25 anos"
          value={formatBRL(result.economia25Anos)}
          valueClassName="text-emerald-700"
        />
        <PiengChartKpi
          label="Payback estimado"
          value={paybackTxt}
          valueClassName="text-sky-700"
        />
      </PiengChartKpiGrid>

      <div
        className="pieng-chart-plot w-full rounded-lg border border-slate-100 bg-slate-50/50 px-1 pt-2"
        style={{ height: PIENG_CHART.height }}
      >
        {ready ? (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={PIENG_CHART.margin}>
              <CartesianGrid strokeDasharray="3 3" stroke={PIENG_CHART.grid} vertical={false} />
              <XAxis
                dataKey="ano"
                tick={{ fontSize: 12, fill: PIENG_CHART.muted }}
                axisLine={{ stroke: PIENG_CHART.grid }}
                tickLine={false}
              />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: PIENG_CHART.tick, fill: PIENG_CHART.muted }}
                tickFormatter={(v) => formatMil(Number(v))}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: PIENG_CHART.tick, fill: PIENG_CHART.muted }}
                tickFormatter={(v) => formatMil(Number(v))}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const anual = payload.find((p) => p.dataKey === 'economiaAnual');
                  const acum = payload.find((p) => p.dataKey === 'acumulada');
                  return (
                    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-sm no-print">
                      <p className="font-bold text-slate-800 mb-1">{label}</p>
                      {anual && (
                        <p>
                          Economia com solar:{' '}
                          <strong>{formatBRL(Number(anual.value))}</strong>
                        </p>
                      )}
                      {acum && (
                        <p>
                          Acumulada: <strong>{formatBRL(Number(acum.value))}</strong>
                        </p>
                      )}
                    </div>
                  );
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: 12, color: PIENG_CHART.muted }}
                formatter={(value) => LEGEND_LABELS[String(value)] || String(value)}
              />
              <ReferenceLine
                yAxisId="right"
                y={investimentoPix}
                stroke={PIENG_CHART.invest}
                strokeDasharray="6 4"
                label={{
                  value: 'Investimento PIX',
                  position: 'insideTopRight',
                  fill: PIENG_CHART.invest,
                  fontSize: 11,
                }}
              />
              <Bar
                yAxisId="left"
                dataKey="economiaAnual"
                name="economiaAnual"
                fill={PIENG_CHART.bar}
                radius={PIENG_CHART.barRadius}
                maxBarSize={36}
                isAnimationActive={false}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="acumulada"
                name="acumulada"
                stroke={PIENG_CHART.accent}
                strokeWidth={3}
                dot={{ r: 3, fill: PIENG_CHART.accent }}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className="w-full h-full bg-slate-50 rounded-lg animate-pulse" aria-hidden />
        )}
      </div>
    </PiengChartSection>
  );
}

/** HTML estático (barras agrupadas + linha SVG) para template / PDF */
export function generatePaybackFioBChartHtml(props: PaybackFioBChartProps): string {
  const result = calcularPaybackFioB({
    potenciaKwp: props.potenciaKwp,
    investimentoPix: props.investimentoPix,
    tarifaCheia: props.tarifaCheia > 0 ? props.tarifaCheia : 1.17,
    hsp: props.hsp > 0 ? props.hsp : 5.3,
    performanceRate: props.performanceRate ?? 0.78,
    reajusteEnergiaPct: props.reajusteEnergiaPct ?? 8.2,
    geracaoAnualKwh: props.geracaoAnualKwh,
    anosProjecao: props.anosProjecao ?? 10,
  });

  if (!result.serie.length) return '';

  const W = 760;
  const H = 280;
  const padL = 48;
  const padR = 48;
  const padT = 28;
  const padB = 36;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const maxBar = Math.max(...result.serie.map((s) => s.economiaAnual), 1);
  const maxLine = Math.max(
    ...result.serie.map((s) => s.economiaAcumulada),
    result.investimento,
    1
  );
  const n = result.serie.length;
  const gap = plotW / n;

  const bars = result.serie
    .map((row, i) => {
      const bh = (row.economiaAnual / maxBar) * plotH;
      const x = padL + i * gap + gap * 0.2;
      const bw = gap * 0.5;
      const y = padT + plotH - bh;
      return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" fill="${PIENG_CHART.bar}" rx="4"/>`;
    })
    .join('');

  const points = result.serie
    .map((row, i) => {
      const x = padL + i * gap + gap * 0.45;
      const y = padT + plotH - (row.economiaAcumulada / maxLine) * plotH;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const invY = padT + plotH - (result.investimento / maxLine) * plotH;
  const labels = result.serie
    .map((row, i) => {
      const x = padL + i * gap + gap * 0.45;
      return `<text x="${x.toFixed(1)}" y="${H - 10}" text-anchor="middle" font-size="11" fill="${PIENG_CHART.muted}">${row.ano}</text>`;
    })
    .join('');

  const potTxt = props.potenciaKwp.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const paybackTxt =
    result.paybackMeses != null
      ? result.paybackMeses < 24
        ? `~${result.paybackMeses.toFixed(0)} meses`
        : `~${(result.paybackMeses / 12).toFixed(1)} anos`
      : 'além do horizonte';

  return `
<section class="pieng-chart-section pieng-payback-fio-b" style="margin:24px 0;padding:22px 18px 16px;background:#fff;border:1px solid ${PIENG_CHART.border};border-radius:16px;box-shadow:0 4px 20px rgba(15,23,42,.06);">
  <h3 style="margin:0 0 4px;font-size:1.25rem;color:${PIENG_CHART.text};font-weight:700;">Economia e payback ao longo dos anos</h3>
  <p style="margin:0 0 14px;font-size:0.9rem;color:${PIENG_CHART.muted};">Sistema ${potTxt} kWp · PIX ${formatBRL(result.investimento)} · payback estimado ${paybackTxt}</p>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;margin-bottom:14px;">
    ${htmlKpi('Economia em 25 anos', formatBRL(result.economia25Anos), '#047857')}
    ${htmlKpi('Payback estimado', paybackTxt, '#0369a1')}
  </div>
  <div style="display:flex;flex-wrap:wrap;gap:14px;font-size:12px;color:${PIENG_CHART.muted};margin-bottom:8px;">
    <span><span style="display:inline-block;width:12px;height:12px;background:${PIENG_CHART.bar};border-radius:2px;vertical-align:middle;margin-right:4px;"></span>Economia com solar</span>
    <span><span style="display:inline-block;width:16px;height:3px;background:${PIENG_CHART.accent};vertical-align:middle;margin-right:4px;"></span>Economia acumulada</span>
    <span><span style="display:inline-block;width:16px;height:0;border-top:2px dashed ${PIENG_CHART.invest};vertical-align:middle;margin-right:4px;"></span>Investimento PIX</span>
  </div>
  <div style="background:${PIENG_CHART.surface};border:1px solid ${PIENG_CHART.border};border-radius:12px;padding:8px 4px;">
    <svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:900px;height:auto;display:block;margin:0 auto;" role="img" aria-label="Economia anual e acumulada">
      <line x1="${padL}" y1="${invY.toFixed(1)}" x2="${W - padR}" y2="${invY.toFixed(1)}" stroke="${PIENG_CHART.invest}" stroke-dasharray="6 4" stroke-width="1.5"/>
      ${bars}
      <polyline fill="none" stroke="${PIENG_CHART.accent}" stroke-width="3" points="${points}"/>
      ${points
        .split(' ')
        .map((p) => {
          const [x, y] = p.split(',');
          return `<circle cx="${x}" cy="${y}" r="3.5" fill="${PIENG_CHART.accent}"/>`;
        })
        .join('')}
      ${labels}
    </svg>
  </div>
  <p style="margin:12px 0 0;font-size:0.75rem;color:${PIENG_CHART.hint};line-height:1.4;">
    Projeção com reajuste de energia e cronograma do Fio B (Lei 14.300). O valor do Fio B usado é estimado (parcela da TUSD Equatorial GO).
  </p>
</section>`;
}
