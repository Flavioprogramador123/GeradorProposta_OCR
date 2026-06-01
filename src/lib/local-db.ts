import { promises as fs } from 'fs';
import { mkdirSync } from 'fs';
import path from 'path';

// Caminho do banco de dados local
const DB_DIR = path.join(process.cwd(), 'data', 'local-db');
const DB_PATH = path.join(DB_DIR, 'propostas.db');

type SqliteDatabase = {
  prepare: (sql: string) => {
    run: (...args: unknown[]) => unknown;
    get: (...args: unknown[]) => unknown;
    all: (...args: unknown[]) => unknown[];
  };
  pragma: (sql: string) => void;
  close: () => void;
};

let db: SqliteDatabase | null = null;

function loadSqlite(): new (path: string) => SqliteDatabase {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('better-sqlite3');
}

/**
 * Verifica se estamos em ambiente serverless (Vercel/Netlify)
 */
function isServerlessEnvironment(): boolean {
  return !!(process.env.VERCEL || process.env.NETLIFY || process.env.NODE_ENV === 'production');
}

/**
 * Inicializa o banco de dados local
 */
function getDatabase(): SqliteDatabase {
  // ⚠️ Não usar SQLite em ambientes serverless (Vercel/Netlify)
  if (isServerlessEnvironment()) {
    throw new Error('SQLite não é suportado em ambientes serverless. Use Supabase em produção.');
  }

  if (db) {
    return db;
  }

  // Criar diretório se não existir
  try {
    mkdirSync(DB_DIR, { recursive: true });
  } catch (error) {
    console.warn('⚠️ Erro ao criar diretório do banco local:', error);
  }

  const Database = loadSqlite();
  db = new Database(DB_PATH);
  
  // Habilitar foreign keys
  db.pragma('foreign_keys = ON');

  // Criar tabelas se não existirem
  initializeTables(db);

  return db;
}

/**
 * Inicializa as tabelas do banco de dados
 */
function initializeTables(database: SqliteDatabase) {
  // Tabela de clientes
  database.exec(`
    CREATE TABLE IF NOT EXISTS clientes (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      cidade TEXT,
      estado TEXT,
      tipo_imovel TEXT,
      consumo_mensal REAL DEFAULT 0,
      hsp_local REAL DEFAULT 5.21,
      email TEXT,
      telefone TEXT,
      pdespesa REAL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Tabela de propostas
  database.exec(`
    CREATE TABLE IF NOT EXISTS propostas (
      id TEXT PRIMARY KEY,
      cliente_id TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      titulo TEXT NOT NULL,
      template_usado TEXT DEFAULT 'pieng_basic',
      sistema_kwp REAL DEFAULT 0,
      geracao_mensal REAL DEFAULT 0,
      geracao_anual REAL DEFAULT 0,
      valor_total REAL DEFAULT 0,
      valor_kwp REAL DEFAULT 0,
      payback REAL DEFAULT 0,
      tir REAL DEFAULT 0,
      dados_completos TEXT NOT NULL, -- JSON string
      html_gerado TEXT, -- HTML completo
      status TEXT DEFAULT 'ativa',
      storage_type TEXT DEFAULT 'local', -- 'local' ou 'supabase'
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (cliente_id) REFERENCES clientes(id)
    )
  `);

  // Índices para melhor performance
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_propostas_cliente_id ON propostas(cliente_id);
    CREATE INDEX IF NOT EXISTS idx_propostas_slug ON propostas(slug);
    CREATE INDEX IF NOT EXISTS idx_propostas_status ON propostas(status);
    CREATE INDEX IF NOT EXISTS idx_propostas_storage_type ON propostas(storage_type);
  `);
}

/**
 * Gera um ID único para o banco local
 */
