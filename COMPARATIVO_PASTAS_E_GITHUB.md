# Comparativo: qual pasta está mais atualizada?

## Resumo

| Local | Situação | Recomendação |
|-------|----------|--------------|
| **c:\Projetos\Prompt_ORC_pieng** | Atualizado, com Git e alinhado ao GitHub | **Use esta como fonte principal** |
| **I:\Meu Drive\Prompt_ORC_pieng** | Cópia incompleta/desatualizada (sem `solar_calculator.py`) | Não usar como referência de código |
| **GitHub** (GeradorProposta_OCR) | Mesmo estado que `c:\Projetos\Prompt_ORC_pieng` | Fonte de verdade para backup e colaboração |

---

## 1. c:\Projetos\Prompt_ORC_pieng (pasta local do projeto)

- **Git:** repositório válido, branch `clean-main`.
- **Último commit:** `cd05075` — 12/12/2025 — *v2.4.1: Sistema de Logos Profissional*
- **Remote:** `origin` → https://github.com/Flavioprogramador123/GeradorProposta_OCR.git
- **Arquivos Python presentes:**
  - `python/solar_calculator.py` (calculadora solar)
  - `src/lib/sistema_pieng_completo.py`
  - `src/lib/sistema_pieng_templates_dinamicos.py`
- **Conclusão:** Esta é a pasta que está com o processo mais atualizado e é a que o programa da tela usa.

---

## 2. I:\Meu Drive\Prompt_ORC_pieng (Google Drive)

- **Git:** a pasta tem uma pasta `.git`, mas o comando `git` não reconhece como repositório (pode ser cópia incompleta ou sincronização do Drive).
- **Arquivos Python:** na pasta `python` **não existe** `solar_calculator.py`; só existe a subpasta `tests`.
- **Conclusão:** Cópia desatualizada ou incompleta. Não use como referência para os scripts Python do projeto.

---

## 3. GitHub (origin/clean-main)

- **Branch principal:** `clean-main` (HEAD do remote).
- **Último commit em origin/clean-main:** mesmo que o local (`cd05075`, 12/12/2025).
- **Conclusão:** O repositório local `c:\Projetos\Prompt_ORC_pieng` está em dia com o GitHub.

---

## Onde o programa “da tela” busca os Python

O backend (Next.js/Node) usa apenas:

- `python/solar_calculator.py` (via `src/lib/python-calculator.ts` e `src/pages/api/orcamentos/[cliente]/processar-modular.ts`).

Os arquivos em `src/lib/*.py` (`sistema_pieng_completo.py`, `sistema_pieng_templates_dinamicos.py`) existem no repositório mas **não** são chamados pelo fluxo atual da aplicação; o fluxo ativo usa o template engine em TypeScript e o `solar_calculator.py` para cálculos.

---

## Recomendações

1. **Trabalhar sempre em:** `c:\Projetos\Prompt_ORC_pieng`.
2. **Fonte de verdade e backup:** GitHub (GeradorProposta_OCR, branch `clean-main`).
3. **Drive:** se quiser manter uma cópia atualizada no Drive, use clone ou cópia a partir de `c:\Projetos\Prompt_ORC_pieng` (ou um push no GitHub + clone no Drive), garantindo que a pasta `python` tenha o `solar_calculator.py` e o restante do projeto.

---

*Arquivo gerado em 20/02/2026 com base na análise do repositório e das pastas.*
