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

app.post("/analyse-ticket", async (req, res) => {
    try {
        const { image, mimeType } = req.body;
        const API_KEY = process.env.GEMINI_API_KEY;
        
        const promptSysteme = "Tu es un chef. Analyse ce ticket. Classe en 4 catégories JSON pur : 'proteine' (viandes/poissons), 'garniture' (legumes/fruits), 'cremerie' (laitage/oeufs), 'divers' (sec/economat). Format: {total:0, proteine:[{nom:'',poids:'',prix:0}], garniture:[], cremerie:[], divers:[]}";

        const payload = {
            contents: [{ parts: [{ text: promptSysteme }, { inline_data: { mime_type: mimeType || "image/jpeg", data: image } }] }],
            generation_config: { response_mime_type: "application/json" }
        };

   const aiRes = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + API_KEY, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const data = await aiRes.json();
        const aiResponse = JSON.parse(data.candidates[0].content.parts[0].text);
        res.json({ resultat: aiResponse });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log('Serveur pret sur ' + PORT));
