const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');

// ==========================================
// CONFIGURATION STRIPE iCHEF (Abonnements SaaS)
// ==========================================
const stripeKey = process.env.STRIPE_SECRET_KEY || 'sk_test_51TN80JQ9Dw3nOfA4I3XTxPl5FR4ddYmU9Jw2pGmfa0eABz2P6wAzK8RMzHw2XilulLXxFmY2oEDgau4TcScOf9WK00ajIEuweB'; 
const stripe = require('stripe')(stripeKey);

const app = express();
const PORT = process.env.PORT || 10000;

// SÉCURITÉ MAÎTRE DE L'EMPIRE
const ADMIN_PASS = process.env.ADMIN_PASS || 'Empire2026';

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept'] }));

// 🚨 SÉCURITÉ STRIPE : On utilise raw() uniquement pour la route webhook pour vérifier la signature cryptée
app.use('/webhook', express.raw({ type: 'application/json' }));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname)));

// ==========================================
// OUTIL DE NETTOYAGE UNIVERSEL (ANTI-CRASH)
// ==========================================
const cleanString = (str) => String(str || "").trim().toLowerCase();

// ==========================================
// ROUTAGE DES PAGES WEB
// ==========================================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'vitrine.html'));
});

app.get('/panel-ichef', (req, res) => {
    if (req.query.pass === ADMIN_PASS) {
        res.sendFile(path.join(__dirname, 'empire.html'));
    } else {
        res.status(403).send('Accès Refusé. Sécurité Empire iCHEF.');
    }
});

// ==========================================
// WEBHOOK STRIPE : SÉCURITÉ ANTI-IMPAYÉS & UPSELL 
// ==========================================
app.post('/webhook', async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;
    try { 
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET); 
    } catch (err) { 
        return res.status(400).send(`Webhook Error: ${err.message}`); 
    }
    
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;

        // ACHAT D'ÉCRANS SUPPLÉMENTAIRES
        if (session.metadata && session.metadata.type === 'UPGRADE_SCREENS') {
            const safeID = cleanString(session.metadata.tenantID);
            console.log(`UPSELL REUSSI : Achat d'ecrans pour le restaurant ${safeID}`);
            try {
                const extraScreens = parseInt(session.metadata.extraScreens);
                await Tenant.updateOne(
                    { tenantID: safeID },
                    { $inc: { maxScreens: extraScreens } }
                );
            } catch(e) { console.error("Erreur Upgrade Ecrans:", e); }
        } 
        // NOUVEL ABONNEMENT RESTAURATEUR
        else {
            console.log(`PAIEMENT RECU ! Securisation de la licence en arriere-plan...`);
            try {
                const rawTenantID = session.client_reference_id || "client_attente_" + Date.now();
                const safeID = cleanString(rawTenantID);
                
                let planAchete = "BUSINESS";
                let limitScreens = 5;
                let limitStaff = 999;

                // 1. LECTURE DES MÉTADONNÉES STRIPE
                if (session.metadata && session.metadata.plan) {
                    planAchete = session.metadata.plan.toUpperCase();
                    if (['CHEF_CUISINE', 'CHEF_PATISSERIE', 'CHEF_BAR', 'CHEF', 'PATISSIER', 'BAR'].includes(planAchete)) {
                        limitScreens = 1; limitStaff = 1;
                    } else if (['BUSINESS', 'RENTABILITE', 'ECO', 'PACK_A'].includes(planAchete)) {
                        limitScreens = 5; limitStaff = 999;
                    } else if (['EMPIRE', 'BRIGADE', 'BRIGADES', 'PREMIUM'].includes(planAchete)) {
                        limitScreens = 50; limitStaff = 999;
                    }
                } 
                // 2. SECOURS : DÉTECTION PAR PRIX PAYÉ (49€ = Pack A à 49€)
                else {
                    if (session.amount_total === 1900) {
                        planAchete = "CHEF_CUISINE"; 
                        limitScreens = 1; limitStaff = 1;
                    } else if (session.amount_total === 4500 || session.amount_total === 4900) {
                        planAchete = "PACK_A"; 
                        limitScreens = 5; limitStaff = 999;
                    } else if (session.amount_total >= 9900) {
                        planAchete = "EMPIRE"; 
                        limitScreens = 50; limitStaff = 999;
                    }
                }

                await Tenant.updateOne(
                    { tenantID: safeID },
                    { 
                        $set: { 
                            status: 'ACTIF', 
                            config: { stripeCustomerId: session.customer } 
                        },
                        $setOnInsert: { 
                            plan: planAchete, 
                            maxScreens: limitScreens, 
                            maxStaff: limitStaff,
                            pin: Math.floor(1000 + Math.random() * 9000).toString() 
                        }
                    },
                    { upsert: true }
                );
            } catch(e) { console.error("Erreur MongoDB Webhook :", e); }
        }
    }
    res.json({received: true});
});

