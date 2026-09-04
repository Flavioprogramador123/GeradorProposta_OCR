/**
 * Reaplica o último dump HTML de módulos Aeroporto (sem Chromium).
 */
import fs from 'fs';
import path from 'path';
import { parseProductsFromHtml, applyCatalogToCd } from '../src/modules/v3/precos/importCatalog';
import { matchMany } from '../src/modules/v3/precos/matcher';
import { getPrecosStats } from '../src/modules/v3/precos/repository';

const dir = path.join(process.cwd(), 'temp');
const files = fs
  .readdirSync(dir)
  .filter((f) => /soollar-cdaeroportogo.*modulo/i.test(f) || /soollar-cdaeroportogo.*url/i.test(f))
  .map((f) => path.join(dir, f))
  .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);

const file =
  files[0] ||
  fs
    .readdirSync(dir)
    .filter((f) => /cdaeroportogo/i.test(f) && f.endsWith('.html'))
    .map((f) => path.join(dir, f))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0];

if (!file) {
  console.error('Nenhum HTML Aeroporto em temp/');
  process.exit(1);
}

console.log('Usando', path.basename(file));
const items = parseProductsFromHtml(fs.readFileSync(file, 'utf8'));
const mods = items.filter((i) => /MODULO|N-TYPE/i.test(i.nome || ''));
console.table(mods.map((m) => ({ nome: m.nome?.slice(0, 60), preco: m.preco, est: m.estoque })));

for (const m of matchMany(mods)) {
  console.log(
    `${(m.item.nome || '').slice(0, 55).padEnd(55)} → ${m.skuInterno || 'AUTO?'} | ${m.reason}`
  );
}

const r = applyCatalogToCd(items, 'cdaeroportogo', 'scrape:cdaeroportogo:modulos', {
  autoCadastrarModulos: true,
});
console.log({
  matched: r.matched,
  validos: r.validos,
  autoCriados: r.autoCriados,
  applied: r.applied,
});
console.log(getPrecosStats().porCd);
