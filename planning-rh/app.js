/* iCHEF OS Planning Premium V274 : sélection tactile groupée + assistant responsable, sans quitter le planning. */
/* iCHEF OS Planning Premium PWA · client connecté au TIMESHEETS_MASTER.
   Aucune donnée RH n'est stockée en cache ni dans localStorage. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const query=new URLSearchParams(location.search);
// Même API officielle que rh-core.js. Pas d'origine configurable via URL / utilisateur.
const RH_API_BASE = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
  ? 'http://localhost:10000'
  : 'https://tableau-system.onrender.com';

const TODAY=new Date(); TODAY.setHours(12,0,0,0);
const fmt=(d,opts)=>new Intl.DateTimeFormat('fr-FR',opts).format(d);
const esc=v=>String(v??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const add=(d,n)=>{const a=new Date(d);a.setDate(a.getDate()+n);return a;};
const monday=d=>{const a=new Date(d);a.setHours(12,0,0,0);a.setDate(a.getDate()-(a.getDay()+6)%7);return a;};
const month=d=>iso(new Date(d.getFullYear(),d.getMonth(),1,12)).slice(0,7);
const empty=()=>({k:'O',status:'',start:'',end:'',s2:'',e2:'',pause:0,note:'',original:null});
const types={M:'MATIN',S:'SOIR',C:'COUPURE',R:'REPOS',O:'+',CP:'CONGÉ',MAL:'MALADIE',RECUP:'RÉCUP',FERIE:'FÉRIÉ',FORM:'FORMATION',A:'ABSENCE',NJS:'ABS. INJUSTIFIÉE',ACC:'ACCIDENT',MAT:'MATERNITÉ',PAT:'PATERNITÉ',PAR:'PARENTAL',EFM:'ENFANT MALADE',EVF:'ÉVÉNEMENT',DEC:'DEUIL',SSL:'SANS SOLDE'};
let staffPage=0,dayIndex=(TODAY.getDay()+6)%7,lastPageCapacity=0;
let bulkMode=false,bulkSelected=new Map(),bulkLastCell=null,bulkSaving=false;
const MAX_BULK_CELLS=210;
let anchor=monday(TODAY),view='week',filter='ALL',focusedStaffId=null,selected=null,staff=[],state={},rhSettings={},publication=null,actor=null,tenant='',token='',device='',busy=false,readOnly=false,lastFetch=0;
const premiumChannel=typeof BroadcastChannel!=='undefined'?new BroadcastChannel('ichef-planning-premium-events-v1'):null;
function broadcastPlanningChange(mm){try{premiumChannel?.postMessage({type:'PLANNING_CHANGED',tenant,month:mm,at:Date.now()});}catch(_){}}
function mkDevice(){const key='ichef_planning_device_v1';let id='';try{id=localStorage.getItem(key)||'';if(!id){id=crypto.randomUUID();localStorage.setItem(key,id);}}catch{ id=(crypto.randomUUID?.()||('pwa_'+Date.now())); }return id;}
device=mkDevice();let oldTenant='';try{oldTenant=localStorage.getItem('ichef_tenant_id')||'';}catch{}tenant=(query.get('tenantID')||oldTenant||'').trim().slice(0,80);$('login-tenant').value=tenant;
function setStatus(text,error=false){$('board-status').textContent=(error?'● ':'● ')+text;$('board-status').style.color=error?'#b64140':'#357b66';}
function notify(message){$('toast').textContent=message;$('toast').classList.remove('hide');clearTimeout(notify.timer);notify.timer=setTimeout(()=>$('toast').classList.add('hide'),4300);}
function showAuth(error=''){exitBulk();closeAssistant();token='';actor=null;focusedStaffId=null;staff=[];state={};publication=null;render();$('login-shield').classList.remove('hide');$('login-error').textContent=error;setStatus('Connexion requise',true);}
function authKey(){return 'ichef_planning_premium_auth_v1';}
function forget(){try{sessionStorage.removeItem(authKey());}catch{}}
function authHeaders(){return {'Accept':'application/json','Authorization':`Bearer ${token}`,'X-iCHEF-Tenant':tenant,'X-iCHEF-Device':device};}
async function jsonFetch(path,opts={}){
 const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),12500);
 try{const response=await fetch(new URL(path,RH_API_BASE),{...opts,credentials:'include',cache:'no-store',signal:ctrl.signal});const data=await response.json().catch(()=>({}));if(!response.ok||data.success===false){const err=new Error(data.error||`Erreur HTTP ${response.status}`);err.status=response.status;err.code=data.code;throw err;}return data;}
 finally{clearTimeout(timer);}
}
async function login(ev){ev.preventDefault();const t=$('login-tenant').value.trim();const pin=$('login-pin').value.trim();if(!/^[a-z0-9_-]{2,80}$/i.test(t)||!/^[0-9]{4,12}$/.test(pin))return void ($('login-error').textContent='Identifiant ou code PIN invalide.');const btn=$('login-button');btn.disabled=true;$('login-error').textContent='Vérification sécurisée…';
 try{const res=await jsonFetch('/api/rh/planning/session',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json','X-iCHEF-Tenant':t,'X-iCHEF-Device':device},body:JSON.stringify({tenantID:t,pin,deviceId:device})});tenant=t;token=res.accessToken;actor=res.actor;try{localStorage.setItem('ichef_tenant_id',tenant);}catch{}query.set('tenantID',tenant);history.replaceState(null,'',location.pathname+'?'+query.toString());$('login-pin').value='';try{sessionStorage.setItem(authKey(),JSON.stringify({tenant,device,token,actor,exp:Date.now()+Math.min(Number(res.expiresInSeconds||7200),7200)*1000-10000}));}catch{}$('login-shield').classList.add('hide');await refresh(true);}
 catch(e){$('login-pin').value='';forget();showAuth(e.message||'Connexion refusée.');}
 finally{btn.disabled=false;}
}
async function restoreAuth(){try{const row=JSON.parse(sessionStorage.getItem(authKey())||'null');if(row?.token&&row?.tenant===tenant&&row?.device===device&&row.exp>Date.now()){token=row.token;actor=row.actor;$('login-shield').classList.add('hide');await refresh(true);return;}}catch(e){console.warn('[RH premium] session à réauthentifier',e?.message);}showAuth();}
function convert(day){if(!day||!Object.keys(day).length)return empty();const s=String(day.status||'');const p=String(day.s1||'').split('-'),q=String(day.s2||'').split('-');let k='A';if(s==='off')k='R';else if(s==='conge')k='CP';else if(s==='maladie')k='MAL';else if(s==='accident_travail')k='ACC';else if(s==='absence_injustifiee')k='NJS';else if(s==='maternite')k='MAT';else if(s==='paternite')k='PAT';else if(s==='parental')k='PAR';else if(s==='enfant_malade')k='EFM';else if(s==='evenement_familial')k='EVF';else if(s==='deces')k='DEC';else if(s==='sans_solde')k='SSL';else if(s==='recup')k='RECUP';else if(s==='ferie')k='FERIE';else if(s==='formation')k='FORM';else if(s==='present'||s==='off_matin'||s==='off_soir')k=(day.s1&&day.s2)?'C':(day.s1?'M':'S');return {k,status:s,start:p[0]||'',end:p[1]||'',s2:q[0]||'',e2:q[1]||'',pause:Number(day.pause||0),note:String(day.obs||''),original:day};}
function get(p,date){const d=iso(date),m=d.slice(0,7),n=String(Number(d.slice(8)));return convert(state?.[m]?.[p.id]?.[n]);}
function work(r){return ['M','S','C'].includes(r.k);}
function mins(a,b){if(!a||!b)return 0;const t=x=>Number(x.slice(0,2))*60+Number(x.slice(3,5));return ((t(b)-t(a)+1440)%1440)/60;}
function hours(r){return !work(r)?0:Math.max(0,mins(r.start,r.end)+mins(r.s2,r.e2)-r.pause/60);}
function label(r){
 const segments=[];
 if(r.start&&r.end)segments.push(`${r.start}–${r.end}`);
 if(r.s2&&r.e2)segments.push(`${r.s2}–${r.e2}`);
 return segments.join(' / ');
}
function visible(){
 const matching=staff.filter(x=>filter==='ALL'||x.dept===filter);
 return focusedStaffId?staff.filter(x=>String(x.id)===focusedStaffId):matching;
}
function shiftMarkup(r){
 if(r.k==='O')return '<span class="entry-label">+</span>';
 const heading=esc(types[r.k]||'ABSENCE');
 const segments=[];
 if(r.start&&r.end)segments.push(`${r.start}–${r.end}`);
 if(r.s2&&r.e2)segments.push(`${r.s2}–${r.e2}`);
 return `<span class="entry-label">${heading}</span>${segments.map(x=>`<span class="entry-time">${esc(x)}</span>`).join('')}`;
}
function openEmployee(staffId){
 const p=staff.find(x=>String(x.id)===String(staffId));
 if(!p)return;
 focusedStaffId=String(p.id);
 anchor=view==='month'?monday(anchor):anchor;
 switchView('week');
 staffPage=0;
}
function closeEmployee(){focusedStaffId=null;render();}
function periodDays(){
 if(view==='week')return Array.from({length:7},(_,i)=>add(monday(anchor),i));
 const first=new Date(anchor.getFullYear(),anchor.getMonth(),1,12);
 const n=new Date(first.getFullYear(),first.getMonth()+1,0).getDate();
 return Array.from({length:n},(_,i)=>add(first,i));
}
function renderPersonBar(){
 const person=focusedStaffId?staff.find(x=>String(x.id)===focusedStaffId):null;
 $('person-bar').classList.toggle('hide',!person);
 document.querySelector('.board').classList.toggle('person-mode',Boolean(person));
 $('panel-view-title').textContent=person?'Ce collaborateur':'Vue d’ensemble';
 $('panel-view-subtitle').textContent=person?
  `Consultez et modifiez les journées de ${person.name} directement sur le planning officiel.`:
  'Planning officiel : lecture et modification directement sur iCHEF OS.';
 if(!person)return;
 $('person-title').textContent=person.name||'Collaborateur';
 $('person-role').textContent=[person.role,person.dept].filter(Boolean).join(' · ');
 $('person-avatar').textContent=person.avatar||'?';
 const days=periodDays();
 const hrs=days.reduce((total,d)=>total+hours(get(person,d)),0);
 $('person-hours').textContent=`${hrs.toFixed(1).replace('.',',')} h ${view==='month'?'ce mois':'cette semaine'}`;
}
function capacity(){
 const area=document.querySelector('.schedule-wrap');
 const space=area?.clientHeight||300;
 // Enough room for header and totals: never sacrifice legibility for a tiny cell.
 const mobile=matchMedia('(max-width:600px)').matches;
 const row=mobile?56:63;
 return Math.max(1,Math.min(32,Math.floor(Math.max(30,space-74)/row)));
}
function updateDayPicker(){
 const picker=$('day-picker');if(!picker)return;
 const days=Array.from({length:7},(_,i)=>add(monday(anchor),i));
 picker.innerHTML=days.map((d,i)=>`<button type="button" data-day-pick="${i}" class="${i===dayIndex?'selected':''}" aria-pressed="${i===dayIndex}" aria-label="${esc(fmt(d,{weekday:'long',day:'numeric',month:'long'}))}">${esc(fmt(d,{weekday:'short'}))}<small>${fmt(d,{day:'numeric'})}</small></button>`).join('');
 picker.querySelectorAll('[data-day-pick]').forEach(b=>b.onclick=()=>{dayIndex=Number(b.dataset.dayPick);renderWeek();});
}

/* V274 : sélection tactile. Toucher court = édition, maintenir 550 ms = sélection.
   Mode groupé explicite également utilisable à la souris et au clavier. */
