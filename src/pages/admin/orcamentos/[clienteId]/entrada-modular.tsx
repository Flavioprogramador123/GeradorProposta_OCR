import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import ExtratorManual from '../../../../components/ExtratorManual';

interface OrcamentoData {
  id: string;
  distribuidor: string;
  orcamento_id?: string;
  arquivo_origem?: string;
  preco_custo: number;
  preco_despesa: number;
  preco_total: number;
  potencia_total_kwp: number;
  inversores: Inversor[];
  modulos: Modulo[];
  outros_componentes: string[];
}

interface Inversor {
  id: string;
  marca: string;
  modelo: string;
  potencia_kw: number;
  quantidade: number;
}

interface Modulo {
  id: string;
  marca: string;
  modelo: string;
  potencia_wp: number;
  quantidade: number;
  tipo: string;
}

interface ClienteData {
  nome: string;
  cidade: string;
  estado: string;
  consumo_mensal_kwh: number;
  tipo_imovel: string;
  hsp_local: number;
  tarifa_kwh: number;
}

interface ConfiguracaoPrecos {
  preco_despesa_global: number;
  usar_percentual: boolean;
  percentual_despesa: number;
  ajustes_por_distribuidor: { [key: string]: { preco_despesa: number; motivo: string } };
  ajustes_por_orcamento: { [key: string]: { preco_despesa: number; motivo: string } };
}

