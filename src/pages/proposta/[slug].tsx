import React, { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
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
import { getPropostaBySlug } from '@/lib/supabase';
import { getLogoMetaTags } from '@/lib/logoConfig';
import PropostaPdfToolbar from '@/components/PropostaPdfToolbar';
import { abrirDialogoPdf } from '@/lib/propostaPdf';

interface PropostaPageProps {
  proposta?: PropostaData;
  htmlContent?: string;
  slug?: string;
  useHtmlDirect?: boolean;
  templateUsado?: string; // ✅ Template salvo na proposta
}

export default function PropostaPage({ proposta, htmlContent, useHtmlDirect, slug, templateUsado }: PropostaPageProps) {
  const router = useRouter();
  const [templateCss, setTemplateCss] = useState<string | null>(null);
  
  // ✅ Tracking de Analytics (para HTML direto também)
  const trackingRef = useRef({
    startTime: Date.now(),
    primeiraVisualizacao: new Date().toISOString(),
    tempoNaPagina: 0,
    scrollMax: 0,
    cliques: 0,
    intervalId: null as NodeJS.Timeout | null
  });

  // 🎨 Carregar CSS do template selecionado
  useEffect(() => {
    // ✅ Prioridade: query parameter > template salvo > padrão
    const template = (router.query.template as string) || templateUsado || 'padrao';
    if (!template || template === 'padrao') {
      setTemplateCss(null);
      return;
    }

    // Mapear template para arquivo CSS (usando os mesmos nomes do variantConfig)
    const cssMap: Record<string, string> = {
      'residencial': '/styles/residencial.css',
      'residencial-premium': '/styles/residencial.css', // Alias
      'rural': '/styles/rural.css',
      'rural-agro': '/styles/rural.css', // Alias
      'comercial-panificadora': '/styles/comercial-panificadora.css',
      'comercial-acougue': '/styles/comercial-acougue.css',
      'comercial-restaurante': '/styles/comercial-restaurante.css',
      'comercial-mercado': '/styles/comercial-mercado.css',
      'industrial': '/styles/industrial.css',
      'industrial-premium': '/styles/industrial.css', // Alias
    };

    const cssFile = cssMap[template];
    if (cssFile) {
      // Carregar CSS dinamicamente
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = cssFile;
      link.id = 'template-css-dynamic';
      
      // Remover CSS anterior se existir
      const existing = document.getElementById('template-css-dynamic');
      if (existing) {
        existing.remove();
      }
      
      document.head.appendChild(link);
      setTemplateCss(cssFile);
      
      // Adicionar classe ao body para aplicar variantes
      document.body.classList.add(`variant-${template}`);
      
      return () => {
        // Cleanup
        const linkToRemove = document.getElementById('template-css-dynamic');
        if (linkToRemove) {
          linkToRemove.remove();
        }
        document.body.classList.remove(`variant-${template}`);
      };
    }
  }, [router.query.template]);

  // Abrir diálogo PDF automaticamente (?pdf=1)
  useEffect(() => {
    if (router.query.pdf !== '1') return;
    const nome = proposta?.cliente?.nome;
    const propostaSlug = slug || proposta?.slug || (router.query.slug as string);
    const timer = window.setTimeout(() => {
      abrirDialogoPdf(nome, propostaSlug);
    }, 900);
    return () => window.clearTimeout(timer);
  }, [router.query.pdf, slug, proposta?.cliente?.nome, proposta?.slug, router.query.slug]);

  useEffect(() => {
    const propostaSlug = slug || proposta?.slug;
    if (!propostaSlug) return;

    const startTime = Date.now();

    // Função para enviar tracking
    const enviarTracking = async (isFinal = false) => {
      const tempoNaPagina = Math.floor((Date.now() - startTime) / 1000);
      const scrollPercentage = Math.max(
        trackingRef.current.scrollMax,
        Math.round((window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100)
      );

      try {
        await fetch(`/api/propostas/${propostaSlug}/track`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tempoNaPagina: isFinal ? trackingRef.current.tempoNaPagina + tempoNaPagina : tempoNaPagina,
            scrollPercentage,
            cliques: trackingRef.current.cliques,
            primeiraVisualizacao: trackingRef.current.primeiraVisualizacao
          })
        });
      } catch (error) {
        console.error('Erro ao enviar tracking:', error);
      }
    };

    // Rastrear scroll
    const handleScroll = () => {
      const scrollPercent = Math.round(
        (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
      );
      trackingRef.current.scrollMax = Math.max(trackingRef.current.scrollMax, scrollPercent);
    };

    // Rastrear cliques
    const handleClick = () => {
      trackingRef.current.cliques++;
    };

    // Enviar tracking a cada 30 segundos
    trackingRef.current.intervalId = setInterval(() => {
      trackingRef.current.tempoNaPagina = Math.floor((Date.now() - startTime) / 1000);
      enviarTracking(false);
    }, 30000);

    // Enviar tracking inicial
    enviarTracking(false);

    // Event listeners
    window.addEventListener('scroll', handleScroll);
    document.addEventListener('click', handleClick);

    // Enviar tracking final ao sair
    const handleBeforeUnload = () => {
      trackingRef.current.tempoNaPagina = Math.floor((Date.now() - startTime) / 1000);
      enviarTracking(true);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup
    return () => {
      if (trackingRef.current.intervalId) {
        clearInterval(trackingRef.current.intervalId);
      }
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('click', handleClick);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Enviar tracking final
      trackingRef.current.tempoNaPagina = Math.floor((Date.now() - startTime) / 1000);
      enviarTracking(true);
    };
  }, [slug, proposta?.slug]);

  // Se temos HTML direto, renderizar diretamente
  if (useHtmlDirect && htmlContent) {
    const baseUrl = 'https://pieng-propostas.vercel.app';
    const logoMeta = getLogoMetaTags();
    const ogImage = logoMeta.url;
    const pageUrl = `${baseUrl}/proposta/${slug}`;
    const pageTitle = `PIENG | Proposta Solar Personalizada`;
    const pageDescription = `Proposta solar personalizada. Economia de até 95% na conta de energia com sistema fotovoltaico.`;
    
    return (
      <>
        <Head>
          <title>{pageTitle}</title>
          <meta name="description" content={pageDescription} />
          
          {/* Open Graph / Facebook */}
          <meta property="og:type" content="website" />
          <meta property="og:url" content={pageUrl} />
          <meta property="og:title" content={pageTitle} />
          <meta property="og:description" content={pageDescription} />
          <meta property="og:image" content={ogImage} />
          <meta property="og:image:secure_url" content={ogImage} />
          <meta property="og:image:type" content={logoMeta.mimeType} />
          <meta property="og:image:width" content="1200" />
          <meta property="og:image:height" content="630" />
          <meta property="og:image:alt" content="PIENG Soluções Energéticas - Logo" />
          <meta property="og:site_name" content="PIENG Soluções Energéticas" />
          <meta property="og:locale" content="pt_BR" />
          
          {/* Twitter Card */}
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:url" content={pageUrl} />
          <meta name="twitter:title" content={pageTitle} />
          <meta name="twitter:description" content={pageDescription} />
          <meta name="twitter:image" content={ogImage} />
          <meta name="twitter:image:alt" content="PIENG Soluções Energéticas - Logo" />
          
          {/* Fallback image para compatibilidade */}
          <link rel="image_src" href={ogImage} />
          <link rel="stylesheet" href="/styles/proposta-print.css" />
        </Head>
        <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
        <PropostaPdfToolbar clienteNome={slug} slug={slug} />
      </>
    );
  }

  // Se não temos proposta, mostrar erro
  if (!proposta) {
    return (
      <>
        <Head>
          <title>PIENG | Proposta não encontrada</title>
        </Head>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-orange-50 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-800 mb-4">Proposta não encontrada</h1>
            <p className="text-gray-600 mb-4">A proposta solicitada não foi encontrada no sistema.</p>
            <a href="/gerador-rapido" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Gerar Nova Proposta
            </a>
          </div>
        </div>
      </>
    );
  }

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

  // URL base para meta tags (Open Graph) - SEMPRE usar URL de produção
  const baseUrl = 'https://pieng-propostas.vercel.app';
  
  // Logo configurável via logoConfig.ts ou variável de ambiente NEXT_PUBLIC_OG_LOGO
  const logoMeta = getLogoMetaTags();
  const ogImage = logoMeta.url;
  const pageUrl = `${baseUrl}/proposta/${slug || proposta?.slug}`;
  const pageTitle = `PIENG | Proposta Solar Personalizada - ${cliente.nome}`;
  const pageDescription = `Proposta solar personalizada para ${cliente.nome} em ${cliente.cidade}. Economia de até 95% na conta de energia com sistema fotovoltaico.`;

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta name="robots" content="noindex" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:image:secure_url" content={ogImage} />
        <meta property="og:image:type" content={logoMeta.mimeType} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="PIENG Soluções Energéticas - Logo" />
        <meta property="og:site_name" content="PIENG Soluções Energéticas" />
        <meta property="og:locale" content="pt_BR" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content={pageUrl} />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        <meta name="twitter:image" content={ogImage} />
        <meta name="twitter:image:alt" content="PIENG Soluções Energéticas - Logo" />
        
        {/* Fallback image para compatibilidade */}
        <link rel="image_src" href={ogImage} />
        <link rel="stylesheet" href="/styles/proposta-print.css" />
      </Head>

      <div className="pieng-container">
        <Header
          clienteNome={cliente.nome}
          clienteCidade={cliente.cidade}
          clienteConsumo={cliente.consumoKwh}
          clienteTipo={cliente.tipo}
        />

        <UrgencyBanner message={proposta?.bannerUrgencia || "Oferta especial por tempo limitado! Orçamento válido por 2 dias ou até acabar o estoque."} />

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

      <PropostaPdfToolbar clienteNome={cliente.nome} slug={slug || proposta?.slug} />
    </>
  );
}

