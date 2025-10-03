import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

interface ComponenteBase {
  id: string;
  marca: string;
  modelo: string;
  potencia?: number;
  especificacoes: string[];
}

interface OrcamentoForm {
  fornecedor: string;
  dataOrcamento: string;
  observacoes: string;
  modulos: {
    componenteId: string;
    quantidade: number;
    precoUnitario: number;
    customData?: ComponenteBase;
  };
  inversores: {
    componenteId: string;
    quantidade: number;
    precoUnitario: number;
    customData?: ComponenteBase;
  };
  estrutura: {
    tipo: string;
    quantidade: number;
    precoUnitario: number;
  };
  outros: Array<{
    item: string;
    quantidade: number;
    precoUnitario: number;
    observacoes?: string;
  }>;
}

export default function EntradaManual() {
  const router = useRouter();
  const { clienteId } = router.query;
  
  const [formData, setFormData] = useState<OrcamentoForm>({
    fornecedor: '',
    dataOrcamento: new Date().toISOString().split('T')[0],
    observacoes: '',
    modulos: {
      componenteId: '',
      quantidade: 0,
      precoUnitario: 0
    },
    inversores: {
      componenteId: '',
      quantidade: 0,
      precoUnitario: 0
    },
    estrutura: {
      tipo: 'Estrutura Alumínio',
      quantidade: 1,
      precoUnitario: 0
    },
    outros: []
  });

  const [componentes, setComponentes] = useState<{
    modulos: ComponenteBase[];
    inversores: ComponenteBase[];
  }>({
    modulos: [],
    inversores: []
  });

  const [loading, setLoading] = useState(false);
  const [showCustomModule, setShowCustomModule] = useState(false);
  const [showCustomInverter, setShowCustomInverter] = useState(false);

  useEffect(() => {
    loadComponentes();
  }, []);

  const loadComponentes = async () => {
    try {
      const response = await fetch('/api/admin/componentes');
      if (response.ok) {
        const data = await response.json();
        setComponentes(data);
      }
    } catch (error) {
      console.error('Erro ao carregar componentes:', error);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNestedInputChange = (section: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...(prev as any)[section],
        [field]: value
      }
    }));
  };

  const addOutroItem = () => {
    setFormData(prev => ({
      ...prev,
      outros: [
        ...prev.outros,
        {
          item: '',
          quantidade: 1,
          precoUnitario: 0
        }
      ]
    }));
  };

  const removeOutroItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      outros: prev.outros.filter((_, i) => i !== index)
    }));
  };

  const updateOutroItem = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      outros: prev.outros.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const calculateTotal = () => {
    const modulosTotal = formData.modulos.quantidade * formData.modulos.precoUnitario;
    const inversoresTotal = formData.inversores.quantidade * formData.inversores.precoUnitario;
    const estruturaTotal = formData.estrutura.quantidade * formData.estrutura.precoUnitario;
    const outrosTotal = formData.outros.reduce((sum, item) => 
      sum + (item.quantidade * item.precoUnitario), 0
    );
    
    return modulosTotal + inversoresTotal + estruturaTotal + outrosTotal;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const orcamentoData = {
        ...formData,
        valorTotal: calculateTotal(),
        status: 'pendente',
        arquivos: []
      };

      const response = await fetch(`/api/admin/orcamentos/${clienteId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orcamentoData),
      });

      if (response.ok) {
        alert('Orçamento salvo com sucesso!');
        router.push(`/admin/orcamentos/${clienteId}`);
      } else {
        alert('Erro ao salvar orçamento');
      }
    } catch (error) {
      alert('Erro ao salvar orçamento');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Entrada Manual de Orçamento | PIENG Solar</title>
        <meta name="description" content="Entrada manual de dados técnicos do orçamento" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-orange-50">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
              <Link href={`/admin/orcamentos/${clienteId}`} legacyBehavior><a className="text-blue-600 hover:text-blue-800">
                ← Orçamentos
              </a></Link>
              <span className="text-gray-400">|</span>
              <h1 className="text-3xl font-bold text-gray-800">
                ✏️ Entrada Manual de Orçamento
              </h1>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              
              {/* Informações Gerais */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-6">
                  📋 Informações Gerais
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fornecedor *
                    </label>
                    <input
                      type="text"
                      value={formData.fornecedor}
                      onChange={(e) => handleInputChange('fornecedor', e.target.value)}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Nome do fornecedor"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Data do Orçamento *
                    </label>
                    <input
                      type="date"
                      value={formData.dataOrcamento}
                      onChange={(e) => handleInputChange('dataOrcamento', e.target.value)}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Observações
                  </label>
                  <textarea
                    value={formData.observacoes}
                    onChange={(e) => handleInputChange('observacoes', e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Observações adicionais sobre o orçamento..."
                  />
                </div>
              </div>

              {/* Módulos Solares */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-6">
                  🔋 Módulos Solares
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Componente
                    </label>
                    <select
                      value={formData.modulos.componenteId}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === 'custom') {
                          setShowCustomModule(true);
                        } else {
                          setShowCustomModule(false);
                          handleNestedInputChange('modulos', 'componenteId', value);
                        }
                      }}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Selecionar módulo</option>
                      {componentes.modulos.map(comp => (
                        <option key={comp.id} value={comp.id}>
                          {comp.marca} {comp.modelo} - {comp.potencia}W
                        </option>
                      ))}
                      <option value="custom">+ Módulo personalizado</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quantidade *
                    </label>
                    <input
                      type="number"
                      value={formData.modulos.quantidade}
                      onChange={(e) => handleNestedInputChange('modulos', 'quantidade', parseInt(e.target.value) || 0)}
                      required
                      min="1"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Preço Unitário (R$) *
                    </label>
                    <input
                      type="number"
                      value={formData.modulos.precoUnitario}
                      onChange={(e) => handleNestedInputChange('modulos', 'precoUnitario', parseFloat(e.target.value) || 0)}
                      required
                      step="0.01"
                      min="0"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {showCustomModule && (
                  <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                    <h3 className="font-semibold text-blue-800 mb-4">Módulo Personalizado</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <input
                        type="text"
                        placeholder="Marca"
                        className="px-3 py-2 border border-blue-300 rounded-lg"
                        onChange={(e) => handleNestedInputChange('modulos', 'customData', {
                          ...formData.modulos.customData,
                          marca: e.target.value
                        })}
                      />
                      <input
                        type="text"
                        placeholder="Modelo"
                        className="px-3 py-2 border border-blue-300 rounded-lg"
                        onChange={(e) => handleNestedInputChange('modulos', 'customData', {
                          ...formData.modulos.customData,
                          modelo: e.target.value
                        })}
                      />
                      <input
                        type="number"
                        placeholder="Potência (W)"
                        className="px-3 py-2 border border-blue-300 rounded-lg"
                        onChange={(e) => handleNestedInputChange('modulos', 'customData', {
                          ...formData.modulos.customData,
                          potencia: parseInt(e.target.value) || 0
                        })}
                      />
                    </div>
                  </div>
                )}

                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600">
                    Subtotal: <span className="font-semibold text-gray-800">
                      R$ {(formData.modulos.quantidade * formData.modulos.precoUnitario).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Inversores */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-6">
                  ⚡ Inversores
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Componente
                    </label>
                    <select
                      value={formData.inversores.componenteId}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === 'custom') {
                          setShowCustomInverter(true);
                        } else {
                          setShowCustomInverter(false);
                          handleNestedInputChange('inversores', 'componenteId', value);
                        }
                      }}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Selecionar inversor</option>
                      {componentes.inversores.map(comp => (
                        <option key={comp.id} value={comp.id}>
                          {comp.marca} {comp.modelo} - {comp.potencia}kW
                        </option>
                      ))}
                      <option value="custom">+ Inversor personalizado</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quantidade *
                    </label>
                    <input
                      type="number"
                      value={formData.inversores.quantidade}
                      onChange={(e) => handleNestedInputChange('inversores', 'quantidade', parseInt(e.target.value) || 0)}
                      required
                      min="1"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Preço Unitário (R$) *
                    </label>
                    <input
                      type="number"
                      value={formData.inversores.precoUnitario}
                      onChange={(e) => handleNestedInputChange('inversores', 'precoUnitario', parseFloat(e.target.value) || 0)}
                      required
                      step="0.01"
                      min="0"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {showCustomInverter && (
                  <div className="mt-6 p-4 bg-green-50 rounded-lg">
                    <h3 className="font-semibold text-green-800 mb-4">Inversor Personalizado</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <input
                        type="text"
                        placeholder="Marca"
                        className="px-3 py-2 border border-green-300 rounded-lg"
                        onChange={(e) => handleNestedInputChange('inversores', 'customData', {
                          ...formData.inversores.customData,
                          marca: e.target.value
                        })}
                      />
                      <input
                        type="text"
                        placeholder="Modelo"
                        className="px-3 py-2 border border-green-300 rounded-lg"
                        onChange={(e) => handleNestedInputChange('inversores', 'customData', {
                          ...formData.inversores.customData,
                          modelo: e.target.value
                        })}
                      />
                      <input
                        type="number"
                        placeholder="Potência (kW)"
                        className="px-3 py-2 border border-green-300 rounded-lg"
                        onChange={(e) => handleNestedInputChange('inversores', 'customData', {
                          ...formData.inversores.customData,
                          potencia: parseInt(e.target.value) || 0
                        })}
                      />
                    </div>
                  </div>
                )}

                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600">
                    Subtotal: <span className="font-semibold text-gray-800">
                      R$ {(formData.inversores.quantidade * formData.inversores.precoUnitario).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Estrutura */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-6">
                  🏗️ Estrutura de Fixação
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tipo de Estrutura
                    </label>
                    <select
                      value={formData.estrutura.tipo}
                      onChange={(e) => handleNestedInputChange('estrutura', 'tipo', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="Estrutura Alumínio">Estrutura Alumínio</option>
                      <option value="Estrutura Aço Galvanizado">Estrutura Aço Galvanizado</option>
                      <option value="Estrutura Solo">Estrutura Solo</option>
                      <option value="Estrutura Laje">Estrutura Laje</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quantidade *
                    </label>
                    <input
                      type="number"
                      value={formData.estrutura.quantidade}
                      onChange={(e) => handleNestedInputChange('estrutura', 'quantidade', parseInt(e.target.value) || 0)}
                      required
                      min="1"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Preço Total (R$) *
                    </label>
                    <input
                      type="number"
                      value={formData.estrutura.precoUnitario}
                      onChange={(e) => handleNestedInputChange('estrutura', 'precoUnitario', parseFloat(e.target.value) || 0)}
                      required
                      step="0.01"
                      min="0"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Outros Componentes */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-gray-800">
                    🔧 Outros Componentes
                  </h2>
                  <button
                    type="button"
                    onClick={addOutroItem}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    + Adicionar Item
                  </button>
                </div>

                {formData.outros.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Nenhum item adicional. Clique em "Adicionar Item" para incluir cabeamentos, proteções, etc.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {formData.outros.map((item, index) => (
                      <div key={index} className="p-4 bg-gray-50 rounded-lg">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Item
                            </label>
                            <input
                              type="text"
                              value={item.item}
                              onChange={(e) => updateOutroItem(index, 'item', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                              placeholder="Ex: Cabeamento CC"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Quantidade
                            </label>
                            <input
                              type="number"
                              value={item.quantidade}
                              onChange={(e) => updateOutroItem(index, 'quantidade', parseInt(e.target.value) || 0)}
                              min="1"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Preço Unit. (R$)
                            </label>
                            <input
                              type="number"
                              value={item.precoUnitario}
                              onChange={(e) => updateOutroItem(index, 'precoUnitario', parseFloat(e.target.value) || 0)}
                              step="0.01"
                              min="0"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            />
                          </div>
                          <div className="flex items-end">
                            <button
                              type="button"
                              onClick={() => removeOutroItem(index)}
                              className="w-full px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                            >
                              🗑️ Remover
                            </button>
                          </div>
                        </div>
                        <div className="mt-2 text-sm text-gray-600">
                          Subtotal: R$ {(item.quantidade * item.precoUnitario).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Total Geral */}
              <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                <div className="text-center">
                  <h3 className="text-xl font-semibold text-green-800 mb-2">
                    💰 Valor Total do Orçamento
                  </h3>
                  <div className="text-3xl font-bold text-green-600">
                    R$ {calculateTotal().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="flex gap-4">
                <Link href={`/admin/orcamentos/${clienteId}`} legacyBehavior><a className="flex-1 py-3 px-6 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-center">
                  Cancelar
                </a></Link>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 px-6 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? 'Salvando...' : '💾 Salvar Orçamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}