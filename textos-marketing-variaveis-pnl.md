# Textos de Marketing Variáveis — Biblioteca de Variações (Copywriting + PNL)

## Propósito deste documento

Este arquivo documenta **5 opções de texto** para cada um dos 5 campos de "Textos de Marketing Variáveis" do ERP da PIENG, aplicando técnicas de copywriting e PNL (ancoragem, presuposição, contraste, enquadramento de ganho, comparação implícita, prova social, pergunta retórica). Cada opção usa os mesmos tokens dinâmicos já existentes no sistema — nenhum token novo foi criado.

**Uso pretendido:** a IA (ou o sistema de geração de propostas) escolhe **uma das 5 opções** de cada campo — por sorteio, teste A/B, ou heurística de perfil de cliente (ver seção 6) — em vez de usar sempre o mesmo texto fixo.

---

## 1. Texto Economia Anual

**Token:** `{valorEconomia}`

| Opção | Texto | Técnica aplicada |
|---|---|---|
| 1 | Economia anual de R$ {valorEconomia} na conta de energia | Direta/informativa — clareza total, sem floreio |
| 2 | Você vai economizar R$ {valorEconomia} por ano — dinheiro que hoje vai direto pro bolso da distribuidora | Contraste emocional (posse "seu" vs. "da distribuidora") |
| 3 | R$ {valorEconomia} de economia todo ano. Multiplicado por 25 anos de garantia do sistema. | Ancoragem + projeção temporal (número pequeno vira grande na mente do leitor) |
| 4 | A partir de agora, R$ {valorEconomia} por ano deixam de sair da sua conta | Presuposição (assume a decisão já tomada, reduz resistência) |
| 5 | Imagina ter R$ {valorEconomia} a mais todo ano — sem aumentar o consumo, só mudando de onde vem a energia | Pergunta retórica + enquadramento de ganho (benefício sem sacrifício) |

---

## 2. Texto Payback

**Token:** `{mesesPayback}`

| Opção | Texto | Técnica aplicada |
|---|---|---|
| 1 | Investimento se paga em apenas {mesesPayback} meses | Direta/informativa |
| 2 | Em {mesesPayback} meses o sistema já pagou a si mesmo — o resto é lucro puro | Reforço de recompensa ("lucro puro" após o marco) |
| 3 | Você recupera cada centavo investido em só {mesesPayback} meses — mais rápido que a maioria dos investimentos do mercado | Comparação implícita (sem citar números específicos de outros investimentos) |
| 4 | {mesesPayback} meses. É esse o tempo que falta pra parar de pagar luz e começar a economizar de verdade. | Frase curta + gatilho de urgência temporal |
| 5 | Em {mesesPayback} meses a conta de luz deixa de ser despesa e vira o retorno do seu investimento | Reenquadramento (despesa → retorno) |

---

## 3. Texto TIR

**Token:** `{percentualTIR}`

| Opção | Texto | Técnica aplicada |
|---|---|---|
| 1 | Taxa Interna de Retorno de {percentualTIR}% ao ano | Direta/técnica — mantém o jargão financeiro |
| 2 | Retorno de {percentualTIR}% ao ano — muito acima da poupança e da maioria dos investimentos tradicionais | Comparação concreta (traduz TIR pra algo que o cliente reconhece) |
| 3 | Seu dinheiro rende {percentualTIR}% ao ano com o sol — sem taxa de administração, sem imposto de renda | Remoção antecipada de objeções (compara com fricções de investimentos financeiros) |
| 4 | {percentualTIR}% ao ano de retorno — o tipo de rendimento que nenhum banco oferece | Contraste direto com o sistema bancário, ativa ceticismo positivo |
| 5 | {percentualTIR}% ao ano: o sol trabalhando pro seu bolso enquanto você vive a sua rotina | Personificação + ganho passivo (benefício sem esforço contínuo) |

> **Nota de auditoria:** as opções 2, 3 e 4 fazem comparação implícita com investimentos financeiros tradicionais. Isso pode ser questionado pelo cliente ou exigir nota de rodapé conforme o contexto regulatório de publicidade. Não usar sem uma comparação numérica real documentada (ex: rentabilidade média da poupança/CDB no período). A opção 5 evita essa comparação externa.

---

## 4. Texto Valorização do Imóvel

**Token:** `{percentualValorizacao}`

