import React from 'react';
import type { TextosMarketingResolvidos } from '@/lib/textosMarketingVariaveis';

interface MarketingBeneficiosProps {
  marketing?: TextosMarketingResolvidos | null;
}

export const MarketingBeneficios: React.FC<MarketingBeneficiosProps> = ({ marketing }) => {
  if (!marketing) return null;
  const itens = [
    marketing.economiaAnual,
    marketing.payback,
    marketing.tir,
    marketing.valorizacaoImovel,
    marketing.sustentabilidade,
  ].filter((t) => typeof t === 'string' && t.trim().length > 0);

  if (!itens.length) return null;

  return (
    <section className="pieng-card p-8 mb-8">
      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
        ✨ Benefícios do seu investimento
      </h3>
      <ul className="list-disc pl-5 space-y-2 text-sm leading-relaxed text-slate-700">
        {itens.map((txt, i) => (
          <li key={i}>{txt}</li>
        ))}
      </ul>
    </section>
  );
};
