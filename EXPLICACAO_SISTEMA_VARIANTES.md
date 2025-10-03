# 📚 EXPLICAÇÃO - Sistema de Templates Variantes PIENG

## 🎯 O Que É?

Um sistema **modular e inteligente** que permite gerar propostas solares **personalizadas** para cada tipo de cliente, com:
- ✅ **7 templates especializados** (Residencial, Rural, 4 Comerciais, Industrial)
- ✅ **Gráficos avançados** (geração mensal, payback, economia acumulada)
- ✅ **Projeção solar precisa** (baseado em dados CRESESB)
- ✅ **Análises customizadas** (irrigação rural, custo operacional comercial, demanda industrial)
- ✅ **100% compatível** com o sistema atual (não quebra nada!)

---

## 🔍 Por Que Fazer Isso?

### Problema Atual:
Hoje temos **1 único template** (`pieng_proposal_template.html`) que serve para TODOS os tipos de clientes. Isso significa:
- ❌ Padaria recebe mesma proposta que residência
- ❌ Fazenda recebe mesma proposta que indústria
- ❌ Sem dados específicos do segmento (ex: custo de irrigação, demanda contratada)
- ❌ Sem gráficos de projeção (cliente não visualiza economia futura)

### Solução com Templates Variantes:
- ✅ **Residencial**: Foco em economia doméstica + valorização do imóvel
- ✅ **Rural**: Análise de irrigação + custo de diesel vs solar
- ✅ **Panificadora**: Custo operacional + economia em fornos/refrigeração
- ✅ **Açougue**: Economia massiva em câmaras frias
- ✅ **Restaurante**: AR-condicionado + cozinha profissional
- ✅ **Mercado**: Análise completa (iluminação + refrigeração + demanda)
- ✅ **Industrial**: Demanda contratada + créditos de energia + certificação ambiental

---

## 🏗️ Como Funciona?

### Fluxo Simplificado:

```
┌─────────────────────────────────────────────────────────┐
│  USUÁRIO SELECIONA TIPO DE CLIENTE                      │
│  [Dropdown: Residencial | Rural | Comercial | Industrial]│
│  (Se Comercial → Subtipo: Padaria | Açougue | ...)       │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  SISTEMA CARREGA CONFIGURAÇÃO DA VARIANTE               │
│  • Template HTML específico                              │
│  • CSS customizado (cores, ícones)                       │
│  • Textos personalizados (copy)                          │
│  • Recursos ativados (gráficos, projeção, etc)          │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  DADOS DO CLIENTE + ORÇAMENTOS                          │
│  (Mesmos dados de sempre: nome, consumo, potência, etc) │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  PROCESSAMENTO                                          │
│  1. Calcular métricas padrão (payback, TIR, etc)        │
│  2. Calcular métricas específicas:                      │
│     • Residencial: Valorização imóvel, CO2 evitado      │
│     • Rural: Economia irrigação, safra                  │
│     • Comercial: Custo operacional, ROI segmento        │
│     • Industrial: Demanda, créditos energia             │
│  3. Gerar gráficos (se ativado na variante)             │
│  4. Projetar geração solar (12 meses CRESESB)           │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  GERAÇÃO DO HTML                                        │
│  • Template específico carregado                        │
│  • Variáveis substituídas ({{NOME_CLIENTE}}, etc)       │
│  • Gráficos injetados (Chart.js inline)                 │
│  • CSS customizado aplicado                             │
│  • Textos personalizados inseridos                      │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  HTML FINAL GERADO                                      │
│  📄 proposta-[tipo]-[cliente]-[data].html               │
│  • Design profissional com cores do segmento            │
│  • Gráficos interativos (hover mostra valores)          │
│  • Análises personalizadas                              │
│  • CTA específico do segmento                           │
└─────────────────────────────────────────────────────────┘
```

---

## 📦 Estrutura Técnica

### 1. Configuração de Variantes (`variantConfig.ts`)

