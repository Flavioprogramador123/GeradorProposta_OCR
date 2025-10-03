import yaml from 'js-yaml';
import fs from 'fs';

interface OrcamentoDutra {
  consolidado_orcamentos_distribuidores: {
    [distribuidor: string]: Array<{
      orcamento: {
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
      };
    }>;
  };
}

interface ClienteDataV2 {
  cliente: {
    nome: string;
    cidade: string;
    estado: string;
    consumo_mensal_kwh: number;
    tipo_imovel: string;
    hsp_local: number;
    tarifa_kwh: number;
    data_cadastro: string;
  };
  consolidado_orcamentos_distribuidores: {
    [distribuidor: string]: Array<{
      orcamento: {
        orcamento_id: string;
        arquivo_origem: string;
        preco_total: number;
        potencia_total_sistema: string;
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
        outros_componentes: string[];
      };
    }>;
  };
  analise_comparativa: {
    total_orcamentos: number;
    distribuidores_envolvidos: number;
    menor_preco: number;
    maior_preco: number;
    menor_potencia: string;
    maior_potencia: string;
    melhor_custo_kwp: string;
    ranking_custo_kwp: Array<{
      posicao: number;
      distribuidor: string;
      orcamento_id: string;
      custo_kwp: string;
    }>;
  };
  calculos_tecnicos: {
    performance_rate: number;
    fator_capacidade: number;
    geracao_mensal_kwh: number;
    geracao_anual_kwh: number;
    cobertura_consumo: number;
  };
  analise_financeira: {
    payback_simples_meses: number;
    payback_descontado_meses: number;
    tir_anual: number;
    vpl_25_anos: number;
    economia_mensal: number;
    economia_anual: number;
    tarifa_tusd: number;
  };
  precos_comerciais: {
    preco_pix: number;
    preco_12x: number;
    preco_18x: number;
    desconto_pix: number;
    preco_riscado: number;
  };
  metricas_comparativas: {
    menor_payback: number;
    maior_tir: number;
    melhor_cobertura: number;
    sistema_recomendado: string;
    potencia_recomendada: string;
    melhor_custo_kwp: string;
  };
  empresa: {
    nome: string;
    contato: string;
    email: string;
    site: string;
    whatsapp: string;
  };
  documento: {
    data_geracao: string;
    data_validade: string;
    versao_template: string;
    status: string;
    modelo_base: string;
  };
}

export class ConversorOrcamentos {
  private dadosOriginais: OrcamentoDutra;
  private dadosCliente: any;

  constructor(caminhoArquivo: string, dadosCliente: any) {
    const conteudo = fs.readFileSync(caminhoArquivo, 'utf-8');
    this.dadosOriginais = yaml.load(conteudo) as OrcamentoDutra;
    this.dadosCliente = dadosCliente;
  }

  private calcularPotenciaTotal(inversores: any[], modulos: any[]): number {
    // Calcular potência total baseada nos módulos
    const potenciaModulos = modulos.reduce((total, mod) => {
      const potenciaW = parseFloat(mod.potencia_unitaria.replace(/[^\d.]/g, ''));
      return total + (potenciaW * mod.quantidade);
    }, 0);
    return potenciaModulos / 1000; // Converter para kWp
  }

  private calcularCustoKwp(precoTotal: number, potenciaKwp: number): string {
    return (precoTotal / potenciaKwp).toFixed(2);
  }

  private gerarAnaliseComparativa(): any {
    const todosOrcamentos: Array<{
      distribuidor: string;
      orcamento: any;
      potenciaKwp: number;
      custoKwp: number;
    }> = [];

    // Coletar todos os orçamentos
    Object.entries(this.dadosOriginais.consolidado_orcamentos_distribuidores).forEach(([distribuidor, orcamentos]) => {
      orcamentos.forEach(({ orcamento }) => {
        const potenciaKwp = this.calcularPotenciaTotal(orcamento.inversores, orcamento.modulos);
        const custoKwp = parseFloat(this.calcularCustoKwp(orcamento.preco_total, potenciaKwp));
        
        todosOrcamentos.push({
          distribuidor,
          orcamento,
          potenciaKwp,
          custoKwp
        });
      });
    });

    // Ordenar por custo por kWp (menor é melhor)
    todosOrcamentos.sort((a, b) => a.custoKwp - b.custoKwp);

    const precos = todosOrcamentos.map(o => o.orcamento.preco_total);
    const potencias = todosOrcamentos.map(o => o.potenciaKwp);

    return {
      total_orcamentos: todosOrcamentos.length,
      distribuidores_envolvidos: Object.keys(this.dadosOriginais.consolidado_orcamentos_distribuidores).length,
      menor_preco: Math.min(...precos),
      maior_preco: Math.max(...precos),
      menor_potencia: `${Math.min(...potencias).toFixed(1)} kWp`,
      maior_potencia: `${Math.max(...potencias).toFixed(1)} kWp`,
      melhor_custo_kwp: `R$ ${todosOrcamentos[0].custoKwp.toFixed(2)}/kWp`,
      ranking_custo_kwp: todosOrcamentos.slice(0, 3).map((orcamento, index) => ({
        posicao: index + 1,
        distribuidor: orcamento.distribuidor,
        orcamento_id: orcamento.orcamento.orcamento_id || `ORC_${index + 1}`,
        custo_kwp: `R$ ${orcamento.custoKwp.toFixed(2)}/kWp`
      }))
    };
  }

  public converterParaV2(): ClienteDataV2 {
    const analiseComparativa = this.gerarAnaliseComparativa();
    const melhorOrcamento = analiseComparativa.ranking_custo_kwp[0];

    return {
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
      consolidado_orcamentos_distribuidores: this.dadosOriginais.consolidado_orcamentos_distribuidores,
      analise_comparativa: analiseComparativa,
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
        sistema_recomendado: melhorOrcamento.distribuidor,
        potencia_recomendada: `${melhorOrcamento.custo_kwp}`,
        melhor_custo_kwp: melhorOrcamento.custo_kwp
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
        versao_template: "3.0",
        status: "concluido",
        modelo_base: "orcamento_dutra.yaml"
      }
    };
  }

  public salvarDadosConvertidos(caminhoSaida: string): void {
    const dadosConvertidos = this.converterParaV2();
    const yamlContent = yaml.dump(dadosConvertidos, { 
      indent: 2,
      lineWidth: 120,
      noRefs: true
    });
    
    fs.writeFileSync(caminhoSaida, yamlContent, 'utf-8');
    console.log(`✅ Dados convertidos salvos em: ${caminhoSaida}`);
  }
}

// Função utilitária para conversão rápida
export function converterOrcamentoDutra(
  caminhoArquivo: string, 
  dadosCliente: any, 
  caminhoSaida: string
): void {
  const conversor = new ConversorOrcamentos(caminhoArquivo, dadosCliente);
  conversor.salvarDadosConvertidos(caminhoSaida);
}
