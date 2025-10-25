-- ============================================
-- CRIAR APENAS TABELA PROPOSTAS (TESTE)
-- ============================================
-- Execute este SQL no Supabase SQL Editor
-- ============================================

-- 1. Criar extensão UUID (se não existir)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Apagar tabela propostas se existir (CUIDADO: apaga dados!)
DROP TABLE IF EXISTS propostas CASCADE;

-- 3. Criar tabela propostas do zero
CREATE TABLE propostas (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    cliente_id UUID,
    slug TEXT UNIQUE NOT NULL,
    titulo TEXT NOT NULL,
    template_usado TEXT NOT NULL DEFAULT 'pieng_basic',
    sistema_kwp DECIMAL(8,4),
    geracao_mensal INTEGER,
    geracao_anual INTEGER,
    valor_total DECIMAL(12,2),
    valor_kwp DECIMAL(10,2),
    payback INTEGER,
    tir DECIMAL(5,2),
    dados_completos JSONB,
    html_gerado TEXT,
    pdf_url TEXT,
    status TEXT DEFAULT 'ativa',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Criar índice no slug para buscas rápidas
CREATE INDEX idx_propostas_slug ON propostas(slug);

-- 5. Desabilitar RLS temporariamente (para testes)
ALTER TABLE propostas DISABLE ROW LEVEL SECURITY;

-- 6. Confirmar criação
SELECT 'Tabela propostas criada com sucesso!' as resultado;
