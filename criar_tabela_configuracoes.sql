-- ============================================
-- CRIAR TABELA: configuracoes
-- ============================================
-- Execute este SQL no Supabase Dashboard
-- SQL Editor > New Query > Cole e Execute
-- ============================================

-- Criar tabela configuracoes se não existir
CREATE TABLE IF NOT EXISTS public.configuracoes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    chave TEXT UNIQUE NOT NULL,
    valor JSONB NOT NULL,
    descricao TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índice na chave para melhor performance
CREATE INDEX IF NOT EXISTS idx_configuracoes_chave ON public.configuracoes(chave);

-- Criar trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_configuracoes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_configuracoes_updated_at ON public.configuracoes;
CREATE TRIGGER update_configuracoes_updated_at
    BEFORE UPDATE ON public.configuracoes
    FOR EACH ROW
    EXECUTE FUNCTION update_configuracoes_updated_at();

-- Habilitar RLS (Row Level Security) se necessário
ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;

-- Criar política para permitir leitura e escrita (ajuste conforme necessário)
DROP POLICY IF EXISTS "Permitir leitura e escrita de configuracoes" ON public.configuracoes;
CREATE POLICY "Permitir leitura e escrita de configuracoes"
    ON public.configuracoes
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Verificar se a tabela foi criada
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'configuracoes'
ORDER BY ordinal_position;

