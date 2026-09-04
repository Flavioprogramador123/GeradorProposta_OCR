/**
 * Scrape SOOLLAR com browser VISÍVEL + pausas (Playwright Inspector).
 *
 * Uso:
 *   npx tsx scripts/v3-scrape-debug-pausado.js
 *   npx tsx scripts/v3-scrape-debug-pausado.js Matriz
 *
 * Em cada pausa: clique Resume (▶) no Inspector para continuar.
 * Objetivo: ver login → CD → seções e comparar nomes ruins vs bons.
 */
require('dotenv').config();

const { capturarSoolarComBrowser, createConsoleLogger } = require('../src/lib/soollar/scraper.ts');
const { parseProductsFromHtml } = require('../src/modules/v3/precos/importCatalog.ts');

const cd = process.argv[2] || 'Aeroporto';

(async () => {
  console.log('\n=== DEBUG SCRAPE PAUSADO ===');
  console.log('CD:', cd);
  console.log('Browser Chromium vai abrir (não é o Simple Browser do Cursor).');
  console.log('Inspector do Playwright pausa em passos — use Resume (▶).\n');
  console.log('BUG ESPERADO (1ª passagem):');
  console.log('  Sem login real → cards com "Veja nosso preço" / 0 R$.');
  console.log('NOVO: se isso acontecer, o script PAUSA e faz 2ª tentativa de login.');
  console.log('  → você pode clicar no botão Login / Fazer Login na tela, depois Resume.\n');

  const log = createConsoleLogger((line) => {
    console.log(`[${line.level}]`, line.message);
  });

  const r = await capturarSoolarComBrowser(log, {
    headless: false,
    slowMo: 400,
    pauseSteps: true,
    cd,
  });

  console.log('\n=== RESULTADO BRUTO (produtosValidos do DOM live) ===');
  const domNomes = [];
  for (const it of r.items || []) {
    for (const v of it.produtosValidos || []) {
      domNomes.push(String(v.texto || '').slice(0, 100));
    }
  }
  console.log('qtd DOM:', domNomes.length);
  console.log(
    'amostra DOM (muitos começam com Adicionar):',
    domNomes.filter((n) => /Adicionar/i.test(n)).slice(0, 5)
  );
  console.log(
    'amostra DOM (sem Adicionar):',
    domNomes.filter((n) => !/Adicionar/i.test(n)).slice(0, 5)
  );

  console.log('\n=== MESMO HTML via parseProductsFromHtml (parser da Feira) ===');
  let htmlNomes = [];
  for (const it of r.items || []) {
    if (typeof it.html === 'string' && it.html.length > 1000) {
      const parsed = parseProductsFromHtml(it.html);
      htmlNomes = htmlNomes.concat(parsed.map((p) => `${p.nome} | ${p.preco} | est ${p.estoque}`));
    }
  }
  console.log('qtd HTML parser:', htmlNomes.length);
  console.log('amostra HTML:', htmlNomes.slice(0, 8));

  console.log('\n=== CONCLUSÃO ===');
  if (domNomes.some((n) => /Adicionar/i.test(n)) && htmlNomes.length > 0) {
    console.log('CD/login OK. Falha é no NOME do produto no extractDomSnapshot.js');
    console.log('Correção: reusar a lógica do parseProductsFromHtml (filtrar Adicionar + alt da imagem).');
  }

  process.exit(r.loggedIn ? 0 : 1);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
