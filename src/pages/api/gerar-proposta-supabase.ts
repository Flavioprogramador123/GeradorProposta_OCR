import { NextApiRequest, NextApiResponse } from 'next';
import { generateTemplateHtmlPadrao } from '@/lib/templateEngine';

// Verificar variáveis de ambiente primeiro
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * API para gerar propostas usando Supabase
 * Substitui o sistema de arquivos pelo banco de dados
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Debug: Verificar variáveis de ambiente
    console.log('🔧 Verificando variáveis de ambiente:', {
      SUPABASE_URL: SUPABASE_URL ? 'Configurada' : 'FALTANDO',
      SUPABASE_KEY: SUPABASE_KEY ? 'Configurada' : 'FALTANDO',
    });

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return res.status(500).json({
        error: 'Variáveis de ambiente do Supabase não configuradas',
        details: {
          SUPABASE_URL: SUPABASE_URL ? 'OK' : 'MISSING',
          SUPABASE_KEY: SUPABASE_KEY ? 'OK' : 'MISSING',
        },
        hint: 'Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no Vercel',
      });
    }

    const { cliente, orcamentos, config } = req.body;

    console.log('📥 Dados recebidos na API Supabase:', {
      cliente: cliente,
      orcamentosCount: orcamentos?.length || 0,
    });

    // Validar dados
    if (!cliente || !orcamentos || !config) {
      return res.status(400).json({ message: 'Dados incompletos' });
    }

    // Criar slug normalizado
    const normalizeSlug = (text: string) => {
      return text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
    };

    const dataAtual = new Date().toLocaleDateString('pt-BR');
    const slug = `${normalizeSlug(cliente.nome)}-${dataAtual.replace(/\//g, '-')}`;

    // Processar sistemas (mantém lógica original)
    const sistemas = orcamentos.map((orc: any) => {
      const potTotal = orc.potTotal || (orc.modulos * orc.pot_modulo) / 1000;

      return {
        nome: orc.nome,
        potTotal: potTotal,
        pcusto: orc.pcusto || 0,
        pdespesa: orc.pdespesa_total || orc.pdespesa || 0,
        modulos: orc.modulos || Math.round(potTotal * 1000 / 580),
        pot_modulo: orc.pot_modulo || 580,
        marca_modulo: orc.marca_modulo || 'N/A',
        inversores: orc.inversores || 1,
        pot_inv: orc.pot_inv || Math.ceil(potTotal),
        marca_inversor: orc.marca_inversor || 'N/A',
        ppix: orc.ppix || 0,
        pavista: orc.pavista || 0,
        priscado: orc.priscado || 0,
        p12x: orc.p12x || 0,
        p12x_total: orc.p12x_total || 0,
        p18x_parcela: orc.p18x_parcela || 0,
        p18x_total: orc.p18x_total || 0,
        geracaoMensal: orc.geracaoMensal || 0,
        cobertura: orc.cobertura || 0,
        economiaMensal: orc.economiaMensal || 0,
        paybackMeses: orc.paybackMeses || 0,
        tirAnual: orc.tirAnual || 0
      };
    });

    // Ordenar por PIX
    sistemas.sort((a: any, b: any) => a.ppix - b.ppix);

    // Preparar dados para o template engine
    const propostaData = {
      cliente: {
        nome: cliente.nome,
        cidade: cliente.cidade,
        consumoMensal: cliente.consumo_mensal,
        tipo: cliente.tipo_imovel || 'Residencial',
        hsp: config.hsp || 5.21
      },
      sistemas: sistemas,
      empresa: {
        contato: '(62) 98463-3175',
        email: 'contato@pieng.com.br',
        site: 'www.pieng.com.br'
      },
      dataGeracao: dataAtual,
      dataValidade: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR')
    };

    // Gerar HTML usando template engine correto
    const htmlContent = await generateTemplateHtmlPadrao(propostaData);

    // ==========================
    // SALVAR NO SUPABASE
    // ==========================

    // Importar Supabase dinamicamente
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    console.log('✅ Cliente Supabase criado');

    // 1. Criar/buscar cliente
    const { data: clienteExistente, error: clienteError } = await supabase
      .from('clientes')
      .select('*')
      .eq('nome', cliente.nome)
      .eq('cidade', cliente.cidade)
      .maybeSingle();

    if (clienteError) {
      console.error('❌ Erro ao buscar cliente:', clienteError);
      throw new Error(`Erro Supabase: ${clienteError.message}`);
    }

    let clienteId: string;

    if (clienteExistente) {
      clienteId = clienteExistente.id;
      console.log('✅ Cliente existente encontrado:', clienteId);
    } else {
      const { data: novoCliente, error: createError } = await supabase
        .from('clientes')
        .insert({
          nome: cliente.nome,
          cidade: cliente.cidade,
          estado: cliente.cidade.includes('GO') ? 'GO' : 'SP',
          tipo_imovel: cliente.tipo_imovel || 'residencial',
          consumo_mensal: cliente.consumo_mensal,
          hsp_local: config.hsp || 5.21,
          pdespesa: config.pdespesaFixo || 0,
        })
        .select()
        .single();

      if (createError || !novoCliente) {
        console.error('❌ Erro ao criar cliente:', createError);
        throw new Error(`Erro ao criar cliente: ${createError?.message}`);
      }

      clienteId = novoCliente.id;
      console.log('✅ Novo cliente criado:', clienteId);
    }

    // 2. Salvar proposta
    const { data: proposta, error: propostaError } = await supabase
      .from('propostas')
      .upsert({
        cliente_id: clienteId,
        slug: slug,
        titulo: `Proposta Solar - ${cliente.nome}`,
        template_usado: 'pieng_basic',
        sistema_kwp: sistemas[0]?.potTotal || 0,
        geracao_mensal: sistemas[0]?.geracaoMensal || 0,
        geracao_anual: (sistemas[0]?.geracaoMensal || 0) * 12,
        valor_total: sistemas[0]?.ppix || 0,
        valor_kwp: (sistemas[0]?.ppix || 0) / (sistemas[0]?.potTotal || 1),
        payback: Math.round((sistemas[0]?.paybackMeses || 0) / 12),
        tir: sistemas[0]?.tirAnual || 0,
        dados_completos: {
          cliente,
          sistemas,
          orcamentos,
          config,
          dataGeracao: dataAtual,
        },
        html_gerado: htmlContent,
        status: 'ativa',
      })
      .select()
      .single();

    if (propostaError || !proposta) {
      console.error('❌ Erro ao salvar proposta:', propostaError);
      throw new Error(`Erro ao salvar proposta: ${propostaError?.message}`);
    }

    console.log('✅ Proposta salva no Supabase:', proposta.id);

    // Retornar resposta
    return res.status(200).json({
      success: true,
      slug: slug,
      arquivo: `proposta_${slug}.html`,
      propostaId: proposta.id,
      clienteId: clienteId,
      url: `/proposta-supabase/${slug}`,  // ✅ CORRIGIDO: usar rota do Supabase
      htmlContent: htmlContent, // Retornar HTML inline
      sistemas: sistemas.length,
      message: '✅ Proposta gerada e salva no Supabase com sucesso!',
    });

  } catch (error) {
    console.error('❌ ERRO COMPLETO:', error);
    console.error('❌ Stack trace:', error instanceof Error ? error.stack : 'N/A');
    console.error('❌ Tipo de erro:', typeof error);
    console.error('❌ Nome do erro:', error instanceof Error ? error.name : 'N/A');

    return res.status(500).json({
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : String(error),
      errorName: error instanceof Error ? error.name : typeof error,
      stack: error instanceof Error ? error.stack : undefined,
      // SEMPRE mostrar stack em produção para debug
      fullError: JSON.stringify(error, Object.getOwnPropertyNames(error)),
    });
  }
}
