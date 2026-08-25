const CACHE_NAME = 'ichef-cache-v18'; // On passe en v18 pour être sûr que tout le monde se mette à jour
const DYNAMIC_CACHE = 'ichef-dynamic-v18';

// ROUTAGE STRICT : Remplacement des "./" par "/" et ajout obligatoire de "/index.html"
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/connexionpartenaire.html',
  '/administration.html',
  '/pack-eco.html',
  '/chef-bar.html',
  '/chef-patissier.html',
  '/chef.html',
  '/menu-qr.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/logo-ichef.png',
  '/mockup-ichef.png'
];

self.addEventListener('install', (event) => {
    self.skipWaiting(); 
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return Promise.allSettled(
                ASSETS_TO_CACHE.map(url => cache.add(url).catch(err => console.log(`[iCHEF SW] Fichier ignoré : ${url}`)))
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
                // 🛡️ MAGIE HORS-LIGNE : Renvoi d'un statut 503 propre pour la file d'attente
                return new Response(
                    JSON.stringify({ success: false, error: "NETWORK_UNAVAILABLE", offline: true }),
                    { headers: { 'Content-Type': 'application/json' }, status: 503 }
                );
            })
        );
        return; 
    }

    // 3. FICHIERS STATIQUES -> NETWORK FIRST (Réseau en priorité, Cache en secours)
    // C'est LA solution pour que les mises à jour HTML s'appliquent automatiquement !
    event.respondWith(
        fetch(event.request).then((networkResponse) => {
            // Si le réseau fonctionne, on met à jour le cache dynamique discrètement avec la nouvelle version
            if(networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                const responseClone = networkResponse.clone();
                caches.open(DYNAMIC_CACHE).then((cache) => {
                    cache.put(event.request, responseClone);
                });
            }
            return networkResponse; // On renvoie la version toute fraîche
            
        }).catch(() => {
            // 🛡️ HORS-LIGNE : Si le réseau est coupé, on sert ce qu'on a gardé en mémoire !
            return caches.match(event.request).then((cachedResponse) => {
                if (cachedResponse) {
                    return cachedResponse;
                }
                
                // Si pas de réseau et fichier non trouvé dans le cache : retour page connexion
                if (event.request.headers.get('accept') && event.request.headers.get('accept').includes('text/html')) {
                    return caches.match('/connexionpartenaire.html');
                }
            });
        })
    );
});
