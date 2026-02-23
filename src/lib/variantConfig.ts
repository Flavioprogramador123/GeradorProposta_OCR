/**
 * 🎨 SISTEMA DE VARIANTES DE TEMPLATES - PIENG SOLAR
 * 
 * Configuração centralizada de todos os templates especializados por tipo de cliente.
 * Cada variante define: tema visual, recursos ativados, textos personalizados e template HTML.
 */

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

export type ClientType = 'residencial' | 'rural' | 'comercial' | 'industrial';

export type ComercialSubType = 'panificadora' | 'acougue' | 'restaurante' | 'mercado';

export interface VariantFeatures {
  graficosAvancados: boolean;           // Ativa gráficos Chart.js
  projecaoSolar: boolean;                // Projeção 12 meses CRESESB
  analiseEconomica: boolean;             // ROI detalhado
  analiseAmbiental: boolean;             // CO2, árvores equivalentes
  analiseIrrigacao?: boolean;            // Exclusivo Rural
  analiseCustoOperacional?: boolean;     // Exclusivo Comercial
  analiseDemandaContratada?: boolean;    // Exclusivo Industrial
  graficoCustoComposicao?: boolean;      // Pizza de custos
  graficoPaybackComparativo?: boolean;   // Barras de payback
  graficoEconomiaAcumulada?: boolean;    // Linha de economia 25 anos
  graficoGeracaoMensal?: boolean;        // Barras de geração 12 meses
  graficoConsumoSazonal?: boolean;       // Linha safra vs entressafra (rural)
  graficoHorarioPico?: boolean;          // Consumo pico vs fora-pico (comercial)
}

export interface VariantTema {
  corPrimaria: string;       // Hex color
  corSecundaria: string;     // Hex color
  gradiente: string;         // CSS gradient
  icone: string;             // Emoji ou Unicode
}

export interface VariantCopy {
  tituloHero: string;
  subtituloHero: string;
  ctaTexto: string;
  beneficios: string[];
}

export interface VariantConfig {
  id: string;
  nome: string;
  descricao: string;
  tipo: ClientType;
  subtipo?: ComercialSubType;
  
  features: VariantFeatures;
  tema: VariantTema;
  copy: VariantCopy;
  
  templateFile: string;      // Caminho relativo ao diretório de templates
  cssFile: string;           // Caminho relativo ao diretório de estilos
}

// ============================================================================
// CONFIGURAÇÕES DAS VARIANTES
// ============================================================================

