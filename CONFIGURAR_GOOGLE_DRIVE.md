# 🚀 Guia Rápido: Configurar Google Drive API

## ✅ Você tem Google Workspace (R$ 142,30/mês)

Ótimo! Vamos configurar em **3 passos simples**:

---

## 📋 PASSO 1: Console do Google Cloud

1. Acesse: **https://console.cloud.google.com/**
2. Clique em **"Select a project"** → **"New Project"**
3. Nome: `PIENG Propostas`
4. Clique em **"Create"**

---

## 📋 PASSO 2: Habilitar API e Criar Credenciais

### 2.1 - Habilitar Google Drive API
1. Menu lateral → **"APIs & Services"** → **"Library"**
2. Busque: `Google Drive API`
3. Clique em **"Enable"**

### 2.2 - Configurar Tela de Consentimento
1. **"APIs & Services"** → **"OAuth consent screen"**
2. Escolha: **"Internal"** (já que você tem Workspace)
3. Preencha:
   - **App name**: `PIENG Propostas`
   - **User support email**: seu email do Workspace
   - **Developer contact**: seu email do Workspace
4. **"Save and Continue"** (pular Scopes)
5. **"Save and Continue"** novamente

### 2.3 - Criar OAuth Credentials
1. **"APIs & Services"** → **"Credentials"**
2. **"Create Credentials"** → **"OAuth client ID"**
3. **Application type**: `Web application`
4. **Name**: `PIENG Web`
5. **Authorized redirect URIs**: Adicione:
   ```
   http://localhost:3000/oauth2callback
   ```
6. Clique em **"Create"**

**📋 COPIE E GUARDE:**
- ✅ **Client ID**: `xxxxx.apps.googleusercontent.com`
- ✅ **Client Secret**: `GOCSPX-xxxxx`

---

## 📋 PASSO 3: Executar Script de Setup

Agora vamos usar o script que criei para gerar automaticamente o Refresh Token.

### 3.1 - Instalar Dependência
```bash
npm install googleapis open
```

### 3.2 - Configurar Credenciais

**Opção A (Recomendada):** Criar arquivo `.env`

```bash
# Criar .env na raiz do projeto
echo "GOOGLE_DRIVE_CLIENT_ID=cole_seu_client_id_aqui" >> .env
echo "GOOGLE_DRIVE_CLIENT_SECRET=cole_seu_client_secret_aqui" >> .env
```

**Opção B:** Editar o script diretamente

Abra `scripts/setup-google-drive.js` e cole nas linhas 17-18:
```javascript
const CLIENT_ID = 'seu_client_id.apps.googleusercontent.com';
const CLIENT_SECRET = 'GOCSPX-seu_client_secret';
```

### 3.3 - Executar Setup
```bash
node scripts/setup-google-drive.js
```

**O que vai acontecer:**
1. ✅ Abre o navegador automaticamente
2. ✅ Você faz login com sua conta Google Workspace
3. ✅ Autoriza o app
4. ✅ Script gera o Refresh Token
5. ✅ Cria a pasta "PIENG Propostas Solares" no Drive
6. ✅ Salva tudo no arquivo `.env`

---

## 🎉 PRONTO!

Após executar o script, seu `.env` terá:

```env
GOOGLE_DRIVE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_DRIVE_CLIENT_SECRET=GOCSPX-xxxxx
GOOGLE_DRIVE_REFRESH_TOKEN=1//xxxxx
GOOGLE_DRIVE_FOLDER_ID=xxxxx
```

---

## 🧪 Testar Integração

Vou criar um script de teste para você verificar se está tudo funcionando.

Execute:
```bash
node scripts/test-google-drive.js
```

---

## 💡 Como Usar no Sistema

### Upload Automático ao Gerar Proposta

```typescript
import { uploadPropostaCompleta, isGoogleDriveConfigured } from '@/lib/google-drive';

// No endpoint de geração de proposta
if (isGoogleDriveConfigured()) {
  const result = await uploadPropostaCompleta(
    clienteSlug,
    htmlContent,
    propostaData
  );

  if (result.html.success) {
    console.log('✅ Proposta salva no Drive:', result.html.webViewLink);
  }
}
```

### Listar Propostas do Cliente

```typescript
import { listClientePropostas } from '@/lib/google-drive';

const propostas = await listClientePropostas('cliente-nome-01-10-2025');
```

---

## 🔍 Verificar Status

Para verificar se está configurado:

```typescript
import { isGoogleDriveConfigured, getStorageInfo } from '@/lib/google-drive';

if (isGoogleDriveConfigured()) {
  const info = await getStorageInfo();
  console.log(`Armazenamento: ${info.used}GB / ${info.limit}GB`);
}
```

---

## 📁 Estrutura no Google Drive

```
Google Drive/
└── PIENG Propostas Solares/           (pasta principal)
    ├── cliente-nome-01-10-2025/       (pasta por cliente)
    │   ├── proposta_xxx_1234567.html
    │   └── proposta_xxx_1234567.json
    ├── dudo-01-10-2025/
    │   ├── proposta_dudo_1234568.html
    │   └── proposta_dudo_1234568.json
    └── ...
```

---

## ❓ Problemas Comuns

### Erro: "redirect_uri_mismatch"
- ✅ Verifique se adicionou `http://localhost:3000/oauth2callback` nas URIs autorizadas

### Erro: "invalid_client"
- ✅ Verifique se copiou corretamente o Client ID e Secret

### Erro: "Access blocked"
- ✅ Se for conta pessoal (@gmail.com), mude OAuth consent screen para "External"
- ✅ Se for Workspace (seu caso), use "Internal"

### Script não abre navegador
- ✅ Copie a URL que aparece no terminal e cole no navegador manualmente

---

## 🎯 Próximos Passos

1. ✅ Execute o script de setup
2. ✅ Verifique se `.env` foi criado
3. ✅ Reinicie o servidor: `npm run dev`
4. ✅ Gere uma proposta de teste
5. ✅ Verifique se apareceu no Google Drive

---

## 📞 Precisa de Ajuda?

Me avise em qual passo está e eu te ajudo!

**Comandos úteis:**
```bash
# Ver configuração atual
cat .env | grep GOOGLE_DRIVE

# Testar conexão
node scripts/test-google-drive.js

# Ver pastas no Drive
node scripts/list-drive-folders.js
```
