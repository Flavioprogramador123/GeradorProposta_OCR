# 🚀 Guia: Usando Claude.code no VSCode/Cursor

## 📁 O que é o arquivo `claude.code`?

É um arquivo de configuração JSON que documenta seu projeto para o Claude AI, facilitando:

- ✅ Entendimento rápido da estrutura do projeto
- ✅ Referência de comandos importantes
- ✅ Documentação de APIs e endpoints
- ✅ Variáveis de ambiente necessárias

## 🔧 Configuração no VSCode/Cursor

### 1️⃣ Abrir o Workspace

```powershell
# Na pasta do projeto, execute:
code Prompt_ORC_pieng.code-workspace
```

Ou no VSCode: `File → Open Workspace from File...`

### 2️⃣ Extensões Recomendadas

O workspace agora sugere automaticamente as extensões necessárias:

- **ESLint** - Linting de código
- **Prettier** - Formatação automática
- **Python** - Suporte para scripts Python
- **TypeScript** - Melhor experiência com TS
- **Tailwind CSS** - Autocomplete para Tailwind
- **Auto Rename Tag** - Facilita edição de HTML/JSX

Quando abrir o workspace, clique em **"Install Recommended Extensions"**

### 3️⃣ Usar o arquivo Claude.code

O arquivo `claude.code` serve como **referência rápida**:

```json
{
  "developmentCommands": {
    "start": "npm run dev", // Iniciar desenvolvimento
    "build": "npm run build", // Build de produção
    "production": "npm start", // Rodar em produção
    "deploy": "vercel --prod" // Deploy na Vercel
  }
}
```

### 4️⃣ Integração com Claude/Cursor

#### No Cursor (já integrado):

- O arquivo `.code` é automaticamente lido pelo Claude
- Facilita o contexto quando você pede ajuda
- **Basta conversar** e o Claude já sabe sobre o projeto

#### No VSCode:

- Use a extensão **"Continue"** ou **"Codeium"**
- Configure para ler o arquivo `claude.code` no início

## 💡 Como usar o Claude no dia a dia

### Comandos úteis no Cursor:

```
/edit - Editar código com instrução
/cmd - Executar comando no terminal
/help - Ver todos os comandos
```

### Perguntas que o Claude entende melhor com o `claude.code`:

❓ "Como faço para gerar uma proposta?"
❓ "Quais são os endpoints da API de admin?"
❓ "Como configurar as variáveis de ambiente?"
❓ "Qual é a estrutura de pastas do projeto?"

## 📋 Atalhos VSCode úteis

| Atalho             | Ação               |
| ------------------ | ------------------ |
| `Ctrl + P`         | Buscar arquivo     |
| `Ctrl + Shift + P` | Paleta de comandos |
| `Ctrl + B`         | Toggle sidebar     |
| `Ctrl + J`         | Toggle terminal    |
| `Ctrl + ,`         | Configurações      |

## 🔍 Verificar se está tudo OK

Execute no terminal:

```powershell
# 1. Verificar Node.js
node --version

# 2. Verificar NPM
npm --version

# 3. Instalar dependências
npm install

# 4. Iniciar projeto
npm run dev
```

## 🎯 Próximos Passos

1. ✅ Abrir o workspace: `Prompt_ORC_pieng.code-workspace`
2. ✅ Instalar extensões recomendadas
3. ✅ Verificar arquivo `.env` com as variáveis de ambiente
4. ✅ Executar `npm install`
5. ✅ Iniciar desenvolvimento com `npm run dev`

## 🆘 Problemas Comuns

### "Claude não reconhece o projeto"

- Certifique-se de que está no workspace correto
- Reabra o Cursor/VSCode

### "Erro ao abrir workspace"

- O arquivo `.code-workspace` deve estar na raiz do projeto
- Verifique se é um JSON válido

### "Extensões não aparecem"

- `Ctrl + Shift + X` → Procure manualmente
- Ou use: `code --install-extension EXTENSION_ID`

## 📚 Documentação Adicional

- **CLAUDE.md** - Documentação completa do sistema
- **README.md** - Instruções gerais
- **package.json** - Scripts e dependências disponíveis

---

**Dica:** O arquivo `claude.code` é como um "manual de instruções" para o AI. Mantenha-o atualizado conforme o projeto evolui! 🚀
