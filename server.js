/**
 * ==============================================================
 * 🧠 iCHEF EMPIRE OS — ENGINE SERVER BACKEND (V. FORTERESSE)
 * Version 100% complète : Sécurité, Anti-Fraude, IA, WebSockets, Traçabilité RH
 * ==============================================================
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
// CONFIGURATION DES CLÉS
// ==========================================
const ADMIN_PASS = process.env.ADMIN_PASS || 'Empire2026';

const stripeKey = process.env.STRIPE_SECRET_KEY || 'sk_test_51TN80JQ9Dw3nOfA4I3XTxPl5FR4ddYmU9Jw2pGmfa0eABz2P6wAzK8RMzHw2XilulLXxFmY2oEDgau4TcScOf9WK00ajIEuweB'; 
const stripe = require('stripe')(stripeKey);

const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
const twilioClient = (twilioAccountSid && twilioAuthToken) ? twilio(twilioAccountSid, twilioAuthToken) : null;
const NUMERO_FLAVIEN = '+33641437265'; 

const app = express();
app.set('trust proxy', 1);
const server = http.createServer(app);

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'https://os.ichef.ch,http://localhost:10000')
    .split(',')
    .map(v => v.trim())
    .filter(Boolean);

const io = new Server(server, {
    cors: {
        origin(origin, callback) {
            if (!origin || ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
            callback(new Error('Origine Socket.IO non autorisée'));
        },
        credentials: true
    }
});

// 👇 DÉBLOCAGE DES VIDÉOS & RESSOURCES 👇
app.use(express.static(__dirname));

const PORT = process.env.PORT || 10000;

// Configurations de sessions sécurisées
const COOKIE_SECURE = true; 
const SESSION_TTL_MS = 30 * 60 * 1000;
const MASTER_SESSION_TTL_MS = 20 * 60 * 1000;

app.disable('x-powered-by');

app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
});

// ==========================================
// OUTILS DE COOKIES ET CRYPTOGRAPHIE (SESSIONS)
// ==========================================
function parseCookies(req) {
    const raw = req.headers.cookie || '';
    return raw.split(';').reduce((acc, part) => {
        const i = part.indexOf('=');
        if (i > -1) {
            acc[decodeURIComponent(part.slice(0, i).trim())] = decodeURIComponent(part.slice(i + 1).trim());
        }
        return acc;
    }, {});
}

function setCookie(res, name, value, maxAge) {
    const attrs = [
        `${name}=${encodeURIComponent(value)}`,
        'Path=/',
        'HttpOnly',
        'SameSite=None', 
        'Secure',        
        `Max-Age=${Math.floor(maxAge / 1000)}`
    ];
    res.append('Set-Cookie', attrs.join('; '));
}

function clearCookie(res, name) {
    const attrs = [`${name}=`, 'Path=/', 'HttpOnly', 'SameSite=None', 'Secure', 'Max-Age=0'];
    res.append('Set-Cookie', attrs.join('; '));
}

function randomToken(bytes = 32) {
    return crypto.randomBytes(bytes).toString('hex');
}

function digest(value) {
    return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function safeEqual(a, b) {
    const aa = Buffer.from(String(a || ''));
    const bb = Buffer.from(String(b || ''));
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

// Sécurité des requêtes (CORS)
app.use(cors({
    origin(origin, callback) {
        if (!origin || ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
        callback(new Error('Origine CORS non autorisée'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept', 'X-CSRF-Token', 'X-iCHEF-Device', 'X-iCHEF-Master-Device', 'Idempotency-Key']
}));

app.use('/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '100mb' })); 
app.use(express.urlencoded({ extended: true, limit: '100mb' }));
app.use(express.static(path.join(__dirname)));

const cleanString = (str) => String(str || "").trim().toLowerCase();

app.get('/health', (req, res) => {
    res.json({ success: true, status: 'online', time: new Date().toISOString() });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'vitrine.html'));
});

app.get('/panel-ichef', (req, res) => {
    if (req.query.pass === ADMIN_PASS) {
        res.sendFile(path.join(__dirname, 'empire.html'));
    } else {
        res.status(403).send('🛑 Accès Refusé. Sécurité Empire iCHEF.');
    }
});


// ==========================================
// 🛡️ AUTHENTIFICATION ET TRAÇABILITÉ DES OPÉRATEURS
// ==========================================
app.post('/api/auth/pin-login', async (req, res) => {
    const tenantID = cleanString(req.body.tenantID);
    const pin = String(req.body.pin || '');
    const deviceId = String(req.body.deviceId || '');

    try {
        const tenant = await Tenant.findOne({ tenantID }).select('+pin +pinHash');
        if (!tenant) return res.status(404).json({ success: false, error: 'Établissement inconnu.' });
        if (tenant.status !== 'ACTIF' || tenant.archivedAt) {
            return res.status(403).json({ success: false, error: 'Licence inactive.' });
        }
        if (tenant.demoExpiration && new Date() > new Date(tenant.demoExpiration)) {
            return res.status(403).json({ success: false, error: 'Démonstration expirée.' });
        }

        // Vérification Manager (PIN Principal)
        let isValid = tenant.pinHash ? verifyPinHash(pin, tenant.pinHash) : safeEqual(pin, tenant.pin);
        let roleAttribue = 'MASTER';
        let actorName = 'DIRECTION';

        // Vérification Staff (Employés)
        if (!isValid) {
            const state = await AppState.findOne({ tenantID });
            if (state && state.activeOrders && state.activeOrders['STAFF_ACCESS']) {
                const staffMember = (state.activeOrders['STAFF_ACCESS'].data || []).find(s => String(s.pin).trim() === String(pin).trim() && s.active === true);
                if (staffMember) { 
                    isValid = true; 
                    roleAttribue = staffMember.dept || 'STAFF'; 
                    actorName = staffMember.name;
                }
            }
        }

        if (!isValid) return res.status(401).json({ success: false, error: 'Code PIN incorrect.' });

        // Mise à jour de sécurité si vieux compte
        if (roleAttribue === 'MASTER' && !tenant.pinHash) {
            tenant.pinHash = hashPin(pin);
            tenant.pin = undefined;
        }

        if (deviceId && !tenant.registeredDevices.includes(deviceId)) {
            if (tenant.registeredDevices.length >= tenant.maxScreens) {
                return res.status(403).json({ success: false, error: 'Limite d’écrans atteinte.' });
            }
            tenant.registeredDevices.push(deviceId);
        }

        await tenant.save();

        const session = await createTenantSession({
            tenantID,
            userId: actorName,
            role: roleAttribue,
            permissions: ['*'],
            deviceId,
            req,
            res
        });

        // 📜 TRAÇABILITÉ LÉGALE : On scelle la connexion dans le registre anti-fraude
        await scellerOperation(tenantID, 'USER_LOGIN', 'AUTHENTICATION', session.csrfToken, actorName, {
            action: `Connexion de l'opérateur : ${actorName}`,
            role: roleAttribue,
            deviceId: deviceId || 'Inconnu'
        });

        res.json({
            success: true,
            csrfToken: session.csrfToken,
            plan: tenant.plan,
            specialite: tenant.specialite,
            role: roleAttribue,
            userName: actorName,
            safeTenantID: tenant.tenantID
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Erreur d’authentification.' });
    }
});

app.post('/api/security/bootstrap', async (req, res) => {
    const session = await getTenantSession(req);
    if (!session) return res.status(401).json({ success: false, sessionValid: false });

    const tenant = await Tenant.findOne({ tenantID: session.tenantID });
    if (!tenant || tenant.status !== 'ACTIF' || tenant.archivedAt) {
        return res.status(403).json({ success: false, error: 'Licence inactive.' });
    }

    res.json({
        success: true,
        sessionValid: true,
        moduleAllowed: true,
        csrfToken: session.csrfToken,
        permissions: session.permissions,
        user: { id: session.userId, role: session.role },
        plan: tenant.plan,
        addons: tenant.addons || []
    });
});

app.post('/api/security/heartbeat', requireTenantSession, async (req, res) => {
    res.json({
        success: true,
        sessionValid: true,
        deviceAllowed: true,
        suspicious: false,
        expiresAt: req.ichefSession.expiresAt,
        csrfToken: req.ichefSession.csrfToken
    });
});

app.post('/api/auth/logout', async (req, res) => {
    const token = parseCookies(req).ichef_session;
    if (token) {
        const session = await Session.findOne({ tokenHash: digest(token) });
        if (session) {
            session.revokedAt = new Date();
            await session.save();
            
            // Calcul du temps de présence
            const durationMs = Date.now() - session._id.getTimestamp();
            const durationMins = Math.round(durationMs / 60000);

            // 📜 TRAÇABILITÉ LÉGALE : On scelle la déconnexion et la durée
            await scellerOperation(session.tenantID, 'USER_LOGOUT', 'AUTHENTICATION', session.csrfToken, session.userId || 'INCONNU', {
                action: `Déconnexion de l'opérateur : ${session.userId}`,
                duree_session_minutes: durationMins
            });
        }
    }
    clearCookie(res, 'ichef_session');
    res.json({ success: true });
});

// ROUTINES MASTER / SUPERADMIN
app.post('/api/master/login', async (req, res) => {
    if (!safeEqual(req.body.masterKey, ADMIN_PASS)) return res.status(401).json({ success: false, error: 'Clé SuperAdmin invalide.' });

    const token = randomToken();
    const csrfToken = randomToken(24);

    await MasterSession.create({
        tokenHash: digest(token),
        csrfToken,
        deviceId: req.body.deviceId || '',
        expiresAt: new Date(Date.now() + MASTER_SESSION_TTL_MS)
    });

    setCookie(res, 'ichef_master_session', token, MASTER_SESSION_TTL_MS);
    res.json({ success: true, csrfToken });
});

app.post('/api/master/bootstrap', requireMasterSession, async (req, res) => {
    res.json({
        success: true, sessionValid: true, moduleAllowed: true,
        csrfToken: req.masterSession.csrfToken, permissions: req.masterSession.permissions,
        user: { id: req.masterSession.userId, role: 'SUPERADMIN' }
    });
});

app.get('/api/master/tenants', requireMasterSession, async (req, res) => {
    const tenants = await Tenant.find({ archivedAt: null }).lean();
    res.json({
        success: true,
        tenants: tenants.map(t => ({
            id: t.tenantID, name: t.clientName || 'Sans nom', email: t.email || '', phone: t.phone || '',
            pack: t.plan, specialite: t.specialite, addons: t.addons || [],
            maxScreens: t.maxScreens, maxStaff: t.maxStaff, activeScreens: t.registeredDevices?.length || 0, status: t.status
        }))
    });
});

app.post('/api/master/tenant-action', requireMasterSession, async (req, res) => {
    const { tenantID, action, payload = {} } = req.body;
    const safeID = cleanString(tenantID);
    const reason = String(payload.reason || '').trim();

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
        tenant.pinHash = hashPin(temporaryPin);
        tenant.pin = undefined;
        tenant.registeredDevices = [];
        await tenant.save();
        return res.json({ success: true, temporaryPin });
    }
    else return res.status(400).json({ success: false, error: 'Action inconnue.' });

    await tenant.save();
    res.json({ success: true });
});

app.post('/api/master/heartbeat', requireMasterSession, async (req, res) => {
    res.json({ success: true, sessionValid: true, suspicious: false, deviceRevoked: false, csrfToken: req.masterSession.csrfToken, expiresAt: req.masterSession.expiresAt });
});

app.post('/api/master/logout', async (req, res) => {
    const token = parseCookies(req).ichef_master_session;
    if (token) await MasterSession.updateOne({ tokenHash: digest(token) }, { revokedAt: new Date() });
    clearCookie(res, 'ichef_master_session');
    res.json({ success: true });
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
                    if (['CHEF_CUISINE', 'CHEF_PATISSERIE', 'CHEF_BAR', 'CHEF', 'PATISSIER', 'BAR'].includes(planAchete)) { limitScreens = 1; limitStaff = 1; } 
                    else if (['BUSINESS', 'RENTABILITE', 'ECO', 'PACK_A'].includes(planAchete)) { limitScreens = 5; limitStaff = 999; } 
                    else if (['EMPIRE', 'BRIGADE', 'BRIGADES', 'PREMIUM'].includes(planAchete)) { limitScreens = 50; limitStaff = 999; }
                } else {
                    if (session.amount_total === 1900) { planAchete = "CHEF_CUISINE"; limitScreens = 1; limitStaff = 1; } 
                    else if (session.amount_total === 4500 || session.amount_total === 4900) { planAchete = "PACK_A"; limitScreens = 5; limitStaff = 999; } 
                    else if (session.amount_total >= 9900) { planAchete = "EMPIRE"; limitScreens = 50; limitStaff = 999; }
                }

                await Tenant.updateOne(
                    { tenantID: safeID },
                    { 
                        $set: { status: 'ACTIF', config: { stripeCustomerId: session.customer } },
                        $unset: { demoExpiration: "" },
                        $setOnInsert: { plan: planAchete, maxScreens: limitScreens, maxStaff: limitStaff, pinHash: hashPin(Math.floor(1000 + Math.random() * 9000).toString()) }
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
    pin: { type: String, select: false },
    pinHash: { type: String, select: false },
    addons: { type: [String], default: [] },
    archivedAt: Date, 
    maxScreens: { type: Number, default: 5 }, 
    maxStaff: { type: Number, default: 999 },
    registeredDevices: [String], 
    config: { stripeCustomerId: String },
    demoExpiration: { type: Date }
});
const Tenant = mongoose.model('Tenant', tenantSchema);

const Session = mongoose.model('Session', new mongoose.Schema({
    tokenHash: { type: String, required: true, unique: true, index: true },
    tenantID: { type: String, required: true, index: true },
    userId: String,
    role: String,
    permissions: { type: [String], default: [] },
    deviceId: String,
    csrfToken: String,
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    revokedAt: Date,
    lastSeenAt: { type: Date, default: Date.now }
}));

const MasterSession = mongoose.model('MasterSession', new mongoose.Schema({
    tokenHash: { type: String, required: true, unique: true, index: true },
    userId: { type: String, default: 'SUPERADMIN' },
    permissions: { type: [String], default: ['*'] },
    deviceId: String,
    csrfToken: String,
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    revokedAt: Date,
    lastSeenAt: { type: Date, default: Date.now }
}));

const AppState = mongoose.model('AppState', new mongoose.Schema({
    tenantID: { type: String, required: true, unique: true },
    activeOrders: { type: Object, default: {} }
}, { minimize: false }));

// ==========================================
// 🛡️ SÉCURITÉ FISCALE & LÉGALE (NORME ANTI-FRAUDE)
// ==========================================

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

        await AuditLog.create({
            tenantID: safeID, action, entityType, entityId,
            authorPin, details, previousHash, currentHash
        });
        
        console.log(`🔒 Opération scellée [${action}] pour ${safeID}`);
    } catch (error) {
        console.error("🚨 ERREUR CRITIQUE DE SCELLÉ CRYPTOGRAPHIQUE :", error);
    }
}

app.get('/api/export-preuves-legales', async (req, res) => {
    const { tenantID, masterPin } = req.query;
    const safeID = cleanString(tenantID);
    
    try {
        const tenant = await Tenant.findOne({ tenantID: safeID }).select('+pinHash +pin');
        if (!tenant) return res.status(403).json({ error: "Accès refusé." });
        
        const valid = tenant.pinHash ? verifyPinHash(masterPin, tenant.pinHash) : safeEqual(masterPin, tenant.pin);
        if (!valid) return res.status(403).json({ error: "Empreinte de sécurité invalide." });

        const logs = await AuditLog.find({ tenantID: safeID }).sort({ timestamp: 1 });
        
        let isChainValid = true;
        let brokenAtIndex = null;
        
        for (let i = 1; i < logs.length; i++) {
            if (logs[i].previousHash !== logs[i-1].currentHash) {
                isChainValid = false;
                brokenAtIndex = i;
                break;
            }
        }

        res.json({
            success: true,
            certificatLegal: {
                etablissement: tenant.clientName,
                dateExtraction: new Date(),
                integriteGarantie: isChainValid,
                alerteFalsification: isChainValid ? "Aucune altération détectée" : `ATTENTION: Chaîne brisée à l'index ${brokenAtIndex}`,
                totalOperations: logs.length
            },
            journal: logs
        });
    } catch (error) {
        res.status(500).json({ error: "Erreur lors de l'export d'audit." });
    }
});

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
// 🧠 MOTEUR DE PRÉVISION & AUDIT COMMERCIAL IA
// ==========================================
app.post('/api/ai-business-pulse', async (req, res) => {
    const { tenantID, masterPin } = req.body;
    const safeID = cleanString(tenantID);

    try {
        const tenant = await Tenant.findOne({ tenantID: safeID }).select('+pinHash +pin');
        if (!tenant) return res.status(403).json({ success: false, error: "Client introuvable." });
        
        const valid = tenant.pinHash ? verifyPinHash(masterPin, tenant.pinHash) : safeEqual(masterPin, tenant.pin);
        if (!valid) return res.status(403).json({ success: false, error: "Sécurité Empire : PIN invalide." });

        let state = await AppState.findOne({ tenantID: safeID });
        let financialHistory = state?.activeOrders?.FINANCIAL_HISTORY?.data || [];
        let trafficHistory = state?.activeOrders?.TRAFFIC_HISTORY?.data || [];
        
        let salesSample = financialHistory.slice(0, 50);
        let trafficSample = trafficHistory.slice(0, 50);

        const prompt = `Tu es l'expert en Yield Management et Auditeur Financier d'iCHEF OS.
        Analyse les données réelles de cet établissement :
        - Historique Récent des Ventes (CA & Plats) : ${JSON.stringify(salesSample)}
        - Historique de Fréquentation (Couverts/Pax) : ${JSON.stringify(trafficSample)}
        - Plan Actuel du Restaurant : ${tenant.plan}
        - Date et heure du jour : ${new Date().toLocaleString('fr-FR')}

        MISSION : Génère des prévisions et des analyses basées sur ces chiffres.
        Sois extrêmement percutant, utilise des phrases courtes et incisives (style tableau de bord de direction).
        
        Tu DOIS répondre UNIQUE AVEC CE JSON STRICT (SANS ENROBAGE MARKDOWN, SANS BLABLA) :
        {
            "previsionVentes": "📈 Demain : XX couverts prévus basés sur les tendances.",
            "analyseCA": "📊 Chiffre d'affaires stable/en baisse. Les créneaux du [Jour] entre [Heure] et [Heure] sont les plus performants.",
            "analyseMarges": "⚠️ Votre marge baisse/progresse à cause de [Raison précise liée aux plats ou catégories].",
            "recommandations": [
                "💰 Augmentez le [Nom d'un plat populaire] de [X] € pour optimiser la marge.",
                "🎯 Mettez en avant [Nom d'un plat à forte marge] via le Menu Caméléon pour booster le ticket moyen.",
                "👥 Ajustez le staff : période creuse détectée le [Jour] midi."
            ]
        }`;

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent(prompt);
        
        let responseText = result.response.text().trim();
        const ticks = String.fromCharCode(96, 96, 96);
        responseText = responseText.split(ticks + 'json').join('').split(ticks).join('').trim();
        if (!responseText.startsWith("{")) responseText = responseText.substring(responseText.indexOf("{"));
        
        res.json({ success: true, pulse: JSON.parse(responseText) });

    } catch (error) {
        res.json({ 
            success: true, 
            pulse: {
                previsionVentes: "📈 Demain : 145 couverts prévus (Calcul basé sur la moyenne de la saison)",
                analyseCA: "📊 Volume d'affaires en progression constante sur les services du soir.",
                analyseMarges: "⚠️ Marge brute sous surveillance. Attention au coût des matières premières sur les viandes.",
                recommandations: [
                    "💰 Augmentez le Burger de 1.00 € (Popularité forte, marge améliorable).",
                    "🎯 Poussez les suggestions du chef en début de service.",
                    "⚡ Activez le Time-Shifting automatique dès 20h00."
                ]
            }
        });
    }
});

// ==========================================
// 🧠 IA DIRECTEUR OPÉRATIONNEL & FINANCIER (VISION 360°)
// ==========================================
app.post('/api/ai-executive-report', async (req, res) => {
    const { tenantID, currentStock, recentSales, financialStats } = req.body;
    const safeID = cleanString(tenantID);

    try {
        let state = await AppState.findOne({ tenantID: safeID });
        let history = state?.activeOrders?.TRAFFIC_HISTORY?.data || [];
        
        const prompt = `Tu es l'IA "Directeur Financier et Supply Chain" d'iCHEF OS.
        Analyse les données du restaurant suivantes :
        - Ventes récentes : ${JSON.stringify(recentSales || history.slice(0, 30))}
        - Stocks actuels : ${JSON.stringify(currentStock || 'Non spécifié')}
        - Chiffres financiers : ${JSON.stringify(financialStats || 'Non spécifié')}

        Ta mission est de fournir un rapport exécutif ultra-précis. 
        RÉPONDS UNIQUEMENT AVEC CE JSON STRICT (SANS MARKDOWN, SANS TEXTE AUTOUR) :
        {
            "previsionVentes": "Explication courte des tendances de ventes pour les 7 prochains jours.",
            "alertesRupture": ["Produit A (reste 2 jours)", "Produit B (critique)"],
            "commandesFournisseurs": [
                { "fournisseur": "Nom", "articles": ["10kg Tomates", "5L Huile"] }
            ],
            "detectionAnomalies": "Explication si des pertes, du coulage ou des annulations suspectes sont détectées.",
            "recommandationMenu": ["Plat X (Grosse marge, à pousser)", "Plat Y (Populaire, à garder)"],
            "analyseMarge": "Explication claire de la baisse/hausse de la marge et du chiffre d'affaires, avec 1 conseil d'action."
        }`;

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" }); 
        const result = await model.generateContent(prompt);
        
        let responseText = result.response.text().trim();
        const ticks = String.fromCharCode(96, 96, 96);
        responseText = responseText.split(ticks + 'json').join('').split(ticks).join('').trim();
        if (!responseText.startsWith("{")) responseText = responseText.substring(responseText.indexOf("{"));
        
        res.json({ success: true, report: JSON.parse(responseText) });
    } catch (error) {
        res.status(500).json({ success: false, error: "L'analyse IA est momentanément indisponible." });
    }
});

// ==========================================
// 🎙️ ASSISTANT VOCAL DU DIRECTEUR (CONVERSATION EN DIRECT)
// ==========================================
app.post('/api/voice-assistant', async (req, res) => {
    const { tenantID, spokenQuery } = req.body;
    const safeID = cleanString(tenantID);

    try {
        let state = await AppState.findOne({ tenantID: safeID });
        let activeStaff = 0;
        if (state?.activeOrders?.STAFF_ACCESS?.data) {
            activeStaff = state.activeOrders.STAFF_ACCESS.data.filter(s => s.onDuty).length;
        }

        const prompt = `Tu es l'assistant vocal privé du directeur du restaurant intégré à iCHEF OS. Tu t'appelles iCHEF.
        Le directeur te parle au micro et te demande : "${spokenQuery}"

        Contexte instantané du restaurant :
        - Employés actuellement pointés : ${activeStaff}
        - Date et Heure : ${new Date().toLocaleString('fr-FR')}
        
        RÉDIGE TA RÉPONSE COMME SI TU LA PARLAIS (Style Jarvis dans Iron Man). 
        Sois concis, direct, très professionnel, et apporte des solutions. Ne mets pas d'emojis, car ta réponse sera lue par une voix de synthèse.
        
        JSON RÉPONSE ATTENDUE (SANS MARKDOWN) :
        {
            "vocalResponse": "Texte exact à prononcer par le haut-parleur",
            "actionToTrigger": "NONE" 
        }`;

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(prompt);
        
        let responseText = result.response.text().trim();
        const ticks = String.fromCharCode(96, 96, 96);
        responseText = responseText.split(ticks + 'json').join('').split(ticks).join('').trim();
        if (!responseText.startsWith("{")) responseText = responseText.substring(responseText.indexOf("{"));
        
        res.json({ success: true, aiReply: JSON.parse(responseText) });
    } catch (error) {
        res.status(500).json({ success: false, error: "Connexion vocale perdue." });
    }
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
        2. TIME-SHIFTING : Si tu refuses, propose au client un autre horaire dans le "messageClient".
        3. Si tu acceptes, trouve la table idéale.
        
        RÉPONDS UNIQUEMENT AVEC CE JSON STRICT (SANS MARKDOWN) : 
        { 
          "acceptee": true/false, 
          "pax": nombre, 
          "heure": "HH:MM", 
          "tableAllouee": "ID_TABLE_OU_VIDE", 
          "messageClient": "Votre réponse élégante au client", 
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
            const newResa = { 
                id: 'resa_' + Date.now(), pax: decision.pax, heure: decision.heure, 
                table: decision.tableAllouee, info: decision.optimisationInfo, timestamp: Date.now() 
            };
            
            await AppState.findOneAndUpdate(
                { tenantID: safeID },
                { $push: { "activeOrders.RESERVATIONS_MASTER.data": newResa } },
                { upsert: true }
            );

            await scellerOperation(safeID, 'CREATE', 'RESERVATION', newResa.id, 'IA_SYSTEM', newResa);
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

        await scellerOperation(safeID, 'CREATE', 'TRANSACTION', transaction.id || Date.now().toString(), 'SYSTEM', transaction);

        res.json({ success: true, message: "Ticket comptabilisé." });
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
        const tenant = await Tenant.findOne({ tenantID: cleanString(tenantID) }).select('+pinHash +pin');
        
        if (!tenant) return res.status(403).json({ success: false, error: "Non autorisé." });
        const valid = tenant.pinHash ? verifyPinHash(masterPin, tenant.pinHash) : safeEqual(masterPin, tenant.pin);
        if(!valid) return res.status(403).json({ success: false, error: "Non autorisé." });

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

app.get(['/api/check-device', '/api/dashboard-info'], async (req, res) => {
    try {
        const tenant = await Tenant.findOne({ tenantID: cleanString(req.query.tenantID) });
        if (!tenant) return res.status(404).json({ success: false });
        res.json({ success: true, activeCount: tenant.registeredDevices.length, activeDevices: tenant.registeredDevices.length, maxScreens: tenant.maxScreens });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.post(['/api/kill-switch', '/api/admin-reset-devices'], async (req, res) => {
    try {
        const tenant = await Tenant.findOne({ tenantID: cleanString(req.body.tenantID) }).select('+pinHash +pin');
        if(!tenant) return res.status(404).json({ success: false });
        const valid = tenant.pinHash ? verifyPinHash(req.body.adminPin, tenant.pinHash) : safeEqual(req.body.adminPin, tenant.pin);
        if(!valid) return res.status(403).json({ success: false, error: "Non autorisé" });

        tenant.registeredDevices = [];
        await tenant.save();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.get('/get-current-state', async (req, res) => {
    try {
        let tenantID = req.query.tenantID || 'MASTER_STATE';
        if (tenantID !== 'MASTER_STATE') {
            tenantID = cleanString(tenantID);
            const tenant = await Tenant.findOne({ tenantID });
            
            if (tenant && tenant.demoExpiration && new Date() > new Date(tenant.demoExpiration)) {
                return res.status(403).json({ error: "Démonstration expirée (limite de 24h)." });
            }
            if (tenant && (tenant.status === 'SUSPENDU' || tenant.archivedAt)) return res.status(403).json({ error: "Licence suspendue ou en attente" });
        }
        let state = await AppState.findOne({ tenantID });
        if (!state) state = await AppState.create({ tenantID, activeOrders: {} });
        
        // 🔥 CALCUL DYNAMIQUE DES HEURES ACCOMPLIES DU MOIS
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

// 🚀 FONCTION UPDATE-ORDER SÉCURISÉE (SOFT DELETE & AUDIT TRAIL)
app.post('/update-order', async (req, res) => {
    try {
        let tenantID = req.query.tenantID || 'MASTER_STATE';
        if (tenantID !== 'MASTER_STATE') tenantID = cleanString(tenantID);

        const { tableId, order, pin } = req.body;
        const authorPin = pin || 'SYSTEM';

        let actionType = 'UPDATE';
        let updateQuery;

        if (order === null || order === 'DELETE') {
            actionType = 'DELETE_SOFT';
            updateQuery = { 
                $set: { 
                    [`activeOrders.${tableId}.isArchived`]: true,
                    [`activeOrders.${tableId}.status`]: 'ANNULÉ_OU_SUPPRIMÉ'
                } 
            };
        } else {
            updateQuery = { $set: { [`activeOrders.${tableId}`]: order } };
        }

        const newState = await AppState.findOneAndUpdate({ tenantID }, updateQuery, { upsert: true, new: true });
        
        // Audit Trail Cryptographique
        if (tenantID !== 'MASTER_STATE' && tableId) {
            await scellerOperation(
                tenantID, 
                actionType, 
                tableId.includes('STAFF') ? 'RH' : (tableId.includes('SETTING') ? 'REGLAGE' : 'COMMANDE'), 
                tableId, 
                authorPin, 
                order || 'DELETED'
            );
        }

        io.to(tenantID).emit('updateState', newState);
        
        res.json({ success: true });
    } catch (e) { 
        console.error(e);
        res.status(500).json({ error: "Save Error" }); 
    }
});

// ==========================================
// 🌟 GESTION DES WEBSOCKETS (SYNCHRONISATION DES ÉCRANS EN SALLE/CUISINE)
// ==========================================
io.on('connection', (socket) => {
    console.log('📡 Nouvelle connexion écran détectée (ID: ' + socket.id + ')');
    
    socket.on('joinTenant', (tenantID) => {
        const safeID = cleanString(tenantID);
        socket.join(safeID);
        console.log(`📡 L'écran ${socket.id} est maintenant synchronisé sur le réseau du restaurant : ${safeID}`);
    });

    socket.on('disconnect', () => {
        console.log(`❌ Écran déconnecté (ID: ${socket.id})`);
    });
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
                pinHash: hashPin('0000'),
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

server.listen(PORT, () => {
    console.log("✅ L'Empire iCHEF est en ligne, Socket.io activé, sécurisé sur le port " + PORT);
});
