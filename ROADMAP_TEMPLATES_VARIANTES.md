# 🚀 ROADMAP - Sistema de Templates Variantes PIENG

## 📋 Objetivo

Criar um sistema completo de templates especializados por tipo de cliente (Residencial, Rural, Comercial, Industrial) com gráficos avançados, projeção solar e análises personalizadas, **MANTENDO** o template atual como padrão (não regredir).

---

## ✅ Princípios Fundamentais

1. **NÃO REGREDIR**: Template atual (`pieng_proposal_template.html`) permanece como padrão
2. **BACKWARDS COMPATIBLE**: Propostas antigas continuam funcionando
3. **PROGRESSIVE ENHANCEMENT**: Novos recursos são opcionais
4. **MODULAR**: Cada template pode ser editado independentemente
5. **PERFORMANCE**: Templates devem carregar rápido (< 2s)

---

## 📦 Estrutura do Projeto

```
src/
├── data/knowledge/templates/
│   ├── pieng_proposal_template.html          # ✅ TEMPLATE PADRÃO (não mexer)
│   └── variants/                              # 🆕 NOVOS TEMPLATES
│       ├── residencial_premium.html           # Template Residencial
│       ├── rural_agro.html                    # Template Rural
│       ├── comercial_panificadora.html        # Template Padaria
│       ├── comercial_acougue.html             # Template Açougue
│       ├── comercial_restaurante.html         # Template Restaurante
│       ├── comercial_mercado.html             # Template Mercado
│       └── industrial_premium.html            # Template Industrial
│
├── styles/variants/                           # 🆕 CSS CUSTOMIZADO
│   ├── residencial.css                        # Cores/ícones residenciais
│   ├── rural.css                              # Cores/ícones rurais
│   ├── comercial.css                          # Cores/ícones comerciais
│   └── industrial.css                         # Cores/ícones industriais
│
├── lib/
│   ├── templateEngine.ts                      # ✅ EXISTENTE (manter)
│   ├── variantConfig.ts                       # 🆕 CONFIG DE VARIANTES
│   ├── chartGenerator.ts                      # 🆕 GRÁFICOS (Chart.js)
│   └── solarProjection.ts                     # 🆕 PROJEÇÃO SOLAR
│
└── components/                                # 🆕 COMPONENTES REACT
    ├── TemplateSelector.tsx                   # Seletor de templates
    └── VariantPreview.tsx                     # Preview do template
```

---

## 🎯 Fases de Implementação

### **FASE 1: Infraestrutura Base** ⏱️ 2-3 horas

#### 1.1. Criar arquivo de configuração de variantes
- **Arquivo**: `src/lib/variantConfig.ts`
- **Conteúdo**:
  - Tipos: `ClientType` (residencial, rural, comercial, industrial)
  - Subtipos comerciais: `ComercialSubType` (panificadora, açougue, etc.)
  - Interface `VariantConfig` com:
    - `id`, `nome`, `descricao`, `tipo`, `subtipo`
    - `features` (flags de recursos: gráficos, projeção solar, etc.)
    - `tema` (cores, gradientes, ícones)
    - `copy` (textos personalizados)
    - `templateFile`, `cssFile`
  - Constante `VARIANT_CONFIGS` com todas as variantes
  - Funções helper:
    - `getVariantConfig(tipo, subtipo)`
    - `getVariantsByType(tipo)`
    - `getAllVariants()`

**Validação**: Rodar `npm run build` sem erros

#### 1.2. Atualizar `templateEngine.ts`
- **Modificar classe `TemplateEnginePadrao`**:
  - Adicionar propriedade `variantConfig?: VariantConfig`
  - Método `applyVariant(html: string): string` que:
    - Injeta classe CSS no body (`variant-${id}`)
    - Injeta CSS customizado da variante
    - Injeta variáveis CSS (`--variant-primary`, etc.)
    - Substitui placeholders de copy
  - Atualizar construtor para aceitar `clientType` e `subType`

- **Atualizar função `generateTemplateHtmlResultados`**:
  - Aceitar parâmetros opcionais `clientType` e `subType`
  - Passar para `TemplateEnginePadrao`

