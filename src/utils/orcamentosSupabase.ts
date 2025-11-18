import type { Cliente } from '@/lib/supabase';
import { getAllClientes } from '@/lib/supabase';

export type OrcamentoStatus = 'pendente' | 'analisando' | 'aprovado' | 'rejeitado';

export interface OrcamentoArquivo {
  nome: string;
  url?: string;
  tipo: 'pdf' | 'jpg' | 'png' | 'outros';
}

export interface ApiOrcamento {
  id: string;
  fornecedor: string;
  dataOrcamento: string;
  status: OrcamentoStatus;
  valorTotal: number;
  componentes?: Record<string, any>;
  precoCustoYaml?: number;
  tipoMargem?: 'percentual' | 'valor';
  margem?: number;
  despesas?: Array<{ id: string; categoria: string; descricao: string; valor: number }>;
  observacoes?: string;
  arquivos?: OrcamentoArquivo[];
  createdAt: string;
  updatedAt: string;
  potencia?: number;
  origem?: string;
  pdespesaFixo?: number;
  pdespesaVariavel?: number;
  pdespesaTotal?: number;
}

export interface ClienteSupabaseRef {
  id: string;
  nome?: string;
  pasta: string;
  slug?: string;
  reference: Cliente;
}

export function sanitizeId(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 50);
}

export async function resolveClienteSupabase(clienteId: string): Promise<ClienteSupabaseRef | null> {
  const clientes = await getAllClientes();
  if (!clientes || clientes.length === 0) {
    return null;
  }

  const sanitizedId = sanitizeId(clienteId);

  const cliente = clientes.find((c: Cliente | (Cliente & { slug?: string; pasta?: string })) => {
    const slug = (c as any).slug as string | undefined;
    const pasta = (c as any).pasta as string | undefined;
    const matchesId = c.id === clienteId;
    const matchesNome = c.nome && sanitizeId(c.nome) === sanitizedId;
    const matchesSlug = slug && sanitizeId(slug) === sanitizedId;
    const matchesPasta = pasta && sanitizeId(pasta) === sanitizedId;
    const matchesRaw = sanitizeId(c.id) === sanitizedId;
    return matchesId || matchesNome || matchesSlug || matchesPasta || matchesRaw;
  });

  if (!cliente) {
    return null;
  }

  return {
    id: cliente.id,
    nome: cliente.nome,
    pasta: (cliente as any).pasta || sanitizeId(cliente.nome || clienteId),
    slug: (cliente as any).slug,
    reference: cliente,
  };
}

function normalizeArquivos(payload: any): OrcamentoArquivo[] {
  if (!payload) return [];

  if (Array.isArray(payload.arquivos)) {
    return payload.arquivos.map((arquivo: any) => ({
      nome: arquivo?.nome || arquivo?.fileName || 'arquivo',
      url: arquivo?.url,
      tipo: (arquivo?.tipo as OrcamentoArquivo['tipo']) || 'outros',
    }));
  }

  if (payload.arquivo) {
    return [{
      nome: payload.arquivo,
      url: payload.arquivoUrl,
      tipo: 'outros',
    }];
  }

  return [];
}

export function mapSupabaseOrcamentoRow(row: any): ApiOrcamento {
  const rawPayload = row?.dados_extraidos;
  const payload = typeof rawPayload === 'string' ? safeJsonParse(rawPayload) : (rawPayload || {});

  const createdAt = row?.created_at || payload.createdAt || new Date().toISOString();
  const dataOrcamento = row?.data_orcamento || payload.dataOrcamento || createdAt;
  const arquivos = normalizeArquivos(payload);

  const allowedStatus: OrcamentoStatus[] = ['pendente', 'analisando', 'aprovado', 'rejeitado'];
  const statusCandidate = (payload.status || row?.status || 'pendente') as string;
  const status = allowedStatus.includes(statusCandidate as OrcamentoStatus)
    ? (statusCandidate as OrcamentoStatus)
    : 'pendente';

  return {
    id: row?.id || payload.id,
    fornecedor: row?.fornecedor || payload.fornecedor || 'Fornecedor não informado',
    dataOrcamento,
    status,
    valorTotal: typeof row?.valor_total === 'number'
      ? row.valor_total
      : Number(payload.valorTotal ?? payload.precoCustoYaml ?? 0),
    componentes: row?.componentes || payload.componentes || {},
    precoCustoYaml: typeof payload.precoCustoYaml === 'number'
      ? payload.precoCustoYaml
      : Number(payload.precoCustoYaml ?? payload.valorTotal ?? 0),
    tipoMargem: payload.tipoMargem,
    margem: payload.margem,
    despesas: payload.despesas,
    observacoes: payload.observacoes || row?.observacoes,
    arquivos,
    createdAt,
    updatedAt: row?.updated_at || payload.updatedAt || createdAt,
    potencia: payload.potencia || payload.potenciaTotal,
    origem: payload.origem || row?.origem,
    pdespesaFixo: payload.pdespesaFixo,
    pdespesaVariavel: payload.pdespesaVariavel,
    pdespesaTotal: payload.pdespesaTotal,
  };
}

function safeJsonParse(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

