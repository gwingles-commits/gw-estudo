const CACHE = 'gw-ingles-v3';
const MEDIA = 'gw-media-v1';
const ASSETS = ['/', '/index.html', '/manifest.json', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE && k !== MEDIA).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Dados ao vivo do n8n: sempre rede, nunca cache
  if (url.includes('n8n.gwingles.com')) return;

  // Mídias do Baserow (imagens/áudios): cache-first -> instantâneo no replay
  if (url.includes('baserow.gwingles.com/media/')) {
    e.respondWith(
      caches.open(MEDIA).then(cache =>
        cache.match(e.request).then(hit =>
          hit || fetch(e.request).then(resp => {
            if (resp && resp.status === 200) cache.put(e.request, resp.clone());
            return resp;
          })
        )
      )
    );
    return;
  }

  // Resto: rede primeiro, cache como reserva (offline)
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
