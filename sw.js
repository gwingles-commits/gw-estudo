const CACHE = 'gw-ingles-v2';
const ASSETS = ['/', '/index.html', '/manifest.json', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // Sempre busca da rede para o proxy n8n (dados ao vivo)
  if (e.request.url.includes('n8n.gwingles.com')) return;

  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
