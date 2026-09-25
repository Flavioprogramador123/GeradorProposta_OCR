import React, { useMemo, useState } from 'react';
import { formatBRL } from '@/lib/formatBRL';
import {
  calcularParcelamentoCartao,
  parcelasDisponiveis,
  type TabelaCartao,
} from '@/lib/tabelaJurosCartao';

/**
 * 🔒 Análise econômico-financeira INTERNA do analista.
 *
 * Vive **apenas** na área administrativa (`/admin/simulador`). Mostra o que o
 * cliente final nunca deve ver: MDR/taxa da maquininha, taxa equivalente
 * mensal, custo do cartão, líquido recebido e comparação com o à vista.
 *
 * Regra do cliente (`RESTRICOES_CLIENTE.md` / restricoes-cliente.mdc):
 * o texto copiável do simulador continua só com valores finais. Este bloco
 * é o oposto — é o lugar certo para os números internos — e por isso:
 *  - nasce **recolhido** (só o olho aparece);
 *  - recebe `no-print`, ficando fora de qualquer PDF/impressão.
 */

export interface AnaliseFinanceiraInternaProps {
  /** Valor total da simulação (R$) */
  valor: number;
  /** Entrada (R$) */
  entrada: number;
  /** Restante financiado no cartão (R$) */
  financiado: number;
  /** Parcela selecionada em destaque */
  parcelasSelecionadas: number;
  /** Tabela da maquininha vigente */
  tabela: TabelaCartao;
  /** Faixa de faturamento da Ton (0–3) */
  faixa?: number;
  /** Prazo de recebimento (`umDiaUtil` | `naHora`) */
  prazo?: string;
  /** Markup usado na promoção (riscado ÷ PIX), se conhecido */
  markupPromocao?: number;
}

const FAIXAS_LABEL: Record<number, string> = {
  0: 'até R$ 20 mil/mês',
  1: 'R$ 20 a 40 mil/mês',
  2: 'R$ 40 a 80 mil/mês',
  3: 'acima de R$ 80 mil/mês',
};

const ADQUIRENTE_LABEL: Record<string, string> = {
  ton: 'Ton',
  pagseguro: 'PagSeguro',
  proposta: 'Tabela salva na proposta',
  'fallback-calibrado': 'Tabela padrão do sistema',
};

/** Juros % total embutidos no multiplicador de N parcelas. */
function jurosTotal(t: TabelaCartao, n: number): number {
  const direto = t.jurosParcelaPercent[n];
  if (direto != null && Number.isFinite(Number(direto))) return Number(direto);
  return t.taxaMensal12x * n;
}

const Linha: React.FC<{ rotulo: string; valor: React.ReactNode; destaque?: boolean }> = ({
  rotulo,
  valor,
  destaque,
}) => (
  <div className="flex items-baseline justify-between gap-3 py-1 border-b border-dashed border-[var(--admin-border)] last:border-b-0">
    <span className="text-[var(--admin-text-muted)]">{rotulo}</span>
    <span
      className={`tabular-nums whitespace-nowrap ${
        destaque ? 'font-semibold' : ''
      }`}
    >
      {valor}
    </span>
  </div>
);

const Bloco: React.FC<{ titulo: string; children: React.ReactNode }> = ({
  titulo,
  children,
}) => (
  <div className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-muted)] p-3">
    <div className="text-[11px] font-bold uppercase tracking-wide text-teal-700 mb-1.5">
      {titulo}
    </div>
    <div className="text-[13px]">{children}</div>
  </div>
);

