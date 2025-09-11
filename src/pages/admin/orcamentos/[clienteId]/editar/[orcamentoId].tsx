import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

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
      precoTotal: number;
    };
    inversores?: {
      marca: string;
      modelo: string;
      potencia: number;
      quantidade: number;
      precoUnitario: number;
      precoTotal: number;
    };
    estrutura?: {
      tipo: string;
      quantidade: number;
      precoUnitario: number;
      precoTotal: number;
    };
    outros?: Array<{
      item: string;
      quantidade: number;
      precoUnitario: number;
      precoTotal: number;
    }>;
  };
  valorTotal: number;
  observacoes?: string;
}

export default function EditarOrcamento() {
  const router = useRouter();
  const { clienteId, orcamentoId } = router.query;
  
  const [orcamento, setOrcamento] = useState<Orcamento | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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
    
    setOrcamento({
      ...orcamento,
      componentes: {
        ...orcamento.componentes,
        modulos: {
          ...orcamento.componentes.modulos,
          [field]: value,
          precoTotal: field === 'quantidade' || field === 'precoUnitario' 
            ? (field === 'quantidade' ? value : orcamento.componentes.modulos?.quantidade || 0) * 
              (field === 'precoUnitario' ? value : orcamento.componentes.modulos?.precoUnitario || 0)
            : orcamento.componentes.modulos?.precoTotal || 0
        } as any
      }
    });
  };

  const updateInversor = (field: string, value: any) => {
    if (!orcamento) return;
    
    setOrcamento({
      ...orcamento,
      componentes: {
        ...orcamento.componentes,
        inversores: {
          ...orcamento.componentes.inversores,
          [field]: value,
          precoTotal: field === 'quantidade' || field === 'precoUnitario' 
            ? (field === 'quantidade' ? value : orcamento.componentes.inversores?.quantidade || 0) * 
              (field === 'precoUnitario' ? value : orcamento.componentes.inversores?.precoUnitario || 0)
            : orcamento.componentes.inversores?.precoTotal || 0
        } as any
      }
    });
  };

  const calculateTotal = () => {
    if (!orcamento) return 0;
    
    const modulosTotal = orcamento.componentes.modulos?.precoTotal || 0;
    const inversoresTotal = orcamento.componentes.inversores?.precoTotal || 0;
    const estruturaTotal = orcamento.componentes.estrutura?.precoTotal || 0;
    const outrosTotal = orcamento.componentes.outros?.reduce((sum, item) => sum + (item.precoTotal || 0), 0) || 0;
    
    const total = modulosTotal + inversoresTotal + estruturaTotal + outrosTotal;
    
    // Atualizar o valor total no state
    if (total !== orcamento.valorTotal) {
      setOrcamento({
        ...orcamento,
        valorTotal: total
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

            {/* Editor de Componentes */}
            <div className="space-y-6">
              
              {/* Módulos Solares */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  ⚡ Módulos Solares
                </h2>
                {orcamento.componentes.modulos ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Marca</label>
                      <input
                        type="text"
                        value={orcamento.componentes.modulos.marca}
                        onChange={(e) => updateModulo('marca', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Modelo</label>
                      <input
                        type="text"
                        value={orcamento.componentes.modulos.modelo}
                        onChange={(e) => updateModulo('modelo', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Potência (W)</label>
                      <input
                        type="number"
                        value={orcamento.componentes.modulos.potencia}
                        onChange={(e) => updateModulo('potencia', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Quantidade</label>
                      <input
                        type="number"
                        value={orcamento.componentes.modulos.quantidade}
                        onChange={(e) => updateModulo('quantidade', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Preço Unitário (R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={orcamento.componentes.modulos.precoUnitario}
                        onChange={(e) => updateModulo('precoUnitario', parseFloat(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Subtotal (R$)</label>
                      <input
                        type="text"
                        value={`R$ ${(orcamento.componentes.modulos.precoTotal || 0).toFixed(2)}`}
                        disabled
                        className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg font-bold"
                      />
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
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Marca</label>
                      <input
                        type="text"
                        value={orcamento.componentes.inversores.marca}
                        onChange={(e) => updateInversor('marca', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Modelo</label>
                      <input
                        type="text"
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
                        value={orcamento.componentes.inversores.potencia}
                        onChange={(e) => updateInversor('potencia', parseFloat(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Quantidade</label>
                      <input
                        type="number"
                        value={orcamento.componentes.inversores.quantidade}
                        onChange={(e) => updateInversor('quantidade', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Preço Unitário (R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={orcamento.componentes.inversores.precoUnitario}
                        onChange={(e) => updateInversor('precoUnitario', parseFloat(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Subtotal (R$)</label>
                      <input
                        type="text"
                        value={`R$ ${(orcamento.componentes.inversores.precoTotal || 0).toFixed(2)}`}
                        disabled
                        className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg font-bold"
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 italic">Nenhum inversor cadastrado</p>
                )}
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

              {/* Resumo Financeiro */}
              <div className="bg-gradient-to-r from-green-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  💰 Resumo Financeiro
                </h2>
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
                    <p className="text-sm opacity-90">Outros</p>
                    <p className="text-2xl font-bold">
                      R$ {((orcamento.componentes.estrutura?.precoTotal || 0) + 
                           (orcamento.componentes.outros?.reduce((sum, item) => sum + (item.precoTotal || 0), 0) || 0)).toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-white/30 rounded-lg p-4 border-2 border-white/50">
                    <p className="text-sm opacity-90">TOTAL GERAL</p>
                    <p className="text-3xl font-bold">
                      R$ {calculateTotal().toFixed(2)}
                    </p>
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