**Validação**: Build sem erros + template padrão continua funcionando

---

### **FASE 2: Biblioteca de Gráficos** ⏱️ 3-4 horas

#### 2.1. Instalar Chart.js
```bash
npm install chart.js
npm install --save-dev @types/chart.js
```

#### 2.2. Criar `chartGenerator.ts`
- **Arquivo**: `src/lib/chartGenerator.ts`
- **Funções**:

```typescript
// Gráfico de Geração Mensal (12 meses)
export function generateMonthlyGenerationChart(
  potenciaKwp: number,
  hspMensal: number[],  // 12 valores
  performanceRate: number
): string;

// Gráfico de Payback Comparativo
export function generatePaybackComparisonChart(
  sistemas: Array<{nome: string, payback: number}>
): string;

// Gráfico de Potência (Barras)
export function generatePowerComparisonChart(
  sistemas: Array<{nome: string, potencia: number}>
): string;

// Gráfico de Economia Acumulada (25 anos)
export function generateSavingsProjectionChart(
  investimento: number,
  economiaMensal: number,
  reajusteTarifario: number
): string;

// Gráfico de Pizza - Composição de Custos
export function generateCostBreakdownChart(custos: {
  modulos: number,
  inversores: number,
  estrutura: number,
  maoDeObra: number,
  outros: number
}): string;
```

**Validação**: Gerar HTML com gráficos inline (Canvas + Chart.js CDN)

#### 2.3. Criar `solarProjection.ts`
- **Arquivo**: `src/lib/solarProjection.ts`
- **Funções**:

```typescript
// Dados de irradiação solar por cidade (CRESESB)
export const SOLAR_DATA: Record<string, {
  cidade: string,
  estado: string,
  lat: number,
  lon: number,
  hspMensal: number[]  // 12 meses
}>;

// Projetar geração mensal
export function projectMonthlyGeneration(
  cidade: string,
  potenciaKwp: number,
  performanceRate: number
): number[];

// Projetar economia em 25 anos
export function projectLongTermSavings(
  investimento: number,
  economiaMensal: number,
  reajusteAnual: number,
  inflacao: number
): {
  ano: number,
  economiaAnual: number,
  economiaAcumulada: number,
  vpl: number
}[];
```

**Validação**: Função retorna dados corretos para Goiás (Anápolis, Goiânia)

---

### **FASE 3: Templates HTML Variantes** ⏱️ 5-6 horas

#### 3.1. Template Residencial Premium
- **Arquivo**: `src/data/knowledge/templates/variants/residencial_premium.html`
- **Recursos**:
  - ✅ Template base (pieng_proposal_template.html)
  - ✅ Gráfico de geração mensal (12 meses)
  - ✅ Gráfico de economia acumulada (25 anos)
  - ✅ Seção "Valorização do Imóvel" (15-20%)
  - ✅ Comparativo "Antes vs Depois" da conta de luz
  - ✅ Certificado de energia limpa (quantos kg CO2 evitados)

**Variáveis específicas**:
```html
{{GRAFICO_GERACAO_MENSAL}}
{{GRAFICO_ECONOMIA_25_ANOS}}
{{VALORIZACAO_IMOVEL}}
{{CO2_EVITADO_ANUAL}}
{{ARVORES_EQUIVALENTES}}
```

#### 3.2. Template Rural Agro
- **Arquivo**: `src/data/knowledge/templates/variants/rural_agro.html`
- **Recursos**:
  - ✅ Análise de irrigação (consumo de bombas)
  - ✅ Cálculo de economia por safra
  - ✅ Gráfico de consumo sazonal (safra vs entressafra)
  - ✅ Comparativo "Custo irrigação diesel vs solar"
  - ✅ Projeção de aumento de produtividade

**Variáveis específicas**:
```html
{{CONSUMO_IRRIGACAO_MENSAL}}
{{ECONOMIA_POR_SAFRA}}
{{GRAFICO_CONSUMO_SAZONAL}}
{{CUSTO_DIESEL_VS_SOLAR}}
{{AUMENTO_PRODUTIVIDADE}}
```

