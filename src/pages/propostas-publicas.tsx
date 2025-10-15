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
      const response = await fetch('/api/propostas-publicas');
      if (response.ok) {
        const data = await response.json();
        setPropostas(data.propostas || []);
      }
    } catch (error) {
      console.error('Erro ao carregar propostas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (filename: string, displayName: string) => {
    if (!confirm(`⚠️ Tem certeza que deseja apagar a proposta de ${displayName}?\n\nEsta ação não pode ser desfeita!`)) {
      return;
    }

    try {
      const response = await fetch('/api/propostas-publicas', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename })
      });

      if (response.ok) {
        alert(`✅ Proposta de ${displayName} deletada com sucesso!`);
        loadPropostas(); // Recarregar lista
      } else {
        alert('❌ Erro ao deletar proposta');
      }
    } catch (error) {
      console.error('Erro ao deletar proposta:', error);
      alert('❌ Erro ao deletar proposta');
    }
  };

  return (
    <>
      <Head>
        <title>Propostas Públicas - PIENG Solar</title>
        <meta name="description" content="Sistema de propostas solares personalizadas - PIENG Soluções Energéticas" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-orange-50">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          {/* Header */}
          <div className="mb-8">
            <Link href="/admin" className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4 font-medium">
              ← Voltar para Admin
            </Link>

            <div className="bg-white rounded-xl shadow-lg p-8">
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                📋 Propostas Públicas
              </h1>
              <p className="text-gray-600">
                Gerencie todas as propostas disponíveis • {propostas.length} propostas ativas
              </p>
            </div>
          </div>

          {/* Lista de Propostas */}
          {loading ? (
            <div className="bg-white rounded-xl shadow-lg p-12 text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Carregando propostas...</p>
            </div>
          ) : propostas.length === 0 ? (
            <div className="bg-white rounded-xl shadow-lg p-12 text-center">
              <div className="text-6xl mb-4">📭</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                Nenhuma proposta encontrada
              </h3>
              <p className="text-gray-600 mb-6">
                Gere propostas no Gerador Rápido para vê-las aqui.
              </p>
              <Link href="/gerador-rapido" className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-orange-500 text-white rounded-lg hover:shadow-lg transition-shadow font-medium">
                ⚡ Ir para Gerador Rápido
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {propostas.map((proposta, index) => (
                <div
                  key={index}
                  className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow p-6 flex items-center justify-between"
                >
                  <div className="flex items-center space-x-4 flex-1">
                    <div className="bg-gradient-to-r from-blue-500 to-orange-500 text-white w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-800 text-lg">{proposta.displayName}</h3>
                      <p className="text-sm text-gray-500">{proposta.file}</p>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <a
                      href={`/${proposta.url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      📄 Ver
                    </a>
                    <button
                      onClick={() => {
                        const url = `https://pieng-propostas.vercel.app/${proposta.url}`;
                        navigator.clipboard.writeText(url);
                        alert('✅ Link copiado!');
                      }}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
                    >
                      📋 Copiar
                    </button>
                    <button
                      onClick={() => handleDelete(proposta.file, proposta.displayName)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                    >
                      🗑️ Apagar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Footer */}
          <div className="text-center mt-8 text-gray-500 text-sm">
            <p>PIENG Solar v2.0 • {propostas.length} propostas • Ordenadas por mais recentes</p>
          </div>
        </div>
      </div>
    </>
  );
}
