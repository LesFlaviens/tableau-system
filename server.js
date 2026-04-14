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
        
        // LE NOUVEAU CERVEAU : Ordres militaires pour empêcher l'IA d'être paresseuse
        const promptSysteme = `Tu es un chef exécutif et un auditeur financier intraitable. 
TA MISSION OBLIGATOIRE : Extraire la TOTALITÉ des articles présents sur cette facture. LIS CHAQUE LIGNE ATTENTIVEMENT.
Classe chaque article trouvé dans l'une de ces 4 catégories :
1. proteine : Viandes, poissons, fruits de mer, charcuterie.
2. garniture : Légumes frais, fruits frais, herbes.
3. cremerie : Fromages, lait, beurre, crème, oeufs.
4. divers : Épicerie sèche, épices, huiles, conserves, emballages.

RÈGLE ABSOLUE : Tu dois répondre UNIQUEMENT par un objet JSON valide. REMPLIS LES TABLEAUX avec les vraies données lues sur l'image (ne me renvoie pas de tableaux vides). Si tu ne trouves pas le poids, mets "1pce".

Modèle attendu :
{
  "total": 84.86,
  "proteine": [{"nom": "Poulet fermier", "poids": "1.2kg", "prix": 15.50}],
  "garniture": [{"nom": "Courgette Espagne", "poids": "1.1kg", "prix": 3.42}],
  "cremerie": [{"nom": "Beurre doux", "poids": "250g", "prix": 3.00}],
  "divers": [{"nom": "Matcha Latte", "poids": "0.17kg", "prix": 5.99}]
}`;

        const payload = {
            contents: [{ parts: [{ text: promptSysteme }, { inline_data: { mime_type: mimeType || "image/jpeg", data: image } }] }],
            generation_config: { response_mime_type: "application/json" }
        };

        const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + API_KEY, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        
        if (!response.ok) throw new Error(data.error ? data.error.message : "Erreur API Google");
        if (!data.candidates || !data.candidates[0]) throw new Error("L'IA n'a pas pu lire l'image.");

        let rawText = data.candidates[0].content.parts[0].text;
        rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        
        res.json({ resultat: JSON.parse(rawText) });

    } catch (error) {
        console.error("Erreur backend:", error);
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log('Serveur pret sur ' + PORT));
