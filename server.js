const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname))); 

let globalState = { activeOrders: {} };

app.get('/get-current-state', (req, res) => {
    res.json(globalState);
});

app.post('/update-order', (req, res) => {
    const { tableId, order } = req.body;
    if (order === null) {
        delete globalState.activeOrders[tableId];
    } else {
        globalState.activeOrders[tableId] = order;
    }
    res.json({ success: true });
});

// ==========================================
// 📱 1. PORTAIL DE PAIEMENT (QR Code du Serveur)
// ==========================================
app.get('/portail-client', (req, res) => {
    const tableId = req.query.table;
    const order = globalState.activeOrders[tableId];

    if (!order) {
        return res.send(`<body style="background:#0f172a; color:white; font-family:sans-serif; text-align:center; padding:50px;"><h1 style="color:#fbbf24;">ichef.ch</h1><p>Aucune addition active pour cette table.</p></body>`);
    }

    const total = order.items.reduce((acc, i) => acc + (parseFloat(i.p) * (i.qty || 1)), 0);

    let html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            body { background: #0f172a; color: #f8fafc; font-family: sans-serif; padding: 20px; text-align: center; }
            .card { background: #1e293b; border-radius: 15px; padding: 20px; border: 1px solid #fbbf24; }
            h1 { color: #fbbf24; margin-bottom: 5px; }
            .item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px dashed #334155; font-size: 0.9rem; }
            .total { font-size: 2rem; font-weight: 900; color: #fbbf24; margin: 25px 0; }
            .btn { background: #fbbf24; color: #000; border: none; padding: 15px 30px; border-radius: 10px; font-weight: bold; width: 100%; font-size: 1.1rem; }
        </style>
    </head>
    <body>
        <h1>EMPIRE</h1>
        <p>Addition Table ${tableId}</p>
        <div class="card">
            ${order.items.map(i => `<div class="item"><span>${i.qty || 1}x ${i.n}</span><span>${(parseFloat(i.p) * (i.qty || 1)).toFixed(2)}€</span></div>`).join('')}
            <div class="total">${total.toFixed(2)} €</div>
            <button class="btn" onclick="alert('Lien de paiement bientôt disponible')">Payer par carte</button>
        </div>
    </body>
    </html>`;
    res.send(html);
});

// ==========================================
// 🍽️ 2. MENU DIGITAL (QR Code sur la Table)
// ==========================================
app.get('/menu', (req, res) => {
    const tableId = req.query.table || "Inconnue";
    
    let html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Menu - Table ${tableId}</title>
        <style>
            body { background: #0f172a; color: #fff; font-family: sans-serif; padding: 15px; margin: 0; }
            .header { text-align: center; border-bottom: 2px solid #fbbf24; padding-bottom: 10px; margin-bottom: 20px; }
            h2 { color: #fbbf24; margin-top: 30px; text-transform: uppercase; font-size: 1.2rem; letter-spacing: 1px; }
            .item { background: #1e293b; padding: 15px; margin-bottom: 12px; border-radius: 10px; border: 1px solid #334155; display:flex; justify-content: space-between; align-items: center;}
            .name { font-weight: bold; font-size: 1rem; }
            .price { color: #34d399; font-weight: bold; margin-top: 5px;}
            .btn-add { background: #fbbf24; color: #000; border: none; padding: 10px 15px; border-radius: 6px; font-weight: bold; cursor: pointer; text-transform: uppercase; font-size: 0.85rem;}
        </style>
    </head>
    <body>
        <div class="header">
            <h1 style="color:#fbbf24; margin:0; letter-spacing:3px;">EMPIRE</h1>
            <p style="margin:5px 0 0 0; color:#94a3b8;">Table ${tableId} - Commande en ligne</p>
        </div>
        <div id="menu-content"><p style="text-align:center; color:#94a3b8;">Chargement de la carte...</p></div>

        <script>
            async function loadMenu() {
                let r = await fetch('/get-current-state');
                let state = await r.json();
                let menu = state.activeOrders['MENU_MASTER'] ? state.activeOrders['MENU_MASTER'].data : {};
                let bar = state.activeOrders['MENU_MASTER_BAR'] ? state.activeOrders['MENU_MASTER_BAR'].data : {};
                
                let content = '';
                
                // SECTION CUISINE
                content += '<h2>🔥 Côté Cuisine</h2>';
                ['menuJour', 'suggestions', 'entrees', 'plats', 'desserts'].forEach(cat => {
                    if(menu[cat] && menu[cat].length > 0) {
                        menu[cat].forEach(item => {
                            let n = item.name.replace('🌟 ', '');
                            content += \`<div class="item">
                                <div><div class="name">\${n}</div><div class="price">\${parseFloat(item.price).toFixed(2)} €</div></div>
                                <button class="btn-add" style="background:#f87171; color:#fff;" onclick="sendOrder('\${n.replace(/'/g, "\\'")}', \${item.price}, 'cuisine')">Commander</button>
                            </div>\`;
                        });
                    }
                });

                // SECTION BAR
                content += '<h2>🍸 Côté Bar</h2>';
                ['vins', 'cocktails', 'bieres', 'spiritueux', 'chaudes', 'froides'].forEach(cat => {
                    if(bar[cat] && bar[cat].length > 0) {
                        bar[cat].forEach(item => {
                            let n = item.name.replace('🌟 ', '');
                            content += \`<div class="item">
                                <div><div class="name">\${n}</div><div class="price">\${parseFloat(item.price).toFixed(2)} €</div></div>
                                <button class="btn-add" style="background:#60a5fa; color:#fff;" onclick="sendOrder('\${n.replace(/'/g, "\\'")}', \${item.price}, 'bar')">Commander</button>
                            </div>\`;
                        });
                    }
                });

                if (content === '<h2>🔥 Côté Cuisine</h2><h2>🍸 Côté Bar</h2>') {
                    content = '<p style="text-align:center; color:#94a3b8;">La carte est vide pour le moment.</p>';
                }
                
                document.getElementById('menu-content').innerHTML = content;
            }

            async function sendOrder(name, price, dest) {
                let btn = event.target;
                let originalText = btn.innerText;
                let originalBg = btn.style.background;
                
                btn.innerText = '⏳...';
                btn.disabled = true;

                try {
                    await fetch('/client-order', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({ table: '${tableId}', name: name, price: price, dest: dest })
                    });
                    
                    btn.innerText = '✅ ENVOYÉ !';
                    btn.style.background = '#34d399';
                    btn.style.color = '#000';
                    
                    setTimeout(() => {
                        btn.innerText = originalText;
                        btn.style.background = originalBg;
                        btn.style.color = '#fff';
                        btn.disabled = false;
                    }, 2000);
                } catch(e) {
                    alert('Erreur réseau. Réessayez.');
                    btn.innerText = originalText;
                    btn.disabled = false;
                }
            }

            loadMenu();
        </script>
    </body>
    </html>
    `;
    res.send(html);
});

// 3. ROUTE SECRÈTE : TRI DES COMMANDES CLIENTS
app.post('/client-order', (req, res) => {
    const { table, name, price, dest } = req.body;
    
    // Le serveur ouvre le ticket de la table (ou le crée s'il n'existe pas)
    if (!globalState.activeOrders[table]) {
        globalState.activeOrders[table] = {
            status: 'cooking',
            time: new Date().toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'}),
            clientName: 'Client via QR',
            observations: 'Commande autonome',
            items: [],
            isWeb: true
        };
    }
    
    // Définition de l'ordre de service : Boisson (0) ou Plat (2)
    let cId = dest === 'cuisine' ? 2 : 0; 

    // Injection de l'article avec sa destination stricte
    globalState.activeOrders[table].items.push({
        id: Date.now() + Math.random(),
        itemId: Date.now(),
        n: name,
        p: parseFloat(price),
        qty: 1,
        done: false,
        dest: dest,    // C'est ce paramètre qui splitte entre Cuisine et Bar !
        fired: true,   // La commande part DIRECTEMENT sur les écrans sans validation serveur
        firedTime: Date.now(),
        savedToDB: true,
        course: cId,
        seat: 0
    });
    
    res.json({ success: true });
});

// ==========================================
// 🤖 MOTEUR IA (FACTURES)
// ==========================================
app.post('/analyse-ticket', async (req, res) => {
    try {
        const { image, mimeType, isLabelScan } = req.body;
        const API_KEY = process.env.GEMINI_API_KEY;

        if (!API_KEY) throw new Error("Clé API manquante");

        let promptSysteme = isLabelScan 
            ? "MISSION HACCP : Lis cette etiquette. Extrais : nom, lot, dlc (DD/MM/YY). JSON: {\"nom\": \"...\", \"lot\": \"...\", \"dlc\": \"...\"}"
            : `MISSION EXPERT ECONOMAT : Extraire tous les articles de cette facture. 
            RÈGLES CRITIQUES :
            1. IDENTIFICATION : Extraire le nom du 'fournisseur' et la 'date' de la facture (format DD/MM/YYYY).
            2. PIÈGES : Confiserie = 'economat'. JAMAIS 'proteines'.
            3. 6 CATÉGORIES : feculents, proteines, bof, sauces, legumes, economat.
            4. PRIX UNITAIRE : Si lot, ajoute le prix unitaire au nom (ex: "Oeufs (0.21€/pce)").

            FORMAT JSON STRICT :
            {
              "fournisseur": "NOM",
              "date": "DD/MM/YYYY",
              "total": 0.00, 
              "feculents": [], "proteines": [], "bof": [], "sauces": [], "legumes": [], "economat": []
            }`;

        const payload = {
            contents: [{ parts: [{ text: promptSysteme }, { inline_data: { mime_type: mimeType || "image/jpeg", data: image } }] }],
            generation_config: { response_mime_type: "application/json", temperature: 0.1 }
        };

        const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + API_KEY, {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error.message);

        let rawText = data.candidates[0].content.parts[0].text;
        rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        
        res.json({ resultat: JSON.parse(rawText) });

    } catch (error) {
        console.error("Erreur Moteur IA :", error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => console.log(`🚀 Serveur Empire OS démarré sur le port ${PORT}`));
