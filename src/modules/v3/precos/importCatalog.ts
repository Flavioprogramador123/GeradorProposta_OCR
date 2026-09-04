import fs from 'fs';
import path from 'path';
import { matchMany, type CatalogItem } from './matcher';
import { resolveCdId, upsertPrecoCd } from './repository';
import { upsertBySkuInterno } from '../equipamentos/repository';
import { SOOLLAR_ESTOQUE_MINIMO } from '@/lib/soollar/scraper';
import type { ItemRejeitado, MotivoRejeicao } from './rejeitadosCaptura';

export type { CatalogItem };

function parseMoney(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const s = String(raw).replace(/R\$\s*/i, '').trim();
  // 1.234,56 ou 1234.56
  if (/\d+\.\d{3},\d{2}/.test(s) || /\d+,\d{2}$/.test(s)) {
    const n = Number(s.replace(/\./g, '').replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  }
  const n = Number(s.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/** R$ por kWp a partir do preço unitário do módulo */
export function custoRsPorKwp(precoUnit: number | null | undefined, potenciaW: number | null | undefined): number | null {
  if (precoUnit == null || !potenciaW || potenciaW <= 0) return null;
  return Math.round((precoUnit / (potenciaW / 1000)) * 100) / 100;
}

function inferirModuloDoNome(nome: string): { potencia_w: number; marca: string; sku: string } | null {
  if (/Adicionar\s*R\$/i.test(nome)) return null;
  const potM = nome.match(/(\d{3,4})\s*w/i);
  if (!potM) return null;
  const potencia_w = Number(potM[1]);
  if (potencia_w < 400 || potencia_w > 900) return null;
  if (!/m[oó]dulo|painel|fotov/i.test(nome) && !/\bN-?TYPE\b/i.test(nome)) {
    // ainda aceita se parece módulo solar por potência típica
    if (potencia_w < 500) return null;
  }
  const marcas = [
    'TSUN',
    'RENEPV',
    'ZNSHINE',
    'ASTRONERGY',
    'HANERSUN',
    'JA SOLAR',
    'JINKO',
    'CANADIAN',
    'TRINA',
    'LONGI',
    'RISEN',
  ];
  const upper = nome.toUpperCase();
  let marca = 'GEN';
  for (const m of marcas) {
    if (upper.includes(m)) {
      marca = m.replace(/\s+/g, '');
      break;
    }
  }
  const sku = `MOD-AUTO-${marca}-${potencia_w}`.slice(0, 48);
  return { potencia_w, marca, sku };
}

export function dedupeCatalogItems(items: CatalogItem[]): CatalogItem[] {
  const seen = new Set<string>();
  const uniq: CatalogItem[] = [];
  for (const p of items) {
    if (!p.nome || /Adicionar\s*R\$/i.test(p.nome)) continue;
    const k = `${p.nome}|${p.preco}|${p.estoque}`;
    if (seen.has(k)) continue;
    seen.add(k);
    uniq.push(p);
  }
  return uniq;
}

/** Parse HTML salvo do portal (mesmo padrão da Feira). */
export function parseProductsFromHtml(html: string): CatalogItem[] {
  // 1) Preferência: data-testid oficiais (product-card / product-name / product-price)
  const fromTestIds = parseProductsFromTestIds(html);
  if (fromTestIds.length) return fromTestIds;

  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, '\n')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\n+/g, '\n')
    .trim();

  const lines = text
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  const estoqueIdx: number[] = [];
  lines.forEach((l, i) => {
    if (/Estoque dispon/i.test(l)) estoqueIdx.push(i);
  });

  const imgAlts = Array.from(html.matchAll(/alt="Imagem do produto\s+([^"]+)"/gi)).map((m) => m[1].trim());
  const products: CatalogItem[] = [];

  for (let idx = 0; idx < estoqueIdx.length; idx++) {
    const i = estoqueIdx[idx];
    const estMatch = lines[i].match(/Estoque dispon[ií]vel:\s*(\d+)/i);
    if (!estMatch) continue;
    const estoque = Number(estMatch[1]);
    const window = lines.slice(Math.max(0, i - 20), i + 1);
    const joined = window.join(' ');
    const prices = Array.from(joined.matchAll(/R\$\s*[\d.]+(?:,\d{2})?/g));
    const precoStr = prices.length ? prices[prices.length - 1][0] : null;

    const candidates = window.filter(
      (l) =>
        l.length > 8 &&
        l.length < 160 &&
        !/^R\$/.test(l) &&
        !/Estoque/i.test(l) &&
        !/Adicionar|Comprar|Carrinho|Filtro|Buscar|Login|Trocar CD|Ordenar|produtos encontrados/i.test(l) &&
        !/^\d+$/.test(l) &&
        !/^UNIDADE/i.test(l) &&
        !/^\(\d+\)$/.test(l)
    );
    let nome = candidates.length ? candidates[candidates.length - 1] : null;
    if ((!nome || nome.length < 10) && imgAlts[idx]) nome = imgAlts[idx];
    if (!nome) continue;

    const codigoMatch = joined.match(/\b(\d{5,7})\b/);
    products.push({
      nome,
      preco: parseMoney(precoStr),
      estoque,
      codigo: codigoMatch?.[1] || null,
    });
  }

  return dedupeCatalogItems(products);
}

/**
 * Extrai cards SOOLLAR:
 *   data-testid="product-card"
 *     product-name  → MODULO 600W N-TYPE TSUN …
 *     <p>574558</p> → código portal
 *     product-price → R$ 492,00
 *     Estoque disponível: 1390
 */
export function parseProductsFromTestIds(html: string): CatalogItem[] {
  if (!/data-testid="product-card"/i.test(html)) return [];

  const products: CatalogItem[] = [];
  const parts = html.split(/data-testid="product-card"/i);
  for (let i = 1; i < parts.length; i++) {
    const chunk = parts[i].slice(0, 12000);

    const nameMatch =
      chunk.match(/data-testid="product-name"[^>]*>([^<]+)</i) ||
      chunk.match(/alt="Imagem do produto\s+([^"]+)"/i);
    const priceMatch = chunk.match(/data-testid="product-price"[^>]*>\s*(R\$\s*[\d.,]+)\s*</i);
    const estMatch = chunk.match(/Estoque dispon[ií]vel:\s*(\d+)/i);
    // Código numérico logo após product-name (ex. 574558)
    const codigoAposNome = chunk.match(
      /data-testid="product-name"[^>]*>[^<]+<\/p>\s*<p[^>]*>\s*(\d{5,7})\s*<\/p>/i
    );
    const outroCd = /apenas em outro\s*cd/i.test(chunk);
    const checkAvail = /data-testid="check-availability-button"/i.test(chunk);

    const nome = nameMatch?.[1]?.replace(/\s+/g, ' ').trim();
    if (!nome || nome.length < 4) continue;

    let estoque: number | null = estMatch ? Number(estMatch[1]) : null;
    if (outroCd || checkAvail) estoque = null;

    products.push({
      nome,
      preco: parseMoney(priceMatch?.[1]),
      estoque,
      codigo: codigoAposNome?.[1] || chunk.match(/\b(\d{5,7})\b/)?.[1] || null,
    });
  }

  return dedupeCatalogItems(products);
}

