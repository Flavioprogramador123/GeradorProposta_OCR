/**
 * Seed V3 sem TypeScript — cria data/v3/pieng_v3.sqlite a partir do YAML.
 * Uso: node scripts/v3-seed.js
 */
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const Database = require('better-sqlite3');

const ROOT = path.join(__dirname, '..');
const DB_PATH = process.env.V3_SQLITE_PATH
  ? path.isAbsolute(process.env.V3_SQLITE_PATH)
    ? process.env.V3_SQLITE_PATH
    : path.join(ROOT, process.env.V3_SQLITE_PATH)
  : path.join(ROOT, 'data', 'v3', 'pieng_v3.sqlite');
const YAML_PATH = process.env.V3_SEED_YAML
  ? path.isAbsolute(process.env.V3_SEED_YAML)
    ? process.env.V3_SEED_YAML
    : path.join(ROOT, process.env.V3_SEED_YAML)
  : path.join(ROOT, 'temp', 'orcamento_executados.yaml');
const SCHEMA = fs.readFileSync(path.join(ROOT, 'src', 'modules', 'v3', 'db', 'schema.sql'), 'utf8');

function slugify(parts) {
  return parts
    .filter(Boolean)
    .join('-')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toUpperCase();
}

function parseW(raw) {
  if (raw == null) return null;
  const s = String(raw).toUpperCase().replace(',', '.');
  const m = s.match(/(\d+(?:\.\d+)?)\s*W/);
  return m ? parseFloat(m[1]) : null;
}

function parseKw(raw) {
  if (raw == null) return null;
  const s = String(raw).toUpperCase().replace(',', '.');
  const m = s.match(/(\d+(?:\.\d+)?)\s*K/);
  return m ? parseFloat(m[1]) : null;
}

