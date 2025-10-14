# 🚀 Sistema de Deploy Automático e Envio de Propostas

## 📋 Visão Geral

Sistema completo para deploy automático de propostas solares no Netlify com envio automático de links para clientes via email.

## 🌐 URLs do Sistema

- **Site Principal**: https://pieng-propostas-solares.netlify.app
- **API de Envio**: https://pieng-propostas-solares.netlify.app/.netlify/functions/send-proposal-email

## 🚀 Deploy Automático

### 1. Deploy Rápido (Uso Diário)
```powershell
.\deploy-rapido.ps1
```

### 2. Deploy com Email para Cliente
```powershell
.\scripts\deploy-netlify-automatico.ps1 -ClienteNome "Marcelo" -EmailCliente "marcelo@email.com"
```

### 3. Configuração Inicial
```powershell
.\scripts\setup-netlify-automatico.ps1
```

## 📧 Envio de Propostas para Clientes

### 1. Via Script PowerShell
```powershell
.\scripts\enviar-proposta-cliente.ps1 -ClienteNome "João Silva" -ClienteEmail "joao@email.com" -PropostaSlug "joao-silva-14-10-2025"
```

### 2. Via API Direta
```bash
curl -X POST https://pieng-propostas-solares.netlify.app/.netlify/functions/send-proposal-email \
  -H "Content-Type: application/json" \
  -d '{
    "clienteNome": "João Silva",
    "clienteEmail": "joao@email.com",
    "propostaUrl": "https://pieng-propostas-solares.netlify.app/proposta/joao-silva-14-10-2025"
  }'
```

### 3. Via Componente React
```tsx
import EnviarProposta from '@/components/EnviarProposta';

<EnviarProposta
  propostaSlug="joao-silva-14-10-2025"
  clienteNome="João Silva"
  clienteEmail="joao@email.com"
  onSuccess={(url) => console.log('Proposta enviada:', url)}
  onError={(error) => console.error('Erro:', error)}
/>
```

## ⚙️ Configuração do Netlify

### 1. Variáveis de Ambiente
Configure no painel do Netlify:
- `EMAIL_USER`: Seu email Gmail
- `EMAIL_PASS`: Senha de app do Gmail

### 2. Configuração de Build
- **Build Command**: `node scripts/generate-netlify-index.js`
- **Publish Directory**: `pastanetilify`
- **Node Version**: `18`

### 3. Configuração de Email
Para usar Gmail:
1. Ative a verificação em 2 etapas
2. Gere uma senha de app
3. Use essa senha na variável `EMAIL_PASS`

## 📁 Estrutura de Arquivos

```
├── scripts/
│   ├── generate-netlify-index.js      # Gerador automático de index.html
│   ├── deploy-netlify-automatico.ps1  # Deploy completo
│   ├── enviar-proposta-cliente.ps1    # Envio de propostas
│   └── setup-netlify-automatico.ps1   # Configuração inicial
├── netlify/
│   └── functions/
│       └── send-proposal-email.js     # Função Netlify para envio
├── src/
│   ├── components/
│   │   └── EnviarProposta.tsx         # Componente React
│   └── pages/api/
│       └── enviar-proposta-cliente.ts # API Next.js
├── pastanetilify/
│   ├── index.html                     # Gerado automaticamente
│   └── orçamento/clientes/            # Propostas HTML
├── netlify.toml                       # Configuração Netlify
└── package-netlify.json              # Dependências Netlify
```

## 🔄 Fluxo de Trabalho

### 1. Geração de Proposta
1. Execute o sistema principal
2. Gere a proposta para o cliente
3. Salve em `pastanetilify/orçamento/clientes/`

### 2. Deploy Automático
1. Execute `.\deploy-rapido.ps1`
2. Sistema gera `index.html` automaticamente
3. Faz commit e push para GitHub
4. Netlify detecta mudanças e faz deploy

### 3. Envio para Cliente
1. Execute script de envio com dados do cliente
2. Sistema envia email personalizado
3. Cliente recebe link direto da proposta
4. Log do envio é salvo automaticamente

## 📊 Monitoramento

### 1. Logs de Envio
- Arquivo: `logs/envios-propostas.json`
- Contém histórico de todos os envios

### 2. Analytics Netlify
- Acesse o painel do Netlify
- Monitore acessos às propostas
- Veja estatísticas de uso

### 3. Logs de Função
- Acesse Netlify Functions
- Veja logs de envio de emails
- Monitore erros e sucessos

## 🛠️ Troubleshooting

### Problema: Email não enviado
**Solução:**
1. Verifique variáveis de ambiente no Netlify
2. Confirme senha de app do Gmail
3. Verifique logs da função

### Problema: Deploy não atualiza
**Solução:**
1. Verifique se o push foi feito
2. Confirme configuração de build
3. Veja logs de build no Netlify

### Problema: Proposta não encontrada
**Solução:**
1. Verifique se arquivo existe em `pastanetilify/orçamento/clientes/`
2. Execute script de geração manual
3. Confirme nome do arquivo

## 📞 Suporte

- **Email**: contato@piengsolucoes.com.br
- **WhatsApp**: (62) 99167-0536
- **Site**: www.piengsolucoes.com.br

## 🎯 Próximas Funcionalidades

- [ ] Integração com WhatsApp API
- [ ] Dashboard de monitoramento
- [ ] Templates de email personalizáveis
- [ ] Integração com CRM
- [ ] Analytics avançados
