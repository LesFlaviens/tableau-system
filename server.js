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
// 🚨 WEBHOOK : SÉCURITÉ ANTI-IMPAYÉS
// ==========================================
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
// 🧠 BASE DE DONNÉES : LICENCES & SYNCHRONISATION
// ==========================================
const mongoURI = process.env.MONGO_URI || "mongodb+srv://icheflavien_db_user:Tamere58.@cluster0.4w95d7m.mongodb.net/ichef_production?retryWrites=true&w=majority";
mongoose.connect(mongoURI).then(() => console.log('🔥 I CHEF Infrastructure Online')).catch(err => console.error(err.message));

// Modèle des Licences (Restaurants)
const tenantSchema = new mongoose.Schema({
    tenantID: { type: String, required: true, unique: true },
    clientName: String,
    status: { type: String, enum: ['ACTIF', 'ESSAI', 'SUSPENDU'], default: 'ACTIF' },
    pin: { type: String, default: '9999' }, 
    maxScreens: { type: Number, default: 1 }, 
    registeredDevices: [String], 
    config: { stripeCustomerId: String, stripeConnectedId: String }
});
const Tenant = mongoose.model('Tenant', tenantSchema);

// Modèle de Synchronisation (Caisse / KDS / RH)
const stateSchema = new mongoose.Schema({
    tenantID: { type: String, required: true, unique: true },
    activeOrders: { type: Object, default: {} }
}, { minimize: false });
const AppState = mongoose.model('AppState', stateSchema);

// ==========================================
// 🚀 ACTIVATION DU RESTAURANT (POST-PAIEMENT)
// ==========================================
app.post('/api/activate', async (req, res) => {
    const { sessionId, clientName, tenantID } = req.body;
    try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        if (session.payment_status !== 'paid') return res.status(403).json({ error: "Paiement non validé par Stripe." });

        const existingTenant = await Tenant.findOne({ tenantID: tenantID });
        if (existingTenant) return res.status(400).json({ error: "Cet identifiant de restaurant est déjà utilisé." });

        const randomPin = Math.floor(1000 + Math.random() * 9000).toString();
        
        await Tenant.create({
            tenantID: tenantID, clientName: clientName, status: 'ACTIF', pin: randomPin, maxScreens: 1,
            config: { stripeCustomerId: session.customer }
        });
        
        // Initialiser la base de données de ce restaurant
        await AppState.create({ tenantID: tenantID, activeOrders: {} });

        res.json({ success: true, dedicatedPin: randomPin });
    } catch (error) { 
        console.error(error);
        res.status(500).json({ error: "Erreur serveur lors de la création." }); 
    }
});

// ==========================================
// 🔑 ROUTES API : LICENCES & PIN
// ==========================================
app.post('/api/verify-pin', async (req, res) => {
    const { tenantID, pin } = req.body;
    try {
        const tenant = await Tenant.findOne({ tenantID: tenantID });
        if (!tenant) return res.status(404).json({ success: false, error: "Restaurant introuvable." });
        if (tenant.pin === pin) res.json({ success: true });
        else res.status(401).json({ success: false, error: "Code incorrect." });
    } catch (error) { res.status(500).json({ success: false, error: "Erreur serveur." }); }
});

// --- AJOUT CHIRURGICAL POUR LA VITRINE ---
app.get('/api/check-license', async (req, res) => {
    const { tenantID } = req.query;
    try {
        const tenant = await Tenant.findOne({ tenantID: tenantID });
        if (!tenant) return res.status(404).json({ success: false, status: 'introuvable' });
        res.json({ success: true, status: tenant.status });
    } catch (error) { res.status(500).json({ success: false, error: "Erreur serveur" }); }
});
// ------------------------------------------

app.post('/api/register-device', async (req, res) => {
    const { tenantID, deviceID } = req.body;
    try {
        const tenant = await Tenant.findOne({ tenantID: tenantID });
        if (!tenant) return res.status(404).json({ success: false, error: "Compte introuvable." });
        if (tenant.status === 'SUSPENDU') return res.status(403).json({ success: false, error: "Accès suspendu." });

        if (tenant.registeredDevices.includes(deviceID)) {
            return res.json({ success: true, clientName: tenant.clientName });
        }

        if (tenant.registeredDevices.length >= tenant.maxScreens) {
            return res.status(403).json({ success: false, error: `LIMITE D'ÉCRANS ATTEINTE (${tenant.maxScreens} max). Contactez iCHEF.` });
        }

        tenant.registeredDevices.push(deviceID);
        await tenant.save();
        res.json({ success: true, clientName: tenant.clientName });
    } catch (error) { res.status(500).json({ success: false, error: "Erreur de licence." }); }
});

// ==========================================
// 📡 MOTEUR DE SYNCHRONISATION (CAISSE / KDS)
// ==========================================
app.get('/get-current-state', async (req, res) => {
    try {
        const tenantID = req.query.tenantID || 'MASTER_STATE';
        let state = await AppState.findOne({ tenantID });
        if (!state) state = await AppState.create({ tenantID, activeOrders: {} });
        res.json(state);
    } catch (e) { res.status(500).json({ error: "Erreur serveur de synchronisation" }); }
});

