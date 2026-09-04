/**
 * Job 2a — atualiza precos_cd.
 * Fontes:
 *  - dumps HTML/JSON em temp/ (offline, estável)
 *  - scraping Playwright: 1 sessão → 3 CDs → paginação → HTML catalog
 */
import fs from 'fs';
import path from 'path';
import { createConsoleLogger, capturarSoolarComBrowser, SOOLLAR_CDS } from '@/lib/soollar/scraper';
import {
  applyCatalogToCd,
  dedupeCatalogItems,
  importFeiraJsonToCd,
  importHtmlFileToCd,
  parseProductsFromHtml,
  type CatalogItem,
} from './importCatalog';
import { getPrecosStats } from './repository';
import {
  mergeAndSaveRejeitados,
  type ItemRejeitado,
  type MotivoRejeicao,
} from './rejeitadosCaptura';

export type CapturaFonte = 'temp' | 'scrape' | 'both';

const TEMP_HTML_MAP: Array<{ cd: string; globs: string[] }> = [
  {
    cd: 'Feira de Santana',
    globs: [
      'temp/Soollar Distribuidora_feira.html',
      'temp/_feira*.html',
      'temp/soollar-*feira*.html',
      'temp/soollar-*cdfeiradesantana*.html',
    ],
  },
  {
    cd: 'Matriz',
    globs: [
      'temp/_matrizcd_cdgoiania.html',
      'temp/_matrizcd_cdgoiania_secao_*.html',
      'temp/_matrizcd_cdmatriz.html',
      'temp/soollar-*cdgoiania*.html',
      'temp/soollar-*matriz*.html',
    ],
  },
  {
    cd: 'Aeroporto',
    globs: [
      'temp/_aeroporto*.html',
      'temp/*aeroporto*.html',
      'temp/soollar-*cdaeroportogo*.html',
      'temp/soollar-*aeroporto*.html',
    ],
  },
];

function expandGlobs(patterns: string[]): string[] {
  const root = process.cwd();
  const out: string[] = [];
  for (const pattern of patterns) {
    const full = path.isAbsolute(pattern) ? pattern : path.join(root, pattern);
    if (full.includes('*')) {
      const dir = path.dirname(full);
      const re = new RegExp('^' + path.basename(full).replace(/\./g, '\\.').replace(/\*/g, '.*') + '$', 'i');
      if (!fs.existsSync(dir)) continue;
      for (const f of fs.readdirSync(dir)) {
        if (re.test(f)) out.push(path.join(dir, f));
      }
    } else if (fs.existsSync(full)) {
      out.push(full);
    }
  }
  return Array.from(new Set(out));
}

