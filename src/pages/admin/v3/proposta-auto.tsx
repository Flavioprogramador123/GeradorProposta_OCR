import { useCallback, useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import {
  resolveConfigRapida,
  saveConfigRapida,
  type ConfigRapidaShared,
} from '@/lib/configRapidaShared';
import { formatBRL, formatNumberPt } from '@/lib/formatBRL';

interface Params {
  hsp: number;
  performanceRate: number;
  diasMes: number;
  tarifa: number;
  percentualDespesa: number;
  descontoPix: number;
  bonusMicroPercent: number;
  maxAlternativas: number;
  placasPorMicro: number;
}

interface PassoAuditoria {
  etapa: string;
  formula: string;
  valores: Record<string, number | string | boolean | null>;
  resultado: string;
}

interface ItemKit {
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

interface Alt {
  titulo: string;
  tipo: string;
  sku_modulo: string;
  sku_inversor: string;
  nome_modulo?: string;
  nome_inversor?: string;
  potencia_modulo_w?: number;
  potencia_inversor_kw?: number;
  preco_unit_modulo?: number;
  preco_unit_inversor?: number;
  custo_rs_kwp_modulo?: number | null;
  qtd_modulos: number;
  qtd_inversores: number;
  potencia_kwp: number;
  geracao_mensal_kwh: number;
  cobertura_pct: number | null;
  custo_total: number;
  precos: { custo: number; despesa: number; aVista: number; pix: number };
  comercial?: {
    pcusto_kit?: number;
    frete?: number;
    pcusto: number;
    pdespesa_fixo: number;
    pdespesa_variavel_percent: number;
    pdespesa_variavel_valor: number;
    pdespesa_total: number;
    total_final: number;
    ppix: number;
    pavista: number;
    p12x: number;
    p12x_total: number;
    p18x_parcela: number;
    formula: string;
  };
  frete?: number;
  orcamento_base_id?: number;
  origem?: 'manual_3a' | 'auto';
  faixa_alvo_kwh?: number;
  breakdown: Record<string, number>;
  orcamento_itens?: ItemKit[];
  avisos?: string[];
  auditoria?: {
    passos: PassoAuditoria[];
    economia_mensal_estimada: number | null;
  };
}

const CDS = [
  { id: 1, nome: 'Aeroporto' },
  { id: 2, nome: 'Matriz' },
  { id: 3, nome: 'Feira de Santana' },
];

function fmtVal(v: number | string | boolean | null): string {
  if (v === null) return 'null';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) return String(v);
    if (Math.abs(v) >= 1000 || (Math.abs(v) > 0 && Math.abs(v) < 0.01)) {
      return formatNumberPt(v, 4);
    }
    return String(Math.round(v * 10000) / 10000);
  }
  return String(v);
}

