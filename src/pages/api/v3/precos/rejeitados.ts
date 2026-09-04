import type { NextApiRequest, NextApiResponse } from 'next';
import { loadRejeitados, MOTIVO_LABEL } from '@/modules/v3/precos/rejeitadosCaptura';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' });
  try {
    const snap = loadRejeitados();
    if (!snap) {
      return res.status(200).json({
        ok: true,
        empty: true,
        message: 'Nenhuma captura com rejeitados ainda. Rode Importar temp/ ou Scraping live.',
        motivos: MOTIVO_LABEL,
      });
    }
    const motivo = typeof req.query.motivo === 'string' ? req.query.motivo : '';
    const cd = typeof req.query.cd === 'string' ? req.query.cd.toLowerCase() : '';
    let itens = snap.itens;
    if (motivo) itens = itens.filter((i) => i.motivo === motivo);
    if (cd) itens = itens.filter((i) => i.cd.toLowerCase().includes(cd));

    const porMotivo: Record<string, number> = {};
    for (const i of snap.itens) {
      porMotivo[i.motivo] = (porMotivo[i.motivo] || 0) + 1;
    }

    return res.status(200).json({
      ok: true,
      empty: false,
      ...snap,
      itens,
      filtrados: itens.length,
      porMotivo,
      motivos: MOTIVO_LABEL,
    });
  } catch (e) {
    return res.status(500).json({ message: e instanceof Error ? e.message : String(e) });
  }
}
