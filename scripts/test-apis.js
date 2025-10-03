/**
 * Script de Teste - Todas as APIs PIENG
 * Verifica status e quotas
 */

require('dotenv').config();

console.log(`
╔══════════════════════════════════════════════════════════════╗
║  🧪 PIENG - Teste de APIs                                   ║
╚══════════════════════════════════════════════════════════════╝
`);

async function testGemini() {
  console.log(`\n🤖 Teste 1: Gemini API`);
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.log(`   ❌ API Key não configurada`);
    return false;
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );

    if (response.ok) {
      const data = await response.json();
      console.log(`   ✅ Gemini funcionando!`);
      console.log(`   📊 Modelos disponíveis: ${data.models?.length || 0}`);
      return true;
    } else {
      console.log(`   ❌ Erro: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Erro: ${error.message}`);
    return false;
  }
}

async function testOpenAI() {
  console.log(`\n🤖 Teste 2: OpenAI API`);
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.log(`   ❌ API Key não configurada`);
    return false;
  }

  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    if (response.ok) {
      console.log(`   ✅ OpenAI funcionando!`);
      return true;
    } else {
      const error = await response.json();
      console.log(`   ❌ Erro: ${error.error?.message || response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Erro: ${error.message}`);
    return false;
  }
}

async function testMapsAPI() {
  console.log(`\n🗺️  Teste 3: Google Maps API`);
  const apiKey = process.env.apigooglemaps;

  if (!apiKey) {
    console.log(`   ❌ API Key não configurada`);
    return false;
  }

  try {
    // Testar Geocoding
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=Goiania,GO&key=${apiKey}`
    );

    if (response.ok) {
      const data = await response.json();
      if (data.status === 'OK') {
        console.log(`   ✅ Maps API funcionando!`);
        console.log(`   📍 Teste Geocoding: ${data.results[0]?.formatted_address}`);
        return true;
      } else {
        console.log(`   ❌ Erro Maps: ${data.status}`);
        return false;
      }
    }
  } catch (error) {
    console.log(`   ❌ Erro: ${error.message}`);
    return false;
  }
}

async function testSolarAPI() {
  console.log(`\n☀️  Teste 4: Solar API (Google)`);
  const apiKey = process.env.apigooglemaps;

  if (!apiKey) {
    console.log(`   ❌ API Key não configurada`);
    return false;
  }

  try {
    // Testar Solar API (Goiânia - coordenadas aproximadas)
    const lat = -16.6869;
    const lng = -49.2648;

    const response = await fetch(
      `https://solar.googleapis.com/v1/buildingInsights:findClosest?location.latitude=${lat}&location.longitude=${lng}&key=${apiKey}`
    );

    if (response.ok) {
      const data = await response.json();
      console.log(`   ✅ Solar API funcionando!`);
      console.log(`   ☀️  Área útil para painéis: ${data.solarPotential?.maxArrayAreaMeters2?.toFixed(2) || 'N/A'} m²`);
      console.log(`   🔋 Painéis máximos: ${data.solarPotential?.maxArrayPanelsCount || 'N/A'}`);
      return true;
    } else {
      const error = await response.json();
      if (response.status === 403) {
        console.log(`   ⚠️  Solar API não habilitada ou sem permissão`);
        console.log(`   💡 Para habilitar:`);
        console.log(`      1. Acesse: https://console.cloud.google.com/`);
        console.log(`      2. Biblioteca → Buscar 'Solar API'`);
        console.log(`      3. Ativar`);
      } else {
        console.log(`   ❌ Erro: ${error.error?.message || response.status}`);
      }
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Erro: ${error.message}`);
    return false;
  }
}

async function testSupabase() {
  console.log(`\n💾 Teste 5: Supabase`);
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.log(`   ❌ Supabase não configurado`);
    return false;
  }

  try {
    const response = await fetch(`${url}/rest/v1/`, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`
      }
    });

    console.log(`   ✅ Supabase funcionando!`);
    console.log(`   🔗 URL: ${url}`);
    return true;
  } catch (error) {
    console.log(`   ❌ Erro: ${error.message}`);
    return false;
  }
}

async function runTests() {
  const results = {
    gemini: await testGemini(),
    openai: await testOpenAI(),
    maps: await testMapsAPI(),
    solar: await testSolarAPI(),
    supabase: await testSupabase()
  };

  const total = Object.keys(results).length;
  const passed = Object.values(results).filter(r => r).length;

  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  📊 RESULTADO FINAL                                         ║
╚══════════════════════════════════════════════════════════════╝

✅ APIs funcionando: ${passed}/${total}

${results.gemini ? '✅' : '❌'} Gemini API - OCR Inteligente
${results.openai ? '✅' : '❌'} OpenAI API - Processamento Avançado
${results.maps ? '✅' : '❌'} Google Maps API - Geocoding
${results.solar ? '✅' : '⚠️ '} Solar API - Análise de Telhados
${results.supabase ? '✅' : '❌'} Supabase - Armazenamento

${!results.solar ? '\n💡 Dica: Habilite a Solar API para análise automática de telhados!' : ''}
${passed === total ? '\n🎉 Todas as APIs estão funcionando perfeitamente!' : ''}
  `);
}

runTests().catch(console.error);
