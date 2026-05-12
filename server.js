const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');

const stripeKey = process.env.STRIPE_SECRET_KEY || 'sk_test_51...';
const stripe = require('stripe')(stripeKey);

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept'] }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

// 🧠 BASE DE DONNÉES : AJOUT DU CHAMP "PLAN"
const mongoURI = process.env.MONGO_URI || "mongodb+srv://icheflavien_db_user:Tamere58.@cluster0.4w95d7m.mongodb.net/ichef_production?retryWrites=true&w=majority";
mongoose.connect(mongoURI).then(() => console.log('🔥 I CHEF Infrastructure Online')).catch(err => console.error(err.message));

const tenantSchema = new mongoose.Schema({
    tenantID: { type: String, required: true, unique: true },
    clientName: String,
    status: { type: String, enum: ['ACTIF', 'SUSPENDU'], default: 'ACTIF' },
    plan: { type: String, enum: ['CHEF', 'ECO', 'STANDARD'], default: 'STANDARD' }, // LA DIFFÉRENCIATION EST ICI
    pin: { type: String, default: '9999' }, 
    maxScreens: { type: Number, default: 1 }, 
    registeredDevices: [String]
});
const Tenant = mongoose.model('Tenant', tenantSchema);

const AppState = mongoose.model('AppState', new mongoose.Schema({
    tenantID: { type: String, required: true, unique: true },
    activeOrders: { type: Object, default: {} }
}, { minimize: false }));

// ==========================================
// 🔑 ROUTE CRUCIALE : LA VÉRIFICATION VITRINE
// ==========================================
app.get('/api/check-license', async (req, res) => {
    const { tenantID } = req.query;
    try {
        const tenant = await Tenant.findOne({ tenantID: tenantID });
        if (!tenant) return res.status(404).json({ success: false, status: 'introuvable' });
        
        // On renvoie le statut ET le plan au client
        res.json({ 
            success: true, 
            status: tenant.status, 
            plan: tenant.plan 
        });
    } catch (error) { res.status(500).json({ success: false, error: "Erreur serveur" }); }
});

app.post('/api/verify-pin', async (req, res) => {
    const { tenantID, pin } = req.body;
    try {
        const tenant = await Tenant.findOne({ tenantID: tenantID });
        if (!tenant) return res.status(404).json({ success: false });
        if (tenant.pin === pin) res.json({ success: true });
        else res.status(401).json({ success: false });
    } catch (error) { res.status(500).json({ success: false }); }
});

// ==========================================
// 👑 COMMAND CENTER : GESTION DES PACKS
// ==========================================
const ADMIN_PASS = 'Empire2026';
app.get('/panel-ichef', async (req, res) => {
    const pass = req.query.pass;
    if (pass !== ADMIN_PASS) return res.status(401).send('🔒 ACCÈS REFUSÉ');
    const tenants = await Tenant.find({});
    
    let html = `
    <!DOCTYPE html>
    <html lang="fr">
    <head><meta charset="UTF-8"><title>COMMAND CENTER</title><style>
        body { background: #050505; color: #fff; font-family: sans-serif; padding: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #222; padding: 12px; text-align: left; }
        .plan-badge { padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 0.7rem; }
        .plan-CHEF { background: #10b981; color: #000; }
        .plan-ECO { background: #3b82f6; color: #fff; }
        .plan-STANDARD { background: #fbbf24; color: #000; }
        .btn { padding: 8px; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; }
    </style></head>
    <body>
        <h1>👑 iCHEF COMMAND CENTER</h1>
        <table>
            <tr><th>ID</th><th>Client</th><th>Plan</th><th>PIN</th><th>Actions</th></tr>
            ${tenants.map(t => `
                <tr>
                    <td><b>${t.tenantID}</b></td>
                    <td>${t.clientName}</td>
                    <td><span class="plan-badge plan-${t.plan}">${t.plan}</span></td>
                    <td style="color:#4ade80; font-weight:900;">${t.pin}</td>
                    <td>
                        <form action="/panel-ichef/action" method="POST" style="display:inline;">
                            <input type="hidden" name="pass" value="${pass}"><input type="hidden" name="tenantID" value="${t.tenantID}">
                            <select name="newPlan" onchange="this.form.submit()">
                                <option value="STANDARD" ${t.plan==='STANDARD'?'selected':''}>Standard</option>
                                <option value="ECO" ${t.plan==='ECO'?'selected':''}>Eco Pack</option>
                                <option value="CHEF" ${t.plan==='CHEF'?'selected':''}>Pack Chef</option>
                            </select>
                            <button type="submit" name="action" value="${t.status==='ACTIF'?'suspend':'activate'}" class="btn" style="background:#444; color:#fff;">${t.status==='ACTIF'?'Bloquer':'Débloquer'}</button>
                        </form>
                    </td>
                </tr>
            `).join('')}
        </table>
    </body></html>`;
    res.send(html);
});

// ACTION HANDLER
app.post('/panel-ichef/action', async (req, res) => {
    const { pass, tenantID, action, newPlan } = req.body;
    if (pass !== ADMIN_PASS) return res.status(401).send('Interdit');
    if (newPlan) await Tenant.findOneAndUpdate({ tenantID }, { plan: newPlan });
    if (action === 'suspend') await Tenant.findOneAndUpdate({ tenantID }, { status: 'SUSPENDU' });
    if (action === 'activate') await Tenant.findOneAndUpdate({ tenantID }, { status: 'ACTIF' });
    res.redirect('/panel-ichef?pass=' + ADMIN_PASS);
});

app.listen(PORT, () => console.log("🚀 Empire iCHEF en ligne"));
