import React from 'react';

interface InsightItem {
  title: string;
  content: string;
  icon: string;
}

interface InsightsSectionProps {
  paybackMin: string;
  paybackMax: string;
  melhorSistemaNome: string;
  melhorSistemaPotencia: string;
  melhorSistemaPix: string;
  melhorSistemaPayback: string;
  geracaoMax: string;
  clienteConsumo: string;
  hspLocal: string;
  clienteCidade: string;
  economiaTarifa: string;
  tirMax: string;
  clienteNome: string;
}

export const InsightsSection: React.FC<InsightsSectionProps> = ({
  paybackMin,
  paybackMax,
  melhorSistemaNome,
  melhorSistemaPotencia,
  melhorSistemaPix,
  melhorSistemaPayback,
  geracaoMax,
  clienteConsumo,
  hspLocal,
  clienteCidade,
  economiaTarifa,
  tirMax,
  clienteNome
}) => {
  const insights: InsightItem[] = [
    {
      icon: '💰',
      title: 'Payback Excepcional',
      content: `Com payback entre ${paybackMin} e ${paybackMax} meses, você recupera seu investimento rapidamente, gerando economia pura por mais de 23 anos da vida útil do sistema.`
    },
    {
      icon: '🏆',
      title: 'Sistema Recomendado',
      content: `O ${melhorSistemaNome} de ${melhorSistemaPotencia} oferece o melhor payback com ${melhorSistemaPix} no PIX e retorno em apenas ${melhorSistemaPayback}, ideal para maximizar seu investimento.`
    },
    {
      icon: '⚡',
      title: 'Cobertura Completa',
      content: `Com até ${geracaoMax} de geração para seu consumo de ${clienteConsumo} kWh/mês, você pode zerar sua conta de energia e ainda ter créditos na distribuidora.`
    },
    {
      icon: '🌍',
      title: 'Cenário Energético Local',
      content: `Com HSP de ${hspLocal} em ${clienteCidade} e economia real de ${economiaTarifa}/kWh, as condições são ideais para energia solar com TIR de até ${tirMax} ao ano.`
    },
    {
      icon: '📈',
      title: 'Proteção contra Inflação Energética',
      content: 'Enquanto a energia elétrica sofre reajustes anuais, seu sistema solar mantém custos fixos, protegendo seu orçamento por décadas.'
    },
    {
      icon: '🔒',
      title: 'Investimento Seguro',
      content: `Tecnologia consolidada, garantias extensas e retorno garantido fazem da energia solar o investimento mais seguro para ${clienteNome}.`
    }
  ];

  return (
    <section className="pieng-card p-8 mb-8">
      <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
        🎯 Análise Estratégica Personalizada
      </h3>
      
      <div className="pieng-insights-grid">
        {insights.map((insight, index) => (
          <div key={index} className="pieng-insight-item">
            <div className="text-base font-bold text-pieng-primary mb-3 flex items-center gap-2">
              <span>{insight.icon}</span>
              {insight.title}
            </div>
            <p className="text-sm leading-relaxed">{insight.content}</p>
          </div>
        ))}
      </div>
    </section>
  );
};