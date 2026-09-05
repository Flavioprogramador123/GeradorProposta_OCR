import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { AdminThemePicker } from '@/components/AdminThemePicker';

type Estatisticas = {
  totalVisualizacoes: number;
  visualizacoesUnicas: number;
  tempoTotalSegundos?: number;
  tempoMedioSegundos: number;
  compartilhado: boolean;
  precisaContato: boolean;
  ultimaVisualizacao: string | null;
  diasSemVisualizar: number | null;
  ipsDistintos?: number;
  equipamentosDistintos?: number;
  diagnosticoCompartilhamento?: {
    indício: boolean;
    confianca: string;
    motivo: string;
    equipamentos: string[];
    ipsMascarados: string[];
  };
  alertas?: Array<{ tipo: string; mensagem: string; data?: string }>;
};

type AnalyticsRow = {
  id?: string;
  ip_address?: string;
  ip_mascarado?: string;
  equipamento_rotulo?: string;
  device_type?: string;
  browser?: string;
  os?: string;
  visualizacoes_count?: number;
  tempo_total_segundos?: number;
  scroll_percentage?: number;
  cliques_count?: number;
  primeira_visualizacao?: string;
  ultima_visualizacao?: string;
  compartilhado?: boolean;
};

function formatTempo(segundos: number) {
  const s = Math.max(0, Math.round(segundos || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m <= 0) return `${r}s`;
  return `${m}min ${r}s`;
}

function formatData(iso?: string | null) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('pt-BR');
  } catch {
    return iso;
  }
}

