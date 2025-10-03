interface ConfiguracaoSistema {
  // Parâmetros Técnicos
  performanceRate: number;
  hspPadrao: number;
  margemSeguranca: number;
  eficienciaInversor: number;

  // Parâmetros Financeiros
  taxaSelic: number;
  inflacaoAnual: number;
  reajusteEnergia: number;
  
  // Markups Comerciais
  markupEconomico: number;
  markupStandard: number;
  markupPremium: number;

  // Parcelamento
  jurosParcela12x: number;
  jurosParcela18x: number;
  descontoPix: number;

  // Textos de Marketing (Variáveis)
  textoEconomiaAnual: string;
  textoPayback: string;
  textoTIR: string;
  textoValorizacaoImovel: string;
  textoSustentabilidade: string;

  // Configurações Regionais
  estadosPadrao: string[];
  hspPorEstado: { [key: string]: number };
}

const CONFIG_PADRAO: ConfiguracaoSistema = {
  // Técnico
  performanceRate: 0.75,
  hspPadrao: 5.21,
  margemSeguranca: 1.1,
  eficienciaInversor: 0.95,

  // Financeiro
  taxaSelic: 11.25,
  inflacaoAnual: 4.5,
  reajusteEnergia: 8.2,

  // Comercial
  markupEconomico: 1.8,
  markupStandard: 2.0,
  markupPremium: 2.3,

  // Parcelamento
  jurosParcela12x: 2.5,
  jurosParcela18x: 3.2,
  descontoPix: 0.05,

  // Textos Marketing
  textoEconomiaAnual: 'Economia anual de R$ {valorEconomia} na conta de energia',
  textoPayback: 'Investimento se paga em apenas {mesesPayback} meses',
  textoTIR: 'Taxa Interna de Retorno de {percentualTIR}% ao ano',
  textoValorizacaoImovel: 'Valorização do imóvel em até {percentualValorizacao}%',
  textoSustentabilidade: 'Evita emissão de {tonelaCO2} toneladas de CO₂ em 25 anos (vida útil do sistema)',

  // Regional
  estadosPadrao: ['GO', 'DF', 'MG', 'MT', 'MS', 'BA', 'TO'],
  hspPorEstado: {
    'GO': 5.21,
    'DF': 5.08,
    'MG': 4.95,
    'MT': 5.43,
    'MS': 5.12,
    'BA': 5.67,
    'TO': 5.34
  }
};

// Função para carregar configurações do sistema
export async function carregarConfiguracoes(): Promise<ConfiguracaoSistema> {
  try {
    if (typeof window !== 'undefined') {
      // Cliente-side
      const response = await fetch('/api/admin/config');
      if (response.ok) {
        const config = await response.json();
        return { ...CONFIG_PADRAO, ...config };
      }
    } else {
      // Server-side
      const fs = require('fs').promises;
      const path = require('path');
      const configPath = path.join(process.cwd(), 'src/data/sistema/configuracoes.json');
      
      try {
        const configData = await fs.readFile(configPath, 'utf8');
        const config = JSON.parse(configData);
        return { ...CONFIG_PADRAO, ...config };
      } catch {
        // Arquivo não existe, usar padrão
      }
    }
  } catch (error) {
    console.warn('Erro ao carregar configurações, usando padrão:', error);
  }
  
  return CONFIG_PADRAO;
}

// Função para calcular preço com desconto PIX
export function calcularPrecoPixComDesconto(precoBase: number, config: ConfiguracaoSistema): number {
  return precoBase * (1 - config.descontoPix);
}

// Função para calcular parcelas
export function calcularParcelas(precoBase: number, config: ConfiguracaoSistema) {
  const preco12x = precoBase * (1 + config.jurosParcela12x / 100) / 12;
  const preco18x = precoBase * (1 + config.jurosParcela18x / 100) / 18;
  
  return {
    parcela12x: preco12x,
    parcela18x: preco18x,
    valor12x: precoBase * (1 + config.jurosParcela12x / 100),
    valor18x: precoBase * (1 + config.jurosParcela18x / 100)
  };
}

// Função para calcular potência necessária
export function calcularPotenciaNecessaria(
  consumoMensal: number, 
  hsp: number, 
  config: ConfiguracaoSistema
): number {
  return (consumoMensal * config.margemSeguranca) / (hsp * 30 * config.performanceRate);
}

// Função para calcular payback
export function calcularPayback(
  investimento: number, 
  economiaAnual: number, 
  config: ConfiguracaoSistema
): number {
  // Payback simples considerando reajuste da energia
  const economiaAjustada = economiaAnual * (1 + config.reajusteEnergia / 100);
  return (investimento / economiaAjustada) * 12; // em meses
}

// Função para calcular TIR
export function calcularTIR(
  investimento: number, 
  economiaAnual: number, 
  anosVidaUtil: number = 25
): number {
  // Cálculo simplificado da TIR
  const fluxoAnual = economiaAnual;
  const tir = ((fluxoAnual * anosVidaUtil) / investimento - 1) / anosVidaUtil * 100;
  return Math.max(tir, 0);
}

// Função para aplicar markup
export function aplicarMarkup(
  pcusto: number, 
  pdespesa: number, 
  tipoSistema: 'economico' | 'standard' | 'premium',
  config: ConfiguracaoSistema
): number {
  const markups = {
    economico: config.markupEconomico,
    standard: config.markupStandard,
    premium: config.markupPremium
  };
  
  return (pcusto + pdespesa) * markups[tipoSistema];
}

// Função para processar textos de marketing com variáveis
export function processarTextoMarketing(
  template: string, 
  variaveis: { [key: string]: string | number }
): string {
  let texto = template;
  
  for (const [chave, valor] of Object.entries(variaveis)) {
    const regex = new RegExp(`\\{${chave}\\}`, 'g');
    texto = texto.replace(regex, valor.toString());
  }
  
  return texto;
}

// Função para obter HSP por estado
export function obterHSP(estado: string, config: ConfiguracaoSistema): number {
  return config.hspPorEstado[estado] || config.hspPadrao;
}

// Função para calcular economia de CO2
export function calcularEconomiaCO2(geracaoAnual: number): number {
  // Fator de emissão do SIN: ~0.0896 tCO2/MWh (fonte: ONS)
  const fatorEmissao = 0.0896;
  const geracaoMWh = geracaoAnual / 1000; // kWh para MWh
  return geracaoMWh * fatorEmissao * 25; // 25 anos de vida útil
}

// Função para calcular valorização do imóvel
export function calcularValorizacaoImovel(investimento: number): number {
  // Estimativa: sistema solar valoriza o imóvel em 4-6% do valor investido
  return 5.0; // percentual médio
}

export type { ConfiguracaoSistema };
export { CONFIG_PADRAO };