import React, { useState } from 'react';
import { formatBRL } from '@/lib/formatBRL';
import { tagEconomiaPix } from '@/lib/tabelaJurosCartao';
import { FormasPagamentoModal } from '@/components/FormasPagamentoModal';
import {
  buildPerformanceMensalView,
  parseCoberturaPct,
  parseGeracaoKwh,
  parseMoneyLike,
  parseTarifaKwh,
} from '@/lib/performanceMensalCopy';

interface SystemCardProps {
  titulo: string;
  potencia: string;
  especificacoes: string[];
  precoRiscado: string;
  precoAtual: string;
  /** Fallback legado; a tag exibida é recalculada de PIX + à vista quando possível */
  tagDesconto?: string;
  precoPixDecimal: number;
  /** À vista (= total 12×). Se presente, a tag % é derivada daqui — nunca de um % fixo. */
  pavista?: number;
  preco12x: string;
  preco18x: string;
  geracao: string;
  cobertura: string | number;
  economia: string;
  payback: string;
  tir: string;
  isRecommended?: boolean;
  badge?: string;
  /** Tarifa R$/kWh (cliente / configs) para abatimento na conta */
  tarifaEnergia?: number | string;
  /** PR usado no cálculo da geração (ex.: 0,78) */
  performanceRate?: number;
}

export const SystemCard: React.FC<SystemCardProps> = ({
  titulo,
  potencia,
  especificacoes,
  precoRiscado,
  precoAtual,
  tagDesconto,
  precoPixDecimal,
  pavista,
  preco12x,
  preco18x,
  geracao,
  cobertura,
  economia,
  payback,
  tir,
  isRecommended = false,
  badge,
  tarifaEnergia,
  performanceRate,
}) => {
  const [payOpen, setPayOpen] = useState(false);

  const tagCoerente =
    pavista != null && pavista > 0 && precoPixDecimal > 0
      ? tagEconomiaPix(precoPixDecimal, pavista)
      : tagDesconto || tagEconomiaPix(precoPixDecimal, precoPixDecimal);

  const perf = buildPerformanceMensalView({
    geracaoKwh: parseGeracaoKwh(geracao),
    coberturaPct: parseCoberturaPct(cobertura),
    economiaMensal: parseMoneyLike(economia),
    paybackTexto: payback,
    tirTexto: tir,
    tarifaKwh: parseTarifaKwh(tarifaEnergia),
    performanceRateRef: performanceRate,
  });

  return (
    <div className={`pieng-system-card ${isRecommended ? 'pieng-system-recommended' : ''}`}>
      {badge && <div className="pieng-badge">{badge}</div>}

      <div className="pieng-card-header">
        <div className="text-xl font-bold mb-2">{titulo}</div>
        <div className="text-base opacity-90">Potência: {potencia}</div>
      </div>

      <div className="p-6">
        <ul className="pieng-specs-list mb-5">
          {especificacoes.map((spec, index) => (
            <li key={index}>{spec}</li>
          ))}
        </ul>

        <div className="pieng-pricing-section">
          <div className="pieng-original-price">
            Promoção de <span className="pieng-valor-riscado">{precoRiscado}</span>
          </div>
          <div className="pieng-current-price">à vista {precoAtual}</div>
          <div className="pieng-discount-tag">{tagCoerente}</div>
          <div className="font-bold text-lg mb-4">PIX: {formatBRL(precoPixDecimal)}</div>

          <div className="pieng-payment-grid">
            <div className="pieng-payment-option pieng-payment-highlight">
              <strong>12× no cartão</strong>
              <br />
              {preco12x}
            </div>
            <div className="pieng-payment-option">
              <strong>18× cartão</strong>
              <br />
              {preco18x}
            </div>
          </div>

          <button
            type="button"
            className="pieng-button-secondary text-base font-bold py-3 mt-4 no-print w-full"
            onClick={() => setPayOpen(true)}
          >
            OUTRAS FORMAS DE PAGAMENTO
          </button>
        </div>

        <div className="pieng-performance-box text-sm leading-relaxed space-y-2.5">
          <div className="font-bold text-base mb-1">{perf.titulo}</div>
          <div>
            <div className="font-semibold text-slate-800">Geração estimada média entre:</div>
            <div className="tabular-nums whitespace-nowrap">{perf.geracaoFaixa}</div>
          </div>
          <div>
            <div className="font-semibold text-slate-800">Abatimento mensal na conta de:</div>
            <div className="tabular-nums whitespace-nowrap">{perf.abatimentoMensal}</div>
          </div>
          <div>
            <div className="font-semibold text-slate-800">Abatimento anual estimado de:</div>
            <div className="tabular-nums whitespace-nowrap">{perf.abatimentoAnual}</div>
          </div>
          <div className="pt-2 border-t border-green-200/80 mt-1 space-y-0.5">
            <div>
              <strong>Payback:</strong>{' '}
              <span className="whitespace-nowrap">{perf.payback}</span>
            </div>
            <div>
              <strong>TIR:</strong>{' '}
              <span className="whitespace-nowrap">{perf.tir}</span>
            </div>
          </div>
        </div>
      </div>

      <FormasPagamentoModal open={payOpen} pix={precoPixDecimal} onClose={() => setPayOpen(false)} />
    </div>
  );
};
