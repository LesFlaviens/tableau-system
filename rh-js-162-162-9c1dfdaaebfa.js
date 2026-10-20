
;
/* RH V264 - preserved script #162 */

(() => {
  'use strict';
  if(window.__ICHEF_RH_V247_INDIVIDUAL__) return;
  window.__ICHEF_RH_V247_INDIVIDUAL__=true;

  let repairing=false;
  let lastRepairAt=0;
  let frame=0;

  function selectedId(){
    const explicit=String(window.__ICHEF_V239_SELECTED_STAFF_ID__||'').trim();
    if(explicit) return explicit;

    try{
      if(typeof currentStaffId!=='undefined' && currentStaffId!==null && currentStaffId!==''){
        return String(currentStaffId);
      }
    }catch(_){}

    const card=document.querySelector('#staff-list-render .rh-v220-staff-card.active[data-staff-id]');
    return String(card?.dataset.staffId||'').trim();
  }

  function ensureStatus(){
    const head=document.getElementById('rh-v236-planning-head');
    if(!head)return null;
    let el=document.getElementById('rh-v247-plan-state');
    if(!el){
      el=document.createElement('span');
      el.id='rh-v247-plan-state';
      el.innerHTML='<span class="dot"></span><span class="txt">SYNCHRONISÉ · MODIFIABLE</span>';
      const actions=document.getElementById('rh-v236-planning-actions');
      if(actions) head.insertBefore(el,actions);
      else head.appendChild(el);
    }
    return el;
  }

  function status(state,text){
    const el=ensureStatus();
    if(!el)return;
    el.dataset.state=state||'ok';
    const t=el.querySelector('.txt');
    if(t)t.textContent=text||'SYNCHRONISÉ · MODIFIABLE';
  }

  function mount(){
    const host=document.getElementById('rh-v236-table-host');
    const individual=document.getElementById('table-container-individual');
    const annual=document.getElementById('annual-view-container');
    if(host&&individual&&individual.parentElement!==host)host.appendChild(individual);
    if(host&&annual&&annual.parentElement!==host)host.appendChild(annual);
    return {host,individual,annual};
  }

  function isEditing(){
    const active=document.activeElement;
    return Boolean(active?.closest?.('#table-container-individual') &&
      active.matches?.('input,select,textarea'));
  }

  function makeVisible(){
    const id=selectedId();
    if(!id)return false;

    const {individual,annual}=mount();
    if(!individual)return false;

    let annualMode=false;
    try{
      annualMode=(typeof isAnnualView!=='undefined' && Boolean(isAnnualView));
    }catch(_){
      annualMode=Boolean(annual&&getComputedStyle(annual).display!=='none');
    }

    const setImportantIfNeeded=(el,prop,value)=>{
      if(!el)return;
      const current=el.style.getPropertyValue(prop);
      const priority=el.style.getPropertyPriority(prop);
      if(current!==value || priority!=='important'){
        el.style.setProperty(prop,value,'important');
      }
    };

    if(!annualMode){
      setImportantIfNeeded(individual,'display','block');
      setImportantIfNeeded(individual,'visibility','visible');
      setImportantIfNeeded(individual,'opacity','1');
      if(annual)setImportantIfNeeded(annual,'display','none');
    }

    // Appel conservé pour compatibilité avec rh-core V249.
    // V250 évite toutefois toute boucle MutationObserver <-> style.
    window.iChefEnsureIndividualPlanningV247?.(id);
    return true;
  }

  function refresh(reason='refresh',force=false){
    if(frame)return;
    frame=requestAnimationFrame(()=>{
      frame=0;
      const id=selectedId();
      if(!id)return;
      if(isEditing()&&!force)return;

      makeVisible();
      ensureStatus();

      const body=document.getElementById('timesheet-body');
      const hasRows=Boolean(body?.querySelector('tr'));

      // Le moteur rh-core est la source officielle du tableau.
      // On ne reconstruit pas une deuxième copie du planning.
      try{
        if(typeof loadMonthData==='function'){
          loadMonthData();
        }
      }catch(error){
        console.warn('[iCHEF RH V247] loadMonthData',reason,error);
      }

      makeVisible();

      const rows=document.querySelectorAll('#timesheet-body tr').length;
      if(rows){
        status('ok','SYNCHRONISÉ · MODIFIABLE');
        window.ICHEF_RH_V236?.updateIndividual?.();
        return;
      }

      // Compatibilité : si un ancien core n'a pas reçu la sélection
      // mais que le shell connaît déjà le collaborateur, resynchroniser
      // via selectStaff une seule fois.
      const now=Date.now();
      if(!hasRows && !repairing && now-lastRepairAt>1200 && typeof window.selectStaff==='function'){
        repairing=true;
        lastRepairAt=now;
        try{
          window.selectStaff(id);
        }catch(error){
          console.warn('[iCHEF RH V247] resélection collaborateur',error);
        }
        setTimeout(()=>{
          repairing=false;
          try{makeVisible();window.ICHEF_RH_V236?.updateIndividual?.();}catch(_){}
          const n=document.querySelectorAll('#timesheet-body tr').length;
          status(n?'ok':'pending',n?'SYNCHRONISÉ · MODIFIABLE':'PLANNING À RECHARGER');
        },120);
      }else if(!rows){
        status('pending','PLANNING À RECHARGER');
      }
    });
  }

  document.addEventListener('change',event=>{
    const input=event.target?.closest?.(
      '#table-container-individual .status-sel,'+
      '#table-container-individual .shift-inp,'+
      '#table-container-individual .pause-inp,'+
      '#table-container-individual .obs-inp'
    );
    if(!input)return;

    status('saving','ENREGISTREMENT…');

    // updateData / saveTs existants conservent audit, motif, session Planning
    // et synchronisation serveur. On ne remplace pas cette sécurité.
    setTimeout(()=>refresh('edit-local',false),180);
    setTimeout(()=>{
      refresh('edit-server',false);
      const n=document.querySelectorAll('#timesheet-body tr').length;
      status(n?'ok':'pending',n?'SYNCHRONISÉ · MODIFIABLE':'SYNCHRO EN ATTENTE');
    },1100);
  },true);

  window.addEventListener('ichef:staff-selected',()=>setTimeout(()=>refresh('staff-selected',true),0));
  window.addEventListener('ichef:individual-planning-rendered',()=>setTimeout(()=>{makeVisible();status('ok','SYNCHRONISÉ · MODIFIABLE');window.ICHEF_RH_V236?.updateIndividual?.();},0));
  window.addEventListener('ichef:planning-symbiosis',()=>setTimeout(()=>refresh('symbiosis',false),60));
  window.addEventListener('ichef:planning-views-refreshed',()=>setTimeout(()=>refresh('views-refreshed',false),60));
  window.addEventListener('focus',()=>setTimeout(()=>refresh('focus',false),100));

  const host=document.getElementById('rh-v236-table-host');
  if(host){
    let hostRepairQueued=false;
    new MutationObserver(mutations=>{
      if(isEditing()||hostRepairQueued)return;
      if(!mutations.some(m=>m.type==='childList'))return;
      hostRepairQueued=true;
      requestAnimationFrame(()=>{
        hostRepairQueued=false;
        // V250 : uniquement réparation structurelle.
        // Aucun suivi des attributs style pour éviter la boucle infinie
        // makeVisible() -> style mutation -> observer -> makeVisible().
        mount();
      });
    }).observe(host,{childList:true,subtree:false});
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>refresh('dom-ready',true),180),{once:true});
  }else{
    setTimeout(()=>refresh('boot',true),180);
  }
  setTimeout(()=>refresh('boot-late',true),700);

  window.iChefRefreshIndividualPlanningV247=refresh;
  window.__ICHEF_RH_BUILD__='RH-V247-PLANNING-INDIVIDUEL-SYNC-MODIFIABLE';
  console.info('[iCHEF RH V247] planning individuel visible · même source · édition + synchro conservées');
})();

