import { NextApiRequest, NextApiResponse } from 'next';

/**
 * API para verificar se a tabela propostas existe e pode ser acessada
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return res.status(500).json({ error: 'Variáveis não configuradas' });
    }

    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    // Tentar listar propostas
    const { data: propostas, error: propostasError } = await supabase
      .from('propostas')
      .select('id, slug, titulo')
      .limit(5);

    if (propostasError) {
      return res.status(500).json({
        error: 'Erro ao consultar tabela propostas',
        details: propostasError,
        message: propostasError.message,
        hint: propostasError.hint,
        code: propostasError.code,
      });
    }

    // Tentar fazer um INSERT de teste (será revertido)
    const testSlug = `test-${Date.now()}`;
    const { data: testInsert, error: insertError } = await supabase
      .from('propostas')
      .insert({
        slug: testSlug,
        titulo: 'Teste Temporário',
        template_usado: 'test',
        status: 'teste',
      })
      .select()
      .single();

    if (insertError) {
      return res.status(500).json({
        error: 'Erro ao inserir na tabela propostas',
        details: insertError,
        message: insertError.message,
        hint: insertError.hint,
        code: insertError.code,
      });
    }

    // Deletar o registro de teste
    await supabase
      .from('propostas')
      .delete()
      .eq('slug', testSlug);

    return res.status(200).json({
      success: true,
      message: '✅ Tabela propostas funcionando!',
      propostasCount: propostas?.length || 0,
      propostas: propostas,
      testInsert: 'INSERT funcionou (registro deletado)',
    });

  } catch (error) {
    console.error('❌ Erro no teste:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
}
