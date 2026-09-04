import { matchCatalogItem } from '../src/modules/v3/precos/matcher';
import { getV3Db } from '../src/modules/v3/db/sqlite';

const db = getV3Db();
console.log(
  db
    .prepare(
      `SELECT sku_interno, nome, potencia_w FROM equipamentos WHERE sku_interno LIKE '%RENEPV%' OR sku_interno LIKE '%625%'`
    )
    .all()
);

const nome = 'MODULO 625W RENEPV BIFACIAL 30MM - PREVISÃO 11/09';
const nItem = nome
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toUpperCase()
  .replace(/[^A-Z0-9]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();
console.log('nItem', nItem);
console.log('pot regex', nItem.match(/(\d{3,4})W/), nItem.match(/\b(\d{3,4})\s*W\b/));
console.log(matchCatalogItem({ nome, preco: 512.5, estoque: 259 }));
