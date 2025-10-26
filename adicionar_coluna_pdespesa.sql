-- ============================================
-- ADICIONAR COLUNA PDESPESA NA TABELA CLIENTES
-- ============================================

-- Adicionar coluna pdespesa (percentual de despesa fixa)
ALTER TABLE clientes
ADD COLUMN IF NOT EXISTS pdespesa DECIMAL(5,4);

-- Confirmar
SELECT 'Coluna pdespesa adicionada com sucesso!' as resultado;
