
;
/* RH V264 - preserved script #154 */

(() => {
  'use strict';
  if(window.__ICHEF_RH_V228_FINAL__) return;
  window.__ICHEF_RH_V228_FINAL__=true;

  let frame=0;
  const q=(sel,root=document)=>root.querySelector(sel);
  const qa=(sel,root=document)=>[...root.querySelectorAll(sel)];

  function copyActionRow(sourceRow){
    const strong=q('strong',sourceRow)?.textContent?.trim() ||
                 q('.rh-list-main',sourceRow)?.textContent?.trim() ||
                 'Action à traiter';
    const small=q('small',sourceRow)?.textContent?.trim() || '';
    const sourceButton=q('button',sourceRow);

    const row=document.createElement('div');
    row.className='rh-v226-list-row';
    row.dataset.v228Generated='1';
    row.innerHTML=`
      <span class="ico">△</span>
      <div>
        <strong></strong>
        <small></small>
      </div>
      ${sourceButton?'<button type="button">VOIR</button>':''}
    `;
    q('strong',row).textContent=strong;
    q('small',row).textContent=small;
    q('button',row)?.addEventListener('click',()=>sourceButton?.click());
    return row;
  }

  function enrichTodoWithRealAlerts(){
    const todo=document.getElementById('rh-v226-todo-list');
    const alerts=document.getElementById('rh-v226-alert-list');
    if(!todo || !alerts) return;

    // Remove only our previous generated copies.
    qa('[data-v228-generated="1"]',todo).forEach(el=>el.remove());

    const existingTexts=new Set(
      qa('.rh-v226-list-row strong',todo).map(el=>String(el.textContent||'').trim())
    );

    const alertRows=qa('.rh-v226-list-row',alerts);
    for(const alertRow of alertRows){
      if(qa('.rh-v226-list-row',todo).length>=4) break;
      const title=String(q('strong',alertRow)?.textContent||'').trim();
      if(!title || existingTexts.has(title)) continue;

      // Use the already-connected V226 alert row as the action source.
      const copy=copyActionRow(alertRow);
      todo.appendChild(copy);
      existingTexts.add(title);
    }

    const count=qa('.rh-v226-list-row',todo).length;
    const badge=document.getElementById('rh-v226-todo-count');
    if(badge) badge.textContent=String(count);
  }

  function normalizePlanningHead(){
    const title=document.getElementById('rh-v226-plan-title');
    if(title) title.textContent='PLANNING DE LA SEMAINE';

    const week=document.getElementById('rh-v226-week');
    if(week && !String(week.textContent||'').trim()){
      week.textContent='Semaine en cours';
    }
  }

  function ensureActiveDashboard(){
    qa('#rh-v226-sidebar .rh-v226-nav-btn').forEach(btn=>{
      btn.classList.toggle('active',btn.dataset.v226Nav==='dashboard');
    });
  }

  function resetScrolls(){
    const sidebar=document.getElementById('rh-v226-sidebar');
    if(sidebar) sidebar.scrollTop=0;
  }

  function refresh(){
    if(frame) return;
    frame=requestAnimationFrame(()=>{
      frame=0;
      normalizePlanningHead();
      ensureActiveDashboard();
      enrichTodoWithRealAlerts();
      resetScrolls();

      const version=document.getElementById('rh-v226-version');
      if(version){
        version.textContent='V228 · Dashboard finalisé · moteur RH inchangé';
      }
      const side=q('#rh-v226-side-bottom small');
      if(side) side.textContent='V228';
    });
  }

  window.addEventListener('ichef:planning-symbiosis',refresh);
  window.addEventListener('ichef:planning-views-refreshed',refresh);
  window.addEventListener('ichef:planning-categories-updated',refresh);
  window.addEventListener('focus',refresh);

  const shell=document.getElementById('rh-v226-shell');
  if(shell){
    new MutationObserver(mutations=>{
      const useful=mutations.some(m =>
        [...(m.addedNodes||[])].some(n =>
          n?.nodeType===1 &&
          (
            n.matches?.('.rh-v226-list-row,[data-rh-edit-staff]') ||
            n.querySelector?.('.rh-v226-list-row,[data-rh-edit-staff]')
          )
        )
      );
      if(useful) refresh();
    }).observe(shell,{childList:true,subtree:true});
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',refresh,{once:true});
  }else{
    refresh();
  }
  setTimeout(refresh,150);
  setTimeout(refresh,600);

  window.ICHEF_RH_V228={refresh,version:'RH-V228-DASHBOARD-FINALISE'};
  window.__ICHEF_RH_BUILD__='RH-V228-DASHBOARD-FINALISE';
  console.info('[iCHEF RH V228] présentation finale appliquée en dernier');
})();