export async function atualizarPrecosFromTemp(): Promise<{
  results: unknown[];
  stats: ReturnType<typeof getPrecosStats>;
}> {
  const results: unknown[] = [];

  try {
    if (fs.existsSync(path.join(process.cwd(), 'temp', '_feira_produtos.json'))) {
      results.push({ fonte: 'feira-json', ...importFeiraJsonToCd('Feira de Santana') });
    }
  } catch (e) {
    results.push({ fonte: 'feira-json', error: e instanceof Error ? e.message : String(e) });
  }

  for (const entry of TEMP_HTML_MAP) {
    const files = expandGlobs(entry.globs);
    // Preferir dumps com preço/estoque (tamanho não basta — Matriz antiga sem R$)
    files.sort((a, b) => {
      const ha = fs.readFileSync(a, 'utf8');
      const hb = fs.readFileSync(b, 'utf8');
      const score = (h: string) =>
        (h.match(/Estoque dispon/gi) || []).length * 1000 +
        (h.match(/R\$\s*[\d.,]+/g) || []).length +
        h.length / 10000;
      return score(hb) - score(ha);
    });

    let anyMatch = 0;
    // Aplica TODOS os HTMLs úteis do CD (módulos + estruturas + cabos), não só o 1º
    for (const file of files) {
      try {
        const html = fs.readFileSync(file, 'utf8');
        const estoqueHits = (html.match(/Estoque dispon/gi) || []).length;
        if (estoqueHits === 0) {
          results.push({
            fonte: 'html',
            cd: entry.cd,
            file: path.basename(file),
            warning: 'HTML sem estoque/preço (sessão anônima?) — ignorado',
          });
          continue;
        }
        const r = importHtmlFileToCd(file, entry.cd);
        results.push({ fonte: 'html', cd: entry.cd, file: path.basename(file), ...r });
        anyMatch += r.matched || 0;
      } catch (e) {
        results.push({
          fonte: 'html',
          cd: entry.cd,
          file,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }
    if (!files.length) {
      results.push({ fonte: 'html', cd: entry.cd, warning: 'nenhum dump HTML em temp/' });
    } else if (anyMatch === 0) {
      results.push({
        fonte: 'html',
        cd: entry.cd,
        warning: 'dumps encontrados mas 0 match (parser/matcher)',
      });
    }
  }

  persistRejeitadosFromResults('temp', results);
  return { results, stats: getPrecosStats() };
}

/** Prefer HTML parser (nomes bons); DOM só como fallback sem "Adicionar R$". */
export function extractItemsFromScrapePayload(items: Array<Record<string, unknown>>): CatalogItem[] {
  const fromHtml: CatalogItem[] = [];
  const fromDom: CatalogItem[] = [];

  for (const it of items) {
    if (typeof it.html === 'string' && it.html.length > 500) {
      fromHtml.push(...parseProductsFromHtml(it.html));
    }
    const validos = (it.produtosValidos as Array<{ texto?: string; preco?: string; estoque?: number }>) || [];
    for (const v of validos) {
      const nome = String(v.texto || '').slice(0, 160);
      if (!nome || /Adicionar\s*R\$/i.test(nome)) continue;
      fromDom.push({
        nome,
        preco: v.preco
          ? Number(String(v.preco).replace(/R\$\s*/i, '').replace(/\./g, '').replace(',', '.')) || null
          : null,
        estoque: v.estoque ?? null,
      });
    }
  }

  // Une HTML + DOM (HTML primeiro no dedupe)
  return dedupeCatalogItems([...fromHtml, ...fromDom]);
}

/** Itens lidos no DOM mas descartados na página (estoque/outro CD/sem preço) */
export function extractIgnoradosFromScrapePayload(
  items: Array<Record<string, unknown>>,
  cdLabel: string
): ItemRejeitado[] {
  const out: ItemRejeitado[] = [];
  const seen = new Set<string>();
  for (const it of items) {
    const ignorados =
      (it.produtosIgnoradosAmostra as Array<{
        texto?: string;
        preco?: string;
        estoque?: number | null;
        motivoIgnorado?: string;
      }>) ||
      (it.produtosIgnorados as Array<{
        texto?: string;
        preco?: string;
        estoque?: number | null;
        motivoIgnorado?: string;
      }>) ||
      [];
    for (const v of ignorados) {
      const nome = String(v.texto || '').slice(0, 160);
      if (!nome || seen.has(nome)) continue;
      seen.add(nome);
      const motivo = (v.motivoIgnorado || 'estoque_baixo') as MotivoRejeicao;
      out.push({
        cd: cdLabel,
        nome,
        preco: v.preco
          ? Number(String(v.preco).replace(/R\$\s*/i, '').replace(/\./g, '').replace(',', '.')) || null
          : null,
        estoque: v.estoque ?? null,
        motivo: ['outro_cd', 'estoque_baixo', 'sem_preco'].includes(motivo)
          ? motivo
          : 'estoque_baixo',
        detalhe: 'Descartado na extração DOM (antes do match)',
      });
    }
  }
  return out;
}

function persistRejeitadosFromResults(fonte: string, results: unknown[]) {
  const itens: ItemRejeitado[] = [];
  let totalLidos = 0;
  let totalAceitos = 0;
  for (const raw of results) {
    const r = raw as {
      rejeitados?: ItemRejeitado[];
      itemsLidos?: number;
      itemsFound?: number;
      matched?: number;
    };
    if (Array.isArray(r.rejeitados)) itens.push(...r.rejeitados);
    totalLidos += Number(r.itemsLidos || r.itemsFound || 0);
    totalAceitos += Number(r.matched || 0);
  }
  if (!itens.length && !totalLidos) return null;
  return mergeAndSaveRejeitados({ fonte, totalLidos, totalAceitos, itens });
}

/** Grava HTMLs da captura em temp/ para reimport offline e debug */
export function persistScrapeHtmlDumps(
  blocos: Array<{ cd: string; slug: string; items: Array<Record<string, unknown>> }>
): string[] {
  const dir = path.join(process.cwd(), 'temp');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const saved: string[] = [];
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  for (const bloco of blocos) {
    for (const it of bloco.items || []) {
      const html = typeof it.html === 'string' ? it.html : '';
      if (html.length < 500) continue;
      const secao = String(it.secao || 'pagina')
        .replace(/[^a-z0-9_-]+/gi, '-')
        .slice(0, 48);
      const file = path.join(dir, `soollar-${bloco.slug}-${secao}-${stamp}.html`);
      fs.writeFileSync(file, html, 'utf8');
      saved.push(file);
    }
  }
  return saved;
}

export async function atualizarPrecosFromScrape(opts?: {
  cds?: string[];
  headless?: boolean;
  /** Default true: um login → todos os CDs pedidos */
  singleSession?: boolean;
  onLog?: (level: string, message: string, data?: unknown) => void;
}): Promise<{
  results: unknown[];
  stats: ReturnType<typeof getPrecosStats>;
}> {
  const results: unknown[] = [];
  const cds = opts?.cds?.length
    ? SOOLLAR_CDS.filter((c) => opts.cds!.some((x) => x === c.slug || x === c.nome || x === String(c.id)))
    : [...SOOLLAR_CDS];

  const singleSession = opts?.singleSession !== false;
  const logs: unknown[] = [];
  const log = createConsoleLogger((line) => {
    logs.push(line);
    opts?.onLog?.(line.level, line.message, line.data);
  });

  if (singleSession) {
    try {
      log('info', `V3 captura 1 sessão × ${cds.length} CD(s): ${cds.map((c) => c.nome).join(', ')}`);
      const r = await capturarSoolarComBrowser(log, {
        headless: opts?.headless !== false,
        cds: cds.map((c) => c.nome),
      });

      const blocos =
        r.porCd?.length
          ? r.porCd
          : cds.map((c) => ({
              cd: c.nome,
              slug: c.slug,
              items: (r.items || []).filter((it) => it.cdSlug === c.slug || it.cdNome === c.nome),
            }));

      const dumps = persistScrapeHtmlDumps(blocos);
      if (dumps.length) {
        log('ok', `HTML salvo em temp/: ${dumps.length} arquivo(s)`);
        results.push({ fonte: 'scrape-dump', files: dumps.map((f) => path.basename(f)) });
      }

      for (const bloco of blocos) {
        const items = extractItemsFromScrapePayload(bloco.items || []);
        const ignoradosDom = extractIgnoradosFromScrapePayload(bloco.items || [], bloco.cd);
        if (!items.length) {
          results.push({
            fonte: 'scrape',
            cd: bloco.cd,
            slug: bloco.slug,
            loggedIn: r.loggedIn,
            success: r.success,
            warning: 'nenhum produto com nome/preço útil (HTML)',
            itemsRaw: bloco.items?.length || 0,
            rejeitados: ignoradosDom,
            itemsLidos: ignoradosDom.length,
            matched: 0,
          });
          continue;
        }
        const applied = applyCatalogToCd(items, bloco.slug, `scrape:${bloco.slug}`, {
          autoCadastrarModulos: true,
        });
        const rejeitados = [...ignoradosDom, ...(applied.rejeitados || [])];
        results.push({
          fonte: 'scrape',
          cd: bloco.cd,
          slug: bloco.slug,
          loggedIn: r.loggedIn,
          itemsFound: items.length,
          unmatchedSample: applied.unmatched.slice(0, 8),
          ...applied,
          rejeitados,
        });
      }
    } catch (e) {
      results.push({
        fonte: 'scrape',
        error: e instanceof Error ? e.message : String(e),
      });
    }
    persistRejeitadosFromResults('scrape', results);
    return { results, stats: getPrecosStats() };
  }

  // Fallback: um browser por CD (legado)
  for (const cd of cds) {
    try {
      log('info', `V3 captura preços CD ${cd.nome} (${cd.slug})`);
      const r = await capturarSoolarComBrowser(log, {
        headless: opts?.headless !== false,
        cd: cd.nome,
      });
      const items = extractItemsFromScrapePayload(r.items || []);
      const ignoradosDom = extractIgnoradosFromScrapePayload(r.items || [], cd.nome);
      if (!items.length) {
        results.push({
          fonte: 'scrape',
          cd: cd.nome,
          slug: cd.slug,
          loggedIn: r.loggedIn,
          success: r.success,
          warning: 'nenhum produto com preço/estoque extraído',
          itemsRaw: r.items?.length || 0,
          rejeitados: ignoradosDom,
          itemsLidos: ignoradosDom.length,
          matched: 0,
        });
        continue;
      }
      const applied = applyCatalogToCd(items, cd.slug, `scrape:${cd.slug}`, {
        autoCadastrarModulos: true,
      });
      results.push({
        fonte: 'scrape',
        cd: cd.nome,
        slug: cd.slug,
        loggedIn: r.loggedIn,
        itemsFound: items.length,
        ...applied,
        rejeitados: [...ignoradosDom, ...(applied.rejeitados || [])],
      });
    } catch (e) {
      results.push({
        fonte: 'scrape',
        cd: cd.nome,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  persistRejeitadosFromResults('scrape', results);
  return { results, stats: getPrecosStats() };
}

export async function atualizarPrecosV3(opts?: {
  fonte?: CapturaFonte;
  cds?: string[];
  headless?: boolean;
  singleSession?: boolean;
  onLog?: (level: string, message: string, data?: unknown) => void;
}) {
  const fonte = opts?.fonte || 'temp';
  const allResults: unknown[] = [];
  let stats = getPrecosStats();

  if (fonte === 'temp' || fonte === 'both') {
    const r = await atualizarPrecosFromTemp();
    allResults.push(...r.results);
    stats = r.stats;
  }
  if (fonte === 'scrape' || fonte === 'both') {
    const r = await atualizarPrecosFromScrape(opts);
    allResults.push(...r.results);
    stats = r.stats;
  }

  // Snapshot unificada da última execução (temp e/ou scrape)
  if (fonte === 'both') {
    persistRejeitadosFromResults('both', allResults);
  }

  return { fonte, results: allResults, stats };
}
