
;
/* RH V264 - preserved script #26 */
(() => {
  'use strict';
  function installHelpButton(){
    const card = document.querySelector('#rh-ai-settings-v103 .rh-v109-side .rh-v109-card');
    if(!card || card.querySelector('.rh-v111-help-btn')) return;
    const title = card.querySelector('h4');
    if(!title) return;
    const btn=document.createElement('button');
    btn.type='button';
    btn.className='rh-v111-help-btn';
    btn.innerHTML='i';
    btn.title='Comprendre l’IA Planning';
    btn.setAttribute('aria-label','Comprendre l’IA Planning');
    btn.onclick=()=>window.openRhAiHelpV111();
    title.appendChild(btn);
  }
  window.openRhAiHelpV111=()=>{
    const m=document.getElementById('rh-v111-help-modal');
    if(m){m.classList.add('show');m.setAttribute('aria-hidden','false');}
  };
  window.closeRhAiHelpV111=()=>{
    const m=document.getElementById('rh-v111-help-modal');
    if(m){m.classList.remove('show');m.setAttribute('aria-hidden','true');}
  };
  document.addEventListener('click',e=>{
    const m=document.getElementById('rh-v111-help-modal');
    if(e.target===m) window.closeRhAiHelpV111();
  });
  document.addEventListener('keydown',e=>{if(e.key==='Escape') window.closeRhAiHelpV111();});
  const obs=new MutationObserver(()=>{
    installHelpButton();
    if(document.querySelector('#rh-ai-settings-v103 .rh-v111-help-btn')){
      obs.disconnect();
    }
  });
  if(document.body) obs.observe(document.body,{childList:true,subtree:true});
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',()=>{
      installHelpButton();
      if(document.querySelector('#rh-ai-settings-v103 .rh-v111-help-btn')) obs.disconnect();
    },{once:true});
  }else{
    installHelpButton();
    if(document.querySelector('#rh-ai-settings-v103 .rh-v111-help-btn')) obs.disconnect();
  }
  window.__ICHEF_RH_HELP_BUILD__='V111';
})();


