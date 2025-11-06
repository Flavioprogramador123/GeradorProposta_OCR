import { NextApiRequest, NextApiResponse } from 'next';
import { supabase, supabaseConfig } from '../../../lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verificar se Supabase está configurado
  if (!supabaseConfig.isConfigured) {
    return res.status(503).json({ 
      message: 'Supabase não configurado',
      hint: 'Execute: npm run setup-supabase' 
    });
  }

  if (req.method === 'GET') {
    try {
      // Buscar todos os clientes
      const { data: clientes, error: clientesError } = await supabase
        .from('clientes')
        .select('*')
        .order('created_at', { ascending: false });

      if (clientesError) {
        console.error('Erro ao buscar clientes:', clientesError);
        return res.status(500).json({ message: 'Erro ao buscar clientes', error: clientesError.message });
      }

      // Buscar propostas para contar quantos clientes têm propostas
      const { data: propostas, error: propostasError } = await supabase
        .from('propostas')
        .select('cliente_id');

      if (propostasError) {
        console.error('Erro ao buscar propostas:', propostasError);
      }

      const clientesComProposta = new Set(propostas?.map(p => p.cliente_id) || []);
      
      // Formatar resposta
      const clientesFormatados = clientes?.map(cliente => ({
        nome: cliente.nome,
        cidade: cliente.cidade || 'N/A',
        pasta: cliente.slug,
        status: clientesComProposta.has(cliente.id) ? 'proposta_gerada' : 'aguardando_orcamentos',
        ultimaModificacao: new Date(cliente.updated_at || cliente.created_at).toLocaleDateString('pt-BR'),
        temProposta: clientesComProposta.has(cliente.id),
        id: cliente.id,
        email: cliente.email,
        telefone: cliente.telefone
      })) || [];

      const stats = {
        totalClientes: clientesFormatados.length,
        proposasGeradas: Array.from(clientesComProposta).length,
        aguardandoOrcamentos: clientesFormatados.length - Array.from(clientesComProposta).length
      };

      console.log(`✅ Supabase: ${clientesFormatados.length} clientes encontrados`);

      return res.status(200).json({ clientes: clientesFormatados, stats });

    } catch (error) {
      console.error('Erro ao listar clientes do Supabase:', error);
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}

