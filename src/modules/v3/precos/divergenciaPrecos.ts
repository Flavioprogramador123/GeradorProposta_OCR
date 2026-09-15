/**
 * Detecta preços do mesmo SKU com divergência grande entre CDs.
 *
 * SOOLLAR costuma manter o card com estoque 0 e preço inflado
 * (placeholder até a próxima remessa). Isso NÃO é mismatch de scrape —
 * ignoramos estoque inválido/zerado e outliers de preço fantasma.
 */
import { getV3Db } from '../db/sqlite';
import { getEstoqueMinimoPorCategoria } from './regrasCaptura';

/** Razão máx/mín a partir da qual alerta (1.4 = 40% acima) */
export const DIVERGENCIA_RAZAO_MIN = 1.4;

/**
 * Preço ≥ este múltiplo da mediana dos demais CDs = fantasma SOOLLAR
 * (card ativo com valor alto para o cliente não clicar).
 */
export const PRECO_FANTASMA_VS_MEDIANA = 1.55;

export interface DivergenciaPrecoCd {
  cd_id: number;
  cd_nome: string;
  preco_custo: number;
  estoque: number | null;
  fonte: string | null;
  fantasma?: boolean;
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

function mediana(nums: number[]): number {
  if (!nums.length) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

/** Marca CDs cujo preço está muito acima da mediana (placeholder estoque). */
export function marcarPrecosFantasma(
  cds: DivergenciaPrecoCd[],
  razaoVsMediana = PRECO_FANTASMA_VS_MEDIANA
): void {
  if (cds.length < 2) return;
  const precos = cds.map((c) => Number(c.preco_custo)).filter((n) => n > 0);
  if (precos.length < 2) return;
  const med = mediana(precos);
  if (med <= 0) return;
  for (const c of cds) {
    const p = Number(c.preco_custo);
    c.fantasma = p >= med * razaoVsMediana;
  }
}

export function listDivergenciasPrecos(opts?: {
  razaoMin?: number;
  apenasAtivos?: boolean;
  /** Default true: só compara preços com estoque válido (ignora pausados/zerados). */
  apenasValidos?: boolean;
  /** Default true: exclui outliers “fantasma” (preço inflado vs mediana). */
  excluirFantasma?: boolean;
}): DivergenciaPrecoSku[] {
  const db = getV3Db();
  const razaoMin = opts?.razaoMin ?? DIVERGENCIA_RAZAO_MIN;
  const apenasAtivos = opts?.apenasAtivos !== false;
  const apenasValidos = opts?.apenasValidos !== false;
  const excluirFantasma = opts?.excluirFantasma !== false;

  const rows = db
    .prepare(
      `SELECT e.id AS equipamento_id, e.sku_interno, e.nome, e.categoria,
              c.id AS cd_id, c.nome AS cd_nome, p.preco_custo, p.estoque, p.fonte, p.valido_estoque
       FROM equipamentos e
       JOIN precos_cd p ON p.equipamento_id = e.id
       JOIN cds c ON c.id = p.cd_id AND c.ativo = 1
       WHERE p.preco_custo IS NOT NULL AND p.preco_custo > 0
         ${apenasValidos ? 'AND p.valido_estoque = 1 AND IFNULL(p.estoque, 0) > 0' : ''}
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
    estoque: number | null;
    fonte: string | null;
    valido_estoque: number;
  }>;

  const byEq = new Map<number, typeof rows>();
  for (const r of rows) {
    // Cinto e suspensório: estoque abaixo do mínimo da categoria = não comparar
    if (apenasValidos) {
      const min = getEstoqueMinimoPorCategoria(r.categoria);
      if ((r.estoque ?? 0) <= min) continue;
    }
    const list = byEq.get(r.equipamento_id) || [];
    list.push(r);
    byEq.set(r.equipamento_id, list);
  }

  const out: DivergenciaPrecoSku[] = [];
  for (const list of Array.from(byEq.values())) {
    if (list.length < 2) continue;

    const cdsAll: DivergenciaPrecoCd[] = list.map((x) => ({
      cd_id: x.cd_id,
      cd_nome: x.cd_nome,
      preco_custo: Number(x.preco_custo),
      estoque: x.estoque,
      fonte: x.fonte,
    }));
    marcarPrecosFantasma(cdsAll);

    const cdsCompare = excluirFantasma ? cdsAll.filter((c) => !c.fantasma) : cdsAll;
    // Se sobrou <2 após tirar fantasma, não é mismatch de scrape — é placeholder SOOLLAR
    if (cdsCompare.length < 2) continue;

    const precos = cdsCompare.map((x) => x.preco_custo).filter((n) => n > 0);
    if (precos.length < 2) continue;
    const preco_min = Math.min(...precos);
    const preco_max = Math.max(...precos);
    if (preco_min <= 0) continue;
    const razao = preco_max / preco_min;
    if (razao < razaoMin) continue;

    const head = list[0]!;
    const fantasmas = cdsAll.filter((c) => c.fantasma);
    out.push({
      equipamento_id: head.equipamento_id,
      sku_interno: head.sku_interno,
      nome: head.nome,
      categoria: head.categoria,
      razao: Math.round(razao * 100) / 100,
      preco_min,
      preco_max,
      cds: cdsAll,
      alerta:
        `${head.sku_interno}: preços entre CDs divergem ${razao.toFixed(1)}× ` +
        `(R$ ${preco_min.toFixed(2)} → R$ ${preco_max.toFixed(2)})` +
        (fantasmas.length
          ? `. ${fantasmas.length} CD(s) com preço fantasma (inflado; típico estoque baixo/zerado na SOOLLAR).`
          : '. Possível mismatch na captura.'),
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
    `Compara só estoque válido. Preço inflado com estoque zero (placeholder SOOLLAR) é ignorado.\n` +
    linhas.join('\n') +
    extra
  );
}
