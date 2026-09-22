/**
 * Tabela de juros do cartão — multiplicadores sobre o valor PIX (base).
 *
 * Fonte da verdade: **`tontaxa.json`** (tabela da maquininha Ton), via
 * `resolverTaxaCartao()` em `@/lib/maquininha/taxaAdapter`.
 *
 * Modelo:
 * - `jurosParcelaPercent` = juros **total** (%) por parcela, direto da tabela
 *   (ex.: 18× → 18,72% na faixa até R$ 20 mil com recebimento em 1 dia útil)
 * - Total do cartão = PIX × (1 + jurosTotal/100); parcela = total ÷ N
 * - "À vista" = total do cartão em 12× (âncora do card) — regra comercial PIENG
 * - Sem tabela: cai para juros simples `taxaMensal × N` (fallback PagSeguro)
 *
 * ⚠️ Nada aqui deve ir para o cliente como "taxa": só valores finais e a tag
 * de economia no PIX (`RESTRICOES_CLIENTE.md`).
 */

import { resolverTaxaCartao, type TaxaCartaoInput } from '@/lib/maquininha/taxaAdapter';
import { jurosParcelaMensal, maxParcelasTon, type LinhasTon } from '@/lib/maquininha/tonTabela';

/** Taxa mensal da maquininha usada quando não há tabela (fallback legado). */
export const TAXA_CARTAO_MENSAL_REF = 1.51;

/**
 * Fallback: multiplicadores calibrados na taxa de referência (PIX R$ 10.000).
 * Só usado em caminhos legados/síncronos — o cálculo oficial vem da tabela da Ton.
 */
export const MULTIPLICADOR_CARTAO_REF: Record<number, number> = {
  1: 1.030822,
  2: 1.042862,
  3: 1.050862,
  4: 1.058762,
  5: 1.066895,
  6: 1.074923,
  7: 1.077238,
  8: 1.085188,
  9: 1.093374,
  10: 1.101565,
  11: 1.109755,
  12: 1.117943,
  13: 1.136622,
  14: 1.145082,
  15: 1.153537,
  16: 1.162116,
  17: 1.170686,
  18: 1.179384,
};

/** Alias estável = fallback calibrado (1,51%). */
export const MULTIPLICADOR_CARTAO = MULTIPLICADOR_CARTAO_REF;

/** Limites técnicos da tabela de multiplicadores (cálculo) */
export const PARCELAS_CARTAO_MIN = 2;
export const PARCELAS_CARTAO_MAX = 21;
export const PARCELAS_CARTAO_MAX_LEGADO = 18;
/** Opções exibidas no modal (mobile-friendly) */
export const PARCELAS_CARTAO_EXIBIDAS = [3, 6, 10, 12, 18, 21] as const;
/** Referência comercial no card (à vista = total 12×) */
export const PARCELAS_REFERENCIA_AVISTA = 12;

export interface TabelaCartao {
  /** Juros % sobre o PIX, por parcela (1 = MDR à vista) */
  jurosParcelaPercent: LinhasTon;
  /** Maior parcela disponível (21 na Ton) */
  maxParcelas: number;
  /** Taxa mensal na condição de referência (12×), para rótulos internos */
  taxaMensal12x: number;
  adquirente: string;
}

const TABELA_FALLBACK_SIMPLES: TabelaCartao = (() => {
  const jurosParcelaPercent: LinhasTon = {};
  for (let n = 1; n <= PARCELAS_CARTAO_MAX_LEGADO; n++) {
    jurosParcelaPercent[n] =
      n === 1
        ? (MULTIPLICADOR_CARTAO_REF[1] - 1) * 100
        : (MULTIPLICADOR_CARTAO_REF[n] - 1) * 100;
  }
  return {
    jurosParcelaPercent,
    maxParcelas: PARCELAS_CARTAO_MAX_LEGADO,
    taxaMensal12x: TAXA_CARTAO_MENSAL_REF,
    adquirente: 'fallback-calibrado',
  };
})();

