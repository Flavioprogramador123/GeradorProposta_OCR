# 📌 PIENG PROPOSTAS - CONTROLE DE VERSÃO

## 🎯 **VERSÃO ATUAL: v2.4.5** (04/09/2026)

---

## 📋 **HISTÓRICO DE VERSÕES**

### **v2.4.5** - 04/09/2026 ✅ **ATUAL** (branch `v3-orcamento`)
**🎨 UI Admin / navegação / coerência comercial:**
- ✅ Tema admin azul tecnologia (`#070f1c` → `#0b2a4a`) + cards `slate-100`
- ✅ **3 paletas CSS** (`admin-themes.css`): Corporativo · Tecnologia · Solar — seletor no Admin/Configurações (localStorage)
- ✅ Botões **Admin** + **Voltar** padronizados no topo das telas
- ✅ Hub **Módulo V3** removido — atalhos no `/admin` (orçamento base, proposta auto, preços, equipamentos)
- ✅ `/admin/v3` redireciona para `/admin`; seed YAML na tela Equipamentos
- ✅ Tag do card PIX = `(à vista − PIX) / PIX` (ex.: mult 1,117943 → ~12%; 1,11 → 11%) + `formatBRL`
- ✅ Taxa cartão mensal editável regenera multiplicadores; à vista = total 12×

**📦 Arquivos principais:** `admin-themes.css`, `adminTheme.ts`, `AdminThemePicker`, `admin/index.tsx`, `configuracoes.tsx`, `tabelaJurosCartao.ts`, `SystemCard.tsx`, `templateEngine*.ts`, `gerar-proposta.ts`, páginas `admin/v3/*`, `soollar-captura.tsx`, `gerador-rapido.tsx`

---

### **v2.4.4** - 04/09/2026 (branch `v3-orcamento` — WIP local)
**🔙 Rollback se der errado:**
- Último commit estável no remoto: `433815f` (`✨ V3 orçamento: captura SOOLLAR, preços por CD, agenda e dados rejeitados`)
- Desfazer só as mudanças desta sessão (working tree):
  ```bash
  git checkout 433815f -- src/pages/admin/v3/precos.tsx src/pages/admin/configuracoes.tsx src/utils/configuracoes.ts src/data/sistema/configuracoes.json src/modules/v3/precos/ src/lib/soollar/scraper.ts src/pages/api/admin/config.ts src/pages/api/v3/precos/index.ts src/pages/api/v3/proposta-auto.ts src/pages/api/admin/soollar/captura.ts src/components/ConsultorConfigPanel.tsx src/pages/admin/v3/equipamentos.tsx src/modules/v3/orcamentos/ src/modules/v3/equipamentos/seedFromYaml.ts src/modules/v3/README.md VERSION.md
  # remover arquivos novos desta sessão se necessário:
  # git clean -n -- src/modules/v3/precos/estoqueMinimosConfig.ts src/modules/v3/precos/regrasCaptura.ts src/modules/v3/orcamentos/skuCanonico.ts
  ```
- Voltar o branch inteiro ao commit estável (descarta WIP não commitado):
  ```bash
  git reset --hard 433815f
  ```
  ⚠️ `reset --hard` apaga alterações locais não commitadas.

---

#### 📘 PREMISSAS V3 — fonte de verdade (não perder)

Espelho no código: `src/modules/v3/README.md` · `regrasCaptura.ts` · `kitEngine.ts` · `skuCanonico.ts` · `kits_regras` (SQLite) · `/admin/configuracoes`.

##### 1) Estoque (preço válido)
| Categoria | Regra | Onde editar |
|-----------|--------|-------------|
| Módulos | estoque **>** `estoqueMinimoSoolar` (padrão **20**) | `/admin/configuracoes` → Técnico |
| Demais (inversor, cabo, estrutura, MC4, DPS…) | estoque **>** `estoqueMinimoOutros` (padrão **5**) | idem |
| Código | `estoqueMinimosConfig.ts` + `getEstoqueMinimoPorCategoria` | |

##### 2) Lista principal vs consulta (whitelist captura)
**Entram como ativos (`ativo=1`) — lista principal:**
- Todos os **módulos**
- **Inversores / micro** com potência **≤ 30 kW**
- **Estrutura:** `TRILHO`; `PERFIL` de fixação de módulo (exceto junção); kits **INOX** (kit/estrutura/grampo/suporte/fixa)
- **Cabo:** somente `CABO SOLAR` em bobinas **25 / 50 / 100 m** (não cabo flexível)
- **Conector:** `MC4`
- **Proteção:** `DPS` (exclui filtro de linha / tomada / carregador)

**Demais → consulta** (`ativo=0` + rejeitados motivo `consulta`).  
Arquivo: `src/modules/v3/precos/regrasCaptura.ts`.

