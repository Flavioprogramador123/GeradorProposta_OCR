-- ============================================
-- PIENG PROPOSTAS - Schema Supabase
-- ============================================
-- Execute este SQL no Supabase Dashboard
-- SQL Editor > New Query > Cole e Execute
-- ============================================

-- Criar extensão UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABELA: clientes
-- ============================================
CREATE TABLE IF NOT EXISTS clientes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    nome TEXT NOT NULL,
    email TEXT,
    telefone TEXT,
    cidade TEXT NOT NULL,
    estado TEXT NOT NULL DEFAULT 'GO',
    tipo_imovel TEXT NOT NULL DEFAULT 'residencial',
    consumo_mensal INTEGER,
    hsp_local DECIMAL(4,2) DEFAULT 5.21,
    pdespesa DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TABELA: propostas
-- ============================================
CREATE TABLE IF NOT EXISTS propostas (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
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

-- ============================================
-- TABELA: orcamentos
-- ============================================
CREATE TABLE IF NOT EXISTS orcamentos (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
    arquivo_nome TEXT NOT NULL,
    fornecedor TEXT,
    valor_total DECIMAL(12,2),
    data_orcamento DATE,
    componentes JSONB,
    dados_extraidos JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TABELA: configuracoes
-- ============================================
CREATE TABLE IF NOT EXISTS configuracoes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    chave TEXT UNIQUE NOT NULL,
    valor JSONB NOT NULL,
    descricao TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- ÍNDICES para performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_clientes_email ON clientes(email);
CREATE INDEX IF NOT EXISTS idx_clientes_cidade ON clientes(cidade, estado);
CREATE INDEX IF NOT EXISTS idx_propostas_cliente ON propostas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_propostas_slug ON propostas(slug);
CREATE INDEX IF NOT EXISTS idx_propostas_status ON propostas(status);
CREATE INDEX IF NOT EXISTS idx_orcamentos_cliente ON orcamentos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_orcamentos_data ON orcamentos(data_orcamento);

-- ============================================
-- FUNÇÃO para atualizar timestamp
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================
-- TRIGGERS para updated_at
-- ============================================
DROP TRIGGER IF EXISTS update_clientes_updated_at ON clientes;
CREATE TRIGGER update_clientes_updated_at
    BEFORE UPDATE ON clientes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_propostas_updated_at ON propostas;
CREATE TRIGGER update_propostas_updated_at
    BEFORE UPDATE ON propostas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_configuracoes_updated_at ON configuracoes;
CREATE TRIGGER update_configuracoes_updated_at
    BEFORE UPDATE ON configuracoes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- RLS (Row Level Security)
-- ============================================
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE propostas ENABLE ROW LEVEL SECURITY;
ALTER TABLE orcamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracoes ENABLE ROW LEVEL SECURITY;

-- Políticas permissivas (permitir tudo por enquanto)
-- TODO: Ajustar políticas conforme necessário
DROP POLICY IF EXISTS "Permitir leitura pública" ON clientes;
CREATE POLICY "Permitir leitura pública"
    ON clientes FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Permitir escrita pública" ON clientes;
CREATE POLICY "Permitir escrita pública"
    ON clientes FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir update pública" ON clientes;
CREATE POLICY "Permitir update pública"
    ON clientes FOR UPDATE
    USING (true);

DROP POLICY IF EXISTS "Permitir leitura propostas" ON propostas;
CREATE POLICY "Permitir leitura propostas"
    ON propostas FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Permitir escrita propostas" ON propostas;
CREATE POLICY "Permitir escrita propostas"
    ON propostas FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir update propostas" ON propostas;
CREATE POLICY "Permitir update propostas"
    ON propostas FOR UPDATE
    USING (true);

DROP POLICY IF EXISTS "Permitir leitura orcamentos" ON orcamentos;
CREATE POLICY "Permitir leitura orcamentos"
    ON orcamentos FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Permitir escrita orcamentos" ON orcamentos;
CREATE POLICY "Permitir escrita orcamentos"
    ON orcamentos FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir leitura configuracoes" ON configuracoes;
CREATE POLICY "Permitir leitura configuracoes"
    ON configuracoes FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Permitir escrita configuracoes" ON configuracoes;
CREATE POLICY "Permitir escrita configuracoes"
    ON configuracoes FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir update configuracoes" ON configuracoes;
CREATE POLICY "Permitir update configuracoes"
    ON configuracoes FOR UPDATE
    USING (true);

-- ============================================
-- DADOS INICIAIS - Configurações
-- ============================================
INSERT INTO configuracoes (chave, valor, descricao) VALUES
('descontoPix', '10.0', 'Desconto para pagamento PIX (%)')
ON CONFLICT (chave) DO NOTHING;

INSERT INTO configuracoes (chave, valor, descricao) VALUES
('fatorParcelado', '1.20', 'Fator de markup para parcelado')
ON CONFLICT (chave) DO NOTHING;

INSERT INTO configuracoes (chave, valor, descricao) VALUES
('fator12x', '0.88', 'Fator para cálculo de 12x')
ON CONFLICT (chave) DO NOTHING;

INSERT INTO configuracoes (chave, valor, descricao) VALUES
('fator18x', '0.83', 'Fator para cálculo de 18x')
ON CONFLICT (chave) DO NOTHING;

INSERT INTO configuracoes (chave, valor, descricao) VALUES
('performanceRate', '0.75', 'Taxa de performance do sistema solar')
ON CONFLICT (chave) DO NOTHING;

INSERT INTO configuracoes (chave, valor, descricao) VALUES
('hsp_goias', '5.21', 'HSP médio para Goiás')
ON CONFLICT (chave) DO NOTHING;

-- ============================================
-- VISUALIZAÇÕES úteis
-- ============================================
CREATE OR REPLACE VIEW propostas_completas AS
SELECT
    p.*,
    c.nome as cliente_nome,
    c.cidade as cliente_cidade,
    c.estado as cliente_estado,
    c.email as cliente_email,
    c.telefone as cliente_telefone
FROM propostas p
LEFT JOIN clientes c ON p.cliente_id = c.id
ORDER BY p.created_at DESC;

-- ============================================
-- CONCLUÍDO
-- ============================================
-- Schema criado com sucesso!
-- Próximos passos:
-- 1. Copie a URL e Anon Key do projeto Supabase
-- 2. Configure as variáveis de ambiente no Vercel
-- 3. Deploy da aplicação
