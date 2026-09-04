/**
 * Smoke teste 5a — pdespesa comercial = Gerador + payload bridge.
 * Uso: npx tsx scripts/v3-teste-5a.js
 */
const { montarPropostaAuto } = require('../src/modules/v3/calc/propostaAuto.ts');
const { precificarComercialV2 } = require('../src/modules/v3/bridge/comercial.ts');
const { buildGeradorBridgePayload } = require('../src/modules/v3/bridge/toGerador.ts');

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const FIXO = 3000;
const VAR = 22;

const r = montarPropostaAuto({
  modo: 'consumo_mensal',
  consumo_mensal_kwh: 500,
  cdId: 3,
  hsp: 5.21,
  tarifa: 1.17,
  cliente_nome: 'Teste 5a',
  comercial: { pdespesaFixo: FIXO, pdespesaVariavel: VAR },
});

assert(r.alternativas.length >= 1, 'alternativas');
assert(r.gerador_payload?.orcamentos?.length === r.alternativas.length, 'payload count');
assert(r.gerador_payload.pdespesa.pdespesaFixo === FIXO, 'payload fixo');
assert(r.gerador_payload.pdespesa.pdespesaVariavel === VAR, 'payload var');

for (const a of r.alternativas) {
  assert(a.comercial, `comercial ${a.titulo}`);
  const expectedPdespesa = FIXO + a.custo_total * (VAR / 100);
  const expectedPix = Math.round((a.custo_total + expectedPdespesa) * 100) / 100;
  assert(
    Math.abs(a.comercial.pdespesa_total - expectedPdespesa) < 0.02,
    `pdespesa ${a.titulo}: ${a.comercial.pdespesa_total} vs ${expectedPdespesa}`
  );
  assert(
    Math.abs(a.comercial.ppix - expectedPix) < 0.02,
    `PIX ${a.titulo}: ${a.comercial.ppix} vs ${expectedPix}`
  );

  // Mesma função isolada
  const solo = precificarComercialV2(a.custo_total, { pdespesaFixo: FIXO, pdespesaVariavel: VAR }, 0);
  assert(Math.abs(solo.ppix - a.comercial.ppix) < 0.01, `solo vs alt ${a.titulo}`);

  // pcusto no payload = custo kit
  const orc = r.gerador_payload.orcamentos.find((o) => o.titulo_v3 === a.titulo);
  assert(orc, `orc payload ${a.titulo}`);
  assert(Math.abs(orc.precoCusto - a.custo_total) < 0.01, `pcusto bridge ${a.titulo}`);

  // Simula fórmula do Gerador ao Calcular
  const pdespesaGerador = FIXO + orc.precoCusto * (VAR / 100);
  const pixGerador = Math.round((orc.precoCusto + pdespesaGerador) * 100) / 100;
  assert(
    Math.abs(pixGerador - a.comercial.ppix) < 0.02,
    `PIX Gerador=${pixGerador} vs comercial=${a.comercial.ppix} (${a.titulo})`
  );
}

// rebuild payload helper
const rebuilt = buildGeradorBridgePayload({
  cliente_nome: 'Teste 5a',
  consumo_mensal_kwh: 500,
  hsp: 5.21,
  tarifa: 1.17,
  pdespesaFixo: FIXO,
  pdespesaVariavel: VAR,
  alternativas: r.alternativas,
});
assert(rebuilt.quantidadeTotal === r.alternativas.length, 'rebuild');

console.log('✅ 5a OK', {
  pdespesa: `R$ ${FIXO} + ${VAR}%`,
  alts: r.alternativas.map((a) => ({
    titulo: a.titulo,
    pcusto: a.comercial.pcusto,
    pdespesa: a.comercial.pdespesa_total,
    pix: a.comercial.ppix,
    legado4a: a.precos.pix,
  })),
  bridge_origem: r.gerador_payload.origem,
});
