import { useCallback, useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';

type LogLevel = 'info' | 'ok' | 'warn' | 'error' | 'data';

interface LogLine {
  ts: string;
  level: LogLevel;
  message: string;
  data?: unknown;
}

interface StatusResp {
  configured: boolean;
  serverless?: boolean;
  hasUser: boolean;
  hasPassword: boolean;
  baseUrl: string;
  loginUrl: string;
  catalogUrl: string;
  cdSlug: string;
  cdNome: string;
  cdId: number | null;
  userHint: string | null;
  fluxo?: string[];
}

const levelColor: Record<LogLevel, string> = {
  info: 'text-slate-300',
  ok: 'text-emerald-400',
  warn: 'text-amber-300',
  error: 'text-rose-400',
  data: 'text-sky-300',
};

export default function FortlevCapturaPage() {
  const [status, setStatus] = useState<StatusResp | null>(null);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [running, setRunning] = useState(false);
  const [headless, setHeadless] = useState(true);
  const [importarV3, setImportarV3] = useState(true);
  const [lastResult, setLastResult] = useState<unknown>(null);
  const abortRef = useRef<AbortController | null>(null);
  const logEndRef = useRef<HTMLDivElement | null>(null);

  const loadStatus = useCallback(async () => {
    const res = await fetch('/api/admin/fortlev/captura');
    const data = (await res.json()) as StatusResp;
    setStatus(data);
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const run = async (action: 'probe' | 'capturar') => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setRunning(true);
    setLogs([]);
    setLastResult(null);
    try {
      const res = await fetch('/api/admin/fortlev/captura', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, headless, importarV3, stream: true }),
        signal: ac.signal,
      });
      if (!res.ok || !res.body) {
        const t = await res.text();
        setLogs((prev) => [
          ...prev,
          {
            ts: new Date().toISOString(),
            level: 'error',
            message: `HTTP ${res.status}: ${t.slice(0, 300)}`,
          },
        ]);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split('\n\n');
        buf = parts.pop() || '';
        for (const part of parts) {
          const line = part
            .split('\n')
            .filter((l) => l.startsWith('data: '))
            .map((l) => l.slice(6))
            .join('');
          if (!line) continue;
          try {
            const ev = JSON.parse(line) as {
              type: string;
              line?: LogLine;
              result?: unknown;
              message?: string;
            };
            if (ev.type === 'log' && ev.line) setLogs((p) => [...p, ev.line!]);
            if (ev.type === 'done') setLastResult(ev.result ?? ev);
            if (ev.type === 'error') {
              setLogs((p) => [
                ...p,
                {
                  ts: new Date().toISOString(),
                  level: 'error',
                  message: ev.message || 'erro',
                },
              ]);
            }
          } catch {
            /* ignore */
          }
        }
      }
      await loadStatus();
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
      setLogs((p) => [
        ...p,
        {
          ts: new Date().toISOString(),
          level: 'error',
          message: e instanceof Error ? e.message : String(e),
        },
      ]);
    } finally {
      setRunning(false);
    }
  };

  return (
    <>
      <Head>
        <title>Captura Fortlev | PIENG Admin</title>
      </Head>
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold admin-title">Captura Fortlev</h1>
              <p className="text-sm text-slate-600 mt-1">
                Catálogo{' '}
                <a
                  href={status?.catalogUrl || 'https://fortlevsolar.app/produto-avulso'}
                  className="text-sky-700 underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  produto-avulso
                </a>{' '}
                · 1 CD · BOM ≈ kit 391003
              </p>
            </div>
            <div className="flex gap-2 text-sm">
              <Link href="/admin/soollar-captura" className="text-sky-700 underline">
                SOOLLAR
              </Link>
              <Link href="/admin/v3/precos" className="text-sky-700 underline">
                Preços V3
              </Link>
              <Link href="/admin" className="text-slate-600 underline">
                Admin
              </Link>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="admin-surface p-4">
              <div className="text-xs uppercase text-gray-500 mb-1">Credenciais</div>
              <div
                className={`text-sm font-semibold ${status?.configured ? 'text-emerald-600' : 'text-amber-700'}`}
              >
                {status?.configured ? `OK (${status.userHint})` : 'Pendente no .env'}
              </div>
            </div>
            <div className="admin-surface p-4">
              <div className="text-xs uppercase text-gray-500 mb-1">CD V3</div>
              <div className="text-sm font-semibold">
                {status?.cdNome || 'Fortlev'}{' '}
                <code className="text-xs text-slate-500">{status?.cdSlug || 'fortlev'}</code>
              </div>
            </div>
            <div className="admin-surface p-4">
              <div className="text-xs uppercase text-gray-500 mb-1">Portal</div>
              <a
                href={status?.loginUrl}
                className="text-sky-700 text-sm break-all underline"
                target="_blank"
                rel="noreferrer"
              >
                {status?.loginUrl || '…'}
              </a>
            </div>
          </div>

          <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950 space-y-1">
            {(status?.fluxo || []).map((f, i) => (
              <div key={i}>• {f}</div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={headless}
                onChange={(e) => setHeadless(e.target.checked)}
              />
              Headless
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={importarV3}
                onChange={(e) => setImportarV3(e.target.checked)}
              />
              Gravar na tabela de preços
            </label>
            <button
              type="button"
              disabled={running}
              onClick={() => void run('probe')}
              className="px-4 py-2 rounded-lg bg-slate-700 text-white text-sm disabled:opacity-50"
            >
              Probe
            </button>
            <button
              type="button"
              disabled={running || (!status?.configured && !status?.serverless)}
              onClick={() => void run('capturar')}
              className="px-4 py-2 rounded-lg bg-teal-700 text-white text-sm font-medium disabled:opacity-50"
            >
              {running ? 'Capturando…' : 'Capturar produto-avulso'}
            </button>
          </div>

          {status?.serverless && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              Nuvem (Vercel): Playwright não roda aqui. O botão enfileira um job{' '}
              <code>fortlev_scrape</code> no Supabase e o worker do PC
              (<code>npm run v3:jobs:worker</code>) executa a captura e publica. O log abaixo
              confirma o enfileiramento — o progresso detalhado fica no PC.
            </div>
          )}

          <div className="rounded-xl bg-slate-900 text-slate-100 p-4 font-mono text-xs h-80 overflow-y-auto">
            {logs.length === 0 && (
              <div className="text-slate-500">Logs da captura aparecerão aqui…</div>
            )}
            {logs.map((l, i) => (
              <div key={i} className={levelColor[l.level] || 'text-slate-300'}>
                [{l.ts.slice(11, 19)}] {l.message}
                {l.data !== undefined ? ` ${JSON.stringify(l.data)}` : ''}
              </div>
            ))}
            <div ref={logEndRef} />
          </div>

          {lastResult != null && (
            <details className="admin-surface p-4">
              <summary className="cursor-pointer text-sm font-medium">Último resultado JSON</summary>
              <pre className="mt-2 text-xs overflow-x-auto max-h-96">
                {JSON.stringify(lastResult, null, 2)}
              </pre>
            </details>
          )}
        </div>
      </div>
    </>
  );
}
