# CSS em estudo (não produção)

Skins editoriais (`proposta-skin-*.css`) isolados em **v2.4.11**.

O pipeline de proposta ao cliente usa o **layout clássico** (`globals.css` + CSS do template / componentes). Estes arquivos **não** são linkados em `/proposta/[slug]` nem pelo `templateEngine`.

Para testar um skin no futuro: copiar de volta para `public/styles/` e linkar só em lab — não reativar como default sem decisão explícita.