export const VARIANT_CONFIGS: Record<string, VariantConfig> = {
  
  // ========== RESIDENCIAL PREMIUM ==========
  'residencial': {
    id: 'residencial',
    nome: 'Residencial Premium',
    descricao: 'Template otimizado para clientes residenciais com foco em economia doméstica e valorização do imóvel',
    tipo: 'residencial',
    
    features: {
      graficosAvancados: true,
      projecaoSolar: true,
      analiseEconomica: true,
      analiseAmbiental: true,
      graficoCustoComposicao: true,
      graficoPaybackComparativo: true,
      graficoEconomiaAcumulada: true,
      graficoGeracaoMensal: true,
    },
    
    tema: {
      corPrimaria: '#3366CC',
      corSecundaria: '#FF6B35',
      gradiente: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      icone: '🏠'
    },
    
    copy: {
      tituloHero: 'Sua Casa 100% Solar',
      subtituloHero: 'Economize até 95% na conta de luz e valorize seu imóvel',
      ctaTexto: 'Quero Economizar Agora',
      beneficios: [
        'Zero conta de luz',
        'Valorização do imóvel em até 20%',
        'Energia limpa e sustentável',
        'Payback rápido (2-3 anos)',
        'Vida útil de 25+ anos',
        'Manutenção mínima'
      ]
    },
    
    templateFile: 'variants/residencial_premium.html',
    cssFile: 'residencial.css'  // ✅ Mesmo padrão dos comerciais (sem 'variants/')
  },
  
  // ========== RURAL AGRO ==========
  'rural': {
    id: 'rural',
    nome: 'Rural Agro',
    descricao: 'Template para propriedades rurais com análise de irrigação e economia por safra',
    tipo: 'rural',
    
    features: {
      graficosAvancados: true,
      projecaoSolar: true,
      analiseEconomica: true,
      analiseAmbiental: false,
      analiseIrrigacao: true,
      graficoGeracaoMensal: true,
      graficoConsumoSazonal: true,
      graficoPaybackComparativo: true,
    },
    
    tema: {
      corPrimaria: '#27ae60',
      corSecundaria: '#f39c12',
      gradiente: 'linear-gradient(135deg, #56ab2f 0%, #a8e063 100%)',
      icone: '🌾☀️🚜'
    },
    
    copy: {
      tituloHero: 'Sua Roça Brilhando no Sol 🌾☀️',
      subtituloHero: 'Irrigação, ordenha e máquinas com energia que vem do céu! Menos diesel, mais produtividade.',
      ctaTexto: 'Quero Energia Solar no Meu Sítio',
      beneficios: [
        '🌾 Irrigação e pivô com energia solar',
        '🚜 Menos diesel, mais economia no campo',
        '🐄 Ordenha e resfriamento de leite 24h',
        '☀️ Energia garantida 365 dias no ano',
        '💰 ROI em menos de 2 safras',
        '🌻 Sustentabilidade que valoriza sua propriedade'
      ]
    },
    
    templateFile: 'variants/rural_agro.html',
    cssFile: 'variants/rural.css'
  },
  
  // ========== COMERCIAL - PANIFICADORA ==========
  'comercial-panificadora': {
    id: 'comercial-panificadora',
    nome: 'Panificadora',
    descricao: 'Template para panificadoras com foco em redução de custo operacional',
    tipo: 'comercial',
    subtipo: 'panificadora',
    
    features: {
      graficosAvancados: true,
      projecaoSolar: true,
      analiseEconomica: true,
      analiseAmbiental: true,
      analiseCustoOperacional: true,
      graficoHorarioPico: true,
      graficoCustoComposicao: true,
      graficoPaybackComparativo: true,
    },
    
    tema: {
      corPrimaria: '#d35400',
      corSecundaria: '#f39c12',
      gradiente: 'linear-gradient(135deg, #eb3349 0%, #f45c43 100%)',
      icone: '🥖🍞🥛'
    },
    
    copy: {
      tituloHero: 'Padaria Solar — Pão, Leite e Energia do Sol! 🥖🍞☀️',
      subtituloHero: 'Fornos, batedeiras, freezers e iluminação com energia solar. Sua padaria mais leve na conta e no planeta!',
      ctaTexto: 'Quero Economizar na Minha Padaria',
      beneficios: [
        '🥖 Pão quentinho com energia do sol',
        '🥛 Leite e frios em freezers solares',
        '☕ Cafeteria e iluminação 100% solar',
        '🔥 Fornos e equipamentos sem pesar na conta',
        '💰 Margem maior em cada produto vendido',
        '🌱 Selo "Padaria Sustentável" para atrair clientes'
      ]
    },
    
    templateFile: 'variants/comercial_panificadora.html',
    cssFile: 'comercial-panificadora.css' // ✅ CSS específico para panificadora
  },
  
  // ========== COMERCIAL - AÇOUGUE ==========
  'comercial-acougue': {
    id: 'comercial-acougue',
    nome: 'Açougue',
    descricao: 'Template para açougues com foco em economia de câmaras frias',
    tipo: 'comercial',
    subtipo: 'acougue',
    
    features: {
      graficosAvancados: true,
      projecaoSolar: true,
      analiseEconomica: true,
      analiseAmbiental: true,
      analiseCustoOperacional: true,
      graficoHorarioPico: true,
      graficoCustoComposicao: true,
    },
    
    tema: {
      corPrimaria: '#c0392b',
      corSecundaria: '#e74c3c',
      gradiente: 'linear-gradient(135deg, #c31432 0%, #240b36 100%)',
      icone: '🥩❄️🥓'
    },
    
    copy: {
      tituloHero: 'Açougue Solar — Carne Fresca, Conta Leve! 🥩❄️',
      subtituloHero: 'Câmaras frias e balcões refrigerados com energia do sol. Qualidade e economia 24 horas.',
      ctaTexto: 'Quero Reduzir a Conta do Açougue',
      beneficios: [
        '🥩 Câmaras frias 24h com energia solar',
        '❄️ Balcões refrigerados sem pesar na conta',
        '🥓 Cortes sempre frescos, custo fixo',
        '💰 Redução de até 90% na conta de luz',
        '🌱 Açougue sustentável atrai mais clientes',
        '⚡ Energia garantida para nunca perder produto'
      ]
    },
    
    templateFile: 'variants/comercial_acougue.html',
    cssFile: 'comercial-acougue.css' // ✅ CSS específico para açougue
  },
  
  // ========== COMERCIAL - RESTAURANTE ==========
  'comercial-restaurante': {
    id: 'comercial-restaurante',
    nome: 'Restaurante',
    descricao: 'Template para restaurantes com foco em ar-condicionado e cozinha',
    tipo: 'comercial',
    subtipo: 'restaurante',
    
    features: {
      graficosAvancados: true,
      projecaoSolar: true,
      analiseEconomica: true,
      analiseAmbiental: true,
      analiseCustoOperacional: true,
      graficoHorarioPico: true,
      graficoCustoComposicao: true,
    },
    
    tema: {
      corPrimaria: '#16a085',
      corSecundaria: '#f39c12',
      gradiente: 'linear-gradient(135deg, #134e5e 0%, #71b280 100%)',
      icone: '🍽️❄️👨‍🍳'
    },
    
    copy: {
      tituloHero: 'Restaurante Solar — Cliente Fresco, Conta Leve! 🍽️☀️',
      subtituloHero: 'Ar-condicionado, cozinha e iluminação com energia do sol. Ambiente agradável e custo sob controle.',
      ctaTexto: 'Quero Economizar no Restaurante',
      beneficios: [
        '❄️ Ar-condicionado e climatização solar',
        '👨‍🍳 Cozinha profissional com energia limpa',
        '🍽️ Iluminação e freezers sem pesar na conta',
        '🌱 Marketing "Restaurante Verde"',
        '💰 ROI em 2-3 anos',
        '⭐ Diferenciação e certificado sustentável'
      ]
    },
    
    templateFile: 'variants/comercial_restaurante.html',
    cssFile: 'comercial-restaurante.css' // ✅ CSS específico para restaurante
  },
  
  // ========== COMERCIAL - MERCADO ==========
  'comercial-mercado': {
    id: 'comercial-mercado',
    nome: 'Mercado/Supermercado',
    descricao: 'Template para mercados com análise completa (iluminação + refrigeração + AC)',
    tipo: 'comercial',
    subtipo: 'mercado',
    
    features: {
      graficosAvancados: true,
      projecaoSolar: true,
      analiseEconomica: true,
      analiseAmbiental: true,
      analiseCustoOperacional: true,
      graficoHorarioPico: true,
      graficoCustoComposicao: true,
      graficoPaybackComparativo: true,
    },
    
    tema: {
      corPrimaria: '#2980b9',
      corSecundaria: '#27ae60',
      gradiente: 'linear-gradient(135deg, #2980b9 0%, #2c3e50 100%)',
      icone: '🛒❄️💡'
    },
    
    copy: {
      tituloHero: 'Mercado Solar — Prateleiras Cheias, Conta Leve! 🛒☀️',
      subtituloHero: 'Geladeiras, freezers, iluminação e ar-condicionado com energia do sol. Seu mercado mais sustentável.',
      ctaTexto: 'Quero Economizar no Mercado',
      beneficios: [
        '💡 Iluminação 100% solar',
        '❄️ Geladeiras e freezers com energia limpa',
        '🛒 Ar-condicionado sem pesar na conta',
        '💰 Redução massiva de custos operacionais',
        '🌱 Selo "Mercado Sustentável"',
        '⭐ Certificação e diferenciação no bairro'
      ]
    },
    
    templateFile: 'variants/comercial_mercado.html',
    cssFile: 'comercial-mercado.css' // ✅ CSS específico para mercado
  },
  
  // ========== INDUSTRIAL PREMIUM ==========
  'industrial': {
    id: 'industrial',
    nome: 'Industrial Premium',
    descricao: 'Template para indústrias com análise de demanda contratada e créditos de energia',
    tipo: 'industrial',
    
    features: {
      graficosAvancados: true,
      projecaoSolar: true,
      analiseEconomica: true,
      analiseAmbiental: true,
      analiseDemandaContratada: true,
      graficoCustoComposicao: true,
      graficoPaybackComparativo: true,
      graficoEconomiaAcumulada: true,
    },
    
    tema: {
      corPrimaria: '#34495e',
      corSecundaria: '#3498db',
      gradiente: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
      icone: '🏭'
    },
    
    copy: {
      tituloHero: 'Indústria Solar',
      subtituloHero: 'Reduza demanda contratada e gere créditos de energia',
      ctaTexto: 'Reduzir Custos Industriais',
      beneficios: [
        'Redução de demanda contratada',
        'Geração de créditos de energia',
        'Economia em bandeiras tarifárias',
        'Certificação ISO 14001 (ambiental)',
        'ROI detalhado com TIR e VPL',
        'Sustentabilidade corporativa'
      ]
    },
    
    templateFile: 'variants/industrial_premium.html',
    cssFile: 'variants/industrial.css'
  }
};

