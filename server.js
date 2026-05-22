const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');

// 🛡️ CONFIGURATION STRIPE iCHEF (Pour TES abonnements SaaS)
const stripeKey = process.env.STRIPE_SECRET_KEY || 'sk_test_51TN80JQ9Dw3nOfA4I3XTxPl5FR4ddYmU9Jw2pGmfa0eABz2P6wAzK8RMzHw2XilulLXxFmY2oEDgau4TcScOf9WK00ajIEuweB'; 
const stripe = require('stripe')(stripeKey);

const app = express();
const PORT = process.env.PORT || 10000;

// 👑 SÉCURITÉ MAÎTRE DE L'EMPIRE
const ADMIN_PASS = process.env.ADMIN_PASS || 'Empire2026';

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept'] }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

// ==========================================
// 🏠 ROUTAGE DES PAGES WEB
// ==========================================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'vitrine.html'));
});

// Portail Super Admin (Empire) caché
app.get('/panel-ichef', (req, res) => {
    if (req.query.pass === ADMIN_PASS) {
        res.sendFile(path.join(__dirname, 'empire.html'));
    } else {
        res.status(403).send('🔒 Accès Refusé. Sécurité Empire iCHEF.');
    }
});

// ==========================================
// 🚨 WEBHOOK STRIPE : SÉCURITÉ ANTI-IMPAYÉS
// ==========================================
app.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;
    try { 
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET); 
    } catch (err) { 
        return res.status(400).send(`Webhook Error: ${err.message}`); 
    }
    
    if (event.type === 'checkout.session.completed') {
        console.log(`💰 PAIEMENT REÇU ! Sécurisation de la licence en arrière-plan...`);
        const session = event.data.object;
        
        try {
            const tenantID = session.client_reference_id || "client_attente_" + Date.now();
            
            await Tenant.updateOne(
                { tenantID: tenantID },
                { 
                    $set: { 
                        status: 'ACTIF', 
                        config: { stripeCustomerId: session.customer } 
                    },
                    $setOnInsert: { 
                        plan: "PREMIUM", 
                        maxScreens: 50, 
                        pin: Math.floor(1000 + Math.random() * 9000).toString() 
                    }
                },
                { upsert: true }
            );
        } catch(e) { console.error("❌ Erreur MongoDB Webhook :", e); }
    }
    res.json({received: true});
});

// ==========================================
// 🧠 BASE DE DONNÉES : INFRASTRUCTURE MONGODB
// ==========================================
const mongoURI = process.env.MONGO_URI || "mongodb+srv://icheflavien_db_user:Tamere58.@cluster0.4w95d7m.mongodb.net/ichef_production?retryWrites=true&w=majority";
mongoose.connect(mongoURI).then(() => console.log('🔥 Base de données iCHEF Online')).catch(err => console.error(err.message));

const tenantSchema = new mongoose.Schema({
    tenantID: { type: String, required: true, unique: true },
    clientName: String,
    email: String,
    phone: String,
    status: { type: String, enum: ['ACTIF', 'SUSPENDU'], default: 'ACTIF' },
    plan: { type: String, enum: ['CHEF', 'ECO', 'BUSINESS', 'PREMIUM'], default: 'ECO' },
    specialite: { type: String, enum: ['cuisine', 'patisserie', 'bar'], default: 'cuisine' },
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
// 🤖 MOTEUR IA 1 : RECONNAISSANCE DE FACTURES
// ==========================================
const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'CLE_MANQUANTE');

app.post('/api/scan-invoice', async (req, res) => {
    const { imageBase64, mimeType } = req.body;
    
    if (!imageBase64) return res.status(400).json({ success: false, error: "Aucune image fournie." });
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'CLE_MANQUANTE') {
        return res.status(500).json({ success: false, error: "🚨 CRITIQUE : Clé GEMINI_API_KEY introuvable." });
    }

    try {
        const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
        const imagePart = { inlineData: { data: base64Data, mimeType: mimeType || "image/jpeg" } };

        const prompt = `
        Analyse cette image de facture ou de ticket de caisse. Extrais les informations et CLASSIFIE chaque article.
        1. Trouve le vrai fournisseur (pas l'adresse de livraison).
        2. Trouve téléphone, email, adresse.
        3. Si vendu au poids, mets le poids exact dans "quantite". Si à l'unité, mets le nombre.
        4. "prixUnitaire" = prix total de la ligne.
        
        RÉPONSE JSON STRICTE UNIQUEMENT, AUCUN TEXTE AUTOUR :
        {
            "fournisseur": "Nom", "adresse": "Adresse", "telephone": "Tel", "email": "Email", "devise": "€",
            "date": "JJ/MM/AAAA", "totalHT": 0.00, "tva": 0.00, "totalTTC": 0.00,
            "articles": [ { "nom": "Produit", "quantite": "1 kg", "prixUnitaire": 4.54, "categorie": "Légumes" } ]
        }`;

        const modelsToTry = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-flash"];
        let result = null; let lastError = "";

        for (let modelName of modelsToTry) {
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                result = await model.generateContent([prompt, imagePart]);
                break; 
            } catch (err) { lastError = err.message; }
        }

        if (!result) throw new Error("Modèles refusés : " + lastError);

        let responseText = result.response.text().trim();
        responseText = responseText.replace(/```json/gi, '').replace(/```/gi, '').trim();
        if (!responseText.startsWith("{")) responseText = responseText.substring(responseText.indexOf("{"));
        
        res.json({ success: true, data: JSON.parse(responseText) });
    } catch (error) {
        console.error("🔥 CRASH IA FACTURE :", error.message);
        res.status(500).json({ success: false, error: "ERREUR GOOGLE : " + error.message });
    }
});

