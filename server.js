/**
 * ==============================================================
 * 🧠 iCHEF EMPIRE OS — CORE SERVER FROZEN 50 (2026.09.01)
 * ==============================================================
 * Contrat central stable pour multi-établissements :
 * Réservations · Plan/PAD/Téléphone · Cuisine/Bar/Pâtisserie · Anti-Rush
 * RH · Paiement/Caisse/Fiscal · Administration · Socket.IO.
 * Les évolutions UI doivent rester côté HTML tant que ce contrat suffit.
 */


const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto'); // 🛡️ INTÉGRATION SÉCURITÉ CRYPTO (LOI ANTI-FRAUDE)
const mongoose = require('mongoose');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const twilio = require('twilio'); // 📡 INTÉGRATION TWILIO (SMS/WHATSAPP)
const nodemailer = require('nodemailer');

// 🔥 WEBSOCKETS POUR LE TEMPS RÉEL 🔥
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

app.disable('x-powered-by');
app.use((req, res, next) => {
    const incoming = String(req.headers['x-request-id'] || '').trim();
    const requestId = incoming.slice(0, 120) ||
        (crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex'));
    req.ichefRequestId = requestId;
    res.setHeader('X-Request-ID', requestId);
    next();
});

server.keepAliveTimeout = 65000;
server.headersTimeout = 70000;
server.requestTimeout = 120000;

server.on('clientError', (err, socket) => {
    console.warn('⚠️ HTTP clientError :', err?.message || err);
    if (socket && !socket.destroyed) {
        socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
    }
});

// ==========================================================
// 🌐 CONFIGURATION CORS UNIFIÉE (API + WEBSOCKETS)
// ==========================================================
const ICHEF_DEFAULT_ORIGINS = [
    'https://os.ichef.ch',
    'https://ichef.ch',
    'https://www.ichef.ch',
    'https://tableau-system.onrender.com',
    'http://localhost:10000',
    'http://localhost:3000',
    'http://127.0.0.1:10000',
    'http://127.0.0.1:3000'
];

const ICHEF_ALLOWED_ORIGINS = new Set([
    ...ICHEF_DEFAULT_ORIGINS,
    ...String(process.env.ICHEF_ALLOWED_ORIGINS || '')
        .split(',')
        .map(v => v.trim())
        .filter(Boolean)
]);

function ichefCorsOriginAllowed(origin) {
    if (!origin || origin === 'null') return true;
    if (ICHEF_ALLOWED_ORIGINS.has(origin)) return true;

    try {
        const u = new URL(origin);
        if (
            (u.hostname === 'localhost' || u.hostname === '127.0.0.1') &&
            (u.protocol === 'http:' || u.protocol === 'https:')
        ) return true;

        if (
            u.protocol === 'https:' &&
            (u.hostname.endsWith('.ichef.ch') || u.hostname.endsWith('.onrender.com'))
        ) return true;
    } catch (_) {}

    return false;
}

const corsOptions = {
    origin: function (origin, callback) {
        if (ichefCorsOriginAllowed(origin)) {
            return callback(null, true);
        }
        console.warn('[iCHEF CORS] Origine refusée :', origin);
        return callback(new Error('Origine CORS non autorisée'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'Origin',
        'Accept',
        'X-CSRF-Token',
        'X-iCHEF-Device',
        'X-iCHEF-Master-Device',
        'X-iCHEF-Tenant',
        'X-iCHEF-PIN',
        'Idempotency-Key',
        'X-Requested-With'
    ]
};

// Application du CORS pour les routes classiques (Express / fetch)
app.use(cors(corsOptions));

// Application du CORS pour le Temps Réel (Socket.io)
const io = new Server(server, {
    cors: corsOptions,
    transports: ['websocket', 'polling'],
    allowUpgrades: true,

    // Tolérance réseau renforcée : évite les coupures sur micro-freezes,
    // Wi-Fi instable, onglet momentanément ralenti ou proxy Render.
    pingInterval: 25000,
    pingTimeout: 70000,
    upgradeTimeout: 30000,
    connectTimeout: 45000,

    // Les états iCHEF peuvent être volumineux.
    maxHttpBufferSize: 20 * 1024 * 1024,
    perMessageDeflate: false,

    // Si Socket.IO >= 4.6 : restaure rooms/data et rejoue les paquets manqués
    // après une coupure courte.
    connectionStateRecovery: {
        maxDisconnectionDuration: 2 * 60 * 1000,
        skipMiddlewares: true
    }
});

// Diagnostic bas niveau Engine.IO.
io.engine.on('connection_error', (err) => {
    console.error('[ENGINE.IO] connection_error', {
        code: err?.code,
        message: err?.message,
        context: err?.context
    });
});

// ==========================================
// CONFIGURATION STRIPE iCHEF (Abonnements SaaS & Empreintes)
// ==========================================
const stripeKey = String(process.env.STRIPE_SECRET_KEY || '').trim();
const stripe = stripeKey ? require('stripe')(stripeKey) : null;
if (!stripe) {
    console.warn('⚠️ STRIPE_SECRET_KEY manquante : paiements Stripe désactivés, autres paiements iCHEF disponibles.');
}

// ==========================================
// CONFIGURATION TWILIO UNIQUE & GLOBALE
// ==========================================
const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
const NUMERO_FLAVIEN = '+330641437265'; // Cible des alertes critiques

let twilioClient = null;

if (twilioAccountSid && twilioAuthToken) {
    try {
        twilioClient = twilio(twilioAccountSid, twilioAuthToken);
        console.log("✅ Module Twilio activé et connecté !");
    } catch (err) {
        console.error("❌ Erreur d'initialisation Twilio :", err.message);
    }
} else {
    console.warn("⚠️ Twilio DÉSACTIVÉ : Les variables d'environnement (SID ou Token) sont manquantes.");
}



// ==========================================================
// 🌐 CONFIGURATION HTTP / CORS / CACHE
// ==========================================================

// IMPORTANT : le webhook Stripe doit recevoir le corps BRUT
// avant express.json().
app.use('/webhook', express.raw({ type: 'application/json' }));

// Parsers pour les autres routes.
const ICHEF_HTTP_BODY_LIMIT = process.env.ICHEF_HTTP_BODY_LIMIT || '24mb';
app.use(express.json({ limit: ICHEF_HTTP_BODY_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: ICHEF_HTTP_BODY_LIMIT }));


// ==========================================================
// FICHIER FISCAL PERMANENT iCHEF
// ==========================================================

const fiscalRecordSchema = new mongoose.Schema({
    tenantID: {
        type: String,
        required: true,
        index: true
    },

    recordId: {
        type: String,
        required: true,
        index: true
    },

    type: {
        type: String,
        required: true,
        index: true
    },

    subtype: {
        type: String,
        default: ''
    },

    tableId: {
        type: String,
        default: '',
        index: true
    },

    ticketNumber: {
        type: String,
        default: '',
        index: true
    },

    operationId: {
        type: String,
        default: '',
        index: true
    },

    status: {
        type: String,
        default: ''
    },

    amount: {
        type: Number,
        default: 0
    },

    currency: {
        type: String,
        default: 'CHF'
    },

    operator: {
        type: String,
        default: ''
    },

    terminal: {
        type: String,
        default: ''
    },

    deviceId: {
        type: String,
        default: ''
    },

    details: {
        type: Object,
        default: {}
    },

    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    }

}, {
    minimize: false
});

fiscalRecordSchema.index(
    { tenantID: 1, recordId: 1 },
    { unique: true }
);

const FiscalRecord =
    mongoose.models.FiscalRecord ||
    mongoose.model('FiscalRecord', fiscalRecordSchema);


// ==========================================================
// 💳 DEMANDES DE PAIEMENT STRIPE — PERSISTANCE MONGODB
// Evite de perdre le statut PENDING/PAID lors d'un redémarrage Render.
// ==========================================================
const paymentRequestSchema = new mongoose.Schema({
    tenantID: { type: String, required: true, index: true },
    paymentRequestId: { type: String, required: true, index: true },
    tableId: { type: String, default: '', index: true },
    status: { type: String, default: 'PENDING', index: true },
    amount: { type: Number, default: 0 },
    currency: { type: String, default: 'CHF' },
    stripeSessionId: { type: String, default: '' },
    stripeAccountId: { type: String, default: '' },
    metadata: { type: Object, default: {} },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now, index: true }
}, { minimize: false });

paymentRequestSchema.index(
    { tenantID: 1, paymentRequestId: 1 },
    { unique: true }
);

paymentRequestSchema.index({ status: 1 });
paymentRequestSchema.index(
    { updatedAt: 1 },
    { expireAfterSeconds: 60 * 60 * 24 * 30 }
);

const PaymentRequest =
    mongoose.models.PaymentRequest ||
    mongoose.model('PaymentRequest', paymentRequestSchema);

// Archive RH séparée : protège AppState de la limite MongoDB de 16 Mo.
const rhPunchRecordSchema = new mongoose.Schema({
    tenantID: { type: String, required: true, index: true },
    punchId: { type: String, required: true, index: true },
    staffId: { type: String, required: true, index: true },
    timestamp: { type: Number, required: true, index: true },
    type: { type: String, required: true },
    photo: { type: String, default: '' },
    details: { type: Object, default: {} },
    createdAt: { type: Date, default: Date.now, index: true }
}, { minimize: false });
rhPunchRecordSchema.index({ tenantID: 1, punchId: 1 }, { unique: true });
rhPunchRecordSchema.index({ tenantID: 1, staffId: 1, timestamp: -1 });
const RhPunchRecord = mongoose.models.RhPunchRecord || mongoose.model('RhPunchRecord', rhPunchRecordSchema);


function ichefFiscalId(prefix = 'FISCAL') {
    return (
        prefix +
        '_' +
        Date.now() +
        '_' +
        crypto.randomBytes(8).toString('hex')
    );
}


async function ichefWriteFiscalRecord(data = {}) {

    const tenantID = cleanString(data.tenantID);

    if (!tenantID) {
        return null;
    }

    const recordId =
        String(
            data.recordId ||
            data.operationId ||
            data.ticketNumber ||
            ichefFiscalId(data.type || 'EVENT')
        );

    const record = {
        tenantID,
        recordId,

        type:
            String(data.type || 'EVENT')
                .trim()
                .toUpperCase(),

        subtype:
            String(data.subtype || ''),

        tableId:
            String(data.tableId || ''),

        ticketNumber:
            String(data.ticketNumber || ''),

        operationId:
            String(data.operationId || ''),

        status:
            String(data.status || ''),

        amount:
            Number(data.amount || 0),

        currency:
            String(data.currency || 'CHF')
                .toUpperCase(),

        operator:
            String(data.operator || ''),

        terminal:
            String(data.terminal || ''),

        deviceId:
            String(data.deviceId || ''),

        details:
            data.details &&
            typeof data.details === 'object'
                ? data.details
                : {},

        createdAt:
            data.createdAt
                ? new Date(data.createdAt)
                : new Date()
    };

    try {

        return await FiscalRecord.findOneAndUpdate(
            {
                tenantID,
                recordId
            },
            {
                $setOnInsert: record
            },
            {
                upsert: true,
                new: true
            }
        );

    } catch (error) {

        if (error?.code === 11000) {
            return FiscalRecord.findOne({
                tenantID,
                recordId
            });
        }

        console.error(
            '[iCHEF FiscalRecord]',
            error
        );

        return null;
    }
}


async function ichefFiscalDiagnostic(req, data = {}) {

    try {

        const tenantID =
            cleanString(
                data.tenantID ||
                req?.body?.tenantID ||
                req?.query?.tenantID ||
                req?.headers?.['x-ichef-tenant']
            );

        if (!tenantID) return null;

        return await ichefWriteFiscalRecord({

            tenantID,

            recordId:
                data.recordId ||
                ichefFiscalId('DIAG'),

            type:
                data.type ||
                'DIAGNOSTIC',

            subtype:
                data.code ||
                '',

            tableId:
                data.tableId ||
                req?.body?.tableId ||
                req?.body?.orderSnapshot?.tableId ||
                '',

            ticketNumber:
                data.ticketNumber ||
                '',

            operationId:
                data.operationId ||
                req?.body?.paymentRequestId ||
                req?.headers?.['idempotency-key'] ||
                '',

            status:
                data.status ||
                'INFO',

            operator:
                data.actor ||
                req?.body?.operator ||
                '',

            terminal:
                data.terminal ||
                req?.body?.terminal ||
                '',

            deviceId:
                req?.body?.deviceId ||
                req?.headers?.['x-ichef-device'] ||
                '',

            details: {
                severity:
                    data.severity ||
                    'INFO',

                code:
                    data.code ||
                    '',

                message:
                    data.message ||
                    '',

                source:
                    data.source ||
                    '',

                method:
                    req?.method ||
                    '',

                url:
                    req?.originalUrl ||
                    req?.url ||
                    '',

                ...(data.details || {})
            }

        });

    } catch (error) {

        console.error(
            '[iCHEF diagnostic]',
            error
        );

        return null;
    }
}
// ----------------------------------------------------------
// 🚀 ANTI-CACHE iCHEF
// ----------------------------------------------------------
// Les clients conservent l'URL normale.
// HTML/PWA : toujours vérifier/charger la version actuelle.
// JS/CSS/JSON : revalidation automatique.

app.use((req, res, next) => {
    const requestPath = String(req.path || '').toLowerCase();

    if (
        requestPath.endsWith('.html') ||
        requestPath.endsWith('.htm') ||
        requestPath.endsWith('service-worker.js') ||
        requestPath.endsWith('sw.js') ||
        requestPath.endsWith('manifest.json') ||
        requestPath.endsWith('manifest.webmanifest')
    ) {
        res.setHeader(
            'Cache-Control',
            'no-store, no-cache, must-revalidate, proxy-revalidate'
        );
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.setHeader('Surrogate-Control', 'no-store');
    } else if (
        requestPath.endsWith('.js') ||
        requestPath.endsWith('.css') ||
        requestPath.endsWith('.json')
    ) {
        res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    }

    next();
});

// Une seule déclaration des fichiers statiques.
app.use(express.static(__dirname, { // 👈 OUVERTURE CORRECTE ICI
    etag: true,
    lastModified: true,
    setHeaders: (res, filePath) => {
        const lower = String(filePath || '').toLowerCase();

        if (
            lower.endsWith('.html') ||
            lower.endsWith('.htm') ||
            lower.endsWith('service-worker.js') ||
            lower.endsWith('sw.js') ||
            lower.endsWith('manifest.json') ||
            lower.endsWith('manifest.webmanifest')
        ) {
            res.setHeader(
                'Cache-Control',
                'no-store, no-cache, must-revalidate, proxy-revalidate'
            );
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
            res.setHeader('Surrogate-Control', 'no-store');
        } else if (
            lower.endsWith('.js') ||
            lower.endsWith('.css') ||
            lower.endsWith('.json')
        ) {
            res.setHeader('Cache-Control', 'no-cache, must-revalidate');
        }
    }
})); // 👈 FERMETURE CORRECTE ICI

// 👇 DÉBLOCAGE DES VIDÉOS & RESSOURCES 👇

const PORT = process.env.PORT || 10000;

// SÉCURITÉ MAÎTRE DE L'EMPIRE (Super Admin)
const ADMIN_PASS =
    String(process.env.ADMIN_PASS || '').trim() ||
    crypto.randomBytes(24).toString('hex');

if (!process.env.ADMIN_PASS) {
    console.warn('⚠️ ADMIN_PASS manquant : mot de passe Empire temporaire généré pour ce démarrage.');
}



// 🚨 SÉCURITÉ STRIPE : On utilise raw() uniquement pour la route webhook

const cleanString = (str) => String(str || "").trim().toLowerCase();

const ICHEF_FINANCIAL_CACHE_LIMIT = Math.max(200, Math.min(5000, Number(process.env.ICHEF_FINANCIAL_CACHE_LIMIT || 1200)));
const ICHEF_MAX_STATE_NODE_BYTES = Math.max(512 * 1024, Math.min(12 * 1024 * 1024, Number(process.env.ICHEF_MAX_STATE_NODE_BYTES || 8 * 1024 * 1024)));

function ichefValidStateKey(value) {
    const key = String(value || '').trim();
    return Boolean(key && key.length <= 180 && !/[.$\0]/.test(key));
}

function ichefJsonBytes(value) {
    try { return Buffer.byteLength(JSON.stringify(value ?? null), 'utf8'); }
    catch (_) { return Number.MAX_SAFE_INTEGER; }
}

function ichefBuildFiscalControlToken() {
    return crypto.randomBytes(32).toString('hex');
}

function ichefBuildFiscalControlPath(tenantID, ticketNumber, token) {
    return '/controle-fiscal.html' +
        `?tenantID=${encodeURIComponent(cleanString(tenantID))}` +
        `&ticket=${encodeURIComponent(String(ticketNumber || ''))}` +
        `&token=${encodeURIComponent(String(token || ''))}`;
}


// 🔐 Écritures sérialisées par établissement sur une instance Node.
// Deux restaurants restent parallèles ; un même restaurant ne peut pas avoir
// deux sauvegardes lourdes qui se recouvrent accidentellement.
const ICHEF_TENANT_MUTATION_PATHS = new Set([
    '/update-order', '/api/voice-webhook', '/api/config/qr-nfc',
    '/api/config/cash-register', '/api/rh/punch', '/api/rh/timesheet/correct',
    '/api/rh/timesheet/status', '/api/anti-rush/update', '/api/fiscal/cash-in',
    '/api/save-transaction', '/api/fiscal/correction', '/api/orders/close-paid'
]);
const ichefTenantMutationQueues = new Map();
function ichefRequestTenantID(req) {
    return cleanString(req.query?.tenantID || req.body?.tenantID || req.headers['x-ichef-tenant'] || '');
}
app.use((req, res, next) => {
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(String(req.method || '').toUpperCase())) return next();
    if (!ICHEF_TENANT_MUTATION_PATHS.has(req.path)) return next();
    const tenantID = ichefRequestTenantID(req);
    if (!tenantID) return next();
    const previous = ichefTenantMutationQueues.get(tenantID) || Promise.resolve();
    let releaseCurrent;
    const currentGate = new Promise(resolve => { releaseCurrent = resolve; });
    const currentChain = previous.catch(() => undefined).then(() => currentGate);
    ichefTenantMutationQueues.set(tenantID, currentChain);
    previous.catch(() => undefined).then(() => {
        let released = false;
        let safetyTimer = null;
        const unlock = () => {
            if (released) return;
            released = true;
            if (safetyTimer) clearTimeout(safetyTimer);
            try { releaseCurrent(); } catch (_) {}
            if (ichefTenantMutationQueues.get(tenantID) === currentChain) ichefTenantMutationQueues.delete(tenantID);
        };
        safetyTimer = setTimeout(() => {
            console.error(`[iCHEF LOCK] libération sécurité tenant=${tenantID} path=${req.path}`);
            unlock();
        }, 125000);
        safetyTimer.unref?.();
        res.once('finish', unlock);
        res.once('close', unlock);
        next();
    });
});


// ==========================================================
// ❤️ SANTÉ DU SERVICE
// ==========================================================
app.get('/healthz', (req, res) => {
    return res.status(200).json({
        ok: true,
        service: 'iCHEF',
        uptimeSeconds: Math.round(process.uptime()),
        mongoReadyState: mongoose.connection.readyState,
        socketEngine: true,
        timestamp: new Date().toISOString()
    });
});

app.get('/readyz', (req, res) => {
    const mongoReady = mongoose.connection.readyState === 1;

    return res.status(mongoReady ? 200 : 503).json({
        ready: mongoReady,
        mongoReadyState: mongoose.connection.readyState,
        timestamp: new Date().toISOString()
    });
});

app.get('/', (req, res) => {
    res.setHeader(
        'Cache-Control',
        'no-store, no-cache, must-revalidate, proxy-revalidate'
    );
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.sendFile(path.join(__dirname, 'vitrine.html'));
});

// Ta route d'administration officielle (Tour de Contrôle)
app.get('/panel-ichef', (req, res) => {
    if (req.query.pass === ADMIN_PASS) {
        res.sendFile(path.join(__dirname, 'empire.html'));
    } else {
        res.status(403).send('🛑 Accès Refusé. Sécurité Empire iCHEF.');
    }
});// =========================================================================
// 🚀 MOTEUR IA 5 : PRÉDICTION ANTI-RUSH AVANCÉE (SCORES PAR POSTE & AUTO)
// =========================================================================
app.post('/api/anti-rush-predict', async (req, res) => {
    const { tenantID, isAutoPilotEnabled } = req.body;
    if (!tenantID) return res.status(400).json({ success: false, error: "ID Restaurant manquant" });

    try {
        const safeID = cleanString(tenantID);
        let state = await AppState.findOne({ tenantID: safeID });
        
        let reservations = state?.activeOrders?.RESERVATIONS_MASTER?.data || [];
        let currentOrders = [];
        for (let key in state?.activeOrders) {
            if (!key.includes('MASTER') && !key.includes('ARCHITECTURE')) {
                currentOrders.push(state.activeOrders[key]);
            }
        }

        const prompt = `Tu es l'IA "Directeur des Opérations" d'iCHEF OS.
        Analyse la situation en temps réel :
        - Réservations à venir : ${JSON.stringify(reservations.slice(-20))}
        - Commandes en cours (plats à préparer) : ${JSON.stringify(currentOrders)}
        - Heure actuelle : ${new Date().toLocaleTimeString('fr-FR', {timeZone: "Europe/Paris"})}
        - Mode Pilote Automatique : ${isAutoPilotEnabled ? 'ACTIVÉ' : 'DÉSACTIVÉ'}

        Évalue la tension par poste. 
        RÉPONDS UNIQUEMENT AVEC CE JSON STRICT (SANS BALISE MARKDOWN) :
        {
            "globalLoad": 82,
            "minutesUntilRush": 18,
            "stationScores": {
                "chaud": 85,
                "froid": 40,
                "desserts": 30,
                "bar": 61,
                "salle": 70
            },
            "forecastTimeline": [60, 82, 95, 75], 
            "recommendations": [
                "Préparer 12 burgers",
                "Allumer la seconde friteuse"
            ],
            "autoActionsSuggested": [
                "Activer Time-Shifting (+15min)",
                "Désactiver temporairement les plats complexes"
            ]
        }`;

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent(prompt);
        let responseText = result.response.text();
        
        // --- NETTOYAGE INDESTRUCTIBLE DU JSON ---
        responseText = responseText.replace(/```json/gi, "").replace(/```/g, "").trim();
        const firstBrace = responseText.indexOf('{');
        const lastBrace = responseText.lastIndexOf('}');
        
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace >= firstBrace) {
            responseText = responseText.substring(firstBrace, lastBrace + 1);
        } else {
            throw new Error("Format JSON non trouvé.");
        }
        
        res.json({ success: true, prediction: JSON.parse(responseText) });

    } catch (error) {
        console.error("🚨 Erreur IA Anti-Rush:", error);
        res.status(500).json({ success: false, error: "Analyse momentanément indisponible." });
    }
});
// =========================================================================
// 🔮 MOTEUR IA 4 : PRÉDICTION RH ET PLANNING INTÉLLIGENT
// =========================================================================
app.post('/api/predict-hr-schedule', async (req, res) => {
    const { tenantID, staffList } = req.body;
    const safeID = cleanString(tenantID);

    if (!tenantID) {
        return res.status(400).json({ success: false, error: "ID Restaurant manquant" });
    }

    try {
        // Récupération des données du restaurant (Réservations, Ventes)
        let state = await AppState.findOne({ tenantID: safeID });
        let reservations = state?.activeOrders?.RESERVATIONS_MASTER?.data || [];
        let financialHistory = state?.activeOrders?.FINANCIAL_HISTORY?.data || [];

        const prompt = `Tu es l'IA "Directeur des Ressources Humaines" d'iCHEF OS.
        Analyse les effectifs et l'historique du restaurant pour prédire la charge de travail :
        - Effectif actuel : ${JSON.stringify(staffList)}
        - Réservations récentes : ${JSON.stringify(reservations.slice(-20))}
        - Transactions récentes : ${JSON.stringify(financialHistory.slice(-20))}

        Ta mission est d'optimiser le planning et de prévenir les sous-effectifs.
        RÉPONDS UNIQUEMENT AVEC CE JSON STRICT (SANS AUCUN TEXTE AUTOUR, AUCUNE BALISE MARKDOWN) :
        {
            "rushPeriods": ["Jour HH:MM - HH:MM (Raison/Risque)"],
            "deadPeriods": ["Jour HH:MM - HH:MM (Repos conseillé)"],
            "vacationSuggestions": "Explication claire sur la meilleure période pour accorder des congés.",
            "hiringAdvice": "Explication claire : Faut-il recruter ou l'effectif actuel suffit-il ?"
        }`;

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent(prompt);
        let responseText = result.response.text();
        
        // --- NETTOYAGE INDESTRUCTIBLE DU JSON ---
        responseText = responseText.replace(/```json/gi, "").replace(/```/g, "").trim();
        const firstBrace = responseText.indexOf('{');
        const lastBrace = responseText.lastIndexOf('}');
        
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace >= firstBrace) {
            responseText = responseText.substring(firstBrace, lastBrace + 1);
        } else {
            throw new Error("Impossible de trouver un format JSON dans la réponse de l'IA.");
        }
        
        // Renvoi de la prédiction au frontend (rh.html)
        res.json({ success: true, prediction: JSON.parse(responseText) });

    } catch (error) {
        console.error("🚨 Erreur IA RH Predict:", error);
        res.status(500).json({ success: false, error: "L'analyse IA RH a besoin de plus de données d'historique pour fonctionner." });
    }
});
// =========================================================================
// 🥇 MOTEUR IA 3 : RENTABILITÉ & FOOD-COST (INGÉNIERIE DE MENU)
// =========================================================================
app.post('/api/ai-profitability', async (req, res) => {
    try {
        const { tenantID } = req.body;
        if (!tenantID) return res.status(400).json({ success: false, error: "ID Restaurant manquant" });

        const tenantData = global.tenantsData && global.tenantsData[tenantID] ? global.tenantsData[tenantID] : {};
        const menuCuisine = tenantData['MENU_MASTER']?.data || {};
        const menuBar = tenantData['MENU_MASTER_BAR']?.data || {};

        let allItems = [];

        const estimateCost = (name, price) => {
            const txt = name.toLowerCase();
            if (/vin|champagne|cocktail|bi[eè]re/.test(txt)) return price * 0.25; 
            if (/dessert|patisserie|café/.test(txt)) return price * 0.28;
            if (/plat|burger|viande|poisson/.test(txt)) return price * 0.35; 
            if (/pizza|pâte|pasta/.test(txt)) return price * 0.20; 
            return price * 0.30;
        };

        Object.values(menuCuisine).forEach(arr => allItems.push(...arr));
        Object.values(menuBar).forEach(arr => allItems.push(...arr));

        if (allItems.length === 0) {
            return res.json({
                success: true,
                rentabilite: {
                    topRentable: "N/A",
                    pireRentable: "N/A",
                    margeMoyenne: "0",
                    recommandations: ["Créez vos premiers plats dans la carte pour que l'IA puisse analyser vos marges."]
                }
            });
        }

        let platsAvecMarge = allItems.map(item => {
            let prix = parseFloat(item.price || 0);
            let cout = parseFloat(item.cost || 0) || estimateCost(item.name, prix);
            let marge = prix - cout;
            let pourcentage = prix > 0 ? (marge / prix) * 100 : 0;

            return {
                name: item.name,
                prix: prix,
                cout: cout,
                marge: marge,
                pourcentage: pourcentage
            };
        }).filter(p => p.prix > 0);

        platsAvecMarge.sort((a, b) => b.marge - a.marge);

        let topPlat = platsAvecMarge[0];
        let pirePlat = platsAvecMarge[platsAvecMarge.length - 1];

        let margeTotale = platsAvecMarge.reduce((sum, p) => sum + p.pourcentage, 0);
        let margeMoyenne = (margeTotale / platsAvecMarge.length).toFixed(1);

        let recommandations = [];
        
        if (topPlat && pirePlat) {
            recommandations.push(`⭐ Le plat "${topPlat.name}" rapporte ${topPlat.marge.toFixed(2)} de marge par assiette. Dites à l'équipe en salle de le suggérer en priorité !`);
            
            if (pirePlat.pourcentage < 55) {
                recommandations.push(`📉 Alerte Food-Cost : "${pirePlat.name}" vous coûte trop cher à produire (Ne rapporte que ${pirePlat.marge.toFixed(2)}). Envisagez d'augmenter son prix ou d'ajuster les portions.`);
            }
            
            if (margeMoyenne < 70) {
                recommandations.push(`📦 Votre marge brute moyenne est de ${margeMoyenne}%. Négociez avec vos fournisseurs ou revoyez vos fiches techniques pour dépasser les 70%.`);
            } else {
                recommandations.push(`💰 Excellente gestion ! Votre carte est hautement rentable avec une marge moyenne de ${margeMoyenne}%.`);
            }
        }

        res.json({
            success: true,
            rentabilite: {
                topRentable: topPlat ? topPlat.name : "N/A",
                pireRentable: pirePlat ? pirePlat.name : "N/A",
                margeMoyenne: margeMoyenne,
                recommandations: recommandations
            }
        });

    } catch (error) {
        console.error("Erreur IA Rentabilité :", error);
        res.status(500).json({ success: false, error: "Erreur serveur IA." });
    }
});

// =========================================================================
// 🤖 MOTEUR IA 2 : PRÉVISION DES RÉSERVATIONS ET DU SERVICE
// =========================================================================
app.post('/api/ai-reservation-forecast', async (req, res) => {
    try {
        const { tenantID } = req.body;

        if (!tenantID) {
            return res.status(400).json({ success: false, error: "ID Restaurant manquant" });
        }

        const tenantData = global.tenantsData && global.tenantsData[tenantID] 
                            ? global.tenantsData[tenantID] 
                            : {};

        const reservations = tenantData['RESERVATIONS_MASTER']?.data || [];
        let couvertsAujourdhui = 0;
        const now = new Date();
        const offset = now.getTimezoneOffset() * 60000;
        const todayStr = new Date(now.getTime() - offset).toISOString().split('T')[0];

        reservations.forEach(res => {
            if (!res.date || res.date === todayStr) {
                if (res.status !== 'cancelled' && res.status !== 'annulé') {
                    couvertsAujourdhui += parseInt(res.couverts || res.pax || 0);
                }
            }
        });

        let tendance = "Calme";
        let alerteActive = false;
        let alerteMessage = "";
        let conseils = [];
        let staffSalle = 1;
        let staffCuisine = 1;

        if (couvertsAujourdhui === 0) {
            tendance = "Aucune réservation";
            conseils = [
                "Le cahier est vide pour ce soir. Partagez votre lien de réservation QR sur vos réseaux sociaux.",
                "Vérifiez que votre Menu Web (Click & Collect) est bien activé pour compenser le manque en salle."
            ];
        } else if (couvertsAujourdhui <= 15) {
            tendance = "Calme";
            staffSalle = 1;
            staffCuisine = 1;
            conseils = [
                "Profitez de ce service calme pour avancer sur la mise en place du week-end.",
                "Incitez vos serveurs à proposer des ventes additionnelles (cocktails, cafés gourmands)."
            ];
        } else if (couvertsAujourdhui <= 40) {
            tendance = "Soutenu";
            staffSalle = 2;
            staffCuisine = 2;
            conseils = [
                "Bonne dynamique. Prévoyez une mise en place classique au poste chaud.",
                "Faites un point avec l'équipe sur les plats du jour et les ruptures éventuelles."
            ];
        } else {
            tendance = "Très Intense (Rush)";
            staffSalle = Math.ceil(couvertsAujourdhui / 20);
            staffCuisine = Math.ceil(couvertsAujourdhui / 25);
            alerteActive = true;
            alerteMessage = `Forte affluence (${couvertsAujourdhui} pax). Préparez le Cockpit Anti-Rush !`;
            conseils = [
                "Dès le début du service, activez le Time-Shifting depuis le Cockpit Anti-Rush pour réguler les commandes QR.",
                "Préparez et dressez vos entrées et desserts en avance pour soulager le coup de feu.",
                "Prévoyez un renfort pour l'envoi des boissons (Limonadier)."
            ];
        }

        const ticketMoyenEstimatif = 32.50;
        const caEstime = (couvertsAujourdhui * ticketMoyenEstimatif).toFixed(2);

        const forecast = {
            couverts: couvertsAujourdhui,
            tendance: tendance,
            caEstime: caEstime,
            staffRecommande: `${staffSalle} en salle, ${staffCuisine} en cuisine`,
            alerteActive: alerteActive,
            alerteMessage: alerteMessage,
            conseils: conseils
        };

        res.json({ success: true, forecast: forecast });
    } catch (error) {
        console.error("Erreur Prévision IA :", error);
        res.status(500).json({ success: false, error: "Erreur serveur lors de la prévision." });
    }
});

// =========================================================================
// 🧠 MOTEUR IA : ANALYSE DU SERVICE ET RECOMMANDATIONS (COMPTABLE VIRTUEL)
// =========================================================================
app.post('/api/ai-business-pulse', async (req, res) => {
    try {
        const { tenantID } = req.body;

        if (!tenantID) {
            return res.status(400).json({ success: false, error: "ID Restaurant manquant" });
        }

        const tenantData = global.tenantsData && global.tenantsData[tenantID] 
                            ? global.tenantsData[tenantID] 
                            : {};

        const archiveCaisse = tenantData['FINANCIAL_HISTORY']?.data || [];
        const menuCuisine = tenantData['MENU_MASTER']?.data || {};

        let analyseIA = {};

        if (!archiveCaisse || archiveCaisse.length === 0) {
            analyseIA = {
                previsionVentes: "📊 Prévisions en pause : L'IA a besoin de vos premières ventes pour calculer une tendance fiable.",
                analyseCA: "💤 Caisse en attente : Commencez votre premier service pour voir l'évolution du Chiffre d'Affaires en direct.",
                analyseMarges: "⚙️ Marges non calculées : Ajoutez vos articles et leurs coûts pour activer ce module.",
                recommandations: [
                    "Créez votre carte dans l'onglet 'Carte & Catégories'.",
                    "Passez vos premières commandes via le Pad Serveur.",
                    "L'algorithme s'affinera automatiquement dès votre premier 'Z de Caisse'."
                ]
            };
        } else {
            analyseIA = {
                previsionVentes: "📈 L'algorithme analyse vos ventes en cours...",
                analyseCA: "💰 Calcul du panier moyen en fonction de vos vrais tickets...",
                analyseMarges: "🥩 Food-cost : analyse de la rentabilité de votre carte...",
                recommandations: [
                    "L'analyse de vos tickets est en cours de traitement."
                ]
            };
        }

        res.json({ success: true, pulse: analyseIA });
    } catch (error) {
        console.error("Erreur Moteur IA :", error);
        res.status(500).json({ success: false, error: "Erreur serveur lors de l'analyse." });
    }
});

/// Mémoire vive pour le statut des paiements à table (Stripe Connect)
const activeStripePayments = new Map();
// =========================================================================
// 🚀 GESTION DES CANDIDATURES PARTENAIRES (DEMANDE DE DÉMO)
// =========================================================================
app.post('/api/nouvelle-demande-demo', async (req, res) => {
    try {
        const { tenantID, restaurant, phone, email, details } = req.body;

        if (!tenantID || !restaurant || !phone || !email) {
            return res.status(400).json({ 
                success: false, 
                error: "Veuillez fournir toutes les informations requises." 
            });
        }

        const safeID = cleanString(tenantID);

        const existingTenant = await Tenant.findOne({ tenantID: safeID });
        if (existingTenant) {
             return res.status(409).json({ 
                success: false, 
                error: "Ce nom d'établissement est déjà en cours de traitement." 
            });
        }

        await Tenant.create({
            tenantID: safeID,
            clientName: String(restaurant).trim(),
            email: String(email).trim(),
            phone: String(phone).trim(),
            status: 'SUSPENDU', 
            plan: 'BUSINESS',
            specialite: details?.type || 'resto',
            pin: Math.floor(1000 + Math.random() * 9000).toString(),
            maxScreens: 5,
            maxStaff: 999
        });

        console.log(`✅ Nouvelle candidature enregistrée en base : ${restaurant} (${safeID})`);

        // 📧 ENVOI DE L'EMAIL SÉCURISÉ (Isolé pour éviter l'erreur 500)
        try {
            const gmailUser = String(process.env.GMAIL_USER || '').trim();
            const gmailPassword = String(process.env.GMAIL_APP_PASSWORD || '').trim();
            const alertRecipient = String(process.env.ICHEF_ALERT_EMAIL || 'iche.flavien@ichef.ch').trim();

            if (gmailUser && gmailPassword) {
                const transporter = nodemailer.createTransport({ 
                    service: 'gmail', 
                    auth: { user: gmailUser, pass: gmailPassword } 
                });
                
                await transporter.sendMail({
                    from: gmailUser,
                    to: alertRecipient,
                    subject: `🚨 iCHEF OS - Nouvelle Candidature : ${restaurant}`,
                    html: `
                        <div style="font-family: Arial, sans-serif; color: #111;">
                            <h2 style="color: #d4af37;">Nouvelle demande de déploiement iCHEF OS</h2>
                            <ul style="font-size: 14px; line-height: 1.6;">
                                <li><b>Établissement :</b> ${restaurant}</li>
                                <li><b>ID Système (TenantID) :</b> ${safeID}</li>
                                <li><b>Téléphone :</b> <a href="tel:${phone}">${phone}</a></li>
                                <li><b>Email client :</b> <a href="mailto:${email}">${email}</a></li>
                                <li><b>Secteur :</b> ${details?.type || 'Non spécifié'}</li>
                            </ul>
                        </div>
                    `
                });
                console.log('📧 Email de notification envoyé avec succès.');
            }
        } catch (emailErr) {
            console.error('⚠️ Avertissement : Échec de l\'envoi de l\'e-mail (le client est quand même enregistré) :', emailErr.message);
        }

        return res.status(200).json({ 
            success: true, 
            message: "Candidature enregistrée avec succès.",
            tenantID: safeID
        });

    } catch (error) {
        console.error("🚨 Erreur critique /api/nouvelle-demande-demo :", error);
        return res.status(500).json({ 
            success: false, 
            error: "Erreur interne lors du traitement de votre candidature." 
        });
    }
});
// ==========================================
// 💳 PAIEMENT DES COMMANDES (STRIPE CONNECT)
// ==========================================
app.post('/api/payments/stripe/checkout', async (req, res) => {
    try {
        if (!stripe) {
            return res.status(503).json({
                success: false,
                error: 'Stripe n’est pas configuré sur le serveur.'
            });
        }

        const {
            paymentRequestId,
            tableId,
            amount,
            currency,
            tenantID,
            successUrl,
            cancelUrl
        } = req.body || {};

        const safeID = cleanString(tenantID);
        const requestId = String(paymentRequestId || '').trim();
        const safeTableId = String(tableId || '').trim();
        const safeAmount = Number(amount || 0);

        if (!safeID || !requestId || !safeTableId || !(safeAmount > 0)) {
            return res.status(400).json({
                success: false,
                error: 'Demande de paiement incomplète.'
            });
        }

        const tenant = await Tenant.findOne({ tenantID: safeID }).lean();
        if (!tenant) {
            return res.status(404).json({
                success: false,
                error: 'Restaurant introuvable'
            });
        }

        const stripeAccountId = tenant.config?.stripeAccountId;
        if (!stripeAccountId) {
            return res.status(400).json({
                success: false,
                error: 'Le compte Stripe du restaurant n’est pas configuré.'
            });
        }

        const existing = await PaymentRequest.findOne({
            tenantID: safeID,
            paymentRequestId: requestId
        }).lean();

        if (existing?.status === 'PAID') {
            return res.json({
                success: true,
                idempotent: true,
                status: 'PAID',
                paymentRequestId: requestId
            });
        }

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: String(currency || 'chf').toLowerCase(),
                    product_data: {
                        name: `Table ${safeTableId} - Restaurant ${tenant.clientName || safeID}`
                    },
                    unit_amount: Math.round(safeAmount * 100)
                },
                quantity: 1
            }],
            mode: 'payment',
            success_url: successUrl,
            cancel_url: cancelUrl,
            client_reference_id: requestId,
            metadata: {
                type: 'ORDER_PAYMENT',
                tenantID: safeID,
                tableId: safeTableId,
                paymentRequestId: requestId
            }
        }, {
            stripeAccount: stripeAccountId
        });

        activeStripePayments.set(requestId, 'PENDING');

        await PaymentRequest.findOneAndUpdate(
            {
                tenantID: safeID,
                paymentRequestId: requestId
            },
            {
                $set: {
                    tableId: safeTableId,
                    status: 'PENDING',
                    amount: safeAmount,
                    currency: String(currency || 'CHF').toUpperCase(),
                    stripeSessionId: String(session.id || ''),
                    stripeAccountId,
                    updatedAt: new Date(),
                    metadata: {
                        successUrl: String(successUrl || ''),
                        cancelUrl: String(cancelUrl || '')
                    }
                },
                $setOnInsert: {
                    createdAt: new Date()
                }
            },
            {
                upsert: true,
                new: true
            }
        );

        return res.json({
            success: true,
            url: session.url,
            paymentRequestId: requestId,
            status: 'PENDING'
        });

    } catch (error) {
        console.error('Erreur Stripe Checkout Client:', error);
        return res.status(500).json({
            success: false,
            error: error?.message || 'Erreur Stripe.'
        });
    }
});

