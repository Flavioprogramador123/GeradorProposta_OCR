import fs from 'fs';
import { parseProductsFromHtml, applyCatalogToCd } from '../src/modules/v3/precos/importCatalog';
import { matchMany } from '../src/modules/v3/precos/matcher';

const files: Array<[string, string, string]> = [
  ['Aeroporto estruturas dump', 'temp/soollar-estruturas-cdaeroportogo-2026-09-04T18-02-32-528Z.html', 'cdaeroportogo'],
  ['Matriz cabos', 'temp/_matrizcd_cdgoiania_secao_cabos.html', 'cdgoiania'],
  ['Matriz estruturas-inox', 'temp/_matrizcd_cdgoiania_secao_estruturas-inox.html', 'cdgoiania'],
  ['Matriz galva', 'temp/_matrizcd_cdgoiania_secao_estrutura-galvanizada.html', 'cdgoiania'],
];

for (const [label, file, cd] of files) {
  if (!fs.existsSync(file)) {
    console.log(label, 'MISSING');
    continue;
  }
  const html = fs.readFileSync(file, 'utf8');
  const items = parseProductsFromHtml(html);
  console.log('\n===', label, 'itens=', items.length);
  console.log(
    items.slice(0, 15).map((i) => ({
      nome: (i.nome || '').slice(0, 90),
      preco: i.preco,
      est: i.estoque,
    }))
  );
  const matches = matchMany(items);
  const ok = matches.filter((m) => m.equipamentoId);
  const bad = matches.filter((m) => !m.equipamentoId);
  console.log(
    'matched',
    ok.length,
    ok.map((m) => `${m.skuInterno}:${m.reason}`)
  );
  console.log(
    'unmatched sample',
    bad.slice(0, 10).map((m) => `${(m.item.nome || '').slice(0, 75)} | ${m.reason}`)
  );

  // dry: don't apply yet unless --apply
  if (process.argv.includes('--apply') && items.length) {
    const r = applyCatalogToCd(items, cd, `html-test:${file}`, { autoCadastrarModulos: false });
    console.log('APPLY', { matched: r.matched, validos: r.validos, unmatched: r.unmatched.length });
  }
}
