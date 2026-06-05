const CACHE_NAME = 'ichef-cache-v2';

// 1. INSTALLATION IMMÉDIATE (Sécurité)
self.addEventListener('install', (event) => {
    self.skipWaiting(); 
});

// 2. NETTOYAGE DES ANCIENNES VERSIONS
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

// 3. BOUCLIER RÉSEAU (Stratégie "Network First" pour la caisse)
self.addEventListener('fetch', (event) => {
    // On ignore les requêtes API et les envois de base de données (POST)
    if (event.request.method !== 'GET' || event.request.url.includes('/api/')) return;

    event.respondWith(
        fetch(event.request).then((response) => {
            // Si Internet est OK, on sauvegarde une copie de sécurité
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseClone);
            });
            return response;
        }).catch(() => {
            // 🚨 SI INTERNET COUPE : On renvoie l'application depuis la mémoire du téléphone !
            return caches.match(event.request);
        })
    );
});
