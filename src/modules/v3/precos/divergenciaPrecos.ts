/**
 * Detecta preços do mesmo SKU com divergência grande entre CDs
 * (ex.: mismatch scrape — bateria colada em inversor).
 */
import { getV3Db } from '../db/sqlite';

/** Razão máx/mín a partir da qual alerta (1.4 = 40% acima) */
export const DIVERGENCIA_RAZAO_MIN = 1.4;

export interface DivergenciaPrecoCd {
  cd_id: number;
  cd_nome: string;
  preco_custo: number;
  fonte: string | null;
}

export interface DivergenciaPrecoSku {
  equipamento_id: number;
  sku_interno: string;
  nome: string;
  categoria: string;
  razao: number;
  preco_min: number;
  preco_max: number;
  cds: DivergenciaPrecoCd[];
  alerta: string;
}

export function listDivergenciasPrecos(opts?: {
  razaoMin?: number;
  apenasAtivos?: boolean;
}): DivergenciaPrecoSku[] {
  const db = getV3Db();
  const razaoMin = opts?.razaoMin ?? DIVERGENCIA_RAZAO_MIN;
  const apenasAtivos = opts?.apenasAtivos !== false;

  const rows = db
    .prepare(
      `SELECT e.id AS equipamento_id, e.sku_interno, e.nome, e.categoria,
              c.id AS cd_id, c.nome AS cd_nome, p.preco_custo, p.fonte
       FROM equipamentos e
       JOIN precos_cd p ON p.equipamento_id = e.id
       JOIN cds c ON c.id = p.cd_id AND c.ativo = 1
       WHERE p.preco_custo IS NOT NULL AND p.preco_custo > 0
         ${apenasAtivos ? 'AND e.ativo = 1' : ''}
       ORDER BY e.id, c.codigo`
    )
    .all() as Array<{
    equipamento_id: number;
    sku_interno: string;
    nome: string;
    categoria: string;
    cd_id: number;
    cd_nome: string;
    preco_custo: number;
    fonte: string | null;
  }>;

  const byEq = new Map<number, typeof rows>();
  for (const r of rows) {
    const list = byEq.get(r.equipamento_id) || [];
    list.push(r);
    byEq.set(r.equipamento_id, list);
  }

  const out: DivergenciaPrecoSku[] = [];
  for (const list of Array.from(byEq.values())) {
    if (list.length < 2) continue;
    const precos = list.map((x) => Number(x.preco_custo)).filter((n: number) => n > 0);
    if (precos.length < 2) continue;
    const preco_min = Math.min(...precos);
    const preco_max = Math.max(...precos);
    if (preco_min <= 0) continue;
    const razao = preco_max / preco_min;
    if (razao < razaoMin) continue;
    const head = list[0];
    out.push({
      equipamento_id: head.equipamento_id,
      sku_interno: head.sku_interno,
      nome: head.nome,
      categoria: head.categoria,
      razao: Math.round(razao * 100) / 100,
      preco_min,
      preco_max,
      cds: list.map((x) => ({
        cd_id: x.cd_id,
        cd_nome: x.cd_nome,
        preco_custo: Number(x.preco_custo),
        fonte: x.fonte,
      })),
      alerta: `${head.sku_interno}: preços entre CDs divergem ${razao.toFixed(1)}× (R$ ${preco_min.toFixed(2)} → R$ ${preco_max.toFixed(2)}). Possível mismatch na captura.`,
    });
  }

  out.sort((a, b) => b.razao - a.razao);
  return out;
}

export function formatDivergenciasResumo(divs: DivergenciaPrecoSku[], limite = 8): string {
  if (!divs.length) return '';
  const linhas = divs.slice(0, limite).map((d) => `⚠ ${d.alerta}`);
  const extra = divs.length > limite ? `\n… +${divs.length - limite} SKU(s)` : '';
  return (
    `\n\n🚨 DIVERGÊNCIA DE PREÇO ENTRE CDs (${divs.length} SKU)\n` +
    `Mesmo equipamento com valores muito diferentes — revise antes de publicar.\n` +
    linhas.join('\n') +
    extra
  );
}
