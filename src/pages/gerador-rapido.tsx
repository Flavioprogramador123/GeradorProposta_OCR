import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import MicroInversorToggle from '@/components/MicroInversorToggle';
import {
  syncBonusMicroAuto,
  getBonusMicroAtivo,
  calcularPerformanceCompleta,
} from '@/lib/calcularPerformance';
import { buildPropostaPdfUrl } from '@/lib/propostaPdf';
import { calcularPrecosDePix } from '@/lib/tabelaJurosCartao';
import {
  applyConfigRapidaToGerador,
  pickFromGeradorConfig,
  resolveConfigRapida,
  saveConfigRapida,
} from '@/lib/configRapidaShared';

interface Orcamento {
  nome: string;
  distribuidora: string;
  pcusto: number;
  /** Custo do kit sem frete (V3). Se presente, P.Custo = custo_kit + fretePadrao */
  custo_kit?: number;
  frete?: number;
  modulos: number;
  pot_modulo: number;
  marca_modulo: string;
  inversores: number;
  pot_inv: number;
  marca_inversor: string;
  bonusMicroAtivo?: boolean;
  bonusMicroManual?: boolean;
  pdespesa_fixo: number;
  pdespesa_variavel_percent: number;
  pdespesa_total: number;
}

export default function GeradorRapido() {
  const router = useRouter();
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);

  const [config, setConfig] = useState({
    nomeCliente: 'Cliente Padrão',
    cidadeCliente: 'Anápolis/GO',
    consumoMensal: 600,
    tipoImovel: 'Residencial',
    hsp: 5.21,
    tarifa: 1.10,
    performanceRate: 0.75,
    bonusMicroPercent: 5,
    pdespesaFixo: 3000,
    pdespesaVariavel: 22,
    fretePadrao: 0,
    metodo: 'variavel',
    descontoPix: 10.0,
    fatorParcelado: 1.20,
    fator12x: 0.88,
    fator18x: 0.83
  });

  const [resultados, setResultados] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [yamlInput, setYamlInput] = useState('');
  const [yamlStatus, setYamlStatus] = useState({ message: '', type: '', show: false });
  const [showYamlInput, setShowYamlInput] = useState(false);
  const [configSistema, setConfigSistema] = useState<any>(null);
  const [slugAtual, setSlugAtual] = useState<string | null>(null); // ✅ Slug da proposta carregada
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateSelecionado, setTemplateSelecionado] = useState<string>('padrao');
  const [salvarComoPendente, setSalvarComoPendente] = useState<boolean>(false);
  const [configRapidaReady, setConfigRapidaReady] = useState(false);
  const lastTemplateTapRef = useRef<{ template: string; time: number }>({ template: '', time: 0 });

  // Duplo clique / duplo toque no template = confirmar e salvar com esse template
  const confirmarComTemplate = (template: string) => {
    setShowTemplateModal(false);
    salvarProposta(salvarComoPendente, template);
  };

  const handleTemplateClick = (template: string) => {
    const now = Date.now();
    const last = lastTemplateTapRef.current;
    if (last.template === template && now - last.time < 400) {
      lastTemplateTapRef.current = { template: '', time: 0 };
      confirmarComTemplate(template);
      return;
    }
    lastTemplateTapRef.current = { template, time: now };
    setTemplateSelecionado(template);
  };

  // ✅ Função para carregar proposta existente
  const carregarPropostaExistente = async (clienteSlug: string) => {
    try {
      console.log('📥 Carregando proposta existente para:', clienteSlug);
      setLoading(true);

      // Buscar proposta do Supabase ou filesystem usando a API correta
      const response = await fetch(`/api/propostas/${clienteSlug}`);
      if (!response.ok) {
        throw new Error('Proposta não encontrada');
      }

      const propostaData = await response.json();
      console.log('✅ Dados da proposta carregados:', propostaData);
      console.log('📊 Estrutura da proposta:', {
        temCliente: !!propostaData?.cliente,
        temSistemas: !!propostaData?.sistemas,
        quantidadeSistemas: propostaData?.sistemas?.length || 0,
        keys: propostaData ? Object.keys(propostaData) : []
      });

      // Verificar se tem dados e sistemas
      if (!propostaData || !propostaData.sistemas || !Array.isArray(propostaData.sistemas) || propostaData.sistemas.length === 0) {
        console.error('❌ Estrutura inválida:', {
          temProposta: !!propostaData,
          temSistemas: !!propostaData?.sistemas,
          ehArray: Array.isArray(propostaData?.sistemas),
          quantidade: propostaData?.sistemas?.length,
          keys: propostaData ? Object.keys(propostaData) : [],
          primeiroSistema: propostaData?.sistemas?.[0]
        });
        throw new Error('Dados da proposta incompletos - sistemas não encontrados');
      }

      // ✅ Preencher TODOS os dados do cliente da proposta (não hardcoded)
      const cliente = propostaData.cliente || {};
      // ✅ CARREGAR CONFIG DA PROPOSTA (valores usados na geração original)
      const configProposta = propostaData.config || {};
      
      setConfig(prev => ({
        ...prev,
        nomeCliente: cliente.nome || prev.nomeCliente,
        cidadeCliente: cliente.cidade || prev.cidadeCliente,
        consumoMensal: cliente.consumoMensal || cliente.consumo || parseFloat(cliente.consumoKwh) || prev.consumoMensal,
        tipoImovel: cliente.tipoImovel || cliente.tipo || prev.tipoImovel,
        // ✅ Prioridade: Config da Proposta > Cliente > Config Sistema > Default
        hsp: configProposta.hsp || cliente.hsp || parseFloat(cliente.hspLocal?.toString().replace(',', '.')) || prev.hsp,
        tarifa: configProposta.tarifa || cliente.tarifa || parseFloat(cliente.tarifaEnergia?.toString().replace(',', '.')) || prev.tarifa,
        // ✅ CARREGAR PDESPESA DA PROPOSTA (valores originais usados)
        pdespesaFixo: configProposta.pdespesaFixo || prev.pdespesaFixo,
        pdespesaVariavel: configProposta.pdespesaVariavel || prev.pdespesaVariavel,
        performanceRate: configProposta.performanceRate || prev.performanceRate,
        metodo: configProposta.metodo || prev.metodo,
        descontoPix: configProposta.descontoPix || prev.descontoPix,
        fatorParcelado: configProposta.fatorParcelado || prev.fatorParcelado,
        fator12x: configProposta.fator12x || prev.fator12x,
        fator18x: configProposta.fator18x || prev.fator18x
      }));
      
      console.log('✅ Config da proposta carregada:', {
        pdespesaFixo: configProposta.pdespesaFixo,
        pdespesaVariavel: configProposta.pdespesaVariavel,
        hsp: configProposta.hsp,
        tarifa: configProposta.tarifa
      });

      console.log('📋 Dados do cliente carregados:', {
        nome: cliente.nome,
        cidade: cliente.cidade,
        consumo: cliente.consumoMensal || cliente.consumo,
        hsp: cliente.hsp || cliente.hspLocal,
        tarifa: cliente.tarifa || cliente.tarifaEnergia
      });

      // Converter sistemas em orçamentos com validação robusta
      const orcamentosCarregados: Orcamento[] = propostaData.sistemas.map((sistema: any, index: number) => {
        console.log(`📦 Processando sistema ${index + 1}:`, {
          titulo: sistema.titulo || sistema.nome,
          potencia: sistema.potencia || sistema.potTotal,
          pcusto: sistema.pcusto,
          precoCusto: sistema.precoCusto,
          total_final: sistema.total_final,
          ppix: sistema.ppix,
          precoPixDecimal: sistema.precoPixDecimal,
          pdespesa_total: sistema.pdespesa_total,
          modulos: sistema.modulos,
          pot_modulo: sistema.pot_modulo,
          sistema_completo: sistema // Para debug completo
        });
        
        // Extrair potência de diferentes formatos possíveis
        let potenciaTotal = 0;
        if (sistema.potTotal) {
          potenciaTotal = typeof sistema.potTotal === 'number' ? sistema.potTotal : parseFloat(sistema.potTotal.toString().replace(',', '.'));
        } else if (sistema.potencia) {
          const potenciaMatch = sistema.potencia.toString().match(/(\d+[.,]?\d*)/);
          potenciaTotal = potenciaMatch ? parseFloat(potenciaMatch[1].replace(',', '.')) : 0;
        } else if (sistema.modulos && sistema.pot_modulo) {
          potenciaTotal = (sistema.modulos * sistema.pot_modulo) / 1000;
        }

        // Extrair P.Custo de diferentes formatos com cálculo reverso quando necessário
        let pcusto = 0;
        
        // Converter valores para número (suporta strings formatadas como "R$ 13.500,00")
        const parseValue = (val: any): number => {
          if (typeof val === 'number') return val;
          if (!val) return 0;
          
          // Converter para string e remover espaços
          let str = val.toString().trim();
          
          // Se já é um número válido, retornar
          if (!isNaN(Number(str)) && !str.includes(',') && !str.includes('.')) {
            return Number(str);
          }
          
          // Remover tudo exceto dígitos, vírgulas e pontos
          str = str.replace(/[^\d,.-]/g, '');
          
          // Se está vazio após limpeza, retornar 0
          if (!str) return 0;
          
          // Se tem vírgula e ponto, assumir formato BR: 13.500,00 (ponto = milhar, vírgula = decimal)
          if (str.includes(',') && str.includes('.')) {
            // Remover pontos (separadores de milhar) e substituir vírgula por ponto
            str = str.replace(/\./g, '').replace(',', '.');
          } else if (str.includes(',')) {
            // Apenas vírgula, verificar se é decimal ou separador de milhar
            const parts = str.split(',');
            if (parts[1] && parts[1].length <= 2) {
              // Decimal (ex: "13500,50")
              str = str.replace(',', '.');
            } else {
              // Separador de milhar (ex: "13,500")
              str = str.replace(',', '');
            }
          }
          
          const parsed = parseFloat(str);
          return isNaN(parsed) ? 0 : parsed;
        };

        // Tentar extrair pcusto diretamente (prioridade: campos diretos)
        if (sistema.pcusto) {
          pcusto = parseValue(sistema.pcusto);
          console.log(`✅ Sistema ${index + 1}: pcusto direto = ${pcusto}`);
        } else if (sistema.precoCusto) {
          pcusto = parseValue(sistema.precoCusto);
          console.log(`✅ Sistema ${index + 1}: precoCusto = ${pcusto}`);
        } else {
          // Se não tem pcusto, calcular a partir do preço final (precoPixDecimal/ppix)
          // O precoPixDecimal JÁ É o total final (pcusto + pdespesa)
          // Precisamos calcular o pcusto reverso
          
          // Tentar múltiplos campos possíveis para o preço final
          const precoFinal = parseValue(sistema.precoPixDecimal) || 
                            parseValue(sistema.ppix) || 
                            parseValue(sistema.total_final) || 
                            parseValue(sistema.valorTotal) ||
                            parseValue(sistema.precoAtual) ||
                            parseValue(sistema.precoRiscado) ||
                            parseValue(sistema.preco) ||
                            parseValue(sistema.valor);
          
          // Tentar múltiplos campos possíveis para pdespesa
          const pdespesaTotal = parseValue(sistema.pdespesa_total) || 
                               parseValue(sistema.pdespesaTotal) ||
                               parseValue(sistema.preco_despesa) ||
                               parseValue(sistema.despesa) ||
                               parseValue(sistema.despesas);
          
          console.log(`🔍 Sistema ${index + 1} - Valores extraídos:`, {
            precoFinal,
            pdespesaTotal,
            precoPixDecimal_raw: sistema.precoPixDecimal,
            ppix_raw: sistema.ppix,
            total_final_raw: sistema.total_final
          });
          
          if (precoFinal > 0) {
            if (pdespesaTotal > 0 && pdespesaTotal < precoFinal) {
              // Calcular pcusto: precoFinal = pcusto + pdespesa_total
              pcusto = precoFinal - pdespesaTotal;
              console.log(`✅ Sistema ${index + 1}: Calculado pcusto = ${precoFinal} - ${pdespesaTotal} = ${pcusto}`);
            } else {
              // Se não tem pdespesa, calcular usando configurações atuais
              // Fórmula: precoFinal = pcusto + (pdespesaFixo + pcusto * pdespesaVariavel/100)
              // precoFinal = pcusto * (1 + pdespesaVariavel/100) + pdespesaFixo
              // pcusto = (precoFinal - pdespesaFixo) / (1 + pdespesaVariavel/100)
              const pdespesaFixo = config.pdespesaFixo || 2000;
              const pdespesaVariavel = config.pdespesaVariavel || 15;
              const fator = 1 + (pdespesaVariavel / 100);
              pcusto = Math.max(0, (precoFinal - pdespesaFixo) / fator);
              console.log(`📊 Sistema ${index + 1}: Estimado pcusto = (${precoFinal} - ${pdespesaFixo}) / ${fator} = ${pcusto}`);
            }
          } else {
            console.warn(`⚠️ Sistema ${index + 1}: Não foi possível determinar preço final, tentando calcular da potência`);
            // Tentar estimar baseado na potência (R$ 4.000/kWp é um valor razoável)
            if (potenciaTotal > 0) {
              pcusto = potenciaTotal * 4000; // Estimativa conservadora
              console.log(`📊 Sistema ${index + 1}: Estimado pcusto da potência = ${potenciaTotal} kWp * 4000 = ${pcusto}`);
            } else {
              pcusto = 10000; // Valor padrão mínimo
              console.warn(`⚠️ Sistema ${index + 1}: Usando valor padrão mínimo de pcusto = ${pcusto}`);
            }
          }
        }
        
        // Log detalhado para debug ANTES do cálculo
        console.log(`💰 Sistema ${index + 1} - Dados brutos do sistema:`, {
          titulo: sistema.titulo || sistema.nome,
          pcusto_direto: sistema.pcusto,
          precoCusto: sistema.precoCusto,
          total_final: sistema.total_final,
          ppix: sistema.ppix,
          precoPixDecimal: sistema.precoPixDecimal,
          precoAtual: sistema.precoAtual,
          precoRiscado: sistema.precoRiscado,
          pdespesa_total: sistema.pdespesa_total,
          pdespesaTotal: sistema.pdespesaTotal,
          preco_despesa: sistema.preco_despesa,
          valorTotal: sistema.valorTotal,
          // Mostrar TODOS os campos do sistema para debug
          todas_chaves: Object.keys(sistema)
        });
        
        // Log após cálculo
        console.log(`✅ Sistema ${index + 1} - pcusto final calculado:`, pcusto);
        
        // Calcular módulos e inversores se não existirem (com valores mínimos garantidos)
        let modulos = 0;
        if (sistema.modulos) {
          modulos = typeof sistema.modulos === 'number' ? sistema.modulos : parseInt(sistema.modulos.toString()) || 0;
        } else if (potenciaTotal > 0) {
          modulos = Math.round(potenciaTotal * 1000 / 605);
        } else {
          modulos = 10; // Valor padrão mínimo
        }
        
        let inversores = 0;
        if (sistema.inversores) {
          inversores = typeof sistema.inversores === 'number' ? sistema.inversores : parseInt(sistema.inversores.toString()) || 0;
        } else if (potenciaTotal > 0) {
          inversores = Math.ceil(potenciaTotal / 15);
        } else {
          inversores = 1; // Valor padrão mínimo
        }
        
        let pot_modulo = 0;
        if (sistema.pot_modulo) {
          pot_modulo = typeof sistema.pot_modulo === 'number' ? sistema.pot_modulo : parseFloat(sistema.pot_modulo.toString().replace(',', '.')) || 0;
        } else {
          pot_modulo = 605; // Valor padrão
        }
        
        let pot_inv = 0;
        if (sistema.pot_inv) {
          pot_inv = typeof sistema.pot_inv === 'number' ? sistema.pot_inv : parseFloat(sistema.pot_inv.toString().replace(',', '.')) || 0;
        } else {
          pot_inv = 15; // Valor padrão
        }

        // Garantir valores mínimos válidos - se ainda for 0, usar valor baseado na potência
        // Garantir valores mínimos válidos - se ainda for 0, usar valor baseado na potência
        if (pcusto <= 0) {
          // Estimar pcusto baseado na potência (R$ 4.000/kWp é um valor razoável)
          pcusto = Math.max(10000, potenciaTotal * 4000);
          console.warn(`⚠️ Sistema ${index + 1} tem pcusto inválido, usando estimativa baseada em potência: ${pcusto} (${potenciaTotal} kWp × R$ 4.000/kWp)`);
        }
        
        if (modulos <= 0) modulos = 10;
        if (pot_modulo <= 0) pot_modulo = 605;

        const orcamento: Orcamento = {
          nome: sistema.titulo || sistema.nome || `Sistema ${index + 1}`,
          distribuidora: sistema.distribuidora || sistema.fornecedor || 'Fornecedor',
          pcusto,
          modulos,
          pot_modulo,
          marca_modulo: sistema.marca_modulo || 'Padrão',
          inversores: inversores || 1,
          pot_inv: pot_inv || 15,
          marca_inversor: sistema.marca_inversor || 'Padrão',
          // ✅ Prioridade: Sistema > Config da Proposta > Config Atual > Default
          pdespesa_fixo: parseValue(sistema.pdespesa_fixo) || parseValue(sistema.pdespesaFixo) || (propostaData.config?.pdespesaFixo) || config.pdespesaFixo,
          pdespesa_variavel_percent: parseValue(sistema.pdespesa_variavel_percent) || parseValue(sistema.pdespesaVariavel) || (propostaData.config?.pdespesaVariavel) || config.pdespesaVariavel,
          pdespesa_total: parseValue(sistema.pdespesa_total) || parseValue(sistema.pdespesaTotal) || 0
        };

        console.log(`✅ Orçamento ${index + 1} convertido:`, {
          nome: orcamento.nome,
          pcusto: orcamento.pcusto,
          modulos: orcamento.modulos,
          pot_modulo: orcamento.pot_modulo,
          inversores: orcamento.inversores,
          valido: orcamento.pcusto > 0 && orcamento.modulos > 0 && orcamento.pot_modulo > 0,
          sistemaOriginal: {
            pcusto: sistema.pcusto,
            precoCusto: sistema.precoCusto,
            valorTotal: sistema.valorTotal,
            total_final: sistema.total_final,
            ppix: sistema.ppix,
            modulos: sistema.modulos,
            pot_modulo: sistema.pot_modulo
          }
        });

        return orcamento;
      });

      // Validar orçamentos antes de salvar com logs detalhados
      const orcamentosValidos = orcamentosCarregados.filter((orc, index) => {
        const validacoes = {
          temOrcamento: !!orc,
          temNome: !!orc?.nome,
          pcustoValido: orc?.pcusto > 0,
          modulosValido: orc?.modulos > 0,
          pot_moduloValido: orc?.pot_modulo > 0
        };
        
        const valido = validacoes.temOrcamento && validacoes.temNome && validacoes.pcustoValido && validacoes.modulosValido && validacoes.pot_moduloValido;
        
        if (!valido) {
          console.warn(`⚠️ Orçamento ${index + 1} inválido será removido:`, {
            orcamento: orc,
            validacoes,
            valores: {
              nome: orc?.nome,
              pcusto: orc?.pcusto,
              modulos: orc?.modulos,
              pot_modulo: orc?.pot_modulo
            }
          });
        } else {
          console.log(`✅ Orçamento ${index + 1} válido:`, {
            nome: orc.nome,
            pcusto: orc.pcusto,
            modulos: orc.modulos,
            pot_modulo: orc.pot_modulo
          });
        }
        
        return valido;
      });

      if (orcamentosValidos.length === 0) {
        throw new Error('Nenhum orçamento válido encontrado na proposta. Verifique os dados dos sistemas.');
      }

      console.log(`✅ ${orcamentosValidos.length} de ${orcamentosCarregados.length} orçamentos válidos`);
      setOrcamentos(orcamentosValidos);
      
      // ✅ Definir slug atual quando a proposta é carregada
      const slugProposta = propostaData.slug || clienteSlug;
      setSlugAtual(slugProposta);
      console.log('📌 Slug da proposta carregada:', slugProposta);
      
      setLoading(false);

      console.log(
        `✅ Proposta carregada: ${propostaData.cliente?.nome || 'N/A'} · ${orcamentosValidos.length}/${orcamentosCarregados.length} sistemas`
      );
    } catch (error) {
      console.error('❌ Erro ao carregar proposta:', error);
      alert(`❌ Erro ao carregar proposta do cliente ${clienteSlug}.\n\nVerifique se a proposta existe.`);
      setLoading(false);
    }
  };

  // Carregar configurações do sistema + sessão compartilhada (4a ↔ Gerador)
  // Sessão (localStorage / bridge V3) prevalece sobre /admin/configuracoes.
  useEffect(() => {
    const carregarConfigSistema = async () => {
      try {
        const response = await fetch('/api/admin/config');
        const configData = response.ok ? await response.json() : {};
        if (response.ok) {
          console.log('🔧 Configurações carregadas:', configData);
          setConfigSistema(configData);
        }

        // Bridge V3 pode já ter gravado pdespesa/frete na sessão — respeitar
        const shared = resolveConfigRapida(configData);
        setConfig((prev) => applyConfigRapidaToGerador(prev, shared));
        setConfigRapidaReady(true);

        console.log('✅ Config rápida compartilhada:', {
          hsp: shared.hsp,
          tarifa: shared.tarifa,
          pdespesaFixo: shared.pdespesaFixo,
          pdespesaVariavel: shared.pdespesaVariavel,
          fretePadrao: shared.fretePadrao,
          fonte: 'sessão>admin',
        });
      } catch (error) {
        console.error('Erro ao carregar configurações:', error);
        const shared = resolveConfigRapida(null);
        setConfig((prev) => applyConfigRapidaToGerador(prev, shared));
        setConfigRapidaReady(true);
      }
    };

    carregarConfigSistema();
  }, []);

  // Persistir Configurações Rápidas para a 4a (e vice-versa)
  useEffect(() => {
    if (!configRapidaReady) return;
    saveConfigRapida(pickFromGeradorConfig(config));
  }, [
    configRapidaReady,
    config.nomeCliente,
    config.cidadeCliente,
    config.consumoMensal,
    config.tipoImovel,
    config.hsp,
    config.tarifa,
    config.pdespesaFixo,
    config.pdespesaVariavel,
    config.fretePadrao,
    config.performanceRate,
    config.bonusMicroPercent,
  ]);

  // ✅ CARREGAR PROPOSTA EXISTENTE quando há parâmetro 'cliente' na URL
  // Esta função é usada tanto pelo botão "Editar" em /admin quanto em /admin/orcamentos
  // Ambos buscam dados do Supabase através da API /api/propostas/[slug]
  useEffect(() => {
    if (!router.isReady) return;

    const clienteSlug = router.query.cliente as string;
    if (clienteSlug) {
      console.log('📥 Parâmetro cliente detectado na URL:', clienteSlug);
      carregarPropostaExistente(clienteSlug);
      return; // Não processar outros modos se cliente foi detectado
    }

    // Bridge V3 → Gerador (5a)
    if (router.query.modo === 'v3') {
      const raw = localStorage.getItem('v3-gerador-bridge');
      if (raw) {
        try {
          const dados = JSON.parse(raw);
          console.log('🔗 Bridge V3 → Gerador:', dados);

          if (dados.cliente) {
            setConfig((prev) => {
              const next = {
                ...prev,
                nomeCliente: dados.cliente.nomeCliente || prev.nomeCliente,
                cidadeCliente: dados.cliente.cidadeCliente || prev.cidadeCliente,
                consumoMensal: dados.cliente.consumoMensal || prev.consumoMensal,
                tipoImovel: dados.cliente.tipoImovel || prev.tipoImovel,
                hsp: dados.cliente.hsp ?? prev.hsp,
                tarifa: dados.cliente.tarifa ?? prev.tarifa,
                pdespesaFixo: dados.pdespesa?.pdespesaFixo ?? prev.pdespesaFixo,
                pdespesaVariavel: dados.pdespesa?.pdespesaVariavel ?? prev.pdespesaVariavel,
                fretePadrao:
                  dados.fretePadrao != null
                    ? Number(dados.fretePadrao)
                    : prev.fretePadrao,
              };
              saveConfigRapida(pickFromGeradorConfig(next));
              return next;
            });
          }

          const freteBridge =
            dados.fretePadrao != null ? Math.max(0, Number(dados.fretePadrao) || 0) : null;

          const lista: Orcamento[] = (dados.orcamentos || []).map((orc: any, index: number) => {
            const freteOrc =
              orc.frete != null
                ? Math.max(0, Number(orc.frete) || 0)
                : freteBridge != null
                  ? freteBridge
                  : 0;
            const precoCheio = Number(orc.precoCusto || orc.valorTotal || 0) || 0;
            const kit =
              orc.custo_kit != null
                ? Math.max(0, Number(orc.custo_kit) || 0)
                : Math.max(0, precoCheio - freteOrc);
            const freteCfg = freteBridge != null ? freteBridge : freteOrc;
            const pcusto = Math.round((kit + freteCfg) * 100) / 100;
            return syncBonusMicroAuto({
              nome: orc.titulo_v3 || `V3 ${index + 1} - ${orc.fornecedor || 'kit'}`,
              distribuidora: orc.fornecedor || 'V3',
              pcusto,
              custo_kit: kit,
              frete: freteCfg,
              modulos: orc.modulos || 0,
              pot_modulo: orc.pot_modulo || 550,
              marca_modulo: orc.marca_modulo || 'Padrão',
              inversores: orc.inversores || 1,
              pot_inv: orc.pot_inv || 2.5,
              marca_inversor: orc.marca_inversor || 'Padrão',
              bonusMicroAtivo:
                typeof orc.bonusMicroAtivo === 'boolean' ? orc.bonusMicroAtivo : undefined,
              bonusMicroManual: typeof orc.bonusMicroAtivo === 'boolean',
              pdespesa_fixo: dados.pdespesa?.pdespesaFixo ?? config.pdespesaFixo,
              pdespesa_variavel_percent: dados.pdespesa?.pdespesaVariavel ?? config.pdespesaVariavel,
              pdespesa_total: 0,
            });
          });

          setOrcamentos(lista);
          localStorage.removeItem('v3-gerador-bridge');
          console.log(
            `✅ Bridge V3: ${lista.length} orçamento(s) · ${dados.origem || ''}`
          );
        } catch (error) {
          console.error('Erro bridge V3:', error);
          alert('❌ Erro ao carregar bridge V3.');
        }
      }
    }

    // Verificar se está no modo "reaproveitar" (um único orçamento)
    if (router.query.modo === 'reaproveitar') {
      const dadosReaproveitamento = localStorage.getItem('orcamento-reaproveitar');
      if (dadosReaproveitamento) {
        try {
          const dados = JSON.parse(dadosReaproveitamento);
          console.log('♻️ Reaproveitando orçamento:', dados);

          // Criar orçamento a partir dos dados reaproveitados
          const orc = dados.orcamento;
          const novoOrcamento: Orcamento = {
            nome: `Reaproveitado - ${orc.fornecedor}`,
            distribuidora: orc.fornecedor || 'Fornecedor',
            pcusto: orc.precoCusto || orc.valorTotal || 0,
            modulos: orc.modulos || orc.componentes?.modulos?.quantidade || 0,
            pot_modulo: orc.componentes?.modulos?.potencia || 550,
            marca_modulo: orc.componentes?.modulos?.marca || 'Padrão',
            inversores: orc.inversores || orc.componentes?.inversores?.quantidade || 1,
            pot_inv: orc.componentes?.inversores?.potencia || 2.5,
            marca_inversor: orc.componentes?.inversores?.marca || 'Padrão',
            pdespesa_fixo: config.pdespesaFixo,
            pdespesa_variavel_percent: config.pdespesaVariavel,
            pdespesa_total: 0
          };

          // Adicionar orçamento à lista
          setOrcamentos([novoOrcamento]);

          // Limpar localStorage
          localStorage.removeItem('orcamento-reaproveitar');

          // Mostrar mensagem de sucesso
          console.log('✅ Orçamento reaproveitado:', dados.origem);
        } catch (error) {
          console.error('Erro ao reaproveitar orçamento:', error);
          alert('❌ Erro ao carregar orçamento. Tente novamente.');
        }
      }
    }
    
    // Verificar se está no modo "reaproveitar-todos" (múltiplos orçamentos)
    if (router.query.modo === 'reaproveitar-todos') {
      const dadosReaproveitamento = localStorage.getItem('orcamentos-reaproveitar-todos');
      if (dadosReaproveitamento) {
        try {
          const dados = JSON.parse(dadosReaproveitamento);
          console.log('♻️ Reaproveitando TODOS os orçamentos:', dados);
          
          // Criar orçamentos a partir dos dados reaproveitados
          const orcamentosReaproveitados: Orcamento[] = dados.orcamentos.map((orc: any, index: number) => ({
            nome: `Reaproveitado ${index + 1} - ${orc.fornecedor}`,
            distribuidora: orc.fornecedor || 'Fornecedor',
            pcusto: orc.precoCusto || orc.valorTotal || 0,
            modulos: orc.modulos || 0,
            pot_modulo: orc.pot_modulo || 550,
            marca_modulo: orc.marca_modulo || 'Padrão',
            inversores: orc.inversores || 1,
            pot_inv: orc.pot_inv || 2.5,
            marca_inversor: orc.marca_inversor || 'Padrão',
            pdespesa_fixo: config.pdespesaFixo,
            pdespesa_variavel_percent: config.pdespesaVariavel,
            pdespesa_total: 0
          }));
          
          // Adicionar TODOS os orçamentos à lista
          setOrcamentos(orcamentosReaproveitados);
          
          // Limpar localStorage
          localStorage.removeItem('orcamentos-reaproveitar-todos');
          
          // Mostrar mensagem de sucesso
          console.log(`✅ ${dados.quantidadeTotal} orçamento(s) reaproveitado(s):`, dados.origem);
        } catch (error) {
          console.error('Erro ao reaproveitar orçamentos:', error);
          alert('❌ Erro ao carregar orçamentos. Tente novamente.');
        }
      }
    }
  }, [router.isReady, router.query.cliente, router.query.modo]);

  // PIX = base; à vista = total 12× cartão; parcelas pela taxa mensal configurada
  const calcularPrecos = (totalFinalTabela: number) => {
    const markup = configSistema?.fatorParcelado || config.fatorParcelado || 1.20;
    const taxa =
      Number(configSistema?.taxaCartaoMensal ?? (config as { taxaCartaoMensal?: number }).taxaCartaoMensal ?? 1.51) ||
      1.51;
    return calcularPrecosDePix(totalFinalTabela, markup, taxa);
  };

  // Função para calcular performance
  const calcularPerformance = (
    potenciaKw: number,
    hsp: number,
    consumoMensal: number,
    tarifa: number,
    investimentoPix: number,
    bonusMicroAtivo = false
  ) => {
    return calcularPerformanceCompleta(
      potenciaKw,
      hsp,
      config.performanceRate,
      consumoMensal,
      tarifa,
      investimentoPix,
      bonusMicroAtivo,
      config.bonusMicroPercent
    );
  };

  const updateOrcInversor = (index: number, updates: Partial<Orcamento>) => {
    setOrcamentos((prev) => {
      const novosOrc = [...prev];
      novosOrc[index] = syncBonusMicroAuto({ ...novosOrc[index], ...updates });
      return novosOrc;
    });
  };

  const toggleBonusMicro = (index: number) => {
    setOrcamentos((prev) => {
      const novosOrc = [...prev];
      const orc = novosOrc[index];
      novosOrc[index] = {
        ...orc,
        bonusMicroManual: true,
        bonusMicroAtivo: !getBonusMicroAtivo(orc),
      };
      return novosOrc;
    });
  };

  // Calcular resultados
  const calcularResultados = () => {
    console.log('🔄 Iniciando cálculo de resultados...');
    console.log('📊 Total de orçamentos:', orcamentos.length);

    // Debug: mostrar todos os orçamentos
    orcamentos.forEach((orc, index) => {
      console.log(`Orçamento ${index + 1}:`, {
        nome: orc.nome,
        pcusto: orc.pcusto,
        modulos: orc.modulos,
        pot_modulo: orc.pot_modulo,
        valido: orc && orc.nome && orc.pcusto > 0 && orc.modulos > 0 && orc.pot_modulo > 0
      });
    });

    // Filtrar apenas orçamentos válidos
    const orcamentosValidos = orcamentos.filter(orc => {
      const isValid = orc && orc.nome && orc.pcusto > 0 && orc.modulos > 0 && orc.pot_modulo > 0;
      if (!isValid) {
        console.warn('❌ Orçamento inválido filtrado:', orc);
      }
      return isValid;
    });

    console.log(`✅ Orçamentos válidos: ${orcamentosValidos.length} de ${orcamentos.length}`);

    const resultados = orcamentosValidos.map(orc => {
      const potTotal = (orc.modulos * orc.pot_modulo) / 1000;
      const pcustoEfetivo =
        orc.custo_kit != null
          ? Math.round((orc.custo_kit + Math.max(0, config.fretePadrao || 0)) * 100) / 100
          : orc.pcusto;
      const pdespesaDinamica = config.pdespesaFixo + (pcustoEfetivo * config.pdespesaVariavel) / 100;
      const totalFinalTabela = pcustoEfetivo + pdespesaDinamica;
      const precos = calcularPrecos(totalFinalTabela);
      const performance = calcularPerformance(
        potTotal,
        config.hsp,
        config.consumoMensal,
        config.tarifa,
        precos.ppix,
        getBonusMicroAtivo(orc)
      );

      return {
        nome: orc.nome,
        distribuidora: orc.distribuidora,
        potTotal,
        pcusto: pcustoEfetivo,
        pdespesa: pdespesaDinamica,
        total_final: totalFinalTabela,
        pdespesa_fixo: config.pdespesaFixo,
        pdespesa_variavel: (pcustoEfetivo * config.pdespesaVariavel) / 100,
        frete: config.fretePadrao || 0,
        custo_kit: orc.custo_kit,
        marca_modulo: orc.marca_modulo,
        marca_inversor: orc.marca_inversor,
        modulos: orc.modulos,
        pot_modulo: orc.pot_modulo,
        inversores: orc.inversores,
        pot_inv: orc.pot_inv,
        bonusMicroAtivo: getBonusMicroAtivo(orc),
        bonusMicroManual: orc.bonusMicroManual,
        ...precos,
        ...performance
      };
    }).filter(resultado => resultado && resultado.nome);

    console.log('📈 Resultados finais:', resultados.length);

    // Ordenar por PIX
    resultados.sort((a, b) => a.ppix - b.ppix);
    setResultados(resultados);
  };

  // Carregar exemplo YAML com dados corretos do Cliente Padrão
  const carregarExemploYAML = () => {
    const exemploYAML = `cliente:
  nome: "Cliente Padrão"
  cidade: "Anápolis/GO"
  consumo_mensal: 800
  tipo_imovel: "Residencial"
  hsp: 5.21
  tarifa: 0.982

consolidado_orcamentos_distribuidores:
  sollar_distribuidora:
    - orcamento:
        arquivo_origem: "solar01.pdf"
        preco_custo: 5445.76
        inversores:
          - quantidade: 1
            marca: "SAJ"
            potencia_unitaria: "3K-R5"
        modulos:
          - quantidade: 8
            marca: "NPLUS"
            potencia_unitaria: "580W"
    - orcamento:
        arquivo_origem: "solar02.pdf"
        preco_custo: 5641.52
        inversores:
          - quantidade: 1
            marca: "SAJ"
            potencia_unitaria: "3K-R5"
        modulos:
          - quantidade: 8
            marca: "GCL"
            potencia_unitaria: "615W"
  belenergy:
    - orcamento:
        orcamento_id: "WEB-004411732"
        arquivo_origem: "Cotação WEB-004411732.pdf"
        preco_custo: 6232.77
        inversores:
          - quantidade: 1
            marca: "AUXSOL"
            potencia_unitaria: "3.3KW"
        modulos:
          - quantidade: 8
            marca: "ASTRONERGY"
            potencia_unitaria: "575W"`;

    setYamlInput(exemploYAML);
    mostrarYamlStatus('📋 Exemplo YAML carregado com dados corretos do Daniel Verdura 03!', 'success');
  };

  // Processar YAML
  const processarYAML = () => {
    if (!yamlInput.trim()) {
      mostrarYamlStatus('⚠️ Por favor, cole um YAML válido ou carregue o exemplo.', 'error');
      return;
    }

    try {
      const orcamentosProcessados = extrairOrcamentosDoYAML(yamlInput);
      
      if (orcamentosProcessados.length === 0) {
        mostrarYamlStatus('⚠️ Nenhum orçamento encontrado no YAML.', 'error');
        return;
      }

      // Manter histórico: adicionar novos orçamentos aos existentes
      const novosOrcamentos = [...orcamentos, ...orcamentosProcessados];
      setOrcamentos(novosOrcamentos);
      console.log('📋 Orçamentos após processamento:', novosOrcamentos);

      const dadosCliente = extrairDadosClienteDoYAML(yamlInput);
      if (dadosCliente.nome) {
        setConfig(prev => ({...prev, nomeCliente: dadosCliente.nome}));
      }
      if (dadosCliente.cidade) {
        setConfig(prev => ({...prev, cidadeCliente: dadosCliente.cidade}));
      }
      if (dadosCliente.consumo_mensal) {
        setConfig(prev => ({...prev, consumoMensal: dadosCliente.consumo_mensal}));
      }
      if (dadosCliente.tipo_imovel) {
        setConfig(prev => ({...prev, tipoImovel: dadosCliente.tipo_imovel}));
      }
      if (dadosCliente.hsp) {
        setConfig(prev => ({...prev, hsp: dadosCliente.hsp}));
      }
      if (dadosCliente.tarifa) {
        setConfig(prev => ({...prev, tarifa: dadosCliente.tarifa}));
      }

      mostrarYamlStatus(`✅ YAML processado com sucesso! ${orcamentosProcessados.length} orçamentos encontrados. Total: ${novosOrcamentos.length}`, 'success');
      calcularResultados();

    } catch (error) {
      mostrarYamlStatus(`❌ Erro ao processar YAML: ${error instanceof Error ? error.message : 'Erro desconhecido'}`, 'error');
    }
  };

  // Extrair orçamentos do YAML com dados completos
  const extrairOrcamentosDoYAML = (yamlText: string) => {
    const orcamentos: Orcamento[] = [];
    const linhas = yamlText.split('\n');

    let orcamentoAtual: Orcamento | null = null;
    let dentroOrcamento = false;
    let dentroModulos = false;
    let dentroInversores = false;
    let contadorModulos = 0;
    let contadorInversores = 0;
    let distribuidoraAtual = '';

    for (let i = 0; i < linhas.length; i++) {
      const linha = linhas[i].trim();
      const indentacao = linhas[i].length - linhas[i].trimStart().length;

      // Detectar distribuidora
      if (linha.includes('sollar_distribuidora:')) {
        distribuidoraAtual = 'SOOLLAR';
      } else if (linha.includes('belenergy:')) {
        distribuidoraAtual = 'BELENERGY';
      }

      // Detectar início de novo bloco de orçamento (- orcamento:)
      if (linha.includes('- orcamento:') || linha === 'orcamento:') {
        if (orcamentoAtual) {
          // Calcular Pdespesa antes de adicionar
          const pdespesaVariavelValor = orcamentoAtual.pcusto * (config.pdespesaVariavel / 100);
          orcamentoAtual.pdespesa_fixo = config.pdespesaFixo;
          orcamentoAtual.pdespesa_variavel_percent = config.pdespesaVariavel;
          orcamentoAtual.pdespesa_total = orcamentoAtual.pdespesa_fixo + pdespesaVariavelValor;
          orcamentos.push(orcamentoAtual);
        }

        // Criar novo orçamento com nome padrão
        const nomeTemporario = `Orçamento ${orcamentos.length + 1}`;

        orcamentoAtual = {
          nome: nomeTemporario,
          distribuidora: distribuidoraAtual,
          pcusto: 0,
          modulos: 0,
          pot_modulo: 0,
          marca_modulo: '',
          inversores: 0,
          pot_inv: 0,
          marca_inversor: '',
          pdespesa_fixo: config.pdespesaFixo,
          pdespesa_variavel_percent: config.pdespesaVariavel,
          pdespesa_total: 0
        };
        dentroOrcamento = true;
        dentroModulos = false;
        dentroInversores = false;
        contadorModulos = 0;
        contadorInversores = 0;
      }

      // Capturar nome do orçamento (orcamento_id ou arquivo_origem)
      else if ((linha.includes('orcamento_id:') || linha.includes('arquivo_origem:')) && dentroOrcamento && orcamentoAtual) {
        const nome = linha.split('\"')[1] || linha.split(':')[1].trim().replace(/\"/g, '');
        if (nome && orcamentoAtual.nome.startsWith('Orçamento')) {
          // Só atualiza o nome se ainda for o nome padrão
          orcamentoAtual.nome = nome;
        }
      }

      // Detectar preço de custo
      else if ((linha.includes('preco_custo:') || linha.includes('preco_total:')) && dentroOrcamento) {
        const valor = parseFloat(linha.split(':')[1].trim());
        if (orcamentoAtual && !isNaN(valor) && valor > 0) {
          orcamentoAtual.pcusto = valor;
        }
      }

      // Detectar seção de módulos
      else if (linha.includes('modulos:') && dentroOrcamento) {
        dentroModulos = true;
        dentroInversores = false;
      }

      // Detectar seção de inversores
      else if (linha.includes('inversores:') && dentroOrcamento) {
        dentroInversores = true;
        dentroModulos = false;
      }

      // Processar dados dos módulos
      else if (linha.includes('quantidade:') && dentroModulos && dentroOrcamento) {
        const qtd = parseInt(linha.split(':')[1].trim());
        if (orcamentoAtual) {
          orcamentoAtual.modulos += qtd;
          contadorModulos++;
        }
      }
      else if (linha.includes('marca:') && dentroModulos && dentroOrcamento) {
        const marca = linha.split('\"')[1] || linha.split(':')[1].trim().replace(/\"/g, '');
        if (orcamentoAtual && contadorModulos > 0) {
          orcamentoAtual.marca_modulo = marca;
        }
      }
      else if (linha.includes('potencia_unitaria:') && dentroModulos && dentroOrcamento) {
        const potStr = linha.split('\"')[1] || linha.split(':')[1].trim();
        const pot = parseInt(potStr.replace('W', '').replace(',', '.'));
        if (orcamentoAtual && contadorModulos > 0) {
          orcamentoAtual.pot_modulo = pot;
        }
      }

      // Processar dados dos inversores
      else if (linha.includes('quantidade:') && dentroInversores && dentroOrcamento) {
        const qtd = parseInt(linha.split(':')[1].trim());
        if (orcamentoAtual) {
          orcamentoAtual.inversores += qtd;
          contadorInversores++;
        }
      }
      else if (linha.includes('marca:') && dentroInversores && dentroOrcamento) {
        const marca = linha.split('\"')[1] || linha.split(':')[1].trim().replace(/\"/g, '');
        if (orcamentoAtual && contadorInversores > 0) {
          orcamentoAtual.marca_inversor = marca;
        }
      }
      else if (linha.includes('potencia_unitaria:') && dentroInversores && dentroOrcamento) {
        const potStr = linha.split('\"')[1] || linha.split(':')[1].trim();
        const match = potStr.match(/(\d+\.?\d*)/);
        if (match && orcamentoAtual && contadorInversores > 0) {
          const pot = parseFloat(match[1]);
          orcamentoAtual.pot_inv = pot;
        }
      }

      // Resetar flags quando sair do orçamento
      else if (indentacao <= 2 && linha && !linha.includes(':')) {
        dentroOrcamento = false;
        dentroModulos = false;
        dentroInversores = false;
      }
    }

    // Adicionar último orçamento
    if (orcamentoAtual) {
      const pdespesaVariavelValor = orcamentoAtual.pcusto * (config.pdespesaVariavel / 100);
      orcamentoAtual.pdespesa_fixo = config.pdespesaFixo;
      orcamentoAtual.pdespesa_variavel_percent = config.pdespesaVariavel;
      orcamentoAtual.pdespesa_total = orcamentoAtual.pdespesa_fixo + pdespesaVariavelValor;
      orcamentos.push(orcamentoAtual);
    }

    console.log('🔍 Orçamentos extraídos (COMPLETOS):', orcamentos);
    return orcamentos;
  };

  // Extrair dados do cliente do YAML
  const extrairDadosClienteDoYAML = (yamlText: string) => {
    const dados: any = {};
    const linhas = yamlText.split('\n');
    let dentroCliente = false;
    
    for (let i = 0; i < linhas.length; i++) {
      const linha = linhas[i].trim();
      const indentacao = linhas[i].length - linhas[i].trimStart().length;
      
      // Detectar seção do cliente
      if (linha.includes('cliente:')) {
        dentroCliente = true;
        continue;
      }
      
      // Se saiu da seção cliente, parar
      if (dentroCliente && indentacao <= 2 && linha && !linha.includes(':')) {
        dentroCliente = false;
        break;
      }
      
      // Extrair dados dentro da seção cliente
      if (dentroCliente) {
        if (linha.includes('nome:')) {
          const match = linha.match(/nome:\s*["']?([^"']+)["']?/);
          if (match) dados.nome = match[1];
        } else if (linha.includes('cidade:')) {
          const match = linha.match(/cidade:\s*["']?([^"']+)["']?/);
          if (match) dados.cidade = match[1];
        } else if (linha.includes('consumo_mensal:')) {
          const valor = parseFloat(linha.split(':')[1].trim());
          if (!isNaN(valor)) dados.consumo_mensal = valor;
        } else if (linha.includes('tipo_imovel:')) {
          const match = linha.match(/tipo_imovel:\s*["']?([^"']+)["']?/);
          if (match) dados.tipo_imovel = match[1];
        } else if (linha.includes('hsp:')) {
          const valor = parseFloat(linha.split(':')[1].trim());
          if (!isNaN(valor)) dados.hsp = valor;
        } else if (linha.includes('tarifa:')) {
          const valor = parseFloat(linha.split(':')[1].trim());
          if (!isNaN(valor)) dados.tarifa = valor;
        }
      }
    }
    
    return dados;
  };

  // Mostrar status do YAML
  const mostrarYamlStatus = (message: string, type: string) => {
    setYamlStatus({ message, type, show: true });
    setTimeout(() => {
      setYamlStatus({ message: '', type: '', show: false });
    }, 5000);
  };

  // Limpar histórico
  const limparHistorico = () => {
    setOrcamentos([]);
    setYamlInput('');
    setConfig({
      nomeCliente: 'Cliente Padrão',
      cidadeCliente: 'Anápolis/GO',
      consumoMensal: 600,
      tipoImovel: 'Residencial',
      hsp: 5.21,
      tarifa: 1.10,
      performanceRate: 0.75,
      bonusMicroPercent: 5,
      pdespesaFixo: 3000,
      pdespesaVariavel: 22,
      fretePadrao: 0,
      metodo: 'variavel',
      descontoPix: 0,
      fatorParcelado: 1,
      fator12x: 1.15,
      fator18x: 1.25
    });
    mostrarYamlStatus('🗑️ Histórico limpo! Dados padrão restaurados.', 'info');
  };

  // Validar dados obrigatórios
  const validarDados = () => {
    const erros = [];
    
    if (!config.nomeCliente.trim()) erros.push('Nome do cliente');
    if (!config.cidadeCliente.trim()) erros.push('Cidade');
    if (config.consumoMensal <= 0) erros.push('Consumo mensal');
    if (config.hsp <= 0) erros.push('HSP');
    if (config.tarifa <= 0) erros.push('Tarifa');
    if (orcamentos.length === 0) erros.push('Pelo menos um orçamento');
    if (resultados.length === 0) erros.push('Resultados financeiros não calculados');
    if (config.pdespesaFixo <= 0 && config.pdespesaVariavel <= 0) erros.push('Pdespesa (fixo ou variável)');
    
    return erros;
  };

  // Gerar proposta HTML
  // ✅ Função para abrir modal de seleção de template
  const abrirModalTemplate = (salvarComo: boolean = false) => {
    const erros = validarDados();
    
    if (erros.length > 0) {
      alert(`❌ Dados obrigatórios não preenchidos:\n\n• ${erros.join('\n• ')}\n\nPor favor, preencha todos os campos necessários.`);
      return;
    }

    // Se já tem template selecionado no config, usar ele como padrão
    const templateAtual = mapearTipoImovelParaTemplate(config.tipoImovel);
    setTemplateSelecionado(templateAtual);
    setSalvarComoPendente(salvarComo);
    setShowTemplateModal(true);
  };

  // Função para mapear tipo de imóvel para template CSS
  const mapearTipoImovelParaTemplate = (tipoImovel: string): string => {
    const tipoLower = tipoImovel.toLowerCase();
    
    if (tipoLower.includes('residencial')) {
      return 'residencial';
    }
    if (tipoLower.includes('rural')) {
      return 'rural';
    }
    if (tipoLower.includes('panificadora')) {
      return 'comercial-panificadora';
    }
    if (tipoLower.includes('açougue') || tipoLower.includes('acougue')) {
      return 'comercial-acougue';
    }
    if (tipoLower.includes('restaurante')) {
      return 'comercial-restaurante';
    }
    if (tipoLower.includes('mercado')) {
      return 'comercial-mercado';
    }
    if (tipoLower.includes('industrial')) {
      return 'industrial';
    }
    
    return 'padrao';
  };

  // ✅ Função para salvar proposta (atualiza existente ou cria nova)
  const salvarProposta = async (salvarComo: boolean = false, templateEscolhido: string = 'padrao') => {
    setLoading(true);
    try {
      // ✅ Determinar slug: se "Salvar Como" ou não tem slug atual, criar novo
      const slugParaUsar = (salvarComo || !slugAtual) ? null : (slugAtual || null);
      
      console.log(salvarComo 
        ? '💾 Modo: Salvar Como (criar nova proposta)'
        : (slugAtual && typeof slugAtual === 'string' && slugAtual.trim() !== '') 
          ? '💾 Modo: Salvar (atualizar proposta existente)'
          : '💾 Modo: Criar nova proposta'
      );
      console.log('📌 Slug atual:', slugAtual || '(nenhum)');
      console.log('📌 Slug que será usado:', slugParaUsar || 'NOVO');
      // Debug: mostrar dados que serão enviados
      console.log('📤 Dados sendo enviados para a API:', {
        cliente: {
          nome: config.nomeCliente,
          cidade: config.cidadeCliente,
          consumo_mensal: config.consumoMensal,
          tipo_imovel: config.tipoImovel,
          hsp: config.hsp,
          tarifa: config.tarifa
        },
        orcamentos: resultados.map(resultado => ({
          nome: resultado.nome,
          ppix: resultado.ppix,
          pavista: resultado.pavista,
          priscado: resultado.priscado,
          p12x: resultado.p12x,
          p12x_total: resultado.p12x_total,
          p18x_parcela: resultado.p18x_parcela,
          p18x_total: resultado.p18x_total,
          geracaoMensal: resultado.geracaoMensal,
          paybackMeses: resultado.paybackMeses,
          tirAnual: resultado.tirAnual
        })),
        config: config
      });

      // API ORIGINAL - Sistema de arquivos
      const response = await fetch('/api/gerar-proposta', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // ✅ Enviar slug existente se for atualização (não "Salvar Como")
          slugExistente: slugParaUsar,
          cliente: {
            nome: config.nomeCliente,
            cidade: config.cidadeCliente,
            consumo_mensal: config.consumoMensal,
            tipo_imovel: config.tipoImovel,
            hsp: config.hsp,
            tarifa: config.tarifa,
            template: templateEscolhido // ✅ Enviar template escolhido
          },
          orcamentos: resultados.map(resultado => {
            // USAR DADOS DOS RESULTADOS FINANCEIROS (já calculados)
            return {
              nome: resultado.nome,
              distribuidora: resultado.distribuidora,
              pcusto: resultado.pcusto,
              modulos: resultado.modulos,
              pot_modulo: resultado.pot_modulo,
              marca_modulo: resultado.marca_modulo,
              inversores: resultado.inversores,
              pot_inv: resultado.pot_inv,
              marca_inversor: resultado.marca_inversor,
              pdespesa_total: resultado.pdespesa, // VALOR DA CALCULADORA
              total_final: resultado.total_final, // VALOR TOTAL CONSISTENTE
              // Incluir dados da calculadora para garantia
              pdespesa_fixo: resultado.pdespesa_fixo,
              pdespesa_variavel_percent: config.pdespesaVariavel,
              // Incluir todos os dados financeiros calculados
              ppix: resultado.ppix,
              pavista: resultado.pavista,
              priscado: resultado.priscado,
              p12x: resultado.p12x,
              p12x_total: resultado.p12x_total,
              p18x_parcela: resultado.p18x_parcela,
              p18x_total: resultado.p18x_total,
              // Incluir dados de performance
              potTotal: resultado.potTotal,
              geracaoMensal: resultado.geracaoMensal,
              cobertura: resultado.cobertura,
              economiaMensal: resultado.economiaMensal,
              paybackMeses: resultado.paybackMeses,
              tirAnual: resultado.tirAnual,
              bonusMicroAtivo: resultado.bonusMicroAtivo,
              bonusMicroManual: resultado.bonusMicroManual,
            };
          }),
          config: config
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        // Verificar se foi salva no Supabase (só log — alert bloqueava a nova aba)
        if (!data.supabase?.salva) {
          console.warn(
            '⚠️ Proposta gerada mas NÃO salva no banco:',
            data.supabase?.message || 'Erro desconhecido'
          );
        }

        // ✅ ATUALIZAR SLUG ATUAL se foi criada nova proposta
        if (data.slug) {
          setSlugAtual(data.slug);
        }

        // ✅ ABRIR PROPOSTA DIRETAMENTE NA URL CORRETA (sem about:blank)
        const propostaUrl = data.slug ? `/proposta/${data.slug}?from=admin` : null;

        if (propostaUrl) {
          // Abrir proposta em nova aba IMEDIATAMENTE com URL correta
          window.open(propostaUrl, '_blank');

          // Mostrar mensagem de sucesso SEM BLOQUEAR
          const modoTexto = salvarComo 
            ? '✅ NOVA proposta criada e salva no banco de dados!'
            : slugAtual 
              ? '✅ Proposta ATUALIZADA no banco de dados!'
              : '✅ Proposta gerada e salva no banco de dados!';
          
          const mensagemSucesso = data.supabase?.salva
            ? `${modoTexto}\n\n📁 Arquivo: ${data.arquivo}\n🔗 Link público: ${data.supabase.url || propostaUrl}\n💾 ID no banco: ${data.supabase.propostaId || 'N/A'}\n${salvarComo ? '✨ Nova proposta criada com novo link!' : slugAtual ? '✨ Proposta atualizada - link permanece o mesmo!' : '✨ A proposta foi aberta em nova aba!'}`
            : `✅ Proposta gerada!\n\n📁 Arquivo: ${data.arquivo}\n🔗 Link: ${propostaUrl}\n⚠️ Não foi salva no banco de dados\n\n✨ A proposta foi aberta em nova aba!`;

          console.log(mensagemSucesso);
          // Sem alert de sucesso — bloqueava a aba da proposta aberta acima
        } else {
          alert('❌ Erro: Slug da proposta não foi gerado');
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Erro ao gerar proposta');
      }
    } catch (error) {
      alert(`❌ Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    calcularResultados();
  }, [config, orcamentos]);

  return (
    <>
      <Head>
        <title>Proposta manual - PIENG Solar</title>
        <meta name="description" content="Gerador rápido de propostas solares" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </Head>

      <div className="admin-shell">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-7xl mx-auto">
            
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-3xl font-bold admin-title mb-2">
                  📝 Proposta manual
                </h1>
                <p className="admin-subtitle">
                  Geração rápida de propostas solares
                </p>
              </div>
              
              <div className="flex gap-3">
                <Link href="/admin" className="admin-btn-ghost">
                  🏠 Admin
                </Link>
                <button 
                  onClick={() => router.back()}
                  className="admin-btn-ghost"
                  title="Voltar"
                >
                  ← Voltar
                </button>
              </div>
            </div>

            {/* Controles de YAML e Histórico */}
            <div className="admin-surface p-6 mb-8">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-gray-800">📄 Entrada YAML & Histórico</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowYamlInput(!showYamlInput)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {showYamlInput ? '📊 Ver Resultados' : '📝 Entrada YAML'}
                  </button>
                  <button
                    onClick={limparHistorico}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    🗑️ Limpar Histórico
                  </button>
                </div>
              </div>

              {showYamlInput ? (
                <div>
                  <div className="flex gap-4 mb-4">
                    <button
                      onClick={carregarExemploYAML}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      📋 Carregar Exemplo
                    </button>
                    <button
                      onClick={processarYAML}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      ⚡ Processar YAML
                    </button>
                    <button
                      onClick={() => setYamlInput('')}
                      className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
                    >
                      🗑️ Limpar
                    </button>
                  </div>
                  
                  <textarea
                    value={yamlInput}
                    onChange={(e) => setYamlInput(e.target.value)}
                    placeholder="Cole aqui o YAML com os dados dos orçamentos..."
                    rows={15}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                  />
                  
                  {yamlStatus.show && (
                    <div className={`mt-4 p-3 rounded-lg ${
                      yamlStatus.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' :
                      yamlStatus.type === 'error' ? 'bg-red-100 text-red-800 border border-red-200' :
                      'bg-blue-100 text-blue-800 border border-blue-200'
                    }`}>
                      {yamlStatus.message}
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-600 mb-2">
                    <strong>Orçamentos Ativos:</strong> {orcamentos.length}/5
                  </p>
                  {orcamentos.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-4">📋</div>
                      <p className="text-gray-500 mb-2">Nenhum orçamento carregado</p>
                      <p className="text-sm text-gray-400">
                        Use a entrada YAML para carregar orçamentos reais ou clique em "Carregar Exemplo" para testar.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-wrap gap-2">
                        {orcamentos.map((orc, index) => (
                          <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                            {orc.nome}
                          </span>
                        ))}
                      </div>
                      <p className="text-sm text-gray-500 mt-2">
                        Use a entrada YAML para adicionar novos orçamentos ou substituir os existentes.
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Configurações Rápidas */}
            <div className="admin-surface p-6 mb-8">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">⚙️ Configurações Rápidas</h3>
              <p className="text-xs text-gray-500 mb-4">
                HSP, tarifa, pdespesa e dados do cliente sincronizam com a{' '}
                <Link href="/admin/v3/proposta-auto" className="text-blue-600 underline">
                  4a · Proposta automática
                </Link>
                .
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Cliente</label>
                  <input
                    type="text"
                    value={config.nomeCliente}
                    onChange={(e) => setConfig({...config, nomeCliente: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
                  <input
                    type="text"
                    value={config.cidadeCliente}
                    onChange={(e) => setConfig({...config, cidadeCliente: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Consumo Mensal (kWh)</label>
                  <input
                    type="number"
                    value={config.consumoMensal}
                    onChange={(e) => setConfig({...config, consumoMensal: Number(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">🎨 Template da Proposta</label>
                  <select
                    value={config.tipoImovel}
                    onChange={(e) => setConfig({...config, tipoImovel: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="Residencial">🏠 Residencial</option>
                    <option value="Rural">🌾 Rural</option>
                    <option value="Comercial - Panificadora">🥖 Comercial - Panificadora</option>
                    <option value="Comercial - Açougue">🥩 Comercial - Açougue</option>
                    <option value="Comercial - Restaurante">🍽️ Comercial - Restaurante</option>
                    <option value="Comercial - Mercado">🛒 Comercial - Mercado</option>
                    <option value="Industrial">🏭 Industrial</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Escolha o template visual da proposta</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">HSP</label>
                  <input
                    type="number"
                    step="0.01"
                    value={config.hsp}
                    onChange={(e) => setConfig({...config, hsp: Number(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tarifa (R$/kWh)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={config.tarifa}
                    onChange={(e) => setConfig({...config, tarifa: Number(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Seção de Pdespesa + Frete (3 fatores V3) */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-gray-800 mb-3">💰 Configuração de Pdespesa</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Três variáveis comerciais: frete entra no P.Custo; fixo + % formam a Pdespesa — aplicados a todos os orçamentos
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Valor Fixo (R$)</label>
                    <input
                      type="number"
                      step="1"
                      value={config.pdespesaFixo}
                      onChange={(e) => setConfig({ ...config, pdespesaFixo: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Ex: 3000"
                    />
                    <p className="text-xs text-gray-500 mt-1">Componente fixo da Pdespesa</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Percentual Variável (%)</label>
                    <input
                      type="number"
                      step="1"
                      value={config.pdespesaVariavel}
                      onChange={(e) => setConfig({ ...config, pdespesaVariavel: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Ex: 30"
                    />
                    <p className="text-xs text-gray-500 mt-1">% sobre o P.Custo (kit + frete)</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Frete (R$)</label>
                    <input
                      type="number"
                      step="50"
                      min={0}
                      value={config.fretePadrao}
                      onChange={(e) => {
                        const fretePadrao = Math.max(0, Number(e.target.value) || 0);
                        setConfig({ ...config, fretePadrao });
                        setOrcamentos((prev) =>
                          prev.map((o) => {
                            if (o.custo_kit == null) return { ...o, frete: fretePadrao };
                            const pcusto = Math.round((o.custo_kit + fretePadrao) * 100) / 100;
                            return { ...o, frete: fretePadrao, pcusto };
                          })
                        );
                      }}
                      className="w-full px-3 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      placeholder="Ex: 400"
                    />
                    <p className="text-xs text-gray-500 mt-1">Soma ao kit → P.Custo</p>
                  </div>
                </div>

                <div className="mt-3 p-3 bg-blue-50 rounded-lg text-sm">
                  <strong>📊 Fórmula V3:</strong> P.Custo = Kit + Frete · Pdespesa = Fixo + (Var% × P.Custo) · PIX = P.Custo + Pdespesa
                  <br />
                  <strong>📋 Exemplo:</strong> Kit R$ 6.000 + Frete R$ {Number(config.fretePadrao || 0).toFixed(0)} = P.Custo R${' '}
                  {(6000 + Number(config.fretePadrao || 0)).toFixed(2)} · Pdespesa R${' '}
                  {(
                    config.pdespesaFixo +
                    ((6000 + Number(config.fretePadrao || 0)) * config.pdespesaVariavel) / 100
                  ).toFixed(2)}{' '}
                  · PIX R${' '}
                  {(
                    6000 +
                    Number(config.fretePadrao || 0) +
                    config.pdespesaFixo +
                    ((6000 + Number(config.fretePadrao || 0)) * config.pdespesaVariavel) / 100
                  ).toFixed(2)}
                </div>
              </div>
            </div>

            {/* Tabela de Orçamentos Estilo Excel - Editável */}
            {orcamentos.length > 0 && (
              <div className="admin-surface p-6 mb-8">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold text-gray-800">
                    🗂️ Tabela de Orçamentos ({orcamentos.length}) - Editável
                  </h3>
                  <div className="flex gap-3">
                    <button
                      onClick={async () => {
                        try {
                          // Gerar slug baseado no nome do cliente
                          const slug = `${config.nomeCliente
                            .toLowerCase()
                            .normalize('NFD')
                            .replace(/[\u0300-\u036f]/g, '')
                            .replace(/[^a-z0-9]+/g, '-')}-${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}`;
                          
                          // Salvar orçamentos no localStorage para o consultor acessar
                          const dadosConsultor = {
                            cliente: {
                              nome: config.nomeCliente,
                              cidade: config.cidadeCliente,
                              consumoMensal: config.consumoMensal,
                              tipo: config.tipoImovel,
                              hsp: config.hsp,
                              tarifa: config.tarifa
                            },
                            orcamentos: orcamentos.map((orc, idx) => ({
                              id: `${slug}-${idx + 1}`,
                              nome: orc.nome || `Opção ${idx + 1}`,
                              fornecedor: orc.distribuidora || 'N/A',
                              pcusto: orc.pcusto,
                              modulos: orc.modulos,
                              pot_modulo: orc.pot_modulo,
                              marca_modulo: orc.marca_modulo,
                              inversores: orc.inversores,
                              pot_inv: orc.pot_inv,
                              marca_inversor: orc.marca_inversor,
                              bonusMicroAtivo: getBonusMicroAtivo(orc),
                              bonusMicroManual: orc.bonusMicroManual,
                              status: 'pendente' as const
                            })),
                            config: {
                              hsp: config.hsp,
                              tarifa: config.tarifa,
                              performanceRate: config.performanceRate,
                              bonusMicroPercent: config.bonusMicroPercent,
                              consumoMensal: config.consumoMensal,
                              pdespesaFixo: config.pdespesaFixo,
                              pdespesaVariavel: config.pdespesaVariavel,
                              descontoPix: config.descontoPix,
                              fatorParcelado: config.fatorParcelado,
                              fator12x: config.fator12x,
                              fator18x: config.fator18x
                            },
                            timestamp: new Date().toISOString()
                          };
                          
                          // Salvar no localStorage
                          localStorage.setItem(`consultor-${slug}`, JSON.stringify(dadosConsultor));
                          
                          // Abrir o Sistema do Consultor
                          window.open(`/admin/orcamentos/${slug}/consultor`, '_blank');
                          console.log('✅ Orçamentos enviados ao consultor:', slug);
                        } catch (error) {
                          console.error('Erro ao enviar para consultor:', error);
                          alert('❌ Erro ao enviar orçamentos. Tente novamente.');
                        }
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={orcamentos.length === 0}
                      title={orcamentos.length === 0 ? 'Adicione pelo menos um orçamento' : 'Enviar orçamentos para análise no Sistema do Consultor'}
                    >
                      📊 Enviar para Consultor
                    </button>
                    <button
                      onClick={() => {
                        // Adicionar novo orçamento vazio
                        const novoOrc: Orcamento = syncBonusMicroAuto({
                          nome: `Orçamento ${orcamentos.length + 1}`,
                          distribuidora: 'NOVA',
                          pcusto: 0,
                          modulos: 8,
                          pot_modulo: 580,
                          marca_modulo: '',
                          inversores: 1,
                          pot_inv: 5,
                          marca_inversor: '',
                          pdespesa_fixo: config.pdespesaFixo,
                          pdespesa_variavel_percent: config.pdespesaVariavel,
                          pdespesa_total: config.pdespesaFixo
                        });
                        setOrcamentos([...orcamentos, novoOrc]);
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      ➕ Novo Orçamento
                    </button>
                  </div>
                </div>

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
                        <th className="border border-gray-300 px-2 py-2 text-xs font-bold text-gray-700">Despesas (R$)</th>
                        <th className="border border-gray-300 px-2 py-2 text-xs font-bold text-gray-700">Total (R$)</th>
                        <th className="border border-gray-300 px-2 py-2 text-xs font-bold text-gray-700">Potência (kWp)</th>
                        <th className="border border-gray-300 px-2 py-2 text-xs font-bold text-gray-700">R$/Wp</th>
                        <th className="border border-gray-300 px-2 py-2 text-xs font-bold text-gray-700">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orcamentos.map((orc, index) => {
                        const potenciaTotal = (orc.modulos * orc.pot_modulo) / 1000;
                        const pcustoEfetivo =
                          orc.custo_kit != null
                            ? Math.round((orc.custo_kit + Math.max(0, config.fretePadrao || 0)) * 100) / 100
                            : orc.pcusto;
                        const pdespesaTotalCalculado =
                          config.pdespesaFixo + (pcustoEfetivo * config.pdespesaVariavel) / 100;
                        const totalFinal = pcustoEfetivo + pdespesaTotalCalculado;
                        const precoPorWp = pcustoEfetivo / (orc.modulos * orc.pot_modulo || 1);

                        return (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="border border-gray-300 px-2 py-1 text-center text-sm font-bold">
                              {index + 1}
                            </td>

                            <td className="border border-gray-300 px-1 py-1 text-center">
                              <MicroInversorToggle
                                ativo={getBonusMicroAtivo(orc)}
                                bonusPercent={config.bonusMicroPercent}
                                onToggle={() => toggleBonusMicro(index)}
                                compact
                              />
                            </td>

                            {/* Nome/Origem */}
                            <td className="border border-gray-300 px-1 py-1">
                              <input
                                type="text"
                                value={orc.nome}
                                onChange={(e) => {
                                  const novosOrc = [...orcamentos];
                                  novosOrc[index].nome = e.target.value;
                                  setOrcamentos(novosOrc);
                                }}
                                className="w-full px-1 py-1 text-xs border-0 focus:ring-1 focus:ring-blue-500 bg-transparent"
                                placeholder="Nome do orçamento"
                              />
                            </td>

                            {/* Distribuidora */}
                            <td className="border border-gray-300 px-1 py-1">
                              <select
                                value={orc.distribuidora}
                                onChange={(e) => {
                                  const novosOrc = [...orcamentos];
                                  novosOrc[index].distribuidora = e.target.value;
                                  setOrcamentos(novosOrc);
                                }}
                                className="w-full px-1 py-1 text-xs border-0 focus:ring-1 focus:ring-blue-500 bg-transparent"
                              >
                                <option value="SOOLLAR">SOOLLAR</option>
                                <option value="BELENERGY">BELENERGY</option>
                                <option value="NOVA">NOVA</option>
                              </select>
                            </td>

                            {/* Preço Custo (= kit + frete quando V3) */}
                            <td className="border border-gray-300 px-1 py-1">
                              <input
                                type="number"
                                step="0.01"
                                value={pcustoEfetivo}
                                onChange={(e) => {
                                  const novosOrc = [...orcamentos];
                                  const novo = Math.round(Number(e.target.value) * 100) / 100;
                                  novosOrc[index].pcusto = novo;
                                  // Edição manual do P.Custo: trata como kit+frete já embutido
                                  novosOrc[index].custo_kit = undefined;
                                  novosOrc[index].frete = config.fretePadrao || 0;
                                  const pdVar = novo * (config.pdespesaVariavel / 100);
                                  novosOrc[index].pdespesa_fixo = config.pdespesaFixo;
                                  novosOrc[index].pdespesa_variavel_percent = config.pdespesaVariavel;
                                  novosOrc[index].pdespesa_total = config.pdespesaFixo + pdVar;
                                  setOrcamentos(novosOrc);
                                }}
                                className="w-20 px-1 py-1 text-xs border-0 focus:ring-1 focus:ring-blue-500 bg-transparent text-right"
                                title={
                                  orc.custo_kit != null
                                    ? `Kit ${orc.custo_kit} + frete ${config.fretePadrao || 0}`
                                    : 'P.Custo'
                                }
                              />
                            </td>

                            {/* Qtd Módulos */}
                            <td className="border border-gray-300 px-1 py-1">
                              <input
                                type="number"
                                value={orc.modulos}
                                onChange={(e) => {
                                  updateOrcInversor(index, { modulos: Number(e.target.value) });
                                }}
                                className="w-12 px-1 py-1 text-xs border-0 focus:ring-1 focus:ring-blue-500 bg-transparent text-center"
                              />
                            </td>

                            {/* Potência por Módulo */}
                            <td className="border border-gray-300 px-1 py-1">
                              <input
                                type="number"
                                step="0.01"
                                value={orc.pot_modulo}
                                onChange={(e) => {
                                  const novosOrc = [...orcamentos];
                                  novosOrc[index].pot_modulo = Math.round(Number(e.target.value) * 100) / 100; // Arredondar para 2 casas decimais
                                  setOrcamentos(novosOrc);
                                }}
                                className="w-16 px-1 py-1 text-xs border-0 focus:ring-1 focus:ring-blue-500 bg-transparent text-center"
                              />
                            </td>

                            {/* Marca Módulo */}
                            <td className="border border-gray-300 px-1 py-1">
                              <input
                                type="text"
                                value={orc.marca_modulo}
                                onChange={(e) => {
                                  const novosOrc = [...orcamentos];
                                  novosOrc[index].marca_modulo = e.target.value;
                                  setOrcamentos(novosOrc);
                                }}
                                className="w-20 px-1 py-1 text-xs border-0 focus:ring-1 focus:ring-blue-500 bg-transparent"
                              />
                            </td>

                            {/* Qtd Inversores */}
                            <td className="border border-gray-300 px-1 py-1">
                              <input
                                type="number"
                                value={orc.inversores}
                                onChange={(e) => {
                                  updateOrcInversor(index, { inversores: Number(e.target.value) });
                                }}
                                className="w-12 px-1 py-1 text-xs border-0 focus:ring-1 focus:ring-blue-500 bg-transparent text-center"
                              />
                            </td>

                            {/* Potência por Inversor */}
                            <td className="border border-gray-300 px-1 py-1">
                              <input
                                type="number"
                                step="0.01"
                                value={orc.pot_inv}
                                onChange={(e) => {
                                  updateOrcInversor(index, {
                                    pot_inv: Math.round(Number(e.target.value) * 100) / 100,
                                  });
                                }}
                                className="w-16 px-1 py-1 text-xs border-0 focus:ring-1 focus:ring-blue-500 bg-transparent text-center"
                              />
                            </td>

                            {/* Marca Inversor */}
                            <td className="border border-gray-300 px-1 py-1">
                              <input
                                type="text"
                                value={orc.marca_inversor}
                                onChange={(e) => {
                                  updateOrcInversor(index, { marca_inversor: e.target.value });
                                }}
                                className="w-20 px-1 py-1 text-xs border-0 focus:ring-1 focus:ring-blue-500 bg-transparent"
                              />
                            </td>

                            {/* Despesas (R$) - anteriormente Pdespesa Total */}
                            <td className="border border-gray-300 px-2 py-1 text-xs text-right font-semibold bg-yellow-50">
                              <div className="flex flex-col">
                                <span className="font-bold text-orange-600">
                                  R$ {pdespesaTotalCalculado.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                                </span>
                                <span className="text-xs text-gray-500">
                                  ({config.pdespesaFixo.toLocaleString('pt-BR')} + {config.pdespesaVariavel}%
                                  {config.fretePadrao > 0
                                    ? ` · frete ${config.fretePadrao.toLocaleString('pt-BR')}`
                                    : ''}
                                  )
                                </span>
                              </div>
                            </td>

                            {/* Total (R$) - NOVA COLUNA: P.Custo + Despesas (CONSISTENTE) */}
                            <td className="border border-gray-300 px-2 py-1 text-xs text-right font-semibold bg-green-50">
                              <div className="flex flex-col">
                                <span className="font-bold text-green-700">
                                  R$ {totalFinal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                                </span>
                                <span className="text-xs text-gray-500">
                                  Custo + Despesas
                                </span>
                              </div>
                            </td>

                            {/* Potência Total (calculada) */}
                            <td className="border border-gray-300 px-2 py-1 text-xs text-center font-semibold bg-green-50">
                              {potenciaTotal.toFixed(2)} kWp
                            </td>

                            {/* R$/Wp (calculado) */}
                            <td className="border border-gray-300 px-2 py-1 text-xs text-center font-semibold bg-blue-50">
                              R$ {precoPorWp.toFixed(2)}
                            </td>

                            {/* Ações */}
                            <td className="border border-gray-300 px-2 py-1 text-center">
                              <button
                                onClick={() => {
                                  const novosOrc = orcamentos.filter((_, i) => i !== index);
                                  setOrcamentos(novosOrc);
                                }}
                                className="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
                              >
                                🗑️
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                  📝 <strong>Tabela com Cálculos Automáticos:</strong>
                  <br />• Modifique qualquer campo diretamente na tabela
                  <br />• <strong>Despesas (R$)</strong> = Pdespesa calculada automaticamente: <span className="font-mono bg-white px-1 rounded">Fixo + (Variável% × P.Custo)</span>
                  <br />• <strong>Total (R$)</strong> = P.Custo + Despesas (valor base para cálculos financeiros)
                  <br />• Ajuste os valores nas <strong>configurações de Pdespesa</strong> e veja a atualização instantânea
                  <br />• Colunas em cores são <strong>calculadas automaticamente</strong>
                  <br />• <strong>⚡ Micro</strong> — verde = bônus +{config.bonusMicroPercent}% de geração (micro-inversor); cinza = eficiência string
                </div>
              </div>
            )}

            {/* Resultados Calculados */}
            <div className="admin-surface p-6 mb-8">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-800">📊 Resultados Financeiros</h3>
                  {resultados.length > 0 && (
                    <p className="text-sm text-gray-600 mt-1">
                      {resultados.length} orçamento{resultados.length !== 1 ? 's' : ''} calculado{resultados.length !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
                <div className="flex gap-3">
                  {/* ✅ Botão Salvar (atualiza proposta existente) */}
                  {slugAtual && (
                    <button
                      onClick={() => abrirModalTemplate(false)}
                      disabled={loading || orcamentos.length === 0 || resultados.length === 0}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Atualizar proposta existente (mesmo link)"
                    >
                      {loading ? '⏳ Salvando...' : '💾 Salvar'}
                    </button>
                  )}
                  
                  {/* ✅ Botão Salvar Como (cria nova proposta) */}
                  <button
                    onClick={() => abrirModalTemplate(true)}
                    disabled={loading || orcamentos.length === 0 || resultados.length === 0}
                    className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    title={slugAtual ? "Criar nova proposta com novo link" : "Gerar nova proposta"}
                  >
                    {loading ? '⏳ Gerando...' : slugAtual ? '📄 Salvar Como' : '🚀 Gerar Proposta HTML'}
                  </button>

                  {slugAtual && (
                    <button
                      type="button"
                      onClick={() => window.open(buildPropostaPdfUrl(slugAtual, true), '_blank')}
                      className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700"
                      title="Abrir proposta formatada para salvar como PDF"
                    >
                      📄 Gerar PDF
                    </button>
                  )}
                </div>
              </div>

              {orcamentos.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📊</div>
                  <h4 className="text-lg font-semibold text-gray-600 mb-2">Nenhum resultado disponível</h4>
                  <p className="text-gray-500 mb-4">
                    Carregue orçamentos via YAML para ver os cálculos e gerar propostas.
                  </p>
                  <button
                    onClick={() => setShowYamlInput(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    📝 Carregar Orçamentos
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sistema</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Distribuidora</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Potência</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PIX</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">12x no cartão</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total 12x</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">18x Cartão</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total 18x</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Geração/Mês</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payback</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">TIR</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {resultados
                        .filter(resultado => resultado && resultado.nome && !isNaN(resultado.ppix))
                        .map((resultado, index) => (
                        <tr key={`${resultado.nome}-${index}`} className={index === 0 ? 'bg-green-50 font-semibold' : 'hover:bg-gray-50'}>
                          <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                            {index === 0 && <span className="text-yellow-500 mr-1">🏆</span>}
                            {resultado.nome}
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                            <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                              {resultado.distribuidora}
                            </span>
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                            <strong>{resultado.potTotal.toFixed(2)} kWp</strong>
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap text-sm font-bold text-green-600">
                            R$ {resultado.ppix.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div className="flex flex-col">
                              <span className="font-semibold">R$ {resultado.p12x.toFixed(2)}</span>
                              <span className="text-xs text-gray-500">por mês</span>
                            </div>
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap text-sm text-purple-600 font-semibold">
                            R$ {resultado.p12x_total.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div className="flex flex-col">
                              <span className="font-semibold">R$ {resultado.p18x_parcela.toFixed(2)}</span>
                              <span className="text-xs text-gray-500">por mês</span>
                            </div>
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap text-sm text-purple-600 font-semibold">
                            R$ {resultado.p18x_total.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                            {resultado.geracaoMensal.toFixed(0)} kWh
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                            {resultado.paybackMeses.toFixed(1)} meses
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                            {resultado.tirAnual.toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Nota explicativa dos Resultados Financeiros */}
                  {resultados.length > 0 && (
                    <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-purple-50 border border-green-200 rounded-lg">
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">💰 Entenda os Valores Financeiros</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-600">
                        <div>
                          <p><strong>PIX:</strong> Valor base (Total da tabela acima)</p>
                          <p><strong>12x no cartão:</strong> Parcela mensal no cartão</p>
                          <p><strong>Total 12x:</strong> Valor total parcelado em 12x</p>
                        </div>
                        <div>
                          <p><strong>18x Cartão:</strong> Parcela mensal com juros</p>
                          <p><strong>Total 18x:</strong> Valor total parcelado em 18x</p>
                          <p><strong>⚡ Todos os valores refletem a calculadora de Pdespesa</strong></p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="text-center text-gray-500 text-sm">
              <p>PIENG Solar - Proposta manual | Next.js + Vercel</p>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Seleção de Template - responsivo para celular */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
          <div className="bg-slate-100 rounded-t-2xl border border-slate-200/80 sm:rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col flex-shrink-0 my-auto sm:my-0">
            <div className="p-4 sm:p-6 border-b border-gray-200 flex-shrink-0">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-800">
                🎨 Escolher Template CSS
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Selecione um template para a proposta. O template será salvo junto com os dados.
                <span className="block mt-1 text-gray-500">Toque duas vezes no template para confirmar e salvar direto.</span>
              </p>
            </div>
            
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 min-h-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {/* Template Padrão */}
                <button
                  type="button"
                  onClick={() => handleTemplateClick('padrao')}
                  className={`p-4 border-2 rounded-lg transition-all text-left ${
                    templateSelecionado === 'padrao' 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50'
                  }`}
                >
                  <div className="text-2xl mb-2">📄</div>
                  <h4 className="font-semibold text-gray-800 mb-1">Template Padrão</h4>
                  <p className="text-sm text-gray-600">Visualização padrão universal</p>
                </button>

                {/* Residencial */}
                <button
                  type="button"
                  onClick={() => handleTemplateClick('residencial')}
                  className={`p-4 border-2 rounded-lg transition-all text-left ${
                    templateSelecionado === 'residencial' 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50'
                  }`}
                >
                  <div className="text-2xl mb-2">🏠</div>
                  <h4 className="font-semibold text-gray-800 mb-1">Residencial Premium</h4>
                  <p className="text-sm text-gray-600">Foco em economia doméstica</p>
                </button>

                {/* Rural */}
                <button
                  type="button"
                  onClick={() => handleTemplateClick('rural')}
                  className={`p-4 border-2 rounded-lg transition-all text-left ${
                    templateSelecionado === 'rural' 
                      ? 'border-green-500 bg-green-50' 
                      : 'border-gray-300 hover:border-green-500 hover:bg-green-50'
                  }`}
                >
                  <div className="text-2xl mb-2">🌾</div>
                  <h4 className="font-semibold text-gray-800 mb-1">Rural Agro</h4>
                  <p className="text-sm text-gray-600">Análise de irrigação e safra</p>
                </button>

                {/* Panificadora */}
                <button
                  type="button"
                  onClick={() => handleTemplateClick('comercial-panificadora')}
                  className={`p-4 border-2 rounded-lg transition-all text-left ${
                    templateSelecionado === 'comercial-panificadora' 
                      ? 'border-orange-500 bg-orange-50' 
                      : 'border-gray-300 hover:border-orange-500 hover:bg-orange-50'
                  }`}
                >
                  <div className="text-2xl mb-2">🥖</div>
                  <h4 className="font-semibold text-gray-800 mb-1">Panificadora</h4>
                  <p className="text-sm text-gray-600">Foco em margem por produto</p>
                </button>

                {/* Açougue */}
                <button
                  type="button"
                  onClick={() => handleTemplateClick('comercial-acougue')}
                  className={`p-4 border-2 rounded-lg transition-all text-left ${
                    templateSelecionado === 'comercial-acougue' 
                      ? 'border-red-500 bg-red-50' 
                      : 'border-gray-300 hover:border-red-500 hover:bg-red-50'
                  }`}
                >
                  <div className="text-2xl mb-2">🥩</div>
                  <h4 className="font-semibold text-gray-800 mb-1">Açougue</h4>
                  <p className="text-sm text-gray-600">Economia em refrigeração</p>
                </button>

                {/* Restaurante */}
                <button
                  type="button"
                  onClick={() => handleTemplateClick('comercial-restaurante')}
                  className={`p-4 border-2 rounded-lg transition-all text-left ${
                    templateSelecionado === 'comercial-restaurante' 
                      ? 'border-teal-500 bg-teal-50' 
                      : 'border-gray-300 hover:border-teal-500 hover:bg-teal-50'
                  }`}
                >
                  <div className="text-2xl mb-2">🍽️</div>
                  <h4 className="font-semibold text-gray-800 mb-1">Restaurante</h4>
                  <p className="text-sm text-gray-600">AC e cozinha profissional</p>
                </button>

                {/* Mercado */}
                <button
                  type="button"
                  onClick={() => handleTemplateClick('comercial-mercado')}
                  className={`p-4 border-2 rounded-lg transition-all text-left ${
                    templateSelecionado === 'comercial-mercado' 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50'
                  }`}
                >
                  <div className="text-2xl mb-2">🛒</div>
                  <h4 className="font-semibold text-gray-800 mb-1">Mercado</h4>
                  <p className="text-sm text-gray-600">Economia completa (iluminação + refrigeração + AC)</p>
                </button>

                {/* Industrial */}
                <button
                  type="button"
                  onClick={() => handleTemplateClick('industrial')}
                  className={`p-4 border-2 rounded-lg transition-all text-left ${
                    templateSelecionado === 'industrial' 
                      ? 'border-gray-600 bg-gray-50' 
                      : 'border-gray-300 hover:border-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <div className="text-2xl mb-2">🏭</div>
                  <h4 className="font-semibold text-gray-800 mb-1">Industrial Premium</h4>
                  <p className="text-sm text-gray-600">Demanda contratada e créditos</p>
                </button>
              </div>
            </div>
            
            <div className="p-4 sm:p-6 border-t border-gray-200 flex flex-col-reverse sm:flex-row justify-end gap-3 flex-shrink-0">
              <button
                type="button"
                onClick={() => setShowTemplateModal(false)}
                className="w-full sm:w-auto px-4 py-3 sm:py-2 border border-gray-300 text-gray-700 rounded-xl sm:rounded-lg hover:bg-gray-50 active:bg-gray-100 min-h-[44px] touch-manipulation"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  setShowTemplateModal(false);
                  await salvarProposta(salvarComoPendente, templateSelecionado);
                }}
                className="w-full sm:w-auto px-4 py-3 sm:py-2 bg-green-600 text-white rounded-xl sm:rounded-lg hover:bg-green-700 active:bg-green-800 min-h-[44px] touch-manipulation"
              >
                ✅ Confirmar e Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
