
;
/* RH V264 - preserved script #29 */
(() => {
'use strict';
// UI only. No PIN/auth/session/tenantID changes.
function installLegend(){
 const modal=document.getElementById('ia-predictions-modal');
 if(!modal || modal.querySelector('.v116-legend-btn')) return;
 const head=modal.querySelector('.v113-plan-head');
 if(!head) return;
 const btn=document.createElement('button');
 btn.type='button'; btn.className='v116-legend-btn';
 btn.innerHTML='<span aria-hidden="true">ⓘ</span> LÉGENDE';
 btn.onclick=()=>window.openPlanningLegendV116();
 head.appendChild(btn);
}
window.openPlanningLegendV116=()=>{const m=document.getElementById('v116-legend-modal');if(m){m.classList.add('show');m.setAttribute('aria-hidden','false')}};
window.closePlanningLegendV116=()=>{const m=document.getElementById('v116-legend-modal');if(m){m.classList.remove('show');m.setAttribute('aria-hidden','true')}};
document.addEventListener('click',e=>{const m=document.getElementById('v116-legend-modal');if(e.target===m) closePlanningLegendV116()});
document.addEventListener('keydown',e=>{if(e.key==='Escape') closePlanningLegendV116()});
/* Automatic contrast helper: if a planning cell is truly white/very light,
   force dark text. It never changes the cell background. */
function applyReadableContrast(root=document){
 root.querySelectorAll('#ia-predictions-modal td, #ia-predictions-modal .planning-cell, #ia-predictions-modal .shift-cell').forEach(el=>{
  const rgb=getComputedStyle(el).backgroundColor.match(/\d+/g);
  if(!rgb||rgb.length<3)return;
  const [r,g,b]=rgb.map(Number);
  const lum=(0.299*r+0.587*g+0.114*b);
  el.classList.toggle('v116-light',lum>205);
 });
}
const oldRender=window.renderAutomaticPlanningDraft;
if(typeof oldRender==='function'&&!oldRender.__v116){
 const wrapped=function(...args){const r=oldRender.apply(this,args);requestAnimationFrame(()=>{installLegend();applyReadableContrast()});return r};
 wrapped.__v116=true; window.renderAutomaticPlanningDraft=wrapped;
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{installLegend();applyReadableContrast()},{once:true});
else {installLegend();applyReadableContrast();}
window.__ICHEF_RH_SERVICES_BUILD__='V116';
})();


;
/* RH V264 - preserved script #30 */
(() => {
function install(){
 const modal=document.getElementById('ia-predictions-modal');
 if(!modal||document.getElementById('v124-bar'))return;
 const flow=modal.querySelector('.v113-flow'); if(!flow)return;
 const bar=document.createElement('div');bar.id='v124-bar';
 bar.innerHTML=`<label>PÉRIODE À GÉNÉRER</label><select id="v124-horizon"><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5</option><option value="6">6</option></select><label>mois</label><span id="v124-count">0 / 2 mois générés</span><div id="v124-nav"><button type="button" id="v124-prev">‹</button><span id="v124-month">—</span><button type="button" id="v124-next">›</button></div>`;
 flow.insertAdjacentElement('afterend',bar);
 document.getElementById('v124-horizon').onchange=sync;
 document.getElementById('v124-prev').onclick=()=>move(-1);
 document.getElementById('v124-next').onclick=()=>move(1);
 sync();
}
function data(){return window.__ICHEF_MULTI_MONTH_PUBLIC__||{horizon:Number(document.getElementById('v124-horizon')?.value||2),index:0,months:[]}}
function sync(){
 const d=data(),h=Number(document.getElementById('v124-horizon')?.value||d.horizon||2);
 const c=document.getElementById('v124-count'); if(c)c.textContent=`${d.months.length} / ${h} mois générés`;
 const rec=d.months[d.index]||d.months[0];
 const mn=document.getElementById('v124-month');
 if(mn)mn.textContent=rec?.label||document.getElementById('month-selector')?.value||'—';
 const p=document.getElementById('v124-prev'),n=document.getElementById('v124-next');
 if(p)p.disabled=!d.months.length||d.index<=0;
 if(n)n.disabled=!d.months.length||d.index>=d.months.length-1;
}
function move(delta){
 const d=data(); if(!d.months.length)return;
 const next=Math.max(0,Math.min(d.months.length-1,d.index+delta));
 window.renderPlanningAssistantMultiMonth?.(next);
}
window.addEventListener('ichef-multimonth-update',sync);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();


;
/* RH V264 - preserved script #31 */
(() => {
'use strict';
function publicState(){
 return window.__ICHEF_MULTI_MONTH_PUBLIC__ || {horizon:2,index:0,months:[]};
}
function currentRecord(){
 const d=publicState();
 return d.months?.[d.index] || null;
}
function syncMonthEverywhere(){
 const d=publicState(), rec=currentRecord();
 if(!rec)return;
 // Barre multi-mois = source visuelle unique.
 const top=document.getElementById('v124-month');
 if(top) top.textContent=(rec.label||rec.month||'').toUpperCase();
 // Sélecteur réel du moteur suit exactement le mois visible.
 const sel=document.getElementById('month-selector');
 if(sel && rec.month) sel.value=rec.month;
 // Supprime seulement les titres autonomes qui répètent un mois/année.
 const modal=document.getElementById('ia-predictions-modal');
 if(modal){
   modal.querySelectorAll('h1,h2,h3,h4,.month-title,.planning-month-title').forEach(el=>{
     if(el.closest('#v124-bar')) return;
     const t=(el.textContent||'').trim();
     if(/^(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+20\d{2}$/i.test(t)){
       el.classList.add('v125-duplicate-month');
     }
   });
 }
}
function evaluateProposal(){
 const draft=window.planningAssistantDraft;
 const modal=document.getElementById('ia-predictions-modal');
 if(!draft||!modal)return;
 // Lire les indicateurs déjà calculés par le moteur, sans inventer une seconde logique métier.
 const text=modal.innerText||'';
 const alertsMatch=text.match(/ALERTES\s*(\d+)/i);
 const balancedMatch=text.match(/ÉQUILIBR[ÉE]S?\s*(\d+)\s*\/\s*(\d+)/i);
 const alerts=alertsMatch?Number(alertsMatch[1]):0;
 const balanced=balancedMatch?Number(balancedMatch[1]):null;
 const total=balancedMatch?Number(balancedMatch[2]):null;
 const needsReview=alerts>0 || (total!==null && balanced!==null && balanced<total);
 // Remplace uniquement le badge de statut existant.
 const candidates=[...modal.querySelectorAll('span,div')].filter(el=>{
   const t=(el.textContent||'').trim().toUpperCase();
   return t==='PROPOSITION PRÊTE' || t==='À VÉRIFIER';
 });
 candidates.forEach(el=>{
   el.textContent=needsReview?'À VÉRIFIER':'PROPOSITION PRÊTE';
   el.classList.add('v125-review');
   el.classList.toggle('v125-ready',!needsReview);
 });
}
function sync(){
 syncMonthEverywhere();
 requestAnimationFrame(evaluateProposal);
}
window.addEventListener('ichef-multimonth-update',sync);
// Les flèches V124 utilisent déjà renderPlanningAssistantMultiMonth.
// On resynchronise après chaque changement de mois.
const old=window.renderPlanningAssistantMultiMonth;
if(typeof old==='function' && !old.__v125){
 const wrapped=function(...args){
   const r=old.apply(this,args);
   requestAnimationFrame(sync);
   return r;
 };
 wrapped.__v125=true;
 window.renderPlanningAssistantMultiMonth=wrapped;
}
const oldRender=window.renderAutomaticPlanningDraft;
if(typeof oldRender==='function' && !oldRender.__v125){
 const wrapped=function(...args){
   const r=oldRender.apply(this,args);
   requestAnimationFrame(sync);
   return r;
 };
 wrapped.__v125=true;
 window.renderAutomaticPlanningDraft=wrapped;
}
if(document.readyState==='loading'){
 document.addEventListener('DOMContentLoaded',()=>requestAnimationFrame(sync),{once:true});
}else requestAnimationFrame(sync);
window.__ICHEF_RH_SYNC_BUILD__='V125';
})();


;
/* RH V264 - preserved script #32 */
window.__ICHEF_RH_BUILD__='RH-V127-IA-COMPACT';
console.info('[iCHEF RH V127] proposition IA compactée');


;
/* RH V264 - preserved script #33 */
(() => {
  'use strict';
  function installV128(){
    const modal=document.getElementById('ia-predictions-modal');
    const period=document.getElementById('v124-bar');
    const generate=document.getElementById('assistant-generate-btn');
    const apply=document.getElementById('assistant-apply-btn');
    if(!modal || !period || !generate || !apply) return false;
    let row=document.getElementById('v128-period-actions-row');
    let actions=document.querySelector('#v128-period-actions-row .v128-main-actions');
    if(!row){
      row=document.createElement('div');
      row.id='v128-period-actions-row';
      actions=document.createElement('div');
      actions.className='v128-main-actions';
      period.insertAdjacentElement('beforebegin',row);
      row.appendChild(period);
      row.appendChild(actions);
    }
    if(!actions){
      actions=document.createElement('div');
      actions.className='v128-main-actions';
      row.appendChild(actions);
    }
    const oldGenerateHost=generate.parentElement;
    const oldApplyHost=apply.parentElement;
    if(generate.parentElement!==actions) actions.appendChild(generate);
    if(apply.parentElement!==actions) actions.appendChild(apply);
    oldGenerateHost?.classList?.add('v128-old-actions-host');
    oldApplyHost?.classList?.add('v128-old-actions-host');
    modal.dataset.v128='1';
    return true;
  }
  function bootV128(){
    if(installV128()) return;
    const modal=document.getElementById('ia-predictions-modal');
    if(!modal) return;
    const observer=new MutationObserver(()=>{
      if(installV128()) observer.disconnect();
    });
    observer.observe(modal,{
      childList:true,
      subtree:true
    });
  }
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',bootV128,{once:true});
  }else{
    bootV128();
  }
  window.__ICHEF_RH_PERIOD_ACTIONS_BUILD__='V128';
})();


;
/* RH V264 - preserved script #34 */
window.__ICHEF_RH_BUILD__='RH-V128-PERIOD-ACTIONS-TOGETHER';
console.info('[iCHEF RH V128] période + générer + appliquer sur la même ligne');


;
/* RH V264 - preserved script #35 */
(() => {
  'use strict';
  function installV129(){
    const modal=document.getElementById('ia-predictions-modal');
    const flow=modal?.querySelector('.v113-flow');
    if(!modal || !flow) return false;
    if(document.getElementById('v129-planning-info-btn')) return true;
    const anchor=document.createElement('div');
    anchor.className='v129-info-anchor';
    const btn=document.createElement('button');
    btn.id='v129-planning-info-btn';
    btn.type='button';
    btn.setAttribute('aria-label','Informations sur les étapes du planning IA');
    btn.setAttribute('aria-expanded','false');
    btn.textContent='i';
    const pop=document.createElement('div');
    pop.id='v129-planning-info-pop';
    pop.setAttribute('role','dialog');
    pop.setAttribute('aria-label','Étapes du planning IA');
    pop.innerHTML=`
      <div class="v129-info-title">
        <strong>PARCOURS DU PLANNING IA</strong>
        <button class="v129-info-close" type="button" aria-label="Fermer">×</button>
      </div>
      <div class="v129-info-grid">
        <div class="v129-info-step is-gold">
          <b>1 · ANALYSER</b>
          <small>Activité et contraintes</small>
        </div>
        <div class="v129-info-step">
          <b>2 · PLANNING IA</b>
          <small>Horaires + OFF proposés</small>
        </div>
        <div class="v129-info-step">
          <b>3 · VÉRIFIER</b>
          <small>Alertes et couverture</small>
        </div>
        <div class="v129-info-step">
          <b>4 · VALIDER</b>
          <small>Appliquer au planning officiel</small>
        </div>
      </div>`;
    anchor.appendChild(btn);
    flow.insertAdjacentElement('beforebegin',anchor);
    document.body.appendChild(pop);
    function positionPop(){
      if(!pop.classList.contains('show')) return;
      const r=btn.getBoundingClientRect();
      const w=pop.offsetWidth || 420;
      const h=pop.offsetHeight || 210;
      const gap=8;
      let left=r.right-w;
      let top=r.bottom+gap;
      left=Math.max(8,Math.min(left,window.innerWidth-w-8));
      if(top+h>window.innerHeight-8){
        top=Math.max(8,r.top-h-gap);
      }
      pop.style.left=`${left}px`;
      pop.style.top=`${top}px`;
    }
    function open(){
      pop.classList.add('show');
      btn.setAttribute('aria-expanded','true');
      requestAnimationFrame(positionPop);
    }
    function close(){
      pop.classList.remove('show');
      btn.setAttribute('aria-expanded','false');
    }
    btn.addEventListener('click',event=>{
      event.preventDefault();
      event.stopPropagation();
      pop.classList.contains('show') ? close() : open();
    });
    pop.querySelector('.v129-info-close')?.addEventListener('click',close);
    document.addEventListener('click',event=>{
      if(!pop.classList.contains('show')) return;
      if(pop.contains(event.target) || btn.contains(event.target)) return;
      close();
    });
    document.addEventListener('keydown',event=>{
      if(event.key==='Escape') close();
    });
    window.addEventListener('resize',positionPop);
    window.addEventListener('scroll',positionPop,true);
    modal.dataset.v129='1';
    return true;
  }
  function bootV129(){
    if(installV129()) return;
    const modal=document.getElementById('ia-predictions-modal');
    if(!modal) return;
    const observer=new MutationObserver(()=>{
      if(installV129()) observer.disconnect();
    });
    observer.observe(modal,{childList:true,subtree:true});
  }
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',bootV129,{once:true});
  }else{
    bootV129();
  }
  window.__ICHEF_RH_FLOW_INFO_BUILD__='V129';
})();


;
/* RH V264 - preserved script #36 */
window.__ICHEF_RH_BUILD__='RH-V129-FLOW-IN-INFO';
console.info('[iCHEF RH V129] étapes IA déplacées dans le bouton info');


;
/* RH V264 - preserved script #37 */
window.__ICHEF_RH_BUILD__='RH-V130-HOURS-ON-STAFF';
console.info('[iCHEF RH V130] heures restantes affichées sur chaque collaborateur · clic = détail');


;
/* RH V264 - preserved script #38 */
(() => {
  'use strict';
  function findBlockByTitle(root, text){
    const candidates=[...root.querySelectorAll('div')];
    const title=candidates.find(el =>
      el.children.length===0 &&
      String(el.textContent||'').trim().toUpperCase()===text
    );
    return title?.parentElement || null;
  }
  function installV131(){
    const modal=document.getElementById('ia-predictions-modal');
    if(!modal || document.getElementById('v131-planning-tools-btn')) return !!modal;
    const balance=findBlockByTitle(modal,'ÉQUILIBRE DES CONTRATS');
    const settingsTitle=[...modal.querySelectorAll('.rh-section-title')]
      .find(el => String(el.textContent||'').trim().toUpperCase()==='PARAMÈTRES DE PLANIFICATION');
    const settings=settingsTitle?.closest('.rh-section');
    if(!balance || !settings) return false;
    const parent=balance.parentElement;
    if(!parent || settings.parentElement!==parent) return false;
    const button=document.createElement('button');
    button.id='v131-planning-tools-btn';
    button.type='button';
    button.innerHTML=`
      <span class="v131-tools-left">
        <span class="v131-tools-icon">⚙</span>
        <span class="v131-tools-copy">
          <strong>ÉQUILIBRE & PARAMÈTRES DE PLANIFICATION</strong>
          <small>Contrats · ratios · horaires · priorité IA · publication · relève automatique</small>
        </span>
      </span>
      <span class="v131-tools-arrow">›</span>
    `;
    const overlay=document.createElement('div');
    overlay.id='v131-planning-tools-overlay';
    overlay.innerHTML=`
      <div id="v131-planning-tools-panel" role="dialog" aria-modal="true" aria-label="Équilibre et paramètres de planification">
        <div class="v131-tools-head">
          <div>
            <strong>ÉQUILIBRE & PARAMÈTRES DE PLANIFICATION</strong>
            <small>Réglages du moteur de planning iCHEF</small>
          </div>
          <button id="v131-planning-tools-close" type="button" aria-label="Fermer">×</button>
        </div>
        <div id="v131-planning-tools-content"></div>
      </div>
    `;
    parent.insertBefore(button,balance);
    modal.appendChild(overlay);
    const content=overlay.querySelector('#v131-planning-tools-content');
    balance.classList.add('v131-balance-box');
    content.appendChild(balance);
    content.appendChild(settings);
    function open(){
      overlay.classList.add('show');
      button.setAttribute('aria-expanded','true');
      requestAnimationFrame(()=>{
        overlay.querySelector('#v131-planning-tools-panel')?.scrollTo?.({top:0});
      });
    }
    function close(){
      overlay.classList.remove('show');
      button.setAttribute('aria-expanded','false');
    }
    button.setAttribute('aria-expanded','false');
    button.addEventListener('click',open);
    overlay.querySelector('#v131-planning-tools-close')?.addEventListener('click',close);
    overlay.addEventListener('click',event=>{
      if(event.target===overlay) close();
    });
    document.addEventListener('keydown',event=>{
      if(event.key==='Escape' && overlay.classList.contains('show')) close();
    });
    modal.dataset.v131='1';
    return true;
  }
  function boot(){
    if(installV131()) return;
    const modal=document.getElementById('ia-predictions-modal');
    if(!modal) return;
    const observer=new MutationObserver(()=>{
      if(installV131()) observer.disconnect();
    });
    observer.observe(modal,{childList:true,subtree:true});
  }
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',boot,{once:true});
  }else{
    boot();
  }
  window.__ICHEF_RH_SETTINGS_BUTTON_BUILD__='V131';
})();


;
/* RH V264 - preserved script #39 */
window.__ICHEF_RH_BUILD__='RH-V131-SETTINGS-BUTTON';
console.info('[iCHEF RH V131] équilibre + paramètres déplacés dans un bouton compact');


;
/* RH V264 - preserved script #40 */
(() => {
  'use strict';
  const DAY_NAMES=['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];
  function seasonForMonth(month){
    const m=Number(month);
    if([12,1,2].includes(m)) return 'HIVER';
    if([3,4,5].includes(m)) return 'PRINTEMPS';
    if([6,7,8].includes(m)) return 'ÉTÉ';
    return 'AUTOMNE';
  }
  function readLiveSettings(){
    const saved=typeof getRhSettings==='function' ? getRhSettings() : {};
    const readCheck=(id,fallback)=>{
      const el=document.getElementById(id);
      return el ? el.checked===true : fallback;
    };
    return {
      ...saved,
      serviceContinuousEnabled:
        readCheck('rh-setting-service-continuous',saved.serviceContinuousEnabled!==false),
      serviceSplitEnabled:
        readCheck('rh-setting-service-split',saved.serviceSplitEnabled!==false),
      optimizeStaffChoice:
        readCheck('rh-setting-optimize-staff',saved.optimizeStaffChoice!==false),
      managerServiceAdvisorEnabled:
        readCheck('rh-setting-manager-advisor',saved.managerServiceAdvisorEnabled!==false)
    };
  }
  function modeForDemand(row,settings){
    if(row?.closed===true) return 'FERMÉ';
    const continu=settings.serviceContinuousEnabled!==false;
    const split=settings.serviceSplitEnabled!==false;
    if(continu && !split) return 'CONTINU';
    if(!continu && split) return 'COUPÉ';
    if(!continu && !split) return 'À CONFIGURER';
    const score=Number(row?.score||1);
    const covers=Number(row?.covers||0);
    const coversThreshold=Math.max(20,Number(settings.planningPeakMinCovers||40));
    return (score>=1.18 || covers>=coversThreshold)
      ? 'CONTINU'
      : 'COUPÉ';
  }
  function estimatedStaff(row,settings){
    if(row?.closed===true) return 0;
    if(typeof getDir!=='function') return 0;
    const staff=getDir().filter(s=>s.active!==false);
    if(!staff.length) return 0;
    const departments=
      typeof assistantPlanningDepartmentsV169==='function'
        ? assistantPlanningDepartmentsV169(settings,staff)
        : ['salle','cuisine','bar','patisserie'];
    let total=0;
    departments.forEach(dept=>{
      const eligible=staff.filter(s=>
        typeof assistantStaffCanCoverDept==='function'
          ? assistantStaffCanCoverDept(s,dept)
          : String(s.dept||'')===dept
      );
      if(!eligible.length) return;
      if(typeof assistantRequiredCount==='function'){
        total+=Number(
          assistantRequiredCount(
            dept,
            row,
            settings,
            eligible.length
          ) || 0
        );
      }else{
        total+=1;
      }
    });
    return Math.max(1,Math.min(staff.length,total));
  }
  function staffProfileAdvice(row,settings){
    if(row?.closed===true) return 'Établissement fermé';
    if(settings.optimizeStaffChoice===false){
      return 'Choix manuel';
    }
    const score=Number(row?.score||1);
    if(score>=1.35 || row?.isPeak===true){
      return 'Référents + polyvalents';
    }
    if(score<=0.95){
      return 'Équipe resserrée + polyvalente';
    }
    return 'Équipe équilibrée';
  }
  window.refreshRhServiceStrategyAdvice=function(forcedSettings){
    const box=document.getElementById('v132-manager-advice');
    const summary=document.getElementById('v132-advice-summary');
    const weekdays=document.getElementById('v132-advice-weekdays');
    const basis=document.getElementById('v132-advice-basis');
    if(!box || !summary || !weekdays) return;
    const settings=forcedSettings || readLiveSettings();
    if(settings.managerServiceAdvisorEnabled===false){
      box.style.display='none';
      return;
    }
    box.style.display='block';
    const monthStr=
      typeof getPlanningAssistantMonth==='function'
        ? getPlanningAssistantMonth()
        : new Date().toISOString().slice(0,7);
    const [year,month]=String(monthStr).split('-').map(Number);
    const season=seasonForMonth(month);
    let demand={};
    if(typeof buildAssistantDemand==='function'){
      try{
        demand=buildAssistantDemand(
          monthStr,
          typeof planningAssistantPrediction!=='undefined'
            ? planningAssistantPrediction
            : null,
          settings
        ) || {};
      }catch(error){
        console.warn('[iCHEF RH V132] conseil demande',error);
      }
    }
    if(!Object.keys(demand).length){
      const days=new Date(year,month,0).getDate();
      for(let day=1;day<=days;day++){
        const dow=new Date(year,month-1,day).getDay();
        demand[day]={
          day,
          score:(dow===5||dow===6)?1.22:1,
          covers:0,
          isPeak:false,
          reason:'Base calendrier'
        };
      }
    }
    const groups=Array.from({length:7},()=>[]);
    Object.values(demand).forEach(row=>{
      const day=Number(row?.day||0);
      if(!day) return;
      const dow=new Date(year,month-1,day).getDay();
      groups[dow].push(row);
    });
    const aggregates=groups.map((rows,dow)=>{
      const n=Math.max(1,rows.length);
      const score=rows.reduce((s,r)=>s+Number(r.score||1),0)/n;
      const covers=rows.reduce((s,r)=>s+Number(r.covers||0),0)/n;
      const peaks=rows.filter(r=>r.isPeak===true||Number(r.score||0)>=1.5).length;
      const representative={
        score,
        covers,
        isPeak:peaks>0
      };
      return {
        dow,
        score,
        covers,
        peaks,
        mode:modeForDemand(representative,settings),
        staff:estimatedStaff(representative,settings),
        profile:staffProfileAdvice(representative,settings)
      };
    });
    const rows=Object.values(demand);
    const avgScore=rows.length
      ? rows.reduce((s,r)=>s+Number(r.score||1),0)/rows.length
      : 1;
    const peakCount=rows.filter(r=>r.isPeak===true||Number(r.score||0)>=1.5).length;
    const continuDays=aggregates.filter(x=>x.mode==='CONTINU').length;
    const splitDays=aggregates.filter(x=>x.mode==='COUPÉ').length;
    let globalMode='MIXTE';
    if(!settings.serviceContinuousEnabled && !settings.serviceSplitEnabled){
      globalMode='À CONFIGURER';
    }else if(settings.serviceContinuousEnabled && !settings.serviceSplitEnabled){
      globalMode='CONTINU';
    }else if(!settings.serviceContinuousEnabled && settings.serviceSplitEnabled){
      globalMode='COUPÉ';
    }else if(continuDays>=5){
      globalMode='PLUTÔT CONTINU';
    }else if(splitDays>=5){
      globalMode='PLUTÔT COUPÉ';
    }
    const hasPrediction=
      typeof planningAssistantPrediction!=='undefined' &&
      planningAssistantPrediction;
    if(basis){
      basis.textContent=hasPrediction
        ? `Saison ${season.toLowerCase()} · réservations / affluence / Anti-Rush / contraintes RH disponibles`
        : `Saison ${season.toLowerCase()} · conseil provisoire : données prédictives encore limitées`;
    }
    summary.innerHTML=`
      <div class="v132-advice-kpi">
        <small>STRATÉGIE DU MOIS</small>
        <strong>${escapeRhHtml(globalMode)}</strong>
      </div>
      <div class="v132-advice-kpi">
        <small>SAISON</small>
        <strong>${escapeRhHtml(season)}</strong>
      </div>
      <div class="v132-advice-kpi">
        <small>JOURS FORTS DÉTECTÉS</small>
        <strong>${peakCount}</strong>
      </div>
      <div class="v132-advice-kpi">
        <small>OBJECTIF</small>
        <strong>${settings.optimizeStaffChoice===false?'COUVERTURE':'CA + EFFICACITÉ STAFF'}</strong>
      </div>
    `;
    const order=[1,2,3,4,5,6,0];
    weekdays.innerHTML=order.map(dow=>{
      const row=aggregates[dow];
      const cls=row.mode==='CONTINU'?'is-continu':'';
      const demandLabel=
        row.score>=1.35?'forte':
        row.score<=0.95?'calme':
        'normale';
      return `
        <div class="v132-day-advice ${cls}">
          <b>${DAY_NAMES[dow]}</b>
          <span>${escapeRhHtml(row.mode)}</span>
          <small>${escapeRhHtml(demandLabel)} · ~${Number(row.staff||0)} staff</small>
          <small>${escapeRhHtml(row.profile)}</small>
        </div>
      `;
    }).join('');
  };
  function bind(){
    const ids=[
      'rh-setting-service-continuous',
      'rh-setting-service-split',
      'rh-setting-optimize-staff',
      'rh-setting-manager-advisor'
    ];
    ids.forEach(id=>{
      document.getElementById(id)?.addEventListener('change',()=>{
        refreshRhServiceStrategyAdvice();
      });
    });
    document.getElementById('v132-refresh-advice')?.addEventListener('click',()=>{
      refreshRhServiceStrategyAdvice();
    });
    document.getElementById('month-picker')?.addEventListener('change',()=>{
      requestAnimationFrame(()=>refreshRhServiceStrategyAdvice());
    });
    const originalGenerate=window.generateIAPrediction;
    if(typeof originalGenerate==='function' && !originalGenerate.__v132Wrapped){
      const wrapped=async function(...args){
        const result=await originalGenerate.apply(this,args);
        requestAnimationFrame(()=>refreshRhServiceStrategyAdvice());
        return result;
      };
      wrapped.__v132Wrapped=true;
      window.generateIAPrediction=wrapped;
    }
    const overlay=document.getElementById('v131-planning-tools-overlay');
    if(overlay){
      new MutationObserver(()=>{
        if(overlay.classList.contains('show')){
          requestAnimationFrame(()=>refreshRhServiceStrategyAdvice());
        }
      }).observe(overlay,{attributes:true,attributeFilter:['class']});
    }
    refreshRhServiceStrategyAdvice();
  }
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',bind,{once:true});
  }else{
    bind();
  }
  window.__ICHEF_RH_SERVICE_STRATEGY_BUILD__='V132';
})();


;
/* RH V264 - preserved script #41 */
window.__ICHEF_RH_BUILD__='RH-V132-SERVICE-STRATEGY';
console.info('[iCHEF RH V132] continu/coupé + optimisation staff + conseil manager');


;
/* RH V264 - preserved script #42 */
(() => {
  'use strict';
  function bindV133(){
    [
      'rh-setting-kitchen-critical',
      'rh-setting-kitchen-min'
    ].forEach(id => {
      document.getElementById(id)?.addEventListener('change', () => {
        if (typeof refreshRhServiceStrategyAdvice === 'function') {
          refreshRhServiceStrategyAdvice();
        }
      });
    });
  }
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',bindV133,{once:true});
  }else{
    bindV133();
  }
  window.__ICHEF_RH_CRITICAL_KITCHEN_BUILD__='V133';
})();


;
/* RH V264 - preserved script #43 */
window.__ICHEF_RH_BUILD__='RH-V133-CRITICAL-KITCHEN-COVERAGE';
console.info('[iCHEF RH V133] couverture cuisine critique + blocage validation');


;
/* RH V264 - preserved script #44 */

