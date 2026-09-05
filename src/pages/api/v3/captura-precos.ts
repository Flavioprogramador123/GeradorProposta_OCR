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

  try {
    const result = await atualizarPrecosV3({ fonte, headless, cds, singleSession });
    return res.status(200).json({ ok: true, ...result });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      message: e instanceof Error ? e.message : String(e),
    });
  }
}
