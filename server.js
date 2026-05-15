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
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

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

// ==========================================
// 🧠 BASE DE DONNÉES : INFRASTRUCTURE iCHEF
// ==========================================
const mongoURI = process.env.MONGO_URI || "mongodb+srv://icheflavien_db_user:Tamere58.@cluster0.4w95d7m.mongodb.net/ichef_production?retryWrites=true&w=majority";
mongoose.connect(mongoURI).then(() => console.log('🔥 I CHEF Infrastructure Online')).catch(err => console.error(err.message));

// AJOUT DES 5 PLANS
const tenantSchema = new mongoose.Schema({
    tenantID: { type: String, required: true, unique: true },
    clientName: String,
    status: { type: String, enum: ['ACTIF', 'SUSPENDU'], default: 'ACTIF' },
    plan: { type: String, enum: ['CHEF', 'ECO', 'BUSINESS', 'EXCUTIF', 'PREMIUM'], default: 'ECO' },
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
// 🤖 MOTEUR IA : RECONNAISSANCE DE FACTURES
// ==========================================
const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'CLE_MANQUANTE');

app.post('/api/scan-invoice', async (req, res) => {
    const { imageBase64, mimeType } = req.body;
    
    if (!imageBase64) return res.status(400).json({ success: false, error: "Aucune image fournie." });
    if (!process.env.GEMINI_API_KEY) return res.status(500).json({ success: false, error: "Clé API IA non configurée sur le serveur." });

    try {
        const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `
        Tu es l'assistant d'un chef de cuisine. Analyse cette image de facture ou de ticket de caisse.
        Extrais les informations suivantes et renvoie UNIQUEMENT un objet JSON valide, sans texte avant ni après, sans balises markdown.
        Structure attendue :
        {
            "fournisseur": "Nom du fournisseur",
            "date": "JJ/MM/AAAA",
            "totalHT": 0.00,
            "tva": 0.00,
            "totalTTC": 0.00,
            "articles": [
                { "nom": "Nom du produit", "quantite": 0, "prixUnitaire": 0.00 }
            ]
        }
        Si tu ne trouves pas une info, mets null ou 0.`;

        const imagePart = { inlineData: { data: base64Data, mimeType: mimeType || "image/jpeg" } };
        const result = await model.generateContent([prompt, imagePart]);
        const responseText = result.response.text();
        
        const cleanJson = responseText.replace(/```json/gi, '').replace(/```/gi, '').trim();
        const data = JSON.parse(cleanJson);

        res.json({ success: true, data: data });

    } catch (error) {
        console.error("Erreur IA complète:", error);
        res.status(500).json({ success: false, error: "Détail de l'erreur IA : " + error.message });
    }
});
// ==========================================
// 🚀 ACTIVATION & CONNEXION (LES 5 ROUTES)
// ==========================================
app.post('/api/activate', async (req, res) => {
    const { sessionId, clientName, tenantID, plan } = req.body;
    try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        if (session.payment_status !== 'paid') return res.status(403).json({ error: "Paiement requis." });
        
        const existingTenant = await Tenant.findOne({ tenantID });
        if (existingTenant) return res.status(400).json({ error: "Identifiant réseau déjà pris." });

        const randomPin = Math.floor(1000 + Math.random() * 9000).toString();
        const finalPlan = plan || 'ESSENTIEL';

        // GESTION DES 5 LIMITES D'ÉCRANS
        let limit = 1; 
        if (finalPlan === 'BUSINESS') limit = 5;
        if (finalPlan === 'EXCUTIF') limit = 25;
        if (finalPlan === 'PREMIUM') limit = 200;

        await Tenant.create({ 
            tenantID, clientName, status: 'ACTIF', 
            plan: finalPlan, maxScreens: limit, pin: randomPin, 
            config: { stripeCustomerId: session.customer } 
        });
        
        await AppState.create({ tenantID, activeOrders: {} });
        res.json({ success: true, dedicatedPin: randomPin });
    } catch (error) { res.status(500).json({ error: "Erreur serveur." }); }
});

// ==========================================
// 🔒 SÉCURITÉ : VÉRIFICATION LICENCE & PIN
// ==========================================

