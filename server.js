const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');

// 🛡️ ANTI-CRASH STRIPE
const stripeKey = process.env.STRIPE_SECRET_KEY || 'sk_test_dummy_key_pour_eviter_le_crash';
const stripe = require('stripe')(stripeKey);

const app = express();
const PORT = process.env.PORT || 10000;

// ==========================================
// 🔓 CONFIGURATION DES ACCÈS (CORS)
// ==========================================
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept']
}));

// 🚨 WEBHOOK STRIPE (Doit être placé AVANT express.json)
app.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.error(`❌ Erreur Webhook : ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Gestion automatique des statuts selon les paiements
    if (event.type === 'customer.subscription.deleted') {
        const stripeCustomerId = event.data.object.customer;
        await Tenant.findOneAndUpdate({ config: { stripeCustomerId: stripeCustomerId } }, { status: 'SUSPENDU' });
        console.log(`🚨 Compte suspendu (Impayé/Annulé) : ${stripeCustomerId}`);
    }

    if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated') {
        const subscription = event.data.object;
        if (subscription.status === 'active') {
            await Tenant.findOneAndUpdate({ config: { stripeCustomerId: subscription.customer } }, { status: 'ACTIF' });
            console.log(`✅ Compte activé : ${subscription.customer}`);
        }
    }

    res.json({received: true});
});

app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname)));

// ==========================================
// 🧠 CONNEXION MONGODB
// ==========================================
const mongoURI = process.env.MONGO_URI || "mongodb+srv://icheflavien_db_user:VOTRE_MOT_DE_PASSE@cluster0.4w95d7m.mongodb.net/ichef_production?retryWrites=true&w=majority";

mongoose.connect(mongoURI)
    .then(() => console.log('🔥 Connexion Atlas réussie : L\'infrastructure I CHEF est en ligne.'))
    .catch(err => console.error('🔴 Attention, erreur MongoDB :', err.message));

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
// 🛡️ SÉCURITÉ & VÉRIFICATION TENANT (Gardé tel quel)
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
// 🚦 LOGIQUE SAS CUISINE (Gardé tel quel)
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
    if (order === null) { delete state.activeOrders[tableId]; } 
    else { state.activeOrders[tableId] = order; }
    try { await EmpireState.findOneAndUpdate({ id: tenantID }, { activeOrders: state.activeOrders }, { upsert: true }); } catch (e) {}
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
// 💳 TUNNEL DE PAIEMENT STRIPE
// ==========================================
app.get('/create-checkout-session', async (req, res) => {
    try {
        const priceId = process.env.STRIPE_PRICE_ID;
        if(!priceId) return res.status(400).send("Erreur: Produit Stripe non configuré.");

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{ price: priceId, quantity: 1 }],
            mode: 'subscription',
            success_url: 'https://tableau-system.onrender.com/?success=true',
            cancel_url: 'https://tableau-system.onrender.com/?canceled=true',
        });
        res.redirect(303, session.url);
    } catch (error) { res.status(500).send("Erreur de connexion à Stripe."); }
});

// ==========================================
// 🏠 VITRINE DE VENTE I CHEF
// ==========================================
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="fr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>I CHEF - Infrastructure SaaS</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;900&display=swap');
                :root { --bg: #09090b; --panel: #111827; --border: #1f2937; --gold: #fbbf24; --text: #f9fafb; --text-muted: #9ca3af; }
                body { background-color: var(--bg); color: var(--text); font-family: 'Inter', sans-serif; margin: 0; padding: 0; display: flex; flex-direction: column; min-height: 100vh; }
                .header-nav { padding: 30px 50px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); }
                .logo { font-size: 2rem; font-weight: 900; letter-spacing: -1px; }
                .logo span { color: var(--gold); }
                .container { max-width: 1200px; width: 90%; margin: 50px auto; display: grid; grid-template-columns: 1.2fr 1fr; gap: 60px; align-items: center; }
                .hero h1 { font-size: 3.5rem; font-weight: 900; margin: 0 0 15px 0; letter-spacing: -2px; line-height: 1.1; }
                .features { display: flex; flex-direction: column; gap: 20px; }
                .feature { background: var(--panel); border: 1px solid var(--border); padding: 25px; border-radius: 16px; display: flex; gap: 20px; }
                .pricing-card { background: var(--panel); border: 1px solid var(--border); border-radius: 20px; padding: 30px; text-align: center; }
                .btn-submit { background: var(--gold); color: #000; padding: 18px; border-radius: 12px; font-weight: 900; text-decoration: none; display: block; margin-top: 20px; }
            </style>
        </head>
        <body>
            <div class="header-nav">
                <div class="logo">I <span>CHEF</span></div>
            </div>
            <div class="container" id="main-content">
                <div class="hero">
                    <h1>L'infrastructure technologique absolue.</h1>
                    <p>Propulsez votre restaurant avec la puissance de I CHEF.</p>
                    <div class="features">
                        <div class="feature"><h3>SAS Cuisine Autonome</h3></div>
                        <div class="feature"><h3>Portail d'Encaissement NFC</h3></div>
                    </div>
                </div>
                <div class="pricing-card">
                    <h3>Offre Sérénité</h3>
                    <div style="font-size: 3rem; color: var(--gold);">99€<span style="font-size: 1rem;">/mois</span></div>
                    <p style="color: #f87171;">+ 299€ Frais d'installation</p>
                    <a href="/create-checkout-session" class="btn-submit">Souscrire (Fixe)</a>
                </div>
            </div>
            <script>
                if (new URLSearchParams(window.location.search).get('success') === 'true') {
                    document.getElementById('main-content').innerHTML = \`
                        <div style="grid-column: 1/-1; text-align: center; padding: 100px; background: var(--panel); border-radius: 24px;">
                            <h1 style="font-size: 3.5rem;">✅ Paiement validé</h1>
                            <p>Félicitations. L'infrastructure I CHEF est prête. Nous arrivons pour l'installation des 299€.</p>
                            <a href="/" style="color: var(--gold); font-weight: 900;">RETOUR</a>
                        </div>\`;
                }
            </script>
        </body>
        </html>
    `);
});

app.listen(PORT, () => console.log("🚀 I CHEF est en ligne sur le port " + PORT));
