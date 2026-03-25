const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Configuration serveur
app.use(express.json());
// Sert tous les fichiers HTML et assets du dossier courant
app.use(express.static(__dirname)); 

// --- BASE DE DONNÉES EN MÉMOIRE (VIVE) ---
let activeOrders = {};

// 1. ROUTE : Forcer la synchronisation d'une tablette
app.get('/get-current-state', (req, res) => {
    res.json({ activeOrders });
});

// 2. ROUTE : Recevoir une nouvelle commande (Salle ou Web)
app.post('/update-order', (req, res) => {
    const { tableId, order } = req.body;
    
    if (order && order.status !== 'ready') {
        activeOrders[tableId] = order; // Ajoute ou met à jour
    } else {
        delete activeOrders[tableId]; // Supprime si terminé
    }

    // Informe instantanément la Cuisine, le Bar et les autres Salles
    broadcast({ type: 'ORDER_UPDATE', activeOrders });
    res.status(200).send({ message: 'Commande reçue et synchronisée' });
});

// 3. WEBSOCKET : Diffusion en temps réel
function broadcast(data) {
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

// Quand une tablette s'allume, on lui envoie l'état actuel
wss.on('connection', (ws) => {
    console.log('Nouvelle connexion tablette établie.');
    ws.send(JSON.stringify({ type: 'ORDER_UPDATE', activeOrders }));
});

// --- DÉMARRAGE ---
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`EMPIRE KDS : Serveur opérationnel sur le port ${PORT}`);
});
