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

// 1. LE NOUVEAU PONT WOOCOMMERCE OFFICIEL AVEC RADAR
app.post('/api/woo-webhook', (req, res) => {
    console.log("🔥 WOOCOMMERCE : Nouvelle commande Webhook !");
    const order = req.body;
    
    // Si la commande est vide, on arrête
    if (!order || !order.line_items) return res.status(200).send('OK');

    // --- 🚨 RADAR ACTIVÉ : SCAN DES DONNÉES CACHÉES ---
    console.log("🔍 DÉBUT DU SCAN DE LA COMMANDE :");
    if (order.meta_data && Array.isArray(order.meta_data)) {
        order.meta_data.forEach(m => console.log(`Clé interne: ${m.key} | Valeur: ${m.value}`));
    }
    if (order.billing) {
        console.log(`Données facturation (Aperçu) :`, JSON.stringify(order.billing).substring(0, 100));
    }
    console.log("-----------------------------------------");

    // --- LE CHERCHEUR DE TABLE ---
    // Par défaut, on affiche le numéro de commande Web
    let numeroTable = `WEB-${order.id}`; 

    // On cherche toujours le mot "table" au cas où
    if (order.meta_data && Array.isArray(order.meta_data)) {
        const tableField = order.meta_data.find(meta => 
            (meta.key && meta.key.toLowerCase().includes('table')) || 
            (meta.display_key && meta.display_key.toLowerCase().includes('table'))
        );
        if (tableField && tableField.value) {
            numeroTable = `Table ${tableField.value} (WEB)`;
        }
    }

    let articlesFormates = [];
    order.line_items.forEach(item => {
        const nom = item.name.toLowerCase();
        const qte = item.quantity;
        // Tri automatique
        let tag = '[Plat]';
        if (nom.match(/biere|bière|mongy|mojito|champagne|verre|vin|cocktail/i)) tag = '[Boisson]';
        articlesFormates.push(`${tag} ${qte}x ${item.name}`);
    });

    const payload = {
        table: numeroTable, // Le nom de la table est injecté ici
        heure: new Date().toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'}),
        articles: articlesFormates
    };

    io.emit('order-received', payload);
    res.status(200).send('Webhook traité avec succès');
});

// 2. LIAISON DES ÉCRANS (Envoi et Retour)
io.on('connection', (socket) => {
    console.log('🟢 Terminal connecté');
    
    // De la Salle vers Cuisine/Bar
    socket.on('new-order', (order) => {
        io.emit('order-received', order);
    });

    // De la Cuisine/Bar vers la Salle (Le fameux retour)
    socket.on('order-ready', (data) => {
        console.log(`🔔 RETOUR SALLE : ${data.table} est prête au poste ${data.poste}`);
        io.emit('notify-ready', data);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Empire en ligne sur port ${PORT}`));
