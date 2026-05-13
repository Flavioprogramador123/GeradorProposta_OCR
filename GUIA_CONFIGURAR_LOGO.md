# 🖼️ Guia: Configurar Logo para WhatsApp/Redes Sociais

## 📋 Visão Geral

O sistema agora permite configurar facilmente qual logo usar para compartilhamento em WhatsApp, Facebook e outras redes sociais (Open Graph).

## 🎯 Como Mudar o Logo

### Opção 1: Variável de Ambiente (Recomendado)

Adicione no arquivo `.env` ou nas variáveis de ambiente do Vercel:

```bash
# Logo para Open Graph (WhatsApp, Facebook, etc.)
NEXT_PUBLIC_OG_LOGO=/assets/logos/logo-pieng-oficial.png
```

**Logos disponíveis:**
- `/assets/logos/logo-pieng-principal.jpg` - Logo principal (JPG com fundo) - **PADRÃO**
- `/assets/logos/logo-pieng-oficial.png` - Logo oficial (PNG, pode ter fundo transparente)
- `/assets/logos/logo.png` - Logo simples
- `/assets/logos/logo-pieng.png` - Outra variação
- `/assets/logos/grayscale_logo.png` - Logo em escala de cinza

### Opção 2: Editar Código Diretamente

Edite o arquivo `src/lib/logoConfig.ts`:

```typescript
export const getOgLogo = (): string => {
  const envLogo = process.env.NEXT_PUBLIC_OG_LOGO;
  if (envLogo) return envLogo;
  
  // Altere esta linha para o logo desejado:
  return LOGO_PATHS.oficial; // PNG transparente
  // ou
  return LOGO_PATHS.principal; // JPG com fundo (padrão atual)
};
```

## 🔄 Após Mudar o Logo

1. **Fazer deploy** das alterações
2. **Limpar cache do Facebook/WhatsApp:**
   - Acesse: https://developers.facebook.com/tools/debug/
   - Cole a URL da proposta
   - Clique em "Raspar novamente"
3. **Aguardar 5-10 minutos** para o cache atualizar

## 📝 Outras Configurações de Logo

O arquivo `src/lib/logoConfig.ts` também permite configurar:

- **Favicon** (ícone do navegador): `NEXT_PUBLIC_FAVICON_LOGO`
- **Logo nas propostas HTML**: `NEXT_PUBLIC_PROPOSAL_LOGO`

## ✅ Verificação

Após configurar, verifique se o logo aparece corretamente:

1. Compartilhe uma proposta no WhatsApp
2. Verifique se o logo aparece no preview do link
3. Se não aparecer, limpe o cache (passo 2 acima)

## 🎨 Recomendações

- **PNG com fundo transparente**: Melhor para logos sobre fundos coloridos
- **JPG com fundo**: Melhor para logos que precisam de fundo sólido
- **Tamanho recomendado**: 1200x630px (proporção 1.91:1) para Open Graph
- **Formato**: PNG geralmente funciona melhor para Open Graph

## 📚 Arquivos Relacionados

- `src/lib/logoConfig.ts` - Configuração centralizada de logos
- `src/pages/proposta/[slug].tsx` - Página que usa o logo nas meta tags
- `env.example` - Exemplo de variáveis de ambiente

