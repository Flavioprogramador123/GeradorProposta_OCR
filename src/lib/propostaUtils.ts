import { SistemaData, SystemComparisonData } from './types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const formatCurrency = (value: number | null | undefined): string => {
  if (value === null || value === undefined || isNaN(value)) {
    return 'R$ 0,00';
  }
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
};

export const formatDate = (date: Date): string => {
  return format(date, 'dd/MM/yyyy', { locale: ptBR });
};

export const generateSlug = (clienteNome: string, cidade: string): string => {
  const nome = clienteNome.toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]/g, '');
  
  const cidadeSlug = cidade.toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]/g, '');
  
  const data = format(new Date(), 'yyyy-MM-dd');
  
  return `${nome}-${cidadeSlug}-${data}`;
};

export const convertSystemsToTableData = (sistemas: SistemaData[]): SystemComparisonData[] => {
  return sistemas.map(sistema => ({
    nome: sistema.titulo,
    potencia: sistema.potencia,
    pix: formatCurrency(sistema.precoPixDecimal),
    parcela12x: sistema.preco12x,
    parcela18x: sistema.preco18x,
    geracao: sistema.geracao,
    payback: sistema.payback,
    tir: sistema.tir,
    isRecommended: sistema.isRecommended
  }));
};

export const findBestSystem = (sistemas: SistemaData[]): SistemaData | null => {
  if (!sistemas || sistemas.length === 0) return null;
  
  return sistemas.find(sistema => sistema.isRecommended) || 
         sistemas.reduce((best, current) => {
           const bestPayback = parseFloat(best.payback.replace(/[^\d,]/g, '').replace(',', '.'));
           const currentPayback = parseFloat(current.payback.replace(/[^\d,]/g, '').replace(',', '.'));
           return currentPayback < bestPayback ? current : best;
         });
};

/** Sistema com maior geração mensal (kWh) — usado na projeção sazonal. */
export const findSistemaMaiorGeracao = (sistemas: SistemaData[]): SistemaData | null => {
  if (!sistemas || sistemas.length === 0) return null;

  const parseGeracao = (s: SistemaData): number => {
    const g = (s as { geracaoMensal?: number }).geracaoMensal;
    if (typeof g === 'number' && Number.isFinite(g) && g > 0) return g;
    const n = parseFloat(String(s.geracao || '').replace(/[^\d,.-]/g, '').replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  };

  const parsePot = (s: SistemaData): number => {
    const p = (s as { potTotal?: number }).potTotal;
    if (typeof p === 'number' && Number.isFinite(p) && p > 0) return p;
    const n = parseFloat(String(s.potencia || '').replace(/[^\d,.-]/g, '').replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  };

  return sistemas.reduce((best, current) => {
    const gBest = parseGeracao(best);
    const gCur = parseGeracao(current);
    if (gCur !== gBest) return gCur > gBest ? current : best;
    return parsePot(current) > parsePot(best) ? current : best;
  });
};

export const calculateInsights = (sistemas: SistemaData[]): {
  paybackMin: string;
  paybackMax: string;
  geracaoMax: string;
  tirMax: string;
} => {
  if (!sistemas || sistemas.length === 0) {
    return {
      paybackMin: '0',
      paybackMax: '0', 
      geracaoMax: '0',
      tirMax: '0'
    };
  }

  const paybacks = sistemas.map(s => {
    try {
      const paybackStr = s.payback || '0';
      const cleanPayback = paybackStr.replace(/[^\d,]/g, '').replace(',', '.');
      return parseFloat(cleanPayback) || 0;
    } catch (error) {
      console.error('Erro ao processar payback:', s.payback, error);
      return 0;
    }
  });
  
  const geracoes = sistemas.map(s => {
    try {
      const geracaoStr = s.geracao || '0';
      const cleanGeracao = geracaoStr.replace(/[^\d,]/g, '').replace(',', '.');
      return parseFloat(cleanGeracao) || 0;
    } catch (error) {
      console.error('Erro ao processar geração:', s.geracao, error);
      return 0;
    }
  });
  
  const tirs = sistemas.map(s => {
    try {
      const tirStr = s.tir || '0';
      const cleanTir = tirStr.replace(/[^\d,]/g, '').replace(',', '.');
      return parseFloat(cleanTir) || 0;
    } catch (error) {
      console.error('Erro ao processar TIR:', s.tir, error);
      return 0;
    }
  });

  return {
    paybackMin: Math.min(...paybacks).toFixed(1).replace('.', ','),
    paybackMax: Math.max(...paybacks).toFixed(1).replace('.', ','),
    geracaoMax: Math.max(...geracoes).toFixed(0),
    tirMax: Math.max(...tirs).toFixed(1).replace('.', ',') + '%'
  };
};