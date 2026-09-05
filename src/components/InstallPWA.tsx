import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPWA() {
  const [mounted, setMounted] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Registrar Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('✅ Service Worker registrado:', registration.scope);
        })
        .catch((error) => {
          console.error('❌ Erro ao registrar Service Worker:', error);
        });
    }

    // Detectar se o app já está instalado
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      console.log('✅ PWA já instalado!');
    }

    // Capturar o evento beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowInstallButton(true);
      console.log('📱 PWA pode ser instalado!');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Detectar quando o app foi instalado
    window.addEventListener('appinstalled', () => {
      console.log('✅ PWA foi instalado!');
      setIsInstalled(true);
      setShowInstallButton(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      return;
    }

    // Mostrar o prompt de instalação
    deferredPrompt.prompt();

    // Aguardar a escolha do usuário
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`Usuário ${outcome === 'accepted' ? 'aceitou' : 'recusou'} instalar o PWA`);

    if (outcome === 'accepted') {
      setShowInstallButton(false);
    }

    setDeferredPrompt(null);
  };

  // Evita hydration mismatch (SSR ≠ browser / PWA standalone)
  if (!mounted) {
    return null;
  }

  // Não mostrar nada se já estiver instalado
  if (isInstalled) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 flex items-center gap-3">
        <span className="text-2xl">✅</span>
        <div className="flex-1">
          <p className="font-semibold text-green-800">App instalado!</p>
          <p className="text-sm text-green-600">O PIENG Propostas está instalado no seu dispositivo.</p>
        </div>
      </div>
    );
  }

  // Não mostrar botão se o navegador não suportar ou já instalou
  if (!showInstallButton) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4 mb-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="text-3xl">📱</span>
        <div className="flex-1">
          <h3 className="font-bold text-amber-900 mb-1">Instalar App</h3>
          <p className="text-sm text-amber-700 mb-3">
            Instale o PIENG Propostas no seu celular ou computador para acesso rápido e uso offline!
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleInstallClick}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg font-semibold hover:shadow-lg transition-all hover:scale-105"
            >
              ⚡ Instalar Agora
            </button>
            <button
              onClick={() => setShowInstallButton(false)}
              className="px-4 py-2 bg-white text-amber-700 border border-amber-300 rounded-lg font-medium hover:bg-amber-50 transition-all"
            >
              Agora não
            </button>
          </div>
        </div>
      </div>

      {/* Instruções para iOS (não suporta beforeinstallprompt) */}
      <div className="mt-3 pt-3 border-t border-amber-200">
        <p className="text-xs text-amber-600 font-medium mb-1">📱 iOS/Safari:</p>
        <p className="text-xs text-amber-600">
          Toque no botão <strong>Compartilhar</strong> e selecione <strong>"Adicionar à Tela Inicial"</strong>
        </p>
      </div>
    </div>
  );
}
