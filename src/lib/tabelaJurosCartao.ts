/**
 * Tabela de juros do cartão — multiplicadores sobre o valor PIX (base).
 * Fonte: simulação maquininha R$ 10.000 → totais 1x–18x.
 * Total a pagar = PIX × multiplicador; parcela = total ÷ n.
 */

/** Total / PIX para cada número de parcelas (1–18) */
export const MULTIPLICADOR_CARTAO: Record<number, number> = {
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

export const PARCELAS_CARTAO_MIN = 1;
export const PARCELAS_CARTAO_MAX = 18;
/** Referência comercial no card (à vista = total 12×) */
export const PARCELAS_REFERENCIA_AVISTA = 12;

export function getMultiplicadorCartao(parcelas: number): number {
  const n = Math.round(parcelas);
  if (n < PARCELAS_CARTAO_MIN || n > PARCELAS_CARTAO_MAX) {
    throw new Error(`Parcelas inválidas: ${parcelas}. Use ${PARCELAS_CARTAO_MIN}–${PARCELAS_CARTAO_MAX}.`);
  }
  return MULTIPLICADOR_CARTAO[n];
}

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
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
  parcelas: number
): ParcelaCartaoResult {
  const base = Math.max(0, Number(valorFinanciado) || 0);
  const multiplicador = getMultiplicadorCartao(parcelas);
  const total = roundMoney(base * multiplicador);
  const parcela = roundMoney(total / parcelas);
  return { parcelas, multiplicador, total, parcela };
}

/**
 * Precificação comercial a partir do PIX (menor valor).
 * - à vista = total do cartão em 12× (âncora do card)
 * - 12× / 18× = tabela real
 * - promoção (riscado) = PIX × markup
 */
export function calcularPrecosDePix(
  pix: number,
  markupPromocao = 1.2
): {
  ppix: number;
  pavista: number;
  priscado: number;
  p12x: number;
  p12x_total: number;
  p18x_parcela: number;
  p18x_total: number;
  economiaPercent: number;
} {
  const ppix = roundMoney(Math.max(0, Number(pix) || 0));
  const ref12 = calcularParcelamentoCartao(ppix, PARCELAS_REFERENCIA_AVISTA);
  const ref18 = calcularParcelamentoCartao(ppix, 18);
  const pavista = ref12.total;
  const economiaPercent =
    pavista > 0 ? roundMoney(((pavista - ppix) / pavista) * 100) : 0;

  return {
    ppix,
    pavista,
    priscado: roundMoney(ppix * (markupPromocao > 0 ? markupPromocao : 1.2)),
    p12x: ref12.parcela,
    p12x_total: ref12.total,
    p18x_parcela: ref18.parcela,
    p18x_total: ref18.total,
    economiaPercent,
  };
}

/** Lista 1–18× para um valor financiado (após entrada). */
export function listarParcelasCartao(valorFinanciado: number): ParcelaCartaoResult[] {
  const out: ParcelaCartaoResult[] = [];
  for (let n = PARCELAS_CARTAO_MIN; n <= PARCELAS_CARTAO_MAX; n++) {
    out.push(calcularParcelamentoCartao(valorFinanciado, n));
  }
  return out;
}

/** Script + modal injetados na proposta HTML (cliente). */
export function getFormasPagamentoModalScript(): string {
  const tabelaJson = JSON.stringify(MULTIPLICADOR_CARTAO);
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
        <thead><tr><th>Parcelas</th><th>Valor parcela</th><th>Total</th></tr></thead>
        <tbody id="pieng-pay-tbody"></tbody>
      </table>
      <p class="pieng-pay-hint">PIX é a condição à vista mais vantajosa. Demais condições no cartão conforme tabela vigente.</p>
    </div>
  </div>
</div>
<script>
(function(){
  var MULT = ${tabelaJson};
  var modal = document.getElementById('pieng-pay-modal');
  var entradaEl = document.getElementById('pieng-pay-entrada');
  var parcelasEl = document.getElementById('pieng-pay-parcelas');
  var resultEl = document.getElementById('pieng-pay-result');
  var tbody = document.getElementById('pieng-pay-tbody');
  var pixBox = document.getElementById('pieng-pay-pix-box');
  var pixAtual = 0;
  function money(v){
    return (Number(v)||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  }
  function calc(financiado, n){
    var m = MULT[n] || 1;
    var total = Math.round(financiado * m * 100) / 100;
    var parcela = Math.round((total / n) * 100) / 100;
    return {total: total, parcela: parcela};
  }
  function render(){
    var entrada = Math.max(0, Number(entradaEl.value)||0);
    if (entrada > pixAtual) { entrada = pixAtual; entradaEl.value = String(pixAtual); }
    var financiado = Math.max(0, pixAtual - entrada);
    var n = Number(parcelasEl.value)||12;
    var sel = calc(financiado, n);
    pixBox.innerHTML = '<div><strong>Valor PIX:</strong> '+money(pixAtual)+'</div>'+
      '<div><strong>Entrada:</strong> '+money(entrada)+'</div>'+
      '<div><strong>Restante a parcelar:</strong> '+money(financiado)+'</div>';
    resultEl.innerHTML = financiado <= 0
      ? '<strong>Pagamento à vista no PIX / entrada total.</strong>'
      : '<div><strong>'+n+'× de '+money(sel.parcela)+'</strong></div>'+
        '<div>Total no cartão: <strong>'+money(sel.total)+'</strong></div>'+
        '<div>Total geral (entrada + cartão): <strong>'+money(entrada + sel.total)+'</strong></div>';
    var html = '';
    for (var i=1;i<=18;i++){
      var r = calc(financiado, i);
      html += '<tr class="'+(i===n?'is-active':'')+'"><td>'+i+'×</td><td>'+money(r.parcela)+'</td><td>'+money(r.total)+'</td></tr>';
    }
    tbody.innerHTML = html;
  }
  function openModal(pix){
    pixAtual = Number(pix)||0;
    entradaEl.value = '0';
    parcelasEl.value = '12';
    render();
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden','false');
  }
  function closeModal(){
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden','true');
  }
  if (parcelasEl && !parcelasEl.options.length){
    for (var i=1;i<=18;i++){
      var opt = document.createElement('option');
      opt.value = String(i);
      opt.textContent = i+'×';
      if (i===12) opt.selected = true;
      parcelasEl.appendChild(opt);
    }
  }
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
  window.__piengAbrirFormasPagamento = openModal;
})();
</script>`;
}
