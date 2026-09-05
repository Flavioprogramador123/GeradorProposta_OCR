import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

interface ClienteData {
  nome: string;
  cidade: string;
  consumoKwh: string;
  tipo: string;
  hspLocal: string;
  pdespesa: string;
  observacoes?: string;
}

export default function EditarCliente() {
  const router = useRouter();
  const { clienteId } = router.query;
  
  const [clienteData, setClienteData] = useState<ClienteData>({
    nome: '',
    cidade: '',
    consumoKwh: '',
    tipo: 'Residencial',
    hspLocal: '5.21',
    pdespesa: '',
    observacoes: ''
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (clienteId) {
      loadClienteData();
    }
  }, [clienteId]);

  const loadClienteData = async () => {
    try {
      const response = await fetch(`/api/admin/clientes/${clienteId}`);
      if (response.ok) {
        const data = await response.json();
        
        // Parse da cidade para separar observações se existir
        let cidade = data.cidade;
        let observacoes = '';
        
        const cidadeMatch = data.cidade.match(/^([^(]+)(?:\s*\(([^)]+)\))?/);
        if (cidadeMatch) {
          cidade = cidadeMatch[1].trim();
          observacoes = cidadeMatch[2] || '';
        }
        
        setClienteData({
          ...data,
          cidade,
          observacoes
        });
      } else if (response.status === 404) {
        setError('Cliente não encontrado');
      } else {
        setError('Erro ao carregar dados do cliente');
      }
    } catch (error) {
      setError('Erro ao carregar dados do cliente');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof ClienteData, value: string) => {
    setClienteData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const response = await fetch(`/api/admin/clientes/${clienteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clienteData),
      });

      if (response.ok) {
        alert('Cliente atualizado com sucesso!');
        router.push('/admin');
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Erro ao atualizar cliente');
      }
    } catch (error) {
      setError('Erro ao atualizar cliente');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-shell flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando dados do cliente...</p>
        </div>
      </div>
    );
  }

  if (error && !clienteData.nome) {
    return (
      <div className="admin-shell flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">{error}</h1>
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
        <title>Editar Cliente - {clienteData.nome} | PIENG Solar</title>
        <meta name="description" content={`Editar dados do cliente ${clienteData.nome}`} />
      </Head>

      <div className="admin-shell">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            
            {/* Header */}
            <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
              <h1 className="text-3xl font-bold admin-title">
                ✏️ Editar Cliente
              </h1>
              <div className="flex gap-3">
                <Link href="/admin" legacyBehavior>
                  <a className="admin-btn-ghost">
                    🏠 Admin
                  </a>
                </Link>
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="admin-btn-ghost"
                  title="Voltar"
                >
                  ← Voltar
                </button>
              </div>
            </div>

            {/* Formulário */}
            <div className="admin-surface p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                
                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                    {error}
                  </div>
                )}

                {/* Dados Básicos */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nome do Cliente *
                    </label>
                    <input
                      type="text"
                      value={clienteData.nome}
                      onChange={(e) => handleInputChange('nome', e.target.value)}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Ex: João da Silva"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tipo de Imóvel *
                    </label>
                    <select
                      value={clienteData.tipo}
                      onChange={(e) => handleInputChange('tipo', e.target.value)}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="Residencial">Residencial</option>
                      <option value="Comercial">Comercial</option>
                      <option value="Industrial">Industrial</option>
                      <option value="Rural">Rural</option>
                      <option value="Resindência">Resindência</option>
                    </select>
                  </div>
                </div>

                {/* Localização */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cidade *
                  </label>
                  <input
                    type="text"
                    value={clienteData.cidade}
                    onChange={(e) => handleInputChange('cidade', e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ex: Pirenópolis-GO"
                  />
                </div>

                {/* Dados Técnicos */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Consumo Mensal (kWh) *
                    </label>
                    <input
                      type="number"
                      value={clienteData.consumoKwh}
                      onChange={(e) => handleInputChange('consumoKwh', e.target.value)}
                      required
                      min="0"
                      step="1"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Ex: 450"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      HSP Local
                    </label>
                    <input
                      type="number"
                      value={clienteData.hspLocal}
                      onChange={(e) => handleInputChange('hspLocal', e.target.value)}
                      step="0.01"
                      min="0"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="5.21"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Horas de Sol Pico (padrão: 5.21 para GO)
                    </p>
                  </div>
                </div>

                {/* Dados Comerciais */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    P. Despesa (R$) *
                  </label>
                  <input
                    type="number"
                    value={clienteData.pdespesa}
                    onChange={(e) => handleInputChange('pdespesa', e.target.value)}
                    required
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ex: 7500.99"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Valor confidencial para cálculos internos
                  </p>
                </div>

                {/* Observações */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Observações
                  </label>
                  <textarea
                    value={clienteData.observacoes}
                    onChange={(e) => handleInputChange('observacoes', e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Informações adicionais sobre o cliente..."
                  />
                </div>

                {/* Informações do Sistema */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium text-gray-800 mb-2">ℹ️ Informações do Sistema</h3>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p><strong>ID do Cliente:</strong> {clienteId}</p>
                    <p><strong>Pasta:</strong> src/data/clientes/{clienteId}/</p>
                  </div>
                </div>

                {/* Botões de Ação */}
                <div className="flex gap-4 pt-6">
                  <Link href="/admin" legacyBehavior><a className="flex-1 py-3 px-6 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-center">
                    Cancelar
                  </a></Link>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 py-3 px-6 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all disabled:opacity-50"
                  >
                    {saving ? 'Salvando...' : '💾 Salvar Alterações'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}