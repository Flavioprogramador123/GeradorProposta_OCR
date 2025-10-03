import yaml from 'js-yaml';
import fs from 'fs';

interface OrcamentoBase {
  orcamento_id?: string;
  arquivo_origem: string;
  preco_total: number; // PREÇO DE CUSTO dos equipamentos
  potencia_total_sistema?: string;
  inversores: Array<{
    quantidade: number;
    marca: string;
    potencia_unitaria: string;
  }>;
  modulos: Array<{
    quantidade: number;
    marca: string;
    potencia_unitaria: string;
  }>;
}

interface OrcamentoCompleto extends OrcamentoBase {
  preco_custo: number;        // Preço dos equipamentos (do YAML)
  preco_despesa: number;      // Preço de despesa (mão de obra, instalação, etc.)
  preco_total_final: number;  // preco_custo + preco_despesa
  custo_kwp: number;          // preco_total_final / potencia_kwp
  ajustes_pontuais?: {        // Ajustes específicos por orçamento
    motivo: string;
    valor_ajuste: number;
    preco_final_ajustado: number;
  };
}

interface ConfiguracaoPrecos {
  preco_despesa_global: number;     // Preço de despesa padrão para todos
  percentual_despesa: number;       // % sobre o custo (alternativa)
  usar_percentual: boolean;         // Se usa valor fixo ou percentual
  ajustes_por_distribuidor?: {      // Ajustes específicos por distribuidor
    [distribuidor: string]: {
      preco_despesa: number;
      motivo: string;
    };
  };
  ajustes_por_orcamento?: {         // Ajustes específicos por orçamento
    [orcamento_id: string]: {
      preco_despesa: number;
      motivo: string;
    };
  };
}

export class CalculadorPrecos {
  private dadosOriginais: any;
  private configuracaoPrecos: ConfiguracaoPrecos;
  private orcamentosProcessados: OrcamentoCompleto[] = [];

  constructor(caminhoArquivo: string, configuracaoPrecos: ConfiguracaoPrecos) {
    const conteudo = fs.readFileSync(caminhoArquivo, 'utf-8');
    this.dadosOriginais = yaml.load(conteudo);
    this.configuracaoPrecos = configuracaoPrecos;
    this.processarOrcamentos();
  }

  private calcularPotenciaTotal(inversores: any[], modulos: any[]): number {
    const potenciaModulos = modulos.reduce((total, mod) => {
      const potenciaW = parseFloat(mod.potencia_unitaria.replace(/[^\d.]/g, ''));
      return total + (potenciaW * mod.quantidade);
    }, 0);
    return potenciaModulos / 1000; // Converter para kWp
  }

  private calcularPrecoDespesa(orcamento: OrcamentoBase, distribuidor: string): number {
    const precoCusto = orcamento.preco_total;
    
    // 1. Verificar se há ajuste específico por orçamento
    if (this.configuracaoPrecos.ajustes_por_orcamento?.[orcamento.orcamento_id || '']) {
      return this.configuracaoPrecos.ajustes_por_orcamento[orcamento.orcamento_id || ''].preco_despesa;
    }
    
    // 2. Verificar se há ajuste específico por distribuidor
    if (this.configuracaoPrecos.ajustes_por_distribuidor?.[distribuidor]) {
      return this.configuracaoPrecos.ajustes_por_distribuidor[distribuidor].preco_despesa;
    }
    
    // 3. Usar configuração global
    if (this.configuracaoPrecos.usar_percentual) {
      return precoCusto * (this.configuracaoPrecos.percentual_despesa / 100);
    } else {
      return this.configuracaoPrecos.preco_despesa_global;
    }
  }

  private processarOrcamentos(): void {
    // Coletar todos os orçamentos
    Object.entries(this.dadosOriginais.consolidado_orcamentos_distribuidores).forEach(([distribuidor, orcamentos]: [string, any]) => {
      (orcamentos as any[]).forEach(({ orcamento }) => {
        const potenciaKwp = this.calcularPotenciaTotal(orcamento.inversores, orcamento.modulos);
        const precoCusto = orcamento.preco_total;
        const precoDespesa = this.calcularPrecoDespesa(orcamento, distribuidor);
        const precoTotalFinal = precoCusto + precoDespesa;
        const custoKwp = precoTotalFinal / potenciaKwp;
        
        this.orcamentosProcessados.push({
          ...orcamento,
          preco_custo: precoCusto,
          preco_despesa: precoDespesa,
          preco_total_final: precoTotalFinal,
          custo_kwp: custoKwp,
          potenciaKwp: potenciaKwp
        });
      });
    });

    // Ordenar por custo por kWp (menor é melhor)
    this.orcamentosProcessados.sort((a, b) => a.custo_kwp - b.custo_kwp);
  }

  public aplicarAjustePontual(orcamentoId: string, valorAjuste: number, motivo: string): void {
    const orcamento = this.orcamentosProcessados.find(o => o.orcamento_id === orcamentoId);
    if (orcamento) {
      orcamento.ajustes_pontuais = {
        motivo,
        valor_ajuste: valorAjuste,
        preco_final_ajustado: orcamento.preco_total_final + valorAjuste
      };
      
      // Recalcular custo por kWp
      orcamento.custo_kwp = orcamento.ajustes_pontuais.preco_final_ajustado / (orcamento as any).potenciaKwp;
      
      // Reordenar por custo por kWp
      this.orcamentosProcessados.sort((a, b) => a.custo_kwp - b.custo_kwp);
    }
  }