function round6(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Tabela de multiplicadores derivada de juros totais. */
export function buildMultiplicadoresFromTotais(totais: LinhasTon): Record<number, number> {
  const out: Record<number, number> = {};
  for (let n = 1; n <= maxParcelasTon(totais); n++) {
    const total = totais[n];
    if (total == null) continue;
    out[n] = round6(1 + Number(total) / 100);
  }
  return out;
}

/**
 * Tabela oficial (Ton/PagSeguro) a partir de um objeto de configuração.
 * Use nas rotas de API e no admin.
 */
export function buildTabelaCartao(input: TaxaCartaoInput = {}): TabelaCartao {
  const taxa = resolverTaxaCartao(input);
  if (taxa.jurosParcelaPercent) {
    return {
      jurosParcelaPercent: taxa.jurosParcelaPercent,
      maxParcelas: taxa.maxParcelas,
      taxaMensal12x: taxa.taxaMensal12x,
      adquirente: taxa.adquirente,
    };
  }
  // Fallback: juros simples sobre a taxa mensal (PagSeguro / tabela ausente)
  const jurosParcelaPercent: LinhasTon = {};
  for (let n = 1; n <= PARCELAS_CARTAO_MAX_LEGADO; n++) {
    jurosParcelaPercent[n] =
      n === 1 ? taxa.jurosTotal12x / PARCELAS_REFERENCIA_AVISTA : taxa.taxaMensal12x * n;
  }
  return {
    jurosParcelaPercent,
    maxParcelas: PARCELAS_CARTAO_MAX_LEGADO,
    taxaMensal12x: taxa.taxaMensal12x,
    adquirente: taxa.adquirente,
  };
}

/**
 * Tabela a partir dos juros por parcela (formato persistido na proposta).
 * Mantém propostas antigas (geradas com o multiplicador calibrado) estáveis.
 */
export function buildTabelaCartaoFromParcelaPercent(
  totais: LinhasTon,
  fallbackTaxaMensal: number = TAXA_CARTAO_MENSAL_REF
): TabelaCartao {
  return {
    jurosParcelaPercent: totais,
    maxParcelas: maxParcelasTon(totais),
    taxaMensal12x:
      totais[PARCELAS_REFERENCIA_AVISTA] != null
        ? jurosParcelaMensal(totais[PARCELAS_REFERENCIA_AVISTA], PARCELAS_REFERENCIA_AVISTA)
        : fallbackTaxaMensal,
    adquirente: 'proposta',
  };
}

/**
 * Regenera multiplicadores a partir da taxa mensal (% a.m.) — juros simples.
 * @deprecated Use `buildTabelaCartao` (tabela da Ton). Mantido para compatibilidade.
 */
export function buildMultiplicadoresFromTaxa(
  taxaMensalPercent: number = TAXA_CARTAO_MENSAL_REF,
  maxParcelas: number = PARCELAS_CARTAO_MAX_LEGADO
): Record<number, number> {
  const taxa = normalizeTaxaCartaoMensal(taxaMensalPercent);
  const out: Record<number, number> = {};
  for (let n = 1; n <= maxParcelas; n++) {
    out[n] = round6(1 + (taxa * n) / 100);
  }
  return out;
}

export function normalizeTaxaCartaoMensal(raw: unknown): number {
  const n = typeof raw === 'number' ? raw : parseFloat(String(raw ?? '').replace(',', '.'));
  if (!Number.isFinite(n) || n <= 0 || n > 20) return TAXA_CARTAO_MENSAL_REF;
  return Math.round(n * 10000) / 10000;
}

/** Multiplicador de N parcelas na tabela informada (padrão: fallback calibrado). */
export function getMultiplicadorCartao(
  parcelas: number,
  tabela: TabelaCartao = TABELA_FALLBACK_SIMPLES
): number {
  const n = Math.round(parcelas);
  if (n < 1 || n > tabela.maxParcelas) {
    throw new Error(`Parcelas inválidas: ${parcelas}. Use 1–${tabela.maxParcelas}.`);
  }
  const total = tabela.jurosParcelaPercent[n];
  if (total != null) return round6(1 + total / 100);
  return round6(1 + (tabela.taxaMensal12x * n) / 100);
}

export { roundMoney };

/**
 * % do card = juros embutidos no multiplicador 12× (âncora = PIX).
 * Só para a tag "ECONOMIA DE X% NO PIX" — nunca expor a fórmula ao cliente.
 */
export function percentualEconomiaPix(ppix: number, pavista: number): number {
  const pix = Math.max(0, Number(ppix) || 0);
  const vista = Math.max(0, Number(pavista) || 0);
  if (vista <= 0 || pix <= 0) return 0;
  return roundMoney(((vista - pix) / pix) * 100);
}

/** Tag do card: "ECONOMIA DE 11% NO PIX" */
export function tagEconomiaPix(ppix: number, pavista: number): string {
  const pct = Math.round(percentualEconomiaPix(ppix, pavista));
  return `ECONOMIA DE ${pct}% NO PIX`;
}

export interface ParcelaCartaoResult {
  parcelas: number;
  multiplicador: number;
  total: number;
  parcela: number;
}

/** Financia um valor (ex.: PIX − entrada) em N parcelas. */
export function calcularParcelamentoCartao(
  valorFinanciado: number,
  parcelas: number,
  tabela: TabelaCartao = TABELA_FALLBACK_SIMPLES
): ParcelaCartaoResult {
  const base = Math.max(0, Number(valorFinanciado) || 0);
  const multiplicador = getMultiplicadorCartao(parcelas, tabela);
  const total = roundMoney(base * multiplicador);
  const parcela = roundMoney(total / parcelas);
  return { parcelas, multiplicador, total, parcela };
}

export interface PrecosDePix {
  ppix: number;
  pavista: number;
  priscado: number;
  p12x: number;
  p12x_total: number;
  p18x_parcela: number;
  p18x_total: number;
  p21x_parcela: number;
  p21x_total: number;
  economiaPercent: number;
  taxaCartaoMensal: number;
  multiplicador12: number;
  /** Multiplicador do "à vista" (12×) — âncora do card */
  multiplicadorAvista: number;
  multiplicador18: number;
  multiplicador21: number;
  adquirente: string;
}

/**
 * Precificação comercial a partir do PIX (menor valor).
 * - à vista = total do cartão em 12× (âncora do card)
 * - 12× / 18× / 21× = tabela da maquininha
 * - promoção (riscado) = PIX × markup
 */
export function calcularPrecosDePixComTabela(
  pix: number,
  tabela: TabelaCartao,
  markupPromocao = 1.2
): PrecosDePix {
  const ppix = roundMoney(Math.max(0, Number(pix) || 0));
  const ref12 = calcularParcelamentoCartao(ppix, PARCELAS_REFERENCIA_AVISTA, tabela);
  const ref18 = calcularParcelamentoCartao(ppix, 18, tabela);
  const n21 = tabela.maxParcelas >= 21 ? 21 : tabela.maxParcelas;
  const ref21 = calcularParcelamentoCartao(ppix, n21, tabela);
  const pavista = ref12.total;
  const economiaPercent = percentualEconomiaPix(ppix, pavista);

  return {
    ppix,
    pavista,
    priscado: roundMoney(ppix * (markupPromocao > 0 ? markupPromocao : 1.2)),
    p12x: ref12.parcela,
    p12x_total: ref12.total,
    p18x_parcela: ref18.parcela,
    p18x_total: ref18.total,
    p21x_parcela: ref21.parcela,
    p21x_total: ref21.total,
    economiaPercent,
    taxaCartaoMensal: tabela.taxaMensal12x,
    multiplicador12: ref12.multiplicador,
    multiplicadorAvista: ref12.multiplicador,
    multiplicador18: ref18.multiplicador,
    multiplicador21: ref21.multiplicador,
    adquirente: tabela.adquirente,
  };
}

/**
 * Compatibilidade: mesma saída de antes, agora aceitando tabela **ou** taxa mensal.
 * - `TabelaCartao` → usa a tabela real (Ton)
 * - `number` → juros simples a partir da taxa mensal (fallback PagSeguro)
 */
export function calcularPrecosDePix(
  pix: number,
  markupPromocao = 1.2,
  tabelaOuTaxa: TabelaCartao | number = TABELA_FALLBACK_SIMPLES
): PrecosDePix {
  const tabela: TabelaCartao =
    typeof tabelaOuTaxa === 'number' ? buildTabelaCartao({ taxaMensalPagSeguro: tabelaOuTaxa }) : tabelaOuTaxa;
  return calcularPrecosDePixComTabela(pix, tabela, markupPromocao);
}

/** Calcula as condições para uma lista de parcelas (modal do cliente). */
export function listarParcelasDeTabela(
  valorFinanciado: number,
  parcelas: readonly number[],
  tabela: TabelaCartao = TABELA_FALLBACK_SIMPLES
): ParcelaCartaoResult[] {
  return parcelas.map((n) => calcularParcelamentoCartao(valorFinanciado, n, tabela));
}

/** Lista as parcelas exibidas no modal (3×, 6×, 10×, 12×, 18×, 21×). */
export function listarParcelasCartao(
  valorFinanciado: number,
  tabela: TabelaCartao = TABELA_FALLBACK_SIMPLES
): ParcelaCartaoResult[] {
  return parcelasDisponiveis(tabela)
    .filter((n) => (PARCELAS_CARTAO_EXIBIDAS as readonly number[]).includes(n))
    .map((n) => calcularParcelamentoCartao(valorFinanciado, n, tabela));
}

/** Parcelas existentes na tabela (exclui 1×), em ordem crescente. */
export function parcelasDisponiveis(tabela: TabelaCartao): number[] {
  return Object.keys(tabela.jurosParcelaPercent)
    .map(Number)
    .filter((n) => Number.isFinite(n) && n >= PARCELAS_CARTAO_MIN && n <= tabela.maxParcelas)
    .sort((a, b) => a - b);
}

/**
 * Opções do seletor do modal: as "redondas" de `PARCELAS_CARTAO_EXIBIDAS` que
 * existem na tabela, mais o teto (ex.: 21×).
 */
export function opcoesSeletorCartao(tabela: TabelaCartao): number[] {
  const disponiveis = new Set(parcelasDisponiveis(tabela));
  const opcoes = (PARCELAS_CARTAO_EXIBIDAS as readonly number[]).filter((n) =>
    disponiveis.has(n)
  );
  const teto = tabela.maxParcelas;
  if (disponiveis.has(teto) && !opcoes.includes(teto)) opcoes.push(teto);
  return opcoes.length ? opcoes : [...PARCELAS_CARTAO_EXIBIDAS];
}

/** Condições completas de parcelamento (para tabela/grade de opções). */
export function condicoesCartao(
  valorFinanciado: number,
  tabela: TabelaCartao = TABELA_FALLBACK_SIMPLES
): ParcelaCartaoResult[] {
  return parcelasDisponiveis(tabela).map((n) =>
    calcularParcelamentoCartao(valorFinanciado, n, tabela)
  );
}

/**
 * Script + modal injetados na proposta HTML (cliente).
 * Recebe a tabela da maquininha (juros totais por parcela) já resolvida.
 */
export function getFormasPagamentoModalScriptComTabela(tabela: TabelaCartao): string {
  const multiplicadores = buildMultiplicadoresFromTotais(tabela.jurosParcelaPercent);
  const tabelaJson = JSON.stringify(multiplicadores);
  const parcelasJson = JSON.stringify(condicoesCartao(0, tabela).map((c) => c.parcelas));
  const opcoesSeletor = opcoesSeletorCartao(tabela);
  const opcoesJson = JSON.stringify(opcoesSeletor);
  const opcoesLabel = opcoesSeletor.map((n) => `${n}×`).join(', ');
  const ref = PARCELAS_REFERENCIA_AVISTA;
  const maiorParcela = tabela.maxParcelas;
  return `
<style>
  .pieng-pay-modal{position:fixed;inset:0;z-index:9999;display:none;align-items:center;justify-content:center;background:rgba(15,23,42,.55);padding:16px}
  .pieng-pay-modal.is-open{display:flex}
  .pieng-pay-dialog{background:#fff;border-radius:16px;max-width:520px;width:100%;max-height:90vh;overflow:auto;box-shadow:0 20px 50px rgba(0,0,0,.25)}
  .pieng-pay-dialog header{padding:16px 18px;border-bottom:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center;gap:12px}
  .pieng-pay-dialog header h3{margin:0;font-size:1.05rem;color:#0f172a}
  .pieng-pay-close{border:0;background:#f1f5f9;border-radius:8px;padding:6px 10px;cursor:pointer;font-size:14px}
  .pieng-pay-body{padding:16px 18px}
  .pieng-pay-row{display:flex;flex-direction:column;gap:6px;margin-bottom:12px}
  .pieng-pay-row label{font-size:12px;color:#64748b;font-weight:600}
  .pieng-pay-row input,.pieng-pay-row select{border:1px solid #cbd5e1;border-radius:8px;padding:10px 12px;font-size:15px}
  .pieng-pay-summary{background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:12px;margin:12px 0;font-size:14px;line-height:1.5}
  .pieng-pay-summary strong{color:#0f172a}
  .pieng-pay-table{width:100%;border-collapse:collapse;font-size:13px}
  .pieng-pay-table th,.pieng-pay-table td{padding:8px;border-bottom:1px solid #e5e7eb;text-align:right}
  .pieng-pay-table th:first-child,.pieng-pay-table td:first-child{text-align:left}
  .pieng-pay-table tr.is-active{background:#ecfdf5}
  .pieng-pay-hint{font-size:12px;color:#64748b;margin-top:8px}
</style>
<div id="pieng-pay-modal" class="pieng-pay-modal no-print" aria-hidden="true">
  <div class="pieng-pay-dialog" role="dialog" aria-modal="true" aria-labelledby="pieng-pay-title">
    <header>
      <h3 id="pieng-pay-title">Outras formas de pagamento</h3>
      <button type="button" class="pieng-pay-close" id="pieng-pay-close">Fechar</button>
    </header>
    <div class="pieng-pay-body">
      <div class="pieng-pay-summary" id="pieng-pay-pix-box"></div>
      <div class="pieng-pay-row">
        <label for="pieng-pay-entrada">Entrada (R$)</label>
        <input id="pieng-pay-entrada" type="number" min="0" step="100" value="0" />
      </div>
      <div class="pieng-pay-row">
        <label for="pieng-pay-parcelas">Parcelas do restante (cartão)</label>
        <select id="pieng-pay-parcelas"></select>
      </div>
      <div class="pieng-pay-summary" id="pieng-pay-result"></div>
      <table class="pieng-pay-table">
        <thead><tr><th>Valor parcela</th><th>Total</th></tr></thead>
        <tbody id="pieng-pay-tbody"></tbody>
      </table>
      <p class="pieng-pay-hint">PIX é a condição à vista mais vantajosa. Cartão em ${opcoesLabel}.
      <button type="button" id="pieng-pay-ver-todas" style="border:0;background:none;color:#0f766e;text-decoration:underline;cursor:pointer;font-size:12px;padding:0">Ver todas as ${maiorParcela} opções</button></p>
    </div>
  </div>
</div>
<script>
(function(){
  var MULT = ${tabelaJson};
  var OPCOES = ${opcoesJson};
  var PARCELAS_TODAS = ${parcelasJson};
  var REF = ${ref};
  var modal = document.getElementById('pieng-pay-modal');
  var entradaEl = document.getElementById('pieng-pay-entrada');
  var parcelasEl = document.getElementById('pieng-pay-parcelas');
  var resultEl = document.getElementById('pieng-pay-result');
  var tbody = document.getElementById('pieng-pay-tbody');
  var pixBox = document.getElementById('pieng-pay-pix-box');
  var verTodas = document.getElementById('pieng-pay-ver-todas');
  var pixAtual = 0;
  var mostrarTodas = false;
  function money(v){
    return (Number(v)||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  }
  function calc(financiado, n){
    var m = MULT[n] || 1;
    var total = Math.round(financiado * m * 100) / 100;
    var parcela = Math.round((total / n) * 100) / 100;
    return {total: total, parcela: parcela};
  }
  function parcelasVisiveis(){
    return mostrarTodas ? PARCELAS_TODAS : OPCOES;
  }
  function render(){
    var entrada = Math.max(0, Number(entradaEl.value)||0);
    if (entrada > pixAtual) { entrada = pixAtual; entradaEl.value = String(pixAtual); }
    var financiado = Math.max(0, pixAtual - entrada);
    var n = Number(parcelasEl.value)||REF;
    if (OPCOES.indexOf(n) < 0 && PARCELAS_TODAS.indexOf(n) < 0) n = REF;
    var sel = calc(financiado, n);
    pixBox.innerHTML = '<div><strong>Valor PIX:</strong> '+money(pixAtual)+'</div>'+
      '<div><strong>Entrada:</strong> '+money(entrada)+'</div>'+
      '<div><strong>Restante a parcelar:</strong> '+money(financiado)+'</div>';
    resultEl.innerHTML = financiado <= 0
      ? '<strong>Pagamento à vista no PIX / entrada total.</strong>'
      : '<div><strong>'+n+'× de '+money(sel.parcela)+'</strong></div>'+
        '<div>Total no cartão: <strong>'+money(sel.total)+'</strong></div>'+
        '<div>Total geral (entrada + cartão): <strong>'+money(entrada + sel.total)+'</strong></div>';
    var lista = parcelasVisiveis();
    var html = '';
    for (var i=0;i<lista.length;i++){
      var p = lista[i];
      var r = calc(financiado, p);
      html += '<tr class="'+(p===n?'is-active':'')+'"><td>'+p+'× '+money(r.parcela)+'</td><td>'+money(r.total)+'</td></tr>';
    }
    tbody.innerHTML = html;
  }
  function openModal(pix){
    pixAtual = Number(pix)||0;
    entradaEl.value = '0';
    parcelasEl.value = String(REF);
    render();
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden','false');
  }
  function closeModal(){
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden','true');
  }
  function preencherOpcoes(){
    var lista = OPCOES;
    parcelasEl.innerHTML = '';
    for (var i=0;i<lista.length;i++){
      var p = lista[i];
      var opt = document.createElement('option');
      opt.value = String(p);
      opt.textContent = p+'×';
      if (p===REF) opt.selected = true;
      parcelasEl.appendChild(opt);
    }
  }
  preencherOpcoes();
  document.addEventListener('click', function(e){
    var btn = e.target && e.target.closest ? e.target.closest('[data-pieng-pay]') : null;
    if (btn){
      e.preventDefault();
      openModal(btn.getAttribute('data-pix') || btn.getAttribute('data-pieng-pay'));
    }
  });
  document.getElementById('pieng-pay-close') && document.getElementById('pieng-pay-close').addEventListener('click', closeModal);
  modal && modal.addEventListener('click', function(e){ if (e.target === modal) closeModal(); });
  entradaEl && entradaEl.addEventListener('input', render);
  parcelasEl && parcelasEl.addEventListener('change', render);
  verTodas && verTodas.addEventListener('click', function(){
    mostrarTodas = !mostrarTodas;
    verTodas.textContent = mostrarTodas ? 'Ver apenas as principais' : 'Ver todas as ${maiorParcela} opções';
    preencherOpcoes();
    render();
  });
  window.__piengAbrirFormasPagamento = openModal;
})();
</script>`;
}

/**
 * Compatibilidade: aceita a tabela, o `jurosParcelaPercent` cru, um objeto de
 * configuração (Ton/PagSeguro) ou uma taxa mensal.
 */
export function getFormasPagamentoModalScript(
  entrada: TabelaCartao | LinhasTon | TaxaCartaoInput | number = TABELA_FALLBACK_SIMPLES
): string {
  if (typeof entrada === 'number') {
    return getFormasPagamentoModalScriptComTabela(
      buildTabelaCartao({ taxaMensalPagSeguro: entrada })
    );
  }
  if (entrada && typeof entrada === 'object' && 'jurosParcelaPercent' in entrada) {
    return getFormasPagamentoModalScriptComTabela(entrada as TabelaCartao);
  }
  // `jurosParcelaPercent` cru ({ 1: 3.14, ..., 21: 20.64 })
  if (entrada && typeof entrada === 'object' && !('maxParcelas' in entrada)) {
    const obj = entrada as Record<string, unknown>;
    const keys = Object.keys(obj).map(Number).filter((n) => Number.isFinite(n));
    const pareceJuros = keys.length > 0 && keys.every((n) => Number(obj[String(n)]) < 100);
    if (pareceJuros) {
      const totais: LinhasTon = {};
      for (const n of keys) totais[n] = Number(obj[String(n)]);
      return getFormasPagamentoModalScriptComTabela(buildTabelaCartaoFromParcelaPercent(totais));
    }
  }
  return getFormasPagamentoModalScriptComTabela(buildTabelaCartao(entrada as TaxaCartaoInput));
}
