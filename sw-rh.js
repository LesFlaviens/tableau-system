/* iCHEF RH Offline Shell — 2026-09-17 */
const CACHE='ichef-rh-shell-2026-09-17-v1';
const SHELL=['/rh.html'];
self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    for(const url of SHELL){try{const r=await fetch(url,{cache:'reload'});if(r.ok)await cache.put(url,r.clone())}catch(_){}}
    try{const req=new Request('https://cdn.socket.io/4.7.2/socket.io.min.js',{mode:'no-cors'});const r=await fetch(req);await cache.put(req,r.clone())}catch(_){}
    await self.skipWaiting();
  })());
});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{for(const key of await caches.keys()){if(key.startsWith('ichef-rh-shell-')&&key!==CACHE)await caches.delete(key)}await self.clients.claim()})());
});
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET') return;
  const url=new URL(req.url);
  if(url.origin===self.location.origin&&(url.pathname.startsWith('/api/')||url.pathname.startsWith('/socket.io/')||url.pathname==='/get-current-state'||url.pathname==='/update-order')) return;
  if(req.mode==='navigate'){
    event.respondWith((async()=>{try{const r=await fetch(req);const cache=await caches.open(CACHE);if(url.pathname.endsWith('/rh.html')||url.pathname==='/rh.html')await cache.put('/rh.html',r.clone());return r}catch(_){return (await caches.match('/rh.html'))||Response.error()}})());
    return;
  }
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    const cached=await cache.match(req);
    const network=fetch(req).then(async r=>{if(r&&(r.ok||r.type==='opaque')){try{await cache.put(req,r.clone())}catch(_){}}return r}).catch(()=>null);
    return cached||await network||Response.error();
  })());
});
