-- ============================================
-- V3 catálogo no Supabase (fonte para Vercel)
-- Execute no SQL Editor do projeto ityeiqyjyhkmypjmnyhb
-- ============================================

CREATE TABLE IF NOT EXISTS public.v3_catalog_snapshot (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source TEXT DEFAULT 'sqlite-local',
  note TEXT,
  dump JSONB NOT NULL
);

ALTER TABLE public.v3_catalog_snapshot ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "v3_catalog_select" ON public.v3_catalog_snapshot;
DROP POLICY IF EXISTS "v3_catalog_upsert" ON public.v3_catalog_snapshot;
DROP POLICY IF EXISTS "v3_catalog_update" ON public.v3_catalog_snapshot;

CREATE POLICY "v3_catalog_select"
  ON public.v3_catalog_snapshot FOR SELECT USING (true);

CREATE POLICY "v3_catalog_insert"
  ON public.v3_catalog_snapshot FOR INSERT WITH CHECK (true);

CREATE POLICY "v3_catalog_update"
  ON public.v3_catalog_snapshot FOR UPDATE USING (true) WITH CHECK (true);

COMMENT ON TABLE public.v3_catalog_snapshot IS
  'Snapshot do catálogo V3 (equipamentos/preços/CDs). Captura local → push; Vercel hidrata /tmp SQLite.';
