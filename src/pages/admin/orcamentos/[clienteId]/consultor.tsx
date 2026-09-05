import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useConsultorConfig } from '@/hooks/useConsultorConfig';
import ConsultorConfigPanel from '@/components/ConsultorConfigPanel';
import OrcamentosComparisonTable from '@/components/OrcamentosComparisonTable';
import TemplateSelector from '@/components/TemplateSelector';
import MicroInversorToggle from '@/components/MicroInversorToggle';
import {
  syncBonusMicroAuto,
  getBonusMicroAtivo,
  calcularPerformanceCompleta,
} from '@/lib/calcularPerformance';
import {
  inferDescontoPixFromSistemas,
  normalizeDescontoPix,
  calcularPrecosProposta as calcularPrecosEngine,
} from '@/lib/propostaOrcamentoProcessor';
import type { ClientType, ComercialSubType } from '@/lib/variantConfig';

interface Cliente {
  id: string;
  nome: string;
  cidade: string;
  consumoMensal: number;
}

interface OrcamentoComparativo {
  id: string;
  nome: string;
  fornecedor: string;
  pcusto: number;
  modulos: number;
  pot_modulo: number;
  marca_modulo: string;
  inversores: number;
  pot_inv: number;
  marca_inversor: string;
  bonusMicroAtivo?: boolean;
  bonusMicroManual?: boolean;
  status: 'pendente' | 'analisando' | 'aprovado' | 'rejeitado';
}

function resolveClienteId(
  param: string | string[] | undefined,
  fallbackId?: string
): string | null {
  if (typeof param === 'string' && param.length > 0 && param !== 'cliente') {
    return param;
  }
  if (fallbackId) return fallbackId;
  return null;
}

