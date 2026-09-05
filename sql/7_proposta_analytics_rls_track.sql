-- ============================================================
-- Analytics: permitir track público (anon) gravar visualizações
-- Sem isso, /api/propostas/[slug]/track retorna 500 (RLS 42501)
-- e o Admin nunca marca proposta como aberta.
-- ============================================================

ALTER TABLE public.proposta_analytics ENABLE ROW LEVEL SECURITY;

-- SELECT (se ainda não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'proposta_analytics'
      AND policyname = 'proposta_analytics_select_public'
  ) THEN
    CREATE POLICY proposta_analytics_select_public
      ON public.proposta_analytics
      FOR SELECT
      TO anon, authenticated
      USING (true);
  END IF;
END $$;

-- INSERT (track de abertura)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'proposta_analytics'
      AND policyname = 'proposta_analytics_insert_public'
  ) THEN
    CREATE POLICY proposta_analytics_insert_public
      ON public.proposta_analytics
      FOR INSERT
      TO anon, authenticated
      WITH CHECK (true);
  END IF;
END $$;

-- UPDATE (heartbeat / tempo / scroll)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'proposta_analytics'
      AND policyname = 'proposta_analytics_update_public'
  ) THEN
    CREATE POLICY proposta_analytics_update_public
      ON public.proposta_analytics
      FOR UPDATE
      TO anon, authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
