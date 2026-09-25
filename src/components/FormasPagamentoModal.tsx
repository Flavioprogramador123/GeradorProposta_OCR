import React, { useEffect, useMemo, useState } from 'react';
import { formatBRL } from '@/lib/formatBRL';
import {
  PARCELAS_REFERENCIA_AVISTA,
  buildTabelaCartao,
  calcularParcelamentoCartao,
  condicoesCartao,
  opcoesSeletorCartao,
  parcelasDisponiveis,
  type TabelaCartao,
} from '@/lib/tabelaJurosCartao';

interface FormasPagamentoModalProps {
  open: boolean;
  pix: number;
  onClose: () => void;
  /**
   * Tabela da maquininha vigente (Ton/PagSeguro).
   * Sem ela, cai no fallback calibrado.
   */
  tabela?: TabelaCartao;
  /** Juros % por parcela (alternativa a `tabela`) */
  jurosParcelaPercent?: Record<number, number> | null;
}

export const FormasPagamentoModal: React.FC<FormasPagamentoModalProps> = ({
  open,
  pix,
  onClose,
  tabela,
  jurosParcelaPercent,
}) => {
  const [entrada, setEntrada] = useState(0);
  const [parcelas, setParcelas] = useState(PARCELAS_REFERENCIA_AVISTA);
  const [mostrarTodas, setMostrarTodas] = useState(false);

  const tabelaCartao = useMemo<TabelaCartao>(() => {
    if (tabela) return tabela;
    if (jurosParcelaPercent && Object.keys(jurosParcelaPercent).length) {
      return buildTabelaCartao({ tonTotais: jurosParcelaPercent });
    }
    return buildTabelaCartao();
  }, [tabela, jurosParcelaPercent]);

  const opcoes = useMemo(
    () => (mostrarTodas ? parcelasDisponiveis(tabelaCartao) : opcoesSeletorCartao(tabelaCartao)),
    [tabelaCartao, mostrarTodas]
  );

  useEffect(() => {
    if (!open) return;
    setEntrada(0);
    setParcelas(PARCELAS_REFERENCIA_AVISTA);
    setMostrarTodas(false);
  }, [open, pix]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const pixSafe = Math.max(0, Number(pix) || 0);
  const entradaSafe = Math.min(Math.max(0, entrada), pixSafe);
  const financiado = Math.max(0, pixSafe - entradaSafe);

  const selecionado = useMemo(
    () =>
      financiado > 0
        ? calcularParcelamentoCartao(financiado, parcelas, tabelaCartao)
        : null,
    [financiado, parcelas, tabelaCartao]
  );

  const linhasTabela = useMemo(
    () => (financiado > 0 ? condicoesCartao(financiado, tabelaCartao) : []),
    [financiado, tabelaCartao]
  );

  const tabelaVisivel = useMemo(() => {
    if (!linhasTabela.length) return [];
    if (mostrarTodas) return linhasTabela;
    const destaques = new Set(opcoesSeletorCartao(tabelaCartao));
    return linhasTabela.filter((row) => destaques.has(row.parcelas));
  }, [linhasTabela, mostrarTodas, tabelaCartao]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/55 p-4 no-print"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white rounded-2xl max-w-[520px] w-full max-h-[90vh] overflow-auto shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pieng-pay-title-react"
      >
        <header className="px-4 py-4 border-b border-gray-200 flex justify-between items-center gap-3">
          <h3 id="pieng-pay-title-react" className="m-0 text-base font-semibold text-slate-900">
            Outras formas de pagamento
          </h3>
          <button
            type="button"
            className="border-0 bg-slate-100 rounded-lg px-2.5 py-1.5 cursor-pointer text-sm"
            onClick={onClose}
          >
            Fechar
          </button>
        </header>

        <div className="p-4">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-3 text-sm leading-relaxed">
            <div>
              <strong>Valor PIX:</strong> {formatBRL(pixSafe)}
            </div>
            <div>
              <strong>Entrada:</strong> {formatBRL(entradaSafe)}
            </div>
            <div>
              <strong>Restante a parcelar:</strong> {formatBRL(financiado)}
            </div>
          </div>

          <div className="flex flex-col gap-1.5 mb-3">
            <label htmlFor="pieng-pay-entrada-react" className="text-xs text-slate-500 font-semibold">
              Entrada (R$)
            </label>
            <input
              id="pieng-pay-entrada-react"
              type="number"
              min={0}
              step={100}
              value={entrada}
              className="border border-slate-300 rounded-lg px-3 py-2.5 text-base"
              onChange={(e) => setEntrada(Number(e.target.value) || 0)}
            />
          </div>

          <div className="flex flex-col gap-1.5 mb-3">
            <label htmlFor="pieng-pay-parcelas-react" className="text-xs text-slate-500 font-semibold">
              Parcelas do restante (cartão)
            </label>
            <select
              id="pieng-pay-parcelas-react"
              value={parcelas}
              className="border border-slate-300 rounded-lg px-3 py-2.5 text-base"
              onChange={(e) => setParcelas(Number(e.target.value) || PARCELAS_REFERENCIA_AVISTA)}
            >
              {opcoes.map((n) => (
                <option key={n} value={n}>
                  {n}×
                </option>
              ))}
            </select>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-3 text-sm leading-relaxed">
            {financiado <= 0 || !selecionado ? (
              <strong>Pagamento à vista no PIX / entrada total.</strong>
            ) : (
              <>
                <div>
                  <strong>
                    {selecionado.parcelas}× de {formatBRL(selecionado.parcela)}
                  </strong>
                </div>
                <div>
                  Total no cartão: <strong>{formatBRL(selecionado.total)}</strong>
                </div>
                <div>
                  Total geral (entrada + cartão):{' '}
                  <strong>{formatBRL(entradaSafe + selecionado.total)}</strong>
                </div>
              </>
            )}
          </div>

          {tabelaVisivel.length > 0 && (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="p-2 border-b border-gray-200 text-left">Valor parcela</th>
                  <th className="p-2 border-b border-gray-200 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {tabelaVisivel.map((row) => (
                  <tr
                    key={row.parcelas}
                    className={row.parcelas === parcelas ? 'bg-emerald-50' : undefined}
                  >
                    <td className="p-2 border-b border-gray-200 text-left whitespace-nowrap">
                      {row.parcelas}× {formatBRL(row.parcela)}
                    </td>
                    <td className="p-2 border-b border-gray-200 text-right whitespace-nowrap">
                      {formatBRL(row.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="flex items-center justify-between gap-3 mt-2">
            <p className="text-xs text-slate-500 m-0">
              PIX é a condição à vista mais vantajosa. Cartão em até{' '}
              {tabelaCartao.maxParcelas}×.
            </p>
            <button
              type="button"
              className="text-xs text-teal-700 underline shrink-0"
              onClick={() => setMostrarTodas((v) => !v)}
            >
              {mostrarTodas ? 'Ver principais' : `Ver todas (${tabelaCartao.maxParcelas})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
