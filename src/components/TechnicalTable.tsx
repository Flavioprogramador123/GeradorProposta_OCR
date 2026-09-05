import React from 'react';
import { formatBRL } from '@/lib/formatBRL';

interface Sistema {
  titulo: string;
  potencia: string;
  especificacoes: string[];
  geracao: string;
  cobertura: string;
  payback: string;
  tir: string;
  precoPixDecimal: number;
  isRecommended?: boolean;
}

interface TechnicalTableProps {
  sistemas: Sistema[];
  clienteConsumo: string;
  hspLocal: string;
}

export const TechnicalTable: React.FC<TechnicalTableProps> = ({
  sistemas,
  clienteConsumo,
  hspLocal
}) => {
  // Extrair informações técnicas das especificações
  const extractTechnicalInfo = (sistema: Sistema) => {
    const modulos = sistema.especificacoes.find(e => e.toLowerCase().includes('módulo'))?.split(' ')[0] || '-';
    const inversores = sistema.especificacoes.find(e => e.toLowerCase().includes('inversor'))?.split(' ')[0] || '-';
    const estrutura = sistema.especificacoes.find(e => e.toLowerCase().includes('estrutura')) || '-';

    return { modulos, inversores, estrutura };
  };

  return (
    <section className="pieng-card pieng-technical-section p-8 mb-8">
      <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
        🔧 Especificações Técnicas Completas
      </h3>

      {/* Informações Gerais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-pieng-light rounded-lg">
        <div>
          <span className="text-sm text-pieng-muted">Consumo Mensal</span>
          <p className="text-lg font-bold text-pieng-dark">{clienteConsumo} kWh</p>
        </div>
        <div>
          <span className="text-sm text-pieng-muted">HSP Local (Irradiação)</span>
          <p className="text-lg font-bold text-pieng-dark">{hspLocal} h/dia</p>
        </div>
        <div>
          <span className="text-sm text-pieng-muted">Performance Ratio</span>
          <p className="text-lg font-bold text-pieng-dark">75%</p>
        </div>
      </div>

      {/* Tabela Detalhada */}
      <p className="pieng-table-scroll-hint">
        👆 Deslize na tabela ou use a barra abaixo para ver todas as colunas
      </p>
      <div className="pieng-table-scroll-shell">
        <div className="overflow-x-auto pieng-table-wrapper">
        <table className="pieng-table w-full border-collapse min-w-[720px]">
          <thead>
            <tr className="bg-gradient-to-r from-pieng-primary to-purple-600 text-white">
              <th className="p-3 text-left text-sm font-bold">Sistema</th>
              <th className="p-3 text-center text-sm font-bold">Potência</th>
              <th className="p-3 text-center text-sm font-bold">Módulos</th>
              <th className="p-3 text-center text-sm font-bold">Inversores</th>
              <th className="p-3 text-center text-sm font-bold">Geração Mensal</th>
              <th className="p-3 text-center text-sm font-bold">Cobertura</th>
              <th className="p-3 text-center text-sm font-bold">Payback</th>
              <th className="p-3 text-center text-sm font-bold">TIR</th>
              <th className="p-3 text-center text-sm font-bold">Investimento PIX</th>
            </tr>
          </thead>
          <tbody>
            {sistemas.map((sistema, index) => {
              const { modulos, inversores } = extractTechnicalInfo(sistema);
              const isRecommended = sistema.isRecommended;

              return (
                <tr
                  key={index}
                  className={`border-b border-gray-200 hover:bg-gray-50 transition-colors ${
                    isRecommended ? 'bg-green-50 font-bold' : ''
                  }`}
                >
                  <td className="p-3 text-sm">
                    <div className="flex items-center gap-2">
                      {isRecommended && <span className="text-lg">⭐</span>}
                      <span className={isRecommended ? 'text-pieng-success font-bold' : ''}>
                        {sistema.titulo}
                      </span>
                    </div>
                  </td>
                  <td className="p-3 text-center text-sm font-medium">{sistema.potencia}</td>
                  <td className="p-3 text-center text-sm">{modulos}</td>
                  <td className="p-3 text-center text-sm">{inversores}</td>
                  <td className="p-3 text-center text-sm font-medium text-pieng-primary">
                    {sistema.geracao}
                  </td>
                  <td className="p-3 text-center text-sm">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-bold ${
                        parseFloat(sistema.cobertura) >= 100
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}
                    >
                      {Math.round(parseFloat(sistema.cobertura) || 0)}%
                    </span>
                  </td>
                  <td className="p-3 text-center text-sm font-medium">{sistema.payback}</td>
                  <td className="p-3 text-center text-sm font-medium text-pieng-success">
                    {sistema.tir}
                  </td>
                  <td className="p-3 text-center text-sm font-bold text-pieng-primary">
                    {formatBRL(sistema.precoPixDecimal)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      </div>

      {/* Legendas e Notas Técnicas */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-blue-50 border-l-4 border-pieng-primary rounded">
          <h4 className="font-bold text-sm text-pieng-primary mb-2">📘 Glossário Técnico</h4>
          <ul className="text-xs text-pieng-dark space-y-1">
            <li><strong>HSP:</strong> Horas de Sol Pleno - quantidade de energia solar disponível</li>
            <li><strong>Performance Ratio:</strong> Eficiência real do sistema (perdas consideradas)</li>
            <li><strong>Cobertura:</strong> Percentual do consumo atendido pela geração solar</li>
            <li><strong>Payback:</strong> Tempo para recuperar o investimento</li>
            <li><strong>TIR:</strong> Taxa Interna de Retorno - rentabilidade anual do investimento</li>
          </ul>
        </div>

        <div className="p-4 bg-yellow-50 border-l-4 border-pieng-warning rounded">
          <h4 className="font-bold text-sm text-pieng-warning mb-2">⚠️ Observações Importantes</h4>
          <ul className="text-xs text-pieng-dark space-y-1">
            <li>✓ Geração calculada com base em HSP de {hspLocal} h/dia</li>
            <li>✓ Performance Ratio de 75% (padrão da indústria)</li>
            <li>✓ Valores consideram tarifa energética atual</li>
            <li>✓ Sistemas dimensionados conforme NBR 16690</li>
            <li>✓ Garantia de instalação de 1 ano, garantia dos módulos e inversores por 10 anos contra defeitos funcionais fornecida pelo fabricante, e garantia de desempenho linear de 25 anos para a produção de energia</li>
          </ul>
        </div>
      </div>

      {/* Detalhamento por Sistema */}
      <div className="mt-6">
        <h4 className="font-bold text-base text-pieng-dark mb-4">📋 Detalhamento Completo por Sistema</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sistemas.map((sistema, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border-2 ${
                sistema.isRecommended
                  ? 'border-pieng-success bg-green-50'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <h5 className="font-bold text-sm text-pieng-dark">{sistema.titulo}</h5>
                {sistema.isRecommended && (
                  <span className="text-xs bg-pieng-success text-white px-2 py-1 rounded-full">
                    Recomendado
                  </span>
                )}
              </div>
              <ul className="text-xs space-y-1">
                {sistema.especificacoes.map((spec, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-pieng-success mt-0.5">✓</span>
                    <span className="text-pieng-muted">{spec}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
