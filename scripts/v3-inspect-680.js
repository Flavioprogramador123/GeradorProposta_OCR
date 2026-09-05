const Database = require('better-sqlite3');
const db = new Database('data/v3/pieng_v3.sqlite');

const rows = db
  .prepare(`
    SELECT e.sku_interno, e.nome, e.potencia_w, c.nome as cd,
           p.preco_custo, p.estoque, p.fonte, p.valido_estoque, p.capturado_em
    FROM precos_cd p
    JOIN equipamentos e ON e.id = p.equipamento_id
    JOIN cds c ON c.id = p.cd_id
    WHERE e.categoria = 'modulo'
      AND (e.potencia_w BETWEEN 670 AND 690 OR e.nome LIKE '%680%')
    ORDER BY c.nome, e.potencia_w
  `)
  .all();

console.log('=== 670-690Wp / 680 ===');
console.log(JSON.stringify(rows, null, 2));

console.log('\n=== modulos por CD ===');
console.log(
  db
    .prepare(`
      SELECT c.nome, COUNT(*) n,
             GROUP_CONCAT(DISTINCT CAST(e.potencia_w AS INT)) potencias
      FROM precos_cd p
      JOIN equipamentos e ON e.id = p.equipamento_id
      JOIN cds c ON c.id = p.cd_id
      WHERE e.categoria = 'modulo' AND p.preco_custo IS NOT NULL
      GROUP BY c.nome
    `)
    .all()
);

console.log('\n=== todos modulos com preco Aeroporto ===');
console.log(
  db
    .prepare(`
      SELECT e.sku_interno, e.nome, e.potencia_w, p.preco_custo, p.estoque, p.fonte
      FROM precos_cd p
      JOIN equipamentos e ON e.id = p.equipamento_id
      JOIN cds c ON c.id = p.cd_id
      WHERE e.categoria = 'modulo' AND c.nome = 'Aeroporto'
      ORDER BY e.potencia_w
    `)
    .all()
);

console.log('\n=== counts gerais ===');
console.log({
  equip: db.prepare('SELECT COUNT(*) c FROM equipamentos').get(),
  precos: db.prepare('SELECT COUNT(*) c FROM precos_cd').get(),
  cds: db.prepare('SELECT * FROM cds').all(),
});
