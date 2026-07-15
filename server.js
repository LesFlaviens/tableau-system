const nodemailer = require('nodemailer');
/**
 * ==============================================================
 * 🧠 iCHEF EMPIRE OS — ENGINE SERVER BACKEND (V. FORTERESSE)
 * ==============================================================
 * VERSION DÉFINITIVE : Sans doublons, SDK à jour, JSON blindé.
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto'); // 🛡️ INTÉGRATION SÉCURITÉ CRYPTO
const mongoose = require('mongoose');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const twilio = require('twilio'); // 📡 INTÉGRATION TWILIO

// 🔥 WEBSOCKETS POUR LE TEMPS RÉEL 🔥
const http = require('http');
const { Server } = require('socket.io');

// ==========================================
// CONFIGURATIONS (Stripe & Twilio)
// ==========================================
const stripeKey = process.env.STRIPE_SECRET_KEY || 'sk_test_51TN80JQ9Dw3nOfA4I3XTxPl5FR4ddYmU9Jw2pGmfa0eABz2P6wAzK8RMzHw2XilulLXxFmY2oEDgau4TcScOf9WK00ajIEuweB'; 
const stripe = require('stripe')(stripeKey);

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

const PORT = process.env.PORT || 10000;
const ADMIN_PASS = process.env.ADMIN_PASS || 'Empire2026';

app.use(cors({
    origin: function (origin, callback) { callback(null, true); },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept', 'X-CSRF-Token', 'X-iCHEF-Device', 'X-iCHEF-Master-Device', 'X-iCHEF-Tenant', 'Idempotency-Key']
}));

// 🚨 SÉCURITÉ STRIPE : raw() uniquement pour la route webhook
app.use('/webhook', express.raw({ type: 'application/json' }));

app.use(express.json({ limit: '100mb' })); 
app.use(express.urlencoded({ extended: true, limit: '100mb' }));
app.use(express.static(path.join(__dirname)));
app.use(express.static(__dirname));

const cleanString = (str) => String(str || "").trim().toLowerCase();

app.get('/', (req, res) => { res.sendFile(path.join(__dirname, 'vitrine.html')); });
app.get('/panel-ichef', (req, res) => {
    if (req.query.pass === ADMIN_PASS) { res.sendFile(path.join(__dirname, 'empire.html')); } 
    else { res.status(403).send('🛑 Accès Refusé. Sécurité Empire iCHEF.'); }
});

// ==========================================
// OUTILS DE CALCUL TEMPS RH
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
// BASE DE DONNÉES : MONGODB
// ==========================================
const mongoURI = process.env.MONGO_URI || "mongodb+srv://icheflavien_db_user:Tamere58.@cluster0.4w95d7m.mongodb.net/ichef_production?retryWrites=true&w=majority";
mongoose.connect(mongoURI).then(() => console.log('✅ Base de donnees iCHEF Online')).catch(err => console.error(err.message));

const tenantSchema = new mongoose.Schema({
    tenantID: { type: String, required: true, unique: true }, clientName: String, email: String, phone: String,
    status: { type: String, enum: ['ACTIF', 'SUSPENDU'], default: 'ACTIF' }, plan: { type: String, default: 'BUSINESS' }, specialite: { type: String, default: 'cuisine' },
    pin: { type: String, default: '9999' }, maxScreens: { type: Number, default: 5 }, maxStaff: { type: Number, default: 999 },
    registeredDevices: [String], config: { stripeCustomerId: String }, demoExpiration: { type: Date }
});
const Tenant = mongoose.model('Tenant', tenantSchema);

const AppState = mongoose.model('AppState', new mongoose.Schema({ tenantID: { type: String, required: true, unique: true }, activeOrders: { type: Object, default: {} } }, { minimize: false }));

const auditLogSchema = new mongoose.Schema({ tenantID: { type: String, required: true, index: true }, timestamp: { type: Date, default: Date.now }, action: { type: String, required: true }, entityType: { type: String, required: true }, entityId: { type: String, required: true }, authorPin: { type: String, required: true }, details: { type: Object }, previousHash: { type: String, required: true }, currentHash: { type: String, required: true } });
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
// 🤖 MOTEURS IA (GEMINI SDK OFFICIEL) + NETTOYAGE JSON ROBUSTE
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
        
        let responseText = result.response.text();
        responseText = responseText.replace(/```json/gi, "").replace(/```/g, "").trim();
        const firstBrace = responseText.indexOf('{'); const lastBrace = responseText.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace >= firstBrace) responseText = responseText.substring(firstBrace, lastBrace + 1);
        
        res.json({ success: true, data: JSON.parse(responseText) });
    } catch (error) { res.status(500).json({ success: false, error: "Erreur IA Image." }); }
});

app.post('/analyse-ticket', async (req, res) => {
    const { image, mimeType } = req.body;
    if (!image) return res.status(400).json({ success: false, error: "Image manquante" });
    try {
        const imagePart = { inlineData: { data: image, mimeType: mimeType || "image/jpeg" } };
        const prompt = 'Analyse cette étiquette de traçabilité. JSON NO MARKDOWN: { "nom": "Nom du produit", "lot": "Numéro", "dlc": "JJ/MM/AAAA" }';
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent([prompt, imagePart]);
        
        let responseText = result.response.text();
        responseText = responseText.replace(/```json/gi, "").replace(/```/g, "").trim();
        const firstBrace = responseText.indexOf('{'); const lastBrace = responseText.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace >= firstBrace) responseText = responseText.substring(firstBrace, lastBrace + 1);
        
        res.json({ success: true, resultat: JSON.parse(responseText) });
    } catch (error) { res.status(500).json({ success: false }); }
});

app.post('/api/ai-executive-report', async (req, res) => {
    const { tenantID, currentStock, recentSales, financialStats } = req.body;
    try {
        let state = await AppState.findOne({ tenantID: cleanString(tenantID) });
        let history = state?.activeOrders?.TRAFFIC_HISTORY?.data || [];
        
        const prompt = `Tu es l'IA "Directeur Financier et Supply Chain" d'iCHEF OS.
        Données : Ventes: ${JSON.stringify(recentSales || history.slice(0, 30))} | Stocks: ${JSON.stringify(currentStock || 'N/A')}
        RÉPONDS UNIQUEMENT AVEC CE JSON STRICT (SANS AUCUN TEXTE AUTOUR, PAS DE BALISE) :
        { "previsionVentes": "Explication courte.", "alertesRupture": ["Produit A", "Produit B"], "commandesFournisseurs": [ { "fournisseur": "Nom", "articles": ["10kg Tomates"] } ], "detectionAnomalies": "Explication courte.", "recommandationMenu": ["Plat X"], "analyseMarge": "Explication claire." }`;

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(prompt);
        let responseText = result.response.text();
        
        responseText = responseText.replace(/```json/gi, "").replace(/```/g, "").trim();
        const firstBrace = responseText.indexOf('{'); const lastBrace = responseText.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace >= firstBrace) {
            responseText = responseText.substring(firstBrace, lastBrace + 1);
        } else {
             throw new Error("L'IA n'a pas renvoyé de JSON détectable.");
        }
        res.json({ success: true, report: JSON.parse(responseText) });
    } catch (error) {
        console.error("🚨 Erreur IA Executive Report:", error);
        res.status(500).json({ success: false, error: "Analyse momentanément indisponible.", details: error.message });
    }
});

app.post('/api/voice-assistant', async (req, res) => {
    const { tenantID, spokenQuery } = req.body;
    try {
        let state = await AppState.findOne({ tenantID: cleanString(tenantID) });
        let activeStaff = state?.activeOrders?.STAFF_ACCESS?.data?.filter(s => s.onDuty).length || 0;

        const prompt = `Tu es l'assistant vocal privé du directeur du restaurant intégré à iCHEF OS. Tu t'appelles iCHEF. Le directeur demande : "${spokenQuery}". Contexte: ${activeStaff} employés actifs. Date: ${new Date().toLocaleString('fr-FR')}. Style Jarvis. JSON RÉPONSE ATTENDUE SANS MARKDOWN : { "vocalResponse": "Texte exact", "actionToTrigger": "NONE" }`;

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(prompt);
        let responseText = result.response.text();
        
        responseText = responseText.replace(/```json/gi, "").replace(/```/g, "").trim();
        const firstBrace = responseText.indexOf('{'); const lastBrace = responseText.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace >= firstBrace) responseText = responseText.substring(firstBrace, lastBrace + 1);
        
        res.json({ success: true, aiReply: JSON.parse(responseText) });
    } catch (error) { res.status(500).json({ success: false, error: "Connexion vocale perdue." }); }
});

app.post('/api/smart-reservation', async (req, res) => {
    const { tenantID, customerRequest, availableTables } = req.body;
    try {
        const safeID = cleanString(tenantID);
        let state = await AppState.findOne({ tenantID: safeID });
        let activeCooks = state?.activeOrders?.STAFF_ACCESS?.data?.filter(s => s.dept === 'cuisine' && s.active).length || 1;

        const prompt = `Tu es l'IA iCHEF, le Maître d'Hôtel d'élite. Demande: "${customerRequest}". Tables: ${JSON.stringify(availableTables)}. Cuisiniers en poste: ${activeCooks}. Règle : 1 cuisinier = 15 couverts. Refuse ou Time-shift si besoin. RÉPONDS UNIQUEMENT AVEC CE JSON STRICT : { "acceptee": true/false, "pax": nombre, "heure": "HH:MM", "tableAllouee": "ID_TABLE_OU_VIDE", "messageClient": "Votre réponse", "optimisationInfo": "Notes" }`;

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(prompt);
        let responseText = result.response.text();
        
        responseText = responseText.replace(/```json/gi, "").replace(/```/g, "").trim();
        const firstBrace = responseText.indexOf('{'); const lastBrace = responseText.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace >= firstBrace) responseText = responseText.substring(firstBrace, lastBrace + 1);
        
        const decision = JSON.parse(responseText);
        if (decision.acceptee && decision.tableAllouee) {
            const newResa = { id: 'resa_' + Date.now(), pax: decision.pax, heure: decision.heure, table: decision.tableAllouee, info: decision.optimisationInfo, timestamp: Date.now() };
            await AppState.findOneAndUpdate({ tenantID: safeID }, { $push: { "activeOrders.RESERVATIONS_MASTER.data": newResa } }, { upsert: true });
            await scellerOperation(safeID, 'CREATE', 'RESERVATION', newResa.id, 'IA_SYSTEM', newResa);
        }
        res.json({ success: true, decision });
    } catch (error) { res.status(500).json({ success: false, error: "L'IA du Maître d'Hôtel est indisponible." }); }
});

app.post('/api/predict-hr-schedule', async (req, res) => {
    const { tenantID, staffList } = req.body;
    try {
        let state = await AppState.findOne({ tenantID: cleanString(tenantID) });
        let history = state?.activeOrders?.TRAFFIC_HISTORY?.data || [];
        if (history.length < 50) return res.json({ success: true, message: "L'IA a besoin d'au moins 50 historiques pour établir une prédiction fiable." });

        let summary = history.map(h => `Jour:${h.dayOfWeek}-Heure:${h.hour}-Pax:${h.pax}`);
        const prompt = `Directeur des Ressources Humaines IA. Historique: ${JSON.stringify(summary)}. Staff: ${JSON.stringify(staffList)}. JSON STRICT (SANS MARKDOWN): { "rushPeriods": ["Jeudi 20h"], "deadPeriods": [], "hiringAdvice": "", "vacationSuggestions": "" }`;

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(prompt);
        let responseText = result.response.text();
        
        responseText = responseText.replace(/```json/gi, "").replace(/```/g, "").trim();
        const firstBrace = responseText.indexOf('{'); const lastBrace = responseText.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace >= firstBrace) responseText = responseText.substring(firstBrace, lastBrace + 1);
        
        res.json({ success: true, prediction: JSON.parse(responseText) });
    } catch (error) { res.status(500).json({ success: false, error: "Erreur prédiction IA." }); }
});

// =========================================================================
// 🥇 MOTEURS ANALYTIQUES INTERNES
// =========================================================================
app.post('/api/ai-profitability', async (req, res) => {
    try {
        const { tenantID } = req.body;
        if (!tenantID) return res.status(400).json({ success: false, error: "ID manquant" });

        const tenantData = global.tenantsData && global.tenantsData[tenantID] ? global.tenantsData[tenantID] : {};
        let allItems = [];
        Object.values(tenantData['MENU_MASTER']?.data || {}).forEach(arr => allItems.push(...arr));
        Object.values(tenantData['MENU_MASTER_BAR']?.data || {}).forEach(arr => allItems.push(...arr));

        if (allItems.length === 0) return res.json({ success: true, rentabilite: { topRentable: "N/A", pireRentable: "N/A", margeMoyenne: "0", recommandations: ["Ajoutez des plats."] } });

        const estimateCost = (name, price) => {
            const txt = name.toLowerCase();
            if (/vin|champagne|cocktail|bi[eè]re/.test(txt)) return price * 0.25; 
            if (/dessert|patisserie|café/.test(txt)) return price * 0.28;
            if (/plat|burger|viande|poisson/.test(txt)) return price * 0.35; 
            if (/pizza|pâte|pasta/.test(txt)) return price * 0.20; 
            return price * 0.30;
        };

        let platsAvecMarge = allItems.map(item => {
            let prix = parseFloat(item.price || 0); let cout = parseFloat(item.cost || 0) || estimateCost(item.name, prix);
            return { name: item.name, prix, cout, marge: prix - cout, pourcentage: prix > 0 ? ((prix - cout) / prix) * 100 : 0 };
        }).filter(p => p.prix > 0).sort((a, b) => b.marge - a.marge);

        let topPlat = platsAvecMarge[0]; let pirePlat = platsAvecMarge[platsAvecMarge.length - 1];
        let margeMoyenne = (platsAvecMarge.reduce((sum, p) => sum + p.pourcentage, 0) / platsAvecMarge.length).toFixed(1);

        let recommandations = [];
        if (topPlat && pirePlat) {
            recommandations.push(`⭐ Le plat "${topPlat.name}" rapporte ${topPlat.marge.toFixed(2)} de marge. À suggérer !`);
            if (pirePlat.pourcentage < 55) recommandations.push(`📉 Alerte Food-Cost : "${pirePlat.name}" coûte trop cher.`);
            if (margeMoyenne < 70) recommandations.push(`📦 Marge moyenne à ${margeMoyenne}%. Négociez avec vos fournisseurs.`);
            else recommandations.push(`💰 Excellente gestion, marge de ${margeMoyenne}%.`);
        }
        res.json({ success: true, rentabilite: { topRentable: topPlat?.name || "N/A", pireRentable: pirePlat?.name || "N/A", margeMoyenne, recommandations } });
    } catch (error) { res.status(500).json({ success: false }); }
});

app.post('/api/ai-reservation-forecast', async (req, res) => {
    try {
        const tenantData = global.tenantsData && global.tenantsData[req.body.tenantID] ? global.tenantsData[req.body.tenantID] : {};
        const reservations = tenantData['RESERVATIONS_MASTER']?.data || [];
        let couvertsAujourdhui = 0; const todayStr = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];

        reservations.forEach(res => { if ((!res.date || res.date === todayStr) && !['cancelled', 'annulé'].includes(res.status)) couvertsAujourdhui += parseInt(res.couverts || res.pax || 0); });

        let tendance = couvertsAujourdhui > 40 ? "Très Intense (Rush)" : (couvertsAujourdhui > 15 ? "Soutenu" : "Calme");
        let staffSalle = Math.max(1, Math.ceil(couvertsAujourdhui / 20)); let staffCuisine = Math.max(1, Math.ceil(couvertsAujourdhui / 25));

        res.json({ success: true, forecast: { couverts: couvertsAujourdhui, tendance, caEstime: (couvertsAujourdhui * 32.50).toFixed(2), staffRecommande: `${staffSalle} salle, ${staffCuisine} cuisine`, alerteActive: couvertsAujourdhui > 40, conseils: [] } });
    } catch (error) { res.status(500).json({ success: false }); }
});

app.post('/api/ai-business-pulse', async (req, res) => {
    try {
        const tenantData = global.tenantsData && global.tenantsData[req.body.tenantID] ? global.tenantsData[req.body.tenantID] : {};
        const archiveCaisse = tenantData['FINANCIAL_HISTORY']?.data || [];
        if (!archiveCaisse || archiveCaisse.length === 0) {
            res.json({ success: true, pulse: { previsionVentes: "En attente...", analyseCA: "En attente de transactions.", analyseMarges: "Non calculé", recommandations: ["Faites vos premières ventes."] } });
        } else {
            res.json({ success: true, pulse: { previsionVentes: "Analyse en cours...", analyseCA: "Calcul...", analyseMarges: "Analyse food-cost...", recommandations: [] } });
        }
    } catch (error) { res.status(500).json({ success: false }); }
});

// =========================================================================
// ✉️ DEMANDES DE CONTACT / TWILIO
// =========================================================================
app.post('/api/twilio/request-demo', async (req, res) => {
    const { name, email, phone } = req.body;
    try {
        const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user: 'flavieniche@gmail.com', pass: 'atebfwhijmgmavcy' } });
        await transporter.sendMail({ from: 'flavieniche@gmail.com', to: 'iche.flavien@ichef.ch', subject: `🚨 iCHEF OS DEMO : ${name}`, text: `Établissement: ${name}\nEmail: ${email}\nTel: ${phone}` });
        res.json({ success: true });
    } catch (error) { res.status(500).json({ success: false }); }
});

app.post('/api/twilio/call-me', async (req, res) => {
    const { phone } = req.body;
    try {
        const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user: 'flavieniche@gmail.com', pass: 'atebfwhijmgmavcy' } });
        await transporter.sendMail({ from: 'flavieniche@gmail.com', to: 'iche.flavien@ichef.ch', subject: '🚨 RAPPEL URGENT', text: `Numéro: ${phone}` });
        res.json({ success: true });
    } catch (error) { res.status(500).json({ success: false }); }
});

app.post('/api/nouvelle-demande-demo', async (req, res) => {
    try {
        const { tenantID, restaurant, email, phone } = req.body;
        const codePinAlea = Math.floor(1000 + Math.random() * 9000).toString();
        const safeID = cleanString(tenantID);

        await Tenant.create({ tenantID: safeID, clientName: restaurant, email, phone, status: 'SUSPENDU', plan: 'EMPIRE', specialite: 'cuisine', pin: codePinAlea, maxScreens: 5, maxStaff: 999, registeredDevices: [], demoExpiration: new Date(Date.now() + 24 * 60 * 60 * 1000) });
        await AppState.create({ tenantID: safeID, activeOrders: {} });

        if (twilioClient) {
            try {
                await twilioClient.messages.create({ body: `🔥 NOUVEAU PARTENAIRE : ${restaurant}\n📞 Tél: ${phone}\n🆔 ID: ${tenantID}`, from: process.env.TWILIO_PHONE_NUMBER, to: '+330641437265' });
                await twilioClient.messages.create({ body: `✨ Bienvenue chez iCHEF OS, ${restaurant} !\n🆔 ID : ${tenantID}\n🔒 Code PIN : ${codePinAlea}\nContact sous 24h.`, from: process.env.TWILIO_PHONE_NUMBER, to: phone });
            } catch (err) {}
        }
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

// ==========================================
// ANTI NO-SHOW & BIG DATA
// ==========================================
app.post('/api/create-hold-intent', async (req, res) => {
    try {
        const { tenantID, guests, date, time } = req.body;
        const totalAmount = (parseInt(guests) || 1) * 50 * 100;
        const paymentIntent = await stripe.paymentIntents.create({ amount: totalAmount, currency: 'eur', payment_method_types: ['card'], capture_method: 'manual', metadata: { tenantID, type: 'ANTI_NO_SHOW', date, time, guests } });
        res.json({ success: true, clientSecret: paymentIntent.client_secret, holdAmount: totalAmount / 100 });
    } catch (error) { res.status(500).json({ success: false }); }
});

app.post('/api/log-traffic-history', async (req, res) => {
    const { tenantID, pax, totalAmount } = req.body;
    if (!tenantID || !pax) return res.status(400).json({ success: false });
    const now = new Date();
    const trafficData = { id: 'traf_' + Date.now(), timestamp: now.getTime(), dateStr: now.toISOString().split('T')[0], dayOfWeek: now.getDay(), hour: now.getHours(), month: now.getMonth(), pax: parseInt(pax), revenue: parseFloat(totalAmount || 0) };
    try {
        await AppState.findOneAndUpdate({ tenantID: cleanString(tenantID) }, { $push: { "activeOrders.TRAFFIC_HISTORY.data": trafficData } }, { upsert: true });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

// ==========================================
// SYNCHRONISATION API & GESTION TENANTS
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
        res.json(tenant ? { success: true, contact: { email: tenant.email, phone: tenant.phone } } : { success: false });
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
        res.json({ success: true, status: tenant.status, plan: tenant.plan, specialite: tenant.specialite });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.post('/api/verify-pin', async (req, res) => {
    const { tenantID, pin, deviceId } = req.body;
    try {
        const tenant = await Tenant.findOne({ tenantID: cleanString(tenantID) });
        if (!tenant) return res.status(404).json({ success: false });
        if (tenant.demoExpiration && new Date() > new Date(tenant.demoExpiration)) return res.status(403).json({ success: false, error: "Démonstration expirée." });
        if (tenant.status === 'SUSPENDU') return res.status(403).json({ success: false, error: "Licence suspendue." });

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
        res.status(401).json({ success: false });
    } catch (error) { res.status(500).json({ success: false }); }
});

app.post(['/api/update-pin', '/api/update-master-pin'], async (req, res) => {
    try { await Tenant.findOneAndUpdate({ tenantID: cleanString(req.body.tenantID) }, { pin: req.body.newPin, registeredDevices: [] }); res.json({ success: true }); } 
    catch (error) { res.status(500).json({ success: false }); }
});

app.get(['/api/check-device', '/api/dashboard-info'], async (req, res) => {
    try {
        const tenant = await Tenant.findOne({ tenantID: cleanString(req.query.tenantID) });
        if (!tenant) return res.status(404).json({ success: false });
        res.json({ success: true, activeCount: tenant.registeredDevices.length, activeDevices: tenant.registeredDevices.length, maxScreens: tenant.maxScreens });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.post(['/api/kill-switch', '/api/admin-reset-devices'], async (req, res) => {
    try { await Tenant.findOneAndUpdate({ tenantID: cleanString(req.body.tenantID) }, { registeredDevices: [] }); res.json({ success: true }); } 
    catch (e) { res.status(500).json({ success: false }); }
});

app.get('/get-current-state', async (req, res) => {
    try {
        let tenantID = req.query.tenantID || 'MASTER_STATE';
        if (tenantID !== 'MASTER_STATE') {
            tenantID = cleanString(tenantID);
            const tenant = await Tenant.findOne({ tenantID });
            if (tenant && tenant.demoExpiration && new Date() > new Date(tenant.demoExpiration)) return res.status(403).json({ error: "Démo expirée." });
            if (tenant && tenant.status === 'SUSPENDU') return res.status(403).json({ error: "Licence suspendue." });
        }
        let state = await AppState.findOne({ tenantID });
        if (!state) state = await AppState.create({ tenantID, activeOrders: {} });
        
        if (state.activeOrders && state.activeOrders['STAFF_ACCESS'] && state.activeOrders['TIMESHEETS_MASTER']) {
            const today = new Date(); const monthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
            const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
            const staffList = state.activeOrders['STAFF_ACCESS'].data || [];
            const monthData = state.activeOrders['TIMESHEETS_MASTER'].data?.[monthStr] || {};
            let stateModified = false;

            staffList.forEach(staff => {
                let totalHoursDone = 0;
                for (let d = 1; d <= daysInMonth; d++) { if (monthData[staff.id] && monthData[staff.id][d]) totalHoursDone += calculateNet(monthData[staff.id][d]); }
                const formattedHours = parseFloat(totalHoursDone.toFixed(1));
                if (staff.workedHours !== formattedHours) { staff.workedHours = formattedHours; stateModified = true; }
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
        const authorPin = pin || 'SYSTEM';

        let actionType = 'UPDATE';
        let updateQuery = (order === null || order === 'DELETE') 
            ? (actionType = 'DELETE_SOFT', { $set: { [`activeOrders.${tableId}.isArchived`]: true, [`activeOrders.${tableId}.status`]: 'ANNULÉ' } })
            : { $set: { [`activeOrders.${tableId}`]: order } };

        const newState = await AppState.findOneAndUpdate({ tenantID }, updateQuery, { upsert: true, new: true });
        if (tenantID !== 'MASTER_STATE' && tableId) await scellerOperation(tenantID, actionType, tableId.includes('STAFF') ? 'RH' : 'COMMANDE', tableId, authorPin, order || 'DELETED');
        io.to(tenantID).emit('updateState', newState);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Save Error" }); }
});

app.get('/api/export-preuves-legales', async (req, res) => {
    const { tenantID, masterPin } = req.query;
    try {
        const safeID = cleanString(tenantID);
        const tenant = await Tenant.findOne({ tenantID: safeID });
        if (!tenant || tenant.pin !== masterPin) return res.status(403).json({ error: "Accès refusé." });
        const logs = await AuditLog.find({ tenantID: safeID }).sort({ timestamp: 1 });
        let isChainValid = true; let brokenAtIndex = null;
        for (let i = 1; i < logs.length; i++) { if (logs[i].previousHash !== logs[i-1].currentHash) { isChainValid = false; brokenAtIndex = i; break; } }
        res.json({ success: true, certificatLegal: { etablissement: tenant.clientName, dateExtraction: new Date(), integriteGarantie: isChainValid, alerteFalsification: isChainValid ? "Aucune" : `Brisée index ${brokenAtIndex}`, totalOperations: logs.length }, journal: logs });
    } catch (error) { res.status(500).json({ error: "Erreur audit." }); }
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
        const { tenantID, action, newPlan } = req.body; const safeID = cleanString(tenantID);
        if (action === 'suspend') await Tenant.findOneAndUpdate({ tenantID: safeID }, { status: 'SUSPENDU', registeredDevices: [] });
        else if (action === 'activate') await Tenant.findOneAndUpdate({ tenantID: safeID }, { status: 'ACTIF', $unset: { demoExpiration: "" } });
        else if (action === 'set_plan') await Tenant.findOneAndUpdate({ tenantID: safeID }, { plan: newPlan.toUpperCase() });
        else if (action === 'reset_devices') await Tenant.findOneAndUpdate({ tenantID: safeID }, { registeredDevices: [] });
        else if (action === 'delete') { await Tenant.findOneAndDelete({ tenantID: safeID }); await AppState.findOneAndDelete({ tenantID: safeID }); }
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false }); }
});

// ==========================================
// OUTIL DIAGNOSTIC & COMPTE DÉMO & WEBSOCKETS
// ==========================================
app.get('/debug-fichiers', (req, res) => {
    require('fs').readdir(__dirname, (err, files) => { res.json({ fichiers_trouves: files }); });
});

io.on('connection', (socket) => {
    socket.on('joinTenant', (tenantID) => { socket.join(cleanString(tenantID)); });
});

async function creerCompteDemo() {
    try {
        if (!(await Tenant.findOne({ tenantID: 'demo' }))) {
            await Tenant.create({ tenantID: 'demo', clientName: 'iCHEF Démo', status: 'ACTIF', plan: 'EMPIRE', pin: '0000', maxScreens: 50, maxStaff: 999 });
        }
    } catch (e) {}
}
creerCompteDemo();

// CRITIQUE : UNE SEULE COMMANDE LISTEN À LA TOUTE FIN DU FICHIER !
server.listen(PORT, () => {
    console.log("✅ L'Empire iCHEF est en ligne, Socket.io activé, sécurisé sur le port " + PORT);
});
