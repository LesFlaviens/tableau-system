const nodemailer = require('nodemailer');
/**
 * ==============================================================
 * 🧠 iCHEF EMPIRE OS — ENGINE SERVER BACKEND (V. FORTERESSE)
 * ==============================================================
 * Code unifié, sans doublons, avec SDK Google Gemini à jour.
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto'); // 🛡️ INTÉGRATION SÉCURITÉ CRYPTO (LOI ANTI-FRAUDE)
const mongoose = require('mongoose');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const twilio = require('twilio'); // 📡 INTÉGRATION TWILIO (SMS/WHATSAPP)

// 🔥 WEBSOCKETS POUR LE TEMPS RÉEL 🔥
const http = require('http');
const { Server } = require('socket.io');

// ==========================================
// CONFIGURATION STRIPE iCHEF
// ==========================================
const stripeKey = process.env.STRIPE_SECRET_KEY || 'sk_test_51TN80JQ9Dw3nOfA4I3XTxPl5FR4ddYmU9Jw2pGmfa0eABz2P6wAzK8RMzHw2XilulLXxFmY2oEDgau4TcScOf9WK00ajIEuweB'; 
const stripe = require('stripe')(stripeKey);

// ==========================================
// CONFIGURATION TWILIO
// ==========================================
const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
const NUMERO_FLAVIEN = '+330641437265'; 

let twilioClient = null;

if (twilioAccountSid && twilioAuthToken) {
    try {
        twilioClient = twilio(twilioAccountSid, twilioAuthToken);
        console.log("✅ Module Twilio activé et connecté !");
    } catch (err) {
        console.error("❌ Erreur d'initialisation Twilio :", err.message);
    }
}

const app = express();
const server = http.createServer(app); 
const io = new Server(server, { cors: { origin: '*' } }); 

app.use(express.static(__dirname));

const PORT = process.env.PORT || 10000;
const ADMIN_PASS = process.env.ADMIN_PASS || 'Empire2026';

app.use(cors({
    origin: function (origin, callback) { callback(null, true); },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept', 'X-CSRF-Token', 'X-iCHEF-Device', 'X-iCHEF-Master-Device', 'X-iCHEF-Tenant', 'Idempotency-Key']
}));

// 🚨 SÉCURITÉ STRIPE
app.use('/webhook', express.raw({ type: 'application/json' }));

app.use(express.json({ limit: '100mb' })); 
app.use(express.urlencoded({ extended: true, limit: '100mb' }));
app.use(express.static(path.join(__dirname)));

const cleanString = (str) => String(str || "").trim().toLowerCase();

app.get('/', (req, res) => { res.sendFile(path.join(__dirname, 'vitrine.html')); });

app.get('/panel-ichef', (req, res) => {
    if (req.query.pass === ADMIN_PASS) res.sendFile(path.join(__dirname, 'empire.html'));
    else res.status(403).send('🛑 Accès Refusé. Sécurité Empire iCHEF.');
});

// ==========================================
// BASE DE DONNÉES : MONGODB
// ==========================================
const mongoURI = process.env.MONGO_URI || "mongodb+srv://icheflavien_db_user:Tamere58.@cluster0.4w95d7m.mongodb.net/ichef_production?retryWrites=true&w=majority";
mongoose.connect(mongoURI).then(() => console.log('✅ Base de donnees iCHEF Online')).catch(err => console.error(err.message));

const tenantSchema = new mongoose.Schema({
    tenantID: { type: String, required: true, unique: true },
    clientName: String, email: String, phone: String,
    status: { type: String, enum: ['ACTIF', 'SUSPENDU'], default: 'ACTIF' },
    plan: { type: String, default: 'BUSINESS' },
    specialite: { type: String, default: 'cuisine' },
    pin: { type: String, default: '9999' }, 
    maxScreens: { type: Number, default: 5 }, maxStaff: { type: Number, default: 999 },
    registeredDevices: [String], config: { stripeCustomerId: String }, demoExpiration: { type: Date }
});
const Tenant = mongoose.model('Tenant', tenantSchema);

const AppState = mongoose.model('AppState', new mongoose.Schema({
    tenantID: { type: String, required: true, unique: true },
    activeOrders: { type: Object, default: {} }
}, { minimize: false }));

const auditLogSchema = new mongoose.Schema({
    tenantID: { type: String, required: true, index: true },
    timestamp: { type: Date, default: Date.now },
    action: { type: String, required: true },
    entityType: { type: String, required: true },
    entityId: { type: String, required: true },
    authorPin: { type: String, required: true },
    details: { type: Object },
    previousHash: { type: String, required: true },
    currentHash: { type: String, required: true }  
});
const AuditLog = mongoose.model('AuditLog', auditLogSchema);

async function scellerOperation(tenantID, action, entityType, entityId, authorPin, details) {
    try {
        const safeID = cleanString(tenantID);
        const lastLog = await AuditLog.findOne({ tenantID: safeID }).sort({ timestamp: -1 });
        const previousHash = lastLog ? lastLog.currentHash : 'GENESIS_BLOCK_0000000000000000';
        const dataString = JSON.stringify({ tenantID: safeID, action, entityType, entityId, authorPin, details, previousHash });
        const currentHash = crypto.createHash('sha256').update(dataString).digest('hex');

        await AuditLog.create({ tenantID: safeID, action, entityType, entityId, authorPin, details, previousHash, currentHash });
    } catch (error) { console.error("🚨 ERREUR SCELLÉ CRYPTO :", error); }
}

// ==========================================
// 🤖 MOTEURS IA GOOGLE GEMINI OFFICIELS (TEXTE + VISION)
// ==========================================
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'CLE_MANQUANTE');

app.post('/api/scan-invoice', async (req, res) => {
    const { imageBase64, mimeType } = req.body;
    if (!imageBase64) return res.status(400).json({ success: false, error: "Aucune image fournie." });
    try {
        const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
        const imagePart = { inlineData: { data: base64Data, mimeType: mimeType || "image/jpeg" } };
        const prompt = 'Analyse cette image de facture. Extrais les informations. RESPOND ONLY WITH JSON WITHOUT MARKDOWN TEXT: { "fournisseur": "Nom", "adresse": "Adresse", "telephone": "Tel", "email": "Email", "devise": "€", "date": "JJ/MM/AAAA", "totalHT": 0.00, "tva": 0.00, "totalTTC": 0.00, "articles": [{ "nom": "nom", "categorie": "catégorie", "quantite": "qty", "prixUnitaire": 0.00 }] }';
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent([prompt, imagePart]);
        let responseText = result.response.text().trim();
        responseText = responseText.replace(/```json/gi, "").replace(/```/g, "").trim();
        if (!responseText.startsWith("{")) responseText = responseText.substring(responseText.indexOf("{"));
        res.json({ success: true, data: JSON.parse(responseText) });
    } catch (error) { res.status(500).json({ success: false, error: "Erreur IA Image." }); }
});

app.post('/analyse-ticket', async (req, res) => {
    const { image, mimeType } = req.body;
    if (!image) return res.status(400).json({ success: false });
    try {
        const imagePart = { inlineData: { data: image, mimeType: mimeType || "image/jpeg" } };
        const prompt = 'Analyse cette étiquette de traçabilité. JSON NO MARKDOWN: { "nom": "Nom du produit", "lot": "Numéro", "dlc": "JJ/MM/AAAA" }';
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent([prompt, imagePart]);
        let text = result.response.text().trim().replace(/```json/gi, "").replace(/```/g, "").trim();
        res.json({ success: true, resultat: JSON.parse(text) });
    } catch (error) { res.status(500).json({ success: false }); }
});

app.post('/api/ai-executive-report', async (req, res) => {
    const { tenantID, currentStock, recentSales, financialStats } = req.body;
    try {
        let state = await AppState.findOne({ tenantID: cleanString(tenantID) });
        let history = state?.activeOrders?.TRAFFIC_HISTORY?.data || [];
        
        const prompt = `Tu es l'IA "Directeur Financier" d'iCHEF OS. Données : Ventes: ${JSON.stringify(recentSales || history.slice(0, 30))} | Stocks: ${JSON.stringify(currentStock || 'N/A')}
        RÉPONDS UNIQUEMENT AVEC LE JSON CI-DESSOUS. N'ÉCRIS RIEN D'AUTRE.
        { "previsionVentes": "Explication courte.", "alertesRupture": ["Alerte 1", "Alerte 2"], "commandesFournisseurs": [{ "fournisseur": "Nom", "articles": ["10kg Tomates"] }], "detectionAnomalies": "Explication courte.", "recommandationMenu": ["Plat X"], "analyseMarge": "Explication claire." }`;

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(prompt);
        let responseText = result.response.text().trim().replace(/```json/gi, "").replace(/```/g, "").trim();
        const firstBrace = responseText.indexOf('{');
        const lastBrace = responseText.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) responseText = responseText.substring(firstBrace, lastBrace + 1);

        res.json({ success: true, report: JSON.parse(responseText) });
    } catch (error) { res.status(500).json({ success: false, error: "Analyse indisponible." }); }
});

app.post('/api/voice-assistant', async (req, res) => {
    const { tenantID, spokenQuery } = req.body;
    try {
        let state = await AppState.findOne({ tenantID: cleanString(tenantID) });
        let activeStaff = state?.activeOrders?.STAFF_ACCESS?.data?.filter(s => s.onDuty).length || 0;

        const prompt = `Tu es iCHEF, assistant vocal. Le directeur demande: "${spokenQuery}". Staff actif: ${activeStaff}. Date: ${new Date().toLocaleString('fr-FR')}. Réponds comme Jarvis. JSON STRICT : { "vocalResponse": "Texte à dire", "actionToTrigger": "NONE" }`;

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(prompt);
        let responseText = result.response.text().trim().replace(/```json/gi, "").replace(/```/g, "").trim();
        if (!responseText.startsWith("{")) responseText = responseText.substring(responseText.indexOf("{"));
        
        res.json({ success: true, aiReply: JSON.parse(responseText) });
    } catch (error) { res.status(500).json({ success: false }); }
});

app.post('/api/smart-reservation', async (req, res) => {
    const { tenantID, customerRequest, availableTables } = req.body;
    try {
        const safeID = cleanString(tenantID);
        let state = await AppState.findOne({ tenantID: safeID });
        let activeCooks = state?.activeOrders?.STAFF_ACCESS?.data?.filter(s => s.dept === 'cuisine' && s.active).length || 1;

        const prompt = `Tu es Maître d'Hôtel iCHEF. Demande client: "${customerRequest}". Tables: ${JSON.stringify(availableTables)}. Cuisiniers actifs : ${activeCooks}. Règle : 1 cuisinier = 15 pax. JSON STRICT: { "acceptee": true/false, "pax": nombre, "heure": "HH:MM", "tableAllouee": "ID", "messageClient": "Texte", "optimisationInfo": "Notes" }`;

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(prompt);
        let responseText = result.response.text().trim().replace(/```json/gi, "").replace(/```/g, "").trim();
        if (!responseText.startsWith("{")) responseText = responseText.substring(responseText.indexOf("{"));
        
        const decision = JSON.parse(responseText);
        if (decision.acceptee && decision.tableAllouee) {
            const newResa = { id: 'resa_' + Date.now(), pax: decision.pax, heure: decision.heure, table: decision.tableAllouee, info: decision.optimisationInfo, timestamp: Date.now() };
            await AppState.findOneAndUpdate({ tenantID: safeID }, { $push: { "activeOrders.RESERVATIONS_MASTER.data": newResa } }, { upsert: true });
            await scellerOperation(safeID, 'CREATE', 'RESERVATION', newResa.id, 'IA_SYSTEM', newResa);
        }
        res.json({ success: true, decision });
    } catch (error) { res.status(500).json({ success: false }); }
});

app.post('/api/predict-hr-schedule', async (req, res) => {
    const { tenantID, staffList } = req.body;
    try {
        let state = await AppState.findOne({ tenantID: cleanString(tenantID) });
        let history = state?.activeOrders?.TRAFFIC_HISTORY?.data || [];
        if (history.length < 50) return res.json({ success: true, message: "L'IA a besoin d'au moins 50 services pour prédire." });

        let summary = history.map(h => `Jour:${h.dayOfWeek}-Heure:${h.hour}-Pax:${h.pax}`);
        const prompt = `Directeur RH IA. Historique: ${JSON.stringify(summary)}. Staff: ${JSON.stringify(staffList)}. JSON STRICT : { "rushPeriods": [], "deadPeriods": [], "hiringAdvice": "", "vacationSuggestions": "" }`;

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(prompt);
        let responseText = result.response.text().trim().replace(/```json/gi, "").replace(/```/g, "").trim();
        if (!responseText.startsWith("{")) responseText = responseText.substring(responseText.indexOf("{"));
        
        res.json({ success: true, prediction: JSON.parse(responseText) });
    } catch (error) { res.status(500).json({ success: false }); }
});

// =========================================================================
// 🥇 MOTEURS ANALYTIQUES INTERNES (MATHEMATIQUES)
// =========================================================================
app.post('/api/ai-profitability', async (req, res) => {
    try {
        const { tenantID } = req.body;
        if (!tenantID) return res.status(400).json({ success: false });
        const tenantData = global.tenantsData && global.tenantsData[tenantID] ? global.tenantsData[tenantID] : {};
        let allItems = [];
        Object.values(tenantData['MENU_MASTER']?.data || {}).forEach(a => allItems.push(...a));
        Object.values(tenantData['MENU_MASTER_BAR']?.data || {}).forEach(a => allItems.push(...a));

        if (allItems.length === 0) return res.json({ success: true, rentabilite: { topRentable: "N/A", pireRentable: "N/A", margeMoyenne: "0", recommandations: [] } });

        let plats = allItems.map(i => {
            let prix = parseFloat(i.price || 0); let cout = parseFloat(i.cost || 0) || prix * 0.3;
            return { name: i.name, prix, cout, marge: prix - cout, pourcentage: prix > 0 ? ((prix - cout) / prix) * 100 : 0 };
        }).filter(p => p.prix > 0).sort((a, b) => b.marge - a.marge);

        let topPlat = plats[0]; let pirePlat = plats[plats.length - 1];
        let margeMoyenne = (plats.reduce((s, p) => s + p.pourcentage, 0) / plats.length).toFixed(1);

        let recos = [];
        if (topPlat && pirePlat) {
            recos.push(`⭐ Suggérez : "${topPlat.name}" (${topPlat.marge.toFixed(2)}€ de marge).`);
            if (pirePlat.pourcentage < 55) recos.push(`📉 Alerte sur : "${pirePlat.name}". Marge trop faible.`);
        }
        res.json({ success: true, rentabilite: { topRentable: topPlat?.name || "N/A", pireRentable: pirePlat?.name || "N/A", margeMoyenne, recommandations: recos } });
    } catch (error) { res.status(500).json({ success: false }); }
});

app.post('/api/ai-reservation-forecast', async (req, res) => {
    try {
        const { tenantID } = req.body;
        const tenantData = global.tenantsData && global.tenantsData[tenantID] ? global.tenantsData[tenantID] : {};
        const reservations = tenantData['RESERVATIONS_MASTER']?.data || [];
        let couverts = 0; const todayStr = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];

        reservations.forEach(r => { if ((!r.date || r.date === todayStr) && !['cancelled', 'annulé'].includes(r.status)) couverts += parseInt(r.couverts || r.pax || 0); });

        let tendance = couverts > 40 ? "Rush" : (couverts > 15 ? "Soutenu" : "Calme");
        let staffSalle = Math.max(1, Math.ceil(couverts / 20)); let staffCuisine = Math.max(1, Math.ceil(couverts / 25));

        res.json({ success: true, forecast: { couverts, tendance, caEstime: (couverts * 32.50).toFixed(2), staffRecommande: `${staffSalle} salle, ${staffCuisine} cuisine`, alerteActive: couverts > 40, conseils: [] } });
    } catch (error) { res.status(500).json({ success: false }); }
});

app.post('/api/ai-business-pulse', async (req, res) => {
    try {
        const tenantData = global.tenantsData && global.tenantsData[req.body.tenantID] ? global.tenantsData[req.body.tenantID] : {};
        const archive = tenantData['FINANCIAL_HISTORY']?.data || [];
        res.json({ success: true, pulse: { previsionVentes: archive.length > 0 ? "Analyse en cours..." : "En attente.", analyseCA: "En cours...", analyseMarges: "En cours...", recommandations: [] } });
    } catch (error) { res.status(500).json({ success: false }); }
});

// =========================================================================
// ✉️ COMMUNICATIONS EXTERNES (NODEMAILER / TWILIO / STRIPE)
// =========================================================================
app.post('/api/twilio/request-demo', async (req, res) => {
    const { name, email, phone } = req.body;
    try {
        const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user: 'flavieniche@gmail.com', pass: 'atebfwhijmgmavcy' } });
        await transporter.sendMail({ from: 'flavieniche@gmail.com', to: 'iche.flavien@ichef.ch', subject: `🚨 iCHEF OS DEMO : ${name}`, text: `Demande de démo.\nNom: ${name}\nEmail: ${email}\nTel: ${phone}` });
        res.json({ success: true });
    } catch (error) { res.status(500).json({ success: false }); }
});

app.post('/api/twilio/call-me', async (req, res) => {
    const { phone } = req.body;
    try {
        const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user: 'flavieniche@gmail.com', pass: 'atebfwhijmgmavcy' } });
        await transporter.sendMail({ from: 'flavieniche@gmail.com', to: 'iche.flavien@ichef.ch', subject: '🚨 iCHEF OS RAPPEL', text: `Rappeler le : ${phone}` });
        res.json({ success: true });
    } catch (error) { res.status(500).json({ success: false }); }
});

app.post('/api/create-hold-intent', async (req, res) => {
    try {
        const { tenantID, guests, date, time } = req.body;
        const totalAmount = (parseInt(guests) || 1) * 5000; 
        const paymentIntent = await stripe.paymentIntents.create({ amount: totalAmount, currency: 'eur', payment_method_types: ['card'], capture_method: 'manual', metadata: { tenantID, type: 'ANTI_NO_SHOW', date, time, guests } });
        res.json({ success: true, clientSecret: paymentIntent.client_secret, holdAmount: totalAmount / 100 });
    } catch (error) { res.status(500).json({ success: false }); }
});

// ==========================================
// API RESTAURANT SYNCHRONISATION
// ==========================================
app.post('/api/save-transaction', async (req, res) => {
    const { tenantID, transaction } = req.body;
    if (!tenantID || !transaction) return res.status(400).json({ success: false });
    const safeID = cleanString(tenantID);
    try {
        let state = await AppState.findOne({ tenantID: safeID });
        if (!state) state = new AppState({ tenantID: safeID, activeOrders: {} });
        if (!state.activeOrders['FINANCIAL_HISTORY']) state.activeOrders['FINANCIAL_HISTORY'] = { data: [] };
        state.activeOrders['FINANCIAL_HISTORY'].data.unshift(transaction);
        state.markModified('activeOrders'); await state.save();
        await scellerOperation(safeID, 'CREATE', 'TRANSACTION', transaction.id || Date.now().toString(), 'SYSTEM', transaction);
        res.json({ success: true });
    } catch(e) { res.status(500).json({ success: false }); }
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
        if (!tenant || tenant.pin !== masterPin) return res.status(403).json({ success: false });
        tenant.email = email; tenant.phone = phone; await tenant.save();
        res.json({ success: true });
    } catch(e) { res.status(500).json({ success: false }); }
});

app.get('/api/check-license', async (req, res) => {
    try {
        const tenant = await Tenant.findOne({ tenantID: cleanString(req.query.tenantID) });
        if (!tenant) return res.status(404).json({ success: false });
        res.json({ success: true, status: tenant.status, plan: tenant.plan, specialite: tenant.specialite, addons: tenant.addons || [] });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.post('/api/verify-pin', async (req, res) => {
    const { tenantID, pin, deviceId } = req.body;
    try {
        const tenant = await Tenant.findOne({ tenantID: cleanString(tenantID) });
        if (!tenant) return res.status(404).json({ success: false, error: "Inconnu." });
        if (tenant.demoExpiration && new Date() > new Date(tenant.demoExpiration)) return res.status(403).json({ success: false, error: "Démo expirée (24h)." });
        if (tenant.status === 'SUSPENDU') return res.status(403).json({ success: false, error: "Licence suspendue." });

        let isValid = (String(tenant.pin).trim() === String(pin).trim());
        let roleAttribue = 'MASTER';

        if (!isValid) {
            const state = await AppState.findOne({ tenantID: tenant.tenantID });
            if (state?.activeOrders?.STAFF_ACCESS) {
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
            if (tenant?.demoExpiration && new Date() > new Date(tenant.demoExpiration)) return res.status(403).json({ error: "Démo expirée." });
            if (tenant?.status === 'SUSPENDU') return res.status(403).json({ error: "Licence suspendue." });
        }
        let state = await AppState.findOne({ tenantID });
        if (!state) state = await AppState.create({ tenantID, activeOrders: {} });
        
        if (state.activeOrders?.STAFF_ACCESS && state.activeOrders['TIMESHEETS_MASTER']) {
            const today = new Date();
            const monthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
            const monthData = state.activeOrders['TIMESHEETS_MASTER'].data?.[monthStr] || {};
            let stateModified = false;

            (state.activeOrders['STAFF_ACCESS'].data || []).forEach(staff => {
                let totalHoursDone = 0;
                for (let d = 1; d <= 31; d++) { if (monthData[staff.id]?.[d]) totalHoursDone += calculateNet(monthData[staff.id][d]); }
                let formatted = parseFloat(totalHoursDone.toFixed(1));
                if (staff.workedHours !== formatted) { staff.workedHours = formatted; stateModified = true; }
            });
            if (stateModified) { state.markModified('activeOrders'); await state.save(); }
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
        const { tableId, order, pin } = req.body;
        let actionType = 'UPDATE'; let query;

        if (order === null || order === 'DELETE') {
            actionType = 'DELETE_SOFT';
            query = { $set: { [`activeOrders.${tableId}.isArchived`]: true, [`activeOrders.${tableId}.status`]: 'ANNULÉ' } };
        } else {
            query = { $set: { [`activeOrders.${tableId}`]: order } };
        }

        const newState = await AppState.findOneAndUpdate({ tenantID }, query, { upsert: true, new: true });
        if (tenantID !== 'MASTER_STATE' && tableId) await scellerOperation(tenantID, actionType, tableId.includes('STAFF') ? 'RH' : 'COMMANDE', tableId, pin || 'SYSTEM', order || 'DELETED');
        io.to(tenantID).emit('updateState', newState);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Save Error" }); }
});

// =========================================================================
// 💎 SÉCURITÉ FISCALE ET CERTIFICAT DE PREUVES LEGALES
// =========================================================================
app.get('/api/export-preuves-legales', async (req, res) => {
    const { tenantID, masterPin } = req.query; const safeID = cleanString(tenantID);
    try {
        const tenant = await Tenant.findOne({ tenantID: safeID });
        if (!tenant || tenant.pin !== masterPin) return res.status(403).json({ error: "PIN invalide." });
        const logs = await AuditLog.find({ tenantID: safeID }).sort({ timestamp: 1 });
        let isChainValid = true;
        for (let i = 1; i < logs.length; i++) { if (logs[i].previousHash !== logs[i-1].currentHash) { isChainValid = false; break; } }
        res.json({ success: true, certificatLegal: { etablissement: tenant.clientName, dateExtraction: new Date(), integriteGarantie: isChainValid, totalOperations: logs.length }, journal: logs });
    } catch (error) { res.status(500).json({ error: "Erreur export." }); }
});

// ==========================================
// 🎯 PORTAIL ET WORKFLOW DE SÉCURISATION DES LEADS
// ==========================================
app.post('/api/nouvelle-demande-demo', async (req, res) => {
    try {
        const { tenantID, restaurant, email, phone } = req.body;
        const codePinAlea = Math.floor(1000 + Math.random() * 9000).toString();
        const safeID = cleanString(tenantID);

        await Tenant.create({ tenantID: safeID, clientName: restaurant, email, phone, status: 'SUSPENDU', plan: 'EMPIRE', pin: codePinAlea, maxScreens: 5, maxStaff: 999, registeredDevices: [], demoExpiration: new Date(Date.now() + 24 * 60 * 60 * 1000) });
        await AppState.create({ tenantID: safeID, activeOrders: {} });

        if (twilioClient) {
            try {
                await twilioClient.messages.create({ body: `🔥 NOUVEAU PARTENAIRE INTERNE : ${restaurant}\n📞 Tél: ${phone}\n🆔 ID: ${tenantID}`, from: process.env.TWILIO_PHONE_NUMBER, to: '+330641437265' });
                await twilioClient.messages.create({ body: `✨ Bienvenue chez iCHEF OS, ${restaurant} !\n🆔 ID : ${tenantID}\n🔒 Code PIN : ${codePinAlea}\nContact sous 24h.`, from: process.env.TWILIO_PHONE_NUMBER, to: phone });
            } catch (twilioErr) { console.error(twilioErr.message); }
        }
        res.json({ success: true, message: "Lead enregistré et workflows Twilio déclenchés." });
    } catch (e) { res.status(500).json({ success: false, error: "Identifiant déjà existant." }); }
});

// ==========================================
// WEBHOOK DE PAIEMENT SÉCURISÉ STRIPE
// ==========================================
app.post('/webhook', async (req, res) => {
    const sig = req.headers['stripe-signature']; let event;
    try { event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET); } catch (err) { return res.status(400).send(`Webhook Error: ${err.message}`); }
    
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        if (session.metadata?.type === 'UPGRADE_SCREENS') {
            await Tenant.updateOne({ tenantID: cleanString(session.metadata.tenantID) }, { $inc: { maxScreens: parseInt(session.metadata.extraScreens) } });
        } else {
            const safeID = cleanString(session.client_reference_id || "client_" + Date.now());
            await Tenant.updateOne({ tenantID: safeID }, { $set: { status: 'ACTIF', plan: session.metadata?.plan?.toUpperCase() || "BUSINESS" }, $unset: { demoExpiration: "" } }, { upsert: true });
        }
    }
    res.json({ received: true });
});

// ==========================================
// MASTER CONTROL API (EMPIRE SUPER ADMIN)
// ==========================================
app.post('/api/get-all-tenants-admin', async (req, res) => {
    if (req.body.masterKey !== ADMIN_PASS) return res.status(401).json({ success: false });
    try {
        const tenants = await Tenant.find({});
        res.json({ success: true, tenants: tenants.map(t => ({ id: t.tenantID, name: t.clientName, email: t.email, phone: t.phone, pack: t.plan, status: t.status })) });
    } catch(err) { res.status(500).json({ success: false }); }
});

app.post('/api/admin-action', async (req, res) => {
    if (req.body.masterKey !== ADMIN_PASS) return res.status(401).json({ success: false });
    try {
        const { tenantID, action, newPlan, addons } = req.body; const safeID = cleanString(tenantID);
        if (action === 'suspend') await Tenant.findOneAndUpdate({ tenantID: safeID }, { status: 'SUSPENDU', registeredDevices: [] });
        if (action === 'activate') await Tenant.findOneAndUpdate({ tenantID: safeID }, { status: 'ACTIF', $unset: { demoExpiration: "" } });
        if (action === 'set_plan') await Tenant.findOneAndUpdate({ tenantID: safeID }, { plan: newPlan.toUpperCase() });
        if (action === 'set_addons') await Tenant.findOneAndUpdate({ tenantID: safeID }, { addons: addons });
        if (action === 'delete') { await Tenant.findOneAndDelete({ tenantID: safeID }); await AppState.findOneAndDelete({ tenantID: safeID }); }
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false }); }
});

app.get('/debug-fichiers', (req, res) => {
    require('fs').readdir(__dirname, (err, files) => { if (err) return res.status(500).json({ error: true }); res.json({ fichiers_trouves: files }); });
});

// ==========================================
// 🌟 GESTION DES WEBSOCKETS TIME-SYNC EN SALLE
// ==========================================
io.on('connection', (socket) => {
    socket.on('joinTenant', (tenantID) => { socket.join(cleanString(tenantID)); });
});

// ==========================================
// INITIALISATION DU COMPTE DÉMO & ÉCOUTE
// ==========================================
async function creerCompteDemo() {
    try { if (!(await Tenant.findOne({ tenantID: 'demo' }))) await Tenant.create({ tenantID: 'demo', clientName: 'Restaurant iCHEF Démo', status: 'ACTIF', plan: 'EMPIRE', pin: '0000', maxScreens: 50, maxStaff: 999 }); } catch (e) {}
}
creerCompteDemo();

server.listen(PORT, () => {
    console.log("✅ L'Empire iCHEF est en ligne, Socket.io activé, sécurisé sur le port " + PORT);
});
