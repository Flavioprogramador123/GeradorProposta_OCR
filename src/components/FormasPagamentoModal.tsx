import React, { useEffect, useMemo, useState } from 'react';
import { formatBRL } from '@/lib/formatBRL';
import {
  PARCELAS_CARTAO_MAX,
  PARCELAS_CARTAO_MIN,
  PARCELAS_REFERENCIA_AVISTA,
  calcularParcelamentoCartao,
  listarParcelasCartao,
} from '@/lib/tabelaJurosCartao';

interface FormasPagamentoModalProps {
  open: boolean;
  pix: number;
  onClose: () => void;
  /** Taxa mensal maquininha (% a.m.), padrão 1,51 */
  taxaCartaoMensal?: number;
}

export const FormasPagamentoModal: React.FC<FormasPagamentoModalProps> = ({
  open,
  pix,
  onClose,
  taxaCartaoMensal,
}) => {
  const [entrada, setEntrada] = useState(0);
  const [parcelas, setParcelas] = useState(PARCELAS_REFERENCIA_AVISTA);

  useEffect(() => {
    if (!open) return;
    setEntrada(0);
    setParcelas(PARCELAS_REFERENCIA_AVISTA);
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
        ? calcularParcelamentoCartao(financiado, parcelas, taxaCartaoMensal)
        : null,
    [financiado, parcelas, taxaCartaoMensal]
  );

  const tabela = useMemo(
    () => (financiado > 0 ? listarParcelasCartao(financiado, taxaCartaoMensal) : []),
    [financiado, taxaCartaoMensal]
  );

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
              {Array.from(
                { length: PARCELAS_CARTAO_MAX - PARCELAS_CARTAO_MIN + 1 },
                (_, i) => PARCELAS_CARTAO_MIN + i
              ).map((n) => (
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

          {tabela.length > 0 && (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="p-2 border-b border-gray-200 text-left">Parcelas</th>
                  <th className="p-2 border-b border-gray-200 text-right">Valor parcela</th>
                  <th className="p-2 border-b border-gray-200 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {tabela.map((row) => (
                  <tr
                    key={row.parcelas}
                    className={row.parcelas === parcelas ? 'bg-emerald-50' : undefined}
                  >
                    <td className="p-2 border-b border-gray-200 text-left">{row.parcelas}×</td>
                    <td className="p-2 border-b border-gray-200 text-right">
                      {formatBRL(row.parcela)}
                    </td>
                    <td className="p-2 border-b border-gray-200 text-right">
                      {formatBRL(row.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <p className="text-xs text-slate-500 mt-2">
            PIX é a condição à vista mais vantajosa. Demais condições no cartão conforme tabela vigente
            ({PARCELAS_CARTAO_MIN}× a {PARCELAS_CARTAO_MAX}×).
          </p>
        </div>
      </div>
    </div>
  );
};
