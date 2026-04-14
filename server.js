const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const DB_FILE = path.join(__dirname, 'empire_db.json');

// 🟢 SÉCURITÉ NATIVE ABSOLUE (CORS Custom)
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    
    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }
    next();
});

// Limite augmentée à 50mb pour laisser passer les photos
app.use(express.json({ limit: '50mb' }));
app.use(express.static(__dirname));

// 🧠 BASE DE DONNÉES EN MÉMOIRE VIVE
let memoryDB = { activeOrders: {} };

if (fs.existsSync(DB_FILE)) {
    try {
        const data = fs.readFileSync(DB_FILE, 'utf8');
        memoryDB = JSON.parse(data);
        if (!memoryDB.activeOrders) memoryDB.activeOrders = {};
    } catch (e) {
        console.log("Démarrage à zéro de la mémoire.");
    }
}

function persistDB() {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(memoryDB, null, 2), 'utf8');
    } catch (e) {
        console.error("Erreur de sauvegarde", e);
    }
}

// 🔵 ROUTES SÉCURISÉES
app.get('/get-current-state', (req, res) => {
    res.json(memoryDB);
});

app.post('/update-order', (req, res) => {
    try {
        const { tableId, order } = req.body;
        if (!tableId) return res.status(400).send("ID manquant");

        if (order === null) delete memoryDB.activeOrders[tableId];
        else memoryDB.activeOrders[tableId] = order;
        
        persistDB();
        res.status(200).send("OK");
    } catch (err) {
        res.status(500).send("Erreur");
    }
});

// 🔴 MOTEUR WEBHOOK
app.post('/api/woo-webhook', (req, res) => {
    const commande = req.body;
    if (!commande || !commande.id) return res.status(200).send("Ping");

    try {
        let tableCible = null;

        if (commande.meta_data) {
            let metaTable = commande.meta_data.find(m => m.key.toLowerCase().includes('table'));
            if (metaTable && metaTable.value) tableCible = metaTable.value.toString().trim().toUpperCase();
        }
        
        if (!tableCible && commande.customer_note) {
            let match = commande.customer_note.toUpperCase().match(/(?:TABLE|T)\s*([0-9A-Z]+)/);
            if (match) tableCible = match[1];
        }

        if (tableCible && !isNaN(tableCible)) tableCible = "T" + tableCible;

        const formattedItems = (commande.line_items || []).map((item, index) => {
            const nomLow = item.name.toLowerCase();
            const drinks = ['biere', 'bière', 'vin', 'eau', 'coca', 'jus', 'café', 'cafe', 'thé', 'boisson', 'cocktail', 'spritz', 'verre', 'bouteille'];
            const isDrink = drinks.some(mot => nomLow.includes(mot));

            return {
                id: `${commande.id}-${index}-${Date.now()}`,
                n: item.name,
                p: parseFloat(item.price) || 0,
                qty: item.quantity || 1,
                dest: isDrink ? 'bar' : 'cuisine',
                course: isDrink ? 0 : 2,
                fired: false,
                done: false,
                savedToDB: true
            };
        });

        if (tableCible) {
            if (!memoryDB.activeOrders[tableCible]) {
                memoryDB.activeOrders[tableCible] = { 
                    status: "hold", 
                    time: new Date().toLocaleTimeString('fr-FR'), 
                    clientName: "Client QR", 
                    observations: `📱 QR ICHEF (#${commande.id})`, 
                    items: formattedItems 
                };
            } else {
                memoryDB.activeOrders[tableCible].items.push(...formattedItems);
            }
        } else {
            memoryDB.activeOrders[`order_${commande.id}`] = { 
                isWeb: true, 
                id: commande.id, 
                clientName: 'WEB ICHEF', 
                status: "hold", 
                items: formattedItems 
            };
        }

        persistDB();
        res.status(200).send("OK");
    } catch (err) {
        res.status(500).send("Erreur");
    }
});

// 🤖 MOTEUR IA GEMINI (Version 4 Colonnes Spécifiques)
app.post("/analyse-ticket", async (req, res) => {
    try {
        const { image, mimeType } = req.body;
        if (!image) return res.status(400).json({ error: "Aucune image reçue." });

        const API_KEY = process.env.GEMINI_API_KEY;
        
        const promptSysteme = `Tu es un expert en gestion de stocks cuisine. Analyse ce ticket.
        Extrais les articles et classe-les dans ces 4 catégories STRICTES :
        1. proteine : Toutes les viandes, charcuteries, poissons et crustacés.
        2. garniture : Tous les légumes frais, fruits frais et herbes.
        3. cremerie : Fromages, œufs, lait, crème, beurre.
        4. divers : Économat, épicerie sèche, huiles, épices, produits d'entretien, emballages.

        Réponds UNIQUEMENT en JSON pur avec ce format :
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

        const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const data = await aiRes.json();
        let rawText = data.candidates[0].content.parts[0].text;
        rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        res.json({ resultat: JSON.parse(rawText) });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
        const payload = {
            contents: [{
                parts: [
                    { text: promptSysteme },
                    { inline_data: { mime_type: mimeType || "image/jpeg", data: image } }
                ]
            }],
            generation_config: { response_mime_type: "application/json" }
        };

        const aiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            }
        );

        const data = await aiRes.json();
        
        if (!aiRes.ok) {
            throw new Error(data.error ? data.error.message : "Refus des serveurs Google");
        }

        let rawText = data.candidates[0].content.parts[0].text;
        rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        
        const aiResponse = JSON.parse(rawText);
        res.json({ resultat: aiResponse });

    } catch (error) {
        console.error("Erreur Moteur IA:", error);
        res.status(500).json({ error: error.message });
    }
});

// 🚀 ALLUMAGE DU SYSTÈME
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => { 
    console.log(`🚀 Empire OS en ligne sur le port ${PORT}`); 
});
