// Gerenciador Automático de Orçamentos
// Este script atualiza automaticamente o index.html quando novos orçamentos são adicionados

const fs = require('fs');
const path = require('path');

function atualizarListaOrçamentos() {
    const orçamentoDir = path.join(__dirname, 'clientes');
    const indexPath = path.join(__dirname, '..', 'index.html');
    
    // Ler todos os arquivos HTML da pasta clientes
    const arquivos = fs.readdirSync(orçamentoDir)
        .filter(arquivo => arquivo.endsWith('.html'))
        .sort(); // Ordenar alfabeticamente
    
    // Gerar HTML dos links
    const linksHTML = arquivos.map(arquivo => {
        const nomeCliente = arquivo.replace('.html', '').replace('orçamento-', '');
        return `            <li class="orçamento-item">
                <a href="orçamento/clientes/${arquivo}" target="_blank">📄 Orçamento - ${nomeCliente}</a>
            </li>`;
    }).join('\n');
    
    // Ler o index.html atual
    let indexContent = fs.readFileSync(indexPath, 'utf8');
    
    // Substituir a seção de orçamentos
    const regex = /<ul class="orçamento-list">[\s\S]*?<\/ul>/;
    const novaSecao = `<ul class="orçamento-list">
${linksHTML}
        </ul>`;
    
    indexContent = indexContent.replace(regex, novaSecao);
    
    // Salvar o arquivo atualizado
    fs.writeFileSync(indexPath, indexContent, 'utf8');
    
    console.log(`✅ Lista de orçamentos atualizada! ${arquivos.length} orçamentos encontrados.`);
}

// Executar se chamado diretamente
if (require.main === module) {
    atualizarListaOrçamentos();
}

module.exports = { atualizarListaOrçamentos };

