
;
/* RH V264 - preserved script #155 */

(() => {
  'use strict';
  if(window.__ICHEF_RH_V232_STAFF_CLICK__) return;
  window.__ICHEF_RH_V232_STAFF_CLICK__=true;

  const wrap=document.getElementById('rh-v226-plan-table-wrap');
  if(!wrap) return;

  let frame=0;
  let busy=false;
  let lastOpenAt=0;
  let lastStaffId='';

  function q(sel,root=document){ return root.querySelector(sel); }
  function qa(sel,root=document){ return [...root.querySelectorAll(sel)]; }

  function resolveStaffId(raw){
    const key=String(raw||'').trim();
    if(!key) return null;
    try{
      const dir=typeof getDir==='function' ? getDir() : [];
      const staff=(Array.isArray(dir)?dir:[])
        .find(s=>String(s.id)===key);
      return staff?.id ?? key;
    }catch(_){
      return key;
    }
  }

  // IMPORTANT V232:
  // V231 avait supprimé le script V229 qui faisait cette décoration.
  // Sans data-v229-staff-id / classe sur la première cellule,
  // aucun clic ne pouvait être reconnu.
  function decorateStaffCells(){
    const table=q('table',wrap);
    if(!table) return;

    qa('tbody tr',table).forEach(row=>{
      const first=row.querySelector('td:first-child');
      const anyPlanningCell=row.querySelector('[data-rh-edit-staff]');
      if(!first || !anyPlanningCell) return;

      const staffId=String(anyPlanningCell.dataset.rhEditStaff||'').trim();
      if(!staffId) return;

      first.dataset.v232StaffId=staffId;
      first.classList.add('v232-staff-cell');
      first.setAttribute('role','button');
      first.setAttribute('tabindex','0');

      const name=
        first.querySelector('.rh-plan-person strong')?.textContent?.trim() ||
        first.querySelector('strong')?.textContent?.trim() ||
        'ce collaborateur';

      first.setAttribute('aria-label',`Ouvrir le planning de ${name}`);
      first.setAttribute('title',`Ouvrir le planning de ${name}`);

      const content=
        first.querySelector('.rh-plan-person > div') ||
        first.querySelector('.rh-plan-person') ||
        first;

      if(content && !content.querySelector('.v232-open-hint')){
        const hint=document.createElement('small');
        hint.className='v232-open-hint';
        hint.textContent='OUVRIR LE PLANNING';
        content.appendChild(hint);
      }
    });
  }

  function cellFrom(target){
    return target?.closest?.(
      '#rh-v226-plan-table-wrap td.v232-staff-cell[data-v232-staff-id]'
    ) || null;
  }

  function openStaffPlanning(rawId,cell=null){
    const id=resolveStaffId(rawId);
    if(id===null || id===undefined || id==='') return false;

    const now=Date.now();
    if(busy || (String(id)===String(lastStaffId) && now-lastOpenAt<650)){
      return true;
    }
    busy=true;
    lastOpenAt=now;
    lastStaffId=String(id);
    cell?.classList.add('v232-opening');

    try{
      // Utilise directement le vrai moteur RH.
      if(typeof window.openInterface==='function'){
        window.openInterface('hr');
      }else if(typeof openInterface==='function'){
        openInterface('hr');
      }else{
        throw new Error("openInterface('hr') indisponible");
      }

      // Laisser une frame à openInterface pour afficher le vrai écran,
      // puis sélectionner le collaborateur dans ce même moteur.
      requestAnimationFrame(()=>{
        requestAnimationFrame(()=>{
          try{
            if(typeof window.selectStaff==='function'){
              window.selectStaff(id);
            }else if(typeof selectStaff==='function'){
              selectStaff(id);
            }else if(typeof window.openStaffPlanning==='function'){
              window.openStaffPlanning(id);
            }else{
              throw new Error('selectStaff indisponible');
            }

            const hub=document.getElementById('director-hub');
            const hr=document.getElementById('hr-interface');

            if(hub) hub.style.display='none';
            if(hr){
              hr.style.display='flex';
              hr.style.visibility='visible';
              hr.style.opacity='1';
            }

            // Renforcer la vue individuelle si une ancienne vue globale
            // était encore mémorisée.
            try{
              if(typeof currentStaffId!=='undefined') currentStaffId=id;
              if(typeof isGlobalView!=='undefined') isGlobalView=false;
              if(typeof isAnnualView!=='undefined') isAnnualView=false;
              if(typeof toggleViewDisplay==='function') toggleViewDisplay();
              if(typeof loadMonthData==='function') loadMonthData();
            }catch(_){}

            requestAnimationFrame(()=>{
              try{
                hr?.scrollTo?.({top:0,left:0,behavior:'auto'});
              }catch(_){}
            });

            window.dispatchEvent(new CustomEvent(
              'ichef:dashboard-staff-planning-open',
              {detail:{staffId:id,source:'V232',at:new Date().toISOString()}}
            ));
          }catch(error){
            console.warn('[iCHEF RH V232] sélection collaborateur',error);
          }finally{
            busy=false;
            cell?.classList.remove('v232-opening');
          }
        });
      });

      return true;
    }catch(error){
      busy=false;
      cell?.classList.remove('v232-opening');
      console.warn('[iCHEF RH V232] ouverture planning',error);
      return false;
    }
  }

  // UN seul listener pour souris + tactile.
  wrap.addEventListener('click',event=>{
    const cell=cellFrom(event.target);
    if(!cell) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    openStaffPlanning(cell.dataset.v232StaffId,cell);
  },true);

  // Clavier.
  wrap.addEventListener('keydown',event=>{
    if(!['Enter',' '].includes(event.key)) return;
    const cell=cellFrom(event.target);
    if(!cell) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    openStaffPlanning(cell.dataset.v232StaffId,cell);
  },true);

  // V226 reconstruit le tableau à chaque synchronisation :
  // on remet donc les zones cliquables après chaque reconstruction.
  new MutationObserver(mutations=>{
    const useful=mutations.some(m =>
      [...(m.addedNodes||[])].some(n =>
        n?.nodeType===1 &&
        (
          n.matches?.('table,tbody,tr,td,[data-rh-edit-staff]') ||
          n.querySelector?.('[data-rh-edit-staff]')
        )
      )
    );
    if(!useful || frame) return;
    frame=requestAnimationFrame(()=>{
      frame=0;
      decorateStaffCells();
    });
  }).observe(wrap,{childList:true,subtree:true});

  [
    'ichef:planning-symbiosis',
    'ichef:planning-views-refreshed',
    'ichef:planning-categories-updated'
  ].forEach(name=>window.addEventListener(name,()=>{
    requestAnimationFrame(decorateStaffCells);
  }));

  decorateStaffCells();
  setTimeout(decorateStaffCells,120);
  setTimeout(decorateStaffCells,550);

  window.iChefOpenStaffPlanningFromDashboardV232=openStaffPlanning;
  window.ICHEF_RH_V232={
    decorate:decorateStaffCells,
    openStaffPlanning,
    version:'RH-V232-CLIC-COLLABORATEUR-REPARE'
  };

  window.__ICHEF_RH_BUILD__='RH-V232-CLIC-COLLABORATEUR-REPARE';
  console.info('[iCHEF RH V232] première colonne décorée + clic/tactile -> planning individuel');
})();



