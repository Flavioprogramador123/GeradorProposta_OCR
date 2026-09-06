import type { NextApiRequest, NextApiResponse } from 'next';
import { atualizarPrecosV3, type CapturaFonte } from '@/modules/v3/precos/capturaJob';
import { isServerlessFs } from '@/lib/serverlessFs';

export const config = {
  api: {
    bodyParser: true,
    responseLimit: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  const fonte = (req.body?.fonte || 'temp') as CapturaFonte;
  if (isServerlessFs() && (fonte === 'scrape' || fonte === 'both')) {
    return res.status(503).json({
      ok: false,
      serverless: true,
      message:
        'Scraping SOOLLAR não roda na Vercel. Use fonte "temp" com dumps ou rode a captura no localhost.',
    });
  }

  const headless = req.body?.headless !== false;
  const cds = Array.isArray(req.body?.cds) ? req.body.cds.map(String) : undefined;
  const singleSession = req.body?.singleSession !== false;
  // Default: publicar após scrape OK (automação). false = só SQLite.
  const publicar = req.body?.publicar !== false;

  try {
    const result = await atualizarPrecosV3({ fonte, headless, cds, singleSession });
    const { listDivergenciasPrecos, formatDivergenciasResumo } = await import(
      '@/modules/v3/precos/divergenciaPrecos'
    );
    const divergencias = listDivergenciasPrecos();

    let publish: { ok: boolean; updatedAt?: string; stats?: unknown; error?: string } | null = null;
    if (publicar && (fonte === 'scrape' || fonte === 'both')) {
      try {
        const { pushCatalogToSupabase } = await import('@/modules/v3/db/sqlite');
        const pub = await pushCatalogToSupabase('captura-precos-ui');
        publish = { ok: true, updatedAt: pub.updatedAt, stats: pub.stats };
      } catch (pe) {
        publish = {
          ok: false,
          error: pe instanceof Error ? pe.message : String(pe),
        };
      }
    }

    return res.status(200).json({
      ok: true,
      ...result,
      divergencias,
      divergenciasResumo: formatDivergenciasResumo(divergencias),
      publish,
      publishMsg: publish?.ok
        ? `\n\n✅ Publicado no Supabase — ${
            (publish.stats as { equipamentos?: number; precos?: number } | undefined)?.equipamentos ?? '?'
          } equipamentos, ${
            (publish.stats as { equipamentos?: number; precos?: number } | undefined)?.precos ?? '?'
          } preços (${publish.updatedAt})`
        : publish && !publish.ok
          ? `\n\n❌ Captura OK, mas publish falhou: ${publish.error}`
          : '',
    });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      message: e instanceof Error ? e.message : String(e),
    });
  }
}
