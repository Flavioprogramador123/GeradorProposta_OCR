import React from 'react';
import { 
  Sun, 
  Users, 
  Image, 
  BarChart3, 
  Zap,
  TrendingUp,
  DollarSign
} from 'lucide-react';

const Dashboard = () => {
  const stats = [
    { name: 'Propostas Geradas', value: '1,234', icon: Sun, color: 'yellow' },
    { name: 'Usuários Ativos', value: '89', icon: Users, color: 'green' },
    { name: 'Imagens Geradas', value: '567', icon: Image, color: 'purple' },
    { name: 'Análises Solares', value: '234', icon: BarChart3, color: 'orange' },
    { name: 'Automações', value: '45', icon: Zap, color: 'red' },
    { name: 'Economia Mensal', value: 'R$ 121', icon: DollarSign, color: 'green' }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard PIENG</h1>
        <p className="text-gray-600">Sistema unificado de energia solar</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center">
                <div className={`p-3 rounded-full bg-${stat.color}-100`}>
                  <Icon className={`h-6 w-6 text-${stat.color}-600`} />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Status do Sistema</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm text-gray-600">Solar Generator: Online</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm text-gray-600">Sistema de Gestão: Online</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm text-gray-600">Image Studio: Online</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm text-gray-600">Solar Analysis: Online</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;



