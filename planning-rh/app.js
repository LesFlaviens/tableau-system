/* V266: source fournie par le client, renommée en .js. */
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
let anchor=monday(TODAY),view='week',filter='ALL',focusedStaffId=null,selected=null,staff=[],state={},rhSettings={},publication=null,actor=null,tenant='',token='',device='',busy=false,readOnly=false,lastFetch=0;
const premiumChannel=typeof BroadcastChannel!=='undefined'?new BroadcastChannel('ichef-planning-premium-events-v1'):null;
function broadcastPlanningChange(mm){try{premiumChannel?.postMessage({type:'PLANNING_CHANGED',tenant,month:mm,at:Date.now()});}catch(_){}}
function mkDevice(){const key='ichef_planning_device_v1';let id='';try{id=localStorage.getItem(key)||'';if(!id){id=crypto.randomUUID();localStorage.setItem(key,id);}}catch{ id=(crypto.randomUUID?.()||('pwa_'+Date.now())); }return id;}
device=mkDevice();let oldTenant='';try{oldTenant=localStorage.getItem('ichef_tenant_id')||'';}catch{}tenant=(query.get('tenantID')||oldTenant||'').trim().slice(0,80);$('login-tenant').value=tenant;
function setStatus(text,error=false){$('board-status').textContent=(error?'● ':'● ')+text;$('board-status').style.color=error?'#b64140':'#357b66';}
function notify(message){$('toast').textContent=message;$('toast').classList.remove('hide');clearTimeout(notify.timer);notify.timer=setTimeout(()=>$('toast').classList.add('hide'),4300);}
function showAuth(error=''){token='';actor=null;focusedStaffId=null;staff=[];state={};publication=null;render();$('login-shield').classList.remove('hide');$('login-error').textContent=error;setStatus('Connexion requise',true);}
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
 $('person-bar').scrollIntoView({block:'nearest',behavior:'smooth'});
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
function renderWeek(){
 const people=visible(),days=Array.from({length:7},(_,i)=>add(monday(anchor),i));
 let h='<table class="schedule" aria-label="Planning semaine officiel"><thead><tr><th>COLLABORATEUR</th>';
 for(const d of days)h+=`<th class="${iso(d)===iso(TODAY)?'today':''}"><span class="weekday">${fmt(d,{weekday:'short'})}</span><span class="daynumber">${fmt(d,{day:'2-digit'})}</span></th>`;
 h+='</tr></thead><tbody>';
 for(const p of people){
  h+=`<tr><td><button type="button" class="staff-open" data-profile="${esc(p.id)}" aria-label="Voir le planning individuel de ${esc(p.name)}" title="Afficher le planning de ${esc(p.name)}"><span class="avatar">${esc(p.avatar)}</span><span class="staff-details"><span class="staff-name">${esc(p.name)}</span><span class="staff-role">${esc(p.role)}</span><span class="staff-hint">${focusedStaffId?'Profil sélectionné':'Voir son planning →'}</span></span></button></td>`;
  for(const d of days){
   const r=get(p,d),caption=[types[r.k]||'Absence',label(r)].filter(Boolean).join(' · ');
   const enabled=!readOnly;
   h+=`<td class="${iso(d)===iso(TODAY)?'today':''}"><button class="entry ${(['M','S','C','R','O'].includes(r.k)?r.k:'A')}" type="button" data-person="${esc(p.id)}" data-date="${iso(d)}" ${enabled?'':'disabled'} title="${esc(caption)}" aria-label="${enabled?'Modifier':'Consulter'} le ${iso(d)} pour ${esc(p.name)} : ${esc(caption)}">${shiftMarkup(r)}</button></td>`;
  }
  h+='</tr>';
 }
 h+='</tbody><tfoot><tr><td>TOTAL PRÉSENCES</td>';
 for(const d of days){const arr=people.map(p=>get(p,d)).filter(work);h+=`<td class="day-summary">${arr.length} équipe<span>${arr.reduce((sum,r)=>sum+hours(r),0).toFixed(1)} h</span></td>`;}
 h+='</tr></tfoot></table>';
 $('week-host').innerHTML=h;
 $('week-host').querySelectorAll('[data-profile]').forEach(b=>b.addEventListener('click',()=>openEmployee(b.dataset.profile)));
 $('week-host').querySelectorAll('[data-person]').forEach(b=>b.addEventListener('click',()=>openModal(b.dataset.person,b.dataset.date)));
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
    h+=`<button class="monthday ${key===iso(TODAY)?'today':''} ${['M','S','C','R'].includes(r.k)?r.k:''}" data-edit-person="${esc(person.id)}" data-edit-date="${key}" type="button" ${readOnly?'disabled':''} aria-label="${esc(person.name)} · ${key} · ${esc(caption)} · ${esc(segments.join(' et '))}"><b>${day}</b><span class="month-label">${esc(r.k==='O'?'Ajouter +':caption)}</span>${segments.map(t=>`<small class="month-time">${esc(t)}</small>`).join('')}</button>`;
  }else{
    const n=visible().filter(p=>work(get(p,date))).length;
    h+=`<button class="monthday ${key===iso(TODAY)?'today':''}" data-month-day="${key}" type="button" aria-label="Voir la semaine du ${key}"><b>${day}</b><small>${n} service${n>1?'s':''}</small><i></i></button>`;
  }
 }
 h+='</div></div>';
 $('month-host').innerHTML=h;
 $('month-host').querySelectorAll('[data-month-day]').forEach(b=>b.addEventListener('click',()=>{anchor=monday(new Date(b.dataset.monthDay+'T12:00:00'));switchView('week');refresh(true);}));
 $('month-host').querySelectorAll('[data-edit-person]').forEach(b=>b.addEventListener('click',()=>openModal(b.dataset.editPerson,b.dataset.editDate)));
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
function render(){renderPersonBar();if(view==='week'){$('range').textContent=`${fmt(anchor,{day:'numeric',month:'short'})} – ${fmt(add(anchor,6),{day:'numeric',month:'short',year:'numeric'})}`;renderWeek();}else{$('range').textContent=fmt(anchor,{month:'long',year:'numeric'});renderMonth();}renderStats();}
function switchView(v){view=v;for(const which of ['week','month']){$('view-'+which).classList.toggle('active',which===v);$('view-'+which).setAttribute('aria-pressed',String(which===v));$(which+'-host').classList.toggle('hide',which!==v);}render();}
function updateDepartments(){const select=$('department'),old=filter;select.innerHTML='<option value="ALL">Tous les services</option>';[...new Set(staff.map(s=>s.dept).filter(Boolean))].sort().forEach(d=>{const o=document.createElement('option');o.value=d;o.textContent=d;select.appendChild(o);});filter=old==='ALL'||staff.some(s=>s.dept===old)?old:'ALL';select.value=filter;}
async function refresh(force=false){if(!token||busy)return;if(!force&&Date.now()-lastFetch<3500)return;busy=true;setStatus('Synchronisation sécurisée en cours…');try{const m=month(anchor);const res=await jsonFetch(`/api/rh/planning/premium/state?tenantID=${encodeURIComponent(tenant)}&month=${m}`,{headers:authHeaders()});staff=(res.staff||[]).map(p=>({...p,id:String(p.id),dept:String(p.dept||'Sans secteur'),avatar:String(p.name||'?').split(/\s+/).slice(0,2).map(z=>z[0]).join('').toUpperCase()}));state={...state,...(res.timesheets||{})};rhSettings=res.settings||{};
publication=res.publication||null;readOnly=rhSettings.planningStatus==='locked';lastFetch=Date.now();
$('publication-status').textContent=publication?.status==='published'?'✓ Mois publié':
  publication?.status==='to_review'?'⚠ Modifié après publication · à revalider':'Publication : en attente';
updateDepartments();render();setStatus(`Synchronisé · ${tenant} · ${new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}${readOnly?' · planning verrouillé':''}`);
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
$('logout').onclick=()=>{forget();$('login-pin').value='';showAuth('Session fermée sur cet appareil.');};
$('login-form').onsubmit=login;$('prev').onclick=()=>{anchor=view==='week'?add(anchor,-7):new Date(anchor.getFullYear(),anchor.getMonth()-1,1,12);render();refresh(true);};$('next').onclick=()=>{anchor=view==='week'?add(anchor,7):new Date(anchor.getFullYear(),anchor.getMonth()+1,1,12);render();refresh(true);};$('today').onclick=()=>{anchor=view==='week'?monday(TODAY):new Date(TODAY.getFullYear(),TODAY.getMonth(),1,12);render();refresh(true);};$('view-week').onclick=()=>switchView('week');$('view-month').onclick=()=>{anchor=new Date(anchor.getFullYear(),anchor.getMonth(),1,12);switchView('month');refresh(true);};$('department').onchange=e=>{filter=e.target.value;focusedStaffId=null;render();};$('team-return').onclick=closeEmployee;$('close').onclick=closeModal;$('cancel').onclick=closeModal;$('kind').onchange=updateForm;document.querySelectorAll('[data-preset]').forEach(b=>b.addEventListener('click',()=>{$('kind').value=b.dataset.preset;updateForm();}));$('remove').onclick=()=>{$('kind').value='O';save();};$('shift-form').onsubmit=e=>{e.preventDefault();save();};$('modal-backdrop').onclick=e=>{if(e.target===$('modal-backdrop'))closeModal();};document.addEventListener('keydown',e=>{if(e.key==='Escape'&&selected)closeModal();});$('reset').onclick=()=>refresh(true);
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
function returnToRh(){
 if(window.parent!==window && new URLSearchParams(location.search).get('rhEmbedded')==='1'){
   try{window.parent.postMessage({type:'ICHEF_PREMIUM_RETURN_RH'},location.origin);return;}catch(_){}
 }
 location.assign('/rh.html?tenantID='+encodeURIComponent(tenant));
}
$('return-rh').onclick=returnToRh;
$('ai').onclick=$('ai-side').onclick=returnToRh;$('print').onclick=()=>window.print();document.querySelectorAll('[data-inactive]').forEach(b=>b.onclick=()=>{const key=b.dataset.inactive;const page=key==='Pointeuse'?'/pointeuse.html':key==='Portail Staff'?'/portail-staff.html':'/rh.html';location.assign(page+'?tenantID='+encodeURIComponent(tenant));});if(premiumChannel)premiumChannel.onmessage=e=>{
  if(e?.data?.type==='PLANNING_CHANGED'&&e.data.tenant===tenant&&!selected){lastFetch=0;void refresh(true);}
};
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!selected)refresh(true);});setInterval(()=>{if(!document.hidden&&!selected)refresh(true);},30000);
if('serviceWorker' in navigator&&location.protocol==='https:'){navigator.serviceWorker.register('./sw.js',{scope:'./'}).catch(e=>console.warn('PWA non installée',e));}
render();restoreAuth();
})();
