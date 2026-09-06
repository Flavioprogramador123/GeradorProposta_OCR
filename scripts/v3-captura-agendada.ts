/**
 * Roda a captura V3 conforme data/v3/captura-agenda.json
 * (ou --force para ignorar dia/hora).
 * Após OK, publica no Supabase se agenda.publicarAposOk (padrão: sim).
 *
 *   npm run v3:captura
 *   npx tsx scripts/v3-captura-agendada.ts --force
 *
 * Use no Agendador de Tarefas do Windows (seg–sex no horário da agenda).
 */
import 'dotenv/config';
import {
  loadCapturaAgenda,
  saveCapturaAgenda,
} from '../src/modules/v3/precos/agendaCaptura';
import { atualizarPrecosV3 } from '../src/modules/v3/precos/capturaJob';
import { pushCatalogToSupabase } from '../src/modules/v3/db/sqlite';
import { listDivergenciasPrecos, formatDivergenciasResumo } from '../src/modules/v3/precos/divergenciaPrecos';

const force = process.argv.includes('--force');

async function main() {
  const agenda = loadCapturaAgenda();
  const now = new Date();
  const diaOk = agenda.dias.includes(now.getDay());
  const [hh, mm] = agenda.hora.split(':').map(Number);
  const minsNow = now.getHours() * 60 + now.getMinutes();
  const minsTarget = hh * 60 + mm;
  // Janela de ±20 min para o Task Scheduler não perder o slot
  const horaOk = Math.abs(minsNow - minsTarget) <= 20;

  console.log('[agenda]', {
    enabled: agenda.enabled,
    hora: agenda.hora,
    dias: agenda.dias,
    fonte: agenda.fonte,
    publicarAposOk: agenda.publicarAposOk,
    agora: now.toISOString(),
    diaOk,
    horaOk,
    force,
  });

  if (!force) {
    if (!agenda.enabled) {
      console.log('Agenda desligada — sai. Use --force ou ative em /admin/v3/precos');
      process.exit(0);
    }
    if (!diaOk || !horaOk) {
      console.log('Fora da janela dia/hora — sai (Task Scheduler deve disparar no horário).');
      process.exit(0);
    }
  }

  console.log(`▶ Captura fonte=${agenda.fonte} headless=${agenda.headless}`);
  try {
    const result = await atualizarPrecosV3({
      fonte: agenda.fonte,
      headless: agenda.headless,
      singleSession: true,
      onLog: (level, message) => console.log(`[${level}] ${message}`),
    });
    const lines = (result.results || []).map((r: Record<string, unknown>) => {
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

    let publishPart = '';
    if (agenda.publicarAposOk !== false) {
      console.log('▶ Publicando catálogo no Supabase…');
      try {
        const pub = await pushCatalogToSupabase('captura-agendada');
        publishPart = ` | publicado Supabase ${pub.stats?.equipamentos ?? '?'} eq / ${pub.stats?.precos ?? '?'} preços @ ${pub.updatedAt}`;
        console.log('✅', publishPart.trim().replace(/^\|\s*/, ''));
      } catch (pe) {
        const pmsg = pe instanceof Error ? pe.message : String(pe);
        publishPart = ` | FALHA publish: ${pmsg}`;
        console.error('❌ Publish falhou:', pmsg);
        saveCapturaAgenda({
          lastRunAt: new Date().toISOString(),
          lastRunOk: false,
          lastRunMsg: (msg + publishPart).slice(0, 500),
        });
        process.exit(1);
      }
    } else {
      console.log('Publish desligado (publicarAposOk=false) — só SQLite local.');
    }

    msg = (msg + publishPart).slice(0, 500);
    console.log(msg);
    saveCapturaAgenda({
      lastRunAt: new Date().toISOString(),
      lastRunOk: true,
      lastRunMsg: msg,
    });
    console.log('STATS', result.stats?.porCd);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('Falha', msg);
    saveCapturaAgenda({
      lastRunAt: new Date().toISOString(),
      lastRunOk: false,
      lastRunMsg: msg.slice(0, 500),
    });
    process.exit(1);
  }
}

main();
