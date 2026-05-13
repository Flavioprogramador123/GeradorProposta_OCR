/**
 * 🎨 CSS LOADER - PIENG SOLAR
 * 
 * Sistema híbrido para carregar CSS de templates:
 * 1. Supabase Storage (produção)
 * 2. Arquivos locais (desenvolvimento/fallback)
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

interface LoadCssOptions {
  cssFile: string;
  variantId?: string;
  preferStorage?: boolean;
}

/**
 * Carrega CSS de múltiplas fontes (Supabase Storage > Arquivos locais)
 */
export async function loadVariantCss(options: LoadCssOptions): Promise<string | null> {
  const { cssFile, variantId, preferStorage = false } = options;

  // Estratégia 1: Tentar Supabase Storage (se preferStorage = true ou em produção)
  const isProduction = process.env.VERCEL || process.env.NETLIFY || process.env.NODE_ENV === 'production';
  
  if (preferStorage || isProduction) {
    try {
      const cssFromStorage = await loadCssFromSupabaseStorage(cssFile, variantId);
      if (cssFromStorage) {
        console.log(`✅ CSS carregado do Supabase Storage: ${cssFile}`);
        return cssFromStorage;
      }
    } catch (error) {
      console.warn(`⚠️ Erro ao carregar CSS do Supabase Storage: ${error instanceof Error ? error.message : 'unknown'}`);
    }
  }

  // Estratégia 2: Tentar arquivos locais (fallback)
  try {
    const cssPathsToTry = [
      // Tentar com nome exato
      path.join(process.cwd(), 'public/styles', cssFile),
      path.join(process.cwd(), 'src/styles/variants', cssFile),
      path.join(process.cwd(), 'src/styles', cssFile),
      // Tentar sem "variants/" se o arquivo não tiver
      cssFile.includes('variants/') 
        ? path.join(process.cwd(), 'public/styles', cssFile.replace('variants/', ''))
        : null,
      cssFile.includes('variants/')
        ? path.join(process.cwd(), 'src/styles/variants', cssFile.replace('variants/', ''))
        : null,
    ].filter(Boolean) as string[];

    for (const cssPath of cssPathsToTry) {
      if (fs.existsSync(cssPath)) {
        const variantCss = fs.readFileSync(cssPath, 'utf-8');
        console.log(`✅ CSS carregado do filesystem: ${cssPath}`);
        return variantCss;
      }
    }
  } catch (error) {
    console.warn(`⚠️ Erro ao carregar CSS do filesystem: ${error instanceof Error ? error.message : 'unknown'}`);
  }

  console.warn(`⚠️ CSS não encontrado: ${cssFile}`);
  return null;
}

/**
 * Carrega CSS do Supabase Storage
 */
async function loadCssFromSupabaseStorage(cssFile: string, variantId?: string): Promise<string | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Tentar diferentes caminhos no storage
    const storagePaths = [
      `templates/css/${cssFile}`, // Caminho padrão
      `css/${cssFile}`, // Caminho alternativo
      variantId ? `templates/css/${variantId}.css` : null, // Por variant ID
    ].filter(Boolean) as string[];

    for (const storagePath of storagePaths) {
      const { data, error } = await supabase.storage
        .from('pieng-templates') // Bucket para templates CSS
        .download(storagePath);

      if (!error && data) {
        const text = await data.text();
        return text;
      }
    }

    return null;
  } catch (error) {
    console.error('Erro ao acessar Supabase Storage:', error);
    return null;
  }
}

/**
 * Gera tag <link> ou <style> para CSS
 */
export function generateCssTag(cssContent: string | null, cssFile: string, useInline: boolean = true): string {
  if (!cssContent) {
    // Fallback: usar <link> tag
    return `<link rel="stylesheet" href="/styles/${cssFile}">`;
  }

  if (useInline) {
    return `<style id="variant-styles-inline">${cssContent}</style>`;
  } else {
    return `<link rel="stylesheet" href="/styles/${cssFile}">`;
  }
}

