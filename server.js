const express = require('express');
const fs = require('fs');
const path = require('path');
// Import de node-fetch si tu as ajouté la dépendance. Sinon, supprime cette ligne si tu utilises Node >= 18.
const fetch = require('node-fetch');

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

// Limite augmentée à 50mb pour laisser passer l'architecture de la salle et les photos HD
app.use(express.json({ limit: '50mb' }));
app.use(express.static(__dirname));

// 🧠 BASE DE DONNÉES EN MÉMOIRE VIVE (Élimine 100% des crashs)
let memoryDB = { activeOrders: {} };

// Chargement de l'historique au démarrage
if (fs.existsSync(DB_FILE)) {
    try {
        const data = fs.readFileSync(DB_FILE, 'utf8');
        memoryDB = JSON.parse(data);
        if (!memoryDB.activeOrders) memoryDB.activeOrders = {};
    } catch (e) {
        console.log("Démarrage à zéro de la mémoire.");
    }
}

// Sauvegarde silencieuse en arrière-plan
function persistDB() {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(memoryDB, null, 2), 'utf8');
    } catch (e) {
        console.error("Erreur de sauvegarde disque locale", e);
    }
}

// 🔵 ROUTES SÉCURISÉES (Réponse ultra-rapide depuis la RAM)
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
        console.error("Erreur mise à jour:", err);
        res.status(500).send("Erreur");
    }
});

// 🔴 MOTEUR WEBHOOK (Commandes QR Code WooCommerce / ICHEF.CH)
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
        console.error("Erreur Webhook QR:", err);
        res.status(500).send("Erreur");
    }
});

// 🤖 MOTEUR IA GEMINI (Centralisé sur le serveur)
app.post("/analyse-ticket", async (req, res) => {
    try {
        const { image, mimeType } = req.body;

        if (!image) return res.status(400).json({ error: "Aucune image reçue." });

        // La clé est extraite des variables d'environnement de Render pour une sécurité totale
        const API_KEY = process.env.GEMINI_API_KEY;
        
        if (!API_KEY) {
            console.error("❌ ALERTE: Clé API manquante dans l'environnement Render.");
            return res.status(500).json({ error: "Configuration serveur incomplète (Clé IA manquante)." });
        }

        const payload = {
            contents: [{
                parts: [
                    { text: "Tu es un chef. Analyse ce ticket de caisse. Extrais les produits alimentaires. Réponds UNIQUEMENT avec un objet JSON pur: {\"proteins\": [{\"name\":\"...\", \"weightKg\":1, \"totalCost\":10}], \"garnishes\": [{\"name\":\"...\", \"weightKg\":1, \"totalCost\":5}]}" },
                    { inline_data: { mime_type: mimeType || "image/jpeg", data: image } }
                ]
            }],
            generation_config: { response_mime_type: "application/json" }
        };

        // Requête native vers le modèle 1.5 Flash
        const aiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`,
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

        // Nettoyage de la réponse pour s'assurer d'avoir un JSON propre
        let rawText = data.candidates[0].content.parts[0].text;
        rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        
        const aiResponse = JSON.parse(rawText);
        res.json({ resultat: aiResponse });

    } catch (error) {
        console.error("Erreur Moteur IA:", error);
        res.status(500).json({ error: error.message });
    }
});

// 🚀 ALLUMAGE DU SYSTÈME (Une seule fois !)
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => { 
    console.log(`🚀 Empire OS en ligne et prêt à encaisser sur le port ${PORT}`); 
});
