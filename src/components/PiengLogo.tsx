import React from 'react';
import Image from 'next/image';

interface PiengLogoProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'main' | 'grayscale' | 'simple' | 'css';
  className?: string;
}

export const PiengLogo: React.FC<PiengLogoProps> = ({ 
  size = 'md', 
  variant = 'main',
  className = ''
}) => {
  const sizeConfig = {
    sm: { 
      dimension: 64, 
      cssContainer: 'w-16 h-16', 
      cssText: 'text-2xl'
    },
    md: { 
      dimension: 128, 
      cssContainer: 'w-32 h-32', 
      cssText: 'text-5xl'
    },
    lg: { 
      dimension: 160, 
      cssContainer: 'w-40 h-40', 
      cssText: 'text-6xl'
    }
  };

  const config = sizeConfig[size];

  // Renderização para variante CSS pura (fallback)
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

  // Mapeamento das variantes para arquivos reais PNG/JPG
  const logoFiles = {
    main: '/assets/logos/logo-pieng.png',        // Logo principal colorido
    grayscale: '/assets/logos/grayscale_logo.png', // Logo em escala de cinza
    simple: '/assets/logos/logo.png'             // Logo simples
  };

  const logoSrc = logoFiles[variant];

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className={`${config.cssContainer} mb-3 relative`}>
        <Image
          src={logoSrc}
          alt="PIENG Soluções Energéticas"
          fill
          className="object-contain drop-shadow-lg rounded-full"
          priority
        />
      </div>
      <div className="pieng-brand-text">PIENG</div>
    </div>
  );
};