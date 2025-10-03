/**
 * 📊 PIENG - Calculadora Unificada de Preços v2.0
 *
 * Sistema unificado baseado em DESPESAS FIXAS + VARIÁVEIS
 * Substituindo o modelo antigo de Markup por método isonômico
 *
 * Versão: 2.0
 * Data: 01/10/2025
 * Autor: PIENG Soluções
 */

export interface ParametrosCalculo {
  pCusto: number;                  // Preço de custo total (R$)
  despesaFixa: number;             // Despesa fixa por sistema (R$)
  despesaVariavelPercent: number;  // Despesa variável sobre custo (%)
  descontoPix: number;             // Desconto PIX (% ou decimal)
  taxaCartao12x: number;           // Taxa cartão 12x (% ou decimal)
  taxaCartao18x: number;           // Taxa cartão 18x (% ou decimal)
  fatorParcelado?: number;         // Markup parcelado (padrão: 1.20 = 20%)
}

export interface ResultadoCalculo {
  // Valores Base
  pCusto: number;                  // Preço de custo
  despesas: number;                // Total de despesas
  despesaFixa: number;             // Despesa fixa
  despesaVariavel: number;         // Despesa variável
  totalBase: number;               // P.Custo + Despesas = PIX

  // Preços Finais
  ppix: number;                    // Preço PIX (base sem markup)
  pavista: number;                 // Preço à vista (com desconto PIX reverso)
  priscado: number;                // Preço riscado (com markup parcelado)

  // Parcelamento 12x
  p12x: number;                    // Valor da parcela 12x
  p12x_total: number;              // Valor total 12x (com taxas)

  // Parcelamento 18x
  p18x_parcela: number;            // Valor da parcela 18x
  p18x_total: number;              // Valor total 18x (com taxas)

  // Métricas de Análise
  margemBruta: number;             // (Despesas / PIX) * 100
  margemSobreCusto: number;        // (Despesas / P.Custo) * 100
  precoKwp: number;                // PIX / potência (se fornecida)

  // Fatores Calculados
  fator12x: number;                // 1 - (taxaCartao12x / 100)
  fator18x: number;                // 1 - (taxaCartao18x / 100)
  fatorDescontoPix: number;        // descontoPix em decimal
}

/**
 * Calcula todos os preços baseado em despesas fixas + variáveis
 *
 * @param params - Parâmetros de cálculo
 * @param potenciaKwp - Potência do sistema (opcional, para cálculo de R$/kWp)
 * @returns Resultado completo com todos os preços e métricas
 */
export function calcularPrecos(
  params: ParametrosCalculo,
  potenciaKwp?: number
): ResultadoCalculo {
  const {
    pCusto,
    despesaFixa,
    despesaVariavelPercent,
    descontoPix,
    taxaCartao12x,
    taxaCartao18x,
    fatorParcelado = 1.20 // Padrão: 20% markup
  } = params;

  // Validações
  if (pCusto < 0) throw new Error('P.Custo não pode ser negativo');
  if (despesaFixa < 0) throw new Error('Despesa fixa não pode ser negativa');
  if (despesaVariavelPercent < 0) throw new Error('Despesa variável não pode ser negativa');

  // 1. Converter percentuais para decimais (se necessário)
  const descontoPix_decimal = descontoPix > 1 ? descontoPix / 100 : descontoPix;
  const taxaCartao12x_decimal = taxaCartao12x > 1 ? taxaCartao12x / 100 : taxaCartao12x;
  const taxaCartao18x_decimal = taxaCartao18x > 1 ? taxaCartao18x / 100 : taxaCartao18x;

  // 2. Calcular Despesas
  const despesaVariavel = pCusto * (despesaVariavelPercent / 100);
  const despesas = despesaFixa + despesaVariavel;

  // 3. Preço PIX (Base = P.Custo + Despesas)
  const ppix = pCusto + despesas;
  const totalBase = ppix;

  // 4. Calcular fatores de parcelamento
  const fator12x = 1 - taxaCartao12x_decimal;
  const fator18x = 1 - taxaCartao18x_decimal;

  // Validação de fatores
  if (fator12x <= 0 || fator12x > 1) {
    throw new Error(`Fator 12x inválido: ${fator12x}. Taxa cartão 12x: ${taxaCartao12x}`);
  }
  if (fator18x <= 0 || fator18x > 1) {
    throw new Error(`Fator 18x inválido: ${fator18x}. Taxa cartão 18x: ${taxaCartao18x}`);
  }

  // 5. Preços Parcelados (considerar taxa da operadora)
  const p12x_total = ppix / fator12x;
  const p12x = p12x_total / 12;

  const p18x_total = ppix / fator18x;
  const p18x_parcela = p18x_total / 18;

  // 6. Preço À Vista (PIX tem desconto, então à vista é maior)
  const pavista = ppix / (1 - descontoPix_decimal);

  // 7. Preço Riscado (com markup para parcelado)
  const priscado = ppix * fatorParcelado;

  // 8. Métricas de Análise
  const margemBruta = (despesas / ppix) * 100;
  const margemSobreCusto = (despesas / pCusto) * 100;
  const precoKwp = potenciaKwp && potenciaKwp > 0 ? ppix / potenciaKwp : 0;

  return {
    // Valores Base
    pCusto: Math.round(pCusto * 100) / 100,
    despesas: Math.round(despesas * 100) / 100,
    despesaFixa: Math.round(despesaFixa * 100) / 100,
    despesaVariavel: Math.round(despesaVariavel * 100) / 100,
    totalBase: Math.round(totalBase * 100) / 100,

    // Preços Finais
    ppix: Math.round(ppix * 100) / 100,
    pavista: Math.round(pavista * 100) / 100,
    priscado: Math.round(priscado * 100) / 100,

    // Parcelamento 12x
    p12x: Math.round(p12x * 100) / 100,
    p12x_total: Math.round(p12x_total * 100) / 100,

    // Parcelamento 18x
    p18x_parcela: Math.round(p18x_parcela * 100) / 100,
    p18x_total: Math.round(p18x_total * 100) / 100,

    // Métricas
    margemBruta: Math.round(margemBruta * 100) / 100,
    margemSobreCusto: Math.round(margemSobreCusto * 100) / 100,
    precoKwp: Math.round(precoKwp * 100) / 100,

    // Fatores
    fator12x: Math.round(fator12x * 10000) / 10000,
    fator18x: Math.round(fator18x * 10000) / 10000,
    fatorDescontoPix: Math.round(descontoPix_decimal * 10000) / 10000
  };
}

