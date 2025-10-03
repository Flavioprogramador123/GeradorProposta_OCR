# 🌞 PROCESSO COMPLETO - CRIAÇÃO DE PROPOSTAS PIENG

## 🎯 FLUXO PASSO A PASSO

### **📋 Pré-requisitos**
- Sistema Next.js instalado (`npm install`)
- Claude Code com acesso aos arquivos
- Orçamentos dos fornecedores (1-5 PDFs)
- Dados do cliente definidos

---

## 🔄 PROCESSO COMPLETO

### **PASSO 1: Preparação da Pasta do Cliente**
```bash
# Estrutura a ser criada:
src/data/clientes/[NOME_CLIENTE]/
├── dadosusuario.md          # Dados do cliente
├── orcamento_01.pdf         # PDF do fornecedor 1
├── orcamento_02.pdf         # PDF do fornecedor 2 (se houver)
├── orcamento_03.pdf         # ... até 5 orçamentos
└── dados_extraidos.json     # Gerado automaticamente
```

### **PASSO 2: Template dadosusuario.md**
```markdown
# Dados do Cliente

## Informações Básicas
- **Nome:** João Silva
- **Cidade:** Anápolis/GO
- **Tipo:** Residencial
- **Consumo:** 450 kWh/mês
- **HSP Local:** 5.21 (padrão Anápolis)

## Dados Comerciais (SIGILOSOS)
- **Pdespesa:** R$ 7.500,00
- **Observações:** Cliente quer payback baixo, prioriza economia
```

### **PASSO 3: Execução do promptsolar.md**
No Claude Code, executar:

```markdown
Execute o promptsolar.md com os dados da pasta:
src/data/clientes/[NOME_CLIENTE]/

Cliente: [NOME]
Consumo: [XXX] kWh/mês  
Cidade: [CIDADE/ESTADO]
PDFs: [listar arquivos]
```

### **PASSO 4: Processo Automático**
O sistema executará automaticamente:

1. **📄 Extração de PDFs**
   - Task tool extrai dados dos orçamentos
   - Salva em `dados_extraidos.json`

2. **🧮 Cálculos PIENG v2.0**
   - Aplica Performance Rate 75%
   - Calcula PIX, 12x, 18x
   - Determina paybacks e TIRs
   - Identifica sistema recomendado

3. **📝 Geração proposta.json**
   - Estrutura TypeScript completa
   - Dados prontos para componentes React

4. **🚀 Página Automática**
   - URL: `/proposta/nome-cidade-data`
   - Componentes renderizados
   - Pronto para deploy

---

## 📋 TEMPLATE COMPLETO

### **dadosusuario.md Expandido**
```markdown
# Dados do Cliente - [NOME]

## 👤 Informações Básicas
- **Nome Completo:** João Silva Santos
- **Cidade/Estado:** Anápolis/GO
- **Tipo de Imóvel:** Residencial
- **Consumo Mensal:** 450 kWh/mês
- **Gasto Atual:** R$ 495,00/mês
- **HSP Local:** 5.21 (padrão região)

## 🏠 Características do Imóvel
- **Tipo de Telhado:** Cerâmico inclinado
- **Área Disponível:** ~50m² sem sombreamento
- **Orientação:** Sul/Sudeste (ideal)
- **Estrutura:** Madeira (adequada)

## 💰 Dados Comerciais (SIGILOSOS - NUNCA EXPOR)
- **Pdespesa Total:** R$ 7.500,00
- **Margem Desejada:** Conforme tabela PIENG
- **Observações Comerciais:** 
  - Cliente sensível a preço
  - Prioriza payback baixo
  - Interesse em financiamento próprio

## 🎯 Estratégia de Vendas
- **Foco Principal:** Sistema Popular (melhor payback)
- **Argumentos:** Economia mensal + ROI
- **Urgência:** Oferta válida 7 dias
```

---

## 🤖 COMANDO DE EXECUÇÃO

### **Formato do Prompt**
```markdown
🌞 EXECUTAR PROMPTSOLAR.MD

**Cliente:** João Silva
**Pasta:** src/data/clientes/joao_silva/
**Consumo:** 450 kWh/mês
**Cidade:** Anápolis/GO
**Arquivos:**
- dadosusuario.md ✅
- orcamento_fornecedor_1.pdf ✅  
- orcamento_fornecedor_2.pdf ✅
- orcamento_fornecedor_3.pdf ✅

**Instruções:** 
Processar todos os orçamentos, aplicar fórmulas PIENG v2.0, 
gerar proposta.json e configurar URL /proposta/joao-anapolis-2024-09-05

**Segurança:** Manter pdespesa e dados sigilosos protegidos
```

