/**
 * ==============================================================
 * 🧠 iCHEF EMPIRE OS — ENGINE SERVER BACKEND
 * ==============================================================
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// ==========================================
// CONFIGURATION STRIPE iCHEF (Abonnements SaaS)
// ==========================================
const stripeKey = process.env.STRIPE_SECRET_KEY || 'sk_test_51TN80JQ9Dw3nOfA4I3XTxPl5FR4ddYmU9Jw2pGmfa0eABz2P6wAzK8RMzHw2XilulLXxFmY2oEDgau4TcScOf9WK00ajIEuweB'; 
const stripe = require('stripe')(stripeKey);

const app = express();

// 👇 DÉBLOCAGE DES VIDÉOS 👇
app.use(express.static(__dirname));

const PORT = process.env.PORT || 10000;

// SÉCURITÉ MAÎTRE DE L'EMPIRE (Super Admin)
const ADMIN_PASS = process.env.ADMIN_PASS || 'Empire2026';

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept'] }));

// 🚨 SÉCURITÉ STRIPE : On utilise raw() uniquement pour la route webhook
app.use('/webhook', express.raw({ type: 'application/json' }));

app.use(express.json({ limit: '100mb' })); 
app.use(express.urlencoded({ extended: true, limit: '100mb' }));
app.use(express.static(path.join(__dirname)));

const cleanString = (str) => String(str || "").trim().toLowerCase();

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'vitrine.html'));
});

// Ta route d'administration officielle (Tour de Contrôle)
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

        if (session.metadata && session.metadata.type === 'UPGRADE_SCREENS') {
            const safeID = cleanString(session.metadata.tenantID);
            try {
                const extraScreens = parseInt(session.metadata.extraScreens);
                await Tenant.updateOne({ tenantID: safeID }, { $inc: { maxScreens: extraScreens } });
            } catch(e) {}
        } else {
            try {
                const rawTenantID = session.client_reference_id || "client_attente_" + Date.now();
                const safeID = cleanString(rawTenantID);
                let planAchete = "BUSINESS";
                let limitScreens = 5; let limitStaff = 999;

                if (session.metadata && session.metadata.plan) {
                    planAchete = session.metadata.plan.toUpperCase();
                    if (['CHEF_CUISINE', 'CHEF_PATISSERIE', 'CHEF_BAR', 'CHEF', 'PATISSIER', 'BAR'].includes(planAchete)) {
                        limitScreens = 1; limitStaff = 1;
                    } else if (['BUSINESS', 'RENTABILITE', 'ECO', 'PACK_A'].includes(planAchete)) {
                        limitScreens = 5; limitStaff = 999;
                    } else if (['EMPIRE', 'BRIGADE', 'BRIGADES', 'PREMIUM'].includes(planAchete)) {
                        limitScreens = 50; limitStaff = 999;
                    }
                } else {
                    if (session.amount_total === 1900) { planAchete = "CHEF_CUISINE"; limitScreens = 1; limitStaff = 1; } 
                    else if (session.amount_total === 4500 || session.amount_total === 4900) { planAchete = "PACK_A"; limitScreens = 5; limitStaff = 999; } 
                    else if (session.amount_total >= 9900) { planAchete = "EMPIRE"; limitScreens = 50; limitStaff = 999; }
                }

                await Tenant.updateOne(
                    { tenantID: safeID },
                    { 
                        $set: { status: 'ACTIF', config: { stripeCustomerId: session.customer } },
                        $setOnInsert: { plan: planAchete, maxScreens: limitScreens, maxStaff: limitStaff, pin: Math.floor(1000 + Math.random() * 9000).toString() }
                    },
                    { upsert: true }
                );
            } catch(e) {}
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
// 🤖 MOTEURS IA (GEMINI) — SÉCURISATION BLINDÉE CONTRE LE COUPAGE DE LIGNES
// ==========================================
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'CLE_MANQUANTE');

app.post('/api/scan-invoice', async (req, res) => {
    const { imageBase64, mimeType } = req.body;
    if (!imageBase64) return res.status(400).json({ success: false, error: "Aucune image fournie." });
    try {
        const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
        const imagePart = { inlineData: { data: base64Data, mimeType: mimeType || "image/jpeg" } };
        const prompt = 'Analyse cette image de facture. Extrais les informations. RESPOND ONLY WITH JSON WITHOUT MARKDOWN TEXT: { "fournisseur": "Nom", "adresse": "Adresse", "telephone": "Tel", "email": "Email", "devise": "€", "date": "JJ/MM/AAAA", "totalHT": 0.00, "tva": 0.00, "totalTTC": 0.00, "articles": [{ "nom": "nom", "categorie": "catégorie", "quantite": "qty", "prixUnitaire": 0.00 }] }';
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent([prompt, imagePart]);
        
        let responseText = result.response.text().trim();
        const ticks = String.fromCharCode(96, 96, 96);
        responseText = responseText.split(ticks + 'json').join('').split(ticks).join('').trim();
        
        if (!responseText.startsWith("{")) responseText = responseText.substring(responseText.indexOf("{"));
        res.json({ success: true, data: JSON.parse(responseText) });
    } catch (error) { res.status(500).json({ success: false, error: "Erreur de traitement IA ou Image illisible." }); }
});

app.post('/analyse-ticket', async (req, res) => {
    const { image, mimeType } = req.body;
    if (!image) return res.status(400).json({ success: false, error: "Image manquante" });
    try {
        const imagePart = { inlineData: { data: image, mimeType: mimeType || "image/jpeg" } };
        const prompt = 'Analyse cette étiquette de traçabilité. JSON NO MARKDOWN: { "nom": "Nom du produit", "lot": "Numéro", "dlc": "JJ/MM/AAAA" }';
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent([prompt, imagePart]);
        
        let text = result.response.text().trim();
        const ticks = String.fromCharCode(96, 96, 96);
        text = text.split(ticks + 'json').join('').split(ticks).join('').trim();
        
        res.json({ success: true, resultat: JSON.parse(text) });
    } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.post('/api/smart-reservation', async (req, res) => {
    const { tenantID, customerRequest, availableTables } = req.body;
    try {
        const prompt = `Tu es le Maître d'Hôtel iCHEF. Demande client : "${customerRequest}". Tables libres : ${JSON.stringify(availableTables)}. Trouve la table optimale. JSON STRICT: { "acceptee": true/false, "pax": nombre, "heure": "HH:MM", "tableAllouee": "ID_TABLE", "messageClient": "Votre réponse", "optimisationInfo": "Notes" }`;
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(prompt);
        
        let responseText = result.response.text().trim();
        const ticks = String.fromCharCode(96, 96, 96);
        responseText = responseText.split(ticks + 'json').join('').split(ticks).join('').trim();
        
        if (!responseText.startsWith("{")) responseText = responseText.substring(responseText.indexOf("{"));
        const decision = JSON.parse(responseText);
        if (decision.acceptee && decision.tableAllouee) {
            await AppState.findOneAndUpdate(
                { tenantID: cleanString(tenantID) },
                { $push: { "activeOrders.RESERVATIONS_MASTER.data": { id: 'resa_' + Date.now(), pax: decision.pax, heure: decision.heure, table: decision.tableAllouee, info: decision.optimisationInfo, timestamp: Date.now() } } },
                { upsert: true }
            );
        }
        res.json({ success: true, decision });
    } catch (error) { res.status(500).json({ success: false, error: "Erreur IA." }); }
});

// ==========================================
// API RESTAURANT SYNCHRONISATION (Caisse, Admin, etc.)
// ==========================================

app.post('/api/save-transaction', async (req, res) => {
    const { tenantID, transaction } = req.body;
    if (!tenantID || !transaction) return res.status(400).json({ success: false, error: "Données de transaction manquantes." });
    const safeID = cleanString(tenantID);
    try {
        let state = await AppState.findOne({ tenantID: safeID });
        if (!state) state = new AppState({ tenantID: safeID, activeOrders: {} });
        if (!state.activeOrders['FINANCIAL_HISTORY']) state.activeOrders['FINANCIAL_HISTORY'] = { data: [] };
        
        let history = state.activeOrders['FINANCIAL_HISTORY'].data || [];
        history.unshift(transaction);
        state.activeOrders['FINANCIAL_HISTORY'].data = history;

        state.markModified('activeOrders');
        await state.save();
        res.json({ success: true, message: "Ticket comptabilisé dans l'historique Admin." });
    } catch(e) { res.status(500).json({ success: false, error: "Erreur sauvegarde base de données." }); }
});

app.get('/api/get-contact', async (req, res) => {
    try {
        const tenant = await Tenant.findOne({ tenantID: cleanString(req.query.tenantID) });
        if (tenant) res.json({ success: true, contact: { email: tenant.email, phone: tenant.phone } });
        else res.json({ success: false });
    } catch(e) { res.status(500).json({ success: false }); }
});

app.post('/api/update-contact', async (req, res) => {
    try {
        const { tenantID, masterPin, email, phone } = req.body;
        const tenant = await Tenant.findOne({ tenantID: cleanString(tenantID) });
        if (!tenant || tenant.pin !== masterPin) return res.status(403).json({ success: false, error: "Non autorisé." });
        tenant.email = email; tenant.phone = phone; await tenant.save();
        res.json({ success: true });
    } catch(e) { res.status(500).json({ success: false }); }
});

app.get('/api/check-license', async (req, res) => {
    try {
        const tenant = await Tenant.findOne({ tenantID: cleanString(req.query.tenantID) });
        if (!tenant) return res.status(404).json({ success: false });
        res.json({ success: true, status: tenant.status, plan: tenant.plan, specialite: tenant.specialite });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.post('/api/verify-pin', async (req, res) => {
    const { tenantID, pin, deviceId } = req.body;
    try {
        const tenant = await Tenant.findOne({ tenantID: cleanString(tenantID) });
        if (!tenant) return res.status(404).json({ success: false, error: "Inconnu." });
        if (tenant.status === 'SUSPENDU') return res.status(403).json({ success: false, error: "Licence suspendue ou en attente d'approbation manuelle." });

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
                if (tenant.registeredDevices.length >= tenant.maxScreens) return res.status(403).json({ success: false, error: "Limite écrans atteinte." });
                tenant.registeredDevices.push(deviceId); await tenant.save();
            }
            return res.json({ success: true, plan: tenant.plan, specialite: tenant.specialite, role: roleAttribue, safeTenantID: tenant.tenantID }); 
        }
        res.status(401).json({ success: false, error: "Code PIN incorrect." });
    } catch (error) { res.status(500).json({ success: false }); }
});

app.post(['/api/update-pin', '/api/update-master-pin'], async (req, res) => {
    try {
        await Tenant.findOneAndUpdate({ tenantID: cleanString(req.body.tenantID) }, { pin: req.body.newPin, registeredDevices: [] });
        res.json({ success: true });
    } catch (error) { res.status(500).json({ success: false }); }
});

app.get(['/api/check-device', '/api/dashboard-info'], async (req, res) => {
    try {
        const tenant = await Tenant.findOne({ tenantID: cleanString(req.query.tenantID) });
        if (!tenant) return res.status(404).json({ success: false });
        res.json({ success: true, activeCount: tenant.registeredDevices.length, activeDevices: tenant.registeredDevices.length, maxScreens: tenant.maxScreens });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.post(['/api/kill-switch', '/api/admin-reset-devices'], async (req, res) => {
    try {
        await Tenant.findOneAndUpdate({ tenantID: cleanString(req.body.tenantID) }, { registeredDevices: [] });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.get('/get-current-state', async (req, res) => {
    try {
        let tenantID = req.query.tenantID || 'MASTER_STATE';
        if (tenantID !== 'MASTER_STATE') {
            tenantID = cleanString(tenantID);
            const tenant = await Tenant.findOne({ tenantID });
            if (tenant && tenant.status === 'SUSPENDU') return res.status(403).json({ error: "Licence suspendue ou en attente" });
        }
        let state = await AppState.findOne({ tenantID });
        if (!state) state = await AppState.create({ tenantID, activeOrders: {} });
        
        const tenantInfo = await Tenant.findOne({ tenantID });
        const finalState = state.toObject();
        if(tenantInfo) finalState.maxStaff = tenantInfo.maxStaff;
        res.json(finalState);
    } catch (e) { res.status(500).json({ error: "Sync Error" }); }
});

app.post('/update-order', async (req, res) => {
    try {
        let tenantID = req.query.tenantID || 'MASTER_STATE';
        if (tenantID !== 'MASTER_STATE') tenantID = cleanString(tenantID);

        const { tableId, order } = req.body;
        let updateQuery = (order === null) ? { $unset: { [`activeOrders.${tableId}`]: 1 } } : { $set: { [`activeOrders.${tableId}`]: order } };
        await AppState.findOneAndUpdate({ tenantID }, updateQuery, { upsert: true, new: true });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Save Error" }); }
});

// ==========================================
// MASTER CONTROL API (EMPIRE SUPER ADMIN)
// ==========================================
app.post('/api/get-all-tenants-admin', async (req, res) => {
    if (req.body.masterKey !== ADMIN_PASS) return res.status(401).json({ success: false, error: "Acces Refuse." });
    try {
        const tenantsData = await Tenant.find({});
        const formattedTenants = tenantsData.map(t => ({
            id: t.tenantID, name: t.clientName || "Sans Nom", 
            email: t.email || "Non renseigné", phone: t.phone || "Non renseigné",
            pack: t.plan, specialite: t.specialite, pin: t.pin,
            maxScreens: t.maxScreens, maxStaff: t.maxStaff,
            activeScreens: t.registeredDevices ? t.registeredDevices.length : 0, 
            status: t.status
        }));
        res.json({ success: true, tenants: formattedTenants });
    } catch(err) { res.status(500).json({ success: false }); }
});

app.post('/api/admin-action', async (req, res) => {
    if (req.body.masterKey !== ADMIN_PASS) return res.status(401).json({ success: false, error: "Acces Refuse." });
    try {
        const { tenantID, action, newPlan, manualScreens, manualPin, manualMaxStaff, maxScreens } = req.body;
        const safeID = cleanString(tenantID);

        if (action === 'set_screens' && manualScreens) {
            await Tenant.findOneAndUpdate({ tenantID: safeID }, { maxScreens: parseInt(manualScreens) });
        }
        else if (action === 'set_max_staff' && manualMaxStaff) {
            await Tenant.findOneAndUpdate({ tenantID: safeID }, { maxStaff: parseInt(manualMaxStaff) });
        }
        else if (action === 'set_pin' && manualPin) {
            await Tenant.findOneAndUpdate({ tenantID: safeID }, { pin: manualPin.trim(), registeredDevices: [] });
        }
        else if (action === 'set_plan' && newPlan) { 
            let limit = 1; let staffLimit = 1;
            const upperPlan = newPlan.toUpperCase();
            if (['CHEF', 'PATISSIER', 'BAR', 'CHEF_CUISINE', 'CHEF_PATISSERIE', 'CHEF_BAR'].includes(upperPlan)) { limit = 1; staffLimit = 1; } 
            else if (['BUSINESS', 'RENTABILITE', 'ECO', 'PACK_A'].includes(upperPlan)) { limit = 5; staffLimit = 999; } 
            else if (['BRIGADE', 'EMPIRE', 'BRIGADES', 'PREMIUM'].includes(upperPlan)) { limit = 50; staffLimit = 999; } 
            
            await Tenant.findOneAndUpdate({ tenantID: safeID }, { plan: upperPlan, maxScreens: limit, maxStaff: staffLimit }, { new: true });
        }
        else if (action === 'set_max_screens') {
            if (!maxScreens || isNaN(maxScreens) || maxScreens < 1) {
                return res.status(400).json({ success: false, error: "Nombre invalide." });
            }
            await Tenant.findOneAndUpdate({ tenantID: safeID }, { maxScreens: parseInt(maxScreens) });
        }
        else if (action === 'reset_devices') await Tenant.findOneAndUpdate({ tenantID: safeID }, { registeredDevices: [] });
        else if (action === 'suspend') await Tenant.findOneAndUpdate({ tenantID: safeID }, { status: 'SUSPENDU', registeredDevices: [] });
        else if (action === 'activate') await Tenant.findOneAndUpdate({ tenantID: safeID }, { status: 'ACTIF' });
        else if (action === 'delete') { await Tenant.findOneAndDelete({ tenantID: safeID }); await AppState.findOneAndDelete({ tenantID: safeID }); }
        
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ==========================================
// OUTIL DE DIAGNOSTIC (TOUR DE CONTRÔLE)
// ==========================================
app.get('/debug-fichiers', (req, res) => {
    const fs = require('fs');
    fs.readdir(__dirname, (err, files) => {
        if (err) return res.status(500).json({ erreur: "Impossible de lire le dossier" });
        res.json({
            dossier_actuel: __dirname,
            fichiers_trouves: files
        });
    });
});

// ==========================================
// 🎯 PORTAIL DES DEMANDES DE DÉMO (AVEC ALERTE WHATSAPP CORRIGÉE)
// ==========================================
app.post('/api/nouvelle-demande-demo', async (req, res) => {
    try {
        const { tenantID, restaurant, email, phone } = req.body;
        console.log(`🌟 ENREGISTREMENT SÉCURISÉ PROSPECT : ${restaurant} (${email})`);
        
        const codePinAlea = Math.floor(1000 + Math.random() * 9000).toString();

        await Tenant.create({
            tenantID: cleanString(tenantID),
            clientName: restaurant,
            email: email,
            phone: phone,
            status: 'SUSPENDU', 
            plan: 'EMPIRE',     
            specialite: 'cuisine',
            pin: codePinAlea,   
            maxScreens: 5,
            maxStaff: 999,
            registeredDevices: []
        });

        await AppState.create({
            tenantID: cleanString(tenantID),
            activeOrders: {}
        });

// ==========================================
// 🎯 PORTAIL DES DEMANDES DE DÉMO (AVEC DÉTECTION D'ERREUR WHATSAPP)
// ==========================================
app.post('/api/nouvelle-demande-demo', async (req, res) => {
    try {
        const { tenantID, restaurant, email, phone } = req.body;
        console.log(`🌟 ENREGISTREMENT SÉCURISÉ PROSPECT : ${restaurant} (${email})`);
        
        const codePinAlea = Math.floor(1000 + Math.random() * 9000).toString();

        await Tenant.create({
            tenantID: cleanString(tenantID),
            clientName: restaurant,
            email: email,
            phone: phone,
            status: 'SUSPENDU', 
            plan: 'EMPIRE',     
            specialite: 'cuisine',
            pin: codePinAlea,   
            maxScreens: 5,
            maxStaff: 999,
            registeredDevices: []
        });

        await AppState.create({
            tenantID: cleanString(tenantID),
            activeOrders: {}
        });

        // 🚨 ENVOI SILENCIEUX DU WHATSAPP DEPUIS LE SERVEUR 🚨
        try {
            let texteAlerte = `🚨 *Nouvelle Demande de Démo* 🚨\n\n🏢 Établissement : ${restaurant}\n📞 Tél : ${phone}\n📧 Email : ${email}\n🆔 ID : ${tenantID}\n🔑 PIN généré : ${codePinAlea}`;
            
            // On écrit le numéro avec le + classique, le code l'adaptera automatiquement
            const numTo = "+33641437265";
            
            // ⚠️ METS TON CODE À 6 CHIFFRES ICI (ENTRE LES GUILLEMETS) ⚠️
            const apiKey = "VOTRE_CODE_A_6_CHIFFRES"; 
            
            const urlWhatsApp = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(numTo)}&text=${encodeURIComponent(texteAlerte)}&apikey=${apiKey}`;
            
            // Le serveur contacte le robot WhatsApp et lit sa réponse
            fetch(urlWhatsApp)
                .then(reponse => reponse.text())
                .then(texte => console.log("📡 RÉPONSE DU BOT WHATSAPP :", texte))
                .catch(err => console.error("❌ ERREUR DE CONNEXION AU BOT :", err.message));
                
        } catch(e) {
            console.log("Erreur dans la préparation du WhatsApp :", e);
        }

        res.json({ success: true, message: "Demande mise en attente de validation." });
    } catch (e) {
        console.error("Erreur création prospect démo :", e);
        res.status(500).json({ success: false, error: "Cet identifiant d'établissement existe déjà." });
    }
});
