const nodemailer = require('nodemailer');
/**
 * ==============================================================
 * 🧠 iCHEF EMPIRE OS — ENGINE SERVER BACKEND (V. FORTERESSE)
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
// CONFIGURATION STRIPE iCHEF (Abonnements SaaS & Empreintes)
// ==========================================
const stripeKey = process.env.STRIPE_SECRET_KEY || 'sk_test_51TN80JQ9Dw3nOfA4I3XTxPl5FR4ddYmU9Jw2pGmfa0eABz2P6wAzK8RMzHw2XilulLXxFmY2oEDgau4TcScOf9WK00ajIEuweB'; 
const stripe = require('stripe')(stripeKey);

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
const ADMIN_PASS = process.env.ADMIN_PASS || 'Empire2026';

app.use(cors({
    origin: function (origin, callback) {
        callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept', 'X-CSRF-Token', 'X-iCHEF-Device', 'X-iCHEF-Master-Device', 'X-iCHEF-Tenant', 'Idempotency-Key', 'X-Requested-With']
}));;

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
const Tenant = mongoose.model('Tenant', tenantSchema);

const AppState = mongoose.model('AppState', new mongoose.Schema({
    tenantID: { type: String, required: true, unique: true },
    activeOrders: { type: Object, default: {} }
}, { minimize: false }));

// 👉 COLLER ICI LA ROUTE /api/security/bootstrap

// =============================================================
// 🛡️ INITIALISATION SÉCURITÉ DU PAD
// =============================================================
app.post('/api/security/bootstrap', async (req, res) => {
    ...
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
const AuditLog = mongoose.model('AuditLog', auditLogSchema);

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
});// ==========================================
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
// 📞 DEMANDE DE RAPPEL (VIA GMAIL DIRECT)
// =========================================================================
app.post('/api/twilio/call-me', async (req, res) => {
    const { phone } = req.body;
    
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'flavieniche@gmail.com', // 👈 L'apostrophe est bien fermée ici !
                pass: 'atebfwhijmgmavcy' // 👈 Ton code Google sans espaces
            }
        });

        const mailOptions = {
            from: 'flavieniche@gmail.com',
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

// 🛡️ ROUTE D'EXTRACTION DES VRAIES PREUVES LÉGALES (JSON) POUR LE BOUTON
app.get('/api/export-blockchain-json', async (req, res) => {
    try {
        const tenantID = cleanString(req.query.tenantID);
        if (!tenantID) return res.status(400).send("ID Restaurant manquant.");

        const tenant = await Tenant.findOne({ tenantID });
        if (!tenant) return res.status(404).send("Établissement inconnu.");

        // 🔥 CORRECTION : On utilise bien tenantID ici pour éviter le crash
        const logs = await AuditLog.find({ tenantID: tenantID }).sort({ timestamp: 1 });
        
        // On vérifie en temps réel si la chaîne de sécurité est intacte
        let isChainValid = true;
        let brokenAtIndex = null;
        for (let i = 1; i < logs.length; i++) {
            if (logs[i].previousHash !== logs[i-1].currentHash) {
                isChainValid = false;
                brokenAtIndex = i;
                break;
            }
        }

        // On fabrique le fichier officiel de conformité fiscale
        const certificatCertifie = {
            "version_protocole": "iCHEF FORTERESSE v4.0",
            "certificatLegal": {
                "etablissement": tenant.clientName || "Non renseigné",
                "identifiant_unique": tenantID,
                "dateExtraction": new Date().toISOString(),
                "integriteGarantie": isChainValid,
                "statut_falsification": isChainValid ? "Chaîne intègre - Aucune altération détectée" : `ATTENTION: Altération détectée à l'index ${brokenAtIndex}`,
                "total_blocs_scelles": logs.length
            },
            "journal_audit_trail": logs
        };

        // On envoie le fichier au format JSON directement en téléchargement
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename=Certificat_Preuves_Legales_${tenantID}.json`);
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
        res.json({ success: true, status: tenant.status, plan: tenant.plan, specialite: tenant.specialite });
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
// 🔥 LE SEUL ET UNIQUE BLOC io.on('connection') 🔥
io.on("connection", socket => {
    console.log(`✅ Nouvelle connexion écran détectée : ${socket.id}`);
    // CORRECTION CRITIQUE DU BUG [object Object]
    socket.on("joinTenant", async (payload) => {
        
        let rawID = typeof payload === 'object' ? payload.tenantID : payload;
        const safeID = cleanString(rawID);

        if (!safeID) return;

        socket.join(safeID);
        socket.data.tenantID = safeID;

        console.log(`📡 L'écran ${socket.id} est maintenant synchronisé sur le réseau du restaurant : ${safeID}`);

        /*
         * Envoie immédiatement l’état actuel au nouvel écran.
         */
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

socket.on("disconnect", () => {
        console.log(`❌ Écran déconnecté : ${socket.id}`);
    });

}); // 🔥 FERMETURE DÉFINITIVE DU BLOC DES CONNEXIONS ÉCRANS 🔥

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

// 🔥 DÉMARRAGE DU SERVEUR (DOIT ÊTRE TOUT SEUL À LA FIN) 🔥
server.listen(PORT, () => {
    console.log("✅ L'Empire iCHEF est en ligne, Socket.io activé, sécurisé sur le port " + PORT);
});
