const Database = require('better-sqlite3');
const db = new Database('data/v3/pieng_v3.sqlite');
console.log('tables', db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all());
try {
  console.log('cds', db.prepare('SELECT * FROM cds').all());
} catch (e) {
  console.log('cds err', e.message);
}
const rows = db
  .prepare(
    `SELECT e.sku_interno, e.categoria, e.nome, c.nome as cd, p.preco_custo, p.estoque, p.valido_estoque
     FROM equipamentos e
     LEFT JOIN precos_cd p ON p.equipamento_id = e.id
     LEFT JOIN cds c ON c.id = p.cd_id
     WHERE e.categoria IN ('estrutura','cabo','conector')
     ORDER BY e.categoria, e.sku_interno, c.id`
  )
  .all();
console.table(rows);
const unmatched = db
  .prepare(
    `SELECT COUNT(*) as n FROM precos_cd p
     JOIN equipamentos e ON e.id=p.equipamento_id
     WHERE e.categoria IN ('estrutura','cabo','conector') AND p.preco_custo IS NOT NULL AND p.preco_custo > 0`
  )
  .get();
console.log('com preco', unmatched);
