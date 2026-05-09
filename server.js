const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');

// 🛡️ CONFIGURATION STRIPE (Hardcodée pour éviter toute erreur)
// Si l'erreur persiste, il faudra copier à nouveau la clé depuis ton dashboard Stripe
const stripeKey = 'sk_test_51TN80JQ9Dw3nOFa4i3XTXP15FR4ddYmU9Jw2pGmfaaeABz2P6wazK8RMzHw2Xi1u1LxXFmY2oEDgau4TcScOF9WK00ajIEuweB';
const stripe = require('stripe')(stripeKey);

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept'] }));

// ==========================================
// 🚨 WEBHOOK
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
    res.json({received: true});
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

// ==========================================
// 🧠 BASE DE DONNÉES
// ==========================================
const mongoURI = "mongodb+srv://icheflavien_db_user:Tamere58.@cluster0.4w95d7m.mongodb.net/ichef_production?retryWrites=true&w=majority";
mongoose.connect(mongoURI).then(() => console.log('🔥 I CHEF Database Connected')).catch(err => console.error(err.message));

const tenantSchema = new mongoose.Schema({
    tenantID: { type: String, required: true, unique: true },
    clientName: String,
    status: { type: String, enum: ['ACTIF', 'ESSAI', 'SUSPENDU'], default: 'ESSAI' },
    config: { stripeCustomerId: String, stripeConnectedId: String }
});
const Tenant = mongoose.model('Tenant', tenantSchema);

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
        console.error("Erreur Connect:", error.message);
        res.status(500).send("Détail Erreur : " + error.message);
    }
});

// ==========================================
// 📟 TERMINAL (COMMISSION 1€)
// ==========================================
app.post('/creer-paiement-terminal', async (req, res) => {
    const { montant, tenantID } = req.body;
    try {
        const tenant = await Tenant.findOne({ tenantID });
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(montant * 100),
            currency: 'eur',
            payment_method_types: ['card_present'],
            application_fee_amount: 100, // Ta commission
        }, { stripeAccount: tenant.config.stripeConnectedId });
        res.json({ client_secret: paymentIntent.client_secret });
    } catch (error) { res.status(500).send({ error: error.message }); }
});

// ==========================================
// 👑 PANEL ADMIN
// ==========================================
const ADMIN_PASS = 'Empire2026';

app.get('/panel-ichef', async (req, res) => {
    if (req.query.pass !== ADMIN_PASS) return res.status(401).send('🔒 ACCÈS REFUSÉ');
    const tenants = await Tenant.find({});
    let html = `
    <body style="background:#09090b; color:#fff; font-family:sans-serif; padding:40px;">
        <h1>👑 I CHEF - Command Center</h1>
        <form action="/panel-ichef/add" method="POST" style="background:#11141d; padding:20px; border-radius:10px;">
            <input type="hidden" name="pass" value="${ADMIN_PASS}">
            <input type="text" name="tenantID" placeholder="ID (ex: bistrot_01)" required style="padding:10px; margin:5px;">
            <input type="text" name="clientName" placeholder="Nom du Restaurant" required style="padding:10px; margin:5px;">
            <button type="submit" style="padding:10px; background:#fbbf24; border:none; cursor:pointer;">Ouvrir l'accès</button>
        </form>
        <table style="width:100%; margin-top:20px; border-collapse:collapse;">
            <tr style="background:#1c1f26;"><th>ID</th><th>Nom</th><th>Action</th></tr>
            ${tenants.map(t => `<tr><td>${t.tenantID}</td><td>${t.clientName}</td><td><a href="/onboard-stripe/${t.tenantID}" style="color:#6366f1;">💳 LIER IBAN</a></td></tr>`).join('')}
        </table>
    </body>`;
    res.send(html);
});

app.post('/panel-ichef/add', async (req, res) => {
    if (req.body.pass !== ADMIN_PASS) return res.status(401).send('Refusé');
    await Tenant.create({ tenantID: req.body.tenantID, clientName: req.body.clientName, status: 'ACTIF' });
    res.redirect('/panel-ichef?pass=' + ADMIN_PASS);
});

app.listen(PORT, () => {
    console.log("🚀 I CHEF est en ligne sur le port " + PORT);
});
