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

interface SistemaItem {
  titulo: string;
  potencia: number;
  modulos: number;
  inversores: number;
  valorTotal?: number;
  total_final?: number;
  ppix?: number;
  precoPixDecimal?: number;
  precoPix?: number;
  pavista?: number;
  valor?: number;
  preco?: number;
  preco_final?: number;
  geracaoMensal?: number;
  paybackMeses?: number;
  cobertura?: number;
}

interface OrcamentoItem {
  id: string;
  propostaId?: string; // ID do Supabase
  cliente: string;
  clientePasta: string;
  sistemas: SistemaItem[]; // ✅ Array de sistemas
  status: 'pendente' | 'aprovado' | 'rejeitado';
  data: string;
  totalSistemas: number;
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
      console.log('🔍 Carregando orçamentos...');
      setLoading(true);
      
      // Carregar todos os orçamentos diretamente das propostas
      const orcamentosRes = await fetch('/api/admin/orcamentos-todos');
      console.log('📡 Response status:', orcamentosRes.status);

      if (orcamentosRes.ok) {
        const orcamentosData = await orcamentosRes.json();
        console.log('✅ Dados recebidos:', {
          total: orcamentosData.orcamentos?.length || 0,
          source: orcamentosData.source,
          stats: orcamentosData.stats,
          primeiroOrcamento: orcamentosData.orcamentos?.[0]
        });

        // Sempre definir orçamentos, mesmo se vazio
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
        console.log('✅ Orçamentos carregados com sucesso!', orcamentosData.orcamentos?.length || 0);
      } else {
        const errorText = await orcamentosRes.text();
        console.error('❌ Erro na resposta:', orcamentosRes.status, errorText);
        // Definir arrays vazios em caso de erro
        setOrcamentos([]);
        setClientes([]);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar dados:', error);
      // Definir arrays vazios em caso de erro
      setOrcamentos([]);
      setClientes([]);
    } finally {
      console.log('✅ Loading finalizado');
      setLoading(false);
    }
  };

  const handleExcluirProposta = async (clientePasta: string, clienteNome: string) => {
    // Primeira confirmação
    const primeiraConfirmacao = window.confirm(
      `⚠️ ATENÇÃO: Você realmente deseja excluir TODOS os dados do cliente "${clienteNome}"?\n\n` +
      `Esta ação irá deletar:\n` +
      `• Cliente\n` +
      `• Todas as propostas\n` +
      `• Todos os orçamentos\n` +
      `• Todos os analytics\n\n` +
      `Esta ação NÃO pode ser desfeita!`
    );

    if (!primeiraConfirmacao) {
      return;
    }

    // Segunda confirmação
    const segundaConfirmacao = window.confirm(
      `🔴 CONFIRMAÇÃO FINAL\n\n` +
      `Você tem CERTEZA ABSOLUTA que deseja excluir TUDO relacionado a "${clienteNome}"?\n\n` +
      `Todos os dados serão PERMANENTEMENTE removidos do Supabase.\n\n` +
      `Clique em "OK" para confirmar ou "Cancelar" para abortar.`
    );

    if (!segundaConfirmacao) {
      return;
    }

    try {
      setLoading(true);
      
      console.log(`🗑️ Iniciando exclusão completa do cliente: ${clienteNome} (${clientePasta})`);
      
      // Tentar primeiro pela pasta, se falhar tentar pelo nome
      let response = await fetch(`/api/admin/clientes/${encodeURIComponent(clientePasta)}`, {
        method: 'DELETE',
      });
      
      // Se não encontrou pela pasta, tentar pelo nome
      if (!response.ok && response.status === 404) {
        console.log(`⚠️ Cliente não encontrado pela pasta "${clientePasta}", tentando pelo nome "${clienteNome}"`);
        response = await fetch(`/api/admin/clientes/${encodeURIComponent(clienteNome)}`, {
          method: 'DELETE',
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.details || 'Erro ao excluir cliente');
      }

      const result = await response.json();
      console.log('✅ Exclusão completa:', result);

      // Recarregar lista após exclusão
      await loadData();
      
      alert(`✅ Cliente "${clienteNome}" e todos os dados relacionados foram excluídos com sucesso!\n\n` +
            `Deletado:\n` +
            `• Cliente\n` +
            `• ${result.deleted?.propostas || 0} proposta(s)\n` +
            `• ${result.deleted?.analytics || 0} registro(s) de analytics`);
    } catch (error) {
      console.error('❌ Erro ao excluir cliente:', error);
      alert(`❌ Erro ao excluir cliente: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
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
                  {/* Header do Cliente */}
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-gray-800">{orc.cliente}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          orc.status === 'aprovado'
                            ? 'bg-green-100 text-green-700'
                            : orc.status === 'rejeitado'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {orc.status === 'aprovado' ? '✅ Aprovado' : orc.status === 'rejeitado' ? '❌ Rejeitado' : '⏳ Pendente'}
                        </span>
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                          {orc.totalSistemas} {orc.totalSistemas === 1 ? 'Proposta' : 'Propostas'}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {orc.propostaId && <>ID Banco: {orc.propostaId.slice(0, 8)}... • </>}
                        ID: {orc.id} • {new Date(orc.data).toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {orc.clientePasta ? (
                        <>
                          {/* ✅ Botão "Editar" - Busca dados do Supabase via /api/propostas/[slug] */}
                          <Link href={`/gerador-rapido?cliente=${orc.clientePasta}`} legacyBehavior>
                            <a className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2">
                              ✏️ Editar
                            </a>
                          </Link>
                          <Link href={`/admin/orcamentos/${orc.clientePasta}`} legacyBehavior>
                            <a className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
                              📋 Gerenciar
                            </a>
                          </Link>
                          <Link href={`/admin/orcamentos/${orc.clientePasta}/consultor`} legacyBehavior>
                            <a className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2">
                              🎛️ Consultor
                            </a>
                          </Link>
                          <button
                            onClick={() => {
                              window.open(`/proposta/${orc.clientePasta}`, '_blank');
                            }}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                            title="Ver proposta"
                          >
                            🔗 Ver Proposta
                          </button>
                          <button
                            onClick={() => handleExcluirProposta(orc.clientePasta, orc.cliente)}
                            disabled={loading}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Excluir proposta permanentemente"
                          >
                            🗑️ Excluir
                          </button>
                        </>
                      ) : (
                        <span className="px-4 py-2 bg-gray-400 text-white rounded-lg opacity-50 cursor-not-allowed">
                          Sem pasta do cliente
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Lista de Sistemas/Propostas */}
                  <div className="border-t border-gray-200 pt-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Sistemas Propostos:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {orc.sistemas.map((sistema, sIndex) => (
                        <div key={sIndex} className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                          <h5 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                            <span className="text-blue-600">#{sIndex + 1}</span>
                            {sistema.titulo}
                          </h5>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Potência:</span>
                              <span className="font-medium text-gray-800">{sistema.potencia.toFixed(2)} kWp</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Módulos:</span>
                              <span className="font-medium text-gray-800">{sistema.modulos} un</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Inversores:</span>
                              <span className="font-medium text-gray-800">{sistema.inversores} un</span>
                            </div>
                            <div className="flex justify-between border-t border-blue-200 pt-2 mt-2">
                              <span className="text-gray-600 font-medium">Valor:</span>
                              <span className="font-bold text-green-600">
                                R$ {(() => {
                                  // Função para converter valor para número
                                  const converterValor = (val: any): number => {
                                    if (val === null || val === undefined) return 0;
                                    if (typeof val === 'number') return isNaN(val) ? 0 : val;
                                    if (typeof val === 'string') {
                                      const limpo = val.replace(/[R$\s\.]/g, '').replace(',', '.');
                                      const num = parseFloat(limpo);
                                      return isNaN(num) ? 0 : num;
                                    }
                                    return 0;
                                  };

                                  // Tentar múltiplos campos na ordem de prioridade
                                  const valor = converterValor(
                                    sistema.valorTotal ?? 
                                    sistema.ppix ?? 
                                    sistema.total_final ?? 
                                    sistema.precoPixDecimal ??
                                    sistema.precoPix ??
                                    sistema.pavista ??
                                    sistema.valor ??
                                    sistema.preco ??
                                    sistema.preco_final ??
                                    0
                                  );

                                  // Log para debug se valor for 0
                                  if (valor === 0 && sIndex === 0) {
                                    console.warn('⚠️ Sistema sem valor no frontend:', {
                                      sistema: sistema.titulo,
                                      campos: {
                                        valorTotal: sistema.valorTotal,
                                        ppix: sistema.ppix,
                                        total_final: sistema.total_final,
                                        precoPixDecimal: sistema.precoPixDecimal,
                                        precoPix: sistema.precoPix,
                                        pavista: sistema.pavista
                                      }
                                    });
                                  }

                                  return valor > 0 
                                    ? valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                    : '0,00';
                                })()}
                              </span>
                            </div>
                            {sistema.geracaoMensal && typeof sistema.geracaoMensal === 'number' && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Geração:</span>
                                <span className="font-medium text-blue-600">{sistema.geracaoMensal.toFixed(0)} kWh/mês</span>
                              </div>
                            )}
                            {sistema.paybackMeses && typeof sistema.paybackMeses === 'number' && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Payback:</span>
                                <span className="font-medium text-purple-600">{sistema.paybackMeses.toFixed(1)} meses</span>
                              </div>
                            )}
                            {sistema.cobertura && typeof sistema.cobertura === 'number' && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Cobertura:</span>
                                <span className="font-medium text-orange-600">{sistema.cobertura.toFixed(0)}%</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
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

