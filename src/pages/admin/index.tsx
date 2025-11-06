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
    propostaSlug: '',
    cidade: 'Anápolis/GO',
    consumoMensal: 2500,
    tipoInstalacao: 'Telhado Fibrocimento'
  });
  const [enviandoEmail, setEnviandoEmail] = useState(false);

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

  const syncWithGoogleDrive = async () => {
    if (!confirm('Deseja sincronizar todos os clientes com o Google Drive?\n\nIsso irá fazer upload de todos os arquivos para a nuvem.')) return;
    
    try {
      const syncPromises = clientes.map(async (cliente) => {
        const response = await fetch('/api/admin/sync-google-drive', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            clientePasta: cliente.pasta
          })
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log(`Cliente ${cliente.nome} sincronizado:`, result);
          return { cliente: cliente.nome, success: true, result };
        } else {
          const error = await response.json();
          console.error(`Erro ao sincronizar ${cliente.nome}:`, error);
          return { cliente: cliente.nome, success: false, error };
        }
      });

      const results = await Promise.all(syncPromises);
      const successCount = results.filter(r => r.success).length;
      const errorCount = results.filter(r => !r.success).length;

      alert(`Sincronização concluída!\n\n✅ Sucessos: ${successCount}\n❌ Erros: ${errorCount}`);
      
      // Recarregar dados após sincronização
      loadClientesData();
      
    } catch (error) {
      console.error('Erro na sincronização:', error);
      alert('Erro durante a sincronização com Google Drive');
    }
  };

  const openEnviarPropostaModal = () => {
    setShowEnviarModal(true);
  };

  const closeEnviarModal = () => {
    setShowEnviarModal(false);
    setEnviarForm({
      clienteNome: '',
      clienteEmail: '',
      clienteTelefone: '',
      propostaSlug: '',
      cidade: 'Anápolis/GO',
      consumoMensal: 2500,
      tipoInstalacao: 'Telhado Fibrocimento'
    });
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
          cidade: enviarForm.cidade,
          consumoMensal: enviarForm.consumoMensal,
          tipoInstalacao: enviarForm.tipoInstalacao,
          propostaSlug: enviarForm.propostaSlug
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
                    v2.1.0
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Link href="/gerador-rapido" legacyBehavior><a className="block p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow text-center">
                <div className="text-3xl mb-3">⚡</div>
                <h3 className="font-semibold text-gray-800 mb-1">Gerador Rápido</h3>
                <p className="text-sm text-gray-600">Geração rápida de propostas</p>
              </a></Link>

              <Link href="/admin/novo-cliente" legacyBehavior><a className="block p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow text-center">
                <div className="text-3xl mb-3">👤</div>
                <h3 className="font-semibold text-gray-800 mb-1">Novo Cliente</h3>
                <p className="text-sm text-gray-600">Cadastrar novo cliente</p>
              </a></Link>

              <Link href="/admin/configuracoes" legacyBehavior><a className="block p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow text-center">
                <div className="text-3xl mb-3">⚙️</div>
                <h3 className="font-semibold text-gray-800 mb-1">Configurações</h3>
                <p className="text-sm text-gray-600">Parâmetros do sistema</p>
              </a></Link>

              <Link href="/admin/orcamentos" legacyBehavior><a className="block p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow text-center">
                <div className="text-3xl mb-3">📋</div>
                <h3 className="font-semibold text-gray-800 mb-1">Orçamentos</h3>
                <p className="text-sm text-gray-600">Gerenciar orçamentos</p>
              </a></Link>

              <button
                onClick={loadClientesData}
                className="block w-full p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow text-center"
              >
                <div className="text-3xl mb-3">🔄</div>
                <h3 className="font-semibold text-gray-800 mb-1">Atualizar</h3>
                <p className="text-sm text-gray-600">Recarregar dados</p>
              </button>

              <button
                onClick={syncWithGoogleDrive}
                className="block w-full p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow text-center"
              >
                <div className="text-3xl mb-3">☁️</div>
                <h3 className="font-semibold text-gray-800 mb-1">Google Drive</h3>
                <p className="text-sm text-gray-600">Sincronizar com nuvem</p>
              </button>

              <Link href="/propostas-publicas" legacyBehavior>
                <a className="block p-6 bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105 text-center">
                  <div className="text-3xl mb-3">🌐</div>
                  <h3 className="font-semibold mb-1">Propostas Públicas</h3>
                  <p className="text-sm opacity-90">Ver todas propostas online</p>
                </a>
              </Link>

              <button
                onClick={openEnviarPropostaModal}
                className="block w-full p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow text-center"
              >
                <div className="text-3xl mb-3">📧</div>
                <h3 className="font-semibold text-gray-800 mb-1">Enviar Proposta</h3>
                <p className="text-sm text-gray-600">Enviar link para cliente</p>
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
                  <div className="text-gray-500">Carregando...</div>
                </div>
              ) : clientes.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="text-gray-500 mb-4">Nenhum cliente cadastrado</div>
                  <Link href="/admin/novo-cliente" legacyBehavior><a className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    👤 Cadastrar Primeiro Cliente
                  </a></Link>
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
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Ações
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
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex gap-2 flex-wrap">
                              <Link href={`/admin/orcamentos/${cliente.pasta}`} legacyBehavior><a className="text-purple-600 hover:text-purple-900 px-2 py-1 rounded bg-purple-50 hover:bg-purple-100">
                                📋 Orçamentos
                              </a></Link>
                              {cliente.temProposta && (
                                <>
                                  <a
                                    href={`https://pieng-propostas.vercel.app/propostas/orçamento/clientes/proposta_${cliente.pasta}.html`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-900 px-2 py-1 rounded bg-blue-50 hover:bg-blue-100"
                                  >
                                    👁️ Ver Real
                                  </a>
                                  <button
                                    onClick={() => {
                                      const propostaUrl = `https://pieng-propostas.vercel.app/propostas/orçamento/clientes/proposta_${cliente.pasta}.html`;
                                      const mensagem = `Olá! Sua proposta de energia solar está pronta! 🌞\n\nAcesse aqui: ${propostaUrl}\n\nQualquer dúvida, estou à disposição!\n\nPIENG Soluções Energéticas`;
                                      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(mensagem)}`;
                                      window.open(whatsappUrl, '_blank');
                                    }}
                                    className="text-green-600 hover:text-green-900 px-2 py-1 rounded bg-green-50 hover:bg-green-100 flex items-center gap-1"
                                  >
                                    💬 WhatsApp
                                  </button>
                                  <button
                                    onClick={() => {
                                      const propostaUrl = `https://pieng-propostas.vercel.app/propostas/orçamento/clientes/proposta_${cliente.pasta}.html`;
                                      navigator.clipboard.writeText(propostaUrl);
                                      alert('Link copiado! Cole no WhatsApp ou email do cliente.');
                                    }}
                                    className="text-indigo-600 hover:text-indigo-900 px-2 py-1 rounded bg-indigo-50 hover:bg-indigo-100"
                                  >
                                    🔗 Copiar
                                  </button>
                                </>
                              )}
                              <Link href={`/admin/clientes/${cliente.pasta}/editar`} legacyBehavior><a className="text-yellow-600 hover:text-yellow-900 px-2 py-1 rounded bg-yellow-50 hover:bg-yellow-100">
                                ✏️ Editar
                              </a></Link>
                              <button
                                onClick={() => deleteCliente(cliente.pasta, cliente.nome)}
                                className="text-red-600 hover:text-red-900 px-2 py-1 rounded bg-red-50 hover:bg-red-100"
                              >
                                🗑️ Excluir
                              </button>
                            </div>
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
                >
                  <option value="">Selecione uma proposta</option>
                  {clientes.filter(c => c.temProposta).map(cliente => (
                    <option key={cliente.pasta} value={cliente.pasta}>
                      {cliente.nome} ({cliente.pasta})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cidade
                </label>
                <input
                  type="text"
                  value={enviarForm.cidade}
                  onChange={(e) => handleEnviarFormChange('cidade', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Anápolis/GO"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Consumo Mensal (kWh)
                </label>
                <input
                  type="number"
                  value={enviarForm.consumoMensal}
                  onChange={(e) => handleEnviarFormChange('consumoMensal', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="2500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Instalação
                </label>
                <select
                  value={enviarForm.tipoInstalacao}
                  onChange={(e) => handleEnviarFormChange('tipoInstalacao', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Telhado Fibrocimento">Telhado Fibrocimento</option>
                  <option value="Telhado Cerâmico">Telhado Cerâmico</option>
                  <option value="Telhado Metálico">Telhado Metálico</option>
                  <option value="Solo">Solo</option>
                  <option value="Laje">Laje</option>
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