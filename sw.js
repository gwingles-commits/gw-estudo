const CACHE = 'gw-ingles-v4';
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

  // O HTML vai SEMPRE buscar na rede sem passar pelo cache HTTP do navegador: o nginx nao
  // manda Cache-Control, e o Chrome guardava o index.html velho por dias depois do deploy
  // (regra heuristica pelo last-modified). Offline, cai na copia do service worker. [2026-09-15]
  const ehHtml = e.request.mode === 'navigate' || url.endsWith('/') || url.endsWith('.html');
  e.respondWith(
    fetch(e.request, ehHtml ? { cache: 'no-store' } : {}).then(resp => {
      if (ehHtml && resp && resp.status === 200) { const c = resp.clone(); caches.open(CACHE).then(cache => cache.put(e.request, c)); }
      return resp;
    }).catch(() => caches.match(e.request))
  );
});