export default function AnalyticsPropostaPage() {
  const router = useRouter();
  const slug = typeof router.query.slug === 'string' ? router.query.slug : '';
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [stats, setStats] = useState<Estatisticas | null>(null);
  const [rows, setRows] = useState<AnalyticsRow[]>([]);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setErro(null);
      try {
        const res = await fetch(`/api/admin/analytics/${encodeURIComponent(slug)}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || `Erro ${res.status}`);
        }
        const data = await res.json();
        if (cancelled) return;
        setStats(data.estatisticas || null);
        setRows(Array.isArray(data.analytics) ? data.analytics : []);
      } catch (e) {
        if (!cancelled) setErro(e instanceof Error ? e.message : 'Falha ao carregar');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const nuncaAberta = !loading && stats && stats.totalVisualizacoes === 0;
  const propostaUrl = slug ? `/proposta/${slug}?from=admin` : '#';
  const publicaUrl = slug ? `https://pieng-propostas.vercel.app/proposta/${slug}` : '';

  return (
    <>
      <Head>
        <title>Analytics · {slug || 'Proposta'} | PIENG Admin</title>
      </Head>

      <div className="admin-shell min-h-screen">
        <div className="container mx-auto px-4 py-8 max-w-5xl">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
            <div>
              <Link href="/admin" legacyBehavior>
                <a className="text-sm text-slate-500 hover:text-slate-800">← Admin</a>
              </Link>
              <h1 className="text-2xl font-bold admin-title mt-1">📊 Analytics da proposta</h1>
              <p className="text-sm admin-subtitle font-mono mt-1 break-all">{slug || '…'}</p>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <AdminThemePicker compact />
              {slug && (
                <>
                  <a
                    href={propostaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="admin-btn-primary text-sm"
                  >
                    👁️ Abrir proposta
                  </a>
                  <Link href={`/gerador-rapido?cliente=${slug}`} legacyBehavior>
                    <a className="admin-btn-ghost text-sm">✏️ Editar</a>
                  </Link>
                  <Link href={`/admin/orcamentos/${slug}`} legacyBehavior>
                    <a className="admin-btn-ghost text-sm">📋 Orçamentos</a>
                  </Link>
                </>
              )}
            </div>
          </div>

          {loading && (
            <div className="admin-surface p-8 text-center text-slate-500">Carregando analytics…</div>
          )}

          {erro && (
            <div className="admin-surface p-6 border border-red-200 bg-red-50 text-red-800">{erro}</div>
          )}

          {!loading && !erro && stats && (
            <div className="space-y-6">
              {nuncaAberta ? (
                <div className="rounded-xl border border-amber-300 bg-amber-50 p-5">
                  <h2 className="font-semibold text-amber-900 text-lg">📭 Proposta ainda não foi aberta</h2>
                  <p className="text-sm text-amber-800 mt-1">
                    O link existe, mas não há registro de visualização em{' '}
                    <code className="text-xs bg-amber-100 px-1 rounded">/proposta/{slug}</code>.
                    Envie pelo WhatsApp ou copie o link e acompanhe aqui quando o cliente abrir.
                  </p>
                  <div className="flex flex-wrap gap-2 mt-4">
                    <button
                      type="button"
                      className="px-3 py-1.5 rounded-lg bg-white border border-amber-300 text-amber-900 text-sm font-medium hover:bg-amber-100"
                      onClick={() => {
                        navigator.clipboard.writeText(publicaUrl);
                        alert('Link copiado!');
                      }}
                    >
                      🔗 Copiar link
                    </button>
                    <button
                      type="button"
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 inline-flex items-center gap-1.5"
                      onClick={() => {
                        const msg = `Olá! Sua proposta de energia solar está pronta! 🌞\n\nAcesse: ${publicaUrl}`;
                        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
                      }}
                    >
                      <img src="/icons/whatsapp.png" alt="" width={16} height={16} aria-hidden />
                      WhatsApp
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className={`rounded-xl border p-4 ${
                    stats.precisaContato
                      ? 'border-red-300 bg-red-50'
                      : 'border-emerald-200 bg-emerald-50'
                  }`}
                >
                  <p
                    className={`font-medium ${
                      stats.precisaContato ? 'text-red-800' : 'text-emerald-900'
                    }`}
                  >
                    {stats.precisaContato
                      ? '⚠️ Recomenda-se entrar em contato'
                      : '✅ Cliente já abriu a proposta'}
                    {stats.diasSemVisualizar !== null && stats.diasSemVisualizar !== undefined && (
                      <span className="font-normal opacity-80">
                        {' '}
                        · última visita há {stats.diasSemVisualizar} dia(s)
                      </span>
                    )}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="admin-surface p-4">
                  <div className="text-xs text-slate-500 uppercase tracking-wide">Quantas vezes abriu</div>
                  <div className="text-2xl font-bold text-blue-700 mt-1">{stats.totalVisualizacoes}</div>
                  <div className="text-xs text-slate-500 mt-1">
                    {stats.visualizacoesUnicas} visitante(s) · {stats.equipamentosDistintos ?? '—'} aparelho(s)
                  </div>
                </div>
                <div className="admin-surface p-4">
                  <div className="text-xs text-slate-500 uppercase tracking-wide">Tempo olhando</div>
                  <div className="text-2xl font-bold text-emerald-700 mt-1">
                    {formatTempo(stats.tempoTotalSegundos ?? stats.tempoMedioSegundos)}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    total · média {formatTempo(stats.tempoMedioSegundos)}/visitante
                  </div>
                </div>
                <div className="admin-surface p-4">
                  <div className="text-xs text-slate-500 uppercase tracking-wide">Mesmo IP / aparelho?</div>
                  <div
                    className={`text-lg font-bold mt-1 ${
                      stats.compartilhado ? 'text-amber-700' : 'text-slate-600'
                    }`}
                  >
                    {stats.compartilhado ? '🔗 Pode ter passado' : '👤 Mesmo perfil'}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {stats.ipsDistintos ?? 0} IP(s) · confiança{' '}
                    {stats.diagnosticoCompartilhamento?.confianca || '—'}
                  </div>
                </div>
                <div className="admin-surface p-4">
                  <div className="text-xs text-slate-500 uppercase tracking-wide">Última abertura</div>
                  <div className="text-sm font-semibold text-slate-800 mt-2">
                    {formatData(stats.ultimaVisualizacao)}
                  </div>
                </div>
              </div>

              {stats.diagnosticoCompartilhamento && !nuncaAberta && (
                <div
                  className={`admin-surface p-5 border ${
                    stats.diagnosticoCompartilhamento.indício
                      ? 'border-amber-300 bg-amber-50/40'
                      : 'border-slate-200'
                  }`}
                >
                  <h2 className="font-semibold text-slate-800 mb-2">
                    {stats.diagnosticoCompartilhamento.indício
                      ? 'Indício de orçamento encaminhado'
                      : 'Acesso parece individual'}
                  </h2>
                  <p className="text-sm text-slate-700">{stats.diagnosticoCompartilhamento.motivo}</p>
                  {stats.diagnosticoCompartilhamento.equipamentos?.length > 0 && (
                    <ul className="mt-3 text-sm text-slate-600 space-y-1">
                      {stats.diagnosticoCompartilhamento.equipamentos.map((eq, i) => (
                        <li key={i}>
                          · {eq}
                          {stats.diagnosticoCompartilhamento?.ipsMascarados?.[i]
                            ? ` · IP ${stats.diagnosticoCompartilhamento.ipsMascarados[i]}`
                            : ''}
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="text-xs text-slate-400 mt-3">
                    Sem instalar app: usamos só dados de acesso do navegador (IP, tipo de aparelho,
                    navegador, tempo com a aba aberta, scroll). Não é 100% certeza — Wi‑Fi vs 4G da
                    mesma pessoa também muda o IP.
                  </p>
                </div>
              )}

              {stats.alertas && stats.alertas.length > 0 && (
                <div className="admin-surface p-5">
                  <h2 className="font-semibold text-slate-800 mb-3">Alertas</h2>
                  <ul className="space-y-2">
                    {stats.alertas.map((a, i) => (
                      <li
                        key={i}
                        className="border-l-4 border-amber-400 bg-amber-50/80 pl-3 py-2 rounded-r text-sm text-amber-900"
                      >
                        {a.mensagem}
                        {a.data && (
                          <div className="text-xs text-amber-700 mt-0.5">{formatData(a.data)}</div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="admin-surface overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-200 flex justify-between items-center">
                  <h2 className="font-semibold text-slate-800">Visitas registradas</h2>
                  <span className="text-xs text-slate-500">{rows.length} registro(s)</span>
                </div>
                {rows.length === 0 ? (
                  <div className="p-6 text-sm text-slate-500">Nenhuma visita ainda.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                        <tr>
                          <th className="px-4 py-3">Equipamento</th>
                          <th className="px-4 py-3">IP</th>
                          <th className="px-4 py-3">Aberturas</th>
                          <th className="px-4 py-3">Tempo</th>
                          <th className="px-4 py-3">Scroll</th>
                          <th className="px-4 py-3">Cliques</th>
                          <th className="px-4 py-3">Primeira</th>
                          <th className="px-4 py-3">Última</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {rows.map((row, i) => (
                          <tr key={row.id || i} className="hover:bg-slate-50/80">
                            <td className="px-4 py-3">
                              <div className="font-medium text-slate-800">
                                {row.equipamento_rotulo ||
                                  [row.device_type, row.browser, row.os].filter(Boolean).join(' · ') ||
                                  '—'}
                              </div>
                            </td>
                            <td className="px-4 py-3 font-mono text-xs text-slate-600">
                              {row.ip_mascarado || '—'}
                            </td>
                            <td className="px-4 py-3 font-medium">{row.visualizacoes_count ?? 0}</td>
                            <td className="px-4 py-3">{formatTempo(row.tempo_total_segundos || 0)}</td>
                            <td className="px-4 py-3">{row.scroll_percentage ?? 0}%</td>
                            <td className="px-4 py-3">{row.cliques_count ?? 0}</td>
                            <td className="px-4 py-3 text-xs whitespace-nowrap">
                              {formatData(row.primeira_visualizacao)}
                            </td>
                            <td className="px-4 py-3 text-xs whitespace-nowrap">
                              {formatData(row.ultima_visualizacao)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <p className="text-xs text-slate-400 text-center">
                Cliente só abre o link no celular/PC — nada a instalar. Tracking na rota{' '}
                <code>/proposta/[slug]</code>.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
