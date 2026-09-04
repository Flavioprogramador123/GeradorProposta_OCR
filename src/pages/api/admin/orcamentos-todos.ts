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
  storageType?: 'supabase' | 'filesystem';
  storageLocation?: string;
}

interface OrcamentoItem {
  id: string;
  propostaId?: string;
  cliente: string;
  clientePasta: string;
  sistemas: SistemaItem[];
  status: 'pendente' | 'aprovado' | 'rejeitado';
  data: string;
  totalSistemas: number;
  storageType?: 'supabase' | 'filesystem';
  storageLocation?: string;
}

function extrairValor(val: unknown): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return Number.isNaN(val) ? 0 : val;
  if (typeof val === 'string') {
    const limpo = val.replace(/[R$\s.]/g, '').replace(',', '.');
    const num = parseFloat(limpo);
    return Number.isNaN(num) ? 0 : num;
  }
  return 0;
}

function statusFromDate(createdAt: string): 'pendente' | 'aprovado' | 'rejeitado' {
  const dataCriacao = new Date(createdAt);
  const diasDesdeCriacao = (Date.now() - dataCriacao.getTime()) / (1000 * 60 * 60 * 24);
  if (diasDesdeCriacao > 30) return 'aprovado';
  return 'pendente';
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

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey && supabase) {
      try {
        let propostas: any[] = [];
        const { data: comStatus, error: errStatus } = await supabase
          .from('propostas')
          .select('id, slug, created_at, valor_total, dados_completos, status, cliente_id')
          .eq('status', 'ativa')
          .order('created_at', { ascending: false });

        if (errStatus) {
          const { data: semFiltro, error: errSem } = await supabase
            .from('propostas')
            .select('id, slug, created_at, valor_total, dados_completos, status, cliente_id')
            .order('created_at', { ascending: false })
            .limit(200);
          if (errSem) {
            console.error('❌ Erro ao buscar propostas:', errSem);
            throw errSem;
          }
          propostas = semFiltro || [];
        } else {
          propostas = comStatus || [];
        }

        if (propostas.length > 0) {
          const clienteIds = [
            ...new Set(
              propostas
                .map((p) => p.cliente_id || p.dados_completos?.cliente?.id)
                .filter(Boolean)
            ),
          ] as string[];

          const clientesMap = new Map<string, string>();
          if (clienteIds.length > 0) {
            const { data: clientesRows } = await supabase.from('clientes').select('id, nome').in('id', clienteIds);
            (clientesRows || []).forEach((c: any) => clientesMap.set(c.id, c.nome));
          }

          propostas.forEach((proposta: any) => {
            const dados = proposta.dados_completos;
            const cid = proposta.cliente_id || dados?.cliente?.id;
            const nomeCliente =
              (cid && clientesMap.get(cid)) ||
              dados?.cliente?.nome ||
              proposta.clienteNome ||
              'Cliente';

            if (dados && Array.isArray(dados.sistemas) && dados.sistemas.length > 0) {
              const status = statusFromDate(proposta.created_at);

              const sistemas: SistemaItem[] = dados.sistemas.map((sistema: any, index: number) => {
                const potenciaMatch = sistema.potencia?.toString().match(/(\d+\.?\d*)/);
                const potencia = potenciaMatch ? parseFloat(potenciaMatch[1]) : sistema.potTotal || 0;
                const modulos = sistema.modulos || Math.round((potencia * 1000) / 605);
                const inversores = sistema.inversores || Math.ceil(potencia / 15);

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

                if (valorTotal === 0 && index === 0 && proposta.valor_total) {
                  valorTotal = extrairValor(proposta.valor_total);
                }

                return {
                  titulo: sistema.titulo || `Sistema ${index + 1}`,
                  potencia,
                  modulos,
                  inversores,
                  marca_modulo: sistema.marca_modulo || sistema.marcaModulo || sistema.especificacoes?.[0] || '',
                  pot_modulo: sistema.pot_modulo || sistema.potModulo || 0,
                  marca_inversor: sistema.marca_inversor || sistema.marcaInversor || sistema.especificacoes?.[1] || '',
                  pot_inversor: sistema.pot_inv || sistema.pot_inversor || sistema.potInversor || 0,
                  valorTotal,
                  geracaoMensal: sistema.geracaoMensal,
                  paybackMeses: sistema.paybackMeses,
                  cobertura: sistema.cobertura ?? sistema.coberturaPercent,
                  storageType: 'supabase',
                  storageLocation: 'Supabase',
                };
              });

              const orcamento: OrcamentoItem = {
                id: proposta.slug,
                propostaId: proposta.id,
                cliente: nomeCliente,
                clientePasta: proposta.slug,
                sistemas,
                status,
                data: proposta.created_at,
                totalSistemas: sistemas.length,
                storageType: 'supabase',
                storageLocation: 'Supabase (nuvem)',
              };

              todosOrcamentos.push(orcamento);
              total++;
              if (status === 'pendente') pendentes++;
              else if (status === 'aprovado') aprovados++;
              else if (status === 'rejeitado') rejeitados++;
            }
          });

          if (todosOrcamentos.length > 0) {
            todosOrcamentos.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
            const stats = { total, pendentes, aprovados, rejeitados };
            console.log(`✅ Orçamentos (Supabase): ${total} cartões`);
            return res.status(200).json({ orcamentos: todosOrcamentos, stats, source: 'supabase' });
          }
        }
      } catch (supabaseError: unknown) {
        const msg = supabaseError instanceof Error ? supabaseError.message : String(supabaseError);
        const isCloudflare =
          msg.includes('500') || msg.includes('cloudflare') || msg.includes('Internal Server Error');
        console.error('⚠️ Erro Supabase orcamentos-todos:', supabaseError);
        if (isCloudflare && (process.env.VERCEL || process.env.NETLIFY)) {
          return res.status(200).json({
            orcamentos: [],
            stats: { total: 0, pendentes: 0, aprovados: 0, rejeitados: 0 },
            source: 'supabase-error',
            error: 'Erro ao conectar com Supabase',
          });
        }
      }
    }

    const clientesDir = path.join(process.cwd(), 'src/data/clientes');
    try {
      await fs.access(clientesDir);
    } catch {
      return res.status(200).json({
        orcamentos: todosOrcamentos,
        stats: { total, pendentes, aprovados, rejeitados },
        source: 'filesystem-empty',
      });
    }

    const pastas = await fs.readdir(clientesDir);
    const seenSlugs = new Set(todosOrcamentos.map((o) => o.clientePasta));

    for (const pasta of pastas) {
      if (seenSlugs.has(pasta)) continue;

      const clientePath = path.join(clientesDir, pasta);
      const stat = await fs.stat(clientePath);
      if (!stat.isDirectory()) continue;

      try {
        const propostaPath = path.join(clientePath, 'proposta.json');
        const propostaData = await fs.readFile(propostaPath, 'utf8');
        const proposta: PropostaData = JSON.parse(propostaData);

        if (!proposta.sistemas?.length) continue;

        const dataCriacao = proposta.metadata?.created ? new Date(proposta.metadata.created) : stat.mtime;
        const diasDesdeCriacao = (Date.now() - dataCriacao.getTime()) / (1000 * 60 * 60 * 24);
        let status: 'pendente' | 'aprovado' | 'rejeitado' = 'pendente';
        if (diasDesdeCriacao > 30) status = 'aprovado';

        const sistemas: SistemaItem[] = proposta.sistemas.map((sistema, index) => {
          const potenciaMatch = sistema.potencia?.match(/(\d+\.?\d*)/);
          const potencia = potenciaMatch ? parseFloat(potenciaMatch[1]) : 0;
          const modulos = Math.round((potencia * 1000) / 605);
          const inversores = Math.ceil(potencia / 15);

          return {
            titulo: sistema.titulo || `Sistema ${index + 1}`,
            potencia,
            modulos,
            inversores,
            marca_modulo: sistema.marca_modulo || sistema.marcaModulo || sistema.especificacoes?.[0] || '',
            pot_modulo: sistema.pot_modulo || sistema.potModulo || 0,
            marca_inversor: sistema.marca_inversor || sistema.marcaInversor || sistema.especificacoes?.[1] || '',
            pot_inversor: sistema.pot_inv || sistema.pot_inversor || sistema.potInversor || 0,
            valorTotal: sistema.valorTotal ?? 0,
            geracaoMensal: sistema.geracaoMensal,
            paybackMeses: sistema.paybackMeses,
            cobertura: sistema.cobertura,
            storageType: 'filesystem',
            storageLocation: 'Arquivo local',
          };
        });

        const orcamento: OrcamentoItem = {
          id: pasta,
          propostaId: undefined,
          cliente: proposta.cliente.nome,
          clientePasta: pasta,
          sistemas,
          status,
          data: proposta.metadata?.created || stat.mtime.toISOString(),
          totalSistemas: sistemas.length,
          storageType: 'filesystem',
          storageLocation: 'Arquivo local',
        };

        todosOrcamentos.push(orcamento);
        total++;
        if (status === 'pendente') pendentes++;
        else if (status === 'aprovado') aprovados++;
        else if (status === 'rejeitado') rejeitados++;
      } catch {
        /* sem proposta.json */
      }
    }

    todosOrcamentos.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

    const stats = { total, pendentes, aprovados, rejeitados };
    const source = todosOrcamentos.some((o) => o.storageType === 'filesystem') ? 'mixed' : 'filesystem';

    return res.status(200).json({ orcamentos: todosOrcamentos, stats, source });
  } catch (error) {
    console.error('Erro ao listar orçamentos:', error);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  }
}
