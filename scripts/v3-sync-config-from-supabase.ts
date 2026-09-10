/**
 * Baixa configuracoes do Supabase e grava em src/data/sistema/configuracoes.json
 *   npx tsx scripts/v3-sync-config-from-supabase.ts
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

function loadEnvFiles() {
  for (const f of ['.env.local', '.env']) {
    const p = path.join(process.cwd(), f);
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (!m) continue;
      const k = m[1].trim();
      let v = m[2].trim();
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      if (!process.env[k]) process.env[k] = v;
    }
  }
}

function parseValor(valor: unknown): unknown {
  if (typeof valor !== 'string') return valor;
  const t = valor.trim();
  try {
    if (
      (t.startsWith('{') && t.endsWith('}')) ||
      (t.startsWith('[') && t.endsWith(']')) ||
      (t.startsWith('"') && t.endsWith('"')) ||
      /^-?\d+(\.\d+)?$/.test(t) ||
      t === 'true' ||
      t === 'false' ||
      t === 'null'
    ) {
      return JSON.parse(t);
    }
  } catch {
    /* keep string */
  }
  if (/^-?\d+(\.\d+)?$/.test(t)) {
    const n = parseFloat(t);
    if (Number.isFinite(n)) return n;
  }
  return valor;
}

async function main() {
  loadEnvFiles();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.error('Sem NEXT_PUBLIC_SUPABASE_URL / ANON_KEY');
    process.exit(1);
  }

  const sb = createClient(url, key);
  const { data, error } = await sb.from('configuracoes').select('chave, valor');
  if (error) {
    console.error(error);
    process.exit(1);
  }
  if (!data?.length) {
    console.error('Nenhuma configuração na nuvem');
    process.exit(1);
  }

  const config: Record<string, unknown> = {};
  for (const item of data) {
    config[item.chave] = parseValor(item.valor);
  }
  const { sistema_config: _legado, ...flat } = config;

  const outPath = path.join(process.cwd(), 'src/data/sistema/configuracoes.json');
  const prev = existsSync(outPath) ? JSON.parse(readFileSync(outPath, 'utf8')) : {};

  console.log('Nuvem:', Object.keys(flat).length, 'chaves');
  console.log('Antes (local):', {
    pdespesaFixo: prev.pdespesaFixo,
    pdespesaVariavel: prev.pdespesaVariavel,
    fretePadrao: prev.fretePadrao,
    hspPadrao: prev.hspPadrao,
    tarifaPadrao: prev.tarifaPadrao,
  });
  console.log('Nuvem:', {
    pdespesaFixo: flat.pdespesaFixo,
    pdespesaVariavel: flat.pdespesaVariavel,
    fretePadrao: flat.fretePadrao,
    hspPadrao: flat.hspPadrao,
    tarifaPadrao: flat.tarifaPadrao,
  });

  writeFileSync(outPath, JSON.stringify(flat, null, 2) + '\n', 'utf8');
  console.log('OK →', outPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
