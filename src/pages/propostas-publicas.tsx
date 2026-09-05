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
  const [busca, setBusca] = useState('');
  const [filtroMes, setFiltroMes] = useState('todos');

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

  const handleCopyLink = (url: string, displayName: string) => {
    const fullUrl = `https://pieng-propostas.vercel.app/${url}`;
    navigator.clipboard.writeText(fullUrl);
    alert(`✅ Link copiado!\n\n${displayName}\n${fullUrl}`);
  };

  const handleWhatsApp = (url: string, displayName: string) => {
    const fullUrl = `https://pieng-propostas.vercel.app/${url}`;
    const message = encodeURIComponent(`Olá! Segue o link da sua proposta solar:\n\n${fullUrl}\n\nPIENG Soluções Energéticas`);
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  // Filtrar propostas
  const propostasFiltradas = propostas
    .filter(p => {
      // Filtro de busca
      if (busca && !p.displayName.toLowerCase().includes(busca.toLowerCase()) &&
          !p.name.toLowerCase().includes(busca.toLowerCase())) {
        return false;
      }

      // Filtro por mês (baseado no nome do arquivo)
      if (filtroMes !== 'todos') {
        const match = p.name.match(/(\d{2})-(\d{2})-(\d{4})/);
        if (match) {
          const [, dia, mes, ano] = match;
          const mesProposta = `${mes}-${ano}`;
          if (mesProposta !== filtroMes) {
            return false;
          }
        }
      }

      return true;
    })
    // Filtrar propostas de teste
    .filter(p => {
      const nomeLower = p.name.toLowerCase();
      const isTest = nomeLower.includes('teste') ||
                     nomeLower.includes('test') ||
                     nomeLower.includes('cliente-padrao') ||
                     nomeLower.includes('daniel');
      return !isTest;
    });

  // Extrair meses únicos para o filtro
  const mesesDisponiveis = Array.from(new Set(
    propostas
      .map(p => {
        const match = p.name.match(/(\d{2})-(\d{2})-(\d{4})/);
        return match ? `${match[2]}-${match[3]}` : null;
      })
      .filter(Boolean)
  )).sort().reverse();

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
              <p className="text-gray-600 mb-6">
                Gerencie todas as propostas disponíveis • {propostas.length} total • {propostasFiltradas.length} exibidas
              </p>

              {/* Filtros */}
              <div className="flex flex-col md:flex-row gap-4 mt-6">
                {/* Busca */}
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="🔍 Buscar por nome ou data..."
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Filtro por Mês */}
                <div className="md:w-64">
                  <select
                    value={filtroMes}
                    onChange={(e) => setFiltroMes(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="todos">📅 Todos os meses</option>
                    {mesesDisponiveis.map(mes => (
                      <option key={mes} value={mes}>
                        {mes?.split('-').reverse().join('/')}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Botão Limpar Filtros */}
                {(busca || filtroMes !== 'todos') && (
                  <button
                    onClick={() => {
                      setBusca('');
                      setFiltroMes('todos');
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    🔄 Limpar
                  </button>
                )}
              </div>
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
                Gere propostas na Proposta manual para vê-las aqui.
              </p>
              <Link href="/gerador-rapido" className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-orange-500 text-white rounded-lg hover:shadow-lg transition-shadow font-medium">
                📝 Ir para Proposta manual
              </Link>
            </div>
          ) : propostasFiltradas.length === 0 ? (
            <div className="bg-white rounded-xl shadow-lg p-12 text-center">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                Nenhuma proposta encontrada
              </h3>
              <p className="text-gray-600 mb-6">
                Tente ajustar os filtros de busca
              </p>
              <button
                onClick={() => {
                  setBusca('');
                  setFiltroMes('todos');
                }}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                🔄 Limpar Filtros
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {propostasFiltradas.map((proposta, index) => (
                <div
                  key={index}
                  className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow p-6"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Info da Proposta */}
                    <div className="flex items-center space-x-4 flex-1">
                      <div className="bg-gradient-to-r from-blue-500 to-orange-500 text-white w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-800 text-lg truncate">{proposta.displayName}</h3>
                        <p className="text-sm text-gray-500 truncate">{proposta.name}</p>
                      </div>
                    </div>

                    {/* Ações */}
                    <div className="flex flex-wrap gap-2">
                      <a
                        href={`/${proposta.url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2"
                      >
                        📄 Ver
                      </a>
                      <button
                        onClick={() => handleCopyLink(proposta.url, proposta.displayName)}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium flex items-center gap-2"
                        title="Copiar link para compartilhar"
                      >
                        📋 Copiar
                      </button>
                      <button
                        onClick={() => handleWhatsApp(proposta.url, proposta.displayName)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center gap-2"
                        title="Compartilhar no WhatsApp"
                      >
                        💬 WhatsApp
                      </button>
                      <button
                        onClick={() => handleDelete(proposta.file, proposta.displayName)}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium flex items-center gap-2"
                        title="Apagar proposta"
                      >
                        🗑️
                      </button>
                    </div>
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
