const nodemailer = require('nodemailer');
/**
 * ==============================================================
 * 🧠 iCHEF EMPIRE OS — ENGINE SERVER BACKEND (V. FORTERESSE)
 * ==============================================================
 * Version fusionnée, nettoyée et sécurisée — Gemini HTTP + vision SDK
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
// CONFIGURATION STRIPE iCHEF (Abonnements SaaS & Empreintes)
// ==========================================
const stripeKey = process.env.STRIPE_SECRET_KEY;
if (!stripeKey) console.warn('⚠️ STRIPE_SECRET_KEY manquante : paiements désactivés.'); 
const stripe = stripeKey ? require('stripe')(stripeKey) : null;

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

const app = express();
const server = http.createServer(app); // Serveur HTTP lié à Express
const io = new Server(server, { cors: { origin: '*' } }); // Serveur Temps Réel

// 👇 DÉBLOCAGE DES VIDÉOS & RESSOURCES 👇
app.use(express.static(__dirname));

const PORT = process.env.PORT || 10000;

// SÉCURITÉ MAÎTRE DE L'EMPIRE (Super Admin)
const ADMIN_PASS = process.env.ADMIN_PASS || crypto.randomBytes(24).toString('hex');
if (!process.env.ADMIN_PASS) console.warn('⚠️ ADMIN_PASS manquant : mot de passe temporaire généré au démarrage.');

// Sécurité des requêtes (CORS)
app.use(cors({
    origin: function (origin, callback) {
        callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept', 'X-CSRF-Token', 'X-iCHEF-Device', 'X-iCHEF-Master-Device', 'X-iCHEF-Tenant', 'Idempotency-Key']
}));

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

// ==========================================
// WEBHOOK STRIPE : SÉCURITÉ ANTI-IMPAYÉS & UPSELL 
// ==========================================
app.post('/webhook', async (req, res) => {
    if (!stripe) return res.status(503).send('Stripe non configuré.');
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

// ==========================================
// BASE DE DONNÉES : INFRASTRUCTURE MONGODB
// ==========================================
const mongoURI = process.env.MONGO_URI;
if (!mongoURI) {
    console.error('❌ MONGO_URI manquante : impossible de connecter la base de données.');
} else {
    mongoose.connect(mongoURI)
        .then(() => console.log('✅ Base de données iCHEF Online'))
        .catch(err => console.error('❌ MongoDB :', err.message));
}

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
    demoExpiration: { type: Date },
    addons: { type: [String], default: [] }
});
const Tenant = mongoose.model('Tenant', tenantSchema);

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


// =============================================================
// DOSSIER FISCAL DE TABLE — LIEN QR PUBLIC EN LECTURE SEULE
// Le QR ne contient aucune donnée sensible : seulement un jeton aléatoire.
// Le contenu public est une copie expurgée des secrets (PIN, mots de passe, etc.).
// =============================================================
const fiscalTableShareSchema = new mongoose.Schema({
    token: { type: String, required: true, unique: true, index: true },
    tenantID: { type: String, required: true, index: true },
    tableId: { type: String, required: true, index: true },
    contentHash: { type: String, required: true, index: true },
    payload: { type: mongoose.Schema.Types.Mixed, required: true },
    createdAt: { type: Date, default: Date.now },
    lastAccessAt: { type: Date, default: Date.now },
    revoked: { type: Boolean, default: false }
}, { minimize: false });
fiscalTableShareSchema.index({ tenantID: 1, tableId: 1, contentHash: 1 });
const FiscalTableShare = mongoose.model('FiscalTableShare', fiscalTableShareSchema);

function maskAuditOperator(value) {
    const txt = String(value ?? '').trim();
    if (!txt) return '';
    if (txt.length <= 2) return '••';
    return '•'.repeat(Math.min(6, txt.length - 2)) + txt.slice(-2);
}

function sanitizeFiscalSharePayload(value, parentKey = '') {
    if (Array.isArray(value)) return value.map(v => sanitizeFiscalSharePayload(v, parentKey));
    if (value && typeof value === 'object') {
        const out = {};
        for (const [key, child] of Object.entries(value)) {
            const lk = String(key).toLowerCase();
            if (['masterpin','sessionpin','password','passwordhash','secret','authorization','auth','apikey','api_key','access_token','refresh_token'].includes(lk)) continue;
            if (lk === 'pin') { out[key] = '[MASQUÉ]'; continue; }
            if (lk === 'authorpin') { out[key] = maskAuditOperator(child); continue; }
            out[key] = sanitizeFiscalSharePayload(child, key);
        }
        return out;
    }
    return value;
}

function fiscalShareEscape(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}
function fiscalShareDate(value) {
    const d = new Date(value || 0);
    return Number.isNaN(d.getTime()) ? 'Date non enregistrée' : d.toLocaleString('fr-FR');
}
function fiscalShareMoney(value, currency) {
    const n = Number(value || 0);
    return `${Number.isFinite(n) ? n.toFixed(2) : '0.00'} ${currency === 'EUR' ? '€' : fiscalShareEscape(currency || '')}`;
}
function fiscalShareItemName(item) { return item?.n || item?.name || item?.label || item?.title || 'Article'; }
function fiscalShareItemQty(item) { return Number(item?.qty ?? item?.quantity ?? 1) || 1; }
function fiscalShareItemPrice(item) { return Number(item?.p ?? item?.price ?? item?.unitPrice ?? item?.unitPriceTTC ?? 0) || 0; }
function fiscalShareItems(order) { return Array.isArray(order?.items) ? order.items : (Array.isArray(order?.lines) ? order.lines : []); }
function fiscalShareOrderTotal(order) {
    const explicit = Number(order?.total ?? order?.totalTTC ?? order?.amount);
    if (Number.isFinite(explicit) && explicit !== 0) return explicit;
    return fiscalShareItems(order).reduce((sum, i) => sum + fiscalShareItemPrice(i) * fiscalShareItemQty(i), 0);
}
function fiscalShareOperator(e) {
    return e?.actor?.actorId || e?.operatorName || e?.authorName || e?.authorPin || 'SYSTEM';
}
function fiscalShareTerminal(e) {
    return e?.terminalType || e?.actor?.terminalType || e?.terminalId || e?.actor?.deviceId || '—';
}
function fiscalShareAction(e) {
    const a = String(e?.action || e?.eventType || e?.type || 'ÉVÉNEMENT').toUpperCase();
    const map = {
        CREATE:'CRÉATION', UPDATE:'MISE À JOUR', DELETE:'SUPPRESSION', DELETE_SOFT:'ANNULATION / ARCHIVAGE',
        SALE_FINALIZED:'VENTE ENCAISSÉE', PAYMENT:'PAIEMENT', CASH_IN:'PAIEMENT / CASH IN', ORDER_CANCELLED:'ANNULATION',
        DAILY_CLOSURE:'CLÔTURE Z', USER_LOGIN:'CONNEXION', USER_LOGOUT:'DÉCONNEXION'
    };
    return map[a] || a;
}
function fiscalShareReason(e) {
    const d = e?.details || {};
    return e?.reason || d?.reason || d?.motif || d?.error || d?.erreur || d?.message || '';
}
function fiscalShareTicket(e) {
    return e?.ticketNumber || e?.orderSnapshot?.ticketNumber || e?.details?.ticketNumber || '';
}
function fiscalShareProblemLabel(p) {
    if (!p) return 'Correction / erreur détectée';
    if (p.type === 'event') {
        const e = p.event || {};
        return `${fiscalShareAction(e)} — ${fiscalShareReason(e) || 'sans motif textuel enregistré'}`;
    }
    if (p.type === 'item') {
        const i = p.item || {};
        return `${fiscalShareItemName(i)} × ${fiscalShareItemQty(i)} — ${i.reason || i.motif || i.status || 'ligne signalée'}`;
    }
    return 'Correction / erreur détectée';
}
function fiscalShareRaw(value) {
    return fiscalShareEscape(JSON.stringify(value ?? null, null, 2));
}

function buildFiscalTableSharePage(share) {
    const payload = share?.payload || {};
    const summary = payload.summary || {};
    const currency = summary.currency || payload?.fiscalReference?.currency || 'CHF';
    const tableId = payload.tableId || share.tableId || '—';
    const auditEvents = Array.isArray(payload.auditEvents) ? payload.auditEvents : [];
    const orderSnapshots = Array.isArray(payload.orderSnapshots) ? payload.orderSnapshots : [];
    const problems = Array.isArray(payload.problems) ? payload.problems : [];
    const payments = Array.isArray(payload.payments) ? payload.payments : [];
    const totalPaid = Number(summary.totalPaid || 0);
    const timeline = [];
    auditEvents.forEach(e => timeline.push({ kind:'event', date:new Date(e.timestamp || e.date || e.occurredAt || 0), value:e }));
    payments.forEach(p => timeline.push({ kind:'payment', date:new Date(p.date || p.serverTimestamp || p.timestamp || 0), value:p }));
    timeline.sort((a,b) => a.date - b.date);

    const timelineHtml = timeline.length ? timeline.map(row => {
        if (row.kind === 'payment') {
            const p = row.value || {};
            const ticket = p.ticketNumber || p.orderSnapshot?.ticketNumber || '—';
            const amount = Number(p.total ?? p.totalTTC ?? p.amount ?? p.payment?.amount ?? 0);
            const method = p.method || p.paymentMethod || p.payment?.method || 'Non précisé';
            const receipt = p.receipt || {};
            return `<article class="event payment"><h3>PAIEMENT ENCAISSÉ · ${fiscalShareEscape(ticket)}</h3><div class="meta">${fiscalShareEscape(fiscalShareDate(row.date))} · ${fiscalShareEscape(method)} · ${fiscalShareMoney(amount, p.currency || p.payment?.currency || currency)}</div><p>Opérateur : ${fiscalShareEscape(fiscalShareOperator(p))} · Terminal : ${fiscalShareEscape(fiscalShareTerminal(p))}<br>Ticket client : ${receipt.requested === true ? fiscalShareEscape(receipt.delivery || 'OUI') : 'NON'}<br>Empreinte : ${fiscalShareEscape(String(p.chainHash || p.currentHash || '—'))}</p><details><summary>Données complètes du paiement</summary><pre>${fiscalShareRaw(p)}</pre></details></article>`;
        }
        const e = row.value || {};
        const reason = fiscalShareReason(e);
        const ticket = fiscalShareTicket(e);
        return `<article class="event ${reason ? 'problem' : ''}"><h3>${fiscalShareEscape(fiscalShareAction(e))}</h3><div class="meta">${fiscalShareEscape(fiscalShareDate(row.date))} · Opérateur : ${fiscalShareEscape(fiscalShareOperator(e))} · Terminal : ${fiscalShareEscape(fiscalShareTerminal(e))}</div><p>${ticket ? `Ticket : ${fiscalShareEscape(ticket)}<br>` : ''}${reason ? `<strong>Motif / erreur : ${fiscalShareEscape(reason)}</strong><br>` : ''}Hash : ${fiscalShareEscape(String(e.currentHash || e.chainHash || '—'))}</p><details><summary>Données complètes de l'événement</summary><pre>${fiscalShareRaw(e)}</pre></details></article>`;
    }).join('') : '<div class="empty">Aucune trace chronologique.</div>';

    const snapshotsHtml = orderSnapshots.length ? orderSnapshots.map((s, idx) => {
        const order = s?.order || {};
        const items = fiscalShareItems(order);
        const when = fiscalShareDate(s?.date || s?.timestamp || s?.event?.timestamp || s?.payment?.date);
        const status = order.status || order.state || '—';
        const itemsHtml = items.length ? items.map(i => {
            const extras = [];
            const seat = i.seat ?? i.guest ?? i.convive ?? i.c;
            const cooking = i.cooking || i.cuisson;
            const obs = i.observation || i.observations || i.note || i.notes;
            const allergy = i.allergy || i.allergies;
            const st = i.status || i.state;
            const reason = i.reason || i.motif || i.error;
            if (seat !== undefined && seat !== null && seat !== '') extras.push(`Convive : C${String(seat).replace(/^C/i,'')}`);
            if (cooking) extras.push(`Cuisson : ${cooking}`);
            if (obs) extras.push(`Observation : ${typeof obs === 'object' ? JSON.stringify(obs) : obs}`);
            if (allergy) extras.push(`Allergie : ${typeof allergy === 'object' ? JSON.stringify(allergy) : allergy}`);
            if (st) extras.push(`Statut : ${st}`);
            if (reason) extras.push(`Motif : ${reason}`);
            return `<div class="item"><div><b>${fiscalShareEscape(fiscalShareItemQty(i))} × ${fiscalShareEscape(fiscalShareItemName(i))}</b><small>${fiscalShareEscape(extras.join(' · ') || 'Aucun détail complémentaire enregistré.')}</small></div><strong>${fiscalShareMoney(fiscalShareItemPrice(i) * fiscalShareItemQty(i), currency)}</strong></div>`;
        }).join('') : '<div class="empty">Aucune ligne de commande enregistrée.</div>';
        return `<details class="snapshot" ${idx === 0 ? 'open' : ''}><summary><span>${fiscalShareEscape(s?.source || 'État commande')} · ${fiscalShareEscape(when)}</span><span>${fiscalShareEscape(status)} · ${fiscalShareMoney(fiscalShareOrderTotal(order), currency)}</span></summary><div class="snapshot-body">${itemsHtml}<details><summary>Données brutes complètes de cet état</summary><pre>${fiscalShareRaw(order)}</pre></details></div></details>`;
    }).join('') : '<div class="empty">Aucun état de commande archivé dans ce dossier.</div>';

    const problemsHtml = problems.length ? problems.map(p => `<div class="warning"><strong>${fiscalShareEscape(fiscalShareProblemLabel(p))}</strong><details><summary>Données de la trace</summary><pre>${fiscalShareRaw(p)}</pre></details></div>`).join('') : '<div class="ok">Aucune erreur, correction ou annulation explicite trouvée dans les traces disponibles.</div>';

    const paymentsHtml = payments.length ? payments.map(p => {
        const ticket = p.ticketNumber || p.orderSnapshot?.ticketNumber || '—';
        const amount = Number(p.total ?? p.totalTTC ?? p.amount ?? p.payment?.amount ?? 0);
        const method = p.method || p.paymentMethod || p.payment?.method || 'Non précisé';
        return `<div class="payment-card"><h3>${fiscalShareEscape(ticket)} · ${fiscalShareMoney(amount, p.currency || p.payment?.currency || currency)}</h3><p>${fiscalShareEscape(fiscalShareDate(p.date || p.serverTimestamp || p.timestamp))} · ${fiscalShareEscape(method)}<br>Opérateur : ${fiscalShareEscape(fiscalShareOperator(p))} · Terminal : ${fiscalShareEscape(fiscalShareTerminal(p))}<br>Preuve : ${fiscalShareEscape(String(p.chainHash || p.currentHash || '—'))}</p><details><summary>Données complètes</summary><pre>${fiscalShareRaw(p)}</pre></details></div>`;
    }).join('') : '<div class="empty">Aucun paiement enregistré.</div>';

    const jsonUrl = `/api/fiscal/table-dossier/${encodeURIComponent(share.token)}/download`;
    return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>iCHEF · Dossier complet Table ${fiscalShareEscape(tableId)}</title><style>
        :root{--bg:#0b0f19;--panel:#151e2e;--line:#2a3548;--text:#f8fafc;--muted:#9aa9c0;--gold:#e0b83f;--blue:#45bdf2;--green:#13c98b;--red:#ef6262}
        *{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font-family:Inter,system-ui,-apple-system,Segoe UI,Arial,sans-serif}.top{position:sticky;top:0;z-index:10;background:rgba(11,15,25,.97);border-bottom:1px solid var(--line);padding:18px 22px;display:flex;justify-content:space-between;gap:16px;align-items:center}.top h1{margin:0;color:var(--blue);font-family:Georgia,serif;font-size:clamp(1.35rem,4vw,2rem)}.sub{color:var(--muted);font-size:.78rem;margin-top:5px}.actions{display:flex;gap:8px;flex-wrap:wrap}.btn{border:1px solid var(--line);background:var(--panel);color:var(--text);padding:10px 13px;border-radius:9px;font-weight:800;text-decoration:none;cursor:pointer}.btn.gold{border-color:var(--gold);color:var(--gold)}main{max-width:1400px;margin:auto;padding:22px}.kpis{display:grid;grid-template-columns:repeat(5,minmax(140px,1fr));gap:10px;margin-bottom:18px}.kpi{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:15px}.kpi small{display:block;color:var(--muted);font-weight:800;text-transform:uppercase;font-size:.65rem}.kpi strong{display:block;margin-top:8px;font-size:1.25rem}.grid{display:grid;grid-template-columns:minmax(0,2fr) minmax(300px,1fr);gap:16px}.card{background:var(--panel);border:1px solid var(--line);border-radius:16px;overflow:hidden;margin-bottom:16px}.card>h2{margin:0;padding:16px 18px;color:var(--gold);font-family:Georgia,serif;font-size:1.15rem;border-bottom:1px solid var(--line)}.body{padding:16px}.event{padding:14px 0;border-bottom:1px solid var(--line)}.event:last-child{border-bottom:0}.event h3{margin:0 0 7px;font-size:1rem}.event.payment h3{color:var(--green)}.event.problem h3{color:var(--red)}.meta{color:var(--muted);font-size:.73rem}.event p,.payment-card p{line-height:1.5;font-size:.8rem}.snapshot{border:1px solid var(--line);border-radius:11px;margin-bottom:10px;overflow:hidden}.snapshot>summary{display:flex;justify-content:space-between;gap:12px;padding:13px;background:#111827;cursor:pointer;font-weight:800;font-size:.78rem}.snapshot-body{padding:12px}.item{display:flex;justify-content:space-between;gap:12px;padding:10px;border-bottom:1px solid var(--line);font-size:.8rem}.item small{display:block;color:var(--muted);margin-top:5px;line-height:1.4}.warning{border:1px solid rgba(239,98,98,.45);background:rgba(239,98,98,.08);border-radius:10px;padding:12px;margin-bottom:9px}.ok{color:var(--green);font-weight:800;padding:8px}.payment-card{border:1px solid rgba(19,201,139,.35);background:rgba(19,201,139,.05);border-radius:10px;padding:12px;margin-bottom:10px}.payment-card h3{margin:0;color:var(--green);font-size:.92rem}.empty{color:var(--muted);font-style:italic;padding:10px}details>summary{cursor:pointer}pre{white-space:pre-wrap;word-break:break-word;background:#070a10;border:1px solid var(--line);border-radius:8px;padding:12px;max-height:460px;overflow:auto;font-size:.68rem;line-height:1.45}.proof{font-size:.76rem;color:var(--muted);line-height:1.55}.proof code{color:var(--text);word-break:break-all}@media(max-width:900px){.kpis{grid-template-columns:repeat(2,1fr)}.grid{grid-template-columns:1fr}.top{position:static;align-items:flex-start;flex-direction:column}.actions{width:100%}.btn{flex:1;text-align:center}}@media print{body{background:#fff;color:#000}.top{position:static;background:#fff;color:#000}.actions{display:none}main{max-width:none;padding:10mm}.card,.kpi,.snapshot{background:#fff;border-color:#bbb;break-inside:avoid}.card>h2{color:#000}.meta,.sub,.proof,.item small{color:#555}pre{background:#fff;color:#000;border-color:#ccc;max-height:none}.grid{display:block}.card{margin-bottom:8mm}}
    </style></head><body><header class="top"><div><h1>Dossier complet · Table ${fiscalShareEscape(tableId)}</h1><div class="sub">Commande, états successifs, erreurs, annulations, opérateurs, terminaux, paiements, tickets et preuves.</div></div><div class="actions"><button class="btn gold" onclick="window.print()">IMPRIMER / PDF</button><a class="btn" href="${fiscalShareEscape(jsonUrl)}">TÉLÉCHARGER JSON</a></div></header><main>
        <section class="kpis"><div class="kpi"><small>Événements</small><strong>${fiscalShareEscape(summary.events ?? timeline.length)}</strong></div><div class="kpi"><small>États commande</small><strong>${fiscalShareEscape(summary.orderStates ?? orderSnapshots.length)}</strong></div><div class="kpi"><small>Erreurs / annulations</small><strong>${fiscalShareEscape(summary.problems ?? problems.length)}</strong></div><div class="kpi"><small>Paiements</small><strong>${fiscalShareEscape(summary.payments ?? payments.length)}</strong></div><div class="kpi"><small>Total encaissé</small><strong>${fiscalShareMoney(totalPaid,currency)}</strong></div></section>
        <div class="grid"><div><section class="card"><h2>Chronologie complète</h2><div class="body">${timelineHtml}</div></section><section class="card"><h2>États successifs de la commande</h2><div class="body">${snapshotsHtml}</div></section></div><aside><section class="card"><h2>Erreurs, corrections & annulations</h2><div class="body">${problemsHtml}</div></section><section class="card"><h2>Paiements & tickets</h2><div class="body">${paymentsHtml}</div></section><section class="card"><h2>Preuve de contrôle</h2><div class="body proof">Établissement : <b>${fiscalShareEscape(share.tenantID)}</b><br>Table : <b>${fiscalShareEscape(tableId)}</b><br>Créé : ${fiscalShareEscape(fiscalShareDate(share.createdAt))}<br>Empreinte du dossier :<br><code>${fiscalShareEscape(share.contentHash)}</code><br><br>Les secrets d'authentification sont masqués dans cette vue QR publique. Le journal fiscal original reste conservé côté serveur.</div></section></aside></div>
    </main></body></html>`;
}

async function scellerOperation(tenantID, action, entityType, entityId, authorPin, details) {
    try {
        const safeID = cleanString(tenantID);
        const lastLog = await AuditLog.findOne({ tenantID: safeID }).sort({ timestamp: -1 });
        const previousHash = lastLog ? lastLog.currentHash : 'GENESIS_BLOCK_0000000000000000';

        const dataString = JSON.stringify({ tenantID: safeID, action, entityType, entityId, authorPin, details, previousHash });
        const currentHash = crypto.createHash('sha256').update(dataString).digest('hex');

        await AuditLog.create({
            tenantID: safeID, action, entityType, entityId, authorPin, details, previousHash, currentHash
        });
        
        console.log(`🔒 Opération scellée [${action}] pour ${safeID} (Hash: ${currentHash.substring(0,8)}...)`);
    } catch (error) { console.error("🚨 ERREUR CRITIQUE DE SCELLÉ CRYPTOGRAPHIQUE :", error); }
}

app.get('/api/export-preuves-legales', async (req, res) => {
    const { tenantID, masterPin } = req.query;
    const safeID = cleanString(tenantID);
    
    try {
        const tenant = await Tenant.findOne({ tenantID: safeID });
        if (!tenant || tenant.pin !== masterPin) {
            return res.status(403).json({ error: "Accès refusé. Empreinte de sécurité invalide." });
        }

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

    } catch (error) { res.status(500).json({ error: "Erreur lors de l'export d'audit." }); }
});


// =============================================================
// QR FISCAL — CRÉER / LIRE LE DOSSIER COMPLET D'UNE TABLE
// =============================================================
async function handleFiscalTableShare(req, res) {
    try {
        const { tenantID, masterPin, tableId, dossier } = req.body || {};
        const safeID = cleanString(tenantID);
        const safeTable = String(tableId || dossier?.tableId || '').trim().slice(0, 120);
        if (!safeID || !safeTable || !dossier || typeof dossier !== 'object') {
            return res.status(400).json({ success: false, error: 'Dossier de table incomplet.' });
        }
        const tenant = await Tenant.findOne({ tenantID: safeID });
        if (!tenant || String(tenant.pin).trim() !== String(masterPin || '').trim()) {
            return res.status(403).json({ success: false, error: 'PIN manager requis pour créer le QR fiscal.' });
        }

        const publicPayload = sanitizeFiscalSharePayload(dossier);
        const contentHash = crypto.createHash('sha256')
            .update(JSON.stringify({ tenantID: safeID, tableId: safeTable, dossier: publicPayload }))
            .digest('hex');

        let share = await FiscalTableShare.findOne({ tenantID: safeID, tableId: safeTable, contentHash, revoked: { $ne: true } });
        if (!share) {
            share = await FiscalTableShare.create({
                token: crypto.randomBytes(24).toString('hex'),
                tenantID: safeID,
                tableId: safeTable,
                contentHash,
                payload: publicPayload
            });
            await scellerOperation(safeID, 'CREATE', 'FISCAL_TABLE_SHARE', safeTable, 'SYSTEM', {
                tableId: safeTable,
                contentHash,
                shareTokenHash: crypto.createHash('sha256').update(share.token).digest('hex')
            });
        }

        const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
        const forwardedHost = String(req.headers['x-forwarded-host'] || '').split(',')[0].trim();
        const requestBase = forwardedHost ? `${forwardedProto || 'https'}://${forwardedHost}` : `${req.protocol}://${req.get('host')}`;
        const baseUrl = String(process.env.PUBLIC_BASE_URL || requestBase || 'https://tableau-system.onrender.com').replace(/\/+$/, '');
        const publicUrl = `${baseUrl}/fiscal/table/${encodeURIComponent(share.token)}`;
        return res.json({ success: true, publicUrl, token: share.token, contentHash, tableId: safeTable });
    } catch (error) {
        console.error('Erreur création QR dossier fiscal :', error);
        return res.status(500).json({ success: false, error: 'Impossible de créer le lien QR fiscal.' });
    }
}

// Route principale + alias rétrocompatibles. Cela évite les 404 si une interface
// iCHEF légèrement plus ancienne appelle encore l'ancien nom de route.
app.post('/api/fiscal/table-dossier/share', handleFiscalTableShare);
app.post('/api/fiscal/table-dossier-share', handleFiscalTableShare);
app.post('/api/table-dossier/share', handleFiscalTableShare);

// Diagnostic simple : ouvrir cette URL doit renvoyer success:true après déploiement.
app.get('/api/fiscal/table-dossier/status', (req, res) => {
    res.set('Cache-Control', 'no-store, max-age=0');
    res.json({ success: true, service: 'iCHEF fiscal table dossier QR', version: '2026-08-28-qr2' });
});

app.get('/fiscal/dossier/:token', (req, res) => {
    return res.redirect(302, `/fiscal/table/${encodeURIComponent(String(req.params.token || ''))}`);
});

app.get('/fiscal/table/:token', async (req, res) => {
    try {
        const token = String(req.params.token || '').trim();
        if (!/^[a-f0-9]{48}$/i.test(token)) return res.status(404).send('Dossier fiscal introuvable.');
        const share = await FiscalTableShare.findOne({ token, revoked: { $ne: true } });
        if (!share) return res.status(404).send('Dossier fiscal introuvable ou révoqué.');
        share.lastAccessAt = new Date();
        share.save().catch(() => {});
        res.set('Cache-Control', 'no-store, max-age=0');
        res.type('html').send(buildFiscalTableSharePage(share));
    } catch (error) {
        console.error('Erreur lecture dossier fiscal QR :', error);
        res.status(500).send('Erreur lors de l’ouverture du dossier fiscal.');
    }
});

app.get('/api/fiscal/table-dossier/:token', async (req, res) => {
    try {
        const token = String(req.params.token || '').trim();
        const share = await FiscalTableShare.findOne({ token, revoked: { $ne: true } }).lean();
        if (!share) return res.status(404).json({ success: false, error: 'Dossier introuvable.' });
        res.set('Cache-Control', 'no-store, max-age=0');
        res.json({ success: true, tableId: share.tableId, contentHash: share.contentHash, createdAt: share.createdAt, dossier: share.payload });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Erreur de lecture du dossier.' });
    }
});

app.get('/api/fiscal/table-dossier/:token/download', async (req, res) => {
    try {
        const token = String(req.params.token || '').trim();
        const share = await FiscalTableShare.findOne({ token, revoked: { $ne: true } }).lean();
        if (!share) return res.status(404).send('Dossier introuvable.');
        const filename = `iCHEF_PREUVE_TABLE_${String(share.tableId || 'TABLE').replace(/[^a-z0-9_-]/gi,'_')}.json`;
        res.set('Cache-Control', 'no-store, max-age=0');
        res.set('Content-Type', 'application/json; charset=utf-8');
        res.set('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(JSON.stringify({
            format: 'iCHEF_PUBLIC_TABLE_AUDIT_EXPORT_V1',
            tenantID: share.tenantID,
            tableId: share.tableId,
            contentHash: share.contentHash,
            createdAt: share.createdAt,
            dossier: share.payload
        }, null, 2));
    } catch (error) {
        res.status(500).send('Erreur de téléchargement du dossier.');
    }
});

// ==========================================
// 🤖 MOTEURS IA (GEMINI ALIGNÉ COMPLET EN VERSION STABLE)
// ==========================================
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || 'CLE_MANQUANTE');

app.post('/api/scan-invoice', async (req, res) => {
    const { imageBase64, mimeType } = req.body;
    if (!imageBase64) return res.status(400).json({ success: false, error: "Aucune image fournie." });
    try {
        const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
        const imagePart = { inlineData: { data: base64Data, mimeType: mimeType || "image/jpeg" } };
        const prompt = 'Analyse cette image de facture. Extrais les informations. RESPOND ONLY WITH JSON WITHOUT MARKDOWN TEXT: { "fournisseur": "Nom", "adresse": "Adresse", "telephone": "Tel", "email": "Email", "devise": "€", "date": "JJ/MM/AAAA", "totalHT": 0.00, "tva": 0.00, "totalTTC": 0.00, "articles": [{ "nom": "nom", "categorie": "catégorie", "quantite": "qty", "prixUnitaire": 0.00 }] }';
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
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
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const result = await model.generateContent([prompt, imagePart]);
        
        let text = result.response.text().trim();
        const ticks = String.fromCharCode(96, 96, 96);
        text = text.split(ticks + 'json').join('').split(ticks).join('').trim();
        
        res.json({ success: true, resultat: JSON.parse(text) });
    } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});
// ==========================================
// 🧠 IA DIRECTEUR OPÉRATIONNEL & FINANCIER (VISION 360°) - VERSION HTTP STABLE
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
        TU DOIS RÉPONDRE UNIQUEMENT ET STRICTEMENT AVEC LE JSON CI-DESSOUS. N'ÉCRIS RIEN AUTOUR.
        {
            "previsionVentes": "Explication courte.",
            "alertesRupture": ["Alerte 1", "Alerte 2"],
            "commandesFournisseurs": [
                { "fournisseur": "Nom", "articles": ["10kg Tomates"] }
            ],
            "detectionAnomalies": "Explication courte.",
            "recommandationMenu": ["Plat X"],
            "analyseMarge": "Explication claire."
        }`;

        // 🚀 BY-PASS SDK : Appel direct à l'API Google en v1beta via fetch natif
        const apiKey = process.env.GEMINI_API_KEY || 'CLE_MANQUANTE';
        const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const aiData = await aiResponse.json();
        
        if (!aiData.candidates || !aiData.candidates[0]?.content?.parts[0]?.text) {
            throw new Error("L'API Google n'a pas renvoyé de structure valide. Vérifie tes variables d'environnement.");
        }

        let responseText = aiData.candidates[0].content.parts[0].text.trim();
        responseText = responseText.replace(/```json/gi, "").replace(/```/g, "").trim();
        
        const firstBrace = responseText.indexOf('{');
        const lastBrace = responseText.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
            responseText = responseText.substring(firstBrace, lastBrace + 1);
        }

        res.json({ success: true, report: JSON.parse(responseText) });

    } catch (error) {
        console.error("🚨 Erreur IA Executive Report:", error.message);
        res.status(500).json({ success: false, error: "L'analyse IA est momentanément indisponible." });
    }
});
// ==========================================
// 🎙️ ASSISTANT VOCAL DU DIRECTEUR (CONVERSATION EN DIRECT) - VERSION HTTP STABLE
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

        // 🚀 BY-PASS SDK : Connexion HTTP directe
        const apiKey = process.env.GEMINI_API_KEY || 'CLE_MANQUANTE';
        const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const aiData = await aiResponse.json();
        let responseText = aiData.candidates[0].content.parts[0].text.trim();
        
        responseText = responseText.replace(/```json/gi, "").replace(/```/g, "").trim();
        if (!responseText.startsWith("{")) responseText = responseText.substring(responseText.indexOf("{"));
        
        res.json({ success: true, aiReply: JSON.parse(responseText) });
    } catch (error) {
        console.error("Erreur Assistant Vocal:", error.message);
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

        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
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

// =========================================================================
// ✉️ DEMANDE DE DÉMO COMPLÈTE (VIA GMAIL DIRECT)
// =========================================================================
app.post('/api/twilio/request-demo', async (req, res) => {
    const { name, email, phone } = req.body;
    
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.GMAIL_USER,
                pass: process.env.GMAIL_APP_PASSWORD
            }
        });

        const mailOptions = {
            from: process.env.GMAIL_USER,
            to: 'iche.flavien@ichef.ch',
            subject: `🚨 iCHEF OS - NOUVELLE DEMANDE DE DÉMO : ${name} 🚨`,
            text: `Un nouveau prospect demande une démonstration de l'écosystème iCHEF OS.\n\n👤 Nom / Établissement : ${name}\n📧 Adresse E-mail : ${email}\n📞 Numéro de téléphone : ${phone}`
        };

        await transporter.sendMail(mailOptions);
        
        console.log(`✅ Alerte de démo EMAIL envoyée pour : ${name}`);
        res.json({ success: true, message: "Demande de démo traitée avec succès." });

    } catch (error) {
        console.error("❌ Erreur Email Démo :", error.message);
        res.status(500).json({ success: false, error: "Erreur serveur email démo" });
    }
});

// =========================================================================
// 📞 DEMANDE DE RAPPEL (VIA GMAIL DIRECT)
// =========================================================================
app.post('/api/twilio/call-me', async (req, res) => {
    const { phone } = req.body;
    
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.GMAIL_USER, 
                pass: process.env.GMAIL_APP_PASSWORD 
            }
        });

        const mailOptions = {
            from: process.env.GMAIL_USER,
            to: 'iche.flavien@ichef.ch',
            subject: '🚨 iCHEF OS - RAPPEL URGENT 🚨',
            text: `Un prospect sur la vitrine demande à être rappelé immédiatement.\n\n📞 Numéro : ${phone}`
        };

        await transporter.sendMail(mailOptions);
        
        console.log(`✅ Alerte de rappel EMAIL envoyée pour le numéro : ${phone}`);
        res.json({ success: true, message: "Demande traitée avec succès." });

    } catch (error) {
        console.error("❌ Erreur Email Rappel :", error.message);
        res.status(500).json({ success: false, error: "Erreur serveur email" });
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
        res.json({ success: true, status: tenant.status, plan: tenant.plan, specialite: tenant.specialite, addons: tenant.addons || [] });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.post('/api/verify-pin', async (req, res) => {
    const { tenantID, pin, deviceId } = req.body;
    try {
        const tenant = await Tenant.findOne({ tenantID: cleanString(tenantID) });
        if (!tenant) return res.status(404).json({ success: false, error: "Inconnu." });
        
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
            
            if (tenant && tenant.demoExpiration && new Date() > new Date(tenant.demoExpiration)) {
                return res.status(403).json({ error: "Démonstration expirée (limite de 24h)." });
            }
            if (tenant && tenant.status === 'SUSPENDU') return res.status(403).json({ error: "Licence suspendue ou en attente" });
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
// OUTIL DE DIAGNOSTIC
// ==========================================
app.get('/debug-fichiers', (req, res) => {
    const fs = require('fs');
    fs.readdir(__dirname, (err, files) => {
        if (err) return res.status(500).json({ erreur: "Impossible de lire le dossier" });
        res.json({ dossier_actuel: __dirname, fichiers_trouves: files });
    });
});

// ==========================================
// 🎯 PORTAIL DES DEMANDES DE PARTENARIAT DÉTAILLÉ
// ==========================================
app.post('/api/nouvelle-demande-demo', async (req, res) => {
    try {
        const { tenantID, restaurant, email, phone } = req.body;
        console.log(`🌟 ENREGISTREMENT SÉCURISÉ NOUVEAU PARTENAIRE : ${restaurant}`);
        
        const codePinAlea = Math.floor(1000 + Math.random() * 9000).toString();
        const expirationTime = new Date(Date.now() + 24 * 60 * 60 * 1000);

        // 👉 C'EST ICI QUE LE COMPTE EST CRÉÉ POUR TA TOUR DE CONTRÔLE
        await Tenant.create({
            tenantID: cleanString(tenantID),
            clientName: restaurant,
            email: email,
            phone: phone,
            status: 'SUSPENDU', // En attente de ta validation
            plan: 'EMPIRE',     
            specialite: 'cuisine',
            pin: codePinAlea,   
            maxScreens: 5,
            maxStaff: 999,
            registeredDevices: [],
            demoExpiration: expirationTime
        });

        // 2. Initialisation des commandes (vide au départ)
        await AppState.create({
            tenantID: cleanString(tenantID),
            activeOrders: {}
        });

        // 🚨 PRÉPARATION DES DONNÉES DE QUALIFICATION POUR LES ALERTES 🚨
        const d = req.body.details || {};
        let qualification = `Type Précis: ${d.type || 'Non précisé'}\n`;
        if (d.type && d.type.includes('hotel')) {
            qualification += `🏨 Catégorie: ${d.stars || 'N/A'} - 🚪 Chambres: ${d.rooms || 0}\n`;
        }
        if (d.type && d.type.includes('resto')) {
            qualification += `🪑 Couverts: ${d.seats || 0}\n📍 Zones: ${d.zones || 'N/A'}\n`;
        }

        // 📡 ENVOI DE L'ALERTE SMS DIRECTEUR (TWILIO)
        if (twilioClient) {
            try {
                const envTwilioNum = process.env.TWILIO_PHONE_NUMBER || '';
                const fromNumber = envTwilioNum.replace('whatsapp:', '');
                const toNumber = '+330641437265';

                await twilioClient.messages.create({
                    body: `🔥 NOUVEAU PARTENAIRE QUALIFIÉ : ${restaurant}\n📞 Tél: ${phone}\n🆔 TenantID: ${tenantID}\n\n📊 INFOS PROFIL :\n${qualification}\n🎯 PROJET: ${d.projet || 'Aucun'}`,
                    from: fromNumber,
                    to: toNumber
                });
                console.log(`✅ Alerte SMS envoyée.`);
            } catch (smsErr) {
                console.error("❌ Erreur Twilio SMS :", JSON.stringify(smsErr, null, 2));
            }
        }

        // ✨ SMS DU CLIENT (Moteur d'Onboarding VIP) ✨
        if (twilioClient && phone) {
            try {
                let clientPhone = phone.trim().replace(/\s+/g, '');
                if (clientPhone.startsWith('0')) {
                    clientPhone = '+33' + clientPhone.substring(1);
                } else if (!clientPhone.startsWith('+')) {
                    clientPhone = '+' + clientPhone;
                }

                const envTwilioNum = process.env.TWILIO_PHONE_NUMBER || '';
                const fromNumber = envTwilioNum.replace('whatsapp:', '');

                await twilioClient.messages.create({
                    body: `✨ Bienvenue chez iCHEF OS, ${restaurant} !\n\nVotre écosystème sur-mesure est en cours de préparation par notre équipe.\n\n🔑 VOS ACCÈS PROVISOIRES :\n🆔 Identifiant : ${tenantID}\n🔒 Code PIN : ${codePinAlea}\n\nUn expert va vous contacter sous 24h.\nL'équipe iCHEF.`,
                    from: fromNumber,
                    to: clientPhone // SMS Normal
                });
                console.log(`✅ SMS de bienvenue envoyé au partenaire : ${clientPhone}`);
            } catch (err) {
                console.error("❌ Erreur d'envoi SMS au client :", JSON.stringify(err, null, 2));
            }
        }

        // 🚨 ENVOI SILENCIEUX DE L'EMAIL DE NOTIFICATION (FORMSUBMIT)
        try {
            const urlEmail = "https://formsubmit.co/ajax/iche.flavien@ichef.ch";
            const payload = {
                _subject: `🚨 iCHEF OS : Nouveau Lead Qualifié - ${restaurant}`,
                "Établissement": restaurant,
                "Téléphone": phone,
                "Email du gérant": email,
                "Identifiant Généré (ID)": tenantID,
                "Code PIN d'accès temporaire": codePinAlea,
                "Qualification Profil": qualification,
                "Projet / Besoin exprimé": d.projet || 'Aucun détail fourni',
                "Statut": "Bloqué (En attente d'activation manuelle depuis votre panel Admin)",
                _template: "box" 
            };

            fetch(urlEmail, {
                method: "POST",
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify(payload)
            }).then(() => console.log("✅ Email d'alerte interne envoyé."))
              .catch(err => console.log("❌ Erreur silencieuse email interne :", err));
            
        } catch (err) { console.error(err); }

        // 🛒 ENVOI AUTOMATIQUE DE L'E-MAIL DE BIENVENUE AU PARTENAIRE
        try {
            const urlEmailClient = `https://formsubmit.co/ajax/${email}`; 
            const clientPayload = {
                _subject: "✨ Bienvenue dans l'élite iCHEF OS — Préparation de votre écosystème",
                "Message de la Brigade iCHEF": `Bonjour, vous ne devenez pas un simple numéro ou un "client" de plus. Vous devenez un véritable Partenaire. 

Étant nous-mêmes issus du monde de la restauration, nous connaissons la réalité du terrain : la pression du coup de feu, les serveurs débordés, et ces dizaines de commandes supplémentaires qui s'évaporent parce que les clients n'osent pas solliciter une équipe déjà à 200%.

Votre espace privé est actuellement en cours de pré-génération sur nos serveurs sécurisés.

VOS IDENTIFIANTS PROVISOIRES :
🆔 ID Restaurant : ${tenantID}
🔑 Code PIN Master : ${codePinAlea}

PROCHAINES ÉTAPES :
1. L'Appel de Synchronisation (Sous 24h) : Un expert de notre brigade va vous contacter sur ce numéro : ${phone}. Ce sera un appel court pour comprendre la topographie de vos espaces.
2. Le Paramétrage Sur-Mesure : Nous configurons votre carte, le Mode Anti-Rush et les options de Time-Shifting.
3. Le Déploiement : Vous recevrez vos puces NFC haut de gamme, prêtes à poser.

Préparez-vous à vivre votre premier service sans stress.

Flavien Iché & l'équipe iCHEF`,
                _template: "box"
            };

            fetch(urlEmailClient, {
                method: "POST",
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify(clientPayload)
            }).then(() => console.log(`✉️ Mail de bienvenue envoyé à ${email}`))
              .catch(err => console.error("❌ Erreur mail client :", err));

        } catch (mailClientErr) { console.error("Erreur envoi mail client:", mailClientErr); }

        res.json({ success: true, message: "Demande enregistrée avec succès. Workflow déclenché." });

    } catch (e) {
        console.error("Erreur création prospect :", e);
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

        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
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
// 🌟 GESTION DES WEBSOCKETS (SYNCHRONISATION DES ÉCRANS EN SALLE/CUISINE)
// ==========================================
io.on('connection', (socket) => {
    console.log('✅ Nouvelle connexion écran détectée (ID: ' + socket.id + ')');
    
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
server.listen(PORT, () => {
    console.log("✅ L'Empire iCHEF est en ligne, Socket.io activé, sécurisé sur le port " + PORT);
});
