/** Schema embutido — evita ler arquivo do disco (inexistente no bundle Vercel). */
export const V3_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS cds (
  id INTEGER PRIMARY KEY,
  codigo INTEGER NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  slug_portal TEXT NOT NULL UNIQUE,
  ativo INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS equipamentos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sku_interno TEXT NOT NULL UNIQUE,
  sku_soollar TEXT,
  nome TEXT NOT NULL,
  marca TEXT,
  categoria TEXT NOT NULL
    CHECK (categoria IN (
      'modulo', 'inversor', 'microinversor', 'estrutura',
      'cabo', 'conector', 'miscelanea', 'protecao', 'outro'
    )),
  potencia_w REAL,
  potencia_kw REAL,
  especificacao_json TEXT DEFAULT '{}',
  ativo INTEGER NOT NULL DEFAULT 1,
  prioridade_kit INTEGER NOT NULL DEFAULT 100,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS equipamento_aliases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  equipamento_id INTEGER NOT NULL REFERENCES equipamentos(id) ON DELETE CASCADE,
  texto_match TEXT NOT NULL,
  UNIQUE (equipamento_id, texto_match)
);

CREATE TABLE IF NOT EXISTS precos_cd (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  equipamento_id INTEGER NOT NULL REFERENCES equipamentos(id) ON DELETE CASCADE,
  cd_id INTEGER NOT NULL REFERENCES cds(id),
  preco_custo REAL,
  estoque INTEGER,
  capturado_em TEXT,
  fonte TEXT DEFAULT 'manual',
  valido_estoque INTEGER NOT NULL DEFAULT 0,
  UNIQUE (equipamento_id, cd_id)
);

CREATE TABLE IF NOT EXISTS precos_cd_historico (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  equipamento_id INTEGER NOT NULL,
  cd_id INTEGER NOT NULL,
  preco_custo REAL,
  estoque INTEGER,
  capturado_em TEXT NOT NULL DEFAULT (datetime('now')),
  fonte TEXT
);

CREATE TABLE IF NOT EXISTS kits_regras (
  chave TEXT PRIMARY KEY,
  valor_json TEXT NOT NULL,
  descricao TEXT
);

CREATE TABLE IF NOT EXISTS meta_v3 (
  chave TEXT PRIMARY KEY,
  valor TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS orcamentos_base (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  titulo TEXT NOT NULL,
  cd_id INTEGER NOT NULL REFERENCES cds(id),
  cliente_nome TEXT,
  notas TEXT,
  custo_total REAL NOT NULL DEFAULT 0,
  breakdown_json TEXT DEFAULT '{}',
  itens_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS orcamento_base_itens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  orcamento_id INTEGER NOT NULL REFERENCES orcamentos_base(id) ON DELETE CASCADE,
  equipamento_id INTEGER NOT NULL REFERENCES equipamentos(id),
  sku_interno TEXT NOT NULL,
  nome TEXT NOT NULL,
  categoria TEXT,
  quantidade REAL NOT NULL,
  preco_unitario REAL,
  estoque INTEGER,
  subtotal REAL,
  sugerido INTEGER NOT NULL DEFAULT 0,
  editado_manual INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_equip_categoria ON equipamentos(categoria);
CREATE INDEX IF NOT EXISTS idx_equip_ativo ON equipamentos(ativo);
CREATE INDEX IF NOT EXISTS idx_precos_cd ON precos_cd(cd_id);
CREATE INDEX IF NOT EXISTS idx_orc_base_cd ON orcamentos_base(cd_id);
`;
