
;
/* RH V264 - preserved script #167 */

(()=>{'use strict';
 if(window.__ICHEF_RH_PREMIUM_ONLY_V258)return;
 window.__ICHEF_RH_PREMIUM_ONLY_V258=true;
 const tenant=()=>String(new URLSearchParams(location.search).get('tenantID')||
   (typeof tenantID_JS!=='undefined'?tenantID_JS:'')||'').trim();
 let refreshing=false,lastRefresh=0;
 function go(){
   if(typeof window.iChefOpenPlanningPremiumV257==='function')
     return void window.iChefOpenPlanningPremiumV257();
   const t=tenant(); if(t)location.assign('/planning-rh/?tenantID='+encodeURIComponent(t));
 }
 function placeBanner(host){
   if(!host||host.querySelector('.ichef-v258-banner'))return;
   const el=document.createElement('div');el.className='ichef-v258-banner';
   const body=document.createElement('div');body.innerHTML='<strong>PLANNING OFFICIEL · CONSULTATION</strong><br><small>Modifier les horaires, repos, congés et publier uniquement depuis Planning Premium.</small>';
   const btn=document.createElement('button');btn.type='button';btn.className='ichef-v258-open';
   btn.textContent='OUVRIR PLANNING PREMIUM';btn.addEventListener('click',go);
   el.append(body,btn);host.prepend(el);
 }
 function addBanners(){
   placeBanner(document.getElementById('hr-interface'));
   const main=document.querySelector('#director-hub .rh-planning-panel');
   if(main)placeBanner(main);
 }
 function noEdit(event){
   const target=event.target?.closest?.('#global-tbody,#timesheet-body,#annual-tbody,#rh-cockpit-plan-body');
   if(!target)return;
   // Les tableaux RH peuvent être consultés et déroulés, mais pas modifiés.
   const input=event.target?.closest?.('button,input,select,textarea,[data-rh-edit-staff],[data-rh-staff]');
   if(!input && !event.target?.closest?.('td[data-rh-edit],.rh-cockpit-chip'))return;
   event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();go();
 }
 document.addEventListener('click',noEdit,true);
 document.addEventListener('change',event=>{
   if(!event.target?.closest?.('#global-tbody,#timesheet-body,#annual-tbody'))return;
   event.stopImmediatePropagation();event.preventDefault();
   void refresh(true);go();
 },true);
 async function refresh(force=false){
   if(refreshing||(!force&&Date.now()-lastRefresh<15000)||document.hidden)return;
   if(typeof API==='undefined'||typeof API.getState!=='function')return;
   refreshing=true;
   try{
     const data=await API.getState();
     const node=data?.activeOrders?.TIMESHEETS_MASTER;
     const timesheets=node?.data??node;
     if(timesheets && typeof timesheets==='object'&&!Array.isArray(timesheets)){
       localStorage.setItem('empire_hr_timesheets',JSON.stringify(timesheets));
       lastRefresh=Date.now();
       try{if(typeof loadMonthData==='function')loadMonthData();}catch(_){}
       try{if(typeof renderRhCockpit==='function')renderRhCockpit();}catch(_){}
       window.dispatchEvent(new CustomEvent('ichef:premium:rh-synced',
         {detail:{tenant:tenant(),time:lastRefresh}}));
     }
   }catch(err){console.warn('[RH V258] aperçu en attente de synchronisation serveur',err?.message);}
   finally{refreshing=false;}
 }
 window.iChefRhPremiumRefreshV258=refresh;
 // Garder les fonctions d'analyse/contrats intactes : bloquer UNIQUEMENT les actions qui éditent le planning.
 function installLegacyGuards(){
   for(const name of ['openRhCockpitShiftEditor','rhApplyPlanningStatusV91','applyRhQuickStatus']){
     if(typeof window[name]!=='function'||window[name].__premiumV258)continue;
     const redirect=function(){go();return false;};redirect.__premiumV258=true;window[name]=redirect;
   }
   if(typeof window.publishRhPlanningToStaff==='function'&&!window.publishRhPlanningToStaff.__premiumV258){
     const redirect=function(){go();return false;};redirect.__premiumV258=true;
     window.publishRhPlanningToStaff=redirect;
   }
   if(typeof window.applyAutomaticPlanning==='function'&&!window.applyAutomaticPlanning.__premiumV258){
     const guarded=function(){
       const msg='Proposition IA préparée : validation et application uniquement dans Planning Premium.';
       try{if(typeof showToast==='function')showToast(msg);}catch(_){}
       return Promise.resolve(false);
     };guarded.__premiumV258=true;window.applyAutomaticPlanning=guarded;
   }
 }
 try{
   const channel='BroadcastChannel' in window?new BroadcastChannel('ichef-planning-premium-events-v1'):null;
   if(channel)channel.onmessage=event=>{
     if(event?.data?.type==='PLANNING_CHANGED' && event.data.tenant===tenant()){
       lastRefresh=0;void refresh(true);
     }
   };
 }catch(_){}
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)void refresh(false);});
 window.addEventListener('focus',()=>{void refresh(false);});
 // En lecture : refléter les publications Premium même lorsque RH reste ouvert.
 setInterval(()=>{installLegacyGuards();if(!document.hidden)void refresh(false);},30000);
 document.addEventListener('DOMContentLoaded',()=>{addBanners();installLegacyGuards();setTimeout(()=>refresh(true),500);});
 if(document.readyState!=='loading'){addBanners();installLegacyGuards();setTimeout(()=>refresh(true),500);}
})();