#### 3.3. Templates Comerciais
Criar 4 variantes:
- **Panificadora**: Foco em fornos e refrigeração
- **Açougue**: Foco em câmaras frias
- **Restaurante**: Foco em ar-condicionado e cozinha
- **Mercado**: Análise completa (iluminação + refrigeração + AC)

**Recursos comuns**:
- ✅ Gráfico de consumo por horário (pico vs fora pico)
- ✅ Análise de custo operacional (% energia no custo total)
- ✅ ROI específico do segmento
- ✅ Marketing sustentável (selo verde)
- ✅ Comparativo com concorrentes

**Variáveis específicas**:
```html
{{CUSTO_OPERACIONAL_ATUAL}}
{{CUSTO_OPERACIONAL_SOLAR}}
{{REDUCAO_PERCENTUAL}}
{{GRAFICO_HORARIO_PICO}}
{{SELO_SUSTENTABILIDADE}}
```

#### 3.4. Template Industrial Premium
- **Arquivo**: `src/data/knowledge/templates/variants/industrial_premium.html`
- **Recursos**:
  - ✅ Análise de demanda contratada
  - ✅ Gráfico de consumo em tempo real vs geração
  - ✅ Cálculo de créditos de energia
  - ✅ Redução de bandeiras tarifárias
  - ✅ Certificação ISO 14001 (ambiental)
  - ✅ ROI detalhado com TIR e VPL

**Variáveis específicas**:
```html
{{DEMANDA_CONTRATADA_ATUAL}}
{{DEMANDA_CONTRATADA_NOVA}}
{{ECONOMIA_DEMANDA}}
{{CREDITOS_ENERGIA_MENSAL}}
{{GRAFICO_CONSUMO_REAL_TIME}}
{{CERTIFICACAO_AMBIENTAL}}
```

---

### **FASE 4: CSS Customizado** ⏱️ 2-3 horas

#### 4.1. Criar estilos por tipo
Criar arquivos CSS em `src/styles/variants/`:

**residencial.css**:
```css
.variant-residencial {
  --variant-primary: #3366CC;
  --variant-secondary: #FF6B35;
  --variant-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.variant-residencial .hero-section {
  background-image: url('/images/variants/residencial-hero.jpg');
}

.variant-residencial .icon-family::before {
  content: '👨‍👩‍👧‍👦';
}
```

**rural.css**:
```css
.variant-rural {
  --variant-primary: #27ae60;
  --variant-secondary: #f39c12;
  --variant-gradient: linear-gradient(135deg, #56ab2f 0%, #a8e063 100%);
}

.variant-rural .hero-section {
  background-image: url('/images/variants/rural-hero.jpg');
}

.variant-rural .icon-field::before {
  content: '🌾';
}
```

**comercial.css**: (usado por panificadora, açougue, restaurante, mercado)
**industrial.css**: (usado por indústrias)

---

### **FASE 5: Componente Seletor de Templates** ⏱️ 2-3 horas

#### 5.1. Criar `TemplateSelector.tsx`
- **Arquivo**: `src/components/TemplateSelector.tsx`
- **Funcionalidade**:
  - Dropdown para selecionar tipo de cliente
  - Se "Comercial", mostrar segundo dropdown com subtipos
  - Preview do template selecionado
  - Botão "Aplicar Template"

```tsx
interface TemplateSelectorProps {
  onSelect: (tipo: ClientType, subtipo?: ComercialSubType) => void;
  selected?: {tipo: ClientType, subtipo?: ComercialSubType};
}

export function TemplateSelector({onSelect, selected}: TemplateSelectorProps) {
  // UI com dropdowns estilizados
}
```

#### 5.2. Integrar no Gerador Rápido
- **Arquivo**: `src/pages/gerador-rapido.tsx`
- **Adicionar**:
  - State para template selecionado
  - `<TemplateSelector>` antes da seção de orçamentos
  - Passar `clientType` e `subType` para API ao gerar proposta

#### 5.3. Integrar no Sistema do Consultor
- **Arquivo**: `src/pages/admin/orcamentos/[clienteId]/consultor.tsx`
- **Adicionar**:
  - Mesma integração do Gerador Rápido

