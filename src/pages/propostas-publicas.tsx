import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';

interface PropostaInfo {
  file: string;
  name: string;
  displayName: string;
  url: string;
}

export default function PropostasPublicas() {
  const [propostas, setPropostas] = useState<PropostaInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPropostas();
  }, []);

  const loadPropostas = async () => {
    try {
      // Tentar carregar propostas do index.html gerado
      const response = await fetch('/api/propostas-publicas');
      if (response.ok) {
        const data = await response.json();
        setPropostas(data.propostas || []);
      } else {
        // Fallback com propostas conhecidas
        const fallbackPropostas = [
          {
            file: 'proposta_marcelo-14-10-2025.html',
            name: 'marcelo-14-10-2025',
            displayName: 'Marcelo',
            url: 'orçamento/clientes/proposta_marcelo-14-10-2025.html'
          },
          {
            file: 'proposta_daniel-verdura-29-09-2025.html',
            name: 'daniel-verdura-29-09-2025',
            displayName: 'Daniel Verdura',
            url: 'orçamento/clientes/proposta_daniel-verdura-29-09-2025.html'
          },
          {
            file: 'proposta_cliente-padrao-14-10-2025.html',
            name: 'cliente-padrao-14-10-2025',
            displayName: 'Cliente Padrão',
            url: 'orçamento/clientes/proposta_cliente-padrao-14-10-2025.html'
          }
        ];
        setPropostas(fallbackPropostas);
      }
    } catch (error) {
      console.error('Erro ao carregar propostas:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Propostas Públicas - PIENG Solar</title>
        <meta name="description" content="Sistema de propostas solares personalizadas - PIENG Soluções Energéticas" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="text-center mb-8">
            <Link href="/admin" legacyBehavior>
              <a className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4">
                ← Voltar para Admin
              </a>
            </Link>
            
            <h1 className="text-4xl font-bold text-gray-800 mb-2">
              🌞 PIENG Soluções Energéticas
            </h1>
            <p className="text-xl text-gray-600 mb-4">
              Sistema de Propostas Solares Personalizadas
            </p>
            <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                📋 Propostas Disponíveis
              </h2>
              <p className="text-gray-600 mb-4">
                Esta é a página principal que os clientes acessam para ver suas propostas solares.
                Todas as propostas são geradas automaticamente e ficam disponíveis aqui.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-800 text-sm">
                  <strong>💡 Dica:</strong> Esta página é gerada automaticamente pelo sistema e 
                  contém todas as propostas dos clientes. Os links direcionam para as propostas 
                  completas com análise detalhada.
                </p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-lg p-6 text-center">
              <div className="text-3xl mb-2">📊</div>
              <h3 className="text-lg font-semibold text-gray-800 mb-1">Total de Propostas</h3>
              <p className="text-2xl font-bold text-blue-600">{propostas.length}</p>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-6 text-center">
              <div className="text-3xl mb-2">🌐</div>
              <h3 className="text-lg font-semibold text-gray-800 mb-1">Acesso Público</h3>
              <p className="text-2xl font-bold text-green-600">100%</p>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-6 text-center">
              <div className="text-3xl mb-2">⚡</div>
              <h3 className="text-lg font-semibold text-gray-800 mb-1">Atualização</h3>
              <p className="text-2xl font-bold text-purple-600">Automática</p>
            </div>
          </div>

          {/* Lista de Propostas */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">📋 Propostas Disponíveis</h2>
              <p className="text-gray-600">Clique em qualquer proposta para visualizar</p>
            </div>

            {loading ? (
              <div className="p-8 text-center">
                <div className="text-4xl mb-4">⏳</div>
                <p className="text-gray-600">Carregando propostas...</p>
              </div>
            ) : propostas.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-6xl mb-4">📭</div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">
                  Nenhuma proposta encontrada
                </h3>
                <p className="text-gray-600 mb-4">
                  Execute o sistema para gerar propostas ou verifique se há arquivos na pasta.
                </p>
                <Link href="/admin" legacyBehavior>
                  <a className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    🔧 Ir para Admin
                  </a>
                </Link>
              </div>
            ) : (
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {propostas.map((proposta, index) => (
                    <div
                      key={index}
                      className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-gray-800">{proposta.displayName}</h3>
                        <span className="text-xs text-gray-500">#{index + 1}</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">
                        Proposta solar personalizada com análise completa de viabilidade e retorno do investimento.
                      </p>
                      <div className="flex space-x-2">
                        <a
                          href={`/${proposta.url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 bg-blue-600 text-white text-center py-2 px-3 rounded-md hover:bg-blue-700 transition-colors text-sm"
                        >
                          📄 Ver Proposta
                        </a>
                        <button
                          onClick={() => {
                            const url = `https://pieng-propostas-solares.netlify.app/${proposta.url}`;
                            navigator.clipboard.writeText(url);
                            alert('Link copiado para a área de transferência!');
                          }}
                          className="bg-gray-600 text-white py-2 px-3 rounded-md hover:bg-gray-700 transition-colors text-sm"
                        >
                          📋 Copiar Link
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="text-center mt-8 text-gray-500 text-sm">
            <p>PIENG Solar - Sistema de Propostas v2.0 | Next.js + Netlify</p>
            <p>Desenvolvido com ⚡ energia solar e ☕ muito café</p>
          </div>
        </div>
      </div>
    </>
  );
}
