/** Utilitários para exportar proposta como PDF (via impressão do navegador) */

export function buildPropostaPdfUrl(slug: string, autoPrint = false): string {
  return autoPrint ? `/proposta/${slug}?pdf=1` : `/proposta/${slug}`;
}

export function sanitizePdfFilename(nome: string, slug?: string): string {
  const base = (nome || slug || 'proposta')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
  return `proposta-pieng-${base || 'cliente'}.pdf`;
}

export function abrirDialogoPdf(clienteNome?: string, slug?: string): void {
  if (typeof window === 'undefined') return;

  document.body.classList.add('proposta-pdf-mode');

  const sugestao = sanitizePdfFilename(clienteNome || '', slug);
  document.title = sugestao.replace('.pdf', '');

  const limpar = () => {
    document.body.classList.remove('proposta-pdf-mode');
    window.removeEventListener('afterprint', limpar);
  };
  window.addEventListener('afterprint', limpar);

  // Espera fontes carregarem + garante um "resize" final antes de imprimir.
  // Isso reduz casos em que o layout sai menor/quebrado no PDF salvo.
  (async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fontsReady = (document as any).fonts?.ready;
      if (fontsReady && typeof fontsReady.then === 'function') {
        await fontsReady;
      }
    } catch {
      // ignore
    }

    // Redimensiona gráficos Recharts antes de imprimir
    window.dispatchEvent(new Event('resize'));
    window.setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
      window.print();
    }, 900);
  })();
}

export function getPdfToolbarHtml(clienteNome?: string, slug?: string): string {
  const nomeSeguro = (clienteNome || 'Cliente').replace(/'/g, "\\'");
  const slugSeguro = (slug || '').replace(/'/g, "\\'");
  return `
<div id="pieng-pdf-toolbar" class="pieng-pdf-toolbar no-print" aria-label="Exportar proposta em PDF">
  <div class="pieng-pdf-toolbar__actions">
    <button type="button" class="pieng-pdf-toolbar__btn pieng-pdf-toolbar__btn--primary"
      onclick="window.__piengGerarPdf && window.__piengGerarPdf('${nomeSeguro}', '${slugSeguro}')">
      📄 Gerar PDF
    </button>
    <button type="button" class="pieng-pdf-toolbar__btn pieng-pdf-toolbar__btn--secondary"
      onclick="window.print()">
      🖨️ Imprimir
    </button>
  </div>
  <div class="pieng-pdf-toolbar__hint">
    Na janela seguinte, escolha <strong>Salvar como PDF</strong> — ideal para clientes que preferem documento.
  </div>
</div>
<script>
  window.__piengGerarPdf = async function(nome, slug) {
    document.body.classList.add('proposta-pdf-mode');
    var sugestao = 'proposta-pieng-' + (slug || nome || 'cliente').toLowerCase().replace(/[^a-z0-9-_]+/g, '-');
    document.title = sugestao;

    try {
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }
    } catch (e) {}

    window.dispatchEvent(new Event('resize'));
    setTimeout(function() {
      window.dispatchEvent(new Event('resize'));
      window.print();
    }, 900);

    window.addEventListener('afterprint', function onAfterPrint() {
      document.body.classList.remove('proposta-pdf-mode');
      window.removeEventListener('afterprint', onAfterPrint);
    });
  };
  if (new URLSearchParams(window.location.search).get('pdf') === '1') {
    window.addEventListener('load', function() {
      setTimeout(function() { window.__piengGerarPdf('${nomeSeguro}', '${slugSeguro}'); }, 1000);
    });
  }
</script>`;
}

export function injectPdfSupport(html: string, clienteNome?: string, slug?: string): string {
  const printCss =
    '<link rel="stylesheet" href="/styles/proposta-print.css" />';
  const toolbar = getPdfToolbarHtml(clienteNome, slug);

  if (html.includes('</head>')) {
    html = html.replace('</head>', `${printCss}\n</head>`);
  }
  if (html.includes('</body>')) {
    html = html.replace('</body>', `${toolbar}\n</body>`);
  }
  return html;
}