// Route 1 : Vérification de la validité de la licence (utilisée par la vitrine)
app.get('/api/check-license', async (req, res) => {
    const { tenantID } = req.query;
    try {
        const tenant = await Tenant.findOne({ tenantID });
        if (!tenant) return res.status(404).json({ success: false, error: "Identifiant introuvable." });
        res.json({ success: true, status: tenant.status, plan: tenant.plan });
    } catch (e) {
        res.status(500).json({ success: false });
    }
});

// Route 2 : Vérification du Code PIN Maître (utilisée par vitrine.html et chef.html)
app.post('/api/verify-pin', async (req, res) => {
    const { tenantID, pin } = req.body;
    try {
        const tenant = await Tenant.findOne({ tenantID });
        if (!tenant) return res.status(404).json({ success: false, error: "Identifiant inconnu." });

        if (tenant.pin === pin) {
            return res.json({ success: true, plan: tenant.plan });
        } else {
            return res.status(401).json({ success: false, error: "Code PIN incorrect." });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: "Erreur interne du serveur." });
    }
});

// ==========================================
// 🛠️ MODULES D'ADMINISTRATION CLIENT
// ==========================================

// MISE À JOUR DU CODE PIN PAR LE CLIENT
app.post('/api/update-pin', async (req, res) => {
    const { tenantID, newPin } = req.body;
    try {
        const tenant = await Tenant.findOne({ tenantID });
        if (!tenant) return res.status(404).json({ success: false, error: "Identifiant introuvable." });
        
        tenant.pin = newPin;
        await tenant.save();
        
        res.json({ success: true });
    } catch (error) { 
        res.status(500).json({ success: false, error: "Erreur lors de la sauvegarde." }); 
    }
});

// Informations du tableau de bord (Appareils)
app.get('/api/dashboard-info', async (req, res) => {
    const { tenantID } = req.query;
    try {
        const tenant = await Tenant.findOne({ tenantID });
        if (!tenant) return res.status(404).json({ success: false });
        res.json({ 
            success: true, 
            activeDevices: tenant.registeredDevices.length, 
            maxScreens: tenant.maxScreens 
        });
    } catch (e) { res.status(500).json({ success: false }); }
});

