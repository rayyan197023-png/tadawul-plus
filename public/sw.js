/**
 * Tadawul+ Service Worker
 * 
 * Strategy: Network-first with cache fallback
 * - HTML/JS: Network first (always fresh)
 * - Static assets: Cache first
 * - Images: Cache first with revalidation
 */

const CACHE_NAME = 'tadawul-plus-v1';
const STATIC_CACHE = 'tdw-static-v2';
const RUNTIME_CACHE = 'tdw-runtime-v1';

// Files to cache on install
const PRECACHE_URLS = [
  '/',
  '/manifest.json',
  '/icon.svg',
  '/icon-192.png',
];

// ═══════════════════════════════════════════════
// 📦 Install: Precache critical files
// ═══════════════════════════════════════════════

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// ═══════════════════════════════════════════════
// 🧹 Activate: Clean old caches
// ═══════════════════════════════════════════════

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => 
              name !== STATIC_CACHE && 
              name !== RUNTIME_CACHE
            )
            .map((name) => caches.delete(name))
        );
      })
      .then(() => self.clients.claim())
  );
});

// ═══════════════════════════════════════════════
// 🌐 Fetch: Smart caching strategy
// ═══════════════════════════════════════════════

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip API calls (always live)
  if (url.pathname.startsWith('/api/')) return;

  // Skip Chrome extension requests
  if (url.protocol === 'chrome-extension:') return;

  // Strategy: HTML pages - Network first
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(RUNTIME_CACHE)
            .then((cache) => cache.put(request, responseClone));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Strategy: Static assets - Cache first
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/fonts/') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.webp') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.woff2')
  ) {
    event.respondWith(
      caches.match(request)
        .then((cached) => {
          if (cached) return cached;
          
          return fetch(request)
            .then((response) => {
              if (!response.ok) return response;
              
              const responseClone = response.clone();
              caches.open(STATIC_CACHE)
                .then((cache) => cache.put(request, responseClone));
              
              return response;
            });
        })
    );
    return;
  }

  // Strategy: Everything else - Network first with cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (!response.ok) return response;
        
        const responseClone = response.clone();
        caches.open(RUNTIME_CACHE)
          .then((cache) => cache.put(request, responseClone));
        
        return response;
      })
      .catch(() => caches.match(request))
  );
});

// ═══════════════════════════════════════════════
// 🔄 Message handling (for cache updates)
// ═══════════════════════════════════════════════

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data === 'CLEAR_CACHE') {
    caches.keys().then((cacheNames) => {
      cacheNames.forEach((name) => caches.delete(name));
    });
  }
});
