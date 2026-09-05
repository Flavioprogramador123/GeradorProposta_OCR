import { getWritableRoot, isServerlessFs as isServerlessFsShared } from '@/lib/serverlessFs';
/**
 * Caminhos graváveis do V3.
 * Em Vercel/Lambda o cwd (/var/task) é read-only — usar /tmp.
 */
import path from 'path';

export function isV3ServerlessFs(): boolean {
  return isServerlessFsShared();
}

/** Raiz gravável: /tmp/pieng-v3 em serverless, senão <cwd>/data/v3 */
export function getV3DataDir(): string {
  if (isV3ServerlessFs()) {
    return getWritableRoot('pieng-v3');
  }
  return path.join(process.cwd(), 'data', 'v3');
}

/** Temp gravável para dumps HTML / JSON de captura */
export function getV3TempDir(): string {
  if (isV3ServerlessFs()) {
    return getWritableRoot('pieng-v3', 'temp');
  }
  return path.join(process.cwd(), 'temp');
}
