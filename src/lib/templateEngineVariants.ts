/**
 * 🎨 TEMPLATE ENGINE COM VARIANTS CSS
 * 
 * ⚠️ ATENÇÃO: Este arquivo é uma CÓPIA do templateEngine.ts original
 * Mantido para desenvolvimento de novas funcionalidades de variantes CSS
 * 
 * 📋 ESTRATÉGIA:
 * - templateEngine.ts: Versão estável em produção (NÃO MODIFICAR)
 * - templateEngineVariants.ts: Versão para desenvolvimento de variantes CSS
 * 
 * 🎯 OBJETIVO:
 * Adicionar suporte para variantes CSS (residencial, rural, comercial, industrial)
 * mantendo toda a lógica financeira, marketing e PNL intacta
 * 
 * 📁 CSS Variants disponíveis:
 * - src/styles/variants/residencial.css
 * - src/styles/variants/rural.css
 * - src/styles/variants/comercial.css
 * - src/styles/variants/industrial.css
 */

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { getVariantConfig, type ClientType, type ComercialSubType, type VariantConfig } from './variantConfig';
import { getFormasPagamentoModalScript, tagEconomiaPix } from './tabelaJurosCartao';
import { formatBRL } from './formatBRL';
import { injectPropostaAnalytics } from './propostaAnalytics';

function injectFormasPagamento(html: string, taxaCartaoMensal?: number): string {
  const snippet = getFormasPagamentoModalScript(taxaCartaoMensal);
  if (html.includes('</body>')) {
    return html.replace('</body>', `${snippet}\n</body>`);
  }
  return html + snippet;
}

interface ClienteData {
  cliente: {
    nome: string;
    cidade: string;
    estado: string;
    consumo_mensal_kwh: number;
    tipo_imovel: string;
    hsp_local: number;
    tarifa_kwh: number;
  };
  orcamentos: Array<{
    id: string;
    fornecedor: string;
    potencia_total_kwp: number;
    preco_custo: number;
    preco_despesa: number;
    preco_total: number;
    inversores: Array<{
      marca: string;
      modelo: string;
      potencia_kw: number;
      quantidade: number;
    }>;
    modulos: Array<{
      marca: string;
      modelo: string;
      potencia_wp: number;
      quantidade: number;
      tipo: string;
    }>;
    outros_componentes: string[];
  }>;
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
  };
}

export class TemplateEngine {
  private clienteData: ClienteData;
  private templateHtml: string;

  constructor(clienteData: ClienteData) {
    this.clienteData = clienteData;
    this.templateHtml = this.loadTemplate();
  }

  private loadTemplate(): string {
    const templatePath = path.join(process.cwd(), 'src/data/knowledge/templates/proposta_template.html');
    return fs.readFileSync(templatePath, 'utf-8');
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  }

  private formatNumber(value: number, decimals: number = 2): string {
    return value.toFixed(decimals).replace('.', ',');
  }

  private getSistemaData(index: number, melhorPaybackIndex?: number) {
    const orcamento = this.clienteData.orcamentos[index];
    if (!orcamento) return null;

    const geracaoMensal = this.clienteData.calculos_tecnicos.geracao_mensal_kwh;
    const cobertura = this.clienteData.calculos_tecnicos.cobertura_consumo;
    const payback = this.clienteData.analise_financeira.payback_simples_meses;
    const tir = this.clienteData.analise_financeira.tir_anual;
    const economia = this.clienteData.analise_financeira.economia_mensal;

    // Calcular preços comerciais
    const precoPix = orcamento.preco_total * 0.9; // 10% desconto PIX
    const preco12x = orcamento.preco_total / 12;
    const preco18x = orcamento.preco_total / 18;

    // Determinar se é o melhor payback baseado no índice calculado
    const isMelhorPayback = melhorPaybackIndex !== undefined && index === melhorPaybackIndex;

    return {
      titulo: `Opção ${index + 1}`,
      potencia: this.formatNumber(orcamento.potencia_total_kwp, 2),
      modulos: `${orcamento.modulos.length} módulos ${orcamento.modulos[0]?.marca || ''} ${orcamento.modulos[0]?.potencia_wp || 0}W`,
      inversor: `${orcamento.inversores.length} inversor ${orcamento.inversores[0]?.marca || ''} ${orcamento.inversores[0]?.potencia_kw || 0}kW`,
      geracao: this.formatNumber(geracaoMensal, 0),
      cobertura: this.formatNumber(cobertura, 0),
      payback: this.formatNumber(payback, 1),
      tir: this.formatNumber(tir, 1),
      economia: this.formatCurrency(economia),
      precoRiscado: this.formatCurrency(orcamento.preco_total),
      precoAtual: this.formatCurrency(precoPix),
      desconto: '-10% PIX',
      precoPix: this.formatCurrency(precoPix),
      preco12x: this.formatCurrency(preco12x),
      preco18x: this.formatCurrency(preco18x),
      recomendado: isMelhorPayback ? 'recommended' : '',
      badge: isMelhorPayback ? '⭐ MELHOR PAYBACK' : ''
    };
  }

