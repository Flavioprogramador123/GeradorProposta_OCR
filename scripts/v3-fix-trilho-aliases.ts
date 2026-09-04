import Database from 'better-sqlite3';
import path from 'path';

const db = new Database(path.join(process.cwd(), 'data/v3/pieng_v3.sqlite'));
const rows = db
  .prepare(
    `SELECT e.sku_interno, e.nome, a.texto_match
     FROM equipamentos e
     LEFT JOIN equipamento_aliases a ON a.equipamento_id = e.id
     WHERE e.sku_interno IN ('TRILHO-236','TRILHO-250','KIT-ESTRUTURA-4MOD','CABO-4MM-25-V','CABO-4MM-25-P','MC4-PAR')`
  )
  .all();
console.log(rows);

// remove aliases ruins
const bad = db
  .prepare(
    `DELETE FROM equipamento_aliases
     WHERE texto_match LIKE '%2,40%' OR texto_match LIKE '%2.40%' OR texto_match LIKE '%2 40%'`
  )
  .run();
console.log('deleted bad aliases', bad.changes);

const after = db
  .prepare(
    `SELECT e.sku_interno, a.texto_match FROM equipamentos e
     LEFT JOIN equipamento_aliases a ON a.equipamento_id=e.id
     WHERE e.sku_interno LIKE 'TRILHO%'`
  )
  .all();
console.log('trilho aliases after', after);
