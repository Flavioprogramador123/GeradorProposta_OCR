import type { NextApiRequest, NextApiResponse } from 'next';
import { IncomingForm, type File } from 'formidable';
import fs from 'fs';
import path from 'path';
import { isServerlessFs } from '@/lib/serverlessFs';
import {
  importarPrecosDaPasta,
  prepareImportPastaDir,
} from '@/modules/v3/precos/importFromPasta';

export const config = {
  api: {
    bodyParser: false,
    responseLimit: false,
  },
};

function asFiles(f: File | File[] | undefined): File[] {
  if (!f) return [];
  return Array.isArray(f) ? f : [f];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });
  if (isServerlessFs()) {
    return res.status(503).json({
      ok: false,
      message: 'Importar pasta só no localhost (PC).',
    });
  }

  try {
    const form = new IncomingForm({
      multiples: true,
      maxFileSize: 40 * 1024 * 1024,
      keepExtensions: true,
    });

    const { files } = await new Promise<{ files: Record<string, File | File[]> }>((resolve, reject) => {
      form.parse(req, (err, _fields, parsedFiles) => {
        if (err) reject(err);
        else resolve({ files: parsedFiles as Record<string, File | File[]> });
      });
    });

    const uploaded = [
      ...asFiles(files.files),
      ...asFiles(files.file),
      ...asFiles(files.dumps),
    ];

    const usable = uploaded.filter((f) => {
      const name = f.originalFilename || f.newFilename || '';
      return /\.(html?|json)$/i.test(name);
    });

    if (!usable.length) {
      return res.status(400).json({
        ok: false,
        message:
          'Nenhum HTML/JSON na pasta. Use “Salvar página” do SOOLLAR (não só printscreen PNG).',
      });
    }

    const dir = prepareImportPastaDir();
    for (const f of usable) {
      const base = path.basename(f.originalFilename || f.newFilename || `dump-${Date.now()}.html`);
      // webkitdirectory manda paths tipo "subdir/file.html" — só o nome
      const safe = base.replace(/[<>:"|?*\\/]/g, '_');
      const dest = path.join(dir, safe);
      const src = f.filepath;
      fs.copyFileSync(src, dest);
      try {
        fs.unlinkSync(src);
      } catch {
        /* ignore */
      }
    }

    const result = await importarPrecosDaPasta(dir);
    const { listDivergenciasPrecos, formatDivergenciasResumo } = await import(
      '@/modules/v3/precos/divergenciaPrecos'
    );
    const divergencias = listDivergenciasPrecos();
    return res.status(200).json({
      ok: true,
      fonte: 'pasta',
      ...result,
      uploaded: usable.length,
      divergencias,
      divergenciasResumo: formatDivergenciasResumo(divergencias),
    });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      message: e instanceof Error ? e.message : String(e),
    });
  }
}
