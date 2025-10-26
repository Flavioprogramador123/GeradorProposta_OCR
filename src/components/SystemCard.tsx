import React from 'react';

interface SystemCardProps {
  titulo: string;
  potencia: string;
  especificacoes: string[];
  precoRiscado: string;
  precoAtual: string;
  tagDesconto: string;
  precoPixDecimal: number;
  preco12x: string;
  preco18x: string;
  geracao: string;
  cobertura: string;
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
  preco12x,
  preco18x,
  geracao,
  cobertura,
  economia,
  payback,
  tir,
  isRecommended = false,
  badge
}) => {
  const formatPix = (value: number | null | undefined) => {
    if (value === null || value === undefined || isNaN(value)) {
      return 'R$ 0,00';
    }
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  return (
    <div className={`pieng-system-card ${isRecommended ? 'pieng-system-recommended' : ''}`}>
      {badge && (
        <div className="pieng-badge">
          {badge}
        </div>
      )}
      
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
          <div className="pieng-original-price">De {precoRiscado}</div>
          <div className="pieng-current-price">{precoAtual}</div>
          <div className="pieng-discount-tag">{tagDesconto}</div>
          <div className="font-bold text-lg mb-4">PIX: {formatPix(precoPixDecimal)}</div>
          
          <div className="pieng-payment-grid">
            <div className="pieng-payment-option pieng-payment-highlight">
              <strong>12× sem juros</strong><br />
              {preco12x}
            </div>
            <div className="pieng-payment-option">
              <strong>18× cartão</strong><br />
              {preco18x}
            </div>
          </div>
        </div>

        <div className="pieng-performance-box">
          <strong>Performance Mensal</strong><br />
          Geração: {geracao} | Cobertura: {cobertura}<br />
          Economia: {economia} | Payback: {payback}<br />
          TIR: {tir} ao ano
        </div>

        <button className="pieng-button-secondary text-base font-bold py-4">
          ESCOLHER ESTA OPÇÃO
        </button>
      </div>
    </div>
  );
};