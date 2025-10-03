// Configuração do Favicon PIENG
// src/lib/favicon-config.ts

export const PIENG_FAVICON = {
  // Favicon SVG inline (para propostas HTML estáticas)
  svgInline: `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><defs><linearGradient id='piengGradient' x1='0%' y1='0%' x2='100%' y2='100%'><stop offset='0%' style='stop-color:%233366CC;stop-opacity:1' /><stop offset='100%' style='stop-color:%23FF6B35;stop-opacity:1' /></linearGradient></defs><circle cx='16' cy='16' r='15' fill='url(%23piengGradient)' stroke='%23ffffff' stroke-width='1'/><circle cx='16' cy='16' r='12' fill='none' stroke='rgba(0,0,0,0.1)' stroke-width='1'/><text x='16' y='22' text-anchor='middle' fill='white' font-family='Arial, sans-serif' font-size='18' font-weight='900' text-shadow='0 1px 2px rgba(0,0,0,0.3)'>P</text><ellipse cx='16' cy='8' rx='8' ry='3' fill='rgba(255,255,255,0.2)'/></svg>`,
  
  // Caminhos dos arquivos de favicon
  files: {
    svg: '/favicon.svg',
    ico: '/favicon.ico',
    svg16: '/favicon-16x16.svg'
  },
  
  // Meta tags para SEO
  meta: {
    title: 'PIENG | Soluções Energéticas',
    description: 'PIENG Soluções Energéticas - Propostas solares personalizadas com mais de 35 anos de experiência',
    keywords: 'energia solar, proposta solar, PIENG, sistema fotovoltaico, energia renovável'
  }
};

// Função para gerar meta tags do favicon
export function generateFaviconMeta() {
  return `
    <link rel="icon" href="${PIENG_FAVICON.svgInline}" type="image/svg+xml">
    <link rel="icon" href="${PIENG_FAVICON.files.ico}">
    <link rel="apple-touch-icon" href="${PIENG_FAVICON.files.svg}">
    <meta name="theme-color" content="#3366CC">
  `;
}

// Função para gerar meta tags completas
export function generateMetaTags(title: string, description?: string) {
  return `
    <title>${title}</title>
    <meta name="description" content="${description || PIENG_FAVICON.meta.description}">
    <meta name="keywords" content="${PIENG_FAVICON.meta.keywords}">
    ${generateFaviconMeta()}
  `;
}
