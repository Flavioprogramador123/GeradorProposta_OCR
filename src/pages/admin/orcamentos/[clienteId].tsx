import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

interface Componente {
  id: string;
  tipo: 'modulo' | 'inversor' | 'estrutura' | 'outros';
  marca: string;
  modelo: string;
  potencia?: number;
  preco?: number;
  especificacoes: string[];
}

interface Orcamento {
  id: string;
  fornecedor: string;
  dataOrcamento: string;
  status: 'pendente' | 'analisando' | 'aprovado' | 'rejeitado';
  componentes: {
    modulos: {
      componente: Componente;
      quantidade: number;
      precoUnitario: number;
      precoTotal: number;
    };
    inversores: {
      componente: Componente;
      quantidade: number;
      precoUnitario: number;
      precoTotal: number;
    };
    estrutura: {
      componente: Componente;
      quantidade: number;
      precoUnitario: number;
      precoTotal: number;
    };
    outros: {
      componente: Componente;
      quantidade: number;
      precoUnitario: number;
      precoTotal: number;
    }[];
  };
  valorTotal: number;
  precoCustoYaml?: number;  // Preço de custo do YAML
  tipoMargem?: 'percentual' | 'valor';  // Tipo de margem: percentual ou valor absoluto
  margem?: number;          // Valor da margem (% ou R$)
  despesas?: Array<{id: string, categoria: string, descricao: string, valor: number}>;
  observacoes?: string;
  arquivos: {
    nome: string;
    url: string;
    tipo: 'pdf' | 'jpg' | 'png';
  }[];
}

interface ClienteData {
  nome: string;
  cidade: string;
  consumoMensal: number;
  pasta: string;
}

