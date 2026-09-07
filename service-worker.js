const CACHE_NAME = 'ichef-cache-v23';
const DYNAMIC_CACHE = 'ichef-dynamic-v23';

// ==========================================================
// 📦 ASSETS iCHEF — PWA
// connexionpartenaire.html n'est volontairement PAS précaché.
// Le login doit toujours être récupéré depuis le réseau.
// ==========================================================
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
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
  '/mockup-ichef.png',
  '/Gemini_Generated_Image_q748ueq748ueq748-Photoroom (1) (1) (1).png'
];

// ==========================================================
// INSTALL
// ==========================================================
self.addEventListener('install', (event) => {
  self.skipWaiting();

  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      for (const url of ASSETS_TO_CACHE) {
        try {
          const response = await fetch(
            new Request(url, { cache: 'reload' })
          );

          if (response && response.ok) {
            await cache.put(url, response.clone());
          } else {
            console.warn(
              `[iCHEF SW V23] Ressource ignorée : ${url}`
            );
          }

        } catch (error) {
          console.warn(
            `[iCHEF SW V23] Ressource non précachée : ${url}`
          );
        }
      }
    })()
  );
});

// ==========================================================
// ACTIVATE
// ==========================================================
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();

      await Promise.all(
        cacheNames
          .filter(
            name =>
              (
                name.startsWith('ichef-cache-') ||
                name.startsWith('ichef-dynamic-')
              ) &&
              name !== CACHE_NAME &&
              name !== DYNAMIC_CACHE
          )
          .map(name => {
            console.log(
              `🧹 Nettoyage ancien cache : ${name}`
            );
            return caches.delete(name);
          })
      );

      await self.clients.claim();
    })()
  );
});

// ==========================================================
// FETCH
// ==========================================================
self.addEventListener('fetch', (event) => {
  const request = event.request;

  if (!request) {
    return;
  }

  // 1. Flux vidéo / audio / fichiers partiels :
  // le navigateur les gère directement.
  if (request.headers.get('range')) {
    return;
  }

  let url;

  try {
    url = new URL(request.url);
  } catch (_) {
    return;
  }

  // 2. IMPORTANT :
  // aucune interception des domaines externes.
  // tableau-system.onrender.com passe directement au navigateur.
  if (url.origin !== self.location.origin) {
    return;
  }

  const pathname = String(url.pathname || '');

  // 3. API / écritures iCHEF :
  // réseau uniquement, avec une vraie Response 503 si coupure.
  const isAPI =
    request.method !== 'GET' ||
    pathname.startsWith('/api/') ||
    pathname.includes('/get-current-state') ||
    pathname.includes('/update-order');

  if (isAPI) {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);

          if (response instanceof Response) {
            return response;
          }

        } catch (_) {}

        return new Response(
          JSON.stringify({
            success: false,
            error: 'NETWORK_UNAVAILABLE',
            offline: true
          }),
          {
            status: 503,
            headers: {
              'Content-Type':
                'application/json; charset=utf-8'
            }
          }
        );
      })()
    );

    return;
  }

  // 4. LOGIN :
  // jamais depuis le cache.
  if (
    pathname === '/connexionpartenaire.html' ||
    pathname.endsWith('/connexionpartenaire.html')
  ) {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(
            request,
            { cache: 'reload' }
          );

          if (response instanceof Response) {
            return response;
          }

        } catch (_) {}

        return new Response(
          '<!doctype html>' +
          '<html lang="fr">' +
          '<meta charset="utf-8">' +
          '<meta name="viewport" content="width=device-width,initial-scale=1">' +
          '<body style="margin:0;background:#050505;color:#fff;font-family:Arial;padding:40px">' +
          '<h2>Connexion Internet requise</h2>' +
          '<p>iCHEF doit joindre le serveur pour vérifier votre identifiant et votre PIN.</p>' +
          '<button onclick="location.reload()" style="padding:12px 18px">Réessayer</button>' +
          '</body></html>',
          {
            status: 503,
            headers: {
              'Content-Type':
                'text/html; charset=utf-8'
            }
          }
        );
      })()
    );

    return;
  }

  // 5. Pages HTML :
  // NETWORK FIRST, puis cache en secours.
  const acceptsHTML =
    request.mode === 'navigate' ||
    (
      request.headers.get('accept') ||
      ''
    ).includes('text/html');

  if (acceptsHTML) {
    event.respondWith(
      (async () => {
        try {
          const networkResponse = await fetch(
            request,
            { cache: 'no-cache' }
          );

          if (
            networkResponse instanceof Response
          ) {
            if (networkResponse.ok) {
              try {
                const cache =
                  await caches.open(
                    DYNAMIC_CACHE
                  );

                await cache.put(
                  request,
                  networkResponse.clone()
                );
              } catch (_) {}
            }

            return networkResponse;
          }

        } catch (_) {}

        const cached =
          await caches.match(request);

        if (cached instanceof Response) {
          return cached;
        }

        return new Response(
          '<!doctype html>' +
          '<html lang="fr">' +
          '<meta charset="utf-8">' +
          '<meta name="viewport" content="width=device-width,initial-scale=1">' +
          '<body style="margin:0;background:#050505;color:#fff;font-family:Arial;padding:40px">' +
          '<h2>iCHEF hors ligne</h2>' +
          '<p>Cette page n’est pas encore disponible dans le cache local.</p>' +
          '<button onclick="history.back()" style="padding:12px 18px">Retour</button>' +
          '</body></html>',
          {
            status: 503,
            headers: {
              'Content-Type':
                'text/html; charset=utf-8'
            }
          }
        );
      })()
    );

    return;
  }

  // 6. Autres fichiers statiques :
  // réseau d'abord, cache dynamique en secours.
  event.respondWith(
    (async () => {
      try {
        const networkResponse =
          await fetch(
            request,
            { cache: 'no-cache' }
          );

        if (
          networkResponse instanceof Response
        ) {
          if (
            networkResponse.ok &&
            networkResponse.type === 'basic'
          ) {
            try {
              const cache =
                await caches.open(
                  DYNAMIC_CACHE
                );

              await cache.put(
                request,
                networkResponse.clone()
              );
            } catch (_) {}
          }

          return networkResponse;
        }

      } catch (_) {}

      const cached =
        await caches.match(request);

      if (cached instanceof Response) {
        return cached;
      }

      // IMPORTANT :
      // respondWith() reçoit toujours une vraie Response.
      return new Response(
        '',
        {
          status: 504,
          statusText:
            'Resource unavailable'
        }
      );
    })()
  );
});
