import React, { useState } from 'react';
import { BarChart3, MapPin, Sun } from 'lucide-react';

const SolarAnalysis = () => {
  const [localizacao, setLocalizacao] = useState('');
  const [dados, setDados] = useState(null);

  const handleAnalyze = async () => {
    // Lógica para análise solar
    console.log('Analisando...', localizacao);
    setDados({
      hsp: 5.21,
      potencial: 'Alto',
      irradiacao: 850,
      temperatura: 28.5
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <BarChart3 className="h-8 w-8 text-orange-500" />
        <h1 className="text-3xl font-bold text-gray-900">Solar Analysis</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Análise de Potencial Solar</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Localização
              </label>
              <input
                type="text"
                value={localizacao}
                onChange={(e) => setLocalizacao(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="Digite a cidade ou coordenadas"
              />
            </div>
            <button
              onClick={handleAnalyze}
              className="w-full bg-orange-500 text-white p-3 rounded-lg hover:bg-orange-600 transition-colors flex items-center justify-center space-x-2"
            >
              <Sun className="h-5 w-5" />
              <span>Analisar Potencial</span>
            </button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Resultados</h2>
          {dados ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">{dados.hsp}</div>
                  <div className="text-sm text-gray-600">HSP (kWh/m²/dia)</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{dados.potencial}</div>
                  <div className="text-sm text-gray-600">Potencial</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{dados.irradiacao}</div>
                  <div className="text-sm text-gray-600">Irradiação (W/m²)</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{dados.temperatura}°C</div>
                  <div className="text-sm text-gray-600">Temperatura</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">
              <p className="text-gray-500">Digite uma localização para analisar</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SolarAnalysis;


