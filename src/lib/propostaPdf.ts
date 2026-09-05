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

/** Remove barra Gerar PDF / Imprimir (HTML antigo embutido). Cliente final não deve ver. */
export function stripPdfToolbar(html: string): string {
  return html
    .replace(/<div[^>]*id=["']pieng-pdf-toolbar["'][\s\S]*?<\/script>/i, '')
    .replace(/<div[^>]*class=["'][^"']*pieng-pdf-toolbar[^"']*["'][\s\S]*?(?:<\/div>\s*){3}/i, '');
}

/**
 * CSS de impressão + auto-print em ?pdf=1.
 * Sem botões na tela — a barra fica só na rota /proposta com ?from=admin.
 */
export function injectPdfSupport(html: string, clienteNome?: string, slug?: string): string {
  html = stripPdfToolbar(html);

  const nomeSeguro = (clienteNome || 'Cliente').replace(/'/g, "\\'");
  const slugSeguro = (slug || '').replace(/'/g, "\\'");
  const printCss = '<link rel="stylesheet" href="/styles/proposta-print.css" />';
  const autoPrintScript = `
<script>
  (function () {
    if (new URLSearchParams(window.location.search).get('pdf') !== '1') return;
    window.addEventListener('load', function () {
      setTimeout(async function () {
        document.body.classList.add('proposta-pdf-mode');
        document.title = 'proposta-pieng-' + ('${slugSeguro}' || '${nomeSeguro}' || 'cliente')
          .toLowerCase().replace(/[^a-z0-9-_]+/g, '-');
        try {
          if (document.fonts && document.fonts.ready) await document.fonts.ready;
        } catch (e) {}
        window.dispatchEvent(new Event('resize'));
        setTimeout(function () {
          window.dispatchEvent(new Event('resize'));
          window.print();
        }, 900);
        window.addEventListener('afterprint', function onAfterPrint() {
          document.body.classList.remove('proposta-pdf-mode');
          window.removeEventListener('afterprint', onAfterPrint);
        });
      }, 1000);
    });
  })();
</script>`;

  if (html.includes('</head>') && !html.includes('proposta-print.css')) {
    html = html.replace('</head>', `${printCss}\n</head>`);
  }
  if (html.includes('</body>')) {
    html = html.replace('</body>', `${autoPrintScript}\n</body>`);
  }
  return html;
}
