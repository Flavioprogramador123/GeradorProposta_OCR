import { NextApiRequest, NextApiResponse } from 'next';
import { promises as fs } from 'fs';
import path from 'path';

interface ClienteData {
  nome: string;
  cidade: string;
  consumoKwh: string;
  tipo: string;
  hspLocal: string;
  pdespesa: string;
  pasta: string;
  observacoes?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { clienteId } = req.query;

  if (!clienteId || typeof clienteId !== 'string') {
    return res.status(400).json({ message: 'ID do cliente é obrigatório' });
  }

  const clientePath = path.join(process.cwd(), 'src/data/clientes', clienteId);
  const dadosUsuarioPath = path.join(clientePath, 'dadosusuario.md');

  if (req.method === 'GET') {
    // Buscar dados do cliente
    try {
      // Verificar se a pasta existe
      try {
        await fs.access(clientePath);
      } catch {
        return res.status(404).json({ message: 'Cliente não encontrado' });
      }

      let clienteData: ClienteData = {
        nome: clienteId,
        cidade: 'N/A',
        consumoKwh: '0',
        tipo: 'Residencial',
        hspLocal: '5.21',
        pdespesa: '0',
        pasta: clienteId
      };

      // Tentar ler dadosusuario.md
      try {
        const dadosContent = await fs.readFile(dadosUsuarioPath, 'utf8');
        
        // Parse do arquivo
        const nomeMatch = dadosContent.match(/cliente:\s*(.+)/i);
        const cidadeMatch = dadosContent.match(/cidade:\s*(.+)/i);
        const consumoMatch = dadosContent.match(/consumo mensal:\s*(\d+)/i);
        const tipoMatch = dadosContent.match(/imovel:\s*(.+)/i);
        const hspMatch = dadosContent.match(/hsp:\s*([\d.,]+)/i);
        const pdespesaMatch = dadosContent.match(/pdespesa:\s*r\$?\s*([\d.,]+)/i);
        
        if (nomeMatch) clienteData.nome = nomeMatch[1].trim();
        if (cidadeMatch) clienteData.cidade = cidadeMatch[1].trim().replace(/;$/, '');
        if (consumoMatch) clienteData.consumoKwh = consumoMatch[1];
        if (tipoMatch) clienteData.tipo = tipoMatch[1].trim().replace(/;$/, '');
        if (hspMatch) clienteData.hspLocal = hspMatch[1].replace(',', '.');
        if (pdespesaMatch) clienteData.pdespesa = pdespesaMatch[1].replace('.', '').replace(',', '.');
      } catch (error) {
        console.warn(`Arquivo dadosusuario.md não encontrado para ${clienteId}`);
      }

      res.status(200).json(clienteData);
    } catch (error) {
      console.error('Erro ao buscar cliente:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }
  
  else if (req.method === 'PUT') {
    // Atualizar dados do cliente
    try {
      const { nome, cidade, consumoKwh, tipo, hspLocal, pdespesa, observacoes } = req.body;

      // Validação básica
      if (!nome || !cidade || !consumoKwh) {
        return res.status(400).json({ message: 'Nome, cidade e consumo são obrigatórios' });
      }

      // Criar conteúdo do dadosusuario.md
      const dadosContent = `cliente: ${nome}
cidade: ${cidade}${observacoes ? ` (${observacoes})` : ''};
Pdespesa: R$ ${parseFloat(pdespesa).toFixed(2)} para todos os orçamentos;
IMovel: ${tipo};
HSP: ${hspLocal}
CONSUMO MENSAL: ${consumoKwh} KWH/MES
`;

      // Criar diretório se não existe
      await fs.mkdir(clientePath, { recursive: true });
      
      // Salvar arquivo
      await fs.writeFile(dadosUsuarioPath, dadosContent, 'utf8');

      res.status(200).json({ 
        message: 'Cliente atualizado com sucesso',
        cliente: { nome, cidade, consumoKwh, tipo, hspLocal, pdespesa, pasta: clienteId }
      });
    } catch (error) {
      console.error('Erro ao atualizar cliente:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }
  
  else if (req.method === 'DELETE') {
    // Excluir cliente
    try {
      // Verificar se cliente existe
      try {
        await fs.access(clientePath);
      } catch {
        return res.status(404).json({ message: 'Cliente não encontrado' });
      }

      // Remover pasta do cliente recursivamente
      await fs.rm(clientePath, { recursive: true, force: true });

      res.status(200).json({ message: 'Cliente excluído com sucesso' });
    } catch (error) {
      console.error('Erro ao excluir cliente:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }
  
  else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}