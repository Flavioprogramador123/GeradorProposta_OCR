import fs from 'fs';
import path from 'path';

export type MotivoRejeicao =
  | 'sem_match'
  | 'estoque_baixo'
  | 'sem_preco'
  | 'outro_cd'
  | 'score_baixo'
  | 'nao_modulo_auto';

export interface ItemRejeitado {
  cd: string;
  nome: string;
  preco: number | null;
  estoque: number | null;
  codigo?: string | null;
  motivo: MotivoRejeicao;
  detalhe?: string;
  score?: number;
}

export interface CapturaRejeitadosSnapshot {
  capturadoEm: string;
  fonte: string;
  totalLidos: number;
  totalAceitos: number;
  totalRejeitados: number;
  porCd: Record<string, number>;
  itens: ItemRejeitado[];
}

const PATH = path.join(process.cwd(), 'data', 'v3', 'captura-rejeitados.json');

export function getRejeitadosPath() {
  return PATH;
}

export function loadRejeitados(): CapturaRejeitadosSnapshot | null {
  try {
    if (!fs.existsSync(PATH)) return null;
    return JSON.parse(fs.readFileSync(PATH, 'utf8')) as CapturaRejeitadosSnapshot;
  } catch {
    return null;
  }
}

export function saveRejeitados(snap: CapturaRejeitadosSnapshot) {
  const dir = path.dirname(PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(PATH, JSON.stringify(snap, null, 2), 'utf8');
}

/** Acumula rejeitados de vários CDs numa única snapshot da última captura */
export function mergeAndSaveRejeitados(opts: {
  fonte: string;
  totalLidos: number;
  totalAceitos: number;
  itens: ItemRejeitado[];
}) {
  const porCd: Record<string, number> = {};
  for (const it of opts.itens) {
    porCd[it.cd] = (porCd[it.cd] || 0) + 1;
  }
  const snap: CapturaRejeitadosSnapshot = {
    capturadoEm: new Date().toISOString(),
    fonte: opts.fonte,
    totalLidos: opts.totalLidos,
    totalAceitos: opts.totalAceitos,
    totalRejeitados: opts.itens.length,
    porCd,
    itens: opts.itens.slice(0, 500),
  };
  saveRejeitados(snap);
  return snap;
}

export const MOTIVO_LABEL: Record<MotivoRejeicao, string> = {
  sem_match: 'Sem match no catálogo',
  estoque_baixo: 'Estoque ≤ mínimo (ou null)',
  sem_preco: 'Sem preço',
  outro_cd: 'Só disponível em outro CD',
  score_baixo: 'Score de match baixo',
  nao_modulo_auto: 'Não é módulo auto-cadastrável (sem Wp/marca)',
};
