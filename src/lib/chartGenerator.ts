/**
 * 📊 GERADOR DE GRÁFICOS - PIENG SOLAR
 * 
 * Biblioteca para gerar gráficos HTML/Canvas usando Chart.js inline.
 * Todos os gráficos são autocontidos (incluem Chart.js CDN e configuração).
 */

import { PIENG_CHART } from '@/lib/piengChartTheme';

// ============================================================================
// INTERFACES
// ============================================================================

export interface SistemaGrafico {
  nome: string;
  payback: number;        // em meses
  potencia: number;       // em kWp
  ppix: number;           // preço PIX
  geracao: number;        // geração mensal em kWh
}

export interface CustoBreakdown {
  modulos: number;
  inversores: number;
  estrutura: number;
  maoDeObra: number;
  outros: number;
}

// ============================================================================
// GRÁFICO: GERAÇÃO MENSAL (12 meses) — compacto para HTML do cliente
// ============================================================================

export interface MonthlyGenerationChartOptions {
  /** Altura do canvas (padrão compacto 220) */
  height?: number;
  /** Se true, Geração = HSP × kWp × PR × dias_mês; senão × 30.4 */
  usarDiasReais?: boolean;
  diasPorMes?: number[];
  canvasId?: string;
}

/**
 * Barras Jan–Dez. Preferir `usarDiasReais` no HTML do cliente (CRESESB).
 */
export function generateMonthlyGenerationChart(
  potenciaKwp: number,
  hspMensal: number[],
  performanceRate: number = 0.78,
  options: MonthlyGenerationChartOptions = {}
): string {
  const {
    height = 220,
    usarDiasReais = true,
    diasPorMes = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31],
    canvasId = 'chartGeracaoMensal',
  } = options;

  const geracaoMensal = hspMensal.map((hsp, i) => {
    if (usarDiasReais) {
      return Math.round(hsp * potenciaKwp * performanceRate * (diasPorMes[i] ?? 30));
    }
    return Math.round(potenciaKwp * hsp * 30.4 * performanceRate);
  });

  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const maxVal = Math.max(...geracaoMensal);
  const cores = geracaoMensal.map((v) =>
    v === maxVal ? 'rgba(14, 165, 233, 0.9)' : 'rgba(22, 163, 74, 0.82)'
  );

  return `
    <div class="chart-container pieng-geracao-chart" style="position:relative;height:${height}px;width:100%;max-width:720px;margin:0 auto;">
      <canvas id="${canvasId}"></canvas>
    </div>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
    <script>
      (function() {
        const el = document.getElementById('${canvasId}');
        if (!el || typeof Chart === 'undefined') return;
        new Chart(el, {
          type: 'bar',
          data: {
            labels: ${JSON.stringify(meses)},
            datasets: [{
              label: 'Geração (kWh)',
              data: ${JSON.stringify(geracaoMensal)},
              backgroundColor: ${JSON.stringify(cores)},
              borderWidth: 0,
              borderRadius: 4
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: function(ctx) {
                    return ctx.parsed.y.toLocaleString('pt-BR') + ' kWh';
                  }
                }
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                ticks: {
                  font: { size: 10 },
                  callback: function(v) { return Number(v).toLocaleString('pt-BR'); }
                },
                grid: { color: 'rgba(0,0,0,0.05)' }
              },
              x: {
                ticks: { font: { size: 10 } },
                grid: { display: false }
              }
            }
          }
        });
      })();
    </script>
  `;
}

/**
 * Bloco mínimo para o HTML do cliente: título + barras (sem Chart.js / sem KPIs).
 * Barras em HTML/CSS — funcionam em innerHTML, print e PDF.
 */
