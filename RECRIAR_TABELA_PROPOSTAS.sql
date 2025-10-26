-- ============================================
-- RECRIAR TABELA PROPOSTAS COM SCHEMA CORRETO
-- ============================================
-- Execute este SQL no Supabase SQL Editor
-- ============================================

-- ATENÇÃO: Isso vai APAGAR os 3 registros atuais!
-- Se quiser manter backup, não execute o DROP

-- 1. Apagar tabela propostas atual (com schema errado)
DROP TABLE IF EXISTS propostas CASCADE;

-- 2. Criar tabela propostas com schema CORRETO
CREATE TABLE propostas (
    -- IDs e Referencias
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,

    -- Identificação
    slug TEXT UNIQUE NOT NULL,
    titulo TEXT NOT NULL,
    template_usado TEXT NOT NULL DEFAULT 'pieng_basic',

    -- Dados do Sistema
    sistema_kwp DECIMAL(8,4),
    geracao_mensal INTEGER,
    geracao_anual INTEGER,
    valor_total DECIMAL(12,2),
    valor_kwp DECIMAL(10,2),

    -- Indicadores Financeiros
    payback INTEGER,
    tir DECIMAL(5,2),

    -- Dados Completos
    dados_completos JSONB,
    html_gerado TEXT,
    pdf_url TEXT,

    -- Status e Metadados
    status TEXT DEFAULT 'ativa',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Criar índices para performance
CREATE INDEX idx_propostas_slug ON propostas(slug);
CREATE INDEX idx_propostas_cliente_id ON propostas(cliente_id);
CREATE INDEX idx_propostas_status ON propostas(status);

-- 4. Criar trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_propostas_updated_at
    BEFORE UPDATE ON propostas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 5. Desabilitar RLS (Row Level Security) para permitir acesso público
ALTER TABLE propostas DISABLE ROW LEVEL SECURITY;

-- 6. Criar view para consultas completas (opcional, mas útil)
CREATE OR REPLACE VIEW propostas_completas AS
SELECT
    p.*,
    c.nome as cliente_nome,
    c.cidade as cliente_cidade,
    c.consumo_mensal as cliente_consumo
FROM propostas p
LEFT JOIN clientes c ON p.cliente_id = c.id;

-- 7. Confirmar criação
SELECT
    'Tabela propostas recriada com sucesso!' as resultado,
    'Colunas: id, cliente_id, slug, titulo, template_usado, sistema_kwp, geracao_mensal, geracao_anual, valor_total, valor_kwp, payback, tir, dados_completos, html_gerado, pdf_url, status, created_at, updated_at' as colunas_criadas;
