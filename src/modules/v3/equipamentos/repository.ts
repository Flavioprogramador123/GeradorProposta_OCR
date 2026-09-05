import { getV3Db, getV3DbPath } from '../db/sqlite';
import type { Equipamento, EquipamentoComAliases, EquipamentoInput } from './types';

function normalizeJson(value: EquipamentoInput['especificacao_json']): string {
  if (value == null) return '{}';
  if (typeof value === 'string') {
    try {
      JSON.parse(value);
      return value;
    } catch {
      return '{}';
    }
  }
  return JSON.stringify(value);
}

function rowToEquip(row: Equipamento): Equipamento {
  return row;
}

export function listEquipamentos(opts?: {
  categoria?: string;
  ativo?: boolean;
  q?: string;
}): EquipamentoComAliases[] {
  const db = getV3Db();
  const where: string[] = [];
  const params: Record<string, unknown> = {};

  if (opts?.categoria) {
    where.push('e.categoria = @categoria');
    params.categoria = opts.categoria;
  }
  if (opts?.ativo === true) {
    where.push('e.ativo = 1');
  } else if (opts?.ativo === false) {
    where.push('e.ativo = 0');
  }
  if (opts?.q) {
    where.push("(e.nome LIKE @q OR e.marca LIKE @q OR e.sku_interno LIKE @q OR IFNULL(e.sku_soollar,'') LIKE @q)");
    params.q = `%${opts.q}%`;
  }

  const sql = `
    SELECT e.* FROM equipamentos e
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY e.categoria, e.prioridade_kit, e.nome
  `;
  const rows = db.prepare(sql).all(params) as Equipamento[];
  const aliasStmt = db.prepare(
    'SELECT texto_match FROM equipamento_aliases WHERE equipamento_id = ? ORDER BY id'
  );

  return rows.map((r) => ({
    ...rowToEquip(r),
    aliases: (aliasStmt.all(r.id) as Array<{ texto_match: string }>).map((a) => a.texto_match),
  }));
}

export function getEquipamento(id: number): EquipamentoComAliases | null {
  const db = getV3Db();
  const row = db.prepare('SELECT * FROM equipamentos WHERE id = ?').get(id) as Equipamento | undefined;
  if (!row) return null;
  const aliases = (
    db.prepare('SELECT texto_match FROM equipamento_aliases WHERE equipamento_id = ?').all(id) as Array<{
      texto_match: string;
    }>
  ).map((a) => a.texto_match);
  return { ...row, aliases };
}

export function createEquipamento(input: EquipamentoInput): EquipamentoComAliases {
  const db = getV3Db();
  const result = db
    .prepare(
      `INSERT INTO equipamentos (
        sku_interno, sku_soollar, nome, marca, categoria,
        potencia_w, potencia_kw, especificacao_json, ativo, prioridade_kit
      ) VALUES (
        @sku_interno, @sku_soollar, @nome, @marca, @categoria,
        @potencia_w, @potencia_kw, @especificacao_json, @ativo, @prioridade_kit
      )`
    )
    .run({
      sku_interno: input.sku_interno.trim(),
      sku_soollar: input.sku_soollar?.trim() || null,
      nome: input.nome.trim(),
      marca: input.marca?.trim() || null,
      categoria: input.categoria,
      potencia_w: input.potencia_w ?? null,
      potencia_kw: input.potencia_kw ?? null,
      especificacao_json: normalizeJson(input.especificacao_json),
      ativo: input.ativo === false || input.ativo === 0 ? 0 : 1,
      prioridade_kit: input.prioridade_kit ?? 100,
    });

  const id = Number(result.lastInsertRowid);
  if (input.aliases?.length) {
    const ins = db.prepare(
      'INSERT OR IGNORE INTO equipamento_aliases (equipamento_id, texto_match) VALUES (?, ?)'
    );
    const tx = db.transaction(() => {
      for (const a of input.aliases!) {
        const t = a.trim();
        if (t) ins.run(id, t);
      }
    });
    tx();
  }

  return getEquipamento(id)!;
}

