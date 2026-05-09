const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');

// 🛡️ CONFIGURATION STRIPE (La clé qui marche !)
const stripeKey = 'sk_test_51TN80JQ9Dw3nOFa4i3XTXP15FR4ddYmU9Jw2pGmfaaeABz2P6wazK8RMzHw2Xi1u1LxXFmY2oEDgau4TcScOF9WK00ajIEuweB';
const stripe = require('stripe')(stripeKey);

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept'] }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

// ==========================================
// 🧠 BASE DE DONNÉES & SCHÉMAS
// ==========================================
const mongoURI = "mongodb+srv://icheflavien_db_user:Tamere58.@cluster0.4w95d7m.mongodb.net/ichef_production?retryWrites=true&w=majority";
mongoose.connect(mongoURI).then(() => console.log('🔥 I CHEF Database Online')).catch(err => console.error(err.message));

// Modèle des Restaurants
const Tenant = mongoose.model('Tenant', new mongoose.Schema({
    tenantID: { type: String, required: true, unique: true },
    clientName: String,
    status: { type: String, enum: ['ACTIF', 'ESSAI', 'SUSPENDU'], default: 'ESSAI' },
    trialEndDate: Date,
    config: { stripeCustomerId: String, stripeConnectedId: String }
}));

// Modèle d'état (Cuisine / Sas)
const EmpireState = mongoose.model('EmpireState', new mongoose.Schema({
    id: { type: String, required: true },
    activeOrders: { type: Object, default: {} },
    sasConfig: { type: Object, default: { active: true, maxTables: 5, delaySeconds: 60 } }
}));

// ==========================================
// 🚦 LOGIQUE MÉTIER (SAS CUISINE & ÉTAT)
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

// Route de vérification pour l'App
app.get('/verify-tenant/:tenantID', async (req, res) => {
    try {
        const tenant = await Tenant.findOne({ tenantID: req.params.tenantID });
        if (!tenant) return res.status(404).json({ success: false, message: "🚨 INCONNU." });
        if (tenant.status === 'SUSPENDU') return res.status(403).json({ success: false, message: "🚨 ACCÈS SUSPENDU." });
        res.json({ success: true, clientName: tenant.clientName, status: tenant.status });
    } catch (error) { res.status(500).json({ error: "Erreur serveur." }); }
});

// ==========================================
// 💳 STRIPE CONNECT (L'INSCRIPTION RESTO)
// ==========================================
app.get('/onboard-stripe/:tenantID', async (req, res) => {
    try {
        const tenant = await Tenant.findOne({ tenantID: req.params.tenantID });
        if (!tenant) return res.status(404).send('Restaurant introuvable');

        let accountId = tenant.config ? tenant.config.stripeConnectedId : null;
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
        res.status(500).send("<h1>Erreur Stripe</h1><p>" + error.message + "</p>");
    }
});

// ==========================================
// 📟 PAIEMENT TERMINAL (COMMISSION 1€)
// ==========================================
app.post('/creer-paiement-terminal', async (req, res) => {
    const { montant, tenantID } = req.body;
    try {
        const tenant = await Tenant.findOne({ tenantID });
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(montant * 100),
            currency: 'eur',
            payment_method_types: ['card_present'],
            capture_method: 'manual',
            application_fee_amount: 100, // Ta commission de 1€
        }, { stripeAccount: tenant.config.stripeConnectedId });
        res.json({ client_secret: paymentIntent.client_secret });
    } catch (error) { res.status(500).send({ error: error.message }); }
});

// ==========================================
// 👑 PANEL ADMINISTRATEUR
// ==========================================
const ADMIN_PASS = 'Empire2026';

app.get('/panel-ichef', async (req, res) => {
    if (req.query.pass !== ADMIN_PASS) return res.status(401).send('🔒 ACCÈS REFUSÉ');
    const tenants = await Tenant.find({});
    
    let html = `
    <body style="background:#09090b; color:#fff; font-family:sans-serif; padding:40px; max-width:900px; margin:auto;">
        <h1>👑 I CHEF - Command Center</h1>
        <div style="background:#11141d; padding:20px; border-radius:12px; border:1px solid #2d313a;">
            <h2>➕ Ajouter un Restaurant</h2>
            <form action="/panel-ichef/add" method="POST">
                <input type="hidden" name="pass" value="${ADMIN_PASS}">
                <input type="text" name="tenantID" placeholder="ID (ex: resto_01)" required style="padding:10px; border-radius:5px; border:none; margin:5px;">
                <input type="text" name="clientName" placeholder="Nom du Resto" required style="padding:10px; border-radius:5px; border:none; margin:5px;">
                <button type="submit" style="padding:10px; background:#fbbf24; border:none; border-radius:5px; cursor:pointer; font-weight:bold;">ACTIVER</button>
            </form>
        </div>
        <table style="width:100%; margin-top:30px; border-collapse:collapse;">
            <tr style="text-align:left; background:#1c1f26;">
                <th style="padding:15px;">Restaurant</th>
                <th>Statut</th>
                <th>Action Bancaire</th>
            </tr>
            ${tenants.map(t => `
                <tr style="border-bottom:1px solid #2d313a;">
                    <td style="padding:15px;">${t.clientName} (ID: ${t.tenantID})</td>
                    <td>${t.status}</td>
                    <td><a href="/onboard-stripe/${t.tenantID}" style="color:#6366f1; font-weight:bold; text-decoration:none;">💳 LIER IBAN</a></td>
                </tr>
            `).join('')}
        </table>
    </body>`;
    res.send(html);
});

app.post('/panel-ichef/add', async (req, res) => {
    await Tenant.create({ tenantID: req.body.tenantID, clientName: req.body.clientName, status: 'ACTIF' });
    res.redirect('/panel-ichef?pass=' + ADMIN_PASS);
});

// ==========================================
// 🚀 LANCEMENT
// ==========================================
app.listen(PORT, () => {
    console.log("🚀 I CHEF opérationnel sur le port " + PORT);
});
