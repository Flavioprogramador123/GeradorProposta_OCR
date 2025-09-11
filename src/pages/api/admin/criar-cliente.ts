import { NextApiRequest, NextApiResponse } from 'next';
import { promises as fs } from 'fs';
import path from 'path';

interface NovoClienteData {
  nome: string;
  cidade: string;
  estado: string;
  consumoMensal: number;
  tipoImovel: 'Residencial' | 'Comercial' | 'Industrial' | 'Rural';
  hspLocal: number;
  pdespesa: number;
  observacoes?: string;
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

function sanitizeFolderName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9]/g, '') // Remove tudo exceto letras e números
    .slice(0, 20); // Limita a 20 caracteres
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const data: NovoClienteData = req.body;

    // Validação básica
    if (!data.nome || !data.cidade || !data.consumoMensal || !data.pdespesa) {
      return res.status(400).json({ message: 'Dados obrigatórios faltando' });
    }

    // Criar nome da pasta (sanitizado)
    const folderName = sanitizeFolderName(data.nome);
    const slug = sanitizeSlug(data.nome, data.cidade);
    
    // Criar pasta do cliente
    const clientFolder = path.join(process.cwd(), 'src/data/clientes', folderName);
    await fs.mkdir(clientFolder, { recursive: true });

    // Criar arquivo dadosusuario.md
    const dadosUsuarioContent = `cliente: ${data.nome}
cidade: ${data.cidade}-${data.estado}${data.observacoes ? ` (${data.observacoes})` : ''};
Pdespesa: R$ ${data.pdespesa.toFixed(2)} para todos os orçamentos;
IMovel: ${data.tipoImovel};
HSP: ${data.hspLocal}
CONSUMO MENSAL: ${data.consumoMensal} KWH/MES
`;

    await fs.writeFile(
      path.join(clientFolder, 'dadosusuario.md'),
      dadosUsuarioContent,
      'utf8'
    );

    // Criar arquivo proposta.json inicial
    const propostaData = {
      cliente: {
        nome: data.nome,
        cidade: `${data.cidade}/${data.estado}`,
        consumoKwh: data.consumoMensal.toString(),
        tipo: data.tipoImovel,
        hspLocal: data.hspLocal.toString(),
        slug: slug
      },
      sistemas: [],
      metadata: {
        created: new Date().toISOString(),
        pdespesa: data.pdespesa,
        status: 'aguardando_orcamentos'
      }
    };

    await fs.writeFile(
      path.join(clientFolder, 'proposta.json'),
      JSON.stringify(propostaData, null, 2),
      'utf8'
    );

    // Criar arquivo README.md com instruções
    const readmeContent = `# Cliente: ${data.nome}

## Próximos Passos:

1. **Solicitar Orçamentos**: Coletar PDFs de fornecedores
2. **Extrair Dados**: Usar Task tool para extrair dados dos PDFs
3. **Gerar Proposta**: Sistema calculará automaticamente
4. **Adicionar Slug**: Adicionar '${slug}' em src/pages/proposta/[slug].tsx
5. **Deploy**: Fazer commit e deploy para ativar URL

## Dados do Cliente:
- **Nome**: ${data.nome}
- **Cidade**: ${data.cidade}/${data.estado}
- **Tipo**: ${data.tipoImovel}
- **Consumo**: ${data.consumoMensal} kWh/mês
- **HSP Local**: ${data.hspLocal}
- **Status**: Aguardando orçamentos

## URL Final:
\`https://pieng-propostas.vercel.app/proposta/${slug}\`
`;

    await fs.writeFile(
      path.join(clientFolder, 'README.md'),
      readmeContent,
      'utf8'
    );

    res.status(200).json({ 
      message: 'Cliente criado com sucesso!',
      folderName,
      slug,
      clientFolder: `src/data/clientes/${folderName}/`
    });

  } catch (error) {
    console.error('Erro ao criar cliente:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
}