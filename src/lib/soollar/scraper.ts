/**
 * Captura de orçamentos SOOLLAR (portal mygateway).
 * Fluxo: login → escolher CD (central de distribuição) → páginas internas → preços.
 * Credenciais apenas via .env — nunca no frontend.
 */

import { getEstoqueMinimos } from '@/modules/v3/precos/estoqueMinimosConfig';

export const SOOLLAR_BASE_URL =
  process.env.SOOLLAR_BASE_URL || 'https://soollar.mygateway.com.br';

export const SOOLLAR_LOGIN_URL = `${SOOLLAR_BASE_URL}/auth/login`;

/** CDs oficiais usados na captura de preços (slug = path após /cd/) */
export const SOOLLAR_CDS = [
  {
    id: 1,
    nome: 'Aeroporto',
    slug: 'cdaeroportogo',
    /** Texto do botão data-testid=cd-selector-trigger / opções do modal */
    rotuloUi: 'GO - AEROPORTO',
    /** Índice estável no modal "Selecione onde você quer comprar" */
    optionIndex: 0,
    aliases: ['aeroporto', 'cd aeroporto', 'cdaeroportogo', 'go - aeroporto', 'go-aeroporto'],
  },
  {
    id: 2,
    nome: 'Matriz',
    slug: 'cdgoiania',
    rotuloUi: 'GO - MATRIZ',
    optionIndex: 1,
    aliases: ['matriz', 'cd matriz', 'cdgoiania', 'goiânia', 'goiania', 'go - matriz', 'go-matriz'],
  },
  {
    id: 3,
    nome: 'Feira de Santana',
    slug: 'cdfeiradesantanaba',
    rotuloUi: 'BA - FEIRA DE SANTANA',
    optionIndex: 3,
    aliases: [
      'feira de santana',
      'feira',
      'santana',
      'fsa',
      'cdfeiradesantana',
      'cdfeiradesantanaba',
      'ba - feira',
      'ba - feira de santana',
    ],
  },
] as const;

/**
 * Seções do portal mygateway (path após /secao/).
 * Confirmado Aeroporto: estruturas-inox, cabos, inversores, modulos.
 * @see https://soollar.mygateway.com.br/cd/cdaeroportogo/secao/estruturas-inox
 * @see https://soollar.mygateway.com.br/cd/cdaeroportogo/secao/cabos
 */
export const SOOLLAR_SECOES_CAPTURA = [
  'modulos',
  'inversores',
  'estruturas-inox',
  'estrutura-galvanizada',
  'cabos',
  'componentes-eletricos',
] as const;

/** Só considera preço válido com estoque acima deste valor (piso no scrape; regra fina no import) */
export const SOOLLAR_ESTOQUE_MINIMO = 20;

function estoqueMinimoScrapeFloor(): number {
  try {
    const m = getEstoqueMinimos();
    return Math.min(m.modulo, m.outros);
  } catch {
    return SOOLLAR_ESTOQUE_MINIMO;
  }
}

export type SoolarLogLevel = 'info' | 'ok' | 'warn' | 'error' | 'data';

export interface SoolarLogLine {
  ts: string;
  level: SoolarLogLevel;
  message: string;
  data?: unknown;
}

export type SoolarLogger = (level: SoolarLogLevel, message: string, data?: unknown) => void;

export function resolverCdPreferido(raw?: string) {
  const q = (raw || '').trim().toLowerCase();
  if (!q) return SOOLLAR_CDS[0]; // padrão: Aeroporto
  const byId = SOOLLAR_CDS.find((c) => String(c.id) === q);
  if (byId) return byId;
  return (
    SOOLLAR_CDS.find(
      (c) =>
        c.nome.toLowerCase() === q ||
        c.aliases.some((a) => q.includes(a) || a.includes(q))
    ) || SOOLLAR_CDS[0]
  );
}

export function getSoolarCredentials() {
  const user = (process.env.SOOLLAR_USER || process.env.SOOLLAR_EMAIL || '').trim();
  const password = (process.env.SOOLLAR_PASSWORD || '').trim();
  const cdRaw = (process.env.SOOLLAR_CD || process.env.SOOLLAR_CENTRAL || '').trim();
  const cd = resolverCdPreferido(cdRaw);
  return {
    user,
    password,
    cd: cd.nome,
    cdId: cd.id,
    cdSlug: cd.slug,
    cdUrl: `${SOOLLAR_BASE_URL}/cd/${cd.slug}`,
    cdRaw,
    configured: Boolean(user && password),
    baseUrl: SOOLLAR_BASE_URL,
    loginUrl: SOOLLAR_LOGIN_URL,
    estoqueMinimo: estoqueMinimoScrapeFloor(),
  };
}

export function createConsoleLogger(onLine?: (line: SoolarLogLine) => void): SoolarLogger {
  return (level, message, data) => {
    const line: SoolarLogLine = {
      ts: new Date().toISOString(),
      level,
      message,
      data,
    };
    const prefix = `[SOOLLAR ${level.toUpperCase()}]`;
    if (data !== undefined) {
      console.log(prefix, message, data);
    } else {
      console.log(prefix, message);
    }
    onLine?.(line);
  };
}

/** Probe HTTP da tela de login (sem senha). */
export async function probeSoolarLoginPage(log: SoolarLogger) {
  log('info', `Conectando em ${SOOLLAR_LOGIN_URL}`);
  const res = await fetch(SOOLLAR_LOGIN_URL, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml',
    },
  });

  log(res.ok ? 'ok' : 'warn', `HTTP ${res.status} ${res.statusText}`);
  const html = await res.text();
  log('info', `HTML recebido: ${html.length} bytes`);

  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  if (titleMatch) log('data', `Title: ${titleMatch[1].trim()}`);

  const hasLoginBtn = /fazer login|entrar|sign in|login/i.test(html);
  log('info', 'Portal é SPA (campos de login renderizam no browser)');
  log(hasLoginBtn ? 'ok' : 'warn', `Texto de login detectado no HTML: ${hasLoginBtn}`);

  const scriptSrcs = [...html.matchAll(/src=["']([^"']+)["']/gi)].map((m) => m[1]).slice(0, 20);
  if (scriptSrcs.length) log('data', 'Scripts na página (amostra)', scriptSrcs);

  return {
    status: res.status,
    htmlLength: html.length,
    title: titleMatch?.[1]?.trim() || null,
    hasLoginBtn,
    scriptSrcs,
    fluxo: ['login', 'escolher CD (central de distribuição)', 'páginas internas de produtos/orçamento'],
  };
}

