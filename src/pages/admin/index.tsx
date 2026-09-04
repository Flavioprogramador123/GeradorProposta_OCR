import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import InstallPWA from '@/components/InstallPWA';

interface ClienteInfo {
  nome: string;
  cidade: string;
  pasta: string;
  status: string;
  ultimaModificacao: string;
  temProposta: boolean;
  email?: string;
  telefone?: string;
  propostaPausada?: boolean;
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
  const [showEnviarModal, setShowEnviarModal] = useState(false);
  const [enviarForm, setEnviarForm] = useState({
    clienteNome: '',
    clienteEmail: '',
    clienteTelefone: '',
    propostaSlug: ''
  });
  const [enviandoEmail, setEnviandoEmail] = useState(false);
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

  const deleteCliente = async (pasta: string, nome: string) => {
    if (!confirm(`Tem certeza que deseja excluir o cliente "${nome}"?\n\nEsta ação não pode ser desfeita e removerá todos os dados, orçamentos e propostas do cliente.`)) return;
    
    try {
      const response = await fetch(`/api/admin/clientes/${pasta}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        loadClientesData();
        alert(`Cliente "${nome}" excluído com sucesso!`);
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

    try {
      const response = await fetch(`/api/admin/clientes/${cliente.pasta}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propostaPausada: novoPausado }),
      });

      if (response.ok) {
        setClientes(prev =>
          prev.map(c => c.pasta === cliente.pasta ? { ...c, propostaPausada: novoPausado } : c)
        );
      } else {
        alert('Erro ao alterar status da proposta.');
      }
    } catch {
      alert('Erro ao alterar status da proposta.');
    }
  };

  const openEnviarPropostaModal = (cliente?: ClienteInfo) => {
    if (cliente) {
      // Preencher formulário com dados do cliente
      setEnviarForm({
        clienteNome: cliente.nome,
        clienteEmail: cliente.email || '',
        clienteTelefone: cliente.telefone || '',
        propostaSlug: cliente.pasta || ''
      });
    } else {
      // Limpar formulário para novo envio
      setEnviarForm({
        clienteNome: '',
        clienteEmail: '',
        clienteTelefone: '',
        propostaSlug: ''
      });
    }
    setShowEnviarModal(true);
  };

  const closeEnviarModal = () => {
    setShowEnviarModal(false);
    setEnviarForm({
      clienteNome: '',
      clienteEmail: '',
      clienteTelefone: '',
      propostaSlug: ''
    });
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

  const handleEnviarFormChange = (field: string, value: string | number) => {
    setEnviarForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const enviarPropostaParaCliente = async () => {
    if (!enviarForm.clienteNome || !enviarForm.clienteEmail || !enviarForm.propostaSlug) {
      alert('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    setEnviandoEmail(true);

    try {
      const response = await fetch('/api/enviar-proposta-cliente', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clienteNome: enviarForm.clienteNome,
          clienteEmail: enviarForm.clienteEmail,
          clienteTelefone: enviarForm.clienteTelefone,
          propostaSlug: enviarForm.propostaSlug
          // cidade, consumoMensal e tipoInstalacao serão buscados da proposta original
        })
      });

      if (response.ok) {
        const result = await response.json();
        alert(`✅ Email enviado com sucesso!\n\nCliente: ${enviarForm.clienteNome}\nEmail: ${enviarForm.clienteEmail}\nProposta: ${result.propostaUrl}`);
        closeEnviarModal();
      } else {
        const error = await response.json();
        alert(`❌ Erro ao enviar email: ${error.error || error.message}`);
      }
    } catch (error) {
      console.error('Erro ao enviar proposta:', error);
      alert('❌ Erro ao enviar email. Tente novamente.');
    } finally {
      setEnviandoEmail(false);
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
            <div className="flex justify-between items-center mb-8">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-gray-800">
                    🏢 Área Administrativa
                  </h1>
                  <span className="px-2 py-1 text-xs font-mono bg-blue-100 text-blue-700 rounded border border-blue-200">
                    v2.4.1
                  </span>
                </div>
                <p className="text-gray-600">
                  Gerencie clientes, configurações e propostas do sistema PIENG Solar
                </p>
              </div>
              
              <div className="flex gap-3">
                <Link href="/proposta/exemplo" legacyBehavior>
                  <a className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:shadow-lg transition-all font-medium" target="_blank">
                    ✨ Ver Exemplo
                  </a>
                </Link>
                <Link href="/admin/configuracoes" legacyBehavior>
                  <a className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-xl" title="Configurações do Sistema">
                    ⚙️
                  </a>
                </Link>
                <Link href="/" legacyBehavior><a className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                🏠 Site
              </a></Link>
              </div>
            </div>

            {/* PWA Install Banner */}
            <InstallPWA />

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-lg p-6">
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

              <div className="bg-white rounded-xl shadow-lg p-6">
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

              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-yellow-100 text-yellow-600 mr-4">
                    ⏳
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">
                      Aguardando
                    </h3>
                    <p className="text-2xl font-bold text-yellow-600">
                      {stats.aguardandoOrcamentos}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Ações Principais */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              <Link href="/gerador-rapido" legacyBehavior><a className="block p-6 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105 text-center">
                <div className="text-3xl mb-3">⚡</div>
                <h3 className="font-semibold mb-1">Gerador Rápido</h3>
                <p className="text-sm opacity-90">Geração rápida de propostas</p>
              </a></Link>

              <Link href="/admin/orcamentos" legacyBehavior><a className="block p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow text-center">
                <div className="text-3xl mb-3">📋</div>
                <h3 className="font-semibold text-gray-800 mb-1">Orçamentos</h3>
                <p className="text-sm text-gray-600">Gerenciar orçamentos</p>
              </a></Link>

              <Link href="/admin/soollar-captura" legacyBehavior>
                <a className="block p-6 bg-gradient-to-br from-teal-500 to-emerald-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105 text-center">
                  <div className="text-3xl mb-3">🛰️</div>
                  <h3 className="font-semibold mb-1">Captura SOOLLAR</h3>
                  <p className="text-sm opacity-90">Scraping + terminal ao vivo</p>
                </a>
              </Link>

              <Link href="/admin/v3" legacyBehavior>
                <a className="block p-6 bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105 text-center border-2 border-amber-300/40">
                  <div className="text-3xl mb-3">🧪</div>
                  <h3 className="font-semibold mb-1">V3 Orçamento (espelho)</h3>
                  <p className="text-sm opacity-90">SQLite · não altera produção</p>
                </a>
              </Link>

              <Link href="/propostas-publicas" legacyBehavior>
                <a className="block p-6 bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105 text-center">
                  <div className="text-3xl mb-3">🌐</div>
                  <h3 className="font-semibold mb-1">Propostas Públicas</h3>
                  <p className="text-sm opacity-90">Ver todas propostas online</p>
                </a>
              </Link>
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
                  <div className="text-gray-500">Carregando...</div>
                </div>
              ) : clientes.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="text-gray-500 mb-4">Nenhum cliente cadastrado</div>
                  <Link href="/gerador-rapido" legacyBehavior><a className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    ⚡ Gerar Primeira Proposta
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
                            <div className="shrink-0">{getStatusBadge(cliente.status)}</div>
                          </div>
                        </div>
                        <div className="text-xs text-gray-400">{cliente.ultimaModificacao}</div>
                        <div className="flex flex-wrap gap-2 pt-1">
                          {cliente.temProposta && !cliente.propostaPausada ? (
                            <>
                              <Link href={`/gerador-rapido?cliente=${cliente.pasta}`} legacyBehavior>
                                <a className="text-orange-600 px-2 py-1 rounded bg-orange-50 text-xs font-medium">✏️ Editar</a>
                              </Link>
                              <a href={`/proposta/${cliente.pasta}`} target="_blank" rel="noopener noreferrer"
                                className="text-blue-600 px-2 py-1 rounded bg-blue-50 text-xs font-medium">
                                👁️ Ver
                              </a>
                              <button onClick={() => openEnviarPropostaModal(cliente)}
                                className="text-pink-600 px-2 py-1 rounded bg-pink-50 text-xs font-medium">
                                📧 Email
                              </button>
                              <button onClick={() => {
                                const url = `https://pieng-propostas.vercel.app/proposta/${cliente.pasta}`;
                                window.open(`https://wa.me/?text=${encodeURIComponent(`Sua proposta está pronta! 🌞\n${url}`)}`, '_blank');
                              }} className="text-green-600 px-2 py-1 rounded bg-green-50 text-xs font-medium">
                                💬 WhatsApp
                              </button>
                              <button onClick={() => {
                                navigator.clipboard.writeText(`https://pieng-propostas.vercel.app/proposta/${cliente.pasta}`);
                                alert('Link copiado!');
                              }} className="text-indigo-600 px-2 py-1 rounded bg-indigo-50 text-xs font-medium">
                                🔗 Copiar
                              </button>
                            </>
                          ) : cliente.temProposta && cliente.propostaPausada ? (
                            <span className="text-xs text-gray-400 italic">Proposta suspensa — reative para compartilhar</span>
                          ) : (
                            <Link href={`/admin/orcamentos/${cliente.pasta}`} legacyBehavior>
                              <a className="text-purple-600 px-2 py-1 rounded bg-purple-50 text-xs font-medium">📋 Criar Orçamento</a>
                            </Link>
                          )}
                          {cliente.temProposta && (
                            <button onClick={() => togglePausarProposta(cliente)}
                              className={`px-2 py-1 rounded text-xs font-medium ${cliente.propostaPausada ? 'text-green-700 bg-green-50' : 'text-orange-700 bg-orange-50'}`}>
                              {cliente.propostaPausada ? '▶️ Reativar' : '⏸️ Pausar'}
                            </button>
                          )}
                          <Link href={`/admin/clientes/${cliente.pasta}/editar`} legacyBehavior>
                            <a className="text-yellow-600 px-2 py-1 rounded bg-yellow-50 text-xs font-medium">⚙️ Editar</a>
                          </Link>
                          <button onClick={() => deleteCliente(cliente.pasta, cliente.nome)}
                            className="text-red-600 px-2 py-1 rounded bg-red-50 text-xs font-medium">
                            🗑️ Excluir
                          </button>
                        </div>
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
                                {getStatusBadge(cliente.status)}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{cliente.ultimaModificacao}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex gap-2 flex-wrap">
                                {cliente.temProposta && !cliente.propostaPausada ? (
                                  <>
                                    <Link href={`/gerador-rapido?cliente=${cliente.pasta}`} legacyBehavior>
                                      <a className="text-orange-600 hover:text-orange-900 px-2 py-1 rounded bg-orange-50 hover:bg-orange-100">✏️ Editar Proposta</a>
                                    </Link>
                                    <a href={`/proposta/${cliente.pasta}`} target="_blank" rel="noopener noreferrer"
                                      className="text-blue-600 hover:text-blue-900 px-2 py-1 rounded bg-blue-50 hover:bg-blue-100">
                                      👁️ Ver Proposta
                                    </a>
                                    <button onClick={() => openEnviarPropostaModal(cliente)}
                                      className="text-pink-600 hover:text-pink-900 px-2 py-1 rounded bg-pink-50 hover:bg-pink-100">
                                      📧 Email
                                    </button>
                                    <button onClick={() => {
                                      const propostaUrl = `https://pieng-propostas.vercel.app/proposta/${cliente.pasta}`;
                                      const mensagem = `Olá! Sua proposta de energia solar está pronta! 🌞\n\nAcesse aqui: ${propostaUrl}\n\nQualquer dúvida, estou à disposição!\n\nPIENG Soluções Energéticas`;
                                      window.open(`https://wa.me/?text=${encodeURIComponent(mensagem)}`, '_blank');
                                    }} className="text-green-600 hover:text-green-900 px-2 py-1 rounded bg-green-50 hover:bg-green-100">
                                      💬 WhatsApp
                                    </button>
                                    <button onClick={() => {
                                      navigator.clipboard.writeText(`https://pieng-propostas.vercel.app/proposta/${cliente.pasta}`);
                                      alert('Link copiado! Cole no WhatsApp ou email do cliente.');
                                    }} className="text-indigo-600 hover:text-indigo-900 px-2 py-1 rounded bg-indigo-50 hover:bg-indigo-100">
                                      🔗 Copiar
                                    </button>
                                  </>
                                ) : !cliente.temProposta ? (
                                  <Link href={`/admin/orcamentos/${cliente.pasta}`} legacyBehavior>
                                    <a className="text-purple-600 hover:text-purple-900 px-2 py-1 rounded bg-purple-50 hover:bg-purple-100">📋 Criar Orçamento</a>
                                  </Link>
                                ) : null}
                                {cliente.temProposta && (
                                  <button onClick={() => togglePausarProposta(cliente)}
                                    title={cliente.propostaPausada ? 'Reativar proposta' : 'Pausar proposta (preço desatualizado)'}
                                    className={`px-2 py-1 rounded text-sm font-medium ${cliente.propostaPausada ? 'text-green-700 bg-green-50 hover:bg-green-100' : 'text-orange-700 bg-orange-50 hover:bg-orange-100'}`}>
                                    {cliente.propostaPausada ? '▶️ Reativar' : '⏸️ Pausar'}
                                  </button>
                                )}
                                <Link href={`/admin/clientes/${cliente.pasta}/editar`} legacyBehavior>
                                  <a className="text-yellow-600 hover:text-yellow-900 px-2 py-1 rounded bg-yellow-50 hover:bg-yellow-100">⚙️ Editar Cliente</a>
                                </Link>
                                <button onClick={() => deleteCliente(cliente.pasta, cliente.nome)}
                                  className="text-red-600 hover:text-red-900 px-2 py-1 rounded bg-red-50 hover:bg-red-100">
                                  🗑️ Excluir
                                </button>
                              </div>
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

      {/* Modal de Envio de Proposta */}
      {showEnviarModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">📧 Enviar Proposta para Cliente</h3>
              <button
                onClick={closeEnviarModal}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome do Cliente *
                </label>
                <input
                  type="text"
                  value={enviarForm.clienteNome}
                  onChange={(e) => handleEnviarFormChange('clienteNome', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nome completo do cliente"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email do Cliente *
                </label>
                <input
                  type="email"
                  value={enviarForm.clienteEmail}
                  onChange={(e) => handleEnviarFormChange('clienteEmail', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="cliente@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefone/WhatsApp
                </label>
                <input
                  type="tel"
                  value={enviarForm.clienteTelefone}
                  onChange={(e) => handleEnviarFormChange('clienteTelefone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="(62) 99999-9999"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Slug da Proposta *
                </label>
                <select
                  value={enviarForm.propostaSlug}
                  onChange={(e) => handleEnviarFormChange('propostaSlug', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  title="Selecione a proposta para enviar"
                >
                  <option value="">Selecione uma proposta</option>
                  {clientes.filter(c => c.temProposta).map(cliente => (
                    <option key={cliente.pasta} value={cliente.pasta}>
                      {cliente.nome} ({cliente.pasta})
                    </option>
                  ))}
                </select>
              </div>

            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={closeEnviarModal}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                disabled={enviandoEmail}
              >
                Cancelar
              </button>
              <button
                onClick={enviarPropostaParaCliente}
                disabled={enviandoEmail}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {enviandoEmail ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Enviando...
                  </>
                ) : (
                  <>
                    📧 Enviar Proposta
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}