/**
 * Roda DENTRO do browser (Playwright page.evaluate).
 * Arquivo .js puro — evita __name do tsx/esbuild.
 *
 * Preferência: cards oficiais SOOLLAR
 *   [data-testid="product-card"]
 *     [data-testid="product-name"]
 *     [data-testid="product-price"]  → ex. R$ 492,00 (módulo 600W)
 *   + texto "Estoque disponível: N"
 */
module.exports = function extractSoolarDomSnapshot(estoqueMin) {
  function parseEstoque(texto) {
    if (/apenas em outro\s*cd/i.test(texto)) return null;
    var patterns = [
      /estoque dispon[ií]vel:\s*(\d+)/i,
      /estoque[^0-9]{0,12}(\d+)/i,
      /dispon[ií]ve(?:l|is)?[^0-9]{0,12}(\d+)/i,
      /(\d+)\s*(?:un|und|unid|unidades)\b/i,
      /qtd[^0-9]{0,8}(\d+)/i,
      /saldo[^0-9]{0,8}(\d+)/i,
    ];
    for (var i = 0; i < patterns.length; i++) {
      var m = texto.match(patterns[i]);
      if (m) return parseInt(m[1], 10);
    }
    return null;
  }

  function parsePreco(texto) {
    var m = String(texto || '').match(/R\$\s*[\d.]+(?:,\d{2})?/);
    return m ? m[0] : undefined;
  }

  var todos = [];
  var seen = {};

  // --- 1) Fonte oficial: product-card + product-price / product-name ---
  var cards = Array.from(document.querySelectorAll('[data-testid="product-card"]'));
  for (var c = 0; c < cards.length; c++) {
    var card = cards[c];
    var nameEl = card.querySelector('[data-testid="product-name"]');
    var priceEl = card.querySelector('[data-testid="product-price"]');
    var nome = (nameEl && nameEl.textContent ? nameEl.textContent : '').replace(/\s+/g, ' ').trim();
    if (!nome) {
      var img = card.querySelector('img[alt*="produto" i], img[alt*="Imagem" i]');
      if (img && img.alt) {
        nome = String(img.alt)
          .replace(/^Imagem do produto\s+/i, '')
          .replace(/\s+/g, ' ')
          .trim();
      }
    }
    var preco = priceEl ? parsePreco(priceEl.textContent) : parsePreco(card.textContent);
    var cardText = (card.textContent || '').replace(/\s+/g, ' ').trim();
    var estoque = parseEstoque(cardText);
    var outroCd = /apenas em outro\s*cd/i.test(cardText);
    var checkAvail = Boolean(card.querySelector('[data-testid="check-availability-button"]'));

    if (!nome || nome.length < 4) continue;
    var motivoIgnorado = null;
    if (outroCd || checkAvail) {
      estoque = null;
      motivoIgnorado = 'outro_cd';
    } else if (preco && (estoque == null || estoque <= estoqueMin)) {
      motivoIgnorado = 'estoque_baixo';
    } else if (!preco) {
      motivoIgnorado = 'sem_preco';
    }

    var key = 'card|' + nome + '|' + preco + '|' + estoque;
    if (seen[key]) continue;
    seen[key] = true;

    todos.push({
      texto: nome,
      preco: preco,
      estoque: estoque,
      valido: estoque != null && estoque > estoqueMin && Boolean(preco),
      motivoIgnorado: motivoIgnorado,
      fonte: 'product-card',
    });
  }

  // --- 2) Fallback heurístico (páginas sem testid) ---
  if (todos.length === 0) {
    var nodes = Array.from(
      document.querySelectorAll(
        'article, li, tr, [class*="card"], [class*="Card"], [class*="product"], [class*="Product"], [class*="item"], [class*="MuiCard"], [class*="MuiGrid-item"], [class*="MuiBox-root"]'
      )
    );

    for (var n = 0; n < Math.min(nodes.length, 400); n++) {
      var texto = (nodes[n].textContent || '').replace(/\s+/g, ' ').trim();
      if (texto.length < 12 || texto.length > 500) continue;
      if (!/wp|kw|inversor|m[oó]dulo|painel|estrutura|cabo|string|pre[cç]o|R\$|estoque/i.test(texto)) continue;
      var estoque2 = parseEstoque(texto);
      var preco2 = parsePreco(texto);
      if (!preco2 && estoque2 == null) continue;
      var key2 = texto.slice(0, 80) + '|' + preco2 + '|' + estoque2;
      if (seen[key2]) continue;
      seen[key2] = true;
      todos.push({
        texto: texto.slice(0, 220),
        preco: preco2,
        estoque: estoque2,
        valido: estoque2 != null && estoque2 > estoqueMin && Boolean(preco2),
        fonte: 'heuristic',
      });
    }

    var bodyText = (document.body && document.body.innerText) || '';
    var blocks = bodyText.split(/Estoque dispon[ií]vel:\s*/i);
    for (var b = 1; b < blocks.length && b < 80; b++) {
      var estNum = parseInt(blocks[b], 10);
      if (!isFinite(estNum)) continue;
      var before = blocks[b - 1].slice(-300);
      var preco3 = parsePreco(before + ' Estoque disponível: ' + blocks[b].slice(0, 20));
      var linhas = before
        .split('\n')
        .map(function (l) {
          return l.trim();
        })
        .filter(function (l) {
          return l.length > 8 && l.length < 160 && !/^R\$/.test(l);
        });
      var nome2 = linhas.length ? linhas[linhas.length - 1] : before.slice(-120);
      var texto3 = (nome2 + ' ' + (preco3 || '') + ' Estoque disponível: ' + estNum).replace(/\s+/g, ' ').trim();
      var key3 = nome2 + '|' + preco3 + '|' + estNum;
      if (seen[key3]) continue;
      seen[key3] = true;
      todos.push({
        texto: texto3.slice(0, 220),
        preco: preco3,
        estoque: estNum,
        valido: estNum > estoqueMin && Boolean(preco3),
        fonte: 'estoque-split',
      });
    }
  }

  var validos = todos.filter(function (t) {
    return t.valido;
  });
  var bodyAll = (document.body && document.body.innerText) || '';
  var moneyAll = bodyAll.match(/R\$\s*[\d.]+(?:,\d{2})?/g) || [];

  return {
    moneyAll: moneyAll.slice(0, 40),
    moneyValidos: validos
      .map(function (v) {
        return v.preco;
      })
      .filter(Boolean),
    produtosValidos: validos.slice(0, 80),
    produtosIgnorados: todos
      .filter(function (t) {
        return !t.valido;
      })
      .slice(0, 80),
    cardsEncontrados: cards.length,
    storage: {
      cdSlug: localStorage.getItem('cd-slug'),
      cd: localStorage.getItem('distribution-center'),
      hasToken: Boolean(localStorage.getItem('auth-token')),
    },
    sample: bodyAll.slice(0, 500),
  };
};
