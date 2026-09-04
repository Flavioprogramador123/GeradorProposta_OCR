/**
 * Re-captura Aeroporto (foco módulos) e aplica no V3 — debug de match.
 *
 *   npx tsx scripts/v3-scrape-aeroporto-modulos.ts
 *   npx tsx scripts/v3-scrape-aeroporto-modulos.ts --headless
 */
import 'dotenv/config';
import {
  capturarSoolarComBrowser,
  createConsoleLogger,
  SOOLLAR_BASE_URL,
} from '../src/lib/soollar/scraper';
import { extractItemsFromScrapePayload, persistScrapeHtmlDumps } from '../src/modules/v3/precos/capturaJob';
import { applyCatalogToCd } from '../src/modules/v3/precos/importCatalog';
import { matchMany } from '../src/modules/v3/precos/matcher';
import { getPrecosStats } from '../src/modules/v3/precos/repository';

const headless = process.argv.includes('--headless');

async function main() {
  const log = createConsoleLogger((line) => {
    console.log(`[${line.level}] ${line.message}`);
  });

  log('info', `Aeroporto módulos · ${SOOLLAR_BASE_URL}/cd/cdaeroportogo/secao/modulos`);

  const r = await capturarSoolarComBrowser(log, {
    headless,
    cd: 'Aeroporto',
    quoteUrl: `${SOOLLAR_BASE_URL}/cd/cdaeroportogo/secao/modulos`,
    slowMo: headless ? 0 : 40,
  });

  if (!r.success) {
    console.error('Falha', r);
    process.exit(1);
  }

  const bloco = r.porCd?.find((b) => b.slug === 'cdaeroportogo') || {
    cd: 'Aeroporto',
    slug: 'cdaeroportogo',
    items: r.items || [],
  };

  const dumps = persistScrapeHtmlDumps([bloco]);
  log('ok', `dumps HTML: ${dumps.length}`);

  const modsOnly = (bloco.items || []).filter((it) =>
    String(it.secao || '').toLowerCase().includes('modulo')
  );
  const catalogAll = extractItemsFromScrapePayload(bloco.items || []);
  const catalogMods = extractItemsFromScrapePayload(modsOnly.length ? modsOnly : bloco.items || []);

  console.log('\n=== MÓDULOS PARSEADOS ===', catalogMods.filter((c) => /modulo|n-type|w\b/i.test(c.nome)).length);
  const mods = catalogMods.filter((c) => /MODULO|N-TYPE|\d{3}W/i.test(c.nome));
  console.table(
    mods.map((c) => ({
      nome: (c.nome || '').slice(0, 64),
      preco: c.preco,
      est: c.estoque,
    }))
  );

  const matches = matchMany(mods);
  console.log('\n=== MATCH DEBUG ===');
  for (const m of matches) {
    console.log(
      `${(m.item.nome || '').slice(0, 55).padEnd(55)} | est=${String(m.item.estoque).padStart(5)} | ${
        m.skuInterno || '—'
      } | ${m.reason}`
    );
  }

  const applied = applyCatalogToCd(catalogAll, 'cdaeroportogo', 'scrape:cdaeroportogo', {
    autoCadastrarModulos: true,
  });

  console.log('\n=== APPLY ===', {
    itemsFound: catalogAll.length,
    matched: applied.matched,
    validos: applied.validos,
    autoCriados: applied.autoCriados,
    applied: applied.applied.filter((a) => a.sku.includes('MOD') || a.sku.includes('INV') || a.sku.includes('MICRO')),
    unmatchedMods: applied.unmatched.filter((u) => /MODULO|N-TYPE/i.test(u.nome)).slice(0, 15),
  });

  console.log('\nSTATS', getPrecosStats().porCd);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
