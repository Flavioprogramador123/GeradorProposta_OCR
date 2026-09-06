# Variantes de template — marketing de cores e tema

Documento de conhecimento para propostas por segmento (comercial, rural, etc.).

## v2.4.12 — Fechamento V3 + clássico

- Edição de kit na proposta automática: ver `V3_PROPOSTA_AUTO_EDICAO_KIT.md`
- Produção continua **layout clássico**; skins em `_estudo/`
- **V4** (próximas melhorias de layout/tema): branch temp, merge só consolidado

## v2.4.11 — Produção = layout clássico

Skins editoriais (`proposta-skin-alt`, navy, tecnologia) foram **isolados** em `public/styles/_estudo/`.

**Modelo atual:**
1. **Produção** = layout clássico (`globals.css` + template/componentes) — sem skin-alt
2. **Variantes de cor** (residencial, panificadora, etc.) = **em estudo** — só `?template=` / modal lab
3. Skins em `_estudo/` = arquivo morto até decisão futura (podem ser apagados depois)

## Histórico breve

- **v2.4.9**: skin-alt como default (cobre/teal) — piloto
- **v2.4.8**: variantes temáticas pesadas (gradiente + emoji) — não aprovadas como layout inteiro
- **v2.4.11**: revert — clássico de volta
- **v2.4.12**: V3 edição kit + política branch V4

## Técnica (70 · 20 · 10) — referência dos skins em estudo

| Fatia | Papel | Skin alt (estudo) |
|------:|-------|-------------------|
| **70%** | Atmosfera | Paper + grid |
| **20%** | Leitura | Sheet / ink |
| **10%** | Conversão | Teal + cobre CTA |

## Status

| Item | Status |
|------|--------|
| Layout clássico | ✅ Produção |
| `proposta-skin-*.css` | 📦 `_estudo/` |
| Variantes comerciais/rural | 🔬 Lab (`?template=`) |

## Arquivos

- Clássico: `src/styles/globals.css`, templateEngine, componentes React
- Estudo: `public/styles/_estudo/`
- Política: `src/lib/propostaTemplatePolicy.ts`
- Print: `PROPOSTA_PRINT_PDF.md`