function bulkKey(person,date){return `${person}||${date}`;}
function clearBulkSelection(){bulkSelected.clear();bulkLastCell=null;bulkVisualRefresh();updateBulkBar();}
function exitBulk(){if(bulkSaving)return;bulkMode=false;bulkSelected.clear();bulkLastCell=null;const sh=$('bulk-shield');if(sh)sh.classList.add('hide');if($('bulk-toggle'))$('bulk-toggle').setAttribute('aria-pressed','false');if($('bulk-bar'))$('bulk-bar').classList.add('hide');document.querySelector('.board')?.classList.remove('bulk-active');}
function setBulkMode(on){if(bulkSaving||!token||readOnly){if(on)notify('Le planning est verrouillé ou la session n’est pas autorisée.');return;}bulkMode=on;if(!on){exitBulk();render();return;}$('bulk-toggle').setAttribute('aria-pressed','true');document.querySelector('.board')?.classList.add('bulk-active');$('bulk-bar').classList.remove('hide');render();updateBulkBar();}
function bulkVisualRefresh(){document.querySelectorAll('button[data-person][data-date],button[data-edit-person][data-edit-date]').forEach(b=>{const p=b.dataset.person||b.dataset.editPerson,d=b.dataset.date||b.dataset.editDate,on=bulkSelected.has(bulkKey(p,d));b.classList.toggle('is-marked',on);b.setAttribute('aria-pressed',String(on));});document.querySelectorAll('button[data-month-day]').forEach(b=>{const people=visible(),d=b.dataset.monthDay;b.classList.toggle('is-marked',bulkMode&&people.length>0&&people.every(p=>bulkSelected.has(bulkKey(p.id,d))));});}
function updateBulkBar(){if(!$('bulk-count'))return;const count=bulkSelected.size;$('bulk-count').textContent=count?`${count} case${count>1?'s':''}`:'0 case';$('bulk-open').disabled=bulkSaving||!count;$('bulk-clear').disabled=bulkSaving||!count;$('bulk-exit').disabled=bulkSaving;}
function bulkChangeCell(person,date,on){const key=bulkKey(person,date);if(on===false){bulkSelected.delete(key);return;}if(on===true&&bulkSelected.has(key))return;if(on===undefined&&bulkSelected.has(key)){bulkSelected.delete(key);return;}if(bulkSelected.size>=MAX_BULK_CELLS){notify(`Maximum ${MAX_BULK_CELLS} cases par opération.`);return;}bulkSelected.set(key,{person,date});}
function bulkToggle(person,date,e){if(!token||readOnly||bulkSaving)return;if(!staff.some(p=>p.id===person))return;if(e?.shiftKey&&bulkLastCell&&bulkLastCell.person===person){const a=bulkLastCell.date,b=date;if(/^\d{4}-\d\d-\d\d$/.test(a)&&/^\d{4}-\d\d-\d\d$/.test(b)){let d=new Date((a<b?a:b)+'T12:00:00'),end=a>b?a:b,steps=0;while(iso(d)<=end&&steps++<32){bulkChangeCell(person,iso(d),true);d=add(d,1);}}}else bulkChangeCell(person,date);bulkLastCell={person,date};bulkVisualRefresh();updateBulkBar();}
function bulkToggleRow(person,days){if(readOnly||busy)return;const items=days.map(d=>iso(d)),all=items.every(d=>bulkSelected.has(bulkKey(person,d)));items.forEach(d=>bulkChangeCell(person,d,!all));bulkVisualRefresh();updateBulkBar();}
function bulkToggleDay(date,people){if(readOnly||busy)return;if(people.length===0)return;const all=people.every(p=>bulkSelected.has(bulkKey(p.id,date)));people.forEach(p=>bulkChangeCell(p.id,date,!all));bulkVisualRefresh();updateBulkBar();}
function bindBulkCells(host,personAttr,dateAttr){
 host.querySelectorAll(`[${personAttr}][${dateAttr}]`).forEach(b=>{
  let timer=0,px=0,py=0,longFired=false;
  const person=b.getAttribute(personAttr),date=b.getAttribute(dateAttr);
  b.addEventListener('pointerdown',e=>{if(b.disabled||!e.isPrimary||e.button!==0||bulkMode)return;px=e.clientX;py=e.clientY;longFired=false;timer=setTimeout(()=>{timer=0;longFired=true;if(navigator.vibrate)try{navigator.vibrate(20);}catch(_){}setBulkMode(true);bulkToggle(person,date);},550);});
  b.addEventListener('pointermove',e=>{if(Math.abs(e.clientX-px)>10||Math.abs(e.clientY-py)>10){clearTimeout(timer);timer=0;}});
  for(const ev of ['pointerup','pointercancel','pointerleave'])b.addEventListener(ev,()=>{clearTimeout(timer);timer=0;});
  b.addEventListener('contextmenu',e=>{if(longFired||bulkMode)e.preventDefault();});
  b.addEventListener('click',e=>{if(longFired){e.preventDefault();e.stopPropagation();longFired=false;return;}if(bulkMode||e.ctrlKey||e.metaKey||e.shiftKey){e.preventDefault();if(!bulkMode)setBulkMode(true);bulkToggle(person,date,e);}else openModal(person,date);});
 });
}
function bindBulkTeamDates(host){
 host.querySelectorAll('[data-month-day]').forEach(b=>{
  let timer=0,x=0,y=0;
  b.addEventListener('pointerdown',e=>{if(bulkMode||e.button!==0||!e.isPrimary||readOnly)return;x=e.clientX;y=e.clientY;timer=setTimeout(()=>{timer=0;setBulkMode(true);bulkToggleDay(b.dataset.monthDay,visible());},550);});
  b.addEventListener('pointermove',e=>{if(Math.abs(e.clientX-x)>10||Math.abs(e.clientY-y)>10)clearTimeout(timer);});
  for(const ev of ['pointerup','pointercancel','pointerleave'])b.addEventListener(ev,()=>{clearTimeout(timer);timer=0;});
  b.addEventListener('contextmenu',e=>{if(bulkMode)e.preventDefault();});
 });
}
function openBulkEditor(){if(!bulkMode||bulkSelected.size===0||readOnly||busy)return;const entries=[...bulkSelected.values()],people=new Set(entries.map(x=>x.person)),dates=entries.map(x=>x.date).sort();const replacing=entries.filter(x=>{const p=staff.find(s=>s.id===x.person);return p&&get(p,new Date(x.date+'T12:00:00')).k!=='O';}).length;
 $('bulk-summary').textContent=`${entries.length} case(s) · ${people.size} collaborateur(s) · du ${dates[0]} au ${dates.at(-1)} · ${replacing} case(s) déjà renseignée(s).`;
 $('bulk-kind').value='R';$('bulk-reason').value='';$('bulk-note').value='';$('bulk-progress').textContent='';$('bulk-shield').classList.remove('hide');$('bulk-kind').focus();}
