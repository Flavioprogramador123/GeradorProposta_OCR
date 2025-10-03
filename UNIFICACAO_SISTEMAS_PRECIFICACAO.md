# 🔄 Unificação dos Sistemas de Precificação PIENG

## 📊 Análise Comparativa: Sistema Antigo vs Gerador Rápido

### **🔴 SISTEMA ANTIGO (/admin)**

**Método de Cálculo:** MARGEM (Markup)

```typescript
// Sistema Antigo - configuracoes.tsx
markupEconomico: 1.8   // 80% markup
markupStandard: 2.0    // 100% markup
markupPremium: 2.3     // 130% markup

// Cálculo Antigo:
PreçoVenda = PreçoCusto × Markup
```

**Problemas Identificados:**
- ❌ **Não é isonômico**: Mesma margem percentual gera lucro diferente por kWp
- ❌ **Inconsistente**: Sistemas pequenos têm margem real maior que grandes
- ❌ **Difícil ajustar**: Markup fixo não considera despesas reais
- ❌ **Pouca flexibilidade**: Não permite simulações finas de preço
- ❌ **Opaco para consultor**: Não fica claro quanto vai de despesa e quanto de lucro

### **✅ GERADOR RÁPIDO (Sistema Novo)**

**Método de Cálculo:** DESPESAS FIXAS + VARIÁVEIS

```typescript
// Gerador Rápido - gerador-rapido.tsx
pdespesaFixo: 6500              // R$ 6.500,00 fixo por sistema
pdespesaVariavel: 78            // 78% sobre P.Custo

// Cálculo Novo:
Despesas = pdespesaFixo + (pCusto × pdespesaVariavel / 100)
PreçoPIX = pCusto + Despesas
```

**Vantagens:**
- ✅ **Isonômico**: Mesma despesa fixa + variável proporcional
- ✅ **Transparente**: Consultor vê exatamente quanto vai de despesa
- ✅ **Flexível**: Ajustar fixo/variável para simular cenários
- ✅ **Justo**: Sistemas pequenos não são superfaturados
- ✅ **Estratégico**: Permite análise de competitividade

---

## 🎯 PROPOSTA DE UNIFICAÇÃO

### **Opção 1: Migração Total (Recomendado)**

**Substituir sistema de Markup pelo sistema de Despesas**

**Implementação:**

```typescript
// src/pages/admin/configuracoes.tsx - NOVO
interface ConfiguracaoSistema {
  // ❌ REMOVER (Antigo - Markup)
  // markupEconomico: number;
  // markupStandard: number;
  // markupPremium: number;

  // ✅ ADICIONAR (Novo - Despesas)
  despesaFixa: number;              // R$ valor fixo por sistema
  despesaVariavelPercent: number;   // % sobre P.Custo

  // Parcelamento (mantém igual)
  taxaCartao12x: number;
  taxaCartao18x: number;
  descontoPix: number;
  fatorAvista: number;
  fatorParcelado: number;
  fator12x: number;
  fator18x: number;

  // ✅ NOVO: Simulador de Cenários
  cenarios: {
    economico: { fixo: number; variavel: number };
    standard: { fixo: number; variavel: number };
    premium: { fixo: number; variavel: number };
  };
}

const configPadrao: ConfiguracaoSistema = {
  // Novo Sistema de Despesas
  despesaFixa: 6500,           // R$ 6.500 fixo
  despesaVariavelPercent: 78,  // 78% sobre P.Custo

  // Parcelamento (mantém)
  taxaCartao12x: 12.0,
  taxaCartao18x: 17.0,
  descontoPix: 10.0,
  fatorAvista: 0.9,
  fatorParcelado: 1.20,
  fator12x: 0.88,
  fator18x: 0.83,

  // Cenários Pré-configurados
  cenarios: {
    economico: { fixo: 5000, variavel: 70 },  // Mais agressivo
    standard: { fixo: 6500, variavel: 78 },    // Balanceado
    premium: { fixo: 8000, variavel: 85 }      // Maior margem
  }
};
```

---

### **Função de Cálculo Unificada:**

