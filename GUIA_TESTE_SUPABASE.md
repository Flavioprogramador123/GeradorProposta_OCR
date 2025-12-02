# 🧪 Guia de Teste - Verificar Busca do Supabase

Este guia ajuda a verificar se o aplicativo está buscando dados do Supabase corretamente ao simular alteração de uma proposta.

## 📋 Pré-requisitos

1. ✅ Servidor Next.js rodando (`npm run dev`)
2. ✅ Variáveis de ambiente configuradas (`.env.local`)
3. ✅ Supabase configurado e acessível

## 🚀 Passo 1: Iniciar o Servidor

```powershell
# No terminal, execute:
npm run dev
```

Aguarde até ver: `✓ Ready on http://localhost:3000`

## 🧪 Passo 2: Executar Teste Automático

```powershell
# Execute o script de teste:
.\test-supabase-monitor.ps1
```

Este script irá:
- ✅ Verificar se o servidor está rodando
- ✅ Testar a API `/api/admin/orcamentos-todos`
- ✅ Mostrar de onde os dados estão vindo (Supabase ou filesystem)
- ✅ Exibir valores dos sistemas encontrados

## 📊 Passo 3: Monitorar Logs em Tempo Real

### No Terminal do Servidor (onde rodou `npm run dev`)

Você deve ver logs como:

```
🔍 Buscando propostas no Supabase...
✅ 2 propostas encontradas no Supabase
📋 Processando proposta: {
  id: '...',
  slug: '...',
  valor_total: 12345.67,
  temDadosCompletos: true,
  temSistemas: true,
  quantidadeSistemas: 1
}
✅ Valor encontrado para sistema: {
  cliente: 'Nome do Cliente',
  titulo: 'Sistema 1',
  valorTotal: 12345.67
}
✅ Orçamentos processados: 2 clientes com 3 sistemas totais
```

### No Navegador (DevTools Console)

1. Abra: `http://localhost:3000/admin/orcamentos`
2. Pressione `F12` para abrir DevTools
3. Vá na aba **Console**
4. Você deve ver logs como:

```
🔍 Carregando orçamentos...
📡 Response status: 200
✅ Dados recebidos: {
  total: 2,
  source: 'supabase',
  stats: {...},
  primeiroOrcamento: {...}
}
✅ Orçamentos carregados com sucesso! 2
```

## ✅ Verificações Importantes

### 1. Verificar Source dos Dados

No retorno da API, verifique o campo `source`:

- ✅ `supabase` = **CORRETO** - Dados vindo do Supabase
- ⚠️ `supabase-empty` = Supabase configurado mas sem dados
- ⚠️ `filesystem` = **PROBLEMA** - Dados vindo do filesystem (não do Supabase)
- ⚠️ `supabase-error` = Erro ao buscar do Supabase

### 2. Verificar Valores dos Sistemas

Os valores devem aparecer corretamente:

- ✅ Se `valorTotal > 0` = Valor encontrado
- ⚠️ Se `valorTotal === 0` = Valor não encontrado (verifique logs)

### 3. Verificar Logs de Debug

Procure por estas tags nos logs:

- `🔍 Buscando propostas no Supabase...` = Início da busca
- `✅ Valor encontrado para sistema:` = Valor encontrado com sucesso
- `⚠️ Sistema sem valor encontrado:` = Valor não encontrado (problema)
- `✅ Usando valor_total da proposta como fallback:` = Usando fallback

## 🔧 Troubleshooting

### Problema: Source é "filesystem" em vez de "supabase"

**Causa:** Variáveis de ambiente não configuradas ou incorretas

**Solução:**
1. Verifique `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon
   ```
2. Reinicie o servidor (`Ctrl+C` e `npm run dev` novamente)

### Problema: Valores aparecem como R$ 0,00

**Causa:** Campos de valor não encontrados nos dados

**Solução:**
1. Verifique os logs: `⚠️ Sistema sem valor encontrado:`
2. Verifique quais campos estão disponíveis no log
3. O código tenta múltiplos campos: `ppix`, `valorTotal`, `total_final`, etc.

### Problema: Nenhum orçamento encontrado

**Causa:** Não há propostas no Supabase ou filtro incorreto

**Solução:**
1. Verifique no Supabase Dashboard se há propostas com `status = 'ativa'`
2. Verifique os logs: `ℹ️ Nenhuma proposta encontrada no Supabase`

## 📝 Checklist de Teste

- [ ] Servidor rodando (`npm run dev`)
- [ ] Script de teste executado (`.\test-supabase-monitor.ps1`)
- [ ] Source é `supabase` (não `filesystem`)
- [ ] Valores aparecem corretamente (não R$ 0,00)
- [ ] Logs aparecem no terminal do servidor
- [ ] Logs aparecem no console do navegador
- [ ] Página `/admin/orcamentos` carrega corretamente

## 🎯 Simulação de Alteração

Para simular alteração de uma proposta:

1. **Editar proposta existente:**
   - Acesse: `http://localhost:3000/admin/orcamentos`
   - Clique em "✏️ Editar" em qualquer proposta
   - Isso deve carregar dados do Supabase via `/api/propostas/[slug]`

2. **Verificar logs:**
   - No terminal: `📥 Carregando proposta existente para: [slug]`
   - No console: `✅ Dados da proposta carregados:`

3. **Fazer alteração:**
   - Modifique algum valor
   - Gere nova proposta
   - Verifique se salva no Supabase

4. **Verificar atualização:**
   - Volte para `/admin/orcamentos`
   - Recarregue a página
   - Verifique se os novos dados aparecem

## 📞 Suporte

Se encontrar problemas, verifique:
1. Logs do servidor (terminal onde rodou `npm run dev`)
2. Console do navegador (F12 > Console)
3. Network tab (F12 > Network) para ver requisições HTTP
4. Variáveis de ambiente (`.env.local`)