function closeBulkEditor(){if(bulkSaving)return;$('bulk-shield').classList.add('hide');$('bulk-open').focus();}
async function saveBulk(e){e.preventDefault();if(bulkSaving||busy||readOnly||!token||!bulkSelected.size)return;const k=$('bulk-kind').value,reason=$('bulk-reason').value.trim(),note=$('bulk-note').value.trim().slice(0,500);
 const status={R:'off',CP:'conge',RECUP:'recup',FERIE:'ferie',FORM:'formation',A:'absence_autorisee',SSL:'sans_solde'}[k];if(!status)return void notify('Type de journée invalide.');if(reason.length<3)return void notify('Un motif de 3 caractères minimum est obligatoire.');
 const entries=[...bulkSelected.values()];if(!confirm(`Confirmer ${entries.length} modification(s) en « ${types[k]||k} » ?\n\nLes services existants seront remplacés. En cas d’échec, seules les cases validées par le serveur seront enregistrées.`))return;
 busy=true;bulkSaving=true;$('bulk-confirm').disabled=true;$('bulk-cancel').disabled=true;$('bulk-close').disabled=true;updateBulkBar();
 let saved=0,failed=0,stop=false,authLost=false,lastError='',affected=new Set();
 for(const item of entries){
  if(!token){stop=true;break;}
  const p=staff.find(x=>x.id===item.person);if(!p){failed++;continue;}
  const base=get(p,new Date(item.date+'T12:00:00')).original||{};
  const day={...base,status,s1:'',s2:'',pause:0,obs:note};
  $('bulk-progress').textContent=`Enregistrement ${saved+failed+1} / ${entries.length} · ${saved} confirmé(s)…`;
  try{
   const res=await jsonFetch('/api/rh/planning/premium/day',{method:'POST',headers:{...authHeaders(),'Content-Type':'application/json'},body:JSON.stringify({tenantID:tenant,date:item.date,staffId:item.person,day,reason,baseRevision:base.planningVersionId||null})});
   const m=item.date.slice(0,7),n=String(Number(item.date.slice(8)));
   if(!state[m])state[m]={};if(!state[m][p.id])state[m][p.id]={};if(res.day)state[m][p.id][n]=res.day;
   bulkSelected.delete(bulkKey(item.person,item.date));saved++;affected.add(m);
  }catch(err){failed++;lastError=err.message||'Erreur serveur';authLost=[401,403].includes(err.status);stop=true;break;}
 }
 bulkSaving=false;busy=false;$('bulk-confirm').disabled=false;$('bulk-cancel').disabled=false;$('bulk-close').disabled=false;
 if(saved){$('audit-title').textContent=`Modification groupée · ${saved} case(s)`;$('audit-detail').textContent=`${reason} · statut ${types[k]}`;$('audit-date').textContent=fmt(new Date(),{hour:'2-digit',minute:'2-digit'});for(const m of affected)broadcastPlanningChange(m);lastFetch=0;if(publication?.status==='published'){publication={...publication,status:'to_review'};$('publication-status').textContent='⚠ Modifié · à republier';}}
 $('bulk-progress').textContent=`${saved} enregistrement(s) confirmé(s) · ${bulkSelected.size} case(s) restant à enregistrer${stop?' · opération interrompue':''}${lastError?' · '+lastError:''}`;
 if(failed){setStatus(`${saved} enregistrées, ${bulkSelected.size} encore à traiter · ${lastError}`,true);notify(`Sauvegarde partielle : ${saved} réussie(s), ${bulkSelected.size} restante(s). Les cases non enregistrées restent sélectionnées.`);}
 else{setStatus(`${saved} case(s) sauvegardée(s) sur le serveur`);notify(`${saved} case(s) enregistrée(s). Publication à vérifier.`);}
 if(authLost){forget();showAuth('Session expirée ou accès refusé.');return;}
 $('bulk-shield').classList.add('hide');render();updateBulkBar();
 if(saved&&!failed){exitBulk();render();void refresh(true);}
 // Important: pas de réessai automatique en cas de réseau incertain ou de conflit 409.
}
$('bulk-toggle').addEventListener('click',()=>setBulkMode(!bulkMode));
$('bulk-clear').addEventListener('click',clearBulkSelection);
$('bulk-exit').addEventListener('click',()=>{exitBulk();render();});
$('bulk-open').addEventListener('click',openBulkEditor);
$('bulk-close').addEventListener('click',closeBulkEditor);
$('bulk-cancel').addEventListener('click',closeBulkEditor);
$('bulk-form').addEventListener('submit',saveBulk);
$('bulk-shield').addEventListener('click',e=>{if(e.target===$('bulk-shield'))closeBulkEditor();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('bulk-shield').classList.contains('hide')){e.stopImmediatePropagation();closeBulkEditor();}else if(e.key==='Escape'&&bulkMode){exitBulk();render();}});

