import type { NextApiRequest, NextApiResponse } from 'next';
import {
  createEquipamento,
  listEquipamentos,
  listCdsAtivos,
  CATEGORIAS,
  ensureV3CatalogHydrated,
} from '@/modules/v3';
import type { EquipamentoCategoria } from '@/modules/v3';
import { upsertPrecoCd } from '@/modules/v3/precos/repository';
import { getPrecosDoEquipamento, getPrecosResumoEquipamentos } from '@/modules/v3/equipamentos/repository';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await ensureV3CatalogHydrated();
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
      const cds = listCdsAtivos();
      const precosPorId = getPrecosResumoEquipamentos(items.map((i) => i.id));
      const itemsComPreco = items.map((it) => ({
        ...it,
        precos: precosPorId[it.id] || [],
      }));
      const { listDivergenciasPrecos } = await import('@/modules/v3/precos/divergenciaPrecos');
      const divergencias = listDivergenciasPrecos();
      const divById = new Map(divergencias.map((d) => [d.equipamento_id, d]));
      return res.status(200).json({
        items: itemsComPreco.map((it) => ({
          ...it,
          divergencia: divById.get(it.id) || null,
        })),
        total: itemsComPreco.length,
        categorias: CATEGORIAS,
        cds,
        divergencias,
      });
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
      if (Array.isArray(body.precos)) {
        for (const p of body.precos) {
          const cdId = Number(p.cdId ?? p.cd_id);
          if (!Number.isFinite(cdId)) continue;
          const precoRaw = p.preco_custo ?? p.precoCusto ?? p.preco;
          const preco = precoRaw === '' || precoRaw == null ? null : Number(precoRaw);
          const estRaw = p.estoque;
          const estoque = estRaw === '' || estRaw == null ? null : Number(estRaw);
          upsertPrecoCd({
            equipamentoId: item.id,
            cdId,
            precoCusto: preco != null && Number.isFinite(preco) ? preco : null,
            estoque: estoque != null && Number.isFinite(estoque) ? estoque : null,
            fonte: 'manual',
          });
        }
      }
      return res.status(201).json({
        item,
        precos: getPrecosDoEquipamento(item.id),
      });
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const status = /UNIQUE/i.test(msg) ? 409 : 500;
    return res.status(status).json({ message: msg });
  }
}
