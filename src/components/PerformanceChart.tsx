import React, { useEffect, useRef, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';

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

const CHART_HEIGHT = 200;

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
  // Recharts gera IDs internos distintos no SSR vs client → hydration mismatch
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(true);
  }, []);

  return (
    <div ref={ref} className="pieng-chart-box w-full" style={{ height: CHART_HEIGHT, minHeight: CHART_HEIGHT }}>
      {!ready ? (
        <div className="w-full h-full bg-slate-50 rounded-lg animate-pulse" aria-hidden />
      ) : (
        <BarChart
          width={width}
          height={CHART_HEIGHT}
          data={chartData}
          margin={{ top: 8, right: 12, left: 4, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="nome" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200 no-print">
                    <p className="font-bold text-pieng-primary">{data.titulo}</p>
                    {tooltipType === 'geracao' ? (
                      <p className="text-sm">
                        Geração: <strong>{data.geracao} kWh/mês</strong>
                      </p>
                    ) : (
                      <>
                        <p className="text-sm">
                          Payback: <strong>{data.payback} meses</strong>
                        </p>
                        <p className="text-sm">
                          TIR: <strong>{data.tir}% ao ano</strong>
                        </p>
                      </>
                    )}
                    {data.isRecommended && (
                      <p className="text-xs text-pieng-success font-bold mt-1">⭐ Recomendado</p>
                    )}
                  </div>
                );
              }
              return null;
            }}
          />
          <Bar dataKey={dataKey} radius={[6, 6, 0, 0]} isAnimationActive={false}>
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
    nome: `Sistema ${index + 1}`,
    titulo: sistema.titulo,
    geracao: parseFloat(sistema.geracao.replace(' kWh', '').replace(',', '')) || 0,
    payback: parseFloat(sistema.payback.replace(' meses', '').replace(',', '.')) || 0,
    tir: parseFloat(sistema.tir.replace('%', '').replace(',', '.')) || 0,
    isRecommended: sistema.isRecommended || false,
  }));

  const COLORS = ['#3366CC', '#FF6B35', '#2ecc71', '#f39c12', '#e74c3c'];
  const getBarColor = (index: number, isRecommended: boolean) =>
    isRecommended ? '#2ecc71' : COLORS[index % COLORS.length];

  return (
    <section className="pieng-card pieng-performance-charts p-8 mb-8">
      <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
        📊 Análise Comparativa de Performance
      </h3>

      <div className="pieng-charts-grid grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h4 className="text-base font-bold mb-4 text-pieng-primary">Geração Mensal (kWh)</h4>
          <PerformanceBarChart
            dataKey="geracao"
            chartData={chartData}
            getBarColor={getBarColor}
            tooltipType="geracao"
          />
        </div>

        <div>
          <h4 className="text-base font-bold mb-4 text-pieng-primary">Retorno do Investimento (meses)</h4>
          <PerformanceBarChart
            dataKey="payback"
            chartData={chartData}
            getBarColor={getBarColor}
            tooltipType="payback"
          />
          <p className="text-xs text-pieng-muted text-center mt-2">
            💡 Quanto menor o payback, mais rápido você recupera o investimento
          </p>
        </div>
      </div>

      <div className="mt-6 p-4 bg-pieng-light rounded-lg">
        <div className="flex flex-wrap gap-4 justify-center text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#2ecc71' }} />
            <span>Sistema Recomendado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-pieng-primary" />
            <span>Outras Opções</span>
          </div>
        </div>
      </div>
    </section>
  );
};
