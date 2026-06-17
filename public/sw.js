/* MRLC LMS service worker — app-shell offline caching.
 * Strategy:
 *   - API (/api/*) and the Vite dev pipeline: always network (never cached).
 *   - Hashed build assets + images/fonts: cache-first (immutable across builds).
 *   - Google Fonts: cache-first so the UI font works offline after first visit.
 *   - SPA navigations: network-first, falling back to the cached app shell,
 *     then an offline page.
 */
const VERSION = 'mrlc-v1';
const STATIC_CACHE = `static-${VERSION}`;
const FONT_CACHE = `fonts-${VERSION}`;

const PRECACHE = [
  '/',
  '/manifest.webmanifest',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-512.png',
  '/apple-touch-icon.png',
  '/favicon.ico',
  '/offline.html',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== STATIC_CACHE && k !== FONT_CACHE)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// Allow the page to trigger an immediate update.
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

function isViteDev(url) {
  return (
    url.pathname.startsWith('/@') ||
    url.pathname.startsWith('/src/') ||
    url.pathname.includes('/.vite/') ||
    url.pathname.includes('/node_modules/') ||
    url.searchParams.has('t') ||
    url.pathname.includes('__vite')
  );
}

const ASSET_RE = /\.(?:js|mjs|css|woff2?|ttf|otf|png|jpe?g|svg|gif|ico|webp)$/;

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  let url;
  try {
    url = new URL(req.url);
  } catch {
    return;
  }

  // Never intercept the API or the dev/HMR pipeline.
  if (url.origin === location.origin && (url.pathname.startsWith('/api/') || isViteDev(url))) {
    return;
  }

  // Google Fonts — cache-first.
  if (url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com') {
    event.respondWith(cacheFirst(req, FONT_CACHE));
    return;
  }

  // Same-origin static/build assets — cache-first.
  if (url.origin === location.origin && (url.pathname.startsWith('/assets/') || ASSET_RE.test(url.pathname))) {
    event.respondWith(cacheFirst(req, STATIC_CACHE));
    return;
  }

  // SPA navigations — network-first with offline fallback.
  if (req.mode === 'navigate') {
    event.respondWith(networkFirstNav(req));
  }
});

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  if (cached) return cached;
  try {
    const res = await fetch(req);
    if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
    return res;
  } catch {
    return cached || Response.error();
  }
}

async function networkFirstNav(req) {
  const cache = await caches.open(STATIC_CACHE);
  try {
    const res = await fetch(req);
    cache.put('/', res.clone()); // keep the latest app shell
    return res;
  } catch {
    return (await cache.match('/')) || (await cache.match('/offline.html')) || Response.error();
  }
}
