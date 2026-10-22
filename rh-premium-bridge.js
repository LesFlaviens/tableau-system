/* iCHEF OS V273 — Navigation RH ↔ Planning Premium sans double PIN.
   L'authentification initiale RH est déjà validée auprès du serveur.
   Le serveur fournit un jeton Premium lié au tenant + appareil + droits.
   Aucun PIN ni jeton transmis par URL/postMessage ; sessionStorage par onglet.
   Le planning est maintenu dans une iframe même origine pour des retours instantanés. */
(()=>{'use strict';
 if(window.iChefPremiumOverlayV273)return;
 const KEY='ichef_planning_premium_auth_v1';
 const DEVICE_KEY='ichef_planning_device_v1';
 const TENANT=/^[a-zA-Z0-9_-]{2,80}$/;
 const API_BASE=['localhost','127.0.0.1'].includes(location.hostname)?'http://localhost:10000':'https://tableau-system.onrender.com';
 let pending=null,opened=false,frame=null,overlay=null,caption=null,lastTenant='',lastAuthorized=false;
 let warmScheduled=false,shownBefore=false;
 let previousOverflow='';
 const tenant=()=>{
   try{return String(new URLSearchParams(location.search).get('tenantID')||
     (typeof tenantID_JS==='string'?tenantID_JS:'')||localStorage.getItem('ichef_tenant_id')||'').trim();}catch(_){return '';}
 };
 const currentPin=()=>{try{return typeof window.getRhDirectionAuthPin==='function'?
   String(window.getRhDirectionAuthPin()||'').trim():'';}catch(_){return '';}};
 function rhAuthorized(){
   // Même si le token existe, l'écran RH doit être OUVERT par un responsable connecté.
   const gate=document.getElementById('landing-portal');
   return !!gate && getComputedStyle(gate).display==='none' && /^[0-9]{4,12}$/.test(currentPin());
 }
 function device(){
   let id='';try{id=localStorage.getItem(DEVICE_KEY)||'';}catch(_){}
   if(!id){id=typeof crypto.randomUUID==='function'?crypto.randomUUID():
      ('rh_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2));
      try{localStorage.setItem(DEVICE_KEY,id);}catch(_){}
   }return id;
 }
 function savedSession(t,d){try{
   const x=JSON.parse(sessionStorage.getItem(KEY)||'null');
   return x?.tenant===t && x?.device===d && typeof x?.token==='string' && x.token.length>30 &&
     Number(x.exp)>Date.now()+20000?x:null;
  }catch(_){return null;}
 }
 function wipeSession(){try{sessionStorage.removeItem(KEY);}catch(_){}}
 async function ensureSession(){
   if(pending)return pending;
   const t=tenant();
   if(!TENANT.test(t))throw Error('Établissement non reconnu : reconnectez-vous dans RH.');
   if(!rhAuthorized())throw Error('Connectez-vous d’abord dans RH avec les droits Direction ou Responsable.');
   const d=device();const existing=savedSession(t,d);
   if(existing)return existing;
   const pin=currentPin(); // Mémoire vive de RH, JAMAIS stocké ni passé en URL.
   pending=(async()=>{
     const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),10000);
     try{
       const r=await fetch(API_BASE+'/api/rh/planning/session',{
        method:'POST',credentials:'include',cache:'no-store',signal:controller.signal,
        headers:{'Content-Type':'application/json','Accept':'application/json','X-iCHEF-Tenant':t,'X-iCHEF-Device':d},
        body:JSON.stringify({tenantID:t,deviceId:d,pin})
       });
       const data=await r.json().catch(()=>({}));
       if(!r.ok||data.success===false||typeof data.accessToken!=='string'||data.accessToken.length<30){
        throw Error(data.error||`Session Planning refusée par le serveur (${r.status}).`);
       }
       if(!rhAuthorized()||tenant()!==t)throw Error('Session RH modifiée. Reconnectez-vous.');
       const seconds=Math.max(60,Math.min(7200,Number(data.expiresInSeconds)||7200));
       const value={tenant:t,device:d,token:data.accessToken,actor:data.actor||null,
          exp:Date.now()+seconds*1000-12000};
       try{sessionStorage.setItem(KEY,JSON.stringify(value));}catch(_){
         throw Error('Le navigateur empêche le partage de session. Autorisez le stockage sur ce site.');
       }
       return value;
     }catch(e){if(e.name==='AbortError')throw Error('Le serveur ne répond pas. Réessayez.');throw e;}
     finally{clearTimeout(timeout);}
   })();
   try{return await pending;}finally{pending=null;}
 }
 function ensureOverlay(){
   if(overlay)return;
   const style=document.createElement('style');style.id='ichef-v273-bridge-css';style.textContent=`
#ichef-v273-premium{position:fixed;inset:0;z-index:2147482000;display:none;background:#f6f8fa;color:#122a37;isolation:isolate}
#ichef-v273-premium[data-open="true"]{display:block}
#ichef-v273-premium iframe{display:block;border:0;width:100%;height:100vh;height:100dvh;background:#f6f8fa}
#ichef-v273-premium .v273-caption{position:absolute;inset:0;display:grid;place-items:center;background:#f6f8fa;z-index:2;padding:30px;text-align:center;font:700 15px/1.7 system-ui,sans-serif}
#ichef-v273-premium .v273-caption[hidden]{display:none}
#ichef-v273-premium .v273-caption button{display:inline-block;margin-top:12px;padding:10px 20px;border:0;border-radius:9px;background:#182936;color:#fff;font:inherit}
#ichef-v273-premium .v273-back{position:absolute;right:12px;bottom:12px;z-index:1;border:1px solid #c9d8e1;border-radius:9px;background:#fff;color:#213648;font:bold 11px system-ui;padding:7px 11px;opacity:.80}
#ichef-v273-premium .v273-back:hover{opacity:1}
`;document.head.append(style);
   overlay=document.createElement('section');overlay.id='ichef-v273-premium';
   overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','Planning RH Premium');
   overlay.innerHTML='<div class="v273-caption"><div><strong>Ouverture du Planning Premium…</strong><br><span>Vérification de votre session Direction/RH.</span><br><button type="button" data-v273="cancel">← Retour RH</button></div></div><iframe title="Planning Premium iCHEF" referrerpolicy="same-origin" allow="" ></iframe><button type="button" class="v273-back" data-v273="back">← RH</button>';
   document.body.append(overlay);caption=overlay.querySelector('.v273-caption');frame=overlay.querySelector('iframe');
   overlay.querySelector('[data-v273="cancel"]').addEventListener('click',close);
   overlay.querySelector('[data-v273="back"]').addEventListener('click',close);
   frame.addEventListener('load',()=>{if(opened)caption.hidden=true;});
 }
 function showMessage(text,withCancel=true){
  if(!overlay)return;caption.hidden=false;
  caption.querySelector('strong').textContent=text;
  caption.querySelector('span').textContent=withCancel?'Aucun accès n’est accordé sans validation du serveur.':'Connexion sécurisée au serveur.';
 }
 async function open(){
   if(opened){return;}
   ensureOverlay();opened=true;overlay.dataset.open='true';
   previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';
   caption.hidden=!!(frame.getAttribute('src')&&lastTenant===tenant());
   if(!caption.hidden)showMessage('Ouverture du Planning Premium…',false);
   try{
     const s=await ensureSession();
     if(!opened)return;
     const target='/planning-rh/?tenantID='+encodeURIComponent(s.tenant)+'&rhEmbedded=1';
     if(!frame.getAttribute('src')||lastTenant!==s.tenant){
       lastTenant=s.tenant;frame.setAttribute('src',target);
     }else{
       frame.contentWindow?.postMessage({type:'ICHEF_PREMIUM_RESUME'},location.origin);
       caption.hidden=true;
     }
   }catch(e){if(opened)showMessage(e.message||'Connexion au planning impossible.');}
 }
 function close(){
   if(!opened)return;opened=false;if(overlay)overlay.dataset.open='false';
   document.body.style.overflow=previousOverflow;
   if(frame?.getAttribute('src'))frame.contentWindow?.postMessage({type:'ICHEF_PREMIUM_PAUSE'},location.origin);
   // Signaler aux miroirs RH le retour sans recharger rh.html.
   try{window.iChefRhPremiumRefreshV258?.(true);}catch(_){}
   try{window.iChefRhPlanningBridgeV267?.refresh?.();}catch(_){}
 }
 function logoutCleanup(){
   close();wipeSession();lastTenant='';if(frame)frame.removeAttribute('src');
   warmScheduled=false;lastAuthorized=false;
 }
 async function warmup(){
   if(!rhAuthorized())return;
   try{await ensureSession();}catch(e){console.info('[iCHEF Planning Premium] Préconnexion différée :',e.message);}
 }
 // Une authentification RH initiale suffit : prépare le jeton en tâche non bloquante.
 const warmInterval=setInterval(()=>{
   const nowAuthorized=rhAuthorized();
   if(nowAuthorized&&!lastAuthorized){
     lastAuthorized=true;
     if(!warmScheduled){warmScheduled=true;setTimeout(()=>{if(rhAuthorized())void warmup();},700);}
   }else if(!nowAuthorized&&lastAuthorized){logoutCleanup();}
 },950);
 // Wrap explicite de la déconnexion officielle : ne pas conserver l'iframe RH active.
 if(typeof window.fullLogout==='function'){
   const original=window.fullLogout;
   window.fullLogout=function(...args){logoutCleanup();return original.apply(this,args);};
 }
 window.addEventListener('message',e=>{
   if(e.origin!==location.origin||!frame||e.source!==frame.contentWindow||!e.data)return;
   if(e.data.type==='ICHEF_PREMIUM_RETURN_RH')close();
   if(e.data.type==='ICHEF_PREMIUM_LOGOUT'){
     logoutCleanup();if(typeof window.fullLogout==='function')window.fullLogout();
   }
 });
 // Capturer les accès existants avant les gestionnaires historiques, sans toucher
 // aux autres onglets ou fonctions RH.
 const selectors=['#rh-v226-sidebar [data-v226-nav="planning"]',
    '#rh-v236-side [data-v236-nav="planning"]','.rh-v259-open','.ichef-v258-open',
    '#rh-v226-plan-full','#rh-v226-plan-table-wrap','#rh-v236-planning-card',
    '#rh-v226-plan-actions [data-v226-action="publish"]'].join(',');
 window.addEventListener('click',e=>{
   const el=e.target.closest?.(selectors);
   const legacy=e.target.closest?.('#director-hub .rh-cockpit-nav button[onclick]');
   const legacyPlanning=legacy&&legacy.textContent?.trim()==='Planning'&&legacy.getAttribute('onclick')?.includes('openInterface');
   if(!el&&!legacyPlanning)return;
   e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();void open();
 },true);
 const old=window.iChefOpenPlanningPremiumV257;
 window.iChefOpenPlanningPremiumV257=open;
 window.iChefRhOpenOfficialPlanningV259=open;
 window.iChefPremiumOverlayV273={open,close,ensureSession,warmup};
})();//# sourceURL=rh-premium-bridge.js