##### 3) Scraping SOOLLAR
- Seções: `modulos`, `inversores`, `estruturas-inox`, `estrutura-galvanizada`, `cabos`, `componentes-eletricos`
- 1 sessão × até 3 CDs (Aeroporto / Matriz / Feira)
- Piso no scrape = `min(módulo, demais)` da config; regra fina por categoria no import
- UI captura: `/admin/soollar-captura` (+ atalho no painel de `/admin/v3/precos`)

##### 4) Montagem do orçamento base (3a) — `sugerirComplementos`
**Estrutura / trilho (composição de preço; qtd final no fechamento da compra):**
| Item | Fórmula | Default sugerido (SKU real) |
|------|---------|-----------------------------|
| Kit estrutura | `ceil(módulos / 4)` | `EST-AUTO-391003` — fibro + **parafuso inox madeira** 4 mód |
| Trilho / perfil | **1 por módulo** | `EST-AUTO-52835` — perfil **fibro/cerâmica** 2,40 m |
| Trilho 2,36 vs 2,50 | Wp módulo ≤ 690 → `TRILHO-236`; acima → `TRILHO-250` (ambos resolvem p/ fibro 2,40 por enquanto) | `kits_regras.trilho_236_ate_wp` |

**Microinversor:**
| Item | Fórmula |
|------|---------|
| Strings | ≈ qtd módulos |
| MC4 kits | `ceil(max(0, módulos − micros) / 2)` — pacote = 2 pares (`MC4-PAR` → `MC4-AUTO-440111`) |
| Cabo preto 25 m | `max(0, micros − 1)` → `CAB-AUTO-97081` |
| Cabo vermelho | **0** (omitido) |

Ex.: 2 micros · 8 módulos → 6 pares → **3** MC4; **1** bola preta; **2** kits estrutura; **8** trilhos.

**Inversor string:**
| Item | Fórmula |
|------|---------|
| Strings | 3–7,5 kW → 1; ≤12 → 2; ≤20 → 3; senão `ceil(kW/7.5)` × qtd inversores |
| MC4 kits | = nº de strings |
| Cabo V + P 25 m | 1 vermelho + 1 preto **por string** |

**Observação comercial:** defaults fibro/inox são **só para preço**; troca de tipo de telha / qtd no fechamento é manual no card (`editado_manual` prevalece).

##### 5) Mapa SKU canônico → SOOLLAR (`skuCanonico.ts`)
| Canônico | Preferência atual |
|----------|-------------------|
| `KIT-ESTRUTURA-4MOD` | `EST-AUTO-391003` (fibro inox madeira) |
| `TRILHO-236` / `TRILHO-250` | `EST-AUTO-52835` (perfil fibro/cerâmica) |
| `MC4-PAR` | `MC4-AUTO-440111` |
| `CABO-4MM-25-V` | `CAB-AUTO-97082` |
| `CABO-4MM-25-P` | `CAB-AUTO-97081` |

##### 6) Parâmetros técnicos / comerciais (admin)
| Premissa | Campo | Padrão |
|----------|-------|--------|
| Eficiência adicional micro-inversores | `bonusMicroPercent` (label em Configurações) | 5% |
| Placas por micro | `placasPorMicro` | 4 |
| HSP / PR / dias mês / tarifa | configs sistema | ver `/admin/configuracoes` |
| Micro com **maior Wp** no mesmo nº de placas é mais eficiente | aprendizado 4a/5a | v2.4.3 |

##### 7) `kits_regras` (SQLite V3)
| Chave | Valor padrão | Significado |
|-------|--------------|-------------|
| `estrutura_modulos_por_kit` | 4 | módulos por kit estrutura |
| `trilho_236_ate_wp` | 690 | até este Wp usa trilho “236” |
| `trilho_250_apartir_wp` | 700 | (referência) Wp altos |
| `cabo_25m_por_string` | 1 | 1 V + 1 P por string (string) |
| `mc4_pares_por_kit` | 2 | pares por SKU MC4-PAR |
| `estoque_minimo_preco` | 20 | legado; estoque vivo vem da config admin |

##### 8) Simulação de pagamento (proposta)
| Premissa | Regra |
|----------|--------|
| CTA do card | **OUTRAS FORMAS DE PAGAMENTO** (não “escolher esta opção”) |
| Base | Valor **PIX** do sistema |
| Entrada | R$ livre (0 até PIX); restante = PIX − entrada |
| Cartão | **2× a 18×** (`tabelaJurosCartao.ts`); padrão **12×** |
| Superfícies | HTML (`templateEngine*`) + React `SystemCard` / `FormasPagamentoModal` |