export interface SoolarCapturaResult {
  success: boolean;
  loggedIn: boolean;
  cdSelecionado?: string | null;
  cdsDisponiveis?: string[];
  items: Array<Record<string, unknown>>;
  /** Quando vários CDs na mesma sessão */
  porCd?: Array<{ cd: string; slug: string; items: Array<Record<string, unknown>> }>;
  rawHints?: string[];
}

type Page = import('playwright').Page;

async function fecharModalCdSeEstiverNoLogin(page: Page, log: SoolarLogger) {
  const opts = page.locator('[data-testid^="cd-option-"]');
  if ((await opts.count()) === 0) return;
  if (!/\/auth\/login/i.test(page.url()) && (await page.locator('input[name="email"]').count()) === 0) return;
  log('warn', 'Modal de CD está sobre o login — Escape para autenticar primeiro');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(800);
  if ((await opts.count()) > 0) {
    await page.locator('.MuiBackdrop-root').first().click({ force: true }).catch(() => undefined);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  }
}

async function inspecionarSessao(page: Page) {
  return page.evaluate(() => {
    const ls: Record<string, string> = {};
    const ss: Record<string, string> = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k) ls[k] = String(localStorage.getItem(k) || '').slice(0, 80);
      }
    } catch {
      /* ignore */
    }
    try {
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i);
        if (k) ss[k] = String(sessionStorage.getItem(k) || '').slice(0, 80);
      }
    } catch {
      /* ignore */
    }
    const blob = `${JSON.stringify(ls)} ${JSON.stringify(ss)} ${document.cookie}`;
    const hasToken = /token|jwt|access|refresh|authorization|session/i.test(blob);
    return {
      localStorageKeys: Object.keys(ls),
      sessionStorageKeys: Object.keys(ss),
      cookieNames: document.cookie
        .split(';')
        .map((c) => c.split('=')[0].trim())
        .filter(Boolean),
      hasToken,
    };
  });
}

async function fillMuiInput(page: Page, name: 'email' | 'password', value: string, log: SoolarLogger) {
  const sel = `input[name="${name}"]`;
  try {
    await page.waitForSelector(sel, { state: 'attached', timeout: 20000 });
    const el = page.locator(sel).first();
    await el.waitFor({ state: 'visible', timeout: 15000 });
    await el.click({ force: true });
    await el.fill('');
    // MUI/React: digitar caractere a caractere dispara onChange corretamente
    await el.pressSequentially(value, { delay: 25 });
    const current = await el.inputValue();
    if (current !== value) {
      await page.evaluate(
        ({ fieldName, fieldValue }) => {
          const input = document.querySelector(`input[name="${fieldName}"]`) as HTMLInputElement | null;
          if (!input) throw new Error('input não encontrado');
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
          setter?.call(input, fieldValue);
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        },
        { fieldName: name, fieldValue: value }
      );
    }
    log('ok', `${name === 'email' ? 'Usuário' : 'Senha'} preenchido (MUI ${sel})`);
    return true;
  } catch (e) {
    log('error', `Falha ao preencher ${name}: ${e instanceof Error ? e.message : String(e)}`);
    return false;
  }
}