function extractDocs(raw) {
  return raw
    .split(/\n(?=cliente:\s*\n)/)
    .map((c) => c.trim())
    .filter((c) => c.startsWith('cliente:'))
    .map((chunk) => {
      try {
        return yaml.load(chunk);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.exec(SCHEMA);

const cdsCount = db.prepare('SELECT COUNT(*) AS c FROM cds').get().c;
if (cdsCount === 0) {
  const ins = db.prepare(
    'INSERT INTO cds (id, codigo, nome, slug_portal, ativo) VALUES (@id, @codigo, @nome, @slug_portal, 1)'
  );
  [
    { id: 1, codigo: 1, nome: 'Aeroporto', slug_portal: 'cdaeroportogo' },
    { id: 2, codigo: 2, nome: 'Matriz', slug_portal: 'cdgoiania' },
    { id: 3, codigo: 3, nome: 'Feira de Santana', slug_portal: 'cdfeiradesantanaba' },
  ].forEach((c) => ins.run(c));
}

const regrasCount = db.prepare('SELECT COUNT(*) AS c FROM kits_regras').get().c;
if (regrasCount === 0) {
  const ins = db.prepare(
    'INSERT INTO kits_regras (chave, valor_json, descricao) VALUES (@chave, @valor_json, @descricao)'
  );
  [
    { chave: 'estrutura_modulos_por_kit', valor_json: '4', descricao: 'Kit estrutura = 4 módulos' },
    { chave: 'estoque_minimo_preco', valor_json: '20', descricao: 'Preço válido se estoque > 20' },
    { chave: 'cabo_25m_por_string', valor_json: '1', descricao: '1 par cabo 25m por string' },
  ].forEach((r) => ins.run(r));
}

if (!fs.existsSync(YAML_PATH)) {
  console.error('YAML não encontrado:', YAML_PATH);
  process.exit(1);
}

const docs = extractDocs(fs.readFileSync(YAML_PATH, 'utf8'));
const map = new Map();

for (const doc of docs) {
  const lista = doc?.consolidado_orcamentos_distribuidores?.soollar_distribuidora || [];
  for (const item of lista) {
    const orc = item.orcamento;
    if (!orc) continue;
    for (const mod of orc.modulos || []) {
      const marca = (mod.marca || 'GEN').trim();
      const pot = (mod.potencia_unitaria || '').trim();
      const w = parseW(pot);
      const sku = slugify(['MOD', marca, pot || w]);
      if (!sku) continue;
      map.set(sku, {
        sku_interno: sku,
        nome: `MODULO ${pot || `${w}W`} ${marca}`.replace(/\s+/g, ' ').trim(),
        marca,
        categoria: 'modulo',
        potencia_w: w,
        potencia_kw: null,
        prioridade_kit: 10,
        aliases: [pot, `${marca} ${pot}`].filter(Boolean),
      });
    }
    for (const inv of orc.inversores || []) {
      const marca = (inv.marca || 'GEN').trim();
      const pot = (inv.potencia_unitaria || '').trim();
      const kw = parseKw(pot);
      const micro = /2\.25|G4|MICRO/i.test(pot) || (marca.toUpperCase().includes('DEYE') && /2\.25/.test(pot));
      const sku = slugify([micro ? 'MICRO' : 'INV', marca, pot || kw]);
      if (!sku) continue;
      map.set(sku, {
        sku_interno: sku,
        nome: `${micro ? 'MICRO-INVERSOR' : 'INVERSOR'} ${marca} ${pot}`.replace(/\s+/g, ' ').trim(),
        marca,
        categoria: micro ? 'microinversor' : 'inversor',
        potencia_w: null,
        potencia_kw: kw,
        prioridade_kit: micro ? 20 : 30,
        aliases: [pot, `${marca} ${pot}`].filter(Boolean),
      });
    }
  }
}

[
  {
    sku_interno: 'KIT-ESTRUTURA-4MOD',
    nome: 'KIT FIXAÇÃO PARA 4 MODULOS (padrão SOOLLAR)',
    marca: null,
    categoria: 'estrutura',
    potencia_w: null,
    potencia_kw: null,
    prioridade_kit: 40,
    aliases: ['kit estrutura 4 modulos'],
  },
  {
    sku_interno: 'TRILHO-236',
    nome: 'PERFIL / TRILHO FIXAÇÃO ~2,36MT',
    marca: null,
    categoria: 'estrutura',
    potencia_w: null,
    potencia_kw: null,
    prioridade_kit: 41,
    aliases: ['perfil 2,40'],
  },
  {
    sku_interno: 'CABO-4MM-25-V',
    nome: 'CABO SOLAR 4MM VERMELHO - 25MT',
    marca: null,
    categoria: 'cabo',
    potencia_w: null,
    potencia_kw: null,
    prioridade_kit: 50,
    aliases: ['CABO SOLAR 4MM VERMELHO - 25MT'],
  },
  {
    sku_interno: 'CABO-4MM-25-P',
    nome: 'CABO SOLAR 4MM PRETO - 25MT',
    marca: null,
    categoria: 'cabo',
    potencia_w: null,
    potencia_kw: null,
    prioridade_kit: 51,
    aliases: ['CABO SOLAR 4MM PRETO - 25MT'],
  },
  {
    sku_interno: 'MC4-PAR',
    nome: 'CONECTOR SOLAR MC4 MACHO E FEMEA COM 2 PARES',
    marca: null,
    categoria: 'conector',
    potencia_w: null,
    potencia_kw: null,
    prioridade_kit: 60,
    aliases: ['MC4'],
  },
].forEach((a) => map.set(a.sku_interno, a));

const upsert = db.prepare(`
  INSERT INTO equipamentos (sku_interno, sku_soollar, nome, marca, categoria, potencia_w, potencia_kw, especificacao_json, ativo, prioridade_kit)
  VALUES (@sku_interno, NULL, @nome, @marca, @categoria, @potencia_w, @potencia_kw, '{}', 1, @prioridade_kit)
  ON CONFLICT(sku_interno) DO UPDATE SET
    nome=excluded.nome, marca=excluded.marca, categoria=excluded.categoria,
    potencia_w=excluded.potencia_w, potencia_kw=excluded.potencia_kw,
    prioridade_kit=excluded.prioridade_kit, updated_at=datetime('now')
`);
const getId = db.prepare('SELECT id FROM equipamentos WHERE sku_interno = ?');
const delAlias = db.prepare('DELETE FROM equipamento_aliases WHERE equipamento_id = ?');
const insAlias = db.prepare(
  'INSERT OR IGNORE INTO equipamento_aliases (equipamento_id, texto_match) VALUES (?, ?)'
);

let n = 0;
const tx = db.transaction(() => {
  for (const item of map.values()) {
    upsert.run(item);
    const id = getId.get(item.sku_interno).id;
    delAlias.run(id);
    for (const a of item.aliases || []) {
      if (a && String(a).trim()) insAlias.run(id, String(a).trim());
    }
    n++;
  }
});
tx();

const stats = db
  .prepare('SELECT categoria, COUNT(*) AS c FROM equipamentos WHERE ativo=1 GROUP BY categoria')
  .all();
console.log(
  JSON.stringify(
    {
      ok: true,
      dbPath: DB_PATH,
      yamlPath: YAML_PATH,
      docsYaml: docs.length,
      equipamentos: n,
      porCategoria: stats,
    },
    null,
    2
  )
);
db.close();
