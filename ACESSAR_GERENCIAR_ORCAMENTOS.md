# 📋 Como Acessar o Gerenciar Orçamentos

## 🎯 Rotas Disponíveis

### 1. Dashboard Admin Principal
```
http://localhost:3000/admin
```
- Lista todos os clientes
- Botão "📋 Orçamentos" em cada cliente

### 2. Gerenciar Orçamentos de um Cliente
```
http://localhost:3000/admin/orcamentos/[clienteId]
```
**Exemplo:**
- `http://localhost:3000/admin/orcamentos/ciney-30-10-2025`
- `http://localhost:3000/admin/orcamentos/daniel-001-29-09-2025`

### 3. Modo Consultor (Avançado)
```
http://localhost:3000/admin/orcamentos/[clienteId]/consultor
```
- Interface mais avançada com templates
- Seleção de tipo de cliente
- Geração de propostas personalizadas

### 4. Ver Todos os Orçamentos
```
http://localhost:3000/admin/orcamentos
```
- Lista todos os orçamentos de todos os clientes
- Filtros e busca

---

## ✅ Funcionalidades Disponíveis

### No Gerenciar Orçamentos:
- ✅ Adicionar novo orçamento manualmente
- ✅ Buscar orçamento existente
- ✅ Editar orçamento
- ✅ Aprovar/Rejeitar orçamento
- ✅ Gerar proposta a partir dos orçamentos
- ✅ Visualizar comparação entre orçamentos
- ✅ Calcular preços e performance

### No Modo Consultor:
- ✅ Selecionar tipo de cliente (Residencial, Comercial, Industrial, Rural)
- ✅ Configurar parâmetros (HSP, Tarifa, Performance)
- ✅ Aplicar templates personalizados
- ✅ Gerar propostas com design especializado

---

## 🚀 Como Testar

### Passo 1: Acessar Admin
1. Abra: `http://localhost:3000/admin`
2. Veja a lista de clientes

### Passo 2: Abrir Gerenciar Orçamentos
1. Clique no botão **"📋 Orçamentos"** de um cliente
2. Ou acesse diretamente: `/admin/orcamentos/ciney-30-10-2025`

### Passo 3: Adicionar Orçamento
1. Clique em **"+ Adicionar Orçamento"**
2. Preencha os dados:
   - Fornecedor
   - Componentes (módulos, inversores)
   - Preços
3. Salve

### Passo 4: Gerar Proposta
1. Aprove os orçamentos desejados
2. Clique em **"Gerar Proposta"**
3. A proposta será gerada usando o template bonito (`pieng_proposal_template.html`)

---

## 📝 Notas

- O template bonito (`pieng_proposal_template.html`) já está sendo usado por padrão
- As propostas geradas têm design moderno com gradientes e animações
- O sistema funciona tanto localmente quanto no Vercel (após configurar Supabase)

---

## 🔍 Verificar se está Funcionando

1. **Template Bonito:**
   - Gere uma proposta
   - Verifique se tem gradiente roxo/azul
   - Verifique se tem logo PIENG
   - Verifique se tem cards bonitos

2. **Gerenciar Orçamentos:**
   - Acesse `/admin/orcamentos/[clienteId]`
   - Deve carregar a lista de orçamentos
   - Deve permitir adicionar/editar

---

**✅ Tudo pronto para usar!**

