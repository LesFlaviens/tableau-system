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
const SECRET_KEY = "ICHEF2026";

let globalLayouts = {}; 
let activeOrders = {};  

const protectedPages = ['/production.html', '/gestionnaire.html', '/bar.html', '/finance.html'];
app.use((req, res, next) => {
    if (protectedPages.includes(req.path) && req.query.key !== SECRET_KEY) {
        return res.status(401).send("<h1>Accès Interdit</h1>");
    }
    next();
});

app.use(express.static(path.join(__dirname)));
const server = http.createServer(app);
const wss = new WebSocket.Server({ server }); 
const io = socketIo(server); 

// Réception WordPress / WooCommerce
app.post('/api/nouvelle-commande', (req, res) => {
    const order = req.body;
    console.log("🔥 COMMANDE WEB REÇUE");
    io.emit('order-received', order); 
    res.status(200).send({ success: true });
});

app.post('/save-full-layout', (req, res) => {
    globalLayouts = req.body;
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'SYNC_LAYOUT', data: globalLayouts }));
        }
    });
    res.json({ success: true });
});

app.post('/update-order', (req, res) => {
    const { tableId, order } = req.body;
    if (!order) delete activeOrders[tableId];
    else activeOrders[tableId] = order;
    const message = JSON.stringify({ type: 'ORDER_UPDATE', activeOrders });
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) client.send(message);
    });
    res.json({ success: true });
});

wss.on('connection', (ws) => {
    ws.send(JSON.stringify({ type: 'SYNC_LAYOUT', data: globalLayouts }));
    ws.send(JSON.stringify({ type: 'ORDER_UPDATE', activeOrders }));
});

io.on('connection', (socket) => {
    socket.on('new-order', (order) => io.emit('order-received', order));
});

server.listen(PORT, () => console.log(`🚀 EMPIRE ACTIF`));
