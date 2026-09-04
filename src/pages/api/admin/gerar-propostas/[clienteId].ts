import { NextApiRequest, NextApiResponse } from 'next';
import { promises as fs } from 'fs';
import path from 'path';
import { carregarConfiguracoes, aplicarMarkup, calcularPayback, calcularTIR } from '@/utils/configuracoes';
import { generateTemplateHtmlPadrao, generateTemplateHtmlResultados } from '@/lib/templateEngine';
import { calcularPrecosDePix } from '@/lib/tabelaJurosCartao';

interface OrcamentoAprovado {
  id: string;
  fornecedor: string;
  valorTotal: number;
  componentes: any;
}

interface SistemaGerado {
  nome: string;
  fornecedor: string;
  potTotal: number;
  modulos: number;
  pot_modulo: number;
  marca_modulo: string;
  inversores: number;
  pot_inv: number;
  marca_inversor: string;
  pcusto: number;
  pdespesa_total: number;
  total_final: number;
  ppix: number;
  pavista: number;
  priscado: number;
  p12x: number;
  p12x_total: number;
  p18x_parcela: number;
  p18x_total: number;
  geracaoMensal: number;
  cobertura: number;
  economiaMensal: number;
  paybackMeses: number;
  tirAnual: number;
  isRecommended: boolean;
  badge?: string;
}

function sanitizeSlug(name: string, city: string): string {
  const combined = `${name}-${city}`;
  return combined
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9\s-]/g, '') // Remove caracteres especiais
    .replace(/\s+/g, '-') // Substitui espaços por hífens
    .replace(/-+/g, '-') // Remove hífens duplicados
    .replace(/^-+|-+$/g, ''); // Remove hífens do início e fim
}

function calcularPotenciaTotal(componentes: any): number {
  if (componentes?.modulos?.potencia && componentes?.modulos?.quantidade) {
    return (componentes.modulos.potencia * componentes.modulos.quantidade) / 1000; // kWp
  }
  return 0;
}

function gerarEspecificacoes(orcamento: OrcamentoAprovado): string[] {
  const specs = [];
  
  if (orcamento.componentes?.modulos) {
    const mod = orcamento.componentes.modulos;
    specs.push(`${mod.quantidade || 0} módulos ${mod.potencia || 0}W`);
  }
  
  if (orcamento.componentes?.inversores) {
    const inv = orcamento.componentes.inversores;
    specs.push(`${inv.quantidade || 0} inversor${inv.quantidade > 1 ? 'es' : ''} ${inv.potencia || 0}kW`);
  }
  
  if (orcamento.componentes?.estrutura) {
    specs.push('Estrutura de fixação completa');
  }
  
  if (orcamento.componentes?.outros?.length > 0) {
    specs.push('Kit completo (cabos, proteções, etc.)');
  }
  
  specs.push('Instalação e homologação incluídas');
  specs.push('Garantia módulos: 12 anos produto, 25 anos performance');
  specs.push('Garantia inversores: 5 anos');
  
  return specs;
}

