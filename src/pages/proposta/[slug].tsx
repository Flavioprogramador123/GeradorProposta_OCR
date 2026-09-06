import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Head from 'next/head';
import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import Header from '@/components/Header';
import { UrgencyBanner } from '@/components/UrgencyBanner';
import { SystemCard } from '@/components/SystemCard';
import { ComparisonTable } from '@/components/ComparisonTable';
import { PerformanceChart } from '@/components/PerformanceChart';
import { ProjecaoGeracaoChart } from '@/components/ProjecaoGeracaoChart';
import { PaybackFioBChart } from '@/components/PaybackFioBChart';
import { TechnicalTable } from '@/components/TechnicalTable';
import { ConsultorButton } from '@/components/ConsultorButton';
import { InsightsSection } from '@/components/InsightsSection';
import { MarketingBeneficios } from '@/components/MarketingBeneficios';
import {
  resolverTextosMarketing,
  type TextosMarketingResolvidos,
} from '@/lib/textosMarketingVariaveis';
import { calcularEconomiaCO2, calcularValorizacaoImovel, CONFIG_PADRAO } from '@/utils/configuracoes';
import { Footer } from '@/components/Footer';
import { PropostaData } from '@/lib/types';
import { convertSystemsToTableData, findBestSystem, findSistemaMaiorGeracao, calculateInsights } from '@/lib/propostaUtils';
import { getPropostaBySlug } from '@/lib/supabase';
import { getLogoMetaTags } from '@/lib/logoConfig';
import PropostaPdfToolbar from '@/components/PropostaPdfToolbar';
import { abrirDialogoPdf, stripPdfToolbar } from '@/lib/propostaPdf';
import { parseTarifaKwh } from '@/lib/performanceMensalCopy';
import { resolveTemplateParaExibir } from '@/lib/propostaTemplatePolicy';