  public selecionarTop5PNL(): any[] {
    const total = this.orcamentosProcessados.length;
    
    // Estratégia PNL: Selecionar 5 orçamentos estrategicamente posicionados
    const selecionados = [
      this.orcamentosProcessados[0], // MELHOR CUSTO (Ancoragem)
      this.orcamentosProcessados[Math.floor(total * 0.2)], // 20% (Decoy Effect)
      this.orcamentosProcessados[Math.floor(total * 0.4)], // 40% (Social Proof)
      this.orcamentosProcessados[Math.floor(total * 0.6)], // 60% (Urgência)
      this.orcamentosProcessados[Math.min(total - 1, Math.floor(total * 0.8))] // 80% (Autoridade)
    ];

    return selecionados.filter(Boolean); // Remove undefined se não houver orçamentos suficientes
  }

  public gerarDadosComPrecos(): any {
    const top5 = this.selecionarTop5PNL();
    
    return {
      configuracao_precos: this.configuracaoPrecos,
      orcamentos_processados: this.orcamentosProcessados,
      top_5_propostas: top5.map((orcamento, index) => ({
        proposta_id: `proposta_${String(index + 1).padStart(2, '0')}`,
        titulo: `Opção ${index + 1}`,
        distribuidor: orcamento.distribuidor || 'N/A',
        orcamento_id: orcamento.orcamento_id || `ORC_${index + 1}`,
        arquivo_origem: orcamento.arquivo_origem,
        preco_custo: orcamento.preco_custo,
        preco_despesa: orcamento.preco_despesa,
        preco_total_final: orcamento.preco_total_final,
        potencia_total_sistema: `${orcamento.potenciaKwp.toFixed(1)} kWp`,
        custo_kwp: `R$ ${orcamento.custo_kwp.toFixed(2)}/kWp`,
        inversores: orcamento.inversores,
        modulos: orcamento.modulos,
        ajustes_pontuais: orcamento.ajustes_pontuais,
        estrategia_pnl: this.getEstrategiaPNL(index)
      })),
      resumo_financeiro: {
        total_orcamentos: this.orcamentosProcessados.length,
        menor_preco_custo: Math.min(...this.orcamentosProcessados.map(o => o.preco_custo)),
        maior_preco_custo: Math.max(...this.orcamentosProcessados.map(o => o.preco_custo)),
        menor_preco_final: Math.min(...this.orcamentosProcessados.map(o => o.preco_total_final)),
        maior_preco_final: Math.max(...this.orcamentosProcessados.map(o => o.preco_total_final)),
        preco_despesa_global: this.configuracaoPrecos.preco_despesa_global,
        melhor_custo_kwp: `R$ ${this.orcamentosProcessados[0].custo_kwp.toFixed(2)}/kWp`
      }
    };
  }

  private getEstrategiaPNL(index: number): string {
    const estrategias = [
      'ancoragem',      // 0 - Melhor custo
      'decoy_effect',   // 1 - Equilíbrio
      'social_proof',   // 2 - Potência
      'urgencia',       // 3 - Menor investimento
      'autoridade'      // 4 - Premium
    ];
    return estrategias[index] || 'padrao';
  }

  public salvarDadosComPrecos(caminhoSaida: string): void {
    const dadosComPrecos = this.gerarDadosComPrecos();
    const yamlContent = yaml.dump(dadosComPrecos, { 
      indent: 2,
      lineWidth: 120,
      noRefs: true
    });
    
    fs.writeFileSync(caminhoSaida, yamlContent, 'utf-8');
    console.log(`✅ Dados com preços salvos em: ${caminhoSaida}`);
  }

  public getResumoPrecos(): void {
    console.log('💰 RESUMO DE PREÇOS:');
    console.log(`📊 Total de orçamentos: ${this.orcamentosProcessados.length}`);
    console.log(`🔧 Preço de despesa global: R$ ${this.configuracaoPrecos.preco_despesa_global.toFixed(2)}`);
    console.log(`📈 Faixa de preços (custo): R$ ${Math.min(...this.orcamentosProcessados.map(o => o.preco_custo)).toFixed(2)} - R$ ${Math.max(...this.orcamentosProcessados.map(o => o.preco_custo)).toFixed(2)}`);
    console.log(`📈 Faixa de preços (final): R$ ${Math.min(...this.orcamentosProcessados.map(o => o.preco_total_final)).toFixed(2)} - R$ ${Math.max(...this.orcamentosProcessados.map(o => o.preco_total_final)).toFixed(2)}`);
    console.log(`🏆 Melhor custo/kWp: R$ ${this.orcamentosProcessados[0].custo_kwp.toFixed(2)}/kWp`);
  }
}

// Função utilitária para configuração rápida
export function configurarPrecos(
  precoDespesaGlobal: number,
  usarPercentual: boolean = false,
  percentualDespesa: number = 0,
  ajustesDistribuidor?: { [key: string]: { preco_despesa: number; motivo: string } },
  ajustesOrcamento?: { [key: string]: { preco_despesa: number; motivo: string } }
): ConfiguracaoPrecos {
  return {
    preco_despesa_global: precoDespesaGlobal,
    percentual_despesa: percentualDespesa,
    usar_percentual: usarPercentual,
    ajustes_por_distribuidor: ajustesDistribuidor,
    ajustes_por_orcamento: ajustesOrcamento
  };
}
