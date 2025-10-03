import { useState, useEffect } from 'react';
import Head from 'next/head';

interface ClienteInfo {
  nome: string;
  cidade: string;
  pasta: string;
  status: string;
  ultimaModificacao: string;
  temProposta: boolean;
}

export default function AdminSimples() {
  const [clientes, setClientes] = useState<ClienteInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('🔄 useEffect executado - carregando clientes...');
    loadClientesData();
  }, []);

  const loadClientesData = async () => {
    try {
      console.log('📡 Fazendo fetch para /api/admin/clientes...');
      const response = await fetch('/api/admin/clientes');
      console.log('📡 Resposta recebida:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📊 Dados recebidos:', data);
        setClientes(data.clientes || []);
        setError(null);
      } else {
        setError(`Erro HTTP: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar dados:', error);
      setError(`Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      'concluido': 'bg-green-100 text-green-800',
      'em_andamento': 'bg-yellow-100 text-yellow-800',
      'aguardando_orcamentos': 'bg-blue-100 text-blue-800',
      'erro': 'bg-red-100 text-red-800'
    };
    
    const labels = {
      'concluido': '✅ Concluído',
      'em_andamento': '🔄 Em Andamento',
      'aguardando_orcamentos': '⏳ Aguardando',
      'erro': '❌ Erro'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badges[status as keyof typeof badges] || badges.aguardando_orcamentos}`}>
        {labels[status as keyof typeof labels] || '⏳ Aguardando'}
      </span>
    );
  };

  return (
    <>
      <Head>
        <title>Admin Simples - PIENG Solar</title>
        <meta name="description" content="Área administrativa simplificada" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-orange-50">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-7xl mx-auto">
            
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                🏢 Admin Simples - PIENG Solar
              </h1>
              <p className="text-gray-600">
                Versão simplificada para debug
              </p>
            </div>

            {/* Debug Info */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                🔍 Debug Info
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium text-gray-700">Status</h3>
                  <p className="text-sm text-gray-600">
                    {loading ? 'Carregando...' : 'Carregado'}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium text-gray-700">Total Clientes</h3>
                  <p className="text-sm text-gray-600">
                    {clientes.length}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium text-gray-700">Erro</h3>
                  <p className="text-sm text-gray-600">
                    {error || 'Nenhum'}
                  </p>
                </div>
              </div>
              
              <div className="mt-4">
                <button
                  onClick={loadClientesData}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  🔄 Recarregar Dados
                </button>
              </div>
            </div>

            {/* Lista de Clientes */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-800">
                  📋 Lista de Clientes ({clientes.length})
                </h2>
              </div>

              {loading ? (
                <div className="p-8 text-center">
                  <div className="text-gray-500">Carregando...</div>
                </div>
              ) : error ? (
                <div className="p-8 text-center">
                  <div className="text-red-500 mb-4">Erro: {error}</div>
                  <button
                    onClick={loadClientesData}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    🔄 Tentar Novamente
                  </button>
                </div>
              ) : clientes.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="text-gray-500 mb-4">Nenhum cliente encontrado</div>
                  <button
                    onClick={loadClientesData}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    🔄 Recarregar
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Cliente
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Localização
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Última Modificação
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {clientes.map((cliente, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-medium text-gray-900">
                              {cliente.nome}
                            </div>
                            <div className="text-sm text-gray-500">
                              Pasta: {cliente.pasta}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {cliente.cidade}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getStatusBadge(cliente.status)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {cliente.ultimaModificacao}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="text-center mt-8 text-gray-500 text-sm">
              <p>PIENG Solar - Admin Simples v1.0</p>
              <p>Debug mode ativo</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
