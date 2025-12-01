import { NextApiRequest, NextApiResponse } from 'next';
import { promises as fs } from 'fs';
import path from 'path';
import { getClientesWithPropostas, getAllClientes } from '@/lib/supabase';

interface ClienteInfo {
  nome: string;
  cidade: string;
  pasta: string;
  status: string;
  ultimaModificacao: string;
  temProposta: boolean;
  id?: string; // ID do Supabase
}

interface PropostaData {
  cliente: {
    nome: string;
    cidade: string;
    consumoMensal: number;
    tipoInstalacao?: string;
  };
  sistemas: Array<{
    titulo: string;
    potencia: string;
    valorTotal: number;
  }>;
  metadata?: {
    created: string;
    status: string;
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Inicializar variáveis de estatísticas
    let propostasGeradas = 0;
    let aguardandoOrcamentos = 0;
    
    // 🚀 PRIORIDADE 1: Buscar do Supabase (PRODUÇÃO)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      try {
        console.log('🔍 Buscando clientes no Supabase...');
        const clientesSupabase = await getClientesWithPropostas();
        
        if (clientesSupabase && clientesSupabase.length > 0) {
          console.log(`✅ ${clientesSupabase.length} clientes encontrados no Supabase`);

          // Converter formato Supabase para ClienteInfo
          const clientes: ClienteInfo[] = clientesSupabase
            .map((cliente: any) => {
              const nomeSeguro = (cliente.nome || cliente.slug || 'cliente')
                .toString()
                .trim();

              // Gerar pasta do nome (sanitizado)
              const pasta = nomeSeguro
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-z0-9]/g, '')
                .slice(0, 20) || 'cliente';

              // Determinar status baseado nas propostas
              let status = 'aguardando_orcamentos';
              if (cliente.temProposta) {
                const ultimaProposta = cliente.propostas?.[0];
                status = ultimaProposta?.status || 'proposta_gerada';
              }

              const ultimaData = cliente.updated_at || cliente.created_at || new Date().toISOString();

              return {
                nome: nomeSeguro,
                cidade: cliente.cidade || 'N/A',
                pasta,
                status,
                ultimaModificacao: new Date(ultimaData).toLocaleDateString('pt-BR'),
                temProposta: cliente.temProposta || (cliente.propostas?.length > 0) || false,
                id: cliente.id
              };
            })
            .filter(Boolean);

          // Contar estatísticas
          propostasGeradas = clientes.filter(c => c.temProposta).length;
          aguardandoOrcamentos = clientes.length - propostasGeradas;

          const stats = {
            totalClientes: clientes.length,
            propostasGeradas,
            aguardandoOrcamentos
          };

          console.log(`API Clientes (Supabase): ${clientes.length} clientes (${propostasGeradas} com propostas, ${aguardandoOrcamentos} aguardando)`);

