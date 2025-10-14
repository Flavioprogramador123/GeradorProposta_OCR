import { NextApiRequest, NextApiResponse } from 'next';
import { promises as fs } from 'fs';
import path from 'path';

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
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const clientesDir = path.join(process.cwd(), 'src/data/clientes');
    
    // Verificar se o diretório existe
    try {
      await fs.access(clientesDir);
    } catch {
      return res.status(200).json({ 
        orcamentos: [], 
        stats: { total: 0, pendentes: 0, aprovados: 0, rejeitados: 0 }
      });
    }

    const pastas = await fs.readdir(clientesDir);
    const todosOrcamentos: OrcamentoItem[] = [];
    
    let total = 0;
    let pendentes = 0;
    let aprovados = 0;
    let rejeitados = 0;

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
              cobertura: sistema.cobertura
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

    res.status(200).json({ orcamentos: todosOrcamentos, stats });

  } catch (error) {
    console.error('Erro ao listar orçamentos:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
}