```typescript
// src/lib/calculadorPrecos.ts (CRIAR NOVO ARQUIVO)

export interface ParametrosCalculo {
  pCusto: number;                  // Preço de custo total
  despesaFixa: number;             // Despesa fixa (R$)
  despesaVariavelPercent: number;  // Despesa variável (%)
  descontoPix: number;             // Desconto PIX (decimal 0.1 = 10%)
  taxaCartao12x: number;           // Taxa cartão 12x (decimal 0.12 = 12%)
  taxaCartao18x: number;           // Taxa cartão 18x (decimal 0.17 = 17%)
  fatorParcelado: number;          // Markup parcelado (1.20 = 20%)
}

export interface ResultadoCalculo {
  pCusto: number;
  despesas: number;
  despesaFixa: number;
  despesaVariavel: number;
  totalBase: number;      // P.Custo + Despesas
  ppix: number;           // Preço PIX
  pavista: number;        // Preço à vista
  priscado: number;       // Preço riscado (com markup)
  p12x: number;           // Parcela 12x
  p12x_total: number;     // Total 12x
  p18x_parcela: number;   // Parcela 18x
  p18x_total: number;     // Total 18x

  // Métricas de análise
  margemBruta: number;    // Despesas / Total (%)
  margemSobreCusto: number; // Despesas / P.Custo (%)
  precoKwp: number;       // PIX / potência kWp
}

export function calcularPrecos(params: ParametrosCalculo, potenciaKwp?: number): ResultadoCalculo {
  const { pCusto, despesaFixa, despesaVariavelPercent, descontoPix, taxaCartao12x, taxaCartao18x, fatorParcelado } = params;

  // 1. Calcular Despesas
  const despesaVariavel = pCusto * (despesaVariavelPercent / 100);
  const despesas = despesaFixa + despesaVariavel;

  // 2. Preço PIX (Base)
  const ppix = pCusto + despesas;

  // 3. Preços Parcelados
  const fator12x = 1 - (taxaCartao12x / 100);
  const fator18x = 1 - (taxaCartao18x / 100);

  const p12x_total = ppix / fator12x;
  const p12x = p12x_total / 12;

  const p18x_total = ppix / fator18x;
  const p18x_parcela = p18x_total / 18;

  // 4. Preço À Vista (com desconto PIX reverso)
  const descontoPix_decimal = descontoPix > 1 ? descontoPix / 100 : descontoPix;
  const pavista = ppix / (1 - descontoPix_decimal);

  // 5. Preço Riscado (com markup)
  const priscado = ppix * fatorParcelado;

  // 6. Métricas de Análise
  const margemBruta = (despesas / ppix) * 100;
  const margemSobreCusto = (despesas / pCusto) * 100;
  const precoKwp = potenciaKwp ? ppix / potenciaKwp : 0;

  return {
    pCusto,
    despesas,
    despesaFixa,
    despesaVariavel,
    totalBase: ppix,
    ppix,
    pavista,
    priscado,
    p12x,
    p12x_total,
    p18x_parcela,
    p18x_total,
    margemBruta,
    margemSobreCusto,
    precoKwp
  };
}
```

---

### **Interface de Configuração Melhorada:**

