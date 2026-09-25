/**
 * Garante os campos da maquininha nas configurações (Supabase + JSON local).
 *
 * - Supabase: upsert das chaves ausentes (respeita RLS do projeto)
 * - Local: grava `adquirente`, `prazoRecebimento`, `faixaFaturamento`,
 *   `taxaMensalPagSeguro` no `src/data/sistema/configuracoes.json`
 *
 * Uso: npx tsx scripts/seed-maquininha-config.ts
 */
import { promises as fs } from 'fs';
import path from 'path';
import { supabase } from '../src/lib/supabase';
import { CONFIG_PADRAO } from '../src/utils/configuracoes';

const CAMPOS: Array<{ chave: string; valor: unknown; descricao: string }> = [
  {
    chave: 'adquirente',
    valor: CONFIG_PADRAO.adquirente,
    descricao: 'Maquininha vigente: ton (tabela) ou pagseguro (taxa manual)',
  },
  {
    chave: 'prazoRecebimento',
    valor: CONFIG_PADRAO.prazoRecebimento,
    descricao: 'Prazo de recebimento da Ton: umDiaUtil | naHora',
  },
  {
    chave: 'faixaFaturamento',
    valor: CONFIG_PADRAO.faixaFaturamento,
    descricao: 'Faixa de faturamento mensal Ton (0 = até R$20 mil)',
  },
  {
    chave: 'taxaMensalPagSeguro',
    valor: CONFIG_PADRAO.taxaMensalPagSeguro,
    descricao: 'Taxa mensal PagSeguro (% a.m.) — reserva quando a Ton falha',
  },
];

async function seedSupabase() {
  if (!supabase) {
    console.log('⚠️ Supabase indisponível — pulando banco');
    return;
  }
  const { data: existentes, error: erroLeitura } = await supabase
    .from('configuracoes')
    .select('chave');

  if (erroLeitura) {
    console.error('❌ Erro ao ler configuracoes:', erroLeitura.message);
    return;
  }

  const jaExiste = new Set((existentes || []).map((r: { chave: string }) => r.chave));
  const faltantes = CAMPOS.filter((c) => !jaExiste.has(c.chave));
  if (!faltantes.length) {
    console.log('✅ Supabase já tem todos os campos da maquininha');
    return;
  }

  const { error } = await supabase
    .from('configuracoes')
    .insert(
      faltantes.map((c) => ({
        chave: c.chave,
        valor: JSON.stringify(c.valor),
        descricao: c.descricao,
      }))
    );

  if (error) {
    console.error('❌ Erro ao inserir no Supabase:', error.message);
    console.error('   Rode sql/maquininha_configuracoes.sql no SQL Editor do Supabase.');
    return;
  }
  console.log(`✅ Supabase: inseridas ${faltantes.length} chave(s): ${faltantes.map((c) => c.chave).join(', ')}`);
}

async function seedArquivo() {
  const arquivo = path.join(process.cwd(), 'src/data/sistema/configuracoes.json');
  let json: Record<string, unknown> = {};
  try {
    json = JSON.parse(await fs.readFile(arquivo, 'utf8'));
  } catch {
    console.log('⚠️ JSON local não encontrado/parseável — criando novo');
  }
  let mudou = false;
  for (const c of CAMPOS) {
    if (json[c.chave] == null) {
      json[c.chave] = c.valor;
      mudou = true;
    }
  }
  if (!mudou) {
    console.log('✅ JSON local já tem todos os campos da maquininha');
    return;
  }
  await fs.writeFile(arquivo, JSON.stringify(json, null, 2), 'utf8');
  console.log('✅ JSON local atualizado com os campos da maquininha');
}

async function main() {
  await seedSupabase();
  await seedArquivo();
  console.log('\nCampos gravados:', JSON.stringify(CAMPOS.map((c) => [c.chave, c.valor]), null, 0));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
