import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';

interface Orcamento {
  nome: string;
  distribuidora: string;
  pcusto: number;
  modulos: number;
  pot_modulo: number;
  marca_modulo: string;
  inversores: number;
  pot_inv: number;
  marca_inversor: string;
  pdespesa_fixo: number;
  pdespesa_variavel_percent: number;
  pdespesa_total: number;
}

export default function GeradorRapido() {
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);

  const [config, setConfig] = useState({
    nomeCliente: 'Cliente Padrão',
    cidadeCliente: 'Anápolis/GO',
    consumoMensal: 600,
    tipoImovel: 'Residencial',
    hsp: 5.21,
    tarifa: 1.10,
    performanceRate: 0.75,
    pdespesaFixo: 3000,
    pdespesaVariavel: 22,
    metodo: 'variavel'
  });

  const [resultados, setResultados] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [yamlInput, setYamlInput] = useState('');
  const [yamlStatus, setYamlStatus] = useState({ message: '', type: '', show: false });
  const [showYamlInput, setShowYamlInput] = useState(false);
  const [configSistema, setConfigSistema] = useState<any>(null);

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

      // Preencher TODOS os dados do cliente da proposta (não hardcoded)
      const cliente = propostaData.cliente || {};
      setConfig(prev => ({
        ...prev,
        nomeCliente: cliente.nome || prev.nomeCliente,
        cidadeCliente: cliente.cidade || prev.cidadeCliente,
        consumoMensal: cliente.consumoMensal || cliente.consumo || parseFloat(cliente.consumoKwh) || prev.consumoMensal,
        tipoImovel: cliente.tipoImovel || cliente.tipo || prev.tipoImovel,
        // Carregar HSP e tarifa do cliente se disponíveis
        hsp: cliente.hsp || parseFloat(cliente.hspLocal?.toString().replace(',', '.')) || prev.hsp,
        tarifa: cliente.tarifa || parseFloat(cliente.tarifaEnergia?.toString().replace(',', '.')) || prev.tarifa
      }));

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
          // Remover tudo exceto dígitos, vírgulas e pontos
          let str = val.toString().replace(/[^\d,.-]/g, '');
          // Se tem vírgula e ponto, assumir que vírgula é decimal (formato BR: 13.500,00)
          if (str.includes(',') && str.includes('.')) {
            // Remover pontos (separadores de milhar) e substituir vírgula por ponto
            str = str.replace(/\./g, '').replace(',', '.');
          } else if (str.includes(',')) {
            // Apenas vírgula, pode ser decimal ou separador de milhar
            // Se tem mais de 2 dígitos após vírgula, é separador de milhar
            const parts = str.split(',');
            if (parts[1] && parts[1].length <= 2) {
              // Decimal
              str = str.replace(',', '.');
            } else {
              // Separador de milhar
              str = str.replace(',', '');
            }
          }
          return parseFloat(str) || 0;
        };

        // Tentar extrair pcusto diretamente
        if (sistema.pcusto) {
          pcusto = parseValue(sistema.pcusto);
        } else if (sistema.precoCusto) {
          pcusto = parseValue(sistema.precoCusto);
        } else {
          // Se não tem pcusto, calcular a partir do total descontando despesas
          // Prioridade: total_final > ppix > precoPixDecimal > valorTotal
          const totalFinal = parseValue(sistema.total_final) || 
                            parseValue(sistema.ppix) || 
                            parseValue(sistema.precoPixDecimal) || 
                            parseValue(sistema.valorTotal);
          const pdespesaTotal = parseValue(sistema.pdespesa_total) || parseValue(sistema.pdespesaTotal);
          
          if (totalFinal > 0) {
            if (pdespesaTotal > 0 && pdespesaTotal < totalFinal) {
              // Calcular pcusto: total_final = pcusto + pdespesa_total
              pcusto = totalFinal - pdespesaTotal;
              console.log(`📊 Sistema ${index + 1}: Calculado pcusto = ${totalFinal} - ${pdespesaTotal} = ${pcusto}`);
            } else {
              // Se não tem pdespesa ou pdespesa é inválida, tentar calcular usando configurações atuais
              // Fórmula: total_final = pcusto + (pdespesaFixo + pcusto * pdespesaVariavel/100)
              // total_final = pcusto * (1 + pdespesaVariavel/100) + pdespesaFixo
              // pcusto = (total_final - pdespesaFixo) / (1 + pdespesaVariavel/100)
              const pdespesaFixo = config.pdespesaFixo || 3000;
              const pdespesaVariavel = config.pdespesaVariavel || 22;
              const fator = 1 + (pdespesaVariavel / 100);
              pcusto = Math.max(0, (totalFinal - pdespesaFixo) / fator);
              console.log(`📊 Sistema ${index + 1}: Estimado pcusto = (${totalFinal} - ${pdespesaFixo}) / ${fator} = ${pcusto}`);
            }
          }
        }
        
        // Log detalhado para debug
        console.log(`💰 Sistema ${index + 1} - Extração de valores:`, {
          pcusto_direto: sistema.pcusto,
          precoCusto: sistema.precoCusto,
          total_final: sistema.total_final,
          ppix: sistema.ppix,
          precoPixDecimal: sistema.precoPixDecimal,
          pdespesa_total: sistema.pdespesa_total,
          pcusto_calculado: pcusto
        });
        
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

        // Garantir valores mínimos válidos - se ainda for 0, tentar mais uma vez com ppix
        if (pcusto <= 0) {
          // Última tentativa: usar ppix/precoPixDecimal como base e estimar pcusto
          const ppixValue = parseValue(sistema.ppix) || parseValue(sistema.precoPixDecimal);
          if (ppixValue > 0) {
            // Estimar pcusto assumindo que ppix = pcusto + despesas
            // Usar configurações atuais para estimar
            const pdespesaFixo = config.pdespesaFixo || 3000;
            const pdespesaVariavel = config.pdespesaVariavel || 22;
            // ppix = pcusto + pdespesaFixo + (pcusto * pdespesaVariavel/100)
            // ppix = pcusto * (1 + pdespesaVariavel/100) + pdespesaFixo
            // pcusto = (ppix - pdespesaFixo) / (1 + pdespesaVariavel/100)
            const fator = 1 + (pdespesaVariavel / 100);
            pcusto = Math.max(0, (ppixValue - pdespesaFixo) / fator);
            console.log(`📊 Sistema ${index + 1}: Estimado pcusto final de ppix = (${ppixValue} - ${pdespesaFixo}) / ${fator} = ${pcusto}`);
          }
          
          // Se ainda for 0 ou negativo, usar valor mínimo baseado na potência
          if (pcusto <= 0) {
            // Estimar pcusto baseado na potência (R$ 4.000/kWp é um valor razoável)
            pcusto = Math.max(10000, potenciaTotal * 4000);
            console.warn(`⚠️ Sistema ${index + 1} tem pcusto inválido, usando estimativa baseada em potência: ${pcusto} (${potenciaTotal} kWp × R$ 4.000/kWp)`);
          }
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
          pdespesa_fixo: sistema.pdespesa_fixo || sistema.pdespesaFixo || config.pdespesaFixo,
          pdespesa_variavel_percent: sistema.pdespesa_variavel_percent || sistema.pdespesaVariavel || config.pdespesaVariavel,
          pdespesa_total: sistema.pdespesa_total || sistema.pdespesaTotal || 0
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
      setLoading(false);

      alert(`✅ Proposta carregada com sucesso!\n\nCliente: ${propostaData.cliente?.nome || 'N/A'}\nSistemas válidos: ${orcamentosValidos.length} de ${orcamentosCarregados.length}\n\nVocê pode editar e gerar nova versão.`);
    } catch (error) {
      console.error('❌ Erro ao carregar proposta:', error);
      alert(`❌ Erro ao carregar proposta do cliente ${clienteSlug}.\n\nVerifique se a proposta existe.`);
      setLoading(false);
    }
  };

  // Carregar configurações do sistema
  useEffect(() => {
    const carregarConfigSistema = async () => {
      try {
        const response = await fetch('/api/admin/config');
        if (response.ok) {
          const configData = await response.json();
          console.log('🔧 Configurações carregadas:', configData);
          setConfigSistema(configData);

          // ✅ ATUALIZAR config state com valores do Supabase
          setConfig(prev => ({
            ...prev,
            hsp: parseFloat(configData.hspPadrao) || prev.hsp,
            tarifa: parseFloat(configData.tarifaEnergia) || prev.tarifa,
            performanceRate: parseFloat(configData.performanceRate) || prev.performanceRate,
            pdespesaFixo: parseFloat(configData.pdespesaFixo) || prev.pdespesaFixo,
            pdespesaVariavel: parseFloat(configData.pdespesaVariavel) || prev.pdespesaVariavel
          }));

          console.log('✅ Config atualizado com valores do Supabase:', {
            hsp: parseFloat(configData.hspPadrao),
            performanceRate: parseFloat(configData.performanceRate),
            pdespesaFixo: parseFloat(configData.pdespesaFixo)
          });
        }
      } catch (error) {
        console.error('Erro ao carregar configurações:', error);
      }
    };

    carregarConfigSistema();

    // Verificar parâmetros da URL
    const params = new URLSearchParams(window.location.search);

    // ✅ CARREGAR PROPOSTA EXISTENTE (novo fluxo)
    const clienteSlug = params.get('cliente');
    if (clienteSlug) {
      carregarPropostaExistente(clienteSlug);
    }
    // Verificar se está no modo "reaproveitar" (um único orçamento)
    else if (params.get('modo') === 'reaproveitar') {
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
          alert(`✅ Orçamento reaproveitado!\n\n${dados.origem}\n\nVocê pode agora:\n- Preencher os dados do novo cliente\n- Adicionar/remover orçamentos\n- Calcular e gerar proposta`);
        } catch (error) {
          console.error('Erro ao reaproveitar orçamento:', error);
          alert('❌ Erro ao carregar orçamento. Tente novamente.');
        }
      }
    }
    
    // Verificar se está no modo "reaproveitar-todos" (múltiplos orçamentos)
    if (params.get('modo') === 'reaproveitar-todos') {
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
          alert(`✅ ${dados.quantidadeTotal} orçamento(s) reaproveitado(s)!\n\n${dados.origem}\n\nVocê pode agora:\n- Preencher os dados do NOVO cliente\n- Adicionar/remover orçamentos\n- Calcular e gerar proposta`);
        } catch (error) {
          console.error('Erro ao reaproveitar orçamentos:', error);
          alert('❌ Erro ao carregar orçamentos. Tente novamente.');
        }
      }
    }
  }, []);

  // Função para calcular preços usando configurações dinâmicas do sistema
  const calcularPrecos = (totalFinalTabela: number) => {
    const ppix = totalFinalTabela; // PIX = Valor Total da tabela (P.Custo + Despesas)

    // USAR CONFIGURAÇÕES DINÂMICAS OU FALLBACK PARA PADRÕES
    // Verificar se descontoPix já está em decimal (0.1) ou percentual (10)
    const descontoPixRaw = configSistema?.descontoPix || 10.0;
    const descontoPix = descontoPixRaw > 1 ? descontoPixRaw / 100 : descontoPixRaw; // Converter se for percentual
    const markupParcelado = configSistema?.fatorParcelado || 1.20; // Ex: 20% markup
    const fator12x = configSistema?.fator12x || 0.88; // Ex: 12% taxa cartão (fator 0.88)
    const fator18x = configSistema?.fator18x || 0.83; // Ex: 17% taxa cartão (fator 0.83)
    
    console.log('🔧 Frontend - Parâmetros de cálculo:', {
      descontoPixRaw,
      descontoPix,
      markupParcelado,
      fator12x,
      fator18x
    });

    const pavista = ppix / (1 - descontoPix); // À vista (PIX tem desconto)
    const priscado = ppix * markupParcelado; // Preço de tabela com margem
    const p12x_total = ppix / fator12x; // 12x com taxa cartão
    const p12x = p12x_total / 12; // Parcela 12x
    const p18x_total = ppix / fator18x; // 18x com taxa cartão
    const p18x_parcela = p18x_total / 18; // Parcela 18x

    return {
      total_base: totalFinalTabela, // Valor da coluna Total (R$)
      ppix, // PIX = Total da tabela
      pavista,
      priscado,
      p12x,
      p12x_total, // Valor total 12x (COM TAXAS)
      p18x_parcela,
      p18x_total // Valor total 18x (COM TAXAS)
    };
  };

  // Função para calcular performance
  const calcularPerformance = (potenciaKw: number, hsp: number, consumoMensal: number, tarifa: number, investimentoPix: number) => {
    const geracaoMensal = potenciaKw * hsp * 30.4 * config.performanceRate;
    const cobertura = (geracaoMensal / consumoMensal) * 100;
    const economiaMensal = geracaoMensal * tarifa;
    const paybackMeses = investimentoPix / economiaMensal;
    const tirAnual = (12 / paybackMeses) * 100;
    
    return {geracaoMensal, cobertura, economiaMensal, paybackMeses, tirAnual};
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
      // CALCULADORA DINÂMICA PARA CONSISTÊNCIA TOTAL
      const pdespesaDinamica = config.pdespesaFixo + (orc.pcusto * config.pdespesaVariavel / 100);
      const totalFinalTabela = orc.pcusto + pdespesaDinamica; // MESMO VALOR DA TABELA
      const precos = calcularPrecos(totalFinalTabela); // PIX = TOTAL DA TABELA
      const performance = calcularPerformance(potTotal, config.hsp, config.consumoMensal, config.tarifa, precos.ppix);

      return {
        nome: orc.nome,
        distribuidora: orc.distribuidora,
        potTotal,
        pcusto: orc.pcusto,
        pdespesa: pdespesaDinamica, // VALOR DINÂMICO
        total_final: totalFinalTabela, // VALOR TOTAL DA TABELA
        pdespesa_fixo: config.pdespesaFixo, // DA CALCULADORA
        pdespesa_variavel: (orc.pcusto * config.pdespesaVariavel / 100), // DA CALCULADORA
        marca_modulo: orc.marca_modulo,
        marca_inversor: orc.marca_inversor,
        modulos: orc.modulos,
        pot_modulo: orc.pot_modulo,
        inversores: orc.inversores,
        pot_inv: orc.pot_inv,
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
      pdespesaFixo: 3000,
      pdespesaVariavel: 22,
      metodo: 'variavel'
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
  const gerarProposta = async () => {
    const erros = validarDados();
    
    if (erros.length > 0) {
      alert(`❌ Dados obrigatórios não preenchidos:\n\n• ${erros.join('\n• ')}\n\nPor favor, preencha todos os campos necessários.`);
      return;
    }

    setLoading(true);
    try {
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
          cliente: {
            nome: config.nomeCliente,
            cidade: config.cidadeCliente,
            consumo_mensal: config.consumoMensal,
            tipo_imovel: config.tipoImovel,
            hsp: config.hsp,
            tarifa: config.tarifa
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
              tirAnual: resultado.tirAnual
            };
          }),
          config: config
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        // Verificar se foi salva no Supabase
        if (!data.supabase?.salva) {
          alert(`⚠️ ATENÇÃO: Proposta gerada mas NÃO foi salva no banco de dados!\n\n${data.supabase?.message || 'Erro desconhecido'}\n\nA proposta pode não estar disponível publicamente.`);
        }

        // ✅ ABRIR PROPOSTA DIRETAMENTE NA URL CORRETA (sem about:blank)
        const propostaUrl = data.slug ? `/proposta/${data.slug}` : null;

        if (propostaUrl) {
          // Abrir proposta em nova aba IMEDIATAMENTE com URL correta
          window.open(propostaUrl, '_blank');

          // Mostrar mensagem de sucesso SEM BLOQUEAR (usando console + log visual opcional)
          const mensagemSucesso = data.supabase?.salva
            ? `✅ Proposta gerada e salva no banco de dados!\n\n📁 Arquivo: ${data.arquivo}\n🔗 Link público: ${data.supabase.url || propostaUrl}\n💾 ID no banco: ${data.supabase.propostaId || 'N/A'}\n\n✨ A proposta foi aberta em nova aba!`
            : `✅ Proposta gerada!\n\n📁 Arquivo: ${data.arquivo}\n🔗 Link: ${propostaUrl}\n⚠️ Não foi salva no banco de dados\n\n✨ A proposta foi aberta em nova aba!`;

          console.log(mensagemSucesso);

          // Opcional: Mostrar toast notification não-bloqueante ao invés de alert
          // Isso permite que a janela abra sem esperar o usuário clicar OK
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
        <title>Gerador Rápido - PIENG Solar</title>
        <meta name="description" content="Gerador rápido de propostas solares" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-orange-50">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-7xl mx-auto">
            
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-3xl font-bold text-gray-800 mb-2">
                  ⚡ Gerador Rápido PIENG
                </h1>
                <p className="text-gray-600">
                  Geração rápida de propostas solares
                </p>
              </div>
              
              <div className="flex gap-3">
                <Link href="/admin" className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                  🏠 Admin
                </Link>
                <Link href="/admin/orcamentos" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  🎯 Consultor
                </Link>
              </div>
            </div>

            {/* Controles de YAML e Histórico */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
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
            <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">⚙️ Configurações Rápidas</h3>

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

              {/* Seção de Pdespesa Simplificada */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-gray-800 mb-3">💰 Configuração de Pdespesa</h4>
                <p className="text-sm text-gray-600 mb-4">Configure uma única Pdespesa com componente fixo + variável aplicado a todos os orçamentos</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Valor Fixo (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={config.pdespesaFixo}
                      onChange={(e) => setConfig({...config, pdespesaFixo: Number(e.target.value)})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Ex: 6500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Valor fixo adicionado a todos os orçamentos</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Percentual Variável (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={config.pdespesaVariavel}
                      onChange={(e) => setConfig({...config, pdespesaVariavel: Number(e.target.value)})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Ex: 78"
                    />
                    <p className="text-xs text-gray-500 mt-1">Percentual aplicado sobre o preço de custo</p>
                  </div>
                </div>

                <div className="mt-3 p-3 bg-blue-50 rounded-lg text-sm">
                  <strong>📊 Fórmula:</strong> Pdespesa Total = Fixo + (Variável% × P.Custo)
                  <br />
                  <strong>📋 Exemplo:</strong> R$ {config.pdespesaFixo.toFixed(2)} + ({config.pdespesaVariavel}% × R$ 6.000) = R$ {(config.pdespesaFixo + (6000 * config.pdespesaVariavel / 100)).toFixed(2)}
                </div>
              </div>
            </div>

            {/* Tabela de Orçamentos Estilo Excel - Editável */}
            {orcamentos.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
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
                              status: 'pendente' as const
                            })),
                            config: {
                              hsp: config.hsp,
                              tarifa: config.tarifa,
                              performanceRate: config.performanceRate,
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
                          
                          alert(`✅ Orçamentos enviados para o Sistema do Consultor!\n\nID: ${slug}`);
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
                        const novoOrc: Orcamento = {
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
                        };
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
                        // USAR CALCULADORA DINÂMICA PARA CONSISTÊNCIA
                        const pdespesaTotalCalculado = config.pdespesaFixo + (orc.pcusto * config.pdespesaVariavel / 100);
                        const totalFinal = orc.pcusto + pdespesaTotalCalculado;
                        const precoPorWp = orc.pcusto / (orc.modulos * orc.pot_modulo);

                        return (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="border border-gray-300 px-2 py-1 text-center text-sm font-bold">
                              {index + 1}
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

                            {/* Preço Custo */}
                            <td className="border border-gray-300 px-1 py-1">
                              <input
                                type="number"
                                step="0.01"
                                value={orc.pcusto}
                                onChange={(e) => {
                                  const novosOrc = [...orcamentos];
                                  novosOrc[index].pcusto = Number(e.target.value);
                                  // Recalcular Pdespesa total
                                  const pdVar = novosOrc[index].pcusto * (novosOrc[index].pdespesa_variavel_percent / 100);
                                  novosOrc[index].pdespesa_total = novosOrc[index].pdespesa_fixo + pdVar;
                                  setOrcamentos(novosOrc);
                                }}
                                className="w-20 px-1 py-1 text-xs border-0 focus:ring-1 focus:ring-blue-500 bg-transparent text-right"
                              />
                            </td>

                            {/* Qtd Módulos */}
                            <td className="border border-gray-300 px-1 py-1">
                              <input
                                type="number"
                                value={orc.modulos}
                                onChange={(e) => {
                                  const novosOrc = [...orcamentos];
                                  novosOrc[index].modulos = Number(e.target.value);
                                  setOrcamentos(novosOrc);
                                }}
                                className="w-12 px-1 py-1 text-xs border-0 focus:ring-1 focus:ring-blue-500 bg-transparent text-center"
                              />
                            </td>

                            {/* Potência por Módulo */}
                            <td className="border border-gray-300 px-1 py-1">
                              <input
                                type="number"
                                value={orc.pot_modulo}
                                onChange={(e) => {
                                  const novosOrc = [...orcamentos];
                                  novosOrc[index].pot_modulo = Number(e.target.value);
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
                                  const novosOrc = [...orcamentos];
                                  novosOrc[index].inversores = Number(e.target.value);
                                  setOrcamentos(novosOrc);
                                }}
                                className="w-12 px-1 py-1 text-xs border-0 focus:ring-1 focus:ring-blue-500 bg-transparent text-center"
                              />
                            </td>

                            {/* Potência por Inversor */}
                            <td className="border border-gray-300 px-1 py-1">
                              <input
                                type="number"
                                step="0.1"
                                value={orc.pot_inv}
                                onChange={(e) => {
                                  const novosOrc = [...orcamentos];
                                  novosOrc[index].pot_inv = Number(e.target.value);
                                  setOrcamentos(novosOrc);
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
                                  const novosOrc = [...orcamentos];
                                  novosOrc[index].marca_inversor = e.target.value;
                                  setOrcamentos(novosOrc);
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
                                  ({config.pdespesaFixo.toLocaleString('pt-BR')} + {config.pdespesaVariavel}%)
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
                </div>
              </div>
            )}

            {/* Resultados Calculados */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-800">📊 Resultados Financeiros</h3>
                  {resultados.length > 0 && (
                    <p className="text-sm text-gray-600 mt-1">
                      {resultados.length} orçamento{resultados.length !== 1 ? 's' : ''} calculado{resultados.length !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
                <button
                  onClick={gerarProposta}
                  disabled={loading || orcamentos.length === 0 || resultados.length === 0}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? '⏳ Gerando...' : '🚀 Gerar Proposta HTML'}
                </button>
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
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">12x S/Juros</th>
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
                            R$ {resultado.ppix.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div className="flex flex-col">
                              <span className="font-semibold">R$ {resultado.p12x.toFixed(2)}</span>
                              <span className="text-xs text-gray-500">por mês</span>
                            </div>
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap text-sm text-purple-600 font-semibold">
                            R$ {resultado.p12x_total.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div className="flex flex-col">
                              <span className="font-semibold">R$ {resultado.p18x_parcela.toFixed(2)}</span>
                              <span className="text-xs text-gray-500">por mês</span>
                            </div>
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap text-sm text-purple-600 font-semibold">
                            R$ {resultado.p18x_total.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
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
                          <p><strong>12x S/Juros:</strong> Parcela mensal sem juros</p>
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
              <p>PIENG Solar - Gerador Rápido v2.0 | Next.js + Vercel</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