(() => {
  'use strict';
  const SETTINGS_KEY='ichef_rh_last_minute_settings';
  const EVENTS_KEY='ichef_rh_last_minute_events';
  let currentAnalysis=null;
  let selectedCandidateId='';
  function cfg(){
    let saved={};
    try{saved=JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}')||{}}catch(_){}
    return {
      enabled:saved.enabled!==false,
      detectLate:saved.detectLate!==false,
      lateMinutes:Math.max(1,Number(saved.lateMinutes)||10),
      noShowMinutes:Math.max(5,Number(saved.noShowMinutes)||20),
      maxSuggestions:Math.max(1,Math.min(10,Number(saved.maxSuggestions)||5)),
      managerValidation:true
    };
  }
  function saveCfg(next){
    const clean={...cfg(),...(next||{})};
    localStorage.setItem(SETTINGS_KEY,JSON.stringify(clean));
    try{API?.update?.('RH_LAST_MINUTE_SETTINGS',clean)}catch(_){}
    return clean;
  }
  function events(){
    try{
      const v=JSON.parse(localStorage.getItem(EVENTS_KEY)||'[]');
      return Array.isArray(v)?v:[];
    }catch(_){return []}
  }
  function saveEvents(list){
    const safe=Array.isArray(list)?list.slice(-500):[];
    localStorage.setItem(EVENTS_KEY,JSON.stringify(safe));
    try{API?.update?.('RH_LAST_MINUTE_EVENTS',safe)}catch(_){}
  }
  function esc(v){
    return typeof escapeRhHtml==='function'
      ? escapeRhHtml(String(v??''))
      : String(v??'').replace(/[&<>"']/g,c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;' }[c]));
  }
  function localDateKey(d=new Date()){
    const y=d.getFullYear();
    const m=String(d.getMonth()+1).padStart(2,'0');
    const day=String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${day}`;
  }
  function monthKey(dateStr){
    return String(dateStr||'').slice(0,7);
  }
  function dayNum(dateStr){
    return Number(String(dateStr||'').slice(8,10));
  }
  function getDayPlan(staffId,dateStr){
    const ts=typeof getTs==='function'?getTs():{};
    const month=monthKey(dateStr);
    const day=dayNum(dateStr);
    return ts?.[month]?.[staffId]?.[day] ||
           ts?.[month]?.[String(staffId)]?.[day] ||
           null;
  }
  function parseStart(range){
    const s=String(range||'').split('-')[0];
    const m=s.match(/^(\d{1,2}):(\d{2})$/);
    if(!m)return null;
    return Number(m[1])*60+Number(m[2]);
  }
  function parseEnd(range){
    const s=String(range||'').split('-')[1];
    const m=s?.match(/^(\d{1,2}):(\d{2})$/);
    if(!m)return null;
    return Number(m[1])*60+Number(m[2]);
  }
  function punchType(p){
    const t=String(p?.type||'').toUpperCase();
    if(t.includes('IN')||t.includes('ENTR'))return 'IN';
    if(t.includes('OUT')||t.includes('SORT'))return 'OUT';
    return t;
  }
  function punchDate(p){
    const ts=Number(p?.timestamp||p?.clientTimestamp||0);
    return ts?localDateKey(new Date(ts)):'';
  }
  function firstEntryFor(staffId,dateStr){
    const list=(typeof getPunches==='function'?getPunches():[])
      .filter(p=>String(p?.staffId)===String(staffId))
      .filter(p=>punchDate(p)===dateStr)
      .filter(p=>punchType(p)==='IN')
      .sort((a,b)=>Number(a.timestamp||a.clientTimestamp||0)-Number(b.timestamp||b.clientTimestamp||0));
    return list[0]||null;
  }
  function staffMonthlyHours(staffId,month){
    const node=(typeof getTs==='function'?getTs():{})?.[month]?.[staffId] ||
               (typeof getTs==='function'?getTs():{})?.[month]?.[String(staffId)] ||
               {};
    return Object.values(node||{}).reduce((sum,p)=>sum+(typeof calculateNet==='function'?Number(calculateNet(p)||0):0),0);
  }
  function staffMonthlyTarget(staff){
    const weekly=Math.max(0,Number(staff?.contract)||0);
    return weekly*52/12;
  }
  function activeNow(staffId,dateStr){
    const entries=(typeof getPunches==='function'?getPunches():[])
      .filter(p=>String(p?.staffId)===String(staffId))
      .filter(p=>punchDate(p)===dateStr)
      .sort((a,b)=>Number(a.timestamp||a.clientTimestamp||0)-Number(b.timestamp||b.clientTimestamp||0));
    let open=false;
    entries.forEach(p=>{
      if(punchType(p)==='IN')open=true;
      if(punchType(p)==='OUT')open=false;
    });
    return open;
  }
  function serviceFromPlan(plan,requested){
    if(requested&&requested!=='auto')return requested;
    if(plan?.s1&&plan?.s2)return 'day';
    if(plan?.s1)return 'lunch';
    if(plan?.s2)return 'dinner';
    return 'day';
  }
  function workStatusForRemaining(plan){
    if(plan?.s1&&plan?.s2)return 'present';
    if(plan?.s1)return 'off_soir';
    if(plan?.s2)return 'off_matin';
    return 'off';
  }
  function detectRisks(){
    const c=cfg();
    if(!c.enabled||!c.detectLate)return [];
    const dateStr=localDateKey();
    const now=new Date();
    const nowMin=now.getHours()*60+now.getMinutes();
    const dir=(typeof getDir==='function'?getDir():[]).filter(s=>s.active!==false);
    const risks=[];
    dir.forEach(staff=>{
      const plan=getDayPlan(staff.id,dateStr);
      if(!plan || !(typeof isRhWorkStatus==='function'?isRhWorkStatus(plan.status):false))return;
      const starts=[parseStart(plan.s1),parseStart(plan.s2)].filter(Number.isFinite);
      const ends=[parseEnd(plan.s1),parseEnd(plan.s2)].filter(Number.isFinite);
      if(!starts.length)return;
      const start=Math.min(...starts);
      const end=ends.length?Math.max(...ends):start+480;
      const entry=firstEntryFor(staff.id,dateStr);
      if(entry){
        const dt=new Date(Number(entry.timestamp||entry.clientTimestamp||0));
        const entryMin=dt.getHours()*60+dt.getMinutes();
        const late=entryMin-start;
        if(late>=c.lateMinutes){
          risks.push({
            staffId:String(staff.id),
            type:'retard',
            delayMinutes:late,
            date:dateStr,
            service:'auto',
            label:`${staff.name} · retard ${late} min`,
            detail:'Détecté depuis le premier pointage du jour.'
          });
        }
      }else if(nowMin>=start+c.noShowMinutes && nowMin<=end+120){
        risks.push({
          staffId:String(staff.id),
          type:'no_show',
          delayMinutes:nowMin-start,
          date:dateStr,
          service:'auto',
          label:`${staff.name} · non pointé`,
          detail:`À vérifier · début prévu dépassé de ${Math.max(0,nowMin-start)} min.`
        });
      }
    });
    return risks;
  }
  function renderRiskList(){
    const list=document.getElementById('v134-risk-list');
    const badge=document.querySelector('#v134-emergency-btn .v134-alert-count');
    if(!list)return;
    const risks=detectRisks();
    if(badge)badge.textContent=String(risks.length);
    list.innerHTML=risks.length
      ? risks.map((r,i)=>`
          <div class="v134-risk" data-risk-index="${i}">
            <b>${esc(r.label)}</b>
            <span>${r.type==='retard'?'RETARD':'NON POINTÉ · À VÉRIFIER'}</span>
            <small>${esc(r.detail)}</small>
          </div>
        `).join('')
      : '<div style="color:#69747c;font-size:.55rem;padding:4px;">Aucun retard / non-pointé détecté sur les données disponibles.</div>';
    list.querySelectorAll('[data-risk-index]').forEach(el=>{
      el.addEventListener('click',()=>{
        const r=risks[Number(el.dataset.riskIndex)];
        if(!r)return;
        fillEvent(r);
        analyse();
      });
    });
  }
  function eligibleCandidate(candidate,affected,dept,dateStr,service){
    if(candidate.active===false)return false;
    if(String(candidate.id)===String(affected.id))return false;
    if(typeof assistantStaffCanCoverDept==='function' && !assistantStaffCanCoverDept(candidate,dept)){
      return false;
    }
    const month=monthKey(dateStr);
    const day=dayNum(dateStr);
    const dateObj=new Date(`${dateStr}T12:00:00`);
    const tsMonth=(typeof getTs==='function'?getTs():{})?.[month]||{};
    const p=tsMonth?.[candidate.id]?.[day]||tsMonth?.[String(candidate.id)]?.[day]||null;
    if(p && typeof isRhLeaveStatus==='function' && isRhLeaveStatus(p.status))return false;
    const services=service==='day'?['lunch','dinner']:[service];
    for(const srv of services){
      if(typeof assistantAvailabilityAllows==='function' && !assistantAvailabilityAllows(candidate,dateObj,srv)){
        return false;
      }
      if(typeof assistantRestAllows==='function' && !assistantRestAllows(tsMonth,candidate,day,srv,typeof getRhSettings==='function'?getRhSettings():{})){
        return false;
      }
      if(typeof assistantWeekQuotaAllows==='function' && !assistantWeekQuotaAllows(
        tsMonth,
        candidate.id,
        day,
        typeof getRhSettings==='function'?getRhSettings():{},
        dateObj.getFullYear(),
        dateObj.getMonth()+1,
        srv
      )){
        return false;
      }
    }
    return true;
  }
  function candidateScore(candidate,affected,dept,dateStr,service){
    let score=0;
    const month=monthKey(dateStr);
    const day=dayNum(dateStr);
    const p=getDayPlan(candidate.id,dateStr);
    const currentHours=staffMonthlyHours(candidate.id,month);
    const target=staffMonthlyTarget(candidate);
    const deficit=target-currentHours;
    if(String(candidate.dept||'').toLowerCase()===String(dept||'').toLowerCase())score+=70;
    if(typeof assistantSkillScore==='function'){
      score+=Number(assistantSkillScore(candidate)||0)*8;
    }
    const skillCount=Array.isArray(candidate.skills)?candidate.skills.filter(Boolean).length:0;
    score+=Math.min(6,skillCount)*4;
    if(deficit>0)score+=Math.min(50,(deficit/Math.max(1,target))*100);
    else score-=Math.min(35,Math.abs(deficit)*1.5);
    if(activeNow(candidate.id,dateStr))score+=22;
    if(!p || !(typeof isRhWorkStatus==='function'&&isRhWorkStatus(p.status))){
      score+=28;
    }else{
      const services=service==='day'?['lunch','dinner']:[service];
      const already=services.some(s=>typeof assistantDayWorksService==='function'&&assistantDayWorksService(p,s));
      if(already)score-=18;
      else score+=8;
    }
    const cost=Number(candidate.hourlyCost||0);
    score-=cost*0.08;
    return score;
  }
  function suggestionsFor(evt){
    const dir=(typeof getDir==='function'?getDir():[]);
    const affected=dir.find(s=>String(s.id)===String(evt.staffId));
    if(!affected)return {error:'Collaborateur introuvable.'};
    const plan=getDayPlan(affected.id,evt.date);
    const dept=String(plan?.poste||affected.dept||'salle').toLowerCase();
    const service=serviceFromPlan(plan,evt.service);
    const candidates=dir
      .filter(c=>eligibleCandidate(c,affected,dept,evt.date,service))
      .map(c=>({
        staff:c,
        score:candidateScore(c,affected,dept,evt.date,service),
        plan:getDayPlan(c.id,evt.date),
        active:activeNow(c.id,evt.date)
      }))
      .sort((a,b)=>b.score-a.score)
      .slice(0,cfg().maxSuggestions);
    const critical=
      dept==='cuisine' &&
      candidates.length===0;
    return {
      affected,
      plan,
      dept,
      service,
      candidates,
      critical
    };
  }
  function formEvent(){
    return {
      staffId:document.getElementById('v134-staff')?.value||'',
      type:document.getElementById('v134-type')?.value||'absence',
      date:document.getElementById('v134-date')?.value||localDateKey(),
      service:document.getElementById('v134-service')?.value||'auto',
      delayMinutes:Math.max(0,Number(document.getElementById('v134-delay')?.value)||0),
      note:String(document.getElementById('v134-note')?.value||'').trim()
    };
  }
  function fillEvent(evt){
    const set=(id,v)=>{const el=document.getElementById(id);if(el)el.value=v??''};
    set('v134-staff',evt.staffId);
    set('v134-type',evt.type);
    set('v134-date',evt.date||localDateKey());
    set('v134-service',evt.service||'auto');
    set('v134-delay',evt.delayMinutes||0);
    set('v134-note',evt.note||'');
  }
  function renderAnalysis(result,evt){
    const root=document.getElementById('v134-result');
    const apply=document.getElementById('v134-apply');
    if(!root)return;
    selectedCandidateId='';
    if(apply)apply.disabled=true;
    if(result.error){
      root.innerHTML=`<div class="v134-critical">${esc(result.error)}</div>`;
      return;
    }
    const typeLabel={
      retard:'RETARD',
      maladie:'MALADIE',
      no_show:'ABSENCE / NO-SHOW',
      accident:'ACCIDENT',
      urgence:'URGENCE PERSONNELLE',
      depart:'DÉPART / DÉMISSION',
      transport:'PROBLÈME DE TRANSPORT',
      autre:'AUTRE IMPRÉVU'
    }[evt.type]||String(evt.type).toUpperCase();
    const critical=result.critical
      ? `<div class="v134-critical">
           COUVERTURE CRITIQUE : aucun remplaçant qualifié n'est disponible pour ${esc(result.dept)}.
           ${result.dept==='cuisine'
             ? 'Si le service reste ouvert, la cuisine ne peut pas fonctionner correctement. Prévoir un remplaçant qualifié ou fermer / réduire le service concerné.'
             : 'Le manager doit réduire l’activité, déplacer une compétence ou fermer le service concerné.'}
         </div>`
      : '';
    root.innerHTML=`
      <div class="v134-result-summary">
        <strong>${esc(typeLabel)} · ${esc(result.affected.name)} · ${esc(result.dept.toUpperCase())}</strong>
        <p>
          Date : ${esc(evt.date)} · Service : ${esc(result.service.toUpperCase())}.
          ${evt.type==='retard'&&evt.delayMinutes?` Retard déclaré : ${evt.delayMinutes} min.`:''}
          iCHEF ne modifie rien tant que le manager n'a pas validé une action.
        </p>
      </div>
      ${critical}
      <div class="v134-candidates">
        ${result.candidates.length
          ? result.candidates.map(c=>`
              <div class="v134-candidate" data-candidate-id="${esc(c.staff.id)}">
                <b>${esc(c.staff.name)}</b>
                <span>${c.active?'DÉJÀ SUR SITE · ':''}${esc(String(c.staff.dept||''))}</span>
                <small>
                  Score remplacement ${Math.round(c.score)} ·
                  ${Number(staffMonthlyHours(c.staff.id,monthKey(evt.date))).toFixed(1)} h planifiées ce mois.
                </small>
              </div>
            `).join('')
          : '<div style="color:#7d8790;font-size:.56rem;padding:6px;">Aucun remplaçant compatible trouvé avec les contraintes disponibles.</div>'
        }
      </div>
      <div class="v134-log-note">
        Pour un retard, iCHEF propose un renfort sans supprimer le planning initial.
        Pour maladie / absence / accident, le service touché peut être transféré au remplaçant.
        Pour un départ immédiat, le collaborateur est retiré des futurs services après confirmation du manager.
      </div>
    `;
    root.querySelectorAll('[data-candidate-id]').forEach(el=>{
      el.addEventListener('click',()=>{
        root.querySelectorAll('.v134-candidate').forEach(x=>x.classList.remove('selected'));
        el.classList.add('selected');
        selectedCandidateId=el.dataset.candidateId||'';
        if(apply)apply.disabled=false;
      });
    });
    if(result.critical && apply){
      apply.disabled=true;
    }else if(evt.type==='depart' && !result.candidates.length && apply){
      // Le départ peut quand même être enregistré, même si le remplacement reste à résoudre.
      apply.disabled=false;
    }
  }
  function analyse(){
    const evt=formEvent();
    if(!evt.staffId)return;
    currentAnalysis={
      evt,
      result:suggestionsFor(evt)
    };
    renderAnalysis(currentAnalysis.result,evt);
  }
  function clearService(plan,service,statusWhenEmpty){
    if(!plan)return;
    if(service==='lunch'){
      plan.s1='';
    }else if(service==='dinner'){
      plan.s2='';
    }else{
      plan.s1='';
      plan.s2='';
    }
    if(plan.s1||plan.s2){
      plan.status=workStatusForRemaining(plan);
    }else{
      plan.status=statusWhenEmpty||'off';
      plan.pause=0;
    }
  }
  function ensureStaffDay(ts,staffId,dateStr){
    const month=monthKey(dateStr);
    const day=dayNum(dateStr);
    ts[month]=ts[month]||{};
    ts[month][staffId]=ts[month][staffId]||{};
    ts[month][staffId][day]=ts[month][staffId][day]||{
      status:'off',
      s1:'',
      s2:'',
      pause:0,
      poste:''
    };
    return ts[month][staffId][day];
  }
  function mappedStatus(type){
    return {
      maladie:'maladie',
      no_show:'absence_injustifiee',
      accident:'accident_travail',
      urgence:'absence_autorisee',
      transport:'absence_autorisee',
      autre:'absence_autorisee'
    }[type]||'absence_autorisee';
  }
  async function applyIncident(){
    if(!currentAnalysis)return;
    const {evt,result}=currentAnalysis;
    const staff=result.affected;
    if(!staff)return;
    if(result.critical && evt.type!=='depart'){
      alert(
        'Aucun remplacement qualifié disponible.\\n\\n' +
        'Le service ne doit pas être validé comme normalement ouvert sans couverture du poste critique.'
      );
      return;
    }
    const candidate=(typeof getDir==='function'?getDir():[])
      .find(s=>String(s.id)===String(selectedCandidateId));
    const ts=typeof getTs==='function'?getTs():{};
    const affectedPlan=ensureStaffDay(ts,String(staff.id),evt.date);
    const originalPlan=JSON.parse(JSON.stringify(affectedPlan||{}));
    const service=serviceFromPlan(affectedPlan,evt.service);
    const settings=typeof getRhSettings==='function'?getRhSettings():{};
    if(evt.type==='retard'){
      affectedPlan.obs=[
        affectedPlan.obs,
        `IMPRÉVU · retard ${evt.delayMinutes||0} min${evt.note?' · '+evt.note:''}`
      ].filter(Boolean).join(' · ');
      affectedPlan.lastMinuteEvent='retard';
      affectedPlan.lastMinuteDelay=evt.delayMinutes||0;
      if(candidate){
        const cp=ensureStaffDay(ts,String(candidate.id),evt.date);
        cp.managerNote=[
          cp.managerNote,
          `Renfort temporaire · retard de ${staff.name} · ${evt.delayMinutes||0} min`
        ].filter(Boolean).join(' · ');
        cp.tempCoverMinutes=Math.max(0,Number(evt.delayMinutes)||0);
        cp.tempCoverDept=result.dept;
      }
    }else if(evt.type==='depart'){
      const ok=confirm(
        `Confirmer le départ immédiat de ${staff.name} à compter du ${evt.date} ?\\n\\n` +
        `Ses futurs services planifiés seront retirés et devront être réattribués.`
      );
      if(!ok)return;
      const dir=getDir();
      const index=dir.findIndex(s=>String(s.id)===String(staff.id));
      if(index>=0){
        dir[index]={...dir[index],active:false,departureDate:evt.date,departureReason:'last_minute'};
        if(typeof saveDir==='function')saveDir(dir);
        try{await syncDirectoryMasterToCloud?.(dir)}catch(_){}
      }
      Object.entries(ts).forEach(([m,node])=>{
        if(m<monthKey(evt.date))return;
        const staffNode=node?.[staff.id]||node?.[String(staff.id)];
        if(!staffNode)return;
        Object.entries(staffNode).forEach(([dayKey,p])=>{
          const d=Number(dayKey);
          if(m===monthKey(evt.date) && d<dayNum(evt.date))return;
          if(p && typeof isRhWorkStatus==='function' && isRhWorkStatus(p.status)){
            staffNode[dayKey]={
              ...p,
              status:'off',
              s1:'',
              s2:'',
              pause:0,
              obs:[
                p.obs,
                'Départ collaborateur · replanification requise'
              ].filter(Boolean).join(' · ')
            };
          }
        });
      });
    }else{
      const status=mappedStatus(evt.type);
      clearService(affectedPlan,service,status);
      affectedPlan.obs=[
        affectedPlan.obs,
        `IMPRÉVU · ${evt.type}${evt.note?' · '+evt.note:''}`
      ].filter(Boolean).join(' · ');
      affectedPlan.lastMinuteEvent=evt.type;
      if(candidate){
        const cp=ensureStaffDay(ts,String(candidate.id),evt.date);
        const services=service==='day'
          ? [
              originalPlan.s1?'lunch':null,
              originalPlan.s2?'dinner':null
            ].filter(Boolean)
          : [service];
        services.forEach(srv=>{
          if(typeof assistantSetService==='function'){
            assistantSetService(
              cp,
              srv,
              result.dept,
              settings,
              `Remplacement dernière minute · ${staff.name} · ${evt.type}`
            );
          }
        });
        cp.managerNote=[
          cp.managerNote,
          `Remplace ${staff.name} · ${evt.type}`
        ].filter(Boolean).join(' · ');
      }
    }
    const saved=await saveTs(ts);
    const log={
      id:`LM-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      at:new Date().toISOString(),
      tenantID:typeof tenantID_JS!=='undefined'?tenantID_JS:'',
      staffId:String(staff.id),
      staffName:String(staff.name||''),
      type:evt.type,
      date:evt.date,
      service,
      delayMinutes:evt.delayMinutes||0,
      note:evt.note||'',
      replacementId:candidate?String(candidate.id):'',
      replacementName:candidate?String(candidate.name||''):'',
      dept:result.dept,
      saved:Boolean(saved)
    };
    const all=events();
    all.push(log);
    saveEvents(all);
    try{
      recordRhChange?.({
        type:'PLANNING_LAST_MINUTE_EVENT',
        source:'DIRECTION_URGENCE',
        staffId:String(staff.id),
        staffName:String(staff.name||''),
        date:evt.date,
        reason:evt.note||evt.type,
        message:
          `Imprévu dernière minute · ${evt.type} · ${staff.name}` +
          (candidate?` · remplacement ${candidate.name}`:'')
      });
    }catch(_){}
    try{
      loadMonthData?.();
      loadPublicPlanning?.();
    }catch(_){}
    if(evt.type==='depart' && typeof generateAutomaticPlanning==='function'){
      setTimeout(()=>{
        try{generateAutomaticPlanning()}catch(_){}
      },120);
    }
    alert(
      saved
        ? `Imprévu enregistré.${candidate?`\\nRemplacement proposé/appliqué : ${candidate.name}.`:''}`
        : `Imprévu enregistré localement, mais la synchronisation serveur doit être reprise.`
    );
    closeEmergency();
    refreshBadge();
  }
  function populateStaff(){
    const select=document.getElementById('v134-staff');
    if(!select)return;
    const dir=(typeof getDir==='function'?getDir():[]).filter(s=>s.active!==false);
    select.innerHTML=
      '<option value="">Choisir…</option>'+
      dir.map(s=>`<option value="${esc(s.id)}">${esc(s.name)} · ${esc(s.dept||'')}</option>`).join('');
  }
  function openEmergency(prefill){
    const overlay=document.getElementById('v134-emergency-overlay');
    if(!overlay)return;
    populateStaff();
    fillEvent(prefill||{
      date:localDateKey(),
      type:'maladie',
      service:'auto',
      delayMinutes:0
    });
    currentAnalysis=null;
    selectedCandidateId='';
    const result=document.getElementById('v134-result');
    if(result)result.innerHTML='';
    const apply=document.getElementById('v134-apply');
    if(apply)apply.disabled=true;
    renderRiskList();
    overlay.classList.add('show');
  }
  function closeEmergency(){
    document.getElementById('v134-emergency-overlay')?.classList.remove('show');
  }
  function refreshBadge(){
    const badge=document.querySelector('#v134-emergency-btn .v134-alert-count');
    if(badge)badge.textContent=String(detectRisks().length);
  }
  function installSettings(){
    const box=document.querySelector('#ia-predictions-modal .v132-service-mode-box');
    if(!box || document.getElementById('v134-emergency-settings'))return;
    const c=cfg();
    const node=document.createElement('div');
    node.id='v134-emergency-settings';
    node.className='v134-emergency-settings';
    node.innerHTML=`
      <div class="v134-emergency-settings-head">
        <div>
          <strong>IMPRÉVUS DE DERNIÈRE MINUTE</strong>
          <small>Retard, maladie, absence / no-show, accident, urgence, problème de transport ou départ immédiat. Aucune modification n'est appliquée sans validation manager.</small>
        </div>
        <span class="v132-ai-badge">TEMPS RÉEL</span>
      </div>

      <div class="v134-emergency-settings-grid">
        <label class="v134-setting-card v134-setting-check">
          <span>
            <strong>Gestion des imprévus</strong>
            <small>Recherche un remplacement ciblé sans refaire inutilement tout le mois.</small>
          </span>
          <input id="v134-setting-enabled" type="checkbox" ${c.enabled?'checked':''}>
        </label>

        <label class="v134-setting-card v134-setting-check">
          <span>
            <strong>Détecter retards / non-pointés</strong>
            <small>Utilise le planning et les pointages disponibles. Toujours « à vérifier » avant action.</small>
          </span>
          <input id="v134-setting-detect" type="checkbox" ${c.detectLate?'checked':''}>
        </label>

        <label class="v134-setting-card">
          <strong>Seuil retard</strong>
          <small>Alerte après X minutes.</small>
          <input id="v134-setting-late" type="number" min="1" max="180" value="${c.lateMinutes}">
        </label>

        <label class="v134-setting-card">
          <strong>Seuil non-pointé</strong>
          <small>Alerte « à vérifier » après X minutes.</small>
          <input id="v134-setting-noshow" type="number" min="5" max="240" value="${c.noShowMinutes}">
        </label>
      </div>
    `;
    box.appendChild(node);
    const persist=()=>{
      saveCfg({
        enabled:document.getElementById('v134-setting-enabled')?.checked!==false,
        detectLate:document.getElementById('v134-setting-detect')?.checked!==false,
        lateMinutes:Number(document.getElementById('v134-setting-late')?.value)||10,
        noShowMinutes:Number(document.getElementById('v134-setting-noshow')?.value)||20
      });
      refreshBadge();
    };
    node.querySelectorAll('input').forEach(el=>el.addEventListener('change',persist));
  }
  function installButton(){
    const base=document.getElementById('v131-planning-tools-btn');
    if(!base || document.getElementById('v134-emergency-btn'))return;
    const btn=document.createElement('button');
    btn.id='v134-emergency-btn';
    btn.type='button';
    btn.innerHTML=`
      <span>
        <strong>⚠ IMPRÉVU DERNIÈRE MINUTE</strong>
        <small>Retard · maladie · absence · accident · urgence · transport · départ / démission</small>
      </span>
      <span class="v134-alert-count">0</span>
    `;
    base.insertAdjacentElement('afterend',btn);
    btn.addEventListener('click',()=>openEmergency());
    refreshBadge();
  }
  function installOverlay(){
    if(document.getElementById('v134-emergency-overlay'))return;
    const overlay=document.createElement('div');
    overlay.id='v134-emergency-overlay';
    overlay.innerHTML=`
      <div id="v134-emergency-panel" role="dialog" aria-modal="true" aria-label="Gestion des imprévus RH">
        <div id="v134-emergency-head">
          <div>
            <strong>IMPRÉVU DE DERNIÈRE MINUTE</strong>
            <small>Analyse ciblée · remplacement compatible · validation manager obligatoire</small>
          </div>
          <button id="v134-emergency-close" type="button">×</button>
        </div>

        <div id="v134-emergency-body">
          <div class="v134-risks">
            <div class="v134-risks-head">
              <strong>ALERTES À VÉRIFIER AUJOURD'HUI</strong>
              <button id="v134-refresh-risks" type="button">ACTUALISER</button>
            </div>
            <div id="v134-risk-list"></div>
          </div>

          <div class="v134-form-grid">
            <div class="v134-field">
              <label>Collaborateur</label>
              <select id="v134-staff"></select>
            </div>

            <div class="v134-field">
              <label>Imprévu</label>
              <select id="v134-type">
                <option value="retard">Retard</option>
                <option value="maladie">Maladie</option>
                <option value="no_show">Absence / no-show</option>
                <option value="accident">Accident</option>
                <option value="urgence">Urgence personnelle</option>
                <option value="transport">Problème de transport</option>
                <option value="depart">Départ / démission immédiate</option>
                <option value="autre">Autre imprévu</option>
              </select>
            </div>

            <div class="v134-field">
              <label>Date</label>
              <input id="v134-date" type="date">
            </div>

            <div class="v134-field">
              <label>Service touché</label>
              <select id="v134-service">
                <option value="auto">Détecter depuis le planning</option>
                <option value="lunch">Midi</option>
                <option value="dinner">Soir</option>
                <option value="day">Journée / tous les services</option>
              </select>
            </div>

            <div class="v134-field">
              <label>Retard estimé · minutes</label>
              <input id="v134-delay" type="number" min="0" max="720" value="0">
            </div>

            <div class="v134-field full">
              <label>Note manager</label>
              <textarea id="v134-note" placeholder="Ex. appel à 09:42, malade aujourd'hui, train supprimé, départ immédiat…"></textarea>
            </div>
          </div>

          <div class="v134-analyse-row">
            <button id="v134-analyse" type="button">ANALYSER & TROUVER UN REMPLAÇANT</button>
            <button id="v134-apply" type="button" disabled>VALIDER L'ACTION</button>
          </div>

          <div id="v134-result"></div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    document.getElementById('v134-emergency-close')?.addEventListener('click',closeEmergency);
    document.getElementById('v134-refresh-risks')?.addEventListener('click',renderRiskList);
    document.getElementById('v134-analyse')?.addEventListener('click',analyse);
    document.getElementById('v134-apply')?.addEventListener('click',applyIncident);
    overlay.addEventListener('click',e=>{
      if(e.target===overlay)closeEmergency();
    });
    document.addEventListener('keydown',e=>{
      if(e.key==='Escape'&&overlay.classList.contains('show'))closeEmergency();
    });
  }
  function boot(){
    installOverlay();
    let attempts=0;
    const timer=setInterval(()=>{
      attempts++;
      installSettings();
      installButton();
      if(
        document.getElementById('v134-emergency-settings') &&
        document.getElementById('v134-emergency-btn')
      ){
        clearInterval(timer);
      }
      if(attempts>30)clearInterval(timer);
    },250);
    // Surveillance légère : uniquement des alertes, jamais une modification automatique.
    setInterval(()=>{
      if(cfg().enabled && cfg().detectLate)refreshBadge();
    },120000);
  }
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',boot,{once:true});
  }else{
    boot();
  }
  window.openRhLastMinuteIncident=openEmergency;
  window.refreshRhLastMinuteRisks=renderRiskList;
  window.__ICHEF_RH_LAST_MINUTE_BUILD__='V134';
})();




;
/* RH V264 - preserved script #45 */
window.__ICHEF_RH_BUILD__='RH-V134-LAST-MINUTE-INCIDENTS';
console.info('[iCHEF RH V134] retards / maladies / absences / accidents / départs + remplacement ciblé');


;
/* RH V264 - preserved script #46 */
(() => {
  'use strict';
  function refreshClosureUi(){
    if(typeof refreshRhServiceStrategyAdvice==='function'){
      refreshRhServiceStrategyAdvice();
    }
  }
  function bind(){
    document
      .querySelectorAll('[data-v135-closed-weekday]')
      .forEach(input => {
        input.addEventListener('change', refreshClosureUi);
      });
    document
      .getElementById('rh-setting-exceptional-closures')
      ?.addEventListener('change', refreshClosureUi);
  }
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',bind,{once:true});
  }else{
    bind();
  }
  window.__ICHEF_RH_CLOSURE_BUILD__='V135';
})();


;
/* RH V264 - preserved script #47 */
window.__ICHEF_RH_BUILD__='RH-V135-RESTAURANT-CLOSURES';
console.info('[iCHEF RH V135] jours fermeture = 0 service / 0 staff');


;
/* RH V264 - preserved script #48 */
window.__ICHEF_RH_BUILD__='RH-V136-CLOSURE-HARD-GUARD';
console.info('[iCHEF RH V136] fermeture établissement forcée après génération + cuisine ignore les jours fermés');


;
/* RH V264 - preserved script #49 */
(() => {
  'use strict';
  function dateFr(d){
    return [
      String(d.getDate()).padStart(2,'0'),
      String(d.getMonth()+1).padStart(2,'0'),
      d.getFullYear()
    ].join('/');
  }
  function sync(){
    const preview =
      document.getElementById(
        'ia-planning-preview'
      );
    if(!preview) return;
    let note =
      document.getElementById(
        'v137-horizon-note'
      );
    if(!note){
      note =
        document.createElement('div');
      note.id =
        'v137-horizon-note';
      note.className =
        'v137-horizon-note';
      preview.insertAdjacentElement(
        'beforebegin',
        note
      );
    }
    const now = new Date();
    const currentMonth =
      `${now.getFullYear()}-${String(
        now.getMonth()+1
      ).padStart(2,'0')}`;
    const selected =
      typeof getPlanningAssistantMonth ===
        'function'
        ? String(
            getPlanningAssistantMonth() ||
            ''
          )
        : currentMonth;
    let desiredHtml='';
    if(selected === currentMonth){
      desiredHtml =
        `<strong>MISE À JOUR À PARTIR D'AUJOURD'HUI · ${dateFr(now)}</strong>` +
        ` · les jours précédents restent figés dans l'historique.`;
    }else if(selected > currentMonth){
      desiredHtml =
        `<strong>MOIS FUTUR</strong>` +
        ` · génération à partir du 1er jour du mois.`;
    }else{
      desiredHtml =
        `<strong>HISTORIQUE</strong>` +
        ` · ce mois n'est pas recalculé.`;
    }
    if(note.innerHTML !== desiredHtml){
      note.innerHTML = desiredHtml;
    }
  }
  function boot(){
    sync();
    /* V140 :
       IMPORTANT — ne plus observer toute la modale.
       L'ancienne version rappelait sync() après chaque mutation du planning,
       alors que sync() modifiait lui-même le DOM : cela pouvait créer une
       boucle de MutationObserver et bloquer complètement la page. */
    const monthPicker =
      document.getElementById('month-picker');
    monthPicker?.addEventListener(
      'change',
      () => requestAnimationFrame(sync)
    );
    const monthTitle =
      document.getElementById(
        'assistant-month-title'
      );
    if(monthTitle){
      new MutationObserver(() => {
        requestAnimationFrame(sync);
      }).observe(
        monthTitle,
        {
          childList:true,
          subtree:true,
          characterData:true
        }
      );
    }
    const originalOpen =
      window.openPlanningAssistant;
    if(
      typeof originalOpen === 'function' &&
      !originalOpen.__v140HorizonWrapped
    ){
      const wrappedOpen = function(...args){
        const result =
          originalOpen.apply(this,args);
        requestAnimationFrame(sync);
        return result;
      };
      wrappedOpen.__v140HorizonWrapped = true;
      window.openPlanningAssistant =
        wrappedOpen;
    }
  }
  if(
    document.readyState ===
    'loading'
  ){
    document.addEventListener(
      'DOMContentLoaded',
      boot,
      {once:true}
    );
  }else{
    boot();
  }
  window.__ICHEF_RH_TODAY_HORIZON_BUILD__ =
    'V137';
})();


