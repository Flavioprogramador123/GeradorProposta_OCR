/**
 * Snippet de analytics embutido em HTML estático da proposta.
 * Espelha o track de /proposta/[slug] para links .html diretos.
 */
export function getPropostaAnalyticsScript(slug?: string): string {
  const slugSeguro = (slug || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  if (!slugSeguro) return '';

  return `
<script>
(function () {
  var slug = '${slugSeguro}';
  if (!slug || /pdf=1/.test(location.search)) return;
  var start = Date.now();
  var primeira = new Date().toISOString();
  var scrollMax = 0;
  var cliques = 0;
  var ativoAcum = 0;
  var ativoDesde = Date.now();
  var abaVisivel = document.visibilityState !== 'hidden';
  var sessKey = 'pieng_view_' + slug;
  var novaSessao = true;
  var sessaoContada = false;
  try {
    novaSessao = !sessionStorage.getItem(sessKey);
    if (novaSessao) sessionStorage.setItem(sessKey, '1');
  } catch (e) {}

  function tempoAtivo() {
    var t = ativoAcum;
    if (abaVisivel) t += Math.floor((Date.now() - ativoDesde) / 1000);
    return Math.max(0, t);
  }

  function enviar() {
    var scrollPct = Math.max(
      scrollMax,
      Math.round(
        ((window.scrollY || 0) /
          Math.max(1, document.documentElement.scrollHeight - window.innerHeight)) *
          100
      )
    );
    var contar = novaSessao && !sessaoContada;
    var body = JSON.stringify({
      tempoNaPagina: Math.floor((Date.now() - start) / 1000),
      tempoAtivoSegundos: tempoAtivo(),
      scrollPercentage: scrollPct,
      cliques: cliques,
      primeiraVisualizacao: primeira,
      novaSessao: contar
    });
    fetch('/api/propostas/' + encodeURIComponent(slug) + '/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body,
      keepalive: true
    })
      .then(function () {
        if (contar) sessaoContada = true;
      })
      .catch(function () {});
  }

  document.addEventListener('visibilitychange', function () {
    var v = document.visibilityState === 'visible';
    if (!v && abaVisivel) {
      ativoAcum += Math.floor((Date.now() - ativoDesde) / 1000);
      abaVisivel = false;
      enviar();
    } else if (v && !abaVisivel) {
      ativoDesde = Date.now();
      abaVisivel = true;
    }
  });
  window.addEventListener(
    'scroll',
    function () {
      var pct = Math.round(
        ((window.scrollY || 0) /
          Math.max(1, document.documentElement.scrollHeight - window.innerHeight)) *
          100
      );
      if (pct > scrollMax) scrollMax = pct;
    },
    { passive: true }
  );
  document.addEventListener('click', function () {
    cliques++;
  });
  setInterval(enviar, 15000);
  window.addEventListener('pagehide', enviar);
  setTimeout(enviar, 2500);
})();
</script>`;
}

export function injectPropostaAnalytics(html: string, slug?: string): string {
  const snippet = getPropostaAnalyticsScript(slug);
  if (!snippet) return html;
  if (html.includes('pieng_view_') && html.includes('/track')) return html;
  if (html.includes('</body>')) {
    return html.replace('</body>', `${snippet}\n</body>`);
  }
  return html + snippet;
}
