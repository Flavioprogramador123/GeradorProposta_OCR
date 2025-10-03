import '../styles/globals.css';
import type { AppProps } from 'next/app';
import Head from 'next/head';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="description" content="PIENG Soluções Energéticas - Propostas solares personalizadas com mais de 35 anos de experiência" />
        <meta name="keywords" content="energia solar, proposta solar, PIENG, sistema fotovoltaico" />
        <link rel="icon" href="/assets/logos/logo-pieng-principal.jpg" type="image/jpeg" />
        <link rel="apple-touch-icon" href="/assets/logos/logo-pieng-principal.jpg" />
        <meta name="theme-color" content="#3366CC" />
      </Head>
      <Component {...pageProps} />
    </>
  );
}