;
/* RH V264 - preserved script #50 */
window.__ICHEF_RH_BUILD__='RH-V137-TODAY-HORIZON';
console.info('[iCHEF RH V137] faux FER corrigé · mise à jour aujourd’hui -> futur · passé figé');


;
/* RH V264 - preserved script #51 */

(() => {
  'use strict';
  const V138_MESSAGE_KEY='ichef_rh_staff_messages_archive';
  let v138StaffId='';
  let v138Category='ALL';
  let v138Rows=[];
  let v138Documents=[];
  function esc(v){
    return typeof escapeRhHtml==='function'
      ? escapeRhHtml(String(v??''))
      : String(v??'')
          .replace(/[&<>"']/g,c=>({
            '&':'&amp;','<':'&lt;','>':'&gt;',
            '"':'&quot;',"'":'&#39;'
          }[c]));
  }
  function dateMs(row){
    return Date.parse(
      String(
        row?.timestamp ||
        row?.at ||
        row?.createdAt ||
        row?.updatedAt ||
        row?.date ||
        0
      )
    ) || 0;
  }
  function fmtDate(v){
    const d=new Date(v);
    return Number.isFinite(d.getTime())
      ? d.toLocaleString('fr-FR')
      : String(v||'');
  }
  function getStaffAny(staffId){
    const current=(typeof getDir==='function'?getDir():[])
      .find(s=>String(s.id)===String(staffId));
    if(current) return current;
    const hist=
      (typeof getRhChangeHistory==='function'
        ? getRhChangeHistory()
        : [])
      .filter(r=>String(r.staffId||'')===String(staffId))
      .slice()
      .reverse();
    for(const row of hist){
      const snap=row?.after||row?.before;
      if(snap && String(snap.id||'')===String(staffId)){
        return snap;
      }
    }
    return {
      id:staffId,
      name:'Ancien collaborateur',
      role:'',
      dept:'',
      active:false
    };
  }
  function messageArchive(){
    try{
      const rows=JSON.parse(localStorage.getItem(V138_MESSAGE_KEY)||'[]');
      return Array.isArray(rows)?rows:[];
    }catch(_){
      return [];
    }
  }
  window.archiveRhStaffMessageV138=function(staffId,message,meta={}){
    const rows=messageArchive();
    const staff=getStaffAny(staffId);
    rows.push({
      id:`MSG-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      timestamp:new Date().toISOString(),
      staffId:String(staffId||''),
      staffName:String(staff?.name||meta.staffName||''),
      message:String(message||''),
      ...meta
    });
    localStorage.setItem(
      V138_MESSAGE_KEY,
      JSON.stringify(rows)
    );
    try{
      API.update(
        'RH_STAFF_MESSAGES_ARCHIVE',
        rows
      );
    }catch(_){}
    try{
      recordRhChange?.({
        staffId:String(staffId||''),
        staffName:String(staff?.name||''),
        type:'STAFF_MESSAGE',
        category:'MESSAGE',
        message:String(message||''),
        meta
      });
    }catch(_){}
  };
  window.buildRhStaffArchiveIndexV138=function(){
    const dir=
      typeof getDir==='function'
        ? getDir()
        : [];
    const history=
      typeof getRhChangeHistory==='function'
        ? getRhChangeHistory()
        : [];
    const ids=new Set();
    dir.forEach(s=>ids.add(String(s.id)));
    history.forEach(r=>{
      if(r?.staffId) ids.add(String(r.staffId));
    });
    const out={};
    ids.forEach(id=>{
      const staff=getStaffAny(id);
      out[id]={
        staffId:id,
        staffName:String(staff?.name||''),
        role:String(staff?.role||''),
        dept:String(staff?.dept||''),
        active:staff?.active!==false,
        historyCount:
          history.filter(r=>String(r.staffId||'')===id).length,
        updatedAt:new Date().toISOString()
      };
    });
    return out;
  };
  function categoryOf(row){
    const type=String(row?.type||'').toUpperCase();
    const category=String(row?.category||'').toUpperCase();
    const documentCategory=String(
      row?.documentCategory ||
      row?.raw?.category ||
      ''
    ).toUpperCase();
    if(
      category.includes('PAIE') ||
      category.includes('FISC') ||
      type.includes('PAYROLL') ||
      type.includes('PAIE') ||
      type.includes('SALARY_CERTIFICATE') ||
      type.includes('TAX_') ||
      type.includes('WITHHOLDING') ||
      ['PAYSLIP','SALARY_CERTIFICATE','TAX_DOCUMENT','WITHHOLDING_TAX','SOCIAL_STATEMENT','PAYROLL_OTHER']
        .includes(documentCategory)
    ) return 'PAIE_FISCALITE';
    if(
      category.includes('DOCUMENT') ||
      type.includes('DOCUMENT')
    ) return 'DOCUMENT';
    if(
      category.includes('CONTRAT') ||
      type.includes('STAFF_')
    ) return 'CONTRAT';
    if(
      type.includes('PLANNING') ||
      type.includes('TIMESHEET') ||
      type.includes('POINTAGE') ||
      type.includes('PUNCH')
    ) return 'PLANNING';
    if(
      category.includes('MESSAGE') ||
      type.includes('MESSAGE') ||
      type.includes('REQUEST') ||
      type.includes('DEMANDE')
    ) return 'MESSAGE';
    if(
      type.includes('ABSENCE') ||
      type.includes('LEAVE') ||
      type.includes('CONGE')
    ) return 'ABSENCE';
    return 'AUTRE';
  }
  function requestRows(staffId){
    const reqs=
      typeof getReqs==='function'
        ? getReqs()
        : [];
    return reqs
      .filter(r =>
        String(
          r?.staffId ||
          r?.employeeId ||
          r?.userId ||
          ''
        )===String(staffId)
      )
      .map(r=>({
        id:`REQ-${r.id||Math.random()}`,
        timestamp:
          r.createdAt ||
          r.timestamp ||
          r.updatedAt ||
          r.startDate ||
          new Date().toISOString(),
        staffId:String(staffId),
        type:'STAFF_REQUEST',
        category:'MESSAGE',
        message:
          `${r.type||r.requestType||'Demande RH'} · ${r.status||'enregistrée'}`,
        reason:
          r.comment ||
          r.reason ||
          r.message ||
          '',
        raw:r
      }));
  }
  function punchRows(staffId){
    const punches=
      typeof getPunches==='function'
        ? getPunches()
        : [];
    return punches
      .filter(p=>String(p?.staffId||'')===String(staffId))
      .map(p=>({
        id:`PUNCH-${p.id||p.timestamp||Math.random()}`,
        timestamp:
          new Date(
            Number(
              p.timestamp ||
              p.clientTimestamp ||
              Date.now()
            )
          ).toISOString(),
        staffId:String(staffId),
        type:'POINTAGE',
        category:'PLANNING',
        message:
          `Pointage ${String(p.type||'').toUpperCase()}`,
        reason:
          p.note ||
          p.reason ||
          '',
        raw:p
      }));
  }
  function planningSnapshotRows(staffId){
    const ts=
      typeof getTs==='function'
        ? getTs()
        : {};
    const rows=[];
    Object.entries(ts||{}).forEach(([month,node])=>{
      const staffNode=
        node?.[staffId] ||
        node?.[String(staffId)];
      if(!staffNode) return;
      rows.push({
        id:`PLAN-SNAPSHOT-${staffId}-${month}`,
        timestamp:`${month}-01T00:00:00`,
        staffId:String(staffId),
        type:'PLANNING_MONTH_SNAPSHOT',
        category:'PLANNING',
        message:
          `Planning mensuel ${month}`,
        raw:staffNode
      });
    });
    return rows;
  }
  function currentContractRow(staff){
    return [{
      id:`CURRENT-${staff.id}`,
      timestamp:new Date().toISOString(),
      staffId:String(staff.id),
      type:'CURRENT_STAFF_PROFILE',
      category:'CONTRAT',
      message:'Situation actuelle du collaborateur',
      raw:{
        name:staff.name,
        role:staff.role,
        dept:staff.dept,
        contract:staff.contract,
        annualLeaveDays:staff.annualLeaveDays,
        leaveCarryover:staff.leaveCarryover,
        recoveryBalance:staff.recoveryBalance,
        grossSalaryMonthly:staff.grossSalaryMonthly,
        hourlyCost:staff.hourlyCost,
        skillLevel:staff.skillLevel,
        skills:staff.skills,
        availability:staff.availability,
        minRestHours:staff.minRestHours,
        maxConsecutiveDays:staff.maxConsecutiveDays,
        active:staff.active
      }
    }];
  }
  function payrollTaxRows(staffId){
    const rows=[];
    let runs={};
    let profiles={};
    let variables={};
    let locks={};
    try{runs=JSON.parse(localStorage.getItem('ichef_payroll_runs_v1')||'{}')||{}}catch(_){}
    try{profiles=JSON.parse(localStorage.getItem('ichef_payroll_profiles_v2')||'{}')||{}}catch(_){}
    try{variables=JSON.parse(localStorage.getItem('ichef_payroll_variables_v2')||'{}')||{}}catch(_){}
    try{locks=JSON.parse(localStorage.getItem('ichef_payroll_locks_v2')||'{}')||{}}catch(_){}
    const profile=profiles?.[staffId]||profiles?.[String(staffId)];
    if(profile){
      rows.push({
        id:`PAYROLL-PROFILE-${staffId}`,
        timestamp:new Date().toISOString(),
        staffId:String(staffId),
        type:'PAYROLL_PROFILE_CURRENT',
        category:'PAIE_FISCALITE',
        message:'Profil paie / fiscalité actuel',
        reason:[
          profile.payrollId?`Matricule ${profile.payrollId}`:'',
          profile.mode?`Mode ${profile.mode}`:'',
          profile.contractType?`Contrat ${profile.contractType}`:'',
          profile.frPasSubject===true?`PAS ${Number(profile.frPasRate||0).toFixed(2)} %`:'',
          profile.chQstSubject===true?`Impôt à la source ${profile.chQstTariff||''}`:'',
          profile.chAvsStatus?`AVS ${profile.chAvsStatus}`:'',
          profile.chLppStatus?`LPP ${profile.chLppStatus}`:''
        ].filter(Boolean).join(' · '),
        raw:profile
      });
    }
    Object.entries(runs||{}).forEach(([period,run])=>{
      const emp=(run?.employees||[]).find(
        e=>String(e?.id||'')===String(staffId)
      );
      if(!emp)return;
      const fiscalBits=[];
      if(run?.country==='FR'){
        fiscalBits.push('France');
      }else if(run?.country==='CH'){
        fiscalBits.push('Suisse');
      }
      if(emp?.variables?.withholding){
        fiscalBits.push(`Retenue ${Number(emp.variables.withholding||0).toFixed(2)} ${run?.currency||''}`);
      }
      rows.push({
        id:`PAYRUN-${staffId}-${period}`,
        timestamp:
          run.generatedAt ||
          `${period}-01T00:00:00`,
        staffId:String(staffId),
        type:'PAYROLL_PREPARATION',
        category:'PAIE_FISCALITE',
        period,
        message:
          `Préparation paie ${period} · ${Number(emp.hours||0).toFixed(2)} h · brut ${Number(emp.gross||0).toFixed(2)} ${run?.currency||''} · net estimé ${Number(emp.netEstimated||0).toFixed(2)} ${run?.currency||''}`,
        reason:[
          ...fiscalBits,
          Number(emp.overtime||0)>0?`H. sup. ${Number(emp.overtime).toFixed(2)} h`:'',
          Array.isArray(emp.anomalies)&&emp.anomalies.length?`${emp.anomalies.length} anomalie(s)`:'',
          Array.isArray(emp.regulatoryBlockers)&&emp.regulatoryBlockers.length?`${emp.regulatoryBlockers.length} blocage(s) réglementaire(s)`:''
        ].filter(Boolean).join(' · '),
        raw:{
          ...emp,
          country:run?.country,
          currency:run?.currency,
          runStatus:run?.status
        }
      });
    });
    Object.entries(variables||{}).forEach(([period,node])=>{
      const v=node?.[staffId]||node?.[String(staffId)];
      if(!v)return;
      rows.push({
        id:`PAYVAR-${staffId}-${period}`,
        timestamp:`${period}-28T12:00:00`,
        staffId:String(staffId),
        type:'PAYROLL_VARIABLES',
        category:'PAIE_FISCALITE',
        period,
        message:`Variables de paie ${period}`,
        reason:[
          Number(v.bonus||0)?`Prime ${Number(v.bonus).toFixed(2)}`:'',
          Number(v.allowances||0)?`Indemnités ${Number(v.allowances).toFixed(2)}`:'',
          Number(v.deductions||0)?`Retenues ${Number(v.deductions).toFixed(2)}`:'',
          Number(v.withholding||0)?`Retenue fiscale ${Number(v.withholding).toFixed(2)}`:'',
          Number(v.frPasOverride||0)?`PAS forcé ${Number(v.frPasOverride).toFixed(2)}`:'',
          v.chTimesheetSigned===true?'Feuille d’heures signée':'',
          Number(v.chThirteenthPayout||0)?`13e ${Number(v.chThirteenthPayout).toFixed(2)}`:''
        ].filter(Boolean).join(' · '),
        raw:v
      });
    });
    Object.entries(locks||{}).forEach(([period,lock])=>{
      rows.push({
        id:`PAYLOCK-${staffId}-${period}`,
        timestamp:
          lock?.lockedAt ||
          `${period}-28T23:00:00`,
        staffId:String(staffId),
        type:'PAYROLL_PERIOD_STATUS',
        category:'PAIE_FISCALITE',
        period,
        message:
          `Période de paie ${period} clôturée`,
        reason:
          lock?.country
            ? `Pays ${lock.country}`
            : '',
        raw:lock
      });
    });
    return rows;
  }
  function messageRows(staffId){
    return messageArchive()
      .filter(r=>String(r.staffId||'')===String(staffId))
      .map(r=>({
        ...r,
        type:r.type||'STAFF_MESSAGE',
        category:'MESSAGE'
      }));
  }
  async function documentsFor(staffId){
    // Liste sécurisée distante. Si indisponible, les preuves déjà
    // enregistrées dans RH_CHANGE_HISTORY restent visibles.
    try{
      const pin=
        typeof getRhDirectionAuthPin==='function'
          ? String(getRhDirectionAuthPin()||'').trim()
          : '';
      if(!/^\d{4,12}$/.test(pin)) return [];
      const base=
        String(
          window.SERVER_URL_JS ||
          (typeof SERVER_URL_JS!=='undefined'
            ? SERVER_URL_JS
            : '')
        ).replace(/\/$/,'');
      const device=
        String(
          window.RH_DEVICE_ID ||
          (typeof RH_DEVICE_ID!=='undefined'
            ? RH_DEVICE_ID
            : '') ||
          localStorage.getItem('ichef_device_id') ||
          ''
        );
      const sessionResp=await fetch(
        `${base}/api/rh/documents/session`,
        {
          method:'POST',
          credentials:'include',
          cache:'no-store',
          headers:{
            'Content-Type':'application/json',
            'Accept':'application/json',
            'X-iCHEF-Tenant':tenantID_JS,
            'X-iCHEF-Device':device
          },
          body:JSON.stringify({
            tenantID:tenantID_JS,
            pin,
            deviceId:device
          })
        }
      );
      const sessionData=
        await sessionResp.json().catch(()=>({}));
      if(
        !sessionResp.ok ||
        !sessionData?.accessToken
      ){
        return [];
      }
      const r=await fetch(
        `${base}/api/rh/documents/list?tenantID=${encodeURIComponent(tenantID_JS)}&staffId=${encodeURIComponent(String(staffId))}`,
        {
          credentials:'include',
          cache:'no-store',
          headers:{
            'Accept':'application/json',
            'X-iCHEF-Tenant':tenantID_JS,
            'X-iCHEF-Device':device,
            'Authorization':
              `Bearer ${String(sessionData.accessToken)}`
          }
        }
      );
      const data=
        await r.json().catch(()=>({}));
      if(!r.ok) return [];
      return (
        Array.isArray(data.documents)
          ? data.documents
          : []
      ).map(d=>({
        id:`DOC-${d.documentId||d.id}`,
        timestamp:
          d.uploadedAt ||
          d.issuedAt ||
          d.createdAt ||
          new Date().toISOString(),
        staffId:String(staffId),
        type:
          ['PAYSLIP','SALARY_CERTIFICATE','TAX_DOCUMENT','WITHHOLDING_TAX','SOCIAL_STATEMENT','PAYROLL_OTHER']
            .includes(String(d.category||'').toUpperCase())
            ? 'PAYROLL_TAX_DOCUMENT'
            : 'DOCUMENT_ARCHIVE',
        category:
          ['PAYSLIP','SALARY_CERTIFICATE','TAX_DOCUMENT','WITHHOLDING_TAX','SOCIAL_STATEMENT','PAYROLL_OTHER']
            .includes(String(d.category||'').toUpperCase())
            ? 'PAIE_FISCALITE'
            : 'DOCUMENT',
        documentCategory:String(d.category||''),
        message:
          d.title ||
          d.fileName ||
          'Document RH',
        reason:[
          d.category,
          d.period,
          d.proofId
            ? `Preuve ${d.proofId}`
            : ''
        ].filter(Boolean).join(' · '),
        raw:d
      }));
    }catch(error){
      console.warn(
        '[iCHEF RH V138] documents historique indisponibles',
        error
      );
      return [];
    }
  }
  function buildRows(staffId){
    const history=
      (typeof getRhChangeHistory==='function'
        ? getRhChangeHistory()
        : [])
      .filter(r=>String(r.staffId||'')===String(staffId));
    const staff=getStaffAny(staffId);
    return [
      ...history,
      ...requestRows(staffId),
      ...punchRows(staffId),
      ...planningSnapshotRows(staffId),
      ...currentContractRow(staff),
      ...payrollTaxRows(staffId),
      ...messageRows(staffId),
      ...v138Documents
    ]
    .map(r=>({
      ...r,
      __category:categoryOf(r)
    }))
    .sort((a,b)=>dateMs(b)-dateMs(a));
  }
  function detailText(row){
    const pieces=[];
    if(row.message) pieces.push(String(row.message));
    if(row.reason) pieces.push(String(row.reason));
    if(row.by) pieces.push(`Par : ${row.by}`);
    if(row.proofId) pieces.push(`Preuve : ${row.proofId}`);
    if(row.before || row.after){
      const before=row.before||null;
      const after=row.after||null;
      if(
        before?.contract !== undefined ||
        after?.contract !== undefined
      ){
        pieces.push(
          `Contrat : ${before?.contract??'—'} h → ${after?.contract??'—'} h`
        );
      }
      if(
        before?.role !== undefined ||
        after?.role !== undefined
      ){
        pieces.push(
          `Fonction : ${before?.role??'—'} → ${after?.role??'—'}`
        );
      }
      if(
        before?.dept !== undefined ||
        after?.dept !== undefined
      ){
        pieces.push(
          `Département : ${before?.dept??'—'} → ${after?.dept??'—'}`
        );
      }
    }
    return pieces.filter(Boolean).join(' · ');
  }
  function render(){
    const content=
      document.getElementById(
        'v138-history-content'
      );
    if(!content) return;
    const q=
      String(
        document.getElementById(
          'v138-history-search'
        )?.value || ''
      ).trim().toLowerCase();
    const rows=v138Rows.filter(row=>{
      if(
        v138Category!=='ALL' &&
        row.__category!==v138Category
      ){
        return false;
      }
      if(!q) return true;
      return JSON.stringify(row)
        .toLowerCase()
        .includes(q);
    });
    if(!rows.length){
      content.innerHTML=
        '<div class="v138-empty">Aucun élément dans cette catégorie.</div>';
      return;
    }
    content.innerHTML=
      rows.map(row=>`
        <div class="v138-event">
          <time>${esc(fmtDate(
            row.timestamp ||
            row.at ||
            row.date
          ))}</time>
          <div class="type">
            ${esc(
              row.__category
            )}<br>
            <span style="color:#748089;font-weight:700">
              ${esc(row.type||'ÉVÉNEMENT')}
            </span>
          </div>
          <div class="body">
            ${esc(detailText(row)||row.type||'Événement RH')}
            ${
              row.raw
                ? `<small>${esc(
                    JSON.stringify(row.raw)
                      .slice(0,900)
                  )}</small>`
                : ''
            }
          </div>
        </div>
      `).join('');
  }
  function updateKpis(staff){
    const count=cat=>
      v138Rows.filter(r=>r.__category===cat).length;
    const set=(id,value)=>{
      const el=document.getElementById(id);
      if(el) el.textContent=String(value);
    };
    set('v138-kpi-total',v138Rows.length);
    set('v138-kpi-planning',count('PLANNING'));
    set('v138-kpi-contract',count('CONTRAT'));
    set('v138-kpi-docs',count('DOCUMENT'));
    set('v139-kpi-payroll',count('PAIE_FISCALITE'));
    set('v138-kpi-msg',count('MESSAGE'));
    set('v138-kpi-status',staff?.active===false?'ARCHIVÉ':'ACTIF');
  }
  async function syncArchive(staffId){
    try{
      const payload={
        staffId:String(staffId),
        staff:getStaffAny(staffId),
        history:
          v138Rows.map(r=>{
            const copy={...r};
            delete copy.__category;
            return copy;
          }),
        archivedAt:new Date().toISOString()
      };
      localStorage.setItem(
        `ichef_rh_staff_archive_${staffId}`,
        JSON.stringify(payload)
      );
      await Promise.resolve(
        API.update(
          `RH_STAFF_ARCHIVE_${staffId}`,
          payload
        )
      );
    }catch(error){
      console.warn(
        '[iCHEF RH V138] archive staff locale uniquement',
        error
      );
    }
  }
  function exportJson(){
    const staff=getStaffAny(v138StaffId);
    const payload={
      exportedAt:new Date().toISOString(),
      tenantID:
        typeof tenantID_JS!=='undefined'
          ? tenantID_JS
          : '',
      staff,
      history:v138Rows
    };
    const blob=new Blob(
      [JSON.stringify(payload,null,2)],
      {type:'application/json;charset=utf-8'}
    );
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;
    a.download=
      `iCHEF_Historique_${String(staff?.name||v138StaffId).replace(/[^\w-]+/g,'_')}.json`;
    a.click();
    setTimeout(()=>URL.revokeObjectURL(url),500);
  }
  function ensureModal(){
    if(
      document.getElementById(
        'rh-staff-history-v138'
      )
    ){
      return;
    }
    document.body.insertAdjacentHTML(
      'beforeend',
      `
      <div id="rh-staff-history-v138">
        <div class="v138-panel">
          <div class="v138-head">
            <div class="v138-title">
              <strong id="v138-history-title">HISTORIQUE 360°</strong>
              <small id="v138-history-subtitle"></small>
            </div>

            <div class="v138-head-actions">
              <button class="gold" type="button" id="v138-history-sync">ARCHIVER MAINTENANT</button>
              <button type="button" id="v138-history-export">EXPORT JSON</button>
              <button type="button" id="v138-history-close">FERMER</button>
            </div>
          </div>

          <div class="v138-meta">
            <div class="v138-kpi"><small>TOTAL</small><strong id="v138-kpi-total">0</strong></div>
            <div class="v138-kpi"><small>PLANNING</small><strong id="v138-kpi-planning">0</strong></div>
            <div class="v138-kpi"><small>CONTRAT / PROFIL</small><strong id="v138-kpi-contract">0</strong></div>
            <div class="v138-kpi"><small>DOCUMENTS</small><strong id="v138-kpi-docs">0</strong></div>
            <div class="v138-kpi"><small>PAIE / FISCAL</small><strong id="v139-kpi-payroll">0</strong></div>
            <div class="v138-kpi"><small>MESSAGES / DEMANDES</small><strong id="v138-kpi-msg">0</strong></div>
            <div class="v138-kpi"><small>STATUT</small><strong id="v138-kpi-status">—</strong></div>
          </div>

          <div class="v138-tabs">
            <button data-v138-cat="ALL" class="active">TOUT</button>
            <button data-v138-cat="PLANNING">PLANNING & POINTAGES</button>
            <button data-v138-cat="CONTRAT">CONTRAT & PROFIL</button>
            <button data-v138-cat="DOCUMENT">DOCUMENTS RH</button>
            <button data-v138-cat="PAIE_FISCALITE">PAIE & FISCALITÉ</button>
            <button data-v138-cat="MESSAGE">MESSAGES & DEMANDES</button>
            <button data-v138-cat="ABSENCE">ABSENCES</button>
            <button data-v138-cat="AUTRE">AUTRES</button>
          </div>

          <div class="v138-tools">
            <input id="v138-history-search" type="search" placeholder="Rechercher dans tout l'historique…">
            <div class="v138-retention">ARCHIVE DURABLE · AUCUNE PURGE AUTOMATIQUE</div>
          </div>

          <div id="v138-history-content" class="v138-content"></div>
        </div>
      </div>
      `
    );
    document
      .getElementById('v138-history-close')
      ?.addEventListener('click',close);
    document
      .getElementById('v138-history-export')
      ?.addEventListener('click',exportJson);
    document
      .getElementById('v138-history-sync')
      ?.addEventListener('click',async()=>{
        await syncArchive(v138StaffId);
        try{
          showToast?.(
            'Archive collaborateur synchronisée'
          );
        }catch(_){}
      });
    document
      .getElementById('v138-history-search')
      ?.addEventListener('input',render);
    document
      .querySelectorAll('[data-v138-cat]')
      .forEach(btn=>{
        btn.addEventListener('click',()=>{
          document
            .querySelectorAll('[data-v138-cat]')
            .forEach(x=>x.classList.remove('active'));
          btn.classList.add('active');
          v138Category=
            String(btn.dataset.v138Cat||'ALL');
          render();
        });
      });
    document
      .getElementById('rh-staff-history-v138')
      ?.addEventListener('click',event=>{
        if(
          event.target?.id ===
          'rh-staff-history-v138'
        ){
          close();
        }
      });
    document.addEventListener('keydown',event=>{
      if(
        event.key==='Escape' &&
        document
          .getElementById('rh-staff-history-v138')
          ?.classList.contains('show')
      ){
        close();
      }
    });
  }
  function close(){
    document
      .getElementById('rh-staff-history-v138')
      ?.classList.remove('show');
  }
  window.openRhStaffHistoryV138=async function(staffId){
    ensureModal();
    v138StaffId=String(staffId);
    v138Category='ALL';
    const staff=getStaffAny(staffId);
    document.getElementById('v138-history-title').textContent=
      `HISTORIQUE 360° · ${staff?.name||'COLLABORATEUR'}`;
    document.getElementById('v138-history-subtitle').textContent=
      `${staff?.role||''} · ${String(staff?.dept||'').toUpperCase()} · planning · contrat · bulletins de salaire · certificat de salaire · fiscalité salariale · documents · messages · demandes · pointages`;
    document
      .querySelectorAll('[data-v138-cat]')
      .forEach(btn=>{
        btn.classList.toggle(
          'active',
          btn.dataset.v138Cat==='ALL'
        );
      });
    const search=
      document.getElementById('v138-history-search');
    if(search) search.value='';
    document
      .getElementById('rh-staff-history-v138')
      ?.classList.add('show');
    v138Documents=[];
    v138Rows=buildRows(v138StaffId);
    updateKpis(staff);
    render();
    // Charge ensuite les documents distants sans bloquer l'ouverture.
    v138Documents=
      await documentsFor(v138StaffId);
    v138Rows=buildRows(v138StaffId);
    updateKpis(staff);
    render();
    // Snapshot local immédiat.
    syncArchive(v138StaffId);
  };
  function install(){
    ensureModal();
  }
  if(document.readyState==='loading'){
    document.addEventListener(
      'DOMContentLoaded',
      install,
      {once:true}
    );
  }else{
    install();
  }
  window.__ICHEF_RH_HISTORY_BUILD__='V138';
})();




;
/* RH V264 - preserved script #52 */
window.__ICHEF_RH_BUILD__='RH-V138-STAFF-HISTORY-360';
console.info('[iCHEF RH V138] historique 360° staff · planning · contrat · documents · messages · demandes · pointages');


;
/* RH V264 - preserved script #53 */
(() => {
  'use strict';
  function recordPayrollRun(run){
    if(!run || !Array.isArray(run.employees)) return;
    run.employees.forEach(emp=>{
      try{
        recordRhChange?.({
          staffId:String(emp.id||''),
          staffName:String(emp.name||''),
          type:'PAYROLL_RUN_GENERATED',
          category:'PAIE_FISCALITE',
          period:String(run.period||''),
          country:String(run.country||''),
          currency:String(run.currency||''),
          payrollId:String(emp.payrollId||''),
          gross:Number(emp.gross||0),
          netEstimated:Number(emp.netEstimated||0),
          employeeDeductionsEstimated:Number(emp.employeeDeductionsEstimated||0),
          employerCostEstimated:Number(emp.employerCostEstimated||0),
          message:
            `Préparation paie ${run.period||''} · ` +
            `brut ${Number(emp.gross||0).toFixed(2)} ${run.currency||''} · ` +
            `net estimé ${Number(emp.netEstimated||0).toFixed(2)} ${run.currency||''}`
        });
      }catch(_){}
    });
  }
  function wrapPayrollRun(){
    const original=window.iChefPayrollGenerateAutomaticRun;
    if(typeof original!=='function' || original.__v139Wrapped) return false;
    const wrapped=function(...args){
      const run=original.apply(this,args);
      try{recordPayrollRun(run)}catch(_){}
      return run;
    };
    wrapped.__v139Wrapped=true;
    window.iChefPayrollGenerateAutomaticRun=wrapped;
    return true;
  }
  function wrapPayrollVariables(){
    const original=window.savePayrollVariables;
    if(typeof original!=='function' || original.__v139Wrapped) return false;
    const wrapped=function(...args){
      const id=String(document.getElementById('pv-staff-id')?.value||'');
      const month=String(document.getElementById('payroll-month')?.value||'');
      let before=null;
      try{
        const all=JSON.parse(localStorage.getItem('ichef_payroll_variables_v2')||'{}')||{};
        before=all?.[month]?.[id]||null;
      }catch(_){}
      const result=original.apply(this,args);
      try{
        const all=JSON.parse(localStorage.getItem('ichef_payroll_variables_v2')||'{}')||{};
        const after=all?.[month]?.[id]||null;
        const staff=(typeof getDir==='function'?getDir():[])
          .find(s=>String(s.id)===id);
        recordRhChange?.({
          staffId:id,
          staffName:String(staff?.name||''),
          type:'PAYROLL_VARIABLES_UPDATED',
          category:'PAIE_FISCALITE',
          period:month,
          before,
          after,
          message:`Variables de paie mises à jour · ${month}`
        });
      }catch(_){}
      return result;
    };
    wrapped.__v139Wrapped=true;
    window.savePayrollVariables=wrapped;
    return true;
  }
  function wrapPayrollProfile(){
    const original=window.savePayrollProfile;
    if(typeof original!=='function' || original.__v139Wrapped) return false;
    const wrapped=function(...args){
      const id=String(document.getElementById('pp-staff-id')?.value||'');
      let before=null;
      try{
        const all=JSON.parse(localStorage.getItem('ichef_payroll_profiles_v2')||'{}')||{};
        before=all?.[id]||null;
      }catch(_){}
      const result=original.apply(this,args);
      try{
        const all=JSON.parse(localStorage.getItem('ichef_payroll_profiles_v2')||'{}')||{};
        const after=all?.[id]||null;
        const staff=(typeof getDir==='function'?getDir():[])
          .find(s=>String(s.id)===id);
        recordRhChange?.({
          staffId:id,
          staffName:String(staff?.name||''),
          type:'PAYROLL_PROFILE_UPDATED',
          category:'PAIE_FISCALITE',
          before,
          after,
          message:'Profil paie / fiscalité mis à jour'
        });
      }catch(_){}
      return result;
    };
    wrapped.__v139Wrapped=true;
    window.savePayrollProfile=wrapped;
    return true;
  }
  function installPayrollNote(){
    const modal=document.getElementById('rh-staff-history-v138');
    const tools=modal?.querySelector('.v138-tools');
    if(!modal || !tools || document.getElementById('v139-payroll-note')) return;
    const note=document.createElement('div');
    note.id='v139-payroll-note';
    note.className='v139-payroll-note';
    note.innerHTML=
      `<strong>PAIE & FISCALITÉ SALARIALE</strong> · ` +
      `bulletins de salaire, certificats de salaire, retenues fiscales/PAS, impôt à la source, ` +
      `cotisations sociales, profils et variables de paie, préparations mensuelles et pièces justificatives. ` +
      `Les transmissions fiscales/sociales officielles restent soumises aux connecteurs et validations réglementaires applicables.`;
    tools.insertAdjacentElement('afterend',note);
  }
  function boot(){
    let attempts=0;
    const timer=setInterval(()=>{
      attempts++;
      const a=wrapPayrollRun();
      const b=wrapPayrollVariables();
      const c=wrapPayrollProfile();
      installPayrollNote();
      if((a||window.iChefPayrollGenerateAutomaticRun?.__v139Wrapped) &&
         (b||window.savePayrollVariables?.__v139Wrapped) &&
         (c||window.savePayrollProfile?.__v139Wrapped)){
        clearInterval(timer);
      }
      if(attempts>40) clearInterval(timer);
    },250);
  }
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',boot,{once:true});
  }else{
    boot();
  }
  window.__ICHEF_RH_PAYROLL_HISTORY_BUILD__='V139';
})();


;
/* RH V264 - preserved script #54 */
window.__ICHEF_RH_BUILD__='RH-V139-STAFF-HISTORY-PAYROLL-TAX';
console.info('[iCHEF RH V139] historique 360° + bulletins + certificat salaire + fiscalité salariale');


;
/* RH V264 - preserved script #55 */
window.__ICHEF_RH_BUILD__='RH-V140-FREEZE-FIX';
console.info('[iCHEF RH V140] correction blocage page · MutationObserver V137 sécurisé');


;
/* RH V264 - preserved script #56 */
(() => {
  'use strict';
  const BUILD='RH-V141-FER-LEGACY-REPAIR';
  function clone(v){
    try{return JSON.parse(JSON.stringify(v));}
    catch(_){return v&&typeof v==='object'?{...v}:v;}
  }
  function localDateKey(dateObj){
    const y=dateObj.getFullYear();
    const m=String(dateObj.getMonth()+1).padStart(2,'0');
    const d=String(dateObj.getDate()).padStart(2,'0');
    return `${y}-${m}-${d}`;
  }
  function safeWeekdays(settings){
    const days=Array.from(new Set(
      (Array.isArray(settings?.planningClosedWeekdays)
        ? settings.planningClosedWeekdays
        : [])
      .map(Number)
      .filter(v=>Number.isInteger(v)&&v>=0&&v<=6)
    )).sort((a,b)=>a-b);
    // V141 : 7 jours fermés par semaine est une ancienne valeur
    // invalide pour ce moteur. Une fermeture longue doit être saisie
    // comme fermeture exceptionnelle, pas comme fermeture hebdo 7/7.
    return days.length>=7 ? [] : days;
  }
  function exceptionalDates(settings){
    return Array.from(new Set(
      (Array.isArray(settings?.planningExceptionalClosedDates)
        ? settings.planningExceptionalClosedDates
        : [])
      .map(v=>String(v||'').trim())
      .filter(v=>/^20\d{2}-\d{2}-\d{2}$/.test(v))
    )).sort();
  }
  function isConfiguredClosed(dateObj,settings){
    if(!(dateObj instanceof Date)||Number.isNaN(dateObj.getTime()))return false;
    const weekly=safeWeekdays(settings);
    if(weekly.includes(dateObj.getDay()))return true;
    return exceptionalDates(settings).includes(localDateKey(dateObj));
  }
  function isLegacyFerCell(cell){
    if(!cell||typeof cell!=='object')return false;
    return (
      cell.__restaurantClosed===true ||
      String(cell.obs||'').trim()==='Établissement fermé'
    );
  }
  function historyRows(){
    try{
      const rows=typeof getRhChangeHistory==='function'
        ? getRhChangeHistory()
        : JSON.parse(localStorage.getItem('ichef_rh_change_history')||'[]');
      return Array.isArray(rows)?rows:[];
    }catch(_){return [];}
  }
  function rowTime(row){
    return Date.parse(String(
      row?.timestamp||row?.at||row?.updatedAt||row?.createdAt||0
    ))||0;
  }
  function recoverBeforeCell(staffId,month,day){
    const rows=historyRows()
      .filter(r=>
        String(r?.staffId||'')===String(staffId) &&
        String(r?.month||'')===String(month) &&
        r?.before &&
        typeof r.before==='object'
      )
      .sort((a,b)=>rowTime(b)-rowTime(a));
    for(const row of rows){
      const before=
        row.before?.[day] ??
        row.before?.[String(day)];
      if(!before||typeof before!=='object')continue;
      // On remonte jusqu'à la dernière version qui n'était pas
      // elle-même une fermeture injectée par l'ancien bug.
      if(!isLegacyFerCell(before)){
        return clone(before);
      }
    }
    return null;
  }
  function sanitizeSettings(){
    let settings={};
    try{settings=typeof getRhSettings==='function'?getRhSettings():{};}
    catch(_){settings={};}
    const rawDays=Array.isArray(settings?.planningClosedWeekdays)
      ? settings.planningClosedWeekdays.map(Number)
      : [];
    if(rawDays.length<7){
      return settings;
    }
    const clean={
      ...settings,
      planningClosedWeekdays:[]
    };
    try{
      localStorage.setItem(
        'ichef_rh_settings',
        JSON.stringify(clean)
      );
    }catch(_){}
    try{
      Promise.resolve(
        API?.update?.('RH_SETTINGS',clean)
      ).catch(()=>{});
    }catch(_){}
    document
      .querySelectorAll('[data-v135-closed-weekday]')
      .forEach(input=>{input.checked=false;});
    try{
      recordRhChange?.({
        type:'PLANNING_CLOSURE_SETTINGS_REPAIRED',
        category:'PLANNING',
        message:
          'Ancienne fermeture hebdomadaire 7/7 supprimée automatiquement · jours réels à reconfigurer'
      });
    }catch(_){}
    return clean;
  }
  async function repairMonth(monthStr,options={}){
    const month=String(
      monthStr ||
      (typeof getPlanningAssistantMonth==='function'
        ? getPlanningAssistantMonth()
        : '')
    ).trim();
    if(!/^\d{4}-\d{2}$/.test(month)){
      return {changed:0,recovered:0,cleared:0,month};
    }
    const settings=sanitizeSettings();
    const [year,monthNumber]=month.split('-').map(Number);
    const ts=typeof getTs==='function'?getTs():{};
    const monthNode=ts?.[month];
    if(!monthNode||typeof monthNode!=='object'){
      return {changed:0,recovered:0,cleared:0,month};
    }
    const now=new Date();
    const currentMonth=
      `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    let changed=0;
    let recovered=0;
    let cleared=0;
    // Sauvegarde de sécurité avant toute réparation.
    if(!localStorage.getItem(`ichef_v141_before_repair_${month}`)){
      try{
        localStorage.setItem(
          `ichef_v141_before_repair_${month}`,
          JSON.stringify(monthNode)
        );
      }catch(_){}
    }
    for(const [staffId,days] of Object.entries(monthNode)){
      if(!days||typeof days!=='object')continue;
      for(const [dayKey,cell] of Object.entries(days)){
        const day=Number(dayKey);
        if(!Number.isInteger(day)||day<1||day>31)continue;
        if(!isLegacyFerCell(cell))continue;
        const dateObj=new Date(year,monthNumber-1,day);
        // Une vraie fermeture configurée reste FER.
        if(isConfiguredClosed(dateObj,settings))continue;
        const before=recoverBeforeCell(staffId,month,day);
        if(before){
          days[dayKey]={
            ...before,
            obs:
              String(before.obs||'').trim()==='Établissement fermé'
                ? ''
                : String(before.obs||'')
          };
          changed++;
          recovered++;
          continue;
        }
        // Sans version antérieure fiable, on ne fabrique jamais un horaire.
        // Pour aujourd'hui/futur : on remet la case à replanifier.
        // Pour le passé : on retire uniquement la fausse étiquette FER.
        if(month>currentMonth || (month===currentMonth && day>=now.getDate())){
          days[dayKey]={
            status:'off',
            poste:String(cell?.poste||'salle'),
            s1:'',
            s2:'',
            pause:0,
            obs:'',
            managerNote:String(cell?.managerNote||'').slice(0,40),
            v141NeedsReplan:true
          };
        }else{
          days[dayKey]={
            ...cell,
            __restaurantClosed:false,
            obs:'',
            v141LegacyFerCleared:true
          };
        }
        changed++;
        cleared++;
      }
    }
    if(changed){
      try{
        await Promise.resolve(saveTs(ts));
      }catch(error){
        console.warn('[iCHEF RH V141] sauvegarde réparation FER',error);
      }
      try{
        recordRhChange?.({
          type:'PLANNING_LEGACY_FER_REPAIRED',
          month,
          category:'PLANNING',
          message:
            `Réparation faux FER · ${changed} case(s) · ${recovered} restaurée(s) depuis historique · ${cleared} nettoyée(s)`
        });
      }catch(_){}
      try{
        loadMonthData?.();
        loadPublicPlanning?.();
        refreshViews?.();
      }catch(_){}
    }
    return {changed,recovered,cleared,month};
  }
  function draftSafety(draft){
    const settings=sanitizeSettings();
    if(!draft||!draft.proposal){
      return {ok:false,reason:'Proposition de planning absente.'};
    }
    const [year,month]=String(draft.month||'').split('-').map(Number);
    if(!year||!month){
      return {ok:false,reason:'Mois de planning invalide.'};
    }
    let ferOutsideConfigured=0;
    let totalGeneratedCells=0;
    for(const days of Object.values(draft.proposal||{})){
      for(const [dayKey,cell] of Object.entries(days||{})){
        const day=Number(dayKey);
        if(!Number.isInteger(day))continue;
        const isFer=isLegacyFerCell(cell);
        if(!isFer)continue;
        totalGeneratedCells++;
        const dateObj=new Date(year,month-1,day);
        if(!isConfiguredClosed(dateObj,settings)){
          ferOutsideConfigured++;
        }
      }
    }
    if(ferOutsideConfigured>0){
      return {
        ok:false,
        reason:
          `${ferOutsideConfigured} case(s) FER ne correspondent à aucun jour de fermeture configuré.`
      };
    }
    const target=Number(draft.metrics?.totalTarget||0);
    const planned=Number(draft.metrics?.totalPlanned||0);
    const openDays=Object.values(draft.demand||{})
      .filter(row=>row&&row.closed!==true).length;
    if(target>0 && planned<=0.001 && openDays>0){
      return {
        ok:false,
        reason:
          'Le planning propose 0 heure alors que des jours sont ouverts. Application bloquée.'
      };
    }
    return {ok:true,reason:''};
  }
  // assistantIsRestaurantClosed : refuse la contamination 7/7 même si
  // une ancienne valeur se trouve encore en mémoire.
  if(typeof window.assistantIsRestaurantClosed==='function'){
    const original=window.assistantIsRestaurantClosed;
    if(!original.__v141Wrapped){
      const wrapped=function(dateObj,settings){
        const safe={
          ...(settings||{}),
          planningClosedWeekdays:safeWeekdays(settings||{})
        };
        return original.call(this,dateObj,safe);
      };
      wrapped.__v141Wrapped=true;
      window.assistantIsRestaurantClosed=wrapped;
    }
  }
  // saveRhSettings : ne réenregistre jamais 7 jours hebdomadaires fermés.
  if(typeof window.saveRhSettings==='function'){
    const original=window.saveRhSettings;
    if(!original.__v141Wrapped){
      const wrapped=function(settings){
        const source={...(settings||{})};
        if(
          Array.isArray(source.planningClosedWeekdays) &&
          source.planningClosedWeekdays.length>=7
        ){
          source.planningClosedWeekdays=[];
        }
        return original.call(this,source);
      };
      wrapped.__v141Wrapped=true;
      window.saveRhSettings=wrapped;
    }
  }
  // Génération : réparation AVANT de produire une nouvelle proposition.
  if(typeof window.generateAutomaticPlanning==='function'){
    const original=window.generateAutomaticPlanning;
    if(!original.__v141Wrapped){
      const wrapped=async function(...args){
        const month=
          typeof getPlanningAssistantMonth==='function'
            ? getPlanningAssistantMonth()
            : '';
        await repairMonth(month,{silent:true});
        return await original.apply(this,args);
      };
      wrapped.__v141Wrapped=true;
      window.generateAutomaticPlanning=wrapped;
    }
  }
  // Application manuelle ET relève automatique :
  // aucun draft incohérent ne peut être écrit dans le planning officiel.
  if(typeof window.applyAutomaticPlanning==='function'){
    const original=window.applyAutomaticPlanning;
    if(!original.__v141Wrapped){
      const wrapped=async function(...args){
        const safety=draftSafety(
          typeof planningAssistantDraft!=='undefined'
            ? planningAssistantDraft
            : null
        );
        if(!safety.ok){
          console.error('[iCHEF RH V141] planning bloqué',safety.reason);
          const auto=
            args?.[0]===true ||
            args?.[0]?.auto===true;
          if(!auto){
            alert(
              'PLANNING BLOQUÉ PAR LE CONTRÔLE DE SÉCURITÉ\n\n' +
              safety.reason +
              '\n\nVérifiez les jours de fermeture puis régénérez le planning.'
            );
          }else{
            try{
              showToast?.(
                'Relève IA bloquée · planning incohérent'
              );
            }catch(_){}
          }
          return false;
        }
        return await original.apply(this,args);
      };
      wrapped.__v141Wrapped=true;
      window.applyAutomaticPlanning=wrapped;
    }
  }
  async function autoRepairOnLoad(){
    const settings=sanitizeSettings();
    const month=
      typeof getPlanningAssistantMonth==='function'
        ? getPlanningAssistantMonth()
        : `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}`;
    const result=await repairMonth(month,{silent:true});
    if(result.changed>0){
      try{
        showToast?.(
          `Planning réparé · ${result.changed} faux FER supprimé(s)`
        );
      }catch(_){}
      // Efface le vieux draft pour forcer une vraie régénération.
      try{
        if(typeof planningAssistantDraft!=='undefined'){
          planningAssistantDraft=null;
        }
      }catch(_){}
      try{
        renderAutomaticPlanningDraft?.(null);
      }catch(_){}
    }
    return result;
  }
  window.repairLegacyFerPlanningV141=repairMonth;
  window.validatePlanningDraftV141=draftSafety;
  if(document.readyState==='loading'){
    document.addEventListener(
      'DOMContentLoaded',
      ()=>setTimeout(autoRepairOnLoad,300),
      {once:true}
    );
  }else{
    setTimeout(autoRepairOnLoad,300);
  }
  window.__ICHEF_RH_BUILD__=BUILD;
  console.info('[iCHEF RH V141] faux FER persistants réparés + blocage sécurité draft');
})();


;
/* RH V264 - preserved script #57 */
console.info('[iCHEF RH V141] correction persistante FER + restauration historique + garde-fou autopilot');


;
/* RH V264 - preserved script #58 */
(() => {
  'use strict';
  const VERSION='2026-09-27';
  window.refreshLegalProfileV142=function(preferredType){
    const countryEl=
      document.getElementById(
        'rh-setting-legal-country'
      );
    const typeEl=
      document.getElementById(
        'rh-setting-legal-establishment'
      );
    const rules=
      document.getElementById(
        'v142-legal-rules'
      );
    const badge=
      document.getElementById(
        'v142-legal-status'
      );
    const enforcement=
      document.getElementById(
        'rh-setting-legal-enforcement'
      );
    if(!countryEl || !typeEl) return;
    const country=
      countryEl.value==='FR'
        ? 'FR'
        : 'CH';
    const current=
      preferredType ||
      typeEl.value ||
      (
        country==='FR'
          ? 'permanent'
          : 'standard'
      );
    typeEl.innerHTML=
      country==='CH'
        ? `
          <option value="standard">Suisse · établissement standard · référence 42 h</option>
          <option value="seasonal">Suisse · établissement saisonnier · référence 43,5 h</option>
          <option value="small">Suisse · petit établissement · référence 45 h</option>
        `
        : `
          <option value="permanent">France · établissement HCR permanent</option>
          <option value="seasonal">France · établissement HCR saisonnier</option>
        `;
    const allowed=
      [...typeEl.options]
        .map(o=>o.value);
    typeEl.value=
      allowed.includes(current)
        ? current
        : (
            country==='FR'
              ? 'permanent'
              : 'standard'
          );
    const settings={
      ...(typeof getRhSettings==='function'
        ? getRhSettings()
        : {}),
      planningLegalCountry:country,
      planningLegalEstablishmentType:
        typeEl.value
    };
    const profile=
      typeof assistantLegalProfileV142==='function'
        ? assistantLegalProfileV142(
            settings,
            {}
          )
        : null;
    if(rules && profile){
      const items=
        country==='CH'
          ? [
              ['Référence CCNT',`${profile.weeklyReference} h`],
              ['Maximum LTr',`${profile.weeklyMax} h`],
              ['Repos quotidien',`${profile.dailyRestMin} h`],
              ['Repos / semaine',`${profile.weeklyRestDays} jours`],
              ['Amplitude jour/soir',`${profile.maxSpanHours} h max`],
              ['Vacances','5 semaines'],
              ['Jours fériés','6 / an'],
              ['Planning', typeEl.value==='seasonal' ? '7 j avant' : '14 j avant'],
              ['Pointage','validation mensuelle'],
              ['7 jours', settings.planningSwissSevenDayException===true ? 'conditions strictes' : 'désactivé']
            ]
          : [
              ['Durée légale','35 h'],
              ['Référence HCR',`${profile.weeklyReference} h`],
              ['Maximum hebdo',`${profile.weeklyMax} h`],
              ['Moyenne 12 sem.',`${profile.rolling12AverageMax} h`],
              ['Repos quotidien',`${profile.dailyRestMin} h`],
              ['Repos / semaine',`${profile.weeklyRestDays} jours`],
              ['Pause','20 min dès 6 h'],
              ['Jours consécutifs',`${profile.maxConsecutiveDays} max.`],
              ['Nuit HCR','22 h–07 h'],
              ['Mode',settings.planningFranceWorkTimeMode==='annualized'?'1 607 h':'hebdo 39 h']
            ];
      rules.innerHTML=
        items.map(([label,value])=>`
          <div class="v142-rule">
            <small>${label}</small>
            <strong>${value}</strong>
          </div>
        `).join('');
    }
    if(badge){
      badge.textContent=
        enforcement?.checked===false
          ? 'CONTRÔLE JURIDIQUE OFF'
          : (
              country==='CH'
                ? 'SUISSE · CCNT + LTr + OLT 1/2'
                : 'FRANCE · HCR IDCC 1979 + CODE DU TRAVAIL'
            );
    }
    const currency=
      document.getElementById(
        'rh-setting-currency'
      );
    if(currency){
      currency.value=
        country==='CH'
          ? 'CHF'
          : 'EUR';
    }
  };
  function tenantKey(){
    return `ichef_rh_legal_${String(
      typeof tenantID_JS!=='undefined'
        ? tenantID_JS
        : 'default'
    )}`;
  }
  async function migrate(){
    let legal={};
    try{
      legal=
        JSON.parse(
          localStorage.getItem(
            tenantKey()
          ) || '{}'
        ) || {};
    }catch(_){
      legal={};
    }
    if(
      String(
        legal.planningLegalMigration ||
        ''
      ) === 'V142'
    ){
      return;
    }
    const settings=
      typeof getRhSettings==='function'
        ? getRhSettings()
        : {};
    const country=
      String(settings.currency||'CHF')
        .toUpperCase()==='EUR'
        ? 'FR'
        : 'CH';
    // Nettoyage unique :
    // on ne conserve pas les anciennes fermetures potentiellement
    // contaminées. Le responsable doit confirmer les vrais jours.
    const clean={
      ...settings,
      planningLegalCountry:country,
      planningLegalFramework:
        country==='FR'
          ? 'FR_HCR'
          : 'CH_CCNT',
      planningLegalEstablishmentType:
        country==='FR'
          ? 'permanent'
          : 'standard',
      planningLegalEnforcement:true,
      planningLegalReferenceDate:VERSION,
      planningClosedWeekdays:[],
      planningExceptionalClosedDates:[],
      planningClosureConfirmedV142:false
    };
    try{
      saveRhSettings?.(clean);
    }catch(_){}
    try{
      const saved=
        JSON.parse(
          localStorage.getItem(
            tenantKey()
          ) || '{}'
        ) || {};
      localStorage.setItem(
        tenantKey(),
        JSON.stringify({
          ...saved,
          planningLegalMigration:'V142',
          planningLegalCountry:
            country,
          planningLegalFramework:
            clean.planningLegalFramework,
          planningLegalEstablishmentType:
            clean.planningLegalEstablishmentType,
          planningLegalEnforcement:true,
          planningLegalReferenceDate:
            VERSION,
          planningClosedWeekdays:[],
          planningExceptionalClosedDates:[],
          planningClosureConfirmedV142:false
        })
      );
    }catch(_){}
    // Répare immédiatement les faux FER déjà enregistrés.
    try{
      const month=
        typeof getPlanningAssistantMonth==='function'
          ? getPlanningAssistantMonth()
          : '';
      if(
        typeof repairLegacyFerPlanningV141==='function'
      ){
        await repairLegacyFerPlanningV141(
          month,
          {silent:true}
        );
      }
    }catch(error){
      console.warn(
        '[iCHEF RH V142] nettoyage FER',
        error
      );
    }
    // Supprime le draft contaminé en mémoire.
    try{
      if(
        typeof planningAssistantDraft!=='undefined'
      ){
        planningAssistantDraft=null;
      }
      if(
        typeof planningAssistantMultiMonths!=='undefined'
      ){
        planningAssistantMultiMonths=[];
      }
      renderAutomaticPlanningDraft?.(null);
    }catch(_){}
  }
  function bindUi(){
    const country=
      document.getElementById(
        'rh-setting-legal-country'
      );
    const enforcement=
      document.getElementById(
        'rh-setting-legal-enforcement'
      );
    country?.addEventListener(
      'change',
      ()=>refreshLegalProfileV142()
    );
    enforcement?.addEventListener(
      'change',
      ()=>refreshLegalProfileV142()
    );
    document
      .getElementById(
        'rh-setting-ch-seven-day-exception'
      )
      ?.addEventListener(
        'change',
        ()=>refreshLegalProfileV142()
      );
    refreshLegalProfileV142(
      getRhSettings?.()
        ?.planningLegalEstablishmentType
    );
  }
  // Blocage ultime, y compris autopilot.
  const originalApply=
    window.applyAutomaticPlanning;
  if(
    typeof originalApply==='function' &&
    !originalApply.__v142LegalWrapped
  ){
    const wrapped=async function(...args){
      const draft=
        typeof planningAssistantDraft!=='undefined'
          ? planningAssistantDraft
          : null;
      const settings=
        typeof getRhSettings==='function'
          ? getRhSettings()
          : {};
      if(
        draft &&
        settings.planningLegalEnforcement !== false &&
        Array.isArray(draft.legalIssues) &&
        draft.legalIssues.length
      ){
        const auto=
          args?.[0]===true ||
          args?.[0]?.auto===true;
        const message=
          draft.legalIssues
            .slice(0,6)
            .join('\n');
        console.error(
          '[iCHEF RH V142] application bloquée',
          draft.legalIssues
        );
        if(!auto){
          alert(
            'PLANNING BLOQUÉ · DROIT DU TRAVAIL\n\n' +
            message +
            '\n\nCorrigez le planning avant validation.'
          );
        }else{
          try{
            showToast?.(
              'Autopilot bloqué · contraintes juridiques'
            );
          }catch(_){}
        }
        return false;
      }
      return await originalApply.apply(
        this,
        args
      );
    };
    wrapped.__v142LegalWrapped=true;
    window.applyAutomaticPlanning=
      wrapped;
  }
  async function boot(){
    await migrate();
    hydrateRhSettingsForm?.();
    bindUi();
    try{
      showToast?.(
        'Profil juridique planning activé · vérifiez le pays et les vrais jours de fermeture'
      );
    }catch(_){}
  }
  if(document.readyState==='loading'){
    document.addEventListener(
      'DOMContentLoaded',
      ()=>setTimeout(boot,350),
      {once:true}
    );
  }else{
    setTimeout(boot,350);
  }
  window.__ICHEF_RH_LEGAL_BUILD__=
    'V142';
})();


;
/* RH V264 - preserved script #59 */
window.__ICHEF_RH_BUILD__='RH-V142-LEGAL-CH-FR';
console.info('[iCHEF RH V142] planning juridique CH CCNT / FR HCR + purge FER hérités');


;
/* RH V264 - preserved script #60 */
window.__ICHEF_RH_BUILD__='RH-V143-LEGAL-HARD';
console.info('[iCHEF RH V143] France 46h/12 sem + pause 20 min hard-block · CH/FR legal engine');


;
/* RH V264 - preserved script #61 */
window.__ICHEF_RH_BUILD__='RH-V144-CLEAR-LEGAL-UI';
console.info('[iCHEF RH V144] paramètres juridiques réorganisés et simplifiés');


;
/* RH V264 - preserved script #62 */
(() => {
  'use strict';
  const RULESET = Object.freeze({
    version:'V145',
    verifiedAt:'2026-09-27',
    mode:'STRICT_FAIL_CLOSED',
    CH:{
      sources:[
        'CCNT art. 15 · durée du travail / heures supplémentaires',
        'CCNT art. 16 · jours de repos',
        'LTr art. 9 · durée maximale hebdomadaire',
        'LTr art. 10 · espace de 14 h',
        'LTr art. 15a · repos quotidien'
      ],
      ordinaryWeeklyHours:{
        standard:42,
        seasonal:43.5,
        small:45
      },
      weeklyMax:50,
      dailyRestMin:11,
      weeklyRestDays:2,
      maxSpanHours:14,
      automationPolicy:
        'Aucune réduction automatique du repos quotidien et aucune dérogation 7 jours consécutifs.'
    },
    FR:{
      sources:[
        'Convention HCR · durées maximales journalières',
        'Accord HCR · moyenne 46 h / 12 semaines et 48 h absolues',
        'Code du travail L3121-16 · pause 20 min à partir de 6 h',
        'Code du travail L3131-1 · repos quotidien 11 h'
      ],
      legalFullTimeReference:35,
      weeklyMax:48,
      rolling12AverageMax:46,
      dailyRestMin:11,
      weeklyRestDays:2,
      dailyMax:{
        adminOffsite:10,
        cook:11,
        other:11.5,
        night:12,
        reception:12
      },
      pauseAfter6h:20
    }
  });
  window.ICHEF_LEGAL_RULESET_V145=RULESET;
  function forceStrictUi(){
    const toggle =
      document.getElementById(
        'rh-setting-legal-enforcement'
      );
    if(toggle){
      toggle.checked=true;
      toggle.disabled=true;
    }
    const badge =
      document.getElementById(
        'v142-legal-status'
      );
    if(badge){
      const country =
        document.getElementById(
          'rh-setting-legal-country'
        )?.value || 'CH';
      badge.textContent =
        country==='FR'
          ? 'FRANCE · HCR · STRICT'
          : 'SUISSE · CCNT · STRICT';
    }
  }
  const originalRefresh =
    window.refreshLegalProfileV142;
  if(
    typeof originalRefresh==='function' &&
    !originalRefresh.__v145Wrapped
  ){
    const wrapped=function(...args){
      const result =
        originalRefresh.apply(this,args);
      forceStrictUi();
      const source =
        document.querySelector(
          '.v144-legal-source'
        );
      if(source){
        source.innerHTML =
          `Référentiel juridique iCHEF ${RULESET.version} · vérifié le ${RULESET.verifiedAt} · ` +
          `mode strict : une règle obligatoire manquante ou une donnée indispensable absente bloque la publication. ` +
          `Les dérogations ne sont jamais appliquées automatiquement.`;
      }
      return result;
    };
    wrapped.__v145Wrapped=true;
    window.refreshLegalProfileV142=wrapped;
  }
  const originalSave =
    window.saveRhSettings;
  if(
    typeof originalSave==='function' &&
    !originalSave.__v145Wrapped
  ){
    const wrapped=function(source={}){
      return originalSave.call(
        this,
        {
          ...source,
          planningLegalEnforcement:true
        }
      );
    };
    wrapped.__v145Wrapped=true;
    window.saveRhSettings=wrapped;
  }
  const originalApply =
    window.applyAutomaticPlanning;
  if(
    typeof originalApply==='function' &&
    !originalApply.__v145Wrapped
  ){
    const wrapped=async function(...args){
      const draft =
        typeof planningAssistantDraft!=='undefined'
          ? planningAssistantDraft
          : null;
      const issues =
        Array.isArray(draft?.legalIssues)
          ? draft.legalIssues
          : [];
      if(issues.length){
        const auto =
          args?.[0]===true ||
          args?.[0]?.auto===true;
        const message =
          issues
            .slice(0,8)
            .join('\n');
        try{
          recordRhChange?.({
            type:'LEGAL_PLANNING_BLOCKED',
            category:'PLANNING_LEGAL',
            country:
              getRhSettings?.()
                ?.planningLegalCountry || '',
            ruleset:RULESET.version,
            issues,
            message:
              `Publication bloquée · ${issues.length} anomalie(s) juridique(s)`
          });
        }catch(_){}
        if(!auto){
          alert(
            'PLANNING NON CONFORME · PUBLICATION IMPOSSIBLE\n\n' +
            message +
            '\n\nCorrigez toutes les anomalies avant publication.'
          );
        }else{
          try{
            showToast?.(
              'Autopilot bloqué · conformité juridique'
            );
          }catch(_){}
        }
        return false;
      }
      try{
        recordRhChange?.({
          type:'LEGAL_PLANNING_AUDIT_OK',
          category:'PLANNING_LEGAL',
          country:
            getRhSettings?.()
              ?.planningLegalCountry || '',
          ruleset:RULESET.version,
          verifiedAt:RULESET.verifiedAt,
          month:draft?.month || '',
          message:
            'Audit juridique planning validé avant publication'
        });
      }catch(_){}
      return await originalApply.apply(
        this,
        args
      );
    };
    wrapped.__v145Wrapped=true;
    window.applyAutomaticPlanning=wrapped;
  }
  function boot(){
    forceStrictUi();
    const country =
      document.getElementById(
        'rh-setting-legal-country'
      );
    country?.addEventListener(
      'change',
      forceStrictUi
    );
    console.info(
      '[iCHEF RH V145] conformité juridique stricte active',
      RULESET
    );
  }
  if(document.readyState==='loading'){
    document.addEventListener(
      'DOMContentLoaded',
      boot,
      {once:true}
    );
  }else{
    boot();
  }
  window.__ICHEF_RH_LEGAL_STRICT_BUILD__='V145';
})();


;
/* RH V264 - preserved script #63 */
window.__ICHEF_RH_BUILD__='RH-V145-LEGAL-STRICT-FAIL-CLOSED';
console.info('[iCHEF RH V145] conformité juridique stricte CH/FR · publication fail-closed');


;
/* RH V264 - preserved script #64 */
(() => {
  'use strict';
  function markForcedOffCells(){
    const draft =
      typeof planningAssistantDraft !== 'undefined'
        ? planningAssistantDraft
        : null;
    const forced =
      Array.isArray(draft?.forcedLegalOff)
        ? draft.forcedLegalOff
        : [];
    if(!forced.length) return;
    // Ne change aucune dimension du tableau.
    forced.forEach(item => {
      const row =
        [...document.querySelectorAll(
          '#ia-planning-preview tbody tr'
        )]
        .find(tr =>
          tr.textContent
            .toLowerCase()
            .includes(
              String(item.staffName||'')
                .toLowerCase()
            )
        );
      if(!row) return;
      const cells =
        row.querySelectorAll('td');
      const target =
        cells?.[Number(item.day)];
      if(target){
        target.classList.add(
          'v146-forced-off'
        );
        target.title =
          'OFF automatique · 6 jours travaillés consécutifs maximum';
      }
    });
  }
  const originalRender =
    window.renderAutomaticPlanningDraft;
  if(
    typeof originalRender === 'function' &&
    !originalRender.__v146Wrapped
  ){
    const wrapped=function(...args){
      const result =
        originalRender.apply(this,args);
      requestAnimationFrame(
        markForcedOffCells
      );
      return result;
    };
    wrapped.__v146Wrapped=true;
    window.renderAutomaticPlanningDraft=
      wrapped;
  }
  window.ICHEF_STATUS_RULES_V146 =
    Object.freeze({
      OFF:{
        consumesVacation:false,
        countsAsWork:false,
        countsAsWeeklyRest:true
      },
      MALADIE:{
        consumesVacation:false,
        countsAsWork:false,
        countsAsWeeklyRest:false,
        vacationRights:'jurisdiction-specific'
      },
      CONGE:{
        consumesVacation:true,
        countsAsWork:false,
        countsAsWeeklyRest:false
      }
    });
  window.__ICHEF_RH_OFF_VACATION_BUILD__='V146';
})();


;
/* RH V264 - preserved script #65 */
window.__ICHEF_RH_BUILD__='RH-V146-6DAY-OFF-VACATION-SEPARATION';
console.info('[iCHEF RH V146] 6 jours travaillés max · 7e non travaillé · OFF ≠ MALADIE ≠ CP');


;
/* RH V264 - preserved script #66 */
window.__ICHEF_RH_OPTIMIZED_BUILD__='RH-V148-SAFE-OPTIMIZED';
console.info('[iCHEF RH V148] optimisation sûre · connexions, sécurité et fonctions conservées');


;
/* RH V264 - preserved script #67 */
window.__ICHEF_RH_BUILD__='RH-V149-STAFF-ALERTS-IN-BUTTON';
console.info('[iCHEF RH V149] alertes staff déplacées dans les cellules collaborateurs');


;
/* RH V264 - preserved script #68 */
(() => {
  'use strict';
  if(window.__ICHEF_RH_V153_NAV__) return;
  window.__ICHEF_RH_V153_NAV__ = true;
  function scrollPlanning(){
    const target =
      document.getElementById('assistant-generate-btn')?.closest('div')?.parentElement ||
      document.querySelector('#ia-predictions-modal .assistant-config-grid') ||
      document.getElementById('ia-predictions-modal');
    target?.scrollIntoView?.({
      behavior:'smooth',
      block:'start'
    });
  }
  function scrollProposal(){
    const target =
      document.querySelector('#ia-predictions-modal .v113-plan-wrap') ||
      document.getElementById('ia-planning-preview') ||
      document.getElementById('ia-planning-draft-summary');
    target?.scrollIntoView?.({
      behavior:'smooth',
      block:'start'
    });
  }
  function install(){
    const modal =
      document.getElementById('ia-predictions-modal');
    const content =
      modal?.querySelector('.modal-content');
    const header =
      content?.querySelector('.header');
    const settingsBtn =
      document.getElementById('v131-planning-tools-btn');
    const emergencyBtn =
      document.getElementById('v134-emergency-btn');
    if(!modal || !content || !header || !settingsBtn || !emergencyBtn){
      return false;
    }
    let toolbar =
      document.getElementById('v153-assistant-toolbar');
    if(!toolbar){
      toolbar = document.createElement('div');
      toolbar.id = 'v153-assistant-toolbar';
      toolbar.setAttribute(
        'aria-label',
        'Navigation planning iCHEF'
      );
      const planningBtn =
        document.createElement('button');
      planningBtn.id = 'v153-nav-planning';
      planningBtn.type = 'button';
      planningBtn.className = 'v153-primary';
      planningBtn.innerHTML = `
        <span class="v153-btn-copy">
          <strong>PLANNING</strong>
          <small>Création du planning</small>
        </span>
      `;
      planningBtn.addEventListener(
        'click',
        () => {
          if(typeof window.iChefAssistantShowOfficialV221 === 'function'){
            window.iChefAssistantShowOfficialV221();
          }else{
            scrollPlanning();
          }
        }
      );
      const proposalBtn =
        document.createElement('button');
      proposalBtn.id = 'v153-nav-proposal';
      proposalBtn.type = 'button';
      proposalBtn.className = 'v153-proposal';
      proposalBtn.innerHTML = `
        <span class="v153-btn-copy">
          <strong>PLANNING PROPOSÉ</strong>
          <small>Voir la proposition iCHEF</small>
        </span>
      `;
      proposalBtn.addEventListener(
        'click',
        () => {
          if(typeof window.iChefAssistantShowProposalV221 === 'function'){
            window.iChefAssistantShowProposalV221();
          }else{
            scrollProposal();
          }
        }
      );
      toolbar.appendChild(planningBtn);
      toolbar.appendChild(proposalBtn);
      header.insertAdjacentElement(
        'afterend',
        toolbar
      );
    }
    /* On DÉPLACE les boutons originaux.
       On ne clone rien : leurs listeners et fonctions restent connectés. */
    if(settingsBtn.parentElement !== toolbar){
      toolbar.appendChild(settingsBtn);
    }
    if(emergencyBtn.parentElement !== toolbar){
      toolbar.insertBefore(
        emergencyBtn,
        settingsBtn
      );
    }
    /* Texte compact, mais IDs + événements inchangés. */
    settingsBtn.innerHTML = `
      <span class="v131-tools-left">
        <span class="v131-tools-icon">⚙</span>
        <span class="v131-tools-copy">
          <strong>PARAMÈTRES</strong>
          <small>Équilibre & réglages planning</small>
        </span>
      </span>
      <span class="v131-tools-arrow">›</span>
    `;
    emergencyBtn.innerHTML = `
      <span>
        <strong>IMPRÉVU</strong>
        <small>Retard · maladie · absence</small>
      </span>
      <span class="v134-alert-count">0</span>
    `;
    try{
      window.refreshRhLastMinuteRisks?.();
    }catch(_){}
    modal.dataset.v153Nav = '1';
    return true;
  }
  function boot(){
    if(install()) return;
    /* Essais limités uniquement le temps que V131/V134 créent leurs boutons.
       Pas de MutationObserver permanent. */
    let attempts = 0;
    const timer = setInterval(()=>{
      attempts += 1;
      if(install() || attempts >= 32){
        clearInterval(timer);
      }
    },250);
  }
  if(document.readyState === 'loading'){
    document.addEventListener(
      'DOMContentLoaded',
      boot,
      {once:true}
    );
  }else{
    boot();
  }
  console.info(
    '[iCHEF RH V153] Planning · Planning proposé · Imprévu · Paramètres alignés'
  );
})();


;
/* RH V264 - preserved script #69 */
window.__ICHEF_RH_BUILD__='RH-V153-PLANNING-NAV-COMPACT';


;
/* RH V264 - preserved script #70 */
(() => {
  'use strict';
  if(window.__ICHEF_RH_V154_TOOLBAR__) return;
  window.__ICHEF_RH_V154_TOOLBAR__ = true;
  function applyImportant(el, prop, value){
    if(!el) return;
    el.style.setProperty(prop, value, 'important');
  }
  function normalize(){
    const toolbar =
      document.getElementById('v153-assistant-toolbar');
    const planning =
      document.getElementById('v153-nav-planning');
    const proposal =
      document.getElementById('v153-nav-proposal');
    const emergency =
      document.getElementById('v134-emergency-btn');
    const settings =
      document.getElementById('v131-planning-tools-btn');
    if(
      !toolbar ||
      !planning ||
      !proposal ||
      !emergency ||
      !settings
    ){
      return false;
    }
    /* Ordre définitif */
    [planning, proposal, emergency, settings]
      .forEach(btn => {
        if(btn.parentElement !== toolbar){
          toolbar.appendChild(btn);
        }
      });
    /* Sécurité visuelle contre les anciens styles très agressifs. */
    applyImportant(toolbar,'display','grid');
    applyImportant(toolbar,'grid-template-columns','repeat(4,minmax(0,1fr))');
    applyImportant(toolbar,'gap','8px');
    applyImportant(toolbar,'width','100%');
    applyImportant(toolbar,'overflow','visible');
    [planning, proposal, emergency, settings]
      .forEach(btn => {
        applyImportant(btn,'display','flex');
        applyImportant(btn,'width','100%');
        applyImportant(btn,'min-width','0');
        applyImportant(btn,'max-width','none');
        applyImportant(btn,'margin','0');
      });
    toolbar.dataset.v154 = '1';
    return true;
  }
  function boot(){
    if(normalize()) return;
    let n = 0;
    const timer = setInterval(() => {
      n += 1;
      if(normalize() || n >= 24){
        clearInterval(timer);
      }
    }, 200);
  }
  if(document.readyState === 'loading'){
    document.addEventListener(
      'DOMContentLoaded',
      boot,
      {once:true}
    );
  } else {
    boot();
  }
  console.info(
    '[iCHEF RH V154] 4 boutons planning alignés sur une seule ligne'
  );
})();


;
/* RH V264 - preserved script #71 */
window.__ICHEF_RH_BUILD__='RH-V154-FOUR-PLANNING-BUTTONS-ONE-LINE';


;
/* RH V264 - preserved script #72 */
(() => {
  'use strict';
  if (window.__ICHEF_RH_V161_GLOBAL_SYNC__) return;
  window.__ICHEF_RH_V161_GLOBAL_SYNC__ = true;
  const tenant =
    String(
      typeof tenantID_JS !== 'undefined'
        ? tenantID_JS
        : ''
    );
  const CHANNEL_NAME =
    `ichef-rh-sync-${tenant || 'default'}`;
  let syncScheduled = false;
  let lastUiSyncAt = 0;
  let channel = null;
  function safeCall(fn, ...args) {
    try {
      if (typeof fn === 'function') {
        return fn(...args);
      }
    } catch (error) {
      console.warn('[iCHEF RH V161]', error);
    }
  }
  function parseTime(value) {
    const n = Date.parse(
      String(value || '')
    );
    return Number.isFinite(n)
      ? n
      : 0;
  }
  function currentSettings() {
    try {
      return typeof getRhSettings === 'function'
        ? getRhSettings()
        : (
            JSON.parse(
              localStorage.getItem(
                'ichef_rh_settings'
              ) || '{}'
            ) || {}
          );
    } catch (_) {
      return {};
    }
  }
  function writeTenantLegalMirror(settings) {
    try {
      const key =
        `ichef_rh_legal_${tenant || 'default'}`;
      const previous =
        JSON.parse(
          localStorage.getItem(key) || '{}'
        ) || {};
      localStorage.setItem(
        key,
        JSON.stringify({
          ...previous,
          planningLegalCountry:
            settings.planningLegalCountry,
          planningLegalFramework:
            settings.planningLegalFramework,
          planningLegalEstablishmentType:
            settings.planningLegalEstablishmentType,
          planningLegalEnforcement:
            settings.planningLegalEnforcement !== false,
          planningLegalReferenceDate:
            settings.planningLegalReferenceDate,
          planningClosedWeekdays:
            Array.isArray(
              settings.planningClosedWeekdays
            )
              ? settings.planningClosedWeekdays
              : [],
          planningExceptionalClosedDates:
            Array.isArray(
              settings.planningExceptionalClosedDates
            )
              ? settings.planningExceptionalClosedDates
              : [],
          planningClosureConfirmedV142:
            settings.planningClosureConfirmedV142 === true
        })
      );
    } catch (_) {}
  }
  function applyRemoteSettings(settings, source = 'server') {
    if (
      !settings ||
      typeof settings !== 'object'
    ) {
      return false;
    }
    const local = currentSettings();
    const remoteAt =
      parseTime(settings.updatedAt);
    const localAt =
      parseTime(local.updatedAt);
    /* Un état serveur plus ancien ne remplace jamais
       une modification locale plus récente. */
    if (
      remoteAt &&
      localAt &&
      remoteAt < localAt
    ) {
      return false;
    }
    try {
      localStorage.setItem(
        'ichef_rh_settings',
        JSON.stringify(settings)
      );
      writeTenantLegalMirror(settings);
      scheduleUiSync(
        `remote:${source}`
      );
      return true;
    } catch (_) {
      return false;
    }
  }
  function syncVisibleViews(reason = 'local') {
    const now = Date.now();
    /* anti-rendu multiple lors d'une rafale socket */
    if (now - lastUiSyncAt < 40) return;
    lastUiSyncAt = now;
    const settings = currentSettings();
    /* PARAMÈTRES */
    safeCall(
      typeof hydrateRhSettingsForm !== 'undefined'
        ? hydrateRhSettingsForm
        : null
    );
    safeCall(
      typeof populateRhLegalEstablishmentOptionsV142 !== 'undefined'
        ? populateRhLegalEstablishmentOptionsV142
        : null,
      settings
    );
    safeCall(
      typeof renderRhLegalRulesV142 !== 'undefined'
        ? renderRhLegalRulesV142
        : null,
      settings
    );
    safeCall(
      typeof hydrateRhClosedWeekdaysV135 !== 'undefined'
        ? hydrateRhClosedWeekdaysV135
        : null,
      settings
    );
    safeCall(
      typeof refreshRhServiceStrategyAdvice !== 'undefined'
        ? refreshRhServiceStrategyAdvice
        : null,
      settings
    );
    /* ASSISTANT + PLANNING PROPOSÉ */
    safeCall(
      typeof renderPlanningAssistantLocal !== 'undefined'
        ? renderPlanningAssistantLocal
        : null
    );
    if (
      document
        .getElementById(
          'ia-predictions-modal'
        )
        ?.classList
        .contains('show')
    ) {
      safeCall(
        typeof schedulePlanningAssistantAutoRefresh !== 'undefined'
          ? schedulePlanningAssistantAutoRefresh
          : null
      );
      if (
        typeof planningAssistantDraft !== 'undefined' &&
        planningAssistantDraft
      ) {
        safeCall(
          typeof renderAutomaticPlanningDraft !== 'undefined'
            ? renderAutomaticPlanningDraft
            : null,
          planningAssistantDraft
        );
      }
    }
    /* STAFF / PLANNING OFFICIEL */
    if (
      document
        .getElementById(
          'hr-interface'
        )
        ?.style.display === 'flex'
    ) {
      safeCall(
        typeof renderStaffList !== 'undefined'
          ? renderStaffList
          : null
      );
      safeCall(
        typeof loadMonthData !== 'undefined'
          ? loadMonthData
          : null
      );
      safeCall(
        typeof updateDashboardStats !== 'undefined'
          ? updateDashboardStats
          : null
      );
    }
    /* PORTAIL STAFF */
    if (
      document
        .getElementById(
          'employee-portal'
        )
        ?.style.display === 'flex' &&
      typeof loggedInStaffId !== 'undefined' &&
      loggedInStaffId !== null
    ) {
      safeCall(
        typeof renderEmployeePortal !== 'undefined'
          ? renderEmployeePortal
          : null
      );
    }
    /* DEMANDES / CONGÉS / ABSENCES */
    safeCall(
      typeof updateReqBadge !== 'undefined'
        ? updateReqBadge
        : null
    );
    if (
      document
        .getElementById(
          'requests-interface'
        )
        ?.style.display === 'flex'
    ) {
      safeCall(
        typeof renderDirectorRequests !== 'undefined'
          ? renderDirectorRequests
          : null
      );
    }
    /* TEMPS RÉELS / PAIE */
    if (
      document
        .getElementById(
          'timesheets-interface'
        )
        ?.style.display === 'flex'
    ) {
      safeCall(
        typeof renderRealTimesheets !== 'undefined'
          ? renderRealTimesheets
          : null
      );
    }
    /* État de synchronisation visuel */
    updateSyncBadge(
      'ok',
      reason
    );
  }
  function scheduleUiSync(reason = 'change') {
    if (syncScheduled) return;
    syncScheduled = true;
    requestAnimationFrame(() => {
      syncScheduled = false;
      syncVisibleViews(reason);
    });
  }
  function ensureBadge() {
    let badge =
      document.getElementById(
        'v161-rh-sync-badge'
      );
    if (badge) return badge;
    badge =
      document.createElement('div');
    badge.id =
      'v161-rh-sync-badge';
    badge.innerHTML = `
      <span class="v161-dot"></span>
      <strong>SYNCHRONISÉ</strong>
    `;
    const host =
      document.querySelector(
        '.top-status'
      ) ||
      document.querySelector(
        '.header-actions'
      ) ||
      document.body;
    host.appendChild(badge);
    return badge;
  }
  function updateSyncBadge(state, reason = '') {
    const badge = ensureBadge();
    badge.dataset.state = state;
    const label =
      badge.querySelector('strong');
    if (!label) return;
    label.textContent =
      state === 'syncing'
        ? 'SYNCHRONISATION...'
        : state === 'offline'
          ? 'LOCAL · HORS LIGNE'
          : 'SYNCHRONISÉ';
    badge.title =
      reason
        ? `Dernière synchronisation : ${reason}`
        : '';
  }
  function broadcastSettings(settings, reason = 'save') {
    try {
      channel?.postMessage({
        type: 'RH_SETTINGS',
        tenant,
        reason,
        settings
      });
    } catch (_) {}
  }
  async function pullServerState(reason = 'refresh') {
    if (!navigator.onLine) {
      updateSyncBadge(
        'offline',
        reason
      );
      return null;
    }
    updateSyncBadge(
      'syncing',
      reason
    );
    try {
      const state =
        await API.getState();
      if (
        state?.activeOrders &&
        typeof syncRhStaffFromState === 'function'
      ) {
        syncRhStaffFromState(state);
      }
      if (
        state?.activeOrders &&
        typeof syncRhOperationalState === 'function'
      ) {
        syncRhOperationalState(state);
      }
      const remoteSettings =
        state?.activeOrders
          ?.RH_SETTINGS
          ?.data;
      if (remoteSettings) {
        applyRemoteSettings(
          remoteSettings,
          reason
        );
      } else {
        scheduleUiSync(reason);
      }
      updateSyncBadge(
        'ok',
        reason
      );
      return state;
    } catch (error) {
      console.warn(
        '[iCHEF RH V161] synchronisation serveur différée',
        error
      );
      updateSyncBadge(
        navigator.onLine
          ? 'offline'
          : 'offline',
        reason
      );
      return null;
    }
  }
  /* -------------------------------------------------------
     1. saveRhSettings = source unique pour tout RH
     ------------------------------------------------------- */
  if (
    typeof saveRhSettings === 'function' &&
    !saveRhSettings.__v161Wrapped
  ) {
    const original =
      saveRhSettings;
    const wrapped =
      function(settings) {
        const saved =
          original.call(
            this,
            settings
          );
        if (saved) {
          writeTenantLegalMirror(saved);
          window.dispatchEvent(
            new CustomEvent(
              'ichef:rh-settings-saved',
              {
                detail: {
                  tenant,
                  settings: saved
                }
              }
            )
          );
          broadcastSettings(
            saved,
            'save'
          );
          scheduleUiSync(
            'paramètres enregistrés'
          );
        }
        return saved;
      };
    wrapped.__v161Wrapped = true;
    saveRhSettings = wrapped;
  }
  /* -------------------------------------------------------
     2. saveRhPlanningSettings : après sauvegarde, toutes
        les vues utilisent immédiatement les mêmes valeurs.
     ------------------------------------------------------- */
  if (
    typeof saveRhPlanningSettings === 'function' &&
    !saveRhPlanningSettings.__v161Wrapped
  ) {
    const original =
      saveRhPlanningSettings;
    const wrapped =
      function(...args) {
        const saved =
          original.apply(
            this,
            args
          );
        scheduleUiSync(
          'planning settings'
        );
        return saved;
      };
    wrapped.__v161Wrapped = true;
    saveRhPlanningSettings = wrapped;
  }
  /* -------------------------------------------------------
     3. Toute réponse serveur / Socket passe aussi par
        le même rafraîchissement UI.
     ------------------------------------------------------- */
  if (
    typeof syncRhOperationalState === 'function' &&
    !syncRhOperationalState.__v161Wrapped
  ) {
    const original =
      syncRhOperationalState;
    const wrapped =
      function(state) {
        const result =
          original.call(
            this,
            state
          );
        const settings =
          state?.activeOrders
            ?.RH_SETTINGS
            ?.data;
        if (settings) {
          applyRemoteSettings(
            settings,
            'socket/server'
          );
        } else {
          scheduleUiSync(
            'server state'
          );
        }
        return result;
      };
    wrapped.__v161Wrapped = true;
    syncRhOperationalState = wrapped;
  }
  /* -------------------------------------------------------
     4. Synchronisation entre onglets du même navigateur
     ------------------------------------------------------- */
  window.addEventListener(
    'storage',
    event => {
      if (
        event.key ===
        'ichef_rh_settings'
      ) {
        scheduleUiSync(
          'autre onglet'
        );
      }
      if (
        [
          'empire_hr_directory',
          'empire_hr_timesheets',
          'empire_hr_requests',
          'ichef_rh_change_history'
        ].includes(event.key)
      ) {
        scheduleUiSync(
          'données RH autre onglet'
        );
      }
    }
  );
  try {
    channel =
      new BroadcastChannel(
        CHANNEL_NAME
      );
    channel.onmessage =
      event => {
        const msg =
          event?.data;
        if (
          !msg ||
          msg.tenant !== tenant
        ) {
          return;
        }
        if (
          msg.type === 'RH_SETTINGS' &&
          msg.settings
        ) {
          applyRemoteSettings(
            msg.settings,
            'broadcast'
          );
        }
        if (
          msg.type === 'RH_REFRESH'
        ) {
          pullServerState(
            'broadcast refresh'
          );
        }
      };
  } catch (_) {
    channel = null;
  }
  /* -------------------------------------------------------
     5. Retour réseau / retour onglet = resynchronisation
     ------------------------------------------------------- */
  window.addEventListener(
    'online',
    () => {
      pullServerState(
        'retour réseau'
      );
    }
  );
  window.addEventListener(
    'offline',
    () => {
      updateSyncBadge(
        'offline',
        'hors ligne'
      );
    }
  );
  document.addEventListener(
    'visibilitychange',
    () => {
      if (
        !document.hidden &&
        navigator.onLine
      ) {
        pullServerState(
          'retour écran'
        );
      }
    }
  );
  window.addEventListener(
    'focus',
    () => {
      if (
        navigator.onLine
      ) {
        pullServerState(
          'focus'
        );
      }
    }
  );
  /* -------------------------------------------------------
     6. Quand demandes / staff / planning changent, l'assistant
        et les autres vues sont rafraîchis.
     ------------------------------------------------------- */
  window.addEventListener(
    'ichef:rh-settings-saved',
    () => {
      scheduleUiSync(
        'réglages RH'
      );
    }
  );
  /* -------------------------------------------------------
     Initialisation
     ------------------------------------------------------- */
  function boot() {
    ensureBadge();
    scheduleUiSync(
      'initialisation'
    );
    /* L'état serveur est la référence partagée entre appareils. */
    setTimeout(
      () => {
        pullServerState(
          'initialisation serveur'
        );
      },
      350
    );
  }
  if (
    document.readyState === 'loading'
  ) {
    document.addEventListener(
      'DOMContentLoaded',
      boot,
      { once:true }
    );
  } else {
    boot();
  }
  window.refreshAllRhV161 =
    pullServerState;
  window.syncAllRhViewsV161 =
    scheduleUiSync;
  window.__ICHEF_RH_SYNC_BUILD__ =
    'V161';
  console.info(
    '[iCHEF RH V161] synchronisation globale active'
  );
})();


;
/* RH V264 - preserved script #73 */
window.__ICHEF_RH_BUILD__='RH-V161-GLOBAL-SYNC';


;
/* RH V264 - preserved script #74 */
window.__ICHEF_RH_BUILD__='RH-V162-LIGHT-PARAMETERS';
console.info('[iCHEF RH V162] Paramètres : fond blanc / police noire');


;
/* RH V264 - preserved script #75 */
window.__ICHEF_RH_BUILD__='RH-V163-UNIFIED-PLANNING-TOOLBAR';
console.info('[iCHEF RH V163] 4 boutons alignés · même fond');


;
/* RH V264 - preserved script #76 */
window.__ICHEF_RH_BUILD__='RH-V164-BLACK-TEXT-PARAMETERS';
console.info('[iCHEF RH V164] toutes les polices grises des paramètres sont noires');


;
/* RH V264 - preserved script #77 */
window.__ICHEF_RH_BUILD__='RH-V165-WORK-START-SEPARATE-FROM-SERVICE';
console.info('[iCHEF RH V165] début du travail distinct du début du service');


;
/* RH V264 - preserved script #78 */
window.__ICHEF_RH_BUILD__='RH-V166-WORK-START-END-SEPARATE-FROM-SERVICE';
console.info('[iCHEF RH V166] début + fin du travail distincts du service');


;
/* RH V264 - preserved script #79 */
window.__ICHEF_RH_BUILD__='RH-V167-DAY-INITIAL-BESIDE-DATE';
console.info('[iCHEF RH V167] première lettre du jour affichée à côté de la date sur tous les plannings');


;
/* RH V264 - preserved script #80 */
window.__ICHEF_RH_BUILD__='RH-V168-SERVICE-BY-WEEKDAY';
console.info('[iCHEF RH V168] services MIDI / SOIR sélectionnables du lundi au dimanche');


;
/* RH V264 - preserved script #81 */
(() => {
  'use strict';
  if (window.__ICHEF_RH_V169_BRIGADE_UI__) return;
  window.__ICHEF_RH_V169_BRIGADE_UI__ = true;
  function bindV169() {
    const select =
      document.getElementById(
        'rh-setting-establishment-profile'
      );
    const apply =
      document.getElementById(
        'v169-apply-profile'
      );
    if (select && select.dataset.v169Bound !== '1') {
      select.dataset.v169Bound = '1';
      select.addEventListener(
        'change',
        () => {
          const current =
            typeof getRhSettings === 'function'
              ? getRhSettings()
              : {};
          renderRhBrigadeV169(
            {
              ...current,
              planningEstablishmentProfile:
                select.value
            },
            true
          );
        }
      );
    }
    if (apply && apply.dataset.v169Bound !== '1') {
      apply.dataset.v169Bound = '1';
      apply.addEventListener(
        'click',
        () => {
          applyRhEstablishmentProfileV169(
            select?.value || 'restaurant',
            true
          );
        }
      );
    }
  }
  const originalHydrate =
    typeof hydrateRhSettingsForm === 'function'
      ? hydrateRhSettingsForm
      : null;
  if (
    originalHydrate &&
    !originalHydrate.__v169Wrapped
  ) {
    const wrapped =
      function(...args) {
        const result =
          originalHydrate.apply(this, args);
        bindV169();
        return result;
      };
    wrapped.__v169Wrapped = true;
    hydrateRhSettingsForm = wrapped;
  }
  function boot() {
    bindV169();
    if (
      typeof getRhSettings === 'function' &&
      typeof renderRhBrigadeV169 === 'function'
    ) {
      renderRhBrigadeV169(
        getRhSettings(),
        false
      );
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      boot,
      { once:true }
    );
  } else {
    boot();
  }
})();


;
/* RH V264 - preserved script #82 */
window.__ICHEF_RH_BUILD__='RH-V169-ESTABLISHMENT-PROFILES-BRIGADES';
console.info('[iCHEF RH V169] profils d’établissement et brigades actifs');


;
/* RH V264 - preserved script #83 */
(() => {
  'use strict';
  if (window.__ICHEF_RH_V170_CASH_UI__) return;
  window.__ICHEF_RH_V170_CASH_UI__ = true;
  function bindCashV170() {
    const month =
      document.getElementById(
        'month-selector'
      );
    if (
      month &&
      month.dataset.v170CashBound !== '1'
    ) {
      month.dataset.v170CashBound = '1';
      month.addEventListener(
        'change',
        () => {
          renderRhCashActivityV170(
            'month-change'
          );
        }
      );
    }
    const forecastToggle =
      document.getElementById(
        'rh-setting-use-cash-forecast'
      );
    if (
      forecastToggle &&
      forecastToggle.dataset.v171Bound !== '1'
    ) {
      forecastToggle.dataset.v171Bound = '1';
      forecastToggle.addEventListener(
        'change',
        () => {
          renderRhCashActivityV170(
            'forecast-toggle'
          );
        }
      );
    }
    const budget =
      document.getElementById(
        'rh-setting-labor-budget'
      );
    if (
      budget &&
      budget.dataset.v170CashBound !== '1'
    ) {
      budget.dataset.v170CashBound = '1';
      budget.addEventListener(
        'input',
        () => {
          // La valeur n'est persistée qu'avec ENREGISTRER.
          // Pour l'aperçu on calcule avec la valeur actuellement affichée.
          const settings =
            getRhSettings();
          const temp =
            Number(
              budget.value || 0
            );
          const old =
            settings.laborBudgetPct;
          try {
            localStorage.setItem(
              'ichef_rh_v170_budget_preview',
              String(temp)
            );
            const monthStr =
              typeof getPlanningAssistantMonth === 'function'
                ? getPlanningAssistantMonth()
                : '';
            const forecast =
              rhCashForecastMonthV170(
                monthStr
              );
            const actual =
              rhCashSummaryForMonthV170(
                monthStr
              );
            const base =
              forecast.ca > 0
                ? forecast.ca
                : actual.ca;
            const el =
              document.getElementById(
                'rh-cash-budget-v170'
              );
            if (el) {
              el.textContent =
                base > 0
                  ? rhCashMoneyV170(
                      base * temp / 100,
                      actual.currency ||
                        settings.currency ||
                        'CHF'
                    )
                  : '—';
            }
          } catch (_) {}
        }
      );
    }
  }
  function boot() {
    bindCashV170();
    loadRhCashCacheV170();
    renderRhCashActivityV170(
      'boot'
    );
    // État complet serveur = référence réelle de la caisse.
    setTimeout(
      async () => {
        try {
          const state =
            await API.getState();
          if (state?.activeOrders) {
            syncRhOperationalState(
              state
            );
          }
        } catch (_) {}
      },
      250
    );
  }
  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      boot,
      { once:true }
    );
  } else {
    boot();
  }
})();


