const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// --- CONFIGURATION DE SÉCURITÉ ET DOSSIER STATIQUE ---
app.use(express.json());

// CORRECTION MAJEURE ICI : 
// Le serveur va maintenant lire TOUS les fichiers HTML, CSS, JS 
// directement dans le même dossier que server.js. Fini l'erreur "Cannot GET".
app.use(express.static(__dirname)); 

// --- BASE DE DONNÉES CENTRALE (EN MÉMOIRE) ---
let appState = {
    activeOrders: {
        'GLOBAL_MENU': { status: 'system', data: [] },     // Carte de la cuisine
        'GLOBAL_RECIPES': { status: 'system', data: [] },  // Carte du Bar
        'GLOBAL_RESERVATIONS': { status: 'system', data: {} } // Réservations
    }
};

// --- ROUTES REST (API) ---

// 1. Synchronisation initiale quand une tablette s'allume
app.get('/get-current-state', (req, res) => {
    res.status(200).json(appState);
});

// 2. Réception et traitement des commandes / encaissements
app.post('/update-order', (req, res) => {
    const { tableId, order } = req.body;
    
    if (!tableId) {
        return res.status(400).json({ error: 'Table ID manquant' });
    }

    if (order === null) {
        // Encaissement / Suppression de la table
        delete appState.activeOrders[tableId];
        console.log(`[FINANCE] Table ${tableId} encaissée et clôturée.`);
    } else {
        // Ajout ou modification d'une commande
        appState.activeOrders[tableId] = order;
        console.log(`[ACTION] Mise à jour validée pour la table : ${tableId}`);
    }

    // PROPULSION H24 : On informe immédiatement tous les écrans connectés
    broadcast({ type: 'ORDER_UPDATE', activeOrders: appState.activeOrders });
    
    res.status(200).json({ success: true });
});


// --- MOTEUR WEBSOCKET (LE H24 7/7 SANS LATENCE) ---
wss.on('connection', (ws) => {
    console.log('[RÉSEAU] Un nouvel écran Empire vient de se connecter.');

    // Envoi immédiat de l'état du restaurant au nouvel écran
    ws.send(JSON.stringify({ type: 'SYNC', state: appState }));

    ws.on('error', (error) => {
        console.error('[ERREUR RÉSEAU]', error);
    });

    ws.on('close', () => {
        console.log('[RÉSEAU] Un écran s\'est déconnecté.');
    });
});

// Diffuse le signal à tout le restaurant
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
