import { NextApiRequest, NextApiResponse } from 'next';
import { promises as fs } from 'fs';
import path from 'path';
import { generateTemplateHtmlResultados } from '@/lib/templateEngine';
import type { ClientType, ComercialSubType } from '@/lib/variantConfig';
import {
  buildPropostaTemplateData,
  normalizePropostaConfig,
  processarOrcamentosParaSistemas,
  type OrcamentoInput,
  type PropostaConfigInput,
} from '@/lib/propostaOrcamentoProcessor';

/**
 * Consultor → mesmo engine do Gerador Rápido (propostaOrcamentoProcessor + templateEngine).
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const {
      clienteId: clienteIdBody,
      clientId,
      orcamentos,
      config,
      clientType,
      subType,
      cliente: clienteInfo,
    } = req.body;

    const clienteId = clienteIdBody || clientId;

    if (!clienteId || !orcamentos || !config) {
      return res.status(400).json({
        error: 'Dados obrigatórios não fornecidos (clienteId, orcamentos, config)',
      });
    }

    const cfg = normalizePropostaConfig(config as PropostaConfigInput);

    if (clientType) {
      console.log(`🎨 Template (Gerador Rápido): ${clientType}${subType ? ` - ${subType}` : ''}`);
    }

    const orcamentosAprovados = (orcamentos as OrcamentoInput[]).filter(
      (orc) => orc.status === 'aprovado'
    );

    if (orcamentosAprovados.length === 0) {
      return res.status(400).json({ error: 'Nenhum orçamento aprovado encontrado' });
    }

    const sistemas = processarOrcamentosParaSistemas(orcamentosAprovados, cfg);
    const melhor = sistemas.find((s) => s.isRecommended) || sistemas[0];

    const templateData = buildPropostaTemplateData(
      sistemas,
      {
        nome: clienteInfo?.nome || `Cliente ${clienteId}`,
        cidade: clienteInfo?.cidade || 'São Paulo',
        consumoMensal: clienteInfo?.consumoMensal ?? cfg.consumoMensal,
        tipo: (clientType as string) || clienteInfo?.tipo || 'residencial',
        hsp: clienteInfo?.hsp ?? cfg.hsp,
        tarifa: clienteInfo?.tarifa ?? cfg.tarifa,
        tipoInstalacao: clienteInfo?.tipoInstalacao || 'Telhado Fibrocimento',
      },
      cfg
    );

    const htmlContent = await generateTemplateHtmlResultados(
      templateData,
      clientType as ClientType | undefined,
      subType as ComercialSubType | undefined
    );

    let propostaUrl: string | null = null;
    const fileName = `proposta-consultor-${clienteId}-${Date.now()}.html`;
    const isServerless = Boolean(process.env.VERCEL || process.env.NETLIFY);

    if (!isServerless) {
      try {
        const filePath = path.join(process.cwd(), 'public', 'propostas', fileName);
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, htmlContent, 'utf8');
        propostaUrl = `/propostas/${fileName}`;
      } catch (writeError) {
        console.warn('⚠️ Não foi possível salvar HTML em disco:', writeError);
      }
    }

    const melhorPayback =
      melhor.paybackMeses !== Infinity && melhor.paybackMeses > 0 ? melhor.paybackMeses : 0;
    const melhorTir =
      melhor.paybackMeses > 0 && melhor.paybackMeses !== Infinity
        ? (12 / melhor.paybackMeses) * 100
        : 0;

    return res.status(200).json({
      success: true,
      html: htmlContent,
      propostaUrl,
      fileName,
      orcamentosProcessados: orcamentosAprovados.length,
      melhorPayback,
      melhorTir,
      melhorPrecoPix: melhor.ppix,
      melhorPotencia: melhor.potTotal,
      melhorGeracao: melhor.geracaoMensal,
    });
  } catch (error) {
    console.error('Erro ao gerar proposta consultor:', error);
    return res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  }
}