// ============================================================================
// FUNÇÕES HELPER
// ============================================================================

/**
 * Obtém a configuração de uma variante específica
 */
export function getVariantConfig(
  tipo: ClientType, 
  subtipo?: ComercialSubType
): VariantConfig | null {
  // Se for comercial, precisa de subtipo
  if (tipo === 'comercial') {
    if (!subtipo) return null;
    const key = `${tipo}-${subtipo}`;
    return VARIANT_CONFIGS[key] || null;
  }
  
  // Outros tipos não têm subtipo
  return VARIANT_CONFIGS[tipo] || null;
}

/**
 * Obtém todas as variantes de um tipo específico
 */
export function getVariantsByType(tipo: ClientType): VariantConfig[] {
  return Object.values(VARIANT_CONFIGS).filter(v => v.tipo === tipo);
}

/**
 * Obtém todas as variantes disponíveis
 */
export function getAllVariants(): VariantConfig[] {
  return Object.values(VARIANT_CONFIGS);
}

/**
 * Obtém a lista de subtipos comerciais disponíveis
 */
export function getComercialSubTypes(): ComercialSubType[] {
  return ['panificadora', 'acougue', 'restaurante', 'mercado'];
}

/**
 * Obtém o template padrão (fallback quando nenhuma variante é selecionada)
 */
export function getDefaultTemplate(): string {
  return 'pieng_proposal_template.html';
}

/**
 * Valida se uma combinação tipo + subtipo é válida
 */
export function isValidVariant(
  tipo: ClientType, 
  subtipo?: ComercialSubType
): boolean {
  const config = getVariantConfig(tipo, subtipo);
  return config !== null;
}

/**
 * Obtém o nome amigável de uma variante
 */
export function getVariantName(
  tipo: ClientType, 
  subtipo?: ComercialSubType
): string {
  const config = getVariantConfig(tipo, subtipo);
  return config?.nome || 'Template Padrão';
}

/**
 * Obtém a descrição de uma variante
 */
export function getVariantDescription(
  tipo: ClientType, 
  subtipo?: ComercialSubType
): string {
  const config = getVariantConfig(tipo, subtipo);
  return config?.descricao || 'Template padrão para todos os tipos de clientes';
}