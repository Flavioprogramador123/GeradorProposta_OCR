import type { NextApiRequest, NextApiResponse } from 'next';
import {
  listPrecos,
  getPrecosStats,
  SECOES_PRECO_FILTRO,
} from '@/modules/v3/precos/repository';
import { refreshEstoqueMinimosFromAdmin } from '@/modules/v3/precos/estoqueMinimosConfig';
import { ensureV3CatalogHydrated } from '@/modules/v3';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' });
  try {
    await ensureV3CatalogHydrated();
    await refreshEstoqueMinimosFromAdmin();
    const cdId = req.query.cdId ? Number(req.query.cdId) : undefined;
    const apenasValidos = req.query.validos === '1' || req.query.validos === 'true';
    const apenasAtivos = !(req.query.ativos === '0' || req.query.ativos === 'false');
    const secao = typeof req.query.secao === 'string' ? req.query.secao : undefined;
    const items = listPrecos({
      cdId: Number.isFinite(cdId) ? cdId : undefined,
      apenasValidos,
      apenasAtivos,
      secao,
    });
    return res.status(200).json({
      items,
      total: items.length,
      stats: getPrecosStats(),
      secoes: SECOES_PRECO_FILTRO,
      filtro: { secao: secao || 'todas', apenasValidos, apenasAtivos },
    });
  } catch (e) {
    return res.status(500).json({ message: e instanceof Error ? e.message : String(e) });
  }
}
