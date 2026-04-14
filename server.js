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
        const { image, mimeType, isLabelScan } = req.body;
        const API_KEY = process.env.GEMINI_API_KEY;

        console.log(`📸 Image reçue ! Taille: ${image.length}. Mode: ${isLabelScan ? 'ÉTIQUETTE HACCP' : 'FACTURE ÉCONOMAT'}`);

        let promptSysteme = "";

        if (isLabelScan) {
            // 🏷️ L'ORDRE POUR LES ÉTIQUETTES HACCP
            promptSysteme = "MISSION HACCP : Lis cette etiquette alimentaire. Extrais les informations suivantes : 'nom' (Le nom du produit), 'lot' (Le numero de lot, souvent precede de L), 'dlc' (La Date Limite de Consommation ou DLUO au format DD/MM/YY). REGLE ABSOLUE : Reponds UNIQUEMENT par un objet JSON pur. Exemple attendu : {\"nom\": \"Saumon Fume\", \"lot\": \"L-12345\", \"dlc\": \"12/05/26\"}";
        } else {
            // 🧾 L'ORDRE POUR LES FACTURES
            promptSysteme = "MISSION OBLIGATOIRE : Extraire la TOTALITE des articles. LIS CHAQUE LIGNE ATTENTIVEMENT. Classe en 4 categories : proteine (viandes/poissons/charcuterie), garniture (legumes/fruits/herbes), cremerie (fromages/lait/beurre/oeufs), divers (sec/economat/boissons). REGLE 1: Reponds UNIQUEMENT par un JSON valide. REGLE 2: Extraire les VRAIES donnees, remplis les tableaux. Si pas de poids, mets '1 pce'. Format attendu : {\"total\": 84.86, \"proteine\": [{\"nom\": \"Poulet\", \"poids\": \"1.2kg\", \"prix\": 15.50}], \"garniture\": [], \"cremerie\": [], \"divers\": []}";
        }

        const payload = {
            contents: [{ parts: [{ text: promptSysteme }, { inline_data: { mime_type: mimeType || "image/jpeg", data: image } }] }],
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

        if (!response.ok) {
            console.error("❌ ERREUR GOOGLE :", data.error);
            throw new Error(data.error ? data.error.message : "Erreur API Google");
        }
        
        if (!data.candidates || !data.candidates[0]) {
            console.error("❌ CENSURE OU BLOCAGE IA :", data);
            throw new Error("L'IA a bloqué la lecture de l'image (Censure ou image illisible).");
        }

        let rawText = data.candidates[0].content.parts[0].text;
        
        // 🚨 MOUCHARD POUR SURVEILLER L'IA 🚨
        console.log("=============================");
        console.log("🤖 CE QUE L'IA A RÉPONDU :");
        console.log(rawText);
        console.log("=============================");

        rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();

        let aiResponse;
        try {
            aiResponse = JSON.parse(rawText);
        } catch (e) {
            console.error("❌ ERREUR FORMAT JSON :", rawText);
            throw new Error("L'IA a mal formatte la reponse. Relance le scan.");
        }

        res.json({ resultat: aiResponse });

    } catch (error) {
        console.error("Erreur backend:", error);
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("Serveur demarre sur le port " + PORT));
