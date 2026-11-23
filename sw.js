/* अंक-IT service worker. It only makes the site installable and gives a friendly page when there is no internet.
   Never cached here: sign-in, the database and the private question files (they are cross-origin, so this worker does not see them;
   boot.js keeps its own per-account copy of the content). Pages are always fetched fresh first, so a new release shows at once. */
const VER = 'avanti-sw-v1056';
const OFFLINE = '/offline.html';
const SHELL = [OFFLINE, '/img/icon/pwa-192.png', '/vendor/fonts/inter-latin.woff2'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VER).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('avanti-sw-') && k !== VER).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
const STATIC = /\.(?:css|js|woff2|png|webp|jpg|jpeg|svg|ico)$/i;
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    /* pages: the network first; with no internet, the last copy of that page, or the offline page */
    e.respondWith(fetch(req).then(res => { if (res.ok) { const copy = res.clone(); caches.open(VER).then(c => c.put(req, copy)); } return res; })
      .catch(() => caches.match(req).then(hit => hit || caches.match(OFFLINE))));
    return;
  }
  if (STATIC.test(url.pathname)) {
    /* files (their address changes with every release): the saved copy at once, refreshed in the background */
    e.respondWith(caches.open(VER).then(c => c.match(req).then(hit => {
      const net = fetch(req).then(res => { if (res.ok) c.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    })));
  }
});