  private getVariables(): Record<string, string> {
    const cliente = this.clienteData.cliente;
    const empresa = this.clienteData.empresa;
    const documento = this.clienteData.documento;
    const metricas = this.clienteData.metricas_comparativas;

    const variables: Record<string, string> = {
      // Dados do cliente
      NOME_CLIENTE: cliente.nome,
      CIDADE_CLIENTE: cliente.cidade,
      ESTADO_CLIENTE: cliente.estado,
      CONSUMO_MENSAL: this.formatNumber(cliente.consumo_mensal_kwh, 0),
      TIPO_IMOVEL: cliente.tipo_imovel,
      HSP_LOCAL: this.formatNumber(cliente.hsp_local, 2),
      TARIFA_KWH: this.formatNumber(cliente.tarifa_kwh, 3),

      // Dados da empresa
      CONTATO: empresa.contato,
      EMAIL: empresa.email,
      SITE: empresa.site,
      WHATSAPP: empresa.whatsapp,

      // Datas
      DATA_GERACAO: documento.data_geracao,
      DATA_VALIDADE: documento.data_validade,

      // Métricas comparativas
      MENOR_PAYBACK: this.formatNumber(metricas.menor_payback, 1),
      MAIOR_TIR: this.formatNumber(metricas.maior_tir, 1),
      MELHOR_COBERTURA: this.formatNumber(metricas.melhor_cobertura, 0),
      SISTEMA_RECOMENDADO: metricas.sistema_recomendado,
      POTENCIA_RECOMENDADA: metricas.potencia_recomendada
    };

    // Calcular qual sistema tem o melhor payback
    let melhorPaybackIndex = 0;
    let melhorPayback = Infinity;
    
    for (let i = 0; i < this.clienteData.orcamentos.length && i < 3; i++) {
      const orcamento = this.clienteData.orcamentos[i];
      if (orcamento) {
        // Calcular payback baseado no preço total e economia mensal
        const economiaMensal = this.clienteData.analise_financeira.economia_mensal;
        const paybackMeses = orcamento.preco_total / economiaMensal;
        
        if (paybackMeses < melhorPayback) {
          melhorPayback = paybackMeses;
          melhorPaybackIndex = i;
        }
      }
    }

    // Dados dos sistemas (máximo 3)
    for (let i = 0; i < 3; i++) {
      const sistema = this.getSistemaData(i, melhorPaybackIndex);
      if (sistema) {
        const prefix = `SISTEMA_${i + 1}_`;
        variables[`${prefix}TITULO`] = sistema.titulo;
        variables[`${prefix}POTENCIA`] = sistema.potencia;
        variables[`${prefix}MODULOS`] = sistema.modulos;
        variables[`${prefix}INVERSOR`] = sistema.inversor;
        variables[`${prefix}GERACAO`] = sistema.geracao;
        variables[`${prefix}COBERTURA`] = sistema.cobertura;
        variables[`${prefix}PAYBACK`] = sistema.payback;
        variables[`${prefix}TIR`] = sistema.tir;
        variables[`${prefix}ECONOMIA`] = sistema.economia;
        variables[`${prefix}PRECO_RISCADO`] = sistema.precoRiscado;
        variables[`${prefix}PRECO_ATUAL`] = sistema.precoAtual;
        variables[`${prefix}DESCONTO`] = sistema.desconto;
        variables[`${prefix}PRECO_PIX`] = sistema.precoPix;
        variables[`${prefix}PRECO_12X`] = sistema.preco12x;
        variables[`${prefix}PRECO_18X`] = sistema.preco18x;
        variables[`${prefix}RECOMENDADO`] = sistema.recomendado;
        variables[`${prefix}BADGE`] = sistema.badge;
      }
    }

    return variables;
  }

  public generateHtml(): string {
    const variables = this.getVariables();
    let html = this.templateHtml;

    // Substituir todas as variáveis
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      html = html.replace(regex, value);
    });

    return html;
  }

  public saveProposta(outputPath: string): void {
    const html = this.generateHtml();
    fs.writeFileSync(outputPath, html, 'utf-8');
  }

  public static loadClienteData(clientePath: string): ClienteData {
    const dataPath = path.join(process.cwd(), clientePath);
    const yamlContent = fs.readFileSync(dataPath, 'utf-8');
    return yaml.load(yamlContent) as ClienteData;
  }
}

