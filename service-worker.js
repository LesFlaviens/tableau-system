const CACHE_NAME = 'ichef-cache-v15'; // 💥 La version 15 force le nettoyage !

const ASSETS_TO_CACHE = [
  './',
  './connexionpartenaire.html',
  './administration.html',
  './pack-eco.html',
  './chef-bar.html',
  './chef-patissier.html',
  './chef.html',
  './menu-qr.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
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
                        return caches.delete(cacheName); // 🧹 Détruit les anciennes versions
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    // 1. PATCH VIDÉO : Exclusion des requêtes de flux (évite le crash 206)
    if (event.request.headers.get('range')) {
        return; 
    }

    // 2. Exclusion des requêtes dynamiques et non-GET
    if (event.request.method !== 'GET' || 
        event.request.url.includes('/api/') || 
        event.request.url.includes('/get-current-state') || 
        event.request.url.includes('/update-order')) {
        return; 
    }

    // 3. Mise en cache standard pour le reste des fichiers
    event.respondWith(
        fetch(event.request).then((response) => {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseClone);
            });
            return response;
        }).catch(() => {
            return caches.match(event.request);
        })
    );
});
