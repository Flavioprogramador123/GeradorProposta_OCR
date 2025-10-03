import { useState } from 'react';

interface ExtratorManualProps {
  onDadosExtraidos: (dados: any) => void;
}

export default function ExtratorManual({ onDadosExtraidos }: ExtratorManualProps) {
  const [mostrarExtrator, setMostrarExtrator] = useState(false);
  const [dadosYAML, setDadosYAML] = useState('');
  const [processando, setProcessando] = useState(false);

  // Template YAML de exemplo
  const templateYAML = `# Template para extração de dados de orçamento
# Copie este template e preencha com os dados do PDF/imagem

cliente:
  nome: "Nome do Cliente"
  cidade: "Cidade"
  estado: "Estado"
  consumo_mensal_kwh: 1000
  tipo_imovel: "Residencial"
  hsp_local: 5.0
  tarifa_kwh: 0.8

orcamento:
  distribuidor: "Nome do Distribuidor"
  orcamento_id: "ID-123456"
  arquivo_origem: "arquivo.pdf"
  preco_total: 15000.00
  potencia_total_sistema: "10.5 kWp"
  
  inversores:
    - marca: "SMA"
      modelo: "Sunny Boy 5.0"
      potencia_kw: 5.0
      quantidade: 2
    - marca: "Fronius"
      modelo: "Primo 5.0-1"
      potencia_kw: 5.0
      quantidade: 1
      
  modulos:
    - marca: "Jinko"
      modelo: "JKM550M-72HL4-B"
      potencia_wp: 550
      quantidade: 20
      tipo: "Monofacial"
    - marca: "Canadian Solar"
      modelo: "CS3K-550MS"
      potencia_wp: 550
      quantidade: 10
      tipo: "Monofacial"

outros_componentes:
  - "Estrutura em alumínio"
  - "Cabeamento CC/CA"
  - "Proteções elétricas"`;

  // Instruções para o usuário
  const instrucoes = `
📋 INSTRUÇÕES PARA EXTRAÇÃO MANUAL:

1. 📄 Abra o PDF/imagem do orçamento
2. 📋 Copie o template YAML acima
3. ✏️ Preencha os campos com os dados do orçamento:
   - Nome do cliente
   - Dados do distribuidor
   - Preços dos equipamentos
   - Especificações dos inversores
   - Especificações dos módulos
4. 📝 Cole o YAML preenchido na área abaixo
5. 🚀 Clique em "Processar Dados"

💡 DICAS:
- Use valores decimais para potências (ex: 2.25 kW)
- Inclua todos os inversores e módulos do orçamento
- Verifique se os preços estão corretos
- Salve o YAML para reutilizar depois
`;

  const processarDados = async () => {
    if (!dadosYAML.trim()) {
      alert('Por favor, cole o YAML com os dados do orçamento.');
      return;
    }

    setProcessando(true);
    
    try {
      // Simular processamento
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Aqui seria a validação e processamento real do YAML
      const dadosProcessados = {
        sucesso: true,
        dados: dadosYAML,
        timestamp: new Date().toISOString()
      };
      
      onDadosExtraidos(dadosProcessados);
      setMostrarExtrator(false);
      
    } catch (error) {
      console.error('Erro ao processar dados:', error);
      alert('Erro ao processar dados. Verifique o formato do YAML.');
    } finally {
      setProcessando(false);
    }
  };

  const copiarTemplate = () => {
    navigator.clipboard.writeText(templateYAML);
    alert('Template copiado para a área de transferência!');
  };

  return (
    <div className="space-y-4">
      {/* Botão para abrir extrator */}
      <button
        onClick={() => setMostrarExtrator(true)}
        className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
      >
        🤖 Extrator Manual (YAML)
      </button>

      {/* Modal do extrator */}
      {mostrarExtrator && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">🤖 Extrator Manual de Dados</h3>
              <button
                onClick={() => setMostrarExtrator(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Coluna Esquerda - Instruções */}
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-800 mb-2">📋 Instruções</h4>
                  <div className="text-sm text-blue-700 whitespace-pre-line">
                    {instrucoes}
                  </div>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-800 mb-2">📄 Template YAML</h4>
                  <div className="bg-white border border-gray-300 rounded p-3 max-h-96 overflow-y-auto">
                    <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                      {templateYAML}
                    </pre>
                  </div>
                  <button
                    onClick={copiarTemplate}
                    className="mt-2 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                  >
                    📋 Copiar Template
                  </button>
                </div>
              </div>

              {/* Coluna Direita - Área de Entrada */}
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-medium text-green-800 mb-2">✏️ Cole seu YAML aqui</h4>
                  <textarea
                    value={dadosYAML}
                    onChange={(e) => setDadosYAML(e.target.value)}
                    className="w-full h-96 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 font-mono text-sm"
                    placeholder="Cole aqui o YAML preenchido com os dados do orçamento..."
                  />
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-medium text-yellow-800 mb-2">💡 Dicas Importantes</h4>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    <li>• Use valores decimais para potências (ex: 2.25 kW)</li>
                    <li>• Inclua todos os inversores e módulos</li>
                    <li>• Verifique se os preços estão corretos</li>
                    <li>• Salve o YAML para reutilizar depois</li>
                    <li>• Use aspas duplas para textos</li>
                  </ul>
                </div>

                {/* Botões */}
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setMostrarExtrator(false)}
                    className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={processarDados}
                    disabled={processando || !dadosYAML.trim()}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {processando ? 'Processando...' : '🚀 Processar Dados'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
