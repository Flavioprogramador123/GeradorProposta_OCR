# Política de branch — V3 fechado · V4 para mudanças profundas

**Atualizado:** 07/09/2026 · produção **v2.4.15** em `clean-main`

## Estado atual

| Linha | Status | Branch |
|-------|--------|--------|
| **V3** (orçamento/kit, proposta-auto, preços CD, DC/AC, bridge Gerador) | **Integrado ao sistema global** após testes | Já mergeado em **`clean-main`** |
| **Produção / Vercel** | Auto-deploy | Push em **`clean-main`** |
| **V4** | Próximas mudanças **profundas** | Branch nova (ex. `v4-*`) a partir de `clean-main` |

A branch de trabalho `v3-orcamento` pode ser arquivada ou usada só para hotfixes pontuais alinhados ao que já está em produção. **Não** abrir WIP grande em `v3-orcamento` daqui pra frente.

## O que pode ir direto em `clean-main`

- Correção de bug / ajuste fino do V3 já validado
- Changelog / badge / docs
- Configs e limites já existentes (ex. DC/AC na UI)

## O que vai para V4 (branch temp → merge consolidado)

- Redesign de precificação (ex. nova lógica R$/Wp)
- Consultor V4 (paridade UX com V3) — ver `ROADMAP_CONSULTOR_V4.md`
- Refactors grandes de pipeline, storage, UI admin
- Experimentos de tema/layout que possam regressar o dia
- Integração profunda Teto_sol (embutir app) — **hoje só ponte A** (`TETO_SOL_BRIDGE_A.md`)

Fluxo sugerido: `git checkout -b v4-…` ← `clean-main` → desenvolver → smoke → merge em `clean-main` só quando estável.

## Referências

- Ciclo V3 / DC/AC: `VERSION.md` (v2.4.12 … v2.4.15)
- Módulo: `src/modules/v3/README.md`
- Consultor: `src/data/knowledge/ROADMAP_CONSULTOR_V4.md`
- Restrições cliente: `RESTRICOES_CLIENTE.md`
