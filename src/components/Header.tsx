import React from 'react';
import Image from 'next/image';
import { getFaviconLogo } from '@/lib/logoConfig';

export type HeaderProps = {
  clienteNome?: string;
  clienteCidade?: string;
  clienteConsumo?: string | number;
  clienteTipo?: string;
};

const Header = ({
  clienteNome,
  clienteCidade,
  clienteConsumo,
  clienteTipo,
}: HeaderProps) => {
  const logoPath = getFaviconLogo();
  const temCliente = Boolean(clienteNome && String(clienteNome).trim());
  const meta = [
    clienteCidade,
    clienteConsumo != null && String(clienteConsumo).trim() !== ''
      ? `${clienteConsumo} kWh/mês`
      : null,
    clienteTipo,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <header className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-b from-white via-slate-50 to-sky-50/70">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-sky-600 via-emerald-500 to-amber-400" />

      <div className="mx-auto flex max-w-5xl flex-col items-center px-4 pb-5 pt-6 text-center sm:px-6 sm:pb-7 sm:pt-8">
        {/* Logo grande — mobile e desktop */}
        <div className="relative mb-3 h-24 w-24 sm:mb-4 sm:h-32 sm:w-32 md:h-36 md:w-36">
          <Image
            src={logoPath}
            alt="PIENG Soluções Energéticas"
            fill
            className="object-contain drop-shadow-md"
            sizes="(max-width: 640px) 96px, (max-width: 768px) 128px, 144px"
            priority
          />
        </div>

        <h1 className="text-xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-2xl md:text-3xl">
          PIENG Soluções Energéticas
        </h1>
        <p className="mt-1 text-sm text-slate-500 sm:text-base">
          Proposta solar personalizada
        </p>

        {/* Nome do cliente — abaixo da marca (não só no título da aba) */}
        {temCliente ? (
          <div className="mt-4 w-full max-w-xl rounded-2xl border border-sky-100 bg-white px-4 py-3 shadow-sm sm:mt-5 sm:px-6 sm:py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 sm:text-[11px]">
              Preparada para
            </p>
            <p className="mt-1 text-lg font-bold leading-snug tracking-tight text-slate-800 sm:text-xl md:text-2xl">
              {clienteNome}
            </p>
            {meta ? (
              <p className="mt-2 text-sm text-slate-600 sm:text-base">{meta}</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </header>
  );
};

export default Header;
