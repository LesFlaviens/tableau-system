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
// 💾 SAUVEGARDE PERMANENTE (MONGODB) MULTI-TENANT
// ==========================================
const stateSchema = new mongoose.Schema({
    id: { type: String, required: true }, // Sera désormais le tenantID
    activeOrders: { type: Object, default: {} },
    sasConfig: { type: Object, default: { active: true, maxTables: 5, delaySeconds: 60 } }
});
const EmpireState = mongoose.model('EmpireState', stateSchema);

// ==========================================
// 🚦 LOGIQUE SAS CUISINE & MÉMOIRE ACTIVE MULTI-TENANT
// ==========================================
// La mémoire vive est désormais indexée par tenantID
let tenantsState = {}; 

// Fonction pour initialiser un tenant en mémoire s'il n'existe pas
async function initTenantState(tenantID) {
    if (!tenantsState[tenantID]) {
        try {
            let doc = await EmpireState.findOne({ id: tenantID });
            if (doc) {
                tenantsState[tenantID] = {
                    activeOrders: doc.activeOrders || {},
                    sasConfig: doc.sasConfig || { active: true, maxTables: 5, delaySeconds: 60 },
                    webOrderQueue: [],
                    lastSasRelease: 0
                };
            } else {
                tenantsState[tenantID] = {
                    activeOrders: {},
                    sasConfig: { active: true, maxTables: 5, delaySeconds: 60 },
                    webOrderQueue: [],
                    lastSasRelease: 0
                };
                await new EmpireState({ id: tenantID, activeOrders: {}, sasConfig: tenantsState[tenantID].sasConfig }).save();
            }
        } catch (err) {
            console.error(`Erreur lecture DB State pour ${tenantID}:`, err);
            // Fallback de sécurité
            tenantsState[tenantID] = { activeOrders: {}, sasConfig: { active: true, maxTables: 5, delaySeconds: 60 }, webOrderQueue: [], lastSasRelease: 0 };
        }
    }
    return tenantsState[tenantID];
}

app.get('/get-current-state', async (req, res) => {
    // 💡 Nouveau paramètre: tenantID requis
    const tenantID = req.query.tenantID || 'MASTER_STATE'; // MASTER_STATE par défaut pour la compatibilité avec tes anciens tests
    const state = await initTenantState(tenantID);
    res.json({ activeOrders: state.activeOrders, sasConfig: state.sasConfig });
});

app.post('/update-order', async (req, res) => {
    // 💡 Nouveau paramètre: tenantID requis
    const tenantID = req.query.tenantID || 'MASTER_STATE';
    const { tableId, order } = req.body;
    
    const state = await initTenantState(tenantID);

    // 1. Mise à jour de la mémoire vive pour ce tenant
    if (order === null) {
        delete state.activeOrders[tableId];
    } else {
        state.activeOrders[tableId] = order;
    }
    
    // 2. Gravure immédiate dans la base de données pour ce tenant
    try {
        await EmpireState.findOneAndUpdate(
            { id: tenantID }, 
            { activeOrders: state.activeOrders }, 
            { upsert: true }
        );
    } catch (e) {
        console.error(`🔴 Erreur sauvegarde DB pour ${tenantID}:`, e);
    }
    
    res.json({ success: true });
});

app.post('/update-sas', async (req, res) => {
    const tenantID = req.query.tenantID || 'MASTER_STATE';
    const state = await initTenantState(tenantID);

    state.sasConfig = { ...state.sasConfig, ...req.body };
    
    if (!state.sasConfig.active && state.webOrderQueue.length > 0) {
        while(state.webOrderQueue.length > 0) {
            let nextOrder = state.webOrderQueue.shift();
            state.activeOrders[nextOrder.tableId] = nextOrder.order;
        }
    }
    
    // Sauvegarde de la config SAS
    try {
        await EmpireState.findOneAndUpdate({ id: tenantID }, { sasConfig: state.sasConfig }, { upsert: true });
    } catch(e) {}
    
    res.json({ success: true, sasConfig: state.sasConfig });
});

setInterval(() => {
    // Boucle sur tous les tenants actifs en mémoire
    for (let tenantID in tenantsState) {
        let state = tenantsState[tenantID];
        if (state.sasConfig.active && state.webOrderQueue.length > 0) {
            let now = Date.now();
            if (now - state.lastSasRelease >= (state.sasConfig.delaySeconds * 1000)) {
                let activeWebCount = Object.values(state.activeOrders).filter(o => o && o.isWeb).length;
                if (activeWebCount < state.sasConfig.maxTables) {
                    let nextOrder = state.webOrderQueue.shift();
                    state.activeOrders[nextOrder.tableId] = nextOrder.order;
                    state.lastSasRelease = now;
                    
                    // Mettre à jour MongoDB après l'injection
                    EmpireState.findOneAndUpdate({ id: tenantID }, { activeOrders: state.activeOrders }, { upsert: true }).catch(()=>{});
                }
            }
        }
    }
}, 5000);

