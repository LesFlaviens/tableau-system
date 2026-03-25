<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Empire - Supervision Salle (Chef)</title>
    <style>
        :root { --bg: #050505; --accent: #00e676; --alert: #ff1744; --text: #fff; --panel: #111; --purple: #ea80fc; --blue: #00b0ff; --warning: #ffb300; }
        body { font-family: 'Inter', sans-serif; background: var(--bg); color: var(--text); margin: 0; display: flex; flex-direction: column; height: 100vh; overflow: hidden; user-select: none; touch-action: none;}
        
        /* ÉCRAN DE BLOCAGE */
        #security-block { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: #000; z-index: 99999; display: flex; flex-direction: column; justify-content: center; align-items: center; color: var(--alert); }
        
        /* HEADER ÉPURÉ */
        header { border-bottom: 1px solid #333; padding: 15px 25px; background: #0a0a0a; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0; }
        .header-title { color: var(--warning); font-size: 1.8rem; font-weight: 900; margin: 0; text-transform: uppercase; letter-spacing: 3px; display: flex; align-items: center; gap: 10px;}
        .sync-icon { color: var(--blue); font-size: 1rem; animation: blink 2s infinite; }
        @keyframes blink { 0% { opacity: 1; } 50% { opacity: 0.3; } 100% { opacity: 1; } }
        
        .header-controls { display: flex; gap: 15px; }
        .btn-top { background: #111; font-weight: 900; border-radius: 6px; padding: 12px 20px; cursor: pointer; text-transform: uppercase; transition: 0.2s; font-size: 1rem; border: 2px solid transparent; box-shadow: 0 4px 10px rgba(0,0,0,0.5); color: #fff; }
        .btn-top:active { transform: scale(0.95); }
        .btn-res { border-color: var(--purple); color: var(--purple); }
        .btn-admin { border-color: var(--blue); color: var(--blue); }

        /* BARRE ARCHITECTURE */
        #archi-toolbar { background: var(--blue); padding: 10px 25px; display: flex; justify-content: space-between; align-items: center; color: #000; font-weight: 900; text-transform: uppercase; box-shadow: 0 5px 20px rgba(0, 176, 255, 0.3); }
        .btn-archi-action { background: rgba(0,0,0,0.5); border: 1px solid #000; color: #fff; padding: 8px 15px; border-radius: 6px; font-weight: bold; cursor: pointer; transition: 0.2s;}
        .btn-archi-action:hover { background: #000; }

        /* TABS (SALLES) */
        .zones-bar { display: flex; border-bottom: 1px solid #222; background: #050505; overflow-x: auto;}
        .zone-tab { padding: 15px 30px; font-size: 1.1rem; font-weight: 900; text-transform: uppercase; cursor: pointer; color: #555; border-right: 1px solid #222; transition: 0.2s; white-space: nowrap; }
        .zone-tab.active { background: var(--accent); color: #000; }

        /* MAIN AREA */
        .main-workspace { display: flex; flex: 1; overflow: hidden; position: relative; }
        .floor-plan { flex: 1; position: relative; background: radial-gradient(circle, #333 2px, #050505 2px); background-size: 30px 30px; overflow: hidden; }
        
        /* TABLES ET DECORS */
        .table-obj, .decor-obj { position: absolute; display: flex; justify-content: center; align-items: center; font-weight: 900; cursor: grab; user-select: none; text-align: center; word-break: break-word; padding: 5px; box-sizing: border-box; animation: pulse-border 2s infinite; }
        .table-obj:active, .decor-obj:active { cursor: grabbing; transform: scale(1.05); }
        
        .table-obj { background: #222; border: 2px dashed #555; color: #fff; box-shadow: 0 5px 15px rgba(0,0,0,0.5); z-index: 20;}
        .decor-obj { z-index: 10; border-style: dashed !important; }
        
        .table-badge { position: absolute; top: -10px; right: -10px; background: var(--purple); color: #000; font-size: 0.8rem; padding: 4px 8px; border-radius: 12px; font-weight: 900; border: 2px solid #000; box-shadow: 0 2px 5px rgba(0,0,0,0.5);}
        .table-badge.active-order { background: var(--warning); right: auto; left: -10px; content: "🍽️"; }

        .decor-zone { background: rgba(255, 255, 255, 0.05); border: 2px dashed #555; color: #888; font-size: 1.5rem; text-transform: uppercase; letter-spacing: 2px;}
        .decor-window { background: rgba(0, 176, 255, 0.15); border: 2px solid var(--blue); color: var(--blue); }
        .decor-wall { background: #222; border: 1px solid #111; color: transparent; }
        .decor-bar { background: #3e2723; border: 2px solid #212121; color: #d7ccc8; font-size: 1.2rem; }

        @keyframes pulse-border { 0% { box-shadow: 0 0 0 0 rgba(0, 176, 255, 0.4); } 70% { box-shadow: 0 0 0 15px rgba(0, 176, 255, 0); } 100% { box-shadow: 0 0 0 0 rgba(0, 176, 255, 0); } }

        /* REDIMENSIONNEMENT TACTILE */
        .resize-handle { position: absolute; bottom: -10px; right: -10px; width: 25px; height: 25px; background: var(--accent); border: 3px solid #000; border-radius: 50%; cursor: se-resize; z-index: 2000; box-shadow: 0 2px 5px rgba(0,0,0,0.5); }

        /* TIROIRS COULISSANTS */
        .drawer { position: absolute; top: 0; right: 0; width: 500px; height: 100%; background: #0a0a0a; border-left: 2px solid #333; padding: 30px; z-index: 9000; box-sizing: border-box; overflow-y: auto; transform: translateX(100%); transition: transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1); box-shadow: -15px 0 50px rgba(0,0,0,0.8); }
        .drawer.open { transform: translateX(0); }
        .btn-close-drawer { position: absolute; top: 20px; left: 20px; background: transparent; border: none; color: #aaa; font-size: 2rem; font-weight: bold; cursor: pointer; transition: 0.2s; z-index: 10; line-height: 1; }
        .btn-close-drawer:hover { color: var(--alert); transform: scale(1.1); }

        /* REGISTRE DES LOGS */
        .log-entry { padding: 10px 0; border-bottom: 1px dashed #222; font-size: 0.9rem; display: flex; gap: 15px; }
        .log-time { color: var(--sub); font-weight: bold; }
        .log-msg { color: #fff; flex: 1; }

        /* MODALS */
        .modal { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 9999; justify-content: center; align-items: center; }
        .modal-content { background: #111; padding: 30px; border-radius: 12px; border: 1px solid #333; width: 400px; box-shadow: 0 20px 50px rgba(0,0,0,0.8);}
        .input-group { margin-bottom: 15px; }
        .input-group label { display: block; font-size: 0.7rem; color: var(--sub); text-transform: uppercase; margin-bottom: 5px; font-weight: bold;}
        .input-full { width: 100%; background: #000; border: 1px solid #444; color: #fff; padding: 10px; border-radius: 6px; font-size: 1rem; box-sizing: border-box;}
        .input-full:focus { border-color: var(--blue); outline: none; }
        
        .zone-manager-list { max-height: 200px; overflow-y: auto; margin-bottom: 15px; border: 1px solid #333; border-radius: 6px; background: #000;}
        .zone-manager-item { display: flex; justify-content: space-between; padding: 10px; border-bottom: 1px solid #222; align-items: center;}

    </style>
</head>
<body>

    <div id="security-block">
        <h1 style="font-size: 3rem;">🛑 ACCÈS REFUSÉ</h1>
        <p>Ce module nécessite la clé d'identification du Chef (ICHEF2026).</p>
        <button onclick="window.location.href='plan-de-table.html'" style="margin-top: 20px; padding: 15px 30px; background: #222; color: #fff; border: 1px solid #444; border-radius: 8px; font-weight: bold; cursor: pointer; text-transform: uppercase;">Aller au Terminal Serveur</button>
    </div>

    <header id="main-header" style="display:none;">
        <h1 class="header-title">
            ⚙️ MASTER SALLE
            <span class="sync-icon" title="Synchronisation Globale Active">☁️</span>
        </h1>
        <div class="header-controls">
            <button class="btn-top btn-res" onclick="openDrawer('res-drawer')">📅 RÉSERVATIONS</button>
            <button class="btn-top btn-admin" onclick="openDrawer('logs-drawer')">👁️ REGISTRE</button>
            <button class="btn-top" style="border-color:var(--purple); color:var(--purple);" onclick="window.location.href='rh.html'">👔 RH</button>
            <button class="btn-top" style="border-color:#555; color:#ccc;" onclick="window.location.href='plan-de-table.html'">▶ MODE SERVEUR</button>
        </div>
    </header>

    <div id="archi-toolbar" style="display:none;">
        <div style="display:flex; gap:10px;">
            <button class="btn-archi-action" onclick="addTable()">+ NOUVELLE TABLE</button>
            <button class="btn-archi-action" onclick="addDecor()">+ DÉCOR / ZONE</button>
            <button class="btn-archi-action" onclick="openZoneManager()">⚙️ GÉRER LES SALLES</button>
        </div>
        <span style="color:#000;">⚠️ ÉDITION ACTIVE</span>
    </div>

    <div class="zones-bar" id="zones-bar" style="display:none;"></div>

    <div class="main-workspace" id="workspace" style="display:none;">
        <div class="floor-plan" id="floor-plan"></div>

        <div id="res-drawer" class="drawer">
            <button class="btn-close-drawer" onclick="closeDrawer('res-drawer')">✕</button>
            <h2 style="color:var(--purple); margin: 30px 0 20px 0; font-size: 1.8rem; text-transform: uppercase;">📅 RÉSERVATIONS</h2>
            <div style="background: #161616; border: 1px solid #333; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <input type="date" id="res-date-filter" class="input-full" onchange="renderReservations()" style="border-color: #444;">
            </div>
            <div id="res-list-container"></div>
        </div>

        <div id="logs-drawer" class="drawer">
            <button class="btn-close-drawer" onclick="closeDrawer('logs-drawer')">✕</button>
            <h2 style="color:#fff; margin: 30px 0 20px 0; font-size: 1.8rem; text-transform: uppercase;">👁️ REGISTRE</h2>
            <div id="logs-container" style="background:#111; border:1px solid #333; border-radius:8px; padding:15px; max-height: 70vh; overflow-y:auto;"></div>
            <button onclick="clearLogs()" style="width:100%; margin-top:20px; padding:10px; background:transparent; border:1px solid #444; color:#888; border-radius:6px; cursor:pointer;">Purger le registre</button>
        </div>
    </div>

    <div id="table-edit-modal" class="modal">
        <div class="modal-content" style="border-top-color: var(--blue);">
            <h2 style="color:var(--blue); margin-top:0;">ÉDITER LA TABLE</h2>
            <input type="hidden" id="edit-table-id">
            <input type="hidden" id="edit-table-label-old">
            
            <div class="input-group">
                <label>Nom / Numéro affiché (ex: T1, VIP...)</label>
                <input type="text" id="edit-table-label" class="input-full" placeholder="Laissez vide pour auto-génération">
            </div>
            <div class="input-group">
                <label>Forme de la table</label>
                <select id="edit-table-radius" class="input-full">
                    <option value="8px">Standard (Carrée / Rectangulaire)</option>
                    <option value="50%">Ronde / Ovale</option>
                </select>
            </div>
            <div style="display:flex; gap:10px; margin-top:20px;">
                <button onclick="deleteTableSafely()" style="flex:1; padding:10px; background:transparent; border:1px solid var(--alert); color:var(--alert); border-radius:6px; cursor:pointer; font-weight:bold;">SUPPRIMER</button>
                <button onclick="saveTableEdit()" style="flex:2; padding:10px; background:var(--blue); border:none; color:#000; border-radius:6px; font-weight:bold; cursor:pointer;">VALIDER</button>
            </div>
        </div>
    </div>

    <div id="decor-edit-modal" class="modal">
        <div class="modal-content" style="border-top-color: var(--accent);">
            <h2 style="color:var(--accent); margin-top:0;">ÉDITER LE DÉCOR</h2>
            <input type="hidden" id="edit-decor-id">
            
            <div class="input-group">
                <label>Texte affiché</label>
                <input type="text" id="edit-decor-label" class="input-full">
            </div>
            <div class="input-group">
                <label>Type d'élément</label>
                <select id="edit-decor-style" class="input-full">
                    <option value="decor-zone">Zone Délimitée (Pointillés)</option>
                    <option value="decor-window">Fenêtre / Baie vitrée</option>
                    <option value="decor-wall">Mur / Cloison (Plein)</option>
                    <option value="decor-bar">Comptoir de Bar</option>
                </select>
            </div>
            <div style="display:flex; gap:10px; margin-top:20px;">
                <button onclick="deleteDecor()" style="flex:1; padding:10px; background:transparent; border:1px solid var(--alert); color:var(--alert); border-radius:6px; cursor:pointer; font-weight:bold;">SUPPRIMER</button>
                <button onclick="saveDecorEdit()" style="flex:2; padding:10px; background:var(--accent); border:none; color:#000; border-radius:6px; font-weight:bold; cursor:pointer;">VALIDER</button>
            </div>
        </div>
    </div>

    <div id="zone-manager-modal" class="modal">
        <div class="modal-content" style="border-top-color: #fff;">
            <h2 style="color:#fff; margin-top:0;">GÉRER LES SALLES</h2>
            <div class="zone-manager-list" id="zone-manager-list"></div>
            <div style="display:flex; gap:10px; margin-bottom: 20px;">
                <input type="text" id="new-zone-name" class="input-full" placeholder="Nouvelle salle (ex: Étage)">
                <button onclick="addNewZone()" style="background:var(--accent); color:#000; border:none; padding:0 15px; border-radius:6px; font-weight:bold; cursor:pointer;">AJOUTER</button>
            </div>
            <button onclick="closeZoneManager()" style="width:100%; padding:10px; background:#222; border:none; color:#fff; border-radius:6px; font-weight:bold; cursor:pointer;">FERMER</button>
        </div>
    </div>

    <script>
        // --- 1. SÉCURITÉ : VÉRIFICATION DE LA CLÉ URL ---
        const urlParams = new URLSearchParams(window.location.search);
        const isMaster = urlParams.get('key') === 'ICHEF2026';

        if (isMaster) {
            document.getElementById('security-block').style.display = 'none';
            document.getElementById('main-header').style.display = 'flex';
            document.getElementById('archi-toolbar').style.display = 'flex';
            document.getElementById('zones-bar').style.display = 'flex';
            document.getElementById('workspace').style.display = 'flex';
            addLog("Connexion Chef : Master Architecture activé.");
            initSystem();
        }

        // --- ECOUTE SYNCHRO (LE CHEF VOIT CE QUE FONT LES SERVEURS) ---
        window.addEventListener('storage', function(e) {
            if (e.key === 'empire_reservations' || e.key.startsWith('empire_order_')) {
                loadFloorPlan(); // Met à jour les badges 📅 et 🍽️
                if(document.getElementById('res-drawer').classList.contains('open')) renderReservations();
            }
        });

        // --- GESTION DES TIROIRS ---
        function openDrawer(drawerId) {
            document.querySelectorAll('.drawer').forEach(d => d.classList.remove('open'));
            document.getElementById(drawerId).classList.add('open');
            if(drawerId === 'logs-drawer') renderLogs();
            if(drawerId === 'res-drawer') renderReservations();
        }
        function closeDrawer(drawerId) { document.getElementById(drawerId).classList.remove('open'); }

        // --- MOTEUR DE ZONES ---
        let currentZoneId = 'z1';
        
        function getZones() {
            let zones = JSON.parse(localStorage.getItem('empire_salle_zones'));
            if(!zones || zones.length === 0) zones = [ { id: 'z1', name: 'RESTAURANT' } ];
            return zones;
        }

        function loadZonesUI() {
            const zones = getZones();
            const bar = document.getElementById('zones-bar');
            if(!zones.find(z => z.id === currentZoneId)) currentZoneId = zones[0].id;
            bar.innerHTML = zones.map(z => `<div class="zone-tab ${z.id === currentZoneId ? 'active' : ''}" onclick="switchZone('${z.id}')">${z.name}</div>`).join('');
            loadFloorPlan();
        }

        function switchZone(id) { currentZoneId = id; loadZonesUI(); }
        function openZoneManager() { renderZoneManagerList(); document.getElementById('zone-manager-modal').style.display = 'flex'; }
        function closeZoneManager() { document.getElementById('zone-manager-modal').style.display = 'none'; }

        function renderZoneManagerList() {
            const zones = getZones();
            document.getElementById('zone-manager-list').innerHTML = zones.map(z => `
                <div class="zone-manager-item">
                    <span style="font-weight:bold; color:#fff;">${z.name}</span>
                    ${zones.length > 1 ? `<button onclick="deleteZoneSafely('${z.id}', '${z.name}')" style="background:none; border:none; color:var(--alert); cursor:pointer;">✕</button>` : ''}
                </div>
            `).join('');
        }

        function addNewZone() {
            const name = document.getElementById('new-zone-name').value.trim();
            if(!name) return;
            const zones = getZones();
            zones.push({ id: 'z' + Date.now(), name: name });
            localStorage.setItem('empire_salle_zones', JSON.stringify(zones));
            document.getElementById('new-zone-name').value = '';
            renderZoneManagerList(); loadZonesUI();
            addLog(`Nouvelle zone créée: ${name}`);
        }

        // FAIL-SAFE : Empêche de supprimer une zone si une table est active
        function deleteZoneSafely(id, name) {
            let tables = JSON.parse(localStorage.getItem('empire_salle_tables')) || [];
            let tablesInZone = tables.filter(t => t.zoneId === id);
            
            // Vérifie si une table de cette zone a une commande en cours
            for(let t of tablesInZone) {
                if(hasActiveOrder(t.label || t.id)) {
                    alert(`❌ ERREUR DE SÉCURITÉ : La table ${t.label || t.id} dans cette zone a une commande en cours. Soldez la table avant de supprimer la salle.`);
                    return;
                }
            }

            if(confirm(`⚠️ Supprimer la salle "${name}" et toutes ses tables/décors de manière irréversible ?`)) {
                let zones = getZones().filter(z => z.id !== id);
                localStorage.setItem('empire_salle_zones', JSON.stringify(zones));
                
                tables = tables.filter(t => t.zoneId !== id);
                localStorage.setItem('empire_salle_tables', JSON.stringify(tables));

                let decors = JSON.parse(localStorage.getItem('empire_salle_decor')) || [];
                decors = decors.filter(d => d.zoneId !== id);
                localStorage.setItem('empire_salle_decor', JSON.stringify(decors));

                renderZoneManagerList(); loadZonesUI();
                addLog(`Zone supprimée: ${name}`);
            }
        }

        // --- MOTEUR DU PLAN DE TABLE ---
        let currentDrag = null;
        let startX = 0, startY = 0;
        let startW = 0, startH = 0;
        let hasMoved = false; 
        let isResizing = false;

        function getTables() { return JSON.parse(localStorage.getItem('empire_salle_tables')) || []; }
        function getDecors() { return JSON.parse(localStorage.getItem('empire_salle_decor')) || []; }
        function saveTables(tables) { localStorage.setItem('empire_salle_tables', JSON.stringify(tables)); }
        function saveDecors(decors) { localStorage.setItem('empire_salle_decor', JSON.stringify(decors)); }

        // Moteurs d'Intelligence Visuelle (Badges)
        function getTodayString() {
            const d = new Date();
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        }
        function isTableReservedToday(tableLabel) {
            const today = getTodayString();
            const resas = JSON.parse(localStorage.getItem('empire_reservations')) || {};
            return (resas[today] || []).some(r => r.table === tableLabel);
        }
        function hasActiveOrder(tableLabel) {
            const ticket = JSON.parse(localStorage.getItem('empire_order_' + tableLabel));
            if(!ticket) return false;
            return (ticket.entrees && ticket.entrees.length > 0) || 
                   (ticket.plats && ticket.plats.length > 0) || 
                   (ticket.desserts && ticket.desserts.length > 0) || 
                   (ticket.boissons && ticket.boissons.length > 0);
        }

        function loadFloorPlan() {
            const floor = document.getElementById('floor-plan');
            floor.innerHTML = '';

            const currentDecors = getDecors().filter(d => d.zoneId === currentZoneId);
            currentDecors.forEach(d => {
                const div = document.createElement('div');
                div.className = `decor-obj ${d.styleType}`;
                div.setAttribute('data-id', d.id);
                div.setAttribute('data-type', 'decor');
                div.innerHTML = d.label || '';