;
/* RH V264 - preserved script #156 */

(() => {
  'use strict';
  if(window.__ICHEF_RH_V236__) return;
  window.__ICHEF_RH_V236__=true;

  let frame=0;
  const q=(sel,root=document)=>root.querySelector(sel);
  const qa=(sel,root=document)=>[...root.querySelectorAll(sel)];

  function text(id,fallback='0'){
    return String(document.getElementById(id)?.textContent||fallback).trim();
  }

  function currentStaffIdFromDom(){
    const explicit=String(window.__ICHEF_V239_SELECTED_STAFF_ID__||'').trim();
    if(explicit) return explicit;

    try{
      if(typeof currentStaffId!=='undefined' && currentStaffId!==null && currentStaffId!==''){
        return String(currentStaffId).trim();
      }
    }catch(_){}

    return String(
      q('#staff-list-render .rh-v220-staff-card.active[data-staff-id]')?.dataset.staffId || ''
    ).trim();
  }

  function currentStaff(){
    const id=currentStaffIdFromDom();
    if(!id) return null;
    try{
      const dir=typeof getDir==='function'?getDir():[];
      return (Array.isArray(dir)?dir:[]).find(s=>String(s.id)===String(id))||null;
    }catch(_){ return null; }
  }

  function initials(name){
    const p=String(name||'').trim().split(/\s+/).filter(Boolean);
    return p.length?p.slice(0,2).map(x=>x[0].toUpperCase()).join(''):'?';
  }

  function monthLabel(value){
    if(!/^\d{4}-\d{2}$/.test(String(value||''))) return 'Mois';
    const [y,m]=String(value).split('-').map(Number);
    return new Date(y,m-1,1,12).toLocaleDateString('fr-FR',{month:'long',year:'numeric'})
      .replace(/^./,c=>c.toUpperCase());
  }

  function ensureShell(){
    if(document.getElementById('rh-v236-individual-shell')) return;
    const hr=document.getElementById('hr-interface');
    if(!hr) return;

    const shell=document.createElement('div');
    shell.id='rh-v236-individual-shell';
    shell.innerHTML=`
      <aside id="rh-v236-side">
        <div id="rh-v236-brand">
          <div class="main">iCHEF <b>OS</b></div>
          <div class="sub">Ressources Humaines</div>
        </div>

        <span class="rh-v236-nav-label">PILOTER</span>
        <button class="rh-v236-nav" data-v236-nav="dashboard"><span class="ico">⌂</span><span>Tableau de bord</span></button>
        <button class="rh-v236-nav active" data-v236-nav="planning"><span class="ico">▦</span><span>Planning</span></button>
        <button class="rh-v236-nav" data-v236-nav="equipe"><span class="ico">♙</span><span>Équipe</span></button>

        <span class="rh-v236-nav-label">TEMPS</span>
        <button class="rh-v236-nav" data-v236-nav="heures"><span class="ico">◷</span><span>Heures</span></button>
        <button class="rh-v236-nav" data-v236-nav="demandes"><span class="ico">▤</span><span>Demandes</span></button>
        <button class="rh-v236-nav" data-v236-nav="conges"><span class="ico">◇</span><span>Congés & absences</span></button>

        <span class="rh-v236-nav-label">ADMINISTRER</span>
        <button class="rh-v236-nav" data-v236-nav="contrats"><span class="ico">▣</span><span>Contrats</span></button>
        <button class="rh-v236-nav" data-v236-nav="documents"><span class="ico">▱</span><span>Documents</span></button>
        <button class="rh-v236-nav" data-v236-nav="legal"><span class="ico">⚖</span><span>Dossier légal</span></button>

        <span class="rh-v236-nav-label">INTELLIGENCE</span>
        <button class="rh-v236-nav" data-v236-nav="assistant"><span class="ico">✧</span><span>Assistance planning</span></button>
        <button class="rh-v236-nav" data-v236-nav="ia"><span class="ico">⚙</span><span>Réglages IA</span></button>

        <span class="rh-v236-nav-label">PARAMÈTRES</span>
        <button class="rh-v236-nav" data-v236-nav="etablissement"><span class="ico">▥</span><span>Établissement</span></button>
        <button class="rh-v236-nav" data-v236-nav="couleurs"><span class="ico">◉</span><span>Catégories & couleurs</span></button>
        <button class="rh-v236-nav" data-v236-nav="utilisateurs"><span class="ico">♙</span><span>Utilisateurs</span></button>

        <div id="rh-v236-side-bottom"><span>◩</span><strong>iCHEF OS</strong><small>V239</small></div>
      </aside>

      <main id="rh-v236-main">
        <header id="rh-v236-top">
          <div id="rh-v236-venue"><strong>iCHEF Établissement</strong><small>RH Direction · DIRECTION</small></div>
          <label id="rh-v236-searchbox">
            <span>⌕</span>
            <input id="rh-v236-search" list="rh-v236-staff-list" type="search" placeholder="Rechercher un collaborateur…">
            <datalist id="rh-v236-staff-list"></datalist>
          </label>
          <div id="rh-v236-sync"><span class="dot"></span><div><strong>EN LIGNE · SYNCHRONISÉ</strong><small id="rh-v236-sync-time">Synchronisation active</small></div></div>
          <div id="rh-v236-user"><div class="avatar">D</div><strong>Direction⌄</strong></div>
        </header>

        <div id="rh-v236-content">
          <section id="rh-v236-profile">
            <div id="rh-v236-profile-avatar">?</div>
            <div id="rh-v236-profile-copy">
              <div id="rh-v236-name-line">
                <strong id="rh-v236-name">Collaborateur</strong>
                <span id="rh-v236-active">Actif</span>
              </div>
              <div id="rh-v236-role">—</div>
              <div id="rh-v236-meta"></div>
            </div>
            <div id="rh-v236-profile-actions">
              <button type="button" id="rh-v248-prev-profile" class="rh-v248-profile-nav" aria-label="Profil précédent" title="Profil précédent">‹ Profil</button>
              <button type="button" data-v236-profile="contact">☎ Contacter</button>
              <button type="button" data-v236-profile="detail">▣ Fiche</button>
              <button type="button" data-v236-profile="edit">✎ Modifier</button>
              <button type="button" data-v236-profile="history">⟳ Historique</button>
              <button type="button" id="rh-v248-next-profile" class="rh-v248-profile-nav" aria-label="Profil suivant" title="Profil suivant">Profil ›</button>
            </div>
          </section>

          <section id="rh-v236-kpis">
            <article class="rh-v236-kpi blue"><div class="ico">▤</div><div><div id="rh-v236-contract" class="value">0 h</div><div class="label">Contrat</div><div id="rh-v236-contract-sub" class="sub">0 h/sem</div></div></article>
            <article class="rh-v236-kpi green"><div class="ico">✓</div><div><div id="rh-v236-planned" class="value">0 h</div><div class="label">Heures planifiées</div><div id="rh-v236-planned-sub" class="sub">Ce mois</div></div></article>
            <article class="rh-v236-kpi purple"><div class="ico">◷</div><div><div id="rh-v236-due" class="value">0 h</div><div class="label">Heures dues</div><div class="sub">Ce mois</div></div></article>
            <article class="rh-v236-kpi orange"><div class="ico">＋</div><div><div id="rh-v236-done" class="value">0 h</div><div class="label">Heures accomplies</div><div class="sub">Pointages du mois</div></div></article>
            <article class="rh-v236-kpi gray"><div class="ico">▥</div><div><div id="rh-v236-extra" class="value">0 h</div><div class="label">Heures sup.</div><div class="sub">Ce mois</div></div></article>
          </section>

          <section id="rh-v236-kpis-secondary">
            <article class="rh-v236-kpi small red"><div class="ico">▥</div><div><div id="rh-v236-rcr" class="value">0 h</div><div class="label">RCR (banque)</div></div></article>
            <article class="rh-v236-kpi small blue"><div class="ico">▣</div><div><div id="rh-v236-off" class="value">0 j</div><div class="label">Jours off dus</div></div></article>
            <article class="rh-v236-kpi small purple"><div class="ico">✈</div><div><div id="rh-v236-cp-rest" class="value">0 j</div><div class="label">CP restants</div></div></article>
            <article class="rh-v236-kpi small green"><div class="ico">☀</div><div><div id="rh-v236-holidays" class="value">0 j</div><div class="label">Fériés pris</div></div></article>
            <article class="rh-v236-kpi small orange"><div class="ico">☼</div><div><div id="rh-v236-vacation" class="value">0 j</div><div class="label">Vacances prises</div></div></article>
            <article class="rh-v236-kpi small red"><div class="ico">♡</div><div><div id="rh-v236-sick" class="value">0 j</div><div class="label">Maladie</div></div></article>
          </section>

          <section id="rh-v236-planning-card">
            <div id="rh-v236-planning-head">
              <strong id="rh-v236-planning-title">Planning individuel</strong>
              <button type="button" class="rh-v236-month-btn" data-v236-month="-1">‹</button>
              <strong id="rh-v236-month-label">Mois</strong>
              <button type="button" class="rh-v236-month-btn" data-v236-month="1">›</button>
              <button type="button" id="rh-v236-today">▣ Aujourd’hui</button>

              <div id="rh-v236-planning-actions">
                <button type="button" id="rh-v236-annual">▣ Vue annuelle (CP)</button>
                <button type="button" id="rh-v236-history">⟳ Historique & corrections</button>
              </div>
            </div>
            <div id="rh-v236-table-host"></div>
          </section>
        </div>
      </main>
    `;
    hr.appendChild(shell);

    const host=q('#rh-v236-table-host',shell);
    const individual=document.getElementById('table-container-individual');
    const annual=document.getElementById('annual-view-container');
    if(individual && host) host.appendChild(individual);
    if(annual && host) host.appendChild(annual);

    wireShell();
  }

  function setTxt(id,value){
    const el=document.getElementById(id);
    const next=String(value??'');
    if(el && el.textContent!==next) el.textContent=next;
  }

  function updateDatalist(){
    const dl=document.getElementById('rh-v236-staff-list');
    if(!dl) return;
    let dir=[];
    try{dir=typeof getDir==='function'?getDir():[]}catch(_){}
    const next=(Array.isArray(dir)?dir:[])
      .filter(s=>s?.active!==false)
      .map(s=>`<option value="${String(s.name||'').replaceAll('"','&quot;')}"></option>`)
      .join('');
    if(dl.innerHTML!==next) dl.innerHTML=next;
  }

  function actualHours(staffId,month){
    try{
      const a=typeof getActualHoursSummary==='function'?getActualHoursSummary(staffId,month):null;
      return Number(a?.total||0);
    }catch(_){ return 0; }
  }

  function colorStatuses(){
    qa('#timesheet-body .status-sel').forEach(select=>{
      const value=String(select.value||'off');
      let meta=null;
      try{
        const catalog=window.iChefPlanningCategoryCatalogV202?.()||[];
        meta=catalog.find(c=>String(c.id)===value||String(c.legalType)===value)||null;
      }catch(_){}
      const color=String(meta?.color||'');
      if(/^#[0-9a-f]{6}$/i.test(color)){
        select.style.setProperty('background-color',color,'important');
        select.style.setProperty('color','#111','important');
      }
    });
  }

  function updateIndividualShell(){
    ensureShell();

    const hr=document.getElementById('hr-interface');
    const individual=document.getElementById('table-container-individual');
    const annual=document.getElementById('annual-view-container');
    const staff=currentStaff();

    const hrVisible=Boolean(hr && getComputedStyle(hr).display!=='none' && getComputedStyle(hr).visibility!=='hidden');
    const annualVisible=Boolean(annual && getComputedStyle(annual).display!=='none');
    const shouldShow=Boolean(hrVisible && staff);

    hr?.classList.toggle('rh-v236-individual-mode',shouldShow);
    if(!shouldShow) return;

    updateDatalist();

    setTxt('rh-v236-profile-avatar',initials(staff.name));
    setTxt('rh-v236-name',staff.name||'Collaborateur');
    setTxt('rh-v236-active',staff.active===false?'Désactivé':'Actif');
    setTxt('rh-v236-role',`${staff.role||'Collaborateur'} · ${String(staff.dept||'').replaceAll('_',' ')}`);

    const meta=[];
    if(staff.contract) meta.push(`▣ ${Number(staff.contract)} h/sem`);
    if(staff.dept) meta.push(`♙ Équipe : ${String(staff.dept).replaceAll('_',' ')}`);
    setTxt('rh-v236-meta',meta.join('   '));

    const selector=document.getElementById('month-selector');
    const month=selector?.value||new Date().toISOString().slice(0,7);
    setTxt('rh-v236-month-label',monthLabel(month));

    setTxt('rh-v236-contract',text('stat-expected','0h').replace(/h$/,' h'));
    setTxt('rh-v236-contract-sub',`${Number(staff.contract||0)} h/sem`);
    setTxt('rh-v236-planned',text('stat-actual','0h').replace(/h$/,' h'));
    setTxt('rh-v236-planned-sub',`Objectif ${text('stat-expected','0h').replace(/h$/,' h')}`);
    setTxt('rh-v236-due',text('stat-h-due','0h').replace(/h$/,' h'));
    setTxt('rh-v236-extra',text('stat-sup','0h').replace(/h$/,' h'));
    setTxt('rh-v236-rcr',text('stat-recup','0h').replace(/h$/,' h'));
    setTxt('rh-v236-off',text('stat-off-due','0j'));
    setTxt('rh-v236-cp-rest',text('stat-cp-rest','0j'));
    setTxt('rh-v236-holidays',text('stat-ferie','0j'));
    setTxt('rh-v236-vacation',text('stat-cp','0j'));
    setTxt('rh-v236-sick',text('stat-maladie','0j'));
    setTxt('rh-v236-done',`${actualHours(staff.id,month).toFixed(1)} h`);

    const oldSync=
      document.getElementById('v189-rh-connection-badge')?.textContent ||
      document.getElementById('v161-rh-sync-badge')?.textContent ||
      'Synchronisé';
    setTxt('rh-v236-sync-time',String(oldSync).replace(/\s+/g,' ').trim());

    const annualBtn=document.getElementById('rh-v236-annual');
    if(annualBtn) annualBtn.textContent=annualVisible?'▣ Vue mensuelle':'▣ Vue annuelle (CP)';

    colorStatuses();
  }

  function wireShell(){
    const shell=document.getElementById('rh-v236-individual-shell');
    if(!shell || shell.dataset.bound==='1') return;
    shell.dataset.bound='1';

    const nav={
      dashboard:()=>window.backToHub?.(),
      planning:()=>window.openInterface?.('hr'),
      equipe:()=>window.openInterface?.('hr'),
      heures:()=>window.openInterface?.('timesheets'),
      demandes:()=>window.openInterface?.('requests'),
      conges:()=>window.openInterface?.('requests'),
      contrats:()=>{
        const s=currentStaff();
        if(s) window.openStaffModal?.(s.pin);
      },
      documents:()=>{
        const s=currentStaff();
        if(s) window.openStaffDocumentsV103?.(s.id);
      },
      legal:()=>window.openRhLegalCommandCenterV194?.(),
      assistant:()=>window.openPlanningAssistant?.(),
      ia:()=>window.openRhPlanningSettingsV103?.(),
      etablissement:()=>window.openRhPlanningSettingsV103?.(),
      couleurs:()=>document.querySelector('.rh-v202-categories-btn')?.click(),
      utilisateurs:()=>window.openInterface?.('hr')
    };

    qa('[data-v236-nav]',shell).forEach(btn=>{
      btn.addEventListener('click',()=>nav[btn.dataset.v236Nav]?.());
    });

    qa('[data-v236-month]',shell).forEach(btn=>{
      btn.addEventListener('click',()=>{
        if(typeof changeMonth==='function') changeMonth(Number(btn.dataset.v236Month||0));
        requestAnimationFrame(updateIndividualShell);
      });
    });

    q('#rh-v236-today',shell)?.addEventListener('click',()=>{
      const selector=document.getElementById('month-selector');
      if(selector){
        const now=new Date();
        selector.value=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
        if(typeof handleMonthChange==='function') handleMonthChange();
      }
      requestAnimationFrame(updateIndividualShell);
    });

    q('#rh-v236-annual',shell)?.addEventListener('click',()=>{
      if(typeof toggleAnnualView==='function') toggleAnnualView();
      requestAnimationFrame(updateIndividualShell);
    });

    q('#rh-v236-history',shell)?.addEventListener('click',()=>{
      const s=currentStaff();
      if(s) window.openRhStaffHistoryV138?.(s.id);
    });

    qa('[data-v236-profile]',shell).forEach(btn=>{
      btn.addEventListener('click',()=>{
        const s=currentStaff();
        if(!s) return;
        const action=btn.dataset.v236Profile;

        if(action==='detail'){
          window.openStaffDetail?.(s.id);
        }else if(action==='edit'){
          window.openStaffModal?.(s.pin);
        }else if(action==='history'){
          window.openRhStaffHistoryV138?.(s.id);
        }else if(action==='contact'){
          const phone=String(s.phone||s.telephone||'').trim();
          const email=String(s.email||'').trim();
          if(phone) window.location.href=`tel:${phone.replace(/\s+/g,'')}`;
          else if(email) window.location.href=`mailto:${email}`;
          else window.showToast?.('Aucun téléphone ou e-mail renseigné');
        }
      });
    });

    q('#rh-v236-search',shell)?.addEventListener('change',event=>{
      const value=String(event.target.value||'').trim().toLowerCase();
      if(!value) return;
      let dir=[];
      try{dir=typeof getDir==='function'?getDir():[]}catch(_){}
      const s=(Array.isArray(dir)?dir:[]).find(x=>String(x.name||'').trim().toLowerCase()===value);
      if(s) window.selectStaff?.(s.id);
    });
  }

  let cockpitLastSignature='';
  let cockpitForce=true;

  function cockpitSignature(query=''){
    return [
      String(query||''),
      localStorage.getItem('empire_hr_timesheets')||'',
      localStorage.getItem('empire_hr_directory')||'',
      localStorage.getItem('empire_hr_requests')||'',
      String(document.getElementById('rh-cockpit-search')?.value||'')
    ].join('\u241F');
  }

  function installCockpitGuard(){
    if(typeof window.renderRhCockpit!=='function' || window.renderRhCockpit.__v236) return;

    const original=window.renderRhCockpit;
    const guarded=function(query=''){
      const sig=cockpitSignature(query);
      const hubVisible=document.getElementById('director-hub')?.style.display==='flex';
      if(hubVisible && !cockpitForce && cockpitLastSignature===sig) return;

      cockpitForce=false;
      const result=original.apply(this,arguments);
      cockpitLastSignature=cockpitSignature(query);
      return result;
    };
    guarded.__v236=true;
    window.renderRhCockpit=guarded;

    ['rhCockpitSetPlanView','rhCockpitMoveWeek','rhCockpitToday','rhCockpitGoToHorizon']
      .forEach(name=>{
        const fn=window[name];
        if(typeof fn!=='function' || fn.__v236) return;
        const wrapped=function(){
          cockpitForce=true;
          return fn.apply(this,arguments);
        };
        wrapped.__v236=true;
        window[name]=wrapped;
      });

    window.iChefStableCockpitTickV236=()=>{
      const query=document.getElementById('rh-cockpit-search')?.value||'';
      const sig=cockpitSignature(query);
      if(sig!==cockpitLastSignature){
        cockpitForce=true;
        window.renderRhCockpit?.(query);
      }
    };
  }

  function schedule(){
    if(frame) return;
    frame=requestAnimationFrame(()=>{
      frame=0;
      installCockpitGuard();
      updateIndividualShell();
    });
  }

  ensureShell();
  installCockpitGuard();

  if(typeof window.selectStaff==='function' && !window.selectStaff.__v239){
    const originalSelectStaff=window.selectStaff;
    const wrappedSelectStaff=function(...args){
      if(args.length && args[0]!==undefined && args[0]!==null){
        window.__ICHEF_V239_SELECTED_STAFF_ID__=String(args[0]);
      }

      const result=originalSelectStaff.apply(this,args);

      requestAnimationFrame(()=>{
        requestAnimationFrame(schedule);
      });
      return result;
    };
    wrappedSelectStaff.__v239=true;
    window.selectStaff=wrappedSelectStaff;
  }

  const hr=document.getElementById('hr-interface');
  if(hr){
    new MutationObserver(mutations=>{
      const useful=mutations.some(m=>
        (m.type==='attributes' && m.target===hr && m.attributeName==='style') ||
        [...(m.addedNodes||[])].some(n=>
          n?.nodeType===1 &&
          (
            n.id==='table-container-individual' ||
            n.id==='annual-view-container' ||
            n.matches?.('.rh-v220-staff-card') ||
            n.querySelector?.('#table-container-individual,#annual-view-container,.rh-v220-staff-card')
          )
        )
      );
      if(useful) schedule();
    }).observe(hr,{
      attributes:true,
      attributeFilter:['style'],
      childList:true,
      subtree:true
    });
  }

  window.addEventListener('ichef:staff-selected',event=>{
    const id=String(event?.detail?.staffId||'').trim();
    if(id) window.__ICHEF_V239_SELECTED_STAFF_ID__=id;
    schedule();
  });
  window.addEventListener('ichef:planning-symbiosis',schedule);
  window.addEventListener('ichef:planning-views-refreshed',schedule);
  window.addEventListener('focus',schedule);

  schedule();
  setTimeout(schedule,120);
  setTimeout(schedule,500);

  window.ICHEF_RH_V236={
    refresh:schedule,
    updateIndividual:updateIndividualShell,
    version:'RH-V240-AUTO-STYLE-SELF-HEAL'
  };
  window.__ICHEF_RH_BUILD__='RH-V240-AUTO-STYLE-SELF-HEAL';
  console.info('[iCHEF RH V239] planning individuel cible activé · bundle réellement versionné');
})();



