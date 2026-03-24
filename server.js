const express = require('express');
const http = require('http');
const WebSocket = require('ws'); // Technologie native haute performance
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.json());
app.use(cors());

// --- LA MÉMOIRE VIVE DE TON EMPIRE ---
let activeLayouts = {}; // Mémorise le plan de salle
let activeOrders = {};  // Mémorise toutes les commandes en cours

// --- SÉCURITÉ ---
const SECRET_KEY = "ICHEF2026";
app.use((req, res, next) => {
    const protectedRoutes = ['/production.html', '/gestionnaire.html', '/bar.html', '/finance.html'];
    if (protectedRoutes.includes(req.path) && req.query.key !== SECRET_KEY) {
        return res.status(401).send("Accès Interdit : Clé invalide.");
    }
    next();
});

app.use(express.static(path.join(__dirname)));

// --- DIFFUSION EN TEMPS RÉEL ---
function broadcast(data) {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

// --- CONNEXIONS DES ÉCRANS ---
wss.on('connection', (ws) => {
    console.log('🟢 Nouveau terminal connecté au Cerveau Central');
    // On synchronise le nouvel écran avec la mémoire du serveur
    ws.send(JSON.stringify({ type: 'SYNC_LAYOUT', data: activeLayouts }));
    ws.send(JSON.stringify({ type: 'ORDER_UPDATE', activeOrders: activeOrders }));
});

// --- API : COMMANDES DU GESTIONNAIRE ---
app.post('/save-full-layout', (req, res) => {
    activeLayouts = req.body;
    broadcast({ type: 'SYNC_LAYOUT', data: activeLayouts });
    res.status(200).send({ message: "Architecture sauvegardée" });
});

app.post('/update-order', (req, res) => {
    const { tableId, order } = req.body;
    if (order === null) {
        delete activeOrders[tableId]; // Table encaissée / libérée
    } else {
        activeOrders[tableId] = order; // Nouvelle commande ou mise à jour
    }
    broadcast({ type: 'ORDER_UPDATE', activeOrders: activeOrders });
    res.status(200).send({ message: "Commande mise à jour" });
});

// --- API : RETOURS CUISINE / BAR ---
app.post('/mark-ready', (req, res) => {
    const { tableId, poste } = req.body;
    if (activeOrders[tableId]) {
        let allDone = true;
        // Marque les articles de ce poste comme terminés
        activeOrders[tableId].items.forEach(item => {
            if (item.dest === poste) item.done = true;
            if (!item.done) allDone = false;
        });
        
        if (allDone) activeOrders[tableId].status = 'ready';
        if (!activeOrders[tableId].readyPostes) activeOrders[tableId].readyPostes = [];
        if (!activeOrders[tableId].readyPostes.includes(poste)) {
            activeOrders[tableId].readyPostes.push(poste);
        }
        broadcast({ type: 'ORDER_UPDATE', activeOrders: activeOrders });
    }
    res.status(200).send({ message: "Poste marqué comme prêt" });
});

// --- LE PONT WOOCOMMERCE (WEBHOOK) ---
app.post('/api/woo-webhook', (req, res) => {
    console.log("🔥 WOOCOMMERCE : Nouvelle commande interceptée !");
    const order = req.body;
    if (!order || !order.line_items) return res.status(200).send('OK');

    // Recherche de la table
    let tableId = `WEB-${order.id}`; 
    if (order.meta_data && Array.isArray(order.meta_data)) {
        const tableField = order.meta_data.find(meta => 
            (meta.key && meta.key.toLowerCase().includes('table')) || 
            (meta.display_key && meta.display_key.toLowerCase().includes('table'))
        );
        if (tableField && tableField.value) {
            tableId = `T${tableField.value}`; // Format compatible avec ton plan (T1, T2...)
        }
    }

    // Création des articles au format de la nouvelle architecture
    let newItems = [];
    order.line_items.forEach(item => {
        const nom = item.name.toLowerCase();
        let dest = 'Cuisine';
        if (nom.match(/biere|bière|mongy|mojito|champagne|verre|vin|cocktail/i)) dest = 'Bar';
        
        // On sépare les quantités pour pouvoir les cocher un par un en cuisine
        for(let i=0; i<item.quantity; i++) {
            newItems.push({ 
                n: item.name + ' [WEB]', dest: dest, p: parseFloat(item.price || 0), 
                sent: true, step: 0, done: false 
            });
        }
    });

    // On injecte dans la mémoire de la table
    if (!activeOrders[tableId]) {
        activeOrders[tableId] = { covers: 1, items: [], time: new Date().toLocaleTimeString('fr-FR'), status: 'pending', readyPostes: [] };
    }
    activeOrders[tableId].items.push(...newItems);

    broadcast({ type: 'ORDER_UPDATE', activeOrders: activeOrders });
    res.status(200).send('Webhook traité avec succès');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Empire (WS Natif) en ligne sur port ${PORT}`));
