import React from 'react';
import { abrirDialogoPdf } from '@/lib/propostaPdf';

interface PropostaPdfToolbarProps {
  clienteNome?: string;
  slug?: string;
}

export default function PropostaPdfToolbar({ clienteNome, slug }: PropostaPdfToolbarProps) {
  return (
    <div className="pieng-pdf-toolbar no-print" aria-label="Exportar proposta em PDF">
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
