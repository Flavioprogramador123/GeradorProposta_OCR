import { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  CONFIG_PADRAO,
  ESTADOS_PADRAO,
  HSP_POR_ESTADO_PADRAO,
  mergeConfiguracoes,
  type ConfiguracaoSistema,
} from '@/utils/configuracoes';
import { AdminThemePicker } from '@/components/AdminThemePicker';
import {
  TAXA_CARTAO_MENSAL_REF,
  PARCELAS_REFERENCIA_AVISTA,
  buildMultiplicadoresFromTaxa,
  calcularPrecosDePix,
  normalizeTaxaCartaoMensal,
} from '@/lib/tabelaJurosCartao';
const configPadrao: ConfiguracaoSistema = {
  ...CONFIG_PADRAO,
  descontoPix: 11.79,
  taxaCartaoMensal: TAXA_CARTAO_MENSAL_REF,
  taxaCartao12x: CONFIG_PADRAO.taxaCartao12x ?? 10.6,
  taxaCartao18x: CONFIG_PADRAO.taxaCartao18x ?? 15.2,
  fatorAvista: CONFIG_PADRAO.fatorAvista ?? 1 / 1.117943,
  fatorParcelado: CONFIG_PADRAO.fatorParcelado ?? 1.2,
  fator12x: CONFIG_PADRAO.fator12x ?? 1 / 1.117943,
  fator18x: CONFIG_PADRAO.fator18x ?? 1 / 1.179384,
};

function mergeConfig(saved: Partial<ConfiguracaoSistema> | Record<string, unknown>): ConfiguracaoSistema {
  const merged = mergeConfiguracoes(saved);
  // Normaliza descontoPix: se veio como fração (0.05–0.2), vira %
  if (merged.descontoPix > 0 && merged.descontoPix <= 1) {
    merged.descontoPix = merged.descontoPix * 100;
  }
  // Performance / eficiência: se veio como % (ex. 75), vira ratio 0–1
  if (merged.performanceRate > 1 && merged.performanceRate <= 100) {
    merged.performanceRate = merged.performanceRate / 100;
  }
  if (merged.eficienciaInversor > 1 && merged.eficienciaInversor <= 100) {
    merged.eficienciaInversor = merged.eficienciaInversor / 100;
  }
  return {
    ...configPadrao,
    ...merged,
    estadosPadrao: merged.estadosPadrao,
    hspPorEstado: merged.hspPorEstado,
  };
}

/** Ratio 0–1 no state; UI em % sem recalcular a cada tecla (evita zeros/NaN). */
function PercentRatioInput({
  value01,
  onCommit,
  min = 0,
  max = 100,
  step = '0.1',
  className = 'w-full px-4 py-3 border border-gray-300 rounded-lg',
}: {
  value01: number;
  onCommit: (ratio01: number) => void;
  min?: number;
  max?: number;
  step?: string;
  className?: string;
}) {
  const toDisplay = (ratio: number) => {
    if (!Number.isFinite(ratio)) return '';
    return String(Number((ratio * 100).toFixed(4)));
  };

  const [text, setText] = useState(() => toDisplay(value01));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setText(toDisplay(value01));
  }, [value01, focused]);

  const commit = () => {
    const normalized = text.replace(',', '.').trim();
    if (normalized === '' || normalized === '.') {
      setText(toDisplay(value01));
      return;
    }
    const n = parseFloat(normalized);
    if (!Number.isFinite(n)) {
      setText(toDisplay(value01));
      return;
    }
    const clamped = Math.min(max, Math.max(min, n));
    onCommit(clamped / 100);
    setText(toDisplay(clamped / 100));
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      value={text}
      onFocus={() => setFocused(true)}
      onChange={(e) => {
        const raw = e.target.value.replace(/[^\d.,]/g, '');
        setText(raw);
      }}
      onBlur={() => {
        setFocused(false);
        commit();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.currentTarget.blur();
        }
      }}
      className={className}
    />
  );
}