app.get('/api/payments/stripe/status', async (req, res) => {
    const paymentRequestId =
        String(req.query?.paymentRequestId || '').trim();
    const tenantID =
        cleanString(
            req.query?.tenantID ||
            req.headers['x-ichef-tenant']
        );

    if (!paymentRequestId) {
        return res.status(400).json({
            success: false,
            error: 'paymentRequestId manquant.'
        });
    }

    try {
        let stored = null;

        if (tenantID) {
            stored = await PaymentRequest.findOne({
                tenantID,
                paymentRequestId
            }).lean();
        } else {
            stored = await PaymentRequest.findOne({
                paymentRequestId
            }).lean();
        }

        const status =
            stored?.status ||
            activeStripePayments.get(paymentRequestId) ||
            'PENDING';

        return res.json({
            success: true,
            status,
            paymentRequestId
        });
    } catch (error) {
        return res.json({
            success: true,
            status:
                activeStripePayments.get(paymentRequestId) ||
                'PENDING',
            paymentRequestId,
            degraded: true
        });
    }
});

// ==========================================
// WEBHOOK STRIPE : SÉCURITÉ ANTI-IMPAYÉS & UPSELL 
// ==========================================
app.post('/webhook', async (req, res) => {
    if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
        return res.status(503).json({
            received: false,
            error: 'Stripe webhook non configuré.'
        });
    }

    const sig = req.headers['stripe-signature'];
    let event;
    try {
        event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;

        // 👈 NOUVEAU BLOC : Encaissement d'une commande client au restaurant
        if (session.metadata && session.metadata.type === 'ORDER_PAYMENT') {
            const reqId = String(session.metadata.paymentRequestId || '');
            const safeID = cleanString(session.metadata.tenantID);

            activeStripePayments.set(reqId, 'PAID');

            if (reqId && safeID) {
                await PaymentRequest.findOneAndUpdate(
                    {
                        tenantID: safeID,
                        paymentRequestId: reqId
                    },
                    {
                        $set: {
                            status: 'PAID',
                            stripeSessionId: String(session.id || ''),
                            updatedAt: new Date()
                        },
                        $setOnInsert: {
                            tableId: String(session.metadata.tableId || ''),
                            amount: Number(session.amount_total || 0) / 100,
                            currency: String(session.currency || 'CHF').toUpperCase(),
                            createdAt: new Date()
                        }
                    },
                    {
                        upsert: true,
                        new: true
                    }
                );
            }

            console.log(`✅ Paiement Stripe Connect validé pour la commande : ${reqId}`);
            return res.json({ received: true });
        }

        // Bloc existant pour tes abonnements iCHEF
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

                // 🔓 Un achat officiel supprime toute expiration de démo
                await Tenant.updateOne(
                    { tenantID: safeID },
                    { 
                        $set: { status: 'ACTIF', config: { stripeCustomerId: session.customer } },
                        $unset: { demoExpiration: "" },
                        $setOnInsert: { plan: planAchete, maxScreens: limitScreens, maxStaff: limitStaff, pin: Math.floor(1000 + Math.random() * 9000).toString() }
                    },
                    { upsert: true }
                );
            } catch(e) {}
        }
    }
    res.json({received: true});
});

const mongoURI = String(process.env.MONGO_URI || '').trim();

mongoose.set('bufferCommands', false);

const ICHEF_MONGO_MAX_POOL =
    Math.max(10, Math.min(100, Number(process.env.MONGO_MAX_POOL_SIZE || 50)));
const ICHEF_MONGO_MIN_POOL =
    Math.max(0, Math.min(ICHEF_MONGO_MAX_POOL, Number(process.env.MONGO_MIN_POOL_SIZE || 2)));

if (!mongoURI) {
    console.error('❌ MONGO_URI manquante : le serveur reste vivant mais /readyz restera en 503.');
} else {
    mongoose.connect(mongoURI, {
        serverSelectionTimeoutMS: 15000,
        socketTimeoutMS: 60000,
        waitQueueTimeoutMS: 10000,
        maxPoolSize: ICHEF_MONGO_MAX_POOL,
        minPoolSize: ICHEF_MONGO_MIN_POOL,
        maxIdleTimeMS: 60000,
        heartbeatFrequencyMS: 10000,
        retryWrites: true
    })
        .then(() => console.log(
            `✅ Base de données iCHEF Online | pool=${ICHEF_MONGO_MIN_POOL}-${ICHEF_MONGO_MAX_POOL}`
        ))
        .catch(err => {
            console.error('❌ MongoDB connexion initiale :', err.message);
        });
}

mongoose.connection.on('connected', () => {
    console.log('✅ MongoDB connecté.');
});

mongoose.connection.on('reconnected', () => {
    console.log('✅ MongoDB reconnecté.');
});

mongoose.connection.on('disconnected', () => {
    console.warn('⚠️ MongoDB déconnecté — reconnexion automatique en cours.');
});

mongoose.connection.on('error', err => {
    console.error('❌ MongoDB erreur :', err?.message || err);
});

// ==========================================================
// 🏢 TENANT / LICENCE
// ==========================================================

const tenantSchema = new mongoose.Schema({
siret: { type: String, default: 'NON RENSEIGNÉ' },
    tvaIntra: { type: String, default: 'NON RENSEIGNÉ' },
    
    tenantID: {type: String,required: true, unique: true},

    clientName: String,email: String,phone: String,

    status: {
        type: String,
        enum: ['ACTIF', 'SUSPENDU'],
        default: 'ACTIF'
    },

    plan: {
        type: String,

        enum: [
            'CHEF_CUISINE',
            'CHEF_PATISSERIE',
            'CHEF_BAR',
            'ICHEF_OS',
            'RENTABILITE',
            'BRIGADES',
            'BRIGADE',
            'BUSINESS',
            'ECO',
            'PREMIUM',
            'CHEF',
            'PATISSIER',
            'BAR',
            'EMPIRE',
            'PACK_A'
        ],

        default: 'BUSINESS'
    },

    specialite: {
        type: String,
        default: 'cuisine'
    },

    pin: {
        type: String,
        default: '9999'
    },

    maxScreens: {
        type: Number,
        default: 5
    },

    maxStaff: {
        type: Number,
        default: 999
    },

    registeredDevices: {
        type: [String],
        default: []
    },

config: {
        stripeCustomerId: String,
        stripeAccountId: String // 👈 NOUVEAU : L'ID Stripe Connect du restaurant (ex: acct_1N2b...)
    },

    demoExpiration: {
        type: Date
    }
});


const Tenant = mongoose.model('Tenant', tenantSchema);


// ==========================================================
// 🖥️ NOMBRE D'ÉCRANS AUTORISÉS PAR PLAN
// ==========================================================

function getPlanScreenLimit(plan) {

    const normalizedPlan =
        String(plan || 'BUSINESS')
            .trim()
            .toUpperCase();

    // Plans individuels
    if ([
        'CHEF_CUISINE',
        'CHEF_PATISSERIE',
        'CHEF_BAR',
        'CHEF',
        'PATISSIER',
        'BAR'
    ].includes(normalizedPlan)) {

        return 1;
    }

    // Pack restaurant standard
    if ([
        'BUSINESS',
        'RENTABILITE',
        'ECO',
        'PACK_A',
        'ICHEF_OS'
    ].includes(normalizedPlan)) {

        return 5;
    }

    // Gros établissements
    if ([
        'EMPIRE',
        'BRIGADE',
        'BRIGADES',
        'PREMIUM'
    ].includes(normalizedPlan)) {

        return 50;
    }

    // Sécurité par défaut
    return 5;
}


// ==========================================================
// 🔄 SYNCHRONISATION DE LA LICENCE
// ==========================================================

async function syncTenantScreenLimit(tenant) {

    if (!tenant) {
        return 5;
    }

    const basePlanLimit =
        getPlanScreenLimit(tenant.plan);

    const currentLimit =
        Number(tenant.maxScreens);

    // Garde les écrans supplémentaires déjà achetés
    const effectiveLimit =
        Number.isFinite(currentLimit) && currentLimit > 0
            ? Math.max(currentLimit, basePlanLimit)
            : basePlanLimit;

    if (currentLimit !== effectiveLimit) {

        tenant.maxScreens = effectiveLimit;

        await tenant.save();

        console.log(
            `🖥️ Limite écrans mise à jour : ` +
            `${tenant.tenantID} → ${effectiveLimit}`
        );
    }

    return effectiveLimit;
}


// ==========================================================
// 📦 ÉTAT DU RESTAURANT
// ==========================================================

const AppState = mongoose.model(
    'AppState',

    new mongoose.Schema({

        tenantID: {
            type: String,
            required: true,
            unique: true
        },

        activeOrders: {
            type: Object,
            default: {}
        }

    }, {
        minimize: false
    })
);


// =============================================================
// 🛡️ INITIALISATION SÉCURITÉ DU PAD
// =============================================================

app.post('/api/security/bootstrap', async (req, res) => {

    try {

        const tenantID =
            cleanString(req.body?.tenantID);

        const deviceId =
            String(req.body?.deviceId || '').trim();


        if (
            !tenantID ||
            !/^[a-z0-9_-]{2,80}$/.test(tenantID)
        ) {

            return res.status(400).json({
                success: false,
                error: 'Identifiant restaurant invalide.'
            });
        }


        const tenant =
            await Tenant.findOne({ tenantID });


        if (!tenant) {

            return res.status(404).json({
                success: false,
                error: 'Établissement inconnu.'
            });
        }


        if (
            tenant.demoExpiration &&
            new Date() >
                new Date(tenant.demoExpiration)
        ) {

            return res.status(403).json({
                success: false,
                error: 'Démonstration expirée.'
            });
        }


        if (tenant.status === 'SUSPENDU') {

            return res.status(403).json({
                success: false,
                error: 'Licence suspendue.'
            });
        }


        const screenLimit =
            await syncTenantScreenLimit(tenant);


        const registeredDevices =
            Array.isArray(tenant.registeredDevices)
                ? tenant.registeredDevices
                : [];


        const csrfToken =
            crypto.randomBytes(32)
                .toString('hex');


        return res.json({

            success: true,

            authenticated: false,

            requiresPin: true,

            csrfToken,

            tenantID:
                tenant.tenantID,

            maxScreens:
                screenLimit,

            registeredScreens:
                registeredDevices.length,

            availableScreens:
                Math.max(
                    0,
                    screenLimit -
                    registeredDevices.length
                ),

            deviceRegistered:
                deviceId
                    ? registeredDevices.includes(deviceId)
                    : false
        });


    } catch (error) {

        console.error(
            'Erreur bootstrap :',
            error
        );

        return res.status(500).json({
            success: false,
            error: 'Erreur serveur.'
        });
    }
});
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
auditLogSchema.index({ tenantID: 1, timestamp: 1, _id: 1 });
const AuditLog = mongoose.model('AuditLog', auditLogSchema);


// ==========================================================
// 🧾 TRAÇABILITÉ CENTRALE iCHEF — TOUS LES TERMINAUX
// ==========================================================
// Objectifs :
// 1) conserver un historique durable séparé de la table active ;
// 2) garder un cache AUDIT_MASTER dans AppState pour les écrans iCHEF ;
// 3) retransmettre immédiatement les nouvelles traces à tous les postes du tenant.
const ICHEF_AUDIT_MASTER_LIMIT = Math.max(
    100,
    Math.min(2000, Number(process.env.ICHEF_AUDIT_MASTER_LIMIT || 600))
);

const systemHistorySchema = new mongoose.Schema({
    tenantID: { type: String, required: true, index: true },
    historyId: { type: String, required: true, index: true },
    at: { type: Date, default: Date.now, index: true },
    tableId: { type: String, default: '', index: true },
    serviceId: { type: String, default: '', index: true },
    entityType: { type: String, default: 'SYSTEME', index: true },
    entityId: { type: String, default: '' },
    action: { type: String, required: true },
    detail: { type: String, default: '' },
    operator: { type: String, default: '' },
    role: { type: String, default: '' },
    terminal: { type: String, default: '' },
    deviceId: { type: String, default: '' },
    source: { type: String, default: 'SERVEUR' },
    line: { type: Object, default: null },
    meta: { type: Object, default: {} }
}, { minimize: false });

systemHistorySchema.index({ tenantID: 1, historyId: 1 }, { unique: true });
systemHistorySchema.index({ tenantID: 1, tableId: 1, at: -1 });

const SystemHistoryRecord =
    mongoose.models.SystemHistoryRecord ||
    mongoose.model('SystemHistoryRecord', systemHistorySchema);

function ichefHistoryId(prefix = 'HIST') {
    return `${prefix}_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
}

function ichefHistoryServiceId(order, tableId = '') {
    if (!order || typeof order !== 'object') return '';
    const explicit = String(
        order.serviceId ||
        order.orderSessionId ||
        order.serviceSessionId ||
        ''
    ).trim();
    if (explicit) return explicit;
    const created = Number(order.createdAt || order.openedAt || 0);
    return created ? `LEGACY_${String(tableId || '')}_${created}` : '';
}

function ichefHistoryItemId(item, index = 0) {
    if (!item || typeof item !== 'object') return `IDX_${index}`;
    return String(
        item.lineId || item.itemId || item.id || item.uuid || item._id ||
        `${item.name || item.n || item.label || 'ITEM'}_${item.seat || item.guestSeat || item.seatNumber || 0}_${item.createdAt || index}`
    );
}

function ichefHistoryItemName(item) {
    return String(item?.name || item?.n || item?.label || item?.title || 'Article').trim();
}

function ichefHistoryLineSnapshot(item) {
    if (!item || typeof item !== 'object') return null;
    return {
        lineId: String(item.lineId || item.itemId || item.id || ''),
        name: ichefHistoryItemName(item),
        qty: Number(item.qty ?? item.quantity ?? 1) || 1,
        seat: Number(item.seat ?? item.guestSeat ?? item.seatNumber ?? 0) || 0,
        cooking: String(item.cooking || item.cuisson || ''),
        observation: String(item.obs || item.observation || item.note || ''),
        destination: String(item.dest || item.destination || item.station || ''),
        status: String(item.status || ''),
        ready: item.ready === true,
        served: item.served === true,
        cancelled: item.cancelled === true
    };
}

function ichefHistoryActor(access = {}, body = {}) {
    const staff = access?.staff && typeof access.staff === 'object' ? access.staff : {};
    const operator = String(
        body.operator ||
        body.waiter ||
        staff.name ||
        staff.displayName ||
        staff.id ||
        access.role ||
        staff.role ||
        staff.dept ||
        body.terminal ||
        'SYSTEME'
    ).trim();
    const role = String(
        access.role || staff.role || staff.dept || body.role || ''
    ).trim();
    return { operator, role };
}

function ichefCentralHistoryEntry(data = {}) {
    const at = data.at || new Date().toISOString();
    const id = String(data.id || data.historyId || ichefHistoryId('HIST'));
    return {
        id,
        historyId: id,
        at,
        tableId: String(data.tableId || ''),
        serviceId: String(data.serviceId || ''),
        entityType: String(data.entityType || 'COMMANDE'),
        entityId: String(data.entityId || data.tableId || ''),
        action: String(data.action || 'MISE À JOUR'),
        detail: String(data.detail || ''),
        by: String(data.by || data.operator || 'SYSTEME'),
        operator: String(data.operator || data.by || 'SYSTEME'),
        role: String(data.role || ''),
        terminal: String(data.terminal || 'INCONNU'),
        deviceId: String(data.deviceId || ''),
        source: String(data.source || 'SERVEUR'),
        line: data.line && typeof data.line === 'object' ? data.line : null,
        meta: data.meta && typeof data.meta === 'object' ? data.meta : {}
    };
}

function ichefBuildCentralHistoryEntries(before, after, context = {}) {
    const tableId = String(context.tableId || '');
    if (!tableId || tableId === 'AUDIT_MASTER') return [];

    const entries = [];
    const serviceId = ichefHistoryServiceId(after || before, tableId);
    const base = {
        tableId,
        serviceId,
        operator: context.operator || 'SYSTEME',
        by: context.operator || 'SYSTEME',
        role: context.role || '',
        terminal: context.terminal || 'INCONNU',
        deviceId: context.deviceId || '',
        source: context.source || 'update-order',
        entityType: Array.isArray(after?.items) || Array.isArray(before?.items) ? 'COMMANDE' : 'ETAT',
        entityId: tableId
    };
    const push = (action, detail = '', line = null, meta = {}) => {
        entries.push(ichefCentralHistoryEntry({ ...base, action, detail, line, meta }));
    };

    if (after === null || after === undefined) {
        push(
            Array.isArray(before?.items) ? 'TABLE LIBÉRÉE / COMMANDE SUPPRIMÉE' : `SUPPRESSION ${tableId}`,
            context.auditReason || ''
        );
        return entries;
    }

    if (!before || typeof before !== 'object') {
        if (Array.isArray(after?.items)) {
            push('TABLE / SERVICE OUVERT', context.auditReason || '');
        } else {
            push(context.auditReason || `CRÉATION / MISE À JOUR ${tableId}`);
        }
    }

    const beforeItems = Array.isArray(before?.items) ? before.items : [];
    const afterItems = Array.isArray(after?.items) ? after.items : [];

    if (beforeItems.length || afterItems.length) {
        const oldMap = new Map(beforeItems.map((item, idx) => [ichefHistoryItemId(item, idx), item]));
        const newMap = new Map(afterItems.map((item, idx) => [ichefHistoryItemId(item, idx), item]));

        for (const [key, item] of newMap.entries()) {
            const previous = oldMap.get(key);
            const line = ichefHistoryLineSnapshot(item);
            const name = ichefHistoryItemName(item);

            if (!previous) {
                push(`AJOUT · ${name}`, context.auditReason || '', line);
                continue;
            }

            const prevReady = previous.ready === true || String(previous.status || '').toUpperCase() === 'READY' || String(previous.status || '').toUpperCase() === 'PRÊT';
            const nextReady = item.ready === true || String(item.status || '').toUpperCase() === 'READY' || String(item.status || '').toUpperCase() === 'PRÊT';
            const prevServed = previous.served === true || String(previous.status || '').toUpperCase() === 'SERVED' || String(previous.status || '').toUpperCase() === 'SERVI';
            const nextServed = item.served === true || String(item.status || '').toUpperCase() === 'SERVED' || String(item.status || '').toUpperCase() === 'SERVI';
            const prevSent = previous.isSent === true || previous.fired === true || Boolean(previous.sentAt);
            const nextSent = item.isSent === true || item.fired === true || Boolean(item.sentAt);
            const prevCancelled = previous.cancelled === true;
            const nextCancelled = item.cancelled === true;

            if (!prevSent && nextSent) push(`ENVOYÉ · ${name}`, context.auditReason || '', line);
            if (!prevReady && nextReady) push(`PRÊT · ${name}`, context.auditReason || '', line);
            if (!prevServed && nextServed) push(`SERVICE EFFECTUÉ · ${name}`, context.auditReason || '', line);
            if (!prevCancelled && nextCancelled) push(`ANNULÉ · ${name}`, context.auditReason || String(item.cancelReason || item.cancellationReason || ''), line);

            const prevCooking = String(previous.cooking || previous.cuisson || '');
            const nextCooking = String(item.cooking || item.cuisson || '');
            if (prevCooking !== nextCooking && nextCooking) {
                push(`CUISSON MODIFIÉE · ${name}`, `${prevCooking || '—'} → ${nextCooking}`, line);
            }

            const prevObs = String(previous.obs || previous.observation || previous.note || '');
            const nextObs = String(item.obs || item.observation || item.note || '');
            if (prevObs !== nextObs) {
                push(`OBSERVATION MODIFIÉE · ${name}`, nextObs || 'Observation supprimée', line);
            }

            const prevQty = Number(previous.qty ?? previous.quantity ?? 1) || 1;
            const nextQty = Number(item.qty ?? item.quantity ?? 1) || 1;
            if (prevQty !== nextQty) {
                push(`QUANTITÉ MODIFIÉE · ${name}`, `${prevQty} → ${nextQty}`, line);
            }
        }

        for (const [key, item] of oldMap.entries()) {
            if (!newMap.has(key)) {
                push(`ARTICLE RETIRÉ · ${ichefHistoryItemName(item)}`, context.auditReason || '', ichefHistoryLineSnapshot(item));
            }
        }
    }

    const beforePax = Number(before?.pax ?? before?.guests ?? 0) || 0;
    const afterPax = Number(after?.pax ?? after?.guests ?? 0) || 0;
    if (before && beforePax !== afterPax) push('PAX MODIFIÉ', `${beforePax} → ${afterPax}`);

    for (const field of ['status', 'paymentStatus', 'fiscalStatus']) {
        const a = String(before?.[field] || '');
        const b = String(after?.[field] || '');
        if (before && a !== b && b) push(`${field.toUpperCase()} · ${b}`, a ? `${a} → ${b}` : b);
    }

    if (!entries.length && context.auditReason) {
        push(context.auditReason);
    }
    if (!entries.length) {
        push(`MISE À JOUR ${tableId}`);
    }

    // Une seule écriture client ne doit pas exploser la taille du journal.
    return entries.slice(0, 40);
}

function ichefAuditMasterArray(raw) {
    if (Array.isArray(raw)) return raw;
    if (Array.isArray(raw?.data)) return raw.data;
    return [];
}

function ichefBuildAuditMasterNode(raw, entries = []) {
    const current = ichefAuditMasterArray(raw);
    const merged = [...(Array.isArray(entries) ? entries : []), ...current];
    const seen = new Set();
    const unique = [];
    for (const event of merged) {
        if (!event || typeof event !== 'object') continue;
        const id = String(event.id || event.historyId || '');
        const sig = id || [event.at, event.tableId, event.action, event.deviceId].map(v => String(v || '')).join('|');
        if (seen.has(sig)) continue;
        seen.add(sig);
        unique.push(event);
        if (unique.length >= ICHEF_AUDIT_MASTER_LIMIT) break;
    }
    return {
        version: 2,
        updatedAt: new Date().toISOString(),
        data: unique
    };
}

function ichefAppendAuditMasterInMemory(state, entries = []) {
    if (!state || !Array.isArray(entries) || !entries.length) return;
    if (!state.activeOrders || typeof state.activeOrders !== 'object') state.activeOrders = {};
    state.activeOrders.AUDIT_MASTER =
        ichefBuildAuditMasterNode(state.activeOrders.AUDIT_MASTER, entries);
}

async function ichefArchiveCentralHistory(tenantID, entries = []) {
    const safeID = cleanString(tenantID);
    if (!safeID || !Array.isArray(entries) || !entries.length) return;
    const ops = entries.map(event => ({
        updateOne: {
            filter: { tenantID: safeID, historyId: String(event.historyId || event.id) },
            update: {
                $setOnInsert: {
                    tenantID: safeID,
                    historyId: String(event.historyId || event.id),
                    at: new Date(event.at || Date.now()),
                    tableId: String(event.tableId || ''),
                    serviceId: String(event.serviceId || ''),
                    entityType: String(event.entityType || 'SYSTEME'),
                    entityId: String(event.entityId || ''),
                    action: String(event.action || 'MISE À JOUR'),
                    detail: String(event.detail || ''),
                    operator: String(event.operator || event.by || ''),
                    role: String(event.role || ''),
                    terminal: String(event.terminal || ''),
                    deviceId: String(event.deviceId || ''),
                    source: String(event.source || 'SERVEUR'),
                    line: event.line && typeof event.line === 'object' ? event.line : null,
                    meta: event.meta && typeof event.meta === 'object' ? event.meta : {}
                }
            },
            upsert: true
        }
    }));
    try {
        await SystemHistoryRecord.bulkWrite(ops, { ordered: false });
    } catch (error) {
        if (error?.code !== 11000) {
            console.warn('[iCHEF HISTORIQUE CENTRAL] archivage :', error?.message || error);
        }
    }
}

function ichefHistoryEntryFromSealedAudit(payload = {}, created = null) {
    const details = payload.details && typeof payload.details === 'object' ? payload.details : {};
    const tableId = String(
        details.tableId || details.table || details.orderSnapshot?.tableId ||
        (String(payload.entityType || '').toUpperCase().includes('TABLE') ? payload.entityId : '') || ''
    );
    const ticket = String(details.ticketNumber || details.originalTicketNumber || details.orderSnapshot?.ticketNumber || '');
    const actor = String(
        details.operator || details.waiter || details.staffName || details.actor?.name || details.actor?.role ||
        (String(payload.authorPin || '').match(/^\d{4,12}$/) ? '' : payload.authorPin) ||
        'SYSTEME'
    );
    return ichefCentralHistoryEntry({
        id: created?._id ? `AUDIT_${String(created._id)}` : ichefHistoryId('AUDIT'),
        at: created?.timestamp || new Date().toISOString(),
        tableId,
        serviceId: String(details.serviceId || details.orderSnapshot?.serviceId || ''),
        entityType: String(payload.entityType || 'SYSTEME'),
        entityId: String(payload.entityId || ''),
        action: String(payload.action || 'AUDIT'),
        detail: ticket ? `Ticket ${ticket}` : String(details.reason || details.auditReason || details.type || ''),
        operator: actor,
        by: actor,
        role: String(details.role || details.dept || ''),
        terminal: String(details.terminal || details.source || 'SERVEUR'),
        deviceId: String(details.deviceId || ''),
        source: 'AUDIT_CRYPTO',
        meta: {
            ticketNumber: ticket,
            fiscal: String(payload.entityType || '').toUpperCase().includes('PAIEMENT')
        }
    });
}

async function ichefMirrorCentralHistoryToState(tenantID, entries = []) {
    const safeID = cleanString(tenantID);
    if (!safeID || !Array.isArray(entries) || !entries.length) return null;
    try {
        const before = await AppState.findOne(
            { tenantID: safeID },
            { 'activeOrders.AUDIT_MASTER': 1 }
        ).lean();
        const auditNode = ichefBuildAuditMasterNode(
            before?.activeOrders?.AUDIT_MASTER,
            entries
        );
        const state = await AppState.findOneAndUpdate(
            { tenantID: safeID },
            { $set: { 'activeOrders.AUDIT_MASTER': auditNode } },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        ).lean();

        await ichefArchiveCentralHistory(safeID, entries);

        if (state) {
            io.to(safeID).emit('auditUpdated', {
                tenantID: safeID,
                entries,
                timestamp: new Date().toISOString()
            });

            // Certaines routes continuent leur traitement après scellerOperation() et peuvent
            // réémettre un ancien objet state. Ce rappel différé relit MongoDB afin que
            // tous les terminaux finissent toujours avec l'état réellement persistant.
            const timer = setTimeout(async () => {
                try {
                    const fresh = await AppState.findOne({ tenantID: safeID }).lean();
                    if (!fresh) return;
                    io.to(safeID).emit('updateState', fresh);
                    io.to(safeID).emit('server-state-changed', {
                        tenantID: safeID,
                        tableId: String(entries[0]?.tableId || ''),
                        source: 'audit-central',
                        persisted: true,
                        timestamp: new Date().toISOString()
                    });
                } catch (refreshError) {
                    console.warn('[iCHEF HISTORIQUE CENTRAL] rediffusion :', refreshError?.message || refreshError);
                }
            }, 50);
            timer.unref?.();
        }
        return state;
    } catch (error) {
        console.warn('[iCHEF HISTORIQUE CENTRAL] miroir AppState :', error?.message || error);
        return null;
    }
}

const ichefAuditWriteQueues = new Map();

function ichefSerializeAuditWrite(tenantID, task) {
    const key = String(tenantID || '');
    const previous = ichefAuditWriteQueues.get(key) || Promise.resolve();

    const current = previous
        .catch(() => undefined)
        .then(task);

    ichefAuditWriteQueues.set(key, current);

    current.finally(() => {
        if (ichefAuditWriteQueues.get(key) === current) {
            ichefAuditWriteQueues.delete(key);
        }
    }).catch(() => {});

    return current;
}

async function scellerOperation(
    tenantID,
    action,
    entityType,
    entityId,
    authorPin,
    details
) {
    const safeID = cleanString(tenantID);

    if (!safeID) return null;

    return ichefSerializeAuditWrite(
        safeID,
        async () => {
            try {
                const lastLog = await AuditLog
                    .findOne({ tenantID: safeID })
                    .sort({ timestamp: -1, _id: -1 })
                    .lean();

                const previousHash =
                    lastLog?.currentHash ||
                    'GENESIS_BLOCK_0000000000000000';

                const payload = {
                    tenantID: safeID,
                    action: String(action || 'EVENT'),
                    entityType: String(entityType || 'SYSTEM'),
                    entityId: String(entityId || ichefFiscalId('AUDIT')),
                    authorPin: String(authorPin || 'SYSTEM'),
                    details:
                        details && typeof details === 'object'
                            ? details
                            : { value: details },
                    previousHash
                };

                const currentHash = crypto
                    .createHash('sha256')
                    .update(JSON.stringify(payload))
                    .digest('hex');

                const created = await AuditLog.create({
                    ...payload,
                    currentHash
                });

                // Chaque opération scellée est aussi versée au journal central partagé.
                // Aucun PIN numérique n'est recopié dans le journal lisible par les écrans.
                try {
                    const centralEntry = ichefHistoryEntryFromSealedAudit(payload, created);
                    await ichefMirrorCentralHistoryToState(safeID, [centralEntry]);
                } catch (historyError) {
                    console.warn('[iCHEF HISTORIQUE CENTRAL] audit miroir non bloquant :', historyError?.message || historyError);
                }

                console.log(
                    `🔒 Opération scellée [${payload.action}] pour ${safeID}` +
                    ` (Hash: ${currentHash.substring(0, 8)}...)`
                );

                return created;
            } catch (error) {
                console.error(
                    '🚨 ERREUR CRITIQUE DE SCELLÉ CRYPTOGRAPHIQUE :',
                    error
                );
                return null;
            }
        }
    );
}

app.get('/api/export-preuves-legales', async (req, res) => {
    const { tenantID, masterPin, tableId, ticketNumber } = req.query;
    const safeID = cleanString(tenantID);

    try {
        // =========================================================
        // 1. SÉCURITÉ
        // =========================================================
        const tenant = await Tenant.findOne({ tenantID: safeID });

        if (!tenant || String(tenant.pin) !== String(masterPin)) {
            return res.status(403).json({
                success: false,
                error: "Accès refusé. Empreinte de sécurité invalide."
            });
        }

        // =========================================================
        // 2. JOURNAL ANTI-FRAUDE COMPLET
        // =========================================================
        const logs = await AuditLog
            .find({ tenantID: safeID })
            .sort({ timestamp: 1 })
            .lean();

        // =========================================================
        // 3. VÉRIFICATION DE LA CHAÎNE CRYPTOGRAPHIQUE
        // =========================================================
        let isChainValid = true;
        let brokenAtIndex = null;

        for (let i = 1; i < logs.length; i++) {
            if (String(logs[i].previousHash) !== String(logs[i - 1].currentHash)) {
                isChainValid = false;
                brokenAtIndex = i;
                break;
            }
        }

        // =========================================================
        // 4. ÉTAT CENTRAL DU RESTAURANT
        // =========================================================
        const appState = await AppState
            .findOne({ tenantID: safeID })
            .lean();

        const activeOrders = appState?.activeOrders || {};

        // =========================================================
        // 5. HISTORIQUE FINANCIER / PAIEMENTS
        // =========================================================
        let financialHistory = [];

        const financialNode = activeOrders.FINANCIAL_HISTORY;

        if (Array.isArray(financialNode)) {
            financialHistory = financialNode;
        } else if (Array.isArray(financialNode?.data)) {
            financialHistory = financialNode.data;
        }

        // =========================================================
        // 6. OUTILS DE RECHERCHE TABLE / TICKET
        // =========================================================
        const wantedTable = String(tableId || "").trim();
        const wantedTicket = String(ticketNumber || "").trim();

        function getEventTable(event) {
            return String(
                event?.tableId ||
                event?.table ||
                event?.entityId ||
                event?.details?.tableId ||
                event?.details?.table ||
                event?.details?.orderSnapshot?.tableId ||
                event?.details?.snapshot?.tableId ||
                event?.details?.transaction?.table ||
                ""
            ).trim();
        }

        function getEventTicket(event) {
            return String(
                event?.ticketNumber ||
                event?.details?.ticketNumber ||
                event?.details?.orderSnapshot?.ticketNumber ||
                event?.details?.snapshot?.ticketNumber ||
                event?.details?.transaction?.ticketNumber ||
                ""
            ).trim();
        }

        function getPaymentTable(payment) {
            return String(
                payment?.table ||
                payment?.tableId ||
                payment?.orderSnapshot?.tableId ||
                payment?.snapshot?.tableId ||
                ""
            ).trim();
        }

        function getPaymentTicket(payment) {
            return String(
                payment?.ticketNumber ||
                payment?.orderSnapshot?.ticketNumber ||
                payment?.snapshot?.ticketNumber ||
                ""
            ).trim();
        }

        // =========================================================
        // 7. DOSSIER D'UNE TABLE SI TABLEID FOURNI
        // =========================================================
        let tableJournal = logs;
        let tablePayments = financialHistory;
        let tableSnapshot = null;

        if (wantedTable) {
            tableJournal = logs.filter(event => {
                const eventTable = getEventTable(event);

                // Les commandes utilisent souvent entityId = numéro de table
                return eventTable === wantedTable;
            });

            tablePayments = financialHistory.filter(payment => {
                return getPaymentTable(payment) === wantedTable;
            });

            tableSnapshot = activeOrders[wantedTable] || null;
        }

        // =========================================================
        // 8. FILTRE TICKET FACULTATIF
        // =========================================================
        if (wantedTicket) {
            tableJournal = tableJournal.filter(event => {
                return getEventTicket(event) === wantedTicket;
            });

            tablePayments = tablePayments.filter(payment => {
                return getPaymentTicket(payment) === wantedTicket;
            });
        }

        // =========================================================
        // 9. DÉTECTION ERREURS / CORRECTIONS / ANNULATIONS
        // =========================================================
        const incidents = tableJournal.filter(event => {
            const action = String(
                event?.action ||
                event?.eventType ||
                ""
            ).toUpperCase();

            return (
                action.includes("ERROR") ||
                action.includes("ERREUR") ||
                action.includes("CANCEL") ||
                action.includes("ANNUL") ||
                action.includes("DELETE") ||
                action.includes("CORRECTION") ||
                action.includes("REFUND") ||
                action.includes("REMBOURS")
            );
        });

        // =========================================================
        // 10. TOTAL ENCAISSÉ
        // =========================================================
        const totalEncaisse = tablePayments.reduce((sum, payment) => {
            const amount = Number(
                payment?.total ??
                payment?.totalTTC ??
                payment?.amount ??
                payment?.payment?.amount ??
                0
            );

            return sum + (Number.isFinite(amount) ? amount : 0);
        }, 0);

        // =========================================================
        // 11. DERNIÈRE CLÔTURE Z
        // =========================================================
        const lastClosure = [...logs]
            .reverse()
            .find(event => {
                const action = String(
                    event?.action ||
                    event?.eventType ||
                    ""
                ).toUpperCase();

                return (
                    action === "DAILY_CLOSURE" ||
                    action.includes("CLOTURE") ||
                    action.includes("CLOSURE")
                );
            }) || null;

                // =========================================================
        // 12. RÉPONSE COMPLÈTE + DOSSIER FISCAL + QR
        // =========================================================

        res.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
        res.set("Pragma", "no-cache");
        res.set("Expires", "0");

        // ---------------------------------------------------------
        // DERNIER PAIEMENT / TICKET CONNU
        // ---------------------------------------------------------
        const lastPayment = tablePayments.length
            ? [...tablePayments].sort(
                (a, b) =>
                    new Date(
                        b?.serverRecordedAt ||
                        b?.date ||
                        b?.timestamp ||
                        0
                    ) -
                    new Date(
                        a?.serverRecordedAt ||
                        a?.date ||
                        a?.timestamp ||
                        0
                    )
            )[0]
            : null;

        const lastTicketNumber =
            wantedTicket ||
            lastPayment?.ticketNumber ||
            lastPayment?.orderSnapshot?.ticketNumber ||
            lastPayment?.snapshot?.ticketNumber ||
            null;

        const lastPaymentHash =
            lastPayment?.chainHash ||
            lastPayment?.ticketHash ||
            lastPayment?.currentHash ||
            null;

        const currency =
            lastPayment?.currency ||
            lastPayment?.payment?.currency ||
            "CHF";

        // ---------------------------------------------------------
        // DERNIÈRE OPÉRATION DE LA TABLE
        // ---------------------------------------------------------
        const lastTableEvent = tableJournal.length
            ? tableJournal[tableJournal.length - 1]
            : null;

        const lastTableHash =
            lastTableEvent?.currentHash ||
            lastTableEvent?.chainHash ||
            lastPaymentHash ||
            null;

        // ---------------------------------------------------------
        // HASH GLOBAL DU DOSSIER DE TABLE
        // Ce hash permet de prouver que le contenu exporté
        // correspond exactement au dossier consulté.
        // ---------------------------------------------------------
        const dossierHash = crypto
            .createHash("sha256")
            .update(
                JSON.stringify({
                    tenantID: safeID,
                    tableId: wantedTable || null,
                    ticketNumber: lastTicketNumber,
                    totalEncaisse,
                    chronologie: tableJournal,
                    paiements: tablePayments,
                    incidents,
                    etatActuelTable: tableSnapshot
                })
            )
            .digest("hex");

        // ---------------------------------------------------------
        // RÉPONSE
        // ---------------------------------------------------------
        return res.json({

            success: true,

            version: "ICHEF-FISCAL-DOSSIER-2026.08",

            certificatLegal: {

                etablissement:
                    tenant.clientName || safeID,

                tenantID:
                    safeID,

                dateExtraction:
                    new Date(),

                integriteGarantie:
                    isChainValid,

                alerteFalsification:
                    isChainValid
                        ? "Aucune altération détectée"
                        : `ATTENTION : chaîne brisée à l'index ${brokenAtIndex}`,

                totalOperations:
                    logs.length,

                dernierHash:
                    logs.length
                        ? logs[logs.length - 1].currentHash
                        : null,

                hashDossier:
                    dossierHash,

                derniereCloture:
                    lastClosure?.timestamp || null
            },


            // =====================================================
            // COMPATIBILITÉ AVEC JOURNAL & PREUVES EXISTANT
            // NE PAS SUPPRIMER
            // =====================================================
            journal:
                logs,

            financialHistory:
                financialHistory,


            // =====================================================
            // RÉSUMÉ DE LA TABLE
            // =====================================================
            resumeTable: {

                tableId:
                    wantedTable || null,

                ticketNumber:
                    lastTicketNumber,

                totalEncaisse:
                    Number(totalEncaisse || 0),

                currency,

                nombreEvenements:
                    tableJournal.length,

                nombrePaiements:
                    tablePayments.length,

                nombreIncidents:
                    incidents.length,

                dernierHash:
                    lastTableHash,

                hashDossier:
                    dossierHash,

                derniereOperation:
                    lastTableEvent?.timestamp ||
                    lastPayment?.serverRecordedAt ||
                    lastPayment?.date ||
                    lastPayment?.timestamp ||
                    null
            },


            // =====================================================
            // DOSSIER COMPLET DE TABLE
            // =====================================================
            dossier: {

                tableId:
                    wantedTable || null,

                ticketNumber:
                    lastTicketNumber,

                currency,

                nombreEvenements:
                    tableJournal.length,

                nombrePaiements:
                    tablePayments.length,

                nombreIncidents:
                    incidents.length,

                totalEncaisse:
                    Number(totalEncaisse || 0),

                hashDossier:
                    dossierHash,

                dernierHash:
                    lastTableHash,


                // ---------------------------------------------
                // HISTOIRE COMPLÈTE
                // ---------------------------------------------
                chronologie:
                    tableJournal,


                // ---------------------------------------------
                // PAIEMENTS / TICKETS
                // ---------------------------------------------
                paiements:
                    tablePayments,


                // ---------------------------------------------
                // ERREURS / CORRECTIONS / ANNULATIONS
                // ---------------------------------------------
                erreursCorrectionsAnnulations:
                    incidents,


                // ---------------------------------------------
                // DERNIER ÉTAT CONNU DE LA TABLE
                // ---------------------------------------------
                etatActuelTable:
                    tableSnapshot,


                // ---------------------------------------------
                // DERNIER PAIEMENT
                // ---------------------------------------------
                dernierPaiement:
                    lastPayment
            },


            // =====================================================
            // CONFIGURATION QR FISCAL
            // Le PAD utilise creationEndpoint pour obtenir
            // ensuite une vraie URL HTTPS /fiscal/table/TOKEN
            // =====================================================
            qrFiscal: {

                enabled: true,

                tableId:
                    wantedTable || null,

                ticketNumber:
                    lastTicketNumber,

                hashDossier:
                    dossierHash,

                dernierHash:
                    lastTableHash,

                creationEndpoint:
                    "/api/fiscal/table-dossier/share",

                statusEndpoint:
                    "/api/fiscal/table-dossier/status",

                publicRoute:
                    "/fiscal/table/:token",

                downloadRoute:
                    "/api/fiscal/table-dossier/:token/download",

                message:
                    "Le QR doit contenir uniquement une URL HTTPS sécurisée vers le dossier fiscal."
            }

        });

    } catch (error) {

        console.error(
            "❌ Erreur export preuves légales :",
            error
        );

        return res.status(500).json({

            success: false,

            error:
                "Erreur lors de l'export d'audit.",

            code:
                "FISCAL_AUDIT_EXPORT_ERROR",

            details:
                process.env.NODE_ENV === "development"
                    ? error.message
                    : undefined

        });
    }
});
// =========================================================================
// 🗺️ ROADMAP & MISES À JOUR iCHEF OS — CONTRAT DE SYNCHRONISATION
// =========================================================================

