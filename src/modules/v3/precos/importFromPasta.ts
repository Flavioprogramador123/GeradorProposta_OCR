/**
 * Import manual de dumps SOOLLAR a partir de uma pasta escolhida pelo usuário.
 * Não varre temp/ inteiro — evita HTML antigo poluir preços.
 *
 * Futuro: prompt.yaml + OCR de printscreen para outros fornecedores.
 */
import fs from 'fs';
import path from 'path';
import { getV3TempDir } from '../db/paths';
import { importFeiraJsonToCd, importHtmlFileToCd } from './importCatalog';
import { getPrecosStats } from './repository';
import { refreshEstoqueMinimosFromAdmin } from './estoqueMinimosConfig';
import { mergeAndSaveRejeitados } from './rejeitadosCaptura';

const CD_PATTERNS: Array<{ cd: string; globs: string[] }> = [
  {
    cd: 'Feira de Santana',
    globs: ['*feira*', '*cdfeiradesantana*', 'Soollar Distribuidora_feira.html'],
  },
  {
    cd: 'Matriz',
    globs: ['*cdgoiania*', '*matriz*', '_matrizcd_*.html'],
  },
  {
    cd: 'Aeroporto',
    globs: ['*aeroporto*', '*cdaeroportogo*'],
  },
];

function expandGlobs(baseDir: string, patterns: string[]): string[] {
  const out: string[] = [];
  if (!fs.existsSync(baseDir)) return out;
  const files = fs.readdirSync(baseDir);
  for (const pattern of patterns) {
    if (pattern.includes('*')) {
      const re = new RegExp(
        '^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$',
        'i'
      );
      for (const f of files) {
        if (re.test(f) && /\.(html?|json)$/i.test(f)) {
          out.push(path.join(baseDir, f));
        }
      }
    } else {
      const full = path.join(baseDir, pattern);
      if (fs.existsSync(full)) out.push(full);
    }
  }
  return Array.from(new Set(out));
}

export function getImportPastaDir(): string {
  return path.join(getV3TempDir(), '_import_pasta');
}

/** Limpa e recria staging do upload manual */
export function prepareImportPastaDir(): string {
  const dir = getImportPastaDir();
  if (fs.existsSync(dir)) {
    for (const f of fs.readdirSync(dir)) {
      try {
        fs.unlinkSync(path.join(dir, f));
      } catch {
        /* ignore */
      }
    }
  } else {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export async function importarPrecosDaPasta(baseDir: string): Promise<{
  results: unknown[];
  stats: ReturnType<typeof getPrecosStats>;
  baseDir: string;
  arquivos: number;
}> {
  await refreshEstoqueMinimosFromAdmin();
  const results: unknown[] = [];
  const resolved = path.resolve(baseDir);

  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
    return {
      results: [{ fonte: 'pasta', error: `Pasta inexistente: ${resolved}` }],
      stats: getPrecosStats(),
      baseDir: resolved,
      arquivos: 0,
    };
  }

  const allFiles = fs.readdirSync(resolved);
  const htmlFiles = allFiles.filter((f) => /\.html?$/i.test(f));
  const pngFiles = allFiles.filter((f) => /\.png$/i.test(f));

  if (htmlFiles.length === 0 && pngFiles.length > 0) {
    results.push({
      fonte: 'pasta',
      warning:
        'Só há PNG/printscreen. Este import lê HTML (Salvar página / dump SOOLLAR). OCR de print = futuro.',
    });
  }

  try {
    const feiraJson = path.join(resolved, '_feira_produtos.json');
    if (fs.existsSync(feiraJson)) {
      results.push({
        fonte: 'feira-json',
        ...importFeiraJsonToCd('Feira de Santana', feiraJson),
      });
    }
  } catch (e) {
    results.push({ fonte: 'feira-json', error: e instanceof Error ? e.message : String(e) });
  }

  let arquivosUsados = 0;
  for (const entry of CD_PATTERNS) {
    const files = expandGlobs(resolved, entry.globs).filter((f) => /\.html?$/i.test(f));
    files.sort((a, b) => {
      const ha = fs.readFileSync(a, 'utf8');
      const hb = fs.readFileSync(b, 'utf8');
      const score = (h: string) =>
        (h.match(/Estoque dispon/gi) || []).length * 1000 +
        (h.match(/R\$\s*[\d.,]+/g) || []).length +
        h.length / 10000;
      return score(hb) - score(ha);
    });

    let anyMatch = 0;
    for (const file of files) {
      try {
        const html = fs.readFileSync(file, 'utf8');
        const estoqueHits = (html.match(/Estoque dispon/gi) || []).length;
        if (estoqueHits === 0) {
          results.push({
            fonte: 'html',
            cd: entry.cd,
            file: path.basename(file),
            warning: 'HTML sem estoque/preço — ignorado',
          });
          continue;
        }
        const r = importHtmlFileToCd(file, entry.cd);
        results.push({ fonte: 'html', cd: entry.cd, file: path.basename(file), ...r });
        anyMatch += r.matched || 0;
        arquivosUsados += 1;
      } catch (e) {
        results.push({
          fonte: 'html',
          cd: entry.cd,
          file: path.basename(file),
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }
    if (!files.length) {
      results.push({
        fonte: 'html',
        cd: entry.cd,
        warning: `nenhum HTML deste CD na pasta`,
      });
    } else if (anyMatch === 0) {
      results.push({
        fonte: 'html',
        cd: entry.cd,
        warning: 'dumps encontrados mas 0 match (parser/matcher)',
      });
    }
  }

  mergeAndSaveRejeitados({
    fonte: 'pasta',
    totalLidos: htmlFiles.length,
    totalAceitos: arquivosUsados,
    itens: [],
  });

  return {
    results,
    stats: getPrecosStats(),
    baseDir: resolved,
    arquivos: arquivosUsados,
  };
}
