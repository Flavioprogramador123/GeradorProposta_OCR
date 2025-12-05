# 📄 Modelos de Templates Padrão - PIENG Solar

Existem **dois modelos de templates padrão** no sistema, cada um com características diferentes:

---

## 🎯 Modelo 1: Template com Logo Real da PIENG

### Arquivo: `pieng_proposal_template.html`

**Características:**
- ✅ **Logo real da PIENG** no cabeçalho (`<img src="/assets/logos/logo.png">`)
- ✅ Tagline: "Soluções Energéticas"
- ✅ Subtítulo: "35+ anos de experiência em sistemas elétricos de potência"
- ✅ Informações do cliente em linha única
- ✅ Design mais corporativo e profissional
- ✅ Usado como **template padrão** quando nenhuma variante é selecionada

**Estrutura do Header:**
```html
<header class="header">
    <div class="pieng-logo-real">
        <img src="/assets/logos/logo.png" alt="PIENG Soluções Energéticas" />
        <div class="company-tagline">Soluções Energéticas</div>
    </div>
    <div class="subtitle">35+ anos de experiência...</div>
    <div class="client-info">
        <strong>Cliente:</strong> {{CLIENTE_NOME}} | 
        <strong>Cidade:</strong> {{CLIENTE_CIDADE}} | ...
    </div>
</header>
```

**Quando é usado:**
- Template padrão (fallback)
- Quando `getDefaultTemplate()` é chamado
- Quando nenhuma variante específica é selecionada
- Função: `loadTemplatePadrao()` em `templateEngine.ts`

---

## 🎨 Modelo 2: Template com Ícone Emoji (Variantes)

### Arquivo: `base_universal.html` (e variantes específicas)

**Características:**
- ✅ **Ícone emoji** no cabeçalho (`{{ICONE_VARIANTE}}` - ex: 🥖, 🏠, 🌾)
- ✅ Texto: "PIENG SOLAR"
- ✅ Design mais moderno e temático
- ✅ Personalização por tipo de cliente (panificadora, açougue, etc)
- ✅ Usado quando uma **variante específica** é selecionada

**Estrutura do Header:**
```html
<div class="header">
    <div class="logo-section">
        <div class="logo-icon">{{ICONE_VARIANTE}}</div>
        <div class="company-name">PIENG SOLAR</div>
    </div>
    <h2 class="client-name">Proposta para: {{CLIENTE_NOME}}</h2>
    <p class="proposal-date">{{CLIENTE_CIDADE}} | {{DATA_GERACAO}}</p>
</div>
```

**Variantes disponíveis:**
- `variants/residencial_premium.html` - 🏠
- `variants/rural_agro.html` - 🌾
- `variants/comercial_panificadora.html` - 🥖
- `variants/comercial_acougue.html` - 🥩
- `variants/comercial_restaurante.html` - 🍽️
- `variants/comercial_mercado.html` - 🛒
- `variants/industrial_premium.html` - 🏭

**Quando é usado:**
- Quando uma variante específica é selecionada via `variantConfig.ts`
- Quando `getVariantConfig(tipo, subtipo)` retorna uma configuração
- Templates personalizados por tipo de cliente

---

## 🔄 Como o Sistema Escolhe o Template

### Fluxo de Decisão:

```typescript
// 1. Verifica se há variante específica
const variantConfig = getVariantConfig(clientType, subType);

if (variantConfig) {
    // Usa template da variante (Modelo 2)
    templateFile = variantConfig.templateFile; // ex: 'variants/comercial_panificadora.html'
} else {
    // Usa template padrão (Modelo 1)
    templateFile = getDefaultTemplate(); // 'pieng_proposal_template.html'
}
```

### Código em `templateEngine.ts`:

```typescript
export async function loadTemplatePadrao(): Promise<string> {
  const templatePath = path.join(
    process.cwd(), 
    'src/data/knowledge/templates/pieng_proposal_template.html'
  );
  return fs.promises.readFile(templatePath, 'utf8');
}
```

---

## 📊 Comparação dos Modelos

| Característica | Modelo 1 (Logo Real) | Modelo 2 (Ícone Emoji) |
|----------------|---------------------|----------------------|
| **Logo** | Imagem real (`logo.png`) | Emoji Unicode (🥖, 🏠, etc) |
| **Nome** | "Soluções Energéticas" | "PIENG SOLAR" |
| **Design** | Corporativo/Profissional | Moderno/Temático |
| **Personalização** | Genérico | Por tipo de cliente |
| **Uso** | Padrão/Fallback | Variantes específicas |
| **CSS** | Base universal | CSS por variante |

---

## 🎨 Personalização

### Modelo 1 (Logo Real)
- Mantém identidade visual corporativa
- Ideal para clientes que precisam de proposta formal
- Logo pode ser substituído alterando `/assets/logos/logo.png`

### Modelo 2 (Ícone Emoji)
- Permite personalização temática por tipo de negócio
- Ícones podem ser alterados em `variantConfig.ts`:
  ```typescript
  tema: {
    icone: '🥖' // Altere aqui
  }
  ```
- CSS personalizado em `public/styles/[nome-template].css`

---

## ✅ Recomendações

### Use Modelo 1 (Logo Real) quando:
- ✅ Cliente precisa de proposta formal/corporativa
- ✅ Não há variante específica para o tipo de cliente
- ✅ Quer manter identidade visual forte da PIENG

### Use Modelo 2 (Ícone Emoji) quando:
- ✅ Quer personalização temática por tipo de negócio
- ✅ Cliente se identifica com ícones temáticos
- ✅ Quer destacar características específicas do negócio

---

## 🔧 Manutenção

### Para adicionar novo template com logo real:
1. Criar novo arquivo baseado em `pieng_proposal_template.html`
2. Modificar header para incluir logo
3. Atualizar `getDefaultTemplate()` se necessário

### Para adicionar nova variante com ícone:
1. Criar arquivo em `variants/[nome].html` baseado em `base_universal.html`
2. Adicionar configuração em `variantConfig.ts`
3. Criar CSS em `public/styles/[nome].css`

---

## 📝 Notas Importantes

1. **Ambos os modelos funcionam** - O sistema escolhe automaticamente
2. **Template padrão preservado** - `pieng_proposal_template.html` não deve ser modificado diretamente
3. **Variantes isoladas** - Cada variante tem seu próprio CSS e HTML
4. **Compatibilidade** - Ambos usam o mesmo engine de variáveis (`{{VARIAVEL}}`)

---

## 🚀 Próximos Passos

- [ ] Documentar onde cada modelo é usado no código
- [ ] Criar guia de migração entre modelos
- [ ] Adicionar opção de escolha manual do modelo
- [ ] Melhorar sistema de fallback entre modelos


