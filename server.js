const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname))); // Sert ton index.html

// --- ÉTAT GLOBAL DE L'EMPIRE ---
let activeOrders = {}; 

// --- GESTION DES WEBSOCKETS (SYNC TEMPS RÉEL) ---
wss.on('connection', (ws) => {
    console.log('● Nouvel appareil connecté au réseau Empire');
    
    // Envoi immédiat de l'état actuel à la connexion
    ws.send(JSON.stringify({ type: 'SYNC', orders: activeOrders }));

    ws.on('message', (message) => {
        const msg = JSON.parse(message);
        if (msg.type === 'NEW_ORDER') {
            handleOrderUpdate(msg.data.tableId, msg.data);
        }
    });
});

// --- API REST (BACKUP & PERSISTANCE) ---
app.post('/update-order', (req, res) => {
    const { tableId, order } = req.body;
    handleOrderUpdate(tableId, order);
    res.status(200).send({ status: 'success' });
});

app.get('/get-current-state', (req, res) => {
    res.json({ activeOrders });
});

// --- MOTEUR DE DIFFUSION (BROADCAST) ---
function handleOrderUpdate(tableId, order) {
    if (!order) {
        delete activeOrders[tableId]; // Table encaissée/libérée
    } else {
        activeOrders[tableId] = order; // Nouvelle commande ou mise à jour
    }

    // Propage l'info à TOUS les appareils (Pads + Chef)
    const broadcastData = JSON.stringify({ type: 'UPDATE_ALL', orders: activeOrders });
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(broadcastData);
        }
    });
    console.log(`🚀 Table ${tableId} mise à jour et synchronisée sur le réseau.`);
}

// --- LANCEMENT DU SERVEUR ---
const PORT = 80; // Port standard pour réseau local
server.listen(PORT, '0.0.0.0', () => {
    console.log('-------------------------------------------');
    console.log('   EMPIRE OS - SERVEUR MAÎTRE ACTIF        ');
    console.log(`   URL : http://localhost:${PORT}           `);
    console.log('   RESEAU : Connectez vos pads sur votre IP');
    console.log('-------------------------------------------');
});
