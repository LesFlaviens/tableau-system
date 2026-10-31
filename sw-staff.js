'use strict';
/*
 * iCHEF Staff V232 — Correctif PWA et icones.
 * Périmètre strict : /portail-staff.html + manifest / icones Staff.
 * Aucun accès aux API, sessions, PIN, invitations, Socket.IO ou autres modules.
 */
const VERSION = '232';
const CACHE = `ichef-staff-shell-v${VERSION}`;
const ORIGIN = self.location.origin;
const APP = '/portail-staff.html';
const MANIFEST = '/manifest-staff.json';
const ICONS = [
  '/ichef-staff.png',
  '/ichef-staff-192.png',
  '/ichef-staff-512.png',
  '/ichef-staff-maskable-512.png'
];
const ASSETS = [MANIFEST, ...ICONS];

// Pas de copie HTML persistante : les écrans de connexion / activation
// doivent provenir de la version courante du serveur et jamais d'un vieux cache.
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.allSettled(ASSETS.map(async path => {
      try {
        const url = new URL(path, ORIGIN);
        const response = await fetch(url.href, {
          cache: 'reload',
          credentials: 'same-origin'
        });
        if (response.ok) await cache.put(url.href, response.clone());
      } catch (error) {
        console.warn('[iCHEF Staff PWA] Précache indisponible :', path);
      }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter(key => key.startsWith('ichef-staff-shell-v') && key !== CACHE)
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== ORIGIN) return;
  // Ne JAMAIS intercepter les endpoints d'authentification ou les autres apps.
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/socket.io/')) return;

  if (request.mode === 'navigate' && url.pathname === APP) {
    event.respondWith((async () => {
      try {
        // Conserve les paramètres et fragments coté navigateur ; aucune
        // navigation d'activation ne doit être remplacée par une ancienne page.
        return await fetch(request, { cache: 'no-store' });
      } catch (_) {
        return new Response(
          '<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>iCHEF Staff</title><body style="font:16px sans-serif;background:#090d10;color:white;padding:35px"><h1>iCHEF Staff</h1><p>Connexion au serveur nécessaire. Vérifiez votre réseau puis réessayez.</p></body></html>',
          { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } }
        );
      }
    })());
    return;
  }

  if (!ASSETS.includes(url.pathname)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const key = new URL(url.pathname, ORIGIN).href;
    try {
      // Toujours consulter le réseau en premier, même pour ?v=226.
      // Évite de conserver indéfiniment les anciens logos et le manifest.
      const response = await fetch(request, { cache: 'no-store' });
      if (response.ok) await cache.put(key, response.clone());
      return response;
    } catch (_) {
      return (await cache.match(key)) || new Response(
        'Ressource iCHEF Staff indisponible hors ligne.',
        { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } }
      );
    }
  })());
});
