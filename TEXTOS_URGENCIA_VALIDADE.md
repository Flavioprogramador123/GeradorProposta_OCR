# 📝 Textos de Urgência e Validade - PIENG Solar

## ✅ Texto Padrão Atual

**Banner de Urgência:**
```
🚀 Oferta especial por tempo limitado! Orçamento válido por 2 dias ou até acabar o estoque.
```

**Footer/Validade:**
```
Orçamento válido por 2 dias ou até acabar o estoque • Equipamentos sujeitos à disponibilidade
```

---

## 💡 Sugestões de Textos Alternativos

### Opção 1: Foco em Tempo Limitado
```
🚀 Oferta especial por tempo limitado! Orçamento válido por 2 dias ou até acabar o estoque.
```

### Opção 2: Foco em Estoque Limitado
```
⚡ Oferta especial! Estoque limitado - Orçamento válido por 2 dias ou enquanto houver disponibilidade.
```

### Opção 3: Mais Urgente
```
🔥 Oferta por tempo limitado! Orçamento válido por apenas 2 dias ou até esgotar o estoque.
```

### Opção 4: Mais Profissional
```
📋 Orçamento válido por 2 dias corridos ou até esgotar o estoque de equipamentos.
```

### Opção 5: Com Prazo Específico
```
⏰ Oferta especial válida por 48 horas! Ou até acabar o estoque - o que ocorrer primeiro.
```

### Opção 6: Mais Direto
```
🎯 Oferta limitada! Válida por 2 dias ou até acabar estoque.
```

### Opção 7: Com Destaque em Estoque
```
📦 Estoque limitado! Orçamento válido por 2 dias ou até esgotar os equipamentos disponíveis.
```

### Opção 8: Mais Comercial
```
💰 Oferta especial por tempo limitado! Orçamento válido por 2 dias ou até acabar o estoque - aproveite agora!
```

---

## 📍 Onde os Textos São Usados

### 1. Banner de Urgência (Topo da Proposta)
- **Arquivo:** `src/lib/templateEngine.ts` (linha 388)
- **Variável:** `BANNER_URGENCIA`
- **Aparece em:** Banner destacado no topo da proposta

### 2. Footer/Validade (Rodapé)
- **Arquivo:** `src/components/Footer.tsx` (linha 62)
- **Template:** `pieng_proposal_template.html` (linha 667)
- **Aparece em:** Rodapé da proposta com disclaimers

### 3. Templates de Variantes
- Todos os templates em `src/data/knowledge/templates/variants/`
- Texto de validade no footer de cada variante

---

## 🔧 Como Alterar

### Para Alterar o Banner de Urgência:

1. **Alterar padrão em `templateEngine.ts`:**
```typescript
BANNER_URGENCIA: data.bannerUrgencia || "SEU TEXTO AQUI",
```

2. **Alterar em APIs que geram propostas:**
- `src/pages/api/gerar-proposta.ts`
- `src/pages/api/consultor/gerar-proposta.ts`
- `src/pages/api/admin/gerar-propostas/[clienteId].ts`

### Para Alterar Texto de Validade:

1. **Alterar em `Footer.tsx`:**
```tsx
• Orçamento válido por 2 dias ou até acabar o estoque
```

2. **Alterar em templates HTML:**
- `pieng_proposal_template.html`
- Todos os templates em `variants/*.html`

---

## 📊 Textos Atuais Configurados

| Local | Texto Atual |
|-------|-------------|
| **Banner Urgência** | 🚀 Oferta especial por tempo limitado! Orçamento válido por 2 dias ou até acabar o estoque. |
| **Footer Validade** | Orçamento válido por 2 dias ou até acabar o estoque • Equipamentos sujeitos à disponibilidade |
| **Proposta Footer** | Válida por 2 dias ou até acabar o estoque • Sujeita à análise técnica do local |

---

## ✅ Recomendações

**Texto Recomendado (Atual):**
- ✅ Flexível (não menciona data específica)
- ✅ Cria urgência (tempo limitado + estoque)
- ✅ Profissional mas acessível
- ✅ Funciona para todos os tipos de cliente

**Variações por Tipo de Cliente:**
- **Residencial:** Pode usar "Oferta especial para sua casa"
- **Comercial:** Pode usar "Reduza seus custos operacionais"
- **Industrial:** Pode usar "Maximize sua produtividade"

---

## 🔄 Próximas Melhorias

- [ ] Criar textos personalizados por tipo de cliente
- [ ] Adicionar opção de configurar prazo de validade
- [ ] Permitir personalização via configurações do sistema

