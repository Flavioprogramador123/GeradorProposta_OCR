import { GetServerSideProps } from 'next';
import Head from 'next/head';
import { getPropostaBySlug } from '@/lib/supabase';

interface PropostaProps {
  proposta: any;
  error?: string;
}

export default function PropostaSupabase({ proposta, error }: PropostaProps) {
  if (error) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h1>❌ Erro</h1>
        <p>{error}</p>
        <a href="/gerador-rapido">Voltar ao Gerador</a>
      </div>
    );
  }

  if (!proposta) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h1>📭 Proposta não encontrada</h1>
        <p>A proposta solicitada não existe ou foi removida.</p>
        <a href="/gerador-rapido">Voltar ao Gerador</a>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Proposta Solar - {proposta.titulo}</title>
        <meta name="description" content={`Proposta solar para ${proposta.titulo}`} />
      </Head>

      {/* Renderizar HTML inline */}
      <div dangerouslySetInnerHTML={{ __html: proposta.html_gerado || '<p>Conteúdo não disponível</p>' }} />
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  try {
    const slug = params?.slug as string;

    if (!slug) {
      return {
        props: {
          proposta: null,
          error: 'Slug não fornecido',
        },
      };
    }

    // Buscar proposta no Supabase
    const proposta = await getPropostaBySlug(slug);

    if (!proposta) {
      return {
        props: {
          proposta: null,
          error: 'Proposta não encontrada no banco de dados',
        },
      };
    }

    return {
      props: {
        proposta,
      },
    };
  } catch (error) {
    console.error('Erro ao buscar proposta:', error);
    return {
      props: {
        proposta: null,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      },
    };
  }
};