          return res.status(200).json({ clientes, stats, source: 'supabase' });
        }
      } catch (supabaseError) {
        console.error('⚠️ Erro ao buscar do Supabase, usando fallback filesystem:', supabaseError);
        // Continuar para fallback filesystem
      }
    }

    // 🗂️ PRIORIDADE 2: Fallback para Filesystem (DESENVOLVIMENTO)
    console.log('🔍 Buscando clientes no filesystem (fallback)...');
    const isServerless = process.env.NETLIFY || process.env.VERCEL || process.env.NODE_ENV === 'production';
    
    // Definir diretório base baseado no ambiente
    const baseDir = isServerless ? '/tmp' : process.cwd();
    const clientesDir = path.join(baseDir, 'src/data/clientes');
    
    // Verificar se o diretório existe
    let pastas: string[] = [];
    let finalClientesDir = clientesDir;

    try {
      await fs.access(clientesDir);
      pastas = await fs.readdir(clientesDir);
    } catch {
      // Se não conseguir acessar, tentar caminho alternativo
      const altClientesDir = path.join(process.cwd(), 'src/data/clientes');
      try {
        await fs.access(altClientesDir);
        pastas = await fs.readdir(altClientesDir);
        finalClientesDir = altClientesDir;
      } catch {
        console.log('Diretório de clientes não encontrado, retornando lista vazia');
        return res.status(200).json({
          clientes: [],
          stats: { totalClientes: 0, propostasGeradas: 0, aguardandoOrcamentos: 0 }
        });
      }
    }

    const clientes: ClienteInfo[] = [];
    // propostasGeradas e aguardandoOrcamentos já inicializadas no início da função

    for (const pasta of pastas) {
      const clientePath = path.join(finalClientesDir, pasta);
      
      try {
        const stat = await fs.stat(clientePath);
        if (!stat.isDirectory()) continue;

        // Tentar ler proposta.json primeiro
        let clienteData: ClienteInfo = {
          nome: pasta,
          cidade: 'N/A',
          pasta,
          status: 'aguardando_orcamentos',
          ultimaModificacao: stat.mtime.toLocaleDateString('pt-BR'),
          temProposta: false
        };

        try {
          const propostaPath = path.join(clientePath, 'proposta.json');
          const propostaData = await fs.readFile(propostaPath, 'utf8');
          const proposta: PropostaData = JSON.parse(propostaData);
          
          // Usar dados da proposta
          clienteData.nome = proposta.cliente.nome;
          clienteData.cidade = proposta.cliente.cidade;
          clienteData.temProposta = true;
          clienteData.status = proposta.metadata?.status || 'proposta_gerada';
          clienteData.ultimaModificacao = proposta.metadata?.created 
            ? new Date(proposta.metadata.created).toLocaleDateString('pt-BR')
            : stat.mtime.toLocaleDateString('pt-BR');
          
          propostasGeradas++;
          
        } catch (error) {
          // Se não conseguir ler proposta.json, tentar dadosusuario.md
          try {
            const dadosUsuarioPath = path.join(clientePath, 'dadosusuario.md');
            const dadosUsuario = await fs.readFile(dadosUsuarioPath, 'utf8');
            
            // Parse básico do arquivo dadosusuario.md
            const lines = dadosUsuario.split('\n');
            for (const line of lines) {
              if (line.startsWith('cliente:')) {
                clienteData.nome = line.split(':')[1]?.trim() || pasta;
              } else if (line.startsWith('cidade:')) {
                clienteData.cidade = line.split(':')[1]?.trim() || 'N/A';
              }
            }
            
            aguardandoOrcamentos++;
            
          } catch (error2) {
            // Se não conseguir ler nenhum arquivo, usar dados mínimos
            console.log(`Cliente ${pasta}: usando dados mínimos`);
            aguardandoOrcamentos++;
          }
        }

        clientes.push(clienteData);

      } catch (error) {
        console.error(`Erro ao processar cliente ${pasta}:`, error);
        // Adicionar cliente com dados mínimos mesmo com erro
        clientes.push({
          nome: pasta,
          cidade: 'Erro ao carregar',
          pasta,
          status: 'erro',
          ultimaModificacao: new Date().toLocaleDateString('pt-BR'),
          temProposta: false
        });
      }
    }

    // Ordenar por última modificação (mais recente primeiro)
    clientes.sort((a, b) => {
      try {
        const dateA = new Date(a.ultimaModificacao).getTime();
        const dateB = new Date(b.ultimaModificacao).getTime();

        // Se data inválida, mover para o final
        if (isNaN(dateA)) return 1;
        if (isNaN(dateB)) return -1;

        return dateB - dateA;
      } catch (error) {
        console.error('Erro ao ordenar clientes:', error);
        return 0;
      }
    });

    const stats = {
      totalClientes: clientes.length,
      propostasGeradas,
      aguardandoOrcamentos
    };

    console.log(`API Clientes: ${clientes.length} clientes encontrados (${propostasGeradas} com propostas, ${aguardandoOrcamentos} aguardando)`);

    res.status(200).json({ clientes, stats });

  } catch (error) {
    console.error('❌ ERRO CRÍTICO ao listar clientes:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'N/A');

    res.status(500).json({
      message: 'Erro interno do servidor ao listar clientes',
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
}