##### 9) Precificação comercial (PIX → cartão)
| Conceito | Fórmula |
|----------|---------|
| PIX | Menor valor (= kit + frete + pdespesa no Gerador/V3) |
| Taxa mensal | Config `taxaCartaoMensal` (calibração **1,51%** a.m. da maquininha) |
| Multiplicadores 2×–18× | Escala da tabela calibrada: `1 + (mRef−1)×(taxa/1,51)` |
| 1× | MDR fixo da calibração (na máquina não exibia “Taxa 1,51%”) |
| À vista (âncora) | Total **12×** = PIX × mult(12) |
| Riscado | `PIX × markup` (`fatorParcelado`) |
| Fonte | `buildMultiplicadoresFromTaxa` / `calcularPrecosDePix` |

---

**📦 Premissas de estoque → Configurações gerais (`/admin/configuracoes`):**
- ✅ Campos **Estoque mínimo — módulos** (`estoqueMinimoSoolar`, padrão 20) e **Estoque mínimo — demais itens** (`estoqueMinimoOutros`, padrão 5)
- ✅ V3 lê esses valores na validação de preço/estoque
- ✅ Arquivo: `src/modules/v3/precos/estoqueMinimosConfig.ts`
- ✅ Em local, salvar config no Supabase também espelha `src/data/sistema/configuracoes.json`

**🔧 3a Orçamento base — SKUs canônicos → captura SOOLLAR:**
- ✅ `skuCanonico.ts` + defaults fibro inox madeira / perfil fibro (ver tabela §4–5 acima)
- ✅ Trilho **1 por módulo**; whitelist inclui `PERFIL` de fixação
- ✅ Complementos entram no custo com preço válido

**💳 Simulação de pagamento (substitui “ESCOLHER ESTA OPÇÃO”):**
- ✅ CTA nos cards → **OUTRAS FORMAS DE PAGAMENTO**
- ✅ Modal: **entrada (R$)** + restante no **cartão 2×–18×** (tabela maquininha; padrão 12×)
- ✅ Base = valor **PIX**; tabela mostra parcela e total por N; total geral = entrada + cartão
- ✅ HTML gerado: `templateEngine.ts` / `templateEngineVariants.ts` + `getFormasPagamentoModalScript()`
- ✅ React `/proposta/[slug]`: `SystemCard.tsx` + `FormasPagamentoModal.tsx` (mesma lógica)
- ✅ Fonte: `src/lib/tabelaJurosCartao.ts` (`PARCELAS_CARTAO_MIN=2`, `MAX=18`)

**🧾 Config / pdespesa (Gerador · V3 proposta-auto):**
- ✅ GET `/api/admin/config` em **local** faz merge **arquivo ⊃ Supabase** (save em JSON deixa de “sumir” no reload)
- ✅ `proposta-auto` aplica pdespesa/frete/HSP/tarifa de `/admin/configuracoes` na carga
- ⚠️ Save no Supabase ainda falha com **RLS** (`new row violates row-level security`) — rodar `sql/fix_rls_configuracoes.sql` no Dashboard
- ✅ Enquanto RLS não corrigir: local grava em `src/data/sistema/configuracoes.json` e a 4a lê esse valor

**💳 Premissa PIX / cartão (anti-divergência de prestação):**
- ✅ **PIX** = menor valor; **à vista** = total **12×** da maquininha
- ✅ Taxa mensal editável `taxaCartaoMensal` (padrão **1,51%** — prints da máquina); regenera 2×–18×
- ✅ Em `/admin/configuracoes` Comercial: campo taxa + preview ao vivo (ex. 1,49%)
- ✅ `buildMultiplicadoresFromTaxa` em `tabelaJurosCartao.ts`; Gerador / modal / HTML usam a taxa salva
- ✅ Ao salvar, espelha `fator12x`/`fator18x` a partir da taxa vigente

**🏷️ Labels / UX:**
- ✅ “Bônus Micro-inversor (%)” → **Eficiência adicional Micro-inversores**
- ✅ Em `/admin/v3/precos`, link para Configurações (estoque)
- ✅ Painel “Captura, rejeitados e agenda” + botão **Captura SOOLLAR (Chromium)**
- ✅ Checkbox 3a: “Sugerir estrutura fibro inox / perfil / cabos / MC4…”

**📋 Whitelist / captura V3:**
- ✅ `regrasCaptura.ts` (ver §2)
- ✅ Auto-cadastro ampliado + seção `componentes-eletricos`
- ✅ Filtros em preços por seção/CD; lista só ativos
- ✅ Equipamentos: Ativos/Inativos + ativar

