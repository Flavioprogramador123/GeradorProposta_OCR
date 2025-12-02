# 📊 Sistema de Analytics e Rastreamento de Propostas

## 🎯 Funcionalidades Implementadas

### 1. **Rastreamento Automático**
- ✅ Registro automático de visualizações
- ✅ Tempo total na página
- ✅ Percentual de scroll (quanto da página foi visualizado)
- ✅ Contagem de cliques
- ✅ Detecção de dispositivo (desktop, mobile, tablet)
- ✅ Detecção de navegador e sistema operacional
- ✅ Captura de IP (para detectar compartilhamento)

### 2. **Detecção de Compartilhamento**
- ✅ Múltiplos IPs acessando a mesma proposta = Link compartilhado
- ✅ Indica possível compartilhamento com outro fornecedor
- ✅ Alertas automáticos quando detectado

### 3. **Sistema de Alertas Inteligentes**
- ✅ **Sem visualização**: Proposta nunca foi aberta
- ✅ **Tempo sem visualizar**: Mais de 7 dias sem acesso
- ✅ **Compartilhado**: Múltiplos IPs detectados
- ✅ **Muito tempo aberto**: Mais de 30 minutos = Alto interesse

### 4. **Dashboard de Analytics**
- ✅ Total de visualizações
- ✅ Visualizações únicas
- ✅ Tempo médio na página
- ✅ Status de compartilhamento
- ✅ Última visualização
- ✅ Alertas e recomendações

## 📋 Como Usar

### Passo 1: Criar Tabela no Supabase

Execute o SQL em `criar_tabela_proposta_analytics.sql` no Supabase Dashboard:

1. Acesse o Supabase Dashboard
2. Vá em SQL Editor > New Query
3. Cole o conteúdo do arquivo `criar_tabela_proposta_analytics.sql`
4. Execute

### Passo 2: O Sistema Já Está Funcionando!

O tracking é automático. Quando um cliente acessa uma proposta:
- ✅ Os dados são registrados automaticamente
- ✅ O sistema detecta IP, dispositivo, tempo, etc.
- ✅ Alertas são gerados automaticamente

### Passo 3: Visualizar Analytics

1. Acesse `/admin/orcamentos/[clienteId]`
2. A seção "📊 Analytics da Proposta" aparece automaticamente
3. Veja estatísticas e alertas em tempo real

## 🔍 O Que Cada Métrica Significa

### **Total de Visualizações**
- Soma de todas as vezes que a proposta foi aberta
- Inclui recarregamentos e retornos

### **Visualizações Únicas**
- Número de sessões diferentes
- Cada IP conta como uma visualização única

### **Tempo Médio**
- Tempo médio que o cliente passa analisando a proposta
- Valores altos indicam interesse

### **Status: Compartilhado**
- 🔗 **Compartilhado**: Múltiplos IPs detectados
  - Pode ter sido enviado para outro fornecedor
  - Recomendação: Entrar em contato para entender situação
  
- 👤 **Individual**: Apenas um IP
  - Cliente está analisando sozinho
  - Comportamento normal

### **Última Visualização**
- Quantos dias desde a última vez que o cliente abriu
- **Mais de 7 dias**: Sistema gera alerta automático

## ⚠️ Alertas e Recomendações

### **"Cliente não visualiza há X dias"**
- **Ação**: Entrar em contato para verificar interesse
- **Quando**: Mais de 7 dias sem visualizar

### **"Link foi compartilhado"**
- **Ação**: Investigar se foi compartilhado com outro fornecedor
- **Quando**: Múltiplos IPs diferentes acessam a proposta

### **"Cliente passou muito tempo analisando"**
- **Ação**: Cliente está interessado! Priorizar contato
- **Quando**: Mais de 30 minutos na página

### **"Proposta ainda não foi visualizada"**
- **Ação**: Verificar se o link foi enviado corretamente
- **Quando**: Nunca foi aberta

## 🛠️ Possibilidades Futuras

### **Melhorias Sugeridas:**
1. **Geolocalização por IP**: Identificar cidade/estado do acesso
2. **Heatmap de Scroll**: Ver quais seções são mais visualizadas
3. **Tracking de Downloads**: Se o cliente baixou PDF
4. **Comparação com Outros Fornecedores**: Detectar se está comparando propostas
5. **Notificações Automáticas**: Email/WhatsApp quando alertas são gerados
6. **Histórico de Contatos**: Registrar quando você entrou em contato

### **Integrações Possíveis:**
- 📧 **Email**: Enviar alertas por email
- 📱 **WhatsApp**: Notificações via WhatsApp Business API
- 📊 **Dashboard Avançado**: Gráficos e tendências
- 🔔 **Sistema de Notificações**: Alertas em tempo real no admin

## 📝 Notas Importantes

1. **Privacidade**: IPs são armazenados apenas para detectar compartilhamento
2. **Performance**: Tracking é assíncrono e não afeta velocidade da página
3. **Precisão**: Tempo na página é aproximado (envio a cada 30s)
4. **Compatibilidade**: Funciona em todos os navegadores modernos

## 🚀 Próximos Passos

1. Execute o SQL no Supabase
2. Teste abrindo uma proposta
3. Verifique os analytics no admin
4. Configure alertas personalizados (futuro)

---

**Desenvolvido para PIENG Soluções Energéticas** ⚡


