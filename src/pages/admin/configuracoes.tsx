import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  CONFIG_PADRAO,
  ESTADOS_PADRAO,
  HSP_POR_ESTADO_PADRAO,
  mergeConfiguracoes,
  type ConfiguracaoSistema,
} from '@/utils/configuracoes';

const configPadrao: ConfiguracaoSistema = {
  ...CONFIG_PADRAO,
  // UI comercial usa desconto PIX em % (0–100); util legado guarda 0–1
  descontoPix: 10,
  taxaCartao12x: CONFIG_PADRAO.taxaCartao12x ?? 12,
  taxaCartao18x: CONFIG_PADRAO.taxaCartao18x ?? 17,
  fatorAvista: CONFIG_PADRAO.fatorAvista ?? 0.9,
  fatorParcelado: CONFIG_PADRAO.fatorParcelado ?? 1.2,
  fator12x: CONFIG_PADRAO.fator12x ?? 0.88,
  fator18x: CONFIG_PADRAO.fator18x ?? 0.83,
};

function mergeConfig(saved: Partial<ConfiguracaoSistema> | Record<string, unknown>): ConfiguracaoSistema {
  const merged = mergeConfiguracoes(saved);
  // Normaliza descontoPix: se veio como fração (0.05–0.2), vira %
  if (merged.descontoPix > 0 && merged.descontoPix <= 1) {
    merged.descontoPix = merged.descontoPix * 100;
  }
  return {
    ...configPadrao,
    ...merged,
    estadosPadrao: merged.estadosPadrao,
    hspPorEstado: merged.hspPorEstado,
  };
}