app.post('/update-order', async (req, res) => {
    try {
        const tenantID = req.query.tenantID || 'MASTER_STATE';
        const { tableId, order } = req.body;
        
        let state = await AppState.findOne({ tenantID });
        if (!state) state = new AppState({ tenantID, activeOrders: {} });

        if (order === null) {
            delete state.activeOrders[tableId];
        } else {
            state.activeOrders[tableId] = order;
        }
        
        state.markModified('activeOrders');
        await state.save();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Erreur sauvegarde" }); }
});

// ==========================================
// 👑 COMMAND CENTER : PORTAIL DE DIRECTION
// ==========================================
const ADMIN_PASS = process.env.ADMIN_PASS || 'Empire2026';

app.get('/panel-ichef', async (req, res) => {
    const pass = req.query.pass;
    if (pass !== ADMIN_PASS) return res.status(401).send('<h1 style="color:red; text-align:center;">🔒 ACCÈS DIRECTION REFUSÉ</h1>');

    const tenants = await Tenant.find({});
    
    let html = `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="UTF-8">
        <title>COMMAND CENTER - iCHEF</title>
        <style>
            body { background: #050505; color: #fff; font-family: sans-serif; padding: 30px; }
            table { width: 100%; border-collapse: collapse; margin-top: 30px; background: #0a0a0a; }
            th, td { border: 1px solid #222; padding: 15px; text-align: left; vertical-align: middle; }
            th { background: #111; color: #fbbf24; text-transform: uppercase; font-size: 0.8rem; letter-spacing: 1px; }
            .pin-code { font-family: monospace; font-size: 1.3rem; color: #4ade80; font-weight: 900; background: rgba(74,222,128,0.1); padding: 5px 10px; border-radius: 4px; }
            .status { font-weight: bold; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; }
            .status-ACTIF { background: rgba(74,222,128,0.1); color: #4ade80; }
            .status-SUSPENDU { background: rgba(248,113,113,0.1); color: #f87171; }
            .btn { padding: 10px 15px; border: none; border-radius: 6px; cursor: pointer; font-weight: 800; text-transform: uppercase; font-size: 0.7rem; transition: 0.2s; margin-right: 5px; }
            .btn-add { background: #fbbf24; color: #000; }
            .btn-reset { background: #3b82f6; color: #fff; }
            .btn-del { background: #b91c1c; color: #fff; }
            .screen-info { font-weight: 900; font-size: 1.1rem; color: #fbbf24; }
        </style>
    </head>
    <body>
        <h1 style="letter-spacing: 2px;">👑 iCHEF <span style="color:#fbbf24">COMMAND CENTER</span></h1>
        <table>
            <tr>
                <th>Identifiant</th>
                <th>Restaurant</th>
                <th>Statut</th>
                <th>Code PIN</th>
                <th>Licences Écrans</th>
                <th>Gestion Licences</th>
                <th>Contrôle d'Urgence</th>
            </tr>
            ${tenants.map(t => `
                <tr>
                    <td><b>${t.tenantID}</b></td>
                    <td>${t.clientName}</td>
                    <td><span class="status status-${t.status}">${t.status}</span></td>
                    <td><span class="pin-code">${t.pin}</span></td>
                    <td><span class="screen-info">${t.registeredDevices.length} / ${t.maxScreens}</span></td>
                    <td>
                        <form action="/panel-ichef/action" method="POST" style="display:inline;">
                            <input type="hidden" name="pass" value="${pass}">
                            <input type="hidden" name="tenantID" value="${t.tenantID}">
                            <button type="submit" name="action" value="add_screen" class="btn btn-add">+1 📺</button>
                            <button type="submit" name="action" value="remove_screen" class="btn" style="background:#333; color:#fff;">-1 📺</button>
                        </form>
                    </td>
                    <td>
                        <form action="/panel-ichef/action" method="POST" style="display:inline;" onsubmit="return confirm('Attention : Action irréversible. Continuer ?');">
                            <input type="hidden" name="pass" value="${pass}">
                            <input type="hidden" name="tenantID" value="${t.tenantID}">
                            <button type="submit" name="action" value="reset_devices" class="btn btn-reset">Libérer Écrans</button>
                            <button type="submit" name="action" value="${t.status === 'ACTIF' ? 'suspend' : 'activate'}" class="btn" style="background:#555; color:#fff;">${t.status === 'ACTIF' ? 'Bloquer' : 'Débloquer'}</button>
                            <button type="submit" name="action" value="delete" class="btn btn-del">Éliminer</button>
                        </form>
                    </td>
                </tr>
            `).join('')}
        </table>
    </body>
    </html>
    `;
    res.send(html);
});

app.post('/panel-ichef/action', async (req, res) => {
    const { pass, tenantID, action } = req.body;
    if (pass !== ADMIN_PASS) return res.status(401).send('Interdit');

    try {
        if (action === 'add_screen') await Tenant.findOneAndUpdate({ tenantID: tenantID }, { $inc: { maxScreens: 1 } });
        else if (action === 'remove_screen') {
            const t = await Tenant.findOne({ tenantID: tenantID });
            if (t.maxScreens > 1) await Tenant.findOneAndUpdate({ tenantID: tenantID }, { $inc: { maxScreens: -1 } });
        } 
        else if (action === 'reset_devices') await Tenant.findOneAndUpdate({ tenantID: tenantID }, { registeredDevices: [] });
        else if (action === 'suspend') await Tenant.findOneAndUpdate({ tenantID: tenantID }, { status: 'SUSPENDU' });
        else if (action === 'activate') await Tenant.findOneAndUpdate({ tenantID: tenantID }, { status: 'ACTIF' });
        else if (action === 'delete') {
            await Tenant.findOneAndDelete({ tenantID: tenantID });
            await AppState.findOneAndDelete({ tenantID: tenantID });
        }
        res.redirect('/panel-ichef?pass=' + ADMIN_PASS);
    } catch (err) { res.status(500).send("Erreur."); }
});

app.listen(PORT, () => console.log("🚀 L'empire iCHEF est en ligne sur le port " + PORT));
