
;
/* RH V264 - preserved script #7 */
(function(){
    function safeStopCamera(){
        try {
            if (typeof videoStream !== 'undefined' && videoStream) {
                videoStream.getTracks().forEach(function(track){ try { track.stop(); } catch(e) {} });
                videoStream = null;
            }
        } catch(e) {}
        try {
            var video = document.getElementById('punch-video');
            if (video && video.srcObject) {
                video.srcObject.getTracks().forEach(function(track){ try { track.stop(); } catch(e) {} });
                video.srcObject = null;
            }
        } catch(e) {}
    }
    window.iChefRhHardHome = function(event){
        if (event && typeof event.preventDefault === 'function') event.preventDefault();
        if (event && typeof event.stopPropagation === 'function') event.stopPropagation();
        // 1. Supprime définitivement le verrou de borne.
        try { localStorage.removeItem('ichef_rh_kiosk_mode'); } catch(e) {}
        try { sessionStorage.removeItem('ichef_rh_kiosk_mode'); } catch(e) {}
        // 2. Réinitialise tous les états JS de la pointeuse.
        try { punchKioskMode = false; } catch(e) {}
        try { loginMode = ''; } catch(e) {}
        try { currentPin = ''; } catch(e) {}
        try { punchPin = ''; } catch(e) {}
        // 3. Arrête caméra + horloge.
        safeStopCamera();
        try { if (typeof stopPunchClockDisplay === 'function') stopPunchClockDisplay(); } catch(e) {}
        // 4. Ferme toutes les modales liées à la pointeuse / accès.
        ['punch-modal','pin-modal','dept-modal'].forEach(function(id){
            var el = document.getElementById(id);
            if (el) {
                el.style.display = 'none';
                el.classList.remove('show');
                el.classList.remove('punch-kiosk-active');
            }
        });
        var overlay = document.getElementById('punch-success-overlay');
        if (overlay) overlay.style.display = 'none';
        // 5. Ferme toutes les interfaces secondaires et réaffiche le vrai menu RH.
        document.querySelectorAll('.full-interface').forEach(function(el){ el.style.display = 'none'; });
        var landing = document.getElementById('landing-portal');
        if (landing) landing.style.display = 'flex';
        // 6. Nettoie les affichages PIN.
        ['pin-display','punch-display'].forEach(function(id){
            var el = document.getElementById(id);
            if (el) el.innerText = '';
        });
        // 7. Quitte le plein écran sans jamais recharger rh.html.
        try {
            if (document.fullscreenElement && document.exitFullscreen) {
                document.exitFullscreen().catch(function(){});
            } else if (document.webkitFullscreenElement && document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            }
        } catch(e) {}
        try { document.body.style.overflow = ''; } catch(e) {}
        try { window.scrollTo(0,0); } catch(e) {}
        // 8. Nettoie l'URL, mais SANS navigation donc sans redémarrage de la pointeuse.
        try {
            var u = new URL(window.location.href);
            u.searchParams.delete('home');
            if (typeof tenantID !== 'undefined' && tenantID) u.searchParams.set('tenantID', tenantID);
            history.replaceState(null, '', u.pathname + u.search + u.hash);
        } catch(e) {}
        return false;
    };
    // Au chargement, une ancienne clé laissée par une version précédente ne peut plus réactiver la borne.
    try { localStorage.removeItem('ichef_rh_kiosk_mode'); } catch(e) {}
})();


