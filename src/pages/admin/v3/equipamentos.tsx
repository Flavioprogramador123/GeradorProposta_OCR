import { FormEvent, useCallback, useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { formatBRL } from '@/lib/formatBRL';

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
  precos?: Array<{
    cd_id: number;
    cd_nome: string;
    preco_custo: number | null;
    fonte: string | null;
  }>;
  divergencia?: {
    equipamento_id: number;
    sku_interno: string;
    razao: number;
    preco_min: number;
    preco_max: number;
    alerta: string;
  } | null;
}

interface CdInfo {
  id: number;
  codigo: number;
  nome: string;
  slug_portal: string;
}

interface PrecoLinha {
  cd_id: number;
  cd_nome: string;
  preco_custo: number | null;
  estoque: number | null;
  fonte: string | null;
  valido_estoque: number;
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

type FormState = typeof emptyForm;

export default function AdminV3Equipamentos() {
  const [items, setItems] = useState<Equipamento[]>([]);
  const [cds, setCds] = useState<CdInfo[]>([]);
  const [q, setQ] = useState('');
  const [categoria, setCategoria] = useState('');
  const [form, setForm] = useState<FormState>(emptyForm);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [filtroAtivo, setFiltroAtivo] = useState<'1' | '0' | 'all'>('1');

  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<FormState>(emptyForm);
  const [precosDraft, setPrecosDraft] = useState<
    Record<number, { preco: string; estoque: string; fonte: string | null }>
  >({});
  const [saving, setSaving] = useState(false);
  const [divergenciasCount, setDivergenciasCount] = useState(0);

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
      if (Array.isArray(data.cds)) setCds(data.cds);
      setDivergenciasCount(Array.isArray(data.divergencias) ? data.divergencias.length : 0);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [q, categoria, filtroAtivo]);

  useEffect(() => {
    load();
  }, [load]);

