const express = require('express');
const fs = require('fs').promises; // Utilisation des promesses pour éviter le callback hell
const path = require('path');
const cors = require('cors');

const app = express();
const DB_FILE = path.join(__dirname, 'empire_db.json');

// 🟢 CONFIGURATION PROFESSIONNELLE
app.use(cors()); // Plus propre et sécurisé que le header manuel
app.use(express.json());
app.use(express.static(__dirname));

// Utilitaire pour lire/écrire de manière atomique (minimise les risques)
async function getDb() {
    try {
        const data = await fs.readFile(DB_FILE, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        return { activeOrders: {} };
    }
}

async function saveDb(db) {
    try {
        await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error("Erreur lors de l'écriture dans le fichier DB:", error);
        throw error;
    }
}

// 🔵 ROUTES
app.get('/get-current-state', async (req, res) => {
    const db = await getDb();
    res.json(db);
});

app.post('/update-order', async (req, res) => {
    try {
        const { tableId, order } = req.body;
        const db = await getDb();
        
        if (order === null) delete db.activeOrders[tableId];
        else db.activeOrders[tableId] = order;
        
        await saveDb(db);
        res.status(200).send("OK");
    } catch (err) {
        res.status(500).send("Erreur Serveur");
    }
});

// 🔴 MOTEUR WEBHOOK (WooCommerce / ICHEF.CH)
app.post('/api/woo-webhook', async (req, res) => {
    const commande = req.body;
    if (!commande || !commande.id) return res.status(200).send("Ping");

    try {
        const db = await getDb();
        let tableCible = null;

        // Extraction de la table
        if (commande.meta_data) {
            let metaTable = commande.meta_data.find(m => m.key.toLowerCase().includes('table'));
            if (metaTable?.value) tableCible = metaTable.value.toString().trim().toUpperCase();
        }
        
        if (!tableCible && commande.customer_note) {
            let match = commande.customer_note.toUpperCase().match(/(?:TABLE|T)\s*([0-9A-Z]+)/);
            if (match) tableCible = match[1];
        }

        if (tableCible && !isNaN(tableCible)) tableCible = "T" + tableCible;

        // Formatage des items
        const formattedItems = (commande.line_items || []).map((item, index) => {
            const nomLow = item.name.toLowerCase();
            const drinks = ['biere', 'bière', 'vin', 'eau', 'coca', 'jus', 'café', 'cafe', 'thé', 'boisson', 'cocktail', 'spritz'];
            const isDrink = drinks.some(mot => nomLow.includes(mot));

            return {
                id: `${commande.id}-${index}-${Date.now()}`, // ID plus robuste
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
            if (!db.activeOrders[tableCible]) {
                db.activeOrders[tableCible] = { 
                    status: "hold", 
                    time: new Date().toLocaleTimeString('fr-FR'), 
                    clientName: "Client QR", 
                    observations: `📱 QR ICHEF (#${commande.id})`, 
                    items: formattedItems 
                };
            } else {
                db.activeOrders[tableCible].items.push(...formattedItems);
            }
        } else {
            db.activeOrders[`order_${commande.id}`] = { 
                isWeb: true, 
                id: commande.id, 
                clientName: 'WEB ICHEF', 
                status: "hold", 
                items: formattedItems 
            };
        }

        await saveDb(db);
        res.status(200).send("OK");
    } catch (err) {
        console.error("Erreur Webhook:", err);
        res.status(500).send("Erreur Interne");
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => { 
    console.log(`🚀 Empire OS opérationnel | Port ${PORT}`); 
});
