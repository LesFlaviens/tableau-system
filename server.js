const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.json());
app.use(express.static(__dirname));

// État global de l'empire (Commandes, Menu, etc.)
let empireState = { 
    activeOrders: {},
    GLOBAL_MENU: { data: [] } // Pourra être alimenté via ton interface gestionnaire
};

// 1. Point d'accès pour synchroniser n'importe quel appareil au démarrage
app.get('/get-current-state', (req, res) => res.json(empireState));

// 2. Le Cœur du routage : Traitement des commandes en temps réel
app.post('/update-order', (req, res) => {
    const { tableId, order } = req.body;

    if (order === null) {
        // SCÉNARIO A : Encaissement ou annulation (suppression de la table)
        delete empireState.activeOrders[tableId];
    } else {
        // SCÉNARIO B : Nouvelle commande ou ajout de plats
        empireState.activeOrders[tableId] = order;
        
        // SIGNAL CUI / BAR : On alerte uniquement s'il y a de nouveaux produits
        if (order.newItems && order.newItems.length > 0) {
            const alertMessage = JSON.stringify({
                type: 'NEW_TICKET',
                tableId: tableId,
                items: order.newItems // Contient destination et observations
            });
            
            wss.clients.forEach(c => {
                if (c.readyState === WebSocket.OPEN) c.send(alertMessage);
            });
        }
    }

    // MISE À JOUR GÉNÉRALE : On synchronise tous les écrans (Plan de salle, Menu client)
    const updateMsg = JSON.stringify({ 
        type: 'ORDER_UPDATE', 
        activeOrders: empireState.activeOrders 
    });
    
    wss.clients.forEach(c => { 
        if (c.readyState === WebSocket.OPEN) c.send(updateMsg); 
    });
    
    res.sendStatus(200);
});

// 3. Lancement du système H24
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 EMPIRE OS ACTIF 24/7 SUR PORT ${PORT}`));
