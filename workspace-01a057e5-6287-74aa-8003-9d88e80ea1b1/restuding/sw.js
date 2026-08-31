/* RESTUDING — Service Worker (cache offline, PWA) */
const CACHE = 'restuding-v0.6';
const ASSETS = ['./', './Restuding.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).then(res => {
      const cl = res.clone();
      if (res.ok) caches.open(CACHE).then(c => c.put(e.request, cl));
      return res;
    }).catch(() => caches.match('./Restuding.html')))
  );
});
