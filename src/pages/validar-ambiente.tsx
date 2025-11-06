import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';

interface AmbienteInfo {
  status: string;
  ambiente: {
    tipo: string;
    vercel: {
      env: string;
      url: string;
      isProd: boolean;
      isDev: boolean;
      isLocal: boolean;
    };
    node: {
      env: string;
    };
  };
  supabase: {
    url: string;
    project: string;
    isProd: boolean;
    isDev: boolean;
    configured: boolean;
  };
  seguranca: {
    configSegura: boolean;
    errors: string[];
    warnings: string[];
  };
  recomendacao: string;
}

export default function ValidarAmbiente() {
  const [info, setInfo] = useState<AmbienteInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInfo();
  }, []);

  const loadInfo = async () => {
    try {
      const response = await fetch('/api/validar-ambiente');
      const data = await response.json();
      setInfo(data);
    } catch (error) {
      console.error('Erro ao validar ambiente:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    if (status === 'ok') return 'text-green-600';
    if (status === 'warning') return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusIcon = (status: string) => {
    if (status === 'ok') return '✅';
    if (status === 'warning') return '⚠️';
    return '🚨';
  };

  return (
    <>
      <Head>
        <title>Validar Ambiente - PIENG Solar</title>
        <meta name="description" content="Validar configuração de ambiente" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Link href="/admin" className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4 font-medium">
              ← Voltar para Admin
            </Link>

            <div className="bg-white rounded-xl shadow-lg p-8">
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                🔍 Validar Ambiente
              </h1>
              <p className="text-gray-600">
                Verifique se está usando o ambiente correto (DEV ou PROD)
              </p>
            </div>
          </div>

          {/* Loading */}
          {loading ? (
            <div className="bg-white rounded-xl shadow-lg p-12 text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Validando ambiente...</p>
            </div>
          ) : !info ? (
            <div className="bg-white rounded-xl shadow-lg p-12 text-center">
              <div className="text-6xl mb-4">❌</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                Erro ao validar ambiente
              </h3>
              <button
                onClick={loadInfo}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium mt-4"
              >
                🔄 Tentar Novamente
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Status Geral */}
              <div className={`bg-white rounded-xl shadow-lg p-8 border-4 ${
                info.status === 'ok' ? 'border-green-500' :
                info.status === 'warning' ? 'border-yellow-500' :
                'border-red-500'
              }`}>
                <div className="flex items-center gap-4 mb-4">
                  <div className="text-6xl">{getStatusIcon(info.status)}</div>
                  <div>
                    <h2 className={`text-2xl font-bold ${getStatusColor(info.status)}`}>
                      {info.status === 'ok' ? 'Configuração OK' :
                       info.status === 'warning' ? 'Atenção Necessária' :
                       'Erro Crítico'}
                    </h2>
                    <p className="text-gray-600 mt-1">{info.recomendacao}</p>
                  </div>
                </div>
              </div>

              {/* Erros */}
              {info.seguranca.errors.length > 0 && (
                <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-lg">
                  <h3 className="font-bold text-red-800 mb-2">🚨 Erros Críticos:</h3>
                  <ul className="space-y-2">
                    {info.seguranca.errors.map((error, i) => (
                      <li key={i} className="text-red-700">{error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Warnings */}
              {info.seguranca.warnings.length > 0 && (
                <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6 rounded-lg">
                  <h3 className="font-bold text-yellow-800 mb-2">⚠️ Avisos:</h3>
                  <ul className="space-y-2">
                    {info.seguranca.warnings.map((warning, i) => (
                      <li key={i} className="text-yellow-700">{warning}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Informações do Ambiente */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Ambiente Vercel/Node */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="font-bold text-gray-800 mb-4">🌐 Ambiente</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tipo:</span>
                      <span className="font-medium">{info.ambiente.tipo}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Vercel ENV:</span>
                      <span className="font-medium">{info.ambiente.vercel.env}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Node ENV:</span>
                      <span className="font-medium">{info.ambiente.node.env}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">URL:</span>
                      <span className="font-medium text-xs truncate">{info.ambiente.vercel.url}</span>
                    </div>
                    <div className="pt-2 border-t">
                      <div className="flex items-center gap-2">
                        {info.ambiente.vercel.isProd && <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">PROD</span>}
                        {info.ambiente.vercel.isDev && <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">DEV</span>}
                        {info.ambiente.vercel.isLocal && <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">LOCAL</span>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Supabase */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="font-bold text-gray-800 mb-4">🗄️ Supabase</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className={`font-medium ${info.supabase.configured ? 'text-green-600' : 'text-red-600'}`}>
                        {info.supabase.configured ? 'Configurado' : 'Não configurado'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Projeto:</span>
                      <span className="font-medium">{info.supabase.project}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">URL:</span>
                      <span className="font-medium text-xs truncate">{info.supabase.url}</span>
                    </div>
                    <div className="pt-2 border-t">
                      <div className="flex items-center gap-2">
                        {info.supabase.isProd && <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">PROD DB</span>}
                        {info.supabase.isDev && <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">DEV DB</span>}
                        {!info.supabase.isProd && !info.supabase.isDev && <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">UNKNOWN</span>}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ações */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="font-bold text-gray-800 mb-4">🔧 Ações</h3>
                <div className="space-y-3">
                  <button
                    onClick={loadInfo}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    🔄 Revalidar Ambiente
                  </button>
                  <a
                    href="/api/test-supabase"
                    target="_blank"
                    className="block w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium text-center"
                  >
                    🧪 Testar Conexão Supabase
                  </a>
                  <Link href="/admin" legacyBehavior>
                    <a className="block w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-center">
                      ← Voltar para Admin
                    </a>
                  </Link>
                </div>
              </div>

              {/* Documentação */}
              <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-lg">
                <h3 className="font-bold text-blue-800 mb-2">📚 Documentação</h3>
                <p className="text-blue-700 mb-2">
                  Para configurar ambiente de desenvolvimento separado:
                </p>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• Ver: <code className="bg-blue-100 px-2 py-1 rounded">SETUP_AMBIENTE_DEV.md</code></li>
                  <li>• Ver: <code className="bg-blue-100 px-2 py-1 rounded">WORKFLOW_DESENVOLVIMENTO.md</code></li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
