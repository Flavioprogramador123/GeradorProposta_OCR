# 🗄️ PIENG-ENTERPRISE - CONFIGURAÇÃO SUPABASE
# Configuração completa do Supabase

Write-Host ""
Write-Host "🗄️ CONFIGURANDO SUPABASE" -ForegroundColor Blue
Write-Host "========================" -ForegroundColor Blue
Write-Host ""

# 1. INICIALIZAR SUPABASE
Write-Host "🔧 Inicializando Supabase..." -ForegroundColor Yellow
supabase init

# 2. CONFIGURAR PROJETO
Write-Host "🔧 Configurando projeto..." -ForegroundColor Yellow
supabase link --project-ref pieng-enterprise

# 3. CRIAR TABELAS
Write-Host "🗄️ Criando tabelas..." -ForegroundColor Yellow

# Criar schema.sql
@"
-- Tabela de usuários
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de módulos PIENG
CREATE TABLE pieng_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL,
    url VARCHAR(500),
    last_check TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de métricas do sistema
CREATE TABLE system_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cpu_usage DECIMAL(5,2),
    memory_usage DECIMAL(5,2),
    disk_usage DECIMAL(5,2),
    response_time INTEGER,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de propostas solares
CREATE TABLE solar_proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_name VARCHAR(255) NOT NULL,
    client_email VARCHAR(255),
    system_size DECIMAL(8,2),
    total_cost DECIMAL(12,2),
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de configurações
CREATE TABLE settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(255) UNIQUE NOT NULL,
    value TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir dados iniciais
INSERT INTO pieng_modules (name, status, url) VALUES
('Frontend Unificado', 'online', 'http://localhost:3000'),
('Solar Generator', 'online', 'http://localhost:3001'),
('Sistema de Gestão', 'online', 'http://localhost:3002'),
('Image Studio', 'online', 'http://localhost:3003'),
('Solar Analysis', 'online', 'http://localhost:3004'),
('Automação', 'online', 'http://localhost:3005'),
('GoTeste', 'online', 'http://localhost:5000');

INSERT INTO settings (key, value) VALUES
('system_name', 'PIENG-ENTERPRISE'),
('version', '1.0.0'),
('maintenance_mode', 'false'),
('max_users', '1000');
"@ | Out-File -FilePath "supabase/migrations/001_initial_schema.sql" -Encoding UTF8

# 4. CONFIGURAR RLS (Row Level Security)
Write-Host "🔐 Configurando RLS..." -ForegroundColor Yellow

@"
-- Habilitar RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE pieng_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE solar_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Políticas para users
CREATE POLICY "Users can view own data" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Políticas para pieng_modules (público para leitura)
CREATE POLICY "Anyone can view modules" ON pieng_modules
    FOR SELECT USING (true);

-- Políticas para system_metrics (público para leitura)
CREATE POLICY "Anyone can view metrics" ON system_metrics
    FOR SELECT USING (true);

-- Políticas para solar_proposals
CREATE POLICY "Users can view own proposals" ON solar_proposals
    FOR SELECT USING (auth.uid()::text = created_by);

CREATE POLICY "Users can create proposals" ON solar_proposals
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Políticas para settings (apenas admin)
CREATE POLICY "Admins can manage settings" ON settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );
"@ | Out-File -FilePath "supabase/migrations/002_rls_policies.sql" -Encoding UTF8

# 5. CONFIGURAR FUNÇÕES
Write-Host "🔧 Configurando funções..." -ForegroundColor Yellow

@"
-- Função para obter status do sistema
CREATE OR REPLACE FUNCTION get_system_status()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_modules', (SELECT COUNT(*) FROM pieng_modules),
        'online_modules', (SELECT COUNT(*) FROM pieng_modules WHERE status = 'online'),
        'offline_modules', (SELECT COUNT(*) FROM pieng_modules WHERE status = 'offline'),
        'error_modules', (SELECT COUNT(*) FROM pieng_modules WHERE status = 'error'),
        'last_update', (SELECT MAX(last_check) FROM pieng_modules)
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter métricas do sistema
CREATE OR REPLACE FUNCTION get_system_metrics()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'cpu_usage', (SELECT AVG(cpu_usage) FROM system_metrics WHERE timestamp > NOW() - INTERVAL '1 hour'),
        'memory_usage', (SELECT AVG(memory_usage) FROM system_metrics WHERE timestamp > NOW() - INTERVAL '1 hour'),
        'disk_usage', (SELECT AVG(disk_usage) FROM system_metrics WHERE timestamp > NOW() - INTERVAL '1 hour'),
        'response_time', (SELECT AVG(response_time) FROM system_metrics WHERE timestamp > NOW() - INTERVAL '1 hour')
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
"@ | Out-File -FilePath "supabase/migrations/003_functions.sql" -Encoding UTF8

# 6. CONFIGURAR STORAGE
Write-Host "📦 Configurando storage..." -ForegroundColor Yellow

@"
-- Criar bucket para imagens
INSERT INTO storage.buckets (id, name, public) VALUES
('pieng-images', 'pieng-images', true),
('pieng-documents', 'pieng-documents', false),
('pieng-backups', 'pieng-backups', false);

-- Políticas para storage
CREATE POLICY "Anyone can view images" ON storage.objects
    FOR SELECT USING (bucket_id = 'pieng-images');

CREATE POLICY "Authenticated users can upload images" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'pieng-images' AND auth.role() = 'authenticated');

CREATE POLICY "Users can manage own documents" ON storage.objects
    FOR ALL USING (bucket_id = 'pieng-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
"@ | Out-File -FilePath "supabase/migrations/004_storage.sql" -Encoding UTF8

# 7. APLICAR MIGRAÇÕES
Write-Host "🔄 Aplicando migrações..." -ForegroundColor Yellow
supabase db push

# 8. CONFIGURAR ENVIRONMENT VARIABLES
Write-Host "🔧 Configurando variáveis de ambiente..." -ForegroundColor Yellow

# Criar .env.local
@"
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Google Cloud
GOOGLE_CLOUD_PROJECT_ID=pieng-enterprise
GOOGLE_CLOUD_REGION=us-central1

# APIs
GEMINI_API_KEY=your_gemini_api_key
OPENAI_API_KEY=your_openai_api_key
OPENROUTER_API_KEY=your_openrouter_api_key
GOOGLE_DRIVE_CLIENT_ID=your_google_drive_client_id
GOOGLE_DRIVE_CLIENT_SECRET=your_google_drive_client_secret
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
"@ | Out-File -FilePath ".env.local" -Encoding UTF8

Write-Host ""
Write-Host "✅ SUPABASE CONFIGURADO!" -ForegroundColor Green
Write-Host ""
Write-Host "🔧 Próximos passos:" -ForegroundColor Purple
Write-Host "   1. Configurar variáveis de ambiente" -ForegroundColor White
Write-Host "   2. Testar conexão com database" -ForegroundColor White
Write-Host "   3. Configurar autenticação" -ForegroundColor White
Write-Host "   4. Testar APIs" -ForegroundColor White
Write-Host ""
Write-Host "🌐 URLs:" -ForegroundColor Cyan
Write-Host "   • Supabase Dashboard: https://supabase.com/dashboard" -ForegroundColor White
Write-Host "   • Database: your_supabase_url" -ForegroundColor White
Write-Host "   • Storage: your_supabase_url/storage" -ForegroundColor White
Write-Host ""


