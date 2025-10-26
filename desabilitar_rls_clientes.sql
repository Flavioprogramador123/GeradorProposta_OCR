-- ============================================
-- DESABILITAR ROW LEVEL SECURITY EM CLIENTES
-- ============================================

-- Desabilitar RLS para permitir INSERT/UPDATE/DELETE
ALTER TABLE clientes DISABLE ROW LEVEL SECURITY;

-- Confirmar
SELECT 'RLS desabilitado na tabela clientes!' as resultado;
