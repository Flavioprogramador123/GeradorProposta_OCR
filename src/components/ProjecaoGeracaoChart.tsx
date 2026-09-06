import React, { useEffect, useState } from 'react';
import { PiengChartKpi, PiengChartKpiGrid, PiengChartSection } from '@/components/PiengChartSection';
import { PIENG_CHART } from '@/lib/piengChartTheme';
import {
  PR_FAIXA_MAX,
  PR_FAIXA_MIN,
  escalaGeracaoPorFaixaPr,
} from '@/lib/performanceMensalCopy';
import {
  DIAS_POR_MES_CRESESB,
  MESES_ABREV,
  getSolarDataByCidade,
  resolveSolarCidadeKey,
} from '@/lib/solarProjection';

interface ProjecaoGeracaoChartProps {
  potenciaKwp: number;
  cidade?: string;
  performanceRate?: number;
}

/** Portrait mobile estreito: esconde valores; landscape/desktop/PDF mostra tudo. */
function useMostrarValoresCompletos() {
  const [completo, setCompleto] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px), (orientation: landscape)');
    const mqPrint = window.matchMedia('print');
    const sync = () => {
      const pdfMode = document.body.classList.contains('proposta-pdf-mode');
      setCompleto(mq.matches || mqPrint.matches || pdfMode);
    };
    sync();
    mq.addEventListener('change', sync);
    mqPrint.addEventListener('change', sync);
    window.addEventListener('beforeprint', sync);
    window.addEventListener('afterprint', sync);
    const obs = new MutationObserver(sync);
    obs.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => {
      mq.removeEventListener('change', sync);
      mqPrint.removeEventListener('change', sync);
      window.removeEventListener('beforeprint', sync);
      window.removeEventListener('afterprint', sync);
      obs.disconnect();
    };
  }, []);

  return completo;
}

