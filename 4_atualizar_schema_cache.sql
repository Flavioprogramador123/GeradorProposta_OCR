-- ============================================
-- PASSO 4: ATUALIZAR SCHEMA CACHE DO SUPABASE
-- ============================================
-- Execute para forçar o Supabase a reconhecer a tabela
-- ============================================

-- Forçar atualização do cache fazendo uma query simples
SELECT 1 as cache_refresh;

-- Verificar se a API consegue ver a tabela
SELECT
    schemaname,
    tablename,
    tableowner
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'configuracoes';

-- Verificar permissões RLS
SELECT
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'configuracoes';

-- Listar todas as configurações para confirmar
SELECT chave, valor, descricao
FROM public.configuracoes
ORDER BY chave;
