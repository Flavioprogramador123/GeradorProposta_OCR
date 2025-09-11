import { useState, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useDropzone } from 'react-dropzone';

interface ExtractedData {
  fornecedor?: string;
  valorTotal?: number;
  componentes?: {
    modulos?: {
      marca: string;
      modelo: string;
      potencia: number;
      quantidade: number;
      precoUnitario: number;
    };
    inversores?: {
      marca: string;
      modelo: string;
      potencia: number;
      quantidade: number;
      precoUnitario: number;
    };
    outros?: Array<{
      item: string;
      quantidade: number;
      precoUnitario: number;
    }>;
  };
}

export default function UploadOrcamento() {
  const router = useRouter();
  const { clienteId } = router.query;
  
  const [files, setFiles] = useState<File[]>([]);
  const [extracting, setExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [error, setError] = useState<string>('');

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const validFiles = acceptedFiles.filter(file => {
      const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      return validTypes.includes(file.type) && file.size <= 10 * 1024 * 1024; // 10MB limit
    });

    if (validFiles.length !== acceptedFiles.length) {
      setError('Alguns arquivos foram rejeitados. Apenas PDF, JPG e PNG até 10MB são aceitos.');
    } else {
      setError('');
    }

    setFiles(prev => [...prev, ...validFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png']
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: true
  });

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const extractData = async () => {
    if (files.length === 0) {
      setError('Adicione pelo menos um arquivo para extrair dados');
      return;
    }

    setExtracting(true);
    setError('');

    try {
      const formData = new FormData();
      files.forEach(file => formData.append('files', file));

      const response = await fetch('/api/admin/extract-data', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Erro na extração de dados');
      }

      const result = await response.json();
      setExtractedData(result.data);
    } catch (error) {
      console.error('Erro na extração:', error);
      setError('Erro ao extrair dados. Tente novamente ou use entrada manual.');
    } finally {
      setExtracting(false);
    }
  };

  const saveOrcamento = async () => {
    if (!extractedData) return;

    try {
      const orcamentoData = {
        fornecedor: extractedData.fornecedor || 'Fornecedor não identificado',
        valorTotal: extractedData.valorTotal || 0,
        componentes: extractedData.componentes || {},
        arquivos: files.map(file => ({
          nome: file.name,
          tipo: file.type.includes('pdf') ? 'pdf' : file.type.includes('image') ? 'jpg' : 'outros'
        })),
        dataOrcamento: new Date().toISOString(),
        status: 'pendente'
      };

      const response = await fetch(`/api/admin/orcamentos/${clienteId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orcamentoData),
      });

      if (response.ok) {
        alert('Orçamento salvo com sucesso!');
        router.push(`/admin/orcamentos/${clienteId}`);
      } else {
        throw new Error('Erro ao salvar orçamento');
      }
    } catch (error) {
      setError('Erro ao salvar orçamento. Tente novamente.');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <>
      <Head>
        <title>Upload de Orçamento | PIENG Solar</title>
        <meta name="description" content="Upload e extração automática de dados de orçamentos" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-orange-50">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
              <Link href={`/admin/orcamentos/${clienteId}`} legacyBehavior><a className="text-blue-600 hover:text-blue-800">
                ← Orçamentos
              </a></Link>
              <span className="text-gray-400">|</span>
              <h1 className="text-3xl font-bold text-gray-800">
                📎 Upload de Orçamento
              </h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Upload Area */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                  📁 Arquivos do Orçamento
                </h2>

                {/* Dropzone */}
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                    isDragActive 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
                  }`}
                >
                  <input {...getInputProps()} />
                  <div className="text-4xl mb-4">
                    {isDragActive ? '🎯' : '📎'}
                  </div>
                  {isDragActive ? (
                    <p className="text-blue-600 font-medium">
                      Solte os arquivos aqui...
                    </p>
                  ) : (
                    <div>
                      <p className="text-gray-600 font-medium mb-2">
                        Arraste arquivos aqui ou clique para selecionar
                      </p>
                      <p className="text-sm text-gray-500">
                        PDF, JPG, PNG (máx. 10MB cada)
                      </p>
                    </div>
                  )}
                </div>

                {error && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {error}
                  </div>
                )}

                {/* Lista de Arquivos */}
                {files.length > 0 && (
                  <div className="mt-6">
                    <h3 className="font-medium text-gray-800 mb-3">
                      Arquivos Selecionados ({files.length})
                    </h3>
                    <div className="space-y-2">
                      {files.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="text-lg">
                              {file.type.includes('pdf') ? '📄' : '🖼️'}
                            </div>
                            <div>
                              <div className="font-medium text-gray-800 text-sm">
                                {file.name}
                              </div>
                              <div className="text-xs text-gray-500">
                                {formatFileSize(file.size)}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => removeFile(index)}
                            className="text-red-600 hover:text-red-800 p-1"
                          >
                            ❌
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Botão Extrair */}
                <div className="mt-6">
                  <button
                    onClick={extractData}
                    disabled={files.length === 0 || extracting}
                    className="w-full py-3 px-6 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {extracting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Extraindo dados...
                      </>
                    ) : (
                      <>
                        🤖 Extrair Dados com Docling
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Dados Extraídos */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                  📊 Dados Extraídos
                </h2>

                {!extractedData ? (
                  <div className="text-center py-12">
                    <div className="text-4xl mb-4">🤖</div>
                    <p className="text-gray-600">
                      Faça upload dos arquivos e clique em "Extrair Dados" para ver as informações do orçamento
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    
                    {/* Informações Gerais */}
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h3 className="font-semibold text-gray-800 mb-3">Informações Gerais</h3>
                      <div className="grid grid-cols-1 gap-2">
                        <div>
                          <span className="text-sm text-gray-600">Fornecedor:</span>
                          <div className="font-medium">{extractedData.fornecedor || 'Não identificado'}</div>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">Valor Total:</span>
                          <div className="font-medium text-green-600">
                            R$ {extractedData.valorTotal?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Módulos */}
                    {extractedData.componentes?.modulos && (
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <h3 className="font-semibold text-gray-800 mb-3">🔋 Módulos Solares</h3>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-gray-600">Marca:</span>
                            <div className="font-medium">{extractedData.componentes.modulos.marca}</div>
                          </div>
                          <div>
                            <span className="text-gray-600">Modelo:</span>
                            <div className="font-medium">{extractedData.componentes.modulos.modelo}</div>
                          </div>
                          <div>
                            <span className="text-gray-600">Potência:</span>
                            <div className="font-medium">{extractedData.componentes.modulos.potencia}W</div>
                          </div>
                          <div>
                            <span className="text-gray-600">Quantidade:</span>
                            <div className="font-medium">{extractedData.componentes.modulos.quantidade} unidades</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Inversores */}
                    {extractedData.componentes?.inversores && (
                      <div className="p-4 bg-green-50 rounded-lg">
                        <h3 className="font-semibold text-gray-800 mb-3">⚡ Inversores</h3>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-gray-600">Marca:</span>
                            <div className="font-medium">{extractedData.componentes.inversores.marca}</div>
                          </div>
                          <div>
                            <span className="text-gray-600">Modelo:</span>
                            <div className="font-medium">{extractedData.componentes.inversores.modelo}</div>
                          </div>
                          <div>
                            <span className="text-gray-600">Potência:</span>
                            <div className="font-medium">{extractedData.componentes.inversores.potencia}kW</div>
                          </div>
                          <div>
                            <span className="text-gray-600">Quantidade:</span>
                            <div className="font-medium">{extractedData.componentes.inversores.quantidade} unidades</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Outros Componentes */}
                    {extractedData.componentes?.outros && extractedData.componentes.outros.length > 0 && (
                      <div className="p-4 bg-orange-50 rounded-lg">
                        <h3 className="font-semibold text-gray-800 mb-3">🔧 Outros Componentes</h3>
                        <div className="space-y-2">
                          {extractedData.componentes.outros.map((item, index) => (
                            <div key={index} className="flex justify-between text-sm">
                              <span>{item.item}</span>
                              <span className="font-medium">
                                {item.quantidade}x R$ {item.precoUnitario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Botão Salvar */}
                    <button
                      onClick={saveOrcamento}
                      className="w-full py-3 px-6 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
                    >
                      💾 Salvar Orçamento
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Nota sobre Docling */}
            <div className="mt-8 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-blue-800 mb-2">🤖 Sobre a Extração Automática</h3>
              <p className="text-blue-700 text-sm">
                Utilizamos o <strong>Docling</strong> para extração inteligente de dados de PDFs e imagens. 
                O sistema identifica automaticamente fornecedores, preços, componentes e especificações técnicas. 
                Caso algum dado não seja identificado corretamente, você pode editá-lo manualmente após salvar.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}