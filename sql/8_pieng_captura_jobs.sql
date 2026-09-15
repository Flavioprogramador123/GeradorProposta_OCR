-- ============================================
-- Fila de captura SOOLLAR (Vercel → PC → Supabase catálogo)
-- Execute no SQL Editor do projeto Supabase
-- ============================================
-- Fluxo:
--   1) Botão na Vercel (Scraping live / Probe) → INSERT pending
--   2) Worker no PC (CCA_TECNICA) claim → npm run v3:captura:force
--   3) Script publica v3_catalog_snapshot → status done
-- ============================================

CREATE TABLE IF NOT EXISTS public.pieng_captura_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'done', 'error', 'cancelled')),
  job_type TEXT NOT NULL DEFAULT 'soollar_scrape',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  requested_by TEXT,
  worker_id TEXT,
  claimed_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  message TEXT,
  result JSONB
);

CREATE INDEX IF NOT EXISTS pieng_captura_jobs_pending_idx
  ON public.pieng_captura_jobs (status, created_at ASC)
  WHERE status IN ('pending', 'running');

CREATE INDEX IF NOT EXISTS pieng_captura_jobs_created_idx
  ON public.pieng_captura_jobs (created_at DESC);

ALTER TABLE public.pieng_captura_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pieng_captura_jobs_select" ON public.pieng_captura_jobs;
DROP POLICY IF EXISTS "pieng_captura_jobs_insert" ON public.pieng_captura_jobs;
DROP POLICY IF EXISTS "pieng_captura_jobs_update" ON public.pieng_captura_jobs;

CREATE POLICY "pieng_captura_jobs_select"
  ON public.pieng_captura_jobs FOR SELECT USING (true);

CREATE POLICY "pieng_captura_jobs_insert"
  ON public.pieng_captura_jobs FOR INSERT WITH CHECK (true);

CREATE POLICY "pieng_captura_jobs_update"
  ON public.pieng_captura_jobs FOR UPDATE USING (true) WITH CHECK (true);

COMMENT ON TABLE public.pieng_captura_jobs IS
  'Fila Vercel→PC: scrape Playwright local + publish catálogo. Postgres Tailscale (F:) continua no captura-dispatch.';
