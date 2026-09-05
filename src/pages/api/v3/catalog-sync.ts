import type { NextApiRequest, NextApiResponse } from 'next';
import {
  ensureV3CatalogHydrated,
  pushCatalogToSupabase,
  buildLocalCatalogDump,
  V3_ENABLED,
} from '@/modules/v3/db/sqlite';
import { dumpStats } from '@/modules/v3/db/catalogSnapshot';
import { isServerlessFs } from '@/lib/serverlessFs';
import { getV3Stats } from '@/modules/v3';

/**
 * GET  — status do snapshot / hidratação
 * POST — push do SQLite local → Supabase (só localhost)
 * PUT  — força rehydrate do Supabase → /tmp (serverless/dev)
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!V3_ENABLED) return res.status(503).json({ ok: false, message: 'V3 desabilitado' });

  try {
    if (req.method === 'GET') {
      const hydrate = await ensureV3CatalogHydrated();
      let stats = null;
      try {
        stats = getV3Stats();
      } catch (e) {
        stats = { error: e instanceof Error ? e.message : String(e) };
      }
      return res.status(200).json({
        ok: true,
        serverless: isServerlessFs(),
        hydrate,
        stats,
        hint: isServerlessFs()
          ? 'Em produção o catálogo vem do Supabase (v3_catalog_snapshot). Push pelo localhost.'
          : 'POST neste endpoint no localhost para publicar o SQLite no Supabase.',
      });
    }

    if (req.method === 'POST') {
      if (isServerlessFs()) {
        return res.status(503).json({
          ok: false,
          message: 'Push do catálogo só no localhost (após captura SOOLLAR).',
          serverless: true,
        });
      }
      const note = typeof req.body?.note === 'string' ? req.body.note : undefined;
      const result = await pushCatalogToSupabase(note);
      return res.status(200).json({
        ok: true,
        message: 'Catálogo publicado no Supabase',
        ...result,
      });
    }

    if (req.method === 'PUT') {
      const hydrate = await ensureV3CatalogHydrated({ force: true });
      return res.status(200).json({ ok: true, hydrate, preview: dumpStats(buildLocalCatalogDump()) });
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      message: e instanceof Error ? e.message : String(e),
      hint:
        'Crie a tabela com sql/6_v3_catalog_snapshot.sql no Supabase SQL Editor se ainda não existir.',
    });
  }
}
