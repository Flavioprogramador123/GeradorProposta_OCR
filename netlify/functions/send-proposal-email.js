/**
 * 📧 API DE ENVIO DE LINKS PARA CLIENTES
 * Netlify Function para envio automático de propostas
 */

const nodemailer = require('nodemailer');

exports.handler = async (event, context) => {
    // Configurar CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
    };

    // Lidar com preflight requests
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: '',
        };
    }

    // Verificar se é POST
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Método não permitido' }),
        };
    }

    try {
        // Parse do body
        const data = JSON.parse(event.body);
        const { 
            clienteNome, 
            clienteEmail, 
            propostaUrl, 
            clienteTelefone,
            cidade,
            consumoMensal,
            tipoInstalacao 
        } = data;

        // Validações
        if (!clienteNome || !clienteEmail || !propostaUrl) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    error: 'Dados obrigatórios: clienteNome, clienteEmail, propostaUrl' 
                }),
            };
        }

        // Configurar transporter de email
        const transporter = nodemailer.createTransporter({
            service: 'gmail', // ou outro provedor
            auth: {
                user: process.env.EMAIL_USER, // Configurar no Netlify
                pass: process.env.EMAIL_PASS, // Configurar no Netlify
            },
        });

        // Template do email
        const emailTemplate = generateEmailTemplate({
            clienteNome,
            propostaUrl,
            cidade,
            consumoMensal,
            tipoInstalacao,
        });

        // Enviar email
        const info = await transporter.sendMail({
            from: `"PIENG Soluções Energéticas" <${process.env.EMAIL_USER}>`,
            to: clienteEmail,
            subject: `🌞 Sua Proposta Solar Personalizada - ${clienteNome}`,
            html: emailTemplate,
            text: generateTextEmail({
                clienteNome,
                propostaUrl,
                cidade,
                consumoMensal,
                tipoInstalacao,
            }),
        });

        // Log do envio
        console.log('Email enviado:', info.messageId);

        // Resposta de sucesso
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'Email enviado com sucesso!',
                messageId: info.messageId,
                propostaUrl,
            }),
        };

    } catch (error) {
        console.error('Erro ao enviar email:', error);
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Erro interno do servidor',
                details: error.message,
            }),
        };
    }
};

/**
 * Gera template HTML do email
 */
