import type { NextApiRequest, NextApiResponse } from 'next';
import { deleteOrcamentoBase, getOrcamentoBase } from '@/modules/v3/orcamentos/repository';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const id = Number(req.query.id);
  if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ message: 'id inválido' });

  try {
    if (req.method === 'GET') {
      const item = getOrcamentoBase(id);
      if (!item) return res.status(404).json({ message: 'Não encontrado' });
      return res.status(200).json({ item });
    }
    if (req.method === 'DELETE') {
      const ok = deleteOrcamentoBase(id);
      if (!ok) return res.status(404).json({ message: 'Não encontrado' });
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ message: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ message: e instanceof Error ? e.message : String(e) });
  }
}