/** Gráfico sazonal compacto (barras CSS) — mesma lógica do HTML do template. */
export function ProjecaoGeracaoChart({
  potenciaKwp,
  cidade,
  performanceRate = 0.78,
}: ProjecaoGeracaoChartProps) {
  const [mesAtivo, setMesAtivo] = useState<number | null>(null);
  const mostrarCompleto = useMostrarValoresCompletos();

  useEffect(() => {
    if (mostrarCompleto) setMesAtivo(null);
  }, [mostrarCompleto]);

  if (!potenciaKwp || potenciaKwp <= 0) return null;

  const cidadeKey = resolveSolarCidadeKey(cidade);
  const solar = getSolarDataByCidade(cidadeKey) || getSolarDataByCidade('goiania-go');
  if (!solar) return null;

  const geracao = solar.hspMensal.map((hsp, i) =>
    Math.round(hsp * potenciaKwp * performanceRate * DIAS_POR_MES_CRESESB[i])
  );
  const maxVal = Math.max(...geracao, 1);
  const anual = geracao.reduce((a, b) => a + b, 0);
  const media = Math.round(anual / geracao.length);
  const { pessimista, otimista } = escalaGeracaoPorFaixaPr(media, performanceRate);
  const mediaPct = Math.max(0, Math.min(100, (media / maxVal) * 100));
  const potTxt = potenciaKwp.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const pctMin = Math.round(PR_FAIXA_MIN * 100);
  const pctMax = Math.round(PR_FAIXA_MAX * 100);

  return (
    <PiengChartSection
      title="Projeção de geração ao longo do ano"
      subtitle={`Sistema ${potTxt} kWp · ${solar.cidade} · kWh/mês`}
      className="pieng-projecao-geracao"
      disclaimer={`Estimativa sazonal com expectativa de desempenho entre ${pctMin}% e ${pctMax}%. A geração real varia com o clima, as condições do local, a orientação do telhado em relação ao sol, a limpeza dos módulos e outros fatores.`}
    >
      <PiengChartKpiGrid>
        <PiengChartKpi label="Anual estimada" value={`${anual.toLocaleString('pt-BR')} kWh`} />
        <PiengChartKpi label="Média" value={`${media.toLocaleString('pt-BR')} kWh/mês`} />
        <PiengChartKpi
          label="Pessimista"
          value={`${pessimista.toLocaleString('pt-BR')} kWh/mês`}
        />
        <PiengChartKpi
          label="Otimista"
          value={`${otimista.toLocaleString('pt-BR')} kWh/mês`}
        />
      </PiengChartKpiGrid>

      <div className="pieng-chart-plot rounded-lg border border-slate-100 bg-slate-50/50 px-2 pt-4 pb-2 sm:px-4">
        {!mostrarCompleto && (
          <p className="text-center text-xs text-slate-500 mb-3 md:hidden">
            {mesAtivo == null ? (
              <>
                Média {media.toLocaleString('pt-BR')} kWh · toque em um mês para ver o valor
              </>
            ) : (
              <>
                <strong className="text-slate-700">{MESES_ABREV[mesAtivo]}:</strong>{' '}
                <span className="tabular-nums font-semibold text-slate-800">
                  {geracao[mesAtivo].toLocaleString('pt-BR')} kWh
                </span>
              </>
            )}
          </p>
        )}

        <div className="w-full max-w-5xl mx-auto">
          <div
            className={`gap-1.5 sm:gap-3 md:gap-4 mb-1 ${
              mostrarCompleto ? 'flex' : 'hidden'
            }`}
          >
            {geracao.map((kwh, i) => (
              <div
                key={`v-${MESES_ABREV[i]}`}
                className="flex-1 min-w-0 text-center text-[10px] sm:text-xs text-slate-500 leading-none font-medium tabular-nums"
              >
                {kwh.toLocaleString('pt-BR')}
              </div>
            ))}
          </div>

          <div className="relative h-[140px] sm:h-[180px] md:h-[200px]">
            <div
              className="absolute left-0 right-0 z-10 pointer-events-none"
              style={{ bottom: `${mediaPct}%` }}
              aria-hidden
            >
              <div
                className="w-full border-t-2 border-dashed"
                style={{ borderColor: PIENG_CHART.accent }}
              />
              <span
                className="absolute right-0 -translate-y-full mb-0.5 text-[10px] sm:text-xs font-semibold tabular-nums px-1 rounded bg-slate-50/90"
                style={{ color: PIENG_CHART.accent }}
              >
                Média {media.toLocaleString('pt-BR')}
              </span>
            </div>

            <div className="flex items-end h-full gap-1.5 sm:gap-3 md:gap-4">
              {geracao.map((kwh, i) => {
                const pct = Math.max(6, Math.round((kwh / maxVal) * 100));
                const isPeak = kwh === maxVal;
                const selecionado = !mostrarCompleto && mesAtivo === i;
                return (
                  <button
                    key={MESES_ABREV[i]}
                    type="button"
                    className="flex-1 min-w-0 h-full flex items-end justify-center border-0 bg-transparent p-0 cursor-pointer touch-manipulation"
                    aria-label={`${MESES_ABREV[i]}: ${kwh.toLocaleString('pt-BR')} kWh`}
                    aria-pressed={selecionado}
                    onClick={() => {
                      if (mostrarCompleto) return;
                      setMesAtivo((prev) => (prev === i ? null : i));
                    }}
                  >
                    <div
                      title={`${MESES_ABREV[i]}: ${kwh.toLocaleString('pt-BR')} kWh`}
                      className={`w-[90%] sm:w-[85%] max-w-[36px] sm:max-w-[52px] md:max-w-[72px] rounded-t transition-opacity ${
                        selecionado ? 'ring-2 ring-offset-1 ring-sky-400 opacity-100' : ''
                      } ${
                        !mostrarCompleto && mesAtivo != null && mesAtivo !== i
                          ? 'opacity-45'
                          : ''
                      }`}
                      style={{
                        height: `${pct}%`,
                        background: isPeak || selecionado ? PIENG_CHART.accent : PIENG_CHART.bar,
                      }}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-1.5 sm:gap-3 md:gap-4 mt-1.5">
            {MESES_ABREV.map((mes, i) => (
              <button
                key={mes}
                type="button"
                className={`flex-1 min-w-0 text-center text-[10px] sm:text-xs font-semibold border-0 bg-transparent p-0 cursor-pointer touch-manipulation ${
                  !mostrarCompleto && mesAtivo === i ? 'text-sky-600' : 'text-slate-600'
                }`}
                onClick={() => {
                  if (mostrarCompleto) return;
                  setMesAtivo((prev) => (prev === i ? null : i));
                }}
              >
                {mes}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mt-3 text-xs text-slate-500 justify-center sm:justify-start">
          <span className="inline-flex items-center gap-1.5">
            <span
              className="inline-block w-3 h-3 rounded-sm"
              style={{ background: PIENG_CHART.bar }}
            />
            Geração mensal
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="inline-block w-5 border-t-2 border-dashed"
              style={{ borderColor: PIENG_CHART.accent }}
            />
            Média ({media.toLocaleString('pt-BR')} kWh)
          </span>
          {mostrarCompleto && (
            <span className="text-slate-400">
              Pessimista {pessimista.toLocaleString('pt-BR')} · Otimista{' '}
              {otimista.toLocaleString('pt-BR')} kWh/mês
            </span>
          )}
        </div>
      </div>
    </PiengChartSection>
  );
}