function generateId(): string {
  return `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Interface para dados de cliente
 */
export interface LocalCliente {
  id: string;
  nome: string;
  cidade?: string;
  estado?: string;
  tipo_imovel?: string;
  consumo_mensal?: number;
  hsp_local?: number;
  email?: string;
  telefone?: string;
  pdespesa?: number;
  created_at?: string;
  updated_at?: string;
}

/**
 * Interface para dados de proposta
 */
export interface LocalProposta {
  id: string;
  cliente_id: string;
  slug: string;
  titulo: string;
  template_usado?: string;
  sistema_kwp?: number;
  geracao_mensal?: number;
  geracao_anual?: number;
  valor_total?: number;
  valor_kwp?: number;
  payback?: number;
  tir?: number;
  dados_completos: any; // Objeto JSON
  html_gerado?: string;
  status?: string;
  storage_type?: 'local' | 'supabase';
  created_at?: string;
  updated_at?: string;
}

/**
 * Busca ou cria um cliente no banco local
 */
export async function getOrCreateCliente(clienteData: {
  nome: string;
  cidade?: string;
  estado?: string;
  tipo_imovel?: string;
  consumo_mensal?: number;
  hsp_local?: number;
  email?: string;
  telefone?: string;
  pdespesa?: number;
}): Promise<LocalCliente> {
  // Verificar se está em ambiente serverless
  if (isServerlessEnvironment()) {
    throw new Error('Banco local não disponível em produção. Configure Supabase.');
  }

  const database = getDatabase();

  // Tentar buscar cliente existente
  const existing = database
    .prepare('SELECT * FROM clientes WHERE nome = ? AND cidade = ?')
    .get(clienteData.nome, clienteData.cidade || '') as LocalCliente | undefined;

  if (existing) {
    // Atualizar dados se necessário
    const update = database.prepare(`
      UPDATE clientes 
      SET cidade = ?, estado = ?, tipo_imovel = ?, consumo_mensal = ?, 
          hsp_local = ?, email = ?, telefone = ?, pdespesa = ?, 
          updated_at = datetime('now')
      WHERE id = ?
    `);

    update.run(
      clienteData.cidade || existing.cidade,
      clienteData.estado || existing.estado,
      clienteData.tipo_imovel || existing.tipo_imovel,
      clienteData.consumo_mensal ?? existing.consumo_mensal,
      clienteData.hsp_local ?? existing.hsp_local,
      clienteData.email || existing.email,
      clienteData.telefone || existing.telefone,
      clienteData.pdespesa ?? existing.pdespesa,
      existing.id
    );

    return { ...existing, ...clienteData, id: existing.id };
  }

  // Criar novo cliente
  const id = generateId();
  const insert = database.prepare(`
    INSERT INTO clientes (
      id, nome, cidade, estado, tipo_imovel, consumo_mensal, 
      hsp_local, email, telefone, pdespesa
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insert.run(
    id,
    clienteData.nome,
    clienteData.cidade || '',
    clienteData.estado || 'GO',
    clienteData.tipo_imovel || 'residencial',
    clienteData.consumo_mensal || 0,
    clienteData.hsp_local || 5.21,
    clienteData.email || '',
    clienteData.telefone || '',
    clienteData.pdespesa || 0
  );

  return {
    id,
    ...clienteData,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

/**
 * Salva uma proposta no banco local
 */
export async function savePropostaLocal(propostaData: {
  cliente_id: string;
  slug: string;
  titulo: string;
  template_usado?: string;
  sistema_kwp?: number;
  geracao_mensal?: number;
  geracao_anual?: number;
  valor_total?: number;
  valor_kwp?: number;
  payback?: number;
  tir?: number;
  dados_completos: any;
  html_gerado?: string;
  status?: string;
}): Promise<LocalProposta> {
  // Verificar se está em ambiente serverless
  if (isServerlessEnvironment()) {
    throw new Error('Banco local não disponível em produção. Configure Supabase.');
  }

  const database = getDatabase();

  const id = generateId();
  const insert = database.prepare(`
    INSERT INTO propostas (
      id, cliente_id, slug, titulo, template_usado, sistema_kwp,
      geracao_mensal, geracao_anual, valor_total, valor_kwp,
      payback, tir, dados_completos, html_gerado, status, storage_type
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'local')
  `);

  insert.run(
    id,
    propostaData.cliente_id,
    propostaData.slug,
    propostaData.titulo,
    propostaData.template_usado || 'pieng_basic',
    propostaData.sistema_kwp || 0,
    propostaData.geracao_mensal || 0,
    propostaData.geracao_anual || 0,
    propostaData.valor_total || 0,
    propostaData.valor_kwp || 0,
    propostaData.payback || 0,
    propostaData.tir || 0,
    JSON.stringify(propostaData.dados_completos),
    propostaData.html_gerado || '',
    propostaData.status || 'ativa'
  );

  return {
    id,
    ...propostaData,
    storage_type: 'local',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

/**
 * Busca todas as propostas locais
 */
export function getAllPropostasLocais(): LocalProposta[] {
  // Em ambiente serverless, retornar array vazio
  if (isServerlessEnvironment()) {
    return [];
  }

  const database = getDatabase();
  
  const propostas = database
    .prepare('SELECT * FROM propostas WHERE storage_type = ? ORDER BY created_at DESC')
    .all('local') as any[];

  return propostas.map(p => ({
    ...p,
    dados_completos: typeof p.dados_completos === 'string' 
      ? JSON.parse(p.dados_completos) 
      : p.dados_completos
  }));
}

/**
 * Busca proposta local por slug
 */
export function getPropostaLocalBySlug(slug: string): LocalProposta | null {
  const database = getDatabase();
  
  const proposta = database
    .prepare('SELECT * FROM propostas WHERE slug = ? AND storage_type = ?')
    .get(slug, 'local') as any;

  if (!proposta) {
    return null;
  }

  return {
    ...proposta,
    dados_completos: typeof proposta.dados_completos === 'string'
      ? JSON.parse(proposta.dados_completos)
      : proposta.dados_completos
  };
}

/**
 * Busca cliente local por ID
 */
export function getClienteLocalById(id: string): LocalCliente | null {
  const database = getDatabase();
  
  return database
    .prepare('SELECT * FROM clientes WHERE id = ?')
    .get(id) as LocalCliente | null;
}

/**
 * Busca todas as propostas (locais e do Supabase se disponível)
 */
export async function getAllPropostas(): Promise<{
  locais: LocalProposta[];
  supabase: any[];
  total: number;
}> {
  const locais = getAllPropostasLocais();
  
  // Tentar buscar do Supabase também
  let supabase: any[] = [];
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (supabaseUrl && supabaseKey) {
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseClient = createClient(supabaseUrl, supabaseKey);
      
      const { data, error } = await supabaseClient
        .from('propostas')
        .select('*, clientes(nome)')
        .eq('status', 'ativa')
        .order('created_at', { ascending: false });
      
      if (!error && data) {
        supabase = data;
      }
    }
  } catch (error) {
    console.warn('⚠️ Erro ao buscar do Supabase:', error);
  }

  return {
    locais,
    supabase,
    total: locais.length + supabase.length
  };
}

/**
 * Fecha a conexão com o banco (útil para testes)
 */
export function closeDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}

