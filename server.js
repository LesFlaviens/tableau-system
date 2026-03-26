const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.json());
app.use(express.static(__dirname));

let empireState = { 
    activeOrders: {}, 
    stock: {}, 
    reservations: {},
    finance: { totalRevenue: 0, ordersCount: 0, categorySplit: { Entrées: 0, Plats: 0, Desserts: 0, Bar: 0 } }
};

const broadcast = (data) => {
    wss.clients.forEach(c => { if (c.readyState === WebSocket.OPEN) c.send(JSON.stringify(data)); });
};

app.get('/get-current-state', (req, res) => res.json(empireState));

app.post('/update-order', (req, res) => {
    const { tableId, order } = req.body;

    if (order === null) {
        // ENCAISSEMENT : Transfert vers la Finance
        const lastOrder = empireState.activeOrders[tableId];
        if (lastOrder && lastOrder.items) {
            lastOrder.items.forEach(i => {
                empireState.finance.totalRevenue += i.p;
                let cat = i.category || 'Bar';
                if (cat.includes('Plats')) cat = 'Plats';
                empireState.finance.categorySplit[cat] += i.p;
            });
            empireState.finance.ordersCount++;
        }
        delete empireState.activeOrders[tableId];
    } else {
        // GESTION STOCK & SYSTÈME
        if (order.items && !order.status) {
            order.items.forEach(item => {
                if (empireState.stock[item.n] > 0) empireState.stock[item.n] -= 1;
            });
        }
        empireState.activeOrders[tableId] = order;
    }
    broadcast({ type: 'SYNC', state: empireState });
    res.sendStatus(200);
});

app.post('/set-stock', (req, res) => {
    empireState.stock = req.body.stock;
    broadcast({ type: 'SYNC', state: empireState });
    res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`EMPIRE OS : CONNECTÉ H24`));
