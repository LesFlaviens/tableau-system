const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Fichier de base de données local (simulé)
const DB_FILE = path.join(__dirname, 'empire_db.json');

// Initialiser la DB si elle n'existe pas
if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ activeOrders: {} }));
}

// Servir les fichiers statiques (tes pages HTML)
app.use(express.static(__dirname));

// --- RÉCUPÉRER L'ÉTAT DU RESTAURANT ---
app.get('/get-current-state', (req, res) => {
    fs.readFile(DB_FILE, 'utf8', (err, data) => {
        if (err) return res.status(500).send("Erreur de lecture de la base de données.");
        res.json(JSON.parse(data));
    });
});

// --- METTRE À JOUR UNE TABLE ---
app.post('/update-order', (req, res) => {
    const { tableId, order } = req.body;
    
    fs.readFile(DB_FILE, 'utf8', (err, data) => {
        let db = { activeOrders: {} };
        if (!err && data) {
            try { db = JSON.parse(data); } catch (e) {}
        }
        
        if (order === null) {
            delete db.activeOrders[tableId];
        } else {
            db.activeOrders[tableId] = order;
        }

        fs.writeFile(DB_FILE, JSON.stringify(db, null, 2), (err) => {
            if (err) return res.status(500).send("Erreur d'écriture");
            res.status(200).send("Mis à jour");
        });
    });
});

// --- RÉCEPTION DES COMMANDES WOOCOMMERCE (LE ROUTEUR INTELLIGENT) ---
app.post('/api/woo-webhook', (req, res) => {
    const commande = req.body;
    
    // Sécurité si WooCommerce envoie un ping vide
    if (!commande || !commande.id) {
        return res.status(200).send("Ping reçu");
    }

    const orderId = `order_${commande.id}`; // Identifiant unique WEB

    fs.readFile(DB_FILE, 'utf8', (err, data) => {
        let db = { activeOrders: {} };
        if (!err && data) {
            try { db = JSON.parse(data); } catch (e) {}
        }

        // Le Cerveau : Tri automatique Cuisine ou Bar
        let formattedItems = [];
        if (commande.line_items && commande.line_items.length > 0) {
            formattedItems = commande.line_items.map((item, index) => {
                let nomLow = item.name.toLowerCase();
                
                // Mots-clés pour le BAR
                let isDrink = ['bière', 'biere', 'vin', 'champagne', 'cocktail', 'eau', 'coca', 'jus', 'café', 'cafe', 'thé', 'the', 'boisson', 'verre', 'bouteille'].some(mot => nomLow.includes(mot));
                
                let dest = isDrink ? 'bar' : 'cuisine';
                
                // Catégories (0=Boissons, 1=Entrées, 2=Plats, 3=Desserts)
                let courseId = isDrink ? 0 : 2; 
                if(!isDrink && ['dessert', 'glace', 'gâteau', 'gateau', 'chocolat', 'tarte', 'sucre'].some(m => nomLow.includes(m))) courseId = 3;

                return {
                    id: Date.now() + index,
                    itemId: Date.now() + index,
                    n: item.name,
                    p: parseFloat(item.price) || 0,
                    qty: item.quantity || 1,
                    dest: dest,          // Envoi auto au Bar ou Cuisine
                    course: courseId,
                    fired: true,         // Déclenche l'affichage direct sur les écrans
                    done: false,
                    savedToDB: true,
                    isOffered: false
                };
            });
        }

        // Création de la table virtuelle WEB
        db.activeOrders[orderId] = {
            isWeb: true, 
            id: commande.id,
            clientName: commande.billing ? `${commande.billing.first_name} ${commande.billing.last_name}` : 'Client Web',
            totalStr: `${commande.total} ${commande.currency}`,
            time: new Date().toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'}),
            status: "pending", 
            observations: `🛒 COMMANDE WEB #${commande.id}`,
            items: formattedItems
        };

        fs.writeFile(DB_FILE, JSON.stringify(db, null, 2), (err) => {
            if (err) return res.status(500).send("Erreur d'écriture");
            console.log(`🔥 Commande WEB #${commande.id} routée avec succès.`);
            res.status(200).send("OK");
        });
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Cerveau Empire OS démarré sur le port ${PORT}`);
});
