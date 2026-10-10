'use strict';
const VERSION = '210';
const CACHE = `ichef-staff-shell-v${VERSION}`;
const ORIGIN = self.location.origin;
const APP = '/portail-staff.html';
const MANIFEST = '/manifest-staff.json';
const ICONS = ['/ichef-staff.png','/ichef-staff-192.png','/ichef-staff-512.png'];
const SHELL = [APP,MANIFEST,...ICONS];
self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    await Promise.allSettled(SHELL.map(async path=>{
      try{
        const response=await fetch(new URL(path,ORIGIN),{cache:'reload',credentials:'same-origin'});
        if(response.ok)await cache.put(new URL(path,ORIGIN).href,response.clone());
      }catch(error){console.warn('[iCHEF PWA] précache indisponible:',path,error);}
    }));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(key=>key.startsWith('ichef-staff-shell-v')&&key!==CACHE).map(key=>caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('message',event=>{
  if(event.data?.type==='SKIP_WAITING')self.skipWaiting();
});
self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin!==ORIGIN)return;
  if(url.pathname.startsWith('/api/')||url.pathname.startsWith('/socket.io/'))return;
  const isPortalNavigation=request.mode==='navigate'&&url.pathname===APP;
  const isShell=SHELL.includes(url.pathname);
  if(!isPortalNavigation&&!isShell)return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    const key=new URL(url.pathname,ORIGIN).href;
    if(isPortalNavigation){
      try{
        const response=await fetch(request,{cache:'no-store'});
        if(response.ok)await cache.put(key,response.clone());
        return response;
      }catch(error){
        return (await cache.match(key))||new Response('iCHEF Collaborateur temporairement hors ligne.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});
      }
    }
    const cached=await cache.match(key);
    if(cached)return cached;
    try{
      const response=await fetch(request);
      if(response.ok)await cache.put(key,response.clone());
      return response;
    }catch(error){
      return new Response('Ressource iCHEF indisponible hors ligne.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});
    }
  })());
});
