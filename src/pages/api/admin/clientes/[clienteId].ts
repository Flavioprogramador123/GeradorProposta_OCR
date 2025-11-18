import { NextApiRequest, NextApiResponse } from 'next';
import { promises as fs } from 'fs';
import path from 'path';
import { getAllClientes, updateCliente } from '@/lib/supabase';

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

function sanitizeId(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 50);
}

async function getClienteFromSupabase(clienteId: string) {
  const clientes = await getAllClientes();
  if (!clientes || clientes.length === 0) return null;

  const sanitizedId = sanitizeId(clienteId);

  const cliente = clientes.find((c) => {
    const byId = c.id === clienteId;
    const bySlug = typeof (c as any).slug === 'string' && sanitizeId((c as any).slug) === sanitizedId;
    const byNome = c.nome && sanitizeId(c.nome) === sanitizedId;
    const byPasta = (c as any).pasta && sanitizeId((c as any).pasta) === sanitizedId;
    return byId || bySlug || byNome || byPasta;
  });

  if (!cliente) return null;

  return {
    id: cliente.id,
    nome: cliente.nome,
    cidade: cliente.cidade,
    consumoKwh: cliente.consumo_mensal?.toString() || '0',
    tipo: cliente.tipo_imovel || 'Residencial',
    hspLocal: cliente.hsp_local?.toString() || '5.21',
    pdespesa: cliente.pdespesa?.toString() || '0',
    pasta: sanitizeId(cliente.nome || clienteId),
    observacoes: (cliente as any).observacoes
  } satisfies ClienteData & { id: string };
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
      // Prioridade: Supabase
      const clienteSupabase = await getClienteFromSupabase(clienteId);
      if (clienteSupabase) {
        return res.status(200).json(clienteSupabase);
      }

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

      // Se cliente existe no Supabase, atualizar lá
      const clienteSupabase = await getClienteFromSupabase(clienteId);
      if (clienteSupabase?.id) {
        await updateCliente(clienteSupabase.id, {
          nome,
          cidade,
          consumo_mensal: Number(consumoKwh),
          tipo_imovel: tipo,
          hsp_local: Number(hspLocal),
          pdespesa: Number(pdespesa),
        });

        return res.status(200).json({
          message: 'Cliente atualizado com sucesso (Supabase)',
          cliente: { nome, cidade, consumoKwh, tipo, hspLocal, pdespesa, pasta: clienteSupabase.pasta }
        });
      }

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
      const clienteSupabase = await getClienteFromSupabase(clienteId);
      if (clienteSupabase?.id) {
        res.status(405).json({ message: 'Remoção via API não permitida para clientes do Supabase' });
        return;
      }

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