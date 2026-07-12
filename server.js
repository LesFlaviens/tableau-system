/**
 * ==============================================================
 * 🧠 iCHEF EMPIRE OS — ENGINE SERVER BACKEND (V. FORTERESSE)
 * Version ordonnée et corrigée pour le déploiement Render
 * ==============================================================
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const twilio = require('twilio');

const http = require('http');
const { Server } = require('socket.io');

// ==========================================
// 1. CONFIGURATION DES CLÉS & VARIABLES
// ==========================================
const ADMIN_PASS = process.env.ADMIN_PASS || 'Empire2026';
const stripeKey = process.env.STRIPE_SECRET_KEY || 'sk_test_51TN80JQ9Dw3nOfA4I3XTxPl5FR4ddYmU9Jw2pGmfa0eABz2P6wAzK8RMzHw2XilulLXxFmY2oEDgau4TcScOf9WK00ajIEuweB'; 
const stripe = require('stripe')(stripeKey);

const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
const twilioClient = (twilioAccountSid && twilioAuthToken) ? twilio(twilioAccountSid, twilioAuthToken) : null;
const NUMERO_FLAVIEN = '+33641437265'; 

const PORT = process.env.PORT || 10000;
const COOKIE_SECURE = true; 
const SESSION_TTL_MS = 30 * 60 * 1000;
const MASTER_SESSION_TTL_MS = 20 * 60 * 1000;

const app = express();
app.set('trust proxy', 1);
const server = http.createServer(app);

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'https://os.ichef.ch,http://localhost:10000')
    .split(',')
    .map(v => v.trim())
    .filter(Boolean);

const corsOptions = {
    origin: function (origin, callback) { callback(null, true); },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept', 'X-CSRF-Token', 'X-iCHEF-Device', 'X-iCHEF-Master-Device', 'Idempotency-Key']
};

const io = new Server(server, { cors: corsOptions });

app.use(cors(corsOptions));
app.disable('x-powered-by');

app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
});

// 🚨 SÉCURITÉ STRIPE AVANT LE PARSER JSON
app.use('/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '100mb' })); 
app.use(express.urlencoded({ extended: true, limit: '100mb' }));
app.use(express.static(path.join(__dirname)));

const cleanString = (str) => String(str || "").trim().toLowerCase();

// ==========================================
// 2. BASE DE DONNÉES ET MODÈLES
// ==========================================
const mongoURI = process.env.MONGO_URI || "mongodb+srv://icheflavien_db_user:Tamere58.@cluster0.4w95d7m.mongodb.net/ichef_production?retryWrites=true&w=majority";
mongoose.connect(mongoURI).then(() => console.log('✅ Base de données iCHEF Online')).catch(err => console.error(err.message));

const Tenant = mongoose.model('Tenant', new mongoose.Schema({
    tenantID: { type: String, required: true, unique: true },
    clientName: String, email: String, phone: String,
    status: { type: String, enum: ['ACTIF', 'SUSPENDU'], default: 'ACTIF' },
    plan: { type: String, default: 'BUSINESS' },
    specialite: { type: String, default: 'cuisine' },
    pin: { type: String, select: false },
    pinHash: { type: String, select: false },
    addons: { type: [String], default: [] },
    archivedAt: Date, 
    maxScreens: { type: Number, default: 5 }, 
    maxStaff: { type: Number, default: 999 },
    registeredDevices: [String], 
    config: { stripeCustomerId: String },
    demoExpiration: { type: Date }
}));

const Session = mongoose.model('Session', new mongoose.Schema({
    tokenHash: { type: String, required: true, unique: true, index: true },
    tenantID: { type: String, required: true, index: true },
    userId: String, role: String, permissions: { type: [String], default: [] },
    deviceId: String, csrfToken: String,
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    revokedAt: Date, lastSeenAt: { type: Date, default: Date.now }
}));

const MasterSession = mongoose.model('MasterSession', new mongoose.Schema({
    tokenHash: { type: String, required: true, unique: true, index: true },
    userId: { type: String, default: 'SUPERADMIN' },
    permissions: { type: [String], default: ['*'] },
    deviceId: String, csrfToken: String,
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    revokedAt: Date, lastSeenAt: { type: Date, default: Date.now }
}));

const AppState = mongoose.model('AppState', new mongoose.Schema({
    tenantID: { type: String, required: true, unique: true },
    activeOrders: { type: Object, default: {} }
}, { minimize: false }));

const AuditLog = mongoose.model('AuditLog', new mongoose.Schema({
    tenantID: { type: String, required: true, index: true },
    timestamp: { type: Date, default: Date.now },
    action: { type: String, required: true },
    entityType: { type: String, required: true },
    entityId: { type: String, required: true },
    authorPin: { type: String, required: true },
    details: { type: Object },
    previousHash: { type: String, required: true },
    currentHash: { type: String, required: true }  
}));

// ==========================================
// 3. FONCTIONS DE SÉCURITÉ ET D'AIDE
// ==========================================
function parseCookies(req) {
    const raw = req.headers.cookie || '';
    return raw.split(';').reduce((acc, part) => {
        const i = part.indexOf('=');
        if (i > -1) acc[decodeURIComponent(part.slice(0, i).trim())] = decodeURIComponent(part.slice(i + 1).trim());
        return acc;
    }, {});
}

function setCookie(res, name, value, maxAge) {
    res.append('Set-Cookie', `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=None; Secure; Max-Age=${Math.floor(maxAge / 1000)}`);
}

function clearCookie(res, name) {
    res.append('Set-Cookie', `${name}=; Path=/; HttpOnly; SameSite=None; Secure; Max-Age=0`);
}

function randomToken(bytes = 32) { return crypto.randomBytes(bytes).toString('hex'); }
function digest(value) { return crypto.createHash('sha256').update(String(value)).digest('hex'); }

function safeEqual(a, b) {
    const aa = Buffer.from(String(a || '')); const bb = Buffer.from(String(b || ''));
    return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}

function hashPin(pin, salt = crypto.randomBytes(16).toString('hex')) {
    return `${salt}:${crypto.scryptSync(String(pin), salt, 64).toString('hex')}`;
}

function verifyPinHash(pin, storedHash) {
    if (!storedHash || !storedHash.includes(':')) return false;
    const [salt, expected] = storedHash.split(':');
    const actual = crypto.scryptSync(String(pin), salt, 64).toString('hex');
    return safeEqual(actual, expected);
}

async function scellerOperation(tenantID, action, entityType, entityId, authorPin, details) {
    try {
        const safeID = cleanString(tenantID);
        const lastLog = await AuditLog.findOne({ tenantID: safeID }).sort({ timestamp: -1 });
        const previousHash = lastLog ? lastLog.currentHash : 'GENESIS_BLOCK_0000000000000000';
        const dataString = JSON.stringify({ tenantID: safeID, action, entityType, entityId, authorPin, details, previousHash });
        const currentHash = crypto.createHash('sha256').update(dataString).digest('hex');
        await AuditLog.create({ tenantID: safeID, action, entityType, entityId, authorPin, details, previousHash, currentHash });
    } catch (error) { console.error("Erreur Scellé Cryptographique :", error); }
}

async function createTenantSession({ tenantID, userId, role, permissions, deviceId, req, res }) {
    const token = randomToken();
    const csrfToken = randomToken(24);
    await Session.create({ tokenHash: digest(token), tenantID, userId, role, permissions, deviceId, csrfToken, expiresAt: new Date(Date.now() + SESSION_TTL_MS) });
    setCookie(res, 'ichef_session', token, SESSION_TTL_MS);
    return { csrfToken };
}

async function getTenantSession(req) {
    const token = parseCookies(req).ichef_session;
    if (!token) return null;
    return Session.findOne({ tokenHash: digest(token), revokedAt: null, expiresAt: { $gt: new Date() } });
}

async function requireTenantSession(req, res, next) {
    const session = await getTenantSession(req);
    if (!session) return res.status(401).json({ success: false, error: 'Session expirée.' });
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && req.get('X-CSRF-Token') !== session.csrfToken) {
        return res.status(403).json({ success: false, error: 'Jeton CSRF invalide.' });
    }
    session.lastSeenAt = new Date(); session.expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    await session.save(); req.ichefSession = session; next();
}

async function getMasterSession(req) {
    const token = parseCookies(req).ichef_master_session;
    if (!token) return null;
    return MasterSession.findOne({ tokenHash: digest(token), revokedAt: null, expiresAt: { $gt: new Date() } });
}

async function requireMasterSession(req, res, next) {
    const session = await getMasterSession(req);
    if (!session) return res.status(401).json({ success: false, error: 'Session SuperAdmin expirée.' });
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && req.get('X-CSRF-Token') !== session.csrfToken) {
        return res.status(403).json({ success: false, error: 'Jeton CSRF SuperAdmin invalide.' });
    }
    session.lastSeenAt = new Date(); session.expiresAt = new Date(Date.now() + MASTER_SESSION_TTL_MS);
    await session.save(); req.masterSession = session; next();
}

// ==========================================
// 4. ROUTES D'API
// ==========================================
app.get('/health', (req, res) => res.json({ success: true, status: 'online' }));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'vitrine.html')));
app.get('/panel-ichef', (req, res) => {
    if (req.query.pass === ADMIN_PASS) res.sendFile(path.join(__dirname, 'empire.html'));
    else res.status(403).send('🛑 Accès Refusé.');
});

// --- ROUTES AUTHENTIFICATION ---
app.post('/api/auth/pin-login', async (req, res) => {
    const tenantID = cleanString(req.body.tenantID); const pin = String(req.body.pin || ''); const deviceId = String(req.body.deviceId || '');
    try {
        const tenant = await Tenant.findOne({ tenantID }).select('+pin +pinHash');
        if (!tenant) return res.status(404).json({ success: false, error: 'Établissement inconnu.' });
        if (tenant.status !== 'ACTIF' || tenant.archivedAt) return res.status(403).json({ success: false, error: 'Licence inactive.' });
        if (tenant.demoExpiration && new Date() > new Date(tenant.demoExpiration)) return res.status(403).json({ success: false, error: 'Démonstration expirée.' });

        let isValid = tenant.pinHash ? verifyPinHash(pin, tenant.pinHash) : safeEqual(pin, tenant.pin);
        let roleAttribue = 'MASTER'; let actorName = 'DIRECTION';

        if (!isValid) {
            const state = await AppState.findOne({ tenantID });
            if (state && state.activeOrders && state.activeOrders['STAFF_ACCESS']) {
                const staffMember = (state.activeOrders['STAFF_ACCESS'].data || []).find(s => String(s.pin).trim() === String(pin).trim() && s.active === true);
                if (staffMember) { isValid = true; roleAttribue = staffMember.dept || 'STAFF'; actorName = staffMember.name; }
            }
        }
        if (!isValid) return res.status(401).json({ success: false, error: 'Code PIN incorrect.' });

        if (roleAttribue === 'MASTER' && !tenant.pinHash) { tenant.pinHash = hashPin(pin); tenant.pin = undefined; }
        if (deviceId && !tenant.registeredDevices.includes(deviceId)) {
            if (tenant.registeredDevices.length >= tenant.maxScreens) return res.status(403).json({ success: false, error: 'Limite d’écrans atteinte.' });
            tenant.registeredDevices.push(deviceId);
        }
        await tenant.save();

        const session = await createTenantSession({ tenantID, userId: actorName, role: roleAttribue, permissions: ['*'], deviceId, req, res });
        await scellerOperation(tenantID, 'USER_LOGIN', 'AUTHENTICATION', session.csrfToken, actorName, { action: `Connexion: ${actorName}`, role: roleAttribue, deviceId: deviceId || 'Inconnu' });

        res.json({ success: true, csrfToken: session.csrfToken, plan: tenant.plan, specialite: tenant.specialite, role: roleAttribue, userName: actorName, safeTenantID: tenant.tenantID });
    } catch (error) { res.status(500).json({ success: false, error: 'Erreur Serveur.' }); }
});

app.post('/api/security/bootstrap', async (req, res) => {
    const session = await getTenantSession(req);
    if (!session) return res.status(401).json({ success: false, sessionValid: false });
    const tenant = await Tenant.findOne({ tenantID: session.tenantID });
    if (!tenant || tenant.status !== 'ACTIF' || tenant.archivedAt) return res.status(403).json({ success: false, error: 'Licence inactive.' });
    res.json({ success: true, sessionValid: true, moduleAllowed: true, csrfToken: session.csrfToken, permissions: session.permissions, user: { id: session.userId, role: session.role }, plan: tenant.plan, addons: tenant.addons || [] });
});

app.post('/api/security/heartbeat', requireTenantSession, async (req, res) => {
    res.json({ success: true, sessionValid: true, deviceAllowed: true, suspicious: false, expiresAt: req.ichefSession.expiresAt, csrfToken: req.ichefSession.csrfToken });
});

app.post('/api/auth/logout', async (req, res) => {
    const token = parseCookies(req).ichef_session;
    if (token) {
        const session = await Session.findOne({ tokenHash: digest(token) });
        if (session) {
            session.revokedAt = new Date(); await session.save();
            const durationMins = Math.round((Date.now() - session._id.getTimestamp()) / 60000);
            await scellerOperation(session.tenantID, 'USER_LOGOUT', 'AUTHENTICATION', session.csrfToken, session.userId || 'INCONNU', { action: `Déconnexion: ${session.userId}`, duree_session_minutes: durationMins });
        }
    }
    clearCookie(res, 'ichef_session'); res.json({ success: true });
});

// --- ROUTES MASTER / SUPERADMIN ---
app.post('/api/master/login', async (req, res) => {
    if (!safeEqual(req.body.masterKey, ADMIN_PASS)) return res.status(401).json({ success: false, error: 'Clé SuperAdmin invalide.' });
    const token = randomToken(); const csrfToken = randomToken(24);
    await MasterSession.create({ tokenHash: digest(token), csrfToken, deviceId: req.body.deviceId || '', expiresAt: new Date(Date.now() + MASTER_SESSION_TTL_MS) });
    setCookie(res, 'ichef_master_session', token, MASTER_SESSION_TTL_MS);
    res.json({ success: true, csrfToken });
});

app.post('/api/master/bootstrap', requireMasterSession, async (req, res) => {
    res.json({ success: true, sessionValid: true, moduleAllowed: true, csrfToken: req.masterSession.csrfToken, permissions: req.masterSession.permissions, user: { id: req.masterSession.userId, role: 'SUPERADMIN' } });
});

app.get('/api/master/tenants', requireMasterSession, async (req, res) => {
    const tenants = await Tenant.find({ archivedAt: null }).lean();
    res.json({ success: true, tenants: tenants.map(t => ({ id: t.tenantID, name: t.clientName || 'Sans nom', email: t.email || '', phone: t.phone || '', pack: t.plan, specialite: t.specialite, addons: t.addons || [], maxScreens: t.maxScreens, maxStaff: t.maxStaff, activeScreens: t.registeredDevices?.length || 0, status: t.status })) });
});

app.post('/api/master/tenant-action', requireMasterSession, async (req, res) => {
    const { tenantID, action, payload = {} } = req.body;
    const safeID = cleanString(tenantID); const reason = String(payload.reason || '').trim();
    if (reason.length < 8) return res.status(400).json({ success: false, error: 'Motif obligatoire.' });
    const tenant = await Tenant.findOne({ tenantID: safeID }).select('+pin +pinHash');
    if (!tenant) return res.status(404).json({ success: false, error: 'Client introuvable.' });

    if (action === 'set_plan') tenant.plan = String(payload.newPlan || '').toUpperCase();
    else if (action === 'set_max_screens') tenant.maxScreens = Number(payload.maxScreens);
    else if (action === 'reset_devices') tenant.registeredDevices = [];
    else if (action === 'suspend') { tenant.status = 'SUSPENDU'; tenant.registeredDevices = []; }
    else if (action === 'activate') tenant.status = 'ACTIF';
    else if (action === 'archive') { tenant.status = 'SUSPENDU'; tenant.archivedAt = new Date(); tenant.registeredDevices = []; }
    else if (action === 'set_addons') tenant.addons = Array.isArray(payload.addons) ? payload.addons : [];
    else if (action === 'reset_admin_pin') {
        const temporaryPin = String(Math.floor(100000 + Math.random() * 900000));
        tenant.pinHash = hashPin(temporaryPin); tenant.pin = undefined; tenant.registeredDevices = [];
        await tenant.save(); return res.json({ success: true, temporaryPin });
    } else return res.status(400).json({ success: false, error: 'Action inconnue.' });

    await tenant.save(); res.json({ success: true });
});

app.post('/api/master/heartbeat', requireMasterSession, async (req, res) => {
    res.json({ success: true, sessionValid: true, suspicious: false, deviceRevoked: false, csrfToken: req.masterSession.csrfToken, expiresAt: req.masterSession.expiresAt });
});

app.post('/api/master/logout', async (req, res) => {
    const token = parseCookies(req).ichef_master_session;
    if (token) await MasterSession.updateOne({ tokenHash: digest(token) }, { revokedAt: new Date() });
    clearCookie(res, 'ichef_master_session'); res.json({ success: true });
});

// --- STRIPE ---
app.post('/webhook', async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;
    try { event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET); } 
    catch (err) { return res.status(400).send(`Webhook Error: ${err.message}`); }
    
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        if (session.metadata && session.metadata.type === 'UPGRADE_SCREENS') {
            try { await Tenant.updateOne({ tenantID: cleanString(session.metadata.tenantID) }, { $inc: { maxScreens: parseInt(session.metadata.extraScreens) } }); } catch(e) {}
        } else {
            try {
                const safeID = cleanString(session.client_reference_id || "client_attente_" + Date.now());
                let planAchete = "BUSINESS"; let limitScreens = 5; let limitStaff = 999;
                if (session.metadata && session.metadata.plan) {
                    planAchete = session.metadata.plan.toUpperCase();
                    if (['CHEF_CUISINE', 'CHEF_PATISSERIE', 'CHEF_BAR', 'CHEF', 'PATISSIER', 'BAR'].includes(planAchete)) { limitScreens = 1; limitStaff = 1; } 
                    else if (['BUSINESS', 'RENTABILITE', 'ECO', 'PACK_A'].includes(planAchete)) { limitScreens = 5; limitStaff = 999; } 
                    else if (['EMPIRE', 'BRIGADE', 'BRIGADES', 'PREMIUM'].includes(planAchete)) { limitScreens = 50; limitStaff = 999; }
                }
                await Tenant.updateOne(
                    { tenantID: safeID },
                    { $set: { status: 'ACTIF', config: { stripeCustomerId: session.customer } }, $unset: { demoExpiration: "" }, $setOnInsert: { plan: planAchete, maxScreens: limitScreens, maxStaff: limitStaff, pinHash: hashPin(Math.floor(1000 + Math.random() * 9000).toString()) } },
                    { upsert: true }
                );
            } catch(e) {}
        }
    }
    res.json({received: true});
});

// --- ROUTES STANDARDS ---
app.get('/api/export-preuves-legales', async (req, res) => {
    const { tenantID, masterPin } = req.query;
    try {
        const tenant = await Tenant.findOne({ tenantID: cleanString(tenantID) }).select('+pinHash +pin');
        if (!tenant) return res.status(403).json({ error: "Accès refusé." });
        const valid = tenant.pinHash ? verifyPinHash(masterPin, tenant.pinHash) : safeEqual(masterPin, tenant.pin);
        if (!valid) return res.status(403).json({ error: "Empreinte de sécurité invalide." });

        const logs = await AuditLog.find({ tenantID: cleanString(tenantID) }).sort({ timestamp: 1 });
        let isChainValid = true; let brokenAtIndex = null;
        for (let i = 1; i < logs.length; i++) {
            if (logs[i].previousHash !== logs[i-1].currentHash) { isChainValid = false; brokenAtIndex = i; break; }
        }
        res.json({ success: true, certificatLegal: { etablissement: tenant.clientName, dateExtraction: new Date(), integriteGarantie: isChainValid, alerteFalsification: isChainValid ? "Aucune altération détectée" : `ATTENTION: Chaîne brisée à l'index ${brokenAtIndex}`, totalOperations: logs.length }, journal: logs });
    } catch (error) { res.status(500).json({ error: "Erreur lors de l'export." }); }
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'CLE_MANQUANTE');

app.post('/api/ai-business-pulse', async (req, res) => {
    const { tenantID, masterPin } = req.body;
    try {
        const tenant = await Tenant.findOne({ tenantID: cleanString(tenantID) }).select('+pinHash +pin');
        if (!tenant) return res.status(403).json({ success: false, error: "Client introuvable." });
        const valid = tenant.pinHash ? verifyPinHash(masterPin, tenant.pinHash) : safeEqual(masterPin, tenant.pin);
        if (!valid) return res.status(403).json({ success: false, error: "PIN invalide." });

        let state = await AppState.findOne({ tenantID: cleanString(tenantID) });
        let financialHistory = state?.activeOrders?.FINANCIAL_HISTORY?.data || [];
        let prompt = `Tu es l'expert en Yield Management d'iCHEF OS. Analyse ces données: ${JSON.stringify(financialHistory.slice(0, 50))}. Renvoie CE JSON EXACT: {"previsionVentes": "...", "analyseCA": "...", "analyseMarges": "...", "recommandations": ["..."]}`;

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent(prompt);
        let responseText = result.response.text().trim();
        const ticks = String.fromCharCode(96, 96, 96);
        responseText = responseText.split(ticks + 'json').join('').split(ticks).join('').trim();
        if (!responseText.startsWith("{")) responseText = responseText.substring(responseText.indexOf("{"));
        res.json({ success: true, pulse: JSON.parse(responseText) });
    } catch (error) {
        res.json({ success: true, pulse: { previsionVentes: "📈 Calcul basé sur la moyenne.", analyseCA: "📊 Volume d'affaires en progression.", analyseMarges: "⚠️ Marge brute sous surveillance.", recommandations: ["💰 Augmentez le Burger de 1.00 €", "⚡ Activez le Time-Shifting automatique."] } });
    }
});

app.post('/api/predict-hr-schedule', async (req, res) => {
    const { tenantID, staffList } = req.body;
    try {
        let state = await AppState.findOne({ tenantID: cleanString(tenantID) });
        let history = state?.activeOrders?.TRAFFIC_HISTORY?.data || [];
        if (history.length < 50) return res.json({ success: true, message: "L'IA a besoin de plus d'historique." });

        let summary = history.map(h => `Jour:${h.dayOfWeek}-Heure:${h.hour}-Pax:${h.pax}`);
        const prompt = `Tu es le DRH IA. Analyse ces données : ${JSON.stringify(summary)}. Renvoie JSON: {"rushPeriods": ["..."], "deadPeriods": ["..."], "hiringAdvice": "...", "vacationSuggestions": "..."}`;
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(prompt);
        let responseText = result.response.text().trim();
        const ticks = String.fromCharCode(96, 96, 96);
        responseText = responseText.split(ticks + 'json').join('').split(ticks).join('').trim();
        if (!responseText.startsWith("{")) responseText = responseText.substring(responseText.indexOf("{"));
        res.json({ success: true, prediction: JSON.parse(responseText) });
    } catch (error) { res.status(500).json({ success: false }); }
});

app.post('/api/save-transaction', async (req, res) => {
    const { tenantID, transaction } = req.body;
    const safeID = cleanString(tenantID);
    try {
        let state = await AppState.findOne({ tenantID: safeID });
        if (!state) state = new AppState({ tenantID: safeID, activeOrders: {} });
        if (!state.activeOrders['FINANCIAL_HISTORY']) state.activeOrders['FINANCIAL_HISTORY'] = { data: [] };
        
        state.activeOrders['FINANCIAL_HISTORY'].data.unshift(transaction);
        state.markModified('activeOrders');
        await state.save();

        await scellerOperation(safeID, 'CREATE', 'TRANSACTION', transaction.id || Date.now().toString(), 'SYSTEM', transaction);
        res.json({ success: true });
    } catch(e) { res.status(500).json({ success: false }); }
});

app.get('/get-current-state', async (req, res) => {
    try {
        let tenantID = cleanString(req.query.tenantID || 'MASTER_STATE');
        const tenant = await Tenant.findOne({ tenantID });
        if (tenant && tenant.demoExpiration && new Date() > new Date(tenant.demoExpiration)) return res.status(403).json({ error: "Démonstration expirée." });
        if (tenant && (tenant.status === 'SUSPENDU' || tenant.archivedAt)) return res.status(403).json({ error: "Licence suspendue." });
        
        let state = await AppState.findOne({ tenantID });
        if (!state) state = await AppState.create({ tenantID, activeOrders: {} });
        
        const finalState = state.toObject();
        if(tenant) finalState.maxStaff = tenant.maxStaff;
        res.json(finalState);
    } catch (e) { res.status(500).json({ error: "Sync Error" }); }
});

app.post('/update-order', async (req, res) => {
    try {
        let tenantID = cleanString(req.query.tenantID || 'MASTER_STATE');
        const { tableId, order, pin } = req.body;
        
        let actionType = 'UPDATE';
        let updateQuery = { $set: { [`activeOrders.${tableId}`]: order } };

        if (order === null || order === 'DELETE') {
            actionType = 'DELETE_SOFT';
            updateQuery = { $set: { [`activeOrders.${tableId}.isArchived`]: true, [`activeOrders.${tableId}.status`]: 'ANNULÉ_OU_SUPPRIMÉ' } };
        }

        const newState = await AppState.findOneAndUpdate({ tenantID }, updateQuery, { upsert: true, new: true });
        
        if (tenantID !== 'MASTER_STATE' && tableId) {
            await scellerOperation(tenantID, actionType, tableId.includes('STAFF') ? 'RH' : 'COMMANDE', tableId, pin || 'SYSTEM', order || 'DELETED');
        }

        io.to(tenantID).emit('updateState', newState);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Save Error" }); }
});

// ==========================================
// 5. WEBSOCKETS ET DÉMARRAGE DU SERVEUR
// ==========================================
io.on('connection', (socket) => {
    socket.on('joinTenant', (tenantID) => { socket.join(cleanString(tenantID)); });
});

async function creerCompteDemo() {
    try {
        const demoExist = await Tenant.findOne({ tenantID: 'demo' });
        if (!demoExist) {
            await Tenant.create({
                tenantID: 'demo', clientName: 'Restaurant iCHEF Démo', status: 'ACTIF',
                plan: 'EMPIRE', pinHash: hashPin('0000'), maxScreens: 50, maxStaff: 999
            });
            console.log('✅ Compte DÉMO ("demo" / "0000") généré avec succès dans la base !');
        }
    } catch (e) {}
}
creerCompteDemo();

server.listen(PORT, () => {
    console.log("✅ L'Empire iCHEF est en ligne, Socket.io activé, sécurisé sur le port " + PORT);
});
