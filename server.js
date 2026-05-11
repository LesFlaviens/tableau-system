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

app.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;
    try { event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET); } 
    catch (err) { return res.status(400).send(`Webhook Error: ${err.message}`); }
    if (event.type === 'checkout.session.completed') console.log(`💰 PAIEMENT REÇU !`);
    res.json({received: true});
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

// ==========================================
// 🧠 BASE DE DONNÉES : AJOUT DES LICENCES
// ==========================================
const mongoURI = process.env.MONGO_URI || "mongodb+srv://icheflavien_db_user:Tamere58.@cluster0.4w95d7m.mongodb.net/ichef_production?retryWrites=true&w=majority";
mongoose.connect(mongoURI).then(() => console.log('🔥 I CHEF Online')).catch(err => console.error(err.message));

const tenantSchema = new mongoose.Schema({
    tenantID: { type: String, required: true, unique: true },
    clientName: String,
    status: { type: String, enum: ['ACTIF', 'ESSAI', 'SUSPENDU'], default: 'ESSAI' },
    pin: { type: String, default: '9999' }, 
    config: { stripeCustomerId: String, stripeConnectedId: String },
    // 🚨 NOUVEAU : GESTION DES ÉCRANS
    maxScreens: { type: Number, default: 1 }, // Nombre d'écrans payés par le client
    registeredDevices: [String] // Liste des tablettes autorisées
});
const Tenant = mongoose.model('Tenant', tenantSchema);

app.post('/api/activate', async (req, res) => {
    const { sessionId, clientName, tenantID, password } = req.body;
    try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        if (session.payment_status !== 'paid') return res.status(403).json({ error: "Paiement non validé." });

        const existingTenant = await Tenant.findOne({ tenantID: tenantID });
        if (existingTenant) return res.status(400).json({ error: "Cet identifiant est déjà utilisé." });

        const randomPin = Math.floor(1000 + Math.random() * 9000).toString();
        await Tenant.create({
            tenantID: tenantID, clientName: clientName, status: 'ACTIF', pin: randomPin, maxScreens: 1, // 1 seul écran par défaut
            config: { stripeCustomerId: session.customer }
        });
        res.json({ success: true, dedicatedPin: randomPin });
    } catch (error) { res.status(500).json({ error: "Erreur serveur." }); }
});

app.post('/api/verify-pin', async (req, res) => {
    const { tenantID, pin } = req.body;
    try {
        const tenant = await Tenant.findOne({ tenantID: tenantID });
        if (!tenant) return res.status(404).json({ success: false, error: "Restaurant introuvable." });
        if (tenant.pin === pin) res.json({ success: true });
        else res.status(401).json({ success: false, error: "Code incorrect." });
    } catch (error) { res.status(500).json({ success: false, error: "Erreur serveur." }); }
});

app.post('/api/update-pin', async (req, res) => {
    const { tenantID, newPin } = req.body;
    try {
        await Tenant.findOneAndUpdate({ tenantID: tenantID }, { pin: newPin });
        res.json({ success: true });
    } catch (error) { res.status(500).json({ success: false, error: "Erreur serveur." }); }
});

// ==========================================
// 🛡️ NOUVELLE ROUTE : ENREGISTREMENT DE LA TABLETTE
// ==========================================
app.post('/api/register-device', async (req, res) => {
    const { tenantID, deviceID } = req.body;
    try {
        const tenant = await Tenant.findOne({ tenantID: tenantID });
        if (!tenant) return res.status(404).json({ success: false, error: "Compte introuvable." });
        if (tenant.status === 'SUSPENDU') return res.status(403).json({ success: false, error: "Abonnement suspendu." });

        // Si la tablette est déjà connue, on la laisse passer
        if (tenant.registeredDevices.includes(deviceID)) {
            return res.json({ success: true, clientName: tenant.clientName });
        }

        // Si c'est une nouvelle tablette, on vérifie la limite
        if (tenant.registeredDevices.length >= tenant.maxScreens) {
            return res.status(403).json({ success: false, error: `Limite d'écrans atteinte (${tenant.maxScreens} max). Contactez iCHEF pour ajouter une licence.` });
        }

        // On enregistre la nouvelle tablette
        tenant.registeredDevices.push(deviceID);
        await tenant.save();
        res.json({ success: true, clientName: tenant.clientName });

    } catch (error) { res.status(500).json({ success: false, error: "Erreur de licence." }); }
});

const ADMIN_PASS = process.env.ADMIN_PASS || 'Empire2026';
app.get('/panel-ichef', async (req, res) => {
    const pass = req.query.pass;
    if (pass !== ADMIN_PASS) return res.status(401).send('Refusé');
    const tenants = await Tenant.find({});
    
    let html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Command Center</title><style>body{background:#09090b;color:#fff;font-family:sans-serif;padding:20px;}table{width:100%;text-align:left;border-collapse:collapse;margin-top:20px;}th,td{border:1px solid #333;padding:12px;}th{background:#11141d;color:#fbbf24;text-transform:uppercase;}.btn{padding:8px 12px;border:none;border-radius:6px;cursor:pointer;font-weight:bold;color:#000;font-size:0.8rem;margin-right:5px;}.btn-reset{background:#60a5fa;} /* Bleu */ .btn-delete{background:#dc2626;color:#fff;}</style></head><body><h1>👑 I CHEF - Command Center</h1><table><tr><th>ID Client</th><th>Nom</th><th>Statut</th><th>Écrans Utilisés</th><th>Actions</th></tr>
    ${tenants.map(t => `<tr><td>${t.tenantID}</td><td>${t.clientName}</td><td>${t.status}</td><td>${t.registeredDevices.length} / ${t.maxScreens}</td>
    <td>
        <form action="/panel-ichef/action" method="POST" style="display:inline;" onsubmit="return confirm('Sûr ?');">
            <input type="hidden" name="pass" value="${pass}"><input type="hidden" name="tenantID" value="${t.tenantID}">
            <button type="submit" name="action" value="reset_devices" class="btn btn-reset">Libérer les écrans</button>
            <button type="submit" name="action" value="delete" class="btn btn-delete">Éliminer</button>
        </form>
    </td></tr>`).join('')}</table></body></html>`;
    res.send(html);
});

app.post('/panel-ichef/action', async (req, res) => {
    const { pass, tenantID, action } = req.body;
    if (pass !== ADMIN_PASS) return res.status(401).send('Refusé');
    try {
        if (action === 'reset_devices') await Tenant.findOneAndUpdate({ tenantID: tenantID }, { registeredDevices: [] });
        else if (action === 'delete') await Tenant.findOneAndDelete({ tenantID: tenantID });
        res.redirect('/panel-ichef?pass=' + ADMIN_PASS);
    } catch (err) { res.status(500).send("Erreur."); }
});

app.listen(PORT, () => console.log("🚀 I CHEF est en ligne sur le port " + PORT));