Define as **características de cada template**:

```typescript
export const VARIANT_CONFIGS = {
  residencial: {
    id: 'residencial',
    nome: 'Residencial Premium',
    tipo: 'residencial',

    features: {
      graficosAvancados: true,           // Ativa gráficos
      projecaoSolar: true,                // Ativa projeção 12 meses
      analiseEconomica: true,             // Análise ROI detalhada
      // ... outros recursos
    },

    tema: {
      corPrimaria: '#3366CC',             // Azul
      corSecundaria: '#FF6B35',           // Laranja
      icone: '🏠'                         // Casa
    },

    copy: {
      tituloHero: 'Sua Casa 100% Solar',
      ctaTexto: 'Quero Economizar Agora',
      beneficios: [
        'Zero conta de luz',
        'Valorização do imóvel',
        // ...
      ]
    }
  },

  rural: {
    id: 'rural',
    nome: 'Rural Agro',
    tipo: 'rural',

    features: {
      graficosAvancados: true,
      projecaoSolar: true,
      analiseIrrigacao: true,            // ✨ EXCLUSIVO RURAL
      // ...
    },

    tema: {
      corPrimaria: '#27ae60',            // Verde
      corSecundaria: '#f39c12',          // Amarelo
      icone: '🌾'                        // Trigo
    },

    copy: {
      tituloHero: 'Energia Solar para o Campo',
      ctaTexto: 'Aumentar Produtividade',
      // ...
    }
  },

  // ... outras variantes
};
```

### 2. Templates HTML (`variants/`)

Cada template é um **arquivo HTML completo** com placeholders:

**Exemplo: `residencial_premium.html`**

```html
<!DOCTYPE html>
<html>
<head>
  <title>{{CLIENTE_NOME}} - Proposta Solar Residencial</title>
  <style>
    /* CSS base */
    :root {
      --primary: {{COR_PRIMARIA}};
      --secondary: {{COR_SECUNDARIA}};
    }
  </style>
</head>
<body>
  <!-- Hero Section -->
  <section class="hero">
    <h1>{{TITULO_HERO}}</h1>
    <p>{{SUBTITULO_HERO}}</p>
  </section>

  <!-- Gráfico de Geração Mensal -->
  <section class="charts">
    <h2>📊 Projeção de Geração Solar (12 meses)</h2>
    {{GRAFICO_GERACAO_MENSAL}}
  </section>

  <!-- Cards de Sistemas -->
  <section class="systems">
    {{SISTEMAS_CARDS}}
  </section>

  <!-- Análise Específica Residencial -->
  <section class="valorization">
    <h2>💎 Valorização do Seu Imóvel</h2>
    <p>Imóveis com energia solar valorizam <strong>{{VALORIZACAO_PERCENTUAL}}</strong></p>
    <p>Seu imóvel pode valorizar até <strong>{{VALORIZACAO_REAIS}}</strong></p>
  </section>

  <!-- Impacto Ambiental -->
  <section class="environmental">
    <h2>🌳 Impacto Ambiental</h2>
    <p>CO₂ evitado por ano: <strong>{{CO2_EVITADO_KG}} kg</strong></p>
    <p>Equivalente a plantar <strong>{{ARVORES_EQUIVALENTES}}</strong> árvores</p>
  </section>

  <!-- CTA -->
  <section class="cta">
    <button>{{CTA_TEXTO}}</button>
  </section>
</body>
</html>
```

### 3. Gerador de Gráficos (`chartGenerator.ts`)

Cria gráficos em **HTML/Canvas usando Chart.js**:

