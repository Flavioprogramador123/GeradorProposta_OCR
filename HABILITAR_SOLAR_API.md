# ☀️ Habilitar Solar API - Passo a Passo

## 🎯 O QUE É A SOLAR API?

A Solar API do Google analisa **automaticamente**:
- ✅ Área útil do telhado via satélite
- ✅ Sombreamento de árvores e prédios
- ✅ Melhor orientação para painéis
- ✅ Estimativa de geração anual
- ✅ Potencial solar real do imóvel

**PERFEITO** para gerar propostas mais precisas!

---

## 📋 PASSO A PASSO (3 minutos):

### **1. Acessar Google Cloud Console**

Abra: **https://console.cloud.google.com/**

(Você já deve estar logado com sua conta do Workspace)

---

### **2. Selecionar ou Criar Projeto**

No topo da página, clique em **"Select a project"**

Opções:
- **A)** Se já tem o projeto "PIENG Propostas": Selecione ele
- **B)** Se não tem: Clique em **"New Project"** → Nome: `PIENG Propostas` → Create

---

### **3. Ir para Biblioteca de APIs**

No menu lateral esquerdo (☰):

```
APIs e serviços → Biblioteca
```

Ou acesse diretamente:
**https://console.cloud.google.com/apis/library**

---

### **4. Buscar Solar API**

Na caixa de busca no topo, digite:

```
Solar API
```

Você verá: **"Solar API"** com o ícone do sol ☀️

---

### **5. Ativar a API**

1. Clique em **"Solar API"**
2. Clique no botão azul **"ATIVAR"** (ENABLE)
3. Aguarde 10-30 segundos (processamento)
4. Pronto! ✅

---

### **6. Verificar Ativação**

Você será redirecionado para a página de métricas.

Confirme que aparece:
```
✅ Solar API
Status: Enabled
```

---

### **7. Testar no Sistema**

Volte ao terminal e execute:

```bash
node scripts/test-apis.js
```

Agora deve aparecer:
```
☀️  Teste 4: Solar API (Google)
   ✅ Solar API funcionando!
   ☀️  Área útil para painéis: 125.50 m²
   🔋 Painéis máximos: 25
```

---

## 🎉 PRONTO!

Agora o sistema PIENG pode:

1. ✅ Receber endereço do cliente
2. ✅ Buscar coordenadas (Geocoding)
3. ✅ **Analisar telhado via satélite (Solar API)** ⭐
4. ✅ Calcular potencial solar real
5. ✅ Sugerir quantidade ideal de painéis
6. ✅ Gerar proposta com dados precisos

---

## 💡 EXEMPLO DE USO FUTURO:

```typescript
// Análise automática do telhado do cliente
const endereco = "Rua Principal 123, Goiânia-GO";

// 1. Geocoding
const coords = await geocode(endereco);

// 2. Solar API
const solarData = await getSolarPotential(coords.lat, coords.lng);

console.log('Área disponível:', solarData.maxArrayAreaMeters2, 'm²');
console.log('Painéis recomendados:', solarData.maxArrayPanelsCount);
console.log('Geração anual:', solarData.yearlyEnergyDcKwh, 'kWh');

// 3. Gerar proposta com dados reais!
```

---

## ❓ PROBLEMAS?

### Erro: "API not enabled"
- Aguarde 1-2 minutos após ativar
- Recarregue a página do Console

### Erro: "Quota exceeded"
- Verificar se ultrapassou limite gratuito
- Solar API tem 28.000 requisições/mês grátis

### Erro: "Permission denied"
- Verificar se a chave do Maps está correta
- Verificar restrições da API Key

---

## 🔍 VERIFICAR QUOTA:

Para ver quantas requisições você tem disponível:

1. Console → **"APIs & Services"** → **"Dashboard"**
2. Clique em **"Solar API"**
3. Veja **"Quotas"** → **"Queries per day: 28,000"**

---

## 🚀 ESTÁ PRONTO!

Siga os passos acima e me avise quando concluir!

Execute depois:
```bash
node scripts/test-apis.js
```

Para confirmar que está funcionando! ✅
