const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// --- CONFIGURATION ---
// Permet au serveur de lire le JSON envoyé par les tablettes
app.use(express.json());
// Sert tes fichiers HTML, CSS et JS statiques (assure-toi que tes fichiers sont dans un dossier "public" ou ajuste ce chemin)
app.use(express.static(path.join(__dirname, 'public'))); 

// --- BASE DE DONNÉES CENTRALE (EN MÉMOIRE) ---
// C'est ici que l'Empire stocke la réalité en direct (Tables, Menus, Réservations)
let appState = {
    activeOrders: {
        'GLOBAL_MENU': { status: 'system', data: [] },     // Carte de la cuisine
        'GLOBAL_RECIPES': { status: 'system', data: [] },  // Carte du Bar
        'GLOBAL_RESERVATIONS': { status: 'system', data: {} } // Réservations
    }
};

// --- ROUTES REST (API) ---

// 1. Récupérer l'état actuel (Quand une tablette s'allume)
app.get('/get-current-state', (req, res) => {
    res.status(200).json(appState);
});

// 2. Mettre à jour une commande ou une carte (Quand on clique sur Envoyer, Encaisse, ou Propulser)
app.post('/update-order', (req, res) => {
    const { tableId, order } = req.body;
    
    if (!tableId) {
        return res.status(400).json({ error: 'Table ID manquant' });
    }

    if (order === null) {
        // En cas d'encaissement ou d'annulation totale, on efface la table
        delete appState.activeOrders[tableId];
        console.log(`[FINANCE] Table ${tableId} encaissée/vidée.`);
    } else {
        // Sinon, on met à jour ou on crée la commande
        appState.activeOrders[tableId] = order;
        console.log(`[ACTION] Mise à jour reçue pour : ${tableId}`);
    }

    // PROPULSION H24 : On informe immédiatement tous les écrans connectés (Pads, Cuisine, Bar)
    broadcast({ type: 'ORDER_UPDATE', activeOrders: appState.activeOrders });
    
    res.status(200).json({ success: true });
});


// --- MOTEUR WEBSOCKET (LE H24 7/7) ---
wss.on('connection', (ws) => {
    console.log('[RÉSEAU] Nouvel écran connecté à l\'Empire.');

    // Dès qu'un écran se connecte, on lui envoie l'état complet pour le synchroniser
    ws.send(JSON.stringify({ type: 'SYNC', state: appState }));

    ws.on('error', (error) => {
        console.error('[ERREUR RÉSEAU]', error);
    });

    ws.on('close', () => {
        console.log('[RÉSEAU] Un écran s\'est déconnecté.');
    });
});

// Fonction pour crier l'information à tous les écrans en même temps
function broadcast(data) {
    const message = JSON.stringify(data);
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

// --- DÉMARRAGE DU SERVEUR ---
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`=================================================`);
    console.log(`🚀 SYSTÈME EMPIRE CENTRAL OPÉRATIONNEL SUR LE PORT ${PORT}`);
    console.log(`=================================================`);
});
