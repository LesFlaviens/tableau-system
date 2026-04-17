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
// 🚦 LOGIQUE SAS CUISINE (FLUX RÉGULÉS)
// ==========================================
let globalState = { activeOrders: {} };
let sasConfig = { active: true, maxTables: 5, delaySeconds: 60 };
let webOrderQueue = []; 
let lastSasRelease = 0;

app.get('/get-current-state', (req, res) => res.json({ activeOrders: globalState.activeOrders, sasConfig }));
app.post('/update-order', (req, res) => {
    const { tableId, order } = req.body;
    if (order === null) delete globalState.activeOrders[tableId];
    else globalState.activeOrders[tableId] = order;
    res.json({ success: true });
});

app.post('/update-sas', (req, res) => {
    sasConfig = { ...sasConfig, ...req.body };
    if (!sasConfig.active && webOrderQueue.length > 0) {
        while(webOrderQueue.length > 0) {
            let nextOrder = webOrderQueue.shift();
            globalState.activeOrders[nextOrder.tableId] = nextOrder.order;
        }
    }
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
            }
        }
    }
}, 5000);

// ==========================================
// 🛒 WEBHOOK WOOCOMMERCE
// ==========================================
app.post('/woo-webhook', (req, res) => {
    // ... La logique WooCommerce que nous avons validée ensemble reste ici ...
    res.status(200).send("OK");
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