;
/* RH V264 - preserved script #84 */
window.__ICHEF_RH_BUILD__='RH-V170-CASH-ACTIVITY-QUALITY-BUDGET';
console.info('[iCHEF RH V170] RH connecté à FINANCIAL_HISTORY / caisse tactile');


;
/* RH V264 - preserved script #85 */
(() => {
  'use strict';
  if (window.__ICHEF_RH_V171_UI__) return;
  window.__ICHEF_RH_V171_UI__ = true;
  function refreshV171(){
    try{
      const settings =
        typeof getRhSettings === 'function'
          ? getRhSettings()
          : {};
      if(typeof renderRhProfileCardsV171 === 'function'){
        renderRhProfileCardsV171(
          String(
            document.getElementById(
              'rh-setting-establishment-profile'
            )?.value ||
            settings.planningEstablishmentProfile ||
            'restaurant'
          )
        );
      }
      if(typeof renderRhCashActivityV170 === 'function'){
        renderRhCashActivityV170('v171-refresh');
      }
    }catch(error){
      console.warn('[iCHEF RH V171]',error);
    }
  }
  document.addEventListener(
    'ichef:rh-settings-saved',
    refreshV171
  );
  if(document.readyState === 'loading'){
    document.addEventListener(
      'DOMContentLoaded',
      refreshV171,
      {once:true}
    );
  }else{
    refreshV171();
  }
})();


