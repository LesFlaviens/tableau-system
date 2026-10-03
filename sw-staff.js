'use strict';

const VERSION='172';
const CACHE=`ichef-staff-shell-v${VERSION}`;
const ORIGIN=self.location.origin;

const APP='/portail-staff.html';
const MANIFEST='/manifest-staff.json';
const ICON='/ichef-staff-512.png';

const SHELL=[
  new URL(APP,ORIGIN).href,
  new URL(MANIFEST,ORIGIN).href,
  new URL(ICON,ORIGIN).href
];

function sensitive(url){
  return (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/socket.io/') ||
    url.pathname==='/get-current-state' ||
    url.pathname==='/update-order'
  );
}

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);

    await Promise.allSettled(
      SHELL.map(async asset=>{
        try{
          const response=
            await fetch(asset,{cache:'reload'});

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
            key.startsWith('ichef-staff-shell-v') &&
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

  if(
    url.origin!==ORIGIN ||
    sensitive(url)
  ){
    return;
  }

  const isPortalNav=
    request.mode==='navigate' &&
    url.pathname===APP;

  const isShell=
    [APP,MANIFEST,ICON]
      .includes(url.pathname);

  if(!isPortalNav && !isShell){
    return;
  }

  if(isPortalNav){
    event.respondWith((async()=>{
      try{
        const fresh=
          await fetch(
            request,
            {cache:'no-store'}
          );

        if(fresh.ok){
          const cache=
            await caches.open(CACHE);

          cache.put(
            SHELL[0],
            fresh.clone()
          ).catch(()=>{});
        }

        return fresh;

      }catch(_){
        return (
          await caches.match(SHELL[0])
        ) || new Response(
          'iCHEF Staff momentanément hors ligne.',
          {status:503}
        );
      }
    })());

    return;
  }

  event.respondWith((async()=>{
    const cached=
      await caches.match(request);

    if(cached)return cached;

    return fetch(request);
  })());
});
