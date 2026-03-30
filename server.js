<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>iChef - Pad Serveur</title>
    <style>
        :root { --bg: #0a0a0a; --panel: #111; --gold: #ffb300; --accent: #00e676; --alert: #ff1744; --text: #eee; }
        body { margin: 0; font-family: 'Inter', sans-serif; background: var(--bg); color: var(--text); display: flex; height: 100vh; overflow: hidden; }
        
        /* HEADER MOBILE */
        .header { position: absolute; top:0; left:0; width:100%; background: var(--panel); border-bottom: 2px solid #222; padding: 10px 20px; display: flex; justify-content: space-between; align-items: center; box-sizing: border-box; z-index: 100;}
        .logo { color: var(--gold); font-size: 1.2rem; font-weight: 900; letter-spacing: 2px; }
        .sync-status { display: flex; align-items: center; gap: 8px; font-size: 0.7rem; font-weight: bold; color:#888;}
        .sync-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--alert); box-shadow: 0 0 8px var(--alert); }
        .sync-dot.online { background: var(--accent); box-shadow: 0 0 8px var(--accent); }

        /* ZONE GAUCHE : LA CARTE */
        .menu-area { flex: 2; padding: 70px 20px 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 20px; }
        
        .cat-title { font-size: 1rem; color: #888; text-transform: uppercase; font-weight: 900; border-bottom: 1px solid #333; padding-bottom: 5px; margin-bottom: 10px; margin-top: 0;}
        .cat-title.special { color: var(--gold); border-color: var(--gold); }
        
        .grid-items { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
        
        .btn-item { background: #1a1a1a; border: 1px solid #333; color: #fff; padding: 15px 10px; border-radius: 8px; font-size: 0.9rem; font-weight: bold; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 8px; transition: 0.1s; text-align: center; }
        .btn-item:active { transform: scale(0.95); border-color: var(--accent); }
        .btn-item .price { color: var(--accent); font-weight: 900; font-size: 1rem; }
        
        /* GESTION RUPTURE DE STOCK */
        .btn-item.sold-out { background: rgba(255, 23, 68, 0.1); border-color: var(--alert); color: #555; pointer-events: none; opacity: 0.6; }
        .btn-item.sold-out .price { color: var(--alert); text-decoration: line-through; }
        .btn-item.sold-out::after { content: "ÉPUISÉ"; color: var(--alert); font-size: 0.7rem; font-weight: 900; margin-top: 5px; }

        /* ZONE DROITE : LE TICKET */
        .ticket-area { flex: 1; min-width: 300px; background: var(--panel); border-left: 2px solid #222; display: flex; flex-direction: column; padding-top: 60px;}
        
        .table-selector { padding: 15px; border-bottom: 1px solid #333; display: flex; gap: 10px; align-items: center; }
        .table-selector select { flex: 1; background: #000; color: var(--gold); font-size: 1.2rem; font-weight: 900; border: 1px solid #444; padding: 10px; border-radius: 4px; outline: none; }
        
        .ticket-list { flex: 1; overflow-y: auto; padding: 15px; display: flex; flex-direction: column; gap: 10px; }
        .ticket-item { display: flex; justify-content: space-between; align-items: center; background: #000; padding: 10px; border-radius: 4px; border: 1px solid #222; }
        .ticket-item-name { font-size: 0.9rem; font-weight: bold; flex: 1; white-space: pre-wrap; line-height: 1.2;}
        .ticket-item-price { color: var(--accent); font-weight: bold; margin: 0 10px; }
        .btn-del { background: rgba(255, 23, 68, 0.2); border: none; color: var(--alert); border-radius: 4px; width: 30px; height: 30px; font-weight: bold; cursor: pointer; }
        
        .ticket-footer { padding: 20px; border-top: 2px solid #333; background: #0a0a0a; }
        .total-row { display: flex; justify-content: space-between; font-size: 1.5rem; font-weight: 900; margin-bottom: 15px; color: #fff; }
        .total-price { color: var(--gold); }
        .btn-send { background: var(--accent); color: #000; border: none; width: 100%; padding: 18px; font-size: 1.1rem; font-weight: 900; border-radius: 8px; cursor: pointer; text-transform: uppercase; }
        .btn-send:active { background: #00b359; transform: scale(0.98); }
        
        @media (max-width: 800px) { body { flex-direction: column; } .ticket-area { flex: none; height: 50vh; border-left: none; border-top: 2px solid #222; } .menu-area { padding-bottom: 20px; } }
    </style>
</head>
<body>

    <div class="header">
        <div class="logo">ichef.ch - SERVEUR</div>
        <div class="sync-status">
            <span id="sync-text">SYNCHRO CUISINE</span>
            <div id="sync-dot" class="sync-dot"></div>
        </div>
    </div>

    <div class="menu-area" id="menu-container">
        <div style="text-align: center; color: #555; margin-top: 50px;">Chargement de la carte du Chef...</div>
    </div>

    <div class="ticket-area">
        <div class="table-selector">
            <span style="font-weight: bold; color: #888;">TABLE :</span>
            <select id="table-id">
                <option value="T1">Table 1</option><option value="T2">Table 2</option><option value="T3">Table 3</option>
                <option value="T4">Table 4</option><option value="T5">Table 5</option><option value="T6">Table 6</option>
                <option value="T7">Table 7</option><option value="T8">Table 8</option><option value="T9">Table 9</option>
                <option value="T10">Table 10</option>
            </select>
        </div>
        
        <div class="ticket-list" id="ticket"></div>
        
        <div class="ticket-footer">
            <div class="total-row">
                <span>TOTAL</span>
                <span class="total-price"><span id="total-val">0.00</span> €</span>
            </div>
            <button class="btn-send" onclick="sendOrder()">Envoyer en Cuisine</button>
        </div>
    </div>

    <script>
        const API = {
            getState: () => fetch('/get-current-state').then(r => r.json()).catch(() => null),
            update: (key, data) => fetch('/update-order', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ tableId: key, order: { data } }) })
        };

        let currentMenu = {};
        let currentTicket = [];

        // 🟢 MOTEUR H24 : TÉLÉCHARGE LE CERVEAU DU CHEF
        async function syncWithChef() {
            const state = await API.getState();
            if (state && state.activeOrders && state.activeOrders['MENU_MASTER']) {
                currentMenu = state.activeOrders['MENU_MASTER'].data;
                renderMenuButtons();
                document.getElementById('sync-dot').classList.add('online');
            } else {
                document.getElementById('sync-dot').classList.remove('online');
            }
        }

        // 📋 GÉNÉRATION AUTOMATIQUE DES BOUTONS DE PRISES DE COMMANDE
        function renderMenuButtons() {
            const container = document.getElementById('menu-container');
            let html = '';

            const categories = [
                { id: 'menuJour', title: '🔥 MENU DU JOUR' },
                { id: 'suggestions', title: '⭐ SUGGESTIONS' },
                { id: 'entrees', title: 'ENTRÉES' },
                { id: 'plats', title: 'PLATS' },
                { id: 'desserts', title: 'DESSERTS' }
            ];

            categories.forEach(cat => {
                if (currentMenu[cat.id] && currentMenu[cat.id].length > 0) {
                    html += `<div><h3 class="cat-title ${cat.id === 'menuJour' || cat.id === 'suggestions' ? 'special' : ''}">${cat.title}</h3><div class="grid-items">`;
                    
                    currentMenu[cat.id].forEach(item => {
                        // 🟢 INTELLIGENCE DES 86 (Rupture de stock)
                        let isSoldOut = (item.stock === 0);
                        let cleanName = item.name.replace(/\n/g, '<br>'); // Gère les retours à la ligne du Menu du Jour

                        html += `
                            <button class="btn-item ${isSoldOut ? 'sold-out' : ''}" onclick="addToTicket('${escapeQuotes(item.name)}', ${item.price})">
                                <span>${cleanName}</span>
                                <span class="price">${parseFloat(item.price).toFixed(2)} €</span>
                            </button>
                        `;
                    });
                    
                    html += `</div></div>`;
                }
            });

            if (html === '') html = '<div style="text-align: center; color: #555; margin-top: 50px;">La carte est vide. Le chef doit la remplir.</div>';
            container.innerHTML = html;
        }

        function escapeQuotes(str) {
            return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
        }

        // 🛒 GESTION DU TICKET
        function addToTicket(name, price) {
            currentTicket.push({ id: Date.now(), name: name, price: price });
            updateTicketDisplay();
        }

        function removeFromTicket(id) {
            currentTicket = currentTicket.filter(item => item.id !== id);
            updateTicketDisplay();
        }

        function updateTicketDisplay() {
            const list = document.getElementById('ticket');
            let total = 0;
            list.innerHTML = currentTicket.map(item => {
                total += item.price;
                let cleanName = item.name.replace(/\n/g, ' + '); // Aplatit le texte pour le ticket
                return `
                <div class="ticket-item">
                    <span class="ticket-item-name">${cleanName}</span>
                    <span class="ticket-item-price">${item.price.toFixed(2)} €</span>
                    <button class="btn-del" onclick="removeFromTicket(${item.id})">✖</button>
                </div>
            `}).join('');
            document.getElementById('total-val').innerText = total.toFixed(2);
        }

        // 🚀 ENVOI DE LA COMMANDE (VERS LE PAD CUISINE / BAR)
        async function sendOrder() {
            if (currentTicket.length === 0) return alert("Le ticket est vide.");
            const tableId = document.getElementById('table-id').value;
            
            let timestamp = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
            
            // Formatage de la commande pour l'historique
            let orderData = {
                table: tableId,
                time: timestamp,
                items: currentTicket,
                total: parseFloat(document.getElementById('total-val').innerText)
            };

            // Envoi au serveur (Cela s'affichera sur l'écran d'envoi classique si tu l'as configuré)
            await API.update(tableId, orderData);
            
            alert(`✅ Commande envoyée en cuisine pour la ${tableId} !`);
            
            // Reset du ticket
            currentTicket = [];
            updateTicketDisplay();
        }

        // Démarrage
        syncWithChef();
        setInterval(syncWithChef, 5000); // Mise à jour H24 toutes les 5 sec

    </script>
</body>
</html>