;
/* RH V264 - preserved script #86 */
window.__ICHEF_RH_BUILD__='RH-V171-MOCKUP-PROFILES-BRIGADE-LOAD';
console.info('[iCHEF RH V171] mockup + profils + effectifs + charge prévue');


;
/* RH V264 - preserved script #87 */
(() => {
  'use strict';
  if (
    window
      .__ICHEF_RH_V172_SYMBIOSE_ADAPTER__
  ) {
    return;
  }
  window
    .__ICHEF_RH_V172_SYMBIOSE_ADAPTER__ =
    true;
  function safePublishStaffing(reason) {
    try {
      if (
        typeof publishRhStaffingV172 ===
        'function'
      ) {
        publishRhStaffingV172(reason);
      }
    } catch (error) {
      console.warn(
        '[iCHEF RH V172] staffing',
        error
      );
    }
  }
  function wrapAfter(name) {
    const fn =
      window[name];
    if (
      typeof fn !== 'function' ||
      fn.__ichefV172SymbioseWrapped
    ) {
      return;
    }
    const wrapped =
      function(...args) {
        const result =
          fn.apply(this, args);
        Promise
          .resolve(result)
          .finally(
            () =>
              safePublishStaffing(
                name
              )
          );
        return result;
      };
    wrapped
      .__ichefV172SymbioseWrapped =
      true;
    window[name] =
      wrapped;
  }
  function wrapRhFunctions() {
    [
      'saveDir',
      'saveTs',
      'savePunches',
      'saveReqs',
      'syncStaffAccessToCloud'
    ].forEach(wrapAfter);
  }
  window.addEventListener(
    'ichef:rh-settings-saved',
    event => {
      try {
        publishRhSettingsV172(
          'rh-settings-saved'
        );
        safePublishStaffing(
          'rh-settings-saved'
        );
      } catch (_) {}
    }
  );
  window.addEventListener(
    'ichef:connected',
    () => {
      wrapRhFunctions();
      safePublishStaffing(
        'connected'
      );
    }
  );
  /* Une vente caisse reçue par Symbiose peut modifier immédiatement
     la charge / les prévisions affichées dans RH. */
  window.addEventListener(
    'ichef:payment.completed',
    () => {
      try {
        scheduleRhStaffRefresh();
        if (
          typeof renderRhCashActivityV170 ===
          'function'
        ) {
          renderRhCashActivityV170(
            'symbiose-payment'
          );
        }
      } catch (_) {}
    }
  );
  window.addEventListener(
    'ichef:rush.updated',
    () => {
      try {
        if (
          document
            .getElementById(
              'ia-predictions-modal'
            )
            ?.classList
            .contains('show')
        ) {
          schedulePlanningAssistantAutoRefresh();
        }
      } catch (_) {}
    }
  );
  function boot() {
    ensureRhSymbioseBadgeV172();
    wrapRhFunctions();
    if (
      typeof connectRhRealtimeSync ===
      'function'
    ) {
      connectRhRealtimeSync();
    }
    setTimeout(
      () => {
        if (
          typeof rhSocket !==
            'undefined' &&
          rhSocket?.connected
        ) {
          registerRhSymbioseV172();
        }
      },
      500
    );
  }
  window.addEventListener(
    'online',
    () => {
      setRhSymbioseBadgeV172(
        'connecting'
      );
      try {
        scheduleRhStaffRefresh();
      } catch (_) {}
    }
  );
  window.addEventListener(
    'offline',
    () => {
      setRhSymbioseBadgeV172(
        'offline'
      );
    }
  );
  window.addEventListener(
    'beforeunload',
    () => {
      try {
        clearInterval(
          rhSymbioseHeartbeatV172
        );
      } catch (_) {}
    }
  );
  if (
    document.readyState ===
    'loading'
  ) {
    document.addEventListener(
      'DOMContentLoaded',
      boot,
      { once:true }
    );
  } else {
    boot();
  }
  window.ICHEF_RH_SYMBIOSE = {
    publishStaffing:
      safePublishStaffing,
    publishSettings:
      reason =>
        publishRhSettingsV172(
          reason || 'manual'
        ),
    refresh:
      () =>
        scheduleRhStaffRefresh(),
    get presence() {
      return (
        typeof rhSymbiosePresenceV172 !==
          'undefined'
          ? rhSymbiosePresenceV172
          : {}
      );
    },
    get staffing() {
      return (
        typeof rhSymbioseStaffingSnapshotV172 ===
          'function'
          ? rhSymbioseStaffingSnapshotV172()
          : {}
      );
    }
  };
})();


