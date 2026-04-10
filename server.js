const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();

// 🟢 CONFIGURATION SÉCURITÉ (CORS Manuel pour éviter les erreurs de module)
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    next();
});

app.use(express.json());

const DB_FILE = path.join(__dirname, 'empire_db.json');

// Initialisation de la base de données
if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ activeOrders: {} }));
}

app.use(express.static(__dirname));

// Route pour récupérer l'état
app.get('/get-current-state', (req, res) => {
    fs.readFile(DB_FILE, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ error: "Erreur lecture" });
        try { res.json(JSON.parse(data)); } catch (e) { res.json({ activeOrders: {} }); }
    });
});

// Route pour mettre à jour
app.post('/update-order', (req, res) => {
    const { tableId, order } = req.body;
    fs.readFile(DB_FILE, 'utf8', (err, data) => {
        let db = { activeOrders: {} };
        if (!err && data) { try { db = JSON.parse(data); } catch (e) {} }
        if (order === null) delete db.activeOrders[tableId];
        else db.activeOrders[tableId] = order;
        fs.writeFile(DB_FILE, JSON.stringify(db, null, 2), (err) => {
            if (err) return res.status(500).send("Erreur");
            res.status(200).send("OK");
        });
    });
});

// 🟢 MOTEUR QR CODE ICHEF.CH (CONSERVÉ) 🟢
app.post('/api/woo-webhook', (req, res) => {
    const commande = req.body;
    if (!commande || !commande.id) return res.status(200).send("Ping");
    fs.readFile(DB_FILE, 'utf8', (err, data) => {
        let db = { activeOrders: {} };
        if (!err && data) { try { db = JSON.parse(data); } catch (e) {} }
        
        let tableCible = null;
        if (commande.meta_data) {
            let metaTable = commande.meta_data.find(m => m.key.toLowerCase().includes('table'));
            if (metaTable && metaTable.value) tableCible = metaTable.value.toString().trim().toUpperCase();
        }
        if (!tableCible && commande.customer_note) {
            let note = commande.customer_note.toUpperCase();
            let match = note.match(/(?:TABLE|T)\s*([0-9A-Z]+)/);
            if (match) tableCible = match[1];
        }
        if (tableCible && !isNaN(tableCible)) tableCible = "T" + tableCible;

        let formattedItems = commande.line_items ? commande.line_items.map((item, index) => {
            let nomLow = item.name.toLowerCase();
            let isDrink = ['biere', 'vin', 'eau', 'coca', 'jus', 'café', 'thé', 'boisson', 'cocktail'].some(mot => nomLow.includes(mot));
            return {
                id: Date.now() + index, itemId: Date.now() + index,
                n: item.name, p: parseFloat(item.price) || 0, qty: item.quantity || 1,
                dest: isDrink ? 'bar' : 'cuisine', course: isDrink ? 0 : 2,
                fired: false, done: false, savedToDB: true
            };
        }) : [];

        if (tableCible) {
            if (!db.activeOrders[tableCible]) {
                db.activeOrders[tableCible] = { status: "hold", time: new Date().toLocaleTimeString('fr-FR'), clientName: "Client QR", observations: `📱 QR ICHEF (#${commande.id})`, items: formattedItems };
            } else {
                db.activeOrders[tableCible].items.push(...formattedItems);
            }
        } else {
            db.activeOrders[`order_${commande.id}`] = { isWeb: true, id: commande.id, clientName: 'WEB ICHEF', status: "hold", items: formattedItems };
        }
        fs.writeFile(DB_FILE, JSON.stringify(db, null, 2), (err) => { res.status(200).send("OK"); });
    });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => { console.log(`🚀 Empire OS en ligne sur le port ${PORT}`); });
