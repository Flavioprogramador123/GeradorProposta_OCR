import { NextApiRequest, NextApiResponse } from 'next';
import { promises as fs } from 'fs';
import path from 'path';
import { findOrCreateCliente } from '@/lib/supabase';

interface NovoClienteData {
  nome: string;
  cidade: string;
  estado: string;
  tipoImovel: 'Residencial' | 'Comercial' | 'Industrial' | 'Rural';
  hspLocal: number;
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
    if (!data.nome || !data.cidade) {
      return res.status(400).json({ message: 'Dados obrigatórios faltando' });
    }

    // Criar nome da pasta (sanitizado)
    const folderName = sanitizeFolderName(data.nome);
    const slug = sanitizeSlug(data.nome, data.cidade);
    
    // Detectar ambiente serverless
    const isServerless = process.env.NETLIFY || process.env.VERCEL || process.env.NODE_ENV === 'production';
    
    // Definir diretório base
    const baseDir = isServerless ? '/tmp' : path.join(process.cwd(), 'src/data/clientes');
    const clientFolder = path.join(baseDir, folderName);

    // Criar pasta do cliente (apenas localmente)
    if (!isServerless) {
      try {
        await fs.mkdir(clientFolder, { recursive: true });
      } catch (error) {
        console.log('Pasta já existe ou erro ao criar:', error);
      }
    }

    // Conteúdo dos arquivos
    const dadosUsuarioContent = `cliente: ${data.nome}
cidade: ${data.cidade}-${data.estado}${data.observacoes ? ` (${data.observacoes})` : ''};
IMovel: ${data.tipoImovel};
HSP: ${data.hspLocal}
`;

    const propostaData = {
      cliente: {
        nome: data.nome,
        cidade: `${data.cidade}/${data.estado}`,
        tipo: data.tipoImovel,
        hspLocal: data.hspLocal.toString(),
        slug: slug,
        pasta: folderName,
        consumoMensal: 0,
        estado: data.estado
      },
      sistemas: [],
      orcamentos: [],
      metadata: {
        created: new Date().toISOString(),
        status: 'aguardando_orcamentos'
      }
    };

    const readmeContent = `# Cliente: ${data.nome}

## Próximos Passos:

1. **Adicionar Orçamentos**: Use /admin/orcamentos/${folderName}
2. **Gerar Proposta**: Sistema calculará automaticamente
3. **URL da Proposta**: /proposta/${slug}

## Dados do Cliente:
- **Nome**: ${data.nome}
- **Cidade**: ${data.cidade}/${data.estado}
- **Tipo**: ${data.tipoImovel}
- **HSP Local**: ${data.hspLocal}
- **Status**: Aguardando orçamentos

## URL Final:
\`https://pieng-propostas.netlify.app/proposta/${slug}\`
`;

    // Salvar arquivos apenas localmente
    if (!isServerless) {
      await fs.writeFile(
        path.join(clientFolder, 'dadosusuario.md'),
        dadosUsuarioContent,
        'utf8'
      );

      await fs.writeFile(
        path.join(clientFolder, 'proposta.json'),
        JSON.stringify(propostaData, null, 2),
        'utf8'
      );

      await fs.writeFile(
        path.join(clientFolder, 'README.md'),
        readmeContent,
        'utf8'
      );
    }

    // 🚀 SALVAR NO SUPABASE (PRODUÇÃO E DESENVOLVIMENTO) - OBRIGATÓRIO
    let clienteSupabase = null;
    let supabaseError = null;
    
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey) {
        console.warn('⚠️ Variáveis Supabase não configuradas');
        return res.status(500).json({ 
          message: 'Erro: Variáveis Supabase não configuradas. Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no Vercel.',
          error: 'SUPABASE_NOT_CONFIGURED'
        });
      }

      console.log('💾 Salvando cliente no Supabase...');
      clienteSupabase = await findOrCreateCliente({
        nome: data.nome,
        cidade: `${data.cidade}/${data.estado}`,
        estado: data.estado,
        tipo_imovel: data.tipoImovel.toLowerCase(),
        hsp_local: data.hspLocal,
        consumo_mensal: 0,
        email: undefined,
        telefone: undefined,
        pdespesa: undefined,
      });

      if (!clienteSupabase || !clienteSupabase.id) {
        throw new Error('Cliente não foi criado no Supabase');
      }

      console.log('✅ Cliente salvo no Supabase:', clienteSupabase.id);
      
    } catch (error) {
      console.error('❌ ERRO ao salvar no Supabase:', error);
      supabaseError = error instanceof Error ? error.message : 'Erro desconhecido';
      
      // Em produção, erro no Supabase é crítico
      const isProduction = process.env.VERCEL || process.env.NODE_ENV === 'production';
      
      if (isProduction) {
        return res.status(500).json({ 
          message: 'Erro ao salvar cliente no banco de dados',
          error: supabaseError,
          details: error instanceof Error ? error.stack : undefined
        });
      }
    }

    // Resposta com dados do cliente
    res.status(200).json({ 
      message: 'Cliente criado com sucesso!',
      folderName,
      slug,
      clientFolder: `src/data/clientes/${folderName}/`,
      cliente: propostaData.cliente,
      clienteSupabase: clienteSupabase ? {
        id: clienteSupabase.id,
        created_at: clienteSupabase.created_at
      } : null,
      isServerless,
      files: !isServerless ? {
        dadosusuario: dadosUsuarioContent,
        proposta: propostaData,
        readme: readmeContent
      } : null
    });

  } catch (error) {
    console.error('Erro ao criar cliente:', error);
    res.status(500).json({ 
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}