async function clickLogin(page: Page, log: SoolarLogger) {
  // Espera o form MUI estabilizar após digitar
  await page.waitForTimeout(1000);

  // Garante que a senha volte a type=password se o olho estiver aberto (type=text)
  try {
    const pass = page.locator('input[name="password"]').first();
    const type = await pass.getAttribute('type');
    if (type === 'text') {
      const eye = page
        .locator('input[name="password"]')
        .locator('xpath=ancestor::div[contains(@class,"MuiInputBase-root")]//button')
        .first();
      if (await eye.count()) {
        await eye.click({ timeout: 2000 }).catch(() => undefined);
        log('info', 'Alternando visibilidade da senha (olho MUI)');
      }
    }
  } catch {
    // ignore
  }

  // Botão exato do portal: MuiButton containedPrimary type=submit "Fazer Login"
  const loginBtn = page
    .locator(
      'button.MuiButton-root.MuiButton-containedPrimary[type="submit"], button.MuiButton-contained[type="submit"], button[type="submit"]'
    )
    .filter({ hasText: /fazer login/i })
    .first();

  try {
    await loginBtn.waitFor({ state: 'visible', timeout: 10000 });
    // Espera sair de loading/disabled do MUI
    await page
      .waitForFunction(
        () => {
          const buttons = Array.from(document.querySelectorAll('button[type="submit"]'));
          const btn = buttons.find((b) => /fazer login/i.test(b.textContent || '')) as HTMLButtonElement | undefined;
          if (!btn) return false;
          const loading = btn.className.includes('MuiButton-loading') || btn.getAttribute('disabled') !== null;
          return !btn.disabled && !loading;
        },
        { timeout: 8000 }
      )
      .catch(() => undefined);

    await loginBtn.scrollIntoViewIfNeeded();
    await loginBtn.click({ timeout: 10000 });
    log('ok', 'Login acionado via button.MuiButton-containedPrimary[type=submit] Fazer Login');
    return true;
  } catch (e) {
    log('warn', `Clique direto no MUI falhou: ${e instanceof Error ? e.message : String(e)}`);
  }

  const strategies: Array<{ name: string; run: () => Promise<void> }> = [
    {
      name: 'force click Fazer Login',
      run: async () => {
        await loginBtn.click({ force: true, timeout: 8000 });
      },
    },
    {
      name: 'JS click no Fazer Login',
      run: async () => {
        const clicked = await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button[type="submit"]'));
          const btn = buttons.find((b) => /fazer login/i.test(b.textContent || '')) as HTMLButtonElement | undefined;
          if (!btn) return false;
          btn.disabled = false;
          btn.removeAttribute('disabled');
          btn.click();
          return true;
        });
        if (!clicked) throw new Error('botão Fazer Login não encontrado');
      },
    },
    {
      name: 'form.requestSubmit()',
      run: async () => {
        await page.evaluate(() => {
          const form = document.querySelector('form');
          if (!(form instanceof HTMLFormElement)) throw new Error('form não encontrado');
          form.requestSubmit();
        });
      },
    },
    {
      name: 'Enter no campo password',
      run: async () => {
        await page.locator('input[name="password"]').first().press('Enter');
      },
    },
  ];

  for (const s of strategies) {
    try {
      await s.run();
      log('ok', `Login acionado via ${s.name}`);
      return true;
    } catch (err) {
      log('warn', `Estratégia login falhou (${s.name}): ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  return false;
}

async function listarOpcoesCd(page: Page): Promise<string[]> {
  const textos = new Set<string>();

  // Opções oficiais do modal (data-testid="cd-option-...")
  const opts = page.locator('[data-testid^="cd-option-"]');
  const nOpts = Math.min(await opts.count(), 40);
  for (let i = 0; i < nOpts; i++) {
    const t = ((await opts.nth(i).innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
    if (t) textos.add(t);
  }

  const candidates = page.locator(
    [
      '[role="option"]',
      '[role="listbox"] button',
      '[role="listbox"] div',
      '[role="menuitem"]',
      'select option',
      'button',
      'a',
      'li',
      'label',
      'div',
    ].join(', ')
  );

  const count = Math.min(await candidates.count(), 250);
  for (let i = 0; i < count; i++) {
    const t = ((await candidates.nth(i).innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
    if (!t || t.length < 2 || t.length > 100) continue;
    if (/aeroporto|matriz|feira|santana|trocar cd|central|distribui|\bcd\b|filial/i.test(t)) {
      textos.add(t);
    }
  }

  return [...textos].slice(0, 50);
}

/** Abre o seletor oficial: button[data-testid="cd-selector-trigger"] */
async function abrirSeletorCd(page: Page, log: SoolarLogger): Promise<boolean> {
  // Modal já aberto após login? ("Selecione onde você quer comprar" + cd-option-N)
  const jaAberto =
    (await page.locator('[data-testid^="cd-option-"]').count()) > 0 ||
    (await page.getByText(/selecione onde você quer comprar/i).count()) > 0;
  if (jaAberto) {
    log('ok', 'Modal de CD já aberto — Selecione onde você quer comprar');
    return true;
  }

  const trigger = page.locator('[data-testid="cd-selector-trigger"]').first();
  if ((await trigger.count()) === 0) {
    log('warn', 'cd-selector-trigger não encontrado na tela');
    return false;
  }
  const labelAntes = ((await trigger.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
  log('info', `Abrindo seletor CD (trigger): "${labelAntes || '—'}"`);
  await trigger.scrollIntoViewIfNeeded().catch(() => undefined);
  await trigger.click({ timeout: 8000 });
  await page.waitForTimeout(600);
  await page
    .getByText(/selecione onde você quer comprar/i)
    .waitFor({ state: 'visible', timeout: 8000 })
    .catch(() => undefined);
  await page.waitForSelector('[data-testid^="cd-option-"]', { timeout: 8000 }).catch(() => undefined);
  return true;
}

async function lerRotuloCdTrigger(page: Page): Promise<string | null> {
  const trigger = page.locator('[data-testid="cd-selector-trigger"]').first();
  if ((await trigger.count()) === 0) return null;
  const t = ((await trigger.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
  return t || null;
}

function rotuloUiDoCd(alvo: (typeof SOOLLAR_CDS)[number]): RegExp {
  if (alvo.id === 1) return /go\s*-\s*aeroporto/i;
  if (alvo.id === 2) return /go\s*-\s*matriz/i;
  return /ba\s*-\s*feira\s+de\s+santana|feira\s+de\s+santana/i;
}

/** Clica na opção do modal (cd-option-0 = Aeroporto, cd-option-1 = Matriz, cd-option-3 = Feira). */
async function clicarOpcaoCdModal(
  page: Page,
  log: SoolarLogger,
  alvo: (typeof SOOLLAR_CDS)[number]
): Promise<boolean> {
  const reRotulo = rotuloUiDoCd(alvo);
  const idx = 'optionIndex' in alvo ? Number(alvo.optionIndex) : -1;

  // 1) data-testid="cd-option-0" (índice do portal — NÃO é o slug)
  if (idx >= 0) {
    const byIndex = page.locator(`[data-testid="cd-option-${idx}"]`).first();
    if ((await byIndex.count()) > 0) {
      const txt = ((await byIndex.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
      await byIndex.scrollIntoViewIfNeeded().catch(() => undefined);
      await byIndex.click({ force: true, timeout: 8000 });
      log('ok', `CD escolhido via data-testid=cd-option-${idx} ("${txt || alvo.rotuloUi}")`);
      return true;
    }
  }

  // 2) Qualquer cd-option-* cujo texto bata com o rótulo UI
  const porTexto = page.locator('[data-testid^="cd-option-"]').filter({ hasText: reRotulo }).first();
  if ((await porTexto.count()) > 0) {
    await porTexto.scrollIntoViewIfNeeded().catch(() => undefined);
    await porTexto.click({ force: true, timeout: 8000 });
    log('ok', `CD escolhido via texto no modal: ${alvo.rotuloUi}`);
    return true;
  }

  // 3) Botão genérico com o rótulo
  const btn = page.locator('button').filter({ hasText: reRotulo }).first();
  if ((await btn.count()) > 0) {
    await btn.click({ force: true, timeout: 8000 });
    log('ok', `CD escolhido via button com texto: ${alvo.rotuloUi}`);
    return true;
  }

  return false;
}

/** Após escolher CD: espera trigger/URL e dá tempo da vitrine hidratar. */
async function aguardarCdPronto(
  page: Page,
  log: SoolarLogger,
  alvo: (typeof SOOLLAR_CDS)[number]
): Promise<void> {
  await page
    .waitForFunction(
      ({ slug, needle }) => {
        const urlOk = location.href.includes(`/cd/${slug}`);
        const trigger = document.querySelector('[data-testid="cd-selector-trigger"]');
        const triggerTxt = (trigger?.textContent || '').toLowerCase();
        const triggerOk = triggerTxt.includes(needle);
        const token = Boolean(localStorage.getItem('auth-token'));
        return urlOk || triggerOk || token;
      },
      {
        slug: alvo.slug,
        needle: alvo.id === 1 ? 'aeroporto' : alvo.id === 2 ? 'matriz' : 'feira',
      },
      { timeout: 20000 }
    )
    .catch(() => undefined);

  const rotulo = await lerRotuloCdTrigger(page);
  const token = await page.evaluate(() => Boolean(localStorage.getItem('auth-token')));
  log('info', `CD pronto? trigger="${rotulo || '—'}" auth-token=${token} url=${page.url()}`);
  await page.waitForTimeout(2500);
}

async function escolherCd(page: Page, log: SoolarLogger, cdPreferido?: string) {
  const alvo = resolverCdPreferido(cdPreferido);
  const destCd = `${SOOLLAR_BASE_URL}/cd/${alvo.slug}`;
  const rotuloEsperado = alvo.rotuloUi || alvo.nome;
  log('info', `Procurando CD: ${alvo.id} - ${alvo.nome} (${rotuloEsperado}) → ${destCd}`);
  log('info', `Estoque válido (piso scrape) só com >${estoqueMinimoScrapeFloor()} un`);

  // 1) UI oficial: [data-testid="cd-selector-trigger"] → modal "Selecione onde…" → cd-option-N
  try {
    const aberto = await abrirSeletorCd(page, log);
    if (aberto) {
      const disponiveis = await listarOpcoesCd(page);
      if (disponiveis.length) log('data', `CDs no modal (${disponiveis.length})`, disponiveis);

      const clicou = await clicarOpcaoCdModal(page, log, alvo);

      if (clicou) {
        await page.waitForTimeout(1500);
        if (!page.url().includes(`/cd/${alvo.slug}`)) {
          log('warn', `URL ainda não em ${alvo.slug} — forçando goto ${destCd}`);
          await page.goto(destCd, { waitUntil: 'domcontentloaded', timeout: 45000 });
        }
        await aguardarCdPronto(page, log, alvo);
        const rotulo = await lerRotuloCdTrigger(page);
        if (rotulo) log('ok', `cd-selector-trigger agora: "${rotulo}"`);
        return {
          cdSelecionado: alvo.nome,
          cdsDisponiveis: disponiveis,
          cdSlug: page.url().match(/\/cd\/([^/?#]+)/i)?.[1] || alvo.slug,
          rotuloTrigger: rotulo,
        };
      }
      log('warn', 'Modal aberto, mas opção do CD alvo não encontrada — fallback URL');
      await page.keyboard.press('Escape').catch(() => undefined);
    }
  } catch (e) {
    log('warn', `Seletor UI (cd-selector-trigger) falhou: ${e instanceof Error ? e.message : String(e)}`);
  }

  // 2) Fallback: URL direta do CD
  try {
    log('info', `Navegando direto para o CD: ${destCd}`);
    await page.goto(destCd, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(2000);

    const url = page.url();
    const slugNaUrl = url.match(/\/cd\/([^/?#]+)/i)?.[1] || null;
    const rotulo = await lerRotuloCdTrigger(page);
    if (rotulo) log('data', `cd-selector-trigger após goto: "${rotulo}"`);

    if (slugNaUrl === alvo.slug && !/\/auth\/login/i.test(url)) {
      if (rotulo && !rotuloUiDoCd(alvo).test(rotulo)) {
        log('warn', `URL ok (${slugNaUrl}) mas trigger="${rotulo}" — reabrindo seletor`);
        try {
          await abrirSeletorCd(page, log);
          await clicarOpcaoCdModal(page, log, alvo);
          await page.waitForTimeout(1500);
        } catch {
          /* ignore */
        }
      }
      log('ok', `CD aberto na URL: ${slugNaUrl}`);
      const disponiveis = await listarOpcoesCd(page);
      if (disponiveis.length) log('data', `CDs / opções na tela (${disponiveis.length})`, disponiveis);
      return {
        cdSelecionado: alvo.nome,
        cdsDisponiveis: disponiveis,
        cdSlug: slugNaUrl,
        rotuloTrigger: await lerRotuloCdTrigger(page),
      };
    }
    if (slugNaUrl && slugNaUrl !== alvo.slug) {
      log('warn', `Portal redirecionou para ${slugNaUrl}, queríamos ${alvo.slug}`);
    } else {
      log('warn', `URL após goto CD não parece CD autenticado: ${url}`);
    }
  } catch (e) {
    log('warn', `Goto direto no CD falhou: ${e instanceof Error ? e.message : String(e)}`);
  }

  // 3) Fallback legado
  await page.waitForTimeout(1000);
  const openers = [
    page.locator('[data-testid="cd-selector-trigger"]'),
    page.getByRole('button', { name: /trocar cd|central|distribui|cd|filial|selecione|aeroporto|matriz|feira/i }),
    page.getByText(/trocar cd/i),
    page.locator('[aria-haspopup="listbox"]').first(),
    page.locator('select').first(),
  ];
  for (const opener of openers) {
    try {
      if ((await opener.count()) > 0) {
        await opener.first().click({ timeout: 3000 });
        log('ok', 'Abri seletor de CD (fallback)');
        await page.waitForTimeout(800);
        break;
      }
    } catch {
      // continua
    }
  }

  const disponiveis = await listarOpcoesCd(page);
  if (disponiveis.length) log('data', `CDs / opções encontradas (${disponiveis.length})`, disponiveis);

  const reRotulo = rotuloUiDoCd(alvo);
  try {
    const clicou = await clicarOpcaoCdModal(page, log, alvo);
    if (clicou) {
      await page.waitForTimeout(2000);
      const slug = page.url().match(/\/cd\/([^/?#]+)/i)?.[1] || alvo.slug;
      log('ok', `CD no modal (fallback): ${alvo.nome} → ${slug}`);
      if (slug !== alvo.slug) {
        await page.goto(destCd, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForTimeout(1500);
      }
      return {
        cdSelecionado: alvo.nome,
        cdsDisponiveis: disponiveis,
        cdSlug: page.url().match(/\/cd\/([^/?#]+)/i)?.[1] || alvo.slug,
        rotuloTrigger: await lerRotuloCdTrigger(page),
      };
    }
  } catch {
    // fallback aliases
  }

  const patterns = [alvo.nome, ...alvo.aliases].map(
    (p) => new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
  );

  for (const re of patterns) {
    try {
      const opt = page.getByText(re).first();
      if ((await opt.count()) > 0) {
        await opt.click({ timeout: 5000 });
        log('ok', `CD selecionado: ${alvo.nome} (match ${re})`);
        await page.waitForTimeout(2000);
        const slug = page.url().match(/\/cd\/([^/?#]+)/i)?.[1] || alvo.slug;
        return {
          cdSelecionado: alvo.nome,
          cdsDisponiveis: disponiveis,
          cdSlug: slug,
          rotuloTrigger: await lerRotuloCdTrigger(page),
        };
      }
    } catch {
      // próximo alias
    }
  }

  const candidata = disponiveis.find((d) => rotuloUiDoCd(alvo).test(d) || patterns.some((re) => re.test(d)));
  if (candidata) {
    try {
      await page.getByText(candidata, { exact: false }).first().click({ timeout: 5000 });
      log('ok', `CD selecionado via lista: ${candidata}`);
      await page.waitForTimeout(2000);
      const slug = page.url().match(/\/cd\/([^/?#]+)/i)?.[1] || alvo.slug;
      return {
        cdSelecionado: candidata,
        cdsDisponiveis: disponiveis,
        cdSlug: slug,
        rotuloTrigger: await lerRotuloCdTrigger(page),
      };
    } catch {
      log('warn', `Não cliquei em "${candidata}"`);
    }
  }

  log('warn', `Não confirmei troca para ${alvo.nome} — usando slug configurado ${alvo.slug}`);
  return {
    cdSelecionado: alvo.nome,
    cdsDisponiveis: disponiveis,
    cdSlug: alvo.slug,
    rotuloTrigger: await lerRotuloCdTrigger(page),
  };
}

async function paginaSemPrecosLiberados(page: Page): Promise<{ bloqueado: boolean; motivo: string }> {
  return page.evaluate(() => {
    const t = document.body?.innerText || '';
    const vejaPreco = /veja nosso pre[cç]o/i.test(t);
    const temRs = /R\$\s*[\d.]+/.test(t);
    const temEstoque = /estoque dispon/i.test(t);
    if (vejaPreco && !temRs) {
      return { bloqueado: true, motivo: 'texto "Veja nosso preço" sem R$ (sessão sem preço)' };
    }
    if (!temRs && !temEstoque) {
      return { bloqueado: true, motivo: 'nenhum R$ nem "Estoque disponível" no DOM' };
    }
    if (!temRs) {
      return { bloqueado: true, motivo: 'nenhum preço R$ visível' };
    }
    return { bloqueado: false, motivo: 'ok' };
  });
}

function capturaTemProdutosComPreco(items: Array<Record<string, unknown>>): boolean {
  return items.some((it) => {
    const validos = it.produtosValidos as unknown[] | undefined;
    const valores = it.valoresDetectados as unknown[] | undefined;
    return (validos && validos.length > 0) || (valores && valores.length > 0);
  });
}

/**
 * Segunda tentativa de login quando a vitrine mostra produto sem preço.
 * Pausa (se pauseSteps) para o usuário clicar em Login / Fazer Login manualmente.
 */
async function forcarSegundoLogin(
  page: Page,
  log: SoolarLogger,
  creds: { user: string; password: string },
  pausar?: (motivo: string) => Promise<void>
): Promise<boolean> {
  log('warn', '🔁 Segunda tentativa de login — captura sem preços (provável sessão anônima)');

  await pausar?.(
    'Equipamento SEM valor / "Veja nosso preço". Clique no botão Login da página, ou Resume para o script ir ao /auth/login'
  );

  // 1) Tenta clicar Login/Entrar na própria vitrine (header)
  const candidatos = [
    page.getByRole('button', { name: /fazer login|entrar|login/i }).first(),
    page.getByRole('link', { name: /fazer login|entrar|login/i }).first(),
    page.locator('a[href*="login"], button:has-text("Login"), a:has-text("Login")').first(),
  ];
  let clicouUi = false;
  for (const el of candidatos) {
    try {
      if ((await el.count()) > 0 && (await el.isVisible().catch(() => false))) {
        await el.click({ timeout: 5000 });
        log('ok', 'Cliquei no botão/link Login da vitrine');
        clicouUi = true;
        await page.waitForTimeout(1500);
        break;
      }
    } catch {
      /* tenta próximo */
    }
  }

  if (!clicouUi || (await page.locator('input[name="email"]').count()) === 0) {
    log('info', `Indo para tela de login: ${SOOLLAR_LOGIN_URL}`);
    await page.goto(SOOLLAR_LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForTimeout(1500);
  }

  await fecharModalCdSeEstiverNoLogin(page, log);

  if ((await page.locator('input[name="email"]').count()) === 0) {
    log('warn', 'Formulário de login não apareceu na 2ª tentativa');
    await pausar?.('Não achei campos de login — faça login manual e Resume');
    // Se o usuário logou manualmente, segue
    const sess = await inspecionarSessao(page);
    return sess.hasToken || !/\/auth\/login/i.test(page.url());
  }

  log('info', 'Preenchendo login (2ª tentativa)…');
  await fillMuiInput(page, 'email', creds.user, log);
  await fillMuiInput(page, 'password', creds.password, log);

  await pausar?.(
    'Usuário/senha preenchidos. Clique em "Fazer Login" você mesmo, ou Resume para o script clicar'
  );

  await clickLogin(page, log);

  try {
    await Promise.race([
      page.waitForURL((u) => !/\/auth\/login/i.test(u.href), { timeout: 35000 }),
      page.getByText(/login realizado com sucesso/i).first().waitFor({ timeout: 35000 }),
    ]);
  } catch {
    log('warn', 'Timeout pós 2º login — verificando sessão');
  }

  await page.waitForTimeout(2500);
  const after = page.url();
  const sessao = await inspecionarSessao(page);
  const ok = sessao.hasToken || !/\/auth\/login/i.test(after);
  log(ok ? 'ok' : 'error', `2º login → URL: ${after} | hasToken≈${sessao.hasToken}`);
  return ok;
}

async function listarPaginasDisponiveis(page: Page): Promise<number[]> {
  return page.evaluate(() => {
    const nums = new Set<number>();
    document.querySelectorAll('button, a, [role="button"], [class*="paginat"] *').forEach((el) => {
      const t = (el.textContent || '').replace(/\s+/g, ' ').trim();
      if (/^\d{1,2}$/.test(t)) {
        const n = parseInt(t, 10);
        if (n >= 1 && n <= 40) nums.add(n);
      }
    });
    return Array.from(nums).sort((a, b) => a - b);
  });
}

async function irParaPaginaLista(page: Page, log: SoolarLogger, n: number): Promise<boolean> {
  if (n <= 1) return true;
  const exact = page.getByRole('button', { name: String(n), exact: true }).first();
  const link = page.getByRole('link', { name: String(n), exact: true }).first();
  const candidates = [exact, link, page.locator(`button:text-is("${n}")`).first()];
  for (const el of candidates) {
    try {
      if ((await el.count()) === 0) continue;
      if (!(await el.isVisible().catch(() => false))) continue;
      await el.scrollIntoViewIfNeeded().catch(() => undefined);
      await el.click({ timeout: 5000 });
      log('info', `Paginação → página ${n}`);
      await page.waitForTimeout(2200);
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => undefined);
      return true;
    } catch {
      /* tenta próximo seletor */
    }
  }
  log('warn', `Não consegui clicar na página ${n}`);
  return false;
}

async function extrairValoresPagina(page: Page, log: SoolarLogger, items: Array<Record<string, unknown>>, label: string) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const extractSoolarDomSnapshot = require('./extractDomSnapshot.js') as (
    estoqueMin: number
  ) => {
    moneyAll: string[];
    moneyValidos: string[];
    produtosValidos: Array<{ texto: string; preco?: string; estoque: number | null; valido: boolean }>;
    produtosIgnorados: Array<{ texto: string; preco?: string; estoque: number | null; valido: boolean }>;
    storage: { cdSlug: string | null; cd: string | null; hasToken: boolean };
    sample: string;
  };

  await page.waitForLoadState('networkidle', { timeout: 25000 }).catch(() => undefined);
  await page.waitForTimeout(4000);

  await page.evaluate(`(async () => {
    for (let i = 0; i < 10; i++) {
      window.scrollBy(0, 900);
      await new Promise((r) => setTimeout(r, 400));
    }
    window.scrollTo(0, 0);
  })()`);

  await page
    .waitForFunction(
      `() => /R\\$\\s*[\\d.]+/.test(document.body?.innerText || '') || /estoque dispon/i.test(document.body?.innerText || '') || /veja nosso pre/i.test(document.body?.innerText || '')`,
      { timeout: 20000 }
    )
    .catch(() => undefined);

  const bloqueio = await paginaSemPrecosLiberados(page);
  if (bloqueio.bloqueado) {
    log('warn', `${label}: preços não liberados — ${bloqueio.motivo}`);
  }

  const estoqueMin = estoqueMinimoScrapeFloor();
  const snapshot = await page.evaluate(extractSoolarDomSnapshot, estoqueMin);
  if (!snapshot) {
    log('error', `${label}: extractDomSnapshot retornou vazio`);
    items.push({ source: page.url(), secao: label, produtosValidos: [], error: 'snapshot_vazio' });
    return;
  }

  const html = await page.content().catch(() => '');

  log('data', `${label}: storage`, snapshot.storage);
  log(
    'info',
    `${label}: regra estoque > ${estoqueMin} → ${snapshot.produtosValidos.length} válidos / ${snapshot.produtosIgnorados.length} ignorados (amostra)`
  );

  if (snapshot.produtosValidos.length) {
    log('data', `${label}: produtos com preço válido`, snapshot.produtosValidos.slice(0, 15));
  } else {
    log('warn', `${label}: nenhum item com estoque > ${estoqueMin} e preço`, {
      sample: snapshot.sample,
      moneyAll: snapshot.moneyAll.slice(0, 10),
      ignorados: snapshot.produtosIgnorados.slice(0, 5),
    });
  }

  items.push({
    source: page.url(),
    secao: label,
    estoqueMinimo: estoqueMin,
    valoresDetectados: snapshot.moneyValidos,
    produtosValidos: snapshot.produtosValidos,
    produtosIgnoradosAmostra: snapshot.produtosIgnorados,
    storage: snapshot.storage,
    html: html && html.length < 2_000_000 ? html : undefined,
    /** Fonte preferencial para match V3 (ignora botão Adicionar R$) */
    preferHtmlCatalog: true,
  });
}

/** Extrai página atual + páginas 2..N (botões numéricos). */
async function extrairSecaoComPaginacao(
  page: Page,
  log: SoolarLogger,
  items: Array<Record<string, unknown>>,
  secao: string
) {
  await extrairValoresPagina(page, log, items, `${secao}:p1`);
  const paginas = await listarPaginasDisponiveis(page);
  const extras = paginas.filter((n) => n > 1);
  if (!extras.length) {
    log('info', `${secao}: só página 1 (sem 2..N)`);
    return;
  }
  log('ok', `${secao}: páginas detectadas [${paginas.join(', ')}]`);
  for (const n of extras) {
    const ok = await irParaPaginaLista(page, log, n);
    if (!ok) break;
    await extrairValoresPagina(page, log, items, `${secao}:p${n}`);
  }
  // Volta para 1 (opcional, deixa estado limpo)
  if (extras.length) await irParaPaginaLista(page, log, 1).catch(() => undefined);
}

async function explorarPaginasInternas(
  page: Page,
  log: SoolarLogger,
  items: Array<Record<string, unknown>>,
  pausar?: (motivo: string) => Promise<void>
) {
  const url = page.url();
  let cdSlug = url.match(/\/cd\/([^/?#]+)/i)?.[1] || null;

  if (!cdSlug) {
    cdSlug = await page.evaluate(() => localStorage.getItem('cd-slug') || localStorage.getItem('CdSlug') || null);
  }

  if (cdSlug) {
    log('ok', `CD detectado: ${cdSlug} — ${SOOLLAR_SECOES_CAPTURA.join(', ')}`);
    for (const secao of SOOLLAR_SECOES_CAPTURA) {
      const dest = `${SOOLLAR_BASE_URL}/cd/${cdSlug}/secao/${secao}`;
      try {
        log('info', `Abrindo seção: ${secao} → ${dest}`);
        const resp = await page.goto(dest, { waitUntil: 'domcontentloaded', timeout: 45000 });
        const status = resp?.status() || 0;
        if (status >= 400) {
          log('warn', `Seção ${secao} HTTP ${status} — pulando`);
          continue;
        }
        await page.waitForTimeout(2500);
        const trigger = await lerRotuloCdTrigger(page);
        if (trigger) log('data', `trigger na seção ${secao}: ${trigger}`);

        if (secao === 'modulos') {
          await pausar?.(
            '📍 PÁGINA 1 de MÓDULOS — mostre a paginação (1,2,3… / barra de pages). Depois Resume.'
          );
        }

        await extrairSecaoComPaginacao(page, log, items, secao);
      } catch (e) {
        log('warn', `Seção ${secao} falhou: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    return;
  }

  log('warn', 'CD slug não encontrado — tentando links da home');
  for (const name of [/m[oó]dulos/i, /inversores/i, /estruturas?/i, /cabos?/i]) {
    try {
      const link = page.getByRole('link', { name }).first();
      if ((await link.count()) > 0) {
        await link.click({ timeout: 5000 });
        await extrairSecaoComPaginacao(page, log, items, String(name));
      }
    } catch {
      // próximo
    }
  }
}

/**
 * Login → CD → páginas internas.
 */
export type CapturaBrowserOptions = {
  headless?: boolean;
  quoteUrl?: string;
  /** Um CD (nome/slug/id) */
  cd?: string;
  /** Vários CDs na mesma sessão (sem fechar browser). Ex.: ['Aeroporto','Matriz','Feira de Santana'] */
  cds?: string[];
  slowMo?: number;
  pauseSteps?: boolean;
};

export async function capturarSoolarComBrowser(
  log: SoolarLogger,
  options?: CapturaBrowserOptions
): Promise<SoolarCapturaResult> {
  const creds = getSoolarCredentials();
  if (!creds.configured) {
    log('error', 'Credenciais ausentes. Configure SOOLLAR_USER e SOOLLAR_PASSWORD no .env');
    return { success: false, loggedIn: false, items: [] };
  }

  let playwright: typeof import('playwright');
  try {
    playwright = await import('playwright');
  } catch {
    log('error', 'Playwright não instalado. Rode: npm i -D playwright && npx playwright install chromium');
    return { success: false, loggedIn: false, items: [] };
  }

  const headless = options?.headless !== false;
  const slowMo = options?.slowMo ?? 0;
  const pauseSteps = Boolean(options?.pauseSteps) && !headless;
  const cdPreferido = (options?.cd || creds.cd || '').trim();
  log('info', `Abrindo Chromium (headless=${headless}, slowMo=${slowMo}, pauseSteps=${pauseSteps})…`);
  if (cdPreferido) log('info', `CD preferido: ${cdPreferido}`);

  const browser = await playwright.chromium.launch({ headless, slowMo });
  const context = await browser.newContext({
    locale: 'pt-BR',
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();

  const pausar = async (motivo: string) => {
    if (!pauseSteps) return;
    log('info', `⏸ PAUSA: ${motivo} — no Inspector clique Resume (▶) para continuar`);
    await page.pause();
  };

  const items: Array<Record<string, unknown>> = [];
  const rawHints: string[] = [];
  let cdSelecionado: string | null = null;
  let cdsDisponiveis: string[] = [];

  try {
    page.on('response', async (response) => {
      try {
        const url = response.url();
        // Ignora assets Next/static
        if (/\/_next\/static\//i.test(url) || /\/_next\/image/i.test(url) || /\.(js|css|woff2?|png|jpg|svg|webp)(\?|$)/i.test(url)) return;
        const ct = response.headers()['content-type'] || '';
        const interesting =
          /\/api\//i.test(url) ||
          /product|produto|preco|price|catalog|modulos|inversores|sku|item/i.test(url) ||
          /json/i.test(ct);
        if (!interesting) return;
        if (response.status() >= 400) return;
        const body = await response.text();
        if (!body || body.length > 800_000) return;
        if (!/preco|price|valor|R\$|modulo|inversor|sku|amount/i.test(body)) return;

        log('data', `API capturada: ${response.status()} ${url.slice(0, 160)}`, {
          bytes: body.length,
          preview: body.slice(0, 500),
        });
        rawHints.push(url);
        try {
          items.push({ source: url, payload: JSON.parse(body) });
        } catch {
          // tenta extrair preços do texto bruto
          const precos = body.match(/R\$\s*[\d.]+(?:,\d{2})?/g) || body.match(/"preco"\s*:\s*[\d.]+/gi) || [];
          items.push({ source: url, rawPreview: body.slice(0, 1500), precosDetectados: precos.slice(0, 30) });
        }
      } catch {
        // ignore
      }
    });

    log('info', `Navegando para login: ${SOOLLAR_LOGIN_URL}`);
    await page.goto(SOOLLAR_LOGIN_URL, { waitUntil: 'networkidle', timeout: 90_000 }).catch(async () => {
      await page.goto(SOOLLAR_LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    });
    await page.waitForTimeout(2500);
    log('ok', `Página atual: ${page.url()} | title: ${await page.title()}`);
    await pausar('Tela de login carregada — confira campos email/senha');

    await fecharModalCdSeEstiverNoLogin(page, log);

    const sessaoInicial = await inspecionarSessao(page);
    if (sessaoInicial.hasToken && !/\/auth\/login/i.test(page.url())) {
      log('ok', 'Sessão já autenticada');
    } else if (/\/auth\/login/i.test(page.url()) || (await page.locator('input[name="email"]').count()) > 0) {
      log('info', 'Preenchendo login (email + senha)…');
      await fillMuiInput(page, 'email', creds.user, log);
      await fillMuiInput(page, 'password', creds.password, log);
      await clickLogin(page, log);

      try {
        await Promise.race([
          page.waitForURL((u) => !/\/auth\/login/i.test(u.href), { timeout: 30000 }),
          page.getByText(/login realizado com sucesso/i).first().waitFor({ timeout: 30000 }),
        ]);
      } catch {
        log('warn', 'Timeout aguardando pós-login — verificando sessão mesmo assim');
      }

      // Toast "sucesso" às vezes aparece antes do redirect — força saída do /auth/login
      const toastOk = (await page.getByText(/login realizado com sucesso/i).count()) > 0;
      if (toastOk && /\/auth\/login/i.test(page.url())) {
        log('ok', 'Toast de login OK — aguardando redirect / forçando home');
        await page.waitForURL((u) => !/\/auth\/login/i.test(u.href), { timeout: 15000 }).catch(() => undefined);
        if (/\/auth\/login/i.test(page.url())) {
          await page.goto(SOOLLAR_BASE_URL + '/', { waitUntil: 'domcontentloaded', timeout: 45000 });
          await page.waitForTimeout(2000);
        }
      }
    }

    await page.waitForTimeout(2000);
    let afterUrl = page.url();
    let sessao = await inspecionarSessao(page);
    const toastAinda =
      (await page.getByText(/login realizado com sucesso/i).count().catch(() => 0)) > 0;
    let saiuDoLogin = !/\/auth\/login/i.test(afterUrl);
    let loggedIn = sessao.hasToken || saiuDoLogin || toastAinda;

    // Última tentativa: se cookie/httpOnly autenticou mas URL grudou no login
    if (!loggedIn || /\/auth\/login/i.test(afterUrl)) {
      if (toastAinda || (await page.locator('input[name="email"]').count()) === 0) {
        await page.goto(SOOLLAR_BASE_URL + '/', { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => undefined);
        await page.waitForTimeout(2500);
        afterUrl = page.url();
        sessao = await inspecionarSessao(page);
        saiuDoLogin = !/\/auth\/login/i.test(afterUrl);
        loggedIn = sessao.hasToken || saiuDoLogin;
      }
    }

    log('data', 'Sessão (chaves, sem valores secretos)', sessao);
    log(loggedIn ? 'ok' : 'error', `Pós-login URL: ${afterUrl}`);
    log('info', `Title pós-login: ${await page.title()}`);

    if (!loggedIn) {
      log('error', 'Login NÃO efetivado — ainda na tela de login.');
      const alertText = await page
        .locator('[role="alert"], .error, .alert, .toast, [class*="error"], [class*="Snackbar"]')
        .allTextContents()
        .catch(() => []);
      if (alertText.length) log('error', 'Mensagens na tela', alertText);
      return { success: false, loggedIn: false, items, rawHints };
    }

    if (!sessao.hasToken) {
      log('warn', 'Saiu do login, mas não achei chave óbvia de token — sigo mesmo assim (cookie/httpOnly pode bastar)');
    }

    await pausar('Login OK — próximo passo: abrir seletor de CD (cd-selector-trigger)');

    const alvosCds = (options?.cds?.length
      ? options.cds.map((c) => resolverCdPreferido(c))
      : [resolverCdPreferido(options?.cd || cdPreferido || creds.cd)]
    ).filter((a, i, arr) => arr.findIndex((x) => x.slug === a.slug) === i);

    const porCd: Array<{ cd: string; slug: string; items: Array<Record<string, unknown>> }> = [];
    let jaFezRelogin = false;

    for (let ci = 0; ci < alvosCds.length; ci++) {
      const alvo = alvosCds[ci];
      log('info', `—— CD ${ci + 1}/${alvosCds.length}: ${alvo.nome} (${alvo.slug}) ——`);

      const cdResult = await escolherCd(page, log, alvo.nome);
      cdSelecionado = cdResult.cdSelecionado || alvo.nome;
      if (cdResult.cdsDisponiveis.length) cdsDisponiveis = cdResult.cdsDisponiveis;
      if (cdResult.rotuloTrigger) log('ok', `Confirmado no trigger UI: ${cdResult.rotuloTrigger}`);
      await pausar(`CD escolhido: ${cdSelecionado} — confira o trigger e a URL`);

      const destOficial = `${SOOLLAR_BASE_URL}/cd/${alvo.slug}`;
      if (!page.url().includes(`/cd/${alvo.slug}`) && !options?.quoteUrl) {
        log('info', `Forçando CD oficial: ${destOficial}`);
        await page.goto(destOficial, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await aguardarCdPronto(page, log, alvo);
      }

      const itemsCd: Array<Record<string, unknown>> = [];
      if (options?.quoteUrl && ci === 0) {
        await page.goto(options.quoteUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 });
        await extrairValoresPagina(page, log, itemsCd, 'url-informada');
      } else {
        await explorarPaginasInternas(page, log, itemsCd, pausar);
      }

      const bloqueioAtual = await paginaSemPrecosLiberados(page);
      const semResultados = !capturaTemProdutosComPreco(itemsCd);
      if ((semResultados || bloqueioAtual.bloqueado) && !jaFezRelogin) {
        log('warn', `CD ${alvo.nome} sem preços — 2º login e recaptura`);
        const relogou = await forcarSegundoLogin(page, log, creds, pausar);
        jaFezRelogin = true;
        if (relogou) {
          itemsCd.length = 0;
          await escolherCd(page, log, alvo.nome);
          if (!page.url().includes(`/cd/${alvo.slug}`)) {
            await page.goto(destOficial, { waitUntil: 'domcontentloaded', timeout: 45000 });
            await aguardarCdPronto(page, log, alvo);
          }
          await explorarPaginasInternas(page, log, itemsCd, pausar);
        }
      }

      // Tag CD em cada bloco
      for (const it of itemsCd) {
        it.cdNome = alvo.nome;
        it.cdSlug = alvo.slug;
        items.push(it);
      }
      porCd.push({ cd: alvo.nome, slug: alvo.slug, items: itemsCd });
      log('ok', `CD ${alvo.nome}: ${itemsCd.length} bloco(s) de página`);
    }

    await pausar?.(
      'Extração feita — no DevTools confira se o card mostra nome do produto OU só o botão "Adicionar R$…"'
    );

    log(
      'ok',
      `Captura concluída. loggedIn=true cds=${alvosCds.map((a) => a.nome).join(',')} itens=${items.length}`
    );
    return {
      success: true,
      loggedIn: true,
      cdSelecionado,
      cdsDisponiveis,
      items,
      porCd,
      rawHints,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log('error', `Falha na captura: ${msg}`);
    return {
      success: false,
      loggedIn: false,
      cdSelecionado,
      cdsDisponiveis,
      items,
      rawHints,
    };
  } finally {
    await browser.close().catch(() => undefined);
    log('info', 'Browser fechado');
  }
}