**📦 Arquivos principais tocados (v2.4.4):**
- `src/utils/configuracoes.ts`, `src/data/sistema/configuracoes.json`, `src/pages/admin/configuracoes.tsx`
- `src/modules/v3/precos/regrasCaptura.ts`, `estoqueMinimosConfig.ts`, `repository.ts`, `importCatalog.ts`, `capturaJob.ts`
- `src/modules/v3/orcamentos/skuCanonico.ts`, `kitEngine.ts`, `src/modules/v3/README.md`
- `src/pages/admin/v3/precos.tsx`, `equipamentos.tsx`, `orcamento-base.tsx`
- `src/lib/soollar/scraper.ts`, `src/pages/api/admin/config.ts`, `src/pages/api/v3/precos/index.ts`
- `src/components/ConsultorConfigPanel.tsx`, `src/modules/v3/equipamentos/seedFromYaml.ts`, `VERSION.md`
- `src/lib/tabelaJurosCartao.ts`, `src/lib/templateEngine.ts`, `src/lib/templateEngineVariants.ts`
- `src/components/SystemCard.tsx`, `src/components/FormasPagamentoModal.tsx`

**🧭 Decisão de produto (ainda não implementada):**
- Captura / rejeitados / agenda **não** deveriam ficar em `/admin/v3/precos` — unificar em `/admin/soollar-captura` (ou `/admin/v3/captura`).

**🧹 Admin:**
- ✅ Removido card **Propostas Públicas** de `/admin`
- ✅ **Fix local Supabase**: URL ativa `ityeiqyjyhkmypjmnyhb.supabase.co` (~60 clientes / ~59 propostas). Tabela `orcamentos` vazia — Admin/Orçamentos lista `propostas`.

---

### **v2.4.3** - 04/09/2026
**⚡ Aprendizado operacional (micro + módulos):**
- ✅ **Micro com módulos maiores é mais eficiente** — na prática comercial (proposta automática V3 + Gerador), kits micro com Wp mais alto entregam melhor cobertura/geração por arranjo (ex.: preferir 680 Wp vs 630 Wp no mesmo número de placas/micro), além do bônus de geração já configurável para micro
- ✅ Usar essa regra na escolha de alternativa recomendada e na auditoria de kits (4a/5a)

**🔗 V3 espelho (branch `v3-orcamento`) — bridge 5a:**
- ✅ Pipeline 1a–4a (equipamentos → preços → orçamento base → proposta auto) + **5a** pdespesa igual ao Gerador
- ✅ Botão **Abrir no Gerador Rápido** (`modo=v3`) — orçamento na frente do cliente com custo CD + PIX comercial
- ✅ Piloto: `/proposta/cliente-premium-04-09-2026` (pcusto Feira + pdespesa das configs do sistema)
- ✅ Commit referência: `433815f`

---

### **v2.4.2** - 02/09/2026
**⚡ Eficiência Micro-inversor vs String:**
- ✅ **Bônus configurável de geração** para micro-inversores (+5% padrão, ajustável em Configurações)
- ✅ **Toggle por linha** na tabela de equipamentos (Gerador Rápido + Consultor)
  - Verde (`⚡ +5%`) = bônus micro ativo
  - Cinza (`String`) = eficiência de inversor string
- ✅ **Detecção automática** por marca, quantidade de inversores e potência unitária
- ✅ **Override manual** — usuário pode ligar/desligar independente da detecção
- ✅ **Fórmula centralizada** em `calcularPerformance.ts` propagada para consultor, gerador e API

**📦 Arquivos Criados:**
- `src/lib/calcularPerformance.ts` — detecção micro, bônus e cálculo de geração
- `src/components/MicroInversorToggle.tsx` — botão verde/cinza reutilizável

**📄 Exportação PDF para clientes:**
- ✅ Botão flutuante **Gerar PDF** na página `/proposta/[slug]`
- ✅ CSS de impressão A4 (`public/styles/proposta-print.css`) — layout limpo, sem botões/CTAs
- ✅ Botões no **Gerador Rápido** e **Consultor** para abrir versão PDF
- ✅ URL `?pdf=1` abre diálogo de impressão automaticamente
- ✅ Toolbar embutida no HTML gerado pelo template engine

**📦 Arquivos Criados (PDF):**
- `public/styles/proposta-print.css`
- `src/lib/propostaPdf.ts`
- `src/components/PropostaPdfToolbar.tsx`

**📦 Arquivos Modificados (PDF + Micro):**
- `src/pages/gerador-rapido.tsx` — coluna ⚡ Micro + botão Gerar PDF
- `src/pages/admin/orcamentos/[clienteId]/consultor.tsx` — toggle micro + botão Gerar PDF
- `src/pages/proposta/[slug].tsx` — toolbar PDF + auto-print
- `src/lib/templateEngine.ts` — injeta toolbar/CSS no HTML
- `src/data/knowledge/templates/pieng_proposal_template.html` — print CSS