;
/* RH V264 - preserved script #157 */

window.__ICHEF_RH_BUILD__='RH-V240-AUTO-STYLE-SELF-HEAL';



;
/* RH V264 - preserved script #158 */

(() => {
  'use strict';
  const CSS="/* ===== SOURCE: ichef-rh-v236-source-reelle-stable ===== */\nhtml body #director-hub,\nhtml body #hr-interface,\nhtml body #requests-interface,\nhtml body #timesheets-interface,\nhtml body #logs-interface,\nhtml body #employee-portal,\nhtml body #rh-v226-shell,\nhtml body #rh-v236-individual-shell,\nhtml body .rh-cockpit-panel,\nhtml body .rh-v226-card,\nhtml body .rh-v226-kpi,\nhtml body .table-container,\nhtml body table,\nhtml body tr,\nhtml body td,\nhtml body th,\nhtml body .staff-card,\nhtml body .stat-box,\nhtml body .modal,\nhtml body .modal-content{\n  animation:none!important;\n  -webkit-animation:none!important;\n  transition:none!important;\n}\nhtml body #rh-v226-plan-table-wrap,\nhtml body #table-container-individual{\n  scrollbar-gutter:stable;\n  backface-visibility:hidden;\n  -webkit-backface-visibility:hidden;\n}\n#hr-interface.rh-v236-individual-mode{\n  padding:0!important;\n  background:#f6f8fa!important;\n  overflow:hidden!important;\n}\n#hr-interface.rh-v236-individual-mode > .header,\n#hr-interface.rh-v236-individual-mode > #rh-v194-command-strip,\n#hr-interface.rh-v236-individual-mode > #planning-pro-summary,\n#hr-interface.rh-v236-individual-mode > #dashboard-stats-panel,\n#hr-interface.rh-v236-individual-mode > .main-container{\n  display:none!important;\n}\n#rh-v236-individual-shell{\n  width:100%;\n  height:100vh;\n  min-height:100vh;\n  display:none;\n  grid-template-columns:230px minmax(0,1fr);\n  background:#f6f8fa;\n  color:#111;\n  overflow:hidden;\n  font-family:Inter,Arial,sans-serif;\n}\n#hr-interface.rh-v236-individual-mode #rh-v236-individual-shell{\n  display:grid!important;\n}\n#rh-v236-side{\n  height:100vh;\n  overflow-y:auto;\n  overflow-x:hidden;\n  padding:18px 14px 14px;\n  box-sizing:border-box;\n  background:#fff;\n  border-right:1px solid #dfe4e8;\n}\n#rh-v236-brand{padding:0 10px 18px}\n#rh-v236-brand .main{\n  display:flex;align-items:flex-end;gap:5px;\n  font-size:30px;line-height:1;font-weight:950;color:#111;\n}\n#rh-v236-brand .main b{font-size:14px;font-weight:500;transform:translateY(-2px)}\n#rh-v236-brand .sub{margin-top:6px;font-size:11px;font-weight:850;color:#111}\n.rh-v236-nav-label{\n  display:block;margin:16px 10px 6px;\n  font-size:8px;font-weight:950;letter-spacing:1.15px;color:#111;\n}\n.rh-v236-nav{\n  width:100%;min-height:42px;\n  display:grid;grid-template-columns:27px 1fr auto;align-items:center;gap:6px;\n  margin:2px 0;padding:8px 10px;border:0;border-radius:9px;\n  background:transparent;color:#111;text-align:left;font-size:11px;font-weight:740;cursor:pointer;\n}\n.rh-v236-nav:hover{background:#f0f3f6!important}\n.rh-v236-nav.active{background:#111820!important;color:#fff!important}\n.rh-v236-nav .ico{text-align:center;font-size:16px}\n#rh-v236-side-bottom{\n  margin-top:18px;padding:11px 13px;border-radius:10px;\n  background:#111820;color:#fff;display:flex;gap:8px;align-items:center;\n  font-size:11px;font-weight:900;\n}\n#rh-v236-side-bottom small{margin-left:auto;color:#cbd3da;font-size:8px}\n#rh-v236-main{min-width:0;height:100vh;display:flex;flex-direction:column;overflow:hidden}\n#rh-v236-top{\n  min-height:72px;display:grid;\n  grid-template-columns:280px minmax(320px,1fr) 220px 170px;\n  align-items:center;gap:14px;padding:0 22px;box-sizing:border-box;\n  background:#fff;border-bottom:1px solid #dfe4e8;\n}\n#rh-v236-venue strong{display:block;font-size:12px;font-weight:950}\n#rh-v236-venue small{display:block;margin-top:3px;color:#68747f;font-size:9px}\n#rh-v236-searchbox{\n  height:44px;display:flex;align-items:center;gap:9px;padding:0 13px;\n  border:1px solid #dfe4e8;border-radius:12px;background:#fff;\n  box-shadow:0 3px 10px rgba(20,30,40,.04);\n}\n#rh-v236-search{\n  flex:1;min-width:0;height:100%;border:0!important;outline:0!important;\n  box-shadow:none!important;background:transparent!important;color:#111!important;font-size:11px!important;\n}\n#rh-v236-sync{\n  height:48px;display:flex;align-items:center;justify-content:center;gap:9px;\n  border-radius:12px;background:#f0f7f4;color:#17694b;\n}\n#rh-v236-sync .dot{width:11px;height:11px;border-radius:50%;background:#0b9f70}\n#rh-v236-sync strong{display:block;color:#17694b;font-size:11px}\n#rh-v236-sync small{display:block;margin-top:2px;color:#60766c;font-size:8px}\n#rh-v236-user{display:flex;align-items:center;justify-content:flex-end;gap:10px}\n#rh-v236-user .avatar{\n  width:34px;height:34px;display:grid;place-items:center;border-radius:50%;\n  background:#e6eaed;font-size:11px;font-weight:950;\n}\n#rh-v236-user strong{font-size:10px}\n#rh-v236-content{flex:1;min-height:0;overflow:auto;padding:12px 14px 16px;box-sizing:border-box}\n#rh-v236-profile{\n  min-height:112px;display:flex;align-items:center;gap:18px;padding:14px 18px;margin-bottom:10px;\n  border:1px solid #dfe4e8;border-radius:15px;background:#fff;\n  box-shadow:0 4px 15px rgba(20,30,40,.025);\n}\n#rh-v236-profile-avatar{\n  width:72px;height:72px;min-width:72px;display:grid;place-items:center;position:relative;\n  border-radius:50%;background:linear-gradient(145deg,#eef1f4,#d9dee3);\n  color:#111;font-size:30px;font-weight:950;\n}\n#rh-v236-profile-avatar::after{\n  content:\"\";position:absolute;right:3px;bottom:3px;width:14px;height:14px;\n  border:3px solid #fff;border-radius:50%;background:#15a367;\n}\n#rh-v236-profile-copy{min-width:0;flex:1}\n#rh-v236-name-line{display:flex;align-items:center;gap:10px;flex-wrap:wrap}\n#rh-v236-name{font-size:25px;line-height:1;font-weight:950;color:#111}\n#rh-v236-active{\n  padding:5px 12px;border-radius:999px;background:#d9f8e7;color:#117549;\n  font-size:10px;font-weight:900;\n}\n#rh-v236-role{margin-top:7px;color:#111;font-size:12px;font-weight:800}\n#rh-v236-meta{margin-top:8px;display:flex;gap:18px;flex-wrap:wrap;color:#61707b;font-size:9px}\n#rh-v236-profile-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end}\n#rh-v236-profile-actions button{\n  min-height:38px;padding:7px 12px;border:1px solid #ccd3d8;border-radius:8px;\n  background:#fff;color:#111;font-size:9px;font-weight:900;cursor:pointer;\n}\n#rh-v236-kpis{\n  display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:9px;margin-bottom:9px;\n}\n#rh-v236-kpis-secondary{\n  display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:9px;margin-bottom:10px;\n}\n.rh-v236-kpi{\n  min-height:91px;display:flex;align-items:center;gap:12px;padding:11px 13px;\n  box-sizing:border-box;border:1px solid #dfe4e8;border-radius:13px;background:#fff;\n}\n.rh-v236-kpi.small{min-height:78px}\n.rh-v236-kpi .ico{\n  width:44px;height:44px;min-width:44px;display:grid;place-items:center;\n  border-radius:12px;font-size:20px;\n}\n.rh-v236-kpi.small .ico{width:39px;height:39px;min-width:39px;font-size:17px}\n.rh-v236-kpi.blue .ico{background:#dcecff;color:#286fc0}\n.rh-v236-kpi.green .ico{background:#ddf6e8;color:#11824f}\n.rh-v236-kpi.purple .ico{background:#ece3ff;color:#6f3bd0}\n.rh-v236-kpi.orange .ico{background:#fff0d8;color:#d37a00}\n.rh-v236-kpi.red .ico{background:#ffe4e4;color:#d84343}\n.rh-v236-kpi.gray .ico{background:#edf0f2;color:#5b6670}\n.rh-v236-kpi .value{color:#111;font-size:20px;line-height:1.05;font-weight:950}\n.rh-v236-kpi.small .value{font-size:17px}\n.rh-v236-kpi .label{margin-top:4px;color:#111;font-size:10px;font-weight:800}\n.rh-v236-kpi .sub{margin-top:3px;color:#68747f;font-size:8px}\n#rh-v236-planning-card{\n  min-width:0;overflow:hidden;border:1px solid #dfe4e8;border-radius:15px;background:#fff;\n}\n#rh-v236-planning-head{\n  min-height:66px;display:flex;align-items:center;gap:10px;padding:9px 14px;\n  border-bottom:1px solid #dfe4e8;\n}\n#rh-v236-planning-title{margin-right:10px;font-size:18px;font-weight:950;white-space:nowrap}\n.rh-v236-month-btn,#rh-v236-today,#rh-v236-annual,#rh-v236-history{\n  min-height:36px;padding:7px 11px;border:1px solid #cbd2d7;border-radius:8px;\n  background:#fff;color:#111;font-size:9px;font-weight:900;cursor:pointer;\n}\n.rh-v236-month-btn{width:36px;padding:0;font-size:18px}\n#rh-v236-month-label{min-width:135px;text-align:center;font-size:13px;font-weight:950}\n#rh-v236-planning-actions{margin-left:auto;display:flex;gap:7px;align-items:center}\n#rh-v236-table-host{min-width:0}\n#rh-v236-table-host #table-container-individual,\n#rh-v236-table-host #annual-view-container{\n  width:100%!important;max-height:calc(100vh - 445px)!important;min-height:310px!important;\n  overflow:auto!important;padding:0!important;background:#fff!important;\n}\n#rh-v236-table-host .table-detail{\n  width:100%!important;min-width:1060px!important;table-layout:fixed!important;\n  border-collapse:separate!important;border-spacing:0!important;background:#fff!important;\n}\n#rh-v236-table-host .table-detail thead{position:sticky!important;top:0!important;z-index:10!important}\n#rh-v236-table-host .table-detail th{\n  height:42px!important;padding:7px 8px!important;background:#f2f4f6!important;color:#4d5862!important;\n  border-right:1px solid #dfe4e8!important;border-bottom:1px solid #dfe4e8!important;\n  font-size:9px!important;font-weight:950!important;letter-spacing:.2px!important;text-align:center!important;\n}\n#rh-v236-table-host .table-detail th:first-child{position:sticky!important;left:0!important;z-index:12!important;width:105px!important}\n#rh-v236-table-host .table-detail th:nth-child(2){width:145px!important}\n#rh-v236-table-host .table-detail th:nth-child(3){width:145px!important}\n#rh-v236-table-host .table-detail th:nth-child(4),\n#rh-v236-table-host .table-detail th:nth-child(5){width:145px!important}\n#rh-v236-table-host .table-detail th:nth-child(6){width:90px!important}\n#rh-v236-table-host .table-detail th:nth-child(7){width:90px!important}\n#rh-v236-table-host .table-detail th:nth-child(8){width:auto!important}\n#rh-v236-table-host .table-detail td{\n  height:48px!important;padding:5px 8px!important;background:#fff!important;color:#111!important;\n  border-right:1px solid #edf0f2!important;border-bottom:1px solid #e8ecef!important;text-align:center!important;\n}\n#rh-v236-table-host .table-detail tbody tr:nth-child(even) td{background:#fbfcfd!important}\n#rh-v236-table-host .table-detail tbody tr.weekend td{background:#f7f9fb!important}\n#rh-v236-table-host .table-detail tbody tr:hover td{background:#eef5ff!important}\n#rh-v236-table-host .table-detail td:first-child{\n  position:sticky!important;left:0!important;z-index:5!important;font-weight:950!important;background:#fff!important;\n}\n#rh-v236-table-host .table-detail .status-sel,\n#rh-v236-table-host .table-detail .shift-inp,\n#rh-v236-table-host .table-detail .pause-inp,\n#rh-v236-table-host .table-detail .obs-inp{\n  width:100%!important;min-width:0!important;min-height:34px!important;padding:5px 7px!important;\n  border:1px solid #cbd2d7!important;border-radius:7px!important;background:#fff!important;color:#111!important;\n  box-shadow:none!important;font-size:10px!important;font-weight:750!important;\n}\n#rh-v236-table-host .table-detail .status-sel{font-weight:900!important}\n#rh-v236-table-host .table-detail input:disabled,\n#rh-v236-table-host .table-detail select:disabled{\n  background:#f0f2f3!important;color:#7f8991!important;opacity:1!important;\n}\n#rh-v236-table-host .v167-day-date{color:#111!important;font-size:10px!important;font-weight:950!important}\n@media(min-width:851px) and (min-height:760px){\n  #rh-v236-side{overflow-y:hidden!important;padding-top:10px!important}\n  #rh-v236-brand{padding-bottom:8px!important}\n  .rh-v236-nav-label{margin-top:9px!important;margin-bottom:3px!important}\n  .rh-v236-nav{min-height:32px!important;padding:4px 9px!important;font-size:9.5px!important}\n  #rh-v236-side-bottom{margin-top:8px!important;padding:8px 10px!important}\n}\n@media(max-width:1250px){\n  #rh-v236-individual-shell{grid-template-columns:205px minmax(0,1fr)}\n  #rh-v236-top{grid-template-columns:220px minmax(260px,1fr) 190px 145px}\n  #rh-v236-kpis{grid-template-columns:repeat(3,minmax(0,1fr))}\n  #rh-v236-kpis-secondary{grid-template-columns:repeat(3,minmax(0,1fr))}\n}\n@media(max-width:850px){\n  #rh-v236-individual-shell{grid-template-columns:1fr}\n  #rh-v236-side{display:none!important}\n  #rh-v236-top{grid-template-columns:minmax(0,1fr) 180px}\n  #rh-v236-venue,#rh-v236-user{display:none!important}\n  #rh-v236-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}\n  #rh-v236-kpis-secondary{grid-template-columns:repeat(2,minmax(0,1fr))}\n}\n\n\n/* ===== iCHEF RH V237 \u00b7 STABILITE VISUELLE ===== */\nhtml body #director-hub *,html body #hr-interface *{animation-duration:0s!important;animation-delay:0s!important;}\nhtml body #director-hub #rh-v226-content,html body #hr-interface #rh-v236-content{overflow-anchor:none!important;}\nhtml body #director-hub #rh-v226-plan-table-wrap,html body #hr-interface #rh-v236-table-host{min-height:0!important;transform:translateZ(0);will-change:auto!important;}\nhtml body #hr-interface.rh-v236-individual-mode #rh-v236-individual-shell{display:grid!important;position:absolute!important;inset:0!important;z-index:50!important;background:#f6f8fa!important;}\nhtml body #rh-v236-individual-shell,html body #rh-v236-profile,html body #rh-v236-kpis,html body #rh-v236-kpis-secondary,html body #rh-v236-planning-card,html body #rh-v236-table-host{opacity:1!important;transition:none!important;}\n\n/* =========================================================\n   iCHEF RH V238 \u00b7 BUNDLE SYNCHRONIS\u00c9\n   Pr\u00e9sentation fonctionnelle identique \u00e0 V237.\n   ========================================================= */\n\n/* =========================================================\n   iCHEF RH V239 \u00b7 PLANNING INDIVIDUEL CIBLE\n   ========================================================= */\n\n#hr-interface{position:relative!important}\n\n#hr-interface.rh-v236-individual-mode #rh-v236-individual-shell{\n  display:grid!important;\n  position:absolute!important;\n  inset:0!important;\n  z-index:500!important;\n  width:100%!important;\n  height:100%!important;\n  min-height:100%!important;\n  background:#f5f7f9!important;\n}\n\n#rh-v236-individual-shell{\n  grid-template-columns:232px minmax(0,1fr)!important;\n  background:#f5f7f9!important;\n}\n\n#rh-v236-side{\n  padding:18px 14px 12px!important;\n  background:#fff!important;\n  border-right:1px solid #e1e5e8!important;\n}\n\n#rh-v236-brand{padding:0 10px 18px!important}\n\n#rh-v236-brand .main{\n  position:relative!important;\n  font-size:31px!important;\n  letter-spacing:-1.3px!important;\n}\n#rh-v236-brand .main::before{\n  content:\"\";\n  width:7px!important;height:7px!important;\n  border-radius:50%!important;\n  background:#ff5a1f!important;\n  position:absolute!important;\n  left:-2px!important;top:0!important;\n}\n\n.rh-v236-nav{\n  min-height:40px!important;\n  grid-template-columns:29px 1fr!important;\n  padding:7px 10px!important;\n  border-radius:9px!important;\n  font-size:10px!important;\n}\n.rh-v236-nav.active{background:#111820!important;color:#fff!important}\n\n#rh-v236-top{\n  min-height:72px!important;height:72px!important;\n  grid-template-columns:280px minmax(360px,1fr) 220px 190px!important;\n  padding:0 24px!important;\n  background:#fff!important;\n  border-bottom:1px solid #e1e5e8!important;\n}\n#rh-v236-searchbox{height:46px!important;border-radius:10px!important}\n\n#rh-v236-content{\n  padding:12px 20px 18px!important;\n  background:#f5f7f9!important;\n}\n\n#rh-v236-profile{\n  min-height:110px!important;\n  padding:14px 20px!important;\n  gap:20px!important;\n  border-radius:14px!important;\n  margin-bottom:10px!important;\n  background:#fff!important;\n}\n#rh-v236-profile-avatar{\n  width:74px!important;height:74px!important;min-width:74px!important;\n  font-size:29px!important;\n}\n#rh-v236-name{font-size:24px!important}\n#rh-v236-active{padding:5px 13px!important;font-size:10px!important}\n#rh-v236-role{font-size:12px!important}\n#rh-v236-meta{font-size:9px!important;gap:20px!important}\n#rh-v236-profile-actions button{\n  min-height:38px!important;padding:7px 13px!important;\n  border-radius:8px!important;background:#fff!important;font-size:9px!important;\n}\n\n#rh-v236-kpis{\n  grid-template-columns:repeat(5,minmax(0,1fr))!important;\n  gap:10px!important;margin-bottom:9px!important;\n}\n#rh-v236-kpis-secondary{\n  grid-template-columns:repeat(6,minmax(0,1fr))!important;\n  gap:10px!important;margin-bottom:10px!important;\n}\n.rh-v236-kpi{\n  min-height:96px!important;border-radius:13px!important;\n  padding:12px 14px!important;background:#fff!important;\n}\n.rh-v236-kpi.small{min-height:82px!important}\n.rh-v236-kpi .value{font-size:21px!important}\n.rh-v236-kpi.small .value{font-size:18px!important}\n.rh-v236-kpi .label{font-size:10px!important}\n.rh-v236-kpi .sub{font-size:8px!important}\n\n#rh-v236-planning-card{\n  border-radius:14px!important;\n  overflow:hidden!important;background:#fff!important;\n}\n#rh-v236-planning-head{\n  min-height:72px!important;padding:10px 14px!important;\n  gap:10px!important;\n}\n#rh-v236-planning-title{font-size:20px!important;margin-right:10px!important}\n#rh-v236-month-label{min-width:145px!important;font-size:14px!important}\n#rh-v236-planning-actions{margin-left:auto!important}\n\n#rh-v236-table-host #table-container-individual{\n  max-height:calc(100vh - 484px)!important;\n  min-height:310px!important;\n  overflow:auto!important;\n  background:#fff!important;\n}\n#rh-v236-table-host .table-detail{\n  min-width:1120px!important;\n  table-layout:fixed!important;\n}\n#rh-v236-table-host .table-detail th{\n  height:40px!important;padding:6px 8px!important;\n  background:#f4f6f8!important;color:#111!important;\n  font-size:9px!important;text-transform:none!important;\n}\n#rh-v236-table-host .table-detail td{\n  height:42px!important;padding:4px 7px!important;\n  font-size:10px!important;\n}\n#rh-v236-table-host .table-detail tbody tr.weekend td{\n  background:#f7f9fb!important;\n}\n#rh-v236-table-host .table-detail tbody tr:nth-child(7n+6) td{\n  background:#edf6ff!important;\n}\n#rh-v236-table-host .table-detail tbody tr:nth-child(7n) td{\n  background:#fff3f1!important;\n}\n#rh-v236-table-host .table-detail .status-sel,\n#rh-v236-table-host .table-detail .shift-inp,\n#rh-v236-table-host .table-detail .pause-inp,\n#rh-v236-table-host .table-detail .obs-inp{\n  min-height:32px!important;height:32px!important;\n  border-radius:6px!important;font-size:10px!important;\n}\n#rh-v236-table-host .table-detail .obs-inp{text-align:center!important}\n\n@media(min-width:1450px){\n  #rh-v236-table-host .table-detail{min-width:100%!important}\n}\n@media(max-width:1250px){\n  #rh-v236-individual-shell{\n    grid-template-columns:210px minmax(0,1fr)!important;\n  }\n}\n";

  function ensureStyle() {
    let style=document.getElementById('ichef-rh-v240-runtime-style');
    if(!style) {
      style=document.createElement('style');
      style.id='ichef-rh-v240-runtime-style';
      style.textContent=CSS;
      document.head.appendChild(style);
    }

    const shell=document.getElementById('rh-v236-individual-shell');
    if(shell) {
      const expected=getComputedStyle(shell);
      // Sans notre CSS, le shell apparaît en HTML brut. On force le minimum vital.
      if(expected.position==='static' && expected.display!=='none') {
        shell.style.display='none';
      }
    }
  }

  if(document.readyState==='loading') {
    document.addEventListener('DOMContentLoaded',ensureStyle,{once:true});
  } else {
    ensureStyle();
  }

  setTimeout(ensureStyle,50);
  setTimeout(ensureStyle,300);
  window.addEventListener('focus',ensureStyle);
})();



