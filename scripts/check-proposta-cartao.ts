/**
 * Gera uma proposta real via API local e confere a tabela de cartão no HTML.
 * Uso: npx tsx scripts/check-proposta-cartao.ts [baseUrl]
 */
const BASE = process.argv[2] || 'http://localhost:3010';

async function main() {
  const body = {
    cliente: {
      nome: 'Cliente Teste Cartao',
      cidade: 'Goiânia',
      consumo_mensal: 900,
      tipo: 'Residencial',
      hsp_local: 5.45,
      tarifa_kwh: 0.982,
    },
    orcamentos: [
      {
        nome: 'Kit 10,88 kWp',
        distribuidora: 'BelEnergy',
        modulos: 18,
        pot_modulo: 605,
        marca_modulo: 'JA Solar',
        inversores: 1,
        pot_inv: 10,
        marca_inversor: 'Growatt',
        pcusto: 20000,
        pdespesa_total: 5000,
        total_final: 25000,
      },
    ],
    config: {
      hsp: 5.45,
      tarifa: 0.982,
      performanceRate: 0.78,
      fatorParcelado: 1.2,
      pdespesaFixo: 3000,
      pdespesaVariavel: 22,
      consumoMensal: 900,
    },
    template: 'padrao',
  };

  const res = await fetch(`${BASE}/api/gerar-proposta`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json: any = await res.json();
  console.log('status:', res.status);
  console.log('chaves da resposta:', Object.keys(json).join(', '));
  console.log('slug:', json.slug || json.proposta?.slug);
  if (!res.ok) {
    console.log(JSON.stringify(json, null, 2).slice(0, 1200));
    return;
  }
  console.log('preview:', JSON.stringify(json).slice(0, 0));

  const html: string = json.htmlContent || '';
  const modais = (html.match(/pieng-pay-modal/g) || []).length;
  console.log('html do modal:', modais > 0 ? 'presente' : 'AUSENTE');
  const mult = html.match(/var MULT = (\{[^}]*\})/);
  if (mult) {
    const tabela = JSON.parse(mult[1]);
    console.log('multiplicadores no modal:', JSON.stringify(tabela));
    console.log('parcelas:', Object.keys(tabela).join(', '));
  }
  const opcoes = html.match(/var OPCOES = (\[[^\]]*\])/);
  if (opcoes) console.log('opções do seletor:', opcoes[1]);
  const pix = html.match(/R\$\s*([\d.]+,\d{2})/g);
  console.log('primeiros valores no HTML:', (pix || []).slice(0, 12).join(' | '));
  console.log('21x citado no HTML:', /21×/.test(html));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