// Données de base de la Roadmap Serveur (IDs sécurisés pour MongoDB avec "_")
const ROADMAP_SERVER_CATALOGUE = [
    {
        id: "v4_0", version: "4.0", status: "done",
        title: "Sécurité Fiscale & Vision IA Haute Performance",
        description: "Mise à niveau de l'assistant intelligent et renforcement des outils de traçabilité et de conformité fiscale.",
        features: ["Registre anti-fraude et traçabilité renforcée", "Nouveau moteur de vision IA pour la numérisation des factures", "Cockpit de Direction optimisé"],
        directClient: true, rolloutPercent: 100, globalStatus: "done", clientStatus: "done"
    },
    {
        id: "v4_2", version: "4.2", status: "current",
        title: "Centre d'Exports Réels & Académie",
        description: "Connexion directe des modules d'apprentissage et extraction des données réelles du restaurant.",
        features: ["Export du Z de caisse et historique des ventes", "Certificat de preuves et journal légal", "Académie de formation pour la brigade", "Synchronisation avec l'Assistant IA"],
        directClient: true, rolloutPercent: 100, globalStatus: "current", clientStatus: "current"
    },
    {
        id: "v4_3", version: "4.3", status: "beta",
        title: "Synchronisation Salle-Cuisine & Puces Intelligentes",
        description: "Fluidité du service grâce à une communication instantanée entre tables, salle et production.",
        features: ["Écrans de production tactiles et suivi du temps", "Puces NFC sur table", "Régulation automatique Anti-Rush"],
        betaAvailable: true, directClient: true, rolloutPercent: 0, globalStatus: "beta", clientStatus: "future"
    },
    {
        id: "v5_0", version: "5.0", status: "future",
        title: "Nouvelles expériences client & Intelligence avancée",
        description: "Encore plus d'outils pour augmenter les marges et simplifier le quotidien.",
        features: ["Programme de fidélité intelligent", "Analyses prédictives IA", "Intégration hôtellerie / room service", "Marketplace fournisseurs"],
        directClient: true, rolloutPercent: 0, globalStatus: "future", clientStatus: "future"
    }
];

// 1. STATUT GLOBAL ROADMAP
app.get('/api/roadmap/status', async (req, res) => {
    try {
        const tenantID = cleanString(req.query.tenantID);
        if (!tenantID) return res.status(400).json({ error: "tenantID manquant." });
        
        res.json({
            currentVersion: "4.2",
            state: "up_to_date",
            stateLabel: "Connecté et à jour",
            lastUpdate: new Date().toISOString(),
            newCount: 1,
            deployingCount: 1,
            upcomingCount: 2,
            recentUpdates: [
                { version: "4.2", dateLabel: "Sept. 2026", title: "Centre d'Exports Réels & Académie" },
                { version: "4.0", dateLabel: "Août 2026", title: "Sécurité Fiscale & Vision IA Haute Performance" }
            ]
        });
    } catch (e) {
        res.status(500).json({ error: "Erreur de statut Roadmap" });
    }
});

// 2. CATALOGUE DES RELEASES
app.get('/api/roadmap/releases', async (req, res) => {
    try {
        const tenantID = cleanString(req.query.tenantID);
        if (!tenantID) return res.status(400).json({ error: "tenantID manquant." });

        const state = await AppState.findOne({ tenantID }).lean();
        const deployments = state?.activeOrders?.ROADMAP_MASTER?.deployments || {};

        const personalizedReleases = ROADMAP_SERVER_CATALOGUE.map(r => ({
            ...r,
            rolloutPercent: deployments[r.id] !== undefined ? deployments[r.id] : r.rolloutPercent,
            clientStatusLabel: deployments[r.id] >= 100 ? "ACTIF CHEZ VOUS" : (deployments[r.id] > 0 ? "EN DÉPLOIEMENT" : "À CONFIGURER")
        }));

        res.json({ releases: personalizedReleases });
        
    } catch (e) {
        res.status(500).json({ error: "Erreur lecture des releases" });
    }
});

// 3. STATUT DES MODULES
app.get('/api/roadmap/modules', async (req, res) => {
    try {
        const tenantID = cleanString(req.query.tenantID);
        const tenant = await Tenant.findOne({ tenantID }).lean();
        if (!tenant) return res.status(404).json({ error: "Restaurant inconnu." });

        const plan = String(tenant.plan || 'BUSINESS').toUpperCase();
        const baseModules = {
            "Caisse & Paiement": { active: true },
            "Plan de Salle": { active: true },
            "Cockpit Anti-Rush": { active: ["EMPIRE", "PREMIUM", "BRIGADE", "BUSINESS"].includes(plan) },
            "Ressources Humaines": { active: ["EMPIRE", "PREMIUM", "BRIGADE"].includes(plan) },
            "Assistant IA": { active: true },
            "API Comptabilité": { active: ["EMPIRE", "PREMIUM", "RENTABILITE"].includes(plan) }
        };

        res.json({ modules: baseModules });
    } catch (e) {
        res.status(500).json({ error: "Erreur lecture des modules" });
    }
});

// 4. ACTIONS REQUISES
app.get('/api/roadmap/actions', async (req, res) => {
    try {
        const tenantID = cleanString(req.query.tenantID);
        const state = await AppState.findOne({ tenantID }).lean();
        const betaRequests = state?.activeOrders?.ROADMAP_MASTER?.betaRequests || [];
        
        let actions = [];
        if (betaRequests.includes("v4_3")) {
            actions.push({
                priority: "info",
                title: "Bêta v4.3 en attente",
                description: "Votre demande de participation est en cours d'analyse par nos équipes."
            });
        }
        res.json({ actions: { items: { tasks: actions } } });
    } catch (e) {
        res.status(500).json({ error: "Erreur lecture des actions" });
    }
});

// 5. GESTION DES BÊTAS
app.get('/api/roadmap/beta', async (req, res) => {
    try {
        const betas = ROADMAP_SERVER_CATALOGUE.filter(r => r.betaAvailable).map(b => ({
            id: b.id, title: b.title, description: b.description
        }));
        res.json({ beta: { items: { releases: betas } } });
    } catch (e) {
        res.status(500).json({ error: "Erreur catalogue Bêta" });
    }
});

app.post('/api/roadmap/beta/request', async (req, res) => {
    try {
        const { tenantID, releaseId } = req.body;
        const safeID = cleanString(tenantID);
        if (!safeID || !releaseId) return res.status(400).json({ error: "Données manquantes." });

        await AppState.findOneAndUpdate(
            { tenantID: safeID },
            { $addToSet: { "activeOrders.ROADMAP_MASTER.betaRequests": releaseId } },
            { new: true, upsert: true }
        ).lean();

        io.to(safeID).emit('roadmap:beta', { releaseId, status: 'requested' });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: "Erreur inscription Bêta" });
    }
});

// 6. GESTION DES DÉPLOIEMENTS CLIENTS (Gérant/Admin)
app.post('/api/roadmap/deployment', async (req, res) => {
    try {
        const { tenantID, releaseId, percent, pin } = req.body;
        const safeID = cleanString(tenantID);
        
        // Sécurité par code PIN Gérant
        const auth = await ichefAuthorizePin(safeID, pin, { managerOnly: true });
        if (!auth.ok) return res.status(auth.status || 403).json({ error: auth.error || "Accès refusé. PIN Gérant requis." });

        const safePercent = Math.max(0, Math.min(100, Number(percent)));

        await AppState.findOneAndUpdate(
            { tenantID: safeID },
            { 
                $set: { 
                    [`activeOrders.ROADMAP_MASTER.deployments.${releaseId}`]: safePercent,
                    'activeOrders.ROADMAP_MASTER.updatedAt': new Date().toISOString()
                } 
            },
            { new: true, upsert: true }
        ).lean();

        // Audit cryptographique anti-fraude
        await scellerOperation(safeID, 'UPDATE', 'ROADMAP_DEPLOYMENT', releaseId, auth.name || 'MANAGER', { percent: safePercent });

        // Synchronisation WebSocket
        io.to(safeID).emit('roadmap:deployment', { releaseId, percent: safePercent });
        
        res.json({ success: true, percent: safePercent });
    } catch (e) {
        res.status(500).json({ error: "Erreur lors de la modification du déploiement." });
    }
});

// 7. VOTES ET SUGGESTIONS
app.get('/api/roadmap/votes', async (req, res) => {
    res.json({
        votes: {
            items: {
                features: [
                    { id: "vote_1", title: "Module Click & Collect avancé", percent: 85 },
                    { id: "vote_2", title: "Paiement partagé par article", percent: 92 },
                    { id: "vote_3", title: "Connecteur UberEats / Deliveroo", percent: 64 }
                ]
            }
        }
    });
});

app.post('/api/roadmap/votes', async (req, res) => {
    res.json({ success: true });
});

// 8. PROBLÈMES CONNUS (INCIDENTS)
app.get('/api/roadmap/issues', async (req, res) => {
    res.json({
        issues: {
            items: {
                incidents: [
                    { title: "Latence TPE Ciontek", description: "Léger délai de communication constaté sur les TPE Ciontek CS50S.", module: "Paiement", status: "En résolution" }
                ]
            }
        }
    });
});

// 9. ÉTAT DES SERVICES SYSTÈME (SOCKET, MONGODB, ETC.)
app.get('/api/roadmap/system-status', async (req, res) => {
    const mongoReady = mongoose.connection.readyState === 1;
    res.json({
        services: {
            "MongoDB": { status: mongoReady ? "OK" : "Dégradé" },
            "Socket.IO": { status: "OK" },
            "Stripe Paiements": { status: typeof stripe !== 'undefined' && stripe ? "OK" : "Inactif" },
            "Twilio SMS": { status: typeof twilioClient !== 'undefined' && twilioClient ? "OK" : "Inactif" },
            "Gemini IA": { status: "OK" },
            "AppState client": { status: mongoReady ? "OK" : "Dégradé" },
            "Roadmap CORE": { status: "OK" },
            "Room Socket tenant": { status: "OK" }
        }
    });
});// =========================================================================
// 🗺️ ROADMAP & MISES À JOUR iCHEF OS — CONTRAT DE SYNCHRONISATION
// =========================================================================

// Données de base de la Roadmap Serveur (IDs sécurisés pour MongoDB avec "_")
const ROADMAP_SERVER_CATALOGUE = [
    {
        id: "v4_0", version: "4.0", status: "done",
        title: "Sécurité Fiscale & Vision IA Haute Performance",
        description: "Mise à niveau de l'assistant intelligent et renforcement des outils de traçabilité et de conformité fiscale.",
        features: ["Registre anti-fraude et traçabilité renforcée", "Nouveau moteur de vision IA pour la numérisation des factures", "Cockpit de Direction optimisé"],
        directClient: true, rolloutPercent: 100, globalStatus: "done", clientStatus: "done"
    },
    {
        id: "v4_2", version: "4.2", status: "current",
        title: "Centre d'Exports Réels & Académie",
        description: "Connexion directe des modules d'apprentissage et extraction des données réelles du restaurant.",
        features: ["Export du Z de caisse et historique des ventes", "Certificat de preuves et journal légal", "Académie de formation pour la brigade", "Synchronisation avec l'Assistant IA"],
        directClient: true, rolloutPercent: 100, globalStatus: "current", clientStatus: "current"
    },
    {
        id: "v4_3", version: "4.3", status: "beta",
        title: "Synchronisation Salle-Cuisine & Puces Intelligentes",
        description: "Fluidité du service grâce à une communication instantanée entre tables, salle et production.",
        features: ["Écrans de production tactiles et suivi du temps", "Puces NFC sur table", "Régulation automatique Anti-Rush"],
        betaAvailable: true, directClient: true, rolloutPercent: 0, globalStatus: "beta", clientStatus: "future"
    },
    {
        id: "v5_0", version: "5.0", status: "future",
        title: "Nouvelles expériences client & Intelligence avancée",
        description: "Encore plus d'outils pour augmenter les marges et simplifier le quotidien.",
        features: ["Programme de fidélité intelligent", "Analyses prédictives IA", "Intégration hôtellerie / room service", "Marketplace fournisseurs"],
        directClient: true, rolloutPercent: 0, globalStatus: "future", clientStatus: "future"
    }
];

// 1. STATUT GLOBAL ROADMAP
app.get('/api/roadmap/status', async (req, res) => {
    try {
        const tenantID = cleanString(req.query.tenantID);
        if (!tenantID) return res.status(400).json({ error: "tenantID manquant." });
        
        res.json({
            currentVersion: "4.2",
            state: "up_to_date",
            stateLabel: "Connecté et à jour",
            lastUpdate: new Date().toISOString(),
            newCount: 1,
            deployingCount: 1,
            upcomingCount: 2,
            recentUpdates: [
                { version: "4.2", dateLabel: "Sept. 2026", title: "Centre d'Exports Réels & Académie" },
                { version: "4.0", dateLabel: "Août 2026", title: "Sécurité Fiscale & Vision IA Haute Performance" }
            ]
        });
    } catch (e) {
        res.status(500).json({ error: "Erreur de statut Roadmap" });
    }
});

// 2. CATALOGUE DES RELEASES
app.get('/api/roadmap/releases', async (req, res) => {
    try {
        const tenantID = cleanString(req.query.tenantID);
        if (!tenantID) return res.status(400).json({ error: "tenantID manquant." });

        const state = await AppState.findOne({ tenantID }).lean();
        const deployments = state?.activeOrders?.ROADMAP_MASTER?.deployments || {};

        const personalizedReleases = ROADMAP_SERVER_CATALOGUE.map(r => ({
            ...r,
            rolloutPercent: deployments[r.id] !== undefined ? deployments[r.id] : r.rolloutPercent,
            clientStatusLabel: deployments[r.id] >= 100 ? "ACTIF CHEZ VOUS" : (deployments[r.id] > 0 ? "EN DÉPLOIEMENT" : "À CONFIGURER")
        }));

        res.json({ releases: personalizedReleases });
        
    } catch (e) {
        res.status(500).json({ error: "Erreur lecture des releases" });
    }
});

// 3. STATUT DES MODULES
app.get('/api/roadmap/modules', async (req, res) => {
    try {
        const tenantID = cleanString(req.query.tenantID);
        const tenant = await Tenant.findOne({ tenantID }).lean();
        if (!tenant) return res.status(404).json({ error: "Restaurant inconnu." });

        const plan = String(tenant.plan || 'BUSINESS').toUpperCase();
        const baseModules = {
            "Caisse & Paiement": { active: true },
            "Plan de Salle": { active: true },
            "Cockpit Anti-Rush": { active: ["EMPIRE", "PREMIUM", "BRIGADE", "BUSINESS"].includes(plan) },
            "Ressources Humaines": { active: ["EMPIRE", "PREMIUM", "BRIGADE"].includes(plan) },
            "Assistant IA": { active: true },
            "API Comptabilité": { active: ["EMPIRE", "PREMIUM", "RENTABILITE"].includes(plan) }
        };

        res.json({ modules: baseModules });
    } catch (e) {
        res.status(500).json({ error: "Erreur lecture des modules" });
    }
});

// 4. ACTIONS REQUISES
app.get('/api/roadmap/actions', async (req, res) => {
    try {
        const tenantID = cleanString(req.query.tenantID);
        const state = await AppState.findOne({ tenantID }).lean();
        const betaRequests = state?.activeOrders?.ROADMAP_MASTER?.betaRequests || [];
        
        let actions = [];
        if (betaRequests.includes("v4_3")) {
            actions.push({
                priority: "info",
                title: "Bêta v4.3 en attente",
                description: "Votre demande de participation est en cours d'analyse par nos équipes."
            });
        }
        res.json({ actions: { items: { tasks: actions } } });
    } catch (e) {
        res.status(500).json({ error: "Erreur lecture des actions" });
    }
});

// 5. GESTION DES BÊTAS
app.get('/api/roadmap/beta', async (req, res) => {
    try {
        const betas = ROADMAP_SERVER_CATALOGUE.filter(r => r.betaAvailable).map(b => ({
            id: b.id, title: b.title, description: b.description
        }));
        res.json({ beta: { items: { releases: betas } } });
    } catch (e) {
        res.status(500).json({ error: "Erreur catalogue Bêta" });
    }
});

app.post('/api/roadmap/beta/request', async (req, res) => {
    try {
        const { tenantID, releaseId } = req.body;
        const safeID = cleanString(tenantID);
        if (!safeID || !releaseId) return res.status(400).json({ error: "Données manquantes." });

        await AppState.findOneAndUpdate(
            { tenantID: safeID },
            { $addToSet: { "activeOrders.ROADMAP_MASTER.betaRequests": releaseId } },
            { new: true, upsert: true }
        ).lean();

        io.to(safeID).emit('roadmap:beta', { releaseId, status: 'requested' });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: "Erreur inscription Bêta" });
    }
});

// 6. GESTION DES DÉPLOIEMENTS CLIENTS (Gérant/Admin)
app.post('/api/roadmap/deployment', async (req, res) => {
    try {
        const { tenantID, releaseId, percent, pin } = req.body;
        const safeID = cleanString(tenantID);
        
        // Sécurité par code PIN Gérant
        const auth = await ichefAuthorizePin(safeID, pin, { managerOnly: true });
        if (!auth.ok) return res.status(auth.status || 403).json({ error: auth.error || "Accès refusé. PIN Gérant requis." });

        const safePercent = Math.max(0, Math.min(100, Number(percent)));

        await AppState.findOneAndUpdate(
            { tenantID: safeID },
            { 
                $set: { 
                    [`activeOrders.ROADMAP_MASTER.deployments.${releaseId}`]: safePercent,
                    'activeOrders.ROADMAP_MASTER.updatedAt': new Date().toISOString()
                } 
            },
            { new: true, upsert: true }
        ).lean();

        // Audit cryptographique anti-fraude
        await scellerOperation(safeID, 'UPDATE', 'ROADMAP_DEPLOYMENT', releaseId, auth.name || 'MANAGER', { percent: safePercent });

        // Synchronisation WebSocket
        io.to(safeID).emit('roadmap:deployment', { releaseId, percent: safePercent });
        
        res.json({ success: true, percent: safePercent });
    } catch (e) {
        res.status(500).json({ error: "Erreur lors de la modification du déploiement." });
    }
});

// 7. VOTES ET SUGGESTIONS
app.get('/api/roadmap/votes', async (req, res) => {
    res.json({
        votes: {
            items: {
                features: [
                    { id: "vote_1", title: "Module Click & Collect avancé", percent: 85 },
                    { id: "vote_2", title: "Paiement partagé par article", percent: 92 },
                    { id: "vote_3", title: "Connecteur UberEats / Deliveroo", percent: 64 }
                ]
            }
        }
    });
});

app.post('/api/roadmap/votes', async (req, res) => {
    res.json({ success: true });
});

// 8. PROBLÈMES CONNUS (INCIDENTS)
app.get('/api/roadmap/issues', async (req, res) => {
    res.json({
        issues: {
            items: {
                incidents: [
                    { title: "Latence TPE Ciontek", description: "Léger délai de communication constaté sur les TPE Ciontek CS50S.", module: "Paiement", status: "En résolution" }
                ]
            }
        }
    });
});

// 9. ÉTAT DES SERVICES SYSTÈME (SOCKET, MONGODB, ETC.)
app.get('/api/roadmap/system-status', async (req, res) => {
    const mongoReady = mongoose.connection.readyState === 1;
    res.json({
        services: {
            "MongoDB": { status: mongoReady ? "OK" : "Dégradé" },
            "Socket.IO": { status: "OK" },
            "Stripe Paiements": { status: typeof stripe !== 'undefined' && stripe ? "OK" : "Inactif" },
            "Twilio SMS": { status: typeof twilioClient !== 'undefined' && twilioClient ? "OK" : "Inactif" },
            "Gemini IA": { status: "OK" },
            "AppState client": { status: mongoReady ? "OK" : "Dégradé" },
            "Roadmap CORE": { status: "OK" },
            "Room Socket tenant": { status: "OK" }
        }
    });
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
        RÉPONDS UNIQUEMENT AVEC CE JSON STRICT (SANS AUCUN TEXTE AUTOUR, AUCUNE BALISE MARKDOWN) :
        {
            "previsionVentes": "Explication courte.",
            "alertesRupture": ["Produit A", "Produit B"],
            "commandesFournisseurs": [
                { "fournisseur": "Nom", "articles": ["10kg Tomates"] }
            ],
            "detectionAnomalies": "Explication courte.",
            "recommandationMenu": ["Plat X"],
            "analyseMarge": "Explication claire."
        }`;

const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent(prompt);
        let responseText = result.response.text();
        
        // --- LE NETTOYAGE INDESTRUCTIBLE ---
        // 1. On enlève les balises markdown que l'IA rajoute souvent
        responseText = responseText.replace(/```json/gi, "").replace(/```/g, "");
        // 2. On enlève les espaces vides au début et à la fin
        responseText = responseText.trim();
        // 3. On repère la vraie première et dernière accolade du JSON
        const firstBrace = responseText.indexOf('{');
        const lastBrace = responseText.lastIndexOf('}');
        
        // 4. Si on a trouvé un JSON, on découpe exactement à cet endroit
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace >= firstBrace) {
            responseText = responseText.substring(firstBrace, lastBrace + 1);
        } else {
            throw new Error("Impossible de trouver un format JSON dans la réponse de l'IA.");
        }
        
        res.json({ success: true, report: JSON.parse(responseText) });
    } catch (error) {
        console.error("🚨 Erreur IA Executive Report:", error);
        res.status(500).json({ success: false, error: "L'analyse IA est momentanément indisponible." });
    }
});

// ==========================================
// 🧠 IA DIRECTEUR OPÉRATIONNEL & FINANCIER (VISION 360°)
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

 const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent(prompt);
        
        let responseText = result.response.text().trim();
        const ticks = String.fromCharCode(96, 96, 96);
        responseText = responseText.split(ticks + 'json').join('').split(ticks).join('').trim();
        if (!responseText.startsWith("{")) responseText = responseText.substring(responseText.indexOf("{"));
        
        res.json({ success: true, aiReply: JSON.parse(responseText) });
    } catch (error) {
        console.error("Erreur Assistant Vocal:", error);
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

// =========================================================================
// 📞 ASSISTANT VOCAL CLIENT (WEBHOOK VAPI.AI)
// =========================================================================
app.post('/api/voice-webhook', async (req, res) => {
    try {
        const { message } = req.body;

        // On écoute uniquement les appels de fonction (Tool Calls)
        if (message && message.type === 'tool-calls') {
            const toolCall = message.toolCalls[0];
            
            // Si l'IA utilise l'outil "book_table"
            if (toolCall.function.name === 'book_table') {
                const { nom, couverts, date, heure, telephone, tenantID } = toolCall.function.arguments;

                const safeID = cleanString(tenantID);
                console.log(`[iCHEF VOICE] Réservation IA pour ${safeID} : ${nom}, ${couverts}pax, ${date} à ${heure}`);

                const newResa = {
                    id: 'resa_' + Date.now(),
                    name: nom,
                    phone: telephone || "Inconnu",
                    date: date,
                    time: heure,
                    couverts: parseInt(couverts),
                    status: 'confirmed',
                    obs: '🤖 Via iCHEF Voice'
                };

                // 1. Sauvegarde dans la base de données (AppState)
                const newState = await AppState.findOneAndUpdate(
                    { tenantID: safeID },
                    { $push: { "activeOrders.RESERVATIONS_MASTER.data": newResa } },
                    { upsert: true, new: true }
                );

                // 2. TEMPS RÉEL : On pousse la mise à jour sur tous les écrans du restaurant
                io.to(safeID).emit('updateState', newState);
                
                // 3. Scellé de sécurité anti-fraude
                await scellerOperation(safeID, 'CREATE', 'RESERVATION_VOICE', newResa.id, 'IA_VOICE', newResa);

                // 4. On donne le feu vert à l'IA pour valider vocalement au client
                return res.json({
                    results: [{
                        toolCallId: toolCall.id,
                        result: "Succès. La table est bien réservée. Confirme-le au client de manière chaleureuse."
                    }]
                });
            }
        }

        res.status(200).send('OK');

    } catch (error) {
        console.error("Erreur Webhook Vapi :", error);
        res.status(500).send("Erreur interne");
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

const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent(prompt);
        
        let responseText = result.response.text().trim();
        const ticks = String.fromCharCode(96, 96, 96);
        responseText = responseText.split(ticks + 'json').join('').split(ticks).join('').trim();
        
        if (!responseText.startsWith("{")) responseText = responseText.substring(responseText.indexOf("{"));
        const decision = JSON.parse(responseText);
        // Cette route prend uniquement la décision. reservation.html persiste
        // ensuite UNE réservation normalisée via /update-order : aucun doublon.
        return res.json({ success: true, decision });
    } catch (error) { 
        console.error("Erreur Smart-Reservation:", error);
        res.status(500).json({ success: false, error: "L'IA du Maître d'Hôtel est momentanément indisponible." }); 
    }
});

// =========================================================================
// 📞 DEMANDE DE RAPPEL (VIA GMAIL DIRECT)
// =========================================================================
app.post('/api/twilio/call-me', async (req, res) => {
    const phone = String(req.body?.phone || '').trim().slice(0, 80);
    const gmailUser = String(process.env.GMAIL_USER || '').trim();
    const gmailPassword = String(process.env.GMAIL_APP_PASSWORD || '').trim();
    const alertRecipient = String(process.env.ICHEF_ALERT_EMAIL || 'iche.flavien@ichef.ch').trim();
    if (!phone) return res.status(400).json({ success: false, error: 'Numéro manquant.' });
    if (!gmailUser || !gmailPassword) {
        return res.status(503).json({ success: false, error: 'Service de rappel email non configuré.' });
    }
    try {
        const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user: gmailUser, pass: gmailPassword } });
        await transporter.sendMail({
            from: gmailUser,
            to: alertRecipient,
            subject: 'iCHEF OS - Demande de rappel',
            text: `Un prospect demande à être rappelé.

Numéro : ${phone}`
        });
        console.log('✅ Demande de rappel email envoyée.');
        return res.json({ success: true, message: 'Demande traitée avec succès.' });
    } catch (error) {
        console.error('❌ Erreur Email Rappel :', error?.message || error);
        return res.status(500).json({ success: false, error: 'Erreur serveur email' });
    }
});

// 🛡️ ROUTE D'EXTRACTION DES VRAIES PREUVES LÉGALES (JSON) POUR LA DGFIP
app.get('/api/export-blockchain-json', async (req, res) => {
    try {
        const tenantID = cleanString(req.query.tenantID);
        if (!tenantID) return res.status(400).send("ID Restaurant manquant.");

        const tenant = await Tenant.findOne({ tenantID });
        if (!tenant) return res.status(404).send("Établissement inconnu.");

        const logs = await AuditLog.find({ tenantID: tenantID }).sort({ timestamp: 1 });
        
        let isChainValid = true;
        let brokenAtIndex = null;
        for (let i = 1; i < logs.length; i++) {
            if (logs[i].previousHash !== logs[i-1].currentHash) {
                isChainValid = false;
                brokenAtIndex = i;
                break;
            }
        }

        // FORMATAGE STRICT DGFIP (BOI-TVA-DECLA-30-10-30)
        const certificatCertifie = {
            "entete_logiciel": {
                "nom_logiciel": "iCHEF OS - Module Caisse",
                "version": "4.0.0",
                "editeur": "iCHEF",
                "certification": "Auto-attestation de conformité à l'Art. 286 du CGI"
            },
            "identification_assujetti": {
                "nom_etablissement": tenant.clientName || "Non renseigné",
                "identifiant_logiciel": tenantID,
                "siret": tenant.siret || "NON RENSEIGNÉ",
                "numero_tva": tenant.tvaIntra || "NON RENSEIGNÉ"
            },
            "donnees_techniques_export": {
                "date_extraction_iso": new Date().toISOString(),
                "integrite_garantie": isChainValid,
                "statut_falsification": isChainValid ? "OK - Chaîne cryptographique intègre" : `ALERTE - Rupture de chaîne détectée à l'index ${brokenAtIndex}`,
                "total_operations_scellees": logs.length
            },
            "journal_audit_trail": logs.map(log => ({
                "date_heure": log.timestamp,
                "type_operation": log.action,            // ex: TABLE_CLOSED, ORDER_ITEM_CANCELLED
                "type_document": log.entityType,         // ex: TICKET, Z_CAISSE
                "numero_document": log.entityId,         // DOIT être un numéro de ticket séquentiel
                "caissier_id": log.authorPin,
                // On extrait les totaux si l'opération est un encaissement
                "montant_ttc": log.details?.totalTTC || 0,
                "montant_ht": log.details?.totalHT || 0,
                "repartition_tva": log.details?.tva || {},
                "moyens_paiement": log.details?.payments || [],
                "signature_precedente": log.previousHash,
                "signature_courante": log.currentHash,
                // On garde le reste des infos brutes pour la traçabilité complète
                "donnees_brutes": log.details
            }))
        };

        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename=Archive_Fiscale_iCHEF_${tenantID}_${new Date().getTime()}.json`);
        res.send(JSON.stringify(certificatCertifie, null, 4));

    } catch (error) {
        console.error("Erreur génération certificat blockchain :", error);
        res.status(500).send("Erreur serveur de sécurité.");
    }
});
// 📊 ROUTE D'EXPORTATION DES VRAIS TICKETS POUR LE CENTRE DE TÉLÉCHARGEMENT
app.get('/api/export-caisse-csv', async (req, res) => {
    try {
        const tenantID = cleanString(req.query.tenantID);
        if (!tenantID) return res.status(400).send("ID Restaurant manquant.");

        // On récupère l'état de la caisse pour ce restaurant
        const state = await AppState.findOne({ tenantID });
        const history = state?.activeOrders?.FINANCIAL_HISTORY?.data || [];

        // Si aucun ticket n'est trouvé
        if (history.length === 0) {
            return res.send("Date,Numero Ticket,Montant,Moyen Paiement\nAucune transaction enregistree,,,\n");
        }

        // On construit l'en-tête du fichier CSV
        let csvContent = "Date,Numero Ticket,Montant,Moyen Paiement\n";

        // On boucle sur chaque vrai ticket stocké en base de données
        history.forEach(tck => {
            const date = tck.date || new Date(tck.timestamp || Date.now()).toLocaleDateString('fr-FR');
            const id = tck.id || "TCK-INCONNU";
            const montant = tck.total || tck.amount || 0;
            const methode = tck.method || tck.paymentMethod || "Non spécifié";
            
            csvContent += `${date},${id},${montant} €,\"${methode}\"\n`;
        });

        // On configure les en-têtes HTTP pour forcer le navigateur à télécharger un fichier
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename=Export_Comptable_Z_Caisse.csv');
        
        // On envoie le contenu du fichier
        res.send(csvContent);

    } catch (error) {
        console.error("Erreur export CSV :", error);
        res.status(500).send("Erreur serveur lors de la génération de l'export.");
    }
});

// ============================================================
// iCHEF — ACCÈS PAD / TÉLÉPHONE LIÉ À LA POINTEUSE
// Direction / Gérant / Manager : accès permanent
// Serveur / Salle : accès uniquement si onDuty === true
// Cuisine / Bar / Pâtisserie / autres : accès refusé
// ============================================================

function ichefTerminalAccessKey(value = '') {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase()
        .replace(/[\s\-/]+/g, '_');
}

function ichefTerminalStaffProfile(staff = {}) {
    return ichefTerminalAccessKey([
        staff.dept,
        staff.role,
        staff.title,
        staff.fonction,
        staff.rank
    ].filter(Boolean).join(' '));
}

function ichefTerminalStaffIsManager(staff = {}) {
    const profile = ichefTerminalStaffProfile(staff);

    return /(^|_)(MASTER|SUPER_ADMIN|SUPERADMIN|ADMIN|DIRECTEUR|DIRECTION|GERANT|MANAGER|PROPRIETAIRE|OWNER)(_|$)/
        .test(profile);
}

function ichefTerminalStaffIsServer(staff = {}) {
    const profile = ichefTerminalStaffProfile(staff);

    return /(^|_)(SALLE|SERVEUR|SERVEUSE|WAITER|CHEF_DE_RANG|MAITRE_D_HOTEL)(_|$)/
        .test(profile);
}

async function ichefCheckServiceTerminalAccess({
    tenantID,
    pin,
    terminal
}) {

    const safeID = cleanString(tenantID);
    const submittedPin = String(pin || '').trim();
    const terminalKey = ichefTerminalAccessKey(terminal);

    const isServiceTerminal =
        terminalKey === 'PAD' ||
        terminalKey === 'TELEPHONE';

    if (!isServiceTerminal) {
        return {
            ok: true,
            bypass: true
        };
    }

    if (
        !safeID ||
        !/^\d{4,12}$/.test(submittedPin)
    ) {
        return {
            ok: false,
            status: 401,
            error: 'Session PAD/Téléphone invalide.'
        };
    }

    const tenant =
        await Tenant.findOne({
            tenantID: safeID
        });

    if (!tenant) {
        return {
            ok: false,
            status: 404,
            error: 'Établissement inconnu.'
        };
    }

    // PIN principal = Direction
    if (
        String(tenant.pin || '').trim() ===
        submittedPin
    ) {
        return {
            ok: true,
            isManager: true,
            role: 'MASTER',
            requiresDuty: false,
            onDuty: true
        };
    }

    const state =
        await AppState.findOne({
            tenantID: safeID
        });

    const staffAccess =
        Array.isArray(
            state?.activeOrders?.STAFF_ACCESS?.data
        )
            ? state.activeOrders.STAFF_ACCESS.data
            : [];

    const staff =
        staffAccess.find(s =>
            String(s?.pin || '').trim() ===
            submittedPin
        );

    if (
        !staff ||
        staff.active === false
    ) {
        return {
            ok: false,
            status: 403,
            error:
                'Profil collaborateur introuvable ou désactivé.'
        };
    }

    // Gérant / Direction / Manager
    if (
        ichefTerminalStaffIsManager(staff)
    ) {
        return {
            ok: true,
            staff,
            isManager: true,
            requiresDuty: false,
            onDuty: staff.onDuty === true
        };
    }

    // Seulement Salle / Serveur
    if (
        !ichefTerminalStaffIsServer(staff)
    ) {
        return {
            ok: false,
            status: 403,
            error:
                'Accès réservé au Gérant / Direction et aux Serveurs.'
        };
    }

    // Serveur doit avoir pointé ENTRÉE
    if (
        staff.onDuty !== true
    ) {
        return {
            ok: false,
            status: 403,
            error:
                'Vous devez pointer ENTRÉE avant d’accéder au PAD / téléphone.',
            staff,
            requiresDuty: true,
            onDuty: false
        };
    }

    return {
        ok: true,
        staff,
        isManager: false,
        requiresDuty: true,
        onDuty: true
    };
}
// ==========================================
// API RESTAURANT SYNCHRONISATION
// ==========================================

