// PIENG PWA Service Worker
// Versão 1.0.0 - Cache offline para propostas solares

const CACHE_NAME = 'pieng-propostas-v1';
const RUNTIME_CACHE = 'pieng-runtime-v1';

// Arquivos essenciais para cache imediato (install)
const PRECACHE_URLS = [
  '/',
  '/admin',
  '/gerador-rapido',
  '/propostas-publicas',
  '/proposta/exemplo',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png'
];

// Install - cachear arquivos essenciais
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Precaching app shell');
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate - limpar caches antigos
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch - estratégia Network First com cache fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar requisições não-HTTP e de outros domínios
  if (!request.url.startsWith('http') || url.origin !== location.origin) {
    return;
  }

  // Ignorar requisições POST/PUT/DELETE (APIs que modificam dados)
  if (request.method !== 'GET') {
    return;
  }

  // Estratégia: Network First, Cache Fallback
  event.respondWith(
    caches.open(RUNTIME_CACHE).then((cache) => {
      return fetch(request)
        .then((response) => {
          // Se a resposta for válida, cachear e retornar
          if (response && response.status === 200) {
            // Cachear apenas HTML, CSS, JS, imagens e propostas
            const shouldCache =
              request.url.includes('/proposta/') ||
              request.url.includes('/admin') ||
              request.url.includes('.css') ||
              request.url.includes('.js') ||
              request.url.includes('.png') ||
              request.url.includes('.jpg') ||
              request.url.includes('.svg');

            if (shouldCache) {
              cache.put(request, response.clone());
            }
          }
          return response;
        })
        .catch(() => {
          // Se falhar (offline), buscar do cache
          return cache.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              console.log('[SW] Serving from cache:', request.url);
              return cachedResponse;
            }

            // Se não tiver no cache, retornar página offline
            if (request.destination === 'document') {
              return cache.match('/admin').then((adminPage) => {
                return adminPage || new Response(
                  '<html><body><h1>Offline</h1><p>Conecte-se à internet para acessar esta página.</p></body></html>',
                  { headers: { 'Content-Type': 'text/html' } }
                );
              });
            }

            // Para outros recursos, retornar erro
            return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
          });
        });
    })
  );
});

// Background Sync - sincronizar dados quando voltar online (futuro)
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  if (event.tag === 'sync-propostas') {
    event.waitUntil(syncPropostas());
  }
});

async function syncPropostas() {
  console.log('[SW] Syncing propostas...');
  // Implementação futura: sincronizar propostas offline com servidor
}

// Push Notifications (futuro)
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received:', event);
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'PIENG Propostas';
  const options = {
    body: data.body || 'Nova notificação',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    data: data.url || '/admin'
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data || '/admin')
  );
});

console.log('[SW] Service Worker loaded successfully! 🚀');
