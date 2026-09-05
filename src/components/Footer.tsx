import React from 'react';
import Image from 'next/image';
import { getFaviconLogo } from '@/lib/logoConfig';

interface FooterProps {
  empresaContato: string;
  empresaEmail: string;
  empresaSite: string;
  clienteCidade: string;
  hspLocal: string;
  economiaTarifa: string;
  clienteTipo: string;
  dataValidade: string;
  dataGeracao: string;
}

export const Footer: React.FC<FooterProps> = ({
  empresaContato,
  empresaEmail,
  empresaSite,
  clienteCidade,
  hspLocal,
  economiaTarifa,
  clienteTipo,
  dataValidade,
  dataGeracao
}) => {
  const logoPath = getFaviconLogo();
  
  return (
    <footer className="pieng-footer">
      <div className="pieng-footer-grid text-left">
        <div>
          <div className="flex items-center space-x-2 mb-3">
            <div className="relative w-12 h-12 flex-shrink-0">
              <Image
                src={logoPath}
                alt="PIENG Soluções Energéticas"
                fill
                className="object-contain"
              />
            </div>
            <strong className="block text-lg">PIENG Soluções Energéticas</strong>
          </div>
          <div className="text-sm space-y-1 opacity-90">
            <div>35+ anos de experiência</div>
            <div>Especialistas em sistemas elétricos de potência</div>
            <div>Base operacional: Anápolis/GO</div>
          </div>
        </div>
        
        <div>
          <strong className="block text-lg mb-3">Contatos</strong>
          <div className="text-sm space-y-1 opacity-90">
            <div>📞 {empresaContato}</div>
            <div>✉️ {empresaEmail}</div>
            <div>🌐 {empresaSite}</div>
          </div>
        </div>
        
        <div>
          <strong className="block text-lg mb-3">Certificações</strong>
          <div className="text-sm space-y-1 opacity-90">
            <div>✅ INMETRO</div>
            <div>✅ Projeto aprovado pela concessionária</div>
            <div>✅ Conformidade ANEEL</div>
          </div>
        </div>
      </div>
      
      <div className="mt-5 pt-5 border-t border-gray-600 text-xs opacity-80 leading-relaxed">
        <strong>Disclaimers Técnicos:</strong><br />
        • Performance Rate: 75% conforme padrões da indústria (variação real: 72% a 80% dependendo das condições)<br />
        • Base legal: Lei 14.300/2022 sobre TUSD • Simultaneidade residencial: 30% (variação ±10%)<br />
        • HSP {clienteCidade}: {hspLocal} (fonte: CRESESB/INPE) • Economia considerando tarifa {economiaTarifa}/kWh para {clienteTipo}<br />
        • Orçamento válido por 2 dias ou até acabar o estoque • Equipamentos sujeitos à disponibilidade<br /><br />
        
        <em>Proposta gerada em {dataGeracao} • Válida por 2 dias ou até acabar o estoque • Sujeita à análise técnica do local</em>
      </div>
    </footer>
  );
};