app.post('/api/verify-pin', async (req, res) => {
    const {
        tenantID,
        pin,
        deviceId,
        terminal
    } = req.body || {};

    const safeID = cleanString(tenantID);
    const submittedPin = String(pin || '').trim();

    try {
        const tenant = await Tenant.findOne({
            tenantID: safeID
        });

        if (!tenant) {
            return res.status(404).json({
                success: false,
                error: "Inconnu."
            });
        }

        if (
            tenant.demoExpiration &&
            new Date() > new Date(tenant.demoExpiration)
        ) {
            return res.status(403).json({
                success: false,
                error: "Démonstration expirée (limite de 24h atteinte)."
            });
        }

        if (tenant.status === 'SUSPENDU') {
            return res.status(403).json({
                success: false,
                error: "Licence suspendue ou en attente d'approbation manuelle."
            });
        }

        const isMaster =
            String(tenant.pin || '').trim() === submittedPin;

        let state = null;
        let staffMember = null;
        let roleAttribue = isMaster ? 'MASTER' : 'STAFF';

        if (!isMaster) {
            state = await AppState.findOne({
                tenantID: tenant.tenantID
            });

            const staffAccess =
                Array.isArray(state?.activeOrders?.STAFF_ACCESS?.data)
                    ? state.activeOrders.STAFF_ACCESS.data
                    : [];

            staffMember = staffAccess.find(s =>
                String(s?.pin || '').trim() === submittedPin &&
                s?.active !== false
            ) || null;

            if (!staffMember) {
                return res.status(401).json({
                    success: false,
                    error: "Code PIN incorrect."
                });
            }

            roleAttribue =
                staffMember.role ||
                staffMember.dept ||
                'STAFF';
        }

        const terminalAccess =
            await ichefCheckServiceTerminalAccess({
                tenantID: tenant.tenantID,
                pin: submittedPin,
                terminal
            });

        if (!terminalAccess.ok) {
            return res
                .status(terminalAccess.status || 403)
                .json({
                    success: false,
                    error:
                        terminalAccess.error ||
                        'Accès service refusé.',
                    code:
                        terminalAccess.requiresDuty === true &&
                        terminalAccess.onDuty !== true
                            ? 'NOT_ON_DUTY'
                            : 'TERMINAL_ACCESS_DENIED',
                    onDuty:
                        terminalAccess.onDuty === true,
                    requiresDuty:
                        terminalAccess.requiresDuty === true
                });
        }

        const screenLimit =
            await syncTenantScreenLimit(tenant);

        if (!Array.isArray(tenant.registeredDevices)) {
            tenant.registeredDevices = [];
        }

        const uniqueDevices = [...new Set(
            tenant.registeredDevices
                .map(value => String(value || '').trim())
                .filter(Boolean)
        )];

        if (
            uniqueDevices.length !==
            tenant.registeredDevices.length
        ) {
            tenant.registeredDevices = uniqueDevices;
            await tenant.save();
        }

        if (
            deviceId &&
            !tenant.registeredDevices.includes(deviceId)
        ) {
            if (
                tenant.registeredDevices.length >=
                screenLimit
            ) {
                return res.status(403).json({
                    success: false,
                    error:
                        `Limite écrans atteinte ` +
                        `(${tenant.registeredDevices.length}/${screenLimit}).`,
                    maxScreens: screenLimit,
                    registeredScreens:
                        tenant.registeredDevices.length,
                    availableScreens: 0
                });
            }

            tenant.registeredDevices.push(deviceId);
            await tenant.save();
        }

        const resolvedStaff =
            terminalAccess.staff ||
            staffMember ||
            null;

        return res.json({
            success: true,
            plan: tenant.plan,
            specialite: tenant.specialite,
            role:
                resolvedStaff?.role ||
                resolvedStaff?.dept ||
                roleAttribue,
            safeTenantID: tenant.tenantID,
            staffId:
                resolvedStaff?.id ?? null,
            staffName:
                resolvedStaff?.name || '',
            isManager:
                isMaster ||
                terminalAccess.isManager === true,
            requiresDuty:
                terminalAccess.requiresDuty === true,
            onDuty:
                terminalAccess.onDuty === true ||
                isMaster,
            maxScreens: screenLimit,
            registeredScreens:
                tenant.registeredDevices.length,
            availableScreens:
                Math.max(
                    0,
                    screenLimit -
                    tenant.registeredDevices.length
                )
        });

    } catch (error) {
        console.error("Erreur verify-pin :", error);

        return res.status(500).json({
            success: false,
            error: "Erreur serveur."
        });
    }
});

// ============================================================
// iCHEF RH — SYNCHRONISATION TOTALE POINTEUSE / FEUILLE D'HEURES
// ============================================================


// ==========================================
// TOAST GLOBAL iCHEF RH
// ==========================================

function showToast(message) {

    const toast =
        document.getElementById('toast');

    if (!toast) {

        console.log(
            '[iCHEF RH]',
            message
        );

        return;
    }

    toast.innerText =
        String(message || '');

    toast.style.display =
        'block';

    requestAnimationFrame(() => {

        toast.classList.add(
            'show'
        );
    });

    if (
        window.__ichefRhToastTimer
    ) {

        clearTimeout(
            window.__ichefRhToastTimer
        );
    }

    window.__ichefRhToastTimer =
        setTimeout(() => {

            toast.classList.remove(
                'show'
            );

            setTimeout(() => {

                toast.style.display =
                    'none';

            }, 350);

        }, 2600);
}

// ============================================================
// SÉCURITÉ PIN
// ============================================================

function ichefIsForbiddenDefaultPin(pin) {
    const safePin =
        String(pin || '').trim();

    return [
        '0000',
        '9999',
        '11111'
    ].includes(safePin);
}


// ============================================================
// OUTILS DATE / NOMBRES
// ============================================================

function ichefRhDateParts(timestamp) {

    const d =
        new Date(timestamp);

    if (
        Number.isNaN(
            d.getTime()
        )
    ) {
        return null;
    }

    const year =
        d.getFullYear();

    const month =
        String(
            d.getMonth() + 1
        ).padStart(
            2,
            '0'
        );

    const day =
        String(
            d.getDate()
        ).padStart(
            2,
            '0'
        );

    return {
        date:
            `${year}-${month}-${day}`,

        month:
            `${year}-${month}`,

        day
    };
}


function ichefRhSafeNumber(
    value,
    fallback = 0
) {

    const n =
        Number(value);

    return Number.isFinite(n)
        ? n
        : fallback;
}


// ============================================================
// CONSTRUCTION DES FEUILLES D'HEURES RÉELLES
// ============================================================

function ichefRhBuildWorkedTimesheets(
    punches,
    previous = {}
) {

    const safePunches =
        Array.isArray(punches)
            ? punches
                .filter(
                    p =>
                        p &&
                        p.timestamp &&
                        p.staffId
                )
                .slice()
                .sort(
                    (a, b) =>
                        Number(a.timestamp) -
                        Number(b.timestamp)
                )
            : [];


    const previousMonths =
        previous?.months &&
        typeof previous.months === 'object'
            ? previous.months
            : {};


    const result = {

        version: 3,

        generatedAt:
            new Date().toISOString(),

        months: {}
    };


    // ========================================================
    // CRÉER / RETROUVER UNE FEUILLE COLLABORATEUR
    // ========================================================

    function ensureStaffSheet(
        parts,
        punch
    ) {

        if (
            !result.months[
                parts.month
            ]
        ) {

            const previousMonth =
                previousMonths?.[
                    parts.month
                ] || {};


            result.months[
                parts.month
            ] = {

                month:
                    parts.month,

                status:
                    previousMonth.status ||
                    'TO_VERIFY',

                lockedAt:
                    previousMonth.lockedAt ||
                    null,

                lockedBy:
                    previousMonth.lockedBy ||
                    null,

                staff: {}
            };
        }


        const monthNode =
            result.months[
                parts.month
            ];


        const staffKey =
            String(
                punch.staffId
            );


        if (
            !monthNode.staff[
                staffKey
            ]
        ) {

            const previousStaff =
                previousMonths?.[
                    parts.month
                ]?.staff?.[
                    staffKey
                ] || {};


            monthNode.staff[
                staffKey
            ] = {

                staffId:
                    punch.staffId,

                staffName:
                    punch.staffName ||
                    '',

                dept:
                    punch.dept ||
                    '',

                status:
                    previousStaff.status ||
                    (
                        monthNode.status ===
                        'LOCKED'
                            ? 'LOCKED'
                            : 'TO_VERIFY'
                    ),

                validatedAt:
                    previousStaff.validatedAt ||
                    null,

                validatedBy:
                    previousStaff.validatedBy ||
                    null,

                lockedAt:
                    previousStaff.lockedAt ||
                    null,

                lockedBy:
                    previousStaff.lockedBy ||
                    null,

                days: {},

                totals: {

                    rawWorkedHours: 0,

                    workedHours: 0,

                    anomalyCount: 0,

                    validatedDays: 0,

                    daysWithPunches: 0
                }
            };
        }


        return monthNode.staff[
            staffKey
        ];
    }


    // ========================================================
    // CRÉER / RETROUVER UNE JOURNÉE
    // ========================================================

    function ensureDay(
        staffSheet,
        parts
    ) {

        const dayKey =
            parts.day;


        if (
            !staffSheet.days[
                dayKey
            ]
        ) {

            staffSheet.days[
                dayKey
            ] = {

                date:
                    parts.date,

                sessions: [],

                punches: [],

                rawWorkedHours: 0,

                manualWorkedHours:
                    null,

                workedHours: 0,

                anomalies: [],

                status:
                    'TO_VERIFY',

                correction:
                    null
            };
        }


        return staffSheet.days[
            dayKey
        ];
    }


    // ========================================================
    // ENTRÉES ACTUELLEMENT OUVERTES
    // ========================================================

    const openEntries =
        new Map();


    // ========================================================
    // ANALYSE DES POINTAGES
    // ========================================================

    for (
        const punch
        of safePunches
    ) {

        const parts =
            ichefRhDateParts(
                punch.timestamp
            );


        if (!parts) {
            continue;
        }


        const staffKey =
            String(
                punch.staffId
            );


        const action =
            String(
                punch.type || ''
            )
                .trim()
                .toUpperCase();


        // ====================================================
        // ENTRÉE
        // ====================================================

        if (
            action ===
            'ENTRÉE'
        ) {

            // Une entrée était déjà ouverte
            if (
                openEntries.has(
                    staffKey
                )
            ) {

                const previousOpen =
                    openEntries.get(
                        staffKey
                    );


                const previousParts =
                    ichefRhDateParts(
                        previousOpen.timestamp
                    );


                if (
                    previousParts
                ) {

                    const staffSheet =
                        ensureStaffSheet(
                            previousParts,
                            previousOpen
                        );


                    const day =
                        ensureDay(
                            staffSheet,
                            previousParts
                        );


                    day.punches.push(
                        previousOpen
                    );


                    day.anomalies.push({

                        code:
                            'DOUBLE_ENTRY',

                        label:
                            'Entrée sans sortie avant une nouvelle entrée'
                    });
                }
            }


            openEntries.set(
                staffKey,
                punch
            );


            continue;
        }


        // ====================================================
        // SORTIE
        // ====================================================

        if (
            action ===
            'SORTIE'
        ) {

            const entry =
                openEntries.get(
                    staffKey
                );


            // Sortie sans entrée
            if (!entry) {

                const staffSheet =
                    ensureStaffSheet(
                        parts,
                        punch
                    );


                const day =
                    ensureDay(
                        staffSheet,
                        parts
                    );


                day.punches.push(
                    punch
                );


                day.anomalies.push({

                    code:
                        'MISSING_ENTRY',

                    label:
                        'Sortie sans entrée'
                });


                continue;
            }


            const entryParts =
                ichefRhDateParts(
                    entry.timestamp
                );


            if (!entryParts) {

                openEntries.delete(
                    staffKey
                );

                continue;
            }


            const staffSheet =
                ensureStaffSheet(
                    entryParts,
                    entry
                );


            const day =
                ensureDay(
                    staffSheet,
                    entryParts
                );


            const hours =
                Math.max(
                    0,
                    (
                        Number(
                            punch.timestamp
                        ) -
                        Number(
                            entry.timestamp
                        )
                    ) /
                    3600000
                );


            const rounded =
                Math.round(
                    hours * 100
                ) /
                100;


            day.sessions.push({

                entry: {

                    id:
                        entry.id,

                    timestamp:
                        entry.timestamp
                },

                exit: {

                    id:
                        punch.id,

                    timestamp:
                        punch.timestamp
                },

                hours:
                    rounded
            });


            day.punches.push(
                entry,
                punch
            );


            day.rawWorkedHours +=
                rounded;


            // Service très long
            if (
                hours > 16
            ) {

                day.anomalies.push({

                    code:
                        'LONG_SHIFT',

                    label:
                        'Durée de présence supérieure à 16 heures'
                });
            }


            // Service après minuit
            if (
                entryParts.date !==
                parts.date
            ) {

                day.anomalies.push({

                    code:
                        'OVERNIGHT_SHIFT',

                    label:
                        'Service traversant minuit'
                });
            }


            openEntries.delete(
                staffKey
            );
        }
    }


    // ========================================================
    // ENTRÉES SANS SORTIE
    // NE JAMAIS INVENTER UNE HEURE DE SORTIE
    // ========================================================

    for (
        const [
            staffKey,
            entry
        ]
        of openEntries.entries()
    ) {

        const parts =
            ichefRhDateParts(
                entry.timestamp
            );


        if (!parts) {
            continue;
        }


        const staffSheet =
            ensureStaffSheet(
                parts,
                entry
            );


        const day =
            ensureDay(
                staffSheet,
                parts
            );


        if (
            !day.punches.some(
                p =>
                    String(p?.id) ===
                    String(entry.id)
            )
        ) {

            day.punches.push(
                entry
            );
        }


        day.anomalies.push({

            code:
                'MISSING_EXIT',

            label:
                'Entrée sans sortie'
        });
    }


    // ========================================================
    // RÉCUPÉRER LES CORRECTIONS / VALIDATIONS EXISTANTES
    // ========================================================

    for (
        const [
            monthKey,
            monthNode
        ]
        of Object.entries(
            result.months
        )
    ) {

        const previousMonth =
            previousMonths?.[
                monthKey
            ] || {};


        monthNode.status =
            previousMonth.status ||
            monthNode.status;


        monthNode.lockedAt =
            previousMonth.lockedAt ||
            monthNode.lockedAt;


        monthNode.lockedBy =
            previousMonth.lockedBy ||
            monthNode.lockedBy;


        for (
            const [
                staffKey,
                staffSheet
            ]
            of Object.entries(
                monthNode.staff
            )
        ) {

            const previousStaff =
                previousMonth
                    ?.staff?.[
                        staffKey
                    ] || {};


            staffSheet.status =
                previousStaff.status ||
                staffSheet.status;


            staffSheet.validatedAt =
                previousStaff.validatedAt ||
                null;


            staffSheet.validatedBy =
                previousStaff.validatedBy ||
                null;


            staffSheet.lockedAt =
                previousStaff.lockedAt ||
                null;


            staffSheet.lockedBy =
                previousStaff.lockedBy ||
                null;


            staffSheet.totals = {

                rawWorkedHours: 0,

                workedHours: 0,

                anomalyCount: 0,

                validatedDays: 0,

                daysWithPunches: 0
            };


            for (
                const [
                    dayKey,
                    day
                ]
                of Object.entries(
                    staffSheet.days
                )
            ) {

                const previousDay =
                    previousStaff
                        ?.days?.[
                            dayKey
                        ] || {};


                // Correction manuelle existante
                if (
                    previousDay
                        .manualWorkedHours !==
                        undefined &&
                    previousDay
                        .manualWorkedHours !==
                        null
                ) {

                    day.manualWorkedHours =
                        ichefRhSafeNumber(
                            previousDay
                                .manualWorkedHours
                        );


                    day.correction =
                        previousDay
                            .correction ||
                        null;
                }


                day.rawWorkedHours =
                    Math.round(
                        ichefRhSafeNumber(
                            day.rawWorkedHours
                        ) *
                        100
                    ) /
                    100;


                day.workedHours =
                    day.manualWorkedHours !==
                    null
                        ? day.manualWorkedHours
                        : day.rawWorkedHours;


                if (
                    staffSheet.status ===
                    'LOCKED' ||
                    monthNode.status ===
                    'LOCKED'
                ) {

                    day.status =
                        'LOCKED';

                } else if (
                    previousDay.status
                ) {

                    day.status =
                        previousDay.status;
                }


                staffSheet
                    .totals
                    .rawWorkedHours +=
                    day.rawWorkedHours;


                staffSheet
                    .totals
                    .workedHours +=
                    day.workedHours;


                staffSheet
                    .totals
                    .anomalyCount +=
                    Array.isArray(
                        day.anomalies
                    )
                        ? day.anomalies.length
                        : 0;


                staffSheet
                    .totals
                    .daysWithPunches++;


                if (
                    day.status ===
                        'VALIDATED' ||
                    day.status ===
                        'LOCKED'
                ) {

                    staffSheet
                        .totals
                        .validatedDays++;
                }
            }


            staffSheet
                .totals
                .rawWorkedHours =
                Math.round(
                    staffSheet
                        .totals
                        .rawWorkedHours *
                    100
                ) /
                100;


            staffSheet
                .totals
                .workedHours =
                Math.round(
                    staffSheet
                        .totals
                        .workedHours *
                    100
                ) /
                100;
        }
    }


    return result;
}


// ============================================================
// DIAGNOSTIC RH
//
// Après déploiement tu peux ouvrir :
// https://tableau-system.onrender.com/api/rh/health
// ============================================================

app.get(
    '/api/rh/health',
    (req, res) => {

        return res.json({

            success: true,

            module:
                'ICHEF_RH',

            punchRoute:
                true,

            version:
                'RH-PUNCH-2026.08.29',

            timestamp:
                new Date().toISOString()
        });
    }
);


// ============================================================
// POINTEUSE RH
// POST /api/rh/punch
// ============================================================

app.post(
    '/api/rh/punch',
    async (req, res) => {

        const {

            tenantID,

            staffId,

            pin,

            deviceId,

            photo

        } = req.body || {};


        const safeID =
            cleanString(
                tenantID
            );


        const submittedPin =
            String(
                pin || ''
            ).trim();


        // ====================================================
        // 1. VALIDATION DE BASE
        // ====================================================

        if (
            !safeID ||
            !staffId ||
            !/^\d{4,12}$/.test(
                submittedPin
            )
        ) {

            return res
                .status(400)
                .json({

                    success: false,

                    error:
                        "Données de pointage invalides."
                });
        }


        // ====================================================
        // 2. REFUSER LES PIN GÉNÉRIQUES
        // ====================================================

        if (
            ichefIsForbiddenDefaultPin(
                submittedPin
            )
        ) {

            return res
                .status(401)
                .json({

                    success: false,

                    error:
                        "Ce code PIN de sécurité n'est pas autorisé."
                });
        }


        try {

            // =================================================
            // 3. VÉRIFIER LE RESTAURANT
            // =================================================

            const tenant =
                await Tenant.findOne({

                    tenantID:
                        safeID
                });


            if (!tenant) {

                return res
                    .status(404)
                    .json({

                        success: false,

                        error:
                            "Restaurant introuvable."
                    });
            }


            if (
                tenant.status ===
                'SUSPENDU'
            ) {

                return res
                    .status(403)
                    .json({

                        success: false,

                        error:
                            "Licence suspendue."
                    });
            }


            // =================================================
            // 4. CHARGER L'ÉTAT CENTRAL
            // =================================================

            let state =
                await AppState.findOne({

                    tenantID:
                        safeID
                });


            if (!state) {

                state =
                    new AppState({

                        tenantID:
                            safeID,

                        activeOrders:
                            {}
                    });
            }


            if (
                !state.activeOrders
            ) {

                state.activeOrders =
                    {};
            }


            // =================================================
            // 5. STAFF_ACCESS = SOURCE UNIQUE
            // =================================================

            const staffAccess =
                Array.isArray(
                    state
                        .activeOrders
                        ?.STAFF_ACCESS
                        ?.data
                )
                    ? state
                        .activeOrders
                        .STAFF_ACCESS
                        .data
                        .slice()
                    : [];


            // =================================================
            // 6. IDENTIFIER L'EMPLOYÉ PAR ID + PIN
            // =================================================

            const staff =
                staffAccess.find(
                    s =>

                        String(
                            s?.id || ''
                        ) ===
                            String(
                                staffId
                            ) &&

                        s?.active !==
                            false &&

                        String(
                            s?.pin || ''
                        ).trim() ===
                            submittedPin
                );


            if (!staff) {

                return res
                    .status(403)
                    .json({

                        success: false,

                        error:
                            "PIN ou collaborateur incorrect."
                    });
            }


            // =================================================
            // 7. CHARGER HISTORIQUE POINTAGES
            // =================================================

            const punches =
                Array.isArray(
                    state
                        .activeOrders
                        ?.PUNCHES_MASTER
                        ?.data
                )
                    ? state
                        .activeOrders
                        .PUNCHES_MASTER
                        .data
                        .slice()
                    : [];


            // =================================================
            // 8. DERNIER POINTAGE DE CET EMPLOYÉ
            // =================================================

            const lastStaffPunch =
                punches
                    .filter(
                        p =>
                            String(
                                p?.staffId
                            ) ===
                            String(
                                staff.id
                            )
                    )
                    .sort(
                        (a, b) =>
                            Number(
                                a.timestamp || 0
                            ) -
                            Number(
                                b.timestamp || 0
                            )
                    )
                    .pop();


            // =================================================
            // 9. ENTRÉE / SORTIE AUTOMATIQUE
            // =================================================

            const punchType =
                lastStaffPunch &&
                String(
                    lastStaffPunch.type ||
                    ''
                )
                    .trim()
                    .toUpperCase() ===
                    'ENTRÉE'

                    ? 'SORTIE'

                    : 'ENTRÉE';


            const now =
                Date.now();


            // =================================================
            // 10. CRÉER LE POINTAGE
            // =================================================

            const punch = {

                id:
                    'rh_' +
                    safeID +
                    '_' +
                    now +
                    '_' +
                    Math
                        .random()
                        .toString(36)
                        .slice(2, 9),

                tenantID:
                    safeID,

                staffId:
                    staff.id,

                staffName:
                    staff.name ||
                    '',

                dept:
                    staff.dept ||
                    '',

                role:
                    staff.role ||
                    '',

                type:
                    punchType,

                timestamp:
                    now,

                serverRecordedAt:
                    new Date(
                        now
                    ).toISOString(),

                deviceId:
                    String(
                        deviceId || ''
                    )
                        .trim()
                        .slice(
                            0,
                            200
                        ),

                terminal:
                    'RH_POINTEUSE',

                photo:
                    (typeof photo === 'string' && photo.startsWith('data:image/') && photo.length <= 700000)
                        ? photo
                        : '',

                photoRejectedTooLarge:
                    Boolean(typeof photo === 'string' && photo.startsWith('data:image/') && photo.length > 700000)
            };


            punches.push(
                punch
            );


            // =================================================
            // 11. CONSERVER L'HISTORIQUE
            // =================================================

            const punchWindow = punches.slice(-2500);
            const safePunches = punchWindow.map((item, index) => {
                const keepPhoto = index >= punchWindow.length - 12;
                if (keepPhoto || !item?.photo) return item;
                return { ...item, photo: '', photoArchived: true };
            });


            state
                .activeOrders
                .PUNCHES_MASTER = {

                    data:
                        safePunches,

                    updatedAt:
                        new Date()
                            .toISOString()
                };


            // =================================================
            // 12. RECONSTRUIRE FEUILLES D'HEURES
            // =================================================

            const previousTimesheets =
                state
                    .activeOrders
                    ?.RH_TIMESHEET_REAL
                    ?.data || {

                        months: {}
                    };


            const timesheets =
                ichefRhBuildWorkedTimesheets(

                    safePunches,

                    previousTimesheets
                );


            state
                .activeOrders
                .RH_TIMESHEET_REAL = {

                    data:
                        timesheets,

                    updatedAt:
                        new Date()
                            .toISOString()
                };


            // =================================================
            // 13. METTRE À JOUR ONDUTY
            // =================================================

            const staffIndex =
                staffAccess.findIndex(
                    s =>
                        String(
                            s?.id
                        ) ===
                        String(
                            staff.id
                        )
                );


            if (
                staffIndex >
                -1
            ) {

                staffAccess[
                    staffIndex
                ] = {

                    ...staffAccess[
                        staffIndex
                    ],

                    onDuty:
                        punchType ===
                        'ENTRÉE',

                    lastPunchAt:
                        new Date(
                            now
                        ).toISOString(),

                    lastPunchType:
                        punchType
                };


                state
                    .activeOrders
                    .STAFF_ACCESS = {

                        data:
                            staffAccess,

                        updatedAt:
                            new Date()
                                .toISOString()
                    };
            }


            // =================================================
            // 14. SAUVEGARDE MONGODB
            // =================================================

            state.markModified(
                'activeOrders'
            );


            await state.save();

            try {
                const archiveDetails = { ...punch };
                delete archiveDetails.photo;
                await RhPunchRecord.updateOne(
                    { tenantID: safeID, punchId: punch.id },
                    { $setOnInsert: {
                        tenantID: safeID,
                        punchId: punch.id,
                        staffId: String(punch.staffId),
                        timestamp: Number(punch.timestamp),
                        type: punch.type,
                        photo: punch.photo || '',
                        details: archiveDetails,
                        createdAt: new Date()
                    } },
                    { upsert: true }
                );
            } catch (archiveError) {
                console.warn('[iCHEF RH] archive pointage non bloquante :', archiveError?.message || archiveError);
            }


            // =================================================
            // ACCÈS SERVICE ON / OFF EN TEMPS RÉEL
            // =================================================

            io
                .to(
                    safeID
                )
                .emit(
                    'staffDutyChanged',
                    {
                        staffId:
                            staff.id,

                        staffName:
                            staff.name || '',

                        dept:
                            staff.dept || '',

                        onDuty:
                            punchType === 'ENTRÉE',

                        punchType:
                            punchType,

                        timestamp:
                            now
                    }
                );


            // =================================================
            // 15. TRACE AUDIT
            // =================================================

            try {

                await scellerOperation(

                    safeID,

                    'CREATE',

                    'RH_PUNCH',

                    punch.id,

                    String(
                        staff.id
                    ),

                    {

                        staffId:
                            staff.id,

                        staffName:
                            staff.name,

                        type:
                            punchType,

                        timestamp:
                            now,

                        deviceId:
                            punch.deviceId
                    }
                );

            } catch (
                auditError
            ) {

                console.warn(
                    "Audit RH non bloquant :",
                    auditError?.message
                );
            }


            // =================================================
            // 16. SYNCHRONISATION TEMPS RÉEL
            // =================================================

            io
                .to(
                    safeID
                )
                .emit(

                    'rhPunchSaved',

                    punch
                );


            io
                .to(
                    safeID
                )
                .emit(

                    'rhTimesheetUpdated',

                    timesheets
                );


            io
                .to(
                    safeID
                )
                .emit(

                    'server-state-changed',

                    {

                        source:
                            'RH_PUNCH',

                        staffId:
                            staff.id,

                        punchType:
                            punchType,

                        timestamp:
                            now
                    }
                );


            io
                .to(
                    safeID
                )
                .emit(

                    'updateState',

                    state
                );


            // =================================================
            // 17. RÉPONSE POINTEUSE
            // =================================================

            return res.json({

                success: true,

                punchType,

                punch,

                punches:
                    safePunches,

                timesheets,

                staffAccess
            });


        } catch (
            error
        ) {

            console.error(
                "Erreur /api/rh/punch :",
                error
            );


            return res
                .status(500)
                .json({

                    success: false,

                    error:
                        "Erreur serveur pendant le pointage."
                });
        }
    }
);


// ============================================================
// CONFIRMATION AU DÉMARRAGE DU SERVEUR
// ============================================================

console.log(
    "iCHEF RH : route POST /api/rh/punch chargée"
);

console.log(
    "iCHEF RH : diagnostic GET /api/rh/health chargé"
);
// ==========================================
// MASTER CONTROL API (EMPIRE SUPER ADMIN)
// ==========================================
app.post('/api/get-all-tenants-admin', async (req, res) => {
    // 🚨 1. VÉRIFICATION DE LA CLÉ MASTER SÉCURISÉE VIA VARIABLE D'ENVIRONNEMENT
    const validKey = process.env.MASTER_KEY || "Empire2026";
    if (req.body.masterKey !== validKey) {
        console.warn("⚠️ Tentative d'accès non autorisée à la base Master.");
        return res.status(401).json({ success: false, error: "Acces Refuse." });
    }

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
            addons: t.addons || [], // Récupération des modules cochés
            maxScreens: t.maxScreens, 
            maxStaff: t.maxStaff,
            activeScreens: t.registeredDevices ? t.registeredDevices.length : 0, 
            status: t.status
        }));
        res.json({ success: true, tenants: formattedTenants });
    } catch(err) { res.status(500).json({ success: false }); }
});

app.post('/api/admin-action', async (req, res) => {
    // 🚨 2. VÉRIFICATION DE LA CLÉ POUR BLOQUER LES ATTAQUES DE MODIFICATION
    const validKey = process.env.MASTER_KEY || "Empire2026";
    if (req.body.masterKey !== validKey) {
        console.warn(`⚠️ Action d'administration bloquée (Clé invalide)`);
        return res.status(401).json({ success: false, error: "Acces Refuse." });
    }

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
        else if (action === 'delete') { 
            await Tenant.findOneAndDelete({ tenantID: safeID }); 
            await AppState.findOneAndDelete({ tenantID: safeID }); 
        }
        
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ==========================================
// OUTIL DE DIAGNOSTIC
// ==========================================
app.get('/debug-fichiers', (req, res) => {
    const fs = require('fs');
    fs.readdir(__dirname, (err, files) => {
        if (err) return res.status(500).json({ erreur: "Impossible de lire le dossier" });
        res.json({ dossier_actuel: __dirname, fichiers_trouves: files });
    });
});

// =========================================================================
// 🌟 SYNCHRONISATION CENTRALISÉE DES CARTES (CUISINE / PATISSERIE / BAR)
// =========================================================================
const MENU_SYNC_KEYS = Object.freeze({
    CUISINE: {
        menuKey: "MENU_CUISINE",
        categoriesKey: "CATEGORIES_CUISINE",
        legacyMenuKey: "MENU_MASTER"
    },
    PATISSERIE: {
        menuKey: "MENU_PATISSERIE",
        categoriesKey: "CATEGORIES_PATISSERIE",
        legacyMenuKey: "MENU_MASTER_PATISSERIE"
    },
    BAR: {
        menuKey: "MENU_BAR",
        categoriesKey: "CATEGORIES_BAR",
        legacyMenuKey: "MENU_MASTER_BAR"
    }
});

function normalizeMenuDepartment(value) {
    const department = String(value || "")
        .trim()
        .toUpperCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // Supprime les accents automatiquement (PÂTISSERIE -> PATISSERIE)

    return MENU_SYNC_KEYS[department] ? department : null;
}
// ==========================================================
// 🔌 SOCKET.IO — UNE SESSION LOGIQUE PAR ÉTABLISSEMENT / APPAREIL / ÉCRAN
// ==========================================================
const ichefActiveLogicalSockets = new Map();

function ichefSocketPageName(socket, payload = {}) {
    const auth = socket?.handshake?.auth || {};
    const query = socket?.handshake?.query || {};

    let raw =
        payload?.page ||
        payload?.module ||
        payload?.terminal ||
        auth.page ||
        auth.module ||
        auth.terminal ||
        query.page ||
        query.module ||
        query.terminal ||
        '';

    if (!raw) {
        try {
            const ref = String(socket?.handshake?.headers?.referer || '');
            if (ref) {
                const pathname = new URL(ref).pathname;
                raw = pathname.split('/').pop() || '';
            }
        } catch (_) {}
    }

    return String(raw || 'GENERIC')
        .replace(/\.html?$/i, '')
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9_-]+/g, '_')
        .slice(0, 80) || 'GENERIC';
}

function ichefSocketLogicalKey(tenantID, deviceId, page) {
    const tenant = cleanString(tenantID);
    const device = String(deviceId || '').trim();
    const screen = String(page || 'GENERIC').trim();

    if (!tenant || !device) return '';
    return `${tenant}::${device}::${screen}`;
}

// 🔥 LE SEUL ET UNIQUE BLOC io.on('connection') 🔥
io.on("connection", socket => {
    const connectedAt = Date.now();
    const currentTransport = () => socket?.conn?.transport?.name || 'unknown';

    console.log(
        `✅ Nouvelle connexion écran détectée : ${socket.id}` +
        ` | transport=${currentTransport()}` +
        ` | recovered=${socket.recovered === true}`
    );

    socket.conn.on('upgrade', transport => {
        console.log(
            `⬆️ Socket ${socket.id} transport amélioré : ${transport?.name || 'unknown'}`
        );
    });

    socket.on('error', error => {
        console.error(
            `⚠️ Erreur Socket ${socket.id} :`,
            error?.message || error
        );
    });

    // CORRECTION CRITIQUE DU BUG [object Object]
    socket.on("joinTenant", async (payload) => {
        const payloadObject =
            payload && typeof payload === 'object'
                ? payload
                : {};

        const rawID =
            typeof payload === 'object'
                ? payload.tenantID
                : payload;

        const safeID = cleanString(
            rawID ||
            socket.handshake?.auth?.tenantID ||
            socket.handshake?.query?.tenantID
        );

        if (!safeID) return;

        const page = ichefSocketPageName(socket, payloadObject);
        let deviceId =
            String(
                payloadObject.deviceId ||
                socket.handshake?.auth?.deviceId ||
                socket.handshake?.query?.deviceId ||
                ''
            ).trim();

        // Le cockpit Anti-Rush utilise une session signée côté serveur.
        if (page === 'ANTI_RUSH') {
            const claims = ichefVerifySignedSession(
                socket.handshake?.auth?.token,
                {
                    tenantID: safeID,
                    scope: 'ANTI_RUSH'
                }
            );

            if (!claims) {
                socket.emit('ichef-auth-error', {
                    success: false,
                    error: 'Session Anti-Rush invalide ou expirée.'
                });
                return socket.disconnect(true);
            }

            if (!deviceId) {
                deviceId = String(claims.deviceId || '').trim();
            }
        }

        socket.data.tenantID = safeID;
        socket.data.deviceId = deviceId;
        socket.data.page = page;

        const logicalKey =
            ichefSocketLogicalKey(
                safeID,
                deviceId,
                page
            );

        if (logicalKey) {
            const previousSocketId =
                ichefActiveLogicalSockets.get(logicalKey);

            if (
                previousSocketId &&
                previousSocketId !== socket.id
            ) {
                const previousSocket =
                    io.sockets.sockets.get(previousSocketId);

                if (previousSocket?.connected) {
                    previousSocket.emit(
                        'ichef-session-replaced',
                        {
                            tenantID: safeID,
                            deviceId,
                            page,
                            replacedBy: socket.id,
                            timestamp:
                                new Date().toISOString()
                        }
                    );

                    setTimeout(() => {
                        try {
                            if (previousSocket.connected) {
                                previousSocket.disconnect(true);
                            }
                        } catch (_) {}
                    }, 40);
                }
            }

            ichefActiveLogicalSockets.set(
                logicalKey,
                socket.id
            );

            socket.data.logicalKey = logicalKey;
        }

        if (!socket.rooms.has(safeID)) {
            await socket.join(safeID);
        }

        console.log(
            `📡 L'écran ${socket.id} est synchronisé : ${safeID}` +
            ` | device=${deviceId || 'non-renseigné'}` +
            ` | page=${page}` +
            ` | transport=${currentTransport()}` +
            ` | recovered=${socket.recovered === true}`
        );

        socket.emit('tenant-joined', {
            tenantID: safeID,
            deviceId,
            page,
            socketId: socket.id,
            recovered: socket.recovered === true,
            serverTime: new Date().toISOString()
        });

        if (!socket.recovered) {
            try {
                const currentState = await AppState.findOne({
                    tenantID: safeID
                });

                if (currentState) {
                    socket.emit("updateState", currentState);
                }
            } catch (error) {
                console.error(
                    "Erreur chargement initial Socket.IO :",
                    error.message
                );
            }
        }
    });

    socket.on("requestArchitectureState", async (payload = {}) => {
        try {
            const safeID = cleanString(
                payload?.tenantID ||
                socket.data?.tenantID ||
                socket.handshake?.auth?.tenantID
            );

            if (!safeID) return;

            const state = await AppState
                .findOne({ tenantID: safeID })
                .lean();

            const raw =
                state?.activeOrders?.ARCHITECTURE;

            const architecture =
                raw &&
                typeof raw === 'object' &&
                raw.data &&
                typeof raw.data === 'object'
                    ? raw.data
                    : (
                        raw &&
                        typeof raw === 'object'
                            ? raw
                            : {}
                    );

            socket.emit("architectureState", {
                tenantID: safeID,
                architecture,
                serverTime: new Date().toISOString()
            });

        } catch (error) {
            console.error(
                '[iCHEF SOCKET] requestArchitectureState :',
                error?.message || error
            );
        }
    });

    /*
     * Reçoit les changements de :
     * - admin.html
     * - chef.html
     * - chef-patissier.html
     * - chef-bar.html
     */
    socket.on(
        "syncMenu",
        async (payload = {}, callback) => {
            try {
                const safeID = cleanString(
                    payload.tenantID ||
                    socket.data.tenantID
                );

                const department =
                    normalizeMenuDepartment(
                        payload.department
                    );

                const config = department
                    ? MENU_SYNC_KEYS[department]
                    : null;

                if (!safeID || !config) {
                    const error =
                        "Restaurant ou département invalide.";

                    if (typeof callback === "function") {
                        callback({
                            success: false,
                            error
                        });
                    }

                    return;
                }

                const menu = payload.menu;
                const categories = payload.categories;

                if (
                    !menu ||
                    typeof menu !== "object" ||
                    Array.isArray(menu)
                ) {
                    if (typeof callback === "function") {
                        callback({
                            success: false,
                            error: "Format de carte invalide."
                        });
                    }

                    return;
                }

                if (!Array.isArray(categories)) {
                    if (typeof callback === "function") {
                        callback({
                            success: false,
                            error:
                                "Format de catégories invalide."
                        });
                    }

                    return;
                }

                const updatedAt =
                    new Date().toISOString();

                const source = String(
                    payload.source || "UNKNOWN"
                ).slice(0, 100);

                /*
                 * Sauvegarde le menu et ses catégories
                 * dans une seule opération MongoDB.
                 */
                const updateFields = {
                    [`activeOrders.${config.menuKey}`]: {
                        data: menu,
                        department,
                        source,
                        updatedAt
                    },

                    [`activeOrders.${config.categoriesKey}`]: {
                        data: categories,
                        department,
                        source,
                        updatedAt
                    }
                };

                /*
                 * Garde temporairement les anciennes clés
                 * pour ne pas casser les anciennes pages.
                 */
                if (config.legacyMenuKey) {
                    updateFields[
                        `activeOrders.${config.legacyMenuKey}`
                    ] = {
                        data: menu,
                        department,
                        source,
                        updatedAt
                    };
                }

                const newState =
                    await AppState.findOneAndUpdate(
                        {
                            tenantID: safeID
                        },
                        {
                            $set: updateFields
                        },
                        {
                            upsert: true,
                            new: true,
                            setDefaultsOnInsert: true
                        }
                    );

                const itemsCount =
                    Object.values(menu).reduce(
                        (total, items) => {
                            return total + (
                                Array.isArray(items)
                                    ? items.length
                                    : 0
                            );
                        },
                        0
                    );

                /*
                 * Trace la modification dans le journal
                 * de sécurité existant.
                 */
                await scellerOperation(
                    safeID,
                    "UPDATE",
                    `MENU_${department}`,
                    config.menuKey,
                    payload.pin || "SYSTEM",
                    {
                        source,
                        updatedAt,
                        categoriesCount:
                            categories.length,
                        itemsCount
                    }
                );

                /*
                 * Actualise tous les écrans du restaurant :
                 * admin, cuisine, pâtisserie et bar.
                 */
                io.to(safeID).emit(
                    "updateState",
                    newState
                );

                io.to(safeID).emit(
                    "menuSynced",
                    {
                        tenantID: safeID,
                        department,
                        menuKey:
                            config.menuKey,
                        categoriesKey:
                            config.categoriesKey,
                        updatedAt,
                        source
                    }
                );

                if (typeof callback === "function") {
                    callback({
                        success: true,
                        department,
                        updatedAt
                    });
                }
            } catch (error) {
                console.error(
                    "❌ Erreur syncMenu :",
                    error
                );

                if (typeof callback === "function") {
                    callback({
                        success: false,
                        error:
                            "Erreur serveur pendant la synchronisation."
                    });
                }
            }
        }
    );

    /*
     * Permet à une page de réclamer l’état complet
     * après une reconnexion Internet.
     */
    socket.on(
        "requestMenuState",
        async (payload = {}, callback) => {
            try {
                const safeID = cleanString(
                    payload.tenantID ||
                    socket.data.tenantID
                );

                if (!safeID) {
                    return;
                }

                const currentState =
                    await AppState.findOne({
                        tenantID: safeID
                    });

                if (currentState) {
                    socket.emit(
                        "updateState",
                        currentState
                    );
                }

                if (typeof callback === "function") {
                    callback({
                        success: true
                    });
                }
            } catch (error) {
                if (typeof callback === "function") {
                    callback({
                        success: false,
                        error:
                            "État des menus indisponible."
                    });
                }
            }
        }
    );

socket.on('orderUpdated', payload => {
        const safeID = cleanString(payload?.tenantID || socket.data?.tenantID);
        if (!safeID || safeID !== socket.data?.tenantID) return;
        io.to(safeID).emit('server-state-changed', {
            tenantID: safeID,
            tableId: String(payload?.tableId || ''),
            source: 'socket-orderUpdated',
            timestamp: new Date().toISOString()
        });
    });

    // Signal admin historique : aucune persistance de données via Socket client.
    socket.on('updateState', payload => {
        const safeID = cleanString(payload?.tenantID || socket.data?.tenantID);
        if (!safeID || safeID !== socket.data?.tenantID) return;
        socket.to(safeID).emit('server-state-changed', {
            tenantID: safeID,
            tableId: String(payload?.tableId || payload?.key || ''),
            source: 'socket-client-signal',
            timestamp: new Date().toISOString()
        });
    });

socket.on("disconnect", (reason, details) => {
        const logicalKey = socket.data?.logicalKey;

        if (
            logicalKey &&
            ichefActiveLogicalSockets.get(logicalKey) === socket.id
        ) {
            ichefActiveLogicalSockets.delete(logicalKey);
        }

        const durationMs = Date.now() - connectedAt;

        const detailMessage =
            details?.message ||
            details?.description ||
            '';

        console.log(
            `❌ Écran déconnecté : ${socket.id}` +
            ` | tenant=${socket.data?.tenantID || 'inconnu'}` +
            ` | device=${socket.data?.deviceId || 'non-renseigné'}` +
            ` | page=${socket.data?.page || 'non-renseignée'}` +
            ` | raison=${reason || 'inconnue'}` +
            ` | transport=${currentTransport()}` +
            ` | durée=${Math.round(durationMs / 1000)}s` +
            (detailMessage ? ` | détail=${detailMessage}` : '')
        );
    });

}); // 🔥 FERMETURE DÉFINITIVE DU BLOC DES CONNEXIONS ÉCRANS 🔥
// =========================================================================
// 🔄 PONT DE SYNCHRONISATION (COMMANDES & ÉTAT DES TABLES)
// =========================================================================
app.get('/get-current-state', async (req, res) => {
    try {
        const tenantID = cleanString(req.query.tenantID);
        if (!tenantID) return res.status(400).json({ success: false, error: 'tenantID manquant.' });
        res.setHeader('Cache-Control', 'no-store, max-age=0');
        const state = await AppState.findOne({ tenantID }).lean();
        return res.json(state || { tenantID, activeOrders: {} });
    } catch(e) { 
        console.error("Erreur /get-current-state:", e);
        return res.status(500).json({ success: false, error: 'État serveur indisponible.' }); 
    }
});


