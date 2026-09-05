import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import InstallPWA from '@/components/InstallPWA';
import { AdminThemePicker } from '@/components/AdminThemePicker';

interface ClienteInfo {
  nome: string;
  cidade: string;
  pasta: string;
  status: string;
  ultimaModificacao: string;
  temProposta: boolean;
  id?: string;
  email?: string;
  telefone?: string;
  propostaPausada?: boolean;
  analytics?: {
    visualizacoes: number;
    ultimaVisualizacao: string | null;
    precisaContato: boolean;
  } | null;
}

export default function AdminIndex() {
  const router = useRouter();
  const [clientes, setClientes] = useState<ClienteInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalClientes: 0,
    proposasGeradas: 0,
    aguardandoOrcamentos: 0
  });
  const [limpandoTestes, setLimpandoTestes] = useState(false);

  useEffect(() => {
    loadClientesData();
  }, []);

  const loadClientesData = async () => {
    try {
      // Tentar primeiro a API principal
      let response = await fetch(`/api/admin/clientes?t=${Date.now()}`);
      
      // Se falhar, tentar a API alternativa para Netlify
      if (!response.ok) {
        console.log('API principal falhou, tentando API alternativa...');
        response = await fetch(`/api/admin/clientes-netlify?t=${Date.now()}`);
      }

      // Se ainda falhar, tentar carregar do JSON estático
      if (!response.ok) {
        console.log('APIs falharam, tentando JSON estático...');
        response = await fetch(`/clientes-data.json?t=${Date.now()}`);
      }

      if (response.ok) {
        const data = await response.json();
        console.log('Dados carregados:', data); // Log temporário para debug
        setClientes(data.clientes || []);
        setStats(data.stats || stats);
        console.log(`Clientes carregados: ${data.clientes?.length || 0}`);
      } else {
        console.error('Erro na API de clientes:', response.status);
        // Usar dados de fallback
        const fallbackClientes = [
          {
            nome: "MARCELO",
            cidade: "Anápolis/GO",
            pasta: "marcelo-14-10-2025",
            status: "proposta_gerada",
            ultimaModificacao: "14/10/2025",
            temProposta: true
          }
        ];
        setClientes(fallbackClientes);
        setStats({
          totalClientes: 1,
          proposasGeradas: 1,
          aguardandoOrcamentos: 0
        });
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      // Usar dados de fallback em caso de erro
      const fallbackClientes = [
        {
          nome: "MARCELO",
          cidade: "Anápolis/GO",
          pasta: "marcelo-14-10-2025",
          status: "proposta_gerada",
          ultimaModificacao: "14/10/2025",
          temProposta: true
        }
      ];
      setClientes(fallbackClientes);
      setStats({
        totalClientes: 1,
        proposasGeradas: 1,
        aguardandoOrcamentos: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (cliente: ClienteInfo) => {
    const status = cliente.status;
    const config: Record<string, { className: string; label: string; title: string }> = {
      aguardando_orcamentos: {
        className: 'bg-slate-100 text-slate-700',
        label: '⏳ Sem proposta',
        title: 'Cliente ainda sem proposta gerada',
      },
      nao_aberta: {
        className: 'bg-amber-100 text-amber-900',
        label: '📭 Não aberta',
        title: 'Proposta gerada — cliente ainda não abriu o link',
      },
      visualizada: {
        className: 'bg-blue-100 text-blue-800',
        label: '👁️ Aberta',
        title: cliente.analytics?.ultimaVisualizacao
          ? `Última abertura: ${new Date(cliente.analytics.ultimaVisualizacao).toLocaleString('pt-BR')}`
          : 'Cliente abriu a proposta',
      },
      interessada: {
        className: 'bg-emerald-100 text-emerald-800',
        label: '⭐ Interesse',
        title: 'Tempo ou scroll alto na proposta',
      },
      precisa_contato: {
        className: 'bg-red-100 text-red-800',
        label: '⚠️ Contatar',
        title: 'Há dias sem visualizar ou alerta de contato',
      },
      pausada: {
        className: 'bg-gray-200 text-gray-600',
        label: '⏸️ Pausada',
        title: 'Proposta suspensa',
      },
      concluido: {
        className: 'bg-green-100 text-green-800',
        label: '✅ Concluído',
        title: 'Concluído',
      },
      erro: {
        className: 'bg-red-100 text-red-800',
        label: '❌ Erro',
        title: 'Erro',
      },
    };

    const item = config[status] || {
      className: 'bg-slate-100 text-slate-700',
      label: status || '—',
      title: status,
    };

    const badge = (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${item.className} ${
          cliente.temProposta ? 'hover:ring-2 hover:ring-offset-1 hover:ring-blue-300 cursor-pointer' : ''
        }`}
        title={item.title}
      >
        {item.label}
        {cliente.analytics && cliente.analytics.visualizacoes > 0 ? (
          <span className="ml-1 opacity-70">· {cliente.analytics.visualizacoes}x</span>
        ) : null}
      </span>
    );

    if (!cliente.temProposta) return badge;

    return (
      <Link href={`/admin/analytics/${cliente.pasta}`} legacyBehavior>
        <a className="inline-block" title={`${item.title} — ver analytics`}>
          {badge}
        </a>
      </Link>
    );
  };

  const clienteApiKey = (cliente: ClienteInfo) => cliente.id || cliente.pasta;

  const deleteCliente = async (cliente: ClienteInfo) => {
    if (!confirm(`Tem certeza que deseja excluir o cliente "${cliente.nome}"?\n\nEsta ação não pode ser desfeita e removerá todos os dados, orçamentos e propostas do cliente.`)) return;

    const key = clienteApiKey(cliente);
    try {
      const response = await fetch(`/api/admin/clientes/${encodeURIComponent(key)}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        loadClientesData();
        alert(`Cliente "${cliente.nome}" excluído com sucesso!`);
      } else {
        const errorData = await response.json();
        alert(`Erro ao excluir cliente: ${errorData.message}`);
      }
    } catch (error) {
      alert('Erro ao excluir cliente');
    }
  };

  const togglePausarProposta = async (cliente: ClienteInfo) => {
    const novoPausado = !cliente.propostaPausada;
    const acao = novoPausado ? 'pausar' : 'reativar';
    if (!confirm(`Deseja ${acao} a proposta de "${cliente.nome}"?\n\n${novoPausado ? '⏸️ A proposta ficará marcada como desatualizada/suspensa.' : '▶️ A proposta voltará a ficar ativa.'}`)) return;

    const key = clienteApiKey(cliente);
    try {
      const response = await fetch(`/api/admin/clientes/${encodeURIComponent(key)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propostaPausada: novoPausado }),
      });

      if (response.ok) {
        setClientes(prev =>
          prev.map(c =>
            clienteApiKey(c) === key ? { ...c, propostaPausada: novoPausado } : c
          )
        );
      } else {
        alert('Erro ao alterar status da proposta.');
      }
    } catch {
      alert('Erro ao alterar status da proposta.');
    }
  };

  const propostaUrlPublica = (pasta: string) =>
    `https://pieng-propostas.vercel.app/proposta/${pasta}`;

  /** Ordem: Ver → Editar | Copiar → WhatsApp | Pausar → Excluir */
  const renderClienteAcoes = (cliente: ClienteInfo, compact = false) => {
    const btn = compact
      ? 'px-2 py-1 rounded text-xs font-medium'
      : 'px-2 py-1 rounded text-sm font-medium';
    const sep = 'w-px self-stretch bg-slate-200 mx-0.5 hidden sm:block';
    const ativa = cliente.temProposta && !cliente.propostaPausada;

    return (
      <div className="flex gap-1.5 flex-wrap items-center">
        {cliente.temProposta ? (
          <>
            <a
              href={`/proposta/${cliente.pasta}?from=admin`}
              target="_blank"
              rel="noopener noreferrer"
              className={`${btn} text-blue-700 bg-blue-50 hover:bg-blue-100 ${cliente.propostaPausada ? 'opacity-60' : ''}`}
              title="Abrir proposta (com PDF)"
            >
              👁️ Ver
            </a>
            <Link href={`/gerador-rapido?cliente=${cliente.pasta}`} legacyBehavior>
              <a className={`${btn} text-orange-700 bg-orange-50 hover:bg-orange-100`} title="Editar no gerador">
                ✏️ Editar
              </a>
            </Link>
            {ativa && (
              <>
                <span className={sep} aria-hidden />
                <button
                  type="button"
                  onClick={() => {
                navigator.clipboard.writeText(propostaUrlPublica(cliente.pasta));
                alert('Link copiado!');
              }}
              className={`${btn} text-slate-700 bg-slate-100 hover:bg-slate-200`}
              title="Copiar link"
            >
              🔗 Copiar
            </button>
                <button
                  type="button"
                  onClick={() => {
                    const url = propostaUrlPublica(cliente.pasta);
                    const msg = compact
                      ? `Sua proposta está pronta! 🌞\n${url}`
                      : `Olá! Sua proposta de energia solar está pronta! 🌞\n\nAcesse aqui: ${url}\n\nQualquer dúvida, estou à disposição!\n\nPIENG Soluções Energéticas`;
                    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
                  }}
                  className={`${btn} inline-flex items-center gap-1.5 text-emerald-800 bg-emerald-50 hover:bg-emerald-100`}
                  title="Enviar no WhatsApp"
                >
                  <img
                    src="/icons/whatsapp.png"
                    alt=""
                    width={compact ? 16 : 18}
                    height={compact ? 16 : 18}
                    className="shrink-0"
                    aria-hidden
                  />
                  WhatsApp
                </button>
              </>
            )}
          </>
        ) : (
          <Link href={`/admin/orcamentos/${cliente.pasta}`} legacyBehavior>
            <a className={`${btn} text-violet-700 bg-violet-50 hover:bg-violet-100`}>📋 Orçamento</a>
          </Link>
        )}

        <span className={sep} aria-hidden />

        {cliente.temProposta && (
          <button
            type="button"
            onClick={() => togglePausarProposta(cliente)}
            title={cliente.propostaPausada ? 'Reativar proposta' : 'Pausar proposta'}
            className={`${btn} ${
              cliente.propostaPausada
                ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                : 'text-amber-700 bg-amber-50 hover:bg-amber-100'
            }`}
          >
            {cliente.propostaPausada ? '▶️ Reativar' : '⏸️ Pausar'}
          </button>
        )}
        <button
          type="button"
          onClick={() => deleteCliente(cliente)}
          className={`${btn} text-red-700 bg-red-50 hover:bg-red-100`}
          title="Excluir cliente"
        >
          🗑️ Excluir
        </button>
      </div>
    );
  };

  const handleLimpezaTestes = async () => {
    const confirmacao = window.confirm(
      `⚠️ ATENÇÃO: Você realmente deseja deletar TODOS os clientes de teste?\n\n` +
      `Esta ação irá remover:\n` +
      `• Clientes que começam com "Cliente Padrão"\n` +
      `• Clientes com "teste", "test", "exemplo", "demo" no nome\n` +
      `• Todas as propostas relacionadas\n` +
      `• Todos os analytics relacionados\n` +
      `• Todos os orçamentos relacionados\n\n` +
      `Esta ação NÃO pode ser desfeita!\n\n` +
      `Deseja continuar?`
    );

    if (!confirmacao) {
      return;
    }

    try {
      setLimpandoTestes(true);
      
      const response = await fetch('/api/admin/limpeza-clientes-teste', {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.details || 'Erro ao fazer limpeza');
      }

      const result = await response.json();
      
      alert(
        `✅ Limpeza concluída com sucesso!\n\n` +
        `Clientes deletados: ${result.result.clientesDeletados}\n` +
        `Propostas deletadas: ${result.result.propostasDeletadas}\n` +
        `Analytics deletados: ${result.result.analyticsDeletados}\n` +
        `Orçamentos deletados: ${result.result.orcamentosDeletados}`
      );

      // Recarregar lista de clientes
      await loadClientesData();
      
    } catch (error) {
      console.error('❌ Erro ao fazer limpeza:', error);
      alert(`❌ Erro ao fazer limpeza: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setLimpandoTestes(false);
    }
  };

  return (
    <>
      <Head>
        <title>Admin - PIENG Solar</title>
        <meta name="description" content="Área administrativa do sistema PIENG Solar" />
      </Head>

      <div className="admin-shell">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-7xl mx-auto">
            
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold admin-title">
                    🏢 Área Administrativa
                  </h1>
                  <span className="px-2 py-1 text-xs font-mono rounded border border-[var(--admin-border)] bg-[var(--admin-surface-muted)] text-[var(--admin-primary)]">
                    v2.4.7
                  </span>
                </div>
                <p className="admin-subtitle">
                  Gerencie clientes, configurações e propostas do sistema PIENG Solar
                </p>
              </div>
              
              <div className="flex flex-wrap items-center gap-3 justify-end">
                <AdminThemePicker compact />
                <Link href="/proposta/exemplo" legacyBehavior>
                  <a className="admin-btn-primary" target="_blank" rel="noreferrer">
                    ✨ Ver Exemplo
                  </a>
                </Link>
                <Link href="/admin/configuracoes" legacyBehavior>
                  <a className="admin-btn-ghost text-xl" title="Configurações do Sistema">
                    ⚙️
                  </a>
                </Link>
                <Link href="/" legacyBehavior>
                  <a className="admin-btn-ghost">🏠 Site</a>
                </Link>
              </div>
            </div>

            {/* PWA Install Banner */}
            <InstallPWA />

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="admin-surface p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-blue-100 text-blue-600 mr-4">
                    👥
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">
                      Total Clientes
                    </h3>
                    <p className="text-2xl font-bold text-blue-600">
                      {stats.totalClientes}
                    </p>
                  </div>
                </div>
              </div>

              <div className="admin-surface p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-green-100 text-green-600 mr-4">
                    📄
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">
                      Propostas Geradas
                    </h3>
                    <p className="text-2xl font-bold text-green-600">
                      {stats.proposasGeradas}
                    </p>
                  </div>
                </div>
              </div>

              <div className="admin-surface p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-yellow-100 text-yellow-600 mr-4">
                    ⏳
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">
                      Pendentes
                    </h3>
                    <p className="text-2xl font-bold text-yellow-600">
                      {stats.aguardandoOrcamentos}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">sem proposta ou ainda não aberta</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Menus principais — propostas e orçamentos */}
            <div className="space-y-6 mb-8">
              <section>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Propostas e orçamentos</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Link href="/gerador-rapido" legacyBehavior>
                    <a className="block p-5 bg-gradient-to-br from-blue-700 to-blue-900 text-white rounded-xl shadow-md hover:shadow-lg transition-all hover:scale-[1.02] text-center border border-blue-500/30">
                      <div className="text-2xl mb-2">📝</div>
                      <h3 className="font-semibold mb-0.5">Proposta manual</h3>
                      <p className="text-sm opacity-90">Editor completo · YAML e revisão</p>
                    </a>
                  </Link>
                  <Link href="/admin/v3/orcamento-base" legacyBehavior>
                    <a className="block p-5 bg-gradient-to-br from-emerald-600 to-emerald-800 text-white rounded-xl shadow-md hover:shadow-lg transition-all hover:scale-[1.02] text-center border border-emerald-400/30">
                      <div className="text-2xl mb-2">🧩</div>
                      <h3 className="font-semibold mb-0.5">Proposta por kits</h3>
                      <p className="text-sm opacity-90">Monta kits do catálogo e gera</p>
                    </a>
                  </Link>
                  <Link href="/admin/v3/proposta-auto" legacyBehavior>
                    <a className="block p-5 bg-gradient-to-br from-sky-600 to-sky-800 text-white rounded-xl shadow-md hover:shadow-lg transition-all hover:scale-[1.02] text-center border border-sky-400/30">
                      <div className="text-2xl mb-2">🤖</div>
                      <h3 className="font-semibold mb-0.5">Proposta automática</h3>
                      <p className="text-sm opacity-90">Por faixa de geração</p>
                    </a>
                  </Link>
                  <Link href="/admin/orcamentos" legacyBehavior>
                    <a className="block p-5 bg-gradient-to-br from-slate-600 to-slate-800 text-white rounded-xl shadow-md hover:shadow-lg transition-all hover:scale-[1.02] text-center border border-slate-400/30">
                      <div className="text-2xl mb-2">📋</div>
                      <h3 className="font-semibold mb-0.5">Orçamentos</h3>
                      <p className="text-sm opacity-90">Gestão de orçamentos dos clientes</p>
                    </a>
                  </Link>
                </div>
              </section>
            </div>

            {/* Lista de Clientes */}
            <div className="admin-surface overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-800">
                  📋 Lista de Clientes
                </h2>
              </div>

              {loading ? (
                <div className="p-8 text-center">
                  <div className="text-gray-500">Carregando...</div>
                </div>
              ) : clientes.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="text-gray-500 mb-4">Nenhum cliente cadastrado</div>
                  <Link href="/gerador-rapido" legacyBehavior><a className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    📝 Montar primeira proposta
                  </a></Link>
                </div>
              ) : (
                <>
                  {/* ── MOBILE: cards (< md) ── */}
                  <div className="md:hidden divide-y divide-gray-200">
                    {clientes.map((cliente, index) => (
                      <div key={index} className={`p-4 space-y-2 ${cliente.propostaPausada ? 'bg-gray-50 opacity-75' : ''}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className={`font-semibold ${cliente.propostaPausada ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{cliente.nome}</div>
                            <div className="text-xs text-gray-500">{cliente.cidade}</div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            {cliente.propostaPausada && (
                              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">⏸️ Pausada</span>
                            )}
                            <div className="shrink-0">{getStatusBadge(cliente)}</div>
                          </div>
                        </div>
                        <div className="text-xs text-gray-400">{cliente.ultimaModificacao}</div>
                        <div className="pt-1">{renderClienteAcoes(cliente, true)}</div>
                      </div>
                    ))}
                  </div>

                  {/* ── DESKTOP: tabela normal (≥ md) ── */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Localização</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Última Modificação</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {clientes.map((cliente, index) => (
                          <tr key={index} className={`hover:bg-gray-50 ${cliente.propostaPausada ? 'bg-gray-50 opacity-80' : ''}`}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className={`font-medium ${cliente.propostaPausada ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{cliente.nome}</div>
                              <div className="text-sm text-gray-500">Pasta: {cliente.pasta}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{cliente.cidade}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex flex-col gap-1">
                                {cliente.propostaPausada && (
                                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 w-fit">⏸️ Pausada</span>
                                )}
                                {getStatusBadge(cliente)}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{cliente.ultimaModificacao}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              {renderClienteAcoes(cliente)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="text-center mt-8 text-gray-500 text-sm">
              <p>PIENG Solar - Sistema de Propostas v2.0 | Next.js + Vercel</p>
              <p>Desenvolvido com ⚡ energia solar e ☕ muito café</p>
            </div>
          </div>
        </div>
      </div>

    </>
  );
}
