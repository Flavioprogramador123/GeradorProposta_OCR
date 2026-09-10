/**
 * Worker: lê pieng_jobs no Postgres Tailscale e dispara captura local.
 *
 *   npm run v3:jobs:worker          # loop (poll)
 *   npm run v3:jobs:worker -- --once
 *   npm run v3:jobs:worker -- --once --dry-run   # claim+done sem Playwright (teste)
 *   npm run v3:jobs:enqueue
 *
 * Env (opcional):
 *   PIENG_JOBS_DATABASE_URL=postgresql://pieng_saas:...@100.104.172.12:5432/pieng_saas
 */
import { spawn } from 'child_process';
import os from 'os';
import { Client } from 'pg';

const DEFAULT_URL =
  process.env.PIENG_JOBS_DATABASE_URL ||
  'postgresql://pieng_saas:pieng_saas_dev_only@100.104.172.12:5432/pieng_saas';

const POLL_MS = Number(process.env.PIENG_JOBS_POLL_MS || 15000);
const once = process.argv.includes('--once');
const dryRun = process.argv.includes('--dry-run');
const workerId = `${os.hostname()}-${process.pid}`;

type JobRow = {
  id: string;
  job_type: string;
  payload: Record<string, unknown> | null;
  status: string;
};

function client() {
  return new Client({ connectionString: DEFAULT_URL, connectionTimeoutMillis: 8000 });
}

async function claimNext(c: Client): Promise<JobRow | null> {
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
    return (rows[0] as JobRow) || null;
  } catch (e) {
    await c.query('ROLLBACK').catch(() => undefined);
    throw e;
  }
}

async function finish(c: Client, id: string, ok: boolean, message: string, result?: unknown) {
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

function runCapturaForce(): Promise<{ code: number; log: string }> {
  const root = process.cwd();
  const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  return new Promise((resolve) => {
    const child = spawn(npmCmd, ['run', 'v3:captura:force'], {
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

async function processOne(): Promise<boolean> {
  const c = client();
  await c.connect();
  try {
    const job = await claimNext(c);
    if (!job) {
      console.log(`[jobs] nenhum pending (${new Date().toISOString()})`);
      return false;
    }
    console.log(`[jobs] claim ${job.id} type=${job.job_type} dryRun=${dryRun}`);

    if (job.job_type !== 'soollar_scrape') {
      await finish(c, job.id, false, `job_type desconhecido: ${job.job_type}`);
      return true;
    }

    if (dryRun) {
      await finish(c, job.id, true, 'dry-run OK — Playwright não executado', {
        dryRun: true,
        workerId,
      });
      console.log('[jobs] dry-run done');
      return true;
    }

    const { code, log } = await runCapturaForce();
    const ok = code === 0;
    await finish(c, job.id, ok, ok ? 'Captura OK (publish conforme agenda/script)' : `exit ${code}`, {
      exitCode: code,
      workerId,
      tail: log.slice(-1500),
    });
    console.log(`[jobs] ${ok ? 'done' : 'error'} ${job.id}`);
    return true;
  } finally {
    await c.end().catch(() => undefined);
  }
}

async function enqueue() {
  const c = client();
  await c.connect();
  try {
    const existing = await c.query(
      `SELECT id, status FROM pieng_jobs WHERE status IN ('pending','running') ORDER BY created_at LIMIT 1`
    );
    if (existing.rows[0]) {
      console.log('[jobs] já há ativo:', existing.rows[0]);
      return;
    }
    const { rows } = await c.query(
      `INSERT INTO pieng_jobs (job_type, status, requested_by, payload, message)
       VALUES ('soollar_scrape', 'pending', $1, $2::jsonb, 'Enfileirado via CLI')
       RETURNING id, status, created_at`,
      [workerId, JSON.stringify({ fonte: 'scrape', headless: true, publicar: true })]
    );
    console.log('[jobs] enfileirado:', rows[0]);
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
  console.log(`[jobs] db=${DEFAULT_URL.replace(/:[^:@/]+@/, ':***@')}`);

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
