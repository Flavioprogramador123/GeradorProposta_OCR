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
          <h2 className="text-2xl font-bold mb-6 text-gray-700">📱 Fundo Branco</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            
            <div className="text-center">
              <h3 className="font-semibold mb-4 text-sm text-gray-600">CIRCULAR (Nova)</h3>
              <PiengLogo variant="circular" size="md" />
            </div>

            <div className="text-center">
              <h3 className="font-semibold mb-4 text-sm text-gray-600">COM FUNDO BRANCO</h3>
              <PiengLogo variant="whiteBg" size="md" />
            </div>

            <div className="text-center">
              <h3 className="font-semibold mb-4 text-sm text-gray-600">CSS PURO</h3>
              <PiengLogo variant="css" size="md" />
            </div>

            <div className="text-center">
              <h3 className="font-semibold mb-4 text-sm text-gray-600">DEFAULT SVG</h3>
              <PiengLogo variant="default" size="md" />
            </div>

            <div className="text-center col-span-2">
              <h3 className="font-semibold mb-4 text-sm text-gray-600">HORIZONTAL</h3>
              <PiengLogo variant="horizontal" size="md" />
            </div>
          </div>
        </div>

        {/* Fundo com gradiente (como na proposta) */}
        <div className="bg-gradient-to-br from-blue-600 to-purple-700 p-8 rounded-lg shadow-lg mb-8">
          <h2 className="text-2xl font-bold mb-6 text-white">🌈 Fundo Gradiente (Como na Proposta)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            
            <div className="text-center">
              <h3 className="font-semibold mb-4 text-sm text-white opacity-80">CIRCULAR (Nova)</h3>
              <PiengLogo variant="circular" size="md" />
            </div>

            <div className="text-center">
              <h3 className="font-semibold mb-4 text-sm text-white opacity-80">COM FUNDO BRANCO</h3>
              <PiengLogo variant="whiteBg" size="md" />
            </div>

            <div className="text-center">
              <h3 className="font-semibold mb-4 text-sm text-white opacity-80">CSS PURO</h3>
              <PiengLogo variant="css" size="md" />
            </div>
          </div>
        </div>

        {/* Fundo escuro */}
        <div className="bg-gray-900 p-8 rounded-lg shadow-lg mb-8">
          <h2 className="text-2xl font-bold mb-6 text-white">🌙 Fundo Escuro</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            
            <div className="text-center">
              <h3 className="font-semibold mb-4 text-sm text-white opacity-80">CIRCULAR (Nova)</h3>
              <PiengLogo variant="circular" size="md" />
            </div>

            <div className="text-center">
              <h3 className="font-semibold mb-4 text-sm text-white opacity-80">COM FUNDO BRANCO</h3>
              <PiengLogo variant="whiteBg" size="md" />
            </div>

            <div className="text-center">
              <h3 className="font-semibold mb-4 text-sm text-white opacity-80">CSS PURO</h3>
              <PiengLogo variant="css" size="md" />
            </div>
          </div>
        </div>

        {/* Tamanhos diferentes */}
        <div className="bg-white p-8 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold mb-6 text-gray-700">📏 Diferentes Tamanhos</h2>
          <div className="flex flex-wrap items-center justify-center gap-8">
            
            <div className="text-center">
              <h3 className="font-semibold mb-4 text-sm text-gray-600">PEQUENO</h3>
              <PiengLogo variant="circular" size="sm" />
            </div>

            <div className="text-center">
              <h3 className="font-semibold mb-4 text-sm text-gray-600">MÉDIO</h3>
              <PiengLogo variant="circular" size="md" />
            </div>

            <div className="text-center">
              <h3 className="font-semibold mb-4 text-sm text-gray-600">GRANDE</h3>
              <PiengLogo variant="circular" size="lg" />
            </div>
          </div>
        </div>

        {/* Recomendação */}
        <div className="mt-8 p-6 bg-green-50 border-l-4 border-green-400 rounded">
          <h3 className="text-lg font-semibold text-green-800 mb-2">💡 Recomendação</h3>
          <p className="text-green-700">
            Para a proposta PIENG, recomendo usar <strong>"circular"</strong> no header principal 
            e <strong>"whiteBg"</strong> em fundos brancos para melhor contraste.
          </p>
        </div>
      </div>
    </div>
  );
}