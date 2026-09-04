import { useCallback, useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';

interface Health {
  ok: boolean;
  equipamentosAtivos?: number;
  equipamentosTotal?: number;
  porCategoria?: Array<{ categoria: string; c: number }>;
  cds?: Array<{ nome: string; slug_portal: string }>;
  precosRegistrados?: number;
  dbPath?: string;
  message?: string;
  hint?: string;
  pipeline?: string[];
}

export default function AdminV3Home() {
  const [health, setHealth] = useState<Health | null>(null);
  const [seedMsg, setSeedMsg] = useState<string>('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/v3/health');
      const data = await res.json();
      setHealth(data);
    } catch (e) {
      setHealth({ ok: false, message: e instanceof Error ? e.message : String(e) });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const runSeed = async () => {
    setBusy(true);
    setSeedMsg('');
    try {
      const res = await fetch('/api/v3/seed', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
      setSeedMsg(
        `Seed OK: ${data.created} criados, ${data.updated} atualizados (${data.skus?.length || 0} SKUs). Arquivo: ${data.path}`
      );
      await load();
    } catch (e) {
      setSeedMsg(`Erro: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Head>
        <title>V3 Orçamento — PIENG</title>
      </Head>
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between gap-4 mb-8">
            <div>
              <p className="text-xs uppercase tracking-widest text-amber-400/80">Espelho · não afeta produção</p>
              <h1 className="text-3xl font-semibold mt-1">Módulo V3 — Orçamento</h1>
              <p className="text-slate-400 text-sm mt-1">
                Cadastro SQLite → preços scraping → orçamento base → proposta automática
              </p>
            </div>
            <Link href="/admin" className="text-sm text-sky-400 hover:underline">
              ← Admin v2
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-4 mb-8">
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
              <div className="text-xs text-slate-500 uppercase">SQLite</div>
              <div className={`text-lg font-semibold ${health?.ok ? 'text-emerald-400' : 'text-rose-400'}`}>
                {health?.ok ? 'OK' : 'Falhou'}
              </div>
              <div className="text-xs text-slate-500 mt-1 break-all">{health?.dbPath || '…'}</div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
              <div className="text-xs text-slate-500 uppercase">Equipamentos ativos</div>
              <div className="text-3xl font-semibold text-sky-300">{health?.equipamentosAtivos ?? '—'}</div>
              <div className="text-xs text-slate-500 mt-1">total {health?.equipamentosTotal ?? 0}</div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
              <div className="text-xs text-slate-500 uppercase">Preços (fase 2a)</div>
              <div className="text-3xl font-semibold text-slate-300">{health?.precosRegistrados ?? 0}</div>
              <div className="text-xs text-slate-500 mt-1">ainda não coletados</div>
            </div>
          </div>

          {health?.message && (
            <div className="mb-6 rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">
              {health.message}
              {health.hint && <div className="mt-1 text-xs opacity-80">{health.hint}</div>}
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4 mb-8">
            <Link
              href="/admin/v3/equipamentos"
              className="block rounded-xl border border-slate-700 bg-gradient-to-br from-sky-900/40 to-slate-900 p-6 hover:border-sky-500/60 transition"
            >
              <div className="text-2xl mb-2">1a</div>
              <h2 className="text-xl font-semibold">Cadastro de equipamentos</h2>
              <p className="text-sm text-slate-400 mt-1">CRUD SQLite · módulos, inversores, cabos, estrutura</p>
            </Link>
            <Link
              href="/admin/v3/precos"
              className="block rounded-xl border border-slate-700 bg-gradient-to-br from-teal-900/40 to-slate-900 p-6 hover:border-teal-500/60 transition"
            >
              <div className="text-2xl mb-2">2a</div>
              <h2 className="text-xl font-semibold">Preços por CD</h2>
              <p className="text-sm text-slate-400 mt-1">
                Import temp/ ou scraping · estoque &gt; {health?.ok ? '20' : '20'}
              </p>
              <p className="text-xs text-teal-300/80 mt-2">
                {health?.precosRegistrados ?? 0} preços registrados
              </p>
            </Link>
            <Link
              href="/admin/v3/orcamento-base"
              className="block rounded-xl border border-slate-700 bg-gradient-to-br from-emerald-900/40 to-slate-900 p-6 hover:border-emerald-500/60 transition"
            >
              <div className="text-2xl mb-2">3a</div>
              <h2 className="text-xl font-semibold">Orçamento base</h2>
              <p className="text-sm text-slate-400 mt-1">
                Semi-auto: monta kits e envia ao Gerador (5a)
              </p>
            </Link>
            <Link
              href="/admin/v3/proposta-auto"
              className="block rounded-xl border border-slate-700 bg-gradient-to-br from-violet-900/40 to-slate-900 p-6 hover:border-violet-500/60 transition"
            >
              <div className="text-2xl mb-2">4a</div>
              <h2 className="text-xl font-semibold">Proposta automática</h2>
              <p className="text-sm text-slate-400 mt-1">
                Auto puro: faixa de geração → alternativas + PIX
              </p>
            </Link>
          </div>

          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5 mb-6">
            <h3 className="font-semibold text-amber-200">Seed inicial</h3>
            <p className="text-sm text-slate-400 mt-1">
              Extrai módulos/inversores únicos de <code className="text-amber-100">temp/orcamento_executados.yaml</code> +
              auxiliares (estrutura/cabos/MC4).
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={runSeed}
              className="mt-3 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-sm font-medium"
            >
              {busy ? 'Seed…' : 'Rodar seed do YAML'}
            </button>
            {seedMsg && <p className="mt-3 text-sm text-slate-300 whitespace-pre-wrap">{seedMsg}</p>}
          </div>

          {health?.porCategoria && health.porCategoria.length > 0 && (
            <div className="rounded-xl border border-slate-800 p-4">
              <h3 className="text-sm font-semibold text-slate-300 mb-3">Por categoria</h3>
              <div className="flex flex-wrap gap-2">
                {health.porCategoria.map((c) => (
                  <span key={c.categoria} className="px-3 py-1 rounded-full bg-slate-800 text-xs">
                    {c.categoria}: {c.c}
                  </span>
                ))}
              </div>
            </div>
          )}

          {health?.cds && (
            <div className="mt-4 text-xs text-slate-500">
              CDs: {health.cds.map((c) => `${c.nome} (${c.slug_portal})`).join(' · ')}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
