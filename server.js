const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');

// 🛡️ CONFIGURATION STRIPE
const stripeKey = process.env.STRIPE_SECRET_KEY || 'sk_test_dummy_key';
const stripe = require('stripe')(stripeKey);

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept'] }));

// ==========================================
// 🚨 WEBHOOK : SÉCURITÉ ANTI-IMPAYÉS (AUTO)
// ==========================================
app.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) { return res.status(400).send(`Webhook Error: ${err.message}`); }

    if (event.type === 'customer.subscription.deleted') {
        const stripeCustomerId = event.data.object.customer;
        await Tenant.findOneAndUpdate({ "config.stripeCustomerId": stripeCustomerId }, { status: 'SUSPENDU' });
    }
    if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated') {
        const subscription = event.data.object;
        if (subscription.status === 'active') {
            await Tenant.findOneAndUpdate({ "config.stripeCustomerId": subscription.customer }, { status: 'ACTIF' });
        }
    }
    res.json({received: true});
});

app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname)));

// ==========================================
// 🧠 BASE DE DONNÉES
// ==========================================
const mongoURI = process.env.MONGO_URI || "mongodb+srv://icheflavien_db_user:MOT_DE_PASSE@cluster0.4w95d7m.mongodb.net/ichef_production?retryWrites=true&w=majority";
mongoose.connect(mongoURI).then(() => console.log('🔥 I CHEF Online')).catch(err => console.error(err.message));

const tenantSchema = new mongoose.Schema({
    tenantID: { type: String, required: true, unique: true },
    clientName: String,
    status: { type: String, enum: ['ACTIF', 'ESSAI', 'SUSPENDU'], default: 'ESSAI' },
    trialEndDate: Date,
    config: {
        stripeCustomerId: String,
        stripeConnectedId: String 
    }
});
const Tenant = mongoose.model('Tenant', tenantSchema);

const stateSchema = new mongoose.Schema({
    id: { type: String, required: true },
    activeOrders: { type: Object, default: {} },
    sasConfig: { type: Object, default: { active: true, maxTables: 5, delaySeconds: 60 } }
});
const EmpireState = mongoose.model('EmpireState', stateSchema);

// ==========================================
// 🚦 LOGIQUE MÉTIER & SAS CUISINE (TON MOTEUR)
// ==========================================
let tenantsState = {}; 

async function initTenantState(tenantID) {
    if (!tenantsState[tenantID]) {
        let doc = await EmpireState.findOne({ id: tenantID });
        tenantsState[tenantID] = doc ? { 
            activeOrders: doc.activeOrders || {}, 
            sasConfig: doc.sasConfig || { active: true, maxTables: 5, delaySeconds: 60 }, 
            webOrderQueue: [], 
            lastSasRelease: 0 
        } : { 
            activeOrders: {}, 
            sasConfig: { active: true, maxTables: 5, delaySeconds: 60 }, 
            webOrderQueue: [], 
            lastSasRelease: 0 
        };
    }
    return tenantsState[tenantID];
}

app.get('/verify-tenant/:tenantID', async (req, res) => {
    try {
        const tenant = await Tenant.findOne({ tenantID: req.params.tenantID });
        if (!tenant) return res.status(404).json({ success: false, message: "🚨 INCONNU." });
        if (tenant.status === 'SUSPENDU') return res.status(403).json({ success: false, message: "🚨 ACCÈS SUSPENDU." });
        res.json({ success: true, clientName: tenant.clientName, status: tenant.status });
    } catch (error) { res.status(500).json({ error: "Erreur serveur." }); }
});

app.get('/get-current-state', async (req, res) => {
    const state = await initTenantState(req.query.tenantID || 'MASTER_STATE');
    res.json({ activeOrders: state.activeOrders, sasConfig: state.sasConfig });
});

app.post('/update-order', async (req, res) => {
    const tenantID = req.query.tenantID || 'MASTER_STATE';
    const { tableId, order } = req.body;
    const state = await initTenantState(tenantID);
    if (order === null) delete state.activeOrders[tableId]; else state.activeOrders[tableId] = order;
    await EmpireState.findOneAndUpdate({ id: tenantID }, { activeOrders: state.activeOrders }, { upsert: true });
    res.json({ success: true });
});

// ==========================================
// 📥 ENTRÉE DES COMMANDES CLIENTS (VERS LE SAS)
// ==========================================
app.post('/add-web-order', async (req, res) => {
    try {
        const tenantID = req.query.tenantID || req.body.tenantID || 'MASTER_STATE';
        const { tableId, order } = req.body;

        // 1. On vérifie que la commande est complète
        if (!tableId || !order) {
            return res.status(400).json({ error: "🚨 Il manque la table ou la commande." });
        }

        // 2. On ajoute une "étiquette" pour que le SAS reconnaisse que c'est une commande Web
        order.isWeb = true;

        // 3. On récupère l'état de la cuisine du restaurant
        const state = await initTenantState(tenantID);

        // 4. On met la commande dans la file d'attente (webOrderQueue)
        state.webOrderQueue.push({ tableId, order });

        // On répond au téléphone du client que tout est bon !
        res.json({ 
            success: true, 
            message: "✅ Commande reçue et placée dans le SAS." 
        });

    } catch (error) {
        console.error("Erreur add-web-order:", error);
        res.status(500).json({ error: "Erreur serveur lors de la commande." });
    }
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
    await EmpireState.findOneAndUpdate({ id: tenantID }, { sasConfig: state.sasConfig }, { upsert: true });
    res.json({ success: true, sasConfig: state.sasConfig });
});

