const CACHE_NAME = 'ichef-cache-v12'; // 🚀 v12 pour forcer tous tes appareils à se synchroniser

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

// 3. BOUCLIER RÉSEAU INTELLIGENT
self.addEventListener('fetch', (event) => {
    const req = event.request;
    const url = new URL(req.url);

    // 🚨 REGLE D'OR : On laisse passer en direct TOUTES les requêtes de données (API, États, Mises à jour, POST, etc.)
    if (
        req.method !== 'GET' || 
        url.pathname.startsWith('/api/') || 
        url.pathname.includes('get-current-state') || 
        url.pathname.includes('update-order')
    ) {
        return; // Le navigateur interroge le serveur Render directement sans passer par le cache !
    }

    // Stratégie "Network First" pour le reste (Fichiers HTML, CSS, polices d'écriture)
    event.respondWith(
        fetch(req).then((response) => {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
                cache.put(req, responseClone);
            });
            return response;
        }).catch(() => {
            return caches.match(req);
        })
    );
});
