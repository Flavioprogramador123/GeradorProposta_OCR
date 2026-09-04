/**
 * Smoke scrape Aeroporto (+ opcional Matriz).
 * Uso: npx tsx scripts/v3-teste-scrape-aeroporto.js
 */
require('dotenv').config();

const { capturarSoolarComBrowser, createConsoleLogger } = require('../src/lib/soollar/scraper.ts');
const { applyCatalogToCd } = require('../src/modules/v3/precos/importCatalog.ts');
const { getPrecosStats } = require('../src/modules/v3/precos/repository.ts');

function extractItems(items) {
  const out = [];
  for (const it of items || []) {
    for (const v of it.produtosValidos || []) {
      const preco = v.preco
        ? Number(String(v.preco).replace(/R\$\s*/i, '').replace(/\./g, '').replace(',', '.')) || null
        : null;
      out.push({ nome: String(v.texto || '').slice(0, 160), preco, estoque: v.estoque ?? null });
    }
    if (typeof it.html === 'string') {
      const { parseProductsFromHtml } = require('../src/modules/v3/precos/importCatalog.ts');
      out.push(...parseProductsFromHtml(it.html));
    }
  }
  return out.filter((x) => x.nome);
}

async function runCd(nome) {
  console.log('\n======== SCRAPE', nome, '========');
  const logs = [];
  const log = createConsoleLogger((line) => {
    logs.push(line);
    const tag = `[${line.level}]`;
    console.log(tag, line.message);
  });

  const r = await capturarSoolarComBrowser(log, {
    headless: true,
    cd: nome,
  });

  const items = extractItems(r.items);
  console.log('\n--- RESUMO', nome, '---');
  console.log({
    success: r.success,
    loggedIn: r.loggedIn,
    cdSelecionado: r.cdSelecionado,
    itemsRaw: r.items?.length || 0,
    produtosExtraidos: items.length,
    amostra: items.slice(0, 8),
  });

  if (items.length) {
    const applied = applyCatalogToCd(items, nome, `scrape-teste:${nome}`);
    console.log('aplicado no SQLite:', applied);
  }

  const keyLogs = logs.filter((l) =>
    /cd-option|trigger|Abrindo seção|válidos|auth-token|Login|falhou|Captura conclu/i.test(l.message)
  );
  console.log(
    'logs-chave:',
    keyLogs.map((l) => `${l.level}:${l.message}`).slice(-25)
  );

  return { nome, r, items };
}

(async () => {
  const aero = await runCd('Aeroporto');
  // Matriz só se Aeroporto logou (credenciais ok)
  let matriz = null;
  if (aero.r.loggedIn) {
    matriz = await runCd('Matriz');
  }
  console.log('\n======== STATS V3 ========');
  console.log(getPrecosStats());
  console.log('\nDONE', {
    aeroProdutos: aero.items.length,
    matrizProdutos: matriz?.items?.length ?? null,
  });
  process.exit(aero.r.loggedIn ? 0 : 1);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
