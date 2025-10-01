import React from 'react';

interface ConsultorButtonProps {
  whatsappNumber: string;
  empresaContato: string;
  empresaEmail: string;
  clienteNome: string;
  melhorSistemaNome?: string;
}

export const ConsultorButton: React.FC<ConsultorButtonProps> = ({
  whatsappNumber,
  empresaContato,
  empresaEmail,
  clienteNome,
  melhorSistemaNome
}) => {
  const mensagem = melhorSistemaNome
    ? `Olá! Gostaria de mais informações sobre a proposta solar para ${clienteNome}. Tenho interesse no ${melhorSistemaNome}.`
    : `Olá! Gostaria de mais informações sobre a proposta solar para ${clienteNome}.`;

  const whatsappLink = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(mensagem)}`;

  return (
    <div className="pieng-card p-8 mb-8">
      <div className="text-center">
        <div className="mb-4">
          <span className="text-4xl">💬</span>
        </div>

        <h3 className="text-2xl font-bold mb-2 text-pieng-dark">
          Fale com Nosso Consultor Especializado
        </h3>

        <p className="text-base text-pieng-muted mb-6 max-w-2xl mx-auto">
          Tire suas dúvidas, personalize sua proposta e descubra as melhores condições de pagamento.
          Nossos especialistas estão prontos para ajudar você a economizar com energia solar!
        </p>

        <div className="flex flex-col md:flex-row gap-4 justify-center items-center">
          {/* Botão WhatsApp Principal */}
          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative inline-flex items-center justify-center gap-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-4 px-8 rounded-full shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
          >
            <svg
              className="w-6 h-6 animate-pulse"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            <span className="text-lg">Falar com Consultor</span>
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
          </a>

          {/* Botão Telefone */}
          <a
            href={`tel:${empresaContato}`}
            className="inline-flex items-center justify-center gap-3 bg-gradient-to-r from-pieng-primary to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-4 px-8 rounded-full shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <span>{empresaContato}</span>
          </a>

          {/* Botão E-mail */}
          <a
            href={`mailto:${empresaEmail}`}
            className="inline-flex items-center justify-center gap-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold py-4 px-8 rounded-full shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span>E-mail</span>
          </a>
        </div>

        {/* Benefícios de falar com consultor */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 text-sm">
          <div className="flex items-start gap-3 p-4 bg-pieng-light rounded-lg">
            <span className="text-2xl">🎯</span>
            <div className="text-left">
              <strong className="block text-pieng-dark">Proposta Personalizada</strong>
              <span className="text-pieng-muted">Ajustamos o sistema para suas necessidades exatas</span>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-pieng-light rounded-lg">
            <span className="text-2xl">💰</span>
            <div className="text-left">
              <strong className="block text-pieng-dark">Melhores Condições</strong>
              <span className="text-pieng-muted">Negociamos descontos e prazos especiais</span>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-pieng-light rounded-lg">
            <span className="text-2xl">⚡</span>
            <div className="text-left">
              <strong className="block text-pieng-dark">Atendimento Rápido</strong>
              <span className="text-pieng-muted">Resposta imediata via WhatsApp</span>
            </div>
          </div>
        </div>

        {/* Badge de disponibilidade */}
        <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-full text-sm text-green-700">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          <span className="font-medium">Consultor disponível agora</span>
        </div>
      </div>
    </div>
  );
};
