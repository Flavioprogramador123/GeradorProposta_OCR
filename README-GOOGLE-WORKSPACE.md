# ☁️ Integração Google Workspace - PIENG Solar

## 📋 Visão Geral

Sistema completo de integração com Google Workspace para armazenamento em nuvem das propostas solares, oferecendo backup automático, acesso remoto e sincronização em tempo real.

## 🚀 Funcionalidades

### ✅ Armazenamento em Nuvem
- **Google Drive**: Armazenamento ilimitado para propostas e dados
- **Estrutura Organizada**: Pastas hierárquicas por cliente
- **Backup Automático**: Sincronização contínua dos dados

### ✅ APIs Integradas
- **`/api/admin/clientes-google`**: Lista clientes do Google Drive
- **`/api/admin/sync-google-drive`**: Sincroniza dados locais → nuvem
- **`/api/admin/orcamentos-todos`**: Orçamentos integrados com Google Drive

### ✅ Interface Administrativa
- **Botão Google Drive**: Sincronização com um clique
- **Status em Tempo Real**: Visualização do progresso
- **Fallback Inteligente**: Funciona offline quando necessário

## ⚙️ Configuração

### 1. 🔧 Google Cloud Console

#### Criar Projeto
1. Acesse: https://console.cloud.google.com/
2. Clique em "Novo Projeto"
3. Nome: "PIENG Solar Propostas"
4. Clique em "Criar"

#### Ativar APIs
1. Vá em "APIs e Serviços" > "Biblioteca"
2. Procure por "Google Drive API"
3. Clique em "Ativar"

#### Criar Service Account
1. Vá em "APIs e Serviços" > "Credenciais"
2. Clique em "Criar Credenciais" > "Conta de Serviço"
3. Nome: "pieng-solar-drive"
4. Descrição: "Service account para PIENG Solar"
5. Clique em "Criar e Continuar"

#### Baixar Credenciais
1. Clique na conta de serviço criada
2. Vá na aba "Chaves"
3. Clique em "Adicionar Chave" > "Criar Nova Chave"
4. Tipo: JSON
5. Clique em "Criar"
6. Salve o arquivo JSON

### 2. 📁 Estrutura Google Drive

```
PIENG-Propostas/
├── Clientes/
│   ├── marcelo-14-10-2025/
│   │   ├── proposta.json
│   │   ├── proposta_marcelo-14-10-2025.html
│   │   └── proposta_resultados_marcelo-14-10-2025.html
│   ├── daniel-verdura-29-09-2025/
│   │   ├── proposta.json
│   │   └── [arquivos...]
│   └── [outros clientes...]
└── Configuracoes/
    ├── sistemas.json
    └── precos.yaml
```

### 3. 🔑 Variáveis de Ambiente

#### Arquivo `.env.local`
```env
# Google Workspace Configuration
GOOGLE_CLIENT_EMAIL=pieng-solar-drive@seu-projeto.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Netlify Configuration
EMAIL_USER=seu-email@gmail.com
EMAIL_PASS=sua-senha-app
```

#### Netlify Environment Variables
1. Acesse: https://app.netlify.com
2. Vá em Site Settings > Environment Variables
3. Adicione:
   - `GOOGLE_CLIENT_EMAIL`
   - `GOOGLE_PRIVATE_KEY`

### 4. 🚀 Script de Configuração

```powershell
.\scripts\setup-google-workspace.ps1
```

## 📊 Como Usar

### 1. 🔄 Sincronização Manual

#### Via Interface Web
1. Acesse: https://pieng-propostas-solares.netlify.app/admin
2. Clique no botão "☁️ Google Drive"
3. Confirme a sincronização
4. Aguarde o processo concluir

#### Via API
```bash
curl -X POST https://pieng-propostas-solares.netlify.app/api/admin/sync-google-drive \
  -H "Content-Type: application/json" \
  -d '{"clientePasta": "marcelo-14-10-2025"}'
```

### 2. 📋 Listagem de Clientes

#### Via Interface Web
- Acesse a área administrativa
- Clientes são carregados automaticamente do Google Drive

#### Via API
```bash
curl https://pieng-propostas-solares.netlify.app/api/admin/clientes-google
```

### 3. 🔄 Deploy Automático

```powershell
.\deploy-rapido.ps1
```

## 🎯 Fluxo de Trabalho

### 1. 📝 Geração de Proposta
1. Execute o sistema principal
2. Gere a proposta para o cliente
3. Arquivo salvo em: `src\data\clientes\[cliente-slug]\proposta_[cliente-slug].html`

### 2. ☁️ Sincronização com Google Drive
1. Execute: `.\scripts\setup-google-workspace.ps1` (primeira vez)
2. Configure as variáveis de ambiente
3. Execute: Deploy automático ou sincronização manual

### 3. 🌐 Acesso Remoto
1. Dados ficam disponíveis no Google Drive
2. Acesso de qualquer lugar
3. Backup automático garantido

## 💡 Vantagens

### ✅ Escalabilidade
- **Armazenamento Ilimitado**: Sem limites de espaço
- **Performance**: CDN global do Google
- **Confiabilidade**: 99.9% de uptime

### ✅ Segurança
- **Criptografia**: Dados criptografados em trânsito e repouso
- **Controle de Acesso**: Permissões granulares
- **Auditoria**: Logs completos de acesso

### ✅ Integração
- **Google Workspace**: Integração nativa
- **APIs Robustas**: SDK oficial do Google
- **Fallback**: Funciona offline quando necessário

### ✅ Backup e Recuperação
- **Versionamento**: Histórico de alterações
- **Recuperação**: Restauração de arquivos deletados
- **Sincronização**: Múltiplos dispositivos

## 🔧 Troubleshooting

### Problema: Credenciais não funcionam
**Solução:**
1. Verifique se a Service Account tem permissões
2. Confirme se a Google Drive API está ativada
3. Valide o formato da chave privada

### Problema: Upload falha
**Solução:**
1. Verifique a conexão com a internet
2. Confirme se há espaço no Google Drive
3. Valide as permissões da Service Account

### Problema: Sincronização lenta
**Solução:**
1. Use upload em lotes
2. Otimize o tamanho dos arquivos
3. Configure cache local

## 📞 Suporte

- **Email**: contato@piengsolucoes.com.br
- **WhatsApp**: (62) 99167-0536
- **Site**: www.piengsolucoes.com.br

## 🎯 Próximas Funcionalidades

- [ ] Sincronização bidirecional (nuvem → local)
- [ ] Compartilhamento direto com clientes
- [ ] Integração com Google Sheets para relatórios
- [ ] Backup automático agendado
- [ ] Notificações de sincronização
- [ ] Dashboard de uso do Google Drive
