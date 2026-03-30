const express = require('express');
const path = require('path');
const fs = require('fs'); // 🟢 NOUVEAU : Le module d'écriture sur le disque dur
const app = express();

// Autorisation étendue pour sauvegarder les photos (Système HACCP)
app.use(express.json({ limit: '50mb' })); 

// Connexion directe au dossier racine
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
    if (tableId && order) {
        // Met à jour la mémoire vive
        globalState.activeOrders[tableId] = order;
        
        // 🟢 SAUVEGARDE AUTOMATIQUE SUR LE DISQUE : Chaque clic est gravé
        fs.writeFileSync(DB_FILE, JSON.stringify(globalState, null, 2));
        
        res.json({ success: true });
    } else {
        res.status(400).json({ error: "Données invalides" });
    }
});

// --- ROUTAGE OFFICIEL DES PAGES ---
app.get('/haccp.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'haccp.html'));
});

app.get('/menu.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'menu.html'));
});

app.get('/chef.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'chef.html')); 
});

app.get('/serveur.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'serveur.html')); // Route pour le Pad Serveur
});

// --- DÉMARRAGE DU MOTEUR ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Système iChef en ligne sur le port ${PORT}`);
});
