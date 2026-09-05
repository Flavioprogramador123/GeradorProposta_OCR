import { useCallback, useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { formatBRL } from '@/lib/formatBRL';

interface Stats {
  precosTotal?: number;
  precosValidos?: number;
  equipamentosAtivos?: number;
  estoqueMinimo?: number;
  estoqueMinimoModulo?: number;
  estoqueMinimoOutros?: number;
  porCd?: Array<{
    id?: number;
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

const SECOES_UI = [
  { id: 'todas', label: 'Todas' },
  { id: 'modulos', label: 'Módulos' },
  { id: 'inversores', label: 'Inversores' },
  { id: 'estruturas', label: 'Estruturas' },
  { id: 'cabos', label: 'Cabos' },
  { id: 'materiais-eletricos', label: 'Materiais elétricos' },
] as const;

export default function AdminV3Precos() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [items, setItems] = useState<PrecoRow[]>([]);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [apenasValidos, setApenasValidos] = useState(false);
  const [secao, setSecao] = useState<(typeof SECOES_UI)[number]['id']>('todas');
  const [cdId, setCdId] = useState<number | 0>(0);
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
  const [showConfig, setShowConfig] = useState(false);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (apenasValidos) params.set('validos', '1');
    if (secao && secao !== 'todas') params.set('secao', secao);
    if (cdId) params.set('cdId', String(cdId));
    params.set('ativos', '1');
    const res = await fetch(`/api/v3/precos?${params}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
    setItems(data.items || []);
    setStats(data.stats || null);
  }, [apenasValidos, secao, cdId]);

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
    setShowConfig(true);
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
        <title>Preços por CD — PIENG</title>
      </Head>
      <div className="admin-shell">
        <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div>
              <h1 className="text-3xl font-bold admin-title">Preços por CD</h1>
              <p className="text-sm admin-subtitle">
                Lista principal (ativos) · premissas de estoque em{' '}
                <Link href="/admin/configuracoes" className="text-sky-400 hover:underline">
                  Configurações
                </Link>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/admin"
                className="admin-btn-ghost text-sm"
              >
                🏠 Admin
              </Link>
              <Link
                href="/admin"
                className="admin-btn-ghost text-sm"
              >
                ← Voltar
              </Link>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={apenasValidos}
                  onChange={(e) => setApenasValidos(e.target.checked)}
                />
                Só válidos
              </label>
            </div>
          </div>

          <div className="mb-6 admin-surface">
            <button
              type="button"
              onClick={() => setShowConfig((v) => !v)}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-gray-50 rounded-xl"
            >
              <div>
                <div className="text-sm font-medium text-gray-700">Captura, rejeitados e agenda</div>
                <div className="text-xs text-gray-500">
                  Configuração — importar dumps, scraping, rejeitados e agendamento
                </div>
              </div>
              <span className="text-gray-600 text-sm">{showConfig ? '▲' : '▼'}</span>
            </button>

            {showConfig && (
              <div className="border-t border-gray-200 px-4 pb-4 pt-3 space-y-4">
                <div className="admin-surface border border-gray-200 bg-white p-4 text-sm text-gray-700 space-y-2">
                  <div className="font-medium text-gray-800">O que cada botão faz</div>
                  <ul className="list-disc pl-5 space-y-1 text-gray-600">
                    <li>
                      <span className="text-amber-700">Importar dumps temp/</span> — lê HTML/JSON em{' '}
                      <code className="text-sky-700">temp/</code>, sem Chromium.
                    </li>
                    <li>
                      <span className="text-teal-700">Scraping live (3 CDs)</span> — Playwright no
                      SOOLLAR (Aeroporto + Matriz + Feira). Precisa{' '}
                      <code className="text-sky-700">.env</code>.
                    </li>
                    <li>
                      <span className="text-gray-700">Temp + scrape</span> — importa temp/ e depois
                      scrape live.
                    </li>
                    <li>
                      <span className="text-emerald-700">Captura SOOLLAR</span> — abre a
                      tela dedicada com probe, terminal ao vivo e opções de CD.
                    </li>
                  </ul>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => run('temp')}
                    className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white disabled:opacity-50 text-sm font-medium"
                  >
                    Importar dumps temp/
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => run('scrape')}
                    className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white disabled:opacity-50 text-sm font-medium"
                  >
                    Scraping live (3 CDs)
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => run('both')}
                    className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white disabled:opacity-50 text-sm font-medium"
                  >
                    Temp + scrape
                  </button>
                  <Link
                    href="/admin/soollar-captura"
                    className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-medium inline-flex items-center"
                  >
                    Captura SOOLLAR
                  </Link>
                  <button
                    type="button"
                    disabled={busyRej}
                    onClick={() => abrirRejeitados()}
                    className="px-4 py-2 rounded-lg border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 text-sm font-medium"
                  >
                    Dados rejeitados
                  </button>
                </div>

                {msg && (
                  <pre className="text-xs whitespace-pre-wrap rounded-lg border border-gray-800 bg-gray-900 p-3 text-slate-300">
                    {msg}
                  </pre>
                )}

                {showRejeitados && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h2 className="text-sm font-semibold text-rose-700">
                        Dados rejeitados (última captura)
                      </h2>
                      <button
                        type="button"
                        onClick={() => setShowRejeitados(false)}
                        className="text-xs text-gray-600 hover:text-gray-700"
                      >
                        Fechar
                      </button>
                    </div>
                    {rejeitados?.empty ? (
                      <p className="text-sm text-gray-600">{rejeitados.message}</p>
                    ) : rejeitados ? (
                      <>
                        <div className="flex flex-wrap gap-3 text-xs text-gray-600">
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
                                    : 'bg-white border-gray-300 text-gray-700'
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
                                className="px-2.5 py-1 rounded-lg text-xs text-sky-700"
                              >
                                Limpar filtro
                              </button>
                            )}
                          </div>
                        )}
                        <div className="overflow-x-auto max-h-96 rounded-lg border border-gray-200">
                          <table className="min-w-full text-xs">
                            <thead className="bg-gray-50 text-gray-500 sticky top-0">
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
                                  <td colSpan={6} className="px-2 py-4 text-center text-gray-500">
                                    Nenhum item neste filtro.
                                  </td>
                                </tr>
                              )}
                              {(rejeitados.itens || []).map((it, idx) => (
                                <tr key={`${it.nome}-${idx}`} className="border-t border-gray-200">
                                  <td className="px-2 py-1.5 text-gray-600 whitespace-nowrap">{it.cd}</td>
                                  <td className="px-2 py-1.5 max-w-xs truncate" title={it.nome}>
                                    {it.nome}
                                  </td>
                                  <td className="px-2 py-1.5 whitespace-nowrap">
                                    {it.preco != null ? formatBRL(it.preco) : '—'}
                                  </td>
                                  <td className="px-2 py-1.5">{it.estoque ?? '—'}</td>
                                  <td className="px-2 py-1.5 text-rose-600 whitespace-nowrap">
                                    {(rejeitados.motivos && rejeitados.motivos[it.motivo]) || it.motivo}
                                  </td>
                                  <td
                                    className="px-2 py-1.5 text-gray-500 max-w-sm truncate"
                                    title={it.detalhe}
                                  >
                                    {it.detalhe || (it.score != null ? `score ${it.score}` : '—')}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-gray-600">{busyRej ? 'Carregando…' : '—'}</p>
                    )}
                  </div>
                )}

                {agenda && (
                  <div className="rounded-xl border border-violet-200 bg-violet-50 p-4 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h2 className="text-sm font-semibold text-violet-800">Agendamento</h2>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={agenda.enabled}
                          onChange={(e) => setAgenda({ ...agenda, enabled: e.target.checked })}
                        />
                        Ativo
                      </label>
                    </div>
                    <p className="text-xs text-gray-600">
                      O scrape precisa do PC ligado (Chromium + .env). Salve a agenda e registre a tarefa
                      no Windows.
                    </p>
                    <div className="grid md:grid-cols-3 gap-3">
                      <label className="text-sm">
                        <span className="text-xs text-gray-500">Horário (Brasília)</span>
                        <select
                          value={agenda.hora}
                          onChange={(e) => setAgenda({ ...agenda, hora: e.target.value })}
                          className="mt-1 w-full rounded-lg bg-white border border-gray-300 px-3 py-2"
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
                        <span className="text-xs text-gray-500">Modo</span>
                        <select
                          value={agenda.fonte}
                          onChange={(e) =>
                            setAgenda({
                              ...agenda,
                              fonte: e.target.value as Agenda['fonte'],
                            })
                          }
                          className="mt-1 w-full rounded-lg bg-white border border-gray-300 px-3 py-2"
                        >
                          <option value="scrape">Scraping live (recomendado)</option>
                          <option value="temp">Só temp/</option>
                          <option value="both">Temp + scrape</option>
                        </select>
                      </label>
                      <div className="text-sm">
                        <span className="text-xs text-gray-500">Próxima (estimada)</span>
                        <div className="mt-1 text-violet-800">
                          {proxima ? new Date(proxima).toLocaleString('pt-BR') : '— (desativada)'}
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Dias</div>
                      <div className="flex flex-wrap gap-2">
                        {DIAS.map(({ d, label }) => (
                          <button
                            key={d}
                            type="button"
                            onClick={() => toggleDia(d)}
                            className={`px-2.5 py-1 rounded-lg text-xs border ${
                              agenda.dias.includes(d)
                                ? 'bg-violet-600 border-violet-500 text-white'
                                : 'bg-white border-gray-300 text-gray-600'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                    {agenda.lastRunAt && (
                      <div className="text-xs text-gray-500">
                        Última execução:{' '}
                        <span className={agenda.lastRunOk ? 'text-emerald-600' : 'text-rose-600'}>
                          {new Date(agenda.lastRunAt).toLocaleString('pt-BR')}
                        </span>
                        {agenda.lastRunMsg ? ` — ${agenda.lastRunMsg.slice(0, 120)}` : ''}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={salvarAgenda}
                        className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium"
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
                        className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-100 text-sm"
                      >
                        Copiar comando Task Scheduler
                      </button>
                    </div>
                    <pre className="text-[11px] text-slate-400 whitespace-pre-wrap bg-gray-900 rounded-lg p-2">
                      {`# No PowerShell (pasta do projeto):
powershell -ExecutionPolicy Bypass -File scripts/v3-install-task-scheduler.ps1

# Teste manual agora:
npm run v3:captura:force`}
                    </pre>
                    {agendaMsg && <p className="text-xs text-violet-800">{agendaMsg}</p>}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <div className="admin-surface p-4">
              <div className="text-xs text-gray-500 uppercase">Preços</div>
              <div className="text-3xl font-semibold text-sky-700">{stats?.precosTotal ?? '—'}</div>
              <div className="text-xs text-gray-500">{stats?.precosValidos ?? 0} válidos</div>
            </div>
            <div className="admin-surface p-4 md:col-span-2">
              <div className="text-xs text-gray-500 uppercase mb-2">Por CD</div>
              <div className="flex flex-wrap gap-2">
                {(stats?.porCd || []).map((c) => (
                  <span key={c.slug_portal} className="px-3 py-1 rounded-full bg-gray-100 text-xs">
                    {c.nome}: {c.validos}/{c.total}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="mb-3 admin-surface p-3 space-y-3">
            <div>
              <div className="text-xs text-gray-500 uppercase mb-2">CD</div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setCdId(0)}
                  className={`px-3 py-1.5 rounded-lg text-sm border ${
                    cdId === 0
                      ? 'bg-amber-600 border-amber-500 text-white'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Todos
                </button>
                {(stats?.porCd || []).map((c) => (
                  <button
                    key={c.slug_portal}
                    type="button"
                    onClick={() => setCdId(Number(c.id) || 0)}
                    className={`px-3 py-1.5 rounded-lg text-sm border ${
                      cdId === Number(c.id)
                        ? 'bg-amber-600 border-amber-500 text-white'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {c.nome}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase mb-2">
                Seção do scraping (lista principal)
              </div>
              <div className="flex flex-wrap gap-2">
                {SECOES_UI.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSecao(s.id)}
                    className={`px-3 py-1.5 rounded-lg text-sm border ${
                      secao === s.id
                        ? 'bg-sky-600 border-sky-500 text-white'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-xs text-gray-500">
              Exibindo {items.length} preço(s)
              {cdId
                ? ` · CD: ${(stats?.porCd || []).find((c) => Number(c.id) === cdId)?.nome || cdId}`
                : ''}
              {secao !== 'todas' ? ` · seção: ${SECOES_UI.find((x) => x.id === secao)?.label}` : ''}
            </p>
          </div>

          <div className="overflow-x-auto admin-surface border border-gray-200 mb-6">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-left">
                <tr>
                  <th className="px-3 py-2">CD</th>
                  <th className="px-3 py-2">Seção</th>
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
                    <td colSpan={8} className="px-3 py-6 text-center text-gray-500">
                      Sem preços neste filtro. Troque a seção ou rode a captura.
                    </td>
                  </tr>
                )}
                {items.map((it) => (
                  <tr key={it.id} className="border-t border-gray-200">
                    <td className="px-3 py-2 text-gray-600">{it.cd_nome}</td>
                    <td className="px-3 py-2 text-xs text-amber-700">{it.categoria}</td>
                    <td className="px-3 py-2 font-mono text-xs text-sky-700">{it.sku_interno}</td>
                    <td className="px-3 py-2">{it.nome}</td>
                    <td className="px-3 py-2">
                      {it.preco_custo != null ? formatBRL(it.preco_custo) : '—'}
                    </td>
                    <td className="px-3 py-2">{it.estoque ?? '—'}</td>
                    <td className="px-3 py-2">{it.valido_estoque ? '✅' : '—'}</td>
                    <td className="px-3 py-2 text-xs text-gray-500">{it.fonte}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </div>
        </div>
      </div>
    </>
  );
}