export default function Configuracoes() {
  const router = useRouter();
  const [config, setConfig] = useState<ConfiguracaoSistema>(configPadrao);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('tecnico');
  const [limpandoTestes, setLimpandoTestes] = useState(false);

  // Carregar configurações salvas
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const response = await fetch('/api/admin/config');
        if (response.ok) {
          const savedConfig = await response.json();
          setConfig(mergeConfig(savedConfig));
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

      const data = await response.json();

      if (response.ok) {
        const source = data.source || 'desconhecido';
        alert(`✅ ${data.message || 'Configurações salvas com sucesso!'}\n\nFonte: ${source}`);
      } else {
        const errorMsg = data.error || data.message || 'Erro desconhecido';
        const debugInfo = data.debug ? `\n\nDebug:\n${JSON.stringify(data.debug, null, 2)}` : '';
        alert(`❌ Erro ao salvar configurações\n\n${errorMsg}${debugInfo}`);
        console.error('Erro ao salvar configurações:', data);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erro de rede';
      alert(`❌ Erro ao salvar configurações\n\n${errorMsg}`);
      console.error('Erro ao salvar configurações:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof ConfiguracaoSistema, value: any) => {
    setConfig(prev => {
      const newConfig = {
        ...prev,
        [field]: value
      };

      // Recalcular fatores automaticamente
      if (field === 'taxaCartao12x') {
        newConfig.fator12x = 1 - (value / 100);
      }
      if (field === 'taxaCartao18x') {
        newConfig.fator18x = 1 - (value / 100);
      }
      if (field === 'descontoPix') {
        newConfig.fatorAvista = 1 - (value / 100);
      }

      return newConfig;
    });
  };

  const resetToDefault = () => {
    if (confirm('Deseja restaurar todas as configurações padrão?')) {
      setConfig(configPadrao);
    }
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
      
    } catch (error) {
      console.error('❌ Erro ao fazer limpeza:', error);
      alert(`❌ Erro ao fazer limpeza: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setLimpandoTestes(false);
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
              <div className="flex justify-between items-center mb-4">
                <div className="flex-1"></div>
                <div className="flex-1 text-center">
                  <h1 className="text-3xl font-bold text-gray-800 mb-2">
                    ⚙️ Configurações do Sistema
                  </h1>
                  <p className="text-gray-600">
                    Configure parâmetros, cálculos e textos do sistema de propostas
                  </p>
                  <p className="text-sm text-blue-600 mt-2">
                    ✅ Configurações indexadas - Use o hook <code className="bg-blue-50 px-2 py-1 rounded">useConfiguracoes()</code> para acessar sem hardcode
                  </p>
                </div>
                <div className="flex-1 flex justify-end">
                  <button
                    onClick={handleLimpezaTestes}
                    disabled={limpandoTestes}
                    className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    title="Limpar clientes de teste do banco de dados"
                  >
                    {limpandoTestes ? '⏳ Limpando...' : '🧹 Limpar Testes'}
                  </button>
                </div>
              </div>
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
                        <p className="text-sm text-gray-500 mt-1">Eficiência média dos inversores string</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Bônus Micro-inversor (%)
                        </label>
                        <input
                          type="number"
                          value={config.bonusMicroPercent}
                          onChange={(e) => handleInputChange('bonusMicroPercent', parseFloat(e.target.value))}
                          step="0.5"
                          min="0"
                          max="20"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                        />
                        <p className="text-sm text-gray-500 mt-1">
                          Ganho extra de geração quando micro-inversor está ativo (padrão 5%)
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Dias / mês (geração)
                        </label>
                        <input
                          type="number"
                          value={config.diasMes}
                          onChange={(e) => handleInputChange('diasMes', parseFloat(e.target.value))}
                          step="0.1"
                          min="28"
                          max="31"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                        />
                        <p className="text-sm text-gray-500 mt-1">Usado em kWp × HSP × dias × PR (padrão 30,4)</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Placas por micro
                        </label>
                        <input
                          type="number"
                          value={config.placasPorMicro}
                          onChange={(e) => handleInputChange('placasPorMicro', parseInt(e.target.value, 10))}
                          step="1"
                          min="1"
                          max="8"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                        />
                        <p className="text-sm text-gray-500 mt-1">V3 kit micro (ex.: 4 módulos / micro)</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Estoque mínimo SOOLLAR
                        </label>
                        <input
                          type="number"
                          value={config.estoqueMinimoSoolar}
                          onChange={(e) => handleInputChange('estoqueMinimoSoolar', parseInt(e.target.value, 10))}
                          step="1"
                          min="0"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                        />
                        <p className="text-sm text-gray-500 mt-1">Preço válido só com estoque &gt; este valor (padrão 20)</p>
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
                          Tarifa padrão R$/kWh
                        </label>
                        <input
                          type="number"
                          value={config.tarifaPadrao}
                          onChange={(e) => handleInputChange('tarifaPadrao', parseFloat(e.target.value))}
                          step="0.01"
                          min="0"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                        />
                        <p className="text-sm text-gray-500 mt-1">Default Gerador / V3 proposta automática</p>
                      </div>

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
                  <div className="space-y-8">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-800 mb-4">
                        🧾 Despesa PIENG (Gerador / V3)
                      </h3>
                      <p className="text-sm text-gray-500 mb-4">
                        PIX = (kit + frete) + pdespesa. Frete da transportadora pode ser ajustado por orçamento;
                        aqui fica só o padrão inicial.
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            pdespesa fixo (R$)
                          </label>
                          <input
                            type="number"
                            value={config.pdespesaFixo}
                            onChange={(e) => handleInputChange('pdespesaFixo', parseFloat(e.target.value))}
                            step="100"
                            min="0"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            pdespesa variável (%)
                          </label>
                          <input
                            type="number"
                            value={config.pdespesaVariavel}
                            onChange={(e) => handleInputChange('pdespesaVariavel', parseFloat(e.target.value))}
                            step="1"
                            min="0"
                            max="100"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                          />
                          <p className="text-sm text-gray-500 mt-1">% sobre pcusto (kit + frete)</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Frete padrão (R$)
                          </label>
                          <input
                            type="number"
                            value={config.fretePadrao}
                            onChange={(e) => handleInputChange('fretePadrao', parseFloat(e.target.value))}
                            step="50"
                            min="0"
                            className="w-full px-4 py-3 border border-amber-300 rounded-lg bg-amber-50/40"
                          />
                          <p className="text-sm text-gray-500 mt-1">Sugestão inicial; editável por proposta</p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-xl font-semibold text-gray-800 mb-4">💳 Taxas de Cartão e PIX</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Taxa Cartão 12x (%)
                          </label>
                          <input
                            type="number"
                            value={config.taxaCartao12x}
                            onChange={(e) => handleInputChange('taxaCartao12x', parseFloat(e.target.value))}
                            step="0.1"
                            min="0"
                            max="30"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                          />
                          <p className="text-sm text-gray-500 mt-1">
                            Taxa da operadora • Fator: {(config.fator12x ?? 0.88).toFixed(3)}
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Taxa Cartão 18x (%)
                          </label>
                          <input
                            type="number"
                            value={config.taxaCartao18x}
                            onChange={(e) => handleInputChange('taxaCartao18x', parseFloat(e.target.value))}
                            step="0.1"
                            min="0"
                            max="30"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                          />
                          <p className="text-sm text-gray-500 mt-1">
                            Taxa da operadora • Fator: {(config.fator18x ?? 0.83).toFixed(3)}
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Desconto PIX (%)
                          </label>
                          <input
                            type="number"
                            value={config.descontoPix}
                            onChange={(e) => handleInputChange('descontoPix', parseFloat(e.target.value))}
                            step="0.5"
                            min="0"
                            max="20"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                          />
                          <p className="text-sm text-gray-500 mt-1">
                            Desconto à vista • Fator: {config.fatorAvista.toFixed(3)}
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Markup Parcelado
                          </label>
                          <input
                            type="number"
                            value={config.fatorParcelado}
                            onChange={(e) => handleInputChange('fatorParcelado', parseFloat(e.target.value))}
                            step="0.01"
                            min="1"
                            max="2"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                          />
                          <p className="text-sm text-gray-500 mt-1">Multiplicador para parcelamento</p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-xl font-semibold text-gray-800 mb-4">📊 Markups por Categoria</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                          <p className="text-sm text-gray-500 mt-1">Sistema básico</p>
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
                          <p className="text-sm text-gray-500 mt-1">Sistema intermediário</p>
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
                          <p className="text-sm text-gray-500 mt-1">Sistema premium</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-semibold text-blue-800 mb-2">📋 Resumo dos Fatores</h4>
                      <div className="text-sm text-blue-700 space-y-1">
                        <div>• <strong>À Vista:</strong> PIX = Custo + Despesa</div>
                        <div>• <strong>À Vista (cartão):</strong> PIX ÷ {config.fatorAvista.toFixed(3)}</div>
                        <div>• <strong>Parcelado:</strong> PIX × {config.fatorParcelado.toFixed(2)}</div>
                        <div>• <strong>12x no cartão:</strong> PIX ÷ {(config.fator12x ?? 0.88).toFixed(3)}</div>
                        <div>• <strong>18x no cartão:</strong> PIX ÷ {(config.fator18x ?? 0.83).toFixed(3)}</div>
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
                          title="Texto para economia anual"
                          placeholder="Digite o texto para economia anual"
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
                          title="Texto para payback"
                          placeholder="Digite o texto para payback"
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
                          title="Texto para TIR"
                          placeholder="Digite o texto para TIR"
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
                          title="Texto para valorização do imóvel"
                          placeholder="Digite o texto para valorização do imóvel"
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
                          title="Texto para sustentabilidade"
                          placeholder="Digite o texto para sustentabilidade"
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
                      {(config.estadosPadrao || ESTADOS_PADRAO).map((estado) => (
                        <div key={estado} className="border border-gray-200 rounded-lg p-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            HSP - {estado}
                          </label>
                          <input
                            type="number"
                            value={(config.hspPorEstado && config.hspPorEstado[estado]) || HSP_POR_ESTADO_PADRAO[estado] || config.hspPadrao}
                            onChange={(e) =>
                              handleInputChange('hspPorEstado', {
                                ...(config.hspPorEstado || {}),
                                [estado]: parseFloat(e.target.value),
                              })
                            }
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