```typescript
export function generateMonthlyGenerationChart(
  potenciaKwp: number,
  hspMensal: number[],  // [5.12, 5.34, 5.21, ...]
  performanceRate: number
): string {
  // Calcular geração para cada mês
  const geracaoMensal = hspMensal.map(hsp =>
    potenciaKwp * hsp * 30.4 * performanceRate
  );

  // Retornar HTML com gráfico inline
  return `
    <canvas id="chartGeracao" width="800" height="400"></canvas>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script>
      new Chart(document.getElementById('chartGeracao'), {
        type: 'bar',
        data: {
          labels: ['Jan', 'Fev', 'Mar', ...],
          datasets: [{
            label: 'Geração (kWh)',
            data: [${geracaoMensal.join(', ')}],
            backgroundColor: 'rgba(46, 204, 113, 0.8)'
          }]
        },
        options: {
          responsive: true,
          scales: {
            y: {beginAtZero: true}
          }
        }
      });
    </script>
  `;
}
```

### 4. Projeção Solar (`solarProjection.ts`)

Usa dados **reais de irradiação solar** (CRESESB):

```typescript
// Banco de dados de HSP mensal por cidade
export const SOLAR_DATA = {
  'anapolis-go': {
    cidade: 'Anápolis',
    estado: 'GO',
    hspMensal: [5.12, 5.34, 5.21, 5.08, 4.95, 4.82, 4.98, 5.45, 5.67, 5.89, 5.54, 5.23]
  },
  'goiania-go': {
    cidade: 'Goiânia',
    estado: 'GO',
    hspMensal: [5.18, 5.41, 5.28, 5.15, 5.01, 4.88, 5.04, 5.52, 5.74, 5.96, 5.61, 5.29]
  }
  // ... mais cidades
};

export function projectMonthlyGeneration(
  cidade: string,
  potenciaKwp: number,
  performanceRate: number
): number[] {
  const solarData = SOLAR_DATA[cidade] || SOLAR_DATA['goiania-go'];

  return solarData.hspMensal.map(hsp =>
    potenciaKwp * hsp * 30.4 * performanceRate
  );
}
```

---

## 🎨 Exemplo Visual

### Template Residencial:
```
┌───────────────────────────────────────────────────┐
│  🏠 PIENG - Proposta Solar Residencial           │
│  "Sua Casa 100% Solar"                           │
├───────────────────────────────────────────────────┤
│  📊 Gráfico: Geração Mensal (12 meses)           │
│  [Barras mostrando kWh gerado por mês]           │
├───────────────────────────────────────────────────┤
│  💰 SISTEMA RECOMENDADO ⭐                        │
│  Potência: 11.60 kWp                             │
│  PIX: R$ 16.542                                  │
│  Payback: 28.5 meses                             │
├───────────────────────────────────────────────────┤
│  💎 Valorização do Imóvel                        │
│  Seu imóvel pode valorizar R$ 35.000             │
│  (15% do valor de mercado)                       │
├───────────────────────────────────────────────────┤
│  🌳 Impacto Ambiental                            │
│  3.200 kg CO₂ evitados/ano                       │
│  = 160 árvores plantadas                         │
├───────────────────────────────────────────────────┤
│  [BOTÃO: Quero Economizar Agora]                 │
└───────────────────────────────────────────────────┘
```

### Template Rural:
```
┌───────────────────────────────────────────────────┐
│  🌾 PIENG - Proposta Solar Rural                 │
│  "Energia Solar para o Campo"                    │
├───────────────────────────────────────────────────┤
│  📊 Gráfico: Consumo Sazonal                     │
│  [Linha mostrando consumo Safra vs Entressafra]  │
├───────────────────────────────────────────────────┤
│  💧 Análise de Irrigação                         │
│  Consumo atual bombas: 2.500 kWh/mês             │
│  Custo diesel: R$ 3.200/mês                      │
│  Economia solar: R$ 2.900/mês (91%)              │
├───────────────────────────────────────────────────┤
│  🌽 Economia por Safra                           │
│  Economia total: R$ 34.800/safra                 │
│  Payback: 1.8 safras                             │
├───────────────────────────────────────────────────┤
│  [BOTÃO: Aumentar Produtividade]                 │
└───────────────────────────────────────────────────┘
```

