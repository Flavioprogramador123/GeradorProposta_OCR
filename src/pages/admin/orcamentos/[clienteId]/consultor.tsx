import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useConsultorConfig } from '@/hooks/useConsultorConfig';
import ConsultorConfigPanel from '@/components/ConsultorConfigPanel';
import OrcamentosComparisonTable from '@/components/OrcamentosComparisonTable';
import TemplateSelector from '@/components/TemplateSelector';
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
  status: 'pendente' | 'analisando' | 'aprovado' | 'rejeitado';
}

export default function ConsultorOrcamentosPage() {
  const router = useRouter();
  const { clienteId } = router.query;
  const { config, updateConfig, resetConfig, calcularPrecos, calcularPerformance, calcularPdespesa } = useConsultorConfig();
  
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

  // Carregar dados do cliente e orçamentos
  useEffect(() => {
    if (!clienteId || clienteId === 'cliente' || typeof clienteId !== 'string') {
      console.warn('⚠️ clienteId inválido:', clienteId);
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);
        
        // 🔧 PRIORIDADE 1: Tentar carregar do localStorage (vindo do Gerador Rápido)
        const dadosLocalStorage = localStorage.getItem(`consultor-${clienteId}`);
        
        if (dadosLocalStorage) {
          try {
            const dados = JSON.parse(dadosLocalStorage);
            console.log('✅ Dados carregados do Gerador Rápido:', dados);
            
            // Aplicar configurações do Gerador Rápido
            if (dados.config) {
              updateConfig(dados.config);
            }
            
            // Configurar cliente
            const clienteData: Cliente = {
              id: clienteId as string,
              nome: dados.cliente?.nome || 'Cliente Exemplo',
              cidade: dados.cliente?.cidade || 'São Paulo',
              consumoMensal: dados.cliente?.consumoMensal || 600
            };
            
            // Configurar orçamentos
            const orcamentosData: OrcamentoComparativo[] = dados.orcamentos || [];
            
            setCliente(clienteData);
            setOrcamentos(orcamentosData);
            
            setLoading(false);
            return; // Sucesso, não precisa carregar dados simulados
          } catch (parseError) {
            console.warn('⚠️ Erro ao parsear dados do localStorage:', parseError);
          }
        }
        
        // 🔧 FALLBACK: Carregar PROPOSTA GERADA (não orçamentos individuais)
        console.log('📥 Carregando proposta gerada para:', clienteId);

        try {
          // Buscar proposta gerada usando a API correta que retorna dados completos
          const propostaRes = await fetch(`/api/propostas/${clienteId}`);

          if (!propostaRes.ok) {
            throw new Error('Proposta não encontrada');
          }

          const proposta = await propostaRes.json();
          console.log('✅ Proposta encontrada:', proposta);

          if (!proposta || !proposta.sistemas || !Array.isArray(proposta.sistemas)) {
            throw new Error('Dados da proposta incompletos - sistemas não encontrados');
          }

          // Configurar cliente
          const clienteData: Cliente = {
            id: clienteId as string,
            nome: proposta.cliente?.nome || 'Cliente',
            cidade: proposta.cliente?.cidade || 'N/A',
            consumoMensal: proposta.cliente?.consumoMensal || 600
          };

          // ✅ CARREGAR CONFIG DA PROPOSTA (valores originais usados na geração)
          const configProposta = proposta.config || {};
          
          console.log('✅ Config da proposta carregada no consultor:', {
            pdespesaFixo: configProposta.pdespesaFixo,
            pdespesaVariavel: configProposta.pdespesaVariavel,
            hsp: configProposta.hsp,
            tarifa: configProposta.tarifa
          });
          
          // ✅ Sincronizar configurações da proposta (prioridade: Config Proposta > Cliente > Default)
          updateConfig({
            hsp: configProposta.hsp || parseFloat(proposta.cliente?.hsp) || config.hsp,
            tarifa: configProposta.tarifa || parseFloat(proposta.cliente?.tarifa) || config.tarifa,
            consumoMensal: proposta.cliente?.consumoMensal || config.consumoMensal,
            // ✅ CARREGAR PDESPESA DA PROPOSTA (valores originais)
            pdespesaFixo: configProposta.pdespesaFixo || config.pdespesaFixo,
            pdespesaVariavel: configProposta.pdespesaVariavel || config.pdespesaVariavel,
            performanceRate: configProposta.performanceRate || config.performanceRate
          });

          // ✅ Converter sistemas da proposta em orçamentos usando VALORES EXATOS do Supabase
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

            return {
              id: sistema.id || `sistema-${index}`,
              nome: sistema.titulo || sistema.nome || `Sistema ${index + 1}`,
              fornecedor: sistema.distribuidora || sistema.fornecedor || 'SOOLLAR',
              pcusto: pcusto, // ✅ Valor exato do Supabase
              modulos: modulos, // ✅ Valor exato do Supabase
              pot_modulo: sistema.pot_modulo || 605,
              marca_modulo: sistema.marca_modulo || sistema.marcaModulo || 'Padrão',
              inversores: inversores, // ✅ Valor exato do Supabase
              pot_inv: sistema.pot_inv || sistema.potInv || 15,
              marca_inversor: sistema.marca_inversor || sistema.marcaInversor || 'Padrão',
              status: 'aprovado' as const
            };
          });

          console.log('✅ Cliente e sistemas carregados:', {
            cliente: clienteData.nome,
            sistemas: orcamentosData.length
          });

          setCliente(clienteData);
          setOrcamentos(orcamentosData);
        } catch (apiError) {
          console.error('❌ Erro ao carregar proposta:', apiError);

          // Se falhar, tentar buscar cliente básico
          try {
            const clienteRes = await fetch(`/api/admin/clientes/${clienteId}`);
            if (clienteRes.ok) {
              const clienteApiData = await clienteRes.json();
              setCliente({
                id: clienteId as string,
                nome: clienteApiData.nome || 'Cliente',
                cidade: clienteApiData.cidade || 'N/A',
                consumoMensal: clienteApiData.consumoMensal || 600
              });
            }
          } catch {
            // Fallback final
            setCliente({
              id: clienteId as string,
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
  }, [clienteId]);

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

  const addNewOrcamento = () => {
    const novoOrc: OrcamentoComparativo = {
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
      status: 'pendente'
    };
    setOrcamentos(prev => [...prev, novoOrc]);
    setShowAddModal(false);
  };

  const gerarPropostas = async () => {
    const aprovados = orcamentos.filter(o => o.status === 'aprovado');
    if (aprovados.length === 0) {
      alert('Nenhum orçamento aprovado para gerar propostas');
      return;
    }

    try {
      setLoading(true);
      
      const response = await fetch('/api/consultor/gerar-proposta', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clienteId,
          orcamentos,
          config,
          clientType: templateSelecionado?.tipo,
          subType: templateSelecionado?.subtipo
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao gerar proposta');
      }

      const result = await response.json();
      
      if (result.success) {
        // Abrir proposta na nova aba
        window.open(result.propostaUrl, '_blank');
        
        // Mostrar mensagem de sucesso com dados completos
        alert(`✅ Proposta gerada com sucesso!
        
📊 Dados da Proposta:
   • Orçamentos processados: ${result.orcamentosProcessados}
   • Melhor Payback: ${result.melhorPayback.toFixed(1)} meses
   • Melhor TIR: ${result.melhorTir.toFixed(1)}%
   • Preço PIX Melhor: R$ ${result.melhorPrecoPix.toLocaleString('pt-BR')}
   • Potência Melhor: ${result.melhorPotencia.toFixed(2)} kWp
   • Geração Mensal: ${result.melhorGeracao.toFixed(0)} kWh

🔧 Parâmetros Utilizados:
   • HSP: ${config.hsp}
   • Tarifa: R$ ${config.tarifa}/kWh
   • Pdespesa: R$ ${config.pdespesaFixo} + ${config.pdespesaVariavel}%
   • Desconto PIX: ${(config.descontoPix * 100).toFixed(0)}%

🌐 Proposta aberta em nova aba para avaliação!`);
      } else {
        throw new Error('Falha na geração da proposta');
      }
    } catch (error) {
      console.error('Erro ao gerar propostas:', error);
      alert(`❌ Erro ao gerar proposta: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando sistema do consultor...</p>
        </div>
      </div>
    );
  }

  if (!cliente) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-orange-50 flex items-center justify-center">
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

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-orange-50">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-7xl mx-auto">
            
            {/* Header */}
            <div className="flex justify-between items-start mb-8">
              <div>
                <h1 className="text-3xl font-bold text-gray-800 mb-4">
                  🎛️ Sistema do Consultor
                </h1>
                <div className="bg-white rounded-lg p-4 shadow-sm">
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
                  <a className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                    🏠 Admin
                  </a>
                </Link>
                <Link href={`/admin/orcamentos/${clienteId}`} legacyBehavior>
                  <a className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2">
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <button
                onClick={() => setShowAddModal(true)}
                className="p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow text-center border-2 border-dashed border-blue-300 hover:border-blue-500"
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
                className="p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow text-center disabled:opacity-50 disabled:cursor-not-allowed"
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

              <div className="p-6 bg-white rounded-xl shadow-lg text-center">
                <div className="text-3xl mb-3 text-purple-600">📊</div>
                <h3 className="font-semibold text-gray-800 mb-1">Total Orçamentos</h3>
                <p className="text-sm text-gray-600">
                  {orcamentos.length} sistema(s)
                </p>
              </div>

              <div className="p-6 bg-white rounded-xl shadow-lg text-center">
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
                        const ppix = totalFinal * (1 - config.descontoPix);
                        const geracaoMensal = potenciaTotal * config.hsp * 30.4 * config.performanceRate;
                        const economiaMensal = geracaoMensal * config.tarifa;
                        const paybackMeses = economiaMensal > 0 ? ppix / economiaMensal : Infinity;
                        
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
            <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-8">
              <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  📋 Tabela de Orçamentos - Controle Detalhado
                </h2>
                <p className="text-blue-100 text-sm mt-1">
                  Edite módulos, inversores e quantidades diretamente na tabela
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
                                const updated = [...orcamentos];
                                updated[index] = { ...updated[index], modulos: parseInt(e.target.value) || 0 };
                                setOrcamentos(updated);
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
                                const updated = [...orcamentos];
                                updated[index] = { ...updated[index], inversores: parseInt(e.target.value) || 0 };
                                setOrcamentos(updated);
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
                                const updated = [...orcamentos];
                                updated[index] = { ...updated[index], pot_inv: parseFloat(e.target.value) || 0 };
                                setOrcamentos(updated);
                              }}
                              className="w-16 px-2 py-1 text-xs border border-gray-200 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center"
                            />
                          </td>
                          <td className="border border-gray-300 px-2 py-2">
                            <input
                              type="text"
                              value={orc.marca_inversor}
                              onChange={(e) => {
                                const updated = [...orcamentos];
                                updated[index] = { ...updated[index], marca_inversor: e.target.value };
                                setOrcamentos(updated);
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
            <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-8">
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
                <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4">
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
