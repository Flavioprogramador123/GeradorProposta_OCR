# 🔧 Configuração Google Drive API - PIENG

## 📋 Checklist de Verificação

### **1️⃣ Verificar Conta Google Workspace/One**

Acesse: https://one.google.com/storage

Você verá:
```
📦 Armazenamento Google One
- 15 GB (gratuito)
- 100 GB ($1.99/mês)
- 200 GB ($2.99/mês)
- 2 TB ($9.99/mês)
```

**✅ Se você paga:** Verá o plano ativo e quanto espaço tem disponível

---

## 🚀 Passo a Passo: Configurar Google Drive API

### **PASSO 1: Criar Projeto no Google Cloud Console**

1. Acesse: https://console.cloud.google.com/
2. Clique em **"Select a project"** → **"New Project"**
3. Nome do projeto: `PIENG Propostas Solares`
4. Clique em **"Create"**

---

### **PASSO 2: Habilitar Google Drive API**

1. No menu lateral, vá em **"APIs & Services"** → **"Library"**
2. Busque por: `Google Drive API`
3. Clique em **"Google Drive API"**
4. Clique no botão **"Enable"** (Ativar)

---

### **PASSO 3: Criar Credenciais OAuth 2.0**

1. Vá em **"APIs & Services"** → **"Credentials"**
2. Clique em **"Create Credentials"** → **"OAuth client ID"**
3. Se aparecer aviso sobre tela de consentimento:
   - Clique em **"Configure Consent Screen"**
   - Escolha **"External"** (ou Internal se for Google Workspace)
   - Preencha:
     - App name: `PIENG Propostas`
     - User support email: seu email
     - Developer contact: seu email
   - Clique em **"Save and Continue"** (pule os Scopes por enquanto)
   - Em Test users, adicione seu email
   - Clique em **"Save and Continue"**

4. Volte para **"Credentials"** → **"Create Credentials"** → **"OAuth client ID"**
5. Application type: **"Web application"**
6. Nome: `PIENG Web App`
7. Authorized redirect URIs:
   - `http://localhost:3000/api/auth/google/callback`
   - `http://localhost:3001/api/auth/google/callback`
8. Clique em **"Create"**

**📋 Anote:**
- ✅ Client ID: `algo.apps.googleusercontent.com`
- ✅ Client Secret: `GOCSPX-xxxxxxxxxxxxx`

---

### **PASSO 4: Obter Refresh Token**

Agora precisamos autorizar o app e pegar o refresh token.

**Opção A: Usando OAuth Playground (Mais Fácil)**

1. Acesse: https://developers.google.com/oauthplayground/
2. No canto superior direito, clique no **ícone de engrenagem ⚙️**
3. Marque **"Use your own OAuth credentials"**
4. Cole:
   - OAuth Client ID: `seu_client_id`
   - OAuth Client secret: `seu_client_secret`
5. No lado esquerdo, em **"Step 1"**:
   - Busque por `Drive API v3`
   - Marque `https://www.googleapis.com/auth/drive.file`
6. Clique em **"Authorize APIs"**
7. Faça login com sua conta Google
8. Clique em **"Allow"** para autorizar
9. Em **"Step 2"**, clique em **"Exchange authorization code for tokens"**
10. **📋 Copie o `refresh_token`** que aparece

**Opção B: Script Node.js (Avançado)**

```javascript
// Vou criar um script para você se preferir
```

---

### **PASSO 5: Criar Pasta no Google Drive**

1. Acesse: https://drive.google.com/
2. Clique em **"Novo"** → **"Nova pasta"**
3. Nome: `PIENG Propostas Solares`
4. Clique com botão direito na pasta → **"Compartilhar"**
5. Copie o **ID da pasta** da URL:
   ```
   https://drive.google.com/drive/folders/1a2B3c4D5e6F7g8H9
                                           ↑ Este é o ID
   ```

---

### **PASSO 6: Configurar Variáveis de Ambiente**

Edite seu arquivo `.env`:

```env
# Google Drive API
GOOGLE_DRIVE_CLIENT_ID=seu_client_id.apps.googleusercontent.com
GOOGLE_DRIVE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxx
GOOGLE_DRIVE_REFRESH_TOKEN=1//xxxxxxxxxxxxxxxxxxxxx
GOOGLE_DRIVE_FOLDER_ID=1a2B3c4D5e6F7g8H9
```

---

## 🧪 Testar Configuração

Vou criar um script de teste para você verificar se tudo está funcionando.

---

## 💰 Verificar Plano Google One

**Via Web:**
1. Acesse: https://one.google.com/storage
2. Você verá:
   - Espaço usado
   - Espaço total
   - Plano ativo

**Via CLI (se tiver gcloud instalado):**
```bash
gcloud auth login
gcloud projects list
```

---

## 🔍 Comandos de Verificação Rápida

### **Verificar se está usando Google Workspace:**
- Email termina com seu domínio? (ex: usuario@empresa.com) → Workspace
- Email é @gmail.com? → Google One pessoal

### **Verificar quanto espaço tem:**
```
1. Gmail: https://mail.google.com/ (canto inferior esquerdo)
2. Drive: https://drive.google.com/ (canto inferior esquerdo)
3. Photos: https://photos.google.com/settings
```

---

## 📞 Precisa de Ajuda?

Me diga qual passo você está e eu te auxilio!

Opções:
1. ✅ Já tenho Client ID e Secret
2. ✅ Já tenho Refresh Token
3. ❌ Preciso criar tudo do zero
4. ❓ Não sei se tenho Google Workspace ou One
