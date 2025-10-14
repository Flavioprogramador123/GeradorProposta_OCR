import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';

interface Cliente {
  nome: string;
  pasta: string;
  cidade: string;
  estado: string;
  consumoMensal: number;
}

interface OrcamentoItem {
  id: string;
  cliente: string;
  clientePasta: string;
  potencia: number;
  modulos: number;
  inversores: number;
  valorTotal: number;
  status: 'pendente' | 'aprovado' | 'rejeitado';
  data: string;
  geracaoMensal?: number;
  paybackMeses?: number;
  cobertura?: number;
}

export default function TodosOrcamentos() {
  const router = useRouter();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [orcamentos, setOrcamentos] = useState<OrcamentoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<'todos' | 'pendente' | 'aprovado' | 'rejeitado'>('todos');
  const [busca, setBusca] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Carregar todos os orçamentos diretamente das propostas
      const orcamentosRes = await fetch('/api/admin/orcamentos-todos');
      if (orcamentosRes.ok) {
        const orcamentosData = await orcamentosRes.json();
        setOrcamentos(orcamentosData.orcamentos || []);
        
        // Extrair clientes únicos dos orçamentos
        const clientesUnicos = new Map();
        (orcamentosData.orcamentos || []).forEach((orc: OrcamentoItem) => {
          if (!clientesUnicos.has(orc.clientePasta)) {
            clientesUnicos.set(orc.clientePasta, {
              nome: orc.cliente,
              pasta: orc.clientePasta,
              cidade: 'N/A', // Será preenchido se necessário
              status: 'ativo',
              ultimaModificacao: orc.data,
              temProposta: true
            });
          }
        });
        
        setClientes(Array.from(clientesUnicos.values()));
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const orcamentosFiltrados = orcamentos
    .filter(orc => filtro === 'todos' || orc.status === filtro)
    .filter(orc => 
      busca === '' || 
      orc.cliente.toLowerCase().includes(busca.toLowerCase()) ||
      orc.id.toLowerCase().includes(busca.toLowerCase())
    );

  const stats = {
    total: orcamentos.length,
    pendentes: orcamentos.filter(o => o.status === 'pendente').length,
    aprovados: orcamentos.filter(o => o.status === 'aprovado').length,
    rejeitados: orcamentos.filter(o => o.status === 'rejeitado').length,
  };

  return (
    <>
      <Head>
        <title>Todos os Orçamentos | PIENG</title>
        <meta name="description" content="Gerenciar todos os orçamentos do sistema" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                  📋 Todos os Orçamentos
                </h1>
                <p className="text-gray-600 mt-1">Visão geral de todos os orçamentos do sistema</p>
              </div>
              <Link href="/admin" legacyBehavior>
                <a className="px-4 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2">
                  ← Voltar
                </a>
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl p-6 shadow-lg">
                <div className="text-3xl mb-2">📊</div>
                <div className="text-2xl font-bold text-gray-800">{stats.total}</div>
                <div className="text-sm text-gray-600">Total de Orçamentos</div>
              </div>
              <div className="bg-yellow-50 rounded-xl p-6 shadow-lg border border-yellow-200">
                <div className="text-3xl mb-2">⏳</div>
                <div className="text-2xl font-bold text-yellow-700">{stats.pendentes}</div>
                <div className="text-sm text-yellow-600">Pendentes</div>
              </div>
              <div className="bg-green-50 rounded-xl p-6 shadow-lg border border-green-200">
                <div className="text-3xl mb-2">✅</div>
                <div className="text-2xl font-bold text-green-700">{stats.aprovados}</div>
                <div className="text-sm text-green-600">Aprovados</div>
              </div>
              <div className="bg-red-50 rounded-xl p-6 shadow-lg border border-red-200">
                <div className="text-3xl mb-2">❌</div>
                <div className="text-2xl font-bold text-red-700">{stats.rejeitados}</div>
                <div className="text-sm text-red-600">Rejeitados</div>
              </div>
            </div>
          </div>

          {/* Filtros */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="🔍 Buscar por cliente ou ID do orçamento..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setFiltro('todos')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filtro === 'todos' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setFiltro('pendente')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filtro === 'pendente' 
                      ? 'bg-yellow-500 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Pendentes
                </button>
                <button
                  onClick={() => setFiltro('aprovado')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filtro === 'aprovado' 
                      ? 'bg-green-600 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Aprovados
                </button>
              </div>
            </div>
          </div>

          {/* Lista de Orçamentos */}
          {loading ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">⏳</div>
              <p className="text-gray-600">Carregando orçamentos...</p>
            </div>
          ) : orcamentosFiltrados.length === 0 ? (
            <div className="bg-white rounded-xl shadow-lg p-12 text-center">
              <div className="text-6xl mb-4">📭</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                Nenhum orçamento encontrado
              </h3>
              <p className="text-gray-600">
                {busca ? 'Tente buscar com outros termos' : 'Crie seu primeiro orçamento para um cliente'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {orcamentosFiltrados.map((orc, index) => (
                <div
                  key={`${orc.clientePasta}-${orc.id}-${index}`}
                  className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-gray-800">{orc.cliente}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          orc.status === 'aprovado' 
                            ? 'bg-green-100 text-green-700' 
                            : orc.status === 'rejeitado'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {orc.status === 'aprovado' ? '✅ Aprovado' : orc.status === 'rejeitado' ? '❌ Rejeitado' : '⏳ Pendente'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Potência:</span>
                          <div className="font-medium text-gray-800">{orc.potencia.toFixed(2)} kWp</div>
                        </div>
                        <div>
                          <span className="text-gray-500">Módulos:</span>
                          <div className="font-medium text-gray-800">{orc.modulos} un</div>
                        </div>
                        <div>
                          <span className="text-gray-500">Inversores:</span>
                          <div className="font-medium text-gray-800">{orc.inversores} un</div>
                        </div>
                        <div>
                          <span className="text-gray-500">Valor:</span>
                          <div className="font-medium text-green-600">
                            R$ {orc.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                        {orc.geracaoMensal && (
                          <div>
                            <span className="text-gray-500">Geração:</span>
                            <div className="font-medium text-blue-600">{orc.geracaoMensal.toFixed(0)} kWh/mês</div>
                          </div>
                        )}
                        {orc.paybackMeses && (
                          <div>
                            <span className="text-gray-500">Payback:</span>
                            <div className="font-medium text-purple-600">{orc.paybackMeses.toFixed(0)} meses</div>
                          </div>
                        )}
                      </div>
                      <div className="mt-2 text-xs text-gray-500">
                        ID: {orc.id} • {new Date(orc.data).toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/admin/orcamentos/${orc.clientePasta}`} legacyBehavior>
                        <a className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
                          📋 Ver Orçamentos
                        </a>
                      </Link>
                      <Link href={`/admin/orcamentos/${orc.clientePasta}/consultor`} legacyBehavior>
                        <a className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2">
                          🎛️ Consultor
                        </a>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

