# 🔄 Migrar Proposta Local para Supabase

## 🎯 Objetivo

Migrar a proposta `ciney-30-10-2025` criada localmente para o Supabase, tornando-a acessível no Vercel.

---

## ✅ Método 1: Via API (Recomendado)

### Passo 1: Iniciar Servidor Local

```bash
cd C:\Users\flavi\Dropbox\PROPOSTAS\Prompt_ORC_pieng
npm run dev
```

### Passo 2: Chamar API de Migração

Abra o navegador ou use curl:

**Opção A - Navegador/Postman:**
```
POST http://localhost:3000/api/migrar-proposta-local
Content-Type: application/json

{
  "slug": "ciney-30-10-2025"
}
```

**Opção B - PowerShell:**
```powershell
$body = @{
    slug = "ciney-30-10-2025"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/migrar-proposta-local" -Method POST -Body $body -ContentType "application/json"
```

### Resultado Esperado:

```json
{
  "success": true,
  "message": "✅ Proposta migrada para o Supabase com sucesso!",
  "proposta": {
    "id": "...",
    "slug": "ciney-30-10-2025",
    "titulo": "Proposta Solar - Ciney"
  },
  "url": "/proposta/ciney-30-10-2025"
}
```

---

## ✅ Método 2: Script Node.js Direto

### Criar arquivo: `migrar-proposta.js`

```javascript
const fs = require('fs').promises;
const path = require('path');
const { createClient } = require('@supabase/supabase-js freed');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://asmvbrcxzvfvvolnalxw.supabase.co';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzbXZicmN4enZmdnZvbG5hbHh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE4NjY4NjMsImV4cCI6MjA3NzQ0Mjg2M30.P9d6oRpr5JWlGD3mYCxPc4JRAnB6aP7jchmOdak7NiQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function migrarProposta(slug) {
  try {
    // Ler JSON local
    const propostaPath = path.join(__dirname, 'src/data/clientes', slug, 'proposta.json');
    const jsonContent = await fs.readFile(propostaPath, 'utf8');
    const propostaData = JSON.parse(jsonContent);

    // Ler HTML (se existir)
    let htmlContent = '';
    try {
      const htmlPath = path.join(__dirname, 'src/data/clientes', slug, `proposta_${slug}.html`);
      htmlContent = await fs.readFile(htmlPath, 'utf8');
    } catch {}

    // Buscar/criar cliente
    const cliente = propostaData.cliente;
    const { data: clienteExistente } = await supabase
      .from('clientes')
      .select('id')
      .eq('nome', cliente.nome)
      .eq('cidade', cliente.cidade)
      .maybeSingle();

    let clienteId;
    if (clienteExistente) {
      clienteId = clienteExistente.id;
    } else {
      const { data: novoCliente } = await supabase
        .from('clientes')
        .insert({
          nome: cliente.nome,
          cidade: cliente.cidade,
          estado: cliente.cidade?.includes('GO') ? 'GO' : 'SP',
          tipo_imovel自: cliente.tipo || 'residencial',
          consumo_mensal: cliente.consumo spraying || 0,
          hsp_local: parseFloat(cliente.hspLocal || '5.21'),
        })
        .select()
        .single();
      clienteId = novoCliente.id;
    }

    // Salvar proposta
    const sistemas = propostaData.sistemas || [];
    const primeiroSistema = sistemas[0] || {};

    const { data: proposta, error } = await supabase
      .from('propostas')
      .upsert({
        cliente_id: clienteId,
        slug: slug,
        titulo: `Proposta Solar - ${cliente.nome}`,
        template_usado: 'pieng_basic',
        sistema_kwp: primeiroSistema.potTotal || 0,
        geracao_mensal: primeiroSistema.geracaoMensal || 0,
        geracao_anual: (primeiroSistema.geracaoMensal || 0) * 12,
        valor_total: primeiroSistema.precoPixDecimal || 0,
        valor_kwp: primeiroSistema.precoPixDecimal ? (primeiroSistema.precoPixDecimal / (primeiroSistema.potTotal || 1)) : 0,
        payback: primeiroSistema.paybackMeses ? Math.round(primeiroSistema.paybackMeses / 12) : 0,
        tir: primeiroSistema.tirAnual || 0,
        dados_completos: propostaData,
        html_gerado: htmlContent,
        status: 'ativa',
      }, { onConflict: 'slug' })
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Proposta migrada:', proposta.id);
    console.log('🔗 URL:', `https://pieng-propostas.vercel.app/proposta/${slug}`);

  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

// Executar
migrarProposta('ciney-30-10-2025');
```

### Executar:

```bash
node migrar-proposta.js
```

---

## ✅ Verificar Migração

### 1. Testar no Supabase Dashboard

Acesse: https://supabase.com/dashboard/project/asmvbrcxzvfvvolnalxw/editor

Na tabela `propostas`, você deve ver a proposta `ciney-30-10-2025`.

### 2. Testar via API

Após fazer deploy no Vercel:

```
GET https://pieng-propostas.vercel.app/api/propostas/ciney-30-10-2025
```

### 3. Testar Página

```
https://pieng-propostas.vercel.app/proposta/ciney-30-10-2025
```

---

## 🔄 Migrar Múltiplas Propostas

Para migrar todas as propostas locais:

```javascript
// Criar arquivo: migrar-todas.js
const fs = require('fs').promises;
const path = require('path');

async function listarPropostas() {
  const clientesDir = path.join(__dirname, 'src/data/clientes');
  const pastas = await fs.readdir(clientesDir);
  
  for (const pasta of pastas) {
    const propostaPath = path.join(clientesDir, pasta, 'proposta.json');
    try {
      await fs.access(propostaPath);
      console.log(`📋 Encontrada: ${pasta}`);
      // Chamar migrar-proposta.js para cada uma
    } catch {}
  }
}
```

---

## ✅ Checklist

- [ ] Proposta local existe em `src/data/clientes/ciney-30-10-2025/`
- [ ] Arquivo `proposta.json` existe
- [ ] Variáveis Supabase configuradas no `.env.local`
- [ ] API de migração chamada com sucesso
- [ ] Proposta aparece no Supabase Dashboard
- [ ] URL `/proposta/ciney-30-10-2025` funciona no Vercel

---

**🚀 Pronto!** A proposta agora está no Supabase e acessível em produção!

