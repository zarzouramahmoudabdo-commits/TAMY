/* TAMY service worker: الشبكة أولًا ثم الكاش (يعمل أوفلاين بعد أول فتح) */
const CACHE = 'tamy-v1';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || req.headers.has('range')) return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.indexOf('/_capacitor_file_') > -1) return;
  e.respondWith(netFirst(req));
});
async function netFirst(req) {
  const cache = await caches.open(CACHE);
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 4000);
    const res = await fetch(req, { cache: 'no-store', signal: ctl.signal });
    clearTimeout(t);
    if (res && res.ok && res.type === 'basic') cache.put(req, res.clone()).catch(() => {});
    return res;
  } catch (err) {
    const hit = (await cache.match(req, { ignoreSearch: true })) ||
      (req.mode === 'navigate' ? await cache.match(new URL('index.html', self.registration.scope).href, { ignoreSearch: true }) : null);
    if (hit) return hit;
    return fetch(req);
  }
}
