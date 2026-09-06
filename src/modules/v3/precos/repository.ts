import { getV3Db } from '../db/sqlite';
import { getEstoqueMinimoPorCategoria } from './regrasCaptura';
import { getEstoqueMinimos } from './estoqueMinimosConfig';

export interface PrecoCdRow {
  id: number;
  equipamento_id: number;
  cd_id: number;
  preco_custo: number | null;
  estoque: number | null;
  capturado_em: string | null;
  fonte: string | null;
  valido_estoque: number;
  sku_interno?: string;
  nome?: string;
  categoria?: string;
  cd_nome?: string;
  cd_slug?: string;
}

/** @deprecated use getEstoqueMinimoPorCategoria — mantido para stats/UI */
export function getEstoqueMinimoPreco(): number {
  return getEstoqueMinimos().modulo;
}

export { getEstoqueMinimoPorCategoria };
export { getEstoqueMinimos };

/** Seções do portal SOOLLAR → categorias SQLite (lista principal). */
export const SECOES_PRECO_FILTRO: Array<{
  id: string;
  label: string;
  categorias: string[];
}> = [
  { id: 'modulos', label: 'Módulos', categorias: ['modulo'] },
  { id: 'inversores', label: 'Inversores', categorias: ['inversor', 'microinversor'] },
  { id: 'estruturas', label: 'Estruturas', categorias: ['estrutura'] },
  { id: 'cabos', label: 'Cabos', categorias: ['cabo'] },
  {
    id: 'materiais-eletricos',
    label: 'Materiais elétricos',
    categorias: ['protecao', 'conector', 'miscelanea'],
  },
];

export function categoriasDaSecao(secao?: string | null): string[] | undefined {
  if (!secao || secao === 'todas') return undefined;
  const found = SECOES_PRECO_FILTRO.find((s) => s.id === secao);
  return found?.categorias;
}

export function listPrecos(opts?: {
  cdId?: number;
  apenasValidos?: boolean;
  apenasAtivos?: boolean;
  secao?: string;
  categorias?: string[];
}): PrecoCdRow[] {
  const db = getV3Db();
  const where: string[] = [];
  const params: Record<string, unknown> = {};
  if (opts?.cdId) {
    where.push('p.cd_id = @cdId');
    params.cdId = opts.cdId;
  }
  if (opts?.apenasValidos) {
    where.push('p.valido_estoque = 1 AND p.preco_custo IS NOT NULL');
  }
  if (opts?.apenasAtivos !== false) {
    where.push('e.ativo = 1');
  }
  const cats = opts?.categorias?.length ? opts.categorias : categoriasDaSecao(opts?.secao);
  if (cats?.length) {
    const placeholders = cats.map((_, i) => `@cat${i}`).join(', ');
    where.push(`e.categoria IN (${placeholders})`);
    cats.forEach((c, i) => {
      params[`cat${i}`] = c;
    });
  }
  return db
    .prepare(
      `SELECT p.*, e.sku_interno, e.nome, e.categoria, c.nome AS cd_nome, c.slug_portal AS cd_slug
       FROM precos_cd p
       JOIN equipamentos e ON e.id = p.equipamento_id
       JOIN cds c ON c.id = p.cd_id
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY
         CASE WHEN p.preco_custo IS NULL THEN 1 ELSE 0 END,
         p.preco_custo ASC,
         e.categoria,
         e.nome,
         c.codigo`
    )
    .all(params) as PrecoCdRow[];
}