;
/* RH V264 - preserved script #88 */
window.__ICHEF_RH_BUILD__='RH-V172-SYMBIOSE-REALTIME';
console.info('[iCHEF RH V172] Symbiose temps réel active');


;
/* RH V264 - preserved script #89 */
window.__ICHEF_RH_BUILD__='RH-V173-PROFILE-TITLES-READABLE';
console.info('[iCHEF RH V173] cartes établissement : titres uniquement');


;
/* RH V264 - preserved script #90 */
window.__ICHEF_RH_BUILD__='RH-V174-BRIGADES-READABLE-EXPANDABLE';
console.info('[iCHEF RH V174] brigades lisibles + agrandir/réduire + apprenti/extra');


;
/* RH V264 - preserved script #91 */
(() => {
  'use strict';
  if (window.__ICHEF_RH_V175_ESCAPE__) return;
  window.__ICHEF_RH_V175_ESCAPE__ = true;
  document.addEventListener(
    'keydown',
    event => {
      if (event.key !== 'Escape') return;
      document
        .querySelectorAll(
          '#v169-brigade-container [data-v169-department].is-expanded-v175'
        )
        .forEach(card => {
          if (
            typeof closeExpandedBrigadeV175 ===
            'function'
          ) {
            closeExpandedBrigadeV175(card);
          }
        });
    }
  );
})();


;
/* RH V264 - preserved script #92 */
window.__ICHEF_RH_BUILD__='RH-V175-LONGPRESS-BRIGADE-ZOOM';
console.info('[iCHEF RH V175] appui long 0,5 s brigade + X fermeture');


;
/* RH V264 - preserved script #93 */
window.__ICHEF_RH_BUILD__='RH-V176-FIX-PROFILE-GHOST-BAR';
console.info('[iCHEF RH V176] barre profil fantôme corrigée');


;
/* RH V264 - preserved script #94 */
window.__ICHEF_RH_BUILD__='RH-V177-BRIGADE-HIGH-READABILITY';
console.info('[iCHEF RH V177] brigades haute lisibilité');


;
/* RH V264 - preserved script #95 */
window.__ICHEF_RH_BUILD__='RH-V178-PROFILE-FONT-X15';
console.info('[iCHEF RH V178] titres catégories +50%');


;
/* RH V264 - preserved script #96 */
window.__ICHEF_RH_BUILD__='RH-V179-NO-OVERFLOW-ROLE-RATIOS';
console.info('[iCHEF RH V179] zéro dépassement + ratios par métier');


