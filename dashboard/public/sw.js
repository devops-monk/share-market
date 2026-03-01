const CACHE_NAME = 'sm-dashboard-v2';
const DATA_CACHE = 'sm-data-v2';

// App shell — cached on install
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
];

// Install: cache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== DATA_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Notify all clients of data update
async function notifyClients() {
  const clients = await self.clients.matchAll({ type: 'window' });
  for (const client of clients) {
    client.postMessage({ type: 'DATA_UPDATED', timestamp: new Date().toISOString() });
  }
}

// Fetch: stale-while-revalidate for data, cache-first for app shell
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Data files — stale-while-revalidate: serve cached immediately, fetch in background
  if (url.pathname.startsWith('/data/')) {
    event.respondWith(
      caches.open(DATA_CACHE).then(async (cache) => {
        const cached = await cache.match(event.request);

        // Revalidate in background
        const fetchPromise = fetch(event.request)
          .then((response) => {
            cache.put(event.request, response.clone());
            notifyClients();
            return response;
          })
          .catch(() => null);

        // Return cached immediately if available, otherwise wait for network
        if (cached) return cached;
        const networkResponse = await fetchPromise;
        return networkResponse || new Response('Offline', { status: 503 });
      })
    );
    return;
  }

  // App shell & navigation — network first, fallback to cache
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Static assets — cache first
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});

// Stub sync handler for future background sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'sm-background-sync') {
    event.waitUntil(
      // Future: sync offline changes
      Promise.resolve()
    );
  }
});
