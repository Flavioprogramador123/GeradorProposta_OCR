// Teste direto da API do Supabase para ver se reconhece a tabela configuracoes
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ityeiqyjyhkmypjmnyhb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0eWVpcXlqeWhrbXlwam1ueWhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3NzcwNDYsImV4cCI6MjA3NjM1MzA0Nn0.Qbyj0fmIuaf1X5Riyy35FLtDYqxT8DY8sB3rDOUKrL8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testarConfiguracao() {
  console.log('🔍 Testando acesso à tabela configuracoes...');
  console.log('URL:', supabaseUrl);
  console.log('');

  try {
    // Teste 1: Contar registros
    console.log('📊 Teste 1: Contando registros...');
    const { data: countData, error: countError, count } = await supabase
      .from('configuracoes')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ Erro ao contar:', countError);
    } else {
      console.log('✅ Total de registros:', count);
    }

    console.log('');

    // Teste 2: Buscar todas as configurações
    console.log('📋 Teste 2: Buscando todas as configurações...');
    const { data, error } = await supabase
      .from('configuracoes')
      .select('chave, valor, descricao')
      .order('chave');

    if (error) {
      console.error('❌ Erro ao buscar configurações:', error);
      console.error('Código:', error.code);
      console.error('Mensagem:', error.message);
      console.error('Detalhes:', error.details);
    } else {
      console.log('✅ Configurações encontradas:', data.length);
      console.log('');
      console.log('📝 Lista de configurações:');
      data.forEach(config => {
        console.log(`  • ${config.chave}: ${config.valor} (${config.descricao})`);
      });
    }

    console.log('');

    // Teste 3: Buscar uma configuração específica
    console.log('🔍 Teste 3: Buscando descontoPix...');
    const { data: pixData, error: pixError } = await supabase
      .from('configuracoes')
      .select('chave, valor')
      .eq('chave', 'descontoPix')
      .single();

    if (pixError) {
      console.error('❌ Erro:', pixError);
    } else {
      console.log('✅ descontoPix encontrado:', pixData.valor);
    }

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

testarConfiguracao();
