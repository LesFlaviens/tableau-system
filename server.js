const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());

// --- CRUCIAL : Cette ligne permet au serveur de trouver tes fichiers HTML ---
app.use(express.static(__dirname));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Base de données temporaire des commandes actives
let activeOrders = {};

// ROUTE : Réception d'une nouvelle commande ou mise à jour (Prêt/Encaissé)
app.post('/update-order', (req, res) => {
    const { tableId, order } = req.body;
    
    if (!order) {
        // Si l'ordre est null, on libère la table (Encaissement)
        delete activeOrders[tableId];
        console.log(`Table ${tableId} libérée.`);
    } else {
        // Sinon on crée ou met à jour la commande
        activeOrders[tableId] = order;
        console.log(`Mise à jour Table ${tableId} : ${order.status}`);
    }

    // DIFFUSION : On envoie l'état des tables à TOUS les écrans connectés
    broadcastOrders();
    res.json({ success: true });
});

// FONCTION DE DIFFUSION (WebSocket)
function broadcastOrders() {
    const message = JSON.stringify({ type: 'ORDER_UPDATE', activeOrders });
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

// GESTION DES CONNEXIONS ENTRANTES (Salle, Cuisine, Bar)
wss.on('connection', (ws) => {
    console.log('🟢 Nouvel écran connecté au réseau Empire.');
    // On envoie immédiatement les commandes en cours au nouvel arrivant
    ws.send(JSON.stringify({ type: 'ORDER_UPDATE', activeOrders }));
});

// LANCEMENT DU MOTEUR
const PORT = 8080;
server.listen(PORT, () => {
    console.log('========================================');
    console.log(`🚀 EMPIRE ACTIF : http://localhost:${PORT}`);
    console.log(`📂 Dossier racine : ${__dirname}`);
    console.log('========================================');
});