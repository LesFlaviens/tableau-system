
;
/* RH V264 - preserved script #166 */

(() => {
  'use strict';
  if(window.__ICHEF_RH_V251_SIDEBAR__) return;
  window.__ICHEF_RH_V251_SIDEBAR__=true;

  function keepActiveVisible(sidebar){
    if(!sidebar)return;
    const active=sidebar.querySelector('.rh-v226-nav-btn.active,.rh-v236-nav.active');
    if(!active)return;

    const sb=sidebar.getBoundingClientRect();
    const ar=active.getBoundingClientRect();
    if(ar.top < sb.top || ar.bottom > sb.bottom){
      active.scrollIntoView({block:'nearest',behavior:'auto'});
    }
  }

  function refresh(){
    keepActiveVisible(document.getElementById('rh-v226-sidebar'));
    keepActiveVisible(document.getElementById('rh-v236-side'));
  }

  window.addEventListener('resize',()=>requestAnimationFrame(refresh));
  window.addEventListener('ichef:staff-selected',()=>requestAnimationFrame(refresh));
  document.addEventListener('click',event=>{
    if(event.target?.closest?.('.rh-v226-nav-btn,.rh-v236-nav')){
      setTimeout(refresh,0);
    }
  },true);

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',refresh,{once:true});
  }else{
    refresh();
  }

  window.__ICHEF_RH_BUILD__='RH-V251-MENU-LATERAL-COMPLET-VISIBLE';
  console.info('[iCHEF RH V251] sidebar complète · scroll vertical · adaptation hauteur écran');
})();

