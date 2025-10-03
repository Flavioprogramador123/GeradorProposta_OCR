import React from 'react';

interface CTASectionProps {
  empresaContato: string;
  empresaEmail: string;
  whatsappNumber?: string;
}

export const CTASection: React.FC<CTASectionProps> = ({
  empresaContato,
  empresaEmail,
  whatsappNumber = '5562991670536'
}) => {
  return (
    <section className="pieng-card p-8 mb-8 text-center">
      <h3 className="text-xl font-bold mb-4 flex items-center justify-center gap-2">
        🚀 Próximos Passos
      </h3>
      <p className="text-base mb-6 text-pieng-muted">
        Transforme sua relação com a energia elétrica hoje mesmo!
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <a 
          href={`tel:${empresaContato}`}
          className="pieng-button-primary block"
        >
          <div className="text-lg">📞 Ligar Agora</div>
          <div className="text-sm opacity-80">{empresaContato}</div>
        </a>
        
        <a 
          href={`https://wa.me/${whatsappNumber}`}
          target="_blank"
          rel="noopener noreferrer"
          className="pieng-button-primary block"
        >
          <div className="text-lg">💬 WhatsApp</div>
          <div className="text-sm opacity-80">Resposta imediata</div>
        </a>
        
        <a 
          href={`mailto:${empresaEmail}`}
          className="pieng-button-primary block"
        >
          <div className="text-lg">✉️ E-mail</div>
          <div className="text-sm opacity-80">{empresaEmail}</div>
        </a>
      </div>
    </section>
  );
};