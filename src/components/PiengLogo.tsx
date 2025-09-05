import React from 'react';
import Image from 'next/image';

interface PiengLogoProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'circular' | 'whiteBg' | 'horizontal' | 'css';
  className?: string;
}

export const PiengLogo: React.FC<PiengLogoProps> = ({ 
  size = 'md', 
  variant = 'circular',
  className = ''
}) => {
  const sizeConfig = {
    sm: { 
      dimension: 64, 
      cssContainer: 'w-16 h-16', 
      cssText: 'text-2xl',
      horizontal: { width: 150, height: 60 }
    },
    md: { 
      dimension: 128, 
      cssContainer: 'w-32 h-32', 
      cssText: 'text-5xl',
      horizontal: { width: 300, height: 120 }
    },
    lg: { 
      dimension: 160, 
      cssContainer: 'w-40 h-40', 
      cssText: 'text-6xl',
      horizontal: { width: 375, height: 150 }
    }
  };

  const config = sizeConfig[size];

  // Renderização para variante horizontal
  if (variant === 'horizontal') {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <Image
          src="/assets/logos/pieng-logo-horizontal.svg"
          alt="PIENG Soluções Energéticas"
          width={config.horizontal.width}
          height={config.horizontal.height}
          className="drop-shadow-lg"
          priority
        />
      </div>
    );
  }

  // Renderização para variante CSS pura
  if (variant === 'css') {
    return (
      <div className={`pieng-logo-container ${className}`}>
        <div className={`pieng-logo-circle ${config.cssContainer}`}>
          <span className={`pieng-logo-text ${config.cssText}`}>π</span>
        </div>
        <div className="pieng-brand-text">PIENG</div>
      </div>
    );
  }

  // Mapeamento das variantes para arquivos SVG
  const logoFiles = {
    default: '/assets/logos/pieng-logo.svg',
    circular: '/assets/logos/pieng-logo-circular.svg',
    whiteBg: '/assets/logos/pieng-logo-white-bg.svg'
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <Image
        src={logoFiles[variant]}
        alt="PIENG Logo"
        width={config.dimension}
        height={config.dimension}
        className="drop-shadow-lg"
        priority
      />
    </div>
  );
};