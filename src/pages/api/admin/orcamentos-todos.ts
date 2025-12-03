import { NextApiRequest, NextApiResponse } from 'next';
import { promises as fs } from 'fs';
import path from 'path';
import { supabase } from '@/lib/supabase';

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
    geracaoMensal: number;
    paybackMeses: number;
    cobertura: number;
  }>;
  metadata?: {
    created: string;
    status: string;
  };
}

interface SistemaItem {
  titulo: string;
  potencia: number;
  modulos: number;
  inversores: number;
  valorTotal: number;
  geracaoMensal?: number;
  paybackMeses?: number;
  cobertura?: number;
}

interface OrcamentoItem {
  id: string;
  propostaId?: string; // ID do Supabase
  cliente: string;
  clientePasta: string;
  sistemas: SistemaItem[]; // ✅ Array de sistemas (propostas) do mesmo cliente
  status: 'pendente' | 'aprovado' | 'rejeitado';
  data: string;
  totalSistemas: number; // ✅ Quantidade de propostas
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const todosOrcamentos: OrcamentoItem[] = [];

    let total = 0;
    let pendentes = 0;
    let aprovados = 0;
    let rejeitados = 0;

    // 🚀 PRIORIDADE 1: Buscar do Supabase (PRODUÇÃO)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      try {
        console.log('🔍 Buscando propostas no Supabase...');

