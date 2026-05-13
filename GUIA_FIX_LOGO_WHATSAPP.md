# 🔧 Guia: Corrigir Logo PIENG no WhatsApp

## ✅ Correções Aplicadas

1. **URL Base Fixa**: Agora sempre usa `https://pieng-propostas.vercel.app` (não depende de variáveis de ambiente)
2. **Logo PNG**: Mudado para `logo-pieng-oficial.png` (PNG geralmente funciona melhor para Open Graph)
3. **Meta Tags Completas**: Adicionadas todas as meta tags necessárias:
   - `og:image:secure_url` (HTTPS obrigatório)
   - `og:image:type` (tipo MIME)
   - `og:locale` (pt_BR)
   - `link rel="image_src"` (fallback para compatibilidade)

## 🔄 Como Limpar o Cache do WhatsApp

O WhatsApp/Facebook armazena cache das pré-visualizações. Após o deploy, siga estes passos:

### Opção 1: Facebook Sharing Debugger (Recomendado)

1. Acesse: https://developers.facebook.com/tools/debug/
2. Cole a URL da proposta: `https://pieng-propostas.vercel.app/proposta/[slug]`
3. Clique em **"Depurar"**
4. Clique em **"Raspar novamente"** (força atualização do cache)
5. Aguarde alguns minutos e teste novamente no WhatsApp

### Opção 2: WhatsApp Web

1. Abra o WhatsApp Web
2. Compartilhe o link novamente
3. O WhatsApp pode atualizar automaticamente após alguns minutos

### Opção 3: Aguardar Cache Expirar

- O cache do WhatsApp expira naturalmente em 24-48 horas
- Após esse período, o logo deve aparecer automaticamente

## 🖼️ Arquivos de Logo Disponíveis

Os seguintes arquivos estão em `public/assets/logos/`:

- ✅ `logo-pieng-oficial.png` - **USADO AGORA** (PNG, melhor para OG)
- `logo-pieng-principal.jpg` - Fallback (JPG)
- `logo-pieng.png` - Alternativa
- `logo.png` - Alternativa

## 📋 Meta Tags Configuradas

```html
<meta property="og:image" content="https://pieng-propostas.vercel.app/assets/logos/logo-pieng-oficial.png" />
<meta property="og:image:secure_url" content="https://pieng-propostas.vercel.app/assets/logos/logo-pieng-oficial.png" />
<meta property="og:image:type" content="image/png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="PIENG Soluções Energéticas - Logo" />
```

## ✅ Verificação

Para verificar se está funcionando:

1. **Teste a URL da imagem diretamente:**
   ```
   https://pieng-propostas.vercel.app/assets/logos/logo-pieng-oficial.png
   ```
   Deve abrir a imagem do logo.

2. **Use o Facebook Debugger:**
   - Se aparecer erro na imagem, verifique se o arquivo existe
   - Se aparecer "imagem muito pequena", pode precisar redimensionar

3. **Teste no WhatsApp:**
   - Compartilhe o link após limpar o cache
   - O logo deve aparecer na pré-visualização

## 🚨 Problemas Comuns

### Logo não aparece mesmo após limpar cache

**Solução:**
1. Verifique se o arquivo existe em `public/assets/logos/`
2. Verifique se a URL está acessível publicamente
3. Verifique se a imagem tem pelo menos 200x200px (recomendado 1200x630px)
4. Use o Facebook Debugger para ver erros específicos

### Imagem aparece mas está cortada

**Solução:**
- WhatsApp prefere imagens com proporção 1.91:1 (1200x630px)
- Se a imagem for quadrada, pode aparecer cortada
- Considere criar uma imagem específica para Open Graph

### Cache não limpa

**Solução:**
- Use o Facebook Debugger várias vezes
- Aguarde 24-48 horas para o cache expirar naturalmente
- Tente compartilhar em um novo chat/conversa

## 📝 Notas Técnicas

- **URL Absoluta**: Sempre usar URL completa com `https://`
- **HTTPS Obrigatório**: WhatsApp/Facebook exigem HTTPS
- **Tamanho Mínimo**: 200x200px (recomendado 1200x630px)
- **Formato**: PNG ou JPG (PNG geralmente funciona melhor)
- **Tamanho do Arquivo**: Máximo 8MB (recomendado < 1MB)

## 🔗 Links Úteis

- [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
- [Open Graph Protocol](https://ogp.me/)
- [WhatsApp Link Preview](https://developers.facebook.com/docs/sharing/webmasters)

