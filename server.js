/**
 * ==============================================================
 * 🧠 iCHEF EMPIRE OS — ENGINE SERVER BACKEND (V. FORTERESSE)
 * ==============================================================
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const twilio = require('twilio'); // 📡 INTÉGRATION TWILIO (SMS/WHATSAPP)

// 🔥 WEBSOCKETS POUR LE TEMPS RÉEL 🔥
const http = require('http');
const { Server } = require('socket.io');

// ==========================================
// CONFIGURATION STRIPE iCHEF (Abonnements SaaS & Empreintes)
// ==========================================
const stripeKey = process.env.STRIPE_SECRET_KEY || 'sk_test_51TN80JQ9Dw3nOfA4I3XTxPl5FR4ddYmU9Jw2pGmfa0eABz2P6wAzK8RMzHw2XilulLXxFmY2oEDgau4TcScOf9WK00ajIEuweB'; 
const stripe = require('stripe')(stripeKey);

// ==========================================
// CONFIGURATION TWILIO (NOTIFICATIONS DIRECTEUR & CLIENT)
// ==========================================
const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
const twilioClient = (twilioAccountSid && twilioAuthToken) ? twilio(twilioAccountSid, twilioAuthToken) : null;
const NUMERO_FLAVIEN = '+33641437265'; // Cible des alertes critiques

const app = express();
const server = http.createServer(app); // Serveur HTTP lié à Express
const io = new Server(server, { cors: { origin: '*' } }); // Serveur Temps Réel

// 👇 DÉBLOCAGE DES VIDÉOS & RESSOURCES 👇
app.use(express.static(__dirname));

const PORT = process.env.PORT || 10000;

// SÉCURITÉ MAÎTRE DE L'EMPIRE (Super Admin)
const ADMIN_PASS = process.env.ADMIN_PASS || 'Empire2026';

// Sécurité des requêtes (CORS)
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
        res.status(403).send('🛑 Accès Refusé. Sécurité Empire iCHEF.');
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

                // 🔓 Un achat officiel supprime toute expiration de démo (La licence devient permanente)
                await Tenant.updateOne(
                    { tenantID: safeID },
                    { 
                        $set: { status: 'ACTIF', config: { stripeCustomerId: session.customer } },
                        $unset: { demoExpiration: "" }, // Supprime la limite de 24h
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
mongoose.connect(mongoURI).then(() => console.log('✅ Base de donnees iCHEF Online')).catch(err => console.error(err.message));

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
    config: { stripeCustomerId: String },
    demoExpiration: { type: Date } // ⏳ CHRONOMÈTRE DE SÉCURITÉ DÉMO (24H)
});
const Tenant = mongoose.model('Tenant', tenantSchema);

const AppState = mongoose.model('AppState', new mongoose.Schema({
    tenantID: { type: String, required: true, unique: true },
    activeOrders: { type: Object, default: {} }
}, { minimize: false }));

// ==========================================
// 🤖 MOTEURS IA (GEMINI)
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

// ==========================================
// 🔴 ENGINE DE CALCUL DE TEMPS RH INTÉGRÉ
// ==========================================
function parseTime(timeStr) {
    if(!timeStr || !timeStr.includes(':')) return null;
    const pts = timeStr.split(':');
    return parseInt(pts[0]) + (parseInt(pts[1]) / 60);
}

function calculateNet(p) {
    if(p.status !== 'present' && p.status !== 'off_matin' && p.status !== 'off_soir' && p.status !== 'ferie') return 0;
    let total = 0;
    if(p.s1) { let [s, e] = p.s1.split('-'); if(s && e) { s=parseTime(s); e=parseTime(e); if(s!==null&&e!==null) { if(e<s) e+=24; total+=(e-s); } } }
    if(p.s2) { let [s, e] = p.s2.split('-'); if(s && e) { s=parseTime(s); e=parseTime(e); if(s!==null&&e!==null) { if(e<s) e+=24; total+=(e-s); } } }
    total -= (parseInt(p.pause) || 0) / 60;
    return Math.max(0, total);
}

// ==========================================
//  IA SMART-RESERVATION (Yield Management & Time-Shifting)
// ==========================================
app.post('/api/smart-reservation', async (req, res) => {
    const { tenantID, customerRequest, availableTables } = req.body;
    try {
        const safeID = cleanString(tenantID);
        let state = await AppState.findOne({ tenantID: safeID });
        
        let activeCooks = 1;
        if (state && state.activeOrders && state.activeOrders['STAFF_ACCESS'] && state.activeOrders['STAFF_ACCESS'].data) {
            const staff = state.activeOrders['STAFF_ACCESS'].data;
            activeCooks = staff.filter(s => s.dept === 'cuisine' && s.active).length || 1;
        }

        const prompt = `Tu es l'IA iCHEF, le Maître d'Hôtel d'élite et Yield Manager du restaurant.
        
        Demande du client : "${customerRequest}".
        Tables physiques libres : ${JSON.stringify(availableTables)}.
        
        🔴 INFO CRITIQUE BRIGADE : Nous avons actuellement ${activeCooks} cuisinier(s) en poste. 
        RÈGLE DE PRODUCTION : 1 cuisinier peut gérer environ 15 couverts par tranche horaire.
        
        MISSION :
        1. Si la taille de la table dépasse la capacité de la brigade pour l'heure demandée, TU DOIS REFUSER l'heure initiale.
        2. TIME-SHIFTING : Si tu refuses, propose au client un autre horaire (ex: 45 min plus tôt ou plus tard) dans le "messageClient".
        3. Si tu acceptes, trouve la table idéale.
        
        RÉPONDS UNIQUEMENT AVEC CE JSON STRICT (SANS MARKDOWN) : 
        { 
          "acceptee": true/false, 
          "pax": nombre, 
          "heure": "HH:MM", 
          "tableAllouee": "ID_TABLE_OU_VIDE", 
          "messageClient": "Votre réponse élégante au client, justifiant un refus par l'affluence et proposant une alternative si besoin.", 
          "optimisationInfo": "Notes internes pour le manager" 
        }`;

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(prompt);
        
        let responseText = result.response.text().trim();
        const ticks = String.fromCharCode(96, 96, 96);
        responseText = responseText.split(ticks + 'json').join('').split(ticks).join('').trim();
        
        if (!responseText.startsWith("{")) responseText = responseText.substring(responseText.indexOf("{"));
        const decision = JSON.parse(responseText);
        
        if (decision.acceptee && decision.tableAllouee) {
            await AppState.findOneAndUpdate(
                { tenantID: safeID },
                { $push: { "activeOrders.RESERVATIONS_MASTER.data": { 
                    id: 'resa_' + Date.now(), 
                    pax: decision.pax, 
                    heure: decision.heure, 
                    table: decision.tableAllouee, 
                    info: decision.optimisationInfo, 
                    timestamp: Date.now() 
                } } },
                { upsert: true }
            );
        }
        res.json({ success: true, decision });
    } catch (error) { 
        console.error("Erreur Smart-Reservation:", error);
        res.status(500).json({ success: false, error: "L'IA du Maître d'Hôtel est momentanément indisponible." }); 
    }
});

// ==========================================
// API RESTAURANT SYNCHRONISATION
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
        
        // 🔒 SÉCURITÉ : VÉRIFICATION EXPIRATION 24H POUR LA DÉMO
        if (tenant.demoExpiration && new Date() > new Date(tenant.demoExpiration)) {
            return res.status(403).json({ success: false, error: "Démonstration expirée (limite de 24h atteinte)." });
        }

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
            
            // 🔒 SÉCURITÉ : VÉRIFICATION EXPIRATION 24H EN COURS D'UTILISATION
            if (tenant && tenant.demoExpiration && new Date() > new Date(tenant.demoExpiration)) {
                return res.status(403).json({ error: "Démonstration expirée (limite de 24h atteinte)." });
            }
            if (tenant && tenant.status === 'SUSPENDU') return res.status(403).json({ error: "Licence suspendue ou en attente" });
        }
        let state = await AppState.findOne({ tenantID });
        if (!state) state = await AppState.create({ tenantID, activeOrders: {} });
        
        // 🔥 SYMBIOSIE INTELLIGENTE : CALCUL DYNAMIQUE DES HEURES ACCOMPLIES DU MOIS EN COURS 🔥
        if (state.activeOrders && state.activeOrders['STAFF_ACCESS'] && state.activeOrders['TIMESHEETS_MASTER']) {
            const today = new Date();
            const monthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
            const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
            
            const staffList = state.activeOrders['STAFF_ACCESS'].data || [];
            const timesheets = state.activeOrders['TIMESHEETS_MASTER'].data || {};
            const monthData = timesheets[monthStr] || {};

            let stateModified = false;
            staffList.forEach(staff => {
                let totalHoursDone = 0;
                for (let d = 1; d <= daysInMonth; d++) {
                    if (monthData[staff.id] && monthData[staff.id][d]) {
                        totalHoursDone += calculateNet(monthData[staff.id][d]);
                    }
                }
                const formattedHours = parseFloat(totalHoursDone.toFixed(1));
                if (staff.workedHours !== formattedHours) {
                    staff.workedHours = formattedHours;
                    stateModified = true;
                }
            });

            if (stateModified) {
                state.markModified('activeOrders');
                await state.save();
            }
        }
        
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
        const newState = await AppState.findOneAndUpdate({ tenantID }, updateQuery, { upsert: true, new: true });
        
        // 🔥 ÉMISSION TEMPS RÉEL (WEBSOCKETS) VERS LES ÉCRANS DU RESTAURANT 🔥
        io.to(tenantID).emit('updateState', newState);
        
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
        const { tenantID, action, newPlan, manualScreens, manualPin, manualMaxStaff, maxScreens, addons } = req.body;
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
        else if (action === 'set_addons' && Array.isArray(addons)) {
            await Tenant.findOneAndUpdate({ tenantID: safeID }, { addons: addons });
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
        else if (action === 'activate') {
            await Tenant.findOneAndUpdate({ tenantID: safeID }, { status: 'ACTIF', $unset: { demoExpiration: "" } });
        }
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
        res.json({ dossier_actuel: __dirname, fichiers_trouves: files });
    });
});

// ==========================================
// 🎯 PORTAIL DES DEMANDES DE DÉMO (ALERTE SMS TWILIO + EMAIL)
// ==========================================
app.post('/api/nouvelle-demande-demo', async (req, res) => {
    try {
        const { tenantID, restaurant, email, phone } = req.body;
        console.log(`🌟 ENREGISTREMENT SÉCURISÉ PROSPECT DÉMO 24H : ${restaurant} (${email})`);
        
        const codePinAlea = Math.floor(1000 + Math.random() * 9000).toString();
        const expirationTime = new Date(Date.now() + 24 * 60 * 60 * 1000);

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
            registeredDevices: [],
            demoExpiration: expirationTime
        });

        await AppState.create({
            tenantID: cleanString(tenantID),
            activeOrders: {}
        });

        const d = req.body.details || {};
        let qualification = `Type: ${d.type || 'Non précisé'}\n`;
        if (d.type === 'hotel' || d.type === 'hotel-resto') {
            qualification += `🏨 Catégorie: ${d.stars || 'N/A'} - 🚪 Chambres: ${d.rooms || 0}\n`;
        }
        if (d.type === 'restaurant' || d.type === 'hotel-resto' || d.type === 'kiosque') {
            qualification += `🍽️ Style: ${d.style || 'N/A'} - 🪑 Couverts: ${d.seats || 0}\n📍 Zones: ${d.zones || 'N/A'}\n`;
        }

        // 📡 ENVOI DE L'ALERTE WHATSAPP DIRECTEUR (TWILIO)
        if (twilioClient) {
            try {
                const envTwilioNum = process.env.TWILIO_PHONE_NUMBER || '';
                const fromNumber = `whatsapp:${envTwilioNum.replace('whatsapp:', '')}`;
                const toNumber = `whatsapp:${NUMERO_FLAVIEN.replace('whatsapp:', '')}`;

                await twilioClient.messages.create({
                    body: `🔥 NOUVEAU PARTENAIRE QUALIFIÉ : ${restaurant}\n📞 Tél: ${phone}\n🆔 TenantID: ${tenantID}\n\n📊 INFOS PROFIL :\n${qualification}\n🎯 PROJET: ${d.projet || 'Aucun'}`,
                    from: fromNumber,
                    to: toNumber
                });
                console.log(`✅ Alerte WhatsApp envoyée.`);
            } catch (whatsappErr) {
                console.error("❌ Erreur Twilio WhatsApp :", JSON.stringify(whatsappErr, null, 2));
            }
        }

        // ========================================================
        // ✨ WHATSAPP DU CLIENT (Moteur d'Onboarding VIP)
        // ========================================================
        if (twilioClient && phone) {
            try {
                // Formatage du numéro client (ex: 06 12 34 56 78 -> +33612345678)
                let clientPhone = phone.trim().replace(/\s+/g, '');
                if (clientPhone.startsWith('0')) {
                    clientPhone = '+33' + clientPhone.substring(1);
                }

                const envTwilioNum = process.env.TWILIO_PHONE_NUMBER || '';
                const fromNumber = `whatsapp:${envTwilioNum.replace('whatsapp:', '')}`;

                await twilioClient.messages.create({
                    body: `✨ Bienvenue chez iCHEF OS, ${restaurant} !\n\nVotre écosystème sur-mesure est en cours de préparation par notre équipe.\n\n🔑 VOS ACCÈS PROVISOIRES :\n🆔 Identifiant : ${tenantID}\n🔒 Code PIN : ${codePinAlea}\n\nUn expert va vous contacter sous 24h.\nL'équipe iCHEF.`,
                    from: fromNumber,
                    to: `whatsapp:${clientPhone}`
                });
                console.log(`✅ WhatsApp de bienvenue envoyé au partenaire : ${clientPhone}`);
            } catch (err) {
                console.error("❌ Erreur d'envoi WhatsApp au client :", JSON.stringify(err, null, 2));
            }
        }

        // 🚨 ENVOI SILENCIEUX DE L'EMAIL DE NOTIFICATION (FORMSUBMIT)
        try {
            const urlEmail = "https://formsubmit.co/ajax/iche.flavien@ichef.ch";
            
            const payload = {
                _subject: `🚨 iCHEF OS : Nouveau Lead Qualifié - ${restaurant}`,
                "Établissement": restaurant,
                "Téléphone": phone,
                "Email du client": email,
                "Identifiant (ID)": tenantID,
                "Code PIN Généré": codePinAlea,
                "Qualification Profil": qualification,
                "Statut Technique": "Bloqué (en attente de votre activation depuis l'Admin)",
                "Durée de la démo": "Se coupera dans 24H automatiquement",
                _template: "box" 
            };

            fetch(urlEmail, {
                method: "POST",
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify(payload)
            })
            .then(res => res.json())
            .then(data => console.log("✅ Email d'alerte déclenché avec succès vers ichef.ch !"))
            .catch(err => console.log("❌ Erreur silencieuse lors de l'envoi de l'email :", err));
            
        } catch (err) {
            console.error("Erreur lors de la préparation de l'email :", err);
        }

        res.json({ success: true, message: "Demande mise en attente de validation." });
    } catch (e) {
        console.error("Erreur création prospect démo :", e);
        res.status(500).json({ success: false, error: "Cet identifiant d'établissement existe déjà." });
    }
});

// ==========================================
//  ANTI NO-SHOW (Empreinte Bancaire)
// ==========================================
app.post('/api/create-hold-intent', async (req, res) => {
    try {
        const { tenantID, guests, date, time } = req.body;
        const amountPerPerson = 50; 
        const totalAmount = (parseInt(guests) || 1) * amountPerPerson * 100;

        const paymentIntent = await stripe.paymentIntents.create({
            amount: totalAmount,
            currency: 'eur',
            payment_method_types: ['card'],
            capture_method: 'manual', 
            metadata: { tenantID: tenantID, type: 'ANTI_NO_SHOW', date: date, time: time, guests: guests },
        });

        res.json({ success: true, clientSecret: paymentIntent.client_secret, holdAmount: totalAmount / 100 });
    } catch (error) {
        console.error("Erreur Stripe Empreinte:", error);
        res.status(500).json({ success: false, error: "Impossible de créer l'empreinte bancaire." });
    }
});

// ==========================================
//  MOTEUR ANALYTIQUE : MÉMOIRE À LONG TERME (BIG DATA)
// ==========================================
app.post('/api/log-traffic-history', async (req, res) => {
    const { tenantID, pax, totalAmount } = req.body;
    if (!tenantID || !pax) return res.status(400).json({ success: false });

    const safeID = cleanString(tenantID);
    const now = new Date();
    
    const trafficData = {
        id: 'traf_' + Date.now(),
        timestamp: now.getTime(),
        dateStr: now.toISOString().split('T')[0], 
        dayOfWeek: now.getDay(), 
        hour: now.getHours(),
        month: now.getMonth(),
        pax: parseInt(pax),
        revenue: parseFloat(totalAmount || 0)
    };

    try {
        await AppState.findOneAndUpdate(
            { tenantID: safeID },
            { $push: { "activeOrders.TRAFFIC_HISTORY.data": trafficData } },
            { upsert: true }
        );
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, error: "Erreur d'archivage" });
    }
});

// ==========================================
// 🧠 IA RH : PRÉDICTIONS ET PLANNINGS (YIELD MANAGEMENT)
// ==========================================
app.post('/api/predict-hr-schedule', async (req, res) => {
    const { tenantID, staffList } = req.body;
    const safeID = cleanString(tenantID);

    try {
        let state = await AppState.findOne({ tenantID: safeID });
        let history = [];
        if (state && state.activeOrders && state.activeOrders['TRAFFIC_HISTORY']) {
            history = state.activeOrders['TRAFFIC_HISTORY'].data || [];
        }

        if (history.length < 50) {
            return res.json({ success: true, message: "L'IA a besoin de plus d'historique de service (au moins 50 tables enregistrées) pour établir une prédiction fiable." });
        }

        let summary = history.map(h => `Jour:${h.dayOfWeek}-Heure:${h.hour}-Pax:${h.pax}`);

        const prompt = `Tu es le Directeur des Ressources Humaines IA d'un restaurant. 
        Voici l'historique de fréquentation récent : ${JSON.stringify(summary)}. 
        Voici le staff actuel : ${JSON.stringify(staffList)}.
        
        MISSION : Analyse ces données et renvoie un JSON STRICT (SANS MARKDOWN) avec :
        1. "rushPeriods" : Les 3 créneaux de la semaine où il faut absolument tout le monde.
        2. "deadPeriods" : Les 3 créneaux où on peut envoyer le staff en repos.
        3. "hiringAdvice" : Faut-il recruter ? (Oui/Non) et pourquoi (justification courte).
        4. "vacationSuggestions" : Le meilleur moment du mois pour autoriser des congés longs.
        
        Format attendu : { "rushPeriods": ["Jeudi 20h", ...], "deadPeriods": [...], "hiringAdvice": "...", "vacationSuggestions": "..." }`;

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(prompt);
        
        let responseText = result.response.text().trim();
        const ticks = String.fromCharCode(96, 96, 96);
        responseText = responseText.split(ticks + 'json').join('').split(ticks).join('').trim();
        
        if (!responseText.startsWith("{")) responseText = responseText.substring(responseText.indexOf("{"));
        
        res.json({ success: true, prediction: JSON.parse(responseText) });
    } catch (error) { 
        res.status(500).json({ success: false, error: "Erreur de prédiction IA." }); 
    }
});

// ==========================================
// 🌟 AUTO-GÉNÉRATION DU COMPTE DE DÉMONSTRATION
// ==========================================
async function creerCompteDemo() {
    try {
        const demoExist = await Tenant.findOne({ tenantID: 'demo' });
        if (!demoExist) {
            await Tenant.create({
                tenantID: 'demo',
                clientName: 'Restaurant iCHEF Démo',
                status: 'ACTIF',
                plan: 'EMPIRE',
                pin: '0000',
                maxScreens: 50,
                maxStaff: 999
            });
            console.log('✅ Compte DÉMO ("demo" / "0000") généré avec succès dans la base !');
        }
    } catch (e) {
        console.error("Erreur lors de la création du compte démo :", e);
    }
}
creerCompteDemo();

// CRITIQUE : C'est 'server.listen' et non 'app.listen' pour que Socket.io fonctionne.
server.listen(PORT, () => console.log("✅ L'Empire iCHEF est en ligne, Socket.io activé, sécurisé sur le port " + PORT));