;
/* RH V264 - preserved script #97 */
(() => {
  'use strict';
  if (window.__ICHEF_RH_V180_SWISS_LEGAL__) return;
  window.__ICHEF_RH_V180_SWISS_LEGAL__ = true;
  const SWISS_LEGAL_VERSION_V180 =
    'CH-2026-09-29-CCNT-LTr-OLT1-OLT2';
  const SWISS_CCNT_MINIMUMS_2026_V180 = Object.freeze({
    monthly: {
      IA:3713,
      IB:3943,
      II:4070,
      IIIA:4528,
      IIIB:4635,
      IV:5293
    },
    hourly: {
      standard: {
        IA:20.40, IB:21.66, II:22.36,
        IIIA:24.88, IIIB:25.47, IV:29.08
      },
      seasonal: {
        IA:19.65, IB:20.86, II:21.53,
        IIIA:23.96, IIIB:24.52, IV:28.01
      },
      small: {
        IA:19.04, IB:20.22, II:20.87,
        IIIA:23.22, IIIB:23.77, IV:27.14
      }
    }
  });
  function swissPayrollProfilesV180() {
    try {
      return JSON.parse(
        localStorage.getItem(
          'ichef_payroll_profiles_v2'
        ) || '{}'
      ) || {};
    } catch (_) {
      return {};
    }
  }
  function swissPayrollVariablesV180() {
    try {
      return JSON.parse(
        localStorage.getItem(
          'ichef_payroll_variables_v2'
        ) || '{}'
      ) || {};
    } catch (_) {
      return {};
    }
  }
  function swissProfileForV180(staff) {
    const all =
      swissPayrollProfilesV180();
    return {
      mode:'hourly',
      monthlySalary:0,
      hourlyRate:0,
      birthDate:'',
      contractType:'',
      chLgavCategory:'',
      chProtectionStatus:'none',
      chPostpartumConsent:false,
      chFamilyObligations:false,
      chThirteenthMode:'annual',
      ...(
        all?.[staff?.id] ||
        all?.[String(staff?.id)] ||
        {}
      )
    };
  }
  function swissAgeAtV180(dateString, atDate = new Date()) {
    if (!dateString) return null;
    const birth =
      new Date(
        `${String(dateString).slice(0,10)}T12:00:00`
      );
    if (
      !Number.isFinite(
        birth.getTime()
      )
    ) {
      return null;
    }
    let age =
      atDate.getFullYear() -
      birth.getFullYear();
    const monthDiff =
      atDate.getMonth() -
      birth.getMonth();
    if (
      monthDiff < 0 ||
      (
        monthDiff === 0 &&
        atDate.getDate() <
          birth.getDate()
      )
    ) {
      age--;
    }
    return age;
  }
  function swissIsApprenticeV180(staff) {
    const p =
      swissProfileForV180(staff);
    const text =
      `${p.contractType || ''} ${staff?.role || ''}`
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g,'')
        .toLowerCase();
    return (
      /apprenti|apprentissage|apprenant/.test(
        text
      )
    );
  }
  function swissProtectionStatusV180(staff) {
    return String(
      swissProfileForV180(staff)
        .chProtectionStatus ||
      'none'
    ).toLowerCase();
  }
  function swissMinuteV180(value) {
    const m =
      /^(\d{1,2}):(\d{2})$/.exec(
        String(value || '').trim()
      );
    if (!m) return null;
    const h = Number(m[1]);
    const min = Number(m[2]);
    if (
      !Number.isInteger(h) ||
      !Number.isInteger(min) ||
      h < 0 || h > 23 ||
      min < 0 || min > 59
    ) {
      return null;
    }
    return h * 60 + min;
  }
  function swissSegmentsV180(plan) {
    const rows = [];
    [plan?.s1, plan?.s2]
      .filter(Boolean)
      .forEach(raw => {
        const parts =
          String(raw)
            .split('-')
            .map(x => x.trim());
        if (parts.length !== 2) return;
        const start =
          swissMinuteV180(parts[0]);
        let end =
          swissMinuteV180(parts[1]);
        if (
          start === null ||
          end === null
        ) {
          return;
        }
        if (end <= start) {
          end += 1440;
        }
        rows.push({
          start,
          end
        });
      });
    rows.sort(
      (a,b) =>
        a.start - b.start
    );
    return rows;
  }
  function swissPlanMetricsV180(plan) {
    const segments =
      swissSegmentsV180(plan);
    if (!segments.length) {
      return {
        hours:0,
        spanHours:0,
        breakMinutes:0,
        nightMinutes:0,
        firstStart:null,
        lastEnd:null
      };
    }
    const workedMinutes =
      segments.reduce(
        (sum, row) =>
          sum +
          Math.max(
            0,
            row.end - row.start
          ),
        0
      );
    let internalBreak = 0;
    for (
      let i = 1;
      i < segments.length;
      i++
    ) {
      internalBreak +=
        Math.max(
          0,
          segments[i].start -
          segments[i-1].end
        );
    }
    const explicitPause =
      Math.max(
        0,
        Number(
          plan?.pause || 0
        )
      );
    const firstStart =
      segments[0].start;
    const lastEnd =
      Math.max(
        ...segments.map(
          row => row.end
        )
      );
    let nightMinutes = 0;
    const nightWindows = [
      [0, 360],
      [1380, 1800],
      [2820, 3240]
    ];
    segments.forEach(segment => {
      nightWindows.forEach(
        ([start, end]) => {
          nightMinutes +=
            Math.max(
              0,
              Math.min(
                segment.end,
                end
              ) -
              Math.max(
                segment.start,
                start
              )
            );
        }
      );
    });
    return {
      hours:
        Math.max(
          0,
          Number(
            typeof calculateNet ===
              'function'
              ? calculateNet(plan)
              : workedMinutes / 60
          ) || 0
        ),
      rawWorkedHours:
        workedMinutes / 60,
      spanHours:
        Math.max(
          0,
          lastEnd - firstStart
        ) / 60,
      breakMinutes:
        internalBreak +
        explicitPause,
      nightMinutes,
      firstStart,
      lastEnd
    };
  }
  function swissRequiredPauseV180(hours) {
    const h =
      Number(hours || 0);
    if (h > 9) return 60;
    if (h > 7) return 30;
    if (h > 5.5) return 15;
    return 0;
  }
  function swissAbsoluteDateTimeV180(
    dateObj,
    minuteValue
  ) {
    const d =
      new Date(
        dateObj.getFullYear(),
        dateObj.getMonth(),
        dateObj.getDate(),
        0,0,0,0
      );
    d.setMinutes(
      Number(minuteValue || 0)
    );
    return d;
  }
  function swissPlanForDateV180(
    proposal,
    staffId,
    dateObj,
    draftMonth
  ) {
    if (
      typeof assistantLegalDatePlanV142 ===
      'function'
    ) {
      return assistantLegalDatePlanV142(
        proposal,
        staffId,
        dateObj,
        draftMonth
      );
    }
    const key =
      `${dateObj.getFullYear()}-${String(
        dateObj.getMonth()+1
      ).padStart(2,'0')}`;
    if (key === draftMonth) {
      return (
        proposal?.[staffId]?.[
          dateObj.getDate()
        ] ||
        proposal?.[String(staffId)]?.[
          dateObj.getDate()
        ] ||
        null
      );
    }
    const ts =
      typeof getTs === 'function'
        ? getTs()
        : {};
    return (
      ts?.[key]?.[staffId]?.[
        dateObj.getDate()
      ] ||
      ts?.[key]?.[String(staffId)]?.[
        dateObj.getDate()
      ] ||
      null
    );
  }
  function swissActualWorkV180(plan) {
    return Boolean(
      plan &&
      (
        typeof assistantIsActualWorkDayV146 ===
          'function'
          ? assistantIsActualWorkDayV146(
              plan
            )
          : (
              plan.s1 ||
              plan.s2
            )
      )
    );
  }
  function swissRestAfterDateV180(
    proposal,
    staffId,
    dateObj,
    draftMonth,
    maxLookAheadDays = 8
  ) {
    const current =
      swissPlanForDateV180(
        proposal,
        staffId,
        dateObj,
        draftMonth
      );
    const currentMetrics =
      swissPlanMetricsV180(
        current
      );
    if (
      !current ||
      currentMetrics.lastEnd === null
    ) {
      return {
        hours:Infinity,
        verifiable:true,
        nextDate:null
      };
    }
    const end =
      swissAbsoluteDateTimeV180(
        dateObj,
        currentMetrics.lastEnd
      );
    for (
      let offset = 1;
      offset <= maxLookAheadDays;
      offset++
    ) {
      const nextDate =
        new Date(dateObj);
      nextDate.setDate(
        nextDate.getDate() +
        offset
      );
      const plan =
        swissPlanForDateV180(
          proposal,
          staffId,
          nextDate,
          draftMonth
        );
      if (!plan) {
        // Si on traverse un mois sans planning adjacent,
        // la vérification n'est pas fiable.
        const nextMonth =
          `${nextDate.getFullYear()}-${String(
            nextDate.getMonth()+1
          ).padStart(2,'0')}`;
        if (
          nextMonth !== draftMonth
        ) {
          const ts =
            typeof getTs ===
              'function'
              ? getTs()
              : {};
          if (
            !(
              ts?.[nextMonth]?.[staffId] ||
              ts?.[nextMonth]?.[
                String(staffId)
              ]
            )
          ) {
            return {
              hours:null,
              verifiable:false,
              nextDate
            };
          }
        }
        continue;
      }
      if (!swissActualWorkV180(plan)) {
        continue;
      }
      const metrics =
        swissPlanMetricsV180(
          plan
        );
      if (
        metrics.firstStart === null
      ) {
        continue;
      }
      const nextStart =
        swissAbsoluteDateTimeV180(
          nextDate,
          metrics.firstStart
        );
      return {
        hours:
          (
            nextStart -
            end
          ) /
          3600000,
        verifiable:true,
        nextDate
      };
    }
    // Aucun travail trouvé dans la fenêtre :
    // le repos est au moins supérieur à cette fenêtre.
    return {
      hours:
        maxLookAheadDays *
        24,
      verifiable:true,
      nextDate:null
    };
  }
  function swissHoursRangeV180(
    proposal,
    staffId,
    startDate,
    days,
    draftMonth
  ) {
    let total = 0;
    let complete = true;
    for (
      let offset = 0;
      offset < days;
      offset++
    ) {
      const date =
        new Date(startDate);
      date.setDate(
        date.getDate() +
        offset
      );
      const plan =
        swissPlanForDateV180(
          proposal,
          staffId,
          date,
          draftMonth
        );
      if (!plan) {
        const monthKey =
          `${date.getFullYear()}-${String(
            date.getMonth()+1
          ).padStart(2,'0')}`;
        if (
          monthKey !== draftMonth
        ) {
          const ts =
            typeof getTs ===
              'function'
              ? getTs()
              : {};
          if (
            !(
              ts?.[monthKey]?.[staffId] ||
              ts?.[monthKey]?.[
                String(staffId)
              ]
            )
          ) {
            complete = false;
          }
        }
        continue;
      }
      if (
        swissActualWorkV180(
          plan
        )
      ) {
        total +=
          Number(
            typeof calculateNet ===
              'function'
              ? calculateNet(plan)
              : 0
          ) || 0;
      }
    }
    return {
      total,
      complete
    };
  }
  function swissConsecutiveRunEndingV180(
    proposal,
    staffId,
    endDate,
    draftMonth,
    maxDays = 8
  ) {
    const dates = [];
    for (
      let offset = 0;
      offset < maxDays;
      offset++
    ) {
      const d =
        new Date(endDate);
      d.setDate(
        d.getDate() -
        offset
      );
      const plan =
        swissPlanForDateV180(
          proposal,
          staffId,
          d,
          draftMonth
        );
      if (
        !swissActualWorkV180(
          plan
        )
      ) {
        break;
      }
      dates.unshift(
        new Date(d)
      );
    }
    return dates;
  }
  function swissSevenDayRunValidV180(
    proposal,
    staff,
    endDate,
    draftMonth
  ) {
    const run =
      swissConsecutiveRunEndingV180(
        proposal,
        staff.id,
        endDate,
        draftMonth,
        8
      );
    if (
      run.length !== 7
    ) {
      return {
        valid:false,
        reason:
          run.length > 7
            ? 'plus de 7 jours consécutifs'
            : 'séquence de 7 jours absente'
      };
    }
    for (const date of run) {
      const plan =
        swissPlanForDateV180(
          proposal,
          staff.id,
          date,
          draftMonth
        );
      const metrics =
        swissPlanMetricsV180(
          plan
        );
      if (
        metrics.hours >
        9 + 0.01
      ) {
        return {
          valid:false,
          reason:
            `plus de 9 h/jour dans la séquence de 7 jours`
        };
      }
    }
    const rest =
      swissRestAfterDateV180(
        proposal,
        staff.id,
        endDate,
        draftMonth,
        8
      );
    if (!rest.verifiable) {
      return {
        valid:false,
        reason:
          'repos de 83 h impossible à vérifier faute de planning adjacent'
      };
    }
    if (
      Number(rest.hours) <
      83 - 0.01
    ) {
      return {
        valid:false,
        reason:
          `repos après le 7e jour ${Number(rest.hours).toFixed(1)} h < 83 h`
      };
    }
    const fortnight =
      swissHoursRangeV180(
        proposal,
        staff.id,
        run[0],
        14,
        draftMonth
      );
    if (!fortnight.complete) {
      return {
        valid:false,
        reason:
          'moyenne sur 2 semaines impossible à vérifier faute d’historique adjacent'
      };
    }
    if (
      fortnight.total >
      100 + 0.01
    ) {
      return {
        valid:false,
        reason:
          `${fortnight.total.toFixed(1)} h sur 2 semaines > 100 h`
      };
    }
    return {
      valid:true,
      run,
      restHours:
        rest.hours,
      fortnightHours:
        fortnight.total
    };
  }
  window.assistantSwissWeekCoveredBySevenDayExceptionV180 =
    function(
      proposal,
      staff,
      monday,
      draftMonth,
      settings
    ) {
      if (
        settings
          ?.planningSwissSevenDayException !==
        true
      ) {
        return false;
      }
      for (
        let offset = -1;
        offset <= 7;
        offset++
      ) {
        const end =
          new Date(monday);
        end.setDate(
          end.getDate() +
          offset
        );
        const result =
          swissSevenDayRunValidV180(
            proposal,
            staff,
            end,
            draftMonth
          );
        if (result.valid) {
          const sunday =
            new Date(monday);
          sunday.setDate(
            sunday.getDate() +
            6
          );
          if (
            result.run.some(
              d =>
                d >= monday &&
                d <= sunday
            )
          ) {
            return true;
          }
        }
      }
      return false;
    };
  function swissAdultOrProtectedProfileV180(
    settings,
    staff
  ) {
    const type =
      String(
        settings
          ?.planningLegalEstablishmentType ||
        'standard'
      ).toLowerCase();
    const weeklyReference =
      type === 'seasonal'
        ? 43.5
        : type === 'small'
          ? 45
          : 42;
    const payroll =
      swissProfileForV180(
        staff
      );
    const age =
      swissAgeAtV180(
        payroll.birthDate
      );
    const young =
      Number.isFinite(age) &&
      age < 18;
    const protection =
      swissProtectionStatusV180(
        staff
      );
    const pregnancyOrBreastfeeding =
      [
        'pregnant',
        'pregnant_standing_4plus',
        'pregnant_standing_6plus',
        'pregnant_8plus',
        'breastfeeding'
      ].includes(
        protection
      );
    const standing4plus =
      [
        'pregnant_standing_4plus',
        'pregnant_standing_6plus'
      ].includes(
        protection
      );
    return {
      country:'CH',
      framework:
        'CCNT + LTr + OLT 1/2',
      legalRole:
        'CH_HOSPITALITY',
      weeklyReference,
      weeklyMax:50,
      rolling12AverageMax:null,
      dailyMax:
        protection ===
          'postpartum_lt8w'
          ? 0
          : protection ===
              'pregnant_standing_6plus'
            ? 4
            : (
                young ||
                pregnancyOrBreastfeeding
                  ? 9
                  : null
              ),
      dailyRestMin:
        young ||
        standing4plus
          ? 12
          : 11,
      weeklyRestDays:2,
      maxConsecutiveDays:
        settings
          ?.planningSwissSevenDayException ===
        true
          ? 7
          : 6,
      maxSpanHours:
        young
          ? 12
          : 14,
      minPauseMealMinutes:30,
      scheduleNoticeDays:
        type === 'seasonal'
          ? 7
          : 14,
      establishmentType:type,
      swissSevenDayException:
        settings
          ?.planningSwissSevenDayException ===
        true,
      young,
      age,
      apprentice:
        swissIsApprenticeV180(
          staff
        ),
      protection,
      postpartumConsent:
        payroll
          .chPostpartumConsent ===
        true,
      familyObligations:
        payroll
          .chFamilyObligations ===
        true
    };
  }
  // Remplace uniquement la partie Suisse du profil légal.
  const originalLegalProfileV180 =
    window.assistantLegalProfileV142;
  if (
    typeof originalLegalProfileV180 ===
    'function'
  ) {
    window.assistantLegalProfileV142 =
      function(settings, staff) {
        const country =
          String(
            settings
              ?.planningLegalCountry ||
            (
              String(
                settings?.currency || ''
              ).toUpperCase() ===
              'EUR'
                ? 'FR'
                : 'CH'
            )
          ).toUpperCase();
        if (country === 'FR') {
          return originalLegalProfileV180(
            settings,
            staff
          );
        }
        return swissAdultOrProtectedProfileV180(
          settings,
          staff
        );
      };
  }
  function swissSpecificPlanIssuesV180(
    staff,
    plan,
    dateObj,
    settings
  ) {
    const blockers = [];
    const warnings = [];
    if (
      !swissActualWorkV180(
        plan
      )
    ) {
      return {
        blockers,
        warnings
      };
    }
    const profile =
      assistantLegalProfileV142(
        settings,
        staff
      );
    const metrics =
      swissPlanMetricsV180(
        plan
      );
    const requiredPause =
      swissRequiredPauseV180(
        metrics.hours
      );
    if (
      requiredPause > 0 &&
      metrics.breakMinutes <
        requiredPause
    ) {
      blockers.push(
        `${staff.name} · ${dateObj.toLocaleDateString('fr-CH')} : pause ${Math.round(metrics.breakMinutes)} min < minimum ${requiredPause} min.`
      );
    }
    // Travail de nuit : 9 h max dans un espace de 10 h.
    if (
      metrics.nightMinutes > 0
    ) {
      if (
        metrics.hours >
        9 + 0.01
      ) {
        blockers.push(
          `${staff.name} · ${dateObj.toLocaleDateString('fr-CH')} : travail de nuit avec plus de 9 h de travail.`
        );
      }
      if (
        metrics.spanHours >
        10 + 0.01
      ) {
        blockers.push(
          `${staff.name} · ${dateObj.toLocaleDateString('fr-CH')} : travail de nuit dans une amplitude > 10 h.`
        );
      }
      warnings.push(
        `${staff.name} · ${dateObj.toLocaleDateString('fr-CH')} : travail de nuit détecté ; contrôler la compensation légale applicable (temporaire / régulier).`
      );
    }
    if (profile.young) {
      if (
        metrics.hours >
        9 + 0.01
      ) {
        blockers.push(
          `${staff.name} · jeune travailleur : plus de 9 h/jour.`
        );
      }
      if (
        metrics.spanHours >
        12 + 0.01
      ) {
        blockers.push(
          `${staff.name} · jeune travailleur : journée, pauses comprises, > 12 h.`
        );
      }
      const latestAllowed =
        Number(profile.age) < 16
          ? 20 * 60
          : 22 * 60;
      if (
        metrics.lastEnd !== null &&
        metrics.lastEnd >
        latestAllowed
      ) {
        blockers.push(
          `${staff.name} · jeune travailleur : fin prévue après ${Number(profile.age) < 16 ? '20h00' : '22h00'}.`
        );
      }
    }
    if (
      profile.protection ===
      'postpartum_lt8w'
    ) {
      blockers.push(
        `${staff.name} · occupation interdite pendant les 8 semaines suivant l’accouchement.`
      );
    }
    if (
      profile.protection ===
        'postpartum_8_16w' &&
      profile.postpartumConsent !== true
    ) {
      blockers.push(
        `${staff.name} · reprise 8–16 semaines après accouchement : consentement documenté requis.`
      );
    }
    if (
      [
        'pregnant',
        'pregnant_standing_4plus',
        'pregnant_standing_6plus',
        'pregnant_8plus',
        'breastfeeding'
      ].includes(
        profile.protection
      ) &&
      metrics.hours >
        9 + 0.01
    ) {
      blockers.push(
        `${staff.name} · protection grossesse/allaitement : maximum 9 h/jour.`
      );
    }
    if (
      profile.protection ===
        'pregnant_8plus'
    ) {
      if (
        metrics.nightMinutes > 0 ||
        (
          metrics.firstStart !== null &&
          metrics.firstStart <
          6 * 60
        ) ||
        (
          metrics.lastEnd !== null &&
          metrics.lastEnd >
          20 * 60
        )
      ) {
        blockers.push(
          `${staff.name} · grossesse dès le 8e mois : travail entre 20h00 et 06h00 interdit.`
        );
      }
    }
    if (
      profile.protection ===
        'pregnant_standing_6plus' &&
      metrics.hours >
        4 + 0.01
    ) {
      blockers.push(
        `${staff.name} · grossesse dès le 6e mois avec activité principalement debout : maximum 4 h/jour.`
      );
    }
    if (
      profile.protection ===
        'pregnant_standing_4plus'
    ) {
      warnings.push(
        `${staff.name} · activité principalement debout dès le 4e mois : prévoir 10 min de pause supplémentaire toutes les 2 h et 12 h de repos quotidien.`
      );
    }
    if (
      profile.protection ===
        'breastfeeding'
    ) {
      warnings.push(
        `${staff.name} · allaitement : temps rémunéré à réserver selon la durée quotidienne de travail.`
      );
    }
    return {
      blockers,
      warnings
    };
  }
  function swissSalaryIssuesV180(
    staff,
    settings
  ) {
    const blockers = [];
    const warnings = [];
    const payroll =
      swissProfileForV180(
        staff
      );
    if (
      swissIsApprenticeV180(
        staff
      )
    ) {
      warnings.push(
        `${staff.name} · apprenti/apprenant : la CCNT standard ne s’applique pas comme à un collaborateur ordinaire ; appliquer les règles de formation professionnelle et de protection des jeunes.`
      );
      return {
        blockers,
        warnings
      };
    }
    const category =
      String(
        payroll.chLgavCategory ||
        ''
      ).toUpperCase();
    if (!category) {
      warnings.push(
        `${staff.name} · catégorie salariale CCNT Suisse non renseignée : minimum 2026 non vérifiable.`
      );
      return {
        blockers,
        warnings
      };
    }
    const establishment =
      String(
        settings
          ?.planningLegalEstablishmentType ||
        'standard'
      ).toLowerCase();
    const minMonthly =
      Number(
        SWISS_CCNT_MINIMUMS_2026_V180
          .monthly?.[category] ||
        0
      );
    const minHourly =
      Number(
        SWISS_CCNT_MINIMUMS_2026_V180
          .hourly?.[
            ['standard','seasonal','small']
              .includes(establishment)
                ? establishment
                : 'standard'
          ]?.[category] ||
        0
      );
    if (
      payroll.mode === 'monthly'
    ) {
      const salary =
        Number(
          payroll.monthlySalary || 0
        );
      if (
        salary > 0 &&
        minMonthly > 0 &&
        salary + 0.01 <
          minMonthly
      ) {
        blockers.push(
          `${staff.name} · salaire mensuel CHF ${salary.toFixed(2)} < minimum CCNT 2026 CHF ${minMonthly.toFixed(2)} (${category}).`
        );
      }
      if (
        salary <= 0
      ) {
        warnings.push(
          `${staff.name} · salaire mensuel non renseigné : minimum CCNT non vérifiable.`
        );
      }
    } else {
      const rate =
        Number(
          payroll.hourlyRate || 0
        );
      if (
        rate > 0 &&
        minHourly > 0 &&
        rate + 0.001 <
          minHourly
      ) {
        blockers.push(
          `${staff.name} · taux horaire CHF ${rate.toFixed(2)} < base minimale CCNT 2026 CHF ${minHourly.toFixed(2)} (${category}).`
        );
      }
      if (
        rate <= 0
      ) {
        warnings.push(
          `${staff.name} · taux horaire non renseigné : minimum CCNT non vérifiable.`
        );
      }
    }
    return {
      blockers,
      warnings
    };
  }
  function swissSevenDayIssuesV180(
    draft,
    staff,
    settings
  ) {
    const blockers = [];
    const warnings = [];
    const [year, month] =
      String(draft.month)
        .split('-')
        .map(Number);
    const daysInMonth =
      new Date(
        year,
        month,
        0
      ).getDate();
    let consecutive = 0;
    for (
      let day = 1;
      day <= daysInMonth;
      day++
    ) {
      const date =
        new Date(
          year,
          month - 1,
          day
        );
      const plan =
        swissPlanForDateV180(
          draft.proposal,
          staff.id,
          date,
          draft.month
        );
      if (
        !swissActualWorkV180(
          plan
        )
      ) {
        consecutive = 0;
        continue;
      }
      consecutive++;
      if (
        consecutive > 7
      ) {
        blockers.push(
          `${staff.name} · plus de 7 jours de travail consécutifs.`
        );
        continue;
      }
      if (
        consecutive === 7
      ) {
        if (
          settings
            ?.planningSwissSevenDayException !==
          true
        ) {
          blockers.push(
            `${staff.name} · 7e jour consécutif détecté alors que le régime exceptionnel 7 jours n’est pas activé.`
          );
          continue;
        }
        const result =
          swissSevenDayRunValidV180(
            draft.proposal,
            staff,
            date,
            draft.month
          );
        if (!result.valid) {
          blockers.push(
            `${staff.name} · régime 7 jours non conforme : ${result.reason}.`
          );
        } else {
          warnings.push(
            `${staff.name} · régime 7 jours contrôlé : repos ${result.restHours.toFixed(1)} h après le 7e jour ; ${result.fortnightHours.toFixed(1)} h sur 2 semaines.`
          );
        }
      }
    }
    return {
      blockers,
      warnings
    };
  }
  function swissAuditV180(
    draft,
    staffList,
    settings
  ) {
    const blockers = [];
    const warnings = [];
    if (
      String(
        settings
          ?.planningLegalCountry ||
        'CH'
      ).toUpperCase() !==
      'CH'
    ) {
      return {
        blockers,
        warnings
      };
    }
    const [year, month] =
      String(draft.month)
        .split('-')
        .map(Number);
    const daysInMonth =
      new Date(
        year,
        month,
        0
      ).getDate();
    (staffList || [])
      .forEach(staff => {
        const profile =
          assistantLegalProfileV142(
            settings,
            staff
          );
        const salary =
          swissSalaryIssuesV180(
            staff,
            settings
          );
        blockers.push(
          ...salary.blockers
        );
        warnings.push(
          ...salary.warnings
        );
        if (
          profile.apprentice &&
          (
            profile.age === null ||
            !Number.isFinite(
              profile.age
            )
          )
        ) {
          blockers.push(
            `${staff.name} · apprenti/apprenant : date de naissance obligatoire pour contrôler la protection des jeunes.`
          );
        }
        for (
          let day = 1;
          day <= daysInMonth;
          day++
        ) {
          const dateObj =
            new Date(
              year,
              month - 1,
              day
            );
          const plan =
            swissPlanForDateV180(
              draft.proposal,
              staff.id,
              dateObj,
              draft.month
            );
          const issues =
            swissSpecificPlanIssuesV180(
              staff,
              plan,
              dateObj,
              settings
            );
          blockers.push(
            ...issues.blockers
          );
          warnings.push(
            ...issues.warnings
          );
        }
        const sevenDay =
          swissSevenDayIssuesV180(
            draft,
            staff,
            settings
          );
        blockers.push(
          ...sevenDay.blockers
        );
        warnings.push(
          ...sevenDay.warnings
        );
      });
    return {
      blockers:
        Array.from(
          new Set(blockers)
        ),
      warnings:
        Array.from(
          new Set(warnings)
        )
    };
  }
  // Audit final = audit historique + audit Suisse V180.
  const originalAuditV180 =
    window.assistantLegalAuditDraftV142;
  if (
    typeof originalAuditV180 ===
    'function'
  ) {
    window.assistantLegalAuditDraftV142 =
      function(
        draft,
        staffList,
        settings
      ) {
        const base =
          originalAuditV180(
            draft,
            staffList,
            settings
          ) || {
            blockers:[],
            warnings:[]
          };
        if (
          String(
            settings
              ?.planningLegalCountry ||
            'CH'
          ).toUpperCase() !==
          'CH'
        ) {
          return base;
        }
        const swiss =
          swissAuditV180(
            draft,
            staffList,
            settings
          );
        return {
          blockers:
            Array.from(
              new Set([
                ...(base.blockers || []),
                ...swiss.blockers
              ])
            ),
          warnings:
            Array.from(
              new Set([
                ...(base.warnings || []),
                ...swiss.warnings
              ])
            )
        };
      };
  }
  // Contrôle en amont : l'IA ne doit pas proposer un service
  // déjà incompatible avec une protection spéciale Suisse.
  const originalServiceAllowsV180 =
    window.assistantLegalServiceAllowsV142;
  if (
    typeof originalServiceAllowsV180 ===
    'function'
  ) {
    window.assistantLegalServiceAllowsV142 =
      function(
        proposal,
        staff,
        day,
        service,
        dept,
        settings,
        year,
        month
      ) {
        const base =
          originalServiceAllowsV180(
            proposal,
            staff,
            day,
            service,
            dept,
            settings,
            year,
            month
          );
        if (!base?.ok) {
          return base;
        }
        if (
          String(
            settings
              ?.planningLegalCountry ||
            'CH'
          ).toUpperCase() !==
          'CH'
        ) {
          return base;
        }
        const current =
          proposal?.[staff.id]?.[day] ||
          proposal?.[String(staff.id)]?.[day];
        if (!current) {
          return base;
        }
        const simulated =
          typeof assistantClone ===
            'function'
            ? assistantClone(
                current
              )
            : JSON.parse(
                JSON.stringify(
                  current
                )
              );
        assistantSetService(
          simulated,
          service,
          dept,
          settings,
          simulated.obs || ''
        );
        const dateObj =
          new Date(
            year,
            month - 1,
            day
          );
        const issues =
          swissSpecificPlanIssuesV180(
            staff,
            simulated,
            dateObj,
            settings
          );
        if (
          issues.blockers.length
        ) {
          return {
            ok:false,
            reason:
              issues.blockers[0]
          };
        }
        return base;
      };
  }
  // Remplace la règle automatique "6 jours" par une règle
  // CH/FR réellement contextuelle.
  window.assistantEnforceSixDayOffV146 =
    function(
      proposal,
      staffList,
      monthStr,
      settings
    ) {
      const [year, month] =
        String(monthStr)
          .split('-')
          .map(Number);
      const daysInMonth =
        new Date(
          year,
          month,
          0
        ).getDate();
      const horizon =
        typeof assistantPlanningHorizon ===
          'function'
          ? assistantPlanningHorizon(
              monthStr
            )
          : {
              startDay:1
            };
      const country =
        String(
          settings
            ?.planningLegalCountry ||
          'CH'
        ).toUpperCase();
      const maxBeforeForcedOff =
        country === 'CH' &&
        settings
          ?.planningSwissSevenDayException ===
        true
          ? 7
          : 6;
      const forced = [];
      (staffList || [])
        .forEach(staff => {
          let consecutive =
            typeof assistantPreviousMonthTailV146 ===
              'function'
              ? assistantPreviousMonthTailV146(
                  staff.id,
                  year,
                  month,
                  maxBeforeForcedOff
                )
              : 0;
          for (
            let day = 1;
            day <= daysInMonth;
            day++
          ) {
            const plan =
              proposal?.[staff.id]?.[day] ||
              proposal?.[String(staff.id)]?.[day];
            if (!plan) {
              consecutive = 0;
              continue;
            }
            if (
              day <
              horizon.startDay
            ) {
              consecutive =
                swissActualWorkV180(
                  plan
                )
                  ? consecutive + 1
                  : 0;
              continue;
            }
            if (
              !swissActualWorkV180(
                plan
              )
            ) {
              consecutive = 0;
              continue;
            }
            if (
              consecutive >=
              maxBeforeForcedOff
            ) {
              const before =
                JSON.parse(
                  JSON.stringify(
                    plan
                  )
                );
              const target =
                proposal?.[staff.id] ||
                proposal?.[
                  String(staff.id)
                ];
              if (target) {
                target[day] = {
                  ...plan,
                  status:'off',
                  s1:'',
                  s2:'',
                  pause:0,
                  obs:
                    country === 'CH'
                      ? (
                          maxBeforeForcedOff === 7
                            ? 'OFF automatique · plus de 7 jours consécutifs interdits'
                            : 'OFF automatique · régime 7 jours Suisse non activé'
                        )
                      : 'OFF automatique · limite de jours consécutifs',
                  __legalForcedOff:true,
                  __protected:true
                };
              }
              forced.push({
                staffId:
                  String(staff.id),
                staffName:
                  String(
                    staff.name || ''
                  ),
                day,
                before
              });
              consecutive = 0;
              continue;
            }
            consecutive++;
          }
        });
      return forced;
    };
  function refreshSwissLegalUiV180() {
    const country =
      document.getElementById(
        'rh-setting-legal-country'
      )?.value || 'CH';
    const options =
      document.getElementById(
        'v180-swiss-legal-options'
      );
    if (options) {
      options.style.display =
        country === 'CH'
          ? ''
          : 'none';
    }
    const checkbox =
      document.getElementById(
        'rh-setting-ch-seven-day-exception'
      );
    if (checkbox) {
      checkbox.disabled =
        country !== 'CH';
    }
    const badge =
      document.getElementById(
        'v142-legal-status'
      );
    if (
      badge &&
      country === 'CH'
    ) {
      badge.textContent =
        'SUISSE · CCNT + LTr + OLT 1/2';
    }
  }
  document
    .getElementById(
      'rh-setting-legal-country'
    )
    ?.addEventListener(
      'change',
      refreshSwissLegalUiV180
    );
  document
    .getElementById(
      'rh-setting-ch-seven-day-exception'
    )
    ?.addEventListener(
      'change',
      () => {
        if (
          typeof refreshLegalProfileV142 ===
          'function'
        ) {
          refreshLegalProfileV142();
        }
      }
    );
  if (
    document.readyState ===
    'loading'
  ) {
    document.addEventListener(
      'DOMContentLoaded',
      refreshSwissLegalUiV180,
      {
        once:true
      }
    );
  } else {
    refreshSwissLegalUiV180();
  }
  window.ICHEF_SWISS_LEGAL_V180 = {
    version:
      SWISS_LEGAL_VERSION_V180,
    minima2026:
      SWISS_CCNT_MINIMUMS_2026_V180,
    profileFor:
      swissAdultOrProtectedProfileV180,
    audit:
      swissAuditV180,
    sevenDayCheck:
      swissSevenDayRunValidV180
  };
})();


;
/* RH V264 - preserved script #98 */
window.__ICHEF_RH_BUILD__='RH-V180-SWISS-LEGAL-STRICT';
console.info('[iCHEF RH V180] Suisse · CCNT + LTr + OLT 1/2 · conformité stricte');


