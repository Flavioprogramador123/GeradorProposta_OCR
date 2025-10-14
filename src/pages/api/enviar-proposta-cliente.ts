import { NextApiRequest, NextApiResponse } from 'next';

/**
 * 📧 API DE ENVIO DE PROPOSTAS PARA CLIENTES
 * Integração com Netlify Functions para envio automático
 */

interface SendProposalRequest {
    clienteNome: string;
    clienteEmail: string;
    clienteTelefone?: string;
    cidade?: string;
    consumoMensal?: number;
    tipoInstalacao?: string;
    propostaSlug: string;
}

interface SendProposalResponse {
    success: boolean;
    message: string;
    propostaUrl?: string;
    error?: string;
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<SendProposalResponse>
) {
    // Configurar CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({
            success: false,
            error: 'Método não permitido'
        });
    }

    try {
        const {
            clienteNome,
            clienteEmail,
            clienteTelefone,
            cidade,
            consumoMensal,
            tipoInstalacao,
            propostaSlug
        }: SendProposalRequest = req.body;

        // Validações
        if (!clienteNome || !clienteEmail || !propostaSlug) {
            return res.status(400).json({
                success: false,
                error: 'Dados obrigatórios: clienteNome, clienteEmail, propostaSlug'
            });
        }

        // Validar email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(clienteEmail)) {
            return res.status(400).json({
                success: false,
                error: 'Email inválido'
            });
        }

        // Construir URL da proposta
        const propostaUrl = `https://pieng-propostas-solares.netlify.app/proposta/${propostaSlug}`;

        // Dados para envio
        const emailData = {
            clienteNome,
            clienteEmail,
            clienteTelefone,
            cidade: cidade || 'Anápolis/GO',
            consumoMensal: consumoMensal || 2500,
            tipoInstalacao: tipoInstalacao || 'Telhado Fibrocimento',
            propostaUrl
        };

        // Chamar Netlify Function
        const netlifyResponse = await fetch('https://pieng-propostas-solares.netlify.app/.netlify/functions/send-proposal-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(emailData)
        });

        const netlifyResult = await netlifyResponse.json();

        if (!netlifyResponse.ok) {
            throw new Error(netlifyResult.error || 'Erro ao enviar email');
        }

        // Log do envio
        console.log(`Email enviado para ${clienteEmail} - Proposta: ${propostaSlug}`);

        // Resposta de sucesso
        return res.status(200).json({
            success: true,
            message: 'Email enviado com sucesso!',
            propostaUrl
        });

    } catch (error) {
        console.error('Erro ao enviar proposta:', error);
        
        return res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            message: error instanceof Error ? error.message : 'Erro desconhecido'
        });
    }
}