export function upsertPrecoCd(input: {
  equipamentoId: number;
  cdId: number;
  precoCusto: number | null;
  estoque: number | null;
  fonte?: string;
  capturadoEm?: string;
}): { valido: boolean } {
  const db = getV3Db();
  const eq = db.prepare('SELECT categoria FROM equipamentos WHERE id = ?').get(input.equipamentoId) as
    | { categoria: string }
    | undefined;
  const min = getEstoqueMinimoPorCategoria(eq?.categoria);
  const estoque = input.estoque;
  const preco = input.precoCusto;
  const capturadoEm = input.capturadoEm || new Date().toISOString();
  const fonte = input.fonte || 'manual';
  // Entrada manual: preço basta para valer no kit. Scrape/import: exige estoque > mínimo.
  const valido =
    fonte === 'manual'
      ? preco != null && preco > 0
        ? 1
        : 0
      : estoque != null && estoque > min && preco != null && preco > 0
        ? 1
        : 0;

  db.prepare(
    `INSERT INTO precos_cd (equipamento_id, cd_id, preco_custo, estoque, capturado_em, fonte, valido_estoque)
     VALUES (@equipamentoId, @cdId, @preco, @estoque, @capturadoEm, @fonte, @valido)
     ON CONFLICT(equipamento_id, cd_id) DO UPDATE SET
       preco_custo = excluded.preco_custo,
       estoque = excluded.estoque,
       capturado_em = excluded.capturado_em,
       fonte = excluded.fonte,
       valido_estoque = excluded.valido_estoque`
  ).run({
    equipamentoId: input.equipamentoId,
    cdId: input.cdId,
    preco,
    estoque,
    capturadoEm,
    fonte,
    valido,
  });

  db.prepare(
    `INSERT INTO precos_cd_historico (equipamento_id, cd_id, preco_custo, estoque, capturado_em, fonte)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(input.equipamentoId, input.cdId, preco, estoque, capturadoEm, fonte);

  return { valido: valido === 1 };
}

export function getPrecosStats() {
  const db = getV3Db();
  const total = db.prepare('SELECT COUNT(*) AS c FROM precos_cd').get() as { c: number };
  const validos = db
    .prepare('SELECT COUNT(*) AS c FROM precos_cd WHERE valido_estoque = 1 AND preco_custo IS NOT NULL')
    .get() as { c: number };
  const porCd = db
    .prepare(
      `SELECT c.id, c.nome, c.slug_portal, COUNT(p.id) AS total,
              SUM(CASE WHEN p.valido_estoque = 1 THEN 1 ELSE 0 END) AS validos,
              MAX(p.capturado_em) AS ultimo
       FROM cds c
       LEFT JOIN precos_cd p ON p.cd_id = c.id
       WHERE c.ativo = 1
       GROUP BY c.id
       ORDER BY c.codigo`
    )
    .all();
  const whitelist = db.prepare('SELECT COUNT(*) AS c FROM equipamentos WHERE ativo = 1').get() as { c: number };
  const mins = getEstoqueMinimos();
  return {
    precosTotal: total.c,
    precosValidos: validos.c,
    equipamentosAtivos: whitelist.c,
    estoqueMinimo: mins.modulo,
    estoqueMinimoModulo: mins.modulo,
    estoqueMinimoOutros: mins.outros,
    porCd,
  };
}

export function resolveCdId(slugOrCodigo: string | number): number | null {
  const db = getV3Db();
  if (typeof slugOrCodigo === 'number' || /^\d+$/.test(String(slugOrCodigo))) {
    const row = db.prepare('SELECT id FROM cds WHERE codigo = ? OR id = ?').get(Number(slugOrCodigo), Number(slugOrCodigo)) as
      | { id: number }
      | undefined;
    return row?.id ?? null;
  }
  const q = String(slugOrCodigo).toLowerCase();
  const row = db
    .prepare(
      `SELECT id FROM cds WHERE lower(slug_portal) = ? OR lower(nome) = ? OR lower(slug_portal) LIKE ?`
    )
    .get(q, q, `%${q}%`) as { id: number } | undefined;
  return row?.id ?? null;
}

export interface PrecoResolvido {
  preco_custo: number | null;
  estoque: number | null;
  valido: boolean;
  cd_origem_id: number;
  cd_origem_nome: string;
  fallback: boolean;
  valido_estoque_origem: number;
}

/**
 * Preço no CD pedido; se faltar, usa outra filial (Aeroporto → Matriz → Feira).
 */
export function resolverPrecoEquipamento(
  equipamentoId: number,
  cdIdPreferido: number,
  opts?: { permitirFallback?: boolean; exigirValidoEstoque?: boolean }
): PrecoResolvido | null {
  const db = getV3Db();
  const permitirFallback = opts?.permitirFallback !== false;
  const exigirValido = opts?.exigirValidoEstoque !== false;

  const rowLocal = db
    .prepare(
      `SELECT p.preco_custo, p.estoque, p.valido_estoque, p.cd_id, c.nome AS cd_nome
       FROM precos_cd p
       JOIN cds c ON c.id = p.cd_id
       WHERE p.equipamento_id = ? AND p.cd_id = ?`
    )
    .get(equipamentoId, cdIdPreferido) as
    | {
        preco_custo: number | null;
        estoque: number | null;
        valido_estoque: number;
        cd_id: number;
        cd_nome: string;
      }
    | undefined;

  const okLocal =
    rowLocal &&
    rowLocal.preco_custo != null &&
    rowLocal.preco_custo > 0 &&
    (!exigirValido || rowLocal.valido_estoque === 1);

  if (okLocal && rowLocal) {
    return {
      preco_custo: rowLocal.preco_custo,
      estoque: rowLocal.estoque,
      valido: true,
      cd_origem_id: rowLocal.cd_id,
      cd_origem_nome: rowLocal.cd_nome,
      fallback: false,
      valido_estoque_origem: rowLocal.valido_estoque,
    };
  }

  const localComPreco =
    rowLocal && rowLocal.preco_custo != null && rowLocal.preco_custo > 0 ? rowLocal : null;

  if (!permitirFallback) {
    if (!localComPreco) return null;
    return {
      preco_custo: localComPreco.preco_custo,
      estoque: localComPreco.estoque,
      valido: localComPreco.valido_estoque === 1,
      cd_origem_id: localComPreco.cd_id,
      cd_origem_nome: localComPreco.cd_nome,
      fallback: false,
      valido_estoque_origem: localComPreco.valido_estoque,
    };
  }

  const ordemPreferencia = [1, 2, 3].filter((id) => id !== cdIdPreferido);
  const candidatos = db
    .prepare(
      `SELECT p.preco_custo, p.estoque, p.valido_estoque, p.cd_id, c.nome AS cd_nome
       FROM precos_cd p
       JOIN cds c ON c.id = p.cd_id
       WHERE p.equipamento_id = ?
         AND p.cd_id != ?
         AND p.preco_custo IS NOT NULL
         AND p.preco_custo > 0
       ORDER BY p.valido_estoque DESC, IFNULL(p.estoque, 0) DESC`
    )
    .all(equipamentoId, cdIdPreferido) as Array<{
    preco_custo: number;
    estoque: number | null;
    valido_estoque: number;
    cd_id: number;
    cd_nome: string;
  }>;

  candidatos.sort((a, b) => {
    const ia = ordemPreferencia.indexOf(a.cd_id);
    const ib = ordemPreferencia.indexOf(b.cd_id);
    const ra = ia === -1 ? 99 : ia;
    const rb = ib === -1 ? 99 : ib;
    if (ra !== rb) return ra - rb;
    if (b.valido_estoque !== a.valido_estoque) return b.valido_estoque - a.valido_estoque;
    return (b.estoque || 0) - (a.estoque || 0);
  });

  const best = candidatos[0];
  if (best) {
    return {
      preco_custo: best.preco_custo,
      estoque: best.estoque,
      valido: true,
      cd_origem_id: best.cd_id,
      cd_origem_nome: best.cd_nome,
      fallback: true,
      valido_estoque_origem: best.valido_estoque,
    };
  }

  if (localComPreco) {
    return {
      preco_custo: localComPreco.preco_custo,
      estoque: localComPreco.estoque,
      valido: localComPreco.valido_estoque === 1,
      cd_origem_id: localComPreco.cd_id,
      cd_origem_nome: localComPreco.cd_nome,
      fallback: false,
      valido_estoque_origem: localComPreco.valido_estoque,
    };
  }

  return null;
}
