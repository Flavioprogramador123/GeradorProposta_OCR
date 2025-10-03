// 🐍 Integração Python para Cálculos Técnicos Precisos
// Evita alucinações da IA em cálculos matemáticos críticos

import { spawn } from 'child_process';
import path from 'path';

export interface SolarCalculationInput {
  // Dados do Sistema
  potenciaModulos: number; // kWp
  quantidadeModulos: number;
  potenciaInversor: number; // kW
  eficienciaInversor: number; // %
  
  // Dados Locais
  hspLocal: number; // Horas Sol Pico
  latitude?: number;
  inclinacao?: number;
  orientacao?: number; // Azimute
  
  // Dados Financeiros
  valorSistema: number; // R$
  tarifaEnergia: number; // R$/kWh
  consumoMensal: number; // kWh/mês
  
  // Configurações
  performanceRatio: number; // 0.85 padrão
  degradacaoAnual: number; // 0.5% padrão
  inflacao: number; // %
  selic: number; // %
  vidaUtil: number; // anos (25 padrão)
}

export interface SolarCalculationResult {
  // Geração
  geracaoMensal: number; // kWh/mês
  geracaoAnual: number; // kWh/ano
  cobertura: number; // %
  
  // Financeiro
  economia: {
    mensal: number; // R$/mês
    anual: number; // R$/ano
    acumulada25Anos: number; // R$
  };
  
  // Indicadores
  payback: {
    simples: number; // anos
    descontado: number; // anos
  };
  
  tir: number; // %
  vpl: number; // R$
  
  // Validação
  dimensionamento: {
    adequado: boolean;
    observacoes: string[];
    recomendacoes: string[];
  };
}

export class PythonCalculator {
  private pythonScriptPath: string;
  
  constructor() {
    this.pythonScriptPath = path.join(process.cwd(), 'python', 'solar_calculator.py');
  }

