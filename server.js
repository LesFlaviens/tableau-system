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
// 🚦 SAS DE DÉCOMPRESSION (CADENCEMENT)
// ==========================================
let webOrderQueue = []; // La file d'attente invisible

// Le Métronome (Tourne toutes les 60 secondes en tâche de fond)
setInterval(() => {
    if (webOrderQueue.length > 0) {
        // On compte combien de tables WEB sont actuellement "en cours" (non servies)
        let activeWebCount = Object.values(globalState.activeOrders)
            .filter(o => o.isWeb && o.items && o.items.some(i => !i.done)).length;

        // Si l'équipe a moins de 5 tickets Web en cours, on libère 1 ticket du SAS
        if (activeWebCount < 5) {
            let nextOrder = webOrderQueue.shift(); // Sort le premier de la file
            
            // On actualise l'heure pour la brigade pour que le ticket ne paraisse pas en retard
            nextOrder.order.time = new Date().toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'});
            if(nextOrder.order.items) {
                nextOrder.order.items.forEach(i => {
                    i.firedTime = Date.now();
                    i.itemId = Date.now();
                });
            }

            globalState.activeOrders[nextOrder.tableId] = nextOrder.order;
            console.log(`🟢 SAS Libéré : Commande ${nextOrder.tableId} envoyée à la brigade. Reste en attente : ${webOrderQueue.length}`);
        }
    }
}, 60000); // Vérification toutes les 60 secondes

// ==========================================
// 🛒 WEBHOOK WOOCOMMERCE BLINDÉ, CADENCÉ & ROUTAGE STRICT
// ==========================================
app.post('/woo-webhook', (req, res) => {
    try {
        const order = req.body;
        if (!order || !order.id) return res.status(400).send("Payload invalide");

        // 1. Détection de la Table
        let tableNum = "WEB_" + order.id; 
        if (order.customer_note) {
            let match = order.customer_note.match(/table\s*(\d+)/i);
            if (match) tableNum = match[1];
        }
        if (order.meta_data && Array.isArray(order.meta_data)) {
            let tableMeta = order.meta_data.find(m => m.key && m.key.toLowerCase().includes('table'));
            if (tableMeta && tableMeta.value) tableNum = tableMeta.value;
        }

        // 2. Formatage du Ticket
        let newOrder = {
            status: 'cooking',
            time: new Date().toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'}),
            clientName: (order.billing?.first_name || 'Client') + ' (Woo)',
            observations: order.customer_note || 'Commande Web',
            items: [],
            isWeb: true,
            totalStr: (order.total || "0.00") + " €",
            id: order.id
        };

        // 3. ROUTAGE ULTRA-PRÉCIS (Mots exacts uniquement)
        const regexBar = /\b(vin|vins|bière|bières|biere|bieres|cocktail|cocktails|eau|eaux|coca|cocas|jus|café|cafés|cafe|cafes|mojito|mojitos|verre|verres|bouteille|bouteilles|rhum|vodka|boisson|boissons|thé|thés|the|thes|sirop|sprite|fanta|limonade|perrier|alcool|soft|softs)\b/i;
        const regexDessert = /\b(dessert|desserts|glace|glaces|chocolat|chocolats|gâteau|gâteaux|gateau|gateaux|tarte|tartes|tiramisu|crème|creme|fruit|fruits|sorbet|sorbets|fondant|mousse)\b/i;
        const regexEntree = /\b(entrée|entrées|entree|entrees|salade|salades|soupe|soupes|planche|planches|tapas|foie|saumon|carpaccio|tartare|charcuterie|fromage|fromages)\b/i;

        if (order.line_items && Array.isArray(order.line_items)) {
            order.line_items.forEach(item => {
                let rawName = item.name || "Produit sans nom";
                let nomItem = rawName.toLowerCase();
                
                let dest = 'cuisine'; 
                let course = 2; 

                if (regexBar.test(nomItem)) { dest = 'bar'; course = 0; } 
                else if (regexDessert.test(nomItem)) { dest = 'cuisine'; course = 3; } 
                else if (regexEntree.test(nomItem)) { dest = 'cuisine'; course = 1; }

                newOrder.items.push({
                    id: Date.now() + Math.random(),
                    itemId: Date.now(),
                    n: rawName,
                    p: parseFloat(item.price || item.total || 0),
                    qty: item.quantity || 1,
                    done: false,
                    dest: dest,
                    fired: true, 
                    firedTime: Date.now(),
                    savedToDB: true,
                    course: course,
                    seat: 0
                });
            });
        }

        // 4. LA DÉCISION DU RÉGULATEUR (Envoi direct ou SAS)
        let activeWebCount = Object.values(globalState.activeOrders)
            .filter(o => o.isWeb && o.items && o.items.some(i => !i.done)).length;

        if (activeWebCount < 5) {
            globalState.activeOrders[tableNum] = newOrder;
            console.log(`🚀 Commande Woo #${order.id} envoyée direct. En cours : ${activeWebCount + 1}`);
        } else {
            webOrderQueue.push({ tableId: tableNum, order: newOrder });
            console.log(`⚠️ Brigade chargée. Commande Woo #${order.id} mise dans le SAS.`);
        }

        res.status(200).send("OK");
    } catch (e) {
        console.error("Erreur Webhook :", e);
        res.status(500).send("Erreur interne");
    }
});