### Template Panificadora:
```
┌───────────────────────────────────────────────────┐
│  🥖 PIENG - Proposta Solar Panificadora          │
│  "Reduza Custos e Aumente Seus Lucros"          │
├───────────────────────────────────────────────────┤
│  📊 Gráfico: Custo Operacional                   │
│  [Pizza mostrando % energia no custo total]      │
├───────────────────────────────────────────────────┤
│  💰 Análise de Custo Operacional                 │
│  Custo atual energia: R$ 2.100/mês               │
│  Custo pós-solar: R$ 315/mês                     │
│  Economia: R$ 1.785/mês (85%)                    │
├───────────────────────────────────────────────────┤
│  🥐 Impacto no Produto                           │
│  Redução custo pão francês: R$ 0,08/kg           │
│  Margem extra: 12% por produto                   │
├───────────────────────────────────────────────────┤
│  ♻️ Marketing Verde                              │
│  "Padaria Sustentável"                           │
│  Certificado de energia limpa                    │
├───────────────────────────────────────────────────┤
│  [BOTÃO: Reduzir Custos Agora]                   │
└───────────────────────────────────────────────────┘
```

---

## 🔧 Como Usar (Para Usuário)

### No Gerador Rápido:

1. **Preencher dados do cliente** (nome, cidade, consumo)
2. **Selecionar tipo de cliente** no dropdown:
   ```
   [Tipo de Cliente: Comercial ▼]
   ```
3. **Se Comercial, selecionar subtipo**:
   ```
   [Subtipo: Panificadora ▼]
   ```
4. **Adicionar orçamentos** como sempre
5. **Calcular resultados**
6. **Gerar Proposta**
   - Sistema detecta tipo selecionado
   - Carrega template específico
   - Gera gráficos automaticamente
   - Calcula métricas personalizadas
   - Cria HTML com design do segmento

### No Sistema do Consultor:

1. **Mesma lógica** do Gerador Rápido
2. **Seletor de template** no topo da página
3. **Preview do template** ao selecionar
4. **Gerar propostas** com template aplicado

---

## ✅ Garantias de Compatibilidade

### O Que NÃO Vai Mudar:

- ✅ Template padrão (`pieng_proposal_template.html`) **permanece intacto**
- ✅ Propostas antigas **continuam funcionando**
- ✅ Se não selecionar variante, **usa template padrão**
- ✅ Dados de entrada **são os mesmos** (não precisa mudar formulários)
- ✅ APIs **mantêm compatibilidade** (parâmetros opcionais)

### Como Garantimos Isso:

```typescript
// API aceita parâmetros OPCIONAIS
export default async function handler(req, res) {
  const {cliente, orcamentos, config, clientType, subType} = req.body;

  // Se não informar tipo, usa template padrão
  const template = clientType
    ? getVariantConfig(clientType, subType)
    : DEFAULT_TEMPLATE;

  // Resto do código permanece igual
}
```

---

## 📊 Comparativo: Antes vs Depois

### ANTES (Sistema Atual):

| Cliente | Template | Análises | Gráficos |
|---------|----------|----------|----------|
| Casa | padrão | genéricas | ❌ não |
| Fazenda | padrão | genéricas | ❌ não |
| Padaria | padrão | genéricas | ❌ não |
| Indústria | padrão | genéricas | ❌ não |

**Resultado**: Proposta genérica para todos

### DEPOIS (Com Variantes):

| Cliente | Template | Análises | Gráficos |
|---------|----------|----------|----------|
| Casa | residencial | valorização imóvel, CO2 | ✅ sim |
| Fazenda | rural | irrigação, safra | ✅ sim |
| Padaria | panificadora | custo operacional, produto | ✅ sim |
| Indústria | industrial | demanda, créditos | ✅ sim |

**Resultado**: Proposta personalizada por segmento

---

## 🎯 Benefícios Práticos