  // 🧮 Executar cálculos técnicos via Python
  async calculateSolarSystem(input: SolarCalculationInput): Promise<SolarCalculationResult> {
    return new Promise((resolve, reject) => {
      const pythonProcess = spawn('python', [this.pythonScriptPath, JSON.stringify(input)]);
      
      let result = '';
      let error = '';
      
      pythonProcess.stdout.on('data', (data) => {
        result += data.toString();
      });
      
      pythonProcess.stderr.on('data', (data) => {
        error += data.toString();
      });
      
      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          console.error('❌ Erro no Python:', error);
          // Fallback para cálculo JavaScript
          resolve(this.fallbackCalculation(input));
        } else {
          try {
            const parsedResult = JSON.parse(result);
            resolve(parsedResult);
          } catch (parseError) {
            console.error('❌ Erro ao parsear resultado Python:', parseError);
            resolve(this.fallbackCalculation(input));
          }
        }
      });
    });
  }

  // 📊 Validar dados extraídos pela IA
  async validateExtractedData(aiData: any): Promise<any> {
    const validationResult = {
      isValid: true,
      errors: [] as string[],
      warnings: [] as string[],
      correctedData: { ...aiData }
    };

    // Validar potência dos módulos
    if (aiData.modulos?.potencia) {
      const potencia = Number(aiData.modulos.potencia);
      if (potencia < 300 || potencia > 800) {
        validationResult.warnings.push(`Potência do módulo (${potencia}W) fora do padrão comum (300-800W)`);
      }
    }

    // Validar potência do inversor
    if (aiData.inversores?.potencia && aiData.modulos?.potencia && aiData.modulos?.quantidade) {
      const potenciaModulos = aiData.modulos.potencia * aiData.modulos.quantidade / 1000; // kWp
      const potenciaInversor = Number(aiData.inversores.potencia);
      const ratio = potenciaModulos / potenciaInversor;
      
      if (ratio < 1.0 || ratio > 1.5) {
        validationResult.warnings.push(
          `Ratio CC/CA (${ratio.toFixed(2)}) fora do ideal (1.0-1.5). ` +
          `Sistema: ${potenciaModulos.toFixed(2)}kWp / Inversor: ${potenciaInversor}kW`
        );
      }
    }

    // Validar valores financeiros
    if (aiData.valorTotal) {
      const valor = Number(aiData.valorTotal);
      const potencia = (aiData.modulos?.potencia || 0) * (aiData.modulos?.quantidade || 0) / 1000;
      const precoWp = valor / (potencia * 1000);
      
      if (precoWp < 2 || precoWp > 8) {
        validationResult.warnings.push(`Preço por Wp (R$ ${precoWp.toFixed(2)}) fora da faixa comum (R$ 2-8/Wp)`);
      }
    }

    // Detectar inconsistências comuns
    if (aiData.modulos?.modelo && aiData.modulos?.potencia) {
      const modeloText = String(aiData.modulos.modelo).toLowerCase();
      const potenciaExtraida = Number(aiData.modulos.potencia);
      
      // Tentar extrair potência do modelo
      const potenciaRegex = /(\d{3,4})\s*w/i;
      const potenciaNoModelo = modeloText.match(potenciaRegex);
      
      if (potenciaNoModelo) {
        const potenciaModelo = Number(potenciaNoModelo[1]);
        if (Math.abs(potenciaModelo - potenciaExtraida) > 10) {
          validationResult.correctedData.modulos.potencia = potenciaModelo;
          validationResult.warnings.push(
            `Potência corrigida de ${potenciaExtraida}W para ${potenciaModelo}W baseada no modelo`
          );
        }
      }
    }

    return validationResult;
  }

  // 🔍 Análise técnica avançada
  async analyzeTechnicalFeasibility(systemData: any, clientData: any): Promise<any> {
    const analysis = {
      viabilidade: 'adequado' as 'adequado' | 'subDimensionado' | 'superDimensionado',
      score: 100,
      observacoes: [] as string[],
      recomendacoes: [] as string[]
    };

    const potenciaTotal = systemData.modulos.potencia * systemData.modulos.quantidade / 1000; // kWp
    const consumoMensal = Number(clientData.consumoKwh || 0);
    const hsp = Number(clientData.hspLocal || 5.21);
    
    // Calcular geração estimada
    const geracaoMensal = potenciaTotal * hsp * 30 * 0.85; // Performance Ratio 0.85
    const cobertura = (geracaoMensal / consumoMensal) * 100;
    
    // Análise de dimensionamento
    if (cobertura < 80) {
      analysis.viabilidade = 'subDimensionado';
      analysis.score -= 20;
      analysis.observacoes.push(`Sistema cobrirá apenas ${cobertura.toFixed(1)}% do consumo`);
      analysis.recomendacoes.push('Considerar aumentar a potência do sistema');
    } else if (cobertura > 120) {
      analysis.viabilidade = 'superDimensionado';
      analysis.score -= 10;
      analysis.observacoes.push(`Sistema gerará ${cobertura.toFixed(1)}% do consumo (excesso)`);
      analysis.recomendacoes.push('Sistema pode ser otimizado para reduzir custos');
    } else {
      analysis.observacoes.push(`Excelente dimensionamento: ${cobertura.toFixed(1)}% de cobertura`);
    }

    // Análise de ROI
    const valorTotal = Number(systemData.valorTotal || 0);
    const economiaAnual = geracaoMensal * 12 * 0.65; // R$/kWh médio
    const paybackSimples = valorTotal / economiaAnual;
    
    if (paybackSimples > 8) {
      analysis.score -= 15;
      analysis.observacoes.push(`Payback longo: ${paybackSimples.toFixed(1)} anos`);
      analysis.recomendacoes.push('Buscar fornecedores com melhor custo-benefício');
    } else if (paybackSimples < 5) {
      analysis.score += 10;
      analysis.observacoes.push(`Excelente payback: ${paybackSimples.toFixed(1)} anos`);
    }

    return analysis;
  }

  // 🔧 Cálculo fallback em JavaScript (backup)
  private fallbackCalculation(input: SolarCalculationInput): SolarCalculationResult {
    console.log('🔧 Usando cálculo fallback JavaScript');
    
    // Cálculos básicos
    const potenciaTotal = input.potenciaModulos * input.quantidadeModulos / 1000; // kWp
    const geracaoMensal = potenciaTotal * input.hspLocal * 30 * input.performanceRatio;
    const geracaoAnual = geracaoMensal * 12;
    const cobertura = (geracaoMensal / input.consumoMensal) * 100;
    
    // Economia
    const economiaMensal = Math.min(geracaoMensal, input.consumoMensal) * input.tarifaEnergia;
    const economiaAnual = economiaMensal * 12;
    
    // Payback simples
    const paybackSimples = input.valorSistema / economiaAnual;
    
    // VPL simplificado (sem crescimento da tarifa)
    const taxaDesconto = input.selic / 100;
    let vpl = -input.valorSistema;
    
    for (let ano = 1; ano <= input.vidaUtil; ano++) {
      const fluxoAnual = economiaAnual * Math.pow(1 - input.degradacaoAnual/100, ano);
      vpl += fluxoAnual / Math.pow(1 + taxaDesconto, ano);
    }
    
    // TIR simplificada
    const tir = (economiaAnual / input.valorSistema) * 100;
    
    return {
      geracaoMensal,
      geracaoAnual,
      cobertura,
      economia: {
        mensal: economiaMensal,
        anual: economiaAnual,
        acumulada25Anos: economiaAnual * input.vidaUtil
      },
      payback: {
        simples: paybackSimples,
        descontado: paybackSimples * 1.2 // Aproximação
      },
      tir,
      vpl,
      dimensionamento: {
        adequado: cobertura >= 80 && cobertura <= 120,
        observacoes: [
          `Sistema ${potenciaTotal.toFixed(2)}kWp`,
          `Cobertura: ${cobertura.toFixed(1)}%`,
          `Payback: ${paybackSimples.toFixed(1)} anos`
        ],
        recomendacoes: cobertura < 80 
          ? ['Considerar aumentar potência do sistema']
          : cobertura > 120 
          ? ['Sistema pode ser otimizado']
          : ['Sistema bem dimensionado']
      }
    };
  }
}

// 🏭 Instância global
export const pythonCalculator = new PythonCalculator();