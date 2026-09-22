/**
 * Scraper Fortlev Solar — login + /produto-avulso?familia=… (HTMX / ?pagina=N).
 * Abas: module | inverter | structure | miscellaneous | dependency | battery
 */
import type { Page } from 'playwright';
import {
  FORTLEV_BASE_URL,
  FORTLEV_DC_FALLBACK,
  FORTLEV_FAMILIAS,
  FORTLEV_LOGIN_URL,
  FORTLEV_PRODUTO_AVULSO_URL,
  createFortlevLogger,
  fortlevProdutoAvulsoUrl,
  getFortlevCredentials,
  type FortlevCapturaResult,
  type FortlevFamilia,
  type FortlevLogger,
  type FortlevProduto,
} from './types';
import { FORTLEV_KIT_SINTETICO, montarBomKit391003 } from './bom';

export {
  FORTLEV_BASE_URL,
  FORTLEV_CD_NOME,
  FORTLEV_CD_SLUG,
  FORTLEV_FAMILIAS,
  FORTLEV_LOGIN_URL,
  FORTLEV_PRODUTO_AVULSO_URL,
  createFortlevLogger,
  fortlevProdutoAvulsoUrl,
  getFortlevCredentials,
} from './types';
export type { FortlevLogLine } from './types';
export { FORTLEV_BOM_KIT_391003, FORTLEV_KIT_SINTETICO, montarBomKit391003 } from './bom';

