/**
 * Resolução da tabela da Ton para as configurações do sistema — **server-only**.
 *
 * Fica separado de `configuracoes.ts` porque lê o `fs`. Como nenhuma página do
 * cliente importa este arquivo, o webpack não tenta empacotar o `fs` no bundle
 * do browser.
 */

import { promises as fs } from 'fs';
import path from 'path';
import {
  PRAZO_RECEBIMENTO_PADRAO,
  TON_TABELA_FILENAME,
  parseTabelaTon,
  type LinhasTon,
  type PrazoRecebimento,
} from '@/lib/maquininha/tonTabela';

const CONFIG_PRAZO_PADRAO: PrazoRecebimento = PRAZO_RECEBIMENTO_PADRAO;

/** Caminhos candidatos, na ordem, dentro do projeto. */
function caminhosCandidatos(): string[] {
  const base = process.cwd();
  return [
    path.join(base, TON_TABELA_FILENAME),
    path.join(base, 'public', TON_TABELA_FILENAME),
    path.join(base, 'src', 'data', 'sistema', TON_TABELA_FILENAME),
  ];
}

/**
 * Lê e parseia a tabela da Ton (prazo × faixa).
 * Async, para uso em APIs e `getServerSideProps`.
 */
export async function resolverTonTotaisServer(
  prazo: string = CONFIG_PRAZO_PADRAO,
  faixa = 0
): Promise<LinhasTon | null> {
  for (const caminho of caminhosCandidatos()) {
    try {
      const conteudo = await fs.readFile(caminho, 'utf8');
      return parseTabelaTon(conteudo, prazo as PrazoRecebimento, faixa);
    } catch {
      // tenta o próximo caminho
    }
  }
  return null;
}
