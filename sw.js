const CACHE_NAME = 'joel-provningen-v2';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if(request.method !== 'GET') return;

  const url = new URL(request.url);
  if(url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(request)
      .then(response => {
        if(!response.ok) return response;
        const copy = response.clone();
        event.waitUntil(
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy))
        );
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if(cached) return cached;
        if(request.mode === 'navigate') return caches.match('./index.html');
        throw new Error(`Offline and uncached: ${request.url}`);
      })
  );
});