// ==========================================
// 🛒 WEBHOOK WOOCOMMERCE 
// ==========================================
app.post('/woo-webhook', async (req, res) => {
    try {
        const tenantID = req.query.tenantID || 'MASTER_STATE';
        const state = await initTenantState(tenantID);
        
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

        let activeWebCount = Object.values(state.activeOrders)
            .filter(o => o && o.isWeb && o.items && o.items.some(i => !i.done)).length;

        if (!state.sasConfig.active || activeWebCount < state.sasConfig.maxTables) {
            state.activeOrders[tableNum] = newOrder;
            console.log(`🚀 Commande Woo #${order.id} envoyée direct au tenant ${tenantID}. En cours : ${activeWebCount + 1}`);
            await EmpireState.findOneAndUpdate({ id: tenantID }, { activeOrders: state.activeOrders }, { upsert: true });
        } else {
            state.webOrderQueue.push({ tableId: tableNum, order: newOrder });
            console.log(`⚠️ Brigade chargée. Commande Woo #${order.id} mise dans le SAS du tenant ${tenantID}.`);
        }

        res.status(200).send("OK");
    } catch (e) {
        console.error("Erreur Webhook :", e);
        res.status(500).send("Erreur interne");
    }
});

// ==========================================
// 📱 PORTAIL QR CODE (L'ADDITION CLIENT VIA STRIPE)
// ==========================================
app.get('/portail-client', async (req, res) => {
    const tableId = req.query.table;
    const tenantID = req.query.tenantID || 'MASTER_STATE';
    const montantStr = req.query.montant;
    
    const state = await initTenantState(tenantID);
    const order = state.activeOrders[tableId];
    
    if (!order) return res.send("<body style='background:#0f172a;color:#f87171;text-align:center;padding:50px;font-family:sans-serif;'><h2>Addition introuvable ou table fermée.</h2></body>");
    
    let amountToPay = parseFloat(montantStr);
    if (isNaN(amountToPay) || amountToPay <= 0) {
         amountToPay = order.items.reduce((acc, i) => acc + (parseFloat(i.p) * (i.qty || 1)), 0);
    }

    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'eur',
                    product_data: {
                        name: `Empire OS - Table ${tableId} (${tenantID})`,
                        description: 'Merci de votre visite.'
                    },
                    unit_amount: Math.round(amountToPay * 100),
                },
                quantity: 1,
            }],
            mode: 'payment',
            success_url: `https://${req.get('host')}/paiement-succes?table=${tableId}&tenantID=${tenantID}`,
            cancel_url: `https://${req.get('host')}/portail-client?table=${tableId}&montant=${amountToPay}&tenantID=${tenantID}`,
        });

        res.redirect(303, session.url);
    } catch (error) {
        console.error("Erreur Stripe :", error);
        res.send("<body style='background:#0f172a;color:#f87171;text-align:center;padding:50px;font-family:sans-serif;'><h2>Erreur de connexion bancaire. Veuillez payer à la caisse.</h2></body>");
    }
});

