/**
 * Helpers para filesystem em Vercel/Netlify (cwd read-only).
 * Persistência real em produção = Supabase; disco só /tmp (efêmero) ou skip.
 */
import path from 'path';

export function isServerlessFs(): boolean {
  return Boolean(
    process.env.VERCEL ||
      process.env.NETLIFY ||
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.env.LAMBDA_TASK_ROOT
  );
}

/** Raiz gravável genérica (/tmp em serverless). */
export function getWritableRoot(...segments: string[]): string {
  const root = isServerlessFs() ? '/tmp' : process.cwd();
  return path.join(root, ...segments);
}

/** Pastas de clientes: /tmp/clientes em nuvem, senão src/data/clientes. */
export function getClientesDataRoot(): string {
  if (isServerlessFs()) {
    return path.join('/tmp', 'clientes');
  }
  return path.join(process.cwd(), 'src', 'data', 'clientes');
}

/** Pasta pública de propostas HTML (só local; em nuvem preferir Supabase/HTML inline). */
export function getPublicPropostasRoot(): string {
  if (isServerlessFs()) {
    return path.join('/tmp', 'propostas');
  }
  return path.join(process.cwd(), 'public', 'propostas');
}