export default function AdminV3PropostaAuto() {
  const [modo, setModo] = useState<'geracao_mensal' | 'potencia_kwp' | 'consumo_mensal'>('geracao_mensal');
  const [cdId, setCdId] = useState(3);
  const [cliente, setCliente] = useState('Cliente Padrão');
  const [cidade, setCidade] = useState('Anápolis/GO');
  const [consumoMensal, setConsumoMensal] = useState(600);
  const [tipoImovel, setTipoImovel] = useState('Residencial');
  /** Valor único (kWp) ou legado */
  const [valor, setValor] = useState(500);
  /** Faixa de geração/consumo (kWh) — preferida na 4a */
  const [valorMin, setValorMin] = useState(800);
  const [valorMax, setValorMax] = useState(1200);
  const [usarFaixa, setUsarFaixa] = useState(true);
  const [incluirMicro, setIncluirMicro] = useState(true);
  const [incluirString, setIncluirString] = useState(false);
  const [hsp, setHsp] = useState(5.45);
  const [hspTexto, setHspTexto] = useState('5.45');
  const [tarifa, setTarifa] = useState(1.17);
  const [pdespesaFixo, setPdespesaFixo] = useState(3000);
  const [pdespesaVariavel, setPdespesaVariavel] = useState(22);
  const [fretePadrao, setFretePadrao] = useState(0);
  const [params, setParams] = useState<Params | null>(null);
  const [alts, setAlts] = useState<Alt[]>([]);
  const [geradorPayload, setGeradorPayload] = useState<Record<string, unknown> | null>(null);
  const [meta, setMeta] = useState<{
    alvoKwp?: number;
    alvoGeracao?: number;
    alvoGeracaoMin?: number;
    alvoGeracaoMax?: number;
    consumoRef?: number | null;
  } | null>(null);
  const [auditoriaAlvo, setAuditoriaAlvo] = useState<PassoAuditoria[]>([]);
  const [avisosGlobais, setAvisosGlobais] = useState<string[]>([]);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [aberto, setAberto] = useState<Record<number, boolean>>({});
  const [sharedReady, setSharedReady] = useState(false);

  const applyShared = useCallback((shared: ConfigRapidaShared) => {
    setCliente(shared.nomeCliente);
    setCidade(shared.cidadeCliente);
    setConsumoMensal(shared.consumoMensal);
    setTipoImovel(shared.tipoImovel);
    const h = Math.round((shared.hsp ?? 5.45) * 100) / 100;
    setHsp(h);
    setHspTexto(h.toFixed(2));
    setTarifa(shared.tarifa);
    setPdespesaFixo(shared.pdespesaFixo);
    setPdespesaVariavel(shared.pdespesaVariavel);
    setFretePadrao(shared.fretePadrao);
    if (shared.geracaoMin != null) setValorMin(shared.geracaoMin);
    if (shared.geracaoMax != null) setValorMax(shared.geracaoMax);
  }, []);

  const loadParams = useCallback(async () => {
    const [resV3, resAdmin] = await Promise.all([
      fetch('/api/v3/proposta-auto'),
      fetch('/api/admin/config'),
    ]);
    const data = await resV3.json();
    const admin = resAdmin.ok ? await resAdmin.json() : {};
    // Sessão (edits locais) prevalece; admin só semeia se não houver sessão
    const shared = resolveConfigRapida(admin);

    if (resV3.ok && data.params) {
      setParams(data.params);
    }

    applyShared(shared);
    // Espelha na sessão (sem apagar overrides da 4a)
    saveConfigRapida({
      ...shared,
      pdespesaFixo: shared.pdespesaFixo,
      pdespesaVariavel: shared.pdespesaVariavel,
      fretePadrao: shared.fretePadrao,
      hsp: shared.hsp,
      tarifa: shared.tarifa,
    });
    setSharedReady(true);
  }, [applyShared]);

  useEffect(() => {
    loadParams().catch(() => undefined);
  }, [loadParams]);

  // Persistir de volta para o Gerador
  useEffect(() => {
    if (!sharedReady) return;
    saveConfigRapida({
      nomeCliente: cliente,
      cidadeCliente: cidade,
      consumoMensal,
      tipoImovel,
      hsp,
      tarifa,
      pdespesaFixo,
      pdespesaVariavel,
      fretePadrao,
      geracaoMin: valorMin,
      geracaoMax: valorMax,
    });
  }, [
    sharedReady,
    cliente,
    cidade,
    consumoMensal,
    tipoImovel,
    hsp,
    tarifa,
    pdespesaFixo,
    pdespesaVariavel,
    fretePadrao,
    valorMin,
    valorMax,
  ]);

  const money = (n: number) => formatBRL(n);

  const persistSharedNow = () => {
    saveConfigRapida({
      nomeCliente: cliente,
      cidadeCliente: cidade,
      consumoMensal,
      tipoImovel,
      hsp,
      tarifa,
      pdespesaFixo,
      pdespesaVariavel,
      fretePadrao,
      geracaoMin: valorMin,
      geracaoMax: valorMax,
    });
  };

  const gerar = async (salvar = false) => {
    setBusy(true);
    setMsg('');
    persistSharedNow();
    try {
      const body: Record<string, unknown> = {
        modo,
        cdId,
        cliente_nome: cliente,
        hsp,
        tarifa,
        pdespesaFixo,
        pdespesaVariavel,
        frete: fretePadrao,
        salvar,
        incluir_micro: incluirMicro,
        incluir_string: incluirString,
      };

      if (modo === 'potencia_kwp') {
        body.potencia_kwp = valor;
      } else if (usarFaixa) {
        if (modo === 'geracao_mensal') {
          body.geracao_mensal_min = valorMin;
          body.geracao_mensal_max = valorMax;
        } else {
          body.consumo_mensal_min = valorMin;
          body.consumo_mensal_max = valorMax;
        }
      } else if (modo === 'geracao_mensal') {
        body.geracao_mensal_kwh = valor;
      } else {
        body.consumo_mensal_kwh = consumoMensal || valor;
      }

      const res = await fetch('/api/v3/proposta-auto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
      const lista: Alt[] = data.alternativas || [];
      setAlts(lista);
      setGeradorPayload(data.gerador_payload || null);
      if (data.comercial_config) {
        if (data.comercial_config.pdespesaFixo != null) setPdespesaFixo(data.comercial_config.pdespesaFixo);
        if (data.comercial_config.pdespesaVariavel != null)
          setPdespesaVariavel(data.comercial_config.pdespesaVariavel);
      }
      setMeta({
        alvoKwp: data.alvoKwp,
        alvoGeracao: data.alvoGeracao,
        alvoGeracaoMin: data.alvoGeracaoMin,
        alvoGeracaoMax: data.alvoGeracaoMax,
        consumoRef: data.consumoRef,
      });
      setAuditoriaAlvo(data.auditoria_alvo || []);
      setAvisosGlobais(data.avisos || []);
      setParams(data.params);
      const open: Record<number, boolean> = {};
      lista.forEach((_, i) => {
        open[i] = true;
      });
      setAberto(open);
      const pix0 = lista[0]?.comercial?.ppix;
      const faixaTxt =
        data.alvoGeracaoMin != null && data.alvoGeracaoMax != null
          ? data.alvoGeracaoMin === data.alvoGeracaoMax
            ? `${data.alvoGeracaoMin} kWh`
            : `${data.alvoGeracaoMin}–${data.alvoGeracaoMax} kWh`
          : `${data.alvoGeracao} kWh`;
      setMsg(
        salvar
          ? `Salvo ${lista.length} orçamento(s) base`
          : `${lista.length} alt. · faixa ${faixaTxt} · PIX ${pix0 != null ? money(pix0) : '—'}`
      );
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
      setAlts([]);
      setAuditoriaAlvo([]);
      setGeradorPayload(null);
    } finally {
      setBusy(false);
    }
  };

  const toggle = (idx: number) =>
    setAberto((prev) => ({ ...prev, [idx]: !prev[idx] }));

  const abrirGerador = () => {
    if (!geradorPayload) {
      setMsg('Dimensionar antes de abrir a Proposta manual');
      return;
    }
    try {
      persistSharedNow();
      const orcamentos = alts.map((a, i) => {
          const orcs = (geradorPayload.orcamentos as Record<string, unknown>[] | undefined) || [];
          const base = orcs[i] || {};
          const kit = a.custo_total;
          const freteAlt = a.frete ?? fretePadrao;
          const pcusto = a.comercial?.pcusto ?? kit + freteAlt;
          return {
            ...base,
            precoCusto: pcusto,
            valorTotal: pcusto,
            custo_kit: kit,
            frete: freteAlt,
          };
        });
      const payload = {
        ...geradorPayload,
        cliente: {
          nomeCliente: cliente,
          cidadeCliente: cidade,
          consumoMensal,
          tipoImovel,
          hsp,
          tarifa,
        },
        pdespesa: {
          pdespesaFixo,
          pdespesaVariavel,
        },
        fretePadrao,
        orcamentos,
      };
      localStorage.setItem('v3-gerador-bridge', JSON.stringify(payload));
      // Garante sessão antes do gerador aplicar /admin/config
      persistSharedNow();
      window.open('/gerador-rapido?modo=v3', '_blank');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    }
  };

  /** Recalcula comercial local quando o usuário digita frete na coluna */
  const atualizarFreteAlt = (idx: number, freteRaw: number) => {
    const frete = Math.max(0, Number(freteRaw) || 0);
    setAlts((prev) =>
      prev.map((a, i) => {
        if (i !== idx) return a;
        const kit = a.custo_total;
        const pcusto = kit + frete;
        const pdespesa_variavel_valor = (pcusto * pdespesaVariavel) / 100;
        const pdespesa_total = pdespesaFixo + pdespesa_variavel_valor;
        const ppix = Math.round((pcusto + pdespesa_total) * 100) / 100;
        const oldPix = a.comercial?.ppix || ppix;
        const ratio = oldPix > 0 ? ppix / oldPix : 1;
        return {
          ...a,
          frete,
          comercial: {
            ...(a.comercial || {
              p12x: 0,
              p12x_total: 0,
              p18x_parcela: 0,
              formula: '',
              pavista: ppix,
              pdespesa_fixo: pdespesaFixo,
              pdespesa_variavel_percent: pdespesaVariavel,
              pdespesa_variavel_valor: 0,
              pdespesa_total: 0,
              total_final: ppix,
              ppix,
              pcusto,
            }),
            pcusto_kit: kit,
            frete,
            pcusto: Math.round(pcusto * 100) / 100,
            pdespesa_fixo: pdespesaFixo,
            pdespesa_variavel_percent: pdespesaVariavel,
            pdespesa_variavel_valor: Math.round(pdespesa_variavel_valor * 100) / 100,
            pdespesa_total: Math.round(pdespesa_total * 100) / 100,
            total_final: ppix,
            ppix,
            pavista: Math.round((a.comercial?.pavista || ppix) * ratio * 100) / 100,
            p12x: Math.round((a.comercial?.p12x || 0) * ratio * 100) / 100,
            p12x_total: Math.round((a.comercial?.p12x_total || 0) * ratio * 100) / 100,
            p18x_parcela: Math.round((a.comercial?.p18x_parcela || 0) * ratio * 100) / 100,
            formula: 'pcusto = kit + frete; pdespesa = fixo + pcusto×var%; PIX = pcusto + pdespesa',
          },
        };
      })
    );
  };

  return (
    <>
      <Head>
        <title>Proposta automática — PIENG</title>
      </Head>
      <div className="admin-shell">
        <div className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold admin-title">Proposta automática</h1>
              <p className="text-sm admin-subtitle">
                Dimensionamento automático por faixa de geração. Kits da{' '}
                <Link href="/admin/v3/orcamento-base" className="text-sky-400 hover:underline">
                  Proposta por kits
                </Link>{' '}
                vão direto à{' '}
                <Link href="/gerador-rapido" className="text-sky-400 hover:underline">
                  Proposta manual
                </Link>
                {' '}· configs compartilhadas
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

          {/* Bloco espelhando Configurações Rápidas do Gerador */}
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h2 className="text-sm font-semibold text-emerald-800">⚙️ Configurações Rápidas (shared)</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-3">
              <label className="text-sm">
                <span className="text-xs text-gray-500">Nome do Cliente</span>
                <input
                  value={cliente}
                  onChange={(e) => setCliente(e.target.value)}
                  className="mt-1 w-full rounded-lg bg-white border border-gray-300 px-3 py-2"
                />
              </label>
              <label className="text-sm">
                <span className="text-xs text-gray-500">Cidade</span>
                <input
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                  className="mt-1 w-full rounded-lg bg-white border border-gray-300 px-3 py-2"
                />
              </label>
              <label className="text-sm">
                <span className="text-xs text-gray-500">Consumo Mensal (kWh)</span>
                <input
                  type="number"
                  value={consumoMensal}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setConsumoMensal(v);
                    if (modo === 'consumo_mensal' && !usarFaixa) setValor(v);
                  }}
                  className="mt-1 w-full rounded-lg bg-white border border-gray-300 px-3 py-2"
                />
              </label>
              <label className="text-sm">
                <span className="text-xs text-gray-500">Template / tipo imóvel</span>
                <select
                  value={tipoImovel}
                  onChange={(e) => setTipoImovel(e.target.value)}
                  className="mt-1 w-full rounded-lg bg-white border border-gray-300 px-3 py-2"
                >
                  <option value="Residencial">Residencial</option>
                  <option value="Rural">Rural</option>
                  <option value="Comercial - Panificadora">Comercial - Panificadora</option>
                  <option value="Comercial - Açougue">Comercial - Açougue</option>
                  <option value="Comercial - Restaurante">Comercial - Restaurante</option>
                  <option value="Comercial - Mercado">Comercial - Mercado</option>
                  <option value="Industrial">Industrial</option>
                </select>
              </label>
              <label className="text-sm">
                <span className="text-xs text-gray-500">HSP</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={hspTexto}
                  onChange={(e) => {
                    const raw = e.target.value.replace(',', '.');
                    setHspTexto(raw);
                    const n = parseFloat(raw);
                    if (Number.isFinite(n)) setHsp(n);
                  }}
                  onBlur={() => {
                    const n = Math.round((Number.isFinite(hsp) ? hsp : 0) * 100) / 100;
                    setHsp(n);
                    setHspTexto(n.toFixed(2));
                  }}
                  className="mt-1 w-full rounded-lg bg-white border border-gray-300 px-3 py-2"
                />
              </label>
              <label className="text-sm">
                <span className="text-xs text-gray-500">Tarifa (R$/kWh)</span>
                <input
                  type="number"
                  step={0.001}
                  value={tarifa}
                  onChange={(e) => setTarifa(Number(e.target.value))}
                  className="mt-1 w-full rounded-lg bg-white border border-gray-300 px-3 py-2"
                />
              </label>
            </div>
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <div className="grid md:grid-cols-3 gap-3">
                <label className="text-sm">
                  <span className="text-xs text-gray-500">Valor Fixo (R$)</span>
                  <input
                    type="number"
                    step={100}
                    value={pdespesaFixo}
                    onChange={(e) => setPdespesaFixo(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg bg-white border border-gray-300 px-3 py-2"
                  />
                </label>
                <label className="text-sm">
                  <span className="text-xs text-gray-500">Percentual Variável (%)</span>
                  <input
                    type="number"
                    step={1}
                    value={pdespesaVariavel}
                    onChange={(e) => setPdespesaVariavel(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg bg-white border border-gray-300 px-3 py-2"
                  />
                </label>
                <label className="text-sm">
                  <span className="text-xs text-gray-500">Frete padrão R$ (V3)</span>
                  <input
                    type="number"
                    step={50}
                    min={0}
                    value={fretePadrao}
                    onChange={(e) => setFretePadrao(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg bg-white border border-amber-300 px-3 py-2"
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4 mb-6 admin-surface p-4">
            <label className="text-sm">
              <span className="text-xs text-gray-500">CD</span>
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
              <span className="text-xs text-gray-500">Modo</span>
              <select
                value={modo}
                onChange={(e) => {
                  const m = e.target.value as typeof modo;
                  setModo(m);
                  if (m === 'potencia_kwp') setUsarFaixa(false);
                  else setUsarFaixa(true);
                  if (m === 'consumo_mensal' && !usarFaixa) setValor(consumoMensal);
                }}
                className="mt-1 w-full rounded-lg bg-white border border-gray-300 px-3 py-2"
              >
                <option value="geracao_mensal">Geração mensal (kWh)</option>
                <option value="consumo_mensal">Consumo mensal (kWh)</option>
                <option value="potencia_kwp">Potência do sistema (kWp)</option>
              </select>
            </label>

            <div className="flex flex-col gap-2 justify-start md:row-span-2 self-start pt-6">
              {modo !== 'potencia_kwp' && (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={usarFaixa}
                    onChange={(e) => setUsarFaixa(e.target.checked)}
                  />
                  <span className="text-gray-700">Usar faixa min–max</span>
                </label>
              )}
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={incluirMicro}
                  onChange={(e) => setIncluirMicro(e.target.checked)}
                />
                <span className="text-gray-700">Somente microinversores</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={incluirString}
                  onChange={(e) => setIncluirString(e.target.checked)}
                />
                <span className="text-gray-700">Somente inversores string</span>
              </label>
            </div>

            {modo === 'potencia_kwp' || !usarFaixa ? (
              <label className="text-sm md:col-span-2">
                <span className="text-xs text-gray-500">
                  {modo === 'potencia_kwp' ? 'kWp' : modo === 'consumo_mensal' ? 'Consumo (kWh)' : 'Geração (kWh)'}
                </span>
                <input
                  type="number"
                  min={0.1}
                  step={0.1}
                  value={modo === 'consumo_mensal' ? consumoMensal : valor}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (modo === 'consumo_mensal') {
                      setConsumoMensal(v);
                      setValor(v);
                    } else setValor(v);
                  }}
                  className="mt-1 w-full rounded-lg bg-white border border-gray-300 px-3 py-2"
                />
              </label>
            ) : (
              <>
                <label className="text-sm">
                  <span className="text-xs text-gray-500">
                    {modo === 'geracao_mensal' ? 'Geração mín (kWh)' : 'Consumo mín (kWh)'}
                  </span>
                  <input
                    type="number"
                    min={1}
                    step={10}
                    value={valorMin}
                    onChange={(e) => setValorMin(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg bg-white border border-amber-300 px-3 py-2"
                  />
                </label>
                <label className="text-sm">
                  <span className="text-xs text-gray-500">
                    {modo === 'geracao_mensal' ? 'Geração máx (kWh)' : 'Consumo máx (kWh)'}
                  </span>
                  <input
                    type="number"
                    min={1}
                    step={10}
                    value={valorMax}
                    onChange={(e) => setValorMax(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg bg-white border border-amber-300 px-3 py-2"
                  />
                </label>
              </>
            )}
          </div>

          <div className="flex flex-wrap gap-3 mb-6">
            <button
              type="button"
              disabled={busy}
              onClick={() => gerar(false)}
              className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white disabled:opacity-50 text-sm font-medium"
            >
              Dimensionar
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => gerar(true)}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50 text-sm font-medium"
            >
              Dimensionar e salvar
            </button>
            <button
              type="button"
              disabled={busy || !geradorPayload}
              onClick={abrirGerador}
              className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-50 text-sm font-medium"
            >
              Abrir na Proposta manual
            </button>
          </div>

          {msg && <p className="mb-4 text-sm text-amber-800">{msg}</p>}
          {avisosGlobais.length > 0 && (
            <ul className="mb-4 text-sm text-amber-700 list-disc pl-5">
              {avisosGlobais.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          )}

          {auditoriaAlvo.length > 0 && (
            <section className="mb-6 rounded-xl border border-indigo-200 bg-indigo-50 p-4">
              <h2 className="text-sm font-semibold text-indigo-800 mb-3">Auditoria do alvo (global)</h2>
              {meta && (
                <p className="text-sm text-gray-700 mb-3">
                  Alvo mid: <strong>{meta.alvoKwp} kWp</strong> · geração ~<strong>{meta.alvoGeracao} kWh/mês</strong>
                  {meta.alvoGeracaoMin != null && meta.alvoGeracaoMax != null ? (
                    <>
                      {' '}
                      · faixa <strong>{meta.alvoGeracaoMin}–{meta.alvoGeracaoMax} kWh</strong>
                    </>
                  ) : null}
                  {meta.consumoRef != null ? (
                    <>
                      {' '}
                      · consumoRef <strong>{meta.consumoRef} kWh</strong>
                    </>
                  ) : null}
                </p>
              )}
              <div className="space-y-3">
                {auditoriaAlvo.map((p, i) => (
                  <div key={i} className="text-xs border-l-2 border-indigo-400 pl-3">
                    <div className="font-medium text-indigo-900">{p.etapa}</div>
                    <div className="text-gray-600 font-mono mt-0.5">{p.formula}</div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-gray-500">
                      {Object.entries(p.valores).map(([k, v]) => (
                        <span key={k}>
                          <span className="text-gray-500">{k}=</span>
                          {fmtVal(v)}
                        </span>
                      ))}
                    </div>
                    <div className="mt-1 text-emerald-700/90">→ {p.resultado}</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <div className="space-y-5">
            {alts.map((a, idx) => {
              const open = aberto[idx] !== false;
              return (
                <article
                  key={idx}
                  className="admin-surface border border-gray-200 overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => toggle(idx)}
                    className="w-full text-left px-5 py-4 flex flex-wrap items-start justify-between gap-3 hover:bg-gray-50"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs uppercase tracking-wide text-gray-500">
                          Alt {idx + 1} · {a.tipo}
                        </span>
                        {a.origem === 'manual_3a' && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                            por kits
                          </span>
                        )}
                        {a.faixa_alvo_kwh != null && (
                          <span className="text-[10px] text-gray-500">alvo ~{a.faixa_alvo_kwh} kWh</span>
                        )}
                        {a.orcamento_base_id && (
                          <span className="text-xs text-blue-600">#{a.orcamento_base_id}</span>
                        )}
                      </div>
                      <h2 className="font-semibold text-sky-700">{a.titulo}</h2>
                      <p className="text-sm text-gray-600 mt-1">
                        {a.qtd_modulos} mód. · {a.qtd_inversores} inv. · {a.potencia_kwp} kWp · ~
                        {a.geracao_mensal_kwh} kWh
                        {a.cobertura_pct != null ? ` · ${a.cobertura_pct}% cobertura` : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-semibold text-emerald-600">
                        {a.comercial ? money(a.comercial.ppix) : money(a.precos.pix)}
                      </div>
                      <div className="text-xs text-gray-500">
                        PIX comercial · {open ? 'recolher' : 'expandir'}
                      </div>
                      {a.comercial && (
                        <div className="text-[10px] text-gray-500 mt-0.5">
                          (legado {money(a.precos.pix)})
                        </div>
                      )}
                    </div>
                  </button>

                  {open && (
                    <div className="px-5 pb-5 border-t border-gray-200 space-y-5 pt-4">
                      {/* Resumo equipamentos */}
                      <div className="grid sm:grid-cols-2 gap-3 text-sm">
                        <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
                          <div className="text-xs text-gray-500 mb-1">Módulo</div>
                          <div className="font-medium">{a.nome_modulo || a.sku_modulo}</div>
                          <div className="text-xs text-gray-600 mt-1 font-mono">{a.sku_modulo}</div>
                          <div className="mt-2 text-gray-700">
                            {a.potencia_modulo_w} W · unit.{' '}
                            {a.preco_unit_modulo != null ? money(a.preco_unit_modulo) : '—'} · qtd{' '}
                            {a.qtd_modulos}
                            {a.custo_rs_kwp_modulo != null && (
                              <span className="block text-amber-700 text-xs mt-1">
                                R$ {a.custo_rs_kwp_modulo.toFixed(2)}/kWp (módulo)
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
                          <div className="text-xs text-gray-500 mb-1">
                            {a.tipo === 'micro' ? 'Microinversor' : 'Inversor'}
                          </div>
                          <div className="font-medium">{a.nome_inversor || a.sku_inversor}</div>
                          <div className="text-xs text-gray-600 mt-1 font-mono">{a.sku_inversor}</div>
                          <div className="mt-2 text-gray-700">
                            {a.potencia_inversor_kw} kW · unit.{' '}
                            {a.preco_unit_inversor != null ? money(a.preco_unit_inversor) : '—'} · qtd{' '}
                            {a.qtd_inversores}
                          </div>
                        </div>
                      </div>

                      {/* Precificação comercial = Proposta manual */}
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm">
                        <div className="text-xs font-semibold text-emerald-700 mb-2">
                          Precificação comercial (igual Proposta manual)
                        </div>
                        {a.comercial ? (
                          <>
                            <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-2 font-mono text-xs sm:text-sm">
                              <div>
                                <div className="text-gray-500">kit</div>
                                <div>{money(a.comercial.pcusto_kit ?? a.custo_total)}</div>
                              </div>
                              <div>
                                <div className="text-gray-500">Frete R$</div>
                                <input
                                  type="number"
                                  min={0}
                                  step={50}
                                  value={a.frete ?? a.comercial.frete ?? 0}
                                  onChange={(e) => atualizarFreteAlt(idx, Number(e.target.value))}
                                  onClick={(e) => e.stopPropagation()}
                                  className="mt-0.5 w-full rounded bg-white border border-amber-300 px-2 py-1 text-amber-800"
                                  title="Frete da transportadora — soma ao kit antes da pdespesa"
                                />
                              </div>
                              <div>
                                <div className="text-gray-500">pcusto (kit+frete)</div>
                                <div>{money(a.comercial.pcusto)}</div>
                              </div>
                              <div>
                                <div className="text-gray-500">
                                  + pdespesa (R$ {a.comercial.pdespesa_fixo} +{' '}
                                  {a.comercial.pdespesa_variavel_percent}%)
                                </div>
                                <div>{money(a.comercial.pdespesa_total)}</div>
                              </div>
                              <div>
                                <div className="text-gray-500">= PIX</div>
                                <div className="text-emerald-600 font-semibold">
                                  {money(a.comercial.ppix)}
                                </div>
                              </div>
                            </div>
                            <p className="mt-2 text-[11px] text-gray-500 font-mono">{a.comercial.formula}</p>
                            <p className="mt-1 text-xs text-gray-600">
                              À vista {money(a.comercial.pavista)} · 12× {money(a.comercial.p12x)} · total 12×{' '}
                              {money(a.comercial.p12x_total)} · 18× {money(a.comercial.p18x_parcela)}
                            </p>
                          </>
                        ) : (
                          <p className="text-amber-700 text-xs">Sem bloco comercial — redimensionar.</p>
                        )}
                        <div className="mt-3 pt-3 border-t border-gray-200 grid sm:grid-cols-4 gap-2 font-mono text-[11px] text-gray-500">
                          <div>
                            <div>legado custo</div>
                            <div>{money(a.precos.custo)}</div>
                          </div>
                          <div>
                            <div>+ {params?.percentualDespesa ?? '?'}%</div>
                            <div>{money(a.precos.despesa)}</div>
                          </div>
                          <div>
                            <div>à vista simp.</div>
                            <div>{money(a.precos.aVista)}</div>
                          </div>
                          <div>
                            <div>PIX simp. −{params?.descontoPix ?? '?'}%</div>
                            <div>{money(a.precos.pix)}</div>
                          </div>
                        </div>
                        {a.auditoria?.economia_mensal_estimada != null && (
                          <p className="mt-2 text-xs text-gray-600">
                            Economia mensal est. (min(geração, consumo) × tarifa {tarifa}):{' '}
                            <strong className="text-gray-700">
                              {money(a.auditoria.economia_mensal_estimada)}
                            </strong>
                          </p>
                        )}
                      </div>

                      {/* Passos de cálculo */}
                      {a.auditoria?.passos && a.auditoria.passos.length > 0 && (
                        <div>
                          <div className="text-xs font-semibold text-gray-700 mb-2">
                            Passos do cálculo
                          </div>
                          <div className="space-y-3">
                            {a.auditoria.passos.map((p, pi) => (
                              <div
                                key={pi}
                                className="text-xs border-l-2 border-sky-400 pl-3 py-0.5"
                              >
                                <div className="font-medium text-sky-800">
                                  {pi + 1}. {p.etapa}
                                </div>
                                <div className="text-gray-600 font-mono mt-0.5">{p.formula}</div>
                                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-gray-500">
                                  {Object.entries(p.valores).map(([k, v]) => (
                                    <span key={k}>
                                      <span className="text-gray-500">{k}=</span>
                                      {fmtVal(v)}
                                    </span>
                                  ))}
                                </div>
                                <div className="mt-1 text-amber-800">→ {p.resultado}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Linhas do kit */}
                      {a.orcamento_itens && a.orcamento_itens.length > 0 && (
                        <div>
                          <div className="text-xs font-semibold text-gray-700 mb-2">
                            Itens do orçamento (kit + complementos)
                          </div>
                          <div className="overflow-x-auto rounded-lg border border-gray-200">
                            <table className="w-full text-xs text-left">
                              <thead className="bg-gray-50 text-gray-500">
                                <tr>
                                  <th className="px-2 py-2">SKU</th>
                                  <th className="px-2 py-2">Nome</th>
                                  <th className="px-2 py-2">Cat.</th>
                                  <th className="px-2 py-2 text-right">Qtd</th>
                                  <th className="px-2 py-2 text-right">Unit.</th>
                                  <th className="px-2 py-2 text-right">Subtotal</th>
                                  <th className="px-2 py-2">Flags</th>
                                </tr>
                              </thead>
                              <tbody>
                                {a.orcamento_itens.map((it, ii) => {
                                  const fallback = Boolean(it.preco_fallback);
                                  return (
                                    <tr
                                      key={ii}
                                      className={`border-t border-gray-200 ${
                                        fallback
                                          ? 'bg-violet-50 text-violet-800'
                                          : !it.valido_preco
                                            ? 'bg-rose-50 text-rose-700'
                                            : 'text-gray-700'
                                      }`}
                                      title={
                                        fallback
                                          ? `Preço do CD ${it.preco_origem_cd_nome || '?'} (outra filial)`
                                          : it.aviso || undefined
                                      }
                                    >
                                      <td className="px-2 py-1.5 font-mono text-gray-600">
                                        {it.sku_interno}
                                      </td>
                                      <td className="px-2 py-1.5">
                                        {it.nome}
                                        {fallback && (
                                          <span className="ml-1 text-[10px] text-violet-700">
                                            · {it.preco_origem_cd_nome}
                                          </span>
                                        )}
                                      </td>
                                      <td className="px-2 py-1.5">{it.categoria}</td>
                                      <td className="px-2 py-1.5 text-right">{it.quantidade}</td>
                                      <td className="px-2 py-1.5 text-right">
                                        {it.preco_unitario != null ? money(it.preco_unitario) : '—'}
                                      </td>
                                      <td className="px-2 py-1.5 text-right">{money(it.subtotal)}</td>
                                      <td className="px-2 py-1.5 text-gray-500">
                                        {it.sugerido ? 'sugerido ' : ''}
                                        {fallback ? 'outra filial ' : ''}
                                        {!it.valido_preco ? '⚠ preço ' : ''}
                                        {it.estoque != null ? `est.${it.estoque}` : ''}
                                        {it.aviso ? ` · ${it.aviso}` : ''}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                              <tfoot>
                                <tr className="border-t border-gray-300 bg-gray-50">
                                  <td colSpan={5} className="px-2 py-2 text-right text-gray-600">
                                    Custo total
                                  </td>
                                  <td className="px-2 py-2 text-right font-semibold text-emerald-700">
                                    {money(a.custo_total)}
                                  </td>
                                  <td />
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Breakdown por categoria */}
                      {a.breakdown && Object.keys(a.breakdown).length > 0 && (
                        <div className="flex flex-wrap gap-2 text-xs text-gray-600">
                          {Object.entries(a.breakdown).map(([k, v]) => (
                            <span key={k} className="px-2 py-1 rounded bg-gray-100">
                              {k}: {money(v)}
                            </span>
                          ))}
                        </div>
                      )}

                      {a.avisos && a.avisos.length > 0 && (
                        <ul className="text-xs text-amber-700 list-disc pl-4">
                          {a.avisos.map((av, ai) => (
                            <li key={ai}>{av}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>


          </div>
        </div>
      </div>
    </>
  );
}
