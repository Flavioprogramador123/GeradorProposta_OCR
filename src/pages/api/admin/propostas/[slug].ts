import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { slug } = req.query;

  if (req.method === 'DELETE') {
    if (!slug || typeof slug !== 'string') {
      return res.status(400).json({ error: 'Slug da proposta não fornecido' });
    }

    try {
      console.log(`🗑️ Deletando proposta: ${slug}`);

      // Soft delete: atualizar status para 'inativa'
      const { error } = await supabase
        .from('propostas')
        .update({ status: 'inativa' })
        .eq('slug', slug);

      if (error) {
        console.error('❌ Erro ao deletar proposta:', error);
        return res.status(500).json({ 
          error: 'Erro ao deletar proposta',
          details: error.message 
        });
      }

      console.log(`✅ Proposta marcada como inativa: ${slug}`);
      return res.status(200).json({ 
        success: true,
        message: 'Proposta excluída com sucesso'
      });

    } catch (error) {
      console.error('❌ Erro ao deletar proposta:', error);
      return res.status(500).json({ 
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  return res.status(405).json({ error: 'Método não permitido' });
}

