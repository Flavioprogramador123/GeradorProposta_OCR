# 📌 PIENG PROPOSTAS - CONTROLE DE VERSÃO

## 🎯 **VERSÃO ATUAL: v2.1.0** (25/10/2025)

---

## 📋 **HISTÓRICO DE VERSÕES**

### **v2.1.0** - 25/10/2025 ✅ **ATUAL**
**Status**: 🟢 Em Produção (Vercel)

**🔧 Correções:**
- ✅ Correção erro 500 em `/api/admin/clientes`
- ✅ Validação segura de ordenação de datas
- ✅ Error handling melhorado com logs detalhados
- ✅ Previne crash quando data está em formato inválido

**✨ Melhorias:**
- ✅ Badge de versão minimalista no admin
- ✅ Sistema de controle de versão implementado
- ✅ Documentação atualizada (README + CLAUDE.md + VERSION.md)

**📦 Deploy:**
- Commit: `51b1d72` - API clientes fix
- Branch: `clean-main`
- URL: https://pieng-propostas.vercel.app

---

### **v2.0.1** - 24/10/2025
**Status**: 🟡 Substituído

**🔧 Correções:**
- ✅ CSS inline híbrido com fallback robusto
- ✅ Procura CSS em 3 locais diferentes
- ✅ Fallback para `<link>` se inline falhar

**📦 Deploy:**
- Commit: `e14f2f8`
- Funcionalidade: CSS inline + fallback

---

### **v2.0.0** - 24/10/2025
**Status**: 🟡 Substituído

**🔧 Correções:**
- ✅ Force redeploy para corrigir CSS 404
- ✅ CSS agora carrega corretamente (200 OK)

**📦 Deploy:**
- Commit: `0981ba2`
- Issue resolvido: CSS retornando 404

---

### **v1.9.0** - 22/10/2025
**Status**: 🔴 Substituído

**📝 Documentação:**
- ✅ Atualização do CLAUDE.md com correção erro 500
- ✅ Documentação do fix CSS para public/

**📦 Deploy:**
- Commit: `19f8fe4`

---

### **v1.8.0** - Outubro 2025
**Status**: 🔴 Substituído

**🚀 Features Anteriores:**
- ✅ Migração Netlify → Vercel completa
- ✅ Sistema de propostas públicas
- ✅ Admin dashboard funcional
- ✅ Gerador rápido
- ✅ Integração Google Drive

---

## 🎯 **ROADMAP FUTURO**

### **v2.2.0** - Próxima versão (Planejado)
- [ ] Implementar Supabase Storage para persistência
- [ ] Configurar backup automático
- [ ] Otimizar cache de propostas
- [ ] Adicionar monitoramento de erros

### **v2.3.0** - Médio prazo
- [ ] Migrar para React Components (template engine)
- [ ] Implementar CSS Modules
- [ ] Adicionar testes automatizados
- [ ] Sistema de notificações

### **v3.0.0** - Longo prazo (se necessário)
- [ ] Migração para Docker (se volume crescer)
- [ ] Banco de dados PostgreSQL
- [ ] Sistema de filas (Bull/Redis)
- [ ] WebSockets para atualizações em tempo real

---

## 📊 **COMPATIBILIDADE**

| Ambiente | Status | Versão Testada |
|----------|--------|----------------|
| Vercel Produção | ✅ Funcionando | v2.1.0 |
| Vercel Preview | ✅ Funcionando | v2.1.0 |
| Local (dev) | ✅ Funcionando | v2.1.0 |
| Netlify | ⚠️ Descontinuado | - |

---

## 🔧 **DEPENDÊNCIAS PRINCIPAIS**

```json
{
  "next": "13.5.11",
  "react": "18.2.0",
  "typescript": "5.x",
  "tailwindcss": "3.x"
}
```

---

## 📝 **COMO VERIFICAR VERSÃO**

### **Na produção:**
1. Acesse: https://pieng-propostas.vercel.app/admin
2. Badge de versão aparece no header: **v2.1.0**

### **No código:**
```bash
# Ver última versão deployada
git log --oneline -1

# Ver histórico de versões
cat VERSION.md
```

---

## 🎓 **CONVENÇÃO DE VERSIONAMENTO**

Seguimos **Semantic Versioning** (SemVer):

```
MAJOR.MINOR.PATCH

v2.1.0
│ │ │
│ │ └─ PATCH: Bug fixes, correções menores
│ └─── MINOR: Novas features, melhorias
└───── MAJOR: Mudanças breaking, refatorações grandes
```

**Exemplos:**
- `v2.0.0 → v2.0.1`: Correção de bug (patch)
- `v2.0.1 → v2.1.0`: Nova feature (minor)
- `v2.1.0 → v3.0.0`: Breaking change (major)

---

**Última atualização**: 25/10/2025 - 18:00
**Mantenedor**: Flavio + Claude Code
**Repositório**: https://github.com/Flavioprogramador123/PIENG-PROPOSTAS-SOLARES
