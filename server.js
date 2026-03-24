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
app.use(express.static(path.join(__dirname)));

// API WordPress & WooCommerce
app.post('/api/nouvelle-commande', (req, res) => {
    const order = req.body;
    console.log("📥 COMMANDE REÇUE DE WORDPRESS");
    io.emit('order-received', order); // Diffusion immédiate
    res.status(200).json({ success: true });
});

// Liaison avec le Poste de Commandement
io.on('connection', (socket) => {
    console.log('🟢 Appareil connecté au réseau');

    socket.on('new-order', (order) => {
        console.log("📤 ORDRE ENVOYÉ PAR LE GESTIONNAIRE");
        io.emit('order-received', order); // On renvoie l'ordre à tous (Cuisine/Bar)
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 EMPIRE ACTIF SUR PORT ${PORT}`));
