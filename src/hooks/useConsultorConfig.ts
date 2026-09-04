import { useState, useEffect, useRef } from 'react';
import {
  calcularPdespesaProposta,
  calcularPerformanceProposta,
  calcularPrecosProposta,
  normalizeDescontoPix,
  normalizePropostaConfig,
} from '@/lib/propostaOrcamentoProcessor';

export interface ConsultorConfig {
  // Parâmetros Técnicos
  hsp: number;
  tarifa: number;
  performanceRate: number;
  bonusMicroPercent: number;
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
  tarifa: 1.1,
  performanceRate: 0.75,
  bonusMicroPercent: 5,
  consumoMensal: 600,

  // Pdespesa
  pdespesaFixo: 3000,
  pdespesaVariavel: 22,

  // Financeiro
  descontoPix: 0.1,
  fatorParcelado: 1.2,
  fator12x: 0.88,
  fator18x: 0.83,
};

export function useConsultorConfig(options?: { persist?: boolean }) {
  const persist = options?.persist !== false;
  const [config, setConfig] = useState<ConsultorConfig>(CONFIG_PADRAO);
  const [loading, setLoading] = useState(false);
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (!persist) {
      isInitialMount.current = false;
      return;
    }
    const savedConfig = localStorage.getItem('consultor-config');
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        setConfig({
          ...CONFIG_PADRAO,
          ...parsed,
          descontoPix: normalizeDescontoPix(parsed.descontoPix, CONFIG_PADRAO.descontoPix),
        });
      } catch (error) {
        console.warn('Erro ao carregar configurações do consultor:', error);
      }
    }
    isInitialMount.current = false;
  }, [persist]);

  useEffect(() => {
    if (!persist) return;
    if (!isInitialMount.current) {
      localStorage.setItem('consultor-config', JSON.stringify(config));
    }
  }, [config, persist]);

  const updateConfig = (updates: Partial<ConsultorConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...updates };
      if (updates.descontoPix !== undefined) {
        next.descontoPix = normalizeDescontoPix(updates.descontoPix, prev.descontoPix);
      }
      return next;
    });
  };

  const resetConfig = () => {
    setConfig(CONFIG_PADRAO);
    localStorage.removeItem('consultor-config');
  };

  const calcularPrecos = (totalFinal: number) => {
    return calcularPrecosProposta(totalFinal, normalizePropostaConfig(config));
  };

  const calcularPerformance = (
    potenciaKw: number,
    investimentoPix: number,
    bonusMicroAtivo = false
  ) => {
    return calcularPerformanceProposta(
      potenciaKw,
      normalizePropostaConfig(config),
      investimentoPix,
      bonusMicroAtivo
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
    loading,
  };
}
