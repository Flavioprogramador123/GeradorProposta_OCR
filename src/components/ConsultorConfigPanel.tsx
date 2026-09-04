import React from 'react';
import { ConsultorConfig } from '@/hooks/useConsultorConfig';

interface ConsultorConfigPanelProps {
  config: ConsultorConfig;
  onConfigChange: (updates: Partial<ConsultorConfig>) => void;
  onReset: () => void;
}

export default function ConsultorConfigPanel({ config, onConfigChange, onReset }: ConsultorConfigPanelProps) {
  return (
    <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl shadow-lg p-6 text-white mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          🎛️ Controle do Consultor de Energia Solar
        </h2>
        <button
          onClick={onReset}
          className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-sm transition-colors"
        >
          🔄 Resetar
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Parâmetros Técnicos */}
        <div className="bg-white/20 rounded-lg p-4">
          <h3 className="text-sm font-semibold mb-3 opacity-90">⚡ Parâmetros Técnicos</h3>
          
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium mb-1 opacity-80">HSP (Horas Sol Pico)</label>
              <input
                type="number"
                step="0.01"
                value={config.hsp}
                onChange={(e) => onConfigChange({ hsp: Number(e.target.value) })}
                className="w-full px-2 py-1 text-sm bg-white/20 border border-white/30 rounded text-white placeholder-white/70 focus:border-white focus:outline-none"
                title="Horas Sol Pico - irradiação solar média diária"
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium mb-1 opacity-80">Tarifa (R$/kWh)</label>
              <input
                type="number"
                step="0.01"
                value={config.tarifa}
                onChange={(e) => onConfigChange({ tarifa: Number(e.target.value) })}
                className="w-full px-2 py-1 text-sm bg-white/20 border border-white/30 rounded text-white placeholder-white/70 focus:border-white focus:outline-none"
                title="Tarifa de energia elétrica em reais por kWh"
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium mb-1 opacity-80">Performance Rate</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={config.performanceRate}
                onChange={(e) => onConfigChange({ performanceRate: Number(e.target.value) })}
                className="w-full px-2 py-1 text-sm bg-white/20 border border-white/30 rounded text-white placeholder-white/70 focus:border-white focus:outline-none"
                title="Taxa de performance do sistema (0.0 a 1.0)"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1 opacity-80">Bônus Micro-inversor (%)</label>
              <input
                type="number"
                step="0.5"
                min="0"
                max="20"
                value={config.bonusMicroPercent}
                onChange={(e) => onConfigChange({ bonusMicroPercent: Number(e.target.value) })}
                className="w-full px-2 py-1 text-sm bg-white/20 border border-white/30 rounded text-white placeholder-white/70 focus:border-white focus:outline-none"
                title="Ganho extra de geração para micro-inversores (padrão 5%)"
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium mb-1 opacity-80">Consumo Mensal (kWh)</label>
              <input
                type="number"
                value={config.consumoMensal}
                onChange={(e) => onConfigChange({ consumoMensal: Number(e.target.value) })}
                className="w-full px-2 py-1 text-sm bg-white/20 border border-white/30 rounded text-white placeholder-white/70 focus:border-white focus:outline-none"
                title="Consumo mensal de energia em kWh"
              />
            </div>
          </div>
        </div>

        {/* Configuração Pdespesa */}
        <div className="bg-white/20 rounded-lg p-4">
          <h3 className="text-sm font-semibold mb-3 opacity-90">💰 Pdespesa</h3>
          
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium mb-1 opacity-80">Componente Fixo (R$)</label>
              <input
                type="number"
                step="0.01"
                value={config.pdespesaFixo}
                onChange={(e) => onConfigChange({ pdespesaFixo: Number(e.target.value) })}
                className="w-full px-2 py-1 text-sm bg-white/20 border border-white/30 rounded text-white placeholder-white/70 focus:border-white focus:outline-none"
                title="Componente fixo da Pdespesa em reais"
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium mb-1 opacity-80">Componente Variável (%)</label>
              <input
                type="number"
                step="0.1"
                value={config.pdespesaVariavel}
                onChange={(e) => onConfigChange({ pdespesaVariavel: Number(e.target.value) })}
                className="w-full px-2 py-1 text-sm bg-white/20 border border-white/30 rounded text-white placeholder-white/70 focus:border-white focus:outline-none"
                title="Componente variável da Pdespesa em percentual"
              />
            </div>
            
            <div className="text-xs opacity-70 bg-white/10 p-2 rounded">
              <strong>Fórmula:</strong> {config.pdespesaVariavel === 0 ? 'R$ ' + config.pdespesaFixo.toFixed(2) : `R$ ${config.pdespesaFixo.toFixed(2)} + ${config.pdespesaVariavel}%`}
              <br />
              <strong>Dica:</strong> Coloque 0 no fixo para só variável, ou 0 no variável para só fixo
            </div>
          </div>
        </div>

        {/* Parâmetros Financeiros */}
        <div className="bg-white/20 rounded-lg p-4">
          <h3 className="text-sm font-semibold mb-3 opacity-90">💳 Parâmetros Financeiros</h3>
          
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium mb-1 opacity-80">Economia PIX vs à vista (%)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={Number(((1 - 1 / 1.117943) * 100).toFixed(1))}
                readOnly
                className="w-full px-2 py-1 text-sm bg-white/10 border border-white/30 rounded text-white/90 opacity-90 cursor-not-allowed"
                title="Derivado automaticamente da tabela 12× do cartão (PIX = base)"
              />
              <p className="text-[10px] opacity-70 mt-1">Automático: à vista = total 12× cartão</p>
            </div>
            
            <div>
              <label className="block text-xs font-medium mb-1 opacity-80">Fator Preço Riscado</label>
              <input
                type="number"
                step="0.01"
                value={config.fatorParcelado}
                onChange={(e) => onConfigChange({ fatorParcelado: Number(e.target.value) })}
                className="w-full px-2 py-1 text-sm bg-white/20 border border-white/30 rounded text-white placeholder-white/70 focus:border-white focus:outline-none"
                title="Fator multiplicador para preços riscados"
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium mb-1 opacity-80">Tabela cartão 12× / 18×</label>
              <div className="text-xs opacity-90 px-2 py-1 bg-white/10 rounded border border-white/20">
                Mult. 12× 1,1179 · Mult. 18× 1,1794
              </div>
            </div>
          </div>
        </div>

        {/* Preview dos Cálculos */}
        <div className="bg-white/30 rounded-lg p-4 border-2 border-white/50">
          <h3 className="text-sm font-semibold mb-3">📊 Preview dos Cálculos</h3>
          
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span>Geração estimada:</span>
              <span className="font-semibold">
                {((config.consumoMensal / config.hsp / 30.4 / config.performanceRate) * config.hsp * 30.4 * config.performanceRate).toFixed(0)} kWh/mês
              </span>
            </div>
            
            <div className="flex justify-between">
              <span>Cobertura:</span>
              <span className="font-semibold">100%</span>
            </div>
            
            <div className="flex justify-between">
              <span>Economia mensal:</span>
              <span className="font-semibold">
                R$ {(config.consumoMensal * config.tarifa).toFixed(2)}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span>Pdespesa exemplo:</span>
              <span className="font-semibold">
                R$ {(() => {
                  const exemploCusto = 6000;
                  if (config.pdespesaVariavel === 0) {
                    return config.pdespesaFixo.toFixed(2);
                  }
                  if (config.pdespesaFixo === 0) {
                    return (exemploCusto * config.pdespesaVariavel / 100).toFixed(2);
                  }
                  return (config.pdespesaFixo + (exemploCusto * config.pdespesaVariavel / 100)).toFixed(2);
                })()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