**🔧 Correção Consultor → Supabase:**
- ✅ **Engine unificado**: consultor deixa de usar API isolada e passa a chamar `/api/gerar-proposta`
- ✅ **Persistência no banco**: proposta salva em Supabase (`html_gerado` + `dados_completos`)
- ✅ **Template engine principal**: `generateTemplateHtmlPadrao` + `generateTemplateHtmlResultados` (mesmo do Gerador Rápido)
- ✅ **Proxy legado**: `/api/consultor/gerar-proposta` delega para o engine principal (compatibilidade)

---

### **v2.4.1** - 11/12/2025
**Status**: 🟢 Em Produção (Vercel)

**🔧 Correções Críticas:**
- ✅ **API Consultor**: Corrigido erro 500 em `/api/consultor/gerar-proposta`
  - Mapeamento correto para interface `PropostaData` do template engine
  - Estrutura de dados compatível com `generateTemplateHtmlResultados`
  - Cálculo de melhor sistema baseado em payback
  - Identificação automática de sistema recomendado com badge ⭐

**🎨 Melhorias Open Graph:**
- ✅ **Logo Colorido**: Forçar uso do logo principal com cores vibrantes (`logo-pieng-principal.jpg`)
  - Garantia de que links compartilhados (WhatsApp, Facebook) usam logo com cores
  - Configuração centralizada em `logoConfig.ts` já estava correta
  - Meta tags de Open Graph validadas

**📦 Arquivos Modificados:**
- `src/pages/api/consultor/gerar-proposta.ts` - Correção da estrutura de dados
- `VERSION.md` - Atualização para v2.4.1
- `package.json` - Bump de versão

**✅ Testes:**
- Build do projeto validado
- Estrutura de dados compatível com template engine
- Logo colorido configurado corretamente

---

### **v2.4.0** - 02/12/2025
**Status**: 🔴 Substituída (Vercel)

**🎨 Sistema de CSS por Template:**
- ✅ **CSS Específicos por Subtipo Comercial**: Cada ramo (Panificadora, Açougue, Restaurante, Mercado) tem seu próprio CSS
- ✅ **Sistema Híbrido de Carregamento**: CSS carregado de arquivos locais com fallback para Supabase Storage
- ✅ **4 Novos Arquivos CSS**: `comercial-panificadora.css`, `comercial-acougue.css`, `comercial-restaurante.css`, `comercial-mercado.css`
- ✅ **Helper cssLoader.ts**: Função para carregar CSS de múltiplas fontes
- ✅ **Template Engine Atualizado**: Suporta CSS específicos automaticamente baseado no template selecionado

**📊 Sistema de Analytics:**
- ✅ **Tabela proposta_analytics**: Rastreamento completo de visualizações de propostas
- ✅ **Tracking Automático**: Tempo na página, scroll, cliques, IP, user agent
- ✅ **Detecção de Compartilhamento**: Identifica quando link foi compartilhado (múltiplos IPs)
- ✅ **Sistema de Alertas**: Alertas automáticos para follow-up com clientes
- ✅ **Dashboard de Analytics**: Visualização de estatísticas em `/admin/orcamentos/[clienteId]`

**🎨 Melhorias UI/UX:**
- ✅ **Padrão de Navegação**: Headers padronizados com botões à direita (Admin, Voltar)
- ✅ **Botão Voltar**: Implementado em todas as páginas (gerador-rapido, consultor, orcamentos)
- ✅ **Removido Card Consultor**: Substituído por botão "Voltar" no gerador-rapido
- ✅ **Configurações no Header**: Ícone de engrenagem (⚙️) no header do admin ao invés de card

**🔧 Correções:**
- ✅ **Cobertura como Inteiro**: Exibição de cobertura sempre como número inteiro (107% ao invés de 107.22536000000001%)
- ✅ **Step de pdespesa**: Ajustado de 0.01/0.1 para 1.0 para ajuste mais rápido
- ✅ **Salvar e Salvar Como**: Implementado sistema de versionamento de propostas
- ✅ **Carregamento de Config**: Prioriza config da proposta > cliente > sistema > default

**📦 Arquivos Criados:**
- `src/lib/cssLoader.ts` - Helper para carregar CSS
- `public/styles/comercial-panificadora.css` - CSS Panificadora
- `public/styles/comercial-acougue.css` - CSS Açougue
- `public/styles/comercial-restaurante.css` - CSS Restaurante
- `public/styles/comercial-mercado.css` - CSS Mercado
- `src/pages/api/propostas/[slug]/track.ts` - API de tracking
- `src/pages/api/admin/analytics/[slug].ts` - API de analytics
- `src/pages/api/admin/propostas-cliente/[clienteId].ts` - API de propostas com analytics
- `criar_tabela_proposta_analytics.sql` - Script SQL para tabela de analytics
- `SISTEMA_CSS_TEMPLATES.md` - Documentação do sistema de CSS

