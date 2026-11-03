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
// V276 : passage RH -> case Premium, sans mettre de PIN, jeton ou identité en URL.
const RH_JUMP_KEY='ichef_rh_premium_jump_v1';
const rhJump=(()=>{if(query.get('rhJump')!=='1')return null;
  query.delete('rhJump');
  try{history.replaceState(null,'',location.pathname+(query.toString()?'?'+query.toString():''));}catch(_){}
  try{const x=JSON.parse(sessionStorage.getItem(RH_JUMP_KEY)||'null');sessionStorage.removeItem(RH_JUMP_KEY);
    if(x&&typeof x.staffId==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x.date)&&
       String(x.tenant||'')===String(query.get('tenantID')||localStorage.getItem('ichef_tenant_id')||'')&&
       Date.now()-Number(x.created)<120000&&Date.now()>=Number(x.created)){
       const dt=new Date(x.date+'T12:00:00');if(!Number.isNaN(+dt)&&iso(dt)===x.date)return x;
    }
  }catch(_){}return null;
})();
let pendingRhJump=rhJump;
let anchor=rhJump?monday(new Date(rhJump.date+'T12:00:00')):monday(TODAY),view='week',filter='ALL',focusedStaffId=null,selected=null,staff=[],state={},actualMonths={},rhSettings={},publication=null,actor=null,tenant='',token='',device='',busy=false,readOnly=false,lastFetch=0;
const premiumChannel=typeof BroadcastChannel!=='undefined'?new BroadcastChannel('ichef-planning-premium-events-v1'):null;
function broadcastPlanningChange(mm){try{premiumChannel?.postMessage({type:'PLANNING_CHANGED',tenant,month:mm,at:Date.now()});}catch(_){}}
function mkDevice(){const key='ichef_planning_device_v1';let id='';try{id=localStorage.getItem(key)||'';if(!id){id=crypto.randomUUID();localStorage.setItem(key,id);}}catch{ id=(crypto.randomUUID?.()||('pwa_'+Date.now())); }return id;}
device=mkDevice();let oldTenant='';try{oldTenant=localStorage.getItem('ichef_tenant_id')||'';}catch{}tenant=(query.get('tenantID')||oldTenant||'').trim().slice(0,80);$('login-tenant').value=tenant;
function setStatus(text,error=false){$('board-status').textContent=(error?'● ':'● ')+text;$('board-status').style.color=error?'#b64140':'#357b66';}
function notify(message){$('toast').textContent=message;$('toast').classList.remove('hide');clearTimeout(notify.timer);notify.timer=setTimeout(()=>$('toast').classList.add('hide'),4300);}
function showAuth(error=''){
 if(query.get('controlRoom')==='1'&&window.parent!==window){
  try{window.parent.postMessage({type:'ICHEF_PREMIUM_CONTROL_AUTH_REQUIRED',tenant},location.origin);}catch(_){}
 }
 if($('ai-advisor'))$('ai-advisor').open=false;if(taskSelected)closeTaskModal();token='';actor=null;focusedStaffId=null;staff=[];state={};actualMonths={};publication=null;render();$('login-shield').classList.remove('hide');$('login-error').textContent=error;setStatus('Connexion requise',true);}
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
// Les tâches sont conservées dans le champ obs existant des journées RH.
// Un texte lisible est utilisé pour rester compatible avec RH et Portail Staff.
const TASK_TAG='Tâches à faire :';
const MAX_TASKS=6,MAX_TASK_LENGTH=65,MAX_OBS_LENGTH=500;
function splitDayTasks(raw){
 const text=String(raw||'');
 const marker='\n'+TASK_TAG+'\n';
 const index=text.lastIndexOf(marker);
 if(index<0){
  if(text.startsWith(TASK_TAG+'\n'))return {note:'',tasks:text.slice(TASK_TAG.length+1).split('\n').filter(x=>x.startsWith('• ')).map(x=>x.slice(2).trim()).filter(Boolean)};
  return {note:text,tasks:[]};
 }
 const lines=text.slice(index+marker.length).split('\n');
 if(!lines.every(x=>!x.trim()||x.startsWith('• ')))return {note:text,tasks:[]};
 return {note:text.slice(0,index),tasks:lines.filter(x=>x.startsWith('• ')).map(x=>x.slice(2).trim()).filter(Boolean)};
}
function packDayTasks(note,tasks){
 const cleanNote=String(note||'').trim();
 const list=tasks.map(x=>String(x||'').replace(/[\r\n]/g,' ').trim()).filter(Boolean);
 const payload=cleanNote+(list.length?(cleanNote?'\n':'')+TASK_TAG+'\n'+list.map(x=>'• '+x).join('\n'):'');
 if(payload.length>MAX_OBS_LENGTH)throw Error('Notes et tâches trop longues (500 caractères maximum au total).');
 return payload;
}
function taskListFor(r){return splitDayTasks(r.note).tasks;}

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
// V272 — Heures réelles lues uniquement depuis une source RH/pointage renvoyée
// par le serveur. Les horaires du planning ne sont JAMAIS assimilés aux pointages.
function safeNumber(value){
 if(value===null||value===undefined||value==='')return null;
 if(typeof value==='string'&&!/^[+-]?\d+(?:[.,]\d+)?$/.test(value.trim()))return null;
 const n=Number(String(value).replace(',','.'));
 return Number.isFinite(n)?n:null;
}
function numberFrom(record,keys){
 if(!record||typeof record!=='object')return null;
 for(const key of keys){const n=safeNumber(record[key]);if(n!==null)return n;}
 return null;
}
function displayHours(value){
 if(value===null||!Number.isFinite(value))return '—';
 return `${Math.round(value*10)/10}`.replace('.',',')+' h';
}
function signedHours(value){
 if(value===null||!Number.isFinite(value))return '—';
 const rounded=Math.round(value*10)/10;
 return (rounded>0?'+':rounded<0?'−':'±')+displayHours(Math.abs(rounded));
}
function getWeeklyTarget(person){
 // La durée contractuelle vient de la fiche RH; ne pas fixer 35/39 h en dur.
 const direct=numberFrom(person,['contractHoursWeek','weeklyContractHours','hoursPerWeek','weeklyHours']);
 if(direct!==null)return direct>=0?direct:null;
 const contract=person?.contract;
 if(contract&&typeof contract==='object')return numberFrom(contract,['hoursPerWeek','weeklyHours','hours','durationHours']);
 const num=safeNumber(contract);
 return num!==null&&num>=0?num:null;
}
function readRealMonth(res,mm){
 // Convention RH: REAL_TIMESHEETS_MONTHS[mois].staff[id].days[jour].workedHours.
 // Tolère différentes enveloppes de réponse, sans créer de nouvelles routes API.
 const candidates=[res.realTimesheets,res.realTimeSheets,res.actualTimesheets,res.realHours,res.timeTracking];
 for(const root of candidates){
  if(!root||typeof root!=='object')continue;
  const node=root.months?.[mm]||root[mm]||(root.month===mm?root:null);
  if(node&&typeof node==='object'){
   const all=node.staff||node.byStaff||node.employees||node;
   if(all&&typeof all==='object')return all;
  }
 }
 // Dans certaines réponses, un bloc d'heures réelles est déjà découpé par mois.
 for(const key of ['realTimesheetsByStaff','actualSheetsByStaff']){
  const data=res[key];
  if(data&&typeof data==='object'&&(data.month===mm||data.period===mm))return data.staff||data.byStaff||null;
 }
 return null;
}
function realSheet(person,mm){
 const monthData=actualMonths[mm];
 return monthData?.[String(person.id)]||monthData?.[person.id]||null;
}
function realDayHours(person,date){
 const sheet=realSheet(person,month(date));
 if(!sheet||!sheet.days||typeof sheet.days!=='object')return null;
 const d=date.getDate();
 const day=sheet.days[String(d).padStart(2,'0')]??sheet.days[String(d)]??sheet.days[iso(date)];
 if(day===undefined||day===null)return 0;
 return numberFrom(day,['workedHours','manualWorkedHours','retainedHours','hours']);
}
function realHoursForPeriod(person,days){
 if(!days.length)return null;
 const mm=month(days[0]);
 if(days.every(d=>month(d)===mm)){
  const sheet=realSheet(person,mm);
  // Pour une vue mensuelle, privilégier le total retenu/validé côté RH.
  if(view==='month'&&sheet){
   const total=numberFrom(sheet.totals,['workedHours','retainedHours']);
   if(total!==null)return total;
  }
 }
 let sum=0;
 for(const day of days){
  const actual=realDayHours(person,day);
  if(actual===null)return null;
  sum+=actual;
 }
 return Math.round(sum*100)/100;
}
function hoursSummary(person,days){
 const planned=days.reduce((total,day)=>total+hours(get(person,day)),0);
 const actual=realHoursForPeriod(person,days);
 let target=null;
 if(view==='week')target=getWeeklyTarget(person);
 else if(view==='day')target=null;
 else {
  const sheet=realSheet(person,month(days[0]));
  target=numberFrom(sheet?.totals,['adjustedTarget','expectedHours','targetHours']);
 }
 // Écart indicatif heures effectuées moins objectif contractuel; ce n'est
 // pas une qualification de majorations légales / heures supplémentaires payées.
 const difference=actual!==null&&target!==null?actual-target:null;
 return {planned:Math.round(planned*10)/10,actual,target,difference};
}
function metricMarkup(info){
 const actual=info.actual!==null;
 const actualLabel='Effectuées';
 const first=info.actual;
 const balanceClass=info.difference===null?'missing':info.difference>0.001?'positive':info.difference<-.001?'negative':'neutral';
 const balance=info.difference===null?'—':signedHours(info.difference);
 const summary=actual?'Pointage RH':'Planning uniquement, pointage indisponible';
 const title=actual
  ?`Heures effectuées : ${displayHours(info.actual)}. Contrat / objectif : ${displayHours(info.target)}. Écart : ${balance}. Prévu : ${displayHours(info.planned)}.`
  :`Heures prévues : ${displayHours(info.planned)}. Heures réellement effectuées indisponibles dans la réponse serveur.`;
 return `<span class="staff-metrics" title="${esc(title)}" aria-label="${esc(summary+'. '+title)}"><span class="staff-metric"><span class="metric-label">${actualLabel}</span><strong>${esc(displayHours(first))}</strong></span><span class="staff-metric staff-balance ${balanceClass}"><span class="metric-label">Écart</span><strong>${esc(balance)}</strong></span>${actual?'':`<span class="staff-plan-line">Prévues : ${esc(displayHours(info.planned))}</span>`}</span>`;
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
 switchView(view==='day'?'day':'week');
 $('person-bar').scrollIntoView({block:'nearest',behavior:'smooth'});
}
function closeEmployee(){focusedStaffId=null;render();}
function periodDays(){
 if(view==='day')return [new Date(anchor)];
 if(view==='week')return Array.from({length:7},(_,i)=>add(monday(anchor),i));
 const first=new Date(anchor.getFullYear(),anchor.getMonth(),1,12);
 const n=new Date(first.getFullYear(),first.getMonth()+1,0).getDate();
 return Array.from({length:n},(_,i)=>add(first,i));
}
function renderPersonBar(){
 const person=focusedStaffId?staff.find(x=>String(x.id)===focusedStaffId):null;
 $('person-bar').classList.toggle('hide',!person);
 document.querySelector('.board').classList.toggle('person-mode',Boolean(person));
 $('panel-view-title').textContent=person?'Ce collaborateur':view==='day'?'Détail de la journée':'Vue d’ensemble';
 $('panel-view-subtitle').textContent=person?
  `Consultez et modifiez les journées de ${person.name} directement sur le planning officiel.`:
  'Planning officiel : lecture et modification directement sur iCHEF OS.';
 if(!person)return;
 $('person-title').textContent=person.name||'Collaborateur';
 $('person-role').textContent=[person.role,person.dept].filter(Boolean).join(' · ');
 $('person-avatar').textContent=person.avatar||'?';
 const days=periodDays();
 const summary=hoursSummary(person,days);
 $('person-hours').textContent=`${summary.actual===null?'Prévues':'Effectuées'} ${displayHours(summary.actual===null?summary.planned:summary.actual)} · Écart ${signedHours(summary.difference)}`;
 $('person-hours').title=summary.actual===null?'Heures de pointage indisponibles côté serveur. Seules les heures planifiées sont affichées.':'Écart indicatif entre les heures pointées et l’objectif communiqué par RH.';
}
function renderWeek(){
 const people=visible(),days=Array.from({length:7},(_,i)=>add(monday(anchor),i));
 let h='<table class="schedule" aria-label="Planning semaine officiel"><thead><tr><th>COLLABORATEUR</th>';
 for(const d of days)h+=`<th class="${iso(d)===iso(TODAY)?'today':''}"><button type="button" class="week-day-button" data-open-day="${iso(d)}" aria-label="Voir le détail du ${iso(d)}"><span class="weekday">${fmt(d,{weekday:'short'})}</span><span class="daynumber">${fmt(d,{day:'2-digit'})}</span></button></th>`;
 h+='</tr></thead><tbody>';
 for(const p of people){
  const summary=hoursSummary(p,days);
  h+=`<tr><td><button type="button" class="staff-open" data-profile="${esc(p.id)}" aria-label="Voir le planning individuel de ${esc(p.name)}. Heures effectuées : ${esc(displayHours(summary.actual))}. Heures prévues : ${esc(displayHours(summary.planned))}. Écart : ${esc(signedHours(summary.difference))}" title="Afficher le planning de ${esc(p.name)}"><span class="avatar">${esc(p.avatar)}</span><span class="staff-details"><span class="staff-name">${esc(p.name)}</span><span class="staff-role">${esc(p.role)}</span>${metricMarkup(summary)}</span></button></td>`;
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
 $('week-host').querySelectorAll('[data-open-day]').forEach(b=>b.addEventListener('click',()=>openDay(b.dataset.openDay)));
 $('week-host').querySelectorAll('[data-profile]').forEach(b=>b.addEventListener('click',()=>openEmployee(b.dataset.profile)));
 $('week-host').querySelectorAll('[data-person]').forEach(b=>b.addEventListener('click',()=>openModal(b.dataset.person,b.dataset.date)));
}
function openDay(date){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return;
 anchor=new Date(date+'T12:00:00');
 switchView('day');
 lastFetch=0;void refresh(true);
}
function renderDay(){
 const d=new Date(anchor),people=visible();
 const order=people.slice().sort((a,b)=>Number(work(get(b,d)))-Number(work(get(a,d))));
 const n=people.filter(p=>work(get(p,d))).length;
 let h=`<div class="day-header"><strong>${esc(fmt(d,{weekday:'long',day:'numeric',month:'long',year:'numeric'}))}</strong><small>${n} service${n>1?'s':''} programmés · ${people.length} collaborateurs</small></div>`;
 h+='<table class="day-table" aria-label="Détail de la journée, horaires et tâches"><thead><tr><th>Collaborateur</th><th>Horaire</th><th>Durée prévue</th><th>Tâches à faire</th><th>Modifier</th></tr></thead><tbody>';
 for(const p of order){
  const r=get(p,d),tk=taskListFor(r),k=['M','S','C','R'].includes(r.k)?r.k:'A';
  const value=work(r)?displayHours(hours(r)):'—';
  const hourLabel=label(r)||types[r.k]||'Non planifié';
  h+=`<tr><td><div class="day-person"><span class="avatar">${esc(p.avatar)}</span><button type="button" data-profile="${esc(p.id)}"><strong>${esc(p.name)}</strong><small>${esc(p.role)}</small></button></div></td>`;
  h+=`<td><button type="button" class="day-shift ${k}" data-edit-person="${esc(p.id)}" data-edit-date="${iso(d)}" ${readOnly?'disabled':''} title="Modifier cet horaire">${esc(types[r.k]||'ABSENCE')}<small>${esc(hourLabel)}</small></button></td>`;
  h+=`<td class="day-duration">${esc(value)}</td><td><div class="day-tasks">${tk.length?tk.map(x=>`<span class="day-task-chip">${esc(x)}</span>`).join(''):'<span class="day-no-tasks">Aucune tâche ajoutée</span>'}</div></td>`;
  h+=`<td class="day-action-cell"><button type="button" class="btn day-edit-task" data-task-person="${esc(p.id)}" data-task-date="${iso(d)}" ${(!work(r)||readOnly)?'disabled title="Tâches disponibles pour les journées travaillées uniquement"':''}>${tk.length?'✎ Tâches':'＋ Tâche'}</button></td></tr>`;
 }
 h+='</tbody></table>';
 $('day-host').innerHTML=h;
 $('day-host').querySelectorAll('[data-profile]').forEach(b=>b.addEventListener('click',()=>openEmployee(b.dataset.profile)));
 $('day-host').querySelectorAll('[data-edit-person]').forEach(b=>b.addEventListener('click',()=>openModal(b.dataset.editPerson,b.dataset.editDate)));
 $('day-host').querySelectorAll('[data-task-person]').forEach(b=>b.addEventListener('click',()=>openTaskModal(b.dataset.taskPerson,b.dataset.taskDate)));
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
    h+=`<button class="monthday ${key===iso(TODAY)?'today':''} ${['M','S','C','R'].includes(r.k)?r.k:''}" data-edit-person="${esc(person.id)}" data-edit-date="${key}" type="button" ${readOnly?'disabled':''} aria-label="${esc(person.name)} · ${key} · ${esc(caption)} · ${esc(segments.join(' et '))}"><b>${day}</b><span class="month-label">${esc(r.k==='O'?'Ajouter +':caption)}</span>${segments.map(t=>`<small class="month-time">${esc(t)}</small>`).join('')}${taskListFor(r).length?`<small class="month-extra">${taskListFor(r).length} tâche${taskListFor(r).length>1?'s':''}</small>`:''}</button>`;
  }else{
    const shifts=visible().map(p=>({p,r:get(p,date)})).filter(x=>work(x.r));
    const maxShown=window.innerWidth<680?1:window.innerHeight<740?2:3;
    const shown=shifts.slice(0,maxShown);
    const tooltip=shifts.map(({p,r})=>p.name+' '+label(r)).join(' | ');
    const tags=shown.map(({p,r})=>{
      const compact=r.k==='C'?[r.start,r.s2].filter(Boolean).map(x=>x.slice(0,2)).join('/'):
        `${(r.start||r.s2||'').slice(0,2)}-${(r.end||r.e2||'').slice(0,2)}`;
      return `<span class="month-shift ${r.k}" title="${esc(p.name+' · '+label(r))}"><span class="month-full">${esc((p.name||'').split(/\s+/)[0])} ${esc(label(r))}</span><span class="month-mini">${r.k} ${esc(compact)}</span></span>`;
    }).join('');
    const overflow=shifts.length>shown.length?`<span class="month-extra">+${shifts.length-shown.length} autre${shifts.length-shown.length>1?'s':''}</span>`:'';
    h+=`<button class="monthday ${key===iso(TODAY)?'today':''} ${shifts.length?'month-has-work':''}" data-month-day="${key}" type="button" title="${esc(tooltip||'Aucun horaire')}" aria-label="Voir le jour ${key}, ${shifts.length} services"><b>${day}</b><span class="month-shifts">${tags}${overflow}</span>${shifts.length?'':'<small>Repos</small>'}</button>`;
  }
 }
 h+='</div></div>';
 $('month-host').style.setProperty('--planning-month-weeks',String(Math.ceil((last+shift)/7)));
 $('month-host').innerHTML=h;
 $('month-host').querySelectorAll('[data-month-day]').forEach(b=>b.addEventListener('click',()=>openDay(b.dataset.monthDay)));
 $('month-host').querySelectorAll('[data-edit-person]').forEach(b=>b.addEventListener('click',()=>openDay(b.dataset.editDate)));
}
// V275 — analyse rapide et explicable : aucune IA distante, aucun envoi supplémentaire.
// Le moteur de proposition complet existant reste dans RH ; ici : pistes non contraignantes.
function adviceCandidates(){
 if(!token||!staff.length)return [];
 const days=periodDays(),people=visible(),list=[];
 if(!people.length)return [];
 const labelDay=d=>fmt(d,{weekday:'short',day:'numeric',month:'short'});
 const push=(priority,title,body,date=null)=>list.push({priority,title,body,date:date?iso(date):null});
 const teamMode=!focusedStaffId;
 if(teamMode){
  const dayStats=days.map(d=>({d,entries:people.map(p=>({p,r:get(p,d)})).filter(x=>work(x.r))}));
  const nonEmpty=dayStats.filter(x=>x.entries.length);
  // Un jour non couvert n'est pas forcément une erreur si le site est fermé.
  for(const row of dayStats.filter(x=>!x.entries.length).slice(0,2)){
   push(1,`${labelDay(row.d)} · aucun horaire`,
    `Vérifier si ${filter==='ALL'?'l’établissement':'ce service'} est ouvert, puis compléter si besoin.`,row.d);
  }
  // Un seul collaborateur : piste uniquement, sans inventer un seuil de personnel.
  if(people.length>1){
   const short=dayStats.find(x=>x.entries.length===1);
   if(short)push(3,`${labelDay(short.d)} · 1 personne`,
     'Couverture réduite : envisager un renfort si l’activité le nécessite.',short.d);
  }
  const hasEvening=nonEmpty.some(x=>x.entries.some(v=>v.r.k==='S'||v.r.k==='C'));
  const hasMorning=nonEmpty.some(x=>x.entries.some(v=>v.r.k==='M'||v.r.k==='C'));
  if(hasEvening){
   const missing=nonEmpty.find(x=>x.entries.every(v=>v.r.k==='M'));
   if(missing)push(4,`${labelDay(missing.d)} · aucun soir`,
    'Service du soir à vérifier uniquement s’il est prévu ce jour-là.',missing.d);
  }
  if(hasMorning){
   const missing=nonEmpty.find(x=>x.entries.every(v=>v.r.k==='S'));
   if(missing)push(4,`${labelDay(missing.d)} · aucun matin`,
    'Service du matin à vérifier uniquement s’il est prévu ce jour-là.',missing.d);
  }
 }
 for(const p of people){
  const arr=days.map(d=>({d,r:get(p,d)}));
  if(view==='week'){
   let streak=0;
   for(const item of arr){
    streak=work(item.r)?streak+1:0;
    if(streak>=6){push(1,`${p.name} · ${streak} jours de suite`,
      'Vérifier les repos et les règles applicables, y compris les jours hors période.',item.d);break;}
   }
   const target=getWeeklyTarget(p);
   const weekHours=arr.reduce((sum,x)=>sum+hours(x.r),0);
   const approvedLeave=arr.some(x=>!['M','S','C','R','O'].includes(x.r.k));
   if(target!==null&&!approvedLeave){
    const delta=weekHours-target;
    if(delta>=4)push(2,`${p.name} · ${displayHours(delta)} au-dessus du contrat`,
      `Prévu ${displayHours(weekHours)} / référence ${displayHours(target)} : vérifier la répartition.`,arr[0].d);
    else if(delta<=-4)push(4,`${p.name} · ${displayHours(-delta)} sous la référence`,
      `Prévu ${displayHours(weekHours)} / référence ${displayHours(target)}. Comparer avec ses disponibilités.`,arr[0].d);
   }
  }
  const longDay=arr.find(x=>work(x.r)&&hours(x.r)>10);
  if(longDay)push(2,`${p.name} · journée de ${displayHours(hours(longDay.r))}`,
    'Durée planifiée élevée : revoir les pauses et le repos éventuel.',longDay.d);
 }
 // Pour le mois, éviter de présenter une limite hebdomadaire à partir d'un total mensuel.
 list.sort((a,b)=>a.priority-b.priority);
 const unique=[];
 for(const row of list){if(unique.some(x=>x.title===row.title))continue;unique.push(row);if(unique.length===4)break;}
 if(!unique.length)unique.push({priority:5,title:'Aucun point prioritaire détecté',
  body:'Continuer la vérification des besoins de service et des contraintes RH : cette aide ne garantit pas la conformité.',date:null});
 return unique;
}
function renderAdvice(){
 const host=$('ai-suggestions'),count=$('ai-count');
 if(!host||!count)return;
 if(!token||!staff.length){count.textContent='—';host.innerHTML='<p class="ai-mini-intro">Suggestions disponibles après synchronisation RH.</p>';return;}
 const rows=adviceCandidates();
 const noIssue=rows.length===1&&rows[0].priority===5;
 count.textContent=noIssue?'RAS':`${rows.length} piste${rows.length>1?'s':''}`;
 host.replaceChildren();
 for(const item of rows){
  const card=document.createElement('div');card.className='ai-suggestion';
  const title=document.createElement('strong');title.textContent=item.title;
  const body=document.createElement('p');body.textContent=item.body;
  card.append(title,body);
  if(item.date){
   const jump=document.createElement('button');jump.type='button';jump.textContent='Voir le jour →';
   jump.setAttribute('aria-label','Voir le '+item.date+' : '+item.title);
   jump.addEventListener('click',()=>{
    if(window.innerWidth<1024){document.querySelector('.board').classList.remove('show-panel');$('panel-toggle').setAttribute('aria-expanded','false');$('panel-toggle').textContent='☷ Détails';}
    openDay(item.date);
   });
   card.append(jump);
  }
  host.append(card);
 }
}
function toggleAdvice(force){
 if(!token){notify('Connectez-vous à RH pour consulter les propositions.');return;}
 const details=$('ai-advisor');
 const open=typeof force==='boolean'?force:!details.open;
 details.open=open;
 $('ai').setAttribute('aria-expanded',String(open));
 $('ai-side').setAttribute('aria-expanded',String(open));
 if(open){
  renderAdvice();
  if(window.innerWidth<1024){document.querySelector('.board').classList.add('show-panel');$('panel-toggle').setAttribute('aria-expanded','true');$('panel-toggle').textContent='× Fermer';}
  details.scrollIntoView({block:'nearest',behavior:'instant'});
 }
}
function openFullAssistant(){
 if(!token){notify('Connexion RH nécessaire.');return;}
 if(window.parent!==window&&query.get('rhEmbedded')==='1'){
  window.parent.postMessage({type:'ICHEF_PREMIUM_OPEN_RH_ASSISTANT'},location.origin);
 }else{
  notify('Ouverture du module RH : sélectionnez « Assistance planning » pour générer une proposition.');
  setTimeout(returnToRh,650);
 }
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
 $('panel-range-label').textContent=view==='month'?'Ce mois':view==='day'?'Ce jour':'Cette semaine';
 $('kpi-period-label').textContent=view==='month'?'Mois affiché':view==='day'?'Jour affiché':'Semaine affichée';
}
// Hauteur automatique des lignes pour conserver la grille visible dans un seul écran PC.
// Si l'équipe est trop grande, défilement interne uniquement : aucun texte tronqué.
let planningFitRaf=0;
function fitPlanningToViewport(){
 if(!window.matchMedia('(min-height:580px)').matches){
  document.documentElement.style.removeProperty('--planning-row-height');return;
 }
 const wrap=document.querySelector('.schedule-wrap');
 const rows=$('week-host').querySelectorAll('tbody tr').length;
 if(!wrap||!rows)return;
 const h=wrap.clientHeight;
 if(!h)return;
 // 36px d'en-tête + 31px de pied de tableau ; garder 32px min par salarié.
 const mobile=window.innerWidth<1024;
 const extra=mobile?49:69;
 const size=Math.max(mobile?56:55,Math.min(72,Math.floor((h-extra)/rows)));
 document.documentElement.style.setProperty('--planning-row-height',size+'px');
}
function queuePlanningFit(){cancelAnimationFrame(planningFitRaf);planningFitRaf=requestAnimationFrame(fitPlanningToViewport);}
window.addEventListener('resize',queuePlanningFit,{passive:true});
function render(){renderPersonBar();if(view==='week'){$('range').textContent=`${fmt(anchor,{day:'numeric',month:'short'})} – ${fmt(add(anchor,6),{day:'numeric',month:'short',year:'numeric'})}`;renderWeek();}else if(view==='day'){$('range').textContent=fmt(anchor,{weekday:'short',day:'numeric',month:'short',year:'numeric'});renderDay();}else{$('range').textContent=fmt(anchor,{month:'long',year:'numeric'});renderMonth();}renderStats();renderAdvice();queuePlanningFit();}
function switchView(v){view=v;for(const which of ['day','week','month']){$('view-'+which).classList.toggle('active',which===v);$('view-'+which).setAttribute('aria-pressed',String(which===v));$(which+'-host').classList.toggle('hide',which!==v);}render();}
function updateDepartments(){const select=$('department'),old=filter;select.innerHTML='<option value="ALL">Tous les services</option>';[...new Set(staff.map(s=>s.dept).filter(Boolean))].sort().forEach(d=>{const o=document.createElement('option');o.value=d;o.textContent=d;select.appendChild(o);});filter=old==='ALL'||staff.some(s=>s.dept===old)?old:'ALL';select.value=filter;}
async function refresh(force=false){if(!token||busy)return;if(!force&&Date.now()-lastFetch<3500)return;busy=true;setStatus('Synchronisation sécurisée en cours…');try{const m=month(anchor);const res=await jsonFetch(`/api/rh/planning/premium/state?tenantID=${encodeURIComponent(tenant)}&month=${m}`,{headers:authHeaders()});staff=(res.staff||[]).map(p=>({...p,id:String(p.id),dept:String(p.dept||'Sans secteur'),avatar:String(p.name||'?').split(/\s+/).slice(0,2).map(z=>z[0]).join('').toUpperCase()}));state={...state,...(res.timesheets||{})};actualMonths[m]=readRealMonth(res,m);rhSettings=res.settings||{};
publication=res.publication||null;readOnly=rhSettings.planningStatus==='locked';lastFetch=Date.now();
$('publication-status').textContent=publication?.status==='published'?'✓ Mois publié':
  publication?.status==='to_review'?'⚠ Modifié après publication · à revalider':'Publication : en attente';
updateDepartments();render();setStatus(`Synchronisé · ${tenant} · ${new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}${readOnly?' · planning verrouillé':''}`);
// V276 : cibler exactement le salarié et la date demandés depuis RH après la réponse serveur autorisée.
if(pendingRhJump){const jump=pendingRhJump;pendingRhJump=null;
 if(jump.tenant===tenant){const match=staff.find(p=>String(p.id)===String(jump.staffId));
   if(match){anchor=monday(new Date(jump.date+'T12:00:00'));focusedStaffId=String(match.id);switchView('week');
     if(!readOnly)openModal(String(match.id),jump.date);
     else notify('Planning verrouillé : case affichée en lecture seule.');
   }else notify('Collaborateur introuvable dans cet établissement : aucune modification effectuée.');
 }
}

if(query.get('controlRoom')==='1'&&window.parent!==window)window.parent.postMessage({type:'ICHEF_PREMIUM_CONTROL_READY',tenant,at:new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})},location.origin);
 // En vue semaine à cheval sur deux mois, charger la seconde période sans bloquer le premier affichage.
 if(view==='week'){
  const extra=month(add(monday(anchor),6));
  if(extra!==m){
   void jsonFetch(`/api/rh/planning/premium/state?tenantID=${encodeURIComponent(tenant)}&month=${extra}`,{headers:authHeaders()})
    .then(extraRes=>{state={...state,...(extraRes.timesheets||{})};actualMonths[extra]=readRealMonth(extraRes,extra);if(month(add(monday(anchor),6))===extra)render();})
    .catch(e=>console.warn('[iCHEF Planning] mois adjacent indisponible',e?.message));
  }
 }}
