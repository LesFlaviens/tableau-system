const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(__dirname));

const DB_FILE = path.join(__dirname, 'database.json');

// --- RÉCUPÉRATION DE L'ÉTAT ACTUEL ---
app.get('/get-current-state', (req, res) => {
    fs.readFile(DB_FILE, 'utf8', (err, data) => {
        if (err) return res.json({ activeOrders: {} });
        try {
            res.json(JSON.parse(data || '{"activeOrders": {}}'));
        } catch (e) {
            res.json({ activeOrders: {} });
        }
    });
});

// --- RÉCEPTION DES COMMANDES WOOCOMMERCE (LE PONT) ---
app.post('/api/woo-webhook', (req, res) => {
    const commande = req.body;
    const orderId = `order_${commande.id}`;

    fs.readFile(DB_FILE, 'utf8', (err, data) => {
        let db = { activeOrders: {} };
        if (!err && data) {
            try { db = JSON.parse(data); } catch (e) {}
        }

        db.activeOrders[orderId] = {
            id: commande.id,
            client: `${commande.billing.first_name} ${commande.billing.last_name}`,
            total: `${commande.total} ${commande.currency}`,
            items: commande.line_items.map(item => item.name).join(', '),
            status: "Nouveau"
        };

        fs.writeFile(DB_FILE, JSON.stringify(db, null, 2), (err) => {
            if (err) return res.status(500).send("Erreur d'écriture");
            console.log(`🔥 Commande #${commande.id} reçue et enregistrée.`);
            res.status(200).send("OK");
        });
    });
});

// --- MISE À JOUR MANUELLE ---
app.post('/update-order', (req, res) => {
    const { tableId, order } = req.body;
    fs.readFile(DB_FILE, 'utf8', (err, data) => {
        let db = { activeOrders: {} };
        if (!err && data) {
            try { db = JSON.parse(data); } catch (e) {}
        }

        if (order === null) delete db.activeOrders[tableId];
        else db.activeOrders[tableId] = order;

        fs.writeFile(DB_FILE, JSON.stringify(db, null, 2), (err) => {
            if (err) return res.status(500).send("Erreur");
            res.send("OK");
        });
    });
});

app.listen(port, () => console.log(`Empire Actif sur ${port}`));