---

### **FASE 6: Atualizar APIs** ⏱️ 2-3 horas

#### 6.1. API `/api/gerar-proposta.ts`
- **Modificar**:
  - Aceitar `clientType` e `subType` no body
  - Passar para `generateTemplateHtmlResultados(data, clientType, subType)`
  - Gerar gráficos dinamicamente se variante tiver `graficosAvancados: true`
  - Injetar variáveis específicas da variante

#### 6.2. API `/api/consultor/gerar-proposta.ts`
- **Modificar**: Mesma lógica acima

#### 6.3. Criar API de projeção solar
- **Arquivo**: `src/pages/api/solar-projection.ts`
- **Endpoint**: `POST /api/solar-projection`
- **Body**: `{cidade, potenciaKwp, performanceRate}`
- **Response**: `{geracaoMensal: number[], geracaoAnual: number}`

---

### **FASE 7: Banco de Dados de Irradiação Solar** ⏱️ 3-4 horas

#### 7.1. Criar arquivo de dados CRESESB
- **Arquivo**: `src/data/knowledge/solar_data.json`
- **Estrutura**:
```json
{
  "anapólis-go": {
    "cidade": "Anápolis",
    "estado": "GO",
    "lat": -16.3281,
    "lon": -48.9534,
    "hspMensal": [5.12, 5.34, 5.21, 5.08, 4.95, 4.82, 4.98, 5.45, 5.67, 5.89, 5.54, 5.23]
  },
  "goiânia-go": {
    "cidade": "Goiânia",
    "estado": "GO",
    "lat": -16.6864,
    "lon": -49.2643,
    "hspMensal": [5.18, 5.41, 5.28, 5.15, 5.01, 4.88, 5.04, 5.52, 5.74, 5.96, 5.61, 5.29]
  }
}
```

#### 7.2. Popular banco com capitais + principais cidades
- **Prioridade 1**: Capitais (27 cidades)
- **Prioridade 2**: Cidades > 100k habitantes
- **Prioridade 3**: Cidades com projetos PIENG

