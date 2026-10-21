/* iCHEF RH Planning Premium SW v271 · cache statique uniquement. */
'use strict';
const CACHE='ichef-planning-premium-static-v271';
const SHELL=['/planning-rh/','/planning-rh/app.js?v=269','/planning-rh/manifest.webmanifest'];
self.addEventListener('install',e=>e.waitUntil((async()=>{
  const c=await caches.open(CACHE);
  await Promise.allSettled(SHELL.map(async url=>{
    const r=await fetch(url,{cache:'reload',credentials:'same-origin'});
    if(r.ok&&r.type!=='opaque')await c.put(url,r.clone());
  }));
  await self.skipWaiting();
})()));
self.addEventListener('activate',e=>e.waitUntil((async()=>{
 const keys=await caches.keys();
 await Promise.all(keys.filter(k=>k.startsWith('ichef-planning-premium-static-')&&k!==CACHE).map(k=>caches.delete(k)));
 await self.clients.claim();
})()));
self.addEventListener('fetch',e=>{
 const r=e.request;
 if(r.method!=='GET')return;
 const u=new URL(r.url);
 if(u.origin!==self.location.origin)return;
 // Strict isolation: no API responses, no PIN, no timesheets, no tokens cached.
 if(u.pathname.startsWith('/api/')||u.pathname.startsWith('/socket.io/')||
 u.pathname==='/get-current-state'||u.pathname==='/update-order')return;
 if(!u.pathname.startsWith('/planning-rh/'))return;
 if(r.mode==='navigate'){
  e.respondWith(fetch(r,{cache:'no-store'}).then(x=>x).catch(()=>caches.match('/planning-rh/')));
  return;
 }
 if(u.pathname==='/planning-rh/app.js'||u.pathname==='/planning-rh/manifest.webmanifest'){
  e.respondWith(fetch(r,{cache:'no-cache'}).then(async x=>{
    if(x.ok){const c=await caches.open(CACHE);await c.put(r,x.clone());}
    return x;
  }).catch(()=>caches.match(r)));
 }
});
