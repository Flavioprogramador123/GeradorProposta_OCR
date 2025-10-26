-- ============================================
-- CORRIGIR TIPOS DE COLUNAS NA TABELA PROPOSTAS
-- ============================================

-- Mudar colunas que estão como INTEGER mas recebem valores DECIMAIS
ALTER TABLE propostas
ALTER COLUMN geracao_mensal TYPE DECIMAL(12,2);

ALTER TABLE propostas
ALTER COLUMN geracao_anual TYPE DECIMAL(12,2);

-- Confirmar
SELECT 'Colunas geracao_mensal e geracao_anual alteradas para DECIMAL!' as resultado;
