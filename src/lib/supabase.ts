import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Criar cliente apenas se as variáveis estiverem configuradas
let supabaseInstance: SupabaseClient | null = null;

if (supabaseUrl && supabaseAnonKey) {
  try {
    // ✅ Configurações adicionais para evitar problemas com Cloudflare
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false, // Não persistir sessão em server-side
        autoRefreshToken: false, // Não fazer refresh automático
      },
      db: {
        schema: 'public',
      },
      global: {
        headers: {
          'x-client-info': 'pieng-propostas@1.0.0',
        },
      },
      // ✅ Configurações para evitar timeout e problemas de rede
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
    console.log('✅ Cliente Supabase criado com sucesso');
  } catch (error) {
    console.warn('⚠️ Erro ao criar cliente Supabase:', error);
  }
} else {
  console.warn('⚠️ Variáveis Supabase não configuradas. Usando modo fallback.');
}

// Exportar função que retorna o cliente ou null
export const supabase = supabaseInstance;

// ============================================
// TIPOS TYPESCRIPT
// ============================================

export interface Cliente {
  id: string;
  nome: string;
  email?: string;
  telefone?: string;
  cidade: string;
  estado: string;
  tipo_imovel: string;
  consumo_mensal?: number;
  hsp_local: number;
  pdespesa?: number;
  created_at: string;
  updated_at: string;
}

