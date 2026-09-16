/**
 * Curva Fortlev R$/Wp × kWp — regenera JSON/CSV em src/data/fortlev/
 * Narrativa: docs/FORTLEV_PRECIFICACAO.md
 *
 * Uso: npx tsx scripts/fortlev-curva-rs-wp.ts
 */
import fs from 'fs';
import path from 'path';

const OUT = path.join(process.cwd(), 'src', 'data', 'fortlev');

type Ponto = {
  kwp: number;
  tipo: 'micro' | 'string';
  lista: number;
  pix: number;
  rs_wp: number;
  overload_pct: number | null;
  fonte: string;
  n_mod_630?: number;
};

/** Pontos portal. 1,33 @ 22,05 = desconto vendedor → exclusao_curva. */
const pontos: Ponto[] = [
  { kwp: 5.04, tipo: 'micro', lista: 7774.92, pix: 7619.43, rs_wp: 1.51, overload_pct: 12, fonte: 'portal', n_mod_630: 8 },
  { kwp: 5.04, tipo: 'string', lista: 7993.41, pix: 7833.54, rs_wp: 1.55, overload_pct: 68, fonte: 'portal', n_mod_630: 8 },
  { kwp: 10.08, tipo: 'string', lista: 14386.31, pix: 14098.59, rs_wp: 1.4, overload_pct: 68, fonte: 'portal', n_mod_630: 16 },
  { kwp: 10.08, tipo: 'micro', lista: 15195.21, pix: 14891.31, rs_wp: 1.48, overload_pct: 34.4, fonte: 'portal', n_mod_630: 16 },
  { kwp: 15.12, tipo: 'string', lista: 22136.89, pix: 21694.15, rs_wp: 1.43, overload_pct: 51.2, fonte: 'portal', n_mod_630: 24 },
  { kwp: 15.12, tipo: 'micro', lista: 22243.54, pix: 21798.67, rs_wp: 1.44, overload_pct: 51.2, fonte: 'portal', n_mod_630: 24 },
  {
    kwp: 22.05,
    tipo: 'string',
    lista: 29980.83,
    pix: 29381.22,
    rs_wp: 1.33,
    overload_pct: null,
    fonte: 'EXCEÇÃO · desconto vendedor (fora da curva)',
    n_mod_630: 35,
  },
  {
    kwp: 22.05,
    tipo: 'string',
    lista: 33916.28,
    pix: 33237.95,
    rs_wp: 1.51,
    overload_pct: 47,
    fonte: 'portal · referência comercial',
    n_mod_630: 35,
  },
  {
    kwp: 22.05,
    tipo: 'micro',
    lista: 34244.76,
    pix: 33559.86,
    rs_wp: 1.52,
    overload_pct: 8.89,
    fonte: 'portal · referência comercial',
    n_mod_630: 35,
  },
  { kwp: 30.24, tipo: 'string', lista: 44230.19, pix: 43345.59, rs_wp: 1.43, overload_pct: 51.2, fonte: 'portal', n_mod_630: 48 },
  { kwp: 30.24, tipo: 'micro', lista: 46649.55, pix: 45716.56, rs_wp: 1.51, overload_pct: 12, fonte: 'portal', n_mod_630: 48 },
  { kwp: 39.69, tipo: 'string', lista: 55878.4, pix: 54760.84, rs_wp: 1.38, overload_pct: 47, fonte: 'portal', n_mod_630: 63 },
  { kwp: 39.69, tipo: 'micro', lista: 58479.91, pix: 57310.31, rs_wp: 1.44, overload_pct: 44.33, fonte: 'portal', n_mod_630: 63 },
];

function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const enriched = pontos.map((p) => {
    const exclusao = /EXCEÇÃO|desconto vendedor/i.test(p.fonte);
    return {
      ...p,
      desc_lista_pix_pct: Math.round((1 - p.pix / p.lista) * 10000) / 100,
      rs_wp_calc: Math.round((p.pix / (p.kwp * 1000)) * 10000) / 10000,
      exclusao_curva: exclusao,
    };
  });
  const curva = enriched.filter((p) => !p.exclusao_curva);
  const exclusoes = enriched.filter((p) => p.exclusao_curva);

  const payload = {
    meta: {
      gerado_em: new Date().toISOString(),
      premissa: 'Telhado fibro madeira 200mm · Anápolis · preços portal Fortlev (lista/PIX)',
      n_pontos_curva: curva.length,
      n_exclusoes_desconto_vendedor: exclusoes.length,
      regra_2205: 'Usar 1,51 R$/Wp string (portal). 1,33 = desconto vendedor → fora da curva.',
    },
    pontos_curva: curva,
    exclusoes_desconto_vendedor: exclusoes,
  };

  fs.writeFileSync(path.join(OUT, 'curva-rs-wp.json'), JSON.stringify(payload, null, 2), 'utf8');

  const csvHeader = 'kwp,tipo,lista,pix,rs_wp,overload_pct,fonte,exclusao_curva';
  const csvRows = enriched.map(
    (p) =>
      `${p.kwp},${p.tipo},${p.lista},${p.pix},${p.rs_wp},${p.overload_pct ?? ''},"${p.fonte}",${p.exclusao_curva}`
  );
  fs.writeFileSync(path.join(OUT, 'curva-rs-wp.csv'), [csvHeader, ...csvRows].join('\n'), 'utf8');

  console.log(`OK → ${OUT}/curva-rs-wp.{json,csv} (${curva.length} na curva, ${exclusoes.length} exclusão)`);
}

main();