function renderWeek(){
 const people=visible(),days=Array.from({length:7},(_,i)=>add(monday(anchor),i));
 lastPageCapacity=capacity();
 const pages=Math.max(1,Math.ceil(people.length/lastPageCapacity));
 staffPage=Math.max(0,Math.min(staffPage,pages-1));
 const shown=people.slice(staffPage*lastPageCapacity,(staffPage+1)*lastPageCapacity);
 let h='<table class="schedule" aria-label="Planning semaine officiel"><thead><tr><th>COLLABORATEUR</th>';
 for(let i=0;i<days.length;i++){
  const d=days[i];h+=`<th data-dayindex="${i}" class="${iso(d)===iso(TODAY)?'today ':''}${i===dayIndex?'is-selected-day':''}">${bulkMode?`<button class="bulk-all-day" type="button" data-day-all="${iso(d)}" title="Sélectionner cette date pour les collaborateurs affichés" aria-label="Sélectionner tous les collaborateurs visibles le ${iso(d)}"><span class="weekday">${fmt(d,{weekday:'short'})}</span><span class="daynumber">${fmt(d,{day:'2-digit'})}</span></button>`:`<span class="weekday">${fmt(d,{weekday:'short'})}</span><span class="daynumber">${fmt(d,{day:'2-digit'})}</span>`}</th>`;
 }
 h+='</tr></thead><tbody>';
 for(const p of shown){
  h+=`<tr><td><button type="button" class="staff-open" data-profile="${esc(p.id)}" aria-label="${bulkMode?'Sélectionner la semaine de':'Voir le planning individuel de'} ${esc(p.name)}" title="${bulkMode?'Sélectionner les sept jours de':'Afficher le planning de'} ${esc(p.name)}"><span class="avatar">${esc(p.avatar)}</span><span class="staff-details"><span class="staff-name">${esc(p.name)}</span><span class="staff-role">${esc(p.role)}</span><span class="staff-hint">${focusedStaffId?'Profil sélectionné':'Voir son planning →'}</span></span></button></td>`;
  for(let i=0;i<days.length;i++){
   const d=days[i],r=get(p,d),caption=[types[r.k]||'Absence',label(r)].filter(Boolean).join(' · '),enabled=!readOnly;
   h+=`<td data-dayindex="${i}" data-daylabel="${esc(fmt(d,{weekday:'short',day:'2-digit'}))}" class="${(iso(d)===iso(TODAY)?'today ':'')+(i===dayIndex?'is-selected-day':'')}"><button class="entry ${(['M','S','C','R','O'].includes(r.k)?r.k:'A')} ${bulkSelected.has(bulkKey(p.id,iso(d)))?'is-marked':''}" type="button" data-person="${esc(p.id)}" data-date="${iso(d)}" ${enabled?'':'disabled'} title="${esc(caption)}" aria-pressed="${bulkSelected.has(bulkKey(p.id,iso(d)))}" aria-label="${bulkMode?'Sélectionner':'Modifier'} le ${iso(d)} pour ${esc(p.name)} : ${esc(caption)}">${shiftMarkup(r)}</button></td>`;
  }
  h+='</tr>';
 }
 h+='</tbody><tfoot><tr><td>TOTAL PRÉSENCES</td>';
 // Totaux de TOUTE l'équipe, pas uniquement les collaborateurs de cette page.
 for(let i=0;i<days.length;i++){const d=days[i],arr=people.map(p=>get(p,d)).filter(work);h+=`<td data-dayindex="${i}" data-daylabel="${esc(fmt(d,{weekday:'short',day:'2-digit'}))}" class="day-summary ${i===dayIndex?'is-selected-day':''}">${arr.length} équipe<span>${arr.reduce((sum,r)=>sum+hours(r),0).toFixed(1)} h</span></td>`;}
 h+='</tr></tfoot></table>';
 $('week-host').innerHTML=h;
 $('week-host').querySelectorAll('[data-profile]').forEach(b=>b.addEventListener('click',()=>{if(bulkMode)bulkToggleRow(b.dataset.profile,days);else openEmployee(b.dataset.profile);}));
 bindBulkCells($('week-host'),'data-person','data-date');
 $('week-host').querySelectorAll('[data-day-all]').forEach(b=>b.addEventListener('click',()=>bulkToggleDay(b.dataset.dayAll,shown)));
 const pager=$('staff-pager');
 pager.hidden=!!focusedStaffId||view!=='week'||pages===1;
 $('staff-page-label').textContent=people.length?`${staffPage*lastPageCapacity+1}–${Math.min(people.length,(staffPage+1)*lastPageCapacity)} / ${people.length} collaborateurs`:'Aucun collaborateur';
 $('staff-prev').disabled=staffPage<=0;
 $('staff-next').disabled=staffPage>=pages-1;
 document.querySelector('.board').classList.toggle('pager-visible',!pager.hidden);
 updateDayPicker();
}
function renderMonth(){
 const first=new Date(anchor.getFullYear(),anchor.getMonth(),1,12),shift=(first.getDay()+6)%7,last=new Date(first.getFullYear(),first.getMonth()+1,0).getDate();
 const person=focusedStaffId?staff.find(x=>String(x.id)===focusedStaffId):null;
 let h='<div class="month-wrap"><div class="month-head">';
 for(const d of ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'])h+=`<div>${d}</div>`;
 h+='</div><div class="month-grid">';
 for(let j=0;j<Math.ceil((last+shift)/7)*7;j++){
  const day=j-shift+1;
  if(day<1||day>last){h+='<div class="monthday empty"></div>';continue;}
  const date=new Date(first.getFullYear(),first.getMonth(),day,12),key=iso(date);
  if(person){
    const r=get(person,date),caption=types[r.k]||'ABSENCE';
    const segments=[r.start&&r.end?`${r.start}–${r.end}`:'',r.s2&&r.e2?`${r.s2}–${r.e2}`:''].filter(Boolean);
    h+=`<button class="monthday ${key===iso(TODAY)?'today':''} ${['M','S','C','R'].includes(r.k)?r.k:''} ${bulkSelected.has(bulkKey(person.id,key))?'is-marked':''}" data-edit-person="${esc(person.id)}" data-edit-date="${key}" type="button" ${readOnly?'disabled':''} aria-pressed="${bulkSelected.has(bulkKey(person.id,key))}" aria-label="${esc(person.name)} · ${key} · ${esc(caption)} · ${esc(segments.join(' et '))}"><b>${day}</b><span class="month-label">${esc(r.k==='O'?'Ajouter +':caption)}</span>${segments.map(t=>`<small class="month-time">${esc(t)}</small>`).join('')}</button>`;
  }else{
    const n=visible().filter(p=>work(get(p,date))).length;
    h+=`<button class="monthday ${key===iso(TODAY)?'today':''} ${bulkMode&&visible().length&&visible().every(p=>bulkSelected.has(bulkKey(p.id,key)))?'is-marked':''}" data-month-day="${key}" type="button" aria-label="Voir la semaine du ${key}"><b>${day}</b><small>${n} service${n>1?'s':''}</small><i></i></button>`;
  }
 }
 h+='</div></div>';
 $('month-host').innerHTML=h;
 $('month-host').querySelectorAll('[data-month-day]').forEach(b=>b.addEventListener('click',()=>{if(bulkMode){bulkToggleDay(b.dataset.monthDay,visible());return;}anchor=monday(new Date(b.dataset.monthDay+'T12:00:00'));switchView('week');refresh(true);}));
 bindBulkCells($('month-host'),'data-edit-person','data-edit-date');
 bindBulkTeamDates($('month-host'));
}
function renderStats(){
 const days=periodDays(),people=visible(),arr=people.flatMap(p=>days.map(d=>get(p,d)));
 const sh=arr.filter(work),tot=sh.reduce((s,r)=>s+hours(r),0);
 $('kpi-hours').textContent=tot.toFixed(1).replace('.',',')+' h';
 $('kpi-shifts').textContent=sh.length;
 $('kpi-absences').textContent=arr.filter(r=>['A','CP','MAL','RECUP','FORM','FERIE','NJS','ACC','MAT','PAT','PAR','EFM','EVF','DEC','SSL'].includes(r.k)).length;
 $('kpi-staff').textContent=people.length;
 $('morning').textContent=arr.filter(r=>r.k==='M'||r.k==='C').length;
 $('evening').textContent=arr.filter(r=>r.k==='S'||r.k==='C').length;
 $('split').textContent=arr.filter(r=>r.k==='C').length;
 const covered=days.filter(d=>people.some(p=>work(get(p,d)))).length;
 $('coverage').textContent=`${covered}/${days.length}`;
 $('coverage-bar').style.width=days.length?covered/days.length*100+'%':'0%';
 $('panel-range-label').textContent=view==='month'?'Ce mois':'Cette semaine';
 $('kpi-period-label').textContent=view==='month'?'Mois affiché':'Semaine affichée';
}
function render(){if($('bulk-toggle'))$('bulk-toggle').disabled=readOnly||!token||bulkSaving;if(view!=='week'){$('staff-pager').hidden=true;$('day-picker').style.display='none';}else{$('day-picker').style.display='';}renderPersonBar();if(view==='week'){$('range').textContent=`${fmt(anchor,{day:'numeric',month:'short'})} – ${fmt(add(anchor,6),{day:'numeric',month:'short',year:'numeric'})}`;renderWeek();}else{$('range').textContent=fmt(anchor,{month:'long',year:'numeric'});renderMonth();}renderStats();}
function switchView(v){view=v;for(const which of ['week','month']){$('view-'+which).classList.toggle('active',which===v);$('view-'+which).setAttribute('aria-pressed',String(which===v));$(which+'-host').classList.toggle('hide',which!==v);}render();}
function updateDepartments(){const select=$('department'),old=filter;select.innerHTML='<option value="ALL">Tous les services</option>';[...new Set(staff.map(s=>s.dept).filter(Boolean))].sort().forEach(d=>{const o=document.createElement('option');o.value=d;o.textContent=d;select.appendChild(o);});filter=old==='ALL'||staff.some(s=>s.dept===old)?old:'ALL';select.value=filter;}
async function refresh(force=false){if(!token||busy)return;if(!force&&Date.now()-lastFetch<3500)return;busy=true;setStatus('Synchronisation sécurisée en cours…');try{const m=month(anchor);const res=await jsonFetch(`/api/rh/planning/premium/state?tenantID=${encodeURIComponent(tenant)}&month=${m}`,{headers:authHeaders()});staff=(res.staff||[]).map(p=>({...p,id:String(p.id),dept:String(p.dept||'Sans secteur'),avatar:String(p.name||'?').split(/\s+/).slice(0,2).map(z=>z[0]).join('').toUpperCase()}));state={...state,...(res.timesheets||{})};rhSettings=res.settings||{};
publication=res.publication||null;readOnly=rhSettings.planningStatus==='locked';lastFetch=Date.now();
$('publication-status').textContent=publication?.status==='published'?'✓ Mois publié':
  publication?.status==='to_review'?'⚠ Modifié après publication · à revalider':'Publication : en attente';
for(const [key,item] of bulkSelected){if(!staff.some(p=>p.id===item.person))bulkSelected.delete(key);}updateDepartments();render();updateBulkBar();setStatus(`Synchronisé · ${tenant} · ${new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}${readOnly?' · planning verrouillé':''}`);
 // En vue semaine à cheval sur deux mois, charger la seconde période sans bloquer le premier affichage.
 if(view==='week'){
  const extra=month(add(monday(anchor),6));
  if(extra!==m){
   void jsonFetch(`/api/rh/planning/premium/state?tenantID=${encodeURIComponent(tenant)}&month=${extra}`,{headers:authHeaders()})
    .then(extraRes=>{state={...state,...(extraRes.timesheets||{})};if(month(add(monday(anchor),6))===extra)render();})
    .catch(e=>console.warn('[iCHEF Planning] mois adjacent indisponible',e?.message));
  }
 }}
catch(e){setStatus(e.message,true);if(e.status===401||e.status===403){forget();showAuth(e.message);}else notify('Réseau indisponible. Les données ne sont pas modifiées.');}finally{busy=false;}}
function openModal(person,date){if(!token||readOnly)return;const p=staff.find(x=>x.id===person);if(!p)return;const d=new Date(date+'T12:00:00'),r=get(p,d);selected={person,date,base:r.original};$('modal-sub').textContent=`${p.name} · ${fmt(d,{weekday:'long',day:'numeric',month:'long'})}`;$('kind').value=types[r.k]?r.k:'A';$('start').value=r.start||'08:00';$('end').value=r.end||'16:00';$('split-start').value=r.s2||'18:00';$('split-end').value=r.e2||'22:00';$('note').value=r.note;$('reason').value='';updateForm();$('modal-backdrop').classList.remove('hide');$('kind').focus();}
function closeModal(){selected=null;$('modal-backdrop').classList.add('hide');}
function updateForm(){const k=$('kind').value;document.querySelectorAll('[data-preset]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.preset===k)));for(const id of ['time1','time2'])$(id).classList.toggle('hide',!['M','S','C'].includes(k));$('split-row').classList.toggle('hide',k!=='C');}
function pair(a,b){return /^\d{2}:\d{2}$/.test(a)&&/^\d{2}:\d{2}$/.test(b)&&a!==b;}
function getDraft(){const k=$('kind').value,original=selected?.base||{},note=$('note').value.trim().slice(0,500);let r={...original,status:'off',s1:'',s2:'',pause:0,obs:note};if(['M','S','C'].includes(k)){if(!pair($('start').value,$('end').value))throw Error('Horaires de service invalides.');r.status=k==='M'?'off_soir':k==='S'?'off_matin':'present';const s=`${$('start').value}-${$('end').value}`;if(k==='S')r.s2=s;else r.s1=s;if(k==='C'){if(!pair($('split-start').value,$('split-end').value))throw Error('Deuxième service invalide.');r.s2=`${$('split-start').value}-${$('split-end').value}`;}}else{r.status=({R:'off',CP:'conge',MAL:'maladie',RECUP:'recup',FERIE:'ferie',FORM:'formation',A:'absence_autorisee',NJS:'absence_injustifiee',ACC:'accident_travail',MAT:'maternite',PAT:'paternite',PAR:'parental',EFM:'enfant_malade',EVF:'evenement_familial',DEC:'deces',SSL:'sans_solde',O:'off'})[k]||'off';}return k==='O'?null:r;}
async function save(){if(!selected||busy)return;const reason=$('reason').value.trim();if(reason.length<3)return notify('Motif obligatoire (au moins 3 caractères).');let day;try{day=getDraft();}catch(e){return notify(e.message);}busy=true;setStatus('Enregistrement sur le serveur…');const btn=$('shift-form').querySelector('[type="submit"]');btn.disabled=true;try{const res=await jsonFetch('/api/rh/planning/premium/day',{method:'POST',headers:{...authHeaders(),'Content-Type':'application/json'},body:JSON.stringify({tenantID:tenant,date:selected.date,staffId:selected.person,day,reason,baseRevision:selected.base?selected.base.planningVersionId||'':null})});const m=selected.date.slice(0,7),n=String(Number(selected.date.slice(8)));if(!state[m])state[m]={};if(!state[m][selected.person])state[m][selected.person]={};if(res.day)state[m][selected.person][n]=res.day;else delete state[m][selected.person][n];$('audit-title').textContent=`Modifié · ${res.staffName||selected.person}`;$('audit-detail').textContent=`${selected.date} · ${reason}`;$('audit-date').textContent=fmt(new Date(),{hour:'2-digit',minute:'2-digit'});closeModal();render();setStatus('Enregistré sur le serveur central · RH et Staff informés');notify('Horaire sauvegardé et synchronisé.');broadcastPlanningChange(m);lastFetch=0;
if(publication?.status==='published'){$('publication-status').textContent='⚠ Horaire modifié · à republier';publication={...publication,status:'to_review'};}}
catch(e){setStatus(e.message,true);if(e.status===409){notify('Planning modifié ailleurs : rechargement nécessaire avant de réessayer.');closeModal();lastFetch=0;}else if(e.status===401||e.status===403){forget();showAuth(e.message);}else notify('Enregistrement refusé : '+e.message);}
finally{busy=false;btn.disabled=false;}}
$('staff-prev').onclick=()=>{staffPage=Math.max(0,staffPage-1);renderWeek();};
$('staff-next').onclick=()=>{staffPage+=1;renderWeek();};
$('actions-toggle').onclick=()=>{const a=$('top-actions'),on=a.classList.toggle('actions-open');$('actions-toggle').setAttribute('aria-expanded',String(on));};
$('mobile-menu-toggle').onclick=()=>{const s=document.querySelector('.sidebar'),on=s.classList.toggle('nav-open');$('mobile-menu-toggle').setAttribute('aria-expanded',String(on));};
function closeOverview(){const p=$('overview-panel');p.classList.remove('panel-open');$('panel-toggle').setAttribute('aria-expanded','false');}
$('panel-toggle').onclick=()=>{const p=$('overview-panel'),on=p.classList.toggle('panel-open');$('panel-toggle').setAttribute('aria-expanded',String(on));};
$('panel-close').onclick=closeOverview;
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeOverview();$('top-actions').classList.remove('actions-open');document.querySelector('.sidebar').classList.remove('nav-open');}});
let resizeTimer=0;
window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{if(view==='week'){if(capacity()!==lastPageCapacity)renderWeek();}else renderMonth();},100);});
$('logout').onclick=()=>{closeAssistant();forget();$('login-pin').value='';showAuth('Session fermée sur cet appareil.');};
$('login-form').onsubmit=login;$('prev').onclick=()=>{anchor=view==='week'?add(anchor,-7):new Date(anchor.getFullYear(),anchor.getMonth()-1,1,12);render();refresh(true);};$('next').onclick=()=>{anchor=view==='week'?add(anchor,7):new Date(anchor.getFullYear(),anchor.getMonth()+1,1,12);render();refresh(true);};$('today').onclick=()=>{dayIndex=(TODAY.getDay()+6)%7;anchor=view==='week'?monday(TODAY):new Date(TODAY.getFullYear(),TODAY.getMonth(),1,12);render();refresh(true);};$('view-week').onclick=()=>{staffPage=0;switchView('week');};$('view-month').onclick=()=>{anchor=new Date(anchor.getFullYear(),anchor.getMonth(),1,12);switchView('month');refresh(true);};$('department').onchange=e=>{filter=e.target.value;focusedStaffId=null;staffPage=0;render();};$('team-return').onclick=closeEmployee;$('close').onclick=closeModal;$('cancel').onclick=closeModal;$('kind').onchange=updateForm;document.querySelectorAll('[data-preset]').forEach(b=>b.addEventListener('click',()=>{$('kind').value=b.dataset.preset;updateForm();}));$('remove').onclick=()=>{$('kind').value='O';save();};$('shift-form').onsubmit=e=>{e.preventDefault();save();};$('modal-backdrop').onclick=e=>{if(e.target===$('modal-backdrop'))closeModal();};document.addEventListener('keydown',e=>{if(e.key==='Escape'&&selected)closeModal();});$('reset').onclick=()=>refresh(true);
async function publishMonth(){
  if(!token||busy||readOnly)return;
  const m=month(anchor);
  if(!confirm(`Publier le planning officiel de ${m} sur le Portail Staff ?\n\nVérifiez la couverture, les contrats, les repos, les congés approuvés et la conformité légale avant de confirmer.`))return;
  busy=true;const b=$('publish');b.disabled=true;setStatus('Publication sécurisée en cours…');
  try{
    const res=await jsonFetch('/api/rh/planning/premium/publish',{
      method:'POST',headers:{...authHeaders(),'Content-Type':'application/json'},
      body:JSON.stringify({tenantID:tenant,month:m,confirmed:true})
    });
    publication=res.publication||null;
    $('publication-status').textContent='✓ Mois publié';
    setStatus(`Mois ${m} publié · équipes synchronisées`);notify('Planning publié auprès du Portail Staff.');
    broadcastPlanningChange(m);lastFetch=0;
  }catch(e){setStatus(e.message,true);
    if(e.status===401||e.status===403){forget();showAuth(e.message);}else notify('Publication refusée : '+e.message);
  }finally{busy=false;b.disabled=false;}
}
$('publish').onclick=publishMonth;

