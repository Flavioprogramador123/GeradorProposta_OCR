import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Cpu, 
  HardDrive, 
  Wifi, 
  AlertTriangle,
  TrendingUp,
  Zap,
  Brain,
  BarChart3
} from 'lucide-react';

const GoTeste = () => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchMetrics = async () => {
    try {
      const response = await fetch('http://localhost:8000/metrics');
      const data = await response.json();
      setMetrics(data);
      setLoading(false);
    } catch (error) {
      console.error('Erro ao buscar métricas:', error);
      setLoading(false);
    }
  };

  const startOptimization = async () => {
    try {
      const response = await fetch('http://localhost:8000/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_metric: 'cpu_usage',
          ai_analysis: true
        })
      });
      
      if (response.ok) {
        alert('Otimização iniciada!');
      }
    } catch (error) {
      alert('Erro ao iniciar otimização');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Activity className="h-8 w-8 text-blue-500" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">GoTeste Monitor</h1>
            <p className="text-gray-600">Sistema de monitoramento e otimização PIENG</p>
          </div>
        </div>
        <button
          onClick={startOptimization}
          className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors flex items-center space-x-2"
        >
          <Zap className="h-5 w-5" />
          <span>Otimizar Sistema</span>
        </button>
      </div>

      {/* Cards de Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100">
              <Cpu className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">CPU Usage</p>
              <p className="text-2xl font-bold text-gray-900">{metrics?.cpu_usage?.toFixed(1) || 0}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100">
              <Activity className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Memory Usage</p>
              <p className="text-2xl font-bold text-gray-900">{metrics?.memory_usage?.toFixed(1) || 0}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100">
              <HardDrive className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Disk Usage</p>
              <p className="text-2xl font-bold text-gray-900">{metrics?.disk_usage?.toFixed(1) || 0}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100">
              <Wifi className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Response Time</p>
              <p className="text-2xl font-bold text-gray-900">{metrics?.response_time?.toFixed(0) || 0}ms</p>
            </div>
          </div>
        </div>
      </div>

      {/* Status do Sistema */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Status do Sistema PIENG</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm text-gray-600">GoTeste: Online</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm text-gray-600">IA Service: Online</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm text-gray-600">Monitor: Online</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm text-gray-600">Optimizer: Online</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm text-gray-600">Alerts: Online</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className="text-sm text-gray-600">Processos: {metrics?.process_count || 0}</span>
          </div>
        </div>
      </div>

      {/* Análise IA */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center space-x-3 mb-4">
          <Brain className="h-6 w-6 text-purple-500" />
          <h3 className="text-lg font-semibold text-gray-900">Análise Inteligente</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Recomendações de Otimização</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• CPU usage está dentro do normal</li>
              <li>• Memória otimizada</li>
              <li>• Tempo de resposta aceitável</li>
              <li>• Sistema estável</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Próximas Ações</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• Monitorar tendências de uso</li>
              <li>• Otimizar cache se necessário</li>
              <li>• Revisar logs de erro</li>
              <li>• Atualizar dependências</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GoTeste;


