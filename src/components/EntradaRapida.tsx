import { useState } from 'react';

interface EntradaRapidaProps {
  onOrcamentoSalvo: (orcamento: any) => void;
  precoDespesaPadrao: number;
}

interface OrcamentoRapido {
  distribuidor: string;
  preco_custo: number;
  preco_despesa: number;
  inversores: InversorRapido[];
  modulos: ModuloRapido[];
}

interface InversorRapido {
  marca: string;
  modelo: string;
  potencia_kw: number;
  quantidade: number;
}

interface ModuloRapido {
  marca: string;
  modelo: string;
  potencia_wp: number;
  quantidade: number;
  tipo: string;
}

export default function EntradaRapida({ onOrcamentoSalvo, precoDespesaPadrao }: EntradaRapidaProps) {
  const [orcamento, setOrcamento] = useState<OrcamentoRapido>({
    distribuidor: '',
    preco_custo: 0,
    preco_despesa: precoDespesaPadrao,
    inversores: [],
    modulos: []
  });

  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  // Templates pré-definidos
  const templatesDistribuidores = [
    {
      nome: 'Sollar Distribuidora',
      inversores: [
        { marca: 'SMA', modelo: 'Sunny Boy 5.0', potencia_kw: 5.0, quantidade: 1 },
        { marca: 'Fronius', modelo: 'Primo 5.0-1', potencia_kw: 5.0, quantidade: 1 }
      ],
      modulos: [
        { marca: 'Jinko', modelo: 'JKM550M-72HL4-B', potencia_wp: 550, quantidade: 20, tipo: 'Monofacial' },
        { marca: 'Canadian Solar', modelo: 'CS3K-550MS', potencia_wp: 550, quantidade: 20, tipo: 'Monofacial' }
      ]
    },
    {
      nome: 'BelEnergy',
      inversores: [
        { marca: 'Deye', modelo: 'SUN-5K-SG01LP1', potencia_kw: 5.0, quantidade: 1 },
        { marca: 'Growatt', modelo: 'MIN 5000-XH', potencia_kw: 5.0, quantidade: 1 }
      ],
      modulos: [
        { marca: 'Risen', modelo: 'RST550-144M', potencia_wp: 550, quantidade: 20, tipo: 'Monofacial' },
        { marca: 'Honor', modelo: 'HON-550M', potencia_wp: 550, quantidade: 20, tipo: 'Monofacial' }
      ]
    },
    {
      nome: 'Fortlev Solar',
      inversores: [
        { marca: 'Fortlev', modelo: 'FL-5000', potencia_kw: 5.0, quantidade: 1 },
        { marca: 'Fortlev', modelo: 'FL-10000', potencia_kw: 10.0, quantidade: 1 }
      ],
      modulos: [
        { marca: 'Fortlev', modelo: 'FL-585M', potencia_wp: 585, quantidade: 20, tipo: 'Monofacial' },
        { marca: 'Fortlev', modelo: 'FL-600B', potencia_wp: 600, quantidade: 20, tipo: 'Bifacial' }
      ]
    }
  ];

  // Função para aplicar template
  const aplicarTemplate = (template: any) => {
    setOrcamento({
      ...orcamento,
      distribuidor: template.nome,
      inversores: template.inversores,
      modulos: template.modulos
    });
  };

  // Função para adicionar inversor
  const adicionarInversor = () => {
    setOrcamento({
      ...orcamento,
      inversores: [...orcamento.inversores, {
        marca: '',
        modelo: '',
        potencia_kw: 0,
        quantidade: 1
      }]
    });
  };

  // Função para adicionar módulo
  const adicionarModulo = () => {
    setOrcamento({
      ...orcamento,
      modulos: [...orcamento.modulos, {
        marca: '',
        modelo: '',
        potencia_wp: 0,
        quantidade: 1,
        tipo: 'Monofacial'
      }]
    });
  };

  // Função para calcular potência total
  const calcularPotenciaTotal = () => {
    return orcamento.modulos.reduce((total, modulo) => {
      return total + (modulo.potencia_wp * modulo.quantidade);
    }, 0) / 1000; // Converter para kWp
  };

  // Função para salvar orçamento
  const salvarOrcamento = () => {
    const potenciaTotal = calcularPotenciaTotal();
    const precoTotal = orcamento.preco_custo + orcamento.preco_despesa;
    
    const orcamentoCompleto = {
      id: `orcamento_rapido_${Date.now()}`,
      distribuidor: orcamento.distribuidor,
      preco_custo: orcamento.preco_custo,
      preco_despesa: orcamento.preco_despesa,
      preco_total: precoTotal,
      potencia_total_kwp: potenciaTotal,
      inversores: orcamento.inversores,
      modulos: orcamento.modulos,
      outros_componentes: ['Estrutura em alumínio', 'Cabeamento CC/CA', 'Proteções elétricas']
    };

    onOrcamentoSalvo(orcamentoCompleto);
    
    // Resetar formulário
    setOrcamento({
      distribuidor: '',
      preco_custo: 0,
      preco_despesa: precoDespesaPadrao,
      inversores: [],
      modulos: []
    });
    setMostrarFormulario(false);
  };

  return (
    <div className="space-y-4">
      {/* Botão para abrir formulário */}
      <button
        onClick={() => setMostrarFormulario(true)}
        className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
      >
        ➕ Adicionar Orçamento Manual
      </button>

      {/* Formulário de entrada rápida */}
      {mostrarFormulario && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-800">📝 Entrada Rápida</h3>
            <button
              onClick={() => setMostrarFormulario(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          {/* Templates rápidos */}
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Templates Rápidos:</h4>
            <div className="grid grid-cols-3 gap-2">
              {templatesDistribuidores.map((template, index) => (
                <button
                  key={index}
                  onClick={() => aplicarTemplate(template)}
                  className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded border"
                >
                  {template.nome}
                </button>
              ))}
            </div>
          </div>

          {/* Dados básicos */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Distribuidor
              </label>
              <input
                type="text"
                value={orcamento.distribuidor}
                onChange={(e) => setOrcamento({...orcamento, distribuidor: e.target.value})}
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
                value={orcamento.preco_custo}
                onChange={(e) => setOrcamento({...orcamento, preco_custo: Number(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Preço de custo"
              />
            </div>
          </div>

          {/* Inversores */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-sm font-medium text-gray-700">Inversores</h4>
              <button
                onClick={adicionarInversor}
                className="px-2 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                ➕ Adicionar
              </button>
            </div>
            <div className="space-y-2">
              {orcamento.inversores.map((inversor, index) => (
                <div key={index} className="grid grid-cols-5 gap-2">
                  <input
                    type="text"
                    value={inversor.marca}
                    onChange={(e) => {
                      const novosInversores = [...orcamento.inversores];
                      novosInversores[index].marca = e.target.value;
                      setOrcamento({...orcamento, inversores: novosInversores});
                    }}
                    className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Marca"
                  />
                  <input
                    type="text"
                    value={inversor.modelo}
                    onChange={(e) => {
                      const novosInversores = [...orcamento.inversores];
                      novosInversores[index].modelo = e.target.value;
                      setOrcamento({...orcamento, inversores: novosInversores});
                    }}
                    className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Modelo"
                  />
                  <input
                    type="number"
                    step="0.01"
                    value={inversor.potencia_kw}
                    onChange={(e) => {
                      const novosInversores = [...orcamento.inversores];
                      novosInversores[index].potencia_kw = Number(e.target.value);
                      setOrcamento({...orcamento, inversores: novosInversores});
                    }}
                    className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="kW"
                  />
                  <input
                    type="number"
                    value={inversor.quantidade}
                    onChange={(e) => {
                      const novosInversores = [...orcamento.inversores];
                      novosInversores[index].quantidade = Number(e.target.value);
                      setOrcamento({...orcamento, inversores: novosInversores});
                    }}
                    className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Qtd"
                  />
                  <button
                    onClick={() => {
                      const novosInversores = orcamento.inversores.filter((_, i) => i !== index);
                      setOrcamento({...orcamento, inversores: novosInversores});
                    }}
                    className="px-2 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Módulos */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-sm font-medium text-gray-700">Módulos</h4>
              <button
                onClick={adicionarModulo}
                className="px-2 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
              >
                ➕ Adicionar
              </button>
            </div>
            <div className="space-y-2">
              {orcamento.modulos.map((modulo, index) => (
                <div key={index} className="grid grid-cols-6 gap-2">
                  <input
                    type="text"
                    value={modulo.marca}
                    onChange={(e) => {
                      const novosModulos = [...orcamento.modulos];
                      novosModulos[index].marca = e.target.value;
                      setOrcamento({...orcamento, modulos: novosModulos});
                    }}
                    className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Marca"
                  />
                  <input
                    type="text"
                    value={modulo.modelo}
                    onChange={(e) => {
                      const novosModulos = [...orcamento.modulos];
                      novosModulos[index].modelo = e.target.value;
                      setOrcamento({...orcamento, modulos: novosModulos});
                    }}
                    className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Modelo"
                  />
                  <input
                    type="number"
                    value={modulo.potencia_wp}
                    onChange={(e) => {
                      const novosModulos = [...orcamento.modulos];
                      novosModulos[index].potencia_wp = Number(e.target.value);
                      setOrcamento({...orcamento, modulos: novosModulos});
                    }}
                    className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="W"
                  />
                  <input
                    type="number"
                    value={modulo.quantidade}
                    onChange={(e) => {
                      const novosModulos = [...orcamento.modulos];
                      novosModulos[index].quantidade = Number(e.target.value);
                      setOrcamento({...orcamento, modulos: novosModulos});
                    }}
                    className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Qtd"
                  />
                  <select
                    value={modulo.tipo}
                    onChange={(e) => {
                      const novosModulos = [...orcamento.modulos];
                      novosModulos[index].tipo = e.target.value;
                      setOrcamento({...orcamento, modulos: novosModulos});
                    }}
                    className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="Monofacial">Mono</option>
                    <option value="Bifacial">Bi</option>
                  </select>
                  <button
                    onClick={() => {
                      const novosModulos = orcamento.modulos.filter((_, i) => i !== index);
                      setOrcamento({...orcamento, modulos: novosModulos});
                    }}
                    className="px-2 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Resumo */}
          <div className="bg-gray-50 rounded-lg p-3 mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Resumo:</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Potência Total:</span>
                <span className="font-medium ml-2">{calcularPotenciaTotal().toFixed(1)} kWp</span>
              </div>
              <div>
                <span className="text-gray-600">Preço Total:</span>
                <span className="font-medium ml-2">R$ {(orcamento.preco_custo + orcamento.preco_despesa).toFixed(2)}</span>
              </div>
              <div>
                <span className="text-gray-600">Custo/kWp:</span>
                <span className="font-medium ml-2">
                  R$ {calcularPotenciaTotal() > 0 ? ((orcamento.preco_custo + orcamento.preco_despesa) / calcularPotenciaTotal()).toFixed(2) : '0,00'}/kWp
                </span>
              </div>
              <div>
                <span className="text-gray-600">Inversores:</span>
                <span className="font-medium ml-2">{orcamento.inversores.length}</span>
              </div>
            </div>
          </div>

          {/* Botões */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setMostrarFormulario(false)}
              className="px-4 py-2 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Cancelar
            </button>
            <button
              onClick={salvarOrcamento}
              disabled={!orcamento.distribuidor || orcamento.preco_custo === 0}
              className="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Salvar Orçamento
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
