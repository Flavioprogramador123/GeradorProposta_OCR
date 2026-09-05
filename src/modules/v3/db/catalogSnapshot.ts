/**
 * Dump / restore do catálogo V3 (SQLite ↔ JSON ↔ Supabase).
 */
import type { Database } from 'better-sqlite3';

export interface V3CatalogDump {
  version: 1;
  exportedAt: string;
  cds: Array<Record<string, unknown>>;
  equipamentos: Array<Record<string, unknown>>;
  equipamento_aliases: Array<Record<string, unknown>>;
  precos_cd: Array<Record<string, unknown>>;
  kits_regras: Array<Record<string, unknown>>;
}

export function exportCatalogDump(db: Database): V3CatalogDump {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    cds: db.prepare('SELECT * FROM cds ORDER BY id').all() as Array<Record<string, unknown>>,
    equipamentos: db.prepare('SELECT * FROM equipamentos ORDER BY id').all() as Array<
      Record<string, unknown>
    >,
    equipamento_aliases: db
      .prepare('SELECT * FROM equipamento_aliases ORDER BY id')
      .all() as Array<Record<string, unknown>>,
    precos_cd: db.prepare('SELECT * FROM precos_cd ORDER BY id').all() as Array<
      Record<string, unknown>
    >,
    kits_regras: db.prepare('SELECT * FROM kits_regras ORDER BY chave').all() as Array<
      Record<string, unknown>
    >,
  };
}

export function importCatalogDump(db: Database, dump: V3CatalogDump) {
  if (!dump || dump.version !== 1) throw new Error('Dump V3 inválido');

  const tx = db.transaction(() => {
    db.exec(`
      DELETE FROM orcamento_base_itens;
      DELETE FROM orcamentos_base;
      DELETE FROM precos_cd_historico;
      DELETE FROM precos_cd;
      DELETE FROM equipamento_aliases;
      DELETE FROM equipamentos;
      DELETE FROM kits_regras;
      DELETE FROM cds;
    `);

    const insCd = db.prepare(
      `INSERT INTO cds (id, codigo, nome, slug_portal, ativo) VALUES (@id, @codigo, @nome, @slug_portal, @ativo)`
    );
    for (const row of dump.cds) insCd.run(row);

    const insEq = db.prepare(`
      INSERT INTO equipamentos (
        id, sku_interno, sku_soollar, nome, marca, categoria,
        potencia_w, potencia_kw, especificacao_json, ativo, prioridade_kit,
        created_at, updated_at
      ) VALUES (
        @id, @sku_interno, @sku_soollar, @nome, @marca, @categoria,
        @potencia_w, @potencia_kw, @especificacao_json, @ativo, @prioridade_kit,
        @created_at, @updated_at
      )
    `);
    for (const row of dump.equipamentos) {
      insEq.run({
        especificacao_json: '{}',
        ativo: 1,
        prioridade_kit: 100,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        sku_soollar: null,
        marca: null,
        potencia_w: null,
        potencia_kw: null,
        ...row,
      });
    }

    const insAlias = db.prepare(
      `INSERT INTO equipamento_aliases (id, equipamento_id, texto_match) VALUES (@id, @equipamento_id, @texto_match)`
    );
    for (const row of dump.equipamento_aliases) insAlias.run(row);

    const insPreco = db.prepare(`
      INSERT INTO precos_cd (
        id, equipamento_id, cd_id, preco_custo, estoque, capturado_em, fonte, valido_estoque
      ) VALUES (
        @id, @equipamento_id, @cd_id, @preco_custo, @estoque, @capturado_em, @fonte, @valido_estoque
      )
    `);
    for (const row of dump.precos_cd) {
      insPreco.run({
        capturado_em: null,
        fonte: 'supabase',
        valido_estoque: 0,
        estoque: null,
        preco_custo: null,
        ...row,
      });
    }

    const insRegra = db.prepare(
      `INSERT INTO kits_regras (chave, valor_json, descricao) VALUES (@chave, @valor_json, @descricao)`
    );
    for (const row of dump.kits_regras) {
      insRegra.run({ descricao: null, ...row });
    }
  });

  tx();
}

export function dumpStats(dump: V3CatalogDump) {
  return {
    cds: dump.cds.length,
    equipamentos: dump.equipamentos.length,
    aliases: dump.equipamento_aliases.length,
    precos: dump.precos_cd.length,
    regras: dump.kits_regras.length,
    exportedAt: dump.exportedAt,
  };
}
