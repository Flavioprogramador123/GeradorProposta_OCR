// Sistema de Variantes de Apresentação PIENG
// Configuração para diferentes tipos de cliente

export type ClientType = 'residencial' | 'rural' | 'industrial' | 'comercial';

export type ComercialSubType =
  | 'panificadora'
  | 'acougue'
  | 'restaurante'
  | 'farmacia'
  | 'geral';

export interface VariantConfig {
  id: string;
  tipo: ClientType;
  subTipo?: ComercialSubType;
  nome: string;
  descricao: string;

  // Estilos visuais
  tema: {
    corPrimaria: string;
    corSecundaria: string;
    corDestaque: string;
    gradiente: string;
    icone: string; // emoji ou caminho do ícone
  };

  // Textos personalizados
  copy: {
    tituloHero: string;
    subtituloHero: string;
    chamadaPrincipal: string;
    beneficios: string[];
    ctaTexto: string;
  };

  // Componentes específicos
  features: {
    mostrarGraficoGeracao: boolean;
    mostrarComparativoMensal: boolean;
    mostrarCasosSucesso: boolean;
    enfaseEconomia: boolean;
    enfaseAmbiental: boolean;
  };

  // CSS personalizado
  cssFile: string;
}

// ========================================
// VARIANTES PRÉ-CONFIGURADAS
// ========================================

