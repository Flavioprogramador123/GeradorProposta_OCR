import React from 'react';

interface MicroInversorToggleProps {
  ativo: boolean;
  bonusPercent: number;
  onToggle: () => void;
  compact?: boolean;
}

export default function MicroInversorToggle({
  ativo,
  bonusPercent,
  onToggle,
  compact = false,
}: MicroInversorToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      title={
        ativo
          ? `Bônus micro-inversor ativo (+${bonusPercent}% geração). Clique para usar eficiência string.`
          : `Eficiência string (padrão). Clique para aplicar bônus micro (+${bonusPercent}%).`
      }
      className={`rounded font-semibold transition-all ${
        compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-xs'
      } ${
        ativo
          ? 'bg-green-500 text-white ring-2 ring-green-600 shadow-sm hover:bg-green-600'
          : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
      }`}
    >
      {ativo ? `⚡ +${bonusPercent}%` : 'String'}
    </button>
  );
}
