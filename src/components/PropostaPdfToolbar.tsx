import React, { useEffect, useState } from 'react';
import { abrirDialogoPdf } from '@/lib/propostaPdf';

interface PropostaPdfToolbarProps {
  clienteNome?: string;
  slug?: string;
}

const STORAGE_KEY = 'pieng-pdf-toolbar-collapsed';

export default function PropostaPdfToolbar({ clienteNome, slug }: PropostaPdfToolbarProps) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(STORAGE_KEY) === '1') setCollapsed(true);
    } catch {
      /* ignore */
    }
  }, []);

  const persist = (next: boolean) => {
    setCollapsed(next);
    try {
      sessionStorage.setItem(STORAGE_KEY, next ? '1' : '0');
    } catch {
      /* ignore */
    }
  };

  if (collapsed) {
    return (
      <div className="pieng-pdf-toolbar pieng-pdf-toolbar--collapsed no-print">
        <button
          type="button"
          className="pieng-pdf-toolbar__fab"
          onClick={() => persist(false)}
          title="Abrir opções de PDF"
          aria-label="Abrir barra Gerar PDF"
        >
          📄
        </button>
      </div>
    );
  }

  return (
    <div className="pieng-pdf-toolbar no-print" aria-label="Exportar proposta em PDF">
      <button
        type="button"
        className="pieng-pdf-toolbar__close"
        onClick={() => persist(true)}
        title="Fechar barra (melhor para print da tela)"
        aria-label="Fechar barra de PDF"
      >
        ×
      </button>
      <div className="pieng-pdf-toolbar__actions">
        <button
          type="button"
          className="pieng-pdf-toolbar__btn pieng-pdf-toolbar__btn--primary"
          onClick={() => abrirDialogoPdf(clienteNome, slug)}
        >
          📄 Gerar PDF
        </button>
        <button
          type="button"
          className="pieng-pdf-toolbar__btn pieng-pdf-toolbar__btn--secondary"
          onClick={() => window.print()}
        >
          🖨️ Imprimir
        </button>
      </div>
      <div className="pieng-pdf-toolbar__hint">
        Na janela seguinte, escolha <strong>Salvar como PDF</strong> — ideal para enviar a clientes
        que preferem documento.
      </div>
    </div>
  );
}
