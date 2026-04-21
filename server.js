const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname))); 

// ==========================================
// 🧠 CONNEXION MONGODB (COFFRE-FORT CLOUD)
// ==========================================
const MONGO_URI = process.env.MONGODB_URI;
if (MONGO_URI) {
    mongoose.connect(MONGO_URI)
        .then(() => console.log('🟢 Base de données Cloud Empire OS connectée !'))
        .catch(err => console.error('🔴 Erreur de connexion MongoDB :', err));
}

// 🏗️ MODÈLE CLIENT (TENANT)
const tenantSchema = new mongoose.Schema({
    tenantID: { type: String, required: true, unique: true },
    clientName: String,
    status: { type: String, enum: ['ACTIF', 'ESSAI', 'SUSPENDU'], default: 'ESSAI' },
    trialEndDate: Date,
    config: Object
});
const Tenant = mongoose.model('Tenant', tenantSchema);

// ==========================================
// 🛡️ SÉCURITÉ & VÉRIFICATION TENANT
// ==========================================
app.get('/verify-tenant/:tenantID', async (req, res) => {
    try {
        const tenant = await Tenant.findOne({ tenantID: req.params.tenantID });
        if (!tenant) return res.status(404).json({ success: false, message: "🚨 INCONNU." });
        
        let now = new Date();
        if (tenant.status === 'ESSAI' && tenant.trialEndDate && now > tenant.trialEndDate) {
            tenant.status = 'SUSPENDU'; 
            await tenant.save();
        }

        if (tenant.status === 'SUSPENDU') {
            return res.status(403).json({ success: false, message: "🚨 ACCÈS SUSPENDU." });
        }
        res.json({ success: true, clientName: tenant.clientName, status: tenant.status });
    } catch (error) { res.status(500).json({ error: "Erreur serveur." }); }
});

// ==========================================
// 💾 SAUVEGARDE PERMANENTE DES TABLES (MONGODB)
// ==========================================
const stateSchema = new mongoose.Schema({
    id: { type: String, default: "MASTER_STATE" },
    activeOrders: { type: Object, default: {} },
    sasConfig: { type: Object, default: { active: true, maxTables: 5, delaySeconds: 60 } }
});
const EmpireState = mongoose.model('EmpireState', stateSchema);

// ==========================================
// 🚦 LOGIQUE SAS CUISINE & MÉMOIRE ACTIVE
// ==========================================
let globalState = { activeOrders: {} };
let sasConfig = { active: true, maxTables: 5, delaySeconds: 60 };
let webOrderQueue = []; 
let lastSasRelease = 0;

// 🔄 CHARGEMENT DU MOTEUR AU DÉMARRAGE DU SERVEUR
EmpireState.findOne({ id: "MASTER_STATE" }).then(doc => {
    if (doc) {
        globalState.activeOrders = doc.activeOrders || {};
        sasConfig = doc.sasConfig || sasConfig;
        console.log("💾 SECURE : Commandes et Tables restaurées après redémarrage.");
    } else {
        new EmpireState({ id: "MASTER_STATE", activeOrders: {}, sasConfig }).save();
    }
}).catch(err => console.error("Erreur lecture DB State:", err));

app.get('/get-current-state', (req, res) => res.json({ activeOrders: globalState.activeOrders, sasConfig }));

app.post('/update-order', async (req, res) => {
    const { tableId, order } = req.body;
    
    // 1. Mise à jour de la mémoire vive
    if (order === null) delete globalState.activeOrders[tableId];
    else globalState.activeOrders[tableId] = order;
    
    // 2. Gravure immédiate dans la base de données (Cloud)
    try {
        await EmpireState.findOneAndUpdate(
            { id: "MASTER_STATE" }, 
            { activeOrders: globalState.activeOrders }, 
            { upsert: true }
        );
    } catch (e) {
        console.error("🔴 Erreur sauvegarde DB:", e);
    }
    
    res.json({ success: true });
});

app.post('/update-sas', async (req, res) => {
    sasConfig = { ...sasConfig, ...req.body };
    
    if (!sasConfig.active && webOrderQueue.length > 0) {
        while(webOrderQueue.length > 0) {
            let nextOrder = webOrderQueue.shift();
            globalState.activeOrders[nextOrder.tableId] = nextOrder.order;
        }
    }
    
    // Sauvegarde de la config SAS
    try {
        await EmpireState.findOneAndUpdate({ id: "MASTER_STATE" }, { sasConfig: sasConfig }, { upsert: true });
    } catch(e) {}
    
    res.json({ success: true, sasConfig });
});

setInterval(() => {
    if (sasConfig.active && webOrderQueue.length > 0) {
        let now = Date.now();
        if (now - lastSasRelease >= (sasConfig.delaySeconds * 1000)) {
            let activeWebCount = Object.values(globalState.activeOrders).filter(o => o.isWeb).length;
            if (activeWebCount < sasConfig.maxTables) {
                let nextOrder = webOrderQueue.shift();
                globalState.activeOrders[nextOrder.tableId] = nextOrder.order;
                lastSasRelease = now;
                
                // Mettre à jour MongoDB après l'injection
                EmpireState.findOneAndUpdate({ id: "MASTER_STATE" }, { activeOrders: globalState.activeOrders }, { upsert: true }).catch(()=>{});
            }
        }
    }
}, 5000);

