const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
// Limite augmentée pour autoriser l'envoi de grosses photos
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname))); 

// Base de données en mémoire pour la synchronisation (Grimoire, Staff, Ventes...)
let globalState = { activeOrders: {} };

// ==========================================
// 📡 ENDPOINTS DE SYNCHRONISATION
// ==========================================
app.get('/get-current-state', (req, res) => {
    res.json(globalState);
});

app.post('/update-order', (req, res) => {
    const { tableId, order } = req.body;
    if (order === null) {
        delete globalState.activeOrders[tableId];
    } else {
        globalState.activeOrders[tableId] = order;
    }
    res.json({ success: true });
});

// ==========================================
// 🤖 MOTEUR IA (ANALYSE FACTURES & HACCP)
// ==========================================
app.post('/analyse-ticket', async (req, res) => {
    try {
        const { image, mimeType, isLabelScan } = req.body;
        const API_KEY = process.env.GEMINI_API_KEY;

        if (!API_KEY) {
            throw new Error("Clé API Gemini manquante dans les variables d'environnement Render.");
        }

        let promptSysteme = "";

        if (isLabelScan) {
            // Mode HACCP (Étiquettes de traçabilité)
            promptSysteme = "MISSION HACCP : Lis cette etiquette. Extrais : nom, lot, dlc (DD/MM/YY). Réponds UNIQUEMENT en JSON pur : {\"nom\": \"...\", \"lot\": \"...\", \"dlc\": \"...\"}";
        } else {
            // Mode EXPERT ÉCONOMAT (Factures et Tickets)
            promptSysteme = `MISSION EXPERT ECONOMAT : Extraire tous les articles de cette facture. 
            RÈGLES CRITIQUES ET ABSOLUES :
            1. PIÈGES SÉMANTIQUES : Les articles contenant les mots 'Lapin', 'chocolat', 'ruban', ou toute confiserie/viennoiserie DOIVENT ALLER DANS 'divers'. Ne les classe JAMAIS dans 'proteine'.
            2. CATÉGORIES (5 OBLIGATOIRES) : 
               - proteine: Viandes, poissons, volailles, oeufs, charcuterie.
               - glucides: Pâtes, riz, pommes de terre, frites, gnocchis, féculents, pain, avoine.
               - garniture: Légumes verts, fruits, champignons, herbes fraîches.
               - cremerie: Lait, crème, beurre, fromages.
               - divers: Épices, sauces, confiserie, boissons, emballages, économat général.
            3. PRIX : Garde le prix total ligne par ligne.
            Format JSON strict attendu : {"total": 0.00, "proteine":[], "glucides":[], "garniture":[], "cremerie":[], "divers":[]}`;
        }

        const payload = {
            contents: [{ 
                parts: [
                    { text: promptSysteme }, 
                    { inline_data: { mime_type: mimeType || "image/jpeg", data: image } }
                ] 
            }],
            generation_config: { 
                response_mime_type: "application/json", 
                temperature: 0.1 
            }
        };

        const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + API_KEY, {
            method: "POST", 
            headers: { "Content-Type": "application/json" }, 
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error.message);
        }

        let rawText = data.candidates[0].content.parts[0].text;
        res.json({ resultat: JSON.parse(rawText) });

    } catch (error) {
        console.error("Erreur Moteur IA :", error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Serveur iChef démarré avec succès sur le port ${PORT}`);
});const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
// Limite augmentée pour autoriser l'envoi de grosses photos
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname))); 

// Base de données en mémoire pour la synchronisation (Grimoire, Staff, Ventes...)
let globalState = { activeOrders: {} };

// ==========================================
// 📡 ENDPOINTS DE SYNCHRONISATION
// ==========================================
app.get('/get-current-state', (req, res) => {
    res.json(globalState);
});

app.post('/update-order', (req, res) => {
    const { tableId, order } = req.body;
    if (order === null) {
        delete globalState.activeOrders[tableId];
    } else {
        globalState.activeOrders[tableId] = order;
    }
    res.json({ success: true });
});

// ==========================================
// 🤖 MOTEUR IA (ANALYSE FACTURES & HACCP)
// ==========================================
app.post('/analyse-ticket', async (req, res) => {
    try {
        const { image, mimeType, isLabelScan } = req.body;
        const API_KEY = process.env.GEMINI_API_KEY;

        if (!API_KEY) {
            throw new Error("Clé API Gemini manquante dans les variables d'environnement Render.");
        }

        let promptSysteme = "";

        if (isLabelScan) {
            // Mode HACCP (Étiquettes de traçabilité)
            promptSysteme = "MISSION HACCP : Lis cette etiquette. Extrais : nom, lot, dlc (DD/MM/YY). Réponds UNIQUEMENT en JSON pur : {\"nom\": \"...\", \"lot\": \"...\", \"dlc\": \"...\"}";
        } else {
            // Mode EXPERT ÉCONOMAT (Factures et Tickets)
            promptSysteme = `MISSION EXPERT ECONOMAT : Extraire tous les articles de cette facture. 
            RÈGLES CRITIQUES ET ABSOLUES :
            1. PIÈGES SÉMANTIQUES : Les articles contenant les mots 'Lapin', 'chocolat', 'ruban', ou toute confiserie/viennoiserie DOIVENT ALLER DANS 'divers'. Ne les classe JAMAIS dans 'proteine'.
            2. CATÉGORIES (5 OBLIGATOIRES) : 
               - proteine: Viandes, poissons, volailles, oeufs, charcuterie.
               - glucides: Pâtes, riz, pommes de terre, frites, gnocchis, féculents, pain, avoine.
               - garniture: Légumes verts, fruits, champignons, herbes fraîches.
               - cremerie: Lait, crème, beurre, fromages.
               - divers: Épices, sauces, confiserie, boissons, emballages, économat général.
            3. PRIX : Garde le prix total ligne par ligne.
            Format JSON strict attendu : {"total": 0.00, "proteine":[], "glucides":[], "garniture":[], "cremerie":[], "divers":[]}`;
        }

        const payload = {
            contents: [{ 
                parts: [
                    { text: promptSysteme }, 
                    { inline_data: { mime_type: mimeType || "image/jpeg", data: image } }
                ] 
            }],
            generation_config: { 
                response_mime_type: "application/json", 
                temperature: 0.1 
            }
        };

        const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + API_KEY, {
            method: "POST", 
            headers: { "Content-Type": "application/json" }, 
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error.message);
        }

        let rawText = data.candidates[0].content.parts[0].text;
        res.json({ resultat: JSON.parse(rawText) });

    } catch (error) {
        console.error("Erreur Moteur IA :", error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Serveur iChef démarré avec succès sur le port ${PORT}`);
});
