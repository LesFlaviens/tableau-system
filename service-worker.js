const CACHE_NAME = 'ichef-empire-v6'; // Le changement de nom force la destruction de l'ancien bug !

// 0. LISTE DES FICHIERS VITAUX À SAUVEGARDER (Uniquement le design et les icônes)
const ASSETS_TO_CACHE = [
  './',
  './manifest.json',
  './manifest-staff.json',
  './icon-192.png',
  './icon-512.png'
];

// 1. INSTALLATION IMMÉDIATE (Sécurité)
self.addEventListener('install', (event) => {
    self.skipWaiting(); 
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('📦 iCHEF : Mise en cache du design propre...');
            return Promise.allSettled(
                ASSETS_TO_CACHE.map(url => cache.add(url).catch(err => console.log(`Fichier ignoré : ${url}`)))
            );
        })
    );
});

// 2. NETTOYAGE NUCLÉAIRE DES ANCIENNES VERSIONS (Détruit le cache v3 qui bloquait tout)
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('🧹 iCHEF : Ancien cache empoisonné supprimé:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// 3. BOUCLIER RÉSEAU INTELLIGENT (La vraie magie)
self.addEventListener('fetch', (event) => {
    const req = event.request;
    const url = new URL(req.url);

    // 🚨 RÈGLE 1 : NE JAMAIS TOUCHER AUX API, MOTS DE PASSE ET BASE DE DONNÉES
    if (req.method !== 'GET' || url.pathname.startsWith('/api/') || url.pathname.includes('/get-current-state') || url.pathname.includes('/update-order')) {
        return; // Laisse le navigateur interroger le serveur en direct !
    }

    // 🌐 RÈGLE 2 : POUR LES PAGES HTML (La Caisse, l'Admin, le Portail)
    // On demande TOUJOURS à internet en premier, et on ne bloque pas la page en mémoire cache
    if (req.headers.get('accept') && req.headers.get('accept').includes('text/html')) {
        event.respondWith(
            fetch(req).catch(() => caches.match(req)) // Si coupure internet, on essaie d'afficher le reste
        );
        return;
    }

    // 🖼️ RÈGLE 3 : POUR LES IMAGES ET LE RESTE
    // On lit le cache pour aller très vite et économiser la batterie
    event.respondWith(
        caches.match(req).then(cachedRes => {
            return cachedRes || fetch(req);
        })
    );
});
