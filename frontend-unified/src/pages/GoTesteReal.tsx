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
  BarChart3,
  RefreshCw,
  CheckCircle,
  XCircle
} from 'lucide-react';

const GoTesteReal = () => {
  const [piengStatus, setPiengStatus] = useState(null);
  const [systemMetrics, setSystemMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);

  useEffect(() => {
    fetchPiengData();
    const interval = setInterval(fetchPiengData, 10000); // Atualizar a cada 10s
    return () => clearInterval(interval);
  }, []);

  const fetchPiengData = async () => {
    try {
      // Buscar dados do GoTeste integrado
      const response = await fetch('http://localhost:5001/api/pieng/status');
      const data = await response.json();
      
      setPiengStatus(data.pieng_ecosystem_status);
      setSystemMetrics(data.system_health);
      setLastUpdate(data.last_updated);
      setLoading(false);
    } catch (error) {
      console.error('Erro ao buscar dados do GoTeste:', error);
      setLoading(false);
    }
  };

  const optimizePieng = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/pieng/optimize', {
        method: 'POST'
      });
      
      if (response.ok) {
        alert('Otimização do ecossistema PIENG iniciada!');
        fetchPiengData(); // Atualizar dados
      }
    } catch (error) {
      alert('Erro ao iniciar otimização');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return 'text-green-600';
      case 'offline': return 'text-red-600';
      case 'error': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'online': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'offline': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'error': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      default: return <Activity className="w-4 h-4 text-gray-500" />;
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
            <h1 className="text-3xl font-bold text-gray-900">GoTeste Monitor - PIENG</h1>
            <p className="text-gray-600">Monitoramento em tempo real do ecossistema PIENG-ENTERPRISE</p>
          </div>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={fetchPiengData}
            className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors flex items-center space-x-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Atualizar</span>
          </button>
          <button
            onClick={optimizePieng}
            className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors flex items-center space-x-2"
          >
            <Zap className="h-5 w-5" />
            <span>Otimizar Sistema</span>
          </button>
        </div>
      </div>

      {/* Status do Ecossistema PIENG */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Status do Ecossistema PIENG</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{piengStatus?.total_modules || 0}</div>
            <div className="text-sm text-gray-600">Total de Módulos</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{piengStatus?.online || 0}</div>
            <div className="text-sm text-gray-600">Online</div>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{piengStatus?.offline || 0}</div>
            <div className="text-sm text-gray-600">Offline</div>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">{piengStatus?.error || 0}</div>
            <div className="text-sm text-gray-600">Erro</div>
          </div>
        </div>
      </div>

      {/* Métricas do Sistema */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100">
              <Cpu className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">CPU Usage</p>
              <p className="text-2xl font-bold text-gray-900">{systemMetrics?.cpu_usage?.toFixed(1) || 0}%</p>
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
              <p className="text-2xl font-bold text-gray-900">{systemMetrics?.memory_usage?.toFixed(1) || 0}%</p>
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
              <p className="text-2xl font-bold text-gray-900">{systemMetrics?.disk_usage?.toFixed(1) || 0}%</p>
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
              <p className="text-2xl font-bold text-gray-900">{systemMetrics?.response_time?.toFixed(0) || 0}ms</p>
            </div>
          </div>
        </div>
      </div>

      {/* Módulos PIENG Detalhados */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Módulos PIENG Detalhados</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { name: 'Frontend Unificado', status: 'online', url: 'http://localhost:3000' },
            { name: 'Solar Generator', status: 'online', url: 'http://localhost:3001' },
            { name: 'Sistema de Gestão', status: 'online', url: 'http://localhost:3002' },
            { name: 'Image Studio', status: 'online', url: 'http://localhost:3003' },
            { name: 'Solar Analysis', status: 'online', url: 'http://localhost:3004' },
            { name: 'Automação', status: 'online', url: 'http://localhost:3005' }
          ].map((module, index) => (
            <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center space-x-3">
                {getStatusIcon(module.status)}
                <span className="font-medium">{module.name}</span>
              </div>
              <span className={`text-sm ${getStatusColor(module.status)}`}>
                {module.status.toUpperCase()}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Análise IA */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center space-x-3 mb-4">
          <Brain className="h-6 w-6 text-purple-500" />
          <h3 className="text-lg font-semibold text-gray-900">Análise Inteligente - GoTeste</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Status Atual</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• Sistema monitorado em tempo real</li>
              <li>• IA integrada (Gemini + ChatGPT)</li>
              <li>• Otimização automática ativa</li>
              <li>• Alertas inteligentes configurados</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Última Atualização</h4>
            <p className="text-sm text-gray-600">
              {lastUpdate ? new Date(lastUpdate).toLocaleString() : 'N/A'}
            </p>
            <div className="mt-4">
              <h4 className="font-medium text-gray-900 mb-2">Recomendações IA</h4>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• Monitorar CPU usage</li>
                <li>• Verificar memória disponível</li>
                <li>• Otimizar processos ativos</li>
                <li>• Manter módulos atualizados</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GoTesteReal;


