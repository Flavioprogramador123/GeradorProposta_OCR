/**
 * Script para criar a tabela proposta_analytics no Supabase
 * Usa as variáveis de ambiente NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY
 * 
 * ⚠️ IMPORTANTE: Este script requer a chave SERVICE_ROLE do Supabase para executar SQL
 * Se não tiver, execute o SQL manualmente no dashboard do Supabase
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Carregar variáveis de ambiente
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Opcional, mas necessário para SQL

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Erro: Variáveis NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY não configuradas!');
  console.error('   Configure no arquivo .env ou nas variáveis de ambiente.');
  process.exit(1);
}

// Criar cliente Supabase
// Se tiver service_role, usa ela (permite executar SQL)
// Caso contrário, usa anon (limitado)
const supabase = createClient(
  supabaseUrl,
  supabaseServiceKey || supabaseAnonKey
);

async function criarTabelaAnalytics() {
  console.log('🚀 Iniciando criação da tabela proposta_analytics...\n');

  // Ler o arquivo SQL
  const sqlPath = path.join(__dirname, '..', 'criar_tabela_proposta_analytics.sql');
  
  if (!fs.existsSync(sqlPath)) {
    console.error(`❌ Erro: Arquivo SQL não encontrado: ${sqlPath}`);
    process.exit(1);
  }

  const sqlContent = fs.readFileSync(sqlPath, 'utf8');
  
  // Dividir o SQL em comandos individuais (separados por ;)
  // Remover comentários e linhas vazias
  const commands = sqlContent
    .split(';')
    .map(cmd => cmd.trim())
    .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));

  console.log(`📝 Encontrados ${commands.length} comandos SQL para executar.\n`);

  // Se não tiver service_role, tentar executar via RPC
  if (!supabaseServiceKey) {
    console.warn('⚠️  AVISO: Chave SERVICE_ROLE não encontrada.');
    console.warn('   Tentando executar via API REST (pode falhar se não houver função RPC).\n');
    
    // Tentar criar a tabela usando operações diretas (limitado)
    try {
      // Verificar se a tabela já existe
      const { data: existingTable, error: checkError } = await supabase
        .from('proposta_analytics')
        .select('id')
        .limit(1);

      if (!checkError && existingTable !== null) {
        console.log('✅ Tabela proposta_analytics já existe!');
        return;
      }

      // Se não existe, não podemos criar via API REST sem service_role
      console.error('❌ Não é possível criar a tabela sem a chave SERVICE_ROLE.');
      console.error('\n📋 SOLUÇÃO: Execute o SQL manualmente no Supabase Dashboard:');
      console.error('   1. Acesse: https://supabase.com/dashboard');
      console.error('   2. Selecione seu projeto');
      console.error('   3. Vá em: SQL Editor → New query');
      console.error(`   4. Cole o conteúdo do arquivo: ${sqlPath}`);
      console.error('   5. Clique em "Run" (ou Ctrl+Enter)\n');
      process.exit(1);
    } catch (error) {
      console.error('❌ Erro ao verificar/criar tabela:', error.message);
      console.error('\n📋 Execute o SQL manualmente no Supabase Dashboard (veja instruções acima).\n');
      process.exit(1);
    }
  }

  // Se tiver service_role, executar SQL diretamente
  console.log('✅ Usando chave SERVICE_ROLE - executando SQL diretamente...\n');

  try {
    // Executar cada comando SQL
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      
      // Pular comandos vazios ou apenas comentários
      if (!command || command.trim().length === 0) continue;

      console.log(`📌 Executando comando ${i + 1}/${commands.length}...`);
      
      // Executar via RPC (requer função criada no banco)
      // Como não temos função RPC, vamos tentar executar via API REST direta
      // Isso só funciona com service_role
      const { data, error } = await supabase.rpc('exec_sql', { 
        sql_query: command 
      });

      if (error) {
        // Se a função RPC não existir, tentar método alternativo
        console.warn(`⚠️  Erro ao executar via RPC: ${error.message}`);
        console.warn('   Tentando método alternativo...');
        
        // Método alternativo: usar fetch direto na API REST do Supabase
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`
          },
          body: JSON.stringify({ sql_query: command })
        });

        if (!response.ok) {
          console.error(`❌ Erro ao executar comando ${i + 1}:`, await response.text());
          continue;
        }
      } else {
        console.log(`✅ Comando ${i + 1} executado com sucesso!`);
      }
    }

    console.log('\n✅ Tabela proposta_analytics criada com sucesso!');
    console.log('📊 Verifique no Supabase Dashboard: Table Editor → proposta_analytics\n');

  } catch (error) {
    console.error('❌ Erro ao executar SQL:', error.message);
    console.error('\n📋 SOLUÇÃO ALTERNATIVA: Execute o SQL manualmente no Supabase Dashboard:');
    console.error('   1. Acesse: https://supabase.com/dashboard');
    console.error('   2. Selecione seu projeto');
    console.error('   3. Vá em: SQL Editor → New query');
    console.error(`   4. Cole o conteúdo do arquivo: ${sqlPath}`);
    console.error('   5. Clique em "Run" (ou Ctrl+Enter)\n');
    process.exit(1);
  }
}

// Executar
criarTabelaAnalytics().catch(console.error);

