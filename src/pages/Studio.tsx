import React, { useState } from 'react';
import { Image, Wand2, Download } from 'lucide-react';

const Studio = () => {
  const [prompt, setPrompt] = useState('');
  const [imagem, setImagem] = useState('');

  const handleGenerate = async () => {
    // Lógica para gerar imagem
    console.log('Gerando imagem...', prompt);
    setImagem('https://picsum.photos/512/512?random=' + Date.now());
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <Image className="h-8 w-8 text-purple-500" />
        <h1 className="text-3xl font-bold text-gray-900">Image Studio</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Gerar Imagem com IA</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prompt para a IA
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                rows={4}
                placeholder="Descreva a imagem que deseja gerar..."
              />
            </div>
            <button
              onClick={handleGenerate}
              className="w-full bg-purple-500 text-white p-3 rounded-lg hover:bg-purple-600 transition-colors flex items-center justify-center space-x-2"
            >
              <Wand2 className="h-5 w-5" />
              <span>Gerar Imagem</span>
            </button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Resultado</h2>
          {imagem ? (
            <div className="space-y-4">
              <img
                src={imagem}
                alt="Imagem gerada"
                className="w-full h-64 object-cover rounded-lg"
              />
              <button className="w-full bg-green-500 text-white p-2 rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center space-x-2">
                <Download className="h-4 w-4" />
                <span>Download</span>
              </button>
            </div>
          ) : (
            <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">
              <p className="text-gray-500">Gere uma imagem para ver o resultado</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Studio;