// ⏳ LE COEUR DU SYSTÈME : Gestion des flux toutes les 5 secondes
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
// 💳 STRIPE : OFFRE 1 (ABONNEMENT) & OFFRE 2 (COMMISSION)
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

app.post('/create-commission-checkout', async (req, res) => {
    try {
        const { montant, tenantID } = req.body;
        const tenant = await Tenant.findOne({ tenantID });

        // 🛡️ LE BOUCLIER EST ICI :
        if (!tenant || !tenant.config || !tenant.config.stripeConnectedId) {
            return res.status(400).json({ error: "Ce restaurant n'est pas configuré pour recevoir des paiements Stripe Connect." });
        }

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{ price_data: { currency: 'eur', product_data: { name: 'Commande I CHEF' }, unit_amount: montant }, quantity: 1 }],
            payment_intent_data: {
                application_fee_amount: Math.round(montant * 0.015),
                transfer_data: { destination: tenant.config.stripeConnectedId },
            },
            mode: 'payment',
            success_url: 'https://ton-site.com/?success=true', // Pense à mettre ta vraie URL ici
            cancel_url: 'https://ton-site.com/?canceled=true',
        });
        res.json({ url: session.url });
    } catch (error) { 
        console.error("Erreur Checkout Commission:", error);
        res.status(500).send("Erreur interne du serveur."); 
    }
});

// ==========================================
// 🏠 VITRINE I CHEF
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
                :root { --bg: #09090b; --panel: #11141d; --border: #2d313a; --gold: #fbbf24; --text: #f9fafb; --text-muted: #9ca3af; }
                body { background-color: var(--bg); color: var(--text); font-family: 'Inter', sans-serif; margin: 0; padding: 0; }
                .header-nav { padding: 25px 50px; display: flex; justify-content: space-between; align-items: center; }
                .logo { font-size: 1.8rem; font-weight: 900; }
                .logo span { color: var(--gold); }
                .container { max-width: 1200px; width: 92%; margin: 40px auto; display: grid; grid-template-columns: 1fr 1.2fr; gap: 60px; }
                .pricing-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
                .card { background: var(--panel); border: 1px solid var(--border); border-radius: 24px; padding: 40px 25px; text-align: center; }
                .price { font-size: 3.2rem; font-weight: 900; color: var(--gold); }
                .btn { background: var(--gold); color: #000; text-decoration: none; padding: 18px; border-radius: 14px; font-weight: 900; display: block; margin-top: 20px; text-transform: uppercase; cursor:pointer; }
            </style>
        </head>
        <body>
            <div class="header-nav"><div class="logo">I <span>CHEF</span></div></div>
            <div class="container" id="main-content">
                <div class="hero">
                    <h1 style="font-size:3.5rem; font-weight:900;">L'infrastructure technologique absolue.</h1>
                    <p style="color:var(--text-muted); font-size:1.2rem;">L'outil ultime pour restaurants à haut volume.</p>
                </div>
                <div class="pricing-grid">
                    <div class="card">
                        <h3>Offre Sérénité</h3>
                        <div class="price">99€<span style="font-size:1rem;">/mois</span></div>
                        <p style="color:#f87171; font-weight:bold;">+ 300€ Installation & Formation</p>
                        <a href="/create-checkout-session" class="btn">Choisir Fixe</a>
                    </div>
                    <div class="card" style="border-color:var(--gold);">
                        <h3>Offre Partenaire</h3>
                        <div class="price">0€<span style="font-size:1rem;">/mois</span></div>
                        <p style="font-weight:bold;">1.5% de commission sur CA</p>
                        <p style="color:#f87171; font-weight:bold;">+ 300€ Installation & Formation</p>
                        <button class="btn" style="background:transparent; color:#fff; border:1px solid var(--border);" onclick="alert('Contactez-nous pour configurer votre compte partenaire.')">Nous Contacter</button>
                    </div>
                </div>
            </div>
            <script>
                if (new URLSearchParams(window.location.search).get('success') === 'true') {
                    document.getElementById('main-content').innerHTML = '<div style="text-align:center; padding:100px; background:var(--panel); border-radius:30px; border:1px solid var(--gold);"><h1>✅ Dossier Validé</h1><p>Infrastructure I CHEF réservée. Nous arrivons pour l\\'installation et la formation.</p><a href="/" class="btn" style="display:inline-block; padding:15px 40px; text-decoration:none;">Retour</a></div>';
                }
            </script>
        </body>
        </html>
    `);
});

app.listen(PORT, () => console.log("🚀 I CHEF est en ligne sur le port " + PORT));
