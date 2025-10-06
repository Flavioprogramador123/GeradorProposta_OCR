# 🏢 PIENG_ENTERPRISE - Arquitetura Hub Central

## 🎯 **VISÃO GERAL**

O **Pieng_Enterprise** será o hub central que gerencia todos os seus projetos relacionados à energia solar, compartilhando APIs, configurações e recursos de forma centralizada.

---

## 🏗️ **ARQUITETURA DE PROJETOS**

```
PIENG_ENTERPRISE (Hub Central)
├── 🔐 Google Cloud Secret Manager (APIs Centralizadas)
├── 📊 Dashboard Central de Monitoramento
├── 🔄 CI/CD Pipeline Unificado
└── 📁 Projetos Filhos:
    ├── 🌞 pieng-propostas-solares (Atual)
    ├── 🏭 pieng-distribuidoras
    ├── 📱 pieng-mobile-app
    ├── 📊 pieng-analytics
    └── 🛠️ pieng-tools
```

---

## 🔐 **SECRET MANAGER - CHAVES CENTRALIZADAS**

### **Chaves Identificadas para Migração:**

```bash
# 🤖 APIs de IA
gcloud secrets create pieng-gemini-api-key --data-file=- <<< "sua_chave_gemini"
gcloud secrets create pieng-openai-api-key --data-file=- <<< "sua_chave_openai"
gcloud secrets create pieng-openrouter-api-key --data-file=- <<< "sua_chave_openrouter"

# 🗺️ Google Maps/Solar
gcloud secrets create pieng-google-maps-api-key --data-file=- <<< "sua_chave_maps"

# 📁 Google Drive OAuth
gcloud secrets create pieng-google-drive-client-id --data-file=- <<< "YOUR_GOOGLE_DRIVE_CLIENT_ID.apps.googleusercontent.com"
gcloud secrets create pieng-google-drive-client-secret --data-file=- <<< "GOCSPX-YOUR_GOOGLE_DRIVE_CLIENT_SECRET"

# 🔄 Refresh Tokens (por projeto)
gcloud secrets create pieng-propostas-refresh-token --data-file=- <<< "seu_refresh_token_propostas"
```

---

## 📋 **ESTRUTURA DE PROJETOS**

### **1. PIENG_ENTERPRISE (Hub Central)**
```
pieng-enterprise/
├── 🔐 secrets/ (Google Cloud Secret Manager)
├── 📊 monitoring/ (Dashboards centralizados)
├── 🔄 ci-cd/ (Pipelines unificados)
├── 📚 docs/ (Documentação centralizada)
└── 🛠️ tools/ (Ferramentas compartilhadas)
```

### **2. Projetos Filhos**
```
pieng-propostas-solares/     # Sistema atual de propostas
pieng-distribuidoras/        # Portal para distribuidoras
pieng-mobile-app/           # App mobile
pieng-analytics/            # Dashboard de analytics
pieng-tools/               # Ferramentas auxiliares
```

---

## 🚀 **BENEFÍCIOS DA ARQUITETURA**

### **✅ Vantagens:**
1. **APIs Centralizadas**: Uma única fonte de verdade para todas as chaves
2. **Custos Otimizados**: Compartilhamento de quotas entre projetos
3. **Monitoramento Unificado**: Dashboard central para todos os projetos
4. **Deploy Simplificado**: CI/CD pipeline único
5. **Segurança Centralizada**: Controle de acesso em um local
6. **Escalabilidade**: Fácil adição de novos projetos

### **💰 Economia de Custos:**
- **Gemini API**: 1M tokens/dia compartilhado entre todos os projetos
- **Google Maps**: Quota única para geolocalização
- **Google Drive**: Storage compartilhado
- **Infraestrutura**: Recursos compartilhados no Google Cloud

---

## 🔧 **IMPLEMENTAÇÃO**

### **FASE 1: Setup Inicial**
1. ✅ Configurar Google Cloud Project `pieng-enterprise`
2. ✅ Migrar todas as chaves para Secret Manager
3. ✅ Configurar CI/CD pipeline centralizado
4. ✅ Criar dashboard de monitoramento

### **FASE 2: Migração de Projetos**
1. 🔄 Migrar `pieng-propostas-solares` (atual)
2. 📱 Criar `pieng-mobile-app`
3. 🏭 Desenvolver `pieng-distribuidoras`
4. 📊 Implementar `pieng-analytics`

### **FASE 3: Otimização**
1. 🚀 Deploy automático para todos os projetos
2. 📈 Monitoramento avançado
3. 🔐 Segurança aprimorada
4. 📚 Documentação completa

---

## 🛠️ **FERRAMENTAS CENTRALIZADAS**

### **Dashboard Central:**
- 📊 Status de todos os projetos
- 💰 Monitoramento de custos das APIs
- 🔍 Logs centralizados
- 📈 Métricas de performance

### **CI/CD Pipeline:**
```yaml
# .github/workflows/enterprise-deploy.yml
name: Enterprise Deploy
on:
  push:
    branches: [main]
jobs:
  deploy-all:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy Propostas
        run: |
          cd pieng-propostas-solares
          gcloud run deploy --source .
      - name: Deploy Mobile
        run: |
          cd pieng-mobile-app
          gcloud run deploy --source .
      # ... outros projetos
```

---

## 📊 **MONITORAMENTO CENTRALIZADO**

### **Métricas Importantes:**
- 🔄 Status de todos os serviços
- 💰 Uso de APIs e custos
- 📈 Performance de cada projeto
- 🔐 Segurança e acessos
- 📱 Uptime dos serviços

### **Alertas Automáticos:**
- 🚨 Quota de API próxima do limite
- 💸 Custos acima do esperado
- 🔴 Serviços fora do ar
- 🔐 Tentativas de acesso suspeitas

---

## 🎯 **PRÓXIMOS PASSOS**

1. **Configurar Google Cloud Project** `pieng-enterprise`
2. **Migrar chaves** para Secret Manager
3. **Criar estrutura** de projetos filhos
4. **Implementar CI/CD** centralizado
5. **Desenvolver dashboard** de monitoramento

---

## 💡 **EXEMPLO DE USO**

```typescript
// Acesso centralizado às APIs
import { EnterpriseAPI } from '@pieng/enterprise-core';

// Todos os projetos usam a mesma instância
const api = new EnterpriseAPI({
  project: 'pieng-propostas-solares',
  environment: 'production'
});

// APIs compartilhadas automaticamente
const geminiResponse = await api.ai.extractData(pdfFile);
const solarData = await api.maps.getSolarPotential(address);
const driveFile = await api.drive.uploadProposal(proposal);
```

---

## 🚀 **RESULTADO FINAL**

Com o **Pieng_Enterprise**, você terá:

✅ **Um hub central** para todos os projetos Pieng
✅ **APIs compartilhadas** e custos otimizados  
✅ **Deploy automático** para todos os projetos
✅ **Monitoramento centralizado** de tudo
✅ **Escalabilidade** para novos projetos
✅ **Segurança** centralizada e robusta

**É a base perfeita para expandir seu império solar! 🌞**
