const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');

// 🛡️ CONFIGURATION STRIPE
const stripeKey = process.env.STRIPE_SECRET_KEY || 'sk_test_51...';
const stripe = require('stripe')(stripeKey);

const app = express();
const PORT = process.env.PORT || 10000;

// SÉCURITÉ MAÎTRE DE L'EMPIRE
const ADMIN_PASS = process.env.ADMIN_PASS || 'Empire2026';

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
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'CLE_MANQUANTE') {
        return res.status(500).json({ success: false, error: "🚨 CRITIQUE : Clé GEMINI_API_KEY introuvable dans Render." });
    }

    try {
        const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
        const imagePart = { inlineData: { data: base64Data, mimeType: mimeType || "image/jpeg" } };

        const prompt = `
        Analyse cette image de facture ou de ticket de caisse.
        Extrais les informations suivantes et CLASSIFIE OBLIGATOIREMENT chaque article.

        🚨 RÈGLES STRICTES POUR LE FOURNISSEUR ET LES COORDONNÉES :
        1. Le fournisseur (l'émetteur de la facture) se trouve souvent en haut, parfois écrit à la verticale sur le côté gauche ou droit. Lis bien tous les textes orientés.
        2. Ne confonds pas l'adresse de facturation/livraison (ex: "Hotel Royal-Savoy", "Restaurant...") avec le nom du fournisseur.
        3. Ne confonds pas la marque d'un produit (ex: "Moulin de Sévery") inscrite sur la ligne de description de l'article avec le nom du fournisseur global de la facture.
        4. Cherche activement l'email, le numéro de téléphone (Tél, prof, portable) et l'adresse postale qui sont associés à l'émetteur, pas au client.

        🚨 RÈGLE ABSOLUE POUR LES QUANTITÉS ET POIDS :
        - Si un produit est vendu au poids (ex: "1.520 kg x 2.99 €/kg"), la "quantite" DOIT ÊTRE le poids exact avec son unité (ex: "1.520 kg"). Ne mets SURTOUT PAS "1".
        - Si le produit est vendu à l'unité, mets le nombre (ex: "3").
        - Le "prixUnitaire" doit correspondre au prix TOTAL payé pour cette ligne d'article.

        ⚠️ DIRECTIVE DE SÉCURITÉ CRITIQUE ⚠️
        Tu es une machine. INTERDICTION ABSOLUE de dire "Bonjour", "En tant qu'assistant", ou "Voici le résultat".
        Tu ne dois générer AUCUN texte, AUCUNE explication, AUCUNE balise markdown (pas de \`\`\`json).
        Ton premier caractère DOIT être { et ton dernier caractère DOIT être }.

        Structure JSON stricte exigée :
        {
            "fournisseur": "Nom",
            "adresse": "Adresse complète",
            "telephone": "Numéro de tel",
            "email": "Adresse email",
            "devise": "€, CHF, $",
            "date": "JJ/MM/AAAA",
            "totalHT": 0.00,
            "tva": 0.00,
            "totalTTC": 0.00,
            "articles": [
                { 
                    "nom": "Nom du produit", 
                    "quantite": "1.520 kg", 
                    "prixUnitaire": 4.54, 
                    "categorie": "Légumes" 
                }
            ]
        }`;

        console.log("Transmission de l'image à l'Intelligence iCHEF...");

        const modelsToTry = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-flash"];
        let result = null;
        let lastError = "";

        for (let modelName of modelsToTry) {
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                result = await model.generateContent([prompt, imagePart]);
                break; 
            } catch (err) {
                lastError = err.message;
            }
        }

        if (!result) throw new Error("Tous les modèles ont été refusés. Raison finale : " + lastError);

        let responseText = result.response.text().trim();
        responseText = responseText.replace(/```json/gi, '').replace(/```/gi, '').trim();
        if (!responseText.startsWith("{")) {
            const firstBrace = responseText.indexOf("{");
            if (firstBrace !== -1) responseText = responseText.substring(firstBrace);
        }
        
        const data = JSON.parse(responseText);
        res.json({ success: true, data: data });

    } catch (error) {
        console.error("🔥 CRASH IA GOOGLE :", error.message);
        res.status(500).json({ success: false, error: "ERREUR GOOGLE : " + error.message });
    }
});