;
/* RH V264 - preserved script #99 */
(() => {
  'use strict';
  if (window.__ICHEF_RH_V181_FRANCE_LEGAL__) return;
  window.__ICHEF_RH_V181_FRANCE_LEGAL__ = true;
  const VERSION='FR-2026-09-29-HCR-IDCC1979-CODE-TRAVAIL';
  function profiles(){try{return JSON.parse(localStorage.getItem('ichef_payroll_profiles_v2')||'{}')||{}}catch(_){return {}}}
  function pp(staff){const all=profiles();return {birthDate:'',contractType:'',frProtectionStatus:'none',frYoungNightAuthorization:false,frNightWorkerStatus:'auto',frNightCompensationTracked:false,frFamilyNightConflict:false,frApprenticeshipYear:'',...(all?.[staff?.id]||all?.[String(staff?.id)]||{})}}
  function age(staff,at=new Date()){const raw=pp(staff).birthDate;if(!raw)return null;const d=new Date(`${String(raw).slice(0,10)}T12:00:00`);if(Number.isNaN(d.getTime()))return null;let a=at.getFullYear()-d.getFullYear();const md=at.getMonth()-d.getMonth();if(md<0||(md===0&&at.getDate()<d.getDate()))a--;return a}
  function apprentice(staff){return /APPRENT/i.test(`${pp(staff).contractType||''} ${staff?.role||''}`)}
  function role(staff){const t=`${staff?.dept||''} ${staff?.role||''} ${staff?.poste||''}`.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();if(/administratif|admin|comptable|rh|bureau/.test(t)&&!/reception/.test(t))return {code:'ADMIN_OFFSITE',dailyMax:10};if(/cuis|chef|kitchen|plonge|patiss/.test(t))return {code:'COOK',dailyMax:11};if(/reception|front office/.test(t))return {code:'RECEPTION',dailyMax:12};if(/veilleur|night|nuit/.test(t))return {code:'NIGHT',dailyMax:12};if(t.trim())return {code:'OTHER_HCR',dailyMax:11.5};return {code:'UNKNOWN',dailyMax:10}}
  function mins(v){const m=/^(\d{1,2}):(\d{2})$/.exec(String(v||'').trim());if(!m)return null;const h=+m[1],mm=+m[2];if(h<0||h>23||mm<0||mm>59)return null;return h*60+mm}
  function segments(plan){const out=[];[plan?.s1,plan?.s2].filter(Boolean).forEach(raw=>{const x=String(raw).split('-').map(s=>s.trim());if(x.length!==2)return;const s=mins(x[0]);let e=mins(x[1]);if(s===null||e===null)return;if(e<=s)e+=1440;out.push({start:s,end:e})});return out.sort((a,b)=>a.start-b.start)}
  function metrics(plan){const seg=segments(plan);if(!seg.length)return {hours:0,breakMinutes:0,nightMinutes:0,firstStart:null,lastEnd:null};let gaps=0;for(let i=1;i<seg.length;i++)gaps+=Math.max(0,seg[i].start-seg[i-1].end);let night=0;const windows=[[0,420],[1320,1860],[2760,3300]];seg.forEach(r=>windows.forEach(([a,b])=>night+=Math.max(0,Math.min(r.end,b)-Math.max(r.start,a))));return {hours:Number(typeof calculateNet==='function'?calculateNet(plan):0)||0,breakMinutes:gaps+Math.max(0,Number(plan?.pause||0)),nightMinutes:night,firstStart:seg[0].start,lastEnd:Math.max(...seg.map(x=>x.end))}}
  function planFor(proposal,staffId,dateObj,draftMonth){return typeof assistantLegalDatePlanV142==='function'?assistantLegalDatePlanV142(proposal,staffId,dateObj,draftMonth):null}
  function works(plan){return Boolean(plan&&(typeof assistantIsActualWorkDayV146==='function'?assistantIsActualWorkDayV146(plan):(plan.s1||plan.s2)))}
  function legalProfile(settings,staff){const r=role(staff),p=pp(staff),a=age(staff),young=Number.isFinite(a)&&a<18,under16=Number.isFinite(a)&&a<16;return {country:'FR',framework:'HCR IDCC 1979 + Code du travail',legalRole:r.code,legalBaseHours:35,weeklyReference:39,weeklyMax:young?35:48,rolling12AverageMax:young?35:46,nightRolling12AverageMax:44,dailyMax:young?8:r.dailyMax,dailyRestMin:under16?14:young?12:11,weeklyRestDays:2,maxConsecutiveDays:young?5:6,maxSpanHours:null,minPauseAfterSixHours:20,scheduleNoticeDays:settings?.planningFranceWorkTimeMode==='annualized'?15:null,scheduleChangeNoticeDays:settings?.planningFranceWorkTimeMode==='annualized'?8:null,annualReferenceHours:settings?.planningFranceWorkTimeMode==='annualized'?1607:null,workTimeMode:settings?.planningFranceWorkTimeMode||'weekly',establishmentType:String(settings?.planningLegalEstablishmentType||'permanent').toLowerCase(),young,under16,age:a,apprentice:apprentice(staff),protection:String(p.frProtectionStatus||'none'),youngNightAuthorization:p.frYoungNightAuthorization===true,nightCompensationTracked:p.frNightCompensationTracked===true,familyNightConflict:p.frFamilyNightConflict===true}}
  const priorProfile=window.assistantLegalProfileV142;
  if(typeof priorProfile==='function')window.assistantLegalProfileV142=function(settings,staff){const c=String(settings?.planningLegalCountry||'CH').toUpperCase();return c==='FR'?legalProfile(settings,staff):priorProfile(settings,staff)};
  function nightHours(plan){return metrics(plan).nightMinutes/60}
  function isNightWorker(proposal,staff,dateObj,draftMonth){const p=pp(staff);if(p.frNightWorkerStatus==='yes')return true;if(p.frNightWorkerStatus==='no')return false;const monday=new Date(dateObj);monday.setDate(monday.getDate()-((monday.getDay()+6)%7));let n=0;for(let i=0;i<7;i++){const d=new Date(monday);d.setDate(d.getDate()+i);if(nightHours(planFor(proposal,staff.id,d,draftMonth))>=3-.001)n++}return n>=2}
  function restHours(proposal,staff,prevDate,nextDate,draftMonth){const a=planFor(proposal,staff.id,prevDate,draftMonth),b=planFor(proposal,staff.id,nextDate,draftMonth);if(!works(a)||!works(b))return Infinity;const ma=metrics(a),mb=metrics(b);if(ma.lastEnd===null||mb.firstStart===null)return Infinity;const end=new Date(prevDate.getFullYear(),prevDate.getMonth(),prevDate.getDate());end.setMinutes(ma.lastEnd);const start=new Date(nextDate.getFullYear(),nextDate.getMonth(),nextDate.getDate());start.setMinutes(mb.firstStart);return (start-end)/3600000}
  function dayAudit(draft,staff,dateObj,settings){const blockers=[],warnings=[],plan=planFor(draft.proposal,staff.id,dateObj,draft.month);if(!works(plan))return {blockers,warnings};const pr=legalProfile(settings,staff),m=metrics(plan);if(m.hours>pr.dailyMax+.01)blockers.push(`${staff.name} · ${dateObj.toLocaleDateString('fr-FR')} : ${m.hours.toFixed(1)} h > maximum journalier ${pr.dailyMax} h.`);if(m.hours>=6-.001&&m.breakMinutes<20-.001)blockers.push(`${staff.name} · ${dateObj.toLocaleDateString('fr-FR')} : pause ${Math.round(m.breakMinutes)} min < 20 min.`);
    if(pr.young){if(m.hours>8+.01)blockers.push(`${staff.name} · moins de 18 ans : plus de 8 h/jour.`);if(pr.under16){if((m.firstStart!==null&&m.firstStart<6*60)||(m.lastEnd!==null&&m.lastEnd>20*60))blockers.push(`${staff.name} · moins de 16 ans : travail entre 20h00 et 06h00 interdit.`)}else{if((m.firstStart!==null&&m.firstStart<6*60)||(m.lastEnd!==null&&m.lastEnd>22*60&&pr.youngNightAuthorization!==true))blockers.push(`${staff.name} · 16–17 ans : travail de nuit interdit sans dérogation documentée.`);if(pr.youngNightAuthorization===true&&m.lastEnd!==null&&m.lastEnd>23*60+30)blockers.push(`${staff.name} · dérogation jeune HCR : fin après 23h30 interdite.`)}}
    if(pr.protection==='postpartum_lt6w')blockers.push(`${staff.name} · moins de 6 semaines après l’accouchement : emploi interdit.`);
    if(['pregnant_night_day_request','pregnant_night_medical'].includes(pr.protection)&&m.nightMinutes>0)blockers.push(`${staff.name} · grossesse : affectation de jour requise, travail de nuit planifié.`);
    if(pr.protection==='pregnant'&&m.nightMinutes>0)warnings.push(`${staff.name} · grossesse + travail de nuit : contrôler le droit à affectation de jour et l’avis de la médecine du travail.`);
    if(pr.protection==='breastfeeding')warnings.push(`${staff.name} · allaitement : réserver le temps légal d’allaitement pendant la première année de l’enfant.`);
    if(isNightWorker(draft.proposal,staff,dateObj,draft.month)&&m.nightMinutes>0){if(m.hours>8+.01&&pr.nightCompensationTracked!==true)blockers.push(`${staff.name} · travailleur de nuit : journée > 8 h sans repos équivalent suivi.`);if(pr.familyNightConflict)warnings.push(`${staff.name} · obligations familiales incompatibles avec la nuit déclarées : demande d’affectation de jour à traiter.`)}
    return {blockers,warnings};
  }
  function isolatedRestAudit(draft,staff,dateObj){const cur=planFor(draft.proposal,staff.id,dateObj,draft.month);if(works(cur))return null;const prev=new Date(dateObj),next=new Date(dateObj);prev.setDate(prev.getDate()-1);next.setDate(next.getDate()+1);const a=planFor(draft.proposal,staff.id,prev,draft.month),b=planFor(draft.proposal,staff.id,next,draft.month);if(!works(a)||!works(b))return null;const h=restHours(draft.proposal,staff,prev,next,draft.month);return h<35-.01?`${staff.name} · ${dateObj.toLocaleDateString('fr-FR')} : repos isolé ${h.toFixed(1)} h < 35 h consécutives.`:null}
  function audit(draft,staffList,settings){const blockers=[],warnings=[];if(String(settings?.planningLegalCountry||'').toUpperCase()!=='FR')return {blockers,warnings};if(settings?.planningFranceWorkTimeMode==='annualized'){if(settings?.planningFranceAnnualizationValidated!==true)blockers.push('France HCR · aménagement > 4 semaines : accord / période de référence non validés.');if(settings?.planningFranceNoticeValidated!==true)blockers.push('France HCR · aménagement > 4 semaines : prévenance du planning non validée.');warnings.push('France HCR · aménagement du temps de travail : plafond de référence 1 607 h à suivre sur la période complète.')}const [y,m]=String(draft.month).split('-').map(Number),days=new Date(y,m,0).getDate();(staffList||[]).forEach(staff=>{const pr=legalProfile(settings,staff);if(pr.legalRole==='UNKNOWN')blockers.push(`${staff.name} · fonction/poste insuffisamment renseigné pour appliquer le maximum journalier HCR.`);if((pr.young||pr.apprentice)&&!Number.isFinite(pr.age))blockers.push(`${staff.name} · jeune/apprenti : date de naissance obligatoire.`);for(let day=1;day<=days;day++){const d=new Date(y,m-1,day),z=dayAudit(draft,staff,d,settings);blockers.push(...z.blockers);warnings.push(...z.warnings);const rest=isolatedRestAudit(draft,staff,d);if(rest)blockers.push(rest)}for(let day=1;day<=days;day++){const d=new Date(y,m-1,day);if(d.getDay()!==1||!isNightWorker(draft.proposal,staff,d,draft.month))continue;if(typeof assistantLegalHasReliableHistoryV145==='function'&&!assistantLegalHasReliableHistoryV145(staff,d,12)){blockers.push(`${staff.name} · travailleur de nuit : historique insuffisant pour vérifier la moyenne de 44 h sur 12 semaines.`);continue}if(typeof assistantLegalRolling12AverageV143==='function'){const avg=assistantLegalRolling12AverageV143(draft.proposal,staff.id,d.getFullYear(),d.getMonth()+1,d.getDate());if(Number.isFinite(avg)&&avg>44+.01)blockers.push(`${staff.name} · travailleur de nuit : moyenne ${avg.toFixed(1)} h sur 12 semaines > 44 h.`)}}});return {blockers:[...new Set(blockers)],warnings:[...new Set(warnings)]}}
  const priorAudit=window.assistantLegalAuditDraftV142;
  if(typeof priorAudit==='function')window.assistantLegalAuditDraftV142=function(draft,staffList,settings){const base=priorAudit(draft,staffList,settings)||{blockers:[],warnings:[]};if(String(settings?.planningLegalCountry||'').toUpperCase()!=='FR')return base;const fr=audit(draft,staffList,settings);return {blockers:[...new Set([...(base.blockers||[]),...fr.blockers])],warnings:[...new Set([...(base.warnings||[]),...fr.warnings])]}};
  const priorAllows=window.assistantLegalServiceAllowsV142;
  if(typeof priorAllows==='function')window.assistantLegalServiceAllowsV142=function(proposal,staff,day,service,dept,settings,year,month){const base=priorAllows(proposal,staff,day,service,dept,settings,year,month);if(!base?.ok||String(settings?.planningLegalCountry||'').toUpperCase()!=='FR')return base;const current=proposal?.[staff.id]?.[day]||proposal?.[String(staff.id)]?.[day];if(!current)return base;const sim=typeof assistantClone==='function'?assistantClone(current):JSON.parse(JSON.stringify(current));assistantSetService(sim,service,dept,settings,sim.obs||'');const fake={month:`${year}-${String(month).padStart(2,'0')}`,proposal:{...proposal,[staff.id]:{...(proposal?.[staff.id]||{}),[day]:sim}}};const z=dayAudit(fake,staff,new Date(year,month-1,day),settings);return z.blockers.length?{ok:false,reason:z.blockers[0]}:base};
  function refresh(){const country=document.getElementById('rh-setting-legal-country')?.value||'CH',fr=country==='FR';const frO=document.getElementById('v181-france-legal-options'),frR=document.getElementById('v181-france-status-rules'),chO=document.getElementById('v180-swiss-legal-options'),chR=document.getElementById('v180-swiss-status-rules');if(frO)frO.hidden=!fr;if(frR)frR.hidden=!fr;if(chO)chO.hidden=fr;if(chR)chR.hidden=fr;const badge=document.getElementById('v142-legal-status');if(badge&&fr)badge.textContent='FRANCE · HCR IDCC 1979 + CODE DU TRAVAIL'}
  ['rh-setting-legal-country','rh-setting-fr-worktime-mode','rh-setting-fr-annualization-validated','rh-setting-fr-notice-validated'].forEach(id=>document.getElementById(id)?.addEventListener('change',()=>{refresh();if(typeof refreshLegalProfileV142==='function')refreshLegalProfileV142()}));
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',refresh,{once:true});else refresh();
  window.ICHEF_FRANCE_LEGAL_V181={version:VERSION,profile:legalProfile,audit};
})();


;
/* RH V264 - preserved script #100 */
window.__ICHEF_RH_BUILD__='RH-V181-FRANCE-HCR-LEGAL-STRICT';
console.info('[iCHEF RH V181] France · HCR IDCC 1979 + Code du travail · conformité stricte');


;
/* RH V264 - preserved script #101 */
window.__ICHEF_RH_BUILD__='RH-V182-GLOBAL-READABILITY';
console.info('[iCHEF RH V182] lisibilité et confort global des paramètres');


;
/* RH V264 - preserved script #102 */
window.__ICHEF_RH_BUILD__='RH-V183-RATIOS-VISIBLE';
console.info('[iCHEF RH V183] ratios et brigades rendus pleinement visibles');


;
/* RH V264 - preserved script #103 */
window.__ICHEF_RH_BUILD__='RH-V184-CARDS-ORDER-1-6';
console.info('[iCHEF RH V184] cartes en ordre croissant 1 à 6');


;
/* RH V264 - preserved script #104 */
(() => {
  'use strict';
  if (window.__ICHEF_RH_V185_AUTO_COUNTRY__) return;
  window.__ICHEF_RH_V185_AUTO_COUNTRY__ = true;
  const VERSION = 'RH-V189-SALARY-HOURLY-INFO';
  let applying = false;
  let lastDetected = null;
  const SOURCES = {
    CH: [
      {
        label: 'CCNT hôtels, restaurants et cafés · Convention actuelle',
        authority: 'Office de contrôle de la CCNT / L-GAV',
        url: 'https://l-gav.ch/fr/convention-actuelle'
      },
      {
        label: 'Durée du travail et du repos · LTr / OLT',
        authority: 'SECO · Confédération suisse',
        url: 'https://www.seco.admin.ch/fr/duree-du-travail-et-du-repos'
      },
      {
        label: 'Protection des jeunes travailleurs',
        authority: 'SECO · Confédération suisse',
        url: 'https://www.seco.admin.ch/fr/faq-protection-des-jeunes-travailleurs'
      },
      {
        label: 'Maternité / protection de la grossesse',
        authority: 'SECO · Confédération suisse',
        url: 'https://www.seco.admin.ch/fr/maternite'
      }
    ],
    FR: [
      {
        label: 'Convention collective HCR · IDCC 1979',
        authority: 'Légifrance',
        url: 'https://www.legifrance.gouv.fr/conv_coll/id/KALICONT000005635534'
      },
      {
        label: 'Durée et aménagement du temps de travail HCR',
        authority: 'Légifrance · Convention HCR',
        url: 'https://www.legifrance.gouv.fr/conv_coll/id/KALISCTA000005747435'
      },
      {
        label: 'Durée et temps de travail',
        authority: 'Ministère du Travail',
        url: 'https://travail-emploi.gouv.fr/droit-du-travail/duree-et-temps-de-travail'
      },
      {
        label: 'Travail de nuit',
        authority: 'Ministère du Travail',
        url: 'https://travail-emploi.gouv.fr/le-travail-de-nuit'
      },
      {
        label: 'Jeunes de moins de 18 ans',
        authority: 'Ministère du Travail',
        url: 'https://travail-emploi.gouv.fr/le-temps-de-travail-des-jeunes-de-moins-de-18-ans'
      }
    ]
  };
  function normalizeCountry(value) {
    const raw = String(value ?? '')
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g,'')
      .toUpperCase();
    if (!raw) return '';
    if (
      raw === 'FR' ||
      raw === 'FRA' ||
      raw === 'FRANCE' ||
      raw.includes('FRANCE')
    ) {
      return 'FR';
    }
    if (
      raw === 'CH' ||
      raw === 'CHE' ||
      raw === 'SUISSE' ||
      raw === 'SWITZERLAND' ||
      raw === 'SCHWEIZ' ||
      raw === 'SVIZZERA' ||
      raw.includes('SUISSE') ||
      raw.includes('SWITZERLAND') ||
      raw.includes('SCHWEIZ')
    ) {
      return 'CH';
    }
    return '';
  }
  function normalizeCurrency(value) {
    const raw = String(value ?? '').trim().toUpperCase();
    if (raw === 'EUR' || raw === '€') return 'FR';
    if (raw === 'CHF') return 'CH';
    return '';
  }
  function valueByKeys(obj, keys) {
    if (!obj || typeof obj !== 'object') return '';
    for (const key of keys) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const country = normalizeCountry(obj[key]);
        if (country) return country;
      }
    }
    return '';
  }
  function currencyByKeys(obj, keys) {
    if (!obj || typeof obj !== 'object') return '';
    for (const key of keys) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const country = normalizeCurrency(obj[key]);
        if (country) return country;
      }
    }
    return '';
  }
  function detectFromConfigObject(obj, label) {
    if (!obj || typeof obj !== 'object') return null;
    const countryKeys = [
      'countryCode','country_code','country','pays',
      'companyCountry','company_country',
      'establishmentCountry','establishment_country',
      'businessCountry','business_country',
      'clientCountry','client_country',
      'tenantCountry','tenant_country',
      'legalCountry','legal_country'
    ];
    const currencyKeys = [
      'currency','devise','currencyCode','currency_code'
    ];
    const direct = valueByKeys(obj, countryKeys);
    if (direct) {
      return {
        country: direct,
        source: label + ' · pays'
      };
    }
    const currency = currencyByKeys(obj, currencyKeys);
    if (currency) {
      return {
        country: currency,
        source: label + ' · devise'
      };
    }
    return null;
  }
  function detectFromLiveState(state) {
    if (!state || typeof state !== 'object') return null;
    const directObjects = [
      ['État client', state],
      ['Tenant', state.tenant],
      ['Client', state.client],
      ['Établissement', state.establishment],
      ['Entreprise', state.company],
      ['Business', state.business],
      ['Configuration', state.settings],
      ['Profil', state.profile]
    ];
    for (const [label, obj] of directObjects) {
      const found = detectFromConfigObject(obj, label);
      if (found) return found;
    }
    const active = state.activeOrders || {};
    const likelyKeys = Object.keys(active).filter(key =>
      /(CLIENT|TENANT|BUSINESS|COMPANY|ESTABLISH|SETTING|CONFIG|PROFILE|VENUE|RESTAURANT|HOTEL)/i
        .test(String(key))
    );
    for (const key of likelyKeys) {
      const node = active[key];
      const payload =
        node && typeof node === 'object' && 'data' in node
          ? node.data
          : node;
      const found = detectFromConfigObject(
        payload,
        `Serveur · ${key}`
      );
      if (found) return found;
    }
    return null;
  }
  function detectFromLocalClientConfig() {
    const countryKeys = [
      'ichef_client_country',
      'ichef_establishment_country',
      'ichef_company_country',
      'ichef_business_country',
      'ichef_country',
      'client_country',
      'establishment_country'
    ];
    for (const key of countryKeys) {
      const value = localStorage.getItem(key);
      const country = normalizeCountry(value);
      if (country) {
        return {
          country,
          source: `Fiche client locale · ${key}`
        };
      }
    }
    // Paramètres paie = configuration entreprise, meilleure source que la devise RH.
    try {
      const payroll =
        JSON.parse(
          localStorage.getItem(
            'ichef_payroll_settings_v2'
          ) || '{}'
        ) || {};
      const direct = normalizeCountry(payroll.country);
      if (direct) {
        return {
          country: direct,
          source: 'Configuration entreprise / paie'
        };
      }
      const byCurrency = normalizeCurrency(payroll.currency);
      if (byCurrency) {
        return {
          country: byCurrency,
          source: 'Configuration entreprise / paie · devise'
        };
      }
    } catch (_) {}
    return null;
  }
  function detectFromCashState(state) {
    try {
      const rows =
        state?.activeOrders?.FINANCIAL_HISTORY?.data;
      if (!Array.isArray(rows)) return null;
      const currencies = rows
        .slice(-100)
        .map(tx =>
          tx?.currency ||
          tx?.details?.currency ||
          tx?.payment?.currency
        )
        .filter(Boolean);
      const eur = currencies.filter(v => normalizeCurrency(v) === 'FR').length;
      const chf = currencies.filter(v => normalizeCurrency(v) === 'CH').length;
      if (eur > chf && eur > 0) {
        return {
          country:'FR',
          source:'Caisse iCHEF · devise EUR'
        };
      }
      if (chf > eur && chf > 0) {
        return {
          country:'CH',
          source:'Caisse iCHEF · devise CHF'
        };
      }
    } catch (_) {}
    return null;
  }
  function detectFallback() {
    const settings =
      typeof getRhSettings === 'function'
        ? getRhSettings()
        : {};
    const currency =
      normalizeCurrency(settings.currency);
    if (currency) {
      return {
        country:currency,
        source:'Paramètres établissement · devise (secours)'
      };
    }
    const saved =
      normalizeCountry(settings.planningLegalCountry);
    if (saved) {
      return {
        country:saved,
        source:'Droit précédemment enregistré (secours)'
      };
    }
    return {
      country:'CH',
      source:'Valeur de secours · Suisse'
    };
  }
  function detectClientCountry(state) {
    return (
      detectFromLiveState(state) ||
      detectFromLocalClientConfig() ||
      detectFromCashState(state) ||
      detectFallback()
    );
  }
  function sourceLabel(country) {
    return country === 'FR'
      ? 'FRANCE · HCR IDCC 1979 + CODE DU TRAVAIL'
      : 'SUISSE · CCNT + LTr + OLT 1/2';
  }
  function renderSources(country, detectedSource) {
    const title =
      document.getElementById(
        'v185-legal-source-country'
      );
    const list =
      document.getElementById(
        'v185-legal-source-list'
      );
    const detection =
      document.getElementById(
        'v185-legal-detection-source'
      );
    if (title) {
      title.textContent =
        country === 'FR'
          ? 'Client France · références françaises actives'
          : 'Client Suisse · références suisses actives';
    }
    if (list) {
      list.innerHTML =
        (SOURCES[country] || [])
          .map(item => `
            <a
              class="v185-source-card"
              href="${item.url}"
              target="_blank"
              rel="noopener noreferrer"
            >
              <strong>${item.label}</strong>
              <span>${item.authority}</span>
            </a>
          `)
          .join('');
    }
    if (detection) {
      detection.innerHTML =
        `<b>Pays appliqué automatiquement :</b> ` +
        `${country === 'FR' ? 'France' : 'Suisse'} · ` +
        `<span>source de détection : ${String(detectedSource || 'configuration client')}</span>`;
    }
  }
  function renderAutoBadge(country, source) {
    const badge =
      document.getElementById(
        'v185-country-auto-badge'
      );
    if (!badge) return;
    badge.dataset.country = country;
    badge.textContent =
      country === 'FR'
        ? 'AUTO · CLIENT FRANCE'
        : 'AUTO · CLIENT SUISSE';
    badge.title =
      `Détecté depuis : ${source || 'configuration client'}`;
  }
  function syncPayrollCountry(country) {
    try {
      const key = 'ichef_payroll_settings_v2';
      const current =
        JSON.parse(
          localStorage.getItem(key) || '{}'
        ) || {};
      const desiredCurrency =
        country === 'FR'
          ? 'EUR'
          : 'CHF';
      const next = {
        ...current,
        country,
        currency:
          current.currency &&
          ['EUR','CHF'].includes(
            String(current.currency).toUpperCase()
          )
            ? (
                String(current.country || '').toUpperCase() === country
                  ? current.currency
                  : desiredCurrency
              )
            : desiredCurrency,
        autoCountryFromTenant:true,
        autoCountryUpdatedAt:
          new Date().toISOString()
      };
      localStorage.setItem(
        key,
        JSON.stringify(next)
      );
    } catch (_) {}
  }
  function compatibleEstablishmentType(country, current) {
    const value = String(current || '').toLowerCase();
    if (country === 'FR') {
      return ['permanent','seasonal'].includes(value)
        ? value
        : 'permanent';
    }
    return ['standard','seasonal','small'].includes(value)
      ? value
      : 'standard';
  }
  function applyCountry(country, source, options = {}) {
    if (applying) return;
    const safeCountry =
      country === 'FR'
        ? 'FR'
        : 'CH';
    const select =
      document.getElementById(
        'rh-setting-legal-country'
      );
    const type =
      document.getElementById(
        'rh-setting-legal-establishment'
      );
    if (!select) return;
    const previous = select.value;
    select.value = safeCountry;
    select.disabled = true;
    select.setAttribute('aria-disabled','true');
    renderAutoBadge(
      safeCountry,
      source
    );
    renderSources(
      safeCountry,
      source
    );
    const badge =
      document.getElementById(
        'v142-legal-status'
      );
    if (badge) {
      badge.textContent =
        sourceLabel(safeCountry);
    }
    if (
      typeof refreshLegalProfileV142 === 'function'
    ) {
      refreshLegalProfileV142(
        compatibleEstablishmentType(
          safeCountry,
          type?.value
        )
      );
    }
    // Les scripts historiques peuvent essayer de réécrire le pays :
    // on réimpose toujours le pays du client après le refresh.
    select.value = safeCountry;
    select.disabled = true;
    if (
      previous !== safeCountry ||
      options.forcePersist === true
    ) {
      applying = true;
      try {
        const settings =
          typeof getRhSettings === 'function'
            ? getRhSettings()
            : {};
        const newType =
          compatibleEstablishmentType(
            safeCountry,
            type?.value ||
            settings.planningLegalEstablishmentType
          );
        if (type) {
          type.value = newType;
        }
        if (
          typeof saveRhSettings === 'function'
        ) {
          saveRhSettings({
            ...settings,
            planningLegalCountry:
              safeCountry,
            planningLegalFramework:
              safeCountry === 'FR'
                ? 'FR_HCR'
                : 'CH_CCNT',
            planningLegalEstablishmentType:
              newType,
            planningLegalCountryAuto:
              true,
            planningLegalCountrySource:
              String(source || 'tenant'),
            planningLegalReferenceDate:
              '2026-09-29'
          });
        }
        syncPayrollCountry(
          safeCountry
        );
        try {
          localStorage.setItem(
            `ichef_client_country_detected_v185_${String(
              typeof tenantID_JS !== 'undefined'
                ? tenantID_JS
                : 'default'
            )}`,
            JSON.stringify({
              country:safeCountry,
              source,
              updatedAt:
                new Date().toISOString()
            })
          );
        } catch (_) {}
      } finally {
        applying = false;
      }
    }
    lastDetected = {
      country:safeCountry,
      source
    };
  }
  async function detectAndApply(state, options = {}) {
    const detected =
      detectClientCountry(
        state ||
        window.ICHEF_LIVE_STATE
      );
    applyCountry(
      detected.country,
      detected.source,
      options
    );
    return detected;
  }
  async function refreshFromServer() {
    try {
      if (
        typeof API !== 'undefined' &&
        API &&
        typeof API.getState === 'function'
      ) {
        const state =
          await API.getState();
        if (state) {
          window.ICHEF_LIVE_STATE =
            state;
          return await detectAndApply(
            state,
            {
              forcePersist:true
            }
          );
        }
      }
    } catch (error) {
      console.warn(
        '[iCHEF RH V185] détection pays serveur indisponible, utilisation configuration locale.',
        error?.message || error
      );
    }
    return await detectAndApply(
      null,
      {
        forcePersist:true
      }
    );
  }
  // Bloque les changements manuels : le pays suit le client.
  function lockCountryControl() {
    const select =
      document.getElementById(
        'rh-setting-legal-country'
      );
    if (!select) return;
    select.disabled = true;
    select.setAttribute(
      'aria-disabled',
      'true'
    );
    select.title =
      'Automatique : le droit applicable suit le pays de l’établissement client.';
  }
  // Si un ancien script change le select, on restaure le pays client.
  document.addEventListener(
    'change',
    event => {
      if (
        event.target?.id ===
        'rh-setting-legal-country'
      ) {
        event.preventDefault();
        if (lastDetected) {
          applyCountry(
            lastDetected.country,
            lastDetected.source
          );
        }
      }
    },
    true
  );
  window.addEventListener(
    'ichef:updateState',
    event => {
      detectAndApply(
        event.detail
      );
    }
  );
  window.addEventListener(
    'ichef:connected',
    () => {
      setTimeout(
        refreshFromServer,
        250
      );
    }
  );
  window.addEventListener(
    'focus',
    () => {
      detectAndApply();
    }
  );
  document.addEventListener(
    'ichef:rh-settings-saved',
    () => {
      if (
        !applying &&
        lastDetected
      ) {
        setTimeout(
          () =>
            applyCountry(
              lastDetected.country,
              lastDetected.source
            ),
          0
        );
      }
    }
  );
  function boot() {
    lockCountryControl();
    detectAndApply(
      window.ICHEF_LIVE_STATE
    );
    setTimeout(
      refreshFromServer,
      450
    );
  }
  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      boot,
      {
        once:true
      }
    );
  } else {
    boot();
  }
  window.ICHEF_CLIENT_COUNTRY_V185 = {
    detect:
      detectAndApply,
    refresh:
      refreshFromServer,
    get current() {
      return lastDetected;
    }
  };
  window.__ICHEF_RH_BUILD__ = VERSION;
  console.info(
    '[iCHEF RH V185] pays client automatique + références juridiques officielles'
  );
})();


;
/* RH V264 - preserved script #105 */
window.__ICHEF_RH_BUILD__='RH-V185-AUTO-COUNTRY-LEGAL-SOURCES';
console.info('[iCHEF RH V185] droit automatiquement lié au pays client');