export function updateEquipamento(id: number, input: Partial<EquipamentoInput>): EquipamentoComAliases | null {
  const current = getEquipamento(id);
  if (!current) return null;
  const db = getV3Db();

  db.prepare(
    `UPDATE equipamentos SET
      sku_interno = @sku_interno,
      sku_soollar = @sku_soollar,
      nome = @nome,
      marca = @marca,
      categoria = @categoria,
      potencia_w = @potencia_w,
      potencia_kw = @potencia_kw,
      especificacao_json = @especificacao_json,
      ativo = @ativo,
      prioridade_kit = @prioridade_kit,
      updated_at = datetime('now')
    WHERE id = @id`
  ).run({
    id,
    sku_interno: (input.sku_interno ?? current.sku_interno).trim(),
    sku_soollar: (input.sku_soollar !== undefined ? input.sku_soollar : current.sku_soollar)?.toString().trim() || null,
    nome: (input.nome ?? current.nome).trim(),
    marca: (input.marca !== undefined ? input.marca : current.marca)?.toString().trim() || null,
    categoria: input.categoria ?? current.categoria,
    potencia_w: input.potencia_w !== undefined ? input.potencia_w : current.potencia_w,
    potencia_kw: input.potencia_kw !== undefined ? input.potencia_kw : current.potencia_kw,
    especificacao_json:
      input.especificacao_json !== undefined
        ? normalizeJson(input.especificacao_json)
        : current.especificacao_json,
    ativo:
      input.ativo === undefined
        ? current.ativo
        : input.ativo === false || input.ativo === 0
          ? 0
          : 1,
    prioridade_kit: input.prioridade_kit ?? current.prioridade_kit,
  });

  if (input.aliases) {
    db.prepare('DELETE FROM equipamento_aliases WHERE equipamento_id = ?').run(id);
    const ins = db.prepare(
      'INSERT OR IGNORE INTO equipamento_aliases (equipamento_id, texto_match) VALUES (?, ?)'
    );
    const tx = db.transaction(() => {
      for (const a of input.aliases!) {
        const t = a.trim();
        if (t) ins.run(id, t);
      }
    });
    tx();
  }

  return getEquipamento(id);
}

export function softDeleteEquipamento(id: number): boolean {
  const db = getV3Db();
  const r = db
    .prepare(`UPDATE equipamentos SET ativo = 0, updated_at = datetime('now') WHERE id = ?`)
    .run(id);
  return r.changes > 0;
}

export function upsertBySkuInterno(input: EquipamentoInput): { id: number; created: boolean } {
  const db = getV3Db();
  const existing = db
    .prepare('SELECT id FROM equipamentos WHERE sku_interno = ?')
    .get(input.sku_interno.trim()) as { id: number } | undefined;

  if (existing) {
    updateEquipamento(existing.id, input);
    return { id: existing.id, created: false };
  }
  const created = createEquipamento(input);
  return { id: created.id, created: true };
}

export function getV3Stats() {
  const db = getV3Db();
  const equipamentos = db.prepare('SELECT COUNT(*) AS c FROM equipamentos WHERE ativo = 1').get() as {
    c: number;
  };
  const total = db.prepare('SELECT COUNT(*) AS c FROM equipamentos').get() as { c: number };
  const porCategoria = db
    .prepare(
      `SELECT categoria, COUNT(*) AS c FROM equipamentos WHERE ativo = 1 GROUP BY categoria ORDER BY categoria`
    )
    .all() as Array<{ categoria: string; c: number }>;
  const cds = db.prepare('SELECT id, codigo, nome, slug_portal FROM cds WHERE ativo = 1').all();
  const precos = db.prepare('SELECT COUNT(*) AS c FROM precos_cd').get() as { c: number };

  return {
    equipamentosAtivos: equipamentos.c,
    equipamentosTotal: total.c,
    porCategoria,
    cds,
    precosRegistrados: precos.c,
    dbPath: getV3DbPath(),
  };
}