export const VARIANTES: Record<string, VariantConfig> = {
  // RESIDENCIAL
  residencial: {
    id: 'residencial',
    tipo: 'residencial',
    nome: 'Residencial',
    descricao: 'Proposta para residências unifamiliares',

    tema: {
      corPrimaria: '#3366CC',
      corSecundaria: '#FF6B35',
      corDestaque: '#2ecc71',
      gradiente: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      icone: '🏡'
    },

    copy: {
      tituloHero: 'Energia Solar para Sua Casa',
      subtituloHero: 'Economize até 95% na sua conta de luz',
      chamadaPrincipal: 'Transforme sua residência em um lar sustentável e econômico',
      beneficios: [
        '💰 Redução imediata na conta de energia',
        '🌱 Valorização do imóvel em até 10%',
        '🔒 Proteção contra aumentos da tarifa',
        '♻️ Energia 100% limpa e renovável'
      ],
      ctaTexto: 'Quero economizar agora'
    },

    features: {
      mostrarGraficoGeracao: true,
      mostrarComparativoMensal: true,
      mostrarCasosSucesso: false,
      enfaseEconomia: true,
      enfaseAmbiental: true
    },

    cssFile: 'residencial.css'
  },

  // RURAL
  rural: {
    id: 'rural',
    tipo: 'rural',
    nome: 'Rural',
    descricao: 'Proposta para propriedades rurais e agronegócio',

    tema: {
      corPrimaria: '#2d6a4f',
      corSecundaria: '#95d5b2',
      corDestaque: '#f4a261',
      gradiente: 'linear-gradient(135deg, #52b788 0%, #2d6a4f 100%)',
      icone: '🌾'
    },

    copy: {
      tituloHero: 'Energia Solar para o Agronegócio',
      subtituloHero: 'Reduza custos operacionais e aumente a produtividade',
      chamadaPrincipal: 'Energia confiável para impulsionar sua produção rural',
      beneficios: [
        '💰 Redução de custos em irrigação e maquinário',
        '🚜 Autonomia energética para toda a propriedade',
        '📈 Aumento da competitividade do negócio',
        '🌿 Energia limpa para agricultura sustentável'
      ],
      ctaTexto: 'Otimizar custos da propriedade'
    },

    features: {
      mostrarGraficoGeracao: true,
      mostrarComparativoMensal: true,
      mostrarCasosSucesso: true,
      enfaseEconomia: true,
      enfaseAmbiental: false
    },

    cssFile: 'rural.css'
  },

  // INDUSTRIAL
  industrial: {
    id: 'industrial',
    tipo: 'industrial',
    nome: 'Industrial',
    descricao: 'Proposta para indústrias e fábricas',

    tema: {
      corPrimaria: '#1e3a8a',
      corSecundaria: '#fb923c',
      corDestaque: '#22c55e',
      gradiente: 'linear-gradient(135deg, #3b82f6 0%, #1e3a8a 100%)',
      icone: '🏭'
    },

    copy: {
      tituloHero: 'Energia Solar Industrial',
      subtituloHero: 'Reduza custos operacionais e aumente a margem de lucro',
      chamadaPrincipal: 'Solução energética robusta para alta demanda industrial',
      beneficios: [
        '💼 Redução de até 95% nos custos com energia',
        '📊 Previsibilidade financeira de longo prazo',
        '⚡ Sistema dimensionado para alta demanda',
        '🏆 Certificação ESG e responsabilidade ambiental'
      ],
      ctaTexto: 'Reduzir custos operacionais'
    },

    features: {
      mostrarGraficoGeracao: true,
      mostrarComparativoMensal: true,
      mostrarCasosSucesso: true,
      enfaseEconomia: true,
      enfaseAmbiental: false
    },

    cssFile: 'industrial.css'
  },

  // COMERCIAL - FARMÁCIA
  comercial_farmacia: {
    id: 'comercial_farmacia',
    tipo: 'comercial',
    subTipo: 'farmacia',
    nome: 'Farmácia',
    descricao: 'Proposta para farmácias e drogarias',

    tema: {
      corPrimaria: '#059669',
      corSecundaria: '#06b6d4',
      corDestaque: '#f59e0b',
      gradiente: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      icone: '💊'
    },

    copy: {
      tituloHero: 'Energia Solar para Farmácias',
      subtituloHero: 'Reduza custos e garanta operação contínua',
      chamadaPrincipal: 'Energia confiável para manter seus equipamentos sempre funcionando',
      beneficios: [
        '❄️ Refrigeração de medicamentos sem preocupação',
        '💰 Economia mensal na conta de energia',
        '🔋 Segurança energética para equipamentos críticos',
        '🏥 Sustentabilidade na saúde'
      ],
      ctaTexto: 'Garantir economia na farmácia'
    },

    features: {
      mostrarGraficoGeracao: true,
      mostrarComparativoMensal: true,
      mostrarCasosSucesso: true,
      enfaseEconomia: true,
      enfaseAmbiental: false
    },

    cssFile: 'comercial-farmacia.css'
  },

  // COMERCIAL - PANIFICADORA
  comercial_panificadora: {
    id: 'comercial_panificadora',
    tipo: 'comercial',
    subTipo: 'panificadora',
    nome: 'Panificadora',
    descricao: 'Proposta para padarias e confeitarias',

    tema: {
      corPrimaria: '#d97706',
      corSecundaria: '#facc15',
      corDestaque: '#ef4444',
      gradiente: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      icone: '🍞'
    },

    copy: {
      tituloHero: 'Energia Solar para Panificadoras',
      subtituloHero: 'Mantenha os fornos ligados economizando muito',
      chamadaPrincipal: 'Energia abundante para sua produção diária',
      beneficios: [
        '🔥 Economia em fornos e equipamentos de alta potência',
        '💰 Redução de custos para aumentar margem',
        '⚡ Energia estável para produção contínua',
        '🌱 Padaria sustentável e moderna'
      ],
      ctaTexto: 'Reduzir custos da padaria'
    },

    features: {
      mostrarGraficoGeracao: true,
      mostrarComparativoMensal: true,
      mostrarCasosSucesso: true,
      enfaseEconomia: true,
      enfaseAmbiental: false
    },

    cssFile: 'comercial-panificadora.css'
  },

  // COMERCIAL - AÇOUGUE
  comercial_acougue: {
    id: 'comercial_acougue',
    tipo: 'comercial',
    subTipo: 'acougue',
    nome: 'Açougue',
    descricao: 'Proposta para açougues e frigoríficos',

    tema: {
      corPrimaria: '#dc2626',
      corSecundaria: '#7c3aed',
      corDestaque: '#f59e0b',
      gradiente: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
      icone: '🥩'
    },

    copy: {
      tituloHero: 'Energia Solar para Açougues',
      subtituloHero: 'Refrigeração confiável com economia garantida',
      chamadaPrincipal: 'Energia abundante para manter a qualidade dos produtos',
      beneficios: [
        '❄️ Economia em câmaras frias e refrigeração',
        '💰 Redução drástica nos custos operacionais',
        '🔒 Proteção contra variação de energia',
        '🌱 Açougue moderno e sustentável'
      ],
      ctaTexto: 'Economizar no açougue'
    },

    features: {
      mostrarGraficoGeracao: true,
      mostrarComparativoMensal: true,
      mostrarCasosSucesso: true,
      enfaseEconomia: true,
      enfaseAmbiental: false
    },

    cssFile: 'comercial-acougue.css'
  },

  // COMERCIAL - RESTAURANTE
  comercial_restaurante: {
    id: 'comercial_restaurante',
    tipo: 'comercial',
    subTipo: 'restaurante',
    nome: 'Restaurante',
    descricao: 'Proposta para restaurantes e bares',

    tema: {
      corPrimaria: '#ea580c',
      corSecundaria: '#fbbf24',
      corDestaque: '#22c55e',
      gradiente: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
      icone: '🍽️'
    },

    copy: {
      tituloHero: 'Energia Solar para Restaurantes',
      subtituloHero: 'Reduza custos e aumente o lucro do seu negócio',
      chamadaPrincipal: 'Energia para cozinha, refrigeração e ambiente confortável',
      beneficios: [
        '🍳 Economia em cozinha e equipamentos',
        '❄️ Refrigeração eficiente com custo reduzido',
        '💰 Aumento da margem de lucro',
        '🌿 Restaurante sustentável e responsável'
      ],
      ctaTexto: 'Aumentar lucro do restaurante'
    },

    features: {
      mostrarGraficoGeracao: true,
      mostrarComparativoMensal: true,
      mostrarCasosSucesso: true,
      enfaseEconomia: true,
      enfaseAmbiental: false
    },

    cssFile: 'comercial-restaurante.css'
  }
};

// ========================================
// FUNÇÕES AUXILIARES
// ========================================

/**
 * Retorna a configuração de variante baseada no tipo e subtipo do cliente
 */
export function getVariantConfig(
  tipo: ClientType,
  subTipo?: ComercialSubType
): VariantConfig {
  // Se for comercial, buscar pela chave composta
  if (tipo === 'comercial' && subTipo) {
    const key = `comercial_${subTipo}`;
    return VARIANTES[key] || VARIANTES.residencial; // Fallback para residencial
  }

  // Para outros tipos, buscar diretamente
  return VARIANTES[tipo] || VARIANTES.residencial;
}

/**
 * Lista todas as variantes disponíveis
 */
export function listarVariantes(): VariantConfig[] {
  return Object.values(VARIANTES);
}

/**
 * Lista variantes por tipo
 */
export function listarVariantesPorTipo(tipo: ClientType): VariantConfig[] {
  return Object.values(VARIANTES).filter(v => v.tipo === tipo);
}

/**
 * Verifica se uma variante existe
 */
export function variantExists(id: string): boolean {
  return id in VARIANTES;
}
