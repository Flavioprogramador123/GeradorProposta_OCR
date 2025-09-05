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