// ==========================================================
// 📱 QR / NFC — CONFIGURATION CENTRALE ATOMIQUE + CONFIRMATION


// ==========================================================
// 📱 QR / NFC — LECTURE OFFICIELLE / CONFIRMATION MONGODB
// ==========================================================
function ichefQrNfcExtractState(state) {
    const activeOrders = state?.activeOrders || {};

    const settingsNode =
        activeOrders.SETTINGS_MASTER || { data: {} };

    const settingsData =
        settingsNode &&
        typeof settingsNode.data === 'object' &&
        settingsNode.data !== null
            ? settingsNode.data
            : (settingsNode || {});

    const architectureNode =
        activeOrders.ARCHITECTURE || { data: {} };

    const architectureData =
        architectureNode &&
        typeof architectureNode.data === 'object' &&
        architectureNode.data !== null
            ? architectureNode.data
            : (architectureNode || {});

    return {
        qrNfc:
            settingsData.qrNfc &&
            typeof settingsData.qrNfc === 'object'
                ? settingsData.qrNfc
                : {},

        schedule:
            settingsData.schedule &&
            typeof settingsData.schedule === 'object'
                ? settingsData.schedule
                : {},

        zones:
            Array.isArray(architectureData.zones)
                ? architectureData.zones
                : [],

        revision:
            String(
                settingsData.qrNfcServerRevision || ''
            ),

        updatedAt:
            settingsData.qrNfcServerUpdatedAt || null
    };
}

app.get('/api/config/qr-nfc', async (req, res) => {
    try {
        const safeID =
            cleanString(req.query.tenantID);

        if (!safeID) {
            return res.status(400).json({
                success: false,
                persisted: false,
                error: 'tenantID manquant.'
            });
        }

        const state =
            await AppState
                .findOne({ tenantID: safeID })
                .lean();

        const current =
            ichefQrNfcExtractState(state || {});

        return res.json({
            success: true,
            persisted: true,
            tenantID: safeID,
            ...current
        });

    } catch (error) {
        console.error(
            '❌ Erreur GET /api/config/qr-nfc :',
            error
        );

        return res.status(500).json({
            success: false,
            persisted: false,
            error:
                'Impossible de lire la configuration QR/NFC.'
        });
    }
});

// ==========================================================
// 📱 QR / NFC — ÉCRITURE ROBUSTE, SÉRIALISÉE ET NON DESTRUCTIVE
// ==========================================================
const ichefQrNfcWriteQueues = new Map();

function ichefSerializeQrNfcWrite(tenantID, task) {
    const key = String(tenantID || '');
    const previous = ichefQrNfcWriteQueues.get(key) || Promise.resolve();

    const current = previous
        .catch(() => undefined)
        .then(task);

    ichefQrNfcWriteQueues.set(key, current);

    current.finally(() => {
        if (ichefQrNfcWriteQueues.get(key) === current) {
            ichefQrNfcWriteQueues.delete(key);
        }
    }).catch(() => {});

    return current;
}

function ichefQrNfcZoneIdentity(zone) {
    if (!zone || typeof zone !== 'object') return null;

    const candidates = [
        ['id', zone.id],
        ['zoneId', zone.zoneId],
        ['label', zone.label],
        ['name', zone.name]
    ];

    for (const [field, value] of candidates) {
        const clean = String(value ?? '').trim();
        if (clean) {
            // Conserver le type MongoDB original (ex. id numérique).
            return { field, value };
        }
    }

    return null;
}

function ichefNormalizeZoneMode(value) {
    const mode = String(value || 'standard').trim().toLowerCase();

    if (mode === 'qr_nfc' || mode === 'bar' || mode === 'standard') {
        return mode;
    }

    return 'standard';
}

