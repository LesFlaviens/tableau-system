'use strict';

const VERSION = '164';
const CACHE = `ichef-staff-shell-v${VERSION}`;
const BASE = self.registration.scope;

const APP_URL = new URL('portail-staff.html', BASE).href;
const MANIFEST_URL = new URL('manifest-staff.json', BASE).href;
const ICON_512_URL = new URL('ichef-staff-512.png', BASE).href;

const SHELL = [APP_URL, MANIFEST_URL, ICON_512_URL];

function isSensitive(url) {
  return (
    url.pathname.includes('/api/') ||
    url.pathname.includes('/socket.io/') ||
    url.pathname.includes('/messages') ||
    url.pathname.includes('/tasks') ||
    url.pathname.includes('/deliveries')
  );
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.allSettled(
      SHELL.map(async asset => {
        const response = await fetch(asset, { cache: 'reload' });
        if (response.ok) await cache.put(asset, response.clone());
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
        .filter(key => key.startsWith('ichef-staff-shell-v') && key !== CACHE)
        .map(key => caches.delete(key))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || isSensitive(url)) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(request, { cache: 'no-store' });
        if (fresh.ok) {
          const cache = await caches.open(CACHE);
          cache.put(APP_URL, fresh.clone()).catch(() => {});
        }
        return fresh;
      } catch (_) {
        return (await caches.match(APP_URL)) || Response.error();
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;

    const fresh = await fetch(request);
    if (
      fresh.ok &&
      ['script','style','image','font','manifest'].includes(request.destination)
    ) {
      const cache = await caches.open(CACHE);
      cache.put(request, fresh.clone()).catch(() => {});
    }
    return fresh;
  })());
});
