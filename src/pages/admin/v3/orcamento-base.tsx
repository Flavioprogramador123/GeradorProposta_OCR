import { useCallback, useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import {
  resolveConfigRapida,
  saveConfigRapida,
} from '@/lib/configRapidaShared';
import { formatBRL } from '@/lib/formatBRL';
import { V3_GERADOR_STORAGE_KEY } from '@/modules/v3/bridge/toGerador';

interface CatalogItem {
  id: number;
  sku_interno: string;
  nome: string;
  marca: string | null;
  categoria: string;
  potencia_w: number | null;
  potencia_kw: number | null;
  preco_custo: number | null;
  estoque: number | null;
  valido_estoque: number | null;
}

interface CalcItem {
  sku_interno: string;
  nome: string;
  categoria: string;
  quantidade: number;
  preco_unitario: number | null;
  estoque: number | null;
  subtotal: number;
  valido_preco: boolean;
  sugerido: boolean;
  aviso?: string;
  preco_fallback?: boolean;
  preco_origem_cd_nome?: string;
}

interface Calc {
  cd_nome: string;
  custo_total: number;
  breakdown: Record<string, number>;
  itens: CalcItem[];
  avisos: string[];
}

export interface CardKitIncluido {
  id: string;
  titulo: string;
  cdId: number;
  sku_modulo: string;
  sku_inversor: string;
  nome_modulo: string;
  nome_inversor: string;
  categoria_inv: string;
  qtd_modulos: number;
  qtd_inversores: number;
  custo_total: number | null;
  calc?: Calc;
}

const CDS = [
  { id: 1, nome: 'Aeroporto' },
  { id: 2, nome: 'Matriz' },
  { id: 3, nome: 'Feira de Santana' },
];

const STORAGE_KEY = 'v3-kits-incluidos';

function recalcCalcLocal(itens: CalcItem[]): Calc {
  const breakdown: Record<string, number> = {};
  let custo_total = 0;
  const next = itens.map((it) => {
    const sub =
      it.preco_unitario != null ? Math.round(it.preco_unitario * it.quantidade * 100) / 100 : 0;
    breakdown[it.categoria] = (breakdown[it.categoria] || 0) + sub;
    custo_total += sub;
    return { ...it, subtotal: sub };
  });
  return {
    cd_nome: '',
    custo_total: Math.round(custo_total * 100) / 100,
    breakdown,
    itens: next,
    avisos: [],
  };
}

export default function AdminV3OrcamentoBase() {
  const [cdId, setCdId] = useState(3);
  const [catalogo, setCatalogo] = useState<CatalogItem[]>([]);
  const [titulo, setTitulo] = useState('Cliente Premium');
  const [qtdMod, setQtdMod] = useState(8);
  const [skuMod, setSkuMod] = useState('');
  const [skuInv, setSkuInv] = useState('');
  const [qtdInv, setQtdInv] = useState(1);
  const [autoComp, setAutoComp] = useState(true);
  const [frete, setFrete] = useState(0);
  const [calc, setCalc] = useState<Calc | null>(null);
  const [savedId, setSavedId] = useState<number | null>(null);
  const [lista, setLista] = useState<Array<{ id: number; titulo: string; custo_total: number; cd_nome: string }>>([]);
  const [cards, setCards] = useState<CardKitIncluido[]>([]);
  const [cardAtivoId, setCardAtivoId] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const mods = useMemo(
    () => catalogo.filter((c) => c.categoria === 'modulo' && c.valido_estoque === 1),
    [catalogo]
  );
  const invs = useMemo(
    () =>
      catalogo.filter(
        (c) =>
          (c.categoria === 'inversor' || c.categoria === 'microinversor') && c.valido_estoque === 1
      ),
    [catalogo]
  );

  const cardAtivo = useMemo(
    () => cards.find((c) => c.id === cardAtivoId) || null,
    [cards, cardAtivoId]
  );

  const loadCatalogo = useCallback(async () => {
    const res = await fetch(`/api/v3/orcamentos-base?catalogo=1&cdId=${cdId}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
    const cat: CatalogItem[] = data.catalogo || [];
    setCatalogo(cat);
    const modsOk = cat.filter((c) => c.categoria === 'modulo' && c.valido_estoque === 1);
    const invsOk = cat.filter(
      (c) =>
        (c.categoria === 'inversor' || c.categoria === 'microinversor') && c.valido_estoque === 1
    );
    setSkuMod((prev) =>
      prev && modsOk.some((c) => c.sku_interno === prev) ? prev : modsOk[0]?.sku_interno || ''
    );
    setSkuInv((prev) =>
      prev && invsOk.some((c) => c.sku_interno === prev) ? prev : invsOk[0]?.sku_interno || ''
    );
  }, [cdId]);

  const loadLista = useCallback(async () => {
    const res = await fetch('/api/v3/orcamentos-base');
    const data = await res.json();
    if (res.ok) setLista(data.items || []);
  }, []);

  useEffect(() => {
    loadCatalogo().catch((e) => setMsg(e.message));
    loadLista().catch(() => undefined);
  }, [loadCatalogo, loadLista]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/config');
        const admin = res.ok ? await res.json() : null;
        const shared = resolveConfigRapida(admin);
        setFrete(shared.fretePadrao ?? 0);
        if (shared.nomeCliente) setTitulo((t) => (t === 'Cliente Premium' ? shared.nomeCliente : t));
      } catch {
        const shared = resolveConfigRapida(null);
        setFrete(shared.fretePadrao ?? 0);
      }
    })();
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CardKitIncluido[];
        if (Array.isArray(parsed)) setCards(parsed);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const persistCards = (next: CardKitIncluido[] | ((prev: CardKitIncluido[]) => CardKitIncluido[])) => {
    setCards((prev) => {
      const resolved = typeof next === 'function' ? next(prev) : next;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(resolved));
      } catch {
        /* ignore */
      }
      return resolved;
    });
  };

  const money = (n: number | null | undefined) => (n == null ? '—' : formatBRL(n));

  const postPreview = async (opts: {
    cdId: number;
    itens: Array<{ sku_interno: string; quantidade: number; editado_manual?: boolean }>;
    autoComplementos: boolean;
  }): Promise<Calc | null> => {
    const res = await fetch('/api/v3/orcamentos-base', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        preview: true,
        cdId: opts.cdId,
        autoComplementos: opts.autoComplementos,
        itens: opts.itens,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
    return data.calc as Calc;
  };

  const buildItens = () => {
    const itens: Array<{ sku_interno: string; quantidade: number }> = [];
    if (skuMod && qtdMod > 0) itens.push({ sku_interno: skuMod, quantidade: qtdMod });
    if (skuInv && qtdInv > 0) itens.push({ sku_interno: skuInv, quantidade: qtdInv });
    return itens;
  };

  const preview = async (): Promise<Calc | null> => {
    setBusy(true);
    setMsg('');
    setSavedId(null);
    setCardAtivoId(null);
    try {
      const data = await postPreview({
        cdId,
        autoComplementos: autoComp,
        itens: buildItens(),
      });
      setCalc(data);
      return data;
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
      return null;
    } finally {
      setBusy(false);
    }
  };

  const selecionarCard = (card: CardKitIncluido) => {
    setCardAtivoId(card.id);
    setSavedId(null);
    setSkuMod(card.sku_modulo);
    setSkuInv(card.sku_inversor);
    setQtdMod(card.qtd_modulos);
    setQtdInv(card.qtd_inversores);
    setCdId(card.cdId);
    if (card.calc) {
      setCalc({
        ...card.calc,
        cd_nome: card.calc.cd_nome || CDS.find((c) => c.id === card.cdId)?.nome || '',
      });
    } else {
      setCalc(null);
      void recalcularCard(card.id, card.qtd_modulos, card.qtd_inversores, true);
    }
    setMsg(`Card ativo: ${card.titulo}`);
  };

  const atualizarCardNaLista = (id: string, patch: Partial<CardKitIncluido>) => {
    persistCards((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  /** Recalcula kit do card (mód/inv + complementos) */
  const recalcularCard = async (
    id: string,
    qtdModulos: number,
    qtdInversores: number,
    comComplementos = true
  ) => {
    const card = cards.find((c) => c.id === id);
    const cardRef = card || {
      id,
      cdId,
      sku_modulo: skuMod,
      sku_inversor: skuInv,
      categoria_inv: invs.find((i) => i.sku_interno === skuInv)?.categoria || 'inversor',
    };
    setBusy(true);
    setMsg('');
    try {
      const data = await postPreview({
        cdId: cardRef.cdId,
        autoComplementos: comComplementos,
        itens: [
          { sku_interno: cardRef.sku_modulo, quantidade: qtdModulos },
          { sku_interno: cardRef.sku_inversor, quantidade: qtdInversores },
        ],
      });
      if (!data) return;
      const mod = mods.find((m) => m.sku_interno === cardRef.sku_modulo);
      const tipo = cardRef.categoria_inv === 'microinversor' ? 'Micro' : 'String';
      const tituloNovo = `${titulo} · ${tipo} ${qtdModulos}×${mod?.potencia_w || '?'}W`;
      atualizarCardNaLista(id, {
        qtd_modulos: qtdModulos,
        qtd_inversores: qtdInversores,
        custo_total: data.custo_total,
        calc: data,
        titulo: tituloNovo,
      });
      setCalc(data);
      setQtdMod(qtdModulos);
      setQtdInv(qtdInversores);
      setMsg(`Card atualizado · ${money(data.custo_total)}`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  /** Altera qtd de uma linha do card ativo e recalcula subtotais (local) */
  const alterarQtdLinha = (sku: string, qtdRaw: number) => {
    if (!cardAtivoId || !calc) return;
    const qtd = Math.max(0, Number(qtdRaw) || 0);
    const itens = calc.itens.map((it) =>
      it.sku_interno === sku ? { ...it, quantidade: qtd } : it
    );
    const next = recalcCalcLocal(itens);
    next.cd_nome = calc.cd_nome;
    next.avisos = calc.avisos;
    setCalc(next);

    const modLine = next.itens.find((i) => i.categoria === 'modulo');
    const invLine = next.itens.find(
      (i) => i.categoria === 'inversor' || i.categoria === 'microinversor'
    );
    atualizarCardNaLista(cardAtivoId, {
      calc: next,
      custo_total: next.custo_total,
      qtd_modulos: modLine?.quantidade ?? qtdMod,
      qtd_inversores: invLine?.quantidade ?? qtdInv,
    });
    if (modLine) setQtdMod(modLine.quantidade);
    if (invLine) setQtdInv(invLine.quantidade);
  };

  /** Reenvia linhas editadas ao motor (sem re-sugerir complementos) */
  const aplicarLinhasNoServidor = async () => {
    if (!cardAtivoId || !calc || !cardAtivo) return;
    setBusy(true);
    try {
      const data = await postPreview({
        cdId: cardAtivo.cdId,
        autoComplementos: false,
        itens: calc.itens
          .filter((i) => i.quantidade > 0)
          .map((i) => ({
            sku_interno: i.sku_interno,
            quantidade: i.quantidade,
            editado_manual: true,
          })),
      });
      if (!data) return;
      atualizarCardNaLista(cardAtivoId, {
        calc: data,
        custo_total: data.custo_total,
      });
      setCalc(data);
      setMsg(`Preços atualizados no servidor · ${money(data.custo_total)}`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const incluirCard = async () => {
    if (!skuMod || !skuInv) {
      setMsg('Selecione módulo e inversor/micro para incluir');
      return;
    }
    const previewCalc = await preview();
    if (!previewCalc) {
      setMsg('Não foi possível calcular o custo deste kit');
      return;
    }
    const mod = mods.find((m) => m.sku_interno === skuMod);
    const inv = invs.find((m) => m.sku_interno === skuInv);
    const tipo = inv?.categoria === 'microinversor' ? 'Micro' : 'String';
    const card: CardKitIncluido = {
      id: `${Date.now()}-${skuMod}-${skuInv}-${qtdMod}x${qtdInv}`,
      titulo: `${titulo} · ${tipo} ${qtdMod}×${mod?.potencia_w || '?'}W`,
      cdId,
      sku_modulo: skuMod,
      sku_inversor: skuInv,
      nome_modulo: mod?.nome || skuMod,
      nome_inversor: inv?.nome || skuInv,
      categoria_inv: inv?.categoria || 'inversor',
      qtd_modulos: qtdMod,
      qtd_inversores: qtdInv,
      custo_total: previewCalc.custo_total,
      calc: previewCalc,
    };
    const dup = cards.some(
      (c) =>
        c.sku_modulo === card.sku_modulo &&
        c.sku_inversor === card.sku_inversor &&
        c.qtd_modulos === card.qtd_modulos &&
        c.qtd_inversores === card.qtd_inversores
    );
    if (dup) {
      setMsg('Este kit já está nos cards incluídos');
      return;
    }
    const next = [...cards, card];
    persistCards(next);
    setCardAtivoId(card.id);
    setMsg(`Incluído card #${next.length}: ${card.titulo} · ${money(card.custo_total)}`);
  };

  const removerCard = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    persistCards((prev) => prev.filter((c) => c.id !== id));
    if (cardAtivoId === id) {
      setCardAtivoId(null);
      setCalc(null);
    }
  };

  const salvarCardAtivo = async () => {
    if (!cardAtivo || !calc) {
      setMsg('Selecione um card para salvar');
      return;
    }
    setBusy(true);
    setMsg('');
    try {
      const res = await fetch('/api/v3/orcamentos-base', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titulo: cardAtivo.titulo,
          cliente_nome: titulo,
          cdId: cardAtivo.cdId,
          autoComplementos: false,
          itens: calc.itens
            .filter((i) => i.quantidade > 0)
            .map((i) => ({
              sku_interno: i.sku_interno,
              quantidade: i.quantidade,
              editado_manual: true,
            })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
      setSavedId(data.id);
      setMsg(`Salvo #${data.id} · ${cardAtivo.titulo} · ${money(data.calc.custo_total)}`);
      await loadLista();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const salvar = async () => {
    if (cardAtivo) {
      await salvarCardAtivo();
      return;
    }
    setBusy(true);
    setMsg('');
    try {
      const res = await fetch('/api/v3/orcamentos-base', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titulo,
          cliente_nome: titulo,
          cdId,
          autoComplementos: autoComp,
          itens: buildItens(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
      setCalc(data.calc);
      setSavedId(data.id);
      setMsg(`Salvo #${data.id} · custo R$ ${Number(data.calc.custo_total).toFixed(2)}`);
      await loadLista();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const irParaGerador = async () => {
    if (!cards.length) {
      setMsg('Inclua ao menos um card antes de abrir a Proposta manual');
      return;
    }
    try {
      let admin: Record<string, unknown> | null = null;
      try {
        const res = await fetch('/api/admin/config');
        if (res.ok) admin = await res.json();
      } catch {
        /* segue com sessão / defaults */
      }
      const shared = resolveConfigRapida(admin);
      const freteOk = Math.max(0, Number(frete) || 0);
      saveConfigRapida({
        ...shared,
        nomeCliente: shared.nomeCliente || titulo,
        fretePadrao: freteOk,
      });

      const orcamentos = cards.map((c) => {
        const potMod = mods.find((m) => m.sku_interno === c.sku_modulo)?.potencia_w || 550;
        const potInv =
          invs.find((i) => i.sku_interno === c.sku_inversor)?.potencia_kw ||
          (c.categoria_inv === 'microinversor' ? 2 : 5);
        const marcaMod = (c.nome_modulo || '').trim().split(/\s+/)[0] || 'Padrão';
        const marcaInv = (c.nome_inversor || '').trim().split(/\s+/)[0] || 'Padrão';
        const kit = c.custo_total ?? 0;
        const pcusto = Math.round((kit + freteOk) * 100) / 100;
        return {
          fornecedor: `V3/3a/${c.categoria_inv === 'microinversor' ? 'micro' : 'string'}`,
          precoCusto: pcusto,
          valorTotal: pcusto,
          frete: freteOk,
          custo_kit: kit,
          modulos: c.qtd_modulos,
          pot_modulo: potMod,
          marca_modulo: marcaMod,
          inversores: c.qtd_inversores,
          pot_inv: potInv,
          marca_inversor: marcaInv,
          bonusMicroAtivo: c.categoria_inv === 'microinversor',
          titulo_v3: c.titulo,
          sku_modulo: c.sku_modulo,
          sku_inversor: c.sku_inversor,
        };
      });

      const payload = {
        origem: `V3 Proposta por kits · ${cards.length} kit(s)`,
        quantidadeTotal: cards.length,
        cliente: {
          nomeCliente: shared.nomeCliente || titulo,
          cidadeCliente: shared.cidadeCliente,
          consumoMensal: shared.consumoMensal,
          tipoImovel: shared.tipoImovel,
          hsp: shared.hsp,
          tarifa: shared.tarifa,
        },
        pdespesa: {
          pdespesaFixo: shared.pdespesaFixo,
          pdespesaVariavel: shared.pdespesaVariavel,
        },
        fretePadrao: freteOk,
        orcamentos,
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
      localStorage.setItem(V3_GERADOR_STORAGE_KEY, JSON.stringify(payload));
      window.open('/gerador-rapido?modo=v3', '_blank');
      setMsg(
        `Proposta por kits → Proposta manual: ${cards.length} kit(s). Frete ${formatBRL(freteOk)} · HSP ${shared.hsp} · tarifa ${shared.tarifa} · pdespesa ${shared.pdespesaFixo}+${shared.pdespesaVariavel}%`
      );
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    }
  };

  useEffect(() => {
    const inv = invs.find((i) => i.sku_interno === skuInv);
    if (inv?.categoria === 'microinversor' && qtdMod > 0 && !cardAtivoId) {
      setQtdInv(Math.max(1, Math.ceil(qtdMod / 4)));
    }
  }, [skuInv, qtdMod, invs, cardAtivoId]);

  const resumoTitulo = cardAtivo
    ? `Resumo · Card ${cards.findIndex((c) => c.id === cardAtivo.id) + 1}`
    : 'Preview atual (formulário)';

  return (
    <>
      <Head>
        <title>Proposta por kits — PIENG</title>
      </Head>
      <div className="admin-shell">
        <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold admin-title">Proposta por kits</h1>
              <p className="text-sm admin-subtitle">
                Monta kits do catálogo (módulo/inversor + qtds) e envia à{' '}
                <Link href="/gerador-rapido" className="text-sky-400 hover:underline">
                  Proposta manual
                </Link>
                . Dimensionamento por faixa fica na{' '}
                <Link href="/admin/v3/proposta-auto" className="text-sky-400 hover:underline">
                  Proposta automática
                </Link>
                .
              </p>
            </div>
            <div className="flex gap-3">
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
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-6 admin-surface p-4">
            <label className="text-sm">
              <span className="text-gray-500 text-xs">CD</span>
              <select
                value={cdId}
                onChange={(e) => setCdId(Number(e.target.value))}
                className="mt-1 w-full rounded-lg bg-white border border-gray-300 px-3 py-2"
              >
                {CDS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="text-gray-500 text-xs">Título / cliente</span>
              <input
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                className="mt-1 w-full rounded-lg bg-white border border-gray-300 px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="text-gray-500 text-xs">Módulo (com preço válido)</span>
              <select
                value={skuMod}
                onChange={(e) => setSkuMod(e.target.value)}
                className="mt-1 w-full rounded-lg bg-white border border-gray-300 px-3 py-2"
              >
                <option value="">—</option>
                {mods.map((m) => (
                  <option key={m.sku_interno} value={m.sku_interno}>
                    {m.nome} · {money(m.preco_custo)} · est {m.estoque}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="text-gray-500 text-xs">Qtd módulos</span>
              <input
                type="number"
                min={1}
                value={qtdMod}
                onChange={(e) => setQtdMod(Number(e.target.value))}
                className="mt-1 w-full rounded-lg bg-white border border-gray-300 px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="text-gray-500 text-xs">Inversor / micro</span>
              <select
                value={skuInv}
                onChange={(e) => setSkuInv(e.target.value)}
                className="mt-1 w-full rounded-lg bg-white border border-gray-300 px-3 py-2"
              >
                <option value="">—</option>
                {invs.map((m) => (
                  <option key={m.sku_interno} value={m.sku_interno}>
                    [{m.categoria === 'microinversor' ? 'micro' : 'string'}] {m.nome} · {money(m.preco_custo)}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="text-gray-500 text-xs">Qtd inversores</span>
              <input
                type="number"
                min={1}
                value={qtdInv}
                onChange={(e) => setQtdInv(Number(e.target.value))}
                className="mt-1 w-full rounded-lg bg-white border border-gray-300 px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="text-gray-500 text-xs">Frete (R$)</span>
              <input
                type="number"
                min={0}
                step={50}
                value={frete}
                onChange={(e) => {
                  const v = Math.max(0, Number(e.target.value) || 0);
                  setFrete(v);
                  saveConfigRapida({ fretePadrao: v });
                }}
                className="mt-1 w-full rounded-lg bg-white border border-amber-300 px-3 py-2"
              />
              <span className="text-[11px] text-gray-500 mt-0.5 block">
                Vem de Configurações · editável · entra no custo (kit + frete)
              </span>
            </label>
            <label className="flex items-center gap-2 text-sm md:col-span-2">
              <input type="checkbox" checked={autoComp} onChange={(e) => setAutoComp(e.target.checked)} />
              Sugerir estrutura fibro inox / perfil / cabos / MC4 (1 trilho por módulo · preço)
            </label>
          </div>

          <div className="flex flex-wrap gap-3 mb-4">
            <button
              type="button"
              disabled={busy || !skuMod}
              onClick={() => preview()}
              className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white disabled:opacity-50 text-sm font-medium"
            >
              Calcular preview
            </button>
            <button
              type="button"
              disabled={busy || !skuMod || !skuInv}
              onClick={incluirCard}
              className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white disabled:opacity-50 text-sm font-medium"
            >
              Incluir
            </button>
            <button
              type="button"
              disabled={busy || (!skuMod && !cardAtivo)}
              onClick={salvar}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50 text-sm font-medium"
            >
              {cardAtivo ? 'Salvar card ativo' : 'Salvar proposta por kits'}
            </button>
            <button
              type="button"
              disabled={!cards.length}
              onClick={irParaGerador}
              className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-50 text-sm font-medium"
            >
              Abrir na Proposta manual ({cards.length})
            </button>
          </div>

          {msg && <p className="mb-4 text-sm text-amber-800">{msg}</p>}
          {mods.length === 0 && (
            <p className="mb-4 text-sm text-rose-600">
              Nenhum módulo com preço válido neste CD. Importe preços em{' '}
              <Link href="/admin/v3/precos" className="underline">
                Preços por CD
              </Link>
              .
            </p>
          )}

          {cards.length > 0 && (
            <section className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-700">
                  Cards incluídos ({cards.length}) — clique para abrir o resumo
                </h2>
                <button
                  type="button"
                  className="text-xs text-rose-600 hover:underline"
                  onClick={() => {
                    persistCards([]);
                    setCardAtivoId(null);
                    setCalc(null);
                  }}
                >
                  Limpar todos
                </button>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                {cards.map((c, idx) => {
                  const ativo = c.id === cardAtivoId;
                  return (
                    <button
                      type="button"
                      key={c.id}
                      onClick={() => selecionarCard(c)}
                      className={`text-left rounded-xl border p-4 text-sm transition ${
                        ativo
                          ? 'border-sky-500 bg-sky-50 ring-1 ring-sky-400'
                          : 'border-amber-200 bg-amber-50 hover:border-amber-400'
                      }`}
                    >
                      <div className="flex justify-between gap-2 mb-2">
                        <span className={`text-xs ${ativo ? 'text-sky-700' : 'text-amber-600'}`}>
                          Card {idx + 1}
                          {ativo ? ' · ativo' : ''}
                        </span>
                        <span
                          role="button"
                          tabIndex={0}
                          className="text-xs text-rose-600 hover:underline"
                          onClick={(e) => removerCard(c.id, e)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') removerCard(c.id);
                          }}
                        >
                          Remover
                        </span>
                      </div>
                      <div className="font-medium text-gray-800 mb-1">{c.titulo}</div>
                      <div className="text-xs text-gray-600 space-y-0.5">
                        <div>
                          {c.categoria_inv === 'microinversor' ? 'Micro' : 'String'} · {c.qtd_modulos}{' '}
                          mód. · {c.qtd_inversores} inv.
                        </div>
                        <div className="truncate" title={c.nome_modulo}>
                          M: {c.nome_modulo}
                        </div>
                        <div className="truncate" title={c.nome_inversor}>
                          I: {c.nome_inversor}
                        </div>
                        <div className="text-emerald-600 mt-1">{money(c.custo_total)}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {calc && (
            <div className="mb-8 admin-surface border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 flex flex-wrap justify-between gap-3">
                <div>
                  <div className="text-xs text-gray-500">
                    {resumoTitulo}
                    {calc.cd_nome ? ` · ${calc.cd_nome}` : ''}
                  </div>
                  <div className="text-2xl font-semibold text-emerald-600">{money(calc.custo_total)}</div>
                </div>
                <div className="flex flex-wrap items-end gap-2">
                  {cardAtivo && (
                    <>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => recalcularCard(cardAtivo.id, qtdMod, qtdInv, autoComp)}
                        className="px-3 py-1.5 rounded-lg bg-sky-700 hover:bg-sky-600 text-white text-xs font-medium disabled:opacity-50"
                      >
                        Recalcular kit
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={aplicarLinhasNoServidor}
                        className="px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-xs font-medium disabled:opacity-50"
                        title="Confirma quantidades linha a linha no motor (sem re-sugerir estrutura)"
                      >
                        Aplicar linhas
                      </button>
                    </>
                  )}
                  <div className="text-xs text-gray-600 self-center">
                    {Object.entries(calc.breakdown || {}).map(([k, v]) => (
                      <span key={k} className="mr-3">
                        {k}: {money(v)}
                      </span>
                    ))}
                    {savedId && <span className="text-sky-700">salvo #{savedId}</span>}
                  </div>
                </div>
              </div>
              <table className="min-w-full text-sm">
                <thead className="text-gray-500 text-left">
                  <tr>
                    <th className="px-3 py-2">SKU</th>
                    <th className="px-3 py-2">Item</th>
                    <th className="px-3 py-2">Qtd</th>
                    <th className="px-3 py-2">Unit.</th>
                    <th className="px-3 py-2">Subtotal</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {calc.itens.map((it) => {
                    const fallback = Boolean(it.preco_fallback);
                    const semPreco = !it.valido_preco;
                    return (
                      <tr
                        key={it.sku_interno}
                        className={`border-t border-gray-200 ${
                          fallback ? 'bg-violet-50' : semPreco ? 'bg-rose-50' : ''
                        }`}
                        title={
                          fallback
                            ? `Preço de outra filial: ${it.preco_origem_cd_nome || '?'}`
                            : semPreco
                              ? it.aviso || 'Sem preço'
                              : undefined
                        }
                      >
                        <td className="px-3 py-2 font-mono text-xs text-sky-700">{it.sku_interno}</td>
                        <td className="px-3 py-2">
                          {it.nome}
                          {it.sugerido && <span className="ml-2 text-xs text-amber-600">sugerido</span>}
                          {fallback && (
                            <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-violet-100 text-violet-800">
                              outra filial
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {cardAtivo ? (
                            <input
                              type="number"
                              min={0}
                              value={it.quantidade}
                              onChange={(e) => alterarQtdLinha(it.sku_interno, Number(e.target.value))}
                              className="w-20 rounded bg-white border border-gray-300 px-2 py-1 text-sm"
                            />
                          ) : (
                            it.quantidade
                          )}
                        </td>
                        <td
                          className={`px-3 py-2 ${
                            fallback ? 'text-violet-700' : semPreco ? 'text-rose-600' : ''
                          }`}
                        >
                          {money(it.preco_unitario)}
                        </td>
                        <td
                          className={`px-3 py-2 ${
                            fallback ? 'text-violet-700 font-medium' : semPreco ? 'text-rose-600' : ''
                          }`}
                        >
                          {money(it.subtotal)}
                        </td>
                        <td
                          className={`px-3 py-2 text-xs ${
                            fallback ? 'text-violet-700' : 'text-rose-600'
                          }`}
                        >
                          {it.aviso || ''}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {calc.avisos?.length > 0 && (
                <div className="px-3 py-2 text-xs text-amber-800 border-t border-gray-200 bg-amber-500/5">
                  {calc.avisos.join(' · ')}
                </div>
              )}
            </div>
          )}

          <div className="admin-surface border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Salvos no SQLite</h2>
            {lista.length === 0 && <p className="text-xs text-gray-500">Nenhuma proposta por kits salva ainda.</p>}
            <ul className="space-y-2 text-sm">
              {lista.map((o) => (
                <li key={o.id} className="flex justify-between gap-3 border-b border-gray-200 pb-2">
                  <span>
                    #{o.id} {o.titulo}{' '}
                    <span className="text-gray-500">({o.cd_nome})</span>
                  </span>
                  <span className="text-emerald-600">{money(o.custo_total)}</span>
                </li>
              ))}
            </ul>
          </div>
          </div>
        </div>
      </div>
    </>
  );
}
