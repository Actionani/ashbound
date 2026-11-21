// Offline support.
// The game page itself is network-first (so updates show the first time you open it online),
// falling back to the cache when offline or slow. Everything else is cache-first.
const CACHE = 'ashbound-b39e36b492';
const CORE = ['./', './index.html', './manifest.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
const isPage = req => req.mode === 'navigate' || /\/(index\.html)?$/.test(new URL(req.url).pathname);
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  e.respondWith(caches.open(CACHE).then(async cache => {
    const hit = await cache.match(req, { ignoreSearch: true });
    const net = fetch(req, isPage(req) ? { cache: 'no-store' } : undefined).then(res => {
      if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
      return res;
    }).catch(() => null);
    if (isPage(req)) {
      // Wait up to 3 seconds for the latest version, then use the saved copy.
      const timeout = new Promise(r => setTimeout(() => r(null), 3000));
      return (await Promise.race([net, timeout])) || hit || (await net) || new Response('Offline', { status: 503 });
    }
    return hit || (await net) || new Response('Offline', { status: 503 });
  }));
});
