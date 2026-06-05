const CACHE_NAME = 'ichef-cache-v3';

// 0. LISTE DES FICHIERS VITAUX À SAUVEGARDER DÈS L'INSTALLATION
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

// 1. INSTALLATION IMMÉDIATE ET PRÉ-TÉLÉCHARGEMENT (Sécurité)
self.addEventListener('install', (event) => {
    self.skipWaiting(); 
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('📦 iCHEF : Mise en cache des fichiers critiques...');
            // Promise.allSettled permet de ne pas bloquer l'installation si une image manque
            return Promise.allSettled(
                ASSETS_TO_CACHE.map(url => cache.add(url).catch(err => console.log(`Fichier ignoré (probablement absent) : ${url}`)))
            );
        })
    );
});

// 2. NETTOYAGE DES ANCIENNES VERSIONS
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('🧹 iCHEF : Ancien cache supprimé:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// 3. BOUCLIER RÉSEAU (Stratégie "Network First" pour la caisse)
self.addEventListener('fetch', (event) => {
    // 🚨 On ignore STRICTEMENT les requêtes API et la Base de Données MongoDB
    if (event.request.method !== 'GET' || 
        event.request.url.includes('/api/') || 
        event.request.url.includes('/get-current-state') || 
        event.request.url.includes('/update-order')) {
        return;
    }

    event.respondWith(
        fetch(event.request).then((response) => {
            // Si Internet est OK, on sauvegarde une copie de sécurité fraîche
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseClone);
            });
            return response;
        }).catch(() => {
            // 🚨 SI INTERNET COUPE : On renvoie l'application depuis la mémoire de la tablette !
            console.log('📶 iCHEF : Réseau perdu. Mode hors-ligne activé pour', event.request.url);
            return caches.match(event.request);
        })
    );
});
