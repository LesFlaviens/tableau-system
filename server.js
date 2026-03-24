const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*" } });

app.use(express.json());
app.use(cors());

// Sécurité IChef
const SECRET_KEY = "ICHEF2026";
app.use((req, res, next) => {
    const protected = ['/production.html', '/gestionnaire.html', '/bar.html', '/finance.html'];
    if (protected.includes(req.path) && req.query.key !== SECRET_KEY) {
        return res.status(401).send("Accès Interdit : Clé invalide.");
    }
    next();
});

app.use(express.static(path.join(__dirname)));

// Pont WooCommerce
app.post('/api/nouvelle-commande', (req, res) => {
    const order = req.body;
    console.log("📥 Commande reçue de WordPress");
    io.emit('order-received', order);
    res.status(200).json({ success: true });
});

// Liaison Temps Réel
io.on('connection', (socket) => {
    console.log('🟢 Terminal connecté au réseau');
    socket.on('new-order', (order) => {
        console.log("📤 Ordre manuel détecté");
        io.emit('order-received', order);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Empire en ligne sur port ${PORT}`));
