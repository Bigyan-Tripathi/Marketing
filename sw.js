/* Tripathi & Brothers — Post Generator service worker
   Makes the app fully usable offline.
   Bump CACHE_VERSION whenever you change index.html or icons,
   so phones pick up the new version. */

const CACHE_VERSION = 'tb-posts-v1';
const FONT_CACHE   = 'tb-fonts-v1';

/* App shell: everything needed to launch with zero network.
   Relative paths so it works under github.io/<repo>/ . */
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png',
  './icons/favicon-64.png'
];

/* Install: pre-cache the app shell */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

/* Activate: clean out old caches */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_VERSION && k !== FONT_CACHE)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  /* Google Fonts (CSS + font files): cache-first.
     First online load fills the cache; afterwards it works offline. */
  if (url.hostname === 'fonts.googleapis.com' ||
      url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.open(FONT_CACHE).then((cache) =>
        cache.match(req).then((hit) =>
          hit || fetch(req).then((res) => {
            cache.put(req, res.clone());
            return res;
          }).catch(() => hit)
        )
      )
    );
    return;
  }

  /* Page navigations: serve cached index.html when offline */
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match('./index.html'))
    );
    return;
  }

  /* Everything else (app shell, icons): cache-first, fall back to network */
  event.respondWith(
    caches.match(req).then((hit) => hit || fetch(req))
  );
});
