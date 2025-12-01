-- ============================================
-- PASSO 2: INSERIR CONFIGURAÇÕES PADRÃO
-- ============================================
-- Execute DEPOIS de criar a tabela (passo 1)
-- SQL Editor > New Query > Cole e Execute
-- ============================================

-- Inserir configurações iniciais do sistema
-- ⚠️ ATENÇÃO: Valores em formato JSON (string) para compatibilidade
INSERT INTO public.configuracoes (chave, valor, descricao) VALUES
-- 💰 Configurações de Preço e Pagamento
('descontoPix', '"10.0"'::jsonb, 'Desconto para pagamento via PIX (em %)'),
('fatorParcelado', '"1.20"'::jsonb, 'Fator de markup para pagamento parcelado'),
('fator12x', '"0.88"'::jsonb, 'Fator para cálculo de 12x (considera taxa de cartão)'),
('fator18x', '"0.83"'::jsonb, 'Fator para cálculo de 18x (considera taxa de cartão)'),

-- ⚡ Configurações Técnicas do Sistema Solar
('performanceRate', '"0.75"'::jsonb, 'Taxa de performance do sistema solar (75%)'),
('hspPadrao', '"5.21"'::jsonb, 'HSP (Horas de Sol Pleno) padrão para Goiânia'),
('margemSeguranca', '"1.1"'::jsonb, 'Margem de segurança para dimensionamento (10%)'),
('eficienciaInversor', '"0.95"'::jsonb, 'Eficiência do inversor (95%)'),

-- 📊 Configurações Financeiras
('taxaSelic', '"11.25"'::jsonb, 'Taxa SELIC atual (% ao ano)'),
('pdespesaFixo', '"2000.0"'::jsonb, 'Valor fixo de despesas operacionais (R$)'),
('pdespesaVariavel', '"15.0"'::jsonb, 'Percentual variável de despesas sobre custo (%)'),
('tarifaEnergia', '"0.85"'::jsonb, 'Tarifa de energia em R$/kWh'),

-- 🔧 Configurações do Projeto
('vidaUtilSistema', '"25"'::jsonb, 'Vida útil do sistema em anos'),
('degradacaoAnual', '"0.007"'::jsonb, 'Degradação anual dos painéis (0.7%)'),

-- 🏢 Dados da Empresa (usados nas propostas)
('empresaNome', '"PIENG Soluções Energéticas"'::jsonb, 'Nome da empresa'),
('empresaCNPJ', '"XX.XXX.XXX/0001-XX"'::jsonb, 'CNPJ da empresa'),
('empresaTelefone', '"(62) 99167-0536"'::jsonb, 'Telefone de contato'),
('empresaEmail', '"contato@piengsolucoes.com.br"'::jsonb, 'Email de contato'),
('empresaSite', '"www.piengsolucoes.com.br"'::jsonb, 'Site da empresa'),
('empresaWhatsApp', '"5562991670536"'::jsonb, 'WhatsApp (formato internacional)')

ON CONFLICT (chave) DO UPDATE SET
  valor = EXCLUDED.valor,
  descricao = EXCLUDED.descricao,
  updated_at = NOW();

-- Listar todas as configurações inseridas
SELECT chave, valor, descricao, created_at
FROM public.configuracoes
ORDER BY chave;
