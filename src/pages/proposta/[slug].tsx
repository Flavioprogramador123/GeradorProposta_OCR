import React from 'react';
import Head from 'next/head';
import { GetStaticPaths, GetStaticProps } from 'next';
import { Header } from '@/components/Header';
import { UrgencyBanner } from '@/components/UrgencyBanner';
import { SystemCard } from '@/components/SystemCard';
import { ComparisonTable } from '@/components/ComparisonTable';
import { InsightsSection } from '@/components/InsightsSection';
import { CTASection } from '@/components/CTASection';
import { Footer } from '@/components/Footer';
import { PropostaData } from '@/lib/types';
import { convertSystemsToTableData, findBestSystem, calculateInsights } from '@/lib/propostaUtils';

interface PropostaPageProps {
  proposta: PropostaData;
}

export default function PropostaPage({ proposta }: PropostaPageProps) {
  const tableData = convertSystemsToTableData(proposta.sistemas);
  const bestSystem = findBestSystem(proposta.sistemas);
  const insights = calculateInsights(proposta.sistemas);

  return (
    <>
      <Head>
        <title>PIENG | Proposta Solar Personalizada - {proposta.cliente.nome}</title>
        <meta name="description" content={`Proposta solar personalizada para ${proposta.cliente.nome} em ${proposta.cliente.cidade}`} />
        <meta name="robots" content="noindex" />
      </Head>

      <div className="pieng-container">
        <Header
          clienteNome={proposta.cliente.nome}
          clienteCidade={proposta.cliente.cidade}
          clienteConsumo={proposta.cliente.consumoKwh}
          clienteTipo={proposta.cliente.tipo}
        />

        <UrgencyBanner message={proposta.bannerUrgencia} />

        <section className="pieng-system-grid">
          {proposta.sistemas.map((sistema, index) => (
            <SystemCard key={index} {...sistema} />
          ))}
        </section>

        <ComparisonTable systems={tableData} />

        <InsightsSection
          paybackMin={insights.paybackMin}
          paybackMax={insights.paybackMax}
          melhorSistemaNome={bestSystem?.titulo || ''}
          melhorSistemaPotencia={bestSystem?.potencia || ''}
          melhorSistemaPix={bestSystem?.precoPixDecimal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || ''}
          melhorSistemaPayback={bestSystem?.payback || ''}
          geracaoMax={insights.geracaoMax}
          clienteConsumo={proposta.cliente.consumoKwh}
          hspLocal={proposta.cliente.hspLocal}
          clienteCidade={proposta.cliente.cidade}
          economiaTarifa={proposta.analise.economiaTarifa}
          tirMax={insights.tirMax}
          clienteNome={proposta.cliente.nome}
        />

        <CTASection
          empresaContato={proposta.empresa.contato}
          empresaEmail={proposta.empresa.email}
          whatsappNumber={proposta.empresa.whatsapp}
        />

        <Footer
          empresaContato={proposta.empresa.contato}
          empresaEmail={proposta.empresa.email}
          empresaSite={proposta.empresa.site}
          clienteCidade={proposta.cliente.cidade}
          hspLocal={proposta.cliente.hspLocal}
          economiaTarifa={proposta.analise.economiaTarifa}
          clienteTipo={proposta.cliente.tipo}
          dataValidade={proposta.dataValidade}
          dataGeracao={proposta.dataGeracao}
        />
      </div>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  // Em produção, você carregaria os slugs da base de dados
  const paths = [
    { params: { slug: 'exemplo' } },
    { params: { slug: 'arisio-anapolis-2024-09-05' } }
  ];

  return {
    paths,
    fallback: false
  };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const slug = params?.slug as string;
  
  // Carregar dados baseado no slug
  let proposta: PropostaData;
  
  if (slug === 'arisio-anapolis-2024-09-05') {
    // Carregar dados do Arisio
    const fs = require('fs');
    const path = require('path');
    const propostaPath = path.join(process.cwd(), 'src/data/clientes/arisio/proposta.json');
    const propostaData = JSON.parse(fs.readFileSync(propostaPath, 'utf8'));
    proposta = propostaData;
  } else {
    // Dados exemplo para outros slugs
    proposta = {
    cliente: {
      nome: 'Arisio Cliente',
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
    bannerUrgencia: '⚡ OFERTA ESPECIAL: DESCONTO EXCLUSIVO VÁLIDO ATÉ 15/09/2024! ÚLTIMAS UNIDADES COM ESTE PREÇO! ⚡',
    dataGeracao: '05/09/2024',
    dataValidade: '15/09/2024'
  };
  }

  return {
    props: {
      proposta
    }
  };
};