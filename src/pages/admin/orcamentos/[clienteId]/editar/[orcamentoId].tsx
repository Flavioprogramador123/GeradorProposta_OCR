import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

interface Despesa {
  id: string;
  categoria: string;
  descricao: string;
  valor: number;
}

interface Orcamento {
  id: string;
  fornecedor: string;
  dataOrcamento: string;
  status: 'pendente' | 'analisando' | 'aprovado' | 'rejeitado';
  componentes: {
    modulos?: {
      marca: string;
      modelo: string;
      potencia: number;
      quantidade: number;
      precoUnitario: number;
      precoCusto: number;  // Preço de custo do YAML
      precoTotal: number;
    };
    inversores?: {
      marca: string;
      modelo: string;
      potencia: number;
      quantidade: number;
      precoUnitario: number;
      precoCusto: number;  // Preço de custo do YAML
      precoTotal: number;
    };
    estrutura?: {
      tipo: string;
      quantidade: number;
      precoUnitario: number;
      precoCusto: number;  // Preço de custo do YAML
      precoTotal: number;
    };
    outros?: Array<{
      item: string;
      quantidade: number;
      precoUnitario: number;
      precoCusto: number;  // Preço de custo do YAML
      precoTotal: number;
    }>;
  };
  despesas?: Despesa[];     // Despesas adicionais do usuário
  precoCustoYaml?: number;  // Preço de custo original do YAML (distribuidor)
  pdespesaFixo?: number;    // Componente fixo da Pdespesa
  pdespesaVariavel?: number; // Componente variável da Pdespesa (%)
  pdespesaTotal?: number;   // Total da Pdespesa calculado
  despesasTotal: number;    // Soma das despesas do usuário
  precoTotalFinal: number;  // Preço PIX = Custo YAML + Despesas
  valorTotal: number;       // Compatibilidade (mesmo que precoTotalFinal)
  observacoes?: string;
}

