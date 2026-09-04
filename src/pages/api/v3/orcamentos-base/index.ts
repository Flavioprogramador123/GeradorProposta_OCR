import type { NextApiRequest, NextApiResponse } from 'next';
import {
  createOrcamentoBase,
  listOrcamentosBase,
} from '@/modules/v3/orcamentos/repository';
import { calcularOrcamentoBase, listCatalogoComPreco } from '@/modules/v3/orcamentos/kitEngine';
import { resolveCdId } from '@/modules/v3/precos/repository';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      if (req.query.catalogo === '1') {
        const cdRaw = req.query.cd || req.query.cdId || '3';
        const cdId = resolveCdId(String(cdRaw));
        if (!cdId) return res.status(400).json({ message: 'CD inválido' });
        return res.status(200).json({ cdId, catalogo: listCatalogoComPreco(cdId) });
      }
      return res.status(200).json({ items: listOrcamentosBase() });
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      const cdId = resolveCdId(body.cdId ?? body.cd ?? 3);
      if (!cdId) return res.status(400).json({ message: 'CD inválido' });

      const itens = Array.isArray(body.itens) ? body.itens : [];
      if (!itens.length) return res.status(400).json({ message: 'itens[] obrigatório' });

      // Preview sem salvar
      if (body.preview === true) {
        const calc = calcularOrcamentoBase({
          cdId,
          itens,
          autoComplementos: body.autoComplementos !== false,
        });
        return res.status(200).json({ preview: true, calc });
      }

      const created = createOrcamentoBase({
        titulo: body.titulo || 'Orçamento base',
        cdId,
        cliente_nome: body.cliente_nome,
        notas: body.notas,
        itens,
        autoComplementos: body.autoComplementos !== false,
      });
      return res.status(201).json(created);
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ message: e instanceof Error ? e.message : String(e) });
  }
}
