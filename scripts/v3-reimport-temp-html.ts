/**
 * Reimporta dumps HTML úteis de temp/ → precos_cd (sem abrir Chromium).
 * Corrige Aeroporto/Matriz quando scrape só casou módulo/inversor.
 *
 *   npx tsx scripts/v3-reimport-temp-html.ts
 */
import { atualizarPrecosFromTemp } from '../src/modules/v3/precos/capturaJob';
import { getPrecosStats } from '../src/modules/v3/precos/repository';

async function main() {
  const { results, stats } = await atualizarPrecosFromTemp();
  for (const r of results) {
    console.log(JSON.stringify(r));
  }
  console.log('\nSTATS', JSON.stringify(stats, null, 2));
  console.log('porCd', getPrecosStats().porCd);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