function parseMoneyBr(raw: string): number | null {
  const n = Number(String(raw).replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function parseProdutosFromText(text: string): FortlevProduto[] {
  const lines = text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
  const out: FortlevProduto[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^(I[A-Z]{2}\d{5})$/);
    if (!m) continue;
    const codigo = m[1];
    if (seen.has(codigo)) continue;
    const nome = lines[i + 1] || '';
    const pm = (lines[i + 2] || '').match(/R\$\s*([\d.]+,\d{2})/);
    if (!pm) continue;
    const preco = parseMoneyBr(pm[1]);
    if (preco == null || preco <= 0) continue;
    seen.add(codigo);
    out.push({ codigo, nome, preco, estoque: null });
  }
  return out;
}

function parseProdutosFromHtml(html: string): FortlevProduto[] {
  const out: FortlevProduto[] = [];
  const seen = new Set<string>();
  const plain = html.replace(/<[^>]+>/g, '\n').replace(/&nbsp;/gi, ' ');
  // Segmenta por código; preço = primeiro R$ xx,xx após o código neste bloco
  const parts = plain.split(/\b(?=I[A-Z]{2}\d{5}\b)/);
  for (const part of parts) {
    const cm = part.match(/^(I[A-Z]{2}\d{5})\b/);
    if (!cm) continue;
    const codigo = cm[1].toUpperCase();
    if (seen.has(codigo)) continue;
    const pm = part.match(/R\$\s*([\d.]+,\d{2})/);
    if (!pm) continue;
    const preco = parseMoneyBr(pm[1]);
    if (preco == null || preco <= 0) continue;
    const afterCode = part.slice(cm[0].length);
    const beforePrice = afterCode.split(/R\$/)[0] || '';
    const nome = beforePrice.replace(/\s+/g, ' ').trim().slice(0, 180);
    if (!nome || nome.length < 4) continue;
    seen.add(codigo);
    out.push({ codigo, nome, preco, estoque: null });
  }
  return out;
}

async function loginFortlev(page: Page, log: FortlevLogger): Promise<boolean> {
  const creds = getFortlevCredentials();
  if (!creds.configured) {
    log('error', 'Faltam FORTLEV_USER / FORTLEV_PASSWORD no .env');
    return false;
  }
  log('info', `Login ${FORTLEV_LOGIN_URL}`);
  // `networkidle` não estabiliza nesta SPA (conexões de longa duração) → 60s de timeout.
  // Mesmo padrão resiliente já usado no scraper SOOLLAR: cai para domcontentloaded.
  await page
    .goto(FORTLEV_LOGIN_URL, { waitUntil: 'networkidle', timeout: 60000 })
    .catch(async (e) => {
      log('warn', `networkidle não estabilizou (${(e as Error).message.split('\n')[0]}) — usando domcontentloaded`);
      await page.goto(FORTLEV_LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    });
  const email = page.locator('input[type="email"], input[name="email"]').first();
  const senha = page.locator('input[type="password"]').first();
  await email.waitFor({ timeout: 20000 });
  await email.fill(creds.user);
  await senha.fill(creds.password);
  await page.locator('button:has-text("Entrar"), button[type="submit"]').first().click();
  await page.waitForTimeout(3500);
  const url = page.url();
  const ok = !/\/login/i.test(url);
  log(ok ? 'ok' : 'error', ok ? `Sessão OK (${url})` : `Ainda em login: ${url}`);
  return ok;
}

async function scrollCatalogo(page: Page, log: FortlevLogger): Promise<void> {
  for (let i = 0; i < 45; i++) {
    const before = await page.evaluate(
      () => document.body.innerText.match(/I[A-Z]{2}\d{5}/g)?.length || 0
    );
    await page.evaluate(() => {
      const main = document.querySelector('#main') as HTMLElement | null;
      if (main) main.scrollTop = main.scrollHeight;
      else window.scrollTo(0, document.body.scrollHeight);
    });
    await page.waitForTimeout(900);
    const after = await page.evaluate(
      () => document.body.innerText.match(/I[A-Z]{2}\d{5}/g)?.length || 0
    );
    if (i % 5 === 0) log('info', `Scroll catálogo: ${after} códigos`);
    if (after === before && i > 2) break;
  }
}

async function fetchPaginasHtmx(
  page: Page,
  log: FortlevLogger,
  familia?: FortlevFamilia | string | null
): Promise<FortlevProduto[]> {
  const byCode = new Map<string, FortlevProduto>();
  const famQs = familia ? `familia=${encodeURIComponent(familia)}&` : '';
  for (let p = 1; p <= 30; p++) {
    const url = `${FORTLEV_PRODUTO_AVULSO_URL}?${famQs}pagina=${p}`;
    const res = await page.request.get(url, {
      headers: {
        'HX-Request': 'true',
        'HX-Target': 'single-grid',
        Accept: 'text/html',
      },
    });
    const html = await res.text();
    const items = parseProdutosFromHtml(html).map((it) => ({
      ...it,
      familia: familia || it.familia || null,
    }));
    if (!items.length) {
      if (p > 1) break;
      log('warn', `HTMX ${familia || 'all'} pagina=${p} sem itens (status ${res.status()})`);
      break;
    }
    for (const it of items) byCode.set(it.codigo, it);
    log('data', `HTMX familia=${familia || 'all'} pagina=${p}: +${items.length} (único ${byCode.size})`);
  }
  return Array.from(byCode.values());
}

async function capturarFamilia(
  page: Page,
  log: FortlevLogger,
  familia: FortlevFamilia
): Promise<FortlevProduto[]> {
  const url = fortlevProdutoAvulsoUrl(familia);
  log('info', `Abrindo ${url}`);
  await page.goto(url, { waitUntil: 'networkidle', timeout: 90000 }).catch(async (e) => {
    log('warn', `networkidle não estabilizou (${(e as Error).message.split('\n')[0]}) — usando domcontentloaded`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
  });
  await page.waitForTimeout(1500);

  const htmxItems = await fetchPaginasHtmx(page, log, familia);
  await scrollCatalogo(page, log);
  const domItems = parseProdutosFromText(await page.evaluate(() => document.body.innerText)).map(
    (it) => ({ ...it, familia })
  );

  const byCode = new Map<string, FortlevProduto>();
  for (const it of [...htmxItems, ...domItems]) byCode.set(it.codigo, it);
  log('ok', `Familia ${familia}: ${byCode.size} produtos`);
  return Array.from(byCode.values());
}

/**
 * Captura catálogo produto-avulso (1 CD) + monta BOM ≈ 391003.
 */
export async function capturarFortlevComBrowser(
  log: FortlevLogger = createFortlevLogger(),
  opts?: { headless?: boolean; slowMo?: number }
): Promise<FortlevCapturaResult> {
  const headless = opts?.headless !== false;
  const slowMo = opts?.slowMo ?? 0;
  let distributionCenterId: string | null = null;
  let bearerSeen = false;

  const playwright = await import('playwright');
  const browser = await playwright.chromium.launch({ headless, slowMo });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('request', (req) => {
    if (!req.url().includes('fortlevsolar.app/api/')) return;
    if ((req.headers().authorization || '').startsWith('Bearer ')) bearerSeen = true;
  });
  page.on('response', async (res) => {
    if (!res.url().includes('/api/partner/order/') || res.status() !== 200) return;
    try {
      const j = await res.json();
      const first = Array.isArray(j) ? j[0] : j;
      if (first?.distribution_center) {
        distributionCenterId = String(first.distribution_center);
      }
    } catch {
      /* ignore */
    }
  });

  try {
    const loggedIn = await loginFortlev(page, log);
    if (!loggedIn) {
      return {
        success: false,
        loggedIn: false,
        distributionCenterId: null,
        items: [],
      };
    }

    // Abas do portal (familySelect): module + inverter são o núcleo BOM;
    // structure/miscellaneous/dependency cobrem kit 391003 e acessórios.
    const familias: FortlevFamilia[] = [
      'module',
      'inverter',
      'structure',
      'miscellaneous',
      'dependency',
    ];
    const byCode = new Map<string, FortlevProduto>();
    for (const fam of familias) {
      const batch = await capturarFamilia(page, log, fam);
      for (const it of batch) {
        const prev = byCode.get(it.codigo);
        // Preferir item da família “própria” se já veio de outra aba genérica
        if (!prev || (it.familia && !prev.familia) || it.preco > 0) {
          byCode.set(it.codigo, { ...prev, ...it, familia: it.familia || prev?.familia || fam });
        }
      }
    }
    const items = Array.from(byCode.values());
    log('ok', `Catálogo Fortlev: ${items.length} produtos com preço`, {
      bearerSeen,
      distributionCenterId: distributionCenterId || FORTLEV_DC_FALLBACK,
      porFamilia: Object.fromEntries(
        familias.map((f) => [f, items.filter((i) => i.familia === f).length])
      ),
    });

    const bom = montarBomKit391003(items);
    if (bom.faltando.length) {
      log('warn', `BOM 391003 incompleto: faltam ${bom.faltando.join(', ')}`);
    } else {
      log('ok', `BOM 391003 ≈ R$ ${bom.preco.toFixed(2)} (${bom.pecas.length} papéis)`, {
        pecas: bom.pecas.map((p) => `${p.qty}× ${p.codigo}`),
      });
    }

    // Item sintético para casar EST-AUTO-391003 no applyCatalog
    if (bom.preco > 0 && bom.faltando.length === 0) {
      items.push({
        codigo: FORTLEV_KIT_SINTETICO.codigo,
        nome: FORTLEV_KIT_SINTETICO.nome,
        preco: bom.preco,
        estoque: 999,
      });
    }

    return {
      success: items.length > 0,
      loggedIn: true,
      distributionCenterId: distributionCenterId || FORTLEV_DC_FALLBACK,
      items,
      bomKit: {
        skuRef: FORTLEV_KIT_SINTETICO.skuCanonico,
        preco: bom.preco,
        pecas: bom.pecas.map(({ codigo, qty, precoUnit, nome }) => ({
          codigo,
          qty,
          precoUnit,
          nome,
        })),
        faltando: bom.faltando,
      },
    };
  } finally {
    await browser.close().catch(() => undefined);
  }
}

export async function probeFortlevLoginPage(log: FortlevLogger = createFortlevLogger()) {
  log('info', `Probe HTTP ${FORTLEV_LOGIN_URL}`);
  const res = await fetch(FORTLEV_LOGIN_URL, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      Accept: 'text/html',
    },
  });
  const html = await res.text();
  const hasLogin = /entrar|senha|email/i.test(html);
  log(res.ok ? 'ok' : 'warn', `HTTP ${res.status} (${html.length} bytes)`);
  return {
    status: res.status,
    htmlLength: html.length,
    hasLogin,
    catalogUrl: FORTLEV_PRODUTO_AVULSO_URL,
    familias: FORTLEV_FAMILIAS,
    fluxo: [
      'login',
      'produto-avulso?familia=module|inverter|… (HTMX ?pagina=N + scroll #main)',
      'BOM 391003 sintético',
    ],
  };
}
