/**
 * Diagnóstico pós-captura: match kW + SAJ + divergências
 */
import { matchCatalogItem } from '../src/modules/v3/precos/matcher';
import { getV3Db } from '../src/modules/v3/db/sqlite';
import { listDivergenciasPrecos, formatDivergenciasResumo } from '../src/modules/v3/precos/divergenciaPrecos';

console.log('=== MATCH kW (ponto decimal) ===');
const casos = [
  'INVERSOR SAJ 7.3KW-R5',
  'INVERSOR SAJ 7,3KW-R5',
  'INVERSOR SAJ 3KW-R5',
  'INVERSOR SAJ 15KW-R6',
  'INVERSOR SAJ 6KW-R5',
  'MICROINVERSOR DEYE 2KW',
];
for (const nome of casos) {
  const m = matchCatalogItem({ nome, preco: 1000, estoque: 50 });
  console.log(
    `${nome.padEnd(28)} → ${(m.skuInterno || '(sem match)').padEnd(22)} score=${m.score} ${m.reason}`
  );
}

const db = getV3Db();
console.log('\n=== Preços SAJ / potências críticas ===');
const rows = db
  .prepare(
    `SELECT e.sku_interno, e.potencia_kw, c.nome AS cd, p.preco_custo, p.estoque, p.valido_estoque,
            substr(IFNULL(p.fonte,''),1,48) AS fonte
     FROM precos_cd p
     JOIN equipamentos e ON e.id = p.equipamento_id
     JOIN cds c ON c.id = p.cd_id
     WHERE e.categoria IN ('inversor','microinversor')
       AND (
         upper(IFNULL(e.marca,'')) LIKE '%SAJ%'
         OR upper(e.nome) LIKE '%SAJ%'
         OR upper(e.sku_interno) LIKE '%SAJ%'
         OR e.potencia_kw IN (3, 6, 7.3, 15)
       )
     ORDER BY e.potencia_kw, e.sku_interno, c.codigo`
  )
  .all() as Array<Record<string, unknown>>;

for (const r of rows) {
  console.log(
    `${r.sku_interno} | kw=${r.potencia_kw} | ${r.cd} | R$${r.preco_custo} | est=${r.estoque} | ok=${r.valido_estoque} | ${r.fonte}`
  );
}

console.log('\n=== Divergências ===');
const divs = listDivergenciasPrecos();
console.log(divs.length ? formatDivergenciasResumo(divs) : 'Nenhuma divergência');
for (const d of divs) {
  console.log(JSON.stringify(d, null, 2));
}