catch(e){if(query.get('controlRoom')==='1'&&window.parent!==window)window.parent.postMessage({type:'ICHEF_PREMIUM_CONTROL_ERROR',tenant,reason:e.message},location.origin);setStatus(e.message,true);if(e.status===401||e.status===403){forget();showAuth(e.message);}else notify('Réseau indisponible. Les données ne sont pas modifiées.');}finally{busy=false;}}
function openModal(person,date){if(!token||readOnly)return;const p=staff.find(x=>x.id===person);if(!p)return;const d=new Date(date+'T12:00:00'),r=get(p,d);selected={person,date,base:r.original};$('modal-sub').textContent=`${p.name} · ${fmt(d,{weekday:'long',day:'numeric',month:'long'})}`;$('kind').value=types[r.k]?r.k:'A';$('start').value=r.start||'08:00';$('end').value=r.end||'16:00';$('split-start').value=r.s2||'18:00';$('split-end').value=r.e2||'22:00';$('note').value=splitDayTasks(r.note).note;$('reason').value='';updateForm();$('modal-backdrop').classList.remove('hide');$('kind').focus();}
function closeModal(){selected=null;$('modal-backdrop').classList.add('hide');}
function updateForm(){const k=$('kind').value;document.querySelectorAll('[data-preset]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.preset===k)));for(const id of ['time1','time2'])$(id).classList.toggle('hide',!['M','S','C'].includes(k));$('split-row').classList.toggle('hide',k!=='C');}
function pair(a,b){return /^\d{2}:\d{2}$/.test(a)&&/^\d{2}:\d{2}$/.test(b)&&a!==b;}
function getDraft(){const k=$('kind').value,original=selected?.base||{},note=$('note').value.trim().slice(0,500);let r={...original,status:'off',s1:'',s2:'',pause:0,obs:packDayTasks(note,splitDayTasks(String(original.obs||'')).tasks)};if(['M','S','C'].includes(k)){if(!pair($('start').value,$('end').value))throw Error('Horaires de service invalides.');r.status=k==='M'?'off_soir':k==='S'?'off_matin':'present';const s=`${$('start').value}-${$('end').value}`;if(k==='S')r.s2=s;else r.s1=s;if(k==='C'){if(!pair($('split-start').value,$('split-end').value))throw Error('Deuxième service invalide.');r.s2=`${$('split-start').value}-${$('split-end').value}`;}}else{r.status=({R:'off',CP:'conge',MAL:'maladie',RECUP:'recup',FERIE:'ferie',FORM:'formation',A:'absence_autorisee',NJS:'absence_injustifiee',ACC:'accident_travail',MAT:'maternite',PAT:'paternite',PAR:'parental',EFM:'enfant_malade',EVF:'evenement_familial',DEC:'deces',SSL:'sans_solde',O:'off'})[k]||'off';}return k==='O'?null:r;}
async function save(){if(!selected||busy)return;const reason=$('reason').value.trim();if(reason.length<3)return notify('Motif obligatoire (au moins 3 caractères).');let day;try{day=getDraft();}catch(e){return notify(e.message);}busy=true;setStatus('Enregistrement sur le serveur…');const btn=$('shift-form').querySelector('[type="submit"]');btn.disabled=true;try{const res=await jsonFetch('/api/rh/planning/premium/day',{method:'POST',headers:{...authHeaders(),'Content-Type':'application/json'},body:JSON.stringify({tenantID:tenant,date:selected.date,staffId:selected.person,day,reason,baseRevision:selected.base?selected.base.planningVersionId||'':null})});const m=selected.date.slice(0,7),n=String(Number(selected.date.slice(8)));if(!state[m])state[m]={};if(!state[m][selected.person])state[m][selected.person]={};if(res.day)state[m][selected.person][n]=res.day;else delete state[m][selected.person][n];$('audit-title').textContent=`Modifié · ${res.staffName||selected.person}`;$('audit-detail').textContent=`${selected.date} · ${reason}`;$('audit-date').textContent=fmt(new Date(),{hour:'2-digit',minute:'2-digit'});closeModal();render();setStatus('Enregistré sur le serveur central · RH et Staff informés');notify('Horaire sauvegardé et synchronisé.');broadcastPlanningChange(m);lastFetch=0;
if(publication?.status==='published'){$('publication-status').textContent='⚠ Horaire modifié · à republier';publication={...publication,status:'to_review'};}}
catch(e){setStatus(e.message,true);if(e.status===409){notify('Planning modifié ailleurs : rechargement nécessaire avant de réessayer.');closeModal();lastFetch=0;}else if(e.status===401||e.status===403){forget();showAuth(e.message);}else notify('Enregistrement refusé : '+e.message);}
finally{busy=false;btn.disabled=false;}}
// Éditeur de tâches du jour : utilise uniquement l'API RH officielle déjà autorisée.
let taskSelected=null;
function openTaskModal(person,date){
 if(!token||readOnly)return;
 const p=staff.find(x=>x.id===String(person));
 if(!p)return;
 const d=new Date(date+'T12:00:00'),r=get(p,d);
 if(!work(r))return notify('Ajoutez d’abord un horaire travaillé à cette journée.');
 taskSelected={person:String(person),date,base:r.original};
 $('task-sub').textContent=p.name+' · '+fmt(d,{weekday:'long',day:'numeric',month:'long'});
 $('task-reason').value='Mise à jour des tâches';$('task-error').textContent='';
 $('task-fields').innerHTML='';
 const tasks=taskListFor(r);
 for(const item of tasks)addTaskField(item);
 if(!tasks.length)addTaskField('');
 $('task-backdrop').classList.remove('hide');
 $('task-fields').querySelector('input')?.focus();
}
function addTaskField(value=''){
 const fields=$('task-fields');
 if(fields.children.length>=MAX_TASKS)return notify('6 tâches maximum par service.');
 const row=document.createElement('div');row.className='task-row';
 const input=document.createElement('input');input.type='text';input.maxLength=MAX_TASK_LENGTH;input.placeholder='Ex. Contrôler les températures HACCP';input.setAttribute('aria-label','Description de la tâche');input.value=value;
 const remove=document.createElement('button');remove.type='button';remove.textContent='×';remove.title='Supprimer cette tâche';remove.setAttribute('aria-label','Supprimer cette tâche');
 remove.addEventListener('click',()=>{row.remove();if(!fields.children.length)addTaskField('');});
 row.append(input,remove);fields.append(row);
}
function closeTaskModal(){taskSelected=null;$('task-backdrop').classList.add('hide');}
async function saveTasks(ev){
 ev.preventDefault();if(!taskSelected||busy)return;
 const tasks=Array.from($('task-fields').querySelectorAll('input')).map(x=>x.value.replace(/[\r\n]/g,' ').trim()).filter(Boolean);
 const reason=$('task-reason').value.trim();
 if(reason.length<3){$('task-error').textContent='Indiquez un motif de 3 caractères minimum.';return;}
 if(tasks.some(t=>t.length>MAX_TASK_LENGTH)){$('task-error').textContent='Tâche limitée à 65 caractères.';return;}
 const {person,date,base}=taskSelected;
 const record=get(staff.find(p=>p.id===person),new Date(date+'T12:00:00'));
 if(!record.original||!work(record)){$('task-error').textContent='Ce collaborateur ne possède pas de service travaillé à cette date.';return;}
 let obs;
 try{obs=packDayTasks(splitDayTasks(record.note).note,tasks);}catch(e){$('task-error').textContent=e.message;return;}
 busy=true;const button=$('task-save');button.disabled=true;setStatus('Enregistrement des tâches…');
 try{
  const day={...record.original,obs};
  const res=await jsonFetch('/api/rh/planning/premium/day',{method:'POST',headers:{...authHeaders(),'Content-Type':'application/json'},body:JSON.stringify({tenantID:tenant,date,staffId:person,day,reason,baseRevision:base?.planningVersionId||null})});
  const m=date.slice(0,7),n=String(Number(date.slice(8)));
  if(!state[m])state[m]={};if(!state[m][person])state[m][person]={};
  state[m][person][n]=res.day||day;
  $('audit-title').textContent='Tâches modifiées';$('audit-detail').textContent=date+' · '+reason;
  $('audit-date').textContent=fmt(new Date(),{hour:'2-digit',minute:'2-digit'});
  closeTaskModal();render();broadcastPlanningChange(m);lastFetch=0;
  setStatus('Tâches enregistrées avec le planning RH');notify('Tâches enregistrées sur le serveur RH.');
  if(publication?.status==='published'){$('publication-status').textContent='⚠ Journée modifiée · à republier';publication={...publication,status:'to_review'};}
 }catch(e){$('task-error').textContent=e.message||'Enregistrement impossible.';setStatus(e.message,true);if(e.status===409){lastFetch=0;notify('Cette journée a changé. Actualisez puis réessayez.');}else if(e.status===401||e.status===403){forget();closeTaskModal();showAuth(e.message);}}
 finally{busy=false;button.disabled=false;}
}
$('task-close').onclick=closeTaskModal;$('task-cancel').onclick=closeTaskModal;
$('task-add').onclick=()=>addTaskField();$('task-form').onsubmit=saveTasks;
$('task-backdrop').onclick=e=>{if(e.target===$('task-backdrop'))closeTaskModal();};
$('logout').onclick=()=>{forget();$('login-pin').value='';showAuth('Session fermée sur cet appareil.');if(window.parent!==window&&query.get('rhEmbedded')==='1'){window.parent.postMessage({type:'ICHEF_PREMIUM_LOGOUT'},location.origin);}};
$('login-form').onsubmit=login;$('prev').onclick=()=>{anchor=view==='day'?add(anchor,-1):view==='week'?add(anchor,-7):new Date(anchor.getFullYear(),anchor.getMonth()-1,1,12);render();refresh(true);};$('next').onclick=()=>{anchor=view==='day'?add(anchor,1):view==='week'?add(anchor,7):new Date(anchor.getFullYear(),anchor.getMonth()+1,1,12);render();refresh(true);};$('today').onclick=()=>{anchor=view==='day'?new Date(TODAY):view==='week'?monday(TODAY):new Date(TODAY.getFullYear(),TODAY.getMonth(),1,12);render();refresh(true);};$('view-day').onclick=()=>{const current=view==='week'?iso(monday(anchor))===iso(monday(TODAY)):view==='month'?month(anchor)===month(TODAY):false;anchor=current?new Date(TODAY):new Date(anchor);switchView('day');refresh(true);};$('view-week').onclick=()=>{anchor=monday(anchor);switchView('week');refresh(true);};$('view-month').onclick=()=>{anchor=new Date(anchor.getFullYear(),anchor.getMonth(),1,12);switchView('month');refresh(true);};$('department').onchange=e=>{filter=e.target.value;focusedStaffId=null;render();};$('team-return').onclick=closeEmployee;$('close').onclick=closeModal;$('cancel').onclick=closeModal;$('kind').onchange=updateForm;document.querySelectorAll('[data-preset]').forEach(b=>b.addEventListener('click',()=>{$('kind').value=b.dataset.preset;updateForm();}));$('remove').onclick=()=>{$('kind').value='O';save();};$('shift-form').onsubmit=e=>{e.preventDefault();save();};$('modal-backdrop').onclick=e=>{if(e.target===$('modal-backdrop'))closeModal();};document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(selected)closeModal();if(taskSelected)closeTaskModal();}});$('reset').onclick=()=>refresh(true);
$('panel-toggle').onclick=()=>{const on=document.querySelector('.board').classList.toggle('show-panel');$('panel-toggle').setAttribute('aria-expanded',String(on));$('panel-toggle').textContent=on?'× Fermer':'☷ Détails';};
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
$('ai').onclick=$('ai-side').onclick=()=>toggleAdvice();$('ai-full').onclick=openFullAssistant;$('ai-advisor').addEventListener('toggle',()=>{const open=$('ai-advisor').open;$('ai').setAttribute('aria-expanded',String(open));$('ai-side').setAttribute('aria-expanded',String(open));if(open)renderAdvice();});$('print').onclick=()=>window.print();document.querySelectorAll('[data-inactive]').forEach(b=>b.onclick=()=>{const key=b.dataset.inactive;if(window.parent!==window&&query.get('rhEmbedded')==='1'){window.parent.postMessage({type:'ICHEF_PREMIUM_RETURN_RH',target:key},location.origin);return;}const page=key==='Pointeuse'?'/pointeuse.html':key==='Portail Staff'?'/portail-staff.html':'/rh.html';location.assign(page+'?tenantID='+encodeURIComponent(tenant));});if(premiumChannel)premiumChannel.onmessage=e=>{
  if(e?.data?.type==='PLANNING_CHANGED'&&e.data.tenant===tenant&&!selected){lastFetch=0;void refresh(true);}
};
let rhEmbeddedPaused=false;
async function resumeFromRh(){
  rhEmbeddedPaused=false;
  if(query.get('rhEmbedded')!=='1')return;
  try{
    const row=JSON.parse(sessionStorage.getItem(authKey())||'null');
    if(!row||row.tenant!==tenant||row.device!==device||typeof row.token!=='string'||row.exp<Date.now()+10000){
      forget();showAuth('Session expirée. Reconnectez-vous dans RH.');return;
    }
    token=row.token;actor=row.actor;$('login-shield').classList.add('hide');
    lastFetch=0;await refresh(true);
  }catch(e){showAuth('Connexion RH non disponible.');}
}
window.addEventListener('message',e=>{
  if(e.origin!==location.origin||e.source!==window.parent||query.get('rhEmbedded')!=='1')return;
  if(e.data?.type==='ICHEF_PREMIUM_PAUSE')rhEmbeddedPaused=true;
  if(e.data?.type==='ICHEF_PREMIUM_RESUME')void resumeFromRh();
  if(e.data?.type==='ICHEF_PREMIUM_PARENT_LOGOUT'){
    rhEmbeddedPaused=true;forget();showAuth('Session RH fermée.');
  }
});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!rhEmbeddedPaused&&!selected)refresh(true);});
setInterval(()=>{if(!document.hidden&&!rhEmbeddedPaused&&!selected)refresh(true);},30000);
if('serviceWorker' in navigator&&location.protocol==='https:'){navigator.serviceWorker.register('./sw.js',{scope:'./'}).catch(e=>console.warn('PWA non installée',e));}
render();restoreAuth();
})();
