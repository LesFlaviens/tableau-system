
;
/* RH V264 - preserved script #10 */
(function(){
    'use strict';
    const DB_NAME='ichef_rh_offline_v1', DB_VERSION=1, STORE='punch_queue', LS_FALLBACK='ichef_rh_offline_queue_v1';
    let syncRunning=false, onlineHideTimer=null;
    function uid(){
        if(globalThis.crypto?.randomUUID) return 'rhof_'+crypto.randomUUID();
        return 'rhof_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2)+'_'+Math.random().toString(36).slice(2);
    }
    function openDb(){
        return new Promise((resolve,reject)=>{
            if(!('indexedDB' in window)) return reject(new Error('IndexedDB indisponible'));
            const req=indexedDB.open(DB_NAME,DB_VERSION);
            req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(STORE)){const st=db.createObjectStore(STORE,{keyPath:'id'});st.createIndex('status','status',{unique:false});st.createIndex('clientTimestamp','clientTimestamp',{unique:false});}};
            req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||new Error('IndexedDB erreur'));
        });
    }
    async function dbAll(){
        try{const db=await openDb();return await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readonly');const r=tx.objectStore(STORE).getAll();r.onsuccess=()=>resolve(Array.isArray(r.result)?r.result:[]);r.onerror=()=>reject(r.error);tx.oncomplete=()=>db.close();});}
        catch(e){try{return JSON.parse(localStorage.getItem(LS_FALLBACK)||'[]')}catch(_){return []}}
    }
    async function dbPut(item){
        try{const db=await openDb();await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(item);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});db.close();return item;}
        catch(e){const arr=await dbAll();const i=arr.findIndex(x=>x.id===item.id);if(i>=0)arr[i]=item;else arr.push(item);localStorage.setItem(LS_FALLBACK,JSON.stringify(arr));return item;}
    }
    async function dbDelete(id){
        try{const db=await openDb();await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).delete(id);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});db.close();}
        catch(e){const arr=(await dbAll()).filter(x=>x.id!==id);localStorage.setItem(LS_FALLBACK,JSON.stringify(arr));}
    }
    async function queueEvent(item){item.status=item.status||'PENDING';item.attempts=Number(item.attempts||0);item.lastError=item.lastError||'';await dbPut(item);await updateBadge();return item;}
    function provisionalType(staffId,ts){
        const prev=(typeof getPunches==='function'?getPunches():[]).filter(p=>String(p?.staffId)===String(staffId)&&Number(p?.timestamp||0)<Number(ts)).sort((a,b)=>Number(a.timestamp||0)-Number(b.timestamp||0)).pop();
        return prev&&String(prev.type||'').toUpperCase()==='ENTRÉE'?'SORTIE':'ENTRÉE';
    }
    function addProvisional(item,staff,type){
        try{
            const punches=(typeof getPunches==='function'?getPunches():[]).filter(p=>String(p?.id||'')!==String(item.id));
            punches.push({id:item.id,tenantID:item.tenantID,staffId:staff.id,staffName:staff.name||'',dept:staff.dept||'',role:staff.role||'',type,timestamp:item.clientTimestamp,clientRecordedAt:new Date(item.clientTimestamp).toISOString(),serverRecordedAt:null,deviceId:item.deviceId||'',terminal:'RH_POINTEUSE',photo:'',offlinePending:true,offlineEventId:item.id,timestampSource:'CLIENT_DEVICE'});
            punches.sort((a,b)=>Number(a.timestamp||0)-Number(b.timestamp||0));
            storePunchesNoLoss(punches,'offline-provisional');
        }catch(e){console.warn('[iCHEF RH OFFLINE] pointage provisoire local',e)}
    }
    function applyServerData(data){
        try{
            if(Array.isArray(data?.punches)) storePunchesNoLoss(data.punches,'offline-server-response');
            if(data?.timesheets&&typeof saveRealTimesheetsLocal==='function') saveRealTimesheetsLocal(data.timesheets);
            if(Array.isArray(data?.staffAccess)){
                staffAccess=data.staffAccess;
                localStorage.setItem('empire_hr_directory',JSON.stringify(typeof buildRhDirectoryFromServer==='function'?buildRhDirectoryFromServer(staffAccess,getDir()):staffAccess));
            }
            if(document.getElementById('logs-interface')?.style.display==='flex'&&typeof renderLogs==='function')renderLogs();
            if(document.getElementById('timesheets-interface')?.style.display==='flex'&&typeof renderRealTimesheets==='function')renderRealTimesheets();
        }catch(e){console.warn('[iCHEF RH OFFLINE] application réponse serveur',e)}
    }
    async function fetchPunch(item,pin,isOfflineSync){
        const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),7000);
        try{
            const response=await fetch(`${SERVER_URL_JS}/api/rh/punch`,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json','Idempotency-Key':item.id},cache:'no-store',signal:controller.signal,body:JSON.stringify({tenantID:item.tenantID,staffId:item.staffId,pin,deviceId:item.deviceId,photo:item.photo||'',offlineEventId:item.id,clientTimestamp:item.clientTimestamp,clientTimezoneOffset:item.clientTimezoneOffset,offlineSync:isOfflineSync===true,queuedAt:item.queuedAt})});
            const data=await response.json().catch(()=>({}));
            if(!response.ok||!data.success){const err=new Error(data.error||`Erreur HTTP ${response.status}`);err.httpStatus=response.status;err.code=data.code||'';err.retryable=response.status===408||response.status===429||response.status>=500;throw err;}
            return data;
        }catch(e){if(e?.name==='AbortError'){const x=new Error('Connexion trop lente ou interrompue.');x.retryable=true;x.code='NETWORK_TIMEOUT';throw x}if(typeof e.retryable==='undefined'&&(e instanceof TypeError||!navigator.onLine))e.retryable=true;throw e}
        finally{clearTimeout(timer)}
    }
    function feedback(staff,type,ts,offline){
        const overlay=document.getElementById('punch-success-overlay');
        if(overlay){overlay.style.background=offline?'rgba(245,158,11,.96)':(type==='ENTRÉE'?'rgba(16,185,129,.96)':'rgba(56,189,248,.96)');overlay.style.display='flex';const t=document.getElementById('punch-success-title'),n=document.getElementById('punch-success-name'),time=document.getElementById('punch-success-time');if(t)t.innerText=offline?`${type} ENREGISTRÉE HORS LIGNE`:`${type} ENREGISTRÉE`;if(n)n.innerText=staff?.name||'Collaborateur';if(time)time.innerText=new Date(ts).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit',second:'2-digit'});}
        if(typeof showToast==='function')showToast(offline?'Pointage conservé hors ligne · synchronisation automatique':(type==='ENTRÉE'?'Entrée enregistrée':'Sortie enregistrée'));
        setTimeout(()=>{const o=document.getElementById('punch-success-overlay');if(punchKioskMode){if(o)o.style.display='none';clearPunchPin();if(typeof updatePunchClockDisplay==='function')updatePunchClockDisplay();}else if(typeof cancelPunchClock==='function')cancelPunchClock();},offline?1700:1200);
    }
    async function updateBadge(){
        const el=document.getElementById('rh-offline-status');if(!el)return;
        const q=await dbAll(),pending=q.filter(x=>x.status!=='BLOCKED').length,blocked=q.filter(x=>x.status==='BLOCKED').length,txt=el.querySelector('.txt');
        el.className='';
        if(!navigator.onLine){el.classList.add('offline');el.style.display='flex';txt.textContent=`HORS LIGNE · ${pending+blocked} À SYNCHRONISER`;return}
        if(blocked){el.classList.add('blocked');el.style.display='flex';txt.textContent=`${blocked} POINTAGE${blocked>1?'S':''} À CONTRÔLER`;return}
        if(syncRunning||pending){el.classList.add('syncing');el.style.display='flex';txt.textContent=syncRunning?`SYNCHRONISATION · ${pending}`:`EN ATTENTE · ${pending}`;return}
        el.style.display='flex';txt.textContent='EN LIGNE · SYNCHRONISÉ';clearTimeout(onlineHideTimer);onlineHideTimer=setTimeout(()=>{if(navigator.onLine)el.style.display='none'},2500);
    }
    async function syncQueue(options={}){
        if(syncRunning||!navigator.onLine)return;syncRunning=true;await updateBadge();
        const touchedMonths=new Set();
        try{
            const items=(await dbAll()).filter(x=>x.status!=='BLOCKED').sort((a,b)=>Number(a.clientTimestamp||0)-Number(b.clientTimestamp||0));
            for(const item of items){
                const staff=(typeof getDir==='function'?getDir():[]).find(s=>String(s.id)===String(item.staffId)&&s.active!==false),pin=String(staff?.pin||'').trim();
                if(!staff||!/^\d{4,12}$/.test(pin)){await dbPut({...item,status:'BLOCKED',lastError:'Collaborateur/PIN local indisponible. Contrôle manager requis.',lastAttemptAt:new Date().toISOString(),attempts:Number(item.attempts||0)+1});break}
                try{
                    const data=await fetchPunch(item,pin,true);await dbDelete(item.id);applyServerData(data);touchedMonths.add(new Date(Number(item.clientTimestamp)).toISOString().slice(0,7));
                }catch(e){
                    const updated={...item,attempts:Number(item.attempts||0)+1,lastAttemptAt:new Date().toISOString(),lastError:e?.message||'Erreur de synchronisation',lastErrorCode:e?.code||''};
                    if(e?.retryable===false||([400,401,403,404,409,422].includes(Number(e?.httpStatus)))) updated.status='BLOCKED';
                    await dbPut(updated);if(updated.status==='BLOCKED')console.error('[iCHEF RH OFFLINE] contrôle requis',updated.lastErrorCode,updated.lastError);break;
                }
            }
            if(touchedMonths.size&&typeof window.iChefRunAutomaticMonth==='function'){for(const m of touchedMonths){try{await window.iChefRunAutomaticMonth(m,{force:true,silent:true})}catch(_){}}}
            if(options.manual&&typeof showToast==='function'){const left=(await dbAll()).filter(x=>x.status!=='BLOCKED').length;showToast(left?'Synchronisation partielle · certains pointages restent en attente':'Pointages hors ligne synchronisés');}
        }finally{syncRunning=false;await updateBadge()}
    }
    window.iChefRhSyncOfflinePunches=syncQueue;
    // En présence de pointages provisoires, les heures locales priment jusqu'à la confirmation serveur.
    if(typeof getActualHoursSummary==='function'&&!getActualHoursSummary.__offlineAware){
        const original=getActualHoursSummary;
        const wrapped=function(staffId,monthStr){
            try{const hasPending=(typeof getPunches==='function'?getPunches():[]).some(p=>p?.offlinePending===true&&String(p?.staffId)===String(staffId)&&new Date(Number(p?.timestamp||0)).toISOString().slice(0,7)===monthStr);if(hasPending){const pairs=getPunchPairsForStaff(staffId,monthStr),total=pairs.reduce((sum,p)=>sum+Number(p.hours||0),0);return {total:Math.round(total*100)/100,pairs,byDay:getActualHoursByDay(staffId,monthStr),anomalies:0,sheetStatus:'OFFLINE_PENDING',source:'LOCAL_OFFLINE_PUNCHES'}}}catch(_){ }
            return original(staffId,monthStr);
        };wrapped.__offlineAware=true;getActualHoursSummary=wrapped;
    }
    // Remplace le pointage serveur-obligatoire par un pointage idempotent avec secours hors ligne.
    window.submitPunch=async function(){
        const enteredPin=String(punchPin||'').trim();
        if(!/^\d{4,12}$/.test(enteredPin)){alert('Le code PIN doit contenir entre 4 et 12 chiffres.');clearPunchPin();return}
        if(punchSubmitInFlight)return;punchSubmitInFlight=true;
        try{
            let staff=(typeof getDir==='function'?getDir():[]).find(s=>String(s.pin||'').trim()===enteredPin&&s.active!==false);
            if(!staff&&navigator.onLine){try{await refreshRhStaffFromServer();staff=getDir().find(s=>String(s.pin||'').trim()===enteredPin&&s.active!==false)}catch(_){}}
            if(!staff){alert(navigator.onLine?'CODE PIN INVALIDE OU COLLABORATEUR INACTIF':'PIN INCONNU HORS LIGNE · reconnectez une fois l’appareil pour actualiser le personnel');return}
            const video=document.getElementById('punch-video'),canvas=document.getElementById('punch-canvas');if(!video||!canvas)throw new Error('Caméra pointeuse indisponible.');const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Impossible de capturer la photo de pointage.');canvas.width=320;canvas.height=240;ctx.drawImage(video,0,0,canvas.width,canvas.height);const photo=canvas.toDataURL('image/jpeg',0.55);
            const ts=Date.now(),item={id:uid(),tenantID:tenantID_JS,staffId:staff.id,deviceId:RH_DEVICE_ID,photo,clientTimestamp:ts,clientTimezoneOffset:new Date(ts).getTimezoneOffset(),queuedAt:new Date().toISOString(),status:'PENDING',attempts:0};
            if(navigator.onLine){
                try{const data=await fetchPunch(item,enteredPin,false);applyServerData(data);feedback(staff,data.punchType||provisionalType(staff.id,ts),data.punch?.timestamp||ts,false);if(typeof window.iChefRunAutomaticMonth==='function')setTimeout(()=>window.iChefRunAutomaticMonth(new Date(ts).toISOString().slice(0,7),{force:true,silent:true}),250);return}
                catch(e){if(e?.retryable!==true)throw e;console.warn('[iCHEF RH OFFLINE] réseau interrompu, mise en file',e?.message||e)}
            }
            const type=provisionalType(staff.id,ts);await queueEvent(item);addProvisional(item,staff,type);feedback(staff,type,ts,true);if(typeof window.iChefRunAutomaticMonth==='function')setTimeout(()=>window.iChefRunAutomaticMonth(new Date(ts).toISOString().slice(0,7),{force:true,silent:true}),100);
        }catch(e){console.error('Erreur pointage :',e);alert(e?.message||'Erreur de pointage.');}
        finally{punchSubmitInFlight=false;clearPunchPin();await updateBadge()}
    };
    window.submitPunch.__offlineAware=true;
    window.addEventListener('online',()=>{updateBadge();setTimeout(()=>syncQueue(),250)});
    window.addEventListener('offline',updateBadge);
    document.getElementById('rh-offline-status')?.addEventListener('click',()=>syncQueue({manual:true}));
    document.addEventListener('DOMContentLoaded',()=>{updateBadge();setTimeout(()=>syncQueue(),900)});
    setInterval(()=>{if(navigator.onLine)syncQueue()},30000);
    if('serviceWorker' in navigator&&(location.protocol==='https:'||location.hostname==='localhost'||location.hostname==='127.0.0.1')){
        window.addEventListener('load',()=>navigator.serviceWorker.register('/sw-rh.js?v=260',{scope:'/'}).catch(e=>console.warn('[iCHEF RH OFFLINE] Service Worker non installé',e?.message||e)));
    }
})();
