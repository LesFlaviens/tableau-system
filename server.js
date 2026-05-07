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

// ==========================================
// ⚙️ MIDDLEWARES STANDARDS
// ==========================================
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));
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
// 🚦 LOGIQUE MÉTIER & SAS CUISINE
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
// 👑 PANEL ADMINISTRATEUR I CHEF (SECRET)
// ==========================================
const ADMIN_PASS = process.env.ADMIN_PASS || 'Empire2026';

app.get('/panel-ichef', async (req, res) => {
    const pass = req.query.pass;
    if (pass !== ADMIN_PASS) return res.status(401).send('<h1 style="color:red; text-align:center; margin-top:50px;">🔒 ACCÈS REFUSÉ</h1>');

    const tenants = await Tenant.find({});
    
    let html = `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Command Center - I CHEF</title>
        <style>
            body { background: #09090b; color: #fff; font-family: 'Inter', sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
            .card { background: #11141d; padding: 20px; border-radius: 12px; border: 1px solid #2d313a; margin-bottom: 20px; }
            input, button { padding: 15px; margin: 8px 0; width: 100%; box-sizing: border-box; background:#1c1f26; color:#fff; border:1px solid #2d313a; border-radius:8px; font-size: 1rem; }
            button { background: #fbbf24; color: #000; font-weight: 900; cursor: pointer; text-transform: uppercase; border: none; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 0.9rem; }
            th, td { border-bottom: 1px solid #2d313a; padding: 12px 5px; text-align: left; }
            .status-ACTIF { color: #4ade80; font-weight: bold; }
            .status-SUSPENDU { color: #f87171; font-weight: bold; }
            .btn-action { width: auto; padding: 8px 12px; font-size: 0.8rem; border-radius: 6px; }
        </style>
    </head>
    <body>
        <h1 style="color:#fbbf24; text-transform:uppercase; letter-spacing:-1px;">👑 I CHEF - Command Center</h1>
        
        <div class="card">
            <h2 style="margin-top:0;">➕ Nouveau Restaurant</h2>
            <form action="/panel-ichef/add" method="POST">
                <input type="hidden" name="pass" value="${ADMIN_PASS}">
                <input type="text" name="tenantID" placeholder="ID (ex: le_bistrot)" required>
                <input type="text" name="clientName" placeholder="Nom complet du Restaurant" required>
                <button type="submit">Ouvrir l'accès</button>
            </form>
        </div>

        <div class="card">
            <h2 style="margin-top:0;">📋 Flotte Active</h2>
            <table>
                <tr><th>ID Client</th><th>Statut</th><th>Action</th></tr>
                ${tenants.map(t => `
                    <tr>
                        <td><strong>${t.tenantID}</strong><br><span style="color:#9ca3af; font-size:0.8rem;">${t.clientName}</span></td>
                        <td class="status-${t.status}">${t.status}</td>
                        <td>
                            <form action="/panel-ichef/toggle" method="POST" style="margin:0;">
                                <input type="hidden" name="pass" value="${ADMIN_PASS}">
                                <input type="hidden" name="tenantID" value="${t.tenantID}">
                                <input type="hidden" name="newStatus" value="${t.status === 'ACTIF' ? 'SUSPENDU' : 'ACTIF'}">
                                <button type="submit" class="btn-action" style="background: ${t.status === 'ACTIF' ? '#f87171' : '#4ade80'}; color:${t.status === 'ACTIF' ? '#fff' : '#000'};">
                                    ${t.status === 'ACTIF' ? 'Couper' : 'Réactiver'}
                                </button>
                            </form>
                        </td>
                    </tr>
                `).join('')}
            </table>
        </div>
    </body>
    </html>
    `;
    res.send(html);
});

app.post('/panel-ichef/add', async (req, res) => {
    if (req.body.pass !== ADMIN_PASS) return res.status(401).send('Refusé');
    try {
        await Tenant.create({ tenantID: req.body.tenantID, clientName: req.body.clientName, status: 'ACTIF' });
        res.redirect('/panel-ichef?pass=' + ADMIN_PASS);
    } catch (err) {
        res.send('Erreur: Cet ID existe déjà. <a href="/panel-ichef?pass=' + ADMIN_PASS + '">Retour</a>');
    }
});

app.post('/panel-ichef/toggle', async (req, res) => {
    if (req.body.pass !== ADMIN_PASS) return res.status(401).send('Refusé');
    await Tenant.findOneAndUpdate({ tenantID: req.body.tenantID }, { status: req.body.newStatus });
    res.redirect('/panel-ichef?pass=' + ADMIN_PASS);
});

// ==========================================
// 💳 STRIPE : PAIEMENTS ET COMMISSIONS
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
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{ price_data: { currency: 'eur', product_data: { name: 'Commande I CHEF' }, unit_amount: montant }, quantity: 1 }],
            payment_intent_data: {
                application_fee_amount: Math.round(montant * 0.015),
                transfer_data: { destination: tenant.config.stripeConnectedId },
            },
            mode: 'payment',
            success_url: 'https://tableau-system.onrender.com/?success=true', 
            cancel_url: 'https://tableau-system.onrender.com/?canceled=true',
        });
        res.json({ url: session.url });
    } catch (error) { res.status(500).send("Erreur."); }
});

app.listen(PORT, () => console.log("🚀 I CHEF est en ligne sur le port " + PORT));
