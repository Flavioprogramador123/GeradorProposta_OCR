const Database = require('better-sqlite3');
const db = new Database('data/v3/pieng_v3.sqlite');

const rows = db
  .prepare(
    `
  SELECT c.nome AS cd, e.potencia_w, e.nome, e.sku_interno, p.preco_custo, p.estoque, p.valido_estoque, e.ativo
  FROM precos_cd p
  JOIN equipamentos e ON e.id = p.equipamento_id
  JOIN cds c ON c.id = p.cd_id
  WHERE e.categoria = 'modulo'
  ORDER BY c.id, e.potencia_w, e.nome
`
  )
  .all();

const byCd = {};
for (const r of rows) {
  if (!byCd[r.cd]) byCd[r.cd] = [];
  byCd[r.cd].push(r);
}

for (const [cd, list] of Object.entries(byCd)) {
  console.log('\n========', cd, '========');
  for (const r of list) {
    const flag = r.ativo ? '' : ' [INATIVO]';
    const val = r.valido_estoque ? 'OK' : 'estoque-baixo';
    console.log(
      `${r.potencia_w}W | R$ ${r.preco_custo} | est ${r.estoque} | ${val}${flag} | ${r.nome.slice(0, 70)}`
    );
  }
}

console.log('\n--- check 680 ---');
console.log(
  db
    .prepare(
      `
  SELECT c.nome cd, e.nome, p.estoque, p.preco_custo
  FROM precos_cd p
  JOIN equipamentos e ON e.id=p.equipamento_id
  JOIN cds c ON c.id=p.cd_id
  WHERE e.potencia_w = 680 OR e.nome LIKE '%680%'
`
    )
    .all()
);
