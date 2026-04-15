const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname))); 

let globalState = { activeOrders: {} };

app.get('/get-current-state', (req, res) => {
    res.json(globalState);
});

app.post('/update-order', (req, res) => {
    const { tableId, order } = req.body;
    if (order === null) {
        delete globalState.activeOrders[tableId];
    } else {
        globalState.activeOrders[tableId] = order;
    }
    res.json({ success: true });
});

// ==========================================
// 📱 PORTAIL CLIENT (LA PAGE DU QR CODE)
// ==========================================
app.get('/portail-client', (req, res) => {
    const tableId = req.query.table;
    const order = globalState.activeOrders[tableId];

    if (!order) {
        return res.send(`
            <body style="background:#0f172a; color:white; font-family:sans-serif; text-align:center; padding:50px;">
                <h1 style="color:#fbbf24;">ichef.ch</h1>
                <p>Aucune addition active pour la table ${tableId}.</p>
                <p>Demandez à votre serveur.</p>
            </body>
        `);
    }

    // Calcul du total
    const total = order.items.reduce((acc, i) => acc + (parseFloat(i.p) * (i.qty || 1)), 0);

    // Page HTML élégante pour le téléphone du client
    let html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            body { background: #0f172a; color: #f8fafc; font-family: 'Inter', sans-serif; padding: 20px; text-align: center; }
            .card { background: #1e293b; border-radius: 15px; padding: 20px; border: 1px solid #334155; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
            h1 { color: #fbbf24; margin-bottom: 5px; }
            .item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px dashed #334155; font-size: 0.9rem; }
            .total { font-size: 2rem; font-weight: 900; color: #fbbf24; margin: 25px 0; }
            .btn { background: #fbbf24; color: #000; border: none; padding: 15px 30px; border-radius: 10px; font-weight: bold; width: 100%; font-size: 1.1rem; cursor: pointer; text-transform: uppercase; }
            .footer { margin-top: 30px; color: #94a3b8; font-size: 0.8rem; }
        </style>
    </head>
    <body>
        <h1>EMPIRE</h1>
        <p style="text-transform: uppercase; letter-spacing: 2px;">Addition Table ${tableId}</p>
        <div class="card">
            ${order.items.map(i => `
                <div class="item">
                    <span>${i.qty || 1}x ${i.n}</span>
                    <span>${(parseFloat(i.p) * (i.qty || 1)).toFixed(2)}€</span>
                </div>
            `).join('')}
            <div class="total">${total.toFixed(2)} €</div>
            <button class="btn" onclick="alert('Lien Stripe/Apple Pay bientôt disponible')">Payer par téléphone</button>
        </div>
        <div class="footer">Établissement géré par iChef.ch</div>
    </body>
    </html>`;
    res.send(html);
});

// ==========================================
// 🤖 MOTEUR IA AUGMENTÉ (FOURNISSEUR & DATE)
// ==========================================
app.post('/analyse-ticket', async (req, res) => {
    try {
        const { image, mimeType, isLabelScan } = req.body;
        const API_KEY = process.env.GEMINI_API_KEY;

        if (!API_KEY) throw new Error("Clé API manquante");

        let promptSysteme = isLabelScan 
            ? "MISSION HACCP : Lis cette etiquette. Extrais : nom, lot, dlc (DD/MM/YY). JSON: {\"nom\": \"...\", \"lot\": \"...\", \"dlc\": \"...\"}"
            : `MISSION EXPERT ECONOMAT : Extraire tous les articles de cette facture. 
            RÈGLES CRITIQUES :
            1. IDENTIFICATION : Extraire le nom du 'fournisseur' et la 'date' de la facture (format DD/MM/YYYY).
            2. PIÈGES : 'Lapin chocolat' ou confiserie = 'economat'. JAMAIS 'proteines'.
            3. 6 CATÉGORIES : feculents, proteines, bof, sauces, legumes, economat.
            4. PRIX UNITAIRE : Si lot, ajoute le prix unitaire au nom (ex: "Oeufs (0.21€/pce)").

            FORMAT JSON STRICT :
            {
              "fournisseur": "NOM DU FOURNISSEUR",
              "date": "DD/MM/YYYY",
              "total": 0.00, 
              "feculents": [], "proteines": [], "bof": [], "sauces": [], "legumes": [], "economat": []
            }`;

        const payload = {
            contents: [{ parts: [{ text: promptSysteme }, { inline_data: { mime_type: mimeType || "image/jpeg", data: image } }] }],
            // On force Gemini 2.5 Flash pour la vitesse et la précision
            generation_config: { response_mime_type: "application/json", temperature: 0.1 }
        };

        const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + API_KEY, {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error.message);

        let rawText = data.candidates[0].content.parts[0].text;
        rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        
        res.json({ resultat: JSON.parse(rawText) });

    } catch (error) {
        console.error("Erreur Moteur IA :", error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => console.log(`🚀 Serveur Empire OS démarré sur le port ${PORT}`));
