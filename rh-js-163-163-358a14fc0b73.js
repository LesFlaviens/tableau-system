
;
/* RH V264 - preserved script #163 */

(() => {
  'use strict';
  if(window.__ICHEF_RH_V248_PROFILE_NAV__) return;
  window.__ICHEF_RH_V248_PROFILE_NAV__=true;

  function directory(){
    try{
      const rows=typeof getDir==='function' ? getDir() : [];
      return (Array.isArray(rows)?rows:[])
        .filter(s=>s && s.id!==undefined && s.id!==null && s.active!==false);
    }catch(_){
      return [];
    }
  }

  function selectedId(){
    const explicit=String(window.__ICHEF_V239_SELECTED_STAFF_ID__||'').trim();
    if(explicit) return explicit;
    try{
      if(typeof currentStaffId!=='undefined' && currentStaffId!==null && currentStaffId!==''){
        return String(currentStaffId);
      }
    }catch(_){}
    return '';
  }

  function currentIndex(rows){
    const id=selectedId();
    return rows.findIndex(s=>String(s.id)===id);
  }

  function updateButtons(){
    const rows=directory();
    const prev=document.getElementById('rh-v248-prev-profile');
    const next=document.getElementById('rh-v248-next-profile');
    const disabled=rows.length<2;
    if(prev) prev.disabled=disabled;
    if(next) next.disabled=disabled;

    if(!rows.length) return;
    const idx=currentIndex(rows);
    const safeIdx=idx>=0?idx:0;
    const prevStaff=rows[(safeIdx-1+rows.length)%rows.length];
    const nextStaff=rows[(safeIdx+1)%rows.length];

    if(prev){
      prev.title=disabled
        ? 'Aucun autre profil actif'
        : `Profil précédent : ${prevStaff?.name||'collaborateur'}`;
      prev.setAttribute('aria-label',prev.title);
    }
    if(next){
      next.title=disabled
        ? 'Aucun autre profil actif'
        : `Profil suivant : ${nextStaff?.name||'collaborateur'}`;
      next.setAttribute('aria-label',next.title);
    }
  }

  function navigate(step){
    const rows=directory();
    if(rows.length<2){
      updateButtons();
      return false;
    }

    const idx=currentIndex(rows);
    const safeIdx=idx>=0?idx:0;
    const target=rows[(safeIdx+step+rows.length)%rows.length];
    if(!target) return false;

    // Toute saisie en cours perd d'abord le focus : le onchange/updateData
    // existant garde ainsi son audit/motif avant le changement de profil.
    const active=document.activeElement;
    if(active?.closest?.('#table-container-individual') &&
       active.matches?.('input,select,textarea')){
      try{active.blur()}catch(_){}
    }

    window.__ICHEF_V239_SELECTED_STAFF_ID__=String(target.id);

    if(typeof window.selectStaff==='function'){
      window.selectStaff(target.id);
    }else if(typeof window.openStaffPlanning==='function'){
      window.openStaffPlanning(target.id);
    }else{
      return false;
    }

    requestAnimationFrame(()=>{
      window.ICHEF_RH_V236?.updateIndividual?.();
      window.iChefRefreshIndividualPlanningV247?.('profile-navigation-v248',true);
      updateButtons();
    });

    window.dispatchEvent(new CustomEvent('ichef:profile-navigation',{
      detail:{
        staffId:String(target.id),
        name:String(target.name||''),
        direction:step<0?'previous':'next',
        at:new Date().toISOString()
      }
    }));
    return true;
  }

  function bind(){
    const prev=document.getElementById('rh-v248-prev-profile');
    const next=document.getElementById('rh-v248-next-profile');

    if(prev && prev.dataset.v248Bound!=='1'){
      prev.dataset.v248Bound='1';
      prev.addEventListener('click',()=>navigate(-1));
    }
    if(next && next.dataset.v248Bound!=='1'){
      next.dataset.v248Bound='1';
      next.addEventListener('click',()=>navigate(1));
    }
    updateButtons();
  }

  // Raccourci utile, sans voler les flèches normales d'un champ de saisie.
  document.addEventListener('keydown',event=>{
    if(!event.altKey || !['ArrowLeft','ArrowRight'].includes(event.key)) return;
    if(event.target?.matches?.('input,textarea,select')) return;
    event.preventDefault();
    navigate(event.key==='ArrowLeft'?-1:1);
  });

  window.addEventListener('ichef:staff-selected',()=>setTimeout(updateButtons,0));
  window.addEventListener('ichef:profile-navigation',()=>setTimeout(updateButtons,0));
  window.addEventListener('ichef:planning-symbiosis',()=>setTimeout(updateButtons,40));

  const shell=document.getElementById('rh-v236-individual-shell');
  if(shell){
    new MutationObserver(bind).observe(shell,{childList:true,subtree:true});
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',()=>setTimeout(bind,100),{once:true});
  }else{
    setTimeout(bind,100);
  }
  setTimeout(bind,500);

  window.iChefPreviousProfileV248=()=>navigate(-1);
  window.iChefNextProfileV248=()=>navigate(1);
  window.__ICHEF_RH_BUILD__='RH-V248-NAVIGATION-PROFILS-ACTIVE-SECURE';
  console.info('[iCHEF RH V248] navigation profil précédent / suivant activée et synchronisée');
})();

