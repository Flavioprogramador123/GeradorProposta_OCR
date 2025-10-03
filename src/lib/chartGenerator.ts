/**
 * 📊 GERADOR DE GRÁFICOS - PIENG SOLAR
 * 
 * Biblioteca para gerar gráficos HTML/Canvas usando Chart.js inline.
 * Todos os gráficos são autocontidos (incluem Chart.js CDN e configuração).
 */

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
// GRÁFICO: GERAÇÃO MENSAL (12 meses)
// ============================================================================

export function generateMonthlyGenerationChart(
  potenciaKwp: number,
  hspMensal: number[],  // 12 valores (Jan-Dez)
  performanceRate: number = 0.75
): string {
  // Calcular geração para cada mês
  const geracaoMensal = hspMensal.map(hsp =>
    Math.round(potenciaKwp * hsp * 30.4 * performanceRate)
  );

  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  return `
    <div class="chart-container" style="position: relative; height:400px; width:100%; max-width:800px; margin: 0 auto;">
      <canvas id="chartGeracaoMensal"></canvas>
    </div>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
    <script>
      (function() {
        const ctx = document.getElementById('chartGeracaoMensal');
        if (!ctx) return;
        
        new Chart(ctx, {
          type: 'bar',
          data: {
            labels: ${JSON.stringify(meses)},
            datasets: [{
              label: 'Geração Mensal (kWh)',
              data: ${JSON.stringify(geracaoMensal)},
              backgroundColor: 'rgba(46, 204, 113, 0.8)',
              borderColor: 'rgba(46, 204, 113, 1)',
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
                position: 'top',
                labels: {
                  font: {size: 14, weight: 'bold'},
                  color: '#2c3e50'
                }
              },
              tooltip: {
                backgroundColor: 'rgba(0,0,0,0.8)',
                padding: 12,
                titleFont: {size: 14},
                bodyFont: {size: 13},
                callbacks: {
                  label: function(context) {
                    return context.dataset.label + ': ' + context.parsed.y.toLocaleString('pt-BR') + ' kWh';
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
                  },
                  font: {size: 12},
                  color: '#555'
                },
                grid: {color: 'rgba(0,0,0,0.05)'}
              },
              x: {
                ticks: {
                  font: {size: 12},
                  color: '#555'
                },
                grid: {display: false}
              }
            }
          }
        });
      })();
    </script>
  `;
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
