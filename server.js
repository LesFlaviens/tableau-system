const express = require('express');
const path = require('path');
const fs = require('fs'); 
const app = express();

// Autorisation étendue pour sauvegarder les photos (Système HACCP)
app.use(express.json({ limit: '50mb' })); 

// 🟢 LE PONT MAGIQUE : Ceci autorise TOUS tes fichiers HTML (menu-bar, finance, bar, etc.)
// Plus besoin de créer une route manuelle pour chaque page !
app.use(express.static(__dirname)); 

// --- GESTION DE LA BASE DE DONNÉES LOCALE ---
const DB_FILE = path.join(__dirname, 'database.json');
let globalState = { activeOrders: {} };

// 🟢 AU DÉMARRAGE : On recharge les données sauvegardées
if (fs.existsSync(DB_FILE)) {
    try {
        const rawData = fs.readFileSync(DB_FILE);
        globalState = JSON.parse(rawData);
        console.log("💾 Base de données chargée avec succès. L'Empire est restauré.");
    } catch(e) {
        console.log("⚠️ Fichier base de données vierge ou illisible. Démarrage à neuf.");
    }
}

// --- MOTEUR DE SYNCHRONISATION H24 (L'API) ---
app.get('/get-current-state', (req, res) => {
    res.json(globalState);
});

app.post('/update-order', (req, res) => {
    const { tableId, order } = req.body;
    
    // 🟢 CORRECTION CRITIQUE : On accepte "order" même s'il est "null" (pour vider une table)
    if (tableId !== undefined && order !== undefined) {
        
        if (order === null) {
            // Si la commande est null, le serveur demande de vider la table (Encaissement)
            delete globalState.activeOrders[tableId];
        } else {
            // Sinon, on met à jour la donnée (Menu, Planning, Commande)
            globalState.activeOrders[tableId] = order;
        }
        
        // 🟢 SAUVEGARDE AUTOMATIQUE SUR LE DISQUE : Chaque clic est gravé
        try {
            fs.writeFileSync(DB_FILE, JSON.stringify(globalState, null, 2));
        } catch(err) {
            console.error("Erreur de sauvegarde disque:", err);
        }
        
        res.json({ success: true });
    } else {
        res.status(400).json({ error: "Données invalides : tableId ou order manquant." });
    }
});

// --- ROUTAGE OFFICIEL DE SÉCURITÉ ---
// (Au cas où le static ne suffirait pas, on force la reconnaissance des piliers de l'Empire)
app.get('/haccp.html', (req, res) => { res.sendFile(path.join(__dirname, 'haccp.html')); });
app.get('/menu.html', (req, res) => { res.sendFile(path.join(__dirname, 'menu.html')); });
app.get('/chef.html', (req, res) => { res.sendFile(path.join(__dirname, 'chef.html')); });
app.get('/bar.html', (req, res) => { res.sendFile(path.join(__dirname, 'bar.html')); });
app.get('/menu-bar.html', (req, res) => { res.sendFile(path.join(__dirname, 'menu-bar.html')); });
app.get('/finance.html', (req, res) => { res.sendFile(path.join(__dirname, 'finance.html')); });
app.get('/gestionnaire.html', (req, res) => { res.sendFile(path.join(__dirname, 'gestionnaire.html')); });
app.get('/economat.html', (req, res) => { res.sendFile(path.join(__dirname, 'economat.html')); });
app.get('/reservation.html', (req, res) => { res.sendFile(path.join(__dirname, 'reservation.html')); });

// Redirection de l'ancien serveur.html vers le nouveau gestionnaire.html
app.get('/serveur.html', (req, res) => { res.redirect('/gestionnaire.html'); });

// --- DÉMARRAGE DU MOTEUR ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Système Central de l'Empire en ligne sur le port ${PORT}`);
});
