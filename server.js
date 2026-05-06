const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');

// 🛡️ ANTI-CRASH STRIPE : Met une fausse clé si la vraie n'est pas encore sur Render
const stripeKey = process.env.STRIPE_SECRET_KEY || 'sk_test_dummy_key_pour_eviter_le_crash';
const stripe = require('stripe')(stripeKey);

const app = express();
const PORT = process.env.PORT || 10000;

// ==========================================
// 🔓 OUVERTURE TOTALE DES PORTES (CORS)
// ==========================================
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname)));

// ==========================================
// 🧠 CONNEXION MONGODB
// ==========================================
const mongoURI = process.env.MONGO_URI || "mongodb+srv://icheflavien_db_user:VOTRE_MOT_DE_PASSE@cluster0.4w95d7m.mongodb.net/ichef_production?retryWrites=true&w=majority";

mongoose.connect(mongoURI)
    .then(() => console.log('🔥 Connexion Atlas réussie : L\'infrastructure est en ligne.'))
    .catch(err => console.error('🔴 Attention, erreur MongoDB :', err.message));

// ==========================================
// 🏗️ MODÈLES DE BASE DE DONNÉES
// ==========================================
const tenantSchema = new mongoose.Schema({
    tenantID: { type: String, required: true, unique: true },
    clientName: String,
    status: { type: String, enum: ['ACTIF', 'ESSAI', 'SUSPENDU'], default: 'ESSAI' },
    trialEndDate: Date,
    config: Object
});
const Tenant = mongoose.model('Tenant', tenantSchema);

const stateSchema = new mongoose.Schema({
    id: { type: String, required: true },
    activeOrders: { type: Object, default: {} },
    sasConfig: { type: Object, default: { active: true, maxTables: 5, delaySeconds: 60 } }
});
const EmpireState = mongoose.model('EmpireState', stateSchema);

// ==========================================
// 🛡️ SÉCURITÉ & VÉRIFICATION TENANT
// ==========================================
app.get('/verify-tenant/:tenantID', async (req, res) => {
    try {
        const tenant = await Tenant.findOne({ tenantID: req.params.tenantID });
        if (!tenant) return res.status(404).json({ success: false, message: "🚨 INCONNU." });
        
        let now = new Date();
        if (tenant.status === 'ESSAI' && tenant.trialEndDate && now > tenant.trialEndDate) {
            tenant.status = 'SUSPENDU'; 
            await tenant.save();
        }

        if (tenant.status === 'SUSPENDU') {
            return res.status(403).json({ success: false, message: "🚨 ACCÈS SUSPENDU." });
        }
        res.json({ success: true, clientName: tenant.clientName, status: tenant.status });
    } catch (error) { res.status(500).json({ error: "Erreur serveur." }); }
});

// ==========================================
// 🚦 LOGIQUE SAS CUISINE & MÉMOIRE ACTIVE MULTI-TENANT
// ==========================================
let tenantsState = {}; 

async function initTenantState(tenantID) {
    if (!tenantsState[tenantID]) {
        try {
            let doc = await EmpireState.findOne({ id: tenantID });
            if (doc) {
                tenantsState[tenantID] = {
                    activeOrders: doc.activeOrders || {},
                    sasConfig: doc.sasConfig || { active: true, maxTables: 5, delaySeconds: 60 },
                    webOrderQueue: [],
                    lastSasRelease: 0
                };
            } else {
                tenantsState[tenantID] = {
                    activeOrders: {},
                    sasConfig: { active: true, maxTables: 5, delaySeconds: 60 },
                    webOrderQueue: [],
                    lastSasRelease: 0
                };
                await new EmpireState({ id: tenantID, activeOrders: {}, sasConfig: tenantsState[tenantID].sasConfig }).save();
            }
        } catch (err) {
            console.error(`Erreur lecture DB State pour ${tenantID}:`, err.message);
            tenantsState[tenantID] = { activeOrders: {}, sasConfig: { active: true, maxTables: 5, delaySeconds: 60 }, webOrderQueue: [], lastSasRelease: 0 };
        }
    }
    return tenantsState[tenantID];
}