export default function EntradaModular() {
  const router = useRouter();
  const { clienteId } = router.query;

  // Estados principais
  const [modoEntrada, setModoEntrada] = useState<'upload' | 'manual' | 'hibrido'>('hibrido');
  const [orcamentos, setOrcamentos] = useState<OrcamentoData[]>([]);
  const [clienteData, setClienteData] = useState<ClienteData>({
    nome: '',
    cidade: '',
    estado: '',
    consumo_mensal_kwh: 0,
    tipo_imovel: '',
    hsp_local: 0,
    tarifa_kwh: 0
  });
  const [configuracaoPrecos, setConfiguracaoPrecos] = useState<ConfiguracaoPrecos>({
    preco_despesa_global: 8000,
    usar_percentual: false,
    percentual_despesa: 0,
    ajustes_por_distribuidor: {},
    ajustes_por_orcamento: {}
  });

  // Estados para modo manual
  const [orcamentoAtual, setOrcamentoAtual] = useState<OrcamentoData | null>(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  // Estados para upload
  const [arquivosUpload, setArquivosUpload] = useState<File[]>([]);
  const [processandoUpload, setProcessandoUpload] = useState(false);

  // Função para adicionar orçamento manual
  const adicionarOrcamentoManual = () => {
    const novoOrcamento: OrcamentoData = {
      id: `orcamento_${Date.now()}`,
      distribuidor: '',
      preco_custo: 0,
      preco_despesa: configuracaoPrecos.preco_despesa_global,
      preco_total: 0,
      potencia_total_kwp: 0,
      inversores: [],
      modulos: [],
      outros_componentes: []
    };
    setOrcamentoAtual(novoOrcamento);
    setMostrarFormulario(true);
  };

  // Função para salvar orçamento manual
  const salvarOrcamentoManual = () => {
    if (orcamentoAtual) {
      const orcamentoCompleto = {
        ...orcamentoAtual,
        preco_total: orcamentoAtual.preco_custo + orcamentoAtual.preco_despesa
      };
      setOrcamentos([...orcamentos, orcamentoCompleto]);
      setOrcamentoAtual(null);
      setMostrarFormulario(false);
    }
  };

  // Função para adicionar inversor
  const adicionarInversor = () => {
    if (orcamentoAtual) {
      const novoInversor: Inversor = {
        id: `inv_${Date.now()}`,
        marca: '',
        modelo: '',
        potencia_kw: 0,
        quantidade: 1
      };
      setOrcamentoAtual({
        ...orcamentoAtual,
        inversores: [...orcamentoAtual.inversores, novoInversor]
      });
    }
  };

  // Função para adicionar módulo
  const adicionarModulo = () => {
    if (orcamentoAtual) {
      const novoModulo: Modulo = {
        id: `mod_${Date.now()}`,
        marca: '',
        modelo: '',
        potencia_wp: 0,
        quantidade: 1,
        tipo: 'Monofacial'
      };
      setOrcamentoAtual({
        ...orcamentoAtual,
        modulos: [...orcamentoAtual.modulos, novoModulo]
      });
    }
  };

  // Função para processar upload
  const processarUpload = async () => {
    setProcessandoUpload(true);
    try {
      // Simular processamento de upload
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Aqui seria a lógica real de processamento dos arquivos
      console.log('Arquivos processados:', arquivosUpload);
      
      // Exemplo de orçamento processado
      const orcamentoProcessado: OrcamentoData = {
        id: `orcamento_upload_${Date.now()}`,
        distribuidor: 'Distribuidor Upload',
        orcamento_id: 'WEB-123456',
        arquivo_origem: arquivosUpload[0]?.name || 'arquivo.pdf',
        preco_custo: 15000,
        preco_despesa: configuracaoPrecos.preco_despesa_global,
        preco_total: 15000 + configuracaoPrecos.preco_despesa_global,
        potencia_total_kwp: 10.5,
        inversores: [{
          id: 'inv_1',
          marca: 'SMA',
          modelo: 'Sunny Boy 5.0',
          potencia_kw: 5.0,
          quantidade: 2
        }],
        modulos: [{
          id: 'mod_1',
          marca: 'Jinko',
          modelo: 'JKM550M-72HL4-B',
          potencia_wp: 550,
          quantidade: 20,
          tipo: 'Monofacial'
        }],
        outros_componentes: ['Estrutura em alumínio', 'Cabeamento CC/CA', 'Proteções elétricas']
      };
      
      setOrcamentos([...orcamentos, orcamentoProcessado]);
      setArquivosUpload([]);
    } catch (error) {
      console.error('Erro no upload:', error);
    } finally {
      setProcessandoUpload(false);
    }
  };

  // Função para processar dados do extrator manual
  const processarDadosExtrator = (dados: any) => {
    try {
      // Aqui seria o processamento real do YAML
      console.log('Dados recebidos do extrator:', dados);
      
      // Simular criação de orçamento a partir dos dados
      const novoOrcamento: OrcamentoData = {
        id: `orcamento_extrator_${Date.now()}`,
        distribuidor: 'Distribuidor Extraído',
        orcamento_id: 'EXT-001',
        arquivo_origem: 'extrator_manual.yaml',
        preco_custo: 15000,
        preco_despesa: configuracaoPrecos.preco_despesa_global,
        preco_total: 15000 + configuracaoPrecos.preco_despesa_global,
        potencia_total_kwp: 10.5,
        inversores: [{
          id: 'inv_1',
          marca: 'SMA',
          modelo: 'Sunny Boy 5.0',
          potencia_kw: 5.0,
          quantidade: 2
        }],
        modulos: [{
          id: 'mod_1',
          marca: 'Jinko',
          modelo: 'JKM550M-72HL4-B',
          potencia_wp: 550,
          quantidade: 20,
          tipo: 'Monofacial'
        }],
        outros_componentes: ['Estrutura em alumínio', 'Cabeamento CC/CA', 'Proteções elétricas']
      };
      
      setOrcamentos([...orcamentos, novoOrcamento]);
      alert('Orçamento adicionado com sucesso a partir dos dados extraídos!');
      
    } catch (error) {
      console.error('Erro ao processar dados do extrator:', error);
      alert('Erro ao processar dados extraídos. Verifique o formato.');
    }
  };

  // Função para gerar proposta
  const gerarProposta = async () => {
    if (orcamentos.length === 0) {
      alert('Adicione pelo menos um orçamento antes de gerar a proposta.');
      return;
    }

    try {
      const dadosCompletos = {
        clienteData,
        orcamentos,
        configuracaoPrecos
      };

      const response = await fetch(`/api/orcamentos/${clienteId}/processar-modular`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dadosCompletos),
      });

      if (response.ok) {
        const result = await response.json();
        alert('Proposta gerada com sucesso!');
        console.log('Proposta gerada:', result);
      } else {
        throw new Error('Erro ao gerar proposta');
      }
    } catch (error) {
      console.error('Erro ao gerar proposta:', error);
      alert('Erro ao gerar proposta. Tente novamente.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Entrada Modular - {clienteId}</title>
      </Head>

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">
            🚀 Entrada Modular de Dados - {clienteId}
          </h1>
          
          {/* Seletor de Modo */}
          <div className="flex space-x-4 mb-6">
            <button
              onClick={() => setModoEntrada('upload')}
              className={`px-4 py-2 rounded-lg font-medium ${
                modoEntrada === 'upload'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              📁 Modo Upload
            </button>
            <button
              onClick={() => setModoEntrada('manual')}
              className={`px-4 py-2 rounded-lg font-medium ${
                modoEntrada === 'manual'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              ⌨️ Modo Manual
            </button>
            <button
              onClick={() => setModoEntrada('hibrido')}
              className={`px-4 py-2 rounded-lg font-medium ${
                modoEntrada === 'hibrido'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              🔄 Modo Híbrido
            </button>
          </div>

          <p className="text-gray-600">
            Modo atual: <strong>{modoEntrada.toUpperCase()}</strong>
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Coluna Esquerda - Dados do Cliente */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">👤 Dados do Cliente</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome
                </label>
                <input
                  type="text"
                  value={clienteData.nome}
                  onChange={(e) => setClienteData({...clienteData, nome: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nome do cliente"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cidade
                  </label>
                  <input
                    type="text"
                    value={clienteData.cidade}
                    onChange={(e) => setClienteData({...clienteData, cidade: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Cidade"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estado
                  </label>
                  <input
                    type="text"
                    value={clienteData.estado}
                    onChange={(e) => setClienteData({...clienteData, estado: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Estado"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Consumo Mensal (kWh)
                </label>
                <input
                  type="number"
                  value={clienteData.consumo_mensal_kwh}
                  onChange={(e) => setClienteData({...clienteData, consumo_mensal_kwh: Number(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Consumo mensal"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    HSP Local
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={clienteData.hsp_local}
                    onChange={(e) => setClienteData({...clienteData, hsp_local: Number(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="HSP"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tarifa (R$/kWh)
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    value={clienteData.tarifa_kwh}
                    onChange={(e) => setClienteData({...clienteData, tarifa_kwh: Number(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Tarifa"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Coluna Direita - Configuração de Preços */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">💰 Configuração de Preços</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Preço de Despesa Global (R$)
                </label>
                <input
                  type="number"
                  value={configuracaoPrecos.preco_despesa_global}
                  onChange={(e) => setConfiguracaoPrecos({...configuracaoPrecos, preco_despesa_global: Number(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Preço de despesa"
                />
              </div>

              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={configuracaoPrecos.usar_percentual}
                    onChange={(e) => setConfiguracaoPrecos({...configuracaoPrecos, usar_percentual: e.target.checked})}
                    className="mr-2"
                  />
                  Usar percentual sobre custo
                </label>
              </div>

              {configuracaoPrecos.usar_percentual && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Percentual de Despesa (%)
                  </label>
                  <input
                    type="number"
                    value={configuracaoPrecos.percentual_despesa}
                    onChange={(e) => setConfiguracaoPrecos({...configuracaoPrecos, percentual_despesa: Number(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Percentual"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Seção de Orçamentos */}
        <div className="bg-white rounded-lg shadow-md p-6 mt-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">📊 Orçamentos ({orcamentos.length})</h2>
            <div className="space-x-2">
              {(modoEntrada === 'manual' || modoEntrada === 'hibrido') && (
                <button
                  onClick={adicionarOrcamentoManual}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  ➕ Adicionar Manual
                </button>
              )}
              {(modoEntrada === 'upload' || modoEntrada === 'hibrido') && (
                <button
                  onClick={() => document.getElementById('file-upload')?.click()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  📁 Upload Arquivo
                </button>
              )}
              <ExtratorManual onDadosExtraidos={processarDadosExtrator} />
            </div>
          </div>

          {/* Upload de Arquivos */}
          {(modoEntrada === 'upload' || modoEntrada === 'hibrido') && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <input
                id="file-upload"
                type="file"
                multiple
                accept=".pdf,.yaml,.yml"
                onChange={(e) => setArquivosUpload(Array.from(e.target.files || []))}
                className="hidden"
              />
              
              {arquivosUpload.length > 0 && (
                <div className="mt-4">
                  <h3 className="font-medium text-gray-700 mb-2">Arquivos selecionados:</h3>
                  <ul className="list-disc list-inside space-y-1">
                    {arquivosUpload.map((arquivo, index) => (
                      <li key={index} className="text-sm text-gray-600">
                        {arquivo.name}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={processarUpload}
                    disabled={processandoUpload}
                    className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {processandoUpload ? 'Processando...' : 'Processar Upload'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Lista de Orçamentos */}
          <div className="space-y-4">
            {orcamentos.map((orcamento, index) => (
              <div key={orcamento.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-gray-800">
                      Orçamento {index + 1} - {orcamento.distribuidor}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Custo: R$ {orcamento.preco_custo.toFixed(2)} | 
                      Despesa: R$ {orcamento.preco_despesa.toFixed(2)} | 
                      Total: R$ {orcamento.preco_total.toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-600">
                      Potência: {orcamento.potencia_total_kwp.toFixed(1)} kWp | 
                      Custo/kWp: R$ {(orcamento.preco_total / orcamento.potencia_total_kwp).toFixed(2)}/kWp
                    </p>
                  </div>
                  <button
                    onClick={() => setOrcamentos(orcamentos.filter((_, i) => i !== index))}
                    className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    🗑️ Remover
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Botão Gerar Proposta */}
          <div className="mt-6 text-center">
            <button
              onClick={gerarProposta}
              disabled={orcamentos.length === 0}
              className="px-8 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              🚀 Gerar Proposta PNL
            </button>
          </div>
        </div>

        {/* Formulário de Orçamento Manual */}
        {mostrarFormulario && orcamentoAtual && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-bold text-gray-800 mb-4">📝 Orçamento Manual</h3>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Distribuidor
                  </label>
                  <input
                    type="text"
                    value={orcamentoAtual.distribuidor}
                    onChange={(e) => setOrcamentoAtual({...orcamentoAtual, distribuidor: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Nome do distribuidor"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Preço de Custo (R$)
                  </label>
                  <input
                    type="number"
                    value={orcamentoAtual.preco_custo}
                    onChange={(e) => setOrcamentoAtual({...orcamentoAtual, preco_custo: Number(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Preço de custo"
                  />
                </div>
              </div>

              {/* Inversores */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium text-gray-700">Inversores</h4>
                  <button
                    onClick={adicionarInversor}
                    className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    ➕ Adicionar
                  </button>
                </div>
                {orcamentoAtual.inversores.map((inversor, index) => (
                  <div key={inversor.id} className="grid grid-cols-5 gap-2 mb-2">
                    <input
                      type="text"
                      value={inversor.marca}
                      onChange={(e) => {
                        const novosInversores = [...orcamentoAtual.inversores];
                        novosInversores[index].marca = e.target.value;
                        setOrcamentoAtual({...orcamentoAtual, inversores: novosInversores});
                      }}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Marca"
                    />
                    <input
                      type="text"
                      value={inversor.modelo}
                      onChange={(e) => {
                        const novosInversores = [...orcamentoAtual.inversores];
                        novosInversores[index].modelo = e.target.value;
                        setOrcamentoAtual({...orcamentoAtual, inversores: novosInversores});
                      }}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Modelo"
                    />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={inversor.potencia_kw}
                      onChange={(e) => {
                        const novosInversores = [...orcamentoAtual.inversores];
                        novosInversores[index].potencia_kw = Number(e.target.value);
                        setOrcamentoAtual({...orcamentoAtual, inversores: novosInversores});
                      }}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Potência (kW) - ex: 2.25"
                    />
                    <input
                      type="number"
                      value={inversor.quantidade}
                      onChange={(e) => {
                        const novosInversores = [...orcamentoAtual.inversores];
                        novosInversores[index].quantidade = Number(e.target.value);
                        setOrcamentoAtual({...orcamentoAtual, inversores: novosInversores});
                      }}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Qtd"
                    />
                    <button
                      onClick={() => {
                        const novosInversores = orcamentoAtual.inversores.filter((_, i) => i !== index);
                        setOrcamentoAtual({...orcamentoAtual, inversores: novosInversores});
                      }}
                      className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>

              {/* Módulos */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium text-gray-700">Módulos</h4>
                  <button
                    onClick={adicionarModulo}
                    className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    ➕ Adicionar
                  </button>
                </div>
                {orcamentoAtual.modulos.map((modulo, index) => (
                  <div key={modulo.id} className="grid grid-cols-6 gap-2 mb-2">
                    <input
                      type="text"
                      value={modulo.marca}
                      onChange={(e) => {
                        const novosModulos = [...orcamentoAtual.modulos];
                        novosModulos[index].marca = e.target.value;
                        setOrcamentoAtual({...orcamentoAtual, modulos: novosModulos});
                      }}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Marca"
                    />
                    <input
                      type="text"
                      value={modulo.modelo}
                      onChange={(e) => {
                        const novosModulos = [...orcamentoAtual.modulos];
                        novosModulos[index].modelo = e.target.value;
                        setOrcamentoAtual({...orcamentoAtual, modulos: novosModulos});
                      }}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Modelo"
                    />
                    <input
                      type="number"
                      value={modulo.potencia_wp}
                      onChange={(e) => {
                        const novosModulos = [...orcamentoAtual.modulos];
                        novosModulos[index].potencia_wp = Number(e.target.value);
                        setOrcamentoAtual({...orcamentoAtual, modulos: novosModulos});
                      }}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Potência (W)"
                    />
                    <input
                      type="number"
                      value={modulo.quantidade}
                      onChange={(e) => {
                        const novosModulos = [...orcamentoAtual.modulos];
                        novosModulos[index].quantidade = Number(e.target.value);
                        setOrcamentoAtual({...orcamentoAtual, modulos: novosModulos});
                      }}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Qtd"
                    />
                    <select
                      value={modulo.tipo}
                      onChange={(e) => {
                        const novosModulos = [...orcamentoAtual.modulos];
                        novosModulos[index].tipo = e.target.value;
                        setOrcamentoAtual({...orcamentoAtual, modulos: novosModulos});
                      }}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Monofacial">Monofacial</option>
                      <option value="Bifacial">Bifacial</option>
                    </select>
                    <button
                      onClick={() => {
                        const novosModulos = orcamentoAtual.modulos.filter((_, i) => i !== index);
                        setOrcamentoAtual({...orcamentoAtual, modulos: novosModulos});
                      }}
                      className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>

              {/* Botões */}
              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => {
                    setOrcamentoAtual(null);
                    setMostrarFormulario(false);
                  }}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Cancelar
                </button>
                <button
                  onClick={salvarOrcamentoManual}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Salvar Orçamento
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
