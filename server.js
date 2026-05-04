const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();
const PORT = process.env.PORT || 10000;

// ==========================================
// 🔓 OUVERTURE TOTALE DES PORTES (CORS)
// ==========================================
app.use(cors({
    origin: '*', // Autorise Netlify, votre téléphone, votre PC...
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname)));

// ==========================================
// 🧠 CONNEXION MONGODB (COFFRE-FORT CLOUD)
// ==========================================
const mongoURI = "mongodb+srv://icheflavien_db_user:VOTRE_MOT_DE_PASSE@cluster0.4w95d7m.mongodb.net/ichef_production?retryWrites=true&w=majority";

mongoose.connect(mongoURI)
    .then(() => console.log('🔥 Connexion Atlas réussie : Le fichier JSON est mort, l\'infrastructure est en ligne.'))
    .catch(err => console.error('🔴 Erreur critique de base de données :', err));

// ==========================================
// 🏗️ MODÈLES DE BASE DE DONNÉES
// ==========================================
const tenantSchema = new mongoose.Schema({
    tenantID: { type: String, required: true, unique: true },
    clientName: String,
    status: { type: String, enum: ['ACTIF', 'ESSAI', 'SUSPENDU'], default: 'ESSAI' },
    trialEndDate: Date,
    config: Object
});
const Tenant = mongoose.model('Tenant', tenantSchema);

const stateSchema = new mongoose.Schema({
    id: { type: String, required: true },
    activeOrders: { type: Object, default: {} },
    sasConfig: { type: Object, default: { active: true, maxTables: 5, delaySeconds: 60 } }
});
const EmpireState = mongoose.model('EmpireState', stateSchema);

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
// 🚦 LOGIQUE SAS CUISINE & MÉMOIRE ACTIVE MULTI-TENANT
// ==========================================
let tenantsState = {}; 

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
            tenantsState[tenantID] = { activeOrders: {}, sasConfig: { active: true, maxTables: 5, delaySeconds: 60 }, webOrderQueue: [], lastSasRelease: 0 };
        }
    }
    return tenantsState[tenantID];
}

app.get('/get-current-state', async (req, res) => {
    const tenantID = req.query.tenantID || 'MASTER_STATE';
    const state = await initTenantState(tenantID);
    res.json({ activeOrders: state.activeOrders, sasConfig: state.sasConfig });
});

app.post('/update-order', async (req, res) => {
    const tenantID = req.query.tenantID || 'MASTER_STATE';
    const { tableId, order } = req.body;
    const state = await initTenantState(tenantID);

    if (order === null) {
        delete state.activeOrders[tableId];
    } else {
        // 🔥 CORRECTION DE LA STRUCTURE DE DONNÉES
        // On respecte fidèlement le format envoyé par le client
        state.activeOrders[tableId] = order;
    }
    
    try {
        await EmpireState.findOneAndUpdate({ id: tenantID }, { activeOrders: state.activeOrders }, { upsert: true });
    } catch (e) { console.error(`🔴 Erreur sauvegarde DB pour ${tenantID}:`, e); }
    
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
    
    try { await EmpireState.findOneAndUpdate({ id: tenantID }, { sasConfig: state.sasConfig }, { upsert: true }); } catch(e) {}
    
    res.json({ success: true, sasConfig: state.sasConfig });
});