// ==========================================
// 🚀 ACTIVATION & CONNEXION CLIENTS
// ==========================================
app.post('/api/activate', async (req, res) => {
    const { sessionId, clientName, tenantID, plan } = req.body;
    try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        if (session.payment_status !== 'paid') return res.status(403).json({ error: "Paiement requis." });
        
        const existingTenant = await Tenant.findOne({ tenantID });
        if (existingTenant) return res.status(400).json({ error: "Identifiant réseau déjà pris." });

        const randomPin = Math.floor(1000 + Math.random() * 9000).toString();
        const finalPlan = plan || 'ECO';

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
// 🔒 SÉCURITÉ : VÉRIFICATION LICENCE & PIN CLIENTS
// ==========================================
app.get('/api/check-license', async (req, res) => {
    const { tenantID } = req.query;
    try {
        const tenant = await Tenant.findOne({ tenantID });
        if (!tenant) return res.status(404).json({ success: false, error: "Identifiant introuvable." });
        res.json({ success: true, status: tenant.status, plan: tenant.plan });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.post('/api/verify-pin', async (req, res) => {
    const { tenantID, pin } = req.body;
    try {
        const tenant = await Tenant.findOne({ tenantID });
        if (!tenant) return res.status(404).json({ success: false, error: "Identifiant inconnu." });
        if (tenant.pin === pin) { return res.json({ success: true, plan: tenant.plan }); } 
        else { return res.status(401).json({ success: false, error: "Code PIN incorrect." }); }
    } catch (error) { res.status(500).json({ success: false, error: "Erreur interne du serveur." }); }
});

app.post('/api/update-pin', async (req, res) => {
    const { tenantID, newPin } = req.body;
    try {
        const tenant = await Tenant.findOne({ tenantID });
        if (!tenant) return res.status(404).json({ success: false, error: "Identifiant introuvable." });
        tenant.pin = newPin;
        await tenant.save();
        res.json({ success: true });
    } catch (error) { res.status(500).json({ success: false, error: "Erreur lors de la sauvegarde." }); }
});

app.get('/api/dashboard-info', async (req, res) => {
    const { tenantID } = req.query;
    try {
        const tenant = await Tenant.findOne({ tenantID });
        if (!tenant) return res.status(404).json({ success: false });
        res.json({ success: true, activeDevices: tenant.registeredDevices.length, maxScreens: tenant.maxScreens });
    } catch (e) { res.status(500).json({ success: false }); }
});

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

app.post('/api/billing-portal', async (req, res) => {
    const { tenantID } = req.body;
    try {
        const tenant = await Tenant.findOne({ tenantID });
        if (!tenant || !tenant.config || !tenant.config.stripeCustomerId) {
            return res.status(400).json({ success: false, error: "Aucun profil Stripe." });
        }
        const session = await stripe.billingPortal.sessions.create({
            customer: tenant.config.stripeCustomerId,
            return_url: `${req.headers.origin}/admin.html?tenantID=${tenantID}`,
        });
        res.json({ success: true, url: session.url });
    } catch (e) { res.status(500).json({ success: false, error: "Erreur Stripe." }); }
});

// ==========================================
// 📡 SYNCHRONISATION DES DONNÉES
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
// 👑 MASTER CONTROL API (NOUVEAU SYSTÈME SÉCURISÉ)
// ==========================================

// Route pour fournir les données au Dashboard
app.post('/api/get-all-tenants-admin', async (req, res) => {
    const { masterKey } = req.body;
    if (masterKey !== ADMIN_PASS) {
        return res.status(401).json({ success: false, error: "🔒 Accès Refusé." });
    }
    
    try {
        const tenantsData = await Tenant.find({});
        // Formatage des données pour le front-end
        const formattedTenants = tenantsData.map(t => ({
            id: t.tenantID,
            name: t.clientName || "Client Sans Nom",
            pack: t.plan,
            pin: t.pin,
            maxScreens: t.maxScreens,
            activeScreens: t.registeredDevices ? t.registeredDevices.length : 0,
            status: t.status
        }));
        
        res.json({ success: true, tenants: formattedTenants });
    } catch(err) {
        res.status(500).json({ success: false, error: "Erreur BDD" });
    }
});

// Route pour appliquer les actions du Super-Admin
app.post('/api/admin-action', async (req, res) => {
    const { masterKey, tenantID, action, newPlan, manualScreens, manualPin } = req.body;
    if (masterKey !== ADMIN_PASS) {
        return res.status(401).json({ success: false, error: "🔒 Accès Refusé." });
    }

    try {
        if (action === 'set_screens' && manualScreens) {
            await Tenant.findOneAndUpdate({ tenantID }, { maxScreens: parseInt(manualScreens) });
        } 
        else if (action === 'set_pin' && manualPin) {
            await Tenant.findOneAndUpdate({ tenantID }, { pin: manualPin.trim() });
        }
        else if (action === 'set_plan' && newPlan) { 
            let limit = 1;
            if (newPlan === 'BUSINESS') limit = 5;
            if (newPlan === 'EXCUTIF') limit = 25;
            if (newPlan === 'PREMIUM') limit = 200;
            await Tenant.findOneAndUpdate({ tenantID }, { plan: newPlan, maxScreens: limit });
        }
        else if (action === 'reset_devices') {
            await Tenant.findOneAndUpdate({ tenantID }, { registeredDevices: [] });
        }
        else if (action === 'suspend') {
            await Tenant.findOneAndUpdate({ tenantID }, { status: 'SUSPENDU' });
        }
        else if (action === 'activate') {
            await Tenant.findOneAndUpdate({ tenantID }, { status: 'ACTIF' });
        }
        else if (action === 'delete') { 
            await Tenant.findOneAndDelete({ tenantID }); 
            await AppState.findOneAndDelete({ tenantID }); 
        }
        
        res.json({ success: true });
    } catch (err) { 
        res.status(500).json({ success: false, error: "Erreur système d'action." }); 
    }
});

app.listen(PORT, () => console.log("🚀 Empire iCHEF en ligne sur port " + PORT));
