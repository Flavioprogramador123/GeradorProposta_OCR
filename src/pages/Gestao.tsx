import React from 'react';
import { Users, UserPlus, Settings } from 'lucide-react';

const Gestao = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <Users className="h-8 w-8 text-green-500" />
        <h1 className="text-3xl font-bold text-gray-900">Sistema de Gestão</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center space-x-3 mb-4">
            <UserPlus className="h-6 w-6 text-green-500" />
            <h3 className="text-lg font-semibold">Novo Cliente</h3>
          </div>
          <p className="text-gray-600 mb-4">Cadastrar novo cliente no sistema</p>
          <button className="w-full bg-green-500 text-white p-2 rounded-lg hover:bg-green-600 transition-colors">
            Cadastrar
          </button>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center space-x-3 mb-4">
            <Users className="h-6 w-6 text-blue-500" />
            <h3 className="text-lg font-semibold">Lista de Clientes</h3>
          </div>
          <p className="text-gray-600 mb-4">Visualizar e gerenciar clientes</p>
          <button className="w-full bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600 transition-colors">
            Visualizar
          </button>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center space-x-3 mb-4">
            <Settings className="h-6 w-6 text-gray-500" />
            <h3 className="text-lg font-semibold">Configurações</h3>
          </div>
          <p className="text-gray-600 mb-4">Configurar sistema de gestão</p>
          <button className="w-full bg-gray-500 text-white p-2 rounded-lg hover:bg-gray-600 transition-colors">
            Configurar
          </button>
        </div>
      </div>
    </div>
  );
};

export default Gestao;



