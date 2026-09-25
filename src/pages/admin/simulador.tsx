import React, { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { formatBRL } from '@/lib/formatBRL';
import { AnaliseFinanceiraInterna } from '@/components/AnaliseFinanceiraInterna';
import {
  PARCELAS_REFERENCIA_AVISTA,
  buildTabelaCartao,
  calcularParcelamentoCartao,
  opcoesSeletorCartao,
  parcelasDisponiveis,
  type TabelaCartao,
} from '@/lib/tabelaJurosCartao';

/**
 * Simulador avulso de parcelamento no cartão.
 *
 * ⚠️ Regra do cliente (`RESTRICOES_CLIENTE.md` / restricoes-cliente.mdc):
 * o texto copiável mostra **apenas valores finais**. Nunca incluir taxa,
 * juros, multiplicador, markup, custo ou a regra "à vista = total 12×".
 */

/** Parcelas destacadas no texto copiável (as comerciais da PIENG). */
const PARCELAS_DESTAQUE = [12, 18, 21] as const;

type OrigemTabela = 'ton' | 'pagseguro' | 'fallback-calibrado' | 'proposta' | string;

interface TabelaEstado {
  tabela: TabelaCartao;
  descricao: string;
  faixa?: number;
  prazo?: string;
}

const FAIXAS_LABEL: Record<number, string> = {
  0: 'até R$ 20 mil/mês',
  1: 'R$ 20 a 40 mil/mês',
  2: 'R$ 40 a 80 mil/mês',
  3: 'acima de R$ 80 mil/mês',
};

function descrever(tabela: TabelaCartao, faixa?: number, prazo?: string): string {
  if (tabela.adquirente === 'ton') {
    const f = faixa != null && FAIXAS_LABEL[faixa] ? ` · ${FAIXAS_LABEL[faixa]}` : '';
    const p = prazo === 'naHora' ? ' · recebimento na hora' : ' · recebimento 1 dia útil';
    return `Tabela Ton${f}${p}`;
  }
  if (tabela.adquirente === 'pagseguro') return 'PagSeguro (taxa manual das configurações)';
  return 'Tabela padrão do sistema';
}

/** Lê `valor` como número pt-BR aceitando "25.000", "25.000,50", "25000.50". */
function parseMoney(raw: string): number {
  const limpo = String(raw ?? '').replace(/[^\d,.-]/g, '').trim();
  if (!limpo) return 0;
  const temVirgula = limpo.includes(',');
  const normalizado = temVirgula
    ? limpo.replace(/\./g, '').replace(',', '.')
    : limpo;
  const n = parseFloat(normalizado);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 0;
}

export default function SimuladorPage() {
  const [valorTexto, setValorTexto] = useState('');
  const [entradaTexto, setEntradaTexto] = useState('');
  const [parcelas, setParcelas] = useState<number>(PARCELAS_REFERENCIA_AVISTA);
  const [estado, setEstado] = useState<TabelaEstado | null>(null);
  const [erroTabela, setErroTabela] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [copiadoDetalhe, setCopiadoDetalhe] = useState(false);

  // Carrega a tabela vigente das configurações (mesma fonte da proposta).
  useEffect(() => {
    let ativo = true;
    (async () => {
      try {
        const res = await fetch('/api/admin/config', { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const cfg = await res.json();
        const tabela = buildTabelaCartao({
          adquirente: cfg?.adquirente,
          tonTotais: cfg?.tonTotais,
          prazoRecebimento: cfg?.prazoRecebimento,
          faixaFaturamento: cfg?.faixaFaturamento,
          taxaMensalPagSeguro: cfg?.taxaMensalPagSeguro,
          taxaMensalFallback: cfg?.taxaCartaoMensal,
        });
        if (!ativo) return;
        setEstado({
          tabela,
          descricao: descrever(
            tabela,
            Number(cfg?.faixaFaturamento),
            String(cfg?.prazoRecebimento ?? '')
          ),
          faixa: Number(cfg?.faixaFaturamento),
          prazo: String(cfg?.prazoRecebimento ?? ''),
        });
      } catch (e) {
        if (!ativo) return;
        setErroTabela(e instanceof Error ? e.message : 'falha ao carregar configurações');
        setEstado({
          tabela: buildTabelaCartao(),
          descricao: 'Tabela padrão do sistema',
        });
      }
    })();
    return () => {
      ativo = false;
    };
  }, []);

  const tabela = estado?.tabela ?? null;

  const valor = parseMoney(valorTexto);
  const entrada = Math.min(parseMoney(entradaTexto), valor);
  const financiado = Math.max(0, valor - entrada);

  const opcoes = useMemo(() => (tabela ? opcoesSeletorCartao(tabela) : []), [tabela]);
  const todasParcelas = useMemo(() => (tabela ? parcelasDisponiveis(tabela) : []), [tabela]);

  // Mantém a parcela escolhida dentro do que a tabela suporta.
  useEffect(() => {
    if (!tabela) return;
    if (parcelas > tabela.maxParcelas) setParcelas(tabela.maxParcelas);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabela?.maxParcelas]);

  const condicoes = useMemo(() => {
    if (!tabela || financiado <= 0) return [];
    return todasParcelas.map((n) => calcularParcelamentoCartao(financiado, n, tabela));
  }, [tabela, financiado, todasParcelas]);

  const selecionado = useMemo(
    () =>
      tabela && financiado > 0
        ? calcularParcelamentoCartao(financiado, parcelas, tabela)
        : null,
    [tabela, financiado, parcelas]
  );

  /** Texto enxuto: entrada + parcelas de destaque. Só valores finais. */
  const textoSimples = useMemo(() => {
    if (valor <= 0 || !tabela) return '';
    const linhas: string[] = [];
    linhas.push(`*Simulação de pagamento*`);
    linhas.push(`Valor total: ${formatBRL(valor)}`);
    if (entrada > 0) linhas.push(`Entrada: ${formatBRL(entrada)}`);
    if (financiado <= 0) {
      linhas.push(`Pagamento à vista.`);
      return linhas.join('\n');
    }
    linhas.push('');
    linhas.push(
      entrada > 0
        ? `Restante no cartão (${formatBRL(financiado)}):`
        : `No cartão:`
    );
    for (const n of PARCELAS_DESTAQUE) {
      if (n > tabela.maxParcelas) continue;
      const c = calcularParcelamentoCartao(financiado, n, tabela);
      linhas.push(`• ${n}x de ${formatBRL(c.parcela)}`);
    }
    return linhas.join('\n');
  }, [valor, entrada, financiado, tabela]);

  /** Texto detalhado: todas as parcelas disponíveis. */
  const textoDetalhado = useMemo(() => {
    if (valor <= 0 || !tabela) return '';
    const linhas: string[] = [];
    linhas.push(`*Simulação de pagamento*`);
    linhas.push(`Valor total: ${formatBRL(valor)}`);
    if (entrada > 0) linhas.push(`Entrada: ${formatBRL(entrada)}`);
    if (financiado <= 0) {
      linhas.push(`Pagamento à vista.`);
      return linhas.join('\n');
    }
    linhas.push('');
    linhas.push(
      entrada > 0
        ? `Restante no cartão (${formatBRL(financiado)}):`
        : `No cartão:`
    );
    for (const c of condicoes) {
      linhas.push(`• ${c.parcelas}x de ${formatBRL(c.parcela)}`);
    }
    return linhas.join('\n');
  }, [valor, entrada, financiado, tabela, condicoes]);

  const copiar = async (texto: string, qual: 'simples' | 'detalhe') => {
    if (!texto) return;
    try {
      await navigator.clipboard.writeText(texto);
    } catch {
      // Fallback para navegadores/contextos sem Clipboard API
      const ta = document.createElement('textarea');
      ta.value = texto;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
      } catch {
        /* ignora */
      }
      document.body.removeChild(ta);
    }
    if (qual === 'simples') {
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2000);
    } else {
      setCopiadoDetalhe(true);
      window.setTimeout(() => setCopiadoDetalhe(false), 2000);
    }
  };

  const semValor = valor <= 0;

  return (
    <>
      <Head>
        <title>Simulador de pagamento - PIENG Solar</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="admin-shell">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-3xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-6 gap-4">
              <div>
                <h1 className="text-3xl font-bold admin-title">🧮 Simulador de pagamento</h1>
                <p className="admin-subtitle mt-2">
                  Calcule as condições no cartão para qualquer valor, sem gerar orçamento.
                </p>
              </div>
              <Link href="/admin" legacyBehavior>
                <a className="admin-btn-ghost shrink-0">← Voltar</a>
              </Link>
            </div>

            {/* Origem da tabela */}
            <div className="admin-surface p-4 mb-6 text-sm">
              {estado ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[var(--admin-text-muted)]">Tabela em uso:</span>
                  <strong>{estado.descricao}</strong>
                  <span className="px-2 py-0.5 text-xs rounded border border-[var(--admin-border)] bg-[var(--admin-surface-muted)]">
                    até {estado.tabela.maxParcelas}×
                  </span>
                </div>
              ) : (
                <span className="text-[var(--admin-text-muted)]">Carregando tabela…</span>
              )}
              {erroTabela && (
                <p className="text-xs text-amber-600 mt-2 mb-0">
                  Não foi possível ler as configurações ({erroTabela}). Usando a tabela padrão.
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Entradas */}
              <div className="admin-surface p-6">
                <h2 className="text-lg font-semibold mb-4">Dados da simulação</h2>

                <div className="flex flex-col gap-1.5 mb-4">
                  <label
                    htmlFor="sim-valor"
                    className="text-xs font-semibold text-[var(--admin-text-muted)]"
                  >
                    Valor total (R$)
                  </label>
                  <input
                    id="sim-valor"
                    type="text"
                    inputMode="decimal"
                    placeholder="25.000,00"
                    value={valorTexto}
                    onChange={(e) => setValorTexto(e.target.value)}
                    className="admin-input text-base"
                  />
                  {valor > 0 && (
                    <span className="text-xs text-[var(--admin-text-muted)]">
                      {formatBRL(valor)}
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-1.5 mb-4">
                  <label
                    htmlFor="sim-entrada"
                    className="text-xs font-semibold text-[var(--admin-text-muted)]"
                  >
                    Entrada (R$) — opcional
                  </label>
                  <input
                    id="sim-entrada"
                    type="text"
                    inputMode="decimal"
                    placeholder="0,00"
                    value={entradaTexto}
                    onChange={(e) => setEntradaTexto(e.target.value)}
                    className="admin-input text-base"
                  />
                  {entrada > 0 && (
                    <span className="text-xs text-[var(--admin-text-muted)]">
                      {formatBRL(entrada)} — restante {formatBRL(financiado)}
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="sim-parcelas"
                    className="text-xs font-semibold text-[var(--admin-text-muted)]"
                  >
                    Parcelas em destaque
                  </label>
                  <select
                    id="sim-parcelas"
                    value={parcelas}
                    onChange={(e) => setParcelas(Number(e.target.value) || PARCELAS_REFERENCIA_AVISTA)}
                    className="admin-input text-base"
                    disabled={!tabela}
                  >
                    {(opcoes.length ? opcoes : todasParcelas).map((n) => (
                      <option key={n} value={n}>
                        {n}×
                      </option>
                    ))}
                  </select>
                </div>

                {(valorTexto || entradaTexto) && (
                  <button
                    type="button"
                    className="admin-btn-ghost mt-4 text-sm"
                    onClick={() => {
                      setValorTexto('');
                      setEntradaTexto('');
                    }}
                  >
                    Limpar
                  </button>
                )}
              </div>

              {/* Resultado */}
              <div className="admin-surface p-6">
                <h2 className="text-lg font-semibold mb-4">Resultado</h2>

                {semValor || !tabela ? (
                  <p className="text-sm text-[var(--admin-text-muted)]">
                    Digite um valor total para ver as condições.
                  </p>
                ) : financiado <= 0 ? (
                  <div className="text-sm">
                    <strong>Pagamento à vista.</strong>
                    <p className="text-[var(--admin-text-muted)] mt-1 mb-0">
                      A entrada cobre o valor total.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="bg-[var(--admin-surface-muted)] border border-[var(--admin-border)] rounded-xl p-3 mb-4 text-sm leading-relaxed">
                      <div>
                        <strong>Valor total:</strong> {formatBRL(valor)}
                      </div>
                      <div>
                        <strong>Entrada:</strong> {formatBRL(entrada)}
                      </div>
                      <div>
                        <strong>Restante a parcelar:</strong> {formatBRL(financiado)}
                      </div>
                    </div>

                    {selecionado && (
                      <div className="mb-4 text-sm leading-relaxed">
                        <div className="text-lg font-semibold">
                          {selecionado.parcelas}× de {formatBRL(selecionado.parcela)}
                        </div>
                        <div className="text-[var(--admin-text-muted)]">
                          Total no cartão: {formatBRL(selecionado.total)}
                        </div>
                        <div className="text-[var(--admin-text-muted)]">
                          Total geral: {formatBRL(entrada + selecionado.total)}
                        </div>
                      </div>
                    )}

                    <div className="border-t border-[var(--admin-border)] pt-3">
                      <table className="w-full text-sm">
                        <thead>
                          <tr>
                            <th className="text-left py-1.5 font-semibold">Parcela</th>
                            <th className="text-right py-1.5 font-semibold">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {condicoes.map((c) => (
                            <tr
                              key={c.parcelas}
                              className={
                                c.parcelas === parcelas
                                  ? 'bg-emerald-50 font-semibold'
                                  : undefined
                              }
                            >
                              <td className="py-1.5 border-b border-[var(--admin-border)]">
                                {c.parcelas}× {formatBRL(c.parcela)}
                              </td>
                              <td className="py-1.5 border-b border-[var(--admin-border)] text-right">
                                {formatBRL(c.total)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Texto para WhatsApp */}
            <div className="admin-surface p-6 mt-6">
              <h2 className="text-lg font-semibold mb-1">Mensagem para enviar</h2>
              <p className="text-xs text-[var(--admin-text-muted)] mt-0 mb-4">
                Só valores finais — sem taxa, juros ou detalhes internos.
              </p>

              {!textoSimples ? (
                <p className="text-sm text-[var(--admin-text-muted)]">
                  Digite um valor total para gerar a mensagem.
                </p>
              ) : (
                <>
                  <textarea
                    readOnly
                    value={textoSimples}
                    rows={Math.max(5, textoSimples.split('\n').length + 1)}
                    className="admin-input w-full font-mono text-sm leading-relaxed resize-y"
                  />

                  <div className="flex flex-wrap gap-3 mt-4">
                    <button
                      type="button"
                      className="admin-btn-primary"
                      onClick={() => copiar(textoSimples, 'simples')}
                    >
                      {copiado ? '✓ Copiado!' : '📋 Copiar mensagem'}
                    </button>
                    <button
                      type="button"
                      className="admin-btn-ghost"
                      onClick={() => copiar(textoDetalhado, 'detalhe')}
                    >
                      {copiadoDetalhe ? '✓ Copiado!' : '📋 Copiar com todas as parcelas'}
                    </button>
                  </div>

                  <details className="mt-4">
                    <summary className="text-sm cursor-pointer text-[var(--admin-text-muted)]">
                      Ver versão com todas as parcelas ({condicoes.length})
                    </summary>
                    <textarea
                      readOnly
                      value={textoDetalhado}
                      rows={Math.max(6, textoDetalhado.split('\n').length + 1)}
                      className="admin-input w-full font-mono text-sm leading-relaxed resize-y mt-3"
                    />
                  </details>
                </>
              )}
            </div>

            {/* 🔒 Análise econômico-financeira interna (só analista) */}
            {tabela && (
              <AnaliseFinanceiraInterna
                valor={valor}
                entrada={entrada}
                financiado={financiado}
                parcelasSelecionadas={parcelas}
                tabela={tabela}
                faixa={estado?.faixa}
                prazo={estado?.prazo}
              />
            )}

            <p className="text-xs text-[var(--admin-text-muted)] mt-6 text-center">
              Ferramenta interna. As condições refletem a tabela da maquininha vigente nas{' '}
              <Link href="/admin/configuracoes" legacyBehavior>
                <a className="underline">configurações</a>
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
