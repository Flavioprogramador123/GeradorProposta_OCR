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
  propostaPausada?: boolean;
  analytics?: {
    visualizacoes: number;
    ultimaVisualizacao: string | null;
    precisaContato: boolean;
  } | null;
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

        // Lista vazia do Supabase = resposta válida (não cair no filesystem fantasma)
        if (Array.isArray(clientesSupabase)) {
          console.log(`✅ ${clientesSupabase.length} clientes encontrados no Supabase`);

          if (clientesSupabase.length === 0) {
            return res.status(200).json({
              clientes: [],
              stats: { totalClientes: 0, propostasGeradas: 0, aguardandoOrcamentos: 0 },
              source: 'supabase',
            });
          }

          // Converter formato Supabase para ClienteInfo
          const clientes: ClienteInfo[] = clientesSupabase
            .map((cliente: any) => {
              const nomeSeguro = (cliente.nome || cliente.slug || 'cliente')
                .toString()
                .trim();

              // Slug da proposta > slug do cliente > id UUID (nunca colapsar vários em "cliente")
              let pasta =
                (cliente.temProposta && cliente.propostas?.[0]?.slug) ||
                cliente.slug ||
                cliente.id ||
                'cliente';

              const temProposta = cliente.temProposta || (cliente.propostas?.length > 0) || false;
              // Status de engajamento é preenchido abaixo com analytics
              let status = temProposta ? 'nao_aberta' : 'aguardando_orcamentos';

              const ultimaData = cliente.updated_at || cliente.created_at || new Date().toISOString();

              return {
                nome: nomeSeguro,
                cidade: cliente.cidade || 'N/A',
                pasta, // ✅ Agora usa slug real da proposta
                status,
                ultimaModificacao: new Date(ultimaData).toLocaleDateString('pt-BR'),
                temProposta,
                propostaPausada: cliente.proposta_pausada || false,
                id: cliente.id,
                analytics: null as null | {
                  visualizacoes: number;
                  ultimaVisualizacao: string | null;
                  precisaContato: boolean;
                }
              };
            })
            .filter(Boolean);

          // Engajamento: proposta aberta x nunca aberta (proposta_analytics)
          const slugsComProposta = clientes.filter(c => c.temProposta).map(c => c.pasta);
          if (slugsComProposta.length > 0) {
            try {
              const { createClient } = await import('@supabase/supabase-js');
              const sb = createClient(supabaseUrl, supabaseKey);
              const { data: rows } = await sb
                .from('proposta_analytics')
                .select('proposta_slug, visualizacoes_count, ultima_visualizacao, precisa_contato, tempo_total_segundos, scroll_percentage')
                .in('proposta_slug', slugsComProposta);

              const bySlug = new Map<string, {
                visualizacoes: number;
                ultimaVisualizacao: string | null;
                precisaContato: boolean;
                tempoTotal: number;
                scrollMax: number;
              }>();

              for (const row of rows || []) {
                const key = row.proposta_slug as string;
                const prev = bySlug.get(key) || {
                  visualizacoes: 0,
                  ultimaVisualizacao: null as string | null,
                  precisaContato: false,
                  tempoTotal: 0,
                  scrollMax: 0,
                };
                prev.visualizacoes += row.visualizacoes_count || 0;
                prev.precisaContato = prev.precisaContato || !!row.precisa_contato;
                prev.tempoTotal += row.tempo_total_segundos || 0;
                prev.scrollMax = Math.max(prev.scrollMax, row.scroll_percentage || 0);
                if (row.ultima_visualizacao) {
                  if (!prev.ultimaVisualizacao || row.ultima_visualizacao > prev.ultimaVisualizacao) {
                    prev.ultimaVisualizacao = row.ultima_visualizacao;
                  }
                }
                bySlug.set(key, prev);
              }

              for (const c of clientes) {
                if (!c.temProposta) {
                  c.status = 'aguardando_orcamentos';
                  continue;
                }
                if (c.propostaPausada) {
                  c.status = 'pausada';
                  continue;
                }
                const eng = bySlug.get(c.pasta);
                if (!eng || eng.visualizacoes <= 0) {
                  c.status = 'nao_aberta';
                  c.analytics = { visualizacoes: 0, ultimaVisualizacao: null, precisaContato: false };
                  continue;
                }

                let diasSemVer: number | null = null;
                if (eng.ultimaVisualizacao) {
                  diasSemVer = Math.floor(
                    (Date.now() - new Date(eng.ultimaVisualizacao).getTime()) / (1000 * 60 * 60 * 24)
                  );
                }

                c.analytics = {
                  visualizacoes: eng.visualizacoes,
                  ultimaVisualizacao: eng.ultimaVisualizacao,
                  precisaContato: eng.precisaContato || (diasSemVer !== null && diasSemVer >= 7),
                };

                if (c.analytics.precisaContato) {
                  c.status = 'precisa_contato';
                } else if (eng.tempoTotal >= 180 || eng.scrollMax >= 70) {
                  c.status = 'interessada';
                } else {
                  c.status = 'visualizada';
                }
              }
            } catch (engErr) {
              console.warn('⚠️ Não foi possível enriquecer status com analytics:', engErr);
            }
          }

          // Contar estatísticas
          propostasGeradas = clientes.filter(c => c.temProposta).length;
          aguardandoOrcamentos = clientes.filter(c => c.status === 'aguardando_orcamentos' || c.status === 'nao_aberta').length;

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