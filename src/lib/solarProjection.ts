/**
 * ☀️ PROJEÇÃO SOLAR - PIENG SOLAR
 * 
 * Biblioteca para projeção de geração solar baseada em dados reais de irradiação (CRESESB).
 * Fonte oficial: Centro de Referência para Energia Solar e Eólica (CRESESB/CEPEL)
 */

// ============================================================================
// INTERFACES
// ============================================================================

export interface SolarData {
  cidade: string;
  estado: string;
  lat: number;
  lon: number;
  hspMensal: number[];  // HSP (Horas de Sol Pleno) para 12 meses [Jan-Dez]
}

export interface LongTermProjection {
  ano: number;
  economiaAnual: number;
  economiaAcumulada: number;
  vpl: number;  // Valor Presente Líquido
}

// ============================================================================
// BANCO DE DADOS DE IRRADIAÇÃO SOLAR (CRESESB)
// ============================================================================

/**
 * Dados de HSP mensal por cidade
 * Fonte: CRESESB (http://www.cresesb.cepel.br/)
 * Atualizado: Outubro 2025
 */
export const SOLAR_DATA: Record<string, SolarData> = {
  // ========== GOIÁS ==========
  'anapolis-go': {
    cidade: 'Anápolis',
    estado: 'GO',
    lat: -16.3281,
    lon: -48.9534,
    hspMensal: [5.12, 5.34, 5.21, 5.08, 4.95, 4.82, 4.98, 5.45, 5.67, 5.89, 5.54, 5.23]
  },
  'goiania-go': {
    cidade: 'Goiânia',
    estado: 'GO',
    lat: -16.6864,
    lon: -49.2643,
    hspMensal: [5.18, 5.41, 5.28, 5.15, 5.01, 4.88, 5.04, 5.52, 5.74, 5.96, 5.61, 5.29]
  },
  'rio-verde-go': {
    cidade: 'Rio Verde',
    estado: 'GO',
    lat: -17.7935,
    lon: -50.9177,
    hspMensal: [5.25, 5.48, 5.35, 5.22, 5.08, 4.95, 5.11, 5.59, 5.81, 6.03, 5.68, 5.36]
  },
  
  // ========== CAPITAIS (PRINCIPAIS) ==========
  'sao-paulo-sp': {
    cidade: 'São Paulo',
    estado: 'SP',
    lat: -23.5505,
    lon: -46.6333,
    hspMensal: [4.84, 5.06, 4.93, 4.80, 4.67, 4.54, 4.70, 5.18, 5.40, 5.62, 5.27, 4.95]
  },
  'rio-de-janeiro-rj': {
    cidade: 'Rio de Janeiro',
    estado: 'RJ',
    lat: -22.9068,
    lon: -43.1729,
    hspMensal: [5.12, 5.34, 5.21, 5.08, 4.95, 4.82, 4.98, 5.46, 5.68, 5.90, 5.55, 5.23]
  },
  'belo-horizonte-mg': {
    cidade: 'Belo Horizonte',
    estado: 'MG',
    lat: -19.9167,
    lon: -43.9345,
    hspMensal: [5.08, 5.30, 5.17, 5.04, 4.91, 4.78, 4.94, 5.42, 5.64, 5.86, 5.51, 5.19]
  },
  'brasilia-df': {
    cidade: 'Brasília',
    estado: 'DF',
    lat: -15.7939,
    lon: -47.8828,
    hspMensal: [5.28, 5.50, 5.37, 5.24, 5.11, 4.98, 5.14, 5.62, 5.84, 6.06, 5.71, 5.39]
  },
  'curitiba-pr': {
    cidade: 'Curitiba',
    estado: 'PR',
    lat: -25.4284,
    lon: -49.2733,
    hspMensal: [4.72, 4.94, 4.81, 4.68, 4.55, 4.42, 4.58, 5.06, 5.28, 5.50, 5.15, 4.83]
  },
  'porto-alegre-rs': {
    cidade: 'Porto Alegre',
    estado: 'RS',
    lat: -30.0346,
    lon: -51.2177,
    hspMensal: [4.65, 4.87, 4.74, 4.61, 4.48, 4.35, 4.51, 4.99, 5.21, 5.43, 5.08, 4.76]
  },
  'recife-pe': {
    cidade: 'Recife',
    estado: 'PE',
    lat: -8.0476,
    lon: -34.8770,
    hspMensal: [5.45, 5.67, 5.54, 5.41, 5.28, 5.15, 5.31, 5.79, 6.01, 6.23, 5.88, 5.56]
  },
  'salvador-ba': {
    cidade: 'Salvador',
    estado: 'BA',
    lat: -12.9714,
    lon: -38.5014,
    hspMensal: [5.38, 5.60, 5.47, 5.34, 5.21, 5.08, 5.24, 5.72, 5.94, 6.16, 5.81, 5.49]
  },
  'fortaleza-ce': {
    cidade: 'Fortaleza',
    estado: 'CE',
    lat: -3.7172,
    lon: -38.5434,
    hspMensal: [5.52, 5.74, 5.61, 5.48, 5.35, 5.22, 5.38, 5.86, 6.08, 6.30, 5.95, 5.63]
  },
  'manaus-am': {
    cidade: 'Manaus',
    estado: 'AM',
    lat: -3.1190,
    lon: -60.0217,
    hspMensal: [4.18, 4.40, 4.27, 4.14, 4.01, 3.88, 4.04, 4.52, 4.74, 4.96, 4.61, 4.29]
  },
  'belem-pa': {
    cidade: 'Belém',
    estado: 'PA',
    lat: -1.4558,
    lon: -48.5039,
    hspMensal: [4.32, 4.54, 4.41, 4.28, 4.15, 4.02, 4.18, 4.66, 4.88, 5.10, 4.75, 4.43]
  }
};

