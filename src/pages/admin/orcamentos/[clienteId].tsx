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
  arquivos?: {
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
  const [showBuscarModal, setShowBuscarModal] = useState(false);
  const [todosOrcamentosDisponiveis, setTodosOrcamentosDisponiveis] = useState<any[]>([]);

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
      // 🔧 CONFIGURAÇÕES DO SISTEMA (mesmo do Gerador Rápido)
      const configSistema = {
        hsp: 5.21,
        tarifa: 0.982,
        performanceRate: 0.75,
        pdespesaFixo: 3000,
        pdespesaVariavel: 22,
        descontoPix: 10.0,
        fatorParcelado: 1.20,
        fator12x: 0.88,
        fator18x: 0.83
      };

      // 🔧 FUNÇÕES DE CÁLCULO (mesmo do Gerador Rápido)
      const calcularPrecos = (totalFinal: number) => {
        const ppix = totalFinal;
        const descontoPix = configSistema.descontoPix > 1 ? configSistema.descontoPix / 100 : configSistema.descontoPix;
        const pavista = ppix / (1 - descontoPix);
        const priscado = ppix * configSistema.fatorParcelado;
        const p12x_total = ppix / configSistema.fator12x;
        const p12x = p12x_total / 12;
        const p18x_total = ppix / configSistema.fator18x;
        const p18x_parcela = p18x_total / 18;

        return { ppix, pavista, priscado, p12x, p18x_parcela, p12x_total, p18x_total };
      };

      const calcularPerformance = (potenciaKw: number, hsp: number, consumoMensal: number, tarifa: number, investimentoPix: number) => {
        const performanceRate = configSistema.performanceRate;
        const geracaoMensal = potenciaKw * hsp * 30.4 * performanceRate;
        const cobertura = (geracaoMensal / consumoMensal) * 100;
        const economiaMensal = geracaoMensal * tarifa;
        const paybackMeses = investimentoPix / economiaMensal;
        const tirAnual = (12 / paybackMeses) * 100;

        return { geracaoMensal, cobertura, economiaMensal, paybackMeses, tirAnual };
      };

      // 🔧 PROCESSAR ORÇAMENTOS (mesmo do Gerador Rápido)
      const orcamentosProcessados = aprovados.map((orc, index) => {
        // Extrair dados dos componentes
        const modulos = orc.componentes?.modulos?.quantidade || 0;
        const pot_modulo = orc.componentes?.modulos?.componente?.potencia || 550;
        const marca_modulo = orc.componentes?.modulos?.componente?.marca || 'Padrão';
        const inversores = orc.componentes?.inversores?.quantidade || 1;
        const pot_inv = orc.componentes?.inversores?.componente?.potencia || 2.5;
        const marca_inversor = orc.componentes?.inversores?.componente?.marca || 'Padrão';

        // Calcular custo e despesas
        const pcusto = orc.precoCustoYaml || orc.valorTotal || 0;
        const pdespesa = configSistema.pdespesaFixo + (pcusto * configSistema.pdespesaVariavel / 100);
        const totalFinal = pcusto + pdespesa;

        // Calcular potência total
        const potTotal = (modulos * pot_modulo) / 1000;

        // Calcular preços e performance
        const precos = calcularPrecos(totalFinal);
        const performance = calcularPerformance(
          potTotal,
          configSistema.hsp,
          cliente.consumoMensal,
          configSistema.tarifa,
          precos.ppix
        );

        return {
          nome: `${orc.fornecedor} - Sistema ${index + 1}`,
          distribuidora: orc.fornecedor,
          pcusto: pcusto,
          modulos: modulos,
          pot_modulo: pot_modulo,
          marca_modulo: marca_modulo,
          inversores: inversores,
          pot_inv: pot_inv,
          marca_inversor: marca_inversor,
          pdespesa_total: pdespesa,
          total_final: totalFinal,
          pdespesa_fixo: configSistema.pdespesaFixo,
          pdespesa_variavel_percent: configSistema.pdespesaVariavel,
          potTotal: potTotal,
          // Todos os dados financeiros calculados
          ppix: precos.ppix,
          pavista: precos.pavista,
          priscado: precos.priscado,
          p12x: precos.p12x,
          p12x_total: precos.p12x_total,
          p18x_parcela: precos.p18x_parcela,
          p18x_total: precos.p18x_total,
          // Todos os dados de performance
          geracaoMensal: performance.geracaoMensal,
          cobertura: performance.cobertura,
          economiaMensal: performance.economiaMensal,
          paybackMeses: performance.paybackMeses,
          tirAnual: performance.tirAnual
        };
      });

      // 🔧 CHAMAR API (mesmo formato do Gerador Rápido)
      const response = await fetch('/api/gerar-proposta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente: {
            nome: cliente.nome,
            cidade: cliente.cidade || 'Anápolis/GO',
            consumo_mensal: cliente.consumoMensal || 600,
            tipo_imovel: 'Residencial',
            hsp: configSistema.hsp,
            tarifa: configSistema.tarifa
          },
          orcamentos: orcamentosProcessados,
          config: configSistema
        })
      });

      if (response.ok) {
        const result = await response.json();
        alert('✅ Proposta gerada com sucesso!');

        // Abrir a proposta em nova aba
        window.open(`/proposta/${result.slug}`, '_blank');
      } else {
        const errorData = await response.json();
        alert(`❌ Erro: ${errorData.error || errorData.message || 'Erro ao gerar proposta'}`);
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
                onClick={() => {
                  if (orcamentos.length === 0) {
                    alert('❌ Não há orçamentos para reaproveitar!');
                    return;
                  }

                  // Preparar TODOS os orçamentos para reaproveitar
                  const todosOrcamentos = orcamentos.map(orc => ({
                    fornecedor: orc.fornecedor || 'Fornecedor',
                    potencia: orc.potencia || 0,
                    modulos: orc.componentes?.modulos?.quantidade || 0,
                    pot_modulo: orc.componentes?.modulos?.potencia || 550,
                    marca_modulo: orc.componentes?.modulos?.marca || 'Padrão',
                    inversores: orc.componentes?.inversores?.quantidade || 1,
                    pot_inv: orc.componentes?.inversores?.potencia || 2.5,
                    marca_inversor: orc.componentes?.inversores?.marca || 'Padrão',
                    valorTotal: orc.valorTotal || 0,
                    precoCusto: orc.precoCustoYaml || orc.valorTotal || 0,
                    componentes: orc.componentes || {},
                  }));

                  const dadosReaproveitamento = {
                    orcamentos: todosOrcamentos,
                    origem: `${orcamentos.length} orçamento(s) de ${cliente?.nome || 'cliente'}`,
                    quantidadeTotal: orcamentos.length
                  };

                  // Salvar no localStorage
                  localStorage.setItem('orcamentos-reaproveitar-todos', JSON.stringify(dadosReaproveitamento));

                  // Abrir Gerador Rápido em nova aba
                  window.open('/gerador-rapido?modo=reaproveitar-todos', '_blank');
                }}
                disabled={orcamentos.length === 0}
                className="p-6 bg-gradient-to-r from-green-500 to-teal-600 rounded-xl shadow-lg hover:shadow-xl transition-shadow text-center text-white disabled:opacity-50 disabled:cursor-not-allowed"
                title={`Copiar ${orcamentos.length} orçamento(s) para novo cliente`}
              >
                <div className="text-3xl mb-3">♻️</div>
                <h3 className="font-semibold mb-1">Reaproveitar Todos</h3>
                <p className="text-sm opacity-90">{orcamentos.length} orçamento(s) para novo cliente</p>
              </button>

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
                              {orcamento.arquivos?.length || 0} arquivo{(orcamento.arquivos?.length || 0) !== 1 ? 's' : ''}
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
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      
                      {/* Upload de Arquivo */}
                      <Link href={`/admin/orcamentos/${clienteId}/upload`} legacyBehavior><a className="block p-8 border-2 border-dashed border-blue-300 rounded-lg text-center hover:border-blue-500 hover:bg-blue-50 transition-colors">
                        <div className="text-4xl mb-4 text-blue-600">📎</div>
                        <h4 className="text-lg font-semibold text-gray-800 mb-2">
                          Upload de Arquivo
                        </h4>
                        <p className="text-gray-600 mb-4">
                          PDF, JPG, PNG com extração automática
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

                      {/* Buscar Orçamento Existente */}
                      <button
                        onClick={async () => {
                          // Carregar todos os orçamentos do sistema
                          try {
                            console.log('🔄 Carregando clientes...');
                            const res = await fetch('/api/admin/clientes');
                            
                            if (!res.ok) {
                              throw new Error(`HTTP ${res.status}: ${res.statusText}`);
                            }
                            
                            const data = await res.json();
                            console.log('✅ Clientes carregados:', data.clientes?.length || 0);
                            
                            const todosOrc: any[] = [];
                            
                            // Carregar orçamentos de cada cliente com limite de concorrência
                            const clientes = data.clientes || [];
                            const batchSize = 5; // Processar 5 clientes por vez
                            
                            for (let i = 0; i < clientes.length; i += batchSize) {
                              const batch = clientes.slice(i, i + batchSize);
                              
                              const promises = batch.map(async (cli: any) => {
                                try {
                                  console.log(`🔄 Carregando orçamentos de ${cli.nome}...`);
                                  const orcRes = await fetch(`/api/admin/orcamentos/${cli.pasta}`);
                                  
                                  if (orcRes.ok) {
                                    const orcData = await orcRes.json();
                                    return (orcData.orcamentos || []).map((orc: any) => ({
                                      ...orc,
                                      clienteNome: cli.nome,
                                      clientePasta: cli.pasta,
                                    }));
                                  } else {
                                    console.warn(`⚠️ Erro ao carregar orçamentos de ${cli.nome}: ${orcRes.status}`);
                                    return [];
                                  }
                                } catch (error) {
                                  console.warn(`⚠️ Erro ao processar ${cli.nome}:`, error);
                                  return [];
                                }
                              });
                              
                              const batchResults = await Promise.all(promises);
                              batchResults.forEach(orcamentos => {
                                todosOrc.push(...orcamentos);
                              });
                            }
                            
                            console.log('✅ Orçamentos carregados:', todosOrc.length);
                            setTodosOrcamentosDisponiveis(todosOrc);
                            setShowBuscarModal(true);
                            
                          } catch (error) {
                            console.error('❌ Erro ao carregar orçamentos:', error);
                            alert(`❌ Erro ao carregar orçamentos: ${error.message || 'Erro desconhecido'}`);
                          }
                        }}
                        className="block p-8 border-2 border-dashed border-purple-300 rounded-lg text-center hover:border-purple-500 hover:bg-purple-50 transition-colors"
                      >
                        <div className="text-4xl mb-4 text-purple-600">🔍</div>
                        <h4 className="text-lg font-semibold text-gray-800 mb-2">
                          Buscar Orçamento
                        </h4>
                        <p className="text-gray-600 mb-4">
                          Copiar de outro cliente existente
                        </p>
                        <div className="text-sm text-purple-600 font-medium">
                          Clique para buscar →
                        </div>
                      </button>
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

            {/* Modal Buscar Orçamento */}
            {showBuscarModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
                <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                  <div className="p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
                    <h3 className="text-xl font-semibold text-gray-800">
                      🔍 Buscar Orçamento para Copiar
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Selecione um orçamento de outro cliente para copiar
                    </p>
                  </div>
                  
                  <div className="p-6">
                    {todosOrcamentosDisponiveis.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="text-6xl mb-4">📭</div>
                        <p className="text-gray-600">Nenhum orçamento disponível</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {todosOrcamentosDisponiveis.map((orc, index) => (
                          <div
                            key={`${orc.clientePasta}-${orc.id}-${index}`}
                            className="border border-gray-200 rounded-lg p-4 hover:border-purple-500 hover:bg-purple-50 transition-colors cursor-pointer"
                            onClick={async () => {
                              try {
                                // Copiar orçamento para o cliente atual
                                const orcamentoCopiado = {
                                  fornecedor: `${orc.fornecedor} (de ${orc.clienteNome})`,
                                  valorTotal: orc.valorTotal || 0,
                                  precoCustoYaml: orc.precoCustoYaml || orc.valorTotal || 0,
                                  potencia: orc.potencia || 0,
                                  componentes: orc.componentes || {},
                                  origem: `copiado-${orc.clientePasta}`,
                                  status: 'pendente' as const,
                                  dataOrcamento: new Date().toISOString(),
                                };

                                const response = await fetch(`/api/admin/orcamentos/${clienteId}`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify(orcamentoCopiado),
                                });

                                if (response.ok) {
                                  alert(`✅ Orçamento copiado com sucesso!\n\nOrigem: ${orc.clienteNome}\nFornecedor: ${orc.fornecedor}`);
                                  setShowBuscarModal(false);
                                  setShowAddModal(false);
                                  loadOrcamentos(); // Recarregar lista
                                } else {
                                  alert('❌ Erro ao copiar orçamento');
                                }
                              } catch (error) {
                                console.error('Erro ao copiar:', error);
                                alert('❌ Erro ao copiar orçamento');
                              }
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-sm font-medium text-purple-600">
                                    📁 {orc.clienteNome}
                                  </span>
                                  <span className="text-xs text-gray-400">→</span>
                                  <span className="text-sm font-semibold text-gray-800">
                                    {orc.fornecedor || 'Fornecedor não especificado'}
                                  </span>
                                </div>
                                <div className="grid grid-cols-4 gap-4 text-sm">
                                  <div>
                                    <span className="text-gray-500">Valor:</span>
                                    <div className="font-medium text-green-600">
                                      R$ {(orc.valorTotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </div>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Potência:</span>
                                    <div className="font-medium text-gray-800">
                                      {orc.potencia || 0} kWp
                                    </div>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Módulos:</span>
                                    <div className="font-medium text-gray-800">
                                      {orc.componentes?.modulos?.quantidade || 0} un
                                    </div>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Inversores:</span>
                                    <div className="font-medium text-gray-800">
                                      {orc.componentes?.inversores?.quantidade || 0} un
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <button className="ml-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                                📋 Copiar
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="p-6 border-t border-gray-200 sticky bottom-0 bg-white">
                    <button
                      onClick={() => setShowBuscarModal(false)}
                      className="w-full py-3 px-6 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    >
                      ❌ Cancelar
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