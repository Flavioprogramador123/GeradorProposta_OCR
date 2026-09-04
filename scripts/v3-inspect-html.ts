import fs from 'fs';

const files = [
  'temp/_matrizcd_cdgoiania_secao_cabos.html',
  'temp/_matrizcd_cdgoiania_secao_estruturas-inox.html',
  'temp/soollar-estruturas-cdaeroportogo-2026-09-04T18-02-32-528Z.html',
];

for (const f of files) {
  const h = fs.readFileSync(f, 'utf8');
  const estoque = (h.match(/Estoque dispon/gi) || []).length;
  const alt = (h.match(/alt="Imagem do produto/gi) || []).length;
  const rs = (h.match(/R\$\s*[\d.,]+/g) || []).length;
  const veja = (h.match(/Veja o pre/gi) || []).length;
  const login = /auth\/login|Faça login|senha/i.test(h);
  console.log(f, { len: h.length, estoque, alt, rs, veja, login });
}
