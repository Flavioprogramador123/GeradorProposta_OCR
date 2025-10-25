# 🚧 Migração Supabase - Próximos Passos

## ✅ Concluído (Fase 1)

1. ✅ Package.json atualizado com `@supabase/supabase-js`
2. ✅ Cliente Supabase criado (`src/lib/supabase.ts`)
3. ✅ Schema SQL completo (`supabase_schema.sql`)
4. ✅ API nova criada (`src/pages/api/gerar-proposta-supabase.ts`)
5. ✅ Documentação de setup (`SUPABASE_SETUP.md`)

---

## 🔄 Falta Fazer (Fase 2)

### 1. Atualizar `src/pages/gerador-rapido.tsx`

Trocar a chamada da API antiga pela nova:

```typescript
// ANTES (linha ~627):
const response = await fetch('/api/gerar-proposta', {

// DEPOIS:
const response = await fetch('/api/gerar-proposta-supabase', {
```

### 2. Atualizar `src/pages/proposta/[slug].tsx`

Modificar `getStaticProps` para buscar do Supabase:

```typescript
import { getPropostaBySlug } from '@/lib/supabase';

export async function getStaticProps({ params }: any) {
  const proposta = await getPropostaBySlug(params.slug);

  if (!proposta) {
    return { notFound: true };
  }

  return {
    props: {
      proposta: proposta.dados_completos,
      htmlContent: proposta.html_gerado,
    },
    revalidate: 60,
  };
}
```

### 3. Configurar Supabase

1. Criar projeto em https://supabase.com/dashboard
2. Executar `supabase_schema.sql` no SQL Editor
3. Copiar URL e Anon Key

### 4. Configurar Vercel

Adicionar variáveis de ambiente:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 5. Commit e Deploy

```bash
git add .
git commit -m "🚀 FEAT: Migração Supabase - Fase 1 completa"
git push origin clean-main
```

---

## 📝 Arquivos para Modificar (Fase 2)

- [ ] `src/pages/gerador-rapido.tsx` (linha 627)
- [ ] `src/pages/proposta/[slug].tsx` (getStaticProps)
- [ ] `src/pages/admin/index.tsx` (listar clientes do Supabase)
- [ ] `src/pages/api/admin/clientes.ts` (ler do Supabase)

---

## 🎯 Resultado Esperado

Após completar Fase 2:
- ✅ Propostas salvas no Supabase
- ✅ Sem erros 404
- ✅ Dados persistem após deploy
- ✅ Sistema 100% funcional em produção

---

## 💡 Dica

Para testar localmente sem Supabase configurado, a aplicação vai:
1. Tentar usar Supabase
2. Se falhar, mostra aviso mas continua funcionando
3. No Vercel (com variáveis configuradas), vai funcionar normalmente

---

**Status**: 50% concluído
**Próximo passo**: Configurar Supabase e completar Fase 2