export const AnaliseFinanceiraInterna: React.FC<AnaliseFinanceiraInternaProps> = ({
  valor,
  entrada,
  financiado,
  parcelasSelecionadas,
  tabela,
  faixa,
  prazo,
  markupPromocao,
}) => {
  const [aberto, setAberto] = useState(false);

  const adquirente =
    ADQUIRENTE_LABEL[tabela.adquirente] ?? tabela.adquirente ?? 'Tabela padrão';
  const faixaTxt =
    faixa != null && FAIXAS_LABEL[faixa] ? FAIXAS_LABEL[faixa] : '—';
  const prazoTxt = prazo === 'naHora' ? 'na hora' : prazo === 'umDiaUtil' ? '1 dia útil' : '—';

  /** Linha a linha, com todos os números internos de cada parcela. */
  const linhas = useMemo(() => {
    if (financiado <= 0) return [];
    return parcelasDisponiveis(tabela).map((n) => {
      const c = calcularParcelamentoCartao(financiado, n, tabela);
      const pctTotal = jurosTotal(tabela, n);
      const custo = c.total - financiado;
      const mensal =
        n > 1 && pctTotal > 0
          ? (Math.pow(1 + pctTotal / 100, 1 / n) - 1) * 100
          : pctTotal;
      return {
        parcelas: n,
        parcela: c.parcela,
        total: c.total,
        pctTotal,
        custo,
        mensal,
        // Quanto a PIENG efetivamente recebe: financiado − custo do cartão
        liquido: financiado - custo,
        liquidoPct: financiado > 0 ? ((financiado - custo) / financiado) * 100 : 0,
      };
    });
  }, [tabela, financiado]);

  const selecionada = useMemo(
    () => linhas.find((l) => l.parcelas === parcelasSelecionadas) ?? null,
    [linhas, parcelasSelecionadas]
  );

  /** Âncora comercial: "à vista" = total em 12× */
  const avista = useMemo(() => calcularParcelamentoCartao(financiado, 12, tabela), [tabela, financiado]);

  /** Custo do cartão na condição selecionada. */
  const custoSelecionado = selecionada?.custo ?? 0;

  /** Quanto o cliente paga a mais pegando o maior prazo vs. o menor. */
  const extremos = useMemo(() => {
    if (linhas.length < 2) return null;
    const menor = linhas[0];
    const maior = linhas[linhas.length - 1];
    return { menor, maior, delta: maior.total - menor.total };
  }, [linhas]);

  const resumo = (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] text-[var(--admin-text-muted)]">
      <span>
        {adquirente}
        {faixa != null && FAIXAS_LABEL[faixa] ? ` · ${FAIXAS_LABEL[faixa]}` : ''}
      </span>
      {selecionada && financiado > 0 && (
        <>
          <span>
            taxa total{' '}
            <strong className="tabular-nums">{selecionada.pctTotal.toFixed(2)}%</strong>
          </span>
          <span>
            custo <strong className="tabular-nums">{formatBRL(custoSelecionado)}</strong>
          </span>
        </>
      )}
    </span>
  );

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: '@media print { [data-interno-analista] { display: none !important; } }',
        }}
      />
      <div className="admin-surface mt-6 border-dashed" data-interno-analista>
        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          aria-expanded={aberto}
          aria-controls="sim-analise-interna"
          title="Dados internos — análise econômico-financeira (não vai para o cliente)"
          className="w-full flex items-center justify-between gap-3 px-5 py-3.5 text-left hover:bg-[var(--admin-surface-muted)] rounded-xl transition-colors"
        >
          <span className="flex items-center gap-2 min-w-0">
            <span className="text-base leading-none" aria-hidden>
              {aberto ? '🙈' : '👁️'}
            </span>
            <span className="text-sm font-semibold whitespace-nowrap">
              Análise econômico-financeira
            </span>
            <span className="text-[11px] uppercase tracking-wide text-[var(--admin-text-muted)]">
              interno
            </span>
            {!aberto && financiado > 0 && <span className="truncate">{resumo}</span>}
          </span>
          <span className="text-xs text-[var(--admin-text-muted)] shrink-0">
            {aberto ? 'ocultar' : 'ver'}
          </span>
        </button>

        {aberto && (
          <div id="sim-analise-interna" className="px-5 pb-5">
          {financiado <= 0 ? (
            <p className="text-sm text-[var(--admin-text-muted)] mt-1 mb-0">
              Sem valor parcelado — a entrada cobre o total. Não há custo de maquininha nesta
              simulação.
            </p>
          ) : (
            <>
              {/* Configuração vigente */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <Bloco titulo="Adquirente e tarifação">
                  <Linha rotulo="Maquininha" valor={adquirente} />
                  <Linha rotulo="Faixa de faturamento" valor={faixaTxt} />
                  <Linha rotulo="Prazo de recebimento" valor={prazoTxt} />
                  <Linha
                    rotulo="Parcelas disponíveis"
                    valor={`2× a ${tabela.maxParcelas}×`}
                  />
                  <Linha
                    rotulo="Taxa mensal equivalente (12×)"
                    valor={`${tabela.taxaMensal12x.toFixed(2)}% a.m.`}
                  />
                  <Linha
                    rotulo="Juros totais em 12×"
                    valor={`${jurosTotal(tabela, 12).toFixed(2)}%`}
                  />
                </Bloco>

                <Bloco titulo="Condição selecionada">
                  <Linha rotulo="Valor total" valor={formatBRL(valor)} destaque />
                  <Linha rotulo="Entrada" valor={formatBRL(entrada)} />
                  <Linha
                    rotulo="Restante a parcelar"
                    valor={formatBRL(financiado)}
                    destaque
                  />
                  {selecionada && (
                    <>
                      <Linha
                        rotulo="Parcela"
                        valor={`${selecionada.parcelas}× de ${formatBRL(selecionada.parcela)}`}
                      />
                      <Linha
                        rotulo="Taxa total da maquininha"
                        valor={`${selecionada.pctTotal.toFixed(2)}%`}
                      />
                      <Linha
                        rotulo="Taxa equivalente mensal"
                        valor={`${selecionada.mensal.toFixed(2)}% a.m.`}
                      />
                      <Linha
                        rotulo="Custo do cartão"
                        valor={formatBRL(selecionada.custo)}
                        destaque
                      />
                      <Linha
                        rotulo="Líquido recebido pela PIENG"
                        valor={`${formatBRL(selecionada.liquido)} (${selecionada.liquidoPct.toFixed(
                          2
                        )}%)`}
                        destaque
                      />
                      <Linha
                        rotulo="Total pago pelo cliente"
                        valor={formatBRL(entrada + selecionada.total)}
                      />
                    </>
                  )}
                </Bloco>
              </div>

              {/* Comparativo com o à vista */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <Bloco titulo="Comparativo — à vista vs. cartão">
                  <Linha
                    rotulo="À vista (PIX / entrada total)"
                    valor={formatBRL(financiado)}
                  />
                  <Linha
                    rotulo="À vista pela âncora 12×"
                    valor={formatBRL(avista.total)}
                  />
                  {selecionada && (
                    <>
                      <Linha
                        rotulo={`Cartão em ${selecionada.parcelas}×`}
                        valor={formatBRL(selecionada.total)}
                      />
                      <Linha
                        rotulo="Diferença cartão − PIX"
                        valor={formatBRL(selecionada.total - financiado)}
                        destaque
                      />
                      <Linha
                        rotulo="% de acréscimo sobre o PIX"
                        valor={`${(
                          ((selecionada.total - financiado) / financiado) *
                          100
                        ).toFixed(2)}%`}
                      />
                    </>
                  )}
                  {markupPromocao && markupPromocao > 0 && (
                    <Linha
                      rotulo="Markup da promoção (riscado ÷ PIX)"
                      valor={`${markupPromocao.toFixed(3)}×`}
                    />
                  )}
                </Bloco>

                <Bloco titulo="Faixa de custo entre extremos">
                  {extremos ? (
                    <>
                      <Linha
                        rotulo={`Menor prazo (${extremos.menor.parcelas}×)`}
                        valor={`${formatBRL(extremos.menor.custo)} · ${extremos.menor.pctTotal.toFixed(
                          2
                        )}%`}
                      />
                      <Linha
                        rotulo={`Maior prazo (${extremos.maior.parcelas}×)`}
                        valor={`${formatBRL(extremos.maior.custo)} · ${extremos.maior.pctTotal.toFixed(
                          2
                        )}%`}
                      />
                      <Linha
                        rotulo="Amplitude do custo"
                        valor={formatBRL(extremos.delta)}
                        destaque
                      />
                      <Linha
                        rotulo="Amplitude em % do valor"
                        valor={`${((extremos.delta / financiado) * 100).toFixed(2)}%`}
                      />
                    </>
                  ) : (
                    <Linha rotulo="—" valor="—" />
                  )}
                </Bloco>
              </div>

              {/* Grade completa por parcela */}
              <div className="rounded-lg border border-[var(--admin-border)] overflow-hidden">
                <div className="px-3 py-2 bg-[var(--admin-surface-muted)] text-[11px] font-bold uppercase tracking-wide text-teal-700">
                  Grade completa — {linhas.length} condições sobre {formatBRL(financiado)}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-[12px] tabular-nums">
                    <thead>
                      <tr className="text-[var(--admin-text-muted)]">
                        <th className="text-left px-3 py-2 font-semibold">Parcela</th>
                        <th className="text-left px-3 py-2 font-semibold">Taxa total</th>
                        <th className="text-left px-3 py-2 font-semibold">% a.m. equiv.</th>
                        <th className="text-right px-3 py-2 font-semibold">Parcela (R$)</th>
                        <th className="text-right px-3 py-2 font-semibold">Total cartão</th>
                        <th className="text-right px-3 py-2 font-semibold">Custo cartão</th>
                        <th className="text-right px-3 py-2 font-semibold">Líquido PIENG</th>
                        <th className="text-right px-3 py-2 font-semibold">Líq. %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {linhas.map((l) => (
                        <tr
                          key={l.parcelas}
                          className={
                            l.parcelas === parcelasSelecionadas
                              ? 'bg-emerald-50 font-semibold'
                              : 'border-t border-[var(--admin-border)]'
                          }
                        >
                          <td className="px-3 py-1.5">{l.parcelas}×</td>
                          <td className="px-3 py-1.5">{l.pctTotal.toFixed(2)}%</td>
                          <td className="px-3 py-1.5">{l.mensal.toFixed(2)}%</td>
                          <td className="px-3 py-1.5 text-right">{formatBRL(l.parcela)}</td>
                          <td className="px-3 py-1.5 text-right">{formatBRL(l.total)}</td>
                          <td className="px-3 py-1.5 text-right">{formatBRL(l.custo)}</td>
                          <td className="px-3 py-1.5 text-right">{formatBRL(l.liquido)}</td>
                          <td className="px-3 py-1.5 text-right">{l.liquidoPct.toFixed(2)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <p className="text-[11px] text-[var(--admin-text-muted)] mt-3 mb-0">
                Bloco interno do analista. Some na impressão/PDF e nunca aparece no texto enviado
                ao cliente.
              </p>
            </>
          )}
          </div>
        )}
      </div>
    </>
  );
};