// Função utilitária para gerar proposta completa
export async function gerarPropostaCompleta(
  clientePath: string,
  outputPath: string
): Promise<void> {
  try {
    // Carregar dados do cliente
    const clienteData = TemplateEngine.loadClienteData(clientePath);

    // Criar engine e gerar HTML
    const engine = new TemplateEngine(clienteData);
    engine.saveProposta(outputPath);

    console.log(`✅ Proposta gerada com sucesso: ${outputPath}`);
  } catch (error) {
    console.error('❌ Erro ao gerar proposta:', error);
    throw error;
  }
}

// ============= NOVO SISTEMA DE TEMPLATES PADRÃO =============

interface TemplateVariables {
  // Cliente Info
  CLIENTE_NOME: string;
  CLIENTE_CIDADE: string;
  CLIENTE_CONSUMO_KWH: string;
  CLIENTE_CONSUMO_TIPO: string;
  CLIENTE_TIPO_INSTALACAO: string;
  HSP_LOCAL: string;

  // Banner e Data
  BANNER_URGENCIA: string;
  DATA_GERACAO: string;
  DATA_VALIDADE: string;
  ANO_ATUAL: string;

  // Empresa Info
  EMPRESA_CONTATO: string;
  EMPRESA_EMAIL: string;
  EMPRESA_SITE: string;

  // Análise Estratégica
  PAYBACK_MIN: string;
  PAYBACK_MAX: string;
  MELHOR_SISTEMA_NOME: string;
  MELHOR_SISTEMA_POTENCIA: string;
  MELHOR_SISTEMA_PIX: string;
  MELHOR_SISTEMA_PAYBACK: string;
  GERACAO_MAX: string;
  COBERTURA_MAX: string;
  TIR_MAX: string;
  ECONOMIA_TARIFA: string;

  // Sistemas (dinâmico)
  [key: string]: string;
}

interface Sistema {
  nome: string;
  potTotal: number;
  ppix: number;
  pavista: number;
  priscado: number;
  p12x: number;
  p18x_parcela: number;
  p12x_total?: number;
  p18x_total?: number;
  geracaoMensal: number;
  cobertura: number;
  economiaMensal: number;
  paybackMeses: number;
  tirAnual: number;
  // Campos adicionais opcionais usados na renderização
  modulos?: number;
  pot_modulo?: number;
  marca_modulo?: string;
  inversores?: number;
  pot_inv?: number;
  marca_inversor?: string;
  tipo_instalacao?: string;
}

interface PropostaData {
  cliente: {
    nome: string;
    cidade: string;
    consumoMensal: number;
    tipo: string;
    tipoInstalacao?: string;
    hsp?: number;
  };
  sistemas: Sistema[];
  empresa?: {
    contato: string;
    email: string;
    site: string;
  };
  bannerUrgencia?: string;
  dataGeracao?: string;
  dataValidade?: string;
}

export class TemplateEnginePadrao {
  private template: string;
  private variantConfig?: VariantConfig;

  constructor(templateHtml: string, clientType?: ClientType, subType?: ComercialSubType) {
    this.template = templateHtml;

    // Carregar configuração de variante se tipo fornecido
    if (clientType) {
      const config = getVariantConfig(clientType, subType);
      this.variantConfig = config || undefined;
    }
  }

