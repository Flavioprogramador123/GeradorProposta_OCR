/**
 * SQLite V3 — isolado da produção.
 * Só carrega better-sqlite3 no servidor (API routes).
 * Em Vercel: DB em /tmp (efêmero); schema embutido no bundle.
 */
import fs from 'fs';
import path from 'path';
import { getV3DataDir, isV3ServerlessFs } from './paths';
import { V3_SCHEMA_SQL } from './schema';

export const V3_ENABLED = process.env.V3_ENABLED !== 'false';

export function getV3DbPath() {
  const custom = (process.env.V3_SQLITE_PATH || '').trim();
  if (custom) {
    return path.isAbsolute(custom) ? custom : path.join(process.cwd(), custom);
  }
  return path.join(getV3DataDir(), 'pieng_v3.sqlite');
}

type Database = import('better-sqlite3').Database;

let cached: Database | null = null;

function loadBetterSqlite3(): typeof import('better-sqlite3') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('better-sqlite3');
}

export function getV3Db(): Database {
  if (cached) {
    cached.exec(V3_SCHEMA_SQL);
    return cached;
  }

  const dbPath = getV3DbPath();
  try {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(
      `V3: não foi possível criar diretório do SQLite (${path.dirname(dbPath)}): ${msg}` +
        (isV3ServerlessFs() ? ' [serverless]' : '')
    );
  }

  let DatabaseCtor: typeof import('better-sqlite3');
  try {
    DatabaseCtor = loadBetterSqlite3();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(
      `V3: better-sqlite3 indisponível neste ambiente. Instale localmente (npm i better-sqlite3). Detalhe: ${msg}`
    );
  }

  const db = new DatabaseCtor(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(V3_SCHEMA_SQL);

  seedCdsIfEmpty(db);
  seedRegrasIfEmpty(db);

  cached = db;
  return db;
}

function seedCdsIfEmpty(db: Database) {
  const count = db.prepare('SELECT COUNT(*) AS c FROM cds').get() as { c: number };
  if (count.c > 0) return;
  const insert = db.prepare(
    'INSERT INTO cds (id, codigo, nome, slug_portal, ativo) VALUES (@id, @codigo, @nome, @slug_portal, 1)'
  );
  const cds = [
    { id: 1, codigo: 1, nome: 'Aeroporto', slug_portal: 'cdaeroportogo' },
    { id: 2, codigo: 2, nome: 'Matriz', slug_portal: 'cdgoiania' },
    { id: 3, codigo: 3, nome: 'Feira de Santana', slug_portal: 'cdfeiradesantanaba' },
  ];
  const tx = db.transaction(() => {
    for (const c of cds) insert.run(c);
  });
  tx();
}

function seedRegrasIfEmpty(db: Database) {
  const count = db.prepare('SELECT COUNT(*) AS c FROM kits_regras').get() as { c: number };
  if (count.c > 0) return;
  const insert = db.prepare(
    'INSERT INTO kits_regras (chave, valor_json, descricao) VALUES (@chave, @valor_json, @descricao)'
  );
  const regras = [
    {
      chave: 'estrutura_modulos_por_kit',
      valor_json: '4',
      descricao: 'Cada kit de estrutura SOOLLAR comporta 4 módulos',
    },
    {
      chave: 'trilho_236_ate_wp',
      valor_json: '690',
      descricao: 'Trilho 2,36 m até ~690 Wp',
    },
    {
      chave: 'trilho_250_apartir_wp',
      valor_json: '700',
      descricao: 'Trilho 2,50 m a partir de ~700 Wp',
    },
    {
      chave: 'cabo_25m_por_string',
      valor_json: '1',
      descricao: 'String: 1 rolo vermelho + 1 preto de 25 m por string',
    },
    {
      chave: 'mc4_pares_por_kit',
      valor_json: '2',
      descricao: 'Cada SKU MC4-PAR vem com 2 pares (usado no cálculo de kits no micro)',
    },
    {
      chave: 'estoque_minimo_preco',
      valor_json: '20',
      descricao: 'Preço só válido com estoque > 20',
    },
  ];
  const tx = db.transaction(() => {
    for (const r of regras) insert.run(r);
  });
  tx();
}

export function closeV3Db() {
  if (cached) {
    cached.close();
    cached = null;
  }
}
