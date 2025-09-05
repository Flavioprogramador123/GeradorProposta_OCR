import { SistemaData, SystemComparisonData } from './types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const formatCurrency = (value: number): string => {
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
  return sistemas.find(sistema => sistema.isRecommended) || 
         sistemas.reduce((best, current) => {
           const bestPayback = parseFloat(best.payback.replace(/[^\d,]/g, '').replace(',', '.'));
           const currentPayback = parseFloat(current.payback.replace(/[^\d,]/g, '').replace(',', '.'));
           return currentPayback < bestPayback ? current : best;
         });
};

export const calculateInsights = (sistemas: SistemaData[]): {
  paybackMin: string;
  paybackMax: string;
  geracaoMax: string;
  tirMax: string;
} => {
  const paybacks = sistemas.map(s => 
    parseFloat(s.payback.replace(/[^\d,]/g, '').replace(',', '.'))
  );
  
  const geracoes = sistemas.map(s => 
    parseFloat(s.geracao.replace(/[^\d,]/g, '').replace(',', '.'))
  );
  
  const tirs = sistemas.map(s => 
    parseFloat(s.tir.replace(/[^\d,]/g, '').replace(',', '.'))
  );

  return {
    paybackMin: Math.min(...paybacks).toFixed(1).replace('.', ','),
    paybackMax: Math.max(...paybacks).toFixed(1).replace('.', ','),
    geracaoMax: Math.max(...geracoes).toFixed(0),
    tirMax: Math.max(...tirs).toFixed(1).replace('.', ',') + '%'
  };
};