export function generateProjecaoGeracaoClienteHtml(params: {
  potenciaKwp: number;
  hspMensal: number[];
  performanceRate: number;
  cidadeLabel?: string;
  diasPorMes?: number[];
}): string {
  const {
    potenciaKwp,
    hspMensal,
    performanceRate,
    cidadeLabel,
    diasPorMes = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31],
  } = params;
  if (!potenciaKwp || potenciaKwp <= 0 || !hspMensal?.length) return '';

  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const geracao = hspMensal.map((hsp, i) =>
    Math.round(hsp * potenciaKwp * performanceRate * (diasPorMes[i] ?? 30))
  );
  const maxVal = Math.max(...geracao, 1);
  const minVal = Math.min(...geracao);
  const iMax = geracao.indexOf(maxVal);
  const iMin = geracao.indexOf(minVal);
  const anual = geracao.reduce((a, b) => a + b, 0);
  const media = Math.round(anual / geracao.length);
  const mediaPct = Math.max(0, Math.min(100, (media / maxVal) * 100));
  const variacaoPct = maxVal > 0 ? ((maxVal - minVal) / maxVal) * 100 : 0;
  const uid = `pg${Math.abs(Math.round(potenciaKwp * 1000 + media)).toString(36)}`;

  const valuesRow = geracao
    .map(
      (kwh) =>
        `<div class="pieng-geracao-val-item" style="flex:1;min-width:0;text-align:center;font-size:11px;color:${PIENG_CHART.muted};font-weight:600;">${kwh.toLocaleString('pt-BR')}</div>`
    )
    .join('');

  const bars = geracao
    .map((kwh, i) => {
      const pct = Math.max(6, Math.round((kwh / maxVal) * 100));
      const isPeak = kwh === maxVal;
      const cor = isPeak ? PIENG_CHART.accent : PIENG_CHART.bar;
      return `
      <button type="button" class="pieng-geracao-col" data-idx="${i}" data-kwh="${kwh}" data-mes="${meses[i]}"
        aria-label="${meses[i]}: ${kwh.toLocaleString('pt-BR')} kWh"
        style="flex:1;min-width:0;height:100%;display:flex;align-items:flex-end;justify-content:center;border:0;background:transparent;padding:0;cursor:pointer;">
        <div class="pieng-geracao-bar" title="${meses[i]}: ${kwh.toLocaleString('pt-BR')} kWh"
          style="width:90%;max-width:36px;height:${pct}%;background:${cor};border-radius:5px 5px 0 0;"></div>
      </button>`;
    })
    .join('');

  const monthsRow = meses
    .map(
      (m, i) =>
        `<button type="button" class="pieng-geracao-mes" data-idx="${i}" style="flex:1;min-width:0;text-align:center;font-size:11px;font-weight:600;color:${PIENG_CHART.muted};border:0;background:transparent;padding:0;cursor:pointer;">${m}</button>`
    )
    .join('');

  const potTxt = potenciaKwp.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const onde = cidadeLabel ? ` · ${cidadeLabel}` : '';
  const varTxt = variacaoPct.toFixed(1).replace('.', ',');
  const mediaTxt = media.toLocaleString('pt-BR');
  const kpi = (label: string, value: string) =>
    `<div style="background:${PIENG_CHART.surface};border:1px solid ${PIENG_CHART.border};border-radius:10px;padding:10px 12px;">
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.04em;color:${PIENG_CHART.muted};font-weight:600;">${label}</div>
      <div style="font-size:1.1rem;font-weight:700;color:${PIENG_CHART.text};margin-top:2px;">${value}</div>
    </div>`;

  return `
<section id="${uid}" class="pieng-chart-section pieng-projecao-geracao" style="margin:24px 0;padding:22px 18px 16px;background:#fff;border:1px solid ${PIENG_CHART.border};border-radius:16px;box-shadow:0 4px 20px rgba(15,23,42,.06);">
  <style>
    .pieng-projecao-geracao .pieng-geracao-bars { display:flex; align-items:flex-end; gap:6px; width:100%; height:100%; }
    .pieng-projecao-geracao .pieng-geracao-plot { position:relative; height:160px; }
    .pieng-projecao-geracao .pieng-geracao-media {
      position:absolute; left:0; right:0; z-index:2; pointer-events:none;
      border-top:2px dashed ${PIENG_CHART.accent};
    }
    .pieng-projecao-geracao .pieng-geracao-media span {
      position:absolute; right:0; transform:translateY(-100%);
      font-size:11px; font-weight:600; color:${PIENG_CHART.accent};
      background:rgba(248,250,252,.92); padding:0 4px;
    }
    .pieng-projecao-geracao .pieng-geracao-vals { display:none; gap:6px; margin-bottom:4px; }
    .pieng-projecao-geracao .pieng-geracao-hint { display:block; text-align:center; font-size:12px; color:${PIENG_CHART.muted}; margin:0 0 10px; }
    .pieng-projecao-geracao .pieng-geracao-col.is-active .pieng-geracao-bar { outline:2px solid ${PIENG_CHART.accent}; outline-offset:1px; }
    .pieng-projecao-geracao.is-compact .pieng-geracao-col:not(.is-active) .pieng-geracao-bar { opacity:0.45; }
    .pieng-projecao-geracao:not(.is-compact) .pieng-geracao-col .pieng-geracao-bar { opacity:1; }
    .pieng-projecao-geracao .pieng-geracao-var { display:none; }
    @media (min-width: 768px), (orientation: landscape) {
      .pieng-projecao-geracao .pieng-geracao-vals { display:flex; }
      .pieng-projecao-geracao .pieng-geracao-hint { display:none; }
      .pieng-projecao-geracao .pieng-geracao-var { display:inline; }
      .pieng-projecao-geracao .pieng-geracao-bars { gap:12px; }
      .pieng-projecao-geracao .pieng-geracao-bar { max-width:52px !important; width:85% !important; }
      .pieng-projecao-geracao .pieng-geracao-plot { height:180px; }
      .pieng-projecao-geracao.is-compact .pieng-geracao-col .pieng-geracao-bar { opacity:1; }
    }
    @media (min-width: 900px) {
      .pieng-projecao-geracao .pieng-geracao-bars { gap:14px; }
      .pieng-projecao-geracao .pieng-geracao-bar { max-width:72px !important; width:90% !important; }
      .pieng-projecao-geracao .pieng-geracao-plot { height:200px; }
    }
  </style>
  <h3 style="margin:0 0 4px;font-size:1.25rem;color:${PIENG_CHART.text};font-weight:700;">Projeção de geração ao longo do ano</h3>
  <p style="margin:0 0 14px;font-size:0.9rem;color:${PIENG_CHART.muted};">Sistema ${potTxt} kWp${onde} · kWh/mês</p>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-bottom:16px;">
    ${kpi('Anual estimada', `${anual.toLocaleString('pt-BR')} kWh`)}
    ${kpi('Média mensal', `${mediaTxt} kWh`)}
    ${kpi('Maior mês', `${meses[iMax]} · ${maxVal.toLocaleString('pt-BR')}`)}
    ${kpi('Menor mês', `${meses[iMin]} · ${minVal.toLocaleString('pt-BR')}`)}
  </div>
  <div style="background:${PIENG_CHART.surface};border:1px solid ${PIENG_CHART.border};border-radius:12px;padding:14px 8px 10px;">
    <p class="pieng-geracao-hint" data-hint>Média ${mediaTxt} kWh · toque em um mês para ver o valor</p>
    <div class="pieng-geracao-vals">${valuesRow}</div>
    <div class="pieng-geracao-plot">
      <div class="pieng-geracao-media" style="bottom:${mediaPct.toFixed(1)}%;">
        <span>Média ${mediaTxt}</span>
      </div>
      <div class="pieng-geracao-bars">${bars}</div>
    </div>
    <div style="display:flex;gap:6px;margin-top:6px;">${monthsRow}</div>
    <div style="display:flex;flex-wrap:wrap;gap:12px;margin-top:10px;font-size:12px;color:${PIENG_CHART.muted};">
      <span><span style="display:inline-block;width:12px;height:12px;background:${PIENG_CHART.bar};border-radius:2px;vertical-align:middle;margin-right:4px;"></span>Geração mensal</span>
      <span><span style="display:inline-block;width:18px;border-top:2px dashed ${PIENG_CHART.accent};vertical-align:middle;margin-right:4px;"></span>Média (${mediaTxt} kWh)</span>
      <span class="pieng-geracao-var" style="color:${PIENG_CHART.hint};">Variação pico→vale ${varTxt}%</span>
    </div>
  </div>
  <p style="margin:12px 0 0;font-size:0.75rem;color:${PIENG_CHART.hint};line-height:1.4;">Estimativa sazonal. A geração real varia com o clima, as condições do local, a orientação do telhado em relação ao sol, a limpeza dos módulos e outros fatores que podem interferir na geração.</p>
  <script>
  (function(){
    var root = document.getElementById('${uid}');
    if (!root) return;
    var hint = root.querySelector('[data-hint]');
    var ativo = null;
    var mediaTxt = ${JSON.stringify(mediaTxt)};
    function isCompleto(){
      return window.matchMedia('(min-width: 768px), (orientation: landscape)').matches;
    }
    function syncMode(){
      if (isCompleto()) {
        root.classList.remove('is-compact');
        ativo = null;
        root.querySelectorAll('.pieng-geracao-col, .pieng-geracao-mes').forEach(function(el){ el.classList.remove('is-active'); });
        if (hint) hint.textContent = 'Média ' + mediaTxt + ' kWh · toque em um mês para ver o valor';
      } else {
        root.classList.add('is-compact');
      }
    }
    function select(idx){
      if (isCompleto()) return;
      var cols = root.querySelectorAll('.pieng-geracao-col');
      var meses = root.querySelectorAll('.pieng-geracao-mes');
      if (ativo === idx) {
        ativo = null;
        cols.forEach(function(el){ el.classList.remove('is-active'); });
        meses.forEach(function(el){ el.classList.remove('is-active'); el.style.color=''; });
        if (hint) hint.textContent = 'Média ' + mediaTxt + ' kWh · toque em um mês para ver o valor';
        return;
      }
      ativo = idx;
      cols.forEach(function(el, i){
        if (i === idx) el.classList.add('is-active'); else el.classList.remove('is-active');
      });
      meses.forEach(function(el, i){
        if (i === idx) { el.classList.add('is-active'); el.style.color='${PIENG_CHART.accent}'; }
        else { el.classList.remove('is-active'); el.style.color=''; }
      });
      var col = cols[idx];
      if (hint && col) {
        hint.innerHTML = '<strong>' + col.getAttribute('data-mes') + ':</strong> ' +
          Number(col.getAttribute('data-kwh')).toLocaleString('pt-BR') + ' kWh';
      }
    }
    root.addEventListener('click', function(e){
      var btn = e.target && e.target.closest ? e.target.closest('[data-idx]') : null;
      if (!btn || !root.contains(btn)) return;
      select(Number(btn.getAttribute('data-idx')));
    });
    syncMode();
    window.matchMedia('(min-width: 768px), (orientation: landscape)').addEventListener('change', syncMode);
  })();
  </script>
</section>`;
}

