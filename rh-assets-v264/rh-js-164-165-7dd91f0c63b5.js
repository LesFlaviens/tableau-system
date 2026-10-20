
;
/* RH V264 - preserved script #164 */

(() => {
  'use strict';
  if(window.__ICHEF_RH_V249_TIMESHEET_ACTIONS__) return;
  window.__ICHEF_RH_V249_TIMESHEET_ACTIONS__=true;

  function closeProof(){
    const modal=document.getElementById('rh-v249-proof-modal');
    const img=document.getElementById('rh-v249-proof-image');
    if(img) img.removeAttribute('src');
    if(modal){
      modal.classList.remove('show');
      modal.style.display='none';
      modal.setAttribute('aria-hidden','true');
    }
  }

  window.openRhProofPhotoV249=function(src){
    const value=String(src||'');
    if(!value.startsWith('data:image/')){
      alert('Aucune photo disponible pour cette preuve.');
      return false;
    }
    const modal=document.getElementById('rh-v249-proof-modal');
    const img=document.getElementById('rh-v249-proof-image');
    if(!modal||!img) return false;
    img.src=value;
    modal.style.display='flex';
    modal.classList.add('show');
    modal.setAttribute('aria-hidden','false');
    return true;
  };

  document.addEventListener('click',event=>{
    if(event.target?.id==='rh-v249-proof-close'){
      closeProof();
      return;
    }
    if(event.target?.id==='rh-v249-proof-modal'){
      closeProof();
      return;
    }

    // Les photos des feuilles d'heures sont ouvertes dans iCHEF,
    // sans popup/nouvel onglet potentiellement bloqué par Edge/Chrome.
    const img=event.target?.closest?.(
      '#staff-detail-planning-body .rh-day-proof-v97 img,'+
      '#timesheet-correction-photos-v97 .rh-correct-v97-proof-card img'
    );
    if(img){
      event.preventDefault();
      event.stopPropagation();
      window.openRhProofPhotoV249(img.currentSrc||img.src||'');
    }
  },true);

  document.addEventListener('keydown',event=>{
    if(event.key==='Escape' &&
       document.getElementById('rh-v249-proof-modal')?.classList.contains('show')){
      closeProof();
    }
  });

  // Défense supplémentaire : les fonctions utilisées par les boutons
  // doivent rester accessibles même après reconstruction dynamique des vues.
  function expose(){
    [
      'validateRealTimesheet',
      'correctRealTimesheetDay',
      'saveTimesheetCorrectionV97',
      'alignTimesheetCorrectionToPlanningV98',
      'closeTimesheetCorrectionV97'
    ].forEach(name=>{
      try{
        if(typeof window[name]!=='function'){
          const fn=eval(`typeof ${name}==='function' ? ${name} : null`);
          if(fn) window[name]=fn;
        }
      }catch(_){}
    });
  }

  function activate(){
    expose();
    document.querySelectorAll(
      '#real-timesheet-body button,'+
      '#staff-detail-planning-body button,'+
      '#timesheet-correction-modal-v97 button'
    ).forEach(btn=>btn.classList.add('rh-v249-active-action'));
  }

  new MutationObserver(activate).observe(document.body,{childList:true,subtree:true});
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',()=>setTimeout(activate,100),{once:true});
  }else{
    setTimeout(activate,100);
  }
  setTimeout(activate,500);

  window.__ICHEF_RH_BUILD__='RH-V249-HEURES-ACTIONS-PHOTO-ACTIVE-SECURE';
  console.info('[iCHEF RH V249] validation heures + correction motivée + preuve photo activées');
})();



;
/* RH V264 - preserved script #165 */

(() => {
  'use strict';
  if(window.__ICHEF_RH_V250_FREEZE_GUARD__) return;
  window.__ICHEF_RH_V250_FREEZE_GUARD__=true;

  let pending=0;
  function stableRefresh(){
    if(pending)return;
    pending=requestAnimationFrame(()=>{
      pending=0;
      try{
        window.ICHEF_RH_V236?.updateIndividual?.();
      }catch(_){}
    });
  }

  window.addEventListener('ichef:staff-selected',stableRefresh);
  window.addEventListener('ichef:individual-planning-rendered',stableRefresh);

  window.__ICHEF_RH_BUILD__='RH-V250-PAGE-FREEZE-FIX-STABLE';
  console.info('[iCHEF RH V250] boucle MutationObserver/style supprimée · page stable');
})();

