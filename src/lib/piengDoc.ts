/**
 * Ponte leve Gerador PIENG → pieng-doc (documentos Equatorial).
 *
 * O pieng-doc é um produto **separado e local** (Flask + Vite, roda no PC):
 * gera Procuração, Memorial Descritivo, NT.00020-05 e a planta CAD (DXF/DWG).
 * Ele NÃO é hospedado no Vercel — depende de disco, ODA File Converter e
 * AutoLISP. Por isso aqui só expomos a URL para o card abrir.
 */

/**
 * Porta dedicada do pieng-doc.
 * O Teto Sol (PlanoSol) usa 5173 por padrão — não rodar os dois na mesma porta.
 */
export const PIENG_DOC_DEFAULT_URL = 'http://127.0.0.1:5180';

export function getPiengDocUrl(): string {
  // Acesso literal a process.env.NEXT_PUBLIC_* é obrigatório: o Next substitui
  // o valor em build time (acesso dinâmico não é inlinado).
  const fromEnv =
    typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_PIENG_DOC_URL : undefined;
  return (fromEnv || PIENG_DOC_DEFAULT_URL).replace(/\/$/, '');
}
