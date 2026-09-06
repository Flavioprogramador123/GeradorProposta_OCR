/**
 * Política de templates CSS da proposta ao cliente.
 *
 * PRODUÇÃO (aprovado): `padrao` = layout clássico (globals + componentes React /
 * CSS do templateEngine). Skins editoriais (skin-alt etc.) isolados em
 * public/styles/_estudo/ — não entram no pipeline.
 *
 * EM ESTUDO: variantes de cor (residencial, rural, comerciais, industrial).
 * Só com escolha explícita / `?template=` — NÃO são inferidas do tipo de imóvel.
 */

export const TEMPLATE_APROVADO_PRODUCAO = 'padrao' as const;

/** Variantes de cor ainda em estudo (não aprovadas para produção). */
export const TEMPLATES_EM_ESTUDO = [
  'residencial',
  'residencial-premium',
  'rural',
  'rural-agro',
  'comercial-panificadora',
  'comercial-acougue',
  'comercial-restaurante',
  'comercial-mercado',
  'industrial',
  'industrial-premium',
] as const;

export type TemplateEmEstudoId = (typeof TEMPLATES_EM_ESTUDO)[number];

export function isTemplateEmEstudo(id: string | null | undefined): boolean {
  if (!id) return false;
  return (TEMPLATES_EM_ESTUDO as readonly string[]).includes(id);
}

/**
 * Template a gravar em produção.
 * Só grava variante em estudo se o usuário escolheu explicitamente no modal de teste.
 * Tipo de imóvel NÃO escolhe CSS.
 */
export function resolveTemplateParaSalvar(templateEscolhido?: string | null): string {
  const t = (templateEscolhido || '').trim();
  if (!t || t === 'padrao' || t === 'pieng_basic') return TEMPLATE_APROVADO_PRODUCAO;
  if (isTemplateEmEstudo(t)) return t; // escolha explícita no lab
  return TEMPLATE_APROVADO_PRODUCAO;
}

/**
 * CSS na página pública: produção = sempre padrao.
 * Variante em estudo só com `?template=...` (lab / admin).
 */
export function resolveTemplateParaExibir(opts: {
  queryTemplate?: string | string[] | null;
  templateSalvo?: string | null;
}): string {
  const q = Array.isArray(opts.queryTemplate) ? opts.queryTemplate[0] : opts.queryTemplate;
  if (q && isTemplateEmEstudo(q)) return q;
  if (q === 'padrao') return TEMPLATE_APROVADO_PRODUCAO;
  // Ignora template_usado experimental — produção usa o aprovado
  return TEMPLATE_APROVADO_PRODUCAO;
}

/** @deprecated Use resolveTemplateParaSalvar — tipo imóvel não mapeia CSS. */
export function mapearTipoImovelParaTemplate(_tipoImovel?: string): string {
  return TEMPLATE_APROVADO_PRODUCAO;
}
