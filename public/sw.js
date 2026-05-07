const CACHE_NAME = 'aether-ai-cache-v1';

// We dynamically intercept and cache GET requests for offline capability
self.addEventListener('install', (event) => {
  // Force the waiting service worker to become active immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Take control of all pages immediately
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // We only cache GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Skip chrome-extensions, browser internals, or API telemetry
  if (
    url.protocol.startsWith('chrome-extension:') ||
    url.hostname === 'chrome' ||
    url.pathname.startsWith('/@id/') ||
    url.pathname.startsWith('/@vite/')
  ) {
    return;
  }

  // Use a Network-First falling back to Cache strategy
  // This is optimal for dev-mode Hot Module Replacement while allowing complete offline operation!
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // If response is valid, clone it and save to cache
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // Offline: attempt to retrieve from cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // Fallback if index.html is requested but not in cache
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
        });
      })
  );
});
