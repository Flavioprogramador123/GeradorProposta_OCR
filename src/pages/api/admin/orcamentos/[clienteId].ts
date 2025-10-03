import { NextApiRequest, NextApiResponse } from 'next';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

interface Orcamento {
  id: string;
  fornecedor: string;
  dataOrcamento: string;
  status: 'pendente' | 'analisando' | 'aprovado' | 'rejeitado';
  valorTotal: number;
  componentes: {
    modulos?: any;
    inversores?: any;
    estrutura?: any;
    outros?: any[];
  };
  observacoes?: string;
  arquivos: Array<{
    nome: string;
    url?: string;
    tipo: 'pdf' | 'jpg' | 'png';
  }>;
  createdAt: string;
  updatedAt: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { clienteId } = req.query;

  if (!clienteId || typeof clienteId !== 'string') {
    return res.status(400).json({ message: 'ID do cliente é obrigatório' });
  }

  const orcamentosPath = path.join(process.cwd(), 'src/data/clientes', clienteId, 'orcamentos.json');

  if (req.method === 'GET') {
    // Listar orçamentos do cliente
    try {
      let orcamentos: Orcamento[] = [];
      
      try {
        const orcamentosData = await fs.readFile(orcamentosPath, 'utf8');
        orcamentos = JSON.parse(orcamentosData);
      } catch (error) {
        // Arquivo não existe, retornar lista vazia
      }

      const stats = {
        total: orcamentos.length,
        pendentes: orcamentos.filter(o => o.status === 'pendente').length,
        aprovados: orcamentos.filter(o => o.status === 'aprovado').length,
        rejeitados: orcamentos.filter(o => o.status === 'rejeitado').length,
      };

      res.status(200).json({ orcamentos, stats });
    } catch (error) {
      console.error('Erro ao listar orçamentos:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }
  
  else if (req.method === 'POST') {
    // Criar novo orçamento
    try {
      const novoOrcamento: Orcamento = {
        id: uuidv4(),
        ...req.body,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Validação básica
      if (!novoOrcamento.fornecedor) {
        return res.status(400).json({ message: 'Fornecedor é obrigatório' });
      }

      let orcamentos: Orcamento[] = [];
      
      // Tentar carregar orçamentos existentes
      try {
        const orcamentosData = await fs.readFile(orcamentosPath, 'utf8');
        orcamentos = JSON.parse(orcamentosData);
      } catch (error) {
        // Arquivo não existe, criar novo array
      }

      // Sem limite de orçamentos (removido para permitir múltiplos orçamentos via YAML)

      // Adicionar novo orçamento
      orcamentos.push(novoOrcamento);

      // Criar diretório se não existe
      const clienteDir = path.dirname(orcamentosPath);
      await fs.mkdir(clienteDir, { recursive: true });

      // Salvar orçamentos
      await fs.writeFile(orcamentosPath, JSON.stringify(orcamentos, null, 2), 'utf8');

      res.status(201).json({ 
        message: 'Orçamento criado com sucesso',
        orcamento: novoOrcamento 
      });
    } catch (error) {
      console.error('Erro ao criar orçamento:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }
  
  else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}