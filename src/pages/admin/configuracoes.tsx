import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

interface ConfiguracaoSistema {
  // Parâmetros Técnicos
  performanceRate: number;
  hspPadrao: number;
  margemSeguranca: number;
  eficienciaInversor: number;

  // Parâmetros Financeiros
  taxaSelic: number;
  inflacaoAnual: number;
  reajusteEnergia: number;
  
  // Markups Comerciais
  markupEconomico: number;
  markupStandard: number;
  markupPremium: number;

  // Parcelamento
  jurosParcela12x: number;
  jurosParcela18x: number;
  descontoPix: number;

  // Textos de Marketing (Variáveis)
  textoEconomiaAnual: string;
  textoPayback: string;
  textoTIR: string;
  textoValorizacaoImovel: string;
  textoSustentabilidade: string;

  // Configurações Regionais
  estadosPadrao: string[];
  hspPorEstado: { [key: string]: number };
}

const configPadrao: ConfiguracaoSistema = {
  // Técnico
  performanceRate: 0.75,
  hspPadrao: 5.21,
  margemSeguranca: 1.1,
  eficienciaInversor: 0.95,

  // Financeiro
  taxaSelic: 11.25,
  inflacaoAnual: 4.5,
  reajusteEnergia: 8.2,

  // Comercial
  markupEconomico: 1.8,
  markupStandard: 2.0,
  markupPremium: 2.3,

  // Parcelamento
  jurosParcela12x: 2.5,
  jurosParcela18x: 3.2,
  descontoPix: 0.05,

  // Textos Marketing
  textoEconomiaAnual: 'Economia anual de R$ {valorEconomia} na conta de energia',
  textoPayback: 'Investimento se paga em apenas {mesesPayback} meses',
  textoTIR: 'Taxa Interna de Retorno de {percentualTIR}% ao ano',
  textoValorizacaoImovel: 'Valorização do imóvel em até {percentualValorizacao}%',
  textoSustentabilidade: 'Evita emissão de {tonelaCO2} toneladas de CO₂ em 25 anos',

  // Regional
  estadosPadrao: ['GO', 'DF', 'MG', 'MT', 'MS', 'BA', 'TO'],
  hspPorEstado: {
    'GO': 5.21,
    'DF': 5.08,
    'MG': 4.95,
    'MT': 5.43,
    'MS': 5.12,
    'BA': 5.67,
    'TO': 5.34
  }
};

