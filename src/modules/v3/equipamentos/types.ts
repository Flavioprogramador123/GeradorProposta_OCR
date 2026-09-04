export type EquipamentoCategoria =
  | 'modulo'
  | 'inversor'
  | 'microinversor'
  | 'estrutura'
  | 'cabo'
  | 'conector'
  | 'miscelanea'
  | 'protecao'
  | 'outro';

export interface Equipamento {
  id: number;
  sku_interno: string;
  sku_soollar: string | null;
  nome: string;
  marca: string | null;
  categoria: EquipamentoCategoria;
  potencia_w: number | null;
  potencia_kw: number | null;
  especificacao_json: string;
  ativo: number;
  prioridade_kit: number;
  created_at: string;
  updated_at: string;
}

export interface EquipamentoInput {
  sku_interno: string;
  sku_soollar?: string | null;
  nome: string;
  marca?: string | null;
  categoria: EquipamentoCategoria;
  potencia_w?: number | null;
  potencia_kw?: number | null;
  especificacao_json?: string | Record<string, unknown>;
  ativo?: boolean | number;
  prioridade_kit?: number;
  aliases?: string[];
}

export interface EquipamentoComAliases extends Equipamento {
  aliases: string[];
}

export const CATEGORIAS: EquipamentoCategoria[] = [
  'modulo',
  'inversor',
  'microinversor',
  'estrutura',
  'cabo',
  'conector',
  'miscelanea',
  'protecao',
  'outro',
];
