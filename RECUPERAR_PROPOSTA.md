# 🔄 Recuperação de Proposta Sobrescrita

## ❌ Situação
A proposta `ivan-maracana-01-12-2025` foi sobrescrita ao usar o botão "Salvar".

## ⚠️ Limitações do Supabase
O Supabase **NÃO mantém histórico automático** de alterações. Quando fazemos `upsert`, os dados antigos são **sobrescritos completamente**.

## 🔍 Possibilidades de Recuperação

### 1. ✅ Verificar Backup Automático do Supabase (Pode ter)
O Supabase pode ter backups automáticos dependendo do plano:
- **Plano Free**: Não tem backups automáticos
- **Plano Pro/Team**: Tem backups diários (Point-in-Time Recovery)

**Como verificar:**
1. Acesse: https://supabase.com/dashboard
2. Vá em **Settings** → **Database** → **Backups**
3. Verifique se há backups anteriores à sobrescrita

### 2. ❌ Logs de Alteração
O Supabase não mantém logs de alterações por padrão. Não há como ver o que foi alterado.

### 3. ❌ Versionamento
Não há sistema de versionamento implementado. Cada `upsert` sobrescreve completamente.

## 💡 Soluções Futuras (Prevenção)

### Opção 1: Implementar Versionamento
Criar tabela `propostas_historico` para salvar versões anteriores:

```sql
CREATE TABLE propostas_historico (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    proposta_id UUID REFERENCES propostas(id),
    slug TEXT NOT NULL,
    dados_completos JSONB,
    html_gerado TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    versao INTEGER
);
```

### Opção 2: Soft Delete + Backup Antes de Atualizar
Antes de atualizar, criar backup automático:

```typescript
// Antes de upsert, salvar versão anterior
const propostaAnterior = await supabase
  .from('propostas')
  .select('*')
  .eq('slug', slug)
  .single();

if (propostaAnterior.data) {
  // Salvar backup
  await supabase
    .from('propostas_backup')
    .insert({
      slug_original: slug,
      dados_backup: propostaAnterior.data,
      data_backup: new Date().toISOString()
    });
}
```

## 🎯 Recomendação Imediata

**Infelizmente, não é possível recuperar os dados sobrescritos automaticamente.**

**Opções:**
1. ✅ **Refazer a proposta** - Mais rápido e garantido
2. ⚠️ **Verificar backup do Supabase** - Se tiver plano Pro/Team
3. 🔄 **Implementar versionamento** - Para evitar isso no futuro

## 📝 Próximos Passos

Se quiser implementar versionamento para evitar isso no futuro, posso criar:
- Tabela de histórico
- Lógica de backup automático antes de atualizar
- Interface para visualizar/restaurar versões anteriores



