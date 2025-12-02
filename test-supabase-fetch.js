/**
 * Script de teste para verificar se o aplicativo está buscando dados do Supabase
 * Execute: node test-supabase-fetch.js
 */

const fetch = require('node-fetch');

async function testSupabaseFetch() {
  console.log('🧪 Testando busca de orçamentos do Supabase...\n');

  try {
    // Testar a API local
    const localUrl = 'http://localhost:3000/api/admin/orcamentos-todos';
    console.log(`📡 Testando: ${localUrl}`);
    
    const response = await fetch(localUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log(`\n📊 Status: ${response.status} ${response.statusText}`);

    if (response.ok) {
      const data = await response.json();
      
      console.log('\n✅ Resposta recebida:');
      console.log(`   - Source: ${data.source}`);
      console.log(`   - Total de orçamentos: ${data.stats?.total || 0}`);
      console.log(`   - Pendentes: ${data.stats?.pendentes || 0}`);
      console.log(`   - Aprovados: ${data.stats?.aprovados || 0}`);
      console.log(`   - Rejeitados: ${data.stats?.rejeitados || 0}`);
      
      if (data.orcamentos && data.orcamentos.length > 0) {
        console.log(`\n📋 Primeiro orçamento:`);
        const primeiro = data.orcamentos[0];
        console.log(`   - Cliente: ${primeiro.cliente}`);
        console.log(`   - Slug: ${primeiro.clientePasta}`);
        console.log(`   - Sistemas: ${primeiro.totalSistemas}`);
        
        if (primeiro.sistemas && primeiro.sistemas.length > 0) {
          console.log(`\n💰 Valores dos sistemas:`);
          primeiro.sistemas.forEach((sistema, index) => {
            console.log(`   Sistema ${index + 1}:`);
            console.log(`     - Título: ${sistema.titulo}`);
            console.log(`     - Valor: R$ ${sistema.valorTotal?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}`);
            console.log(`     - Potência: ${sistema.potencia} kWp`);
          });
        }
      } else {
        console.log('\n⚠️ Nenhum orçamento encontrado');
      }
      
      // Verificar se está vindo do Supabase
      if (data.source === 'supabase') {
        console.log('\n✅ CONFIRMADO: Dados estão vindo do Supabase!');
      } else if (data.source === 'supabase-empty') {
        console.log('\n⚠️ Supabase configurado mas sem dados');
      } else if (data.source === 'filesystem') {
        console.log('\n⚠️ ATENÇÃO: Dados estão vindo do filesystem (não do Supabase)');
      } else {
        console.log(`\n⚠️ Source desconhecido: ${data.source}`);
      }
      
    } else {
      const errorText = await response.text();
      console.log(`\n❌ Erro na resposta:`);
      console.log(errorText);
    }

  } catch (error) {
    console.error('\n❌ Erro ao testar:', error.message);
    console.log('\n💡 Dica: Certifique-se de que o servidor Next.js está rodando:');
    console.log('   npm run dev');
  }
}

// Executar teste
testSupabaseFetch();

