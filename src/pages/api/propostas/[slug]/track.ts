import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Função para detectar tipo de dispositivo
function detectDevice(userAgent: string): { device: string; browser: string; os: string } {
  const ua = userAgent.toLowerCase();
  
  let device = 'desktop';
  if (/mobile|android|iphone|ipad/.test(ua)) {
    device = /tablet|ipad/.test(ua) ? 'tablet' : 'mobile';
  }
  
  let browser = 'unknown';
  if (ua.includes('chrome')) browser = 'chrome';
  else if (ua.includes('firefox')) browser = 'firefox';
  else if (ua.includes('safari')) browser = 'safari';
  else if (ua.includes('edge')) browser = 'edge';
  
  let os = 'unknown';
  if (ua.includes('windows')) os = 'windows';
  else if (ua.includes('mac')) os = 'macos';
  else if (ua.includes('linux')) os = 'linux';
  else if (ua.includes('android')) os = 'android';
  else if (ua.includes('ios')) os = 'ios';
  
  return { device, browser, os };
}

// Função para obter IP do cliente
function getClientIP(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  const realIP = req.headers['x-real-ip'];
  
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  if (typeof realIP === 'string') {
    return realIP;
  }
  return req.socket.remoteAddress || 'unknown';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { slug } = req.query;
    const { 
      tempoNaPagina, 
      scrollPercentage, 
      cliques,
      primeiraVisualizacao 
    } = req.body;

    if (!slug || typeof slug !== 'string') {
      return res.status(400).json({ message: 'Slug é obrigatório' });
    }

    // Inicializar Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('Variáveis Supabase não configuradas');
      return res.status(500).json({ message: 'Configuração do servidor incompleta' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar proposta pelo slug
    const { data: proposta, error: propostaError } = await supabase
      .from('propostas')
      .select('id, cliente_id')
      .eq('slug', slug)
      .single();

    if (propostaError || !proposta) {
      console.error('Erro ao buscar proposta:', propostaError);
      return res.status(404).json({ message: 'Proposta não encontrada' });
    }

    // Obter dados do cliente
    const ip = getClientIP(req);
    const userAgent = req.headers['user-agent'] || '';
    const referer = req.headers['referer'] || '';
    const deviceInfo = detectDevice(userAgent);

    // Verificar se já existe analytics para este IP e proposta
    // Buscar todas as analytics da proposta e filtrar no código
    const { data: allAnalytics } = await supabase
      .from('proposta_analytics')
      .select('*')
      .eq('proposta_slug', slug);
    
    const existingAnalytics = allAnalytics?.find(a => 
      a.ips_unicos && Array.isArray(a.ips_unicos) && a.ips_unicos.includes(ip)
    ) || null;

    const agora = new Date().toISOString();
    const tempoTotal = tempoNaPagina || 0;

    if (existingAnalytics) {
      // Atualizar analytics existente
      const novosIPs = existingAnalytics.ips_unicos || [];
      if (!novosIPs.includes(ip)) {
        novosIPs.push(ip);
      }

      const { data: updated, error: updateError } = await supabase
        .from('proposta_analytics')
        .update({
          ultima_visualizacao: agora,
          tempo_total_segundos: (existingAnalytics.tempo_total_segundos || 0) + tempoTotal,
          tempo_na_pagina_segundos: tempoNaPagina || 0,
          visualizacoes_count: (existingAnalytics.visualizacoes_count || 0) + 1,
          scroll_percentage: Math.max(existingAnalytics.scroll_percentage || 0, scrollPercentage || 0),
          cliques_count: (existingAnalytics.cliques_count || 0) + (cliques || 0),
          ips_unicos: novosIPs,
          compartilhado: novosIPs.length > 1,
          user_agent: userAgent,
          device_type: deviceInfo.device,
          browser: deviceInfo.browser,
          os: deviceInfo.os,
          referer: referer,
          updated_at: agora
        })
        .eq('id', existingAnalytics.id)
        .select()
        .single();

      if (updateError) {
        console.error('Erro ao atualizar analytics:', updateError);
        return res.status(500).json({ message: 'Erro ao atualizar analytics' });
      }

      return res.status(200).json({ 
        success: true, 
        analytics: updated,
        message: 'Analytics atualizado com sucesso'
      });
    } else {
      // Criar novo registro de analytics
      const { data: newAnalytics, error: insertError } = await supabase
        .from('proposta_analytics')
        .insert({
          proposta_slug: slug,
          proposta_id: proposta.id,
          cliente_id: proposta.cliente_id,
          ip_address: ip,
          user_agent: userAgent,
          referer: referer,
          device_type: deviceInfo.device,
          browser: deviceInfo.browser,
          os: deviceInfo.os,
          primeira_visualizacao: primeiraVisualizacao || agora,
          ultima_visualizacao: agora,
          tempo_total_segundos: tempoTotal,
          tempo_na_pagina_segundos: tempoNaPagina || 0,
          visualizacoes_count: 1,
          scroll_percentage: scrollPercentage || 0,
          cliques_count: cliques || 0,
          ips_unicos: [ip],
          compartilhado: false,
          status: 'visualizada',
          precisa_contato: false
        })
        .select()
        .single();

      if (insertError) {
        console.error('Erro ao criar analytics:', insertError);
        return res.status(500).json({ message: 'Erro ao criar analytics' });
      }

      return res.status(200).json({ 
        success: true, 
        analytics: newAnalytics,
        message: 'Analytics criado com sucesso'
      });
    }
  } catch (error) {
    console.error('Erro ao processar tracking:', error);
    return res.status(500).json({ 
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}