;
/* RH V264 - preserved script #159 */

(() => {
  'use strict';

  function activeStaffId(){
    const explicit=String(window.__ICHEF_V239_SELECTED_STAFF_ID__||'').trim();
    if(explicit) return explicit;

    try{
      if(typeof currentStaffId!=='undefined' && currentStaffId!==null && currentStaffId!==''){
        return String(currentStaffId);
      }
    }catch(_){}

    const card=document.querySelector('#staff-list-render .rh-v220-staff-card.active[data-staff-id]');
    return String(card?.dataset.staffId||'');
  }

  function apply(){
    const hr=document.getElementById('hr-interface');
    const shell=document.getElementById('rh-v236-individual-shell');
    if(!hr || !shell) return;

    const visible=getComputedStyle(hr).display!=='none';
    const id=activeStaffId();

    const show=Boolean(visible && id);
    hr.classList.toggle('rh-v236-individual-mode',show);

    if(show){
      shell.style.removeProperty('display');
      requestAnimationFrame(()=>{
        try{ window.ICHEF_RH_V236?.updateIndividual?.(); }catch(_){}
      });
    }
  }

  // Capture even if another legacy script replaces selectStaff later.
  document.addEventListener('click',event=>{
    const card=event.target?.closest?.('[data-staff-id], [data-v226-staff-id], [data-v232-staff-id], [data-v233-staff-id]');
    const id=String(
      card?.dataset?.staffId ||
      card?.dataset?.v226StaffId ||
      card?.dataset?.v232StaffId ||
      card?.dataset?.v233StaffId ||
      ''
    ).trim();
    if(id){
      window.__ICHEF_V239_SELECTED_STAFF_ID__=id;
      setTimeout(apply,0);
      setTimeout(apply,80);
    }
  },true);

  window.addEventListener('ichef:staff-selected',event=>{
    const id=String(event?.detail?.staffId||'').trim();
    if(id) window.__ICHEF_V239_SELECTED_STAFF_ID__=id;
    setTimeout(apply,0);
    setTimeout(apply,80);
  });

  window.addEventListener('ichef:planning-views-refreshed',apply);
  window.addEventListener('focus',apply);

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',()=>setTimeout(apply,120),{once:true});
  }else{
    setTimeout(apply,120);
  }

  window.iChefApplyIndividualShellV240=apply;
})();