;
/* RH V264 - preserved script #8 */
(() => {
    let rhCockpitWeekOffset = 0;
    let rhCockpitPlanView = 'week';
    const planningHorizonEnd = () => {
        const now = new Date();
        // Fin du mois situé six mois après le mois courant.
        return new Date(now.getFullYear(), now.getMonth() + 7, 0, 12, 0, 0, 0);
    };
    const esc = value => {
        const div = document.createElement('div');
        div.textContent = value == null ? '' : String(value);
        return div.innerHTML;
    };
    const pendingRequest = r => !['approved','accepte','accepté','valide','validé','rejected','refuse','refusé']
        .includes(String(r?.status || 'pending').toLowerCase());
    const mondayOf = date => {
        const d = new Date(date);
        d.setHours(12,0,0,0);
        const day = (d.getDay()+6)%7;
        d.setDate(d.getDate()-day);
        return d;
    };
    const maxCockpitWeekOffset = () => {
        const start = mondayOf(new Date());
        const endWeek = mondayOf(planningHorizonEnd());
        return Math.max(0, Math.round((endWeek.getTime() - start.getTime()) / (7 * 86400000)));
    };
    const isAfterPlanningHorizon = date => {
        const d = new Date(date);
        d.setHours(12,0,0,0);
        return d.getTime() > planningHorizonEnd().getTime();
    };
    window.getRhPlanningHorizonEnd = planningHorizonEnd;
    const weekDates = () => {
        const monday = mondayOf(new Date());
        monday.setDate(monday.getDate() + rhCockpitWeekOffset*7);
        return Array.from({length:7},(_,i)=>{
            const d=new Date(monday);d.setDate(monday.getDate()+i);return d;
        });
    };
    const monthKey = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    const sameDay = (a,b) => a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
    const planFor = (staff,date) => {
        const ts = typeof getTs==='function' ? getTs() : {};
        const m = ts?.[monthKey(date)] || {};
        const sm = m?.[staff.id] || m?.[String(staff.id)] || {};
        return sm?.[date.getDate()] || sm?.[String(date.getDate())] || {status:'off',s1:'',s2:'',pause:0};
    };
    const shiftText = p => {
        const status = String(p?.status || 'off').toLowerCase();
        const category = window.iChefPlanningMetaV202?.(p);
        const shifts=[p?.s1,p?.s2].filter(Boolean);
        if(category && String(p?.categoryId||'') && String(p.categoryId)!==status){
            if(['present','off_soir','off_matin','ferie'].includes(String(category.legalType||status)) && shifts.length){
                return shifts.join(' / ');
            }
            return String(category.label||category.short||status).toUpperCase();
        }
        const map = {
            off:'REPOS', conge:'CP', maladie:'MALADIE', recup:'RÉCUP', ferie:'FÉRIÉ',
            formation:'FORMATION', sans_solde:'SANS SOLDE', absence_autorisee:'ABSENCE',
            absence_injustifiee:'ABSENCE', accident_travail:'ACCIDENT', maternite:'MATERNITÉ',
            paternite:'PATERNITÉ', parental:'PARENTAL', enfant_malade:'ENFANT MALADE'
        };
        if (map[status]) return map[status];
        if(!shifts.length) return status==='present'?'TRAVAIL':status.replaceAll('_',' ').toUpperCase();
        return shifts.join(' / ');
    };
    const chipClass = p => {
        const st=String(p?.status||'off').toLowerCase();
        if(st==='off') return 'off';
        if(st==='conge'||st==='ferie'||st==='formation') return 'leave';
        if(st==='maladie'||st==='accident_travail'||st==='absence_injustifiee') return 'sick';
        if(st==='recup') return 'recovery';
        return String(p?.poste||'').toLowerCase()==='bar' || String(p?.poste||'').toLowerCase()==='admin' ? 'purple' : '';
    };
    const initials = name => String(name||'E').split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase();
    const dayKey = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const plannedHoursForDates = (staff, dates) => (dates || []).reduce((sum,d)=>{
        const p=planFor(staff,d);
        const h=typeof calculateNet==='function'?Number(calculateNet(p)||0):0;
        return sum + (Number.isFinite(h)?h:0);
    },0);
    const actualHoursForDates = (staff, dates) => {
        let total=0;
        const cache=new Map();
        (dates||[]).forEach(d=>{
            const mk=monthKey(d);
            if(!cache.has(mk)){
                try{cache.set(mk,typeof getActualHoursSummary==='function'?getActualHoursSummary(staff.id,mk):null)}catch(_){cache.set(mk,null)}
            }
            const summary=cache.get(mk);
            total += Number(summary?.byDay?.[d.getDate()] || summary?.byDay?.[String(d.getDate())] || 0);
        });
        return total;
    };
    const currentServiceState = staff => {
        const sid=String(staff?.id ?? '');
        let punches=[];
        try{
            punches=(typeof getPunches==='function'?getPunches():[])
                .filter(p=>String(p?.staffId ?? '')===sid && Number(p?.timestamp||p?.clientTimestamp||0)>0)
                .sort((a,b)=>Number(a?.timestamp||a?.clientTimestamp||0)-Number(b?.timestamp||b?.clientTimestamp||0));
        }catch(_){punches=[]}
        const last=punches[punches.length-1]||null;
        const ts=Number(last?.timestamp||last?.clientTimestamp||0);
        const type=String(last?.type||last?.punchType||'').toUpperCase();
        const isEntry=type==='ENTRÉE'||type==='ENTREE';
        const age=ts?Date.now()-ts:Infinity;
        const liveFromPunch=isEntry && age>=0 && age<=18*3600000;
        const live=liveFromPunch || (!last && staff?.onDuty===true);
        return {live,since:liveFromPunch?ts:null,lastType:type,lastTimestamp:ts};
    };
    const monthChipText = p => {
        const st=String(p?.status||'off').toLowerCase();
        const category=window.iChefPlanningMetaV202?.(p);
        if(category && String(p?.categoryId||'')) return String(category.short||category.label||st).slice(0,10).toUpperCase();
        const map={present:'TRAV',off:'OFF',conge:'CP',maladie:'MAL',recup:'REC',ferie:'FER',formation:'FORM',sans_solde:'SS',absence_autorisee:'ABS',absence_injustifiee:'ABS'};
        return map[st] || st.slice(0,4).toUpperCase();
    };
    const syncFullPlanningMonthToWeek = () => {
        const dates = weekDates();
        const focus = dates[3] || dates[0];
        const selector = document.getElementById('month-selector');
        if (selector && focus) {
            const value = monthKey(focus);
            const max = typeof getRhPlanningMaxMonth === 'function' ? getRhPlanningMaxMonth() : value;
            selector.value = value > max ? max : value;
            if (typeof enforceRhPlanningMonthHorizon === 'function') enforceRhPlanningMonthHorizon(false);
        }
    };
    window.rhCockpitSetPlanView = view => {
        const wanted=['day','week','month'].includes(String(view))?String(view):'week';
        rhCockpitPlanView=wanted;
        if(wanted==='day') rhCockpitWeekOffset=0;
        syncFullPlanningMonthToWeek();
        renderRhCockpit();
    };
    window.rhCockpitMoveWeek = offset => {
        const delta = Number(offset) || 0;
        const max = maxCockpitWeekOffset();
        const requested = rhCockpitWeekOffset + delta;
        rhCockpitWeekOffset = Math.min(max, Math.max(0, requested));
        rhCockpitPlanView='week';
        if (requested > max && typeof showToast === 'function') {
            showToast('Horizon planning atteint : 6 mois');
        }
        syncFullPlanningMonthToWeek();
        renderRhCockpit();
    };
    window.rhCockpitToday = () => { rhCockpitWeekOffset = 0; rhCockpitPlanView='day'; syncFullPlanningMonthToWeek(); renderRhCockpit(); };
    window.rhCockpitGoToHorizon = () => { rhCockpitWeekOffset = maxCockpitWeekOffset(); rhCockpitPlanView='week'; syncFullPlanningMonthToWeek(); renderRhCockpit(); };
    window.publishRhPlanningToStaff = () => {
        try {
            const current = typeof getRhSettings==='function' ? getRhSettings() : {};
            if (typeof saveRhSettings==='function') saveRhSettings({...current, planningStatus:'published'});
            if (typeof recordRhChange==='function') recordRhChange({type:'PLANNING_PUBLISHED',source:'DIRECTION_COCKPIT',month:document.getElementById('month-selector')?.value||monthKey(new Date())});
            if (typeof showToast==='function') showToast('Planning publié au staff');
            renderRhCockpit();
        } catch(e) { console.error('Publication planning',e); }
    };
    window.renderRhCockpit = (query='') => {
        const hub=document.getElementById('director-hub');
        if(!hub) return;
        const q=String(query || document.getElementById('rh-cockpit-search')?.value || '').trim().toLowerCase();
        const all=typeof getDir==='function'?getDir():[];
        const staff=all.filter(s=>s.active!==false);
        const visible=q?staff.filter(s=>`${s.name||''} ${s.role||''} ${s.dept||''}`.toLowerCase().includes(q)):staff;
        const dates=weekDates();
        const today=new Date();today.setHours(12,0,0,0);
        const label=document.getElementById('rh-cockpit-week-label');
        if(label){
            const f=d=>d.toLocaleDateString('fr-FR',{day:'2-digit',month:'short'}).replace('.','');
            if(rhCockpitPlanView==='day') label.textContent=today.toLocaleDateString('fr-FR',{weekday:'long',day:'2-digit',month:'long',year:'numeric'});
            else if(rhCockpitPlanView==='month') label.textContent=(dates[3]||dates[0]).toLocaleDateString('fr-FR',{month:'long',year:'numeric'});
            else label.textContent=`${f(dates[0])} – ${f(dates[6])} ${dates[6].getFullYear()}`;
        }
        document.querySelectorAll('[data-rh-plan-view]').forEach(btn=>btn.classList.toggle('active',btn.dataset.rhPlanView===rhCockpitPlanView));
        const horizonEnd = planningHorizonEnd();
        const nextWeekBtn = document.getElementById('rh-cockpit-next-week');
        if (nextWeekBtn) {
            nextWeekBtn.disabled = rhCockpitWeekOffset >= maxCockpitWeekOffset();
            nextWeekBtn.title = nextWeekBtn.disabled ? 'Horizon de 6 mois atteint' : 'Semaine suivante';
        }
        const horizonBtn = document.getElementById('rh-cockpit-horizon-btn');
        if (horizonBtn) {
            horizonBtn.title = `Planifier jusqu’au ${horizonEnd.toLocaleDateString('fr-FR')}`;
        }
        let planned=0,target=0,underCount=0,pointed=0;
        const weeklyMetrics=staff.map(s=>{
            const contract=Math.max(0,Number(s.contract)||0);
            const plannedHours=plannedHoursForDates(s,dates);
            const actualHours=actualHoursForDates(s,dates);
            planned+=plannedHours; target+=contract; pointed+=actualHours;
            if(plannedHours+0.05<contract) underCount++;
            return {staff:s,contract,planned:plannedHours,actual:actualHours,delta:plannedHours-contract};
        });
        const missing=Math.max(0,target-planned);
        const pct=target>0?Math.min(999,Math.round(planned/target*100)):0;
        const pending=(typeof getReqs==='function'?getReqs():[]).filter(pendingRequest);
        const liveStaff=staff.map(s=>({staff:s,state:currentServiceState(s)})).filter(x=>x.state.live);
        const onDuty=liveStaff.length;
        const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v};
        set('stat-total-staff',staff.length); set('stat-active-staff',onDuty);
        set('rh-cockpit-planned',`${planned.toFixed(1)} h`); set('rh-cockpit-target',`${target.toFixed(1)} h`);
        set('rh-cockpit-percent',`${pct}% des contrats`); set('rh-cockpit-missing',`${missing.toFixed(1)} h`);
        set('rh-cockpit-under',underCount?`${underCount} collaborateur${underCount>1?'s':''} à compléter`:'Équipe équilibrée');
        set('req-badge',pending.length); set('rh-side-request-badge',pending.length); set('rh-cockpit-todo-count',pending.length);
        set('rh-cockpit-request-sub',pending.length?`${pending.length} décision${pending.length>1?'s':''} à prendre`:'Aucune demande en attente');
        const venue=document.getElementById('rh-venue-name'); if(venue) venue.textContent=(localStorage.getItem('ichef_establishment_name')||'iCHEF Établissement');
        // Vue opérationnelle : présence réelle, équilibre des heures et journée du jour.
        set('rh-cockpit-live-count',liveStaff.length);
        const liveBox=document.getElementById('rh-cockpit-live-service');
        if(liveBox){
            liveBox.innerHTML=liveStaff.slice(0,6).map(({staff:s,state})=>{
                const p=planFor(s,today);
                const since=state.since?new Date(state.since).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}):'actif';
                return `<div class="rh-live-row"><span class="rh-plan-avatar">${esc(initials(s.name))}</span><div><strong>${esc(s.name||'Collaborateur')}</strong><small>${esc(s.role||s.dept||'Équipe')} · ${esc(shiftText(p))}</small></div><span class="rh-live-badge">EN SERVICE · ${esc(since)}</span></div>`;
            }).join('') || '<div class="rh-empty-line">Aucun collaborateur pointé en service actuellement.</div>';
        }
        const balance=document.getElementById('rh-cockpit-balance');
        if(balance){
            const sorted=[...weeklyMetrics].sort((a,b)=>b.delta-a.delta);
            const high=sorted[0]||null;
            const low=sorted[sorted.length-1]||null;
            const balanceCard=(row,label,kind)=>{
                if(!row) return `<div class="rh-balance-card ${kind}"><small>${label}</small><strong>—</strong><span>Aucune donnée</span></div>`;
                const delta=row.delta;
                const sign=delta>0?'+':'';
                return `<div class="rh-balance-card ${kind} ${delta>=0?'positive':'negative'}"><small>${label}</small><strong>${esc(row.staff.name||'Collaborateur')}</strong><span>${sign}${delta.toFixed(1)} h · ${row.planned.toFixed(1)} h / ${row.contract.toFixed(1)} h</span></div>`;
            };
            balance.innerHTML=balanceCard(high,'PLUS D’HEURES','high')+balanceCard(low,'MOINS D’HEURES','low');
        }
        const todaySummary=document.getElementById('rh-cockpit-today-summary');
        if(todaySummary){
            const todayRows=staff.map(s=>({s,p:planFor(s,today),live:currentServiceState(s).live}));
            const scheduled=todayRows.filter(x=>String(x.p?.status||'off').toLowerCase()!=='off' || x.live);
            todaySummary.innerHTML=scheduled.slice(0,7).map(({s,p,live})=>`<div class="rh-today-row"><span class="rh-today-dot ${live?'live':''}"></span><div><strong>${esc(s.name||'Collaborateur')}</strong><small>${esc(s.role||s.dept||'Équipe')}</small></div><span class="rh-today-shift ${chipClass(p)}">${esc(shiftText(p))}</span>${live?'<b>EN SERVICE</b>':''}</div>`).join('') || '<div class="rh-empty-line">Aucun service planifié aujourd’hui.</div>';
        }
        const head=document.getElementById('rh-cockpit-plan-head');
        const body=document.getElementById('rh-cockpit-plan-body');
        const table=head?.closest('table');
        if(table){table.classList.toggle('rh-plan-month-mode',rhCockpitPlanView==='month');table.classList.toggle('rh-plan-day-mode',rhCockpitPlanView==='day');}
        if(rhCockpitPlanView==='day'){
            if(head) head.innerHTML='<tr><th>Collaborateur</th><th>Statut</th><th>Horaires</th><th>Présence réelle</th></tr>';
            if(body){
                body.innerHTML=visible.slice(0,14).map(s=>{
                    const p=planFor(s,today), state=currentServiceState(s), dateKeyToday=dayKey(today);
                    return `<tr><td><div class="rh-plan-person"><span class="rh-plan-avatar">${esc(initials(s.name))}</span><div><strong>${esc(s.name||'Collaborateur')}</strong><small>${esc(s.role||s.dept||'Équipe')}</small></div></div></td><td><button type="button" class="rh-shift-chip rh-cockpit-edit-chip ${chipClass(p)}" data-rh-edit-staff="${esc(String(s.id))}" data-rh-edit-date="${dateKeyToday}">${esc(window.iChefPlanningMetaV202?.(p)?.label || String(p?.status||'off').replaceAll('_',' ').toUpperCase())}<span class="rh-edit-mark">✎</span></button></td><td><button type="button" class="rh-shift-chip rh-cockpit-edit-chip ${chipClass(p)}" data-rh-edit-staff="${esc(String(s.id))}" data-rh-edit-date="${dateKeyToday}">${esc(shiftText(p))}<span class="rh-edit-mark">✎</span></button></td><td>${state.live?`<span class="rh-live-badge">EN SERVICE${state.since?' · '+new Date(state.since).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}):''}</span>`:'<span class="rh-offline-badge">HORS SERVICE</span>'}</td></tr>`;
                }).join('') || '<tr><td colspan="4"><div class="rh-empty-line">Aucun collaborateur à afficher.</div></td></tr>';
            }
        }else if(rhCockpitPlanView==='month'){
            const focus=dates[3]||dates[0];
            const first=new Date(focus.getFullYear(),focus.getMonth(),1,12,0,0,0);
            const last=new Date(focus.getFullYear(),focus.getMonth()+1,0,12,0,0,0);
            const monthDates=[];
            for(let d=new Date(first);d<=last;d.setDate(d.getDate()+1)) monthDates.push(new Date(d));
            if(head) head.innerHTML='<tr><th>Collaborateur</th>'+monthDates.map(d=>`<th class="${sameDay(d,today)?'rh-today-col':''}"><span class="v167-day-date">${['D','L','M','M','J','V','S'][d.getDay()]} ${String(d.getDate()).padStart(2,'0')}</span></th>`).join('')+'</tr>';
            if(body){
                body.innerHTML=visible.slice(0,14).map(s=>{
                    const cells=monthDates.map(d=>{
                        if(isAfterPlanningHorizon(d)) return '<td class="rh-horizon-cell"><span class="rh-month-mini off">—</span></td>';
                        const p=planFor(s,d);
                        return `<td class="${sameDay(d,today)?'rh-today-col':''}"><button type="button" class="rh-month-mini rh-cockpit-edit-chip ${chipClass(p)}" data-rh-edit-staff="${esc(String(s.id))}" data-rh-edit-date="${dayKey(d)}" title="${esc(shiftText(p))}">${esc(monthChipText(p))}</button></td>`;
                    }).join('');
                    return `<tr><td><div class="rh-plan-person"><span class="rh-plan-avatar">${esc(initials(s.name))}</span><div><strong>${esc(s.name||'Collaborateur')}</strong><small>${esc(s.role||s.dept||'Équipe')}</small></div></div></td>${cells}</tr>`;
                }).join('') || `<tr><td colspan="${monthDates.length+1}"><div class="rh-empty-line">Aucun collaborateur à afficher.</div></td></tr>`;
            }
        }else{
            if(head) head.innerHTML='<tr><th>Collaborateur</th>'+dates.map(d=>`<th class="${sameDay(d,today)?'rh-today-col':''}"><span class="v167-day-date">${['D','L','M','M','J','V','S'][d.getDay()]} ${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}</span></th>`).join('')+'</tr>';
            if(body){
                const rows=visible.slice(0,8).map(s=>{
                    const cells=dates.map(d=>{
                        if (isAfterPlanningHorizon(d)) {
                            return `<td class="rh-horizon-cell"><div class="rh-shift-chip off rh-horizon-locked" title="Au-delà de l’horizon de planification de 6 mois">HORS PÉRIODE</div></td>`;
                        }
                        const p=planFor(s,d);
                        return `<td class="${sameDay(d,today)?'rh-today-col':''}"><button type="button" class="rh-shift-chip rh-cockpit-edit-chip ${chipClass(p)}" data-rh-edit-staff="${esc(String(s.id))}" data-rh-edit-date="${dayKey(d)}" title="Modifier cette journée">${esc(shiftText(p))}<span class="rh-edit-mark">✎</span></button></td>`;
                    }).join('');
                    return `<tr><td><div class="rh-plan-person"><span class="rh-plan-avatar">${esc(initials(s.name))}</span><div><strong>${esc(s.name||'Collaborateur')}</strong><small>${esc(s.role||s.dept||'Équipe')} · ${Number(s.contract||0).toFixed(0)} h</small></div></div></td>${cells}</tr>`;
                }).join('');
                body.innerHTML=rows || '<tr><td colspan="8"><div class="rh-empty-line">Aucun collaborateur à afficher.</div></td></tr>';
            }
        }
        const todo=document.getElementById('rh-cockpit-todo');
        if(todo){
            todo.innerHTML=pending.slice(0,3).map(r=>{
                const id=String(r.id||r.requestNumber||r.proofId||'');
                const typ=typeof rhRequestTypeLabel==='function'?rhRequestTypeLabel(r.type||r.requestType):String(r.type||'Demande');
                const datesTxt=[r.startDate||r.start,r.endDate||r.end].filter(Boolean).join(' → ');
                return `<div class="rh-list-item"><div class="rh-list-ico">▤</div><div><strong>${esc(typ)}</strong><small>${esc(r.staffName||'Collaborateur')}${datesTxt?' · '+esc(datesTxt):''}</small></div><div class="rh-list-actions"><button class="ok" title="Accepter" onclick="event.stopPropagation();setDirectorRequestStatus('${esc(id)}','approved');setTimeout(renderRhCockpit,50)">✓</button><button class="no" title="Refuser" onclick="event.stopPropagation();setDirectorRequestStatus('${esc(id)}','rejected');setTimeout(renderRhCockpit,50)">×</button></div></div>`;
            }).join('') || '<div class="rh-empty-line">Aucune demande en attente.</div>';
        }
        const hours=document.getElementById('rh-cockpit-hours');
        if(hours){
            const diff=pointed-planned;
            hours.innerHTML=`<div class="rh-hours-line"><span>Heures planifiées</span><strong>${planned.toFixed(1)} h</strong></div><div class="rh-hours-line"><span>Heures pointées</span><strong>${pointed.toFixed(1)} h</strong></div><div class="rh-hours-line emph"><span>Écart pointé / planning</span><strong>${diff>=0?'+':''}${diff.toFixed(1)} h</strong></div><div class="rh-hours-line"><span>Objectif contrats</span><strong>${target.toFixed(1)} h</strong></div><div class="rh-hours-progress"><i style="width:${Math.min(100,pct)}%"></i></div><div class="rh-hours-percent"><strong>${pct}%</strong> · ${planned.toFixed(1)} h / ${target.toFixed(1)} h</div>`;
        }
        const alerts=document.getElementById('rh-cockpit-alerts');
        if(alerts){
            const rows=[];
            if(missing>0.05) rows.push(`<div class="rh-list-item rh-alert-red"><div class="rh-list-ico">!</div><div><strong>Sous-planification</strong><small>${missing.toFixed(1)} h restent à planifier sur la semaine.</small></div><span></span></div>`);
            const over=staff.map(s=>{let h=0;dates.forEach(d=>{const p=planFor(s,d);h+=typeof calculateNet==='function'?Number(calculateNet(p)||0):0});return {s,h,c:Number(s.contract)||0}}).filter(x=>x.h>x.c+0.05);
            if(over.length) rows.push(`<div class="rh-list-item rh-alert-gold"><div class="rh-list-ico">△</div><div><strong>Dépassement d’heures</strong><small>${over.length} collaborateur${over.length>1?'s':''} au-dessus du contrat hebdomadaire.</small></div><span></span></div>`);
            const settings=typeof getRhSettings==='function'?getRhSettings():{};
            if(String(settings.planningStatus||'draft')!=='published') rows.push(`<div class="rh-list-item rh-alert-blue"><div class="rh-list-ico">i</div><div><strong>Planning non publié</strong><small>Le planning est actuellement ${esc(String(settings.planningStatus||'brouillon').replaceAll('_',' '))}.</small></div><span></span></div>`);
            if(!rows.length) rows.push(`<div class="rh-list-item rh-alert-green"><div class="rh-list-ico">✓</div><div><strong>Planning équilibré</strong><small>Aucune alerte prioritaire détectée sur cette semaine.</small></div><span></span></div>`);
            alerts.innerHTML=rows.slice(0,3).join('');
        }
        set('rh-cockpit-sync-time',`Dernière synchronisation : ${new Date().toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}`);
    };
    const originalBack=window.backToHub;
    if(typeof originalBack==='function'){
        window.backToHub=function(){originalBack.apply(this,arguments);setTimeout(()=>renderRhCockpit(),0)};
    }
    const originalDash=window.updateDashboardStats;
    if(typeof originalDash==='function'){
        window.updateDashboardStats=function(){
            return originalDash.apply(this,arguments);
        };
    }
    document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>renderRhCockpit(),350));
    setInterval(()=>{
        const hub=document.getElementById('director-hub');
        if(hub?.style.display!=='flex') return;
        const el=document.getElementById('rh-cockpit-sync-time');
        if(!el) return;
        const next=`Dernière synchronisation : ${new Date().toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}`;
        if(el.textContent!==next) el.textContent=next;
    },15000);
})();