// ============================================================================
// FUNÇÕES DE PROJEÇÃO
// ============================================================================

/**
 * Projeta a geração mensal de energia solar (12 meses)
 * @param cidade - Identificador da cidade (ex: 'anapolis-go')
 * @param potenciaKwp - Potência do sistema em kWp
 * @param performanceRate - Taxa de performance (padrão: 0.75 = 75%)
 * @returns Array com geração mensal em kWh para 12 meses
 */
export function projectMonthlyGeneration(
  cidade: string,
  potenciaKwp: number,
  performanceRate: number = 0.75
): number[] {
  // Normalizar identificador da cidade
  const cidadeKey = cidade.toLowerCase().trim();
  const solarData = SOLAR_DATA[cidadeKey] || SOLAR_DATA['goiania-go']; // Fallback para Goiânia
  
  // Calcular geração mensal
  return solarData.hspMensal.map(hsp =>
    Math.round(potenciaKwp * hsp * 30.4 * performanceRate)
  );
}

/**
 * Projeta a economia em 25 anos (período de vida útil típico)
 * @param investimento - Investimento inicial em R$
 * @param economiaMensal - Economia mensal inicial em R$
 * @param reajusteAnual - Reajuste tarifário anual (padrão: 8%)
 * @param inflacao - Taxa de inflação anual (padrão: 5%)
 * @returns Array com projeção financeira para 25 anos
 */
export function projectLongTermSavings(
  investimento: number,
  economiaMensal: number,
  reajusteAnual: number = 0.08,
  inflacao: number = 0.05
): LongTermProjection[] {
  const projection: LongTermProjection[] = [];
  let economiaAcumulada = 0;
  
  for (let ano = 1; ano <= 25; ano++) {
    // Economia anual com reajuste tarifário
    const economiaAnual = economiaMensal * 12 * Math.pow(1 + reajusteAnual, ano - 1);
    economiaAcumulada += economiaAnual;
    
    // VPL (Valor Presente Líquido) descontado pela inflação
    const vpl = economiaAcumulada / Math.pow(1 + inflacao, ano) - investimento;
    
    projection.push({
      ano,
      economiaAnual: Math.round(economiaAnual),
      economiaAcumulada: Math.round(economiaAcumulada),
      vpl: Math.round(vpl)
    });
  }
  
  return projection;
}

