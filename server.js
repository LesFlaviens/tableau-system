const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.json());
app.use(express.static(__dirname));

let empireState = { activeOrders: {} };

app.get('/get-current-state', (req, res) => res.json(empireState));

app.post('/update-order', (req, res) => {
    const { tableId, order } = req.body;
    if (order === null) delete empireState.activeOrders[tableId];
    else empireState.activeOrders[tableId] = order;
    
    const message = JSON.stringify({ type: 'ORDER_UPDATE', activeOrders: empireState.activeOrders });
    wss.clients.forEach(c => { if (c.readyState === WebSocket.OPEN) c.send(message); });
    res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`EMPIRE ACTIF 24/7 SUR PORT ${PORT}`));