export interface Proposta {
  id: string;
  cliente_id: string;
  slug: string;
  titulo: string;
  template_usado: string;
  sistema_kwp?: number;
  geracao_mensal?: number;
  geracao_anual?: number;
  valor_total?: number;
  valor_kwp?: number;
  payback?: number;
  tir?: number;
  dados_completos: any; // JSONB
  html_gerado?: string;
  pdf_url?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Orcamento {
  id: string;
  cliente_id: string;
  arquivo_nome: string;
  fornecedor?: string;
  valor_total?: number;
  data_orcamento?: string;
  componentes?: any; // JSONB
  dados_extraidos?: any; // JSONB
  created_at: string;
}

export interface Configuracao {
  id: string;
  chave: string;
  valor: any; // JSONB
  descricao?: string;
  created_at: string;
  updated_at: string;
}

// ============================================
// FUNÇÕES HELPER
// ============================================

/**
 * Buscar cliente por slug
 */
export async function getClienteBySlug(slug: string) {
  if (!supabase) {
    console.warn('⚠️ Supabase não configurado. Não é possível buscar cliente.');
    return null;
  }

  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .ilike('nome', `%${slug.replace(/-/g, ' ')}%`)
    .single();

  if (error) {
    console.error('Erro ao buscar cliente:', error);
    return null;
  }

  return data as Cliente;
}

/**
 * Buscar proposta por slug (otimizado)
 * Busca apenas os campos necessários para melhor performance
 */
export async function getPropostaBySlug(slug: string) {
  if (!supabase) {
    console.warn('⚠️ Supabase não configurado. Não é possível buscar proposta.');
    return null;
  }

  try {
    // Buscar campos essenciais incluindo cliente_id e template_usado para buscar dados atualizados
    const { data, error } = await supabase
      .from('propostas')
      .select('id, cliente_id, slug, titulo, template_usado, status, dados_completos, created_at, updated_at')
      .eq('slug', slug)
      .maybeSingle();

    if (error) {
      // Se erro for "not found", não é crítico
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Erro ao buscar proposta:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Erro inesperado ao buscar proposta:', error);
    return null;
  }
}

/**
 * Criar ou atualizar proposta
 */
export async function upsertProposta(proposta: Partial<Proposta>) {
  if (!supabase) {
    throw new Error('Supabase não configurado. Não é possível salvar proposta.');
  }

  const { data, error } = await supabase
    .from('propostas')
    .upsert(proposta, { onConflict: 'slug' })
    .select()
    .single();

  if (error) {
    console.error('Erro ao salvar proposta:', error);
    throw error;
  }

  return data as Proposta;
}

/**
 * Criar cliente
 */
export async function createCliente(cliente: Omit<Cliente, 'id' | 'created_at' | 'updated_at'>) {
  if (!supabase) {
    throw new Error('Supabase não configurado. Não é possível criar cliente.');
  }

  const { data, error } = await supabase
    .from('clientes')
    .insert(cliente)
    .select()
    .single();

  if (error) {
    console.error('Erro ao criar cliente:', error);
    throw error;
  }

  return data as Cliente;
}

/**
 * Buscar todos os clientes
 */
export async function getAllClientes() {
  if (!supabase) {
    console.warn('⚠️ Supabase não configurado. Retornando lista vazia.');
    return [];
  }

  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erro ao buscar clientes:', error);
    return [];
  }

  return data as Cliente[];
}

/**
 * Buscar configuração por chave
 */
export async function getConfiguracao(chave: string) {
  if (!supabase) {
    console.warn('⚠️ Supabase não configurado. Não é possível buscar configuração.');
    return null;
  }

  const { data, error } = await supabase
    .from('configuracoes')
    .select('*')
    .eq('chave', chave)
    .single();

  if (error) {
    console.error('Erro ao buscar configuração:', error);
    return null;
  }

  return data as Configuracao;
}

/**
 * Buscar todas as configurações
 */
export async function getAllConfiguracoes() {
  if (!supabase) {
    console.warn('⚠️ Supabase não configurado. Retornando lista vazia.');
    return [];
  }

  const { data, error } = await supabase
    .from('configuracoes')
    .select('*');

  if (error) {
    console.error('Erro ao buscar configurações:', error);
    return [];
  }

  return data as Configuracao[];
}

/**
 * Buscar ou criar cliente (por nome e cidade)
 * Retorna o cliente existente ou cria um novo
 */
export async function findOrCreateCliente(cliente: Omit<Cliente, 'id' | 'created_at' | 'updated_at'>) {
  if (!supabase) {
    throw new Error('Supabase não configurado. Não é possível buscar ou criar cliente.');
  }

  // Tentar buscar cliente existente
  const { data: clienteExistente } = await supabase
    .from('clientes')
    .select('*')
    .eq('nome', cliente.nome)
    .eq('cidade', cliente.cidade)
    .maybeSingle();

  if (clienteExistente) {
    // Atualizar dados se necessário
    const { data: updated } = await supabase
      .from('clientes')
      .update({
        ...cliente,
        updated_at: new Date().toISOString()
      })
      .eq('id', clienteExistente.id)
      .select()
      .single();

    return updated as Cliente || clienteExistente as Cliente;
  }

  // Criar novo cliente
  const { data: novoCliente, error } = await supabase
    .from('clientes')
    .insert(cliente)
    .select()
    .single();

  if (error) {
    console.error('Erro ao criar cliente:', error);
    throw error;
  }

  return novoCliente as Cliente;
}

/**
 * Buscar cliente por ID
 */
export async function getClienteById(id: string) {
  if (!supabase) {
    console.warn('⚠️ Supabase não configurado. Não é possível buscar cliente.');
    return null;
  }

  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Erro ao buscar cliente:', error);
    return null;
  }

  return data as Cliente;
}

/**
 * Atualizar cliente
 */
export async function updateCliente(id: string, updates: Partial<Cliente>) {
  if (!supabase) {
    throw new Error('Supabase não configurado. Não é possível atualizar cliente.');
  }

  const { data, error } = await supabase
    .from('clientes')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Erro ao atualizar cliente:', error);
    throw error;
  }

  return data as Cliente;
}

/**
 * Buscar clientes com propostas (para dashboard)
 */
export async function getClientesWithPropostas() {
  if (!supabase) {
    console.warn('⚠️ Supabase não configurado. Retornando lista vazia.');
    return [];
  }

  const { data, error } = await supabase
    .from('clientes')
    .select(`
      *,
      propostas (
        id,
        slug,
        status,
        created_at
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erro ao buscar clientes com propostas:', error);
    return [];
  }

  return data.map((cliente: any) => ({
    ...cliente,
    temProposta: cliente.propostas && cliente.propostas.length > 0,
    propostasCount: cliente.propostas?.length || 0
  }));
}