import type { NextApiRequest, NextApiResponse } from 'next';
import { createEquipamento, listEquipamentos, CATEGORIAS } from '@/modules/v3';
import type { EquipamentoCategoria } from '@/modules/v3';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      const categoria = typeof req.query.categoria === 'string' ? req.query.categoria : undefined;
      const q = typeof req.query.q === 'string' ? req.query.q : undefined;
      const ativo =
        req.query.ativo === '1' || req.query.ativo === 'true'
          ? true
          : req.query.ativo === '0' || req.query.ativo === 'false'
            ? false
            : undefined;

      const items = listEquipamentos({ categoria, q, ativo });
      return res.status(200).json({ items, total: items.length, categorias: CATEGORIAS });
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      if (!body.sku_interno || !body.nome || !body.categoria) {
        return res.status(400).json({ message: 'sku_interno, nome e categoria são obrigatórios' });
      }
      if (!CATEGORIAS.includes(body.categoria as EquipamentoCategoria)) {
        return res.status(400).json({ message: `categoria inválida. Use: ${CATEGORIAS.join(', ')}` });
      }
      const item = createEquipamento(body);
      return res.status(201).json({ item });
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const status = /UNIQUE/i.test(msg) ? 409 : 500;
    return res.status(status).json({ message: msg });
  }
}
