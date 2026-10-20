'use strict';
/* iCHEF RH V266 — cache strictement limité aux ressources statiques du RH.
   Les API et les sessions ne sont jamais mises en cache. */
const VERSION='266';
const CACHE='ichef-rh-shell-v'+VERSION;
const ASSETS=['/rh.css?v=266','/rh-core.js?v=266','/rh-modules.js?v=266'];
const PATHS=new Set(['/rh.html','/rh.css','/rh-core.js','/rh-modules.js','/pointeuse.html']);
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const cache=await caches.open(CACHE);
 await Promise.allSettled(ASSETS.map(async u=>{try{const r=await fetch(u,{cache:'reload',credentials:'same-origin'});if(r.ok)await cache.put(u,r.clone());}catch(_){}}));
 await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith('ichef-rh-shell-v')&&k!==CACHE).map(k=>caches.delete(k)));
 await self.clients.claim();
})()));
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('fetch',event=>{
 const req=event.request;if(req.method!=='GET')return;
 const url=new URL(req.url);if(url.origin!==self.location.origin||!PATHS.has(url.pathname))return;
 // Ne JAMAIS intercepter les API, les pages des autres modules ou les requêtes sensibles.
 if(url.pathname==='/rh.html'||url.pathname==='/pointeuse.html')return; // réseau direct, fail-closed
 event.respondWith((async()=>{
  try{const res=await fetch(req,{cache:'no-cache'});if(res.ok){const c=await caches.open(CACHE);c.put(req,res.clone()).catch(()=>{});}return res;}
  catch(_){return (await caches.match(req))||new Response('Ressource RH indisponible hors connexion.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});}
 })());
});
'use strict';
/* iCHEF RH V266 — cache strictement limité aux ressources statiques du RH.
   Les API et les sessions ne sont jamais mises en cache. */
const VERSION='266';
const CACHE='ichef-rh-shell-v'+VERSION;
const ASSETS=['/rh.css?v=266','/rh-core.js?v=266','/rh-modules.js?v=266'];
const PATHS=new Set(['/rh.html','/rh.css','/rh-core.js','/rh-modules.js','/pointeuse.html']);
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const cache=await caches.open(CACHE);
 await Promise.allSettled(ASSETS.map(async u=>{try{const r=await fetch(u,{cache:'reload',credentials:'same-origin'});if(r.ok)await cache.put(u,r.clone());}catch(_){}}));
 await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith('ichef-rh-shell-v')&&k!==CACHE).map(k=>caches.delete(k)));
 await self.clients.claim();
})()));
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('fetch',event=>{
 const req=event.request;if(req.method!=='GET')return;
 const url=new URL(req.url);if(url.origin!==self.location.origin||!PATHS.has(url.pathname))return;
 // Ne JAMAIS intercepter les API, les pages des autres modules ou les requêtes sensibles.
 if(url.pathname==='/rh.html'||url.pathname==='/pointeuse.html')return; // réseau direct, fail-closed
 event.respondWith((async()=>{
  try{const res=await fetch(req,{cache:'no-cache'});if(res.ok){const c=await caches.open(CACHE);c.put(req,res.clone()).catch(()=>{});}return res;}
  catch(_){return (await caches.match(req))||new Response('Ressource RH indisponible hors connexion.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});}
 })());
});
'use strict';
/* iCHEF RH V266 — cache strictement limité aux ressources statiques du RH.
   Les API et les sessions ne sont jamais mises en cache. */
const VERSION='266';
const CACHE='ichef-rh-shell-v'+VERSION;
const ASSETS=['/rh.css?v=266','/rh-core.js?v=266','/rh-modules.js?v=266'];
const PATHS=new Set(['/rh.html','/rh.css','/rh-core.js','/rh-modules.js','/pointeuse.html']);
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const cache=await caches.open(CACHE);
 await Promise.allSettled(ASSETS.map(async u=>{try{const r=await fetch(u,{cache:'reload',credentials:'same-origin'});if(r.ok)await cache.put(u,r.clone());}catch(_){}}));
 await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith('ichef-rh-shell-v')&&k!==CACHE).map(k=>caches.delete(k)));
 await self.clients.claim();
})()));
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('fetch',event=>{
 const req=event.request;if(req.method!=='GET')return;
 const url=new URL(req.url);if(url.origin!==self.location.origin||!PATHS.has(url.pathname))return;
 // Ne JAMAIS intercepter les API, les pages des autres modules ou les requêtes sensibles.
 if(url.pathname==='/rh.html'||url.pathname==='/pointeuse.html')return; // réseau direct, fail-closed
 event.respondWith((async()=>{
  try{const res=await fetch(req,{cache:'no-cache'});if(res.ok){const c=await caches.open(CACHE);c.put(req,res.clone()).catch(()=>{});}return res;}
  catch(_){return (await caches.match(req))||new Response('Ressource RH indisponible hors connexion.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});}
 })());
});
'use strict';
/* iCHEF RH V266 — cache strictement limité aux ressources statiques du RH.
   Les API et les sessions ne sont jamais mises en cache. */
const VERSION='266';
const CACHE='ichef-rh-shell-v'+VERSION;
const ASSETS=['/rh.css?v=266','/rh-core.js?v=266','/rh-modules.js?v=266'];
const PATHS=new Set(['/rh.html','/rh.css','/rh-core.js','/rh-modules.js','/pointeuse.html']);
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const cache=await caches.open(CACHE);
 await Promise.allSettled(ASSETS.map(async u=>{try{const r=await fetch(u,{cache:'reload',credentials:'same-origin'});if(r.ok)await cache.put(u,r.clone());}catch(_){}}));
 await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith('ichef-rh-shell-v')&&k!==CACHE).map(k=>caches.delete(k)));
 await self.clients.claim();
})()));
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('fetch',event=>{
 const req=event.request;if(req.method!=='GET')return;
 const url=new URL(req.url);if(url.origin!==self.location.origin||!PATHS.has(url.pathname))return;
 // Ne JAMAIS intercepter les API, les pages des autres modules ou les requêtes sensibles.
 if(url.pathname==='/rh.html'||url.pathname==='/pointeuse.html')return; // réseau direct, fail-closed
 event.respondWith((async()=>{
  try{const res=await fetch(req,{cache:'no-cache'});if(res.ok){const c=await caches.open(CACHE);c.put(req,res.clone()).catch(()=>{});}return res;}
  catch(_){return (await caches.match(req))||new Response('Ressource RH indisponible hors connexion.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});}
 })());
});
'use strict';
/* iCHEF RH V266 — cache strictement limité aux ressources statiques du RH.
   Les API et les sessions ne sont jamais mises en cache. */
const VERSION='266';
const CACHE='ichef-rh-shell-v'+VERSION;
const ASSETS=['/rh.css?v=266','/rh-core.js?v=266','/rh-modules.js?v=266'];
const PATHS=new Set(['/rh.html','/rh.css','/rh-core.js','/rh-modules.js','/pointeuse.html']);
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const cache=await caches.open(CACHE);
 await Promise.allSettled(ASSETS.map(async u=>{try{const r=await fetch(u,{cache:'reload',credentials:'same-origin'});if(r.ok)await cache.put(u,r.clone());}catch(_){}}));
 await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith('ichef-rh-shell-v')&&k!==CACHE).map(k=>caches.delete(k)));
 await self.clients.claim();
})()));
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('fetch',event=>{
 const req=event.request;if(req.method!=='GET')return;
 const url=new URL(req.url);if(url.origin!==self.location.origin||!PATHS.has(url.pathname))return;
 // Ne JAMAIS intercepter les API, les pages des autres modules ou les requêtes sensibles.
 if(url.pathname==='/rh.html'||url.pathname==='/pointeuse.html')return; // réseau direct, fail-closed
 event.respondWith((async()=>{
  try{const res=await fetch(req,{cache:'no-cache'});if(res.ok){const c=await caches.open(CACHE);c.put(req,res.clone()).catch(()=>{});}return res;}
  catch(_){return (await caches.match(req))||new Response('Ressource RH indisponible hors connexion.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});}
 })());
});
'use strict';
/* iCHEF RH V266 — cache strictement limité aux ressources statiques du RH.
   Les API et les sessions ne sont jamais mises en cache. */
const VERSION='266';
const CACHE='ichef-rh-shell-v'+VERSION;
const ASSETS=['/rh.css?v=266','/rh-core.js?v=266','/rh-modules.js?v=266'];
const PATHS=new Set(['/rh.html','/rh.css','/rh-core.js','/rh-modules.js','/pointeuse.html']);
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const cache=await caches.open(CACHE);
 await Promise.allSettled(ASSETS.map(async u=>{try{const r=await fetch(u,{cache:'reload',credentials:'same-origin'});if(r.ok)await cache.put(u,r.clone());}catch(_){}}));
 await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith('ichef-rh-shell-v')&&k!==CACHE).map(k=>caches.delete(k)));
 await self.clients.claim();
})()));
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('fetch',event=>{
 const req=event.request;if(req.method!=='GET')return;
 const url=new URL(req.url);if(url.origin!==self.location.origin||!PATHS.has(url.pathname))return;
 // Ne JAMAIS intercepter les API, les pages des autres modules ou les requêtes sensibles.
 if(url.pathname==='/rh.html'||url.pathname==='/pointeuse.html')return; // réseau direct, fail-closed
 event.respondWith((async()=>{
  try{const res=await fetch(req,{cache:'no-cache'});if(res.ok){const c=await caches.open(CACHE);c.put(req,res.clone()).catch(()=>{});}return res;}
  catch(_){return (await caches.match(req))||new Response('Ressource RH indisponible hors connexion.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});}
 })());
});
'use strict';
/* iCHEF RH V266 — cache strictement limité aux ressources statiques du RH.
   Les API et les sessions ne sont jamais mises en cache. */
const VERSION='266';
const CACHE='ichef-rh-shell-v'+VERSION;
const ASSETS=['/rh.css?v=266','/rh-core.js?v=266','/rh-modules.js?v=266'];
const PATHS=new Set(['/rh.html','/rh.css','/rh-core.js','/rh-modules.js','/pointeuse.html']);
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const cache=await caches.open(CACHE);
 await Promise.allSettled(ASSETS.map(async u=>{try{const r=await fetch(u,{cache:'reload',credentials:'same-origin'});if(r.ok)await cache.put(u,r.clone());}catch(_){}}));
 await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith('ichef-rh-shell-v')&&k!==CACHE).map(k=>caches.delete(k)));
 await self.clients.claim();
})()));
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('fetch',event=>{
 const req=event.request;if(req.method!=='GET')return;
 const url=new URL(req.url);if(url.origin!==self.location.origin||!PATHS.has(url.pathname))return;
 // Ne JAMAIS intercepter les API, les pages des autres modules ou les requêtes sensibles.
 if(url.pathname==='/rh.html'||url.pathname==='/pointeuse.html')return; // réseau direct, fail-closed
 event.respondWith((async()=>{
  try{const res=await fetch(req,{cache:'no-cache'});if(res.ok){const c=await caches.open(CACHE);c.put(req,res.clone()).catch(()=>{});}return res;}
  catch(_){return (await caches.match(req))||new Response('Ressource RH indisponible hors connexion.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});}
 })());
});
'use strict';
/* iCHEF RH V266 — cache strictement limité aux ressources statiques du RH.
   Les API et les sessions ne sont jamais mises en cache. */
const VERSION='266';
const CACHE='ichef-rh-shell-v'+VERSION;
const ASSETS=['/rh.css?v=266','/rh-core.js?v=266','/rh-modules.js?v=266'];
const PATHS=new Set(['/rh.html','/rh.css','/rh-core.js','/rh-modules.js','/pointeuse.html']);
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const cache=await caches.open(CACHE);
 await Promise.allSettled(ASSETS.map(async u=>{try{const r=await fetch(u,{cache:'reload',credentials:'same-origin'});if(r.ok)await cache.put(u,r.clone());}catch(_){}}));
 await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith('ichef-rh-shell-v')&&k!==CACHE).map(k=>caches.delete(k)));
 await self.clients.claim();
})()));
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('fetch',event=>{
 const req=event.request;if(req.method!=='GET')return;
 const url=new URL(req.url);if(url.origin!==self.location.origin||!PATHS.has(url.pathname))return;
 // Ne JAMAIS intercepter les API, les pages des autres modules ou les requêtes sensibles.
 if(url.pathname==='/rh.html'||url.pathname==='/pointeuse.html')return; // réseau direct, fail-closed
 event.respondWith((async()=>{
  try{const res=await fetch(req,{cache:'no-cache'});if(res.ok){const c=await caches.open(CACHE);c.put(req,res.clone()).catch(()=>{});}return res;}
  catch(_){return (await caches.match(req))||new Response('Ressource RH indisponible hors connexion.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});}
 })());
});
'use strict';
/* iCHEF RH V266 — cache strictement limité aux ressources statiques du RH.
   Les API et les sessions ne sont jamais mises en cache. */
const VERSION='266';
const CACHE='ichef-rh-shell-v'+VERSION;
const ASSETS=['/rh.css?v=266','/rh-core.js?v=266','/rh-modules.js?v=266'];
const PATHS=new Set(['/rh.html','/rh.css','/rh-core.js','/rh-modules.js','/pointeuse.html']);
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const cache=await caches.open(CACHE);
 await Promise.allSettled(ASSETS.map(async u=>{try{const r=await fetch(u,{cache:'reload',credentials:'same-origin'});if(r.ok)await cache.put(u,r.clone());}catch(_){}}));
 await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith('ichef-rh-shell-v')&&k!==CACHE).map(k=>caches.delete(k)));
 await self.clients.claim();
})()));
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('fetch',event=>{
 const req=event.request;if(req.method!=='GET')return;
 const url=new URL(req.url);if(url.origin!==self.location.origin||!PATHS.has(url.pathname))return;
 // Ne JAMAIS intercepter les API, les pages des autres modules ou les requêtes sensibles.
 if(url.pathname==='/rh.html'||url.pathname==='/pointeuse.html')return; // réseau direct, fail-closed
 event.respondWith((async()=>{
  try{const res=await fetch(req,{cache:'no-cache'});if(res.ok){const c=await caches.open(CACHE);c.put(req,res.clone()).catch(()=>{});}return res;}
  catch(_){return (await caches.match(req))||new Response('Ressource RH indisponible hors connexion.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});}
 })());
});
