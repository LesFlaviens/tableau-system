const express = require('express');
const cors = require('cors');
const path = require('path');

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
            : `MISSION EXPERT ECONOMAT : Extraire tous les articles. 
            RÈGLES CRITIQUES :
            1. PIÈGES : 'Lapin chocolat', 'Lapin ruban' ou confiseries = 'divers'. JAMAIS 'proteine'.
            2. 5 CATÉGORIES OBLIGATOIRES : proteine, glucides, garniture, cremerie, divers.
            
            FORMAT JSON STRICT : Tu DOIS utiliser EXACTEMENT les clés "nom", "prix", et "poids" pour chaque article.
            Exemple attendu :
            {
              "total": 0.00, 
              "proteine": [{"nom": "Steak haché", "prix": 15.50, "poids": "1kg"}], 
              "glucides": [{"nom": "Pâtes", "prix": 2.00, "poids": "500g"}], 
              "garniture": [], 
              "cremerie": [], 
              "divers": [{"nom": "Lapin ruban", "prix": 3.98, "poids": "2pce"}]
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
