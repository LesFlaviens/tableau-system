const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname))); 

let globalState = { activeOrders: {} };

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

        if (!API_KEY) throw new Error("Clé API manquante");

        let promptSysteme = isLabelScan 
            ? "MISSION HACCP : Lis cette etiquette. Extrais : nom, lot, dlc (DD/MM/YY). JSON: {\"nom\": \"...\", \"lot\": \"...\", \"dlc\": \"...\"}"
            : `MISSION EXPERT ECONOMAT : Extraire tous les articles de cette facture. 
            RÈGLES CRITIQUES ET ABSOLUES :
            1. PIÈGES SÉMANTIQUES : 'Lapin chocolat', 'Lapin ruban' ou toute confiserie = 'economat'. JAMAIS 'proteines'.
            2. 6 CATÉGORIES OBLIGATOIRES : 
               - feculents: Pâtes, pommes de terre, quinoa, riz.
               - proteines: Viandes (entrecôte, poulet, veau, porc), poissons, charcuterie.
               - bof: B.O.F (Beurre, Oeufs, Fromages), lait, crème.
               - sauces: Sauces, bases de sauces, vins de cuisson, bouillons (légume, jus de veau, jus volaille, animaux).
               - legumes: Légumes frais (carotte, choux, etc.), fruits.
               - economat: Farine, sucre, sel, poivre, épices, confiserie, vins de table, emballages, divers.
            3. CALCULS À L'UNITÉ : Analyse les quantités dans les noms (ex: "x20", "3 fruits") ET la colonne Qté. 
               - Si c'est un lot, calcule IMPÉRATIVEMENT le prix unitaire et ajoute-le au nom (ex: "Oeufs cage (0.21€/pce)").
               - Le champ "prix" doit être le prix TOTAL de la ligne.
               - Le champ "poids" doit être la quantité totale.
            
            FORMAT JSON STRICT :
            {
              "total": 0.00, 
              "feculents": [], "proteines": [], "bof": [], "sauces": [], "legumes": [], "economat": []
            }`;

        const payload = {
            contents: [{ parts: [{ text: promptSysteme }, { inline_data: { mime_type: mimeType || "image/jpeg", data: image } }] }],
            generation_config: { response_mime_type: "application/json", temperature: 0.1 }
        };

        const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + API_KEY, {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error.message);

        let rawText = data.candidates[0].content.parts[0].text;
        res.json({ resultat: JSON.parse(rawText) });

    } catch (error) {
        console.error("Erreur Moteur IA :", error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => console.log(`🚀 Serveur iChef démarré sur le port ${PORT}`));
