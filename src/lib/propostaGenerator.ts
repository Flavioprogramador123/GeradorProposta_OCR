import { PropostaData, SistemaData } from './types';
import { formatDate, generateSlug, formatCurrency } from './propostaUtils';

interface DadosExtraidos {
  orcamentos: Array<{
    fornecedor: string;
    potencia_kwp: number;
    modulos: string;
    inversores: string;
    pcusto: number;
    outros_componentes: string[];
  }>;
}

interface DadosUsuario {
  nome: string;
  cidade: string;
  consumoKwh: number;
  tipo: string;
  hspLocal: number;
  pdespesa: number;
  observacoes?: string;
}

export class PropostaGenerator {
  private static readonly PERFORMANCE_RATE = 0.75;
  private static readonly DIAS_MES = 30.42;
  private static readonly SIMULTANEIDADE = {
    'residencial': 0.30,
    'comercial': 0.50,
    'industrial': 0.70,
    'rural': 0.40
  };

  static calcularPrecos(pcusto: number, pdespesa: number) {
    const ppix = pcusto + pdespesa;
    const pavista = ppix / 0.9;
    const priscado = ppix * 1.20;
    const p12x = pavista / 12;
    const p18x_total = ppix / 0.845;
    const p18x_parcela = p18x_total / 18;

    return {
      pix: ppix,
      avista: pavista,
      riscado: priscado,
      parcela_12x: p12x,
      parcela_18x: p18x_parcela,
      total_18x: p18x_total
    };
  }

  static calcularPerformance(
    potencia_kW: number,
    hsp: number,
    consumo_mensal: number,
    investimento_pix: number,
    tipo_cliente: string
  ) {
    const geracao_mensal = potencia_kW * hsp * this.DIAS_MES * this.PERFORMANCE_RATE;
    
    const simultaneidade = this.SIMULTANEIDADE[tipo_cliente.toLowerCase() as keyof typeof this.SIMULTANEIDADE] || 0.30;
    const injecao_rede = 1 - simultaneidade;
    const tusd_perdida = 0.169 * injecao_rede;
    const economia_real_kwh = 1.10 - tusd_perdida;
    const economia_mensal = geracao_mensal * economia_real_kwh;
    
    const payback_meses = investimento_pix / economia_mensal;
    const tir_anual = (12 / payback_meses) * 100;
    const cobertura_percent = (geracao_mensal / consumo_mensal) * 100;

    return {
      geracao_mensal: Math.round(geracao_mensal),
      economia_mensal: Math.round(economia_mensal),
      payback_meses: Math.round(payback_meses * 10) / 10,
      tir_anual: Math.round(tir_anual * 10) / 10,
      cobertura_percent: Math.round(cobertura_percent),
      economia_real_kwh
    };
  }

  static gerarSistemas(
    dadosExtraidos: DadosExtraidos,
    dadosUsuario: DadosUsuario
  ): SistemaData[] {
    const sistemas: SistemaData[] = [];
    const titulos = [
      '💰 Sistema Econômico',
      '🏆 Sistema Popular', 
      '⚡ Sistema Performance',
      '👑 Sistema Premium',
      '💎 Sistema Supremo'
    ];

    const badges = [
      '',
      '⭐ MELHOR PAYBACK',
      '🔥 ALTA PERFORMANCE',
      '👑 PREMIUM',
      '💎 TOP DE LINHA'
    ];

    dadosExtraidos.orcamentos.forEach((orc, index) => {
      if (index >= 5) return; // Máximo 5 sistemas

      const precos = this.calcularPrecos(orc.pcusto, dadosUsuario.pdespesa);
      const performance = this.calcularPerformance(
        orc.potencia_kwp,
        dadosUsuario.hspLocal,
        dadosUsuario.consumoKwh,
        precos.pix,
        dadosUsuario.tipo
      );

      const especificacoes = [
        orc.modulos,
        orc.inversores,
        ...orc.outros_componentes
      ];

      sistemas.push({
        titulo: titulos[index],
        potencia: `${orc.potencia_kwp.toFixed(2).replace('.', ',')} kWp`,
        especificacoes,
        precoRiscado: formatCurrency(precos.riscado),
        precoAtual: formatCurrency(precos.avista),
        tagDesconto: index === 1 ? 'MELHOR CUSTO-BENEFÍCIO' : `ECONOMIA DE ${Math.round(((precos.riscado - precos.avista) / precos.riscado) * 100)}%`,
        precoPixDecimal: precos.pix,
        preco12x: formatCurrency(precos.parcela_12x),
        preco18x: formatCurrency(precos.parcela_18x),
        geracao: `${performance.geracao_mensal} kWh`,
        cobertura: `${performance.cobertura_percent}%`,
        economia: formatCurrency(performance.economia_mensal),
        payback: `${performance.payback_meses.toFixed(1).replace('.', ',')} meses`,
        tir: `${performance.tir_anual.toFixed(1).replace('.', ',')}%`,
        isRecommended: false, // Será definido depois
        badge: badges[index]
      });
    });

    // Identificar sistema recomendado (melhor payback)
    if (sistemas.length > 0) {
      let melhorIndex = 0;
      let melhorPayback = parseFloat(sistemas[0].payback.replace(/[^\d,]/g, '').replace(',', '.'));

      sistemas.forEach((sistema, index) => {
        const payback = parseFloat(sistema.payback.replace(/[^\d,]/g, '').replace(',', '.'));
        if (payback < melhorPayback) {
          melhorPayback = payback;
          melhorIndex = index;
        }
      });

      sistemas[melhorIndex].isRecommended = true;
      if (!sistemas[melhorIndex].badge) {
        sistemas[melhorIndex].badge = '⭐ MELHOR PAYBACK';
      }
    }

    return sistemas;
  }

