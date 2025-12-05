/**
 * 🖼️ CONFIGURAÇÃO DE LOGOS - PIENG SOLUÇÕES ENERGÉTICAS
 * 
 * Configuração centralizada para todos os logos usados no sistema.
 * Permite fácil troca entre diferentes versões (JPG, PNG, transparente, etc.)
 */

// ============================================================================
// CONFIGURAÇÃO DE LOGOS DISPONÍVEIS
// ============================================================================

export const LOGO_PATHS = {
  // Logo principal (JPG com fundo)
  principal: '/assets/logos/logo-pieng-principal.jpg',
  
  // Logo oficial (PNG - pode ter fundo transparente)
  oficial: '/assets/logos/logo-pieng-oficial.png',
  
  // Logo simples
  simples: '/assets/logos/logo.png',
  
  // Logo em escala de cinza
  grayscale: '/assets/logos/grayscale_logo.png',
  
  // Outras variações (adicione conforme necessário)
  pieng: '/assets/logos/logo-pieng.png',
} as const;

export type LogoVariant = keyof typeof LOGO_PATHS;

// ============================================================================
// CONFIGURAÇÃO PRINCIPAL (pode ser sobrescrita por variável de ambiente)
// ============================================================================

/**
 * Logo usado para Open Graph (WhatsApp, Facebook, etc.)
 * 
 * Para mudar, defina a variável de ambiente:
 * NEXT_PUBLIC_OG_LOGO=/assets/logos/logo-pieng-oficial.png
 * 
 * Ou altere o valor padrão abaixo.
 */
export const getOgLogo = (): string => {
  // Prioridade 1: Variável de ambiente (funciona tanto no servidor quanto no cliente)
  const envLogo = process.env.NEXT_PUBLIC_OG_LOGO;
  if (envLogo) return envLogo;
  
  // Prioridade 2: Valor padrão (pode ser alterado aqui)
  // Para usar logo com fundo transparente, mude para: LOGO_PATHS.oficial
  return LOGO_PATHS.principal; // ou LOGO_PATHS.oficial para PNG transparente
};

/**
 * Logo usado no favicon e ícones do navegador
 */
export const getFaviconLogo = (): string => {
  const envFavicon = process.env.NEXT_PUBLIC_FAVICON_LOGO;
  if (envFavicon) return envFavicon;
  
  return LOGO_PATHS.principal;
};

/**
 * Logo usado nas propostas HTML (template)
 */
export const getProposalLogo = (): string => {
  const envProposal = process.env.NEXT_PUBLIC_PROPOSAL_LOGO;
  if (envProposal) return envProposal;
  
  return LOGO_PATHS.simples; // ou LOGO_PATHS.oficial
};

/**
 * Retorna a URL completa do logo para Open Graph
 * (com base URL de produção)
 */
export const getOgLogoUrl = (): string => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://pieng-propostas.vercel.app';
  const logoPath = getOgLogo();
  
  // Se já for uma URL completa, retorna como está
  if (logoPath.startsWith('http')) {
    return logoPath;
  }
  
  // Caso contrário, monta a URL completa
  return `${baseUrl}${logoPath}`;
};

/**
 * Detecta o tipo MIME do arquivo de logo
 */
export const getLogoMimeType = (logoPath: string): string => {
  if (logoPath.endsWith('.png')) return 'image/png';
  if (logoPath.endsWith('.jpg') || logoPath.endsWith('.jpeg')) return 'image/jpeg';
  if (logoPath.endsWith('.svg')) return 'image/svg+xml';
  if (logoPath.endsWith('.webp')) return 'image/webp';
  
  // Padrão: JPG
  return 'image/jpeg';
};

/**
 * Retorna informações completas do logo para meta tags
 */
export const getLogoMetaTags = () => {
  const logoUrl = getOgLogoUrl();
  const logoPath = getOgLogo();
  const mimeType = getLogoMimeType(logoPath);
  
  return {
    url: logoUrl,
    path: logoPath,
    mimeType,
    width: 1200,  // Ajuste conforme necessário
    height: 630,  // Ajuste conforme necessário
    alt: 'PIENG Soluções Energéticas - Logo'
  };
};

