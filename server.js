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

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

// 🧠 BASE DE DONNÉES
const mongoURI = process.env.MONGO_URI || "mongodb+srv://icheflavien_db_user:Tamere58.@cluster0.4w95d7m.mongodb.net/ichef_production?retryWrites=true&w=majority";
mongoose.connect(mongoURI).then(() => console.log('🔥 I CHEF Online')).catch(err => console.error(err.message));

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

const stateSchema = new mongoose.Schema({
    tenantID: { type: String, required: true, unique: true },
    activeOrders: { type: Object, default: {} }
}, { minimize: false });
const AppState = mongoose.model('AppState', stateSchema);

// ==========================================
// 🔑 ROUTES API : CONNEXION VITRINE & CHEF
// ==========================================

// 1. Vérifier si le compte existe et est actif
app.get('/api/check-license', async (req, res) => {
    const { tenantID } = req.query;
    try {
        const tenant = await Tenant.findOne({ tenantID: tenantID });
        if (!tenant) return res.status(404).json({ success: false, status: 'introuvable' });
        res.json({ success: true, status: tenant.status });
    } catch (error) {
        res.status(500).json({ success: false, error: "Erreur serveur" });
    }
});

// 2. Vérifier le code PIN
app.post('/api/verify-pin', async (req, res) => {
    const { tenantID, pin } = req.body;
    try {
        const tenant = await Tenant.findOne({ tenantID: tenantID });
        if (!tenant) return res.status(404).json({ success: false, error: "Restaurant introuvable." });
        if (tenant.pin === pin) res.json({ success: true });
        else res.status(401).json({ success: false, error: "Code incorrect." });
    } catch (error) { res.status(500).json({ success: false, error: "Erreur serveur." }); }
});

// 📡 MOTEUR DE SYNCHRONISATION
app.get('/get-current-state', async (req, res) => {
    try {
        const tenantID = req.query.tenantID || 'MASTER_STATE';
        let state = await AppState.findOne({ tenantID });
        if (!state) state = await AppState.create({ tenantID, activeOrders: {} });
        res.json(state);
    } catch (e) { res.status(500).json({ error: "Erreur" }); }
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
    } catch (e) { res.status(500).json({ error: "Erreur" }); }
});

// 👑 ADMIN PANEL
const ADMIN_PASS = 'Empire2026';
app.get('/panel-ichef', async (req, res) => {
    const pass = req.query.pass;
    if (pass !== ADMIN_PASS) return res.status(401).send('🔒 ACCÈS REFUSÉ');
    const tenants = await Tenant.find({});
    // ... (Ton code HTML du panel que tu as déjà) ...
    res.send("Panneau chargé (utilise le code de ton message précédent)");
});

app.listen(PORT, () => console.log("🚀 Empire iCHEF sur port " + PORT));
