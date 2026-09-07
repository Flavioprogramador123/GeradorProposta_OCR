# Identidade do produto — PIENG Propostas

**Nome canônico:** `pieng-propostas`  
**Nome de exibição:** PIENG Propostas  
**Irmão (app separado):** PlanoSol / Teto_sol (`TETO_SOL_BRIDGE_A.md`)

## Já alinhado

| Onde | Valor |
|------|--------|
| `package.json` / lock | `pieng-propostas` |
| Vercel projeto / URL | `pieng-propostas.vercel.app` |
| `vercel.json` → `name` | `pieng-propostas` |
| PWA `manifest.json` | PIENG Propostas Solares |
| Changelog | PIENG PROPOSTAS |

## Ainda legado (adequar quando for)

| Item | Hoje | Alvo |
|------|------|------|
| Pasta no disco | `GeradorProposta_OCR` | `pieng-propostas` |
| Repo GitHub | `…/GeradorProposta_OCR` | `…/pieng-propostas` |
| Badge README | aponta para repo antigo | atualizar após rename no GitHub |
| Workspace Cursor | path antigo | reabrir pasta nova |

## Checklist de rename (manual, ordem sugerida)

1. GitHub → Settings → Rename repository → `pieng-propostas`
2. Local: `git remote set-url origin https://github.com/Flavioprogramador123/pieng-propostas.git`
3. Renomear pasta `GeradorProposta_OCR` → `pieng-propostas` (Explorer / `Rename-Item`)
4. Vercel: conferir se o link do repo acompanhou (em geral sim)
5. Atualizar clones, atalhos, Task Scheduler se apontam path antigo
6. Cursor: File → Open Folder na pasta nova

Não misturar com rename do **Teto_sol** — produtos independentes.

## Tom de marca

- **PIENG Propostas** = comercial (orçamento, proposta, admin V3)
- **PlanoSol / Teto Sol** = visual do telhado  
Juntos via ponte A; vendáveis separados.