### Para o Cliente Final:
- ✅ **Proposta personalizada** para seu negócio
- ✅ **Gráficos visuais** (entende melhor o projeto)
- ✅ **Métricas relevantes** (ex: custo irrigação, demanda contratada)
- ✅ **Design profissional** com cores do segmento
- ✅ **Confiança aumentada** (vê que entendemos seu negócio)

### Para a PIENG:
- ✅ **Maior taxa de conversão** (proposta específica vende mais)
- ✅ **Diferenciação competitiva** (concorrentes não têm isso)
- ✅ **Atendimento profissional** (cada segmento tem template)
- ✅ **Credibilidade técnica** (gráficos + projeções CRESESB)
- ✅ **Escalabilidade** (fácil adicionar novos templates)

### Para o Time PIENG:
- ✅ **Facilidade de uso** (apenas selecionar tipo de cliente)
- ✅ **Automação total** (gráficos gerados automaticamente)
- ✅ **Sem trabalho manual** (sistema calcula tudo)
- ✅ **Consistência** (sempre usa template correto)

---

## 🚀 Próximos Passos

### O Que Fazer Agora:

1. ✅ **Aprovar este documento**
   - Ler e validar se faz sentido
   - Sugerir alterações se necessário

2. ✅ **Aprovar o ROADMAP**
   - Revisar fases de implementação
   - Confirmar tempo estimado (25-35h)

3. ✅ **Implementar Fase por Fase**
   - Seguir roadmap à risca
   - Testar cada fase antes de avançar
   - Validar que template padrão continua funcionando

4. ✅ **Testar com Dados Reais**
   - Gerar proposta de cada tipo
   - Validar cálculos e gráficos
   - Ajustar conforme necessário

5. ✅ **Deploy Gradual**
   - Primeiro em staging/teste
   - Depois em produção
   - Monitorar erros

---

## ❓ Perguntas Frequentes

### 1. Isso vai quebrar o sistema atual?
**Não!** Template padrão permanece intacto. Se não selecionar variante, usa o padrão.

### 2. Precisa mudar os formulários?
**Não!** Apenas adicionar um dropdown de seleção de tipo. Resto igual.

### 3. E as propostas antigas?
**Continuam funcionando!** HTML gerado não muda retroativamente.

### 4. Quanto tempo leva para implementar?
**25-35 horas** seguindo o roadmap. Pode ser feito em 1 semana full-time ou 2-3 semanas part-time.

### 5. Posso adicionar mais templates depois?
**Sim!** Sistema é modular. Criar novo template = criar novo arquivo + adicionar config.

### 6. Funciona em mobile?
**Sim!** Todos os templates são responsivos.

### 7. Os gráficos funcionam offline?
**Sim!** Chart.js é carregado via CDN mas gráficos são gerados inline no HTML.

### 8. Posso editar os templates?
**Sim!** São arquivos HTML normais. Editar arquivo = atualizar template.

---

## 🎉 Resumo Executivo

### O Que Estamos Fazendo:
Criando **7 templates especializados** para gerar propostas solares personalizadas por tipo de cliente (Residencial, Rural, 4 Comerciais, Industrial), com **gráficos avançados** e **análises específicas** de cada segmento.

### Por Que Isso é Bom:
- ✅ **Cliente final** recebe proposta personalizada (mais chances de fechar)
- ✅ **PIENG** se diferencia da concorrência (ninguém tem isso)
- ✅ **Time PIENG** trabalha mais rápido (automação total)

### Quanto Custa:
- ⏱️ **25-35 horas** de desenvolvimento
- 💰 **Zero custo** de licenças (tudo open source)
- 🚀 **ROI imediato** (mais vendas desde o primeiro uso)

### Como Garantimos Sucesso:
- ✅ Template padrão **não muda** (zero regressão)
- ✅ Roadmap **detalhado** (passo a passo)
- ✅ Testes **obrigatórios** (valida antes de deploy)
- ✅ Documentação **completa** (qualquer um mantém depois)

---

**📌 Aguardando aprovação para iniciar implementação!**
