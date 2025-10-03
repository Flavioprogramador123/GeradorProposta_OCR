import { useState, useCallback } from 'react';

interface UploadInteligenteProps {
  onArquivosProcessados: (orcamentos: any[]) => void;
  onErro: (erro: string) => void;
}

interface ArquivoProcessado {
  nome: string;
  tipo: string;
  tamanho: number;
  orcamentos: any[];
}

export default function UploadInteligente({ onArquivosProcessados, onErro }: UploadInteligenteProps) {
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [processando, setProcessando] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [arquivosProcessados, setArquivosProcessados] = useState<ArquivoProcessado[]>([]);

  // Função para detectar tipo de arquivo
  const detectarTipoArquivo = (arquivo: File): string => {
    const extensao = arquivo.name.toLowerCase().split('.').pop();
    
    switch (extensao) {
      case 'pdf':
        return 'pdf';
      case 'yaml':
      case 'yml':
        return 'yaml';
      case 'json':
        return 'json';
      default:
        return 'desconhecido';
    }
  };

  // Função para processar PDF (simulação)
  const processarPDF = async (arquivo: File): Promise<any[]> => {
    // Simular processamento de PDF com OCR
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Retornar dados simulados baseados no nome do arquivo
    const nomeArquivo = arquivo.name.toLowerCase();
    
    if (nomeArquivo.includes('sollar')) {
      return [{
        distribuidor: 'Sollar Distribuidora',
        orcamento_id: `SOL-${Date.now()}`,
        arquivo_origem: arquivo.name,
        preco_custo: 12000,
        potencia_total_kwp: 8.5,
        inversores: [{
          marca: 'SMA',
          modelo: 'Sunny Boy 5.0',
          potencia_kw: 5.0,
          quantidade: 2
        }],
        modulos: [{
          marca: 'Jinko',
          modelo: 'JKM550M-72HL4-B',
          potencia_wp: 550,
          quantidade: 15,
          tipo: 'Monofacial'
        }]
      }];
    } else if (nomeArquivo.includes('belenergy')) {
      return [{
        distribuidor: 'BelEnergy',
        orcamento_id: `BEL-${Date.now()}`,
        arquivo_origem: arquivo.name,
        preco_custo: 13500,
        potencia_total_kwp: 9.2,
        inversores: [{
          marca: 'Fronius',
          modelo: 'Primo 5.0-1',
          potencia_kw: 5.0,
          quantidade: 2
        }],
        modulos: [{
          marca: 'Canadian Solar',
          modelo: 'CS3K-550MS',
          potencia_wp: 550,
          quantidade: 16,
          tipo: 'Monofacial'
        }]
      }];
    } else {
      return [{
        distribuidor: 'Distribuidor Genérico',
        orcamento_id: `GEN-${Date.now()}`,
        arquivo_origem: arquivo.name,
        preco_custo: 10000,
        potencia_total_kwp: 7.5,
        inversores: [{
          marca: 'Genérico',
          modelo: 'Inversor 5kW',
          potencia_kw: 5.0,
          quantidade: 1
        }],
        modulos: [{
          marca: 'Genérico',
          modelo: 'Módulo 500W',
          potencia_wp: 500,
          quantidade: 15,
          tipo: 'Monofacial'
        }]
      }];
    }
  };

  // Função para processar YAML
  const processarYAML = async (arquivo: File): Promise<any[]> => {
    const texto = await arquivo.text();
    
    try {
      // Simular parsing de YAML (em produção usaria uma biblioteca real)
      const dados = JSON.parse(texto); // Simulação
      
      // Extrair orçamentos do formato YAML
      const orcamentos: any[] = [];
      
      if (dados.consolidado_orcamentos_distribuidores) {
        Object.entries(dados.consolidado_orcamentos_distribuidores).forEach(([distribuidor, orcamentosDistribuidor]: [string, any]) => {
          orcamentosDistribuidor.forEach(({ orcamento }: any) => {
            orcamentos.push({
              distribuidor,
              orcamento_id: orcamento.orcamento_id || `YAML-${Date.now()}`,
              arquivo_origem: arquivo.name,
              preco_custo: orcamento.preco_total,
              potencia_total_kwp: orcamento.potencia_total_sistema ? 
                parseFloat(orcamento.potencia_total_sistema.replace(/[^\d.]/g, '')) : 0,
              inversores: orcamento.inversores || [],
              modulos: orcamento.modulos || []
            });
          });
        });
      }
      
      return orcamentos;
    } catch (error) {
      throw new Error(`Erro ao processar YAML: ${error}`);
    }
  };

  // Função para processar JSON
  const processarJSON = async (arquivo: File): Promise<any[]> => {
    const texto = await arquivo.text();
    
    try {
      const dados = JSON.parse(texto);
      
      // Extrair orçamentos do formato JSON
      if (Array.isArray(dados)) {
        return dados.map(orcamento => ({
          ...orcamento,
          arquivo_origem: arquivo.name
        }));
      } else if (dados.orcamentos) {
        return dados.orcamentos.map((orcamento: any) => ({
          ...orcamento,
          arquivo_origem: arquivo.name
        }));
      }
      
      return [dados];
    } catch (error) {
      throw new Error(`Erro ao processar JSON: ${error}`);
    }
  };

  // Função principal de processamento
  const processarArquivo = async (arquivo: File): Promise<any[]> => {
    const tipo = detectarTipoArquivo(arquivo);
    
    switch (tipo) {
      case 'pdf':
        return await processarPDF(arquivo);
      case 'yaml':
        return await processarYAML(arquivo);
      case 'json':
        return await processarJSON(arquivo);
      default:
        throw new Error(`Tipo de arquivo não suportado: ${tipo}`);
    }
  };

  // Função para processar todos os arquivos
  const processarArquivos = useCallback(async () => {
    if (arquivos.length === 0) return;

    setProcessando(true);
    setProgresso(0);
    setArquivosProcessados([]);

    const todosOrcamentos: any[] = [];
    const processados: ArquivoProcessado[] = [];

    try {
      for (let i = 0; i < arquivos.length; i++) {
        const arquivo = arquivos[i];
        setProgresso(((i + 1) / arquivos.length) * 100);

        try {
          const orcamentos = await processarArquivo(arquivo);
          
          processados.push({
            nome: arquivo.name,
            tipo: detectarTipoArquivo(arquivo),
            tamanho: arquivo.size,
            orcamentos
          });

          todosOrcamentos.push(...orcamentos);
        } catch (error) {
          console.error(`Erro ao processar ${arquivo.name}:`, error);
          onErro(`Erro ao processar ${arquivo.name}: ${error}`);
        }
      }

      setArquivosProcessados(processados);
      onArquivosProcessados(todosOrcamentos);
      
    } catch (error) {
      onErro(`Erro geral no processamento: ${error}`);
    } finally {
      setProcessando(false);
    }
  }, [arquivos, onArquivosProcessados, onErro]);

  // Função para remover arquivo
  const removerArquivo = (index: number) => {
    setArquivos(arquivos.filter((_, i) => i !== index));
  };

  // Função para limpar todos os arquivos
  const limparArquivos = () => {
    setArquivos([]);
    setArquivosProcessados([]);
    setProgresso(0);
  };

  return (
    <div className="space-y-4">
      {/* Área de Upload */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
        <input
          type="file"
          multiple
          accept=".pdf,.yaml,.yml,.json"
          onChange={(e) => setArquivos(Array.from(e.target.files || []))}
          className="hidden"
          id="upload-input"
        />
        <label htmlFor="upload-input" className="cursor-pointer">
          <div className="text-4xl mb-2">📁</div>
          <p className="text-lg font-medium text-gray-700">
            Clique para selecionar arquivos ou arraste aqui
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Suporta: PDF, YAML, JSON
          </p>
        </label>
      </div>

      {/* Lista de Arquivos */}
      {arquivos.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-medium text-gray-700">
              Arquivos selecionados ({arquivos.length})
            </h3>
            <button
              onClick={limparArquivos}
              className="text-sm text-red-600 hover:text-red-800"
            >
              Limpar todos
            </button>
          </div>
          
          <div className="space-y-2">
            {arquivos.map((arquivo, index) => (
              <div key={index} className="flex items-center justify-between bg-white p-3 rounded border">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">
                    {detectarTipoArquivo(arquivo) === 'pdf' ? '📄' : 
                     detectarTipoArquivo(arquivo) === 'yaml' ? '⚙️' : '📋'}
                  </span>
                  <div>
                    <p className="font-medium text-gray-700">{arquivo.name}</p>
                    <p className="text-sm text-gray-500">
                      {(arquivo.size / 1024 / 1024).toFixed(2)} MB • {detectarTipoArquivo(arquivo).toUpperCase()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => removerArquivo(index)}
                  className="text-red-600 hover:text-red-800"
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>

          {/* Botão de Processamento */}
          <div className="mt-4 text-center">
            <button
              onClick={processarArquivos}
              disabled={processando}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processando ? 'Processando...' : 'Processar Arquivos'}
            </button>
          </div>

          {/* Barra de Progresso */}
          {processando && (
            <div className="mt-4">
              <div className="bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progresso}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-600 mt-1 text-center">
                {Math.round(progresso)}% concluído
              </p>
            </div>
          )}
        </div>
      )}

      {/* Resultados do Processamento */}
      {arquivosProcessados.length > 0 && (
        <div className="bg-green-50 rounded-lg p-4">
          <h3 className="font-medium text-green-800 mb-3">
            ✅ Arquivos processados com sucesso
          </h3>
          <div className="space-y-2">
            {arquivosProcessados.map((arquivo, index) => (
              <div key={index} className="bg-white p-3 rounded border">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-gray-700">{arquivo.nome}</p>
                    <p className="text-sm text-gray-500">
                      {arquivo.orcamentos.length} orçamento(s) encontrado(s)
                    </p>
                  </div>
                  <span className="text-green-600">✅</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
