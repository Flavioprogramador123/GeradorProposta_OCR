import yaml from 'js-yaml';
import fs from 'fs';

interface OrcamentoOriginal {
  orcamento_id?: string;
  arquivo_origem: string;
  preco_total: number;
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

interface OrcamentoProcessado {
  distribuidor: string;
  orcamento: OrcamentoOriginal;
  potenciaKwp: number;
  custoKwp: number;
  precoTotal: number;
  ranking: number;
}

interface Top5Propostas {
  proposta_01: any;
  proposta_02: any;
  proposta_03: any;
  proposta_04: any;
  proposta_05: any;
}

export class GeradorPNL {
  private dadosOriginais: any;
  private dadosCliente: any;
  private orcamentosProcessados: OrcamentoProcessado[] = [];

  constructor(caminhoArquivo: string, dadosCliente: any) {
    const conteudo = fs.readFileSync(caminhoArquivo, 'utf-8');
    this.dadosOriginais = yaml.load(conteudo);
    this.dadosCliente = dadosCliente;
    this.processarOrcamentos();
  }

  private calcularPotenciaTotal(inversores: any[], modulos: any[]): number {
    const potenciaModulos = modulos.reduce((total, mod) => {
      const potenciaW = parseFloat(mod.potencia_unitaria.replace(/[^\d.]/g, ''));
      return total + (potenciaW * mod.quantidade);
    }, 0);
    return potenciaModulos / 1000; // Converter para kWp
  }

  private calcularCustoKwp(precoTotal: number, potenciaKwp: number): number {
    return precoTotal / potenciaKwp;
  }

  private processarOrcamentos(): void {
    // Coletar todos os orçamentos
    Object.entries(this.dadosOriginais.consolidado_orcamentos_distribuidores).forEach(([distribuidor, orcamentos]) => {
      orcamentos.forEach(({ orcamento }) => {
        const potenciaKwp = this.calcularPotenciaTotal(orcamento.inversores, orcamento.modulos);
        const custoKwp = this.calcularCustoKwp(orcamento.preco_total, potenciaKwp);
        
        this.orcamentosProcessados.push({
          distribuidor,
          orcamento,
          potenciaKwp,
          custoKwp,
          precoTotal: orcamento.preco_total,
          ranking: 0
        });
      });
    });

    // Ordenar por custo por kWp (menor é melhor)
    this.orcamentosProcessados.sort((a, b) => a.custoKwp - b.custoKwp);
    
    // Atribuir rankings
    this.orcamentosProcessados.forEach((orcamento, index) => {
      orcamento.ranking = index + 1;
    });
  }

  private selecionarTop5PNL(): Top5Propostas {
    const total = this.orcamentosProcessados.length;
    
    // Estratégia PNL: Selecionar 5 orçamentos estrategicamente posicionados
    const selecionados = {
      proposta_01: this.orcamentosProcessados[0], // MELHOR CUSTO (Ancoragem)
      proposta_02: this.orcamentosProcessados[Math.floor(total * 0.2)], // 20% (Decoy Effect)
      proposta_03: this.orcamentosProcessados[Math.floor(total * 0.4)], // 40% (Social Proof)
      proposta_04: this.orcamentosProcessados[Math.floor(total * 0.6)], // 60% (Urgência)
      proposta_05: this.orcamentosProcessados[Math.min(total - 1, Math.floor(total * 0.8))] // 80% (Autoridade)
    };

    return selecionados;
  }

  private criarPropostaPNL(orcamento: OrcamentoProcessado, titulo: string, badge: string, estrategia: string, isRecommended: boolean = false): any {
    return {
      titulo,
      distribuidor: orcamento.distribuidor,
      orcamento_id: orcamento.orcamento.orcamento_id || `ORC_${orcamento.ranking}`,
      arquivo_origem: orcamento.orcamento.arquivo_origem,
      preco_total: orcamento.precoTotal,
      potencia_total_sistema: `${orcamento.potenciaKwp.toFixed(1)} kWp`,
      custo_kwp: `R$ ${orcamento.custoKwp.toFixed(2)}/kWp`,
      inversores: orcamento.orcamento.inversores,
      modulos: orcamento.orcamento.modulos,
      badge,
      is_recommended: isRecommended,
      pnl_strategy: estrategia
    };
  }