export default function GerenciarOrcamentos() {
  const router = useRouter();
  const { clienteId } = router.query;
  
  const [cliente, setCliente] = useState<ClienteData | null>(null);
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    if (clienteId) {
      loadClienteData();
      loadOrcamentos();
    }
  }, [clienteId]);

  const loadClienteData = async () => {
    try {
      const response = await fetch(`/api/admin/clientes/${clienteId}`);
      if (response.ok) {
        const data = await response.json();
        setCliente(data);
      }
    } catch (error) {
      console.error('Erro ao carregar dados do cliente:', error);
    }
  };

  const loadOrcamentos = async () => {
    try {
      const response = await fetch(`/api/admin/orcamentos/${clienteId}`);
      if (response.ok) {
        const data = await response.json();
        setOrcamentos(data.orcamentos || []);
      }
    } catch (error) {
      console.error('Erro ao carregar orçamentos:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalComMargem = (orcamento: Orcamento) => {
    // Se tem despesas manuais, usa elas
    if (orcamento.despesas && orcamento.despesas.length > 0) {
      const despesasTotal = orcamento.despesas.reduce((sum, despesa) => sum + despesa.valor, 0);
      return (orcamento.precoCustoYaml || orcamento.valorTotal) + despesasTotal;
    }

    // Se não tem despesas manuais, usa a margem configurada
    const custoBase = orcamento.precoCustoYaml || orcamento.valorTotal;
    const tipoMargem = orcamento.tipoMargem || 'percentual';
    const margem = orcamento.margem || 15;

    if (tipoMargem === 'percentual') {
      const margemCalculada = (margem / 100) * custoBase;
      return custoBase + margemCalculada;
    } else {
      return custoBase + margem; // Valor absoluto
    }
  };

  const deleteOrcamento = async (orcamentoId: string) => {
    if (!confirm('Tem certeza que deseja excluir este orçamento?')) return;
    
    try {
      const response = await fetch(`/api/admin/orcamentos/${clienteId}/${orcamentoId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        setOrcamentos(prev => prev.filter(o => o.id !== orcamentoId));
        alert('Orçamento excluído com sucesso!');
      }
    } catch (error) {
      alert('Erro ao excluir orçamento');
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      'pendente': 'bg-gray-100 text-gray-800',
      'analisando': 'bg-blue-100 text-blue-800',
      'aprovado': 'bg-green-100 text-green-800',
      'rejeitado': 'bg-red-100 text-red-800'
    };
    
    const labels = {
      'pendente': '⏳ Pendente',
      'analisando': '🔄 Analisando',
      'aprovado': '✅ Aprovado',
      'rejeitado': '❌ Rejeitado'
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  const gerarPropostas = async () => {
    if (orcamentos.length === 0) {
      alert('É necessário ter pelo menos 1 orçamento para gerar propostas');
      return;
    }

    const aprovados = orcamentos.filter(o => o.status === 'aprovado');
    if (aprovados.length === 0) {
      alert('É necessário aprovar pelo menos 1 orçamento para gerar propostas');
      return;
    }

    if (!cliente) {
      alert('Dados do cliente não encontrados');
      return;
    }

    try {
      // Preparar dados do cliente
      const dadosCliente = {
        nome: cliente.nome,
        cidade: cliente.cidade || '',
        estado: cliente.estado || '',
        consumoMensal: cliente.consumoMensal || 0,
        tarifaEnergia: 0.60, // Valor padrão
      };

      // Preparar sistemas dos orçamentos aprovados
      const sistemas = aprovados.map((orc, index) => ({
        id: orc.id || `sistema-${index + 1}`,
        titulo: `Sistema ${index + 1}`,
        potencia: orc.potencia || 0,
        modulos: orc.modulos || 0,
        inversores: orc.inversores || 0,
        valorTotal: orc.valorTotal || 0,
        precoCustoYaml: orc.precoCustoYaml || orc.valorTotal,
        precoFinal: calculateTotalComMargem(orc),
        fornecedor: orc.fornecedor || 'Padrão',
        tipoModulo: orc.tipoModulo || 'Padrão',
        potenciaModulo: orc.potenciaModulo || 550,
        tipoInversor: orc.tipoInversor || 'Padrão',
      }));

      // Chamar API do Gerador Rápido
      const response = await fetch('/api/gerar-proposta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente: dadosCliente,
          sistemas: sistemas,
        })
      });

      if (response.ok) {
        const result = await response.json();
        alert('✅ Proposta gerada com sucesso!');
        
        // Abrir a proposta em nova aba
        window.open(`/proposta/${result.slug}`, '_blank');
      } else {
        const errorData = await response.json();
        alert(`❌ Erro: ${errorData.error || 'Erro ao gerar proposta'}`);
      }
    } catch (error) {
      console.error('Erro ao gerar propostas:', error);
      alert('❌ Erro ao gerar propostas');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando orçamentos...</p>
        </div>
      </div>
    );
  }

  if (!cliente) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Cliente não encontrado</h1>
          <Link href="/admin" legacyBehavior><a className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            ← Voltar ao Admin
          </a></Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Orçamentos - {cliente.nome} | PIENG Solar</title>
        <meta name="description" content={`Gerenciar orçamentos para ${cliente.nome}`} />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-orange-50">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-7xl mx-auto">
            
            {/* Header */}
            <div className="flex justify-between items-start mb-8">
              <div>
                <div className="flex items-center gap-4 mb-2">
                  <Link href="/admin" legacyBehavior><a className="text-blue-600 hover:text-blue-800">
                    ← Admin
                  </a></Link>
                  <span className="text-gray-400">|</span>
                  <h1 className="text-3xl font-bold text-gray-800">
                    📋 Orçamentos
                  </h1>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <h2 className="text-xl font-semibold text-gray-800 mb-1">
                    {cliente.nome}
                  </h2>
                  <p className="text-gray-600">
                    📍 {cliente.cidade} • ⚡ {cliente.consumoMensal} kWh/mês
                  </p>
                </div>
              </div>
            </div>

            {/* Ações Principais */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
              <button
                onClick={() => setShowAddModal(true)}
                className="p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow text-center border-2 border-dashed border-blue-300 hover:border-blue-500"
              >
                <div className="text-3xl mb-3 text-blue-600">📄</div>
                <h3 className="font-semibold text-gray-800 mb-1">Novo Orçamento</h3>
                <p className="text-sm text-gray-600">Upload ou entrada manual</p>
              </button>

              <Link href={`/admin/orcamentos/${clienteId}/consultor`} legacyBehavior><a className="p-6 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl shadow-lg hover:shadow-xl transition-shadow text-center text-white">
                <div className="text-3xl mb-3">🎛️</div>
                <h3 className="font-semibold mb-1">Sistema do Consultor</h3>
                <p className="text-sm opacity-90">Controle avançado</p>
              </a></Link>

              <button
                onClick={gerarPropostas}
                disabled={orcamentos.filter(o => o.status === 'aprovado').length === 0}
                className="p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow text-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="text-3xl mb-3 text-green-600">⚡</div>
                <h3 className="font-semibold text-gray-800 mb-1">Gerar Propostas</h3>
                <p className="text-sm text-gray-600">Criar propostas finais</p>
              </button>

              <div className="p-6 bg-white rounded-xl shadow-lg text-center">
                <div className="text-3xl mb-3 text-orange-600">📊</div>
                <h3 className="font-semibold text-gray-800 mb-1">Status</h3>
                <p className="text-sm text-gray-600">
                  {orcamentos.length} orçamento{orcamentos.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            {/* Lista de Orçamentos */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-800">
                  📋 Orçamentos ({orcamentos.length}/5)
                </h2>
              </div>

              {orcamentos.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="text-6xl mb-4">📄</div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">
                    Nenhum orçamento cadastrado
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Adicione orçamentos de fornecedores para gerar propostas personalizadas
                  </p>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    📄 Adicionar Primeiro Orçamento
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Fornecedor
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Data
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Valor Total
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {orcamentos.map((orcamento) => (
                        <tr key={orcamento.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-medium text-gray-900">
                              {orcamento.fornecedor}
                            </div>
                            <div className="text-sm text-gray-500">
                              {orcamento.arquivos.length} arquivo{orcamento.arquivos.length !== 1 ? 's' : ''}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(orcamento.dataOrcamento).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-lg font-semibold text-gray-900">
                              R$ {calculateTotalComMargem(orcamento).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </div>
                            {(orcamento.margem || orcamento.despesas) && (
                              <div className="text-xs text-gray-500">
                                {orcamento.despesas && orcamento.despesas.length > 0
                                  ? `+ despesas manuais`
                                  : (orcamento.tipoMargem || 'percentual') === 'percentual'
                                    ? `+ margem ${orcamento.margem || 15}%`
                                    : `+ custo R$ ${(orcamento.margem || 15).toFixed(2)}`
                                }
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getStatusBadge(orcamento.status)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex gap-2">
                              <Link href={`/admin/orcamentos/${clienteId}/editar/${orcamento.id}`} className="text-blue-600 hover:text-blue-900 px-2 py-1 rounded bg-blue-50 hover:bg-blue-100">
                                ✏️ Editar
                              </Link>
                              <button
                                onClick={() => {
                                  // Preparar dados do orçamento para reaproveitar
                                  const dadosReaproveitamento = {
                                    orcamento: {
                                      fornecedor: orcamento.fornecedor || 'Fornecedor',
                                      potencia: orcamento.potencia || 0,
                                      modulos: orcamento.componentes?.modulos?.quantidade || 0,
                                      inversores: orcamento.componentes?.inversores?.quantidade || 0,
                                      valorTotal: orcamento.valorTotal || 0,
                                      precoCusto: orcamento.precoCustoYaml || orcamento.valorTotal || 0,
                                      componentes: orcamento.componentes || {},
                                    },
                                    origem: `Reaproveitado de ${cliente?.nome || 'cliente'}`
                                  };
                                  
                                  // Salvar no localStorage
                                  localStorage.setItem('orcamento-reaproveitar', JSON.stringify(dadosReaproveitamento));
                                  
                                  // Abrir Gerador Rápido em nova aba
                                  window.open('/gerador-rapido?modo=reaproveitar', '_blank');
                                }}
                                className="text-green-600 hover:text-green-900 px-2 py-1 rounded bg-green-50 hover:bg-green-100"
                                title="Usar este orçamento em outro cliente"
                              >
                                ♻️ Reaproveitar
                              </button>
                              <button
                                onClick={() => deleteOrcamento(orcamento.id)}
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

            {/* Modal Adicionar Orçamento */}
            {showAddModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                  <div className="p-6 border-b border-gray-200">
                    <h3 className="text-xl font-semibold text-gray-800">
                      📄 Adicionar Novo Orçamento
                    </h3>
                  </div>
                  
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      {/* Upload de Arquivo */}
                      <Link href={`/admin/orcamentos/${clienteId}/upload`} legacyBehavior><a className="block p-8 border-2 border-dashed border-blue-300 rounded-lg text-center hover:border-blue-500 hover:bg-blue-50 transition-colors">
                        <div className="text-4xl mb-4 text-blue-600">📎</div>
                        <h4 className="text-lg font-semibold text-gray-800 mb-2">
                          Upload de Arquivo
                        </h4>
                        <p className="text-gray-600 mb-4">
                          PDF, JPG, PNG com extração automática via Docling
                        </p>
                        <div className="text-sm text-blue-600 font-medium">
                          Clique para fazer upload →
                        </div>
                      </a></Link>

                      {/* Entrada Manual */}
                      <Link href={`/admin/orcamentos/${clienteId}/manual`} legacyBehavior><a className="block p-8 border-2 border-dashed border-green-300 rounded-lg text-center hover:border-green-500 hover:bg-green-50 transition-colors">
                        <div className="text-4xl mb-4 text-green-600">✏️</div>
                        <h4 className="text-lg font-semibold text-gray-800 mb-2">
                          Entrada Manual
                        </h4>
                        <p className="text-gray-600 mb-4">
                          Digite os dados técnicos manualmente
                        </p>
                        <div className="text-sm text-green-600 font-medium">
                          Clique para inserir dados →
                        </div>
                      </a></Link>
                    </div>
                  </div>
                  
                  <div className="p-6 border-t border-gray-200">
                    <button
                      onClick={() => setShowAddModal(false)}
                      className="w-full py-3 px-6 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}