import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

function detectDevice(userAgent: string): { device: string; browser: string; os: string } {
  const ua = userAgent.toLowerCase();

  let device = 'desktop';
  if (/mobile|android|iphone|ipad/.test(ua)) {
    device = /tablet|ipad/.test(ua) ? 'tablet' : 'mobile';
  }

  let browser = 'unknown';
  if (ua.includes('edg/')) browser = 'edge';
  else if (ua.includes('chrome')) browser = 'chrome';
  else if (ua.includes('firefox')) browser = 'firefox';
  else if (ua.includes('safari')) browser = 'safari';

  let os = 'unknown';
  if (ua.includes('windows')) os = 'windows';
  else if (ua.includes('android')) os = 'android';
  else if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ios')) os = 'ios';
  else if (ua.includes('mac')) os = 'macos';
  else if (ua.includes('linux')) os = 'linux';

  return { device, browser, os };
}

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

/** Identidade passiva do visitante (sem app): hash de IP + User-Agent */
function visitorKey(ip: string, userAgent: string): string {
  return crypto.createHash('sha256').update(`${ip}||${userAgent}`).digest('hex').slice(0, 24);
}

function deviceSignature(device: string, browser: string, os: string): string {
  return `${device}|${browser}|${os}`;
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
      primeiraVisualizacao,
      novaSessao,
      tempoAtivoSegundos,
    } = req.body;

    if (!slug || typeof slug !== 'string') {
      return res.status(400).json({ message: 'Slug é obrigatório' });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('Variáveis Supabase não configuradas');
      return res.status(500).json({ message: 'Configuração do servidor incompleta' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: proposta, error: propostaError } = await supabase
      .from('propostas')
      .select('id, cliente_id')
      .eq('slug', slug)
      .single();

    if (propostaError || !proposta) {
      console.error('Erro ao buscar proposta:', propostaError);
      return res.status(404).json({ message: 'Proposta não encontrada' });
    }

    const ip = getClientIP(req);
    const userAgent = req.headers['user-agent'] || '';
    const referer = req.headers['referer'] || '';
    const deviceInfo = detectDevice(userAgent);
    const vKey = visitorKey(ip, userAgent);
    const sig = deviceSignature(deviceInfo.device, deviceInfo.browser, deviceInfo.os);

    const { data: allAnalytics } = await supabase
      .from('proposta_analytics')
      .select('*')
      .eq('proposta_slug', slug);

    // Mesmo aparelho/rede: User-Agent idêntico OU mesmo IP com mesmo perfil de device
    const existingAnalytics =
      allAnalytics?.find((a) => a.user_agent && a.user_agent === userAgent) ||
      allAnalytics?.find(
        (a) =>
          a.ip_address === ip &&
          a.device_type === deviceInfo.device &&
          a.browser === deviceInfo.browser &&
          a.os === deviceInfo.os
      ) ||
      allAnalytics?.find(
        (a) => a.ips_unicos && Array.isArray(a.ips_unicos) && a.ips_unicos.includes(ip)
      ) ||
      null;

    const agora = new Date().toISOString();
    // Preferir tempo com aba visível (mais fiel); fallback tempo total na página
    const tempoSessao = Math.max(
      0,
      Number(tempoAtivoSegundos ?? tempoNaPagina ?? 0) || 0
    );

    const outrosVisitantes = (allAnalytics || []).filter((a) => a.id !== existingAnalytics?.id);
    const assinaturas = new Set<string>([
      sig,
      ...outrosVisitantes.map((a) =>
        deviceSignature(a.device_type || '', a.browser || '', a.os || '')
      ),
    ]);
    const ipsTodos = new Set<string>();
    if (ip && ip !== 'unknown') ipsTodos.add(ip);
    for (const a of allAnalytics || []) {
      if (a.ip_address) ipsTodos.add(a.ip_address);
      if (Array.isArray(a.ips_unicos)) a.ips_unicos.forEach((x: string) => ipsTodos.add(x));
    }
    const pareceCompartilhado = assinaturas.size > 1 || ipsTodos.size > 1 || outrosVisitantes.length > 0;

    if (existingAnalytics) {
      const novosIPs: string[] = Array.isArray(existingAnalytics.ips_unicos)
        ? [...existingAnalytics.ips_unicos]
        : [];
      if (ip && ip !== 'unknown' && !novosIPs.includes(ip)) {
        novosIPs.push(ip);
      }

      const isNovaSessao = Boolean(novaSessao);
      const prevPagina = existingAnalytics.tempo_na_pagina_segundos || 0;
      const tempoTotalAtualizado = isNovaSessao
        ? (existingAnalytics.tempo_total_segundos || 0) + tempoSessao
        : Math.max(0, (existingAnalytics.tempo_total_segundos || 0) - prevPagina) + tempoSessao;

      const compartilhadoAgora = pareceCompartilhado || novosIPs.length > 1;

      const { data: updated, error: updateError } = await supabase
        .from('proposta_analytics')
        .update({
          ultima_visualizacao: agora,
          tempo_total_segundos: tempoTotalAtualizado,
          tempo_na_pagina_segundos: tempoSessao,
          visualizacoes_count: (existingAnalytics.visualizacoes_count || 0) + (isNovaSessao ? 1 : 0),
          scroll_percentage: Math.max(
            existingAnalytics.scroll_percentage || 0,
            scrollPercentage || 0
          ),
          cliques_count: isNovaSessao
            ? (existingAnalytics.cliques_count || 0) + (cliques || 0)
            : Math.max(existingAnalytics.cliques_count || 0, cliques || 0),
          ips_unicos: novosIPs,
          compartilhado: compartilhadoAgora,
          ip_address: ip,
          user_agent: userAgent,
          device_type: deviceInfo.device,
          browser: deviceInfo.browser,
          os: deviceInfo.os,
          referer: referer || existingAnalytics.referer,
          status: compartilhadoAgora
            ? 'compartilhada'
            : tempoTotalAtualizado >= 180
              ? 'interessada'
              : 'visualizada',
          updated_at: agora,
        })
        .eq('id', existingAnalytics.id)
        .select()
        .single();

      if (updateError) {
        console.error('Erro ao atualizar analytics:', updateError);
        return res.status(500).json({ message: 'Erro ao atualizar analytics' });
      }

      if (compartilhadoAgora && outrosVisitantes.length > 0) {
        await supabase
          .from('proposta_analytics')
          .update({ compartilhado: true, status: 'compartilhada' })
          .eq('proposta_slug', slug);
      }

      return res.status(200).json({
        success: true,
        analytics: updated,
        visitorKey: vKey,
        message: 'Analytics atualizado',
      });
    }

    // Novo visitante (outro IP e/ou outro aparelho)
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
        tempo_total_segundos: tempoSessao,
        tempo_na_pagina_segundos: tempoSessao,
        visualizacoes_count: 1,
        scroll_percentage: scrollPercentage || 0,
        cliques_count: cliques || 0,
        ips_unicos: ip && ip !== 'unknown' ? [ip] : [],
        compartilhado: pareceCompartilhado,
        status: pareceCompartilhado ? 'compartilhada' : 'visualizada',
        precisa_contato: pareceCompartilhado,
        alerta_contato: pareceCompartilhado ? 'compartilhado' : null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Erro ao criar analytics:', insertError);
      return res.status(500).json({ message: 'Erro ao criar analytics' });
    }

    if (pareceCompartilhado) {
      await supabase
        .from('proposta_analytics')
        .update({
          compartilhado: true,
          status: 'compartilhada',
          precisa_contato: true,
          alerta_contato: 'compartilhado',
        })
        .eq('proposta_slug', slug);
    }

    return res.status(200).json({
      success: true,
      analytics: newAnalytics,
      visitorKey: vKey,
      message: 'Analytics criado',
    });
  } catch (error) {
    console.error('Erro ao processar tracking:', error);
    return res.status(500).json({
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  }
}
