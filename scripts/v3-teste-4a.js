/**
 * Smoke teste 4a — dimensionamento + auditoria.
 * Uso: npx tsx scripts/v3-teste-4a.js
 */
const { montarPropostaAuto } = require('../src/modules/v3/calc/propostaAuto.ts');

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const r = montarPropostaAuto({
  modo: 'consumo_mensal',
  consumo_mensal_kwh: 500,
  cdId: 3,
  hsp: 5.21,
  tarifa: 1.17,
  cliente_nome: 'Teste 4a',
});

assert(r.alvoKwp > 0, 'alvoKwp');
assert(r.alvoGeracao === 500, 'alvoGeracao');
assert(Array.isArray(r.auditoria_alvo) && r.auditoria_alvo.length >= 2, 'auditoria_alvo');
assert(r.alternativas.length >= 1, 'alternativas');

for (const a of r.alternativas) {
  assert(a.auditoria?.passos?.length >= 5, `passos ${a.titulo}`);
  assert(a.orcamento_itens?.length >= 2, `itens ${a.titulo}`);
  assert(a.custo_total > 0, `custo ${a.titulo}`);
  assert(a.precos?.pix > 0, `pix simplificado ${a.titulo}`);
}

console.log('✅ 4a OK', {
  alvoKwp: r.alvoKwp,
  alts: r.alternativas.map((a) => ({
    titulo: a.titulo,
    kwp: a.potencia_kwp,
    geracao: a.geracao_mensal_kwh,
    custo: a.custo_total,
    pix_simp: a.precos.pix,
    passos: a.auditoria.passos.length,
    itens: a.orcamento_itens.length,
  })),
});
