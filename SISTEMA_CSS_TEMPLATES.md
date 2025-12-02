# 🎨 Sistema de CSS por Template - PIENG Solar

## ✅ Implementação Completa

Sistema implementado para permitir diferentes estilos CSS dependendo do ramo do cliente, mantendo o mesmo engine TypeScript e sistema Supabase.

## 📁 Estrutura de Arquivos

### CSS Específicos por Subtipo Comercial

```
public/styles/
├── comercial-panificadora.css    # 🥖 Panificadora
├── comercial-acougue.css          # 🥩 Açougue
├── comercial-restaurante.css      # 🍽️ Restaurante
├── comercial-mercado.css          # 🛒 Mercado/Supermercado
├── comercial.css                  # Base (fallback)
├── residencial.css                # 🏠 Residencial
├── rural.css                      # 🌾 Rural
└── industrial.css                # 🏭 Industrial
```

### Código TypeScript

```
src/lib/
├── variantConfig.ts              # ✅ Atualizado com CSS específicos
├── cssLoader.ts                  # 🆕 Helper para carregar CSS
└── templateEngine.ts             # ✅ Atualizado para usar CSS específicos
```

## 🔧 Como Funciona

### 1. Mapeamento de CSS no `variantConfig.ts`

Cada subtipo comercial agora tem seu próprio arquivo CSS:

```typescript
'comercial-panificadora': {
  // ...
  cssFile: 'comercial-panificadora.css' // ✅ CSS específico
},
'comercial-acougue': {
  // ...
  cssFile: 'comercial-acougue.css' // ✅ CSS específico
},
// etc...
```

### 2. Sistema de Carregamento Híbrido

O `templateEngine.ts` agora usa o `cssLoader.ts` que:

1. **Primeiro**: Tenta carregar do filesystem local (`public/styles/` ou `src/styles/variants/`)
2. **Fallback**: Usa tag `<link>` para carregar via CDN/Supabase Storage
3. **Futuro**: Suporte para Supabase Storage (quando configurado)

### 3. CSS Personalizado por Subtipo

Cada CSS tem:
- ✅ Cores específicas do ramo
- ✅ Ícones temáticos (🥖, 🥩, 🍽️, 🛒)
- ✅ Gradientes personalizados
- ✅ Seções específicas (refrigeração, climatização, etc.)
- ✅ Estilos de cards, botões e tabelas personalizados

## 🚀 Como Usar

### No Gerador Rápido / Consultor

1. Selecione o tipo de cliente no `TemplateSelector`
2. Se for comercial, selecione o subtipo (Panificadora, Açougue, etc.)
3. O sistema automaticamente carrega o CSS correto

### Personalizar CSS

Para personalizar um CSS específico:

1. Edite o arquivo em `public/styles/comercial-[subtipo].css`
2. Ou crie um novo arquivo seguindo o padrão
3. Atualize o `variantConfig.ts` para apontar para o novo arquivo

## 📦 Integração com Supabase Storage (Futuro)

Para usar CSS do Supabase Storage:

1. Crie um bucket `pieng-templates` no Supabase
2. Faça upload dos arquivos CSS para `templates/css/`
3. Configure o bucket como público
4. O sistema automaticamente tentará carregar do storage

## 🎯 Benefícios

- ✅ **Mesmo Engine TypeScript**: Não precisa alterar lógica de geração
- ✅ **Mesmo Sistema Supabase**: Dados continuam no mesmo lugar
- ✅ **Apenas CSS muda**: Fácil de personalizar e manter
- ✅ **Fallback automático**: Funciona mesmo sem Supabase Storage
- ✅ **Ícones temáticos**: Cada ramo tem sua identidade visual

## 📝 Exemplo de Uso

```typescript
// No variantConfig.ts
'comercial-panificadora': {
  cssFile: 'comercial-panificadora.css', // ✅ CSS específico
  // ...
}

// O templateEngine.ts automaticamente:
// 1. Busca o CSS em public/styles/comercial-panificadora.css
// 2. Injeta inline no HTML gerado
// 3. Se não encontrar, usa <link> tag como fallback
```

## 🔄 Próximos Passos (Opcional)

1. **Supabase Storage**: Configurar bucket para CSS dinâmico
2. **Mais Subtipos**: Adicionar farmácia, posto de gasolina, etc.
3. **Editor Visual**: Interface para editar CSS sem código
4. **Preview**: Visualizar CSS antes de gerar proposta

---

**✅ Sistema Completo e Funcional!**

