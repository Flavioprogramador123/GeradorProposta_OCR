import React from 'react';

interface SystemData {
  nome: string;
  potencia: string;
  pix: string;
  parcela12x: string;
  parcela18x: string;
  geracao: string;
  payback: string;
  tir: string;
  isRecommended?: boolean;
}

interface ComparisonTableProps {
  systems: SystemData[];
}

export const ComparisonTable: React.FC<ComparisonTableProps> = ({ systems }) => {
  return (
    <section className="pieng-card p-6 mb-8">
      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
        📊 Comparação Detalhada dos Sistemas
      </h3>
      
      <div className="overflow-x-auto">
        <table className="pieng-table">
          <thead>
            <tr>
              <th>Sistema</th>
              <th>Potência</th>
              <th>PIX</th>
              <th>12x S/Juros</th>
              <th>18x Cartão</th>
              <th>Geração/Mês</th>
              <th>Payback</th>
              <th>TIR</th>
            </tr>
          </thead>
          <tbody>
            {systems.map((system, index) => (
              <tr key={index} className={system.isRecommended ? 'pieng-table-recommended' : ''}>
                <td className="font-semibold">{system.nome}</td>
                <td>{system.potencia}</td>
                <td className="font-bold text-pieng-primary">{system.pix}</td>
                <td>{system.parcela12x}</td>
                <td>{system.parcela18x}</td>
                <td>{system.geracao}</td>
                <td className="font-bold text-pieng-success">{system.payback}</td>
                <td className="font-bold text-pieng-secondary">{system.tir}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};