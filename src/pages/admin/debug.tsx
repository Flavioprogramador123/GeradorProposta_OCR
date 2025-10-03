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

export default function AdminIndex() {
  const [clientes, setClientes] = useState<ClienteInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadClientesData();
  }, []);

  const loadClientesData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Carregando dados dos clientes...');
      const response = await fetch('/api/admin/clientes');
      console.log('Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Dados recebidos:', data);
        setClientes(data.clientes || []);
      } else {
        const errorText = await response.text();
        console.error('Erro na resposta:', errorText);
        setError(`Erro ${response.status}: ${errorText}`);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setError(`Erro de conexão: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Admin - PIENG Solar</title>
        <meta name="description" content="Área administrativa do sistema PIENG Solar" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-orange-50">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-7xl mx-auto">
            
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                🏢 Área Administrativa - DEBUG
              </h1>
              <p className="text-gray-600">
                Sistema PIENG Solar - Lista de Clientes
              </p>
            </div>

            {/* Debug Info */}
            <div className="bg-yellow-100 border border-yellow-400 rounded-lg p-4 mb-6">
              <h3 className="font-bold text-yellow-800 mb-2">🐛 Debug Info:</h3>
              <p><strong>Loading:</strong> {loading ? 'Sim' : 'Não'}</p>
              <p><strong>Erro:</strong> {error || 'Nenhum'}</p>
              <p><strong>Clientes encontrados:</strong> {clientes.length}</p>
              <button 
                onClick={loadClientesData}
                className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                🔄 Recarregar Dados
              </button>
            </div>

            {/* Lista de Clientes */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-800">
                  📋 Lista de Clientes
                </h2>
              </div>

              {loading ? (
                <div className="p-8 text-center">
                  <div className="text-gray-500">🔄 Carregando clientes...</div>
                </div>
              ) : error ? (
                <div className="p-8 text-center">
                  <div className="text-red-500 mb-4">❌ Erro: {error}</div>
                  <button 
                    onClick={loadClientesData}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    🔄 Tentar Novamente
                  </button>
                </div>
              ) : clientes.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="text-gray-500 mb-4">📭 Nenhum cliente encontrado</div>
                  <button 
                    onClick={loadClientesData}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
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
                          Cidade
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
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              cliente.status === 'concluido' ? 'bg-green-100 text-green-800' :
                              cliente.status === 'em_andamento' ? 'bg-yellow-100 text-yellow-800' :
                              cliente.status === 'aguardando_orcamentos' ? 'bg-blue-100 text-blue-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {cliente.status === 'concluido' ? '✅ Concluído' :
                               cliente.status === 'em_andamento' ? '🔄 Em Andamento' :
                               cliente.status === 'aguardando_orcamentos' ? '⏳ Aguardando' :
                               '❌ Erro'}
                            </span>
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
              <p>PIENG Solar - Sistema de Propostas v2.0 | Debug Mode</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}



