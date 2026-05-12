const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');

// 🛡️ CONFIGURATION STRIPE
const stripeKey = process.env.STRIPE_SECRET_KEY || 'sk_test_51...';
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
// 🧠 BASE DE DONNÉES : INFRASTRUCTURE iCHEF
// ==========================================
const mongoURI = process.env.MONGO_URI || "mongodb+srv://icheflavien_db_user:Tamere58.@cluster0.4w95d7m.mongodb.net/ichef_production?retryWrites=true&w=majority";
mongoose.connect(mongoURI).then(() => console.log('🔥 I CHEF Infrastructure Online')).catch(err => console.error(err.message));

const tenantSchema = new mongoose.Schema({
    tenantID: { type: String, required: true, unique: true },
    clientName: String,
    status: { type: String, enum: ['ACTIF', 'SUSPENDU'], default: 'ACTIF' },
    plan: { type: String, enum: ['CHEF', 'ECO', 'NORMAL'], default: 'NORMAL' },
    pin: { type: String, default: '9999' }, 
    maxScreens: { type: Number, default: 1 }, 
    registeredDevices: [String], 
    config: { stripeCustomerId: String }
});
const Tenant = mongoose.model('Tenant', tenantSchema);

const AppState = mongoose.model('AppState', new mongoose.Schema({
    tenantID: { type: String, required: true, unique: true },
    activeOrders: { type: Object, default: {} }
}, { minimize: false }));

// ==========================================
// 🚀 ACTIVATION & CONNEXION
// ==========================================

app.post('/api/activate', async (req, res) => {
    const { sessionId, clientName, tenantID } = req.body;
    try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        if (session.payment_status !== 'paid') return res.status(403).json({ error: "Paiement non validé." });
        const existingTenant = await Tenant.findOne({ tenantID });
        if (existingTenant) return res.status(400).json({ error: "Identifiant déjà pris." });
        const randomPin = Math.floor(1000 + Math.random() * 9000).toString();
        await Tenant.create({ tenantID, clientName, status: 'ACTIF', pin: randomPin, config: { stripeCustomerId: session.customer } });
        await AppState.create({ tenantID, activeOrders: {} });
        res.json({ success: true, dedicatedPin: randomPin });
    } catch (error) { res.status(500).json({ error: "Erreur serveur." }); }
});

app.get('/api/check-license', async (req, res) => {
    const { tenantID } = req.query;
    try {
        const tenant = await Tenant.findOne({ tenantID });
        if (!tenant) return res.status(404).json({ success: false, status: 'introuvable' });
        res.json({ success: true, status: tenant.status, plan: tenant.plan });
    } catch (error) { res.status(500).json({ success: false }); }
});

app.post('/api/verify-pin', async (req, res) => {
    const { tenantID, pin } = req.body;
    try {
        const tenant = await Tenant.findOne({ tenantID });
        if (tenant && tenant.pin === pin) res.json({ success: true });
        else res.status(401).json({ success: false });
    } catch (error) { res.status(500).json({ success: false }); }
});

app.post('/api/register-device', async (req, res) => {
    const { tenantID, deviceID } = req.body;
    try {
        const tenant = await Tenant.findOne({ tenantID });
        if (!tenant) return res.status(404).json({ success: false });
        if (tenant.status === 'SUSPENDU') return res.status(403).json({ success: false });
        if (tenant.registeredDevices.includes(deviceID)) return res.json({ success: true });
        if (tenant.registeredDevices.length >= tenant.maxScreens) return res.status(403).json({ success: false });
        tenant.registeredDevices.push(deviceID);
        await tenant.save();
        res.json({ success: true });
    } catch (error) { res.status(500).json({ success: false }); }
});

// ==========================================
// 📡 SYNCHRONISATION
// ==========================================
app.get('/get-current-state', async (req, res) => {
    try {
        const tenantID = req.query.tenantID || 'MASTER_STATE';
        let state = await AppState.findOne({ tenantID });
        if (!state) state = await AppState.create({ tenantID, activeOrders: {} });
        res.json(state);
    } catch (e) { res.status(500).json({ error: "Sync Error" }); }
});

