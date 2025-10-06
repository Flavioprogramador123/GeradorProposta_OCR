import React, { useState } from 'react';
import { Zap, Play, Pause, Settings } from 'lucide-react';

const Automacao = () => {
  const [status, setStatus] = useState('Parado');
  const [equipamentos, setEquipamentos] = useState([
    { id: 1, nome: 'Equipamento 1', status: 'Online' },
    { id: 2, nome: 'Equipamento 2', status: 'Offline' },
    { id: 3, nome: 'Equipamento 3', status: 'Online' }
  ]);

  const handleStart = () => {
    setStatus('Executando');
  };

  const handleStop = () => {
    setStatus('Parado');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <Zap className="h-8 w-8 text-red-500" />
        <h1 className="text-3xl font-bold text-gray-900">Sistema de Automação</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Controle de Automação</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <span className="font-medium">Status do Sistema:</span>
              <span className={`px-3 py-1 rounded-full text-sm ${
                status === 'Executando' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {status}
              </span>
            </div>
            
            <div className="flex space-x-4">
              <button
                onClick={handleStart}
                className="flex-1 bg-green-500 text-white p-3 rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center space-x-2"
              >
                <Play className="h-5 w-5" />
                <span>Iniciar</span>
              </button>
              <button
                onClick={handleStop}
                className="flex-1 bg-red-500 text-white p-3 rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center space-x-2"
              >
                <Pause className="h-5 w-5" />
                <span>Parar</span>
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Status dos Equipamentos</h2>
          <div className="space-y-3">
            {equipamentos.map((equipamento) => (
              <div key={equipamento.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${
                    equipamento.status === 'Online' ? 'bg-green-500' : 'bg-red-500'
                  }`}></div>
                  <span className="font-medium">{equipamento.nome}</span>
                </div>
                <span className={`px-2 py-1 rounded text-xs ${
                  equipamento.status === 'Online' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {equipamento.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Automacao;


