/**
 * Abre Chromium SOOLLAR (login + CD Aeroporto) e deixa LIVRE
 * para você navegar até estruturas / cabos e me passar a URL.
 *
 *   npx tsx scripts/v3-scrape-mostrar-estruturas.js
 *   npx tsx scripts/v3-scrape-mostrar-estruturas.js Matriz
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { chromium } = require('playwright');

const {
  createConsoleLogger,
  SOOLLAR_BASE_URL,
  SOOLLAR_LOGIN_URL,
  getSoolarCredentials,
  resolverCdPreferido,
} = require('../src/lib/soollar/scraper.ts');

const cdNome = process.argv[2] || 'Aeroporto';
const PAUSA_MS = Number(process.env.SOOLLAR_MOSTRAR_MS || 25 * 60 * 1000);

function waitEnterOrTimeout(msg, ms) {
  const flag = path.join(process.cwd(), 'temp', 'soollar-continuar.flag');
  try {
    if (fs.existsSync(flag)) fs.unlinkSync(flag);
  } catch {
    /* ignore */
  }
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    console.log('\n' + msg);
    console.log(`(ENTER · ou temp/soollar-continuar.flag · ou ${(ms / 1000) | 0}s)\n`);
    let done = false;
    const finish = (why) => {
      if (done) return;
      done = true;
      clearInterval(poll);
      clearTimeout(t);
      try {
        rl.close();
      } catch {
        /* ignore */
      }
      try {
        if (fs.existsSync(flag)) fs.unlinkSync(flag);
      } catch {
        /* ignore */
      }
      console.log(`[continua: ${why}]`);
      resolve();
    };
    const t = setTimeout(() => finish('timeout'), ms);
    const poll = setInterval(() => {
      try {
        if (fs.existsSync(flag)) finish('flag');
      } catch {
        /* ignore */
      }
    }, 800);
    rl.question('>>> ENTER quando estiver na página de estruturas/cabos… ', () => finish('enter'));
  });
}

async function fillMui(page, name, value, log) {
  const sel = `input[name="${name}"]`;
  await page.waitForSelector(sel, { state: 'visible', timeout: 20000 });
  const el = page.locator(sel).first();
  await el.click({ force: true });
  await el.fill('');
  await el.pressSequentially(value, { delay: 30 });
  const current = await el.inputValue();
  if (current !== value) {
    await page.evaluate(
      ({ fieldName, fieldValue }) => {
        const input = document.querySelector(`input[name="${fieldName}"]`);
        if (!input) throw new Error('input não encontrado');
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
        setter?.call(input, fieldValue);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      },
      { fieldName: name, fieldValue: value }
    );
  }
  log('ok', `Campo ${name} preenchido`);
}

async function clickFazerLogin(page, log) {
  const loginBtn = page.getByRole('button', { name: /fazer login/i }).first();
  await page
    .waitForFunction(
      () => {
        const buttons = Array.from(document.querySelectorAll('button[type="submit"]'));
        const btn = buttons.find((b) => /fazer login/i.test(b.textContent || ''));
        if (!btn) return false;
        return !btn.disabled && !String(btn.className).includes('MuiButton-loading');
      },
      { timeout: 8000 }
    )
    .catch(() => undefined);
  await loginBtn.scrollIntoViewIfNeeded();
  await loginBtn.click({ timeout: 10000 });
  log('ok', 'Clique em Fazer Login');
}

