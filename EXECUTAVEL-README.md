# 🚀 PIENG Propostas - Executável Standalone

## 📦 Como Usar o Executável

### ✅ **Método 1: Arquivo .BAT (Recomendado)**

1. **Dê duplo clique** no arquivo:
   ```
   PIENG-Propostas.bat
   ```

2. O sistema vai:
   - ✅ Verificar Node.js instalado
   - ✅ Instalar dependências (primeira vez)
   - ✅ Compilar aplicação (primeira vez)
   - ✅ Iniciar servidor local
   - ✅ Abrir navegador automaticamente

3. **Acesse:** http://localhost:3000/gerador-rapido

---

### ⚙️ **Pré-requisitos**

Você precisa ter instalado:

- ✅ **Node.js 18+** - https://nodejs.org
- ✅ **Windows 10/11**

---

### 🔧 **Primeira Execução**

Na **primeira vez** que rodar o `.bat`:

1. Vai instalar dependências (5-10 minutos)
2. Vai compilar a aplicação (2-3 minutos)
3. Nas próximas vezes, inicia instantaneamente!

---

### 🖥️ **Usando o Sistema**

Quando o servidor iniciar:

```
========================================================
   SERVIDOR RODANDO:
   http://localhost:3000

   Acesse: http://localhost:3000/gerador-rapido

   Pressione Ctrl+C para encerrar
========================================================
```

1. **Gerador Rápido:** http://localhost:3000/gerador-rapido
2. **Admin:** http://localhost:3000/admin
3. **Propostas Públicas:** http://localhost:3000/propostas-publicas

---

### 🛑 **Como Encerrar**

- Pressione **Ctrl+C** na janela do terminal
- Ou feche a janela

---

### 📁 **Estrutura de Arquivos**

Todos os dados ficam salvos localmente em:

```
src/data/clientes/               ← Dados dos clientes
public/propostas/orçamento/      ← Propostas geradas (HTML)
```

---

### 🔄 **Atualizar Sistema**

Para atualizar para nova versão:

1. Substitua todos os arquivos
2. Delete a pasta `.next`
3. Execute o `.bat` novamente

---

### ⚠️ **Solução de Problemas**

#### Erro: "Node.js não encontrado"
**Solução:** Instale Node.js de https://nodejs.org

#### Erro: "Porta 3000 em uso"
**Solução:**
1. Feche outros processos na porta 3000
2. Ou edite o `.bat` e mude `npm start` para `npm run dev` (usa porta alternativa)

#### Erro ao compilar
**Solução:**
1. Delete a pasta `node_modules`
2. Delete a pasta `.next`
3. Execute o `.bat` novamente

---

### 📊 **Recursos Disponíveis**

- ✅ Gerador Rápido de Propostas
- ✅ Admin de Clientes e Orçamentos
- ✅ Extração de Dados com IA
- ✅ Cálculos Financeiros (TIR, Payback, etc)
- ✅ Templates Personalizados
- ✅ Exportação HTML/PDF

---

### 🔐 **Segurança**

- ✅ Todos os dados ficam **localmente** no seu computador
- ✅ Não envia dados para nenhum servidor externo
- ✅ Sistema **100% offline** (exceto APIs de IA se configuradas)

---

### 📞 **Suporte**

Para dúvidas ou problemas:
- Email: contato@pieng.com.br
- Tel: (62) 98463-3175

---

**Versão:** 1.0.0
**Data:** 26/10/2025
**Compatível com:** Windows 10/11 x64
