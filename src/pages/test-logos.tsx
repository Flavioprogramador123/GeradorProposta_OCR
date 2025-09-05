import React from 'react';
import { PiengLogo } from '@/components/PiengLogo';

export default function TestLogos() {
  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-center mb-10 text-gray-800">
          🎨 Teste de Logos PIENG
        </h1>

        {/* Fundo branco para teste */}
        <div className="bg-white p-8 rounded-lg shadow-lg mb-8">
          <h2 className="text-2xl font-bold mb-6 text-gray-700">📱 Logos Reais PIENG (Fundo Branco)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            
            <div className="text-center">
              <h3 className="font-semibold mb-4 text-sm text-gray-600">LOGO PRINCIPAL</h3>
              <PiengLogo variant="main" size="md" />
            </div>

            <div className="text-center">
              <h3 className="font-semibold mb-4 text-sm text-gray-600">ESCALA DE CINZA</h3>
              <PiengLogo variant="grayscale" size="md" />
            </div>

            <div className="text-center">
              <h3 className="font-semibold mb-4 text-sm text-gray-600">LOGO SIMPLES</h3>
              <PiengLogo variant="simple" size="md" />
            </div>

            <div className="text-center">
              <h3 className="font-semibold mb-4 text-sm text-gray-600">CSS PURO (Fallback)</h3>
              <PiengLogo variant="css" size="md" />
            </div>
          </div>
        </div>

        {/* Tamanhos diferentes */}
        <div className="bg-white p-8 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold mb-6 text-gray-700">📏 Diferentes Tamanhos (Logo Principal)</h2>
          <div className="flex flex-wrap items-center justify-center gap-8">
            
            <div className="text-center">
              <h3 className="font-semibold mb-4 text-sm text-gray-600">PEQUENO</h3>
              <PiengLogo variant="main" size="sm" />
            </div>

            <div className="text-center">
              <h3 className="font-semibold mb-4 text-sm text-gray-600">MÉDIO</h3>
              <PiengLogo variant="main" size="md" />
            </div>

            <div className="text-center">
              <h3 className="font-semibold mb-4 text-sm text-gray-600">GRANDE</h3>
              <PiengLogo variant="main" size="lg" />
            </div>
          </div>
        </div>

        {/* Recomendação */}
        <div className="mt-8 p-6 bg-blue-50 border-l-4 border-blue-400 rounded">
          <h3 className="text-lg font-semibold text-blue-800 mb-2">💡 Logos Originais PIENG</h3>
          <p className="text-blue-700">
            Agora usando apenas os <strong>logos reais PNG/JPG</strong> que são servidos diretamente do Vercel. 
            O <strong>"main"</strong> é o logo principal colorido da PIENG. 
            Removidos os SVGs criados localmente que não representavam a marca real.
          </p>
        </div>
      </div>
    </div>
  );
}