(async () => {
  const creds = getSoolarCredentials();
  if (!creds.configured) {
    console.error('Configure SOOLLAR_USER e SOOLLAR_PASSWORD no .env');
    process.exit(1);
  }

  const alvo = resolverCdPreferido(cdNome);
  const log = createConsoleLogger((line) => console.log(`[${line.level}]`, line.message));

  console.log('\n=== CHROMIUM LIVRE — ESTRUTURAS / CABOS ===');
  console.log('CD:', alvo.nome, '| user:', creds.user.replace(/(.{2}).+(@.+)/, '$1***$2'));
  console.log('Navegue até a seção de estruturas e cabos. Depois ENTER no terminal.\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 60,
    args: ['--start-maximized'],
  });
  const context = await browser.newContext({
    locale: 'pt-BR',
    viewport: null,
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();
  await page.bringToFront().catch(() => undefined);

  console.log('Abrindo', SOOLLAR_LOGIN_URL);
  await page.goto(SOOLLAR_LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2000);

  if ((await page.locator('[data-testid^="cd-option-"]').count()) > 0) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(600);
  }

  if ((await page.locator('input[name="email"]').count()) > 0) {
    console.log('Preenchendo login…');
    await fillMui(page, 'email', creds.user, log);
    await fillMui(page, 'password', creds.password, log);
    await clickFazerLogin(page, log);
    try {
      await Promise.race([
        page.waitForURL((u) => !/\/auth\/login/i.test(u.href), { timeout: 35000 }),
        page.getByText(/login realizado com sucesso/i).first().waitFor({ timeout: 35000 }),
      ]);
    } catch {
      console.warn('Timeout pós-login — seguindo…');
    }
    await page.waitForTimeout(2500);
  }

  const destCd = `${SOOLLAR_BASE_URL}/cd/${alvo.slug}`;
  console.log('Abrindo CD:', destCd);
  await page.goto(destCd, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(2000);

  const trigger = page.locator('[data-testid="cd-selector-trigger"]').first();
  if (await trigger.count()) {
    await trigger.click().catch(() => undefined);
    await page.waitForTimeout(800);
    const opt = page.locator(`[data-testid="cd-option-${alvo.optionIndex}"]`).first();
    if (await opt.count()) {
      await opt.click({ force: true });
      console.log('CD selecionado:', alvo.rotuloUi || alvo.nome);
    }
    await page.waitForTimeout(2000);
  }

  // 2º login se preços bloqueados
  const bloqueado = await page.evaluate(() => /veja nosso pre/i.test(document.body?.innerText || ''));
  if (bloqueado || /\/auth\/login/i.test(page.url())) {
    console.log('Preços bloqueados — 2º login…');
    await page.goto(SOOLLAR_LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(1500);
    await page.keyboard.press('Escape').catch(() => undefined);
    if ((await page.locator('input[name="email"]').count()) > 0) {
      await fillMui(page, 'email', creds.user, log);
      await fillMui(page, 'password', creds.password, log);
      await clickFazerLogin(page, log);
      await page.waitForTimeout(4000);
    }
    await page.goto(destCd, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(2000);
  }

  // Log URL a cada 15s enquanto espera
  const urlLog = setInterval(async () => {
    try {
      console.log('[URL atual]', page.url());
    } catch {
      /* ignore */
    }
  }, 15000);

  await waitEnterOrTimeout(
    [
      '══════════════════════════════════════════════════════',
      '📍 BROWSER LIVRE — vá até ESTRUTURAS e CABOS',
      `CD: ${alvo.nome}`,
      'Use o menu do portal e abra a seção desejada.',
      'Quando estiver na página certa: ENTER no terminal.',
      'Vou ler a URL e o HTML para gravar no scraper.',
      'NÃO feche o Chromium.',
      '══════════════════════════════════════════════════════',
    ].join('\n'),
    PAUSA_MS
  );
  clearInterval(urlLog);

  const info = await page.evaluate(() => {
    const body = document.body?.innerText || '';
    const links = Array.from(document.querySelectorAll('a[href]'))
      .map((a) => ({
        text: (a.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80),
        href: a.getAttribute('href') || '',
      }))
      .filter(
        (x) =>
          x.href &&
          /secao|estrutura|cabo|conector|fixacao|perfil|trilho|acessor/i.test(
            `${x.text} ${x.href}`
          )
      )
      .slice(0, 40);
    const nav = Array.from(document.querySelectorAll('nav a, [role="navigation"] a, aside a'))
      .map((a) => ({
        text: (a.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60),
        href: a.getAttribute('href') || '',
      }))
      .filter((x) => x.text || x.href)
      .slice(0, 50);
    return {
      url: location.href,
      title: document.title,
      temRs: /R\$\s*[\d.]+/.test(body),
      temVejaPreco: /veja nosso pre/i.test(body),
      sample: body.slice(0, 1200),
      linksUteis: links,
      navSample: nav,
    };
  });

  const outDir = path.join(process.cwd(), 'temp');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const htmlPath = path.join(outDir, `soollar-estruturas-${alvo.slug}-${stamp}.html`);
  const jsonPath = path.join(outDir, `soollar-estruturas-${alvo.slug}-${stamp}.json`);
  const html = await page.content();
  fs.writeFileSync(htmlPath, html, 'utf8');
  fs.writeFileSync(jsonPath, JSON.stringify(info, null, 2), 'utf8');

  console.log('\n=== PÁGINA CAPTURADA ===');
  console.log('URL:', info.url);
  console.log('JSON:', jsonPath);
  console.log('HTML:', htmlPath);
  console.log(JSON.stringify({ linksUteis: info.linksUteis, navSample: info.navSample }, null, 2));

  await waitEnterOrTimeout('ENTER (ou 90s) para fechar o Chromium.', 90_000);
  await browser.close();
  console.log('Fechado.');
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