;
/* RH V264 - preserved script #9 */
(function(){
    const AUTO_KEY='ichef_rh_auto_engine_v1';
    function autoGet(){try{return {...{enabled:true,autoTimesheets:true,autoPayroll:true,lastRun:{}},...(JSON.parse(localStorage.getItem(AUTO_KEY)||'{}')||{})}}catch(e){return {enabled:true,autoTimesheets:true,autoPayroll:true,lastRun:{}}}}
    function autoSet(v){localStorage.setItem(AUTO_KEY,JSON.stringify(v));return v}
    function monthKeyFromTs(ts){const d=new Date(Number(ts||0));if(Number.isNaN(d.getTime()))return '';return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`}
    function dateKeyFromTs(ts){const d=new Date(Number(ts||0));if(Number.isNaN(d.getTime()))return '';return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
    function dayKeyFromDateKey(k){return String(Number(String(k||'').slice(8,10))).padStart(2,'0')}
    function round2(v){return Math.round(Number(v||0)*100)/100}
    function isManualDay(day){if(!day||typeof day!=='object')return false;return Boolean(day.correctedAt||day.correctionReason||day.manualCorrection||day.manuallyCorrected||day.adjustedBy||day.override===true||String(day.source||'').toUpperCase().includes('MANUAL'))}
    function ensureDay(days,date){const dk=dayKeyFromDateKey(date);if(!days[dk])days[dk]={date,workedHours:0,sessions:[],anomalies:[],source:'AUTO_POINTAGE'};return days[dk]}
    function pushAnomaly(days,date,message,punch){if(!date)return;const d=ensureDay(days,date);d.anomalies.push({type:'AUTO_CONTROL',message,punchId:punch?.id||null,timestamp:Number(punch?.timestamp||0)||null});}
    function buildAutomaticDays(staffId,month){
        const raw=(typeof getPunches==='function'?getPunches():[]).filter(p=>String(p?.staffId)===String(staffId)).slice().sort((a,b)=>Number(a?.timestamp||0)-Number(b?.timestamp||0));
        const days={}; let open=null;
        raw.forEach(p=>{
            const type=String(p?.type||'').toUpperCase(); const pMonth=monthKeyFromTs(p?.timestamp); const pDate=dateKeyFromTs(p?.timestamp);
            if(type==='ENTRÉE'||type==='ENTREE'){
                if(open){const od=dateKeyFromTs(open.timestamp);if(monthKeyFromTs(open.timestamp)===month)pushAnomaly(days,od,'Entrée sans sortie avant le pointage suivant',open)}
                open=p; return;
            }
            if(type==='SORTIE'){
                if(!open){if(pMonth===month)pushAnomaly(days,pDate,'Sortie sans entrée correspondante',p);return}
                const inTs=Number(open.timestamp||0),outTs=Number(p.timestamp||0),inMonth=monthKeyFromTs(inTs),inDate=dateKeyFromTs(inTs);
                let hours=(outTs-inTs)/3600000;
                if(inMonth===month){
                    const d=ensureDay(days,inDate);
                    const anomalies=[];
                    if(!Number.isFinite(hours)||hours<0){hours=0;anomalies.push('Durée de pointage invalide')}
                    if(hours>18)anomalies.push('Amplitude supérieure à 18 h à contrôler');
                    const session={entry:open,exit:p,hours:round2(Math.max(0,hours)),source:'AUTO_POINTAGE'};
                    d.sessions.push(session); d.workedHours=round2(d.workedHours+session.hours);
                    anomalies.forEach(msg=>d.anomalies.push({type:'AUTO_CONTROL',message:msg,entryTimestamp:inTs,exitTimestamp:outTs}));
                }
                open=null;
            }
        });
        if(open&&monthKeyFromTs(open.timestamp)===month)pushAnomaly(days,dateKeyFromTs(open.timestamp),'Entrée sans sortie',open);
        return days;
    }
    async function buildAutomaticTimesheets(month){
        if(typeof getRealTimesheets!=='function'||typeof saveRealTimesheetsLocal!=='function')return {employees:0,updated:0,skipped:0,anomalies:0};
        const store=getRealTimesheets()||{months:{}};store.months=store.months||{};const monthNode=store.months[month]||{};monthNode.staff=monthNode.staff||{};store.months[month]=monthNode;
        const staff=(typeof getDir==='function'?getDir():[]).filter(s=>s.active!==false);let updated=0,skipped=0,anomalies=0;
        staff.forEach(st=>{
            const id=String(st.id);const existing=monthNode.staff[id]||{};const status=String(existing.status||'').toUpperCase();
            if(status==='LOCKED'||status==='VALIDATED'){skipped++;return}
            const autoDays=buildAutomaticDays(st.id,month);const merged={};
            const keys=new Set([...Object.keys(autoDays),...Object.keys(existing.days||{})]);
            keys.forEach(k=>{const old=(existing.days||{})[k],fresh=autoDays[k];merged[k]=isManualDay(old)?old:(fresh||old);if(Array.isArray(merged[k]?.anomalies))anomalies+=merged[k].anomalies.length});
            monthNode.staff[id]={...existing,staffId:st.id,staffName:st.name,month,status:'TO_VERIFY',days:merged,generatedAt:new Date().toISOString(),source:'AUTO_POINTAGE'};updated++;
        });
        saveRealTimesheetsLocal(store);
        try{if(typeof API!=='undefined'&&API?.update)await API.update('RH_TIMESHEET_REAL',store)}catch(e){console.warn('[iCHEF RH] Sync feuilles automatiques:',e)}
        try{if(typeof recordRhChange==='function')recordRhChange({type:'AUTO_TIMESHEETS',message:`Feuilles d'heures générées automatiquement pour ${month}`,month,updated,skipped,anomalies})}catch(e){}
        return {employees:staff.length,updated,skipped,anomalies};
    }
    window.iChefRunAutomaticMonth=async function(month,opts={}){
        month=month||document.getElementById('real-timesheet-month')?.value||document.getElementById('payroll-month')?.value||new Date().toISOString().slice(0,7);
        const cfg=autoGet();if(!cfg.enabled&&!opts.force)return null;
        let timeResult=null,payResult=null;
        if(cfg.autoTimesheets!==false)timeResult=await buildAutomaticTimesheets(month);
        if(cfg.autoPayroll!==false&&typeof window.iChefPayrollGenerateAutomaticRun==='function')payResult=window.iChefPayrollGenerateAutomaticRun(month,{silent:true});
        cfg.lastRun=cfg.lastRun||{};cfg.lastRun[month]={at:new Date().toISOString(),timesheets:timeResult,payroll:payResult?.totals||null};autoSet(cfg);
        try{if(typeof renderRealTimesheets==='function')renderRealTimesheets()}catch(e){}
        try{if(typeof window.renderPayrollCenter==='function'&&document.getElementById('payroll-interface')?.style.display==='flex')window.renderPayrollCenter()}catch(e){}
        updateAutoUi();
        if(!opts.silent&&typeof showToast==='function')showToast('Heures et salaires préparés automatiquement');
        return {timesheets:timeResult,payroll:payResult};
    };
    window.iChefToggleAutoRh=function(){const cfg=autoGet();cfg.enabled=!cfg.enabled;autoSet(cfg);updateAutoUi();if(cfg.enabled)window.iChefRunAutomaticMonth(null,{silent:true});};
    function updateAutoUi(){
        const cfg=autoGet();document.querySelectorAll('.rh-auto-toggle').forEach(b=>{b.classList.toggle('on',cfg.enabled);b.textContent=cfg.enabled?'AUTOMATIQUE : ACTIVÉ':'AUTOMATIQUE : ARRÊTÉ'});
        const month=document.getElementById('real-timesheet-month')?.value||document.getElementById('payroll-month')?.value||new Date().toISOString().slice(0,7);const last=cfg.lastRun?.[month];
        document.querySelectorAll('.rh-auto-status').forEach(el=>{el.innerHTML=last?`Dernière génération : <strong>${new Date(last.at).toLocaleString('fr-FR')}</strong>`:'Aucune génération pour ce mois';});
    }
    function installTimesheetAutoBar(){
        const target=document.getElementById('real-timesheet-summary');if(!target||document.getElementById('rh-auto-timesheet-bar'))return;
        const bar=document.createElement('div');bar.id='rh-auto-timesheet-bar';bar.className='rh-auto-bar';bar.innerHTML=`<div class="rh-auto-copy"><strong>Feuilles d'heures + salaires automatiques</strong><span>Pointages → heures réelles → préparation du salaire du mois. Les corrections manuelles et les mois validés/clôturés sont préservés.</span><div class="rh-auto-status"></div></div><div class="rh-auto-actions"><button class="rh-auto-toggle" onclick="iChefToggleAutoRh()"></button><button class="rh-auto-btn" onclick="iChefRunAutomaticMonth(document.getElementById('real-timesheet-month')?.value,{force:true})">GÉNÉRER LE MOIS</button></div>`;
        target.parentNode.insertBefore(bar,target);updateAutoUi();
    }
    function installPayrollAutoControls(){
        const top=document.querySelector('#payroll-interface .payroll-topbar');if(!top||document.getElementById('rh-auto-payroll-btn'))return;
        const toggle=document.createElement('button');toggle.id='rh-auto-payroll-toggle';toggle.className='rh-auto-toggle';toggle.onclick=window.iChefToggleAutoRh;top.appendChild(toggle);
        const btn=document.createElement('button');btn.id='rh-auto-payroll-btn';btn.className='rh-auto-btn';btn.textContent='RECALCULER HEURES + SALAIRES';btn.onclick=()=>window.iChefRunAutomaticMonth(document.getElementById('payroll-month')?.value,{force:true});top.appendChild(btn);updateAutoUi();
    }
    function installHubAutoButton(){
        const grid=document.querySelector('#director-hub .grid-2');if(!grid||document.getElementById('rh-auto-hub-btn'))return;
        const b=document.createElement('button');b.id='rh-auto-hub-btn';b.className='pay-btn';b.style.cssText='border-color:var(--success);color:var(--success);background:rgba(16,185,129,.04);padding:22px;grid-column:span 2;';b.textContent='AUTOMATISATION RH · HEURES + SALAIRES';b.onclick=()=>window.iChefRunAutomaticMonth(new Date().toISOString().slice(0,7),{force:true});grid.insertBefore(b,grid.firstChild);
    }
    function installHooks(){
        installTimesheetAutoBar();installPayrollAutoControls();installHubAutoButton();updateAutoUi();
        const tm=document.getElementById('real-timesheet-month');if(tm&&!tm.dataset.autoHook){tm.dataset.autoHook='1';tm.addEventListener('change',()=>{if(autoGet().enabled)window.iChefRunAutomaticMonth(tm.value,{silent:true})})}
        const pm=document.getElementById('payroll-month');if(pm&&!pm.dataset.autoHook){pm.dataset.autoHook='1';pm.addEventListener('change',()=>{if(autoGet().enabled)window.iChefRunAutomaticMonth(pm.value,{silent:true})})}
        if(typeof window.openPayrollCenter==='function'&&!window.openPayrollCenter.__autoWrapped){const orig=window.openPayrollCenter;const wrapped=function(){const r=orig.apply(this,arguments);const month=document.getElementById('payroll-month')?.value;if(autoGet().enabled)setTimeout(()=>window.iChefRunAutomaticMonth(month,{silent:true}),0);return r};wrapped.__autoWrapped=true;window.openPayrollCenter=wrapped;}
        if(typeof window.submitPunch==='function'&&!window.submitPunch.__autoWrapped){const origPunch=window.submitPunch;const wrappedPunch=async function(){const r=await origPunch.apply(this,arguments);if(autoGet().enabled)setTimeout(()=>window.iChefRunAutomaticMonth(new Date().toISOString().slice(0,7),{silent:true}),250);return r};wrappedPunch.__autoWrapped=true;window.submitPunch=wrappedPunch;}
    }
    document.addEventListener('DOMContentLoaded',()=>{installHooks();setTimeout(installHooks,700);setTimeout(()=>{if(autoGet().enabled)window.iChefRunAutomaticMonth(new Date().toISOString().slice(0,7),{silent:true})},1200)});
})();
