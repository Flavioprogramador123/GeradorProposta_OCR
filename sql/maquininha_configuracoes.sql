-- ============================================
-- MAQUININHA: tabela Ton (tontaxa.json) + fallback PagSeguro
-- ============================================
-- Adiciona as chaves que o app usa para decidir a tabela de cartão:
--   adquirente          → 'ton' (tontaxa.json) | 'pagseguro' (taxa manual)
--   prazoRecebimento    → 'umDiaUtil' | 'naHora'
--   faixaFaturamento    → 0 = até R$20 mil … 3 = acima de R$80 mil
--   taxaMensalPagSeguro → taxa % a.m. da reserva (PagSeguro)
--
-- Execute no Supabase Dashboard → SQL Editor. Idempotente.
-- ============================================

INSERT INTO public.configuracoes (chave, valor, descricao) VALUES
  ('adquirente', '"ton"'::jsonb, 'Maquininha vigente: ton (tabela) ou pagseguro (taxa manual)'),
  ('prazoRecebimento', '"umDiaUtil"'::jsonb, 'Prazo de recebimento da Ton: umDiaUtil | naHora'),
  ('faixaFaturamento', '0'::jsonb, 'Faixa de faturamento mensal Ton: 0=até 20mil, 1=20-40mil, 2=40-80mil, 3=acima 80mil'),
  ('taxaMensalPagSeguro', '1.3'::jsonb, 'Taxa mensal PagSeguro (% a.m.) — reserva quando a Ton falha')
ON CONFLICT (chave) DO NOTHING;

-- Conferência
SELECT chave, valor
FROM public.configuracoes
WHERE chave IN ('adquirente', 'prazoRecebimento', 'faixaFaturamento', 'taxaMensalPagSeguro', 'taxaCartaoMensal')
ORDER BY chave;
