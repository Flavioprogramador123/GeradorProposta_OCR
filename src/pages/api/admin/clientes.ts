import { NextApiRequest, NextApiResponse } from 'next';
import { promises as fs } from 'fs';
import path from 'path';

interface ClienteInfo {
  nome: string;
  cidade: string;
  pasta: string;
  status: string;
  ultimaModificacao: string;
  temProposta: boolean;
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
        clientes: [], 
        stats: { totalClientes: 0, proposasGeradas: 0, aguardandoOrcamentos: 0 }
      });
    }

    const pastas = await fs.readdir(clientesDir);
    const clientes: ClienteInfo[] = [];
    
    let proposasGeradas = 0;
    let aguardandoOrcamentos = 0;

    for (const pasta of pastas) {
      const clientePath = path.join(clientesDir, pasta);
      const stat = await fs.stat(clientePath);
      
      if (!stat.isDirectory()) continue;

      try {
        // Tentar ler dados do usuário
        let nome = pasta;
        let cidade = 'N/A';
        let status = 'aguardando_orcamentos';
        let temProposta = false;

        // Ler dadosusuario.md se existe
        const dadosPath = path.join(clientePath, 'dadosusuario.md');
        try {
          const dadosContent = await fs.readFile(dadosPath, 'utf8');
          const nomeMatch = dadosContent.match(/cliente:\s*(.+)/i);
          const cidadeMatch = dadosContent.match(/cidade:\s*(.+)/i);
          
          if (nomeMatch) nome = nomeMatch[1].trim();
          if (cidadeMatch) cidade = cidadeMatch[1].trim();
        } catch {
          // Arquivo não existe
        }

        // Verificar se tem proposta.json
        const propostaPath = path.join(clientePath, 'proposta.json');
        try {
          const propostaContent = await fs.readFile(propostaPath, 'utf8');
          const propostaData = JSON.parse(propostaContent);
          temProposta = true;
          
          if (propostaData.sistemas && propostaData.sistemas.length > 0) {
            status = 'concluido';
            proposasGeradas++;
          } else {
            status = 'em_andamento';
          }
        } catch {
          // Proposta não existe ou erro no JSON
          status = 'aguardando_orcamentos';
          aguardandoOrcamentos++;
        }

        if (status === 'aguardando_orcamentos' && !temProposta) {
          aguardandoOrcamentos++;
        }

        clientes.push({
          nome,
          cidade,
          pasta,
          status,
          ultimaModificacao: stat.mtime.toLocaleDateString('pt-BR'),
          temProposta
        });

      } catch (error) {
        console.error(`Erro ao processar cliente ${pasta}:`, error);
        // Adicionar cliente com dados mínimos
        clientes.push({
          nome: pasta,
          cidade: 'Erro ao carregar',
          pasta,
          status: 'erro',
          ultimaModificacao: stat.mtime.toLocaleDateString('pt-BR'),
          temProposta: false
        });
      }
    }

    // Ordenar por última modificação (mais recente primeiro)
    clientes.sort((a, b) => {
      return new Date(b.ultimaModificacao).getTime() - new Date(a.ultimaModificacao).getTime();
    });

    const stats = {
      totalClientes: clientes.length,
      proposasGeradas,
      aguardandoOrcamentos
    };

    res.status(200).json({ clientes, stats });

  } catch (error) {
    console.error('Erro ao listar clientes:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
}