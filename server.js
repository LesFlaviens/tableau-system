const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(__dirname));

const DB_FILE = path.join(__dirname, 'database.json');

// Lire la base de données
app.get('/get-current-state', (req, res) => {
    fs.readFile(DB_FILE, 'utf8', (err, data) => {
        if (err) return res.json({ activeOrders: {} });
        res.json(JSON.parse(data || '{"activeOrders": {}}'));
    });
});

// Sauvegarder (Cuisine, Bar ou Tables)
app.post('/update-order', (req, res) => {
    const { tableId, order } = req.body;
    
    fs.readFile(DB_FILE, 'utf8', (err, data) => {
        let db = { activeOrders: {} };
        if (!err && data) db = JSON.parse(data);

        if (order === null) {
            delete db.activeOrders[tableId];
        } else {
            db.activeOrders[tableId] = order;
        }

        fs.writeFile(DB_FILE, JSON.stringify(db, null, 2), (err) => {
            if (err) return res.status(500).send("Erreur d'écriture");
            res.send("OK");
        });
    });
});

app.listen(port, () => console.log(`Empire Server sur le port ${port}`));
