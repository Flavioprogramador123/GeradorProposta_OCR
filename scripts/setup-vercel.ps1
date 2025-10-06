# 🌐 PIENG-ENTERPRISE - CONFIGURAÇÃO VERCEL
# Configuração completa do Vercel para deploy

Write-Host ""
Write-Host "🌐 CONFIGURANDO VERCEL" -ForegroundColor Blue
Write-Host "=====================" -ForegroundColor Blue
Write-Host ""

# 1. INSTALAR VERCEL CLI
Write-Host "📦 Instalando Vercel CLI..." -ForegroundColor Yellow
npm install -g vercel

# 2. CONFIGURAR PROJETO
Write-Host "🔧 Configurando projeto..." -ForegroundColor Yellow
Set-Location frontend-unified

# Criar vercel.json
@"
{
  "version": 2,
  "name": "pieng-enterprise",
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ],
  "env": {
    "NEXT_PUBLIC_SUPABASE_URL": "@supabase_url",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "@supabase_anon_key",
    "GEMINI_API_KEY": "@gemini_api_key",
    "OPENAI_API_KEY": "@openai_api_key",
    "OPENROUTER_API_KEY": "@openrouter_api_key",
    "GOOGLE_DRIVE_CLIENT_ID": "@google_drive_client_id",
    "GOOGLE_DRIVE_CLIENT_SECRET": "@google_drive_client_secret",
    "GOOGLE_MAPS_API_KEY": "@google_maps_api_key"
  },
  "functions": {
    "src/pages/api/**/*.ts": {
      "runtime": "nodejs18.x"
    }
  }
}
"@ | Out-File -FilePath "vercel.json" -Encoding UTF8

# 3. CONFIGURAR BUILD
Write-Host "🔧 Configurando build..." -ForegroundColor Yellow

# Atualizar package.json com scripts de build
$packageJson = Get-Content "package.json" | ConvertFrom-Json
$packageJson.scripts.build = "tsc && vite build"
$packageJson.scripts.preview = "vite preview"
$packageJson | ConvertTo-Json -Depth 10 | Out-File -FilePath "package.json" -Encoding UTF8

# 4. CONFIGURAR DOMAIN
Write-Host "🌐 Configurando domínio..." -ForegroundColor Yellow

# Criar arquivo de configuração de domínio
@"
# Configuração do domínio piengsolucoes.com.br
# 
# 1. Configurar DNS:
#    - A record: @ -> 76.76.19.61
#    - CNAME: www -> cname.vercel-dns.com
#
# 2. Configurar SSL:
#    - Automático via Vercel
#
# 3. Configurar subdomínios:
#    - api.piengsolucoes.com.br -> Google Cloud Run
#    - admin.piengsolucoes.com.br -> Vercel
#    - goteste.piengsolucoes.com.br -> Vercel
"@ | Out-File -FilePath "DOMAIN_CONFIG.md" -Encoding UTF8

# 5. CONFIGURAR ENVIRONMENT VARIABLES
Write-Host "🔧 Configurando variáveis de ambiente..." -ForegroundColor Yellow

# Criar .env.example
@"
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Google Cloud
NEXT_PUBLIC_GOOGLE_CLOUD_PROJECT_ID=pieng-enterprise
NEXT_PUBLIC_GOOGLE_CLOUD_REGION=us-central1

# APIs (não expor no frontend)
GEMINI_API_KEY=your_gemini_api_key
OPENAI_API_KEY=your_openai_api_key
OPENROUTER_API_KEY=your_openrouter_api_key
GOOGLE_DRIVE_CLIENT_ID=your_google_drive_client_id
GOOGLE_DRIVE_CLIENT_SECRET=your_google_drive_client_secret
GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# URLs de produção
NEXT_PUBLIC_API_URL=https://pieng-goteste-xxxxx-uc.a.run.app
NEXT_PUBLIC_GOOGLE_DRIVE_API_URL=https://pieng-goteste-xxxxx-uc.a.run.app/api/google-drive
"@ | Out-File -FilePath ".env.example" -Encoding UTF8

# 6. CONFIGURAR PWA
Write-Host "📱 Configurando PWA..." -ForegroundColor Yellow

# Criar manifest.json
@"
{
  "name": "PIENG-ENTERPRISE",
  "short_name": "PIENG",
  "description": "Sistema unificado de gestão solar",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#3b82f6",
  "icons": [
    {
      "src": "/favicon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/favicon-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
"@ | Out-File -FilePath "public/manifest.json" -Encoding UTF8

# 7. CONFIGURAR SERVICE WORKER
Write-Host "🔧 Configurando Service Worker..." -ForegroundColor Yellow

# Criar service worker
@"
const CACHE_NAME = 'pieng-enterprise-v1';
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});
"@ | Out-File -FilePath "public/sw.js" -Encoding UTF8

# 8. CONFIGURAR ANALYTICS
Write-Host "📊 Configurando analytics..." -ForegroundColor Yellow

# Criar componente de analytics
@"
import { useEffect } from 'react';

declare global {
  interface Window {
    gtag: (...args: any[]) => void;
  }
}

export const Analytics = () => {
  useEffect(() => {
    // Google Analytics
    const script = document.createElement('script');
    script.src = 'https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID';
    script.async = true;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    function gtag(...args: any[]) {
      window.dataLayer.push(args);
    }
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', 'GA_MEASUREMENT_ID');
  }, []);

  return null;
};
"@ | Out-File -FilePath "src/components/Analytics.tsx" -Encoding UTF8

# 9. DEPLOY
Write-Host "🚀 Fazendo deploy..." -ForegroundColor Yellow

# Login no Vercel
Write-Host "🔐 Fazendo login no Vercel..." -ForegroundColor Cyan
vercel login

# Deploy
Write-Host "🚀 Deployando para Vercel..." -ForegroundColor Green
vercel --prod

# 10. CONFIGURAR DOMAIN
Write-Host "🌐 Configurando domínio personalizado..." -ForegroundColor Yellow
vercel domains add piengsolucoes.com.br

Set-Location ..

Write-Host ""
Write-Host "✅ VERCEL CONFIGURADO!" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 URLs de produção:" -ForegroundColor Purple
Write-Host "   • Frontend: https://piengsolucoes.com.br" -ForegroundColor White
Write-Host "   • Admin: https://admin.piengsolucoes.com.br" -ForegroundColor White
Write-Host "   • GoTeste: https://goteste.piengsolucoes.com.br" -ForegroundColor White
Write-Host ""
Write-Host "🔧 Próximos passos:" -ForegroundColor Purple
Write-Host "   1. Configurar DNS do domínio" -ForegroundColor White
Write-Host "   2. Configurar SSL" -ForegroundColor White
Write-Host "   3. Configurar variáveis de ambiente" -ForegroundColor White
Write-Host "   4. Testar em produção" -ForegroundColor White
Write-Host ""


