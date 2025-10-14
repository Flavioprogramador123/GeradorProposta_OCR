const fs = require('fs');
const path = require('path');

const clientesDir = path.join(process.cwd(), 'src/data/clientes');
const pastas = fs.readdirSync(clientesDir);

const clientes = pastas.map(pasta => {
  const clientePath = path.join(clientesDir, pasta);
  const stat = fs.statSync(clientePath);

  if (!stat.isDirectory()) return null;

  let clienteData = {
    nome: pasta.toUpperCase().replace(/-/g, ' '),
    cidade: 'Anápolis/GO',
    pasta: pasta,
    status: 'aguardando_orcamentos',
    ultimaModificacao: stat.mtime.toLocaleDateString('pt-BR'),
    temProposta: false
  };

  try {
    const propostaPath = path.join(clientePath, 'proposta.json');
    if (fs.existsSync(propostaPath)) {
      const proposta = JSON.parse(fs.readFileSync(propostaPath, 'utf8'));
      clienteData.nome = proposta.cliente.nome || clienteData.nome;
      clienteData.cidade = proposta.cliente.cidade || clienteData.cidade;
      clienteData.temProposta = true;
      clienteData.status = 'proposta_gerada';
    }
  } catch (e) {
    console.log(`Erro ao ler proposta de ${pasta}:`, e.message);
  }

  return clienteData;
}).filter(Boolean);

const output = {
  clientes: clientes,
  stats: {
    totalClientes: clientes.length,
    proposasGeradas: clientes.filter(c => c.temProposta).length,
    aguardandoOrcamentos: clientes.filter(c => !c.temProposta).length
  },
  ultimaAtualizacao: new Date().toISOString()
};

// Criar pasta public se não existir
if (!fs.existsSync('public')) {
  fs.mkdirSync('public');
}

fs.writeFileSync('public/clientes-data.json', JSON.stringify(output, null, 2));
console.log('✅ Arquivo criado: public/clientes-data.json');
console.log('📊 Total de clientes:', clientes.length);
console.log('📄 Propostas geradas:', output.stats.proposasGeradas);
console.log('⏳ Aguardando:', output.stats.aguardandoOrcamentos);
