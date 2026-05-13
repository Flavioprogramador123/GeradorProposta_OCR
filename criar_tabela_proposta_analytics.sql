-- ============================================
-- TABELA: proposta_analytics
-- Rastreamento de visualizações e interações
-- ============================================

CREATE TABLE IF NOT EXISTS proposta_analytics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    proposta_slug TEXT NOT NULL,
    proposta_id UUID REFERENCES propostas(id) ON DELETE CASCADE,
    cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
    
    -- Dados da visualização
    ip_address TEXT,
    user_agent TEXT,
    referer TEXT,
    device_type TEXT, -- 'desktop', 'mobile', 'tablet'
    browser TEXT,
    os TEXT,
    
    -- Métricas de tempo
    primeira_visualizacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ultima_visualizacao TIMESTAMP WITH TIME ZONE,
    tempo_total_segundos INTEGER DEFAULT 0,
    tempo_na_pagina_segundos INTEGER DEFAULT 0,
    
    -- Interações
    visualizacoes_count INTEGER DEFAULT 1,
    scroll_percentage DECIMAL(5,2) DEFAULT 0, -- % da página visualizada
    cliques_count INTEGER DEFAULT 0,
    
    -- Detecção de compartilhamento
    ips_unicos TEXT[], -- Array de IPs únicos (indica compartilhamento)
    compartilhado BOOLEAN DEFAULT FALSE,
    
    -- Status e alertas
    status TEXT DEFAULT 'visualizada', -- 'visualizada', 'interessada', 'compartilhada', 'abandonada'
    precisa_contato BOOLEAN DEFAULT FALSE,
    alerta_contato TEXT, -- 'sem_visualizacao', 'tempo_sem_visualizar', 'compartilhado', 'muito_tempo_aberto'
    ultimo_alerta TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_analytics_proposta_slug ON proposta_analytics(proposta_slug);
CREATE INDEX IF NOT EXISTS idx_analytics_proposta_id ON proposta_analytics(proposta_id);
CREATE INDEX IF NOT EXISTS idx_analytics_cliente_id ON proposta_analytics(cliente_id);
CREATE INDEX IF NOT EXISTS idx_analytics_precisa_contato ON proposta_analytics(precisa_contato);
CREATE INDEX IF NOT EXISTS idx_analytics_ultima_visualizacao ON proposta_analytics(ultima_visualizacao);

-- Trigger para atualizar updated_at (se a função existir)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
        CREATE TRIGGER update_proposta_analytics_updated_at
            BEFORE UPDATE ON proposta_analytics
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Função para detectar se precisa contato
CREATE OR REPLACE FUNCTION verificar_precisa_contato()
RETURNS TRIGGER AS $func$
BEGIN
    IF NEW.ultima_visualizacao IS NULL OR 
       (NOW() - NEW.ultima_visualizacao) > INTERVAL '7 days' THEN
        NEW.precisa_contato = TRUE;
        NEW.alerta_contato = 'tempo_sem_visualizar';
    END IF;
    
    IF array_length(NEW.ips_unicos, 1) > 1 THEN
        NEW.compartilhado = TRUE;
        NEW.precisa_contato = TRUE;
        NEW.alerta_contato = 'compartilhado';
    END IF;
    
    IF NEW.tempo_total_segundos > 1800 THEN
        NEW.status = 'interessada';
        NEW.precisa_contato = TRUE;
        NEW.alerta_contato = 'muito_tempo_aberto';
    END IF;
    
    RETURN NEW;
END;
$func$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_verificar_contato
    BEFORE INSERT OR UPDATE ON proposta_analytics
    FOR EACH ROW
    EXECUTE FUNCTION verificar_precisa_contato();