setInterval(() => {
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
            state.activeOrders[tableNum] = { data: newOrder };
            console.log(`🚀 Commande Woo #${order.id} envoyée direct au tenant ${tenantID}. En cours : ${activeWebCount + 1}`);
            await EmpireState.findOneAndUpdate({ id: tenantID }, { activeOrders: state.activeOrders }, { upsert: true });
        } else {
            state.webOrderQueue.push({ tableId: tableNum, order: { data: newOrder } });
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
    const orderData = state.activeOrders[tableId];
    // Gère le déballage si nécessaire
    const order = orderData && orderData.data ? orderData.data : orderData;
    
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
        res.json({ resultat: JSON.parse(data.candidates[0].content.parts[0].text.replace(/\`\`\`json|\`\`\`/g, '').trim()) });
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
// 🏠 VITRINE DE VENTE & ONBOARDING (LANDING PAGE PREMIUM)
// ==========================================
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="fr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Empire OS - Infrastructure SaaS</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;900&display=swap');
                :root { --bg: #09090b; --panel: #111827; --border: #1f2937; --gold: #fbbf24; --text: #f9fafb; --text-muted: #9ca3af; }
                body { background-color: var(--bg); color: var(--text); font-family: 'Inter', sans-serif; margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
                
                .container { max-width: 1100px; width: 90%; margin: 50px auto; display: grid; grid-template-columns: 1.2fr 1fr; gap: 60px; align-items: center; }
                @media (max-width: 900px) { .container { grid-template-columns: 1fr; gap: 40px; text-align: center; } .features { align-items: center; } .feature { text-align: left; } }
                
                .hero h1 { font-size: 4rem; font-weight: 900; margin: 0 0 15px 0; letter-spacing: -2px; line-height: 1; }
                .hero h1 span { color: var(--gold); }
                .hero p { font-size: 1.15rem; color: var(--text-muted); margin-bottom: 40px; line-height: 1.6; font-weight: 300; max-width: 90%; }
                
                .features { display: flex; flex-direction: column; gap: 20px; }
                .feature { background: var(--panel); border: 1px solid var(--border); padding: 25px; border-radius: 16px; display: flex; gap: 20px; align-items: flex-start; transition: transform 0.3s ease, border-color 0.3s ease; }
                .feature:hover { transform: translateX(8px); border-color: var(--gold); }
                .feature-icon { background: rgba(251, 191, 36, 0.1); color: var(--gold); width: 45px; height: 45px; border-radius: 10px; display: flex; justify-content: center; align-items: center; font-weight: 900; flex-shrink: 0; font-size: 1.2rem; border: 1px solid rgba(251, 191, 36, 0.2); }
                .feature-text h3 { margin: 0 0 8px 0; font-size: 1.2rem; font-weight: 600; letter-spacing: -0.5px; }
                .feature-text p { margin: 0; color: var(--text-muted); font-size: 0.95rem; line-height: 1.5; }
                
                .checkout-box { background: var(--panel); border: 1px solid var(--border); padding: 40px; border-radius: 24px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7); position: relative; overflow: hidden; }
                .checkout-box::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 4px; background: var(--gold); }
                .checkout-box h2 { margin: 0 0 30px 0; font-size: 1.5rem; font-weight: 600; border-bottom: 1px solid var(--border); padding-bottom: 20px; letter-spacing: -0.5px; }
                
                .input-group { display: flex; flex-direction: column; gap: 15px; margin-bottom: 30px; }
                input { background: rgba(0,0,0,0.3); border: 1px solid var(--border); color: var(--text); padding: 18px 20px; border-radius: 12px; font-size: 1rem; font-family: inherit; transition: 0.2s; outline: none; }
                input::placeholder { color: #4b5563; }
                input:focus { border-color: var(--gold); background: rgba(0,0,0,0.5); box-shadow: 0 0 0 4px rgba(251, 191, 36, 0.1); }
                
                .btn-submit { background: var(--gold); color: #000; border: none; padding: 22px; border-radius: 12px; font-weight: 900; font-size: 1.1rem; width: 100%; cursor: pointer; text-transform: uppercase; letter-spacing: 1px; transition: 0.2s; box-shadow: 0 10px 25px -5px rgba(251, 191, 36, 0.4); }
                .btn-submit:hover { transform: translateY(-3px); box-shadow: 0 15px 30px -5px rgba(251, 191, 36, 0.5); }
                .btn-submit:active { transform: translateY(0); box-shadow: none; }
            </style>
        </head>
        <body>
            <div class="container" id="main-content">
                <div class="hero">
                    <h1>I <span>chef</span></h1>
                    <p>L'infrastructure technologique absolue pour les restaurants à haut volume. Automatisez votre production, maîtrisez vos flux et encaissez sans friction.</p>
                    
                    <div class="features">
                        <div class="feature">
                            <div class="feature-icon">⚡</div>
                            <div class="feature-text">
                                <h3>Core SAS Cuisine bar et service </h3>
                                <p>Régulation algorithmique des commandes entrantes. Protégez votre brigade des surcharges de travaille.</p>
                            </div>
                        </div>
                        <div class="feature">
                            <div class="feature-icon">👁️</div>
                            <div class="feature-text">
                                <h3>Vision i chef</h3>
                                <p>Analyse instantanée des factures fournisseurs et gestion stricte des DLC pour un contrôle total.</p>
                            </div>
                        </div>
                        <div class="feature">
                            <div class="feature-icon">💳</div>
                            <div class="feature-text">
                                <h3>Portail Autonome</h3>
                                <p>Encaissement digitalisé et division d'addition sans attente. Maximisez la rotation de vos tables.</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="checkout-box">
                    <h2>Déployer votre instance</h2>
                    <form action="/create-checkout-session" method="GET">
                        <div class="input-group">
                            <input type="text" placeholder="Nom de l'établissement" required>
                            <input type="email" placeholder="Email de la direction" required>
                            <input type="text" placeholder="Numéro SIRET" required>
                        </div>
                        <button type="submit" class="btn-submit">Activer l'accès (99€/mois)</button>
                        <p style="text-align:center; color:var(--text-muted); font-size:0.85rem; margin-top:20px; margin-bottom:0;">Facturation mensuelle sécurisée via Stripe. Sans engagement.</p>
                    </form>
                </div>
            </div>
            
            <script>
                const urlParams = new URLSearchParams(window.location.search);
                if (urlParams.get('success') === 'true') {
                    document.getElementById('main-content').innerHTML = \`
                        <div style="grid-column: 1/-1; text-align: center; padding: 100px 20px; background: var(--panel); border: 1px solid var(--border); border-radius: 24px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);">
                            <div style="font-size: 5rem; margin-bottom: 20px;">✅</div>
                            <h1 style="font-size: 3.5rem; margin-bottom: 15px; letter-spacing: -1px;">Paiement validé</h1>
                            <p style="font-size: 1.2rem; color: var(--text-muted); max-width: 600px; margin: 0 auto 40px auto; line-height: 1.6;">Félicitations. Le déploiement de votre infrastructure Empire OS est en cours. Vos accès administrateurs stricts vous seront envoyés par e-mail dans quelques instants.</p>
                            <a href="/" style="color: var(--gold); text-decoration: none; font-weight: 900; border: 2px solid var(--gold); padding: 15px 30px; border-radius: 10px; text-transform: uppercase; letter-spacing: 1px; transition: 0.2s;" onmouseover="this.style.background='var(--gold)'; this.style.color='#000';" onmouseout="this.style.background='transparent'; this.style.color='var(--gold)';">Retour à l'accueil</a>
                        </div>
                    \`;
                }
            </script>
        </body>
        </html>
    `);
});

app.listen(PORT, () => console.log("🚀 Empire OS est en ligne sur le port " + PORT));