  /**
   * Gera as variáveis do template a partir dos dados da proposta
   */
  generateVariables(data: PropostaData): TemplateVariables {
    const currentDate = new Date();
    const validityDate = new Date(currentDate.getTime() + 14 * 24 * 60 * 60 * 1000);

    // Informações base
    const variables: TemplateVariables = {
      // Cliente
      CLIENTE_NOME: data.cliente.nome,
      CLIENTE_CIDADE: data.cliente.cidade,
      CLIENTE_CONSUMO_KWH: data.cliente.consumoMensal.toString(),
      CLIENTE_CONSUMO_TIPO: data.cliente.tipo,
      CLIENTE_TIPO_INSTALACAO: (data.cliente.tipoInstalacao || '').toString(),
      HSP_LOCAL: (data.cliente.hsp || 5.21).toString(),

      // Datas
      BANNER_URGENCIA: data.bannerUrgencia || "Oferta especial por tempo limitado! Orçamento válido por 2 dias ou até acabar o estoque.",
      DATA_GERACAO: data.dataGeracao || currentDate.toLocaleDateString('pt-BR'),
      DATA_VALIDADE: data.dataValidade || validityDate.toLocaleDateString('pt-BR'),
      ANO_ATUAL: currentDate.getFullYear().toString(),

      // Empresa
      EMPRESA_CONTATO: data.empresa?.contato || "(62) 99167-0536",
      EMPRESA_EMAIL: data.empresa?.email || "contato@piengsolucoes.com.br",
      EMPRESA_SITE: data.empresa?.site || "www.piengsolucoes.com.br",

      // Análise (calculada dos sistemas)
      PAYBACK_MIN: this.calculatePaybackMin(data.sistemas),
      PAYBACK_MAX: this.calculatePaybackMax(data.sistemas),
      MELHOR_SISTEMA_NOME: this.getBestSystem(data.sistemas)?.nome || "Sistema Econômico",
      MELHOR_SISTEMA_POTENCIA: this.getBestSystemPotencia(data.sistemas),
      MELHOR_SISTEMA_PIX: this.getBestSystemPix(data.sistemas),
      MELHOR_SISTEMA_PAYBACK: this.getBestSystemPayback(data.sistemas),
      GERACAO_MAX: this.getMaxGeneration(data.sistemas),
      COBERTURA_MAX: this.getMaxCoverage(data.sistemas),
      TIR_MAX: this.getMaxTir(data.sistemas),
      ECONOMIA_TARIFA: "R$ 0,982"
    };

    // Adicionar variáveis específicas de cada sistema
    data.sistemas.forEach((sistema, index) => {
      const num = index + 1;
      const potTotal = sistema.potTotal || 0;
      const modulos = Math.round(potTotal * 1000 / 580);
      const inversor = Math.ceil(potTotal);

      variables[`SISTEMA_${num}_TITULO`] = `SISTEMA ${num} ${index === 0 ? '⭐ RECOMENDADO' : ''}`;
      variables[`SISTEMA_${num}_POTENCIA`] = `${potTotal.toFixed(2)} kWp`;
      variables[`SISTEMA_${num}_PIX`] = formatBRL(sistema.ppix || 0);
      variables[`SISTEMA_${num}_PRECO_RISCADO`] = formatBRL(sistema.priscado || 0);
      variables[`SISTEMA_${num}_PRECO_ATUAL`] = formatBRL(sistema.pavista || 0);
      variables[`SISTEMA_${num}_TAG_DESCONTO`] = tagEconomiaPix(sistema.ppix || 0, sistema.pavista || 0);
      variables[`SISTEMA_${num}_12X`] = formatBRL(sistema.p12x || 0);
      variables[`SISTEMA_${num}_18X`] = formatBRL(sistema.p18x_parcela || 0);
      variables[`SISTEMA_${num}_GERACAO`] = `${(sistema.geracaoMensal || 0).toFixed(0)} kWh`;
      variables[`SISTEMA_${num}_COBERTURA`] = `${(Number(sistema.cobertura) || 0).toFixed(0)}%`;
      variables[`SISTEMA_${num}_ECONOMIA`] = `R$ ${(sistema.economiaMensal || 0).toFixed(2)}`;
      variables[`SISTEMA_${num}_PAYBACK`] = `${(sistema.paybackMeses || 0).toFixed(1)} meses`;
      variables[`SISTEMA_${num}_TIR`] = `${(sistema.tirAnual || 0).toFixed(1)}%`;
      variables[`SISTEMA_${num}_BADGE`] = index === 0 ? '<div class="card-badge">⭐ RECOMENDADO</div>' : '';

      // Especificações do sistema - USAR DADOS REAIS DA TABELA
      const sistemaReal = data.sistemas[index];
      const modulosReais = sistemaReal.modulos || Math.round(sistemaReal.potTotal * 1000 / 580);
      const potModuloReal = sistemaReal.pot_modulo || 580;
      const marcaModuloReal = sistemaReal.marca_modulo || 'monocristalino';
      const inversoresReais = sistemaReal.inversores || 1;
      const potInversorReal = sistemaReal.pot_inv || Math.ceil(sistemaReal.potTotal);
      const marcaInversorReal = sistemaReal.marca_inversor || 'string';
      const tipoInstalacao = sistemaReal.tipo_instalacao || 'Telhado Fibrocimento';

      variables[`SISTEMA_${num}_ESPECIFICACOES`] = `
        <li>${modulosReais} módulos ${marcaModuloReal} ${potModuloReal}W</li>
        <li>${inversoresReais} inversor${inversoresReais > 1 ? 'es' : ''} ${marcaInversorReal} ${potInversorReal}kW</li>
        <li>Estrutura de alumínio para ${tipoInstalacao.toLowerCase()}</li>
        <li>Cabeamento CC/CA completo</li>
        <li>String box DC/AC + proteções</li>
        <li>Garantia de instalação de 1 ano, garantia dos módulos e inversores por 10 anos contra defeitos funcionais fornecida pelo fabricante, e garantia de desempenho linear de 25 anos para a produção de energia</li>
      `;
    });

    // Gerar tabela comparativa
    variables['TABELA_SISTEMAS'] = this.generateComparisonTable(data.sistemas);

    // NOVO: Gerar tabela de Resultados Financeiros (base do Gerador Rápido)
    variables['TABELA_RESULTADOS_FINANCEIROS'] = this.generateResultadosFinanceirosTable(data.sistemas);

    // Gerar cartões de sistemas dinamicamente
    variables['SISTEMAS_CARDS'] = this.generateSystemCards(data.sistemas);
    variables['SISTEMAS_HTML'] = this.generateSystemCards(data.sistemas); // Para compatibilidade com template padrão

    // NOVO: Gerar cartões baseados nos Resultados Financeiros
    variables['SISTEMAS_CARDS_RESULTADOS'] = this.generateSystemCardsResultados(data.sistemas);

    return variables;
  }

