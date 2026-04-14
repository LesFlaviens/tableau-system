const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const DB_FILE = path.join(__dirname, 'empire_db.json');

app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    if (req.method === "OPTIONS") return res.status(200).end();
    next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.static(__dirname));

let memoryDB = { activeOrders: {} };
if (fs.existsSync(DB_FILE)) {
    try { memoryDB = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch (e) { memoryDB = { activeOrders: {} }; }
}

function persistDB() { fs.writeFileSync(DB_FILE, JSON.stringify(memoryDB, null, 2), 'utf8'); }

app.get('/get-current-state', (req, res) => res.json(memoryDB));
app.post('/update-order', (req, res) => {
    const { tableId, order } = req.body;
    if (!tableId) return res.status(400).send("ID manquant");
    if (order === null) delete memoryDB.activeOrders[tableId];
    else memoryDB.activeOrders[tableId] = order;
    persistDB();
    res.status(200).send("OK");
});

// 🤖 MOTEUR IA GEMINI - 4 COLONNES COMPTABLES
app.post("/analyse-ticket", async (req, res) => {
    try {
        const { image, mimeType } = req.body;
        const API_KEY = process.env.GEMINI_API_KEY;
        
        const promptSysteme = `Tu es un expert en gestion de stocks cuisine. Analyse ce ticket.
        Extrais les articles et classe-les dans ces 4 catégories STRICTES :
        1. proteine : Toutes les viandes, charcuteries, poissons et crustacés.
        2. garniture : Tous les légumes frais, fruits frais et herbes.
        3. cremerie : Fromages, œufs, lait, crème, beurre.
        4. divers : Économat, épicerie sèche, huiles, épices, produits d'entretien.

        Réponds UNIQUEMENT en JSON pur avec ce format exact :
        {
          "total": 0.00,
          "proteine": [{"nom": "...", "poids": "...", "prix": 0.00}],
          "garniture": [{"nom": "...", "poids": "...", "prix": 0.00}],
          "cremerie": [{"nom": "...", "poids": "...", "prix": 0.00}],
          "divers": [{"nom": "...", "poids": "...", "prix": 0.00}]
        }`;

        const payload = {
            contents: [{ parts: [{ text: promptSysteme }, { inline_data: { mime_type: mimeType || "image/jpeg", data: image } }] }],
            generation_config: { response_mime_type: "application/json" }
        };

        const aiRes = await fetch(\`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=\${API_KEY}\`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const data = await aiRes.json();
        if (!aiRes.ok) throw new Error(data.error?.message || "Erreur Google");

        const aiResponse = JSON.parse(data.candidates[0].content.parts[0].text);
        res.json({ resultat: aiResponse });

    } catch (error) {
        console.error("Erreur IA:", error);
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(\`🚀 Empire OS en ligne sur le port \${PORT}\`));
