import { NextApiRequest, NextApiResponse } from 'next';
import { promises as fs } from 'fs';
import path from 'path';
import { supabase } from '@/lib/supabase';
import { getAllPropostasLocais } from '@/lib/local-db';

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

interface OrcamentoItem {
  id: string;
  propostaId?: string; // ID do Supabase ou Local
  cliente: string;
  clientePasta: string;
  potencia: number;
  modulos: number;
  inversores: number;
  valorTotal: number;
  status: 'pendente' | 'aprovado' | 'rejeitado';
  data: string;
  geracaoMensal?: number;
  paybackMeses?: number;
  cobertura?: number;
  storageType?: 'local' | 'supabase' | 'filesystem'; // ✅ Tipo de armazenamento
  storageLocation?: string; // ✅ Localização do arquivo
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

        if (!error && propostas && propostas.length > 0) {
          console.log(`✅ ${propostas.length} propostas encontradas no Supabase`);
          
          // Converter propostas em orçamentos
          propostas.forEach((proposta: any) => {
            const dados = proposta.dados_completos;
            
            if (dados && dados.sistemas && Array.isArray(dados.sistemas)) {
              dados.sistemas.forEach((sistema: any, index: number) => {
                // Extrair potência
                const potenciaMatch = sistema.potencia?.toString().match(/(\d+\.?\d*)/);
                const potencia = potenciaMatch ? parseFloat(potenciaMatch[1]) : sistema.potTotal || 0;
                
                // Calcular módulos e inversores
                const modulos = Math.round(potencia * 1000 / 605);
                const inversores = Math.ceil(potencia / 15);
                
                // Status baseado na data
                const dataCriacao = new Date(proposta.created_at);
                const diasDesdeCriacao = (Date.now() - dataCriacao.getTime()) / (1000 * 60 * 60 * 24);
                
                let status: 'pendente' | 'aprovado' | 'rejeitado' = 'pendente';
                if (diasDesdeCriacao > 30) {
                  status = 'aprovado';
                }
                
                const orcamento: OrcamentoItem = {
                  id: `${proposta.slug}-sistema-${index + 1}`,
                  propostaId: proposta.id, // ✅ ID do banco Supabase
                  cliente: proposta.clientes?.nome || dados.cliente?.nome || 'Cliente',
                  clientePasta: proposta.slug,
                  potencia,
                  modulos,
                  inversores,
                  valorTotal: sistema.ppix || sistema.valorTotal || 0,
                  status,
                  data: proposta.created_at,
                  geracaoMensal: sistema.geracaoMensal,
                  paybackMeses: sistema.paybackMeses,
                  cobertura: sistema.cobertura || sistema.coberturaPercent,
                  storageType: 'supabase', // ✅ Marca como Supabase
                  storageLocation: 'Supabase (Nuvem)' // ✅ Indica localização
                };
                
                todosOrcamentos.push(orcamento);
                total++;
                
                if (status === 'pendente') pendentes++;
                else if (status === 'aprovado') aprovados++;
                else if (status === 'rejeitado') rejeitados++;
              });
            }
          });
          
          const stats = {
            total,
            pendentes,
            aprovados,
            rejeitados
          };

          console.log(`✅ Orçamentos processados: ${total} (${pendentes} pendentes, ${aprovados} aprovados)`);
          return res.status(200).json({ orcamentos: todosOrcamentos, stats, source: 'supabase' });
        }
      } catch (supabaseError) {
        console.error('⚠️ Erro ao buscar do Supabase, usando fallback:', supabaseError);
        // Continuar para fallback
      }
    }

    // 💾 PRIORIDADE 2: Buscar do Banco Local (SQLite)
    try {
      console.log('🔍 Buscando propostas no banco local...');
      const propostasLocais = getAllPropostasLocais();
      
      if (propostasLocais && propostasLocais.length > 0) {
        console.log(`✅ ${propostasLocais.length} propostas encontradas no banco local`);
        
        propostasLocais.forEach((proposta) => {
          const dados = proposta.dados_completos;
          
          if (dados && dados.sistemas && Array.isArray(dados.sistemas)) {
            dados.sistemas.forEach((sistema: any, index: number) => {
              const potenciaMatch = sistema.potencia?.toString().match(/(\d+\.?\d*)/);
              const potencia = potenciaMatch ? parseFloat(potenciaMatch[1]) : sistema.potTotal || proposta.sistema_kwp || 0;
              const modulos = Math.round(potencia * 1000 / 605);
              const inversores = Math.ceil(potencia / 15);
              
              const orcamento: OrcamentoItem = {
                id: `${proposta.slug}-sistema-${index + 1}`,
                propostaId: proposta.id, // ✅ ID do banco local
                cliente: dados.cliente?.nome || 'Cliente',
                clientePasta: proposta.slug,
                potencia,
                modulos,
                inversores,
                valorTotal: sistema.precoPixDecimal || proposta.valor_total || 0,
                status: 'aprovado', // Propostas locais são consideradas aprovadas
                data: proposta.created_at || new Date().toISOString(),
                geracaoMensal: sistema.geracao ? parseFloat(sistema.geracao.replace(/[^\d.,]/g, '').replace(',', '.')) : proposta.geracao_mensal || 0,
                paybackMeses: sistema.payback ? parseFloat(sistema.payback.replace(/[^\d.,]/g, '').replace(',', '.')) * 12 : proposta.payback ? proposta.payback * 12 : 0,
                cobertura: sistema.cobertura ? parseFloat(sistema.cobertura.replace(/[^\d.,]/g, '').replace(',', '.')) : 0,
                storageType: 'local', // ✅ Marca como local
                storageLocation: 'Máquina Local' // ✅ Indica localização
              };
              
              todosOrcamentos.push(orcamento);
              total++;
              aprovados++;
            });
          }
        });
      }
    } catch (localError) {
      console.warn('⚠️ Erro ao buscar do banco local:', localError);
      // Continuar para fallback filesystem
    }

    // 🗂️ PRIORIDADE 3: Fallback para Filesystem (DESENVOLVIMENTO)
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
          
          // Converter sistemas da proposta em orçamentos
          proposta.sistemas.forEach((sistema, index) => {
            // Extrair números da potência (ex: "19.36 kWp" -> 19.36)
            const potenciaMatch = sistema.potencia.match(/(\d+\.?\d*)/);
            const potencia = potenciaMatch ? parseFloat(potenciaMatch[1]) : 0;
            
            // Calcular módulos baseado na potência (assumindo módulos de 605W)
            const modulos = Math.round(potencia * 1000 / 605);
            
            // Calcular inversores baseado na potência (assumindo inversores de 15kW)
            const inversores = Math.ceil(potencia / 15);
            
            // Determinar status baseado na data de criação
            const dataCriacao = proposta.metadata?.created ? new Date(proposta.metadata.created) : stat.mtime;
            const diasDesdeCriacao = (Date.now() - dataCriacao.getTime()) / (1000 * 60 * 60 * 24);
            
            let status: 'pendente' | 'aprovado' | 'rejeitado' = 'pendente';
            if (diasDesdeCriacao > 30) {
              status = 'aprovado'; // Propostas antigas consideradas aprovadas
            }
            
            const orcamento: OrcamentoItem = {
              id: `${pasta}-sistema-${index + 1}`,
              propostaId: undefined, // Filesystem não tem ID do banco
              cliente: proposta.cliente.nome,
              clientePasta: pasta,
              potencia,
              modulos,
              inversores,
              valorTotal: sistema.valorTotal,
              status,
              data: proposta.metadata?.created || stat.mtime.toISOString(),
              geracaoMensal: sistema.geracaoMensal,
              paybackMeses: sistema.paybackMeses,
              cobertura: sistema.cobertura,
              storageType: 'filesystem', // ✅ Marca como filesystem
              storageLocation: 'Arquivo Local' // ✅ Indica localização
            };
            
            todosOrcamentos.push(orcamento);
            total++;
            
            if (status === 'pendente') pendentes++;
            else if (status === 'aprovado') aprovados++;
            else if (status === 'rejeitado') rejeitados++;
          });
          
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
