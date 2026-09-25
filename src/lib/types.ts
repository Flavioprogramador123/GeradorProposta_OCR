export interface ClienteInfo {
  nome: string;
  cidade: string;
  consumoKwh: string;
  tipo: string;
  hspLocal: string;
}

export interface SistemaData {
  titulo: string;
  potencia: string;
  especificacoes: string[];
  precoRiscado: string;
  precoAtual: string;
  tagDesconto: string;
  precoPixDecimal: number;
  preco12x: string;
  preco18x: string;
  geracao: string;
  cobertura: string;
  economia: string;
  payback: string;
  tir: string;
  isRecommended?: boolean;
  badge?: string;
}

export interface AnaliseEstrategica {
  paybackMin: string;
  paybackMax: string;
  melhorSistemaNome: string;
  melhorSistemaPotencia: string;
  melhorSistemaPix: string;
  melhorSistemaPayback: string;
  geracaoMax: string;
  coberturaMax: string;
  tirMax: string;
  economiaTarifa: string;
}

export interface ConfiguracoesEmpresa {
  contato: string;
  email: string;
  site: string;
  whatsapp?: string;
}

export interface PropostaData {
  cliente: ClienteInfo;
  sistemas: SistemaData[];
  analise: AnaliseEstrategica;
  empresa: ConfiguracoesEmpresa;
  bannerUrgencia: string;
  dataGeracao: string;
  dataValidade: string;
  /** Slug público da proposta (links, PDF, edição) */
  slug?: string;
  /** Chave estável de template (padrão/resultados) */
  template?: string;
  /** Marcador de template salvo/exibido */
  templateExibicao?: string;
  /** Configurações usadas no cálculo — replay/edição */
  config?: {
    taxaCartaoMensal?: number;
    /** Maquininha vigente (Ton/PagSeguro) */
    adquirente?: string;
    prazoRecebimento?: string | null;
    faixaFaturamento?: number | null;
    taxaMensalPagSeguro?: number | null;
    /** Juros % total por parcela da tabela ativa */
    jurosParcelaPercent?: Record<string, number> | null;
    tonTotais?: Record<string, number> | null;
    maxParcelasCartao?: number;
    [key: string]: unknown;
  };
  /** Tabela de cartão resolvida no momento da geração */
  cartao?: {
    adquirente?: string;
    prazoRecebimento?: string | null;
    faixaFaturamento?: number | null;
    jurosParcelaPercent?: Record<string, number> | null;
    maxParcelas?: number;
    taxaCartaoMensal?: number;
  };
  performanceRate?: number;
  marketing?: Record<string, unknown>;
  v3Navegacao?: {
    origemUi: string;
    returnTo: string;
  };
}

export interface SystemComparisonData {
  nome: string;
  potencia: string;
  pix: string;
  parcela12x: string;
  parcela18x: string;
  geracao: string;
  payback: string;
  tir: string;
  isRecommended?: boolean;
}