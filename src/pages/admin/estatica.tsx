import Head from 'next/head';

export default function AdminEstatica() {
  return (
    <>
      <Head>
        <title>Admin Estática - PIENG Solar</title>
        <meta name="description" content="Área administrativa estática" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-orange-50">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-7xl mx-auto">
            
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                🏢 Admin Estática - PIENG Solar
              </h1>
              <p className="text-gray-600">
                Versão estática com JavaScript inline
              </p>
            </div>

            {/* Debug Info */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                🔍 Status do Sistema
              </h2>
              <div id="debug-info" className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium text-gray-700">Status</h3>
                  <p id="status" className="text-sm text-gray-600">Verificando...</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium text-gray-700">Total Clientes</h3>
                  <p id="total-clientes" className="text-sm text-gray-600">-</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium text-gray-700">Erro</h3>
                  <p id="erro" className="text-sm text-gray-600">Nenhum</p>
                </div>
              </div>
              
              <div className="mt-4">
                <button
                  id="recarregar-btn"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  🔄 Recarregar Dados
                </button>
              </div>
            </div>

            {/* Lista de Clientes */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-800">
                  📋 Lista de Clientes
                </h2>
              </div>

              <div id="conteudo-clientes" className="p-8 text-center">
                <div className="text-gray-500">Carregando...</div>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center mt-8 text-gray-500 text-sm">
              <p>PIENG Solar - Admin Estática v1.0</p>
              <p>JavaScript inline ativo</p>
            </div>
          </div>
        </div>
      </div>

      <script dangerouslySetInnerHTML={{
        __html: `
          console.log('🚀 JavaScript inline executando...');
          
          let clientes = [];
          let loading = true;
          let error = null;
          
          function updateDebugInfo() {
            document.getElementById('status').textContent = loading ? 'Carregando...' : 'Carregado';
            document.getElementById('total-clientes').textContent = clientes.length;
            document.getElementById('erro').textContent = error || 'Nenhum';
          }
          
          function getStatusBadge(status) {
            const badges = {
              'concluido': 'bg-green-100 text-green-800',
              'em_andamento': 'bg-yellow-100 text-yellow-800',
              'aguardando_orcamentos': 'bg-blue-100 text-blue-800',
              'erro': 'bg-red-100 text-red-800'
            };
            
            const labels = {
              'concluido': '✅ Concluído',
              'em_andamento': '🔄 Em Andamento',
              'aguardando_orcamentos': '⏳ Aguardando',
              'erro': '❌ Erro'
            };
            
            const badgeClass = badges[status] || badges.aguardando_orcamentos;
            const label = labels[status] || '⏳ Aguardando';
            
            return \`<span class="px-2 py-1 rounded-full text-xs font-medium \${badgeClass}">\${label}</span>\`;
          }
          
          function renderClientes() {
            const container = document.getElementById('conteudo-clientes');
            
            if (loading) {
              container.innerHTML = '<div class="text-gray-500">Carregando...</div>';
              return;
            }
            
            if (error) {
              container.innerHTML = \`
                <div class="text-red-500 mb-4">Erro: \${error}</div>
                <button onclick="loadClientesData()" class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                  🔄 Tentar Novamente
                </button>
              \`;
              return;
            }
            
            if (clientes.length === 0) {
              container.innerHTML = \`
                <div class="text-gray-500 mb-4">Nenhum cliente encontrado</div>
                <button onclick="loadClientesData()" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  🔄 Recarregar
                </button>
              \`;
              return;
            }
            
            const tableHTML = \`
              <div class="overflow-x-auto">
                <table class="w-full">
                  <thead class="bg-gray-50">
                    <tr>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Localização</th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Última Modificação</th>
                    </tr>
                  </thead>
                  <tbody class="bg-white divide-y divide-gray-200">
                    \${clientes.map(cliente => \`
                      <tr class="hover:bg-gray-50">
                        <td class="px-6 py-4 whitespace-nowrap">
                          <div class="font-medium text-gray-900">\${cliente.nome}</div>
                          <div class="text-sm text-gray-500">Pasta: \${cliente.pasta}</div>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">\${cliente.cidade}</td>
                        <td class="px-6 py-4 whitespace-nowrap">\${getStatusBadge(cliente.status)}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">\${cliente.ultimaModificacao}</td>
                      </tr>
                    \`).join('')}
                  </tbody>
                </table>
              </div>
            \`;
            
            container.innerHTML = tableHTML;
          }
          
          async function loadClientesData() {
            console.log('📡 Carregando dados dos clientes...');
            loading = true;
            error = null;
            updateDebugInfo();
            renderClientes();
            
            try {
              const response = await fetch('/api/admin/clientes');
              console.log('📡 Resposta recebida:', response.status);
              
              if (response.ok) {
                const data = await response.json();
                console.log('📊 Dados recebidos:', data);
                clientes = data.clientes || [];
                error = null;
              } else {
                error = \`Erro HTTP: \${response.status}\`;
              }
            } catch (err) {
              console.error('❌ Erro ao carregar dados:', err);
              error = \`Erro: \${err.message}\`;
            } finally {
              loading = false;
              updateDebugInfo();
              renderClientes();
            }
          }
          
          // Event listeners
          document.getElementById('recarregar-btn').addEventListener('click', loadClientesData);
          
          // Carregar dados inicial
          loadClientesData();
        `
      }} />
    </>
  );
}