app.get('/get-current-state', async (req, res) => {
    const tenantID = req.query.tenantID || 'MASTER_STATE';
    const state = await initTenantState(tenantID);
    res.json({ activeOrders: state.activeOrders, sasConfig: state.sasConfig });
});

app.post('/update-order', async (req, res) => {
    const tenantID = req.query.tenantID || 'MASTER_STATE';
    const { tableId, order } = req.body;
    const state = await initTenantState(tenantID);

    if (order === null) {
        delete state.activeOrders[tableId];
    } else {
        state.activeOrders[tableId] = order;
    }
    
    try { await EmpireState.findOneAndUpdate({ id: tenantID }, { activeOrders: state.activeOrders }, { upsert: true }); } catch (e) {}
    res.json({ success: true });
});

app.post('/update-sas', async (req, res) => {
    const tenantID = req.query.tenantID || 'MASTER_STATE';
    const state = await initTenantState(tenantID);

    state.sasConfig = { ...state.sasConfig, ...req.body };
    
    if (!state.sasConfig.active && state.webOrderQueue.length > 0) {
        while(state.webOrderQueue.length > 0) {
            let nextOrder = state.webOrderQueue.shift();
            state.activeOrders[nextOrder.tableId] = nextOrder.order;
        }
    }
    
    try { await EmpireState.findOneAndUpdate({ id: tenantID }, { sasConfig: state.sasConfig }, { upsert: true }); } catch(e) {}
    res.json({ success: true, sasConfig: state.sasConfig });
});

setInterval(() => {
    for (let tenantID in tenantsState) {
        let state = tenantsState[tenantID];
        if (state.sasConfig.active && state.webOrderQueue.length > 0) {
            let now = Date.now();
            if (now - state.lastSasRelease >= (state.sasConfig.delaySeconds * 1000)) {
                let activeWebCount = Object.values(state.activeOrders).filter(o => o && o.isWeb).length;
                if (activeWebCount < state.sasConfig.maxTables) {
                    let nextOrder = state.webOrderQueue.shift();
                    state.activeOrders[nextOrder.tableId] = nextOrder.order;
                    state.lastSasRelease = now;
                    EmpireState.findOneAndUpdate({ id: tenantID }, { activeOrders: state.activeOrders }, { upsert: true }).catch(()=>{});
                }
            }
        }
    }
}, 5000);

// ==========================================
// 💳 TUNNEL DE PAIEMENT STRIPE (ABONNEMENT SAAS)
// ==========================================
app.get('/create-checkout-session', async (req, res) => {
    try {
        const priceId = process.env.STRIPE_PRICE_ID;
        if(!priceId) {
            return res.status(400).send("Erreur: Le produit Stripe n'est pas encore configuré sur le serveur.");
        }

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{ price: priceId, quantity: 1 }],
            mode: 'subscription',
            success_url: 'https://tableau-system.onrender.com/?success=true',
            cancel_url: 'https://tableau-system.onrender.com/?canceled=true',
        });
        res.redirect(303, session.url);
    } catch (error) { 
        console.error("Erreur Stripe:", error.message);
        res.status(500).send("Erreur de connexion à Stripe."); 
    }
});

