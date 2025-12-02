import { NextApiRequest, NextApiResponse } from 'next';
import { promises as fs } from 'fs';
import path from 'path';
import { getClientesWithPropostas, updateCliente } from '@/lib/supabase';

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
  console.log(`🔍 Buscando cliente no Supabase: "${clienteId}"`);
  
  const clientes = await getClientesWithPropostas();
  if (!clientes || clientes.length === 0) {
    console.log('⚠️ Nenhum cliente encontrado no Supabase');
    return null;
  }

  console.log(`📋 Total de clientes no Supabase: ${clientes.length}`);

  const sanitizedId = sanitizeId(clienteId);
  console.log(`🔧 ID sanitizado: "${sanitizedId}"`);

  // ✅ PRIORIDADE 1: Busca exata por ID (mais preciso)
  let cliente = clientes.find((c) => c.id === clienteId);
  if (cliente) {
    console.log(`✅ Cliente encontrado por ID exato: ${cliente.nome} (ID: ${cliente.id})`);
  }

  // ✅ PRIORIDADE 2: Busca por slug exato (se não encontrou por ID)
  if (!cliente) {
    cliente = clientes.find((c) => {
      const slug = (c as any).slug;
      return slug && (slug === clienteId || sanitizeId(slug) === sanitizedId);
    });
    if (cliente) {
      console.log(`✅ Cliente encontrado por slug: ${cliente.nome} (slug: ${(cliente as any).slug})`);
    }
  }

  // ✅ PRIORIDADE 3: Busca por pasta exata (se não encontrou por ID/slug)
  if (!cliente) {
    cliente = clientes.find((c) => {
      const pasta = (c as any).pasta;
      return pasta && (pasta === clienteId || sanitizeId(pasta) === sanitizedId);
    });
    if (cliente) {
      console.log(`✅ Cliente encontrado por pasta: ${cliente.nome} (pasta: ${(cliente as any).pasta})`);
    }
  }

  // ✅ PRIORIDADE 4: Busca por nome exato (case-insensitive)
  if (!cliente) {
    cliente = clientes.find((c) => {
      if (!c.nome) return false;
      // Comparação exata (case-insensitive)
      const nomeMatch = c.nome.toLowerCase().trim() === clienteId.toLowerCase().trim();
      // Comparação sanitizada (fallback)
      const nomeSanitizedMatch = sanitizeId(c.nome) === sanitizedId;
      return nomeMatch || nomeSanitizedMatch;
    });
    if (cliente) {
      console.log(`✅ Cliente encontrado por nome: ${cliente.nome}`);
    }
  }

  // ✅ PRIORIDADE 5: Busca parcial por nome (se ainda não encontrou)
  if (!cliente) {
    cliente = clientes.find((c) => {
      if (!c.nome) return false;
      const nomeLower = c.nome.toLowerCase().trim();
      const buscaLower = clienteId.toLowerCase().trim();
      // Busca parcial: se o nome contém a busca ou vice-versa
      return nomeLower.includes(buscaLower) || buscaLower.includes(nomeLower);
    });
    if (cliente) {
      console.log(`✅ Cliente encontrado por busca parcial de nome: ${cliente.nome}`);
    }
  }

  // ⚠️ Se encontrou múltiplos matches, avisar
  if (cliente) {
    const matches = clientes.filter((c) => {
      const byId = c.id === clienteId;
      const bySlug = (c as any).slug && sanitizeId((c as any).slug) === sanitizedId;
      const byNome = c.nome && sanitizeId(c.nome) === sanitizedId;
      const byPasta = (c as any).pasta && sanitizeId((c as any).pasta) === sanitizedId;
      return byId || bySlug || byNome || byPasta;
    });

    if (matches.length > 1) {
      console.warn(`⚠️ ATENÇÃO: Múltiplos clientes encontrados (${matches.length}) para "${clienteId}":`, 
        matches.map(m => ({ nome: m.nome, id: m.id, slug: (m as any).slug }))
      );
    }
  }

  if (!cliente) {
    console.log(`❌ Cliente não encontrado no Supabase para: "${clienteId}"`);
    console.log('📋 Clientes disponíveis:', clientes.map(c => ({ 
      nome: c.nome, 
      id: c.id, 
      slug: (c as any).slug,
      pasta: (c as any).pasta 
    })));
    return null;
  }

  // ✅ USAR SLUG REAL (não sanitizar o nome)
  let pasta = (cliente as any).slug || clienteId;

  // Se tem propostas, pegar slug da primeira proposta
  if ((cliente as any).propostas && (cliente as any).propostas.length > 0) {
    pasta = (cliente as any).propostas[0].slug || pasta;
    console.log(`📄 Usando slug da proposta: ${pasta}`);
  }

  const clienteData = {
    id: cliente.id,
    nome: cliente.nome,
    cidade: cliente.cidade,
    consumoKwh: cliente.consumo_mensal?.toString() || '0',
    tipo: cliente.tipo_imovel || 'Residencial',
    hspLocal: cliente.hsp_local?.toString() || '5.21',
    pdespesa: cliente.pdespesa?.toString() || '0',
    pasta, // ✅ Usa slug real da proposta
    observacoes: (cliente as any).observacoes
  } satisfies ClienteData & { id: string };

  console.log(`✅ Dados do cliente retornados:`, {
    nome: clienteData.nome,
    cidade: clienteData.cidade,
    consumoKwh: clienteData.consumoKwh,
    hspLocal: clienteData.hspLocal,
    pasta: clienteData.pasta
  });

  return clienteData;
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
    // ✅ Excluir cliente (Supabase ou filesystem)
    try {
      const clienteSupabase = await getClienteFromSupabase(clienteId);
      
      if (clienteSupabase?.id) {
        // ✅ DELETAR DO SUPABASE
        console.log(`🗑️ Deletando cliente do Supabase: ${clienteSupabase.nome} (ID: ${clienteSupabase.id})`);
        
        try {
          const { supabase } = await import('@/lib/supabase');
          
          if (!supabase) {
            throw new Error('Supabase não configurado');
          }

          // 1. Buscar todas as propostas do cliente para deletar analytics primeiro
          const { data: propostas, error: propostasFetchError } = await supabase
            .from('propostas')
            .select('id, slug')
            .eq('cliente_id', clienteSupabase.id);

          if (propostas && propostas.length > 0) {
            console.log(`📊 Encontradas ${propostas.length} proposta(s) do cliente`);

            // 1.1. Deletar analytics de todas as propostas
            for (const proposta of propostas) {
              const { error: analyticsError } = await supabase
                .from('proposta_analytics')
                .delete()
                .eq('proposta_slug', proposta.slug);

              if (analyticsError && analyticsError.code !== 'PGRST116') {
                console.warn(`⚠️ Erro ao deletar analytics da proposta ${proposta.slug}:`, analyticsError);
              } else {
                console.log(`✅ Analytics deletados para proposta: ${proposta.slug}`);
              }
            }

            // 1.2. Deletar todas as propostas do cliente
            const { error: propostasError } = await supabase
              .from('propostas')
              .delete()
              .eq('cliente_id', clienteSupabase.id);

            if (propostasError) {
              console.warn('⚠️ Erro ao deletar propostas:', propostasError);
            } else {
              console.log(`✅ ${propostas.length} proposta(s) deletada(s)`);
            }
          } else {
            if (propostasFetchError) {
              console.warn('⚠️ Erro ao buscar propostas (pode não existir):', propostasFetchError);
            } else {
              console.log('ℹ️ Nenhuma proposta encontrada para este cliente');
            }
          }

          // 2. Deletar orçamentos do cliente (se existir tabela)
          try {
            const { error: orcamentosError } = await supabase
              .from('orcamentos')
              .delete()
              .eq('cliente_id', clienteSupabase.id);
            
            if (orcamentosError && orcamentosError.code !== 'PGRST116') {
              console.warn('⚠️ Erro ao deletar orçamentos:', orcamentosError);
            } else {
              console.log('✅ Orçamentos do cliente deletados');
            }
          } catch (orcError) {
            console.warn('⚠️ Tabela orcamentos pode não existir:', orcError);
          }

          // 3. Deletar o cliente
          const { error: deleteError } = await supabase
            .from('clientes')
            .delete()
            .eq('id', clienteSupabase.id);

          if (deleteError) {
            console.error('❌ Erro ao deletar cliente do Supabase:', deleteError);
            return res.status(500).json({ 
              message: 'Erro ao excluir cliente do Supabase', 
              error: deleteError.message 
            });
          }

          console.log(`✅ Cliente "${clienteSupabase.nome}" deletado do Supabase com sucesso!`);
          
          // Também tentar deletar do filesystem se existir
          try {
            await fs.rm(clientePath, { recursive: true, force: true });
            console.log('✅ Pasta do cliente também removida do filesystem');
          } catch (fsError) {
            console.warn('⚠️ Pasta não encontrada no filesystem (ok, cliente estava apenas no Supabase)');
          }

          return res.status(200).json({ 
            message: `Cliente "${clienteSupabase.nome}" excluído do Supabase com sucesso!`,
            deletedFrom: 'Supabase'
          });
        } catch (supabaseError: any) {
          console.error('❌ Erro ao deletar do Supabase:', supabaseError);
          return res.status(500).json({ 
            message: 'Erro ao excluir cliente do Supabase', 
            error: supabaseError.message 
          });
        }
      }

      // ✅ DELETAR DO FILESYSTEM (cliente não está no Supabase)
      console.log(`🗑️ Deletando cliente do filesystem: ${clienteId}`);
      
      // Verificar se cliente existe
      try {
        await fs.access(clientePath);
      } catch {
        return res.status(404).json({ message: 'Cliente não encontrado' });
      }

      // Remover pasta do cliente recursivamente
      await fs.rm(clientePath, { recursive: true, force: true });
      
      console.log(`✅ Cliente "${clienteId}" deletado do filesystem com sucesso!`);

      res.status(200).json({ 
        message: 'Cliente excluído com sucesso',
        deletedFrom: 'filesystem'
      });
    } catch (error: any) {
      console.error('❌ Erro ao excluir cliente:', error);
      res.status(500).json({ 
        message: 'Erro interno do servidor',
        error: error.message 
      });
    }
  }
  
  else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}