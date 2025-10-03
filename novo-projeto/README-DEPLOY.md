# 🚀 Guia de Deploy - Sistema de Orçamentos

## Estrutura Atual
```
novo-projeto/
├── index.html (página principal)
├── package.json (configurações)
├── deploy.bat (script de deploy)
├── orçamento/
│   ├── gerenciador-orçamentos.js (atualizador automático)
│   └── clientes/
│       ├── orçamento-daniel-verdura.html
│       ├── orçamento-jaime.html
│       └── orçamento-jose-rubem.html
```

## 📋 Como Adicionar Novos Orçamentos

### Método 1: Manual (Mais Simples)
1. Copie o novo arquivo HTML para `orçamento/clientes/`
2. Renomeie seguindo o padrão: `orçamento-[nome-cliente].html`
3. Execute: `npm run atualizar-orçamentos`
4. Faça o deploy no Netlify

### Método 2: Git Integration (Recomendado)
1. Configure Git no projeto:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```

2. Conecte com GitHub/GitLab
3. Configure deploy automático no Netlify
4. Para adicionar orçamentos:
   - Adicione o arquivo HTML na pasta `clientes/`
   - Execute: `npm run atualizar-orçamentos`
   - Commit e push: `git add . && git commit -m "Novo orçamento" && git push`

## 🔄 Atualizações Incrementais

### Opção A: Deploy Manual
- Adicione apenas os novos arquivos HTML
- Execute `deploy.bat` para atualizar a lista
- Faça upload apenas dos arquivos modificados

### Opção B: Deploy Automático (Git)
- Configure webhook no Netlify
- A cada push, o deploy acontece automaticamente
- Apenas adicione arquivos e faça commit

## 📁 Estrutura Recomendada para Novos Orçamentos

```
orçamento/clientes/
├── orçamento-cliente1-2025-01.html
├── orçamento-cliente2-2025-01.html
├── orçamento-cliente3-2025-02.html
└── ...
```

## ⚡ Comandos Úteis

```bash
# Atualizar lista de orçamentos
npm run atualizar-orçamentos

# Deploy completo
npm run deploy

# Verificar estrutura
dir orçamento\clientes
```

## 🌐 Deploy no Netlify

1. **Deploy Manual:**
   - Acesse https://app.netlify.com
   - Arraste a pasta `novo-projeto` para a área de deploy

2. **Deploy Automático:**
   - Conecte repositório Git
   - Configure build command: `npm run deploy`
   - Configure publish directory: `.` (raiz)

## ✅ Vantagens desta Estrutura

- ✅ Adicionar orçamentos sem modificar código
- ✅ Atualização automática da lista
- ✅ Deploy incremental
- ✅ Organização por cliente
- ✅ Fácil manutenção

