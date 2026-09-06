import type { NextApiRequest, NextApiResponse } from 'next';
import {
  getEquipamento,
  softDeleteEquipamento,
  updateEquipamento,
  getPrecosDoEquipamento,
} from '@/modules/v3';
import { upsertPrecoCd } from '@/modules/v3/precos/repository';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const id = Number(req.query.id);
  if (!Number.isFinite(id) || id <= 0) {
    return res.status(400).json({ message: 'id inválido' });
  }

  try {
    if (req.method === 'GET') {
      const item = getEquipamento(id);
      if (!item) return res.status(404).json({ message: 'Não encontrado' });
      const precos = getPrecosDoEquipamento(id);
      return res.status(200).json({ item, precos });
    }

    if (req.method === 'PUT' || req.method === 'PATCH') {
      const body = req.body || {};
      const { precos, ...equipFields } = body;
      let item = getEquipamento(id);
      if (!item) return res.status(404).json({ message: 'Não encontrado' });

      if (Object.keys(equipFields).length > 0) {
        item = updateEquipamento(id, equipFields);
        if (!item) return res.status(404).json({ message: 'Não encontrado' });
      }

      if (Array.isArray(precos)) {
        for (const p of precos) {
          const cdId = Number(p.cdId ?? p.cd_id);
          if (!Number.isFinite(cdId)) continue;
          const precoRaw = p.preco_custo ?? p.precoCusto ?? p.preco;
          const preco =
            precoRaw === '' || precoRaw == null ? null : Number(precoRaw);
          const estRaw = p.estoque;
          const estoque =
            estRaw === '' || estRaw == null ? null : Number(estRaw);
          upsertPrecoCd({
            equipamentoId: id,
            cdId,
            precoCusto: preco != null && Number.isFinite(preco) ? preco : null,
            estoque: estoque != null && Number.isFinite(estoque) ? estoque : null,
            fonte: 'manual',
          });
        }
      }

      return res.status(200).json({
        item: getEquipamento(id),
        precos: getPrecosDoEquipamento(id),
      });
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
