const CACHE_NAME = 'ichef-empire-v10'; // 🚀 PASSAGE EN V10 POUR FORCER LA MISE À JOUR

const ASSETS_TO_CACHE = [
  './',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './logo-ichef.png'
];

self.addEventListener('install', (event) => {
    self.skipWaiting(); 
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return Promise.allSettled(
                ASSETS_TO_CACHE.map(url => cache.add(url).catch(err => console.log(`Fichier ignoré : ${url}`)))
            );
        })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const req = event.request;
    const url = new URL(req.url);

    if (req.method !== 'GET' || url.pathname.startsWith('/api/') || url.pathname.includes('/get-current-state') || url.pathname.includes('/update-order')) {
        return; 
    }

    if (req.headers.get('accept') && req.headers.get('accept').includes('text/html')) {
        event.respondWith(
            fetch(req).then((networkResponse) => {
                let responseClone = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(req, responseClone);
                });
                return networkResponse;
            }).catch(() => {
                return caches.match(req);
            })
        );
        return;
    }

    event.respondWith(
        caches.match(req).then(cachedRes => {
            return cachedRes || fetch(req).then((fetchRes) => {
                let responseClone = fetchRes.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(req, responseClone));
                return fetchRes;
            });
        })
    );
});