export default function EditarOrcamento() {
  const router = useRouter();
  const { clienteId, orcamentoId } = router.query;
  
  const [orcamento, setOrcamento] = useState<Orcamento | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showDespesas, setShowDespesas] = useState(false);
  const [novaDespesa, setNovaDespesa] = useState({ categoria: '', descricao: '', valor: 0 });

  useEffect(() => {
    if (clienteId && orcamentoId) {
      loadOrcamento();
    }
  }, [clienteId, orcamentoId]);

  const loadOrcamento = async () => {
    try {
      const response = await fetch(`/api/admin/orcamentos/${clienteId}/${orcamentoId}`);
      if (response.ok) {
        const data = await response.json();

        // Se não tem precoCustoYaml definido, tenta carregar do YAML
        if (!data.precoCustoYaml) {
          const custoYaml = await buscarPrecoCustoYaml(data);
          data.precoCustoYaml = custoYaml;
        }

        setOrcamento(data);
      } else {
        setMessage({ type: 'error', text: 'Orçamento não encontrado' });
      }
    } catch (error) {
      console.error('Erro ao carregar orçamento:', error);
      setMessage({ type: 'error', text: 'Erro ao carregar orçamento' });
    } finally {
      setLoading(false);
    }
  };

  const buscarPrecoCustoYaml = async (orcamentoData: any) => {
    try {
      // Tenta carregar do arquivo YAML do cliente
      const yamlResponse = await fetch(`/api/admin/clientes/${clienteId}/yaml-precos`);
      if (yamlResponse.ok) {
        const yamlData = await yamlResponse.json();

        // Busca em todos os distribuidores
        for (const distribuidor in yamlData) {
          const orcamentos = yamlData[distribuidor];

          // Procura orçamento que melhor corresponda aos componentes
          for (const orc of orcamentos) {
            if (orc.preco_total) {
              // Se tem módulos, tenta fazer match por quantidade de módulos
              if (orcamentoData.componentes?.modulos?.quantidade && orc.modulos?.length > 0) {
                const qtdModulosYaml = orc.modulos[0]?.quantidade;
                const qtdModulosOrcamento = orcamentoData.componentes.modulos.quantidade;

                // Se as quantidades são próximas (diferença <= 2), usa esse orçamento
                if (Math.abs(qtdModulosYaml - qtdModulosOrcamento) <= 2) {
                  console.log(`Encontrado orçamento YAML correspondente: ${distribuidor} - ${orc.arquivo_origem || 'ID: ' + orc.orcamento_id} - R$ ${orc.preco_total}`);
                  return orc.preco_total;
                }
              }
            }
          }
        }

        // Se não encontrou match exato, pega o primeiro orçamento disponível
        for (const distribuidor in yamlData) {
          const orcamentos = yamlData[distribuidor];
          if (orcamentos.length > 0 && orcamentos[0].preco_total) {
            console.log(`Usando orçamento YAML padrão: ${distribuidor} - R$ ${orcamentos[0].preco_total}`);
            return orcamentos[0].preco_total;
          }
        }
      }
    } catch (error) {
      console.log('Erro ao buscar preço do YAML:', error);
    }

    // Se não encontrou no YAML, calcula com base nos componentes
    return calculateCustoTotal();
  };

  const handleSave = async () => {
    if (!orcamento) return;
    
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/orcamentos/${clienteId}/${orcamentoId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orcamento),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Orçamento salvo com sucesso!' });
        setTimeout(() => {
          router.push(`/admin/orcamentos/${clienteId}`);
        }, 1500);
      } else {
        setMessage({ type: 'error', text: 'Erro ao salvar orçamento' });
      }
    } catch (error) {
      console.error('Erro ao salvar:', error);
      setMessage({ type: 'error', text: 'Erro ao salvar orçamento' });
    } finally {
      setSaving(false);
    }
  };

  const updateModulo = (field: string, value: any) => {
    if (!orcamento) return;

    const modulos = orcamento.componentes.modulos;
    let precoTotal = modulos?.precoTotal || 0;

    if (field === 'quantidade' || field === 'precoUnitario') {
      const quantidade = field === 'quantidade' ? value : (modulos?.quantidade || 0);
      const precoUnitario = field === 'precoUnitario' ? value : (modulos?.precoUnitario || 0);
      precoTotal = quantidade * precoUnitario;
    }

    setOrcamento({
      ...orcamento,
      componentes: {
        ...orcamento.componentes,
        modulos: {
          ...modulos,
          [field]: value,
          precoTotal: precoTotal,
          // Manter preço de custo se não estiver definido
          precoCusto: modulos?.precoCusto || (precoTotal * 0.7) // 70% como estimativa
        } as any
      }
    });
  };

  const updateInversor = (field: string, value: any) => {
    if (!orcamento) return;

    const inversores = orcamento.componentes.inversores;
    let precoTotal = inversores?.precoTotal || 0;

    if (field === 'quantidade' || field === 'precoUnitario') {
      const quantidade = field === 'quantidade' ? value : (inversores?.quantidade || 0);
      const precoUnitario = field === 'precoUnitario' ? value : (inversores?.precoUnitario || 0);
      precoTotal = quantidade * precoUnitario;
    }

    setOrcamento({
      ...orcamento,
      componentes: {
        ...orcamento.componentes,
        inversores: {
          ...inversores,
          [field]: value,
          precoTotal: precoTotal,
          // Manter preço de custo se não estiver definido
          precoCusto: inversores?.precoCusto || (precoTotal * 0.7) // 70% como estimativa
        } as any
      }
    });
  };

  // Funções para gerenciar despesas
  const adicionarDespesa = () => {
    if (!orcamento || !novaDespesa.categoria || !novaDespesa.descricao || novaDespesa.valor <= 0) {
      setMessage({ type: 'error', text: 'Preencha todos os campos da despesa' });
      return;
    }

    const despesa: Despesa = {
      id: Date.now().toString(),
      categoria: novaDespesa.categoria,
      descricao: novaDespesa.descricao,
      valor: novaDespesa.valor
    };

    setOrcamento({
      ...orcamento,
      despesas: [...(orcamento.despesas || []), despesa]
    });

    setNovaDespesa({ categoria: '', descricao: '', valor: 0 });
    setMessage({ type: 'success', text: 'Despesa adicionada com sucesso!' });
  };

  const removerDespesa = (id: string) => {
    if (!orcamento) return;

    setOrcamento({
      ...orcamento,
      despesas: orcamento.despesas?.filter(d => d.id !== id) || []
    });
  };

  const calculateCustoTotal = () => {
    if (!orcamento) return 0;

    const modulosCusto = orcamento.componentes.modulos?.precoCusto || 0;
    const inversoresCusto = orcamento.componentes.inversores?.precoCusto || 0;
    const estruturaCusto = orcamento.componentes.estrutura?.precoCusto || 0;
    const outrosCusto = orcamento.componentes.outros?.reduce((sum, item) => sum + (item.precoCusto || 0), 0) || 0;

    return modulosCusto + inversoresCusto + estruturaCusto + outrosCusto;
  };

  const calculateDespesasTotal = () => {
    if (!orcamento) return 0;

    // Se tem despesas manuais, usa elas
    if (orcamento.despesas && orcamento.despesas.length > 0) {
      return orcamento.despesas.reduce((sum, despesa) => sum + despesa.valor, 0);
    }

    // 🔧 NOVO: Se não tem despesas manuais, usa Pdespesa Fixo + Variável
    const custoBase = orcamento.precoCustoYaml || calculateCustoTotal();
    const pdespesaFixo = orcamento.pdespesaFixo || 3000;
    const pdespesaVariavel = orcamento.pdespesaVariavel || 22;
    
    const pdespesaTotal = pdespesaFixo + (custoBase * pdespesaVariavel / 100);
    
    // Atualizar o total da Pdespesa no state
    if (orcamento.pdespesaTotal !== pdespesaTotal) {
      setOrcamento({
        ...orcamento,
        pdespesaTotal: pdespesaTotal
      });
    }
    
    return pdespesaTotal;
  };

  const calculateTotal = () => {
    if (!orcamento) return 0;

    const modulosTotal = orcamento.componentes.modulos?.precoTotal || 0;
    const inversoresTotal = orcamento.componentes.inversores?.precoTotal || 0;
    const estruturaTotal = orcamento.componentes.estrutura?.precoTotal || 0;
    const outrosTotal = orcamento.componentes.outros?.reduce((sum, item) => sum + (item.precoTotal || 0), 0) || 0;
    const despesasTotal = calculateDespesasTotal();

    const total = modulosTotal + inversoresTotal + estruturaTotal + outrosTotal + despesasTotal;

    // Atualizar os totais no state
    const precoCustoTotal = calculateCustoTotal();
    if (total !== orcamento.valorTotal || precoCustoTotal !== orcamento.precoCustoYaml || despesasTotal !== orcamento.despesasTotal) {
      setOrcamento({
        ...orcamento,
        valorTotal: total,
        precoCustoYaml: precoCustoTotal,
        despesasTotal: despesasTotal
      });
    }

    return total;
  };

  useEffect(() => {
    if (orcamento) {
      calculateTotal();
    }
  }, [orcamento?.componentes]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">⚡</div>
          <p className="text-xl text-gray-600">Carregando orçamento...</p>
        </div>
      </div>
    );
  }

  if (!orcamento) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <p className="text-xl text-gray-600 mb-4">Orçamento não encontrado</p>
          <Link href={`/admin/orcamentos/${clienteId}`}>
            <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              ← Voltar aos Orçamentos
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Editar Orçamento | PIENG Solar</title>
        <meta name="description" content="Editor de orçamentos PIENG Solar" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-orange-50">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
              <div>
                <div className="flex items-center gap-4 mb-2">
                  <Link href={`/admin/orcamentos/${clienteId}`}>
                    <button className="text-blue-600 hover:text-blue-800">
                      ← Voltar aos Orçamentos
                    </button>
                  </Link>
                  <span className="text-gray-400">|</span>
                  <h1 className="text-3xl font-bold text-gray-800">
                    ✏️ Editar Orçamento
                  </h1>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <p className="text-gray-600">
                    📋 {orcamento.fornecedor} • 📅 {orcamento.dataOrcamento} • 
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                      orcamento.status === 'aprovado' ? 'bg-green-100 text-green-800' :
                      orcamento.status === 'rejeitado' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {orcamento.status.toUpperCase()}
                    </span>
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {saving ? '⏳ Salvando...' : '💾 Salvar'}
                </button>
              </div>
            </div>

            {/* Mensagens */}
            {message && (
              <div className={`p-4 rounded-lg mb-6 ${
                message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {message.text}
              </div>
            )}

            {/* Configuração Global de Pdespesa */}
            <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl shadow-lg p-6 text-white mb-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                💰 Configuração de Pdespesa (Cliente)
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Componente Fixo */}
                <div>
                  <label className="block text-sm font-medium mb-2 opacity-90">
                    💵 Componente Fixo (R$)
                  </label>
                  <p className="text-xs opacity-80 mb-3">
                    Valor fixo da Pdespesa
                  </p>
                  <div className="bg-white/20 rounded-lg p-3">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={orcamento?.pdespesaFixo || 3000}
                      onChange={(e) => setOrcamento({
                        ...orcamento!,
                        pdespesaFixo: parseFloat(e.target.value) || 0
                      })}
                      className="w-full px-3 py-2 text-center text-lg font-bold bg-transparent border-2 border-white/50 rounded-lg text-white placeholder-white/70 focus:border-white focus:outline-none"
                      placeholder="3000.00"
                    />
                  </div>
                </div>

                {/* Componente Variável */}
                <div>
                  <label className="block text-sm font-medium mb-2 opacity-90">
                    📊 Componente Variável (%)
                  </label>
                  <p className="text-xs opacity-80 mb-3">
                    Percentual sobre custo YAML
                  </p>
                  <div className="bg-white/20 rounded-lg p-3">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={orcamento?.pdespesaVariavel || 22}
                      onChange={(e) => setOrcamento({
                        ...orcamento!,
                        pdespesaVariavel: parseFloat(e.target.value) || 0
                      })}
                      className="w-full px-3 py-2 text-center text-lg font-bold bg-transparent border-2 border-white/50 rounded-lg text-white placeholder-white/70 focus:border-white focus:outline-none"
                      placeholder="22.0"
                    />
                  </div>
                </div>

                {/* Preview */}
                <div>
                  <label className="block text-sm font-medium mb-2 opacity-90">
                    💰 Pdespesa Total
                  </label>
                  <p className="text-xs opacity-80 mb-3">
                    Fixo + Variável sobre custo
                  </p>
                  <div className="bg-white/20 rounded-lg p-3">
                    <div className="text-2xl font-bold text-center text-yellow-300">
                      R$ {(() => {
                        const custoBase = orcamento?.precoCustoYaml || calculateCustoTotal();
                        const pdespesaFixo = orcamento?.pdespesaFixo || 3000;
                        const pdespesaVariavel = orcamento?.pdespesaVariavel || 22;
                        return (pdespesaFixo + (custoBase * pdespesaVariavel / 100)).toFixed(2);
                      })()}
                    </div>
                  </div>
                  <p className="text-xs opacity-70 mt-2 text-center">
                    R$ {(orcamento?.pdespesaFixo || 3000).toFixed(2)} + {(orcamento?.pdespesaVariavel || 22)}% de R$ {(orcamento?.precoCustoYaml || calculateCustoTotal()).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            {/* Editor de Componentes */}
            <div className="space-y-6">
              
              {/* Módulos Solares */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  ⚡ Módulos Solares
                </h2>
                {orcamento.componentes.modulos ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Marca</label>
                        <input
                          type="text"
                          title="Marca do módulo solar"
                          value={orcamento.componentes.modulos.marca}
                          onChange={(e) => updateModulo('marca', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Modelo</label>
                        <input
                          type="text"
                          title="Modelo do módulo solar"
                          value={orcamento.componentes.modulos.modelo}
                          onChange={(e) => updateModulo('modelo', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Potência (W)</label>
                        <input
                          type="number"
                          title="Potência do módulo em watts"
                          value={orcamento.componentes.modulos.potencia}
                          onChange={(e) => updateModulo('potencia', parseInt(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Quantidade</label>
                        <input
                          type="number"
                          title="Quantidade de módulos"
                          value={orcamento.componentes.modulos.quantidade}
                          onChange={(e) => updateModulo('quantidade', parseInt(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">💰 Preço de Custo (R$)</label>
                        <input
                          type="number"
                          step="0.01"
                          title="Preço de custo do módulo no YAML"
                          value={orcamento.componentes.modulos.precoCusto || 0}
                          onChange={(e) => updateModulo('precoCusto', parseFloat(e.target.value))}
                          className="w-full px-3 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 bg-orange-50"
                          placeholder="Preço de custo do YAML"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Preço Unitário (R$)</label>
                        <input
                          type="number"
                          step="0.01"
                          title="Preço unitário do módulo"
                          value={orcamento.componentes.modulos.precoUnitario}
                          onChange={(e) => updateModulo('precoUnitario', parseFloat(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 italic">Nenhum módulo cadastrado</p>
                )}
              </div>

              {/* Inversores */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  🔌 Inversores
                </h2>
                {orcamento.componentes.inversores ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Marca</label>
                        <input
                          type="text"
                          title="Marca do inversor"
                          value={orcamento.componentes.inversores.marca}
                          onChange={(e) => updateInversor('marca', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Modelo</label>
                        <input
                          type="text"
                          title="Modelo do inversor"
                          value={orcamento.componentes.inversores.modelo}
                          onChange={(e) => updateInversor('modelo', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Potência (kW)</label>
                        <input
                          type="number"
                          step="0.1"
                          title="Potência do inversor em kW"
                          value={orcamento.componentes.inversores.potencia}
                          onChange={(e) => updateInversor('potencia', parseFloat(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Quantidade</label>
                        <input
                          type="number"
                          title="Quantidade de inversores"
                          value={orcamento.componentes.inversores.quantidade}
                          onChange={(e) => updateInversor('quantidade', parseInt(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">💰 Preço de Custo (R$)</label>
                        <input
                          type="number"
                          step="0.01"
                          title="Preço de custo do inversor no YAML"
                          value={orcamento.componentes.inversores.precoCusto || 0}
                          onChange={(e) => updateInversor('precoCusto', parseFloat(e.target.value))}
                          className="w-full px-3 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 bg-orange-50"
                          placeholder="Preço de custo do YAML"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Preço Unitário (R$)</label>
                        <input
                          type="number"
                          step="0.01"
                          title="Preço unitário do inversor"
                          value={orcamento.componentes.inversores.precoUnitario}
                          onChange={(e) => updateInversor('precoUnitario', parseFloat(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 italic">Nenhum inversor cadastrado</p>
                )}
              </div>

              {/* Gestão de Despesas */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    💸 Despesas Adicionais
                  </h2>
                  <button
                    onClick={() => setShowDespesas(!showDespesas)}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
                  >
                    {showDespesas ? '🔼 Ocultar' : '🔽 Gerenciar Despesas'}
                  </button>
                </div>

                {showDespesas && (
                  <div className="space-y-6">
                    {/* Adicionar Nova Despesa */}
                    <div className="p-4 bg-purple-50 rounded-lg">
                      <h3 className="font-semibold text-gray-800 mb-3">➕ Nova Despesa</h3>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                          <select
                            title="Categoria da despesa"
                            value={novaDespesa.categoria}
                            onChange={(e) => setNovaDespesa({ ...novaDespesa, categoria: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                          >
                            <option value="">Selecione...</option>
                            <option value="Frete">🚚 Frete</option>
                            <option value="Instalação">🔧 Instalação</option>
                            <option value="Projeto">📋 Projeto</option>
                            <option value="Homologação">📋 Homologação</option>
                            <option value="Comissão">💰 Comissão</option>
                            <option value="Outros">📦 Outros</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                          <input
                            type="text"
                            value={novaDespesa.descricao}
                            onChange={(e) => setNovaDespesa({ ...novaDespesa, descricao: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                            placeholder="Descrição da despesa"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={novaDespesa.valor}
                            onChange={(e) => setNovaDespesa({ ...novaDespesa, valor: parseFloat(e.target.value) || 0 })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                            placeholder="0,00"
                          />
                        </div>
                        <div className="flex items-end">
                          <button
                            onClick={adicionarDespesa}
                            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                          >
                            ➕ Adicionar
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Lista de Despesas */}
                    {orcamento.despesas && orcamento.despesas.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-gray-800 mb-3">📋 Despesas Cadastradas</h3>
                        <div className="space-y-2">
                          {orcamento.despesas.map((despesa) => (
                            <div key={despesa.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full font-medium">
                                    {despesa.categoria}
                                  </span>
                                  <span className="font-medium text-gray-800">{despesa.descricao}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="font-bold text-green-600">
                                  R$ {despesa.valor.toFixed(2)}
                                </span>
                                <button
                                  onClick={() => removerDespesa(despesa.id)}
                                  className="text-red-600 hover:text-red-800 p-1"
                                  title="Remover despesa"
                                >
                                  🗑️
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Card Estrutura de Preços */}
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl shadow-lg p-6 text-white">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                  💰 Estrutura de Preços
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                  {/* Preço de Custo (YAML) */}
                  <div className="bg-white/20 rounded-lg p-6 text-center">
                    <div className="text-3xl mb-3">📋</div>
                    <h3 className="text-lg font-semibold mb-3 opacity-90">Preço de Custo</h3>
                    <p className="text-sm opacity-80 mb-4">Valor do YAML (Distribuidor)</p>
                    <div className="bg-white/20 rounded-lg p-3">
                      <input
                        type="number"
                        step="0.01"
                        value={orcamento.precoCustoYaml || calculateCustoTotal()}
                        onChange={(e) => setOrcamento({
                          ...orcamento,
                          precoCustoYaml: parseFloat(e.target.value) || 0
                        })}
                        className="w-full px-3 py-2 text-center text-lg font-bold bg-transparent border-2 border-white/50 rounded-lg text-white placeholder-white/70 focus:border-white focus:outline-none"
                        placeholder={(orcamento.precoCustoYaml || calculateCustoTotal()).toFixed(2)}
                      />
                    </div>
                    <p className="text-xs opacity-70 mt-2">R$ {(orcamento.precoCustoYaml || calculateCustoTotal()).toFixed(2)}</p>
                  </div>

                  {/* Pdespesa do Usuário */}
                  <div className="bg-white/20 rounded-lg p-6 text-center">
                    <div className="text-3xl mb-3">💸</div>
                    <h3 className="text-lg font-semibold mb-3 opacity-90">Pdespesa</h3>
                    <p className="text-sm opacity-80 mb-4">
                      {(orcamento.despesas && orcamento.despesas.length > 0)
                        ? 'Despesas Manuais'
                        : `Pdespesa: R$ ${(orcamento.pdespesaFixo || 3000).toFixed(2)} + ${orcamento.pdespesaVariavel || 22}%`
                      }
                    </p>
                    <div className="bg-white/20 rounded-lg p-3">
                      <div className="text-2xl font-bold">
                        R$ {calculateDespesasTotal().toFixed(2)}
                      </div>
                    </div>
                    <p className="text-xs opacity-70 mt-2">
                      {(orcamento.despesas && orcamento.despesas.length > 0)
                        ? `${orcamento.despesas.length} item${orcamento.despesas.length !== 1 ? 's' : ''} manual${orcamento.despesas.length !== 1 ? 'is' : ''}`
                        : 'Fixo + Variável sobre custo'
                      }
                    </p>
                  </div>

                  {/* Preço Total PIX */}
                  <div className="bg-white/30 rounded-lg p-6 text-center border-2 border-white/50">
                    <div className="text-3xl mb-3">💳</div>
                    <h3 className="text-lg font-semibold mb-3">Preço Total PIX</h3>
                    <p className="text-sm opacity-80 mb-4">Custo + Despesas</p>
                    <div className="bg-white/20 rounded-lg p-3">
                      <div className="text-3xl font-bold text-yellow-300">
                        R$ {((orcamento.precoCustoYaml || calculateCustoTotal()) + calculateDespesasTotal()).toFixed(2)}
                      </div>
                    </div>
                    <p className="text-xs opacity-70 mt-2">
                      Valor final para o cliente
                    </p>
                  </div>
                </div>

                {/* Resumo da Operação */}
                <div className="mt-6 p-4 bg-white/10 rounded-lg">
                  <div className="flex items-center justify-center text-lg font-semibold">
                    R$ {(orcamento.precoCustoYaml || calculateCustoTotal()).toFixed(2)}
                    <span className="mx-3 text-2xl">+</span>
                    R$ {calculateDespesasTotal().toFixed(2)}
                    <span className="mx-3 text-2xl">=</span>
                    <span className="text-2xl font-bold text-yellow-300">
                      R$ {((orcamento.precoCustoYaml || calculateCustoTotal()) + calculateDespesasTotal()).toFixed(2)}
                    </span>
                  </div>
                  <p className="text-center text-sm opacity-80 mt-2">
                    Preço de Custo + Pdespesa = Preço PIX Final
                  </p>
                </div>
              </div>

              {/* Observações */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  📝 Observações
                </h2>
                <textarea
                  value={orcamento.observacoes || ''}
                  onChange={(e) => setOrcamento({ ...orcamento, observacoes: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Observações sobre o orçamento..."
                />
              </div>

              {/* Resumo Financeiro Completo */}
              <div className="bg-gradient-to-r from-green-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                  💰 Resumo Financeiro Completo
                </h2>

                {/* Primeira linha - Vendas */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3 opacity-90">📊 Valores de Venda</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white/20 rounded-lg p-4">
                      <p className="text-sm opacity-90">Módulos</p>
                      <p className="text-2xl font-bold">
                        R$ {(orcamento.componentes.modulos?.precoTotal || 0).toFixed(2)}
                      </p>
                    </div>
                    <div className="bg-white/20 rounded-lg p-4">
                      <p className="text-sm opacity-90">Inversores</p>
                      <p className="text-2xl font-bold">
                        R$ {(orcamento.componentes.inversores?.precoTotal || 0).toFixed(2)}
                      </p>
                    </div>
                    <div className="bg-white/20 rounded-lg p-4">
                      <p className="text-sm opacity-90">Despesas</p>
                      <p className="text-2xl font-bold">
                        R$ {calculateDespesasTotal().toFixed(2)}
                      </p>
                    </div>
                    <div className="bg-white/30 rounded-lg p-4 border-2 border-white/50">
                      <p className="text-sm opacity-90">TOTAL VENDA</p>
                      <p className="text-3xl font-bold">
                        R$ {calculateTotal().toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Segunda linha - Custos */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3 opacity-90">💰 Custos (YAML)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-orange-500/30 rounded-lg p-4 border border-orange-300/50">
                      <p className="text-sm opacity-90">Custo Módulos</p>
                      <p className="text-xl font-bold">
                        R$ {((orcamento.componentes.modulos?.precoCusto || 0) * (orcamento.componentes.modulos?.quantidade || 0)).toFixed(2)}
                      </p>
                    </div>
                    <div className="bg-orange-500/30 rounded-lg p-4 border border-orange-300/50">
                      <p className="text-sm opacity-90">Custo Inversores</p>
                      <p className="text-xl font-bold">
                        R$ {((orcamento.componentes.inversores?.precoCusto || 0) * (orcamento.componentes.inversores?.quantidade || 0)).toFixed(2)}
                      </p>
                    </div>
                    <div className="bg-orange-500/30 rounded-lg p-4 border border-orange-300/50">
                      <p className="text-sm opacity-90">Total Custos</p>
                      <p className="text-xl font-bold">
                        R$ {calculateCustoTotal().toFixed(2)}
                      </p>
                    </div>
                    <div className="bg-yellow-500/40 rounded-lg p-4 border-2 border-yellow-300/50">
                      <p className="text-sm opacity-90">MARGEM TOTAL</p>
                      <p className="text-2xl font-bold">
                        {calculateTotal() > 0 ? (((calculateTotal() - calculateCustoTotal()) / calculateTotal()) * 100).toFixed(1) : 0}%
                      </p>
                    </div>
                  </div>
                </div>

                {/* Terceira linha - Lucro */}
                <div className="bg-white/10 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-sm opacity-90">Receita Total</p>
                      <p className="text-xl font-bold text-green-300">
                        R$ {calculateTotal().toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm opacity-90">Custo Total</p>
                      <p className="text-xl font-bold text-orange-300">
                        R$ {calculateCustoTotal().toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm opacity-90">LUCRO BRUTO</p>
                      <p className="text-2xl font-bold text-yellow-300">
                        R$ {(calculateTotal() - calculateCustoTotal()).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </>
  );
}