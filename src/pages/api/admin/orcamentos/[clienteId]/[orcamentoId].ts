import { NextApiRequest, NextApiResponse } from 'next';
import { promises as fs } from 'fs';
import path from 'path';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { clienteId, orcamentoId } = req.query;

  if (!clienteId || typeof clienteId !== 'string' || !orcamentoId || typeof orcamentoId !== 'string') {
    return res.status(400).json({ message: 'ID do cliente e orçamento são obrigatórios' });
  }

  const orcamentosPath = path.join(process.cwd(), 'src/data/clientes', clienteId, 'orcamentos.json');

  if (req.method === 'GET') {
    // Obter orçamento específico
    try {
      const orcamentosData = await fs.readFile(orcamentosPath, 'utf8');
      const orcamentos = JSON.parse(orcamentosData);
      
      const orcamento = orcamentos.find((o: any) => o.id === orcamentoId);
      
      if (!orcamento) {
        return res.status(404).json({ message: 'Orçamento não encontrado' });
      }

      res.status(200).json(orcamento);
    } catch (error) {
      console.error('Erro ao obter orçamento:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }
  
  else if (req.method === 'PUT') {
    // Atualizar orçamento
    try {
      const orcamentosData = await fs.readFile(orcamentosPath, 'utf8');
      let orcamentos = JSON.parse(orcamentosData);
      
      const index = orcamentos.findIndex((o: any) => o.id === orcamentoId);
      
      if (index === -1) {
        return res.status(404).json({ message: 'Orçamento não encontrado' });
      }

      // Atualizar orçamento mantendo ID e timestamps
      orcamentos[index] = {
        ...orcamentos[index],
        ...req.body,
        id: orcamentoId,
        updatedAt: new Date().toISOString()
      };

      await fs.writeFile(orcamentosPath, JSON.stringify(orcamentos, null, 2), 'utf8');

      res.status(200).json({ 
        message: 'Orçamento atualizado com sucesso',
        orcamento: orcamentos[index]
      });
    } catch (error) {
      console.error('Erro ao atualizar orçamento:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }
  
  else if (req.method === 'DELETE') {
    // Excluir orçamento
    try {
      const orcamentosData = await fs.readFile(orcamentosPath, 'utf8');
      let orcamentos = JSON.parse(orcamentosData);
      
      const index = orcamentos.findIndex((o: any) => o.id === orcamentoId);
      
      if (index === -1) {
        return res.status(404).json({ message: 'Orçamento não encontrado' });
      }

      // Remover orçamento
      orcamentos.splice(index, 1);

      await fs.writeFile(orcamentosPath, JSON.stringify(orcamentos, null, 2), 'utf8');

      res.status(200).json({ message: 'Orçamento excluído com sucesso' });
    } catch (error) {
      console.error('Erro ao excluir orçamento:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }
  
  else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}