/**
 * 🧪 Teste da Calculadora Unificada de Preços
 * Valida os cálculos do novo sistema Despesas Fixas + Variáveis
 */

// Simulação das funções TypeScript em JavaScript puro
function calcularPrecos(params, potenciaKwp) {
  const {
    pCusto,
    despesaFixa,
    despesaVariavelPercent,
    descontoPix,
    taxaCartao12x,
    taxaCartao18x,
    fatorParcelado = 1.20
  } = params;

  // 1. Converter percentuais para decimais
  const descontoPix_decimal = descontoPix > 1 ? descontoPix / 100 : descontoPix;
  const taxaCartao12x_decimal = taxaCartao12x > 1 ? taxaCartao12x / 100 : taxaCartao12x;
  const taxaCartao18x_decimal = taxaCartao18x > 1 ? taxaCartao18x / 100 : taxaCartao18x;

  // 2. Calcular Despesas
  const despesaVariavel = pCusto * (despesaVariavelPercent / 100);
  const despesas = despesaFixa + despesaVariavel;

  // 3. Preço PIX
  const ppix = pCusto + despesas;

  // 4. Fatores
  const fator12x = 1 - taxaCartao12x_decimal;
  const fator18x = 1 - taxaCartao18x_decimal;

  // 5. Preços Parcelados
  const p12x_total = ppix / fator12x;
  const p12x = p12x_total / 12;

  const p18x_total = ppix / fator18x;
  const p18x_parcela = p18x_total / 18;

  // 6. Preço À Vista
  const pavista = ppix / (1 - descontoPix_decimal);

  // 7. Preço Riscado
  const priscado = ppix * fatorParcelado;

  // 8. Métricas
  const margemBruta = (despesas / ppix) * 100;
  const margemSobreCusto = (despesas / pCusto) * 100;
  const precoKwp = potenciaKwp && potenciaKwp > 0 ? ppix / potenciaKwp : 0;

  return {
    pCusto: Math.round(pCusto * 100) / 100,
    despesas: Math.round(despesas * 100) / 100,
    despesaFixa: Math.round(despesaFixa * 100) / 100,
    despesaVariavel: Math.round(despesaVariavel * 100) / 100,
    totalBase: Math.round(ppix * 100) / 100,
    ppix: Math.round(ppix * 100) / 100,
    pavista: Math.round(pavista * 100) / 100,
    priscado: Math.round(priscado * 100) / 100,
    p12x: Math.round(p12x * 100) / 100,
    p12x_total: Math.round(p12x_total * 100) / 100,
    p18x_parcela: Math.round(p18x_parcela * 100) / 100,
    p18x_total: Math.round(p18x_total * 100) / 100,
    margemBruta: Math.round(margemBruta * 100) / 100,
    margemSobreCusto: Math.round(margemSobreCusto * 100) / 100,
    precoKwp: Math.round(precoKwp * 100) / 100,
    fator12x,
    fator18x,
    fatorDescontoPix: descontoPix_decimal
  };
}

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

// Cenários de Teste
const CENARIOS = {
  economico: {
    despesaFixa: 5000,
    despesaVariavelPercent: 70,
    nome: '💚 Econômico',
    descricao: 'Estratégia agressiva para volume'
  },
  standard: {
    despesaFixa: 6500,
    despesaVariavelPercent: 78,
    nome: '🔵 Standard',
    descricao: 'Balanceado - Recomendado'
  },
  premium: {
    despesaFixa: 8000,
    despesaVariavelPercent: 85,
    nome: '⭐ Premium',
    descricao: 'Maior margem - Projetos especiais'
  }
};

// Casos de Teste
const CASOS_TESTE = [
  {
    nome: 'Sistema Pequeno (3kWp)',
    pCusto: 8000,
    potenciaKwp: 3.0
  },
  {
    nome: 'Sistema Médio (7kWp)',
    pCusto: 15000,
    potenciaKwp: 7.0
  },
  {
    nome: 'Sistema Grande (12kWp)',
    pCusto: 25000,
    potenciaKwp: 12.0
  }
];

console.log('\n🧪 TESTE DA CALCULADORA UNIFICADA DE PREÇOS\n');
console.log('═'.repeat(80));

// Testar cada caso com cada cenário
CASOS_TESTE.forEach((caso, casoIndex) => {
  console.log(`\n\n📊 CASO ${casoIndex + 1}: ${caso.nome}`);
  console.log('─'.repeat(80));
  console.log(`P.Custo: ${formatCurrency(caso.pCusto)} | Potência: ${caso.potenciaKwp} kWp\n`);

  Object.entries(CENARIOS).forEach(([chaveCenario, cenario]) => {
    console.log(`\n${cenario.nome} - ${cenario.descricao}`);
    console.log('─'.repeat(80));

    const params = {
      pCusto: caso.pCusto,
      despesaFixa: cenario.despesaFixa,
      despesaVariavelPercent: cenario.despesaVariavelPercent,
      descontoPix: 10,      // 10%
      taxaCartao12x: 12,    // 12%
      taxaCartao18x: 17,    // 17%
      fatorParcelado: 1.20  // 20% markup
    };

    const resultado = calcularPrecos(params, caso.potenciaKwp);

    console.log(`\n📋 Composição de Preço:`);
    console.log(`   P.Custo:              ${formatCurrency(resultado.pCusto)}`);
    console.log(`   + Despesa Fixa:       ${formatCurrency(resultado.despesaFixa)}`);
    console.log(`   + Despesa Variável:   ${formatCurrency(resultado.despesaVariavel)} (${cenario.despesaVariavelPercent}%)`);
    console.log(`   ─────────────────────────────`);
    console.log(`   = TOTAL (PIX):        ${formatCurrency(resultado.ppix)}`);

    console.log(`\n💰 Preços Finais:`);
    console.log(`   PIX:                  ${formatCurrency(resultado.ppix)}`);
    console.log(`   À Vista:              ${formatCurrency(resultado.pavista)}`);
    console.log(`   Riscado:              ${formatCurrency(resultado.priscado)}`);
    console.log(`   12x de:               ${formatCurrency(resultado.p12x)} (Total: ${formatCurrency(resultado.p12x_total)})`);
    console.log(`   18x de:               ${formatCurrency(resultado.p18x_parcela)} (Total: ${formatCurrency(resultado.p18x_total)})`);

    console.log(`\n📊 Métricas:`);
    console.log(`   Margem Bruta:         ${resultado.margemBruta.toFixed(2)}%`);
    console.log(`   Margem s/ Custo:      ${resultado.margemSobreCusto.toFixed(2)}%`);
    console.log(`   Preço / kWp:          ${formatCurrency(resultado.precoKwp)}`);
  });
});

