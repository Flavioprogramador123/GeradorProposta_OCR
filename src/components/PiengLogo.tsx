import React from 'react';
import Image from 'next/image';

interface PiengLogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  useImage?: boolean;
}

export const PiengLogo: React.FC<PiengLogoProps> = ({ 
  size = 'md', 
  className = '',
  useImage = true 
}) => {
  const sizeClasses = {
    sm: { container: 'w-16 h-16', text: 'text-2xl' },
    md: { container: 'w-32 h-32', text: 'text-5xl' },
    lg: { container: 'w-40 h-40', text: 'text-6xl' }
  };

  const currentSize = sizeClasses[size];

  return (
    <div className={`pieng-logo-container ${className}`}>
      {useImage ? (
        <div className={`${currentSize.container} mb-3`}>
          <Image
            src="/assets/logos/pieng-logo.svg"
            alt="PIENG Logo"
            width={size === 'sm' ? 64 : size === 'lg' ? 160 : 128}
            height={size === 'sm' ? 64 : size === 'lg' ? 160 : 128}
            className="drop-shadow-lg"
          />
        </div>
      ) : (
        <div className={`pieng-logo-circle ${currentSize.container}`}>
          <span className={`pieng-logo-text ${currentSize.text}`}>π</span>
        </div>
      )}
      <div className="pieng-brand-text">PIENG</div>
    </div>
  );
};