export default function Configuracoes() {
  const router = useRouter();
  const [config, setConfig] = useState<ConfiguracaoSistema>(configPadrao);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('tecnico');

  // Carregar configurações salvas
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const response = await fetch('/api/admin/config');
        if (response.ok) {
          const savedConfig = await response.json();
          setConfig({ ...configPadrao, ...savedConfig });
        }
      } catch (error) {
        console.log('Usando configuração padrão');
      }
    };
    loadConfig();
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        alert('Configurações salvas com sucesso!');
      } else {
        alert('Erro ao salvar configurações');
      }
    } catch (error) {
      alert('Erro ao salvar configurações');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof ConfiguracaoSistema, value: any) => {
    setConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const resetToDefault = () => {
    if (confirm('Deseja restaurar todas as configurações padrão?')) {
      setConfig(configPadrao);
    }
  };

  const tabs = [
    { id: 'tecnico', label: '⚙️ Técnico', icon: '⚙️' },
    { id: 'financeiro', label: '💰 Financeiro', icon: '💰' },
    { id: 'comercial', label: '🏪 Comercial', icon: '🏪' },
    { id: 'marketing', label: '📢 Marketing', icon: '📢' },
    { id: 'regional', label: '🌎 Regional', icon: '🌎' }
  ];

  return (
    <>
      <Head>
        <title>Configurações do Sistema - PIENG Solar</title>
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-orange-50">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                ⚙️ Configurações do Sistema
              </h1>
              <p className="text-gray-600">
                Configure parâmetros, cálculos e textos do sistema de propostas
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              
              {/* Tabs */}
              <div className="flex overflow-x-auto bg-gray-50 border-b">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-shrink-0 px-6 py-4 font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="p-8">
                
                {/* Tab Técnico */}
                {activeTab === 'tecnico' && (
                  <div className="space-y-6">
                    <h3 className="text-xl font-semibold text-gray-800 mb-4">Parâmetros Técnicos</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Performance Rate (%)
                        </label>
                        <input
                          type="number"
                          value={config.performanceRate * 100}
                          onChange={(e) => handleInputChange('performanceRate', parseFloat(e.target.value) / 100)}
                          step="0.1"
                          min="50"
                          max="100"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                        />
                        <p className="text-sm text-gray-500 mt-1">Eficiência do sistema considerando perdas</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          HSP Padrão (GO)
                        </label>
                        <input
                          type="number"
                          value={config.hspPadrao}
                          onChange={(e) => handleInputChange('hspPadrao', parseFloat(e.target.value))}
                          step="0.01"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                        />
                        <p className="text-sm text-gray-500 mt-1">Horas de Sol Pico para Goiás</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Margem de Segurança
                        </label>
                        <input
                          type="number"
                          value={config.margemSeguranca}
                          onChange={(e) => handleInputChange('margemSeguranca', parseFloat(e.target.value))}
                          step="0.01"
                          min="1"
                          max="2"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                        />
                        <p className="text-sm text-gray-500 mt-1">Multiplicador para dimensionamento</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Eficiência Inversor (%)
                        </label>
                        <input
                          type="number"
                          value={config.eficienciaInversor * 100}
                          onChange={(e) => handleInputChange('eficienciaInversor', parseFloat(e.target.value) / 100)}
                          step="0.1"
                          min="80"
                          max="99"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                        />
                        <p className="text-sm text-gray-500 mt-1">Eficiência média dos inversores</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab Financeiro */}
                {activeTab === 'financeiro' && (
                  <div className="space-y-6">
                    <h3 className="text-xl font-semibold text-gray-800 mb-4">Parâmetros Financeiros</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Taxa SELIC (% a.a.)
                        </label>
                        <input
                          type="number"
                          value={config.taxaSelic}
                          onChange={(e) => handleInputChange('taxaSelic', parseFloat(e.target.value))}
                          step="0.25"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Inflação Anual (%)
                        </label>
                        <input
                          type="number"
                          value={config.inflacaoAnual}
                          onChange={(e) => handleInputChange('inflacaoAnual', parseFloat(e.target.value))}
                          step="0.1"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Reajuste Energia (% a.a.)
                        </label>
                        <input
                          type="number"
                          value={config.reajusteEnergia}
                          onChange={(e) => handleInputChange('reajusteEnergia', parseFloat(e.target.value))}
                          step="0.1"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Desconto PIX (%)
                        </label>
                        <input
                          type="number"
                          value={config.descontoPix * 100}
                          onChange={(e) => handleInputChange('descontoPix', parseFloat(e.target.value) / 100)}
                          step="0.5"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab Comercial */}
                {activeTab === 'comercial' && (
                  <div className="space-y-6">
                    <h3 className="text-xl font-semibold text-gray-800 mb-4">Markups e Parcelamento</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Markup Econômico
                        </label>
                        <input
                          type="number"
                          value={config.markupEconomico}
                          onChange={(e) => handleInputChange('markupEconomico', parseFloat(e.target.value))}
                          step="0.1"
                          min="1"
                          max="3"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                        />
                        <p className="text-sm text-gray-500 mt-1">Multiplicador para sistema básico</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Markup Standard
                        </label>
                        <input
                          type="number"
                          value={config.markupStandard}
                          onChange={(e) => handleInputChange('markupStandard', parseFloat(e.target.value))}
                          step="0.1"
                          min="1"
                          max="3"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                        />
                        <p className="text-sm text-gray-500 mt-1">Multiplicador para sistema intermediário</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Markup Premium
                        </label>
                        <input
                          type="number"
                          value={config.markupPremium}
                          onChange={(e) => handleInputChange('markupPremium', parseFloat(e.target.value))}
                          step="0.1"
                          min="1"
                          max="3"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                        />
                        <p className="text-sm text-gray-500 mt-1">Multiplicador para sistema premium</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Juros 12x (% a.m.)
                        </label>
                        <input
                          type="number"
                          value={config.jurosParcela12x}
                          onChange={(e) => handleInputChange('jurosParcela12x', parseFloat(e.target.value))}
                          step="0.1"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Juros 18x (% a.m.)
                        </label>
                        <input
                          type="number"
                          value={config.jurosParcela18x}
                          onChange={(e) => handleInputChange('jurosParcela18x', parseFloat(e.target.value))}
                          step="0.1"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab Marketing */}
                {activeTab === 'marketing' && (
                  <div className="space-y-6">
                    <h3 className="text-xl font-semibold text-gray-800 mb-4">Textos de Marketing Variáveis</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Texto Economia Anual
                        </label>
                        <input
                          type="text"
                          value={config.textoEconomiaAnual}
                          onChange={(e) => handleInputChange('textoEconomiaAnual', e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                        />
                        <p className="text-sm text-gray-500 mt-1">Use {'{valorEconomia}'} para valor dinâmico</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Texto Payback
                        </label>
                        <input
                          type="text"
                          value={config.textoPayback}
                          onChange={(e) => handleInputChange('textoPayback', e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                        />
                        <p className="text-sm text-gray-500 mt-1">Use {'{mesesPayback}'} para valor dinâmico</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Texto TIR
                        </label>
                        <input
                          type="text"
                          value={config.textoTIR}
                          onChange={(e) => handleInputChange('textoTIR', e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                        />
                        <p className="text-sm text-gray-500 mt-1">Use {'{percentualTIR}'} para valor dinâmico</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Texto Valorização do Imóvel
                        </label>
                        <input
                          type="text"
                          value={config.textoValorizacaoImovel}
                          onChange={(e) => handleInputChange('textoValorizacaoImovel', e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                        />
                        <p className="text-sm text-gray-500 mt-1">Use {'{percentualValorizacao}'} para valor dinâmico</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Texto Sustentabilidade
                        </label>
                        <input
                          type="text"
                          value={config.textoSustentabilidade}
                          onChange={(e) => handleInputChange('textoSustentabilidade', e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                        />
                        <p className="text-sm text-gray-500 mt-1">Use {'{tonelaCO2}'} para valor dinâmico</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab Regional */}
                {activeTab === 'regional' && (
                  <div className="space-y-6">
                    <h3 className="text-xl font-semibold text-gray-800 mb-4">Configurações por Estado</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {config.estadosPadrao.map((estado) => (
                        <div key={estado} className="border border-gray-200 rounded-lg p-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            HSP - {estado}
                          </label>
                          <input
                            type="number"
                            value={config.hspPorEstado[estado] || 5.21}
                            onChange={(e) => handleInputChange('hspPorEstado', {
                              ...config.hspPorEstado,
                              [estado]: parseFloat(e.target.value)
                            })}
                            step="0.01"
                            className="w-full px-3 py-2 border border-gray-300 rounded"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>

              {/* Botões de Ação */}
              <div className="px-8 py-6 bg-gray-50 border-t flex justify-between">
                <div className="flex gap-4">
                  <button
                    onClick={() => router.push('/admin')}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100"
                  >
                    ← Voltar
                  </button>
                  <button
                    onClick={resetToDefault}
                    className="px-6 py-2 border border-orange-300 text-orange-700 rounded-lg hover:bg-orange-50"
                  >
                    🔄 Restaurar Padrão
                  </button>
                </div>
                
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="px-8 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50"
                >
                  {loading ? 'Salvando...' : '💾 Salvar Configurações'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}