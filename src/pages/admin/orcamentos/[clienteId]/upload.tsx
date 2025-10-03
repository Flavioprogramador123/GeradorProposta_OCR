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
  const [allOrcamentos, setAllOrcamentos] = useState<any[]>([]);
  const [selectedOrcamento, setSelectedOrcamento] = useState<number>(0);
  const [error, setError] = useState<string>('');
  const [yamlText, setYamlText] = useState<string>('');
  const [showYamlEditor, setShowYamlEditor] = useState(false);
  const [showPdespesaModal, setShowPdespesaModal] = useState(false);
  const [pdespesaFixo, setPdespesaFixo] = useState<number>(3000);
  const [pdespesaVariavel, setPdespesaVariavel] = useState<number>(22);
  const [orcamentosParaSalvar, setOrcamentosParaSalvar] = useState<any[]>([]);

  // Template YAML padrão
  const defaultYamlTemplate = `soollar_distribuidora:
    - orcamento:
        arquivo_origem: "SOLAR10.pdf"
        preco_total: 9566.25
        inversores:
          - quantidade: 3
            marca: "SAJ"
            potencia_unitaria: "2,25KW"
        modulos:
          - quantidade: 12
            marca: "TSUN"
            potencia_unitaria: "700W"

    - orcamento:
        arquivo_origem: "SOLAR11.pdf"
        preco_total: 8200.50
        inversores:
          - quantidade: 2
            marca: "WEG"
            potencia_unitaria: "3KW"
        modulos:
          - quantidade: 16
            marca: "CANADIAN"
            potencia_unitaria: "545W"

    - orcamento:
        arquivo_origem: "SOLAR12.pdf"
        preco_total: 12300.75
        inversores:
          - quantidade: 1
            marca: "GROWATT"
            potencia_unitaria: "8KW"
        modulos:
          - quantidade: 20
            marca: "JINKO"
            potencia_unitaria: "615W"`;

  const loadYamlTemplate = () => {
    setYamlText(defaultYamlTemplate);
    setShowYamlEditor(true);
  };

  const processYamlData = () => {
    try {
      const lines = yamlText.split('\n');
      const orcamentos: any[] = [];
      let currentOrcamento: any = {};
      let currentDistribuidora = '';
      let inOrcamento = false;
      let inModulos = false;
      let inInversores = false;

      lines.forEach(line => {
        const trimmed = line.trim();
        const indentLevel = line.length - line.trimStart().length;

        // Detectar distribuidora (nível 0, termina com :, pode aparecer antes de "- orcamento:")
        if (indentLevel === 0 && trimmed.endsWith(':') && !trimmed.startsWith('-')) {
          const nome = trimmed.replace(':', '').trim();
          // Lista de distribuidoras conhecidas
          const distribuidoras = ['soollar_distribuidora', 'belenergy', 'fortlev', 'belsky', 'solfacil', 'ecosolys'];
          if (distribuidoras.some(d => nome.toLowerCase().includes(d.toLowerCase())) || nome.length > 3) {
            currentDistribuidora = nome;
          }
          return;
        }

        // Detectar início de orçamento
        if (trimmed.startsWith('- orcamento:')) {
          if (inOrcamento && Object.keys(currentOrcamento).length > 0) {
            // Salvar orçamento anterior se existir
            orcamentos.push({...currentOrcamento, distribuidora: currentDistribuidora});
          }
          currentOrcamento = {};
          inOrcamento = true;
          inModulos = false;
          inInversores = false;
          return;
        }

        if (!inOrcamento) return;

        // Extrair dados do orçamento
        if (trimmed.includes('orcamento_id:')) {
          const id = trimmed.match(/["']?([^"']+)["']?$/)?.[1];
          currentOrcamento.orcamentoId = id;
        }

        if (trimmed.includes('arquivo_origem:')) {
          const arquivo = trimmed.match(/["']([^"']+)["']/)?.[1];
          currentOrcamento.arquivo = arquivo;
        }

        if (trimmed.includes('preco_custo:')) {
          const valor = trimmed.match(/[\d.,]+/)?.[0]?.replace(',', '.');
          currentOrcamento.precoCusto = parseFloat(valor || '0');
          currentOrcamento.valorTotal = parseFloat(valor || '0'); // Manter compatibilidade
        }

        // Manter compatibilidade com preco_total antigo
        if (trimmed.includes('preco_total:')) {
          const valor = trimmed.match(/[\d.,]+/)?.[0]?.replace(',', '.');
          currentOrcamento.precoCusto = parseFloat(valor || '0');
          currentOrcamento.valorTotal = parseFloat(valor || '0');
        }

        if (trimmed.includes('potencia_total_sistema:')) {
          const potencia = trimmed.match(/["']?([^"']+)["']?$/)?.[1];
          currentOrcamento.potenciaTotal = potencia;
        }

        // Detectar seções
        if (trimmed === 'modulos:') {
          inModulos = true;
          inInversores = false;
          currentOrcamento.modulos = {};
          return;
        }

        if (trimmed === 'inversores:') {
          inInversores = true;
          inModulos = false;
          currentOrcamento.inversores = {};
          return;
        }

        // Extrair dados de módulos
        if (inModulos && trimmed.includes('quantidade:')) {
          const qty = trimmed.match(/\d+/)?.[0];
          currentOrcamento.modulos.quantidade = parseInt(qty || '0');
        }

        if (inModulos && trimmed.includes('marca:')) {
          const marca = trimmed.match(/["']([^"']+)["']/)?.[1];
          currentOrcamento.modulos.marca = marca;
        }

        if (inModulos && trimmed.includes('potencia_unitaria:')) {
          const potencia = trimmed.match(/["']?([^"']+)["']?$/)?.[1];
          currentOrcamento.modulos.potencia = potencia;
        }

        // Extrair dados de inversores
        if (inInversores && trimmed.includes('quantidade:')) {
          const qty = trimmed.match(/\d+/)?.[0];
          currentOrcamento.inversores.quantidade = parseInt(qty || '0');
        }

        if (inInversores && trimmed.includes('marca:')) {
          const marca = trimmed.match(/["']([^"']+)["']/)?.[1];
          currentOrcamento.inversores.marca = marca;
        }

        if (inInversores && trimmed.includes('potencia_unitaria:')) {
          const potencia = trimmed.match(/["']?([^"']+)["']?$/)?.[1];
          currentOrcamento.inversores.potencia = potencia;
        }
      });

      // Adicionar último orçamento se existir
      if (inOrcamento && Object.keys(currentOrcamento).length > 0) {
        orcamentos.push({...currentOrcamento, distribuidora: currentDistribuidora});
      }

      if (orcamentos.length > 0) {
        // Armazenar todos os orçamentos
        setAllOrcamentos(orcamentos);
        setSelectedOrcamento(0);

        // Função para processar um orçamento específico
        const processarOrcamento = (orc: any) => {
          const potenciaModulo = orc.modulos?.potencia ?
            parseInt(orc.modulos.potencia.match(/\d+/)?.[0] || '0') : 500;

          const potenciaInversor = orc.inversores?.potencia ?
            parseFloat(orc.inversores.potencia.match(/[\d.,]+/)?.[0]?.replace(',', '.') || '0') : 2.5;

          return {
            fornecedor: orc.distribuidora || 'Distribuidora não identificada',
            valorTotal: orc.valorTotal || 0,
            orcamentoId: orc.orcamentoId,
            arquivo: orc.arquivo,
            potenciaTotal: orc.potenciaTotal,
            componentes: {
              modulos: {
                marca: orc.modulos?.marca || 'Marca não identificada',
                modelo: orc.modulos?.potencia || 'Modelo não identificado',
                potencia: potenciaModulo,
                quantidade: orc.modulos?.quantidade || 1,
                precoUnitario: orc.valorTotal ?
                  Math.round((orc.valorTotal * 0.6) / (orc.modulos?.quantidade || 1)) : 400
              },
              inversores: {
                marca: orc.inversores?.marca || 'Marca não identificada',
                modelo: orc.inversores?.potencia || 'Modelo não identificado',
                potencia: potenciaInversor,
                quantidade: orc.inversores?.quantidade || 1,
                precoUnitario: orc.valorTotal ?
                  Math.round((orc.valorTotal * 0.3) / (orc.inversores?.quantidade || 1)) : 1500
              }
            }
          };
        };

        // Mostrar o primeiro orçamento
        setExtractedData(processarOrcamento(orcamentos[0]));
        setError('');

        // Preparar orçamentos para salvar e abrir modal
        setOrcamentosParaSalvar(orcamentos);

        // Mostrar resumo detalhado
        const resumo = orcamentos.map((orc, i) =>
          `${i+1}. ${orc.distribuidora || 'Sem distribuidora'} - R$ ${(orc.precoCusto || orc.valorTotal)?.toLocaleString('pt-BR') || '0,00'} (${orc.arquivo || 'Sem arquivo'})`
        ).join('\n');

        alert(`✅ ${orcamentos.length} orçamento(s) processado(s):\n\n${resumo}\n\n🔄 Use o seletor abaixo para navegar entre os orçamentos.`);

        // Abrir modal para definir Pdespesa
        setShowPdespesaModal(true);
      } else {
        setError('Nenhum orçamento válido encontrado no YAML.');
      }

      // Criar função melhorada para trocar orçamento
      (window as any).changeSelectedOrcamento = (index: number) => {
        if (allOrcamentos[index]) {
          const orc = allOrcamentos[index];
          const potenciaModulo = orc.modulos?.potencia ?
            parseInt(orc.modulos.potencia.match(/\d+/)?.[0] || '0') : 500;

          const potenciaInversor = orc.inversores?.potencia ?
            parseFloat(orc.inversores.potencia.match(/[\d.,]+/)?.[0]?.replace(',', '.') || '0') : 2.5;

          const newData = {
            fornecedor: orc.distribuidora || 'Distribuidora não identificada',
            valorTotal: orc.valorTotal || orc.precoCusto || 0,
            precoCustoYaml: orc.precoCusto || orc.valorTotal || 0,  // Preço de custo do YAML
            orcamentoId: orc.orcamentoId,
            arquivo: orc.arquivo,
            potenciaTotal: orc.potenciaTotal,
            componentes: {
              modulos: {
                marca: orc.modulos?.marca || 'Marca não identificada',
                modelo: orc.modulos?.potencia || 'Modelo não identificado',
                potencia: potenciaModulo,
                quantidade: orc.modulos?.quantidade || 1,
                precoUnitario: (orc.precoCusto || orc.valorTotal) ?
                  Math.round(((orc.precoCusto || orc.valorTotal) * 0.6) / (orc.modulos?.quantidade || 1)) : 400
              },
              inversores: {
                marca: orc.inversores?.marca || 'Marca não identificada',
                modelo: orc.inversores?.potencia || 'Modelo não identificado',
                potencia: potenciaInversor,
                quantidade: orc.inversores?.quantidade || 1,
                precoUnitario: (orc.precoCusto || orc.valorTotal) ?
                  Math.round(((orc.precoCusto || orc.valorTotal) * 0.3) / (orc.inversores?.quantidade || 1)) : 1500
              }
            }
          };

          setExtractedData(newData);
          setSelectedOrcamento(index);
        }
      };
    } catch (error) {
      console.error('Erro no YAML:', error);
      setError('Erro ao processar YAML. Dados parciais podem estar incorretos, mas o sistema tentou extrair o máximo possível.');
    }
  };

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

  const saveOrcamentosComPdespesa = async () => {
    if (orcamentosParaSalvar.length === 0) return;

    try {
      let salvosComSucesso = 0;
      const errosDetalhados = [];

      for (let i = 0; i < orcamentosParaSalvar.length; i++) {
        const orc = orcamentosParaSalvar[i];
        const potenciaModulo = orc.modulos?.potencia ?
          parseInt(orc.modulos.potencia.match(/\d+/)?.[0] || '0') : 500;
        const potenciaInversor = orc.inversores?.potencia ?
          parseFloat(orc.inversores.potencia.match(/[\d.,]+/)?.[0]?.replace(',', '.') || '0') : 2.5;

        // 🔧 NOVO: Calcular Pdespesa usando modelo Fixo + Variável
        const pcusto = orc.precoCusto || orc.valorTotal || 0;
        const pdespesaTotal = pdespesaFixo + (pcusto * pdespesaVariavel / 100);
        const valorTotal = pcusto + pdespesaTotal;

        const orcamentoData = {
          fornecedor: orc.distribuidora || `Distribuidora ${i + 1}`,
          valorTotal: valorTotal, // Total = P.Custo + Pdespesa
          precoCustoYaml: pcusto,  // Custo do YAML
          pdespesaFixo: pdespesaFixo,  // Componente fixo
          pdespesaVariavel: pdespesaVariavel,  // Componente variável (%)
          pdespesaTotal: pdespesaTotal,  // Total da Pdespesa
          orcamentoId: orc.orcamentoId || `YAML_${Date.now()}_${i + 1}`,
          arquivo: orc.arquivo || `Orçamento ${i + 1}`,
          potenciaTotal: orc.potenciaTotal || `${potenciaModulo * (orc.modulos?.quantidade || 1)}W`,
          componentes: {
            modulos: {
              marca: orc.modulos?.marca || 'Marca não identificada',
              modelo: orc.modulos?.potencia || 'Modelo não identificado',
              potencia: potenciaModulo,
              quantidade: orc.modulos?.quantidade || 1,
              precoUnitario: pcusto ?
                Math.round((pcusto * 0.6) / (orc.modulos?.quantidade || 1)) : 400,
              precoCusto: pcusto ?
                Math.round((pcusto * 0.6) / (orc.modulos?.quantidade || 1)) : 400
            },
            inversores: {
              marca: orc.inversores?.marca || 'Marca não identificada',
              modelo: orc.inversores?.potencia || 'Modelo não identificado',
              potencia: potenciaInversor,
              quantidade: orc.inversores?.quantidade || 1,
              precoUnitario: pcusto ?
                Math.round((pcusto * 0.3) / (orc.inversores?.quantidade || 1)) : 1500,
              precoCusto: pcusto ?
                Math.round((pcusto * 0.3) / (orc.inversores?.quantidade || 1)) : 1500
            }
          },
          arquivos: [
            { nome: orc.arquivo || `YAML_Orcamento_${i + 1}.yaml`, tipo: 'outros' as const }
          ],
          dataOrcamento: new Date().toISOString(),
          status: 'pendente' as const,
          origem: 'yaml_multiplo',
          indice: i + 1
        };

        console.log(`💾 Salvando orçamento ${i + 1}:`, orcamentoData);

        try {
          const response = await fetch(`/api/admin/orcamentos/${clienteId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orcamentoData),
          });

          if (response.ok) {
            salvosComSucesso++;
            console.log(`✅ Orçamento ${i + 1} salvo com sucesso`);
          } else {
            const error = await response.text();
            errosDetalhados.push(`Orçamento ${i + 1}: ${error}`);
            console.error(`❌ Erro ao salvar orçamento ${i + 1}:`, error);
          }
        } catch (error) {
          errosDetalhados.push(`Orçamento ${i + 1}: ${error}`);
          console.error(`❌ Erro de rede ao salvar orçamento ${i + 1}:`, error);
        }
      }

      const pdespesaTexto = `Pdespesa: R$ ${pdespesaFixo.toFixed(2)} + ${pdespesaVariavel}%`;

      const mensagem = errosDetalhados.length > 0 ?
        `✅ ${salvosComSucesso}/${orcamentosParaSalvar.length} orçamentos salvos com sucesso!\n\n❌ Erros encontrados:\n${errosDetalhados.join('\n')}` :
        `✅ ${salvosComSucesso}/${orcamentosParaSalvar.length} orçamentos salvos com sucesso! ${pdespesaTexto} aplicado a todos.`;

      alert(mensagem);
      setShowPdespesaModal(false);
      router.push(`/admin/orcamentos/${clienteId}`);
    } catch (error) {
      setError('Erro ao salvar orçamentos. Tente novamente.');
    }
  };

  const saveOrcamento = async () => {
    if (!extractedData) return;

    try {
      // Se temos múltiplos orçamentos, usar o novo fluxo com Pdespesa
      if (allOrcamentos.length > 1) {
        // Os orçamentos já foram preparados, apenas abrir modal
        setShowPdespesaModal(true);
        return;
      }

      // Orçamento único - usar fluxo original
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
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-800">
                    📊 Dados Extraídos
                  </h2>
                  {allOrcamentos.length > 1 && (
                    <select
                      title="Selecionar orçamento para visualizar"
                      value={selectedOrcamento}
                      onChange={(e) => {
                        const index = parseInt(e.target.value);
                        setSelectedOrcamento(index);

                        // Atualizar dados imediatamente
                        const orc = allOrcamentos[index];
                        if (orc) {
                          const potenciaModulo = orc.modulos?.potencia ?
                            parseInt(orc.modulos.potencia.match(/\d+/)?.[0] || '0') : 500;

                          const potenciaInversor = orc.inversores?.potencia ?
                            parseFloat(orc.inversores.potencia.match(/[\d.,]+/)?.[0]?.replace(',', '.') || '0') : 2.5;

                          setExtractedData({
                            fornecedor: orc.distribuidora || 'Distribuidora não identificada',
                            valorTotal: orc.valorTotal || 0,
                            componentes: {
                              modulos: {
                                marca: orc.modulos?.marca || 'Marca não identificada',
                                modelo: orc.modulos?.potencia || 'Modelo não identificado',
                                potencia: potenciaModulo,
                                quantidade: orc.modulos?.quantidade || 1,
                                precoUnitario: orc.valorTotal ?
                                  Math.round((orc.valorTotal * 0.6) / (orc.modulos?.quantidade || 1)) : 400
                              },
                              inversores: {
                                marca: orc.inversores?.marca || 'Marca não identificada',
                                modelo: orc.inversores?.potencia || 'Modelo não identificado',
                                potencia: potenciaInversor,
                                quantidade: orc.inversores?.quantidade || 1,
                                precoUnitario: orc.valorTotal ?
                                  Math.round((orc.valorTotal * 0.3) / (orc.inversores?.quantidade || 1)) : 1500
                              }
                            }
                          });
                        }
                      }}
                      className="px-3 py-1 border border-gray-300 rounded text-sm"
                    >
                      {allOrcamentos.map((orc, index) => (
                        <option key={index} value={index}>
                          {index + 1}. {orc.distribuidora || 'Sem distribuidora'} - R$ {(orc.precoCusto || orc.valorTotal)?.toLocaleString('pt-BR') || '0,00'}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

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
                        {allOrcamentos[selectedOrcamento]?.orcamentoId && (
                          <div>
                            <span className="text-sm text-gray-600">ID Orçamento:</span>
                            <div className="font-medium text-blue-600">{allOrcamentos[selectedOrcamento].orcamentoId}</div>
                          </div>
                        )}
                        {allOrcamentos[selectedOrcamento]?.arquivo && (
                          <div>
                            <span className="text-sm text-gray-600">Arquivo:</span>
                            <div className="font-medium text-purple-600">{allOrcamentos[selectedOrcamento].arquivo}</div>
                          </div>
                        )}
                        {allOrcamentos[selectedOrcamento]?.potenciaTotal && (
                          <div>
                            <span className="text-sm text-gray-600">Potência Total:</span>
                            <div className="font-medium text-orange-600">{allOrcamentos[selectedOrcamento].potenciaTotal}</div>
                          </div>
                        )}
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

            {/* Editor YAML Manual */}
            <div className="mt-8 bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-800">
                  📝 Entrada Manual YAML
                </h2>
                <button
                  onClick={() => setShowYamlEditor(!showYamlEditor)}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                >
                  {showYamlEditor ? '🔼 Ocultar' : '🔽 Mostrar Editor'}
                </button>
              </div>

              <p className="text-gray-600 text-sm mb-4">
                Se a extração automática não funcionou, você pode inserir os dados manualmente usando formato YAML.
                Suporte para até 5 orçamentos simultâneos.
              </p>

              {!showYamlEditor && (
                <div className="text-center py-8">
                  <button
                    onClick={loadYamlTemplate}
                    className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2 mx-auto"
                  >
                    📋 Carregar Template YAML
                  </button>
                </div>
              )}

              {showYamlEditor && (
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <button
                      onClick={loadYamlTemplate}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                    >
                      📋 Template Padrão
                    </button>
                    <button
                      onClick={() => setYamlText('')}
                      className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
                    >
                      🗑️ Limpar
                    </button>
                    <button
                      onClick={processYamlData}
                      disabled={!yamlText.trim()}
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 text-sm"
                    >
                      ⚡ Processar YAML
                    </button>
                  </div>

                  <textarea
                    value={yamlText}
                    onChange={(e) => setYamlText(e.target.value)}
                    placeholder="Cole aqui o YAML dos orçamentos ou clique em 'Template Padrão'"
                    className="w-full h-80 p-4 border border-gray-300 rounded-lg font-mono text-sm resize-y focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />

                  <div className="text-xs text-gray-500">
                    💡 <strong>Dica:</strong> Você pode adicionar até 5 orçamentos na mesma estrutura.
                    Apenas duplique o bloco "- orcamento:" com novos dados.
                  </div>
                </div>
              )}
            </div>

            {/* Nota sobre o Sistema */}
            <div className="mt-8 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-blue-800 mb-2">🚀 Sistema de Extração Híbrido</h3>
              <p className="text-blue-700 text-sm">
                <strong>🤖 Extração Automática:</strong> Utilizamos IA (Gemini/OpenAI) para extração inteligente de dados de PDFs e imagens.<br/>
                <strong>📝 Entrada Manual YAML:</strong> Para casos onde a IA não funciona bem, você pode inserir dados manualmente usando formato YAML.<br/>
                <strong>⚡ Suporte Múltiplo:</strong> Processe até 5 orçamentos de uma vez usando o editor YAML.<br/>
                <strong>✅ Validação:</strong> Todos os dados são validados antes de salvar no sistema.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Pdespesa */}
      {showPdespesaModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-8 max-w-lg w-full mx-4">
            <div className="text-center mb-6">
              <div className="text-4xl mb-4">💰</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Configurar Pdespesa do Cliente
              </h2>
              <p className="text-gray-600 text-sm">
                Defina a Pdespesa com componente fixo + variável aplicado aos orçamentos
              </p>
            </div>

            <div className="space-y-6">
              {/* Resumo dos orçamentos */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="font-semibold text-blue-800 mb-2">
                  📋 Orçamentos a serem salvos
                </h3>
                <div className="text-sm text-blue-700">
                  {orcamentosParaSalvar.map((orc, i) => (
                    <div key={i} className="flex justify-between py-1">
                      <span>{i+1}. {orc.distribuidora || 'Sem distribuidora'}</span>
                      <span className="font-medium">
                        R$ {(orc.precoCusto || orc.valorTotal)?.toLocaleString('pt-BR') || '0,00'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Configuração Pdespesa */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-gray-800 mb-3">💰 Configuração de Pdespesa</h4>
                <p className="text-sm text-gray-600 mb-4">Configure uma única Pdespesa com componente fixo + variável aplicado a todos os orçamentos</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      💵 Componente Fixo (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={pdespesaFixo}
                      onChange={(e) => setPdespesaFixo(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Ex: 3000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      📊 Componente Variável (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={pdespesaVariavel}
                      onChange={(e) => setPdespesaVariavel(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Ex: 22"
                    />
                  </div>
                </div>

                <div className="mt-3 p-3 bg-blue-50 rounded-lg text-sm">
                  <strong>📊 Fórmula:</strong> Pdespesa Total = Fixo + (Variável% × P.Custo)
                  <br />
                  <strong>📋 Exemplo:</strong> R$ {pdespesaFixo.toFixed(2)} + ({pdespesaVariavel}% × R$ 6.000) = R$ {(pdespesaFixo + (6000 * pdespesaVariavel / 100)).toFixed(2)}
                </div>
              </div>

              {/* Preview do cálculo */}
              <div className="bg-green-50 rounded-lg p-4">
                <h4 className="font-semibold text-green-800 mb-2">
                  📊 Preview dos Totais
                </h4>
                <div className="space-y-2 text-sm">
                  {orcamentosParaSalvar.map((orc, i) => {
                    const custo = orc.precoCusto || orc.valorTotal || 0;
                    const pdespesaCalculada = pdespesaFixo + (custo * pdespesaVariavel / 100);
                    const total = custo + pdespesaCalculada;
                    return (
                      <div key={i} className="flex justify-between text-green-700">
                        <span>#{i+1}:</span>
                        <span>
                          R$ {custo.toFixed(2)} + R$ {pdespesaCalculada.toFixed(2)} =
                          <strong className="ml-1">R$ {total.toFixed(2)}</strong>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Botões */}
            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setShowPdespesaModal(false)}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                ❌ Cancelar
              </button>
              <button
                onClick={saveOrcamentosComPdespesa}
                className="flex-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
              >
                💾 Salvar com Pdespesa: R$ {pdespesaFixo.toFixed(2)} + {pdespesaVariavel}%
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}