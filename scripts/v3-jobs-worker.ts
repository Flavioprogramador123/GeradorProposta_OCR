/**
 * Worker: lê fila (Supabase Vercel + Postgres Tailscale F:) e dispara captura local.
 *
 *   npm run v3:jobs:worker          # loop (poll)
 *   npm run v3:jobs:worker -- --once
 *   npm run v3:jobs:worker -- --once --dry-run
 *   npm run v3:jobs:enqueue
 *
 * job_type:
 *   soollar_scrape → npm run v3:captura:force    (3 CDs SOOLLAR + Fortlev + publish)
 *   fortlev_scrape → npm run v3:captura:fortlev  (Fortlev-only + publish)
 *
 * Env (opcional):
 *   PIENG_JOBS_DATABASE_URL=postgresql://pieng_saas:...@127.0.0.1:5432/pieng_saas
 *   NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY  (fila Vercel)
 */
import { spawn } from 'child_process';
import os from 'os';
import path from 'path';
import { config as loadEnv } from 'dotenv';
import { Client } from 'pg';

loadEnv({ path: path.join(process.cwd(), '.env') });
loadEnv({ path: path.join(process.cwd(), '.env.local'), override: true });

const DEFAULT_URL =
  process.env.PIENG_JOBS_DATABASE_URL ||
  'postgresql://pieng_saas:pieng_saas_dev_only@127.0.0.1:5432/pieng_saas';

const POLL_MS = Number(process.env.PIENG_JOBS_POLL_MS || 15000);
const once = process.argv.includes('--once');
const dryRun = process.argv.includes('--dry-run');
const workerId = `${os.hostname()}-${process.pid}`;

type JobRow = {
  id: string;
  job_type: string;
  payload: Record<string, unknown> | null;
  status: string;
  source: 'supabase' | 'postgres';
};

function client() {
  return new Client({ connectionString: DEFAULT_URL, connectionTimeoutMillis: 8000 });
}

async function claimNextPg(c: Client): Promise<JobRow | null> {
  const staleBefore = new Date(Date.now() - 45 * 60 * 1000).toISOString();
  await c.query('BEGIN');
  try {
    const { rows } = await c.query(
      `WITH next AS (
         SELECT id FROM pieng_jobs
         WHERE status = 'pending'
            OR (status = 'running' AND claimed_at < $2::timestamptz)
         ORDER BY created_at ASC
         LIMIT 1
         FOR UPDATE SKIP LOCKED
       )
       UPDATE pieng_jobs j SET
         status = 'running',
         worker_id = $1,
         claimed_at = NOW(),
         updated_at = NOW(),
         message = 'Worker local em execução…'
       FROM next WHERE j.id = next.id
       RETURNING j.id, j.job_type, j.payload, j.status`,
      [workerId, staleBefore]
    );
    await c.query('COMMIT');
    const row = rows[0] as Omit<JobRow, 'source'> | undefined;
    return row ? { ...row, source: 'postgres' } : null;
  } catch (e) {
    await c.query('ROLLBACK').catch(() => undefined);
    throw e;
  }
}

async function finishPg(c: Client, id: string, ok: boolean, message: string, result?: unknown) {
  await c.query(
    `UPDATE pieng_jobs SET
       status = $2,
       finished_at = NOW(),
       updated_at = NOW(),
       message = $3,
       result = $4::jsonb
     WHERE id = $1`,
    [id, ok ? 'done' : 'error', message.slice(0, 2000), JSON.stringify(result ?? null)]
  );
}