**📦 Arquivos Modificados:**
- `src/lib/variantConfig.ts` - CSS específicos por subtipo
- `src/lib/templateEngine.ts` - Suporte a CSS específicos
- `src/pages/gerador-rapido.tsx` - Botão voltar, step pdespesa, cobertura inteiro
- `src/pages/admin/orcamentos/[clienteId].tsx` - Analytics dashboard, header padronizado
- `src/pages/admin/orcamentos/[clienteId]/consultor.tsx` - Header padronizado
- `src/pages/admin/index.tsx` - Configurações no header
- `src/pages/proposta/[slug].tsx` - Tracking automático
- `src/components/SystemCard.tsx` - Cobertura como inteiro

**📦 Deploy:**
- Commits: (a definir após commit)
- Branch: `clean-main`
- URL: https://pieng-propostas.vercel.app

---

### **v2.3.3** - 01/12/2025
**Status**: 🟡 Substituído

**🔧 Correções Críticas:**
- ✅ **Busca de Dados do Supabase**: Removido uso de valores hardcode ao carregar propostas existentes
  - Função `carregarPropostaExistente` agora busca dados atualizados do cliente do Supabase
  - API `/api/propostas/[slug]` busca dados atualizados do cliente usando `cliente_id`
  - Carrega configurações do sistema (`pdespesaFixo`, `pdespesaVariavel`) do Supabase
  - Prioridade: Supabase > Proposta > Config Sistema > Fallback mínimo

- ✅ **Correção de Sintaxe**: Corrigido erro de sintaxe em `gerador-rapido.tsx`
  - Removido `}` extra que causava erro de compilação
  - Ajustada indentação do bloco `if (pcusto <= 0)`

- ✅ **Valores de Orçamentos**: Melhorada extração de valores dos sistemas
  - Adicionado fallback usando `valor_total` da proposta quando sistemas não têm valor
  - Logs detalhados para debug quando valores não são encontrados
  - Suporte a múltiplos campos: `ppix`, `valorTotal`, `total_final`, `precoPixDecimal`, `pavista`

**🎨 Melhorias UI/UX:**
- ✅ Botões "Editar" unificados: `/admin` e `/admin/orcamentos` usam mesma função
  - Ambos buscam dados do Supabase através de `/api/propostas/[slug]`
  - Migrado de `window.location.search` para `useRouter` do Next.js
  - Logs melhorados para rastreamento

**🛠️ Ferramentas Criadas:**
- ✅ `test-supabase-monitor.ps1` - Script de teste automático para verificar busca do Supabase
- ✅ `GUIA_TESTE_SUPABASE.md` - Guia completo de testes e troubleshooting
- ✅ `diagnostico-erro.ps1` - Script de diagnóstico completo

**📦 Arquivos Modificados:**
- `src/pages/gerador-rapido.tsx` - Busca dados do Supabase, correção sintaxe, useRouter
- `src/pages/api/propostas/[slug].ts` - Busca dados atualizados do cliente do Supabase
- `src/pages/api/admin/orcamentos-todos.ts` - Melhorada extração de valores, logs detalhados
- `src/pages/admin/orcamentos/index.tsx` - Melhorada exibição de valores, interface atualizada
- `src/pages/admin/index.tsx` - Comentários adicionados nos botões
- `src/lib/supabase.ts` - `getPropostaBySlug` agora retorna `cliente_id`

**📦 Deploy:**
- Branch: `clean-main`
- URL: https://pieng-propostas.vercel.app

---

### **v2.3.2** - 01/12/2025
**Status**: 🟡 Substituído

**🔧 Correções:**
- ✅ Removido card "Novo Cliente" do admin
- ✅ Melhorias no carregamento de propostas existentes

---

### **v2.3.2** - 01/12/2025
**Status**: 🟡 Substituído

**🔧 Correções:**
- ✅ Removido card "Novo Cliente" do admin
- ✅ Melhorias no carregamento de propostas existentes

---

### **v2.3.1** - 01/12/2025
**Status**: 🟢 Em Produção (Vercel)

**🔧 Correções Críticas:**
- ✅ **Window Opening Fix**: Propostas abrem diretamente sem `about:blank`
  - Antes: `window.open('', '_blank')` + `document.write()` causava página em branco
  - Agora: `window.open(propostaUrl, '_blank')` abre diretamente
  - Removido alert bloqueante que travava a janela anterior

- ✅ **Favicons Corrigidos**: Logo PIENG aparecendo em todos os navegadores
  - Arquivos PNG corrompidos (70 bytes) substituídos por SVG (839KB)
  - Atualizados: `_document.tsx`, `manifest.json`
  - Deletados: `favicon.ico`, `favicon-16x16.svg` (corrompidos)

