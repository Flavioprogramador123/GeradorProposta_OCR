import { useState, useEffect, useRef } from 'react';
import {
  calcularPdespesaProposta,
  calcularPerformanceProposta,
  calcularPrecosProposta,
  normalizePropostaConfig,
} from '@/lib/propostaOrcamentoProcessor';

export interface ConsultorConfig {
  // Parâmetros Técnicos
  hsp: number;
  tarifa: number;
  performanceRate: number;
  consumoMensal: number;
  
  // Parâmetros de Pdespesa
  pdespesaFixo: number;
  pdespesaVariavel: number;
  
  // Parâmetros Financeiros
  descontoPix: number;
  fatorParcelado: number;
  fator12x: number;
  fator18x: number;
}

const CONFIG_PADRAO: ConsultorConfig = {
  // Técnico
  hsp: 5.21,
  tarifa: 1.10,
  performanceRate: 0.75,
  consumoMensal: 600,
  
  // Pdespesa
  pdespesaFixo: 3000,
  pdespesaVariavel: 22,
  
  // Financeiro
  descontoPix: 0.1,
  fatorParcelado: 1.20,
  fator12x: 0.88,
  fator18x: 0.83
};

export function useConsultorConfig() {
  const [config, setConfig] = useState<ConsultorConfig>(CONFIG_PADRAO);
  const [loading, setLoading] = useState(false);
  const isInitialMount = useRef(true);

  // Carregar configurações salvas
  useEffect(() => {
    const savedConfig = localStorage.getItem('consultor-config');
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        setConfig({ ...CONFIG_PADRAO, ...parsed });
      } catch (error) {
        console.warn('Erro ao carregar configurações do consultor:', error);
      }
    }
    isInitialMount.current = false;
  }, []);

  // Salvar configurações automaticamente (pular primeira renderização)
  useEffect(() => {
    if (!isInitialMount.current) {
      localStorage.setItem('consultor-config', JSON.stringify(config));
    }
  }, [config]);

  const updateConfig = (updates: Partial<ConsultorConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const resetConfig = () => {
    setConfig(CONFIG_PADRAO);
    localStorage.removeItem('consultor-config');
  };

  const calcularPrecos = (totalFinal: number) => {
    return calcularPrecosProposta(totalFinal, normalizePropostaConfig(config));
  };

  const calcularPerformance = (potenciaKw: number, investimentoPix: number) => {
    return calcularPerformanceProposta(
      potenciaKw,
      normalizePropostaConfig(config),
      investimentoPix
    );
  };

  const calcularPdespesa = (pcusto: number) => {
    return calcularPdespesaProposta(pcusto, normalizePropostaConfig(config));
  };

  return {
    config,
    updateConfig,
    resetConfig,
    calcularPrecos,
    calcularPerformance,
    calcularPdespesa,
    loading
  };
}