// ==========================================
// 🤖 MOTEUR IA 2 : MAÎTRE D'HÔTEL (RÉSERVATIONS)
// ==========================================
app.post('/api/smart-reservation', async (req, res) => {
    const { tenantID, customerRequest, availableTables } = req.body;
    if (!process.env.GEMINI_API_KEY) return res.status(500).json({ success: false, error: "Clé IA manquante." });

    try {
        const prompt = `
        Tu es le Maître d'Hôtel iCHEF. Demande client : "${customerRequest}". Tables libres : ${JSON.stringify(availableTables)}
        Trouve la table optimale, sois poli, détecte allergies/VIP.
        JSON STRICT ATTENDU :
        {
            "acceptee": true/false,
            "pax": nombre,
            "heure": "HH:MM",
            "tableAllouee": "ID_TABLE" ou null,
            "messageClient": "Votre réponse",
            "optimisationInfo": "Notes brigade"
        }`;

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(prompt);
        
        let responseText = result.response.text().trim();
        responseText = responseText.replace(/```json/gi, '').replace(/```/gi, '').trim();
        if (!responseText.startsWith("{")) responseText = responseText.substring(responseText.indexOf("{"));
        
        const decision = JSON.parse(responseText);

        if (decision.acceptee && decision.tableAllouee) {
            let updateQuery = { 
                $push: { 
                    "activeOrders.RESERVATIONS_MASTER.data": {
                        id: 'resa_' + Date.now(), pax: decision.pax, heure: decision.heure, 
                        table: decision.tableAllouee, info: decision.optimisationInfo, timestamp: Date.now()
                    }
                } 
            };
            await AppState.findOneAndUpdate({ tenantID }, updateQuery, { upsert: true });
        }

        res.json({ success: true, decision });
    } catch (error) {
        console.error("🔥 CRASH IA RÉSA :", error.message);
        res.status(500).json({ success: false, error: "Erreur IA." });
    }
});

// ==========================================
// 🚀 ACTIVATION & CRÉATION OFFICIELLE CLIENT
// ==========================================
app.post('/api/activate', async (req, res) => {
    const { sessionId, clientName, tenantID, email, phone, plan, specialite } = req.body;
    if (!sessionId) return res.status(403).json({ error: "Session de paiement invalide." });

    try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        if (session.payment_status !== 'paid') return res.status(403).json({ error: "Paiement non validé." });
        
        const existingTenant = await Tenant.findOne({ tenantID });
        if (existingTenant) return res.status(400).json({ error: "Identifiant déjà pris." });

        const randomPin = Math.floor(1000 + Math.random() * 9000).toString();
        const finalPlan = plan || 'ECO';
        const finalSpec = specialite || 'cuisine';

        let limit = 1; 
        if (finalPlan === 'CHEF') limit = 1;        
        if (finalPlan === 'BUSINESS') limit = 5;    
        if (finalPlan === 'PREMIUM') limit = 50;    

        await Tenant.create({ 
            tenantID, clientName, email, phone, status: 'ACTIF', 
            plan: finalPlan, specialite: finalSpec, maxScreens: limit, pin: randomPin, 
            config: { stripeCustomerId: session.customer } 
        });
        
        await AppState.create({ tenantID, activeOrders: {} });
        res.json({ success: true, dedicatedPin: randomPin });
    } catch (error) { 
        res.status(500).json({ error: "Erreur BDD." }); 
    }
});