// ==========================================
// 🏠 VITRINE DE VENTE & ONBOARDING (LANDING PAGE PREMIUM)
// ==========================================
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="fr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Empire OS - Infrastructure SaaS</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;900&display=swap');
                :root { --bg: #09090b; --panel: #111827; --border: #1f2937; --gold: #fbbf24; --text: #f9fafb; --text-muted: #9ca3af; }
                body { background-color: var(--bg); color: var(--text); font-family: 'Inter', sans-serif; margin: 0; padding: 0; display: flex; flex-direction: column; min-height: 100vh; }
                
                .header-nav { padding: 30px 50px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); }
                .logo { font-size: 2rem; font-weight: 900; letter-spacing: -1px; }
                .logo span { color: var(--gold); }
                
                .container { max-width: 1200px; width: 90%; margin: 50px auto; display: grid; grid-template-columns: 1.2fr 1fr; gap: 60px; align-items: center; }
                @media (max-width: 900px) { .container { grid-template-columns: 1fr; gap: 40px; text-align: center; } .features { align-items: center; } .feature { text-align: left; } }
                
                .hero h1 { font-size: 3.5rem; font-weight: 900; margin: 0 0 15px 0; letter-spacing: -2px; line-height: 1.1; }
                .hero p { font-size: 1.15rem; color: var(--text-muted); margin-bottom: 40px; line-height: 1.6; font-weight: 300; max-width: 90%; }
                
                .features { display: flex; flex-direction: column; gap: 20px; }
                .feature { background: var(--panel); border: 1px solid var(--border); padding: 25px; border-radius: 16px; display: flex; gap: 20px; align-items: flex-start; transition: transform 0.3s ease, border-color 0.3s ease; }
                .feature:hover { transform: translateX(8px); border-color: var(--gold); }
                .feature-icon { background: rgba(251, 191, 36, 0.1); color: var(--gold); width: 45px; height: 45px; border-radius: 10px; display: flex; justify-content: center; align-items: center; font-weight: 900; flex-shrink: 0; font-size: 1.2rem; border: 1px solid rgba(251, 191, 36, 0.2); }
                .feature-text h3 { margin: 0 0 8px 0; font-size: 1.2rem; font-weight: 600; }
                .feature-text p { margin: 0; color: var(--text-muted); font-size: 0.95rem; line-height: 1.5; }
                
                /* NOUVELLE GRILLE DE PRIX */
                .pricing-section { text-align: center; margin-top: 20px; }
                .pricing-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 30px; }
                @media (max-width: 600px) { .pricing-grid { grid-template-columns: 1fr; } }
                
                .pricing-card { background: var(--panel); border: 1px solid var(--border); border-radius: 20px; padding: 30px; position: relative; transition: 0.3s; display: flex; flex-direction: column; }
                .pricing-card:hover { border-color: var(--gold); transform: translateY(-5px); box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
                .pricing-card.premium { background: linear-gradient(180deg, var(--panel) 0%, rgba(251,191,36,0.05) 100%); border-color: rgba(251,191,36,0.3); }
                
                .pricing-card h3 { font-size: 1.5rem; margin: 0 0 10px 0; }
                .pricing-card .price { font-size: 3rem; font-weight: 900; color: var(--gold); margin-bottom: 5px; }
                .pricing-card .price span { font-size: 1rem; color: var(--text-muted); font-weight: 400; }
                .pricing-card .setup-fee { font-size: 0.85rem; color: #f87171; font-weight: bold; margin-bottom: 25px; padding-bottom: 20px; border-bottom: 1px solid var(--border); }
                
                .pricing-card ul { list-style: none; padding: 0; margin: 0 0 30px 0; text-align: left; flex: 1; }
                .pricing-card ul li { margin-bottom: 15px; display: flex; align-items: center; gap: 10px; font-size: 0.95rem; color: var(--text); }
                .pricing-card ul li::before { content: '✓'; color: var(--gold); font-weight: bold; }
                
                .btn-submit { background: var(--gold); color: #000; border: none; padding: 18px; border-radius: 12px; font-weight: 900; font-size: 1rem; width: 100%; cursor: pointer; text-transform: uppercase; letter-spacing: 1px; transition: 0.2s; text-decoration: none; display: block; box-sizing: border-box; text-align: center; }
                .btn-submit:hover { transform: translateY(-2px); box-shadow: 0 10px 25px -5px rgba(251, 191, 36, 0.4); }
                .btn-submit.outline { background: transparent; color: var(--text); border: 1px solid var(--border); }
                .btn-submit.outline:hover { border-color: var(--text); box-shadow: none; background: rgba(255,255,255,0.05); }

            </style>
        </head>
        <body>
            <div class="header-nav">
                <div class="logo">Empire <span>OS</span></div>
                <a href="#tarifs" style="color: var(--text); text-decoration: none; font-weight: 600;">Nos Offres</a>
            </div>

            <div class="container" id="main-content">
                <div class="hero">
                    <h1>L'infrastructure technologique absolue.</h1>
                    <p>Conçu pour les restaurants à haut volume. Automatisez votre production, maîtrisez vos flux et encaissez sans friction. Fini l'attente pour vos clients.</p>
                    
                    <div class="features">
                        <div class="feature">
                            <div class="feature-icon">⚡</div>
                            <div class="feature-text">
                                <h3>SAS Cuisine Autonome</h3>
                                <p>Régulation algorithmique des commandes entrantes. Protégez votre brigade des surcharges de travail lors des rushs.</p>
                            </div>
                        </div>
                        <div class="feature">
                            <div class="feature-icon">💳</div>
                            <div class="feature-text">
                                <h3>Portail d'Encaissement</h3>
                                <p>Commande et division d'addition en 1 clic via QR Code ou NFC. Maximisez la rotation de vos tables sans serveurs mobilisés.</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="pricing-section" id="tarifs">
                    <h2 style="font-size: 2rem; margin-bottom: 5px;">Déployez votre instance</h2>
                    <p style="color: var(--text-muted); margin-bottom: 0;">Choisissez le modèle qui correspond à votre volume.</p>
                    
                    <div class="pricing-grid">
                        <!-- OFFRE 1 : SÉRÉNITÉ -->
                        <div class="pricing-card">
                            <h3>Offre Sérénité</h3>
                            <div class="price">99€<span>/mois</span></div>
                            <div class="setup-fee">+ 299€ Frais d'installation initiale</div>
                            <ul>
                                <li><strong>100% de vos marges conservées</strong></li>
                                <li>Prises de commandes QR illimitées</li>
                                <li>SAS Cuisine Anti-Stress inclus</li>
                                <li>Support prioritaire 7j/7</li>
                            </ul>
                            <a href="/create-checkout-session" class="btn-submit">Souscrire (Fixe)</a>
                        </div>
                        
                        <!-- OFFRE 2 : PARTENAIRE -->
                        <div class="pricing-card premium">
                            <h3>Offre Partenaire</h3>
                            <div class="price">1.5%<span>/paiement</span></div>
                            <div class="setup-fee">+ 299€ Frais d'installation initiale</div>
                            <ul>
                                <li><strong>Abonnement mensuel 100% gratuit</strong></li>
                                <li>Aucun risque : 0€ si vous êtes fermé</li>
                                <li>Toutes les fonctionnalités incluses</li>
                                <li>Paiement via Stripe Connect</li>
                            </ul>
                            <button class="btn-submit outline" onclick="alert('L\\'offre partenaire nécessite la configuration de votre compte Stripe Connect. Contactez-nous à l\\'adresse : contact@votre-email.com ou appelez-nous pour l\\'installation.')">Nous Contacter</button>
                        </div>
                    </div>
                </div>
            </div>
            
            <script>
                const urlParams = new URLSearchParams(window.location.search);
                if (urlParams.get('success') === 'true') {
                    document.getElementById('main-content').innerHTML = \`
                        <div style="grid-column: 1/-1; text-align: center; padding: 100px 20px; background: var(--panel); border: 1px solid var(--border); border-radius: 24px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);">
                            <div style="font-size: 5rem; margin-bottom: 20px;">✅</div>
                            <h1 style="font-size: 3.5rem; margin-bottom: 15px; letter-spacing: -1px;">Paiement validé</h1>
                            <p style="font-size: 1.2rem; color: var(--text-muted); max-width: 600px; margin: 0 auto 40px auto; line-height: 1.6;">Félicitations. Le déploiement de votre infrastructure Empire OS est en cours. Nous allons prendre contact avec vous pour procéder à l'installation des 299€ et configurer votre carte.</p>
                            <a href="/" style="color: var(--gold); text-decoration: none; font-weight: 900; border: 2px solid var(--gold); padding: 15px 30px; border-radius: 10px; text-transform: uppercase; letter-spacing: 1px; transition: 0.2s;" onmouseover="this.style.background='var(--gold)'; this.style.color='#000';" onmouseout="this.style.background='transparent'; this.style.color='var(--gold)';">Retour à l'accueil</a>
                        </div>
                    \`;
                }
            </script>
        </body>
        </html>
    `);
});

app.listen(PORT, () => console.log("iCHEFest en ligne sur le port " + PORT));
