#!/usr/bin/env node

/**
 * 🚀 GERADOR AUTOMÁTICO DE INDEX.HTML PARA NETLIFY
 * 
 * Este script gera automaticamente o arquivo index.html
 * com todas as propostas disponíveis na pasta pastanetilify
 */

const fs = require('fs');
const path = require('path');

// Configurações
const PROPOSTAS_DIR = path.join(__dirname, '../pastanetilify/orçamento/clientes');
const OUTPUT_FILE = path.join(__dirname, '../pastanetilify/index.html');
const NETLIFY_URL = 'https://pieng-propostas-solares.netlify.app';

/**
 * Escaneia a pasta de propostas e retorna lista de arquivos
 */
function scanPropostas() {
    try {
        if (!fs.existsSync(PROPOSTAS_DIR)) {
            console.log('❌ Pasta de propostas não encontrada:', PROPOSTAS_DIR);
            return [];
        }

        const files = fs.readdirSync(PROPOSTAS_DIR);
        const propostas = files
            .filter(file => file.endsWith('.html'))
            .map(file => {
                const name = file.replace('.html', '');
                const displayName = formatDisplayName(name);
                return {
                    file,
                    name,
                    displayName,
                    url: `orçamento/clientes/${file}`
                };
            })
            .sort((a, b) => a.displayName.localeCompare(b.displayName));

        console.log(`✅ Encontradas ${propostas.length} propostas`);
        return propostas;
    } catch (error) {
        console.error('❌ Erro ao escanear propostas:', error.message);
        return [];
    }
}

/**
 * Formata o nome da proposta para exibição
 */
function formatDisplayName(name) {
    // Remove prefixos comuns
    let displayName = name
        .replace(/^proposta_/, '')
        .replace(/^orçamento_/, '')
        .replace(/^orçamento-/, '')
        .replace(/-/g, ' ')
        .replace(/_/g, ' ');

    // Capitaliza primeira letra de cada palavra
    displayName = displayName
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');

    return displayName;
}

/**
 * Gera o HTML do index
 */
function generateIndexHTML(propostas) {
    const timestamp = new Date().toLocaleString('pt-BR');
    
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PIENG Soluções - Propostas Solares</title>
    <meta name="description" content="Sistema de propostas solares personalizadas - PIENG Soluções Energéticas">
    <meta name="robots" content="index, follow">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 1000px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #3366CC 0%, #FF6B35 100%);
            color: white;
            padding: 40px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
            font-weight: 700;
        }
        
        .header p {
            font-size: 1.2em;
            opacity: 0.9;
        }
        
        .content {
            padding: 40px;
        }
        
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }
        
        .stat-card {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            border-left: 4px solid #3366CC;
        }
        
        .stat-number {
            font-size: 2em;
            font-weight: bold;
            color: #3366CC;
        }
        
        .stat-label {
            color: #666;
            margin-top: 5px;
        }
        
        .propostas-section h2 {
            color: #333;
            margin-bottom: 20px;
            font-size: 1.8em;
        }
        
        .propostas-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px;
        }
        
        .proposta-card {
            background: #fff;
            border: 2px solid #e9ecef;
            border-radius: 15px;
            padding: 25px;
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
        }
        
        .proposta-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 15px 30px rgba(0,0,0,0.1);
            border-color: #3366CC;
        }
        
        .proposta-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: linear-gradient(90deg, #3366CC, #FF6B35);
        }
        
        .proposta-title {
            font-size: 1.3em;
            font-weight: 600;
            color: #333;
            margin-bottom: 10px;
        }
        
        .proposta-link {
            display: inline-block;
            background: linear-gradient(135deg, #3366CC, #FF6B35);
            color: white;
            text-decoration: none;
            padding: 12px 24px;
            border-radius: 25px;
            font-weight: 600;
            transition: all 0.3s ease;
            margin-top: 15px;
        }
        
        .proposta-link:hover {
            transform: scale(1.05);
            box-shadow: 0 5px 15px rgba(51, 102, 204, 0.3);
        }
        
        .footer {
            background: #f8f9fa;
            padding: 30px;
            text-align: center;
            color: #666;
            border-top: 1px solid #e9ecef;
        }
        
        .footer-info {
            background: #e7f3ff;
            padding: 20px;
            border-radius: 10px;
            margin-top: 20px;
            border-left: 4px solid #3366CC;
        }
        
        .timestamp {
            font-size: 0.9em;
            color: #999;
            margin-top: 10px;
        }
        
        @media (max-width: 768px) {
            .header h1 {
                font-size: 2em;
            }
            
            .content {
                padding: 20px;
            }
            
            .propostas-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🌞 PIENG Soluções Energéticas</h1>
            <p>Sistema de Propostas Solares Personalizadas</p>
        </div>
        
        <div class="content">
            <div class="stats">
                <div class="stat-card">
                    <div class="stat-number">${propostas.length}</div>
                    <div class="stat-label">Propostas Ativas</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${new Date().getFullYear()}</div>
                    <div class="stat-label">Ano Atual</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">100%</div>
                    <div class="stat-label">Satisfação</div>
                </div>
            </div>
            
            <div class="propostas-section">
                <h2>📋 Propostas Disponíveis</h2>
                <div class="propostas-grid">
                    ${propostas.map(proposta => `
                    <div class="proposta-card">
                        <div class="proposta-title">${proposta.displayName}</div>
                        <p>Proposta solar personalizada com análise completa de viabilidade e retorno do investimento.</p>
                        <a href="${proposta.url}" class="proposta-link" target="_blank">
                            📄 Ver Proposta Completa
                        </a>
                    </div>
                    `).join('')}
                </div>
            </div>
        </div>
        
        <div class="footer">
            <div class="footer-info">
                <h3>ℹ️ Informações do Sistema</h3>
                <p>Este sistema gera automaticamente propostas solares personalizadas com base no consumo energético e características do imóvel.</p>
                <p><strong>🚀 Deploy automático via Netlify</strong> - Atualizado em tempo real!</p>
                <div class="timestamp">
                    Última atualização: ${timestamp}
                </div>
            </div>
        </div>
    </div>
</body>
</html>`;
}

/**
 * Função principal
 */
function main() {
    console.log('🚀 GERADOR AUTOMÁTICO DE INDEX.HTML');
    console.log('=====================================');
    
    // Escanear propostas
    const propostas = scanPropostas();
    
    if (propostas.length === 0) {
        console.log('❌ Nenhuma proposta encontrada. Verifique a pasta:', PROPOSTAS_DIR);
        process.exit(1);
    }
    
    // Gerar HTML
    console.log('📝 Gerando HTML...');
    const html = generateIndexHTML(propostas);
    
    // Salvar arquivo
    try {
        fs.writeFileSync(OUTPUT_FILE, html, 'utf8');
        console.log('✅ Index.html gerado com sucesso!');
        console.log('📁 Arquivo salvo em:', OUTPUT_FILE);
        console.log(`📊 Total de propostas: ${propostas.length}`);
        
        // Listar propostas encontradas
        console.log('\n📋 Propostas encontradas:');
        propostas.forEach((proposta, index) => {
            console.log(`   ${index + 1}. ${proposta.displayName} (${proposta.file})`);
        });
        
    } catch (error) {
        console.error('❌ Erro ao salvar arquivo:', error.message);
        process.exit(1);
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    main();
}

module.exports = { scanPropostas, generateIndexHTML };
