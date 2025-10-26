-- ============================================
-- CORRIGIR TIPOS DE COLUNAS NA TABELA PROPOSTAS
-- (Recriando a VIEW)
-- ============================================

-- 1. Dropar a view temporariamente
DROP VIEW IF EXISTS propostas_completas;

-- 2. Alterar os tipos das colunas
ALTER TABLE propostas
ALTER COLUMN geracao_mensal TYPE DECIMAL(12,2);

ALTER TABLE propostas
ALTER COLUMN geracao_anual TYPE DECIMAL(12,2);

-- 3. Recriar a view
CREATE OR REPLACE VIEW propostas_completas AS
SELECT
    p.*,
    c.nome as cliente_nome,
    c.cidade as cliente_cidade,
    c.consumo_mensal as cliente_consumo
FROM propostas p
LEFT JOIN clientes c ON p.cliente_id = c.id;

-- 4. Confirmar
SELECT 'Colunas alteradas e view recriada com sucesso!' as resultado;