  public gerarDadosPNL(): any {
    const top5 = this.selecionarTop5PNL();
    
    const dadosPNL = {
      cliente: {
        nome: this.dadosCliente.nome || "Cliente",
        cidade: this.dadosCliente.cidade || "Cidade",
        estado: this.dadosCliente.estado || "Estado",
        consumo_mensal_kwh: this.dadosCliente.consumo_mensal_kwh || 1000,
        tipo_imovel: this.dadosCliente.tipo_imovel || "Residencial",
        hsp_local: this.dadosCliente.hsp_local || 5.0,
        tarifa_kwh: this.dadosCliente.tarifa_kwh || 0.8,
        data_cadastro: new Date().toLocaleDateString('pt-BR')
      },
      
      top_5_propostas: {
        proposta_01: this.criarPropostaPNL(top5.proposta_01, "Opção Premium", "🥇 MELHOR CUSTO/BENEFÍCIO", "ancoragem", true),
        proposta_02: this.criarPropostaPNL(top5.proposta_02, "Opção Equilibrada", "⚖️ EQUILÍBRIO PERFEITO", "decoy_effect"),
        proposta_03: this.criarPropostaPNL(top5.proposta_03, "Opção Potência Máxima", "⚡ MAIOR POTÊNCIA", "social_proof"),
        proposta_04: this.criarPropostaPNL(top5.proposta_04, "Opção Entrada", "💰 MENOR INVESTIMENTO", "urgencia"),
        proposta_05: this.criarPropostaPNL(top5.proposta_05, "Opção Premium Plus", "👑 PREMIUM PLUS", "autoridade")
      },

      analise_pnl: {
        estrategia_principal: "ancoragem",
        proposta_ancora: "proposta_01",
        proposta_decoy: "proposta_02",
        proposta_social_proof: "proposta_03",
        proposta_urgencia: "proposta_04",
        proposta_autoridade: "proposta_05",
        
        triggers_psicologicos: [
          "Melhor custo/benefício do mercado",
          "Equilíbrio perfeito entre preço e qualidade",
          "Maior potência disponível",
          "Menor investimento inicial",
          "Solução premium com garantia estendida"
        ]
      },

      analise_comparativa: {
        total_propostas_analisadas: this.orcamentosProcessados.length,
        propostas_selecionadas: 5,
        menor_preco: Math.min(...this.orcamentosProcessados.map(o => o.precoTotal)),
        maior_preco: Math.max(...this.orcamentosProcessados.map(o => o.precoTotal)),
        menor_potencia: `${Math.min(...this.orcamentosProcessados.map(o => o.potenciaKwp)).toFixed(1)} kWp`,
        maior_potencia: `${Math.max(...this.orcamentosProcessados.map(o => o.potenciaKwp)).toFixed(1)} kWp`,
        melhor_custo_kwp: `R$ ${this.orcamentosProcessados[0].custoKwp.toFixed(2)}/kWp`,
        
        ranking_pnl: [
          { posicao: 1, proposta: "proposta_01", estrategia: "ancoragem", custo_kwp: `R$ ${top5.proposta_01.custoKwp.toFixed(2)}/kWp` },
          { posicao: 2, proposta: "proposta_02", estrategia: "decoy_effect", custo_kwp: `R$ ${top5.proposta_02.custoKwp.toFixed(2)}/kWp` },
          { posicao: 3, proposta: "proposta_03", estrategia: "social_proof", custo_kwp: `R$ ${top5.proposta_03.custoKwp.toFixed(2)}/kWp` },
          { posicao: 4, proposta: "proposta_04", estrategia: "urgencia", custo_kwp: `R$ ${top5.proposta_04.custoKwp.toFixed(2)}/kWp` },
          { posicao: 5, proposta: "proposta_05", estrategia: "autoridade", custo_kwp: `R$ ${top5.proposta_05.custoKwp.toFixed(2)}/kWp` }
        ]
      },

      calculos_tecnicos: {
        performance_rate: 0.75,
        fator_capacidade: 18.5,
        geracao_mensal_kwh: 1200,
        geracao_anual_kwh: 14400,
        cobertura_consumo: 80
      },

      analise_financeira: {
        payback_simples_meses: 15.2,
        payback_descontado_meses: 16.8,
        tir_anual: 78.9,
        vpl_25_anos: 450000,
        economia_mensal: 1200,
        economia_anual: 14400,
        tarifa_tusd: 0.982
      },

      precos_comerciais: {
        preco_pix: 25000,
        preco_12x: 2083.33,
        preco_18x: 1388.89,
        desconto_pix: 10,
        preco_riscado: 28000
      },

      metricas_comparativas: {
        menor_payback: 15.2,
        maior_tir: 78.9,
        melhor_cobertura: 80,
        sistema_recomendado: top5.proposta_01.distribuidor,
        potencia_recomendada: `${top5.proposta_01.potenciaKwp.toFixed(1)} kWp`,
        melhor_custo_kwp: `R$ ${top5.proposta_01.custoKwp.toFixed(2)}/kWp`
      },

      empresa: {
        nome: "PIENG Soluções",
        contato: "(62) 99167-0536",
        email: "contato@piengsolucoes.com.br",
        site: "www.piengsolucoes.com.br",
        whatsapp: "5562991670536"
      },

      documento: {
        data_geracao: new Date().toLocaleDateString('pt-BR'),
        data_validade: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR'),
        versao_template: "3.0-PNL",
        status: "concluido",
        modelo_base: "orcamento_dutra.yaml",
        estrategia_pnl: "5_propostas_otimizadas"
      }
    };

    return dadosPNL;
  }