**Fonte de dados**: CRESESB (http://www.cresesb.cepel.br/)

---

### **FASE 8: Testes e Validação** ⏱️ 3-4 horas

#### 8.1. Testes unitários
- Testar `variantConfig.ts` (todas as funções)
- Testar `chartGenerator.ts` (gráficos válidos)
- Testar `solarProjection.ts` (cálculos corretos)

#### 8.2. Testes de integração
- Gerar proposta com cada variante
- Validar HTML gerado (sem erros)
- Validar gráficos (renderizam no navegador)
- Validar dados de projeção solar

#### 8.3. Testes de regressão
- ✅ **CRÍTICO**: Template padrão continua funcionando
- ✅ Propostas antigas ainda abrem corretamente
- ✅ Gerador Rápido funciona sem selecionar variante
- ✅ Sistema do Consultor funciona sem variante

#### 8.4. Testes de performance
- Tempo de geração de HTML < 2s
- Tamanho de HTML < 500KB
- Gráficos carregam em < 1s

---

### **FASE 9: Documentação** ⏱️ 2-3 horas

#### 9.1. Atualizar CLAUDE.md
- Seção "Sistema de Templates Variantes"
- Explicar como funciona
- Exemplos de uso
- Variantes disponíveis

#### 9.2. Criar guia de usuário
- **Arquivo**: `GUIA_TEMPLATES_VARIANTES.md`
- Como escolher template correto
- Diferenças entre templates
- Quando usar cada variante

#### 9.3. Criar guia de desenvolvedor
- **Arquivo**: `DEV_TEMPLATES_VARIANTES.md`
- Como criar nova variante
- Estrutura de arquivos
- Placeholders disponíveis

---

### **FASE 10: Deploy e Rollout** ⏱️ 1-2 horas

#### 10.1. Build de produção
```bash
npm run build
```

#### 10.2. Deploy Vercel
```bash
vercel --prod
```

#### 10.3. Testes em produção
- Gerar proposta de cada tipo
- Validar em navegadores (Chrome, Firefox, Edge, Safari)
- Validar em mobile

---

## 📊 Resumo de Entregas

### Templates HTML (7)
- [x] `residencial_premium.html`
- [x] `rural_agro.html`
- [x] `comercial_panificadora.html`
- [x] `comercial_acougue.html`
- [x] `comercial_restaurante.html`
- [x] `comercial_mercado.html`
- [x] `industrial_premium.html`

### CSS (4)
- [x] `residencial.css`
- [x] `rural.css`
- [x] `comercial.css`
- [x] `industrial.css`

### Bibliotecas TypeScript (3)
- [x] `variantConfig.ts`
- [x] `chartGenerator.ts`
- [x] `solarProjection.ts`

### Componentes React (1)
- [x] `TemplateSelector.tsx`

### APIs (1)
- [x] `solar-projection.ts`

### Dados (1)
- [x] `solar_data.json` (irradiação solar)

### Documentação (3)
- [x] Atualizar `CLAUDE.md`
- [x] `GUIA_TEMPLATES_VARIANTES.md`
- [x] `DEV_TEMPLATES_VARIANTES.md`

---

## ⏱️ Estimativa de Tempo Total

| Fase | Tempo |
|------|-------|
| Fase 1: Infraestrutura | 2-3h |
| Fase 2: Gráficos | 3-4h |
| Fase 3: Templates HTML | 5-6h |
| Fase 4: CSS | 2-3h |
| Fase 5: Seletor | 2-3h |
| Fase 6: APIs | 2-3h |
| Fase 7: Banco Solar | 3-4h |
| Fase 8: Testes | 3-4h |
| Fase 9: Docs | 2-3h |
| Fase 10: Deploy | 1-2h |
| **TOTAL** | **25-35 horas** |

---

## 🎯 Critérios de Sucesso

### Funcionalidade
- [x] Template padrão continua funcionando
- [x] 7 templates variantes implementados
- [x] Gráficos renderizam corretamente
- [x] Projeção solar precisa (CRESESB)
- [x] Seletor de templates intuitivo

### Performance
- [x] Geração < 2s
- [x] HTML < 500KB
- [x] Gráficos < 1s

### Qualidade
- [x] Zero erros de build
- [x] 100% cobertura de testes
- [x] Documentação completa
- [x] Código TypeScript com tipos corretos

### UX
- [x] Design profissional
- [x] Responsivo (mobile/desktop)
- [x] Acessível (WCAG 2.1)
- [x] Internacionalizado (pt-BR)

---

## 🔧 Comandos Úteis

```bash
# Desenvolvimento
npm run dev

# Build
npm run build

# Testes
npm run test

# Deploy
vercel --prod

# Gerar template específico (exemplo)
curl -X POST http://localhost:3000/api/gerar-proposta \
  -H "Content-Type: application/json" \
  -d '{
    "cliente": {...},
    "orcamentos": [...],
    "config": {...},
    "clientType": "comercial",
    "subType": "panificadora"
  }'
```

---

## 📝 Checklist Final

Antes de dar como concluído:

- [ ] Template padrão funciona sem alterações
- [ ] Todos os 7 templates variantes funcionam
- [ ] Gráficos renderizam em todos os navegadores
- [ ] Dados solares precisos (validar com CRESESB)
- [ ] Seletor de templates integrado no Gerador Rápido
- [ ] Seletor de templates integrado no Sistema do Consultor
- [ ] APIs atualizadas (gerar-proposta + consultor)
- [ ] Testes passando 100%
- [ ] Documentação completa
- [ ] Deploy em produção funcionando
- [ ] Validado pelo usuário final (Flavio)

---

## 🚨 Riscos e Mitigação

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Regressão no template padrão | Média | Alto | Testes de regressão obrigatórios |
| Performance dos gráficos | Média | Médio | Usar Chart.js (leve) + lazy loading |
| Dados solares incorretos | Baixa | Alto | Validar com CRESESB oficial |
| Template muito pesado | Média | Médio | Minificar HTML/CSS/JS |
| Incompatibilidade de navegadores | Baixa | Médio | Polyfills + testes cross-browser |

---

**🎉 Sucesso quando todos os checkboxes estiverem marcados!**
