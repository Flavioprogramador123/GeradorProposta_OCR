import { getV3Db } from '../db/sqlite';
import { calcularOrcamentoBase, type KitItemInput } from './kitEngine';

export interface OrcamentoBaseRecord {
  id: number;
  titulo: string;
  cd_id: number;
  cliente_nome: string | null;
  notas: string | null;
  custo_total: number;
  breakdown_json: string;
  itens_json: string;
  created_at: string;
  updated_at: string;
  cd_nome?: string;
}

export function listOrcamentosBase(): OrcamentoBaseRecord[] {
  const db = getV3Db();
  return db
    .prepare(
      `SELECT o.*, c.nome AS cd_nome
       FROM orcamentos_base o
       JOIN cds c ON c.id = o.cd_id
       ORDER BY o.id DESC`
    )
    .all() as OrcamentoBaseRecord[];
}

export function getOrcamentoBase(id: number) {
  const db = getV3Db();
  const row = db
    .prepare(
      `SELECT o.*, c.nome AS cd_nome FROM orcamentos_base o
       JOIN cds c ON c.id = o.cd_id WHERE o.id = ?`
    )
    .get(id) as OrcamentoBaseRecord | undefined;
  if (!row) return null;
  const itens = db
    .prepare('SELECT * FROM orcamento_base_itens WHERE orcamento_id = ? ORDER BY id')
    .all(id);
  return {
    ...row,
    breakdown: JSON.parse(row.breakdown_json || '{}'),
    itens,
  };
}

export function createOrcamentoBase(input: {
  titulo: string;
  cdId: number;
  cliente_nome?: string;
  notas?: string;
  itens: KitItemInput[];
  autoComplementos?: boolean;
}) {
  const calc = calcularOrcamentoBase({
    cdId: input.cdId,
    itens: input.itens,
    autoComplementos: input.autoComplementos,
  });

  const db = getV3Db();
  const result = db
    .prepare(
      `INSERT INTO orcamentos_base (titulo, cd_id, cliente_nome, notas, custo_total, breakdown_json, itens_json)
       VALUES (@titulo, @cd_id, @cliente_nome, @notas, @custo_total, @breakdown_json, @itens_json)`
    )
    .run({
      titulo: input.titulo.trim() || 'Orçamento base',
      cd_id: input.cdId,
      cliente_nome: input.cliente_nome?.trim() || null,
      notas: input.notas?.trim() || null,
      custo_total: calc.custo_total,
      breakdown_json: JSON.stringify(calc.breakdown),
      itens_json: JSON.stringify(calc.itens),
    });

  const id = Number(result.lastInsertRowid);
  const ins = db.prepare(
    `INSERT INTO orcamento_base_itens (
      orcamento_id, equipamento_id, sku_interno, nome, categoria,
      quantidade, preco_unitario, estoque, subtotal, sugerido, editado_manual
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const tx = db.transaction(() => {
    for (const it of calc.itens) {
      ins.run(
        id,
        it.equipamento_id,
        it.sku_interno,
        it.nome,
        it.categoria,
        it.quantidade,
        it.preco_unitario,
        it.estoque,
        it.subtotal,
        it.sugerido ? 1 : 0,
        it.editado_manual ? 1 : 0
      );
    }
  });
  tx();

  return { id, calc, orcamento: getOrcamentoBase(id) };
}

export function deleteOrcamentoBase(id: number): boolean {
  const db = getV3Db();
  const r = db.prepare('DELETE FROM orcamentos_base WHERE id = ?').run(id);
  return r.changes > 0;
}
