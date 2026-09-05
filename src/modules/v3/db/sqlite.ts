/**
 * SQLite V3 — isolado da produção.
 * Em Vercel: hidrata /tmp a partir do snapshot Supabase (v3_catalog_snapshot).
 */
import fs from 'fs';
import path from 'path';
import { getV3DataDir, isV3ServerlessFs } from './paths';
import { V3_SCHEMA_SQL } from './schema';
import {
  exportCatalogDump,
  importCatalogDump,
  type V3CatalogDump,
} from './catalogSnapshot';

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
let hydratePromise: Promise<void> | null = null;
let lastHydratedAt: string | null = null;

function loadBetterSqlite3(): typeof import('better-sqlite3') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('better-sqlite3');
}

function openDbFresh(): Database {
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
  return db;
}

/** Garante snapshot Supabase no /tmp antes de usar o DB em serverless. */
export async function ensureV3CatalogHydrated(opts?: { force?: boolean }): Promise<{
  hydrated: boolean;
  source: 'local' | 'supabase' | 'empty';
  updatedAt?: string | null;
}> {
  if (!isV3ServerlessFs() && !opts?.force) {
    return { hydrated: false, source: 'local' };
  }

  if (!hydratePromise || opts?.force) {
    hydratePromise = (async () => {
      const { supabase } = await import('@/lib/supabase');
      if (!supabase) {
        console.warn('V3: Supabase indisponível — catálogo serverless vazio');
        return;
      }

      const { data, error } = await supabase
        .from('v3_catalog_snapshot')
        .select('dump, updated_at, source, note')
        .eq('id', 1)
        .maybeSingle();

      if (error) {
        console.warn('V3: erro ao ler v3_catalog_snapshot:', error.message);
        return;
      }
      if (!data?.dump) {
        console.warn('V3: snapshot vazio no Supabase — rode push do localhost');
        return;
      }

      if (!opts?.force && lastHydratedAt && data.updated_at === lastHydratedAt && cached) {
        return;
      }

      if (cached) {
        cached.close();
        cached = null;
      }

      const dbPath = getV3DbPath();
      try {
        if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
      } catch {
        /* ignore */
      }

      const db = openDbFresh();
      importCatalogDump(db, data.dump as V3CatalogDump);
      cached = db;
      lastHydratedAt = data.updated_at || new Date().toISOString();
      console.log('✅ V3 catálogo hidratado do Supabase', {
        updatedAt: lastHydratedAt,
        source: data.source,
      });
    })();
  }

  await hydratePromise;
  const hasEquip =
    cached &&
    (cached.prepare('SELECT COUNT(*) AS c FROM equipamentos').get() as { c: number }).c > 0;
  return {
    hydrated: Boolean(hasEquip),
    source: hasEquip ? 'supabase' : 'empty',
    updatedAt: lastHydratedAt,
  };
}

export function getV3Db(): Database {
  if (cached) {
    cached.exec(V3_SCHEMA_SQL);
    return cached;
  }

  const db = openDbFresh();
  seedCdsIfEmpty(db);
  seedRegrasIfEmpty(db);
  cached = db;
  return db;
}

/** Exporta dump do DB local (para push Supabase). */
export function buildLocalCatalogDump(): V3CatalogDump {
  return exportCatalogDump(getV3Db());
}

export async function pushCatalogToSupabase(note?: string): Promise<{
  ok: boolean;
  stats: ReturnType<typeof import('./catalogSnapshot').dumpStats>;
  updatedAt: string;
}> {
  const { dumpStats } = await import('./catalogSnapshot');
  const dump = buildLocalCatalogDump();
  const { supabase } = await import('@/lib/supabase');
  if (!supabase) throw new Error('Supabase não configurado');

  const updatedAt = new Date().toISOString();
  const { error } = await supabase.from('v3_catalog_snapshot').upsert(
    {
      id: 1,
      updated_at: updatedAt,
      source: 'sqlite-local',
      note: note || 'push localhost',
      dump,
    },
    { onConflict: 'id' }
  );
  if (error) throw new Error(error.message);

  return { ok: true, stats: dumpStats(dump), updatedAt };
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
      descricao:
        'String: 1 bola vermelha + 1 preta de 25 m por string (par = nº de strings). Strings por kW: ver estimarStringsInversor',
    },
    {
      chave: 'strings_por_kw_tabela',
      valor_json: JSON.stringify({
        '<=3.5': 1,
        '6-8': 2,
        'demais_<=25': 4,
        '<=36': 6,
        '<=49': 8,
        '<=55': 12,
        '<=65': 18,
        '>65': 24,
        nota: 'Orçamento aproximado por potência CA; despreza modelo/MPPT; atalho 6–8 kW = 2 strings',
      }),
      descricao: 'Tabela de strings por potência CA (documentação / auditoria)',
    },
    {
      chave: 'inversor_marcas_preferencia',
      valor_json: JSON.stringify(['SAJ', 'DEye']),
      descricao: 'Preferência de marca na proposta automática (4a)',
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
  lastHydratedAt = null;
  hydratePromise = null;
}
