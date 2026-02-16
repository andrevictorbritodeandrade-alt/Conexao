const CACHE_NAME = 'conexao-v7';
const urlsToCache = [
  './',
  './index.html',
  './index.tsx',
  './App.tsx',
  './manifest.json'
];

// Install SW and cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// Activate and clean up old caches
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch strategy: Stale-While-Revalidate for most things, Network First for HTML
self.addEventListener('fetch', (event) => {
  // For navigation requests (loading the page), try network first, then cache
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.match('./index.html');
        })
    );
    return;
  }

  // For other resources, try cache first, then network
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request).then(
          (response) => {
            // Don't cache valid responses from esm.sh heavily or chrome extensions
            if(!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            return response;
          }
        );
      })
  );
});