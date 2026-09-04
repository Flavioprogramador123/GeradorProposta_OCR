-- =============================================================
-- PIENG PROPOSTAS — Adicionar coluna proposta_pausada
-- Executar no Supabase SQL Editor (https://app.supabase.com)
-- =============================================================

-- 1. Adicionar coluna à tabela clientes
ALTER TABLE clientes
  ADD COLUMN IF NOT EXISTS proposta_pausada boolean DEFAULT false;

-- 2. Comentário descritivo
COMMENT ON COLUMN clientes.proposta_pausada IS
  'Quando true, a proposta está suspensa (preço desatualizado). Botões de compartilhamento ficam ocultos no admin.';

-- 3. Verificar que a coluna foi criada
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'clientes'
  AND column_name = 'proposta_pausada';
