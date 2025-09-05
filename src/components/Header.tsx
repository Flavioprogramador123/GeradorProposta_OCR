import React from 'react';
import { PiengLogo } from './PiengLogo';

interface HeaderProps {
  clienteNome: string;
  clienteCidade: string;
  clienteConsumo: string;
  clienteTipo: string;
}

export const Header: React.FC<HeaderProps> = ({
  clienteNome,
  clienteCidade,
  clienteConsumo,
  clienteTipo
}) => {
  return (
    <header className="pieng-card p-8 mb-5 text-center">
      <PiengLogo />
      
      <div className="text-2xl font-bold text-pieng-primary mb-3">
        PIENG Soluções Energéticas
      </div>
      
      <div className="text-base text-pieng-muted mb-5">
        35+ anos de experiência em sistemas elétricos de potência
      </div>
      
      <div className="bg-pieng-light p-4 rounded-lg text-sm text-pieng-dark mt-4">
        <strong>Cliente:</strong> {clienteNome} | {' '}
        <strong>Cidade:</strong> {clienteCidade} | {' '}
        <strong>Consumo:</strong> {clienteConsumo} kWh/mês | {' '}
        <strong>Tipo:</strong> {clienteTipo}
      </div>
    </header>
  );
};