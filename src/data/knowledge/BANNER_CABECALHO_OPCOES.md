# Opções de texto para o banner do cabeçalho (HTML da proposta)

O placeholder `{{BANNER_URGENCIA}}` no template é preenchido com uma dessas mensagens (ou com valor vindo da API). Abaixo, **exemplos** que você pode usar.

---

## 1. Validade do orçamento (neutro)
- `Orçamento válido por 15 dias a partir da data de emissão.`
- `Este orçamento é válido por 15 dias. Equipamentos sujeitos à disponibilidade.`
- `Proposta válida por 15 dias • Sujeita à análise técnica do local.`

---

## 2. Marca + experiência (profissional)
- `PIENG Soluções Energéticas — 35+ anos em sistemas elétricos de potência.`
- `35+ anos de experiência • Proposta personalizada para você.`
- `Energia solar com qualidade PIENG — Anápolis/GO.`

---

## 3. Convite ao contato (CTA suave)
- `Dúvidas sobre financiamento ou instalação? Fale com nosso time!`
- `Quer ajustar algo ou tirar dúvidas? Entre em contato — estamos à disposição.`
- `Fale conosco para condições de pagamento e data de instalação.`

---

## 4. Informativo + validade
- `Orçamento válido por 15 dias • Equipamentos sujeitos à disponibilidade • PIENG Soluções Energéticas`
- `Proposta personalizada • Válida por 15 dias • Base operacional: Anápolis/GO`

---

## 5. Foco em benefício (sem “oferta urgente”)
- `Energia solar: economia na conta e valorização do imóvel. Orçamento válido por 15 dias.`
- `Payback em poucos anos e economia por mais de 25 anos. Proposta válida por 15 dias.`

---

**Onde alterar o texto padrão no código:**  
- `src/lib/templateEngine.ts` → variável `BANNER_URGENCIA` (fallback)  
- `src/pages/api/gerar-proposta.ts` → `bannerUrgencia` ao montar o payload  
- `src/pages/api/consultor/gerar-proposta.ts` → idem, se usar consultor  

O valor definido na geração da proposta (API) tem prioridade sobre o fallback do template.
