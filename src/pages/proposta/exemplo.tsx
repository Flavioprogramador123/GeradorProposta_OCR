import { GetServerSideProps } from 'next';
import { supabase } from '@/lib/supabase';

/**
 * Rota /proposta/exemplo
 * Redireciona para a proposta mais recente ou uma proposta demo válida
 * Útil para mostrar para novos usuários como fica uma proposta
 */
export default function PropostaExemplo() {
  return null; // Nunca renderiza, sempre redireciona
}

export const getServerSideProps: GetServerSideProps = async () => {
  try {
    console.log('🔍 Buscando proposta de exemplo...');

    // Tentar buscar proposta mais recente do Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      try {
        const { data: propostas, error } = await supabase
          .from('propostas')
          .select('slug, titulo, created_at')
          .eq('status', 'ativa')
          .order('created_at', { ascending: false })
          .limit(1);

        if (!error && propostas && propostas.length > 0) {
          const propostaRecente = propostas[0];
          console.log(`✅ Redirecionando para proposta recente: ${propostaRecente.slug}`);

          return {
            redirect: {
              destination: `/proposta/${propostaRecente.slug}`,
              permanent: false, // 302 redirect (temporário)
            },
          };
        }
      } catch (supabaseError) {
        console.error('⚠️ Erro ao buscar do Supabase:', supabaseError);
      }
    }

    // Fallback: Buscar no filesystem (desenvolvimento local)
    const fs = await import('fs').then(m => m.promises);
    const path = await import('path');

    const clientesDir = path.join(process.cwd(), 'src/data/clientes');

    try {
      const folders = await fs.readdir(clientesDir);

      // Filtrar apenas pastas que têm proposta.json
      const propostasValidas = [];

      for (const folder of folders) {
        try {
          const propostaPath = path.join(clientesDir, folder, 'proposta.json');
          await fs.access(propostaPath);

          // Pegar data de modificação
          const stats = await fs.stat(propostaPath);
          propostasValidas.push({
            slug: folder,
            mtime: stats.mtime.getTime()
          });
        } catch {
          // Pasta não tem proposta.json, ignorar
        }
      }

      if (propostasValidas.length > 0) {
        // Ordenar por mais recente
        propostasValidas.sort((a, b) => b.mtime - a.mtime);
        const maisRecente = propostasValidas[0];

        console.log(`✅ Redirecionando para proposta do filesystem: ${maisRecente.slug}`);

        return {
          redirect: {
            destination: `/proposta/${maisRecente.slug}`,
            permanent: false,
          },
        };
      }
    } catch (fsError) {
      console.error('⚠️ Erro ao buscar no filesystem:', fsError);
    }

    // Fallback final: Lista de slugs conhecidos
    const slugsFallback = [
      'cliente-padrao-550-06-11-2025',
      'marcelo-14-10-2025',
      'lourenco-15-10-2025',
      'betania-01-10-2025'
    ];

    // Tentar cada slug até encontrar um que funcione
    for (const slug of slugsFallback) {
      try {
        // Verificar se existe no Supabase
        if (supabaseUrl && supabaseKey) {
          const { data, error } = await supabase
            .from('propostas')
            .select('slug')
            .eq('slug', slug)
            .eq('status', 'ativa')
            .single();

          if (!error && data) {
            console.log(`✅ Redirecionando para proposta fallback: ${slug}`);
            return {
              redirect: {
                destination: `/proposta/${slug}`,
                permanent: false,
              },
            };
          }
        }
      } catch {
        // Tentar próximo
      }
    }

    // Último fallback: Redirecionar para gerador rápido
    console.log('⚠️ Nenhuma proposta encontrada, redirecionando para gerador rápido');
    return {
      redirect: {
        destination: '/gerador-rapido?criar=exemplo',
        permanent: false,
      },
    };

  } catch (error) {
    console.error('❌ Erro ao buscar proposta de exemplo:', error);

    // Em caso de erro, redirecionar para página inicial
    return {
      redirect: {
        destination: '/admin',
        permanent: false,
      },
    };
  }
};