// ============================================================================
// GRÁFICO: PAYBACK COMPARATIVO (Barras)
// ============================================================================

export function generatePaybackComparisonChart(
  sistemas: SistemaGrafico[]
): string {
  const nomes = sistemas.map(s => s.nome);
  const paybacks = sistemas.map(s => s.payback);
  
  // Cores diferentes para cada sistema
  const cores = [
    'rgba(46, 204, 113, 0.8)',  // Verde
    'rgba(52, 152, 219, 0.8)',  // Azul
    'rgba(241, 196, 15, 0.8)',  // Amarelo
    'rgba(230, 126, 34, 0.8)'   // Laranja
  ];

  return `
    <div class="chart-container" style="position: relative; height:350px; width:100%; max-width:700px; margin: 0 auto;">
      <canvas id="chartPaybackComparativo"></canvas>
    </div>
    <script>
      (function() {
        const ctx = document.getElementById('chartPaybackComparativo');
        if (!ctx) return;
        
        new Chart(ctx, {
          type: 'bar',
          data: {
            labels: ${JSON.stringify(nomes)},
            datasets: [{
              label: 'Payback (meses)',
              data: ${JSON.stringify(paybacks)},
              backgroundColor: ${JSON.stringify(cores.slice(0, sistemas.length))},
              borderWidth: 0,
              borderRadius: 8
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: {
              legend: {display: false},
              tooltip: {
                backgroundColor: 'rgba(0,0,0,0.8)',
                padding: 12,
                callbacks: {
                  label: function(context) {
                    return context.parsed.x.toFixed(1) + ' meses';
                  }
                }
              }
            },
            scales: {
              x: {
                beginAtZero: true,
                ticks: {
                  callback: function(value) {
                    return value.toFixed(0) + ' meses';
                  },
                  font: {size: 12}
                }
              },
              y: {
                ticks: {font: {size: 13, weight: 'bold'}}
              }
            }
          }
        });
      })();
    </script>
  `;
}

