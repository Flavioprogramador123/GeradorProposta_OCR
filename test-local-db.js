// Script de teste para verificar o banco de dados local
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_DIR = path.join(process.cwd(), 'data', 'local-db');
const DB_PATH = path.join(DB_DIR, 'propostas.db');

console.log('🧪 Testando banco de dados local...\n');

// Criar diretório se não existir
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
  console.log('✅ Diretório criado:', DB_DIR);
}

// Testar conexão
try {
  const db = new Database(DB_PATH);
  console.log('✅ Conexão com banco estabelecida:', DB_PATH);
  
  // Verificar tabelas
  const tables = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name NOT LIKE 'sqlite_%'
  `).all();
  
  console.log('\n📊 Tabelas encontradas:');
  tables.forEach(table => {
    console.log(`  - ${table.name}`);
  });
  
  // Contar registros
  if (tables.some(t => t.name === 'propostas')) {
    const countPropostas = db.prepare('SELECT COUNT(*) as count FROM propostas').get();
    console.log(`\n📋 Propostas no banco: ${countPropostas.count}`);
  }
  
  if (tables.some(t => t.name === 'clientes')) {
    const countClientes = db.prepare('SELECT COUNT(*) as count FROM clientes').get();
    console.log(`👥 Clientes no banco: ${countClientes.count}`);
  }
  
  db.close();
  console.log('\n✅ Teste concluído com sucesso!');
} catch (error) {
  console.error('❌ Erro ao testar banco:', error.message);
  process.exit(1);
}

