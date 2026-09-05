import '../styles/globals.css';
import '../styles/admin-themes.css';
import type { AppProps } from 'next/app';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { getFaviconLogo, getLogoMimeType } from '@/lib/logoConfig';
import { AdminThemeProvider } from '@/components/AdminThemeProvider';

function usesAdminTheme(pathname: string): boolean {
  return (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/gerador-rapido')
  );
}

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const faviconPath = getFaviconLogo();
  const faviconMimeType = getLogoMimeType(faviconPath);
  const themed = usesAdminTheme(router.pathname || '');

  const page = <Component {...pageProps} />;

  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="description" content="PIENG Soluções Energéticas - Propostas solares personalizadas com mais de 35 anos de experiência" />
        <meta name="keywords" content="energia solar, proposta solar, PIENG, sistema fotovoltaico" />
        <link rel="icon" href={faviconPath} type={faviconMimeType} />
        <link rel="apple-touch-icon" href={faviconPath} />
        <meta name="theme-color" content="#1E3A8A" />
      </Head>
      {themed ? <AdminThemeProvider>{page}</AdminThemeProvider> : page}
    </>
  );
}