app.post('/update-order', async (req, res) => {
    try {
        const tenantID = req.query.tenantID || 'MASTER_STATE';
        const { tableId, order } = req.body;
        let state = await AppState.findOne({ tenantID });
        if (!state) state = new AppState({ tenantID, activeOrders: {} });
        if (order === null) delete state.activeOrders[tableId];
        else state.activeOrders[tableId] = order;
        state.markModified('activeOrders');
        await state.save();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Save Error" }); }
});

// ==========================================
// 👑 COMMAND CENTER (ADMIN)
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
        <title>COMMAND CENTER - iCHEF</title>
        <style>
            body { background: #050505; color: #fff; font-family: sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; background: #0a0a0a; margin-top: 20px; }
            th, td { border: 1px solid #222; padding: 12px; text-align: left; }
            th { background: #111; color: #fbbf24; text-transform: uppercase; font-size: 0.75rem; }
            .plan-badge { padding: 4px 8px; border-radius: 4px; font-weight: 800; font-size: 0.7rem; }
            .plan-CHEF { background: rgba(251, 191, 36, 0.1); color: #fbbf24; border: 1px solid #fbbf24; }
            .plan-ECO { background: rgba(59, 130, 246, 0.1); color: #3b82f6; border: 1px solid #3b82f6; }
            .plan-NORMAL { background: rgba(16, 185, 129, 0.1); color: #10b981; border: 1px solid #10b981; }
            .btn { padding: 8px 12px; border: none; border-radius: 6px; cursor: pointer; font-weight: 800; text-transform: uppercase; font-size: 0.65rem; transition: 0.2s; }
            .badge-screens { background: #111; color: #fbbf24; padding: 5px 10px; border-radius: 4px; font-weight: 900; }
        </style>
    </head>
    <body>
        <h1>👑 iCHEF <span style="color:#fbbf24">COMMAND CENTER</span></h1>
        <table>
            <tr>
                <th>Restaurant</th>
                <th>Pack</th>
                <th>Code PIN</th>
                <th>Écrans (Actifs / Max)</th>
                <th>Actions</th>
            </tr>
            ${tenants.map(t => `
                <tr>
                    <td><b>${t.clientName}</b><br><small style="color:#666">${t.tenantID}</small></td>
                    <td><span class="plan-badge plan-${t.plan}">${t.plan}</span></td>
                    <td style="color:#4ade80; font-weight:bold;">${t.pin}</td>
                    <td><span class="badge-screens">${t.registeredDevices.length} / ${t.maxScreens}</span></td>
                    <td>
                        <form action="/panel-ichef/action" method="POST" style="display:inline;">
                            <input type="hidden" name="pass" value="${pass}"><input type="hidden" name="tenantID" value="${t.tenantID}">
                            
                            <select name="newPlan" onchange="this.form.submit()" style="background:#222; color:#fff; padding:5px; border-radius:4px; border:1px solid #444;">
                                <option value="NORMAL" ${t.plan === 'NORMAL' ? 'selected' : ''}>Normal</option>
                                <option value="ECO" ${t.plan === 'ECO' ? 'selected' : ''}>Eco</option>
                                <option value="CHEF" ${t.plan === 'CHEF' ? 'selected' : ''}>Chef IA</option>
                            </select>

                            <button type="submit" name="action" value="add_screen" class="btn" style="background:#fbbf24; color:#000;">+1 📺</button>
                            <button type="submit" name="action" value="reset_devices" class="btn" style="background:#3b82f6; color:#fff;">Reset</button>
                            <button type="submit" name="action" value="${t.status === 'ACTIF' ? 'suspend' : 'activate'}" class="btn" style="background:#444; color:#fff;">
                                ${t.status === 'ACTIF' ? 'Bloquer' : 'Débloquer'}
                            </button>
                            <button type="submit" name="action" value="delete" class="btn" style="background:#b91c1c; color:#fff;" onclick="return confirm('Supprimer ?')">🗑️</button>
                        </form>
                    </td>
                </tr>
            `).join('')}
        </table>
    </body>
    </html>`;
    res.send(html);
});

app.post('/panel-ichef/action', async (req, res) => {
    const { pass, tenantID, action, newPlan } = req.body;
    if (pass !== ADMIN_PASS) return res.status(401).send('Interdit');
    try {
        if (newPlan) await Tenant.findOneAndUpdate({ tenantID }, { plan: newPlan });
        if (action === 'add_screen') await Tenant.findOneAndUpdate({ tenantID }, { $inc: { maxScreens: 1 } });
        if (action === 'reset_devices') await Tenant.findOneAndUpdate({ tenantID }, { registeredDevices: [] });
        if (action === 'suspend') await Tenant.findOneAndUpdate({ tenantID }, { status: 'SUSPENDU' });
        if (action === 'activate') await Tenant.findOneAndUpdate({ tenantID }, { status: 'ACTIF' });
        if (action === 'delete') { await Tenant.findOneAndDelete({ tenantID }); await AppState.findOneAndDelete({ tenantID }); }
        res.redirect('/panel-ichef?pass=' + ADMIN_PASS);
    } catch (err) { res.status(500).send("Erreur."); }
});

app.listen(PORT, () => console.log("🚀 Empire iCHEF en ligne sur port " + PORT));