function generateEmailTemplate({ clienteNome, propostaUrl, cidade, consumoMensal, tipoInstalacao }) {
    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Proposta Solar - PIENG</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
        }
        .container {
            background: white;
            border-radius: 10px;
            padding: 30px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 3px solid #3366CC;
        }
        .logo {
            font-size: 2em;
            font-weight: bold;
            color: #3366CC;
            margin-bottom: 10px;
        }
        .tagline {
            color: #666;
            font-size: 1.1em;
        }
        .content {
            margin-bottom: 30px;
        }
        .highlight {
            background: linear-gradient(135deg, #3366CC, #FF6B35);
            color: white;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            margin: 20px 0;
        }
        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #3366CC, #FF6B35);
            color: white;
            text-decoration: none;
            padding: 15px 30px;
            border-radius: 25px;
            font-weight: bold;
            font-size: 1.2em;
            margin: 20px 0;
            transition: transform 0.3s ease;
        }
        .cta-button:hover {
            transform: scale(1.05);
        }
        .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin: 20px 0;
        }
        .info-card {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #3366CC;
        }
        .info-label {
            font-weight: bold;
            color: #3366CC;
            font-size: 0.9em;
        }
        .info-value {
            color: #333;
            font-size: 1.1em;
        }
        .footer {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            margin-top: 30px;
        }
        .contact-info {
            margin: 10px 0;
        }
        .social-links {
            margin: 15px 0;
        }
        .social-links a {
            color: #3366CC;
            text-decoration: none;
            margin: 0 10px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🌞 PIENG</div>
            <div class="tagline">Soluções Energéticas</div>
        </div>

        <div class="content">
            <h2>Olá, ${clienteNome}! 👋</h2>
            
            <p>Sua proposta solar personalizada está pronta! Analisamos seu consumo energético e desenvolvemos soluções específicas para maximizar sua economia.</p>

            <div class="highlight">
                <h3>🎯 Sua Proposta Personalizada</h3>
                <p>Clique no botão abaixo para acessar sua proposta completa com análise detalhada, sistemas recomendados e cálculos de economia.</p>
            </div>

            <div style="text-align: center;">
                <a href="${propostaUrl}" class="cta-button">
                    📄 VER MINHA PROPOSTA SOLAR
                </a>
            </div>

            <div class="info-grid">
                <div class="info-card">
                    <div class="info-label">📍 Localização</div>
                    <div class="info-value">${cidade || 'Anápolis/GO'}</div>
                </div>
                <div class="info-card">
                    <div class="info-label">⚡ Consumo Mensal</div>
                    <div class="info-value">${consumoMensal || '2.500'} kWh</div>
                </div>
                <div class="info-card">
                    <div class="info-label">🏠 Tipo de Instalação</div>
                    <div class="info-value">${tipoInstalacao || 'Telhado Fibrocimento'}</div>
                </div>
                <div class="info-card">
                    <div class="info-label">📅 Data da Proposta</div>
                    <div class="info-value">${new Date().toLocaleDateString('pt-BR')}</div>
                </div>
            </div>

            <h3>📋 O que você encontrará na proposta:</h3>
            <ul>
                <li>✅ <strong>Análise completa</strong> do seu consumo energético</li>
                <li>✅ <strong>Sistemas solares personalizados</strong> para seu imóvel</li>
                <li>✅ <strong>Cálculo de economia</strong> mensal e anual</li>
                <li>✅ <strong>Tempo de retorno</strong> do investimento (payback)</li>
                <li>✅ <strong>Especificações técnicas</strong> detalhadas</li>
                <li>✅ <strong>Comparativo de opções</strong> disponíveis</li>
            </ul>

            <div style="background: #e7f3ff; padding: 20px; border-radius: 10px; margin: 20px 0;">
                <h3>💡 Por que escolher energia solar?</h3>
                <p>• <strong>Economia de até 95%</strong> na conta de luz</p>
                <p>• <strong>Valorização do imóvel</strong> em até 6%</p>
                <p>• <strong>Energia limpa e sustentável</strong></p>
                <p>• <strong>Retorno do investimento</strong> em 12-18 meses</p>
            </div>
        </div>

        <div class="footer">
            <h3>📞 Entre em contato conosco</h3>
            <div class="contact-info">
                <p><strong>📱 WhatsApp:</strong> (62) 99167-0536</p>
                <p><strong>📧 Email:</strong> contato@piengsolucoes.com.br</p>
                <p><strong>🌐 Site:</strong> www.piengsolucoes.com.br</p>
            </div>
            
            <div class="social-links">
                <p>Estamos aqui para tirar todas as suas dúvidas!</p>
            </div>

            <p style="font-size: 0.9em; color: #666; margin-top: 20px;">
                Esta proposta é válida por 15 dias. Não perca esta oportunidade de economizar na sua conta de luz! ⚡
            </p>
        </div>
    </div>
</body>
</html>
    `;
}

/**
 * Gera versão texto do email
 */
function generateTextEmail({ clienteNome, propostaUrl, cidade, consumoMensal, tipoInstalacao }) {
    return `
Olá, ${clienteNome}!

Sua proposta solar personalizada está pronta! 🌞

Acesse sua proposta completa: ${propostaUrl}

DADOS DA SUA PROPOSTA:
📍 Localização: ${cidade || 'Anápolis/GO'}
⚡ Consumo Mensal: ${consumoMensal || '2.500'} kWh
🏠 Tipo de Instalação: ${tipoInstalacao || 'Telhado Fibrocimento'}
📅 Data: ${new Date().toLocaleDateString('pt-BR')}

O QUE VOCÊ ENCONTRARÁ NA PROPOSTA:
✅ Análise completa do seu consumo energético
✅ Sistemas solares personalizados para seu imóvel
✅ Cálculo de economia mensal e anual
✅ Tempo de retorno do investimento (payback)
✅ Especificações técnicas detalhadas
✅ Comparativo de opções disponíveis

CONTATO:
📱 WhatsApp: (62) 99167-0536
📧 Email: contato@piengsolucoes.com.br
🌐 Site: www.piengsolucoes.com.br

Esta proposta é válida por 15 dias. Não perca esta oportunidade!

Equipe PIENG Soluções Energéticas
    `;
}
