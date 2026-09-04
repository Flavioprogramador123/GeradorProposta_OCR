/* Testa fallback de preço cross-CD via API logic (better-sqlite3). */
const Database = require('better-sqlite3');
const db = new Database('data/v3/pieng_v3.sqlite');

function resolver(equipamentoId, cdPreferido) {
  const local = db
    .prepare(
      `SELECT p.preco_custo, p.estoque, p.valido_estoque, p.cd_id, c.nome AS cd_nome
       FROM precos_cd p JOIN cds c ON c.id=p.cd_id
       WHERE p.equipamento_id=? AND p.cd_id=?`
    )
    .get(equipamentoId, cdPreferido);
  if (local && local.preco_custo > 0 && local.valido_estoque === 1) {
    return { ...local, fallback: false };
  }
  const ordem = [1, 2, 3].filter((id) => id !== cdPreferido);
  const cands = db
    .prepare(
      `SELECT p.preco_custo, p.estoque, p.valido_estoque, p.cd_id, c.nome AS cd_nome
       FROM precos_cd p JOIN cds c ON c.id=p.cd_id
       WHERE p.equipamento_id=? AND p.cd_id!=? AND p.preco_custo>0
       ORDER BY p.valido_estoque DESC, IFNULL(p.estoque,0) DESC`
    )
    .all(equipamentoId, cdPreferido);
  cands.sort((a, b) => {
    const ia = ordem.indexOf(a.cd_id);
    const ib = ordem.indexOf(b.cd_id);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
  if (cands[0]) return { ...cands[0], fallback: true };
  return null;
}

const eqs = db
  .prepare(`SELECT id, sku_interno FROM equipamentos WHERE categoria IN ('estrutura','cabo','conector')`)
  .all();

for (const cdId of [1, 3]) {
  console.log('\n=== CD', cdId, '===');
  for (const e of eqs) {
    const r = resolver(e.id, cdId);
    console.log(
      e.sku_interno,
      r
        ? `R$ ${r.preco_custo} @ ${r.cd_nome}${r.fallback ? ' [FALLBACK]' : ''}`
        : 'SEM PREÇO'
    );
  }
}
