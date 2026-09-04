import { getV3Db } from '../db/sqlite';

export interface CatalogItem {
  nome: string;
  preco: number | null;
  estoque: number | null;
  codigo?: string | null;
}

export interface MatchResult {
  item: CatalogItem;
  equipamentoId: number | null;
  skuInterno: string | null;
  score: number;
  reason: string;
}

function norm(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokens(s: string): string[] {
  return norm(s)
    .split(' ')
    .filter((t) => t.length >= 2 && !['DE', 'DO', 'DA', 'COM', 'PARA', 'UN', 'UND', 'MT', 'MM'].includes(t));
}

/** Score simples: aliases / nome / marca+potência */
export function matchCatalogItem(item: CatalogItem): MatchResult {
  const db = getV3Db();
  const nItem = norm(item.nome);
  const itemTokens = new Set(tokens(item.nome));

  const candidates = db
    .prepare(
      `SELECT e.id, e.sku_interno, e.nome, e.marca, e.potencia_w, e.potencia_kw, e.categoria,
              GROUP_CONCAT(a.texto_match, '||') AS aliases
       FROM equipamentos e
       LEFT JOIN equipamento_aliases a ON a.equipamento_id = e.id
       WHERE e.ativo = 1
       GROUP BY e.id`
    )
    .all() as Array<{
    id: number;
    sku_interno: string;
    nome: string;
    marca: string | null;
    potencia_w: number | null;
    potencia_kw: number | null;
    categoria: string;
    aliases: string | null;
  }>;

  let best: MatchResult = {
    item,
    equipamentoId: null,
    skuInterno: null,
    score: 0,
    reason: 'sem match',
  };

  for (const c of candidates) {
    let score = 0;
    let reason = '';
    const aliasList = (c.aliases || '').split('||').filter(Boolean);
    const texts = [c.nome, c.sku_interno, ...aliasList];

    for (const t of texts) {
      const nt = norm(t);
      if (!nt) continue;
      // Ignora alias fraco só com potência (ex.: "630W") — exige marca
      if (/^\d+W$/.test(nt) || /^\d+K(W)?/.test(nt)) continue;
      if (nItem === nt) {
        score = Math.max(score, 100);
        reason = `exact:${t}`;
      }       else if (nt.length >= 8 && (nItem.includes(nt) || nt.includes(nItem))) {
        // Evita alias genérico "PERFIL 2 40" casar kit junção
        if (/PERFIL|TRILHO/.test(nt) && /2\s*40/.test(nt) && c.sku_interno === 'TRILHO-236') {
          continue;
        }
        score = Math.max(score, 80);
        reason = `contains:${t}`;
      }
    }

    // Marca + potência W
    if (c.marca && c.potencia_w) {
      const marca = norm(c.marca);
      const pot = String(Math.round(c.potencia_w));
      if (nItem.includes(marca) && nItem.includes(pot)) {
        score = Math.max(score, 90);
        reason = `marca+Wp:${c.marca}/${c.potencia_w}`;
      }
    }

    // Marca + kW (inversor)
    if (c.marca && c.potencia_kw) {
      const marca = norm(c.marca);
      const pot = String(c.potencia_kw).replace('.', ' ');
      const pot2 = String(c.potencia_kw).replace('.', '');
      if (nItem.includes(marca) && (nItem.includes(norm(String(c.potencia_kw))) || nItem.includes(pot2) || nItem.includes(pot))) {
        score = Math.max(score, 88);
        reason = `marca+kW:${c.marca}/${c.potencia_kw}`;
      }
    }

    // Token overlap
    const cTokens = new Set(tokens([c.nome, c.marca || '', ...aliasList].join(' ')));
    let overlap = 0;
    for (const t of itemTokens) if (cTokens.has(t)) overlap++;
    if (overlap >= 3) {
      const s = 50 + overlap * 5;
      if (s > score) {
        score = s;
        reason = `tokens:${overlap}`;
      }
    }

    // Cabos / MC4 / perfil por palavras-chave fortes
    if (c.categoria === 'cabo') {
      if (/CABO\s*SOLAR/.test(nItem) && /4MM/.test(nItem) && /25/.test(nItem)) {
        if (/VERMELHO|VERMELHA/.test(nItem) && c.sku_interno.includes('-V')) {
          score = Math.max(score, 95);
          reason = 'cabo-4mm-25-v';
        }
        if (/PRETO|PRETA/.test(nItem) && c.sku_interno.includes('-P')) {
          score = Math.max(score, 95);
          reason = 'cabo-4mm-25-p';
        }
      }
    }
    if (c.categoria === 'conector' && /MC4/.test(nItem) && /MACHO|FEMEA|PAR/.test(nItem)) {
      score = Math.max(score, 92);
      reason = 'mc4';
    }
    // nItem normalizado: "2.36M" → "2 36M" (ponto vira espaço)
    if (
      c.sku_interno === 'TRILHO-236' &&
      /PERFIL|TRILHO/.test(nItem) &&
      /2\s*36/.test(nItem) &&
      !/JUNCAO|2\s*40|2\s*50|2\s*70/.test(nItem)
    ) {
      score = Math.max(score, 90);
      reason = 'trilho-236';
    }
    if (
      c.sku_interno === 'TRILHO-250' &&
      /PERFIL|TRILHO/.test(nItem) &&
      /2\s*50/.test(nItem)
    ) {
      score = Math.max(score, 90);
      reason = 'trilho-250';
    }
    if (
      c.sku_interno === 'KIT-ESTRUTURA-4MOD' &&
      (/KIT FIX/.test(nItem) ||
        /KIT.*ESTRUTURA/.test(nItem) ||
        /FIXACAO/.test(nItem) ||
        /FIXA/.test(nItem)) &&
      (/4\s*MOD/.test(nItem) || /PARA\s*4\s*M/.test(nItem)) &&
      !/MICROINVERSOR|GRAMPO|GARRA|JUNCAO/.test(nItem)
    ) {
      score = Math.max(score, 90);
      reason = 'kit-4mod';
    }

    if (score > best.score) {
      // Módulo: não casar potências diferentes (ex. 625W → MOD-…-630)
      if (c.categoria === 'modulo') {
        const potItem = nItem.match(/\b(\d{3,4})\s*W\b/) || nItem.match(/(\d{3,4})W/);
        const potCand =
          c.potencia_w ||
          Number(String(c.sku_interno).match(/(\d{3,4})\s*$/)?.[1] || 0) ||
          Number(String(c.nome).match(/(\d{3,4})\s*W/i)?.[1] || 0) ||
          null;
        if (potItem && potCand) {
          const pw = Number(potItem[1]);
          if (Number.isFinite(pw) && Number.isFinite(potCand) && Math.abs(pw - potCand) >= 5) {
            continue;
          }
        }
      }
      best = {
        item,
        equipamentoId: c.id,
        skuInterno: c.sku_interno,
        score,
        reason,
      };
    }
  }

  // limiar mínimo
  if (best.score < 75) {
    return { ...best, equipamentoId: null, skuInterno: null, reason: `baixo(${best.score}:${best.reason})` };
  }
  return best;
}

export function matchMany(items: CatalogItem[]): MatchResult[] {
  return items.map(matchCatalogItem);
}
