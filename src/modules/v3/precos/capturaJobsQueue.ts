/**
 * Fila de captura Vercel → PC.
 * Preferência: tabela pieng_captura_jobs (sql/8_…).
 * Fallback: chave configuracoes.v3_captura_job (já existe no projeto).
 */
import { supabase } from '@/lib/supabase';

export type CapturaJobStatus = 'pending' | 'running' | 'done' | 'error' | 'cancelled';

export type CapturaJobRow = {
  id: string;
  status: CapturaJobStatus;
  job_type: string;
  payload: Record<string, unknown> | null;
  requested_by: string | null;
  worker_id: string | null;
  message: string | null;
  created_at: string;
  claimed_at: string | null;
  finished_at: string | null;
  result?: unknown;
  source?: 'table' | 'config';
};

const CONFIG_KEY = 'v3_captura_job';

function requireSb() {
  if (!supabase) throw new Error('Supabase não configurado (NEXT_PUBLIC_SUPABASE_*)');
  return supabase;
}

function isMissingTable(msg: string) {
  return /pieng_captura_jobs|schema cache|does not exist|Could not find the table/i.test(msg);
}

function parseConfigValor(raw: unknown): Record<string, unknown> | null {
  if (raw == null) return null;
  if (typeof raw === 'object') return raw as Record<string, unknown>;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
  return null;
}

function configToJob(obj: Record<string, unknown>): CapturaJobRow {
  return {
    id: String(obj.id || 'config-job'),
    status: (obj.status as CapturaJobStatus) || 'pending',
    job_type: String(obj.job_type || 'soollar_scrape'),
    payload: (obj.payload as Record<string, unknown>) || null,
    requested_by: obj.requested_by != null ? String(obj.requested_by) : null,
    worker_id: obj.worker_id != null ? String(obj.worker_id) : null,
    message: obj.message != null ? String(obj.message) : null,
    created_at: String(obj.created_at || new Date().toISOString()),
    claimed_at: obj.claimed_at != null ? String(obj.claimed_at) : null,
    finished_at: obj.finished_at != null ? String(obj.finished_at) : null,
    result: obj.result,
    source: 'config',
  };
}

async function readConfigJob(): Promise<CapturaJobRow | null> {
  const sb = requireSb();
  const { data, error } = await sb
    .from('configuracoes')
    .select('chave, valor')
    .eq('chave', CONFIG_KEY)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const obj = parseConfigValor(data.valor);
  if (!obj) return null;
  return configToJob(obj);
}

async function writeConfigJob(job: CapturaJobRow): Promise<void> {
  const sb = requireSb();
  const { error } = await sb.from('configuracoes').upsert(
    {
      chave: CONFIG_KEY,
      valor: JSON.stringify({ ...job, source: 'config' }),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'chave' }
  );
  if (error) throw new Error(error.message);
}

