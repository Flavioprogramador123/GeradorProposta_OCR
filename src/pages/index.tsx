import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { PiengLogo } from '@/components/PiengLogo';

export default function HomePage() {
  return (
    <>
      <Head>
        <title>PIENG - Sistema de Propostas Solares</title>
        <meta name="description" content="Sistema moderno de propostas solares da PIENG Soluções Energéticas" />
      </Head>

      <div className="pieng-container min-h-screen flex items-center justify-center">
        <div className="pieng-card p-10 text-center max-w-md">
          <PiengLogo variant="main" size="lg" className="mb-6" />
          
          <h1 className="text-3xl font-bold text-pieng-primary mb-4">
            Sistema de Propostas Solares
          </h1>
          
          <p className="text-pieng-muted mb-8">
            Geração moderna e escalável de propostas personalizadas
          </p>
          
          <div className="space-y-4">
            <Link 
              href="/admin" 
              legacyBehavior
            ><a className="pieng-button-primary block">
              🔧 Área Administrativa
            </a></Link>
            
            <Link 
              href="/proposta/exemplo" 
              legacyBehavior
            ><a className="pieng-button-secondary block">
              👁️ Ver Exemplo de Proposta
            </a></Link>
          </div>
          
          <div className="mt-8 text-xs text-pieng-muted">
            <p>PIENG Soluções Energéticas</p>
            <p>35+ anos de experiência</p>
          </div>
        </div>
      </div>
    </>
  );
}