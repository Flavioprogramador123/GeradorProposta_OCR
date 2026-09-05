/**
 * Limpa preços/equipamentos inválidos no SQLite V3.
 * - Remove 670/680 RENEPV do Aeroporto (estoque real só em Feira)
 * - Desativa "módulos" falsos (bicicleta etc.)
 */
const Database = require('better-sqlite3');
const db = new Database('data/v3/pieng_v3.sqlite');

const aero = db.prepare(`SELECT id FROM cds WHERE nome = 'Aeroporto'`).get();
if (!aero) {
  console.error('CD Aeroporto não encontrado');
  process.exit(1);
}

const skusRemoverAero = ['MOD-AUTO-RENEPV-670', 'MOD-AUTO-RENEPV-680'];
const del = db.prepare(`
  DELETE FROM precos_cd
  WHERE cd_id = ?
    AND equipamento_id IN (SELECT id FROM equipamentos WHERE sku_interno = ?)
`);

let removed = 0;
for (const sku of skusRemoverAero) {
  const info = del.run(aero.id, sku);
  removed += info.changes;
  console.log(`Aeroporto: removido preço de ${sku} (${info.changes})`);
}

const fake = db
  .prepare(
    `
  UPDATE equipamentos
  SET ativo = 0, updated_at = datetime('now')
  WHERE categoria = 'modulo'
    AND (
      UPPER(nome) LIKE '%BICICLETA%'
      OR UPPER(nome) LIKE '%BLACK FISH%'
      OR UPPER(nome) LIKE '%KONNAN%'
      OR UPPER(nome) LIKE '%RIDE PRO%'
    )
`
  )
  .run();
console.log(`Desativados falsos módulos: ${fake.changes}`);

console.log(
  'Módulos Aeroporto restantes:',
  db
    .prepare(
      `
    SELECT e.sku_interno, e.potencia_w, e.nome, p.estoque
    FROM precos_cd p
    JOIN equipamentos e ON e.id = p.equipamento_id
    WHERE p.cd_id = ? AND e.categoria = 'modulo' AND e.ativo = 1
    ORDER BY e.potencia_w
  `
    )
    .all(aero.id)
);

db.close();
console.log('OK — removidos', removed, 'preços Aeroporto');