export async function listCapturaJobs(limit = 12): Promise<CapturaJobRow[]> {
  const sb = requireSb();
  const { data, error } = await sb
    .from('pieng_captura_jobs')
    .select(
      'id,status,job_type,payload,requested_by,worker_id,message,created_at,claimed_at,finished_at,result'
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  if (!error) {
    return ((data || []) as CapturaJobRow[]).map((j) => ({ ...j, source: 'table' }));
  }
  if (!isMissingTable(error.message)) throw new Error(error.message);

  const cfg = await readConfigJob();
  return cfg ? [cfg] : [];
}

/** Enfileira scrape+publish. Não duplica se já houver pending/running. */
export async function enqueueCapturaJob(opts?: {
  requestedBy?: string;
  payload?: Record<string, unknown>;
}): Promise<{ created: boolean; job: CapturaJobRow }> {
  const requestedBy = String(opts?.requestedBy || 'vercel-ui').slice(0, 80);
  const payload = {
    fonte: 'scrape',
    headless: true,
    publicar: true,
    singleSession: true,
    ...(opts?.payload || {}),
  };

  const sb = requireSb();
  const { data: existing, error: exErr } = await sb
    .from('pieng_captura_jobs')
    .select(
      'id,status,job_type,payload,requested_by,worker_id,message,created_at,claimed_at,finished_at'
    )
    .in('status', ['pending', 'running'])
    .order('created_at', { ascending: true })
    .limit(1);

  if (!exErr) {
    if (existing?.[0]) {
      return { created: false, job: { ...(existing[0] as CapturaJobRow), source: 'table' } };
    }
    const { data, error } = await sb
      .from('pieng_captura_jobs')
      .insert({
        job_type: 'soollar_scrape',
        status: 'pending',
        requested_by: requestedBy,
        payload,
        message: 'Enfileirado via Vercel — aguardando worker no PC (F:/Postgres + Playwright)',
      })
      .select(
        'id,status,job_type,payload,requested_by,worker_id,message,created_at,claimed_at,finished_at'
      )
      .single();
    if (error) throw new Error(error.message);
    return { created: true, job: { ...(data as CapturaJobRow), source: 'table' } };
  }

  if (!isMissingTable(exErr.message)) throw new Error(exErr.message);

  // Fallback: configuracoes.v3_captura_job
  const current = await readConfigJob();
  if (current && (current.status === 'pending' || current.status === 'running')) {
    return { created: false, job: current };
  }

  const job: CapturaJobRow = {
    id: `cfg-${Date.now()}`,
    status: 'pending',
    job_type: 'soollar_scrape',
    payload,
    requested_by: requestedBy,
    worker_id: null,
    message: 'Enfileirado via Vercel (configuracoes) — worker PC fará scrape + publish',
    created_at: new Date().toISOString(),
    claimed_at: null,
    finished_at: null,
    source: 'config',
  };
  await writeConfigJob(job);
  return { created: true, job };
}

async function tryClaimRow(
  id: string,
  workerId: string,
  allowed: CapturaJobStatus[]
): Promise<CapturaJobRow | null> {
  const sb = requireSb();
  const { data, error } = await sb
    .from('pieng_captura_jobs')
    .update({
      status: 'running',
      worker_id: workerId,
      claimed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      message: 'Worker local em execução (scrape SOOLLAR+Fortlev + publish)…',
    })
    .eq('id', id)
    .in('status', allowed)
    .select(
      'id,status,job_type,payload,requested_by,worker_id,message,created_at,claimed_at,finished_at'
    )
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? { ...(data as CapturaJobRow), source: 'table' } : null;
}

export async function claimNextCapturaJob(workerId: string): Promise<CapturaJobRow | null> {
  const sb = requireSb();

  const { data: pending, error } = await sb
    .from('pieng_captura_jobs')
    .select('id')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(3);

  if (!error) {
    for (const row of pending || []) {
      const claimed = await tryClaimRow(row.id, workerId, ['pending']);
      if (claimed) return claimed;
    }
    const staleBefore = new Date(Date.now() - 45 * 60 * 1000).toISOString();
    const { data: stale, error: stErr } = await sb
      .from('pieng_captura_jobs')
      .select('id')
      .eq('status', 'running')
      .lt('claimed_at', staleBefore)
      .order('created_at', { ascending: true })
      .limit(2);
    if (stErr) throw new Error(stErr.message);
    for (const row of stale || []) {
      const claimed = await tryClaimRow(row.id, workerId, ['running']);
      if (claimed) return claimed;
    }
    return null;
  }

  if (!isMissingTable(error.message)) throw new Error(error.message);

  const cfg = await readConfigJob();
  if (!cfg) return null;
  if (cfg.status !== 'pending') {
    if (
      cfg.status === 'running' &&
      cfg.claimed_at &&
      Date.now() - new Date(cfg.claimed_at).getTime() > 45 * 60 * 1000
    ) {
      // stale — reclaim
    } else {
      return null;
    }
  }

  const claimed: CapturaJobRow = {
    ...cfg,
    status: 'running',
    worker_id: workerId,
    claimed_at: new Date().toISOString(),
    message: 'Worker local em execução (scrape SOOLLAR+Fortlev + publish)…',
    source: 'config',
  };
  await writeConfigJob(claimed);
  return claimed;
}

export async function finishCapturaJob(
  id: string,
  ok: boolean,
  message: string,
  result?: unknown
): Promise<void> {
  const sb = requireSb();
  const finished = {
    status: (ok ? 'done' : 'error') as CapturaJobStatus,
    finished_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    message: message.slice(0, 2000),
    result: result ?? null,
  };

  const { error } = await sb.from('pieng_captura_jobs').update(finished).eq('id', id);
  if (!error) return;
  if (!isMissingTable(error.message)) throw new Error(error.message);

  const cfg = await readConfigJob();
  if (!cfg || cfg.id !== id) {
    // ainda grava status final na chave
    await writeConfigJob({
      id,
      status: finished.status,
      job_type: 'soollar_scrape',
      payload: null,
      requested_by: null,
      worker_id: null,
      message: finished.message,
      created_at: new Date().toISOString(),
      claimed_at: null,
      finished_at: finished.finished_at,
      result: finished.result,
      source: 'config',
    });
    return;
  }
  await writeConfigJob({
    ...cfg,
    status: finished.status,
    message: finished.message,
    finished_at: finished.finished_at,
    result: finished.result,
  });
}
