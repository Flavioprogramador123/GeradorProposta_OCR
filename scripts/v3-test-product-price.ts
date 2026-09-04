import fs from 'fs';
import { parseProductsFromHtml, parseProductsFromTestIds } from '../src/modules/v3/precos/importCatalog';

const f = 'temp/soollar-cdaeroportogo-url-informada-2026-09-04T19-05-21-350Z.html';
const html = fs.readFileSync(f, 'utf8');
const a = parseProductsFromTestIds(html);
console.log(
  'testIds',
  a.length,
  a.map((x) => ({ n: x.nome.slice(0, 55), p: x.preco, e: x.estoque, c: x.codigo }))
);
console.log('html via parseProductsFromHtml', parseProductsFromHtml(html).length);