// ==========================================
// BASE DE DONNÉES : INFRASTRUCTURE MONGODB
// ==========================================
const mongoURI = process.env.MONGO_URI || "mongodb+srv://icheflavien_db_user:Tamere58.@cluster0.4w95d7m.mongodb.net/ichef_production?retryWrites=true&w=majority";
mongoose.connect(mongoURI).then(() => console.log('Base de donnees iCHEF Online')).catch(err => console.error(err.message));

const tenantSchema = new mongoose.Schema({
    tenantID: { type: String, required: true, unique: true },
    clientName: String,
    email: String,
    phone: String,
    status: { type: String, enum: ['ACTIF', 'SUSPENDU'], default: 'ACTIF' },
    plan: { 
        type: String, 
        enum: ['CHEF_CUISINE', 'CHEF_PATISSERIE', 'CHEF_BAR', 'ICHEF_OS', 'RENTABILITE', 'BRIGADES', 'BRIGADE', 'BUSINESS', 'ECO', 'PREMIUM', 'CHEF', 'PATISSIER', 'BAR', 'EMPIRE', 'PACK_A'], 
        default: 'BUSINESS' 
    },
    specialite: { type: String, default: 'cuisine' },
    pin: { type: String, default: '9999' }, 
    maxScreens: { type: Number, default: 5 }, 
    maxStaff: { type: Number, default: 999 },
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
    try {
        const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
        const imagePart = { inlineData: { data: base64Data, mimeType: mimeType || "image/jpeg" } };
        const prompt = `Analyse cette image de facture. Extrais les informations et CLASSIFIE chaque article. RESPOND ONLY WITH JSON WITHOUT MARKDOWN TEXT around: { "fournisseur": "Nom", "adresse": "Adresse", "telephone": "Tel", "email": "Email", "devise": "€", "date": "JJ/MM/AAAA", "totalHT": 0.00, "tva": 0.00, "totalTTC": 0.00, "articles": [ { "nom": "Produit", "quantite": "1 kg", "prixUnitaire": 4.54, "categorie": "Légumes" } ] }`;

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent([prompt, imagePart]);
        let responseText = result.response.text().trim();
        responseText = responseText.replace(/```json/gi, '').replace(/```/gi, '').trim();
        res.json({ success: true, data: JSON.parse(responseText) });
    } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

// ==========================================
// 🤖 MOTEUR IA 2 : ANALYSE ÉTIQUETTES HACCP (Nouveau ✨)
// ==========================================
app.post('/analyse-ticket', async (req, res) => {
    const { image, mimeType } = req.body;
    if (!image) return res.status(400).json({ success: false, error: "Image manquante" });
    try {
        const imagePart = { inlineData: { data: image, mimeType: mimeType || "image/jpeg" } };
        const prompt = `Analyse cette étiquette de traçabilité de cuisine. Extrais précisément le nom du produit, le numéro de lot, et la DLC au format JJ/MM/AAAA. UK TEXT ONLY JSON NO MARKDOWN: { "nom": "Nom du produit", "lot": "Numéro de lot", "dlc": "Date" }`;
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent([prompt, imagePart]);
        let text = result.response.text().trim().replace(/```json/gi, '').replace(/```/gi, '').trim();
        res.json({ success: true, resultat: JSON.parse(text) });
    } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

// ==========================================
// 🤖 MOTEUR IA 3 : MAÎTRE D'HÔTEL (RÉSERVATIONS)
// ==========================================
app.post('/api/smart-reservation', async (req, res) => {
    const { tenantID, customerRequest, availableTables } = req.body;
    const safeID = cleanString(tenantID);
    try {
        const prompt = `Tu es le Maître d'Hôtel iCHEF. Demande : "${customerRequest}". Tables : ${JSON.stringify(availableTables)}. Renvoie JSON strict: { "acceptee": true/false, "pax": nombre, "heure": "HH:MM", "tableAllouee": "ID", "messageClient": "Texte", "optimisationInfo": "Notes" }`;
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent(prompt);
        let text = result.response.text().trim().replace(/```json/gi, '').replace(/```/gi, '').trim();
        const decision = JSON.parse(text);
        if (decision.acceptee && decision.tableAllouee) {
            await AppState.findOneAndUpdate(
                { tenantID: safeID },
                { $push: { "activeOrders.RESERVATIONS_MASTER.data": { id: 'resa_' + Date.now(), pax: decision.pax, heure: decision.heure, table: decision.tableAllouee, info: decision.optimisationInfo, timestamp: Date.now() } } },
                { upsert: true }
            );
        }
        res.json({ success: true, decision });
    } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

// ==========================================
// SÉCURITÉ : GARDE DU CORPS & CONFIGURATION PINS
// ==========================================
app.get('/api/check-license', async (req, res) => {
    const { tenantID } = req.query;
    try {
        const tenant = await Tenant.findOne({ tenantID: cleanString(tenantID) });
        if (!tenant) return res.status(404).json({ success: false });
        res.json({ success: true, status: tenant.status, plan: tenant.plan, specialite: tenant.specialite });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.post('/api/verify-pin', async (req, res) => {
    const { tenantID, pin, deviceId } = req.body;
    try {
        const tenant = await Tenant.findOne({ tenantID: cleanString(tenantID) });
        if (!tenant || tenant.status === 'SUSPENDU') return res.status(403).json({ success: false, error: "Accès refusé" });

        let isValid = (String(tenant.pin).trim() === String(pin).trim());
        let roleAttribue = 'MASTER';

        if (!isValid) {
            const state = await AppState.findOne({ tenantID: tenant.tenantID });
            if (state && state.activeOrders && state.activeOrders['STAFF_ACCESS']) {
                const staffMember = (state.activeOrders['STAFF_ACCESS'].data || []).find(s => String(s.pin).trim() === String(pin).trim() && s.active === true);
                if (staffMember) { isValid = true; roleAttribue = staffMember.dept || 'STAFF'; }
            }
        }

        if (isValid) { 
            if (deviceId && !tenant.registeredDevices.includes(deviceId)) {
                if (tenant.registeredDevices.length >= tenant.maxScreens) return res.status(403).json({ success: false, error: "Limite d'écrans atteinte." });
                tenant.registeredDevices.push(deviceId); await tenant.save();
            }
            return res.json({ success: true, plan: tenant.plan, specialite: tenant.specialite, role: roleAttribue, safeTenantID: tenant.tenantID }); 
        }
        res.status(401).json({ success: false, error: "Code PIN incorrect." });
    } catch (error) { res.status(500).json({ success: false }); }
});

// Sync Écrans : Gère à la fois les demandes d'anciennes et de nouvelles versions
app.get(['/api/check-device', '/api/dashboard-info'], async (req, res) => {
    try {
        const tenant = await Tenant.findOne({ tenantID: cleanString(req.query.tenantID) });
        if (!tenant) return res.status(404).json({ success: false });
        res.json({ success: true, activeCount: tenant.registeredDevices.length, activeDevices: tenant.registeredDevices.length, maxScreens: tenant.maxScreens });
    } catch (e) { res.status(500).json({ success: false }); }
});

// Modification de PIN : Connecté simultanément sur les deux endpoints
app.post(['/api/update-pin', '/api/update-master-pin'], async (req, res) => {
    const { tenantID, newPin } = req.body;
    try {
        await Tenant.findOneAndUpdate({ tenantID: cleanString(tenantID) }, { pin: newPin, registeredDevices: [] });
        res.json({ success: true });
    } catch (error) { res.status(500).json({ success: false }); }
});

app.post(['/api/kill-switch', '/api/admin-reset-devices'], async (req, res) => {
    try {
        await Tenant.findOneAndUpdate({ tenantID: cleanString(req.body.tenantID) }, { registeredDevices: [] });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

// ==========================================
// BOUTIQUE & SERVICES STRIPE
// ==========================================
app.post(['/api/billing-portal', '/api/stripe/create-customer-portal-session'], async (req, res) => {
    try {
        const tenant = await Tenant.findOne({ tenantID: cleanString(req.body.tenantID) });
        if (!tenant || !tenant.config || !tenant.config.stripeCustomerId) return res.status(400).json({ success: false });
        const session = await stripe.billingPortal.sessions.create({
            customer: tenant.config.stripeCustomerId,
            return_url: `${req.headers.origin}/administration.html?tenantID=${tenant.tenantID}`,
        });
        res.json({ success: true, url: session.url });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.post(['/api/buy-screens', '/api/stripe/create-screen-upgrade-session'], async (req, res) => {
    try {
        const { tenantID, pack, quantity } = req.body;
        const qteFinale = quantity || parseInt(pack) || 1;
        let amount = qteFinale === 3 ? 2300 : qteFinale === 5 ? 5000 : qteFinale * 900;
        
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{ price_data: { currency: 'eur', product_data: { name: `iCHEF : +${qteFinale} Écran(s)` }, unit_amount: amount }, quantity: 1 }],
            mode: 'payment',
            metadata: { type: 'UPGRADE_SCREENS', tenantID: cleanString(tenantID), extraScreens: qteFinale },
            success_url: `${req.headers.origin}/administration.html?tenantID=${cleanString(tenantID)}&upgrade=success`,
            cancel_url: `${req.headers.origin}/administration.html?tenantID=${cleanString(tenantID)}&upgrade=cancel`,
        });
        res.json({ success: true, url: session.url });
    } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.post('/api/create-checkout', async (req, res) => {
    try {
        const { total, table, tenantID } = req.body;
        const state = await AppState.findOne({ tenantID: cleanString(tenantID) });
        const settings = state.activeOrders['SETTINGS_MASTER'].data;
        const stripeKeyResto = settings.payment ? settings.payment.stripeLink.trim() : null;

        const tenantStripe = require('stripe')(stripeKeyResto);
        const session = await tenantStripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{ price_data: { currency: 'eur', product_data: { name: 'Table ' + table }, unit_amount: Math.round(total * 100) }, quantity: 1 }],
            mode: 'payment',
            success_url: `https://tableau-system.onrender.com/menu-qr.html?tenantID=${cleanString(tenantID)}&table=${table}&paiement=ok`,
            cancel_url: `https://tableau-system.onrender.com/menu-qr.html?tenantID=${cleanString(tenantID)}&table=${table}&paiement=annule`,
        });
        res.json({ url: session.url });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// ==========================================
// ALERTES SOS SUPPORT ET SYNCHRONISATION GLOBALE
// ==========================================
let activeAlerts = []; 
app.post(['/api/support-alert', '/api/sos-alert'], (req, res) => {
    activeAlerts.push({ id: Date.now().toString(), tenantID: cleanString(req.body.tenantID), type: req.body.type, message: req.body.message, timestamp: req.body.timestamp, status: 'OPEN' });
    res.json({ success: true });
});

app.get('/get-current-state', async (req, res) => {
    try {
        let tenantID = req.query.tenantID || 'MASTER_STATE';
        if (tenantID !== 'MASTER_STATE') {
            const tenant = await Tenant.findOne({ tenantID: cleanString(tenantID) });
            if (tenant && tenant.status === 'SUSPENDU') return res.status(403).json({ error: "Licence suspendue" });
        }
        let state = await AppState.findOne({ tenantID: cleanString(tenantID) });
        if (!state) state = await AppState.create({ tenantID: cleanString(tenantID), activeOrders: {} });
        
        const tenantInfo = await Tenant.findOne({ tenantID: cleanString(tenantID) });
        const finalState = state.toObject();
        if(tenantInfo) finalState.maxStaff = tenantInfo.maxStaff;
        res.json(finalState);
    } catch (e) { res.status(500).json({ error: "Sync Error" }); }
});

app.post('/update-order', async (req, res) => {
    try {
        const { tableId, order } = req.body;
        let updateQuery = (order === null) ? { $unset: { [`activeOrders.${tableId}`]: 1 } } : { $set: { [`activeOrders.${tableId}`]: order } };
        await AppState.findOneAndUpdate({ tenantID: cleanString(req.query.tenantID) }, updateQuery, { upsert: true });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Save Error" }); }
});

// ==========================================
// CONTROLEUR ADMINISTRATION CENTRALE (SUPER ADMIN)
// ==========================================
app.post('/api/get-all-tenants-admin', async (req, res) => {
    if (req.body.masterKey !== ADMIN_PASS) return res.status(401).json({ success: false });
    const tenants = await Tenant.find({});
    res.json({ success: true, tenants: tenants.map(t => ({ id: t.tenantID, name: t.clientName, email: t.email, pack: t.plan, pin: t.pin, maxScreens: t.maxScreens, activeScreens: t.registeredDevices.length, status: t.status })) });
});

app.post('/api/admin-action', async (req, res) => {
    if (req.body.masterKey !== ADMIN_PASS) return res.status(401).json({ success: false });
    const { tenantID, action, newPlan, manualScreens, manualPin, manualMaxStaff } = req.body;
    const id = cleanString(tenantID);

    if (action === 'set_screens') await Tenant.findOneAndUpdate({ tenantID: id }, { maxScreens: parseInt(manualScreens) });
    else if (action === 'set_max_staff') await Tenant.findOneAndUpdate({ tenantID: id }, { maxStaff: parseInt(manualMaxStaff) });
    else if (action === 'set_pin') await Tenant.findOneAndUpdate({ tenantID: id }, { pin: manualPin.trim(), registeredDevices: [] });
    else if (action === 'set_plan') {
        let lim = ['CHEF','PATISSIER','BAR','CHEF_CUISINE','CHEF_PATISSERIE','CHEF_BAR'].includes(newPlan.toUpperCase()) ? 1 : 5;
        if(['EMPIRE','BRIGADE','PREMIUM'].includes(newPlan.toUpperCase())) lim = 50;
        await Tenant.findOneAndUpdate({ tenantID: id }, { plan: newPlan.toUpperCase(), maxScreens: lim });
    }
    else if (action === 'reset_devices') await Tenant.findOneAndUpdate({ tenantID: id }, { registeredDevices: [] });
    else if (action === 'suspend') await Tenant.findOneAndUpdate({ tenantID: id }, { status: 'SUSPENDU', registeredDevices: [] });
    else if (action === 'activate') await Tenant.findOneAndUpdate({ tenantID: id }, { status: 'ACTIF' });
    else if (action === 'delete') { await Tenant.findOneAndDelete({ tenantID: id }); await AppState.findOneAndDelete({ tenantID: id }); }
    res.json({ success: true });
});

app.listen(PORT, () => console.log("L'Empire iCHEF est en ligne et sécurisé sur le port " + PORT));