/* V273 — Moteur d'assistance décisionnelle utilisant exclusivement le planning
   officiel chargé par la session RH. Pas de requête vers un fournisseur externe,
   pas de clé IA dans le navigateur, pas de publication automatique. L'assistant
   RH complet déjà présent dans l'interface parente est accessible si celle-ci
   est embarquée sur le même domaine. */
let assistantIssues=[],assistantPage=0,assistantVisible=3,assistantSnapshot='';
function assistantIsOpen(){return !$('assistant-shield').classList.contains('hide');}
function closeAssistant(){const m=$('assistant-shield');if(m)m.classList.add('hide');}
function assistantDates(){return periodDays();}
function assistantCount(){return innerHeight<580?2:innerHeight<740?3:innerHeight<900?4:5;}
function assistantFindings(){
 const people=visible(),days=assistantDates();
 const issues=[];let totalHours=0,services=0,uncovered=0,unpaired=0,longRuns=0;
 if(!days.length||!people.length)return {issues,summary:{people:people.length,hours:0,services:0,uncovered:0}};
 const addIssue=(level,title,detail,person,date)=>issues.push({level,title,detail,person,date});
 const dayClosed=new Set(Array.isArray(rhSettings?.planningClosedWeekdays)?rhSettings.planningClosedWeekdays.map(x=>Number(x)):[]);
 for(const day of days){
  const working=people.map(p=>({p,r:get(p,day)})).filter(x=>work(x.r));
  const atMorning=working.filter(x=>x.r.k==='M'||x.r.k==='C').length;
  const atEvening=working.filter(x=>x.r.k==='S'||x.r.k==='C').length;
  for(const x of working){totalHours+=hours(x.r);services++;}
  const date=iso(day),label=fmt(day,{weekday:'short',day:'numeric',month:'short'});
  if(dayClosed.has(day.getDay()))continue; // pas d'alerte sur la fermeture configurée.
  if(!working.length){uncovered++;addIssue('alert','Aucun service prévu · '+label,'Vérifier si le jour est fermé ou si une couverture doit être organisée.',null,date);}
  else if(atMorning===0||atEvening===0){addIssue('warn','Couverture à vérifier · '+label,atMorning===0?'Aucun service matin saisi sur cette journée.':'Aucun service soir saisi sur cette journée.',null,date);}
 }
 for(const person of people){
  const history=days.map(d=>({d,r:get(person,d)}));
  let run=0,maxRun=0,stopDate=null;
  for(const {d,r} of history){if(work(r)){run++;if(run>maxRun){maxRun=run;stopDate=iso(d);}}else run=0;}
  if(maxRun>5){longRuns++;addIssue('alert',person.name+' · '+maxRun+' jours travaillés consécutifs','Point de vigilance (> 5 jours dans la période affichée). Contrôler les règles applicables et les journées limitrophes.',person.id,stopDate);}
  let paired=0,single=0;
  // Seulement à l'intérieur de la période affichée. Pas d'affirmation légale.
  for(let i=0;i<history.length;i++){
   if(history[i].r.k==='R'){
    if(i+1<history.length&&history[i+1].r.k==='R'){paired++;i++;}
    else single++;
   }
  }
  if(single>0&&paired===0&&history.some(x=>work(x.r))){unpaired++;addIssue('info',person.name+' · repos isolés','Aucun bloc de deux jours de repos consécutifs visible. Vérifier les préférences et les jours voisins.',person.id,null);}
  const hrs=history.reduce((acc,x)=>acc+hours(x.r),0);
  if(view==='week'&&hrs>48)addIssue('warn',person.name+' · '+hrs.toFixed(1).replace('.',',')+' h cette semaine','Heures planifiées élevées. Examiner le contrat, les pauses, le cadre légal applicable et les pointages.',person.id,null);
 }
 if(issues.length===0)addIssue('info','Aucune alerte simple détectée','La couverture et les repos restent à valider selon les contrats, congés et contraintes de service. Cette analyse ne certifie pas la conformité.',null,null);
 issues.sort((a,b)=>({alert:0,warn:1,info:2}[a.level]-{alert:0,warn:1,info:2}[b.level]));
 return {issues,summary:{people:people.length,hours:totalHours,services,uncovered,longRuns,unpaired}};
}
function assistantNav(issue){
 if(!issue?.date&&!issue?.person)return;
 closeAssistant();
 if(issue.person){focusedStaffId=String(issue.person);staffPage=0;}
 if(issue.date){
  const d=new Date(issue.date+'T12:00:00');
  dayIndex=(d.getDay()+6)%7;anchor=monday(d);
  switchView('week');
  // Ne pas ouvrir une modification sans responsable ayant choisi le collaborateur.
  if(issue.person&&!readOnly){openModal(String(issue.person),issue.date);}
 }else{switchView('week');}
 void refresh(true);
}
function renderAssistant(){
 assistantVisible=assistantCount();
 const sh=$('assistant-shield'),out=$('assistant-findings'),amount=assistantIssues.length;
 sh.style.setProperty('--assistant-visible',String(assistantVisible));
 const pages=Math.max(1,Math.ceil(amount/assistantVisible));assistantPage=Math.max(0,Math.min(assistantPage,pages-1));
 const page=assistantIssues.slice(assistantPage*assistantVisible,(assistantPage+1)*assistantVisible);
 out.replaceChildren();
 for(const item of page){
  const row=document.createElement('article');row.className='assistant-item';
  const level=document.createElement('span');level.className='assistant-level '+(item.level==='info'?'':item.level);level.setAttribute('aria-hidden','true');
  const info=document.createElement('div');info.className='assistant-item-info';
  const title=document.createElement('strong');title.textContent=item.title;
  const desc=document.createElement('p');desc.textContent=item.detail;
  info.append(title,desc);row.append(level,info);
  if(item.person||item.date){const b=document.createElement('button');b.type='button';b.className='btn small';b.textContent='Voir →';b.addEventListener('click',()=>assistantNav(item));row.append(b);}
  out.append(row);
 }
 $('assistant-counter').textContent=`${assistantPage+1} / ${pages} · ${amount} point${amount>1?'s':''}`;
 $('assistant-prev').disabled=assistantPage===0;
 $('assistant-next').disabled=assistantPage>=pages-1;
}
function analyzeAssistant(){
 if(!token){closeAssistant();notify('Accès réservé aux responsables RH et Direction.');return;}
 const m=month(anchor),suffix=view==='week'?'semaine':'mois';
 const {issues,summary}=assistantFindings();assistantIssues=issues;assistantPage=0;
 $('assistant-period').textContent=`${suffix==='semaine'?'Semaine':'Mois'} · ${$('range').textContent} · ${filter==='ALL'?'Tous les services':filter}`;
 $('assistant-status').textContent='Analyse de décision connectée au planning officiel · aucune modification effectuée.';
 $('assistant-metrics').innerHTML=[
  [summary.people,'Collaborateurs'],[summary.services,'Services prévus'],[summary.hours.toFixed(1).replace('.',',')+' h','Heures affichées'],[summary.uncovered,'Jours sans service']
 ].map(x=>`<div class="assistant-metric"><b>${esc(x[0])}</b><span>${esc(x[1])}</span></div>`).join('');
 renderAssistant();
}
function openAssistant(){
 if(!token){notify('Connectez-vous avec une session responsable Direction / RH.');return;}
 $('top-actions').classList.remove('actions-open');
 document.querySelector('.sidebar').classList.remove('nav-open');
 $('assistant-shield').classList.remove('hide');
 const direct=window.parent!==window && (()=>{try{return location.origin===window.parent.location.origin&&typeof window.parent.openPlanningAssistant==='function';}catch{return false;}})();
 $('assistant-rh-advanced').classList.toggle('hide',!direct);
 analyzeAssistant();$('assistant-close').focus();
}
$('assistant-close').onclick=closeAssistant;$('assistant-done').onclick=closeAssistant;
$('assistant-shield').addEventListener('click',e=>{if(e.target===$('assistant-shield'))closeAssistant();});
$('assistant-prev').onclick=()=>{assistantPage=Math.max(0,assistantPage-1);renderAssistant();};
$('assistant-next').onclick=()=>{assistantPage++;renderAssistant();};
$('assistant-reanalyze').onclick=()=>{lastFetch=0;refresh(true).then(()=>{if(assistantIsOpen())analyzeAssistant();});};
$('assistant-rh-advanced').onclick=()=>{
 // Réutiliser l'assistance RH existante seulement si ouverte depuis RH
 // même origine et sans transmettre PIN ni jeton entre fenêtres.
 try{if(window.parent!==window&&location.origin===window.parent.location.origin&&typeof window.parent.openPlanningAssistant==='function'){
  closeAssistant();window.parent.openPlanningAssistant();return;
 }}catch(e){console.warn('Assistant RH complet indisponible',e);}
 $('assistant-status').textContent='Assistant RH avancé non accessible depuis cette fenêtre. Analyse locale disponible.';
};
window.addEventListener('resize',()=>{if(assistantIsOpen())renderAssistant();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&assistantIsOpen()){e.stopImmediatePropagation();closeAssistant();}});

