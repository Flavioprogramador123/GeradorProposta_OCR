/**
 * Captura Matriz (cdgoiania): estruturas-inox + cabos → SQLite V3
 *
 *   npx tsx scripts/v3-scrape-matriz-aux.ts
 *   npx tsx scripts/v3-scrape-matriz-aux.ts --headless
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import {
  capturarSoolarComBrowser,
  createConsoleLogger,
  SOOLLAR_BASE_URL,
} from '../src/lib/soollar/scraper';
import { extractItemsFromScrapePayload, persistScrapeHtmlDumps } from '../src/modules/v3/precos/capturaJob';
import { applyCatalogToCd } from '../src/modules/v3/precos/importCatalog';
import { getPrecosStats } from '../src/modules/v3/precos/repository';

const SECOES = ['estruturas-inox', 'cabos'] as const;
const headless = process.argv.includes('--headless');

async function main() {
  const log = createConsoleLogger((line) => {
    const d =
      line.data !== undefined
        ? ` ${typeof line.data === 'string' ? line.data : JSON.stringify(line.data).slice(0, 200)}`
        : '';
    console.log(`[${line.level}] ${line.message}${d}`);
  });

  log('info', `Matriz aux: ${SECOES.join(' + ')} · headless=${headless}`);

  // Uma sessão Matriz — scraper já varre todas as seções (inclui inox/cabos)
  const r = await capturarSoolarComBrowser(log, {
    headless,
    cd: 'Matriz',
    slowMo: headless ? 0 : 40,
  });

  if (!r.success) {
    console.error('Captura falhou', r);
    process.exit(1);
  }

  const bloco = r.porCd?.find((b) => /matriz|cdgoiania/i.test(b.cd + b.slug)) || {
    cd: 'Matriz',
    slug: 'cdgoiania',
    items: (r.items || []).filter((it) => it.cdSlug === 'cdgoiania' || it.cdNome === 'Matriz'),
  };

  // Filtra blocos de página das seções pedidas (se houver tag secao)
  const itemsFoco = (bloco.items || []).filter((it) => {
    const s = String(it.secao || it.source || '').toLowerCase();
    return SECOES.some((sec) => s.includes(sec)) || !s;
  });

  const dumps = persistScrapeHtmlDumps([
    { cd: 'Matriz', slug: 'cdgoiania', items: itemsFoco.length ? itemsFoco : bloco.items || [] },
  ]);
  log('ok', `HTML salvos: ${dumps.length}`);

  const catalog = extractItemsFromScrapePayload(itemsFoco.length ? itemsFoco : bloco.items || []);
  log('info', `Produtos parseados: ${catalog.length}`);
  console.log(
    catalog.slice(0, 20).map((c) => ({
      nome: (c.nome || '').slice(0, 70),
      preco: c.preco,
      est: c.estoque,
    }))
  );

  const applied = applyCatalogToCd(catalog, 'cdgoiania', 'scrape:cdgoiania:aux', {
    autoCadastrarModulos: true,
  });

  console.log('\n=== APPLY MATRIZ ===');
  console.log({
    matched: applied.matched,
    validos: applied.validos,
    autoCriados: applied.autoCriados,
    applied: applied.applied,
    unmatchedSample: applied.unmatched.slice(0, 10),
  });
  console.log('\nSTATS', JSON.stringify(getPrecosStats().porCd, null, 2));

  // URLs de referência
  for (const s of SECOES) {
    console.log(`ref: ${SOOLLAR_BASE_URL}/cd/cdgoiania/secao/${s}`);
  }

  // manifesto
  const meta = {
    when: new Date().toISOString(),
    urls: SECOES.map((s) => `${SOOLLAR_BASE_URL}/cd/cdgoiania/secao/${s}`),
    dumps: dumps.map((f) => path.basename(f)),
    matched: applied.matched,
    validos: applied.validos,
  };
  fs.writeFileSync(
    path.join(process.cwd(), 'temp', `matriz-aux-captura-${Date.now()}.json`),
    JSON.stringify(meta, null, 2)
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
