<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>iChef OS | Réglages</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap" rel="stylesheet">
    <style>
        :root { --bg: #0a0a0a; --card: #161616; --accent: #FFD700; --text-dim: #888; border-color: #333; }
        body { font-family: 'Inter', sans-serif; background-color: var(--bg); color: white; margin: 0; padding: 40px; }
        .container { max-width: 800px; margin: 0 auto; }
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px; border-bottom: 1px solid var(--border-color); padding-bottom: 20px; }
        h1 { font-weight: 800; font-size: 2rem; margin: 0; }
        .btn-back { color: var(--text-dim); text-decoration: none; font-weight: 600; border: 1px solid #333; padding: 8px 15px; border-radius: 6px; }
        .btn-back:hover { color: white; background: #222; }
        .card { background: var(--card); border: 1px solid #333; padding: 30px; border-radius: 12px; margin-bottom: 20px; }
        input { width: 100%; padding: 15px; margin-top: 10px; margin-bottom: 20px; background: #222; border: 1px solid #444; color: white; border-radius: 8px; box-sizing: border-box; font-size: 1rem; }
        input:focus { outline: none; border-color: var(--accent); }
        .btn-submit { background: var(--accent); color: black; font-weight: 900; padding: 15px; border: none; border-radius: 8px; cursor: pointer; width: 100%; text-transform: uppercase; font-size: 1rem; }
        #msg-pin { font-weight: bold; margin-top: 15px; text-align: center; }
    </style>
</head>
<body>

    <div class="container">
        <div class="header">
            <div>
                <h1>⚙️ Centre de Contrôle</h1>
                <p id="restaurant-name" style="color: var(--text-dim); margin: 5px 0 0 0;">Chargement...</p>
            </div>
            <a href="/logiciel.html" class="btn-back">Retour à la Caisse</a>
        </div>

        <div class="card">
            <h2 style="margin-top:0; color:var(--accent);">🔒 Sécurité : Code PIN Serveur</h2>
            <p style="color: var(--text-dim); font-size: 0.9rem;">Ce code permet à vos serveurs de déverrouiller la caisse.</p>
            <input type="password" id="new-pin" placeholder="Tapez le nouveau code PIN (ex: 1234)">
            <button class="btn-submit" onclick="updatePin()">Mettre à jour le PIN</button>
            <div id="msg-pin"></div>
        </div>
        
        </div>

    <script>
        // Vérification de la session
        const currentTenantID = localStorage.getItem('ichef_tenant_id');
        const currentClientName = localStorage.getItem('ichef_client_name');

        if (!currentTenantID) window.location.href = '/connexion.html';
        document.getElementById('restaurant-name').innerText = currentClientName;

        // Fonction pour envoyer le nouveau PIN au serveur
        async function updatePin() {
            const newPin = document.getElementById('new-pin').value;
            const msg = document.getElementById('msg-pin');

            if (!newPin) {
                msg.style.color = "#f87171";
                msg.innerText = "❌ Veuillez entrer un code PIN.";
                return;
            }

            try {
                const response = await fetch('/api/update-pin', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ tenantID: currentTenantID, newPin: newPin })
                });
                
                const result = await response.json();

                if (result.success) {
                    msg.style.color = "#4ade80";
                    msg.innerText = "✅ Le code PIN a été mis à jour avec succès.";
                    document.getElementById('new-pin').value = ''; // On vide le champ
                } else {
                    msg.style.color = "#f87171";
                    msg.innerText = "❌ Erreur : " + result.error;
                }
            } catch (err) {
                msg.style.color = "#f87171";
                msg.innerText = "❌ Erreur de communication avec le serveur.";
            }
        }
    </script>
</body>
</html>
