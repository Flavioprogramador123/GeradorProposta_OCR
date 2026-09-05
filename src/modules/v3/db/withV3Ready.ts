import type { NextApiRequest, NextApiResponse } from 'next';
import { ensureV3CatalogHydrated } from '@/modules/v3/db/sqlite';

/** Hidrata catálogo do Supabase em serverless antes do handler. */
export async function withV3Ready(
  _req: NextApiRequest,
  _res: NextApiResponse,
  next: () => Promise<void> | void
) {
  await ensureV3CatalogHydrated();
  return next();
}
