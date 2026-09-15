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
    // Vercel não roda Playwright — enfileira no Supabase; worker no PC faz scrape + publish
    try {
      const { enqueueCapturaJob } = await import('@/modules/v3/precos/capturaJobsQueue');
      const { created, job } = await enqueueCapturaJob({
        requestedBy: String(req.body?.requestedBy || 'vercel-scraping-live').slice(0, 80),
        payload: { fonte: 'scrape', headless: true, publicar: true, singleSession: true },
      });
      return res.status(created ? 202 : 200).json({
        ok: true,
        queued: true,
        created,
        job,
        serverless: true,
        message: created
          ? 'Enfileirado na Vercel. PC local (Postgres F: + Playwright) vai rodar Scraping live (CDs SOOLLAR + Fortlev) e Publicar no Supabase.'
          : 'Já havia captura pending/running no PC — aguarde concluir.',
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return res.status(503).json({
        ok: false,
        serverless: true,
        message: /pieng_captura_jobs|schema cache|does not exist/i.test(msg)
          ? 'Scraping remoto: execute sql/8_pieng_captura_jobs.sql no Supabase, depois tente de novo.'
          : `Scraping não roda na Vercel e a fila falhou: ${msg}`,
      });
    }
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