// Kill Switch (Déconnecter tout)
app.post('/api/kill-switch', async (req, res) => {
    const { tenantID } = req.body;
    try {
        const tenant = await Tenant.findOne({ tenantID });
        if (!tenant) return res.status(404).json({ success: false, error: "Identifiant introuvable." });
        
        tenant.registeredDevices = []; 
        await tenant.save();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

// Génération du lien Portail Stripe
app.post('/api/billing-portal', async (req, res) => {
    const { tenantID } = req.body;
    try {
        const tenant = await Tenant.findOne({ tenantID });
        if (!tenant || !tenant.config || !tenant.config.stripeCustomerId) {
            return res.status(400).json({ success: false, error: "Aucun profil de facturation Stripe trouvé." });
        }

        const session = await stripe.billingPortal.sessions.create({
            customer: tenant.config.stripeCustomerId,
            return_url: `${req.headers.origin}/admin.html?tenantID=${tenantID}`,
        });

        res.json({ success: true, url: session.url });
    } catch (e) { 
        res.status(500).json({ success: false, error: "Erreur de connexion à Stripe." }); 
    }
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
            .plan-CHEF { background: rgba(16, 185, 129, 0.1); color: #10b981; border: 1px solid #10b981; }
            .plan-ECO { background: rgba(59, 130, 246, 0.1); color: #3b82f6; border: 1px solid #3b82f6; }
            .plan-BUSINESS { background: rgba(168, 85, 247, 0.1); color: #a855f7; border: 1px solid #a855f7; }
            .plan-EXCUTIF { background: rgba(156, 163, 175, 0.1); color: #9ca3af; border: 1px solid #9ca3af; }
            .plan-PREMIUM { background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid #ef4444; }
            .btn { padding: 8px 12px; border: none; border-radius: 6px; cursor: pointer; font-weight: 800; text-transform: uppercase; font-size: 0.65rem; transition: 0.2s; }
            .badge-screens { background: #111; color: #fbbf24; padding: 5px 10px; border-radius: 4px; font-weight: 900; }
        </style>
    </head>
    <body>
        <h1>👑 iCHEF <span style="color:#fbbf24">COMMAND CENTER</span></h1>
        <table>
            <tr>
                <th>Restaurant</th>
                <th>Pack Actuel</th>
                <th>Code PIN</th>
                <th>Écrans (Actifs / Max)</th>
                <th>Pilotage Commercial</th>
            </tr>
            ${tenants.map(t => `
                <tr>
                    <td><b>${t.clientName}</b><br><small style="color:#666">${t.tenantID}</small></td>
                    <td><span class="plan-badge plan-${t.plan}">${t.plan}</span></td>
                    <td style="color:#4ade80; font-weight:bold; font-size:1.2rem;">${t.pin}</td>
                    <td><span class="badge-screens">${t.registeredDevices.length} / ${t.maxScreens}</span></td>
                    <td>
                        <form action="/panel-ichef/action" method="POST" style="display:inline;">
                            <input type="hidden" name="pass" value="${pass}"><input type="hidden" name="tenantID" value="${t.tenantID}">
                            
                            <select name="newPlan" onchange="this.form.submit()" style="background:#222; color:#fff; padding:6px; border-radius:4px; border:1px solid #444;">
                                <option value="ECO" ${t.plan === 'ECO' ? 'selected' : ''}>Essentiel (1 Écran)</option>
                                <option value="CHEF" ${t.plan === 'CHEF' ? 'selected' : ''}>Chef IA (1 Écran)</option>
                                <option value="BUSINESS" ${t.plan === 'BUSINESS' ? 'selected' : ''}>Business (5 Écrans)</option>
                                <option value="EXCUTIF" ${t.plan === 'EXCUTIF' ? 'selected' : ''}>Exécutif (25 Écrans)</option>
                                <option value="PREMIUM" ${t.plan === 'PREMIUM' ? 'selected' : ''}>Palace (200 Écrans)</option>
                            </select>

                            <button type="submit" name="action" value="add_screen" class="btn" style="background:#fbbf24; color:#000;">+1 📺</button>
                            <button type="submit" name="action" value="reset_devices" class="btn" style="background:#3b82f6; color:#fff;">Reset Appareils</button>
                            <button type="submit" name="action" value="${t.status === 'ACTIF' ? 'suspend' : 'activate'}" class="btn" style="background:#444; color:#fff;">
                                ${t.status === 'ACTIF' ? 'Bloquer Compte' : 'Débloquer Compte'}
                            </button>
                            <button type="submit" name="action" value="delete" class="btn" style="background:#b91c1c; color:#fff;" onclick="return confirm('Supprimer ce client ?')">🗑️</button>
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
        // AUTOMATISATION DES ÉCRANS SELON LE PACK
        if (newPlan) {
            let limit = 1;
            if (newPlan === 'BUSINESS') limit = 5;
            if (newPlan === 'EXCUTIF') limit = 25;
            if (newPlan === 'PREMIUM') limit = 200;
            await Tenant.findOneAndUpdate({ tenantID }, { plan: newPlan, maxScreens: limit });
        }
        
        if (action === 'add_screen') await Tenant.findOneAndUpdate({ tenantID }, { $inc: { maxScreens: 1 } });
        if (action === 'reset_devices') await Tenant.findOneAndUpdate({ tenantID }, { registeredDevices: [] });
        if (action === 'suspend') await Tenant.findOneAndUpdate({ tenantID }, { status: 'SUSPENDU' });
        if (action === 'activate') await Tenant.findOneAndUpdate({ tenantID }, { status: 'ACTIF' });
        if (action === 'delete') { await Tenant.findOneAndDelete({ tenantID }); await AppState.findOneAndDelete({ tenantID }); }
        
        res.redirect('/panel-ichef?pass=' + ADMIN_PASS);
    } catch (err) { res.status(500).send("Erreur."); }
});

app.listen(PORT, () => console.log("🚀 Empire iCHEF en ligne sur port " + PORT));
