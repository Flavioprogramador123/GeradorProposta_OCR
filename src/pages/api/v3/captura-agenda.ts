import type { NextApiRequest, NextApiResponse } from 'next';
import {
  loadCapturaAgenda,
  proximaExecucao,
  saveCapturaAgenda,
  DIAS_LABEL,
  type CapturaAgenda,
} from '@/modules/v3/precos/agendaCaptura';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const agenda = loadCapturaAgenda();
    const proxima = proximaExecucao(agenda);
    return res.status(200).json({
      agenda,
      proxima: proxima?.toISOString() || null,
      diasLabel: DIAS_LABEL,
      comoAgendar: {
        npm: 'npm run v3:captura',
        windows:
          'powershell -ExecutionPolicy Bypass -File scripts/v3-install-task-scheduler.ps1',
        nota: 'O scrape Playwright precisa rodar no PC (Chromium + .env). Vercel não executa browser estável.',
      },
    });
  }

  if (req.method === 'POST') {
    const body = (req.body || {}) as Partial<CapturaAgenda>;
    const agenda = saveCapturaAgenda({
      enabled: body.enabled,
      hora: body.hora,
      dias: body.dias,
      fonte: body.fonte,
      headless: body.headless,
      publicarAposOk: body.publicarAposOk,
    });
    const proxima = proximaExecucao(agenda);
    return res.status(200).json({ ok: true, agenda, proxima: proxima?.toISOString() || null });
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
