# 💾 Fluxo de Persistência de Proposta

## ✅ Implementação: Proposta Salva no Banco ANTES de ser Pública

### 🎯 Objetivo:
Garantir que quando o **Gerador Rápido** aceita/gera uma proposta, ela seja:
1. **PRIMEIRO**: Persistida no banco de dados (Supabase) ✅
2. **DEPOIS**: Disponibilizada como proposta pública para envio ✅

---

## 📋 Fluxo Atualizado:

### **1. Usuário Clica em "Gerar Proposta HTML"**
```
Frontend: /gerador-rapido
  ↓
Função: gerarProposta()
  ↓
POST /api/gerar-proposta
```

### **2. API Gera Proposta**
```
API: /api/gerar-proposta
  ↓
1. Gera HTML da proposta
2. Salva arquivos localmente (se dev)
 env
```

### **3. 💾 PERSISTÊNCIA OBRIGATÓRIA NO SUPABASE**
```
Antes de retornar resposta:
  ↓
1. Buscar ou criar CLIENTE no Supabase
2. Salvar PROPOSTA no Supabase (upsert)
3. Vincular proposta ao cliente
  ↓
✅ Se salvar com sucesso → propostaSalvaNoSupabase = true
❌ Se falhar → ERRO (em produção) ou AVISO (em dev)
```

### **4. Retornar Resposta com Status**
```
Response inclui:
{
  slug: "cliente-31-10-2025",
  htmlContent: "<html>...",
  supabase: {
    salva: true,  // ✅ Indica se foi salva
    propostaId: "uuid-xxx",
    url: "/proposta/cliente-31-10-2025",
    message: "✅ Proposta persistida no banco..."
  }
}
```

### **5. Frontend Exibe e Disponibiliza**
```
Frontend recebe resposta:
  ↓
1. Verifica se supabase.salva === true
2. Se sim → Exibe mensagem de sucesso com link público
3. Se não → Exibe AVISO que não foi salva
4. Abre proposta em nova aba
```

---

## 🔒 Garantias Implementadas:

### **Em Produção (Vercel/Netlify):**
- ✅ **OBRIGATÓRIO** salvar no Supabase antes de retornar
- ✅ Se falhar → **ERRO** retornado ao frontend
- ✅ Proposta **NÃO** é considerada "aceita" se não salvar

### **Em Desenvolvimento:**
- ⚠️ Se Supabase não configurado → **AVISO** mas permite continuar
- ✅ Se configurado → **OBRIGATÓRIO** salvar

---

## 📊 Estrutura de Resposta da API:

```typescript
{
  message: "Proposta gerada e salva no banco de dados com sucesso!",
  slug: "cliente-31-10-2025",
  arquivo: "proposta_cliente-31-10-2025.html",
  htmlContent: "<html>...</html>",
  supabase: {
    salva: true,              // ✅ Status de salvamento
    propostaId: "uuid-xxx",    // ID no Supabase
    url: "/proposta/cliente-31-10-2025",  // URL pública
    message: "✅ Proposta persistida..."   // Mensagem de status
  },
  url: "/proposta/cliente-31-10-2025",
  metadata: { ... }
}
```

---

## ✅ Benefícios:

1. **Persistência Garantida**: Proposta sempre salva antes de ser pública
2. **Rastreabilidade**: ID único no banco para cada proposta
3. **Disponibilidade Pública**: URL pública disponível imediatamente
4. **Feedback Claro**: Frontend informa status de salvamento
5. **Recuperação**: Se algo falhar, proposta não é considerada "aceita"

---

## 🔧 Arquivos Modificados:

1. **`src/pages/api/gerar-proposta.ts`**:
   - Salvamento no Supabase **OBRIGATÓRIO** antes de retornar
   - Erro em produção se falhar
   - Resposta inclui status `supabase.salva`

2. **`src/pages/gerador-rapido.tsx`**:
   - Verifica `data.supabase.salva` antes de exibir
   - Mensagens diferentes para sucesso/aviso
   - Mostra ID do banco e URL pública

---

## 🎉 Resultado Final:

**✅ Quando o usuário aceita/gera uma proposta:**
1. Proposta é **persistida no Supabase** (banco de dados)
2. Proposta fica **disponível publicamente** em `/proposta subtle/[slug]`
3. Frontend recebe **confirmação** de que foi salva
4. Usuário pode **enviar o link público** imediatamente

---

**✅ FLUXO COMPLETO E SEGURO!**