// Usar getServerSideProps para funcionar em produção (Vercel serverless)
export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  const slug = params?.slug as string;

  try {
    // TENTAR 1: Buscar do Supabase (produção)
    console.log('🔍 Buscando proposta no Supabase:', slug);
    const propostaSupabase = await getPropostaBySlug(slug);

      if (propostaSupabase && propostaSupabase.dados_completos) {
      console.log('✅ Proposta encontrada no Supabase:', slug);
      return {
        props: {
          proposta: propostaSupabase.dados_completos as PropostaData,
          slug: slug,
          templateUsado: propostaSupabase.template_usado || 'padrao', // ✅ Passar template salvo
        },
      };
    }

    // TENTAR 2: Buscar da API (fallback)
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXTAUTH_URL || 'http://localhost:3000';

    try {
      const response = await fetch(`${baseUrl}/api/propostas/${slug}`);
      if (response.ok) {
        const proposta = await response.json();
        console.log('✅ Proposta carregada da API:', slug);
        return {
          props: { proposta, slug },
        };
      }
    } catch (apiError) {
      console.log('⚠️ API não disponível, tentando filesystem...');
    }

    // TENTAR 3: Buscar do filesystem (apenas em desenvolvimento/local)
    const fs = await import('fs');
    const path = await import('path');

    const propostaPath = path.join(process.cwd(), 'src/data/clientes', slug, 'proposta.json');
    
    if (fs.existsSync(propostaPath)) {
      const propostaData = await fs.promises.readFile(propostaPath, 'utf8');
      const proposta: PropostaData = JSON.parse(propostaData);
      
      console.log('✅ Proposta carregada do filesystem:', slug);
      return {
        props: { proposta, slug },
      };
    }

    // TENTAR 4: Buscar HTML direto de /public/propostas (fallback)
    const htmlPath = path.join(process.cwd(), 'public', 'propostas', 'orçamento', 'clientes', `proposta_${slug}.html`);
    
    if (fs.existsSync(htmlPath)) {
      const htmlContent = await fs.promises.readFile(htmlPath, 'utf8');
      return {
        props: {
          htmlContent,
          slug: slug,
          useHtmlDirect: true
        },
      };
    }

    // Não encontrado - retornar 404
    console.error('❌ Proposta não encontrada para:', slug);
    return {
      notFound: true,
    };

  } catch (error) {
    console.error('❌ Erro ao carregar proposta:', error);
    return {
      notFound: true,
    };
  }
};