function parseTarifaFromAnalise(economiaTarifa: unknown): number | undefined {
  const n = parseTarifaKwh(economiaTarifa);
  if (!n || n <= 0) return undefined;
  // Ex.: "R$ 1.170" interpretado como 1.17
  return n > 20 ? n / 1000 : n;
}

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
  const showPdfToolbar = router.query.from === 'admin';
  const htmlPublico = htmlContent ? stripPdfToolbar(htmlContent) : htmlContent;
  
  // ✅ Tracking de Analytics (para HTML direto também)
  const trackingRef = useRef({
    startTime: Date.now(),
    primeiraVisualizacao: new Date().toISOString(),
    tempoNaPagina: 0,
    /** Segundos com a aba visível (mais fiel ao “tempo olhando”) */
    tempoAtivoAcumulado: 0,
    ativoDesde: Date.now(),
    abaVisivel: true,
    scrollMax: 0,
    cliques: 0,
    intervalId: null as NodeJS.Timeout | null
  });

  // Variantes de cor em estudo: só com ?template=xxx (lab). Produção = layout clássico (globals).
  useLayoutEffect(() => {
    const template = resolveTemplateParaExibir({
      queryTemplate: router.query.template,
      templateSalvo: templateUsado,
    });

    Array.from(document.body.classList).forEach((c) => {
      if (c.startsWith('variant-') || c === 'skin-alt') document.body.classList.remove(c);
    });
    document.documentElement.classList.remove('skin-alt');
    document.getElementById('template-css-dynamic')?.remove();
    document.getElementById('pieng-skin-alt')?.remove();

    if (!template || template === 'padrao') {
      setTemplateCss(null);
      return;
    }

    const cssMap: Record<string, string> = {
      residencial: '/styles/residencial.css',
      'residencial-premium': '/styles/residencial.css',
      rural: '/styles/rural.css',
      'rural-agro': '/styles/rural.css',
      'comercial-panificadora': '/styles/comercial-panificadora.css',
      'comercial-acougue': '/styles/comercial-acougue.css',
      'comercial-restaurante': '/styles/comercial-restaurante.css',
      'comercial-mercado': '/styles/comercial-mercado.css',
      industrial: '/styles/industrial.css',
      'industrial-premium': '/styles/industrial.css',
    };

    const cssFile = cssMap[template];
    if (!cssFile) return;

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = cssFile;
    link.id = 'template-css-dynamic';
    document.head.appendChild(link);
    setTemplateCss(cssFile);
    document.body.classList.add(`variant-${template}`);

    return () => {
      document.getElementById('template-css-dynamic')?.remove();
      document.body.classList.remove(`variant-${template}`);
    };
  }, [router.query.template, templateUsado]);

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
    trackingRef.current.startTime = startTime;
    trackingRef.current.ativoDesde = startTime;
    trackingRef.current.abaVisivel = typeof document !== 'undefined' ? document.visibilityState === 'visible' : true;

    const sessionKey = `pieng_view_${propostaSlug}`;
    let novaSessao = true;
    try {
      novaSessao = !sessionStorage.getItem(sessionKey);
      if (novaSessao) sessionStorage.setItem(sessionKey, '1');
    } catch {
      /* sessionStorage indisponível */
    }
    let sessaoJaContada = false;

    const tempoAtivoAgora = () => {
      let total = trackingRef.current.tempoAtivoAcumulado;
      if (trackingRef.current.abaVisivel) {
        total += Math.floor((Date.now() - trackingRef.current.ativoDesde) / 1000);
      }
      return Math.max(0, total);
    };

    const enviarTracking = (isFinal = false) => {
      const tempoNaPagina = Math.floor((Date.now() - startTime) / 1000);
      const tempoAtivoSegundos = tempoAtivoAgora();
      const scrollPercentage = Math.max(
        trackingRef.current.scrollMax,
        Math.round(
          ((window.scrollY || 0) /
            Math.max(1, document.documentElement.scrollHeight - window.innerHeight)) *
            100
        )
      );
      const contarSessao = novaSessao && !sessaoJaContada;
      const payload = JSON.stringify({
        tempoNaPagina,
        tempoAtivoSegundos,
        scrollPercentage,
        cliques: trackingRef.current.cliques,
        primeiraVisualizacao: trackingRef.current.primeiraVisualizacao,
        novaSessao: contarSessao,
      });

      const url = `/api/propostas/${propostaSlug}/track`;
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      })
        .then(() => {
          if (contarSessao) sessaoJaContada = true;
        })
        .catch((error) => {
          console.error('Erro ao enviar tracking:', error);
        });
    };

    const handleVisibility = () => {
      const visivel = document.visibilityState === 'visible';
      if (!visivel && trackingRef.current.abaVisivel) {
        trackingRef.current.tempoAtivoAcumulado += Math.floor(
          (Date.now() - trackingRef.current.ativoDesde) / 1000
        );
        trackingRef.current.abaVisivel = false;
        enviarTracking(false);
      } else if (visivel && !trackingRef.current.abaVisivel) {
        trackingRef.current.ativoDesde = Date.now();
        trackingRef.current.abaVisivel = true;
      }
    };

    const handleScroll = () => {
      const denom = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const scrollPercent = Math.round(((window.scrollY || 0) / denom) * 100);
      trackingRef.current.scrollMax = Math.max(trackingRef.current.scrollMax, scrollPercent);
    };

    const handleClick = () => {
      trackingRef.current.cliques++;
    };

    trackingRef.current.intervalId = setInterval(() => {
      trackingRef.current.tempoNaPagina = Math.floor((Date.now() - startTime) / 1000);
      enviarTracking(false);
    }, 15000);

    enviarTracking(false);

    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('click', handleClick);
    document.addEventListener('visibilitychange', handleVisibility);

    const handleBeforeUnload = () => {
      trackingRef.current.tempoNaPagina = Math.floor((Date.now() - startTime) / 1000);
      enviarTracking(true);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);

    return () => {
      if (trackingRef.current.intervalId) {
        clearInterval(trackingRef.current.intervalId);
      }
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('click', handleClick);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
      trackingRef.current.tempoNaPagina = Math.floor((Date.now() - startTime) / 1000);
      enviarTracking(true);
    };
  }, [slug, proposta?.slug]);

  // Se temos HTML direto, renderizar diretamente
  if (useHtmlDirect && htmlPublico) {
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
        <div
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: htmlPublico }}
        />
        {showPdfToolbar && <PropostaPdfToolbar clienteNome={slug} slug={slug} />}
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
  const sistemaMaiorGeracao = findSistemaMaiorGeracao(sistemas) || bestSystem;
  const insights = calculateInsights(sistemas);

  const marketingSalvo = (proposta as { marketing?: TextosMarketingResolvidos })?.marketing;
  const marketing: TextosMarketingResolvidos | null = (() => {
    if (marketingSalvo?.economiaAnual) return marketingSalvo;
    const cfg = (proposta as { config?: Record<string, unknown> })?.config || {};
    const econMensal =
      Number((bestSystem as { economiaMensal?: number })?.economiaMensal) ||
      parseFloat(
        String((bestSystem as { economia?: string })?.economia || '')
          .replace(/[^\d,.-]/g, '')
          .replace(',', '.')
      ) ||
      0;
    const gerMensal =
      Number((bestSystem as { geracaoMensal?: number })?.geracaoMensal) ||
      parseFloat(
        String(bestSystem?.geracao || '')
          .replace(/[^\d,.-]/g, '')
          .replace(',', '.')
      ) ||
      0;
    const payback =
      Number((bestSystem as { paybackMeses?: number })?.paybackMeses) ||
      parseFloat(String(bestSystem?.payback || '').replace(/[^\d,.-]/g, '').replace(',', '.')) ||
      0;
    const tir =
      Number((bestSystem as { tirAnual?: number })?.tirAnual) ||
      parseFloat(String(bestSystem?.tir || '').replace(/[^\d,.-]/g, '').replace(',', '.')) ||
      0;
    return resolverTextosMarketing(
      {
        textoEconomiaAnual:
          (cfg.textoEconomiaAnual as string) || CONFIG_PADRAO.textoEconomiaAnual,
        textoPayback: (cfg.textoPayback as string) || CONFIG_PADRAO.textoPayback,
        textoTIR: (cfg.textoTIR as string) || CONFIG_PADRAO.textoTIR,
        textoValorizacaoImovel:
          (cfg.textoValorizacaoImovel as string) || CONFIG_PADRAO.textoValorizacaoImovel,
        textoSustentabilidade:
          (cfg.textoSustentabilidade as string) || CONFIG_PADRAO.textoSustentabilidade,
      },
      {
        valorEconomia: Math.round(econMensal * 12).toLocaleString('pt-BR'),
        mesesPayback: payback.toFixed(1),
        percentualTIR: tir.toFixed(1),
        percentualValorizacao: calcularValorizacaoImovel(
          Number(bestSystem?.precoPixDecimal) || 0
        ),
        tonelaCO2: calcularEconomiaCO2(gerMensal * 12).toFixed(1),
      }
    );
  })();

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

      <div className={`pieng-container${sistemas.length === 1 ? ' card-unico' : ''}`}>
        <Header
          clienteNome={cliente.nome}
          clienteCidade={cliente.cidade}
          clienteConsumo={cliente.consumoKwh}
          clienteTipo={cliente.tipo}
        />

        <UrgencyBanner message={proposta?.bannerUrgencia || "Oferta especial por tempo limitado! Orçamento válido por 2 dias ou até acabar o estoque."} />

        <section className="pieng-system-grid">
          {sistemas.map((sistema, index) => (
            <SystemCard
              key={index}
              {...sistema}
              modoUnico={sistemas.length === 1}
              badge={sistemas.length === 1 ? undefined : sistema.badge}
              isRecommended={sistemas.length === 1 ? false : sistema.isRecommended}
              tarifaEnergia={
                (cliente as { tarifa?: number; tarifaEnergia?: number }).tarifa ??
                (cliente as { tarifaEnergia?: number }).tarifaEnergia ??
                parseTarifaFromAnalise(analise.economiaTarifa) ??
                (proposta as { config?: { tarifa?: number } })?.config?.tarifa
              }
              performanceRate={
                (proposta as { config?: { performanceRate?: number }; performanceRate?: number })
                  ?.config?.performanceRate ??
                (proposta as { performanceRate?: number })?.performanceRate ??
                0.78
              }
            />
          ))}
        </section>

        {sistemas.length > 1 && <ComparisonTable systems={tableData} />}

        {sistemas.length > 1 && <PerformanceChart sistemas={sistemas} />}

        <ProjecaoGeracaoChart
          potenciaKwp={(() => {
            const raw =
              sistemaMaiorGeracao?.potencia ||
              (sistemaMaiorGeracao as { potTotal?: number })?.potTotal ||
              sistemas[0]?.potencia ||
              0;
            if (typeof raw === 'number') return raw;
            const n = parseFloat(String(raw).replace(',', '.').replace(/[^\d.]/g, ''));
            return Number.isFinite(n) ? n : 0;
          })()}
          cidade={cliente.cidade}
          performanceRate={
            (proposta as { config?: { performanceRate?: number }; performanceRate?: number })
              ?.config?.performanceRate ??
            (proposta as { performanceRate?: number })?.performanceRate ??
            0.78
          }
        />

        <PaybackFioBChart
          potenciaKwp={(() => {
            const raw =
              bestSystem?.potencia ||
              (bestSystem as { potTotal?: number })?.potTotal ||
              sistemas.find((s) => s.isRecommended)?.potencia ||
              sistemas[0]?.potencia ||
              0;
            if (typeof raw === 'number') return raw;
            const n = parseFloat(String(raw).replace(',', '.').replace(/[^\d.]/g, ''));
            return Number.isFinite(n) ? n : 0;
          })()}
          investimentoPix={
            bestSystem?.precoPixDecimal ||
            sistemas.find((s) => s.isRecommended)?.precoPixDecimal ||
            sistemas[0]?.precoPixDecimal ||
            0
          }
          tarifaCheia={
            (cliente as { tarifa?: number; tarifaEnergia?: number }).tarifa ??
            (cliente as { tarifaEnergia?: number }).tarifaEnergia ??
            parseTarifaFromAnalise(analise.economiaTarifa) ??
            (proposta as { config?: { tarifa?: number } })?.config?.tarifa ??
            1.17
          }
          hsp={
            parseFloat(String(cliente.hspLocal ?? (cliente as { hsp?: number }).hsp ?? 5.3).replace(',', '.')) ||
            5.3
          }
          performanceRate={
            (proposta as { config?: { performanceRate?: number } })?.config?.performanceRate ?? 0.78
          }
          reajusteEnergiaPct={
            (proposta as { config?: { reajusteEnergia?: number } })?.config?.reajusteEnergia ?? 8.2
          }
          geracaoAnualKwh={(() => {
            const g =
              parseFloat(
                String(
                  bestSystem?.geracao ||
                    sistemas.find((s) => s.isRecommended)?.geracao ||
                    sistemas[0]?.geracao ||
                    ''
                )
                  .replace(/[^\d,.-]/g, '')
                  .replace(',', '.')
              ) || 0;
            return g > 0 ? g * 12 : undefined;
          })()}
        />

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
          modoUnico={sistemas.length === 1}
        />

        <MarketingBeneficios marketing={marketing} />

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

      {showPdfToolbar && (
        <PropostaPdfToolbar clienteNome={cliente.nome} slug={slug || proposta?.slug} />
      )}
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
