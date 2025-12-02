import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { clienteId } = req.query;

    if (!clienteId || typeof clienteId !== 'string') {
      return res.status(400).json({ message: 'Cliente ID é obrigatório' });
    }

    // Inicializar Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ message: 'Configuração do servidor incompleta' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar cliente pelo ID ou slug
    let cliente;
    const { data: clienteById } = await supabase
      .from('clientes')
      .select('id')
      .eq('id', clienteId)
      .single();

    if (clienteById) {
      // Buscar proposta do cliente
      const { data: proposta, error } = await supabase
        .from('propostas')
        .select('slug, id')
        .eq('cliente_id', clienteId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !proposta) {
        return res.status(404).json({ message: 'Proposta não encontrada para este cliente' });
      }

      return res.status(200).json({ slug: proposta.slug, propostaId: proposta.id });
    }

    // Se não encontrou por ID, tentar buscar por slug (nome normalizado)
    const { data: propostas, error: propostasError } = await supabase
      .from('propostas')
      .select('slug, id, cliente_id')
      .ilike('slug', `%${clienteId}%`)
      .order('created_at', { ascending: false })
      .limit(1);

    if (propostasError || !propostas || propostas.length === 0) {
      return res.status(404).json({ message: 'Proposta não encontrada' });
    }

    return res.status(200).json({ 
      slug: propostas[0].slug, 
      propostaId: propostas[0].id 
    });
  } catch (error) {
    console.error('Erro ao buscar proposta do cliente:', error);
    return res.status(500).json({
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}


