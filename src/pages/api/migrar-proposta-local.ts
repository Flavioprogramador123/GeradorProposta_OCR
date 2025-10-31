import { NextApiRequest, NextApiResponse } from 'next';
import { promises as fs } from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

/**
 * API para migrar propostas locais para o Supabase
 * 
 * Uso:
 * POST /api/migrar-proposta-local
 * Body: { slug: "ciney-30-10-2025" }
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { slug } = req.body;

    if (!slug) {
      return res.status(400).json({ error: 'Slug da proposta é obrigatório' });
    }

    // Verificar variáveis do Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({
        error: 'Variáveis Supabase não configuradas',
        hint: 'Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY'
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Buscar proposta local (JSON)
    const propostaPath = path.join(process.cwd(), 'src/data/clientes', slug, 'proposta.json');
    
    let propostaData;
    try {
      const jsonContent = await fs.readFile(propostaPath, 'utf8');
      propostaData = JSON.parse(jsonContent);
      console.log('✅ Proposta local encontrada:', slug);
    } catch (fileError) {
      return res.status(404).json({
        error: 'Proposta local não encontrada',
        path: propostaPath,
        hint: `Verifique se o arquivo existe em: src/data/clientes/${slug}/proposta.json`
      });
    }

    // 2. Buscar HTML gerado (se existir)
    let htmlContent = '';
    const htmlPath = path.join(process.cwd(), 'src/data/clientes', slug, `proposta_${slug}.html`);
    try {
      htmlContent = await fs.readFile(htmlPath, 'utf8');
      console.log('✅ HTML local encontrado:', slug);
    } catch {
      // HTML não é obrigatório
      console.log('⚠️ HTML não encontrado, continuando sem HTML');
    }

    // 3. Extrair dados da proposta
    const cliente = propostaData.cliente;
    const sistemas = propostaData.sistemas || [];
    const primeiroSistema = sistemas[0] || {};

    // 4. Buscar ou criar cliente no Supabase
    let clienteId: string;

    const { data: clienteExistente } = await supabase
      .from('clientes')
      .select('id')
      .eq('nome', cliente.nome)
      .eq('cidade', cliente.cidade)
      .maybeSingle();

    if (clienteExistente) {
      clienteId = clienteExistente.id;
      console.log('✅ Cliente existente encontrado:', clienteId);
    } else {
      const { data: novoCliente, error: clienteError } = await supabase
        .from('clientes')
        .insert({
          nome: cliente.nome,
          cidade: cliente.cidade,
          estado: cliente.cidade?.includes('GO') ? 'GO' : 'SP',
          tipo_imovel: cliente.tipo || cliente.tipoImovel || 'residencial',
          consumo_mensal: cliente.consumoMensal || cliente.consumo_mensal || 0,
          hsp_local: parseFloat(cliente.hspLocal || '5.21'),
        })
        .select()
        .single();

      if (clienteError || !novoCliente) {
        throw new Error(`Erro ao criar cliente: ${clienteError?.message}`);
      }

      clienteId = novoCliente.id;
      console.log('✅ Novo cliente criado:', clienteId);
    }

    // 5. Salvar proposta no Supabase
    const { data: proposta, error: propostaError } = await supabase
      .from('propostas')
      .upsert({
        cliente_id: clienteId,
        slug: slug,
        titulo: `Proposta Solar - ${cliente.nome}`,
        template_usado: 'pieng_basic',
        sistema_kwp: primeiroSistema.potTotal || parseFloat(primeiroSistema.potencia?.replace(' kWp', '') || '0'),
        geracao_mensal: primeiroSistema.geracaoMensal || parseInt(primeiroSistema.geracao?.replace(' kWh', '') || '0'),
        geracao_anual: (primeiroSistema.geracaoMensal || parseInt(primeiroSistema.geracao?.replace(' kWh', '') || '0')) * 12,
        valor_total: primeiroSistema.precoPixDecimal || parseFloat(primeiroSistema.precoPixDecimal || '0'),
        valor_kwp: primeiroSistema.precoPixDecimal ? (primeiroSistema.precoPixDecimal / (primeiroSistema.potTotal || 1)) : 0,
        payback: primeiroSistema.paybackMeses ? Math.round(primeiroSistema.paybackMeses / 12) : 0,
        tir: primeiroSistema.tirAnual || parseFloat(primeiroSistema.tir?.replace('%', '') || '0'),
        dados_completos: propostaData,
        html_gerado: htmlContent,
        status: 'ativa',
      }, { onConflict: 'slug' })
      .select()
      .single();

    if (propostaError) {
      console.error('❌ Erro ao salvar proposta:', propostaError);
      throw new Error(`Erro ao salvar proposta: ${propostaError.message}`);
    }

    console.log('✅ Proposta migrada com sucesso:', proposta.id);

    return res.status(200).json({
      success: true,
      message: '✅ Proposta migrada para o Supabase com sucesso!',
      proposta: {
        id: proposta.id,
        slug: proposta.slug,
        titulo: proposta.titulo,
      },
      cliente: {
        id: clienteId,
        nome: cliente.nome,
      },
      url: `/proposta/${slug}`,
      sistemas: sistemas.length,
    });

  } catch (error) {
    console.error('❌ Erro ao migrar proposta:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined,
    });
  }
}

