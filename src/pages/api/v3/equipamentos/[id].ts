import type { NextApiRequest, NextApiResponse } from 'next';
import { getEquipamento, softDeleteEquipamento, updateEquipamento } from '@/modules/v3';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const id = Number(req.query.id);
  if (!Number.isFinite(id) || id <= 0) {
    return res.status(400).json({ message: 'id inválido' });
  }

  try {
    if (req.method === 'GET') {
      const item = getEquipamento(id);
      if (!item) return res.status(404).json({ message: 'Não encontrado' });
      return res.status(200).json({ item });
    }

    if (req.method === 'PUT' || req.method === 'PATCH') {
      const item = updateEquipamento(id, req.body || {});
      if (!item) return res.status(404).json({ message: 'Não encontrado' });
      return res.status(200).json({ item });
    }

    if (req.method === 'DELETE') {
      const ok = softDeleteEquipamento(id);
      if (!ok) return res.status(404).json({ message: 'Não encontrado' });
      return res.status(200).json({ ok: true, desativado: id });
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const status = /UNIQUE/i.test(msg) ? 409 : 500;
    return res.status(status).json({ message: msg });
  }
}
