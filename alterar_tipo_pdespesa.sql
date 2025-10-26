-- ============================================
-- ALTERAR TIPO DA COLUNA PDESPESA
-- ============================================

-- Mudar de DECIMAL(5,4) para DECIMAL(10,4)
-- Permite valores maiores como 15.0000 ou 100.0000
ALTER TABLE clientes
ALTER COLUMN pdespesa TYPE DECIMAL(10,4);

-- Confirmar
SELECT 'Coluna pdespesa alterada para DECIMAL(10,4)!' as resultado;
