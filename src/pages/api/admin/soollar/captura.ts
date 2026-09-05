import type { NextApiRequest, NextApiResponse } from 'next';
import {
  capturarSoolarComBrowser,
  createConsoleLogger,
  getSoolarCredentials,
  probeSoolarLoginPage,
  SOOLLAR_CDS,
  SOOLLAR_SECOES_CAPTURA,
  type SoolarLogLine,
} from '@/lib/soollar/scraper';
import {
  extractItemsFromScrapePayload,
  persistScrapeHtmlDumps,
} from '@/modules/v3/precos/capturaJob';
import { applyCatalogToCd } from '@/modules/v3/precos/importCatalog';
import { getPrecosStats } from '@/modules/v3/precos/repository';
import { refreshEstoqueMinimosFromAdmin } from '@/modules/v3/precos/estoqueMinimosConfig';

export const config = {
  api: {
    bodyParser: true,
    responseLimit: false,
  },
};

function writeSse(res: NextApiResponse, payload: unknown) {
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    await refreshEstoqueMinimosFromAdmin();
    const creds = getSoolarCredentials();
    const base = creds.baseUrl || 'https://soollar.mygateway.com.br';
    const slug = creds.cdSlug || 'cdaeroportogo';
    return res.status(200).json({
      configured: creds.configured,
      hasUser: Boolean(creds.user),
      hasPassword: Boolean(creds.password),
      hasCd: Boolean(creds.cdRaw),
      cdHint: creds.cd,
      cdId: creds.cdId,
      cdSlug: creds.cdSlug,
      cdUrl: creds.cdUrl,
      cds: SOOLLAR_CDS.map((c) => ({
        id: c.id,
        nome: c.nome,
        slug: c.slug,
        rotuloUi: c.rotuloUi,
        optionIndex: c.optionIndex,
      })),
      secoes: [...SOOLLAR_SECOES_CAPTURA],
      secoesUrlsExemplo: SOOLLAR_SECOES_CAPTURA.map((s) => `${base}/cd/${slug}/secao/${s}`),
      estoqueMinimo: creds.estoqueMinimo,
      baseUrl: creds.baseUrl,
      loginUrl: creds.loginUrl,
      userHint: creds.user ? `${creds.user.slice(0, 2)}***` : null,
      precosStats: getPrecosStats(),
      fluxo: [
        'Chromium (Playwright) no seu PC — headless desmarcado = você vê o browser',
        'login → cd-selector-trigger → Aeroporto / Matriz / Feira',
        `varre seções: ${SOOLLAR_SECOES_CAPTURA.join(', ')} (com paginação)`,
        'preço só se estoque > mínimo (módulos/demais em /admin/configuracoes)',
        'marque "Gravar no SQLite V3" para applyCatalogToCd (senão só JSON na tela)',
      ],
      chromiumNotas: [
        'Confirmado no Aeroporto: /secao/estruturas-inox e /secao/cabos existem e listam produtos',
        'HTML antigo da Matriz em temp/ está SEM preço (sessão anônima) — precisa scrape logado',
        'Só módulos/inversores no banco = scrape não aplicou estrutura/cabo OU usou tela sem gravar V3',
        'Fallback cross-CD no kit: se Aeroporto/Matriz sem cabo, usa preço de outra filial',
      ],
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const action = (req.body?.action || req.query.action || 'probe') as string;
  const headless = req.body?.headless !== false;
  const quoteUrl = typeof req.body?.quoteUrl === 'string' ? req.body.quoteUrl : undefined;
  const cd = typeof req.body?.cd === 'string' ? req.body.cd : undefined;
  const todosCds = Boolean(req.body?.todosCds);
  const importarV3 = req.body?.importarV3 !== false;
  const cdsBody = Array.isArray(req.body?.cds)
    ? (req.body.cds as unknown[]).map(String).filter(Boolean)
    : undefined;
  const stream = req.body?.stream !== false;

  if (stream) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
  }

  const lines: SoolarLogLine[] = [];
  const log = createConsoleLogger((line) => {
    lines.push(line);
    if (stream) writeSse(res, { type: 'log', line });
  });

  try {
    log('info', `Ação: ${action}`);
    const creds = getSoolarCredentials();
    log('info', `Portal: ${creds.loginUrl}`);
    log(
      creds.configured ? 'ok' : 'warn',
      creds.configured
        ? `Credenciais .env OK (user: ${creds.user.slice(0, 2)}***)`
        : 'Sem SOOLLAR_USER / SOOLLAR_PASSWORD no .env — só probe HTTP disponível'
    );
    log('info', `Seções: ${SOOLLAR_SECOES_CAPTURA.join(', ')}`);

    if (action === 'probe') {
      const result = await probeSoolarLoginPage(log);
      if (stream) {
        writeSse(res, { type: 'done', result });
        res.end();
        return;
      }
      return res.status(200).json({ ok: true, result, logs: lines });
    }

    if (action === 'capturar' || action === 'login') {
      const cds =
        todosCds || cdsBody?.length
          ? cdsBody?.length
            ? cdsBody
            : SOOLLAR_CDS.map((c) => c.nome)
          : undefined;
      if (cds?.length) log('info', `CDs na mesma sessão: ${cds.join(' → ')}`);
      const result = await capturarSoolarComBrowser(log, {
        headless,
        quoteUrl,
        cd: cds ? undefined : cd,
        cds,
      });

      let v3Import: unknown = null;
      if (importarV3 && result.success && result.items?.length) {
        log('info', 'Gravando captura no SQLite V3 (match equipamentos)…');
        const blocos =
          result.porCd?.length
            ? result.porCd
            : [
                {
                  cd: result.cdSelecionado || cd || 'Aeroporto',
                  slug: String(result.items[0]?.cdSlug || 'cdaeroportogo'),
                  items: result.items,
                },
              ];
        const dumps = persistScrapeHtmlDumps(blocos);
        if (dumps.length) log('ok', `HTML em temp/: ${dumps.length} arquivo(s)`);

        const applied: unknown[] = [];
        for (const bloco of blocos) {
          const items = extractItemsFromScrapePayload(bloco.items || []);
          if (!items.length) {
            log('warn', `${bloco.cd}: 0 produtos parseados do HTML`);
            applied.push({ cd: bloco.cd, matched: 0, warning: '0 produtos' });
            continue;
          }
          const r = applyCatalogToCd(items, bloco.slug, `scrape:${bloco.slug}`, {
            autoCadastrarModulos: true,
          });
          log(
            'ok',
            `${bloco.cd}: ${items.length} itens → ${r.matched} match / ${r.validos} válidos (unmatched ${r.unmatched.length})`
          );
          if (r.unmatched[0]) {
            log('data', 'Ex. unmatched', r.unmatched.slice(0, 5));
          }
          applied.push({ cd: bloco.cd, itemsFound: items.length, ...r });
        }
        v3Import = {
          applied,
          stats: getPrecosStats(),
          dumps: dumps.map((f) => f.split(/[/\\]/).pop()),
        };
      } else if (!importarV3) {
        log('warn', 'Gravar na tabela de preços desligado — captura NÃO gravou no SQLite (só resultado na tela)');
      }

      const payload = { ...result, v3Import };
      if (stream) {
        writeSse(res, { type: 'done', result: payload });
        res.end();
        return;
      }
      return res.status(200).json({ ok: result.success, result: payload, logs: lines });
    }

    log('error', `Ação desconhecida: ${action}`);
    if (stream) {
      writeSse(res, { type: 'error', message: 'Ação inválida' });
      res.end();
      return;
    }
    return res.status(400).json({ message: 'Ação inválida. Use probe | capturar' });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log('error', message);
    if (stream) {
      writeSse(res, { type: 'error', message });
      res.end();
      return;
    }
    return res.status(500).json({ message, logs: lines });
  }
}
