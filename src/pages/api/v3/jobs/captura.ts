import type { NextApiRequest, NextApiResponse } from 'next';
import {
  enqueueCapturaJob,
  listCapturaJobs,
} from '@/modules/v3/precos/capturaJobsQueue';
import { isServerlessFs } from '@/lib/serverlessFs';

/**
 * Fila remota de captura (Vercel → Supabase → worker no PC).
 * POST: enfileira scrape 3 CDs + publish
 * GET: lista últimos jobs
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      const jobs = await listCapturaJobs(Number(req.query.limit) || 12);
      return res.status(200).json({
        ok: true,
        serverless: isServerlessFs(),
        jobs,
        hint: 'Worker no PC: npm run v3:jobs:worker (poll Supabase + Postgres Tailscale)',
      });
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ message: 'Method not allowed' });
    }

    const requestedBy = String(req.body?.requestedBy || 'vercel-admin').slice(0, 80);
    const { created, job } = await enqueueCapturaJob({
      requestedBy,
      payload: {
        fonte: 'scrape',
        headless: true,
        publicar: true,
        singleSession: true,
        origin: isServerlessFs() ? 'vercel' : 'local',
      },
    });

    return res.status(created ? 201 : 200).json({
      ok: true,
      queued: true,
      created,
      job,
      serverless: isServerlessFs(),
      message: created
        ? 'Job enfileirado. O PC (CCA_TECNICA) vai rodar Scraping live (3 CDs) + Publicar no Supabase.'
        : 'Já havia job pending/running — não duplicou. Aguarde o worker local.',
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const missingTable =
      /pieng_captura_jobs|schema cache|does not exist|Could not find the table/i.test(msg);
    return res.status(missingTable ? 503 : 500).json({
      ok: false,
      message: missingTable
        ? 'Tabela pieng_captura_jobs ausente no Supabase. Execute sql/8_pieng_captura_jobs.sql no SQL Editor.'
        : msg,
      hint: missingTable ? 'sql/8_pieng_captura_jobs.sql' : undefined,
    });
  }
}
