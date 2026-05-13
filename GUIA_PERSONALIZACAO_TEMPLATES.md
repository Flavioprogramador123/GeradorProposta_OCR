# 🎨 Guia de Personalização de Templates - PIENG Solar

Este guia explica como personalizar templates mantendo o engine funcionando para todos e preservando o template padrão.

## 📋 Estrutura do Sistema

### Arquivos Principais

1. **`src/lib/variantConfig.ts`** - Configuração centralizada de todos os templates
2. **`public/styles/[nome-template].css`** - CSS personalizado por template
3. **`src/data/knowledge/templates/variants/[nome-template].html`** - Template HTML (opcional, pode usar o base)

### Template Padrão (NÃO MODIFICAR)

- **`src/data/knowledge/templates/pieng_proposal_template.html`** - Template base universal
- Este template funciona para TODOS os tipos de cliente
- As personalizações são aplicadas via CSS e configurações

---

## 🎯 Como Personalizar um Template

### Passo 1: Atualizar `variantConfig.ts`

Localize a configuração do template que deseja personalizar:

```typescript
'comercial-panificadora': {
  id: 'comercial-panificadora',
  nome: 'Panificadora',
  descricao: 'Template para panificadoras...',
  tipo: 'comercial',
  subtipo: 'panificadora',
  
  tema: {
    corPrimaria: '#d35400',      // Cor principal (botões, destaques)
    corSecundaria: '#f39c12',    // Cor secundária (gradientes)
    gradiente: 'linear-gradient(...)', // Gradiente CSS
    icone: '🥖'                   // Ícone principal do template
  },
  
  copy: {
    tituloHero: '🥖 Sua Padaria 100% Solar',
    subtituloHero: 'Texto personalizado...',
    ctaTexto: 'Quero Economizar na Minha Padaria',
    beneficios: [
      '🥖 Benefício 1 com ícone',
      '🔥 Benefício 2 temático',
      // ...
    ]
  },
  
  cssFile: 'comercial-panificadora.css'
}
```

### Passo 2: Personalizar o CSS

Crie ou edite o arquivo CSS em `public/styles/[nome-template].css`:

```css
/* Estrutura Base */
.variant-comercial-panificadora {
  --variant-primary: #d35400;
  --variant-secondary: #f39c12;
  --variant-gradient: linear-gradient(135deg, #eb3349 0%, #f45c43 100%);
  --variant-accent: #e67e22;
  --variant-icon: '🥖';
}

/* Hero Section - Personalizada */
.variant-comercial-panificadora .hero-section {
  background: var(--variant-gradient);
  /* ... */
}

/* Decoração temática com ícones */
.variant-comercial-panificadora .hero-section::before {
  content: '🥖';  /* Ícone decorativo */
  position: absolute;
  font-size: 15rem;
  opacity: 0.1;
  /* ... */
}

/* Ícones em títulos */
.variant-comercial-panificadora .hero-title::before {
  content: '🥖';
  margin-right: 15px;
}
```

### Passo 3: Adicionar Ícones Temáticos

Use emojis Unicode para ícones temáticos:

- 🥖 Pão/Padaria
- 🔥 Forno/Calor
- ❄️ Freezer/Refrigeração
- 💰 Dinheiro/Economia
- 🏭 Indústria
- 🌾 Rural/Agro
- 🍽️ Restaurante
- 🥩 Açougue
- 🛒 Mercado
- 🏠 Residencial

### Passo 4: Personalizar Textos

No `variantConfig.ts`, personalize os textos para o tipo de negócio:

```typescript
copy: {
  tituloHero: '🥖 Sua Padaria 100% Solar',  // Título com ícone
  subtituloHero: 'Reduza custos de energia e aumente suas margens...',
  ctaTexto: 'Quero Economizar na Minha Padaria',
  beneficios: [
    '🥖 Economia de até 85% na conta de energia',
    '🔥 Fornos e freezers funcionando com energia solar',
    '💰 Maior margem de lucro por produto vendido',
    // ...
  ]
}
```

---

## 🎨 Padrões de Personalização

### Cores por Tipo de Negócio

| Tipo | Cor Primária | Cor Secundária | Tema |
|------|--------------|----------------|------|
| Panificadora | `#d35400` (Laranja) | `#f39c12` (Amarelo) | Quente, acolhedor |
| Açougue | `#c0392b` (Vermelho) | `#e74c3c` (Vermelho claro) | Forte, confiável |
| Restaurante | `#16a085` (Verde água) | `#f39c12` (Amarelo) | Fresco, natural |
| Mercado | `#2980b9` (Azul) | `#27ae60` (Verde) | Confiável, moderno |
| Rural | `#27ae60` (Verde) | `#f39c12` (Amarelo) | Natural, produtivo |
| Residencial | `#3366CC` (Azul) | `#FF6B35` (Laranja) | Moderno, confiável |
| Industrial | `#34495e` (Cinza) | `#3498db` (Azul) | Profissional, robusto |

