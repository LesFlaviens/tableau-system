const CACHE_NAME = 'ichef-cache-v16'; // 💥 On passe à la v16 pour forcer le nettoyage !
const DYNAMIC_CACHE = 'ichef-dynamic-v16';

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
                    if (cacheName !== CACHE_NAME && cacheName !== DYNAMIC_CACHE) {
                        console.log(`🧹 Nettoyage de l'ancien cache: ${cacheName}`);
                        return caches.delete(cacheName); 
                    }
                })
            );
        }).then(() => self.clients.claim()) // Prend le contrôle immédiat des clients
    );
});

self.addEventListener('fetch', (event) => {
    // 1. PATCH VIDÉO : Exclusion des requêtes de flux (évite le crash 206)
    if (event.request.headers.get('range')) {
        return; 
    }

    // 2. REQUÊTES API (Réseau seulement, interception en cas de coupure)
    if (event.request.method !== 'GET' || 
        event.request.url.includes('/api/') || 
        event.request.url.includes('/get-current-state') || 
        event.request.url.includes('/update-order')) {
        
        event.respondWith(
            fetch(event.request).catch(() => {
                // 🛡️ MAGIE HORS-LIGNE : Si l'API échoue car pas de WiFi, on renvoie un faux JSON propre.
                // Cela empêche l'application de crasher et permet à ta file d'attente hors-ligne de prendre le relais.
                return new Response(
                    JSON.stringify({ success: false, error: "NETWORK_UNAVAILABLE", offline: true }),
                    { headers: { 'Content-Type': 'application/json' }, status: 503 }
                );
            })
        );
        return; 
    }

    // 3. FICHIERS STATIQUES (Interface, CSS, Images) -> CACHE FIRST
    // L'interface s'affiche instantanément, même si le réseau est lent
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse; // On sert depuis le cache immédiatement
            }
            
            // Si ce n'est pas dans le cache, on le télécharge et on l'ajoute au cache dynamique
            return fetch(event.request).then((networkResponse) => {
                // Vérification de validité de la réponse avant mise en cache
                if(!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                    return networkResponse;
                }
                const responseClone = networkResponse.clone();
                caches.open(DYNAMIC_CACHE).then((cache) => {
                    cache.put(event.request, responseClone);
                });
                return networkResponse;
            }).catch(() => {
                // Si pas de réseau et fichier non trouvé dans le cache : retour page connexion
                if (event.request.headers.get('accept').includes('text/html')) {
                    return caches.match('./connexionpartenaire.html');
                }
            });
        })
    );
});