```tsx
// src/pages/admin/configuracoes.tsx - ATUALIZADO

export default function Configuracoes() {
  const [config, setConfig] = useState<ConfiguracaoSistema>(configPadrao);
  const [cenarioAtivo, setCenarioAtivo] = useState<'economico' | 'standard' | 'premium'>('standard');
  const [simulacao, setSimulacao] = useState({
    pCusto: 15000,
    potenciaKwp: 7.5
  });

  // Calcular resultado da simulação
  const resultadoSimulacao = calcularPrecos({
    pCusto: simulacao.pCusto,
    despesaFixa: config.despesaFixa,
    despesaVariavelPercent: config.despesaVariavelPercent,
    descontoPix: config.descontoPix,
    taxaCartao12x: config.taxaCartao12x,
    taxaCartao18x: config.taxaCartao18x,
    fatorParcelado: config.fatorParcelado
  }, simulacao.potenciaKwp);

  const aplicarCenario = (cenario: 'economico' | 'standard' | 'premium') => {
    const { fixo, variavel } = config.cenarios[cenario];
    setConfig(prev => ({
      ...prev,
      despesaFixa: fixo,
      despesaVariavelPercent: variavel
    }));
    setCenarioAtivo(cenario);
  };

  return (
    <div className="container">
      {/* Abas */}
      <div className="tabs">
        <button onClick={() => setActiveTab('precificacao')}>💰 Precificação</button>
        <button onClick={() => setActiveTab('cenarios')}>📊 Cenários</button>
        <button onClick={() => setActiveTab('tecnico')}>⚙️ Técnico</button>
        <button onClick={() => setActiveTab('marketing')}>📢 Marketing</button>
      </div>

      {/* Aba: Precificação */}
      {activeTab === 'precificacao' && (
        <div className="tab-content">
          <h2>💰 Sistema de Precificação (Despesas Fixas + Variáveis)</h2>

          {/* Despesas */}
          <div className="section">
            <h3>🔧 Despesas do Sistema</h3>
            <div className="form-group">
              <label>Despesa Fixa (R$):</label>
              <input
                type="number"
                value={config.despesaFixa}
                onChange={(e) => handleInputChange('despesaFixa', parseFloat(e.target.value))}
              />
              <small>Valor fixo por sistema (instalação, logística, marketing, etc.)</small>
            </div>

            <div className="form-group">
              <label>Despesa Variável (%):</label>
              <input
                type="number"
                step="0.1"
                value={config.despesaVariavelPercent}
                onChange={(e) => handleInputChange('despesaVariavelPercent', parseFloat(e.target.value))}
              />
              <small>Percentual sobre P.Custo (impostos, comissões, etc.)</small>
            </div>
          </div>

          {/* Simulador em Tempo Real */}
          <div className="section simulator">
            <h3>🧪 Simulador de Preços</h3>
            <div className="simulator-inputs">
              <div className="form-group">
                <label>P.Custo (R$):</label>
                <input
                  type="number"
                  value={simulacao.pCusto}
                  onChange={(e) => setSimulacao(prev => ({ ...prev, pCusto: parseFloat(e.target.value) }))}
                />
              </div>

              <div className="form-group">
                <label>Potência (kWp):</label>
                <input
                  type="number"
                  step="0.01"
                  value={simulacao.potenciaKwp}
                  onChange={(e) => setSimulacao(prev => ({ ...prev, potenciaKwp: parseFloat(e.target.value) }))}
                />
              </div>
            </div>

            {/* Resultados da Simulação */}
            <div className="results">
              <div className="result-card">
                <span>P.Custo:</span>
                <strong>{formatCurrency(resultadoSimulacao.pCusto)}</strong>
              </div>

              <div className="result-card">
                <span>Despesas:</span>
                <strong className="highlight">{formatCurrency(resultadoSimulacao.despesas)}</strong>
                <small>
                  Fixo: {formatCurrency(resultadoSimulacao.despesaFixa)} +
                  Variável: {formatCurrency(resultadoSimulacao.despesaVariavel)}
                </small>
              </div>

              <div className="result-card primary">
                <span>💰 PIX:</span>
                <strong>{formatCurrency(resultadoSimulacao.ppix)}</strong>
              </div>

              <div className="result-card">
                <span>À Vista:</span>
                <strong>{formatCurrency(resultadoSimulacao.pavista)}</strong>
              </div>

              <div className="result-card">
                <span>12x de:</span>
                <strong>{formatCurrency(resultadoSimulacao.p12x)}</strong>
                <small>Total: {formatCurrency(resultadoSimulacao.p12x_total)}</small>
              </div>

              <div className="result-card">
                <span>18x de:</span>
                <strong>{formatCurrency(resultadoSimulacao.p18x_parcela)}</strong>
                <small>Total: {formatCurrency(resultadoSimulacao.p18x_total)}</small>
              </div>

              <div className="result-card info">
                <span>Margem Bruta:</span>
                <strong>{resultadoSimulacao.margemBruta.toFixed(2)}%</strong>
              </div>

              <div className="result-card info">
                <span>Preço / kWp:</span>
                <strong>{formatCurrency(resultadoSimulacao.precoKwp)}</strong>
              </div>
            </div>
          </div>

          {/* Taxas de Cartão */}
          <div className="section">
            <h3>💳 Taxas de Cartão</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Taxa Cartão 12x (%):</label>
                <input
                  type="number"
                  step="0.1"
                  value={config.taxaCartao12x}
                  onChange={(e) => handleInputChange('taxaCartao12x', parseFloat(e.target.value))}
                />
              </div>

              <div className="form-group">
                <label>Taxa Cartão 18x (%):</label>
                <input
                  type="number"
                  step="0.1"
                  value={config.taxaCartao18x}
                  onChange={(e) => handleInputChange('taxaCartao18x', parseFloat(e.target.value))}
                />
              </div>

              <div className="form-group">
                <label>Desconto PIX (%):</label>
                <input
                  type="number"
                  step="0.1"
                  value={config.descontoPix}
                  onChange={(e) => handleInputChange('descontoPix', parseFloat(e.target.value))}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Aba: Cenários Pré-configurados */}
      {activeTab === 'cenarios' && (
        <div className="tab-content">
          <h2>📊 Cenários de Precificação</h2>

          <div className="cenarios-grid">
            <div className={`cenario-card ${cenarioAtivo === 'economico' ? 'active' : ''}`}>
              <h3>💚 Econômico</h3>
              <p>Estratégia agressiva para volume</p>
              <div className="cenario-details">
                <span>Fixo: {formatCurrency(config.cenarios.economico.fixo)}</span>
                <span>Variável: {config.cenarios.economico.variavel}%</span>
              </div>
              <button onClick={() => aplicarCenario('economico')}>Aplicar</button>
            </div>

            <div className={`cenario-card ${cenarioAtivo === 'standard' ? 'active' : ''}`}>
              <h3>🔵 Standard</h3>
              <p>Balanceado - Recomendado</p>
              <div className="cenario-details">
                <span>Fixo: {formatCurrency(config.cenarios.standard.fixo)}</span>
                <span>Variável: {config.cenarios.standard.variavel}%</span>
              </div>
              <button onClick={() => aplicarCenario('standard')}>Aplicar</button>
            </div>

            <div className={`cenario-card ${cenarioAtivo === 'premium' ? 'active' : ''}`}>
              <h3>⭐ Premium</h3>
              <p>Maior margem - Projetos especiais</p>
              <div className="cenario-details">
                <span>Fixo: {formatCurrency(config.cenarios.premium.fixo)}</span>
                <span>Variável: {config.cenarios.premium.variavel}%</span>
              </div>
              <button onClick={() => aplicarCenario('premium')}>Aplicar</button>
            </div>
          </div>

          {/* Editor de Cenários */}
          <div className="section">
            <h3>✏️ Editar Cenários</h3>
            <div className="cenarios-edit">
              {Object.entries(config.cenarios).map(([nome, valores]) => (
                <div key={nome} className="cenario-edit-row">
                  <h4>{nome.charAt(0).toUpperCase() + nome.slice(1)}</h4>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Fixo (R$):</label>
                      <input
                        type="number"
                        value={valores.fixo}
                        onChange={(e) => {
                          setConfig(prev => ({
                            ...prev,
                            cenarios: {
                              ...prev.cenarios,
                              [nome]: { ...prev.cenarios[nome as keyof typeof prev.cenarios], fixo: parseFloat(e.target.value) }
                            }
                          }));
                        }}
                      />
                    </div>

                    <div className="form-group">
                      <label>Variável (%):</label>
                      <input
                        type="number"
                        step="0.1"
                        value={valores.variavel}
                        onChange={(e) => {
                          setConfig(prev => ({
                            ...prev,
                            cenarios: {
                              ...prev.cenarios,
                              [nome]: { ...prev.cenarios[nome as keyof typeof prev.cenarios], variavel: parseFloat(e.target.value) }
                            }
                          }));
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Botão Salvar */}
      <div className="actions">
        <button onClick={handleSave} disabled={loading} className="btn-primary">
          {loading ? 'Salvando...' : '💾 Salvar Configurações'}
        </button>
      </div>
    </div>
  );
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}
```

