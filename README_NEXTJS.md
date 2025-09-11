# 🚀 PIENG Sistema Next.js v2.0 - Guia Completo

> **Sistema de propostas solares moderno com Next.js + React + Vercel**  
> **Status:** ✅ Funcionando em produção | 🔗 https://pieng-propostas.vercel.app

## 🎯 **O que é o Sistema PIENG Next.js?**

Sistema revolucionário que migrou de HTML estático para arquitetura moderna:

- **🔄 Antes:** HTML manual + Deploy manual
- **🚀 Agora:** JSON + Componentes React + Deploy automático
- **🌐 URLs profissionais:** `/proposta/cliente-cidade`
- **📱 Totalmente responsivo** e otimizado

## 📋 **Exemplo Funcionando: Bin - Pirenópolis 🐎⚔️**

**📂 Estrutura:**
```
src/data/clientes/binpiri/
├── dadosusuario.md          # Info do cliente
├── dados_extraidos.json     # PDFs processados
└── proposta.json           # Dados para React
```

**🔗 Resultado:** https://pieng-propostas.vercel.app/proposta/bin-pirinopolis  
**🎭 Personalização:** Símbolos das Cavalhadas de Pirenópolis

## 🛠️ **Configuração Inicial**

### **1. Ambiente de Desenvolvimento**
```bash
# Instalar dependências
npm install

# Iniciar servidor local
npm run dev
# Acessa: http://localhost:3000
```

### **2. Variáveis de Ambiente**
Criar arquivo `.env`:
```bash
VERCEL_TOKEN=seu_token_aqui
```

### **3. Estrutura do Projeto**
```
📦 PIENG Next.js v2.0
├── 📂 src/
│   ├── 📂 components/         # Componentes React
│   ├── 📂 data/clientes/      # Dados dos clientes
│   ├── 📂 lib/               # Utilitários
│   └── 📂 pages/             # Páginas Next.js
├── 📄 promptsolar.md         # Instruções principais
├── 📄 manual_propostas_pieng.md  # Manual técnico
└── 📄 next.config.js         # Configuração Next.js
```

## 🔧 **Como Criar Nova Proposta**

### **Passo 1: Estrutura de Dados**
```bash
# Criar pasta do cliente
mkdir src/data/clientes/nome-cliente

# Criar arquivos necessários:
# - dadosusuario.md
# - dados_extraidos.json (PDFs processados)
# - proposta.json (será gerado automaticamente)
```

### **Passo 2: Configurar Rota**
Editar `src/pages/proposta/[slug].tsx`:

```typescript
export const getStaticPaths: GetStaticPaths = async () => {
  const paths = [
    { params: { slug: 'bin-pirinopolis' } },
    { params: { slug: 'novo-cliente-cidade' } },  // ← Adicionar aqui
  ];
  return { paths, fallback: false };
};
```

### **Passo 3: Carregar Dados**
Adicionar no mesmo arquivo:

```typescript
} else if (slug === 'novo-cliente-cidade') {
  const fs = require('fs');
  const path = require('path');
  const propostaPath = path.join(process.cwd(), 'src/data/clientes/nome/proposta.json');
  const propostaData = JSON.parse(fs.readFileSync(propostaPath, 'utf8'));
  
  proposta = {
    ...propostaData,
    analise: { /* dados calculados */ },
    empresa: { /* dados PIENG */ },
    bannerUrgencia: 'Texto personalizado',
    dataGeracao: '09/09/2025',
    dataValidade: '23/09/2025'
  };
}
```

### **Passo 4: Deploy**
```bash
# Commit e deploy
git add .
git commit -m "🐎⚔️ Nova proposta: Cliente Nome"
npx vercel --prod --yes

# URL automaticamente ativa:
# https://pieng-propostas.vercel.app/proposta/cliente-cidade
```

## 📊 **Formato do proposta.json**

```json
{
  "cliente": {
    "nome": "Cliente - Cidade 🎭",
    "cidade": "Cidade/Estado",
    "consumoKwh": "1000",
    "tipo": "Residencial",
    "hspLocal": "5.21"
  },
  "sistemas": [
    {
      "titulo": "Sistema Econômico",
      "potencia": "8,61 kWp",
      "especificacoes": ["14x módulos...", "1x inversor..."],
      "precoRiscado": "R$ 23.500,00",
      "precoAtual": "R$ 19.175,28", 
      "tagDesconto": "ECONOMIA DE 18%",
      "precoPixDecimal": 17257.65,
      "preco12x": "R$ 1.598,02",
      "preco18x": "R$ 1.134,64",
      "geracao": "930 kWh",
      "cobertura": "93%",
      "economia": "R$ 912,00",
      "payback": "17,6 meses",
      "tir": "68,2%",
      "isRecommended": true,
      "badge": "⭐ MELHOR PAYBACK"
    }
  ]
}
```

## 🎨 **Personalização Cultural**

### **Símbolos e Emojis por Região:**
- **🐎⚔️ Pirenópolis:** Cavalhadas
- **🏛️ Brasília:** Arquitetura
- **🌊 Caldas Novas:** Águas termais
- **⛰️ Chapada dos Guimarães:** Natureza
- **🏖️ Litoral:** Praia

### **Como personalizar:**
```json
{
  "cliente": {
    "nome": "Cliente - Pirenópolis 🐎⚔️",
    "cidade": "Pirenópolis/GO"
  }
}
```

## 🔧 **Comandos Úteis**

### **Desenvolvimento**
```bash
npm run dev          # Servidor local
npm run build        # Build produção
npm run start        # Servidor produção
```

### **Deploy Vercel**
```bash
npx vercel           # Deploy staging
npx vercel --prod    # Deploy produção
npx vercel --help    # Ajuda
```

### **Git**
```bash
git status           # Ver mudanças
git add .            # Adicionar tudo
git commit -m "msg"  # Commit
git push            # Push (se configurado)
```

## 🚨 **Troubleshooting**

### **Problema 1: Página 404**
```bash
# Verificar se slug está em getStaticPaths
# Verificar se proposta.json existe
# Rebuildar o projeto
npm run build
```

### **Problema 2: Deploy falha**
```bash
# Verificar token Vercel
echo $VERCEL_TOKEN

# Re-autenticar
npx vercel login
```

### **Problema 3: Dados não aparecem**
```bash
# Verificar formato JSON
# Verificar se dados complementares estão sendo adicionados
# Verificar console do navegador para erros
```

## 📞 **Suporte**

### **Links Importantes**
- **🌐 Produção:** https://pieng-propostas.vercel.app
- **🔗 Exemplo:** /proposta/bin-pirinopolis
- **📚 Vercel Docs:** https://vercel.com/docs
- **⚛️ Next.js Docs:** https://nextjs.org/docs

### **Contato PIENG**
- **📱 WhatsApp:** (62) 99167-0536
- **📧 E-mail:** contato@piengsolucoes.com.br
- **🌐 Site:** www.piengsolucoes.com.br

---

**🎯 Sistema PIENG Next.js v2.0 - Energia solar com tecnologia moderna! 🌞⚡**