  /**
   * Processa o template substituindo as variáveis
   */
  render(data: PropostaData): string {
    const variables = this.generateVariables(data);
    let html = this.template;

    // Substituir todas as variáveis no template
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      html = html.replace(regex, value);
    });

    // Aplicar variante se configurada
    if (this.variantConfig) {
      html = this.applyVariant(html);
    }

    return injectPropostaAnalytics(
      injectFormasPagamento(
        html,
        (data as { taxaCartaoMensal?: number; config?: { taxaCartaoMensal?: number } }).taxaCartaoMensal ??
          (data as { config?: { taxaCartaoMensal?: number } }).config?.taxaCartaoMensal
      ),
      (data as { slug?: string }).slug
    );
  }

  /**
   * Aplica a configuração de variante ao HTML
   */
  private applyVariant(html: string): string {
    if (!this.variantConfig) return html;

    const config = this.variantConfig;

    // 1. Injetar classe de variante no body
    html = html.replace(
      /<body([^>]*)>/,
      `<body$1 class="variant-${config.id}">`
    );

    // 2. Injetar CSS personalizado no head
    // 🔧 ESTRATÉGIA HÍBRIDA: Tentar inline primeiro, fallback para <link>
    const isProduction = process.env.VERCEL || process.env.NETLIFY || process.env.NODE_ENV === 'production';

    let cssInjected = false;

    // TENTATIVA 1: Injetar CSS inline (funciona em dev e produção)
    try {
      // Mapear arquivos CSS de variantes
      const cssPathsToTry = [
        path.join(process.cwd(), 'public/styles', config.cssFile),
        path.join(process.cwd(), 'src/styles/variants', config.cssFile),
        path.join(process.cwd(), 'src/styles', config.cssFile)
      ];

      for (const cssPath of cssPathsToTry) {
        if (fs.existsSync(cssPath)) {
          const variantCss = fs.readFileSync(cssPath, 'utf-8');
          const cssInjection = `<style id="variant-styles-inline">${variantCss}</style>`;
          html = html.replace('</head>', `${cssInjection}\n</head>`);
          cssInjected = true;
          console.log(`✅ CSS inline injetado: ${cssPath}`);
          break;
        }
      }
    } catch (error) {
      console.warn(`⚠️ Erro ao injetar CSS inline: ${error instanceof Error ? error.message : 'unknown'}`);
    }

    // FALLBACK: Se inline falhar, usar <link> (apenas em produção)
    if (!cssInjected && isProduction) {
      const cssLink = `<link rel="stylesheet" href="/styles/${config.cssFile}">`;
      html = html.replace('</head>', `${cssLink}\n</head>`);
      console.log(`⚠️ Fallback: CSS via <link> tag: /styles/${config.cssFile}`);
    }

    // 3. Injetar variáveis CSS customizadas
    const cssVars = `
      <style id="variant-css-vars">
        :root {
          --variant-primary: ${config.tema.corPrimaria};
          --variant-secondary: ${config.tema.corSecundaria};
          --variant-gradient: ${config.tema.gradiente};
        }
      </style>
    `;
    html = html.replace('</head>', `${cssVars}\n</head>`);

    // 4. Substituir textos personalizados (se placeholders existirem)
    html = html.replace(/{{TITULO_HERO}}/g, config.copy.tituloHero);
    html = html.replace(/{{SUBTITULO_HERO}}/g, config.copy.subtituloHero);
    html = html.replace(/{{CTA_TEXTO}}/g, config.copy.ctaTexto);
    html = html.replace(/{{ICONE_VARIANTE}}/g, config.tema.icone);

    // 5. Injetar benefícios personalizados
    const beneficiosHtml = config.copy.beneficios
      .map(b => `<li class="benefit-item">${b}</li>`)
      .join('\n');
    html = html.replace(/{{BENEFICIOS_PERSONALIZADOS}}/g, beneficiosHtml);

    return html;
  }

  /**
   * Retorna a configuração de variante atual
   */
  public getVariantConfig(): VariantConfig | undefined {
    return this.variantConfig;
  }

  /**
   * Métodos auxiliares para cálculos
   */
  private calculatePaybackMin(sistemas: Sistema[]): string {
    if (sistemas.length === 0) return "0";
    const paybacks = sistemas.map(s => s.paybackMeses || 0).filter(p => p > 0);
    return paybacks.length > 0 ? Math.min(...paybacks).toFixed(1) : "0";
  }

  private calculatePaybackMax(sistemas: Sistema[]): string {
    if (sistemas.length === 0) return "0";
    const paybacks = sistemas.map(s => s.paybackMeses || 0);
    return Math.max(...paybacks).toFixed(1);
  }

  private getBestSystem(sistemas: Sistema[]): Sistema | null {
    if (sistemas.length === 0) return null;
    return sistemas.reduce((best, current) => {
      const currentPayback = current.paybackMeses || Infinity;
      const bestPayback = best.paybackMeses || Infinity;
      return currentPayback < bestPayback ? current : best;
    });
  }

  private getBestSystemPotencia(sistemas: Sistema[]): string {
    const best = this.getBestSystem(sistemas);
    return best && best.potTotal ? `${best.potTotal.toFixed(2)} kWp` : "0 kWp";
  }

  private getBestSystemPix(sistemas: Sistema[]): string {
    const best = this.getBestSystem(sistemas);
    return best && best.ppix ? `R$ ${best.ppix.toFixed(2)}` : "R$ 0,00";
  }

  private getBestSystemPayback(sistemas: Sistema[]): string {
    const best = this.getBestSystem(sistemas);
    return best ? `${(best.paybackMeses || 0).toFixed(1)} meses` : "0 meses";
  }

  private getMaxGeneration(sistemas: Sistema[]): string {
    if (sistemas.length === 0) return "0";
    const max = Math.max(...sistemas.map(s => s.geracaoMensal || 0));
    return max.toFixed(0);
  }

  private getMaxCoverage(sistemas: Sistema[]): string {
    if (sistemas.length === 0) return "0%";
    const max = Math.max(...sistemas.map(s => Number(s.cobertura) || 0));
    return `${max.toFixed(0)}%`;
  }

  private getMaxTir(sistemas: Sistema[]): string {
    if (sistemas.length === 0) return "0%";
    const max = Math.max(...sistemas.map(s => s.tirAnual || 0));
    return `${max.toFixed(1)}%`;
  }

  private generateComparisonTable(sistemas: Sistema[]): string {
    return sistemas.map((sistema, index) => {
      const isRecommended = index === 0;
      const className = isRecommended ? 'class="recommended-row"' : '';

      return `
        <tr ${className}>
          <td>SISTEMA ${index + 1} ${isRecommended ? '⭐' : ''}</td>
          <td>${(sistema.potTotal || 0).toFixed(2)} kWp</td>
          <td class="pix-price"><strong>R$ ${(sistema.ppix || 0).toFixed(2)}</strong></td>
          <td>R$ ${(sistema.p12x || 0).toFixed(2)}</td>
          <td>R$ ${(sistema.p18x_parcela || 0).toFixed(2)}</td>
          <td>${(sistema.geracaoMensal || 0).toFixed(0)} kWh</td>
          <td>${(sistema.paybackMeses || 0).toFixed(1)} meses</td>
          <td>${(sistema.tirAnual || 0).toFixed(1)}%</td>
        </tr>
      `;
    }).join('');
  }

  // NOVO: Gerar tabela de Resultados Financeiros (base do Gerador Rápido)
  private generateResultadosFinanceirosTable(sistemas: Sistema[]): string {
    return sistemas.map((sistema, index) => {
      const isRecommended = index === 0;
      const className = isRecommended ? 'class="recommended-row"' : '';

      return `
        <tr ${className}>
          <td class="system-name">
            ${index === 0 ? '<span style="color: #f39c12;">🏆</span>' : ''}
            ${sistema.nome || `Sistema ${index + 1}`}
          </td>
          <td><strong>${(sistema.potTotal || 0).toFixed(2)} kWp</strong></td>
          <td class="pix-price">R$ ${(sistema.ppix || 0).toFixed(2)}</td>
          <td class="parcel-price">
            <div style="font-weight: 600;">R$ ${(sistema.p12x || 0).toFixed(2)}</div>
            <div style="font-size: 11px; color: #666;">por mês</div>
          </td>
          <td class="parcel-price">R$ ${(sistema.p12x_total || (sistema.p12x || 0) * 12).toFixed(2)}</td>
          <td class="parcel-price">
            <div style="font-weight: 600;">R$ ${(sistema.p18x_parcela || 0).toFixed(2)}</div>
            <div style="font-size: 11px; color: #666;">por mês</div>
          </td>
          <td class="parcel-price">R$ ${(sistema.p18x_total || (sistema.p18x_parcela || 0) * 18).toFixed(2)}</td>
          <td class="performance-metric">${(sistema.geracaoMensal || 0).toFixed(0)} kWh</td>
          <td class="performance-metric">${(sistema.paybackMeses || 0).toFixed(1)} meses</td>
          <td class="performance-metric">${(sistema.tirAnual || 0).toFixed(1)}%</td>
        </tr>
      `;
    }).join('');
  }

  private generateSystemCards(sistemas: Sistema[]): string {
    // Encontrar o sistema com melhor payback (menor valor em meses)
    const melhorPayback = Math.min(...sistemas.map(s => Number(s.paybackMeses) || 999));
    
    return sistemas.map((sistema, index) => {
      const paybackAtual = Number(sistema.paybackMeses) || 999;
      const isRecommended = paybackAtual === melhorPayback;
      const recommendedClass = isRecommended ? 'recommended' : '';
      const badge = isRecommended ? '<div class="card-badge">⭐ RECOMENDADO</div>' : '';

      // USAR DADOS REAIS DA TABELA
      const modulosReais = sistema.modulos || Math.round((sistema.potTotal || 0) * 1000 / 580);
      const potModuloReal = sistema.pot_modulo || 580;
      const marcaModuloReal = sistema.marca_modulo || 'monocristalino';
      const inversoresReais = sistema.inversores || 1;
      const potInversorReal = sistema.pot_inv || Math.ceil(sistema.potTotal || 0);
      const marcaInversorReal = sistema.marca_inversor || 'string';
      const tipoInstalacao = sistema.tipo_instalacao || 'Telhado Fibrocimento';

      return `
        <div class="system-card ${recommendedClass}">
          ${badge}
          <div class="card-header">
            <div class="card-title">SISTEMA ${index + 1} ${isRecommended ? '⭐ RECOMENDADO' : ''}</div>
            <div class="card-power">Potência: ${(sistema.potTotal || 0).toFixed(2)} kWp</div>
          </div>
          <div class="card-body">
            <ul class="specs-list">
              <li>${modulosReais} módulos ${potModuloReal}W ${marcaModuloReal}</li>
              <li>${inversoresReais} inversor${inversoresReais > 1 ? 'es' : ''} ${marcaInversorReal} ${potInversorReal}kW</li>
              <li>Estrutura de alumínio para ${tipoInstalacao.toLowerCase()}</li>
              <li>Cabeamento CC/CA completo</li>
              <li>String box DC/AC</li>
            </ul>

            <div class="pricing-section">
              <div class="original-price">Promoção de <span class="valor-riscado">${formatBRL(sistema.priscado)}</span></div>
              <div class="current-price">à vista ${formatBRL(sistema.pavista)}</div>
              <div class="discount-tag">${tagEconomiaPix(sistema.ppix || 0, sistema.pavista || 0)}</div>
              <div class="pix-price"><strong>PIX: ${formatBRL(sistema.ppix)}</strong></div>

              <div class="payment-options">
                <div class="payment-option pix-highlight">
                  <strong>12× no cartão</strong><br>
                  ${formatBRL(sistema.p12x)}
                </div>
                <div class="payment-option">
                  <strong>18× cartão</strong><br>
                  ${formatBRL(sistema.p18x_parcela)}
                </div>
              </div>

              <button type="button" class="cta-button" style="margin-top:12px;width:100%" data-pieng-pay data-pix="${sistema.ppix || 0}">OUTRAS FORMAS DE PAGAMENTO</button>
            </div>

            <div class="performance-box">
              <strong>Performance Mensal</strong><br>
              Geração: ${(sistema.geracaoMensal || 0).toFixed(0)} kWh | Cobertura: ${(Number(sistema.cobertura) || 0).toFixed(0)}%<br>
              Economia: R$ ${(sistema.economiaMensal || 0).toFixed(2)} | Payback: ${(sistema.paybackMeses || 0).toFixed(1)} meses<br>
              TIR: ${(sistema.tirAnual || 0).toFixed(1)}% ao ano
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // NOVO: Gerar cartões baseados nos Resultados Financeiros (estilo Gerador Rápido)
  private generateSystemCardsResultados(sistemas: Sistema[]): string {
    // Encontrar o sistema com melhor payback (menor valor em meses)
    const melhorPayback = Math.min(...sistemas.map(s => Number(s.paybackMeses) || 999));
    
    return sistemas.map((sistema, index) => {
      const paybackAtual = Number(sistema.paybackMeses) || 999;
      const isRecommended = paybackAtual === melhorPayback;
      const recommendedClass = isRecommended ? 'recommended' : '';
      const badge = isRecommended ? '<div class="card-badge">🏆 MELHOR PAYBACK</div>' : '';

      // USAR DADOS REAIS DA TABELA (como no Gerador Rápido)
      const modulosReais = sistema.modulos || Math.round(sistema.potTotal * 1000 / 580);
      const potModuloReal = sistema.pot_modulo || 580;
      const marcaModuloReal = sistema.marca_modulo || 'monocristalino';
      const inversoresReais = sistema.inversores || 1;
      const potInversorReal = sistema.pot_inv || Math.ceil(sistema.potTotal || 0);
      const marcaInversorReal = sistema.marca_inversor || 'string';
      const tipoInstalacao = sistema.tipo_instalacao || 'Telhado Fibrocimento';

      return `
        <div class="system-card ${recommendedClass}">
          ${badge}
          <div class="card-header">
            <div class="card-title">
              ${index === 0 ? '<span style="color: #f39c12;">🏆</span>' : ''}
              ${sistema.nome || `Sistema ${index + 1}`}
              ${isRecommended ? ' ⭐ RECOMENDADO' : ''}
            </div>
            <div class="card-power">Potência: ${(sistema.potTotal || 0).toFixed(2)} kWp</div>
          </div>
          <div class="card-body">
            <ul class="specs-list">
              <li>${modulosReais} módulos ${potModuloReal}W ${marcaModuloReal}</li>
              <li>${inversoresReais} inversor${inversoresReais > 1 ? 'es' : ''} ${marcaInversorReal} ${potInversorReal}kW</li>
              <li>Estrutura de alumínio para ${tipoInstalacao.toLowerCase()}</li>
              <li>Cabeamento CC/CA completo</li>
              <li>String box DC/AC</li>
            </ul>

            <div class="pricing-section">
              <div class="original-price">Promoção de <span class="valor-riscado">${formatBRL(sistema.priscado)}</span></div>
              <div class="current-price">à vista ${formatBRL(sistema.pavista)}</div>
              <div class="discount-tag">${tagEconomiaPix(sistema.ppix || 0, sistema.pavista || 0)}</div>
              <div style="font-size: 18px; font-weight: 700; color: var(--success); margin: 10px 0;">
                PIX: ${formatBRL(sistema.ppix)}
              </div>

              <div class="payment-options">
                <div class="payment-option pix-highlight">
                  <strong>12× no cartão</strong><br>
                  ${formatBRL(sistema.p12x)}
                </div>
                <div class="payment-option">
                  <strong>18× cartão</strong><br>
                  ${formatBRL(sistema.p18x_parcela)}
                </div>
              </div>

              <button type="button" class="cta-button" style="margin-top:12px;width:100%" data-pieng-pay data-pix="${sistema.ppix || 0}">OUTRAS FORMAS DE PAGAMENTO</button>
            </div>

            <div class="performance-box">
              <strong>📊 Análise Financeira Completa</strong><br>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px; font-size: 13px;">
                <div><strong>Geração:</strong> ${(sistema.geracaoMensal || 0).toFixed(0)} kWh</div>
                <div><strong>Cobertura:</strong> ${(Number(sistema.cobertura) || 0).toFixed(0)}%</div>
                <div><strong>Economia:</strong> R$ ${(sistema.economiaMensal || 0).toFixed(2)}</div>
                <div><strong>Payback:</strong> ${(sistema.paybackMeses || 0).toFixed(1)} meses</div>
                <div><strong>TIR:</strong> ${(sistema.tirAnual || 0).toFixed(1)}%</div>
                <div><strong>Potência:</strong> ${(sistema.potTotal || 0).toFixed(2)} kWp</div>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }
}

/**
 * Função helper para carregar o template padrão do arquivo
 */
export async function loadTemplatePadrao(): Promise<string> {
  const templatePath = path.join(process.cwd(), 'src/data/knowledge/templates/pieng_proposal_template.html');
  return fs.promises.readFile(templatePath, 'utf8');
}

/**
 * Função principal para gerar HTML usando o template padrão
 */
export async function generateTemplateHtmlPadrao(
  data: PropostaData,
  clientType?: ClientType,
  subType?: ComercialSubType
): Promise<string> {
  const templateHtml = await loadTemplatePadrao();
  const engine = new TemplateEnginePadrao(templateHtml, clientType, subType);
  return engine.render(data);
}

/**
 * NOVO: Função para gerar HTML usando o template de Resultados Financeiros
 * Usa o template padrão com as variáveis de Resultados Financeiros
 */
export async function generateTemplateHtmlResultados(
  data: PropostaData,
  clientType?: ClientType,
  subType?: ComercialSubType
): Promise<string> {
  const templatePath = path.join(process.cwd(), 'src/data/knowledge/templates/pieng_proposal_template.html');
  const templateHtml = await fs.promises.readFile(templatePath, 'utf8');
  const engine = new TemplateEnginePadrao(templateHtml, clientType, subType);
  return engine.render(data);
}
