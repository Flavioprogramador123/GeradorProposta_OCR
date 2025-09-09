# 🌞 Prompt Solar PIENG - Sistema Modernizado v2.0

> **⚡ SISTEMA ATUALIZADO PARA NEXT.JS + VERCEL**  
> Arquitetura moderna com componentes React e URLs profissionais

## 📋 Instruções Base

### **📚 Base de Conhecimento**
- Utilize o `manual_propostas_pieng.md` como referência para cálculos e parâmetros técnicos
- Use o `README_TEMPLATE_SYSTEM.md` para entender a nova arquitetura
- Mantenha todas as estratégias PNL e segurança de dados

### **🏗️ Arquitetura Moderna**
**❌ Sistema Antigo:**
```
template_proposta_pieng.html → HTML estático → Deploy manual
```

**✅ Sistema Novo:**
```
src/data/clientes/[nome]/proposta.json → Componentes React → URL única
https://pieng-propostas.vercel.app/proposta/nome-cidade-data
```

## 🔧 Processo Atualizado

### **1. Coleta de Dados (Mantida)**
Colete as informações do cliente:
  - pergunte o nome do cliente para o usuario, analise a pasta no src/data/clientes/[nome]/ 
  - analise se ha o arquivo dadosusuario.md com os dados necessarios
  - analise se tem as proposta podem ir de 1 a 5 propostas.
- Nome do cliente
- Tipo de imóvel (residencial, comercial, industrial, rural)
- Consumo mensal (kWh)
- Cidade e estado
- HSP local (se diferente de 5.21)
- Pdespesa (valor sigiloso - nunca expor)

### **2. Extração de PDFs (Task Tool)**
```bash
# Use Task tool para extrair dados dos PDFs
# Salvar em: src/data/clientes/[nome]/dados_extraidos.json
```

Estrutura esperada dos dados extraídos:
```json
{
  "orcamentos": [
    {
      "fornecedor": "Nome do Fornecedor",
      "potencia_kwp": "4.62",
      "modulos": "14x 330W Monocristalino",
      "inversores": "1x 5kW String",
      "pcusto": 9347.73,
      "outros_componentes": ["Estrutura alumínio", "Cabeamento CC/CA"]
    }
  ]
}
```

### **3. Estrutura de Dados Moderna**
Crie arquivo: `src/data/clientes/[nome]/proposta.json`
```json
{
  "cliente": {
    "nome": "Nome do Cliente",
    "cidade": "Cidade/Estado", 
    "consumoKwh": "450",
    "tipo": "Residencial",
    "hspLocal": "5.21"
  },
  "sistemas": [
    {
      "titulo": "Sistema Econômico",
      "potencia": "4,62 kWp", 
      "especificacoes": ["14 módulos 330W", "1 inversor 5kW"],
      "precoPixDecimal": 15980.34,
      "preco12x": "R$ 1.403,98",
      "preco18x": "R$ 1.069,32",
      "payback": "19,6 meses",
      "tir": "61,2%",
      "isRecommended": true,
      "badge": "⭐ MELHOR PAYBACK"
    }
  ]
}
```

### **4. Cálculos e Geração**
```javascript
// Usar fórmulas do manual_propostas_pieng.md
// Aplicar Performance Rate 75%
// Calcular paybacks, TIR, economia
// Identificar sistema recomendado (melhor payback)
```

### **5. Deploy Automático**
```bash
# Após criar proposta.json:
npm run build
git add .
git commit -m "Nova proposta: Cliente Nome"
git push

# URL ativa automaticamente:
# https://pieng-propostas.vercel.app/proposta/nome-cidade-data
```

## 🔒 Regras de Segurança (Mantidas)

### **❌ NUNCA EXPOR:**
- `pdespesa` (margem mão de obra)  
- `pcusto` (preço fornecedores)
- `markup_percentual` (estratégias comerciais)
- Técnicas PNL específicas
- Fórmulas de precificação

### **✅ SEMPRE MOSTRAR:**
- Preços finais (PIX, 12x, 18x)
- Performance técnica (payback, TIR)
- Especificações dos equipamentos
- Dados do cliente

## 🎯 Comandos Rápidos

### **Setup Inicial**
```bash
npm install
npm run dev
# Acessar: http://localhost:3000
```

### **Nova Proposta**
```bash
# 1. Extrair dados PDFs → src/data/clientes/nome/dados_extraidos.json
# 2. Criar proposta.json → src/data/clientes/nome/proposta.json  
# 3. Deploy: git add . && git commit -m "Proposta Nome" && git push
# 4. URL ativa: /proposta/nome-cidade-data
```

## ⚡ Execução com Dados Existentes

**Para processar dados em `src/data/clientes/arisio/`:**
1. Ler `dados_extraidos.json` (se existir)
2. Ler dados do cliente
3. Aplicar fórmulas PIENG v2.0
4. Gerar `proposta.json`
5. Sistema gera URL automaticamente

**📍 Arquivos necessários na pasta do cliente:**
- `dados_extraidos.json` (dados dos PDFs)
- `dadosusuario.md` (informações do cliente)
- `proposta.json` (será gerado automaticamente)
