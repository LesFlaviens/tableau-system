
;
/* RH V264 - preserved script #11 */
/* =========================================================
   iCHEF OS · PORTE D'ENTRÉE OFFICIELLE V77
   - rh.html réservé à la Direction RH
   - PIN Direction serveur => cockpit Direction
   - Centre de contrôle => pointeuse / direction
   ========================================================= */
let officialGatewayPin = "";
let officialGatewayBusy = false;
function setOfficialGatewayStatus(message, type = "ok") {
    const box = document.getElementById("official-gateway-status");
    const text = document.getElementById("official-gateway-status-text");
    if (!box || !text) return;
    box.classList.remove("offline", "error");
    if (type === "offline") box.classList.add("offline");
    if (type === "error") box.classList.add("error");
    text.textContent = String(message || "");
}
function renderOfficialGatewayPin(error = false) {
    const root = document.getElementById("official-pin-display");
    if (!root) return;
    const dots = root.querySelectorAll(".gateway-pin-dot");
    dots.forEach((dot, index) => {
        dot.classList.toggle("filled", index < Math.min(officialGatewayPin.length, dots.length));
        dot.classList.toggle("error", Boolean(error));
    });
    const overflow = document.getElementById("official-pin-overflow");
    if (overflow) {
        const extra = Math.max(0, officialGatewayPin.length - dots.length);
        overflow.textContent = extra ? `+${extra}` : "";
        overflow.classList.toggle("show", extra > 0);
    }
}
function appendOfficialGatewayPin(value) {
    if (officialGatewayBusy || officialGatewayPin.length >= 12) return;
    officialGatewayPin += String(value);
    renderOfficialGatewayPin(false);
    setOfficialGatewayStatus(
        navigator.onLine
            ? "ACCÈS RH AUTORISÉ · PIN SERVEUR REQUIS"
            : "MODE HORS LIGNE · CONNEXION SERVEUR REQUISE",
        navigator.onLine ? "ok" : "offline"
    );
}
function deleteOfficialGatewayPin() {
    if (officialGatewayBusy) return;
    officialGatewayPin = officialGatewayPin.slice(0, -1);
    renderOfficialGatewayPin(false);
}
function clearOfficialGatewayPin() {
    if (officialGatewayBusy) return;
    officialGatewayPin = "";
    renderOfficialGatewayPin(false);
}
function resetOfficialGateway() {
    officialGatewayPin = "";
    officialGatewayBusy = false;
    renderOfficialGatewayPin(false);
    const submit = document.getElementById("official-gateway-submit");
    if (submit) submit.disabled = false;
    setOfficialGatewayStatus(
        navigator.onLine
            ? "ACCÈS RH AUTORISÉ · PIN SERVEUR REQUIS"
            : "MODE HORS LIGNE · CONNEXION SERVEUR REQUISE",
        navigator.onLine ? "ok" : "offline"
    );
}
function openOfficialAccessCenter() {
    const el = document.getElementById("official-access-center");
    if (!el) return;
    el.classList.add("show");
    el.setAttribute("aria-hidden", "false");
}
function closeOfficialAccessCenter() {
    const el = document.getElementById("official-access-center");
    if (!el) return;
    el.classList.remove("show");
    el.setAttribute("aria-hidden", "true");
}
async function submitOfficialGatewayPin() {
    const pin = String(officialGatewayPin || "").trim();
    if (officialGatewayBusy) return;
    if (!/^\d{4,12}$/.test(pin)) {
        renderOfficialGatewayPin(true);
        setOfficialGatewayStatus("PIN INCOMPLET · 4 À 12 CHIFFRES", "error");
        return;
    }
    officialGatewayBusy = true;
    const submit = document.getElementById("official-gateway-submit");
    if (submit) submit.disabled = true;
    setOfficialGatewayStatus("VÉRIFICATION SÉCURISÉE EN COURS…", "ok");
    try {
        /* rh.html est réservé à la Direction RH.
           Le portail Staff est une interface séparée et n'est plus exposé ici. */
        const auth = await verifyPinWithServer(pin);
        if (!auth?.success) {
            renderOfficialGatewayPin(true);
            setOfficialGatewayStatus(auth?.error || "PIN NON RECONNU", "error");
            return;
        }
        const serverRole = String(auth.role || "").trim().toLowerCase();
        const serverDept = String(auth.dept || "").trim().toLowerCase();
        const directionRoles = new Set([
            "master",
            "admin",
            "manager",
            "direction",
            "directeur",
            "gerant",
            "gérant",
            "responsable",
            "responsable rh",
            "rh",
            "superviseur",
            "supervisor",
            "owner",
            "proprietaire",
            "propriétaire",
            "founder",
            "fondateur"
        ]);
        const directionDepts = new Set(["admin","direction","rh","management"]);
        const serverManager =
            auth?.isManager === true ||
            auth?.isMaster === true ||
            directionRoles.has(serverRole) ||
            directionDepts.has(serverDept);
        if (!serverManager) {
            renderOfficialGatewayPin(true);
            setOfficialGatewayStatus("PIN VALIDE · DROITS DIRECTION REQUIS", "error");
            return;
        }
        // Le portail vérifie le PIN puis le conserve uniquement en mémoire
        // pour les appels RH protégés (planning, IA, synchronisation).
        currentPin = pin;
        rhDirectionAuthPin = pin;
        loginMode = "director";
        currentDept = "admin";
        document.querySelectorAll(".full-interface").forEach(el => el.style.display = "none");
        document.getElementById("employee-portal").style.display = "none";
        document.getElementById("landing-portal").style.display = "none";
        document.getElementById("director-hub").style.display = "flex";
        const hubDept = document.getElementById("hub-dept-display");
        if (hubDept) hubDept.innerText = "DIRECTION";
        try {
            // Une fois le PIN Direction validé, on recharge l'état RH protégé.
            const state = await API.getState();
            if (state?.activeOrders) {
                if (state.activeOrders['DIRECTORY_MASTER']) {
                    localStorage.setItem(
                        'empire_hr_directory',
                        JSON.stringify(state.activeOrders['DIRECTORY_MASTER'].data || [])
                    );
                }
                if (state.activeOrders['TIMESHEETS_MASTER']) {
                    applyRemoteTimesheets(
                        state.activeOrders['TIMESHEETS_MASTER'].data || {},
                        'direction-auth'
                    );
                }
                if (state.activeOrders['REQUESTS_MASTER'] || state.activeOrders['STAFF_REQUESTS']) {
                    const reqRows =
                        state.activeOrders['REQUESTS_MASTER']?.data ||
                        state.activeOrders['STAFF_REQUESTS']?.data ||
                        [];
                    if (Array.isArray(reqRows)) {
                        localStorage.setItem(
                            'empire_hr_requests',
                            JSON.stringify(reqRows)
                        );
                    }
                }
                if (state.activeOrders['RH_SETTINGS']) {
                    localStorage.setItem(
                        'ichef_rh_settings',
                        JSON.stringify(state.activeOrders['RH_SETTINGS'].data || {})
                    );
                }
                if (state.activeOrders['RH_TIMESHEET_REAL']) {
                    localStorage.setItem(
                        'ichef_rh_timesheet_real',
                        JSON.stringify(state.activeOrders['RH_TIMESHEET_REAL'].data || { months:{} })
                    );
                }
                syncRhStaffFromState(state, { render:false });
            }
            await refreshStaffAccessFromServer();
        } catch (syncError) {
            console.warn('[iCHEF RH V84] resynchronisation après PIN', syncError);
        }
        updateDashboardStats();
        updateReqBadge();
        resetOfficialGateway();
    } catch (error) {
        console.error("Porte d'entrée iCHEF :", error);
        renderOfficialGatewayPin(true);
        setOfficialGatewayStatus(
            navigator.onLine
                ? "SERVEUR INDISPONIBLE · RÉESSAYER"
                : "PAS DE CONNEXION INTERNET",
            navigator.onLine ? "error" : "offline"
        );
    } finally {
        officialGatewayBusy = false;
        if (submit) submit.disabled = false;
    }
}
function updateOfficialGatewayNetworkStatus() {
    if (officialGatewayBusy) return;
    setOfficialGatewayStatus(
        navigator.onLine
            ? "ACCÈS RH AUTORISÉ · PIN SERVEUR REQUIS"
            : "MODE HORS LIGNE · CONNEXION SERVEUR REQUISE",
        navigator.onLine ? "ok" : "offline"
    );
}
document.addEventListener("keydown", function(event) {
    const landing = document.getElementById("landing-portal");
    if (!landing || landing.style.display === "none") return;
    const center = document.getElementById("official-access-center");
    if (center?.classList.contains("show")) {
        if (event.key === "Escape") closeOfficialAccessCenter();
        return;
    }
    if (/^\d$/.test(event.key)) {
        event.preventDefault();
        appendOfficialGatewayPin(event.key);
        return;
    }
    if (event.key === "Backspace") {
        event.preventDefault();
        deleteOfficialGatewayPin();
        return;
    }
    if (event.key === "Delete") {
        event.preventDefault();
        clearOfficialGatewayPin();
        return;
    }
    if (event.key === "Enter") {
        event.preventDefault();
        submitOfficialGatewayPin();
    }
});
window.addEventListener("online", updateOfficialGatewayNetworkStatus);
window.addEventListener("offline", updateOfficialGatewayNetworkStatus);
document.addEventListener("DOMContentLoaded", function() {
    resetOfficialGateway();
});
/* Sécurité visuelle : lorsqu'un logout RH ramène à l'accueil,
   le PIN du pad principal ne doit jamais rester affiché. */
try {
    const __ichefOriginalFullLogout = window.fullLogout;
    if (typeof __ichefOriginalFullLogout === "function") {
        window.fullLogout = function(...args) {
            const result = __ichefOriginalFullLogout.apply(this, args);
            resetOfficialGateway();
            return result;
        };
    }
} catch (_) {}


