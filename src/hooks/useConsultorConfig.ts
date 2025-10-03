import { useState, useEffect, useRef } from 'react';

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
    const ppix = totalFinal * (1 - config.descontoPix);
    const pavista = totalFinal;
    const priscado = totalFinal * config.fatorParcelado;
    const p12x_total = ppix / config.fator12x;
    const p12x = p12x_total / 12;
    const p18x_total = ppix / config.fator18x;
    const p18x_parcela = p18x_total / 18;

    return { ppix, pavista, priscado, p12x, p18x_parcela, p12x_total, p18x_total };
  };

  const calcularPerformance = (potenciaKw: number, investimentoPix: number) => {
    const geracaoMensal = potenciaKw * config.hsp * 30.4 * config.performanceRate;
    const cobertura = (geracaoMensal / config.consumoMensal) * 100;
    const economiaMensal = geracaoMensal * config.tarifa;
    const paybackMeses = investimentoPix / economiaMensal;
    const tirAnual = (12 / paybackMeses) * 100;
    
    return { geracaoMensal, cobertura, economiaMensal, paybackMeses, tirAnual };
  };

  const calcularPdespesa = (pcusto: number) => {
    // Se variável é 0, usa só o fixo
    if (config.pdespesaVariavel === 0) {
      return config.pdespesaFixo;
    }
    // Se fixo é 0, usa só o variável
    if (config.pdespesaFixo === 0) {
      return pcusto * config.pdespesaVariavel / 100;
    }
    // Caso contrário, usa ambos
    return config.pdespesaFixo + (pcusto * config.pdespesaVariavel / 100);
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
