const express = require('express');
const http = require('http');
const WebSocket = require('ws'); // Ancien moteur (Plan de table)
const socketIo = require('socket.io'); // Nouveau moteur (Cuisine, Bar, WordPress)
const cors = require('cors');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());

// Ton mot de passe "Maître" et le port Render
const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.ADMIN_PASSWORD || "ICHEF2026";

// --- 1. SÉCURITÉ : LE VERROU DES PAGES SENSIBLES ---
const protectedPages = ['/finance.html', '/production.html', '/gestionnaire.html', '/bar.html'];

app.use((req, res, next) => {
    if (protectedPages.includes(req.path)) {
        const pass = req.query.key;
        if (pass === SECRET_KEY) {
            next();
        } else {
            res.status(401).send("<h1>Accès Interdit</h1><p>La clé de sécurité de l'Empire est requise.</p>");
        }
    } else {
        next();
    }
});

// Distribution des fichiers HTML
app.use(express.static(path.join(__dirname)));

const server = http.createServer(app);

// --- 2. ALLUMAGE DES DEUX MOTEURS DE COMMUNICATION ---
const wss = new WebSocket.Server({ server }); // Moteur 1
const io = socketIo(server); // Moteur 2

// --- 3. LE PORTILLON WOOCOMMERCE (LE TRANSIT DE L'ARGENT) ---
app.post('/api/nouvelle-commande', (req, res) => {
    const order = req.body;
    console.log("🔥 ALERTE RENTRÉE D'ARGENT : Commande reçue depuis WordPress !");
    
    // On tire instantanément la commande vers la Cuisine et le Bar
    io.emit('order-received', order);
    
    // On valide la réception auprès de WordPress
    res.status(200).send({ success: true });
});

// --- 4. GESTION DU PLAN DE TABLE (ANCIEN SYSTÈME CONSERVÉ) ---
let activeOrders = {};

app.post('/update-order', (req, res) => {
    const { tableId, order } = req.body;
    
    if (!order) {
        delete activeOrders[tableId];
        console.log(`Table ${tableId} encaissée et libérée.`);
    } else {
        activeOrders[tableId] = order;
    }

    // Mise à jour visuelle des tables
    const message = JSON.stringify({ type: 'ORDER_UPDATE', activeOrders });
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
    res.json({ success: true });
});

wss.on('connection', (ws) => {
    ws.send(JSON.stringify({ type: 'ORDER_UPDATE', activeOrders }));
});

// --- 5. GESTION DE LA CUISINE ET DU BAR (NOUVEAU SYSTÈME) ---
io.on('connection', (socket) => {
    console.log('🟢 Écran de production connecté.');
    
    // Si une commande est tapée manuellement depuis le plan de table
    socket.on('new-order', (order) => {
        io.emit('order-received', order);
    });
});

// --- 6. DÉMARRAGE DE L'USINE ---
server.listen(PORT, () => {
    console.log('========================================');
    console.log(`🚀 EMPIRE COMMAND ACTIF SUR LE PORT : ${PORT}`);
    console.log(`🔒 Clé de sécurité active : ${SECRET_KEY}`);
    console.log('========================================');
});
