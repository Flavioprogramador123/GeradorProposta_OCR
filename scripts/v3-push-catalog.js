/**
 * Push SQLite V3 → Supabase (roda no PC, fora do Next).
 * Requer tabela criada: sql/6_v3_catalog_snapshot.sql
 */
require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });

const Database = require('better-sqlite3');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

const dbPath = path.join(process.cwd(), 'data/v3/pieng_v3.sqlite');
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('Faltam NEXT_PUBLIC_SUPABASE_URL / ANON_KEY no .env');
  process.exit(1);
}

const db = new Database(dbPath);
const dump = {
  version: 1,
  exportedAt: new Date().toISOString(),
  cds: db.prepare('SELECT * FROM cds ORDER BY id').all(),
  equipamentos: db.prepare('SELECT * FROM equipamentos ORDER BY id').all(),
  equipamento_aliases: db.prepare('SELECT * FROM equipamento_aliases ORDER BY id').all(),
  precos_cd: db.prepare('SELECT * FROM precos_cd ORDER BY id').all(),
  kits_regras: db.prepare('SELECT * FROM kits_regras ORDER BY chave').all(),
};
db.close();

console.log('Dump:', {
  cds: dump.cds.length,
  equipamentos: dump.equipamentos.length,
  precos: dump.precos_cd.length,
  aliases: dump.equipamento_aliases.length,
});

const supabase = createClient(url, key, { auth: { persistSession: false } });

(async () => {
  const updated_at = new Date().toISOString();
  const { error } = await supabase.from('v3_catalog_snapshot').upsert(
    {
      id: 1,
      updated_at,
      source: 'sqlite-local-script',
      note: 'scripts/v3-push-catalog.js',
      dump,
    },
    { onConflict: 'id' }
  );
  if (error) {
    console.error('ERRO:', error.message);
    console.error('→ Execute sql/6_v3_catalog_snapshot.sql no Supabase SQL Editor e rode de novo.');
    process.exit(1);
  }
  console.log('OK publicado em v3_catalog_snapshot @', updated_at);
})();