// Page de confirmation pour le client
app.get('/paiement-succes', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <body style="background:#0f172a;color:#34d399;text-align:center;padding:50px;font-family:sans-serif;">
            <div style="font-size: 5rem; margin-bottom: 20px;">✅</div>
            <h1>PAIEMENT VALIDÉ</h1>
            <p style="color:#94a3b8; font-size: 1.2rem;">Merci ! Vous pouvez fermer cette page ou montrer cet écran à votre serveur.</p>
        </body>
        </html>
    `);
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
// 💳 TUNNEL DE PAIEMENT STRIPE (ABONNEMENT SAAS)
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
// 🏠 VITRINE DE VENTE & ONBOARDING (LANDING PAGE)
// ==========================================
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="fr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Empire OS - L'Infrastructure des Leaders</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;500;700;900&display=swap');
                body { background: #090e17; color: #f8fafc; font-family: 'Inter', sans-serif; margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
                .wrapper { max-width: 900px; width: 90%; margin: 40px auto; }
                
                .hero { text-align: center; margin-bottom: 40px; }
                .hero h1 { color: #fbbf24; font-size: 3rem; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 10px; text-shadow: 0 0 20px rgba(251, 191, 36, 0.3); }
                .hero p { color: #94a3b8; font-size: 1.2rem; }

                .glass-panel { background: rgba(30, 41, 59, 0.7); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.1); border-radius: 24px; padding: 40px; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
                
                .grid-features { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 40px; }
                .feature-card { background: #0f172a; border: 1px solid #334155; padding: 20px; border-radius: 16px; transition: transform 0.3s; position: relative; overflow: hidden; }
                .feature-card::before { content: ''; position: absolute; top: 0; left: 0; width: 4px; height: 100%; background: #fbbf24; }
                .feature-card:hover { transform: translateY(-5px); border-color: #fbbf24; }
                .feature-card h3 { margin: 0 0 10px 0; color: #f8fafc; font-size: 1.2rem; display: flex; align-items: center; gap: 10px; }
                .feature-card p { margin: 0; color: #64748b; font-size: 0.9rem; line-height: 1.5; }

                .checkout-section { background: #0f172a; padding: 30px; border-radius: 16px; border: 1px solid #334155; }
                .checkout-section h2 { color: #fbbf24; text-transform: uppercase; font-size: 1.2rem; margin-top: 0; margin-bottom: 20px; letter-spacing: 1px; display: flex; align-items: center; gap: 10px; }
                
                .input-group { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; }
                @media (max-width: 600px) { .input-group { grid-template-columns: 1fr; } }
                
                input { width: 100%; padding: 15px; box-sizing: border-box; border-radius: 10px; border: 1px solid #334155; background: #1e293b; color: white; font-family: 'Inter', sans-serif; font-size: 1rem; outline: none; transition: 0.3s; }
                input:focus { border-color: #fbbf24; box-shadow: 0 0 0 3px rgba(251, 191, 36, 0.1); }
                
                .btn-pay { background: linear-gradient(135deg, #fbbf24 0%, #d97706 100%); color: #000; padding: 20px; border: none; border-radius: 12px; font-weight: 900; width: 100%; cursor: pointer; font-size: 1.1rem; text-transform: uppercase; letter-spacing: 1px; transition: 0.3s; box-shadow: 0 10px 20px rgba(251, 191, 36, 0.2); }
                .btn-pay:hover { transform: scale(1.02); box-shadow: 0 15px 30px rgba(251, 191, 36, 0.4); }
                
                .success-msg { text-align: center; padding: 40px; }
                .success-msg h1 { color: #34d399; font-size: 3rem; margin-bottom: 10px; }
                .success-msg p { color: #94a3b8; font-size: 1.2rem; margin-bottom: 30px; }
                .btn-outline { display: inline-block; padding: 12px 30px; border: 2px solid #fbbf24; color: #fbbf24; text-decoration: none; border-radius: 8px; font-weight: bold; transition: 0.3s; }
                .btn-outline:hover { background: #fbbf24; color: #000; }
            </style>
        </head>
        <body>
            <div class="wrapper" id="main-content">
                <div class="hero">
                    <h1>EMPIRE OS</h1>
                    <p>L'Infrastructure d'Élite pour la Restauration Haut de Gamme.</p>
                </div>
                
                <div class="glass-panel">
                    <div class="grid-features">
                        <div class="feature-card">
                            <h3>⚡ KDS & SAS Cuisine</h3>
                            <p>Régulation algorithmique des flux de commandes. Finis les coups de feu ingérables. Votre cuisine tourne à la perfection.</p>
                        </div>
                        <div class="feature-card">
                            <h3>🤖 Bureau IA Gemini</h3>
                            <p>Scan intelligent de vos factures et étiquettes DLC. Gestion documentaire automatisée.</p>
                        </div>
                        <div class="feature-card">
                            <h3>💸 Portail Autonome</h3>
                            <p>Encaissement sans friction via QR Code. Rotation des tables accélérée et augmentation immédiate de la rentabilité.</p>
                        </div>
                    </div>

                    <form class="checkout-section" action="/create-checkout-session" method="GET">
                        <h2>🔒 Création de votre instance sécurisée</h2>
                        <div class="input-group">
                            <input type="text" placeholder="Nom de l'Établissement" required>
                            <input type="email" placeholder="Email du Dirigeant" required>
                        </div>
                        <div class="input-group">
                            <input type="text" placeholder="Numéro SIRET" required>
                            <input type="text" placeholder="Numéro de TVA Intracommunautaire">
                        </div>
                        <button type="submit" class="btn-pay">INITIALISER MON SYSTÈME (99€/MOIS)</button>
                        <p style="text-align:center; color:#64748b; font-size:0.8rem; margin-top:15px; margin-bottom:0;">Paiement sécurisé via Stripe. Sans engagement de durée.</p>
                    </form>
                </div>
            </div>
            <script>
                const urlParams = new URLSearchParams(window.location.search);
                if (urlParams.get('success') === 'true') {
                    document.getElementById('main-content').innerHTML = \`
                        <div class="glass-panel success-msg">
                            <h1>✅ PAIEMENT APPROUVÉ</h1>
                            <p>Félicitations. Votre infrastructure est en cours de déploiement.</p>
                            <p style="font-size: 0.9rem;">Vérifiez vos e-mails. Vous allez recevoir vos accès uniques et votre Master PIN dans quelques instants.</p>
                            <br>
                            <a href="/" class="btn-outline">Retour à l'accueil</a>
                        </div>
                    \`;
                }
            </script>
        </body>
        </html>
    `);
});> console.log("🚀 Empire OS est en ligne sur le port " + PORT));
