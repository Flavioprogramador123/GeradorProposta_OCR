import { NextApiRequest, NextApiResponse } from 'next';
import { promises as fs } from 'fs';
import path from 'path';
import { supabase } from '@/lib/supabase';
import { mapSupabaseOrcamentoRow, resolveClienteSupabase } from '@/utils/orcamentosSupabase';
import { getClientesDataRoot, isServerlessFs } from '@/lib/serverlessFs';

const hasSupabaseEnv = Boolean(
  (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL) &&
  (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY)
);

const supabaseReady = Boolean(supabase && hasSupabaseEnv);
const filesystemRoot = getClientesDataRoot();

function getOrcamentosPath(clienteId: string) {
  return path.join(filesystemRoot, clienteId, 'orcamentos.json');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { clienteId, orcamentoId } = req.query;

  if (!clienteId || typeof clienteId !== 'string' || !orcamentoId || typeof orcamentoId !== 'string') {
    return res.status(400).json({ message: 'ID do cliente e orçamento são obrigatórios' });
  }

  const orcamentosPath = getOrcamentosPath(clienteId);

  if (req.method === 'GET') {
    // Obter orçamento específico
    try {
      if (supabaseReady && supabase) {
        try {
          const clienteSupabase = await resolveClienteSupabase(clienteId);

          if (clienteSupabase) {
            const { data, error } = await supabase
              .from('orcamentos')
              .select('*')
              .eq('id', orcamentoId)
              .eq('cliente_id', clienteSupabase.id)
              .maybeSingle();

            if (error) {
              if (error.code !== 'PGRST116') {
                console.error('Erro ao obter orçamento no Supabase:', error);
              }
            } else if (data) {
              return res.status(200).json(mapSupabaseOrcamentoRow(data));
            }
          }
        } catch (supabaseError) {
          console.error('Erro inesperado ao buscar orçamento no Supabase:', supabaseError);
        }
      }

      const orcamentosData = await fs.readFile(orcamentosPath, 'utf8');
      const orcamentos = JSON.parse(orcamentosData);
      
      const orcamento = orcamentos.find((o: any) => o.id === orcamentoId);
      
      if (!orcamento) {
        return res.status(404).json({ message: 'Orçamento não encontrado' });
      }

      res.status(200).json(orcamento);
    } catch (error) {
      console.error('Erro ao obter orçamento:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }
  
  else if (req.method === 'PUT') {
    // Atualizar orçamento
    try {
      if (supabaseReady && supabase) {
        try {
          const clienteSupabase = await resolveClienteSupabase(clienteId);

          if (clienteSupabase) {
            const { data: existente, error: existenteErro } = await supabase
              .from('orcamentos')
              .select('*')
              .eq('id', orcamentoId)
              .eq('cliente_id', clienteSupabase.id)
              .maybeSingle();

            if (!existenteErro && existente) {
              const payload = req.body || {};
              const valorTotal = typeof payload.valorTotal === 'number'
                ? payload.valorTotal
                : Number(payload.precoCustoYaml ?? existente.valor_total ?? 0);

              const { data, error } = await supabase
                .from('orcamentos')
                .update({
                  fornecedor: payload.fornecedor ?? existente.fornecedor,
                  valor_total: valorTotal,
                  data_orcamento: payload.dataOrcamento || existente.data_orcamento,
                  componentes: payload.componentes ?? existente.componentes,
                  dados_extraidos: {
                    ...(existente.dados_extraidos || {}),
                    ...payload,
                    id: orcamentoId,
                    updatedAt: new Date().toISOString(),
                  },
                })
                .eq('id', orcamentoId)
                .eq('cliente_id', clienteSupabase.id)
                .select()
                .single();

              if (error) {
                console.error('Erro ao atualizar orçamento no Supabase:', error);
              } else if (data) {
                return res.status(200).json({
                  message: 'Orçamento atualizado com sucesso (Supabase)',
                  orcamento: mapSupabaseOrcamentoRow(data),
                  source: 'supabase',
                });
              }
            }
          }
        } catch (supabaseError) {
          console.error('Erro inesperado ao atualizar orçamento no Supabase:', supabaseError);
        }
      }

      if (isServerlessFs()) {
        return res.status(503).json({
          message: 'Orçamento não encontrado no Supabase; filesystem indisponível em produção.',
        });
      }

      const orcamentosData = await fs.readFile(orcamentosPath, 'utf8');
      let orcamentos = JSON.parse(orcamentosData);
      
      const index = orcamentos.findIndex((o: any) => o.id === orcamentoId);
      
      if (index === -1) {
        return res.status(404).json({ message: 'Orçamento não encontrado' });
      }

      // Atualizar orçamento mantendo ID e timestamps
      orcamentos[index] = {
        ...orcamentos[index],
        ...req.body,
        id: orcamentoId,
        updatedAt: new Date().toISOString()
      };

      await fs.writeFile(orcamentosPath, JSON.stringify(orcamentos, null, 2), 'utf8');

      res.status(200).json({ 
        message: 'Orçamento atualizado com sucesso',
        orcamento: orcamentos[index]
      });
    } catch (error) {
      console.error('Erro ao atualizar orçamento:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }
  
  else if (req.method === 'DELETE') {
    // Excluir orçamento
    try {
      if (supabaseReady && supabase) {
        try {
          const clienteSupabase = await resolveClienteSupabase(clienteId);

          if (clienteSupabase) {
            const { data, error } = await supabase
              .from('orcamentos')
              .delete()
              .eq('id', orcamentoId)
              .eq('cliente_id', clienteSupabase.id)
              .select();

            if (error) {
              console.error('Erro ao excluir orçamento no Supabase:', error);
            } else if (data && data.length > 0) {
              return res.status(200).json({
                message: 'Orçamento excluído com sucesso (Supabase)',
                source: 'supabase',
              });
            }
          }
        } catch (supabaseError) {
          console.error('Erro inesperado ao excluir orçamento no Supabase:', supabaseError);
        }
      }

      const orcamentosData = await fs.readFile(orcamentosPath, 'utf8');
      let orcamentos = JSON.parse(orcamentosData);
      
      const index = orcamentos.findIndex((o: any) => o.id === orcamentoId);
      
      if (index === -1) {
        return res.status(404).json({ message: 'Orçamento não encontrado' });
      }

      // Remover orçamento
      orcamentos.splice(index, 1);

      await fs.writeFile(orcamentosPath, JSON.stringify(orcamentos, null, 2), 'utf8');

      res.status(200).json({ message: 'Orçamento excluído com sucesso' });
    } catch (error) {
      console.error('Erro ao excluir orçamento:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }
  
  else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}