;
/* RH V264 - preserved script #27 */
(() => {
 'use strict';
 function installV113(){
   const modal=document.getElementById('ia-predictions-modal');
   if(!modal || modal.dataset.v113==='1') return;
   const host=modal.querySelector('.modal-content') || modal.firstElementChild;
   if(!host) return;
   const title=host.querySelector('h2,h3');
   const flow=document.createElement('div');
   flow.className='v113-flow';
   flow.innerHTML=`
     <div class="v113-step on" id="v113-s1"><b>1 · ANALYSER</b><small>Activité et contraintes</small></div>
     <div class="v113-step" id="v113-s2"><b>2 · PLANNING IA</b><small>Horaires + OFF proposés</small></div>
     <div class="v113-step" id="v113-s3"><b>3 · VÉRIFIER</b><small>Alertes et couverture</small></div>
     <div class="v113-step" id="v113-s4"><b>4 · VALIDER</b><small>Appliquer au planning officiel</small></div>`;
   if(title) title.insertAdjacentElement('afterend',flow); else host.prepend(flow);
   const nativeSummary=document.getElementById('ia-planning-draft-summary');
   const nativeWarnings=document.getElementById('ia-planning-draft-warnings');
   const nativePreview=document.getElementById('ia-planning-preview');
   const wrap=document.createElement('section');
   wrap.className='v113-plan-wrap';
   wrap.innerHTML=`
     <div class="v113-plan-head">
       <div><h3>PLANNING PROPOSÉ PAR L’IA</h3><p>Prévisualisation réelle du moteur iCHEF. Rien n’est appliqué avant validation.</p></div>
       <span class="v113-state" id="v113-state">EN ATTENTE DE GÉNÉRATION</span>
     </div>
     <div class="v113-empty" id="v113-empty">Cliquez sur « GÉNÉRER LE PLANNING ». La proposition apparaîtra ici.</div>
     <div class="v113-native-summary" id="v113-summary-slot"></div>
     <div class="v113-native-warnings" id="v113-warning-slot"></div>
     <div class="v113-native-preview" id="v113-preview-slot"></div>`;
   const generateBtn=document.getElementById('assistant-generate-btn');
   const actionZone=generateBtn?.closest('div');
   const automaticBox=actionZone?.parentElement;
   if(automaticBox) automaticBox.insertAdjacentElement('afterend',wrap);
   else flow.insertAdjacentElement('afterend',wrap);
   // Move the application's REAL output nodes into the new unified section.
   if(nativeSummary) document.getElementById('v113-summary-slot').appendChild(nativeSummary);
   if(nativeWarnings) document.getElementById('v113-warning-slot').appendChild(nativeWarnings);
   if(nativePreview) document.getElementById('v113-preview-slot').appendChild(nativePreview);
   // Remove the old empty containers/sections if they became visually redundant.
   [nativeSummary,nativeWarnings,nativePreview].forEach(n=>{
     const p=n?.parentElement;
     if(p && p!==wrap && !p.id?.startsWith('v113-')) {
       // no destructive removal: leave application structure intact
     }
   });
   modal.dataset.v113='1';
   refreshV113();
 }
 function refreshV113(){
   const empty=document.getElementById('v113-empty');
   const state=document.getElementById('v113-state');
   const ready=typeof planningAssistantDraft!=='undefined' && !!planningAssistantDraft;
   if(empty) empty.style.display=ready?'none':'block';
   if(state){
     state.textContent=ready?'PROPOSITION PRÊTE':'EN ATTENTE DE GÉNÉRATION';
     state.classList.toggle('ready',ready);
   }
   document.getElementById('v113-s1')?.classList.toggle('on',!ready);
   document.getElementById('v113-s2')?.classList.toggle('on',ready);
   document.getElementById('v113-s3')?.classList.toggle('on',ready);
 }
 // Hook only AFTER the original function runs; no replacement of its algorithm.
 const originalRender=window.renderAutomaticPlanningDraft;
 if(typeof originalRender==='function'){
   window.renderAutomaticPlanningDraft=function(draft){
     const result=originalRender.apply(this,arguments);
     installV113();
     refreshV113();
     return result;
   };
 }
 const originalOpen=window.openPlanningAssistant;
 if(typeof originalOpen==='function'){
   window.openPlanningAssistant=function(){
     const result=originalOpen.apply(this,arguments);
     setTimeout(()=>{installV113();refreshV113();},0);
     return result;
   };
 }
 if(document.readyState==='loading'){
   document.addEventListener('DOMContentLoaded',()=>{installV113();refreshV113();},{once:true});
 } else {
   installV113(); refreshV113();
 }
 window.__ICHEF_RH_FLOW_BUILD__='V113-REAL-PLANNING-DRAFT';
 console.info('[iCHEF RH V113] affichage connecté à planningAssistantDraft réel · PIN/auth inchangés');
})();


;
/* RH V264 - preserved script #28 */
(() => {
'use strict';
// Performance only: authentication/PIN/session/tenantID are untouched.
let inFlight=null;
function setBusy(on){
 const b=document.getElementById('assistant-generate-btn');
 if(!b)return;
 b.classList.toggle('v114-working',on); b.disabled=!!on;
 let n=document.getElementById('v114-speed-note');
 if(!n){n=document.createElement('div');n.id='v114-speed-note';n.textContent='Calcul du planning en cours…';b.insertAdjacentElement('afterend',n);}
 n.classList.toggle('show',on);
}
const original=window.generateAutomaticPlanning;
if(typeof original==='function' && !original.__v114){
 const fast=async function(...args){
   // Prevent accidental duplicate calculations.
   if(inFlight) return inFlight;
   setBusy(true);
   inFlight=(async()=>{
     try{
       // Let browser paint loading state before CPU-heavy work.
       await new Promise(r=>requestAnimationFrame(r));
       return await original.apply(this,args);
     }finally{
       inFlight=null; setBusy(false);
       requestAnimationFrame(()=>{
         try{
           if(typeof window.renderAutomaticPlanningDraft==='function' && window.planningAssistantDraft)
             window.renderAutomaticPlanningDraft(window.planningAssistantDraft);
         }catch(_){}
       });
     }
   })();
   return inFlight;
 };
 fast.__v114=true; fast.__original=original;
 window.generateAutomaticPlanning=fast;
}
window.__ICHEF_RH_PERF_BUILD__='V114';
console.info('[iCHEF RH V114] génération allégée : observer global supprimé + double calcul bloqué');
})();
