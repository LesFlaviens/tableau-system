/* iCHEF RH + Pointeuse Offline Shell — 2026-09-25 */
const CACHE = 'ichef-rh-shell-2026-09-25-v2';

const SHELL = [
  '/rh.html',
  '/pointeuse.html',
  '/logo-ichef.png',
  '/ChatGPT Image 20 sept. 2026, 14_24_41.png'
];

const SOCKET_IO_CDN = 'https://cdn.socket.io/4.7.2/socket.io.min.js';

function isSensitiveNetworkOnly(url) {
  if (url.origin !== self.location.origin) return false;

  return (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/socket.io/') ||
    url.pathname === '/get-current-state' ||
    url.pathname === '/update-order'
  );
}

function isShellPage(pathname) {
  return pathname === '/rh.html' || pathname === '/pointeuse.html';
}

function canonicalShellRequest(pathname) {
  if (pathname === '/rh.html') return new Request('/rh.html');
  if (pathname === '/pointeuse.html') return new Request('/pointeuse.html');
  return null;
}

async function safePut(cache, request, response) {
  if (!response) return;
  if (!(response.ok || response.type === 'opaque')) return;

  try {
    await cache.put(request, response.clone());
  } catch (_) {}
}

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
          await cache.put(url, response.clone());
        }
      } catch (_) {}
    }

    try {
      const req = new Request(SOCKET_IO_CDN, { mode: 'no-cors' });
      const response = await fetch(req);
      await cache.put(req, response.clone());
    } catch (_) {}

    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();

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

self.addEventListener('fetch', event => {
  const req = event.request;

  if (req.method !== 'GET') {
    // POST / PUT / DELETE ne sont jamais interceptés.
    // Les PIN, photos et pointages restent toujours envoyés au serveur.
    return;
  }

  const url = new URL(req.url);

  // Sécurité : aucune API RH, aucun état serveur et aucun Socket.IO ne doit
  // être servi depuis le cache.
  if (isSensitiveNetworkOnly(url)) {
    return;
  }

  // Pages RH et Pointeuse : NETWORK FIRST.
  // Cela évite d'afficher une ancienne version après une mise à jour.
  if (req.mode === 'navigate' && url.origin === self.location.origin) {
    if (!isShellPage(url.pathname)) {
      return;
    }

    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const canonical = canonicalShellRequest(url.pathname);

      try {
        const response = await fetch(req, {
          cache: 'no-store',
          credentials: 'same-origin'
        });

        if (response.ok && canonical) {
          await safePut(cache, canonical, response);
        }

        return response;
      } catch (_) {
        if (canonical) {
          const fallback = await cache.match(canonical);
          if (fallback) return fallback;
        }

        return Response.error();
      }
    })());

    return;
  }

  // Socket.IO CDN : cache de secours uniquement.
  if (req.url === SOCKET_IO_CDN) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(req);

      if (cached) {
        fetch(req)
          .then(response => safePut(cache, req, response))
          .catch(() => {});
        return cached;
      }

      try {
        const response = await fetch(req);
        await safePut(cache, req, response);
        return response;
      } catch (_) {
        return Response.error();
      }
    })());

    return;
  }

  // Assets statiques du même domaine :
  // cache rapide + actualisation en arrière-plan.
  if (url.origin === self.location.origin) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(req);

      const network = fetch(req, {
        cache: 'no-cache',
        credentials: 'same-origin'
      })
        .then(async response => {
          await safePut(cache, req, response);
          return response;
        })
        .catch(() => null);

      if (cached) {
        event.waitUntil(network);
        return cached;
      }

      return (await network) || Response.error();
    })());

    return;
  }

  // Autres domaines : comportement navigateur normal.
});
