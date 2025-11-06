# Análise de Rotas e Arquivos - PIENG Propostas

## 🟢 ROTAS ATIVAS (Em Produção)

### Páginas Principais
- `/` - Home (index.tsx)
- `/admin` - Dashboard principal (admin/index.tsx)
- `/gerador-rapido` - Gerador rápido de propostas (gerador-rapido.tsx)
- `/admin/novo-cliente` - Criar novo cliente (admin/novo-cliente.tsx)
- `/admin/configuracoes` - Configurações do sistema (admin/configuracoes.tsx)
- `/admin/orcamentos` - Lista todos orçamentos (admin/orcamentos/index.tsx)
- `/admin/orcamentos/[clienteId]` - Orçamentos de um cliente
- `/admin/orcamentos/[clienteId]/upload` - Upload de PDFs
- `/admin/orcamentos/[clienteId]/manual` - Entrada manual de dados
- `/admin/orcamentos/[clienteId]/consultor` - Interface consultor
- `/admin/clientes/[clienteId]/editar` - Editar cliente
- `/proposta/[slug]` - Página pública da proposta (SSG)
- `/propostas-publicas` - Lista de propostas públicas

### APIs Ativas
- `/api/admin/clientes` - Listar clientes (Supabase + filesystem)
- `/api/admin/criar-cliente` - Criar cliente
- `/api/admin/orcamentos-todos` - Listar todos orçamentos
- `/api/admin/orcamentos/[clienteId]` - Orçamentos por cliente
- `/api/admin/config` - Configurações do sistema
- `/api/admin/extract-data` - Extração AI de PDFs
- `/api/gerar-proposta` - Gerar proposta final
- `/api/propostas-publicas` - Lista propostas públicas
- `/api/test-supabase` - Testar conexão Supabase
- `/api/test-proposta-slug` - Diagnóstico de proposta
- `/api/admin/sync-google-drive` - Sincronizar Google Drive

## 🟡 ROTAS POTENCIALMENTE OBSOLETAS (Candidatas para /obsoleto)

### Páginas Duplicadas/Alternativas
- `src/pages/index-redesign.tsx` - Parece ser redesign não usado
- `src/pages/Automacao.tsx` - Não linkado em nenhum lugar
- `src/pages/Dashboard.tsx` - Não linkado (admin/index.tsx é o dashboard)
- `src/pages/Gestao.tsx` - Não linkado
- `src/pages/SolarAnalysis.tsx` - Não linkado
- `src/pages/proposta-supabase/[slug].tsx` - Duplicado de /proposta/[slug]

### APIs Alternativas/Backup
- `src/pages/api/admin/clientes-netlify.ts` - Fallback (manter por enquanto)
- `src/pages/api/admin/clientes-google.ts` - Não usado mais
- `src/pages/api/admin/clientes-supabase.ts` - Duplicado de clientes.ts
- `src/pages/api/admin/criar-cliente-supabase.ts` - Duplicado
- `src/pages/api/gerar-proposta-supabase.ts` - Duplicado de gerar-proposta.ts
- `src/pages/api/migrar-proposta-local.ts` - Migração já feita
- `src/pages/api/consultor/gerar-proposta.ts` - Não usado
- `src/pages/api/enviar-proposta-cliente.ts` - Verificar se é usado

### APIs de Teste (Mover para /obsoleto após confirmar funcionamento)
- `src/pages/api/test-listar-tabelas.ts` - Teste Supabase
- `src/pages/api/test-propostas-table.ts` - Teste Supabase
- `src/pages/api/test-simple.ts` - Teste simples
- `src/pages/api/admin/test-google-drive.ts` - Teste Google Drive

### Rotas de Processamento Modular (Verificar se são usadas)
- `src/pages/api/orcamentos/[cliente]/processar-modular.ts`
- `src/pages/api/orcamentos/[cliente]/processar-modular-simples.ts`
- `src/pages/admin/orcamentos/[clienteId]/entrada-modular.tsx`

## 🔴 ARQUIVOS CLARAMENTE OBSOLETOS

### Backups Antigos
- `backup_sistema_30092025/` - Backup antigo (TODO: já está separado)
- Todos os arquivos com `.backup`, `.bak`, `.old`

### Documentação de Desenvolvimento
- Arquivos `PROCESSO_*.md` - Mover para /docs ou /obsoleto
- Arquivos `RESUMO_*.md` - Documentação de processo
- Arquivos `INSTRUCOES_*.md` - Instruções antigas

### Scripts PowerShell de Recuperação
- `recuperar-proposta-netlify.ps1`
- `recuperar-proposta-pollyanna.ps1`
- `buscar-proposta-completo.ps1`
- `setup-supabase-rapido.ps1`

### Scripts JavaScript de Teste
- `test-google-drive-completo.js`
- `renovar-google-drive-token.js`
- `renovar-google-drive-token-manual.js`
- `recuperar-supabase.js`

## 📋 PLANO DE AÇÃO

### Fase 1: Mover Arquivos Claramente Obsoletos (SEGURO)
1. Scripts PowerShell de recuperação → `/obsoleto/scripts/`
2. Scripts JS de teste → `/obsoleto/scripts/`
3. Documentação de processo → `/obsoleto/docs/`
4. Arquivos de backup → Já estão em gitignore

### Fase 2: Testar e Mover APIs Duplicadas (CUIDADO)
1. Verificar se APIs de teste ainda são necessárias
2. Confirmar que `clientes-supabase.ts` não é usado
3. Confirmar que `gerar-proposta-supabase.ts` não é usado
4. Mover para `/obsoleto/api/`

### Fase 3: Páginas Não Linkadas (REVISAR)
1. Confirmar que Dashboard.tsx, Automacao.tsx, Gestao.tsx não são usados
2. Verificar se index-redesign.tsx tem algum código útil
3. Mover para `/obsoleto/pages/`

### Fase 4: Limpeza Final
1. Documentar todos os movimentos em `CHANGELOG_LIMPEZA.md`
2. Testar sistema completo
3. Aguardar 1 semana para confirmar que nada quebrou
4. Deletar pasta `/obsoleto/` se nada der problema

## ⚠️ ATENÇÃO - NÃO MOVER

### Arquivos que parecem obsoletos MAS são necessários
- `src/pages/api/admin/clientes-netlify.ts` - É fallback ativo!
- APIs de teste do Supabase - Úteis para diagnóstico
- Componentes em `src/components/` - Verificar imports primeiro
