import React from 'react';
import { Menu } from 'lucide-react';
import Image from 'next/image';
import { getFaviconLogo } from '@/lib/logoConfig';

const Header = () => {
  const logoPath = getFaviconLogo();
  
  return (
    <header className="bg-white shadow-sm border-b">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative w-10 h-10 flex-shrink-0">
              <Image
                src={logoPath}
                alt="PIENG Soluções Energéticas"
                fill
                className="object-contain"
                priority
              />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">PIENG SOLUÇÕES ENERGÉTICAS</h1>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">Sistema Unificado</span>
            <Menu className="h-6 w-6 text-gray-600" />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;