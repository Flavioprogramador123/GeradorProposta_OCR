// Ícones SVG Personalizados para Variantes PIENG
import React from 'react';

interface IconProps {
  className?: string;
  size?: number;
}

// ========================================
// ÍCONE RESIDENCIAL (Casa com Sol)
// ========================================
export const ResidencialIcon: React.FC<IconProps> = ({ className = '', size = 64 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Casa */}
    <path
      d="M8 32L32 12L56 32V54C56 56.2091 54.2091 58 52 58H12C9.79086 58 8 56.2091 8 54V32Z"
      fill="#3366CC"
      opacity="0.9"
    />
    <path
      d="M24 58V42C24 39.7909 25.7909 38 28 38H36C38.2091 38 40 39.7909 40 42V58"
      fill="#667eea"
    />
    <rect x="18" y="24" width="8" height="8" rx="1" fill="#ffffff" opacity="0.8" />
    <rect x="38" y="24" width="8" height="8" rx="1" fill="#ffffff" opacity="0.8" />

    {/* Sol */}
    <circle cx="48" cy="16" r="8" fill="#f39c12" />
    <path
      d="M48 4V8M48 24V28M60 16H56M40 16H36M54.9 9.1L52.2 11.8M43.8 20.2L41.1 22.9M54.9 22.9L52.2 20.2M43.8 11.8L41.1 9.1"
      stroke="#f39c12"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

// ========================================
// ÍCONE RURAL (Fazenda com Sol)
// ========================================
export const RuralIcon: React.FC<IconProps> = ({ className = '', size = 64 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Celeiro */}
    <path
      d="M8 28L32 10L56 28V56H8V28Z"
      fill="#2d6a4f"
      opacity="0.9"
    />
    <path
      d="M32 10V20C32 20 28 24 32 24C36 24 32 24 32 24V10Z"
      fill="#52b788"
    />
    <rect x="28" y="36" width="8" height="20" fill="#8B4513" />

    {/* Painel Solar */}
    <g transform="translate(40, 32)">
      <rect width="16" height="12" rx="1" fill="#1e3a8a" />
      <line x1="0" y1="3" x2="16" y2="3" stroke="#3b82f6" strokeWidth="0.5" />
      <line x1="0" y1="6" x2="16" y2="6" stroke="#3b82f6" strokeWidth="0.5" />
      <line x1="0" y1="9" x2="16" y2="9" stroke="#3b82f6" strokeWidth="0.5" />
      <line x1="5" y1="0" x2="5" y2="12" stroke="#3b82f6" strokeWidth="0.5" />
      <line x1="11" y1="0" x2="11" y2="12" stroke="#3b82f6" strokeWidth="0.5" />
    </g>

    {/* Sol */}
    <circle cx="12" cy="12" r="6" fill="#f4a261" />
  </svg>
);

// ========================================
// ÍCONE INDUSTRIAL (Fábrica)
// ========================================
export const IndustrialIcon: React.FC<IconProps> = ({ className = '', size = 64 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Chaminés */}
    <rect x="12" y="8" width="6" height="16" fill="#1e3a8a" />
    <rect x="22" y="12" width="6" height="12" fill="#1e3a8a" />
    <rect x="32" y="10" width="6" height="14" fill="#1e3a8a" />

    {/* Fumaça/Energia */}
    <circle cx="15" cy="6" r="2" fill="#22c55e" opacity="0.6" />
    <circle cx="25" cy="9" r="2" fill="#22c55e" opacity="0.6" />
    <circle cx="35" cy="7" r="2" fill="#22c55e" opacity="0.6" />

    {/* Prédio da Fábrica */}
    <rect x="8" y="24" width="48" height="32" fill="#3b82f6" />
    <rect x="12" y="30" width="6" height="6" fill="#ffffff" opacity="0.8" />
    <rect x="22" y="30" width="6" height="6" fill="#ffffff" opacity="0.8" />
    <rect x="32" y="30" width="6" height="6" fill="#ffffff" opacity="0.8" />
    <rect x="42" y="30" width="6" height="6" fill="#ffffff" opacity="0.8" />
    <rect x="12" y="40" width="6" height="6" fill="#ffffff" opacity="0.8" />
    <rect x="22" y="40" width="6" height="6" fill="#ffffff" opacity="0.8" />
    <rect x="32" y="40" width="6" height="6" fill="#ffffff" opacity="0.8" />
    <rect x="42" y="40" width="6" height="6" fill="#ffffff" opacity="0.8" />

    {/* Painel Solar no Telhado */}
    <rect x="10" y="20" width="44" height="4" fill="#1e3a8a" />
    <path d="M10 20 L32 16 L54 20" fill="#fb923c" />
  </svg>
);

// ========================================
// ÍCONE FARMÁCIA (Cruz Farmacêutica)
// ========================================
export const FarmaciaIcon: React.FC<IconProps> = ({ className = '', size = 64 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Fundo circular */}
    <circle cx="32" cy="32" r="28" fill="#10b981" />
    <circle cx="32" cy="32" r="24" fill="#059669" />

    {/* Cruz Farmacêutica */}
    <rect x="26" y="14" width="12" height="36" rx="2" fill="#ffffff" />
    <rect x="14" y="26" width="36" height="12" rx="2" fill="#ffffff" />

    {/* Símbolo de Energia (Raio pequeno) */}
    <path
      d="M38 10L34 18H40L36 26"
      stroke="#f59e0b"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
);

// ========================================
// ÍCONE PANIFICADORA (Pão com Sol)
// ========================================
export const PanificadoraIcon: React.FC<IconProps> = ({ className = '', size = 64 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Pão */}
    <ellipse cx="32" cy="38" rx="22" ry="18" fill="#d97706" />
    <ellipse cx="32" cy="38" rx="18" ry="14" fill="#f59e0b" />
    <path
      d="M20 36C20 36 24 32 32 32C40 32 44 36 44 36"
      stroke="#d97706"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M22 42C22 42 26 40 32 40C38 40 42 42 42 42"
      stroke="#d97706"
      strokeWidth="2"
      strokeLinecap="round"
    />

    {/* Sol/Calor */}
    <circle cx="48" cy="16" r="8" fill="#ef4444" />
    <path
      d="M48 4V8M56 8L53 11M60 16H56M56 24L53 21M48 28V24M40 24L43 21M36 16H40M40 8L43 11"
      stroke="#ef4444"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

// ========================================
// ÍCONE AÇOUGUE (Carne)
// ========================================
export const AcougueIcon: React.FC<IconProps> = ({ className = '', size = 64 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Tábua de corte */}
    <rect x="8" y="20" width="48" height="36" rx="3" fill="#8B4513" />
    <rect x="12" y="24" width="40" height="28" rx="2" fill="#A0522D" />

    {/* Carne */}
    <path
      d="M24 32C24 32 28 28 36 28C44 28 48 32 48 32C48 36 44 44 36 44C28 44 24 36 24 32Z"
      fill="#dc2626"
    />
    <path
      d="M28 34C28 34 30 32 36 32C42 32 44 34 44 34C44 36 42 40 36 40C30 40 28 36 28 34Z"
      fill="#ef4444"
    />

    {/* Osso */}
    <circle cx="30" cy="36" r="2" fill="#ffffff" opacity="0.8" />

    {/* Símbolo de frio (floco de neve) */}
    <g transform="translate(44, 12)">
      <path
        d="M8 2V14M2 8H14M4.5 4.5L11.5 11.5M11.5 4.5L4.5 11.5"
        stroke="#06b6d4"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </g>
  </svg>
);

// ========================================
// ÍCONE RESTAURANTE (Talheres)
// ========================================
export const RestauranteIcon: React.FC<IconProps> = ({ className = '', size = 64 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Prato */}
    <circle cx="32" cy="32" r="26" fill="#f97316" />
    <circle cx="32" cy="32" r="22" fill="#ea580c" />
    <circle cx="32" cy="32" r="18" fill="#ffffff" opacity="0.9" />

    {/* Garfo */}
    <line x1="22" y1="20" x2="22" y2="44" stroke="#ea580c" strokeWidth="2" strokeLinecap="round" />
    <line x1="20" y1="20" x2="20" y2="28" stroke="#ea580c" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="24" y1="20" x2="24" y2="28" stroke="#ea580c" strokeWidth="1.5" strokeLinecap="round" />

    {/* Faca */}
    <line x1="32" y1="20" x2="32" y2="44" stroke="#ea580c" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M30 20 L34 20 L32 24 Z" fill="#ea580c" />

    {/* Colher */}
    <line x1="42" y1="28" x2="42" y2="44" stroke="#ea580c" strokeWidth="2" strokeLinecap="round" />
    <circle cx="42" cy="23" r="3" fill="#ea580c" />

    {/* Sol pequeno */}
    <circle cx="50" cy="14" r="4" fill="#fbbf24" />
  </svg>
);

// ========================================
// COMPONENTE SELETOR DE ÍCONE
// ========================================
interface VariantIconProps {
  variant: 'residencial' | 'rural' | 'industrial' | 'farmacia' | 'panificadora' | 'acougue' | 'restaurante';
  size?: number;
  className?: string;
}

export const VariantIcon: React.FC<VariantIconProps> = ({ variant, size = 64, className = '' }) => {
  switch (variant) {
    case 'residencial':
      return <ResidencialIcon size={size} className={className} />;
    case 'rural':
      return <RuralIcon size={size} className={className} />;
    case 'industrial':
      return <IndustrialIcon size={size} className={className} />;
    case 'farmacia':
      return <FarmaciaIcon size={size} className={className} />;
    case 'panificadora':
      return <PanificadoraIcon size={size} className={className} />;
    case 'acougue':
      return <AcougueIcon size={size} className={className} />;
    case 'restaurante':
      return <RestauranteIcon size={size} className={className} />;
    default:
      return <ResidencialIcon size={size} className={className} />;
  }
};