        // Buscar todas as propostas do Supabase
        const { data: propostas, error } = await supabase
          .from('propostas')
          .select('*, clientes(nome)')
          .eq('status', 'ativa')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('❌ Erro ao buscar do Supabase:', error);
          // Retornar vazio em caso de erro
          return res.status(200).json({ 
            orcamentos: [], 
            stats: { total: 0, pendentes: 0, aprovados: 0, rejeitados: 0 },
            source: 'supabase-error'
          });
        }

        if (propostas && propostas.length > 0) {
          console.log(`✅ ${propostas.length} propostas encontradas no Supabase`);

          // ✅ AGRUPAR SISTEMAS POR CLIENTE (uma linha por cliente)
          propostas.forEach((proposta: any) => {
            const dados = proposta.dados_completos;

            // Log detalhado para debug
            console.log('📋 Processando proposta:', {
              id: proposta.id,
              slug: proposta.slug,
              valor_total: proposta.valor_total,
              temDadosCompletos: !!dados,
              temSistemas: !!(dados && dados.sistemas),
              quantidadeSistemas: dados?.sistemas?.length || 0,
              primeiroSistema: dados?.sistemas?.[0] ? {
                titulo: dados.sistemas[0].titulo || dados.sistemas[0].nome,
                ppix: dados.sistemas[0].ppix,
                valorTotal: dados.sistemas[0].valorTotal,
                precoPixDecimal: dados.sistemas[0].precoPixDecimal,
                camposDisponiveis: Object.keys(dados.sistemas[0])
              } : null
            });

            if (dados && dados.sistemas && Array.isArray(dados.sistemas)) {
              // Status baseado na data
              const dataCriacao = new Date(proposta.created_at);
              const diasDesdeCriacao = (Date.now() - dataCriacao.getTime()) / (1000 * 60 * 60 * 24);

              let status: 'pendente' | 'aprovado' | 'rejeitado' = 'pendente';
              if (diasDesdeCriacao > 30) {
                status = 'aprovado';
              }

              // ✅ Processar todos os sistemas do cliente
              const sistemas: SistemaItem[] = dados.sistemas.map((sistema: any, index: number) => {
                // Extrair potência
                const potenciaMatch = sistema.potencia?.toString().match(/(\d+\.?\d*)/);
                const potencia = potenciaMatch ? parseFloat(potenciaMatch[1]) : sistema.potTotal || 0;

                // Calcular módulos e inversores
                const modulos = sistema.modulos || Math.round(potencia * 1000 / 605);
                const inversores = sistema.inversores || Math.ceil(potencia / 15);

                // Extrair valor total - tentar múltiplos campos e converter para número
                const extrairValor = (val: any): number => {
                  if (val === null || val === undefined) return 0;
                  if (typeof val === 'number') return isNaN(val) ? 0 : val;
                  if (typeof val === 'string') {
                    // Remover formatação (R$, espaços, pontos, vírgulas)
                    const limpo = val.replace(/[R$\s\.]/g, '').replace(',', '.');
                    const num = parseFloat(limpo);
                    return isNaN(num) ? 0 : num;
                  }
                  return 0;
                };

                // Tentar múltiplos campos para encontrar o valor
                let valorTotal = extrairValor(
                  sistema.ppix || 
                  sistema.valorTotal || 
                  sistema.total_final || 
                  sistema.precoPixDecimal ||
                  sistema.precoPix ||
                  sistema.valor ||
                  sistema.preco ||
                  sistema.preco_final ||
                  sistema.pavista ||
                  0
                );

                // Se ainda for 0 e for o primeiro sistema, tentar usar valor_total da proposta
                if (valorTotal === 0 && index === 0 && proposta.valor_total) {
                  valorTotal = extrairValor(proposta.valor_total);
                  console.log('✅ Usando valor_total da proposta como fallback:', valorTotal);
                }

                // Log para debug se valor for 0
                if (valorTotal === 0) {
                  console.log('⚠️ Sistema sem valor encontrado:', {
                    cliente: proposta.clientes?.nome || dados.cliente?.nome,
                    titulo: sistema.titulo || sistema.nome,
                    index,
                    campos: {
                      ppix: sistema.ppix,
                      valorTotal: sistema.valorTotal,
                      total_final: sistema.total_final,
                      precoPixDecimal: sistema.precoPixDecimal,
                      precoPix: sistema.precoPix,
                      valor: sistema.valor,
                      preco: sistema.preco,
                      preco_final: sistema.preco_final,
                      pavista: sistema.pavista,
                      proposta_valor_total: proposta.valor_total
                    },
                    sistemaCompleto: JSON.stringify(sistema).substring(0, 500)
                  });
                } else {
                  console.log('✅ Valor encontrado para sistema:', {
                    cliente: proposta.clientes?.nome || dados.cliente?.nome,
                    titulo: sistema.titulo || sistema.nome,
                    valorTotal
                  });
                }

                return {
                  titulo: sistema.titulo || `Sistema ${index + 1}`,
                  potencia,
                  modulos,
                  inversores,
                  valorTotal,
                  geracaoMensal: sistema.geracaoMensal,
                  paybackMeses: sistema.paybackMeses,
                  cobertura: sistema.cobertura || sistema.coberturaPercent
                };
              });

              // ✅ Criar UM orçamento por cliente com TODOS os sistemas
              const orcamento: OrcamentoItem = {
                id: proposta.slug,
                propostaId: proposta.id, // ✅ ID do banco Supabase
                cliente: proposta.clientes?.nome || dados.cliente?.nome || 'Cliente',
                clientePasta: proposta.slug,
                sistemas, // ✅ Array com todas as propostas do cliente
                status,
                data: proposta.created_at,
                totalSistemas: sistemas.length
              };

              todosOrcamentos.push(orcamento);
              total++;

              if (status === 'pendente') pendentes++;
              else if (status === 'aprovado') aprovados++;
              else if (status === 'rejeitado') rejeitados++;
            }
          });

          const stats = {
            total,
            pendentes,
            aprovados,
            rejeitados
          };

          console.log(`✅ Orçamentos processados: ${total} clientes com ${todosOrcamentos.reduce((sum, o) => sum + o.totalSistemas, 0)} sistemas totais`);
          return res.status(200).json({ orcamentos: todosOrcamentos, stats, source: 'supabase' });
        } else {
          // ✅ Nenhuma proposta encontrada - retornar vazio
          console.log('ℹ️ Nenhuma proposta encontrada no Supabase');
          return res.status(200).json({ 
            orcamentos: [], 
            stats: { total: 0, pendentes: 0, aprovados: 0, rejeitados: 0 },
            source: 'supabase-empty'
          });
        }
      } catch (supabaseError) {
        console.error('⚠️ Erro ao buscar do Supabase, usando fallback filesystem:', supabaseError);
        // Continuar para fallback filesystem
      }
    }

    // 🗂️ PRIORIDADE 2: Fallback para Filesystem (DESENVOLVIMENTO)
    console.log('🔍 Buscando orçamentos no filesystem (fallback)...');
    const clientesDir = path.join(process.cwd(), 'src/data/clientes');
    
    // Verificar se o diretório existe
    try {
      await fs.access(clientesDir);
    } catch {
      return res.status(200).json({ 
        orcamentos: [], 
        stats: { total: 0, pendentes: 0, aprovados: 0, rejeitados: 0 },
        source: 'filesystem-empty'
      });
    }

    const pastas = await fs.readdir(clientesDir);

    for (const pasta of pastas) {
      const clientePath = path.join(clientesDir, pasta);
      const stat = await fs.stat(clientePath);
      
      if (!stat.isDirectory()) continue;

      try {
        // Tentar ler proposta.json
        const propostaPath = path.join(clientePath, 'proposta.json');

        try {
          const propostaData = await fs.readFile(propostaPath, 'utf8');
          const proposta: PropostaData = JSON.parse(propostaData);

          // Determinar status baseado na data de criação
          const dataCriacao = proposta.metadata?.created ? new Date(proposta.metadata.created) : stat.mtime;
          const diasDesdeCriacao = (Date.now() - dataCriacao.getTime()) / (1000 * 60 * 60 * 24);

          let status: 'pendente' | 'aprovado' | 'rejeitado' = 'pendente';
          if (diasDesdeCriacao > 30) {
            status = 'aprovado'; // Propostas antigas consideradas aprovadas
          }

          // ✅ AGRUPAR todos os sistemas do cliente
          const sistemas: SistemaItem[] = proposta.sistemas.map((sistema, index) => {
            // Extrair números da potência (ex: "19.36 kWp" -> 19.36)
            const potenciaMatch = sistema.potencia.match(/(\d+\.?\d*)/);
            const potencia = potenciaMatch ? parseFloat(potenciaMatch[1]) : 0;

            // Calcular módulos baseado na potência (assumindo módulos de 605W)
            const modulos = Math.round(potencia * 1000 / 605);

            // Calcular inversores baseado na potência (assumindo inversores de 15kW)
            const inversores = Math.ceil(potencia / 15);

            return {
              titulo: sistema.titulo || `Sistema ${index + 1}`,
              potencia,
              modulos,
              inversores,
              valorTotal: sistema.valorTotal,
              geracaoMensal: sistema.geracaoMensal,
              paybackMeses: sistema.paybackMeses,
              cobertura: sistema.cobertura
            };
          });

          // ✅ Criar UM orçamento por cliente com TODOS os sistemas
          const orcamento: OrcamentoItem = {
            id: pasta,
            propostaId: undefined, // Filesystem não tem ID do Supabase
            cliente: proposta.cliente.nome,
            clientePasta: pasta,
            sistemas, // ✅ Array com todas as propostas do cliente
            status,
            data: proposta.metadata?.created || stat.mtime.toISOString(),
            totalSistemas: sistemas.length
          };

          todosOrcamentos.push(orcamento);
          total++;

          if (status === 'pendente') pendentes++;
          else if (status === 'aprovado') aprovados++;
          else if (status === 'rejeitado') rejeitados++;

        } catch (error) {
          // Arquivo proposta.json não existe ou tem erro, pular
          console.log(`Pasta ${pasta} não tem proposta.json válida`);
        }

      } catch (error) {
        console.error(`Erro ao processar cliente ${pasta}:`, error);
      }
    }

    // Ordenar por data (mais recente primeiro)
    todosOrcamentos.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

    const stats = {
      total,
      pendentes,
      aprovados,
      rejeitados
    };

    console.log(`✅ Orçamentos processados (filesystem): ${total}`);
    res.status(200).json({ orcamentos: todosOrcamentos, stats, source: 'filesystem' });

  } catch (error) {
    console.error('Erro ao listar orçamentos:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
}
