const urlParamsJS = new URLSearchParams(window.location.search);
        const tenantID_JS = urlParamsJS.get('tenantID') || localStorage.getItem('ichef_tenant_id') || 'MASTER_STATE';
        const SERVER_URL_JS = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
    ? "http://localhost:10000"
    : "https://tableau-system.onrender.com";
        function getRhDirectionAuthPin() {
            try {
                const pin = String(rhDirectionAuthPin || '').trim();
                return /^\d{4,12}$/.test(pin) ? pin : '';
            } catch (_) {
                return '';
            }
        }
        const API = {
            getState: async () => {
                const authPin = getRhDirectionAuthPin();
                const params = new URLSearchParams({ tenantID: tenantID_JS });
                if (authPin) params.set('masterPin', authPin);
                const r = await fetch(
                    `${SERVER_URL_JS}/get-current-state?${params.toString()}`,
                    {
                        method: 'GET',
                        credentials: 'include',
                        cache: 'no-store',
                        headers: {
                            'Accept': 'application/json',
                            'X-iCHEF-Tenant': tenantID_JS
                        }
                    }
                );
                if (!r.ok) {
                    const err = await r.json().catch(() => ({}));
                    throw new Error(
                        err.error ||
                        err.message ||
                        `Serveur RH indisponible (HTTP ${r.status})`
                    );
                }
                return await r.json();
            },
            update: async (key, data) => {
                const payload = { data: data };
                const authPin = getRhDirectionAuthPin();
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 10000);
                try {
                    const response = await fetch(
                        `${SERVER_URL_JS}/update-order?tenantID=${encodeURIComponent(tenantID_JS)}`,
                        {
                            method: 'POST',
                            credentials: 'include',
                            cache: 'no-store',
                            signal: controller.signal,
                            headers: {
                                'Content-Type': 'application/json',
                                'Accept': 'application/json',
                                'X-iCHEF-Tenant': tenantID_JS
                            },
                            body: JSON.stringify({
                                tenantID: tenantID_JS,
                                masterPin: authPin || undefined,
                                tableId: key,
                                order: data === null ? null : payload
                            })
                        }
                    );
                    if (!response.ok) {
                        const err = await response.json().catch(() => ({}));
                        throw new Error(
                            err.error ||
                            err.message ||
                            `HTTP ${response.status}`
                        );
                    }
                    return true;
                } catch(e) {
                    if (e?.name === 'AbortError') {
                        console.warn(`[iCHEF RH] Synchronisation ${key} trop lente : conservation locale.`);
                    } else {
                        console.error("Erreur Sync RH:", e);
                    }
                    return false;
                } finally {
                    clearTimeout(timeout);
                }
            }
        };
        // VARIABLES GLOBALES
        let currentStaffId = null;
        let currentDept = null;
        let currentPin = "";
        let rhDirectionAuthPin = ""; // PIN Direction : mémoire vive uniquement
        let punchPin = "";
        let loginMode = "";
        let loggedInStaffId = null;
        let isGlobalView = false;
        let isAnnualView = false;
        let videoStream = null;
        let staffAccess = [];
        let punchKioskMode = false;
        let punchClockTimer = null;
        let punchSubmitInFlight = false;
        const RH_DEVICE_ID = (() => {
            const key = 'ichef_rh_device_id';
            let value = localStorage.getItem(key);
            if (!value) {
                try {
                    const bytes = new Uint8Array(16);
                    crypto.getRandomValues(bytes);
                    value = 'rh_' + Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
                } catch (_) {
                    value = 'rh_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2);
                }
                localStorage.setItem(key, value);
            }
            return value;
        })();
        async function refreshStaffAccessFromServer() {
            const state = await API.getState();
            const serverStaff = state?.activeOrders?.STAFF_ACCESS?.data;
            staffAccess = Array.isArray(serverStaff)
                ? serverStaff
                    .filter(s => s && s.active !== false)
                    .map(s => ({
                        ...s,
                        pin: String(s.pin || '').trim()
                    }))
                : [];
            return staffAccess;
        }
        function normalizePinAuthResponseV203(data = {}) {
            const user = data?.user || data?.staff || data?.profile || {};
            const role = String(
                data?.role ??
                data?.accessRole ??
                user?.role ??
                user?.accessRole ??
                ''
            ).trim();
            const dept = String(
                data?.dept ??
                data?.department ??
                user?.dept ??
                user?.department ??
                ''
            ).trim();
            return {
                ...data,
                role,
                dept,
                isManager:
                    data?.isManager === true ||
                    data?.manager === true ||
                    user?.isManager === true ||
                    user?.manager === true,
                isMaster:
                    data?.isMaster === true ||
                    data?.master === true ||
                    user?.isMaster === true ||
                    user?.master === true
            };
        }
        async function verifyPinWithServer(pin) {
            const safePin = String(pin || '').replace(/\D+/g, '').slice(0, 12);
            if (!/^\d{4,12}$/.test(safePin)) {
                return {
                    success: false,
                    error: "Le code PIN doit contenir entre 4 et 12 chiffres."
                };
            }

            const payload = {
                tenantID: tenantID_JS,
                pin: safePin,
                deviceId: RH_DEVICE_ID,
                terminal: 'RH',
                module: 'RH'
            };

            // V222 : l'endpoint historique reste prioritaire.
            // Les deux routes suivantes ne sont essayées QUE si le serveur
            // répond 404/405/501. Aucun PIN n'est jamais validé localement.
            const endpoints = [
                '/api/verify-pin',
                '/api/rh/verify-pin',
                '/api/staff/verify-pin'
            ];

            let lastError = null;
            let lastCode = '';
            let lastStatus = 0;

            for (let endpointIndex = 0; endpointIndex < endpoints.length; endpointIndex++) {
                const endpoint = endpoints[endpointIndex];

                for (let attempt = 0; attempt < 2; attempt++) {
                    try {
                        const controller = new AbortController();
                        const timeout = setTimeout(() => controller.abort(), 9000);
                        let response;

                        try {
                            response = await fetch(
                                `${SERVER_URL_JS}${endpoint}`,
                                {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        'Accept': 'application/json',
                                        'X-iCHEF-Tenant': tenantID_JS,
                                        'X-iCHEF-Device': RH_DEVICE_ID
                                    },
                                    credentials: 'include',
                                    cache: 'no-store',
                                    signal: controller.signal,
                                    body: JSON.stringify(payload)
                                }
                            );
                        } finally {
                            clearTimeout(timeout);
                        }

                        lastStatus = Number(response.status || 0);
                        const data = await response.json().catch(() => ({}));

                        if (response.ok && data.success) {
                            const normalized = normalizePinAuthResponseV203(data);
                            normalized.endpoint = endpoint;
                            return normalized;
                        }

                        lastCode = String(data.code || '');
                        lastError =
                            data.error ||
                            data.message ||
                            `Connexion RH refusée (HTTP ${response.status}).`;

                        // Endpoint absent : essayer la route compatible suivante.
                        if ([404,405,501].includes(response.status)) {
                            break;
                        }

                        // PIN refusé / droits insuffisants : ne jamais contourner
                        // la réponse en testant une autre route.
                        if ([400,401,403,422].includes(response.status)) {
                            return {
                                success:false,
                                code:lastCode,
                                status:response.status,
                                endpoint,
                                error:lastError
                            };
                        }

                        if (attempt === 0) {
                            const wait =
                                response.status === 503 || lastCode === 'MONGO_NOT_READY'
                                    ? 1200
                                    : 450;
                            await new Promise(resolve => setTimeout(resolve, wait));
                            continue;
                        }
                    } catch (error) {
                        lastError = error?.name === 'AbortError'
                            ? 'Le serveur RH met trop de temps à répondre.'
                            : 'Connexion au serveur RH impossible.';

                        if (attempt === 0) {
                            await new Promise(resolve => setTimeout(resolve, 700));
                            continue;
                        }
                    }
                }

                // Une route existante qui n'est pas 404/405/501 ne doit pas
                // être contournée par la suivante.
                if (lastStatus && ![404,405,501].includes(lastStatus)) {
                    break;
                }
            }

            return {
                success: false,
                code: lastCode,
                status: lastStatus,
                error: lastError || 'Connexion RH momentanément indisponible.'
            };
        }
        window.verifyPinWithServer = verifyPinWithServer;
        // ==========================================
        // 💾 ACCÈS AUX DONNÉES LOCALES & CLOUD
        // ==========================================
        function normalizeRhDept(value) {
            const raw = String(value || '').trim().toLowerCase();
            if (!raw) return 'salle';
            const compact = raw
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[’']/g, ' ')
                .replace(/[_-]+/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
            if (/(admin|direction|directeur|manager|gerant|f\s*&?\s*b)/.test(compact)) return 'direction';
            if (/(patisserie|pastry|patissier)/.test(compact)) return 'patisserie';
            if (/(cuisine|kitchen|cuisinier|chef de partie|sous chef|plonge)/.test(compact)) return 'cuisine';
            if (/(room service|roomservice|service chambre)/.test(compact)) return 'roomservice';
            if (/(petit dejeuner|breakfast)/.test(compact)) return 'petit_dejeuner';
            if (/(banquet|banqueting|evenement)/.test(compact)) return 'banquet';
            if (/(reception|front office|night auditor|night manager)/.test(compact)) return 'reception';
            if (/(concierge|conciergerie)/.test(compact)) return 'conciergerie';
            if (/(bagagiste|bagagerie|voiturier|valet parking)/.test(compact)) return 'bagagerie_valet';
            if (/(housekeeping|gouvernante|femme de chambre|valet de chambre|equipier etage)/.test(compact)) return 'housekeeping';
            if (/(lingerie|lingere)/.test(compact)) return 'lingerie';
            if (/(maintenance|technicien|technique)/.test(compact)) return 'maintenance';
            if (/(securite|security|agent securite)/.test(compact)) return 'securite';
            if (/(spa|bien etre|praticien)/.test(compact)) return 'spa';
            if (/(caisse|caissier|vente)/.test(compact)) return 'caisse_vente';
            if (/(polyvalent)/.test(compact)) return 'polyvalent';
            if (/(bar|barman|barista|cocktail)/.test(compact)) return 'bar';
            if (/(salle|service|serveur|serveuse|rang|runner|maitre hotel)/.test(compact)) return 'salle';
            // Compatibilité : si le département serveur est déjà canonique,
            // on le conserve au lieu de le transformer arbitrairement en salle.
            if (
                [
                    'direction','polyvalent','caisse_vente','cuisine','patisserie',
                    'salle','bar','roomservice','petit_dejeuner','banquet','reception',
                    'conciergerie','bagagerie_valet','housekeeping','lingerie',
                    'maintenance','securite','spa'
                ].includes(raw)
            ) {
                return raw;
            }
            return 'salle';
        }
        function buildRhDirectoryFromServer(serverStaff, rhDirectory) {
            const local = Array.isArray(rhDirectory) ? rhDirectory : [];
            const remote = Array.isArray(serverStaff) ? serverStaff : [];
            return remote.map((s, index) => {
                const pin = String(s?.pin || '').trim();
                const name = String(s?.name || '').trim();
                const existing = local.find(d =>
                    (pin && String(d?.pin || '').trim() === pin) ||
                    (
                        name &&
                        String(d?.name || '').trim().toLowerCase() === name.toLowerCase()
                    ) ||
                    (
                        s?.id !== undefined &&
                        s?.id !== null &&
                        String(d?.id ?? '') === String(s.id)
                    )
                );
                return {
                    ...(existing || {}),
                    id:
                        s?.id ??
                        existing?.id ??
                        `staff_${index}_${name.replace(/\s+/g, '_').toLowerCase()}`,
                    name:
                        name ||
                        existing?.name ||
                        'Employé',
                    role:
                        String(
                            s?.role ||
                            existing?.role ||
                            s?.dept ||
                            'Employé'
                        ),
                    dept:
                        normalizeRhDept(
                            s?.dept ||
                            existing?.dept
                        ),
                    contract:
                        Number(
                            s?.contract ??
                            existing?.contract ??
                            39
                        ) || 39,
                    annualLeaveDays:
                        Number(
                            s?.annualLeaveDays ??
                            existing?.annualLeaveDays ??
                            25
                        ),
                    leaveCarryover:
                        Number(
                            s?.leaveCarryover ??
                            existing?.leaveCarryover ??
                            0
                        ),
                    recoveryBalance:
                        Number(
                            s?.recoveryBalance ??
                            existing?.recoveryBalance ??
                            0
                        ),
                    grossSalaryMonthly:
                        Number(
                            s?.grossSalaryMonthly ??
                            existing?.grossSalaryMonthly ??
                            0
                        ),
                    hourlyCost:
                        Number(
                            s?.hourlyCost ??
                            existing?.hourlyCost ??
                            0
                        ),
                    skillLevel:
                        String(
                            s?.skillLevel ??
                            existing?.skillLevel ??
                            'autonome'
                        ),
                    skills:
                        Array.isArray(s?.skills)
                            ? s.skills
                            : Array.isArray(existing?.skills)
                                ? existing.skills
                                : [],
                    availability:
                        String(
                            s?.availability ??
                            existing?.availability ??
                            ''
                        ),
                    minRestHours:
                        Number(
                            s?.minRestHours ??
                            existing?.minRestHours ??
                            11
                        ),
                    maxConsecutiveDays:
                        Number(
                            s?.maxConsecutiveDays ??
                            existing?.maxConsecutiveDays ??
                            6
                        ),
                    pin,
                    active:
                        s?.active !== false,
                    onDuty:
                        Boolean(s?.onDuty),
                    source:
                        'STAFF_ACCESS'
                };
            });
        }
        function syncRhStaffFromState(state, options = {}) {
            const activeOrders = state?.activeOrders || {};
            const remoteStaff =
                Array.isArray(activeOrders?.STAFF_ACCESS?.data)
                    ? activeOrders.STAFF_ACCESS.data
                    : [];
            const serverDirectory =
                Array.isArray(activeOrders?.DIRECTORY_MASTER?.data)
                    ? activeOrders.DIRECTORY_MASTER.data
                    : [];
            staffAccess = remoteStaff.map(s => ({
                ...s,
                pin: String(s?.pin || '').trim()
            }));
            const currentLocal =
                JSON.parse(
                    localStorage.getItem('empire_hr_directory') || '[]'
                );
            const mergedDirectory =
                buildRhDirectoryFromServer(
                    staffAccess,
                    serverDirectory.length
                        ? serverDirectory
                        : currentLocal
                );
            localStorage.setItem(
                'empire_hr_directory',
                JSON.stringify(mergedDirectory)
            );
            const syncCache =
                JSON.parse(
                    localStorage.getItem('EMPIRE_GLOBAL_SYNC') ||
                    '{"activeOrders":{}}'
                );
            if (!syncCache.activeOrders) {
                syncCache.activeOrders = {};
            }
            syncCache.activeOrders.STAFF_ACCESS = {
                data: staffAccess
            };
            syncCache.activeOrders.DIRECTORY_MASTER = {
                data: mergedDirectory
            };
            localStorage.setItem(
                'EMPIRE_GLOBAL_SYNC',
                JSON.stringify(syncCache)
            );
            if (options.render !== false) {
                updateDashboardStats();
                if (
                    document.getElementById('hr-interface')?.style.display === 'flex'
                ) {
                    renderStaffList();
                    loadMonthData();
                }
                if (
                    document.getElementById('employee-portal')?.style.display === 'flex' &&
                    loggedInStaffId !== null
                ) {
                    renderEmployeePortal();
                }
            }
            return mergedDirectory;
        }
        function getDir() {
            const local =
                JSON.parse(
                    localStorage.getItem('empire_hr_directory') || '[]'
                );
            if (
                Array.isArray(staffAccess) &&
                staffAccess.length
            ) {
                return buildRhDirectoryFromServer(
                    staffAccess,
                    local
                );
            }
            return local;
        }
        function saveDir(dir) {
            localStorage.setItem('empire_hr_directory', JSON.stringify(Array.isArray(dir) ? dir : []));
        }
        async function syncDirectoryMasterToCloud(dir) {
            return await API.update('DIRECTORY_MASTER', Array.isArray(dir) ? dir : []);
        }
        function getTs() { return JSON.parse(localStorage.getItem('empire_hr_timesheets')) || {}; }
        // ==========================================================
        // PLANNING : PROTECTION CONTRE LES RETOURS SERVEUR OBSOLÈTES
        // ==========================================================
        // Plusieurs événements temps réel peuvent arriver pendant qu'une
        // modification du planning est encore en cours d'enregistrement.
        // Sans garde, un ancien TIMESHEETS_MASTER peut écraser la case qui
        // vient juste d'être modifiée (symptôme : la couleur revient en arrière).
        let rhPlanningSaveChain = Promise.resolve(true);
        let rhPlanningPendingUntil = 0;
        let rhPlanningLocalSignature = '';
        function rhPlanningSignature(data) {
            try {
                return JSON.stringify(data && typeof data === 'object' ? data : {});
            } catch (_) {
                return '';
            }
        }
        function refreshPlanningScreensAfterSync(source = 'sync') {
            // V218 · un seul master, mais on ne redessine que les surfaces visibles.
            // Les surfaces cachées liront le même master à leur ouverture.
            try {
                const hrVisible =
                    document.getElementById('hr-interface')?.style.display === 'flex';
                const hubVisible =
                    document.getElementById('director-hub')?.style.display === 'flex';
                const staffVisible =
                    document.getElementById('employee-portal')?.style.display === 'flex';
                const timesheetsVisible =
                    document.getElementById('timesheets-interface')?.style.display === 'flex';
                const assistantVisible =
                    document.getElementById('ia-predictions-modal')?.classList.contains('show');

                if (hrVisible && typeof loadMonthData === 'function') {
                    loadMonthData();
                }

                if (hubVisible && typeof window.renderRhCockpit === 'function') {
                    window.renderRhCockpit();
                }

                if (assistantVisible && typeof renderPlanningAssistantLocal === 'function') {
                    renderPlanningAssistantLocal();
                }

                if (timesheetsVisible && typeof renderRealTimesheets === 'function') {
                    renderRealTimesheets();
                }

                if (staffVisible && loggedInStaffId !== null) {
                    if (typeof renderEmployeePortal === 'function') {
                        renderEmployeePortal();
                    } else if (typeof loadPublicPlanning === 'function') {
                        loadPublicPlanning();
                    }
                }

                window.dispatchEvent(
                    new CustomEvent('ichef:planning-views-refreshed', {
                        detail: {
                            source: String(source || 'sync'),
                            at: new Date().toISOString()
                        }
                    })
                );
            } catch (error) {
                console.warn('Rafraîchissement planning après synchronisation impossible', error);
            }
        }
        window.refreshPlanningScreensAfterSync = refreshPlanningScreensAfterSync;
        function applyRemoteTimesheets(remoteData, source = 'server') {
            const safe = remoteData && typeof remoteData === 'object'
                ? remoteData
                : {};
            const remoteSignature = rhPlanningSignature(safe);
            // L'écho serveur correspond à notre dernière sauvegarde : on peut
            // lever immédiatement la protection locale.
            if (
                rhPlanningLocalSignature &&
                remoteSignature === rhPlanningLocalSignature
            ) {
                rhPlanningPendingUntil = 0;
                rhPlanningLocalSignature = '';
            } else if (Date.now() < rhPlanningPendingUntil) {
                // Une écriture locale plus récente est encore en transit.
                // Ne jamais la remplacer par un état serveur potentiellement ancien.
                console.debug(`[iCHEF RH] TIMESHEETS_MASTER ignoré (${source}) : sauvegarde locale en cours.`);
                return false;
            }
            localStorage.setItem(
                'empire_hr_timesheets',
                JSON.stringify(safe)
            );
            if (typeof window.iChefPlanningMasterSyncV217 === 'function') {
                window.iChefPlanningMasterSyncV217({
                    source: String(source || 'server'),
                    snapshot: safe,
                    remote: true
                });
            } else {
                refreshPlanningScreensAfterSync(source);
            }
            return true;
        }
        function saveTs(ts) {
            // Snapshot immuable : si l'utilisateur enchaîne plusieurs changements,
            // chaque requête conserve exactement l'état qu'elle doit enregistrer.
            let snapshot;
            try {
                snapshot = JSON.parse(JSON.stringify(ts || {}));
            } catch (_) {
                snapshot = ts || {};
            }
            localStorage.setItem(
                'empire_hr_timesheets',
                JSON.stringify(snapshot)
            );
            if (typeof window.iChefPlanningMasterSyncV217 === 'function') {
                window.iChefPlanningMasterSyncV217({
                    source: 'saveTs-local',
                    snapshot,
                    local: true
                });
            }
            rhPlanningLocalSignature = rhPlanningSignature(snapshot);
            rhPlanningPendingUntil = Date.now() + 15000;
            // Sérialise les sauvegardes pour empêcher deux clics rapides d'arriver
            // au serveur dans l'ordre inverse.
            rhPlanningSaveChain = rhPlanningSaveChain
                .catch(() => true)
                .then(async () => {
                    const ok = await API.update(
                        'TIMESHEETS_MASTER',
                        snapshot
                    );
                    if (!ok) {
                        // On conserve la version locale plus longtemps plutôt que
                        // de laisser un rafraîchissement distant la faire disparaître.
                        rhPlanningPendingUntil = Math.max(
                            rhPlanningPendingUntil,
                            Date.now() + 60000
                        );
                    }
                    return ok;
                });
            return rhPlanningSaveChain;
        }
        function getPunches() {
            try {
                const value = JSON.parse(localStorage.getItem('empire_hr_punches') || '[]');
                return Array.isArray(value) ? value : [];
            } catch (_) {
                return [];
            }
        }
        // Les pointages bruts sont des preuves : synchronisation append-only côté RH.
        // Une réponse serveur vide, ancienne ou partielle ne doit jamais effacer une preuve locale.
        function rhPunchStableKey(p) {
            if (!p) return '';
            const id = String(p.id || p._id || p.punchId || p.offlineEventId || '').trim();
            if (id) return `id:${id}`;
            return [
                'evt',
                String(p.staffId ?? ''),
                String(p.timestamp ?? p.clientTimestamp ?? p.createdAt ?? ''),
                String(p.type ?? p.punchType ?? '').toUpperCase(),
                String(p.deviceId ?? '')
            ].join('|');
        }
        function mergePunchCollections(localList, incomingList) {
            const local = Array.isArray(localList) ? localList : [];
            const incoming = Array.isArray(incomingList) ? incomingList : [];
            const byKey = new Map();
            local.forEach((item, index) => {
                if (!item) return;
                const key = rhPunchStableKey(item) || `local:${index}:${JSON.stringify(item)}`;
                byKey.set(key, { ...item });
            });
            incoming.forEach((item, index) => {
                if (!item) return;
                const key = rhPunchStableKey(item) || `remote:${index}:${JSON.stringify(item)}`;
                const previous = byKey.get(key) || {};
                // La version serveur complète les données, sans supprimer les champs de preuve locaux.
                byKey.set(key, { ...previous, ...item });
            });
            return [...byKey.values()].sort((a, b) =>
                Number(a?.timestamp ?? a?.clientTimestamp ?? 0) -
                Number(b?.timestamp ?? b?.clientTimestamp ?? 0)
            );
        }
        function storePunchesNoLoss(incoming, source = 'sync') {
            const current = getPunches();
            const merged = mergePunchCollections(current, incoming);
            // Backup de sécurité avant toute évolution de la collection locale.
            try {
                if (current.length) {
                    localStorage.setItem('empire_hr_punches_backup', JSON.stringify(current));
                }
            } catch (_) {}
            localStorage.setItem('empire_hr_punches', JSON.stringify(merged));
            if (Array.isArray(incoming) && incoming.length < current.length) {
                console.warn(`[iCHEF RH V90] ${source}: réponse pointages plus courte (${incoming.length}/${current.length}) — preuves locales conservées.`);
            }
            return merged;
        }
        async function savePunches(p) {
            const merged = storePunchesNoLoss(p, 'savePunches');
            return await API.update('PUNCHES_MASTER', merged);
        }
        function getRealTimesheets() {
            return JSON.parse(
                localStorage.getItem('ichef_rh_timesheet_real') || '{"months":{}}'
            );
        }
        function saveRealTimesheetsLocal(data) {
            const safe =
                data && typeof data === 'object'
                    ? data
                    : { months: {} };
            localStorage.setItem(
                'ichef_rh_timesheet_real',
                JSON.stringify(safe)
            );
            return safe;
        }
        function getRealSheetForStaff(staffId, monthStr) {
            const data =
                getRealTimesheets();
            return (
                data?.months?.[monthStr]?.staff?.[String(staffId)] ||
                null
            );
        }
        function getRealDayForStaff(staffId, monthStr, day) {
            return (
                getRealSheetForStaff(staffId, monthStr)
                    ?.days?.[String(day).padStart(2, '0')] ||
                null
            );
        }
        // ============================================================
        // V170 · CONNEXION RH <-> CAISSE TACTILE
        // Source partagée : AppState.activeOrders.FINANCIAL_HISTORY
        // ============================================================
        let rhFinancialHistoryV170 = [];
        let rhCashConnectedV170 = false;
        let rhCashLastSyncV170 = 0;
        function rhCashCacheKeyV170() {
            return `ichef_rh_cash_history_${String(tenantID_JS || 'default')}`;
        }
        function rhCashTxDateV170(tx) {
            const raw =
                tx?.createdAt ??
                tx?.date ??
                tx?.timestamp ??
                tx?.paidAt ??
                tx?.updatedAt ??
                null;
            if (raw === null || raw === undefined || raw === '') {
                return null;
            }
            const date =
                raw instanceof Date
                    ? raw
                    : (
                        typeof raw === 'number' ||
                        /^\d{10,13}$/.test(String(raw))
                            ? new Date(Number(raw))
                            : new Date(raw)
                      );
            return Number.isNaN(date.getTime())
                ? null
                : date;
        }
        function rhCashTxAmountV170(tx) {
            const value =
                tx?.total ??
                tx?.amount ??
                tx?.totalTTC ??
                tx?.paidAmount ??
                tx?.grandTotal ??
                tx?.details?.total ??
                tx?.details?.amount ??
                0;
            let amount =
                Number(value || 0);
            if (!Number.isFinite(amount)) {
                amount = 0;
            }
            const type =
                String(
                    tx?.type ||
                    tx?.subtype ||
                    ''
                )
                .trim()
                .toUpperCase();
            if (
                amount > 0 &&
                /(REFUND|REMBOURS|AVOIR|CREDIT)/.test(type)
            ) {
                amount *= -1;
            }
            return amount;
        }
        function rhCashTxPaxV170(tx) {
            const value =
                tx?.pax ??
                tx?.covers ??
                tx?.couverts ??
                tx?.guests ??
                tx?.orderSnapshot?.pax ??
                tx?.details?.orderSnapshot?.pax ??
                0;
            const pax =
                Number(value || 0);
            return Number.isFinite(pax) && pax > 0
                ? pax
                : 0;
        }
        function rhCashTxCurrencyV170(tx) {
            const value =
                String(
                    tx?.currency ||
                    tx?.details?.currency ||
                    ''
                )
                .trim()
                .toUpperCase();
            return value === 'EUR'
                ? 'EUR'
                : (
                    value === 'CHF'
                        ? 'CHF'
                        : ''
                  );
        }
        function rhCashTxKeyV170(tx) {
            const date =
                rhCashTxDateV170(tx);
            return String(
                tx?.operationId ||
                tx?.paymentRequestId ||
                tx?.id ||
                tx?.ticketNumber ||
                [
                    date?.getTime?.() || '',
                    rhCashTxAmountV170(tx),
                    tx?.tableId || tx?.table || '',
                    tx?.method || tx?.paymentMethod || ''
                ].join('|')
            );
        }
        function rhCashTxUsableV170(tx) {
            if (!tx || typeof tx !== 'object') {
                return false;
            }
            const status =
                String(
                    tx?.status ||
                    tx?.paymentStatus ||
                    ''
                )
                .trim()
                .toUpperCase();
            if (
                /(CANCEL|ANNUL|VOID|FAILED|ECHEC|ÉCHEC|PENDING)/.test(status)
            ) {
                return false;
            }
            return Boolean(
                rhCashTxDateV170(tx)
            );
        }
        function loadRhCashCacheV170() {
            if (rhFinancialHistoryV170.length) {
                return rhFinancialHistoryV170;
            }
            try {
                const cached =
                    JSON.parse(
                        localStorage.getItem(
                            rhCashCacheKeyV170()
                        ) || '[]'
                    );
                if (Array.isArray(cached)) {
                    rhFinancialHistoryV170 =
                        cached.filter(
                            rhCashTxUsableV170
                        );
                }
            } catch (_) {}
            return rhFinancialHistoryV170;
        }
        function persistRhCashCacheV170() {
            try {
                // Cache hors ligne seulement : le serveur reste la source.
                const rows =
                    rhFinancialHistoryV170
                        .slice(-3000);
                localStorage.setItem(
                    rhCashCacheKeyV170(),
                    JSON.stringify(rows)
                );
            } catch (_) {}
        }
        function storeRhFinancialHistoryV170(
            history,
            source = 'server'
        ) {
            if (!Array.isArray(history)) {
                return;
            }
            const map =
                new Map();
            history
                .filter(rhCashTxUsableV170)
                .forEach(tx => {
                    map.set(
                        rhCashTxKeyV170(tx),
                        tx
                    );
                });
            rhFinancialHistoryV170 =
                Array.from(
                    map.values()
                )
                .sort((a, b) => {
                    const ad =
                        rhCashTxDateV170(a)
                            ?.getTime() || 0;
                    const bd =
                        rhCashTxDateV170(b)
                            ?.getTime() || 0;
                    return ad - bd;
                });
            rhCashConnectedV170 = true;
            rhCashLastSyncV170 = Date.now();
            persistRhCashCacheV170();
            renderRhCashActivityV170(source);
        }
        function upsertRhCashTransactionV170(
            tx,
            source = 'socket'
        ) {
            if (!rhCashTxUsableV170(tx)) {
                return;
            }
            loadRhCashCacheV170();
            const key =
                rhCashTxKeyV170(tx);
            const index =
                rhFinancialHistoryV170
                    .findIndex(row =>
                        rhCashTxKeyV170(row) === key
                    );
            if (index >= 0) {
                rhFinancialHistoryV170[index] = tx;
            } else {
                rhFinancialHistoryV170.push(tx);
            }
            rhFinancialHistoryV170
                .sort((a, b) =>
                    (rhCashTxDateV170(a)?.getTime() || 0) -
                    (rhCashTxDateV170(b)?.getTime() || 0)
                );
            rhCashConnectedV170 = true;
            rhCashLastSyncV170 = Date.now();
            persistRhCashCacheV170();
            renderRhCashActivityV170(source);
        }
        function rhCashMonthKeyV170(date) {
            return (
                `${date.getFullYear()}-` +
                `${String(date.getMonth() + 1).padStart(2, '0')}`
            );
        }
        function rhCashDailyKeyV170(date) {
            return (
                `${rhCashMonthKeyV170(date)}-` +
                `${String(date.getDate()).padStart(2, '0')}`
            );
        }
        function rhCashCurrencySymbolV170(currency) {
            return String(currency || '').toUpperCase() === 'EUR'
                ? '€'
                : 'CHF';
        }
        function rhCashMoneyV170(value, currency) {
            const n =
                Number(value || 0);
            const rounded =
                Math.round(n * 100) / 100;
            return (
                rounded.toLocaleString(
                    'fr-FR',
                    {
                        minimumFractionDigits:
                            Math.abs(rounded) < 1000
                                ? 2
                                : 0,
                        maximumFractionDigits: 2
                    }
                ) +
                ' ' +
                rhCashCurrencySymbolV170(currency)
            );
        }
        function rhCashSummaryForMonthV170(
            monthStr,
            history = null
        ) {
            const rows =
                Array.isArray(history)
                    ? history
                    : loadRhCashCacheV170();
            const settings =
                getRhSettings();
            const monthRows =
                rows.filter(tx => {
                    const date =
                        rhCashTxDateV170(tx);
                    return (
                        date &&
                        rhCashMonthKeyV170(date) === monthStr
                    );
                });
            let ca = 0;
            let tickets = 0;
            let covers = 0;
            const hourly = {};
            const daily = {};
            let detectedCurrency = '';
            monthRows.forEach(tx => {
                const date =
                    rhCashTxDateV170(tx);
                if (!date) return;
                const amount =
                    rhCashTxAmountV170(tx);
                const pax =
                    rhCashTxPaxV170(tx);
                const currency =
                    rhCashTxCurrencyV170(tx);
                if (currency) {
                    detectedCurrency = currency;
                }
                ca += amount;
                if (amount > 0) {
                    tickets += 1;
                }
                covers += pax;
                const hour =
                    date.getHours();
                hourly[hour] =
                    Number(hourly[hour] || 0) +
                    amount;
                const day =
                    date.getDate();
                if (!daily[day]) {
                    daily[day] = {
                        ca: 0,
                        tickets: 0,
                        covers: 0
                    };
                }
                daily[day].ca += amount;
                if (amount > 0) {
                    daily[day].tickets += 1;
                }
                daily[day].covers += pax;
            });
            let peakHour = null;
            let peakValue = -Infinity;
            Object
                .entries(hourly)
                .forEach(([hour, value]) => {
                    if (Number(value) > peakValue) {
                        peakValue = Number(value);
                        peakHour = Number(hour);
                    }
                });
            const currency =
                detectedCurrency ||
                settings.currency ||
                'CHF';
            return {
                month: monthStr,
                ca,
                tickets,
                covers,
                average:
                    tickets > 0
                        ? ca / tickets
                        : 0,
                peakHour,
                currency,
                daily,
                transactions: monthRows.length
            };
        }
        function rhCashHistoryProfileV170(
            monthStr
        ) {
            const rows =
                loadRhCashCacheV170();
            const now =
                new Date();
            const [targetYear, targetMonth] =
                String(monthStr)
                    .split('-')
                    .map(Number);
            const targetStart =
                new Date(
                    targetYear,
                    targetMonth - 1,
                    1
                );
            const cutoff =
                targetStart > now
                    ? now
                    : targetStart;
            const since =
                new Date(cutoff);
            since.setDate(
                since.getDate() - 120
            );
            const byDate = new Map();
            rows.forEach(tx => {
                const date =
                    rhCashTxDateV170(tx);
                if (
                    !date ||
                    date < since ||
                    date >= cutoff
                ) {
                    return;
                }
                const key =
                    rhCashDailyKeyV170(date);
                if (!byDate.has(key)) {
                    byDate.set(
                        key,
                        {
                            date:
                                new Date(
                                    date.getFullYear(),
                                    date.getMonth(),
                                    date.getDate()
                                ),
                            ca: 0,
                            covers: 0,
                            tickets: 0
                        }
                    );
                }
                const row =
                    byDate.get(key);
                const amount =
                    rhCashTxAmountV170(tx);
                row.ca += amount;
                row.covers += rhCashTxPaxV170(tx);
                if (amount > 0) {
                    row.tickets += 1;
                }
            });
            const weekdays =
                Array.from(
                    { length: 7 },
                    () => ({
                        ca: 0,
                        covers: 0,
                        tickets: 0,
                        days: 0
                    })
                );
            byDate.forEach(row => {
                const wd =
                    row.date.getDay();
                weekdays[wd].ca += row.ca;
                weekdays[wd].covers += row.covers;
                weekdays[wd].tickets += row.tickets;
                weekdays[wd].days += 1;
            });
            const all =
                Array.from(
                    byDate.values()
                );
            const overallDailyCa =
                all.length
                    ? (
                        all.reduce(
                            (sum, row) =>
                                sum + row.ca,
                            0
                        ) / all.length
                      )
                    : 0;
            return {
                weekdays:
                    weekdays.map(row => ({
                        avgCa:
                            row.days
                                ? row.ca / row.days
                                : 0,
                        avgCovers:
                            row.days
                                ? row.covers / row.days
                                : 0,
                        avgTickets:
                            row.days
                                ? row.tickets / row.days
                                : 0,
                        sampleDays:
                            row.days
                    })),
                overallDailyCa,
                sampleDays: all.length
            };
        }
        function rhCashForecastMonthV170(
            monthStr
        ) {
            const forecastSettings =
                getRhSettings();
            if (
                forecastSettings
                    ?.planningUseCashForecast === false
            ) {
                return {
                    ca: 0,
                    covers: 0,
                    sampleDays: 0,
                    disabled: true
                };
            }
            const [year, month] =
                String(monthStr)
                    .split('-')
                    .map(Number);
            if (!year || !month) {
                return {
                    ca: 0,
                    covers: 0,
                    sampleDays: 0
                };
            }
            const actual =
                rhCashSummaryForMonthV170(
                    monthStr
                );
            const profile =
                rhCashHistoryProfileV170(
                    monthStr
                );
            const days =
                new Date(
                    year,
                    month,
                    0
                ).getDate();
            const today =
                new Date();
            const todayStart =
                new Date(
                    today.getFullYear(),
                    today.getMonth(),
                    today.getDate()
                );
            let forecastCa = 0;
            let forecastCovers = 0;
            for (
                let day = 1;
                day <= days;
                day++
            ) {
                const date =
                    new Date(
                        year,
                        month - 1,
                        day
                    );
                const actualDay =
                    actual.daily?.[day];
                if (
                    date < todayStart &&
                    actualDay
                ) {
                    forecastCa +=
                        Number(actualDay.ca || 0);
                    forecastCovers +=
                        Number(actualDay.covers || 0);
                    continue;
                }
                const wd =
                    profile.weekdays[
                        date.getDay()
                    ];
                forecastCa +=
                    Number(wd?.avgCa || 0);
                forecastCovers +=
                    Number(wd?.avgCovers || 0);
            }
            return {
                ca: forecastCa,
                covers: forecastCovers,
                sampleDays:
                    profile.sampleDays || 0
            };
        }
        function rhCashDemandProfileV170(
            monthStr
        ) {
            const actual =
                rhCashSummaryForMonthV170(
                    monthStr
                );
            const historyProfile =
                rhCashHistoryProfileV170(
                    monthStr
                );
            return {
                actual,
                historyProfile
            };
        }
        function renderRhWeeklyLoadV171(monthStr) {
            const root =
                document.getElementById(
                    'v171-week-load-bars'
                );
            if (!root) return;
            const profile =
                rhCashHistoryProfileV170(
                    monthStr
                );
            const settings =
                getRhSettings();
            const enabled =
                settings?.planningUseCashForecast !== false;
            const values =
                (profile.weekdays || [])
                    .map(row =>
                        Number(row?.avgCa || 0)
                    );
            const max =
                Math.max(
                    0,
                    ...values
                );
            root
                .querySelectorAll(
                    '[data-day]'
                )
                .forEach(item => {
                    const day =
                        Number(item.dataset.day);
                    const value =
                        enabled
                            ? Number(
                                profile.weekdays?.[day]
                                    ?.avgCa || 0
                              )
                            : 0;
                    const pct =
                        max > 0 && value > 0
                            ? Math.max(
                                12,
                                Math.round(
                                    value / max * 100
                                )
                              )
                            : 0;
                    const bar =
                        item.querySelector('i');
                    const label =
                        item.querySelector(
                            '.v171-bar-value'
                        );
                    if (bar) {
                        bar.style.height =
                            `${pct}%`;
                    }
                    if (label) {
                        label.textContent =
                            enabled && pct > 0
                                ? `${pct}%`
                                : '—';
                    }
                });
            const source =
                document.getElementById(
                    'v171-load-source'
                );
            if (source) {
                source.textContent =
                    enabled
                        ? (
                            profile.sampleDays > 0
                                ? `${profile.sampleDays} JOURS ANALYSÉS`
                                : 'EN ATTENTE DE DONNÉES'
                          )
                        : 'PRÉVISIONS DÉSACTIVÉES';
            }
        }
        function renderRhCashActivityV170(
            source = 'ui'
        ) {
            const monthStr =
                typeof getPlanningAssistantMonth === 'function'
                    ? getPlanningAssistantMonth()
                    : (
                        `${new Date().getFullYear()}-` +
                        `${String(new Date().getMonth() + 1).padStart(2, '0')}`
                      );
            const summary =
                rhCashSummaryForMonthV170(
                    monthStr
                );
            const forecast =
                rhCashForecastMonthV170(
                    monthStr
                );
            const settings =
                getRhSettings();
            const currency =
                summary.currency ||
                settings.currency ||
                'CHF';
            const setText =
                (id, value) => {
                    const el =
                        document.getElementById(id);
                    if (el) {
                        el.textContent = value;
                    }
                };
            setText(
                'rh-cash-period-v170',
                typeof monthLabelFr === 'function'
                    ? monthLabelFr(monthStr)
                    : monthStr
            );
            setText(
                'rh-cash-ca-v170',
                summary.transactions
                    ? rhCashMoneyV170(
                        summary.ca,
                        currency
                      )
                    : '0 ' +
                      rhCashCurrencySymbolV170(currency)
            );
            setText(
                'rh-cash-forecast-v170',
                forecast.disabled === true
                    ? 'DÉSACTIVÉE'
                    : (
                        forecast.sampleDays > 0
                            ? rhCashMoneyV170(
                                forecast.ca,
                                currency
                              )
                            : '—'
                      )
            );
            setText(
                'rh-cash-tickets-v170',
                String(summary.tickets || 0)
            );
            setText(
                'rh-cash-covers-v170',
                summary.covers > 0
                    ? String(
                        Math.round(
                            summary.covers
                        )
                      )
                    : '—'
            );
            setText(
                'rh-cash-average-v170',
                summary.tickets > 0
                    ? rhCashMoneyV170(
                        summary.average,
                        currency
                      )
                    : '—'
            );
            setText(
                'rh-cash-peak-v170',
                Number.isInteger(
                    summary.peakHour
                )
                    ? (
                        `${String(summary.peakHour).padStart(2, '0')}h–` +
                        `${String((summary.peakHour + 1) % 24).padStart(2, '0')}h`
                      )
                    : '—'
            );
            const budgetBase =
                forecast.ca > 0
                    ? forecast.ca
                    : summary.ca;
            const budget =
                budgetBase *
                (
                    Number(
                        settings.laborBudgetPct || 0
                    ) / 100
                );
            setText(
                'rh-cash-budget-v170',
                budgetBase > 0
                    ? rhCashMoneyV170(
                        budget,
                        currency
                      )
                    : '—'
            );
            renderRhWeeklyLoadV171(
                monthStr
            );
            const status =
                document.getElementById(
                    'rh-cash-status-v170'
                );
            if (status) {
                if (rhCashConnectedV170) {
                    status.dataset.state =
                        'connected';
                    status.textContent =
                        summary.transactions > 0
                            ? 'CAISSE CONNECTÉE'
                            : 'CAISSE CONNECTÉE · AUCUNE VENTE';
                } else if (
                    loadRhCashCacheV170()
                        .length
                ) {
                    status.dataset.state =
                        'cache';
                    status.textContent =
                        'DONNÉES CAISSE EN CACHE';
                } else {
                    status.dataset.state =
                        'waiting';
                    status.textContent =
                        'CAISSE EN ATTENTE';
                }
            }
        }
        function rhCashActivitySnapshotV170(
            monthStr
        ) {
            const summary =
                rhCashSummaryForMonthV170(
                    monthStr
                );
            const forecast =
                rhCashForecastMonthV170(
                    monthStr
                );
            return {
                source:
                    'FINANCIAL_HISTORY',
                month:
                    monthStr,
                caReal:
                    Math.round(
                        summary.ca * 100
                    ) / 100,
                caForecast:
                    Math.round(
                        forecast.ca * 100
                    ) / 100,
                tickets:
                    summary.tickets,
                covers:
                    Math.round(
                        summary.covers
                    ),
                ticketAverage:
                    Math.round(
                        summary.average * 100
                    ) / 100,
                peakHour:
                    summary.peakHour,
                currency:
                    summary.currency,
                historySampleDays:
                    forecast.sampleDays
            };
        }
        function syncRhOperationalState(state) {
            if (!state?.activeOrders) return;
            const ao =
                state.activeOrders;
            // V170 · la caisse alimente RH depuis le même AppState.
            const financialNode =
                ao['FINANCIAL_HISTORY'];
            const financialHistory =
                Array.isArray(financialNode)
                    ? financialNode
                    : (
                        Array.isArray(financialNode?.data)
                            ? financialNode.data
                            : null
                      );
            if (financialHistory) {
                storeRhFinancialHistoryV170(
                    financialHistory,
                    'server-state'
                );
            }
            if (ao['PUNCHES_MASTER']) {
                storePunchesNoLoss(
                    ao['PUNCHES_MASTER'].data || [],
                    'syncRhOperationalState'
                );
            }
            if (ao['RH_TIMESHEET_REAL']) {
                saveRealTimesheetsLocal(
                    ao['RH_TIMESHEET_REAL'].data || {
                        months: {}
                    }
                );
            }
            if (ao['TIMESHEETS_MASTER']) {
                applyRemoteTimesheets(
                    ao['TIMESHEETS_MASTER'].data || {},
                    'syncRhOperationalState'
                );
            }
            if (ao['REQUESTS_MASTER'] || ao['STAFF_REQUESTS']) {
                const masterRequests =
                    Array.isArray(ao['REQUESTS_MASTER']?.data)
                        ? ao['REQUESTS_MASTER'].data
                        : [];
                const staffRequests =
                    Array.isArray(ao['STAFF_REQUESTS']?.data)
                        ? ao['STAFF_REQUESTS'].data
                        : [];
                const mergedRequests = new Map();
                [...masterRequests, ...staffRequests].forEach(item => {
                    if (!item) return;
                    const id =
                        String(
                            item.id ||
                            item.requestNumber ||
                            item.proofId ||
                            ''
                        );
                    if (!id) return;
                    const previous =
                        mergedRequests.get(id);
                    if (!previous) {
                        mergedRequests.set(id, item);
                        return;
                    }
                    const timeOf = value => {
                        const raw =
                            value?.updatedAt ||
                            value?.decidedAt ||
                            value?.processedAt ||
                            value?.createdAt ||
                            value?.timestamp ||
                            0;
                        const n = Number(raw);
                        if (Number.isFinite(n) && n > 1000000000) return n;
                        const parsed = Date.parse(String(raw || ''));
                        return Number.isFinite(parsed) ? parsed : 0;
                    };
                    mergedRequests.set(
                        id,
                        timeOf(item) >= timeOf(previous)
                            ? { ...previous, ...item }
                            : { ...item, ...previous }
                    );
                });
                localStorage.setItem(
                    'empire_hr_requests',
                    JSON.stringify(
                        [...mergedRequests.values()]
                    )
                );
            }
            if (ao['RH_SETTINGS']) {
                localStorage.setItem(
                    'ichef_rh_settings',
                    JSON.stringify(
                        ao['RH_SETTINGS'].data || {}
                    )
                );
            }
            if (ao['RH_CHANGE_HISTORY']) {
                localStorage.setItem(
                    'ichef_rh_change_history',
                    JSON.stringify(
                        ao['RH_CHANGE_HISTORY'].data || []
                    )
                );
            }
        }
        function getReqs() {
            return JSON.parse(
                localStorage.getItem('empire_hr_requests')
            ) || [];
        }
        function saveReqs(r) {
            const safe =
                Array.isArray(r)
                    ? r
                    : [];
            localStorage.setItem(
                'empire_hr_requests',
                JSON.stringify(safe)
            );
            // V68 : une seule vérité visible par RH ET Portail Staff.
            API.update('REQUESTS_MASTER', safe);
            API.update('STAFF_REQUESTS', safe);
        }
        // ============================================================
        // V168 · SERVICES OUVERTS PAR JOUR
        // 0 = dimanche, 1 = lundi ... 6 = samedi
        // ============================================================
        function defaultRhServiceWeekdaysV168() {
            return {
                0: { lunch: true, dinner: true },
                1: { lunch: true, dinner: true },
                2: { lunch: true, dinner: true },
                3: { lunch: true, dinner: true },
                4: { lunch: true, dinner: true },
                5: { lunch: true, dinner: true },
                6: { lunch: true, dinner: true }
            };
        }
        function normalizeRhServiceWeekdaysV168(value) {
            const defaults =
                defaultRhServiceWeekdaysV168();
            const source =
                value &&
                typeof value === 'object' &&
                !Array.isArray(value)
                    ? value
                    : {};
            const result = {};
            for (let day = 0; day <= 6; day++) {
                const row =
                    source[day] ||
                    source[String(day)] ||
                    defaults[day];
                result[day] = {
                    lunch: row?.lunch !== false,
                    dinner: row?.dinner !== false
                };
            }
            return result;
        }
        function readRhServiceWeekdaysFormV168() {
            const result =
                defaultRhServiceWeekdaysV168();
            document
                .querySelectorAll(
                    '[data-v168-service-day][data-v168-service]'
                )
                .forEach(input => {
                    const day =
                        Number(
                            input.dataset.v168ServiceDay
                        );
                    const service =
                        String(
                            input.dataset.v168Service || ''
                        );
                    if (
                        Number.isInteger(day) &&
                        day >= 0 &&
                        day <= 6 &&
                        ['lunch','dinner'].includes(service)
                    ) {
                        result[day][service] =
                            input.checked === true;
                    }
                });
            return result;
        }
        function hydrateRhServiceWeekdaysV168(settings) {
            const matrix =
                normalizeRhServiceWeekdaysV168(
                    settings?.planningServiceWeekdays
                );
            document
                .querySelectorAll(
                    '[data-v168-service-day][data-v168-service]'
                )
                .forEach(input => {
                    const day =
                        Number(
                            input.dataset.v168ServiceDay
                        );
                    const service =
                        String(
                            input.dataset.v168Service || ''
                        );
                    input.checked =
                        matrix?.[day]?.[service] !== false;
                });
        }
        // ============================================================
        // V169 · PROFILS D'ÉTABLISSEMENT & BRIGADES
        // La catégorie sert de modèle de départ, jamais de verrou.
        // ============================================================
        const ICHEF_BRIGADE_DEPARTMENTS_V169 = {
            direction: {
                label: 'Direction & F&B',
                planning: false
            },
            polyvalent: {
                label: 'Polyvalence',
                planning: false
            },
            caisse_vente: {
                label: 'Vente & Caisse',
                planning: false
            },
            cuisine: {
                label: 'Cuisine',
                planning: true
            },
            patisserie: {
                label: 'Pâtisserie',
                planning: true
            },
            salle: {
                label: 'Salle',
                planning: true
            },
            bar: {
                label: 'Bar',
                planning: true
            },
            roomservice: {
                label: 'Room Service',
                planning: true
            },
            petit_dejeuner: {
                label: 'Petit-déjeuner',
                planning: true
            },
            banquet: {
                label: 'Banquet & Événementiel',
                planning: true
            },
            reception: {
                label: 'Réception',
                planning: false
            },
            conciergerie: {
                label: 'Conciergerie',
                planning: false
            },
            bagagerie_valet: {
                label: 'Bagagerie & Voiturier',
                planning: false
            },
            housekeeping: {
                label: 'Housekeeping',
                planning: false
            },
            lingerie: {
                label: 'Lingerie',
                planning: false
            },
            maintenance: {
                label: 'Maintenance',
                planning: false
            },
            securite: {
                label: 'Sécurité',
                planning: false
            },
            spa: {
                label: 'Spa & Bien-être',
                planning: false
            }
        };
        const ICHEF_BRIGADE_PROFILES_V169 = {
            kiosk: {
                label: 'Kiosque / petite vente',
                summary: 'Structure très légère avec polyvalence production, vente et caisse.',
                ratios: { server: 45, kitchen: 55, bar: 70, kitchenMin: 1 },
                departments: {
                    direction: ['Responsable kiosque'],
                    polyvalent: [
                        'Employé polyvalent production',
                        'Employé polyvalent service'
                    ],
                    caisse_vente: [
                        'Employé polyvalent vente',
                        'Caissier'
                    ]
                }
            },
            snack: {
                label: 'Snack / petite restauration',
                summary: 'Petite équipe avec cuisine simple, polyvalence et vente.',
                ratios: { server: 35, kitchen: 45, bar: 65, kitchenMin: 1 },
                departments: {
                    direction: ['Responsable établissement'],
                    cuisine: [
                        'Cuisinier',
                        'Commis de cuisine',
                        'Plongeur'
                    ],
                    polyvalent: ['Employé polyvalent'],
                    caisse_vente: ['Caissier / vente']
                }
            },
            cafe_bar: {
                label: 'Café / bar',
                summary: 'Équipe orientée service, bar et petite production.',
                ratios: { server: 30, kitchen: 55, bar: 35, kitchenMin: 1 },
                departments: {
                    direction: ['Responsable établissement'],
                    salle: [
                        'Responsable de salle',
                        'Serveur',
                        'Commis de salle'
                    ],
                    bar: [
                        'Chef barman',
                        'Barman',
                        'Barista',
                        'Commis bar'
                    ],
                    cuisine: [
                        'Cuisinier',
                        'Commis de cuisine'
                    ]
                }
            },
            small_restaurant: {
                label: 'Petit restaurant',
                summary: 'Brigade courte avec fonctions essentielles cuisine et salle.',
                ratios: { server: 28, kitchen: 38, bar: 55, kitchenMin: 1 },
                departments: {
                    cuisine: [
                        'Chef de cuisine',
                        'Second de cuisine',
                        'Commis de cuisine',
                        'Plongeur'
                    ],
                    salle: [
                        'Responsable de salle',
                        'Chef de rang',
                        'Serveur',
                        'Commis de salle'
                    ]
                }
            },
            restaurant: {
                label: 'Restaurant classique',
                summary: 'Brigade complète adaptée à un restaurant traditionnel.',
                ratios: { server: 25, kitchen: 35, bar: 50, kitchenMin: 1 },
                departments: {
                    cuisine: [
                        'Chef de cuisine',
                        'Sous-chef',
                        'Chef de partie',
                        'Commis de cuisine',
                        'Chef de plonge',
                        'Plongeur'
                    ],
                    salle: [
                        'Maître d’hôtel',
                        'Chef de rang',
                        'Demi-chef de rang',
                        'Commis de salle',
                        'Runner'
                    ],
                    bar: ['Barman', 'Serveur bar', 'Commis bar']
                }
            },
            high_capacity_restaurant: {
                label: 'Restaurant haute capacité',
                summary: 'Grosse brigade capable d’absorber un volume important de couverts.',
                ratios: { server: 20, kitchen: 28, bar: 38, kitchenMin: 2 },
                departments: {
                    direction: [
                        'Directeur de restaurant',
                        'Responsable F&B'
                    ],
                    cuisine: [
                        'Chef exécutif',
                        'Chef de cuisine',
                        'Sous-chef',
                        'Chef de partie',
                        'Demi-chef de partie',
                        'Commis de cuisine',
                        'Chef de plonge',
                        'Plongeur'
                    ],
                    patisserie: [
                        'Chef pâtissier',
                        'Sous-chef pâtissier',
                        'Commis pâtissier'
                    ],
                    salle: [
                        'Maître d’hôtel',
                        'Assistant maître d’hôtel',
                        'Chef de rang',
                        'Demi-chef de rang',
                        'Commis de salle',
                        'Runner'
                    ],
                    bar: [
                        'Chef barman',
                        'Barman',
                        'Serveur bar',
                        'Commis bar'
                    ]
                }
            },
            large_brasserie: {
                label: 'Grande brasserie',
                summary: 'Très grosse brigade cuisine / salle / bar pour une forte rotation.',
                ratios: { server: 18, kitchen: 25, bar: 35, kitchenMin: 2 },
                departments: {
                    direction: [
                        'Directeur de brasserie',
                        'Responsable F&B'
                    ],
                    cuisine: [
                        'Chef exécutif',
                        'Chef de cuisine',
                        'Sous-chef',
                        'Chef de partie',
                        'Demi-chef de partie',
                        'Commis de cuisine',
                        'Chef de plonge',
                        'Plongeur'
                    ],
                    patisserie: [
                        'Chef pâtissier',
                        'Commis pâtissier'
                    ],
                    salle: [
                        'Directeur de salle',
                        'Maître d’hôtel',
                        'Assistant maître d’hôtel',
                        'Chef de rang',
                        'Demi-chef de rang',
                        'Commis de salle',
                        'Runner'
                    ],
                    bar: [
                        'Bar Manager',
                        'Chef barman',
                        'Barman',
                        'Serveur bar',
                        'Commis bar'
                    ]
                }
            },
            gastronomic: {
                label: 'Restaurant gastronomique',
                summary: 'Brigade hiérarchisée avec spécialisation cuisine, pâtisserie et service.',
                ratios: { server: 16, kitchen: 22, bar: 35, kitchenMin: 2 },
                departments: {
                    direction: [
                        'Directeur de restaurant',
                        'Responsable F&B'
                    ],
                    cuisine: [
                        'Chef exécutif',
                        'Chef de cuisine',
                        'Sous-chef',
                        'Chef de partie',
                        'Demi-chef de partie',
                        'Commis de cuisine',
                        'Chef de plonge',
                        'Plongeur'
                    ],
                    patisserie: [
                        'Chef pâtissier',
                        'Sous-chef pâtissier',
                        'Chef de partie pâtisserie',
                        'Commis pâtissier'
                    ],
                    salle: [
                        'Directeur de salle',
                        'Maître d’hôtel',
                        'Assistant maître d’hôtel',
                        'Chef de rang',
                        'Demi-chef de rang',
                        'Commis de salle',
                        'Runner'
                    ],
                    bar: [
                        'Chef barman',
                        'Barman',
                        'Serveur bar'
                    ]
                }
            },
            hotel_no_restaurant: {
                label: 'Hôtel sans restaurant',
                summary: 'Uniquement les métiers hôteliers : aucune brigade cuisine / salle / bar imposée.',
                ratios: { server: 25, kitchen: 35, bar: 50, kitchenMin: 1 },
                departments: {
                    direction: [
                        'Directeur général',
                        'Directeur d’exploitation'
                    ],
                    reception: [
                        'Front Office Manager',
                        'Chef de réception',
                        'Assistant chef de réception',
                        'Réceptionniste',
                        'Night Auditor'
                    ],
                    conciergerie: [
                        'Chef Concierge',
                        'Concierge'
                    ],
                    bagagerie_valet: [
                        'Chef bagagiste',
                        'Bagagiste',
                        'Chef voiturier',
                        'Voiturier'
                    ],
                    housekeeping: [
                        'Gouvernante générale',
                        'Assistante gouvernante',
                        'Gouvernante d’étage',
                        'Femme de chambre',
                        'Valet de chambre',
                        'Équipier d’étage'
                    ],
                    lingerie: [
                        'Responsable lingerie',
                        'Lingère'
                    ],
                    maintenance: [
                        'Responsable maintenance',
                        'Technicien maintenance'
                    ],
                    securite: [
                        'Responsable sécurité',
                        'Agent de sécurité'
                    ],
                    spa: [
                        'Spa Manager',
                        'Réceptionniste Spa',
                        'Praticien Spa'
                    ]
                }
            },
            hotel_restaurant: {
                label: 'Hôtel avec restaurant',
                summary: 'Brigade hôtelière + restauration, petit-déjeuner et room service.',
                ratios: { server: 22, kitchen: 30, bar: 42, kitchenMin: 2 },
                departments: {
                    direction: [
                        'Directeur général',
                        'Directeur F&B'
                    ],
                    cuisine: [
                        'Chef exécutif',
                        'Chef de cuisine',
                        'Sous-chef',
                        'Chef de partie',
                        'Demi-chef de partie',
                        'Commis de cuisine',
                        'Chef de plonge',
                        'Plongeur'
                    ],
                    salle: [
                        'Maître d’hôtel',
                        'Chef de rang',
                        'Demi-chef de rang',
                        'Commis de salle',
                        'Runner'
                    ],
                    bar: [
                        'Chef barman',
                        'Barman',
                        'Serveur bar',
                        'Commis bar'
                    ],
                    roomservice: [
                        'Responsable Room Service',
                        'Chef de rang Room Service',
                        'Commis Room Service',
                        'Runner Room Service'
                    ],
                    petit_dejeuner: [
                        'Responsable petit-déjeuner',
                        'Chef de rang petit-déjeuner',
                        'Commis petit-déjeuner'
                    ],
                    reception: [
                        'Front Office Manager',
                        'Chef de réception',
                        'Réceptionniste',
                        'Night Auditor'
                    ],
                    conciergerie: ['Concierge'],
                    bagagerie_valet: ['Bagagiste', 'Voiturier'],
                    housekeeping: [
                        'Gouvernante générale',
                        'Gouvernante d’étage',
                        'Femme de chambre',
                        'Valet de chambre',
                        'Équipier d’étage'
                    ],
                    lingerie: ['Responsable lingerie', 'Lingère'],
                    maintenance: ['Responsable maintenance', 'Technicien maintenance']
                }
            },
            hotel_4_5: {
                label: 'Hôtel 4★ / 5★',
                summary: 'Organisation hôtelière complète avec F&B, room service et housekeeping renforcé.',
                ratios: { server: 20, kitchen: 27, bar: 38, kitchenMin: 2 },
                departments: {
                    direction: [
                        'Directeur général',
                        'Directeur d’exploitation',
                        'Directeur F&B',
                        'Assistant F&B Manager'
                    ],
                    cuisine: [
                        'Chef exécutif',
                        'Chef de cuisine',
                        'Sous-chef',
                        'Chef de partie',
                        'Demi-chef de partie',
                        'Commis de cuisine',
                        'Chef de plonge',
                        'Plongeur'
                    ],
                    patisserie: [
                        'Chef pâtissier',
                        'Commis pâtissier'
                    ],
                    salle: [
                        'Directeur de restaurant',
                        'Maître d’hôtel',
                        'Assistant maître d’hôtel',
                        'Chef de rang',
                        'Demi-chef de rang',
                        'Commis de salle',
                        'Runner'
                    ],
                    bar: [
                        'Bar Manager',
                        'Chef barman',
                        'Barman',
                        'Serveur bar',
                        'Commis bar'
                    ],
                    roomservice: [
                        'Room Service Manager',
                        'Superviseur Room Service',
                        'Chef de rang Room Service',
                        'Commis Room Service',
                        'Runner Room Service'
                    ],
                    petit_dejeuner: [
                        'Responsable petit-déjeuner',
                        'Chef de rang petit-déjeuner',
                        'Commis petit-déjeuner'
                    ],
                    banquet: [
                        'Banquet Manager',
                        'Maître d’hôtel Banquet',
                        'Chef de rang Banquet',
                        'Commis Banquet'
                    ],
                    reception: [
                        'Front Office Manager',
                        'Chef de réception',
                        'Assistant chef de réception',
                        'Réceptionniste',
                        'Night Auditor'
                    ],
                    conciergerie: [
                        'Chef Concierge',
                        'Concierge'
                    ],
                    bagagerie_valet: [
                        'Chef bagagiste',
                        'Bagagiste',
                        'Chef voiturier',
                        'Voiturier'
                    ],
                    housekeeping: [
                        'Gouvernante générale',
                        'Assistante gouvernante',
                        'Gouvernante d’étage',
                        'Femme de chambre',
                        'Valet de chambre',
                        'Équipier d’étage'
                    ],
                    lingerie: [
                        'Responsable lingerie',
                        'Lingère'
                    ],
                    maintenance: [
                        'Responsable maintenance',
                        'Technicien maintenance'
                    ],
                    securite: [
                        'Responsable sécurité',
                        'Agent de sécurité'
                    ],
                    spa: [
                        'Spa Manager',
                        'Réceptionniste Spa',
                        'Praticien Spa'
                    ]
                }
            },
            palace: {
                label: 'Palace / très grande brigade',
                summary: 'Brigade maximale : restauration, hébergement et services haut de gamme.',
                ratios: { server: 14, kitchen: 18, bar: 28, kitchenMin: 3 },
                departments: {
                    direction: [
                        'Directeur général',
                        'Directeur d’exploitation',
                        'Directeur F&B',
                        'Assistant F&B Manager'
                    ],
                    cuisine: [
                        'Chef exécutif',
                        'Sous-chef exécutif',
                        'Chef de cuisine',
                        'Sous-chef',
                        'Chef de partie',
                        'Demi-chef de partie',
                        'Commis de cuisine',
                        'Chef de plonge',
                        'Plongeur'
                    ],
                    patisserie: [
                        'Chef pâtissier exécutif',
                        'Chef pâtissier',
                        'Sous-chef pâtissier',
                        'Chef de partie pâtisserie',
                        'Demi-chef pâtisserie',
                        'Commis pâtissier'
                    ],
                    salle: [
                        'Directeur de restaurant',
                        'Directeur de salle',
                        'Maître d’hôtel',
                        'Assistant maître d’hôtel',
                        'Chef de rang',
                        'Demi-chef de rang',
                        'Commis de salle',
                        'Runner'
                    ],
                    bar: [
                        'Bar Manager',
                        'Chef barman',
                        'Assistant chef barman',
                        'Barman',
                        'Serveur bar',
                        'Commis bar'
                    ],
                    roomservice: [
                        'Room Service Manager',
                        'Assistant Room Service Manager',
                        'Superviseur Room Service',
                        'Chef de rang Room Service',
                        'Demi-chef de rang Room Service',
                        'Commis Room Service',
                        'Runner Room Service'
                    ],
                    petit_dejeuner: [
                        'Responsable petit-déjeuner',
                        'Maître d’hôtel petit-déjeuner',
                        'Chef de rang petit-déjeuner',
                        'Demi-chef de rang petit-déjeuner',
                        'Commis petit-déjeuner'
                    ],
                    banquet: [
                        'Banquet Manager',
                        'Assistant Banquet Manager',
                        'Maître d’hôtel Banquet',
                        'Chef de rang Banquet',
                        'Demi-chef de rang Banquet',
                        'Commis Banquet',
                        'Runner Banquet'
                    ],
                    reception: [
                        'Front Office Manager',
                        'Chef de réception',
                        'Assistant chef de réception',
                        'Superviseur réception',
                        'Réceptionniste',
                        'Night Manager',
                        'Night Auditor'
                    ],
                    conciergerie: [
                        'Chef Concierge',
                        'Assistant Chef Concierge',
                        'Concierge'
                    ],
                    bagagerie_valet: [
                        'Chef bagagiste',
                        'Bagagiste',
                        'Chef voiturier',
                        'Voiturier'
                    ],
                    housekeeping: [
                        'Gouvernante générale',
                        'Assistante gouvernante générale',
                        'Gouvernante d’étage',
                        'Assistante gouvernante d’étage',
                        'Femme de chambre',
                        'Valet de chambre',
                        'Équipier d’étage'
                    ],
                    lingerie: [
                        'Responsable lingerie',
                        'Chef lingère',
                        'Lingère'
                    ],
                    maintenance: [
                        'Directeur technique',
                        'Responsable maintenance',
                        'Technicien maintenance'
                    ],
                    securite: [
                        'Directeur sécurité',
                        'Responsable sécurité',
                        'Agent de sécurité'
                    ],
                    spa: [
                        'Spa Director',
                        'Spa Manager',
                        'Réceptionniste Spa',
                        'Praticien Spa'
                    ]
                }
            },
            custom: {
                label: 'Configuration personnalisée',
                summary: 'La Direction choisit librement les départements et métiers.',
                ratios: { server: 25, kitchen: 35, bar: 50, kitchenMin: 1 },
                departments: {}
            }
        };
        function brigadeRoleKeyV169(dept, role) {
            return `${String(dept || '')}::${String(role || '')}`;
        }
        function brigadePresetRoleKeysV169(profileKey) {
            const profile =
                ICHEF_BRIGADE_PROFILES_V169[
                    profileKey
                ] ||
                ICHEF_BRIGADE_PROFILES_V169.restaurant;
            const keys = [];
            Object
                .entries(profile.departments || {})
                .forEach(([dept, roles]) => {
                    brigadeRolesWithSupplementsV174(
                        dept,
                        roles
                    )
                        .forEach(role => {
                            keys.push(
                                brigadeRoleKeyV169(
                                    dept,
                                    role
                                )
                            );
                        });
                });
            return keys;
        }
        function normalizeBrigadeRoleKeysV169(value, profileKey) {
            const fallback =
                brigadePresetRoleKeysV169(
                    profileKey
                );
            const rows =
                Array.isArray(value)
                    ? value
                    : [];
            const cleaned =
                Array.from(
                    new Set(
                        rows
                            .map(v => String(v || '').trim())
                            .filter(v => v.includes('::'))
                    )
                );
            return cleaned.length
                ? cleaned
                : fallback;
        }
        function readBrigadeRolesFormV169() {
            return Array.from(
                document.querySelectorAll(
                    '[data-v169-brigade-role]:checked'
                )
            ).map(input =>
                String(
                    input.dataset.v169BrigadeRole || ''
                )
            ).filter(Boolean);
        }
        function activeBrigadeDepartmentsV169(settings) {
            const profileKey =
                String(
                    settings?.planningEstablishmentProfile ||
                    'restaurant'
                );
            const keys =
                normalizeBrigadeRoleKeysV169(
                    settings?.planningBrigadeRoles,
                    profileKey
                );
            return Array.from(
                new Set(
                    keys
                        .map(key => key.split('::')[0])
                        .filter(Boolean)
                )
            );
        }
        function assistantPlanningDepartmentsV169(settings, staffList = []) {
            const active =
                activeBrigadeDepartmentsV169(
                    settings
                );
            const planningDepartments =
                active.filter(dept =>
                    ICHEF_BRIGADE_DEPARTMENTS_V169[
                        dept
                    ]?.planning === true
                );
            // Compatibilité avec les anciennes installations.
            if (!planningDepartments.length) {
                const old = [
                    'cuisine',
                    'salle',
                    'bar',
                    'patisserie'
                ];
                return old.filter(dept =>
                    (staffList || []).some(staff =>
                        assistantStaffCanCoverDept(
                            staff,
                            dept
                        )
                    )
                );
            }
            return planningDepartments;
        }
        // ============================================================
        // V171 · CARTES PROFIL + EFFECTIFS DE RÉFÉRENCE
        // ============================================================
        function brigadeDefaultCountV171(profileKey, dept, role) {
            const key = String(profileKey || 'restaurant');
            const text = String(role || '').toLowerCase();
            let count = 1;
            if (
                ['high_capacity_restaurant','large_brasserie','hotel_4_5','palace']
                    .includes(key)
            ) {
                if (
                    text.includes('commis') ||
                    text.includes('runner') ||
                    text.includes('plongeur') ||
                    text.includes('femme de chambre') ||
                    text.includes('valet de chambre') ||
                    text.includes('réceptionniste') ||
                    text.includes('receptionniste') ||
                    text.includes('chef de rang')
                ) {
                    count = key === 'palace' ? 4 : 3;
                }
                if (
                    text.includes('chef de partie') ||
                    text.includes('demi-chef') ||
                    text.includes('barman') ||
                    text.includes('bagagiste') ||
                    text.includes('voiturier') ||
                    text.includes('gouvernante d’étage') ||
                    text.includes("gouvernante d'etage")
                ) {
                    count = key === 'palace' ? 3 : 2;
                }
                if (
                    text.includes('sous-chef') &&
                    !text.includes('exécutif')
                ) {
                    count = key === 'palace' ? 3 : 2;
                }
            }
            if (
                key === 'hotel_no_restaurant' &&
                (
                    text.includes('femme de chambre') ||
                    text.includes('valet de chambre')
                )
            ) {
                count = 4;
            }
            if (
                key === 'snack' &&
                text.includes('employé polyvalent')
            ) {
                count = 2;
            }
            return Math.max(1, count);
        }
        function defaultBrigadeRoleCountsV171(profileKey) {
            const profile =
                ICHEF_BRIGADE_PROFILES_V169[profileKey] ||
                ICHEF_BRIGADE_PROFILES_V169.restaurant;
            const out = {};
            Object.entries(profile.departments || {})
                .forEach(([dept, roles]) => {
                    brigadeRolesWithSupplementsV174(
                        dept,
                        roles
                    )
                        .forEach(role => {
                            out[
                                brigadeRoleKeyV169(dept, role)
                            ] =
                                brigadeDefaultCountV171(
                                    profileKey,
                                    dept,
                                    role
                                );
                        });
                });
            return out;
        }
        function normalizeBrigadeRoleCountsV171(value, profileKey) {
            const defaults =
                defaultBrigadeRoleCountsV171(profileKey);
            const source =
                value &&
                typeof value === 'object' &&
                !Array.isArray(value)
                    ? value
                    : {};
            const out = { ...defaults };
            Object.entries(source)
                .forEach(([key, value]) => {
                    if (!String(key).includes('::')) return;
                    out[key] =
                        Math.max(
                            0,
                            Math.min(
                                99,
                                Math.round(
                                    Number(value) || 0
                                )
                            )
                        );
                });
            return out;
        }
        function readBrigadeRoleCountsV171() {
            const out = {};
            document
                .querySelectorAll(
                    '[data-v171-brigade-count]'
                )
                .forEach(input => {
                    const key =
                        String(
                            input.dataset.v171BrigadeCount || ''
                        );
                    if (!key) return;
                    out[key] =
                        Math.max(
                            0,
                            Math.min(
                                99,
                                Math.round(
                                    Number(input.value) || 0
                                )
                            )
                        );
                });
            return out;
        }
        function renderRhProfileCardsV171(activeKey) {
            const strip =
                document.getElementById(
                    'v171-profile-strip'
                );
            if (!strip) return;
            const order = [
                'kiosk',
                'snack',
                'cafe_bar',
                'small_restaurant',
                'restaurant',
                'high_capacity_restaurant',
                'large_brasserie',
                'gastronomic',
                'hotel_no_restaurant',
                'hotel_restaurant',
                'hotel_4_5',
                'palace',
                'custom'
            ];
            const labels = {
                kiosk: 'Kiosque',
                snack: 'Snack',
                cafe_bar: 'Café / Bar',
                small_restaurant: 'Petit restaurant',
                restaurant: 'Restaurant classique',
                high_capacity_restaurant: 'Haute capacité',
                large_brasserie: 'Grande brasserie',
                gastronomic: 'Gastronomique',
                hotel_no_restaurant: 'Hôtel sans restaurant',
                hotel_restaurant: 'Hôtel + restaurant',
                hotel_4_5: 'Hôtel 4★ / 5★',
                palace: 'Palace',
                custom: 'Personnalisé'
            };
            const symbols = {
                kiosk: 'K',
                snack: 'S',
                cafe_bar: 'B',
                small_restaurant: 'R',
                restaurant: 'R',
                high_capacity_restaurant: 'HC',
                large_brasserie: 'GB',
                gastronomic: 'G',
                hotel_no_restaurant: 'H',
                hotel_restaurant: 'HR',
                hotel_4_5: '5★',
                palace: 'P',
                custom: '+'
            };
            strip.innerHTML =
                order
                    .filter(key =>
                        ICHEF_BRIGADE_PROFILES_V169[key]
                    )
                    .map(key => {
                        const selected =
                            key === activeKey;
                        return `
                            <button
                                type="button"
                                class="v171-profile-card ${selected ? 'is-active' : ''}"
                                data-v171-profile="${escapeRhHtml(key)}"
                                aria-pressed="${selected ? 'true' : 'false'}"
                            >
                                <strong class="v173-profile-title">${escapeRhHtml(labels[key] || key)}</strong>
                                ${selected ? '<i>✓</i>' : ''}
                            </button>
                        `;
                    })
                    .join('');
            strip.scrollLeft = 0;
            strip
                .querySelectorAll('[data-v171-profile]')
                .forEach(button => {
                    button.addEventListener(
                        'click',
                        () => {
                            const key =
                                String(
                                    button.dataset.v171Profile ||
                                    'restaurant'
                                );
                            const select =
                                document.getElementById(
                                    'rh-setting-establishment-profile'
                                );
                            if (select) {
                                select.value = key;
                            }
                            applyRhEstablishmentProfileV169(
                                key,
                                false
                            );
                            renderRhProfileCardsV171(key);
                        }
                    );
                });
        }
        // ============================================================
        // V179 · RATIOS PAR MÉTIER
        // ============================================================
        function brigadeRoleHasRatioV179(role) {
            const text =
                String(role || '')
                    .trim()
                    .toLowerCase();
            return !(
                text.startsWith('apprenti') ||
                text.startsWith('extra')
            );
        }
        function brigadeRoleRatioMetricV179(dept) {
            const d =
                String(dept || '');
            if (
                [
                    'reception',
                    'conciergerie',
                    'bagagerie_valet',
                    'housekeeping',
                    'lingerie',
                    'maintenance',
                    'securite',
                    'spa'
                ].includes(d)
            ) {
                return {
                    key: 'rooms',
                    short: 'ch.',
                    label: 'chambres'
                };
            }
            if (
                [
                    'cuisine',
                    'patisserie',
                    'salle',
                    'bar',
                    'roomservice',
                    'petit_dejeuner',
                    'banquet'
                ].includes(d)
            ) {
                return {
                    key: 'covers',
                    short: 'couv.',
                    label: 'couverts'
                };
            }
            return {
                key: 'activity',
                short: 'act.',
                label: 'unités d’activité'
            };
        }
        function brigadeBaseRatioV179(profileKey, dept) {
            const profile =
                ICHEF_BRIGADE_PROFILES_V169[
                    profileKey
                ] ||
                ICHEF_BRIGADE_PROFILES_V169.restaurant;
            if (dept === 'salle') {
                return Number(
                    profile.ratios?.server || 25
                );
            }
            if (
                dept === 'cuisine' ||
                dept === 'patisserie'
            ) {
                return Number(
                    profile.ratios?.kitchen || 35
                );
            }
            if (dept === 'bar') {
                return Number(
                    profile.ratios?.bar || 50
                );
            }
            if (
                [
                    'roomservice',
                    'petit_dejeuner',
                    'banquet'
                ].includes(dept)
            ) {
                return Number(
                    profile.ratios?.server || 25
                );
            }
            // Hôtel : valeur de départ exprimée en chambres.
            if (dept === 'housekeeping') return 15;
            if (dept === 'reception') return 40;
            if (dept === 'conciergerie') return 55;
            if (dept === 'bagagerie_valet') return 35;
            if (dept === 'lingerie') return 35;
            if (dept === 'maintenance') return 60;
            if (dept === 'securite') return 70;
            if (dept === 'spa') return 25;
            return 40;
        }
        function brigadeDefaultRoleRatioV179(
            profileKey,
            dept,
            role
        ) {
            if (!brigadeRoleHasRatioV179(role)) {
                return null;
            }
            const base =
                Math.max(
                    1,
                    Number(
                        brigadeBaseRatioV179(
                            profileKey,
                            dept
                        )
                    ) || 25
                );
            const text =
                String(role || '')
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '')
                    .toLowerCase();
            let factor = 1;
            if (
                /(directeur general|directeur d'exploitation|directeur f&b|executif|executive|chef concierge|front office manager|bar manager|banquet manager|room service manager|spa director|directeur technique|directeur securite)/.test(text)
            ) {
                factor = 4;
            } else if (
                /(directeur|chef de cuisine|maitre d'hotel|maitre hotel|gouvernante generale|chef de reception|responsable|chef barman|chef patissier|chef de plonge|night manager)/.test(text)
            ) {
                factor = 3;
            } else if (
                /(sous-chef|sous chef|assistant|superviseur|chef de partie|chef de rang|gouvernante d'etage|chef bagagiste|chef voiturier|night auditor)/.test(text)
            ) {
                factor = 2;
            } else if (
                /(demi-chef|demi chef)/.test(text)
            ) {
                factor = 1.4;
            } else if (
                /(commis|runner|serveur|barman|barista|receptionniste|concierge|bagagiste|voiturier|femme de chambre|valet de chambre|equipier|lingere|technicien|agent de securite|praticien)/.test(text)
            ) {
                factor = 1;
            }
            // Cas spécifiques cohérents avec le métier.
            if (dept === 'housekeeping') {
                if (/gouvernante generale/.test(text)) factor = 8;
                else if (/gouvernante/.test(text)) factor = 4;
                else if (/(femme de chambre|valet de chambre)/.test(text)) factor = 1;
                else if (/equipier/.test(text)) factor = 2;
            }
            if (dept === 'salle') {
                if (/chef de rang/.test(text)) factor = 1;
                if (/commis de salle/.test(text)) factor = 1.2;
                if (/runner/.test(text)) factor = 1.4;
            }
            if (dept === 'bar') {
                if (/serveur bar/.test(text)) factor = 0.65;
                if (/barman/.test(text) && !/chef/.test(text)) factor = 0.85;
                if (/commis bar/.test(text)) factor = 1.15;
            }
            return Math.max(
                1,
                Math.round(base * factor)
            );
        }
        function defaultBrigadeRoleRatiosV179(profileKey) {
            const profile =
                ICHEF_BRIGADE_PROFILES_V169[
                    profileKey
                ] ||
                ICHEF_BRIGADE_PROFILES_V169.restaurant;
            const out = {};
            Object
                .entries(
                    profile.departments || {}
                )
                .forEach(([dept, roles]) => {
                    brigadeRolesWithSupplementsV174(
                        dept,
                        roles
                    )
                        .forEach(role => {
                            if (
                                !brigadeRoleHasRatioV179(
                                    role
                                )
                            ) {
                                return;
                            }
                            const roleKey =
                                brigadeRoleKeyV169(
                                    dept,
                                    role
                                );
                            out[roleKey] =
                                brigadeDefaultRoleRatioV179(
                                    profileKey,
                                    dept,
                                    role
                                );
                        });
                });
            return out;
        }
        function normalizeBrigadeRoleRatiosV179(
            value,
            profileKey
        ) {
            const defaults =
                defaultBrigadeRoleRatiosV179(
                    profileKey
                );
            const source =
                value &&
                typeof value === 'object' &&
                !Array.isArray(value)
                    ? value
                    : {};
            const out = {
                ...defaults
            };
            Object
                .entries(source)
                .forEach(([key, value]) => {
                    if (
                        !String(key).includes('::')
                    ) {
                        return;
                    }
                    const role =
                        String(key)
                            .split('::')
                            .slice(1)
                            .join('::');
                    if (
                        !brigadeRoleHasRatioV179(
                            role
                        )
                    ) {
                        delete out[key];
                        return;
                    }
                    out[key] =
                        Math.max(
                            1,
                            Math.min(
                                999,
                                Math.round(
                                    Number(value) || 1
                                )
                            )
                        );
                });
            return out;
        }
        function readBrigadeRoleRatiosV179() {
            const out = {};
            document
                .querySelectorAll(
                    '[data-v179-brigade-ratio]'
                )
                .forEach(input => {
                    const key =
                        String(
                            input.dataset
                                .v179BrigadeRatio ||
                            ''
                        );
                    if (!key) return;
                    out[key] =
                        Math.max(
                            1,
                            Math.min(
                                999,
                                Math.round(
                                    Number(
                                        input.value
                                    ) || 1
                                )
                            )
                        );
                });
            return out;
        }
        // ============================================================
        // V174 · RENFORTS APPRENTI / EXTRA + CARTES AGRANDISSABLES
        // ============================================================
        function brigadeSupplementalRolesV174(dept) {
            const operational = new Set([
                'polyvalent',
                'caisse_vente',
                'cuisine',
                'patisserie',
                'salle',
                'bar',
                'roomservice',
                'petit_dejeuner',
                'banquet',
                'reception',
                'conciergerie',
                'bagagerie_valet',
                'housekeeping',
                'lingerie',
                'maintenance',
                'spa'
            ]);
            if (!operational.has(String(dept || ''))) {
                return [];
            }
            const label =
                ICHEF_BRIGADE_DEPARTMENTS_V169?.[dept]?.label ||
                String(dept || '');
            return [
                `Apprenti · ${label}`,
                `Extra · ${label}`
            ];
        }
        function brigadeRolesWithSupplementsV174(dept, roles) {
            const base =
                Array.isArray(roles)
                    ? [...roles]
                    : [];
            if (
                dept === 'bar' &&
                !base.some(role =>
                    /serveur\s*bar/i.test(String(role || ''))
                )
            ) {
                const commisIndex =
                    base.findIndex(role =>
                        /commis\s*bar/i.test(String(role || ''))
                    );
                if (commisIndex >= 0) {
                    base.splice(
                        commisIndex,
                        0,
                        'Serveur bar'
                    );
                } else {
                    base.push('Serveur bar');
                }
            }
            brigadeSupplementalRolesV174(dept)
                .forEach(role => {
                    if (!base.includes(role)) {
                        base.push(role);
                    }
                });
            return base;
        }
        function closeExpandedBrigadeV175(card) {
            if (!card) return;
            card.classList.remove(
                'is-expanded-v174',
                'is-expanded-v175'
            );
            document.documentElement
                .classList
                .remove(
                    'v175-brigade-focus-open'
                );
        }
        function openExpandedBrigadeV175(card) {
            if (!card) return;
            document
                .querySelectorAll(
                    '#v169-brigade-container [data-v169-department].is-expanded-v175'
                )
                .forEach(other => {
                    if (other !== card) {
                        closeExpandedBrigadeV175(other);
                    }
                });
            card.classList.add(
                'is-expanded-v174',
                'is-expanded-v175'
            );
            document.documentElement
                .classList
                .add(
                    'v175-brigade-focus-open'
                );
            setTimeout(
                () => {
                    card.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center'
                    });
                },
                30
            );
        }
        // Compatibilité interne V174.
        function toggleBrigadeDepartmentSizeV174(button) {
            const card =
                button?.closest?.(
                    '[data-v169-department]'
                );
            if (!card) return;
            if (
                card.classList.contains(
                    'is-expanded-v175'
                )
            ) {
                closeExpandedBrigadeV175(card);
            } else {
                openExpandedBrigadeV175(card);
            }
        }
        function renderRhBrigadeV169(settings, usePreset = false) {
            // V177 · évite qu'un ancien état d'agrandissement laisse
            // les autres cartes grisées après un re-rendu.
            document.documentElement.classList.remove(
                'v175-brigade-focus-open'
            );
            const container =
                document.getElementById(
                    'v169-brigade-container'
                );
            if (!container) return;
            const select =
                document.getElementById(
                    'rh-setting-establishment-profile'
                );
            const profileKey =
                String(
                    select?.value ||
                    settings?.planningEstablishmentProfile ||
                    'restaurant'
                );
            const profile =
                ICHEF_BRIGADE_PROFILES_V169[profileKey] ||
                ICHEF_BRIGADE_PROFILES_V169.restaurant;
            const selected =
                new Set(
                    usePreset
                        ? brigadePresetRoleKeysV169(profileKey)
                        : normalizeBrigadeRoleKeysV169(
                            settings?.planningBrigadeRoles,
                            profileKey
                          )
                );
            const counts =
                usePreset
                    ? defaultBrigadeRoleCountsV171(profileKey)
                    : normalizeBrigadeRoleCountsV171(
                        settings?.planningBrigadeRoleCounts,
                        profileKey
                      );
            const ratios =
                usePreset
                    ? defaultBrigadeRoleRatiosV179(
                        profileKey
                      )
                    : normalizeBrigadeRoleRatiosV179(
                        settings?.planningBrigadeRoleRatios,
                        profileKey
                      );
            renderRhProfileCardsV171(profileKey);
            const summary =
                document.getElementById(
                    'v169-profile-summary'
                );
            if (summary) {
                summary.innerHTML =
                    `<strong>${escapeRhHtml(profile.label)}</strong>` +
                    `<span>${escapeRhHtml(profile.summary)}</span>`;
            }
            const title =
                document.getElementById(
                    'v171-brigade-title'
                );
            if (title) {
                title.textContent =
                    `BRIGADE SUGGÉRÉE · ${String(profile.label || '').toUpperCase()}`;
            }
            if (
                profileKey === 'custom' &&
                !Object.keys(profile.departments || {}).length
            ) {
                container.innerHTML =
                    `<div class="v169-empty-brigade">Configuration personnalisée : choisissez d’abord le profil le plus proche, puis adaptez les métiers et effectifs à votre établissement.</div>`;
                return;
            }
            container.innerHTML =
                Object
                    .entries(profile.departments || {})
                    .map(([dept, roles]) => {
                        const meta =
                            ICHEF_BRIGADE_DEPARTMENTS_V169[dept] ||
                            { label: dept };
                        const displayRoles =
                            brigadeRolesWithSupplementsV174(
                                dept,
                                roles
                            );
                        const roleRows =
                            displayRoles
                                .map(role => {
                                    const roleKey =
                                        brigadeRoleKeyV169(
                                            dept,
                                            role
                                        );
                                    const count =
                                        Math.max(
                                            0,
                                            Number(
                                                counts[roleKey] ??
                                                brigadeDefaultCountV171(
                                                    profileKey,
                                                    dept,
                                                    role
                                                )
                                            ) || 0
                                        );
                                    const isApprentice =
                                        /^Apprenti\s*·/i.test(
                                            String(role || '')
                                        );
                                    const isExtra =
                                        /^Extra\s*·/i.test(
                                            String(role || '')
                                        );
                                    const ratioEnabled =
                                        !isApprentice &&
                                        !isExtra &&
                                        brigadeRoleHasRatioV179(
                                            role
                                        );
                                    const ratioMetric =
                                        brigadeRoleRatioMetricV179(
                                            dept
                                        );
                                    const ratioValue =
                                        ratioEnabled
                                            ? Math.max(
                                                1,
                                                Number(
                                                    ratios[roleKey] ??
                                                    brigadeDefaultRoleRatioV179(
                                                        profileKey,
                                                        dept,
                                                        role
                                                    )
                                                ) || 1
                                              )
                                            : null;
                                    return `
                                        <div class="v169-role v171-role ${isApprentice ? 'is-apprentice-v174' : ''} ${isExtra ? 'is-extra-v174' : ''}">
                                            <label class="v171-role-main">
                                                <input
                                                    type="checkbox"
                                                    data-v169-brigade-role="${escapeRhHtml(roleKey)}"
                                                    ${selected.has(roleKey) ? 'checked' : ''}
                                                >
                                                <span>${escapeRhHtml(role)}</span>
                                            </label>

                                            <input
                                                class="v171-role-count"
                                                type="number"
                                                min="0"
                                                max="99"
                                                step="1"
                                                value="${escapeRhHtml(String(count))}"
                                                data-v171-brigade-count="${escapeRhHtml(roleKey)}"
                                                aria-label="Effectif ${escapeRhHtml(role)}"
                                                title="Effectif de référence"
                                            >

                                            ${ratioEnabled ? `
                                                <label
                                                    class="v179-role-ratio"
                                                    title="1 ${escapeRhHtml(role)} pour X ${escapeRhHtml(ratioMetric.label)}"
                                                >
                                                    <span>1 /</span>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        max="999"
                                                        step="1"
                                                        value="${escapeRhHtml(String(ratioValue))}"
                                                        data-v179-brigade-ratio="${escapeRhHtml(roleKey)}"
                                                        aria-label="Ratio ${escapeRhHtml(role)}"
                                                    >
                                                    <small>${escapeRhHtml(ratioMetric.short)}</small>
                                                </label>
                                            ` : `
                                                <span class="v179-no-ratio" title="Pas de ratio pour Apprenti / Extra">Aucun ratio</span>
                                            `}
                                        </div>
                                    `;
                                })
                                .join('');
                        return `
                            <div class="v169-department v171-department" data-v169-department="${escapeRhHtml(dept)}">
                                <div class="v169-department-head">
                                    <strong>${escapeRhHtml(meta.label)}</strong>

                                    <div class="v175-department-actions">
                                        <button
                                            type="button"
                                            class="v175-close-dept"
                                            data-v175-close-dept="${escapeRhHtml(dept)}"
                                            aria-label="Fermer"
                                            title="Fermer"
                                        >×</button>

                                        <button
                                            type="button"
                                            class="v169-dept-toggle"
                                            data-v169-toggle-dept="${escapeRhHtml(dept)}"
                                        >TOUT</button>
                                    </div>
                                </div>
                                <div class="v169-roles">
                                    ${roleRows}
                                </div>
                            </div>
                        `;
                    })
                    .join('');
            container
                .querySelectorAll(
                    '[data-v169-toggle-dept]'
                )
                .forEach(button => {
                    button.addEventListener(
                        'click',
                        () => {
                            const dept =
                                String(
                                    button.dataset.v169ToggleDept || ''
                                );
                            const rows =
                                Array.from(
                                    container.querySelectorAll(
                                        `[data-v169-department="${CSS.escape(dept)}"] [data-v169-brigade-role]`
                                    )
                                );
                            const allChecked =
                                rows.length > 0 &&
                                rows.every(input => input.checked);
                            rows.forEach(input => {
                                input.checked =
                                    !allChecked;
                            });
                        }
                    );
                });
            // V175 · APPUI LONG 0,5 s SUR LA CARTE = AGRANDIR
            container
                .querySelectorAll(
                    '[data-v169-department]'
                )
                .forEach(card => {
                    let holdTimer = null;
                    let startX = 0;
                    let startY = 0;
                    let longPressTriggered = false;
                    const clearHold = () => {
                        if (holdTimer) {
                            clearTimeout(holdTimer);
                            holdTimer = null;
                        }
                    };
                    const startHold = event => {
                        const target =
                            event.target;
                        // Ne pas déclencher l'agrandissement lorsqu'on
                        // manipule une case, un nombre ou le bouton TOUT/X.
                        if (
                            target?.closest?.(
                                'input, button, select, textarea, label'
                            )
                        ) {
                            return;
                        }
                        longPressTriggered = false;
                        const point =
                            event.touches?.[0] ||
                            event;
                        startX =
                            Number(
                                point?.clientX || 0
                            );
                        startY =
                            Number(
                                point?.clientY || 0
                            );
                        clearHold();
                        holdTimer =
                            setTimeout(
                                () => {
                                    longPressTriggered = true;
                                    openExpandedBrigadeV175(
                                        card
                                    );
                                },
                                500
                            );
                    };
                    const moveHold = event => {
                        if (!holdTimer) return;
                        const point =
                            event.touches?.[0] ||
                            event;
                        const dx =
                            Math.abs(
                                Number(
                                    point?.clientX || 0
                                ) - startX
                            );
                        const dy =
                            Math.abs(
                                Number(
                                    point?.clientY || 0
                                ) - startY
                            );
                        if (
                            dx > 12 ||
                            dy > 12
                        ) {
                            clearHold();
                        }
                    };
                    card.addEventListener(
                        'pointerdown',
                        startHold
                    );
                    card.addEventListener(
                        'pointermove',
                        moveHold
                    );
                    card.addEventListener(
                        'pointerup',
                        clearHold
                    );
                    card.addEventListener(
                        'pointercancel',
                        clearHold
                    );
                    card.addEventListener(
                        'pointerleave',
                        clearHold
                    );
                    // Compatibilité tactile pour navigateurs sans PointerEvent fiable.
                    card.addEventListener(
                        'touchstart',
                        startHold,
                        {
                            passive:true
                        }
                    );
                    card.addEventListener(
                        'touchmove',
                        moveHold,
                        {
                            passive:true
                        }
                    );
                    card.addEventListener(
                        'touchend',
                        clearHold
                    );
                    card.addEventListener(
                        'touchcancel',
                        clearHold
                    );
                    // Double clic reste un raccourci utile sur ordinateur.
                    card.addEventListener(
                        'dblclick',
                        event => {
                            if (
                                event.target?.closest?.(
                                    'input, button, select, textarea, label'
                                )
                            ) {
                                return;
                            }
                            openExpandedBrigadeV175(
                                card
                            );
                        }
                    );
                });
            // X = fermeture immédiate et retour taille normale.
            container
                .querySelectorAll(
                    '[data-v175-close-dept]'
                )
                .forEach(button => {
                    button.addEventListener(
                        'click',
                        event => {
                            event.preventDefault();
                            event.stopPropagation();
                            closeExpandedBrigadeV175(
                                button.closest(
                                    '[data-v169-department]'
                                )
                            );
                        }
                    );
                });
            container
                .querySelectorAll(
                    '[data-v169-brigade-role]'
                )
                .forEach(check => {
                    check.addEventListener(
                        'change',
                        () => {
                            const roleKey =
                                String(
                                    check.dataset.v169BrigadeRole || ''
                                );
                            const countInput =
                                container.querySelector(
                                    `[data-v171-brigade-count="${CSS.escape(roleKey)}"]`
                                );
                            if (
                                check.checked &&
                                countInput &&
                                Number(countInput.value || 0) <= 0
                            ) {
                                countInput.value = '1';
                            }
                        }
                    );
                });
        }
        function applyRhEstablishmentProfileV169(profileKey, notify = true) {
            const key =
                String(
                    profileKey ||
                    document.getElementById(
                        'rh-setting-establishment-profile'
                    )?.value ||
                    'restaurant'
                );
            const profile =
                ICHEF_BRIGADE_PROFILES_V169[
                    key
                ] ||
                ICHEF_BRIGADE_PROFILES_V169.restaurant;
            const setValue =
                (id, value) => {
                    const el =
                        document.getElementById(id);
                    if (el) el.value = value;
                };
            setValue(
                'rh-setting-server-ratio',
                profile.ratios?.server ?? 25
            );
            setValue(
                'rh-setting-kitchen-ratio',
                profile.ratios?.kitchen ?? 35
            );
            setValue(
                'rh-setting-bar-ratio',
                profile.ratios?.bar ?? 50
            );
            setValue(
                'rh-setting-kitchen-min',
                profile.ratios?.kitchenMin ?? 1
            );
            const current =
                getRhSettings();
            renderRhBrigadeV169(
                {
                    ...current,
                    planningEstablishmentProfile: key,
                    planningBrigadeRoles:
                        brigadePresetRoleKeysV169(
                            key
                        ),
                    planningBrigadeRoleCounts:
                        defaultBrigadeRoleCountsV171(
                            key
                        ),
                    planningBrigadeRoleRatios:
                        defaultBrigadeRoleRatiosV179(
                            key
                        )
                },
                true
            );
            if (
                notify &&
                typeof showToast === 'function'
            ) {
                showToast(
                    `Brigade ${profile.label} chargée`
                );
            }
        }
        function getRhSettings() {
            const defaults = {
                laborBudgetPct: 25,
                serverCoversRatio: 25,
                kitchenCoversRatio: 35,
                barCoversRatio: 50,
                // V169 · profil établissement / brigade
                planningEstablishmentProfile: 'restaurant',
                planningBrigadeRoles:
                    brigadePresetRoleKeysV169('restaurant'),
                planningBrigadeRoleCounts:
                    defaultBrigadeRoleCountsV171('restaurant'),
                planningBrigadeRoleRatios:
                    defaultBrigadeRoleRatiosV179('restaurant'),
                planningStatus: 'draft',
                // V202 · catalogue client des catégories/couleurs du planning
                planningStatusCatalogV202: null,
                currency: 'CHF',
                eventNotes: '',
                planningPriority: 'balanced',
                // V170 · niveau de service demandé par la Direction
                planningServiceLevel: 'standard',
                // V171 · prévisions issues de la caisse
                planningUseCashForecast: true,
                // V165 · prise de poste réelle distincte du début de service
                lunchWorkStart: '10:00',
                lunchWorkEnd: '14:45',
                lunchStart: '10:00',
                lunchEnd: '14:45',
                dinnerWorkStart: '18:00',
                dinnerWorkEnd: '22:45',
                dinnerStart: '18:00',
                dinnerEnd: '22:45',
                fullDayPause: 30,
                preserveExistingPlanning: true,
                preservePastDays: true,
                planningAutopilotEnabled: true,
                planningTakeoverHours: 48,
                planningTimezone: 'Europe/Paris',
                planningMode: 'autonomous',
                planningMonthlyLeadDays: 14,
                planningDaysOffPerWeek: 2,
                planningPreferConsecutiveOff: true,
                planningAutoRecovery: true,
                planningMaxRecoveryDaysPerMonth: 2,
                planningApprovedLeaveOnly: true,
                planningProtectedWeekdays: [],
                planningBlockPlannableLeaveOnProtectedDays: true,
                planningProtectPeakLeave: true,
                planningPeakProtectionCount: 6,
                planningPeakMinCovers: 40,
                planningPeakProtectionMinScore: 1.5,
                planningRebalanceOnReservations: true,
                planningRebalanceOnAntiRush: true,
                planningRebalanceOnAbsence: true,
                // V132 · stratégie d'exploitation
                serviceContinuousEnabled: true,
                serviceSplitEnabled: true,
                optimizeStaffChoice: true,
                managerServiceAdvisorEnabled: true,
                // V133 · couverture critique
                kitchenCriticalCoverageEnabled: true,
                kitchenMinQualifiedPerOpenService: 1,
                // V135 · jours de fermeture établissement
                planningClosedWeekdays: [],
                planningExceptionalClosedDates: [],
                // V168 · MIDI / SOIR ouverts selon le jour de la semaine
                planningServiceWeekdays:
                    defaultRhServiceWeekdaysV168(),
                // V142 · droit du travail applicable au client
                planningLegalCountry: 'CH',
                planningLegalFramework: 'CH_CCNT',
                planningLegalEstablishmentType: 'standard',
                planningLegalEnforcement: true,
                planningLegalReferenceDate: '2026-09-29',
                planningLegalCountryAuto: true,
                planningLegalCountrySource: 'tenant',
                // V180 · Suisse : le régime 7 jours n'est jamais appliqué
                // automatiquement. Il doit être activé explicitement et
                // toutes les conditions CCNT / OLT 2 sont ensuite contrôlées.
                planningSwissSevenDayException: false,
                planningSwissLegalVersion:
                    'CH-2026-09-29-CCNT-LTr-OLT1-OLT2',
                // V181 · France HCR strict
                planningFranceWorkTimeMode: 'weekly',
                planningFranceAnnualizationValidated: false,
                planningFranceNoticeValidated: false,
                planningFranceLegalVersion:
                    'FR-2026-09-29-HCR-IDCC1979-CODE-TRAVAIL',
                // Une fermeture n'est prise en compte qu'après confirmation
                // explicite dans la V142. Cela évite la contamination des
                // anciennes versions qui avaient pu enregistrer 7/7 fermé.
                planningClosureConfirmedV142: false
            };
            const saved =
                JSON.parse(localStorage.getItem('ichef_rh_settings') || 'null') ||
                {};
            let tenantLegal = {};
            try {
                const tenantKey =
                    `ichef_rh_legal_${String(
                        typeof tenantID_JS !== 'undefined'
                            ? tenantID_JS
                            : 'default'
                    )}`;
                tenantLegal =
                    JSON.parse(
                        localStorage.getItem(tenantKey) || '{}'
                    ) || {};
            } catch (_) {
                tenantLegal = {};
            }
            return {
                ...defaults,
                ...saved,
                ...tenantLegal
            };
        }
        function saveRhSettings(settings) {
            let previous = {};
            try {
                previous = JSON.parse(localStorage.getItem('ichef_rh_settings') || '{}') || {};
            } catch (_) {
                previous = {};
            }
            const source = {
                ...previous,
                ...(settings && typeof settings === 'object' ? settings : {})
            };
            const clean = {
                laborBudgetPct: Number(source.laborBudgetPct) || 0,
                serverCoversRatio: Math.max(1, Number(source.serverCoversRatio) || 25),
                kitchenCoversRatio: Math.max(1, Number(source.kitchenCoversRatio) || 35),
                barCoversRatio: Math.max(1, Number(source.barCoversRatio) || 50),
                planningEstablishmentProfile:
                    Object.prototype.hasOwnProperty.call(
                        ICHEF_BRIGADE_PROFILES_V169,
                        String(source.planningEstablishmentProfile || '')
                    )
                        ? String(source.planningEstablishmentProfile)
                        : 'restaurant',
                planningBrigadeRoles:
                    normalizeBrigadeRoleKeysV169(
                        source.planningBrigadeRoles,
                        Object.prototype.hasOwnProperty.call(
                            ICHEF_BRIGADE_PROFILES_V169,
                            String(source.planningEstablishmentProfile || '')
                        )
                            ? String(source.planningEstablishmentProfile)
                            : 'restaurant'
                    ),
                planningBrigadeRoleCounts:
                    normalizeBrigadeRoleCountsV171(
                        source.planningBrigadeRoleCounts,
                        Object.prototype.hasOwnProperty.call(
                            ICHEF_BRIGADE_PROFILES_V169,
                            String(source.planningEstablishmentProfile || '')
                        )
                            ? String(source.planningEstablishmentProfile)
                            : 'restaurant'
                    ),
                planningBrigadeRoleRatios:
                    normalizeBrigadeRoleRatiosV179(
                        source.planningBrigadeRoleRatios,
                        Object.prototype.hasOwnProperty.call(
                            ICHEF_BRIGADE_PROFILES_V169,
                            String(source.planningEstablishmentProfile || '')
                        )
                            ? String(source.planningEstablishmentProfile)
                            : 'restaurant'
                    ),
                planningStatus: ['draft', 'published', 'locked'].includes(source.planningStatus)
                    ? source.planningStatus
                    : 'draft',
                // V202 · catégories planning personnalisées par client.
                // Chaque catégorie garde un "legalType" iCHEF afin que le client
                // puisse changer le nom / la couleur / le sens opérationnel
                // sans casser les règles légales, la paie ou les compteurs.
                planningStatusCatalogV202:
                    Array.isArray(source.planningStatusCatalogV202)
                        ? source.planningStatusCatalogV202.slice(0, 40).map((c, index) => {
                            const allowed = new Set([
                                'present','off_soir','off_matin','off','conge','recup','maladie',
                                'accident_travail','maternite','paternite','parental','enfant_malade',
                                'evenement_familial','deces','formation','sans_solde',
                                'absence_autorisee','absence_injustifiee','ferie'
                            ]);
                            const rawId = String(c?.id || `categorie_${index + 1}`)
                                .toLowerCase()
                                .replace(/[^a-z0-9_-]+/g, '_')
                                .replace(/^_+|_+$/g, '')
                                .slice(0, 48) || `categorie_${index + 1}`;
                            const legalType = allowed.has(String(c?.legalType || ''))
                                ? String(c.legalType)
                                : 'off';
                            const rawColor = String(c?.color || '#eeeeee');
                            return {
                                id: rawId,
                                label: String(c?.label || 'Catégorie').trim().slice(0, 42) || 'Catégorie',
                                short: String(c?.short || c?.label || 'CAT').trim().slice(0, 12) || 'CAT',
                                color: /^#[0-9a-f]{6}$/i.test(rawColor) ? rawColor : '#eeeeee',
                                legalType,
                                meaning: String(c?.meaning || '').trim().slice(0, 180),
                                active: c?.active !== false,
                                builtin: c?.builtin === true,
                                order: Math.max(0, Math.min(999, Number(c?.order) || index))
                            };
                        })
                        : null,
                currency: String(source.currency || 'CHF'),
                eventNotes: String(source.eventNotes || '').slice(0, 2000),
                planningPriority: ['balanced', 'quality', 'coverage', 'cost'].includes(source.planningPriority)
                    ? source.planningPriority
                    : 'balanced',
                planningServiceLevel:
                    ['standard', 'reinforced', 'premium', 'excellence']
                        .includes(String(source.planningServiceLevel || ''))
                        ? String(source.planningServiceLevel)
                        : 'standard',
                planningUseCashForecast:
                    source.planningUseCashForecast !== false &&
                    String(source.planningUseCashForecast) !== 'false',
                // V165 · le début du travail est une donnée indépendante
                // du début de service. Si absent (anciens réglages), on reprend
                // le début du service pour rester 100 % compatible.
                lunchWorkStart: /^\d{2}:\d{2}$/.test(String(source.lunchWorkStart || ''))
                    ? String(source.lunchWorkStart)
                    : (
                        /^\d{2}:\d{2}$/.test(String(source.lunchStart || ''))
                            ? String(source.lunchStart)
                            : '10:00'
                      ),
                lunchWorkEnd: /^\d{2}:\d{2}$/.test(String(source.lunchWorkEnd || ''))
                    ? String(source.lunchWorkEnd)
                    : (
                        /^\d{2}:\d{2}$/.test(String(source.lunchEnd || ''))
                            ? String(source.lunchEnd)
                            : '14:45'
                      ),
                lunchStart: /^\d{2}:\d{2}$/.test(String(source.lunchStart || ''))
                    ? String(source.lunchStart)
                    : '10:00',
                lunchEnd: /^\d{2}:\d{2}$/.test(String(source.lunchEnd || ''))
                    ? String(source.lunchEnd)
                    : '14:45',
                dinnerWorkStart: /^\d{2}:\d{2}$/.test(String(source.dinnerWorkStart || ''))
                    ? String(source.dinnerWorkStart)
                    : (
                        /^\d{2}:\d{2}$/.test(String(source.dinnerStart || ''))
                            ? String(source.dinnerStart)
                            : '18:00'
                      ),
                dinnerWorkEnd: /^\d{2}:\d{2}$/.test(String(source.dinnerWorkEnd || ''))
                    ? String(source.dinnerWorkEnd)
                    : (
                        /^\d{2}:\d{2}$/.test(String(source.dinnerEnd || ''))
                            ? String(source.dinnerEnd)
                            : '22:45'
                      ),
                dinnerStart: /^\d{2}:\d{2}$/.test(String(source.dinnerStart || ''))
                    ? String(source.dinnerStart)
                    : '18:00',
                dinnerEnd: /^\d{2}:\d{2}$/.test(String(source.dinnerEnd || ''))
                    ? String(source.dinnerEnd)
                    : '22:45',
                fullDayPause: Math.max(0, Math.min(240, Number(source.fullDayPause) || 0)),
                preserveExistingPlanning: source.preserveExistingPlanning !== false,
                preservePastDays: source.preservePastDays !== false,
                planningAutopilotEnabled: source.planningAutopilotEnabled !== false && String(source.planningAutopilotEnabled) !== 'false',
                planningTakeoverHours: Math.max(6, Math.min(168, Number(source.planningTakeoverHours) || 48)),
                planningTimezone: String(source.planningTimezone || 'Europe/Paris').slice(0,80),
                planningMode: ['assisted','semi','autonomous'].includes(String(source.planningMode || '').toLowerCase())
                    ? String(source.planningMode).toLowerCase()
                    : 'autonomous',
                planningMonthlyLeadDays: Math.max(1, Math.min(31, Number(source.planningMonthlyLeadDays) || 14)),
                planningDaysOffPerWeek: Math.max(0.5, Math.min(7, Math.round((Number(source.planningDaysOffPerWeek) || 2) * 2) / 2)),
                planningPreferConsecutiveOff: source.planningPreferConsecutiveOff !== false,
                planningAutoRecovery: source.planningAutoRecovery !== false,
                planningMaxRecoveryDaysPerMonth: Math.max(0, Math.min(6, Number(source.planningMaxRecoveryDaysPerMonth) || 2)),
                planningApprovedLeaveOnly: true,
                planningProtectedWeekdays: Array.from(new Set((Array.isArray(source.planningProtectedWeekdays) ? source.planningProtectedWeekdays : []).map(Number).filter(v => Number.isInteger(v) && v >= 0 && v <= 6))),
                planningBlockPlannableLeaveOnProtectedDays: source.planningBlockPlannableLeaveOnProtectedDays !== false,
                planningProtectPeakLeave: source.planningProtectPeakLeave !== false,
                planningPeakProtectionCount: Math.max(1, Math.min(31, Number(source.planningPeakProtectionCount) || 6)),
                planningPeakMinCovers: Math.max(0, Math.min(1000, Number(source.planningPeakMinCovers) || 40)),
                planningPeakProtectionMinScore: Math.max(1, Math.min(3, Number(source.planningPeakProtectionMinScore) || 1.5)),
                planningRebalanceOnReservations: source.planningRebalanceOnReservations !== false,
                planningRebalanceOnAntiRush: source.planningRebalanceOnAntiRush !== false,
                planningRebalanceOnAbsence: source.planningRebalanceOnAbsence !== false,
                serviceContinuousEnabled:
                    source.serviceContinuousEnabled !== false &&
                    String(source.serviceContinuousEnabled) !== 'false',
                serviceSplitEnabled:
                    source.serviceSplitEnabled !== false &&
                    String(source.serviceSplitEnabled) !== 'false',
                optimizeStaffChoice:
                    source.optimizeStaffChoice !== false &&
                    String(source.optimizeStaffChoice) !== 'false',
                managerServiceAdvisorEnabled:
                    source.managerServiceAdvisorEnabled !== false &&
                    String(source.managerServiceAdvisorEnabled) !== 'false',
                kitchenCriticalCoverageEnabled:
                    source.kitchenCriticalCoverageEnabled !== false &&
                    String(source.kitchenCriticalCoverageEnabled) !== 'false',
                kitchenMinQualifiedPerOpenService:
                    Math.max(
                        1,
                        Math.min(
                            10,
                            Number(source.kitchenMinQualifiedPerOpenService) || 1
                        )
                    ),
                planningClosedWeekdays:
                    Array.from(
                        new Set(
                            (Array.isArray(source.planningClosedWeekdays)
                                ? source.planningClosedWeekdays
                                : []
                            )
                            .map(Number)
                            .filter(v => Number.isInteger(v) && v >= 0 && v <= 6)
                        )
                    ).sort((a,b)=>a-b),
                planningExceptionalClosedDates:
                    Array.from(
                        new Set(
                            (Array.isArray(source.planningExceptionalClosedDates)
                                ? source.planningExceptionalClosedDates
                                : String(source.planningExceptionalClosedDates || '')
                                    .split(/[\s,;]+/)
                            )
                            .map(v => String(v || '').trim())
                            .filter(v => /^20\d{2}-\d{2}-\d{2}$/.test(v))
                        )
                    ).sort(),
                planningServiceWeekdays:
                    normalizeRhServiceWeekdaysV168(
                        source.planningServiceWeekdays
                    ),
                planningLegalCountry:
                    String(source.planningLegalCountry || 'CH').toUpperCase() === 'FR'
                        ? 'FR'
                        : 'CH',
                planningLegalFramework:
                    String(source.planningLegalCountry || 'CH').toUpperCase() === 'FR'
                        ? 'FR_HCR'
                        : 'CH_CCNT',
                planningLegalEstablishmentType:
                    ['standard','seasonal','small','permanent']
                        .includes(String(source.planningLegalEstablishmentType || '').toLowerCase())
                        ? String(source.planningLegalEstablishmentType).toLowerCase()
                        : (
                            String(source.planningLegalCountry || 'CH').toUpperCase() === 'FR'
                                ? 'permanent'
                                : 'standard'
                          ),
                // V145/V180 : mode juridique strict non désactivable.
                planningLegalEnforcement: true,
                planningLegalReferenceDate:
                    '2026-09-29',
                planningLegalCountryAuto: true,
                planningLegalCountrySource:
                    String(source.planningLegalCountrySource || 'tenant').slice(0,120),
                planningSwissSevenDayException:
                    source.planningSwissSevenDayException === true ||
                    String(source.planningSwissSevenDayException) === 'true',
                planningSwissLegalVersion:
                    'CH-2026-09-29-CCNT-LTr-OLT1-OLT2',
                planningFranceWorkTimeMode:
                    ['weekly','annualized'].includes(
                        String(source.planningFranceWorkTimeMode || '')
                    )
                        ? String(source.planningFranceWorkTimeMode)
                        : 'weekly',
                planningFranceAnnualizationValidated:
                    source.planningFranceAnnualizationValidated === true ||
                    String(source.planningFranceAnnualizationValidated) === 'true',
                planningFranceNoticeValidated:
                    source.planningFranceNoticeValidated === true ||
                    String(source.planningFranceNoticeValidated) === 'true',
                planningFranceLegalVersion:
                    'FR-2026-09-29-HCR-IDCC1979-CODE-TRAVAIL',
                planningClosureConfirmedV142:
                    source.planningClosureConfirmedV142 === true ||
                    String(source.planningClosureConfirmedV142) === 'true',
                updatedAt: new Date().toISOString()
            };
            localStorage.setItem(
                'ichef_rh_settings',
                JSON.stringify(clean)
            );
            try {
                const tenantKey =
                    `ichef_rh_legal_${String(
                        typeof tenantID_JS !== 'undefined'
                            ? tenantID_JS
                            : 'default'
                    )}`;
                localStorage.setItem(
                    tenantKey,
                    JSON.stringify({
                        planningLegalCountry:
                            clean.planningLegalCountry,
                        planningLegalFramework:
                            clean.planningLegalFramework,
                        planningLegalEstablishmentType:
                            clean.planningLegalEstablishmentType,
                        planningLegalEnforcement:
                            clean.planningLegalEnforcement,
                        planningLegalReferenceDate:
                            clean.planningLegalReferenceDate,
                        planningLegalCountryAuto:
                            true,
                        planningLegalCountrySource:
                            clean.planningLegalCountrySource,
                        planningSwissSevenDayException:
                            clean.planningSwissSevenDayException,
                        planningSwissLegalVersion:
                            clean.planningSwissLegalVersion,
                        planningFranceWorkTimeMode:
                            clean.planningFranceWorkTimeMode,
                        planningFranceAnnualizationValidated:
                            clean.planningFranceAnnualizationValidated,
                        planningFranceNoticeValidated:
                            clean.planningFranceNoticeValidated,
                        planningFranceLegalVersion:
                            clean.planningFranceLegalVersion,
                        planningClosedWeekdays:
                            clean.planningClosedWeekdays,
                        planningExceptionalClosedDates:
                            clean.planningExceptionalClosedDates,
                        planningClosureConfirmedV142:
                            clean.planningClosureConfirmedV142
                    })
                );
            } catch (_) {}
            API.update(
                'RH_SETTINGS',
                clean
            );
            return clean;
        }
        function hydrateRhSettingsForm() {
            const s = getRhSettings();
            const map = {
                'rh-setting-labor-budget': s.laborBudgetPct,
                'rh-setting-server-ratio': s.serverCoversRatio,
                'rh-setting-kitchen-ratio': s.kitchenCoversRatio,
                'rh-setting-bar-ratio': s.barCoversRatio,
                'rh-setting-establishment-profile':
                    s.planningEstablishmentProfile || 'restaurant',
                'rh-setting-planning-status': s.planningStatus,
                'rh-setting-currency': s.currency,
                'rh-setting-events': s.eventNotes,
                'rh-setting-planning-priority': s.planningPriority,
                'rh-setting-service-level':
                    s.planningServiceLevel || 'standard',
                'rh-setting-lunch-work-start': s.lunchWorkStart || s.lunchStart,
                'rh-setting-lunch-work-end': s.lunchWorkEnd || s.lunchEnd,
                'rh-setting-lunch-start': s.lunchStart,
                'rh-setting-lunch-end': s.lunchEnd,
                'rh-setting-dinner-work-start': s.dinnerWorkStart || s.dinnerStart,
                'rh-setting-dinner-work-end': s.dinnerWorkEnd || s.dinnerEnd,
                'rh-setting-dinner-start': s.dinnerStart,
                'rh-setting-dinner-end': s.dinnerEnd,
                'rh-setting-full-pause': s.fullDayPause,
                'rh-setting-ai-takeover-hours': s.planningTakeoverHours,
                'rh-setting-ai-takeover': s.planningAutopilotEnabled === false ? 'false' : 'true'
            };
            Object.entries(map).forEach(([id, value]) => {
                const el = document.getElementById(id);
                if (el) el.value = value ?? '';
            });
            // V169 · hydrate la brigade après le select profil
            renderRhBrigadeV169(s, false);
            const useCashForecast =
                document.getElementById(
                    'rh-setting-use-cash-forecast'
                );
            if (useCashForecast) {
                useCashForecast.checked =
                    s.planningUseCashForecast !== false;
            }
            const preserveExisting = document.getElementById('rh-setting-preserve-existing');
            if (preserveExisting) preserveExisting.checked = s.preserveExistingPlanning !== false;
            const preservePast = document.getElementById('rh-setting-preserve-past');
            if (preservePast) preservePast.checked = s.preservePastDays !== false;
            const serviceContinuous = document.getElementById('rh-setting-service-continuous');
            if (serviceContinuous) serviceContinuous.checked = s.serviceContinuousEnabled !== false;
            const serviceSplit = document.getElementById('rh-setting-service-split');
            if (serviceSplit) serviceSplit.checked = s.serviceSplitEnabled !== false;
            const optimizeStaff = document.getElementById('rh-setting-optimize-staff');
            if (optimizeStaff) optimizeStaff.checked = s.optimizeStaffChoice !== false;
            const managerAdvisor = document.getElementById('rh-setting-manager-advisor');
            if (managerAdvisor) managerAdvisor.checked = s.managerServiceAdvisorEnabled !== false;
            const kitchenCritical = document.getElementById('rh-setting-kitchen-critical');
            if (kitchenCritical) kitchenCritical.checked = s.kitchenCriticalCoverageEnabled !== false;
            const kitchenMin = document.getElementById('rh-setting-kitchen-min');
            if (kitchenMin) kitchenMin.value = Math.max(1, Number(s.kitchenMinQualifiedPerOpenService || 1));
            const legalCountry =
                document.getElementById('rh-setting-legal-country');
            if (legalCountry) {
                legalCountry.value =
                    String(s.planningLegalCountry || 'CH').toUpperCase() === 'FR'
                        ? 'FR'
                        : 'CH';
            }
            if (typeof refreshLegalProfileV142 === 'function') {
                refreshLegalProfileV142(
                    s.planningLegalEstablishmentType
                );
            }
            const frWorkTimeMode =
                document.getElementById(
                    'rh-setting-fr-worktime-mode'
                );
            if (frWorkTimeMode) {
                frWorkTimeMode.value =
                    s.planningFranceWorkTimeMode || 'weekly';
            }
            const frAnnualizationValidated =
                document.getElementById(
                    'rh-setting-fr-annualization-validated'
                );
            if (frAnnualizationValidated) {
                frAnnualizationValidated.checked =
                    s.planningFranceAnnualizationValidated === true;
            }
            const frNoticeValidated =
                document.getElementById(
                    'rh-setting-fr-notice-validated'
                );
            if (frNoticeValidated) {
                frNoticeValidated.checked =
                    s.planningFranceNoticeValidated === true;
            }
            const swissSevenDay =
                document.getElementById(
                    'rh-setting-ch-seven-day-exception'
                );
            if (swissSevenDay) {
                swissSevenDay.checked =
                    s.planningSwissSevenDayException === true;
            }
            const legalEnforcement =
                document.getElementById('rh-setting-legal-enforcement');
            if (legalEnforcement) {
                legalEnforcement.checked = true;
                legalEnforcement.disabled = true;
                legalEnforcement.title =
                    'Mode conformité stricte iCHEF : non désactivable depuis le planning.';
            }
            document
                .querySelectorAll('[data-v135-closed-weekday]')
                .forEach(input => {
                    input.checked =
                        Array.isArray(s.planningClosedWeekdays) &&
                        s.planningClosedWeekdays.includes(
                            Number(input.dataset.v135ClosedWeekday)
                        );
                });
            const exceptionalClosures =
                document.getElementById('rh-setting-exceptional-closures');
            if (exceptionalClosures) {
                exceptionalClosures.value =
                    Array.isArray(s.planningExceptionalClosedDates)
                        ? s.planningExceptionalClosedDates.join(', ')
                        : '';
            }
            // V168 · recharge MIDI / SOIR pour LUN -> DIM
            hydrateRhServiceWeekdaysV168(s);
            // V170 · activité caisse affichée avec le mois sélectionné.
            renderRhCashActivityV170(
                'hydrate'
            );
            if (typeof refreshRhServiceStrategyAdvice === 'function') {
                refreshRhServiceStrategyAdvice();
            }
        }
        function saveRhPlanningSettings(silent = false) {
            const settings = saveRhSettings({
                laborBudgetPct:
                    document.getElementById('rh-setting-labor-budget')?.value,
                serverCoversRatio:
                    document.getElementById('rh-setting-server-ratio')?.value,
                kitchenCoversRatio:
                    document.getElementById('rh-setting-kitchen-ratio')?.value,
                barCoversRatio:
                    document.getElementById('rh-setting-bar-ratio')?.value,
                planningEstablishmentProfile:
                    document.getElementById(
                        'rh-setting-establishment-profile'
                    )?.value || 'restaurant',
                planningBrigadeRoles:
                    readBrigadeRolesFormV169(),
                planningBrigadeRoleCounts:
                    readBrigadeRoleCountsV171(),
                planningBrigadeRoleRatios:
                    readBrigadeRoleRatiosV179(),
                planningStatus:
                    document.getElementById('rh-setting-planning-status')?.value,
                currency:
                    document.getElementById('rh-setting-currency')?.value,
                eventNotes:
                    document.getElementById('rh-setting-events')?.value,
                planningPriority:
                    document.getElementById('rh-setting-planning-priority')?.value,
                planningServiceLevel:
                    document.getElementById('rh-setting-service-level')?.value || 'standard',
                planningUseCashForecast:
                    document.getElementById(
                        'rh-setting-use-cash-forecast'
                    )?.checked !== false,
                lunchWorkStart:
                    document.getElementById('rh-setting-lunch-work-start')?.value,
                lunchWorkEnd:
                    document.getElementById('rh-setting-lunch-work-end')?.value,
                lunchStart:
                    document.getElementById('rh-setting-lunch-start')?.value,
                lunchEnd:
                    document.getElementById('rh-setting-lunch-end')?.value,
                dinnerWorkStart:
                    document.getElementById('rh-setting-dinner-work-start')?.value,
                dinnerWorkEnd:
                    document.getElementById('rh-setting-dinner-work-end')?.value,
                dinnerStart:
                    document.getElementById('rh-setting-dinner-start')?.value,
                dinnerEnd:
                    document.getElementById('rh-setting-dinner-end')?.value,
                fullDayPause:
                    document.getElementById('rh-setting-full-pause')?.value,
                preserveExistingPlanning:
                    document.getElementById('rh-setting-preserve-existing')?.checked !== false,
                preservePastDays:
                    document.getElementById('rh-setting-preserve-past')?.checked !== false,
                planningAutopilotEnabled:
                    document.getElementById('rh-setting-ai-takeover')?.value !== 'false',
                planningTakeoverHours:
                    document.getElementById('rh-setting-ai-takeover-hours')?.value || 48,
                serviceContinuousEnabled:
                    document.getElementById('rh-setting-service-continuous')?.checked === true,
                serviceSplitEnabled:
                    document.getElementById('rh-setting-service-split')?.checked === true,
                optimizeStaffChoice:
                    document.getElementById('rh-setting-optimize-staff')?.checked !== false,
                managerServiceAdvisorEnabled:
                    document.getElementById('rh-setting-manager-advisor')?.checked !== false,
                kitchenCriticalCoverageEnabled:
                    document.getElementById('rh-setting-kitchen-critical')?.checked !== false,
                kitchenMinQualifiedPerOpenService:
                    document.getElementById('rh-setting-kitchen-min')?.value || 1,
                planningLegalCountry:
                    document.getElementById('rh-setting-legal-country')?.value || 'CH',
                planningLegalEstablishmentType:
                    document.getElementById('rh-setting-legal-establishment')?.value || 'standard',
                planningSwissSevenDayException:
                    document.getElementById(
                        'rh-setting-ch-seven-day-exception'
                    )?.checked === true,
                planningFranceWorkTimeMode:
                    document.getElementById(
                        'rh-setting-fr-worktime-mode'
                    )?.value || 'weekly',
                planningFranceAnnualizationValidated:
                    document.getElementById(
                        'rh-setting-fr-annualization-validated'
                    )?.checked === true,
                planningFranceNoticeValidated:
                    document.getElementById(
                        'rh-setting-fr-notice-validated'
                    )?.checked === true,
                planningLegalEnforcement: true,
                planningClosureConfirmedV142: true,
                planningClosedWeekdays:
                    Array.from(
                        document.querySelectorAll(
                            '[data-v135-closed-weekday]:checked'
                        )
                    ).map(input =>
                        Number(input.dataset.v135ClosedWeekday)
                    ),
                planningExceptionalClosedDates:
                    String(
                        document.getElementById(
                            'rh-setting-exceptional-closures'
                        )?.value || ''
                    )
                    .split(/[\s,;]+/)
                    .map(v => v.trim())
                    .filter(v => /^20\d{2}-\d{2}-\d{2}$/.test(v)),
                planningServiceWeekdays:
                    readRhServiceWeekdaysFormV168(),
                planningTimezone:
                    'Europe/Paris'
            });
            if (typeof refreshRhServiceStrategyAdvice === 'function') {
                refreshRhServiceStrategyAdvice(settings);
            }
            if (!silent && typeof showToast === 'function') {
                showToast(
                    settings.planningStatus === 'locked'
                        ? 'Planning clôturé / verrouillé'
                        : 'Paramètres planning enregistrés'
                );
            }
            return settings;
        }
        function getRhChangeHistory() {
            return JSON.parse(
                localStorage.getItem('ichef_rh_change_history') || '[]'
            );
        }
        function saveRhChangeHistory(rows) {
            // V138 · aucune purge automatique de l'historique RH.
            // Les règles légales de conservation restent à définir par
            // l'établissement dans sa politique RH / RGPD.
            const retained = (Array.isArray(rows) ? rows : [])
                .filter(Boolean)
                .sort((a,b) => {
                    const ta = Date.parse(
                        String(
                            a?.timestamp ||
                            a?.at ||
                            a?.updatedAt ||
                            a?.createdAt ||
                            0
                        )
                    ) || 0;
                    const tb = Date.parse(
                        String(
                            b?.timestamp ||
                            b?.at ||
                            b?.updatedAt ||
                            b?.createdAt ||
                            0
                        )
                    ) || 0;
                    return ta - tb;
                });
            localStorage.setItem(
                'ichef_rh_change_history',
                JSON.stringify(retained)
            );
            const planningHistory = retained.filter(row =>
                (
                    /^PLANNING_/i.test(String(row?.type || '')) ||
                    /^AI_PLANNING/i.test(String(row?.type || ''))
                ) &&
                String(row?.staffId || '').trim() !== ''
            );
            // Nouvelle clé durable.
            localStorage.setItem(
                'ichef_planning_history_all',
                JSON.stringify(planningHistory)
            );
            // Compatibilité avec les versions précédentes.
            localStorage.setItem(
                'ichef_planning_history_5y',
                JSON.stringify(planningHistory)
            );
            try {
                Promise.resolve(
                    API.update(
                        'RH_CHANGE_HISTORY',
                        retained
                    )
                ).catch(error =>
                    console.warn(
                        '[iCHEF RH V138] synchro historique RH différée',
                        error
                    )
                );
                Promise.resolve(
                    API.update(
                        'PLANNING_HISTORY_MASTER',
                        planningHistory
                    )
                ).catch(error =>
                    console.warn(
                        '[iCHEF RH V138] synchro historique planning différée',
                        error
                    )
                );
                Promise.resolve(
                    API.update(
                        'RH_STAFF_ARCHIVE_MASTER',
                        buildRhStaffArchiveIndexV138()
                    )
                ).catch(error =>
                    console.warn(
                        '[iCHEF RH V138] synchro archive staff différée',
                        error
                    )
                );
            } catch (error) {
                console.warn(
                    '[iCHEF RH V138] historique conservé localement',
                    error
                );
            }
        }
        function recordRhChange(entry) {
            const history = getRhChangeHistory();
            history.push({
                id:
                    Date.now().toString(36) +
                    '_' +
                    Math.random().toString(36).slice(2),
                timestamp:
                    new Date().toISOString(),
                ...entry
            });
            saveRhChangeHistory(history);
        }
        function parsePunchMonth(monthStr) {
            const [year, month] =
                String(monthStr || '').split('-').map(Number);
            return {
                year,
                month
            };
        }
        function getRhHoursResetInfoV99() {
            let raw = null;
            try {
                raw = JSON.parse(localStorage.getItem('ichef_rh_hours_reset') || 'null');
            } catch (_) {}
            if (!raw) {
                try {
                    const sync = JSON.parse(localStorage.getItem('EMPIRE_GLOBAL_SYNC') || '{"activeOrders":{}}');
                    raw = sync?.activeOrders?.RH_HOURS_RESET_MASTER?.data || null;
                } catch (_) {}
            }
            const resetAt = String(raw?.resetAt || '').trim();
            const resetMs = Date.parse(resetAt);
            return {
                active:Number.isFinite(resetMs) && resetMs > 0,
                resetAt,
                resetMs:Number.isFinite(resetMs) ? resetMs : 0,
                resetBy:String(raw?.resetBy || ''),
                reason:String(raw?.reason || '')
            };
        }
        function rhPlanCountsAfterResetV99(day) {
            const reset = getRhHoursResetInfoV99();
            if (!reset.active) return true;
            const changed = Date.parse(String(
                day?.lastChangeAt || day?.updatedAt || day?.createdAt || day?.timestamp || ''
            ));
            return Number.isFinite(changed) && changed >= reset.resetMs;
        }
        function renderRhHoursResetBannerV99() {
            const el = document.getElementById('rh-hours-reset-banner-v99');
            if (!el) return;
            const reset = getRhHoursResetInfoV99();
            if (!reset.active) {
                el.style.display = 'none';
                el.textContent = '';
                return;
            }
            const when = new Date(reset.resetMs).toLocaleString('fr-FR');
            el.style.display = 'block';
            el.innerHTML = `<strong>COMPTEURS REMIS À ZÉRO</strong> · ${escapeRhHtml(when)}${reset.resetBy ? ` · ${escapeRhHtml(reset.resetBy)}` : ''}${reset.reason ? `<br>Motif : ${escapeRhHtml(reset.reason)}` : ''}<br><span style="color:var(--text-muted)">Les anciens plannings, pointages et preuves restent archivés. Seuls les compteurs repartent de zéro.</span>`;
        }
        function getPunchPairsForStaff(staffId, monthStr) {
            const resetInfo = getRhHoursResetInfoV99();
            const punches =
                getPunches()
                    .filter(p =>
                        String(p?.staffId) === String(staffId) &&
                        (!resetInfo.active || Number(p?.timestamp || 0) >= resetInfo.resetMs)
                    )
                    .sort(
                        (a, b) =>
                            Number(a.timestamp || 0) -
                            Number(b.timestamp || 0)
                    );
            const { year, month } =
                parsePunchMonth(monthStr);
            const pairs = [];
            let openEntry = null;
            punches.forEach(p => {
                const ts = Number(p.timestamp || 0);
                if (!ts) return;
                const date = new Date(ts);
                if (p.type === 'ENTRÉE') {
                    openEntry = p;
                    return;
                }
                if (
                    p.type === 'SORTIE' &&
                    openEntry
                ) {
                    const inDate =
                        new Date(
                            Number(openEntry.timestamp)
                        );
                    if (
                        inDate.getFullYear() === year &&
                        inDate.getMonth() + 1 === month
                    ) {
                        const hours =
                            Math.max(
                                0,
                                (
                                    Number(p.timestamp) -
                                    Number(openEntry.timestamp)
                                ) / 3600000
                            );
                        pairs.push({
                            entry:
                                openEntry,
                            exit:
                                p,
                            date:
                                `${inDate.getFullYear()}-${String(inDate.getMonth() + 1).padStart(2, '0')}-${String(inDate.getDate()).padStart(2, '0')}`,
                            hours:
                                Math.round(hours * 100) / 100
                        });
                    }
                    openEntry = null;
                }
            });
            return pairs;
        }
        function getActualHoursByDay(staffId, monthStr) {
            const map = {};
            getPunchPairsForStaff(
                staffId,
                monthStr
            ).forEach(pair => {
                const day =
                    Number(
                        pair.date.slice(8, 10)
                    );
                map[day] =
                    (map[day] || 0) +
                    Number(pair.hours || 0);
            });
            Object.keys(map).forEach(day => {
                map[day] =
                    Math.round(map[day] * 100) / 100;
            });
            return map;
        }
        function getActualHoursSummary(staffId, monthStr) {
            const serverSheet =
                getRealSheetForStaff(
                    staffId,
                    monthStr
                );
            const resetInfo = getRhHoursResetInfoV99();
            if (resetInfo.active) {
                const pairs = getPunchPairsForStaff(staffId,monthStr);
                const byDay = {};
                let total = 0;
                pairs.forEach(pair => {
                    const day = Number(String(pair.date || '').slice(8,10));
                    const h = Number(pair.hours || 0);
                    byDay[day] = (byDay[day] || 0) + h;
                    total += h;
                });
                if (serverSheet?.days) {
                    Object.entries(serverSheet.days).forEach(([dayKey,day]) => {
                        const correctedAt = Date.parse(String(day?.correction?.correctedAt || ''));
                        if (!Number.isFinite(correctedAt) || correctedAt < resetInfo.resetMs) return;
                        const dayNo = Number(dayKey);
                        const previous = Number(byDay[dayNo] || 0);
                        const corrected = Number(day?.workedHours ?? day?.manualWorkedHours ?? 0) || 0;
                        total += corrected - previous;
                        byDay[dayNo] = corrected;
                    });
                }
                Object.keys(byDay).forEach(day => byDay[day] = Math.round(Number(byDay[day] || 0) * 100) / 100);
                return {
                    total:Math.round(Math.max(0,total)*100)/100,
                    pairs,
                    byDay,
                    anomalies:0,
                    sheetStatus:serverSheet?.status || 'RESET',
                    source:'RH_RESET_BASELINE'
                };
            }
            if (serverSheet?.days) {
                const byDay = {};
                const pairs = [];
                let total = 0;
                let anomalies = 0;
                Object.entries(serverSheet.days)
                    .forEach(([dayKey, day]) => {
                        const worked =
                            Number(
                                day?.workedHours || 0
                            );
                        byDay[Number(dayKey)] =
                            worked;
                        total += worked;
                        anomalies +=
                            Array.isArray(day?.anomalies)
                                ? day.anomalies.length
                                : 0;
                        if (
                            Array.isArray(day?.sessions)
                        ) {
                            day.sessions.forEach(session => {
                                pairs.push({
                                    date: day.date,
                                    hours:
                                        Number(
                                            session.hours || 0
                                        ),
                                    entry:
                                        session.entry || null,
                                    exit:
                                        session.exit || null
                                });
                            });
                        }
                    });
                return {
                    total:
                        Math.round(total * 100) / 100,
                    pairs,
                    byDay,
                    anomalies,
                    sheetStatus:
                        serverSheet.status ||
                        'TO_VERIFY',
                    source:
                        'RH_TIMESHEET_REAL'
                };
            }
            // Secours local si le serveur est momentanément indisponible.
            const pairs =
                getPunchPairsForStaff(
                    staffId,
                    monthStr
                );
            const total =
                pairs.reduce(
                    (sum, pair) =>
                        sum + Number(pair.hours || 0),
                    0
                );
            return {
                total:
                    Math.round(total * 100) / 100,
                pairs,
                byDay:
                    getActualHoursByDay(
                        staffId,
                        monthStr
                    ),
                anomalies: 0,
                sheetStatus: 'LOCAL_FALLBACK',
                source: 'LOCAL_PUNCHES'
            };
        }
        function getCumulativeActualHours(staffId, year) {
            let total = 0;
            for (let month = 1; month <= 12; month++) {
                const monthStr =
                    `${year}-${String(month).padStart(2, '0')}`;
                total +=
                    getActualHoursSummary(
                        staffId,
                        monthStr
                    ).total;
            }
            return Math.round(total * 100) / 100;
        }
        function formatRhSignedHours(value) {
            const n = Number(value || 0);
            const sign =
                n > 0.005
                    ? '+'
                    : '';
            return `${sign}${n.toFixed(1)} h`;
        }
        function rhBalanceClass(value) {
            const n = Number(value || 0);
            if (n > 0.05) return 'rh-balance-positive';
            if (n < -0.05) return 'rh-balance-negative';
            return 'rh-balance-ok';
        }
        let rhSocket = null;
        let rhStaffRefreshTimer = null;
        async function refreshRhStaffFromServer() {
            try {
                const state = await API.getState();
                if (state?.activeOrders) {
                    syncRhStaffFromState(state);
                    syncRhOperationalState(state);
                    if (state.activeOrders['REQUESTS_MASTER']) {
                        localStorage.setItem(
                            'empire_hr_requests',
                            JSON.stringify(
                                state.activeOrders['REQUESTS_MASTER'].data || []
                            )
                        );
                        updateReqBadge();
                    }
                    if (state.activeOrders['PUNCHES_MASTER']) {
                        storePunchesNoLoss(
                            state.activeOrders['PUNCHES_MASTER'].data || [],
                            'refreshRhStaffFromServer'
                        );
                    }
                }
                return state;
            } catch (error) {
                console.warn(
                    'Actualisation du staff impossible',
                    error
                );
                return null;
            }
        }
        function scheduleRhStaffRefresh() {
            clearTimeout(rhStaffRefreshTimer);
            rhStaffRefreshTimer =
                setTimeout(
                    refreshRhStaffFromServer,
                    250
                );
        }
        // ============================================================
        // V172 · SYMBIOSE TEMPS RÉEL
        // Le serveur / MongoDB reste la source de vérité.
        // Le même socket RH transporte aussi le bus métier iCHEF.
        // ============================================================
        let rhSymbioseHeartbeatV172 = null;
        let rhSymbiosePresenceV172 = {};
        let rhSymbioseLastPublishV172 = 0;
        function rhSymbioseDeviceIdV172() {
            const existing =
                localStorage.getItem('ichef_device_id') ||
                localStorage.getItem('ichef_device_fingerprint');
            if (existing) {
                localStorage.setItem(
                    'ichef_device_id',
                    existing
                );
                return existing;
            }
            const id =
                `rh_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
            localStorage.setItem(
                'ichef_device_id',
                id
            );
            return id;
        }
        function rhSymbioseModuleCountV172() {
            const source =
                rhSymbiosePresenceV172 &&
                typeof rhSymbiosePresenceV172 === 'object'
                    ? rhSymbiosePresenceV172
                    : {};
            return Object.values(source)
                .reduce((sum, value) => {
                    if (Array.isArray(value)) {
                        return sum + value.length;
                    }
                    if (
                        value &&
                        typeof value === 'object'
                    ) {
                        return sum + 1;
                    }
                    if (value) {
                        return sum + 1;
                    }
                    return sum;
                }, 0);
        }
        function ensureRhSymbioseBadgeV172() {
            let badge =
                document.getElementById(
                    'v172-symbiose-badge'
                );
            if (badge) return badge;
            badge =
                document.createElement('div');
            badge.id =
                'v172-symbiose-badge';
            badge.dataset.state =
                'connecting';
            badge.innerHTML = `
                <span class="v172-symbiose-dot"></span>
                <strong>SYMBIOSE · CONNEXION</strong>
            `;
            const host =
                document.querySelector(
                    '.top-status'
                ) ||
                document.querySelector(
                    '.header-actions'
                ) ||
                document.body;
            host.appendChild(badge);
            return badge;
        }
        function setRhSymbioseBadgeV172(
            state,
            text = ''
        ) {
            const badge =
                ensureRhSymbioseBadgeV172();
            badge.dataset.state =
                state;
            const label =
                badge.querySelector('strong');
            if (!label) return;
            if (text) {
                label.textContent = text;
                return;
            }
            const modules =
                rhSymbioseModuleCountV172();
            label.textContent =
                state === 'connected'
                    ? (
                        modules > 0
                            ? `SYMBIOSE · ${modules} MODULE${modules > 1 ? 'S' : ''}`
                            : 'SYMBIOSE · CONNECTÉE'
                      )
                    : state === 'offline'
                        ? 'SYMBIOSE · LOCAL'
                        : 'SYMBIOSE · CONNEXION';
        }
        function rhSymbioseStaffingSnapshotV172() {
            const now =
                new Date();
            const monthStr =
                `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            const day =
                now.getDate();
            const staff =
                typeof getDir === 'function'
                    ? getDir()
                    : [];
            const ts =
                typeof getTs === 'function'
                    ? getTs()
                    : {};
            const byDepartment = {};
            const activeDirectory = {};
            const plannedToday = {};
            let presentToday = 0;
            (Array.isArray(staff) ? staff : [])
                .forEach(person => {
                    if (
                        !person ||
                        person.active === false
                    ) {
                        return;
                    }
                    const canonical =
                        normalizeRhDept(
                            person.dept ||
                            person.poste ||
                            person.role ||
                            'salle'
                        );
                    activeDirectory[canonical] =
                        Number(
                            activeDirectory[canonical] || 0
                        ) + 1;
                    const planning =
                        ts?.[monthStr]
                          ?.[person.id]
                          ?.[day];
                    const hasShift =
                        Boolean(
                            planning?.s1 ||
                            planning?.s2
                        );
                    const status =
                        String(
                            planning?.status || ''
                        )
                        .trim()
                        .toLowerCase();
                    const works =
                        hasShift ||
                        [
                            'present',
                            'off_soir',
                            'off_matin'
                        ].includes(status);
                    if (!works) return;
                    const planningDept =
                        normalizeRhDept(
                            planning?.poste ||
                            person.dept ||
                            canonical
                        );
                    plannedToday[planningDept] =
                        Number(
                            plannedToday[planningDept] || 0
                        ) + 1;
                    byDepartment[planningDept] =
                        Number(
                            byDepartment[planningDept] || 0
                        ) + 1;
                    presentToday += 1;
                });
            const settings =
                typeof getRhSettings === 'function'
                    ? getRhSettings()
                    : {};
            return {
                month: monthStr,
                day,
                date:
                    `${monthStr}-${String(day).padStart(2, '0')}`,
                directoryTotal:
                    Object.values(
                        activeDirectory
                    ).reduce(
                        (sum, n) =>
                            sum + Number(n || 0),
                        0
                    ),
                presentToday,
                byDepartment,
                activeDirectory,
                plannedToday,
                establishmentProfile:
                    settings
                        ?.planningEstablishmentProfile ||
                    'restaurant',
                brigadeRoles:
                    Array.isArray(
                        settings
                            ?.planningBrigadeRoles
                    )
                        ? settings
                            .planningBrigadeRoles
                        : [],
                brigadeRoleCounts:
                    settings
                        ?.planningBrigadeRoleCounts &&
                    typeof settings
                        .planningBrigadeRoleCounts === 'object'
                        ? settings
                            .planningBrigadeRoleCounts
                        : {},
                serviceLevel:
                    settings
                        ?.planningServiceLevel ||
                    'standard',
                source:
                    'RH',
                updatedAt:
                    new Date()
                        .toISOString()
            };
        }
        function rhSymbioseSettingsSnapshotV172() {
            const settings =
                typeof getRhSettings === 'function'
                    ? getRhSettings()
                    : {};
            return {
                section:
                    'RH_SETTINGS',
                establishmentProfile:
                    settings
                        ?.planningEstablishmentProfile,
                brigadeRoles:
                    settings
                        ?.planningBrigadeRoles,
                brigadeRoleCounts:
                    settings
                        ?.planningBrigadeRoleCounts,
                brigadeRoleRatios:
                    settings
                        ?.planningBrigadeRoleRatios,
                serviceLevel:
                    settings
                        ?.planningServiceLevel,
                priority:
                    settings
                        ?.planningPriority,
                laborBudgetPct:
                    settings
                        ?.laborBudgetPct,
                serviceWeekdays:
                    settings
                        ?.planningServiceWeekdays,
                closedWeekdays:
                    settings
                        ?.planningClosedWeekdays,
                legalCountry:
                    settings
                        ?.planningLegalCountry,
                updatedAt:
                    settings
                        ?.updatedAt ||
                    new Date()
                        .toISOString()
            };
        }
        function publishRhSymbioseV172(
            type,
            payload = {},
            target = 'all'
        ) {
            const bus =
                window.ICHEF_BUS;
            if (
                bus &&
                typeof bus.publish === 'function'
            ) {
                return Promise.resolve(
                    bus.publish(
                        type,
                        payload,
                        target
                    )
                );
            }
            if (
                !rhSocket ||
                !rhSocket.connected
            ) {
                return Promise.resolve({
                    success: false,
                    error: 'SOCKET_OFFLINE'
                });
            }
            return new Promise(resolve => {
                let done = false;
                const finish =
                    result => {
                        if (done) return;
                        done = true;
                        resolve(
                            result || {
                                success: true
                            }
                        );
                    };
                const timer =
                    setTimeout(
                        () => {
                            finish({
                                success: true,
                                pendingAck: true
                            });
                        },
                        1200
                    );
                try {
                    rhSocket.emit(
                        'ichefBusEvent',
                        {
                            tenantID:
                                tenantID_JS,
                            source:
                                'rh',
                            target,
                            type,
                            payload,
                            deviceId:
                                rhSymbioseDeviceIdV172(),
                            sentAt:
                                new Date()
                                    .toISOString()
                        },
                        ack => {
                            clearTimeout(timer);
                            finish(
                                ack || {
                                    success: true
                                }
                            );
                        }
                    );
                } catch (error) {
                    clearTimeout(timer);
                    finish({
                        success: false,
                        error:
                            error?.message ||
                            'BUS_ERROR'
                    });
                }
            });
        }
        function publishRhStaffingV172(
            reason = 'rh-change'
        ) {
            const now =
                Date.now();
            /* anti-rafale : les sauvegardes RH peuvent appeler plusieurs
               fonctions successivement. */
            if (
                now -
                rhSymbioseLastPublishV172 <
                90
            ) {
                return;
            }
            rhSymbioseLastPublishV172 =
                now;
            const payload =
                rhSymbioseStaffingSnapshotV172();
            payload.reason = reason;
            publishRhSymbioseV172(
                'staffing.updated',
                payload,
                'all'
            );
            window.dispatchEvent(
                new CustomEvent(
                    'ichef:staffingUpdated',
                    {
                        detail:
                            payload
                    }
                )
            );
        }
        function publishRhSettingsV172(
            reason = 'settings'
        ) {
            const payload =
                rhSymbioseSettingsSnapshotV172();
            payload.reason = reason;
            publishRhSymbioseV172(
                'settings.updated',
                payload,
                'all'
            );
            publishRhSymbioseV172(
                'rh.planning.updated',
                {
                    ...payload,
                    staffing:
                        rhSymbioseStaffingSnapshotV172()
                },
                'all'
            );
        }
        function applyRhSymbioseStateV172(
            state,
            source = 'symbiose'
        ) {
            if (
                !state ||
                !state.activeOrders
            ) {
                return;
            }
            try {
                syncRhStaffFromState(
                    state
                );
            } catch (_) {}
            try {
                syncRhOperationalState(
                    state
                );
            } catch (_) {}
            if (
                document
                    .getElementById(
                        'ia-predictions-modal'
                    )
                    ?.classList
                    .contains('show')
            ) {
                try {
                    schedulePlanningAssistantAutoRefresh();
                } catch (_) {}
            }
            if (
                typeof window
                    .syncAllRhViewsV161 ===
                'function'
            ) {
                window
                    .syncAllRhViewsV161(
                        source
                    );
            }
        }
        function registerRhSymbioseV172() {
            if (
                !rhSocket ||
                !rhSocket.connected
            ) {
                setRhSymbioseBadgeV172(
                    'offline'
                );
                return;
            }
            const deviceId =
                rhSymbioseDeviceIdV172();
            document.documentElement
                .dataset
                .ichefModule = 'rh';
            try {
                rhSocket.emit(
                    'registerModule',
                    {
                        tenantID:
                            tenantID_JS,
                        module:
                            'rh',
                        deviceId
                    }
                );
            } catch (_) {}
            /* Expose la même interface que ichef-symbiose.js,
               mais en réutilisant le socket RH existant afin d'éviter
               une deuxième connexion WebSocket. */
            if (
                !window.ICHEF_BUS
            ) {
                window.ICHEF_BUS = {
                    socket:
                        rhSocket,
                    tenantID:
                        tenantID_JS,
                    module:
                        'rh',
                    serverURL:
                        SERVER_URL_JS,
                    get state() {
                        return (
                            window
                                .ICHEF_LIVE_STATE ||
                            null
                        );
                    },
                    publish:
                        (
                            type,
                            payload = {},
                            target = 'all'
                        ) =>
                            publishRhSymbioseV172(
                                type,
                                payload,
                                target
                            ),
                    refresh:
                        () =>
                            scheduleRhStaffRefresh()
                };
            }
            clearInterval(
                rhSymbioseHeartbeatV172
            );
            rhSymbioseHeartbeatV172 =
                setInterval(
                    () => {
                        if (
                            rhSocket &&
                            rhSocket.connected
                        ) {
                            rhSocket.emit(
                                'moduleHeartbeat',
                                {
                                    tenantID:
                                        tenantID_JS,
                                    module:
                                        'rh',
                                    deviceId
                                }
                            );
                        }
                    },
                    15000
                );
            setRhSymbioseBadgeV172(
                'connected'
            );
            window.dispatchEvent(
                new CustomEvent(
                    'ichef:connected',
                    {
                        detail: {
                            tenantID:
                                tenantID_JS,
                            module:
                                'rh',
                            socketId:
                                rhSocket.id
                        }
                    }
                )
            );
            setTimeout(
                () =>
                    publishRhStaffingV172(
                        'symbiose-connect'
                    ),
                120
            );
        }
        function connectRhRealtimeSync() {
            if (rhSocket) return;
            try {
                rhSocket = io(
                    SERVER_URL_JS,
                    {
                        transports: [
                            'websocket',
                            'polling'
                        ],
                        reconnection: true,
                        reconnectionAttempts: Infinity,
                        reconnectionDelay: 1000
                    }
                );
                rhSocket.on(
                    'connect',
                    () => {
                        rhSocket.emit(
                            'joinTenant',
                            {
                                tenantID:
                                    tenantID_JS,
                                deviceId:
                                    rhSymbioseDeviceIdV172(),
                                page:
                                    'RH'
                            }
                        );
                        registerRhSymbioseV172();
                    }
                );
                rhSocket.on(
                    'updateState',
                    state => {
                        if (!state?.activeOrders) return;
                        window.ICHEF_LIVE_STATE =
                            state;
                        window.dispatchEvent(
                            new CustomEvent(
                                'ichef:updateState',
                                {
                                    detail:
                                        state
                                }
                            )
                        );
                        syncRhStaffFromState(state);
                        syncRhOperationalState(state);
                        if (
                            state.activeOrders['REQUESTS_MASTER']
                        ) {
                            localStorage.setItem(
                                'empire_hr_requests',
                                JSON.stringify(
                                    state.activeOrders['REQUESTS_MASTER'].data || []
                                )
                            );
                            updateReqBadge();
                        }
                        if (
                            state.activeOrders['PUNCHES_MASTER']
                        ) {
                            storePunchesNoLoss(
                                state.activeOrders['PUNCHES_MASTER'].data || [],
                                'socket-updateState'
                            );
                        }
                        if (state.activeOrders['RH_SETTINGS']) {
                            localStorage.setItem(
                                'ichef_rh_settings',
                                JSON.stringify(
                                    state.activeOrders['RH_SETTINGS'].data || {}
                                )
                            );
                        }
                        if (state.activeOrders['RH_CHANGE_HISTORY']) {
                            localStorage.setItem(
                                'ichef_rh_change_history',
                                JSON.stringify(
                                    state.activeOrders['RH_CHANGE_HISTORY'].data || []
                                )
                            );
                        }
                        if (state.activeOrders['RH_HOURS_RESET_MASTER']) {
                            localStorage.setItem(
                                'ichef_rh_hours_reset',
                                JSON.stringify(state.activeOrders['RH_HOURS_RESET_MASTER'].data || {})
                            );
                            renderRhHoursResetBannerV99();
                        }
                        if (
                            document.getElementById('timesheets-interface')?.style.display === 'flex'
                        ) {
                            renderRealTimesheets();
                        }
                        if (
                            document.getElementById('ia-predictions-modal')?.classList.contains('show')
                        ) {
                            schedulePlanningAssistantAutoRefresh();
                        }
                    }
                );
                rhSocket.on(
                    'server-state-changed',
                    scheduleRhStaffRefresh
                );
                // V170 · mise à jour immédiate à chaque encaissement caisse.
                rhSocket.on(
                    'transactionSaved',
                    payload => {
                        if (
                            payload?.tenantID &&
                            String(payload.tenantID) !==
                                String(tenantID_JS)
                        ) {
                            return;
                        }
                        if (payload?.transaction) {
                            upsertRhCashTransactionV170(
                                payload.transaction,
                                'transactionSaved'
                            );
                        }
                        if (
                            document
                                .getElementById(
                                    'ia-predictions-modal'
                                )
                                ?.classList
                                .contains('show')
                        ) {
                            schedulePlanningAssistantAutoRefresh();
                        }
                    }
                );
                rhSocket.on(
                    'paymentUpdated',
                    payload => {
                        if (
                            payload?.transaction
                        ) {
                            upsertRhCashTransactionV170(
                                payload.transaction,
                                'paymentUpdated'
                            );
                        }
                    }
                );
                rhSocket.on(
                    'rhPunchSaved',
                    () => {
                        scheduleRhStaffRefresh();
                        if (
                            document.getElementById('ia-predictions-modal')?.classList.contains('show')
                        ) {
                            schedulePlanningAssistantAutoRefresh();
                        }
                    }
                );
                rhSocket.on(
                    'rhTimesheetUpdated',
                    timesheets => {
                        if (timesheets) {
                            saveRealTimesheetsLocal(
                                timesheets
                            );
                        }
                        if (
                            document.getElementById('timesheets-interface')?.style.display === 'flex'
                        ) {
                            renderRealTimesheets();
                        }
                        if (
                            document.getElementById('ia-predictions-modal')?.classList.contains('show')
                        ) {
                            schedulePlanningAssistantAutoRefresh();
                        }
                    }
                );
                // V172 · présence des modules iCHEF connectés
                rhSocket.on(
                    'modulePresenceUpdated',
                    payload => {
                        rhSymbiosePresenceV172 =
                            payload?.modules ||
                            {};
                        window.ICHEF_MODULE_PRESENCE =
                            rhSymbiosePresenceV172;
                        setRhSymbioseBadgeV172(
                            'connected'
                        );
                        window.dispatchEvent(
                            new CustomEvent(
                                'ichef:modulePresenceUpdated',
                                {
                                    detail:
                                        payload
                                }
                            )
                        );
                    }
                );
                rhSocket.on(
                    'modulesStatusUpdated',
                    payload => {
                        window.dispatchEvent(
                            new CustomEvent(
                                'ichef:modulesStatusUpdated',
                                {
                                    detail:
                                        payload
                                }
                            )
                        );
                    }
                );
                // Bus métier partagé : caisse, rush, commandes,
                // staffing, paramètres, stocks, etc.
                rhSocket.on(
                    'ichefBusBroadcast',
                    message => {
                        if (!message) return;
                        const target =
                            message.target ||
                            'all';
                        if (
                            target !== 'all' &&
                            target !== 'rh'
                        ) {
                            return;
                        }
                        window.dispatchEvent(
                            new CustomEvent(
                                `ichef:${message.type}`,
                                {
                                    detail:
                                        message
                                }
                            )
                        );
                        window.dispatchEvent(
                            new CustomEvent(
                                'ichef:bus',
                                {
                                    detail:
                                        message
                                }
                            )
                        );
                        const refreshEvents =
                            [
                                'order.updated',
                                'order.dispatched',
                                'order.ready',
                                'payment.completed',
                                'table.released',
                                'staffing.updated',
                                'rush.updated',
                                'menu.updated',
                                'stock.updated',
                                'settings.updated',
                                'rh.planning.updated'
                            ];
                        if (
                            refreshEvents
                                .includes(
                                    String(
                                        message.type ||
                                        ''
                                    )
                                )
                        ) {
                            scheduleRhStaffRefresh();
                            if (
                                document
                                    .getElementById(
                                        'ia-predictions-modal'
                                    )
                                    ?.classList
                                    .contains('show')
                            ) {
                                schedulePlanningAssistantAutoRefresh();
                            }
                        }
                    }
                );
                rhSocket.on(
                    'disconnect',
                    () => {
                        setRhSymbioseBadgeV172(
                            navigator.onLine
                                ? 'connecting'
                                : 'offline'
                        );
                        window.dispatchEvent(
                            new CustomEvent(
                                'ichef:disconnected',
                                {
                                    detail: {
                                        tenantID:
                                            tenantID_JS,
                                        module:
                                            'rh'
                                    }
                                }
                            )
                        );
                    }
                );
                rhSocket.on(
                    'connect_error',
                    error => {
                        setRhSymbioseBadgeV172(
                            navigator.onLine
                                ? 'connecting'
                                : 'offline'
                        );
                        console.warn(
                            'Synchronisation RH temps réel indisponible',
                            error?.message || error
                        );
                    }
                );
            } catch (error) {
                console.warn(
                    'Impossible de démarrer la synchronisation RH',
                    error
                );
            }
        }
        window.onload = async function() {
            const today = new Date();
            document.getElementById('month-selector').value = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2, '0')}`;
            if (typeof enforceRhPlanningMonthHorizon === 'function') enforceRhPlanningMonthHorizon(false);
            try {
                const state = await API.getState();
                if (state && state.activeOrders) {
                    if (state.activeOrders['DIRECTORY_MASTER']) localStorage.setItem('empire_hr_directory', JSON.stringify(state.activeOrders['DIRECTORY_MASTER'].data || []));
                    if (state.activeOrders['TIMESHEETS_MASTER']) applyRemoteTimesheets(state.activeOrders['TIMESHEETS_MASTER'].data || {}, 'startup');
                    if (state.activeOrders['PUNCHES_MASTER']) storePunchesNoLoss(state.activeOrders['PUNCHES_MASTER'].data || [], 'startup');
                    if (state.activeOrders['REQUESTS_MASTER'] || state.activeOrders['STAFF_REQUESTS']) {
                        const rm = Array.isArray(state.activeOrders['REQUESTS_MASTER']?.data) ? state.activeOrders['REQUESTS_MASTER'].data : [];
                        const rs = Array.isArray(state.activeOrders['STAFF_REQUESTS']?.data) ? state.activeOrders['STAFF_REQUESTS'].data : [];
                        const byId = new Map();
                        [...rm, ...rs].forEach(r => {
                            if (!r) return;
                            const id = String(r.id || r.requestNumber || r.proofId || '');
                            if (!id) return;
                            const old = byId.get(id);
                            const t = x => {
                                const raw = x?.updatedAt || x?.decidedAt || x?.processedAt || x?.createdAt || x?.timestamp || 0;
                                const n = Number(raw);
                                if (Number.isFinite(n) && n > 1000000000) return n;
                                const d = Date.parse(String(raw || ''));
                                return Number.isFinite(d) ? d : 0;
                            };
                            byId.set(id, !old || t(r) >= t(old) ? { ...(old || {}), ...r } : { ...r, ...old });
                        });
                        localStorage.setItem('empire_hr_requests', JSON.stringify([...byId.values()]));
                    }
                    if (state.activeOrders['RH_SETTINGS']) localStorage.setItem('ichef_rh_settings', JSON.stringify(state.activeOrders['RH_SETTINGS'].data || {}));
                    if (state.activeOrders['RH_CHANGE_HISTORY']) localStorage.setItem('ichef_rh_change_history', JSON.stringify(state.activeOrders['RH_CHANGE_HISTORY'].data || []));
                    if (state.activeOrders['RH_HOURS_RESET_MASTER']) localStorage.setItem('ichef_rh_hours_reset', JSON.stringify(state.activeOrders['RH_HOURS_RESET_MASTER'].data || {}));
                    if (state.activeOrders['RH_TIMESHEET_REAL']) localStorage.setItem('ichef_rh_timesheet_real', JSON.stringify(state.activeOrders['RH_TIMESHEET_REAL'].data || { months: {} }));
                    syncRhStaffFromState(
                        state,
                        {
                            render: false
                        }
                    );
                }
                checkFocusRequest(); // Téléportation
            } catch (e) { console.error("Erreur de synchro au démarrage", e); }
            loadPublicPlanning();
            updateReqBadge();
            updateDashboardStats();
           if (typeof broadcastStaffingLevels === 'function') {
    broadcastStaffingLevels();
}
            connectRhRealtimeSync();
            // V148 PERFORMANCE — une seule boucle de synchronisation, sans chevauchement.
            // Les connexions API / Socket existantes restent inchangées.
            let rhMainSyncTimer = null;
            let rhMainSyncBusy = false;
            async function runRhMainSyncLoopV148() {
                if (rhMainSyncBusy) {
                    rhMainSyncTimer = setTimeout(runRhMainSyncLoopV148, 4000);
                    return;
                }
                // Quand l’onglet est masqué ou hors ligne, on garde la connexion
                // mais on évite les requêtes répétées inutiles.
                if (document.hidden || !navigator.onLine) {
                    rhMainSyncTimer = setTimeout(runRhMainSyncLoopV148, 30000);
                    return;
                }
                rhMainSyncBusy = true;
                try {
                    await Promise.resolve(refreshRhStaffFromServer());
                    if (loginMode === 'director') {
                        const state = await API.getState();
                        if (state?.activeOrders?.['REQUESTS_MASTER']) {
                            localStorage.setItem(
                                'empire_hr_requests',
                                JSON.stringify(state.activeOrders['REQUESTS_MASTER'].data || [])
                            );
                            updateReqBadge();
                            if (document.getElementById('requests-interface')?.style.display === 'flex') {
                                renderDirectorRequests();
                            }
                        }
                    }
                } catch (error) {
                    console.warn('[iCHEF RH V148] synchro différée', error);
                } finally {
                    rhMainSyncBusy = false;
                    rhMainSyncTimer = setTimeout(runRhMainSyncLoopV148, 10000);
                }
            }
            function restartRhMainSyncV148(delay = 250) {
                if (rhMainSyncTimer) clearTimeout(rhMainSyncTimer);
                rhMainSyncTimer = setTimeout(runRhMainSyncLoopV148, delay);
            }
            document.addEventListener('visibilitychange', () => {
                if (!document.hidden) restartRhMainSyncV148(150);
            });
            window.addEventListener('online', () => restartRhMainSyncV148(150));
            restartRhMainSyncV148(1000);
            const fullscreenBtn = document.getElementById('btn-kiosk');
            if (fullscreenBtn) {
                fullscreenBtn.addEventListener('click', () => {
                    const elem = document.documentElement;
                    if (!document.fullscreenElement) {
                        if (elem.requestFullscreen) elem.requestFullscreen().catch(() => {});
                        else if (elem.webkitRequestFullscreen) elem.webkitRequestFullscreen();
                        else if (elem.msRequestFullscreen) elem.msRequestFullscreen();
                        fullscreenBtn.innerText = "QUITTER PLEIN ÉCRAN";
                    } else {
                        if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
                        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
                        fullscreenBtn.innerText = "PLEIN ÉCRAN";
                    }
                });
            }
            // Sécurité anti-boucle : la pointeuse ne doit jamais se relancer automatiquement.
            localStorage.removeItem('ichef_rh_kiosk_mode');
            try { punchKioskMode = false; } catch(e) {}
        };
        const daysOfWeek = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
        const monthNames = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Aoû", "Sep", "Oct", "Nov", "Déc"];
        // ==========================================
        // 🔮 TÉLÉPORTATION & DASHBOARD
        // ==========================================
        function checkFocusRequest() {
            let focusPin = localStorage.getItem('ichef_rh_focus');
            if(focusPin) {
                localStorage.removeItem('ichef_rh_focus');
                let staffObj = getDir().find(s => s.pin === focusPin);
                if(staffObj) {
                    // Simuler la connexion Directeur sur le bon département
                    currentDept = staffObj.dept;
                    loginMode = 'director';
                    document.getElementById('landing-portal').style.display = 'none';
                    openInterface('hr');
                    selectStaff(staffObj.id);
                }
            }
        }
        function updateDashboardStats() {
            const dir = getDir();
            let actifs = dir.filter(s => s.active !== false).length;
            let enPoste = dir.filter(s => s.active !== false && s.onDuty).length;
            const totalEl = document.getElementById('stat-total-staff');
            const activeEl = document.getElementById('stat-active-staff');
            if (totalEl) totalEl.innerText = actifs;
            if (activeEl) activeEl.innerText = enPoste;
        }
        // ==========================================
        // PORTAIL CONNEXION
        // ==========================================
        function openDeptSelection() {
            loginMode = 'director';
            document.getElementById('staff-select-container').style.display = 'none';
            document.getElementById('pin-dept-title').innerText = "CODE REQUIS";
            document.getElementById('dept-modal').style.display = 'flex';
        }
        function closeDeptSelection() { document.getElementById('dept-modal').style.display = 'none'; }
        function showPinPad(dept) {
            currentDept = dept;
            currentPin = "";

            const display = document.getElementById('pin-display');
            if (display) display.innerText = "";

            const deptModal = document.getElementById('dept-modal');
            if (deptModal) {
                deptModal.classList.remove('show');
                deptModal.style.display = 'none';
            }

            const pinModal = document.getElementById('pin-modal');
            if (pinModal) {
                pinModal.classList.add('show');
                pinModal.style.display = 'flex';
                pinModal.style.opacity = '1';
            }

            const title = document.getElementById('pin-dept-title');
            if (title) title.innerText = "ACCÈS " + String(dept || 'RH').toUpperCase();

            requestAnimationFrame(() => {
                document.querySelector('#pin-modal .pin-btn[data-v222-key], #pin-modal .pin-btn')?.focus?.();
            });
        }

        function appendPin(n) {
            const digit = String(n ?? '').replace(/\D/g, '').slice(0,1);
            if (!digit || currentPin.length >= 12) return;
            currentPin += digit;
            const display = document.getElementById('pin-display');
            if (display) {
                display.innerText = '●'.repeat(currentPin.length);
                display.setAttribute('aria-label', `${currentPin.length} chiffre${currentPin.length>1?'s':''} saisi${currentPin.length>1?'s':''}`);
            }
        }

        function cancelPin() {
            currentPin = "";
            const display = document.getElementById('pin-display');
            if (display) display.innerText = "";

            const pinModal = document.getElementById('pin-modal');
            if (pinModal) {
                pinModal.classList.remove('show');
                pinModal.style.display = 'none';
            }

            if (loginMode === 'exit-kiosk') {
                loginMode = '';
                return;
            }

            const landing = document.getElementById('landing-portal');
            if (landing) landing.style.display = 'flex';
        }

        window.showPinPad = showPinPad;
        window.appendPin = appendPin;
        window.cancelPin = cancelPin;
        function openRhLinkedModule(fileName) {
            const clean = String(fileName || '').replace(/[^a-zA-Z0-9._-]/g, '');
            if (!clean) return;
            const suffix = tenantID_JS ? `?tenantID=${encodeURIComponent(tenantID_JS)}` : '';
            window.location.href = clean + suffix;
        }
        async function openStaffPortalLogin() {
            // V86 : rh.html est strictement réservé à la hiérarchie/RH.
            // Toute connexion collaborateur est déléguée au portail Staff dédié.
            openRhLinkedModule('portail-staff.html');
        }
        function escapeRhHtml(value) {
            return String(value ?? '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        }
        function rhRequestTypeLabel(type) {
            const labels = {
                conge: 'Congés payés / Vacances',
                recup: 'Récupération / Repos compensateur',
                maladie: 'Maladie',
                accident_travail: 'Accident du travail',
                maternite: 'Congé maternité',
                paternite: 'Congé paternité / accueil enfant',
                parental: 'Congé parental',
                enfant_malade: 'Enfant malade / proche aidé',
                evenement_familial: 'Événement familial',
                deces: 'Décès / deuil',
                formation: 'Formation',
                sans_solde: 'Congé sans solde',
                absence_autorisee: 'Absence autorisée',
                absence_injustifiee: 'Absence injustifiée',
                off: 'Jour off'
            };
            return labels[String(type || '').toLowerCase()] || String(type || 'Demande');
        }
        function rhRequestStatusLabel(status) {
            const s = String(status || 'pending').toLowerCase();
            if (['approved', 'accepte', 'accepté', 'valide', 'validé'].includes(s)) return 'ACCEPTÉE';
            if (['rejected', 'refuse', 'refusé'].includes(s)) return 'REFUSÉE';
            return 'EN ATTENTE';
        }
        function rhRequestStatusClass(status) {
            const s = String(status || 'pending').toLowerCase();
            if (['approved', 'accepte', 'accepté', 'valide', 'validé'].includes(s)) return 'status-approved';
            if (['rejected', 'refuse', 'refusé'].includes(s)) return 'status-rejected';
            return 'status-pending';
        }
        function formatRhDate(value) {
            if (!value) return '-';
            const d = new Date(value);
            if (Number.isNaN(d.getTime())) return escapeRhHtml(value);
            return d.toLocaleDateString('fr-FR');
        }
        function rhRequestProofId(request) {
            return String(
                request?.requestNumber ||
                request?.proofId ||
                request?.id ||
                '-'
            );
        }
        function rhRequestEventDate(value, withTime = true) {
            if (!value) return '-';
            let d;
            const n = Number(value);
            if (Number.isFinite(n) && n > 1000000000) {
                d = new Date(n);
            } else {
                d = new Date(value);
            }
            if (Number.isNaN(d.getTime())) {
                return String(value);
            }
            return d.toLocaleString(
                'fr-FR',
                withTime
                    ? {
                        day:'2-digit',
                        month:'2-digit',
                        year:'numeric',
                        hour:'2-digit',
                        minute:'2-digit'
                    }
                    : {
                        day:'2-digit',
                        month:'2-digit',
                        year:'numeric'
                    }
            );
        }
        function openRhRequestProof(requestId) {
            const request =
                getReqs().find(
                    r =>
                        String(r.id) ===
                        String(requestId)
                );
            if (!request) {
                alert("Demande introuvable.");
                return;
            }
            const history =
                Array.isArray(request.history)
                    ? request.history
                    : [];
            const body =
                document.getElementById(
                    'rh-request-proof-body'
                );
            if (!body) return;
            body.innerHTML = `
                <div class="rh-proof-grid">
                    <div class="rh-proof-box">
                        <small>Numéro de preuve</small>
                        <strong>${escapeRhHtml(rhRequestProofId(request))}</strong>
                    </div>
                    <div class="rh-proof-box">
                        <small>Statut</small>
                        <strong>${escapeRhHtml(rhRequestStatusLabel(request.status))}</strong>
                    </div>
                    <div class="rh-proof-box">
                        <small>Collaborateur</small>
                        <strong>${escapeRhHtml(request.staffName || 'Employé')}</strong>
                    </div>
                    <div class="rh-proof-box">
                        <small>Type</small>
                        <strong>${escapeRhHtml(rhRequestTypeLabel(request.type || request.requestType))}</strong>
                    </div>
                    <div class="rh-proof-box">
                        <small>Période</small>
                        <strong>${escapeRhHtml(request.startDate || request.start || '-')} → ${escapeRhHtml(request.endDate || request.end || '-')}</strong>
                    </div>
                    <div class="rh-proof-box">
                        <small>Envoyée le</small>
                        <strong>${escapeRhHtml(rhRequestEventDate(request.createdAt || request.timestamp || request.id))}</strong>
                    </div>
                    <div class="rh-proof-box">
                        <small>Décision</small>
                        <strong>${escapeRhHtml(request.decidedAt || request.processedAt ? rhRequestEventDate(request.decidedAt || request.processedAt) : 'En attente')}</strong>
                    </div>
                    <div class="rh-proof-box">
                        <small>Décidée par</small>
                        <strong>${escapeRhHtml(request.decidedBy || request.processedBy || '—')}</strong>
                    </div>
                </div>

                <div class="rh-proof-box" style="margin-top:10px;">
                    <small>Commentaire / motif</small>
                    <strong>${escapeRhHtml(request.comment || request.note || request.reason || '—')}</strong>
                </div>

                <div class="rh-proof-history">
                    <div style="color:var(--gold);font-size:.68rem;font-weight:900;letter-spacing:.8px;text-transform:uppercase;margin-bottom:8px;">
                        Historique de la demande
                    </div>
                    ${
                        history.length
                            ? history.map(event => `
                                <div class="rh-proof-event">
                                    <strong>${escapeRhHtml(event.action || event.status || 'Événement')}</strong>
                                    <small>${escapeRhHtml(rhRequestEventDate(event.at || event.date))} · ${escapeRhHtml(event.by || 'iCHEF RH')}</small>
                                </div>
                            `).join('')
                            : `
                                <div class="rh-proof-event">
                                    <strong>CREATED</strong>
                                    <small>${escapeRhHtml(rhRequestEventDate(request.createdAt || request.timestamp || request.id))} · ${escapeRhHtml(request.staffName || 'Collaborateur')}</small>
                                </div>
                            `
                    }
                </div>
            `;
            document
                .getElementById('rh-request-proof-modal')
                ?.classList.add('show');
        }
        function closeRhRequestProof() {
            document
                .getElementById('rh-request-proof-modal')
                ?.classList.remove('show');
        }
        function getEmployeeSixMonthRows(staff) {
            const now = new Date();
            const rows = [];
            for (let offset = 0; offset < 6; offset++) {
                const d =
                    new Date(
                        now.getFullYear(),
                        now.getMonth() - offset,
                        1
                    );
                const monthStr =
                    `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
                const daysInMonth =
                    new Date(
                        d.getFullYear(),
                        d.getMonth()+1,
                        0
                    ).getDate();
                const allTs = getTs();
                const monthNode =
                    allTs?.[monthStr] || {};
                const plan =
                    monthNode?.[staff.id] ||
                    monthNode?.[String(staff.id)] ||
                    {};
                const plannedStats =
                    getStaffMonthStats(
                        staff.id,
                        d.getFullYear(),
                        d.getMonth()+1,
                        daysInMonth,
                        plan
                    ) || {
                        expected:0,
                        totalDone:0
                    };
                const real =
                    getRealSheetForStaff(
                        staff.id,
                        monthStr
                    );
                const pointed =
                    Number(
                        real?.totals?.rawWorkedHours
                    );
                const retained =
                    Number(
                        real?.totals?.workedHours
                    );
                const realPointed =
                    Number.isFinite(pointed)
                        ? pointed
                        : Number(plannedStats.totalDone || 0);
                const realRetained =
                    Number.isFinite(retained)
                        ? retained
                        : realPointed;
                const target =
                    Number(plannedStats.expected || 0);
                const balance =
                    realRetained - target;
                rows.push({
                    month:monthStr,
                    target,
                    planned:Number(plannedStats.totalDone || 0),
                    pointed:realPointed,
                    retained:realRetained,
                    overtime:Math.max(0,balance),
                    due:Math.max(0,-balance),
                    status:
                        String(
                            real?.status ||
                            'TO_VERIFY'
                        )
                });
            }
            return rows;
        }
        function renderEmployeeSixMonths(staff) {
            const body =
                document.getElementById(
                    'emp-six-month-body'
                );
            if (!body) return;
            const rows =
                getEmployeeSixMonthRows(
                    staff
                );
            body.innerHTML =
                rows.map(row => `
                    <tr>
                        <td><strong>${escapeRhHtml(row.month)}</strong></td>
                        <td>${row.target.toFixed(1)}h</td>
                        <td>${row.planned.toFixed(1)}h</td>
                        <td>${row.pointed.toFixed(1)}h</td>
                        <td>${row.retained.toFixed(1)}h</td>
                        <td>${row.overtime.toFixed(1)}h</td>
                        <td>${row.due.toFixed(1)}h</td>
                        <td>${escapeRhHtml(row.status.replaceAll('_',' '))}</td>
                    </tr>
                `).join('');
        }
        function updateReqBadge() {
            const reqs = getReqs();
            const pending = reqs.filter(r => {
                const s = String(r.status || 'pending').toLowerCase();
                return !['approved', 'accepte', 'accepté', 'valide', 'validé', 'rejected', 'refuse', 'refusé'].includes(s);
            }).length;
            const badge = document.getElementById('req-badge');
            if (badge) badge.innerText = String(pending);
        }
        function renderEmployeePortal() {
            const staff = getDir().find(s => String(s.id) === String(loggedInStaffId));
            if (!staff) {
                alert("Profil employé introuvable.");
                fullLogout();
                return;
            }
            const nameEl = document.getElementById('emp-name-display');
            if (nameEl) nameEl.innerText = staff.name || 'Employé';
            const defaultMonth =
                `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
            const employeeMonthSelector =
                document.getElementById('emp-month-selector');
            if (employeeMonthSelector && !employeeMonthSelector.value) {
                employeeMonthSelector.value =
                    document.getElementById('month-selector')?.value ||
                    defaultMonth;
            }
            const monthStr =
                employeeMonthSelector?.value ||
                document.getElementById('month-selector')?.value ||
                defaultMonth;
            const [year, month] = monthStr.split('-').map(Number);
            const daysInMonth = new Date(year, month, 0).getDate();
            const ts = getTs();
            const monthData = ts[monthStr]?.[staff.id] || ts[monthStr]?.[String(staff.id)] || {};
            const stats = getStaffMonthStats(
                staff.id,
                year,
                month,
                daysInMonth,
                monthData
            ) || {
                expected: 0,
                totalDone: 0,
                extraHours: 0,
                countF: 0,
                countCP: 0,
                cpRestants: 30,
                missedHours: 0
            };
            const put = (id, value) => {
                const el = document.getElementById(id);
                if (el) el.innerText = value;
            };
            const realSheet =
                getRealSheetForStaff(
                    staff.id,
                    monthStr
                );
            const rawPointed =
                Number(
                    realSheet
                        ?.totals
                        ?.rawWorkedHours
                );
            const rhRetained =
                Number(
                    realSheet
                        ?.totals
                        ?.workedHours
                );
            const pointedHours =
                Number.isFinite(rawPointed)
                    ? rawPointed
                    : Number(stats.totalDone || 0);
            const retainedHours =
                Number.isFinite(rhRetained)
                    ? rhRetained
                    : pointedHours;
            const expectedHours =
                Number(stats.expected || 0);
            const rhBalance =
                retainedHours -
                expectedHours;
            const rhOvertime =
                Math.max(
                    0,
                    rhBalance
                );
            const rhDue =
                Math.max(
                    0,
                    -rhBalance
                );
            put('emp-stat-expected', expectedHours.toFixed(1) + 'h');
            put('emp-stat-actual', retainedHours.toFixed(1) + 'h');
            put('emp-stat-pointed', pointedHours.toFixed(1) + 'h');
            put('emp-stat-sup', '+' + rhOvertime.toFixed(1) + 'h');
            put('emp-stat-h-due', rhDue.toFixed(1) + 'h');
            put(
                'emp-stat-rh-status',
                String(
                    realSheet?.status ||
                    'TO_VERIFY'
                ).replaceAll('_',' ')
            );
            put('emp-stat-ferie', stats.countF + 'j');
            put('emp-stat-cp', stats.countCP + 'j');
            put('emp-stat-cp-rest', stats.cpRestants + 'j');
            renderEmployeeSixMonths(
                staff
            );
            let planningHtml = '';
            for (let day = 1; day <= daysInMonth; day++) {
                const p = monthData[day] || {
                    status: 'off',
                    s1: '',
                    s2: '',
                    pause: 0
                };
                const date = new Date(year, month - 1, day);
                const statusLabel = {
                    present: 'TRAVAIL',
                    off_soir: 'MATIN SEUL',
                    off_matin: 'SOIR SEUL',
                    off: 'REPOS',
                    conge: 'CONGÉS',
                    maladie: 'MALADIE',
                    ferie: 'FÉRIÉ',
                    recup: 'RÉCUP'
                }[p.status] || String(p.status || 'REPOS').toUpperCase();
                const hours = [p.s1, p.s2].filter(Boolean).join(' / ') || '-';
                const total = calculateNet(p);
                planningHtml += `
                    <tr>
                        <td>${daysOfWeek[date.getDay()].charAt(0)} ${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}</td>
                        <td>${statusLabel}</td>
                        <td>${escapeRhHtml(hours)}</td>
                        <td>${total > 0 ? total.toFixed(1) + 'h' : '-'}</td>
                    </tr>
                `;
            }
            const planningBody = document.getElementById('emp-planning-body');
            if (planningBody) planningBody.innerHTML = planningHtml;
            const requests = getReqs()
                .filter(r => String(r.staffId) === String(staff.id) || String(r.staffPin || '') === String(staff.pin || ''))
                .sort((a, b) => Number(b.createdAt || b.timestamp || b.id || 0) - Number(a.createdAt || a.timestamp || a.id || 0));
            const reqBody = document.getElementById('emp-requests-body');
            if (reqBody) {
                reqBody.innerHTML = requests.length
                    ? requests.map(r => `
                        <tr>
                            <td>${formatRhDate(r.createdAt || r.timestamp || r.id)}</td>
                            <td>
                                <strong>${escapeRhHtml(rhRequestTypeLabel(r.type || r.requestType))}</strong><br>
                                <span style="color:var(--text-muted);">${formatRhDate(r.startDate || r.start)} → ${formatRhDate(r.endDate || r.end)}</span>
                                <div class="rh-request-proof">${escapeRhHtml(rhRequestProofId(r))}</div>
                            </td>
                            <td>
                                <span class="status-badge ${rhRequestStatusClass(r.status)}">
                                    ${rhRequestStatusLabel(r.status)}
                                </span>
                                ${
                                    (r.decidedAt || r.processedAt)
                                        ? `<div style="color:var(--text-muted);font-size:.62rem;margin-top:5px;">${escapeRhHtml(rhRequestEventDate(r.decidedAt || r.processedAt))}</div>`
                                        : ''
                                }
                            </td>
                            <td>
                                <button
                                    class="rh-proof-btn"
                                    type="button"
                                    onclick="openRhRequestProof('${String(r.id).replace(/'/g, "\'")}')"
                                >PREUVE</button>
                            </td>
                        </tr>
                    `).join('')
                    : '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:20px;">Aucune demande.</td></tr>';
            }
        }
        function submitEmployeeRequest() {
            const staff = getDir().find(s => String(s.id) === String(loggedInStaffId));
            if (!staff) return alert("Profil employé introuvable.");
            const type = document.getElementById('emp-req-type').value;
            const startDate = document.getElementById('emp-req-start').value;
            const endDate = document.getElementById('emp-req-end').value;
            const comment = document.getElementById('emp-req-comment').value.trim();
            if (!startDate || !endDate || !comment) {
                return alert("La période et le motif sont obligatoires.");
            }
            if (new Date(endDate) < new Date(startDate)) {
                return alert("La date de fin doit être postérieure ou égale à la date de début.");
            }
            const reqs = getReqs();
            const now =
                new Date();
            const requestNumber =
                `REQ-${now.getFullYear()}-${String(Date.now()).slice(-7)}`;
            const request = {
                id:requestNumber,
                requestNumber,
                proofId:requestNumber,
                staffId:staff.id,
                staffPin:staff.pin,
                staffName:staff.name,
                dept:staff.dept,
                type,
                requestType:
                    type === 'conge'
                        ? 'VACANCES'
                        : (
                            type === 'recup'
                                ? 'RECUPERATION'
                                : (
                                    type === 'off'
                                        ? 'JOUR_OFF'
                                        : String(type || '').toUpperCase()
                                )
                        ),
                startDate,
                endDate,
                start:startDate,
                end:endDate,
                comment,
                note:comment,
                status:'pending',
                createdAt:now.toISOString(),
                updatedAt:now.toISOString(),
                source:'RH_EMPLOYEE_PORTAL',
                history:[
                    {
                        action:'CREATED',
                        status:'PENDING',
                        at:now.toISOString(),
                        by:staff.name || 'Collaborateur'
                    }
                ]
            };
            reqs.push(
                request
            );
            saveReqs(reqs);
            document.getElementById('emp-req-start').value = '';
            document.getElementById('emp-req-end').value = '';
            document.getElementById('emp-req-comment').value = '';
            updateReqBadge();
            renderEmployeePortal();
            showToast("Demande envoyée à la direction");
        }
        async function submitPin() {
            const enteredPin = String(currentPin || '').trim();
            if (!enteredPin) return;
            const submitButton = document.querySelector('#pin-modal .pin-btn[onclick="submitPin()"]');
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.style.opacity = '0.55';
            }
            try {
                const auth = await verifyPinWithServer(enteredPin);
                if (!auth.success) {
                    alert(auth.error || "Code PIN incorrect.");
                    currentPin = "";
                    document.getElementById('pin-display').innerText = "";
                    return;
                }
                const serverRole = String(auth.role || '').trim().toLowerCase();
                if (loginMode === 'exit-kiosk') {
                    const directionRoles = new Set([
                        'master',
                        'admin',
                        'manager',
                        'direction',
                        'directeur',
                        'gerant',
                        'gérant',
                        'chef',
                        'chef de service',
                        'responsable',
                        'responsable rh',
                        'rh',
                        'superviseur',
                        'supervisor',
                        'owner',
                        'proprietaire',
                        'propriétaire',
                        'founder',
                        'fondateur'
                    ]);
                    const serverDept = String(auth?.dept || '').trim().toLowerCase();
                    const serverManager =
                        auth?.isManager === true ||
                        auth?.isMaster === true ||
                        ['admin','direction','rh','management'].includes(serverDept);
                    if (!serverManager && !directionRoles.has(serverRole)) {
                        alert("PIN Direction requis pour quitter le mode pointeuse.");
                        currentPin = "";
                        document.getElementById('pin-display').innerText = "";
                        return;
                    }
                    currentPin = "";
                    document.getElementById('pin-display').innerText = "";
                    document.getElementById('pin-modal').style.display = 'none';
                    deactivatePunchKioskMode();
                    return;
                }
                if (loginMode === 'director') {
                    const directionRoles = new Set([
                        'master',
                        'admin',
                        'manager',
                        'direction',
                        'directeur',
                        'gerant',
                        'gérant',
                        'chef',
                        'chef de service',
                        'responsable',
                        'responsable rh',
                        'rh',
                        'superviseur',
                        'supervisor',
                        'owner',
                        'proprietaire',
                        'propriétaire',
                        'founder',
                        'fondateur'
                    ]);
                    const serverDept = String(auth?.dept || '').trim().toLowerCase();
                    const serverManager =
                        auth?.isManager === true ||
                        auth?.isMaster === true ||
                        ['admin','direction','rh','management'].includes(serverDept);
                    if (!serverManager && !directionRoles.has(serverRole)) {
                        alert("Ce code PIN n'a pas les droits Direction.");
                        currentPin = "";
                        rhDirectionAuthPin = "";
                        document.getElementById('pin-display').innerText = "";
                        return;
                    }
                    // Nécessaire aux écritures planning et à l'IA sécurisées.
                    // Le PIN reste uniquement en mémoire vive de cette page.
                    rhDirectionAuthPin = enteredPin;
                    const pinModal = document.getElementById('pin-modal');
                    if (pinModal) {
                        pinModal.classList.remove('show');
                        pinModal.style.display = 'none';
                    }
                    document.getElementById('landing-portal').style.display = 'none';
                    document.getElementById('director-hub').style.display = 'flex';
                    document.getElementById('hub-dept-display').innerText =
                        String(currentDept || 'direction').toUpperCase();
                    try {
                        await refreshStaffAccessFromServer();
                    } catch (_) {}
                    updateDashboardStats();
                    updateReqBadge();
                    if (typeof renderRhCockpit === 'function') renderRhCockpit();
                    return;
                }
                if (loginMode === 'staff') {
                    currentPin = "";
                    document.getElementById('pin-display').innerText = "";
                    document.getElementById('pin-modal').style.display = 'none';
                    openRhLinkedModule('portail-staff.html');
                    return;
                }
            } catch (error) {
                console.error("Erreur authentification RH :", error);
                alert(error?.message || "Impossible de vérifier le code PIN sur le serveur.");
            } finally {
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.style.opacity = '1';
                }
            }
        }
        window.submitPin = submitPin;
        window.getRhDirectionAuthPin = getRhDirectionAuthPin;
        window.syncStaffAccessToCloud = syncStaffAccessToCloud;
        window.ICHEF_RH_API = API;

        // ==========================================
        // GESTION VUES
        // ==========================================
        function openInterface(type) {
            const targetMap = {
                hr: 'hr-interface',
                logs: 'logs-interface',
                requests: 'requests-interface',
                timesheets: 'timesheets-interface'
            };
            const target = document.getElementById(targetMap[type] || '');
            if (!target) return;

            // Préparer les données AVANT le basculement visuel.
            // Cela évite l'écran vide/noir d'une frame.
            if(type === 'hr') {
                currentStaffId = null;
                isGlobalView = true;
                isAnnualView = false;
                refreshViews();
                toggleViewDisplay();
            } else if(type === 'logs') {
                renderLogs();
            } else if(type === 'requests') {
                renderDirectorRequests();
            } else if(type === 'timesheets') {
                const monthInput = document.getElementById('real-timesheet-month');
                if (monthInput && !monthInput.value) {
                    monthInput.value =
                        document.getElementById('month-selector')?.value ||
                        new Date().toISOString().slice(0, 7);
                }
                renderRealTimesheets();
            }

            document.documentElement.classList.add('rh-v218-view-switching');
            document.querySelectorAll('.full-interface').forEach(el => {
                el.style.display = el === target ? 'flex' : 'none';
            });
            document.getElementById('director-hub').style.display = 'none';
            requestAnimationFrame(() =>
                document.documentElement.classList.remove('rh-v218-view-switching')
            );
        }
        function backToHub() {
            // Préparer le hub avant de masquer l'écran courant.
            updateDashboardStats();
            updateReqBadge();
            if (typeof renderRhCockpit === 'function') renderRhCockpit();

            document.documentElement.classList.add('rh-v218-view-switching');
            document.querySelectorAll('.full-interface').forEach(el => el.style.display = 'none');
            document.getElementById('director-hub').style.display = 'flex';
            requestAnimationFrame(() =>
                document.documentElement.classList.remove('rh-v218-view-switching')
            );
        }
        function fullLogout() {
            loggedInStaffId = null;
            currentPin = "";
            rhDirectionAuthPin = "";
            loginMode = "";
            document.querySelectorAll('.full-interface').forEach(el => el.style.display = 'none');
            document.getElementById('employee-portal').style.display = 'none';
            document.getElementById('director-hub').style.display = 'none';
            document.getElementById('landing-portal').style.display = 'flex';
        }
        // ==========================================
        // GESTION DU STAFF ET CLOUD
        // ==========================================
        async function syncStaffAccessToCloud(dirList) {
            try {
                let staffAccessPayload = dirList
                    .filter(s => /^\d{4,12}$/.test(String(s.pin || '').trim()))
                    .map(s => ({
                        id: s.id,
                        name: s.name,
                        role: s.role,
                        dept: s.dept,
                        pin: String(s.pin).trim(),
                        contract: Number(s.contract) || 39,
                        annualLeaveDays: Number(s.annualLeaveDays ?? 25),
                        leaveCarryover: Number(s.leaveCarryover ?? 0),
                        recoveryBalance: Number(s.recoveryBalance ?? 0),
                        grossSalaryMonthly: Number(s.grossSalaryMonthly ?? 0),
                        hourlyCost: Number(s.hourlyCost ?? 0),
                        skillLevel: String(s.skillLevel || 'autonome'),
                        skills: Array.isArray(s.skills) ? s.skills : [],
                        availability: String(s.availability || ''),
                        minRestHours: Number(s.minRestHours ?? 11),
                        maxConsecutiveDays: Number(s.maxConsecutiveDays ?? 6),
                        active: s.active !== false,
                        onDuty: s.onDuty || false
                    }));
                const authPin = getRhDirectionAuthPin();
                const staffSyncResponse = await fetch(
                    `${SERVER_URL_JS}/update-order?tenantID=${encodeURIComponent(tenantID_JS)}`,
                    {
                        method: 'POST',
                        credentials: 'include',
                        cache: 'no-store',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json',
                            'X-iCHEF-Tenant': tenantID_JS
                        },
                        body: JSON.stringify({
                            tenantID: tenantID_JS,
                            masterPin: authPin || undefined,
                            tableId: 'STAFF_ACCESS',
                            order: { data: staffAccessPayload }
                        })
                    }
                );
                if (!staffSyncResponse.ok) {
                    const err = await staffSyncResponse.json().catch(() => ({}));
                    throw new Error(
                        err.error ||
                        `Sync STAFF_ACCESS HTTP ${staffSyncResponse.status}`
                    );
                }
                staffAccess = staffAccessPayload;
                const syncCache = JSON.parse(localStorage.getItem('EMPIRE_GLOBAL_SYNC') || '{"activeOrders":{}}');
                if (!syncCache.activeOrders) syncCache.activeOrders = {};
                syncCache.activeOrders.STAFF_ACCESS = { data: staffAccessPayload };
                localStorage.setItem('EMPIRE_GLOBAL_SYNC', JSON.stringify(syncCache));
                await refreshRhStaffFromServer();
                return true;
            } catch (e) {
                console.error(
                    "Erreur de sync STAFF_ACCESS",
                    e
                );
                return false;
            }
        }
        function getStaffSalaryCurrency() {
            try {
                const profile = window.ICHEF_AUTO_CURRENCY_CONVENTION_V186?.profile;
                if (profile?.currency) {
                    return {
                        code: String(profile.currency).toUpperCase(),
                        symbol: String(profile.symbol || (String(profile.currency).toUpperCase() === 'EUR' ? '€' : 'CHF'))
                    };
                }
            } catch (_) {}
            try {
                const payroll = JSON.parse(localStorage.getItem('ichef_payroll_settings_v2') || '{}') || {};
                const code = String(payroll.currency || '').toUpperCase();
                if (code === 'EUR' || code === 'CHF') {
                    return { code, symbol: code === 'EUR' ? '€' : 'CHF' };
                }
            } catch (_) {}
            try {
                const settings = typeof getRhSettings === 'function' ? (getRhSettings() || {}) : {};
                const code = String(settings.currency || '').toUpperCase();
                if (code === 'EUR' || code === 'CHF') {
                    return { code, symbol: code === 'EUR' ? '€' : 'CHF' };
                }
            } catch (_) {}
            return { code: 'CHF', symbol: 'CHF' };
        }
        function getStaffGrossSalaryFromPayroll(staff) {
            if (!staff?.id) return 0;
            try {
                const profiles = JSON.parse(localStorage.getItem('ichef_payroll_profiles_v2') || '{}') || {};
                return Number(profiles?.[staff.id]?.monthlySalary || 0);
            } catch (_) {
                return 0;
            }
        }
        function calculateStaffGrossHourly(grossSalaryMonthly, contractHoursWeek) {
            const gross = Math.max(0, Number(grossSalaryMonthly) || 0);
            const weekly = Math.max(0, Number(contractHoursWeek) || 0);
            const monthlyHours = weekly * 52 / 12;
            if (!gross || !monthlyHours) return 0;
            return Math.round((gross / monthlyHours) * 100) / 100;
        }
        function getStaffSalaryMonth() {
            const selector = document.getElementById('month-selector');
            const selected = String(selector?.value || '').trim();
            if (/^\d{4}-\d{2}$/.test(selected)) return selected;
            const now = new Date();
            return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        }
        function getEditingStaffForSalary() {
            const originalPin = String(document.getElementById('staff-edit-original-pin')?.value || '').trim();
            if (!originalPin) return null;
            try {
                return getDir().find(staff => String(staff.pin || '') === originalPin) || null;
            } catch (_) {
                return null;
            }
        }
        function toggleStaffSalaryInfo(event) {
            event?.preventDefault?.();
            event?.stopPropagation?.();
            const panel = document.getElementById('staff-salary-info');
            if (!panel) return;
            const willOpen = panel.style.display === 'none' || !panel.style.display;
            panel.style.display = willOpen ? 'block' : 'none';
            document.querySelectorAll('.staff-salary-info-btn').forEach(btn => {
                btn.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
            });
            if (willOpen) updateStaffGrossHourlyCost();
        }
        function updateStaffGrossHourlyCost() {
            const grossEl = document.getElementById('staff-gross-salary');
            const contractEl = document.getElementById('staff-contract');
            const hourlyEl = document.getElementById('staff-hourly-cost');
            if (!grossEl || !contractEl || !hourlyEl) return 0;
            const gross = Number(grossEl.value) || 0;
            const weekly = Number(contractEl.value) || 0;
            const monthlyHours = weekly > 0 ? weekly * 52 / 12 : 0;
            const hourly = calculateStaffGrossHourly(gross, weekly);
            const currency = getStaffSalaryCurrency();
            const monthStr = getStaffSalaryMonth();
            const monthLabel = document.getElementById('staff-pay-month-label');
            if (monthLabel) {
                try {
                    monthLabel.textContent = new Date(`${monthStr}-01T12:00:00`).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
                } catch (_) {
                    monthLabel.textContent = monthStr;
                }
            }
            const editingStaff = getEditingStaffForSalary();
            let actualHours = 0;
            if (editingStaff?.id && typeof getActualHoursSummary === 'function') {
                try {
                    actualHours = Math.max(0, Number(getActualHoursSummary(editingStaff.id, monthStr)?.total || 0));
                } catch (_) {
                    actualHours = 0;
                }
            }
            const actualHoursValue = Math.round(actualHours * 100) / 100;
            const workedGrossValue = Math.round(hourly * actualHoursValue * 100) / 100;
            hourlyEl.value = hourly.toFixed(2);
            const actualHoursEl = document.getElementById('staff-actual-hours-month');
            const actualCostEl = document.getElementById('staff-actual-cost-month');
            if (actualHoursEl) actualHoursEl.value = actualHoursValue.toFixed(2);
            if (actualCostEl) actualCostEl.value = workedGrossValue.toFixed(2);
            const grossLabel = document.getElementById('staff-gross-currency-label');
            const hourlyLabel = document.getElementById('staff-hourly-currency-label');
            const actualCostLabel = document.getElementById('staff-actual-cost-currency-label');
            if (grossLabel) grossLabel.textContent = currency.symbol;
            if (hourlyLabel) hourlyLabel.textContent = currency.symbol;
            if (actualCostLabel) actualCostLabel.textContent = currency.symbol;
            const help = document.getElementById('staff-hourly-auto-help');
            if (help) {
                help.textContent = monthlyHours > 0
                    ? `Base contractuelle moyenne : ${monthlyHours.toFixed(2)} h/mois · Taux brut : ${hourly.toFixed(2)} ${currency.symbol}/h · Heures pointées : ${actualHoursValue.toFixed(2)} h.`
                    : 'Renseignez les heures du contrat pour calculer automatiquement le taux horaire brut.';
            }
            const info = document.getElementById('staff-salary-info-dynamic');
            if (info) {
                const example = weekly > 0 && gross > 0
                    ? `Avec les valeurs de cette fiche : ${weekly.toFixed(2)} h/semaine = ${monthlyHours.toFixed(2)} h/mois en moyenne ; ${gross.toFixed(2)} ${currency.symbol} ÷ ${monthlyHours.toFixed(2)} = ${hourly.toFixed(2)} ${currency.symbol}/h. `
                    : '';
                info.textContent =
                    `${example}` +
                    `Mois affiché : ${actualHoursValue.toFixed(2)} h pointées, soit ${workedGrossValue.toFixed(2)} ${currency.symbol} au taux brut calculé. ` +
                    `Les jours OFF ne divisent pas le salaire. Le montant affiché est un indicateur RH ; la paie finale peut être différente selon les majorations, absences, indemnités et règles conventionnelles.`;
            }
            return hourly;
        }
        function syncStaffGrossSalaryToPayrollProfile(staff) {
            if (!staff?.id) return;
            try {
                const key = 'ichef_payroll_profiles_v2';
                const profiles = JSON.parse(localStorage.getItem(key) || '{}') || {};
                const current = profiles[staff.id] || {};
                const gross = Math.max(0, Number(staff.grossSalaryMonthly) || 0);
                profiles[staff.id] = {
                    ...current,
                    mode: gross > 0 ? 'monthly' : (current.mode || 'hourly'),
                    monthlySalary: gross,
                    startDate: String(staff.startDate || current.startDate || ''),
                    endDate: String(staff.endDate || current.endDate || ''),
                    birthDate: String(staff.birthDate || current.birthDate || ''),
                    contractType: String(staff.contractType || current.contractType || '')
                };
                localStorage.setItem(key, JSON.stringify(profiles));
            } catch (error) {
                console.warn('Synchronisation salaire brut vers la paie impossible', error);
            }
        }
        document.addEventListener('input', event => {
            const id = event.target?.id;
            if (id === 'staff-gross-salary' || id === 'staff-contract') {
                updateStaffGrossHourlyCost();
            }
        }, true);
        function openStaffModal(pin = null) {
            document.getElementById('staff-edit-original-pin').value = pin || "";
            const salaryInfoPanel = document.getElementById('staff-salary-info');
            if (salaryInfoPanel) salaryInfoPanel.style.display = 'none';
            document.querySelectorAll('.staff-salary-info-btn').forEach(btn => btn.setAttribute('aria-expanded', 'false'));
            if (pin) {
                let s = getDir().find(x => x.pin === pin);
                document.getElementById('staff-name').value = s.name;
                document.getElementById('staff-title').value = s.role || "";
                document.getElementById('staff-pin').value = s.pin;
                document.getElementById('staff-role').value = s.dept;
                document.getElementById('staff-contract').value = Number(s.contract) || 39;
                const staffPayrollProfileV193 = (() => {
                    try {
                        const all = JSON.parse(localStorage.getItem('ichef_payroll_profiles_v2') || '{}') || {};
                        return all[s.id] || all[String(s.id)] || {};
                    } catch (_) { return {}; }
                })();
                document.getElementById('staff-contract-type').value = String(s.contractType || staffPayrollProfileV193.contractType || '');
                document.getElementById('staff-start-date').value = String(s.startDate || staffPayrollProfileV193.startDate || '');
                document.getElementById('staff-end-date').value = String(s.endDate || staffPayrollProfileV193.endDate || '');
                document.getElementById('staff-birth-date').value = String(s.birthDate || staffPayrollProfileV193.birthDate || '');
                document.getElementById('staff-leave-days').value = Number(s.annualLeaveDays ?? 25);
                document.getElementById('staff-gross-salary').value = Number(
                    s.grossSalaryMonthly ?? getStaffGrossSalaryFromPayroll(s) ?? 0
                ) || 0;
                document.getElementById('staff-hourly-cost').value = Number(s.hourlyCost ?? 0);
                document.getElementById('staff-skill-level').value = String(s.skillLevel || 'autonome');
                document.getElementById('staff-skills').value = Array.isArray(s.skills) ? s.skills.join(', ') : '';
                document.getElementById('staff-availability').value = String(s.availability || '');
                document.getElementById('staff-leave-carryover').value = Number(s.leaveCarryover ?? 0);
                document.getElementById('staff-recovery-balance').value = Number(s.recoveryBalance ?? 0);
                document.getElementById('staff-min-rest').value = Number(s.minRestHours ?? 11);
                document.getElementById('staff-max-consecutive').value = Number(s.maxConsecutiveDays ?? 6);
                document.getElementById('staff-active').checked = s.active !== false;
            } else {
                document.getElementById('staff-name').value = "";
                document.getElementById('staff-title').value = "";
                document.getElementById('staff-pin').value = "";
                document.getElementById('staff-role').value = "salle";
                document.getElementById('staff-contract').value = 39;
                document.getElementById('staff-contract-type').value = '';
                document.getElementById('staff-start-date').value = '';
                document.getElementById('staff-end-date').value = '';
                document.getElementById('staff-birth-date').value = '';
                document.getElementById('staff-leave-days').value = 25;
                document.getElementById('staff-gross-salary').value = 0;
                document.getElementById('staff-hourly-cost').value = 0;
                const actualHoursMonthEl = document.getElementById('staff-actual-hours-month');
                const actualCostMonthEl = document.getElementById('staff-actual-cost-month');
                if (actualHoursMonthEl) actualHoursMonthEl.value = 0;
                if (actualCostMonthEl) actualCostMonthEl.value = 0;
                document.getElementById('staff-skill-level').value = 'autonome';
                document.getElementById('staff-skills').value = '';
                document.getElementById('staff-availability').value = '';
                document.getElementById('staff-leave-carryover').value = 0;
                document.getElementById('staff-recovery-balance').value = 0;
                document.getElementById('staff-min-rest').value = 11;
                document.getElementById('staff-max-consecutive').value = 6;
                document.getElementById('staff-active').checked = true;
            }
            const staffPinInputV203 = document.getElementById('staff-pin');
            if (staffPinInputV203 && !staffPinInputV203.dataset.v203Bound) {
                staffPinInputV203.dataset.v203Bound = '1';
                staffPinInputV203.addEventListener('input', () => {
                    const cleaned = String(staffPinInputV203.value || '').replace(/\D+/g, '').slice(0, 12);
                    if (staffPinInputV203.value !== cleaned) staffPinInputV203.value = cleaned;
                    setStaffPinStatusV203(
                        cleaned.length >= 4 ? 'neutral' : 'warn',
                        cleaned.length >= 4 ? 'PIN prêt à être enregistré' : '4 chiffres minimum'
                    );
                });
            }
            setStaffPinStatusV203(
                pin ? 'neutral' : 'warn',
                pin ? 'PIN chargé · vous pouvez le tester' : 'Créez un PIN de 4 à 12 chiffres'
            );
            updateStaffGrossHourlyCost();
            if (typeof updateStaffProfessionalLegalUIV193 === 'function') {
                updateStaffProfessionalLegalUIV193(pin);
            }
            let modal = document.getElementById('staff-modal');
            modal.style.opacity = '1';
            modal.classList.add('show');
            modal.style.display = 'flex';
        }
        function closeModals() {
            document.querySelectorAll('.modal').forEach(m => {
                m.classList.remove('show');
                m.style.opacity = '1';
                m.style.display = 'none';
            });
        }
        async function persistRhStaffDirectory(dir, successMessage) {
            saveDir(dir);
            setStaffPinStatusV203('syncing','Synchronisation du PIN et du dossier…');

            // STAFF_ACCESS est prioritaire : c'est ce qui rend le PIN utilisable
            // par les portails et la pointeuse.
            const accessPromise = syncStaffAccessToCloud(dir);
            const directoryPromise = syncDirectoryMasterToCloud(dir);
            const [accessOk, directoryOk] = await Promise.all([
                accessPromise,
                directoryPromise
            ]);

            refreshViews();
            if (directoryOk && accessOk) {
                setStaffPinStatusV203('ok','Dossier et accès PIN synchronisés');
                if (successMessage) showToast(successMessage);
                return true;
            }

            setStaffPinStatusV203(
                accessOk ? 'warn' : 'error',
                accessOk
                    ? 'PIN synchronisé · dossier RH encore en attente'
                    : 'PIN non synchronisé avec le serveur'
            );
            alert(
                accessOk
                    ? "Le PIN est synchronisé, mais une partie du dossier RH reste en attente de synchronisation."
                    : "Le dossier est enregistré localement, mais le PIN n’a pas été synchronisé avec le serveur. La fenêtre reste ouverte pour vous permettre de réessayer."
            );
            return false;
        }
        async function saveStaff() {
            let name = document.getElementById('staff-name').value.trim();
            let title = document.getElementById('staff-title').value.trim();
            let pin = document.getElementById('staff-pin').value.trim();
            let contract = Number(document.getElementById('staff-contract').value);
            let contractType = document.getElementById('staff-contract-type').value.trim();
            let startDate = document.getElementById('staff-start-date').value;
            let endDate = document.getElementById('staff-end-date').value;
            let birthDate = document.getElementById('staff-birth-date').value;
            let annualLeaveDays = Number(document.getElementById('staff-leave-days').value);
            let grossSalaryMonthly = Number(document.getElementById('staff-gross-salary').value);
            let hourlyCost = calculateStaffGrossHourly(grossSalaryMonthly, contract);
            document.getElementById('staff-hourly-cost').value = hourlyCost.toFixed(2);
            let skillLevel = document.getElementById('staff-skill-level').value;
            let skills = document.getElementById('staff-skills').value
                .split(',')
                .map(v => v.trim())
                .filter(Boolean);
            let availability = document.getElementById('staff-availability').value.trim();
            let leaveCarryover = Number(document.getElementById('staff-leave-carryover').value);
            let recoveryBalance = Number(document.getElementById('staff-recovery-balance').value);
            let minRestHours = Number(document.getElementById('staff-min-rest').value);
            let maxConsecutiveDays = Number(document.getElementById('staff-max-consecutive').value);
            let origPin = document.getElementById('staff-edit-original-pin').value;
            const legalSettingsV193 = (typeof getRhSettings === 'function') ? getRhSettings() : {};
            const legalCountryV193 = String(legalSettingsV193?.planningLegalCountry || 'CH').toUpperCase() === 'FR' ? 'FR' : 'CH';
            const legalMaxConsecutiveV193 =
                legalCountryV193 === 'CH' && legalSettingsV193?.planningSwissSevenDayException === true
                    ? 7
                    : 6;
            if (endDate && startDate && endDate < startDate) {
                return alert("La date de fin du contrat ne peut pas être antérieure à la date d’entrée.");
            }
            if (minRestHours < 11) {
                return alert("Le repos minimum interne ne peut pas être inférieur à 11 h. Les protections particulières peuvent imposer davantage.");
            }
            if (maxConsecutiveDays > legalMaxConsecutiveV193) {
                return alert(
                    legalCountryV193 === 'CH' && legalMaxConsecutiveV193 === 7
                        ? "Le maximum interne ne peut pas dépasser 7 jours dans le régime exceptionnel suisse activé."
                        : "Le maximum interne ne peut pas dépasser 6 jours consécutifs dans le référentiel actuellement configuré."
                );
            }
            if (
                !name ||
                !title ||
                !/^\d{4,12}$/.test(pin) ||
                !Number.isFinite(contract) || contract <= 0 || contract > 80 ||
                !Number.isFinite(annualLeaveDays) || annualLeaveDays < 0 || annualLeaveDays > 90 ||
                !Number.isFinite(grossSalaryMonthly) || grossSalaryMonthly < 0 ||
                !Number.isFinite(hourlyCost) || hourlyCost < 0 ||
                !Number.isFinite(leaveCarryover) || leaveCarryover < 0 ||
                !Number.isFinite(recoveryBalance) || recoveryBalance < 0 ||
                !Number.isFinite(minRestHours) || minRestHours < 0 ||
                !Number.isFinite(maxConsecutiveDays) || maxConsecutiveDays < 1
            ) {
                return alert("Vérifiez les informations obligatoires du contrat, le PIN, les heures contractuelles et les compteurs RH.");
            }
            let dir = getDir();
            const existing = origPin ? dir.find(s => String(s.pin || '') === String(origPin)) : null;
            const duplicatePin = dir.find(s =>
                String(s.pin || '').trim() === pin &&
                (!existing || String(s.id) !== String(existing.id))
            );
            if (duplicatePin) {
                return alert(`Ce PIN est déjà attribué à ${duplicatePin.name || 'un autre collaborateur'}.`);
            }
            let newStaff = {
                id: existing?.id || `staff_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                name,
                pin,
                role: title,
                dept: document.getElementById('staff-role').value,
                contract,
                contractType,
                startDate,
                endDate,
                birthDate,
                annualLeaveDays,
                leaveEntitlementWeeks: 5,
                leaveEntitlementUnit: legalCountryV193 === 'CH' ? 'calendar_days' : 'working_days_equivalent',
                legalSnapshot: {
                    country: legalCountryV193,
                    framework: legalCountryV193 === 'FR'
                        ? 'HCR IDCC 1979 + Code du travail'
                        : 'CCNT hôtels-restaurants-cafés + LTr + OLT 1/2',
                    referenceDate: '2026-09-29'
                },
                leaveCarryover,
                recoveryBalance,
                grossSalaryMonthly,
                hourlyCost,
                skillLevel,
                skills,
                availability,
                minRestHours,
                maxConsecutiveDays,
                active: document.getElementById('staff-active').checked,
                onDuty: existing?.onDuty || false
            };
            if (existing) {
                const idx = dir.findIndex(s => String(s.id) === String(existing.id));
                if (idx < 0) return alert("Collaborateur introuvable. Rechargez la page puis réessayez.");
                dir[idx] = newStaff;
                recordRhChange({
                    staffId: newStaff.id,
                    staffName: newStaff.name,
                    type: 'STAFF_UPDATED',
                    category: 'CONTRAT_PROFIL',
                    before: existing
                        ? JSON.parse(JSON.stringify(existing))
                        : null,
                    after:
                        JSON.parse(JSON.stringify(newStaff)),
                    message:
                        'Fiche collaborateur / contrat mise à jour'
                });
            } else {
                dir.push(newStaff);
                recordRhChange({
                    staffId: newStaff.id,
                    staffName: newStaff.name,
                    type: 'STAFF_CREATED',
                    category: 'CONTRAT_PROFIL',
                    before: null,
                    after:
                        JSON.parse(JSON.stringify(newStaff)),
                    message:
                        'Collaborateur ajouté · dossier RH créé'
                });
            }
            syncStaffGrossSalaryToPayrollProfile(newStaff);
            document.getElementById('staff-edit-original-pin').value = pin;
            const ok = await persistRhStaffDirectory(dir, existing ? 'Collaborateur synchronisé' : 'Collaborateur créé et synchronisé');
            if (!ok) {
                // Ne pas fermer : sinon l'utilisateur croit que le PIN est
                // opérationnel alors que sa synchronisation a échoué.
                return false;
            }

            setStaffPinStatusV203('syncing','Vérification du PIN sur le serveur…');
            const pinCheck = await verifyPinWithServer(pin);
            if (!pinCheck?.success) {
                setStaffPinStatusV203(
                    'error',
                    `PIN enregistré mais non reconnu : ${pinCheck?.error || 'réessayez dans quelques secondes'}`
                );
                alert(
                    "Le collaborateur a été enregistré, mais le serveur d’authentification ne reconnaît pas encore ce PIN. La fiche reste ouverte : cliquez sur « TESTER LE PIN » pour réessayer."
                );
                return false;
            }

            setStaffPinStatusV203('ok','✓ PIN reconnu par le serveur');
            showToast('PIN vérifié · collaborateur synchronisé');
            setTimeout(closeModals, 350);
            return true;
        }
        window.saveStaff = saveStaff;

        async function deleteStaff() {
            const origPin = document.getElementById('staff-edit-original-pin').value;
            if (!origPin) return closeModals();
            if (!confirm("SUPPRESSION DÉFINITIVE : Supprimer cet employé ?")) return;
            const before = getDir();
            const removed = before.find(s => String(s.pin || '') === String(origPin));
            const dir = before.filter(s => String(s.pin || '') !== String(origPin));
            if (!removed) {
                closeModals();
                return alert("Collaborateur introuvable.");
            }
            if (currentStaffId && String(currentStaffId) === String(removed.id)) {
                currentStaffId = null;
                isGlobalView = true;
            }
            recordRhChange({
                staffId: removed.id,
                staffName: removed.name,
                type: 'STAFF_REMOVED',
                category: 'CONTRAT_PROFIL',
                before:
                    JSON.parse(JSON.stringify(removed)),
                after: null,
                message:
                    'Collaborateur retiré de l’équipe · historique conservé'
            });
            await persistRhStaffDirectory(dir, 'Collaborateur supprimé et synchronisé');
            closeModals();
            toggleViewDisplay();
        }
        async function toggleStaffStatus(id) {
            let dir = getDir();
            let idx = dir.findIndex(s => String(s.id) === String(id));
            if (idx < 0) return;
            dir[idx].active = !dir[idx].active;
            if (dir[idx].active === false) dir[idx].onDuty = false;
            if (currentStaffId !== null && String(currentStaffId) === String(id) && dir[idx].active === false) {
                currentStaffId = null;
                isGlobalView = true;
            }
            recordRhChange({
                staffId: dir[idx].id,
                staffName: dir[idx].name,
                type:
                    dir[idx].active
                        ? 'STAFF_REACTIVATED'
                        : 'STAFF_DEACTIVATED',
                category: 'CONTRAT_PROFIL',
                after:
                    JSON.parse(
                        JSON.stringify(dir[idx])
                    ),
                message:
                    dir[idx].active
                        ? 'Collaborateur réactivé'
                        : 'Collaborateur désactivé'
            });
            await persistRhStaffDirectory(
                dir,
                dir[idx].active ? 'Collaborateur réactivé' : 'Collaborateur désactivé'
            );
            toggleViewDisplay();
        }
        // ==========================================
        // ASSISTANCE PLANNING INTELLIGENTE
        // ==========================================
        let planningAssistantAutoTimer = null;
        let planningAssistantPrediction = null;
        let planningAssistantPredictionMonth = null;
        let planningAssistantDraft = null;
        let assistantDayOffSuggestions = [];
        function getPlanningAssistantMonth() {
            return (
                document.getElementById('month-selector')?.value ||
                `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
            );
        }
        function monthLabelFr(monthStr) {
            const [year, month] = String(monthStr).split('-').map(Number);
            if (!year || !month) return String(monthStr || '');
            return new Date(year, month - 1, 1)
                .toLocaleDateString('fr-FR', {
                    month: 'long',
                    year: 'numeric'
                })
                .toUpperCase();
        }
        function normalizeAssistantText(value) {
            return String(value || '')
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .toLowerCase();
        }
        function assistantClone(value) {
            return JSON.parse(JSON.stringify(value));
        }
        function assistantTimeToDecimal(value) {
            const parsed = parseTime(String(value || ''));
            return parsed === null ? 0 : parsed;
        }
        function assistantShiftHours(start, end) {
            let s = assistantTimeToDecimal(start);
            let e = assistantTimeToDecimal(end);
            if (!start || !end) return 0;
            if (e < s) e += 24;
            return Math.max(0, e - s);
        }
        function assistantIsApprovedRequest(request) {
            const status = String(request?.status || request?.decision || '')
                .trim()
                .toLowerCase();
            return [
                'approved',
                'accepted',
                'accepte',
                'accepté',
                'acceptée',
                'valide',
                'validé',
                'validée',
                'granted'
            ].includes(status);
        }
        function assistantRequestForDate(staff, dateObj) {
            const dateKey = [
                dateObj.getFullYear(),
                String(dateObj.getMonth() + 1).padStart(2, '0'),
                String(dateObj.getDate()).padStart(2, '0')
            ].join('-');
            return getReqs().find(request => {
                if (!assistantIsApprovedRequest(request)) return false;
                const sameStaff =
                    String(request.staffId || '') === String(staff.id) ||
                    (
                        request.staffPin &&
                        String(request.staffPin) === String(staff.pin || '')
                    );
                if (!sameStaff) return false;
                const start = String(request.startDate || request.start || request.dateStart || request.from || '');
                const end = String(request.endDate || request.end || request.dateEnd || request.to || start);
                return start && dateKey >= start && dateKey <= end;
            }) || null;
        }
        function assistantRequestTypeToStatus(type) {
            const key = String(type || '').trim().toLowerCase()
                .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                .replace(/[\s\-/]+/g, '_');
            const map = {
                conge: 'conge',
                conges: 'conge',
                cp: 'conge',
                vacances: 'conge',
                vacation: 'conge',
                conges_payes: 'conge',
                recup: 'recup',
                recuperation: 'recup',
                repos_compensateur: 'recup',
                maladie: 'maladie',
                accident_travail: 'accident_travail',
                maternite: 'maternite',
                paternite: 'paternite',
                parental: 'parental',
                enfant_malade: 'enfant_malade',
                evenement_familial: 'evenement_familial',
                deces: 'deces',
                formation: 'formation',
                sans_solde: 'sans_solde',
                absence_autorisee: 'absence_autorisee',
                absence_injustifiee: 'absence_injustifiee',
                off: 'off',
                jour_off: 'off',
                repos: 'off'
            };
            return map[key] || 'off';
        }
        function assistantAvailabilityAllows(staff, dateObj, service) {
            const raw = normalizeAssistantText(staff.availability || '');
            if (!raw.trim()) return true;
            const weekdays = [
                ['dimanche', 'dim'],
                ['lundi', 'lun'],
                ['mardi', 'mar'],
                ['mercredi', 'mer'],
                ['jeudi', 'jeu'],
                ['vendredi', 'ven'],
                ['samedi', 'sam']
            ];
            const dayTokens = weekdays[dateObj.getDay()];
            const serviceTokens = service === 'lunch'
                ? ['matin', 'midi', 'dejeuner', 'déjeuner']
                : ['soir', 'soiree', 'soirée', 'diner', 'dîner'];
            const oppositeTokens = service === 'lunch'
                ? ['soir', 'soiree', 'soirée', 'diner', 'dîner']
                : ['matin', 'midi', 'dejeuner', 'déjeuner'];
            const segments = raw
                .split(/[\n;,\.]+/)
                .map(x => x.trim())
                .filter(Boolean);
            for (const segment of segments) {
                const mentionsDay = dayTokens.some(token => segment.includes(token));
                const mentionsService = serviceTokens.some(token => segment.includes(normalizeAssistantText(token)));
                const mentionsOpposite = oppositeTokens.some(token => segment.includes(normalizeAssistantText(token)));
                const unavailable = segment.includes('indisponible') || segment.includes('pas disponible') || segment.includes('impossible');
                const only = segment.includes('uniquement') || segment.includes('seulement');
                if (unavailable && !mentionsDay && mentionsService) return false;
                if (mentionsDay && unavailable) {
                    if (!mentionsService && !mentionsOpposite) return false;
                    if (mentionsService) return false;
                }
                if (mentionsDay && only) {
                    if (mentionsOpposite && !mentionsService) return false;
                }
            }
            return true;
        }
        function assistantDeptAliases(dept) {
            const aliases = {
                cuisine: [
                    'cuisine','kitchen','chef','cuisinier','cuisson','production',
                    'sous-chef','chef de partie','demi-chef','commis cuisine','plonge'
                ],
                salle: [
                    'salle','service','serveur','serveuse','rang','runner',
                    'maitre hotel','maître hôtel','maitre d hotel','maître d’hôtel',
                    'commis salle','directeur salle'
                ],
                bar: [
                    'bar','barman','barmaid','cocktail','barista','chef barman','bar manager'
                ],
                patisserie: [
                    'patisserie','pâtisserie','dessert','patissier','pâtissier'
                ],
                roomservice: [
                    'room service','roomservice','service chambre'
                ],
                petit_dejeuner: [
                    'petit dejeuner','petit-déjeuner','breakfast'
                ],
                banquet: [
                    'banquet','banqueting','evenement','événement'
                ],
                reception: [
                    'reception','réception','receptionniste','réceptionniste',
                    'front office','night auditor','night manager'
                ],
                conciergerie: [
                    'concierge','conciergerie'
                ],
                bagagerie_valet: [
                    'bagagiste','bagagerie','voiturier','valet'
                ],
                housekeeping: [
                    'housekeeping','gouvernante','femme de chambre','valet de chambre',
                    'equipier etage','équipier étage'
                ],
                lingerie: [
                    'lingerie','lingere','lingère'
                ],
                maintenance: [
                    'maintenance','technicien','directeur technique'
                ],
                securite: [
                    'securite','sécurité','agent sécurité','agent de sécurité'
                ],
                spa: [
                    'spa','praticien spa'
                ],
                direction: [
                    'direction','directeur','manager','f&b','food beverage','responsable'
                ],
                caisse_vente: [
                    'caisse','caissier','vente'
                ],
                polyvalent: [
                    'polyvalent'
                ],
                admin: [
                    'admin','direction','manager','gerant','gérant','caisse'
                ]
            };
            return aliases[dept] || [dept];
        }
        function assistantStaffCanCoverDept(staff, dept) {
            if (String(staff.dept || '') === dept) return true;
            const text = normalizeAssistantText([
                staff.role || '',
                ...(Array.isArray(staff.skills) ? staff.skills : [])
            ].join(' '));
            return assistantDeptAliases(dept)
                .map(normalizeAssistantText)
                .some(alias => text.includes(alias));
        }
        function assistantSkillScore(staff) {
            const map = {
                debutant: 0,
                autonome: 1,
                referent: 2,
                manager: 3
            };
            return map[String(staff.skillLevel || 'autonome')] ?? 1;
        }
        function assistantResolveDayNumber(item, monthStr) {
            if (item === null || item === undefined) return null;
            if (typeof item === 'number') {
                return item >= 1 && item <= 31 ? item : null;
            }
            if (typeof item === 'object') {
                const raw = item.date ?? item.day ?? item.label ?? '';
                return assistantResolveDayNumber(raw, monthStr);
            }
            const raw = String(item || '').trim();
            if (!raw) return null;
            const iso = raw.match(/(20\d{2})-(\d{2})-(\d{2})/);
            if (iso) {
                if (`${iso[1]}-${iso[2]}` !== monthStr) return null;
                const day = Number(iso[3]);
                return day >= 1 && day <= 31 ? day : null;
            }
            const fr = raw.match(/\b([0-3]?\d)[\/.-]([01]?\d)(?:[\/.-](20\d{2}))?\b/);
            if (fr) {
                const [year, month] = monthStr.split('-').map(Number);
                const day = Number(fr[1]);
                const itemMonth = Number(fr[2]);
                const itemYear = fr[3] ? Number(fr[3]) : year;
                if (
                    itemMonth === month &&
                    itemYear === year &&
                    day >= 1 &&
                    day <= 31
                ) {
                    return day;
                }
                return null;
            }
            // Ne jamais confondre une heure (ex. 19:00) avec le jour 19.
            const explicit = raw.match(/\b(?:jour|le)\s+([0-3]?\d)\b/i);
            if (explicit) {
                const day = Number(explicit[1]);
                return day >= 1 && day <= 31 ? day : null;
            }
            return null;
        }
        function assistantLocalDateKey(dateObj) {
            const y = dateObj.getFullYear();
            const m = String(dateObj.getMonth() + 1).padStart(2, '0');
            const d = String(dateObj.getDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
        }
        function assistantIsRestaurantClosed(dateObj, settings) {
            if (!(dateObj instanceof Date) || Number.isNaN(dateObj.getTime())) {
                return false;
            }
            // V142 : aucune ancienne fermeture n'est utilisée tant que
            // le responsable n'a pas confirmé les jours dans les paramètres.
            if (settings?.planningClosureConfirmedV142 !== true) {
                return false;
            }
            const weekly =
                Array.from(
                    new Set(
                        (Array.isArray(settings?.planningClosedWeekdays)
                            ? settings.planningClosedWeekdays
                            : []
                        )
                        .map(Number)
                        .filter(v =>
                            Number.isInteger(v) &&
                            v >= 0 &&
                            v <= 6
                        )
                    )
                );
            // Une fermeture hebdomadaire 7/7 est considérée invalide.
            if (weekly.length >= 7) {
                return false;
            }
            if (weekly.includes(dateObj.getDay())) {
                return true;
            }
            const exceptional =
                Array.isArray(settings?.planningExceptionalClosedDates)
                    ? settings.planningExceptionalClosedDates.map(String)
                    : [];
            return exceptional.includes(
                assistantLocalDateKey(dateObj)
            );
        }
        // V168 · Un jour peut être ouvert uniquement MIDI, uniquement SOIR,
        // les deux, ou aucun service.
        function assistantIsServiceOpenV168(
            dateObj,
            service,
            settings
        ) {
            if (
                !(dateObj instanceof Date) ||
                Number.isNaN(dateObj.getTime())
            ) {
                return true;
            }
            if (
                assistantIsRestaurantClosed(
                    dateObj,
                    settings
                )
            ) {
                return false;
            }
            const matrix =
                normalizeRhServiceWeekdaysV168(
                    settings?.planningServiceWeekdays
                );
            const weekday =
                dateObj.getDay();
            if (service === 'lunch') {
                return matrix[weekday].lunch !== false;
            }
            if (service === 'dinner') {
                return matrix[weekday].dinner !== false;
            }
            return true;
        }
        function buildAssistantDemand(monthStr, prediction, settings) {
            const [year, month] = monthStr.split('-').map(Number);
            const daysInMonth = new Date(year, month, 0).getDate();
            const rows = {};
            for (let day = 1; day <= daysInMonth; day++) {
                const dateObj = new Date(year, month - 1, day);
                const weekend = dateObj.getDay() === 5 || dateObj.getDay() === 6;
                const closed = assistantIsRestaurantClosed(dateObj, settings);
                rows[day] = {
                    day,
                    score: closed ? 0 : (weekend ? 1.22 : 1),
                    covers: 0,
                    reason: closed
                        ? 'Établissement fermé'
                        : (weekend ? 'Fin de semaine' : 'Activité standard'),
                    isPeak: false,
                    closed
                };
            }
            // V170 · apprentissage local depuis la caisse tactile.
            // Pour les jours déjà encaissés : activité réelle.
            // Pour les jours futurs : moyenne historique du même jour de semaine.
            try {
                const pos =
                    rhCashDemandProfileV170(
                        monthStr
                    );
                const today =
                    new Date();
                const todayStart =
                    new Date(
                        today.getFullYear(),
                        today.getMonth(),
                        today.getDate()
                    );
                for (
                    let day = 1;
                    day <= daysInMonth;
                    day++
                ) {
                    if (
                        rows[day]?.closed === true
                    ) {
                        continue;
                    }
                    const dateObj =
                        new Date(
                            year,
                            month - 1,
                            day
                        );
                    const actual =
                        pos.actual?.daily?.[day];
                    const wd =
                        pos.historyProfile
                            ?.weekdays?.[
                                dateObj.getDay()
                            ];
                    let posCa = 0;
                    let posCovers = 0;
                    let posReason = '';
                    if (
                        dateObj < todayStart &&
                        actual
                    ) {
                        posCa =
                            Number(actual.ca || 0);
                        posCovers =
                            Number(
                                actual.covers || 0
                            );
                        posReason =
                            'Caisse iCHEF · activité réelle';
                    } else if (
                        settings?.planningUseCashForecast !== false &&
                        Number(wd?.sampleDays || 0) > 0
                    ) {
                        posCa =
                            Number(wd.avgCa || 0);
                        posCovers =
                            Number(
                                wd.avgCovers || 0
                            );
                        posReason =
                            'Historique caisse iCHEF';
                    }
                    if (
                        posCovers > 0
                    ) {
                        rows[day].covers =
                            Math.max(
                                Number(
                                    rows[day].covers || 0
                                ),
                                Math.round(
                                    posCovers
                                )
                            );
                    }
                    const avgCa =
                        Number(
                            pos.historyProfile
                                ?.overallDailyCa || 0
                        );
                    if (
                        posCa > 0 &&
                        avgCa > 0
                    ) {
                        const ratio =
                            Math.max(
                                0.65,
                                Math.min(
                                    2.15,
                                    posCa / avgCa
                                )
                            );
                        rows[day].score =
                            Math.max(
                                Number(
                                    rows[day].score || 1
                                ),
                                ratio
                            );
                        if (
                            ratio >= 1.35
                        ) {
                            rows[day].isPeak =
                                true;
                        }
                        rows[day].reason =
                            posReason;
                    }
                }
            } catch (error) {
                console.warn(
                    '[iCHEF RH V170] profil caisse local indisponible',
                    error
                );
            }
            const applyRows = (items, mode) => {
                (Array.isArray(items) ? items : []).forEach(item => {
                    const day = assistantResolveDayNumber(item, monthStr);
                    if (!day || !rows[day]) return;
                    // Une réservation / prédiction ne réouvre jamais
                    // automatiquement un jour déclaré fermé.
                    if (rows[day].closed === true) return;
                    const covers = Number(
                        typeof item === 'object'
                            ? item.covers || item.guests || item.reservations || 0
                            : 0
                    );
                    if (covers > 0) rows[day].covers = Math.max(rows[day].covers, covers);
                    if (mode === 'high') {
                        rows[day].score = Math.max(
                            rows[day].score,
                            covers > 0 ? Math.min(2.7, 1 + covers / 100) : 1.65
                        );
                        rows[day].reason = 'Affluence forte / Anti-Rush';
                        rows[day].isPeak = true;
                    } else {
                        rows[day].score = Math.min(rows[day].score, 0.68);
                        rows[day].reason = 'Affluence plus faible';
                    }
                });
            };
            applyRows(prediction?.highDemandDays || prediction?.rushPeriods, 'high');
            applyRows(prediction?.protectedPeakDays, 'high');
            applyRows(prediction?.lowDemandDays || prediction?.deadPeriods, 'low');
            const notes = normalizeAssistantText(settings.eventNotes || '');
            for (let day = 1; day <= daysInMonth; day++) {
                const dayPattern = new RegExp(`(^|\\D)${day}(\\D|$)`);
                if (notes && dayPattern.test(notes) && rows[day].closed !== true) {
                    rows[day].score = Math.max(rows[day].score, 1.55);
                    rows[day].reason = 'Événement / contexte Direction';
                    rows[day].isPeak = true;
                }
            }
            return rows;
        }
        function assistantProtectedWeekday(dateObj, settings) {
            const protectedDays = Array.isArray(settings?.planningProtectedWeekdays)
                ? settings.planningProtectedWeekdays.map(Number)
                : [];
            return protectedDays.includes(dateObj.getDay());
        }
        function assistantPeakDaySet(demand, settings) {
            if (settings?.planningProtectPeakLeave === false) return new Set();
            const count = Math.max(1, Math.min(31, Number(settings?.planningPeakProtectionCount) || 6));
            const minCovers = Math.max(0, Number(settings?.planningPeakMinCovers) || 40);
            const minScore = Math.max(1, Number(settings?.planningPeakProtectionMinScore) || 1.5);
            const ranked = Object.values(demand || {})
                .filter(row => row && (row.isPeak === true || Number(row.covers || 0) >= minCovers || Number(row.score || 0) >= minScore))
                .sort((a,b) => {
                    const ap = a.isPeak === true ? 10000 : 0;
                    const bp = b.isPeak === true ? 10000 : 0;
                    return (bp + Number(b.covers || 0) * 10 + Number(b.score || 0) * 100) -
                           (ap + Number(a.covers || 0) * 10 + Number(a.score || 0) * 100);
                })
                .slice(0,count)
                .map(row => Number(row.day));
            return new Set(ranked);
        }
        function assistantDateBlocksPlannableLeave(dateObj, demandRow, settings, peakDays = null) {
            if (settings?.planningBlockPlannableLeaveOnProtectedDays !== false && assistantProtectedWeekday(dateObj, settings)) return true;
            if (settings?.planningProtectPeakLeave !== false) {
                const set = peakDays instanceof Set ? peakDays : new Set();
                if (set.has(dateObj.getDate())) return true;
                if (demandRow?.isPeak === true) return true;
            }
            return false;
        }
        function assistantOffUnit(plan) {
            if (!plan) return 1;
            if (isRhLeaveStatus(plan.status) || plan.status === 'ferie') return 0;
            if (!isRhWorkStatus(plan.status)) return 1;
            const services = (plan.s1 ? 1 : 0) + (plan.s2 ? 1 : 0);
            if (services <= 0) return 1;
            if (services === 1) return 0.5;
            return 0;
        }
        function assistantRoleRatioRequiredCountV179(
            dept,
            demand,
            settings,
            activeCount
        ) {
            if (
                !settings ||
                activeCount <= 0
            ) {
                return null;
            }
            const metric =
                brigadeRoleRatioMetricV179(
                    dept
                );
            let activityValue = 0;
            if (metric.key === 'covers') {
                activityValue =
                    Number(
                        demand?.covers || 0
                    );
            } else if (metric.key === 'rooms') {
                activityValue =
                    Number(
                        demand?.occupiedRooms ??
                        demand?.rooms ??
                        demand?.chambres ??
                        0
                    );
            } else {
                activityValue =
                    Number(
                        demand?.activityUnits ??
                        demand?.activity ??
                        0
                    );
            }
            if (
                !Number.isFinite(activityValue) ||
                activityValue <= 0
            ) {
                return null;
            }
            const profileKey =
                String(
                    settings
                        ?.planningEstablishmentProfile ||
                    'restaurant'
                );
            const selected =
                normalizeBrigadeRoleKeysV169(
                    settings
                        ?.planningBrigadeRoles,
                    profileKey
                );
            const ratios =
                normalizeBrigadeRoleRatiosV179(
                    settings
                        ?.planningBrigadeRoleRatios,
                    profileKey
                );
            const counts =
                normalizeBrigadeRoleCountsV171(
                    settings
                        ?.planningBrigadeRoleCounts,
                    profileKey
                );
            const roleKeys =
                selected.filter(key => {
                    const parts =
                        String(key)
                            .split('::');
                    const roleDept =
                        parts.shift() ||
                        '';
                    const role =
                        parts.join('::');
                    return (
                        roleDept === dept &&
                        brigadeRoleHasRatioV179(
                            role
                        )
                    );
                });
            if (!roleKeys.length) {
                return null;
            }
            let required = 0;
            let usableRatios = 0;
            roleKeys.forEach(key => {
                const ratio =
                    Number(
                        ratios[key] || 0
                    );
                const configuredMax =
                    Math.max(
                        0,
                        Math.round(
                            Number(
                                counts[key] ?? 1
                            ) || 0
                        )
                    );
                if (
                    ratio <= 0 ||
                    configuredMax <= 0
                ) {
                    return;
                }
                usableRatios += 1;
                const needForRole =
                    Math.ceil(
                        activityValue /
                        ratio
                    );
                required +=
                    Math.min(
                        configuredMax,
                        Math.max(
                            1,
                            needForRole
                        )
                    );
            });
            if (
                usableRatios <= 0 ||
                required <= 0
            ) {
                return null;
            }
            return Math.max(
                1,
                Math.min(
                    activeCount,
                    required
                )
            );
        }
        function assistantRequiredCount(dept, demand, settings, activeCount) {
            if (activeCount <= 0) return 0;
            if (demand?.closed === true) return 0;
            const roleBasedRequired =
                assistantRoleRatioRequiredCountV179(
                    dept,
                    demand,
                    settings,
                    activeCount
                );
            if (
                Number.isFinite(
                    roleBasedRequired
                ) &&
                roleBasedRequired > 0
            ) {
                return roleBasedRequired;
            }
            const covers = Number(demand?.covers || 0);
            let ratio = 0;
            if (dept === 'salle') ratio = Number(settings.serverCoversRatio || 25);
            if (dept === 'cuisine') ratio = Number(settings.kitchenCoversRatio || 35);
            if (dept === 'bar') ratio = Number(settings.barCoversRatio || 50);
            // V169 · départements F&B dérivés des ratios existants
            if (dept === 'patisserie') ratio = Number(settings.kitchenCoversRatio || 35);
            if (dept === 'roomservice') ratio = Number(settings.serverCoversRatio || 25);
            if (dept === 'petit_dejeuner') ratio = Number(settings.serverCoversRatio || 25);
            if (dept === 'banquet') ratio = Number(settings.serverCoversRatio || 25);
            // V170 · le niveau de service agit sur la couverture,
            // mais jamais au détriment des règles légales / compétences.
            const serviceLevel =
                String(
                    settings?.planningServiceLevel ||
                    'standard'
                );
            const ratioFactor = {
                standard: 1,
                reinforced: 0.90,
                premium: 0.80,
                excellence: 0.70
            }[serviceLevel] || 1;
            if (ratio > 0) {
                ratio *= ratioFactor;
            }
            if (covers > 0 && ratio > 0) {
                return Math.max(1, Math.min(activeCount, Math.ceil(covers / ratio)));
            }
            const score = Number(demand?.score || 1);
            const factor = score >= 1.6
                ? 0.85
                : score >= 1.2
                    ? 0.68
                    : score <= 0.75
                        ? 0.38
                        : 0.52;
            return Math.max(1, Math.min(activeCount, Math.ceil(activeCount * factor)));
        }
        function assistantCriticalKitchenIssues(proposal, staffList, monthStr, settings) {
            if (settings?.kitchenCriticalCoverageEnabled === false) return [];
            const [year, month] = String(monthStr).split('-').map(Number);
            const daysInMonth = new Date(year, month, 0).getDate();
            const minKitchen = Math.max(
                1,
                Number(settings?.kitchenMinQualifiedPerOpenService || 1)
            );
            const kitchenQualified = (staffList || []).filter(staff =>
                staff?.active !== false &&
                assistantStaffCanCoverDept(staff, 'cuisine')
            );
            const issues = [];
            const criticalHorizon =
                assistantPlanningHorizon(monthStr);
            for (let day = 1; day <= daysInMonth; day++) {
                if (
                    day <
                    criticalHorizon.startDay
                ) {
                    continue;
                }
                const dateObj =
                    new Date(year, month - 1, day);
                // V136 : une fermeture établissement n'est jamais
                // une erreur de couverture cuisine.
                if (
                    assistantIsRestaurantClosed(
                        dateObj,
                        settings
                    )
                ) {
                    continue;
                }
                for (const service of ['lunch', 'dinner']) {
                    // Le service est considéré ouvert si au moins une personne
                    // hors cuisine est planifiée sur ce créneau.
                    const openByOtherStaff = (staffList || []).some(staff => {
                        if (staff?.active === false) return false;
                        if (assistantStaffCanCoverDept(staff, 'cuisine')) return false;
                        const p = proposal?.[staff.id]?.[day] ||
                                  proposal?.[String(staff.id)]?.[day];
                        return assistantDayWorksService(p, service);
                    });
                    if (!openByOtherStaff) continue;
                    const kitchenPresent = kitchenQualified.filter(staff => {
                        const p = proposal?.[staff.id]?.[day] ||
                                  proposal?.[String(staff.id)]?.[day];
                        return assistantDayWorksService(p, service);
                    });
                    if (kitchenPresent.length >= minKitchen) continue;
                    const dateLabel =
                        `${String(day).padStart(2,'0')}/${String(month).padStart(2,'0')}`;
                    const serviceLabel = service === 'lunch' ? 'MIDI' : 'SOIR';
                    if (kitchenQualified.length === 1) {
                        issues.push({
                            day,
                            service,
                            severity: 'critical',
                            code: 'KITCHEN_UNIQUE',
                            message:
                                `${dateLabel} · ${serviceLabel} · CUISINE NON COUVERTE : ` +
                                `${kitchenQualified[0].name || 'le seul cuisinier qualifié'} est l’unique ressource cuisine. ` +
                                `Planifier cette personne, prévoir un remplaçant qualifié ou fermer ce service.`
                        });
                    } else if (!kitchenQualified.length) {
                        issues.push({
                            day,
                            service,
                            severity: 'critical',
                            code: 'KITCHEN_NONE',
                            message:
                                `${dateLabel} · ${serviceLabel} · CUISINE IMPOSSIBLE : ` +
                                `aucun collaborateur actif n’est identifié comme qualifié cuisine.`
                        });
                    } else {
                        issues.push({
                            day,
                            service,
                            severity: 'critical',
                            code: 'KITCHEN_UNDER',
                            message:
                                `${dateLabel} · ${serviceLabel} · CUISINE SOUS-COUVERTE : ` +
                                `${kitchenPresent.length}/${minKitchen} personne(s) cuisine qualifiée(s).`
                        });
                    }
                }
            }
            return issues;
        }
        function buildPlanningAssistantStaffAnalysis() {
            const monthStr = getPlanningAssistantMonth();
            const [year, month] = monthStr.split('-').map(Number);
            const daysInMonth = new Date(year, month, 0).getDate();
            const tsMonth = getTs()[monthStr] || {};
            return getDir()
                .filter(s => s.active !== false)
                .map(staff => {
                    const staffMonth =
                        tsMonth?.[staff.id] ||
                        tsMonth?.[String(staff.id)] ||
                        {};
                    const stats =
                        getStaffMonthStats(
                            staff.id,
                            year,
                            month,
                            daysInMonth,
                            staffMonth
                        );
                    const actual =
                        getActualHoursSummary(
                            staff.id,
                            monthStr
                        );
                    const actualBalance =
                        Number(actual.total || 0) -
                        Number(stats?.adjustedTarget || 0);
                    return {
                        id: staff.id,
                        name: staff.name,
                        role: staff.role,
                        dept: staff.dept,
                        contractHoursWeek: Number(staff.contract) || 0,
                        annualLeaveDays: Number(staff.annualLeaveDays ?? 25),
                        monthlyTarget: Number(stats?.expected || 0),
                        adjustedTarget: Number(stats?.adjustedTarget || 0),
                        plannedHours: Number(stats?.totalDone || 0),
                        hoursToPlan: Number(stats?.missedHours || 0),
                        extraHours: Number(stats?.extraHours || 0),
                        recoveryUsedHours: Number(stats?.totalRecup || 0),
                        leaveDays: Number(stats?.leaveDays || 0),
                        cpUsedYear: Number(stats?.annualCPUsed || 0),
                        cpRemaining: Number(stats?.cpRestants || 0),
                        unjustifiedDays: Number(stats?.unjustifiedDays || 0),
                        leaveCounts: stats?.leaveCounts || {},
                        actualHours: Number(actual.total || 0),
                        actualBalance,
                        recoveryBalance: Number(staff.recoveryBalance || 0),
                        hourlyCost: Number(staff.hourlyCost || 0),
                        plannedLaborCost: Number(stats?.totalDone || 0) * Number(staff.hourlyCost || 0),
                        actualLaborCost: Number(actual.total || 0) * Number(staff.hourlyCost || 0),
                        skillLevel: String(staff.skillLevel || 'autonome'),
                        skills: Array.isArray(staff.skills) ? staff.skills : [],
                        availability: String(staff.availability || ''),
                        minRestHours: Number(staff.minRestHours ?? 11),
                        maxConsecutiveDays: Number(staff.maxConsecutiveDays ?? 6)
                    };
                });
        }
        function formatAssistantNumber(value, suffix = '') {
            const n = Number(value || 0);
            return `${n.toFixed(1)}${suffix}`;
        }
        function renderPlanningAssistantLocal() {
            const monthStr = getPlanningAssistantMonth();
            const title = document.getElementById('assistant-month-title');
            if (title) title.innerText = monthLabelFr(monthStr);
            const analysis = buildPlanningAssistantStaffAnalysis();
            const totals = analysis.reduce((acc, row) => {
                acc.target += row.adjustedTarget;
                acc.planned += row.plannedHours;
                acc.toPlan += row.hoursToPlan;
                acc.extra += row.extraHours;
                return acc;
            }, {
                target: 0,
                planned: 0,
                toPlan: 0,
                extra: 0
            });
            const summary = document.getElementById('assistant-global-summary');
            if (summary) {
                summary.innerHTML = [
                    ['Objectif ajusté', formatAssistantNumber(totals.target, ' h')],
                    ['Planifié actuel', formatAssistantNumber(totals.planned, ' h')],
                    ['À planifier', formatAssistantNumber(totals.toPlan, ' h')],
                    ['H. supplémentaires', formatAssistantNumber(totals.extra, ' h')]
                ].map(([label, value]) => `
                    <div style="background:var(--panel);border:1px solid var(--border);border-radius:8px;padding:12px;">
                        <div style="color:var(--text-muted);font-size:0.68rem;text-transform:uppercase;">${label}</div>
                        <div style="color:var(--text-main);font-size:1.15rem;font-weight:900;margin-top:4px;">${value}</div>
                    </div>
                `).join('');
            }
            if (assistantDayOffSuggestions.length) renderAssistantDayOffSuggestions();
            const staffList = document.getElementById('pred-staff-list');
            if (staffList) {
                staffList.innerHTML = analysis.length
                    ? analysis.map(row => {
                        const balanceText = row.hoursToPlan > 0.05
                            ? `${formatAssistantNumber(row.hoursToPlan, ' h')} à planifier`
                            : row.extraHours > 0.05
                                ? `${formatAssistantNumber(row.extraHours, ' h')} au-dessus`
                                : 'Équilibre atteint';
                        const balanceColor = row.hoursToPlan > 0.05
                            ? 'var(--warning)'
                            : row.extraHours > 0.05
                                ? 'var(--cyan)'
                                : 'var(--success)';
                        return `
                            <div style="background:var(--panel);border:1px solid var(--border);border-radius:10px;padding:13px;">
                                <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;">
                                    <div>
                                        <div style="color:var(--text-main);font-weight:900;text-transform:uppercase;">${escapeRhHtml(row.name)}</div>
                                        <div style="color:var(--text-muted);font-size:0.72rem;margin-top:3px;">
                                            ${escapeRhHtml(row.role || row.dept || '')} · Contrat ${formatAssistantNumber(row.contractHoursWeek, ' h/sem')}
                                        </div>
                                    </div>
                                    <div style="color:${balanceColor};font-size:0.72rem;font-weight:900;text-align:right;">${balanceText}</div>
                                </div>
                                <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin-top:10px;">
                                    <div><div style="color:var(--text-muted);font-size:0.62rem;">OBJECTIF MOIS</div><strong>${formatAssistantNumber(row.monthlyTarget, ' h')}</strong></div>
                                    <div><div style="color:var(--text-muted);font-size:0.62rem;">PLANIFIÉ</div><strong>${formatAssistantNumber(row.plannedHours, ' h')}</strong></div>
                                    <div><div style="color:var(--text-muted);font-size:0.62rem;">CONGÉS RESTANTS</div><strong>${formatAssistantNumber(row.cpRemaining, ' j')}</strong></div>
                                    <div><div style="color:var(--text-muted);font-size:0.62rem;">RÉCUP.</div><strong>${formatAssistantNumber(row.recoveryBalance, ' h')}</strong></div>
                                </div>
                            </div>
                        `;
                    }).join('')
                    : '<div style="color:var(--text-muted);text-align:center;padding:20px;">Aucun collaborateur actif.</div>';
            }
            return analysis;
        }
        function openPlanningAssistant() {
            const modal = document.getElementById('ia-predictions-modal');
            if (!modal) return;

            // V221 : chaque ouverture repart du MASTER officiel.
            // Aucun ancien brouillon multi-mois ne doit être présenté comme actuel.
            planningAssistantPrediction = null;
            planningAssistantPredictionMonth = null;
            planningAssistantDraft = null;
            planningAssistantMultiMonths = [];
            planningAssistantMultiIndex = 0;
            window.__ICHEF_MULTI_MONTH_PUBLIC__ = {
                horizon: planningAssistantHorizon,
                index: 0,
                months: []
            };
            window.__ICHEF_PLANNING_DRAFT_STALE_V217 = false;
            window.__ICHEF_PLANNING_DRAFT_MASTER_SIG_V217 = '';

            const applyBtn = document.getElementById('assistant-apply-btn');
            if (applyBtn) applyBtn.disabled = true;

            renderPlanningAssistantLocal();
            hydrateRhSettingsForm();
            renderPlanningAssistantOfficialV221();

            modal.classList.add('show');
            modal.style.display = 'flex';

            window.dispatchEvent(new CustomEvent('ichef-multimonth-update'));
            Promise.resolve(generateIAPrediction(true)).catch(() => {});

            // Certains anciens patches mettent à jour le badge après l'ouverture.
            // On réaffirme ensuite l'état officiel.
            setTimeout(() => {
                if (planningAssistantViewV221 === 'official') {
                    updatePlanningAssistantViewV221('official');
                }
            }, 30);
        }
        function schedulePlanningAssistantAutoRefresh() {
            clearTimeout(planningAssistantAutoTimer);
            planningAssistantAutoTimer = setTimeout(() => {
                if (document.getElementById('ia-predictions-modal')?.classList.contains('show')) {
                    generateIAPrediction(true);
                }
            }, 900);
        }
        function openPredictiveModal() {
            openPlanningAssistant();
        }
        function escapeAssistantList(items, fallback) {
            const list = Array.isArray(items) ? items.filter(Boolean) : [];
            if (!list.length) {
                return `<li>${escapeRhHtml(fallback)}</li>`;
            }
            return list.map(item => {
                if (typeof item === 'string') {
                    return `<li>${escapeRhHtml(item)}</li>`;
                }
                const label = item.label || item.date || item.day || '';
                const reason = item.reason || item.recommendation || '';
                const covers = Number(item.covers || 0);
                const extra = covers > 0 ? ` · ${covers} couverts` : '';
                return `<li><strong>${escapeRhHtml(label)}</strong>${extra}${reason ? ' — ' + escapeRhHtml(reason) : ''}</li>`;
            }).join('');
        }
        async function generateIAPrediction(silent = false) {
            const btn = document.getElementById('assistant-analyse-btn');
            if (btn && !silent) {
                btn.innerText = 'ANALYSE EN COURS...';
                btn.disabled = true;
                btn.style.opacity = '0.65';
            }
            const month = getPlanningAssistantMonth();
            const staffAnalysis = renderPlanningAssistantLocal();
            const settings = saveRhPlanningSettings(true);
            const safeStaff = getDir()
                .filter(s => s.active !== false)
                .map(s => ({
                    id: s.id,
                    name: s.name,
                    role: s.role,
                    dept: s.dept,
                    contractHoursWeek: Number(s.contract) || 0,
                    annualLeaveDays: Number(s.annualLeaveDays ?? 25),
                    leaveCarryover: Number(s.leaveCarryover ?? 0),
                    recoveryBalance: Number(s.recoveryBalance ?? 0),
                    grossSalaryMonthly: Number(s.grossSalaryMonthly ?? 0),
                    hourlyCost: Number(s.hourlyCost ?? 0),
                    skillLevel: String(s.skillLevel || 'autonome'),
                    skills: Array.isArray(s.skills) ? s.skills : [],
                    availability: String(s.availability || ''),
                    minRestHours: Number(s.minRestHours ?? 11),
                    maxConsecutiveDays: Number(s.maxConsecutiveDays ?? 6),
                    active: s.active !== false
                }));
            try {
                const response = await fetch(
                    `${SERVER_URL_JS}/api/predict-hr-schedule`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json',
                            'X-iCHEF-Tenant': tenantID_JS
                        },
                        credentials: 'include',
                        cache: 'no-store',
                        body: JSON.stringify({
                            tenantID: tenantID_JS,
                            masterPin: getRhDirectionAuthPin() || undefined,
                            month,
                            staffList: safeStaff,
                            staffAnalysis,
                            requests: getReqs(),
                            planningSettings: {
                                ...settings,
                                cashActivitySnapshot:
                                    rhCashActivitySnapshotV170(
                                        month
                                    )
                            }
                        })
                    }
                );
                const data = await response.json().catch(() => ({}));
                if (!response.ok || !data.success || !data.prediction) {
                    throw new Error(data.error || data.message || 'Analyse indisponible.');
                }
                const p = data.prediction;
                planningAssistantPrediction = p;
                planningAssistantPredictionMonth = month;
                try {
                    API.update('RH_AI_DEMAND', {
                        month,
                        highDemandDays: Array.isArray(p.highDemandDays) ? p.highDemandDays.slice(0,31) : [],
                        protectedPeakDays: Array.isArray(p.protectedPeakDays) ? p.protectedPeakDays.slice(0,31) : [],
                        lowDemandDays: Array.isArray(p.lowDemandDays) ? p.lowDemandDays.slice(0,31) : [],
                        generatedAt: new Date().toISOString()
                    });
                } catch (_) { }
                const influence = document.getElementById('assistant-restaurant-influence');
                if (influence) {
                    influence.innerText = p.restaurantInfluence || p.monthSummary || 'Analyse des réservations et de l’historique terminée.';
                }
                const rush = document.getElementById('ia-rush-periods');
                if (rush) rush.innerHTML = escapeAssistantList(p.highDemandDays || p.rushPeriods, 'Aucun jour de forte tension détecté.');
                const calm = document.getElementById('ia-dead-periods');
                if (calm) calm.innerHTML = escapeAssistantList(p.lowDemandDays || p.deadPeriods, 'Aucun jour particulièrement calme détecté.');
                const leaveText = Array.isArray(p.leaveRecommendations)
                    ? p.leaveRecommendations.join(' · ')
                    : p.vacationSuggestions || 'Les absences enregistrées ont été intégrées à l’analyse.';
                const vacations = document.getElementById('ia-vacations');
                if (vacations) vacations.innerText = leaveText;
                const warnings = Array.isArray(p.warnings) ? p.warnings : [];
                const staffRecommendations = Array.isArray(p.staffRecommendations) ? p.staffRecommendations : [];
                const recommendationText = [
                    ...warnings,
                    ...staffRecommendations.slice(0, 8).map(r => {
                        const base = `${r.name || 'Collaborateur'} : ${r.recommendation || r.action || ''}`;
                        return r.why ? `${base} — Pourquoi : ${r.why}` : base;
                    }).filter(x => !x.endsWith(': '))
                ];
                const hiring = document.getElementById('ia-hiring');
                if (hiring) {
                    hiring.innerText = recommendationText.length
                        ? recommendationText.join('\n')
                        : p.hiringAdvice || 'Aucune alerte particulière.';
                }
                assistantDayOffSuggestions = buildAssistantDayOffSuggestions();
                renderAssistantDayOffSuggestions();
                if (!silent && typeof showToast === 'function') {
                    showToast('Analyse planning actualisée');
                }
                return p;
            } catch (error) {
                console.error('Erreur Assistance Planning :', error);
                planningAssistantPrediction = null;
                planningAssistantPredictionMonth = null;
                const influence = document.getElementById('assistant-restaurant-influence');
                if (influence) {
                    influence.innerText = 'Mode local actif : contrats, congés, compétences, disponibilités et paramètres RH seront utilisés. Les données réservations / ventes ne sont pas disponibles pour cette analyse.';
                }
                const hiring = document.getElementById('ia-hiring');
                if (hiring) hiring.innerText = error?.message || 'Analyse restaurant momentanément indisponible.';
                // Même sans données restaurant, iCHEF peut proposer des OFF à partir du planning local.
                assistantDayOffSuggestions = buildAssistantDayOffSuggestions();
                renderAssistantDayOffSuggestions();
                return null;
            } finally {
                if (btn && !silent) {
                    btn.innerText = '1. ANALYSER';
                    btn.disabled = false;
                    btn.style.opacity = '1';
                }
            }
        }
        function assistantExistingDayIsProtected(existing, preserveExisting) {
            if (!existing) return false;
            if (isRhLeaveStatus(existing.status) || existing.status === 'ferie') return true;
            if (!preserveExisting) return false;
            return isRhWorkStatus(existing.status) || String(existing.obs || '').trim().length > 0;
        }
        function assistantDayWorksService(dayPlan, service) {
            if (!dayPlan || !isRhWorkStatus(dayPlan.status)) return false;
            if (service === 'lunch') return Boolean(dayPlan.s1);
            return Boolean(dayPlan.s2);
        }
        function assistantLegalCountryV142(settings) {
            return String(
                settings?.planningLegalCountry ||
                (String(settings?.currency || '').toUpperCase() === 'EUR'
                    ? 'FR'
                    : 'CH')
            ).toUpperCase() === 'FR'
                ? 'FR'
                : 'CH';
        }
        function assistantLegalProfileV142(settings, staff) {
            const country =
                assistantLegalCountryV142(settings);
            if (country === 'FR') {
                const text =
                    `${staff?.dept || ''} ${staff?.role || ''}`
                        .toLowerCase();
                let dailyMax = 10;
                let legalRole = 'UNKNOWN';
                if (/cuis|chef|kitchen/.test(text)) {
                    dailyMax = 11;
                    legalRole = 'COOK';
                } else if (/réception|reception/.test(text)) {
                    dailyMax = 12;
                    legalRole = 'RECEPTION';
                } else if (/veilleur|night|nuit/.test(text)) {
                    dailyMax = 12;
                    legalRole = 'NIGHT';
                } else if (/administratif|admin/.test(text)) {
                    dailyMax = 10;
                    legalRole = 'ADMIN_OFFSITE';
                } else if (text.trim()) {
                    dailyMax = 11.5;
                    legalRole = 'OTHER_HCR';
                }
                return {
                    country: 'FR',
                    framework: 'HCR + Code du travail',
                    legalRole,
                    weeklyReference: 35,
                    weeklyMax: 48,
                    rolling12AverageMax: 46,
                    dailyMax,
                    dailyRestMin: 11,
                    weeklyRestDays: 2,
                    maxConsecutiveDays: 6,
                    maxSpanHours: null,
                    minPauseAfterSixHours: 20,
                    scheduleNoticeDays: 15,
                    establishmentType:
                        String(
                            settings?.planningLegalEstablishmentType ||
                            'permanent'
                        ).toLowerCase()
                };
            }
            const type =
                String(
                    settings?.planningLegalEstablishmentType ||
                    'standard'
                ).toLowerCase();
            const weeklyReference =
                type === 'seasonal'
                    ? 43.5
                    : type === 'small'
                        ? 45
                        : 42;
            return {
                country: 'CH',
                framework: 'CCNT + Loi sur le travail',
                weeklyReference,
                weeklyMax: 50,
                rolling12AverageMax: null,
                dailyMax: null,
                dailyRestMin: 11,
                weeklyRestDays: 2,
                // La CCNT autorise certaines organisations sur 7 jours
                // sous conditions strictes. iCHEF ne les automatise pas.
                maxConsecutiveDays: 6,
                maxSpanHours: 14,
                minPauseMealMinutes: 30,
                scheduleNoticeDays:
                    type === 'seasonal'
                        ? 7
                        : 14,
                establishmentType: type
            };
        }
        function assistantLegalWeeklyReferenceV142(settings, staff) {
            const profile =
                assistantLegalProfileV142(settings, staff);
            const contractual =
                Number(staff?.contract || 0);
            return contractual > 0
                ? contractual
                : profile.weeklyReference;
        }
        function assistantLegalDaySpanV142(plan) {
            if (!plan) return 0;
            const ranges =
                [plan.s1, plan.s2]
                    .filter(Boolean)
                    .map(value =>
                        String(value)
                            .split('-')
                            .map(v =>
                                assistantTimeToDecimal(v)
                            )
                    )
                    .filter(pair =>
                        pair.length === 2 &&
                        pair.every(Number.isFinite)
                    );
            if (!ranges.length) return 0;
            const start =
                Math.min(
                    ...ranges.map(pair => pair[0])
                );
            const end =
                Math.max(
                    ...ranges.map(pair => pair[1])
                );
            return Math.max(0, end - start);
        }
        function assistantLegalFirstStartV142(plan) {
            const starts =
                [plan?.s1, plan?.s2]
                    .filter(Boolean)
                    .map(v =>
                        assistantTimeToDecimal(
                            String(v).split('-')[0]
                        )
                    )
                    .filter(Number.isFinite);
            return starts.length
                ? Math.min(...starts)
                : null;
        }
        function assistantLegalLastEndV142(plan) {
            const ends =
                [plan?.s1, plan?.s2]
                    .filter(Boolean)
                    .map(v =>
                        assistantTimeToDecimal(
                            String(v).split('-')[1]
                        )
                    )
                    .filter(Number.isFinite);
            return ends.length
                ? Math.max(...ends)
                : null;
        }
        function assistantLegalRestBetweenV142(previous, current) {
            const previousEnd =
                assistantLegalLastEndV142(previous);
            const currentStart =
                assistantLegalFirstStartV142(current);
            if (
                previousEnd === null ||
                currentStart === null
            ) {
                return Infinity;
            }
            return (
                24 -
                previousEnd +
                currentStart
            );
        }
        function assistantLegalWeekBoundsV142(year, month, day) {
            const dateObj =
                new Date(year, month - 1, day);
            const mondayOffset =
                (dateObj.getDay() + 6) % 7;
            const monday =
                new Date(
                    year,
                    month - 1,
                    day - mondayOffset
                );
            const sunday =
                new Date(monday);
            sunday.setDate(
                monday.getDate() + 6
            );
            return { monday, sunday };
        }
        function assistantLegalDatePlanV142(
            proposal,
            staffId,
            dateObj,
            draftMonth
        ) {
            const monthStr =
                `${dateObj.getFullYear()}-${String(
                    dateObj.getMonth() + 1
                ).padStart(2, '0')}`;
            const day =
                dateObj.getDate();
            if (monthStr === draftMonth) {
                return (
                    proposal?.[staffId]?.[day] ||
                    proposal?.[String(staffId)]?.[day] ||
                    null
                );
            }
            return (
                getTs()?.[monthStr]?.[staffId]?.[day] ||
                getTs()?.[monthStr]?.[String(staffId)]?.[day] ||
                null
            );
        }
        function assistantLegalWeekHoursV142(
            proposal,
            staffId,
            year,
            month,
            day,
            simulatedPlan = null
        ) {
            const draftMonth =
                `${year}-${String(month).padStart(2, '0')}`;
            const bounds =
                assistantLegalWeekBoundsV142(
                    year,
                    month,
                    day
                );
            let total = 0;
            for (
                let cursor = new Date(bounds.monday);
                cursor <= bounds.sunday;
                cursor.setDate(cursor.getDate() + 1)
            ) {
                const cursorMonth =
                    `${cursor.getFullYear()}-${String(
                        cursor.getMonth() + 1
                    ).padStart(2, '0')}`;
                const cursorDay =
                    cursor.getDate();
                let plan =
                    assistantLegalDatePlanV142(
                        proposal,
                        staffId,
                        cursor,
                        draftMonth
                    );
                if (
                    simulatedPlan &&
                    cursorMonth === draftMonth &&
                    cursorDay === day
                ) {
                    plan = simulatedPlan;
                }
                total += Number(
                    calculateNet(plan) || 0
                );
            }
            return total;
        }
        function assistantLegalLongestContinuousV143(plan) {
            const segments =
                [plan?.s1, plan?.s2]
                    .filter(Boolean)
                    .map(range => {
                        const [start, end] =
                            String(range)
                                .split('-')
                                .map(v =>
                                    assistantTimeToDecimal(v)
                                );
                        return (
                            Number.isFinite(start) &&
                            Number.isFinite(end)
                        )
                            ? Math.max(0, end - start)
                            : 0;
                    });
            return segments.length
                ? Math.max(...segments)
                : 0;
        }
        function assistantLegalRolling12AverageV143(
            proposal,
            staffId,
            year,
            month,
            day,
            simulatedPlan = null
        ) {
            const draftMonth =
                `${year}-${String(month).padStart(2,'0')}`;
            const dateObj =
                new Date(year, month - 1, day);
            const bounds =
                assistantLegalWeekBoundsV142(
                    year,
                    month,
                    day
                );
            const end =
                new Date(bounds.sunday);
            const start =
                new Date(end);
            start.setDate(
                end.getDate() - 83
            );
            let total = 0;
            for (
                let cursor = new Date(start);
                cursor <= end;
                cursor.setDate(cursor.getDate() + 1)
            ) {
                const cursorMonth =
                    `${cursor.getFullYear()}-${String(
                        cursor.getMonth() + 1
                    ).padStart(2,'0')}`;
                const cursorDay =
                    cursor.getDate();
                let plan =
                    assistantLegalDatePlanV142(
                        proposal,
                        staffId,
                        cursor,
                        draftMonth
                    );
                if (
                    simulatedPlan &&
                    cursorMonth === draftMonth &&
                    cursorDay === day
                ) {
                    plan = simulatedPlan;
                }
                total += Number(
                    calculateNet(plan) || 0
                );
            }
            return total / 12;
        }
        function assistantLegalServiceAllowsV142(
            proposal,
            staff,
            day,
            service,
            dept,
            settings,
            year,
            month
        ) {
            if (
                settings?.planningLegalEnforcement === false
            ) {
                return {
                    ok: true,
                    reason: ''
                };
            }
            const profile =
                assistantLegalProfileV142(
                    settings,
                    staff
                );
            const current =
                proposal?.[staff.id]?.[day];
            if (!current) {
                return {
                    ok: false,
                    reason: 'case planning absente'
                };
            }
            const simulated =
                assistantClone(current);
            assistantSetService(
                simulated,
                service,
                dept,
                settings,
                simulated.obs || ''
            );
            const dailyHours =
                Number(
                    calculateNet(simulated) || 0
                );
            if (
                Number.isFinite(profile.dailyMax) &&
                profile.dailyMax !== null &&
                dailyHours >
                    profile.dailyMax + 0.01
            ) {
                return {
                    ok: false,
                    reason:
                        `maximum journalier ${profile.dailyMax} h`
                };
            }
            if (
                Number.isFinite(profile.maxSpanHours) &&
                profile.maxSpanHours !== null &&
                assistantLegalDaySpanV142(simulated) >
                    profile.maxSpanHours + 0.01
            ) {
                return {
                    ok: false,
                    reason:
                        `amplitude maximale ${profile.maxSpanHours} h`
                };
            }
            const weekHours =
                assistantLegalWeekHoursV142(
                    proposal,
                    staff.id,
                    year,
                    month,
                    day,
                    simulated
                );
            if (
                weekHours >
                    profile.weeklyMax + 0.01
            ) {
                return {
                    ok: false,
                    reason:
                        `maximum hebdomadaire ${profile.weeklyMax} h`
                };
            }
            if (profile.country === 'FR') {
                const rollingAverage =
                    assistantLegalRolling12AverageV143(
                        proposal,
                        staff.id,
                        year,
                        month,
                        day,
                        simulated
                    );
                if (
                    rollingAverage >
                        profile.rolling12AverageMax + 0.01
                ) {
                    return {
                        ok: false,
                        reason:
                            `moyenne 12 semaines > ${profile.rolling12AverageMax} h`
                    };
                }
                const longestContinuous =
                    assistantLegalLongestContinuousV143(
                        simulated
                    );
                if (
                    longestContinuous > 6 &&
                    Number(simulated.pause || 0) < 20
                ) {
                    return {
                        ok: false,
                        reason:
                            'pause minimale 20 min après 6 h continues'
                    };
                }
            }
            const previous =
                day > 1
                    ? proposal?.[staff.id]?.[day - 1]
                    : null;
            if (
                previous &&
                assistantLegalRestBetweenV142(
                    previous,
                    simulated
                ) <
                    profile.dailyRestMin - 0.01
            ) {
                return {
                    ok: false,
                    reason:
                        `repos quotidien minimum ${profile.dailyRestMin} h`
                };
            }
            const next =
                proposal?.[staff.id]?.[day + 1];
            if (
                next &&
                isRhWorkStatus(next.status) &&
                assistantLegalRestBetweenV142(
                    simulated,
                    next
                ) <
                    profile.dailyRestMin - 0.01
            ) {
                return {
                    ok: false,
                    reason:
                        `repos quotidien minimum ${profile.dailyRestMin} h`
                };
            }
            return {
                ok: true,
                reason: ''
            };
        }
        function assistantLegalAdjacentPlanV145(
            proposal,
            staffId,
            year,
            month,
            dayOffset
        ) {
            const base =
                new Date(year, month - 1, 1);
            base.setDate(
                base.getDate() + dayOffset
            );
            const draftMonth =
                `${year}-${String(month).padStart(2,'0')}`;
            return assistantLegalDatePlanV142(
                proposal,
                staffId,
                base,
                draftMonth
            );
        }
        function assistantLegalHasReliableHistoryV145(
            staff,
            referenceDate,
            weeks
        ) {
            const hireRaw =
                staff?.startDate ||
                staff?.hireDate ||
                staff?.employmentStartDate ||
                '';
            const hire =
                hireRaw
                    ? new Date(hireRaw)
                    : null;
            const start =
                new Date(referenceDate);
            start.setDate(
                start.getDate() - (weeks * 7 - 1)
            );
            if (
                hire &&
                Number.isFinite(hire.getTime()) &&
                hire > start
            ) {
                // Embauche récente : la période antérieure à l'embauche
                // ne doit pas être exigée.
                return true;
            }
            const ts =
                typeof getTs === 'function'
                    ? getTs()
                    : {};
            let checkedMonths = new Set();
            for (
                let cursor = new Date(start);
                cursor <= referenceDate;
                cursor.setDate(cursor.getDate() + 7)
            ) {
                checkedMonths.add(
                    `${cursor.getFullYear()}-${String(
                        cursor.getMonth()+1
                    ).padStart(2,'0')}`
                );
            }
            // On exige qu'au moins une structure de planning existe
            // pour chaque mois traversé. Sans historique, le calcul
            // 12 semaines n'est pas juridiquement fiable.
            return Array.from(checkedMonths)
                .every(monthKey =>
                    Boolean(
                        ts?.[monthKey]?.[staff.id] ||
                        ts?.[monthKey]?.[String(staff.id)]
                    )
                );
        }
        function assistantLegalAuditDraftV142(
            draft,
            staffList,
            settings
        ) {
            const blockers = [];
            const warnings = [];
            if (
                !draft ||
                !draft.proposal ||
                settings?.planningLegalEnforcement === false
            ) {
                return {
                    blockers,
                    warnings
                };
            }
            const [year, month] =
                String(draft.month)
                    .split('-')
                    .map(Number);
            // V145 · fail-closed : pas de profil juridique complet = pas de publication.
            const country =
                String(settings?.planningLegalCountry || '').toUpperCase();
            if (!['CH','FR'].includes(country)) {
                blockers.push(
                    'Profil juridique client incomplet : pays CH ou FR obligatoire.'
                );
            }
            if (!String(settings?.planningLegalEstablishmentType || '').trim()) {
                blockers.push(
                    'Profil juridique client incomplet : type d’établissement obligatoire.'
                );
            }
            if (settings?.planningLegalEnforcement === false) {
                blockers.push(
                    'Le contrôle juridique strict ne peut pas être désactivé.'
                );
            }
            const daysInMonth =
                new Date(
                    year,
                    month,
                    0
                ).getDate();
            (staffList || []).forEach(staff => {
                const profile =
                    assistantLegalProfileV142(
                        settings,
                        staff
                    );
                const contractHours =
                    Number(staff?.contract || 0);
                if (!(contractHours > 0)) {
                    blockers.push(
                        `${staff?.name || 'Collaborateur'} : durée contractuelle hebdomadaire manquante ou invalide.`
                    );
                }
                if (
                    profile.country === 'FR' &&
                    profile.legalRole === 'UNKNOWN'
                ) {
                    blockers.push(
                        `${staff?.name || 'Collaborateur'} : fonction/poste insuffisamment renseigné pour appliquer la limite journalière HCR.`
                    );
                }
                let consecutive = 0;
                for (
                    let day = 1;
                    day <= daysInMonth;
                    day++
                ) {
                    const plan =
                        draft.proposal?.[staff.id]?.[day];
                    const dateObj =
                        new Date(
                            year,
                            month - 1,
                            day
                        );
                    const worked =
                        Boolean(
                            plan &&
                            isRhWorkStatus(plan.status) &&
                            (plan.s1 || plan.s2)
                        );
                    if (
                        assistantIsRestaurantClosed(
                            dateObj,
                            settings
                        ) &&
                        worked
                    ) {
                        blockers.push(
                            `${staff.name} · ${String(day).padStart(2,'0')}/${String(month).padStart(2,'0')} : travail planifié alors que l'établissement est fermé.`
                        );
                    }
                    if (!worked) {
                        consecutive = 0;
                        continue;
                    }
                    consecutive++;
                    if (
                        consecutive >
                        profile.maxConsecutiveDays
                    ) {
                        blockers.push(
                            `${staff.name} · ${String(day).padStart(2,'0')}/${String(month).padStart(2,'0')} : plus de ${profile.maxConsecutiveDays} jours consécutifs automatisés.`
                        );
                    }
                    const hours =
                        Number(
                            calculateNet(plan) || 0
                        );
                    if (
                        profile.dailyMax !== null &&
                        hours >
                            profile.dailyMax + 0.01
                    ) {
                        blockers.push(
                            `${staff.name} · ${String(day).padStart(2,'0')}/${String(month).padStart(2,'0')} : ${hours.toFixed(1)} h > maximum journalier ${profile.dailyMax} h (${profile.framework}).`
                        );
                    }
                    if (
                        profile.maxSpanHours !== null &&
                        assistantLegalDaySpanV142(plan) >
                            profile.maxSpanHours + 0.01
                    ) {
                        blockers.push(
                            `${staff.name} · ${String(day).padStart(2,'0')}/${String(month).padStart(2,'0')} : amplitude > ${profile.maxSpanHours} h (${profile.framework}).`
                        );
                    }
                    if (
                        profile.country === 'FR' &&
                        assistantLegalLongestContinuousV143(plan) > 6 &&
                        Number(plan.pause || 0) < 20
                    ) {
                        blockers.push(
                            `${staff.name} · ${String(day).padStart(2,'0')}/${String(month).padStart(2,'0')} : pause < 20 min après plus de 6 h continues.`
                        );
                    }
                    {
                        let previous = null;
                        if (day > 1) {
                            previous =
                                draft.proposal?.[staff.id]?.[day - 1];
                        } else {
                            const prevDate =
                                new Date(year, month - 1, 0);
                            previous =
                                assistantLegalDatePlanV142(
                                    draft.proposal,
                                    staff.id,
                                    prevDate,
                                    draft.month
                                );
                        }
                        if (
                            previous &&
                            isRhWorkStatus(previous.status) &&
                            (previous.s1 || previous.s2)
                        ) {
                            const rest =
                                assistantLegalRestBetweenV142(
                                    previous,
                                    plan
                                );
                            if (
                                rest <
                                profile.dailyRestMin - 0.01
                            ) {
                                blockers.push(
                                    `${staff.name} · ${String(day).padStart(2,'0')}/${String(month).padStart(2,'0')} : repos ${rest.toFixed(1)} h < ${profile.dailyRestMin} h.`
                                );
                            }
                        }
                    }
                }
                // Contrôle hebdomadaire complet sur chaque lundi du mois.
                for (
                    let day = 1;
                    day <= daysInMonth;
                    day++
                ) {
                    const dateObj =
                        new Date(
                            year,
                            month - 1,
                            day
                        );
                    if (dateObj.getDay() !== 1) {
                        continue;
                    }
                    const weekHours =
                        assistantLegalWeekHoursV142(
                            draft.proposal,
                            staff.id,
                            year,
                            month,
                            day
                        );
                    if (
                        weekHours >
                        profile.weeklyMax + 0.01
                    ) {
                        blockers.push(
                            `${staff.name} · semaine du ${String(day).padStart(2,'0')}/${String(month).padStart(2,'0')} : ${weekHours.toFixed(1)} h > maximum ${profile.weeklyMax} h.`
                        );
                    }
                    // Jours de repos : calcul sur la semaine dans la proposition.
                    let offUnits = 0;
                    const bounds =
                        assistantLegalWeekBoundsV142(
                            year,
                            month,
                            day
                        );
                    for (
                        let cursor = new Date(bounds.monday);
                        cursor <= bounds.sunday;
                        cursor.setDate(cursor.getDate() + 1)
                    ) {
                        const cursorMonth =
                            `${cursor.getFullYear()}-${String(
                                cursor.getMonth() + 1
                            ).padStart(2, '0')}`;
                        const plan =
                            assistantLegalDatePlanV142(
                                draft.proposal,
                                staff.id,
                                cursor,
                                draft.month
                            );
                        // Si la semaine dépasse le mois et qu'aucun planning
                        // adjacent n'existe, on ne bloque pas artificiellement.
                        if (
                            cursorMonth !== draft.month &&
                            !plan
                        ) {
                            offUnits = null;
                            break;
                        }
                        offUnits +=
                            assistantOffUnit(plan);
                    }
                    if (
                        offUnits !== null &&
                        offUnits + 0.001 <
                            profile.weeklyRestDays
                    ) {
                        const swissSevenDayCovered =
                            profile.country === 'CH' &&
                            settings?.planningSwissSevenDayException === true &&
                            typeof assistantSwissWeekCoveredBySevenDayExceptionV180 === 'function' &&
                            assistantSwissWeekCoveredBySevenDayExceptionV180(
                                draft.proposal,
                                staff,
                                bounds.monday,
                                draft.month,
                                settings
                            );
                        if (!swissSevenDayCovered) {
                            blockers.push(
                                `${staff.name} · semaine du ${String(day).padStart(2,'0')}/${String(month).padStart(2,'0')} : ${offUnits.toFixed(1)} jour(s) de repos < ${profile.weeklyRestDays}.`
                            );
                        }
                    }
                    if (
                        profile.country === 'FR'
                    ) {
                        const referenceDate =
                            new Date(year, month - 1, day);
                        const reliableHistory =
                            assistantLegalHasReliableHistoryV145(
                                staff,
                                referenceDate,
                                12
                            );
                        if (!reliableHistory) {
                            blockers.push(
                                `${staff.name} · historique planning insuffisant pour contrôler de façon fiable la moyenne sur 12 semaines.`
                            );
                        } else {
                            const rollingAverage =
                                assistantLegalRolling12AverageV143(
                                    draft.proposal,
                                    staff.id,
                                    year,
                                    month,
                                    day
                                );
                            if (
                                rollingAverage >
                                    profile.rolling12AverageMax + 0.01
                            ) {
                                blockers.push(
                                    `${staff.name} · semaine du ${String(day).padStart(2,'0')}/${String(month).padStart(2,'0')} : moyenne ${rollingAverage.toFixed(1)} h sur 12 semaines > ${profile.rolling12AverageMax} h.`
                                );
                            }
                        }
                    }
                }
            });
            return {
                blockers:
                    Array.from(new Set(blockers)),
                warnings:
                    Array.from(new Set(warnings))
            };
        }
        function assistantSetService(dayPlan, service, dept, settings, note) {
            const before = calculateNet(dayPlan);
            dayPlan.poste = dept || dayPlan.poste || 'salle';
            if (service === 'lunch') {
                const workStart =
                    settings.lunchWorkStart ||
                    settings.lunchStart;
                const workEnd =
                    settings.lunchWorkEnd ||
                    settings.lunchEnd;
                dayPlan.s1 =
                    `${workStart}-${workEnd}`;
            } else {
                const workStart =
                    settings.dinnerWorkStart ||
                    settings.dinnerStart;
                const workEnd =
                    settings.dinnerWorkEnd ||
                    settings.dinnerEnd;
                dayPlan.s2 =
                    `${workStart}-${workEnd}`;
            }
            if (dayPlan.s1 && dayPlan.s2) {
                dayPlan.status = 'present';
                dayPlan.pause = Number(settings.fullDayPause || 0);
            } else if (dayPlan.s1) {
                dayPlan.status = 'off_soir';
                dayPlan.pause = 0;
            } else if (dayPlan.s2) {
                dayPlan.status = 'off_matin';
                dayPlan.pause = 0;
            }
            dayPlan.obs = note;
            return Math.max(0, calculateNet(dayPlan) - before);
        }
        function assistantIsActualWorkDayV146(plan) {
            return Boolean(
                plan &&
                isRhWorkStatus(plan.status) &&
                (plan.s1 || plan.s2)
            );
        }
        function assistantPreviousMonthTailV146(
            staffId,
            year,
            month,
            limit = 6
        ) {
            const previous =
                new Date(year, month - 2, 1);
            const prevMonth =
                `${previous.getFullYear()}-${String(
                    previous.getMonth() + 1
                ).padStart(2,'0')}`;
            const daysInPrevious =
                new Date(
                    previous.getFullYear(),
                    previous.getMonth() + 1,
                    0
                ).getDate();
            const ts =
                typeof getTs === 'function'
                    ? getTs()
                    : {};
            const node =
                ts?.[prevMonth]?.[staffId] ||
                ts?.[prevMonth]?.[String(staffId)] ||
                {};
            let count = 0;
            for (
                let day = daysInPrevious;
                day >= 1 && count < limit;
                day--
            ) {
                const plan = node?.[day];
                if (assistantIsActualWorkDayV146(plan)) {
                    count++;
                } else {
                    break;
                }
            }
            return count;
        }
        function assistantEnforceSixDayOffLegacyV146(
            proposal,
            staffList,
            monthStr,
            settings
        ) {
            const [year, month] =
                String(monthStr)
                    .split('-')
                    .map(Number);
            const daysInMonth =
                new Date(
                    year,
                    month,
                    0
                ).getDate();
            const horizon =
                typeof assistantPlanningHorizon === 'function'
                    ? assistantPlanningHorizon(monthStr)
                    : { startDay: 1 };
            const forced = [];
            (staffList || []).forEach(staff => {
                let consecutive =
                    assistantPreviousMonthTailV146(
                        staff.id,
                        year,
                        month,
                        6
                    );
                for (
                    let day = 1;
                    day <= daysInMonth;
                    day++
                ) {
                    const plan =
                        proposal?.[staff.id]?.[day] ||
                        proposal?.[String(staff.id)]?.[day];
                    if (!plan) {
                        consecutive = 0;
                        continue;
                    }
                    // Le passé reste historique.
                    if (day < horizon.startDay) {
                        if (assistantIsActualWorkDayV146(plan)) {
                            consecutive++;
                        } else {
                            consecutive = 0;
                        }
                        continue;
                    }
                    // Une maladie, un congé payé, une récupération,
                    // un accident, etc. n'est PAS un jour de travail.
                    // On conserve son vrai statut, on ne le transforme pas en OFF.
                    if (!assistantIsActualWorkDayV146(plan)) {
                        consecutive = 0;
                        continue;
                    }
                    if (consecutive >= 6) {
                        const before =
                            JSON.parse(
                                JSON.stringify(plan)
                            );
                        proposal[staff.id][day] = {
                            ...plan,
                            status: 'off',
                            s1: '',
                            s2: '',
                            pause: 0,
                            obs:
                                'OFF automatique · 7e jour de travail interdit par la politique juridique stricte iCHEF',
                            __legalForcedOff: true,
                            __protected: true
                        };
                        forced.push({
                            staffId:
                                String(staff.id),
                            staffName:
                                String(staff.name || ''),
                            day,
                            before
                        });
                        consecutive = 0;
                        continue;
                    }
                    consecutive++;
                }
            });
            return forced;
        }
        function rhVacationStatusRulesV146(
            status,
            country = 'CH'
        ) {
            const normalized =
                String(status || '').toLowerCase();
            if (normalized === 'conge') {
                return {
                    vacationDebit: true,
                    workedForScheduling: false,
                    weeklyRestDay: false,
                    label: 'VACANCES / CP'
                };
            }
            if (normalized === 'off') {
                return {
                    vacationDebit: false,
                    workedForScheduling: false,
                    weeklyRestDay: true,
                    label: 'OFF / REPOS'
                };
            }
            if (normalized === 'maladie') {
                return {
                    vacationDebit: false,
                    workedForScheduling: false,
                    weeklyRestDay: false,
                    vacationAcquisition:
                        String(country).toUpperCase() === 'FR'
                            ? 'ACQUISITION_MALADIE_FR'
                            : 'REGLE_REDUCTION_CH',
                    label: 'MALADIE'
                };
            }
            return {
                vacationDebit: false,
                workedForScheduling:
                    ['present','off_matin','off_soir']
                        .includes(normalized),
                weeklyRestDay: false,
                label:
                    normalized.toUpperCase()
            };
        }
        function assistantCountConsecutiveDays(proposal, staffId, day) {
            let count = 0;
            for (let d = day - 1; d >= 1; d--) {
                const p = proposal?.[staffId]?.[d];
                if (p && isRhWorkStatus(p.status)) count++;
                else break;
            }
            return count;
        }
        function assistantWeekQuotaAllows(proposal, staffId, day, settings, year, month, service = '') {
            const staff =
                getDir().find(s =>
                    String(s.id) === String(staffId)
                );
            const legalProfile =
                assistantLegalProfileV142(
                    settings,
                    staff
                );
            const configuredDaysOff =
                Math.max(
                    0.5,
                    Math.min(
                        7,
                        Math.round(
                            (Number(settings?.planningDaysOffPerWeek) || 2) * 2
                        ) / 2
                    )
                );
            const daysOffPerWeek =
                settings?.planningLegalEnforcement === false
                    ? configuredDaysOff
                    : Math.max(
                        configuredDaysOff,
                        legalProfile.weeklyRestDays
                    );
            const dateObj = new Date(year, month - 1, day);
            const mondayOffset = (dateObj.getDay() + 6) % 7;
            const rawStart = day - mondayOffset;
            const daysInMonth = new Date(year, month, 0).getDate();
            const startDay = Math.max(1, rawStart);
            const endDay = Math.min(daysInMonth, rawStart + 6);
            const span = Math.max(1, endDay - startDay + 1);
            const requiredOff = Math.min(span, Math.round(((span * daysOffPerWeek) / 7) * 2) / 2);
            let currentOffUnits = 0;
            for (let d = startDay; d <= endDay; d++) {
                currentOffUnits += assistantOffUnit(proposal?.[staffId]?.[d]);
            }
            if (!service) return currentOffUnits + 0.001 >= requiredOff;
            const currentPlan = proposal?.[staffId]?.[day];
            if (!currentPlan) return false;
            const simulated = assistantClone(currentPlan);
            assistantSetService(simulated, service, simulated.poste || 'salle', settings, simulated.obs || '');
            const futureOffUnits = currentOffUnits - assistantOffUnit(currentPlan) + assistantOffUnit(simulated);
            return futureOffUnits + 0.001 >= requiredOff;
        }
        function assistantWeeklyOffCount(proposal, staffId, day, year, month) {
            const dateObj = new Date(year, month - 1, day);
            const mondayOffset = (dateObj.getDay() + 6) % 7;
            const rawStart = day - mondayOffset;
            const daysInMonth = new Date(year, month, 0).getDate();
            const startDay = Math.max(1, rawStart);
            const endDay = Math.min(daysInMonth, rawStart + 6);
            let off = 0;
            for (let d = startDay; d <= endDay; d++) {
                off += assistantOffUnit(proposal?.[staffId]?.[d]);
            }
            return Math.round(off * 2) / 2;
        }
        function assistantRestAllows(proposal, staff, day, service, settings) {
            if (day <= 1 || service !== 'lunch') return true;
            const previous = proposal?.[staff.id]?.[day - 1];
            if (!previous?.s2) return true;
            const previousEnd =
                assistantTimeToDecimal(
                    settings.dinnerWorkEnd ||
                    settings.dinnerEnd
                );
            const currentStart =
                assistantTimeToDecimal(
                    settings.lunchWorkStart ||
                    settings.lunchStart
                );
            const rest = (24 - previousEnd) + currentStart;
            const legalProfile =
                assistantLegalProfileV142(
                    settings,
                    staff
                );
            const requiredRest =
                settings?.planningLegalEnforcement === false
                    ? Number(staff.minRestHours ?? 11)
                    : Math.max(
                        Number(staff.minRestHours ?? 11),
                        legalProfile.dailyRestMin
                    );
            return rest + 0.01 >= requiredRest;
        }
        function assistantCandidateScore(staff, state, dept, day, service, demand, settings, proposal) {
            const target = Math.max(1, Number(state.target || 0));
            const deficit = Number(state.target || 0) - Number(state.hours || 0);
            const criticalKitchen =
                dept === 'cuisine' &&
                settings?.kitchenCriticalCoverageEnabled !== false;
            // V133 : un poste cuisine critique ne doit pas être éliminé
            // uniquement parce que le collaborateur a atteint son objectif d'heures.
            // Les contraintes de disponibilité, repos et jours consécutifs restent bloquantes.
            if (deficit <= -2.5 && !criticalKitchen) return -99999;
            const dateObj = new Date(state.year, state.month - 1, day);
            if (
                !assistantIsServiceOpenV168(
                    dateObj,
                    service,
                    settings
                )
            ) {
                return -99999;
            }
            if (!assistantAvailabilityAllows(staff, dateObj, service)) return -99999;
            if (!assistantRestAllows(proposal, staff, day, service, settings)) return -99999;
            const consecutive = assistantCountConsecutiveDays(proposal, staff.id, day);
            const legalProfile =
                assistantLegalProfileV142(
                    settings,
                    staff
                );
            const maxConsecutive =
                Math.min(
                    6,
                    Number(staff.maxConsecutiveDays ?? 6),
                    Number(legalProfile.maxConsecutiveDays ?? 6)
                );
            // V146 : après 6 jours réellement travaillés, aucun 7e jour
            // de travail n'est généré automatiquement.
            if (consecutive >= maxConsecutive) return -99999;
            if (!assistantWeekQuotaAllows(proposal, staff.id, day, settings, state.year, state.month, service)) return -99999;
            const legalService =
                assistantLegalServiceAllowsV142(
                    proposal,
                    staff,
                    day,
                    service,
                    dept,
                    settings,
                    state.year,
                    state.month
                );
            if (!legalService.ok) return -99999;
            let score = (deficit / target) * 100;
            score += String(staff.dept || '') === dept ? 32 : 9;
            if (criticalKitchen) {
                // Priorité forte : mieux vaut signaler une éventuelle heure sup.
                // que produire un planning avec cuisine fermée involontairement.
                score += 260;
            }
            const rush = Number(demand?.score || 1);
            score += assistantSkillScore(staff) * (rush >= 1.5 ? 9 : 4);
            if (assistantProtectedWeekday(dateObj, settings)) score += 28;
            if (demand?.isPeak === true || rush >= Number(settings?.planningPeakProtectionMinScore || 1.5)) score += 36;
            if (service === 'dinner') score -= Number(state.evenings || 0) * 2.5;
            if (dateObj.getDay() === 5 || dateObj.getDay() === 6) score -= Number(state.weekends || 0) * 3;
            score -= consecutive * 2.3;
            if (settings.planningPreferConsecutiveOff !== false) {
                const prev = proposal?.[staff.id]?.[day - 1];
                const next = proposal?.[staff.id]?.[day + 1];
                const prevOff = prev && !isRhWorkStatus(prev.status) && !isRhLeaveStatus(prev.status);
                const nextOff = next && !isRhWorkStatus(next.status) && !isRhLeaveStatus(next.status);
                if (prevOff && nextOff) score -= 8;
                else if (prevOff || nextOff) score -= 4;
            }
            const cost = Number(staff.hourlyCost || 0);
            if (settings.planningPriority === 'cost') {
                score -= cost * 0.35;
            }
            if (settings.planningPriority === 'balanced') {
                score -= cost * 0.08;
            }
            if (settings.planningPriority === 'coverage') {
                score +=
                    assistantSkillScore(staff) * 3;
            }
            // V170 · Qualité prioritaire :
            // un Chef / collaborateur autonome peut légitimement coûter plus cher
            // qu'un Commis si le service a besoin de son niveau de responsabilité.
            if (settings.planningPriority === 'quality') {
                score +=
                    assistantSkillScore(staff) * 11;
                score -=
                    cost * 0.02;
            }
            const serviceLevel =
                String(
                    settings?.planningServiceLevel ||
                    'standard'
                );
            const qualityWeight = {
                standard: 0,
                reinforced: 1.8,
                premium: 4.2,
                excellence: 7.5
            }[serviceLevel] || 0;
            score +=
                assistantSkillScore(staff) *
                qualityWeight;
            /* V132 · choix du staff orienté activité.
               Jours forts : compétence + polyvalence.
               Jours calmes : polyvalence + maîtrise du coût.
               Les contraintes RH existantes restent prioritaires. */
            if (settings.optimizeStaffChoice !== false) {
                const polyvalence = Math.min(
                    6,
                    Array.isArray(staff.skills) ? staff.skills.filter(Boolean).length : 0
                );
                const skill = assistantSkillScore(staff);
                if (rush >= 1.35 || demand?.isPeak === true) {
                    score += skill * 7;
                    score += polyvalence * 2.6;
                    score -= cost * 0.025;
                } else if (rush <= 0.95) {
                    score += polyvalence * 3.2;
                    score += skill * 2;
                    score -= cost * 0.14;
                } else {
                    score += polyvalence * 2.2;
                    score += skill * 3.5;
                    score -= cost * 0.06;
                }
            }
            if (rush <= 0.75 && Number(staff.recoveryBalance || 0) > 0) {
                score -= Math.min(12, Number(staff.recoveryBalance || 0) * 0.25);
            }
            return score;
        }
        function assistantCurrentMonthData(monthStr) {
            return getTs()?.[monthStr] || {};
        }
        function assistantStaffDayPlan(tsMonth, staffId, day) {
            return tsMonth?.[staffId]?.[day] || tsMonth?.[String(staffId)]?.[day] || null;
        }
        function assistantDayIsWorked(plan) {
            return Boolean(plan && isRhWorkStatus(plan.status) && (plan.s1 || plan.s2));
        }
        function assistantWorkStreakAroundDay(tsMonth, staffId, day, daysInMonth) {
            if (!assistantDayIsWorked(assistantStaffDayPlan(tsMonth, staffId, day))) return 0;
            let start = day;
            let end = day;
            while (start > 1 && assistantDayIsWorked(assistantStaffDayPlan(tsMonth, staffId, start - 1))) start--;
            while (end < daysInMonth && assistantDayIsWorked(assistantStaffDayPlan(tsMonth, staffId, end + 1))) end++;
            return end - start + 1;
        }
        function assistantDayOffCoverageSafe(staff, day, monthStr, demand, settings, tsMonth) {
            const plan = assistantStaffDayPlan(tsMonth, staff.id, day);
            if (!assistantDayIsWorked(plan)) return false;
            const dept = String(plan.poste || staff.dept || 'salle').toLowerCase();
            const eligible = getDir().filter(s => s.active !== false && assistantStaffCanCoverDept(s, dept));
            if (!eligible.length) return false;
            const required = assistantRequiredCount(dept, demand?.[day], settings, eligible.length);
            const services = [];
            if (plan.s1) services.push('lunch');
            if (plan.s2) services.push('dinner');
            return services.every(service => {
                const currentCoverage = eligible.filter(other => {
                    const otherPlan = assistantStaffDayPlan(tsMonth, other.id, day);
                    return assistantDayWorksService(otherPlan, service);
                }).length;
                return (currentCoverage - 1) >= required;
            });
        }
        function buildAssistantDayOffSuggestions() {
            const monthStr = getPlanningAssistantMonth();
            const [year, month] = monthStr.split('-').map(Number);
            const daysInMonth = new Date(year, month, 0).getDate();
            const settings = saveRhPlanningSettings(true);
            const tsMonth = assistantCurrentMonthData(monthStr);
            const demand = buildAssistantDemand(monthStr, planningAssistantPrediction, settings);
            const peakDays = assistantPeakDaySet(demand, settings);
            const now = new Date();
            const isCurrentMonth = now.getFullYear() === year && now.getMonth() + 1 === month;
            const suggestions = [];
            getDir().filter(s => s.active !== false).forEach(staff => {
                const staffMonth = tsMonth?.[staff.id] || tsMonth?.[String(staff.id)] || {};
                const stats = getStaffMonthStats(staff.id, year, month, daysInMonth, staffMonth) || {};
                const planned = Number(stats.totalDone || 0);
                const target = Number(stats.adjustedTarget || stats.expected || 0);
                const monthlyExcess = planned - target;
                const maxConsecutive = Math.max(1, Number(staff.maxConsecutiveDays ?? 6));
                const candidates = [];
                for (let day = 1; day <= daysInMonth; day++) {
                    if (isCurrentMonth && day <= now.getDate()) continue;
                    const dateObj = new Date(year, month - 1, day);
                    const plan = assistantStaffDayPlan(tsMonth, staff.id, day);
                    if (!assistantDayIsWorked(plan)) continue;
                    if (assistantRequestForDate(staff, dateObj)) continue;
                    if (assistantDateBlocksPlannableLeave(dateObj, demand?.[day], settings, peakDays)) continue;
                    if (!assistantDayOffCoverageSafe(staff, day, monthStr, demand, settings, tsMonth)) continue;
                    const dayHours = Number(calculateNet(plan) || 0);
                    if (dayHours <= 0) continue;
                    const streak = assistantWorkStreakAroundDay(tsMonth, staff.id, day, daysInMonth);
                    const demandScore = Number(demand?.[day]?.score || 1);
                    const afterOffDelta = monthlyExcess - dayHours;
                    const contractSafe = afterOffDelta >= -1.0;
                    const restPriority = streak >= maxConsecutive || streak >= 5;
                    // iCHEF ne propose pas un OFF qui crée volontairement un manque important d'heures,
                    // sauf si le repos est nécessaire après une longue séquence de travail.
                    if (!contractSafe && !restPriority) continue;
                    if (demandScore > 1.15 && !restPriority) continue;
                    let score = 0;
                    const reasons = [];
                    if (demandScore <= 0.75) {
                        score += 40;
                        reasons.push('activité faible');
                    } else if (demandScore <= 1.0) {
                        score += 22;
                        reasons.push('activité modérée');
                    }
                    if (monthlyExcess >= dayHours) {
                        score += 34;
                        reasons.push(`${monthlyExcess.toFixed(1)} h au-dessus de l’objectif`);
                    } else if (monthlyExcess > 1) {
                        score += 16;
                        reasons.push('planning au-dessus de l’objectif');
                    }
                    if (streak >= maxConsecutive) {
                        score += 45;
                        reasons.push(`${streak} jours travaillés consécutifs`);
                    } else if (streak >= 5) {
                        score += 25;
                        reasons.push(`${streak} jours consécutifs`);
                    }
                    if (Number(staff.recoveryBalance || 0) >= dayHours) {
                        score += 8;
                        reasons.push('solde récupération disponible');
                    }
                    score += Math.max(0, (1.15 - demandScore) * 10);
                    candidates.push({
                        id: `${staff.id}_${day}`,
                        staffId: staff.id,
                        staffName: staff.name || 'Collaborateur',
                        dept: plan.poste || staff.dept || '',
                        day,
                        date: `${monthStr}-${String(day).padStart(2, '0')}`,
                        dayHours,
                        demandScore,
                        streak,
                        monthlyExcess,
                        score,
                        reason: reasons.join(' · ') || 'journée compatible avec un repos',
                        demandReason: demand?.[day]?.reason || 'Activité standard'
                    });
                }
                candidates.sort((a, b) => b.score - a.score);
                // Maximum deux propositions par collaborateur pour garder une liste utile.
                suggestions.push(...candidates.slice(0, 2));
            });
            return suggestions
                .sort((a, b) => b.score - a.score)
                .slice(0, 16);
        }
        function assistantDayOffConfidence(score) {
            if (score >= 70) return { label: 'PRIORITAIRE', cls: 'high' };
            if (score >= 45) return { label: 'RECOMMANDÉ', cls: 'medium' };
            return { label: 'POSSIBLE', cls: 'low' };
        }
        function renderAssistantDayOffSuggestions() {
            const list = document.getElementById('assistant-day-off-list');
            const summary = document.getElementById('assistant-day-off-summary');
            if (!list || !summary) return;
            const monthStr = getPlanningAssistantMonth();
            if (!assistantDayOffSuggestions.length) {
                summary.innerText = `Aucun jour off pertinent détecté pour ${monthLabelFr(monthStr)} sans dégrader la couverture ou l’équilibre contractuel.`;
                list.innerHTML = '';
                return;
            }
            const uniqueStaff = new Set(assistantDayOffSuggestions.map(x => String(x.staffId))).size;
            summary.innerText = `${assistantDayOffSuggestions.length} proposition(s) pour ${uniqueStaff} collaborateur(s). La Direction reste décisionnaire.`;
            list.innerHTML = assistantDayOffSuggestions.map(item => {
                const confidence = assistantDayOffConfidence(item.score);
                const dateLabel = new Date(`${item.date}T12:00:00`).toLocaleDateString('fr-FR', {
                    weekday: 'long', day: '2-digit', month: '2-digit'
                });
                const badgeBg = confidence.cls === 'high' ? '#5a3f19' : confidence.cls === 'medium' ? '#273b42' : '#252a2d';
                const badgeColor = confidence.cls === 'high' ? '#f0cd83' : confidence.cls === 'medium' ? '#b9d2dc' : '#b7bec2';
                return `
                    <div style="display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;background:#0d1012;border:1px solid #293036;border-radius:9px;padding:11px 12px;">
                        <div style="min-width:0;">
                            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                                <strong style="color:#f2f4f5;font-size:.78rem;">${escapeRhHtml(item.staffName)}</strong>
                                <span style="background:${badgeBg};color:${badgeColor};border-radius:999px;padding:3px 7px;font-size:.58rem;font-weight:900;letter-spacing:.5px;">${confidence.label}</span>
                            </div>
                            <div style="color:#e6c47a;font-size:.74rem;font-weight:800;margin-top:4px;text-transform:capitalize;">${escapeRhHtml(dateLabel)} · ${item.dayHours.toFixed(1)} h</div>
                            <div style="color:#8f999e;font-size:.66rem;line-height:1.45;margin-top:4px;">${escapeRhHtml(item.reason)} · ${escapeRhHtml(item.demandReason)}</div>
                        </div>
                        <button class="btn-outline" style="border-color:#58656c;color:#eef1f2;padding:8px 10px;font-size:.62rem;" onclick="applyAssistantDayOffSuggestion('${String(item.id).replace(/'/g, "\\'")}')">APPLIQUER OFF</button>
                    </div>
                `;
            }).join('');
        }
        async function generateAssistantDayOffSuggestions(silent = false) {
            const btn = document.getElementById('assistant-off-btn');
            if (btn && !silent) {
                btn.disabled = true;
                btn.innerText = 'ANALYSE OFF...';
                btn.style.opacity = '.65';
            }
            try {
                saveRhPlanningSettings(true);
                if (!planningAssistantPrediction) {
                    await generateIAPrediction(true);
                }
                assistantDayOffSuggestions = buildAssistantDayOffSuggestions();
                renderAssistantDayOffSuggestions();
                if (!silent && typeof showToast === 'function') {
                    showToast(
                        assistantDayOffSuggestions.length
                            ? `${assistantDayOffSuggestions.length} jour(s) off proposé(s)`
                            : 'Aucun jour off pertinent détecté'
                    );
                }
                return assistantDayOffSuggestions;
            } catch (error) {
                console.error('Erreur recommandations jours off :', error);
                if (!silent) alert(error?.message || 'Impossible de calculer les jours off.');
                return [];
            } finally {
                if (btn && !silent) {
                    btn.disabled = false;
                    btn.innerText = 'IA · PROPOSER JOURS OFF';
                    btn.style.opacity = '1';
                }
            }
        }
        function applyAssistantDayOffSuggestion(id) {
            const suggestion = assistantDayOffSuggestions.find(x => String(x.id) === String(id));
            if (!suggestion) return;
            const settings = getRhSettings();
            if (settings.planningStatus === 'locked') {
                alert('Le planning est clôturé / verrouillé. Passez-le en Brouillon avant toute modification.');
                return;
            }
            const monthStr = getPlanningAssistantMonth();
            const ts = getTs();
            const tsMonth = ts?.[monthStr] || {};
            const staff = getDir().find(s => String(s.id) === String(suggestion.staffId));
            if (!staff) return;
            const demand = buildAssistantDemand(monthStr, planningAssistantPrediction, settings);
            if (!assistantDayOffCoverageSafe(staff, suggestion.day, monthStr, demand, settings, tsMonth)) {
                alert('La couverture a changé depuis l’analyse. iCHEF ne recommande plus ce jour off. Actualisez les propositions.');
                generateAssistantDayOffSuggestions(true);
                return;
            }
            const current = assistantStaffDayPlan(tsMonth, staff.id, suggestion.day);
            if (!current || !assistantDayIsWorked(current)) {
                alert('Ce jour a déjà été modifié. Actualisez les propositions.');
                generateAssistantDayOffSuggestions(true);
                return;
            }
            const dateLabel = new Date(`${suggestion.date}T12:00:00`).toLocaleDateString('fr-FR', { weekday:'long', day:'2-digit', month:'2-digit' });
            if (!confirm(`Appliquer un JOUR OFF à ${staff.name} le ${dateLabel} ?\n\nMotif iCHEF : ${suggestion.reason}\n\nCette action modifie le planning officiel.`)) return;
            if (!ts[monthStr]) ts[monthStr] = {};
            if (!ts[monthStr][staff.id] && !ts[monthStr][String(staff.id)]) ts[monthStr][staff.id] = {};
            const staffNode = ts[monthStr][staff.id] || ts[monthStr][String(staff.id)];
            staffNode[suggestion.day] = {
                ...current,
                status: 'off',
                s1: '',
                s2: '',
                pause: 0,
                obs: `iCHEF IA · Jour off validé Direction · ${suggestion.reason}`
            };
            saveTs(ts);
            recordRhChange({
                type: 'AI_DAY_OFF_APPLIED',
                month: monthStr,
                staffId: staff.id,
                staffName: staff.name,
                day: suggestion.day,
                reason: suggestion.reason,
                source: 'ASSISTANCE_PLANNING'
            });
            loadMonthData();
            refreshViews();
            renderPlanningAssistantLocal();
            assistantDayOffSuggestions = buildAssistantDayOffSuggestions();
            renderAssistantDayOffSuggestions();
            if (typeof broadcastStaffingLevels === 'function') broadcastStaffingLevels();
            if (typeof showToast === 'function') showToast(`Jour off appliqué · ${staff.name}`);
        }
        function assistantResolveRestaurantClosures(
            settings,
            existingMonth,
            staffList,
            year,
            month
        ) {
            // V137 :
            // Une fermeture n'est plus déduite automatiquement depuis
            // un planning incomplet. Seuls les jours réellement choisis
            // dans Paramètres de planification sont considérés fermés.
            const explicitWeekdays =
                Array.isArray(settings?.planningClosedWeekdays)
                    ? settings.planningClosedWeekdays
                        .map(Number)
                        .filter(v =>
                            Number.isInteger(v) &&
                            v >= 0 &&
                            v <= 6
                        )
                    : [];
            return {
                explicitWeekdays,
                inferredWeekdays: [],
                source:
                    explicitWeekdays.length
                        ? 'settings'
                        : 'none'
            };
        }
        function assistantPlanningHorizon(monthStr) {
            const now = new Date();
            const currentMonth =
                `${now.getFullYear()}-${String(
                    now.getMonth() + 1
                ).padStart(2, '0')}`;
            const selected =
                String(monthStr || '');
            // Mois passé = historique uniquement.
            if (selected < currentMonth) {
                return {
                    mode: 'history',
                    startDay: 999,
                    currentMonth
                };
            }
            // Mois courant = aujourd'hui -> fin du mois.
            if (selected === currentMonth) {
                return {
                    mode: 'current',
                    startDay: now.getDate(),
                    currentMonth
                };
            }
            // Mois futur = depuis le 1er.
            return {
                mode: 'future',
                startDay: 1,
                currentMonth
            };
        }
        function assistantEnforceServiceWeekdaysV168(
            proposal,
            staffList,
            monthStr,
            settings
        ) {
            const [year, month] =
                String(monthStr)
                    .split('-')
                    .map(Number);
            const daysInMonth =
                new Date(
                    year,
                    month,
                    0
                ).getDate();
            const horizon =
                assistantPlanningHorizon(
                    monthStr
                );
            let corrected = 0;
            for (
                let day = 1;
                day <= daysInMonth;
                day++
            ) {
                if (
                    day <
                    horizon.startDay
                ) {
                    continue;
                }
                const dateObj =
                    new Date(
                        year,
                        month - 1,
                        day
                    );
                const lunchOpen =
                    assistantIsServiceOpenV168(
                        dateObj,
                        'lunch',
                        settings
                    );
                const dinnerOpen =
                    assistantIsServiceOpenV168(
                        dateObj,
                        'dinner',
                        settings
                    );
                (staffList || [])
                    .forEach(staff => {
                        const node =
                            proposal?.[staff.id] ||
                            proposal?.[
                                String(staff.id)
                            ];
                        const plan =
                            node?.[day];
                        if (!plan) return;
                        let changed = false;
                        if (!lunchOpen && plan.s1) {
                            plan.s1 = '';
                            changed = true;
                        }
                        if (!dinnerOpen && plan.s2) {
                            plan.s2 = '';
                            changed = true;
                        }
                        if (!changed) return;
                        corrected++;
                        plan.pause = 0;
                        if (
                            isRhLeaveStatus(
                                plan.status
                            )
                        ) {
                            plan.__protected = true;
                            return;
                        }
                        if (plan.s1 && plan.s2) {
                            plan.status = 'present';
                            plan.pause =
                                Number(
                                    settings.fullDayPause ||
                                    0
                                );
                        } else if (plan.s1) {
                            plan.status = 'off_soir';
                        } else if (plan.s2) {
                            plan.status = 'off_matin';
                        } else {
                            plan.status = 'off';
                        }
                        plan.obs =
                            'Service fermé selon les paramètres hebdomadaires';
                        plan.__serviceWeekdayProtected =
                            true;
                    });
            }
            return corrected;
        }
        function assistantForceRestaurantClosures(
            proposal,
            staffList,
            monthStr,
            settings
        ) {
            const [year, month] =
                String(monthStr)
                    .split('-')
                    .map(Number);
            const daysInMonth =
                new Date(year, month, 0).getDate();
            const horizon =
                assistantPlanningHorizon(monthStr);
            let correctedCells = 0;
            for (let day = 1; day <= daysInMonth; day++) {
                // V137 : le passé est figé.
                if (day < horizon.startDay) continue;
                const dateObj =
                    new Date(year, month - 1, day);
                if (
                    !assistantIsRestaurantClosed(
                        dateObj,
                        settings
                    )
                ) {
                    continue;
                }
                (staffList || []).forEach(staff => {
                    const node =
                        proposal?.[staff.id] ||
                        proposal?.[String(staff.id)];
                    if (!node) return;
                    const current = node[day];
                    // Congé / absence RH conservé mais sans heures de travail.
                    if (
                        current &&
                        isRhLeaveStatus(current.status)
                    ) {
                        current.s1 = '';
                        current.s2 = '';
                        current.pause = 0;
                        current.__restaurantClosed = true;
                        current.__protected = true;
                        return;
                    }
                    const wasWorking =
                        assistantDayWorksService(
                            current,
                            'lunch'
                        ) ||
                        assistantDayWorksService(
                            current,
                            'dinner'
                        );
                    if (wasWorking) {
                        correctedCells++;
                    }
                    node[day] = {
                        ...(current || {}),
                        status: 'off',
                        poste:
                            current?.poste ||
                            staff.dept ||
                            'salle',
                        s1: '',
                        s2: '',
                        pause: 0,
                        obs: 'Établissement fermé',
                        __restaurantClosed: true,
                        __protected: true
                    };
                });
            }
            return correctedCells;
        }
        function assistantUncoveredOpenServices(
            uncovered,
            monthStr,
            settings
        ) {
            const [year, month] =
                String(monthStr)
                    .split('-')
                    .map(Number);
            return (uncovered || []).filter(line => {
                const match =
                    String(line || '')
                        .match(
                            /^(\d{2})\/(\d{2})/
                        );
                if (!match) return true;
                const day =
                    Number(match[1]);
                const lineMonth =
                    Number(match[2]);
                if (
                    !day ||
                    lineMonth !== month
                ) {
                    return true;
                }
                const dateObj =
                    new Date(
                        year,
                        month - 1,
                        day
                    );
                if (
                    assistantIsRestaurantClosed(
                        dateObj,
                        settings
                    )
                ) {
                    return false;
                }
                const upper =
                    String(line || '')
                        .toUpperCase();
                const service =
                    upper.includes('· MIDI')
                        ? 'lunch'
                        : (
                            upper.includes('· SOIR')
                                ? 'dinner'
                                : ''
                          );
                if (
                    service &&
                    !assistantIsServiceOpenV168(
                        dateObj,
                        service,
                        settings
                    )
                ) {
                    return false;
                }
                return true;
            });
        }
        function buildAutomaticPlanningDraft() {
            const monthStr = getPlanningAssistantMonth();
            const [year, month] = monthStr.split('-').map(Number);
            const daysInMonth = new Date(year, month, 0).getDate();
            let settings = saveRhPlanningSettings(true);
            const currentTs = getTs();
            const existingMonth = currentTs[monthStr] || {};
            const staffList = getDir().filter(s => s.active !== false);
            // V137 : fermeture = uniquement les jours configurés.
            // Aucun jour fermé n'est déduit d'un planning incomplet.
            const closureResolution = assistantResolveRestaurantClosures(
                settings,
                existingMonth,
                staffList,
                year,
                month
            );
            const demand = buildAssistantDemand(
                monthStr,
                planningAssistantPrediction,
                settings
            );
            const peakDays = assistantPeakDaySet(demand, settings);
            const proposal = {};
            const states = {};
            const warnings = [];
            const uncovered = [];
            const now = new Date();
            const isCurrentMonth =
                now.getFullYear() === year &&
                now.getMonth() + 1 === month;
            const planningHorizon =
                assistantPlanningHorizon(monthStr);
            staffList.forEach(staff => {
                proposal[staff.id] = {};
                const weekly =
                    assistantLegalWeeklyReferenceV142(
                        settings,
                        staff
                    );
                const expected = weekly * 52 / 12;
                const dailyReference = weekly > 0 ? weekly / 5 : 0;
                let absenceDays = 0;
                for (let day = 1; day <= daysInMonth; day++) {
                    const dateObj = new Date(year, month - 1, day);
                    const existing = existingMonth?.[staff.id]?.[day] || existingMonth?.[String(staff.id)]?.[day] || null;
                    const approvedRequest =
                        assistantRequestForDate(
                            staff,
                            dateObj
                        );
                    const isPast =
                        day < planningHorizon.startDay;
                    // V137 : tout ce qui est avant aujourd'hui reste
                    // exactement comme dans le planning officiel.
                    if (isPast) {
                        proposal[staff.id][day] = {
                            ...(existing
                                ? assistantClone(existing)
                                : {
                                    status: 'history',
                                    poste:
                                        staff.dept ||
                                        'salle',
                                    s1: '',
                                    s2: '',
                                    pause: 0,
                                    obs:
                                        'Jour passé · non recalculé'
                                }),
                            __protected: true,
                            __history: true
                        };
                        continue;
                    }
                    if (approvedRequest) {
                        const status = assistantRequestTypeToStatus(approvedRequest.type || approvedRequest.requestType);
                        proposal[staff.id][day] = {
                            status,
                            poste: staff.dept || 'salle',
                            s1: '',
                            s2: '',
                            pause: 0,
                            obs: `Demande acceptée : ${rhRequestTypeLabel(approvedRequest.type)}`,
                            __protected: true
                        };
                        if (isRhLeaveStatus(status)) absenceDays++;
                        if (assistantDateBlocksPlannableLeave(dateObj, demand?.[day], settings, peakDays)) {
                            warnings.push(`${staff.name} · ${String(day).padStart(2,'0')}/${String(month).padStart(2,'0')} : congé/absence déjà validé sur une période protégée ou de forte affluence — conservé, prévoir le remplacement.`);
                        }
                        continue;
                    }
                    const restaurantClosed =
                        assistantIsRestaurantClosed(dateObj, settings);
                    if (
                        restaurantClosed &&
                        !(settings.preservePastDays && isPast)
                    ) {
                        proposal[staff.id][day] = {
                            status: 'off',
                            poste: staff.dept || 'salle',
                            s1: '',
                            s2: '',
                            pause: 0,
                            obs: 'Établissement fermé',
                            __restaurantClosed: true,
                            __protected: true
                        };
                        continue;
                    }
                    if (existing && assistantExistingDayIsProtected(existing, settings.preserveExistingPlanning)) {
                        proposal[staff.id][day] = {
                            ...assistantClone(existing),
                            __protected: true
                        };
                        if (isRhLeaveStatus(existing.status)) absenceDays++;
                        continue;
                    }
                    proposal[staff.id][day] = {
                        status: 'off',
                        poste: staff.dept || 'salle',
                        s1: '',
                        s2: '',
                        pause: 0,
                        obs: '',
                        __protected: false
                    };
                }
                const fixedHours = Object.values(proposal[staff.id]).reduce((sum, p) => sum + calculateNet(p), 0);
                // V115 : si le mois courant est déjà commencé et que les jours passés
                // sont protégés, on ne réclame plus artificiellement tout le contrat mensuel
                // sur les quelques jours restants. On conserve les heures déjà réalisées
                // et on ajoute seulement l'objectif contractuel de la période restante.
                let target = Math.max(0, expected - absenceDays * dailyReference);
                if (isCurrentMonth && settings.preservePastDays) {
                    const firstPlannableDay = Math.max(1, now.getDate());
                    const remainingCalendarDays = Math.max(0, daysInMonth - firstPlannableDay + 1);
                    const remainingContractHours = weekly > 0 ? weekly * (remainingCalendarDays / 7) : 0;
                    target = Math.max(fixedHours, fixedHours + remainingContractHours);
                }
                states[staff.id] = {
                    year,
                    month,
                    target,
                    hours: fixedHours,
                    dailyReference,
                    absenceDays,
                    recoveryDays: 0,
                    evenings: Object.values(proposal[staff.id]).filter(p => Boolean(p.s2)).length,
                    weekends: 0
                };
            });
            // Récupération : uniquement si le client l'autorise et si la banque permet
            // un jour complet. Les jours les plus calmes sont choisis en priorité.
            if (settings.planningAutoRecovery !== false) {
                const lowDemandDays = Object.values(demand).sort((a,b) => a.score - b.score);
                staffList.forEach(staff => {
                    const state = states[staff.id];
                    const dailyRef = Math.max(0, Number(state?.dailyReference || 0));
                    if (dailyRef <= 0) return;
                    const bank = Math.max(0, Number(staff.recoveryBalance || 0));
                    let toPlace = Math.min(
                        Math.max(0, Number(settings.planningMaxRecoveryDaysPerMonth || 0)),
                        Math.floor(bank / dailyRef)
                    );
                    if (!toPlace) return;
                    for (const row of lowDemandDays) {
                        if (!toPlace) break;
                        const day = Number(row.day);
                        if (demand?.[day]?.closed === true) continue;
                        const p = proposal?.[staff.id]?.[day];
                        if (!p || p.__protected || isRhWorkStatus(p.status) || isRhLeaveStatus(p.status)) continue;
                        const dateObj = new Date(year, month - 1, day);
                        if (isCurrentMonth && day < now.getDate()) continue;
                        if (assistantDateBlocksPlannableLeave(dateObj, demand?.[day], settings, peakDays)) continue;
                        p.status = 'recup';
                        p.s1 = ''; p.s2 = ''; p.pause = 0;
                        p.obs = `iCHEF IA · récupération planifiée · ${dailyRef.toFixed(1)} h`;
                        p.__protected = true;
                        state.target = Math.max(0, Number(state.target || 0) - dailyRef);
                        state.recoveryDays = Number(state.recoveryDays || 0) + 1;
                        toPlace--;
                    }
                });
            }
            staffList.forEach(staff => {
                for (let day = 1; day <= daysInMonth; day++) {
                    const dateObj = new Date(year, month - 1, day);
                    if ((dateObj.getDay() === 5 || dateObj.getDay() === 6) && isRhWorkStatus(proposal[staff.id][day]?.status)) {
                        states[staff.id].weekends++;
                    }
                }
            });
            const departments =
                assistantPlanningDepartmentsV169(
                    settings,
                    staffList
                );
            for (let day = 1; day <= daysInMonth; day++) {
                // V115 : le moteur ne tente pas de reconstruire les jours déjà passés.
                if (day < planningHorizon.startDay) continue;
                // V135 : fermeture établissement = aucune couverture à générer.
                if (demand?.[day]?.closed === true) continue;
                for (const service of ['lunch', 'dinner']) {
                    const serviceDate =
                        new Date(
                            year,
                            month - 1,
                            day
                        );
                    if (
                        !assistantIsServiceOpenV168(
                            serviceDate,
                            service,
                            settings
                        )
                    ) {
                        continue;
                    }
                    for (const dept of departments) {
                        const eligible = staffList.filter(staff => assistantStaffCanCoverDept(staff, dept));
                        if (!eligible.length) continue;
                        const required = assistantRequiredCount(dept, demand[day], settings, eligible.length);
                        let covered = eligible.filter(staff => assistantDayWorksService(proposal[staff.id][day], service)).length;
                        while (covered < required) {
                            const candidates = eligible
                                .filter(staff => {
                                    const p = proposal[staff.id][day];
                                    return p && !p.__protected && !assistantDayWorksService(p, service);
                                })
                                .map(staff => ({
                                    staff,
                                    score: assistantCandidateScore(
                                        staff,
                                        states[staff.id],
                                        dept,
                                        day,
                                        service,
                                        demand[day],
                                        settings,
                                        proposal
                                    )
                                }))
                                .filter(x => x.score > -90000)
                                .sort((a, b) => b.score - a.score);
                            if (!candidates.length) {
                                uncovered.push(`${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')} · ${dept.toUpperCase()} · ${service === 'lunch' ? 'MIDI' : 'SOIR'} : ${covered}/${required}`);
                                break;
                            }
                            const chosen = candidates[0].staff;
                            const p = proposal[chosen.id][day];
                            const delta = assistantSetService(
                                p,
                                service,
                                dept,
                                settings,
                                `IA AUTO · ${demand[day].reason}`
                            );
                            states[chosen.id].hours += delta;
                            if (service === 'dinner') states[chosen.id].evenings++;
                            const dateObj = new Date(year, month - 1, day);
                            if (dateObj.getDay() === 5 || dateObj.getDay() === 6) states[chosen.id].weekends++;
                            covered++;
                        }
                    }
                }
            }
            const demandDays = Object.values(demand).sort((a, b) => b.score - a.score);
            staffList.forEach(staff => {
                const state = states[staff.id];
                // V169 · les métiers hôteliers hors F&B ne sont jamais
                // transformés artificiellement en shifts MIDI / SOIR.
                // Ils restent gérés par leurs horaires saisis / contrats
                // jusqu'à configuration d'un cycle hôtelier dédié.
                const staffDept =
                    String(staff.dept || '');
                const mealPlanningDepartments =
                    assistantPlanningDepartmentsV169(
                        settings,
                        staffList
                    );
                if (
                    staffDept &&
                    !mealPlanningDepartments.some(dept =>
                        assistantStaffCanCoverDept(
                            staff,
                            dept
                        )
                    )
                ) {
                    return;
                }
                let guard = 0;
                while (state.hours < state.target - 2.5 && guard < 80) {
                    guard++;
                    let assigned = false;
                    for (const demandDay of demandDays) {
                        const day = demandDay.day;
                        if (day < planningHorizon.startDay) continue;
                        if (demandDay?.closed === true) continue;
                        const p = proposal[staff.id][day];
                        if (!p || p.__protected || isRhLeaveStatus(p.status)) continue;
                        const dateObj = new Date(year, month - 1, day);
                        const remaining = state.target - state.hours;
                        const services = remaining >= 7 ? ['lunch', 'dinner'] : ['lunch', 'dinner'];
                        for (const service of services) {
                            if (
                                !assistantIsServiceOpenV168(
                                    dateObj,
                                    service,
                                    settings
                                )
                            ) {
                                continue;
                            }
                            if (assistantDayWorksService(p, service)) continue;
                            if (!assistantAvailabilityAllows(staff, dateObj, service)) continue;
                            if (!assistantRestAllows(proposal, staff, day, service, settings)) continue;
                            if (
                                assistantCountConsecutiveDays(
                                    proposal,
                                    staff.id,
                                    day
                                ) >= 6
                            ) continue;
                            if (!assistantWeekQuotaAllows(proposal, staff.id, day, settings, year, month, service)) continue;
                            const delta = assistantSetService(
                                p,
                                service,
                                staff.dept || 'salle',
                                settings,
                                `IA AUTO · équilibre contrat`
                            );
                            if (delta <= 0) continue;
                            state.hours += delta;
                            if (service === 'dinner') state.evenings++;
                            assigned = true;
                            break;
                        }
                        if (assigned) break;
                    }
                    if (!assigned) break;
                }
            });
            // V136 · garde-fou final :
            // même si un ancien planning protégé, une règle d'équilibrage
            // ou un autre moteur a tenté d'ajouter un service,
            // un jour fermé reste toujours à 0 staff.
            const correctedClosedCells =
                assistantForceRestaurantClosures(
                    proposal,
                    staffList,
                    monthStr,
                    settings
                );
            const correctedServiceCells =
                assistantEnforceServiceWeekdaysV168(
                    proposal,
                    staffList,
                    monthStr,
                    settings
                );
            const forcedSixDayOff =
                assistantEnforceSixDayOffV146(
                    proposal,
                    staffList,
                    monthStr,
                    settings
                );
            const uncoveredOpen =
                assistantUncoveredOpenServices(
                    uncovered,
                    monthStr,
                    settings
                );
            if (forcedSixDayOff.length > 0) {
                forcedSixDayOff.forEach(item => {
                    warnings.unshift(
                        `OFF AUTOMATIQUE · ${item.staffName} · ${String(item.day).padStart(2,'0')}/${String(month).padStart(2,'0')} · 6 jours travaillés consécutifs atteints.`
                    );
                });
            }
            if (correctedClosedCells > 0) {
                warnings.push(
                    `${correctedClosedCells} affectation(s) supprimée(s) automatiquement car l’établissement est fermé.`
                );
            }
            let totalTarget = 0;
            let totalPlanned = 0;
            let estimatedCost = 0;
            let staffBalanced = 0;
            staffList.forEach(staff => {
                const state = states[staff.id];
                state.hours = Object.values(proposal[staff.id]).reduce((sum, p) => sum + calculateNet(p), 0);
                const delta = state.hours - state.target;
                totalTarget += state.target;
                totalPlanned += state.hours;
                estimatedCost += state.hours * Number(staff.hourlyCost || 0);
                if (Math.abs(delta) <= 4.8) staffBalanced++;
                else if (delta < -4.8) warnings.push(`${staff.name} : ${Math.abs(delta).toFixed(1)} h restent à planifier.`);
                else warnings.push(`${staff.name} : ${delta.toFixed(1)} h au-dessus de l'objectif ajusté.`);
            });
            if (uncoveredOpen.length) {
                warnings.push(`${uncoveredOpen.length} service(s) restent sous le niveau de couverture calculé.`);
            }
            const criticalIssues = assistantCriticalKitchenIssues(
                proposal,
                staffList,
                monthStr,
                settings
            );
            criticalIssues.forEach(issue => {
                warnings.unshift(`BLOQUANT · ${issue.message}`);
            });
            const plannableDaysCount =
                Object.values(demand || {}).filter(row => {
                    if (!row || row.closed === true) return false;
                    if (
                        Number(row.day) <
                        planningHorizon.startDay
                    ) {
                        return false;
                    }
                    return true;
                }).length;
            const totalRequiredChecks =
                plannableDaysCount *
                2 *
                departments.filter(
                    dept => staffList.some(
                        s => assistantStaffCanCoverDept(s, dept)
                    )
                ).length;
            const coveragePct = totalRequiredChecks > 0
                ? Math.max(
                    0,
                    Math.round(
                        (
                            1 -
                            uncoveredOpen.length /
                            totalRequiredChecks
                        ) * 100
                    )
                )
                : 100;
            const legalAudit =
                assistantLegalAuditDraftV142(
                    {
                        month: monthStr,
                        proposal,
                        states,
                        demand
                    },
                    staffList,
                    settings
                );
            legalAudit.blockers
                .slice()
                .reverse()
                .forEach(message => {
                    warnings.unshift(
                        `JURIDIQUE BLOQUANT · ${message}`
                    );
                });
            legalAudit.warnings
                .forEach(message => {
                    warnings.push(
                        `JURIDIQUE · ${message}`
                    );
                });
            return {
                month: monthStr,
                createdAt: Date.now(),
                proposal,
                states,
                demand,
                warnings,
                uncovered: uncoveredOpen,
                criticalIssues,
                legalIssues: legalAudit.blockers,
                legalWarnings: legalAudit.warnings,
                forcedLegalOff: forcedSixDayOff,
                legalProfile: {
                    country:
                        assistantLegalCountryV142(settings),
                    framework:
                        assistantLegalProfileV142(
                            settings,
                            staffList[0] || {}
                        ).framework,
                    establishmentType:
                        settings.planningLegalEstablishmentType,
                    referenceDate:
                        settings.planningLegalReferenceDate
                },
                metrics: {
                    totalTarget,
                    totalPlanned,
                    estimatedCost,
                    coveragePct,
                    staffBalanced,
                    staffCount: staffList.length
                }
            };
        }
        function assistantCategoryIdV223(p) {
            if (!p) return 'off';
            if (p.__restaurantClosed === true || p.obs === 'Établissement fermé') return 'off';
            if (p.status === 'history') return 'history';

            const explicit = String(p.categoryId || '').trim();
            if (explicit && window.iChefPlanningCategoryByIdV202?.(explicit)) {
                return explicit;
            }

            const status = String(p.status || '').trim();

            // Même lecture que la matrice principale :
            // travail complet / matin / soir sont déterminés par les services.
            if (status === 'present' || (!status && (p.s1 || p.s2))) {
                if (p.s1 && p.s2) return 'present';
                if (p.s1) return 'off_soir';
                if (p.s2) return 'off_matin';
                return 'present';
            }

            if (status === 'off' && (p.s1 || p.s2)) {
                if (p.s1 && p.s2) return 'present';
                if (p.s1) return 'off_soir';
                if (p.s2) return 'off_matin';
            }

            const direct = window.iChefPlanningCategoryByIdV202?.(status);
            if (direct) return direct.id;

            // Compatibilité avec quelques anciens statuts.
            if (status === 'absence' || status === 'absent') return 'absence_autorisee';
            if (status === 'cp' || status === 'vacation') return 'conge';

            return status || 'off';
        }

        function assistantCategoryMetaV223(p) {
            const id = assistantCategoryIdV223(p);
            const exact = window.iChefPlanningCategoryByIdV202?.(id);
            if (exact) return exact;

            try {
                const fromPlan = window.iChefPlanningMetaV202?.({
                    ...(p || {}),
                    categoryId: id
                });
                if (fromPlan) return fromPlan;
            } catch (_) {}

            const fallbacks = {
                present: {id:'present',short:'TRAV',color:'#dff6e7',legalType:'present'},
                off_soir: {id:'off_soir',short:'MATIN',color:'#e4f1ff',legalType:'off_soir'},
                off_matin: {id:'off_matin',short:'SOIR',color:'#eee8ff',legalType:'off_matin'},
                off: {id:'off',short:'REPOS',color:'#eeeeee',legalType:'off'},
                conge: {id:'conge',short:'CP',color:'#fff1bd',legalType:'conge'},
                recup: {id:'recup',short:'RÉCUP',color:'#dff4fb',legalType:'recup'},
                maladie: {id:'maladie',short:'MAL',color:'#fde1e1',legalType:'maladie'},
                formation: {id:'formation',short:'FORM.',color:'#eee6ff',legalType:'formation'},
                ferie: {id:'ferie',short:'FÉRIÉ',color:'#ffe9c9',legalType:'ferie'}
            };
            return fallbacks[id] || {
                id,
                short:String(id || 'OFF').slice(0,8).toUpperCase(),
                color:'#eeeeee',
                legalType:id || 'off'
            };
        }

        function assistantDarkenColorV223(hex, amount = 0.28) {
            const safe = /^#[0-9a-f]{6}$/i.test(String(hex || ''))
                ? String(hex)
                : '#eeeeee';
            const n = parseInt(safe.slice(1), 16);
            const r = Math.max(0, Math.round(((n >> 16) & 255) * (1 - amount)));
            const g = Math.max(0, Math.round(((n >> 8) & 255) * (1 - amount)));
            const b = Math.max(0, Math.round((n & 255) * (1 - amount)));
            return '#' + [r,g,b].map(v => v.toString(16).padStart(2,'0')).join('');
        }

        function assistantPreviewCode(p) {
            if (!p) return assistantCategoryMetaV223(null).short || 'REPOS';
            if (p.__restaurantClosed === true || p.obs === 'Établissement fermé') return 'FERMÉ';
            if (p.status === 'history') return '—';
            const meta = assistantCategoryMetaV223(p);
            return String(meta?.short || meta?.label || assistantCategoryIdV223(p) || 'OFF').toUpperCase();
        }

        function assistantPreviewClass(p) {
            if (!p) return 'v117-off';
            if (p.__restaurantClosed === true || p.obs === 'Établissement fermé') return 'v135-closed';
            if (p.status === 'history') return 'v117-history';
            const legalType = String(assistantCategoryMetaV223(p)?.legalType || '');
            if (legalType === 'present') return 'v117-ms';
            if (legalType === 'off_soir') return 'v117-m';
            if (legalType === 'off_matin') return 'v117-s';
            if (legalType === 'off') return 'v117-off';
            if (legalType === 'recup') return 'v117-off';
            if (legalType === 'maladie' || legalType.startsWith('absence')) return 'v117-abs';
            if (legalType === 'conge') return 'v117-cp';
            return 'v117-status';
        }

        function assistantPreviewStyleV223(p, dayOfWeek = null) {
            if (p?.__restaurantClosed === true || p?.obs === 'Établissement fermé') {
                return 'background:#fff1bd!important;border-color:#b58e22!important;color:#111!important;';
            }
            if (p?.status === 'history') {
                return 'background:#f2f2f2!important;border-color:#999!important;color:#777!important;';
            }

            const meta = assistantCategoryMetaV223(p);
            const color = /^#[0-9a-f]{6}$/i.test(String(meta?.color || ''))
                ? String(meta.color)
                : '#eeeeee';
            const border = assistantDarkenColorV223(color);

            let weekend = '';
            if (dayOfWeek === 6) weekend = 'box-shadow:inset 4px 0 0 #6f9ed8!important;';
            if (dayOfWeek === 0) weekend = 'box-shadow:inset 4px 0 0 #d47b7b!important;';

            return `background:${color}!important;border-color:${border}!important;color:#111!important;${weekend}`;
        }
        window.iChefAssistantCategoryMetaV223 = assistantCategoryMetaV223;
        window.iChefAssistantRefreshColorsV223 = function() {
            try {
                if (
                    document.getElementById('ia-predictions-modal')?.classList.contains('show')
                ) {
                    if (window.__ICHEF_ASSISTANT_VIEW_V221 === 'official') {
                        window.iChefAssistantShowOfficialV221?.();
                    } else if (typeof planningAssistantDraft !== 'undefined' && planningAssistantDraft) {
                        renderAutomaticPlanningDraft(planningAssistantDraft);
                    }
                }
            } catch (_) {}
        };

        function assistantStaffWarningsV149(draft, staffList) {
            const byStaff = {};
            const global = [];
            (staffList || []).forEach(staff => {
                byStaff[String(staff.id)] = [];
            });
            const rows =
                Array.isArray(draft?.warnings)
                    ? draft.warnings
                    : [];
            const normalizedStaff =
                (staffList || [])
                    .map(staff => ({
                        id: String(staff.id),
                        name: String(staff.name || '').trim(),
                        low: String(staff.name || '').trim().toLowerCase()
                    }))
                    .filter(x => x.low);
            rows.forEach(raw => {
                const line = String(raw || '').trim();
                if (!line) return;
                const low = line.toLowerCase();
                const matched = normalizedStaff.filter(staff =>
                    low.includes(staff.low)
                );
                if (matched.length) {
                    matched.forEach(staff => {
                        if (!byStaff[staff.id].includes(line)) {
                            byStaff[staff.id].push(line);
                        }
                    });
                } else {
                    global.push(line);
                }
            });
            return {
                byStaff,
                global:
                    Array.from(new Set(global))
            };
        }
        function assistantCompactStaffWarningV149(line, staffName) {
            let text = String(line || '').trim();
            if (!text) return '';
            text = text
                .replace(/^JURIDIQUE BLOQUANT\s*·\s*/i, 'JURIDIQUE · ')
                .replace(/^BLOQUANT\s*·\s*/i, '')
                .replace(
                    new RegExp(
                        '^OFF AUTOMATIQUE\\s*·\\s*' +
                        String(staffName || '')
                            .replace(/[.*+?^${}()|[\]\\]/g, '\\$&') +
                        '\\s*·\\s*',
                        'i'
                    ),
                    'OFF AUTO · '
                )
                .replace(
                    new RegExp(
                        '^' +
                        String(staffName || '')
                            .replace(/[.*+?^${}()|[\]\\]/g, '\\$&') +
                        '\\s*:\\s*',
                        'i'
                    ),
                    ''
                )
                .replace(
                    /Planifier cette personne, prévoir un remplaçant qualifié ou fermer ce service\.?/i,
                    ''
                )
                .replace(/\s+/g, ' ')
                .trim();
            return text;
        }
        function assistantStaffAlertTitleV149(lines) {
            return (lines || [])
                .map(line => String(line || '').trim())
                .filter(Boolean)
                .join('\n');
        }
        function renderStaffDetailWarningsV149(staffId) {
            const host =
                document.getElementById('staff-detail-stats');
            if (!host) return;
            let box =
                document.getElementById(
                    'v149-staff-detail-warnings'
                );
            if (!box) {
                box =
                    document.createElement('div');
                box.id =
                    'v149-staff-detail-warnings';
                box.className =
                    'v149-staff-detail-warnings';
                host.insertAdjacentElement(
                    'afterend',
                    box
                );
            }
            const draft =
                typeof planningAssistantDraft !== 'undefined'
                    ? planningAssistantDraft
                    : null;
            if (!draft) {
                box.style.display = 'none';
                box.innerHTML = '';
                return;
            }
            const staffList =
                getDir().filter(s =>
                    s.active !== false
                );
            const bundle =
                assistantStaffWarningsV149(
                    draft,
                    staffList
                );
            const lines =
                bundle.byStaff?.[
                    String(staffId)
                ] || [];
            if (!lines.length) {
                box.style.display = 'none';
                box.innerHTML = '';
                return;
            }
            box.style.display = '';
            box.innerHTML = `
                <div class="v149-staff-detail-head">
                    ALERTES DU PLANNING IA · ${escapeRhHtml(String(lines.length))}
                </div>
                ${lines.map(line => `
                    <div class="${
                        /BLOQUANT|JURIDIQUE/i.test(line)
                            ? 'v149-detail-alert is-blocking'
                            : 'v149-detail-alert'
                    }">
                        ${escapeRhHtml(line)}
                    </div>
                `).join('')}
            `;
        }
        function renderAutomaticPlanningDraft(draft) {
            const summary = document.getElementById('ia-planning-draft-summary');
            const warnings = document.getElementById('ia-planning-draft-warnings');
            const preview = document.getElementById('ia-planning-preview');
            const applyBtn = document.getElementById('assistant-apply-btn');
            if (!draft) {
                if (applyBtn) applyBtn.disabled = true;
                return;
            }
            const activeStaffListV149 =
                getDir().filter(s =>
                    s.active !== false
                );
            const staffWarningsV149 =
                assistantStaffWarningsV149(
                    draft,
                    activeStaffListV149
                );
            if (summary) {
                const summaryRows = draft.__official === true
                    ? [
                        ['Source', 'OFFICIEL'],
                        ['Objectif', `${draft.metrics.totalTarget.toFixed(1)} h`],
                        ['Planifié officiel', `${draft.metrics.totalPlanned.toFixed(1)} h`],
                        ['Coût prévu', `${draft.metrics.estimatedCost.toFixed(0)} ${rhCashCurrencySymbolV170(getRhSettings().currency)}`],
                        ['Équilibrés', `${draft.metrics.staffBalanced}/${draft.metrics.staffCount}`],
                        ['Synchronisation', 'MASTER']
                    ]
                    : [
                        ['Couverture', `${draft.metrics.coveragePct}%`],
                        ['Objectif', `${draft.metrics.totalTarget.toFixed(1)} h`],
                        ['Planifié IA', `${draft.metrics.totalPlanned.toFixed(1)} h`],
                        ['Coût estimé', `${draft.metrics.estimatedCost.toFixed(0)} ${rhCashCurrencySymbolV170(getRhSettings().currency)}`],
                        ['Équilibrés', `${draft.metrics.staffBalanced}/${draft.metrics.staffCount}`],
                        ['Alertes', String(draft.warnings.length)]
                    ];

                summary.innerHTML = summaryRows.map(([label, value]) => `
                    <div class="rh-detail-stat">
                        <div class="lbl">${escapeRhHtml(label)}</div>
                        <div class="val">${escapeRhHtml(value)}</div>
                    </div>
                `).join('');
            }
            if (warnings) {
                // V149 :
                // Les alertes liées à une personne sont affichées directement
                // dans son bouton/cellule STAFF. La grande zone grise ne garde
                // que les blocages globaux impossibles à attribuer à une personne.
                const globalBlockingWarnings =
                    (staffWarningsV149.global || [])
                        .filter(line =>
                            /^(?:JURIDIQUE\s+)?BLOQUANT\b/i.test(
                                String(line || '').trim()
                            )
                        );
                warnings.innerText =
                    globalBlockingWarnings.length
                        ? globalBlockingWarnings
                            .slice(0, 6)
                            .join('\n')
                        : '';
                warnings.style.display =
                    globalBlockingWarnings.length
                        ? ''
                        : 'none';
            }
            if (preview) {
                const [year, month] = draft.month.split('-').map(Number);
                const daysInMonth = new Date(year, month, 0).getDate();
                const staffList = activeStaffListV149;
                let head = '<tr><th class="sticky-col" style="min-width:150px;">COLLABORATEUR</th>';
                for (let day = 1; day <= daysInMonth; day++) {
                    const dateObj = new Date(year, month - 1, day);
                    const dow = dateObj.getDay();
                    const dayInitial = daysOfWeek[dow].charAt(0);
                    const weekendClass =
                        dow === 6 ? ' v223-ai-saturday' :
                        dow === 0 ? ' v223-ai-sunday' : '';
                    head += `<th class="${weekendClass.trim()}" data-v223-dow="${dow}" style="min-width:48px;"><span class="v167-day-date">${dayInitial} ${String(day).padStart(2, '0')}</span></th>`;
                }
                head += '<th style="min-width:80px;">H.</th></tr>';
                let body = '';
                staffList.forEach(staff => {
                    const state = draft.states[staff.id];
                    const plannedHours = Number(state?.hours || 0);
                    const targetHours = Number(state?.target || 0);
                    const remainingHours = Math.max(0, targetHours - plannedHours);
                    const remainingLabel = `${remainingHours.toFixed(1)} h`;
                    const staffLines =
                        staffWarningsV149.byStaff?.[
                            String(staff.id)
                        ] || [];
                    const compactWarning =
                        staffLines.length
                            ? assistantCompactStaffWarningV149(
                                staffLines[0],
                                staff.name
                              )
                            : '';
                    const moreLabel =
                        staffLines.length > 1
                            ? ` · +${staffLines.length - 1}`
                            : '';
                    const staffTitle =
                        staffLines.length
                            ? `${staff.name} · ${remainingLabel}\n${assistantStaffAlertTitleV149(staffLines)}\nCliquer pour le détail`
                            : `${staff.name} · ${remainingLabel} restent à planifier · Cliquer pour plus de détails`;
                    body += `
                        <tr>
                            <td
                                class="sticky-col v130-staff-cell${staffLines.length ? ' v149-has-alerts' : ''}"
                                data-staff-id="${escapeRhHtml(String(staff.id))}"
                                data-alert-count="${escapeRhHtml(String(staffLines.length))}"
                                title="${escapeRhHtml(staffTitle)}"
                                onclick='openStaffDetail(${JSON.stringify(staff.id)})'
                            >
                                <span class="v130-staff-name">${escapeRhHtml(staff.name)}</span>
                                <span class="v130-staff-hours${remainingHours <= 0.05 ? ' is-ok' : ''}">
                                    ${escapeRhHtml(remainingLabel)}
                                </span>

                                ${
                                    staffLines.length
                                        ? `<span class="v149-staff-alert-preview">${
                                            escapeRhHtml(compactWarning + moreLabel)
                                          }</span>`
                                        : ''
                                }
                            </td>
                    `;
                    for (let day = 1; day <= daysInMonth; day++) {
                        const p = draft.proposal?.[staff.id]?.[day];
                        const code = assistantPreviewCode(p);
                        const title = p
                            ? `${p.s1 || ''}${p.s1 && p.s2 ? ' / ' : ''}${p.s2 || ''}${p.obs ? ' · ' + p.obs : ''}`
                            : '';
                        const dateObjV223 = new Date(year, month - 1, day);
                        const dowV223 = dateObjV223.getDay();
                        const categoryV223 = assistantCategoryMetaV223(p);
                        const weekendClassV223 =
                            dowV223 === 6 ? ' v223-ai-saturday-cell' :
                            dowV223 === 0 ? ' v223-ai-sunday-cell' : '';
                        body += `<td
                            class="${assistantPreviewClass(p)}${weekendClassV223}"
                            data-rh-category="${escapeRhHtml(String(categoryV223?.id || assistantCategoryIdV223(p)))}"
                            title="${escapeRhHtml(title)}"
                            style="${assistantPreviewStyleV223(p,dowV223)}text-align:center;font-size:.66rem;font-weight:900;"
                        >${escapeRhHtml(code)}</td>`;
                    }
                    body += `<td style="font-weight:900;color:var(--hr);">${Number(state?.hours || 0).toFixed(1)}</td></tr>`;
                });
                preview.innerHTML = `
                    <table class="global-table" style="min-width:max-content;">
                        <thead>${head}</thead>
                        <tbody>${body}</tbody>
                    </table>
                `;
            }
            if (applyBtn) {
                if (draft.__official === true) {
                    applyBtn.disabled = true;
                    applyBtn.title =
                        'Vous regardez le planning officiel synchronisé. Générez une proposition IA pour activer APPLIQUER.';
                } else {
                    const coverageOk = Number(draft.metrics?.coveragePct || 0) >= 85;
                    const balanceOk = Number(draft.metrics?.staffBalanced || 0) >= Math.max(1, Math.ceil(Number(draft.metrics?.staffCount || 0) * 0.6));
                    const criticalOk = !Array.isArray(draft.criticalIssues) || draft.criticalIssues.length === 0;
                    const legalOk = !Array.isArray(draft.legalIssues) || draft.legalIssues.length === 0;
                    applyBtn.disabled = !(coverageOk && balanceOk && criticalOk && legalOk);
                    if (!legalOk) {
                        applyBtn.title =
                            'Application bloquée : le planning ne respecte pas le profil juridique du client.';
                    } else if (!criticalOk) {
                        applyBtn.title =
                            'Application bloquée : au moins un service est ouvert sans couverture cuisine qualifiée.';
                    } else {
                        applyBtn.title = applyBtn.disabled
                            ? 'La proposition doit encore être équilibrée ou mieux couvrir les besoins avant application.'
                            : 'Valider et appliquer la proposition au planning officiel.';
                    }
                }
            }
        }

        // ======================================================
        // V221 · PLANNING MASTER
        // Le bouton PLANNING de l'assistant montre exactement
        // TIMESHEETS_MASTER. La proposition IA reste séparée
        // jusqu'au clic sur APPLIQUER.
        // ======================================================
        let planningAssistantViewV221 = 'official';

        function buildOfficialPlanningSnapshotV221(monthStr = getPlanningAssistantMonth()) {
            const [year, month] = String(monthStr).split('-').map(Number);
            const daysInMonth = new Date(year, month, 0).getDate();
            const master = getTs();
            const monthData = master?.[monthStr] || {};
            const staffList = getDir().filter(s => s.active !== false);

            const proposal = {};
            const states = {};
            let totalTarget = 0;
            let totalPlanned = 0;
            let estimatedCost = 0;
            let staffBalanced = 0;

            staffList.forEach(staff => {
                const id = String(staff.id);
                const weekly = Math.max(0, Number(staff.contract || 0));
                const target = weekly * 52 / 12;
                let hours = 0;
                proposal[id] = {};

                for (let day = 1; day <= daysInMonth; day++) {
                    const existing =
                        monthData?.[staff.id]?.[day] ??
                        monthData?.[id]?.[day] ??
                        null;

                    const plan = existing
                        ? assistantClone(existing)
                        : {
                            status: 'off',
                            poste: staff.dept || 'salle',
                            s1: '',
                            s2: '',
                            pause: 0,
                            obs: ''
                        };

                    proposal[id][day] = plan;
                    hours += Number(calculateNet(plan) || 0);
                }

                const tolerance = Math.max(1, target * 0.05);
                if (Math.abs(target - hours) <= tolerance) {
                    staffBalanced++;
                }

                totalTarget += target;
                totalPlanned += hours;
                estimatedCost += hours * Math.max(0, Number(staff.hourlyCost || 0));

                states[id] = {
                    year,
                    month,
                    target,
                    hours,
                    dailyReference: weekly > 0 ? weekly / 5 : 0,
                    absenceDays: 0,
                    recoveryDays: 0,
                    evenings: Object.values(proposal[id]).filter(p => Boolean(p?.s2)).length,
                    weekends: 0
                };
            });

            return {
                __official: true,
                month: monthStr,
                proposal,
                states,
                warnings: [],
                criticalIssues: [],
                legalIssues: [],
                metrics: {
                    coveragePct: 100,
                    totalTarget,
                    totalPlanned,
                    estimatedCost,
                    staffBalanced,
                    staffCount: staffList.length
                }
            };
        }

        function updatePlanningAssistantViewV221(mode) {
            planningAssistantViewV221 = mode === 'proposal' ? 'proposal' : 'official';
            window.__ICHEF_ASSISTANT_VIEW_V221 = planningAssistantViewV221;

            const officialBtn = document.getElementById('v153-nav-planning');
            const proposalBtn = document.getElementById('v153-nav-proposal');
            officialBtn?.classList.toggle('active', planningAssistantViewV221 === 'official');
            proposalBtn?.classList.toggle('active', planningAssistantViewV221 === 'proposal');
            officialBtn?.setAttribute(
                'aria-current',
                planningAssistantViewV221 === 'official' ? 'true' : 'false'
            );
            proposalBtn?.setAttribute(
                'aria-current',
                planningAssistantViewV221 === 'proposal' ? 'true' : 'false'
            );

            const state = document.getElementById('v113-state');
            if (state && planningAssistantViewV221 === 'official') {
                state.textContent = 'PLANNING OFFICIEL · SYNCHRONISÉ';
                state.classList.add('ready');
            }

            const head = document.querySelector('#ia-predictions-modal .v113-plan-head strong');
            if (head) {
                head.textContent = planningAssistantViewV221 === 'official'
                    ? 'PLANNING OFFICIEL · SYNCHRONISÉ'
                    : 'PLANNING PROPOSÉ PAR L’IA';
            }
        }

        function renderPlanningAssistantOfficialV221() {
            const monthStr = getPlanningAssistantMonth();
            const snapshot = buildOfficialPlanningSnapshotV221(monthStr);
            updatePlanningAssistantViewV221('official');
            renderAutomaticPlanningDraft(snapshot);

            const warnings = document.getElementById('ia-planning-draft-warnings');
            if (warnings) {
                warnings.textContent = '';
                warnings.style.display = 'none';
            }

            const applyBtn = document.getElementById('assistant-apply-btn');
            if (applyBtn) {
                applyBtn.disabled = true;
            }

            requestAnimationFrame(() => updatePlanningAssistantViewV221('official'));
            return snapshot;
        }

        function renderPlanningAssistantProposalV221() {
            updatePlanningAssistantViewV221('proposal');

            if (planningAssistantDraft) {
                renderAutomaticPlanningDraft(planningAssistantDraft);
                return true;
            }

            const preview = document.getElementById('ia-planning-preview');
            const summary = document.getElementById('ia-planning-draft-summary');
            const warnings = document.getElementById('ia-planning-draft-warnings');
            const applyBtn = document.getElementById('assistant-apply-btn');

            if (summary) summary.innerHTML = '';
            if (preview) {
                preview.innerHTML =
                    '<div class="rh-v221-no-proposal">Aucune proposition IA pour ce mois. Cliquez sur GÉNÉRER LE PLANNING.</div>';
            }
            if (warnings) {
                warnings.textContent = 'La proposition IA est séparée du planning officiel jusqu’à APPLIQUER.';
                warnings.style.display = '';
            }
            if (applyBtn) applyBtn.disabled = true;
            return false;
        }

        window.iChefAssistantShowOfficialV221 = function() {
            return renderPlanningAssistantOfficialV221();
        };
        window.iChefAssistantShowProposalV221 = function() {
            return renderPlanningAssistantProposalV221();
        };
        window.iChefAssistantOfficialSnapshotV221 = buildOfficialPlanningSnapshotV221;

        window.addEventListener('ichef:planning-symbiosis', () => {
            if (
                planningAssistantViewV221 === 'official' &&
                document.getElementById('ia-predictions-modal')?.classList.contains('show')
            ) {
                requestAnimationFrame(renderPlanningAssistantOfficialV221);
            }
        });

        // V124 — multi-mois NATIF : même portée JS que planningAssistantDraft.
        let planningAssistantMultiMonths = [];
        let planningAssistantMultiIndex = 0;
        let planningAssistantHorizon = 2;
        function assistantMonthAdd(monthStr, offset) {
            const [y,m] = String(monthStr).split('-').map(Number);
            const d = new Date(y, (m || 1) - 1 + offset, 1);
            return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
        }
        function renderPlanningAssistantMultiMonth(index) {
            if (!planningAssistantMultiMonths.length) return;
            planningAssistantMultiIndex = Math.max(0, Math.min(planningAssistantMultiMonths.length - 1, Number(index)||0));
            const rec = planningAssistantMultiMonths[planningAssistantMultiIndex];
            planningAssistantDraft = assistantClone(rec.draft);
            planningAssistantViewV221 = 'proposal';
            updatePlanningAssistantViewV221('proposal');
            window.__ICHEF_PLANNING_DRAFT_STALE_V217 = false;
            try {
                window.__ICHEF_PLANNING_DRAFT_MASTER_SIG_V217 =
                    typeof rhPlanningSignature === 'function'
                        ? rhPlanningSignature(getTs())
                        : JSON.stringify(getTs());
            } catch (_) {}
            renderAutomaticPlanningDraft(planningAssistantDraft);
            window.__ICHEF_MULTI_MONTH_PUBLIC__ = {
                horizon: planningAssistantHorizon,
                index: planningAssistantMultiIndex,
                months: planningAssistantMultiMonths.map(x => ({month:x.month,label:x.label}))
            };
            window.dispatchEvent(new CustomEvent('ichef-multimonth-update'));
        }
        window.renderPlanningAssistantMultiMonth = renderPlanningAssistantMultiMonth;
        async function generateAutomaticPlanning() {
            const btn = document.getElementById('assistant-generate-btn');
            const horizonInput = document.getElementById('v124-horizon');
            planningAssistantHorizon = Math.max(2, Math.min(6, Number(horizonInput?.value || 2)));
            planningAssistantMultiMonths = [];
            planningAssistantMultiIndex = 0;
            const selector = document.getElementById('month-selector');
            const baseMonth = getPlanningAssistantMonth();
            const originalMonth = selector?.value || baseMonth;
            if (btn) {
                btn.disabled = true;
                btn.innerText = 'GÉNÉRATION 0/' + planningAssistantHorizon;
                btn.style.opacity = '0.72';
            }
            try {
                saveRhPlanningSettings(true);
                for (let i = 0; i < planningAssistantHorizon; i++) {
                    const monthStr = assistantMonthAdd(baseMonth, i);
                    // IMPORTANT : changement direct, sans onchange/handleMonthChange,
                    // pour éviter les rechargements qui interrompaient la boucle.
                    if (selector) selector.value = monthStr;
                    planningAssistantPrediction = null;
                    planningAssistantPredictionMonth = null;
                    if (btn) btn.innerText = `GÉNÉRATION ${i+1}/${planningAssistantHorizon}`;
                    const draft = buildAutomaticPlanningDraft();
                    planningAssistantMultiMonths.push({
                        month: monthStr,
                        label: monthLabelFr(monthStr),
                        draft: assistantClone(draft)
                    });
                    window.__ICHEF_MULTI_MONTH_PUBLIC__ = {
                        horizon: planningAssistantHorizon,
                        index: i,
                        months: planningAssistantMultiMonths.map(x => ({month:x.month,label:x.label}))
                    };
                    window.dispatchEvent(new CustomEvent('ichef-multimonth-update'));
                    // Laisse le navigateur repeindre le compteur entre deux mois.
                    await new Promise(resolve => requestAnimationFrame(resolve));
                }
                renderPlanningAssistantMultiMonth(0);
                if (typeof showToast === 'function') {
                    showToast(`${planningAssistantMultiMonths.length} mois de planning générés`);
                }
                // Analyse distante seulement pour le mois affiché, sans bloquer les autres mois.
                Promise.resolve(generateIAPrediction(true)).catch(error => {
                    console.warn('Analyse IA complémentaire indisponible :', error);
                });
            } catch (error) {
                console.error('Erreur génération planning multi-mois :', error);
                alert(error?.message || 'Impossible de générer le planning.');
            } finally {
                // Le mois affiché reste celui de la proposition actuellement visible.
                if (planningAssistantMultiMonths.length && selector) {
                    selector.value = planningAssistantMultiMonths[planningAssistantMultiIndex].month;
                } else if (selector) {
                    selector.value = originalMonth;
                }
                if (btn) {
                    btn.disabled = false;
                    btn.innerText = '2. GÉNÉRER LE PLANNING';
                    btn.style.opacity = '1';
                }
                window.dispatchEvent(new CustomEvent('ichef-multimonth-update'));
            }
        }
        async function applyAutomaticPlanning() {
            if (window.__ICHEF_PLANNING_DRAFT_STALE_V217 === true) {
                alert('Le planning officiel a changé depuis la génération de cette proposition. Régénérez le planning IA avant de l’appliquer.');
                return;
            }
            if (!planningAssistantDraft) {
                alert('Générez d’abord une proposition de planning.');
                return;
            }
            const settings = getRhSettings();
            if (settings.planningStatus === 'locked') {
                alert('Le planning est clôturé / verrouillé. Passez-le en Brouillon avant de l’appliquer.');
                return;
            }
            const monthStr = getPlanningAssistantMonth();
            if (planningAssistantDraft.month !== monthStr) {
                alert('Le mois affiché a changé. Régénérez la proposition.');
                return;
            }
            if (!confirm(`Appliquer la proposition iCHEF pour ${monthLabelFr(monthStr)} ?\n\nLe planning officiel sera remplacé par cette proposition pour les cases générées, tout en conservant les éléments protégés.`)) {
                return;
            }
            const applyReason = String(prompt(`Pourquoi appliquez-vous cette modification de planning ?\n\nLe motif sera conservé 5 ans.`) || '').trim().slice(0,180);
            if (!applyReason) {
                alert('Application annulée : le motif de modification est obligatoire.');
                return;
            }
            const ts = getTs();
            const aiBeforeByStaff = {};
            if (!ts[monthStr]) ts[monthStr] = {};
            Object.entries(planningAssistantDraft.proposal).forEach(([staffId, days]) => {
                if (!ts[monthStr][staffId]) ts[monthStr][staffId] = {};
                aiBeforeByStaff[staffId] = JSON.parse(JSON.stringify(ts[monthStr][staffId] || {}));
                const auditAt = new Date().toISOString();
                const auditBy = typeof window.rhAuditActorV94==='function' ? window.rhAuditActorV94() : 'Direction / RH';
                Object.entries(days).forEach(([day, plan]) => {
                    const clean = {
                        status: plan.status || 'off',
                        poste: plan.poste || 'salle',
                        s1: plan.s1 || '',
                        s2: plan.s2 || '',
                        pause: Number(plan.pause || 0),
                        obs: String(plan.obs || ''),
                        managerNote: String(plan.managerNote || '').slice(0,40),
                        lastChangeReason: applyReason,
                        lastChangeAt: auditAt,
                        lastChangeBy: auditBy,
                        updatedAt: auditAt
                    };
                    ts[monthStr][staffId][day] = clean;
                });
            });
            const cloudSaved = await saveTs(ts, {
                source: 'ASSISTANCE_PLANNING',
                reason: applyReason
            });
            Object.keys(planningAssistantDraft.proposal || {}).forEach(staffId => {
                const staffRow = getDir().find(s => String(s.id) === String(staffId));
                recordRhChange({
                    type:'PLANNING_AI_APPLIED',month:monthStr,source:'ASSISTANCE_PLANNING',
                    staffId:String(staffId),staffName:String(staffRow?.name||''),reason:applyReason,
                    by:typeof window.rhAuditActorV94==='function'?window.rhAuditActorV94():'Direction / RH',
                    before:aiBeforeByStaff[staffId] || {},after:JSON.parse(JSON.stringify(ts[monthStr][staffId] || {})),
                    coveragePct:planningAssistantDraft.metrics.coveragePct,
                    message:`Planning IA appliqué · ${monthStr} · ${applyReason}`
                });
            });
            // V221 : saveTs a déjà propagé TIMESHEETS_MASTER.
            // On vide le brouillon puis on affiche immédiatement le MASTER.
            planningAssistantDraft = null;
            planningAssistantMultiMonths = [];
            planningAssistantMultiIndex = 0;
            window.__ICHEF_MULTI_MONTH_PUBLIC__ = {
                horizon: planningAssistantHorizon,
                index: 0,
                months: []
            };
            window.__ICHEF_PLANNING_DRAFT_STALE_V217 = false;

            window.iChefPlanningMasterSyncV217?.({
                source:'ASSISTANCE_PLANNING_APPLIED_V221',
                snapshot:ts,
                local:true,
                forceRender:true
            });

            renderPlanningAssistantLocal();
            renderPlanningAssistantOfficialV221();
            window.dispatchEvent(new CustomEvent('ichef-multimonth-update'));

            if (typeof broadcastStaffingLevels === 'function') {
                broadcastStaffingLevels();
            }

            if (typeof showToast === 'function') {
                showToast(
                    cloudSaved
                        ? 'Planning IA appliqué et synchronisé'
                        : 'Planning appliqué localement · synchronisation serveur à reprendre'
                );
            }
            if (!cloudSaved) {
                console.warn(
                    '[iCHEF RH V84] planning appliqué localement mais sauvegarde serveur refusée/indisponible'
                );
            }
        }
        function exportPayrollCsv() {
            const monthStr =
                getPlanningAssistantMonth();
            const [year, month] =
                monthStr.split('-').map(Number);
            const daysInMonth =
                new Date(
                    year,
                    month,
                    0
                ).getDate();
            const tsMonth =
                getTs()[monthStr] || {};
            const rows = [[
                'Employé',
                'Département',
                'Contrat h/semaine',
                'Objectif mois',
                'Objectif ajusté',
                'Heures planifiées',
                'Heures pointées',
                'Solde réel',
                'Heures supplémentaires planning',
                'Récupération disponible',
                'CP pris année',
                'CP restants',
                'Absences mois',
                'Coût horaire',
                'Coût pointé estimé',
                'Validation'
            ]];
            getDir()
                .filter(s => s.active !== false)
                .forEach(staff => {
                    const staffMonth =
                        tsMonth?.[staff.id] ||
                        tsMonth?.[String(staff.id)] ||
                        {};
                    const stats =
                        getStaffMonthStats(
                            staff.id,
                            year,
                            month,
                            daysInMonth,
                            staffMonth
                        ) || {};
                    const actual =
                        getActualHoursSummary(
                            staff.id,
                            monthStr
                        );
                    const realBalance =
                        Number(actual.total || 0) -
                        Number(stats.adjustedTarget || 0);
                    rows.push([
                        staff.name || '',
                        staff.dept || '',
                        Number(staff.contract || 0).toFixed(2),
                        Number(stats.expected || 0).toFixed(2),
                        Number(stats.adjustedTarget || 0).toFixed(2),
                        Number(stats.totalDone || 0).toFixed(2),
                        Number(actual.total || 0).toFixed(2),
                        Number(realBalance || 0).toFixed(2),
                        Number(stats.extraHours || 0).toFixed(2),
                        Number(staff.recoveryBalance || 0).toFixed(2),
                        Number(stats.annualCPUsed || 0).toFixed(2),
                        Number(stats.cpRestants || 0).toFixed(2),
                        Number(stats.leaveDays || 0).toFixed(2),
                        Number(staff.hourlyCost || 0).toFixed(2),
                        (
                            Number(staff.hourlyCost || 0) *
                            Number(actual.total || 0)
                        ).toFixed(2),
                        'À VALIDER'
                    ]);
                });
            const csv =
                rows.map(row =>
                    row.map(value =>
                        `"${String(value ?? '').replace(/"/g, '""')}"`
                    ).join(';')
                ).join('\n');
            const blob =
                new Blob(
                    ['\ufeff' + csv],
                    {
                        type:
                            'text/csv;charset=utf-8'
                    }
                );
            const url =
                URL.createObjectURL(
                    blob
                );
            const a =
                document.createElement('a');
            a.href = url;
            a.download =
                `iCHEF_RH_PAIE_${monthStr}.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(
                () =>
                    URL.revokeObjectURL(url),
                1000
            );
            showToast(
                'Export paie CSV généré'
            );
        }
        // ==========================================
        // 🕒 CALCULS DES HEURES ET LISSAGES
        // ==========================================
        function parseTime(timeStr) {
            if(!timeStr || !timeStr.includes(':')) return null;
            const pts = timeStr.split(':');
            return parseInt(pts[0]) + (parseInt(pts[1]) / 60);
        }
        const RH_PLANNING_STATUSES = [
            { value: 'present', label: 'TRAVAIL', short: 'TRAV', kind: 'work' },
            { value: 'off_soir', label: 'MATIN SEUL', short: 'MATIN', kind: 'work' },
            { value: 'off_matin', label: 'SOIR SEUL', short: 'SOIR', kind: 'work' },
            { value: 'off', label: 'REPOS', short: 'REPOS', kind: 'rest' },
            { value: 'conge', label: 'CONGÉS PAYÉS', short: 'CP', kind: 'leave' },
            { value: 'recup', label: 'RÉCUPÉRATION', short: 'RÉCUP', kind: 'leave' },
            { value: 'maladie', label: 'MALADIE', short: 'MAL', kind: 'leave' },
            { value: 'accident_travail', label: 'ACCIDENT TRAVAIL', short: 'AT', kind: 'leave' },
            { value: 'maternite', label: 'MATERNITÉ', short: 'MAT.', kind: 'leave' },
            { value: 'paternite', label: 'PATERNITÉ', short: 'PAT.', kind: 'leave' },
            { value: 'parental', label: 'PARENTAL', short: 'PAR.', kind: 'leave' },
            { value: 'enfant_malade', label: 'ENFANT / PROCHE MALADE', short: 'PROCHE', kind: 'leave' },
            { value: 'evenement_familial', label: 'ÉVÉNEMENT FAMILIAL', short: 'ÉVÉN.', kind: 'leave' },
            { value: 'deces', label: 'DÉCÈS / DEUIL', short: 'DEUIL', kind: 'leave' },
            { value: 'formation', label: 'FORMATION', short: 'FORM.', kind: 'leave' },
            { value: 'sans_solde', label: 'SANS SOLDE', short: 'S/SOLDE', kind: 'leave' },
            { value: 'absence_autorisee', label: 'ABSENCE AUTORISÉE', short: 'ABS.', kind: 'leave' },
            { value: 'absence_injustifiee', label: 'ABSENCE INJUSTIFIÉE', short: 'ABS !', kind: 'leave' },
            { value: 'ferie', label: 'FÉRIÉ', short: 'FÉRIÉ', kind: 'leave' }
        ];
        function rhStatusMeta(status) {
            return RH_PLANNING_STATUSES.find(x => x.value === status) ||
                { value: status || 'off', label: String(status || 'REPOS').toUpperCase(), short: '—', kind: 'rest' };
        }
        function renderPlanningStatusOptions(selected, compact = false) {
            return RH_PLANNING_STATUSES.map(status => `
                <option value="${status.value}" ${selected === status.value ? 'selected' : ''}>
                    ${compact ? status.short : status.label}
                </option>
            `).join('');
        }
        function isRhWorkStatus(status) {
            return ['present', 'off_soir', 'off_matin'].includes(status);
        }
        function isRhLeaveStatus(status) {
            return RH_PLANNING_STATUSES.some(
                x => x.value === status && x.kind === 'leave'
            );
        }
        function calculateNet(p) {
            if (!p || !isRhWorkStatus(p.status)) return 0;
            let total = 0;
            if (p.s1) {
                let [s, e] = p.s1.split('-');
                if (s && e) {
                    s = parseTime(s);
                    e = parseTime(e);
                    if (s !== null && e !== null) {
                        if (e < s) e += 24;
                        total += (e - s);
                    }
                }
            }
            if (p.s2) {
                let [s, e] = p.s2.split('-');
                if (s && e) {
                    s = parseTime(s);
                    e = parseTime(e);
                    if (s !== null && e !== null) {
                        if (e < s) e += 24;
                        total += (e - s);
                    }
                }
            }
            total -= (parseInt(p.pause) || 0) / 60;
            return Math.max(0, total);
        }
        function countAnnualStatusDays(staffId, year, statuses) {
            const ts = getTs();
            let count = 0;
            Object.entries(ts).forEach(([monthKey, monthData]) => {
                if (!monthKey.startsWith(String(year) + '-')) return;
                const staffMonth =
                    monthData?.[staffId] ||
                    monthData?.[String(staffId)] ||
                    {};
                Object.values(staffMonth).forEach(day => {
                    if (day && statuses.includes(day.status)) count++;
                });
            });
            return count;
        }
        function getStaffMonthStats(staffId, year, month, daysInMonth, monthData) {
            const staff = getDir().find(s => String(s.id) === String(staffId));
            if (!staff) return null;
            const weeklyContract = Number(staff.contract) || 0;
            const dailyReference = weeklyContract > 0 ? weeklyContract / 5 : 0;
            // Objectif mensuel moyen : heures/semaine × 52 / 12.
            // Ex.: 35 h => 151,7 h ; 39 h => 169,0 h.
            let expected = weeklyContract * 52 / 12;
            const resetInfo = getRhHoursResetInfoV99();
            let totalDone = 0;
            let countCP = 0;
            let countM = 0;
            let countF = 0;
            let countRecup = 0;
            let leaveDays = 0;
            let unavailableDays = 0;
            let unjustifiedDays = 0;
            const leaveCounts = {};
            for (let d = 1; d <= daysInMonth; d++) {
                const p = monthData?.[d];
                if (!p) continue;
                if (resetInfo.active && !rhPlanCountsAfterResetV99(p)) continue;
                totalDone += calculateNet(p);
                if (isRhLeaveStatus(p.status)) {
                    leaveDays++;
                    unavailableDays++;
                    leaveCounts[p.status] = (leaveCounts[p.status] || 0) + 1;
                }
                if (p.status === 'conge') countCP++;
                if (p.status === 'maladie') countM++;
                if (p.status === 'ferie') countF++;
                if (p.status === 'recup') countRecup++;
                if (p.status === 'absence_injustifiee') unjustifiedDays++;
            }
            if (resetInfo.active) {
                // Après une remise à zéro, l'objectif compteur repart lui aussi de zéro.
                // Les nouvelles modifications de planning constituent la nouvelle base.
                expected = totalDone;
            }
            // Pour l'aide au planning, un jour d'absence validé rend le salarié
            // indisponible : on ne lui demande pas de travailler ce jour-là.
            // Ce calcul n'est PAS un calcul de paie ou une qualification juridique.
            const planningAbsenceCredit =
                unavailableDays * dailyReference;
            const adjustedTarget =
                Math.max(0, expected - planningAbsenceCredit);
            const extraHours =
                Math.max(0, totalDone - adjustedTarget);
            const missedHours =
                Math.max(0, adjustedTarget - totalDone);
            const totalRecup =
                countRecup * dailyReference;
            const annualLeaveDays =
                Number(staff.annualLeaveDays ?? 25);
            const leaveCarryover =
                Number(staff.leaveCarryover ?? 0);
            // V146 : séparation stricte des statuts.
            // OFF = repos, MALADIE = absence maladie, CP = vacances.
            // Seul le statut "conge" consomme le compteur de vacances.
            const annualCPUsed =
                countAnnualStatusDays(
                    staff.id,
                    year,
                    ['conge']
                );
            const cpRestants =
                Math.max(
                    0,
                    annualLeaveDays +
                    leaveCarryover -
                    annualCPUsed
                );
            return {
                weeklyContract,
                dailyReference,
                expected,
                adjustedTarget,
                totalDone,
                extraHours,
                totalRecup,
                countRecup,
                countCP,
                countM,
                countF,
                leaveDays,
                unavailableDays,
                unjustifiedDays,
                leaveCounts,
                missedHours,
                annualLeaveDays,
                leaveCarryover,
                annualCPUsed,
                cpRestants
            };
        }
        // ==========================================
        // VUES PLANNING (MENSUEL, ANNUEL, GLOBAL)
        // ==========================================
        function getRhPlanningMaxMonth() {
            const now = new Date();
            const d = new Date(now.getFullYear(), now.getMonth() + 6, 1, 12, 0, 0, 0);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        }
        function enforceRhPlanningMonthHorizon(showNotice = false) {
            const selector = document.getElementById('month-selector');
            if (!selector) return true;
            const maxMonth = getRhPlanningMaxMonth();
            selector.max = maxMonth;
            selector.title = `Planning modifiable jusqu’à ${maxMonth}`;
            if (selector.value && selector.value > maxMonth) {
                selector.value = maxMonth;
                if (showNotice && typeof showToast === 'function') {
                    showToast('Horizon planning : 6 mois maximum');
                }
                return false;
            }
            return true;
        }
        function changeMonth(offset) {
            const selector = document.getElementById('month-selector');
            if (!selector) return;
            let [y, m] = selector.value.split('-').map(Number);
            if (!y || !m) {
                const now = new Date();
                y = now.getFullYear();
                m = now.getMonth() + 1;
            }
            m += offset;
            if(m > 12) { m = 1; y++; }
            if(m < 1) { m = 12; y--; }
            const requested = `${y}-${String(m).padStart(2, '0')}`;
            const maxMonth = getRhPlanningMaxMonth();
            selector.value = requested > maxMonth ? maxMonth : requested;
            if (requested > maxMonth && typeof showToast === 'function') {
                showToast('Planning disponible jusqu’à 6 mois dans le futur');
            }
            handleMonthChange();
        }
        function toggleAnnualView() {
            if(isGlobalView || !currentStaffId) return;
            isAnnualView = !isAnnualView;
            const btn = document.getElementById('btn-annual-toggle');
            if(isAnnualView) {
                btn.innerHTML = 'VUE MENSUELLE';
                document.getElementById('table-container-individual').style.display = 'none';
                document.getElementById('annual-view-container').style.display = 'block';
                const year = document.getElementById('month-selector').value.split('-')[0];
                renderAnnualTimesheet(year, currentStaffId);
            } else {
                btn.innerHTML = 'VUE ANNUELLE';
                document.getElementById('table-container-individual').style.display = 'block';
                document.getElementById('annual-view-container').style.display = 'none';
                loadMonthData();
            }
        }
        function refreshViews() {
            renderStaffList();
            if (typeof window.iChefPlanningMasterSyncV217 === 'function') {
                window.iChefPlanningMasterSyncV217({
                    source:'refreshViews',
                    snapshot:getTs(),
                    renderOnly:true
                });
            } else {
                refreshPlanningScreensAfterSync('refreshViews');
            }
        }
        function handleMonthChange() {
            enforceRhPlanningMonthHorizon(true);
            planningAssistantPrediction = null;
            planningAssistantPredictionMonth = null;
            planningAssistantDraft = null;
            const applyBtn = document.getElementById('assistant-apply-btn');
            if (applyBtn) applyBtn.disabled = true;
            loadMonthData();
            loadPublicPlanning();
            if (document.getElementById('ia-predictions-modal')?.classList.contains('show')) {
                renderPlanningAssistantLocal();
                generateIAPrediction(true);
            }
        }
        function renderStaffList() {
            const dir = getDir();
            const container = document.getElementById('staff-list-render');
            if (!container) return;

            let html = '';
            dir.forEach(s => {
                const selected = String(currentStaffId) === String(s.id);
                const sid = escapeRhHtml(String(s.id));
                const statusLabel = s.active === false ? 'DÉSACTIVÉ' : 'ACTIF';

                html += `
                    <div class="staff-card rh-v220-staff-card ${selected ? 'active' : ''}"
                         data-staff-id="${sid}"
                         tabindex="0"
                         role="button"
                         aria-pressed="${selected ? 'true' : 'false'}"
                         aria-label="Ouvrir le planning de ${escapeRhHtml(s.name || 'ce collaborateur')}"
                         style="${s.active === false ? 'opacity:0.62;' : ''}">
                        <div class="rh-v220-staff-main">
                            <div class="staff-name">
                                <span>${escapeRhHtml(s.name)}</span>
                                <span class="rh-v220-staff-state ${s.active === false ? 'off' : 'on'}">${statusLabel}</span>
                            </div>
                            <div class="staff-role">${escapeRhHtml(s.role)} · ${Number(s.contract || 0)} h/sem · ${escapeRhHtml(String(s.dept || '').toUpperCase())}</div>
                            <div class="rh-v220-open-hint">Touchez / cliquez ici pour ouvrir le planning</div>
                        </div>
                        <div class="rh-v220-staff-actions" aria-label="Actions collaborateur">
                            <button type="button" data-staff-action="planning" data-staff-id="${sid}">PLANNING</button>
                            <button type="button" data-staff-action="edit" data-staff-id="${sid}">ÉDITER</button>
                            <button type="button" data-staff-action="documents" data-staff-id="${sid}">DOCUMENTS</button>
                            <button type="button" data-staff-action="toggle" data-staff-id="${sid}">${s.active === false ? 'RÉACTIVER' : 'DÉSACTIVER'}</button>
                            <button type="button" class="wide" data-staff-action="history" data-staff-id="${sid}">HISTORIQUE 360°</button>
                        </div>
                    </div>`;
            });

            container.innerHTML =
                html ||
                '<div class="rh-v220-staff-empty">Aucun collaborateur dans ce département.</div>';

            ensureStaffSidebarInteractionsV220();
            updateDashboardStats();
        }

        function ensureStaffSidebarInteractionsV220() {
            const container = document.getElementById('staff-list-render');
            if (!container || container.dataset.v220Bound === '1') return;
            container.dataset.v220Bound = '1';

            let pressTimer = null;
            let longPressed = false;
            let pressedCard = null;

            function cancelPress() {
                clearTimeout(pressTimer);
                pressTimer = null;
                pressedCard?.classList.remove('staff-pressing');
                pressedCard = null;
            }

            container.addEventListener('pointerdown', event => {
                if (event.target?.closest?.('[data-staff-action]')) return;
                const card = event.target?.closest?.('.rh-v220-staff-card[data-staff-id]');
                if (!card) return;

                longPressed = false;
                cancelPress();
                pressedCard = card;
                card.classList.add('staff-pressing');

                pressTimer = setTimeout(() => {
                    longPressed = true;
                    card.classList.remove('staff-pressing');
                    openStaffBalanceQuick(card.dataset.staffId);
                    try { navigator.vibrate?.(16); } catch (_) {}
                }, 900);
            }, { passive:true });

            ['pointerup','pointercancel','pointerleave'].forEach(type => {
                container.addEventListener(type, event => {
                    if (!event.target?.closest?.('.rh-v220-staff-card')) return;
                    cancelPress();
                }, true);
            });

            container.addEventListener('click', async event => {
                const actionButton = event.target?.closest?.('[data-staff-action][data-staff-id]');
                if (actionButton) {
                    event.preventDefault();
                    event.stopPropagation();

                    const id = actionButton.dataset.staffId;
                    const staff = getDir().find(s => String(s.id) === String(id));
                    if (!staff) {
                        showToast?.('Collaborateur introuvable');
                        return;
                    }

                    const action = actionButton.dataset.staffAction;
                    if (action === 'planning') {
                        selectStaff(staff.id);
                    } else if (action === 'edit') {
                        openStaffModal(staff.pin);
                    } else if (action === 'documents') {
                        window.openStaffDocumentsV103?.(staff.id);
                    } else if (action === 'toggle') {
                        await toggleStaffStatus(staff.id);
                        renderStaffList();
                    } else if (action === 'history') {
                        window.openRhStaffHistoryV138?.(staff.id);
                    }
                    return;
                }

                const card = event.target?.closest?.('.rh-v220-staff-card[data-staff-id]');
                if (!card) return;

                if (longPressed) {
                    longPressed = false;
                    event.preventDefault();
                    return;
                }

                selectStaff(card.dataset.staffId);
            });

            container.addEventListener('keydown', event => {
                if (!['Enter',' '].includes(event.key)) return;
                if (event.target?.closest?.('[data-staff-action]')) return;

                const card = event.target?.closest?.('.rh-v220-staff-card[data-staff-id]');
                if (!card) return;
                event.preventDefault();
                selectStaff(card.dataset.staffId);
            });
        }
        let staffPressTimer = null;
        let staffPressTriggered = false;
        function staffPointerDown(event, staffId) {
            staffPressTriggered = false;
            const card =
                event.currentTarget;
            if (card) {
                card.classList.add('staff-pressing');
            }
            clearTimeout(staffPressTimer);
            staffPressTimer =
                setTimeout(
                    () => {
                        staffPressTriggered = true;
                        if (card) {
                            card.classList.remove('staff-pressing');
                        }
                        openStaffBalanceQuick(
                            staffId
                        );
                    },
                    900
                );
        }
        function staffPointerUp(event) {
            clearTimeout(staffPressTimer);
            if (event?.currentTarget) {
                event.currentTarget.classList.remove('staff-pressing');
            }
        }
        function staffCardClick(event, staffId) {
            if (staffPressTriggered) {
                staffPressTriggered = false;
                event?.preventDefault?.();
                return;
            }
            // Dans l'écran Planning, un clic sur un collaborateur ouvre
            // directement son planning mensuel détaillé. Le dossier RH reste
            // accessible depuis le bouton ÉDITER.
            if (document.getElementById('hr-interface')?.style.display === 'flex') {
                selectStaff(staffId);
                return;
            }
            openStaffDetail(staffId);
        }
        function selectStaff(id) {
            const staff = getDir().find(s => String(s.id) === String(id));
            if (!staff) {
                currentStaffId = null;
                isGlobalView = false;
                isAnnualView = false;
                renderStaffList();
                toggleViewDisplay();
                showToast?.('Collaborateur introuvable');
                return false;
            }

            currentStaffId = staff.id;
            isGlobalView = false;
            isAnnualView = false;

            // V220 : afficher immédiatement la bonne vue sans attendre
            // un bus asynchrone ou une synchronisation serveur.
            renderStaffList();
            toggleViewDisplay();
            loadMonthData();

            try {
                window.iChefPlanningMasterSyncV217?.({
                    source:'staff-selection-v220',
                    snapshot:getTs(),
                    renderOnly:true,
                    forceRender:true
                });
            } catch (_) {}

            try {
                window.syncPlanningLayoutV198?.();
            } catch (_) {}

            window.dispatchEvent(new CustomEvent('ichef:staff-selected',{
                detail:{
                    staffId:staff.id,
                    name:staff.name,
                    at:new Date().toISOString()
                }
            }));

            return true;
        }
        window.selectStaff = selectStaff;

        function openStaffPlanning(staffId) {
            closeModals();
            return selectStaff(staffId);
        }
        function buildStaffMonthDetail(staffId) {
            const staff =
                getDir().find(
                    s =>
                        String(s.id) === String(staffId)
                );
            if (!staff) return null;
            const monthStr =
                document.getElementById('month-selector').value;
            const [year, month] =
                monthStr.split('-').map(Number);
            const daysInMonth =
                new Date(
                    year,
                    month,
                    0
                ).getDate();
            const tsMonth =
                getTs()[monthStr] || {};
            const staffMonth =
                tsMonth?.[staff.id] ||
                tsMonth?.[String(staff.id)] ||
                {};
            const stats =
                getStaffMonthStats(
                    staff.id,
                    year,
                    month,
                    daysInMonth,
                    staffMonth
                ) || {};
            const actual =
                getActualHoursSummary(
                    staff.id,
                    monthStr
                );
            const actualBalance =
                Number(actual.total || 0) -
                Number(stats.adjustedTarget || stats.expected || 0);
            const plannedBalance =
                Number(stats.totalDone || 0) -
                Number(stats.adjustedTarget || stats.expected || 0);
            const rows = [];
            for (
                let day = 1;
                day <= daysInMonth;
                day++
            ) {
                const date =
                    new Date(
                        year,
                        month - 1,
                        day
                    );
                const dayKey = String(day).padStart(2, '0');
                const p =
                    staffMonth?.[dayKey] ||
                    staffMonth?.[String(day)] ||
                    {
                        status: 'off',
                        s1: '',
                        s2: '',
                        pause: 0
                    };
                const planned =
                    calculateNet(p);
                const worked =
                    Number(
                        actual.byDay?.[day] || 0
                    );
                rows.push({
                    day,
                    date,
                    p,
                    planned,
                    worked,
                    difference:
                        Math.round(
                            (
                                worked -
                                planned
                            ) * 100
                        ) / 100
                });
            }
            return {
                staff,
                monthStr,
                year,
                month,
                daysInMonth,
                staffMonth,
                stats,
                actual,
                actualBalance,
                plannedBalance,
                rows
            };
        }
        function rhPunchTimestampV97(p) {
            const numeric = Number(p?.timestamp ?? p?.clientTimestamp ?? 0);
            if (Number.isFinite(numeric) && numeric > 0) return numeric;
            const parsed = Date.parse(String(p?.serverRecordedAt || p?.clientRecordedAt || p?.createdAt || ''));
            return Number.isFinite(parsed) ? parsed : 0;
        }
        function rhPunchDateKeyV97(p) {
            const ts = rhPunchTimestampV97(p);
            if (!ts) return '';
            const d = new Date(ts);
            if (Number.isNaN(d.getTime())) return '';
            return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        }
        function getStaffDayPunchesV97(staffId, date) {
            return getPunches()
                .filter(p => String(p?.staffId ?? '') === String(staffId) && rhPunchDateKeyV97(p) === String(date))
                .sort((a,b) => rhPunchTimestampV97(a) - rhPunchTimestampV97(b));
        }
        function punchTypeLabelV97(type) {
            const t = String(type || '').toUpperCase();
            if (t.includes('IN') || t.includes('ENTR')) return 'ENTRÉE';
            if (t.includes('OUT') || t.includes('SORT')) return 'SORTIE';
            if (t.includes('PAUSE')) return 'PAUSE';
            return t || 'POINTAGE';
        }
        function openProofPhotoV97(src) {
            if (!src || !String(src).startsWith('data:image/')) return;
            const w = window.open('', '_blank', 'noopener,noreferrer');
            if (!w) return;
            w.document.write(`<title>Preuve de pointage</title><body style="margin:0;background:#050505;display:grid;place-items:center;min-height:100vh"><img src="${src}" style="max-width:96vw;max-height:96vh;object-fit:contain"></body>`);
            w.document.close();
        }
        function renderStaffDayProofsV97(staffId, date, limit = 2) {
            const punches = getStaffDayPunchesV97(staffId, date);
            if (!punches.length) return '<span class="proof-chip">AUCUNE<br>PHOTO</span>';
            const withPhoto = punches.filter(p => typeof p?.photo === 'string' && p.photo.startsWith('data:image/'));
            const redacted = punches.filter(p => p?.photoRedacted === true).length;
            const imgs = withPhoto.slice(0, Math.max(1, Number(limit)||2)).map(p => {
                const time = new Date(rhPunchTimestampV97(p)).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
                return `<img src="${p.photo}" alt="Preuve ${escapeRhHtml(punchTypeLabelV97(p.type))} ${time}" title="${escapeRhHtml(punchTypeLabelV97(p.type))} · ${time}" onclick='openProofPhotoV97(${JSON.stringify(p.photo)})'>`;
            }).join('');
            const extra = withPhoto.length > limit ? `<span class="proof-chip">+${withPhoto.length-limit}</span>` : '';
            const noPhoto = !withPhoto.length ? `<span class="proof-chip">${redacted ? 'PHOTO<br>EFFACÉE' : 'HORODATAGE<br>SEUL'}</span>` : '';
            return `<div class="rh-day-proof-v97">${imgs}${extra}${noPhoto}</div>`;
        }
        function renderCorrectionProofsV97(staffId, date) {
            const punches = getStaffDayPunchesV97(staffId, date);
            if (!punches.length) return '<span style="color:var(--text-muted);font-size:.68rem;">Aucun pointage enregistré pour cette journée.</span>';
            return punches.map(p => {
                const ts = rhPunchTimestampV97(p);
                const time = ts ? new Date(ts).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit',second:'2-digit'}) : '-';
                const type = punchTypeLabelV97(p.type);
                const hasPhoto = typeof p?.photo === 'string' && p.photo.startsWith('data:image/');
                const proof = hasPhoto
                    ? `<img src="${p.photo}" alt="${escapeRhHtml(type)}" onclick='openProofPhotoV97(${JSON.stringify(p.photo)})'>`
                    : `<div style="width:54px;height:54px;border:1px solid var(--border);border-radius:7px;display:grid;place-items:center;color:var(--text-muted);font-size:.52rem;text-align:center;">${p?.photoRedacted ? 'PHOTO<br>EFFACÉE' : 'SANS<br>PHOTO'}</div>`;
                return `<div class="rh-correct-v97-proof-card">${proof}<div><strong>${escapeRhHtml(type)}</strong><small>${time}</small><small>${p?.photoRedacted ? 'Photo effacée · preuve horaire conservée' : (hasPhoto ? 'Photo + horodatage' : 'Horodatage')}</small></div></div>`;
            }).join('');
        }
        function openStaffDetail(staffId) {
            const detail =
                buildStaffMonthDetail(
                    staffId
                );
            if (!detail) return;
            const {
                staff,
                monthStr,
                stats,
                actual,
                actualBalance,
                plannedBalance,
                rows,
                year
            } = detail;
            document.getElementById('staff-detail-title').innerText =
                staff.name;
            document.getElementById('staff-detail-subtitle').innerText =
                `${staff.role || ''} · ${String(staff.dept || '').toUpperCase()} · ${monthLabelFr(monthStr)}`;
            const plannedCost =
                Number(stats.totalDone || 0) *
                Number(staff.hourlyCost || 0);
            const actualCost =
                Number(actual.total || 0) *
                Number(staff.hourlyCost || 0);
            document.getElementById('staff-detail-stats').innerHTML = [
                ['Contrat', `${Number(staff.contract || 0).toFixed(1)} h/sem`],
                ['Objectif ajusté', `${Number(stats.adjustedTarget || 0).toFixed(1)} h`],
                ['Planifié', `${Number(stats.totalDone || 0).toFixed(1)} h`],
                ['Effectué', `${Number(actual.total || 0).toFixed(1)} h`],
                ['Solde réel', formatRhSignedHours(actualBalance), rhBalanceClass(actualBalance)],
                ['Solde planning', formatRhSignedHours(plannedBalance), rhBalanceClass(plannedBalance)],
                ['Récup. disponible', `${Number(staff.recoveryBalance || 0).toFixed(1)} h`],
                ['Congés restants', `${Number(stats.cpRestants || 0).toFixed(1)} j`],
                ['Coût planifié', `${plannedCost.toFixed(2)} ${rhCashCurrencySymbolV170(getRhSettings().currency)}`],
                ['Coût pointé', `${actualCost.toFixed(2)} ${rhCashCurrencySymbolV170(getRhSettings().currency)}`],
                ['Absences mois', `${Number(stats.leaveDays || 0).toFixed(1)} j`],
                ['H. supplémentaires', `${Number(stats.extraHours || 0).toFixed(1)} h`]
            ].map(([label, value, cls]) => `
                <div class="rh-detail-stat">
                    <div class="lbl">${escapeRhHtml(label)}</div>
                    <div class="val ${cls || ''}">${escapeRhHtml(value)}</div>
                </div>
            `).join('');
            renderStaffDetailWarningsV149(
                staffId
            );
            document.getElementById('staff-detail-planning-body').innerHTML =
                rows.map(row => {
                    const meta =
                        rhStatusMeta(
                            row.p.status
                        );
                    const shift =
                        [
                            row.p.s1,
                            row.p.s2
                        ]
                            .map(v => String(v ?? '').trim())
                            .filter(v => v && !/^(undefined|null)$/i.test(v))
                            .join(' / ') ||
                        '-';
                    return `
                        <tr>
                            <td>${daysOfWeek[row.date.getDay()].charAt(0)} ${String(row.day).padStart(2, '0')}</td>
                            <td>${escapeRhHtml(meta.label)}</td>
                            <td>${escapeRhHtml(shift)}</td>
                            <td>${row.planned.toFixed(1)} h</td>
                            <td>${row.worked.toFixed(1)} h</td>
                            <td>${renderStaffDayProofsV97(staff.id, `${monthStr}-${String(row.day).padStart(2, '0')}`, 2)}</td>
                            <td class="${rhBalanceClass(row.difference)}">${formatRhSignedHours(row.difference)}</td>
                            <td>
                                ${(() => {
                                    const realDay =
                                        getRealDayForStaff(
                                            staff.id,
                                            monthStr,
                                            row.day
                                        );
                                    const anomalies =
                                        Array.isArray(realDay?.anomalies)
                                            ? realDay.anomalies
                                            : [];
                                    const correction =
                                        realDay?.correction && typeof realDay.correction === 'object'
                                            ? realDay.correction
                                            : null;
                                    const date =
                                        `${monthStr}-${String(row.day).padStart(2, '0')}`;
                                    const locked =
                                        String(
                                            getRealSheetForStaff(
                                                staff.id,
                                                monthStr
                                            )?.status || ''
                                        ).toUpperCase() === 'LOCKED';
                                    const controlLabel = correction
                                        ? `CORRIGÉ${correction.reason ? ' · ' + escapeRhHtml(correction.reason) : ''}`
                                        : (anomalies.length
                                            ? anomalies.map(a => escapeRhHtml(a.label || a.code || a)).join(' · ')
                                            : 'OK');
                                    return `
                                        <div style="display:flex;flex-direction:column;gap:5px;">
                                            <span style="color:${correction ? 'var(--success)' : (anomalies.length ? 'var(--warning)' : 'var(--success)')};font-size:.68rem;font-weight:800;max-width:180px;overflow-wrap:anywhere;">
                                                ${controlLabel}
                                            </span>
                                            ${correction && anomalies.length ? `<span style="color:var(--text-muted);font-size:.55rem;">Anomalie d’origine conservée dans la preuve</span>` : ''}
                                            <button class="btn-outline"
                                                    style="padding:5px 7px;font-size:.62rem;${locked ? 'border-color:rgba(245,158,11,.42);color:#e7c47b;' : ''}"
                                                    onclick="correctRealTimesheetDay(${JSON.stringify(staff.id)}, '${date}')">
                                                ${correction ? 'MODIFIER CORRECTION' : (locked ? 'CORRIGER · CLÔTURÉ' : 'CORRIGER')}
                                            </button>
                                        </div>
                                    `;
                                })()}
                            </td>
                        </tr>
                    `;
                }).join('');
            const skills =
                Array.isArray(staff.skills) &&
                staff.skills.length
                    ? staff.skills
                    : [];
            document.getElementById('staff-detail-profile').innerHTML = `
                <div><strong>Niveau :</strong> ${escapeRhHtml(staff.skillLevel || 'autonome')}</div>
                <div><strong>Disponibilités :</strong> ${escapeRhHtml(staff.availability || 'Aucune contrainte renseignée')}</div>
                <div><strong>Repos minimum :</strong> ${Number(staff.minRestHours ?? 11).toFixed(1)} h</div>
                <div><strong>Alerte jours consécutifs :</strong> ${Number(staff.maxConsecutiveDays ?? 6)} j</div>
                <div style="margin-top:8px;">
                    ${skills.length
                        ? skills.map(skill => `<span class="rh-badge-mini">${escapeRhHtml(skill)}</span>`).join('')
                        : '<span style="color:var(--text-muted);">Aucune compétence spécifique renseignée.</span>'
                    }
                </div>
            `;
            const leaveCounts =
                stats.leaveCounts || {};
            const leaveLines =
                Object.entries(leaveCounts)
                    .filter(([, value]) => Number(value) > 0)
                    .map(([status, value]) =>
                        `<div><strong>${escapeRhHtml(rhStatusMeta(status).label)} :</strong> ${Number(value)} j</div>`
                    );
            document.getElementById('staff-detail-leaves').innerHTML = `
                <div><strong>Droits annuels :</strong> ${Number(staff.annualLeaveDays ?? 25).toFixed(1)} j</div>
                <div><strong>Report :</strong> ${Number(staff.leaveCarryover ?? 0).toFixed(1)} j</div>
                <div><strong>CP pris année :</strong> ${Number(stats.annualCPUsed || 0).toFixed(1)} j</div>
                <div><strong>CP restants :</strong> ${Number(stats.cpRestants || 0).toFixed(1)} j</div>
                ${leaveLines.join('')}
            `;
            const history =
                getRhChangeHistory()
                    .filter(row =>
                        String(row.staffId || '') === String(staff.id)
                    )
                    .slice(-12)
                    .reverse();
            document.getElementById('staff-detail-history').innerHTML =
                history.length
                    ? history.map(row => {
                        const d =
                            new Date(
                                row.timestamp
                            );
                        return `
                            <div style="padding:6px 0;border-bottom:1px solid var(--border);">
                                <strong>${d.toLocaleString('fr-FR')}</strong><br>
                                ${escapeRhHtml(row.message || row.type || 'Modification')}
                            </div>
                        `;
                    }).join('')
                    : '<span style="color:var(--text-muted);">Aucune modification enregistrée.</span>';
            document.getElementById('staff-detail-planning-btn').onclick =
                () => openStaffPlanning(staff.id);
            document.getElementById('staff-detail-edit-btn').onclick =
                () => {
                    closeModals();
                    openStaffModal(staff.pin);
                };
            const modal =
                document.getElementById('staff-detail-modal');
            if (modal) {
                modal.classList.add('show');
                modal.style.display = 'flex';
            }
        }
        function openStaffBalanceQuick(staffId) {
            const detail =
                buildStaffMonthDetail(
                    staffId
                );
            if (!detail) return;
            const {
                staff,
                monthStr,
                stats,
                actual,
                actualBalance,
                plannedBalance,
                year
            } = detail;
            const cumulativeActual =
                getCumulativeActualHours(
                    staff.id,
                    year
                );
            document.getElementById('staff-balance-title').innerText =
                staff.name;
            document.getElementById('staff-balance-period').innerText =
                `${monthLabelFr(monthStr)} · appui long 0,9 s`;
            const balanceEl =
                document.getElementById('staff-balance-value');
            balanceEl.className =
                `rh-quick-balance ${rhBalanceClass(actualBalance)}`;
            balanceEl.innerText =
                formatRhSignedHours(
                    actualBalance
                );
            document.getElementById('staff-balance-label').innerText =
                actualBalance < -0.05
                    ? 'HEURES À RATTRAPER / À PLANIFIER'
                    : actualBalance > 0.05
                        ? 'HEURES AU-DESSUS DE L’OBJECTIF AJUSTÉ'
                        : 'ÉQUILIBRE ATTEINT';
            document.getElementById('staff-balance-grid').innerHTML = [
                ['Objectif mois', `${Number(stats.adjustedTarget || 0).toFixed(1)} h`],
                ['Planifié', `${Number(stats.totalDone || 0).toFixed(1)} h`],
                ['Effectué', `${Number(actual.total || 0).toFixed(1)} h`],
                ['Solde planning', formatRhSignedHours(plannedBalance)],
                ['Récup. disponible', `${Number(staff.recoveryBalance || 0).toFixed(1)} h`],
                ['Congés restants', `${Number(stats.cpRestants || 0).toFixed(1)} j`],
                ['Pointé année', `${Number(cumulativeActual || 0).toFixed(1)} h`],
                ['Absences mois', `${Number(stats.leaveDays || 0).toFixed(1)} j`]
            ].map(([label, value]) => `
                <div class="rh-detail-stat">
                    <div class="lbl">${escapeRhHtml(label)}</div>
                    <div class="val">${escapeRhHtml(value)}</div>
                </div>
            `).join('');
            const modal =
                document.getElementById('staff-balance-modal');
            if (modal) {
                modal.classList.add('show');
                modal.style.display = 'flex';
            }
        }
        function loadMonthData() {
            const monthStr = document.getElementById('month-selector').value;
            const [year, month] = monthStr.split('-').map(Number);
            const daysInMonth = new Date(year, month, 0).getDate();
            const tsMonth = getTs()[monthStr] || {};
            renderPlanningProSummary(year, month, daysInMonth, tsMonth);
            if(isGlobalView) renderGlobalView(year, month, daysInMonth, tsMonth);
            else if(currentStaffId) renderIndividualView(currentStaffId, year, month, daysInMonth, tsMonth);
        }
        function toggleViewMode() {
            isGlobalView = !isGlobalView; isAnnualView = false; currentStaffId = null;
            refreshViews(); toggleViewDisplay();
        }
        function toggleViewDisplay() {
            const btn = document.getElementById('btn-toggle-view');
            const indCont = document.getElementById('table-container-individual');
            const globCont = document.getElementById('global-view-container');
            const annCont = document.getElementById('annual-view-container');
            const empty = document.getElementById('empty-state');
            const head = document.getElementById('individual-header-controls');
            const stats = document.getElementById('dashboard-stats-panel');
            if(isGlobalView) {
                btn.innerHTML = 'VUE INDIVIDUELLE';
                empty.style.display = 'none'; indCont.style.display = 'none'; annCont.style.display = 'none';
                head.style.display = 'none'; stats.style.display = 'none'; globCont.style.display = 'block';
            } else if (currentStaffId) {
                btn.innerHTML = 'VUE GLOBALE';
                empty.style.display = 'none'; globCont.style.display = 'none';
                annCont.style.display = isAnnualView ? 'block' : 'none';
                indCont.style.display = isAnnualView ? 'none' : 'block';
                head.style.display = 'flex'; stats.style.display = 'grid';
            } else {
                btn.innerHTML = 'VUE GLOBALE';
                empty.style.display = 'flex'; indCont.style.display = 'none'; annCont.style.display = 'none';
                globCont.style.display = 'none'; head.style.display = 'none'; stats.style.display = 'none';
            }
        }
        function renderIndividualView(staffId, year, month, daysInMonth, tsMonth) {
            const staff = getDir().find(s => String(s.id) === String(staffId));
            if(!staff) return;
            const staffMonth =
                tsMonth?.[staff.id] ||
                tsMonth?.[String(staff.id)] ||
                {};
            document.getElementById('individual-title').innerText = `${staff.name} - ${monthNames[month-1]} ${year}`;
            let stats = getStaffMonthStats(staff.id, year, month, daysInMonth, staffMonth) || { expected: 0, totalDone: 0, extraHours: 0, totalRecup: 0, countCP: 0, countM: 0, countF: 0, missedHours: 0, cpRestants: 0 };
            document.getElementById('stat-expected').innerText = stats.expected.toFixed(1) + 'h';
            document.getElementById('stat-actual').innerText = stats.totalDone.toFixed(1) + 'h';
            document.getElementById('stat-sup').innerText = '+' + stats.extraHours.toFixed(1) + 'h';
            document.getElementById('stat-recup').innerText = stats.totalRecup.toFixed(1) + 'h';
            document.getElementById('stat-cp').innerText = stats.countCP + 'j';
            document.getElementById('stat-cp-rest').innerText = stats.cpRestants + 'j';
            document.getElementById('stat-ferie').innerText = stats.countF + 'j';
            document.getElementById('stat-maladie').innerText = stats.countM + 'j';
            document.getElementById('stat-h-due').innerText = stats.missedHours.toFixed(1) + 'h';
            document.getElementById('stat-off-due').innerText = Math.floor(stats.missedHours / 7) + 'j';
            if(stats.extraHours > 10) document.getElementById('sup-alert').classList.add('highlight');
            else document.getElementById('sup-alert').classList.remove('highlight');
            const sid = JSON.stringify(staff.id);
            let html = '';
            for(let d=1; d<=daysInMonth; d++) {
                const dateObj = new Date(year, month-1, d);
                const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
                const p = staffMonth[d] || {status:'off', poste: staff.dept, s1:'', s2:'', pause:0, obs:''};
                const h = calculateNet(p);
                let currentPoste = p.poste || staff.dept;
                html += `<tr class="${isWeekend ? 'weekend' : ''}">
                    <td><div class="v167-day-date">${daysOfWeek[dateObj.getDay()].charAt(0)} ${String(d).padStart(2,'0')}/${String(month).padStart(2,'0')}</div></td>
                    <td>
                        <select class="status-sel" onchange='updateData(${sid}, ${d}, "status", this.value)'>
                            ${renderPlanningStatusOptions(p.status, false)}
                        </select>
                    </td>
                    <td>
                        <select class="status-sel" style="width:110px; border-color:var(--border-strong);" onchange='updateData(${sid}, ${d}, "poste", this.value)' ${p.status!=='present'&&p.status!=='off_matin'&&p.status!=='off_soir'&&p.status!=='ferie'?'disabled':''}>
                            <option value="salle" ${currentPoste==='salle'?'selected':''}>🍷 Salle</option>
                            <option value="cuisine" ${currentPoste==='cuisine'?'selected':''}>🍳 Cuisine</option>
                            <option value="patisserie" ${currentPoste==='patisserie'?'selected':''}>🍰 Pâtisserie</option>
                            <option value="bar" ${currentPoste==='bar'?'selected':''}>🍸 Bar</option>
                            <option value="admin" ${currentPoste==='admin'?'selected':''}>💼 Admin</option>
                        </select>
                    </td>
                    <td><input type="text" class="shift-inp" value="${p.s1}" placeholder="10:00-15:00" onchange='updateData(${sid}, ${d}, "s1", this.value)' ${p.status!=='present'&&p.status!=='off_soir'&&p.status!=='ferie'?'disabled':''}></td>
                    <td><input type="text" class="shift-inp" value="${p.s2}" placeholder="18:00-23:00" onchange='updateData(${sid}, ${d}, "s2", this.value)' ${p.status!=='present'&&p.status!=='off_matin'&&p.status!=='ferie'?'disabled':''}></td>
                    <td><input type="number" class="pause-inp" value="${p.pause}" placeholder="30" onchange='updateData(${sid}, ${d}, "pause", this.value)' ${p.status!=='present'&&p.status!=='off_matin'&&p.status!=='off_soir'&&p.status!=='ferie'?'disabled':''}></td>
                    <td style="font-weight:bold; color:var(--hr);">${h > 0 ? h.toFixed(1)+'h' : '-'}</td>
                    <td><input type="text" class="obs-inp" value="${p.obs}" placeholder="Observation..." onchange='updateData(${sid}, ${d}, "obs", this.value)'></td>
                </tr>`;
            }
            document.getElementById('timesheet-body').innerHTML = html;
        }
        async function updateData(staffId, day, key, val) {
            const settings = getRhSettings();
            if (settings.planningStatus === 'locked') {
                alert("Ce planning est clôturé / verrouillé. Passez-le en Brouillon pour le modifier.");
                loadMonthData();
                return;
            }
            const monthStr = document.getElementById('month-selector').value;
            const ts = getTs();
            const staff = getDir().find(s => String(s.id) === String(staffId));
            if(!ts[monthStr]) ts[monthStr] = {};
            const sid = String(staffId);
            if(!ts[monthStr][sid]) ts[monthStr][sid] = {};
            if(!ts[monthStr][sid][day]) ts[monthStr][sid][day] = {status:'off', poste: staff ? staff.dept : 'salle', s1:'', s2:'', pause:0, obs:'', managerNote:''};
            const previousSnapshot = JSON.parse(JSON.stringify(ts[monthStr][sid][day] || {}));
            const oldValue = String(previousSnapshot?.[key] ?? '');
            if(oldValue === String(val ?? '')) { loadMonthData(); return; }
            const reason = String(prompt(`Pourquoi modifiez-vous le planning de ${staff?.name || 'ce collaborateur'} ?\n\nCe motif sera conservé 5 ans dans l'historique.`) || '').trim().slice(0,180);
            if(!reason){
                alert('Modification annulée : un motif est obligatoire.');
                loadMonthData();
                return;
            }
            ts[monthStr][sid][day][key] = val;
            if (key === 'status') {
                if (!isRhWorkStatus(val)) {
                    ts[monthStr][sid][day].s1 = '';
                    ts[monthStr][sid][day].s2 = '';
                    ts[monthStr][sid][day].pause = 0;
                } else if (val === 'present') {
                    if (!ts[monthStr][sid][day].s1) {
                        ts[monthStr][sid][day].s1 = '10:00-14:45';
                    }
                    if (!ts[monthStr][sid][day].s2) {
                        ts[monthStr][sid][day].s2 = '18:00-22:45';
                    }
                    ts[monthStr][sid][day].pause = 30;
                } else if (val === 'off_soir') {
                    if (!ts[monthStr][sid][day].s1) {
                        ts[monthStr][sid][day].s1 = '10:00-14:45';
                    }
                    ts[monthStr][sid][day].s2 = '';
                    ts[monthStr][sid][day].pause = 0;
                } else if (val === 'off_matin') {
                    ts[monthStr][sid][day].s1 = '';
                    if (!ts[monthStr][sid][day].s2) {
                        ts[monthStr][sid][day].s2 = '18:00-22:45';
                    }
                    ts[monthStr][sid][day].pause = 0;
                }
            }
            const auditAt = new Date().toISOString();
            const auditBy = typeof window.rhAuditActorV94==='function' ? window.rhAuditActorV94() : 'Direction / RH';
            ts[monthStr][sid][day].lastChangeReason = reason;
            ts[monthStr][sid][day].lastChangeAt = auditAt;
            ts[monthStr][sid][day].lastChangeBy = auditBy;
            ts[monthStr][sid][day].updatedAt = auditAt;
            const afterSnapshot = JSON.parse(JSON.stringify(ts[monthStr][sid][day]));
            if(typeof recordRhChange==='function') recordRhChange({
                type:'PLANNING_MANUAL_EDIT',source:'DIRECTION_INDIVIDUAL',staffId:sid,
                staffName:String(staff?.name||''),date:`${monthStr}-${String(day).padStart(2,'0')}`,month:monthStr,day:Number(day),
                reason,managerNote:String(afterSnapshot.managerNote||''),by:auditBy,before:previousSnapshot,after:afterSnapshot,
                message:`Planning modifié · ${monthStr}-${String(day).padStart(2,'0')} · ${reason}`
            });
            const savePromise = saveTs(ts);
            // L'affichage reste immédiat grâce au snapshot local de saveTs().
            loadMonthData();
            loadPublicPlanning();
            broadcastStaffingLevels();
            const cloudSaved = await savePromise;
            if (!cloudSaved) {
                console.warn(
                    '[iCHEF RH V84] modification planning locale en attente de synchronisation serveur',
                    { staffId, day, key }
                );
            }
        }
        function renderPlanningProSummary(year, month, daysInMonth, tsMonth) {
            const activeStaff = getDir().filter(s => s.active !== false);
            let plannedHours = 0;
            let targetHours = 0;
            let missingHours = 0;
            let underCount = 0;
            let overCount = 0;
            activeStaff.forEach(staff => {
                const staffMonth =
                    tsMonth?.[staff.id] ||
                    tsMonth?.[String(staff.id)] ||
                    {};
                const stats =
                    getStaffMonthStats(
                        staff.id,
                        year,
                        month,
                        daysInMonth,
                        staffMonth
                    ) || {};
                const planned = Number(stats.totalDone || 0);
                const target = Number(stats.adjustedTarget ?? stats.expected ?? 0);
                const delta = planned - target;
                plannedHours += planned;
                targetHours += target;
                if (delta < -0.5) {
                    underCount++;
                    missingHours += Math.abs(delta);
                }
                if (delta > 2) overCount++;
            });
            const pendingRequests =
                (typeof getReqs === 'function' ? getReqs() : [])
                    .filter(r => {
                        const status = String(r?.status || 'pending').toLowerCase();
                        return ![
                            'approved','accepte','accepté','valide','validé',
                            'rejected','refuse','refusé'
                        ].includes(status);
                    }).length;
            const alerts = [];
            if (pendingRequests > 0) {
                alerts.push({
                    tone: 'attn',
                    text: `${pendingRequests} demande${pendingRequests > 1 ? 's' : ''} à traiter`
                });
            }
            if (underCount > 0) {
                alerts.push({
                    tone: 'attn',
                    text: `${underCount} collaborateur${underCount > 1 ? 's' : ''} à compléter`
                });
            }
            if (overCount > 0) {
                alerts.push({
                    tone: 'attn',
                    text: `${overCount} collaborateur${overCount > 1 ? 's' : ''} au-dessus de l’objectif`
                });
            }
            if (!alerts.length) {
                alerts.push({
                    tone: 'good',
                    text: 'Planning à jour'
                });
            }
            const put = (id, value) => {
                const el = document.getElementById(id);
                if (el) el.textContent = value;
            };
            put('pro-kpi-staff', String(activeStaff.length));
            put('pro-kpi-hours', `${plannedHours.toFixed(1)} h`);
            put('pro-kpi-target', `objectif ${targetHours.toFixed(1)} h`);
            put('pro-kpi-missing', `${missingHours.toFixed(1)} h`);
            put('pro-kpi-under', `${underCount} collaborateur${underCount > 1 ? 's' : ''} à compléter`);
            put('pro-kpi-requests', String(pendingRequests));
           const alertBox = document.getElementById('planning-pro-alerts');
            if (alertBox) {
                alertBox.innerHTML =
                    `<span class="planning-pro-label">À traiter</span>` +
                    alerts.slice(0, 4).map(item =>
                        `<span class="planning-pro-chip ${item.tone}">${escapeRhHtml(item.text)}</span>`
                    ).join('');
            }
        }
        function renderGlobalView(year, month, daysInMonth, tsMonth) {
            const dir = getDir().filter(s => s.active !== false);
            const today = new Date();
            const sameMonth = today.getFullYear() === year && (today.getMonth() + 1) === month;
            let headHtml = `<tr><th class="sticky-col">COLLABORATEUR</th>`;
            for (let d = 1; d <= daysInMonth; d++) {
                const dateObj = new Date(year, month - 1, d);
                const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
                const isToday = sameMonth && today.getDate() === d;
                headHtml += `
                    <th class="${isWeekend ? 'weekend-head' : ''} ${isToday ? 'today-head' : ''}">
                        <div class="v167-day-date">${daysOfWeek[dateObj.getDay()].charAt(0)} ${String(d).padStart(2, '0')}</div>
                    </th>`;
            }
            headHtml += `<th>TOTAL</th></tr>`;
            document.getElementById('global-thead').innerHTML = headHtml;
            let bodyHtml = '';
            dir.forEach(staff => {
                let totalH = 0;
                const sid = JSON.stringify(staff.id);
                const staffMonth =
                    tsMonth?.[staff.id] ||
                    tsMonth?.[String(staff.id)] ||
                    {};
                let rowHtml = `
                    <tr>
                        <td class="sticky-col"
                            style="cursor:pointer;user-select:none;"
                            onpointerdown='staffPointerDown(event, ${sid})'
                            onpointerup='staffPointerUp(event)'
                            onpointercancel='staffPointerUp(event)'
                            onpointerleave='staffPointerUp(event)'
                            onclick='staffCardClick(event, ${sid})'>
                            <div class="rh-matrix-person">
                                <strong>${escapeRhHtml(staff.name || 'Collaborateur')}</strong>
                                <small>${escapeRhHtml(staff.role || staff.dept || '')} · ${Number(staff.contract || 0).toFixed(0)} h/sem</small>
                            </div>
                        </td>`;
                for (let d = 1; d <= daysInMonth; d++) {
                    const dateObj = new Date(year, month - 1, d);
                    const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
                    const isToday = sameMonth && today.getDate() === d;
                    const p = staffMonth?.[d] || staffMonth?.[String(d)] || { status:'off' };
                    const status = String(p.status || 'off');
                    const meta = window.iChefPlanningMetaV202?.(p) || rhStatusMeta(status);
                    const net = calculateNet(p);
                    totalH += net;
                    const schedule = [p.s1, p.s2].filter(Boolean).join(' / ');
                    const managerNote = String(p.managerNote || p.manager_note || '').trim().slice(0, 40);
                    const title = `${meta.label}${meta.meaning ? ' · ' + meta.meaning : ''}${schedule ? ' · ' + schedule : ''}${net > 0 ? ' · ' + net.toFixed(1) + ' h' : ''}${managerNote ? ' · Note: ' + managerNote : ''}`;
                    rowHtml += `
                        <td class="${isWeekend ? 'weekend-cell' : ''} ${isToday ? 'today-cell' : ''}" title="${escapeRhHtml(title)}">
                            <button
                                type="button"
                                class="status-select-cell rh-status-quick-btn status-${escapeRhHtml(status)}"
                                aria-label="${escapeRhHtml(staff.name || 'Collaborateur')} - ${d}/${month} - ${escapeRhHtml(meta.label)}${managerNote ? ' - ' + escapeRhHtml(managerNote) : ''}"
                                data-rh-staff="${escapeRhHtml(String(staff.id))}"
                                data-rh-day="${d}"
                                data-rh-category="${escapeRhHtml(String(p.categoryId || status))}"
                                onclick='openRhQuickStatus(event, ${sid}, ${d})'>
                                <span class="rh-cell-status">${escapeRhHtml(meta.short)}</span>
                                ${managerNote ? `<span class="rh-cell-note">${escapeRhHtml(managerNote)}</span>` : ''}
                            </button>
                        </td>`;
                }
                rowHtml += `<td class="rh-matrix-total">${totalH.toFixed(1)} h</td></tr>`;
                bodyHtml += rowHtml;
            });
            document.getElementById('global-tbody').innerHTML =
                bodyHtml ||
                '<tr><td colspan="35" style="text-align:center;padding:28px;color:#7b818a;">Aucun collaborateur actif.</td></tr>';
        }
       // ==========================================
// CAMERA POINTEUSE — PIN CENTRAL iCHEF
// ==========================================
function updatePunchClockDisplay() {
    const now = new Date();
    const timeEl = document.getElementById('punch-clock-time');
    const dateEl = document.getElementById('punch-clock-date');
    if (timeEl) {
        timeEl.innerText = now.toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }
    if (dateEl) {
        dateEl.innerText = now.toLocaleDateString('fr-FR', {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });
    }
}
function startPunchClockDisplay() {
    updatePunchClockDisplay();
    if (punchClockTimer) {
        clearInterval(punchClockTimer);
    }
    punchClockTimer = setInterval(updatePunchClockDisplay, 1000);
}
function stopPunchClockDisplay() {
    if (punchClockTimer) {
        clearInterval(punchClockTimer);
        punchClockTimer = null;
    }
}
function activatePunchKioskMode(requestFullscreen = true) {
    punchKioskMode = true;
    // Mode borne volontairement NON persistant : un rechargement revient au menu RH.
    localStorage.removeItem('ichef_rh_kiosk_mode');
    if (requestFullscreen && !document.fullscreenElement) {
        const elem = document.documentElement;
        if (elem.requestFullscreen) elem.requestFullscreen().catch(() => {});
        else if (elem.webkitRequestFullscreen) elem.webkitRequestFullscreen();
    }
    openPunchClock(true);
}
function requestExitPunchKiosk() {
    if (!punchKioskMode) {
        cancelPunchClock();
        return;
    }
    loginMode = 'exit-kiosk';
    currentPin = "";
    const staffContainer = document.getElementById('staff-select-container');
    if (staffContainer) staffContainer.style.display = 'none';
    document.getElementById('pin-display').innerText = "";
    document.getElementById('pin-dept-title').innerText = "PIN DIRECTION — QUITTER POINTEUSE";
    document.getElementById('pin-modal').style.display = 'flex';
}
function deactivatePunchKioskMode() {
    punchKioskMode = false;
    localStorage.removeItem('ichef_rh_kiosk_mode');
    cancelPunchClock(true);
    if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
    }
}
function openPunchClock(asKiosk = false) {
    if (asKiosk) {
        punchKioskMode = true;
    }
    const landing = document.getElementById('landing-portal');
    const modal = document.getElementById('punch-modal');
    const overlay = document.getElementById('punch-success-overlay');
    if (landing) landing.style.display = 'none';
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.toggle('punch-kiosk-active', punchKioskMode);
    }
    if (overlay) overlay.style.display = 'none';
    clearPunchPin();
    startPunchClockDisplay();
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        videoStream = null;
    }
    navigator.mediaDevices
        .getUserMedia({ video: { facingMode: "user" } })
        .then(function(stream) {
            videoStream = stream;
            const video = document.getElementById('punch-video');
            if (video) video.srcObject = stream;
        })
        .catch(function(err) {
            console.error("Camera error:", err);
            alert("Erreur : accès à la caméra refusé ou introuvable.");
        });
}
function cancelPunchClock(force = false) {
    if (punchKioskMode && !force) {
        return;
    }
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        videoStream = null;
    }
    stopPunchClockDisplay();
    clearPunchPin();
    const modal = document.getElementById('punch-modal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('punch-kiosk-active');
    }
    const overlay = document.getElementById('punch-success-overlay');
    if (overlay) overlay.style.display = 'none';
    const landing = document.getElementById('landing-portal');
    if (landing) landing.style.display = 'flex';
}
// ==========================================
// EFFACER LE PIN
// ==========================================
function clearPunchPin() {
    punchPin = "";
    const display =
        document.getElementById(
            'punch-display'
        );
    if (display) {
        display.innerText = "";
    }
}
// ==========================================
// EFFACER LE DERNIER CHIFFRE
// ==========================================
function deleteLastPunchPin() {
    if (!punchPin.length) {
        return;
    }
    punchPin =
        punchPin.slice(
            0,
            -1
        );
    const display =
        document.getElementById(
            'punch-display'
        );
    if (display) {
        display.innerText =
            '●'.repeat(
                punchPin.length
            );
    }
}
// ==========================================
// AJOUTER UN CHIFFRE
// PIN iCHEF : 4 À 12 CHIFFRES
// ==========================================
function appendPunchPin(n) {
    if (punchPin.length >= 12) {
        return;
    }
    const digit =
        String(n);
    if (!/^\d$/.test(digit)) {
        return;
    }
    punchPin += digit;
    const display =
        document.getElementById(
            'punch-display'
        );
    if (display) {
        display.innerText =
            '●'.repeat(
                punchPin.length
            );
    }
}
// ==========================================
// ENVOYER LE POINTAGE
// ==========================================
async function submitPunch() {
    const enteredPin =
        String(
            punchPin || ''
        ).trim();
    // ======================================
    // 1. FORMAT PIN
    // ======================================
    if (
        !/^\d{4,12}$/.test(
            enteredPin
        )
    ) {
        alert(
            "Le code PIN doit contenir entre 4 et 12 chiffres."
        );
        clearPunchPin();
        return;
    }
    // ======================================
    // ANTI DOUBLE-CLIC / DOUBLE POINTAGE
    // ======================================
    if (
        punchSubmitInFlight
    ) {
        return;
    }
    punchSubmitInFlight = true;
    let serverConfirmed = false;
    try {
        // ==================================
        // 2. IDENTIFICATION LOCALE RAPIDE
        // ==================================
        // Le STAFF_ACCESS est déjà maintenu à jour
        // par Socket.IO + rafraîchissement périodique.
        // Aucun appel /verify-pin n'est nécessaire ici.
        let staff =
            getDir().find(
                s =>
                    String(
                        s.pin || ''
                    ).trim() ===
                        enteredPin &&
                    s.active !== false
            );
        // ==================================
        // FALLBACK UNIQUEMENT SI CACHE EN RETARD
        // ==================================
        // Exemple : PIN changé dans Admin il y a quelques secondes.
        if (!staff) {
            await refreshRhStaffFromServer();
            staff =
                getDir().find(
                    s =>
                        String(
                            s.pin || ''
                        ).trim() ===
                            enteredPin &&
                        s.active !== false
                );
        }
        if (!staff) {
            alert(
                "CODE PIN INVALIDE OU COLLABORATEUR INACTIF"
            );
            return;
        }
        // ==================================
        // 3. PHOTO POINTEUSE
        // ==================================
        const video =
            document.getElementById(
                'punch-video'
            );
        const canvas =
            document.getElementById(
                'punch-canvas'
            );
        if (
            !video ||
            !canvas
        ) {
            throw new Error(
                "Caméra pointeuse indisponible."
            );
        }
        const context =
            canvas.getContext(
                '2d'
            );
        if (!context) {
            throw new Error(
                "Impossible de capturer la photo de pointage."
            );
        }
        canvas.width = 320;
        canvas.height = 240;
        context.drawImage(
            video,
            0,
            0,
            canvas.width,
            canvas.height
        );
        const photo =
            canvas.toDataURL(
                'image/jpeg',
                0.55
            );
        // ==================================
        // 4. UN SEUL APPEL SERVEUR PRINCIPAL
        // ==================================
        // /api/rh/punch vérifie à nouveau staffId + PIN.
        // L'écran vert ne s'affiche qu'après confirmation serveur.
        const response =
            await fetch(
                `${SERVER_URL_JS}/api/rh/punch`,
                {
                    method:
                        'POST',
                    headers: {
                        'Content-Type':
                            'application/json',
                        'Accept':
                            'application/json'
                    },
                    cache:
                        'no-store',
                    body:
                        JSON.stringify({
                            tenantID:
                                tenantID_JS,
                            staffId:
                                staff.id,
                            pin:
                                enteredPin,
                            deviceId:
                                RH_DEVICE_ID,
                            photo
                        })
                }
            );
        const data =
            await response
                .json()
                .catch(
                    () => ({})
                );
        if (
            !response.ok ||
            !data.success
        ) {
            throw new Error(
                data.error ||
                "Impossible d'enregistrer le pointage."
            );
        }
        serverConfirmed = true;
        // ==================================
        // 5. CONFIRMATION VISUELLE IMMÉDIATE
        // ==================================
        const successOverlay =
            document.getElementById(
                'punch-success-overlay'
            );
        if (successOverlay) {
            const isEntry =
                data.punchType ===
                'ENTRÉE';
            successOverlay.style.background =
                isEntry
                    ? 'rgba(16,185,129,.96)'
                    : 'rgba(56,189,248,.96)';
            successOverlay.style.display =
                'flex';
            const titleEl =
                document.getElementById(
                    'punch-success-title'
                );
            const nameEl =
                document.getElementById(
                    'punch-success-name'
                );
            const timeEl =
                document.getElementById(
                    'punch-success-time'
                );
            if (titleEl) {
                titleEl.innerText =
                    isEntry
                        ? 'ENTRÉE ENREGISTRÉE'
                        : 'SORTIE ENREGISTRÉE';
            }
            if (nameEl) {
                nameEl.innerText =
                    data.punch?.staffName ||
                    staff.name ||
                    'Collaborateur';
            }
            if (timeEl) {
                const punchTimestamp =
                    data.punch?.timestamp ||
                    Date.now();
                timeEl.innerText =
                    new Date(
                        punchTimestamp
                    ).toLocaleTimeString(
                        'fr-FR',
                        {
                            hour:
                                '2-digit',
                            minute:
                                '2-digit',
                            second:
                                '2-digit'
                        }
                    );
            }
        }
        clearPunchPin();
        if (
            typeof showToast ===
            'function'
        ) {
            showToast(
                data.punchType ===
                    'ENTRÉE'
                    ? 'Entrée enregistrée'
                    : 'Sortie enregistrée'
            );
        }
        // ==================================
        // 6. FERMER APRÈS SUCCÈS
        // ==================================
        setTimeout(
            () => {
                const overlay =
                    document.getElementById(
                        'punch-success-overlay'
                    );
                if (
                    punchKioskMode
                ) {
                    if (overlay) {
                        overlay.style.display =
                            'none';
                    }
                    clearPunchPin();
                    updatePunchClockDisplay();
                } else {
                    cancelPunchClock();
                }
            },
            1200
        );
        // ==================================
        // 7. SYNCHRONISATION EN ARRIÈRE-PLAN
        // ==================================
        // Rien ici ne retarde la confirmation de l'employé.
        setTimeout(
            () => {
                try {
                    if (
                        Array.isArray(
                            data.punches
                        )
                    ) {
                        storePunchesNoLoss(
                            data.punches,
                            'submitPunch-server-response'
                        );
                    }
                    if (
                        data.timesheets
                    ) {
                        saveRealTimesheetsLocal(
                            data.timesheets
                        );
                    }
                    if (
                        Array.isArray(
                            data.staffAccess
                        )
                    ) {
                        staffAccess =
                            data.staffAccess;
                        localStorage.setItem(
                            'empire_hr_directory',
                            JSON.stringify(
                                buildRhDirectoryFromServer(
                                    staffAccess,
                                    getDir()
                                )
                            )
                        );
                    }
                    if (
                        document.getElementById(
                            'logs-interface'
                        )?.style.display ===
                            'flex' &&
                        typeof renderLogs ===
                            'function'
                    ) {
                        renderLogs();
                    }
                    if (
                        document.getElementById(
                            'timesheets-interface'
                        )?.style.display ===
                            'flex' &&
                        typeof renderRealTimesheets ===
                            'function'
                    ) {
                        renderRealTimesheets();
                    }
                    if (
                        typeof broadcastStaffingLevels ===
                        'function'
                    ) {
                        Promise.resolve(
                            broadcastStaffingLevels()
                        ).catch(
                            error =>
                                console.warn(
                                    'Synchronisation Anti-Rush différée :',
                                    error
                                )
                        );
                    }
                } catch (syncError) {
                    console.warn(
                        '[iCHEF RH] Pointage enregistré, erreur UI secondaire :',
                        syncError
                    );
                }
            },
            0
        );
    } catch (error) {
        console.error(
            "Erreur pointage :",
            error
        );
        if (!serverConfirmed) {
            alert(
                error?.message ||
                "Erreur de synchronisation du pointage."
            );
        } else {
            console.warn(
                '[iCHEF RH] Le pointage est enregistré malgré une erreur d’affichage secondaire.',
                error
            );
        }
    } finally {
        punchSubmitInFlight = false;
        clearPunchPin();
    }
}
// ============================================================
// iCHEF RH — PREUVES DE POINTAGE
// ============================================================
function punchReportTypeV95(rawType) {
    const value = String(rawType || '').trim().toUpperCase();
    if (/ENTR|IN|ARRIV/.test(value)) return 'IN';
    if (/SORT|OUT|D[ÉE]PART|DEPART/.test(value)) return 'OUT';
    return 'OTHER';
}
function punchReportDateKeyV95(timestamp) {
    const d = new Date(Number(timestamp || 0));
    if (Number.isNaN(d.getTime())) return '';
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function punchReportLocalDateV95(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
function ensurePunchReportFiltersV95() {
    const from = document.getElementById('punch-report-from');
    const to = document.getElementById('punch-report-to');
    const staffSelect = document.getElementById('punch-report-staff');
    const now = new Date();
    if (from && !from.value) from.value = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`;
    if (to && !to.value) to.value = punchReportLocalDateV95(now);
    if (staffSelect) {
        const current = staffSelect.value;
        const options = ['<option value="">Toute l\'équipe</option>'];
        getDir().filter(s => s.active !== false).forEach(staff => {
            options.push(`<option value="${escapeRhHtml(String(staff.id))}">${escapeRhHtml(staff.name || 'Collaborateur')}</option>`);
        });
        staffSelect.innerHTML = options.join('');
        if ([...staffSelect.options].some(o => o.value === current)) staffSelect.value = current;
    }
}
function setPunchReportPeriodV95(mode) {
    const from = document.getElementById('punch-report-from');
    const to = document.getElementById('punch-report-to');
    if (!from || !to) return;
    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let start = new Date(end);
    if (mode === 'week') start.setDate(start.getDate() - 6);
    else if (mode === 'month') start = new Date(now.getFullYear(), now.getMonth(), 1);
    from.value = punchReportLocalDateV95(start);
    to.value = punchReportLocalDateV95(end);
    renderLogs();
}
function getFilteredPunchesV95() {
    ensurePunchReportFiltersV95();
    const from = document.getElementById('punch-report-from')?.value || '';
    const to = document.getElementById('punch-report-to')?.value || '';
    const staffId = document.getElementById('punch-report-staff')?.value || '';
    const type = document.getElementById('punch-report-type')?.value || '';
    return getPunches().filter(p => {
        const key = punchReportDateKeyV95(p.timestamp);
        if (!key) return false;
        if (from && key < from) return false;
        if (to && key > to) return false;
        if (staffId && String(p.staffId ?? p.employeeId ?? '') !== String(staffId)) return false;
        if (type && punchReportTypeV95(p.type) !== type) return false;
        return true;
    }).sort((a,b) => Number(b.timestamp||0)-Number(a.timestamp||0));
}
function punchReportAnomalyCountV95(punches) {
    const groups = new Map();
    punches.forEach(p => {
        const t = punchReportTypeV95(p.type);
        if (t === 'OTHER') return;
        const sid = String(p.staffId ?? p.employeeId ?? p.staffName ?? '');
        const key = `${sid}|${punchReportDateKeyV95(p.timestamp)}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(p);
    });
    let anomalies = 0;
    groups.forEach(list => {
        list.sort((a,b)=>Number(a.timestamp||0)-Number(b.timestamp||0));
        let expected = 'IN';
        list.forEach(p => {
            const t = punchReportTypeV95(p.type);
            if (t !== expected) anomalies++;
            expected = t === 'IN' ? 'OUT' : 'IN';
        });
        if (expected === 'OUT') anomalies++; // entrée encore ouverte dans la période
    });
    return anomalies;
}
function punchReportLiveStaffV95() {
    const latest = new Map();
    getPunches().slice().sort((a,b)=>Number(a.timestamp||0)-Number(b.timestamp||0)).forEach(p => {
        const sid = String(p.staffId ?? p.employeeId ?? '');
        if (!sid) return;
        const t = punchReportTypeV95(p.type);
        if (t === 'OTHER') return;
        latest.set(sid, p);
    });
    const dir = getDir();
    return [...latest.entries()].filter(([,p]) => punchReportTypeV95(p.type) === 'IN').map(([sid,p]) => ({
        punch:p,
        staff:dir.find(s => String(s.id) === sid),
        sid
    }));
}
function renderPunchLiveV95() {
    const list = document.getElementById('punch-live-list');
    const count = document.getElementById('punch-live-count');
    if (!list) return;
    const live = punchReportLiveStaffV95();
    if (count) count.textContent = String(live.length);
    if (!live.length) {
        list.innerHTML = '<div class="rh-punch-empty-live">Aucun collaborateur pointé en service actuellement.</div>';
        return;
    }
    list.innerHTML = live.map(row => {
        const d = new Date(Number(row.punch.timestamp || 0));
        const time = Number.isNaN(d.getTime()) ? '--:--' : `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
        const name = row.staff?.name || row.punch.staffName || 'Collaborateur';
        const dept = row.staff?.dept || row.staff?.role || 'Équipe';
        return `<div class="rh-punch-live-person"><div style="min-width:0"><strong>${escapeRhHtml(name)}</strong><small>${escapeRhHtml(dept)} · depuis ${escapeRhHtml(time)}</small></div><span class="rh-punch-live-dot" aria-label="En service"></span></div>`;
    }).join('');
}
function renderLogs() {
    ensurePunchReportFiltersV95();
    const body = document.getElementById('logs-body');
    if (!body) return;
    const punches = getFilteredPunchesV95();
    const entries = punches.filter(p => punchReportTypeV95(p.type) === 'IN').length;
    const exits = punches.filter(p => punchReportTypeV95(p.type) === 'OUT').length;
    const people = new Set(punches.map(p => String(p.staffId ?? p.employeeId ?? p.staffName ?? '')).filter(Boolean)).size;
    const anomalies = punchReportAnomalyCountV95(punches);
    const live = punchReportLiveStaffV95().length;
    const summary = document.getElementById('punch-report-summary');
    if (summary) {
        summary.innerHTML = [
            ['Pointages', punches.length, 'sur la période', ''],
            ['Entrées', entries, 'prises de service', 'good'],
            ['Sorties', exits, 'fins de service', 'info'],
            ['En service', live, 'actuellement', 'good'],
            ['À contrôler', anomalies, anomalies ? 'séquences à vérifier' : 'aucune anomalie détectée', anomalies ? 'warn' : '']
        ].map(([label,value,sub,cls]) => `<div class="rh-punch-summary-card ${cls}"><div class="lbl">${escapeRhHtml(label)}</div><div class="val">${escapeRhHtml(String(value))}</div><div class="sub">${escapeRhHtml(sub)}</div></div>`).join('');
    }
    renderPunchLiveV95();
    const from = document.getElementById('punch-report-from')?.value || '';
    const to = document.getElementById('punch-report-to')?.value || '';
    const period = document.getElementById('punch-report-period-label');
    if (period) period.textContent = from && to ? `Période du ${from.split('-').reverse().join('/')} au ${to.split('-').reverse().join('/')}` : 'Toutes les périodes';
    const resultCount = document.getElementById('punch-report-result-count');
    if (resultCount) resultCount.textContent = `${punches.length} résultat${punches.length > 1 ? 's' : ''} · ${people} collaborateur${people > 1 ? 's' : ''}`;
    if (!punches.length) {
        body.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:28px;color:var(--text-muted);">Aucun pointage pour les filtres sélectionnés.</td></tr>';
        return;
    }
    const dir = getDir();
    body.innerHTML = punches.map(p => {
        const date = new Date(Number(p.timestamp || 0));
        const valid = !Number.isNaN(date.getTime());
        const dateStr = valid ? `${String(date.getDate()).padStart(2,'0')}/${String(date.getMonth()+1).padStart(2,'0')}/${date.getFullYear()}` : '-';
        const timeStr = valid ? `${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}:${String(date.getSeconds()).padStart(2,'0')}` : '--:--:--';
        const sid = String(p.staffId ?? p.employeeId ?? '');
        const staff = dir.find(s => String(s.id) === sid);
        const staffName = p.staffName || staff?.name || 'Collaborateur';
        const dept = staff?.dept || staff?.role || '';
        const t = punchReportTypeV95(p.type);
        const typeLabel = t === 'IN' ? 'ENTRÉE' : t === 'OUT' ? 'SORTIE' : String(p.type || 'AUTRE').toUpperCase();
        const typeClass = t === 'IN' ? 'in' : t === 'OUT' ? 'out' : 'other';
        const punchId = String(p.id || p.punchId || p.offlineEventId || '');
        const hasPhoto = typeof p.photo === 'string' && p.photo.startsWith('data:image/');
        const photo = hasPhoto
            ? `<div><img src="${p.photo}" alt="Photo de preuve"><br><button type="button" class="rh-photo-redact-btn" onclick='redactPunchPhotoV96(${JSON.stringify(punchId)})'>Effacer la photo</button></div>`
            : (p.photoRedacted === true
                ? '<span class="rh-photo-redacted">PHOTO EFFACÉE</span>'
                : '<span style="color:var(--text-muted);font-size:.58rem;">SANS PHOTO</span>');
        const proof = hasPhoto ? 'PHOTO + HORODATAGE' : (p.photoRedacted === true ? 'HORODATAGE · PHOTO EFFACÉE' : 'HORODATAGE');
        return `<tr>
            <td>${photo}</td>
            <td><strong style="color:#fff;display:block;font-size:.74rem;">${escapeRhHtml(staffName)}</strong><small style="color:var(--text-muted);font-size:.59rem;">${escapeRhHtml(dept || '—')}</small></td>
            <td><span class="rh-punch-action-badge ${typeClass}">${escapeRhHtml(typeLabel)}</span></td>
            <td>${escapeRhHtml(dateStr)}</td>
            <td style="font-weight:900;color:#fff;">${escapeRhHtml(timeStr)}</td>
            <td><span class="rh-punch-proof-badge">${escapeRhHtml(proof)}</span></td>
        </tr>`;
    }).join('');
}
async function scrubPunchPhotoLocalV96(punchId) {
    const id = String(punchId || '').trim();
    if (!id) return;
    const now = new Date().toISOString();
    const same = p => String(p?.id || p?.punchId || p?.offlineEventId || '') === id;
    const scrub = list => (Array.isArray(list) ? list : []).map(p => same(p)
        ? { ...p, photo:'', photoRedacted:true, photoRedactedAt:now }
        : p
    );
    try {
        const current = JSON.parse(localStorage.getItem('empire_hr_punches') || '[]');
        localStorage.setItem('empire_hr_punches', JSON.stringify(scrub(current)));
    } catch (_) {}
    try {
        const backup = JSON.parse(localStorage.getItem('empire_hr_punches_backup') || '[]');
        localStorage.setItem('empire_hr_punches_backup', JSON.stringify(scrub(backup)));
    } catch (_) {}
    try {
        const fallback = JSON.parse(localStorage.getItem('ichef_rh_offline_queue_v1') || '[]');
        localStorage.setItem('ichef_rh_offline_queue_v1', JSON.stringify(scrub(fallback)));
    } catch (_) {}
    try {
        if ('indexedDB' in window) {
            await new Promise(resolve => {
                const open = indexedDB.open('ichef_rh_offline_v1', 1);
                open.onerror = () => resolve();
                open.onupgradeneeded = () => {};
                open.onsuccess = () => {
                    const db = open.result;
                    if (!db.objectStoreNames.contains('punch_queue')) { db.close(); resolve(); return; }
                    const tx = db.transaction('punch_queue', 'readwrite');
                    const store = tx.objectStore('punch_queue');
                    const req = store.get(id);
                    req.onsuccess = () => {
                        const item = req.result;
                        if (item) store.put({ ...item, photo:'', photoRedacted:true, photoRedactedAt:now });
                    };
                    tx.oncomplete = () => { db.close(); resolve(); };
                    tx.onerror = () => { try { db.close(); } catch (_) {} resolve(); };
                };
            });
        }
    } catch (_) {}
}
async function redactPunchPhotoV96(punchId) {
    const id = String(punchId || '').trim();
    if (!id) return;
    const target = (typeof getPunches === 'function' ? getPunches() : [])
        .find(p => String(p?.id || p?.punchId || p?.offlineEventId || '') === id);
    if (!target || !(typeof target.photo === 'string' && target.photo.startsWith('data:image/'))) {
        alert('Cette preuve ne contient déjà plus de photo.');
        return;
    }
    if (!confirm('Effacer définitivement uniquement la photo du visage ?\n\nLe pointage, la date, l’heure, l’entrée/sortie et la preuve RH seront conservés.')) {
        return;
    }
    const pin = getRhDirectionAuthPin();
    if (!pin) {
        alert('Connexion Direction / Responsable RH requise pour effacer une photo.');
        return;
    }
    try {
        const response = await fetch(`${SERVER_URL_JS}/api/rh/punch/photo-redact`, {
            method:'POST',
            credentials:'include',
            cache:'no-store',
            headers:{
                'Content-Type':'application/json',
                'Accept':'application/json',
                'X-iCHEF-Tenant':tenantID_JS,
                'X-iCHEF-PIN':pin
            },
            body:JSON.stringify({ tenantID:tenantID_JS, punchId:id, pin })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || data.success !== true) {
            throw new Error(data.error || `Suppression photo refusée (HTTP ${response.status})`);
        }
        if (Array.isArray(data.punches)) {
            localStorage.setItem('empire_hr_punches', JSON.stringify(data.punches));
        }
        await scrubPunchPhotoLocalV96(id);
        renderLogs();
        if (typeof showToast === 'function') showToast('Photo effacée · pointage conservé');
    } catch (error) {
        console.error('[iCHEF RH] effacement photo', error);
        alert(error?.message || 'Impossible d’effacer la photo pour le moment.');
    }
}
function exportPunchReportCsvV95() {
    const punches = getFilteredPunchesV95();
    const dir = getDir();
    const rows = [['Collaborateur','Département','Action','Date','Heure','Preuve']];
    punches.slice().reverse().forEach(p => {
        const d = new Date(Number(p.timestamp || 0));
        const valid = !Number.isNaN(d.getTime());
        const sid = String(p.staffId ?? p.employeeId ?? '');
        const staff = dir.find(s => String(s.id) === sid);
        const t = punchReportTypeV95(p.type);
        rows.push([
            p.staffName || staff?.name || 'Collaborateur',
            staff?.dept || staff?.role || '',
            t === 'IN' ? 'ENTRÉE' : t === 'OUT' ? 'SORTIE' : String(p.type || 'AUTRE'),
            valid ? punchReportLocalDateV95(d).split('-').reverse().join('/') : '',
            valid ? `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}` : '',
            (typeof p.photo === 'string' && p.photo.startsWith('data:image/')) ? 'PHOTO + HORODATAGE' : 'HORODATAGE'
        ]);
    });
    const csv = rows.map(row => row.map(v => `"${String(v ?? '').replace(/"/g,'""')}"`).join(';')).join('\n');
    const blob = new Blob(['\ufeff'+csv], {type:'text/csv;charset=utf-8'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    const from = document.getElementById('punch-report-from')?.value || 'debut';
    const to = document.getElementById('punch-report-to')?.value || 'fin';
    a.download = `rapport-pointeuse-${from}-${to}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
function printPunchReportV95() {
    renderLogs();
    window.print();
}
// ============================================================
// POINTAGES — PAS DE SUPPRESSION
// ============================================================
function clearLogs() {
    alert(
        "Les pointages constituent la source de la feuille d'heures et ne sont plus supprimés depuis cet écran."
    );
}
// ============================================================
// FEUILLES D'HEURES — STATUTS
// ============================================================
function realTimesheetStatusLabel(status) {
    const map = {
        TO_VERIFY:
            'À VÉRIFIER',
        VALIDATED:
            'VALIDÉE',
        LOCKED:
            'CLÔTURÉE'
    };
    return (
        map[
            String(
                status || ''
            ).toUpperCase()
        ] ||
        String(
            status ||
            'À VÉRIFIER'
        )
    );
}
function realTimesheetStatusColor(status) {
    const value =
        String(
            status || ''
        ).toUpperCase();
    if (
        value === 'LOCKED'
    ) {
        return 'var(--gold)';
    }
    if (
        value === 'VALIDATED'
    ) {
        return 'var(--success)';
    }
    return 'var(--warning)';
}
function countRealSheetAnomalies(sheet) {
    if (
        !sheet?.days
    ) {
        return 0;
    }
    return Object
        .values(
            sheet.days
        )
        .reduce(
            (total, day) =>
                total +
                (
                    Array.isArray(
                        day?.anomalies
                    )
                        ? day.anomalies.length
                        : 0
                ),
            0
        );
}
// ============================================================
// FEUILLES D'HEURES RÉELLES
// ============================================================
function renderRealTimesheets() {
    try { renderRhHoursResetBannerV99(); } catch (_) {}
    const monthStr =
        document.getElementById(
            'real-timesheet-month'
        )?.value ||
        document.getElementById(
            'month-selector'
        )?.value ||
        new Date()
            .toISOString()
            .slice(
                0,
                7
            );
    const [
        year,
        month
    ] =
        monthStr
            .split('-')
            .map(Number);
    const daysInMonth =
        new Date(
            year,
            month,
            0
        ).getDate();
    const tsMonth =
        getTs()[
            monthStr
        ] || {};
    const rows =
        getDir()
            .filter(
                staff =>
                    staff.active !== false
            )
            .map(staff => {
                const plannedMonth =
                    tsMonth?.[
                        staff.id
                    ] ||
                    tsMonth?.[
                        String(
                            staff.id
                        )
                    ] ||
                    {};
                const stats =
                    getStaffMonthStats(
                        staff.id,
                        year,
                        month,
                        daysInMonth,
                        plannedMonth
                    ) || {};
                const actual =
                    getActualHoursSummary(
                        staff.id,
                        monthStr
                    );
                const sheet =
                    getRealSheetForStaff(
                        staff.id,
                        monthStr
                    );
                const balance =
                    Number(
                        actual.total ||
                        0
                    ) -
                    Number(
                        stats.adjustedTarget ||
                        0
                    );
                return {
                    staff,
                    stats,
                    actual,
                    sheet,
                    balance,
                    anomalies:
                        countRealSheetAnomalies(
                            sheet
                        )
                };
            });
    const totals =
        rows.reduce(
            (
                acc,
                row
            ) => {
                acc.planned +=
                    Number(
                        row.stats.totalDone ||
                        0
                    );
                acc.worked +=
                    Number(
                        row.actual.total ||
                        0
                    );
                acc.balance +=
                    Number(
                        row.balance ||
                        0
                    );
                acc.anomalies +=
                    Number(
                        row.anomalies ||
                        0
                    );
                if (
                    String(
                        row.sheet?.status ||
                        ''
                    ).toUpperCase() ===
                    'VALIDATED'
                ) {
                    acc.validated++;
                }
                if (
                    String(
                        row.sheet?.status ||
                        ''
                    ).toUpperCase() ===
                    'LOCKED'
                ) {
                    acc.locked++;
                }
                return acc;
            },
            {
                planned: 0,
                worked: 0,
                balance: 0,
                anomalies: 0,
                validated: 0,
                locked: 0
            }
        );
    const summary =
        document.getElementById(
            'real-timesheet-summary'
        );
    if (summary) {
        summary.innerHTML =
            [
                [
                    'Planifié',
                    `${totals.planned.toFixed(1)} h`
                ],
                [
                    'Effectué',
                    `${totals.worked.toFixed(1)} h`
                ],
                [
                    'Solde réel',
                    formatRhSignedHours(
                        totals.balance
                    )
                ],
                [
                    'Anomalies',
                    String(
                        totals.anomalies
                    )
                ],
                [
                    'Feuilles validées',
                    `${totals.validated}/${rows.length}`
                ],
                [
                    'Feuilles clôturées',
                    `${totals.locked}/${rows.length}`
                ]
            ]
                .map(
                    ([label, value]) => `
                        <div class="rh-detail-stat">
                            <div class="lbl">
                                ${escapeRhHtml(label)}
                            </div>

                            <div class="val">
                                ${escapeRhHtml(value)}
                            </div>
                        </div>
                    `
                )
                .join('');
    }
    const body =
        document.getElementById(
            'real-timesheet-body'
        );
    if (!body) {
        return;
    }
    if (!rows.length) {
        body.innerHTML =
            '<tr>' +
                '<td colspan="9" style="text-align:center;padding:24px;color:var(--text-muted);">' +
                    'Aucun collaborateur actif.' +
                '</td>' +
            '</tr>';
        return;
    }
    body.innerHTML =
        rows
            .map(row => {
                const status =
                    row.sheet?.status ||
                    'TO_VERIFY';
                return `
                    <tr>

                        <td>
                            <strong>
                                ${escapeRhHtml(
                                    row.staff.name
                                )}
                            </strong>

                            <br>

                            <span
                                style="
                                    color:var(--text-muted);
                                    font-size:.68rem;
                                "
                            >
                                ${escapeRhHtml(
                                    row.staff.role ||
                                    row.staff.dept ||
                                    ''
                                )}
                            </span>
                        </td>


                        <td>
                            ${Number(
                                row.staff.contract ||
                                0
                            ).toFixed(1)} h/sem
                        </td>


                        <td>
                            ${Number(
                                row.stats.adjustedTarget ||
                                0
                            ).toFixed(1)} h
                        </td>


                        <td>
                            ${Number(
                                row.stats.totalDone ||
                                0
                            ).toFixed(1)} h
                        </td>


                        <td>
                            ${Number(
                                row.actual.total ||
                                0
                            ).toFixed(1)} h
                        </td>


                        <td
                            class="${rhBalanceClass(
                                row.balance
                            )}"
                            style="font-weight:900;"
                        >
                            ${formatRhSignedHours(
                                row.balance
                            )}
                        </td>


                        <td
                            style="
                                color:${
                                    row.anomalies
                                        ? 'var(--warning)'
                                        : 'var(--success)'
                                };
                                font-weight:800;
                            "
                        >
                            ${row.anomalies}
                        </td>


                        <td
                            style="
                                color:${realTimesheetStatusColor(
                                    status
                                )};
                                font-weight:900;
                            "
                        >
                            ${realTimesheetStatusLabel(
                                status
                            )}
                        </td>


                        <td>

                            <div
                                style="
                                    display:flex;
                                    gap:6px;
                                    flex-wrap:wrap;
                                "
                            >

                                <button
                                    class="btn-outline"
                                    onclick='openStaffDetail(${JSON.stringify(
                                        row.staff.id
                                    )})'
                                >
                                    DÉTAIL
                                </button>


                                <button
                                    class="btn-outline"
                                    onclick='validateRealTimesheet(${JSON.stringify(
                                        row.staff.id
                                    )})'
                                    ${
                                        String(
                                            status
                                        ).toUpperCase() ===
                                        'LOCKED'
                                            ? 'disabled'
                                            : ''
                                    }
                                >
                                    VALIDER
                                </button>

                            </div>

                        </td>

                    </tr>
                `;
            })
            .join('');
}
// ============================================================
// CORRECTION MANUELLE
// ============================================================
let rhTimesheetCorrectionContextV97 = null;
function updateTimesheetCorrectionDiffV98() {
    const ctx = rhTimesheetCorrectionContextV97;
    const out = document.getElementById('timesheet-correction-diff-v98');
    const input = document.getElementById('timesheet-correction-hours-v97');
    if (!out || !ctx || !input) return;
    const worked = Number(String(input.value ?? '').replace(',', '.'));
    const planned = Number(ctx.plannedHours || 0);
    const diff = Number.isFinite(worked) ? Math.round((worked - planned) * 100) / 100 : 0;
    out.textContent = `Écart après correction : ${diff > 0 ? '+' : ''}${diff.toFixed(2)} h`;
    out.style.color = Math.abs(diff) < 0.001 ? 'var(--success)' : (diff > 0 ? 'var(--cyan)' : 'var(--warning)');
}
function alignTimesheetCorrectionToPlanningV98() {
    const ctx = rhTimesheetCorrectionContextV97;
    const input = document.getElementById('timesheet-correction-hours-v97');
    if (!ctx || !input) return;
    input.value = Number(ctx.plannedHours || 0).toFixed(2);
    updateTimesheetCorrectionDiffV98();
    input.focus();
}
function closeTimesheetCorrectionV97() {
    const modal = document.getElementById('timesheet-correction-modal-v97');
    if (modal) {
        modal.classList.remove('show');
        modal.style.display = 'none';
    }
    rhTimesheetCorrectionContextV97 = null;
}
async function correctRealTimesheetDay(staffId, date) {
    const sheetMonth = String(date || '').slice(0, 7);
    const dayNumber = Number(String(date || '').slice(8, 10));
    const current = getRealDayForStaff(staffId, sheetMonth, dayNumber) || {};
    const sheet = getRealSheetForStaff(staffId, sheetMonth) || {};
    const staff = getStaff().find(s => String(s?.id) === String(staffId));
    if (!staff) {
        alert('Collaborateur introuvable.');
        return;
    }
    const staffPlan = getTs()?.[sheetMonth]?.[String(staffId)] || {};
    const plan = staffPlan?.[String(dayNumber).padStart(2,'0')] || staffPlan?.[String(dayNumber)] || {};
    const plannedHours = Number(calculateNet(plan) || 0);
    const plannedShift = [plan.s1, plan.s2]
        .map(v => String(v ?? '').trim())
        .filter(v => v && !/^(undefined|null)$/i.test(v))
        .join(' / ') || rhStatusMeta(plan.status).label || 'REPOS';
    const currentWorked = Number(current?.workedHours ?? current?.manualWorkedHours ?? current?.rawWorkedHours ?? 0);
    const isLocked = String(sheet?.status || current?.status || '').toUpperCase() === 'LOCKED';
    rhTimesheetCorrectionContextV97 = {
        staffId: String(staffId),
        staffName: staff.name || String(staffId),
        date: String(date),
        month: sheetMonth,
        previousWorkedHours: currentWorked,
        plannedHours,
        wasLocked: isLocked
    };
    const title = document.getElementById('timesheet-correction-title-v97');
    const sub = document.getElementById('timesheet-correction-subtitle-v97');
    if (title) title.textContent = `CORRIGER · ${staff.name || 'COLLABORATEUR'}`;
    if (sub) sub.textContent = `${new Date(date + 'T12:00:00').toLocaleDateString('fr-FR',{weekday:'long',day:'2-digit',month:'long',year:'numeric'})}`;
    const planned = document.getElementById('timesheet-correction-planned-v97');
    if (planned) planned.textContent = `${plannedShift} · ${plannedHours.toFixed(2)} h`;
    const curr = document.getElementById('timesheet-correction-current-v97');
    if (curr) curr.textContent = `${currentWorked.toFixed(2)} h`;
    const hours = document.getElementById('timesheet-correction-hours-v97');
    if (hours) hours.value = currentWorked.toFixed(2);
    updateTimesheetCorrectionDiffV98();
    const reason = document.getElementById('timesheet-correction-reason-v97');
    if (reason) reason.value = '';
    const count = document.getElementById('timesheet-correction-count-v97');
    if (count) count.textContent = '0 / 250';
    const lock = document.getElementById('timesheet-correction-lock-v97');
    if (lock) lock.style.display = isLocked ? 'block' : 'none';
    const photos = document.getElementById('timesheet-correction-photos-v97');
    if (photos) photos.innerHTML = renderCorrectionProofsV97(staffId, date);
    const modal = document.getElementById('timesheet-correction-modal-v97');
    if (modal) {
        modal.classList.add('show');
        modal.style.display = 'flex';
    }
    setTimeout(() => hours?.focus(), 60);
}
async function saveTimesheetCorrectionV97() {
    const ctx = rhTimesheetCorrectionContextV97;
    if (!ctx) return;
    const hoursInput = document.getElementById('timesheet-correction-hours-v97');
    const reasonInput = document.getElementById('timesheet-correction-reason-v97');
    const saveBtn = document.getElementById('timesheet-correction-save-v97');
    const workedHours = Number(String(hoursInput?.value ?? '').replace(',', '.'));
    const reason = String(reasonInput?.value || '').trim();
    if (!Number.isFinite(workedHours) || workedHours < 0 || workedHours > 24) {
        alert("Nombre d'heures invalide (0 à 24 h).");
        hoursInput?.focus();
        return;
    }
    if (reason.length < 3) {
        alert('Indiquez le motif de la correction (minimum 3 caractères).');
        reasonInput?.focus();
        return;
    }
    if (!String(currentPin || '').trim()) {
        alert('Connexion Direction / Responsable RH requise.');
        return;
    }
    const previous = Number(ctx.previousWorkedHours || 0);
    if (Math.abs(previous - workedHours) < 0.001 && !ctx.wasLocked) {
        if (!confirm('La valeur est identique. Enregistrer tout de même cette justification dans l’historique ?')) return;
    }
    try {
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.textContent = 'ENREGISTREMENT…';
        }
        const response = await fetch(`${SERVER_URL_JS}/api/rh/timesheet/correct`, {
            method:'POST',
            headers:{'Content-Type':'application/json','Accept':'application/json'},
            cache:'no-store',
            body:JSON.stringify({
                tenantID:tenantID_JS,
                managerPin:String(currentPin || '').trim(),
                staffId:ctx.staffId,
                staffName:ctx.staffName,
                date:ctx.date,
                workedHours,
                plannedHours:Number(ctx.plannedHours || 0),
                alignToPlanning:Math.abs(workedHours - Number(ctx.plannedHours || 0)) < 0.001,
                reason
            })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.success) throw new Error(data.error || 'Correction refusée.');
        saveRealTimesheetsLocal(data.timesheets);
        if (Array.isArray(data.history)) {
            localStorage.setItem('ichef_rh_change_history', JSON.stringify(data.history));
        } else {
            recordRhChange({
                type:'TIMESHEET_CORRECTION',
                staffId:ctx.staffId,
                staffName:ctx.staffName,
                date:ctx.date,
                previousWorkedHours:previous,
                correctedWorkedHours:workedHours,
                plannedHours:Number(ctx.plannedHours || 0),
                differenceBefore:Math.round((previous - Number(ctx.plannedHours || 0))*100)/100,
                differenceAfter:Math.round((workedHours - Number(ctx.plannedHours || 0))*100)/100,
                reason,
                actor:'DIRECTION / RH',
                message:`Pointage corrigé ${ctx.date} · ${previous.toFixed(2)} h → ${workedHours.toFixed(2)} h · écart ${Math.round((workedHours-Number(ctx.plannedHours||0))*100)/100} h · ${reason}`
            });
        }
        closeTimesheetCorrectionV97();
        if (typeof showToast === 'function') showToast('Correction enregistrée + historique');
        openStaffDetail(ctx.staffId);
        renderRealTimesheets();
    } catch (error) {
        alert(error?.message || 'Erreur de correction.');
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = 'ENREGISTRER LA CORRECTION';
        }
    }
}
(function initTimesheetCorrectionV97(){
    const reason = document.getElementById('timesheet-correction-reason-v97');
    const count = document.getElementById('timesheet-correction-count-v97');
    if (reason && !reason.dataset.v97Bound) {
        reason.dataset.v97Bound = '1';
        reason.addEventListener('input', () => {
            if (count) count.textContent = `${String(reason.value || '').length} / 250`;
        });
    }
    const hours = document.getElementById('timesheet-correction-hours-v97');
    if (hours && !hours.dataset.v98Bound) {
        hours.dataset.v98Bound = '1';
        hours.addEventListener('input', updateTimesheetCorrectionDiffV98);
    }
})();
async function resetAllRhHoursCountersV99() {
    if (!String(currentPin || '').trim()) {
        alert('Connexion Direction / Responsable RH requise.');
        return;
    }
    const reason = String(prompt(
        "Motif de la remise à zéro de TOUS les compteurs d'heures :",
        'Remise à zéro des données de test'
    ) || '').trim();
    if (!reason) return;
    if (reason.length < 3) {
        alert('Le motif doit contenir au moins 3 caractères.');
        return;
    }
    if (!confirm(
        "Confirmer la remise à zéro de TOUS les compteurs d'heures ?\n\n" +
        "Les pointages, photos/preuves, plannings et historiques NE SERONT PAS supprimés.\n" +
        "RH et Portail Staff repartiront du même point zéro."
    )) return;
    try {
        const response = await fetch(`${SERVER_URL_JS}/api/rh/hours/reset`, {
            method:'POST',
            headers:{'Content-Type':'application/json','Accept':'application/json'},
            cache:'no-store',
            body:JSON.stringify({
                tenantID:tenantID_JS,
                managerPin:String(currentPin || '').trim(),
                reason
            })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.success) throw new Error(data.error || 'Remise à zéro refusée.');
        localStorage.setItem('ichef_rh_hours_reset',JSON.stringify(data.reset || {}));
        if (Array.isArray(data.directory)) {
            localStorage.setItem('empire_hr_directory',JSON.stringify(data.directory));
        }
        renderRhHoursResetBannerV99();
        try { await refreshRhStaffFromServer(); } catch (_) {}
        try { renderRealTimesheets(); } catch (_) {}
        try { renderHubDashboard?.(); } catch (_) {}
        if (typeof showToast === 'function') showToast('Tous les compteurs repartent de 0');
        alert("Compteurs remis à zéro. Les preuves et l'historique ont été conservés.");
    } catch (error) {
        alert(error?.message || 'Impossible de remettre les compteurs à zéro.');
    }
}
window.resetAllRhHoursCountersV99 = resetAllRhHoursCountersV99;
// ============================================================
// VALIDATION FEUILLE
// ============================================================
async function validateRealTimesheet(
    staffId
) {
    const month =
        document.getElementById(
            'real-timesheet-month'
        )?.value ||
        document.getElementById(
            'month-selector'
        )?.value;
    if (!month) {
        return;
    }
    try {
        const response =
            await fetch(
                `${SERVER_URL_JS}/api/rh/timesheet/status`,
                {
                    method:
                        'POST',
                    headers: {
                        'Content-Type':
                            'application/json',
                        'Accept':
                            'application/json'
                    },
                    cache:
                        'no-store',
                    body:
                        JSON.stringify({
                            tenantID:
                                tenantID_JS,
                            managerPin:
                                String(
                                    currentPin || ''
                                ).trim(),
                            month,
                            staffId,
                            action:
                                'VALIDATE'
                        })
                }
            );
        const data =
            await response
                .json()
                .catch(
                    () => ({})
                );
        if (
            !response.ok ||
            !data.success
        ) {
            throw new Error(
                data.error ||
                "Validation refusée."
            );
        }
        saveRealTimesheetsLocal(
            data.timesheets
        );
        renderRealTimesheets();
        if (
            typeof showToast ===
            'function'
        ) {
            showToast(
                "Feuille d'heures validée"
            );
        }
    } catch (error) {
        alert(
            error?.message ||
            "Erreur de validation."
        );
    }
}
// ============================================================
// CLÔTURE DU MOIS
// ============================================================
async function lockRealTimesheetMonth() {
    const month =
        document.getElementById(
            'real-timesheet-month'
        )?.value;
    if (!month) {
        return;
    }
    if (
        !confirm(
            `Clôturer définitivement les feuilles d'heures de ${month} ? Une réouverture nécessitera une action Direction.`
        )
    ) {
        return;
    }
    try {
        const response =
            await fetch(
                `${SERVER_URL_JS}/api/rh/timesheet/status`,
                {
                    method:
                        'POST',
                    headers: {
                        'Content-Type':
                            'application/json',
                        'Accept':
                            'application/json'
                    },
                    cache:
                        'no-store',
                    body:
                        JSON.stringify({
                            tenantID:
                                tenantID_JS,
                            managerPin:
                                String(
                                    currentPin || ''
                                ).trim(),
                            month,
                            action:
                                'LOCK_MONTH'
                        })
                }
            );
        const data =
            await response
                .json()
                .catch(
                    () => ({})
                );
        if (
            !response.ok ||
            !data.success
        ) {
            throw new Error(
                data.error ||
                "Clôture refusée."
            );
        }
        saveRealTimesheetsLocal(
            data.timesheets
        );
        renderRealTimesheets();
        if (
            typeof showToast ===
            'function'
        ) {
            showToast(
                "Mois RH clôturé"
            );
        }
    } catch (error) {
        alert(
            error?.message ||
            "Erreur de clôture."
        );
    }
}
        // ============================================================
// iCHEF RH — SYNCHRONISATION ANTI-RUSH
// ============================================================
async function broadcastStaffingLevels() {
    try {
        const today =
            new Date();
        const monthStr =
            `${today.getFullYear()}-${String(
                today.getMonth() + 1
            ).padStart(2, '0')}`;
        const staffing = {
            cuisine: 0,
            bar: 0,
            salle: 0,
            patisserie: 0,
            admin: 0,
            capaciteMaxPlatsParCuistot: 12
        };
        getDir().forEach(staff => {
            if (
                staff.active === false
            ) {
                return;
            }
            const ts =
                getTs();
            const planning =
                (
                    ts[monthStr] &&
                    ts[monthStr][staff.id] &&
                    ts[monthStr][staff.id][today.getDate()]
                )
                    ? ts[monthStr][staff.id][today.getDate()]
                    : null;
            if (
                planning &&
                (
                    planning.status === 'present' ||
                    planning.status === 'off_soir' ||
                    planning.status === 'off_matin'
                )
            ) {
                const assignedDept =
                    planning.poste ||
                    staff.dept;
                if (
                    staffing[assignedDept] !==
                    undefined
                ) {
                    staffing[assignedDept]++;
                }
            }
        });
        await API.update(
            'RH_MASTER',
            staffing
        );
    } catch (error) {
        console.error(
            "Erreur broadcast RH",
            error
        );
    }
}
// ============================================================
// ICÔNES / STATUTS PLANNING
// ============================================================
function planningStatusIcon(status) {
    return rhStatusMeta(
        status
    ).short || '—';
}
// ============================================================
// VUE ANNUELLE
// ============================================================
function renderAnnualTimesheet(
    year,
    staffId
) {
    const staff =
        getDir().find(
            s =>
                String(s.id) ===
                String(staffId)
        );
    if (!staff) {
        return;
    }
    const maxDays =
        31;
    let head =
        '<tr><th class="sticky-col">MOIS</th>';
    for (
        let day = 1;
        day <= maxDays;
        day++
    ) {
        head +=
            `<th>${day}</th>`;
    }
    head +=
        '<th>CP</th><th>H.</th></tr>';
    const annualHead =
        document.getElementById(
            'annual-thead'
        );
    if (annualHead) {
        annualHead.innerHTML =
            head;
    }
    const ts =
        getTs();
    let body =
        '';
    for (
        let month = 1;
        month <= 12;
        month++
    ) {
        const monthStr =
            `${year}-${String(
                month
            ).padStart(2, '0')}`;
        const daysInMonth =
            new Date(
                Number(year),
                month,
                0
            ).getDate();
        const monthData =
            ts[monthStr]?.[staff.id] ||
            ts[monthStr]?.[String(staff.id)] ||
            {};
        let cp =
            0;
        let hours =
            0;
        body +=
            `<tr>
                <td
                    class="sticky-col"
                    style="font-weight:800;"
                >
                    ${monthNames[month - 1]}
                </td>`;
        for (
            let day = 1;
            day <= maxDays;
            day++
        ) {
            if (
                day >
                daysInMonth
            ) {
                body +=
                    '<td style="opacity:.18;">—</td>';
                continue;
            }
            const planning =
                monthData[day] ||
                {
                    status:
                        'off'
                };
            if (
                planning.status ===
                'conge'
            ) {
                cp++;
            }
            hours +=
                calculateNet(
                    planning
                );
            const annualDate = new Date(Number(year), month - 1, day);
            const annualDayInitial = daysOfWeek[annualDate.getDay()].charAt(0);
            body += `
                <td
                    title="${annualDayInitial} ${String(day).padStart(2, '0')} · ${escapeRhHtml(
                        String(
                            planning.status ||
                            'off'
                        )
                    )}"
                >
                    <span class="v167-annual-day">${annualDayInitial}</span>
                    ${planningStatusIcon(
                        planning.status
                    )}
                </td>
            `;
        }
        body +=
            `<td
                style="
                    color:var(--cyan);
                    font-weight:800;
                "
            >
                ${cp}j
            </td>`;
        body +=
            `<td
                style="
                    color:var(--hr);
                    font-weight:800;
                "
            >
                ${hours.toFixed(1)}h
            </td>`;
        body +=
            '</tr>';
    }
    const annualBody =
        document.getElementById(
            'annual-tbody'
        );
    if (annualBody) {
        annualBody.innerHTML =
            body;
    }
}
// ============================================================
// PLANNING PUBLIC / ESPACE STAFF
// ============================================================
function loadPublicPlanning() {
    const employeePortal =
        document.getElementById(
            'employee-portal'
        );
    if (
        employeePortal &&
        employeePortal.style.display === 'flex' &&
        loggedInStaffId !== null
    ) {
        renderEmployeePortal();
    }
}
// ============================================================
// APPLIQUER UNE DEMANDE ACCEPTÉE AU PLANNING
// ============================================================
function applyApprovedRequestToPlanning(
    request
) {
    const staff =
        getDir().find(
            s =>
                String(s.id) ===
                    String(request.staffId) ||
                (
                    request.staffPin &&
                    String(s.pin) ===
                    String(request.staffPin)
                )
        );
    if (!staff) {
        return;
    }
    const startRaw =
        request.startDate ||
        request.start;
    const endRaw =
        request.endDate ||
        request.end ||
        startRaw;
    if (!startRaw) {
        return;
    }
    const start =
        new Date(
            `${startRaw}T12:00:00`
        );
    const end =
        new Date(
            `${endRaw}T12:00:00`
        );
    if (
        Number.isNaN(
            start.getTime()
        ) ||
        Number.isNaN(
            end.getTime()
        )
    ) {
        return;
    }
    const statusByType = {
        conge:
            'conge',
        recup:
            'recup',
        maladie:
            'maladie',
        accident_travail:
            'accident_travail',
        maternite:
            'maternite',
        paternite:
            'paternite',
        parental:
            'parental',
        enfant_malade:
            'enfant_malade',
        evenement_familial:
            'evenement_familial',
        deces:
            'deces',
        formation:
            'formation',
        sans_solde:
            'sans_solde',
        absence_autorisee:
            'absence_autorisee',
        absence_injustifiee:
            'absence_injustifiee',
        off:
            'off'
    };
    const status =
        statusByType[
            String(
                request.type ||
                ''
            ).toLowerCase()
        ] ||
        'off';
    const ts =
        getTs();
    for (
        let cursor =
            new Date(start);
        cursor <= end;
        cursor.setDate(
            cursor.getDate() + 1
        )
    ) {
        const monthStr =
            `${cursor.getFullYear()}-${String(
                cursor.getMonth() + 1
            ).padStart(2, '0')}`;
        const day =
            cursor.getDate();
        if (
            !ts[monthStr]
        ) {
            ts[monthStr] =
                {};
        }
        if (
            !ts[monthStr][staff.id]
        ) {
            ts[monthStr][staff.id] =
                {};
        }
        const old =
            ts[monthStr][staff.id][day] ||
            {
                poste:
                    staff.dept,
                s1:
                    '',
                s2:
                    '',
                pause:
                    0,
                obs:
                    ''
            };
        ts[monthStr][staff.id][day] = {
            ...old,
            status,
            s1:
                '',
            s2:
                '',
            pause:
                0,
            obs:
                `Demande acceptée : ${rhRequestTypeLabel(
                    request.type
                )}`
        };
    }
    saveTs(
        ts
    );
    if (
        typeof broadcastStaffingLevels ===
        'function'
    ) {
        broadcastStaffingLevels();
    }
}
// ============================================================
// iCHEF RH — NOTIFICATIONS GLOBALES
// ============================================================
function showToast(
    message,
    isError = false
) {
    const toast =
        document.getElementById(
            'toast'
        );
    if (!toast) {
        console.log(
            '[iCHEF RH]',
            message
        );
        return;
    }
    toast.innerText =
        String(
            message ||
            ''
        );
    toast.style.display =
        'block';
    toast.style.background =
        isError
            ? 'var(--danger)'
            : 'var(--success)';
    toast.style.color =
        isError
            ? '#ffffff'
            : '#000000';
    requestAnimationFrame(
        () => {
            toast.classList.add(
                'show'
            );
        }
    );
    if (
        window.__ichefRhToastTimer
    ) {
        clearTimeout(
            window.__ichefRhToastTimer
        );
    }
    window.__ichefRhToastTimer =
        setTimeout(
            () => {
                toast.classList.remove(
                    'show'
                );
                setTimeout(
                    () => {
                        toast.style.display =
                            'none';
                    },
                    350
                );
            },
            2600
        );
}
// ============================================================
// DIRECTION — TRAITEMENT DES DEMANDES
// ============================================================
function setDirectorRequestStatus(
    requestId,
    status
) {
    const reqs =
        getReqs();
    const index =
        reqs.findIndex(
            r =>
                String(r.id) ===
                String(requestId)
        );
    if (index === -1) {
        return;
    }
    const now =
        new Date()
            .toISOString();
    const nextStatus =
        status === 'approved'
            ? 'approved'
            : 'rejected';
    const previousHistory =
        Array.isArray(
            reqs[index].history
        )
            ? reqs[index].history.slice()
            : [];
    if (!previousHistory.length) {
        previousHistory.push({
            action:'CREATED',
            status:'PENDING',
            at:
                reqs[index].createdAt ||
                reqs[index].timestamp ||
                now,
            by:
                reqs[index].staffName ||
                'Collaborateur'
        });
    }
    previousHistory.push({
        action:
            nextStatus === 'approved'
                ? 'ACCEPTED'
                : 'REFUSED',
        status:
            nextStatus === 'approved'
                ? 'ACCEPTED'
                : 'REFUSED',
        at:now,
        by:'Direction / RH'
    });
    reqs[index] = {
        ...reqs[index],
        requestNumber:
            reqs[index].requestNumber ||
            reqs[index].proofId ||
            String(reqs[index].id),
        proofId:
            reqs[index].proofId ||
            reqs[index].requestNumber ||
            String(reqs[index].id),
        status:nextStatus,
        processedAt:now,
        decidedAt:now,
        decidedBy:'Direction / RH',
        processedBy:'Direction / RH',
        updatedAt:now,
        history:previousHistory
    };
    if (nextStatus === 'approved') {
        applyApprovedRequestToPlanning(
            reqs[index]
        );
    }
    // V68 : REQUESTS_MASTER + STAFF_REQUESTS mis à jour ensemble.
    saveReqs(
        reqs
    );
    updateReqBadge();
    renderDirectorRequests();
    refreshViews();
    if (
        loggedInStaffId !== null &&
        document.getElementById('employee-portal')?.style.display === 'flex'
    ) {
        renderEmployeePortal();
    }
    if (
        typeof showToast ===
        'function'
    ) {
        showToast(
            nextStatus === 'approved'
                ? "Demande acceptée · preuve conservée"
                : "Demande refusée · preuve conservée"
        );
    }
}
// ============================================================
// DIRECTION — AFFICHAGE DES DEMANDES
// ============================================================
function renderDirectorRequests() {
    const body =
        document.getElementById(
            'requests-dir-body'
        );
    if (!body) {
        return;
    }
    const reqs =
        getReqs()
            .slice()
            .sort(
                (a, b) =>
                    Number(
                        b.createdAt ||
                        b.timestamp ||
                        b.id ||
                        0
                    ) -
                    Number(
                        a.createdAt ||
                        a.timestamp ||
                        a.id ||
                        0
                    )
            );
    if (
        !reqs.length
    ) {
        body.innerHTML =
            '<tr>' +
                '<td colspan="7" style="text-align:center;padding:25px;color:var(--text-muted);">' +
                    'Aucune demande enregistrée.' +
                '</td>' +
            '</tr>';
        return;
    }
    body.innerHTML =
        reqs
            .map(r => {
                const status =
                    String(
                        r.status ||
                        'pending'
                    )
                        .toLowerCase();
                const pending =
                    ![
                        'approved',
                        'accepte',
                        'accepté',
                        'valide',
                        'validé',
                        'rejected',
                        'refuse',
                        'refusé'
                    ].includes(
                        status
                    );
                return `
                    <tr>

                        <td>
                            ${formatRhDate(
                                r.createdAt ||
                                r.timestamp ||
                                r.id
                            )}
                        </td>

                        <td
                            style="
                                font-weight:800;
                            "
                        >
                            ${escapeRhHtml(
                                r.staffName ||
                                'Employé'
                            )}
                            <div class="rh-request-proof">
                                ${escapeRhHtml(rhRequestProofId(r))}
                            </div>
                        </td>

                        <td>
                            ${escapeRhHtml(
                                rhRequestTypeLabel(
                                    r.type
                                )
                            )}
                        </td>

                        <td>
                            ${formatRhDate(
                                r.startDate ||
                                r.start
                            )}
                            →
                            ${formatRhDate(
                                r.endDate ||
                                r.end
                            )}
                        </td>

                        <td>
                            ${escapeRhHtml(
                                r.comment ||
                                r.reason ||
                                '-'
                            )}
                        </td>

                        <td>

                            <span
                                class="status-badge ${rhRequestStatusClass(
                                    r.status
                                )}"
                            >
                                ${rhRequestStatusLabel(
                                    r.status
                                )}
                            </span>

                        </td>

                        <td
                            style="
                                text-align:center;
                            "
                        >

                            ${
                                pending
                                    ? `
                                        <div
                                            style="
                                                display:flex;
                                                gap:8px;
                                                justify-content:center;
                                                flex-wrap:wrap;
                                            "
                                        >

                                            <button
                                                class="btn-outline"
                                                style="
                                                    border-color:var(--success);
                                                    color:var(--success);
                                                "
                                                onclick="setDirectorRequestStatus('${String(
                                                    r.id
                                                )}','approved')"
                                            >
                                                ACCEPTER
                                            </button>

                                            <button
                                                class="btn-outline"
                                                style="
                                                    border-color:var(--danger);
                                                    color:var(--danger);
                                                "
                                                onclick="setDirectorRequestStatus('${String(
                                                    r.id
                                                )}','rejected')"
                                            >
                                                REFUSER
                                            </button>

                                            <button
                                                class="rh-proof-btn"
                                                type="button"
                                                onclick="openRhRequestProof('${String(r.id).replace(/'/g, "\'")}')"
                                            >
                                                PREUVE
                                            </button>

                                        </div>
                                    `
                                    : `
                                        <button
                                            class="rh-proof-btn"
                                            type="button"
                                            onclick="openRhRequestProof('${String(r.id).replace(/'/g, "\'")}')"
                                        >
                                            PREUVE
                                        </button>
                                    `
                            }

                        </td>

                    </tr>
                `;
            })
            .join('');
}
