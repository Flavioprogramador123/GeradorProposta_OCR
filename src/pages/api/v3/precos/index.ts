import type { NextApiRequest, NextApiResponse } from 'next';
import { listPrecos, getPrecosStats } from '@/modules/v3/precos/repository';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' });
  try {
    const cdId = req.query.cdId ? Number(req.query.cdId) : undefined;
    const apenasValidos = req.query.validos === '1' || req.query.validos === 'true';
    const items = listPrecos({
      cdId: Number.isFinite(cdId) ? cdId : undefined,
      apenasValidos,
    });
    return res.status(200).json({ items, total: items.length, stats: getPrecosStats() });
  } catch (e) {
    return res.status(500).json({ message: e instanceof Error ? e.message : String(e) });
  }
}
