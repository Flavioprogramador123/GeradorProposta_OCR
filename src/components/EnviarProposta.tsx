import React, { useState } from 'react';

interface EnviarPropostaProps {
    propostaSlug: string;
    clienteNome?: string;
    clienteEmail?: string;
    cidade?: string;
    consumoMensal?: number;
    tipoInstalacao?: string;
    onSuccess?: (url: string) => void;
    onError?: (error: string) => void;
}

interface FormData {
    clienteNome: string;
    clienteEmail: string;
    clienteTelefone: string;
    cidade: string;
    consumoMensal: number;
    tipoInstalacao: string;
}

/**
 * 📧 Componente para Envio de Propostas para Clientes
 */
export default function EnviarProposta({
    propostaSlug,
    clienteNome = '',
    clienteEmail = '',
    cidade = 'Anápolis/GO',
    consumoMensal = 2500,
    tipoInstalacao = 'Telhado Fibrocimento',
    onSuccess,
    onError
}: EnviarPropostaProps) {
    const [formData, setFormData] = useState<FormData>({
        clienteNome,
        clienteEmail,
        clienteTelefone: '',
        cidade,
        consumoMensal,
        tipoInstalacao
    });

    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'consumoMensal' ? parseInt(value) || 0 : value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await fetch('/api/enviar-proposta-cliente', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...formData,
                    propostaSlug
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Erro ao enviar email');
            }

            setSuccess(true);
            onSuccess?.(result.propostaUrl);

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
            setError(errorMessage);
            onError?.(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                <div className="text-green-600 text-4xl mb-4">✅</div>
                <h3 className="text-lg font-semibold text-green-800 mb-2">
                    Email Enviado com Sucesso!
                </h3>
                <p className="text-green-700 mb-4">
                    A proposta foi enviada para <strong>{formData.clienteEmail}</strong>
                </p>
                <p className="text-sm text-green-600">
                    O cliente receberá um email com o link da proposta personalizada.
                </p>
            </div>
        );
    }

    return (
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <div className="flex items-center mb-4">
                <div className="text-blue-600 text-2xl mr-3">📧</div>
                <h3 className="text-lg font-semibold text-gray-800">
                    Enviar Proposta para Cliente
                </h3>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nome do Cliente *
                        </label>
                        <input
                            type="text"
                            name="clienteNome"
                            value={formData.clienteNome}
                            onChange={handleInputChange}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Nome completo do cliente"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Email do Cliente *
                        </label>
                        <input
                            type="email"
                            name="clienteEmail"
                            value={formData.clienteEmail}
                            onChange={handleInputChange}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="cliente@email.com"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Telefone/WhatsApp
                        </label>
                        <input
                            type="tel"
                            name="clienteTelefone"
                            value={formData.clienteTelefone}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="(62) 99999-9999"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Cidade
                        </label>
                        <input
                            type="text"
                            name="cidade"
                            value={formData.cidade}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Anápolis/GO"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Consumo Mensal (kWh)
                        </label>
                        <input
                            type="number"
                            name="consumoMensal"
                            value={formData.consumoMensal}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="2500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Tipo de Instalação
                        </label>
                        <select
                            name="tipoInstalacao"
                            value={formData.tipoInstalacao}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="Telhado Fibrocimento">Telhado Fibrocimento</option>
                            <option value="Telhado Cerâmico">Telhado Cerâmico</option>
                            <option value="Telhado Metálico">Telhado Metálico</option>
                            <option value="Solo">Solo</option>
                            <option value="Laje">Laje</option>
                        </select>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-3">
                        <p className="text-red-700 text-sm">❌ {error}</p>
                    </div>
                )}

                <div className="flex justify-end space-x-3">
                    <button
                        type="button"
                        onClick={() => setFormData({
                            clienteNome: '',
                            clienteEmail: '',
                            clienteTelefone: '',
                            cidade: 'Anápolis/GO',
                            consumoMensal: 2500,
                            tipoInstalacao: 'Telhado Fibrocimento'
                        })}
                        className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                        Limpar
                    </button>
                    
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    >
                        {loading ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Enviando...
                            </>
                        ) : (
                            <>
                                📧 Enviar Proposta
                            </>
                        )}
                    </button>
                </div>
            </form>

            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-blue-700 text-sm">
                    <strong>💡 Dica:</strong> O cliente receberá um email personalizado com o link direto para sua proposta solar, 
                    incluindo todos os dados do projeto e informações de contato.
                </p>
            </div>
        </div>
    );
}
