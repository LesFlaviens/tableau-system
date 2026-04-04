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

// --- RÉCEPTION DES COMMANDES WOOCOMMERCE (LE ROUTEUR INTELLIGENT) ---
app.post('/api/woo-webhook', (req, res) => {
    const commande = req.body;
    const orderId = `WEB_${commande.id}`; // On utilise 'WEB_' pour identifier les flux internet

    fs.readFile(DB_FILE, 'utf8', (err, data) => {
        let db = { activeOrders: {} };
        if (!err && data) {
            try { db = JSON.parse(data); } catch (e) {}
        }

        // Le Cerveau : Tri automatique Cuisine ou Bar
        let formattedItems = commande.line_items.map((item, index) => {
            let nomLow = item.name.toLowerCase();
            
            // Mots-clés pour envoyer la ligne sur l'écran du BAR
            let isDrink = ['bière', 'biere', 'vin', 'champagne', 'cocktail', 'eau', 'coca', 'jus', 'café', 'cafe', 'thé', 'the', 'boisson', 'verre', 'bouteille'].some(mot => nomLow.includes(mot));
            
            let dest = isDrink ? 'bar' : 'cuisine';
            
            // Catégorisation pour l'affichage
            let courseId = isDrink ? 0 : 2; // 0 = Boisson, 2 = Plat
            if(!isDrink && ['dessert', 'glace', 'gâteau', 'gateau', 'chocolat', 'tarte', 'sucre'].some(m => nomLow.includes(m))) courseId = 3;

            return {
                id: Date.now() + index,
                itemId: Date.now() + index,
                n: item.name,
                p: parseFloat(item.price) || 0,
                qty: item.quantity || 1,
                dest: dest,          // <--- LE TRI OPÈRE ICI (Bar ou Cuisine)
                course: courseId,
                fired: true,         // <--- DÉCLENCHE L'APPARITION SUR LES ÉCRANS
                done: false,
                savedToDB: true,
                isOffered: false
            };
        });

        // On enregistre la commande web avec le MÊME format qu'une table physique
        db.activeOrders[orderId] = {
            isWeb: true, 
            id: commande.id,
            clientName: `${commande.billing.first_name} ${commande.billing.last_name}`,
            totalStr: `${commande.total} ${commande.currency}`,
            time: new Date().toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'}),
            status: "pending", 
            observations: `🛒 COMMANDE INTERNET (${commande.total} ${commande.currency})`,
            items: formattedItems
        };

        fs.writeFile(DB_FILE, JSON.stringify(db, null, 2), (err) => {
            if (err) return res.status(500).send("Erreur d'écriture");
            console.log(`🔥 Commande WEB #${commande.id} routée (Cuisine/Bar).`);
            res.status(200).send("OK");
        });
    });
});

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
