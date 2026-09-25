/* =========================================================
   iCHEF RH SERVICE WORKER
   RH Direction + Pointeuse + Espace Collaborateur
   Build: 2026-09-25 V4 SECURE
   ========================================================= */

const CACHE = 'ichef-rh-shell-2026-09-25-v4-secure';

const SHELL = [
  '/rh.html',
  '/pointeuse.html',
  '/portail-staff.html',

  // Identité visuelle iCHEF
  '/logo-ichef.png',
  '/Gemini_Generated_Image_q748ueq748ueq748-Photoroom (1) (1) (1).png',
  '/ChatGPT Image 20 sept. 2026, 14_24_41.png'
];

const SOCKET_IO_CDN =
  'https://cdn.socket.io/4.7.2/socket.io.min.js';


/* =========================================================
   SÉCURITÉ — ROUTES TOUJOURS RÉSEAU
   ========================================================= */

function isSensitiveNetworkOnly(url) {
  if (url.origin !== self.location.origin) return false;

  const p = url.pathname;

  return (
    p.startsWith('/api/') ||
    p.startsWith('/api/rh/') ||
    p.startsWith('/api/staff/') ||
    p.startsWith('/socket.io/') ||

    p === '/get-current-state' ||
    p === '/update-order' ||

    p === '/api/rh/punch' ||
    p === '/api/rh/timesheet/correct' ||
    p === '/api/rh/timesheet/status' ||

    p === '/api/staff/clock-in' ||
    p === '/api/staff/clock-out' ||
    p === '/api/staff/requests'
  );
}


/* =========================================================
   PAGES OFFICIELLES DU SHELL RH
   ========================================================= */

function isShellPage(pathname) {
  return (
    pathname === '/rh.html' ||
    pathname === '/pointeuse.html' ||
    pathname === '/portail-staff.html'
  );
}

function canonicalShellRequest(pathname) {
  if (pathname === '/rh.html') {
    return new Request('/rh.html');
  }

  if (pathname === '/pointeuse.html') {
    return new Request('/pointeuse.html');
  }

  if (pathname === '/portail-staff.html') {
    return new Request('/portail-staff.html');
  }

  return null;
}


/* =========================================================
   FICHIERS STATIQUES AUTORISÉS AU CACHE
   ========================================================= */

function isSafeStaticAsset(url) {
  if (url.origin !== self.location.origin) return false;

  return /\.(?:css|js|png|jpg|jpeg|webp|svg|ico|woff2?)$/i
    .test(url.pathname);
}


/* =========================================================
   ÉCRITURE CACHE SÉCURISÉE
   ========================================================= */

async function safePut(cache, request, response) {
  if (!response) return;

  if (!(response.ok || response.type === 'opaque')) {
    return;
  }

  try {
    await cache.put(
      request,
      response.clone()
    );
  } catch (_) {}
}


/* =========================================================
   INSTALLATION
   ========================================================= */

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);

    for (const url of SHELL) {
      try {
        const response = await fetch(url, {
          cache: 'reload',
          credentials: 'same-origin'
        });

        if (response.ok) {
          await cache.put(
            url,
            response.clone()
          );
        }
      } catch (_) {
        // Un asset manquant ne doit pas empêcher
        // l'installation complète du Service Worker.
      }
    }

    // Socket.IO CDN : cache de secours uniquement.
    try {
      const request =
        new Request(
          SOCKET_IO_CDN,
          { mode: 'no-cors' }
        );

      const response =
        await fetch(request);

      await cache.put(
        request,
        response.clone()
      );
    } catch (_) {}

    await self.skipWaiting();
  })());
});


/* =========================================================
   ACTIVATION
   ========================================================= */

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys =
      await caches.keys();

    for (const key of keys) {
      if (
        key.startsWith('ichef-rh-shell-') &&
        key !== CACHE
      ) {
        await caches.delete(key);
      }
    }

    await self.clients.claim();
  })());
});


/* =========================================================
   FETCH
   ========================================================= */

self.addEventListener('fetch', event => {
  const request =
    event.request;

  /*
   * SÉCURITÉ :
   * Aucune écriture ne passe par le cache.
   * POST / PUT / PATCH / DELETE restent gérés
   * directement par le navigateur et le serveur.
   */
  if (
    request.method !== 'GET'
  ) {
    return;
  }

  const url =
    new URL(request.url);


  /* ---------------------------------------------------------
     API / RH / STAFF / SOCKET.IO = NETWORK ONLY
     --------------------------------------------------------- */

  if (
    isSensitiveNetworkOnly(url)
  ) {
    return;
  }


  /* ---------------------------------------------------------
     PAGES RH / POINTEUSE / STAFF = NETWORK FIRST
     --------------------------------------------------------- */

  if (
    request.mode === 'navigate' &&
    url.origin === self.location.origin
  ) {
    if (
      !isShellPage(url.pathname)
    ) {
      return;
    }

    event.respondWith((async () => {
      const cache =
        await caches.open(CACHE);

      const canonical =
        canonicalShellRequest(
          url.pathname
        );

      try {
        const response =
          await fetch(request, {
            cache: 'no-store',
            credentials: 'same-origin'
          });

        if (
          response.ok &&
          canonical
        ) {
          await safePut(
            cache,
            canonical,
            response
          );
        }

        return response;

      } catch (_) {

        if (canonical) {
          const fallback =
            await cache.match(
              canonical
            );

          if (fallback) {
            return fallback;
          }
        }

        return Response.error();
      }
    })());

    return;
  }


  /* ---------------------------------------------------------
     SOCKET.IO CDN = CACHE DE SECOURS
     --------------------------------------------------------- */

  if (
    request.url === SOCKET_IO_CDN
  ) {
    event.respondWith((async () => {
      const cache =
        await caches.open(CACHE);

      const cached =
        await cache.match(
          request
        );

      if (cached) {
        fetch(request)
          .then(response =>
            safePut(
              cache,
              request,
              response
            )
          )
          .catch(() => {});

        return cached;
      }

      try {
        const response =
          await fetch(request);

        await safePut(
          cache,
          request,
          response
        );

        return response;

      } catch (_) {
        return Response.error();
      }
    })());

    return;
  }


  /* ---------------------------------------------------------
     ASSETS STATIQUES = CACHE RAPIDE + MAJ ARRIÈRE-PLAN
     --------------------------------------------------------- */

  if (
    isSafeStaticAsset(url)
  ) {
    event.respondWith((async () => {
      const cache =
        await caches.open(CACHE);

      const cached =
        await cache.match(
          request
        );

      const network =
        fetch(request, {
          cache: 'no-cache',
          credentials: 'same-origin'
        })
        .then(async response => {
          await safePut(
            cache,
            request,
            response
          );

          return response;
        })
        .catch(() => null);

      if (cached) {
        event.waitUntil(network);
        return cached;
      }

      return (
        await network
      ) || Response.error();
    })());

    return;
  }


  /*
   * Toute autre requête GET non reconnue
   * reste sous contrôle normal du navigateur.
   * Elle n'est jamais ajoutée au cache RH.
   */
});
