import React from 'react';
import Head from 'next/head';
import { GetStaticPaths, GetStaticProps } from 'next';
import Header from '@/components/Header';
import { UrgencyBanner } from '@/components/UrgencyBanner';
import { SystemCard } from '@/components/SystemCard';
import { ComparisonTable } from '@/components/ComparisonTable';
import { PerformanceChart } from '@/components/PerformanceChart';
import { TechnicalTable } from '@/components/TechnicalTable';
import { ConsultorButton } from '@/components/ConsultorButton';
import { InsightsSection } from '@/components/InsightsSection';
import { Footer } from '@/components/Footer';
import { PropostaData } from '@/lib/types';
import { convertSystemsToTableData, findBestSystem, calculateInsights } from '@/lib/propostaUtils';

// ❌ DADOS FAKE REMOVIDOS
// Esta página agora só mostra dados reais de proposta.json
// Se não encontrar dados reais, retorna 404

interface PropostaPageProps {
  proposta: PropostaData;
}

export default function PropostaPage({ proposta }: PropostaPageProps) {
  // Verificação defensiva para evitar erro se dados forem undefined
  const sistemas = proposta?.sistemas || [];
  const cliente = proposta?.cliente || { nome: 'Cliente', cidade: 'Cidade', consumoKwh: 0, tipo: 'Residencial', hspLocal: 5.21 };
  const analise = proposta?.analise || { economiaTarifa: 0.8 };
  const empresa = proposta?.empresa || {
    contato: 'PIENG Soluções Energéticas',
    email: 'contato@pieng.com.br',
    whatsapp: '62999999999',
    site: 'www.pieng.com.br'
  };

  // Debug: verificar dados carregados
  console.log('🔍 Dados carregados na página:', {
    proposta: !!proposta,
    sistemas: sistemas.length,
    cliente: cliente.nome,
    analise: analise,
    empresa: empresa
  });
  const tableData = convertSystemsToTableData(sistemas);
  const bestSystem = findBestSystem(sistemas);
  const insights = calculateInsights(sistemas);

  return (
    <>
      <Head>
        <title>PIENG | Proposta Solar Personalizada - {cliente.nome}</title>
        <meta name="description" content={`Proposta solar personalizada para ${cliente.nome} em ${cliente.cidade}`} />
        <meta name="robots" content="noindex" />
      </Head>

      <div className="pieng-container">
        <Header
          clienteNome={cliente.nome}
          clienteCidade={cliente.cidade}
          clienteConsumo={cliente.consumoKwh}
          clienteTipo={cliente.tipo}
        />

        <UrgencyBanner message={proposta?.bannerUrgencia || "🚀 Oferta especial válida até o final do mês!"} />

        <section className="pieng-system-grid">
          {sistemas.map((sistema, index) => (
            <SystemCard key={index} {...sistema} />
          ))}
        </section>

        <ComparisonTable systems={tableData} />

        <PerformanceChart sistemas={sistemas} />

        <TechnicalTable
          sistemas={sistemas}
          clienteConsumo={cliente.consumoKwh}
          hspLocal={cliente.hspLocal}
        />

        <InsightsSection
          paybackMin={analise.paybackMin || insights.paybackMin}
          paybackMax={analise.paybackMax || insights.paybackMax}
          melhorSistemaNome={analise.melhorSistemaNome || bestSystem?.titulo || 'Sistema Recomendado'}
          melhorSistemaPotencia={analise.melhorSistemaPotencia || bestSystem?.potencia || '0 kWp'}
          melhorSistemaPix={analise.melhorSistemaPix || `R$ ${bestSystem?.precoPixDecimal?.toFixed(2) || '0,00'}`}
          melhorSistemaPayback={analise.melhorSistemaPayback || bestSystem?.payback || '0 meses'}
          geracaoMax={analise.geracaoMax || insights.geracaoMax}
          clienteConsumo={cliente.consumoKwh}
          hspLocal={cliente.hspLocal}
          clienteCidade={cliente.cidade}
          economiaTarifa={analise.economiaTarifa || 'R$ 0.80'}
          tirMax={analise.tirMax || insights.tirMax}
          clienteNome={cliente.nome}
        />

        <ConsultorButton
          whatsappNumber={empresa.whatsapp}
          empresaContato={empresa.contato}
          empresaEmail={empresa.email}
          clienteNome={cliente.nome}
          melhorSistemaNome={bestSystem?.titulo}
        />

        <Footer
          empresaContato={empresa.contato}
          empresaEmail={empresa.email}
          empresaSite={empresa.site}
          clienteCidade={cliente.cidade}
          hspLocal={cliente.hspLocal}
          economiaTarifa={analise.economiaTarifa || 'R$ 0.80'}
          clienteTipo={cliente.tipo}
          dataValidade={proposta?.dataValidade || '14/10/2025'}
          dataGeracao={proposta?.dataGeracao || '30/09/2025'}
        />
      </div>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  try {
    const fs = await import('fs');
    const path = await import('path');

    // Ler todos os clientes da pasta
    const clientesDir = path.join(process.cwd(), 'src/data/clientes');
    const slugs = fs.readdirSync(clientesDir);

    // Filtrar apenas clientes com proposta.json
    const paths = slugs
      .filter(slug => {
        try {
          const propostaPath = path.join(clientesDir, slug, 'proposta.json');
          return fs.existsSync(propostaPath);
        } catch {
          return false;
        }
      })
      .map(slug => ({ params: { slug } }));

    console.log(`✅ ${paths.length} propostas encontradas para SSG`);

    return {
      paths,
      fallback: 'blocking' // Gera páginas sob demanda se não existir
    };
  } catch (error) {
    console.error('❌ Erro ao carregar slugs:', error);
    // Fallback: retornar paths vazios e deixar fallback gerar sob demanda
    return {
      paths: [],
      fallback: 'blocking'
    };
  }
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const slug = params?.slug as string;

  try {
    const fs = await import('fs');
    const path = await import('path');

    const propostaPath = path.join(process.cwd(), 'src/data/clientes', slug, 'proposta.json');
    const propostaData = await fs.promises.readFile(propostaPath, 'utf8');
    const proposta: PropostaData = JSON.parse(propostaData);

    console.log('✅ Dados REAIS carregados para:', slug);
    console.log('📊 Sistemas encontrados:', proposta.sistemas?.length || 0);

    return {
      props: {
        proposta
      },
      revalidate: 60 // Revalidar a cada 60 segundos
    };
  } catch (error) {
    console.error('❌ Proposta não encontrada para:', slug);
    console.log('💡 Tentando carregar da API...');

    // FALLBACK: Tentar carregar da API Supabase ou arquivo público
    try {
      const baseUrl = process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:3000';

      const response = await fetch(`${baseUrl}/api/propostas/${slug}`);

      if (response.ok) {
        const proposta = await response.json();
        console.log('✅ Proposta carregada da API:', slug);
        return {
          props: { proposta },
          revalidate: 60
        };
      }
    } catch (apiError) {
      console.error('❌ Erro ao carregar da API:', apiError);
    }

    // Retornar 404 se não encontrar dados reais
    return {
      notFound: true,
      revalidate: 60
    };
  }
};