  static gerarProposta(
    dadosExtraidos: DadosExtraidos,
    dadosUsuario: DadosUsuario
  ): PropostaData {
    const sistemas = this.gerarSistemas(dadosExtraidos, dadosUsuario);
    const sistemaRecomendado = sistemas.find(s => s.isRecommended) || sistemas[0];
    
    const paybacks = sistemas.map(s => 
      parseFloat(s.payback.replace(/[^\d,]/g, '').replace(',', '.'))
    );
    const tirs = sistemas.map(s => 
      parseFloat(s.tir.replace(/[^\d,]/g, '').replace(',', '.'))
    );
    const geracoes = sistemas.map(s => 
      parseInt(s.geracao.replace(/[^\d]/g, ''))
    );

    const hoje = new Date();
    const dataValidade = new Date(hoje);
    dataValidade.setDate(dataValidade.getDate() + 7);

    return {
      cliente: {
        nome: dadosUsuario.nome,
        cidade: dadosUsuario.cidade,
        consumoKwh: dadosUsuario.consumoKwh.toString(),
        tipo: dadosUsuario.tipo,
        hspLocal: dadosUsuario.hspLocal.toFixed(2).replace('.', ',')
      },
      sistemas,
      analise: {
        paybackMin: Math.min(...paybacks).toFixed(1).replace('.', ','),
        paybackMax: Math.max(...paybacks).toFixed(1).replace('.', ','),
        melhorSistemaNome: sistemaRecomendado?.titulo || '',
        melhorSistemaPotencia: sistemaRecomendado?.potencia || '',
        melhorSistemaPix: formatCurrency(sistemaRecomendado?.precoPixDecimal || 0),
        melhorSistemaPayback: sistemaRecomendado?.payback || '',
        geracaoMax: Math.max(...geracoes).toString(),
        coberturaMax: '100%', // Calculado dinamicamente se necessário
        tirMax: `${Math.max(...tirs).toFixed(1).replace('.', ',')}%`,
        economiaTarifa: 'R$ 0,60'
      },
      empresa: {
        contato: '(62) 99167-0536',
        email: 'contato@piengsolucoes.com.br',
        site: 'www.piengsolucoes.com.br',
        whatsapp: '5562991670536'
      },
      bannerUrgencia: `⚡ OPORTUNIDADE EXCLUSIVA: PAYBACK EXCEPCIONAL ABAIXO DE ${Math.min(...paybacks).toFixed(0)} MESES! VÁLIDO ATÉ ${formatDate(dataValidade).toUpperCase()}! ⚡`,
      dataGeracao: formatDate(hoje),
      dataValidade: formatDate(dataValidade)
    };
  }

  static gerarSlugProposta(clienteNome: string, cidade: string): string {
    return generateSlug(clienteNome, cidade);
  }
}