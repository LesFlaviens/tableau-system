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
// 🏠 ROUTAGE DES PAGES (CORRECTION 404)
// ==========================================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'vitrine.html'));
});

app.get('/panel-ichef', (req, res) => {
    if (req.query.pass === ADMIN_PASS) {
        res.sendFile(path.join(__dirname, 'empire.html'));
    } else {
        res.status(403).send('🔒 Accès Refusé.');
    }
});

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
    email: String,
    phone: String,
    status: { type: String, enum: ['ACTIF', 'SUSPENDU'], default: 'ACTIF' },
    plan: { type: String, enum: ['CHEF', 'ECO', 'BUSINESS', 'PREMIUM'], default: 'ECO' },
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
        return res.status(500).json({ success: false, error: "🚨 CRITIQUE : Clé GEMINI_API_KEY introuvable dans Render." });
    }

    try {
        const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
        const imagePart = { inlineData: { data: base64Data, mimeType: mimeType || "image/jpeg" } };

        const prompt = `
        Analyse cette image de facture ou de ticket de caisse.
        Extrais les informations suivantes et CLASSIFIE OBLIGATOIREMENT chaque article.

        🚨 RÈGLES STRICTES POUR LE FOURNISSEUR ET LES COORDONNÉES :
        1. Le fournisseur se trouve souvent en haut.
        2. Ne confonds pas l'adresse de facturation/livraison avec le nom du fournisseur.
        3. Ne confonds pas la marque d'un produit avec le nom du fournisseur global de la facture.
        4. Cherche activement l'email, le numéro de téléphone et l'adresse postale associés à l'émetteur.

        🚨 RÈGLE ABSOLUE POUR LES QUANTITÉS ET POIDS :
        - Si un produit est vendu au poids (ex: "1.520 kg x 2.99 €/kg"), la "quantite" DOIT ÊTRE le poids exact avec son unité.
        - Si le produit est vendu à l'unité, mets le nombre (ex: "3").
        - Le "prixUnitaire" doit correspondre au prix TOTAL payé pour cette ligne d'article.

        ⚠️ DIRECTIVE DE SÉCURITÉ CRITIQUE ⚠️
        Tu es une machine. INTERDICTION ABSOLUE de dire "Bonjour" ou d'utiliser du markdown.
        Ton premier caractère DOIT être { et ton dernier caractère DOIT être }.

        Structure JSON stricte exigée :
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

        if (!result) throw new Error("Tous les modèles ont été refusés. Raison : " + lastError);

        let responseText = result.response.text().trim();
        responseText = responseText.replace(/```json/gi, '').replace(/```/gi, '').trim();
        if (!responseText.startsWith("{")) responseText = responseText.substring(responseText.indexOf("{"));
        
        res.json({ success: true, data: JSON.parse(responseText) });

    } catch (error) {
        console.error("🔥 CRASH IA GOOGLE :", error.message);
        res.status(500).json({ success: false, error: "ERREUR GOOGLE : " + error.message });
    }
});

// ==========================================
// 🤖 MOTEUR IA 2 : MAÎTRE D'HÔTEL (RÉSERVATIONS)
// ==========================================
app.post('/api/smart-reservation', async (req, res) => {
    const { tenantID, customerRequest, availableTables } = req.body;
    
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'CLE_MANQUANTE') {
        return res.status(500).json({ success: false, error: "Clé IA manquante." });
    }

    try {
        const prompt = `
        Tu es le Maître d'Hôtel virtuel d'un établissement de luxe (Système iCHEF).
        
        DEMANDE CLIENT : "${customerRequest}"
        
        TABLES DISPONIBLES (Format JSON) : 
        ${JSON.stringify(availableTables)}

        MISSION :
        1. Analyse la demande.
        2. Trouve la table la plus optimisée.
        3. Explique poliment.
        4. Refuse si pas de place.
        5. Détecte VIP/Allergie.

        RÉPONSE EXIGÉE (JSON STRICT, AUCUN TEXTE AUTOUR) :
        {
            "acceptee": true ou false,
            "pax": nombre_entier,
            "heure": "HH:MM",
            "tableAllouee": "ID_DE_LA_TABLE_CHOISIE" (ou null si refusé),
            "messageClient": "Votre réponse professionnelle et chaleureuse à envoyer au client.",
            "optimisationInfo": "Note interne pour la brigade (ex: VIP, Allergie, etc.)"
        }`;

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(prompt);
        
        let responseText = result.response.text().trim();
        responseText = responseText.replace(/```json/gi, '').replace(/```/gi, '').trim();
        if (!responseText.startsWith("{")) responseText = responseText.substring(responseText.indexOf("{"));
        
        const decision = JSON.parse(responseText);

        if (decision.acceptee && decision.tableAllouee) {
            let state = await AppState.findOne({ tenantID });
            if (!state) state = new AppState({ tenantID, activeOrders: {} });
            if (!state.activeOrders) state.activeOrders = {};

            let reservations = [];
            if (state.activeOrders['RESERVATIONS_MASTER'] && state.activeOrders['RESERVATIONS_MASTER'].data) {
                reservations = state.activeOrders['RESERVATIONS_MASTER'].data;
            }

            reservations.push({
                id: 'resa_' + Date.now(),
                pax: decision.pax,
                heure: decision.heure,
                table: decision.tableAllouee,
                info: decision.optimisationInfo,
                timestamp: Date.now()
            });

            state.activeOrders['RESERVATIONS_MASTER'] = { data: reservations };
            state.markModified('activeOrders');
            await state.save();
        }

        res.json({ success: true, decision });

    } catch (error) {
        console.error("🔥 CRASH IA RÉSERVATION :", error.message);
        res.status(500).json({ success: false, error: "Erreur de traitement IA." });
    }
});

// ==========================================
// 🚀 ACTIVATION & CONNEXION CLIENTS
// ==========================================
app.post('/api/activate', async (req, res) => {
    const { sessionId, clientName, tenantID, plan, email, phone } = req.body;
    try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        if (session.payment_status !== 'paid') return res.status(403).json({ error: "Paiement requis." });
        
        const existingTenant = await Tenant.findOne({ tenantID });
        if (existingTenant) return res.status(400).json({ error: "Identifiant réseau déjà pris." });

        const randomPin = Math.floor(1000 + Math.random() * 9000).toString();
        const finalPlan = plan || 'ECO';

        // 🛡️ NOUVELLES LIMITES D'ÉCRANS STRICTES SELON TES PACKS
        let limit = 1; 
        if (finalPlan === 'CHEF') limit = 1;        // Pack 14€ : 1 écran max
        if (finalPlan === 'BUSINESS') limit = 5;    // Pack 45€ : 5 écrans max
        if (finalPlan === 'PREMIUM') limit = 50;    // Pack 129€ : 50 écrans max

        await Tenant.create({ 
            tenantID, clientName, email, phone, status: 'ACTIF', 
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
        
        // Sécurité renforcée : Bloquer si le compte est suspendu
        if (tenant.status === 'SUSPENDU') return res.status(403).json({ success: false, error: "Licence suspendue." });

        if (tenant.pin === pin) { return res.json({ success: true, plan: tenant.plan }); } 
        else { return res.status(401).json({ success: false, error: "Code PIN incorrect." }); }
    } catch (error) { res.status(500).json({ success: false, error: "Erreur interne." }); }
});

app.post('/api/update-pin', async (req, res) => {
    const { tenantID, newPin } = req.body;
    try {
        // En cas de changement de PIN par le client, on force la déconnexion des écrans existants
        const tenant = await Tenant.findOne({ tenantID });
        if (!tenant) return res.status(404).json({ success: false, error: "Identifiant introuvable." });
        tenant.pin = newPin;
        tenant.registeredDevices = []; // 🔥 Déconnexion automatique forcée !
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
            return_url: `${req.headers.origin}/portail-client.html?tenantID=${tenantID}`,
        });
        res.json({ success: true, url: session.url });
    } catch (e) { res.status(500).json({ success: false, error: "Erreur Stripe." }); }
});

// ==========================================
// 📡 SYNCHRONISATION DES DONNÉES (RENFORCÉE)
// ==========================================
app.get('/get-current-state', async (req, res) => {
    try {
        const tenantID = req.query.tenantID || 'MASTER_STATE';
        
        // Bloque le transfert des données si le client a été suspendu par le Super Admin
        if (tenantID !== 'MASTER_STATE') {
            const tenant = await Tenant.findOne({ tenantID });
            if (tenant && tenant.status === 'SUSPENDU') {
                return res.status(403).json({ error: "Licence suspendue" });
            }
        }

        let state = await AppState.findOne({ tenantID });
        if (!state) state = await AppState.create({ tenantID, activeOrders: {} });
        res.json(state);
    } catch (e) { res.status(500).json({ error: "Sync Error" }); }
});

app.post('/update-order', async (req, res) => {
    try {
        const tenantID = req.query.tenantID || 'MASTER_STATE';
        
        // Bloque les mises à jour si le client est suspendu
        if (tenantID !== 'MASTER_STATE') {
            const tenant = await Tenant.findOne({ tenantID });
            if (tenant && tenant.status === 'SUSPENDU') {
                return res.status(403).json({ error: "Licence suspendue" });
            }
        }

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
// 👑 MASTER CONTROL API (CORRIGÉ & ENRICHI)
// ==========================================
app.post('/api/get-all-tenants-admin', async (req, res) => {
    const { masterKey } = req.body;
    if (masterKey !== ADMIN_PASS) return res.status(401).json({ success: false, error: "🔒 Accès Refusé." });
    
    try {
        const tenantsData = await Tenant.find({});
        const formattedTenants = tenantsData.map(t => ({
            id: t.tenantID, 
            name: t.clientName || "Client Sans Nom", 
            email: t.email || "Non renseigné",
            phone: t.phone || "Non renseigné",
            pack: t.plan, 
            pin: t.pin,
            maxScreens: t.maxScreens, 
            activeScreens: t.registeredDevices ? t.registeredDevices.length : 0, 
            status: t.status
        }));
        res.json({ success: true, tenants: formattedTenants });
    } catch(err) { res.status(500).json({ success: false, error: "Erreur BDD" }); }
});

app.post('/api/admin-action', async (req, res) => {
    const { masterKey, tenantID, action, newPlan, manualScreens, manualPin } = req.body;
    if (masterKey !== ADMIN_PASS) return res.status(401).json({ success: false, error: "🔒 Accès Refusé." });

    try {
        if (action === 'set_screens' && manualScreens) {
            await Tenant.findOneAndUpdate({ tenantID }, { maxScreens: parseInt(manualScreens) });
        }
        else if (action === 'set_pin' && manualPin) {
            // 🔥 Déclenche un Kill Switch si le Super Admin modifie le PIN à la main
            await Tenant.findOneAndUpdate({ tenantID }, { pin: manualPin.trim(), registeredDevices: [] });
        }
        else if (action === 'set_plan' && newPlan) { 
            // 🛡️ NOUVELLES LIMITES D'ÉCRANS STRICTES LORS D'UN CHANGEMENT DE PACK
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
            // 🔥 Déclenche un Kill Switch si le compte est suspendu
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
    } catch (err) { res.status(500).json({ success: false, error: "Erreur système d'action." }); }
});

app.listen(PORT, () => console.log("🚀 Empire iCHEF en ligne sur port " + PORT));
