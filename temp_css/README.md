# temp_css — layout sobrio (candidato)

Pasta para **comparar** o visual atual (Tailwind + 4 paletas) com o layout
**sobrio** (CSS vanilla + DM Sans / JetBrains Mono).

## Arquivos

| Arquivo | Função |
|---------|--------|
| `index.css` | Tema escuro + classes `.card` `.btn` `.field` `.kpi` `.mono` |
| `theme-claro.css` | Overrides claros (`html.theme-claro`) |
| `admin-themes.BACKUP.css` | Cópia do CSS admin **antes** do sobrio (rollback) |
| `preview.html` | Prévia estática isolada (abra no browser) |

No app Next, o tema está em `src/styles/admin-sobrio.css` e aparece no
seletor de paleta como **Sobrio** / **Sobrio claro**.

## Como escolher

1. Em `/admin/configuracoes` → Paleta visual → **Sobrio** ou **Sobrio claro**
2. Compare com Corporativo / Tech / Neutro / Energia
3. Se descartar o sobrio: remova o tema em `adminTheme.ts` + import em `_app.tsx`
   e restaure `admin-themes.css` a partir de `admin-themes.BACKUP.css` se precisar

## Tokens

| Token | Escuro | Claro |
|-------|--------|-------|
| fundo | `#101318` | `#eef2f6` |
| superfície | `#1c232d` | `#ffffff` |
| texto | `#e8edf2` | `#1a2330` |
| muted | `#8b95a3` | `#4b5563` |
| destaque | ouro `#e8a317` | azul `#1d6fa8` |
