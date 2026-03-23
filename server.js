const express = require('express');
const http = require('http');
const WebSocket = require('ws'); 
const socketIo = require('socket.io'); 
const cors = require('cors');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.ADMIN_PASSWORD || "ICHEF2026";

// --- MÉMOIRE DE L'EMPIRE (Stockage du plan et des commandes) ---
let globalLayouts = {}; // Sauvegarde des salles et tables
let activeOrders = {};  // Commandes en cours

// --- 1. SÉCURITÉ : LE VERROU ---
const protectedPages = ['/finance.html', '/production.html', '/gestionnaire.html', '/bar.html'];

app.use((req, res, next) => {
    if (protectedPages.includes(req.path)) {
        const pass = req.query.key;
        if (pass === SECRET_KEY) {
            next();
        } else {
            res.status(401).send("<h1>Accès Interdit</h1><p>La clé de l'Empire est requise.</p>");
        }
    } else {
        next();
    }
});

app.use(express.static(path.join(__dirname)));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server }); // Moteur Plan de salle
const io = socketIo(server); // Moteur Production & WordPress

// --- 2. PORTILLON WOOCOMMERCE & API ---

// Réception WordPress
app.post('/api/nouvelle-commande', (req, res) => {
    const order = req.body;
    console.log("🔥 WP-EMPIRE : Vente détectée sur WooCommerce !");
    io.emit('order-received', order); 
    res.status(200).send({ success: true });
});

// Sauvegarde du plan (Mode Architecte)
app.post('/save-full-layout', (req, res) => {
    globalLayouts = req.body;
    console.log("💾 ARCHITECTE : Nouveau plan enregistré !");
    // On informe tous les écrans (miroirs) que le plan a changé
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'SYNC_LAYOUT', data: globalLayouts }));
        }
    });
    res.json({ success: true });
});

// Chargement du plan au démarrage
app.get('/get-layout', (req, res) => {
    res.json(globalLayouts);
});

// Mise à jour des commandes (Depuis le Plan de table)
app.post('/update-order', (req, res) => {
    const { tableId, order } = req.body;
    if (!order) {
        delete activeOrders[tableId];
        console.log(`Table ${tableId} libérée.`);
    } else {
        activeOrders[tableId] = order;
    }
    // Sync WebSocket
    const message = JSON.stringify({ type: 'ORDER_UPDATE', activeOrders });
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) client.send(message);
    });
    res.json({ success: true });
});

// --- 3. GESTION DES ÉCRANS (SOCKETS) ---

wss.on('connection', (ws) => {
    // Envoie le plan et les commandes dès qu'un écran s'allume
    ws.send(JSON.stringify({ type: 'SYNC_LAYOUT', data: globalLayouts }));
    ws.send(JSON.stringify({ type: 'ORDER_UPDATE', activeOrders }));
});

io.on('connection', (socket) => {
    console.log('🟢 Écran de production (Cuisine/Bar) connecté.');
    
    // Relais manuel du gestionnaire vers la cuisine/bar
    socket.on('new-order', (order) => {
        io.emit('order-received', order);
    });
});

// --- 4. DÉMARRAGE ---
server.listen(PORT, () => {
    console.log('========================================');
    console.log(`🚀 EMPIRE ACTIF : Port ${PORT}`);
    console.log(`🔐 CLE : ${SECRET_KEY}`);
    console.log('========================================');
});
