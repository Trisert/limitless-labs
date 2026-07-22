/* Limitless Labs — PWA service worker, cache-first for static assets */
const CACHE_NAME = 'limitless-labs-static-v1';
const PRECACHE_URLS = [
  '/limitless-labs/',
  '/limitless-labs/index.html',
  '/limitless-labs/style.css?v=3',
  '/limitless-labs/hero3d.js',
  '/limitless-labs/scroll.js',
  '/limitless-labs/vendor/three.module.js',
  '/limitless-labs/fonts/space-grotesk.woff2',
  '/limitless-labs/fonts/ibm-plex-sans.woff2',
  '/limitless-labs/fonts/jetbrains-mono.woff2',
  '/limitless-labs/privacy.html',
  '/limitless-labs/robots.txt',
  '/limitless-labs/sitemap.xml',
  '/limitless-labs/favicon.ico',
  '/limitless-labs/manifest.json'
];

function cacheFirst(request) {
  return caches.open(CACHE_NAME).then(function (cache) {
    return cache.match(request).then(function (cached) {
      const fetched = fetch(request).then(function (network) {
        cache.put(request, network.clone());
        return network;
      }).catch(function () {
        return cached || new Response('Offline', { status: 503, statusText: 'Offline' });
      });
      return cached || fetched;
    });
  });
}

function networkFirstNavigate(request) {
  return fetch(request).then(function (response) {
    if (!response || response.status !== 200) {
      return caches.match('/limitless-labs/index.html');
    }
    const clone = response.clone();
    caches.open(CACHE_NAME).then(function (cache) {
      cache.put(request, clone);
    });
    return response;
  }).catch(function () {
    return caches.match('/limitless-labs/index.html');
  });
}

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(PRECACHE_URLS).catch(function () {
        /* tolerate missing optional assets during early install */
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (key) {
          return key !== CACHE_NAME;
        }).map(function (key) {
          return caches.delete(key);
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function (event) {
  var request = event.request;
  if (request.method !== 'GET') {
    return;
  }
  if (request.mode === 'navigate' || (request.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(networkFirstNavigate(request));
    return;
  }
  event.respondWith(cacheFirst(request));
});
