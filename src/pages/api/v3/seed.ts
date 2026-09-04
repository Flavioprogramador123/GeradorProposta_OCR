import type { NextApiRequest, NextApiResponse } from 'next';
import { seedEquipamentosFromYaml, getV3Stats } from '@/modules/v3';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  try {
    const result = seedEquipamentosFromYaml(
      typeof req.body?.yamlPath === 'string' ? req.body.yamlPath : undefined
    );
    const stats = getV3Stats();
    return res.status(200).json({ ok: result.errors.length === 0, ...result, stats });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      message: e instanceof Error ? e.message : String(e),
    });
  }
}