// Teste de Isonomia (Comparar R$/kWp entre tamanhos)
console.log('\n\n\n🔍 TESTE DE ISONOMIA (Preço / kWp por Tamanho)');
console.log('═'.repeat(80));
console.log('Objetivo: Verificar se o preço por kWp é justo entre tamanhos diferentes\n');

Object.entries(CENARIOS).forEach(([chaveCenario, cenario]) => {
  console.log(`\n${cenario.nome}`);
  console.log('─'.repeat(80));

  const resultados = CASOS_TESTE.map(caso => {
    const params = {
      pCusto: caso.pCusto,
      despesaFixa: cenario.despesaFixa,
      despesaVariavelPercent: cenario.despesaVariavelPercent,
      descontoPix: 10,
      taxaCartao12x: 12,
      taxaCartao18x: 17
    };

    const resultado = calcularPrecos(params, caso.potenciaKwp);
    return {
      nome: caso.nome,
      potenciaKwp: caso.potenciaKwp,
      ppix: resultado.ppix,
      precoKwp: resultado.precoKwp,
      margemBruta: resultado.margemBruta
    };
  });

  resultados.forEach(r => {
    console.log(`   ${r.nome.padEnd(30)} | ${formatCurrency(r.precoKwp)}/kWp | Margem: ${r.margemBruta.toFixed(2)}%`);
  });

  const precoKwpMin = Math.min(...resultados.map(r => r.precoKwp));
  const precoKwpMax = Math.max(...resultados.map(r => r.precoKwp));
  const variacao = ((precoKwpMax - precoKwpMin) / precoKwpMin) * 100;

  console.log(`\n   ✅ Variação de Preço/kWp: ${variacao.toFixed(2)}%`);

  if (variacao < 15) {
    console.log(`   ✅ APROVADO: Sistema é ISONÔMICO (variação < 15%)`);
  } else {
    console.log(`   ⚠️  ATENÇÃO: Variação alta pode indicar falta de isonomia`);
  }
});

// Comparação com Sistema Antigo (Markup)
console.log('\n\n\n🔄 COMPARAÇÃO: Sistema Novo vs Sistema Antigo (Markup)');
console.log('═'.repeat(80));

const casoComparacao = {
  pCusto: 15000,
  potenciaKwp: 7.0
};

console.log(`\nCaso: P.Custo ${formatCurrency(casoComparacao.pCusto)} | ${casoComparacao.potenciaKwp} kWp\n`);

// Sistema Antigo (Markup)
const markupStandard = 2.0; // 100% markup
const pixAntigo = casoComparacao.pCusto * markupStandard;

console.log(`❌ Sistema Antigo (Markup):`);
console.log(`   P.Custo × Markup (2.0):   ${formatCurrency(casoComparacao.pCusto)} × 2.0 = ${formatCurrency(pixAntigo)}`);
console.log(`   Preço / kWp:              ${formatCurrency(pixAntigo / casoComparacao.potenciaKwp)}`);

// Sistema Novo (Despesas)
const paramsNovo = {
  pCusto: casoComparacao.pCusto,
  despesaFixa: 6500,
  despesaVariavelPercent: 78,
  descontoPix: 10,
  taxaCartao12x: 12,
  taxaCartao18x: 17
};

const resultadoNovo = calcularPrecos(paramsNovo, casoComparacao.potenciaKwp);

console.log(`\n✅ Sistema Novo (Despesas Fixas + Variáveis):`);
console.log(`   P.Custo + Despesas:       ${formatCurrency(resultadoNovo.pCusto)} + ${formatCurrency(resultadoNovo.despesas)} = ${formatCurrency(resultadoNovo.ppix)}`);
console.log(`   Preço / kWp:              ${formatCurrency(resultadoNovo.precoKwp)}`);
console.log(`   Margem Bruta:             ${resultadoNovo.margemBruta.toFixed(2)}%`);

console.log(`\n📊 Diferença:`);
const diferenca = resultadoNovo.ppix - pixAntigo;
const diferencaPercent = (diferenca / pixAntigo) * 100;

if (diferenca > 0) {
  console.log(`   Sistema Novo é ${formatCurrency(Math.abs(diferenca))} mais caro (+${diferencaPercent.toFixed(2)}%)`);
} else {
  console.log(`   Sistema Novo é ${formatCurrency(Math.abs(diferenca))} mais barato (${diferencaPercent.toFixed(2)}%)`);
}

console.log(`\n\n✅ TESTES CONCLUÍDOS!\n`);
console.log('═'.repeat(80));
