<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Pad Serveur - Prise de Commande</title>
</head>
<body style="font-family: Arial, sans-serif; padding: 20px;">
    <h1>Interface Serveur (Tablette)</h1>
    
    <button id="btn-commander" style="padding: 15px 30px; font-size: 16px; background: #28a745; color: white; border: none; cursor: pointer;">
        Envoyer Commande (Table 12)
    </button>

    <div id="status" style="margin-top: 20px; font-weight: bold;"></div>

    <script>
        // 1. Connexion au flux temps réel
        const ws = new WebSocket('ws://localhost:3000');
        
        ws.onopen = () => console.log('Connecté au QG (WebSocket)');
        
        ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            if (message.type === 'ORDER_UPDATE') {
                document.getElementById('status').innerText = 'Dernière mise à jour du système reçue.';
                document.getElementById('status').style.color = 'green';
            }
        };

        // 2. Envoi de la commande via ton point d'accès REST
        document.getElementById('btn-commander').addEventListener('click', async () => {
            const payload = {
                tableId: "Table_12",
                order: { 
                    heure: new Date().toLocaleTimeString(),
                    plats: ["1x Entrecôte saignante", "1x Frites", "1x Vin Rouge"] 
                }
            };

            try {
                const response = await fetch('/update-order', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                
                if(response.ok) {
                    alert("Commande transmise avec succès !");
                }
            } catch (error) {
                console.error("Erreur de transmission :", error);
                document.getElementById('status').innerText = "Erreur de connexion.";
                document.getElementById('status').style.color = 'red';
            }
        });
    </script>
</body>
</html>
