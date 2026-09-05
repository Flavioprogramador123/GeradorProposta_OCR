import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

interface NovoClienteData {
  nome: string;
  cidade: string;
  estado: string;
  tipoImovel: 'Residencial' | 'Comercial' | 'Industrial' | 'Rural';
  hspLocal: number;
  observacoes?: string;
}

export default function NovoCliente() {
  const router = useRouter();
  const [formData, setFormData] = useState<NovoClienteData>({
    nome: '',
    cidade: '',
    estado: 'GO',
    tipoImovel: 'Residencial',
    hspLocal: 5.21,
    observacoes: ''
  });

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/admin/criar-cliente', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.clienteSupabase?.id) {
          alert(`✅ Cliente criado com sucesso!\n\nID no banco: ${data.clienteSupabase.id}\nNome: ${data.cliente.nome}`);
        } else {
          alert('Cliente criado localmente (sem Supabase)');
        }
        router.push('/admin');
      } else {
        const error = await response.json();
        alert(`❌ Erro ao criar cliente:\n\n${error.message || 'Erro desconhecido'}\n\n${error.error ? `Detalhes: ${error.error}` : ''}`);
        console.error('Erro ao criar cliente:', error);
      }
    } catch (error) {
      alert('Erro ao criar cliente');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'hspLocal' 
        ? parseFloat(value) || 0 
        : value
    }));
  };

  return (
    <>
      <Head>
        <title>Novo Cliente - PIENG Solar</title>
        <meta name="description" content="Cadastro de novo cliente" />
      </Head>

      <div className="admin-shell">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            
            {/* Header */}
            <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
              <div>
                <h1 className="text-3xl font-bold admin-title">
                  🆕 Novo Cliente
                </h1>
                <p className="admin-subtitle mt-1">
                  Cadastre os dados do cliente para gerar proposta solar
                </p>
              </div>
              <div className="flex gap-3 flex-wrap">
                <Link
                  href="/admin"
                  className="admin-btn-ghost"
                >
                  🏠 Admin
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
                
                {/* Dados Básicos */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nome do Cliente *
                    </label>
                    <input
                      type="text"
                      name="nome"
                      value={formData.nome}
                      onChange={handleInputChange}
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
                      name="tipoImovel"
                      value={formData.tipoImovel}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="Residencial">Residencial</option>
                      <option value="Comercial">Comercial</option>
                      <option value="Industrial">Industrial</option>
                      <option value="Rural">Rural</option>
                    </select>
                  </div>
                </div>

                {/* Localização */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cidade *
                    </label>
                    <input
                      type="text"
                      name="cidade"
                      value={formData.cidade}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Ex: Pirenópolis"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Estado *
                    </label>
                    <select
                      name="estado"
                      value={formData.estado}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="GO">GO</option>
                      <option value="DF">DF</option>
                      <option value="MG">MG</option>
                      <option value="MT">MT</option>
                      <option value="MS">MS</option>
                      <option value="BA">BA</option>
                      <option value="TO">TO</option>
                    </select>
                  </div>
                </div>

                {/* Dados Técnicos */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    HSP Local
                  </label>
                  <input
                    type="number"
                    name="hspLocal"
                    value={formData.hspLocal || ''}
                    onChange={handleInputChange}
                    step="0.01"
                    min="0"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="5.21"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Horas de Sol Pico (padrão: 5.21 para GO)
                  </p>
                </div>

                {/* Observações */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Observações
                  </label>
                  <textarea
                    name="observacoes"
                    value={formData.observacoes}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Informações adicionais sobre o cliente ou projeto..."
                  />
                </div>

                {/* Botões */}
                <div className="flex gap-4 pt-6">
                  <button
                    type="button"
                    onClick={() => router.push('/admin')}
                    className="flex-1 py-3 px-6 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-3 px-6 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50"
                  >
                    {loading ? 'Criando...' : 'Criar Cliente'}
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