// ============================================================================
// GRÁFICO: POTÊNCIA COMPARATIVA (Barras)
// ============================================================================

export function generatePowerComparisonChart(
  sistemas: SistemaGrafico[]
): string {
  const nomes = sistemas.map(s => s.nome);
  const potencias = sistemas.map(s => s.potencia);

  return `
    <div class="chart-container" style="position: relative; height:350px; width:100%; max-width:700px; margin: 0 auto;">
      <canvas id="chartPotenciaComparativa"></canvas>
    </div>
    <script>
      (function() {
        const ctx = document.getElementById('chartPotenciaComparativa');
        if (!ctx) return;
        
        new Chart(ctx, {
          type: 'bar',
          data: {
            labels: ${JSON.stringify(nomes)},
            datasets: [{
              label: 'Potência (kWp)',
              data: ${JSON.stringify(potencias)},
              backgroundColor: 'rgba(155, 89, 182, 0.8)',
              borderColor: 'rgba(155, 89, 182, 1)',
              borderWidth: 2,
              borderRadius: 6
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: true,
                labels: {font: {size: 14, weight: 'bold'}}
              },
              tooltip: {
                backgroundColor: 'rgba(0,0,0,0.8)',
                padding: 12,
                callbacks: {
                  label: function(context) {
                    return context.parsed.y.toFixed(2) + ' kWp';
                  }
                }
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                ticks: {
                  callback: function(value) {
                    return value.toFixed(1) + ' kWp';
                  }
                }
              }
            }
          }
        });
      })();
    </script>
  `;
}

