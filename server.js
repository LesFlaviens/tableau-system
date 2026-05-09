const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');

// 🛡️ CONFIGURATION STRIPE
const stripeKey = process.env.STRIPE_SECRET_KEY || 'sk_test_51TN80JQ9Dw3nOFa4i3XTXP15FR4ddYmU9Jw2pGmfaaeABz2P6wazK8RMzHw2Xi1u1LxXFmY2oEDgau4TcScOF9WK00ajIEuweB';
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
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

// ==========================================
// 🧠 BASE DE DONNÉES
// ==========================================
const mongoURI = process.env.MONGO_URI || "mongodb+srv://icheflavien_db_user:Tamere58.@cluster0.4w95d7m.mongodb.net/ichef_production?retryWrites=true&w=majority";
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
// 🚦 LOGIQUE MÉTIER
// ==========================================
app.get('/verify-tenant/:tenantID', async (req, res) => {
    try {
        const tenant = await Tenant.findOne({ tenantID: req.params.tenantID });
        if (!tenant) return res.status(404).json({ success: false, message: "🚨 INCONNU." });
        if (tenant.status === 'SUSPENDU') return res.status(403).json({ success: false, message: "🚨 ACCÈS SUSPENDU." });
        res.json({ success: true, clientName: tenant.clientName, status: tenant.status });
    } catch (error) { res.status(500).json({ error: "Erreur serveur." }); }
});

// ==========================================
// 💳 STRIPE CONNECT
// ==========================================
app.get('/onboard-stripe/:tenantID', async (req, res) => {
    try {
        const tenant = await Tenant.findOne({ tenantID: req.params.tenantID });
        if (!tenant) return res.status(404).send('Restaurant introuvable');

        let accountId = tenant.config.stripeConnectedId;
        if (!accountId) {
            const account = await stripe.accounts.create({ type: 'standard' });
            accountId = account.id;
            await Tenant.findOneAndUpdate({ tenantID: req.params.tenantID }, { "config.stripeConnectedId": accountId });
        }

        const accountLink = await stripe.accountLinks.create({
            account: accountId,
            refresh_url: `http://localhost:10000/onboard-stripe/${req.params.tenantID}`,
            return_url: `http://localhost:10000/panel-ichef?pass=Empire2026`,
            type: 'account_onboarding',
        });

        res.redirect(accountLink.url);
    } catch (error) {
        console.error(error);
        res.status(500).send("Erreur Stripe Connect.");
    }
});

// ==========================================
// 👑 PANEL ADMINISTRATEUR
// ==========================================
const ADMIN_PASS = 'Empire2026';

app.get('/panel-ichef', async (req, res) => {
    const pass = req.query.pass;
    if (pass !== ADMIN_PASS) return res.status(401).send('🔒 ACCÈS REFUSÉ');

    const tenants = await Tenant.find({});
    
    let html = `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="UTF-8">
        <title>Command Center - I CHEF</title>
        <style>
            body { background: #09090b; color: #fff; font-family: sans-serif; padding: 20px; max-width: 900px; margin: 0 auto; }
            .card { background: #11141d; padding: 20px; border-radius: 12px; border: 1px solid #2d313a; margin-bottom: 20px; }
            input, button { padding: 12px; margin: 8px 0; width: 100%; background:#1c1f26; color:#fff; border:1px solid #2d313a; border-radius:8px; }
            button { background: #fbbf24; color: #000; font-weight: bold; cursor: pointer; border: none; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border-bottom: 1px solid #2d313a; padding: 10px; text-align: left; }
            .btn-stripe { background: #6366f1; color: white; padding: 5px 10px; text-decoration: none; border-radius: 4px; font-size: 0.8rem; }
        </style>
    </head>
    <body>
        <h1 style="color:#fbbf24;">👑 I CHEF - Command Center</h1>
        <div class="card">
            <h2>➕ Nouveau Restaurant</h2>
            <form action="/panel-ichef/add" method="POST">
                <input type="hidden" name="pass" value="${ADMIN_PASS}">
                <input type="text" name="tenantID" placeholder="ID (ex: le_bistrot)" required>
                <input type="text" name="clientName" placeholder="Nom complet du Restaurant" required>
                <button type="submit">Ouvrir l'accès</button>
            </form>
        </div>
        <div class="card">
            <h2>📋 Flotte Active</h2>
            <table>
                <tr><th>ID Client</th><th>Statut</th><th>Banque</th></tr>
                ${tenants.map(t => `
                    <tr>
                        <td>${t.tenantID}</td>
                        <td>${t.status}</td>
                        <td><a href="/onboard-stripe/${t.tenantID}" class="btn-stripe">💳 Lier IBAN</a></td>
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
    await Tenant.create({ tenantID: req.body.tenantID, clientName: req.body.clientName, status: 'ACTIF' });
    res.redirect('/panel-ichef?pass=' + ADMIN_PASS);
});

// ==========================================
// 💳 STRIPE : PAIEMENTS
// ==========================================
app.get('/create-checkout-session', async (req, res) => {
    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{ price: 'price_1TN8NPQ9Dw3nOFa4jBaO1Gib', quantity: 1 }],
            mode: 'subscription',
            success_url: 'https://tableau-system.onrender.com/?success=true',
            cancel_url: 'https://tableau-system.onrender.com/?canceled=true',
        });
        res.redirect(303, session.url);
    } catch (error) { res.status(500).send("Erreur Stripe."); }
});

app.listen(PORT, () => console.log("🚀 I CHEF est en ligne sur le port " + PORT));