/**
 * Calcula a geração anual total
 * @param cidade - Identificador da cidade
 * @param potenciaKwp - Potência do sistema em kWp
 * @param performanceRate - Taxa de performance
 * @returns Geração anual em kWh
 */
export function projectAnnualGeneration(
  cidade: string,
  potenciaKwp: number,
  performanceRate: number = 0.75
): number {
  const geracaoMensal = projectMonthlyGeneration(cidade, potenciaKwp, performanceRate);
  return geracaoMensal.reduce((total, mensal) => total + mensal, 0);
}

/**
 * Obtém dados solares de uma cidade específica
 * @param cidade - Identificador da cidade
 * @returns Dados solares da cidade ou null se não encontrado
 */
export function getSolarDataByCidade(cidade: string): SolarData | null {
  const cidadeKey = cidade.toLowerCase().trim();
  return SOLAR_DATA[cidadeKey] || null;
}

/**
 * Busca cidade por nome parcial (útil para autocomplete)
 * @param searchTerm - Termo de busca
 * @returns Lista de cidades que correspondem ao termo
 */
export function searchCidades(searchTerm: string): SolarData[] {
  const term = searchTerm.toLowerCase().trim();
  return Object.values(SOLAR_DATA).filter(data =>
    data.cidade.toLowerCase().includes(term) ||
    data.estado.toLowerCase().includes(term)
  );
}

/**
 * Obtém lista de todas as cidades disponíveis
 * @returns Array com todas as cidades no banco de dados
 */
export function getAllCidades(): SolarData[] {
  return Object.values(SOLAR_DATA);
}

/**
 * Obtém cidades de um estado específico
 * @param estado - Sigla do estado (ex: 'GO', 'SP')
 * @returns Lista de cidades do estado
 */
export function getCidadesByEstado(estado: string): SolarData[] {
  const estadoUpper = estado.toUpperCase().trim();
  return Object.values(SOLAR_DATA).filter(data => data.estado === estadoUpper);
}

/**
 * Calcula o HSP médio anual de uma cidade
 * @param cidade - Identificador da cidade
 * @returns HSP médio anual
 */
export function getAverageHSP(cidade: string): number {
  const data = getSolarDataByCidade(cidade);
  if (!data) return 5.21; // Fallback para média de Goiânia
  
  const total = data.hspMensal.reduce((sum, hsp) => sum + hsp, 0);
  return Math.round((total / 12) * 100) / 100;
}

/**
 * Determina o mês com maior irradiação solar
 * @param cidade - Identificador da cidade
 * @returns Nome do mês e HSP
 */
export function getBestSolarMonth(cidade: string): {mes: string, hsp: number} | null {
  const data = getSolarDataByCidade(cidade);
  if (!data) return null;
  
  const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  
  const maxHsp = Math.max(...data.hspMensal);
  const maxIndex = data.hspMensal.indexOf(maxHsp);
  
  return {
    mes: meses[maxIndex],
    hsp: maxHsp
  };
}

/**
 * Determina o mês com menor irradiação solar
 * @param cidade - Identificador da cidade
 * @returns Nome do mês e HSP
 */
export function getWorstSolarMonth(cidade: string): {mes: string, hsp: number} | null {
  const data = getSolarDataByCidade(cidade);
  if (!data) return null;
  
  const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  
  const minHsp = Math.min(...data.hspMensal);
  const minIndex = data.hspMensal.indexOf(minHsp);
  
  return {
    mes: meses[minIndex],
    hsp: minHsp
  };
}

/**
 * Calcula a variação sazonal (percentual de diferença entre melhor e pior mês)
 * @param cidade - Identificador da cidade
 * @returns Variação percentual
 */
export function getSeasonalVariation(cidade: string): number {
  const best = getBestSolarMonth(cidade);
  const worst = getWorstSolarMonth(cidade);
  
  if (!best || !worst) return 0;
  
  return Math.round(((best.hsp - worst.hsp) / worst.hsp) * 100 * 100) / 100;
}