/** Falha do Supabase (rede/URL errada/sem env) nunca pode travar a fila local do Postgres. */
function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label}: timeout ${ms}ms`)), ms);
    p.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      }
    );
  });
}

const SUPABASE_TIMEOUT_MS = Number(process.env.PIENG_JOBS_SUPABASE_TIMEOUT_MS || 20000);

async function claimNextSupabase(): Promise<JobRow | null> {
  try {
    const { claimNextCapturaJob } = await import('../src/modules/v3/precos/capturaJobsQueue');
    const job = await withTimeout(
      claimNextCapturaJob(workerId),
      SUPABASE_TIMEOUT_MS,
      'supabase claim'
    );
    if (!job) return null;
    return {
      id: job.id,
      job_type: job.job_type,
      payload: job.payload,
      status: job.status,
      source: 'supabase',
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/pieng_captura_jobs|schema cache|does not exist|não configurado/i.test(msg)) {
      return null;
    }
    // Loga e segue para a fila local (antes: throw, e a fila Postgres nunca era lida)
    console.warn(`[jobs] fila Supabase indisponível, caindo para Postgres: ${msg}`);
    return null;
  }
}

async function finishSupabase(id: string, ok: boolean, message: string, result?: unknown) {
  try {
    const { finishCapturaJob } = await import('../src/modules/v3/precos/capturaJobsQueue');
    await withTimeout(
      finishCapturaJob(id, ok, message, result),
      SUPABASE_TIMEOUT_MS,
      'supabase finish'
    );
  } catch (e) {
    // Job fica 'running' no Supabase e é reclamado como stale depois (45 min)
    console.error(
      `[jobs] não consegui gravar status no Supabase: ${e instanceof Error ? e.message : e}`
    );
  }
}

/** job_type → script npm que roda a captura certa no PC. */
const CAPTURA_SCRIPTS: Record<string, string> = {
  soollar_scrape: 'v3:captura:force',
  fortlev_scrape: 'v3:captura:fortlev',
};

function runCaptura(npmScript: string): Promise<{ code: number; log: string }> {
  const root = process.cwd();
  const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  return new Promise((resolve) => {
    const child = spawn(npmCmd, ['run', npmScript], {
      cwd: root,
      env: process.env,
      shell: true,
    });
    let log = '';
    child.stdout?.on('data', (b) => {
      const s = String(b);
      log += s;
      process.stdout.write(s);
    });
    child.stderr?.on('data', (b) => {
      const s = String(b);
      log += s;
      process.stderr.write(s);
    });
    child.on('close', (code) => resolve({ code: code ?? 1, log: log.slice(-4000) }));
  });
}

async function runJob(job: JobRow): Promise<void> {
  console.log(`[jobs] claim ${job.id} source=${job.source} type=${job.job_type} dryRun=${dryRun}`);

  const finish = async (ok: boolean, message: string, result?: unknown) => {
    if (job.source === 'supabase') {
      await finishSupabase(job.id, ok, message, result);
    } else {
      const c = client();
      await c.connect();
      try {
        await finishPg(c, job.id, ok, message, result);
      } finally {
        await c.end().catch(() => undefined);
      }
    }
  };

  const npmScript = CAPTURA_SCRIPTS[job.job_type];
  if (!npmScript) {
    await finish(false, `job_type desconhecido: ${job.job_type}`);
    return;
  }

  if (dryRun) {
    await finish(true, 'dry-run OK — Playwright não executado', { dryRun: true, workerId });
    console.log('[jobs] dry-run done');
    return;
  }

  const { code, log } = await runCaptura(npmScript);
  const ok = code === 0;
  const label = job.job_type === 'fortlev_scrape' ? 'Captura Fortlev' : 'Captura SOOLLAR+Fortlev';
  await finish(ok, ok ? `${label} OK (+ publish)` : `exit ${code}`, {
    exitCode: code,
    workerId,
    tail: log.slice(-1500),
  });
  console.log(`[jobs] ${ok ? 'done' : 'error'} ${job.id}`);
}

async function processOne(): Promise<boolean> {
  // Prioridade: fila Vercel (Supabase), depois Tailscale/Postgres local (F:)
  const fromSb = await claimNextSupabase();
  if (fromSb) {
    await runJob(fromSb);
    return true;
  }

  const c = client();
  await c.connect();
  try {
    const job = await claimNextPg(c);
    if (!job) {
      console.log(`[jobs] nenhum pending (${new Date().toISOString()})`);
      return false;
    }
    await c.end().catch(() => undefined);
    await runJob(job);
    return true;
  } catch (e) {
    await c.end().catch(() => undefined);
    throw e;
  }
}

async function enqueue() {
  try {
    const { enqueueCapturaJob } = await import('../src/modules/v3/precos/capturaJobsQueue');
    const r = await enqueueCapturaJob({ requestedBy: `cli-${workerId}` });
    console.log('[jobs] supabase:', r.created ? 'enfileirado' : 'já ativo', r.job.id);
  } catch (e) {
    console.warn('[jobs] supabase enqueue:', e instanceof Error ? e.message : e);
  }

  const c = client();
  await c.connect();
  try {
    const existing = await c.query(
      `SELECT id, status FROM pieng_jobs WHERE status IN ('pending','running') ORDER BY created_at LIMIT 1`
    );
    if (existing.rows[0]) {
      console.log('[jobs] postgres já há ativo:', existing.rows[0]);
      return;
    }
    const { rows } = await c.query(
      `INSERT INTO pieng_jobs (job_type, status, requested_by, payload, message)
       VALUES ('soollar_scrape', 'pending', $1, $2::jsonb, 'Enfileirado via CLI')
       RETURNING id, status, created_at`,
      [workerId, JSON.stringify({ fonte: 'scrape', headless: true, publicar: true })]
    );
    console.log('[jobs] postgres enfileirado:', rows[0]);
  } finally {
    await c.end();
  }
}

async function main() {
  if (process.argv.includes('--enqueue')) {
    await enqueue();
    return;
  }

  console.log(`[jobs] worker=${workerId} once=${once} dryRun=${dryRun}`);
  console.log(`[jobs] postgres=${DEFAULT_URL.replace(/:[^:@/]+@/, ':***@')}`);
  console.log(
    `[jobs] supabase=${process.env.NEXT_PUBLIC_SUPABASE_URL ? 'on' : 'off'} (fila Vercel)`
  );

  if (once) {
    await processOne();
    return;
  }

  for (;;) {
    try {
      await processOne();
    } catch (e) {
      console.error('[jobs] erro', e instanceof Error ? e.message : e);
    }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
