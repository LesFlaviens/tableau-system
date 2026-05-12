<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>iCHEF OS - Activation de votre compte</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800;900&display=swap" rel="stylesheet">
    <style>
        body { background: #09090b; color: #fff; font-family: 'Inter', sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }
        .card { background: #11141d; border: 1px solid #2d313a; padding: 40px; border-radius: 16px; width: 100%; max-width: 450px; box-shadow: 0 10px 40px rgba(0,0,0,0.8); text-align: center; }
        h1 { color: #fbbf24; margin-top: 0; font-size: 1.8rem; text-transform: uppercase; }
        p { color: #9ca3af; font-size: 0.95rem; margin-bottom: 30px; }
        .input-field { width: 100%; padding: 15px; margin-bottom: 15px; background: #000; border: 1px solid #333; color: white; border-radius: 8px; font-size: 1rem; box-sizing: border-box; outline: none; }
        .input-field:focus { border-color: #fbbf24; }
        .btn { width: 100%; padding: 15px; background: #10b981; color: #000; border: none; border-radius: 8px; font-weight: 900; font-size: 1rem; cursor: pointer; text-transform: uppercase; transition: 0.2s; }
        .btn:hover { transform: scale(1.02); }
        .error { color: #f87171; background: rgba(248, 113, 113, 0.1); padding: 10px; border-radius: 6px; font-weight: bold; margin-bottom: 15px; display: none; }
        
        /* État de succès */
        #success-state { display: none; }
        .pin-display { font-size: 3rem; font-weight: 900; color: #10b981; letter-spacing: 5px; background: rgba(16, 185, 129, 0.1); padding: 20px; border-radius: 12px; margin: 20px 0; }
    </style>
</head>
<body>

    <div class="card">
        <div id="setup-state">
            <h1>Activation iCHEF</h1>
            <p>Paiement confirmé. Veuillez configurer les identifiants de votre restaurant.</p>
            
            <div id="error-msg" class="error"></div>

            <input type="text" id="client-name" class="input-field" placeholder="Nom du Restaurant (ex: Le Petit Bistro)">
            <input type="text" id="tenant-id" class="input-field" placeholder="Identifiant de connexion (ex: bistro_paris)" style="text-transform: lowercase;">
            
            <button id="activate-btn" class="btn" onclick="activateAccount()">Créer mon accès</button>
        </div>

        <div id="success-state">
            <h1>Félicitations !</h1>
            <p>Votre compte est actif. Voici le code PIN secret de votre restaurant. <b>Notez-le précieusement.</b></p>
            
            <div class="pin-display" id="final-pin">----</div>
            
            <button class="btn" style="background: #fbbf24;" onclick="window.location.href='vitrine.html'">Aller à l'espace de connexion</button>
        </div>
    </div>

    <script>
        const SERVER_URL = "https://tableau-system.onrender.com";
        const urlParams = new URLSearchParams(window.location.search);
        const sessionId = urlParams.get('session_id'); // Stripe passe cet ID dans l'URL

        // Sécurité : S'il n'y a pas d'ID de session Stripe, on bloque la page
        if (!sessionId) {
            document.getElementById('setup-state').innerHTML = "<h2 style='color:#f87171;'>Accès non autorisé</h2><p>Veuillez passer par le lien de paiement.</p>";
        }

        async function activateAccount() {
            const clientName = document.getElementById('client-name').value.trim();
            const tenantID = document.getElementById('tenant-id').value.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
            const btn = document.getElementById('activate-btn');
            const errorMsg = document.getElementById('error-msg');

            if (!clientName || !tenantID) {
                showError("Veuillez remplir tous les champs.");
                return;
            }

            btn.innerText = "Création en cours...";
            btn.disabled = true;
            errorMsg.style.display = 'none';

            try {
                // On appelle la route d'activation de ton server.js
                const response = await fetch(`${SERVER_URL}/api/activate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sessionId, clientName, tenantID })
                });

                const data = await response.json();

                if (data.success) {
                    // Succès ! On cache le formulaire et on affiche le PIN généré par ton serveur
                    document.getElementById('setup-state').style.display = 'none';
                    document.getElementById('success-state').style.display = 'block';
                    document.getElementById('final-pin').innerText = data.dedicatedPin;
                } else {
                    showError(data.error || "Erreur lors de l'activation.");
                    btn.innerText = "Créer mon accès";
                    btn.disabled = false;
                }
            } catch (err) {
                showError("Impossible de joindre le serveur central.");
                btn.innerText = "Créer mon accès";
                btn.disabled = false;
            }
        }

        function showError(msg) {
            const errorMsg = document.getElementById('error-msg');
            errorMsg.innerText = msg;
            errorMsg.style.display = 'block';
        }
    </script>
</body>
</html>
