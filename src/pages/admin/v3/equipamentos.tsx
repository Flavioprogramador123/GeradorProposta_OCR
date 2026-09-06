import { FormEvent, useCallback, useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';

type Categoria =
  | 'modulo'
  | 'inversor'
  | 'microinversor'
  | 'estrutura'
  | 'cabo'
  | 'conector'
  | 'miscelanea'
  | 'protecao'
  | 'outro';

interface Equipamento {
  id: number;
  sku_interno: string;
  sku_soollar: string | null;
  nome: string;
  marca: string | null;
  categoria: Categoria;
  potencia_w: number | null;
  potencia_kw: number | null;
  ativo: number;
  prioridade_kit: number;
  aliases: string[];
}

const CATEGORIAS: Categoria[] = [
  'modulo',
  'inversor',
  'microinversor',
  'estrutura',
  'cabo',
  'conector',
  'miscelanea',
  'protecao',
  'outro',
];

const emptyForm = {
  sku_interno: '',
  sku_soollar: '',
  nome: '',
  marca: '',
  categoria: 'modulo' as Categoria,
  potencia_w: '',
  potencia_kw: '',
  aliases: '',
};

export default function AdminV3Equipamentos() {
  const [items, setItems] = useState<Equipamento[]>([]);
  const [q, setQ] = useState('');
  const [categoria, setCategoria] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const [filtroAtivo, setFiltroAtivo] = useState<'1' | '0' | 'all'>('1');
  const [seedBusy, setSeedBusy] = useState(false);
  const [seedMsg, setSeedMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set('q', q.trim());
      if (categoria) params.set('categoria', categoria);
      if (filtroAtivo !== 'all') params.set('ativo', filtroAtivo);
      const res = await fetch(`/api/v3/equipamentos?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
      setItems(data.items || []);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [q, categoria, filtroAtivo]);

  useEffect(() => {
    load();
  }, [load]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMsg('');
    try {
      const res = await fetch('/api/v3/equipamentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku_interno: form.sku_interno,
          sku_soollar: form.sku_soollar || null,
          nome: form.nome,
          marca: form.marca || null,
          categoria: form.categoria,
          potencia_w: form.potencia_w ? Number(form.potencia_w) : null,
          potencia_kw: form.potencia_kw ? Number(form.potencia_kw) : null,
          aliases: form.aliases
            .split('|')
            .map((s) => s.trim())
            .filter(Boolean),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
      setForm(emptyForm);
      setMsg(`Criado: ${data.item.sku_interno}`);
      await load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    }
  };

  const desativar = async (id: number, nome: string) => {
    if (!confirm(`Desativar ${nome}?`)) return;
    const res = await fetch(`/api/v3/equipamentos/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.message || 'Falha ao desativar');
      return;
    }
    await load();
  };

  const ativar = async (id: number, nome: string) => {
    const res = await fetch(`/api/v3/equipamentos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ativo: true }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.message || 'Falha ao ativar');
      return;
    }
    setMsg(`Ativado: ${nome}`);
    await load();
  };

  const runSeed = async () => {
    setSeedBusy(true);
    setSeedMsg('');
    try {
      const res = await fetch('/api/v3/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
      setSeedMsg(
        `Seed OK: ${data.created} criados, ${data.updated} atualizados (${data.skus?.length || 0} SKUs).`
      );
      await load();
    } catch (e) {
      setSeedMsg(`Erro: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSeedBusy(false);
    }
  };

  return (
    <>
      <Head>
        <title>Equipamentos — PIENG</title>
      </Head>
      <div className="admin-shell">
        <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-start mb-6">
            <div className="min-w-0">
              <h1 className="text-3xl font-bold admin-title">Equipamentos</h1>
              <p className="text-sm admin-subtitle mt-1">Cadastro SQLite · módulos, inversores e auxiliares</p>
            </div>
            <div className="flex gap-2 flex-wrap items-center flex-shrink-0">
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
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar…"
                className="rounded-lg bg-white border border-gray-300 px-3 py-2 text-sm"
              />
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="rounded-lg bg-white border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">Todas</option>
                {CATEGORIAS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <select
                value={filtroAtivo}
                onChange={(e) => setFiltroAtivo(e.target.value as '1' | '0' | 'all')}
                className="rounded-lg bg-white border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="1">Ativos</option>
                <option value="0">Inativos (consulta)</option>
                <option value="all">Todos</option>
              </select>
            </div>
          </div>

          {msg && <p className="mb-4 text-sm text-amber-300">{msg}</p>}

          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
            <h3 className="font-semibold text-amber-900 text-sm">Seed inicial</h3>
            <p className="text-xs text-amber-800 mt-1">
              Extrai módulos/inversores de <code className="bg-amber-100 px-1 rounded">temp/orcamento_executados.yaml</code> +
              auxiliares (estrutura/cabos/MC4).
            </p>
            <button
              type="button"
              disabled={seedBusy}
              onClick={runSeed}
              className="mt-3 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white disabled:opacity-50 text-sm font-medium"
            >
              {seedBusy ? 'Seed…' : 'Rodar seed do YAML'}
            </button>
            {seedMsg && <p className="mt-2 text-sm text-amber-900 whitespace-pre-wrap">{seedMsg}</p>}
          </div>

          <form
            onSubmit={onSubmit}
            className="mb-8 grid md:grid-cols-3 gap-3 admin-surface p-4"
          >
            <input
              required
              value={form.sku_interno}
              onChange={(e) => setForm({ ...form, sku_interno: e.target.value })}
              placeholder="SKU interno *"
              className="rounded-lg bg-white border border-gray-300 px-3 py-2 text-sm"
            />
            <input
              required
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              placeholder="Nome *"
              className="rounded-lg bg-white border border-gray-300 px-3 py-2 text-sm md:col-span-2"
            />
            <input
              value={form.marca}
              onChange={(e) => setForm({ ...form, marca: e.target.value })}
              placeholder="Marca"
              className="rounded-lg bg-white border border-gray-300 px-3 py-2 text-sm"
            />
            <select
              value={form.categoria}
              onChange={(e) => setForm({ ...form, categoria: e.target.value as Categoria })}
              className="rounded-lg bg-white border border-gray-300 px-3 py-2 text-sm"
            >
              {CATEGORIAS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <input
              value={form.sku_soollar}
              onChange={(e) => setForm({ ...form, sku_soollar: e.target.value })}
              placeholder="REF SOOLLAR"
              className="rounded-lg bg-white border border-gray-300 px-3 py-2 text-sm"
            />
            <input
              value={form.potencia_w}
              onChange={(e) => setForm({ ...form, potencia_w: e.target.value })}
              placeholder="Potência W (módulo)"
              className="rounded-lg bg-white border border-gray-300 px-3 py-2 text-sm"
            />
            <input
              value={form.potencia_kw}
              onChange={(e) => setForm({ ...form, potencia_kw: e.target.value })}
              placeholder="Potência kW (inversor)"
              className="rounded-lg bg-white border border-gray-300 px-3 py-2 text-sm"
            />
            <input
              value={form.aliases}
              onChange={(e) => setForm({ ...form, aliases: e.target.value })}
              placeholder="Aliases separados por |"
              className="rounded-lg bg-white border border-gray-300 px-3 py-2 text-sm md:col-span-2"
            />
            <button type="submit" className="rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 text-sm font-medium">
              Adicionar
            </button>
          </form>

          <div className="overflow-x-auto admin-surface border border-gray-200">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-left">
                <tr>
                  <th className="px-3 py-2">SKU</th>
                  <th className="px-3 py-2">Nome</th>
                  <th className="px-3 py-2">Cat.</th>
                  <th className="px-3 py-2">Marca</th>
                  <th className="px-3 py-2">Pot.</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-gray-500">
                      Carregando…
                    </td>
                  </tr>
                )}
                {!loading && items.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-gray-500">
                      Nenhum equipamento. Use o seed YAML abaixo.
                    </td>
                  </tr>
                )}
                {items.map((it) => (
                  <tr key={it.id} className="border-t border-gray-200 hover:bg-gray-50">
                    <td className="px-3 py-2 font-mono text-xs text-sky-700">{it.sku_interno}</td>
                    <td className="px-3 py-2">{it.nome}</td>
                    <td className="px-3 py-2 text-gray-600">{it.categoria}</td>
                    <td className="px-3 py-2">{it.marca || '—'}</td>
                    <td className="px-3 py-2 text-gray-600">
                      {it.potencia_w ? `${it.potencia_w}W` : it.potencia_kw ? `${it.potencia_kw}kW` : '—'}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {it.ativo ? (
                        <button
                          type="button"
                          onClick={() => desativar(it.id, it.nome)}
                          className="text-xs text-rose-600 hover:underline"
                        >
                          desativar
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => ativar(it.id, it.nome)}
                          className="text-xs text-emerald-600 hover:underline"
                        >
                          ativar
                        </button>
                      )}
                    </td>
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