// ============================================================================
// GRÁFICO: ECONOMIA ACUMULADA (25 anos)
// ============================================================================

export function generateSavingsProjectionChart(
  investimento: number,
  economiaMensal: number,
  reajusteTarifario: number = 0.08  // 8% ao ano
): string {
  const anos = Array.from({length: 25}, (_, i) => i + 1);
  const economiaAcumulada: number[] = [];
  
  let acumulado = 0;
  for (let ano = 1; ano <= 25; ano++) {
    // Economia anual com reajuste tarifário
    const economiaAnual = economiaMensal * 12 * Math.pow(1 + reajusteTarifario, ano - 1);
    acumulado += economiaAnual;
    economiaAcumulada.push(Math.round(acumulado));
  }

  return `
    <div class="chart-container" style="position: relative; height:400px; width:100%; max-width:900px; margin: 0 auto;">
      <canvas id="chartEconomiaAcumulada"></canvas>
    </div>
    <script>
      (function() {
        const ctx = document.getElementById('chartEconomiaAcumulada');
        if (!ctx) return;
        
        new Chart(ctx, {
          type: 'line',
          data: {
            labels: ${JSON.stringify(anos.map(a => `Ano ${a}`))},
            datasets: [
              {
                label: 'Economia Acumulada',
                data: ${JSON.stringify(economiaAcumulada)},
                borderColor: 'rgba(46, 204, 113, 1)',
                backgroundColor: 'rgba(46, 204, 113, 0.1)',
                fill: true,
                tension: 0.3,
                borderWidth: 3,
                pointRadius: 0,
                pointHoverRadius: 6
              },
              {
                label: 'Investimento Inicial',
                data: Array(25).fill(${investimento}),
                borderColor: 'rgba(231, 76, 60, 1)',
                borderDash: [10, 5],
                borderWidth: 2,
                pointRadius: 0,
                fill: false
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: true,
                position: 'top',
                labels: {font: {size: 14, weight: 'bold'}}
              },
              tooltip: {
                backgroundColor: 'rgba(0,0,0,0.8)',
                padding: 12,
                callbacks: {
                  label: function(context) {
                    return context.dataset.label + ': R$ ' + 
                      context.parsed.y.toLocaleString('pt-BR', {minimumFractionDigits: 2});
                  }
                }
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                ticks: {
                  callback: function(value) {
                    return 'R$ ' + (value / 1000).toFixed(0) + 'k';
                  }
                }
              },
              x: {
                ticks: {
                  maxTicksLimit: 10
                }
              }
            }
          }
        });
      })();
    </script>
  `;
}

