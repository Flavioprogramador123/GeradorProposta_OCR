/**
 * Atualiza preços V3 sem Next (direto no SQLite) — dumps temp/
 * node scripts/v3-atualizar-precos-direct.js
 */
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const ROOT = path.join(__dirname, '..');
process.chdir(ROOT);

const DB_PATH = path.join(ROOT, 'data', 'v3', 'pieng_v3.sqlite');
const db = new Database(DB_PATH);
db.pragma('foreign_keys = ON');

const ESTOQUE_MIN = Number(
  (db.prepare(`SELECT valor_json FROM kits_regras WHERE chave='estoque_minimo_preco'`).get() || {}).valor_json || 20
);

function norm(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseMoney(raw) {
  if (raw == null) return null;
  if (typeof raw === 'number') return raw;
  const s = String(raw).replace(/R\$\s*/i, '').trim();
  if (/\d+\.\d{3},\d{2}/.test(s) || /\d+,\d{2}$/.test(s)) {
    const n = Number(s.replace(/\./g, '').replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  }
  const n = Number(s.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function loadEquip() {
  return db
    .prepare(
      `SELECT e.id, e.sku_interno, e.nome, e.marca, e.potencia_w, e.potencia_kw, e.categoria,
              GROUP_CONCAT(a.texto_match, '||') AS aliases
       FROM equipamentos e
       LEFT JOIN equipamento_aliases a ON a.equipamento_id = e.id
       WHERE e.ativo = 1 GROUP BY e.id`
    )
    .all()
    .map((e) => ({ ...e, aliases: (e.aliases || '').split('||').filter(Boolean) }));
}

function matchItem(item, equips) {
  const nItem = norm(item.nome);
  let best = { id: null, sku: null, score: 0, reason: '' };
  for (const c of equips) {
    let score = 0;
    let reason = '';
    const texts = [c.nome, c.sku_interno, ...c.aliases];
    for (const t of texts) {
      const nt = norm(t);
      if (!nt) continue;
      if (/^\d+W$/.test(nt) || /^\d+K(W)?/.test(nt)) continue;
      if (nItem === nt) {
        score = 100;
        reason = 'exact';
      } else if (nt.length >= 8 && (nItem.includes(nt) || nt.includes(nItem))) {
        if (score < 80) {
          score = 80;
          reason = 'contains';
        }
      }
    }
    if (c.marca && c.potencia_w) {
      if (nItem.includes(norm(c.marca)) && nItem.includes(String(Math.round(c.potencia_w)))) {
        if (score < 90) {
          score = 90;
          reason = 'marca+W';
        }
      }
    }
    if (c.marca && c.potencia_kw) {
      const pot = String(c.potencia_kw);
      if (nItem.includes(norm(c.marca)) && (nItem.includes(norm(pot)) || nItem.includes(pot.replace('.', '')))) {
        if (score < 88) {
          score = 88;
          reason = 'marca+kW';
        }
      }
    }
    if (c.categoria === 'cabo' && /CABO SOLAR/.test(nItem) && /4MM/.test(nItem) && /25/.test(nItem)) {
      if (/VERMELHO/.test(nItem) && c.sku_interno.includes('-V')) {
        score = 95;
        reason = 'caboV';
      }
      if (/PRETO/.test(nItem) && c.sku_interno.includes('-P')) {
        score = 95;
        reason = 'caboP';
      }
    }
    if (c.categoria === 'conector' && /MC4/.test(nItem)) {
      score = Math.max(score, 92);
      reason = 'mc4';
    }
    if (c.sku_interno === 'TRILHO-236' && /PERFIL|TRILHO/.test(nItem) && /2[,.]?(36|40)/.test(item.nome)) {
      score = Math.max(score, 90);
      reason = 'trilho';
    }
    if (c.sku_interno === 'KIT-ESTRUTURA-4MOD' && /KIT FIX/.test(nItem) && /4 MOD/.test(nItem)) {
      score = Math.max(score, 85);
      reason = 'kit4';
    }
    if (score > best.score) best = { id: c.id, sku: c.sku_interno, score, reason };
  }
  if (best.score < 75) return null;
  return best;
}

function upsert(equipamentoId, cdId, preco, estoque, fonte) {
  const valido = estoque != null && estoque > ESTOQUE_MIN && preco != null && preco > 0 ? 1 : 0;
  const capturadoEm = new Date().toISOString();
  db.prepare(
    `INSERT INTO precos_cd (equipamento_id, cd_id, preco_custo, estoque, capturado_em, fonte, valido_estoque)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(equipamento_id, cd_id) DO UPDATE SET
       preco_custo=excluded.preco_custo, estoque=excluded.estoque,
       capturado_em=excluded.capturado_em, fonte=excluded.fonte, valido_estoque=excluded.valido_estoque`
  ).run(equipamentoId, cdId, preco, estoque, capturadoEm, fonte, valido);
  db.prepare(
    `INSERT INTO precos_cd_historico (equipamento_id, cd_id, preco_custo, estoque, capturado_em, fonte)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(equipamentoId, cdId, preco, estoque, capturadoEm, fonte);
  return valido === 1;
}

function apply(items, cdName, fonte) {
  const cd = db.prepare('SELECT id, nome FROM cds WHERE nome = ? OR slug_portal = ?').get(cdName, cdName);
  if (!cd) throw new Error('CD não encontrado: ' + cdName);
  const equips = loadEquip();
  const byId = new Map();
  let unmatched = 0;
  for (const item of items) {
    const m = matchItem(item, equips);
    if (!m) {
      unmatched++;
      continue;
    }
    const prev = byId.get(m.id);
    if (!prev || (item.estoque || 0) > (prev.item.estoque || 0)) byId.set(m.id, { m, item });
  }
  let matched = 0;
  let validos = 0;
  const applied = [];
  for (const { m, item } of byId.values()) {
    const ok = upsert(m.id, cd.id, item.preco, item.estoque, fonte);
    matched++;
    if (ok) validos++;
    applied.push({ sku: m.sku, preco: item.preco, estoque: item.estoque, valido: ok, reason: m.reason });
  }
  return { cd: cd.nome, matched, validos, unmatched, applied };
}

// Feira JSON
const feiraJson = path.join(ROOT, 'temp', '_feira_produtos.json');
const results = [];
if (fs.existsSync(feiraJson)) {
  const raw = JSON.parse(fs.readFileSync(feiraJson, 'utf8'));
  const items = (raw.products || []).map((p) => ({
    nome: p.nome,
    preco: parseMoney(p.preco),
    estoque: p.estoque ?? null,
  }));
  results.push({ fonte: 'feira-json', items: items.length, ...apply(items, 'Feira de Santana', 'json:_feira_produtos') });
}

// Feira HTML fallback
const feiraHtml = path.join(ROOT, 'temp', 'Soollar Distribuidora_feira.html');
if (fs.existsSync(feiraHtml) && !(results[0] && results[0].matched > 0)) {
  // skip heavy parse if JSON worked
}

const stats = {
  precos: db.prepare('SELECT COUNT(*) c FROM precos_cd').get().c,
  validos: db.prepare('SELECT COUNT(*) c FROM precos_cd WHERE valido_estoque=1').get().c,
  porCd: db
    .prepare(
      `SELECT c.nome, COUNT(p.id) total, SUM(CASE WHEN p.valido_estoque=1 THEN 1 ELSE 0 END) validos
       FROM cds c LEFT JOIN precos_cd p ON p.cd_id=c.id GROUP BY c.id ORDER BY c.codigo`
    )
    .all(),
};

console.log(JSON.stringify({ ok: true, estoqueMin: ESTOQUE_MIN, results, stats }, null, 2));
db.close();
