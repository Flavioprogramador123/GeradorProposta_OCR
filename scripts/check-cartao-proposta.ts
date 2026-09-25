/**
 * Confere a precificação da proposta com a tabela da Ton (1 dia útil / até R$20 mil).
 * Uso: npx tsx scripts/check-cartao-proposta.ts
 */
import { buildTabelaCartao, calcularPrecosDePixComTabela, opcoesSeletorCartao } from '../src/lib/tabelaJurosCartao';
import { resolverTonTotaisServer } from '../src/lib/maquininha/tonTotaisServer';

async function main() {
  const tonTotais = await resolverTonTotaisServer('umDiaUtil', 0);
  console.log('tonTotais:', tonTotais ? Object.keys(tonTotais).length + ' parcelas' : 'NULL');

  const tabela = buildTabelaCartao({
    adquirente: 'ton',
    tonTotais,
    prazoRecebimento: 'umDiaUtil',
    faixaFaturamento: 0,
    taxaMensalPagSeguro: 1.3,
    taxaMensalFallback: 1.51,
  });
  console.log('adquirente:', tabela.adquirente, '| maxParcelas:', tabela.maxParcelas);
  console.log('opções do seletor:', opcoesSeletorCartao(tabela).join(', '));

  const precos = calcularPrecosDePixComTabela(30000, tabela, 1.2);
  console.log('PIX      :', precos.ppix.toFixed(2));
  console.log('À vista  :', precos.pavista.toFixed(2), `(tag ${precos.economiaPercent}% economia)`);
  console.log('12x      :', precos.p12x.toFixed(2), '| total', precos.p12x_total.toFixed(2));
  console.log('18x      :', precos.p18x_parcela.toFixed(2), '| total', precos.p18x_total.toFixed(2));
  console.log('21x      :', precos.p21x_parcela.toFixed(2), '| total', precos.p21x_total.toFixed(2));

  // Fallback PagSeguro (maquininha Ton com problema)
  const pgs = buildTabelaCartao({
    adquirente: 'pagseguro',
    tonTotais,
    prazoRecebimento: 'umDiaUtil',
    faixaFaturamento: 0,
    taxaMensalPagSeguro: 1.3,
  });
  console.log('\n[fallback PagSeguro] adquirente:', pgs.adquirente, '| maxParcelas:', pgs.maxParcelas);
  const precosPgs = calcularPrecosDePixComTabela(30000, pgs, 1.2);
  console.log('18x:', precosPgs.p18x_parcela.toFixed(2), '| 21x:', precosPgs.p21x_parcela.toFixed(2));

  // Faixa seguinte (se o faturamento passar de R$20 mil)
  const tonFaixa1 = await resolverTonTotaisServer('umDiaUtil', 1);
  const faixa1 = buildTabelaCartao({
    adquirente: 'ton',
    tonTotais: tonFaixa1,
    prazoRecebimento: 'umDiaUtil',
    faixaFaturamento: 1,
  });
  const precosF1 = calcularPrecosDePixComTabela(30000, faixa1, 1.2);
  console.log('\n[faixa R$20–40 mil] 18x:', precosF1.p18x_parcela.toFixed(2), '| 21x:', precosF1.p21x_parcela.toFixed(2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
