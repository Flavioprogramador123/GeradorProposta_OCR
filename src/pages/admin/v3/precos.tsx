import { useCallback, useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';

interface Stats {
  precosTotal?: number;
  precosValidos?: number;
  equipamentosAtivos?: number;
  estoqueMinimo?: number;
  porCd?: Array<{
    nome: string;
    slug_portal: string;
    total: number;
    validos: number;
    ultimo: string | null;
  }>;
}

interface PrecoRow {
  id: number;
  sku_interno: string;
  nome: string;
  categoria: string;
  cd_nome: string;
  preco_custo: number | null;
  estoque: number | null;
  valido_estoque: number;
  capturado_em: string | null;
  fonte: string | null;
}

interface Agenda {
  enabled: boolean;
  hora: string;
  dias: number[];
  fonte: 'temp' | 'scrape' | 'both';
  headless: boolean;
  lastRunAt?: string;
  lastRunOk?: boolean;
  lastRunMsg?: string;
}

const DIAS = [
  { d: 1, label: 'Seg' },
  { d: 2, label: 'Ter' },
  { d: 3, label: 'Qua' },
  { d: 4, label: 'Qui' },
  { d: 5, label: 'Sex' },
  { d: 6, label: 'Sáb' },
  { d: 0, label: 'Dom' },
];

const HORARIOS = ['06:00', '07:00', '07:30', '08:00', '09:00', '12:00', '18:00', '20:00'];

export default function AdminV3Precos() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [items, setItems] = useState<PrecoRow[]>([]);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [apenasValidos, setApenasValidos] = useState(false);
  const [agenda, setAgenda] = useState<Agenda | null>(null);
  const [proxima, setProxima] = useState<string | null>(null);
  const [agendaMsg, setAgendaMsg] = useState('');
  const [showRejeitados, setShowRejeitados] = useState(false);
  const [rejeitados, setRejeitados] = useState<{
    empty?: boolean;
    message?: string;
    capturadoEm?: string;
    fonte?: string;
    totalLidos?: number;
    totalAceitos?: number;
    totalRejeitados?: number;
    porCd?: Record<string, number>;
    porMotivo?: Record<string, number>;
    motivos?: Record<string, string>;
    itens?: Array<{
      cd: string;
      nome: string;
      preco: number | null;
      estoque: number | null;
      motivo: string;
      detalhe?: string;
      score?: number;
    }>;
  } | null>(null);
  const [filtroMotivo, setFiltroMotivo] = useState('');
  const [busyRej, setBusyRej] = useState(false);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (apenasValidos) params.set('validos', '1');
    const res = await fetch(`/api/v3/precos?${params}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
    setItems(data.items || []);
    setStats(data.stats || null);
  }, [apenasValidos]);

  const loadAgenda = useCallback(async () => {
    const res = await fetch('/api/v3/captura-agenda');
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
    setAgenda(data.agenda);
    setProxima(data.proxima);
  }, []);

  useEffect(() => {
    load().catch((e) => setMsg(e.message));
    loadAgenda().catch(() => undefined);
  }, [load, loadAgenda]);

  const run = async (fonte: 'temp' | 'scrape' | 'both') => {
    setBusy(true);
    setMsg(`Atualizando via ${fonte}…`);
    try {
      const res = await fetch('/api/v3/captura-precos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fonte, headless: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
      const lines = (data.results || []).map((r: Record<string, unknown>) => {
        if (r.error) return `${r.fonte}/${r.cd || ''}: ERRO ${r.error}`;
        if (r.warning) return `${r.fonte}/${r.cd || ''}: ${r.warning}`;
        return `${r.fonte}/${r.cd || ''}: ${r.matched ?? 0} match · ${r.validos ?? 0} válidos · ${r.itemsFound ?? ''} itens`;
      });
      setMsg(lines.join('\n') || 'Concluído');
      setStats(data.stats || null);
      await load();
      if (showRejeitados) await loadRejeitados(filtroMotivo);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const salvarAgenda = async () => {
    if (!agenda) return;
    setAgendaMsg('Salvando…');
    try {
      const res = await fetch('/api/v3/captura-agenda', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(agenda),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
      setAgenda(data.agenda);
      setProxima(data.proxima);
      setAgendaMsg(
        data.agenda.enabled
          ? `Agenda salva. Próxima: ${data.proxima ? new Date(data.proxima).toLocaleString('pt-BR') : '—'}. Instale a tarefa Windows (botão abaixo).`
          : 'Agenda salva (desativada).'
      );
    } catch (e) {
      setAgendaMsg(e instanceof Error ? e.message : String(e));
    }
  };

  const loadRejeitados = useCallback(async (motivo = '') => {
    setBusyRej(true);
    try {
      const params = new URLSearchParams();
      if (motivo) params.set('motivo', motivo);
      const res = await fetch(`/api/v3/precos/rejeitados?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
      setRejeitados(data);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyRej(false);
    }
  }, []);

  const abrirRejeitados = async () => {
    setShowRejeitados(true);
    await loadRejeitados(filtroMotivo);
  };

  const toggleDia = (d: number) => {
    if (!agenda) return;
    const set = new Set(agenda.dias);
    if (set.has(d)) set.delete(d);
    else set.add(d);
    setAgenda({ ...agenda, dias: Array.from(set).sort() });
  };

  return (
    <>
      <Head>
        <title>V3 Preços — PIENG</title>
      </Head>
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div>
              <Link href="/admin/v3" className="text-xs text-sky-400 hover:underline">
                ← V3 home
              </Link>
              <h1 className="text-2xl font-semibold mt-1">2a · Preços por CD</h1>
              <p className="text-sm text-slate-400">
                Match whitelist SQLite · estoque &gt; {stats?.estoqueMinimo ?? 20}
              </p>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={apenasValidos}
                onChange={(e) => setApenasValidos(e.target.checked)}
              />
              Só válidos
            </label>
          </div>

          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
              <div className="text-xs text-slate-500 uppercase">Preços</div>
              <div className="text-3xl font-semibold text-sky-300">{stats?.precosTotal ?? '—'}</div>
              <div className="text-xs text-slate-500">{stats?.precosValidos ?? 0} válidos</div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 md:col-span-2">
              <div className="text-xs text-slate-500 uppercase mb-2">Por CD</div>
              <div className="flex flex-wrap gap-2">
                {(stats?.porCd || []).map((c) => (
                  <span key={c.slug_portal} className="px-3 py-1 rounded-full bg-slate-800 text-xs">
                    {c.nome}: {c.validos}/{c.total}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Diferença dos 3 botões */}
          <div className="mb-4 rounded-xl border border-slate-700 bg-slate-900/50 p-4 text-sm text-slate-300 space-y-2">
            <div className="font-medium text-slate-100">O que cada botão faz</div>
            <ul className="list-disc pl-5 space-y-1 text-slate-400">
              <li>
                <span className="text-amber-300">Importar dumps temp/</span> — só lê HTML/JSON já
                salvos em <code className="text-sky-300">temp/</code>. Rápido, sem abrir Chromium.
                Bom se você já capturou antes.
              </li>
              <li>
                <span className="text-teal-300">Scraping live (3 CDs)</span> — Playwright loga no
                SOOLLAR e varre Aeroporto + Matriz + Feira agora. Atualiza o SQLite. Precisa{' '}
                <code className="text-sky-300">.env</code> com usuário/senha.
              </li>
              <li>
                <span className="text-slate-200">Temp + scrape</span> — faz os dois: primeiro
                importa <code className="text-sky-300">temp/</code>, depois scrape live.
              </li>
            </ul>
          </div>

          <div className="flex flex-wrap gap-3 mb-6">
            <button
              type="button"
              disabled={busy}
              onClick={() => run('temp')}
              className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-sm font-medium"
            >
              Importar dumps temp/
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => run('scrape')}
              className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-sm font-medium"
              title="Playwright — pode falhar se login/token oscilar"
            >
              Scraping live (3 CDs)
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => run('both')}
              className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-sm font-medium"
            >
              Temp + scrape
            </button>
            <button
              type="button"
              disabled={busyRej}
              onClick={() => abrirRejeitados()}
              className="px-4 py-2 rounded-lg border border-rose-500/50 bg-rose-950/40 hover:bg-rose-900/50 text-rose-200 text-sm font-medium"
              title="Itens lidos na última captura que não entraram no catálogo"
            >
              Dados rejeitados
            </button>
          </div>

          {showRejeitados && (
            <div className="mb-6 rounded-xl border border-rose-700/40 bg-rose-950/15 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-rose-200">Dados rejeitados (última captura)</h2>
                <button
                  type="button"
                  onClick={() => setShowRejeitados(false)}
                  className="text-xs text-slate-400 hover:text-slate-200"
                >
                  Fechar
                </button>
              </div>
              {rejeitados?.empty ? (
                <p className="text-sm text-slate-400">{rejeitados.message}</p>
              ) : rejeitados ? (
                <>
                  <div className="flex flex-wrap gap-3 text-xs text-slate-400">
                    <span>
                      Em:{' '}
                      {rejeitados.capturadoEm
                        ? new Date(rejeitados.capturadoEm).toLocaleString('pt-BR')
                        : '—'}
                    </span>
                    <span>Fonte: {rejeitados.fonte || '—'}</span>
                    <span>
                      Lidos {rejeitados.totalLidos ?? 0} · Aceitos {rejeitados.totalAceitos ?? 0} ·
                      Rejeitados {rejeitados.totalRejeitados ?? 0}
                    </span>
                  </div>
                  {rejeitados.porMotivo && (
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(rejeitados.porMotivo).map(([k, n]) => (
                        <button
                          key={k}
                          type="button"
                          onClick={() => {
                            const next = filtroMotivo === k ? '' : k;
                            setFiltroMotivo(next);
                            loadRejeitados(next);
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs border ${
                            filtroMotivo === k
                              ? 'bg-rose-700 border-rose-500 text-white'
                              : 'bg-slate-900 border-slate-700 text-slate-300'
                          }`}
                        >
                          {(rejeitados.motivos && rejeitados.motivos[k]) || k}: {n}
                        </button>
                      ))}
                      {filtroMotivo && (
                        <button
                          type="button"
                          onClick={() => {
                            setFiltroMotivo('');
                            loadRejeitados('');
                          }}
                          className="px-2.5 py-1 rounded-lg text-xs text-sky-300"
                        >
                          Limpar filtro
                        </button>
                      )}
                    </div>
                  )}
                  <div className="overflow-x-auto max-h-96 rounded-lg border border-slate-800">
                    <table className="min-w-full text-xs">
                      <thead className="bg-slate-900 text-slate-400 sticky top-0">
                        <tr>
                          <th className="px-2 py-1.5 text-left">CD</th>
                          <th className="px-2 py-1.5 text-left">Nome</th>
                          <th className="px-2 py-1.5 text-left">Preço</th>
                          <th className="px-2 py-1.5 text-left">Estoque</th>
                          <th className="px-2 py-1.5 text-left">Motivo</th>
                          <th className="px-2 py-1.5 text-left">Detalhe</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(rejeitados.itens || []).length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-2 py-4 text-center text-slate-500">
                              Nenhum item neste filtro.
                            </td>
                          </tr>
                        )}
                        {(rejeitados.itens || []).map((it, idx) => (
                          <tr key={`${it.nome}-${idx}`} className="border-t border-slate-800/80">
                            <td className="px-2 py-1.5 text-slate-400 whitespace-nowrap">{it.cd}</td>
                            <td className="px-2 py-1.5 max-w-xs truncate" title={it.nome}>
                              {it.nome}
                            </td>
                            <td className="px-2 py-1.5 whitespace-nowrap">
                              {it.preco != null
                                ? it.preco.toLocaleString('pt-BR', {
                                    style: 'currency',
                                    currency: 'BRL',
                                  })
                                : '—'}
                            </td>
                            <td className="px-2 py-1.5">{it.estoque ?? '—'}</td>
                            <td className="px-2 py-1.5 text-rose-300 whitespace-nowrap">
                              {(rejeitados.motivos && rejeitados.motivos[it.motivo]) || it.motivo}
                            </td>
                            <td className="px-2 py-1.5 text-slate-500 max-w-sm truncate" title={it.detalhe}>
                              {it.detalhe || (it.score != null ? `score ${it.score}` : '—')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <p className="text-sm text-slate-400">{busyRej ? 'Carregando…' : '—'}</p>
              )}
            </div>
          )}

          {/* Agenda */}
          {agenda && (
            <div className="mb-6 rounded-xl border border-violet-700/40 bg-violet-950/20 p-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-violet-200">Agendamento (seg–sex)</h2>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={agenda.enabled}
                    onChange={(e) => setAgenda({ ...agenda, enabled: e.target.checked })}
                  />
                  Ativo
                </label>
              </div>
              <p className="text-xs text-slate-400">
                O scrape precisa do <strong>PC ligado</strong> (Chromium + .env). Salve a agenda e
                registre a tarefa no Windows. Vercel não roda Playwright de forma confiável.
              </p>
              <div className="grid md:grid-cols-3 gap-3">
                <label className="text-sm">
                  <span className="text-xs text-slate-500">Horário (Brasília)</span>
                  <select
                    value={agenda.hora}
                    onChange={(e) => setAgenda({ ...agenda, hora: e.target.value })}
                    className="mt-1 w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2"
                  >
                    {!HORARIOS.includes(agenda.hora) && (
                      <option value={agenda.hora}>{agenda.hora}</option>
                    )}
                    {HORARIOS.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  <span className="text-xs text-slate-500">Modo</span>
                  <select
                    value={agenda.fonte}
                    onChange={(e) =>
                      setAgenda({
                        ...agenda,
                        fonte: e.target.value as Agenda['fonte'],
                      })
                    }
                    className="mt-1 w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2"
                  >
                    <option value="scrape">Scraping live (recomendado)</option>
                    <option value="temp">Só temp/</option>
                    <option value="both">Temp + scrape</option>
                  </select>
                </label>
                <div className="text-sm">
                  <span className="text-xs text-slate-500">Próxima (estimada)</span>
                  <div className="mt-1 text-violet-200">
                    {proxima ? new Date(proxima).toLocaleString('pt-BR') : '— (desativada)'}
                  </div>
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">Dias</div>
                <div className="flex flex-wrap gap-2">
                  {DIAS.map(({ d, label }) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => toggleDia(d)}
                      className={`px-2.5 py-1 rounded-lg text-xs border ${
                        agenda.dias.includes(d)
                          ? 'bg-violet-600 border-violet-500 text-white'
                          : 'bg-slate-900 border-slate-700 text-slate-400'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              {agenda.lastRunAt && (
                <div className="text-xs text-slate-500">
                  Última execução:{' '}
                  <span className={agenda.lastRunOk ? 'text-emerald-400' : 'text-rose-400'}>
                    {new Date(agenda.lastRunAt).toLocaleString('pt-BR')}
                  </span>
                  {agenda.lastRunMsg ? ` — ${agenda.lastRunMsg.slice(0, 120)}` : ''}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={salvarAgenda}
                  className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-sm font-medium"
                >
                  Salvar agenda
                </button>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `powershell -ExecutionPolicy Bypass -File scripts/v3-install-task-scheduler.ps1`
                    );
                    setAgendaMsg(
                      'Comando copiado. Cole no PowerShell na pasta do projeto para criar a tarefa Windows.'
                    );
                  }}
                  className="px-4 py-2 rounded-lg border border-slate-600 hover:bg-slate-800 text-sm"
                >
                  Copiar comando Task Scheduler
                </button>
              </div>
              <pre className="text-[11px] text-slate-500 whitespace-pre-wrap bg-black/30 rounded-lg p-2">
                {`# No PowerShell (pasta do projeto):
powershell -ExecutionPolicy Bypass -File scripts/v3-install-task-scheduler.ps1

# Teste manual agora:
npm run v3:captura:force`}
              </pre>
              {agendaMsg && <p className="text-xs text-violet-200">{agendaMsg}</p>}
            </div>
          )}

          {msg && (
            <pre className="mb-6 text-xs whitespace-pre-wrap rounded-lg border border-slate-800 bg-black/40 p-3 text-slate-300">
              {msg}
            </pre>
          )}

          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-900 text-slate-400 text-left">
                <tr>
                  <th className="px-3 py-2">CD</th>
                  <th className="px-3 py-2">SKU</th>
                  <th className="px-3 py-2">Nome</th>
                  <th className="px-3 py-2">Preço</th>
                  <th className="px-3 py-2">Estoque</th>
                  <th className="px-3 py-2">OK</th>
                  <th className="px-3 py-2">Fonte</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-3 py-6 text-center text-slate-500">
                      Sem preços. Clique em &quot;Importar dumps temp/&quot; ou scraping live.
                    </td>
                  </tr>
                )}
                {items.map((it) => (
                  <tr key={it.id} className="border-t border-slate-800/80">
                    <td className="px-3 py-2 text-slate-400">{it.cd_nome}</td>
                    <td className="px-3 py-2 font-mono text-xs text-sky-300">{it.sku_interno}</td>
                    <td className="px-3 py-2">{it.nome}</td>
                    <td className="px-3 py-2">
                      {it.preco_custo != null
                        ? it.preco_custo.toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          })
                        : '—'}
                    </td>
                    <td className="px-3 py-2">{it.estoque ?? '—'}</td>
                    <td className="px-3 py-2">{it.valido_estoque ? '✅' : '—'}</td>
                    <td className="px-3 py-2 text-xs text-slate-500">{it.fonte}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
