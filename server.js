const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname))); 

// --- ÉTAT GLOBAL (MÉMOIRE CENTRALE) ---
let activeOrders = {}; 
let globalStock = {
    "Caviar Beluga & Blinis": 5,
    "Homard Bleu": 3,
    "Dom Pérignon": 12,
    "Tartare Wagyu": 8,
    "Château Margaux": 4,
    "Meursault 1er Cru": 6
    // Les autres articles sont gérés en stock illimité par le frontend
};

// --- LOGIQUE DE GESTION DES FLUX (MOTEUR) ---
function handleOrderUpdate(tableId, order) {
    // 1. Gestion des stocks si c'est un nouvel envoi (status: pending)
    if (order && order.status === 'pending') {
        order.items.forEach(item => {
            if (globalStock[item.n] !== undefined) {
                globalStock[item.n]--;
                if (globalStock[item.n] < 0) globalStock[item.n] = 0;
            }
        });
        console.log(`📦 Stock mis à jour suite à commande Table ${tableId}`);
    }

    // 2. Mise à jour de l'état des tables
    if (!order) {
        delete activeOrders[tableId]; // Libération de la table
        console.log(`🧹 Table ${tableId} libérée (Encaissement)`);
    } else {
        activeOrders[tableId] = order;
        console.log(`📝 Table ${tableId} mise à jour`);
    }

    // 3. Diffusion immédiate à TOUT le réseau (Pads + Chef)
    const broadcastData = JSON.stringify({ 
        type: 'UPDATE_ALL', 
        orders: activeOrders, 
        stock: globalStock 
    });
    
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(broadcastData);
        }
    });
}

// --- GESTION DES WEBSOCKETS ---
wss.on('connection', (ws) => {
    console.log('● Nouvel appareil connecté au réseau Empire');
    
    // Synchro initiale complète à la connexion
    ws.send(JSON.stringify({ 
        type: 'SYNC', 
        orders: activeOrders, 
        stock: globalStock 
    }));

    ws.on('message', (message) => {
        try {
            const msg = JSON.parse(message);
            if (msg.type === 'NEW_ORDER') {
                handleOrderUpdate(msg.data.tableId, msg.data);
            }
        } catch (e) { console.error("Erreur format message WS"); }
    });
});

// --- API REST (POINTS D'ENTRÉE) ---
app.post('/update-order', (req, res) => {
    const { tableId, order } = req.body;
    handleOrderUpdate(tableId, order);
    res.status(200).send({ status: 'success' });
});

app.get('/get-current-state', (req, res) => {
    res.json({ activeOrders, globalStock });
});

// --- DÉMARRAGE DU RÉSEAU H24 ---
const PORT = 80; 
server.listen(PORT, '0.0.0.0', () => {
    console.log('\x1b[33m%s\x1b[0m', '-------------------------------------------');
    console.log('\x1b[33m%s\x1b[0m', '    EMPIRE OS - SERVEUR MAÎTRE ACTIF       ');
    console.log('\x1b[33m%s\x1b[0m', `    PORT : ${PORT} | RÉSEAU : 0.0.0.0        `);
    console.log('\x1b[33m%s\x1b[0m', '-------------------------------------------');
});
