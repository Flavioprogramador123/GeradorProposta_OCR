import { NextApiRequest, NextApiResponse } from 'next';
import { promises as fs } from 'fs';
import path from 'path';
import { carregarConfiguracoes, aplicarMarkup, calcularPayback, calcularTIR } from '@/utils/configuracoes';

interface OrcamentoAprovado {
  id: string;
  fornecedor: string;
  valorTotal: number;
  componentes: any;
}

interface SistemaGerado {
  titulo: string;
  fornecedor: string;
  potencia: string;
  especificacoes: string[];
  precoPixDecimal: number;
  preco12x: string;
  preco18x: string;
  payback: string;
  tir: string;
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
  specs.push('Garantia de 25 anos');
  
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
    
    // Aplicar markup baseado no tipo
    const precoFinal = aplicarMarkup(
      orcamento.valorTotal * 0.7, // Simular pcusto (70% do valor total)
      parseFloat(clienteData.pdespesa) || 0,
      tipoSistema,
      config
    );
    
    // Calcular preço PIX com desconto
    const precoPixDecimal = precoFinal * (1 - config.descontoPix);
    
    // Calcular parcelas
    const valor12x = precoFinal * (1 + config.jurosParcela12x / 100);
    const valor18x = precoFinal * (1 + config.jurosParcela18x / 100);
    
    const parcela12x = valor12x / 12;
    const parcela18x = valor18x / 18;
    
    // Calcular economia anual (estimativa)
    const consumoAnual = parseFloat(clienteData.consumoKwh) * 12;
    const economiaAnual = consumoAnual * 0.8 * 0.7; // Estimativa simplificada
    
    // Calcular payback e TIR
    const paybackMeses = calcularPayback(precoPixDecimal, economiaAnual, config);
    const tir = calcularTIR(precoPixDecimal, economiaAnual);
    
    const sistema: SistemaGerado = {
      titulo,
      fornecedor: orcamento.fornecedor,
      potencia: `${potenciaKwp.toFixed(2)} kWp`,
      especificacoes: gerarEspecificacoes(orcamento),
      precoPixDecimal,
      preco12x: `R$ ${parcela12x.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      preco18x: `R$ ${parcela18x.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      payback: `${paybackMeses.toFixed(1)} meses`,
      tir: `${tir.toFixed(1)}%`,
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
      const payback = parseFloat(sistema.payback);
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
    
    // Criar/atualizar README com instruções para adicionar ao slug
    const readmePath = path.join(clientePath, 'README.md');
    const readmeContent = `# Proposta Gerada - ${clienteData.nome}

## ✅ Proposta Criada com Sucesso!

### Próximos Passos:

1. **Adicionar Slug**: Adicionar \`${slug}\` em \`src/pages/proposta/[slug].tsx\`
2. **Deploy**: Fazer commit e deploy para ativar a URL

### Informações:
- **Cliente**: ${clienteData.nome}
- **Sistemas Gerados**: ${sistemas.length}
- **Orçamentos Utilizados**: ${orcamentos.length}
- **Gerado em**: ${new Date().toLocaleString('pt-BR')}

### URL Final:
\`https://pieng-propostas.vercel.app/proposta/${slug}\`

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