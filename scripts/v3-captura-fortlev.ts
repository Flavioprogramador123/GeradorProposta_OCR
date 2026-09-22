/**
 * Captura Fortlev-only (Playwright) + publish no Supabase.
 * Usado pelo worker de jobs quando chega um job_type='fortlev_scrape'
 * (ex.: botão "Capturar produto-avulso" clicado na Vercel).
 *
 *   npm run v3:captura:fortlev
 */
import 'dotenv/config';
import { atualizarPrecosV3 } from '../src/modules/v3/precos/capturaJob';
import { pushCatalogToSupabase } from '../src/modules/v3/db/sqlite';
import {
  listDivergenciasPrecos,
  formatDivergenciasResumo,
} from '../src/modules/v3/precos/divergenciaPrecos';

async function main() {
  console.log('▶ Captura Fortlev-only (CD fortlev / produto-avulso + BOM 391003)');

  const result = await atualizarPrecosV3({
    fonte: 'scrape',
    cds: ['fortlev'],
    headless: true,
    singleSession: true,
    onLog: (level, message) => console.log(`[${level}] ${message}`),
  });

  const lines = ((result.results || []) as Array<Record<string, unknown>>).map((r) => {
    if (r.error) return `${r.fonte}/${r.cd || ''}: ERRO ${r.error}`;
    if (r.warning) return `${r.fonte}/${r.cd || ''}: ${r.warning}`;
    return `${r.fonte}/${r.cd || ''}: ${r.matched ?? 0} match · ${r.validos ?? 0} válidos`;
  });
  let msg = lines.join(' | ') || 'ok';

  const divs = listDivergenciasPrecos();
  if (divs.length) {
    console.warn(formatDivergenciasResumo(divs));
    msg += ` | ⚠ ${divs.length} divergência(s) preço entre CDs`;
  }

  console.log('▶ Publicando catálogo no Supabase…');
  const pub = await pushCatalogToSupabase('captura-fortlev');
  msg += ` | publicado Supabase ${pub.stats?.equipamentos ?? '?'} eq / ${
    pub.stats?.precos ?? '?'
  } preços @ ${pub.updatedAt}`;

  console.log(msg);
  console.log('STATS', result.stats?.porCd);
}

main().catch((e) => {
  console.error('Falha', e instanceof Error ? e.message : e);
  process.exit(1);
});
