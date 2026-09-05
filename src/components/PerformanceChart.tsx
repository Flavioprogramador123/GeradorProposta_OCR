import React, { useEffect, useRef, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import { PiengChartKpi, PiengChartKpiGrid, PiengChartSection } from '@/components/PiengChartSection';
import { PIENG_CHART, PIENG_CHART_SYSTEM_COLORS } from '@/lib/piengChartTheme';

interface Sistema {
  titulo: string;
  potencia: string;
  geracao: string;
  cobertura: string;
  payback: string;
  tir: string;
  isRecommended?: boolean;
}

interface PerformanceChartProps {
  sistemas: Sistema[];
}

const CHART_HEIGHT = PIENG_CHART.heightSm;

function useChartWidth(fallback = 420) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(fallback);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => {
      const next = el.clientWidth || fallback;
      if (next > 0) setWidth(next);
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener('resize', update);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [fallback]);

  return { ref, width };
}

interface PerformanceBarChartProps {
  dataKey: 'geracao' | 'payback';
  chartData: Array<{
    nome: string;
    titulo: string;
    geracao: number;
    payback: number;
    tir: number;
    isRecommended: boolean;
  }>;
  getBarColor: (index: number, isRecommended: boolean) => string;
  tooltipType: 'geracao' | 'payback';
}

const PerformanceBarChart: React.FC<PerformanceBarChartProps> = ({
  dataKey,
  chartData,
  getBarColor,
  tooltipType,
}) => {
  const { ref, width } = useChartWidth();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(true);
  }, []);

  return (
    <div
      ref={ref}
      className="pieng-chart-box w-full rounded-lg border border-slate-100 bg-slate-50/50"
      style={{ height: CHART_HEIGHT, minHeight: CHART_HEIGHT }}
    >
      {!ready ? (
        <div className="w-full h-full bg-slate-50 rounded-lg animate-pulse" aria-hidden />
      ) : (
        <BarChart
          width={width}
          height={CHART_HEIGHT}
          data={chartData}
          margin={PIENG_CHART.margin}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={PIENG_CHART.grid} vertical={false} />
          <XAxis
            dataKey="nome"
            tick={{ fontSize: PIENG_CHART.tick, fill: PIENG_CHART.muted }}
            axisLine={{ stroke: PIENG_CHART.grid }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: PIENG_CHART.tick, fill: PIENG_CHART.muted }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <div className="bg-white p-3 rounded-lg shadow-lg border border-slate-200 no-print text-sm">
                    <p className="font-bold text-slate-800 mb-1">{data.titulo}</p>
                    {tooltipType === 'geracao' ? (
                      <p>
                        Geração: <strong>{data.geracao} kWh/mês</strong>
                      </p>
                    ) : (
                      <>
                        <p>
                          Payback: <strong>{data.payback} meses</strong>
                        </p>
                        <p>
                          TIR: <strong>{data.tir}% ao ano</strong>
                        </p>
                      </>
                    )}
                    {data.isRecommended && (
                      <p className="text-xs text-emerald-700 font-semibold mt-1">Recomendado</p>
                    )}
                  </div>
                );
              }
              return null;
            }}
          />
          <Bar dataKey={dataKey} radius={PIENG_CHART.barRadius} isAnimationActive={false} maxBarSize={48}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(index, entry.isRecommended)} />
            ))}
          </Bar>
        </BarChart>
      )}
    </div>
  );
};

export const PerformanceChart: React.FC<PerformanceChartProps> = ({ sistemas }) => {
  const chartData = sistemas.map((sistema, index) => ({
    nome: `Opção ${index + 1}`,
    titulo: sistema.titulo,
    geracao: parseFloat(sistema.geracao.replace(' kWh', '').replace(',', '')) || 0,
    payback: parseFloat(sistema.payback.replace(' meses', '').replace(',', '.')) || 0,
    tir: parseFloat(sistema.tir.replace('%', '').replace(',', '.')) || 0,
    isRecommended: sistema.isRecommended || false,
  }));

  const getBarColor = (index: number, isRecommended: boolean) =>
    isRecommended
      ? PIENG_CHART.recommended
      : PIENG_CHART_SYSTEM_COLORS[index % PIENG_CHART_SYSTEM_COLORS.length];

  const bestGeracao = chartData.reduce(
    (best, row) => (row.geracao > best.geracao ? row : best),
    chartData[0]
  );
  const bestPayback = chartData.reduce(
    (best, row) => (row.payback > 0 && (best.payback <= 0 || row.payback < best.payback) ? row : best),
    chartData[0]
  );

  if (!chartData.length) return null;

  return (
    <PiengChartSection
      title="Análise comparativa de performance"
      subtitle={`${chartData.length} ${chartData.length > 1 ? 'opções' : 'opção'} · geração mensal e retorno do investimento`}
      className="pieng-performance-charts"
      disclaimer="Comparativo entre as opções desta proposta. Quanto menor o payback, mais rápido o retorno do investimento."
    >
      <PiengChartKpiGrid colsClassName="grid-cols-1 sm:grid-cols-2">
        <PiengChartKpi
          label="Maior geração"
          value={
            bestGeracao
              ? `${bestGeracao.nome} · ${bestGeracao.geracao.toLocaleString('pt-BR')} kWh`
              : '—'
          }
        />
        <PiengChartKpi
          label="Menor payback"
          value={
            bestPayback
              ? `${bestPayback.nome} · ${bestPayback.payback.toLocaleString('pt-BR')} meses`
              : '—'
          }
        />
      </PiengChartKpiGrid>

      <div className="pieng-charts-grid grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h4 className="text-sm font-semibold text-slate-700 mb-3 m-0">Geração mensal (kWh)</h4>
          <PerformanceBarChart
            dataKey="geracao"
            chartData={chartData}
            getBarColor={getBarColor}
            tooltipType="geracao"
          />
        </div>

        <div>
          <h4 className="text-sm font-semibold text-slate-700 mb-3 m-0">
            Retorno do investimento (meses)
          </h4>
          <PerformanceBarChart
            dataKey="payback"
            chartData={chartData}
            getBarColor={getBarColor}
            tooltipType="payback"
          />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-4 justify-start text-sm text-slate-600">
        <div className="flex items-center gap-2">
          <span
            className="inline-block w-3.5 h-3.5 rounded-sm"
            style={{ backgroundColor: PIENG_CHART.recommended }}
          />
          <span>Sistema recomendado</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="inline-block w-3.5 h-3.5 rounded-sm"
            style={{ backgroundColor: PIENG_CHART.primary }}
          />
          <span>Demais opções</span>
        </div>
      </div>
    </PiengChartSection>
  );
};