---

## 🧪 TESTE COM ARISIO

### **Executar Teste**
```markdown
🔬 TESTE SISTEMA COMPLETO

**Cliente:** Arisio
**Pasta:** src/data/clientes/arisio/ (já existe)
**Dados disponíveis:**
- dadosusuario.md ✅
- Múltiplos PDFs de orçamento ✅
- dados_arisio_variaveis.json (legado) ✅

**Objetivo:** 
Migrar dados legados → proposta.json moderna → URL funcional
Testar todo o fluxo de desenvolvimento para produção

**Resultado esperado:**
URL: /proposta/arisio-anapolis-2024-09-05
```

---

## 📊 ESTRUTURA DE SAÍDA

### **proposta.json Gerado**
```json
{
  "cliente": {
    "nome": "João Silva",
    "cidade": "Anápolis/GO",
    "consumoKwh": "450", 
    "tipo": "Residencial",
    "hspLocal": "5.21"
  },
  "sistemas": [
    {
      "titulo": "💰 Sistema Econômico",
      "potencia": "4,62 kWp",
      "especificacoes": [
        "14 módulos 330W monocristalino",
        "1 inversor 5kW string",
        "Estrutura alumínio anodizado",
        "Cabeamento CC/CA completo",
        "String box DC/AC"
      ],
      "precoRiscado": "R$ 21.500,00",
      "precoAtual": "R$ 16.847,73", 
      "tagDesconto": "ECONOMIA DE 22%",
      "precoPixDecimal": 15980.34,
      "preco12x": "R$ 1.403,98",
      "preco18x": "R$ 1.069,32",
      "geracao": "630 kWh",
      "cobertura": "140%",
      "economia": "R$ 378,00", 
      "payback": "19,6 meses",
      "tir": "61,2%",
      "isRecommended": false
    },
    {
      "titulo": "🏆 Sistema Popular",
      "potencia": "5,28 kWp",
      "especificacoes": [
        "16 módulos 330W monocristalino", 
        "1 inversor 6kW string",
        "Estrutura alumínio premium",
        "Cabeamento CC/CA reforçado",
        "String box + monitoramento"
      ],
      "precoRiscado": "R$ 24.800,00",
      "precoAtual": "R$ 19.234,56",
      "tagDesconto": "MELHOR CUSTO-BENEFÍCIO", 
      "precoPixDecimal": 18256.78,
      "preco12x": "R$ 1.602,88",
      "preco18x": "R$ 1.221,45",
      "geracao": "720 kWh", 
      "cobertura": "160%",
      "economia": "R$ 432,00",
      "payback": "18,1 meses",
      "tir": "66,3%",
      "isRecommended": true,
      "badge": "⭐ MELHOR PAYBACK"
    }
  ],
  "analise": {
    "paybackMin": "18,1",
    "paybackMax": "22,4", 
    "melhorSistemaNome": "Sistema Popular",
    "melhorSistemaPotencia": "5,28 kWp",
    "melhorSistemaPix": "R$ 18.256,78",
    "melhorSistemaPayback": "18,1 meses",
    "geracaoMax": "720",
    "tirMax": "66,3%",
    "economiaTarifa": "R$ 0,60"
  },
  "empresa": {
    "contato": "(62) 99167-0536",
    "email": "contato@piengsolucoes.com.br", 
    "site": "www.piengsolucoes.com.br",
    "whatsapp": "5562991670536"
  },
  "bannerUrgencia": "⚡ OPORTUNIDADE EXCLUSIVA: PAYBACK EXCEPCIONAL ABAIXO DE 19 MESES! VÁLIDO ATÉ 15/09/2024! ⚡",
  "dataGeracao": "05/09/2024",
  "dataValidade": "15/09/2024"
}
```

---

## ✅ CHECKLIST DE EXECUÇÃO

### **Antes de Executar:**
- [ ] Pasta do cliente criada
- [ ] dadosusuario.md preenchido completamente 
- [ ] PDFs dos fornecedores organizados
- [ ] Sistema Next.js funcionando (`npm run dev`)

### **Durante a Execução:**
- [ ] Task tool extrai dados corretamente
- [ ] Cálculos PIENG v2.0 aplicados
- [ ] Sistema recomendado identificado
- [ ] proposta.json gerado

### **Após Execução:**
- [ ] URL /proposta/cliente funcional
- [ ] Todos os componentes carregando
- [ ] Logo PIENG visível
- [ ] Dados sigilosos protegidos
- [ ] Deploy pronto para Vercel

---

**🚀 PRONTO PARA EXECUTAR! Execute o comando no Claude Code conforme template acima.**