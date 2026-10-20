
;
/* RH V264 - preserved script #106 */

(() => {
  'use strict';
  if (window.__ICHEF_RH_V194_COMMAND_CENTER__) return;
  window.__ICHEF_RH_V194_COMMAND_CENTER__ = true;
  const VERIFIED_AT='2026-09-29';
  const SOURCES={
    FR:[
      {key:'worktime',authority:'LÉGIFRANCE',title:'HCR IDCC 1979 · durée du travail, majorations et maxima',url:'https://www.legifrance.gouv.fr/conv_coll/id/KALISCTA000005713679'},
      {key:'leave',authority:'CODE DU TRAVAIL NUMÉRIQUE',title:'Congés payés · 2,5 jours ouvrables/mois · maladie',url:'https://code.travail.gouv.fr/fiche-service-public/conges-payes'},
      {key:'wages',authority:'CODE DU TRAVAIL NUMÉRIQUE',title:'HCR · salaire minimum conventionnel et SMIC',url:'https://code.travail.gouv.fr/contribution/1979-quel-est-le-salaire-minimum'},
      {key:'agreement',authority:'LÉGIFRANCE',title:'Convention collective HCR · IDCC 1979',url:'https://www.legifrance.gouv.fr/conv_coll/id/KALITEXT000005670080'}
    ],
    CH:[
      {key:'worktime',authority:'CCNT',title:'Art. 15 · durée du travail / heures supplémentaires',url:'https://l-gav.ch/fr/convention-actuelle/iv-duree-du-travail-et-repos/art-15-duree-du-travail-/-heures-supplementaires'},
      {key:'rest',authority:'CCNT',title:'Art. 16 · deux jours de repos hebdomadaires',url:'https://l-gav.ch/fr/convention-actuelle/iv-duree-du-travail-et-repos/art-16-jours-de-repos'},
      {key:'leave',authority:'CCNT',title:'Art. 17 · 5 semaines / 35 jours civils',url:'https://l-gav.ch/fr/convention-actuelle/iv-duree-du-travail-et-repos/art-17-vacances'},
      {key:'holiday',authority:'CCNT',title:'Art. 18 · 6 jours fériés / 0,5 jour par mois',url:'https://l-gav.ch/fr/convention-actuelle/iv-duree-du-travail-et-repos/art-18-jours-feries'},
      {key:'records',authority:'CCNT',title:'Art. 21 · horaire et enregistrement du temps de travail',url:'https://l-gav.ch/fr/convention-actuelle/iv-duree-du-travail-et-repos/art-21-horaire-de-travail-/-enregistrement-de-la-duree-du-temps-de-travail-/-controle-de-la-duree-du-travail'},
      {key:'13th',authority:'CCNT',title:'Art. 12 · 13e salaire',url:'https://l-gav.ch/fr/convention-actuelle/iii-salaire/art-12-13e-salaire'},
      {key:'wages',authority:'CCNT',title:'Art. 10 · salaires minimums',url:'https://l-gav.ch/fr/convention-actuelle/iii-salaire/art-10-salaires-minimums'},
      {key:'ltr',authority:'SECO',title:'Loi sur le travail · durée du travail et du repos',url:'https://www.seco.admin.ch/fr/duree-du-travail-et-du-repos'}
    ]
  };
  window.ICHEF_RH_LEGAL_SOURCE_REGISTRY_V194=Object.freeze({verifiedAt:VERIFIED_AT,FR:SOURCES.FR,CH:SOURCES.CH});

  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const jget=(k,f)=>{try{return JSON.parse(localStorage.getItem(k)||'null')??f}catch(_){return f}};
  const month=()=>document.getElementById('month-selector')?.value || (()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`})();
  const settings=()=>{try{return typeof getRhSettings==='function'?getRhSettings():{}}catch(_){return {}}};
  const staff=()=>{try{return typeof getDir==='function'?(getDir()||[]).filter(s=>s.active!==false):[]}catch(_){return []}};
  const payrollProfiles=()=>jget('ichef_payroll_profiles_v2',{});
  const payrollVars=()=>jget('ichef_payroll_variables_v2',{});
  const payrollSettingsSafe=()=>{try{return typeof payrollSettings==='function'?payrollSettings():{...{country:'CH',canton:''},...jget('ichef_payroll_settings_v2',{})}}catch(_){return jget('ichef_payroll_settings_v2',{})}};
  const country=()=>String(settings()?.planningLegalCountry||payrollSettingsSafe()?.country||'').toUpperCase()==='FR'?'FR':'CH';
  const framework=()=>country()==='FR'?'HCR · IDCC 1979 + Code du travail':'CCNT hôtels-restaurants-cafés + LTr / OLT';
  const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v};
  function hash(str){let h=2166136261;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619)}return ('00000000'+(h>>>0).toString(16)).slice(-8).toUpperCase()}
  function rulesHash(){return `V194-${hash(JSON.stringify({country:country(),settings:settings(),sources:SOURCES[country()],verifiedAt:VERIFIED_AT}))}`}
  function planAudit(){
    const m=month(), list=staff(), st=settings();
    const proposal=(typeof getTs==='function'?getTs():{})?.[m]||{};
    if(typeof assistantLegalAuditDraftV142!=='function')return {blockers:['Moteur de contrôle planning indisponible.'],warnings:[]};
    try{return assistantLegalAuditDraftV142({month:m,proposal},list,st)||{blockers:[],warnings:[]}}catch(e){return {blockers:[`Contrôle impossible : ${e.message||e}`],warnings:[]}}
  }
  function dossier(st){
    const p=payrollProfiles()?.[st.id]||payrollProfiles()?.[String(st.id)]||{};
    const miss=[];
    if(!String(st.name||'').trim())miss.push('identité');
    if(!String(st.title||st.role||'').trim())miss.push('poste');
    if(!(Number(st.contract)>0))miss.push('heures contrat');
    if(!String(st.contractType||p.contractType||'').trim())miss.push('type contrat');
    if(!String(st.startDate||p.startDate||'').trim())miss.push('date entrée');
    const ct=String(st.contractType||p.contractType||'');
    if(/APPRENT|MINEUR/i.test(ct)&&!String(st.birthDate||p.birthDate||'').trim())miss.push('date naissance');
    if(country()==='FR'){
      if(!String(p.hcrLevel||'').trim()||!String(p.hcrEchelon||'').trim())miss.push('classification HCR');
    }else{
      if(!String(p.chLgavCategory||'').trim())miss.push('catégorie CCNT');
    }
    return {staff:st,profile:p,missing:miss,complete:miss.length===0};
  }
  function dossiers(){return staff().map(dossier)}

  // V245 : lecture seule du même dossier utilisé par le moteur légal V194.
  // Évite de maintenir deux logiques divergentes de "dossier incomplet".
  window.getRhLegalDossierV245=function(staffId){
    const row=staff().find(x=>String(x.id)===String(staffId));
    if(!row)return null;
    return {
      ...dossier(row),
      country:country(),
      framework:framework()
    };
  };

  function timeProof(){
    const m=month(), list=staff();
    if(country()==='CH'){
      const vars=payrollVars()?.[m]||{};
      const signed=list.filter(st=>Boolean(vars?.[st.id]?.chTimesheetSigned||vars?.[String(st.id)]?.chTimesheetSigned)).length;
      return {value:`${signed}/${list.length||0}`,detail:'signatures mensuelles déclarées'};
    }
    let validated=0;
    try{const rs=typeof getRealTimesheets==='function'?getRealTimesheets():jget('ichef_rh_timesheet_real',{months:{}});const node=rs?.months?.[m]?.staff||{};validated=list.filter(st=>['VALIDATED','LOCKED'].includes(String(node?.[String(st.id)]?.status||node?.[st.id]?.status||'').toUpperCase())).length}catch(_){ }
    return {value:`${validated}/${list.length||0}`,detail:'feuilles validées / verrouillées'};
  }
  function publicationState(a){const status=String(settings()?.planningStatus||'draft').toLowerCase();if(a.blockers?.length)return {label:'BLOQUÉE',detail:'corriger avant publication',cls:'block'};if(status==='published')return {label:'PUBLIÉ',detail:'audit à revalider après modification',cls:'ok'};return {label:'PRÊTE',detail:'sous réserve des alertes',cls:a.warnings?.length?'warn':'ok'}}
  function health(){
    const ds=dossiers(), total=ds.length, complete=ds.filter(x=>x.complete).length, cov=total?Math.round(complete/total*100):0;
    const audit=planAudit(), proof=timeProof(), pub=publicationState(audit);
    return {ds,total,complete,cov,audit,proof,pub};
  }
  function ruleCards(){
    if(country()==='FR')return [
      ['Temps de travail HCR','39 h conventionnelles ; heures au-delà de 35 h traitées selon les majorations HCR 10 % / 20 % / 50 %. Maxima HCR contrôlés par rôle : 10 h à 12 h par jour ; 46 h en moyenne sur 12 semaines ; 48 h absolues.','AUTO','worktime'],
      ['Repos','Repos quotidien et repos hebdomadaire contrôlés avant publication ; les situations jeunes / nuit / dérogations doivent être correctement renseignées.','AUTO','worktime'],
      ['Congés payés','2,5 jours ouvrables par mois, 30 jours ouvrables pour une année complète. Le décompte en jours ouvrés doit rester au moins équivalent. Maladie non professionnelle : acquisition spécifique prévue par la loi.','AUTO + DONNÉES','leave'],
      ['Jours fériés HCR','Compteur distinct des congés et des OFF. Les droits dépendent notamment du régime HCR, de l’ancienneté et du caractère permanent / saisonnier de l’établissement.','DONNÉES REQUISES','agreement'],
      ['Salaire minimum','Le moteur compare le minimum conventionnel HCR au SMIC applicable au mois de paie. V194 conserve la chronologie 2026 au lieu de réécrire les mois antérieurs.','AUTO','wages'],
      ['Accords d’entreprise / clauses','Annualisation, 13e mois, dispositions plus favorables, dérogations et usages doivent être documentés : iCHEF ne les invente pas.','VALIDATION HUMAINE','agreement']
    ];
    return [
      ['Durée du travail CCNT','42 h/semaine en principe ; 43,5 h pour établissement saisonnier ; 45 h pour petit établissement lorsque les conditions CCNT sont remplies.','AUTO + PROFIL','worktime'],
      ['Repos','2 jours de repos hebdomadaires, si possible consécutifs, dont au moins un jour entier. Exception 7 jours uniquement sous conditions CCNT strictes.','AUTO','rest'],
      ['Vacances','5 semaines = 35 jours civils/an = 2,92 jours civils/mois. Les jours de repos ne se cumulent pas pendant les vacances.','AUTO','leave'],
      ['Jours fériés','6 jours payés/an = 0,5 jour/mois ; compteur distinct des vacances et du repos.','AUTO','holiday'],
      ['13e salaire','100 % d’un salaire mensuel brut ; prorata si année incomplète ; 8,33 % si versé mensuellement / avec le salaire horaire.','AUTO','13th'],
      ['Temps & preuve','Planning écrit à l’avance selon le type d’établissement ; enregistrement du temps sous responsabilité employeur ; signature mensuelle prévue par la CCNT.','DONNÉES + PREUVE','records'],
      ['Minimums 2026','Catégorie CCNT requise. Le moteur applique les minima 2026 configurés ; les règles cantonales/locales doivent être prises en compte lorsqu’elles sont plus favorables.','AUTO + CANTON','wages'],
      ['LTr / OLT','Repos quotidien, nuit, dimanche, jeunes, maternité et dispositions spéciales OLT 2 restent superposés à la CCNT.','AUTO + SITUATION','ltr']
    ];
  }
  function sourceByKey(k){return SOURCES[country()].find(x=>x.key===k)||SOURCES[country()][0]}
  function renderOverview(h){
    const o=document.getElementById('rh-v194-tab-overview');if(!o)return;
    const localLayer=country()==='CH'?`Canton paie : ${esc(payrollSettingsSafe()?.canton||'NON RENSEIGNÉ')}`:'Accord entreprise / usages : à documenter si applicables';
    const issues=[...(h.audit.blockers||[]).map(x=>['block','BLOQUANT',x]),...(h.audit.warnings||[]).map(x=>['warn','À VÉRIFIER',x])];
    o.innerHTML=`<div class="rh-v194-health-grid">
      <article class="rh-v194-health-card ${h.audit.blockers.length?'block':'good'}"><small>Planning légal</small><strong>${h.audit.blockers.length?`${h.audit.blockers.length} blocage(s)`:'Aucun blocage détecté'}</strong><p>Contrôle du mois ${esc(month())} avec le moteur pays / établissement.</p></article>
      <article class="rh-v194-health-card ${h.complete===h.total?'good':'warn'}"><small>Dossiers collaborateurs</small><strong>${h.complete}/${h.total} complets</strong><p>Contrat, dates, classification et données nécessaires au référentiel.</p></article>
      <article class="rh-v194-health-card ${country()==='CH'&&!payrollSettingsSafe()?.canton?'warn':'good'}"><small>Couche locale</small><strong>${localLayer}</strong><p>Les règles plus favorables ou locales doivent être paramétrées, pas déduites au hasard.</p></article>
      <article class="rh-v194-health-card"><small>Barèmes France 2026</small><strong>${country()==='FR'?'SMIC daté par mois':'Non applicable'}</strong><p>${country()==='FR'?'Jan–mai : 12,02 €/h · dès juin : 12,31 €/h. Minimum garanti : 4,25 € puis 4,35 €.':'Le moteur actif utilise les minima CCNT suisses 2026.'}</p></article>
      <article class="rh-v194-health-card"><small>Preuves de temps</small><strong>${esc(h.proof.value)}</strong><p>${esc(h.proof.detail)} · le temps réel doit rester traçable.</p></article>
      <article class="rh-v194-health-card"><small>Référentiel</small><strong>${esc(rulesHash())}</strong><p>Empreinte technique du jeu de règles + paramètres utilisés, pas une signature juridique.</p></article>
    </div>${issues.length?`<div class="rh-v194-issue-list">${issues.slice(0,40).map(x=>`<div class="rh-v194-issue-row ${x[0]}"><b>${x[1]}</b><span>${esc(x[2])}</span></div>`).join('')}</div>`:`<div class="rh-v194-issue-list"><div class="rh-v194-issue-row good"><b>OK</b><span>Aucune anomalie de planning détectée par les règles actuellement configurées. Cela n’atteste pas qu’aucune règle externe ou accord non renseigné n’existe.</span></div></div>`}`;
  }
  function renderPeople(h){const o=document.getElementById('rh-v194-tab-people');if(!o)return;o.innerHTML=`<table class="rh-v194-people-table"><thead><tr><th>Collaborateur</th><th>Contrat</th><th>Classification</th><th>Dossier</th><th>À compléter</th></tr></thead><tbody>${h.ds.map(x=>{const p=x.profile||{};const cls=country()==='FR'?`${p.hcrLevel||'—'} / ${p.hcrEchelon||'—'}`:(p.chLgavCategory||'—');const staffKey=encodeURIComponent(String(x.staff.id||''));return `<tr><td><strong>${esc(x.staff.name||'Sans nom')}</strong><br><small>${esc(x.staff.title||x.staff.role||'')}</small></td><td>${esc(x.staff.contractType||p.contractType||'—')}<br>${Number(x.staff.contract||0)||'—'} h/sem.</td><td>${esc(cls)}</td><td><button type="button" class="rh-v194-chip ${x.complete?'good':'warn'} rh-v245-dossier-open" data-rh-v245-staff="${esc(staffKey)}">${x.complete?'COMPLET':'À COMPLÉTER'}</button></td><td>${x.missing.length?esc(x.missing.join(' · ')):'—'}</td></tr>`}).join('')}</tbody></table>`}
  function renderRules(){const o=document.getElementById('rh-v194-tab-rules');if(!o)return;o.innerHTML=`<div class="rh-v194-rule-grid">${ruleCards().map(r=>{const src=sourceByKey(r[3]);return `<article class="rh-v194-rule-card"><div class="rh-v194-rule-card-head"><h4>${esc(r[0])}</h4><span class="rh-v194-chip ${r[2].includes('HUMAINE')||r[2].includes('DONNÉES')||r[2].includes('CANTON')?'warn':'good'}">${esc(r[2])}</span></div><p>${esc(r[1])}</p><a href="${esc(src.url)}" target="_blank" rel="noopener">${esc(src.authority)} · source officielle ↗</a></article>`}).join('')}</div>`}
  function renderSources(){const o=document.getElementById('rh-v194-tab-sources');if(!o)return;o.innerHTML=`<div class="rh-v194-source-list">${SOURCES[country()].map(x=>`<div class="rh-v194-source"><small>${esc(x.authority)}</small><strong>${esc(x.title)}</strong><a href="${esc(x.url)}" target="_blank" rel="noopener">OUVRIR ↗</a></div>`).join('')}</div><div class="rh-v194-issue-list"><div class="rh-v194-issue-row warn"><b>IMPORTANT</b><span>Sources vérifiées le ${VERIFIED_AT}. Une veille juridique reste nécessaire : les lois, conventions, avenants, salaires minimums et règles cantonales peuvent évoluer.</span></div></div>`}
  function snapshot(h,kind){
    const key='ichef_rh_legal_snapshots_v194', arr=jget(key,[]);arr.push({at:new Date().toISOString(),kind,month:month(),country:country(),framework:framework(),rulesHash:rulesHash(),blockers:h.audit.blockers||[],warnings:h.audit.warnings||[],coverage:h.cov,settings:{establishment:settings()?.planningLegalEstablishmentType||'',canton:payrollSettingsSafe()?.canton||''}});while(arr.length>120)arr.shift();localStorage.setItem(key,JSON.stringify(arr));return arr[arr.length-1]
  }
  window.refreshRhLegalCommandCenterV194=function(){
    const h=health();
    set('rh-v194-country',country()==='FR'?'🇫🇷 FRANCE':'🇨🇭 SUISSE');set('rh-v194-framework',framework());set('rh-v194-coverage',h.total?`${h.cov}%`:'—');set('rh-v194-coverage-detail',h.total?`${h.complete}/${h.total} dossiers complets`:'aucun collaborateur');set('rh-v194-blockers',String(h.audit.blockers?.length||0));set('rh-v194-warnings',String(h.audit.warnings?.length||0));set('rh-v194-timeproof',h.proof.value);set('rh-v194-timeproof-detail',h.proof.detail);set('rh-v194-publish',h.pub.label);set('rh-v194-publish-detail',h.pub.detail);
    const st=document.getElementById('rh-v194-command-status');if(st){st.className=`rh-v194-command-status ${h.audit.blockers?.length?'block':(h.audit.warnings?.length||h.complete<h.total)?'warn':'ok'}`;st.textContent=h.audit.blockers?.length?'PUBLICATION BLOQUÉE':(h.audit.warnings?.length||h.complete<h.total)?'DOSSIER À COMPLÉTER':'CONTRÔLES ACTIFS'}
    set('rh-v194-modal-framework',`${country()} · ${framework()}`);set('rh-v194-modal-month',month());set('rh-v194-modal-hash',rulesHash());set('rh-v194-modal-gate',h.pub.label);
    renderOverview(h);renderPeople(h);renderRules();renderSources();return h;
  };
  window.openRhLegalCommandCenterV194=function(){const m=document.getElementById('rh-v194-legal-modal');if(!m)return;refreshRhLegalCommandCenterV194();m.classList.add('show');m.setAttribute('aria-hidden','false')};
  window.closeRhLegalCommandCenterV194=function(){const m=document.getElementById('rh-v194-legal-modal');if(m){m.classList.remove('show');m.setAttribute('aria-hidden','true')}};
  window.setRhLegalTabV194=function(name,btn){document.querySelectorAll('#rh-v194-legal-modal .rh-v194-tab').forEach(x=>x.classList.remove('active'));document.getElementById(`rh-v194-tab-${name}`)?.classList.add('active');document.querySelectorAll('#rh-v194-legal-modal .rh-v194-tabbar button').forEach(x=>x.classList.remove('active'));btn?.classList.add('active')};

  // V194 · aucune publication manuelle ne contourne le même audit que l'assistant.
  const previousPublish=window.publishRhPlanningToStaff;
  if(typeof previousPublish==='function'){
    window.publishRhPlanningToStaff=function(){
      const h=refreshRhLegalCommandCenterV194();
      const incomplete=h.ds.filter(x=>!x.complete);
      const hard=[...(h.audit.blockers||[])];
      // Les données indispensables au moteur sont fail-closed ; la classification paie reste visible mais n'empêche pas le planning si le moteur horaire dispose déjà du rôle/contrat.
      incomplete.forEach(x=>{
        const critical=x.missing.filter(v=>['identité','poste','heures contrat','type contrat','date entrée','date naissance'].includes(v));
        if(critical.length)hard.push(`${x.staff.name||'Collaborateur'} : dossier incomplet (${critical.join(', ')}).`)
      });
      if(hard.length){snapshot({...h,audit:{...h.audit,blockers:hard}},'PUBLICATION_BLOCKED');try{typeof recordRhChange==='function'&&recordRhChange({type:'LEGAL_PUBLICATION_BLOCKED_V194',month:month(),country:country(),rulesHash:rulesHash(),blockers:hard,warnings:h.audit.warnings||[]})}catch(_){};openRhLegalCommandCenterV194();alert(`Publication bloquée par le contrôle RH légal.\n\n${hard.slice(0,8).map((x,i)=>`${i+1}. ${x}`).join('\n')}${hard.length>8?`\n… +${hard.length-8} autre(s)`:''}`);return false}
      snapshot(h,'PUBLICATION_OK');try{typeof recordRhChange==='function'&&recordRhChange({type:'LEGAL_PUBLICATION_AUDIT_OK_V194',month:month(),country:country(),rulesHash:rulesHash(),warnings:h.audit.warnings||[]})}catch(_){};return previousPublish.apply(this,arguments)
    };
  }
  const rerender=()=>setTimeout(()=>{try{refreshRhLegalCommandCenterV194()}catch(_){}},50);
  document.addEventListener('change',e=>{if(['month-selector','staff-contract-type','staff-start-date','staff-birth-date'].includes(e.target?.id))rerender()},true);
  document.addEventListener('ichef:rh-settings-saved',rerender);
  window.addEventListener('ichef:updateState',rerender);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',rerender,{once:true});else rerender();
  window.__ICHEF_RH_BUILD__='RH-V194-LEGAL-COMMAND-CENTER';
  console.info('[iCHEF RH V194] Legal Command Center · official-source registry · fail-closed manual publication · dated FR 2026 rates');
})();



;
/* RH V264 - preserved script #107 */

(()=>{'use strict';
  let opening=false;
  function tenant(){
    try{return String(new URLSearchParams(location.search).get('tenantID')||
      (typeof tenantID_JS!=='undefined'?tenantID_JS:'')||
      localStorage.getItem('ichef_tenant_id')||'').trim();}catch(_){return '';}
  }
  function device(){
    const key='ichef_planning_device_v1';
    let value='';try{value=localStorage.getItem(key)||'';}catch(_){}
    if(!value){value=crypto.randomUUID?crypto.randomUUID():('rh_'+Date.now().toString(36));
      try{localStorage.setItem(key,value);}catch(_){}}
    return value;
  }
  function base(){
    try{return typeof SERVER_URL_JS==='string' ? SERVER_URL_JS.replace(/\/$/,'') :
      ((location.hostname==='localhost'||location.hostname==='127.0.0.1')?'http://localhost:10000':'https://tableau-system.onrender.com');}
    catch(_){return 'https://tableau-system.onrender.com';}
  }
  function pin(){
    try{return typeof getRhDirectionAuthPin==='function'?String(getRhDirectionAuthPin()||'').trim():'';}
    catch(_){return '';}
  }
  function url(t){return '/planning-rh/?tenantID='+encodeURIComponent(t);}
  async function openPremium(){
    if(opening)return;opening=true;
    const t=tenant();
    if(!/^[a-zA-Z0-9_-]{2,80}$/.test(t)){
      opening=false;alert('Établissement non reconnu. Reconnectez-vous dans RH.');return;
    }
    // Reprendre une session de planning signée déjà active : inutile de redemander
    // une authentification à chaque retour RH -> Premium. Le serveur recontrôle
    // le token lors des lectures/écritures ; aucune donnée ou droit n'est créé ici.
    const d=device();
    try{
      const previous=JSON.parse(sessionStorage.getItem('ichef_planning_premium_auth_v1')||'null');
      if(previous && previous.tenant===t && previous.device===d &&
         typeof previous.token==='string' && previous.token.length>30 &&
         Number(previous.exp)>Date.now()+30000){
        location.assign(url(t));return;
      }
    }catch(_){ /* pas de session réutilisable */ }
    const pinCode=pin();
    // Une session RH autorisée n'est JAMAIS inventée localement.
    // Si le PIN n'est pas en mémoire, l'application réaffiche sa connexion normale.
    if(!/^\d{4,12}$/.test(pinCode)){location.assign(url(t));return;}
    const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),8000);
    try{
      const r=await fetch(base()+'/api/rh/planning/session',{
        method:'POST',credentials:'include',cache:'no-store',signal:ctrl.signal,
        headers:{'Content-Type':'application/json','Accept':'application/json',
          'X-iCHEF-Tenant':t,'X-iCHEF-Device':d},
        body:JSON.stringify({tenantID:t,pin:pinCode,deviceId:d})
      });
      const data=await r.json().catch(()=>({}));
      if(!r.ok||data.success!==true||typeof data.accessToken!=='string'||!data.accessToken){
        // Droits insuffisants : pas de session premium / pas de contournement.
        alert(data.error||'Accès Planning RH non autorisé par le serveur.');return;
      }
      const exp=Date.now()+Math.min(7200,Math.max(60,Number(data.expiresInSeconds||7200)))*1000-10000;
      try{sessionStorage.setItem('ichef_planning_premium_auth_v1',JSON.stringify({
        tenant:t,device:d,token:data.accessToken,actor:data.actor||null,exp
      }));}catch(_){/* le login normal reste disponible */}
      location.assign(url(t));
    }catch(e){
      alert(e?.name==='AbortError'?'Serveur RH trop lent. Réessayez la connexion.':
        'Connexion serveur indisponible. Aucun accès au planning n’a été accordé.');
    }finally{clearTimeout(timer);opening=false;}
  }
  window.iChefOpenPlanningPremiumV257=openPremium;
  // Interception seulement de l'entrée Planning, sans couper Équipe, IA, paie ou absences.
  document.addEventListener('click',event=>{
    const b=event.target.closest?.('#rh-v226-sidebar [data-v226-nav="planning"]');
    const old=event.target.closest?.('#director-hub .rh-cockpit-nav button[onclick]');
    if(!b&&!(old&&old.textContent?.trim()==='Planning'&&old.getAttribute('onclick')?.includes('openInterface')))return;
    event.preventDefault();event.stopImmediatePropagation();void openPremium();
  },true);
})();

