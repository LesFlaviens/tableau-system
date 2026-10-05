'use strict';

/* =========================================================
   iCHEF RH SERVICE WORKER
   Build V243 — RH CAPACITY PLANNING SYNC
   RH et Pointeuse uniquement.
   Le Portail Staff possède son propre sw-staff.js.
   ========================================================= */

const VERSION='243';
const CACHE=`ichef-rh-shell-v${VERSION}`;

const RH_SHELL=[
  '/rh.html',
  '/rh.css?v=240',
  '/rh-core.js?v=243',
  '/rh-payroll.js?v=240',
  '/pointeuse.html'
];

const RH_STATIC_PATHS=new Set([
  '/rh.css',
  '/rh-core.js',
  '/rh-payroll.js',
  '/logo-ichef.png',
  '/Gemini_Generated_Image_q748ueq748ueq748-Photoroom (1) (1) (1).png',
  '/ChatGPT Image 20 sept. 2026, 14_24_41.png'
]);

function isSensitiveNetworkOnly(url){
  if(url.origin!==self.location.origin)return false;

  const p=url.pathname;

  return (
    p.startsWith('/api/') ||
    p.startsWith('/socket.io/') ||
    p==='/get-current-state' ||
    p==='/update-order'
  );
}

function isRhNavigation(request,url){
  return (
    request.mode==='navigate' &&
    (
      url.pathname==='/rh.html' ||
      url.pathname==='/pointeuse.html'
    )
  );
}

function isRhStatic(url){
  return (
    url.origin===self.location.origin &&
    RH_STATIC_PATHS.has(url.pathname)
  );
}

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);

    await Promise.allSettled(
      RH_SHELL.map(async asset=>{
        try{
          const response=
            await fetch(
              asset,
              {
                cache:'reload',
                credentials:'same-origin'
              }
            );

          if(response.ok){
            await cache.put(
              asset,
              response.clone()
            );
          }
        }catch(_){}
      })
    );

    await self.skipWaiting();
  })());
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();

    await Promise.all(
      keys
        .filter(
          key=>
            key.startsWith('ichef-rh-shell-') &&
            key!==CACHE
        )
        .map(key=>caches.delete(key))
    );

    await self.clients.claim();
  })());
});

self.addEventListener('message',event=>{
  if(event.data?.type==='SKIP_WAITING'){
    self.skipWaiting();
  }
});

self.addEventListener('fetch',event=>{
  const request=event.request;

  if(request.method!=='GET')return;

  const url=new URL(request.url);

  // Données RH, authentification, email, WhatsApp, PIN et pointage :
  // toujours réseau, jamais cache.
  if(isSensitiveNetworkOnly(url)){
    return;
  }

  // Très important : ce SW RH ne touche pas portail-staff.html,
  // admin.html, chef.html, HACCP, etc.
  if(
    !isRhNavigation(request,url) &&
    !isRhStatic(url)
  ){
    return;
  }

  if(isRhNavigation(request,url)){
    event.respondWith((async()=>{
      try{
        const fresh=
          await fetch(
            request,
            {
              cache:'no-store',
              credentials:'same-origin'
            }
          );

        if(fresh.ok){
          const cache=
            await caches.open(CACHE);

          cache.put(
            new Request(url.pathname),
            fresh.clone()
          ).catch(()=>{});
        }

        return fresh;

      }catch(_){
        const cached=
          await caches.match(
            new Request(url.pathname)
          );

        return (
          cached ||
          new Response(
            'iCHEF RH momentanément hors ligne.',
            {
              status:503,
              headers:{
                'Content-Type':
                  'text/plain; charset=utf-8'
              }
            }
          )
        );
      }
    })());

    return;
  }

  event.respondWith((async()=>{
    try{
      const fresh=
        await fetch(
          request,
          {
            cache:'no-cache',
            credentials:'same-origin'
          }
        );

      if(fresh.ok){
        const cache=
          await caches.open(CACHE);

        cache.put(
          request,
          fresh.clone()
        ).catch(()=>{});
      }

      return fresh;

    }catch(_){
      return (
        await caches.match(request)
      ) || new Response('',{status:504});
    }
  })());
});
