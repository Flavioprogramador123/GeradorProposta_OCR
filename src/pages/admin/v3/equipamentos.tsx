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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set('q', q.trim());
      if (categoria) params.set('categoria', categoria);
      params.set('ativo', '1');
      const res = await fetch(`/api/v3/equipamentos?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
      setItems(data.items || []);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [q, categoria]);

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

  return (
    <>
      <Head>
        <title>V3 Equipamentos — PIENG</title>
      </Head>
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div>
              <Link href="/admin/v3" className="text-xs text-sky-400 hover:underline">
                ← V3 home
              </Link>
              <h1 className="text-2xl font-semibold mt-1">1a · Equipamentos (SQLite)</h1>
            </div>
            <div className="flex gap-2">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar…"
                className="rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm"
              />
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm"
              >
                <option value="">Todas</option>
                {CATEGORIAS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {msg && <p className="mb-4 text-sm text-amber-200">{msg}</p>}

          <form
            onSubmit={onSubmit}
            className="mb-8 grid md:grid-cols-3 gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4"
          >
            <input
              required
              value={form.sku_interno}
              onChange={(e) => setForm({ ...form, sku_interno: e.target.value })}
              placeholder="SKU interno *"
              className="rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm"
            />
            <input
              required
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              placeholder="Nome *"
              className="rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm md:col-span-2"
            />
            <input
              value={form.marca}
              onChange={(e) => setForm({ ...form, marca: e.target.value })}
              placeholder="Marca"
              className="rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm"
            />
            <select
              value={form.categoria}
              onChange={(e) => setForm({ ...form, categoria: e.target.value as Categoria })}
              className="rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm"
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
              className="rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm"
            />
            <input
              value={form.potencia_w}
              onChange={(e) => setForm({ ...form, potencia_w: e.target.value })}
              placeholder="Potência W (módulo)"
              className="rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm"
            />
            <input
              value={form.potencia_kw}
              onChange={(e) => setForm({ ...form, potencia_kw: e.target.value })}
              placeholder="Potência kW (inversor)"
              className="rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm"
            />
            <input
              value={form.aliases}
              onChange={(e) => setForm({ ...form, aliases: e.target.value })}
              placeholder="Aliases separados por |"
              className="rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm md:col-span-2"
            />
            <button type="submit" className="rounded-lg bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-sm font-medium">
              Adicionar
            </button>
          </form>

          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-900 text-slate-400 text-left">
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
                    <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
                      Carregando…
                    </td>
                  </tr>
                )}
                {!loading && items.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
                      Nenhum equipamento. Rode o seed em /admin/v3
                    </td>
                  </tr>
                )}
                {items.map((it) => (
                  <tr key={it.id} className="border-t border-slate-800/80 hover:bg-slate-900/40">
                    <td className="px-3 py-2 font-mono text-xs text-sky-300">{it.sku_interno}</td>
                    <td className="px-3 py-2">{it.nome}</td>
                    <td className="px-3 py-2 text-slate-400">{it.categoria}</td>
                    <td className="px-3 py-2">{it.marca || '—'}</td>
                    <td className="px-3 py-2 text-slate-400">
                      {it.potencia_w ? `${it.potencia_w}W` : it.potencia_kw ? `${it.potencia_kw}kW` : '—'}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => desativar(it.id, it.nome)}
                        className="text-xs text-rose-400 hover:underline"
                      >
                        desativar
                      </button>
                    </td>
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
