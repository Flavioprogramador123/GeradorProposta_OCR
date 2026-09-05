import type { NextApiRequest, NextApiResponse } from 'next';
import { getV3DbPath, getV3Stats, V3_ENABLED, ensureV3CatalogHydrated } from '@/modules/v3';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' });

  try {
    const hydrate = await ensureV3CatalogHydrated();
    const stats = getV3Stats();
    return res.status(200).json({
      ok: true,
      v3Enabled: V3_ENABLED,
      dbPath: getV3DbPath(),
      hydrate,
      ...stats,
      pipeline: [
        '1a cadastro equipamentos (SQLite local + snapshot Supabase)',
        '2a preços via scraping (localhost) → push Supabase',
        '3a orçamento base',
        '4a proposta automática',
      ],
      note: 'Captura SOOLLAR só no PC; Vercel lê v3_catalog_snapshot no Supabase',
    });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      message: e instanceof Error ? e.message : String(e),
      serverless: Boolean(process.env.VERCEL),
      hint: process.env.VERCEL
        ? 'Publique o catálogo: localhost POST /api/v3/catalog-sync (após sql/6_v3_catalog_snapshot.sql)'
        : 'Instale better-sqlite3: npm i better-sqlite3',
    });
  }
}
