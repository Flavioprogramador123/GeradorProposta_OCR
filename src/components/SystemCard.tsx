import React, { useState } from 'react';
import { formatBRL } from '@/lib/formatBRL';
import { tagEconomiaPix } from '@/lib/tabelaJurosCartao';
import { FormasPagamentoModal } from '@/components/FormasPagamentoModal';

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
}) => {
  const [payOpen, setPayOpen] = useState(false);

  // Coerência: % do card = (à vista − PIX) / PIX, arredondado — mesma regra da maquininha.
  // Ex.: mult 1,117943 → ~12%; mult 1,11 → 11%. Sempre alinhado aos valores exibidos.
  const tagCoerente =
    pavista != null && pavista > 0 && precoPixDecimal > 0
      ? tagEconomiaPix(precoPixDecimal, pavista)
      : tagDesconto || tagEconomiaPix(precoPixDecimal, precoPixDecimal);

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
        </div>

        <div className="pieng-performance-box">
          <strong>Performance Mensal</strong>
          <br />
          Geração: {geracao} | Cobertura:{' '}
          {typeof cobertura === 'number'
            ? `${Math.round(cobertura)}%`
            : typeof cobertura === 'string' && cobertura.includes('%')
              ? cobertura
              : `${Math.round(parseFloat(String(cobertura)) || 0)}%`}
          <br />
          Economia: {economia} | Payback: {payback}
          <br />
          TIR: {tir} ao ano
        </div>

        <button
          type="button"
          className="pieng-button-secondary text-base font-bold py-4 no-print w-full"
          onClick={() => setPayOpen(true)}
        >
          OUTRAS FORMAS DE PAGAMENTO
        </button>
      </div>

      <FormasPagamentoModal open={payOpen} pix={precoPixDecimal} onClose={() => setPayOpen(false)} />
    </div>
  );
};