### Ícones por Seção

```css
/* Hero Section */
.hero-section::before { content: '🥖'; }  /* Ícone decorativo grande */
.hero-title::before { content: '🥖'; }    /* Ícone no título */

/* Seções específicas */
.product-impact h3::before { content: '🥖'; }
.operational-cost-section h3::before { content: '🔥'; }
.economy-section h3::before { content: '💰'; }

/* Cards e tabelas */
.system-card-header::before { content: '🥖'; }
th::before { content: '🥖'; }

/* Botões */
.cta-button::before { content: '🥖'; }
```

---

## ✅ Checklist de Personalização

Para cada template, personalize:

- [ ] **Cores** - Ajustar `corPrimaria`, `corSecundaria` e `gradiente`
- [ ] **Ícone Principal** - Definir `icone` no tema
- [ ] **Título Hero** - Personalizar com ícone e texto específico
- [ ] **Subtítulo Hero** - Texto que fale diretamente ao tipo de negócio
- [ ] **CTA Text** - Botão com linguagem específica
- [ ] **Benefícios** - Lista com ícones temáticos e linguagem específica
- [ ] **CSS Hero** - Decoração temática no hero (::before, ::after)
- [ ] **CSS Seções** - Ícones em títulos de seções
- [ ] **CSS Cards** - Estilo temático nos cards de sistema
- [ ] **CSS Tabelas** - Cabeçalhos com tema
- [ ] **CSS Botões** - CTA com ícone temático

---

## 🚫 Regras Importantes

### ✅ FAZER

1. **Sempre manter o template padrão intacto**
2. **Usar classes `.variant-[id]` para isolamento**
3. **Testar em todos os navegadores**
4. **Manter consistência visual**
5. **Usar ícones Unicode (emojis) para compatibilidade**

### ❌ NÃO FAZER

1. **Modificar o template base (`pieng_proposal_template.html`)**
2. **Quebrar a estrutura HTML existente**
3. **Usar imagens externas sem fallback**
4. **Criar CSS que afete outros templates**
5. **Remover funcionalidades existentes**

---

## 📝 Exemplo Completo: Panificadora

### 1. Configuração (`variantConfig.ts`)

```typescript
'comercial-panificadora': {
  tema: {
    corPrimaria: '#d35400',
    corSecundaria: '#f39c12',
    gradiente: 'linear-gradient(135deg, #eb3349 0%, #f45c43 100%)',
    icone: '🥖'
  },
  copy: {
    tituloHero: '🥖 Sua Padaria 100% Solar',
    subtituloHero: 'Reduza custos de energia e aumente suas margens...',
    ctaTexto: 'Quero Economizar na Minha Padaria',
    beneficios: [
      '🥖 Economia de até 85% na conta de energia',
      '🔥 Fornos e freezers funcionando com energia solar',
      // ...
    ]
  }
}
```

### 2. CSS (`comercial-panificadora.css`)

```css
.variant-comercial-panificadora {
  --variant-primary: #d35400;
  --variant-secondary: #f39c12;
  --variant-gradient: linear-gradient(135deg, #eb3349 0%, #f45c43 100%);
}

/* Hero com decoração temática */
.variant-comercial-panificadora .hero-section::before {
  content: '🥖';
  font-size: 15rem;
  opacity: 0.1;
}

/* Ícones em títulos */
.variant-comercial-panificadora .hero-title::before {
  content: '🥖';
  margin-right: 15px;
}
```

---

## 🔄 Próximos Templates para Personalizar

1. ✅ **Panificadora** - Concluído (exemplo)
2. ⏳ **Açougue** - Próximo
3. ⏳ **Restaurante** - Em seguida
4. ⏳ **Mercado** - Depois
5. ⏳ **Rural** - Depois
6. ⏳ **Residencial** - Depois
7. ⏳ **Industrial** - Por último

---

## 💡 Dicas

1. **Use emojis Unicode** - Funcionam em todos os navegadores
2. **Mantenha consistência** - Mesmo padrão de personalização em todos
3. **Teste visualmente** - Veja como fica antes de finalizar
4. **Documente mudanças** - Comente no código o que foi personalizado
5. **Preserve funcionalidade** - Nunca quebre o que já funciona

---

## 📞 Suporte

Em caso de dúvidas sobre personalização, consulte:
- `SISTEMA_VARIANTES.md` - Documentação técnica completa
- `src/lib/variantConfig.ts` - Exemplos de configuração
- `public/styles/comercial-panificadora.css` - Exemplo completo de CSS