async function gerarSistemasAPartirDosOrcamentos(
  orcamentos: OrcamentoAprovado[], 
  clienteData: any,
  config: any
): Promise<SistemaGerado[]> {
  const sistemas: SistemaGerado[] = [];
  
  // Ordenar orçamentos por valor (menor para maior)
  const orcamentosOrdenados = orcamentos.sort((a, b) => a.valorTotal - b.valorTotal);
  
  for (let i = 0; i < orcamentosOrdenados.length; i++) {
    const orcamento = orcamentosOrdenados[i];
    const potenciaKwp = calcularPotenciaTotal(orcamento.componentes);
    
    // Definir tipo de sistema baseado na posição
    let tipoSistema: 'economico' | 'standard' | 'premium' = 'standard';
    let titulo = 'Sistema Standard';
    
    if (i === 0) {
      tipoSistema = 'economico';
      titulo = 'Sistema Econômico';
    } else if (i === orcamentos.length - 1 && orcamentos.length > 2) {
      tipoSistema = 'premium';
      titulo = 'Sistema Premium';
    }
    
    // 🔧 NOVO: Usar modelo Pdespesa Fixo + Variável (igual ao gerador rápido)
    const pcusto = orcamento.valorTotal * 0.7; // Simular pcusto (70% do valor total)
    const pdespesaFixo = parseFloat(clienteData.pdespesaFixo) || 3000;
    const pdespesaVariavel = parseFloat(clienteData.pdespesaVariavel) || 22;
    const pdespesaTotal = pdespesaFixo + (pcusto * pdespesaVariavel / 100);
    const precoFinal = pcusto + pdespesaTotal; // Total = P.Custo + Pdespesa
    
    // PIX = base (total final); à vista / parcelas pela tabela do cartão
    const precos = calcularPrecosDePix(precoFinal, config.fatorParcelado || 1.20);
    const precoPixDecimal = precos.ppix;
    const { ppix, pavista, priscado, p12x, p12x_total, p18x_parcela, p18x_total } = precos;
    const parcela12x = p12x;
    const parcela18x = p18x_parcela;
    const valor12x = p12x_total;
    const valor18x = p18x_total;

    const consumoAnual = parseFloat(clienteData.consumoKwh) * 12;
    const economiaAnual = consumoAnual * 0.8 * 0.7;
    const paybackMeses = calcularPayback(precoPixDecimal, economiaAnual, config);
    const tir = calcularTIR(precoPixDecimal, economiaAnual);
    
    // Calcular geração mensal (estimativa)
    const geracaoMensal = potenciaKwp * parseFloat(clienteData.hspLocal) * 30 * 0.75; // Performance rate 75%
    const cobertura = (geracaoMensal / parseFloat(clienteData.consumoKwh)) * 100;
    const economiaMensal = geracaoMensal * 0.7; // Tarifa média
    
    const sistema: SistemaGerado = {
      nome: titulo,
      fornecedor: orcamento.fornecedor,
      potTotal: potenciaKwp,
      modulos: orcamento.componentes?.modulos?.quantidade || Math.round(potenciaKwp * 1000 / 580),
      pot_modulo: orcamento.componentes?.modulos?.potencia || 580,
      marca_modulo: orcamento.componentes?.modulos?.componente?.marca || 'monocristalino',
      inversores: orcamento.componentes?.inversores?.quantidade || 1,
      pot_inv: orcamento.componentes?.inversores?.potencia || Math.ceil(potenciaKwp),
      marca_inversor: orcamento.componentes?.inversores?.componente?.marca || 'string',
      pcusto: pcusto, // P.Custo calculado
      pdespesa_total: pdespesaTotal, // Pdespesa Fixo + Variável
      total_final: precoFinal, // Total = P.Custo + Pdespesa
      ppix,
      pavista,
      priscado,
      p12x,
      p12x_total,
      p18x_parcela,
      p18x_total,
      geracaoMensal,
      cobertura,
      economiaMensal,
      paybackMeses,
      tirAnual: tir,
      isRecommended: false, // Será definido depois
      badge: undefined
    };
    
    sistemas.push(sistema);
  }
  
  // Definir sistema recomendado (melhor payback)
  if (sistemas.length > 0) {
    let melhorPayback = Infinity;
    let melhorIndice = 0;
    
    sistemas.forEach((sistema, index) => {
      const payback = sistema.paybackMeses;
      if (payback < melhorPayback) {
        melhorPayback = payback;
        melhorIndice = index;
      }
    });
    
    sistemas[melhorIndice].isRecommended = true;
    sistemas[melhorIndice].badge = '⭐ MELHOR PAYBACK';
  }
  
  return sistemas;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { clienteId } = req.query;

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  if (!clienteId || typeof clienteId !== 'string') {
    return res.status(400).json({ message: 'ID do cliente é obrigatório' });
  }

  try {
    const { orcamentos } = req.body;
    
    if (!orcamentos || !Array.isArray(orcamentos) || orcamentos.length === 0) {
      return res.status(400).json({ 
        message: 'É necessário pelo menos 1 orçamento aprovado para gerar propostas' 
      });
    }

    // Carregar dados do cliente
    const clientePath = path.join(process.cwd(), 'src/data/clientes', clienteId);
    const dadosUsuarioPath = path.join(clientePath, 'dadosusuario.md');
    
    let clienteData: any = {};
    try {
      const dadosContent = await fs.readFile(dadosUsuarioPath, 'utf8');
      
      // Parse básico do dadosusuario.md
      const nomeMatch = dadosContent.match(/cliente:\s*(.+)/i);
      const cidadeMatch = dadosContent.match(/cidade:\s*(.+)/i);
      const consumoMatch = dadosContent.match(/consumo mensal:\s*(\d+)/i);
      const tipoMatch = dadosContent.match(/imovel:\s*(.+)/i);
      const hspMatch = dadosContent.match(/hsp:\s*([\d.,]+)/i);
      const pdespesaMatch = dadosContent.match(/pdespesa:\s*r\$?\s*([\d.,]+)/i);
      
      clienteData = {
        nome: nomeMatch ? nomeMatch[1].trim() : 'Cliente',
        cidade: cidadeMatch ? cidadeMatch[1].trim().split(/[-;]/)[0].trim() : 'Cidade',
        consumoKwh: consumoMatch ? consumoMatch[1] : '500',
        tipo: tipoMatch ? tipoMatch[1].trim() : 'Residencial',
        hspLocal: hspMatch ? hspMatch[1].replace(',', '.') : '5.21',
        pdespesa: pdespesaMatch ? pdespesaMatch[1].replace('.', '').replace(',', '.') : '0'
      };
    } catch (error) {
      return res.status(404).json({ message: 'Dados do cliente não encontrados' });
    }

    // Carregar configurações do sistema
    const config = await carregarConfiguracoes();
    
    // Gerar sistemas a partir dos orçamentos
    const sistemas = await gerarSistemasAPartirDosOrcamentos(orcamentos, clienteData, config);
    
    // Criar slug para a proposta
    const slug = sanitizeSlug(clienteData.nome, clienteData.cidade);
    
    // Criar dados da proposta
    const propostaData = {
      cliente: clienteData,
      sistemas,
      bannerUrgencia: 'Proposta válida por 15 dias. Energia solar com economia garantida!',
      metadata: {
        geradoEm: new Date().toISOString(),
        orcamentosUtilizados: orcamentos.map(o => o.id),
        versaoSistema: '2.0'
      }
    };
    
    // Salvar proposta.json
    const propostaPath = path.join(clientePath, 'proposta.json');
    await fs.writeFile(propostaPath, JSON.stringify(propostaData, null, 2), 'utf8');
    
    // 🚀 GERAR ARQUIVOS HTML USANDO TEMPLATE ENGINE
    try {
      // Preparar dados para o template engine
      const templateData = {
        cliente: clienteData,
        sistemas: sistemas,
        analise: {
          paybackMin: Math.min(...sistemas.map(s => s.paybackMeses)).toFixed(1),
          paybackMax: Math.max(...sistemas.map(s => s.paybackMeses)).toFixed(1),
          melhorSistemaNome: sistemas.find(s => s.isRecommended)?.nome || 'Sistema Recomendado',
          melhorSistemaPotencia: sistemas.find(s => s.isRecommended)?.potTotal.toFixed(2) + ' kWp' || '0 kWp',
          melhorSistemaPix: 'R$ ' + (sistemas.find(s => s.isRecommended)?.ppix.toFixed(2) || '0,00'),
          melhorSistemaPayback: sistemas.find(s => s.isRecommended)?.paybackMeses.toFixed(1) + ' meses' || '0 meses',
          geracaoMax: Math.max(...sistemas.map(s => s.geracaoMensal)).toFixed(0),
          coberturaMax: Math.max(...sistemas.map(s => s.cobertura)).toFixed(0) + '%',
          tirMax: Math.max(...sistemas.map(s => s.tirAnual)).toFixed(1) + '%',
          economiaTarifa: 'R$ 1,10'
        },
        empresa: {
          contato: '(62) 99167-0536',
          email: 'contato@piengsolucoes.com.br',
          whatsapp: '5562991670536',
          site: 'www.piengsolucoes.com.br'
        },
        dataGeracao: new Date().toLocaleDateString('pt-BR'),
        dataValidade: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR'),
        slug: slug,
        bannerUrgencia: 'Oferta especial por tempo limitado! Orçamento válido por 2 dias ou até acabar o estoque.'
      };

      // Gerar template padrão
      const templatePadraoHtml = await generateTemplateHtmlPadrao(templateData);
      const arquivoPadrao = `proposta_${slug}.html`;
      const arquivoPadraoPath = path.join(clientePath, arquivoPadrao);
      await fs.writeFile(arquivoPadraoPath, templatePadraoHtml, 'utf8');

      // Gerar template de resultados
      const templateResultadosHtml = await generateTemplateHtmlResultados(templateData);
      const arquivoResultados = `proposta_resultados_${slug}.html`;
      const arquivoResultadosPath = path.join(clientePath, arquivoResultados);
      await fs.writeFile(arquivoResultadosPath, templateResultadosHtml, 'utf8');

      console.log('✅ Templates HTML gerados com sucesso!');
    } catch (templateError) {
      console.error('❌ Erro ao gerar templates HTML:', templateError);
      // Continuar mesmo com erro no template
    }
    
    // Criar/atualizar README com instruções para adicionar ao slug
    const readmePath = path.join(clientePath, 'README.md');
    const readmeContent = `# Proposta Gerada - ${clienteData.nome}

## ✅ Proposta Criada com Sucesso!

### Arquivos Gerados:
- **proposta.json** - Dados estruturados da proposta
- **proposta_${slug}.html** - Template padrão com cards e tabela
- **proposta_resultados_${slug}.html** - Template de resultados financeiros

### Próximos Passos:

1. **Adicionar Slug**: Adicionar \`${slug}\` em \`src/pages/proposta/[slug].tsx\`
2. **Deploy**: Fazer commit e deploy para ativar a URL

### Informações:
- **Cliente**: ${clienteData.nome}
- **Sistemas Gerados**: ${sistemas.length}
- **Orçamentos Utilizados**: ${orcamentos.length}
- **Gerado em**: ${new Date().toLocaleString('pt-BR')}

### URLs Disponíveis:
- **Página Dinâmica**: \`https://pieng-propostas.vercel.app/proposta/${slug}\`
- **HTML Direto**: \`https://pieng-propostas.vercel.app/src/data/clientes/${slug}/proposta_${slug}.html\`

### Comando para adicionar slug:
\`\`\`typescript
// Em src/pages/proposta/[slug].tsx
export const getStaticPaths: GetStaticPaths = async () => {
  const paths = [
    { params: { slug: 'bin-pirinopolis' } },
    { params: { slug: '${slug}' } }, // ← Adicionar esta linha
    // outros slugs...
  ];
  return { paths, fallback: false };
};
\`\`\`
`;

    await fs.writeFile(readmePath, readmeContent, 'utf8');
    
    res.status(200).json({
      success: true,
      message: 'Propostas geradas com sucesso!',
      slug,
      sistemas: sistemas.length,
      previewUrl: `http://localhost:3000/proposta/${slug}`,
      data: {
        cliente: clienteData.nome,
        sistemas,
        orcamentosUtilizados: orcamentos.length
      }
    });

  } catch (error) {
    console.error('Erro ao gerar propostas:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erro interno do servidor ao gerar propostas',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}