/**
 * Calcula preços para múltiplos orçamentos (útil para comparações)
 */
export function calcularPrecosMultiplos(
  orcamentos: Array<{ pCusto: number; potenciaKwp: number }>,
  params: Omit<ParametrosCalculo, 'pCusto'>
): ResultadoCalculo[] {
  return orcamentos.map(orc =>
    calcularPrecos(
      { ...params, pCusto: orc.pCusto },
      orc.potenciaKwp
    )
  );
}

/**
 * Calcula o P.Custo necessário para atingir um preço PIX alvo
 * (útil para trabalho reverso: "quero vender por R$ X, qual deve ser o custo?")
 */
export function calcularCustoAlvo(
  pixAlvo: number,
  params: Omit<ParametrosCalculo, 'pCusto'>
): number {
  const { despesaFixa, despesaVariavelPercent } = params;

  // PIX = P.Custo + Despesa Fixa + (P.Custo × Variável%)
  // PIX = P.Custo × (1 + Variável%) + Despesa Fixa
  // P.Custo = (PIX - Despesa Fixa) / (1 + Variável%)

  const fatorVariavel = 1 + (despesaVariavelPercent / 100);
  const pCusto = (pixAlvo - despesaFixa) / fatorVariavel;

  return Math.round(pCusto * 100) / 100;
}

/**
 * Compara dois cenários de precificação
 */
export interface ComparacaoCenarios {
  cenario1: ResultadoCalculo;
  cenario2: ResultadoCalculo;
  diferencas: {
    ppix: number;
    despesas: number;
    margemBruta: number;
    precoKwp: number;
  };
  recomendacao: string;
}

export function compararCenarios(
  params1: ParametrosCalculo,
  params2: ParametrosCalculo,
  potenciaKwp?: number
): ComparacaoCenarios {
  const c1 = calcularPrecos(params1, potenciaKwp);
  const c2 = calcularPrecos(params2, potenciaKwp);

  const diferencas = {
    ppix: c2.ppix - c1.ppix,
    despesas: c2.despesas - c1.despesas,
    margemBruta: c2.margemBruta - c1.margemBruta,
    precoKwp: c2.precoKwp - c1.precoKwp
  };

  let recomendacao = '';
  if (diferencas.ppix < -500) {
    recomendacao = 'Cenário 1 é mais competitivo (menor preço)';
  } else if (diferencas.ppix > 500) {
    recomendacao = 'Cenário 2 tem maior margem';
  } else {
    recomendacao = 'Cenários equivalentes';
  }

  return {
    cenario1: c1,
    cenario2: c2,
    diferencas,
    recomendacao
  };
}

/**
 * Formata valor monetário para exibição
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

/**
 * Formata percentual para exibição
 */
export function formatPercent(value: number, decimals: number = 2): string {
  return `${value.toFixed(decimals)}%`;
}

// Exportar constantes úteis
export const CENARIOS_PADRAO = {
  economico: {
    despesaFixa: 5000,
    despesaVariavelPercent: 70,
    nome: 'Econômico',
    descricao: 'Estratégia agressiva para volume'
  },
  standard: {
    despesaFixa: 6500,
    despesaVariavelPercent: 78,
    nome: 'Standard',
    descricao: 'Balanceado - Recomendado'
  },
  premium: {
    despesaFixa: 8000,
    despesaVariavelPercent: 85,
    nome: 'Premium',
    descricao: 'Maior margem - Projetos especiais'
  }
} as const;
