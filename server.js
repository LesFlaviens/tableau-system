// ==========================================
// 🛒 WEBHOOK WOOCOMMERCE BLINDÉ, CADENCÉ & ROUTAGE STRICT
// ==========================================
app.post('/woo-webhook', (req, res) => {
    try {
        const order = req.body;
        if (!order || !order.id) return res.status(400).send("Payload invalide");

        // 1. Détection de la Table
        let tableNum = "WEB_" + order.id; 
        if (order.customer_note) {
            let match = order.customer_note.match(/table\s*(\d+)/i);
            if (match) tableNum = match[1];
        }
        if (order.meta_data && Array.isArray(order.meta_data)) {
            let tableMeta = order.meta_data.find(m => m.key && m.key.toLowerCase().includes('table'));
            if (tableMeta && tableMeta.value) tableNum = tableMeta.value;
        }

        // 2. Formatage du Ticket
        let newOrder = {
            status: 'cooking',
            time: new Date().toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'}),
            clientName: (order.billing?.first_name || 'Client') + ' (Woo)',
            observations: order.customer_note || 'Commande Web',
            items: [],
            isWeb: true,
            totalStr: (order.total || "0.00") + " €",
            id: order.id
        };

        // 3. ROUTAGE ULTRA-PRÉCIS (Mots exacts uniquement)
        // \b garantit que le mot est isolé (ex: "eau" matche, mais "gâteau" ou "veau" ne matchent pas)
        const regexBar = /\b(vin|vins|bière|bières|biere|bieres|cocktail|cocktails|eau|eaux|coca|cocas|jus|café|cafés|cafe|cafes|mojito|mojitos|verre|verres|bouteille|bouteilles|rhum|vodka|boisson|boissons|thé|thés|the|thes|sirop|sprite|fanta|limonade|perrier|alcool|soft|softs)\b/i;
        
        const regexDessert = /\b(dessert|desserts|glace|glaces|chocolat|chocolats|gâteau|gâteaux|gateau|gateaux|tarte|tartes|tiramisu|crème|creme|fruit|fruits|sorbet|sorbets|fondant|mousse)\b/i;
        
        const regexEntree = /\b(entrée|entrées|entree|entrees|salade|salades|soupe|soupes|planche|planches|tapas|foie|saumon|carpaccio|tartare|charcuterie|fromage|fromages)\b/i;

        if (order.line_items && Array.isArray(order.line_items)) {
            order.line_items.forEach(item => {
                let rawName = item.name || "Produit sans nom";
                let nomItem = rawName.toLowerCase();
                
                // PAR DÉFAUT : Tout va en cuisine comme Plat Principal
                let dest = 'cuisine'; 
                let course = 2; 

                // L'aiguillage strict
                if (regexBar.test(nomItem)) { 
                    dest = 'bar'; 
                    course = 0; 
                } 
                else if (regexDessert.test(nomItem)) { 
                    dest = 'cuisine'; 
                    course = 3; 
                } 
                else if (regexEntree.test(nomItem)) { 
                    dest = 'cuisine'; 
                    course = 1; 
                }

                newOrder.items.push({
                    id: Date.now() + Math.random(),
                    itemId: Date.now(),
                    n: rawName,
                    p: parseFloat(item.price || item.total || 0),
                    qty: item.quantity || 1,
                    done: false,
                    dest: dest, // S'assure que la bonne destination est choisie
                    fired: true, 
                    firedTime: Date.now(),
                    savedToDB: true,
                    course: course, // S'assure de l'ordre d'affichage (Apéro, Entrée, Plat, Dessert)
                    seat: 0
                });
            });
        }

        // 4. LA DÉCISION DU RÉGULATEUR (Envoi direct ou SAS)
        let activeWebCount = Object.values(globalState.activeOrders)
            .filter(o => o.isWeb && o.items && o.items.some(i => !i.done)).length;

        if (activeWebCount < 5) {
            globalState.activeOrders[tableNum] = newOrder;
            console.log(`🚀 Commande Woo #${order.id} envoyée direct. En cours : ${activeWebCount + 1}`);
        } else {
            webOrderQueue.push({ tableId: tableNum, order: newOrder });
            console.log(`⚠️ Brigade chargée. Commande Woo #${order.id} mise dans le SAS.`);
        }

        res.status(200).send("OK");
    } catch (e) {
        console.error("Erreur Webhook :", e);
        res.status(500).send("Erreur interne");
    }
});