export default function Configuracoes() {
  const router = useRouter();
  const [config, setConfig] = useState<ConfiguracaoSistema>(configPadrao);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('tecnico');
  const [limpandoTestes, setLimpandoTestes] = useState(false);

  const taxaMensal = normalizeTaxaCartaoMensal(
    config.taxaCartaoMensal ?? TAXA_CARTAO_MENSAL_REF
  );
  const mults = useMemo(() => buildMultiplicadoresFromTaxa(taxaMensal), [taxaMensal]);
  const samplePrecos = useMemo(
    () => calcularPrecosDePix(10000, config.fatorParcelado || 1.2, taxaMensal),
    [config.fatorParcelado, taxaMensal]
  );
  const mult12 = mults[12];
  const mult18 = mults[18];

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
      const taxa = normalizeTaxaCartaoMensal(config.taxaCartaoMensal);
      const m = buildMultiplicadoresFromTaxa(taxa);
      const sample = calcularPrecosDePix(10000, config.fatorParcelado || 1.2, taxa);
      const f12 = 1 / m[12];
      const f18 = 1 / m[18];
      const payload: ConfiguracaoSistema = {
        ...config,
        taxaCartaoMensal: taxa,
        fator12x: f12,
        fator18x: f18,
        fatorAvista: f12,
        taxaCartao12x: Math.round((1 - f12) * 1000) / 10,
        taxaCartao18x: Math.round((1 - f18) * 1000) / 10,
        descontoPix: sample.economiaPercent,
      };
      setConfig(payload);

      const response = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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

      <div className="admin-shell">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
                <div>
                  <h1 className="text-3xl font-bold admin-title">
                    ⚙️ Configurações do Sistema
                  </h1>
                  <p className="admin-subtitle mt-1">
                    Configure parâmetros, cálculos e textos do sistema de propostas
                  </p>
                  <p className="text-sm admin-subtitle mt-2">
                    ✅ Configurações indexadas — use o hook{' '}
                    <code className="px-2 py-1 rounded bg-[var(--admin-surface-muted)] text-[var(--admin-primary)]">
                      useConfiguracoes()
                    </code>{' '}
                    para acessar sem hardcode
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <AdminThemePicker compact />
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

            <div className="mb-6">
              <AdminThemePicker />
            </div>

            <div className="admin-surface overflow-hidden">
              
              {/* Tabs */}
              <div className="flex overflow-x-auto bg-slate-200/70 border-b border-slate-200">
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
                        <PercentRatioInput
                          value01={config.performanceRate}
                          onCommit={(ratio) => handleInputChange('performanceRate', ratio)}
                          min={50}
                          max={100}
                          step="0.1"
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
                        <PercentRatioInput
                          value01={config.eficienciaInversor}
                          onCommit={(ratio) => handleInputChange('eficienciaInversor', ratio)}
                          min={80}
                          max={99}
                          step="0.1"
                        />
                        <p className="text-sm text-gray-500 mt-1">Eficiência média dos inversores string</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Eficiência adicional Micro-inversores
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
                          % a mais de geração vs string quando micro-inversor está ativo (padrão 5%)
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
                          Estoque mínimo — módulos
                        </label>
                        <input
                          type="number"
                          value={config.estoqueMinimoSoolar}
                          onChange={(e) => handleInputChange('estoqueMinimoSoolar', parseInt(e.target.value, 10))}
                          step="1"
                          min="0"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                        />
                        <p className="text-sm text-gray-500 mt-1">
                          V3 / SOOLLAR: preço válido só com estoque &gt; este valor (padrão 20)
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Estoque mínimo — demais itens
                        </label>
                        <input
                          type="number"
                          value={config.estoqueMinimoOutros ?? 5}
                          onChange={(e) => handleInputChange('estoqueMinimoOutros', parseInt(e.target.value, 10))}
                          step="1"
                          min="0"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                        />
                        <p className="text-sm text-gray-500 mt-1">
                          Inversores, estruturas, cabos, MC4, DPS etc. (padrão 5)
                        </p>
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
                      <h3 className="text-xl font-semibold text-gray-800 mb-2">
                        💳 Cartão e PIX (tabela maquininha)
                      </h3>
                      <p className="text-sm text-gray-500 mb-4">
                        Premissa: <strong>PIX = menor valor</strong>; “à vista” = total embutido em{' '}
                        {PARCELAS_REFERENCIA_AVISTA}×. A simulação original usava{' '}
                        <strong>Taxa {TAXA_CARTAO_MENSAL_REF.toFixed(2).replace('.', ',')}% a.m.</strong> na
                        maquininha. Se a taxa mudar (ex.: 1,49%), altere abaixo — a tabela 2×–18× recalcula na
                        hora.
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mb-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Taxa mensal maquininha (% a.m.)
                          </label>
                          <input
                            type="number"
                            value={config.taxaCartaoMensal ?? TAXA_CARTAO_MENSAL_REF}
                            onChange={(e) =>
                              handleInputChange(
                                'taxaCartaoMensal',
                                normalizeTaxaCartaoMensal(parseFloat(e.target.value))
                              )
                            }
                            step="0.01"
                            min="0.1"
                            max="10"
                            className="w-full px-4 py-3 border border-amber-400 rounded-lg bg-amber-50/50"
                          />
                          <p className="text-sm text-gray-500 mt-1">
                            Calibração de referência: {TAXA_CARTAO_MENSAL_REF.toFixed(2).replace('.', ',')}%
                            (prints da máquina). 1× (MDR) permanece fixo.
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Markup promoção (preço riscado)
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
                          <p className="text-sm text-gray-500 mt-1">
                            Preço riscado = PIX × este fator (só visual)
                          </p>
                        </div>
                      </div>

                      <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 mb-6 overflow-x-auto">
                        <table className="min-w-full text-sm text-gray-800">
                          <thead>
                            <tr className="text-left text-gray-600 border-b border-emerald-200">
                              <th className="py-2 pr-4">Condição</th>
                              <th className="py-2 pr-4">Multiplicador × PIX</th>
                              <th className="py-2">Ex.: PIX R$ 10.000</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="border-b border-emerald-100">
                              <td className="py-2 pr-4 font-medium">PIX (base)</td>
                              <td className="py-2 pr-4 font-mono">1,000000</td>
                              <td className="py-2">R$ 10.000,00</td>
                            </tr>
                            <tr className="border-b border-emerald-100 bg-white/50">
                              <td className="py-2 pr-4 font-medium">
                                À vista (= total {PARCELAS_REFERENCIA_AVISTA}×)
                              </td>
                              <td className="py-2 pr-4 font-mono">{mult12.toFixed(6)}</td>
                              <td className="py-2">
                                R${' '}
                                {samplePrecos.pavista.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                <span className="text-gray-500 text-xs ml-1">
                                  ({PARCELAS_REFERENCIA_AVISTA}× de{' '}
                                  {samplePrecos.p12x.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
                                </span>
                              </td>
                            </tr>
                            <tr className="border-b border-emerald-100">
                              <td className="py-2 pr-4 font-medium">12× no cartão</td>
                              <td className="py-2 pr-4 font-mono">{mult12.toFixed(6)}</td>
                              <td className="py-2">
                                {PARCELAS_REFERENCIA_AVISTA}× R${' '}
                                {samplePrecos.p12x.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                            <tr>
                              <td className="py-2 pr-4 font-medium">18× no cartão</td>
                              <td className="py-2 pr-4 font-mono">{mult18.toFixed(6)}</td>
                              <td className="py-2">
                                18× R${' '}
                                {samplePrecos.p18x_parcela.toLocaleString('pt-BR', {
                                  minimumFractionDigits: 2,
                                })}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                        <p className="text-xs text-emerald-800 mt-3">
                          Taxa vigente {taxaMensal.toFixed(2).replace('.', ',')}% a.m. · Economia PIX vs à
                          vista: ~{samplePrecos.economiaPercent}% · Modal da proposta: entrada + 2×–18×
                        </p>
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
                      <h4 className="font-semibold text-blue-800 mb-2">📋 Resumo (fonte de verdade)</h4>
                      <div className="text-sm text-blue-700 space-y-1">
                        <div>
                          • <strong>PIX:</strong> custo + pdespesa (+ frete) — menor valor
                        </div>
                        <div>
                          • <strong>Taxa maquininha:</strong> {taxaMensal.toFixed(2).replace('.', ',')}% a.m.
                        </div>
                        <div>
                          • <strong>À vista / 12× total:</strong> PIX × {mult12.toFixed(6)}
                        </div>
                        <div>
                          • <strong>Parcela 12×:</strong> (PIX × {mult12.toFixed(6)}) ÷ 12
                        </div>
                        <div>
                          • <strong>18× total:</strong> PIX × {mult18.toFixed(6)}
                        </div>
                        <div>
                          • <strong>Riscado:</strong> PIX × {Number(config.fatorParcelado || 1.2).toFixed(2)}
                        </div>
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
              <div className="px-8 py-6 bg-slate-200/70 border-t border-slate-200 flex justify-between flex-wrap gap-4">
                <button
                  onClick={resetToDefault}
                  className="px-6 py-2 border border-orange-300 text-orange-700 rounded-lg hover:bg-orange-50"
                >
                  🔄 Restaurar Padrão
                </button>
                
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