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

// --- RÉCEPTION DES COMMANDES WOOCOMMERCE (LE ROUTEUR INTELLIGENT + QR CODE) ---
app.post('/api/woo-webhook', (req, res) => {
    const commande = req.body;
    
    // Sécurité si WooCommerce envoie un ping vide
    if (!commande || !commande.id) {
        return res.status(200).send("Ping reçu");
    }

    fs.readFile(DB_FILE, 'utf8', (err, data) => {
        let db = { activeOrders: {} };
        if (!err && data) {
            try { db = JSON.parse(data); } catch (e) {}
        }

        // 1. CHERCHE LE NUMÉRO DE TABLE (SCAN QR CODE)
        let tableCible = null;
        
        // A. Chercher dans les Meta Data (plugins de QR Code WooCommerce)
        if (commande.meta_data) {
            let metaTable = commande.meta_data.find(m => m.key.toLowerCase().includes('table'));
            if (metaTable && metaTable.value) tableCible = metaTable.value.toString().trim().toUpperCase();
        }
        
        // B. Chercher dans les notes de commande (Si le client l'écrit)
        if (!tableCible && commande.customer_note) {
            let note = commande.customer_note.toUpperCase();
            // Cherche "TABLE 2" ou "T2"
            let match = note.match(/(?:TABLE|T)\s*([0-9A-Z]+)/);
            if (match) tableCible = match[1];
        }

        // C. Normalisation (si le système trouve "2", on le transforme en "T2" pour correspondre au Pad)
        if (tableCible && !isNaN(tableCible)) {
            tableCible = "T" + tableCible;
        }

        // 2. PRÉPARATION DES ARTICLES (Tri Cuisine/Bar)
        let formattedItems = [];
        if (commande.line_items && commande.line_items.length > 0) {
            formattedItems = commande.line_items.map((item, index) => {
                let nomLow = item.name.toLowerCase();
                
                // Mots-clés pour le BAR
                let nomTest = " " + nomLow.replace(/[.,'!?]/g, " ") + " "; 
                let motsBar = [
                    ' biere ', ' bière ', ' bieres ', ' bières ', 
                    ' vin ', ' vins ', 
                    ' champagne ', ' champagnes ', 
                    ' cocktail ', ' cocktails ', 
                    ' eau ', ' eaux ', 
                    ' coca ', ' jus ', 
                    ' cafe ', ' café ', ' cafes ', ' cafés ', 
                    ' the ', ' thé ', ' thes ', ' thés ', 
                    ' boisson ', ' boissons ', 
                    ' verre ', ' verres ', 
                    ' bouteille ', ' bouteilles '
                ];
                
                let isDrink = motsBar.some(mot => nomTest.includes(mot));
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
                    dest: dest,          
                    course: courseId,
                    fired: false,        // 🟢 C'EST ICI LA MAGIE : La commande arrive "En attente" pour validation par le serveur
                    done: false,
                    savedToDB: true,
                    isOffered: false
                };
            });
        }

        // 3. INJECTION DANS LA SALLE
        if (tableCible) {
            if (!db.activeOrders[tableCible]) {
                db.activeOrders[tableCible] = {
                    status: "hold", // 🟢 Passe la table en mode "Attente" (Couleur Or/Jaune sur le Pad)
                    time: new Date().toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'}),
                    clientName: "Client QR",
                    observations: `📱 COMMANDE QR CODE (#${commande.id})`,
                    items: formattedItems
                };
            } else {
                if(!db.activeOrders[tableCible].items) db.activeOrders[tableCible].items = [];
                db.activeOrders[tableCible].items.push(...formattedItems);
                db.activeOrders[tableCible].observations += ` | 📱 + #${commande.id}`;
            }
            console.log(`🔥 Commande QR Code #${commande.id} injectée EN ATTENTE dans la table ${tableCible}`);
        } else {
            const orderId = `order_${commande.id}`;
            db.activeOrders[orderId] = {
                isWeb: true, 
                id: commande.id,
                clientName: commande.billing ? `${commande.billing.first_name} ${commande.billing.last_name}` : 'Client Web',
                totalStr: `${commande.total} ${commande.currency}`,
                time: new Date().toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'}),
                status: "hold", 
                observations: `🛒 COMMANDE WEB #${commande.id}`,
                items: formattedItems
            };
            console.log(`🔥 Commande WEB #${commande.id} routée EN ATTENTE (sans table).`);
        }

        fs.writeFile(DB_FILE, JSON.stringify(db, null, 2), (err) => {
            if (err) return res.status(500).send("Erreur d'écriture");
            res.status(200).send("OK");
        });
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Cerveau Empire OS démarré sur le port ${PORT}`);
});