// ==========================================
// 🔒 SÉCURITÉ : GARDE DU CORPS & PINS
// ==========================================
app.get('/api/check-license', async (req, res) => {
    const { tenantID } = req.query;
    try {
        const tenant = await Tenant.findOne({ tenantID });
        if (!tenant) return res.status(404).json({ success: false, error: "Introuvable." });
        res.json({ success: true, status: tenant.status, plan: tenant.plan, specialite: tenant.specialite });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.post('/api/verify-pin', async (req, res) => {
    const { tenantID, pin } = req.body;
    try {
        const tenant = await Tenant.findOne({ tenantID });
        if (!tenant) return res.status(404).json({ success: false, error: "Identifiant inconnu." });
        if (tenant.status === 'SUSPENDU') return res.status(403).json({ success: false, error: "Licence suspendue." });

        if (tenant.pin === pin) { 
            return res.json({ success: true, plan: tenant.plan, specialite: tenant.specialite }); 
        } else { 
            return res.status(401).json({ success: false, error: "Code PIN incorrect." }); 
        }
    } catch (error) { res.status(500).json({ success: false }); }
});

app.post('/api/update-pin', async (req, res) => {
    const { tenantID, newPin } = req.body;
    try {
        const tenant = await Tenant.findOne({ tenantID });
        if (!tenant) return res.status(404).json({ success: false });
        tenant.pin = newPin;
        tenant.registeredDevices = []; 
        await tenant.save();
        res.json({ success: true });
    } catch (error) { res.status(500).json({ success: false }); }
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
        await Tenant.findOneAndUpdate({ tenantID }, { registeredDevices: [] });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.post('/api/billing-portal', async (req, res) => {
    const { tenantID } = req.body;
    try {
        const tenant = await Tenant.findOne({ tenantID });
        if (!tenant || !tenant.config || !tenant.config.stripeCustomerId) return res.status(400).json({ success: false });
        const session = await stripe.billingPortal.sessions.create({
            customer: tenant.config.stripeCustomerId,
            return_url: `${req.headers.origin}/portail-client.html?tenantID=${tenantID}`,
        });
        res.json({ success: true, url: session.url });
    } catch (e) { res.status(500).json({ success: false }); }
});

// ==========================================
// 📡 LE CŒUR DU RÉSEAU (SYNCHRO ATOMIQUE SÉCURISÉE)
// ==========================================
app.get('/get-current-state', async (req, res) => {
    try {
        const tenantID = req.query.tenantID || 'MASTER_STATE';
        if (tenantID !== 'MASTER_STATE') {
            const tenant = await Tenant.findOne({ tenantID });
            if (tenant && tenant.status === 'SUSPENDU') return res.status(403).json({ error: "Licence suspendue" });
        }
        let state = await AppState.findOne({ tenantID });
        if (!state) state = await AppState.create({ tenantID, activeOrders: {} });
        res.json(state);
    } catch (e) { res.status(500).json({ error: "Sync Error" }); }
});

app.post('/update-order', async (req, res) => {
    try {
        const tenantID = req.query.tenantID || 'MASTER_STATE';
        if (tenantID !== 'MASTER_STATE') {
            const tenant = await Tenant.findOne({ tenantID });
            if (tenant && tenant.status === 'SUSPENDU') return res.status(403).json({ error: "Licence suspendue" });
        }

        const { tableId, order } = req.body;
        
        let updateQuery = {};
        if (order === null) {
            updateQuery = { $unset: { [`activeOrders.${tableId}`]: 1 } };
        } else {
            updateQuery = { $set: { [`activeOrders.${tableId}`]: order } };
        }
        
        await AppState.findOneAndUpdate(
            { tenantID },
            updateQuery,
            { upsert: true, new: true }
        );
        
        res.json({ success: true });
    } catch (e) { 
        console.error("Erreur Sauvegarde :", e);
        res.status(500).json({ error: "Save Error" }); 
    }
});

// ==========================================
// 💳 CRÉATION DE PAIEMENT STRIPE DYNAMIQUE (MULTI-RESTAURANTS)
// ==========================================
app.post('/api/create-checkout', async (req, res) => {
    try {
        const { total, table, tenantID } = req.body;

        // 1. Lire la base de données Mongoose pour trouver le restaurant
        const state = await AppState.findOne({ tenantID });

        if (!state || !state.activeOrders || !state.activeOrders['SETTINGS_MASTER']) {
            return res.status(400).json({ error: "Configuration restaurant introuvable." });
        }

        // 2. Récupérer la Clé Stripe du Restaurateur (sauvegardée dans son admin)
        const settings = state.activeOrders['SETTINGS_MASTER'].data;
        const stripeKeyResto = settings.payment && settings.payment.stripeLink ? settings.payment.stripeLink.trim() : null;

        if (!stripeKeyResto || !stripeKeyResto.startsWith('sk_')) {
            return res.status(400).json({ error: "Le restaurateur n'a pas configuré sa clé Stripe secrète." });
        }

        // 3. Initialiser Stripe UNIQUEMENT pour ce restaurant
        const tenantStripe = require('stripe')(stripeKeyResto);

        // 4. Créer la facture pour le client
        const session = await tenantStripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'eur',
                    product_data: { name: 'Commande Restaurant - Table ' + table },
                    unit_amount: Math.round(total * 100), // Stripe calcule en centimes !
                },
                quantity: 1,
            }],
            mode: 'payment',
            success_url: 'https://tableau-system.onrender.com/menu-qr.html?tenantID=' + tenantID + '&table=' + table + '&paiement=ok',
            cancel_url: 'https://tableau-system.onrender.com/menu-qr.html?tenantID=' + tenantID + '&table=' + table + '&paiement=annule',
        });
        
        res.json({ url: session.url });
    } catch (error) {
        console.error("Erreur Stripe Tenant:", error);
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// 👑 MASTER CONTROL API (EMPIRE SUPER ADMIN)
// ==========================================
app.post('/api/get-all-tenants-admin', async (req, res) => {
    const { masterKey } = req.body;
    if (masterKey !== ADMIN_PASS) return res.status(401).json({ success: false, error: "🔒 Accès Refusé." });
    
    try {
        const tenantsData = await Tenant.find({});
        const formattedTenants = tenantsData.map(t => ({
            id: t.tenantID, 
            name: t.clientName || "Sans Nom", 
            email: t.email || "Non renseigné",
            phone: t.phone || "Non renseigné",
            pack: t.plan, 
            specialite: t.specialite,
            pin: t.pin,
            maxScreens: t.maxScreens, 
            activeScreens: t.registeredDevices ? t.registeredDevices.length : 0, 
            status: t.status
        }));
        res.json({ success: true, tenants: formattedTenants });
    } catch(err) { res.status(500).json({ success: false }); }
});

app.post('/api/admin-action', async (req, res) => {
    const { masterKey, tenantID, action, newPlan, manualScreens, manualPin } = req.body;
    if (masterKey !== ADMIN_PASS) return res.status(401).json({ success: false, error: "🔒 Accès Refusé." });

    try {
        if (action === 'set_screens' && manualScreens) {
            await Tenant.findOneAndUpdate({ tenantID }, { maxScreens: parseInt(manualScreens) });
        }
        else if (action === 'set_pin' && manualPin) {
            await Tenant.findOneAndUpdate({ tenantID }, { pin: manualPin.trim(), registeredDevices: [] });
        }
        else if (action === 'set_plan' && newPlan) { 
            let limit = 1; 
            if (newPlan === 'CHEF') limit = 1; 
            if (newPlan === 'BUSINESS') limit = 5; 
            if (newPlan === 'PREMIUM') limit = 50; 
            await Tenant.findOneAndUpdate({ tenantID }, { plan: newPlan, maxScreens: limit });
        }
        else if (action === 'reset_devices') {
            await Tenant.findOneAndUpdate({ tenantID }, { registeredDevices: [] });
        }
        else if (action === 'suspend') {
            await Tenant.findOneAndUpdate({ tenantID }, { status: 'SUSPENDU', registeredDevices: [] });
        }
        else if (action === 'activate') {
            await Tenant.findOneAndUpdate({ tenantID }, { status: 'ACTIF' });
        }
        else if (action === 'delete') { 
            await Tenant.findOneAndDelete({ tenantID }); 
            await AppState.findOneAndDelete({ tenantID }); 
        }
        
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false }); }
});

app.listen(PORT, () => console.log("🚀 L'Empire iCHEF est en ligne sur le port " + PORT));
