import { NextApiRequest, NextApiResponse } from 'next';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/lib/supabase';
import type { ApiOrcamento, OrcamentoArquivo } from '@/utils/orcamentosSupabase';
import { mapSupabaseOrcamentoRow, resolveClienteSupabase } from '@/utils/orcamentosSupabase';
import { getClientesDataRoot, isServerlessFs } from '@/lib/serverlessFs';

type Orcamento = ApiOrcamento & Record<string, any>;

const hasSupabaseEnv = Boolean(
  (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL) &&
  (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY)
);

const supabaseReady = Boolean(supabase && hasSupabaseEnv);

const ALLOWED_STATUSES: Orcamento['status'][] = [
  'pendente',
  'analisando',
  'aprovado',
  'rejeitado',
];

const filesystemRoot = getClientesDataRoot();

function normalizeStatus(value: any): Orcamento['status'] {
  if (typeof value === 'string') {
    const normalized = value.toLowerCase() as Orcamento['status'];
    if (ALLOWED_STATUSES.includes(normalized)) {
      return normalized;
    }
  }
  return 'pendente';
}

function buildStats(orcamentos: Orcamento[]) {
  return {
    total: orcamentos.length,
    pendentes: orcamentos.filter((o) => o.status === 'pendente').length,
    aprovados: orcamentos.filter((o) => o.status === 'aprovado').length,
    rejeitados: orcamentos.filter((o) => o.status === 'rejeitado').length,
  };
}

function getOrcamentosPath(clienteId: string) {
  return path.join(filesystemRoot, clienteId, 'orcamentos.json');
}

function buildArquivosFromPayload(payload: any): OrcamentoArquivo[] {
  if (Array.isArray(payload?.arquivos)) {
    return payload.arquivos.map((arquivo: any) => ({
      nome: arquivo?.nome || arquivo?.fileName || 'arquivo',
      url: arquivo?.url,
      tipo: (arquivo?.tipo as OrcamentoArquivo['tipo']) || 'outros',
    }));
  }

  if (payload?.arquivo) {
    return [{
      nome: payload.arquivo,
      url: payload.arquivoUrl,
      tipo: 'outros',
    }];
  }

  return [];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { clienteId } = req.query;

  if (!clienteId || typeof clienteId !== 'string') {
    return res.status(400).json({ message: 'ID do cliente é obrigatório' });
  }

  const orcamentosPath = getOrcamentosPath(clienteId);

  if (req.method === 'GET') {
    // Listar orçamentos do cliente
    try {
      if (supabaseReady && supabase) {
        try {
          const clienteSupabase = await resolveClienteSupabase(clienteId);

          if (clienteSupabase) {
            const { data, error } = await supabase
              .from('orcamentos')
              .select('*')
              .eq('cliente_id', clienteSupabase.id)
              .order('created_at', { ascending: false });

            if (error) {
              console.error('Erro ao buscar orçamentos no Supabase:', error);
            } else if (data) {
              const orcamentos = data.map(mapSupabaseOrcamentoRow);
              return res.status(200).json({
                orcamentos,
                stats: buildStats(orcamentos),
                source: 'supabase',
              });
            }
          }
        } catch (supabaseError) {
          console.error('Erro inesperado no Supabase ao listar orçamentos:', supabaseError);
        }
      }

      let orcamentos: Orcamento[] = [];
      
      try {
        const orcamentosData = await fs.readFile(orcamentosPath, 'utf8');
        orcamentos = JSON.parse(orcamentosData);
      } catch (error) {
        // Arquivo não existe, retornar lista vazia
      }

      res.status(200).json({
        orcamentos,
        stats: buildStats(orcamentos),
        source: 'filesystem',
      });
    } catch (error) {
      console.error('Erro ao listar orçamentos:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }
  
  else if (req.method === 'POST') {
    // Criar novo orçamento
    try {
      const payload = req.body || {};
      const now = new Date().toISOString();
      const arquivos = buildArquivosFromPayload(payload);
      const componentes = (payload.componentes && typeof payload.componentes === 'object')
        ? payload.componentes
        : {};
      const valorTotal = Number(payload.valorTotal ?? payload.precoCustoYaml ?? 0);
      const precoCustoYaml = typeof payload.precoCustoYaml === 'number'
        ? payload.precoCustoYaml
        : Number(payload.precoCustoYaml ?? payload.valorTotal ?? 0);

      const novoOrcamento: Orcamento = {
        ...payload,
        id: uuidv4(),
        fornecedor: payload.fornecedor || payload.distribuidora || 'Fornecedor não identificado',
        dataOrcamento: payload.dataOrcamento || now,
        status: normalizeStatus(payload.status),
        valorTotal,
        componentes,
        precoCustoYaml,
        arquivos,
        despesas: payload.despesas,
        observacoes: payload.observacoes,
        createdAt: now,
        updatedAt: now,
      };

      if (!novoOrcamento.fornecedor) {
        return res.status(400).json({ message: 'Fornecedor é obrigatório' });
      }

      if (supabaseReady && supabase) {
        try {
          const clienteSupabase = await resolveClienteSupabase(clienteId);

          if (clienteSupabase) {
            const { data, error } = await supabase
              .from('orcamentos')
              .insert({
                id: novoOrcamento.id,
                cliente_id: clienteSupabase.id,
                arquivo_nome: payload.arquivo || arquivos[0]?.nome || `${clienteId}-orcamento-${Date.now()}.json`,
                fornecedor: novoOrcamento.fornecedor,
                valor_total: valorTotal,
                data_orcamento: novoOrcamento.dataOrcamento,
                componentes,
                dados_extraidos: {
                  ...payload,
                  id: novoOrcamento.id,
                  createdAt: now,
                  updatedAt: now,
                  dataOrcamento: novoOrcamento.dataOrcamento,
                },
              })
              .select()
              .single();

            if (error) {
              console.error('Erro ao salvar orçamento no Supabase:', error);
            } else if (data) {
              const orcamentoSupabase = mapSupabaseOrcamentoRow(data);
              return res.status(201).json({
                message: 'Orçamento criado com sucesso (Supabase)',
                orcamento: orcamentoSupabase,
                source: 'supabase',
              });
            }
          }
        } catch (supabaseError) {
          console.error('Erro inesperado ao salvar orçamento no Supabase:', supabaseError);
        }
      }

      let orcamentos: Orcamento[] = [];
      
      // Tentar carregar orçamentos existentes do filesystem
      try {
        const orcamentosData = await fs.readFile(orcamentosPath, 'utf8');
        orcamentos = JSON.parse(orcamentosData);
      } catch (error) {
        // Arquivo não existe, criar novo array
      }

      orcamentos.push(novoOrcamento);

      if (isServerlessFs() && !supabaseReady) {
        return res.status(503).json({
          message: 'Orçamento exige Supabase em produção (filesystem read-only).',
          orcamento: novoOrcamento,
          source: 'none',
        });
      }

      // Criar diretório se não existe
      const clienteDir = path.dirname(orcamentosPath);
      await fs.mkdir(clienteDir, { recursive: true });

      // Salvar orçamentos
      await fs.writeFile(orcamentosPath, JSON.stringify(orcamentos, null, 2), 'utf8');

      res.status(201).json({ 
        message: 'Orçamento criado com sucesso',
        orcamento: novoOrcamento,
        source: 'filesystem',
      });
    } catch (error) {
      console.error('Erro ao criar orçamento:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }
  
  else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}