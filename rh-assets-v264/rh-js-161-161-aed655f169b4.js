
;
/* RH V264 - preserved script #161 */

(() => {
  'use strict';
  if(window.__ICHEF_RH_V246_ALERTS__) return;
  window.__ICHEF_RH_V246_ALERTS__=true;
  const q=(s,r=document)=>r.querySelector(s), qa=(s,r=document)=>[...r.querySelectorAll(s)];

  function rows(){
    const v=qa('#rh-v226-alert-list .rh-v226-list-row').filter(r=>{
      const t=String(q('strong',r)?.textContent||'').trim();
      return t&&!/rien à traiter/i.test(t);
    });
    if(v.length)return v;
    return qa('#rh-cockpit-alerts .rh-list-item').filter(r=>String(r.textContent||'').trim());
  }
  function data(){
    return rows().map((r,i)=>({
      i,
      title:String(q('strong',r)?.textContent||q('.rh-list-main',r)?.textContent||'Alerte RH').trim(),
      detail:String(q('small',r)?.textContent||'').trim()
    }));
  }
  function render(){
    const a=data(), n=a.length, list=q('#rh-v246-alert-list');
    if(q('#rh-v246-count'))q('#rh-v246-count').textContent=String(n);
    if(q('#rh-v246-summary-title'))q('#rh-v246-summary-title').textContent=n?`${n} alerte${n>1?'s':''} à vérifier`:'Aucune alerte prioritaire';
    if(list){
      list.innerHTML=n?a.map((x,i)=>`<div class="rh-v246-row" data-v246-row="${i}"><span class="ico">${i===0?'!':'△'}</span><div><strong></strong><small></small></div><button type="button" data-v246-action="${i}">VOIR / CORRIGER</button></div>`).join(''):'<div class="rh-v246-empty">✓ Aucune alerte à traiter.</div>';
      a.forEach((x,i)=>{const r=q(`[data-v246-row="${i}"]`,list);if(r){q('strong',r).textContent=x.title;q('small',r).textContent=x.detail;}});
    }
    const bell=q('#rh-v226-bell-badge'); if(bell){bell.textContent=String(n);bell.classList.toggle('show',n>0);}
    if(q('#rh-v226-alert-count2'))q('#rh-v226-alert-count2').textContent=String(n);
    if(q('#rh-v226-alerts'))q('#rh-v226-alerts').textContent=String(n);
    return a;
  }
  function open(){render();const m=q('#rh-v246-alert-modal');if(m){m.classList.add('show');m.setAttribute('aria-hidden','false');}}
  function close(){const m=q('#rh-v246-alert-modal');if(m){m.classList.remove('show');m.setAttribute('aria-hidden','true');}}
  function action(i){
    const source=rows()[Number(i)], btn=source?q('button',source):null;
    close();
    if(btn){btn.click();return;}
    window.openPlanningAssistant?.();
  }
  function wire(){
    [q('#rh-v226-bell'),q('#rh-v226-alert-count2'),q('#rh-v226-kpis .rh-v226-kpi.alerts'),q('#rh-v226-alerts-card .rh-v226-analytics-head')].filter(Boolean).forEach(el=>{
      if(el.dataset.v246==='1')return;
      el.dataset.v246='1';el.setAttribute('role','button');el.setAttribute('tabindex','0');
      el.addEventListener('click',open);
      el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open();}});
    });
  }
  document.addEventListener('click',e=>{
    if(e.target.id==='rh-v246-close')close();
    else if(e.target.id==='rh-v246-refresh'){try{window.ICHEF_RH_V226_DASHBOARD?.refresh?.()}catch(_){};setTimeout(render,80);}
    else if(e.target.id==='rh-v246-analyse'){close();window.openPlanningAssistant?.();}
    else {const b=e.target.closest('[data-v246-action]');if(b)action(b.dataset.v246Action);}
  },true);
  function install(){wire();render();}
  const shell=q('#rh-v226-shell'); if(shell)new MutationObserver(wire).observe(shell,{childList:true,subtree:true});
  window.addEventListener('ichef:planning-symbiosis',()=>setTimeout(render,60));
  window.addEventListener('ichef:planning-views-refreshed',()=>setTimeout(render,60));
  window.addEventListener('focus',()=>setTimeout(render,60));
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,150),{once:true});else setTimeout(install,150);
  setTimeout(install,500);
  window.openRhAlertsV246=open;
  window.__ICHEF_RH_BUILD__='RH-V246-ALERTES-CONNECTEES-SECURE';
  console.info('[iCHEF RH V246] cloche + pastilles + KPI alertes connectés');
})();

