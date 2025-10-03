/**
 * 🎨 SELETOR DE TEMPLATES - PIENG SOLAR
 * 
 * Componente para seleção de template de proposta por tipo de cliente.
 * Integrado no Gerador Rápido e Sistema do Consultor.
 */

import React, { useState } from 'react';
import { 
  type ClientType, 
  type ComercialSubType, 
  getVariantConfig, 
  getComercialSubTypes,
  getVariantName,
  getVariantDescription 
} from '@/lib/variantConfig';

interface TemplateSelectorProps {
  onSelect: (tipo: ClientType, subtipo?: ComercialSubType) => void;
  selected?: {
    tipo: ClientType;
    subtipo?: ComercialSubType;
  };
  className?: string;
}

export function TemplateSelector({ onSelect, selected, className = '' }: TemplateSelectorProps) {
  const [tipoSelecionado, setTipoSelecionado] = useState<ClientType | ''>(selected?.tipo || '');
  const [subtipoSelecionado, setSubtipoSelecionado] = useState<ComercialSubType | ''>(selected?.subtipo || '');

  const handleTipoChange = (tipo: ClientType | '') => {
    setTipoSelecionado(tipo);
    setSubtipoSelecionado('');
    
    if (tipo && tipo !== 'comercial') {
      onSelect(tipo);
    }
  };

  const handleSubtipoChange = (subtipo: ComercialSubType | '') => {
    setSubtipoSelecionado(subtipo);
    
    if (subtipo && tipoSelecionado === 'comercial') {
      onSelect('comercial', subtipo);
    }
  };

  // Obter config da variante selecionada
  const variantConfig = tipoSelecionado 
    ? getVariantConfig(tipoSelecionado, subtipoSelecionado || undefined)
    : null;

  return (
    <div className={`template-selector ${className}`}>
      <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl shadow-lg p-6 text-white mb-6">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          🎨 Tipo de Proposta
        </h3>

        {/* Seletor de Tipo Principal */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2 opacity-90">
            Selecione o Tipo de Cliente
          </label>
          <select
            value={tipoSelecionado}
            onChange={(e) => handleTipoChange(e.target.value as ClientType | '')}
            className="w-full px-4 py-3 text-lg bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/70 focus:border-white focus:outline-none backdrop-blur-sm"
            title="Tipo de cliente para personalização da proposta"
          >
            <option value="" className="text-gray-800">📄 Template Padrão (Universal)</option>
            <option value="residencial" className="text-gray-800">🏠 Residencial Premium</option>
            <option value="rural" className="text-gray-800">🌾 Rural Agro</option>
            <option value="comercial" className="text-gray-800">💼 Comercial (escolha o segmento →)</option>
            <option value="industrial" className="text-gray-800">🏭 Industrial Premium</option>
          </select>
        </div>

        {/* Seletor de Subtipo Comercial */}
        {tipoSelecionado === 'comercial' && (
          <div className="mb-4 animate-fade-in">
            <label className="block text-sm font-medium mb-2 opacity-90">
              Segmento Comercial
            </label>
            <select
              value={subtipoSelecionado}
              onChange={(e) => handleSubtipoChange(e.target.value as ComercialSubType | '')}
              className="w-full px-4 py-3 text-lg bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/70 focus:border-white focus:outline-none backdrop-blur-sm"
              title="Segmento comercial específico"
            >
              <option value="" className="text-gray-800">Selecione o segmento...</option>
              <option value="panificadora" className="text-gray-800">🥖 Panificadora</option>
              <option value="acougue" className="text-gray-800">🥩 Açougue</option>
              <option value="restaurante" className="text-gray-800">🍽️ Restaurante</option>
              <option value="mercado" className="text-gray-800">🛒 Mercado/Supermercado</option>
            </select>
          </div>
        )}

        {/* Preview da Variante Selecionada */}
        {variantConfig && (
          <div className="mt-6 bg-white/10 rounded-lg p-4 backdrop-blur-sm border border-white/20 animate-fade-in">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-4xl">{variantConfig.tema.icone}</span>
              <div>
                <h4 className="text-lg font-bold">{variantConfig.nome}</h4>
                <p className="text-sm opacity-90">{variantConfig.descricao}</p>
              </div>
            </div>

            {/* Preview de Cores */}
            <div className="flex gap-2 mt-3">
              <div className="flex-1 text-center">
                <div 
                  className="h-12 rounded-lg mb-1 border-2 border-white/30" 
                  style={{background: variantConfig.tema.corPrimaria}}
                ></div>
                <span className="text-xs opacity-80">Primária</span>
              </div>
              <div className="flex-1 text-center">
                <div 
                  className="h-12 rounded-lg mb-1 border-2 border-white/30" 
                  style={{background: variantConfig.tema.corSecundaria}}
                ></div>
                <span className="text-xs opacity-80">Secundária</span>
              </div>
              <div className="flex-1 text-center">
                <div 
                  className="h-12 rounded-lg mb-1 border-2 border-white/30" 
                  style={{background: variantConfig.tema.gradiente}}
                ></div>
                <span className="text-xs opacity-80">Gradiente</span>
              </div>
            </div>

            {/* Preview de Recursos */}
            <div className="mt-3 pt-3 border-t border-white/20">
              <p className="text-xs font-semibold mb-2 opacity-90">Recursos Incluídos:</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {variantConfig.features.graficosAvancados && (
                  <div className="flex items-center gap-1">
                    <span>📊</span> Gráficos Avançados
                  </div>
                )}
                {variantConfig.features.projecaoSolar && (
                  <div className="flex items-center gap-1">
                    <span>☀️</span> Projeção Solar
                  </div>
                )}
                {variantConfig.features.analiseEconomica && (
                  <div className="flex items-center gap-1">
                    <span>💰</span> Análise ROI
                  </div>
                )}
                {variantConfig.features.analiseAmbiental && (
                  <div className="flex items-center gap-1">
                    <span>🌳</span> Impacto Ambiental
                  </div>
                )}
                {variantConfig.features.analiseIrrigacao && (
                  <div className="flex items-center gap-1">
                    <span>💧</span> Análise Irrigação
                  </div>
                )}
                {variantConfig.features.analiseCustoOperacional && (
                  <div className="flex items-center gap-1">
                    <span>📈</span> Custo Operacional
                  </div>
                )}
                {variantConfig.features.analiseDemandaContratada && (
                  <div className="flex items-center gap-1">
                    <span>⚡</span> Demanda Contratada
                  </div>
                )}
              </div>
            </div>

            {/* Preview de Textos */}
            <div className="mt-3 pt-3 border-t border-white/20">
              <p className="text-sm font-semibold opacity-90 mb-1">Título:</p>
              <p className="text-sm italic opacity-80">"{variantConfig.copy.tituloHero}"</p>
            </div>
          </div>
        )}

        {/* Informação quando nenhuma variante selecionada */}
        {!tipoSelecionado && (
          <div className="mt-4 bg-white/10 rounded-lg p-4 backdrop-blur-sm border border-white/20">
            <p className="text-sm opacity-90">
              💡 <strong>Dica:</strong> Selecione um tipo de cliente para gerar uma proposta personalizada com design, textos e análises específicas do segmento. Se não selecionar, será usado o template padrão universal.
            </p>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

export default TemplateSelector;
