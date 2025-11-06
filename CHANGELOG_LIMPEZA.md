# Changelog - Limpeza de Arquivos Obsoletos

**Data:** 06/11/2025
**Objetivo:** Organizar projeto movendo arquivos obsoletos para pasta `/obsoleto/` (no .gitignore)

---

## ✅ Fase 1: Arquivos Movidos (SEGURO - sem impacto no sistema)

### Scripts PowerShell Obsoletos → `/obsoleto/scripts/`
- ✅ `buscar-proposta-completo.ps1` - Script de recuperação manual
- ✅ `recuperar-proposta-netlify.ps1` - Recuperação específica Netlify
- ✅ `recuperar-proposta-pollyanna.ps1` - Recuperação de caso específico
- ✅ `setup-supabase-rapido.ps1` - Setup já feito

### Scripts JavaScript de Teste → `/obsoleto/scripts/`
- ✅ `recuperar-supabase.js` - Script de migração (já concluída)
- ✅ `renovar-google-drive-token.js` - Token antigo
- ✅ `renovar-google-drive-token-manual.js` - Token antigo
- ✅ `test-google-drive-completo.js` - Teste já realizado

### Documentação de Processo → `/obsoleto/docs/`
- ✅ `ANALISE_GOOGLE_DRIVE.md` - Análise de integração (já implementada)
- ✅ `INSTRUCOES_RECUPERAR_POLLYANNA.md` - Instruções de caso específico
- ✅ `PROCESSO_COMPLETO.md` - Processo antigo (substituído por CLAUDE.md)
- ✅ `RESUMO_OAUTH_GOOGLE_DRIVE.md` - Resumo OAuth (integração concluída)

---

## ⏳ Fase 2: APIs Duplicadas (AGUARDANDO VALIDAÇÃO)

### Candidatos para `/obsoleto/api/`:
- 🟡 `src/pages/api/admin/clientes-google.ts` - **Não usado** (Google Drive sync opcional)
- 🟡 `src/pages/api/admin/clientes-supabase.ts` - **Duplicado** de `clientes.ts`
- 🟡 `src/pages/api/admin/criar-cliente-supabase.ts` - **Duplicado** de `criar-cliente.ts`
- 🟡 `src/pages/api/gerar-proposta-supabase.ts` - **Duplicado** de `gerar-proposta.ts`
- 🟡 `src/pages/api/migrar-proposta-local.ts` - **Migração concluída**
- 🟡 `src/pages/api/consultor/gerar-proposta.ts` - **Verificar se é usado**

### APIs de Teste (manter por enquanto para diagnóstico):
- ⚪ `src/pages/api/test-supabase.ts` - **MANTER** (útil para diagnóstico)
- ⚪ `src/pages/api/test-proposta-slug.ts` - **MANTER** (útil para debug)
- ⚪ `src/pages/api/test-listar-tabelas.ts` - Pode mover após validar sistema
- ⚪ `src/pages/api/test-propostas-table.ts` - Pode mover após validar sistema
- ⚪ `src/pages/api/test-simple.ts` - Pode mover após validar sistema

---

## ⏳ Fase 3: Páginas Não Linkadas (AGUARDANDO VALIDAÇÃO)

### Candidatos para `/obsoleto/pages/`:
- 🟡 `src/pages/index-redesign.tsx` - Redesign não implementado
- 🟡 `src/pages/Automacao.tsx` - Não linkado em nenhum lugar
- 🟡 `src/pages/Dashboard.tsx` - Substituído por `/admin/index.tsx`
- 🟡 `src/pages/Gestao.tsx` - Não linkado
- 🟡 `src/pages/SolarAnalysis.tsx` - Não linkado
- 🟡 `src/pages/proposta-supabase/[slug].tsx` - Duplicado de `/proposta/[slug].tsx`

---

## ❌ NÃO MOVER (Parece obsoleto mas é necessário)

### APIs de Fallback (PRODUÇÃO)
- ✅ `src/pages/api/admin/clientes-netlify.ts` - **MANTER** (fallback ativo)
- ✅ `src/pages/api/admin/test-google-drive.ts` - **MANTER** (diagnóstico Google Drive)

### Rotas de Processamento Modular
- ❓ `src/pages/api/orcamentos/[cliente]/processar-modular.ts` - Verificar uso
- ❓ `src/pages/api/orcamentos/[cliente]/processar-modular-simples.ts` - Verificar uso
- ❓ `src/pages/admin/orcamentos/[clienteId]/entrada-modular.tsx` - Verificar uso

---

## 📊 Estatísticas

- **Arquivos movidos (Fase 1):** 12 arquivos
- **Espaço liberado no root:** ~8 arquivos PS1 + ~4 arquivos JS + ~4 arquivos MD
- **Impacto no sistema:** ✅ ZERO (arquivos não são importados)
- **Reversível:** ✅ SIM (basta mover de volta de `/obsoleto/`)

---

## ⏭️ Próximos Passos

1. ✅ **Aguardar deploy** e validar que sistema funciona normalmente
2. 🔄 **Testar todas as rotas principais** (admin, gerador-rapido, propostas)
3. 🔄 **Validar APIs** que podem ser duplicadas
4. 📝 **Documentar Fase 2 e Fase 3** após validação
5. 🗑️ **Deletar `/obsoleto/`** após 1 semana sem problemas

---

## 🔙 Rollback (Se Necessário)

```bash
# Reverter tudo
mv obsoleto/scripts/* .
mv obsoleto/docs/* .

# Reverter apenas scripts
mv obsoleto/scripts/*.ps1 .
mv obsoleto/scripts/*.js .
```

---

**Responsável:** Claude Code
**Aprovação:** Aguardando validação do usuário
**Status:** ✅ Fase 1 concluída | 🟡 Fases 2-3 aguardando
