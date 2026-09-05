import React from 'react';

interface PiengChartSectionProps {
  title: string;
  subtitle?: string;
  className?: string;
  children: React.ReactNode;
  disclaimer?: React.ReactNode;
}

/** Shell padronizado dos blocos de gráfico na proposta. */
export function PiengChartSection({
  title,
  subtitle,
  className = '',
  children,
  disclaimer,
}: PiengChartSectionProps) {
  return (
    <section className={`pieng-card pieng-chart-section p-6 mb-8 ${className}`.trim()}>
      <h3 className="pieng-chart-title m-0 mb-1 text-xl font-bold text-slate-800">{title}</h3>
      {subtitle ? (
        <p className="pieng-chart-subtitle m-0 mb-4 text-sm text-slate-500">{subtitle}</p>
      ) : (
        <div className="mb-4" />
      )}
      {children}
      {disclaimer ? (
        <p className="pieng-chart-disclaimer m-0 mt-4 text-xs text-slate-400 leading-relaxed">
          {disclaimer}
        </p>
      ) : null}
    </section>
  );
}

interface PiengChartKpiProps {
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
}

export function PiengChartKpi({ label, value, valueClassName = '' }: PiengChartKpiProps) {
  return (
    <div className="pieng-chart-kpi rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
      <div className="text-[11px] uppercase tracking-wide text-slate-500 font-medium">{label}</div>
      <div
        className={`text-base sm:text-lg font-bold text-slate-800 mt-0.5 tabular-nums ${valueClassName}`.trim()}
      >
        {value}
      </div>
    </div>
  );
}

export function PiengChartKpiGrid({
  children,
  colsClassName = 'grid-cols-2 lg:grid-cols-4',
}: {
  children: React.ReactNode;
  colsClassName?: string;
}) {
  return <div className={`grid ${colsClassName} gap-3 mb-5`}>{children}</div>;
}
