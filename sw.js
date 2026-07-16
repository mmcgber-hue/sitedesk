// SiteDesk service worker — offline app shell
const CACHE = 'sitedesk-v1'; // bump this when you deploy a new index.html
const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Never intercept Supabase (API, auth, storage) or any non-GET request
  if (e.request.method !== 'GET' || url.hostname.includes('supabase')) return;

  // App shell: network-first so updates arrive, cache fallback for offline
  if (url.origin === location.origin) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
          return res;
        })
        .catch(() => caches.match(e.request).then(m => m || caches.match('./index.html')))
    );
    return;
  }

  // CDN assets (fonts, supabase-js, pdf.js): cache-first — they're versioned
  e.respondWith(
    caches.match(e.request).then(m => m || fetch(e.request).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy));
      return res;
    }))
  );
});
