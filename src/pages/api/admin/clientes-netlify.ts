import { NextApiRequest, NextApiResponse } from 'next';

interface ClienteInfo {
  nome: string;
  cidade: string;
  pasta: string;
  status: string;
  ultimaModificacao: string;
  temProposta: boolean;
}

// Dados hardcoded baseados nos clientes existentes
const clientesExistentes: ClienteInfo[] = [
  {
    nome: "MARCELO",
    cidade: "Anápolis/GO",
    pasta: "marcelo-14-10-2025",
    status: "proposta_gerada",
    ultimaModificacao: "14/10/2025",
    temProposta: true
  },
  {
    nome: "Daniel Verdura",
    cidade: "Anápolis/GO",
    pasta: "daniel-verdura-29-09-2025",
    status: "proposta_gerada",
    ultimaModificacao: "29/09/2025",
    temProposta: true
  },
  {
    nome: "Cliente Padrão",
    cidade: "Anápolis/GO",
    pasta: "cliente-padrao-14-10-2025",
    status: "proposta_gerada",
    ultimaModificacao: "14/10/2025",
    temProposta: true
  },
  {
    nome: "Betania",
    cidade: "Anápolis/GO",
    pasta: "betania-01-10-2025",
    status: "proposta_gerada",
    ultimaModificacao: "01/10/2025",
    temProposta: true
  },
  {
    nome: "Dorvalina Ioneide",
    cidade: "Anápolis/GO",
    pasta: "dorvalina-ioneide-06-10-2025",
    status: "proposta_gerada",
    ultimaModificacao: "06/10/2025",
    temProposta: true
  },
  {
    nome: "Pedro Silva",
    cidade: "Anápolis/GO",
    pasta: "pedro-silva-29-09-2025",
    status: "proposta_gerada",
    ultimaModificacao: "29/09/2025",
    temProposta: true
  },
  {
    nome: "Daniel 001",
    cidade: "Anápolis/GO",
    pasta: "daniel-001-29-09-2025",
    status: "proposta_gerada",
    ultimaModificacao: "29/09/2025",
    temProposta: true
  },
  {
    nome: "Cliente Teste",
    cidade: "Anápolis/GO",
    pasta: "cliente-teste-14-10-2025",
    status: "proposta_gerada",
    ultimaModificacao: "14/10/2025",
    temProposta: true
  }
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Detectar ambiente serverless
    const isServerless = process.env.NETLIFY || process.env.VERCEL || process.env.NODE_ENV === 'production';
    
    if (isServerless) {
      // No ambiente serverless, usar dados hardcoded
      const proposasGeradas = clientesExistentes.filter(c => c.temProposta).length;
      const aguardandoOrcamentos = clientesExistentes.filter(c => !c.temProposta).length;
      
      const stats = {
        totalClientes: clientesExistentes.length,
        proposasGeradas,
        aguardandoOrcamentos
      };

      console.log(`API Clientes (Serverless): ${clientesExistentes.length} clientes encontrados`);
      
      return res.status(200).json({ 
        clientes: clientesExistentes, 
        stats 
      });
    }

    // No ambiente local, tentar ler arquivos
    const { promises: fs } = await import('fs');
    const path = await import('path');
    
    const clientesDir = path.join(process.cwd(), 'src/data/clientes');
    
    try {
      await fs.access(clientesDir);
      const pastas = await fs.readdir(clientesDir);
      const clientes: ClienteInfo[] = [];
      
      let proposasGeradas = 0;
      let aguardandoOrcamentos = 0;

      for (const pasta of pastas) {
        const clientePath = path.join(clientesDir, pasta);
        const stat = await fs.stat(clientePath);
        
        if (!stat.isDirectory()) continue;

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
          const proposta = JSON.parse(propostaData);
          
          clienteData.nome = proposta.cliente.nome;
          clienteData.cidade = proposta.cliente.cidade;
          clienteData.temProposta = true;
          clienteData.status = proposta.metadata?.status || 'proposta_gerada';
          clienteData.ultimaModificacao = proposta.metadata?.created 
            ? new Date(proposta.metadata.created).toLocaleDateString('pt-BR')
            : stat.mtime.toLocaleDateString('pt-BR');
          
          proposasGeradas++;
          
        } catch (error) {
          aguardandoOrcamentos++;
        }

        clientes.push(clienteData);
      }

      const stats = {
        totalClientes: clientes.length,
        proposasGeradas,
        aguardandoOrcamentos
      };

      console.log(`API Clientes (Local): ${clientes.length} clientes encontrados`);
      
      return res.status(200).json({ clientes, stats });

    } catch (error) {
      console.log('Erro ao acessar diretório local, usando dados hardcoded');
      
      const proposasGeradas = clientesExistentes.filter(c => c.temProposta).length;
      const aguardandoOrcamentos = clientesExistentes.filter(c => !c.temProposta).length;
      
      const stats = {
        totalClientes: clientesExistentes.length,
        proposasGeradas,
        aguardandoOrcamentos
      };

      return res.status(200).json({ 
        clientes: clientesExistentes, 
        stats 
      });
    }

  } catch (error) {
    console.error('Erro ao listar clientes:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
}