  const abrirEdicao = async (it: Equipamento) => {
    setEditId(it.id);
    setEditForm({
      sku_interno: it.sku_interno,
      sku_soollar: it.sku_soollar || '',
      nome: it.nome,
      marca: it.marca || '',
      categoria: it.categoria,
      potencia_w: it.potencia_w != null ? String(it.potencia_w) : '',
      potencia_kw: it.potencia_kw != null ? String(it.potencia_kw) : '',
      aliases: (it.aliases || []).join(' | '),
    });
    setMsg('');
    try {
      const res = await fetch(`/api/v3/equipamentos/${it.id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
      const draft: Record<number, { preco: string; estoque: string; fonte: string | null }> = {};
      const precos = (data.precos || []) as PrecoLinha[];
      const cdsList = cds.length
        ? cds
        : precos.map((p) => ({ id: p.cd_id, codigo: p.cd_id, nome: p.cd_nome, slug_portal: '' }));
      for (const cd of cdsList) {
        const p = precos.find((x) => x.cd_id === cd.id);
        draft[cd.id] = {
          preco: p?.preco_custo != null ? String(p.preco_custo) : '',
          estoque: p?.estoque != null ? String(p.estoque) : '',
          fonte: p?.fonte || null,
        };
      }
      setPrecosDraft(draft);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    }
  };

  const fecharEdicao = () => {
    setEditId(null);
    setEditForm(emptyForm);
    setPrecosDraft({});
  };

  const payloadFromForm = (f: FormState) => ({
    sku_interno: f.sku_interno,
    sku_soollar: f.sku_soollar || null,
    nome: f.nome,
    marca: f.marca || null,
    categoria: f.categoria,
    potencia_w: f.potencia_w ? Number(f.potencia_w) : null,
    potencia_kw: f.potencia_kw ? Number(f.potencia_kw) : null,
    aliases: f.aliases
      .split('|')
      .map((s) => s.trim())
      .filter(Boolean),
  });

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    setMsg('');
    setSaving(true);
    try {
      const res = await fetch('/api/v3/equipamentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadFromForm(form)),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
      setForm(emptyForm);
      setMsg(`Criado: ${data.item.sku_interno} — edite para definir preços por CD (fonte manual)`);
      await load();
      if (data.item?.id) await abrirEdicao(data.item);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const onSaveEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editId) return;
    setSaving(true);
    setMsg('');
    try {
      const precos = Object.entries(precosDraft).map(([cdId, v]) => ({
        cdId: Number(cdId),
        preco_custo: v.preco.trim() === '' ? null : Number(v.preco.replace(',', '.')),
        estoque: v.estoque.trim() === '' ? null : Number(v.estoque),
      }));
      const res = await fetch(`/api/v3/equipamentos/${editId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payloadFromForm(editForm),
          precos,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
      setMsg(`Salvo (cadastro + preços fonte=manual) · aparece em Preços por CD`);
      await load();
      if (data.precos) {
        const draft: typeof precosDraft = {};
        for (const p of data.precos as PrecoLinha[]) {
          draft[p.cd_id] = {
            preco: p.preco_custo != null ? String(p.preco_custo) : '',
            estoque: p.estoque != null ? String(p.estoque) : '',
            fonte: p.fonte || null,
          };
        }
        setPrecosDraft(draft);
      }
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
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
    if (editId === id) fecharEdicao();
    setMsg(`Desativado: ${nome}`);
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

  const renderFormFields = (
    state: FormState,
    set: (f: FormState) => void,
    opts?: { skuLocked?: boolean }
  ) => (
    <>
      <input
        required
        value={state.sku_interno}
        disabled={opts?.skuLocked}
        onChange={(e) => set({ ...state, sku_interno: e.target.value })}
        placeholder="SKU interno *"
        className="rounded-lg bg-white border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100"
      />
      <input
        required
        value={state.nome}
        onChange={(e) => set({ ...state, nome: e.target.value })}
        placeholder="Nome *"
        className="rounded-lg bg-white border border-gray-300 px-3 py-2 text-sm md:col-span-2"
      />
      <input
        value={state.marca}
        onChange={(e) => set({ ...state, marca: e.target.value })}
        placeholder="Marca (tag)"
        className="rounded-lg bg-white border border-gray-300 px-3 py-2 text-sm"
      />
      <select
        value={state.categoria}
        onChange={(e) => set({ ...state, categoria: e.target.value as Categoria })}
        className="rounded-lg bg-white border border-gray-300 px-3 py-2 text-sm"
      >
        {CATEGORIAS.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <input
        value={state.sku_soollar}
        onChange={(e) => set({ ...state, sku_soollar: e.target.value })}
        placeholder="REF SOOLLAR (opcional)"
        className="rounded-lg bg-white border border-gray-300 px-3 py-2 text-sm"
      />
      <input
        value={state.potencia_w}
        onChange={(e) => set({ ...state, potencia_w: e.target.value })}
        placeholder="Potência W (módulo)"
        className="rounded-lg bg-white border border-gray-300 px-3 py-2 text-sm"
      />
      <input
        value={state.potencia_kw}
        onChange={(e) => set({ ...state, potencia_kw: e.target.value })}
        placeholder="Potência kW (inversor)"
        className="rounded-lg bg-white border border-gray-300 px-3 py-2 text-sm"
      />
      <input
        value={state.aliases}
        onChange={(e) => set({ ...state, aliases: e.target.value })}
        placeholder="Aliases separados por |"
        className="rounded-lg bg-white border border-gray-300 px-3 py-2 text-sm md:col-span-2"
      />
    </>
  );

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
                <p className="text-sm admin-subtitle mt-1">
                  CRUD manual · preços por CD (fonte <code className="text-sky-300">manual</code>) ·
                  conversa com{' '}
                  <Link href="/admin/v3/precos" className="underline text-sky-300">
                    Preços por CD
                  </Link>
                </p>
              </div>
              <div className="flex gap-2 flex-wrap items-center flex-shrink-0">
                <Link href="/admin" className="admin-btn-ghost text-sm">
                  🏠 Admin
                </Link>
                <Link href="/admin/configuracoes" className="admin-btn-ghost text-sm">
                  ← Voltar
                </Link>
              </div>
            </div>

            <div className="mb-6 flex flex-wrap items-center gap-2">
              <Link href="/admin/v3/precos" className="admin-btn-ghost text-sm">
                💰 Preços
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
                <option value="0">Inativos</option>
                <option value="all">Todos</option>
              </select>
            </div>

            {divergenciasCount > 0 && (
              <div
                role="alert"
                className="mb-4 rounded-xl border-2 border-rose-500 bg-rose-50 px-3 py-2 text-sm text-rose-800"
              >
                🚨 {divergenciasCount} SKU com preços muito diferentes entre CDs (linhas em
                vermelho). Revise após scrape — ver também{' '}
                <Link href="/admin/v3/precos" className="underline font-medium">
                  Preços por CD
                </Link>
                .
              </div>
            )}

            {msg && (
              <p className="mb-4 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                {msg}
              </p>
            )}

            <form
              onSubmit={onCreate}
              className="mb-8 grid md:grid-cols-3 gap-3 admin-surface p-4"
            >
              <div className="md:col-span-3 text-sm font-medium text-gray-700">
                Novo equipamento (entrada manual)
              </div>
              {renderFormFields(form, setForm)}
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
              >
                Adicionar
              </button>
            </form>

            {editId != null && (
              <form
                onSubmit={onSaveEdit}
                className="mb-8 admin-surface border border-sky-300 p-4 space-y-4"
              >
                <div className="flex justify-between items-center gap-2">
                  <h2 className="text-sm font-semibold text-sky-800">
                    Editar #{editId} · preços por CD (fonte manual)
                  </h2>
                  <button
                    type="button"
                    onClick={fecharEdicao}
                    className="text-xs text-gray-600 hover:underline"
                  >
                    Fechar
                  </button>
                </div>
                <div className="grid md:grid-cols-3 gap-3">
                  {renderFormFields(editForm, setEditForm, { skuLocked: true })}
                </div>
                {(() => {
                  const divEdit = items.find((x) => x.id === editId)?.divergencia;
                  if (!divEdit) return null;
                  return (
                    <p className="text-sm text-rose-800 bg-rose-50 border border-rose-300 rounded-lg px-3 py-2">
                      ⚠ {divEdit.alerta}
                    </p>
                  );
                })()}
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 text-gray-500 text-left">
                      <tr>
                        <th className="px-3 py-2">CD</th>
                        <th className="px-3 py-2 text-emerald-800">Preço custo</th>
                        <th className="px-3 py-2">Estoque</th>
                        <th className="px-3 py-2">Fonte atual</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(cds.length ? cds : Object.keys(precosDraft).map((id) => ({
                        id: Number(id),
                        nome: `CD ${id}`,
                        codigo: Number(id),
                        slug_portal: '',
                      }))).map((cd) => {
                        const d = precosDraft[cd.id] || { preco: '', estoque: '', fonte: null };
                        return (
                          <tr key={cd.id} className="border-t border-gray-200">
                            <td className="px-3 py-2 font-medium text-gray-800">{cd.nome}</td>
                            <td className="px-3 py-2">
                              <input
                                value={d.preco}
                                onChange={(e) =>
                                  setPrecosDraft({
                                    ...precosDraft,
                                    [cd.id]: { ...d, preco: e.target.value },
                                  })
                                }
                                placeholder="ex. 999.90"
                                className="w-full max-w-[160px] rounded border-2 border-emerald-300 bg-emerald-50 px-2 py-1.5 text-base font-semibold tabular-nums text-emerald-900 focus:border-emerald-500 focus:outline-none"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                value={d.estoque}
                                onChange={(e) =>
                                  setPrecosDraft({
                                    ...precosDraft,
                                    [cd.id]: { ...d, estoque: e.target.value },
                                  })
                                }
                                placeholder="opcional"
                                className="w-full max-w-[100px] rounded border border-gray-300 px-2 py-1 text-sm"
                              />
                            </td>
                            <td className="px-3 py-2 text-xs text-gray-500">
                              {d.fonte || '—'}
                              {d.preco && Number(d.preco) > 0
                                ? ` · ${formatBRL(Number(String(d.preco).replace(',', '.')))}`
                                : ''}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-gray-500">
                  Ao salvar, a fonte vira <strong>manual</strong> e o registro entra na tabela de
                  Preços por CD. Scrape posterior pode sobrescrever se o match for o mesmo SKU.
                </p>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-sky-600 hover:bg-sky-500 text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
                >
                  {saving ? 'Salvando…' : 'Salvar cadastro + preços'}
                </button>
              </form>
            )}

            <div className="overflow-x-auto admin-surface border border-gray-200">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-left">
                  <tr>
                    <th className="px-3 py-2">SKU</th>
                    <th className="px-3 py-2">Nome</th>
                    <th className="px-3 py-2">Cat.</th>
                    <th className="px-3 py-2">Marca</th>
                    <th className="px-3 py-2">Pot.</th>
                    <th className="px-3 py-2 min-w-[11rem]">Preço / CD</th>
                    <th className="px-2 py-2 w-16 text-center" title="Ações">
                      ···
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr>
                      <td colSpan={7} className="px-3 py-6 text-center text-gray-500">
                        Carregando…
                      </td>
                    </tr>
                  )}
                  {!loading && items.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-3 py-6 text-center text-gray-500">
                        Nenhum equipamento. Inclua manualmente acima.
                      </td>
                    </tr>
                  )}
                  {items.map((it) => {
                    const precosOk = (it.precos || []).filter(
                      (p) => p.preco_custo != null && Number(p.preco_custo) > 0
                    );
                    const div = it.divergencia;
                    return (
                      <tr
                        key={it.id}
                        className={`border-t hover:bg-gray-50 ${
                          div
                            ? 'border-rose-200 bg-rose-50'
                            : editId === it.id
                              ? 'border-gray-200 bg-sky-50'
                              : 'border-gray-200'
                        }`}
                        title={div ? div.alerta : undefined}
                      >
                        <td className="px-3 py-2 font-mono text-xs text-sky-700">
                          {it.sku_interno}
                          {div ? (
                            <span className="ml-1 text-rose-600 font-sans" title={div.alerta}>
                              ⚠
                            </span>
                          ) : null}
                        </td>
                        <td className="px-3 py-2">{it.nome}</td>
                        <td className="px-3 py-2 text-gray-600">{it.categoria}</td>
                        <td className="px-3 py-2">{it.marca || '—'}</td>
                        <td className="px-3 py-2 text-gray-600">
                          {it.potencia_w
                            ? `${it.potencia_w}W`
                            : it.potencia_kw
                              ? `${it.potencia_kw}kW`
                              : '—'}
                        </td>
                        <td className="px-3 py-2">
                          {precosOk.length > 0 ? (
                            <div
                              className={`text-xs leading-snug space-y-0.5 ${
                                div ? 'text-rose-800' : 'text-gray-700'
                              }`}
                            >
                              {div ? (
                                <div className="text-[11px] font-semibold text-rose-700 mb-0.5">
                                  Divergência {div.razao}× · {formatBRL(div.preco_min)}–
                                  {formatBRL(div.preco_max)}
                                </div>
                              ) : null}
                              {precosOk
                                .slice()
                                .sort(
                                  (a, b) => Number(a.preco_custo) - Number(b.preco_custo)
                                )
                                .map((p) => (
                                  <div key={p.cd_id}>
                                    <span className={div ? 'text-rose-600' : 'text-gray-500'}>
                                      {p.cd_nome}
                                    </span>{' '}
                                    <span
                                      className={`tabular-nums ${
                                        div ? 'font-semibold text-rose-800' : ''
                                      }`}
                                    >
                                      {formatBRL(Number(p.preco_custo))}
                                    </span>
                                    {p.fonte === 'manual' ? (
                                      <span className="text-amber-600"> ·m</span>
                                    ) : null}
                                  </div>
                                ))}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-xs">sem preço</span>
                          )}
                        </td>
                        <td className="px-1 py-2 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => abrirEdicao(it)}
                            className="inline-flex items-center justify-center w-8 h-8 rounded hover:bg-sky-100 text-lg leading-none"
                            title="Editar / preços"
                            aria-label="Editar"
                          >
                            ✏️
                          </button>
                          {it.ativo ? (
                            <button
                              type="button"
                              onClick={() => desativar(it.id, it.nome)}
                              className="inline-flex items-center justify-center w-8 h-8 rounded hover:bg-rose-50 text-base leading-none"
                              title="Desativar (pausar)"
                              aria-label="Desativar"
                            >
                              ⏸️→
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => ativar(it.id, it.nome)}
                              className="inline-flex items-center justify-center w-8 h-8 rounded hover:bg-emerald-50 text-lg leading-none"
                              title="Ativar"
                              aria-label="Ativar"
                            >
                              ▶️
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
