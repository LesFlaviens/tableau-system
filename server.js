const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');

// 🛡️ CONFIGURATION STRIPE
const stripeKey = process.env.STRIPE_SECRET_KEY || 'sk_test_REMPLACE_PAR_TA_VRAIE_CLE_SECRETE';
const stripe = require('stripe')(stripeKey);

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept'] }));

// ==========================================
// 🚨 WEBHOOK : SÉCURITÉ ANTI-IMPAYÉS (AUTO)
// ==========================================
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_nI2AzPVxFYqsXcuOzZoHG6jcGT8jWRk0';

app.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) { 
        console.error(`❌ Erreur Webhook : ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`); 
    }

    if (event.type === 'checkout.session.completed') {
        console.log(`💰 PAIEMENT REÇU ! Session ID : ${event.data.object.id}`);
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
// 🧠 BASE DE DONNÉES & MODÈLES
// ==========================================
const mongoURI = process.env.MONGO_URI || "mongodb+srv://icheflavien_db_user:Tamere58.@cluster0.4w95d7m.mongodb.net/ichef_production?retryWrites=true&w=majority";
mongoose.connect(mongoURI).then(() => console.log('🔥 I CHEF Online')).catch(err => console.error(err.message));

const tenantSchema = new mongoose.Schema({
    tenantID: { type: String, required: true, unique: true },
    clientName: String,
    status: { type: String, enum: ['ACTIF', 'ESSAI', 'SUSPENDU'], default: 'ESSAI' },
    trialEndDate: Date,
    pin: { type: String, default: '9999' }, 
    config: { stripeCustomerId: String, stripeConnectedId: String }
});
const Tenant = mongoose.model('Tenant', tenantSchema);

// ==========================================
// 🚀 ACTIVATION AUTOMATIQUE POST-PAIEMENT
// ==========================================
app.post('/api/activate', async (req, res) => {
    const { sessionId, clientName, tenantID, password } = req.body;

    try {
        if (!sessionId) return res.status(400).json({ error: "Lien d'activation invalide ou expiré." });

        const session = await stripe.checkout.sessions.retrieve(sessionId);
        if (session.payment_status !== 'paid') return res.status(403).json({ error: "Paiement non validé par la banque." });

        const existingTenant = await Tenant.findOne({ tenantID: tenantID });
        if (existingTenant) return res.status(400).json({ error: "Cet identifiant est déjà utilisé." });

        await Tenant.create({
            tenantID: tenantID,
            clientName: clientName,
            status: 'ACTIF',
            pin: '9999',
            config: { stripeCustomerId: session.customer }
        });
        
        console.log(`✅ NOUVEL EMPIRE DÉPLOYÉ : ${clientName} (${tenantID})`);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Erreur serveur lors du déploiement." });
    }
});

// ==========================================
// 🔒 ROUTE : VÉRIFICATION DU CODE PIN
// ==========================================
app.post('/api/verify-pin', async (req, res) => {
    const { tenantID, pin } = req.body;
    try {
        const tenant = await Tenant.findOne({ tenantID: tenantID });
        if (!tenant) return res.status(404).json({ success: false, error: "Restaurant introuvable." });
        
        // Sécurité pour les anciens comptes sans code PIN
        const dbPin = tenant.pin || '9999'; 

        if (dbPin === pin) {
            res.json({ success: true });
        } else {
            res.status(401).json({ success: false, error: "Code incorrect." });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: "Erreur serveur." });
    }
});

// ==========================================
// 🔑 ROUTE : VÉRIFICATION D'IDENTITÉ (CONNEXION)
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
// 💳 STRIPE CONNECT : COMPTE RESTAURANT
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
            refresh_url: `https://tableau-system.onrender.com/onboard-stripe/${req.params.tenantID}`,
            return_url: `https://tableau-system.onrender.com/panel-ichef?pass=Empire2026`, 
            type: 'account_onboarding',
        });

        res.redirect(accountLink.url);
   } catch (error) {
        res.status(500).send("Erreur Stripe : " + error.message);
    }
});

// ==========================================
// 👑 PANEL ADMINISTRATEUR I CHEF
// ==========================================
const ADMIN_PASS = process.env.ADMIN_PASS || 'Empire2026';

app.get('/panel-ichef', async (req, res) => {
    const pass = req.query.pass;
    if (pass !== ADMIN_PASS) return res.status(401).send('<h1 style="color:red; text-align:center; margin-top:50px;">🔒 ACCÈS REFUSÉ</h1>');

    const tenants = await Tenant.find({});
    
    let html = `
    <!DOCTYPE html>
    <html lang="fr">
    <head><meta charset="UTF-8"><title>Command Center</title><style>body{background:#09090b;color:#fff;font-family:sans-serif;padding:20px;}table{width:100%;text-align:left;}</style></head>
    <body>
        <h1>👑 I CHEF - Command Center</h1>
        <table border="1" cellpadding="10" cellspacing="0" style="border-color:#333;">
            <tr><th>ID Client</th><th>Nom</th><th>Statut</th><th>PIN Actuel</th></tr>
            ${tenants.map(t => `<tr><td>${t.tenantID}</td><td>${t.clientName}</td><td>${t.status}</td><td>${t.pin || '9999'}</td></tr>`).join('')}
        </table>
    </body>
    </html>
    `;
    res.send(html);
});

// ==========================================
// 💳 STRIPE : PAIEMENT ABONNEMENT
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

app.listen(PORT, () => console.log("🚀 I CHEF est en ligne sur le port " + PORT));
