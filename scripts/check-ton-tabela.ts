/**
 * Verificação rápida da tabela da Ton + taxa por parcela.
 * Uso: npx tsx scripts/check-ton-tabela.ts
 */
import fs from 'fs';
import path from 'path';
import {
  FAIXAS_TON,
  PRAZOS_RECEBIMENTO,
  jurosParcelaMensal,
  maxParcelasTon,
  parseTabelaTon,
} from '../src/lib/maquininha/tonTabela';

const bruto = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'tontaxa.json'), 'utf8'));

for (const prazo of Object.keys(PRAZOS_RECEBIMENTO) as Array<keyof typeof PRAZOS_RECEBIMENTO>) {
  for (const faixa of FAIXAS_TON) {
    const totais = parseTabelaTon(bruto, prazo, faixa.indice);
    const max = maxParcelasTon(totais);
    console.log(
      `\n[${prazo}] ${faixa.label} — até ${max}x`
    );
    const linhas = [1, 2, 6, 12, 18, 20, 21].filter((n) => totais[n] != null);
    for (const n of linhas) {
      const total = totais[n];
      const juros = jurosParcelaMensal(total, n);
      console.log(
        `  ${String(n).padStart(2)}x → total ${total.toFixed(2)}% | juros/parcela ${juros.toFixed(4)}% a.m.`
      );
    }
  }
}

// Amostra de PIX R$ 10.000 na condição vigente (1 dia útil, faixa até 20 mil)
const vigente = parseTabelaTon(bruto, 'umDiaUtil', 0);
console.log('\n=== Amostra PIX R$ 10.000 (1 dia útil / até R$20mil) ===');
for (const n of [1, 3, 6, 10, 12, 18, 21]) {
  const total = vigente[n];
  const valor = 10000 * (1 + total / 100);
  console.log(
    `  ${String(n).padStart(2)}x → ${(valor / n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/mês | total ${valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
  );
}
