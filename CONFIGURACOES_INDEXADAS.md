# 📋 Configurações Indexadas - Sistema PIENG

## ✅ Status: Configurações Indexadas

As configurações do sistema agora estão **indexadas** e podem ser utilizadas em qualquer componente sem necessidade de valores hardcoded.

## 🎯 Como Usar

### Hook `useConfiguracoes()`

O hook `useConfiguracoes()` carrega automaticamente as configurações da API e disponibiliza helpers para acesso fácil:

```tsx
import { useConfiguracoes } from '@/hooks/useConfiguracoes';

function MeuComponente() {
  const { config, loading, getHSP, getPerformanceRate } = useConfiguracoes();

  if (loading) return <div>Carregando...</div>;

  // Ao invés de usar valores hardcoded:
  // ❌ const hsp = 5.21;
  // ✅ Use o hook:
  const hsp = getHSP('GO'); // ou config?.hspPadrao
  const performanceRate = getPerformanceRate();

  return <div>HSP: {hsp}, Performance: {performanceRate}</div>;
}
```

## 📚 Helpers Disponíveis

O hook fornece os seguintes helpers:

- `getHSP(estado?: string)` - Retorna HSP padrão ou do estado específico
- `getPerformanceRate()` - Retorna taxa de performance (padrão: 0.75)
- `getMargemSeguranca()` - Retorna margem de segurança (padrão: 1.1)
- `getEficienciaInversor()` - Retorna eficiência do inversor (padrão: 0.95)
- `getMarkup(tipo)` - Retorna markup por tipo ('economico' | 'standard' | 'premium')

## 🔄 Migração de Valores Hardcoded

### Antes (❌ Hardcoded):
```tsx
const hsp = 5.21;
const performanceRate = 0.75;
const margemSeguranca = 1.1;
```

### Depois (✅ Indexado):
```tsx
const { config, getHSP, getPerformanceRate, getMargemSeguranca } = useConfiguracoes();
const hsp = getHSP('GO');
const performanceRate = getPerformanceRate();
const margemSeguranca = getMargemSeguranca();
```

## 📍 Onde as Configurações são Salvas

As configurações são salvas em:
- **Produção**: Supabase (tabela `configuracoes`)
- **Desenvolvimento**: Arquivo local `src/data/sistema/configuracoes.json`
- **Fallback**: Valores padrão definidos em `src/utils/configuracoes.ts`

## 🎨 Interface de Configuração

Acesse a interface de configuração em:
**https://pieng-propostas.vercel.app/admin/configuracoes**

## 📝 Exemplo Completo

```tsx
import { useConfiguracoes } from '@/hooks/useConfiguracoes';

export default function CalculadoraSolar() {
  const { config, loading, getHSP, getPerformanceRate } = useConfiguracoes();

  if (loading) {
    return <div>Carregando configurações...</div>;
  }

  if (!config) {
    return <div>Erro ao carregar configurações</div>;
  }

  // Calcular potência usando configurações indexadas
  const calcularPotencia = (consumoMensal: number, estado: string) => {
    const hsp = getHSP(estado);
    const performanceRate = getPerformanceRate();
    const margemSeguranca = config.margemSeguranca;
    
    return (consumoMensal * margemSeguranca) / (hsp * 30 * performanceRate);
  };

  return (
    <div>
      <h2>Calculadora Solar</h2>
      <p>HSP Padrão: {config.hspPadrao}</p>
      <p>Performance Rate: {config.performanceRate}</p>
      <p>Potência necessária: {calcularPotencia(2500, 'GO').toFixed(2)} kWp</p>
    </div>
  );
}
```

## ⚠️ Importante

- **Nunca use valores hardcoded** quando as configurações estão disponíveis
- **Sempre use o hook** `useConfiguracoes()` em componentes React
- **Use `carregarConfiguracoes()`** em funções server-side ou APIs
- **Valores padrão** são usados apenas como fallback quando a API falha

## 🔗 Arquivos Relacionados

- `src/hooks/useConfiguracoes.ts` - Hook React para componentes
- `src/utils/configuracoes.ts` - Funções utilitárias e tipos
- `src/pages/admin/configuracoes.tsx` - Interface de configuração
- `src/pages/api/admin/config.ts` - API de configurações

