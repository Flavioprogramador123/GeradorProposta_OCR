import React from 'react';

interface UrgencyBannerProps {
  message: string;
}

export const UrgencyBanner: React.FC<UrgencyBannerProps> = ({ message }) => {
  return (
    <div className="pieng-urgency-banner">
      {message}
    </div>
  );
};