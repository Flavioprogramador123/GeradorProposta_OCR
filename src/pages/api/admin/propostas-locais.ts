import { NextApiRequest, NextApiResponse } from 'next';
import { getAllPropostasLocais, getAllPropostas } from '@/lib/local-db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Buscar todas as propostas (locais e Supabase)
    const { locais, supabase, total } = await getAllPropostas();

    // Converter propostas locais para formato de orçamento
    const orcamentosLocais = locais.flatMap((proposta) => {
      const dados = proposta.dados_completos;
      if (!dados || !dados.sistemas || !Array.isArray(dados.sistemas)) {
        return [];
      }

      return dados.sistemas.map((sistema: any, index: number) => {
        // Extrair potência
        const potenciaMatch = sistema.potencia?.toString().match(/(\d+\.?\d*)/);
        const potencia = potenciaMatch ? parseFloat(potenciaMatch[1]) : sistema.potTotal || proposta.sistema_kwp || 0;
        
        // Calcular módulos e inversores
        const modulos = Math.round(potencia * 1000 / 605);
        const inversores = Math.ceil(potencia / 15);

        return {
          id: `${proposta.slug}-sistema-${index + 1}`,
          propostaId: proposta.id,
          cliente: dados.cliente?.nome || 'Cliente',
          clientePasta: proposta.slug,
          potencia: potencia,
          modulos: modulos,
          inversores: inversores,
          valorTotal: sistema.precoPixDecimal || proposta.valor_total || 0,
          status: 'aprovado' as const, // Propostas locais são consideradas aprovadas
          data: proposta.created_at || new Date().toISOString(),
          geracaoMensal: sistema.geracao || proposta.geracao_mensal || 0,
          paybackMeses: sistema.payback ? parseFloat(sistema.payback.replace(/[^\d.,]/g, '').replace(',', '.')) * 12 : proposta.payback ? proposta.payback * 12 : 0,
          cobertura: sistema.cobertura ? parseFloat(sistema.cobertura.replace(/[^\d.,]/g, '').replace(',', '.')) : 0,
          storageType: 'local' as const, // ✅ Marca como local
          storageLocation: 'Máquina Local' // ✅ Indica localização
        };
      });
    });

    // Converter propostas do Supabase para formato de orçamento
    const orcamentosSupabase = supabase.flatMap((proposta: any) => {
      const dados = proposta.dados_completos;
      if (!dados || !dados.sistemas || !Array.isArray(dados.sistemas)) {
        return [];
      }

      return dados.sistemas.map((sistema: any, index: number) => {
        const potenciaMatch = sistema.potencia?.toString().match(/(\d+\.?\d*)/);
        const potencia = potenciaMatch ? parseFloat(potenciaMatch[1]) : sistema.potTotal || proposta.sistema_kwp || 0;
        const modulos = Math.round(potencia * 1000 / 605);
        const inversores = Math.ceil(potencia / 15);

        return {
          id: `${proposta.slug}-sistema-${index + 1}`,
          propostaId: proposta.id,
          cliente: proposta.clientes?.nome || dados.cliente?.nome || 'Cliente',
          clientePasta: proposta.slug,
          potencia: potencia,
          modulos: modulos,
          inversores: inversores,
          valorTotal: sistema.precoPixDecimal || proposta.valor_total || 0,
          status: 'aprovado' as const,
          data: proposta.created_at || new Date().toISOString(),
          geracaoMensal: sistema.geracao || proposta.geracao_mensal || 0,
          paybackMeses: sistema.payback ? parseFloat(sistema.payback.replace(/[^\d.,]/g, '').replace(',', '.')) * 12 : proposta.payback ? proposta.payback * 12 : 0,
          cobertura: sistema.cobertura ? parseFloat(sistema.cobertura.replace(/[^\d.,]/g, '').replace(',', '.')) : 0,
          storageType: 'supabase' as const, // ✅ Marca como Supabase
          storageLocation: 'Supabase (Nuvem)' // ✅ Indica localização
        };
      });
    });

    // Combinar todos os orçamentos
    const todosOrcamentos = [...orcamentosLocais, ...orcamentosSupabase];

    // Calcular estatísticas
    const stats = {
      total: todosOrcamentos.length,
      locais: orcamentosLocais.length,
      supabase: orcamentosSupabase.length,
      pendentes: todosOrcamentos.filter(o => o.status === 'pendente').length,
      aprovados: todosOrcamentos.filter(o => o.status === 'aprovado').length,
      rejeitados: todosOrcamentos.filter(o => o.status === 'rejeitado').length
    };

    return res.status(200).json({
      orcamentos: todosOrcamentos,
      stats,
      source: 'mixed', // Indica que veio de múltiplas fontes
      locais: orcamentosLocais.length,
      supabase: orcamentosSupabase.length
    });

  } catch (error) {
    console.error('❌ Erro ao buscar propostas locais:', error);
    return res.status(500).json({
      error: 'Erro ao buscar propostas locais',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

