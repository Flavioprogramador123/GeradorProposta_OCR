import { NextApiRequest, NextApiResponse } from 'next';
import { supabase, supabaseConfig } from '../../../lib/supabase';
import { promises as fs } from 'fs';
import path from 'path';

interface NovoClienteData {
  nome: string;
  cidade: string;
  estado: string;
  tipoImovel: 'Residencial' | 'Comercial' | 'Industrial' | 'Rural';
  hspLocal: number;
  consumoMensal?: number;
  tipoInstalacao?: string;
  email?: string;
  telefone?: string;
  observacoes?: string;
}

function sanitizeSlug(name: string, city: string): string {
  const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const combined = `${name}-${city}-${date}`;
  return combined
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function sanitizeFolderName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 20);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const data: NovoClienteData = req.body;

    // Validação básica
    if (!data.nome || !data.cidade) {
      return res.status(400).json({ message: 'Dados obrigatórios faltando' });
    }

    const slug = sanitizeSlug(data.nome, data.cidade);
    const folderName = sanitizeFolderName(data.nome);

    // 1. SALVAR NO SUPABASE (prioritário) - sem fallback local
    if (supabaseConfig.isConfigured) {
      try {
        // Tentativa 1: payload completo
        const fullPayload: any = {
          nome: data.nome,
          slug: slug,
          cidade: data.cidade,
          estado: data.estado,
          consumo_mensal: data.consumoMensal || 0,
          tipo_imovel: data.tipoImovel,
          tipo_instalacao: data.tipoInstalacao || 'Telhado'
        };
        if (data.email) fullPayload.email = data.email;
        if (data.telefone) fullPayload.telefone = data.telefone;

        let insertResp = await supabase
          .from('clientes')
          .insert(fullPayload)
          .select()
          .single();

        // Se falhar por coluna inexistente (PGRST204), reenvia com payload mínimo
        if (insertResp.error && insertResp.error.code === 'PGRST204') {
          console.warn('⚠️  Coluna inexistente no schema. Reenviando payload mínimo. Detalhe:', insertResp.error.message);
          const minimalPayload = {
            nome: data.nome,
            slug: slug,
            cidade: data.cidade,
            estado: data.estado,
            consumo_mensal: data.consumoMensal || 0,
            tipo_imovel: data.tipoImovel
          };
          insertResp = await supabase
            .from('clientes')
            .insert(minimalPayload)
            .select()
            .single();
        }

        if (insertResp.error) {
          console.error('Erro ao salvar no Supabase:', insertResp.error);
          return res.status(500).json({ message: 'Erro ao criar cliente no Supabase', error: insertResp.error.message });
        }

        const clienteData = insertResp.data;
        console.log('✅ Cliente salvo no Supabase:', clienteData?.id);

        // 2. Não salvar localmente para evitar hardcode/falso positivo

        return res.status(201).json({
          message: 'Cliente criado com sucesso!',
          cliente: {
            id: clienteData.id,
            nome: data.nome,
            slug: slug,
            pasta: folderName
          },
          source: 'supabase'
        });

      } catch (supabaseError: any) {
        console.error('Erro no Supabase:', supabaseError);
        return res.status(500).json({ 
          message: 'Erro ao criar cliente no Supabase',
          error: supabaseError.message 
        });
      }
    }

    // 3. Se Supabase não estiver configurado, retornar erro explícito
    return res.status(503).json({ 
      message: 'Supabase não configurado. Configure para usar em produção.',
      hint: 'Defina SUPABASE_URL e SUPABASE_ANON_KEY no .env'
    });

  } catch (error) {
    console.error('Erro ao criar cliente:', error);
    return res.status(500).json({ 
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