- ✅ **Configurações Dinâmicas**: Sistema usa Supabase para todas as configs
  - Criada tabela `configuracoes` com 20 configurações
  - API `/api/admin/config` refatorada (multi-config pattern)
  - `gerador-rapido.tsx` sincroniza HSP automaticamente
  - `gerar-proposta.ts` usa configs do Supabase em todos os fallbacks
  - **HSP 5.30** (ou qualquer valor) agora reflete em todo o app

**🎨 Melhorias UI/UX:**
- ✅ Removidos cards desnecessários do admin (Google Drive, Atualizar)
- ✅ Admin dashboard mais limpo e focado
- ✅ Sistema totalmente sem hardcode - 100% configurável

**🛠️ Ferramentas Criadas:**
- ✅ `convert-svg-to-png.html` - Conversor web SVG → PNG
- ✅ 4 scripts SQL para configurações (criar, inserir, testar, refresh)
- ✅ `test-supabase-config.js` - Teste direto da API Supabase

**📦 Arquivos Modificados:**
- `src/pages/gerador-rapido.tsx` - Window fix + config sync
- `src/pages/api/admin/config.ts` - Multi-config pattern
- `src/pages/api/gerar-proposta.ts` - HSP fallbacks (4 locais)
- `src/pages/admin/index.tsx` - Removido botão "Atualizar"
- `src/pages/_document.tsx` - Favicon links
- `public/manifest.json` - Icons SVG

**📦 Deploy:**
- Commits: `2c59087`, `430e9f4`, `ce0a7a3`
- Branch: `clean-main`
- URL: https://pieng-propostas.vercel.app

---

### **v2.2.5** - 18/11/2025
**Status**: 🟢 Em Produção (Vercel)

**🔧 Correções:**
- ✅ Corrigido erro 500 em `/api/admin/orcamentos/[cliente]` - integração completa com Supabase
- ✅ Orçamentos agora persistem no banco de dados (tabela `orcamentos`)
- ✅ GET/POST/PUT/DELETE de orçamentos funcionando com Supabase-first
- ✅ Configuração do ESLint (eslint@8.57.0 compatível com Next.js 13.5.6)

**✨ Melhorias:**
- ✅ Criado `src/utils/orcamentosSupabase.ts` para gerenciar orçamentos no Supabase
- ✅ Resolução automática de cliente por ID, slug, nome ou pasta
- ✅ Mapeamento robusto de dados do Supabase para formato da API
- ✅ Fallback seguro para filesystem em desenvolvimento
- ✅ Documentação atualizada com integração de orçamentos

**📦 Deploy:**
- Commits: `2b43b4d`
- Branch: `clean-main`
- URL: https://pieng-propostas.vercel.app

---

### **v2.2.4** - 18/11/2025
**Status**: 🟡 Substituído

**🔧 Correções:**
- ✅ `/api/admin/clientes` não quebra mais com dados incompletos do Supabase
- ✅ `/api/admin/clientes/[id]` busca/atualiza clientes direto no Supabase
- ✅ `/api/admin/config` persiste no banco com fallback seguro

**✨ Melhorias:**
- ✅ Rota de diagnóstico `/api/test-cliente-padrao` adicionada
- ✅ Badge e documentação atualizados para v2.2.4
- ✅ Logs informam fonte dos dados (Supabase x filesystem)

**📦 Deploy:**
- Commits: `0c9fe94`, `c562be1`
- Branch: `clean-main`
- URL: https://pieng-propostas.vercel.app

---

### **v2.2.3** - 17/11/2025
**Status**: 🟡 Substituído

**🔧 Correções:**
- ✅ Corrigido erro de build Vercel - Next.js 13.5.6 e SWC packages
- ✅ Corrigido erro ReferenceError propostasGeradas - inicialização de variáveis
- ✅ Corrigido link quebrado consultor-interface.html
- ✅ Supabase client null-safe - não quebra build sem variáveis
- ✅ Removida página obsoleta proposta-supabase/[slug]
- ✅ Melhorado tratamento de erros Supabase nas APIs
- ✅ Adicionado debug e fallback para variáveis Supabase no Vercel

**✨ Melhorias:**
- ✅ Logs de debug melhorados para diagnóstico de variáveis
- ✅ Mensagens de erro mais informativas
- ✅ Documentação atualizada (VERIFICAR_VARIAVEIS_VERCEL.md)

**📦 Deploy:**
- Commits: `1ebfa17`, `c356723`, `e4b0a08`, `a12f054`, `68d8118`, `53aad79`, `89aa467`
- Branch: `clean-main`
- URL: https://pieng-propostas.vercel.app

---

### **v2.2.2** - 06/11/2025
**Status**: 🟡 Substituído

**🔧 Correções:**
- ✅ Integração Supabase completa
- ✅ Persistência de dados em produção

---

### **v2.2.1** - 31/10/2025
**Status**: 🟡 Substituído

