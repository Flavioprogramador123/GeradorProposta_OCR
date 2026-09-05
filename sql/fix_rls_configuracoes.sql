-- ============================================
-- FIX RLS: configuracoes (permite upsert via ANON KEY)
-- ============================================
-- Erro típico no app:
--   new row violates row-level security policy for table "configuracoes"
--
-- Execute no Supabase Dashboard → SQL Editor (projeto ityeiqyjyhkmypjmnyhb)
-- ============================================

ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;

-- Remove políticas antigas conflitantes
DROP POLICY IF EXISTS "Permitir leitura e escrita de configuracoes" ON public.configuracoes;
DROP POLICY IF EXISTS "configuracoes_select" ON public.configuracoes;
DROP POLICY IF EXISTS "configuracoes_insert" ON public.configuracoes;
DROP POLICY IF EXISTS "configuracoes_update" ON public.configuracoes;
DROP POLICY IF EXISTS "configuracoes_all" ON public.configuracoes;

-- Leitura pública (app Next.js com anon key)
CREATE POLICY "configuracoes_select"
  ON public.configuracoes
  FOR SELECT
  USING (true);

-- Escrita pública (admin local / Vercel — ajuste depois se houver auth)
CREATE POLICY "configuracoes_insert"
  ON public.configuracoes
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "configuracoes_update"
  ON public.configuracoes
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Chaves usadas pelo Gerador / V3 (idempotente)
INSERT INTO public.configuracoes (chave, valor, descricao) VALUES
  ('pdespesaFixo', '2000'::jsonb, 'Despesa PIENG fixa (R$)'),
  ('pdespesaVariavel', '15'::jsonb, 'Despesa PIENG variável (%) sobre pcusto'),
  ('fretePadrao', '0'::jsonb, 'Frete padrão transportadora (R$) — editável por proposta'),
  ('estoqueMinimoSoolar', '20'::jsonb, 'Estoque mínimo módulos SOOLLAR'),
  ('estoqueMinimoOutros', '5'::jsonb, 'Estoque mínimo demais itens')
ON CONFLICT (chave) DO NOTHING;
