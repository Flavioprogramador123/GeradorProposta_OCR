import React from 'react';

interface PiengLogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const PiengLogo: React.FC<PiengLogoProps> = ({ 
  size = 'md', 
  className = '' 
}) => {
  const sizeClasses = {
    sm: 'w-16 h-16 text-2xl',
    md: 'w-32 h-32 text-5xl',
    lg: 'w-40 h-40 text-6xl'
  };

  return (
    <div className={`pieng-logo-container ${className}`}>
      <div className={`pieng-logo-circle ${sizeClasses[size]}`}>
        <span className="pieng-logo-text">π</span>
      </div>
      <div className="pieng-brand-text">PIENG</div>
    </div>
  );
};