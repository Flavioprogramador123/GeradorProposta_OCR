import { getV3Db } from '@/modules/v3/db/sqlite';
import { FORTLEV_CD_NOME, FORTLEV_CD_SLUG } from './types';

/** Garante CD Fortlev no SQLite V3 (id 4 se livre). */
export function ensureFortlevCd(): { id: number; slug: string; nome: string } {
  const db = getV3Db();
  const existing = db
    .prepare(
      `SELECT id, nome, slug_portal FROM cds
       WHERE lower(slug_portal) = ? OR lower(nome) = ?`
    )
    .get(FORTLEV_CD_SLUG, FORTLEV_CD_NOME.toLowerCase()) as
    | { id: number; nome: string; slug_portal: string }
    | undefined;
  if (existing) {
    return { id: existing.id, slug: existing.slug_portal, nome: existing.nome };
  }

  const maxRow = db.prepare('SELECT COALESCE(MAX(id), 0) AS m FROM cds').get() as { m: number };
  const id = Math.max(4, maxRow.m + 1);
  const codigo = id;
  db.prepare(
    `INSERT INTO cds (id, codigo, nome, slug_portal, ativo)
     VALUES (?, ?, ?, ?, 1)`
  ).run(id, codigo, FORTLEV_CD_NOME, FORTLEV_CD_SLUG);
  return { id, slug: FORTLEV_CD_SLUG, nome: FORTLEV_CD_NOME };
}
