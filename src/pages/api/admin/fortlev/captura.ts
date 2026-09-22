import type { NextApiRequest, NextApiResponse } from 'next';
import {
  capturarFortlevComBrowser,
  createFortlevLogger,
  getFortlevCredentials,
  FORTLEV_CD_SLUG,
  FORTLEV_PRODUTO_AVULSO_URL,
  probeFortlevLoginPage,
  type FortlevLogLine,
} from '@/lib/fortlev/scraper';
import { ensureFortlevCd } from '@/lib/fortlev/ensureCd';
import { isServerlessFs } from '@/lib/serverlessFs';
import { applyCatalogToCd } from '@/modules/v3/precos/importCatalog';
import { getPrecosStats } from '@/modules/v3/precos/repository';
import type { CatalogItem } from '@/modules/v3/precos/matcher';

export const config = {
  api: {
    bodyParser: true,
    responseLimit: false,
  },
};

function writeSse(res: NextApiResponse, payload: unknown) {
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

/** Estoque não vem nos cards HTMX — assume disponível para marcar preço válido. */
const ESTOQUE_ASSUMIDO = 999;

function toCatalogItems(
  items: Array<{ codigo: string; nome: string; preco: number; estoque: number | null }>
): CatalogItem[] {
  return items.map((it) => ({
    nome: it.nome,
    codigo: it.codigo,
    preco: it.preco,
    estoque: it.estoque ?? ESTOQUE_ASSUMIDO,
  }));
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const creds = getFortlevCredentials();
    let cdInfo: { id: number; slug: string; nome: string } | null = null;
    try {
      cdInfo = ensureFortlevCd();
    } catch (e) {
      cdInfo = null;
    }
    return res.status(200).json({
      configured: creds.configured,
      serverless: isServerlessFs(),
      hasUser: Boolean(creds.user),
      hasPassword: Boolean(creds.password),
      baseUrl: creds.baseUrl,
      loginUrl: creds.loginUrl,
      catalogUrl: creds.catalogUrl,
      cdSlug: creds.cdSlug,
      cdNome: creds.cdNome,
      cdId: cdInfo?.id ?? null,
      userHint: creds.user ? `${creds.user.slice(0, 2)}***` : null,
      precosStats: (() => {
        try {
          return getPrecosStats();
        } catch (e) {
          return { error: e instanceof Error ? e.message : String(e) };
        }
      })(),
      fluxo: [
        'Login Playwright em fortlevsolar.app',
        'Catálogo único: /produto-avulso (HTMX ?pagina=N + scroll #main)',
        'BOM sintético ≈ kit 391003 (grampos + junção + suporte/prisioneiro M10x250)',
        'Trilho / cabo / MC4 continuam nas regras SOOLLAR já existentes',
        'Grava no CD V3 slug=fortlev (estoque assumido 999 — portal não mostra qty nos cards)',
        isServerlessFs()
          ? 'Na Vercel: "Capturar produto-avulso" enfileira job_type=fortlev_scrape → worker no PC (npm run v3:jobs:worker) roda + publica'
          : 'No PC: roda Playwright direto neste endpoint',
      ],
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  if (isServerlessFs()) {
    // Vercel não roda Playwright → enfileira no Supabase; worker no PC captura + publica
    const action = String(req.body?.action || req.query.action || 'capturar');
    const stream = req.body?.stream !== false;

    if (action === 'probe') {
      const payload = {
        ok: false,
        queued: false,
        serverless: true,
        message:
          'Probe (login Playwright) roda só no PC. Da nuvem use "Capturar produto-avulso": o job vai para o worker local.',
      };
      if (stream) {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
          'X-Accel-Buffering': 'no',
        });
        writeSse(res, {
          type: 'log',
          line: {
            ts: new Date().toISOString(),
            level: 'warn',
            message: payload.message,
          },
        });
        writeSse(res, { type: 'done', ...payload });
        return res.end();
      }
      return res.status(200).json(payload);
    }

    try {
      const { enqueueCapturaJob } = await import('@/modules/v3/precos/capturaJobsQueue');
      const { created, job } = await enqueueCapturaJob({
        requestedBy: `vercel-fortlev-${action}`.slice(0, 80),
        jobType: 'fortlev_scrape',
        payload: {
          fonte: 'scrape',
          cds: ['fortlev'],
          headless: true,
          publicar: true,
          singleSession: true,
          action,
        },
      });
      const payload = {
        ok: true,
        queued: true,
        created,
        job,
        serverless: true,
        message: created
          ? 'Enfileirado via Vercel. O PC vai rodar Captura Fortlev (produto-avulso + BOM 391003) e publicar no Supabase.'
          : 'Já havia job Fortlev pending/running no PC — aguarde concluir.',
      };
      if (stream) {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
          'X-Accel-Buffering': 'no',
        });
        writeSse(res, {
          type: 'log',
          line: {
            ts: new Date().toISOString(),
            level: 'ok',
            message: payload.message,
            data: { jobId: job.id, status: job.status, jobType: job.job_type },
          },
        });
        writeSse(res, { type: 'done', ...payload });
        return res.end();
      }
      return res.status(created ? 202 : 200).json(payload);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const payload = {
        ok: false,
        serverless: true,
        message: /pieng_captura_jobs|schema cache|does not exist|Could not find the table/i.test(msg)
          ? 'Execute sql/8_pieng_captura_jobs.sql no Supabase para habilitar o disparo remoto.'
          : `Fila de captura falhou: ${msg}`,
      };
      if (stream) {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
        });
        writeSse(res, { type: 'error', ...payload });
        writeSse(res, { type: 'done', ...payload });
        return res.end();
      }
      return res.status(503).json(payload);
    }
  }

  const action = (req.body?.action || req.query.action || 'probe') as string;
  const headless = req.body?.headless !== false;
  const importarV3 = req.body?.importarV3 !== false;
  const stream = req.body?.stream !== false;

  if (stream) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
  }

  const lines: FortlevLogLine[] = [];
  const log = createFortlevLogger((line) => {
    lines.push(line);
    if (stream) writeSse(res, { type: 'log', line });
  });

  try {
    log('info', `Ação: ${action}`);
    const creds = getFortlevCredentials();
    log(
      creds.configured ? 'ok' : 'warn',
      creds.configured
        ? `Credenciais OK (${creds.user.slice(0, 2)}***)`
        : 'Sem FORTLEV_USER / FORTLEV_PASSWORD'
    );

    if (action === 'probe') {
      const result = await probeFortlevLoginPage(log);
      if (stream) {
        writeSse(res, { type: 'done', result });
        res.end();
        return;
      }
      return res.status(200).json({ ok: true, result, logs: lines });
    }

    if (action === 'capturar' || action === 'login') {
      const result = await capturarFortlevComBrowser(log, { headless });
      let v3Import: unknown = null;

      if (importarV3 && result.success && result.items.length) {
        const cd = ensureFortlevCd();
        log('info', `Gravando no CD V3 ${cd.slug} (id=${cd.id})…`);
        const catalog = toCatalogItems(result.items);
        const applied = applyCatalogToCd(catalog, cd.slug, `scrape:${FORTLEV_CD_SLUG}`, {
          autoCadastrarModulos: true,
        });
        log(
          'ok',
          `${catalog.length} itens → ${applied.matched} match / ${applied.validos} válidos`
        );
        if (result.bomKit) {
          log('data', 'BOM 391003', result.bomKit);
        }
        v3Import = { cd, applied, stats: getPrecosStats() };
      } else if (!importarV3) {
        log('warn', 'importarV3=false — só JSON na tela');
      }

      const payload = { ...result, catalogUrl: FORTLEV_PRODUTO_AVULSO_URL, v3Import };
      if (stream) {
        writeSse(res, { type: 'done', result: payload });
        res.end();
        return;
      }
      return res.status(200).json({ ok: true, result: payload, logs: lines });
    }

    log('error', `Ação desconhecida: ${action}`);
    if (stream) {
      writeSse(res, { type: 'error', message: `Ação desconhecida: ${action}` });
      res.end();
      return;
    }
    return res.status(400).json({ ok: false, message: `Ação desconhecida: ${action}` });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    log('error', msg);
    if (stream) {
      writeSse(res, { type: 'error', message: msg });
      writeSse(res, { type: 'done', ok: false });
      res.end();
      return;
    }
    return res.status(500).json({ ok: false, message: msg, logs: lines });
  }
}