function returnToRh(){
 if(window.parent!==window && new URLSearchParams(location.search).get('rhEmbedded')==='1'){
   try{window.parent.postMessage({type:'ICHEF_PREMIUM_RETURN_RH'},location.origin);return;}catch(_){}
 }
 location.assign('/rh.html?tenantID='+encodeURIComponent(tenant));
}
$('return-rh').onclick=returnToRh;
$('ai').onclick=$('ai-side').onclick=openAssistant;$('print').onclick=()=>window.print();document.querySelectorAll('[data-inactive]').forEach(b=>b.onclick=()=>{const key=b.dataset.inactive;const page=key==='Pointeuse'?'/pointeuse.html':key==='Portail Staff'?'/portail-staff.html':'/rh.html';location.assign(page+'?tenantID='+encodeURIComponent(tenant));});if(premiumChannel)premiumChannel.onmessage=e=>{
  if(e?.data?.type==='PLANNING_CHANGED'&&e.data.tenant===tenant&&!selected){lastFetch=0;void refresh(true);}
};
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!selected)refresh(true);});setInterval(()=>{if(!document.hidden&&!selected)refresh(true);},30000);
if('serviceWorker' in navigator&&location.protocol==='https:'){navigator.serviceWorker.register('./sw.js',{scope:'./'}).catch(e=>console.warn('PWA non installée',e));}
render();restoreAuth();
})();
