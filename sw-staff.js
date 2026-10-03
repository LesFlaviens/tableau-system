'use strict';

const VERSION = '170';
const CACHE = `ichef-staff-shell-v${VERSION}`;
const BASE_ORIGIN = self.location.origin;

const APP_PATH = '/portail-staff.html';
const MANIFEST_PATH = '/manifest-staff.json';
const ICON_512_PATH = '/ichef-staff-512.png';

const APP_URL = new URL(APP_PATH, BASE_ORIGIN).href;
const MANIFEST_URL = new URL(MANIFEST_PATH, BASE_ORIGIN).href;
const ICON_512_URL = new URL(ICON_512_PATH, BASE_ORIGIN).href;

const SHELL = [APP_URL, MANIFEST_URL, ICON_512_URL];

function isSensitive(url) {
  return (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/socket.io/') ||
    url.pathname === '/get-current-state' ||
    url.pathname === '/update-order' ||
    url.pathname.includes('/messages') ||
    url.pathname.includes('/tasks') ||
    url.pathname.includes('/deliveries')
  );
}

function isStaffNavigation(request, url) {
  return request.mode === 'navigate' && url.pathname === APP_PATH;
}

function isStaffShellAsset(url) {
  return (
    url.pathname === APP_PATH ||
    url.pathname === MANIFEST_PATH ||
    url.pathname === ICON_512_PATH
  );
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);

    await Promise.allSettled(
      SHELL.map(async asset => {
        try {
          const response = await fetch(asset, { cache: 'reload' });
          if (response.ok) {
            await cache.put(asset, response.clone());
          }
        } catch (_) {}
      })
    );

    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();

    await Promise.all(
      keys
        .filter(key =>
          key.startsWith('ichef-staff-shell-v') &&
          key !== CACHE
        )
        .map(key => caches.delete(key))
    );

    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', event => {
  const request = event.request;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // V170 : aucun écran Admin / Chef / RH / HACCP n'est intercepté.
  if (
    url.origin !== BASE_ORIGIN ||
    isSensitive(url) ||
    (
      !isStaffNavigation(request, url) &&
      !isStaffShellAsset(url)
    )
  ) {
    return;
  }

  if (isStaffNavigation(request, url)) {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(request, { cache: 'no-store' });

        if (fresh.ok) {
          const cache = await caches.open(CACHE);
          cache.put(APP_URL, fresh.clone()).catch(() => {});
        }

        return fresh;
      } catch (_) {
        const cached = await caches.match(APP_URL);

        return cached || new Response(
          'iCHEF Staff est momentanément hors ligne.',
          {
            status: 503,
            headers: {
              'Content-Type': 'text/plain; charset=utf-8'
            }
          }
        );
      }
    })());

    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;

    try {
      const fresh = await fetch(request);

      if (fresh.ok) {
        const cache = await caches.open(CACHE);
        cache.put(request, fresh.clone()).catch(() => {});
      }

      return fresh;
    } catch (_) {
      return (await caches.match(request)) || new Response('', {
        status: 504
      });
    }
  })());
});
