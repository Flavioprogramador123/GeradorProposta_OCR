import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { slug } = req.query;

    if (!slug || typeof slug !== 'string') {
      return res.status(400).json({ message: 'Slug é obrigatório' });
    }

    // Inicializar Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ message: 'Configuração do servidor incompleta' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar analytics da proposta
    const { data: analytics, error } = await supabase
      .from('proposta_analytics')
      .select('*')
      .eq('proposta_slug', slug)
      .order('ultima_visualizacao', { ascending: false });

    if (error) {
      console.error('Erro ao buscar analytics:', error);
      return res.status(500).json({ message: 'Erro ao buscar analytics' });
    }

    // Calcular estatísticas agregadas
    if (!analytics || analytics.length === 0) {
      return res.status(200).json({
        analytics: [],
        estatisticas: {
          totalVisualizacoes: 0,
          visualizacoesUnicas: 0,
          tempoMedioSegundos: 0,
          compartilhado: false,
          precisaContato: false,
          ultimaVisualizacao: null
        }
      });
    }

    const totalVisualizacoes = analytics.reduce((sum, a) => sum + (a.visualizacoes_count || 0), 0);
    const visualizacoesUnicas = analytics.length;
    const tempoMedio = analytics.reduce((sum, a) => sum + (a.tempo_total_segundos || 0), 0) / visualizacoesUnicas;
    const compartilhado = analytics.some(a => a.compartilhado || (a.ips_unicos?.length || 0) > 1);
    const precisaContato = analytics.some(a => a.precisa_contato);
    const ultimaVisualizacao = analytics[0]?.ultima_visualizacao || null;

    // Calcular dias desde última visualização
    let diasSemVisualizar = null;
    if (ultimaVisualizacao) {
      const diff = Date.now() - new Date(ultimaVisualizacao).getTime();
      diasSemVisualizar = Math.floor(diff / (1000 * 60 * 60 * 24));
    }

    return res.status(200).json({
      analytics,
      estatisticas: {
        totalVisualizacoes,
        visualizacoesUnicas,
        tempoMedioSegundos: Math.round(tempoMedio),
        compartilhado,
        precisaContato,
        ultimaVisualizacao,
        diasSemVisualizar,
        alertas: analytics
          .filter(a => a.alerta_contato)
          .map(a => ({
            tipo: a.alerta_contato,
            mensagem: getMensagemAlerta(a.alerta_contato, diasSemVisualizar),
            data: a.ultima_visualizacao
          }))
      }
    });
  } catch (error) {
    console.error('Erro ao processar analytics:', error);
    return res.status(500).json({
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

function getMensagemAlerta(tipo: string | null, diasSemVisualizar: number | null): string {
  switch (tipo) {
    case 'tempo_sem_visualizar':
      return `Cliente não visualiza há ${diasSemVisualizar} dias. Considere entrar em contato.`;
    case 'compartilhado':
      return 'Link foi compartilhado (múltiplos IPs detectados). Pode ter sido enviado para outro fornecedor.';
    case 'muito_tempo_aberto':
      return 'Cliente passou muito tempo analisando a proposta. Alto interesse detectado!';
    case 'sem_visualizacao':
      return 'Proposta ainda não foi visualizada pelo cliente.';
    default:
      return 'Ação recomendada: Verificar status do cliente.';
  }
}


