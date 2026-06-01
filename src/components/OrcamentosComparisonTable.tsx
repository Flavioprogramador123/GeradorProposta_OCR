import React from 'react';
import { ConsultorConfig } from '@/hooks/useConsultorConfig';
import {
  calcularPdespesaProposta,
  calcularPerformanceProposta,
  calcularPrecosProposta,
  normalizePropostaConfig,
} from '@/lib/propostaOrcamentoProcessor';

interface OrcamentoComparativo {
  id: string;
  nome: string;
  fornecedor: string;
  pcusto: number;
  modulos: number;
  pot_modulo: number;
  marca_modulo: string;
  inversores: number;
  pot_inv: number;
  marca_inversor: string;
  status: 'pendente' | 'analisando' | 'aprovado' | 'rejeitado';
}

interface OrcamentosComparisonTableProps {
  orcamentos: OrcamentoComparativo[];
  config: ConsultorConfig;
  onOrcamentoUpdate: (id: string, updates: Partial<OrcamentoComparativo>) => void;
  onOrcamentoDelete: (id: string) => void;
  onBulkAction: (action: 'aprovar' | 'rejeitar', ids: string[]) => void;
}

export default function OrcamentosComparisonTable({ 
  orcamentos, 
  config, 
  onOrcamentoUpdate, 
  onOrcamentoDelete,
  onBulkAction 
}: OrcamentosComparisonTableProps) {
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);

  const cfgNorm = normalizePropostaConfig(config);
  const calcularPdespesa = (pcusto: number) => calcularPdespesaProposta(pcusto, cfgNorm);

  const calcularPrecos = (totalFinal: number) => {
    const precos = calcularPrecosProposta(totalFinal, cfgNorm);
    return {
      ppix: precos.ppix,
      p12x: precos.p12x,
      p18x_parcela: precos.p18x_parcela,
      p12x_total: precos.p12x_total,
      p18x_total: precos.p18x_total,
    };
  };

  const calcularPerformance = (potenciaKw: number, investimentoPix: number) => {
    const perf = calcularPerformanceProposta(potenciaKw, cfgNorm, investimentoPix);
    return {
      geracaoMensal: perf.geracaoMensal,
      economiaMensal: perf.economiaMensal,
      paybackMeses: perf.paybackMeses,
      tirAnual: perf.tirAnual,
    };
  };

  // Calcular qual sistema tem o melhor payback
  const calcularMelhorPayback = () => {
    if (orcamentos.length === 0) return null;
    
    let melhorIndex = 0;
    let melhorPayback = Infinity;
    
    orcamentos.forEach((orc, index) => {
      const potenciaTotal = (orc.modulos * orc.pot_modulo) / 1000;
      const pdespesaTotal = calcularPdespesa(orc.pcusto);
      const totalFinal = orc.pcusto + pdespesaTotal;
      const precos = calcularPrecos(totalFinal);
      const performance = calcularPerformance(potenciaTotal, precos.ppix);
      
      if (performance.paybackMeses < melhorPayback && performance.paybackMeses > 0) {
        melhorPayback = performance.paybackMeses;
        melhorIndex = index;
      }
    });
    
    return melhorIndex;
  };

  const melhorPaybackIndex = calcularMelhorPayback();

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(selectedId => selectedId !== id)
        : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedIds(orcamentos.map(o => o.id));
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  const handleBulkAction = (action: 'aprovar' | 'rejeitar') => {
    onBulkAction(action, selectedIds);
    setSelectedIds([]);
  };

  if (orcamentos.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8 text-center">
        <div className="text-6xl mb-4">📊</div>
        <h3 className="text-xl font-semibold text-gray-800 mb-2">Nenhum orçamento para comparar</h3>
        <p className="text-gray-600">Adicione orçamentos para ver a tabela comparativa</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold text-gray-800">
          🗂️ Tabela Comparativa ({orcamentos.length}) - Controle do Consultor
        </h3>
        
        {selectedIds.length > 0 && (
          <div className="flex gap-2">
            <button
              onClick={() => handleBulkAction('aprovar')}
              className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
            >
              ✅ Aprovar Selecionados ({selectedIds.length})
            </button>
            <button
              onClick={() => handleBulkAction('rejeitar')}
              className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
            >
              ❌ Rejeitar Selecionados ({selectedIds.length})
            </button>
            <button
              onClick={clearSelection}
              className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
            >
              🗑️ Limpar Seleção
            </button>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-blue-50">
              <th className="border border-gray-300 px-2 py-2 text-xs font-bold text-gray-700">
                <input
                  type="checkbox"
                  checked={selectedIds.length === orcamentos.length}
                  onChange={selectedIds.length === orcamentos.length ? clearSelection : selectAll}
                  className="mr-1"
                  title="Selecionar todos os orçamentos"
                />
                Sel
              </th>
              <th className="border border-gray-300 px-2 py-2 text-xs font-bold text-gray-700">Nº</th>
              <th className="border border-gray-300 px-3 py-2 text-xs font-bold text-gray-700">Nome/Origem</th>
              <th className="border border-gray-300 px-2 py-2 text-xs font-bold text-gray-700">Status</th>
              <th className="border border-gray-300 px-2 py-2 text-xs font-bold text-gray-700">Fornecedor</th>
              <th className="border border-gray-300 px-2 py-2 text-xs font-bold text-gray-700">P.Custo (R$)</th>
              <th className="border border-gray-300 px-2 py-2 text-xs font-bold text-gray-700">Pdespesa (R$)</th>
              <th className="border border-gray-300 px-2 py-2 text-xs font-bold text-gray-700">Total (R$)</th>
              <th className="border border-gray-300 px-2 py-2 text-xs font-bold text-gray-700">Potência (kWp)</th>
              <th className="border border-gray-300 px-2 py-2 text-xs font-bold text-gray-700">PIX (R$)</th>
              <th className="border border-gray-300 px-2 py-2 text-xs font-bold text-gray-700">12x (R$)</th>
              <th className="border border-gray-300 px-2 py-2 text-xs font-bold text-gray-700">18x (R$)</th>
              <th className="border border-gray-300 px-2 py-2 text-xs font-bold text-gray-700">Payback</th>
              <th className="border border-gray-300 px-2 py-2 text-xs font-bold text-gray-700">TIR</th>
              <th className="border border-gray-300 px-2 py-2 text-xs font-bold text-gray-700">Ações</th>
            </tr>
          </thead>
          <tbody>
            {orcamentos.map((orc, index) => {
              const potenciaTotal = (orc.modulos * orc.pot_modulo) / 1000;
              const pdespesaTotal = calcularPdespesa(orc.pcusto);
              const totalFinal = orc.pcusto + pdespesaTotal;
              const precos = calcularPrecos(totalFinal);
              const performance = calcularPerformance(potenciaTotal, precos.ppix);

              return (
                <tr key={orc.id} className="hover:bg-gray-50">
                  {/* Seleção */}
                  <td className="border border-gray-300 px-2 py-1 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(orc.id)}
                      onChange={() => toggleSelect(orc.id)}
                      title={`Selecionar orçamento ${orc.nome}`}
                    />
                  </td>

                  {/* Número */}
                  <td className="border border-gray-300 px-2 py-1 text-center text-sm font-bold">
                    <div className="flex items-center justify-center gap-1">
                      {melhorPaybackIndex === index && (
                        <span className="text-yellow-500 text-lg" title="⭐ MELHOR PAYBACK">
                          ⭐
                        </span>
                      )}
                      <span>{index + 1}</span>
                    </div>
                  </td>

                  {/* Nome/Origem */}
                  <td className="border border-gray-300 px-1 py-1">
                    <input
                      type="text"
                      value={orc.nome}
                      onChange={(e) => onOrcamentoUpdate(orc.id, { nome: e.target.value })}
                      className="w-full px-1 py-1 text-xs border-0 focus:ring-1 focus:ring-blue-500 bg-transparent"
                      title="Nome do sistema/orçamento"
                    />
                  </td>

                  {/* Status */}
                  <td className="border border-gray-300 px-1 py-1">
                    <select
                      value={orc.status}
                      onChange={(e) => onOrcamentoUpdate(orc.id, { status: e.target.value as any })}
                      className={`w-full px-1 py-1 text-xs border-0 focus:ring-1 focus:ring-blue-500 bg-transparent ${
                        orc.status === 'aprovado' ? 'text-green-600 font-semibold' :
                        orc.status === 'rejeitado' ? 'text-red-600 font-semibold' :
                        orc.status === 'analisando' ? 'text-yellow-600 font-semibold' :
                        'text-gray-600'
                      }`}
                      title="Status do orçamento"
                    >
                      <option value="pendente">Pendente</option>
                      <option value="analisando">Analisando</option>
                      <option value="aprovado">Aprovado</option>
                      <option value="rejeitado">Rejeitado</option>
                    </select>
                  </td>

                  {/* Fornecedor */}
                  <td className="border border-gray-300 px-1 py-1">
                    <select
                      value={orc.fornecedor}
                      onChange={(e) => onOrcamentoUpdate(orc.id, { fornecedor: e.target.value })}
                      className="w-full px-1 py-1 text-xs border-0 focus:ring-1 focus:ring-blue-500 bg-transparent"
                      title="Fornecedor do sistema"
                    >
                      <option value="SOOLLAR">SOOLLAR</option>
                      <option value="BELENERGY">BELENERGY</option>
                      <option value="FORTLEV">FORTLEV</option>
                      <option value="BELSKY">BELSKY</option>
                      <option value="SOLFACIL">SOLFACIL</option>
                      <option value="ECOSOLYS">ECOSOLYS</option>
                    </select>
                  </td>

                  {/* P.Custo */}
                  <td className="border border-gray-300 px-1 py-1">
                    <input
                      type="number"
                      step="0.01"
                      value={orc.pcusto}
                      onChange={(e) => onOrcamentoUpdate(orc.id, { pcusto: Number(e.target.value) })}
                      className="w-20 px-1 py-1 text-xs border-0 focus:ring-1 focus:ring-blue-500 bg-transparent text-right"
                      title="Preço de custo do sistema"
                    />
                  </td>

                  {/* Pdespesa (calculada) */}
                  <td className="border border-gray-300 px-2 py-1 text-xs text-right font-semibold bg-yellow-50">
                    <div className="flex flex-col">
                      <span className="font-bold text-orange-600">
                        R$ {pdespesaTotal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                      </span>
                      <span className="text-xs text-gray-500">
                        ({config.pdespesaFixo.toLocaleString('pt-BR')} + {config.pdespesaVariavel}%)
                      </span>
                    </div>
                  </td>

                  {/* Total (calculado) */}
                  <td className="border border-gray-300 px-2 py-1 text-xs text-right font-semibold bg-green-50">
                    <span className="font-bold text-green-600">
                      R$ {totalFinal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                    </span>
                  </td>

                  {/* Potência (calculada) */}
                  <td className="border border-gray-300 px-2 py-1 text-xs text-center font-semibold bg-blue-50">
                    <span className="font-bold text-blue-600">
                      {potenciaTotal.toFixed(2)} kWp
                    </span>
                  </td>

                  {/* PIX */}
                  <td className="border border-gray-300 px-2 py-1 text-xs text-right font-semibold bg-green-50">
                    <span className="font-bold text-green-600">
                      R$ {precos.ppix.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                    </span>
                  </td>

                  {/* 12x */}
                  <td className="border border-gray-300 px-2 py-1 text-xs text-right">
                    <div className="flex flex-col">
                      <span className="font-semibold">R$ {precos.p12x.toFixed(2)}</span>
                      <span className="text-xs text-gray-500">por mês</span>
                    </div>
                  </td>

                  {/* 18x */}
                  <td className="border border-gray-300 px-2 py-1 text-xs text-right">
                    <div className="flex flex-col">
                      <span className="font-semibold">R$ {precos.p18x_parcela.toFixed(2)}</span>
                      <span className="text-xs text-gray-500">por mês</span>
                    </div>
                  </td>

                  {/* Payback */}
                  <td className="border border-gray-300 px-2 py-1 text-xs text-center">
                    <span className="font-semibold">
                      {performance.paybackMeses.toFixed(1)} meses
                    </span>
                  </td>

                  {/* TIR */}
                  <td className="border border-gray-300 px-2 py-1 text-xs text-center">
                    <span className="font-semibold">
                      {performance.tirAnual.toFixed(1)}%
                    </span>
                  </td>

                  {/* Ações */}
                  <td className="border border-gray-300 px-2 py-1 text-center">
                    <button
                      onClick={() => onOrcamentoDelete(orc.id)}
                      className="text-red-600 hover:text-red-800 p-1"
                      title="Excluir orçamento"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
        📝 <strong>Tabela com Cálculos Automáticos em Tempo Real:</strong>
        <br />• Modifique qualquer campo diretamente na tabela
        <br />• <strong>Pdespesa</strong> = Calculada automaticamente: <span className="font-mono bg-white px-1 rounded">Fixo + (Variável% × P.Custo)</span>
        <br />• <strong>Total</strong> = P.Custo + Pdespesa (valor base para cálculos financeiros)
        <br />• <strong>Preços e Performance</strong> = Atualizados automaticamente conforme configurações do consultor
        <br />• <strong>Colunas coloridas</strong> = Valores calculados automaticamente
      </div>
    </div>
  );
}