// ==========================================
// 🛒 WEBHOOK WOOCOMMERCE 
// ==========================================
app.post('/woo-webhook', async (req, res) => {
    try {
        const order = req.body;
        if (!order || !order.id) return res.status(400).send("Payload invalide");

        let tableNum = "WEB_" + order.id; 
        if (order.customer_note) {
            let match = order.customer_note.match(/table\s*(\d+)/i);
            if (match) tableNum = match[1];
        }
        if (order.meta_data && Array.isArray(order.meta_data)) {
            let tableMeta = order.meta_data.find(m => m.key && m.key.toLowerCase().includes('table'));
            if (tableMeta && tableMeta.value) tableNum = tableMeta.value;
        }

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

        let activeWebCount = Object.values(globalState.activeOrders)
            .filter(o => o.isWeb && o.items && o.items.some(i => !i.done)).length;

        if (!sasConfig.active || activeWebCount < sasConfig.maxTables) {
            globalState.activeOrders[tableNum] = newOrder;
            console.log(`🚀 Commande Woo #${order.id} envoyée direct. En cours : ${activeWebCount + 1}`);
            await EmpireState.findOneAndUpdate({ id: "MASTER_STATE" }, { activeOrders: globalState.activeOrders }, { upsert: true });
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
// 📱 PORTAIL QR CODE (L'ADDITION CLIENT)
// ==========================================
app.get('/portail-client', (req, res) => {
    const tableId = req.query.table;
    const order = globalState.activeOrders[tableId];
    if (!order) return res.send("Addition vide.");
    const total = order.items.reduce((acc, i) => acc + (parseFloat(i.p) * (i.qty || 1)), 0);
    res.send(`<!DOCTYPE html><html><body style="background:#0f172a;color:white;text-align:center;padding:50px;"><h1>Table ${tableId}</h1><h2>Total : ${total.toFixed(2)}€</h2><button style="padding:15px;background:#fbbf24;border:none;border-radius:10px;font-weight:bold;">PAYER MON ADITION</button></body></html>`);
});

// ==========================================
// 🤖 BUREAU IA GEMINI (SCAN FACTURES & DLC)
// ==========================================
app.post('/analyse-ticket', async (req, res) => {
    try {
        const { image, mimeType, isLabelScan } = req.body;
        const API_KEY = process.env.GEMINI_API_KEY;
        let promptSysteme = isLabelScan 
            ? "MISSION HACCP: Extrais nom, lot, dlc. JSON: {\"nom\":\"...\",\"lot\":\"...\",\"dlc\":\"...\"}" 
            : "EXTRACTION FACTURE: Extrais fournisseur, date, total et articles par catégories. JSON STRICT.";
        
        const payload = { contents: [{ parts: [{ text: promptSysteme }, { inline_data: { mime_type: mimeType || "image/jpeg", data: image } }] }] };
        const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + API_KEY, { method: "POST", body: JSON.stringify(payload) });
        const data = await response.json();
        res.json({ resultat: JSON.parse(data.candidates[0].content.parts[0].text.replace(/\\`\\`\\`json|\\`\\`\\`/g, '').trim()) });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// ==========================================
// 💳 TUNNEL DE PAIEMENT STRIPE
// ==========================================
app.get('/create-checkout-session', async (req, res) => {
    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
            mode: 'subscription',
            success_url: 'https://tableau-system.onrender.com/?success=true',
            cancel_url: 'https://tableau-system.onrender.com/?canceled=true',
        });
        res.redirect(303, session.url);
    } catch (error) { res.status(500).send("Erreur Stripe."); }
});

// ==========================================
// 🏠 MISE EN RAYON : CATALOGUE & INFOS LÉGALES
// ==========================================
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="fr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body { background:#0f172a; color:#f8fafc; font-family: sans-serif; padding: 20px; }
                .container { max-width: 800px; margin: 0 auto; background: #1e293b; padding: 40px; border-radius: 20px; border: 1px solid #fbbf24; }
                h1 { color: #fbbf24; text-align: center; }
                .module-card { background: #334155; padding: 15px; border-radius: 10px; margin-bottom: 15px; border-left: 5px solid #fbbf24; }
                input { width: 100%; padding: 12px; margin: 10px 0; border-radius: 8px; border: none; background: #0f172a; color: white; }
                .btn-pay { background: #fbbf24; color: black; padding: 20px; border: none; border-radius: 10px; font-weight: bold; width: 100%; cursor: pointer; font-size: 1.1rem; }
            </style>
        </head>
        <body>
            <div class="container" id="main-content">
                <h1>EMPIRE OS : CATALOGUE</h1>
                <div class="module-card"><h3>✅ Core SAS Cuisine</h3><p>Régulation automatique des flux de commandes.</p></div>
                <div class="module-card"><h3>✅ Bureau IA Gemini</h3><p>Reconnaissance intelligente des factures et étiquettes DLC.</p></div>
                <div class="module-card"><h3>✅ Portail QR Code</h3><p>Paiement digitalisé et addition autonome.</p></div>

                <form action="/create-checkout-session" method="GET">
                    <h2 style="color:#fbbf24; border-bottom:1px solid #334155;">Infos Légales</h2>
                    <input type="text" placeholder="Nom de la Société" required>
                    <input type="text" placeholder="Numéro SIRET" required>
                    <input type="text" placeholder="Numéro de TVA" required>
                    <input type="email" placeholder="Email de facturation" required>
                    <button type="submit" class="btn-pay">ACTIVER MON ACCÈS (99€/MOIS)</button>
                </form>
            </div>
            <script>
                const urlParams = new URLSearchParams(window.location.search);
                if (urlParams.get('success') === 'true') {
                    document.getElementById('main-content').innerHTML = '<h1 style="color:#22c55e;">✅ PAIEMENT VALIDÉ</h1><p>Bienvenue dans l\\'écosystème Flavien. Vos accès sont prêts.</p><br><a href="/" style="color:#fbbf24;">Retour à l\\'accueil</a>';
                }
            </script>
        </body>
        </html>
    `);
});

app.listen(PORT, () => console.log("🚀 Empire OS est en ligne sur le port " + PORT));
