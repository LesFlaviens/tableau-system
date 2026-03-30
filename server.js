const express = require('express');
const path = require('path');
const app = express();

// Autorisation étendue pour sauvegarder les photos (Système HACCP)
app.use(express.json({ limit: '50mb' })); 

// Connexion au dossier public
app.use(express.static(path.join(__dirname, 'public'))); 

// --- MOTEUR DE SYNCHRONISATION H24 (L'API) ---
let globalState = { activeOrders: {} };

app.get('/get-current-state', (req, res) => {
    res.json(globalState);
});

app.post('/update-order', (req, res) => {
    const { tableId, order } = req.body;
    if (tableId && order) {
        globalState.activeOrders[tableId] = order;
        res.json({ success: true });
    } else {
        res.status(400).json({ error: "Données invalides" });
    }
});

// --- ROUTAGE OFFICIEL DES PAGES ---
app.get('/haccp.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'haccp.html'));
});

app.get('/menu.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'menu.html'));
});

app.get('/chef.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'chef.html')); 
});

// --- DÉMARRAGE DU MOTEUR (OBLIGATOIRE POUR RENDER) ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Système iChef en ligne sur le port ${PORT}`);
});
