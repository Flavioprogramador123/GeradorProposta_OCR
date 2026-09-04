import type { NextApiRequest, NextApiResponse } from 'next';
import { getV3DbPath, getV3Stats, V3_ENABLED } from '@/modules/v3';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' });

  try {
    const stats = getV3Stats();
    return res.status(200).json({
      ok: true,
      v3Enabled: V3_ENABLED,
      dbPath: getV3DbPath(),
      ...stats,
      pipeline: [
        '1a cadastro equipamentos (SQLite)',
        '2a preços via scraping',
        '3a orçamento base',
        '4a proposta automática',
      ],
      note: 'Módulo isolado — não altera YAML/Gerador Rápido da produção',
    });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      message: e instanceof Error ? e.message : String(e),
      hint: 'Instale better-sqlite3: npm i better-sqlite3',
    });
  }
}