;
/* RH V264 - preserved script #12 */
(() => {
    const PRIMARY = [
        ['present','Travail','1'],['off','Repos','2'],['conge','Congé','3'],
        ['recup','Récupération','4'],['maladie','Maladie','5'],['formation','Formation','6']
    ];
    const MORE = [
        ['off_soir','Matin seul'],['off_matin','Soir seul'],['ferie','Férié'],
        ['accident_travail','Accident travail'],['maternite','Maternité'],['paternite','Paternité'],
        ['parental','Congé parental'],['enfant_malade','Enfant / proche malade'],['evenement_familial','Événement familial'],
        ['deces','Décès / deuil'],['sans_solde','Sans solde'],['absence_autorisee','Absence autorisée'],['absence_injustifiee','Absence injustifiée']
    ];
    let ctx = null;
    function esc(v){
        if (typeof window.escapeRhHtml === 'function') return window.escapeRhHtml(String(v ?? ''));
        return String(v ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
    }
    function tone(status){if(['present','off_soir','off_matin'].includes(status))return'work';if(status==='off')return'rest';return'leave';}
    function ensureMenu(){let m=document.getElementById('rh-quick-status-menu');if(m)return m;m=document.createElement('div');m.id='rh-quick-status-menu';m.setAttribute('role','dialog');m.setAttribute('aria-label','Choisir le statut du planning');document.body.appendChild(m);return m;}
    function optionHtml(row,current,key=''){const [status,label]=row;return `<button type="button" class="rh-qsm-option tone-${tone(status)} ${current===status?'is-current':''}" data-rh-status="${esc(status)}"><span>${esc(label)}</span>${key?`<span class="rh-qsm-key">${esc(key)}</span>`:''}</button>`;}
    function currentStatus(staffId,day){try{const month=document.getElementById('month-selector')?.value||'';const ts=typeof getTs==='function'?getTs():{};return String(ts?.[month]?.[staffId]?.[day]?.status??ts?.[month]?.[String(staffId)]?.[String(day)]?.status??'off')}catch(_){return'off'}}
    function renderMenu(){if(!ctx)return;const menu=ensureMenu();const staff=typeof getDir==='function'?getDir().find(s=>String(s.id)===String(ctx.staffId)):null;const monthStr=document.getElementById('month-selector')?.value||'';const [y,m]=monthStr.split('-').map(Number);const dt=y&&m?new Date(y,m-1,ctx.day):null;const days=['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];const dateLabel=dt&&!Number.isNaN(dt.getTime())?`${days[dt.getDay()]} ${String(ctx.day).padStart(2,'0')}/${String(m).padStart(2,'0')}`:`Jour ${ctx.day}`;const current=currentStatus(ctx.staffId,ctx.day);menu.innerHTML=`<div class="rh-qsm-head"><div><strong>${esc(staff?.name||'Collaborateur')}</strong><small>${esc(dateLabel)} · saisie rapide</small></div><button type="button" class="rh-qsm-close" aria-label="Fermer">×</button></div><div class="rh-qsm-grid">${PRIMARY.map(r=>optionHtml(r,current,r[2])).join('')}</div><button type="button" class="rh-qsm-more-toggle">AUTRES STATUTS</button><div class="rh-qsm-grid rh-qsm-more">${MORE.map(r=>optionHtml(r,current)).join('')}</div><div class="rh-qsm-foot">1 Travail · 2 Repos · 3 Congé · 4 Récup · 5 Maladie · 6 Formation</div>`;
        menu.querySelector('.rh-qsm-close')?.addEventListener('click',closeRhQuickStatus);
        menu.querySelector('.rh-qsm-more-toggle')?.addEventListener('click',e=>{const more=menu.querySelector('.rh-qsm-more');const show=!more.classList.contains('show');more.classList.toggle('show',show);e.currentTarget.textContent=show?'MASQUER LES AUTRES STATUTS':'AUTRES STATUTS';positionMenu();});
        menu.querySelectorAll('[data-rh-status]').forEach(btn=>btn.addEventListener('click',()=>applyRhQuickStatus(btn.dataset.rhStatus)));
    }
    function positionMenu(){const menu=ensureMenu();if(!ctx?.anchor||!document.body.contains(ctx.anchor))return;menu.style.visibility='hidden';menu.classList.add('show');const r=ctx.anchor.getBoundingClientRect();const mw=menu.offsetWidth||330;const mh=menu.offsetHeight||300;let left=Math.min(Math.max(8,r.left),window.innerWidth-mw-8);let top=r.bottom+7;if(top+mh>window.innerHeight-8)top=Math.max(8,r.top-mh-7);menu.style.left=`${Math.round(left)}px`;menu.style.top=`${Math.round(top)}px`;menu.style.visibility='visible';}
    window.openRhQuickStatus=function(event,staffId,day){
        event?.preventDefault?.();
        event?.stopPropagation?.();
        const anchor =
            event?.currentTarget ||
            event?.target?.closest?.('.rh-status-quick-btn') ||
            event?.target;
        ctx={
            staffId:String(staffId ?? ''),
            day:Number(day),
            anchor
        };
        renderMenu();
        requestAnimationFrame(positionMenu);
    };
    window.closeRhQuickStatus=function(){
        const menu=document.getElementById('rh-quick-status-menu');
        if(menu){
            menu.classList.remove('show');
            menu.style.visibility='hidden';
        }
        ctx=null;
    };
    window.applyRhQuickStatus=async function(status){
        if(!ctx||!status)return;
        const {staffId,day}=ctx;
        closeRhQuickStatus();
        if(typeof updateData==='function'){
            await updateData(staffId,day,'status',status);
        }
    };
    /* V85 : gestion déléguée.
       Elle reste fonctionnelle même après chaque re-render du tableau. */
    document.addEventListener('click',event=>{
        const quickBtn=event.target?.closest?.('.rh-status-quick-btn');
        if(quickBtn){
            event.preventDefault();
            event.stopPropagation();
            window.openRhQuickStatus(
                event,
                quickBtn.dataset.rhStaff,
                Number(quickBtn.dataset.rhDay)
            );
            return;
        }
        const menu=document.getElementById('rh-quick-status-menu');
        if(!menu?.classList.contains('show'))return;
        if(menu.contains(event.target))return;
        closeRhQuickStatus();
    },true);
    document.addEventListener('keydown',event=>{
        const menu=document.getElementById('rh-quick-status-menu');
        if(!menu?.classList.contains('show')||!ctx)return;
        if(event.key==='Escape'){
            event.preventDefault();
            closeRhQuickStatus();
            return;
        }
        const row=PRIMARY.find(x=>x[2]===event.key);
        if(row){
            event.preventDefault();
            applyRhQuickStatus(row[0]);
        }
    });
    window.addEventListener('resize',()=>{
        if(ctx)requestAnimationFrame(positionMenu);
    });
    /* Important : avant, le moindre scroll fermait le menu.
       Dans la grille horizontale cela pouvait le fermer immédiatement
       au clic. Maintenant il suit simplement sa cellule. */
    window.addEventListener('scroll',()=>{
        if(ctx)requestAnimationFrame(positionMenu);
    },true);
})();


;
/* RH V264 - preserved script #13 */
window.__ICHEF_RH_BUILD__ = 'RH-V84-PLANNING-AI-AUTH-FIX';
console.info('[iCHEF RH V84] Planning manuel + sauvegarde cloud + IA planning sécurisés');


;
/* RH V264 - preserved script #14 */
(() => {
    let editorCtx = null;
    const workStatuses = new Set(['present','off_matin','off_soir','ferie']);
    const statusRows = [
        ['present','Travail'],['off','Repos'],['off_soir','Matin seul'],['off_matin','Soir seul'],
        ['conge','Congé'],['recup','Récupération'],['maladie','Maladie'],['ferie','Férié'],
        ['formation','Formation'],['accident_travail','Accident du travail'],['maternite','Maternité'],
        ['paternite','Paternité'],['parental','Congé parental'],['enfant_malade','Enfant / proche malade'],
        ['evenement_familial','Événement familial'],['deces','Décès / deuil'],['sans_solde','Sans solde'],
        ['absence_autorisee','Absence autorisée'],['absence_injustifiee','Absence injustifiée']
    ];
    const posteRows = [
        ['salle','Salle'],['cuisine','Cuisine'],['patisserie','Pâtisserie'],['bar','Bar'],['admin','Admin']
    ];
    const esc = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    function ensureEditor(){
        let modal=document.getElementById('rh-cockpit-shift-editor');
        if(modal) return modal;
        modal=document.createElement('div');
        modal.id='rh-cockpit-shift-editor';
        modal.setAttribute('role','dialog');
        modal.setAttribute('aria-modal','true');
        modal.innerHTML='<div class="rh-cse-card"></div>';
        document.body.appendChild(modal);
        modal.addEventListener('click',e=>{if(e.target===modal) window.closeRhCockpitShiftEditor();});
        return modal;
    }
    function dayData(staffId,dateStr){
        const [y,m,d]=String(dateStr).split('-').map(Number);
        const month=`${y}-${String(m).padStart(2,'0')}`;
        const ts=typeof getTs==='function'?getTs():{};
        const sm=ts?.[month]?.[staffId] || ts?.[month]?.[String(staffId)] || {};
        const staff=typeof getDir==='function'?getDir().find(s=>String(s.id)===String(staffId)):null;
        const raw=sm?.[d] || sm?.[String(d)] || {};
        return {y,m,d,month,staff,p:{status:'off',poste:staff?.dept||'salle',s1:'',s2:'',pause:0,obs:'',...raw}};
    }
    function toggleShiftFields(){
        const st=document.getElementById('rh-cse-status')?.value||'off';
        const s1=document.getElementById('rh-cse-s1');
        const s2=document.getElementById('rh-cse-s2');
        const pause=document.getElementById('rh-cse-pause');
        const poste=document.getElementById('rh-cse-poste');
        const enabled=workStatuses.has(st);
        if(poste) poste.disabled=!enabled;
        if(s1) s1.disabled=!['present','off_soir','ferie'].includes(st);
        if(s2) s2.disabled=!['present','off_matin','ferie'].includes(st);
        if(pause) pause.disabled=!enabled;
    }
    window.openRhCockpitShiftEditor = function(staffId,dateStr){
        const requestedDate = new Date(`${String(dateStr)}T12:00:00`);
        const horizon = typeof window.getRhPlanningHorizonEnd === 'function' ? window.getRhPlanningHorizonEnd() : null;
        if (horizon && !Number.isNaN(requestedDate.getTime()) && requestedDate.getTime() > horizon.getTime()) {
            alert(`Le planning peut être préparé jusqu’au ${horizon.toLocaleDateString('fr-FR')} (6 mois dans le futur).`);
            return;
        }
        const settings=typeof getRhSettings==='function'?getRhSettings():{};
        if(String(settings.planningStatus||'draft')==='locked'){
            const unlock=confirm('Ce planning est verrouillé. Voulez-vous le repasser en BROUILLON pour pouvoir le modifier ?');
            if(!unlock) return;
            if(typeof saveRhSettings==='function') saveRhSettings({...settings,planningStatus:'draft'});
        }
        const data=dayData(staffId,dateStr);
        if(!data.staff){
            alert('Collaborateur introuvable.');
            return;
        }
        editorCtx={staffId:String(staffId),dateStr:String(dateStr),...data};
        const modal=ensureEditor();
        const card=modal.querySelector('.rh-cse-card');
        const dateObj=new Date(data.y,data.m-1,data.d,12,0,0,0);
        const label=dateObj.toLocaleDateString('fr-FR',{weekday:'long',day:'2-digit',month:'long',year:'numeric'});
        card.innerHTML=`
            <div class="rh-cse-head">
                <div><small>Modifier le planning</small><strong>${esc(data.staff.name||'Collaborateur')}</strong><div style="color:#8f969d;font-size:11px;margin-top:4px">${esc(label)}</div></div>
                <button type="button" class="rh-cse-close" onclick="closeRhCockpitShiftEditor()">×</button>
            </div>
            <div class="rh-cse-body">
                <div class="rh-cse-grid">
                    <div class="rh-cse-field">
                        <label>Catégorie planning</label>
                        <select id="rh-cse-category">
                            ${window.iChefPlanningCategoryOptionsV202?.(data.p.categoryId||data.p.status) || `<option value="${esc(String(data.p.status||'off'))}">${esc(String(data.p.status||'off').toUpperCase())}</option>`}
                        </select>
                        <small id="rh-cse-category-meaning" class="rh-v202-category-meaning"></small>
                    </div>
                    <div class="rh-cse-field rh-v202-legal-status-field"><label>Comportement légal · automatique</label><select id="rh-cse-status">${statusRows.map(([v,l])=>`<option value="${v}" ${String(data.p.status)===v?'selected':''}>${esc(l)}</option>`).join('')}</select></div>
                    <div class="rh-cse-field"><label>Poste</label><select id="rh-cse-poste">${posteRows.map(([v,l])=>`<option value="${v}" ${String(data.p.poste||data.staff.dept||'salle')===v?'selected':''}>${esc(l)}</option>`).join('')}</select></div>
                    <div class="rh-cse-field"><label>Matin (S1)</label><input id="rh-cse-s1" type="text" placeholder="10:00-14:45" value="${esc(data.p.s1||'')}"></div>
                    <div class="rh-cse-field"><label>Soir (S2)</label><input id="rh-cse-s2" type="text" placeholder="18:00-22:45" value="${esc(data.p.s2||'')}"></div>
                    <div class="rh-cse-field"><label>Pause (minutes)</label><input id="rh-cse-pause" type="number" min="0" max="240" step="5" value="${Number(data.p.pause)||0}"></div>
                    <div class="rh-cse-field full"><label>Observation interne</label><textarea id="rh-cse-obs" placeholder="Observation interne...">${esc(data.p.obs||'')}</textarea></div>
                    <div class="rh-cse-field full">
                        <label>Note du gérant affichée dans la case · 40 caractères max</label>
                        <input id="rh-cse-manager-note" type="text" maxlength="40" placeholder="Ex. Remplace Paul à 18h" value="${esc(data.p.managerNote||'')}">
                        <small class="rh-cse-count" id="rh-cse-manager-count">${String(data.p.managerNote||'').length}/40</small>
                    </div>
                    <div class="rh-cse-field full rh-cse-reason-field">
                        <label>Pourquoi ce planning est-il modifié ? · obligatoire</label>
                        <textarea id="rh-cse-change-reason" maxlength="180" placeholder="Motif obligatoire : remplacement, changement d'activité, demande du collaborateur, erreur de saisie…"></textarea>
                        <small class="rh-cse-count" id="rh-cse-reason-count">0/180</small>
                    </div>
                </div>
                <div class="rh-cse-note">Chaque changement est horodaté avec le motif, l'avant/après et l'auteur. L'historique du planning est conservé 5 ans et synchronisé pour le Portail Staff.</div>
            </div>
            <div class="rh-cse-actions">
                <button type="button" class="rh-cse-cancel" onclick="closeRhCockpitShiftEditor()">ANNULER</button>
                <button type="button" class="rh-cse-save" onclick="saveRhCockpitShiftEditor()">ENREGISTRER</button>
            </div>`;
        const syncCategoryV202 = () => {
            const categoryId=String(document.getElementById('rh-cse-category')?.value||data.p.categoryId||data.p.status||'off');
            const category=window.iChefPlanningCategoryByIdV202?.(categoryId);
            const statusSelect=document.getElementById('rh-cse-status');
            if(category?.legalType && statusSelect){
                statusSelect.value=category.legalType;
            }
            const meaning=document.getElementById('rh-cse-category-meaning');
            if(meaning){
                meaning.textContent=category?.meaning
                    ? `${category.meaning} · traitement : ${window.iChefLegalTypeLabelV202?.(category.legalType)||category.legalType}`
                    : `Traitement : ${window.iChefLegalTypeLabelV202?.(category?.legalType||statusSelect?.value)||category?.legalType||statusSelect?.value||''}`;
            }
            const color=category?.color||'#eeeeee';
            const categorySelect=document.getElementById('rh-cse-category');
            if(categorySelect) categorySelect.style.background=color;
        };
        document.getElementById('rh-cse-category')?.addEventListener('change',()=>{
            syncCategoryV202();
            document.getElementById('rh-cse-status')?.dispatchEvent(new Event('change',{bubbles:true}));
        });
        syncCategoryV202();
        document.getElementById('rh-cse-status')?.addEventListener('change',()=>{
            const st=document.getElementById('rh-cse-status')?.value||'off';
            if(st==='present'){
                if(!document.getElementById('rh-cse-s1').value) document.getElementById('rh-cse-s1').value='10:00-14:45';
                if(!document.getElementById('rh-cse-s2').value) document.getElementById('rh-cse-s2').value='18:00-22:45';
                if(!Number(document.getElementById('rh-cse-pause').value)) document.getElementById('rh-cse-pause').value='30';
            } else if(st==='off_soir'){
                if(!document.getElementById('rh-cse-s1').value) document.getElementById('rh-cse-s1').value='10:00-14:45';
                document.getElementById('rh-cse-s2').value='';
                document.getElementById('rh-cse-pause').value='0';
            } else if(st==='off_matin'){
                document.getElementById('rh-cse-s1').value='';
                if(!document.getElementById('rh-cse-s2').value) document.getElementById('rh-cse-s2').value='18:00-22:45';
                document.getElementById('rh-cse-pause').value='0';
            } else if(!workStatuses.has(st)){
                document.getElementById('rh-cse-s1').value='';
                document.getElementById('rh-cse-s2').value='';
                document.getElementById('rh-cse-pause').value='0';
            }
            toggleShiftFields();
        });
        toggleShiftFields();
        const noteInput = document.getElementById('rh-cse-manager-note');
        const reasonInput = document.getElementById('rh-cse-change-reason');
        noteInput?.addEventListener('input', () => {
            const count = document.getElementById('rh-cse-manager-count');
            if (count) count.textContent = `${noteInput.value.length}/40`;
        });
        reasonInput?.addEventListener('input', () => {
            const count = document.getElementById('rh-cse-reason-count');
            if (count) count.textContent = `${reasonInput.value.length}/180`;
        });
        modal.classList.add('show');
        setTimeout(()=>document.getElementById('rh-cse-status')?.focus(),30);
    };
    window.closeRhCockpitShiftEditor = function(){
        document.getElementById('rh-cockpit-shift-editor')?.classList.remove('show');
        editorCtx=null;
    };
    window.saveRhCockpitShiftEditor = async function(){
        if(!editorCtx) return;
        let status=String(document.getElementById('rh-cse-status')?.value||'off');
        const categoryId=String(document.getElementById('rh-cse-category')?.value||editorCtx.p?.categoryId||status||'off');
        const category=window.iChefPlanningCategoryByIdV202?.(categoryId);
        if(category?.legalType) status=String(category.legalType);
        const poste=String(document.getElementById('rh-cse-poste')?.value||editorCtx.staff?.dept||'salle');
        let s1=String(document.getElementById('rh-cse-s1')?.value||'').trim();
        let s2=String(document.getElementById('rh-cse-s2')?.value||'').trim();
        let pause=Math.max(0,Math.min(240,Number(document.getElementById('rh-cse-pause')?.value)||0));
        const obs=String(document.getElementById('rh-cse-obs')?.value||'').trim().slice(0,500);
        const managerNote=String(document.getElementById('rh-cse-manager-note')?.value||'').trim().slice(0,40);
        const changeReason=String(document.getElementById('rh-cse-change-reason')?.value||'').trim().slice(0,180);
        if(!workStatuses.has(status)){s1='';s2='';pause=0;}
        if(status==='off_soir'){s2='';}
        if(status==='off_matin'){s1='';}
        const shiftPattern=/^\d{1,2}:\d{2}-\d{1,2}:\d{2}$/;
        if(s1 && !shiftPattern.test(s1)){alert('Horaire matin invalide. Exemple : 10:00-14:45');return;}
        if(s2 && !shiftPattern.test(s2)){alert('Horaire soir invalide. Exemple : 18:00-22:45');return;}
        const ts=typeof getTs==='function'?getTs():{};
        const month=editorCtx.month;
        const sid=String(editorCtx.staffId);
        const day=Number(editorCtx.d);
        if(!ts[month]) ts[month]={};
        if(!ts[month][sid]) ts[month][sid]={};
        const previous=ts[month][sid][day] || ts[month][sid][String(day)] || {};
        const previousSnapshot=JSON.parse(JSON.stringify(previous || {}));
        const candidate={...previous,status,categoryId,poste,s1,s2,pause,obs,managerNote};
        const comparable = node => JSON.stringify({
            status:String(node?.status||'off'),categoryId:String(node?.categoryId||node?.status||'off'),poste:String(node?.poste||''),s1:String(node?.s1||''),s2:String(node?.s2||''),
            pause:Number(node?.pause||0),obs:String(node?.obs||''),managerNote:String(node?.managerNote||'')
        });
        if(comparable(previousSnapshot)===comparable(candidate)){
            window.closeRhCockpitShiftEditor();
            if(typeof showToast==='function') showToast('Aucune modification');
            return;
        }
        if(!changeReason){
            alert('Le motif de modification est obligatoire pour garantir la traçabilité du planning.');
            document.getElementById('rh-cse-change-reason')?.focus();
            return;
        }
        const auditAt=new Date().toISOString();
        const auditBy=typeof window.rhAuditActorV94==='function'?window.rhAuditActorV94():'Direction / RH';
        ts[month][sid][day]={...candidate,lastChangeReason:changeReason,lastChangeAt:auditAt,lastChangeBy:auditBy,updatedAt:auditAt};
        const saveBtn=document.querySelector('#rh-cockpit-shift-editor .rh-cse-save');
        if(saveBtn){saveBtn.disabled=true;saveBtn.textContent='ENREGISTRÉ';}
        try{
            // saveTs écrit d'abord localement de façon synchrone, puis synchronise le cloud.
            // L'interface ne reste donc jamais bloquée en attendant le réseau.
            let cloudPromise = null;
            if(typeof saveTs==='function') cloudPromise = saveTs(ts);
            else localStorage.setItem('empire_hr_timesheets',JSON.stringify(ts));
            if(typeof recordRhChange==='function') recordRhChange({
                type:'PLANNING_MANUAL_EDIT',source:'DIRECTION_PLANNING',staffId:sid,
                staffName:String(editorCtx.staff?.name||''),date:editorCtx.dateStr,month,day,
                reason:changeReason,managerNote,by:auditBy,before:previousSnapshot,
                after:{...ts[month][sid][day]},
                message:`Planning modifié · ${editorCtx.dateStr} · ${changeReason}`
            });
            if(typeof loadMonthData==='function') loadMonthData();
            if(typeof loadPublicPlanning==='function') loadPublicPlanning();
            if(typeof broadcastStaffingLevels==='function') Promise.resolve(broadcastStaffingLevels()).catch(()=>{});
            if(typeof renderRhCockpit==='function') renderRhCockpit();
            window.closeRhCockpitShiftEditor();
            if(typeof showToast==='function') showToast('Planning enregistré');
            if(cloudPromise && typeof cloudPromise.then==='function'){
                cloudPromise.then(ok=>{
                    if(ok===false && typeof showToast==='function'){
                        showToast('Planning conservé · synchronisation en attente');
                    }
                }).catch(error=>{
                    console.warn('[iCHEF RH V90] synchronisation planning différée',error);
                    if(typeof showToast==='function') showToast('Planning conservé · synchronisation en attente');
                });
            }
        } catch(error){
            console.error('[iCHEF RH V90] sauvegarde planning cockpit',error);
            alert('La modification n’a pas pu être enregistrée localement.');
            if(saveBtn){saveBtn.disabled=false;saveBtn.textContent='ENREGISTRER';}
        }
    };
    document.addEventListener('click',event=>{
        const chip=event.target?.closest?.('.rh-cockpit-edit-chip');
        if(!chip) return;
        event.preventDefault();
        event.stopPropagation();
        window.openRhCockpitShiftEditor(chip.dataset.rhEditStaff,chip.dataset.rhEditDate);
    });
    document.addEventListener('keydown',event=>{
        if(event.key==='Escape' && document.getElementById('rh-cockpit-shift-editor')?.classList.contains('show')){
            window.closeRhCockpitShiftEditor();
        }
    });
})();


;
/* RH V264 - preserved script #15 */
window.__ICHEF_RH_BUILD__ = 'RH-V91-PLANNING-STATUS-CONTROLS';
console.info('[iCHEF RH V90] Planning éditable semaine par semaine jusqu’à 6 mois dans le futur');


;
/* RH V264 - preserved script #16 */
console.info('[iCHEF RH V87 legacy] Correctifs planning manuel conservés sous V88');


;
/* RH V264 - preserved script #17 */
(() => {
  const QUICK = [
    ['present','TRAVAIL'],['off','REPOS / OFF'],['conge','CONGÉ'],
    ['recup','RÉCUPÉRATION'],['maladie','MALADIE'],['formation','FORMATION']
  ];
  function refreshStatusButtons(){
    const select=document.getElementById('rh-cse-status');
    if(!select) return;
    select.disabled=false;
    select.removeAttribute('disabled');
    const current=String(select.value||'off');
    document.querySelectorAll('#rh-cockpit-shift-editor .rh-cse-status-action').forEach(b=>{
      const selected=String(b.dataset.status)===current;
      b.classList.toggle('is-current',selected);
      b.setAttribute('aria-pressed',selected?'true':'false');
    });
  }
  function installStatusButtons(){
    const select=document.getElementById('rh-cse-status');
    if(!select) return;
    select.disabled=false;
    select.removeAttribute('disabled');
    const grid=select.closest('.rh-cse-grid');
    if(!grid) return;
    let bar=grid.querySelector('.rh-cse-status-actions');
    if(!bar){
      bar=document.createElement('div');
      bar.className='rh-cse-status-actions';
      bar.setAttribute('aria-label','Statut rapide du planning');
      bar.innerHTML=QUICK.map(([status,label])=>`<button type="button" class="rh-cse-status-action" data-status="${status}">${label}</button>`).join('');
      const firstField=select.closest('.rh-cse-field');
      if(firstField) firstField.insertAdjacentElement('afterend',bar); else grid.prepend(bar);
      bar.addEventListener('click',e=>{
        const btn=e.target.closest('.rh-cse-status-action');
        if(!btn) return;
        e.preventDefault();
        e.stopPropagation();
        select.disabled=false;
        select.value=btn.dataset.status;
        select.dispatchEvent(new Event('change',{bubbles:true}));
        refreshStatusButtons();
      });
      select.addEventListener('change',refreshStatusButtons);
    }
    refreshStatusButtons();
  }
  const originalOpen=window.openRhCockpitShiftEditor;
  if(typeof originalOpen==='function'){
    window.openRhCockpitShiftEditor=function(...args){
      const out=originalOpen.apply(this,args);
      setTimeout(installStatusButtons,0);
      return out;
    };
  }
  async function saveStatusDirect(staffId,day,status){
    const month=document.getElementById('month-selector')?.value;
    if(!month) return false;
    const [y,m]=month.split('-').map(Number);
    const date=new Date(y,m-1,Number(day),12,0,0,0);
    const horizon=typeof window.getRhPlanningHorizonEnd==='function'?window.getRhPlanningHorizonEnd():null;
    if(horizon && date.getTime()>horizon.getTime()){
      if(typeof showToast==='function') showToast('Hors période de planification');
      return false;
    }
    const settings=typeof getRhSettings==='function'?getRhSettings():{};
    if(String(settings?.planningStatus||'draft')==='locked'){
      const ok=confirm('Ce planning est verrouillé. Le repasser en BROUILLON pour le modifier ?');
      if(!ok) return false;
      if(typeof saveRhSettings==='function') saveRhSettings({...settings,planningStatus:'draft'});
    }
    const ts=typeof getTs==='function'?getTs():{};
    const sid=String(staffId);
    const staff=typeof getDir==='function'?getDir().find(s=>String(s.id)===sid):null;
    if(!ts[month]) ts[month]={};
    if(!ts[month][sid]) ts[month][sid]={};
    const d=Number(day);
    const prev=ts[month][sid][d]||ts[month][sid][String(d)]||{poste:staff?.dept||'salle',s1:'',s2:'',pause:0,obs:'',managerNote:''};
    if(String(prev?.status||'off')===String(status||'off')) return true;
    const reason=String(prompt(`Pourquoi modifiez-vous le planning de ${staff?.name||'ce collaborateur'} ?\n\nCe motif sera conservé 5 ans.`)||'').trim().slice(0,180);
    if(!reason){if(typeof showToast==='function')showToast('Modification annulée · motif obligatoire');return false;}
    const auditAt=new Date().toISOString();
    const auditBy=typeof window.rhAuditActorV94==='function'?window.rhAuditActorV94():'Direction / RH';
    const next={...prev,status:String(status),lastChangeReason:reason,lastChangeAt:auditAt,lastChangeBy:auditBy,updatedAt:auditAt};
    if(status==='present'){
      next.s1=next.s1||'10:00-14:45'; next.s2=next.s2||'18:00-22:45'; next.pause=Number(next.pause)||30;
    }else if(status==='off_soir'){
      next.s1=next.s1||'10:00-14:45'; next.s2=''; next.pause=0;
    }else if(status==='off_matin'){
      next.s1=''; next.s2=next.s2||'18:00-22:45'; next.pause=0;
    }else if(status!=='ferie'){
      next.s1=''; next.s2=''; next.pause=0;
    }
    ts[month][sid][d]=next;
    let cloud=null;
    if(typeof saveTs==='function') cloud=saveTs(ts);
    else localStorage.setItem('empire_hr_timesheets',JSON.stringify(ts));
    try{ if(typeof recordRhChange==='function') recordRhChange({
      type:'PLANNING_STATUS_EDIT',source:'DIRECTION_LEGACY',staffId:sid,staffName:String(staff?.name||''),month,day:d,
      date:`${month}-${String(d).padStart(2,'0')}`,status,reason,managerNote:String(next.managerNote||''),by:auditBy,
      before:JSON.parse(JSON.stringify(prev||{})),after:JSON.parse(JSON.stringify(next)),
      message:`Planning modifié · ${month}-${String(d).padStart(2,'0')} · ${reason}`
    }); }catch(_){ }
    try{ if(typeof loadMonthData==='function') loadMonthData(); }catch(_){ }
    try{ if(typeof renderRhCockpit==='function') renderRhCockpit(); }catch(_){ }
    try{ if(typeof loadPublicPlanning==='function') loadPublicPlanning(); }catch(_){ }
    if(typeof showToast==='function') showToast('Statut planning enregistré');
    if(cloud?.catch) cloud.catch(e=>console.warn('[iCHEF RH V91] synchro statut différée',e));
    return true;
  }
  window.rhApplyPlanningStatusV91=saveStatusDirect;
  const oldOpenQuick=window.openRhQuickStatus;
  if(typeof oldOpenQuick==='function'){
    window.openRhQuickStatus=function(event,staffId,day){
      window.__rhQuickV91={staffId:String(staffId),day:Number(day)};
      return oldOpenQuick.call(this,event,staffId,day);
    };
  }
  window.applyRhQuickStatus=async function(status){
    const c=window.__rhQuickV91;
    if(typeof window.closeRhQuickStatus==='function') window.closeRhQuickStatus();
    if(c?.staffId && c?.day) await saveStatusDirect(c.staffId,c.day,status);
  };
  document.addEventListener('click',e=>{
    if(e.target.closest('#rh-quick-status-menu')) return;
    if(!e.target.closest('.rh-status-quick-btn')) window.__rhQuickV91=null;
  });
  console.info('[iCHEF RH V91] Statuts planning réactivés');
})();


;
/* RH V264 - preserved script #18 */
window.__ICHEF_RH_BUILD__='RH-V91-PLANNING-STATUS-CONTROLS';


;
/* RH V264 - preserved script #19 */
window.__ICHEF_RH_BUILD__='RH-V92-DASHBOARD-OPERATIONNEL';
console.info('[iCHEF RH V92] Accueil opérationnel : service en direct, équilibre heures, planning jour/semaine/mois');


;
/* RH V264 - preserved script #20 */
(() => {
    function planningSettings(){
        try { return typeof getRhSettings === 'function' ? (getRhSettings() || {}) : {}; }
        catch (_) { return {}; }
    }
    function activatePlanningDraft(showNotice = true){
        const settings = planningSettings();
        const current = String(settings.planningStatus || 'draft').toLowerCase();
        if (current === 'draft') return true;
        try {
            if (typeof saveRhSettings === 'function') {
                saveRhSettings({...settings, planningStatus:'draft'});
            }
            if (typeof recordRhChange === 'function') {
                recordRhChange({
                    type:'PLANNING_EDIT_MODE',
                    source:'DIRECTION_PLANNING',
                    previousStatus:current,
                    newStatus:'draft',
                    month:document.getElementById('month-selector')?.value || ''
                });
            }
            if (showNotice && typeof showToast === 'function') {
                showToast('Mode édition activé · planning en brouillon');
            }
            return true;
        } catch (error) {
            console.warn('[iCHEF RH V93] activation brouillon', error);
            return current !== 'locked';
        }
    }
    function dateForPlanningDay(day){
        const month = document.getElementById('month-selector')?.value || '';
        const n = Number(day);
        if (!/^\d{4}-\d{2}$/.test(month) || !Number.isInteger(n) || n < 1 || n > 31) return '';
        return `${month}-${String(n).padStart(2,'0')}`;
    }
    const previousQuick = window.openRhQuickStatus;
    window.openRhQuickStatus = function(event, staffId, day){
        event?.preventDefault?.();
        event?.stopPropagation?.();
        activatePlanningDraft(true);
        try { window.closeRhQuickStatus?.(); } catch (_) {}
        const dateStr = dateForPlanningDay(day);
        if (dateStr && typeof window.openRhCockpitShiftEditor === 'function') {
            window.openRhCockpitShiftEditor(String(staffId), dateStr);
            return;
        }
        if (typeof previousQuick === 'function') {
            return previousQuick.call(this, event, staffId, day);
        }
    };
    /* Toute modification dans la vue individuelle doit aussi être possible,
       même si la période avait été publiée/verrouillée auparavant. */
    document.addEventListener('change', event => {
        const target = event.target;
        if (!target?.closest?.('#hr-interface')) return;
        if (!target.matches('.status-sel,.shift-inp,.pause-inp,.obs-inp')) return;
        activatePlanningDraft(false);
    }, true);
    /* Si une période a été clôturée, entrer dans PLANNINGS ne doit plus donner
       l'impression que l'écran entier est cassé. On la remet en brouillon pour
       le travail de planification Direction/RH. */
    const previousOpenInterface = window.openInterface;
    if (typeof previousOpenInterface === 'function') {
        window.openInterface = function(type, ...rest){
            if (type === 'hr') {
                const settings = planningSettings();
                if (String(settings.planningStatus || 'draft').toLowerCase() === 'locked') {
                    activatePlanningDraft(false);
                }
            }
            const result = previousOpenInterface.call(this, type, ...rest);
            if (type === 'hr') setTimeout(installHint, 0);
            return result;
        };
    }
    function installHint(){
        const title = document.querySelector('#hr-interface h2');
        if (!title || title.parentElement?.querySelector('.rh-v93-edit-hint')) return;
        const hint = document.createElement('span');
        hint.className = 'rh-v93-edit-hint';
        hint.textContent = 'CLIQUEZ UNE CASE POUR MODIFIER';
        title.insertAdjacentElement('afterend', hint);
    }
    document.addEventListener('DOMContentLoaded', installHint);
    setTimeout(installHint, 50);
    window.__ICHEF_RH_BUILD__ = 'RH-V93-PLANNING-MASTER-EDITABLE';
    console.info('[iCHEF RH V93] PLANNINGS : grille maître directement éditable');
})();


;
/* RH V264 - preserved script #21 */
(() => {
  const FIVE_YEARS_MS = 5 * 365.2425 * 86400000;
  const esc = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  window.rhAuditActorV94 = function(){
    try{
      const profile = JSON.parse(sessionStorage.getItem('ichef_staff_profile') || '{}');
      return String(profile?.name || sessionStorage.getItem('ichef_user_name') || sessionStorage.getItem('ichef_user_role') || window.currentDept || 'Direction / RH');
    }catch(_){ return String(sessionStorage.getItem('ichef_user_role') || window.currentDept || 'Direction / RH'); }
  };
  function planningRows(){
    let rows=[];
    try{ rows = typeof getRhChangeHistory==='function' ? getRhChangeHistory() : JSON.parse(localStorage.getItem('ichef_rh_change_history')||'[]'); }catch(_){ rows=[]; }
    const cutoff = Date.now() - FIVE_YEARS_MS;
    return (Array.isArray(rows)?rows:[]).filter(r=>{
      const type=String(r?.type||'');
      const t=Date.parse(String(r?.timestamp||r?.at||''));
      return (/^PLANNING_/i.test(type)||/^AI_PLANNING/i.test(type)) && String(r?.staffId||'').trim()!=='' && (!Number.isFinite(t)||t>=cutoff);
    }).sort((a,b)=>(Date.parse(String(b?.timestamp||b?.at||0))||0)-(Date.parse(String(a?.timestamp||a?.at||0))||0));
  }
  function statusLabel(node){
    try{ return rhStatusMeta(String(node?.status||'off')).label; }catch(_){ return String(node?.status||'—'); }
  }
  function summary(node){
    if(!node||typeof node!=='object') return '—';
    const sessions=[node.s1,node.s2].filter(Boolean).join(' / ');
    return [statusLabel(node),sessions,node.managerNote?`Note: ${node.managerNote}`:''].filter(Boolean).join(' · ');
  }
  function ensureModal(){
    let modal=document.getElementById('rh-planning-history-v94');
    if(modal) return modal;
    modal=document.createElement('div'); modal.id='rh-planning-history-v94'; modal.setAttribute('role','dialog'); modal.setAttribute('aria-modal','true');
    modal.innerHTML=`<div class="rh-ph94-card"><div class="rh-ph94-head"><div><h3>Historique du planning · 5 ans</h3><small>Avant / après · motif obligatoire · note gérant · auteur · horodatage</small></div><span class="spacer"></span><button class="print" type="button" onclick="printPlanningHistoryV94()">IMPRIMER</button><button type="button" onclick="closePlanningHistoryV94()">FERMER</button></div><div class="rh-ph94-filters"><label>Collaborateur<select id="rh-ph94-staff"></select></label><label>Du<input id="rh-ph94-from" type="date"></label><label>Au<input id="rh-ph94-to" type="date"></label><button type="button" onclick="renderPlanningHistoryV94()">ACTUALISER</button></div><div class="rh-ph94-table-wrap"><table class="rh-ph94-table"><thead><tr><th>Date / heure</th><th>Collaborateur</th><th>Journée planning</th><th>Avant</th><th>Après</th><th>Pourquoi</th><th>Note case</th><th>Auteur</th></tr></thead><tbody id="rh-ph94-body"></tbody></table></div></div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click',e=>{if(e.target===modal)window.closePlanningHistoryV94();});
    return modal;
  }
  window.openPlanningHistoryV94=function(){
    const modal=ensureModal();
    const sel=document.getElementById('rh-ph94-staff');
    const current=sel?.value||'';
    if(sel){
      const dir=typeof getDir==='function'?getDir():[];
      sel.innerHTML='<option value="">Toute l’équipe</option>'+dir.map(s=>`<option value="${esc(String(s.id))}">${esc(s.name||String(s.id))}</option>`).join('');
      if([...sel.options].some(o=>o.value===current)) sel.value=current;
    }
    const to=document.getElementById('rh-ph94-to'),from=document.getElementById('rh-ph94-from');
    const today=new Date(); const cutoff=new Date(); cutoff.setFullYear(cutoff.getFullYear()-5);
    if(to&&!to.value)to.value=today.toISOString().slice(0,10); if(from&&!from.value)from.value=cutoff.toISOString().slice(0,10);
    window.renderPlanningHistoryV94(); modal.classList.add('show');
  };
  window.closePlanningHistoryV94=()=>document.getElementById('rh-planning-history-v94')?.classList.remove('show');
  window.renderPlanningHistoryV94=function(){
    const sid=String(document.getElementById('rh-ph94-staff')?.value||'');
    const from=Date.parse(String(document.getElementById('rh-ph94-from')?.value||'')+'T00:00:00');
    const to=Date.parse(String(document.getElementById('rh-ph94-to')?.value||'')+'T23:59:59');
    const rows=planningRows().filter(r=>{
      const t=Date.parse(String(r.timestamp||r.at||''));
      return (!sid||String(r.staffId||'')===sid)&&(!Number.isFinite(from)||!Number.isFinite(t)||t>=from)&&(!Number.isFinite(to)||!Number.isFinite(t)||t<=to);
    });
    window.__rhPh94Rows=rows;
    const body=document.getElementById('rh-ph94-body'); if(!body)return;
    body.innerHTML=rows.length?rows.map(r=>{
      const at=new Date(r.timestamp||r.at||Date.now());
      const name=r.staffName||((typeof getDir==='function'?getDir():[]).find(s=>String(s.id)===String(r.staffId))?.name)||r.staffId||'—';
      const before=r.before&&typeof r.before==='object'&&!Array.isArray(r.before)?summary(r.before):'Modification groupée';
      const after=r.after&&typeof r.after==='object'&&!Array.isArray(r.after)&&('status' in r.after||'s1' in r.after||'s2' in r.after)?summary(r.after):'Planning mis à jour';
      return `<tr><td><strong>${esc(at.toLocaleDateString('fr-FR'))}</strong><small>${esc(at.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit',second:'2-digit'}))}</small></td><td>${esc(name)}</td><td>${esc(r.date||r.month||'—')}</td><td>${esc(before)}</td><td>${esc(after)}</td><td class="rh-ph94-reason">${esc(r.reason||'—')}</td><td class="rh-ph94-note">${esc(r.managerNote||r.after?.managerNote||'—')}</td><td>${esc(r.by||'Direction / RH')}</td></tr>`;
    }).join(''):`<tr><td colspan="8"><div class="rh-ph94-empty">Aucune modification de planning sur cette période.</div></td></tr>`;
  };
  function printDoc(title,body){
    const w=window.open('','_blank','noopener,noreferrer'); if(!w){alert('Autorisez les fenêtres pop-up pour imprimer.');return;}
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title>























</head><body><h1>${esc(title)}</h1><small>Imprimé le ${esc(new Date().toLocaleString('fr-FR'))}</small>${body}</body></html>`);w.document.close();setTimeout(()=>w.print(),200);
  }
  window.printPlanningHistoryV94=function(){
    if(!window.__rhPh94Rows) window.renderPlanningHistoryV94(); const rows=window.__rhPh94Rows||[];
    const dir=typeof getDir==='function'?getDir():[];
    const html=`<table><thead><tr><th>Date/heure</th><th>Collaborateur</th><th>Journée</th><th>Avant</th><th>Après</th><th>Motif</th><th>Note</th><th>Auteur</th></tr></thead><tbody>${rows.map(r=>{const at=new Date(r.timestamp||r.at||Date.now());const name=r.staffName||dir.find(s=>String(s.id)===String(r.staffId))?.name||r.staffId||'—';const before=r.before&&typeof r.before==='object'?summary(r.before):'—';const after=r.after&&typeof r.after==='object'&&('status'in r.after||'s1'in r.after)?summary(r.after):'Mise à jour groupée';return `<tr><td>${esc(at.toLocaleString('fr-FR'))}</td><td>${esc(name)}</td><td>${esc(r.date||r.month||'—')}</td><td>${esc(before)}</td><td>${esc(after)}</td><td>${esc(r.reason||'—')}</td><td>${esc(r.managerNote||r.after?.managerNote||'—')}</td><td>${esc(r.by||'Direction / RH')}</td></tr>`;}).join('')}</tbody></table>`;
    printDoc('iCHEF RH · Historique planning 5 ans',html);
  };
  window.printCurrentPlanningV94=function(){
    const month=document.getElementById('month-selector')?.value||''; if(!/^\d{4}-\d{2}$/.test(month)){alert('Sélectionnez un mois.');return;}
    const ts=typeof getTs==='function'?getTs():{}; const dir=typeof getDir==='function'?getDir().filter(s=>s.active!==false):[]; const [y,m]=month.split('-').map(Number); const days=new Date(y,m,0).getDate();
    let head='<tr><th>Collaborateur</th>'+Array.from({length:days},(_,i)=>{const d=new Date(y,m-1,i+1);const j=['D','L','M','M','J','V','S'][d.getDay()];return `<th>${j} ${String(i+1).padStart(2,'0')}</th>`;}).join('')+'</tr>';
    let body=dir.map(st=>{const sm=ts?.[month]?.[st.id]||ts?.[month]?.[String(st.id)]||{};return `<tr><th>${esc(st.name||st.id)}</th>`+Array.from({length:days},(_,i)=>{const p=sm[i+1]||sm[String(i+1)]||{status:'off'};const sessions=[p.s1,p.s2].filter(Boolean).join(' / ');return `<td><strong>${esc(statusLabel(p))}</strong>${sessions?`<br>${esc(sessions)}`:''}${p.managerNote?`<br><span class="note">${esc(p.managerNote)}</span>`:''}</td>`;}).join('')+'</tr>';}).join('');
    printDoc(`iCHEF RH · Planning ${month}`,`<table><thead>${head}</thead><tbody>${body}</tbody></table>`);
  };
  // Nettoyage local à l'ouverture : jamais plus de 5 ans, jamais moins.
  try{ if(typeof saveRhChangeHistory==='function') saveRhChangeHistory(typeof getRhChangeHistory==='function'?getRhChangeHistory():[]); }catch(_){ }
  window.__ICHEF_RH_BUILD__='RH-V95-RAPPORT-POINTEUSE-PRO';
  console.info('[iCHEF RH V94] Note case 40 caractères · motif obligatoire · historique planning 5 ans · impression');
})();


;
/* RH V264 - preserved script #22 */
(() => {
  let rhDocsSessionToken = '';
  let rhDocsSessionExpiresAt = 0;
  let rhDocsRows = [];
  const MAX_FILE_BYTES = 12 * 1024 * 1024;
  const CATEGORY_LABELS = {
    PAYSLIP:'Bulletin / fiche de salaire',
    SALARY_CERTIFICATE:'Certificat de salaire',
    TAX_DOCUMENT:'Document fiscal salarié',
    WITHHOLDING_TAX:'Impôt à la source / PAS',
    SOCIAL_STATEMENT:'Cotisations / attestation sociale',
    PAYROLL_OTHER:'Autre document paie',
    CONTRACT:'Contrat / avenant',
    ATTESTATION:'Attestation de travail',
    CERTIFICATE:'Certificat / formation',
    OTHER:'Autre document'
  };
  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function attr(v){return esc(v).replace(/`/g,'&#96;');}
  function staffFromModal(){
    try{
      const pin=String(document.getElementById('staff-edit-original-pin')?.value||'').trim();
      if(!pin || typeof getDir!=='function') return null;
      return (getDir()||[]).find(s=>String(s?.pin||'').trim()===pin)||null;
    }catch(_){return null;}
  }
  function managerPin(){try{return typeof getRhDirectionAuthPin==='function'?String(getRhDirectionAuthPin()||'').trim():'';}catch(_){return '';}}
  function currentDevice(){try{return String(window.RH_DEVICE_ID||RH_DEVICE_ID||localStorage.getItem('ichef_device_id')||'').trim();}catch(_){return String(localStorage.getItem('ichef_device_id')||'').trim();}}
  function apiBase(){try{return String(window.SERVER_URL_JS||SERVER_URL_JS||'').replace(/\/$/,'');}catch(_){return '';}}
  function ensurePanel(){
    if(document.getElementById('rh-staff-documents-v100')) return;
    const anchor=document.getElementById('staff-active')?.closest('.toggle-row');
    if(!anchor) return;
    anchor.insertAdjacentHTML('afterend', `
      <section id="rh-staff-documents-v100">
        <div class="rh-doc-v100-head">
          <div><h4>Documents professionnels du collaborateur</h4><p>Bulletins de salaire, contrat et avenants, attestations de travail, certificats et autres documents RH. L’envoi apparaît automatiquement dans le Portail Staff personnel.</p></div>
          <span class="rh-doc-v100-badge" id="rh-doc-v100-count">0 DOCUMENT</span>
        </div>
        <div class="rh-doc-v100-upload" id="rh-doc-v100-upload-box">
          <div class="input-group"><label>Type de document</label><select class="input-full" id="rh-doc-v100-category">
            <optgroup label="Paie & fiscalité salariale">
              <option value="PAYSLIP">Bulletin / fiche de salaire</option>
              <option value="SALARY_CERTIFICATE">Certificat de salaire</option>
              <option value="TAX_DOCUMENT">Document fiscal salarié</option>
              <option value="WITHHOLDING_TAX">Impôt à la source / prélèvement à la source</option>
              <option value="SOCIAL_STATEMENT">Cotisations / attestation sociale</option>
              <option value="PAYROLL_OTHER">Autre document paie</option>
            </optgroup>
            <optgroup label="Dossier RH">
              <option value="CONTRACT">Contrat / avenant</option>
              <option value="ATTESTATION">Attestation de travail</option>
              <option value="CERTIFICATE">Certificat / formation</option>
              <option value="OTHER">Autre document</option>
            </optgroup>
          </select></div>
          <div class="input-group"><label>Date du document</label><input class="input-full" id="rh-doc-v100-issued" type="date"></div>
          <div class="input-group wide"><label>Titre</label><input class="input-full" id="rh-doc-v100-title" maxlength="140" placeholder="Ex. Bulletin de salaire septembre 2026"></div>
          <div class="input-group"><label>Période / référence</label><input class="input-full" id="rh-doc-v100-period" maxlength="80" placeholder="Ex. Septembre 2026"></div>
          <div class="input-group"><label>Fichier · 12 Mo max.</label><input class="rh-doc-v100-file" id="rh-doc-v100-file" type="file" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx,.txt,application/pdf,image/png,image/jpeg,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain"></div>
          <div class="rh-doc-v100-status" id="rh-doc-v100-status"></div>
          <div class="rh-doc-v100-actions"><button class="rh-doc-v100-send" id="rh-doc-v100-send" type="button" onclick="sendRhStaffDocumentV100()">ENVOYER AU COLLABORATEUR</button></div>
        </div>
        <div class="rh-doc-v100-list" id="rh-doc-v100-list"><div class="rh-doc-v100-empty">Sélectionnez un collaborateur existant pour gérer ses documents.</div></div>
      </section>`);
    const today=new Date().toISOString().slice(0,10);
    const date=document.getElementById('rh-doc-v100-issued'); if(date&&!date.value) date.value=today;
  }
  function setStatus(text,kind=''){
    const el=document.getElementById('rh-doc-v100-status'); if(!el)return;
    el.textContent=String(text||'');
    el.style.color=kind==='ok'?'#8bd8b5':kind==='error'?'#ef9a9a':'var(--text-muted)';
  }
  async function ensureSession(force=false){
    if(!force && rhDocsSessionToken && Date.now()<rhDocsSessionExpiresAt-60000) return rhDocsSessionToken;
    const pin=managerPin();
    if(!/^\d{4,12}$/.test(pin)) throw new Error('Reconnectez-vous avec un PIN Direction / Manager pour accéder aux documents sensibles.');
    const r=await fetch(`${apiBase()}/api/rh/documents/session`,{method:'POST',credentials:'include',cache:'no-store',headers:{'Content-Type':'application/json','Accept':'application/json','X-iCHEF-Tenant':tenantID_JS,'X-iCHEF-Device':currentDevice()},body:JSON.stringify({tenantID:tenantID_JS,pin,deviceId:currentDevice()})});
    const data=await r.json().catch(()=>({}));
    if(!r.ok||!data.success||!data.accessToken) throw new Error(data.error||'Autorisation Documents RH refusée.');
    rhDocsSessionToken=String(data.accessToken); rhDocsSessionExpiresAt=Date.now()+Math.max(60000,Number(data.expiresInSeconds||7200)*1000);
    return rhDocsSessionToken;
  }
  async function docsFetch(path,options={},retry=true){
    const token=await ensureSession(false);
    const headers={...(options.headers||{}),'Accept':'application/json','X-iCHEF-Tenant':tenantID_JS,'X-iCHEF-Device':currentDevice(),'Authorization':`Bearer ${token}`};
    let r;
    const controller=new AbortController();
    const timeoutMs=String(path||'').includes('/documents/upload')?45000:18000;
    const timer=setTimeout(()=>controller.abort(),timeoutMs);
    try{
      r=await fetch(`${apiBase()}${path}`,{...options,headers,credentials:'include',cache:'no-store',signal:controller.signal});
    }catch(networkError){
      if(networkError?.name==='AbortError'){
        const e=new Error('Le serveur Documents RH met trop de temps à répondre. L’envoi a été interrompu pour éviter de rester bloqué.');
        e.cause=networkError;e.status=408;throw e;
      }
      const e=new Error('Connexion serveur Documents RH impossible. Vérifiez le déploiement et réessayez.');
      e.cause=networkError; e.status=0; throw e;
    }
    clearTimeout(timer);
    if(r.status===401 && retry){rhDocsSessionToken='';rhDocsSessionExpiresAt=0;await ensureSession(true);return docsFetch(path,options,false);}
    if(r.status===503 && retry){await new Promise(resolve=>setTimeout(resolve,850));return docsFetch(path,options,false);}
    const data=await r.json().catch(()=>({}));
    if(!r.ok||data.success===false){
      const e=new Error(data.error||`Erreur serveur Documents RH (${r.status})`);
      e.status=r.status; e.code=data.code||''; e.payload=data; throw e;
    }
    return data;
  }
  function label(category){return CATEGORY_LABELS[String(category||'OTHER').toUpperCase()]||CATEGORY_LABELS.OTHER;}
  function icon(category){
    return ({
      PAYSLIP:'PAIE',
      SALARY_CERTIFICATE:'SAL.',
      TAX_DOCUMENT:'FISC',
      WITHHOLDING_TAX:'IMP.',
      SOCIAL_STATEMENT:'SOC.',
      PAYROLL_OTHER:'PAIE',
      CONTRACT:'CTRT',
      ATTESTATION:'ATST',
      CERTIFICATE:'CERT',
      OTHER:'DOC'
    })[String(category||'OTHER').toUpperCase()]||'DOC';
  }
  function formatDate(v){if(!v)return'';const d=new Date(v);return Number.isFinite(d.getTime())?d.toLocaleDateString('fr-FR'):String(v);}
  function renderRows(){
    const list=document.getElementById('rh-doc-v100-list'); const badge=document.getElementById('rh-doc-v100-count');
    if(badge)badge.textContent=`${rhDocsRows.length} DOCUMENT${rhDocsRows.length>1?'S':''}`;
    if(!list)return;
    if(!rhDocsRows.length){list.innerHTML='<div class="rh-doc-v100-empty">Aucun document professionnel envoyé à ce collaborateur.</div>';return;}
    list.innerHTML=rhDocsRows.map(d=>{
      const meta=[label(d.category),d.period||'',formatDate(d.issuedAt||d.uploadedAt),d.sizeLabel||''].filter(Boolean).join(' · ');
      const proof=d.proofId?`<small style="color:#8bd8b5;font-weight:800">Preuve d’envoi : ${esc(d.proofId)}</small>`:'';
      return `<div class="rh-doc-v100-row"><div class="rh-doc-v100-icon">${esc(icon(d.category))}</div><div><strong>${esc(d.title||d.fileName||'Document')}</strong><small>${esc(meta)}</small><small>${esc(d.fileName||'')}</small>${proof}</div><div class="rh-doc-v100-row-actions"><button class="download" type="button" onclick="downloadRhStaffDocumentV100('${attr(d.documentId||d.id)}')">TÉLÉCHARGER</button><button class="delete" type="button" onclick="deleteRhStaffDocumentV100('${attr(d.documentId||d.id)}')">SUPPRIMER</button></div></div>`;
    }).join('');
  }
  window.loadRhStaffDocumentsV100=async function(){
    ensurePanel();
    const staff=staffFromModal();
    const send=document.getElementById('rh-doc-v100-send');
    if(!staff?.id){rhDocsRows=[];renderRows();if(send)send.disabled=true;setStatus('Enregistrez d’abord le collaborateur, puis rouvrez sa fiche pour lui envoyer des documents.');return;}
    if(send)send.disabled=false;
    setStatus('Chargement sécurisé des documents…');
    try{
      const data=await docsFetch(`/api/rh/documents/list?tenantID=${encodeURIComponent(tenantID_JS)}&staffId=${encodeURIComponent(String(staff.id))}`);
      rhDocsRows=Array.isArray(data.documents)?data.documents:[]; renderRows(); setStatus(`${rhDocsRows.length} document(s) disponible(s).`,'ok');
    }catch(e){rhDocsRows=[];renderRows();setStatus(e.message||'Impossible de charger les documents.','error');}
  };
  function fileBase64(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onerror=()=>reject(new Error('Lecture du fichier impossible.'));reader.onload=()=>resolve(String(reader.result||'').split(',').pop()||'');reader.readAsDataURL(file);});}
  window.sendRhStaffDocumentV100=async function(){
    const staff=staffFromModal(); if(!staff?.id)return alert('Enregistrez d’abord le collaborateur.');
    const file=document.getElementById('rh-doc-v100-file')?.files?.[0];
    const title=String(document.getElementById('rh-doc-v100-title')?.value||'').trim();
    const category=String(document.getElementById('rh-doc-v100-category')?.value||'OTHER').toUpperCase();
    const period=String(document.getElementById('rh-doc-v100-period')?.value||'').trim();
    const issuedAt=String(document.getElementById('rh-doc-v100-issued')?.value||'').trim();
    if(!file)return alert('Choisissez un document à envoyer.');
    if(file.size>MAX_FILE_BYTES)return alert('Le fichier dépasse 12 Mo.');
    const btn=document.getElementById('rh-doc-v100-send'); if(btn)btn.disabled=true;
    try{
      setStatus(`Envoi sécurisé de ${file.name} (${(file.size/1024/1024).toFixed(2)} Mo)…`);
      const params=new URLSearchParams({
        tenantID:String(tenantID_JS||''),staffId:String(staff.id),staffName:String(staff.name||''),
        category,title:title||file.name,period,issuedAt,filename:file.name,
        mimeType:file.type||'application/octet-stream'
      });
      let data;
      try{
        data=await docsFetch(`/api/rh/documents/upload-binary?${params.toString()}`,{method:'POST',headers:{'Content-Type':'application/octet-stream'},body:file});
      }catch(binaryError){
        if(![404,405].includes(Number(binaryError?.status||0))) throw binaryError;
        setStatus('Compatibilité serveur : envoi sécurisé classique…');
        const base64=await fileBase64(file);
        data=await docsFetch('/api/rh/documents/upload',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tenantID:tenantID_JS,staffId:String(staff.id),staffName:String(staff.name||''),category,title:title||file.name,period,issuedAt,filename:file.name,mimeType:file.type||'application/octet-stream',base64})});
      }
      if(data.document){
        if(data.proof?.proofId&&!data.document.proofId)data.document.proofId=data.proof.proofId;
        rhDocsRows=[data.document,...rhDocsRows.filter(d=>String(d.documentId||d.id)!==String(data.document.documentId||data.document.id))];
      }
      renderRows();
      document.getElementById('rh-doc-v100-title').value=''; document.getElementById('rh-doc-v100-period').value=''; document.getElementById('rh-doc-v100-file').value='';
      const proofId=String(data?.proof?.proofId||data?.document?.proofId||'').trim();
      const proofText=proofId?` · PREUVE ${proofId}`:'';
      setStatus(`✓ Document enregistré pour ${staff.name||'ce collaborateur'}${proofText}. Disponible dans son Portail Staff.`,'ok');
      try{
        recordRhChange?.({
          staffId:String(staff.id),
          staffName:String(staff.name||''),
          type:'DOCUMENT_SENT',
          category:'DOCUMENT',
          documentId:String(data?.document?.documentId||data?.document?.id||''),
          proofId,
          documentCategory:category,
          title:title||file.name,
          fileName:file.name,
          period,
          issuedAt,
          message:`Document envoyé · ${title||file.name}${proofId?` · preuve ${proofId}`:''}`
        });
      }catch(_){}
      try{showToast(proofId?`Document envoyé · ${proofId}`:'Document envoyé au collaborateur');}catch(_){ }
    }catch(e){
      console.error('[iCHEF RH Documents upload]',e);
      const detail=e?.status?` (HTTP ${e.status}${e.code?` · ${e.code}`:''})`:'';
      const msg=(e?.message||'Envoi impossible.')+detail;
      setStatus(msg,'error');alert(msg);
    }finally{if(btn)btn.disabled=false;}
  };
  window.downloadRhStaffDocumentV100=function(id){
    const doc=rhDocsRows.find(d=>String(d.documentId||d.id)===String(id)); if(!doc?.downloadUrl)return alert('Lien de téléchargement indisponible. Actualisez la fiche.');
    window.open(String(doc.downloadUrl),'_blank','noopener,noreferrer');
  };
  window.deleteRhStaffDocumentV100=async function(id){
    const doc=rhDocsRows.find(d=>String(d.documentId||d.id)===String(id)); if(!doc)return;
    const reason=prompt(`Motif de suppression de « ${doc.title||doc.fileName||'ce document'} » (obligatoire) :`,'Document remplacé / erreur de fichier');
    if(reason===null)return; if(String(reason).trim().length<5)return alert('Indiquez un motif de suppression (5 caractères minimum).');
    try{
      await docsFetch('/api/rh/documents/delete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tenantID:tenantID_JS,documentId:String(id),reason:String(reason).trim()})});
      try{
        const staff=staffFromModal();
        recordRhChange?.({
          staffId:String(staff?.id||''),
          staffName:String(staff?.name||''),
          type:'DOCUMENT_DELETED',
          category:'DOCUMENT',
          documentId:String(id),
          title:String(doc?.title||doc?.fileName||'Document'),
          fileName:String(doc?.fileName||''),
          reason:String(reason).trim(),
          proofId:String(doc?.proofId||''),
          message:`Document supprimé · ${doc?.title||doc?.fileName||'Document'} · ${String(reason).trim()}`
        });
      }catch(_){}
      rhDocsRows=rhDocsRows.filter(d=>String(d.documentId||d.id)!==String(id));renderRows();setStatus('Document supprimé du coffre-fort du collaborateur.','ok');
    }catch(e){setStatus(e.message||'Suppression impossible.','error');alert(e.message||'Suppression impossible.');}
  };
  function install(){
    ensurePanel();
    if(typeof window.openStaffModal==='function' && !window.openStaffModal.__rhDocsV100){
      const original=window.openStaffModal;
      const wrapped=function(...args){const out=original.apply(this,args);setTimeout(()=>window.loadRhStaffDocumentsV100?.(),80);return out;};
      wrapped.__rhDocsV100=true; window.openStaffModal=wrapped;
    }
  }
  document.addEventListener('DOMContentLoaded',install); setTimeout(install,120);
  window.__ICHEF_RH_BUILD__='RH-V106-DOCUMENTS-FAST-PROOF-SECURE';
  console.info('[iCHEF RH V106] Documents collaborateurs : envoi rapide hors file planning + preuve immédiate + timeout + sécurité conservée');
})();