export default function ConsultorOrcamentosPage() {
  const router = useRouter();
  const { clienteId: clienteIdParam } = router.query;
  const { config, updateConfig, resetConfig, calcularPrecos, calcularPerformance, calcularPdespesa } = useConsultorConfig({ persist: false });
  
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [orcamentos, setOrcamentos] = useState<OrcamentoComparativo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Template selecionado
  const [templateSelecionado, setTemplateSelecionado] = useState<{
    tipo: ClientType;
    subtipo?: ComercialSubType;
  } | null>(null);
  
  const handleTemplateSelect = (tipo: ClientType, subtipo?: ComercialSubType) => {
    setTemplateSelecionado({ tipo, subtipo });
  };

  const clienteId = resolveClienteId(clienteIdParam, cliente?.id);

  // Carregar dados do cliente e orçamentos
  useEffect(() => {
    if (!router.isReady) return;

    const id = resolveClienteId(clienteIdParam);
    if (!id) {
      setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);

        const aplicarConfigProposta = (fonte: any, sistemas?: any[]) => {
          const configProposta = fonte?.config || fonte?.configuracoes || {};
          const descontoInferido = inferDescontoPixFromSistemas(sistemas);
          updateConfig({
            hsp: configProposta.hsp ?? config.hsp,
            tarifa: configProposta.tarifa ?? config.tarifa,
            consumoMensal: fonte?.cliente?.consumoMensal ?? configProposta.consumoMensal ?? config.consumoMensal,
            pdespesaFixo: configProposta.pdespesaFixo ?? config.pdespesaFixo,
            pdespesaVariavel: configProposta.pdespesaVariavel ?? config.pdespesaVariavel,
            performanceRate: configProposta.performanceRate ?? config.performanceRate,
            bonusMicroPercent: configProposta.bonusMicroPercent ?? config.bonusMicroPercent,
            descontoPix: normalizeDescontoPix(
              descontoInferido ?? configProposta.descontoPix,
              config.descontoPix
            ),
            fatorParcelado: configProposta.fatorParcelado ?? config.fatorParcelado,
            fator12x: configProposta.fator12x ?? config.fator12x,
            fator18x: configProposta.fator18x ?? config.fator18x,
          });
        };

        // Fonte da verdade: proposta gerada (Supabase/API)
        try {
          const propostaRes = await fetch(`/api/propostas/${id}`);

          if (propostaRes.ok) {
            const proposta = await propostaRes.json();
            console.log('✅ Proposta encontrada:', proposta);

            if (proposta && Array.isArray(proposta.sistemas)) {
              aplicarConfigProposta(proposta, proposta.sistemas);

              const clienteData: Cliente = {
                id: id,
                nome: proposta.cliente?.nome || 'Cliente',
                cidade: proposta.cliente?.cidade || 'N/A',
                consumoMensal: proposta.cliente?.consumoMensal || 600
              };

          const parseValue = (val: any): number => {
            if (typeof val === 'number') return val;
            if (!val) return 0;
            let str = val.toString().trim().replace(/[^\d,.-]/g, '');
            if (!str) return 0;
            if (str.includes(',') && str.includes('.')) {
              str = str.replace(/\./g, '').replace(',', '.');
            } else if (str.includes(',')) {
              const parts = str.split(',');
              if (parts[1] && parts[1].length <= 2) {
                str = str.replace(',', '.');
              } else {
                str = str.replace(',', '');
              }
            }
            const parsed = parseFloat(str);
            return isNaN(parsed) ? 0 : parsed;
          };

          const orcamentosData: OrcamentoComparativo[] = proposta.sistemas.map((sistema: any, index: number) => {
            // ✅ Extrair potência de múltiplas fontes (preservar valores exatos)
            let potenciaTotal = 0;
            if (sistema.potTotal !== undefined && sistema.potTotal !== null) {
              potenciaTotal = typeof sistema.potTotal === 'number' ? sistema.potTotal : parseFloat(sistema.potTotal.toString().replace(',', '.')) || 0;
            } else if (sistema.potencia) {
              const potenciaMatch = sistema.potencia?.toString().match(/(\d+[.,]?\d*)/);
              potenciaTotal = potenciaMatch ? parseFloat(potenciaMatch[1].replace(',', '.')) : 0;
            } else if (sistema.modulos && sistema.pot_modulo) {
              potenciaTotal = (sistema.modulos * sistema.pot_modulo) / 1000;
            }

            // ✅ PRIORIDADE: Usar pcusto EXATO do Supabase (não recalcular!)
            let pcusto = 0;
            if (sistema.pcusto !== undefined && sistema.pcusto !== null) {
              pcusto = parseValue(sistema.pcusto);
              console.log(`✅ Consultor - Sistema ${index + 1}: pcusto EXATO do Supabase = ${pcusto}`);
            } else if (sistema.precoCusto !== undefined && sistema.precoCusto !== null) {
              pcusto = parseValue(sistema.precoCusto);
              console.log(`✅ Consultor - Sistema ${index + 1}: precoCusto EXATO do Supabase = ${pcusto}`);
            } else {
              // Fallback apenas se não existir
              const precoFinal = parseValue(sistema.precoPixDecimal) || parseValue(sistema.ppix) || parseValue(sistema.total_final) || 0;
              const pdespesaTotal = parseValue(sistema.pdespesa_total) || parseValue(sistema.pdespesaTotal) || 0;
              if (precoFinal > 0 && pdespesaTotal > 0 && pdespesaTotal < precoFinal) {
                pcusto = precoFinal - pdespesaTotal;
                console.log(`⚠️ Consultor - Sistema ${index + 1}: Calculado pcusto (fallback) = ${precoFinal} - ${pdespesaTotal} = ${pcusto}`);
              } else {
                pcusto = parseValue(sistema.valorTotal) || parseValue(sistema.ppix) || 0;
                console.warn(`⚠️ Consultor - Sistema ${index + 1}: Usando fallback para pcusto = ${pcusto}`);
              }
            }

            // ✅ Usar valores EXATOS do Supabase (não recalcular)
            const modulos = sistema.modulos !== undefined && sistema.modulos !== null 
              ? (typeof sistema.modulos === 'number' ? sistema.modulos : parseInt(sistema.modulos.toString()) || 0)
              : (potenciaTotal > 0 ? Math.round(potenciaTotal * 1000 / 605) : 20);
            
            const inversores = sistema.inversores !== undefined && sistema.inversores !== null
              ? (typeof sistema.inversores === 'number' ? sistema.inversores : parseInt(sistema.inversores.toString()) || 0)
              : (potenciaTotal > 0 ? Math.ceil(potenciaTotal / 15) : 1);

            console.log(`✅ Consultor - Sistema ${index + 1} convertido:`, {
              nome: sistema.titulo || sistema.nome,
              pcusto,
              modulos,
              inversores,
              pot_modulo: sistema.pot_modulo,
              sistemaOriginal: {
                pcusto: sistema.pcusto,
                precoCusto: sistema.precoCusto,
                modulos: sistema.modulos,
                inversores: sistema.inversores
              }
            });

            return syncBonusMicroAuto({
              id: sistema.id || `sistema-${index}`,
              nome: sistema.titulo || sistema.nome || `Sistema ${index + 1}`,
              fornecedor: sistema.distribuidora || sistema.fornecedor || 'SOOLLAR',
              pcusto: pcusto,
              modulos: modulos,
              pot_modulo: sistema.pot_modulo || 605,
              marca_modulo: sistema.marca_modulo || sistema.marcaModulo || 'Padrão',
              inversores: inversores,
              pot_inv: sistema.pot_inv || sistema.potInv || 15,
              marca_inversor: sistema.marca_inversor || sistema.marcaInversor || 'Padrão',
              bonusMicroAtivo: sistema.bonusMicroAtivo,
              bonusMicroManual: sistema.bonusMicroManual ?? typeof sistema.bonusMicroAtivo === 'boolean',
              status: 'aprovado' as const,
            });
          });

          console.log('✅ Cliente e sistemas carregados:', {
            cliente: clienteData.nome,
            sistemas: orcamentosData.length
          });

          setCliente(clienteData);
          setOrcamentos(orcamentosData);
          return;
            }
          }

          const dadosLocalStorage = localStorage.getItem(`consultor-${id}`);
          if (dadosLocalStorage) {
            const dados = JSON.parse(dadosLocalStorage);
            aplicarConfigProposta(dados, dados.orcamentos);
            setCliente({
              id,
              nome: dados.cliente?.nome || 'Cliente',
              cidade: dados.cliente?.cidade || 'N/A',
              consumoMensal: dados.cliente?.consumoMensal || 600,
            });
            setOrcamentos(
              (dados.orcamentos || []).map((orc: OrcamentoComparativo) => syncBonusMicroAuto(orc))
            );
            return;
          }

          throw new Error('Proposta não encontrada');
        } catch (apiError) {
          console.error('❌ Erro ao carregar proposta:', apiError);

          try {
            const dadosLocalStorage = localStorage.getItem(`consultor-${id}`);
            if (dadosLocalStorage) {
              const dados = JSON.parse(dadosLocalStorage);
              aplicarConfigProposta(dados, dados.orcamentos);
              setCliente({
                id,
                nome: dados.cliente?.nome || 'Cliente',
                cidade: dados.cliente?.cidade || 'N/A',
                consumoMensal: dados.cliente?.consumoMensal || 600,
              });
              setOrcamentos(
                (dados.orcamentos || []).map((orc: OrcamentoComparativo) => syncBonusMicroAuto(orc))
              );
              return;
            }
          } catch {
            // segue para fallback de cliente
          }

          try {
            const clienteRes = await fetch(`/api/admin/clientes/${id}`);
            if (clienteRes.ok) {
              const clienteApiData = await clienteRes.json();
              setCliente({
                id: id,
                nome: clienteApiData.nome || 'Cliente',
                cidade: clienteApiData.cidade || 'N/A',
                consumoMensal: clienteApiData.consumoMensal || clienteApiData.consumoKwh || 600
              });
            }
          } catch {
            setCliente({
              id: id,
              nome: 'Cliente',
              cidade: 'N/A',
              consumoMensal: 600
            });
          }

          setOrcamentos([]);
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [router.isReady, clienteIdParam]);

  const handleOrcamentoUpdate = (id: string, updates: Partial<OrcamentoComparativo>) => {
    setOrcamentos(prev => 
      prev.map(orc => 
        orc.id === id ? { ...orc, ...updates } : orc
      )
    );
  };

  const handleOrcamentoDelete = (id: string) => {
    setOrcamentos(prev => prev.filter(orc => orc.id !== id));
  };

  const handleBulkAction = (action: 'aprovar' | 'rejeitar', ids: string[]) => {
    setOrcamentos(prev => 
      prev.map(orc => 
        ids.includes(orc.id) 
          ? { ...orc, status: action === 'aprovar' ? 'aprovado' : 'rejeitado' }
          : orc
      )
    );
  };

  const updateOrcInversor = (index: number, updates: Partial<OrcamentoComparativo>) => {
    setOrcamentos((prev) => {
      const updated = [...prev];
      updated[index] = syncBonusMicroAuto({ ...updated[index], ...updates });
      return updated;
    });
  };

  const toggleBonusMicro = (index: number) => {
    setOrcamentos((prev) => {
      const updated = [...prev];
      const orc = updated[index];
      updated[index] = {
        ...orc,
        bonusMicroManual: true,
        bonusMicroAtivo: !getBonusMicroAtivo(orc),
      };
      return updated;
    });
  };

  const addNewOrcamento = () => {
    const novoOrc: OrcamentoComparativo = syncBonusMicroAuto({
      id: Date.now().toString(),
      nome: `Novo Sistema ${orcamentos.length + 1}`,
      fornecedor: 'SOOLLAR',
      pcusto: 0,
      modulos: 20,
      pot_modulo: 580,
      marca_modulo: '',
      inversores: 1,
      pot_inv: 10,
      marca_inversor: '',
      status: 'pendente',
    });
    setOrcamentos(prev => [...prev, novoOrc]);
    setShowAddModal(false);
  };

  const gerarPropostas = async () => {
    const id = resolveClienteId(clienteIdParam, cliente?.id);
    if (!id) {
      alert('❌ Identificador do cliente não encontrado. Recarregue a página ou acesse novamente pelo Gerador Rápido.');
      return;
    }

    if (!cliente) {
      alert('❌ Dados do cliente não encontrados.');
      return;
    }

    const aprovados = orcamentos.filter(o => o.status === 'aprovado');
    if (aprovados.length === 0) {
      alert('Nenhum orçamento aprovado para gerar propostas');
      return;
    }

    /** PIX = base; à vista = total 12×; parcelas pela tabela do cartão */
    const calcularPrecosProposta = (totalFinal: number) => {
      return calcularPrecosEngine(totalFinal, config);
    };

    try {
      setLoading(true);

      const orcamentosProcessados = aprovados.map((orc, index) => {
        const potTotal = (orc.modulos * orc.pot_modulo) / 1000;
        const pdespesa = calcularPdespesa(orc.pcusto);
        const totalFinal = orc.pcusto + pdespesa;
        const precos = calcularPrecosProposta(totalFinal);
        const bonusMicroAtivo = getBonusMicroAtivo(orc);
        const performance = calcularPerformance(potTotal, precos.ppix, bonusMicroAtivo);

        return {
          nome: orc.nome || `Sistema ${index + 1}`,
          distribuidora: orc.fornecedor,
          pcusto: orc.pcusto,
          modulos: orc.modulos,
          pot_modulo: orc.pot_modulo,
          marca_modulo: orc.marca_modulo,
          inversores: orc.inversores,
          pot_inv: orc.pot_inv,
          marca_inversor: orc.marca_inversor,
          bonusMicroAtivo,
          bonusMicroManual: orc.bonusMicroManual,
          pdespesa_total: pdespesa,
          total_final: totalFinal,
          pdespesa_fixo: config.pdespesaFixo,
          pdespesa_variavel_percent: config.pdespesaVariavel,
          potTotal,
          ...precos,
          ...performance,
        };
      });

      const templateCliente = templateSelecionado?.subtipo
        ? `comercial-${templateSelecionado.subtipo}`
        : templateSelecionado?.tipo || 'padrao';

      const response = await fetch('/api/gerar-proposta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slugExistente: id,
          cliente: {
            nome: cliente.nome,
            cidade: cliente.cidade,
            consumo_mensal: config.consumoMensal || cliente.consumoMensal,
            tipo_imovel: templateSelecionado?.tipo || 'Residencial',
            hsp: config.hsp,
            tarifa: config.tarifa,
            template: templateCliente,
          },
          orcamentos: orcamentosProcessados,
          config: {
            ...config,
            consumoMensal: config.consumoMensal || cliente.consumoMensal,
            metodo: 'variavel',
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const detalhe = errorData.message || errorData.details || errorData.error || '';
        throw new Error(detalhe || 'Erro ao gerar proposta');
      }

      const result = await response.json();

      if (result.slug) {
        window.open(`/proposta/${result.slug}`, '_blank');
      }

      const pdfSlug = result.slug || id;

      const melhor = orcamentosProcessados.reduce((best, cur) =>
        cur.paybackMeses < best.paybackMeses ? cur : best
      );

      alert(`✅ Proposta gerada e salva no banco!

📊 Dados da Proposta:
   • Orçamentos processados: ${orcamentosProcessados.length}
   • Melhor Payback: ${melhor.paybackMeses.toFixed(1)} meses
   • Melhor TIR: ${melhor.tirAnual.toFixed(1)}%
   • Preço PIX Melhor: R$ ${melhor.ppix.toLocaleString('pt-BR')}
   • Potência Melhor: ${melhor.potTotal.toFixed(2)} kWp
   • Geração Mensal: ${melhor.geracaoMensal.toFixed(0)} kWh

🔧 Parâmetros Utilizados:
   • HSP: ${config.hsp}
   • Tarifa: R$ ${config.tarifa}/kWh
   • Pdespesa: R$ ${config.pdespesaFixo} + ${config.pdespesaVariavel}%
   • Bônus Micro: ${config.bonusMicroPercent}%

🌐 ${result.supabase?.salva ? 'Salva no Supabase' : 'Verifique persistência no banco'}
   URL: /proposta/${result.slug}

📄 Para PDF: use o botão "Gerar PDF" ou abra /proposta/${pdfSlug}?pdf=1`);
    } catch (error) {
      console.error('Erro ao gerar propostas:', error);
      alert(`❌ Erro ao gerar proposta: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-shell flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando sistema do consultor...</p>
        </div>
      </div>
    );
  }

  if (!cliente) {
    return (
      <div className="admin-shell flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Cliente não encontrado</h1>
          <Link href="/admin" legacyBehavior><a className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            ← Voltar ao Admin
          </a></Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Sistema do Consultor - {cliente.nome} | PIENG Solar</title>
        <meta name="description" content={`Sistema avançado de controle para consultor de energia solar - ${cliente.nome}`} />
      </Head>

      <div className="admin-shell">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-7xl mx-auto">
            
            {/* Header */}
            <div className="flex justify-between items-start mb-8">
              <div>
                <h1 className="text-3xl font-bold admin-title mb-4">
                  🎛️ Sistema do Consultor
                </h1>
                <div className="bg-slate-100 rounded-lg p-4 shadow-sm border border-slate-200/80">
                  <h2 className="text-xl font-semibold text-gray-800 mb-1">
                    {cliente.nome}
                  </h2>
                  <p className="text-gray-600">
                    📍 {cliente.cidade} • ⚡ {cliente.consumoMensal} kWh/mês
                  </p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <Link href="/admin" legacyBehavior>
                  <a className="admin-btn-ghost">
                    🏠 Admin
                  </a>
                </Link>
                <Link href={`/admin/orcamentos/${clienteId ?? cliente.id}`} legacyBehavior>
                  <a className="admin-btn-ghost">
                    ← Voltar
                  </a>
                </Link>
              </div>
            </div>

            {/* Painel de Configuração do Consultor */}
            <ConsultorConfigPanel 
              config={config}
              onConfigChange={updateConfig}
              onReset={resetConfig}
            />

            {/* Seletor de Template de Proposta */}
            <TemplateSelector
              onSelect={handleTemplateSelect}
              selected={templateSelecionado || undefined}
            />

            {/* Ações Principais */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
              <button
                onClick={() => setShowAddModal(true)}
                className="p-6 admin-surface hover:shadow-xl transition-shadow text-center border-2 border-dashed border-blue-300 hover:border-blue-500"
              >
                <div className="text-3xl mb-3 text-blue-600">➕</div>
                <h3 className="font-semibold text-gray-800 mb-1">Novo Orçamento</h3>
                <p className="text-sm text-gray-600">Adicionar sistema</p>
              </button>

              <button
                onClick={() => {
                  // Aprovar todos os orçamentos automaticamente se nenhum estiver aprovado
                  const aprovados = orcamentos.filter(o => o.status === 'aprovado');
                  if (aprovados.length === 0) {
                    setOrcamentos(prev => prev.map(orc => ({ ...orc, status: 'aprovado' as const })));
                  } else {
                    gerarPropostas();
                  }
                }}
                disabled={loading || orcamentos.length === 0}
                className="p-6 admin-surface hover:shadow-xl transition-shadow text-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="text-3xl mb-3 text-green-600">
                  {loading ? '⏳' : '⚡'}
                </div>
                <h3 className="font-semibold text-gray-800 mb-1">
                  {loading ? 'Gerando...' : orcamentos.filter(o => o.status === 'aprovado').length === 0 ? 'Aprovar & Gerar' : 'Gerar Propostas'}
                </h3>
                <p className="text-sm text-gray-600">
                  {orcamentos.filter(o => o.status === 'aprovado').length === 0 
                    ? `${orcamentos.length} pendente(s) → Aprovar todos`
                    : `${orcamentos.filter(o => o.status === 'aprovado').length} aprovado(s)`}
                </p>
              </button>

              <div className="p-6 admin-surface text-center">
                <div className="text-3xl mb-3 text-purple-600">📊</div>
                <h3 className="font-semibold text-gray-800 mb-1">Total Orçamentos</h3>
                <p className="text-sm text-gray-600">
                  {orcamentos.length} sistema(s)
                </p>
              </div>

              <div className="p-6 admin-surface text-center">
                <div className="text-3xl mb-3 text-orange-600">🎯</div>
                <h3 className="font-semibold text-gray-800 mb-1">Melhor Payback</h3>
                <p className="text-sm text-gray-600">
                  {orcamentos.length > 0 ? (
                    (() => {
                      // Calcular melhor payback
                      let melhorPayback = Infinity;
                      let melhorIndex = -1;
                      
                      orcamentos.forEach((orc, index) => {
                        const potenciaTotal = (orc.modulos * orc.pot_modulo) / 1000;
                        const pdespesaTotal = config.pdespesaFixo + (orc.pcusto * config.pdespesaVariavel / 100);
                        const totalFinal = orc.pcusto + pdespesaTotal;
                        const ppix = totalFinal; // PIX = base
                        const perf = calcularPerformanceCompleta(
                          potenciaTotal,
                          config.hsp,
                          config.performanceRate,
                          config.consumoMensal,
                          config.tarifa,
                          ppix,
                          getBonusMicroAtivo(orc),
                          config.bonusMicroPercent
                        );
                        const paybackMeses = perf.paybackMeses;
                        
                        if (paybackMeses < melhorPayback && paybackMeses > 0) {
                          melhorPayback = paybackMeses;
                          melhorIndex = index;
                        }
                      });
                      
                      return melhorIndex >= 0 ? `${melhorPayback.toFixed(1)} meses` : 'N/A';
                    })()
                  ) : 'N/A'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  const pdfId = resolveClienteId(clienteIdParam, cliente?.id);
                  if (pdfId) window.open(buildPropostaPdfUrl(pdfId, true), '_blank');
                }}
                disabled={!resolveClienteId(clienteIdParam, cliente?.id)}
                className="p-6 admin-surface hover:shadow-xl transition-shadow text-center disabled:opacity-50 disabled:cursor-not-allowed border-2 border-red-200 hover:border-red-400"
                title="Abrir proposta formatada para salvar como PDF (ideal para clientes sem acesso digital)"
              >
                <div className="text-3xl mb-3 text-red-600">📄</div>
                <h3 className="font-semibold text-gray-800 mb-1">Gerar PDF</h3>
                <p className="text-sm text-gray-600">Salvar para enviar</p>
              </button>
            </div>

            {/* Aviso para Aprovação */}
            {orcamentos.length > 0 && orcamentos.filter(o => o.status === 'aprovado').length === 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mb-6">
                <div className="flex items-center gap-4">
                  <div className="text-4xl">⚠️</div>
                  <div>
                    <h3 className="text-lg font-semibold text-yellow-800 mb-2">
                      Orçamentos Aguardando Aprovação
                    </h3>
                    <p className="text-yellow-700 mb-3">
                      Você tem <strong>{orcamentos.length}</strong> orçamento(s) pendente(s). 
                      Para gerar propostas, você precisa:
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setOrcamentos(prev => prev.map(orc => ({ ...orc, status: 'aprovado' as const })))}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
                      >
                        ✅ Aprovar Todos ({orcamentos.length})
                      </button>
                      <span className="text-yellow-600 self-center">ou</span>
                      <span className="text-yellow-600 self-center">Selecione individualmente na tabela abaixo</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tabela CRUD de Orçamentos - Controle Detalhado */}
            <div className="admin-surface overflow-hidden mb-8">
              <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  📋 Tabela de Orçamentos - Controle Detalhado
                </h2>
                <p className="text-blue-100 text-sm mt-1">
                  Edite módulos, inversores e quantidades. Coluna ⚡ Micro: verde = +{config.bonusMicroPercent}% geração.
                </p>
              </div>

              {orcamentos.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="text-6xl mb-4">📄</div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">
                    Nenhum orçamento cadastrado
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Adicione orçamentos para começar a comparar
                  </p>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    ➕ Adicionar Primeiro Orçamento
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-blue-50">
                        <th className="border border-gray-300 px-2 py-2 text-xs font-bold text-gray-700">Nº</th>
                        <th className="border border-gray-300 px-2 py-2 text-xs font-bold text-gray-700" title="Bônus de eficiência micro-inversor">
                          ⚡ Micro
                        </th>
                        <th className="border border-gray-300 px-3 py-2 text-xs font-bold text-gray-700">Nome/Origem</th>
                        <th className="border border-gray-300 px-2 py-2 text-xs font-bold text-gray-700">Distribuidora</th>
                        <th className="border border-gray-300 px-2 py-2 text-xs font-bold text-gray-700">P.Custo (R$)</th>
                        <th className="border border-gray-300 px-2 py-2 text-xs font-bold text-gray-700">Qtd Módulos</th>
                        <th className="border border-gray-300 px-2 py-2 text-xs font-bold text-gray-700">Pot/Módulo (W)</th>
                        <th className="border border-gray-300 px-2 py-2 text-xs font-bold text-gray-700">Marca Módulo</th>
                        <th className="border border-gray-300 px-2 py-2 text-xs font-bold text-gray-700">Qtd Inversores</th>
                        <th className="border border-gray-300 px-2 py-2 text-xs font-bold text-gray-700">Pot/Inversor (kW)</th>
                        <th className="border border-gray-300 px-2 py-2 text-xs font-bold text-gray-700">Marca Inversor</th>
                        <th className="border border-gray-300 px-2 py-2 text-xs font-bold text-gray-700">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orcamentos.map((orc, index) => (
                        <tr key={orc.id} className="hover:bg-gray-50">
                          <td className="border border-gray-300 px-2 py-2 text-center text-xs font-bold">{index + 1}</td>
                          <td className="border border-gray-300 px-2 py-2 text-center">
                            <MicroInversorToggle
                              ativo={getBonusMicroAtivo(orc)}
                              bonusPercent={config.bonusMicroPercent}
                              onToggle={() => toggleBonusMicro(index)}
                              compact
                            />
                          </td>
                          <td className="border border-gray-300 px-3 py-2">
                            <input
                              type="text"
                              value={orc.nome}
                              onChange={(e) => {
                                const updated = [...orcamentos];
                                updated[index] = { ...updated[index], nome: e.target.value };
                                setOrcamentos(updated);
                              }}
                              className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </td>
                          <td className="border border-gray-300 px-2 py-2">
                            <input
                              type="text"
                              value={orc.fornecedor}
                              onChange={(e) => {
                                const updated = [...orcamentos];
                                updated[index] = { ...updated[index], fornecedor: e.target.value };
                                setOrcamentos(updated);
                              }}
                              className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </td>
                          <td className="border border-gray-300 px-2 py-2">
                            <input
                              type="number"
                              value={orc.pcusto}
                              onChange={(e) => {
                                const updated = [...orcamentos];
                                updated[index] = { ...updated[index], pcusto: parseFloat(e.target.value) || 0 };
                                setOrcamentos(updated);
                              }}
                              className="w-20 px-2 py-1 text-xs border border-gray-200 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-right"
                            />
                          </td>
                          <td className="border border-gray-300 px-2 py-2">
                            <input
                              type="number"
                              value={orc.modulos}
                              onChange={(e) => {
                                updateOrcInversor(index, { modulos: parseInt(e.target.value) || 0 });
                              }}
                              className="w-16 px-2 py-1 text-xs border border-gray-200 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center"
                            />
                          </td>
                          <td className="border border-gray-300 px-2 py-2">
                            <input
                              type="number"
                              value={orc.pot_modulo}
                              onChange={(e) => {
                                const updated = [...orcamentos];
                                updated[index] = { ...updated[index], pot_modulo: parseInt(e.target.value) || 0 };
                                setOrcamentos(updated);
                              }}
                              className="w-16 px-2 py-1 text-xs border border-gray-200 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center"
                            />
                          </td>
                          <td className="border border-gray-300 px-2 py-2">
                            <input
                              type="text"
                              value={orc.marca_modulo}
                              onChange={(e) => {
                                const updated = [...orcamentos];
                                updated[index] = { ...updated[index], marca_modulo: e.target.value };
                                setOrcamentos(updated);
                              }}
                              className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </td>
                          <td className="border border-gray-300 px-2 py-2">
                            <input
                              type="number"
                              value={orc.inversores}
                              onChange={(e) => {
                                updateOrcInversor(index, { inversores: parseInt(e.target.value) || 0 });
                              }}
                              className="w-16 px-2 py-1 text-xs border border-gray-200 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center"
                            />
                          </td>
                          <td className="border border-gray-300 px-2 py-2">
                            <input
                              type="number"
                              step="0.1"
                              value={orc.pot_inv}
                              onChange={(e) => {
                                updateOrcInversor(index, { pot_inv: parseFloat(e.target.value) || 0 });
                              }}
                              className="w-16 px-2 py-1 text-xs border border-gray-200 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center"
                            />
                          </td>
                          <td className="border border-gray-300 px-2 py-2">
                            <input
                              type="text"
                              value={orc.marca_inversor}
                              onChange={(e) => {
                                updateOrcInversor(index, { marca_inversor: e.target.value });
                              }}
                              className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </td>
                          <td className="border border-gray-300 px-2 py-2 text-center">
                            <button
                              onClick={() => handleOrcamentoDelete(orc.id)}
                              className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
                              title="Excluir orçamento"
                            >
                              🗑️
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Tabela Comparativa - Somente Resultados */}
            <div className="admin-surface overflow-hidden mb-8">
              <div className="px-6 py-4 bg-gradient-to-r from-green-600 to-teal-600">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  📊 Tabela Comparativa - Resultados Financeiros
                </h2>
                <p className="text-green-100 text-sm mt-1">
                  Análise automática de performance e viabilidade (somente leitura)
                </p>
              </div>
              <OrcamentosComparisonTable
                orcamentos={orcamentos}
                config={config}
                onOrcamentoUpdate={handleOrcamentoUpdate}
                onOrcamentoDelete={handleOrcamentoDelete}
                onBulkAction={handleBulkAction}
              />
            </div>

            {/* Modal Adicionar Orçamento */}
            {showAddModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="admin-surface shadow-2xl p-6 max-w-md w-full mx-4">
                  <h3 className="text-xl font-bold text-gray-800 mb-4">Adicionar Novo Orçamento</h3>
                  <p className="text-gray-600 mb-6">
                    Um novo orçamento será adicionado com valores padrão que você pode editar na tabela.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={addNewOrcamento}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      ✅ Adicionar
                    </button>
                    <button
                      onClick={() => setShowAddModal(false)}
                      className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                    >
                      ❌ Cancelar
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="text-center text-gray-500 text-sm mt-8">
              <p>PIENG Solar - Sistema do Consultor v2.0 | Controle Avançado de Orçamentos</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
