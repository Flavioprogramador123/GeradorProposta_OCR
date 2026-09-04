/**
 * Abre SOOLLAR: login MUI (igual ao scraper) → CD → página 1 módulos LIVRE.
 * Sem Playwright Inspector (não trava a tela).
 *
 *   npx tsx scripts/v3-scrape-mostrar-pagina1.js
 *   npx tsx scripts/v3-scrape-mostrar-pagina1.js Matriz
 */
require('dotenv').config();
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
const PAUSA_MS = Number(process.env.SOOLLAR_MOSTRAR_MS || 10 * 60 * 1000);

function waitEnterOrTimeout(msg, ms) {
  const fs = require('fs');
  const path = require('path');
  const flag = path.join(process.cwd(), 'temp', 'soollar-continuar.flag');
  try {
    if (fs.existsSync(flag)) fs.unlinkSync(flag);
  } catch {
    /* ignore */
  }
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    console.log('\n' + msg);
    console.log(`(ENTER · ou crie temp/soollar-continuar.flag · ou espera ${(ms / 1000) | 0}s)\n`);
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
    rl.question('>>> ENTER para continuar… ', () => finish('enter'));
  });
}

/** Preenchimento MUI (mesmo padrão do scraper.ts) — .fill() sozinho falha. */
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
  log('ok', `${name} preenchido (MUI pressSequentially)`);
}

async function clickFazerLogin(page, log) {
  await page.waitForTimeout(800);
  const loginBtn = page
    .locator('button.MuiButton-contained[type="submit"], button[type="submit"]')
    .filter({ hasText: /fazer login/i })
    .first();
  await loginBtn.waitFor({ state: 'visible', timeout: 10000 });
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

  console.log('\n=== LOGIN MUI + PÁGINA 1 MÓDULOS (livre) ===');
  console.log('CD:', alvo.nome, '| user:', creds.user.replace(/(.{2}).+(@.+)/, '$1***$2'));
  console.log('O script preenche login/senha. Não feche o Chromium.\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 80,
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

  // —— LOGIN (igual scraper) ——
  console.log('Abrindo', SOOLLAR_LOGIN_URL);
  await page.goto(SOOLLAR_LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2000);

  if ((await page.locator('[data-testid^="cd-option-"]').count()) > 0) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(600);
  }

  if ((await page.locator('input[name="email"]').count()) > 0) {
    console.log('Preenchendo usuário e senha (MUI)…');
    await fillMui(page, 'email', creds.user, log);
    await fillMui(page, 'password', creds.password, log);
    await clickFazerLogin(page, log);
    try {
      await Promise.race([
        page.waitForURL((u) => !/\/auth\/login/i.test(u.href), { timeout: 35000 }),
        page.getByText(/login realizado com sucesso/i).first().waitFor({ timeout: 35000 }),
      ]);
    } catch {
      console.warn('Timeout pós-login — verificando…');
    }
    await page.waitForTimeout(2500);
  }

  console.log('URL pós-login:', page.url());

  // —— CD ——
  const destCd = `${SOOLLAR_BASE_URL}/cd/${alvo.slug}`;
  await page.goto(destCd, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(2000);

  const trigger = page.locator('[data-testid="cd-selector-trigger"]').first();
  if (await trigger.count()) {
    await trigger.click().catch(() => undefined);
    await page.waitForTimeout(800);
    const opt = page.locator(`[data-testid="cd-option-${alvo.optionIndex}"]`).first();
    if (await opt.count()) {
      await opt.click({ force: true });
      console.log('CD clicado:', alvo.rotuloUi || alvo.nome);
    }
    await page.waitForTimeout(2000);
  }

  // —— MÓDULOS PÁGINA 1 ——
  const modulos = `${SOOLLAR_BASE_URL}/cd/${alvo.slug}/secao/modulos`;
  console.log('Abrindo', modulos);
  await page.goto(modulos, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(3500);

  // Se "Veja nosso preço" → 2º login
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
    await page.waitForTimeout(1500);
    if (await trigger.count()) {
      await trigger.click().catch(() => undefined);
      await page.waitForTimeout(600);
      const opt = page.locator(`[data-testid="cd-option-${alvo.optionIndex}"]`).first();
      if (await opt.count()) await opt.click({ force: true }).catch(() => undefined);
      await page.waitForTimeout(1500);
    }
    await page.goto(modulos, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(3500);
  }

  await waitEnterOrTimeout(
    [
      '══════════════════════════════════════════',
      '📍 MÓDULOS PÁGINA 1 — BROWSER LIVRE',
      'Login já foi feito pelo script.',
      'Clique na paginação, espere carregar, mostre a barra.',
      'NÃO feche o Chromium.',
      'ENTER no terminal quando terminar (~10 min máx).',
      '══════════════════════════════════════════',
    ].join('\n'),
    PAUSA_MS
  );

  const pagInfo = await page.evaluate(() => {
    const body = document.body?.innerText || '';
    const buttons = Array.from(document.querySelectorAll('button, a, [role="button"]'))
      .map((el) => (el.textContent || '').replace(/\s+/g, ' ').trim())
      .filter((t) => t && t.length < 40 && (/^\d+$/.test(t) || /próxim|anterio|next|prev|page|página/i.test(t)))
      .slice(0, 40);
    return {
      url: location.href,
      temVejaPreco: /veja nosso pre/i.test(body),
      temRs: /R\$\s*[\d.]+/.test(body),
      botoesPaginacao: [...new Set(buttons)],
      sample: body.slice(0, 500),
    };
  });
  console.log('\n=== INFO PAGINAÇÃO ===');
  console.log(JSON.stringify(pagInfo, null, 2));

  await waitEnterOrTimeout('ENTER (ou 60s) para fechar.', 60_000);
  await browser.close();
  console.log('Fechado.');
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
