import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

function mascaraIp(ip?: string | null): string {
  if (!ip || ip === 'unknown') return '—';
  const parts = ip.split('.');
  if (parts.length === 4) return `${parts[0]}.${parts[1]}.*.*`;
  if (ip.includes(':')) return ip.slice(0, 12) + '…';
  return ip;
}

function rotuloEquipamento(a: {
  device_type?: string;
  browser?: string;
  os?: string;
}): string {
  const device =
    a.device_type === 'mobile'
      ? 'Celular'
      : a.device_type === 'tablet'
        ? 'Tablet'
        : a.device_type === 'desktop'
          ? 'Computador'
          : a.device_type || 'Aparelho';
  const browser = a.browser && a.browser !== 'unknown' ? a.browser : '';
  const os = a.os && a.os !== 'unknown' ? a.os : '';
  return [device, browser, os].filter(Boolean).join(' · ');
}

function getMensagemAlerta(tipo: string | null, diasSemVisualizar: number | null): string {
  switch (tipo) {
    case 'tempo_sem_visualizar':
      return `Cliente não visualiza há ${diasSemVisualizar} dias. Considere entrar em contato.`;
    case 'compartilhado':
      return 'Indício de compartilhamento: mais de um IP ou aparelho acessou o mesmo link.';
    case 'muito_tempo_aberto':
      return 'Cliente passou bastante tempo na proposta — alto interesse.';
    case 'sem_visualizacao':
      return 'Proposta ainda não foi visualizada pelo cliente.';
    default:
      return 'Ação recomendada: verificar status do cliente.';
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { slug } = req.query;

    if (!slug || typeof slug !== 'string') {
      return res.status(400).json({ message: 'Slug é obrigatório' });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ message: 'Configuração do servidor incompleta' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: analytics, error } = await supabase
      .from('proposta_analytics')
      .select('*')
      .eq('proposta_slug', slug)
      .order('ultima_visualizacao', { ascending: false });

    if (error) {
      console.error('Erro ao buscar analytics:', error);
      return res.status(500).json({ message: 'Erro ao buscar analytics' });
    }

    if (!analytics || analytics.length === 0) {
      return res.status(200).json({
        analytics: [],
        estatisticas: {
          totalVisualizacoes: 0,
          visualizacoesUnicas: 0,
          tempoTotalSegundos: 0,
          tempoMedioSegundos: 0,
          compartilhado: false,
          precisaContato: false,
          ultimaVisualizacao: null,
          diasSemVisualizar: null,
          ipsDistintos: 0,
          equipamentosDistintos: 0,
          diagnosticoCompartilhamento: {
            indício: false,
            confianca: 'nenhum',
            motivo: 'Ainda não houve acesso.',
            equipamentos: [] as string[],
            ipsMascarados: [] as string[],
          },
          alertas: [
            {
              tipo: 'sem_visualizacao',
              mensagem: getMensagemAlerta('sem_visualizacao', null),
              data: null,
            },
          ],
        },
      });
    }

    const totalVisualizacoes = analytics.reduce((sum, a) => sum + (a.visualizacoes_count || 0), 0);
    const visualizacoesUnicas = analytics.length;
    const tempoTotalSegundos = analytics.reduce((sum, a) => sum + (a.tempo_total_segundos || 0), 0);
    const tempoMedio = tempoTotalSegundos / Math.max(1, visualizacoesUnicas);

    const ips = new Set<string>();
    const equipamentos = new Set<string>();
    for (const a of analytics) {
      if (a.ip_address) ips.add(a.ip_address);
      if (Array.isArray(a.ips_unicos)) a.ips_unicos.forEach((ip: string) => ips.add(ip));
      equipamentos.add(
        `${a.device_type || '?'}|${a.browser || '?'}|${a.os || '?'}`
      );
    }

    const compartilhadoFlag = analytics.some(
      (a) => a.compartilhado || (a.ips_unicos?.length || 0) > 1
    );
    const multiIp = ips.size > 1;
    const multiEquip = equipamentos.size > 1;
    const multiVisitante = analytics.length > 1;
    const compartilhado = compartilhadoFlag || multiIp || multiEquip || multiVisitante;

    let confianca: 'alta' | 'media' | 'baixa' | 'nenhum' = 'nenhum';
    let motivo = 'Um único perfil de acesso até agora.';
    if (multiEquip && multiIp) {
      confianca = 'alta';
      motivo =
        'Aparelhos diferentes e IPs diferentes — forte indício de que o link foi encaminhado a outra pessoa.';
    } else if (multiEquip) {
      confianca = 'alta';
      motivo =
        'Mais de um tipo de aparelho/navegador (ex.: celular e computador) — possível compartilhamento.';
    } else if (multiIp && multiVisitante) {
      confianca = 'media';
      motivo =
        'IPs diferentes no mesmo link. Pode ser Wi‑Fi vs 4G da mesma pessoa, ou outra pessoa.';
    } else if (multiIp) {
      confianca = 'baixa';
      motivo = 'Mais de um IP no mesmo aparelho/perfil — rede móvel mudando ou VPN.';
    } else if (compartilhadoFlag) {
      confianca = 'media';
      motivo = 'Sistema marcou compartilhamento com base nos acessos registrados.';
    }

    const precisaContato =
      analytics.some((a) => a.precisa_contato) || compartilhado;
    const ultimaVisualizacao = analytics[0]?.ultima_visualizacao || null;

    let diasSemVisualizar: number | null = null;
    if (ultimaVisualizacao) {
      const diff = Date.now() - new Date(ultimaVisualizacao).getTime();
      diasSemVisualizar = Math.floor(diff / (1000 * 60 * 60 * 24));
    }

    const alertas = [
      ...analytics
        .filter((a) => a.alerta_contato)
        .map((a) => ({
          tipo: a.alerta_contato as string,
          mensagem: getMensagemAlerta(a.alerta_contato, diasSemVisualizar),
          data: a.ultima_visualizacao as string,
        })),
    ];
    if (compartilhado && !alertas.some((a) => a.tipo === 'compartilhado')) {
      alertas.unshift({
        tipo: 'compartilhado',
        mensagem: getMensagemAlerta('compartilhado', null),
        data: ultimaVisualizacao,
      });
    }

    const analyticsSafe = analytics.map((a) => ({
      ...a,
      ip_mascarado: mascaraIp(a.ip_address),
      equipamento_rotulo: rotuloEquipamento(a),
    }));

    return res.status(200).json({
      analytics: analyticsSafe,
      estatisticas: {
        totalVisualizacoes,
        visualizacoesUnicas,
        tempoTotalSegundos,
        tempoMedioSegundos: Math.round(tempoMedio),
        compartilhado,
        precisaContato,
        ultimaVisualizacao,
        diasSemVisualizar,
        ipsDistintos: ips.size,
        equipamentosDistintos: equipamentos.size,
        diagnosticoCompartilhamento: {
          indício: compartilhado,
          confianca,
          motivo,
          equipamentos: analytics.map(rotuloEquipamento),
          ipsMascarados: Array.from(ips).map(mascaraIp),
        },
        alertas,
      },
    });
  } catch (error) {
    console.error('Erro ao processar analytics:', error);
    return res.status(500).json({
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  }
}
