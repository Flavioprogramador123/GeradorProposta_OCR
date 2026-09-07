# Ponte A — Gerador PIENG ↔ Teto_sol (produtos separados)

**Status:** ativo (07/09/2026)  
**Modelo:** só link + JSON. Apps independentes; podem ser vendidos separados.

## O que o Gerador envia

Espelha `Teto_sol/src/types.ts`:

- `module` → `ModuleSpec` (`brand`, `model`, `power_w`, `width_m`, `height_m`, `thickness_m`, `gap_m`, `quantity_target`, `rotation_allowed`)
- `etiqueta` → cliente / cidade / data (opcional)

Dimensões L×A: se o orçamento não tem mm, usa catálogo por potência (`src/data/tetoModuleCatalog.json`, espelho do `module_catalog.json` do Teto).

## Como usar

1. **Admin** → card **Teto Sol** (abre o app sozinho, sem orçamento).
2. Ou no **Gerador / Proposta automática**: botão **🏠 Teto Sol** (envia JSON módulo + etiqueta).
3. Abre o PlanoSol (`NEXT_PUBLIC_TETO_SOL_URL`, default `http://localhost:5173`) e, no fluxo com dados, **baixa** `pieng-teto-bridge-….json`.
4. No Teto: recebe via `postMessage` **ou** menu **PIENG JSON**.

## Roadmap (sem acoplar núcleos)

- Agora: simulação visual isolada + ponte JSON opcional.
- Depois: anexar o PNG/PDF do Teto na proposta do cliente (cliente vê módulos no telhado).
- Núcleos permanecem independentes (vendáveis separados).

## Arquivos

| Repo | Arquivo |
|------|---------|
| Gerador | `src/lib/tetoSolBridge.ts`, `src/data/tetoModuleCatalog.json`, card em `admin/index.tsx`, botões em `gerador-rapido.tsx` / `proposta-auto.tsx` |
| Teto_sol | `src/lib/piengBridge.ts`, `applyPiengBridge` no `ProjectContext`, listener em `App.tsx`, botão TopBar |

## Fora de escopo

- Não embutir o Vite no Next.
- Não compartilhar banco/Supabase entre os produtos.
