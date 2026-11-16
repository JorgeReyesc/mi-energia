// Cache de la app para que funcione sin internet.
// Sube el número de versión cuando cambies algún archivo.
const CACHE = 'mi-energia-v13';
const ASSETS = ['./', './index.html', './styles.css', './app.js', './foods.js', './sync.js', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

// cache: 'reload' evita guardar copias viejas que el navegador tenga en su caché HTTP
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE)
    .then(c => c.addAll(ASSETS.map(u => new Request(u, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Primero la red (siempre la versión más nueva); sin internet, la copia guardada
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(async cache => {
    try {
      const res = await fetch(e.request, { cache: 'no-cache' });
      if (res.ok) cache.put(e.request, res.clone());
      return res;
    } catch (err) {
      return (await cache.match(e.request, { ignoreSearch: true })) || (await cache.match('./index.html'));
    }
  }));
});
