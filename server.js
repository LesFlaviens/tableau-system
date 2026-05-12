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

// ... (Début du code identique)

// Modèle des Licences avec distinction du PACK
const tenantSchema = new mongoose.Schema({
    tenantID: { type: String, required: true, unique: true },
    clientName: String,
    status: { type: String, enum: ['ACTIF', 'SUSPENDU'], default: 'ACTIF' },
    plan: { type: String, enum: ['CHEF', 'ECO', 'NORMAL'], default: 'NORMAL' }, // <-- LE PLAN EST ICI
    pin: { type: String, default: '9999' }, 
    maxScreens: { type: Number, default: 1 }, 
    registeredDevices: [String]
});
const Tenant = mongoose.model('Tenant', tenantSchema);

// ... 

// Route de vérification mise à jour pour envoyer le PLAN à la vitrine
app.get('/api/check-license', async (req, res) => {
    const { tenantID } = req.query;
    try {
        const tenant = await Tenant.findOne({ tenantID: tenantID });
        if (!tenant) return res.status(404).json({ success: false, status: 'introuvable' });
        res.json({ success: true, status: tenant.status, plan: tenant.plan });
    } catch (error) { res.status(500).json({ success: false }); }
});

// ... (Routes sync identiques)

// PORTAIL DIRECTION MIS À JOUR (Visuel pour les 3 packs)
app.get('/panel-ichef', async (req, res) => {
    const pass = req.query.pass;
    if (pass !== ADMIN_PASS) return res.status(401).send('🔒 ACCÈS REFUSÉ');
    const tenants = await Tenant.find({});
    
    let html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>iCHEF COMMAND CENTER</title>
        <style>
            body { background: #050505; color: #fff; font-family: sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #222; padding: 12px; text-align: left; }
            .plan-CHEF { color: #fbbf24; font-weight: bold; } /* Or */
            .plan-ECO { color: #3b82f6; font-weight: bold; }  /* Bleu */
            .plan-NORMAL { color: #10b981; font-weight: bold; } /* Vert */
            .btn { padding: 5px 10px; cursor: pointer; font-weight: bold; border-radius: 4px; border: none; }
        </style>
    </head>
    <body>
        <h1>👑 GESTION DES EMPIRES</h1>
        <table>
            <tr>
                <th>Identifiant</th>
                <th>Restaurant</th>
                <th>Pack Actuel</th>
                <th>Code PIN</th>
                <th>Actions de Changement de Pack</th>
            </tr>
            ${tenants.map(t => `
                <tr>
                    <td><b>${t.tenantID}</b></td>
                    <td>${t.clientName}</td>
                    <td class="plan-${t.plan}">${t.plan}</td>
                    <td style="font-family: monospace; font-size: 1.2rem;">${t.pin}</td>
                    <td>
                        <form action="/panel-ichef/change-plan" method="POST" style="display:inline;">
                            <input type="hidden" name="pass" value="${pass}">
                            <input type="hidden" name="tenantID" value="${t.tenantID}">
                            <button type="submit" name="newPlan" value="CHEF" class="btn" style="background:#fbbf24; color:#000;">PASSER CHEF</button>
                            <button type="submit" name="newPlan" value="ECO" class="btn" style="background:#3b82f6; color:#fff;">PASSER ECO</button>
                            <button type="submit" name="newPlan" value="NORMAL" class="btn" style="background:#10b981; color:#fff;">PASSER NORMAL</button>
                        </form>
                    </td>
                </tr>
            `).join('')}
        </table>
    </body>
    </html>`;
    res.send(html);
});

// Route pour changer le plan à distance
app.post('/panel-ichef/change-plan', async (req, res) => {
    const { pass, tenantID, newPlan } = req.body;
    if (pass !== ADMIN_PASS) return res.status(401).send('Interdit');
    await Tenant.findOneAndUpdate({ tenantID }, { plan: newPlan });
    res.redirect('/panel-ichef?pass=' + ADMIN_PASS);
});

app.listen(PORT, () => console.log("🚀 Empire Connecté"));en ligne"));