**🔧 Correções:**
- ✅ Melhorias no admin dashboard

---

### **v2.2.0** - 26/10/2025
**Status**: 🟡 Substituído

---

### **v2.1.0** - 25/10/2025
**Status**: 🟢 Em Produção (Vercel)

**🔧 Correções:**
- ✅ Correção erro 500 em `/api/admin/clientes`
- ✅ Validação segura de ordenação de datas
- ✅ Error handling melhorado com logs detalhados
- ✅ Previne crash quando data está em formato inválido

**✨ Melhorias:**
- ✅ Badge de versão minimalista no admin
- ✅ Sistema de controle de versão implementado
- ✅ Documentação atualizada (README + CLAUDE.md + VERSION.md)

**📦 Deploy:**
- Commit: `51b1d72` - API clientes fix
- Branch: `clean-main`
- URL: https://pieng-propostas.vercel.app

---

### **v2.0.1** - 24/10/2025
**Status**: 🟡 Substituído

**🔧 Correções:**
- ✅ CSS inline híbrido com fallback robusto
- ✅ Procura CSS em 3 locais diferentes
- ✅ Fallback para `<link>` se inline falhar

**📦 Deploy:**
- Commit: `e14f2f8`
- Funcionalidade: CSS inline + fallback

---

### **v2.0.0** - 24/10/2025
**Status**: 🟡 Substituído

**🔧 Correções:**
- ✅ Force redeploy para corrigir CSS 404
- ✅ CSS agora carrega corretamente (200 OK)

**📦 Deploy:**
- Commit: `0981ba2`
- Issue resolvido: CSS retornando 404

---

### **v1.9.0** - 22/10/2025
**Status**: 🔴 Substituído

**📝 Documentação:**
- ✅ Atualização do CLAUDE.md com correção erro 500
- ✅ Documentação do fix CSS para public/

**📦 Deploy:**
- Commit: `19f8fe4`

---

### **v1.8.0** - Outubro 2025
**Status**: 🔴 Substituído

**🚀 Features Anteriores:**
- ✅ Migração Netlify → Vercel completa
- ✅ Sistema de propostas públicas
- ✅ Admin dashboard funcional
- ✅ Gerador rápido
- ✅ Integração Google Drive

---

## 🎯 **ROADMAP FUTURO**

### **v2.2.0** - Próxima versão (Planejado)
- [ ] Implementar Supabase Storage para persistência
- [ ] Configurar backup automático
- [ ] Otimizar cache de propostas
- [ ] Adicionar monitoramento de erros

### **v2.3.0** - Médio prazo
- [ ] Migrar para React Components (template engine)
- [ ] Implementar CSS Modules
- [ ] Adicionar testes automatizados
- [ ] Sistema de notificações

### **v3.0.0** - Longo prazo (se necessário)
- [ ] Migração para Docker (se volume crescer)
- [ ] Banco de dados PostgreSQL
- [ ] Sistema de filas (Bull/Redis)
- [ ] WebSockets para atualizações em tempo real

---

## 📊 **COMPATIBILIDADE**

| Ambiente | Status | Versão Testada |
|----------|--------|----------------|
| Vercel Produção | ✅ Funcionando | v2.1.0 |
| Vercel Preview | ✅ Funcionando | v2.1.0 |
| Local (dev) | ✅ Funcionando | v2.1.0 |
| Netlify | ⚠️ Descontinuado | - |

---

## 🔧 **DEPENDÊNCIAS PRINCIPAIS**

```json
{
  "next": "13.5.11",
  "react": "18.2.0",
  "typescript": "5.x",
  "tailwindcss": "3.x"
}
```

---

## 📝 **COMO VERIFICAR VERSÃO**

### **Na produção:**
1. Acesse: https://pieng-propostas.vercel.app/admin
2. Badge de versão aparece no header: **v2.1.0**

### **No código:**
```bash
# Ver última versão deployada
git log --oneline -1

# Ver histórico de versões
cat VERSION.md
```

---

## 🎓 **CONVENÇÃO DE VERSIONAMENTO**

Seguimos **Semantic Versioning** (SemVer):

```
MAJOR.MINOR.PATCH

v2.1.0
│ │ │
│ │ └─ PATCH: Bug fixes, correções menores
│ └─── MINOR: Novas features, melhorias
└───── MAJOR: Mudanças breaking, refatorações grandes
```

**Exemplos:**
- `v2.0.0 → v2.0.1`: Correção de bug (patch)
- `v2.0.1 → v2.1.0`: Nova feature (minor)
- `v2.1.0 → v3.0.0`: Breaking change (major)

---

**Última atualização**: 17/11/2025 - 15:30
**Mantenedor**: Flavio + Claude Code
**Repositório**: https://github.com/Flavioprogramador123/PIENG-PROPOSTAS-SOLARES