// ============================================================================
// GRÁFICO: COMPOSIÇÃO DE CUSTOS (Pizza)
// ============================================================================

export function generateCostBreakdownChart(custos: CustoBreakdown): string {
  const labels = ['Módulos', 'Inversores', 'Estrutura', 'Mão de Obra', 'Outros'];
  const valores = [
    custos.modulos,
    custos.inversores,
    custos.estrutura,
    custos.maoDeObra,
    custos.outros
  ];

  const cores = [
    'rgba(52, 152, 219, 0.8)',   // Azul
    'rgba(46, 204, 113, 0.8)',   // Verde
    'rgba(241, 196, 15, 0.8)',   // Amarelo
    'rgba(230, 126, 34, 0.8)',   // Laranja
    'rgba(155, 89, 182, 0.8)'    // Roxo
  ];

  return `
    <div class="chart-container" style="position: relative; height:400px; width:100%; max-width:500px; margin: 0 auto;">
      <canvas id="chartComposicaoCustos"></canvas>
    </div>
    <script>
      (function() {
        const ctx = document.getElementById('chartComposicaoCustos');
        if (!ctx) return;
        
        new Chart(ctx, {
          type: 'doughnut',
          data: {
            labels: ${JSON.stringify(labels)},
            datasets: [{
              data: ${JSON.stringify(valores)},
              backgroundColor: ${JSON.stringify(cores)},
              borderWidth: 3,
              borderColor: '#fff'
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'bottom',
                labels: {
                  font: {size: 13},
                  padding: 15,
                  generateLabels: function(chart) {
                    const data = chart.data;
                    const total = data.datasets[0].data.reduce((a, b) => a + b, 0);
                    return data.labels.map((label, i) => {
                      const value = data.datasets[0].data[i];
                      const percent = ((value / total) * 100).toFixed(1);
                      return {
                        text: label + ': R$ ' + value.toLocaleString('pt-BR') + ' (' + percent + '%)',
                        fillStyle: data.datasets[0].backgroundColor[i],
                        hidden: false,
                        index: i
                      };
                    });
                  }
                }
              },
              tooltip: {
                backgroundColor: 'rgba(0,0,0,0.8)',
                padding: 12,
                callbacks: {
                  label: function(context) {
                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                    const percent = ((context.parsed / total) * 100).toFixed(1);
                    return context.label + ': R$ ' + 
                      context.parsed.toLocaleString('pt-BR') + ' (' + percent + '%)';
                  }
                }
              }
            }
          }
        });
      })();
    </script>
  `;
}

