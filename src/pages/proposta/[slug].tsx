import React from 'react';
import Head from 'next/head';
import { GetStaticPaths, GetStaticProps } from 'next';
import { Header } from '@/components/Header';
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

// Função helper para dados exemplo
function getExamplePropostaData(slug: string): PropostaData {
  return {
    cliente: {
      nome: `Cliente ${slug}`,
      cidade: 'Anápolis/GO',
      consumoKwh: '450',
      tipo: 'Residencial',
      hspLocal: '5.42'
    },
    sistemas: [
      {
        titulo: 'Sistema Econômico',
        potencia: '4,62 kWp',
        especificacoes: [
          '14 módulos 330W monocristalino',
          '1 inversor 5kW string',
          'Estrutura alumínio',
          'Cabeamento CC/CA completo',
          'String box DC/AC'
        ],
        precoRiscado: 'R$ 21.500,00',
        precoAtual: 'R$ 16.847,73',
        tagDesconto: 'ECONOMIA DE 22%',
        precoPixDecimal: 15980.34,
        preco12x: 'R$ 1.403,98',
        preco18x: 'R$ 1.069,32',
        geracao: '630 kWh',
        cobertura: '140%',
        economia: 'R$ 378,00',
        payback: '19,6 meses',
        tir: '61,2%',
        isRecommended: true,
        badge: '⭐ MELHOR PAYBACK'
      }
    ],
    analise: {
      paybackMin: '19,6',
      paybackMax: '19,6',
      melhorSistemaNome: 'Sistema Econômico',
      melhorSistemaPotencia: '4,62 kWp',
      melhorSistemaPix: 'R$ 15.980,34',
      melhorSistemaPayback: '19,6 meses',
      geracaoMax: '630',
      coberturaMax: '140%',
      tirMax: '61,2%',
      economiaTarifa: 'R$ 0,60'
    },
    empresa: {
      contato: '(62) 99167-0536',
      email: 'contato@piengsolucoes.com.br',
      site: 'www.piengsolucoes.com.br',
      whatsapp: '5562991670536'
    },
    bannerUrgencia: '⚡ OFERTA ESPECIAL: PROPOSTA PERSONALIZADA! VÁLIDA POR TEMPO LIMITADO! ⚡',
    dataGeracao: new Date().toLocaleDateString('pt-BR'),
    dataValidade: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR')
  };
}

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
  // Em produção, você carregaria os slugs da base de dados
  const paths = [
    { params: { slug: 'exemplo' } },
    { params: { slug: 'arisio-anapolis-2024-09-05' } },
    { params: { slug: 'eduardo-farmacia-anapolis-2024-09-05' } },
    { params: { slug: 'bin-pirinopolis' } },
    { params: { slug: 'binpiri' } }, // Adicionado slug do sistema admin
    { params: { slug: 'eduardo' } }, // Para consistência com admin
    { params: { slug: 'teste01' } },
    { params: { slug: 'teste02' } },
    { params: { slug: 'pedropaulo' } },
    { params: { slug: 'danie009-29-09-2025' } }, // Adicionado slug do cliente atual
    { params: { slug: 'cliente-padrao-30-09-2025' } } // Adicionado slug do cliente padrão
  ];

  return {
    paths,
    fallback: true // Permitir carga dinâmica de novos clientes
  };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const slug = params?.slug as string;

  // Tentar carregar dados do cliente se existir, senão usar dados exemplo
  let proposta: PropostaData;

  try {
    const fs = await import('fs');
    const path = await import('path');

    const propostaPath = path.join(process.cwd(), 'src/data/clientes', slug, 'proposta.json');
    const propostaData = await fs.promises.readFile(propostaPath, 'utf8');
    proposta = JSON.parse(propostaData);
    
    console.log('✅ Dados carregados para slug:', slug);
    console.log('📊 Sistemas encontrados:', proposta.sistemas?.length || 0);
  } catch (error) {
    console.error('❌ Erro ao carregar dados para slug:', slug, error);
    // Fallback para dados exemplo
    proposta = getExamplePropostaData(slug);
  }

  return {
    props: {
      proposta
    },
    revalidate: 60 // Revalidar a cada 60 segundos
  };
};