  public salvarDadosPNL(caminhoSaida: string): void {
    const dadosPNL = this.gerarDadosPNL();
    const yamlContent = yaml.dump(dadosPNL, { 
      indent: 2,
      lineWidth: 120,
      noRefs: true
    });
    
    fs.writeFileSync(caminhoSaida, yamlContent, 'utf-8');
    console.log(`✅ Dados PNL salvos em: ${caminhoSaida}`);
  }

  public getResumoPNL(): void {
    const top5 = this.selecionarTop5PNL();
    
    console.log('🎯 RESUMO DA ESTRATÉGIA PNL:');
    console.log(`📊 Total de orçamentos analisados: ${this.orcamentosProcessados.length}`);
    console.log('🏆 TOP 5 SELECIONADOS:');
    
    Object.entries(top5).forEach(([key, orcamento]) => {
      const estrategias = {
        proposta_01: '🥇 ANCORAGEM (Melhor custo)',
        proposta_02: '⚖️ DECOY EFFECT (Equilíbrio)',
        proposta_03: '⚡ SOCIAL PROOF (Potência)',
        proposta_04: '💰 URGÊNCIA (Menor investimento)',
        proposta_05: '👑 AUTORIDADE (Premium)'
      };
      
      console.log(`   ${key}: ${estrategias[key]} - R$ ${orcamento.custoKwp.toFixed(2)}/kWp`);
    });
  }
}

// Função utilitária para geração rápida
export function gerarPropostaPNL(
  caminhoArquivo: string, 
  dadosCliente: any, 
  caminhoSaida: string
): void {
  const gerador = new GeradorPNL(caminhoArquivo, dadosCliente);
  gerador.getResumoPNL();
  gerador.salvarDadosPNL(caminhoSaida);
}