export function importFromFeiraJson(filePath?: string): CatalogItem[] {
  const p =
    filePath ||
    path.join(process.cwd(), 'temp', '_feira_produtos.json');
  if (!fs.existsSync(p)) return [];
  const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
  const list = raw.products || raw.items || [];
  return list.map((x: { nome?: string; preco?: string | number; estoque?: number; codigo?: string }) => ({
    nome: String(x.nome || ''),
    preco: typeof x.preco === 'number' ? x.preco : parseMoney(String(x.preco || '')),
    estoque: x.estoque ?? null,
    codigo: x.codigo || null,
  }));
}

function classificarUnmatched(
  nome: string,
  score: number,
  reason: string,
  item: CatalogItem | undefined
): { motivo: MotivoRejeicao; detalhe: string } {
  const est = item?.estoque ?? null;
  const preco = item?.preco ?? null;
  if (preco == null) {
    return { motivo: 'sem_preco', detalhe: reason || 'sem preço no card' };
  }
  if (est == null || est <= SOOLLAR_ESTOQUE_MINIMO) {
    return {
      motivo: 'estoque_baixo',
      detalhe: `estoque ${est ?? 'null'} ≤ ${SOOLLAR_ESTOQUE_MINIMO} · ${reason || 'sem match'}`,
    };
  }
  if (/baixo\(/i.test(reason)) {
    return { motivo: 'score_baixo', detalhe: reason };
  }
  if (!inferirModuloDoNome(nome)) {
    return { motivo: 'nao_modulo_auto', detalhe: reason || 'não reconhecido como módulo Wp/marca' };
  }
  return { motivo: 'sem_match', detalhe: reason || `score ${score}` };
}

export function applyCatalogToCd(
  items: CatalogItem[],
  cd: string | number,
  fonte: string,
  opts?: { autoCadastrarModulos?: boolean }
): {
  cdId: number;
  matched: number;
  validos: number;
  autoCriados: number;
  unmatched: Array<{ nome: string; score: number; reason: string }>;
  rejeitados: ItemRejeitado[];
  itemsLidos: number;
  applied: Array<{
    sku: string;
    preco: number | null;
    estoque: number | null;
    valido: boolean;
    rs_por_kwp?: number | null;
  }>;
} {
  const cdId = resolveCdId(cd);
  if (!cdId) throw new Error(`CD não encontrado: ${cd}`);
  const cdLabel = String(cd);

  const limpos = dedupeCatalogItems(items);
  const matches = matchMany(limpos.filter((i) => i.nome));
  const unmatched: Array<{ nome: string; score: number; reason: string }> = [];
  const applied: Array<{
    sku: string;
    preco: number | null;
    estoque: number | null;
    valido: boolean;
    rs_por_kwp?: number | null;
  }> = [];
  const aceitosNomes = new Set<string>();
  let matched = 0;
  let validos = 0;
  let autoCriados = 0;

  const bySku = new Map<number, (typeof matches)[0]>();
  for (const m of matches) {
    if (!m.equipamentoId) {
      unmatched.push({ nome: m.item.nome, score: m.score, reason: m.reason });
      continue;
    }
    const prev = bySku.get(m.equipamentoId);
    if (!prev || (m.item.estoque || 0) > (prev.item.estoque || 0)) {
      bySku.set(m.equipamentoId, m);
    }
  }

  // Auto-cadastro: módulos com estoque > mínimo e Wp no nome
  if (opts?.autoCadastrarModulos !== false) {
    // Preferir nome sem "PREVISÃO" quando há várias ofertas do mesmo SKU
    const autoBySku = new Map<
      string,
      { nome: string; preco: number; estoque: number; potencia_w: number; marca: string; created?: boolean }
    >();

    for (const u of [...unmatched]) {
      const est = limpos.find((i) => i.nome === u.nome)?.estoque ?? null;
      const preco = limpos.find((i) => i.nome === u.nome)?.preco ?? null;
      if (est == null || est <= SOOLLAR_ESTOQUE_MINIMO || preco == null) continue;
      const inf = inferirModuloDoNome(u.nome);
      if (!inf) continue;

      const prev = autoBySku.get(inf.sku);
      const preferThis =
        !prev ||
        (/PREVIS/.test(prev.nome) && !/PREVIS/.test(u.nome)) ||
        ((/PREVIS/.test(prev.nome) === /PREVIS/.test(u.nome)) && est > prev.estoque);
      if (!preferThis) continue;

      autoBySku.set(inf.sku, {
        nome: u.nome,
        preco,
        estoque: est,
        potencia_w: inf.potencia_w,
        marca: inf.marca,
      });
    }

    for (const [sku, row] of autoBySku) {
      const { id, created } = upsertBySkuInterno({
        sku_interno: sku,
        nome: row.nome.slice(0, 180),
        marca: row.marca,
        categoria: 'modulo',
        potencia_w: row.potencia_w,
        ativo: true,
        prioridade_kit: 80,
        aliases: [
          row.nome.slice(0, 120),
          `${row.marca} ${row.potencia_w}W`,
          `MODULO ${row.potencia_w}W ${row.marca}`,
        ],
      });
      if (created) autoCriados++;
      const r = upsertPrecoCd({
        equipamentoId: id,
        cdId,
        precoCusto: row.preco,
        estoque: row.estoque,
        fonte,
      });
      matched++;
      if (r.valido) validos++;
      aceitosNomes.add(row.nome);
      applied.push({
        sku,
        preco: row.preco,
        estoque: row.estoque,
        valido: r.valido,
        rs_por_kwp: custoRsPorKwp(row.preco, row.potencia_w),
      });
    }
  }

  for (const m of Array.from(bySku.values())) {
    const r = upsertPrecoCd({
      equipamentoId: m.equipamentoId!,
      cdId,
      precoCusto: m.item.preco,
      estoque: m.item.estoque,
      fonte,
    });
    matched++;
    if (r.valido) validos++;
    aceitosNomes.add(m.item.nome);
    const pot =
      (m as { potencia_w?: number }).potencia_w ||
      Number(String(m.item.nome).match(/(\d{3,4})\s*w/i)?.[1] || 0) ||
      null;
    applied.push({
      sku: m.skuInterno!,
      preco: m.item.preco,
      estoque: m.item.estoque,
      valido: r.valido,
      rs_por_kwp: custoRsPorKwp(m.item.preco, pot),
    });
  }

  const rejeitados: ItemRejeitado[] = [];
  for (const u of unmatched) {
    if (aceitosNomes.has(u.nome)) continue;
    const item = limpos.find((i) => i.nome === u.nome);
    const { motivo, detalhe } = classificarUnmatched(u.nome, u.score, u.reason, item);
    rejeitados.push({
      cd: cdLabel,
      nome: u.nome,
      preco: item?.preco ?? null,
      estoque: item?.estoque ?? null,
      codigo: item?.codigo ?? null,
      motivo,
      detalhe,
      score: u.score,
    });
  }

  return {
    cdId,
    matched,
    validos,
    autoCriados,
    unmatched: unmatched.slice(0, 40),
    rejeitados,
    itemsLidos: limpos.length,
    applied,
  };
}

export function importHtmlFileToCd(htmlPath: string, cd: string | number, fonte?: string) {
  const abs = path.isAbsolute(htmlPath) ? htmlPath : path.join(process.cwd(), htmlPath);
  if (!fs.existsSync(abs)) throw new Error(`HTML não encontrado: ${abs}`);
  const html = fs.readFileSync(abs, 'utf8');
  const items = parseProductsFromHtml(html);
  return {
    path: abs,
    itemsFound: items.length,
    ...applyCatalogToCd(items, cd, fonte || `html:${path.basename(abs)}`),
  };
}

export function importFeiraJsonToCd(cd: string | number = 'Feira de Santana') {
  const items = importFromFeiraJson();
  return {
    path: path.join(process.cwd(), 'temp', '_feira_produtos.json'),
    itemsFound: items.length,
    ...applyCatalogToCd(items, cd, 'json:_feira_produtos.json'),
  };
}