// ============================================================================
// GRÁFICO: CONSUMO SAZONAL (Rural - Safra vs Entressafra)
// ============================================================================

export function generateSeasonalConsumptionChart(
  consumoSafra: number[],      // 12 meses
  consumoEntressafra: number[] // 12 meses
): string {
  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  return `
    <div class="chart-container" style="position: relative; height:400px; width:100%; max-width:800px; margin: 0 auto;">
      <canvas id="chartConsumoSazonal"></canvas>
    </div>
    <script>
      (function() {
        const ctx = document.getElementById('chartConsumoSazonal');
        if (!ctx) return;
        
        new Chart(ctx, {
          type: 'line',
          data: {
            labels: ${JSON.stringify(meses)},
            datasets: [
              {
                label: 'Consumo Safra',
                data: ${JSON.stringify(consumoSafra)},
                borderColor: 'rgba(46, 204, 113, 1)',
                backgroundColor: 'rgba(46, 204, 113, 0.1)',
                fill: true,
                tension: 0.4,
                borderWidth: 3
              },
              {
                label: 'Consumo Entressafra',
                data: ${JSON.stringify(consumoEntressafra)},
                borderColor: 'rgba(241, 196, 15, 1)',
                backgroundColor: 'rgba(241, 196, 15, 0.1)',
                fill: true,
                tension: 0.4,
                borderWidth: 3
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: true,
                position: 'top',
                labels: {font: {size: 14, weight: 'bold'}}
              },
              tooltip: {
                backgroundColor: 'rgba(0,0,0,0.8)',
                padding: 12,
                callbacks: {
                  label: function(context) {
                    return context.dataset.label + ': ' + 
                      context.parsed.y.toLocaleString('pt-BR') + ' kWh';
                  }
                }
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                ticks: {
                  callback: function(value) {
                    return value.toLocaleString('pt-BR') + ' kWh';
                  }
                }
              }
            }
          }
        });
      })();
    </script>
  `;
}

// ============================================================================
// GRÁFICO: CONSUMO POR HORÁRIO (Comercial - Pico vs Fora-Pico)
// ============================================================================

export function generatePeakHoursChart(
  consumoPico: number[],      // 24 horas
  consumoForaPico: number[]   // 24 horas
): string {
  const horas = Array.from({length: 24}, (_, i) => `${i}h`);

  return `
    <div class="chart-container" style="position: relative; height:400px; width:100%; max-width:900px; margin: 0 auto;">
      <canvas id="chartHorarioPico"></canvas>
    </div>
    <script>
      (function() {
        const ctx = document.getElementById('chartHorarioPico');
        if (!ctx) return;
        
        new Chart(ctx, {
          type: 'bar',
          data: {
            labels: ${JSON.stringify(horas)},
            datasets: [
              {
                label: 'Horário de Pico',
                data: ${JSON.stringify(consumoPico)},
                backgroundColor: 'rgba(231, 76, 60, 0.7)',
                stack: 'Stack 0'
              },
              {
                label: 'Horário Fora-Pico',
                data: ${JSON.stringify(consumoForaPico)},
                backgroundColor: 'rgba(46, 204, 113, 0.7)',
                stack: 'Stack 0'
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: true,
                labels: {font: {size: 14, weight: 'bold'}}
              },
              tooltip: {
                backgroundColor: 'rgba(0,0,0,0.8)',
                padding: 12,
                callbacks: {
                  label: function(context) {
                    return context.dataset.label + ': ' + 
                      context.parsed.y.toFixed(0) + ' kW';
                  }
                }
              }
            },
            scales: {
              y: {
                stacked: true,
                beginAtZero: true,
                ticks: {
                  callback: function(value) {
                    return value + ' kW';
                  }
                }
              },
              x: {
                stacked: true
              }
            }
          }
        });
      })();
    </script>
  `;
}