;
/* RH V264 - preserved script #23 */
(() => {
  const RH_V102_URGENT_HOURS=5;
  let planningToken='';
  let planningTokenExpires=0;
  let autoTakeoverRunning=false;
  function currentDevice(){try{return String(window.RH_DEVICE_ID||RH_DEVICE_ID||localStorage.getItem('ichef_device_id')||'').trim();}catch(_){return String(localStorage.getItem('ichef_device_id')||'').trim();}}
  function apiBase(){try{return String(window.SERVER_URL_JS||SERVER_URL_JS||'').replace(/\/$/,'');}catch(_){return '';}}
  function managerPin(){try{return typeof getRhDirectionAuthPin==='function'?String(getRhDirectionAuthPin()||'').trim():'';}catch(_){return '';}}
  function actor(){try{return typeof window.rhAuditActorV94==='function'?window.rhAuditActorV94():'Direction / RH';}catch(_){return 'Direction / RH';}}
  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  async function ensurePlanningSession(force=false){
    if(!force&&planningToken&&Date.now()<planningTokenExpires-60000)return planningToken;
    const pin=managerPin();
    if(!/^\d{4,12}$/.test(pin))throw new Error('Reconnectez-vous avec un PIN Direction / Manager pour enregistrer le planning.');
    const r=await fetch(`${apiBase()}/api/rh/planning/session`,{method:'POST',credentials:'include',cache:'no-store',headers:{'Content-Type':'application/json','Accept':'application/json','X-iCHEF-Tenant':tenantID_JS,'X-iCHEF-Device':currentDevice()},body:JSON.stringify({tenantID:tenantID_JS,pin,deviceId:currentDevice()})});
    const data=await r.json().catch(()=>({}));
    if(!r.ok||!data.success||!data.accessToken)throw new Error(data.error||'Session Planning RH refusée.');
    planningToken=String(data.accessToken);planningTokenExpires=Date.now()+Math.max(60000,Number(data.expiresInSeconds||7200)*1000);return planningToken;
  }
  async function securePlanningSave(snapshot,options={},retry=true){
    const token=await ensurePlanningSession(false);
    const r=await fetch(`${apiBase()}/api/rh/planning/save`,{method:'POST',credentials:'include',cache:'no-store',headers:{'Content-Type':'application/json','Accept':'application/json','X-iCHEF-Tenant':tenantID_JS,'X-iCHEF-Device':currentDevice(),'Authorization':`Bearer ${token}`},body:JSON.stringify({tenantID:tenantID_JS,timesheets:snapshot,source:String(options.source||'DIRECTION_PLANNING'),reason:String(options.reason||''),aiTakeover:options.aiTakeover===true,settings:typeof getRhSettings==='function'?getRhSettings():{}})});
    const data=await r.json().catch(()=>({}));
    if(r.status===401&&retry){planningToken='';planningTokenExpires=0;await ensurePlanningSession(true);return securePlanningSave(snapshot,options,false);}
    if(!r.ok||data.success===false){const e=new Error(data.error||`Erreur planning (${r.status})`);e.code=data.code||'';e.payload=data;throw e;}
    return data;
  }
  // Remplace la sauvegarde générique par la route Planning RH signée.
  // Le snapshot local reste immédiat pour que l'interface ne bloque jamais.
  try{
    const legacySave=saveTs;
    saveTs=function(ts,options={}){
      if(window.ICHEF_PLANNING_PREMIUM_ONLY){
        console.warn('[RH V258] sauvegarde planning ancien refusée : ouvrir Planning Premium');
        try{if(typeof showToast==='function')showToast('Planning officiel : modifications uniquement dans Planning Premium.');}catch(_){}
        try{window.iChefRhPremiumRefreshV258?.(true);}catch(_){}
        return Promise.resolve(false);
      }
      let snapshot;try{snapshot=JSON.parse(JSON.stringify(ts||{}));}catch(_){snapshot=ts||{};}
      localStorage.setItem('empire_hr_timesheets',JSON.stringify(snapshot));
      try{
        window.iChefPlanningMasterSyncV217?.({
          source:String(options.source||'DIRECTION_PLANNING'),
          snapshot,
          local:true
        });
      }catch(_){}
      try{rhPlanningLocalSignature=typeof rhPlanningSignature==='function'?rhPlanningSignature(snapshot):JSON.stringify(snapshot);rhPlanningPendingUntil=Date.now()+15000;}catch(_){ }
      const run=async()=>{
        try{
          const data=await securePlanningSave(snapshot,options);
          if(data?.timesheets&&typeof data.timesheets==='object'){
            localStorage.setItem('empire_hr_timesheets',JSON.stringify(data.timesheets));
            try{
              window.iChefPlanningMasterSyncV217?.({
                source:`${String(options.source||'DIRECTION_PLANNING')}:server-ack`,
                snapshot:data.timesheets,
                serverAck:true
              });
            }catch(_){}
            try{rhPlanningLocalSignature=typeof rhPlanningSignature==='function'?rhPlanningSignature(data.timesheets):JSON.stringify(data.timesheets);rhPlanningPendingUntil=0;}catch(_){ }
          }
          return true;
        }catch(error){
          try{rhPlanningPendingUntil=Math.max(rhPlanningPendingUntil||0,Date.now()+60000);}catch(_){ }
          console.warn('[iCHEF RH V102] synchronisation planning sécurisée différée',error);
          if(typeof showToast==='function')showToast(error?.code==='PLANNING_REASON_REQUIRED_5H'?'Motif obligatoire à moins de 5 h du service':'Planning conservé · synchronisation en attente');
          return false;
        }
      };
      try{rhPlanningSaveChain=rhPlanningSaveChain.catch(()=>true).then(run);return rhPlanningSaveChain;}catch(_){window.__rhV102SaveChain=(window.__rhV102SaveChain||Promise.resolve(true)).catch(()=>true).then(run);return window.__rhV102SaveChain;}
    };
    saveTs.__rhV102Secure=true;
    window.__rhLegacySaveTsV101=legacySave;
  }catch(error){console.error('[iCHEF RH V102] installation saveTs',error);}
  function firstStart(plan){
    const p=plan&&typeof plan==='object'?plan:{};
    const starts=[p.s1,p.s2].map(v=>String(v||'').match(/^(\d{1,2}:\d{2})/i)?.[1]||'').filter(Boolean).sort();
    if(starts.length)return starts[0];
    const s=typeof getRhSettings==='function'?getRhSettings():{};
    const st=String(p.status||'').toLowerCase();
    if(st==='off_matin')return String(s.dinnerWorkStart||s.dinnerStart||'18:00');
    if(['present','off_soir','ferie'].includes(st))return String(s.lunchWorkStart||s.lunchStart||'10:00');
    return '';
  }
  function changeWindow(dateStr,before,after){
    const start=firstStart(after)||firstStart(before);
    if(!start){const d=new Date(`${dateStr}T12:00:00`);return d.getTime()<=Date.now()?{needsReason:true,kind:'STARTED_OR_PAST',start:'',hours:null}:{needsReason:false,kind:'NORMAL',start:'',hours:null};}
    const dt=new Date(`${dateStr}T${start}:00`);const h=(dt.getTime()-Date.now())/3600000;
    if(h<=0)return{needsReason:true,kind:'STARTED_OR_PAST',start,hours:h};
    if(h<=RH_V102_URGENT_HOURS)return{needsReason:true,kind:'URGENT_5H',start,hours:h};
    return{needsReason:false,kind:'NORMAL',start,hours:h};
  }
  window.rhPlanningChangeWindowV102=changeWindow;
  function editorPlanFromDom(base={}){
    const status=String(document.getElementById('rh-cse-status')?.value||base.status||'off');
    let s1=String(document.getElementById('rh-cse-s1')?.value||'').trim();
    let s2=String(document.getElementById('rh-cse-s2')?.value||'').trim();
    let pause=Math.max(0,Math.min(240,Number(document.getElementById('rh-cse-pause')?.value)||0));
    const work=new Set(['present','off_matin','off_soir','ferie']);
    if(!work.has(status)){s1='';s2='';pause=0;}if(status==='off_soir')s2='';if(status==='off_matin')s1='';
    return{...base,status,poste:String(document.getElementById('rh-cse-poste')?.value||base.poste||'salle'),s1,s2,pause,obs:String(document.getElementById('rh-cse-obs')?.value||'').trim().slice(0,500),managerNote:String(document.getElementById('rh-cse-manager-note')?.value||'').trim().slice(0,40)};
  }
  function updateEditorReasonPolicy(){
    const ctx=window.__rhV102Editor;if(!ctx)return;
    const ts=typeof getTs==='function'?getTs():{};const [y,m,d]=ctx.dateStr.split('-').map(Number);const month=`${y}-${String(m).padStart(2,'0')}`;
    const before=ts?.[month]?.[ctx.staffId]?.[d]||ts?.[month]?.[ctx.staffId]?.[String(d)]||{};
    const after=editorPlanFromDom(before);const w=changeWindow(ctx.dateStr,before,after);
    const field=document.querySelector('#rh-cockpit-shift-editor .rh-cse-reason-field');const input=document.getElementById('rh-cse-change-reason');
    let note=document.getElementById('rh-v102-window-note');
    if(!note){note=document.createElement('div');note.id='rh-v102-window-note';note.className='rh-v102-window-note';document.querySelector('#rh-cockpit-shift-editor .rh-cse-body')?.prepend(note);}
    if(w.needsReason){if(field)field.style.display='flex';if(input)input.required=true;note.className='rh-v102-window-note '+(w.kind==='URGENT_5H'?'urgent':'started');note.innerHTML=w.kind==='URGENT_5H'?`<strong>MODIFICATION URGENTE</strong> · service dans moins de 5 h${w.start?` (${esc(w.start)})`:''}. Le motif est obligatoire et le collaborateur recevra la modification avec « Vu ».`:`<strong>SERVICE DÉJÀ COMMENCÉ / DATE PASSÉE</strong> · le motif est obligatoire. Les pointages réels ne seront jamais modifiés.`;}
    else{if(field)field.style.display='none';if(input){input.required=false;input.value='';}note.className='rh-v102-window-note';note.innerHTML='<strong>MODIFICATION NORMALE</strong> · plus de 5 h avant le service : aucun motif n’est demandé. L’ancienne version reste archivée.';}
  }
  const previousOpen=window.openRhCockpitShiftEditor;
  if(typeof previousOpen==='function')window.openRhCockpitShiftEditor=function(staffId,dateStr){window.__rhV102Editor={staffId:String(staffId),dateStr:String(dateStr)};const out=previousOpen.apply(this,arguments);setTimeout(()=>{updateEditorReasonPolicy();['rh-cse-status','rh-cse-s1','rh-cse-s2'].forEach(id=>document.getElementById(id)?.addEventListener('input',updateEditorReasonPolicy));},0);return out;};
  const previousClose=window.closeRhCockpitShiftEditor;
  if(typeof previousClose==='function')window.closeRhCockpitShiftEditor=function(){window.__rhV102Editor=null;return previousClose.apply(this,arguments);};
  window.saveRhCockpitShiftEditor=async function(){
    const ctx=window.__rhV102Editor;if(!ctx)return;
    const [y,m,d]=ctx.dateStr.split('-').map(Number);const month=`${y}-${String(m).padStart(2,'0')}`;const sid=String(ctx.staffId);
    const ts=typeof getTs==='function'?getTs():{};if(!ts[month])ts[month]={};if(!ts[month][sid])ts[month][sid]={};
    const staff=typeof getDir==='function'?getDir().find(s=>String(s.id)===sid):null;
    const previous=ts[month][sid][d]||ts[month][sid][String(d)]||{};const before=JSON.parse(JSON.stringify(previous||{}));const candidate=editorPlanFromDom(previous);
    const comparable=n=>JSON.stringify({status:String(n?.status||'off'),poste:String(n?.poste||''),s1:String(n?.s1||''),s2:String(n?.s2||''),pause:Number(n?.pause||0),obs:String(n?.obs||''),managerNote:String(n?.managerNote||'')});
    if(comparable(before)===comparable(candidate)){window.closeRhCockpitShiftEditor();if(typeof showToast==='function')showToast('Aucune modification');return;}
    const shiftPattern=/^\d{1,2}:\d{2}-\d{1,2}:\d{2}$/;if(candidate.s1&&!shiftPattern.test(candidate.s1)){alert('Horaire matin invalide. Exemple : 10:00-14:45');return;}if(candidate.s2&&!shiftPattern.test(candidate.s2)){alert('Horaire soir invalide. Exemple : 18:00-22:45');return;}
    const w=changeWindow(ctx.dateStr,before,candidate);let reason=String(document.getElementById('rh-cse-change-reason')?.value||'').trim().slice(0,180);
    if(w.needsReason&&!reason){alert('Motif obligatoire : la modification intervient à 5 h ou moins du service, ou après son démarrage.');document.getElementById('rh-cse-change-reason')?.focus();return;}
    if(!w.needsReason)reason='';
    const auditAt=new Date().toISOString(),auditBy=actor();
    ts[month][sid][d]={...candidate,lastChangeReason:reason,lastChangeAt:auditAt,lastChangeBy:auditBy,planningChangeKind:w.kind,planningUrgent:w.kind==='URGENT_5H',updatedAt:auditAt};
    if(typeof recordRhChange==='function')recordRhChange({type:'PLANNING_MANUAL_EDIT',source:'DIRECTION_PLANNING',staffId:sid,staffName:String(staff?.name||''),date:ctx.dateStr,month,day:d,reason,changeKind:w.kind,managerNote:String(candidate.managerNote||''),by:auditBy,before,after:JSON.parse(JSON.stringify(ts[month][sid][d])),message:reason?`Planning modifié · ${ctx.dateStr} · ${reason}`:`Planning modifié · ${ctx.dateStr} · version précédente archivée`});
    const btn=document.querySelector('#rh-cockpit-shift-editor .rh-cse-save');if(btn){btn.disabled=true;btn.textContent='ENREGISTREMENT…';}
    const ok=await saveTs(ts,{source:'DIRECTION_PLANNING',reason,staffId:sid,date:ctx.dateStr});
    try{loadMonthData?.();loadPublicPlanning?.();broadcastStaffingLevels?.();renderRhCockpit?.();}catch(_){ }
    if(ok){window.closeRhCockpitShiftEditor();if(typeof showToast==='function')showToast(w.needsReason?'Modification urgente envoyée au collaborateur':'Planning enregistré · ancienne version archivée');}
    else if(btn){btn.disabled=false;btn.textContent='ENREGISTRER';}
  };
  // Vue individuelle : aucun prompt au-delà de 5 h, motif obligatoire dans la fenêtre sensible.
  if(typeof updateData==='function'){
    window.updateData=updateData=async function(staffId,day,key,val){
      const settings=typeof getRhSettings==='function'?getRhSettings():{};if(String(settings.planningStatus||'draft')==='locked'){alert('Ce planning est clôturé / verrouillé. Passez-le en Brouillon pour le modifier.');loadMonthData?.();return;}
      const month=document.getElementById('month-selector')?.value||'';const sid=String(staffId);const ts=getTs();const staff=getDir().find(s=>String(s.id)===sid);if(!ts[month])ts[month]={};if(!ts[month][sid])ts[month][sid]={};if(!ts[month][sid][day])ts[month][sid][day]={status:'off',poste:staff?.dept||'salle',s1:'',s2:'',pause:0,obs:'',managerNote:''};
      const before=JSON.parse(JSON.stringify(ts[month][sid][day]||{}));if(String(before?.[key]??'')===String(val??'')){loadMonthData?.();return;}
      const candidate={...before,[key]:val};if(key==='status'){const work=new Set(['present','off_matin','off_soir','ferie']);if(!work.has(val)){candidate.s1='';candidate.s2='';candidate.pause=0;}else if(val==='present'){candidate.s1=candidate.s1||'10:00-14:45';candidate.s2=candidate.s2||'18:00-22:45';candidate.pause=Number(candidate.pause)||30;}else if(val==='off_soir'){candidate.s1=candidate.s1||'10:00-14:45';candidate.s2='';candidate.pause=0;}else if(val==='off_matin'){candidate.s1='';candidate.s2=candidate.s2||'18:00-22:45';candidate.pause=0;}}
      const dateStr=`${month}-${String(day).padStart(2,'0')}`;const w=changeWindow(dateStr,before,candidate);let reason='';if(w.needsReason){reason=String(prompt(`Modification à 5 h ou moins du service / service commencé.\nPourquoi modifiez-vous le planning de ${staff?.name||'ce collaborateur'} ?`)||'').trim().slice(0,180);if(!reason){loadMonthData?.();return;}}
      const auditAt=new Date().toISOString(),auditBy=actor();ts[month][sid][day]={...candidate,lastChangeReason:reason,lastChangeAt:auditAt,lastChangeBy:auditBy,planningChangeKind:w.kind,planningUrgent:w.kind==='URGENT_5H',updatedAt:auditAt};
      recordRhChange?.({type:'PLANNING_MANUAL_EDIT',source:'DIRECTION_INDIVIDUAL',staffId:sid,staffName:String(staff?.name||''),date:dateStr,month,day:Number(day),reason,changeKind:w.kind,by:auditBy,before,after:JSON.parse(JSON.stringify(ts[month][sid][day])),message:reason?`Planning modifié · ${dateStr} · ${reason}`:`Planning modifié · ${dateStr} · version précédente archivée`});
      const ok=await saveTs(ts,{source:'DIRECTION_INDIVIDUAL',reason,staffId:sid,date:dateStr});loadMonthData?.();loadPublicPlanning?.();broadcastStaffingLevels?.();if(!ok)console.warn('[iCHEF RH V102] modification en attente de synchronisation');
    };
  }
  // Application IA : motif non demandé en planification normale. En relève automatique,
  // la cause système est enregistrée et la publication ne demande aucune validation.
  window.applyAutomaticPlanning=async function(options={}){
    if(
      Array.isArray(planningAssistantDraft?.criticalIssues) &&
      planningAssistantDraft.criticalIssues.length
    ){
      const first=planningAssistantDraft.criticalIssues[0];
      alert(
        'PLANNING BLOQUÉ\n\n' +
        (first?.message || 'Un service est ouvert sans couverture cuisine qualifiée.') +
        '\n\nCorrigez la couverture cuisine ou fermez le service concerné avant validation.'
      );
      return false;
    }
    const auto=options===true||options?.auto===true;
    if(!planningAssistantDraft){if(auto){planningAssistantDraft=buildAutomaticPlanningDraft();renderAutomaticPlanningDraft(planningAssistantDraft);}else{alert('Générez d’abord une proposition de planning.');return false;}}
    const settings=getRhSettings();if(settings.planningStatus==='locked'){if(!auto)alert('Le planning est clôturé / verrouillé.');return false;}
    const month=getPlanningAssistantMonth();if(planningAssistantDraft.month!==month){if(auto){planningAssistantDraft=buildAutomaticPlanningDraft();}else{alert('Le mois affiché a changé. Régénérez la proposition.');return false;}}
    if(!auto&&!confirm(`Appliquer la proposition iCHEF pour ${monthLabelFr(month)} ?\n\nLes anciennes versions resteront archivées.`))return false;
    const ts=getTs();if(!ts[month])ts[month]={};const beforeByStaff={};let urgent=false;
    for(const [staffId,days] of Object.entries(planningAssistantDraft.proposal||{})){if(!ts[month][staffId])ts[month][staffId]={};beforeByStaff[staffId]=JSON.parse(JSON.stringify(ts[month][staffId]||{}));for(const [day,plan] of Object.entries(days||{})){const previous=ts[month][staffId][day]||{};const candidate={status:plan.status||'off',poste:plan.poste||'salle',s1:plan.s1||'',s2:plan.s2||'',pause:Number(plan.pause||0),obs:String(plan.obs||''),managerNote:String(plan.managerNote||'').slice(0,40)};const w=changeWindow(`${month}-${String(day).padStart(2,'0')}`,previous,candidate);if(w.needsReason)urgent=true;ts[month][staffId][day]=candidate;}}
    const reason=auto?String(options?.reason||'Relève automatique iCHEF IA — échéance de planification dépassée').slice(0,180):(urgent?'Application iCHEF IA dans la fenêtre urgente de 5 h':'');const auditAt=new Date().toISOString(),auditBy=auto?'iCHEF IA Autopilot':actor();
    for(const [staffId,days] of Object.entries(planningAssistantDraft.proposal||{})){for(const day of Object.keys(days||{})){const dateStr=`${month}-${String(day).padStart(2,'0')}`;const previous=beforeByStaff[staffId]?.[day]||{};const current=ts[month][staffId][day];const w=changeWindow(dateStr,previous,current);ts[month][staffId][day]={...current,lastChangeReason:w.needsReason||auto?reason:'',lastChangeAt:auditAt,lastChangeBy:auditBy,planningChangeKind:auto?'AI_TAKEOVER':w.kind,planningUrgent:w.kind==='URGENT_5H',updatedAt:auditAt};}}
    const ok=await saveTs(ts,{source:auto?'AI_TAKEOVER':'ASSISTANCE_PLANNING',reason,aiTakeover:auto});
    for(const staffId of Object.keys(planningAssistantDraft.proposal||{})){const s=getDir().find(x=>String(x.id)===String(staffId));recordRhChange?.({type:auto?'AI_PLANNING_TAKEOVER':'PLANNING_AI_APPLIED',month,source:auto?'AI_TAKEOVER':'ASSISTANCE_PLANNING',staffId:String(staffId),staffName:String(s?.name||''),reason,by:auditBy,before:beforeByStaff[staffId]||{},after:JSON.parse(JSON.stringify(ts[month][staffId]||{})),message:auto?`Relève IA automatique · planning publié · ${month}`:`Planning IA appliqué · ${month}`});}
    if(auto&&ok){saveRhSettings({...getRhSettings(),planningStatus:'published'});localStorage.setItem(`ichef_ai_takeover_${tenantID_JS}_${month}`,new Date().toISOString());}
    loadMonthData?.();refreshViews?.();loadPublicPlanning?.();broadcastStaffingLevels?.();renderPlanningAssistantLocal?.();if(typeof showToast==='function')showToast(ok?(auto?'iCHEF IA a pris la relève et publié le planning':'Planning IA appliqué'):'Planning conservé · synchronisation en attente');return ok;
  };
  function planExistsFor(staffId,date){const month=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`;const day=date.getDate();const p=getTs()?.[month]?.[String(staffId)]?.[day]||getTs()?.[month]?.[String(staffId)]?.[String(day)];return !!(p&&typeof p==='object'&&Object.keys(p).length);}
  function serviceStartFor(date,settings){const time=String(settings.lunchStart||'10:00');return new Date(`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}T${time}:00`);}
  async function checkAiTakeover(){
    if(window.ICHEF_PLANNING_PREMIUM_ONLY)return; // Aucune publication IA autonome hors Premium.
    if(autoTakeoverRunning)return;const s=getRhSettings();if(s.planningAutopilotEnabled===false||String(s.planningStatus||'draft')==='locked')return;const staff=(getDir?.()||[]).filter(x=>x.active!==false);if(!staff.length)return;const now=new Date(),hours=Math.max(6,Math.min(168,Number(s.planningTakeoverHours)||48));let target=null;
    for(let i=0;i<=7;i++){const d=new Date(now.getFullYear(),now.getMonth(),now.getDate()+i,12,0,0,0);const start=serviceStartFor(d,s);const delta=(start.getTime()-Date.now())/3600000;if(delta<0||delta>hours)continue;const ready=staff.every(emp=>planExistsFor(emp.id,d));if(!ready||String(s.planningStatus||'draft')!=='published'){target=d;break;}}
    if(!target)return;const month=`${target.getFullYear()}-${String(target.getMonth()+1).padStart(2,'0')}`;const throttleKey=`ichef_ai_takeover_attempt_${tenantID_JS}_${month}`;const last=Date.parse(localStorage.getItem(throttleKey)||'');if(Number.isFinite(last)&&Date.now()-last<15*60*1000)return;localStorage.setItem(throttleKey,new Date().toISOString());autoTakeoverRunning=true;
    try{const selector=document.getElementById('month-selector');if(selector){selector.value=month;try{enforceRhPlanningMonthHorizon?.(false);}catch(_){}}await generateAutomaticPlanning();await window.applyAutomaticPlanning({auto:true});}catch(error){console.error('[iCHEF RH V102] relève IA automatique',error);if(typeof showToast==='function')showToast('Relève IA à reprendre · données ou connexion insuffisantes');}finally{autoTakeoverRunning=false;}
  }
  document.addEventListener('DOMContentLoaded',()=>{setTimeout(checkAiTakeover,8000);setInterval(checkAiTakeover,5*60*1000);});
  window.addEventListener('focus',()=>setTimeout(checkAiTakeover,1200));
  window.__ICHEF_RH_BUILD__='RH-V106-DOCUMENTS-FAST-PROOF-SECURE';
  console.info('[iCHEF RH V102] >5h sans motif · <=5h motif obligatoire · versions originales · relève IA autonome');
})();


;
/* RH V264 - preserved script #24 */
(() => {
  const BUILD='RH-V106-DOCUMENTS-FAST-PROOF-SECURE';
  let monthlyPlannerRunning=false;
  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function ensureModals(){
    if(!document.getElementById('rh-ai-settings-v103')){
      document.body.insertAdjacentHTML('beforeend',`<div class="modal" id="rh-ai-settings-v103"><div class="modal-content" style="width:min(920px,96vw);max-height:92vh;overflow:auto"><div class="modal-header"><div><h3>RÉGLAGES IA RH</h3><div style="color:var(--text-muted);font-size:.68rem;margin-top:4px">Paramètres propres à l’établissement · utilisés avant la mise en route et pour chaque mise à jour du planning.</div></div><button class="btn-outline" style="border:none" onclick="closeRhPlanningSettingsV103()">FERMER</button></div><div class="rh-v103-emphasis"><strong>PLANNING MENSUEL.</strong> iCHEF prépare un mois complet, conserve les congés validés, garantit les jours OFF configurés et ne réorganise ensuite que ce qui devient nécessaire.</div><div class="rh-v103-config-grid"><section class="rh-v103-config-section"><h4>Autonomie & échéances</h4><div class="input-group"><label>Mode IA</label><select class="input-full" id="v103-mode"><option value="autonomous">Autonome · publie selon les règles</option><option value="semi">Semi-automatique · prépare, responsable publie</option><option value="assisted">Assisté · analyse uniquement</option></select></div><div class="grid-2"><div class="input-group"><label>Préparer le mois suivant · J-</label><input class="input-full" id="v103-month-lead" type="number" min="1" max="31"></div><div class="input-group"><label>Relève si planning incomplet · heures</label><input class="input-full" id="v103-takeover-hours" type="number" min="6" max="168"></div></div><label class="rh-v103-toggle"><input id="v103-autopilot" type="checkbox"><span><strong>Relève IA automatique</strong><small>Si l’échéance client est dépassée, l’IA publie sans attendre une validation.</small></span></label></section><section class="rh-v103-config-section"><h4>Repos, OFF, congés & récupération</h4><div class="grid-2"><div class="input-group"><label>Jours OFF / 7 jours</label><select class="input-full" id="v103-off-days"><option value="0.5">0.5</option><option value="1">1</option><option value="1.5">1.5</option><option value="2">2</option><option value="2.5">2.5</option><option value="3">3</option><option value="3.5">3.5</option><option value="4">4</option><option value="4.5">4.5</option><option value="5">5</option><option value="5.5">5.5</option><option value="6">6</option><option value="6.5">6.5</option><option value="7">7</option></select></div><div class="input-group"><label>Récup. auto · max jours/mois</label><input class="input-full" id="v103-recovery-max" type="number" min="0" max="6" step="1"></div></div><div class="input-group"><label>Jours protégés · pas de nouvelle demande OFF / vacances / récupération</label><div class="rh-v104-weekdays"><label><input type="checkbox" data-v104-protected-day="1">Lun</label><label><input type="checkbox" data-v104-protected-day="2">Mar</label><label><input type="checkbox" data-v104-protected-day="3">Mer</label><label><input type="checkbox" data-v104-protected-day="4">Jeu</label><label><input type="checkbox" data-v104-protected-day="5">Ven</label><label><input type="checkbox" data-v104-protected-day="6">Sam</label><label><input type="checkbox" data-v104-protected-day="0">Dim</label></div><div class="rh-v103-config-note">Ces jours bloquent les nouvelles demandes planifiables. Maladie, accident et absences obligatoires restent possibles. Un congé déjà validé n’est jamais annulé.</div></div><label class="rh-v103-toggle"><input id="v104-block-protected" type="checkbox"><span><strong>Bloquer les nouvelles demandes sur ces jours</strong><small>OFF, vacances et récupération sont refusés depuis le Portail Staff sur les jours sélectionnés.</small></span></label><label class="rh-v103-toggle"><input id="v103-consecutive-off" type="checkbox"><span><strong>Privilégier les OFF consécutifs</strong><small>Évite de disperser inutilement les jours de repos.</small></span></label><label class="rh-v103-toggle"><input id="v103-auto-recovery" type="checkbox"><span><strong>Placer la récupération disponible</strong><small>Uniquement quand la banque permet un jour complet et de préférence sur les jours calmes.</small></span></label><label class="rh-v103-toggle"><input id="v104-protect-peaks" type="checkbox"><span><strong>Protéger automatiquement les gros pics d’affluence</strong><small>L’IA évite OFF, récupération et nouvelles vacances sur les journées les plus chargées, selon réservations, historique, événements et Anti-Rush.</small></span></label><div class="grid-2"><div class="input-group"><label>Jours de pic protégés / mois</label><select class="input-full" id="v104-peak-count"><option value="4">4</option><option value="6">6</option><option value="8">8</option><option value="10">10</option><option value="12">12</option></select></div><div class="input-group"><label>Seuil réservations · couverts</label><input class="input-full" id="v104-peak-covers" type="number" min="0" max="1000" step="1"></div></div><label class="rh-v103-toggle"><input type="checkbox" checked disabled><span><strong>Congés payés : demandes validées uniquement</strong><small>L’IA ne crée jamais seule des vacances payées. Une demande acceptée devient une contrainte protégée.</small></span></label></section><section class="rh-v103-config-section"><h4>Activité & coûts</h4><div class="grid-2"><div class="input-group"><label>Priorité</label><select class="input-full" id="v103-priority"><option value="balanced">Équilibre qualité / coût</option><option value="quality">Qualité prioritaire</option><option value="coverage">Couverture maximale</option><option value="cost">Coût RH maîtrisé</option></select></div><div class="input-group"><label>Budget main-d’œuvre (% CA)</label><input class="input-full" id="v103-budget" type="number" min="0" max="100" step=".5"></div></div><div class="input-group"><label>Niveau de service</label><select class="input-full" id="v103-service-level"><option value="standard">Standard</option><option value="reinforced">Renforcé</option><option value="premium">Premium</option><option value="excellence">Excellence</option></select></div><div class="grid-2"><div class="input-group"><label>1 serveur / X couverts</label><input class="input-full" id="v103-server-ratio" type="number" min="1"></div><div class="input-group"><label>1 cuisine / X couverts</label><input class="input-full" id="v103-kitchen-ratio" type="number" min="1"></div></div><label class="rh-v103-toggle"><input id="v103-reservations" type="checkbox"><span><strong>Réagir aux réservations</strong><small>Réévalue la couverture quand l’affluence prévue change.</small></span></label><label class="rh-v103-toggle"><input id="v103-antirush" type="checkbox"><span><strong>Intégrer Anti-Rush</strong><small>Utilise la pression opérationnelle détectée pour renforcer les services utiles.</small></span></label><label class="rh-v103-toggle"><input id="v103-absence" type="checkbox"><span><strong>Réagir aux absences</strong><small>Recherche un remplacement sans refaire inutilement tout le mois.</small></span></label></section><section class="rh-v103-config-section"><h4>Horaires de travail & service</h4><div class="grid-2"><div class="input-group"><label>Début travail midi</label><input class="input-full" id="v103-lunch-work-start" type="time"></div><div class="input-group"><label>Fin travail midi</label><input class="input-full" id="v103-lunch-work-end" type="time"></div></div><div class="grid-2"><div class="input-group"><label>Début service midi</label><input class="input-full" id="v103-lunch-start" type="time"></div><div class="input-group"><label>Fin service midi</label><input class="input-full" id="v103-lunch-end" type="time"></div></div><div class="grid-2"><div class="input-group"><label>Début travail soir</label><input class="input-full" id="v103-dinner-work-start" type="time"></div><div class="input-group"><label>Fin travail soir</label><input class="input-full" id="v103-dinner-work-end" type="time"></div></div><div class="grid-2"><div class="input-group"><label>Début service soir</label><input class="input-full" id="v103-dinner-start" type="time"></div><div class="input-group"><label>Fin service soir</label><input class="input-full" id="v103-dinner-end" type="time"></div></div><div class="rh-v103-config-note">Les heures de travail correspondent à la prise et à la fin de poste réelles. Les heures de service correspondent à la période de service aux clients. Les contraintes de contrat, compétences, disponibilités et repos restent prioritaires.</div></section></div><div style="display:flex;justify-content:flex-end;gap:9px;margin-top:16px"><button class="btn-outline" onclick="closeRhPlanningSettingsV103()">ANNULER</button><button class="btn-save-green" onclick="saveRhPlanningSettingsV103()">ENREGISTRER LES RÉGLAGES</button></div></div></div>`);
    }
    if(!document.getElementById('rh-doc-center-v103')){
      document.body.insertAdjacentHTML('beforeend',`<div class="modal" id="rh-doc-center-v103"><div class="modal-content" style="width:min(680px,95vw)"><div class="modal-header"><div><h3>DOCUMENTS DES COLLABORATEURS</h3><div style="color:var(--text-muted);font-size:.68rem;margin-top:4px">Envoyer bulletin de salaire, contrat, avenant, attestation ou certificat vers le Portail Staff personnel.</div></div><button class="btn-outline" style="border:none" onclick="closeRhDocumentsCenterV103()">FERMER</button></div><div class="rh-v103-emphasis">Sélectionnez le collaborateur. Son dossier sécurisé s’ouvrira directement sur la zone <strong>Documents professionnels</strong>.</div><div class="rh-v103-doc-picker"><div class="input-group" style="margin:0"><label>Collaborateur</label><select id="v103-doc-staff" class="input-full"></select></div><button class="btn-save-green" style="min-height:44px" onclick="openSelectedStaffDocumentsV103()">OUVRIR LES DOCUMENTS</button></div></div></div>`);
    }
  }
  function showModal(id){ensureModals();const m=document.getElementById(id);if(!m)return;m.style.opacity='1';m.classList.add('show');m.style.display='flex';}
  function hideModal(id){const m=document.getElementById(id);if(!m)return;m.classList.remove('show');m.style.display='none';}
  window.closeRhPlanningSettingsV103=()=>hideModal('rh-ai-settings-v103');
  window.closeRhDocumentsCenterV103=()=>hideModal('rh-doc-center-v103');
  window.openRhPlanningSettingsV103=function(){ensureModals();const s=typeof getRhSettings==='function'?getRhSettings():{};const set=(id,v)=>{const e=document.getElementById(id);if(e)e.value=v??''};const chk=(id,v)=>{const e=document.getElementById(id);if(e)e.checked=v!==false};set('v103-mode',s.planningMode||'autonomous');set('v103-month-lead',s.planningMonthlyLeadDays||14);set('v103-takeover-hours',s.planningTakeoverHours||48);set('v103-off-days',s.planningDaysOffPerWeek??2);set('v103-recovery-max',s.planningMaxRecoveryDaysPerMonth??2);set('v104-peak-count',s.planningPeakProtectionCount??6);set('v104-peak-covers',s.planningPeakMinCovers??40);set('v103-priority',s.planningPriority||'balanced');set('v103-budget',s.laborBudgetPct??25);set('v103-service-level',s.planningServiceLevel||'standard');set('v103-server-ratio',s.serverCoversRatio??25);set('v103-kitchen-ratio',s.kitchenCoversRatio??35);set('v103-lunch-work-start',s.lunchWorkStart||s.lunchStart||'10:00');set('v103-lunch-work-end',s.lunchWorkEnd||s.lunchEnd||'14:45');set('v103-lunch-start',s.lunchStart||'10:00');set('v103-lunch-end',s.lunchEnd||'14:45');set('v103-dinner-work-start',s.dinnerWorkStart||s.dinnerStart||'18:00');set('v103-dinner-work-end',s.dinnerWorkEnd||s.dinnerEnd||'22:45');set('v103-dinner-start',s.dinnerStart||'18:00');set('v103-dinner-end',s.dinnerEnd||'22:45');chk('v103-autopilot',s.planningAutopilotEnabled);chk('v103-consecutive-off',s.planningPreferConsecutiveOff);chk('v103-auto-recovery',s.planningAutoRecovery);chk('v104-block-protected',s.planningBlockPlannableLeaveOnProtectedDays);chk('v104-protect-peaks',s.planningProtectPeakLeave);document.querySelectorAll('[data-v104-protected-day]').forEach(el=>{el.checked=(Array.isArray(s.planningProtectedWeekdays)?s.planningProtectedWeekdays.map(Number):[]).includes(Number(el.dataset.v104ProtectedDay));});chk('v103-reservations',s.planningRebalanceOnReservations);chk('v103-antirush',s.planningRebalanceOnAntiRush);chk('v103-absence',s.planningRebalanceOnAbsence);showModal('rh-ai-settings-v103');};
  window.saveRhPlanningSettingsV103=function(){
    const current=typeof getRhSettings==='function'?getRhSettings():{};
    const val=id=>document.getElementById(id)?.value;
    const checked=id=>document.getElementById(id)?.checked!==false;
    const protectedWeekdays=Array.from(document.querySelectorAll('[data-v104-protected-day]:checked')).map(el=>Number(el.dataset.v104ProtectedDay));
    const saved=saveRhSettings({...current,
      planningMode:val('v103-mode'),planningMonthlyLeadDays:val('v103-month-lead'),planningTakeoverHours:val('v103-takeover-hours'),
      planningDaysOffPerWeek:val('v103-off-days'),planningMaxRecoveryDaysPerMonth:val('v103-recovery-max'),
      planningProtectedWeekdays:protectedWeekdays,planningBlockPlannableLeaveOnProtectedDays:checked('v104-block-protected'),
      planningProtectPeakLeave:checked('v104-protect-peaks'),planningPeakProtectionCount:val('v104-peak-count'),planningPeakMinCovers:val('v104-peak-covers'),
      planningPriority:val('v103-priority'),planningServiceLevel:val('v103-service-level'),laborBudgetPct:val('v103-budget'),serverCoversRatio:val('v103-server-ratio'),kitchenCoversRatio:val('v103-kitchen-ratio'),
      lunchWorkStart:val('v103-lunch-work-start'),lunchWorkEnd:val('v103-lunch-work-end'),lunchStart:val('v103-lunch-start'),lunchEnd:val('v103-lunch-end'),dinnerWorkStart:val('v103-dinner-work-start'),dinnerWorkEnd:val('v103-dinner-work-end'),dinnerStart:val('v103-dinner-start'),dinnerEnd:val('v103-dinner-end'),
      planningAutopilotEnabled:checked('v103-autopilot'),planningPreferConsecutiveOff:checked('v103-consecutive-off'),planningAutoRecovery:checked('v103-auto-recovery'),
      planningApprovedLeaveOnly:true,planningRebalanceOnReservations:checked('v103-reservations'),planningRebalanceOnAntiRush:checked('v103-antirush'),planningRebalanceOnAbsence:checked('v103-absence')
    });
    hideModal('rh-ai-settings-v103');
    try{hydrateRhSettingsForm?.();renderPlanningAssistantLocal?.();showToast?.(`Réglages IA enregistrés · ${saved.planningDaysOffPerWeek} OFF / 7 jours · pics protégés ${saved.planningProtectPeakLeave?'OUI':'NON'}`);}catch(_){ }
    return saved;
  };
  function refreshDocStaff(){ensureModals();const sel=document.getElementById('v103-doc-staff');if(!sel)return;const rows=(typeof getDir==='function'?getDir():[]).filter(s=>s&&s.id!=null);sel.innerHTML=rows.map(s=>`<option value="${esc(s.id)}">${esc(s.name||'Collaborateur')} · ${esc(String(s.dept||s.role||''))}</option>`).join('');if(typeof currentStaffId!=='undefined'&&currentStaffId!=null)sel.value=String(currentStaffId);}
  window.openRhDocumentsCenterV103=function(){refreshDocStaff();showModal('rh-doc-center-v103');};
  window.openSelectedStaffDocumentsV103=function(){const id=document.getElementById('v103-doc-staff')?.value;if(!id)return alert('Sélectionnez un collaborateur.');hideModal('rh-doc-center-v103');window.openStaffDocumentsV103(id);};
  window.openStaffDocumentsV103=function(idOrPin){const rows=typeof getDir==='function'?getDir():[];const staff=rows.find(s=>String(s.id)===String(idOrPin)||String(s.pin||'')===String(idOrPin));if(!staff)return alert('Collaborateur introuvable.');if(typeof openStaffModal!=='function')return alert('Fiche collaborateur indisponible.');openStaffModal(staff.pin);setTimeout(()=>{try{window.loadRhStaffDocumentsV100?.();const panel=document.getElementById('rh-staff-documents-v100');panel?.scrollIntoView({behavior:'smooth',block:'start'});if(panel){panel.style.boxShadow='0 0 0 2px rgba(16,185,129,.45),0 18px 45px rgba(0,0,0,.35)';setTimeout(()=>panel.style.boxShadow='',2200);}}catch(_){ }},180);};
  function monthIsComplete(month){try{const ts=getTs?.()||{};const staff=(getDir?.()||[]).filter(s=>s.active!==false);const [y,m]=String(month).split('-').map(Number);const days=new Date(y,m,0).getDate();if(!staff.length||!days)return false;return staff.every(s=>{const node=ts?.[month]?.[String(s.id)]||ts?.[month]?.[s.id]||{};let count=0;for(let d=1;d<=days;d++)if(node[d]||node[String(d)])count++;return count>=days;});}catch(_){return false;}}
  async function checkMonthlyPlanning(force=false){if(window.ICHEF_PLANNING_PREMIUM_ONLY)return; // Proposition IA manuelle uniquement.
    if(monthlyPlannerRunning)return;const s=getRhSettings?.()||{};if(s.planningAutopilotEnabled===false||String(s.planningStatus||'draft')==='locked')return;const now=new Date();const next=new Date(now.getFullYear(),now.getMonth()+1,1,12,0,0,0);const lead=Math.max(1,Math.min(31,Number(s.planningMonthlyLeadDays)||14));const daysUntil=(next.getTime()-Date.now())/86400000;if(!force&&daysUntil>lead)return;const month=`${next.getFullYear()}-${String(next.getMonth()+1).padStart(2,'0')}`;if(monthIsComplete(month))return;const key=`ichef_v103_monthly_${tenantID_JS}_${month}`;const last=Date.parse(localStorage.getItem(key)||'');if(!force&&Number.isFinite(last)&&Date.now()-last<30*60*1000)return;localStorage.setItem(key,new Date().toISOString());const mode=String(s.planningMode||'autonomous').toLowerCase();if(mode==='assisted'){try{showToast?.(`Planning ${month} à préparer · IA disponible`);}catch(_){ }return;}monthlyPlannerRunning=true;const selector=document.getElementById('month-selector');const old=selector?.value||'';try{if(selector){selector.value=month;try{enforceRhPlanningMonthHorizon?.(false);}catch(_){}}await generateAutomaticPlanning();if(mode==='semi'){openPlanningAssistant?.();showToast?.(`Proposition IA ${month} prête · publication à valider`);return;}await window.applyAutomaticPlanning?.({auto:true,reason:`Planification mensuelle automatique iCHEF IA · mois ${month} · réglages client`});}catch(e){console.error('[iCHEF RH V103] planning mensuel',e);try{showToast?.('Planning mensuel IA à reprendre · vérifier données ou connexion');}catch(_){ }}finally{monthlyPlannerRunning=false;if(selector&&old&&mode!=='semi')selector.value=old;try{loadMonthData?.();renderRhCockpit?.();}catch(_){ }}}
  window.checkMonthlyPlanningV103=checkMonthlyPlanning;
  document.addEventListener('DOMContentLoaded',()=>{ensureModals();setTimeout(()=>checkMonthlyPlanning(false),12000);setInterval(()=>checkMonthlyPlanning(false),30*60*1000);});
  window.addEventListener('focus',()=>setTimeout(()=>checkMonthlyPlanning(false),1800));
  window.__ICHEF_RH_BUILD__=BUILD;console.info('[iCHEF RH V104] OFF par 0,5 · jours protégés · pics d’affluence protégés · congés validés conservés');
})();


;
/* RH V264 - preserved script #25 */
(() => {
  'use strict';
  // UI layer only. No PIN/login/session/tenantID function is replaced.
  const originalOpen = window.openRhPlanningSettingsV103;
  const originalSave = window.saveRhPlanningSettingsV103;
  function modeFromPriority(v){
    if(v === 'cost') return 'cost';
    if(v === 'coverage') return 'coverage';
    return 'balanced';
  }
  function priorityFromMode(v){
    if(v === 'cost') return 'cost';
    if(v === 'coverage') return 'coverage';
    return 'balanced';
  }
  function ensureSimpleUI(){
    const modal = document.getElementById('rh-ai-settings-v103');
    if(!modal || modal.dataset.simpleV109 === '1') return;
    const content = modal.querySelector('.modal-content');
    const header = content?.querySelector('.modal-header');
    if(!content || !header) return;
    const nodes = Array.from(content.children).filter(n => n !== header);
    const original = document.createElement('div');
    original.className = 'rh-v109-original';
    nodes.forEach(n => original.appendChild(n));
    const body = document.createElement('div');
    body.className = 'rh-v109-body';
    body.innerHTML = `
      <div class="rh-v109-main">
        <section class="rh-v109-hero">
          <strong>Planification intelligente iCHEF</strong>
          <p>Indiquez seulement les priorités de l’établissement. L’IA respecte automatiquement les contrats, congés validés, indisponibilités, repos et heures à récupérer. Les jours OFF sont proposés automatiquement et restent modifiables avant publication.</p>
          <div class="rh-v109-mode">
            <button type="button" data-v109-mode="balanced">✓ Équilibré<small>Qualité de service, équité et bien-être</small></button>
            <button type="button" data-v109-mode="cost">€ Réduire les coûts<small>Optimise les effectifs sans ignorer les contraintes</small></button>
            <button type="button" data-v109-mode="coverage">▥ Renforcer le service<small>Plus d’effectifs pendant les périodes fortes</small></button>
          </div>
        </section>

        <section class="rh-v109-card">
          <h4>Réglages essentiels</h4>
          <div class="rh-v109-row">
            <div class="rh-v109-field"><label>Jours OFF</label><select id="v109-off-days">
              <option value="0.5">0,5 jour / semaine</option><option value="1">1 jour / semaine</option><option value="1.5">1,5 jour / semaine</option><option value="2">2 jours / semaine</option><option value="2.5">2,5 jours / semaine</option><option value="3">3 jours / semaine</option>
            </select></div>
            <div class="rh-v109-field"><label>Période d’affluence</label><select id="v109-affluence">
              <option value="normal">Normale</option><option value="high">Forte</option><option value="very-high">Très forte / événement</option>
            </select></div>
          </div>
          <div class="rh-v109-row">
            <div class="rh-v109-field"><label>Effectif minimum</label><select id="v109-min-staff">
              <option value="usual">Utiliser les besoins habituels</option><option value="reinforced">Renforcer automatiquement</option>
            </select></div>
            <div class="rh-v109-field"><label>Horaires du service</label><select id="v109-hours">
              <option value="usual">Utiliser les horaires habituels</option><option value="custom">Personnaliser dans Réglages avancés</option>
            </select></div>
          </div>
          <div class="rh-v109-info">Les congés déjà validés ne sont jamais annulés. Les OFF proposés par l’IA peuvent être déplacés ou refusés avant la publication du planning.</div>
        </section>

        <details class="rh-v109-advanced">
          <summary>⚙ Réglages avancés</summary>
          <div class="rh-v109-advanced-content"></div>
        </details>

        <div class="rh-v109-actions">
          <button type="button" class="btn-outline" onclick="closeRhPlanningSettingsV103()">ANNULER</button>
          <button type="button" class="btn-save-green" onclick="saveRhPlanningSettingsV109()">ENREGISTRER LES RÉGLAGES</button>
        </div>
      </div>
      <aside class="rh-v109-side">
        <section class="rh-v109-card">
          <h4>Ce que l’IA gère automatiquement</h4>
          <div class="rh-v109-check"><b>✓</b><span>Contrats et heures prévues</span></div>
          <div class="rh-v109-check"><b>✓</b><span>Disponibilités et absences</span></div>
          <div class="rh-v109-check"><b>✓</b><span>Congés déjà validés</span></div>
          <div class="rh-v109-check"><b>✓</b><span>Repos et jours OFF proposés</span></div>
          <div class="rh-v109-check"><b>✓</b><span>Heures supplémentaires et récupération</span></div>
          <div class="rh-v109-check"><b>✓</b><span>Affluence, réservations et Anti-Rush</span></div>
          <div class="rh-v109-check"><b>✓</b><span>Détection des conflits avant publication</span></div>
        </section>
      </aside>`;
    body.querySelector('.rh-v109-advanced-content').appendChild(original);
    content.appendChild(body);
    modal.dataset.simpleV109 = '1';
    body.querySelectorAll('[data-v109-mode]').forEach(btn => btn.addEventListener('click', () => {
      body.querySelectorAll('[data-v109-mode]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      modal.dataset.v109Mode = btn.dataset.v109Mode;
    }));
  }
  window.openRhPlanningSettingsV103 = function(...args){
    const r = originalOpen?.apply(this,args);
    ensureSimpleUI();
    const modal = document.getElementById('rh-ai-settings-v103');
    const priority = document.getElementById('v103-priority')?.value || 'balanced';
    const mode = modeFromPriority(priority);
    modal.dataset.v109Mode = mode;
    modal.querySelectorAll('[data-v109-mode]').forEach(b => b.classList.toggle('active', b.dataset.v109Mode === mode));
    const off = document.getElementById('v103-off-days')?.value || '2';
    const offSelect = document.getElementById('v109-off-days');
    if(offSelect && Array.from(offSelect.options).some(o=>o.value===String(off))) offSelect.value=String(off);
    const peak = document.getElementById('v104-protect-peaks')?.checked;
    const aff = document.getElementById('v109-affluence');
    if(aff) aff.value = peak ? 'high' : 'normal';
    return r;
  };
  window.saveRhPlanningSettingsV109 = function(){
    ensureSimpleUI();
    const modal = document.getElementById('rh-ai-settings-v103');
    const mode = modal?.dataset.v109Mode || 'balanced';
    const priority = document.getElementById('v103-priority');
    if(priority) priority.value = priorityFromMode(mode);
    const off = document.getElementById('v109-off-days')?.value;
    const oldOff = document.getElementById('v103-off-days');
    if(oldOff && off) oldOff.value = off;
    const aff = document.getElementById('v109-affluence')?.value || 'normal';
    const peaks = document.getElementById('v104-protect-peaks');
    if(peaks) peaks.checked = aff !== 'normal';
    const reservations = document.getElementById('v103-reservations');
    const antirush = document.getElementById('v103-antirush');
    if(reservations) reservations.checked = true;
    if(antirush) antirush.checked = aff !== 'normal' || antirush.checked;
    return originalSave?.call(this);
  };
  // If the modal was already created before this patch, prepare it now.
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', ensureSimpleUI, {once:true});
  } else {
    ensureSimpleUI();
  }
  window.__ICHEF_RH_BUILD__='RH-V109-SIMPLE-IA-SETTINGS-PIN-UNTOUCHED';
  console.info('[iCHEF RH V109] Réglages IA simplifiés · connexion/PIN inchangés');
})();
