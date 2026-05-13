-- ============================================
-- PASSO 3: TESTAR CONFIGURAÇÕES
-- ============================================
-- Execute para verificar se tudo está OK
-- ============================================

-- Verificar se a tabela existe
SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'configuracoes'
) as tabela_existe;

-- Contar quantas configurações foram inseridas
SELECT COUNT(*) as total_configuracoes
FROM public.configuracoes;

-- Listar todas as configurações
SELECT
    chave,
    valor,
    descricao,
    created_at
FROM public.configuracoes
ORDER BY chave;

-- Testar busca de uma configuração específica
SELECT chave, valor
FROM public.configuracoes
WHERE chave = 'descontoPix';
