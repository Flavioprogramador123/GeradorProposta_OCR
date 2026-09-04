import { useState, useEffect } from 'react';
import { carregarConfiguracoes, type ConfiguracaoSistema, CONFIG_PADRAO } from '@/utils/configuracoes';

/**
 * Hook para carregar e usar configurações do sistema
 * Carrega as configurações da API e disponibiliza para uso em qualquer componente
 * 
 * @example
 * ```tsx
 * const { config, loading } = useConfiguracoes();
 * const hsp = config.hspPadrao; // Ao invés de usar 5.21 hardcoded
 * ```
 */
export function useConfiguracoes() {
  const [config, setConfig] = useState<ConfiguracaoSistema | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        setLoading(true);
        const loadedConfig = await carregarConfiguracoes();
        setConfig(loadedConfig);
        setError(null);
      } catch (err) {
        console.error('Erro ao carregar configurações:', err);
        setError(err instanceof Error ? err : new Error('Erro desconhecido'));
        // Em caso de erro, ainda retorna null para que o componente possa usar valores padrão
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
  }, []);

  return {
    config,
    loading,
    error,
    // Helpers para acessar valores comuns sem precisar verificar null
    getHSP: (estado?: string) => {
      if (!config) return CONFIG_PADRAO.hspPadrao;
      if (estado && config.hspPorEstado?.[estado]) {
        return config.hspPorEstado[estado];
      }
      return config.hspPadrao;
    },
    getPerformanceRate: () => config?.performanceRate ?? CONFIG_PADRAO.performanceRate,
    getMargemSeguranca: () => config?.margemSeguranca ?? CONFIG_PADRAO.margemSeguranca,
    getEficienciaInversor: () => config?.eficienciaInversor ?? CONFIG_PADRAO.eficienciaInversor,
    getMarkup: (tipo: 'economico' | 'standard' | 'premium') => {
      if (!config) {
        const defaults = {
          economico: CONFIG_PADRAO.markupEconomico,
          standard: CONFIG_PADRAO.markupStandard,
          premium: CONFIG_PADRAO.markupPremium
        };
        return defaults[tipo];
      }
      const key = `markup${tipo.charAt(0).toUpperCase() + tipo.slice(1)}` as 'markupEconomico' | 'markupStandard' | 'markupPremium';
      return config[key];
    },
  };
}

