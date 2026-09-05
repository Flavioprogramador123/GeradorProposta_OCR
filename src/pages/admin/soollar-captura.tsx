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
  hasUser: boolean;
  hasPassword: boolean;
  hasCd?: boolean;
  cdHint?: string | null;
  cdId?: number;
  cdSlug?: string;
  cdUrl?: string;
  cds?: Array<{ id: number; nome: string; slug?: string; rotuloUi?: string }>;
  secoes?: string[];
  secoesUrlsExemplo?: string[];
  estoqueMinimo?: number;
  baseUrl: string;
  loginUrl: string;
  userHint: string | null;
  fluxo?: string[];
  chromiumNotas?: string[];
}

const levelColor: Record<LogLevel, string> = {
  info: 'text-slate-300',
  ok: 'text-emerald-400',
  warn: 'text-amber-300',
  error: 'text-rose-400',
  data: 'text-sky-300',
};

const SECOES_FALLBACK = [
  'modulos',
  'inversores',
  'estruturas-inox',
  'estrutura-galvanizada',
  'cabos',
];

export default function SoolarCapturaPage() {
  const [status, setStatus] = useState<StatusResp | null>(null);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [running, setRunning] = useState(false);
  /** false = Chromium visível (recomendado após testes de seções) */
  const [headless, setHeadless] = useState(false);
  const [quoteUrl, setQuoteUrl] = useState('');
  const [cd, setCd] = useState('');
  const [todosCds, setTodosCds] = useState(false);
  const [importarPrecos, setImportarPrecos] = useState(true);
  const [lastResult, setLastResult] = useState<unknown>(null);
  const terminalRef = useRef<HTMLDivElement>(null);

  const pushLocal = useCallback((level: LogLevel, message: string, data?: unknown) => {
    setLogs((prev) => [...prev, { ts: new Date().toISOString(), level, message, data }]);
  }, []);

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/soollar/captura');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as StatusResp;
      setStatus(data);
      setCd((prev) => prev || data.cdHint || 'Aeroporto');
    } catch (e) {
      pushLocal('error', `Falha ao ler status: ${e instanceof Error ? e.message : String(e)}`);
    }
  }, [pushLocal]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  const runAction = async (action: 'probe' | 'capturar') => {
    if (running) return;
    setRunning(true);
    setLastResult(null);
    pushLocal(
      'info',
      `▶ ${action}${action === 'capturar' ? (todosCds ? ' · 3 CDs' : ` · CD ${cd || 'Aeroporto'}`) : ''} · seções ${
        (status?.secoes || SECOES_FALLBACK).join(', ')
      }`
    );

    try {
      const res = await fetch('/api/admin/soollar/captura', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          stream: true,
          headless,
          quoteUrl: quoteUrl.trim() || undefined,
          cd: todosCds ? undefined : cd.trim() || undefined,
          todosCds,
          importarV3: importarPrecos,
        }),
      });

      if (!res.ok || !res.body) {
        const text = await res.text();
        pushLocal('error', `API falhou: ${res.status} ${text}`);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split('\n\n');
        buffer = chunks.pop() || '';

        for (const chunk of chunks) {
          const line = chunk
            .split('\n')
            .filter((l) => l.startsWith('data:'))
            .map((l) => l.replace(/^data:\s?/, ''))
            .join('');
          if (!line) continue;
          try {
            const evt = JSON.parse(line);
            if (evt.type === 'log' && evt.line) {
              setLogs((prev) => [...prev, evt.line as LogLine]);
            } else if (evt.type === 'done') {
              setLastResult(evt.result);
              pushLocal('ok', '✔ Fluxo finalizado');
            } else if (evt.type === 'error') {
              pushLocal('error', evt.message || 'Erro no stream');
            }
          } catch {
            pushLocal('warn', `Linha SSE inválida: ${line.slice(0, 120)}`);
          }
        }
      }
    } catch (e) {
      pushLocal('error', e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
      loadStatus();
    }
  };

  const secoes = status?.secoes?.length ? status.secoes : SECOES_FALLBACK;
  const urlsExemplo = status?.secoesUrlsExemplo || [];

  return (
    <>
      <Head>
        <title>Captura SOOLLAR | PIENG Admin</title>
      </Head>

      <div className="admin-shell">
        <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold admin-title">Captura SOOLLAR</h1>
              <p className="text-sm admin-subtitle mt-1">
                Captura no PC · login via <code className="text-amber-400">.env</code> · seções
                módulos → inversores → estruturas → cabos.
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                href="/admin"
                className="admin-btn-ghost text-sm"
              >
                🏠 Admin
              </Link>
              <button
                type="button"
                onClick={() => typeof window !== 'undefined' && window.history.back()}
                className="admin-btn-ghost text-sm"
              >
                ← Voltar
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="admin-surface p-4">
              <div className="text-xs uppercase text-gray-500 mb-1">Portal</div>
              <a
                href={status?.loginUrl || 'https://soollar.mygateway.com.br/auth/login'}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 text-sm break-all hover:underline"
              >
                {status?.loginUrl || '…'}
              </a>
            </div>
            <div className="admin-surface p-4">
              <div className="text-xs uppercase text-gray-500 mb-1">Credenciais .env</div>
              <div
                className={`text-sm font-semibold ${status?.configured ? 'text-emerald-600' : 'text-amber-700'}`}
              >
                {status?.configured ? `Configurado (${status.userHint})` : 'Pendente — adicione no .env'}
              </div>
              <div className="text-xs text-gray-600 mt-1">
                CD default: {status?.cdHint || 'Aeroporto'} · estoque &gt; {status?.estoqueMinimo ?? 20}
              </div>
            </div>
            <div className="admin-surface p-4">
              <div className="text-xs uppercase text-gray-500 mb-1">O que o bot varre</div>
              <ul className="text-sm text-gray-700 space-y-0.5">
                {secoes.map((s) => (
                  <li key={s}>
                    <code className="text-sky-700">/secao/{s}</code>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950 space-y-2">
            <strong>Fluxo de preços</strong>
            <ul className="list-disc pl-5 space-y-1 text-sky-900">
              {(status?.chromiumNotas || []).map((n, i) => (
                <li key={i}>{n}</li>
              ))}
              {!status?.chromiumNotas?.length && (
                <>
                  <li>
                    Captura as seções do portal (com paginação) nos CDs configurados
                  </li>
                  <li>
                    Com <strong>Gravar na tabela de preços</strong> marcado, os itens válidos entram no SQLite
                    automaticamente ao fim da captura
                  </li>
                  <li>
                    Revise e gerencie a tabela em{' '}
                    <Link href="/admin/v3/precos" className="underline font-medium text-sky-800">
                      Preços por CD
                    </Link>
                  </li>
                </>
              )}
            </ul>
            {urlsExemplo.length > 0 && (
              <div className="pt-2 border-t border-sky-200">
                <div className="text-xs text-sky-700/80 mb-1">URLs de exemplo (CD atual):</div>
                <div className="flex flex-col gap-0.5">
                  {urlsExemplo.map((u) => (
                    <a
                      key={u}
                      href={u}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-sky-700 break-all hover:underline"
                    >
                      {u}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <strong>No arquivo `.env` (local):</strong>
            <pre className="mt-2 text-xs bg-gray-900 rounded-lg p-3 overflow-x-auto text-amber-100">{`SOOLLAR_BASE_URL=https://soollar.mygateway.com.br
SOOLLAR_USER=seu_usuario_ou_email
SOOLLAR_PASSWORD=sua_senha
SOOLLAR_CD=Aeroporto`}</pre>
            Reinicie o <code>npm run dev</code> se alterar o <code>.env</code>. Não cole a senha no chat.
          </div>

          <div className="admin-surface p-4 space-y-4">
          <div className="flex flex-wrap gap-3 items-end">
            <button
              type="button"
              disabled={running}
              onClick={() => runAction('probe')}
              className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white disabled:opacity-50 text-sm font-medium"
            >
              1) Probe login
            </button>
            <button
              type="button"
              disabled={running || !status?.configured}
              onClick={() => runAction('capturar')}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50 text-sm font-medium"
              title={!status?.configured ? 'Configure o .env primeiro' : 'Login + CD(s) + seções'}
            >
              2) Capturar
            </button>
            <label className="flex items-center gap-2 text-sm text-gray-700 px-2">
              <input type="checkbox" checked={headless} onChange={(e) => setHeadless(e.target.checked)} />
              Headless (sem janela)
            </label>
            <label className="flex items-center gap-2 text-sm text-violet-800 px-2">
              <input type="checkbox" checked={todosCds} onChange={(e) => setTodosCds(e.target.checked)} />
              3 CDs na mesma sessão
            </label>
            <label className="flex items-center gap-2 text-sm text-emerald-800 px-2">
              <input
                type="checkbox"
                checked={importarPrecos}
                onChange={(e) => setImportarPrecos(e.target.checked)}
              />
              Gravar na tabela de preços
            </label>
            <div className="min-w-[220px]">
              <label className="block text-xs text-gray-500 mb-1">CD / Central</label>
              <select
                value={cd}
                onChange={(e) => setCd(e.target.value)}
                disabled={todosCds}
                className="w-full rounded-lg bg-white border border-gray-300 px-3 py-2 text-sm disabled:opacity-40"
              >
                {(status?.cds || []).map((c) => (
                  <option key={c.id} value={c.nome}>
                    {c.id} — {c.rotuloUi || c.nome}
                  </option>
                ))}
                {!status?.cds?.length && (
                  <>
                    <option value="Aeroporto">1 - GO - AEROPORTO</option>
                    <option value="Matriz">2 - GO - MATRIZ</option>
                    <option value="Feira de Santana">3 - BA - FEIRA DE SANTANA</option>
                  </>
                )}
              </select>
            </div>
            <div className="flex-1 min-w-[220px]">
              <label className="block text-xs text-gray-500 mb-1">
                URL única (opcional — pula seções automáticas)
              </label>
              <input
                value={quoteUrl}
                onChange={(e) => setQuoteUrl(e.target.value)}
                placeholder="ex.: …/cd/cdaeroportogo/secao/estruturas-inox"
                className="w-full rounded-lg bg-white border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <button
              type="button"
              onClick={() => setLogs([])}
              className="px-3 py-2 rounded-lg border border-gray-300 text-sm hover:bg-gray-100"
            >
              Limpar terminal
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200">
            <p className="text-xs text-gray-600 max-w-xl">
              Após a captura, confira os preços gravados e rejeitados na tabela por CD.
            </p>
            <Link
              href="/admin/v3/precos"
              className="inline-flex items-center px-4 py-2 rounded-lg bg-violet-700 hover:bg-violet-600 text-white text-sm font-medium"
            >
              Abrir tabela de preços →
            </Link>
          </div>
          </div>

          <div className="admin-surface border border-gray-200 p-3">
            <div
              ref={terminalRef}
              className="h-[420px] overflow-y-auto rounded-lg border border-gray-800 bg-black font-mono text-xs leading-relaxed p-4 text-slate-100"
            >
              {logs.length === 0 ? (
                <div className="text-slate-600">
                  Aguardando… deixe Headless desmarcado para acompanhar o navegador nas 5 seções.
                </div>
              ) : (
                logs.map((line, i) => (
                  <div key={`${line.ts}-${i}`} className="whitespace-pre-wrap break-words mb-1">
                    <span className="text-slate-600">{new Date(line.ts).toLocaleTimeString('pt-BR')} </span>
                    <span className={levelColor[line.level]}>[{line.level}]</span>{' '}
                    <span className={levelColor[line.level]}>{line.message}</span>
                    {line.data !== undefined && (
                      <pre className="text-slate-400 pl-4 mt-0.5 overflow-x-auto">
                        {typeof line.data === 'string' ? line.data : JSON.stringify(line.data, null, 2)}
                      </pre>
                    )}
                  </div>
                ))
              )}
              {running && <div className="text-amber-300 animate-pulse mt-2">● Captura em execução…</div>}
            </div>
          </div>

          {lastResult != null && (
            <div className="admin-surface p-4">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                <h2 className="text-sm font-semibold">Último resultado estruturado</h2>
                <Link
                  href="/admin/v3/precos"
                  className="inline-flex items-center px-3 py-1.5 rounded-lg bg-violet-700 hover:bg-violet-600 text-white text-xs font-medium"
                >
                  Abrir tabela de preços →
                </Link>
              </div>
              <pre className="text-xs overflow-x-auto text-gray-700">
                {JSON.stringify(lastResult, null, 2)}
              </pre>
            </div>
          )}
          </div>
        </div>
      </div>
    </>
  );
}
