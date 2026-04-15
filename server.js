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
// 🛒 WEBHOOK WOOCOMMERCE (LE PONT DE COMMANDEMENT)
// ==========================================
app.post('/woo-webhook', (req, res) => {
    const order = req.body;
    
    // Sécurité de base
    if (!order || !order.id) return res.status(400).send("Payload invalide");

    // 1. Détection de la Table
    // On cherche dans les notes de commande ("customer_note") ou les meta_data
    let tableNum = "WEB_" + order.id; 
    if (order.customer_note) {
        let match = order.customer_note.match(/table\s*(\d+)/i);
        if (match) tableNum = match[1];
    }
    if (order.meta_data) {
        let tableMeta = order.meta_data.find(m => m.key.toLowerCase().includes('table'));
        if (tableMeta) tableNum = tableMeta.value;
    }

    // 2. Création du Ticket dans ton ERP
    if (!globalState.activeOrders[tableNum]) {
        globalState.activeOrders[tableNum] = {
            status: 'cooking',
            time: new Date().toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'}),
            clientName: (order.billing?.first_name || 'Client') + ' (WooCommerce)',
            observations: order.customer_note || 'Commande Web',
            items: [],
            isWeb: true,
            totalStr: order.total + " €",
            id: order.id
        };
    }

    // 3. Le Moteur de Routage (Cuisine vs Bar)
    // WooCommerce n'envoie pas toujours les catégories, on utilise une détection sémantique
    const motsBar = ['vin', 'bière', 'biere', 'cocktail', 'eau', 'coca', 'jus', 'café', 'cafe', 'mojito', 'verre', 'bouteille', 'rhum', 'vodka', 'boisson'];
    
    order.line_items.forEach(item => {
        let nomItem = item.name.toLowerCase();
        let dest = 'cuisine'; // Par défaut, on envoie en cuisine
        let course = 2; // Plat principal par défaut

        // Routage Bar
        if (motsBar.some(mot => nomItem.includes(mot))) {
            dest = 'bar';
            course = 0; // Boisson
        } 
        // Routage Desserts
        else if (nomItem.includes('dessert') || nomItem.includes('glace') || nomItem.includes('chocolat') || nomItem.includes('tiramisu')) {
            course = 3; 
        } 
        // Routage Entrées
        else if (nomItem.includes('entrée') || nomItem.includes('salade')) {
            course = 1; 
        }

        globalState.activeOrders[tableNum].items.push({
            id: Date.now() + Math.random(),
            itemId: Date.now(),
            n: item.name,
            p: parseFloat(item.price),
            qty: item.quantity,
            done: false,
            dest: dest,
            fired: true, // Part instantanément sur les écrans
            firedTime: Date.now(),
            savedToDB: true,
            course: course,
            seat: 0
        });
    });

    console.log(`🚀 Commande WooCommerce #${order.id} validée pour la table ${tableNum}`);
    res.status(200).send("Commande intégrée à l'Empire");
});

// ==========================================
// 🤖 MOTEUR IA (FACTURES)
// ==========================================
app.post('/analyse-ticket', async (req, res) => {
    try {
        const { image, mimeType, isLabelScan } = req.body;
        const API_KEY = process.env.GEMINI_API_KEY;

        if (!API_KEY) throw new Error("Clé API manquante");

        let promptSysteme = isLabelScan 
            ? "MISSION HACCP : Lis cette etiquette. Extrais : nom, lot, dlc (DD/MM/YY). JSON: {\"nom\": \"...\", \"lot\": \"...\", \"dlc\": \"...\"}"
            : `MISSION EXPERT ECONOMAT : Extraire tous les articles de cette facture. 
            RÈGLES CRITIQUES :
            1. IDENTIFICATION : Extraire le nom du 'fournisseur' et la 'date' de la facture (format DD/MM/YYYY).
            2. PIÈGES : Confiserie = 'economat'. JAMAIS 'proteines'.
            3. 6 CATÉGORIES : feculents, proteines, bof, sauces, legumes, economat.
            4. PRIX UNITAIRE : Si lot, ajoute le prix unitaire au nom (ex: "Oeufs (0.21€/pce)").

            FORMAT JSON STRICT :
            {
              "fournisseur": "NOM",
              "date": "DD/MM/YYYY",
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
        rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        
        res.json({ resultat: JSON.parse(rawText) });

    } catch (error) {
        console.error("Erreur Moteur IA :", error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => console.log(`🚀 Serveur Empire OS démarré sur le port ${PORT}`));