| Opção | Texto | Técnica aplicada |
|---|---|---|
| 1 | Valorização do imóvel em até {percentualValorizacao}% | Direta/informativa |
| 2 | Seu imóvel vale até {percentualValorizacao}% mais com energia solar instalada — um ativo que aparece na hora de vender ou alugar | Concretização do "quando" o benefício se realiza |
| 3 | Além de economizar, você aumenta o valor do seu patrimônio em até {percentualValorizacao}% | Reforço duplo de benefício (economia + patrimônio na mesma frase) |
| 4 | {percentualValorizacao}% a mais no valor do seu imóvel — um investimento que você não usa, mas carrega no bolso | Frase de contraste (o imóvel "carrega" o benefício mesmo sem uso ativo) |
| 5 | Compradores e locatários notam: imóvel com solar tende a valer até {percentualValorizacao}% mais | Prova social implícita + concretização de mercado |

> **Nota de auditoria:** o percentual de valorização de imóvel é o dado mais facilmente contestável dos cinco campos. Existem estudos reais (ex: Lawrence Berkeley National Laboratory / NREL, nos EUA) que embasam esse tipo de afirmação, mas não foram verificados para o contexto brasileiro nesta conversa. Ter fonte documentada antes de usar em proposta formal (vale para as opções 2–5).

---

## 5. Texto Sustentabilidade

**Token:** `{tonelaCO2}`

| Opção | Texto | Técnica aplicada |
|---|---|---|
| 1 | Evita emissão de {tonelaCO2} toneladas de CO2 em 25 anos | Direta/informativa |
| 2 | O equivalente a plantar centenas de árvores: {tonelaCO2} toneladas de CO2 que deixam de ir pro ar em 25 anos | Ancoragem visual (números abstratos de CO2 viram imagem concreta) |
| 3 | Você e sua família fazendo parte da solução: {tonelaCO2} toneladas de CO2 a menos na atmosfera | Linguagem inclusiva, ativa identidade/pertencimento (alinhamento de valores) |
| 4 | {tonelaCO2} toneladas de CO2 que o planeta agradece — e que ficam fora do ar que sua família respira | Combina apelo ambiental com apelo de saúde/família (duplo gatilho emocional) |
| 5 | Em 25 anos: {tonelaCO2} toneladas de CO2 a menos — um legado limpo pra quem vem depois de você | Projeção geracional + legado (benefício além do próprio uso) |

> **Nota de auditoria:** a equivalência "toneladas de CO2 → número de árvores" (opção 2) não foi calculada nesta conversa — a taxa de absorção de CO2 por árvore varia por espécie, idade e clima, sem fator de conversão único. Se um número específico de árvores for usado (em vez de "centenas"), calcular separadamente com fonte documentada.

---

## 6. Instrução para a IA — como usar este documento

1. **Nunca inventar novos tokens.** Usar exclusivamente `{valorEconomia}`, `{mesesPayback}`, `{percentualTIR}`, `{percentualValorizacao}` e `{tonelaCO2}`, exatamente como já definidos no ERP da PIENG.
2. **Seleção de opção — 3 modos possíveis:**
   - **Teste A/B:** alternar entre as 5 opções de forma sistemática (por ordem de criação da proposta, ou sorteio aleatório uniforme) e registrar qual opção foi usada em cada proposta, para permitir comparar taxa de conversão depois.
   - **Personalização por perfil de cliente** (heurística sugerida, não testada): clientes com perfil mais analítico/técnico → Opção 1 ou 2 (mais direta); clientes com perfil mais emocional/familiar → Opção 3, 4 ou 5 (mais narrativa). Essa segmentação depende de dados que o ERP da PIENG pode não ter — usar com cautela.
   - **Sem preferência declarada:** usar a Opção 2 de cada campo como padrão (equilíbrio entre impacto e clareza, sem depender de comparações externas questionáveis como as opções do campo TIR). A Opção 5 é boa alternativa quando se quer impacto sem comparação bancária (especialmente no TIR).
3. **Campos com ressalva de auditoria (TIR, Valorização do Imóvel, Sustentabilidade):** antes de usar as opções com comparação/equivalência nesses campos numa proposta formal, verificar se existe fonte/nota de rodapé documentada. No TIR, preferir a opção 1 ou 5 quando não houver lastro numérico.
4. **Manter consistência de tom** dentro da mesma proposta — não misturar, por exemplo, a opção mais técnica de um campo com a opção mais emocional de outro campo na mesma peça, a menos que seja uma decisão deliberada de teste.
