
;
/* RH V264 - preserved script #168 */

(()=>{'use strict';
 if(window.__ICHEF_RH_PREMIUM_EXCLUSIVE_V259)return;
 window.__ICHEF_RH_PREMIUM_EXCLUSIVE_V259=true;
 const tenant=()=>String(new URLSearchParams(location.search).get('tenantID')||
   (typeof tenantID_JS!=='undefined'?tenantID_JS:'')||'').trim();
 function openPremium(){
   if(typeof window.iChefOpenPlanningPremiumV257==='function'){
     window.iChefOpenPlanningPremiumV257();return;
   }
   const id=tenant();
   if(!id){console.warn('[RH V259] Établissement manquant, navigation refusée');return;}
   location.assign('/planning-rh/?tenantID='+encodeURIComponent(id));
 }
 window.iChefRhOpenOfficialPlanningV259=openPremium;
 const createEntry=()=>{
   const el=document.createElement('section');el.className='rh-v259-entry';
   el.setAttribute('aria-label','Planning officiel iCHEF Premium');
   const body=document.createElement('div');
   const kicker=document.createElement('small');kicker.textContent='PLANNING OFFICIEL · SOURCE UNIQUE';
   const h=document.createElement('h3');h.textContent='Planning RH Premium';
   const p=document.createElement('p');
   p.textContent='Créer, modifier et publier les horaires exclusivement dans Planning Premium. RH, Pointeuse et Portail Staff consultent les données autorisées du même planning central.';
   body.append(kicker,h,p);
   const button=document.createElement('button');button.type='button';button.className='rh-v259-open';
   button.textContent='OUVRIR PLANNING PREMIUM';button.addEventListener('click',openPremium);
   el.append(body,button);return el;
 };
 function place(){
   for(const [selector,position] of [
     ['#rh-v226-primary','prepend'],
     ['#hr-interface','append'],
     ['#rh-v236-individual-shell #rh-v236-content','prepend']]){
     const host=document.querySelector(selector);
     if(!host||host.querySelector(':scope > .rh-v259-entry'))continue;
     host[position](createEntry());
   }
   const old=document.querySelector('#rh-v236-side [data-v236-nav="planning"]');
   if(old){old.setAttribute('aria-label','Ouvrir Planning Premium');
     const label=old.querySelector('span:last-child');if(label)label.textContent='Planning Premium';}
 }
 // Les autres éléments RH (contrats, fiches, absences, historique, pointages)
 // restent en place : seule l'ancienne interface de planning est retirée.
 document.addEventListener('click',e=>{
   const target=e.target.closest?.('[data-v236-nav="planning"], [data-v226-nav="planning"], #rh-v226-plan-table-wrap, #rh-v236-planning-card');
   if(!target)return;
   e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();openPremium();
 },true);
 // V260 : ne plus observer en continu TOUT le DOM RH.
 // Seuls l'ouverture et le changement de vue RH justifient le contrôle des liens.
 let placeTimer=0;
 const later=()=>{
   if(placeTimer)clearTimeout(placeTimer);
   placeTimer=setTimeout(()=>{placeTimer=0;place();},100);
 };
 const start=()=>{
   place();
   document.addEventListener('click',event=>{
     if(event.target?.closest?.('button,[data-v226-nav],[data-v236-nav],.rh-cockpit-nav'))later();
   },false);
   document.addEventListener('ichef:rh:view-changed',later);
   window.addEventListener('pageshow',later);
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
 else start();
})();

