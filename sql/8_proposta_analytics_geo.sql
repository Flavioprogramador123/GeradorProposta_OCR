-- ============================================================
-- Analytics: localização aproximada do visitante (IP / edge)
-- Para o master detectar se outro integrador abriu a proposta
-- ============================================================

ALTER TABLE public.proposta_analytics
  ADD COLUMN IF NOT EXISTS geo_cidade TEXT,
  ADD COLUMN IF NOT EXISTS geo_regiao TEXT,
  ADD COLUMN IF NOT EXISTS geo_pais TEXT,
  ADD COLUMN IF NOT EXISTS geo_isp TEXT,
  ADD COLUMN IF NOT EXISTS geo_fonte TEXT,
  ADD COLUMN IF NOT EXISTS geo_local TEXT;

COMMENT ON COLUMN public.proposta_analytics.geo_cidade IS 'Cidade aproximada via IP (edge/Vercel ou lookup)';
COMMENT ON COLUMN public.proposta_analytics.geo_regiao IS 'Estado/região aproximada';
COMMENT ON COLUMN public.proposta_analytics.geo_pais IS 'País (código ou nome curto)';
COMMENT ON COLUMN public.proposta_analytics.geo_isp IS 'Provedor/ISP aproximado (quando disponível)';
COMMENT ON COLUMN public.proposta_analytics.geo_fonte IS 'vercel | cloudflare | ip-api | unknown';
COMMENT ON COLUMN public.proposta_analytics.geo_local IS 'Rotulo pronto: Cidade, UF · BR';

CREATE INDEX IF NOT EXISTS idx_analytics_geo_cidade
  ON public.proposta_analytics (geo_cidade)
  WHERE geo_cidade IS NOT NULL;