// ==========================================
// 📱 PORTAIL CLIENT (QR Code d'encaissement)
// ==========================================
app.get('/portail-client', (req, res) => {
    const tableId = req.query.table;
    const order = globalState.activeOrders[tableId];
    if (!order) return res.send(`<body style="background:#0f172a; color:white; font-family:sans-serif; text-align:center; padding:50px;"><h1 style="color:#fbbf24;">ichef.ch</h1><p>Aucune addition active pour la table ${tableId}.</p></body>`);
    const total = order.items.reduce((acc, i) => acc + (parseFloat(i.p) * (i.qty || 1)), 0);
    res.send(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{background:#0f172a;color:#f8fafc;font-family:sans-serif;padding:20px;text-align:center;}.card{background:#1e293b;border-radius:15px;padding:20px;border:1px solid #fbbf24;}h1{color:#fbbf24;margin-bottom:5px;}.item{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px dashed #334155;font-size:0.9rem;}.total{font-size:2rem;font-weight:900;color:#fbbf24;margin:25px 0;}.btn{background:#fbbf24;color:#000;border:none;padding:15px 30px;border-radius:10px;font-weight:bold;width:100%;font-size:1.1rem;}</style></head><body><h1>EMPIRE</h1><p>Addition Table ${tableId}</p><div class="card">${order.items.map(i=>`<div class="item"><span>${i.qty||1}x ${i.n}</span><span>${(parseFloat(i.p)*(i.qty||1)).toFixed(2)}€</span></div>`).join('')}<div class="total">${total.toFixed(2)} €</div><button class="btn" onclick="alert('Paiement via Stripe bientôt activé')">Payer</button></div></body></html>`);
});

// ==========================================
// 🤖 MOTEUR IA (FACTURES)
// ==========================================
app.post('/analyse-ticket', async (req, res) => {
    try {
        const { image, mimeType, isLabelScan } = req.body;
        const API_KEY = process.env.GEMINI_API_KEY;
        if (!API_KEY) throw new Error("Clé API manquante");
        let promptSysteme = isLabelScan ? "MISSION HACCP: Lis etiquette. Extrais nom, lot, dlc. JSON: {\"nom\":\"...\",\"lot\":\"...\",\"dlc\":\"...\"}" : `EXTRACTION FACTURE. 1. FOURNISSEUR et DATE. 2. 6 catégories : feculents, proteines, bof, sauces, legumes, economat. JSON STRICT: {"fournisseur":"NOM","date":"DD/MM/YYYY","total":0.00,"feculents":[],"proteines":[],"bof":[],"sauces":[],"legumes":[],"economat":[]}`;
        const payload = { contents: [{ parts: [{ text: promptSysteme }, { inline_data: { mime_type: mimeType || "image/jpeg", data: image } }] }], generation_config: { response_mime_type: "application/json", temperature: 0.1 } };
        const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + API_KEY, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        const data = await response.json();
        if (data.error) throw new Error(data.error.message);
        let rawText = data.candidates[0].content.parts[0].text;
        res.json({ resultat: JSON.parse(rawText.replace(/```json/g, '').replace(/```/g, '').trim()) });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => console.log(`🚀 Serveur Empire OS démarré sur le port ${PORT}`));