---

## 📋 CHECKLIST DE IMPLEMENTAÇÃO

### **Fase 1: Backend (API)**
- [ ] Criar `src/lib/calculadorPrecos.ts` com função unificada
- [ ] Atualizar `src/pages/api/admin/config.ts` para suportar novo schema
- [ ] Criar migração de dados (converter markup → despesas)
- [ ] Testar API com dados reais

### **Fase 2: Frontend (Admin)**
- [ ] Atualizar `src/pages/admin/configuracoes.tsx` com nova interface
- [ ] Adicionar simulador de preços em tempo real
- [ ] Criar componente de cenários pré-configurados
- [ ] Atualizar `src/pages/admin/orcamentos/[clienteId]/manual.tsx` para usar novo cálculo

### **Fase 3: Integração Gerador Rápido**
- [ ] Unificar `gerador-rapido.tsx` para usar `calculadorPrecos.ts`
- [ ] Remover código duplicado de cálculo
- [ ] Garantir compatibilidade com propostas existentes

### **Fase 4: Testes**
- [ ] Testar com múltiplos cenários (econômico, standard, premium)
- [ ] Validar cálculos com planilha Excel
- [ ] Verificar retrocompatibilidade com propostas antigas
- [ ] Testar simulador em tempo real

### **Fase 5: Deploy**
- [ ] Backup completo do sistema antes de atualizar
- [ ] Deploy em ambiente de staging
- [ ] Validação final com equipe comercial
- [ ] Deploy em produção
- [ ] Documentar novo sistema no CLAUDE.md

---

## 🎯 BENEFÍCIOS DA UNIFICAÇÃO

| Aspecto | Antes (Markup) | Depois (Despesas) |
|---------|----------------|-------------------|
| **Transparência** | ❌ Opaco | ✅ Clara separação custo/despesa |
| **Isonomia** | ❌ Inconsistente | ✅ Justa para todos os tamanhos |
| **Flexibilidade** | ❌ Limitada | ✅ Cenários ajustáveis |
| **Análise** | ❌ Difícil simular | ✅ Simulador em tempo real |
| **Competitividade** | ❌ Difícil ajustar | ✅ Fácil adaptar ao mercado |
| **Educação** | ❌ Cliente não entende | ✅ Justificativa clara de preço |

---

## 🚀 PRÓXIMOS PASSOS

1. **Validar proposta** com equipe comercial
2. **Implementar Fase 1** (Backend + Calculadora)
3. **Implementar Fase 2** (Interface Admin)
4. **Treinar equipe** no novo sistema
5. **Migrar gradualmente** projetos existentes

---

**Documentado em:** 01/10/2025
**Autor:** Sistema PIENG + Claude AI
**Status:** 📝 Proposta aguardando aprovação