app.post('/api/config/qr-nfc', async (req, res) => {
    const safeID = cleanString(req.query.tenantID || req.body?.tenantID);

    if (!safeID) {
        return res.status(400).json({
            success: false,
            persisted: false,
            error: 'tenantID manquant.'
        });
    }

    try {
        const result = await ichefSerializeQrNfcWrite(
            safeID,
            async () => {
                const incomingQrNfc =
                    req.body?.qrNfc &&
                    typeof req.body.qrNfc === 'object' &&
                    !Array.isArray(req.body.qrNfc)
                        ? req.body.qrNfc
                        : {};

                const incomingSchedule =
                    req.body?.schedule &&
                    typeof req.body.schedule === 'object' &&
                    !Array.isArray(req.body.schedule)
                        ? req.body.schedule
                        : {};

                const incomingZones = Array.isArray(req.body?.zones)
                    ? req.body.zones.slice(0, 500)
                    : [];

                const now = new Date().toISOString();
                const revision =
                    `qrnfc_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;

                const nextQrNfc = {
                    ...incomingQrNfc,
                    source: 'qr_nfc',
                    mode: 'commande',
                    serverUpdatedAt: now
                };

                await AppState.findOneAndUpdate(
                    { tenantID: safeID },
                    {
                        $set: {
                            'activeOrders.SETTINGS_MASTER.data.qrNfc': nextQrNfc,
                            'activeOrders.SETTINGS_MASTER.data.schedule': incomingSchedule,
                            'activeOrders.SETTINGS_MASTER.data.qrNfcServerRevision': revision,
                            'activeOrders.SETTINGS_MASTER.data.qrNfcServerUpdatedAt': now,
                            'activeOrders.SETTINGS_MASTER.updatedAt': now
                        }
                    },
                    {
                        upsert: true,
                        new: true,
                        setDefaultsOnInsert: true
                    }
                );

                let zonesUpdated = 0;

                for (const incomingZone of incomingZones) {
                    const identity = ichefQrNfcZoneIdentity(incomingZone);
                    if (!identity) continue;

                    const requestedMode = ichefNormalizeZoneMode(
                        incomingZone.payMode ?? incomingZone.mode
                    );

                    const zoneField =
                        `activeOrders.ARCHITECTURE.data.zones.${identity.field}`;

                    const updateResult = await AppState.updateOne(
                        {
                            tenantID: safeID,
                            [zoneField]: identity.value
                        },
                        {
                            $set: {
                                'activeOrders.ARCHITECTURE.data.zones.$.payMode':
                                    requestedMode,
                                'activeOrders.ARCHITECTURE.data.zones.$.mode':
                                    requestedMode,
                                'activeOrders.ARCHITECTURE.updatedAt':
                                    now
                            }
                        }
                    );

                    if (updateResult.modifiedCount > 0) {
                        zonesUpdated += 1;
                    }
                }

                const confirmedState =
                    await AppState
                        .findOne({ tenantID: safeID })
                        .lean();

                if (!confirmedState) {
                    throw new Error(
                        'État introuvable après sauvegarde QR/NFC.'
                    );
                }

                const confirmed =
                    ichefQrNfcExtractState(confirmedState);

                if (String(confirmed.revision || '') !== revision) {
                    throw new Error(
                        'Révision QR/NFC non confirmée par MongoDB.'
                    );
                }

                io.to(safeID).emit(
                    'qr-nfc-config-changed',
                    {
                        tenantID: safeID,
                        revision,
                        qrNfc: confirmed.qrNfc,
                        schedule: confirmed.schedule,
                        zones: confirmed.zones,
                        zonesUpdated,
                        updatedAt: now
                    }
                );

                io.to(safeID).emit(
                    'server-state-changed',
                    {
                        tableId: 'QR_NFC_CONFIG',
                        source: 'api/config/qr-nfc',
                        revision,
                        updatedAt: now
                    }
                );

                io.to(safeID).emit(
                    'updateState',
                    confirmedState
                );

                console.log(
                    `✅ QR/NFC enregistré et relu : ${safeID}` +
                    ` | revision=${revision}` +
                    ` | zones=${confirmed.zones.length}` +
                    ` | modes_modifiés=${zonesUpdated}`
                );

                return {
                    revision,
                    confirmed,
                    zonesUpdated,
                    updatedAt: now
                };
            }
        );

        return res.json({
            success: true,
            persisted: true,
            tenantID: safeID,
            revision: result.revision,
            qrNfc: result.confirmed.qrNfc,
            schedule: result.confirmed.schedule,
            zones: result.confirmed.zones,
            zonesUpdated: result.zonesUpdated,
            updatedAt: result.updatedAt
        });

    } catch (error) {
        console.error(
            '❌ Erreur POST /api/config/qr-nfc :',
            error
        );

        return res.status(500).json({
            success: false,
            persisted: false,
            error:
                process.env.NODE_ENV === 'development'
                    ? String(error?.message || error)
                    : 'Impossible d’enregistrer la configuration QR/NFC.'
        });
    }
});


// 👥 STAFF_ACCESS — PROTECTION ANTI-ÉCRASEMENT DU POINTAGE
// ==========================================================
// La route officielle /api/rh/punch est la seule qui doit modifier
// onDuty / lastPunchAt / lastPunchType.
//
// Les sauvegardes génériques de Configuration/RH peuvent modifier
// nom, rôle, PIN, département, actif, etc., mais ne doivent pas
// ramener un serveur déjà pointé à "Pointer" avec un vieux snapshot.
async function ichefMergeStaffAccessPreservingDuty(tenantID, incomingOrder) {

    const currentState =
        await AppState
            .findOne({ tenantID })
            .lean();

    const currentNode =
        currentState?.activeOrders?.STAFF_ACCESS &&
        typeof currentState.activeOrders.STAFF_ACCESS === 'object'
            ? currentState.activeOrders.STAFF_ACCESS
            : { data: [] };

    const currentList =
        Array.isArray(currentNode?.data)
            ? currentNode.data
            : [];

    const incomingList =
        Array.isArray(incomingOrder?.data)
            ? incomingOrder.data
            : [];

    const staffKey = staff => {
        const id = String(staff?.id || '').trim();
        if (id) return `id:${id}`;

        const pin = String(staff?.pin || '').trim();
        if (pin) return `pin:${pin}`;

        return '';
    };

    const currentByKey = new Map();

    currentList.forEach(staff => {
        const key = staffKey(staff);
        if (key) currentByKey.set(key, staff);
    });

    const merged = incomingList.map(incomingStaff => {

        const previous =
            currentByKey.get(
                staffKey(incomingStaff)
            );

        const next = {
            ...(previous || {}),
            ...(incomingStaff || {})
        };

        if (previous) {
            next.onDuty =
                previous.onDuty === true;

            if (previous.lastPunchAt !== undefined) {
                next.lastPunchAt =
                    previous.lastPunchAt;
            }

            if (previous.lastPunchType !== undefined) {
                next.lastPunchType =
                    previous.lastPunchType;
            }
        } else {
            next.onDuty = false;
        }

        // Désactiver un profil ferme toujours son accès service.
        if (next.active === false) {
            next.onDuty = false;
        }

        return next;
    });

    return {
        ...incomingOrder,
        data: merged,
        updatedAt:
            currentNode?.updatedAt ||
            incomingOrder?.updatedAt ||
            new Date().toISOString(),
        profileUpdatedAt:
            new Date().toISOString()
    };
}

app.post('/update-order', async (req, res) => {
    try {
        const tenantID =
            cleanString(
                req.query.tenantID
            );

        const {
            tableId,
            order,
            pin,
            terminal,
            deviceId,
            auditReason,
            operator
        } = req.body || {};

        if (!tenantID) {
            return res.status(400).json({ success: false, persisted: false, error: 'tenantID manquant.' });
        }

        if (!ichefValidStateKey(tableId)) {
            return res.status(400).json({ success: false, persisted: false, error: 'Clé de synchronisation invalide.' });
        }

        if (order !== null && ichefJsonBytes(order) > ICHEF_MAX_STATE_NODE_BYTES) {
            return res.status(413).json({
                success: false,
                persisted: false,
                code: 'STATE_NODE_TOO_LARGE',
                error: 'Donnée trop volumineuse pour une synchronisation sûre.'
            });
        }

        const terminalAccess =
            await ichefCheckServiceTerminalAccess({
                tenantID,
                pin,
                terminal
            });

        if (!terminalAccess.ok) {
            return res
                .status(terminalAccess.status || 403)
                .json({
                    success: false,
                    error:
                        terminalAccess.error ||
                        'Accès service refusé.',
                    code:
                        terminalAccess.requiresDuty === true &&
                        terminalAccess.onDuty !== true
                            ? 'NOT_ON_DUTY'
                            : 'TERMINAL_ACCESS_DENIED',
                    onDuty:
                        terminalAccess.onDuty === true,
                    requiresDuty:
                        terminalAccess.requiresDuty === true
                });
        }

        // Lecture ciblée de la valeur précédente pour produire un historique fiable
        // sans charger tout AppState en mémoire.
        const historyProjection = {
            [`activeOrders.${tableId}`]: 1,
            'activeOrders.AUDIT_MASTER': 1
        };
        const previousStateForHistory = await AppState
            .findOne({ tenantID }, historyProjection)
            .lean();
        const previousValueForHistory =
            previousStateForHistory?.activeOrders?.[tableId];

        const actorForHistory = ichefHistoryActor(terminalAccess, req.body || {});

        let orderToPersist = order;

        if (
            tableId === 'STAFF_ACCESS' &&
            order &&
            Array.isArray(order.data)
        ) {
            orderToPersist =
                await ichefMergeStaffAccessPreservingDuty(
                    tenantID,
                    order
                );
        }

        const centralHistoryEntries = ichefBuildCentralHistoryEntries(
            previousValueForHistory,
            orderToPersist,
            {
                tableId: String(tableId),
                terminal: String(terminal || 'INCONNU'),
                deviceId: String(deviceId || ''),
                auditReason: String(auditReason || ''),
                operator: actorForHistory.operator,
                role: actorForHistory.role,
                source: 'update-order'
            }
        );

        let updateQuery = {};

        if (order === null) {
            updateQuery = {
                $unset: {
                    [`activeOrders.${tableId}`]: ""
                }
            };
        } else {
            updateQuery = {
                $set: {
                    [`activeOrders.${tableId}`]: orderToPersist
                }
            };
        }

        if (centralHistoryEntries.length && String(tableId) !== 'AUDIT_MASTER') {
            const nextAuditNode = ichefBuildAuditMasterNode(
                previousStateForHistory?.activeOrders?.AUDIT_MASTER,
                centralHistoryEntries
            );
            updateQuery.$set = {
                ...(updateQuery.$set || {}),
                'activeOrders.AUDIT_MASTER': nextAuditNode
            };
        }

        const newState =
            await AppState.findOneAndUpdate(
                { tenantID },
                updateQuery,
                {
                    upsert: true,
                    new: true
                }
            );

        const finalPersistedState =
            typeof newState?.toObject === 'function'
                ? newState.toObject()
                : newState;

        // Archive durable séparée de la table active.
        await ichefArchiveCentralHistory(tenantID, centralHistoryEntries);

        if (centralHistoryEntries.length) {
            io.to(tenantID).emit('auditUpdated', {
                tenantID,
                tableId: String(tableId),
                entries: centralHistoryEntries,
                timestamp: new Date().toISOString()
            });
        }

        io
            .to(tenantID)
            .emit(
                "updateState",
                finalPersistedState
            );

        io
            .to(tenantID)
            .emit(
                "server-state-changed",
                {
                    tenantID,
                    tableId,
                    source: "update-order",
                    persisted: true,
                    historyCount: centralHistoryEntries.length,
                    timestamp: new Date().toISOString()
                }
            );

       if (String(tableId || '').toUpperCase() === 'ARCHITECTURE') {
            const persistedArchitectureNode =
                newState?.activeOrders?.ARCHITECTURE ?? orderToPersist ?? {};

            const rawArchitecture =
                persistedArchitectureNode &&
                typeof persistedArchitectureNode === 'object' &&
                persistedArchitectureNode.data &&
                typeof persistedArchitectureNode.data === 'object'
                    ? persistedArchitectureNode.data
                    : persistedArchitectureNode;

            const architecture = {
                ...(rawArchitecture && typeof rawArchitecture === 'object' ? rawArchitecture : {}),
                rooms: Array.isArray(rawArchitecture?.rooms) && rawArchitecture.rooms.length
                    ? rawArchitecture.rooms
                    : ['Salle Principale'],
                tables: Array.isArray(rawArchitecture?.tables) ? rawArchitecture.tables : [],
                zones: Array.isArray(rawArchitecture?.zones) ? rawArchitecture.zones : [],
                elements: Array.isArray(rawArchitecture?.elements) ? rawArchitecture.elements : [],
                canvas: rawArchitecture?.canvas && typeof rawArchitecture.canvas === 'object'
                    ? rawArchitecture.canvas
                    : {}
            };

            const architecturePacket = {
                tenantID,
                architecture,
                source: 'update-order',
                terminal: String(terminal || '').trim(),
                updatedAt: architecture?.updatedAt || Date.now(),
                serverTime: Date.now()
            };

            // Le même plan complet part immédiatement vers ADMIN, PACK-ECO et TELEPHONE.
            io.to(tenantID).emit('architectureState', architecturePacket);
            io.to(tenantID).emit('architecture-changed', architecturePacket);
        }

        return res.json({
            success: true,
            persisted: true,
            symbiose: true,
            historyCount: centralHistoryEntries.length,
            order: order === null ? null : (finalPersistedState?.activeOrders?.[tableId] ?? orderToPersist),
            serverTime: new Date().toISOString()
        });

    } catch (e) {
        console.error(
            "Erreur /update-order:",
            e
        );

        const tooLarge = e?.code === 10334 || /BSONObjectTooLarge|object to insert too large|document.*larger than/i.test(String(e?.message || ''));

        return res
            .status(tooLarge ? 413 : 500)
            .json({
                success: false,
                persisted: false,
                code: tooLarge ? 'APP_STATE_TOO_LARGE' : 'UPDATE_ORDER_FAILED',
                error: tooLarge
                    ? 'État du restaurant trop volumineux. Le serveur a protégé MongoDB contre un document dépassant sa limite.'
                    : "Erreur serveur pendant l'enregistrement de la commande."
            });
    }

});

// ==========================================================
// 🧾 LECTURE HISTORIQUE CENTRAL — MANAGER / STAFF AUTORISÉ
// ==========================================================
app.get('/api/audit/history', async (req, res) => {
    try {
        const tenantID = cleanString(
            req.query?.tenantID || req.headers['x-ichef-tenant'] || ''
        );
        const pin = String(
            req.query?.pin || req.headers['x-ichef-pin'] || ''
        ).trim();

        const auth = await ichefAuthorizePin(tenantID, pin);
        if (!auth.ok) {
            return res.status(auth.status || 403).json({
                success: false,
                error: auth.error || 'Historique non autorisé.'
            });
        }

        const tableId = String(req.query?.tableId || '').trim();
        const serviceId = String(req.query?.serviceId || '').trim();
        const source = String(req.query?.source || '').trim();
        const requestedLimit = Number(req.query?.limit || 500);
        const limit = Math.max(1, Math.min(5000, Number.isFinite(requestedLimit) ? requestedLimit : 500));

        const filter = { tenantID };
        if (tableId) filter.tableId = tableId;
        if (serviceId) filter.serviceId = serviceId;
        if (source) filter.source = source;

        let rows = await SystemHistoryRecord
            .find(filter)
            .sort({ at: -1, _id: -1 })
            .limit(limit)
            .lean();

        // Compatibilité immédiate si l'archive séparée vient juste d'être activée.
        if (!rows.length) {
            const state = await AppState.findOne({ tenantID }, { 'activeOrders.AUDIT_MASTER': 1 }).lean();
            rows = ichefAuditMasterArray(state?.activeOrders?.AUDIT_MASTER)
                .filter(e => !tableId || String(e?.tableId || '') === tableId)
                .slice(0, limit);
        }

        return res.json({
            success: true,
            tenantID,
            count: rows.length,
            data: rows
        });
    } catch (error) {
        console.error('[iCHEF HISTORIQUE CENTRAL] lecture :', error);
        return res.status(500).json({
            success: false,
            error: 'Historique central indisponible.'
        });
    }
});

// ==========================================================
// 📱 RÉINITIALISATION DES APPAREILS / ÉCRANS ENREGISTRÉS
// ==========================================================
app.post(['/api/kill-switch', '/api/admin-reset-devices'], async (req, res) => {
    try {
        const tenantID = cleanString(req.body?.tenantID);
        if (!tenantID) return res.status(400).json({ success: false, error: "Identifiant manquant." });

        const tenant = await Tenant.findOne({ tenantID });
        if (!tenant) return res.status(404).json({ success: false, error: "Établissement inconnu." });

        // Libère tous les anciens appareils
        tenant.registeredDevices = [];
        await tenant.save();

        const screenLimit = await syncTenantScreenLimit(tenant);

        return res.json({
            success: true,
            message: "Tous les appareils enregistrés ont été réinitialisés.",
            maxScreens: screenLimit,
            registeredScreens: 0,
            availableScreens: screenLimit
        });
    } catch (error) {
        console.error("Erreur reset appareils :", error);
        return res.status(500).json({ success: false, error: "Erreur serveur." });
    }
}); // <--- LA PARENTHÈSE MANQUANTE ÉTAIT ICI !

// ==========================================
// 🛠️ CRÉATION MANUELLE D'UN NOUVEAU CLIENT
// ==========================================
async function creerNouveauClient(nomRestaurant, emailContact, planChoisi) {
    try {
        // 1. Génération d'un tenantID propre et unique (ex: "le-bistrot-9f4a")
        const baseId = nomRestaurant.toLowerCase().trim().replace(/[^a-z0-9]/g, '-');
        const uniqueSuffix = Math.random().toString(36).substring(2, 6);
        const tenantID = `${baseId}-${uniqueSuffix}`;

        // 2. Génération d'un code PIN maître sécurisé à 4 chiffres
        const pin = Math.floor(1000 + Math.random() * 9000).toString();

        // 3. Définition des limites selon le plan (utilise ta fonction existante)
        const limitScreens = getPlanScreenLimit(planChoisi);
        const limitStaff = ['CHEF', 'PATISSIER', 'BAR'].includes(planChoisi) ? 1 : 999;

        // 4. Inscription dans la base de données
        const nouveauClient = await Tenant.create({
            tenantID: tenantID,
            clientName: nomRestaurant,
            email: emailContact,
            status: 'ACTIF',
            plan: planChoisi, 
            pin: pin,
            maxScreens: limitScreens,
            maxStaff: limitStaff
        });

        console.log(`✅ Client créé avec succès : ${nomRestaurant}`);
        console.log(`🔑 URL d'accès : https://os.iche.fr/administration.html?tenantID=${tenantID}`);
        console.log(`🔒 PIN Maître : ${pin}`);

        return nouveauClient;

    } catch (e) {
        console.error("❌ Erreur lors de la création du client :", e);
        return null;
    }
}

// ==========================================
// 💳 PAIEMENT DES COMMANDES (STRIPE CONNECT)
// ==========================================================
// ENCAISSEMENT FISCAL OFFICIEL
// MongoDB = source de vérité
// ==========================================================

app.post('/api/fiscal/cash-in', async (req, res) => {

    try {

        const tenantID =
            cleanString(
                req.body?.tenantID ||
                req.headers['x-ichef-tenant']
            );

        const pin =
            String(
                req.body?.pin ||
                req.headers['x-ichef-pin'] ||
                ''
            ).trim();

        const paymentRequestId =
            String(
                req.body?.paymentRequestId ||
                req.headers['idempotency-key'] ||
                ''
            ).trim();

        const orderSnapshot =
            req.body?.orderSnapshot || {};

        const payment =
            req.body?.payment || {};

        const fiscalContext =
            req.body?.fiscalContext || {};

        const deviceId =
            String(
                req.body?.deviceId ||
                req.headers['x-ichef-device'] ||
                ''
            );

        if (!tenantID) {
            return res.status(400).json({
                success: false,
                error: 'Restaurant manquant.'
            });
        }

        const tenant =
            await Tenant.findOne({
                tenantID
            });

        if (!tenant) {
            return res.status(404).json({
                success: false,
                error: 'Restaurant introuvable.'
            });
        }

        if (
            pin &&
            String(tenant.pin || '').trim() !== pin
        ) {

            const state =
                await AppState.findOne({
                    tenantID
                });

            const staff =
                Array.isArray(
                    state?.activeOrders
                        ?.STAFF_ACCESS?.data
                )
                    ? state.activeOrders
                        .STAFF_ACCESS.data
                    : [];

            const member =
                staff.find(s =>
                    String(s?.pin || '').trim() === pin &&
                    s?.active !== false
                );

            if (!member) {

                await ichefFiscalDiagnostic(
                    req,
                    {
                        tenantID,
                        type: 'PAYMENT_ERROR',
                        status: 'REFUSED',
                        severity: 'WARNING',
                        code: 'PIN_INVALID',
                        message:
                            'Paiement refusé : PIN invalide.'
                    }
                );

                return res.status(403).json({
                    success: false,
                    error:
                        'PIN invalide.'
                });
            }
        }

        if (
            !orderSnapshot ||
            !orderSnapshot.tableId
        ) {
            return res.status(400).json({
                success: false,
                error:
                    'Commande ou table manquante.'
            });
        }

        const amount =
            Math.round(
                Number(
                    payment.amount ??
                    orderSnapshot.total ??
                    0
                ) * 100
            ) / 100;

        if (!(amount > 0)) {

            await ichefFiscalDiagnostic(
                req,
                {
                    tenantID,
                    type: 'PAYMENT_ERROR',
                    status: 'REFUSED',
                    severity: 'WARNING',
                    code: 'INVALID_AMOUNT',
                    message:
                        'Montant de paiement invalide.',
                    tableId:
                        orderSnapshot.tableId
                }
            );

            return res.status(400).json({
                success: false,
                error:
                    'Montant de paiement invalide.'
            });
        }

        const method =
            String(
                payment.method ||
                'AUTRE'
            )
                .trim()
                .toUpperCase();

        const allowedMethods =
            new Set([
                'CARTE',
                'CARD',
                'CB',
                'ESPÈCES',
                'ESPECES',
                'CASH',
                'TWINT',
                'AUTRE',
                'MULTIPLE',
                'STRIPE'
            ]);

        if (!allowedMethods.has(method)) {

            return res.status(400).json({
                success: false,
                error:
                    'Moyen de paiement inconnu.'
            });
        }

        let state =
            await AppState.findOne({
                tenantID
            });

        if (!state) {

            state =
                new AppState({
                    tenantID,
                    activeOrders: {}
                });
        }

        if (!state.activeOrders) {
            state.activeOrders = {};
        }

        if (
            !state.activeOrders
                .FINANCIAL_HISTORY
        ) {

            state.activeOrders
                .FINANCIAL_HISTORY = {
                    data: []
                };
        }

        const history =
            Array.isArray(
                state.activeOrders
                    .FINANCIAL_HISTORY.data
            )
                ? state.activeOrders
                    .FINANCIAL_HISTORY.data
                : [];

        // ---------------------------------------
        // ANTI-DOUBLE PAIEMENT / IDEMPOTENCE
        // ---------------------------------------

        if (paymentRequestId) {

            const previous =
                history.find(tx =>
                    String(
                        tx?.paymentRequestId ||
                        tx?.operationId ||
                        ''
                    ) ===
                    paymentRequestId
                );

            if (previous) {

                return res.json({
                    success: true,
                    idempotent: true,
                    duplicate: true,

                    ticketNumber:
                        previous.ticketNumber,

                    fiscalId:
                        previous.ticketNumber,

                    ticketHash:
                        previous.ticketHash ||
                        '',

                    amount:
                        previous.amount,

                    payments:
                        previous.payments ||
                        [],

                    publicReceiptUrl:
                        previous.receipt
                            ?.publicUrl ||
                        null,

                    serverTimestamp:
                        previous.createdAt ||
                        previous.date ||
                        null,

                    vatSummary:
                        previous.vatSummary ||
                        null,

                    fiscalControlToken:
                        previous.fiscalControl?.token ||
                        null,

                    fiscalControlPath:
                        previous.fiscalControl?.token
                            ? ichefBuildFiscalControlPath(tenantID, previous.ticketNumber, previous.fiscalControl.token)
                            : null,

                    fiscalControlVersion:
                        previous.fiscalControl?.version ||
                        null
                });
            }
        }

        const ticketNumber =
            'TCK-' +
            Date.now()
                .toString()
                .slice(-10) +
            '-' +
            crypto
                .randomBytes(3)
                .toString('hex')
                .toUpperCase();

        const now =
            new Date().toISOString();

        const payments =
            Array.isArray(payment.details) &&
            payment.details.length
                ? payment.details.map(p => ({
                    method:
                        String(
                            p?.method ||
                            method
                        ),

                    amount:
                        Number(
                            p?.amount ||
                            0
                        ),

                    confirmedBy:
                        p?.confirmedBy ||
                        orderSnapshot.waiter ||
                        'SERVEUR',

                    confirmedAt:
                        p?.confirmedAt ||
                        now,

                    paymentRequestId:
                        p?.paymentRequestId ||
                        paymentRequestId ||
                        '',

                    receiptPreference:
                        p?.receiptPreference ||
                        req.body
                            ?.receiptPreference ||
                        ''
                }))
                : [{
                    method,
                    amount,

                    confirmedBy:
                        orderSnapshot.waiter ||
                        'SERVEUR',

                    confirmedAt:
                        now,

                    paymentRequestId,

                    receiptPreference:
                        req.body
                            ?.receiptPreference ||
                        ''
                }];

        const receiptPreference =
            String(
                req.body?.receiptPreference ||
                req.body?.receipt
                    ?.preference ||
                ''
            );

        const receiptToken =
            String(
                req.body?.receipt
                    ?.publicToken ||
                ''
            );

        const vatSummary =
            ichefFrozenBuildVatSummary(
                orderSnapshot,
                amount
            );

        const fiscalControlToken =
            ichefBuildFiscalControlToken();

        const ticketBase = {

            id:
                paymentRequestId ||
                ticketNumber,

            operationId:
                paymentRequestId ||
                ticketNumber,

            paymentRequestId,

            ticketNumber,

            type:
                'SALE',

            status:
                'PAID',

            tenantID,

            tableId:
                String(
                    orderSnapshot.tableId
                ),

            method,

            payments,

            amount,

            total:
                Number(
                    orderSnapshot.total ??
                    amount
                ),

            totalHT:
                Number(
                    orderSnapshot.totalHT ||
                    0
                ),

            currency:
                String(
                    payment.currency ||
                    fiscalContext.currency ||
                    'CHF'
                )
                    .toUpperCase(),

            country:
                String(
                    fiscalContext.country ||
                    ''
                )
                    .toUpperCase(),

            tva:
                orderSnapshot.tva ||
                {},

            vatSummary,

            fiscalControl: {
                version: 1,
                token: fiscalControlToken,
                issuedAt: now,
                purpose: 'FISCAL_CONTROL'
            },

            pax:
                Number(
                    orderSnapshot.pax ||
                    0
                ),

            zone:
                orderSnapshot.zone ||
                '',

            waiter:
                orderSnapshot.waiter ||
                'SERVEUR',

            deviceId,

            terminal:
                req.body?.terminal ||
                'PAD',

            createdAt:
                now,

            date:
                now,

            timestamp:
                Date.now(),

            receipt: {
                requested:
                    receiptPreference !==
                    'none',

                preference:
                    receiptPreference,

                publicToken:
                    receiptToken
            },

            orderSnapshot:
                JSON.parse(
                    JSON.stringify(
                        orderSnapshot
                    )
                )
        };

        const ticketHash =
            crypto
                .createHash('sha256')
                .update(
                    JSON.stringify(
                        ticketBase
                    )
                )
                .digest('hex');

        const transaction = {
            ...ticketBase,
            ticketHash
        };

        transaction.fiscalControlUrl =
            ichefBuildFiscalControlPath(
                tenantID,
                ticketNumber,
                fiscalControlToken
            );

        // ---------------------------------------
        // URL TICKET CLIENT
        // ---------------------------------------

        if (
            transaction.receipt
                .requested &&
            receiptToken
        ) {

            const forwarded =
                String(
                    req.headers[
                        'x-forwarded-proto'
                    ] || ''
                )
                    .split(',')[0]
                    .trim();

            const protocol =
                forwarded ||
                req.protocol ||
                'https';

            transaction.receipt
                .publicUrl =
                `${protocol}://${req.get('host')}` +
                `/api/public-receipt` +
                `?tenantID=${encodeURIComponent(tenantID)}` +
                `&token=${encodeURIComponent(receiptToken)}`;
        }

        // ---------------------------------------
        // FINANCIAL_HISTORY
        // ---------------------------------------

        history.unshift(transaction);

        state.activeOrders
            .FINANCIAL_HISTORY.data =
            history.slice(
                0,
                ICHEF_FINANCIAL_CACHE_LIMIT
            );

        // ---------------------------------------
        // TABLE PAYÉE
        // ---------------------------------------

        const tableId =
            String(
                orderSnapshot.tableId
            );

        const current =
            state.activeOrders[
                tableId
            ] &&
            typeof state.activeOrders[
                tableId
            ] === 'object'
                ? state.activeOrders[
                    tableId
                ]
                : {};

        state.activeOrders[
            tableId
        ] = {
            ...current,

            ...orderSnapshot,

            status:
                'FISCALIZED',

            fiscalStatus:
                'FISCALIZED',

            paymentStatus:
                'PAID',

            isArchived:
                true,

            closedAt:
                now,

            fiscalFinalizedAt:
                now,

            fiscalReceiptReference:
                ticketNumber,

            fiscalHash:
                ticketHash,

            fiscalTicket: {
                ticketNumber,
                ticketHash,
                date: now,
                controlToken: fiscalControlToken,
                controlPath: transaction.fiscalControlUrl,
                vatSummary
            },

            paymentDraft: {
                version: 3,

                status:
                    'PAYE',

                fiscalStatus:
                    'SERVER_FISCALIZED',

                total:
                    amount,

                remaining:
                    0,

                payments,

                receiptReference:
                    ticketNumber,

                fiscalHash:
                    ticketHash,

                receiptPreference,

                updatedAt:
                    now,

                updatedBy:
                    orderSnapshot.waiter ||
                    'SERVEUR',

                deviceId,

                fiscalCountry:
                    String(
                        fiscalContext.country ||
                        ''
                    )
                        .toUpperCase()
            }
        };

        state.markModified(
            'activeOrders'
        );

        await state.save();

        // ---------------------------------------
        // JOURNAL FISCAL PERMANENT
        // ---------------------------------------

        await ichefWriteFiscalRecord({

            tenantID,

            recordId:
                paymentRequestId ||
                ticketNumber,

            operationId:
                paymentRequestId,

            type:
                'SALE',

            subtype:
                'PAYMENT',

            tableId,

            ticketNumber,

            status:
                'PAID',

            amount,

            currency:
                transaction.currency,

            operator:
                orderSnapshot.waiter ||
                'SERVEUR',

            terminal:
                req.body?.terminal ||
                'PAD',

            deviceId,

            createdAt:
                now,

            details:
                transaction
        });

        // ---------------------------------------
        // SCELLÉ CRYPTO
        // ---------------------------------------

        await scellerOperation(
            tenantID,
            'CASH_IN',
            'PAIEMENT',
            ticketNumber,
            pin ||
            orderSnapshot.waiter ||
            'SYSTEM',
            transaction
        );

        // ---------------------------------------
        // TEMPS RÉEL
        // ---------------------------------------

        const finalState =
            state.toObject();

        io.to(
            tenantID
        ).emit(
            'transactionSaved',
            {
                tenantID,
                transaction
            }
        );

        io.to(
            tenantID
        ).emit(
            'paymentUpdated',
            {
                tenantID,
                transaction
            }
        );

        io.to(
            tenantID
        ).emit(
            'updateState',
            finalState
        );

        io.to(
            tenantID
        ).emit(
            'server-state-changed',
            {
                tenantID,
                tableId,
                source:
                    'fiscal-cash-in',
                operationId:
                    paymentRequestId,
                persisted:
                    true,
                timestamp:
                    now
            }
        );

        return res.json({

            success:
                true,

            ticketNumber,

            fiscalId:
                ticketNumber,

            ticketHash,

            payments,

            amount,

            operationId:
                paymentRequestId,

            publicReceiptUrl:
                transaction.receipt
                    ?.publicUrl ||
                null,

            serverTimestamp:
                now,

            vatSummary,

            fiscalControlToken,

            fiscalControlPath:
                transaction.fiscalControlUrl,

            fiscalControlVersion:
                1
        });

    } catch (error) {

        console.error(
            '[iCHEF fiscal cash-in]',
            error
        );

        await ichefFiscalDiagnostic(
            req,
            {
                type:
                    'PAYMENT_ERROR',

                status:
                    'ERROR',

                severity:
                    'CRITICAL',

                code:
                    'CASH_IN_EXCEPTION',

                message:
                    error?.message ||
                    'Erreur encaissement.'
            }
        ).catch(() => {});

        return res
            .status(500)
            .json({
                success:
                    false,

                error:
                    error?.message ||
                    'Erreur encaissement.'
            });
    }
});
// ==========================================================
// COMPATIBILITÉ TRANSACTIONS / Z / ANCIENS ÉCRANS
// ==========================================================

app.post('/api/save-transaction', async (req, res) => {

    try {

        const tenantID =
            cleanString(
                req.body?.tenantID ||
                req.headers['x-ichef-tenant']
            );

        const transaction =
            req.body?.transaction;

        if (
            !tenantID ||
            !transaction ||
            typeof transaction !==
                'object'
        ) {
            return res.status(400).json({
                success: false,
                error:
                    'Transaction invalide.'
            });
        }

        const operationId =
            String(
                transaction.operationId ||
                transaction.id ||
                req.headers[
                    'idempotency-key'
                ] ||
                ''
            ).trim();

        if (!operationId) {

            return res.status(400).json({
                success: false,
                error:
                    "Identifiant d'opération manquant."
            });
        }

        let state =
            await AppState.findOne({
                tenantID
            });

        if (!state) {

            state =
                new AppState({
                    tenantID,
                    activeOrders: {}
                });
        }

        if (!state.activeOrders) {
            state.activeOrders = {};
        }

        if (
            !state.activeOrders
                .FINANCIAL_HISTORY
        ) {

            state.activeOrders
                .FINANCIAL_HISTORY = {
                    data: []
                };
        }

        const history =
            Array.isArray(
                state.activeOrders
                    .FINANCIAL_HISTORY.data
            )
                ? state.activeOrders
                    .FINANCIAL_HISTORY.data
                : [];

        const existing =
            history.find(tx =>
                String(
                    tx?.operationId ||
                    tx?.id ||
                    ''
                ) === operationId
            );

        if (existing) {

            return res.json({
                success: true,
                duplicate: true,
                transaction:
                    existing
            });
        }

        const stored =
            JSON.parse(
                JSON.stringify(
                    transaction
                )
            );

        stored.operationId =
            operationId;

        stored.id =
            stored.id ||
            operationId;

        stored.serverRecordedAt =
            new Date().toISOString();

        history.unshift(
            stored
        );

        state.activeOrders
            .FINANCIAL_HISTORY.data =
            history.slice(
                0,
                ICHEF_FINANCIAL_CACHE_LIMIT
            );

        state.markModified(
            'activeOrders'
        );

        await state.save();

        await ichefWriteFiscalRecord({

            tenantID,

            recordId:
                operationId,

            operationId,

            type:
                stored.type ||
                'TRANSACTION',

            subtype:
                stored.subtype ||
                '',

            tableId:
                stored.tableId ||
                stored.orderSnapshot
                    ?.tableId ||
                '',

            ticketNumber:
                stored.ticketNumber ||
                stored.orderSnapshot
                    ?.ticketNumber ||
                '',

            status:
                stored.status ||
                '',

            amount:
                Number(
                    stored.total ??
                    stored.amount ??
                    0
                ),

            currency:
                stored.currency ||
                stored.fiscalProfile
                    ?.currency ||
                'CHF',

            operator:
                stored.actor?.role ||
                stored.waiter ||
                '',

            terminal:
                stored.terminalType ||
                stored.terminal ||
                stored.source ||
                '',

            deviceId:
                stored.deviceId ||
                '',

            details:
                stored
        });

        await scellerOperation(
            tenantID,
            'CREATE',
            'TRANSACTION',
            operationId,
            'SYSTEM',
            stored
        );

        const finalState =
            state.toObject();

        io.to(
            tenantID
        ).emit(
            'transactionSaved',
            {
                tenantID,
                transaction:
                    stored
            }
        );

        io.to(
            tenantID
        ).emit(
            'paymentUpdated',
            {
                tenantID,
                transaction:
                    stored
            }
        );

        io.to(
            tenantID
        ).emit(
            'updateState',
            finalState
        );

        io.to(
            tenantID
        ).emit(
            'server-state-changed',
            {
                tenantID,
                type:
                    'TRANSACTION',
                operationId
            }
        );

        return res.json({

            success:
                true,

            transaction:
                stored,

            proof: {
                operationId,

                ticketNumber:
                    stored.ticketNumber ||
                    null,

                chainHash:
                    stored.chainHash ||
                    stored.ticketHash ||
                    null,

                serverTimestamp:
                    stored.serverRecordedAt
            }
        });

    } catch (error) {

        console.error(
            '[iCHEF save transaction]',
            error
        );

        return res.status(500).json({
            success: false,
            error:
                error?.message ||
                'Erreur transaction.'
        });
    }
});
// ==========================================================
// TICKET CLIENT PUBLIC — QR CODE
// ==========================================================

app.get('/api/public-receipt', async (req, res) => {

    try {

        const tenantID =
            cleanString(
                req.query?.tenantID
            );

        const token =
            String(
                req.query?.token ||
                ''
            ).trim();

        if (
            !tenantID ||
            token.length < 16
        ) {
            return res.status(400).send(
                'Ticket invalide.'
            );
        }

        const state =
            await AppState.findOne({
                tenantID
            });

        const history =
            Array.isArray(
                state?.activeOrders
                    ?.FINANCIAL_HISTORY
                    ?.data
            )
                ? state.activeOrders
                    .FINANCIAL_HISTORY.data
                : [];

        const tx =
            history.find(x =>
                String(
                    x?.receipt
                        ?.publicToken ||
                    ''
                ) === token
            );

        if (!tx) {

            return res.status(404).send(
                'Ticket introuvable.'
            );
        }

        const snapshot =
            tx.orderSnapshot ||
            {};

        const items =
            Array.isArray(
                snapshot.items
            )
                ? snapshot.items
                : [];

        const currency =
            String(
                tx.currency ||
                'CHF'
            );

        const esc =
            value =>
                String(
                    value ??
                    ''
                )
                    .replace(
                        /&/g,
                        '&amp;'
                    )
                    .replace(
                        /</g,
                        '&lt;'
                    )
                    .replace(
                        />/g,
                        '&gt;'
                    )
                    .replace(
                        /"/g,
                        '&quot;'
                    );

        const lines =
            items
                .filter(i =>
                    !i?.cancelled
                )
                .map(i => {

                    const qty =
                        Number(
                            i?.qty ??
                            i?.quantity ??
                            1
                        );

                    const price =
                        Number(
                            i?.price ??
                            i?.p ??
                            0
                        );

                    return `
                        <tr>
                            <td>
                                ${esc(
                                    i?.name ||
                                    i?.n ||
                                    'Article'
                                )}
                                ${qty > 1
                                    ? ` × ${qty}`
                                    : ''}
                            </td>
                            <td style="text-align:right">
                                ${(price * qty)
                                    .toFixed(2)}
                            </td>
                        </tr>
                    `;
                })
                .join('');

        res.setHeader(
            'Cache-Control',
            'no-store'
        );

        res.setHeader(
            'X-Robots-Tag',
            'noindex,nofollow'
        );

        res.send(`
<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport"
content="width=device-width,initial-scale=1">
<title>Ticket ${esc(tx.ticketNumber)}</title>

<style>
body{
    margin:0;
    padding:20px;
    background:#f2f2f2;
    font-family:Arial,sans-serif;
    color:#111;
}
.ticket{
    max-width:420px;
    margin:auto;
    background:white;
    padding:24px;
    border-radius:12px;
}
h1{
    text-align:center;
    margin:0 0 5px;
}
.meta{
    text-align:center;
    color:#555;
    margin-bottom:20px;
}
table{
    width:100%;
    border-collapse:collapse;
}
td{
    padding:7px 0;
    border-bottom:1px solid #ddd;
}
.total{
    margin-top:18px;
    display:flex;
    justify-content:space-between;
    font-size:22px;
    font-weight:bold;
}
.proof{
    margin-top:20px;
    font-size:10px;
    color:#777;
    word-break:break-all;
}
@media print{
    body{
        background:white;
        padding:0;
    }
    .ticket{
        box-shadow:none;
    }
}
</style>
</head>

<body>

<div class="ticket">

<h1>iCHEF</h1>

<div class="meta">
Ticket ${esc(tx.ticketNumber || '—')}<br>
Table ${esc(tx.tableId || '—')}<br>
${esc(
    new Date(
        tx.createdAt ||
        tx.date ||
        Date.now()
    ).toLocaleString('fr-FR')
)}
</div>

<table>
${lines}
</table>

<div class="total">
<span>TOTAL</span>
<span>
${Number(
    tx.total ??
    tx.amount ??
    0
).toFixed(2)}
${esc(currency)}
</span>
</div>

<div class="meta">
Paiement :
${esc(
    tx.method ||
    '—'
)}
</div>

<div class="proof">
Preuve :
${esc(
    tx.ticketHash ||
    tx.chainHash ||
    '—'
)}
</div>

</div>

</body>
</html>
        `);

    } catch (error) {

        console.error(
            '[iCHEF public receipt]',
            error
        );

        res.status(500).send(
            'Ticket indisponible.'
        );
    }
});
// =========================================================================
// ⚙️ ROUTES D'ADMINISTRATION ET DE CONFIGURATION DU RESTAURANT
// =========================================================================

app.get('/api/check-license', async (req, res) => {
    try {
        const tenant = await Tenant.findOne({ tenantID: cleanString(req.query.tenantID) });
        if (!tenant) return res.status(404).json({ success: false });
        res.json({ 
            success: true, 
            status: tenant.status, 
            plan: tenant.plan, 
            specialite: tenant.specialite,
            addons: tenant.addons || []
        });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.get('/api/dashboard-info', async (req, res) => {
    try {
        const tenant = await Tenant.findOne({ tenantID: cleanString(req.query.tenantID) });
        if (!tenant) return res.status(404).json({ success: false });
        const screenLimit = await syncTenantScreenLimit(tenant);
        res.json({ success: true, activeDevices: tenant.registeredDevices.length, maxScreens: screenLimit });
    } catch (e) { res.status(500).json({ success: false }); }
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
        tenant.email = email; 
        tenant.phone = phone; 
        await tenant.save();
        res.json({ success: true });
    } catch(e) { res.status(500).json({ success: false }); }
});

app.post('/api/update-master-pin', async (req, res) => {
    try {
        const { tenantID, oldPin, newPin } = req.body;
        const tenant = await Tenant.findOne({ tenantID: cleanString(tenantID) });
        if (!tenant || tenant.pin !== oldPin) return res.status(403).json({ success: false, error: "Ancien code PIN invalide." });
        tenant.pin = newPin; 
        tenant.registeredDevices = []; // Déconnecte tous les écrans par sécurité
        await tenant.save();
        res.json({ success: true });
    } catch(e) { res.status(500).json({ success: false }); }
});

// ==========================================================
// 📚 iCHEF — FICHIER FISCAL COMPLET
// Commandes · ventes · paiements · annulations · erreurs
// validations · audit · historique permanent
// ==========================================================

app.post('/api/fiscal-file/full', async (req, res) => {

    try {

        res.setHeader(
            'Cache-Control',
            'no-store, no-cache, must-revalidate'
        );

        // ==================================================
        // 1. IDENTIFICATION
        // ==================================================

        const tenantID =
            cleanString(
                req.body?.tenantID ||
                req.headers['x-ichef-tenant']
            );

        const pin =
            String(
                req.body?.pin ||
                req.headers['x-ichef-pin'] ||
                ''
            ).trim();

        const deviceId =
            String(
                req.body?.deviceId ||
                req.headers['x-ichef-device'] ||
                ''
            ).trim();

        const terminal =
            String(
                req.body?.terminal ||
                'PAD_FISCAL_FILE'
            ).trim();


        if (!tenantID) {

            return res.status(400).json({
                success: false,
                error: 'Restaurant manquant.'
            });
        }


        if (!pin) {

            return res.status(401).json({
                success: false,
                error: 'PIN restaurateur requis.'
            });
        }


        // ==================================================
        // 2. CONTRÔLE RESTAURATEUR
        // ==================================================

        const tenant =
            await Tenant
                .findOne({
                    tenantID
                })
                .lean();


        if (!tenant) {

            return res.status(404).json({
                success: false,
                error: 'Restaurant introuvable.'
            });
        }


        if (
            String(tenant.pin || '').trim() !==
            String(pin).trim()
        ) {

            await ichefFiscalDiagnostic(
                req,
                {
                    tenantID,

                    type:
                        'FISCAL_ACCESS_ERROR',

                    status:
                        'REFUSED',

                    severity:
                        'WARNING',

                    code:
                        'MASTER_PIN_INVALID',

                    message:
                        'Tentative refusée d’accès au fichier fiscal.',

                    terminal,

                    details: {
                        deviceId
                    }
                }
            ).catch(() => {});


            return res.status(403).json({
                success: false,
                error:
                    'PIN restaurateur incorrect.'
            });
        }


        // ==================================================
        // 3. ÉTAT COMPLET DU RESTAURANT
        // ==================================================

        const state =
            await AppState
                .findOne({
                    tenantID
                })
                .lean();


        const activeOrders =
            state?.activeOrders &&
            typeof state.activeOrders === 'object'
                ? state.activeOrders
                : {};


        // ==================================================
        // 4. HISTORIQUE FINANCIER
        // ==================================================

        const financialCache =
            Array.isArray(
                activeOrders
                    ?.FINANCIAL_HISTORY
                    ?.data
            )
                ? activeOrders
                    .FINANCIAL_HISTORY.data
                : [];


        // ==================================================
        // 5. JOURNAL FISCAL PERMANENT
        // ==================================================

        const permanentRecords =
            await FiscalRecord
                .find({
                    tenantID
                })
                .sort({
                    createdAt: -1
                })
                .lean();


        // ==================================================
        // 6. AUDIT CRYPTOGRAPHIQUE
        // ==================================================

        const audit =
            await AuditLog
                .find({
                    tenantID
                })
                .sort({
                    timestamp: 1
                })
                .lean();


        // ==================================================
        // 7. CONTRÔLE INTÉGRITÉ HASH
        // ==================================================

        let auditChainValid = true;
        let brokenAt = null;


        for (
            let i = 0;
            i < audit.length;
            i++
        ) {

            const current =
                audit[i];


            if (i > 0) {

                const previous =
                    audit[i - 1];


                if (
                    current.previousHash !==
                    previous.currentHash
                ) {

                    auditChainValid = false;
                    brokenAt = i;

                    break;
                }
            }


            const expectedHash =
                crypto
                    .createHash('sha256')
                    .update(
                        JSON.stringify({

                            tenantID:
                                current.tenantID,

                            action:
                                current.action,

                            entityType:
                                current.entityType,

                            entityId:
                                current.entityId,

                            authorPin:
                                current.authorPin,

                            details:
                                current.details,

                            previousHash:
                                current.previousHash
                        })
                    )
                    .digest('hex');


            if (
                expectedHash !==
                current.currentHash
            ) {

                auditChainValid = false;
                brokenAt = i;

                break;
            }
        }


        // ==================================================
        // 8. HISTORIQUE FINANCIER CONSOLIDÉ
        // ==================================================

        const financialMap =
            new Map();


        function financialKey(tx = {}) {

            const strongId =
                tx.operationId ||
                tx.paymentRequestId ||
                tx.ticketNumber ||
                tx.id ||
                tx.recordId;


            if (strongId) {
                return String(strongId);
            }


            return crypto
                .createHash('sha256')
                .update(
                    JSON.stringify({
                        type: tx.type,
                        tableId: tx.tableId,
                        amount:
                            tx.total ??
                            tx.amount ??
                            0,
                        date:
                            tx.createdAt ||
                            tx.date ||
                            tx.timestamp
                    })
                )
                .digest('hex');
        }


        financialCache.forEach(
            tx => {

                if (!tx) return;

                financialMap.set(
                    financialKey(tx),
                    tx
                );
            }
        );


        permanentRecords
            .filter(record => {

                const type =
                    String(
                        record.type || ''
                    ).toUpperCase();


                return (
                    type === 'SALE' ||
                    type === 'PAYMENT' ||
                    type === 'TRANSACTION' ||
                    type === 'CORRECTION' ||
                    type === 'REFUND' ||
                    type === 'Z_CAISSE'
                );
            })
            .forEach(record => {

                const details =
                    record.details &&
                    typeof record.details ===
                        'object'
                        ? record.details
                        : {};


                const transaction = {

                    ...details,

                    recordId:
                        record.recordId,

                    type:
                        details.type ||
                        record.type,

                    subtype:
                        details.subtype ||
                        record.subtype,

                    tableId:
                        details.tableId ||
                        record.tableId,

                    ticketNumber:
                        details.ticketNumber ||
                        record.ticketNumber,

                    operationId:
                        details.operationId ||
                        record.operationId,

                    amount:
                        details.amount ??
                        record.amount,

                    currency:
                        details.currency ||
                        record.currency,

                    status:
                        details.status ||
                        record.status,

                    serverRecordedAt:
                        details.serverRecordedAt ||
                        record.createdAt
                };


                financialMap.set(
                    financialKey(transaction),
                    transaction
                );
            });


        const financialHistory =
            Array
                .from(
                    financialMap.values()
                )
                .sort(
                    (a, b) => {

                        const da =
                            new Date(
                                a.serverRecordedAt ||
                                a.createdAt ||
                                a.date ||
                                a.timestamp ||
                                0
                            ).getTime();


                        const db =
                            new Date(
                                b.serverRecordedAt ||
                                b.createdAt ||
                                b.date ||
                                b.timestamp ||
                                0
                            ).getTime();


                        return db - da;
                    }
                );


        // ==================================================
        // 9. RECONSTRUCTION DE TOUTES LES COMMANDES
        // ==================================================

        const orderSnapshots = [];

        const orderSeen =
            new Set();


        function addOrderSnapshot(
            order,
            meta = {}
        ) {

            if (
                !order ||
                typeof order !== 'object'
            ) {
                return;
            }


            const items =
                Array.isArray(order.items)
                    ? order.items
                    : [];


            if (
                !items.length &&
                !order.total &&
                !order.paymentDraft
            ) {
                return;
            }


            const tableId =
                String(
                    meta.tableId ||
                    order.tableId ||
                    order.table ||
                    ''
                );


            const unique =
                String(
                    meta.recordId ||
                    order.operationId ||
                    order.paymentRequestId ||
                    order.fiscalReceiptReference ||
                    order.fiscalTicket
                        ?.ticketNumber ||
                    ''
                ) +
                '|' +
                tableId +
                '|' +
                String(
                    meta.createdAt ||
                    order.closedAt ||
                    order.updatedAt ||
                    order.createdAt ||
                    ''
                );


            if (
                orderSeen.has(unique)
            ) {
                return;
            }


            orderSeen.add(unique);


            orderSnapshots.push({

                key:
                    meta.recordId ||
                    unique,

                tableId,

                status:
                    order.status ||
                    meta.status ||
                    '',

                total:
                    Number(
                        order.total ||
                        meta.amount ||
                        0
                    ),

                itemCount:
                    items.length,

                createdAt:
                    order.createdAt ||
                    meta.createdAt ||
                    null,

                updatedAt:
                    order.updatedAt ||
                    meta.createdAt ||
                    null,

                closedAt:
                    order.closedAt ||
                    order.fiscalFinalizedAt ||
                    null,

                fiscalReceiptReference:
                    order.fiscalReceiptReference ||
                    order.fiscalTicket
                        ?.ticketNumber ||
                    meta.ticketNumber ||
                    '',

                order:
                    order
            });
        }


        // --------------------------------------------------
        // Commandes encore présentes
        // --------------------------------------------------

        Object.entries(
            activeOrders
        ).forEach(
            ([key, value]) => {

                if (
                    key ===
                    'FINANCIAL_HISTORY'
                ) {
                    return;
                }


                if (
                    !value ||
                    typeof value !== 'object'
                ) {
                    return;
                }


                const possibleOrder =
                    value.data &&
                    typeof value.data ===
                        'object' &&
                    !Array.isArray(
                        value.data
                    )
                        ? value.data
                        : value;


                addOrderSnapshot(
                    possibleOrder,
                    {
                        tableId: key,
                        recordId:
                            'LIVE_' + key
                    }
                );
            }
        );


        // --------------------------------------------------
        // Commandes archivées avec les ventes
        // --------------------------------------------------

        financialHistory.forEach(
            tx => {

                const order =
                    tx.orderSnapshot ||
                    tx.snapshot ||
                    tx.order ||
                    null;


                addOrderSnapshot(
                    order,
                    {
                        tableId:
                            tx.tableId,

                        recordId:
                            tx.operationId ||
                            tx.ticketNumber,

                        ticketNumber:
                            tx.ticketNumber,

                        amount:
                            tx.total ??
                            tx.amount,

                        status:
                            tx.status,

                        createdAt:
                            tx.serverRecordedAt ||
                            tx.createdAt ||
                            tx.date
                    }
                );
            }
        );


        // --------------------------------------------------
        // Commandes du journal permanent
        // --------------------------------------------------

        permanentRecords.forEach(
            record => {

                const details =
                    record.details || {};


                const order =
                    details.orderSnapshot ||
                    details.order ||
                    details.after ||
                    details.snapshot ||
                    null;


                addOrderSnapshot(
                    order,
                    {
                        tableId:
                            record.tableId,

                        recordId:
                            record.recordId,

                        ticketNumber:
                            record.ticketNumber,

                        amount:
                            record.amount,

                        status:
                            record.status,

                        createdAt:
                            record.createdAt
                    }
                );
            }
        );


        orderSnapshots.sort(
            (a, b) => {

                const da =
                    new Date(
                        a.closedAt ||
                        a.updatedAt ||
                        a.createdAt ||
                        0
                    ).getTime();


                const db =
                    new Date(
                        b.closedAt ||
                        b.updatedAt ||
                        b.createdAt ||
                        0
                    ).getTime();


                return db - da;
            }
        );


        // ==================================================
        // 10. ANNULATIONS
        // ==================================================

        const cancelledItems = [];


        function scanCancelled(
            order,
            tableId = '',
            source = ''
        ) {

            if (
                !order ||
                typeof order !== 'object'
            ) {
                return;
            }


            const items =
                Array.isArray(order.items)
                    ? order.items
                    : [];


            items.forEach(
                item => {

                    const status =
                        String(
                            item?.status ||
                            item?.sequenceStatus ||
                            ''
                        )
                            .toUpperCase();


                    const cancelled =
                        item?.cancelled === true ||
                        status.includes('CANCEL') ||
                        status.includes('ANNUL');


                    if (!cancelled) {
                        return;
                    }


                    cancelledItems.push({

                        ...item,

                        tableId:
                            item.tableId ||
                            tableId,

                        source,

                        cancelledAt:
                            item.cancelledAt ||
                            item.updatedAt ||
                            order.updatedAt ||
                            order.closedAt ||
                            null,

                        cancelReason:
                            item.cancelReason ||
                            item.cancellationReason ||
                            item.reason ||
                            'Motif non renseigné',

                        cancelledBy:
                            item.cancelledBy ||
                            item.updatedBy ||
                            order.updatedBy ||
                            ''
                    });
                }
            );
        }


        orderSnapshots.forEach(
            snapshot =>
                scanCancelled(
                    snapshot.order,
                    snapshot.tableId,
                    snapshot.key
                )
        );


        permanentRecords
            .filter(record => {

                const type =
                    String(
                        record.type || ''
                    ).toUpperCase();


                return (
                    type.includes('CANCEL') ||
                    type.includes('ANNUL')
                );
            })
            .forEach(
                record => {

                    cancelledItems.push({

                        ...(record.details || {}),

                        tableId:
                            record.tableId,

                        recordId:
                            record.recordId,

                        cancelledAt:
                            record.createdAt,

                        cancelledBy:
                            record.operator
                    });
                }
            );


        // ==================================================
        // 11. ERREURS ET VALIDATIONS
        // ==================================================

        const diagnostics =
            permanentRecords
                .filter(record => {

                    const type =
                        String(
                            record.type || ''
                        )
                            .toUpperCase();


                    const severity =
                        String(
                            record.details
                                ?.severity ||
                            ''
                        )
                            .toUpperCase();


                    return (
                        type.includes('ERROR') ||
                        type.includes('DIAGNOSTIC') ||
                        type.includes('VALIDATION') ||
                        type.includes('REFUSED') ||
                        severity === 'ERROR' ||
                        severity === 'CRITICAL' ||
                        severity === 'WARNING'
                    );
                })
                .map(record => ({

                    recordId:
                        record.recordId,

                    type:
                        record.type,

                    code:
                        record.subtype ||
                        record.details
                            ?.code ||
                        '',

                    status:
                        record.status,

                    severity:
                        record.details
                            ?.severity ||
                        '',

                    message:
                        record.details
                            ?.message ||
                        record.type,

                    tableId:
                        record.tableId,

                    ticketNumber:
                        record.ticketNumber,

                    actor:
                        record.operator,

                    terminal:
                        record.terminal,

                    deviceId:
                        record.deviceId,

                    timestamp:
                        record.createdAt,

                    details:
                        record.details
                }));


        // ==================================================
        // 12. ÉVÉNEMENTS FISCAUX BRUTS
        // ==================================================

        const fiscalEvents =
            permanentRecords.map(
                record => ({

                    key:
                        record.recordId,

                    value: {

                        ...(record.details || {}),

                        recordId:
                            record.recordId,

                        type:
                            record.type,

                        subtype:
                            record.subtype,

                        tableId:
                            record.tableId,

                        ticketNumber:
                            record.ticketNumber,

                        operationId:
                            record.operationId,

                        status:
                            record.status,

                        amount:
                            record.amount,

                        currency:
                            record.currency,

                        operator:
                            record.operator,

                        terminal:
                            record.terminal,

                        deviceId:
                            record.deviceId,

                        createdAt:
                            record.createdAt
                    }
                })
            );


        // ==================================================
        // 13. MONNAIE
        // ==================================================

        const currency =
            String(

                activeOrders
                    ?.SETTINGS_MASTER
                    ?.data
                    ?.currency ||

                activeOrders
                    ?.FISCAL_CONFIG
                    ?.data
                    ?.currency ||

                tenant?.config
                    ?.currency ||

                'CHF'
            )
                .toUpperCase();


        // ==================================================
        // 14. RÉSUMÉ FINANCIER
        // ==================================================

        let grossSales = 0;
        let corrections = 0;

        let saleCount = 0;
        let correctionCount = 0;


        financialHistory.forEach(
            tx => {

                const type =
                    String(
                        tx.type ||
                        ''
                    )
                        .toUpperCase();


                const amount =
                    Number(
                        tx.totalTTC ??
                        tx.total ??
                        tx.amount ??
                        0
                    );


                const isCorrection =
                    type.includes(
                        'CORRECTION'
                    ) ||
                    type.includes(
                        'REFUND'
                    ) ||
                    amount < 0;


                if (isCorrection) {

                    corrections +=
                        amount > 0
                            ? -amount
                            : amount;

                    correctionCount++;

                } else {

                    grossSales +=
                        amount;

                    saleCount++;
                }
            }
        );


        const errorCount =
            diagnostics.filter(
                diagnostic => {

                    const severity =
                        String(
                            diagnostic.severity ||
                            ''
                        )
                            .toUpperCase();


                    const type =
                        String(
                            diagnostic.type ||
                            ''
                        )
                            .toUpperCase();


                    return (
                        severity === 'ERROR' ||
                        severity === 'CRITICAL' ||
                        type.includes('ERROR')
                    );
                }
            ).length;


        const validationCount =
            Math.max(
                0,
                diagnostics.length -
                errorCount
            );


        // ==================================================
        // 15. ENREGISTRE LA CONSULTATION DU FICHIER
        // ==================================================

        await ichefWriteFiscalRecord({

            tenantID,

            type:
                'FISCAL_FILE_ACCESS',

            subtype:
                'FULL_READ',

            status:
                'SUCCESS',

            operator:
                'RESTAURATEUR',

            terminal,

            deviceId,

            details: {

                extractedAt:
                    new Date()
                        .toISOString(),

                financialRecords:
                    financialHistory.length,

                permanentRecords:
                    permanentRecords.length,

                auditRecords:
                    audit.length,

                integrity:
                    auditChainValid
            }
        });


        // ==================================================
        // 16. RÉPONSE FINALE AU PAD
        // ==================================================

        return res.json({

            success: true,


            tenant: {

                tenantID,

                clientName:
                    tenant.clientName ||
                    tenantID,

                currency,

                extractedAt:
                    new Date()
                        .toISOString()
            },


            summary: {

                grossSales:
                    Number(
                        grossSales.toFixed(2)
                    ),

                corrections:
                    Number(
                        corrections.toFixed(2)
                    ),

                netSales:
                    Number(
                        (
                            grossSales +
                            corrections
                        ).toFixed(2)
                    ),

                saleCount,

                correctionCount,

                orderSnapshotCount:
                    orderSnapshots.length,

                cancelledItemCount:
                    cancelledItems.length,

                errorCount,

                validationCount,

                auditOperationCount:
                    audit.length,

                permanentRecordCount:
                    permanentRecords.length,

                financialRecordCount:
                    financialHistory.length
            },


            integrity: {

                auditChainValid,

                auditCount:
                    audit.length,

                brokenAt,

                lastHash:
                    audit.length
                        ? audit[
                            audit.length - 1
                        ].currentHash
                        : 'GENESIS_BLOCK_0000000000000000'
            },


            financialHistory,

            orderSnapshots,

            cancelledItems,

            diagnostics,

            audit,

            fiscalEvents,

            permanentRecords
        });


    } catch (error) {

        console.error(
            '[iCHEF FICHIER FISCAL COMPLET]',
            error
        );


        await ichefFiscalDiagnostic(
            req,
            {

                type:
                    'FISCAL_FILE_ERROR',

                status:
                    'ERROR',

                severity:
                    'CRITICAL',

                code:
                    'FULL_FILE_EXCEPTION',

                message:
                    error?.message ||
                    'Erreur fichier fiscal.'
            }
        ).catch(() => {});


        return res
            .status(500)
            .json({

                success: false,

                error:
                    error?.message ||
                    'Impossible de charger le fichier fiscal.'
            });
    }
});


// ==========================================================
// 💳 ROUTES STRIPE
// Achat d'écrans et portail de facturation
// ==========================================================

app.post(
    '/api/stripe/create-screen-upgrade-session',
    async (req, res) => {

        try {

            /*
             * Route conservée pour compatibilité.
             * La création réelle de session Stripe Checkout
             * pourra être branchée ici plus tard.
             */

            return res.json({
                success: true,
                url: 'https://checkout.stripe.com/'
            });

        } catch (error) {

            console.error(
                '[iCHEF STRIPE] Erreur upgrade écrans :',
                error
            );

            return res.status(500).json({
                success: false,
                error:
                    error?.message ||
                    'Erreur Stripe lors de la création de la session.'
            });
        }
    }
);


// ==========================================================
// 💳 PORTAIL CLIENT STRIPE
// ==========================================================

app.post(
    '/api/stripe/create-customer-portal-session',
    async (req, res) => {

        try {

            /*
             * Route conservée pour compatibilité.
             * La vraie session Stripe Billing Portal
             * pourra être branchée ici.
             */

            return res.json({
                success: true,
                url: 'https://billing.stripe.com/'
            });

        } catch (error) {

            console.error(
                '[iCHEF STRIPE] Erreur portail client :',
                error
            );

            return res.status(500).json({
                success: false,
                error:
                    error?.message ||
                    'Erreur lors de l’ouverture du portail Stripe.'
            });
        }
    }
);

// =============================================================
// QR FISCAL iCHEF — DOSSIER COMPLET DE TABLE
// COLLER CE BLOC JUSTE AVANT : // 🤖 MOTEURS IA (GEMINI)
// =============================================================

const ichefFiscalShareSchema = new mongoose.Schema({
    token: { type: String, required: true, unique: true, index: true },
    tenantID: { type: String, required: true, index: true },
    tableId: { type: String, required: true, index: true },
    contentHash: { type: String, required: true, index: true },
    payload: { type: mongoose.Schema.Types.Mixed, required: true },
    createdAt: { type: Date, default: Date.now },
    lastAccessAt: { type: Date, default: Date.now },
    revoked: { type: Boolean, default: false }
}, { minimize: false });

ichefFiscalShareSchema.index({
    tenantID: 1,
    tableId: 1,
    contentHash: 1
});

const IchefFiscalTableShare =
    mongoose.models.IchefFiscalTableShare ||
    mongoose.model(
        'IchefFiscalTableShare',
        ichefFiscalShareSchema
    );

function ichefFiscalMaskOperator(value) {
    const txt = String(value ?? '').trim();

    if (!txt) return '';

    if (txt.length <= 2) {
        return '••';
    }

    return (
        '•'.repeat(
            Math.min(6, txt.length - 2)
        ) +
        txt.slice(-2)
    );
}

function ichefFiscalSanitize(value) {

    if (Array.isArray(value)) {
        return value.map(
            ichefFiscalSanitize
        );
    }

    if (
        value &&
        typeof value === 'object'
    ) {

        const out = {};

        for (
            const [key, child]
            of Object.entries(value)
        ) {

            const k =
                String(key).toLowerCase();

            if ([
                'masterpin',
                'sessionpin',
                'password',
                'passwordhash',
                'secret',
                'authorization',
                'auth',
                'apikey',
                'api_key',
                'access_token',
                'refresh_token'
            ].includes(k)) {
                continue;
            }

            if (k === 'pin') {
                out[key] = '[MASQUÉ]';
                continue;
            }

            if (k === 'authorpin') {
                out[key] =
                    ichefFiscalMaskOperator(
                        child
                    );
                continue;
            }

            out[key] =
                ichefFiscalSanitize(
                    child
                );
        }

        return out;
    }

    return value;
}

function ichefFiscalEsc(value) {

    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function ichefFiscalDate(value) {

    const d =
        new Date(value || 0);

    return Number.isNaN(
        d.getTime()
    )
        ? 'Date non enregistrée'
        : d.toLocaleString('fr-FR');
}

function ichefFiscalRaw(value) {

    return ichefFiscalEsc(
        JSON.stringify(
            value ?? null,
            null,
            2
        )
    );
}

function ichefFiscalAction(event) {

    const raw =
        String(
            event?.action ||
            event?.eventType ||
            event?.type ||
            'ÉVÉNEMENT'
        ).toUpperCase();

    const labels = {
        CREATE:
            'CRÉATION',

        UPDATE:
            'MISE À JOUR',

        DELETE:
            'SUPPRESSION',

        DELETE_SOFT:
            'ANNULATION / ARCHIVAGE',

        SALE_FINALIZED:
            'VENTE ENCAISSÉE',

        PAYMENT:
            'PAIEMENT',

        CASH_IN:
            'PAIEMENT / CASH IN',

        ORDER_CANCELLED:
            'ANNULATION',

        DAILY_CLOSURE:
            'CLÔTURE Z'
    };

    return labels[raw] || raw;
}

function ichefFiscalReason(event) {

    const d =
        event?.details || {};

    return (
        event?.reason ||
        d?.reason ||
        d?.motif ||
        d?.error ||
        d?.erreur ||
        d?.message ||
        ''
    );
}

function ichefFiscalOperator(event) {

    return (
        event?.operator ||
        event?.operatorName ||
        event?.actor?.actorId ||
        event?.authorPin ||
        'SYSTEM'
    );
}

function ichefFiscalTerminal(event) {

    return (
        event?.terminal ||
        event?.terminalType ||
        event?.actor?.terminalType ||
        event?.terminalId ||
        event?.actor?.deviceId ||
        '—'
    );
}

function ichefFiscalBuildPage(share) {

    const payload =
        share?.payload || {};

    const dossier =
        payload?.dossier ||
        payload;

    const summary =
        payload?.resumeTable ||
        payload?.summary ||
        dossier?.summary ||
        {};

    const tableId =
        payload?.tableId ||
        dossier?.tableId ||
        share?.tableId ||
        '—';

    const currency =
        dossier?.currency ||
        summary?.currency ||
        'CHF';

    const chronologie =
        Array.isArray(
            dossier?.chronologie
        )
            ? dossier.chronologie
            : Array.isArray(
                payload?.timeline
            )
                ? payload.timeline
                : Array.isArray(
                    payload?.auditEvents
                )
                    ? payload.auditEvents
                    : [];

    const paiements =
        Array.isArray(
            dossier?.paiements
        )
            ? dossier.paiements
            : Array.isArray(
                payload?.payments
            )
                ? payload.payments
                : [];

    const incidents =
        Array.isArray(
            dossier
                ?.erreursCorrectionsAnnulations
        )
            ? dossier
                .erreursCorrectionsAnnulations
            : Array.isArray(
                payload?.problems
            )
                ? payload.problems
                : [];

    const total =
        Number(
            dossier?.totalEncaisse ??
            summary?.totalEncaisse ??
            summary?.totalPaid ??
            0
        ) || 0;

    const chronoHtml =
        chronologie.length

            ? chronologie.map(
                event => {

                    const hash =
                        event?.currentHash ||
                        event?.chainHash ||
                        '—';

                    const reason =
                        ichefFiscalReason(
                            event
                        );

                    const date =
                        event?.timestamp ||
                        event?.date ||
                        event?.createdAt ||
                        event?.serverRecordedAt;

                    return `
                    <article class="entry ${reason ? 'problem' : ''}">

                        <h3>
                            ${ichefFiscalEsc(
                                ichefFiscalAction(
                                    event
                                )
                            )}
                        </h3>

                        <div class="meta">
                            ${ichefFiscalEsc(
                                ichefFiscalDate(
                                    date
                                )
                            )}
                            · Opérateur :
                            ${ichefFiscalEsc(
                                ichefFiscalOperator(
                                    event
                                )
                            )}
                            · Terminal :
                            ${ichefFiscalEsc(
                                ichefFiscalTerminal(
                                    event
                                )
                            )}
                        </div>

                        ${
                            reason
                                ? `
                                <p class="danger">
                                    <b>Motif / erreur :</b>
                                    ${ichefFiscalEsc(
                                        reason
                                    )}
                                </p>
                                `
                                : ''
                        }

                        <p class="hash">
                            Hash :
                            ${ichefFiscalEsc(
                                hash
                            )}
                        </p>

                        <details>

                            <summary>
                                Données complètes de l'événement
                            </summary>

                            <pre>${ichefFiscalRaw(
                                event
                            )}</pre>

                        </details>

                    </article>
                    `;
                }
            ).join('')

            : `
                <p class="empty">
                    Aucune trace chronologique disponible.
                </p>
            `;

    const paymentsHtml =
        paiements.length

            ? paiements.map(
                p => {

                    const ticket =
                        p?.ticketNumber ||
                        p?.orderSnapshot
                            ?.ticketNumber ||
                        p?.snapshot
                            ?.ticketNumber ||
                        '—';

                    const amount =
                        Number(
                            p?.total ??
                            p?.totalTTC ??
                            p?.amount ??
                            p?.payment?.amount ??
                            0
                        ) || 0;

                    const method =
                        p?.method ||
                        p?.paymentMethod ||
                        p?.payment?.method ||
                        'Non précisé';

                    const date =
                        p?.serverRecordedAt ||
                        p?.date ||
                        p?.timestamp;

                    return `
                    <article class="entry payment">

                        <h3>
                            ${ichefFiscalEsc(
                                ticket
                            )}
                            ·
                            ${amount.toFixed(2)}
                            ${ichefFiscalEsc(
                                currency
                            )}
                        </h3>

                        <div class="meta">

                            ${ichefFiscalEsc(
                                ichefFiscalDate(
                                    date
                                )
                            )}

                            ·
                            ${ichefFiscalEsc(
                                method
                            )}

                            · Opérateur :
                            ${ichefFiscalEsc(
                                ichefFiscalOperator(
                                    p
                                )
                            )}

                        </div>

                        <details>

                            <summary>
                                Données complètes du paiement
                            </summary>

                            <pre>${ichefFiscalRaw(
                                p
                            )}</pre>

                        </details>

                    </article>
                    `;
                }
            ).join('')

            : `
                <p class="empty">
                    Aucun paiement disponible.
                </p>
            `;

    const incidentsHtml =
        incidents.length

            ? incidents.map(
                event => `

                <article class="entry problem">

                    <h3>
                        ${ichefFiscalEsc(
                            ichefFiscalAction(
                                event
                            )
                        )}
                    </h3>

                    <div class="meta">
                        ${ichefFiscalEsc(
                            ichefFiscalDate(
                                event?.timestamp ||
                                event?.date ||
                                event?.createdAt
                            )
                        )}
                    </div>

                    <p class="danger">
                        ${ichefFiscalEsc(
                            ichefFiscalReason(
                                event
                            ) ||
                            'Correction / annulation détectée'
                        )}
                    </p>

                    <pre>${ichefFiscalRaw(
                        event
                    )}</pre>

                </article>
                `
            ).join('')

            : `
                <p class="ok">
                    Aucune erreur, correction ou annulation explicite détectée.
                </p>
            `;

    const downloadUrl =
        `/api/fiscal/table-dossier/${encodeURIComponent(
            share.token
        )}/download`;

    return `
<!doctype html>

<html lang="fr">

<head>

<meta charset="utf-8">

<meta
    name="viewport"
    content="width=device-width,initial-scale=1"
>

<title>
iCHEF · Dossier complet Table
${ichefFiscalEsc(tableId)}
</title>

<style>

:root{
    --bg:#0b1220;
    --card:#111c2e;
    --line:#334155;
    --text:#e5e7eb;
    --muted:#94a3b8;
    --blue:#38bdf8;
    --gold:#d4af37;
    --green:#10b981;
    --red:#ef4444;
}

*{
    box-sizing:border-box;
}

body{
    margin:0;
    background:var(--bg);
    color:var(--text);
    font-family:Arial,Helvetica,sans-serif;
}

.top{
    padding:22px 28px;
    border-bottom:1px solid var(--line);
    display:flex;
    justify-content:space-between;
    gap:20px;
    align-items:center;
}

.top h1{
    margin:0;
    color:var(--blue);
    font-size:28px;
}

.sub{
    color:var(--muted);
    margin-top:6px;
}

.actions{
    display:flex;
    gap:10px;
}

.btn{
    padding:12px 16px;
    border:1px solid var(--green);
    border-radius:9px;
    color:var(--green);
    text-decoration:none;
    background:transparent;
    font-weight:800;
    cursor:pointer;
}

main{
    max-width:1200px;
    margin:auto;
    padding:24px;
}

.kpis{
    display:grid;
    grid-template-columns:
        repeat(5,1fr);
    gap:12px;
    margin-bottom:22px;
}

.kpi,
.card,
.entry{
    border:1px solid var(--line);
    background:var(--card);
    border-radius:12px;
}

.kpi{
    padding:15px;
}

.kpi small{
    display:block;
    color:var(--muted);
    font-weight:800;
}

.kpi strong{
    display:block;
    font-size:20px;
    margin-top:8px;
}

.grid{
    display:grid;
    grid-template-columns:
        2fr 1fr;
    gap:18px;
}

.card{
    overflow:hidden;
    margin-bottom:18px;
}

.card > h2{
    margin:0;
    padding:16px 18px;
    color:var(--gold);
    border-bottom:
        1px solid var(--line);
}

.body{
    padding:16px;
}

.entry{
    padding:14px;
    margin-bottom:10px;
}

.entry h3{
    margin:0 0 8px;
}

.meta,
.hash{
    color:var(--muted);
    font-size:13px;
}

.problem{
    border-color:
        rgba(239,68,68,.55);
}

.payment{
    border-color:
        rgba(16,185,129,.55);
}

.danger{
    color:#fca5a5;
}

.ok{
    color:var(--green);
    font-weight:800;
}

.empty{
    color:var(--muted);
    font-style:italic;
}

pre{
    white-space:pre-wrap;
    word-break:break-word;
    background:#070a10;
    border:1px solid var(--line);
    border-radius:8px;
    padding:12px;
    max-height:520px;
    overflow:auto;
    font-size:12px;
}

details summary{
    cursor:pointer;
    font-weight:700;
}

@media(max-width:850px){

    .kpis{
        grid-template-columns:
            repeat(2,1fr);
    }

    .grid{
        grid-template-columns:1fr;
    }

    .top{
        align-items:flex-start;
        flex-direction:column;
    }

    .actions{
        width:100%;
    }

    .btn{
        flex:1;
        text-align:center;
    }
}

@media print{

    body{
        background:#fff;
        color:#000;
    }

    .top{
        border-bottom:
            1px solid #aaa;
    }

    .actions{
        display:none;
    }

    main{
        max-width:none;
    }

    .kpi,
    .card,
    .entry{
        background:#fff;
        color:#000;
        border-color:#bbb;
        break-inside:avoid;
    }

    .meta,
    .hash,
    .sub{
        color:#555;
    }

    pre{
        background:#fff;
        color:#000;
        border-color:#ccc;
        max-height:none;
    }

    .grid{
        display:block;
    }
}

</style>

</head>

<body>

<header class="top">

    <div>

        <h1>
            Dossier complet · Table
            ${ichefFiscalEsc(tableId)}
        </h1>

        <div class="sub">
            Chronologie complète, commandes,
            erreurs, annulations,
            paiements, tickets et preuves.
        </div>

    </div>

    <div class="actions">

        <button
            class="btn"
            onclick="window.print()"
        >
            IMPRIMER / PDF
        </button>

        <a
            class="btn"
            href="${ichefFiscalEsc(
                downloadUrl
            )}"
        >
            TÉLÉCHARGER JSON
        </a>

    </div>

</header>

<main>

    <section class="kpis">

        <div class="kpi">
            <small>ÉVÉNEMENTS</small>
            <strong>
                ${chronologie.length}
            </strong>
        </div>

        <div class="kpi">
            <small>
                ERREURS / ANNULATIONS
            </small>
            <strong>
                ${incidents.length}
            </strong>
        </div>

        <div class="kpi">
            <small>PAIEMENTS</small>
            <strong>
                ${paiements.length}
            </strong>
        </div>

        <div class="kpi">
            <small>
                TOTAL ENCAISSÉ
            </small>
            <strong>
                ${total.toFixed(2)}
                ${ichefFiscalEsc(
                    currency
                )}
            </strong>
        </div>

        <div class="kpi">

            <small>EMPREINTE</small>

            <strong
                style="
                    font-size:12px;
                    word-break:break-all;
                "
            >
                ${ichefFiscalEsc(
                    share.contentHash
                )}
            </strong>

        </div>

    </section>

    <div class="grid">

        <div>

            <section class="card">

                <h2>
                    Chronologie complète
                </h2>

                <div class="body">
                    ${chronoHtml}
                </div>

            </section>

        </div>

        <aside>

            <section class="card">

                <h2>
                    Erreurs, corrections
                    & annulations
                </h2>

                <div class="body">
                    ${incidentsHtml}
                </div>

            </section>

            <section class="card">

                <h2>
                    Paiements & tickets
                </h2>

                <div class="body">
                    ${paymentsHtml}
                </div>

            </section>

            <section class="card">

                <h2>
                    Données complètes
                </h2>

                <div class="body">

                    <details>

                        <summary>
                            Afficher le dossier technique
                        </summary>

                        <pre>${ichefFiscalRaw(
                            payload
                        )}</pre>

                    </details>

                </div>

            </section>

        </aside>

    </div>

</main>

</body>

</html>
`;
}

async function ichefHandleFiscalTableShare(
    req,
    res
) {

    try {

        const {
            tenantID,
            masterPin,
            tableId,
            dossier
        } = req.body || {};

        const safeID =
            cleanString(
                tenantID
            );

        const safeTable =
            String(
                tableId ||
                dossier?.tableId ||
                ''
            )
            .trim()
            .slice(0,120);

        if (
            !safeID ||
            !safeTable ||
            !dossier ||
            typeof dossier !== 'object'
        ) {

            return res
                .status(400)
                .json({
                    success:false,
                    error:
                        'Dossier de table incomplet.'
                });
        }

        const tenant =
            await Tenant.findOne({
                tenantID:
                    safeID
            });

        if (
            !tenant ||
            String(
                tenant.pin || ''
            ).trim() !==
            String(
                masterPin || ''
            ).trim()
        ) {

            return res
                .status(403)
                .json({
                    success:false,
                    error:
                        'PIN manager requis pour créer le QR fiscal.'
                });
        }

        const publicPayload =
            ichefFiscalSanitize(
                dossier
            );

        const contentHash =
            crypto
                .createHash(
                    'sha256'
                )
                .update(
                    JSON.stringify({
                        tenantID:
                            safeID,

                        tableId:
                            safeTable,

                        dossier:
                            publicPayload
                    })
                )
                .digest(
                    'hex'
                );

        let share =
            await IchefFiscalTableShare
                .findOne({

                    tenantID:
                        safeID,

                    tableId:
                        safeTable,

                    contentHash,

                    revoked:{
                        $ne:true
                    }
                });

        if (!share) {

            share =
                await IchefFiscalTableShare
                    .create({

                        token:
                            crypto
                                .randomBytes(24)
                                .toString(
                                    'hex'
                                ),

                        tenantID:
                            safeID,

                        tableId:
                            safeTable,

                        contentHash,

                        payload:
                            publicPayload
                    });

            await scellerOperation(
                safeID,
                'CREATE',
                'FISCAL_TABLE_SHARE',
                safeTable,
                'SYSTEM',
                {

                    tableId:
                        safeTable,

                    contentHash,

                    shareTokenHash:
                        crypto
                            .createHash(
                                'sha256'
                            )
                            .update(
                                share.token
                            )
                            .digest(
                                'hex'
                            )
                }
            );
        }

        const forwardedProto =
            String(
                req.headers[
                    'x-forwarded-proto'
                ] || ''
            )
            .split(',')[0]
            .trim();

        const forwardedHost =
            String(
                req.headers[
                    'x-forwarded-host'
                ] || ''
            )
            .split(',')[0]
            .trim();

        const requestBase =
            forwardedHost

                ? `${forwardedProto || 'https'}://${forwardedHost}`

                : `${req.protocol}://${req.get('host')}`;

        const baseUrl =
            String(
                process.env.PUBLIC_BASE_URL ||
                requestBase ||
                'https://tableau-system.onrender.com'
            )
            .replace(
                /\/+$/,
                ''
            );

        const publicUrl =
            `${baseUrl}/fiscal/table/${encodeURIComponent(
                share.token
            )}`;

        return res.json({

            success:true,

            publicUrl,

            token:
                share.token,

            contentHash,

            tableId:
                safeTable
        });

    } catch(error) {

        console.error(
            'Erreur création QR dossier fiscal :',
            error
        );

        return res
            .status(500)
            .json({
                success:false,
                error:
                    'Impossible de créer le lien QR fiscal.'
            });
    }
}


// =============================================================
// ROUTES QR
// =============================================================

app.post(
    '/api/fiscal/table-dossier/share',
    ichefHandleFiscalTableShare
);

app.post(
    '/api/fiscal/table-dossier-share',
    ichefHandleFiscalTableShare
);

app.post(
    '/api/table-dossier/share',
    ichefHandleFiscalTableShare
);


// TEST ROUTE
app.get(
    '/api/fiscal/table-dossier/status',
    (req,res) => {

        res.set(
            'Cache-Control',
            'no-store, max-age=0'
        );

        return res.json({

            success:true,

            service:
                'iCHEF fiscal table dossier QR',

            version:
                '2026-08-28-green-qr1'
        });
    }
);


// ANCIEN ALIAS
app.get(
    '/fiscal/dossier/:token',
    (req,res) => {

        return res.redirect(
            302,

            `/fiscal/table/${encodeURIComponent(
                String(
                    req.params.token ||
                    ''
                )
            )}`
        );
    }
);


// PAGE PUBLIQUE DU QR
app.get(
    '/fiscal/table/:token',
    async(req,res) => {

        try {

            const token =
                String(
                    req.params.token ||
                    ''
                )
                .trim();

            if (
                !/^[a-f0-9]{48}$/i
                    .test(token)
            ) {

                return res
                    .status(404)
                    .send(
                        'Dossier fiscal introuvable.'
                    );
            }

            const share =
                await IchefFiscalTableShare
                    .findOne({

                        token,

                        revoked:{
                            $ne:true
                        }
                    });

            if (!share) {

                return res
                    .status(404)
                    .send(
                        'Dossier fiscal introuvable ou révoqué.'
                    );
            }

            share.lastAccessAt =
                new Date();

            share
                .save()
                .catch(
                    () => {}
                );

            res.set(
                'Cache-Control',
                'no-store, max-age=0'
            );

            return res
                .type(
                    'html'
                )
                .send(
                    ichefFiscalBuildPage(
                        share
                    )
                );

        } catch(error) {

            console.error(
                'Erreur lecture dossier fiscal QR :',
                error
            );

            return res
                .status(500)
                .send(
                    'Erreur lors de l’ouverture du dossier fiscal.'
                );
        }
    }
);


// LECTURE JSON
app.get(
    '/api/fiscal/table-dossier/:token',
    async(req,res) => {

        try {

            const token =
                String(
                    req.params.token ||
                    ''
                )
                .trim();

            const share =
                await IchefFiscalTableShare
                    .findOne({

                        token,

                        revoked:{
                            $ne:true
                        }
                    })
                    .lean();

            if (!share) {

                return res
                    .status(404)
                    .json({
                        success:false,
                        error:
                            'Dossier introuvable.'
                    });
            }

            res.set(
                'Cache-Control',
                'no-store, max-age=0'
            );

            return res.json({

                success:true,

                tableId:
                    share.tableId,

                contentHash:
                    share.contentHash,

                createdAt:
                    share.createdAt,

                dossier:
                    share.payload
            });

        } catch(error) {

            return res
                .status(500)
                .json({
                    success:false,
                    error:
                        'Erreur de lecture du dossier.'
                });
        }
    }
);


// TÉLÉCHARGEMENT JSON
app.get(
    '/api/fiscal/table-dossier/:token/download',
    async(req,res) => {

        try {

            const token =
                String(
                    req.params.token ||
                    ''
                )
                .trim();

            const share =
                await IchefFiscalTableShare
                    .findOne({

                        token,

                        revoked:{
                            $ne:true
                        }
                    })
                    .lean();

            if (!share) {

                return res
                    .status(404)
                    .send(
                        'Dossier introuvable.'
                    );
            }

            const filename =
                `iCHEF_PREUVE_TABLE_${String(
                    share.tableId ||
                    'TABLE'
                )
                .replace(
                    /[^a-z0-9_-]/gi,
                    '_'
                )}.json`;

            res.set(
                'Cache-Control',
                'no-store, max-age=0'
            );

            res.set(
                'Content-Type',
                'application/json; charset=utf-8'
            );

            res.set(
                'Content-Disposition',
                `attachment; filename="${filename}"`
            );

            return res.send(
                JSON.stringify(
                    {
                        format:
                            'iCHEF_PUBLIC_TABLE_AUDIT_EXPORT_V1',

                        tenantID:
                            share.tenantID,

                        tableId:
                            share.tableId,

                        contentHash:
                            share.contentHash,

                        createdAt:
                            share.createdAt,

                        dossier:
                            share.payload
                    },
                    null,
                    2
                )
            );

        } catch(error) {

            return res
                .status(500)
                .send(
                    'Erreur de téléchargement du dossier.'
                );
        }
    }
);



// ============================================================================
// 🔒 iCHEF CORE FROZEN 50 — CONTRAT DE COMPATIBILITÉ DES MODULES
// ============================================================================

const ICHEF_SESSION_SECRET =
    String(
        process.env.ICHEF_SESSION_SECRET ||
        process.env.ADMIN_PASS ||
        ''
    ).trim() ||
    crypto.randomBytes(32).toString('hex');

if (!process.env.ICHEF_SESSION_SECRET && !process.env.ADMIN_PASS) {
    console.warn(
        '⚠️ ICHEF_SESSION_SECRET manquant : sessions signées temporaires jusqu’au prochain redémarrage.'
    );
}

function ichefBase64UrlJson(value) {
    return Buffer
        .from(JSON.stringify(value))
        .toString('base64url');
}

function ichefSignSession(payload = {}, ttlSeconds = 8 * 60 * 60) {
    const now = Math.floor(Date.now() / 1000);

    const claims = {
        ...payload,
        iat: now,
        exp: now + Math.max(60, Number(ttlSeconds || 0)),
        jti: crypto.randomBytes(12).toString('hex')
    };

    const body = ichefBase64UrlJson(claims);
    const signature = crypto
        .createHmac('sha256', ICHEF_SESSION_SECRET)
        .update(body)
        .digest('base64url');

    return `v1.${body}.${signature}`;
}

function ichefVerifySignedSession(token, expected = {}) {
    try {
        const parts = String(token || '').split('.');
        if (parts.length !== 3 || parts[0] !== 'v1') return null;

        const [, body, signature] = parts;

        const expectedSignature = crypto
            .createHmac('sha256', ICHEF_SESSION_SECRET)
            .update(body)
            .digest('base64url');

        const a = Buffer.from(signature);
        const b = Buffer.from(expectedSignature);

        if (
            a.length !== b.length ||
            !crypto.timingSafeEqual(a, b)
        ) return null;

        const claims =
            JSON.parse(
                Buffer.from(body, 'base64url').toString('utf8')
            );

        const now = Math.floor(Date.now() / 1000);

        if (
            !claims ||
            Number(claims.exp || 0) <= now
        ) return null;

        if (
            expected.tenantID &&
            cleanString(claims.tenantID) !==
            cleanString(expected.tenantID)
        ) return null;

        if (
            expected.scope &&
            String(claims.scope || '').toUpperCase() !==
            String(expected.scope || '').toUpperCase()
        ) return null;

        return claims;

    } catch (_) {
        return null;
    }
}

function ichefBearerToken(req) {
    const raw = String(req.headers?.authorization || '').trim();
    const match = raw.match(/^Bearer\s+(.+)$/i);
    return match ? match[1].trim() : '';
}

async function ichefAuthorizePin(
    tenantID,
    pin,
    {
        managerOnly = false
    } = {}
) {
    const safeID = cleanString(tenantID);
    const submittedPin = String(pin || '').trim();

    if (!safeID || !/^\d{4,12}$/.test(submittedPin)) {
        return {
            ok: false,
            status: 401,
            error: 'Authentification invalide.'
        };
    }

    const tenant =
        await Tenant.findOne({ tenantID: safeID }).lean();

    if (!tenant) {
        return {
            ok: false,
            status: 404,
            error: 'Établissement inconnu.'
        };
    }

    if (tenant.status === 'SUSPENDU') {
        return {
            ok: false,
            status: 403,
            error: 'Licence suspendue.'
        };
    }

    if (
        String(tenant.pin || '').trim() ===
        submittedPin
    ) {
        return {
            ok: true,
            tenant,
            role: 'MASTER',
            name: tenant.clientName || 'Direction',
            isManager: true
        };
    }

    const state =
        await AppState.findOne({ tenantID: safeID }).lean();

    const staff =
        Array.isArray(
            state?.activeOrders?.STAFF_ACCESS?.data
        )
            ? state.activeOrders.STAFF_ACCESS.data
            : [];

    const member =
        staff.find(item =>
            item?.active !== false &&
            String(item?.pin || '').trim() === submittedPin
        );

    if (!member) {
        return {
            ok: false,
            status: 403,
            error: 'PIN invalide.'
        };
    }

    const isManager =
        ichefTerminalStaffIsManager(member);

    if (managerOnly && !isManager) {
        return {
            ok: false,
            status: 403,
            error: 'Action réservée à la Direction / au Manager.'
        };
    }

    return {
        ok: true,
        tenant,
        state,
        staff: member,
        role:
            member.role ||
            member.dept ||
            'STAFF',
        name:
            member.name ||
            member.nom ||
            'Collaborateur',
        isManager
    };
}

function ichefEmitFullState(
    tenantID,
    state,
    {
        tableId = '',
        source = 'core-frozen-50',
        extra = {}
    } = {}
) {
    const safeID = cleanString(tenantID);
    if (!safeID || !state) return;

    io.to(safeID).emit('updateState', state);
    io.to(safeID).emit('server-state-changed', {
        tenantID: safeID,
        tableId,
        source,
        timestamp: new Date().toISOString(),
        ...extra
    });
}


// ==========================================================
// 💳 CAISSE — CONFIGURATION CENTRALE
// ==========================================================
const ichefCashConfigWriteQueues = new Map();

function ichefSerializeCashConfigWrite(tenantID, task) {
    const key = cleanString(tenantID);
    const previous =
        ichefCashConfigWriteQueues.get(key) ||
        Promise.resolve();

    const current =
        previous
            .catch(() => undefined)
            .then(task);

    ichefCashConfigWriteQueues.set(key, current);

    current.finally(() => {
        if (ichefCashConfigWriteQueues.get(key) === current) {
            ichefCashConfigWriteQueues.delete(key);
        }
    }).catch(() => {});

    return current;
}

function ichefNormalizeCashRegisterConfig(value = {}) {
    const source =
        value &&
        typeof value === 'object' &&
        !Array.isArray(value)
            ? value
            : {};

    const taxConfig =
        source.taxConfig &&
        typeof source.taxConfig === 'object' &&
        !Array.isArray(source.taxConfig)
            ? source.taxConfig
            : {};

    return {
        ...source,
        enabled: true,
        fiscalMode: true,
        automatic: true,
        backendUrl: '/api/fiscal/cash-in',

        fiscalConnectivity: {
            ...(source.fiscalConnectivity || {}),
            continuousServerSyncRequired: true,
            offlineFiscalizationAllowed: false,
            auditServerSideRequired: true
        },

        separation: {
            ...(source.separation || {}),
            qrNfc: 'commande',
            caisse: 'encaissement_fiscal'
        },

        taxConfig,

        source:
            String(
                source.source ||
                'SYSTEM_AUTO_CONFIGURATION'
            ).slice(0, 80),

        updatedAt:
            new Date().toISOString()
    };
}

function ichefExtractCashConfig(state) {
    const data =
        state?.activeOrders
            ?.SETTINGS_MASTER
            ?.data;

    const settings =
        data &&
        typeof data === 'object' &&
        !Array.isArray(data)
            ? data
            : {};

    return {
        cashRegister:
            settings.cashRegister &&
            typeof settings.cashRegister === 'object'
                ? settings.cashRegister
                : {},

        taxConfig:
            settings.taxConfig &&
            typeof settings.taxConfig === 'object'
                ? settings.taxConfig
                : {},

        revision:
            String(
                settings.cashRegisterServerRevision ||
                ''
            ),

        updatedAt:
            settings.cashRegisterServerUpdatedAt ||
            null
    };
}

app.get('/api/config/cash-register', async (req, res) => {
    try {
        const tenantID =
            cleanString(req.query?.tenantID);

        if (!tenantID) {
            return res.status(400).json({
                success: false,
                persisted: false,
                error: 'tenantID manquant.'
            });
        }

        const state =
            await AppState
                .findOne({ tenantID })
                .lean();

        return res.json({
            success: true,
            persisted: true,
            tenantID,
            ...ichefExtractCashConfig(state || {})
        });

    } catch (error) {
        console.error(
            '[iCHEF CASH CONFIG] lecture :',
            error
        );

        return res.status(500).json({
            success: false,
            persisted: false,
            error:
                'Impossible de lire la configuration caisse.'
        });
    }
});

app.post('/api/config/cash-register', async (req, res) => {
    const tenantID =
        cleanString(
            req.query?.tenantID ||
            req.body?.tenantID
        );

    if (!tenantID) {
        return res.status(400).json({
            success: false,
            persisted: false,
            error: 'tenantID manquant.'
        });
    }

    try {
        const result =
            await ichefSerializeCashConfigWrite(
                tenantID,
                async () => {
                    const incomingCash =
                        req.body?.cashRegister &&
                        typeof req.body.cashRegister === 'object' &&
                        !Array.isArray(req.body.cashRegister)
                            ? req.body.cashRegister
                            : {};

                    const incomingTax =
                        req.body?.taxConfig &&
                        typeof req.body.taxConfig === 'object' &&
                        !Array.isArray(req.body.taxConfig)
                            ? req.body.taxConfig
                            : (
                                incomingCash.taxConfig &&
                                typeof incomingCash.taxConfig === 'object'
                                    ? incomingCash.taxConfig
                                    : {}
                            );

                    const normalized =
                        ichefNormalizeCashRegisterConfig({
                            ...incomingCash,
                            taxConfig: incomingTax
                        });

                    const now =
                        new Date().toISOString();

                    const revision =
                        `cash_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;

                    const confirmedState =
                        await AppState
                            .findOneAndUpdate(
                                { tenantID },
                                {
                                    $set: {
                                        'activeOrders.SETTINGS_MASTER.data.cashRegister':
                                            normalized,

                                        'activeOrders.SETTINGS_MASTER.data.taxConfig':
                                            normalized.taxConfig,

                                        'activeOrders.SETTINGS_MASTER.data.cashRegisterServerRevision':
                                            revision,

                                        'activeOrders.SETTINGS_MASTER.data.cashRegisterServerUpdatedAt':
                                            now,

                                        'activeOrders.SETTINGS_MASTER.updatedAt':
                                            now
                                    }
                                },
                                {
                                    upsert: true,
                                    new: true,
                                    setDefaultsOnInsert: true
                                }
                            )
                            .lean();

                    return {
                        confirmedState,
                        revision,
                        now,
                        confirmed:
                            ichefExtractCashConfig(
                                confirmedState || {}
                            )
                    };
                }
            );

        io.to(tenantID).emit(
            'cashRegisterConfigChanged',
            {
                tenantID,
                revision: result.revision,
                cashRegister:
                    result.confirmed.cashRegister,
                taxConfig:
                    result.confirmed.taxConfig,
                updatedAt:
                    result.now
            }
        );

        // Compatibilité avec les anciennes branches.
        io.to(tenantID).emit(
            'cash-register-config-changed',
            {
                tenantID,
                revision: result.revision,
                cashRegister:
                    result.confirmed.cashRegister,
                taxConfig:
                    result.confirmed.taxConfig,
                updatedAt:
                    result.now
            }
        );

        ichefEmitFullState(
            tenantID,
            result.confirmedState,
            {
                tableId: 'SETTINGS_MASTER',
                source: 'cash-register-config',
                extra: {
                    revision:
                        result.revision
                }
            }
        );

        await scellerOperation(
            tenantID,
            'CONFIG_UPDATE',
            'CASH_REGISTER',
            result.revision,
            String(
                req.body?.operator ||
                'ADMIN'
            ),
            {
                deviceId:
                    String(req.body?.deviceId || ''),
                cashRegister:
                    result.confirmed.cashRegister,
                taxConfig:
                    result.confirmed.taxConfig
            }
        );

        return res.json({
            success: true,
            persisted: true,
            tenantID,
            revision:
                result.revision,
            cashRegister:
                result.confirmed.cashRegister,
            taxConfig:
                result.confirmed.taxConfig,
            updatedAt:
                result.now
        });

    } catch (error) {
        console.error(
            '[iCHEF CASH CONFIG] écriture :',
            error
        );

        return res.status(500).json({
            success: false,
            persisted: false,
            error:
                'Impossible d’enregistrer la configuration caisse.'
        });
    }
});


// ==========================================================
// 🚦 ANTI-RUSH — SESSION SIGNÉE ET ÉTAT CENTRAL
// ==========================================================
function ichefRequireAntiRushSession(req) {
    const tenantID =
        cleanString(
            req.query?.tenantID ||
            req.body?.tenantID ||
            req.headers['x-ichef-tenant']
        );

    const claims =
        ichefVerifySignedSession(
            ichefBearerToken(req),
            {
                tenantID,
                scope: 'ANTI_RUSH'
            }
        );

    return {
        tenantID,
        claims,
        ok: Boolean(tenantID && claims)
    };
}

app.post('/api/anti-rush/login', async (req, res) => {
    try {
        const tenantID =
            cleanString(req.body?.tenantID);

        const pin =
            String(req.body?.pin || '').trim();

        const auth =
            await ichefAuthorizePin(
                tenantID,
                pin,
                {
                    managerOnly: true
                }
            );

        if (!auth.ok) {
            return res
                .status(auth.status || 403)
                .json({
                    success: false,
                    error:
                        auth.error ||
                        'Accès Anti-Rush refusé.'
                });
        }

        const deviceId =
            String(
                req.body?.deviceId ||
                ''
            ).slice(0, 180);

        const token =
            ichefSignSession({
                tenantID,
                scope: 'ANTI_RUSH',
                role:
                    auth.role ||
                    'MANAGER',
                name:
                    auth.name ||
                    '',
                deviceId
            });

        return res.json({
            success: true,
            token,
            role:
                auth.role ||
                'MANAGER',
            tenantID
        });

    } catch (error) {
        console.error(
            '[iCHEF ANTI-RUSH] login :',
            error
        );

        return res.status(500).json({
            success: false,
            error:
                'Impossible d’ouvrir la session Anti-Rush.'
        });
    }
});

app.get('/api/anti-rush/state', async (req, res) => {
    const session =
        ichefRequireAntiRushSession(req);

    if (!session.ok) {
        return res.status(401).json({
            success: false,
            error:
                'Session Anti-Rush invalide ou expirée.'
        });
    }

    try {
        const state =
            await AppState
                .findOne({
                    tenantID:
                        session.tenantID
                })
                .lean();

        return res.json(
            state || {
                tenantID:
                    session.tenantID,
                activeOrders: {}
            }
        );

    } catch (error) {
        return res.status(500).json({
            success: false,
            error:
                'État Anti-Rush indisponible.'
        });
    }
});

app.post('/api/anti-rush/update', async (req, res) => {
    const session =
        ichefRequireAntiRushSession(req);

    if (!session.ok) {
        return res.status(401).json({
            success: false,
            error:
                'Session Anti-Rush invalide ou expirée.'
        });
    }

    const tableId =
        String(
            req.body?.tableId ||
            ''
        ).trim();

    if (
        ![
            'STAFF_ACCESS',
            'SETTINGS_MASTER',
            'ALERTS_MASTER'
        ].includes(tableId)
    ) {
        return res.status(400).json({
            success: false,
            error:
                'Clé Anti-Rush non autorisée.'
        });
    }

    try {
        const order =
            req.body?.order === null
                ? null
                : (
                    req.body?.order &&
                    typeof req.body.order === 'object'
                        ? req.body.order
                        : { data: {} }
                );

        const update =
            order === null
                ? {
                    $unset: {
                        [`activeOrders.${tableId}`]:
                            ''
                    }
                }
                : {
                    $set: {
                        [`activeOrders.${tableId}`]:
                            {
                                ...order,
                                updatedAt:
                                    new Date().toISOString()
                            }
                    }
                };

        const state =
            await AppState
                .findOneAndUpdate(
                    {
                        tenantID:
                            session.tenantID
                    },
                    update,
                    {
                        upsert: true,
                        new: true,
                        setDefaultsOnInsert: true
                    }
                )
                .lean();

        ichefEmitFullState(
            session.tenantID,
            state,
            {
                tableId,
                source:
                    'anti-rush-update'
            }
        );

        if (tableId === 'STAFF_ACCESS') {
            io.to(session.tenantID).emit(
                'staffDutyChanged',
                {
                    tenantID:
                        session.tenantID,
                    source:
                        'anti-rush-update',
                    timestamp:
                        new Date().toISOString()
                }
            );
        }

        await scellerOperation(
            session.tenantID,
            'UPDATE',
            'ANTI_RUSH',
            tableId,
            session.claims?.name ||
            session.claims?.role ||
            'MANAGER',
            {
                tableId,
                deviceId:
                    session.claims?.deviceId ||
                    ''
            }
        );

        return res.json({
            success: true,
            persisted: true
        });

    } catch (error) {
        console.error(
            '[iCHEF ANTI-RUSH] update :',
            error
        );

        return res.status(500).json({
            success: false,
            persisted: false,
            error:
                'Sauvegarde Anti-Rush impossible.'
        });
    }
});


// ==========================================================
// 🧾 AUDIT — ÉVÉNEMENTS CLIENT NON BLOQUANTS
// ==========================================================
app.post('/api/audit/events', async (req, res) => {
    const tenantID =
        cleanString(req.body?.tenantID);

    if (!tenantID) {
        return res.status(400).json({
            success: false,
            error:
                'tenantID manquant.'
        });
    }

    try {
        const action =
            String(
                req.body?.action ||
                'CLIENT_EVENT'
            )
                .trim()
                .toUpperCase()
                .slice(0, 120);

        const moduleName =
            String(
                req.body?.module ||
                'CLIENT'
            )
                .trim()
                .toUpperCase()
                .slice(0, 120);

        const entityId =
            String(
                req.body?.details?.id ||
                req.body?.details?.tableId ||
                req.body?.page ||
                ichefFiscalId('AUDIT')
            ).slice(0, 180);

        const record =
            await scellerOperation(
                tenantID,
                action,
                moduleName,
                entityId,
                'CLIENT',
                {
                    details:
                        req.body?.details || {},
                    page:
                        String(req.body?.page || ''),
                    clientTime:
                        req.body?.clientTime ||
                        null,
                    serverTime:
                        new Date().toISOString()
                }
            );

        io.to(tenantID).emit(
            'history-event',
            {
                tenantID,
                action,
                module:
                    moduleName,
                timestamp:
                    new Date().toISOString()
            }
        );

        return res.status(202).json({
            success: true,
            accepted: true,
            id:
                record?._id ||
                null
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            error:
                'Journalisation indisponible.'
        });
    }
});


// ==========================================================
// 👥 RH — CORRECTIONS / VALIDATION / CLÔTURE
// ==========================================================
async function ichefPersistRealTimesheets(
    tenantID,
    timesheets,
    source,
    extra = {}
) {
    const now =
        new Date().toISOString();

    const state =
        await AppState
            .findOneAndUpdate(
                {
                    tenantID:
                        cleanString(tenantID)
                },
                {
                    $set: {
                        'activeOrders.RH_TIMESHEET_REAL':
                            {
                                data:
                                    timesheets,
                                updatedAt:
                                    now
                            }
                    }
                },
                {
                    upsert: true,
                    new: true,
                    setDefaultsOnInsert: true
                }
            )
            .lean();

    ichefEmitFullState(
        tenantID,
        state,
        {
            tableId:
                'RH_TIMESHEET_REAL',
            source,
            extra
        }
    );

    io.to(cleanString(tenantID)).emit(
        'rhTimesheetUpdated',
        {
            tenantID:
                cleanString(tenantID),
            timesheets,
            source,
            updatedAt:
                now,
            ...extra
        }
    );

    return state;
}

app.post('/api/rh/timesheet/correct', async (req, res) => {
    const tenantID =
        cleanString(req.body?.tenantID);

    const managerPin =
        String(
            req.body?.managerPin ||
            ''
        ).trim();

    const auth =
        await ichefAuthorizePin(
            tenantID,
            managerPin,
            {
                managerOnly: true
            }
        );

    if (!auth.ok) {
        return res
            .status(auth.status || 403)
            .json({
                success: false,
                error:
                    auth.error ||
                    'Correction RH refusée.'
            });
    }

    const staffId =
        String(
            req.body?.staffId ||
            ''
        ).trim();

    const date =
        String(
            req.body?.date ||
            ''
        ).trim();

    const workedHours =
        Number(req.body?.workedHours);

    const reason =
        String(
            req.body?.reason ||
            ''
        ).trim();

    if (
        !staffId ||
        !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        !Number.isFinite(workedHours) ||
        workedHours < 0 ||
        workedHours > 24 ||
        reason.length < 3
    ) {
        return res.status(400).json({
            success: false,
            error:
                'Correction RH invalide.'
        });
    }

    try {
        const state =
            await AppState
                .findOne({
                    tenantID
                })
                .lean();

        const punches =
            Array.isArray(
                state?.activeOrders
                    ?.PUNCHES_MASTER
                    ?.data
            )
                ? state.activeOrders
                    .PUNCHES_MASTER.data
                : [];

        const previous =
            state?.activeOrders
                ?.RH_TIMESHEET_REAL
                ?.data &&
            typeof state.activeOrders
                .RH_TIMESHEET_REAL.data ===
                'object'
                ? JSON.parse(
                    JSON.stringify(
                        state.activeOrders
                            .RH_TIMESHEET_REAL.data
                    )
                )
                : ichefRhBuildWorkedTimesheets(
                    punches,
                    {}
                );

        const month =
            date.slice(0, 7);

        const dayKey =
            date.slice(8, 10);

        const monthNode =
            previous?.months?.[month];

        const staffNode =
            monthNode?.staff?.[staffId];

        const dayNode =
            staffNode?.days?.[dayKey];

        if (!monthNode || !staffNode || !dayNode) {
            return res.status(404).json({
                success: false,
                error:
                    'Journée RH introuvable.'
            });
        }

        if (
            monthNode.status === 'LOCKED' ||
            staffNode.status === 'LOCKED' ||
            dayNode.status === 'LOCKED'
        ) {
            return res.status(409).json({
                success: false,
                error:
                    'Cette feuille d’heures est clôturée.'
            });
        }

        const previousWorkedHours = Number(
            dayNode.workedHours ??
            dayNode.manualWorkedHours ??
            dayNode.rawWorkedHours ??
            0
        );
        dayNode.manualWorkedHours = Math.round(workedHours * 100) / 100;
        dayNode.workedHours = dayNode.manualWorkedHours;
        dayNode.status = 'TO_VERIFY';
        dayNode.correction = {
            reason,
            previousWorkedHours,
            correctedWorkedHours:
                dayNode.manualWorkedHours,
            correctedAt:
                new Date().toISOString(),
            correctedBy:
                auth.name ||
                auth.role ||
                'MANAGER'
        };

        staffNode.status =
            staffNode.status === 'VALIDATED'
                ? 'TO_VERIFY'
                : staffNode.status;

        monthNode.status =
            monthNode.status === 'VALIDATED'
                ? 'TO_VERIFY'
                : monthNode.status;

        const timesheets =
            ichefRhBuildWorkedTimesheets(
                punches,
                previous
            );

        await ichefPersistRealTimesheets(
            tenantID,
            timesheets,
            'rh-timesheet-correct',
            {
                staffId,
                date
            }
        );

        await scellerOperation(
            tenantID,
            'CORRECT',
            'RH_TIMESHEET',
            `${staffId}:${date}`,
            auth.name ||
            auth.role ||
            'MANAGER',
            {
                workedHours:
                    dayNode.manualWorkedHours,
                reason
            }
        );

        return res.json({
            success: true,
            persisted: true,
            timesheets
        });

    } catch (error) {
        console.error(
            '[iCHEF RH] correction :',
            error
        );

        return res.status(500).json({
            success: false,
            error:
                'Correction RH impossible.'
        });
    }
});

app.post('/api/rh/timesheet/status', async (req, res) => {
    const tenantID =
        cleanString(req.body?.tenantID);

    const managerPin =
        String(
            req.body?.managerPin ||
            ''
        ).trim();

    const auth =
        await ichefAuthorizePin(
            tenantID,
            managerPin,
            {
                managerOnly: true
            }
        );

    if (!auth.ok) {
        return res
            .status(auth.status || 403)
            .json({
                success: false,
                error:
                    auth.error ||
                    'Action RH refusée.'
            });
    }

    const month =
        String(
            req.body?.month ||
            ''
        ).trim();

    const staffId =
        String(
            req.body?.staffId ||
            ''
        ).trim();

    const action =
        String(
            req.body?.action ||
            ''
        )
            .trim()
            .toUpperCase();

    if (
        !/^\d{4}-\d{2}$/.test(month) ||
        ![
            'VALIDATE',
            'LOCK_MONTH'
        ].includes(action)
    ) {
        return res.status(400).json({
            success: false,
            error:
                'Action RH invalide.'
        });
    }

    try {
        const state =
            await AppState
                .findOne({
                    tenantID
                })
                .lean();

        const punches =
            Array.isArray(
                state?.activeOrders
                    ?.PUNCHES_MASTER
                    ?.data
            )
                ? state.activeOrders
                    .PUNCHES_MASTER.data
                : [];

        const previous =
            state?.activeOrders
                ?.RH_TIMESHEET_REAL
                ?.data &&
            typeof state.activeOrders
                .RH_TIMESHEET_REAL.data ===
                'object'
                ? JSON.parse(
                    JSON.stringify(
                        state.activeOrders
                            .RH_TIMESHEET_REAL.data
                    )
                )
                : ichefRhBuildWorkedTimesheets(
                    punches,
                    {}
                );

        const monthNode =
            previous?.months?.[month];

        if (!monthNode) {
            return res.status(404).json({
                success: false,
                error:
                    'Mois RH introuvable.'
            });
        }

        const now =
            new Date().toISOString();

        const author =
            auth.name ||
            auth.role ||
            'MANAGER';

        if (action === 'VALIDATE') {
            const staffNode =
                monthNode?.staff?.[staffId];

            if (!staffNode) {
                return res.status(404).json({
                    success: false,
                    error:
                        'Collaborateur RH introuvable.'
                });
            }

            if (
                monthNode.status === 'LOCKED' ||
                staffNode.status === 'LOCKED'
            ) {
                return res.status(409).json({
                    success: false,
                    error:
                        'Cette feuille d’heures est clôturée.'
                });
            }

            staffNode.status =
                'VALIDATED';
            staffNode.validatedAt =
                now;
            staffNode.validatedBy =
                author;

            Object.values(
                staffNode.days || {}
            ).forEach(day => {
                if (day.status !== 'LOCKED') {
                    day.status =
                        'VALIDATED';
                    day.validatedAt =
                        now;
                    day.validatedBy =
                        author;
                }
            });
        }

        if (action === 'LOCK_MONTH') {
            monthNode.status =
                'LOCKED';
            monthNode.lockedAt =
                now;
            monthNode.lockedBy =
                author;

            Object.values(
                monthNode.staff || {}
            ).forEach(staffNode => {
                staffNode.status =
                    'LOCKED';
                staffNode.lockedAt =
                    now;
                staffNode.lockedBy =
                    author;

                Object.values(
                    staffNode.days || {}
                ).forEach(day => {
                    day.status =
                        'LOCKED';
                    day.lockedAt =
                        now;
                    day.lockedBy =
                        author;
                });
            });
        }

        const timesheets =
            ichefRhBuildWorkedTimesheets(
                punches,
                previous
            );

        await ichefPersistRealTimesheets(
            tenantID,
            timesheets,
            'rh-timesheet-status',
            {
                month,
                staffId,
                action
            }
        );

        await scellerOperation(
            tenantID,
            action,
            'RH_TIMESHEET',
            staffId
                ? `${month}:${staffId}`
                : month,
            author,
            {
                month,
                staffId,
                action
            }
        );

        return res.json({
            success: true,
            persisted: true,
            timesheets
        });

    } catch (error) {
        console.error(
            '[iCHEF RH] statut :',
            error
        );

        return res.status(500).json({
            success: false,
            error:
                'Action RH impossible.'
        });
    }
});


// ==========================================================
// 🧮 FISCAL — OUTILS COMMUNS
// ==========================================================
function ichefFrozenBuildVatSummary(
    orderSnapshot = {},
    fallbackTotal = 0
) {
    const items =
        Array.isArray(orderSnapshot?.items)
            ? orderSnapshot.items
            : [];

    const groups = new Map();

    let calculatedHT = 0;
    let calculatedVAT = 0;
    let calculatedTTC = 0;
    let hasRate = false;

    const round2 =
        value =>
            Math.round(
                Number(value || 0) * 100
            ) / 100;

    for (const item of items) {
        if (item?.cancelled === true) continue;

        const qty =
            Math.max(
                0,
                Number(
                    item?.qty ??
                    item?.quantity ??
                    1
                ) || 0
            );

        const unitTTC =
            Number(
                item?.price ??
                item?.p ??
                item?.unitPrice ??
                0
            ) || 0;

        const lineTTC =
            round2(unitTTC * qty);

        const rawRate =
            item?.vatRate ??
            item?.tva ??
            item?.taxRate ??
            null;

        const rate =
            rawRate === null ||
            rawRate === undefined ||
            rawRate === ''
                ? null
                : Number(rawRate);

        calculatedTTC +=
            lineTTC;

        if (
            Number.isFinite(rate) &&
            rate >= 0 &&
            rate <= 100
        ) {
            hasRate = true;

            const lineHT =
                rate === 0
                    ? lineTTC
                    : lineTTC /
                        (1 + rate / 100);

            const lineVAT =
                lineTTC -
                lineHT;

            calculatedHT +=
                lineHT;
            calculatedVAT +=
                lineVAT;

            const key =
                Number(rate)
                    .toFixed(3);

            const current =
                groups.get(key) || {
                    rate:
                        Number(rate),
                    baseHT:
                        0,
                    vat:
                        0,
                    totalTTC:
                        0
                };

            current.baseHT +=
                lineHT;
            current.vat +=
                lineVAT;
            current.totalTTC +=
                lineTTC;

            groups.set(
                key,
                current
            );
        }
    }

    const totalTTC =
        round2(
            Number(
                orderSnapshot?.totalTTC ??
                orderSnapshot?.total ??
                fallbackTotal ??
                calculatedTTC
            ) || 0
        );

    const totalHT =
        hasRate
            ? round2(calculatedHT)
            : round2(
                Number(
                    orderSnapshot?.totalHT ??
                    0
                ) || 0
            );

    const totalVAT =
        hasRate
            ? round2(calculatedVAT)
            : round2(
                Number(
                    orderSnapshot?.totalTVA ??
                    orderSnapshot?.vatTotal ??
                    0
                ) || 0
            );

    return {
        calculated:
            hasRate,
        totalTTC,
        totalHT,
        totalVAT,
        rates:
            Array.from(
                groups.values()
            )
                .map(group => ({
                    rate:
                        Number(group.rate),
                    baseHT:
                        round2(group.baseHT),
                    vat:
                        round2(group.vat),
                    totalTTC:
                        round2(group.totalTTC)
                }))
                .sort(
                    (a, b) =>
                        Number(a.rate) -
                        Number(b.rate)
                )
    };
}

function ichefFrozenFiscalHashBase(transaction = {}) {
    const clone =
        JSON.parse(
            JSON.stringify(
                transaction || {}
            )
        );

    delete clone.ticketHash;
    delete clone.fiscalControlUrl;
    delete clone.serverControlVerifiedAt;

    if (
        clone.receipt &&
        typeof clone.receipt === 'object'
    ) {
        delete clone.receipt.publicUrl;
    }

    return clone;
}

function ichefFrozenVerifyTicketHash(transaction = {}) {
    const stored =
        String(
            transaction?.ticketHash ||
            ''
        );

    if (!stored) {
        return {
            available: false,
            valid: false,
            stored: '',
            recomputed: ''
        };
    }

    const recomputed =
        crypto
            .createHash('sha256')
            .update(
                JSON.stringify(
                    ichefFrozenFiscalHashBase(
                        transaction
                    )
                )
            )
            .digest('hex');

    return {
        available: true,
        valid:
            stored === recomputed,
        stored,
        recomputed
    };
}

async function ichefFrozenVerifyAuditChainForTicket(
    tenantID,
    ticketNumber
) {
    const safeID =
        cleanString(tenantID);

    const logs =
        await AuditLog
            .find({
                tenantID:
                    safeID
            })
            .sort({
                timestamp: 1,
                _id: 1
            })
            .lean();

    let chainValid = true;
    let brokenAt = null;

    for (
        let index = 0;
        index < logs.length;
        index += 1
    ) {
        const log =
            logs[index];

        const expectedPrevious =
            index === 0
                ? 'GENESIS_BLOCK_0000000000000000'
                : String(
                    logs[index - 1]
                        ?.currentHash ||
                    ''
                );

        if (
            String(
                log?.previousHash ||
                ''
            ) !==
            expectedPrevious
        ) {
            chainValid = false;
            brokenAt = index;
            break;
        }

        const dataString =
            JSON.stringify({
                tenantID:
                    safeID,
                action:
                    log.action,
                entityType:
                    log.entityType,
                entityId:
                    log.entityId,
                authorPin:
                    log.authorPin,
                details:
                    log.details,
                previousHash:
                    log.previousHash
            });

        const recomputed =
            crypto
                .createHash('sha256')
                .update(dataString)
                .digest('hex');

        if (
            String(
                log?.currentHash ||
                ''
            ) !==
            recomputed
        ) {
            chainValid = false;
            brokenAt = index;
            break;
        }
    }

    const targetIndex =
        logs.findIndex(log =>
            String(
                log?.entityId ||
                ''
            ) ===
            String(
                ticketNumber ||
                ''
            ) &&
            String(
                log?.action ||
                ''
            ).toUpperCase() ===
            'CASH_IN'
        );

    const target =
        targetIndex >= 0
            ? logs[targetIndex]
            : null;

    return {
        recordFound:
            Boolean(target),
        chainValid,
        brokenAt,
        position:
            targetIndex >= 0
                ? targetIndex + 1
                : null,
        totalRecords:
            logs.length,
        timestamp:
            target?.timestamp ||
            null,
        previousHash:
            target?.previousHash ||
            null,
        currentHash:
            target?.currentHash ||
            null,
        action:
            target?.action ||
            null,
        entityType:
            target?.entityType ||
            null
    };
}

function ichefFiscalPeriodRange(
    period,
    key
) {
    const kind =
        String(period || '')
            .trim()
            .toLowerCase();

    const rawKey =
        String(key || '')
            .trim();

    let start = null;
    let end = null;

    if (
        kind === 'day' &&
        /^\d{4}-\d{2}-\d{2}$/.test(rawKey)
    ) {
        start =
            new Date(
                `${rawKey}T00:00:00.000Z`
            );

        end =
            new Date(
                start.getTime() +
                24 * 60 * 60 * 1000
            );
    }

    if (
        kind === 'month' &&
        /^\d{4}-\d{2}$/.test(rawKey)
    ) {
        const [year, month] =
            rawKey
                .split('-')
                .map(Number);

        start =
            new Date(
                Date.UTC(
                    year,
                    month - 1,
                    1
                )
            );

        end =
            new Date(
                Date.UTC(
                    year,
                    month,
                    1
                )
            );
    }

    if (
        kind === 'year' &&
        /^\d{4}$/.test(rawKey)
    ) {
        const year =
            Number(rawKey);

        start =
            new Date(
                Date.UTC(
                    year,
                    0,
                    1
                )
            );

        end =
            new Date(
                Date.UTC(
                    year + 1,
                    0,
                    1
                )
            );
    }

    return {
        start,
        end
    };
}


// ==========================================================
// 🧾 FISCAL EVENT — JOURNAL SERVEUR
// ==========================================================
app.post('/api/fiscal/event', async (req, res) => {
    const tenantID =
        cleanString(
            req.body?.tenantID ||
            req.headers['x-ichef-tenant']
        );

    const pin =
        String(
            req.body?.pin ||
            req.headers['x-ichef-pin'] ||
            ''
        ).trim();

    const auth =
        await ichefAuthorizePin(
            tenantID,
            pin
        );

    if (!auth.ok) {
        return res
            .status(auth.status || 403)
            .json({
                success: false,
                error:
                    auth.error ||
                    'Événement fiscal refusé.'
            });
    }

    try {
        const event =
            req.body?.event &&
            typeof req.body.event === 'object'
                ? req.body.event
                : {};

        const subtype =
            String(
                event.type ||
                'CLIENT_EVENT'
            )
                .trim()
                .toUpperCase()
                .slice(0, 100);

        const recordId =
            String(
                event.ref ||
                event.id ||
                req.headers['idempotency-key'] ||
                ichefFiscalId('EVENT')
            ).slice(0, 180);

        const amount =
            Number(
                event.signedTotal ??
                event.amount ??
                0
            ) || 0;

        const record =
            await ichefWriteFiscalRecord({
                tenantID,
                recordId,
                operationId:
                    recordId,
                type:
                    'EVENT',
                subtype,
                tableId:
                    String(
                        event.tableId ||
                        ''
                    ),
                status:
                    String(
                        event.status ||
                        'INFO'
                    ),
                amount,
                currency:
                    String(
                        event.currency ||
                        'CHF'
                    ),
                operator:
                    String(
                        event.operator ||
                        auth.name ||
                        auth.role ||
                        ''
                    ),
                terminal:
                    String(
                        req.body?.terminal ||
                        event.terminal ||
                        'CLIENT'
                    ),
                deviceId:
                    String(
                        req.body?.deviceId ||
                        event.deviceId ||
                        ''
                    ),
                details:
                    event,
                createdAt:
                    event.clientTime ||
                    new Date()
            });

        await scellerOperation(
            tenantID,
            subtype,
            'FISCAL_EVENT',
            recordId,
            auth.name ||
            auth.role ||
            'STAFF',
            event
        );

        io.to(tenantID).emit(
            'history-event',
            {
                tenantID,
                type:
                    subtype,
                recordId,
                timestamp:
                    new Date().toISOString()
            }
        );

        return res.json({
            success: true,
            persisted: true,
            recordId:
                record?.recordId ||
                recordId
        });

    } catch (error) {
        console.error(
            '[iCHEF FISCAL EVENT] :',
            error
        );

        return res.status(500).json({
            success: false,
            persisted: false,
            error:
                'Journal fiscal indisponible.'
        });
    }
});


// ==========================================================
// 📚 HISTORIQUE FISCAL JOUR / MOIS / ANNÉE
// ==========================================================
app.get('/api/fiscal/history', async (req, res) => {
    const tenantID =
        cleanString(
            req.query?.tenantID ||
            req.headers['x-ichef-tenant']
        );

    const pin =
        String(
            req.headers['x-ichef-pin'] ||
            req.query?.pin ||
            ''
        ).trim();

    const auth =
        await ichefAuthorizePin(
            tenantID,
            pin
        );

    if (!auth.ok) {
        return res
            .status(auth.status || 403)
            .json({
                success: false,
                error:
                    auth.error ||
                    'Historique fiscal refusé.'
            });
    }

    try {
        const range =
            ichefFiscalPeriodRange(
                req.query?.period,
                req.query?.key
            );

        const filter = {
            tenantID
        };

        if (
            range.start &&
            range.end
        ) {
            filter.createdAt = {
                $gte:
                    range.start,
                $lt:
                    range.end
            };
        }

        const records =
            await FiscalRecord
                .find(filter)
                .sort({
                    createdAt: -1,
                    _id: -1
                })
                .limit(5000)
                .lean();

        const data =
            records.map(record => {
                const details =
                    record?.details &&
                    typeof record.details === 'object'
                        ? record.details
                        : {};

                return {
                    ...details,
                    recordId:
                        record.recordId,
                    type:
                        details.type ||
                        record.type,
                    subtype:
                        details.subtype ||
                        record.subtype,
                    tableId:
                        details.tableId ||
                        record.tableId,
                    ticketNumber:
                        details.ticketNumber ||
                        record.ticketNumber,
                    operationId:
                        details.operationId ||
                        record.operationId,
                    status:
                        details.status ||
                        record.status,
                    amount:
                        details.amount ??
                        record.amount,
                    total:
                        details.total ??
                        record.amount,
                    currency:
                        details.currency ||
                        record.currency,
                    createdAt:
                        details.createdAt ||
                        record.createdAt
                };
            });

        return res.json({
            success: true,
            data,
            period:
                String(req.query?.period || ''),
            key:
                String(req.query?.key || '')
        });

    } catch (error) {
        console.error(
            '[iCHEF FISCAL HISTORY] :',
            error
        );

        return res.status(500).json({
            success: false,
            error:
                'Historique fiscal indisponible.'
        });
    }
});


// ==========================================================
// ✅ CLÔTURE D'UNE TABLE DÉJÀ ENCAISSÉE
// ==========================================================
app.post('/api/orders/close-paid', async (req, res) => {
    const tenantID =
        cleanString(
            req.body?.tenantID ||
            req.headers['x-ichef-tenant']
        );

    const pin =
        String(
            req.body?.pin ||
            req.headers['x-ichef-pin'] ||
            ''
        ).trim();

    const auth =
        await ichefAuthorizePin(
            tenantID,
            pin
        );

    if (!auth.ok) {
        return res
            .status(auth.status || 403)
            .json({
                success: false,
                error:
                    auth.error ||
                    'Clôture refusée.'
            });
    }

    const tableId =
        String(
            req.body?.tableId ||
            ''
        ).trim();

    const ticketNumber =
        String(
            req.body?.ticketNumber ||
            ''
        ).trim();

    if (!tableId || !ticketNumber) {
        return res.status(400).json({
            success: false,
            error:
                'Table ou ticket manquant.'
        });
    }

    try {
        const currentState =
            await AppState
                .findOne({
                    tenantID
                })
                .lean();

        const order =
            currentState
                ?.activeOrders
                ?.[tableId];

        if (!order) {
            return res.json({
                success: true,
                persisted: true,
                idempotent: true,
                alreadyClosed: true
            });
        }

        const actualTicket =
            String(
                order?.fiscalTicket
                    ?.ticketNumber ||
                order?.fiscalReceiptReference ||
                order?.paymentDraft
                    ?.receiptReference ||
                ''
            ).trim();

        const paid =
            order?.paymentStatus === 'PAID' ||
            order?.fiscalStatus === 'FISCALIZED' ||
            order?.status === 'FISCALIZED' ||
            order?.isArchived === true;

        if (
            !paid ||
            actualTicket !== ticketNumber
        ) {
            return res.status(409).json({
                success: false,
                error:
                    'La table n’est pas fiscalisée avec ce ticket.'
            });
        }

        const state =
            await AppState
                .findOneAndUpdate(
                    { tenantID },
                    {
                        $unset: {
                            [`activeOrders.${tableId}`]: ''
                        }
                    },
                    { new: true }
                )
                .lean();

        ichefEmitFullState(
            tenantID,
            state,
            {
                tableId,
                source:
                    'close-paid',
                extra: {
                    ticketNumber
                }
            }
        );

        await scellerOperation(
            tenantID,
            'CLOSE_PAID',
            'TABLE',
            ticketNumber,
            auth.name ||
            auth.role ||
            'STAFF',
            {
                tableId,
                ticketNumber
            }
        );

        return res.json({
            success: true,
            persisted: true,
            ticketNumber,
            tableId
        });

    } catch (error) {
        console.error(
            '[iCHEF CLOSE PAID] :',
            error
        );

        return res.status(500).json({
            success: false,
            persisted: false,
            error:
                'Clôture de table impossible.'
        });
    }
});


// ==========================================================
// ↩️ CORRECTION FISCALE — CONTRE-ÉCRITURE, ORIGINAL CONSERVÉ
// ==========================================================
app.post('/api/fiscal/correction', async (req, res) => {
    const tenantID =
        cleanString(
            req.body?.tenantID ||
            req.headers['x-ichef-tenant']
        );

    const pin =
        String(
            req.body?.pin ||
            req.headers['x-ichef-pin'] ||
            ''
        ).trim();

    const auth =
        await ichefAuthorizePin(
            tenantID,
            pin
        );

    if (!auth.ok) {
        return res
            .status(auth.status || 403)
            .json({
                success: false,
                error:
                    auth.error ||
                    'Correction fiscale refusée.'
            });
    }

    const ticketNumber =
        String(
            req.body?.ticketNumber ||
            ''
        ).trim();

    const tableId =
        String(
            req.body?.tableId ||
            ''
        ).trim();

    const reason =
        String(
            req.body?.reason ||
            ''
        ).trim();

    const mode =
        String(
            req.body?.mode ||
            'FULL_VOID'
        )
            .trim()
            .toUpperCase();

    const requestId =
        String(
            req.body?.correctionRequestId ||
            req.headers['idempotency-key'] ||
            ''
        ).trim() ||
        ichefFiscalId('CORRECTION');

    if (
        !ticketNumber ||
        reason.length < 3 ||
        mode !== 'FULL_VOID'
    ) {
        return res.status(400).json({
            success: false,
            error:
                'Correction fiscale incomplète.'
        });
    }

    try {
        const existing =
            await FiscalRecord
                .findOne({
                    tenantID,
                    recordId:
                        requestId
                })
                .lean();

        if (existing) {
            return res.json({
                success: true,
                persisted: true,
                idempotent: true,
                correctionTicketNumber:
                    existing.ticketNumber,
                ticketNumber:
                    existing.ticketNumber
            });
        }

        const original =
            await FiscalRecord
                .findOne({
                    tenantID,
                    ticketNumber,
                    type:
                        'SALE'
                })
                .sort({
                    createdAt: 1
                })
                .lean();

        if (!original) {
            return res.status(404).json({
                success: false,
                error:
                    'Ticket fiscal original introuvable.'
            });
        }

        const originalTx =
            original.details &&
            typeof original.details === 'object'
                ? original.details
                : {};

        const correctionTicketNumber =
            'COR-' +
            ticketNumber
                .replace(
                    /[^A-Za-z0-9_-]/g,
                    ''
                )
                .slice(-36) +
            '-' +
            Date.now()
                .toString()
                .slice(-6);

        const now =
            new Date().toISOString();

        const amount =
            -Math.abs(
                Number(
                    original.amount ||
                    originalTx.amount ||
                    originalTx.total ||
                    0
                ) || 0
            );

        const correctionTx = {
            id:
                requestId,
            operationId:
                requestId,
            correctionRequestId:
                requestId,
            ticketNumber:
                correctionTicketNumber,
            correctionOf:
                ticketNumber,
            correctionType:
                mode,
            type:
                'CORRECTION',
            status:
                'POSTED',
            tenantID,
            tableId:
                tableId ||
                original.tableId ||
                originalTx.tableId ||
                '',
            method:
                originalTx.method ||
                'CORRECTION',
            amount,
            total:
                amount,
            totalHT:
                -Math.abs(
                    Number(
                        originalTx.totalHT ||
                        0
                    ) || 0
                ),
            currency:
                original.currency ||
                originalTx.currency ||
                'CHF',
            tva:
                originalTx.tva ||
                {},
            reason,
            originalTicketNumber:
                ticketNumber,
            createdAt:
                now,
            date:
                now,
            timestamp:
                Date.now(),
            operator:
                auth.name ||
                auth.role ||
                'STAFF',
            orderSnapshot:
                originalTx.orderSnapshot ||
                {}
        };

        const update = {
            $push: {
                'activeOrders.FINANCIAL_HISTORY.data': {
                    $each: [correctionTx],
                    $position: 0,
                    $slice: ICHEF_FINANCIAL_CACHE_LIMIT
                }
            }
        };

        if (tableId) {
            update.$unset = {
                [`activeOrders.${tableId}`]: ''
            };
        }

        const state =
            await AppState
                .findOneAndUpdate(
                    {
                        tenantID
                    },
                    update,
                    {
                        upsert: true,
                        new: true,
                        setDefaultsOnInsert: true
                    }
                )
                .lean();

        await ichefWriteFiscalRecord({
            tenantID,
            recordId:
                requestId,
            operationId:
                requestId,
            type:
                'CORRECTION',
            subtype:
                mode,
            tableId:
                correctionTx.tableId,
            ticketNumber:
                correctionTicketNumber,
            status:
                'POSTED',
            amount,
            currency:
                correctionTx.currency,
            operator:
                correctionTx.operator,
            terminal:
                String(
                    req.body?.terminal ||
                    'PAD'
                ),
            deviceId:
                String(
                    req.body?.deviceId ||
                    req.headers['x-ichef-device'] ||
                    ''
                ),
            createdAt:
                now,
            details:
                correctionTx
        });

        await scellerOperation(
            tenantID,
            'CORRECTION',
            'PAIEMENT',
            correctionTicketNumber,
            correctionTx.operator,
            correctionTx
        );

        ichefEmitFullState(
            tenantID,
            state,
            {
                tableId:
                    tableId ||
                    correctionTx.tableId,
                source:
                    'fiscal-correction',
                extra: {
                    correctionTicketNumber,
                    correctionOf:
                        ticketNumber
                }
            }
        );

        io.to(tenantID).emit(
            'paymentUpdated',
            {
                tenantID,
                transaction:
                    correctionTx
            }
        );

        return res.json({
            success: true,
            persisted: true,
            correctionTicketNumber,
            ticketNumber:
                correctionTicketNumber,
            correctionOf:
                ticketNumber,
            amount
        });

    } catch (error) {
        console.error(
            '[iCHEF FISCAL CORRECTION] :',
            error
        );

        return res.status(500).json({
            success: false,
            persisted: false,
            error:
                'Correction fiscale impossible.'
        });
    }
});


// ==========================================================
// 🔎 CONTRÔLE FISCAL PUBLIC PAR TOKEN
// ==========================================================
app.get('/api/fiscal/control', async (req, res) => {
    try {
        const tenantID =
            cleanString(
                req.query?.tenantID
            );

        const ticketNumber =
            String(
                req.query?.ticket ||
                req.query?.ticketNumber ||
                ''
            ).trim();

        const token =
            String(
                req.query?.token ||
                ''
            ).trim();

        if (
            !tenantID ||
            !ticketNumber ||
            token.length < 32
        ) {
            return res.status(400).json({
                success: false,
                verified: false,
                error:
                    'QR de contrôle fiscal incomplet.'
            });
        }

        const state =
            await AppState
                .findOne({
                    tenantID
                })
                .lean();

        const history =
            Array.isArray(
                state?.activeOrders
                    ?.FINANCIAL_HISTORY
                    ?.data
            )
                ? state.activeOrders
                    .FINANCIAL_HISTORY.data
                : [];

        let transaction =
            history.find(tx =>
                String(
                    tx?.ticketNumber ||
                    ''
                ) === ticketNumber &&
                String(
                    tx?.fiscalControl
                        ?.token ||
                    ''
                ) === token
            );

        const fiscalRecord =
            await FiscalRecord
                .findOne({
                    tenantID,
                    ticketNumber
                })
                .sort({
                    createdAt: 1
                })
                .lean();

        if (
            !transaction &&
            fiscalRecord?.details &&
            String(
                fiscalRecord.details
                    ?.fiscalControl
                    ?.token ||
                ''
            ) === token
        ) {
            transaction =
                fiscalRecord.details;
        }

        if (!transaction) {
            return res.status(404).json({
                success: false,
                verified: false,
                error:
                    'Ticket fiscal introuvable ou QR invalide.'
            });
        }

        const tenant =
            await Tenant
                .findOne({
                    tenantID
                })
                .lean();

        const ticketHash =
            ichefFrozenVerifyTicketHash(
                transaction
            );

        const audit =
            await ichefFrozenVerifyAuditChainForTicket(
                tenantID,
                ticketNumber
            );

        const snapshot =
            transaction.orderSnapshot ||
            {};

        const vatSummary =
            transaction.vatSummary ||
            ichefFrozenBuildVatSummary(
                snapshot,
                transaction.amount
            );

        const items =
            Array.isArray(
                snapshot.items
            )
                ? snapshot.items
                    .filter(
                        item =>
                            item?.cancelled !== true
                    )
                    .map(item => ({
                        name:
                            String(
                                item?.name ||
                                item?.n ||
                                'Article'
                            ),
                        quantity:
                            Number(
                                item?.qty ??
                                item?.quantity ??
                                1
                            ),
                        unitPriceTTC:
                            Number(
                                item?.price ??
                                item?.p ??
                                item?.unitPrice ??
                                0
                            ),
                        vatRate:
                            item?.vatRate ??
                            item?.tva ??
                            item?.taxRate ??
                            null
                    }))
                : [];

        const fiscalJournalValid =
            Boolean(
                fiscalRecord &&
                (
                    String(
                        fiscalRecord.status ||
                        ''
                    ).toUpperCase() ===
                        'PAID' ||
                    String(
                        fiscalRecord.status ||
                        ''
                    ).toUpperCase() ===
                        'POSTED'
                )
            );

        const verified =
            ticketHash.valid === true &&
            audit.recordFound === true &&
            audit.chainValid === true &&
            fiscalJournalValid;

        res.setHeader(
            'Cache-Control',
            'no-store, no-cache, must-revalidate'
        );

        res.setHeader(
            'X-Robots-Tag',
            'noindex,nofollow'
        );

        return res.json({
            success: true,
            verified,

            control: {
                version:
                    transaction
                        ?.fiscalControl
                        ?.version ||
                    1,
                checkedAt:
                    new Date().toISOString(),
                source:
                    'iCHEF OS — Fiscal Control',
                readOnly:
                    true
            },

            restaurant: {
                tenantID,
                name:
                    String(
                        tenant?.clientName ||
                        tenantID
                    ),
                country:
                    String(
                        transaction.country ||
                        ''
                    ),
                currency:
                    String(
                        transaction.currency ||
                        ''
                    )
            },

            ticket: {
                ticketNumber:
                    transaction.ticketNumber,
                fiscalId:
                    transaction.ticketNumber,
                operationId:
                    transaction.operationId ||
                    transaction.paymentRequestId ||
                    '',
                status:
                    transaction.status ||
                    '',
                tableId:
                    transaction.tableId ||
                    '',
                zone:
                    transaction.zone ||
                    '',
                pax:
                    Number(
                        transaction.pax ||
                        snapshot.pax ||
                        0
                    ),
                createdAt:
                    transaction.createdAt ||
                    transaction.date ||
                    null,
                amountTTC:
                    Number(
                        transaction.total ??
                        transaction.amount ??
                        0
                    ),
                amountHT:
                    Number(
                        vatSummary.totalHT ||
                        transaction.totalHT ||
                        0
                    ),
                vatTotal:
                    Number(
                        vatSummary.totalVAT ||
                        0
                    ),
                vatSummary,
                paymentMethod:
                    transaction.method ||
                    '',
                operator:
                    transaction.waiter ||
                    transaction.operator ||
                    '',
                terminal:
                    transaction.terminal ||
                    '',
                device:
                    transaction.deviceId ||
                    '',
                items
            },

            proof: {
                ticketHash: {
                    algorithm:
                        'SHA-256',
                    valid:
                        ticketHash.valid,
                    stored:
                        ticketHash.stored,
                    recomputed:
                        ticketHash.recomputed
                },

                auditChain: {
                    recordFound:
                        audit.recordFound,
                    valid:
                        audit.chainValid,
                    position:
                        audit.position,
                    totalRecords:
                        audit.totalRecords,
                    action:
                        audit.action,
                    timestamp:
                        audit.timestamp,
                    previousHash:
                        audit.previousHash,
                    currentHash:
                        audit.currentHash,
                    brokenAt:
                        audit.brokenAt
                },

                fiscalJournal: {
                    found:
                        Boolean(
                            fiscalRecord
                        ),
                    recordId:
                        fiscalRecord
                            ?.recordId ||
                        null,
                    type:
                        fiscalRecord
                            ?.type ||
                        null,
                    subtype:
                        fiscalRecord
                            ?.subtype ||
                        null,
                    status:
                        fiscalRecord
                            ?.status ||
                        null,
                    amount:
                        fiscalRecord
                            ?.amount ??
                        null,
                    createdAt:
                        fiscalRecord
                            ?.createdAt ||
                        null
                }
            }
        });

    } catch (error) {
        console.error(
            '[iCHEF FISCAL CONTROL] :',
            error
        );

        return res.status(500).json({
            success: false,
            verified: false,
            error:
                'Contrôle fiscal indisponible.'
        });
    }
});


// ==========================================================
// 🧯 DERNIER FILET EXPRESS — UNE ERREUR HTTP NE DOIT PAS TUER NODE
// ==========================================================
app.use((error, req, res, next) => {
    console.error('[iCHEF HTTP]', {
        requestId: req?.ichefRequestId || '',
        method: req?.method || '',
        path: req?.originalUrl || req?.url || '',
        error: error?.message || String(error || 'Erreur inconnue')
    });

    if (res.headersSent) return next(error);

    const bodyTooLarge = error?.type === 'entity.too.large' || Number(error?.status) === 413;
    return res.status(bodyTooLarge ? 413 : (Number(error?.status) || 500)).json({
        success: false,
        error: bodyTooLarge ? 'Requête trop volumineuse.' : 'Erreur serveur interne.',
        requestId: req?.ichefRequestId || undefined
    });
});

// ==========================================================
// 🛡️ ARRÊT PROPRE / SURVEILLANCE PROCESS
// ==========================================================
let ichefShuttingDown = false;

async function ichefGracefulShutdown(signal, exitCode = 0) {
    if (ichefShuttingDown) return;
    ichefShuttingDown = true;

    console.warn(`⚠️ Arrêt iCHEF demandé : ${signal}`);

    const forceTimer = setTimeout(() => {
        console.error('❌ Arrêt forcé après délai de sécurité.');
        process.exit(exitCode || 1);
    }, 10000);

    forceTimer.unref?.();

    try {
        await new Promise(resolve => {
            io.close(() => resolve());
        });
    } catch (_) {}

    try {
        await new Promise(resolve => {
            server.close(() => resolve());
        });
    } catch (_) {}

    try {
        await mongoose.connection.close(false);
    } catch (error) {
        console.error(
            'Erreur fermeture MongoDB :',
            error?.message || error
        );
    }

    clearTimeout(forceTimer);
    process.exit(exitCode);
}

process.on('SIGTERM', () => {
    ichefGracefulShutdown('SIGTERM', 0);
});

process.on('SIGINT', () => {
    ichefGracefulShutdown('SIGINT', 0);
});

process.on('unhandledRejection', reason => {
    console.error(
        '❌ Promise rejetée non gérée :',
        reason
    );
});

process.on('uncaughtException', error => {
    console.error(
        '❌ Exception Node non interceptée :',
        error
    );

    ichefGracefulShutdown('uncaughtException', 1);
});

// ==========================================================
// 🚀 DÉMARRAGE OFFICIEL DU SERVEUR iCHEF
// IMPORTANT : CE BLOC DOIT ÊTRE LE DERNIER DU server.js
// ==========================================================

server.on('error', error => {
    console.error(
        '❌ Erreur serveur HTTP :',
        error
    );
});

server.listen(
    PORT,
    () => {
        console.log('');
        console.log('==========================================');
        console.log('✅ iCHEF EMPIRE OS — SERVEUR EN LIGNE');
        console.log('==========================================');
        console.log(`✅ Port serveur : ${PORT}`);
        console.log('✅ Socket.IO activé.');
        console.log('✅ MongoDB / AppState activé.');
        console.log(`✅ Mongo pool cible : ${ICHEF_MONGO_MIN_POOL}-${ICHEF_MONGO_MAX_POOL}.`);
        console.log('✅ Moteur fiscal MongoDB activé.');
        console.log('✅ FINANCIAL_HISTORY activé.');
        console.log('✅ FiscalRecord permanent activé.');
        console.log('✅ Fichier Fiscal Complet activé.');
        console.log('✅ Audit cryptographique SHA-256 activé.');
        console.log('✅ Paiements PAD / Caisse synchronisés.');
        console.log('✅ Socket temps réel PAD / Caisse / Cuisine activé.');
        console.log('✅ Roadmap CORE MongoDB / API / Socket.IO activé.');
        console.log('✅ Arrêt propre SIGTERM/SIGINT activé.');
        console.log('==========================================');
    }
);
