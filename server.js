<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>iCHEF Empire OS - Connexion</title>
    
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;800&family=Playfair+Display:ital,wght@0,600;1,400&display=swap" rel="stylesheet">
    
    <style>
        :root { 
            --gold: #d4af37; 
            --bg-dark: #050505; 
            --panel: #0A0A0A; 
            --success: #10b981;
            --danger: #ef4444;
        }
        
        body { 
            margin: 0; padding: 0; background: var(--bg-dark); color: #fff; 
            font-family: 'Inter', sans-serif; display: flex; flex-direction: column; 
            align-items: center; justify-content: center; height: 100vh; overflow: hidden;
            background-image: radial-gradient(circle at 50% 0%, #1a1a1f 0%, transparent 50%);
        }
        
        .login-box { 
            background: var(--panel); border: 1px solid #1a1a1a; padding: 40px; 
            border-radius: 20px; text-align: center; width: 90%; max-width: 400px; 
            box-shadow: 0 20px 50px rgba(0,0,0,0.8); animation: fadeIn 0.6s ease-out;
        }

        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

        .login-logo { width: 100px; margin-bottom: 10px; filter: drop-shadow(0px 5px 15px rgba(212, 175, 55, 0.3)); }

        .subtitle { color: #888; font-size: 0.8rem; margin-bottom: 30px; text-transform: uppercase; letter-spacing: 2px; font-weight: 600; }
        
        .input-group { margin-bottom: 20px; text-align: left; }
        .input-group label { display: block; font-size: 0.7rem; color: #666; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 800; }

        input { width: 100%; padding: 15px; background: #000; border: 1px solid #222; color: #fff; border-radius: 10px; box-sizing: border-box; font-size: 1rem; text-align: center; outline: none; transition: 0.3s; }
        input:focus { border-color: var(--gold); box-shadow: 0 0 10px rgba(212,175,55,0.2); }
        
        button { width: 100%; padding: 16px; background: linear-gradient(135deg, var(--gold), #b89626); color: #000; border: none; border-radius: 10px; font-size: 0.9rem; font-weight: 800; text-transform: uppercase; cursor: pointer; transition: 0.3s; letter-spacing: 1px; }
        button:hover { filter: brightness(1.1); transform: translateY(-2px); box-shadow: 0 10px 20px rgba(212,175,55,0.3); }
        button:disabled { filter: grayscale(1); cursor: not-allowed; transform: none; box-shadow: none; }
        
        .toggle-link { margin-top: 25px; font-size: 0.8rem; color: #666; cursor: pointer; letter-spacing: 1px; text-decoration: none; display: inline-block; }
        .toggle-link:hover { color: var(--gold); }
        
        #error-msg { color: var(--danger); font-size: 0.8rem; margin-bottom: 15px; display: none; font-weight: 600; }

        /* PWA MODAL PREMIUM */
        #pwa-modal { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 1000; align-items: center; justify-content: center; backdrop-filter: blur(5px); }
        .modal-content { background: #060B14; border: 1px solid #1a1a1a; padding: 40px; border-radius: 20px; max-width: 340px; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
    </style>
</head>
<body>

    <div class="login-box" id="screen-login">
        <img src="logo-ichef.png" onerror="this.src='https://via.placeholder.com/100x35?text=iCHEF'" alt="Logo iCHEF" class="login-logo">
        <div class="subtitle">Portail Partenaire</div>
        
        <div id="error-msg"></div>

        <div class="input-group">
            <label>ID Restaurant</label>
            <input type="text" id="tenantID" placeholder="Ex: CHEZMARC" autocomplete="off" autocapitalize="characters">
        </div>
        
        <div class="input-group">
            <label>Code PIN</label>
            <input type="password" id="pinCode" placeholder="••••" autocomplete="off" pattern="[0-9]*" inputmode="numeric">
        </div>
        
        <button id="login-btn" onclick="login()">Se Connecter</button>
        
        <a href="inscription.html" class="toggle-link">Devenir Partenaire iCHEF ✨</a>
        
        <button id="pwa-install-btn" onclick="ouvrirGuideInstallation()" style="background: transparent; border: 1px solid var(--gold); color: var(--gold); margin-top: 30px;">
            Télécharger iCHEF OS
        </button>
    </div>

    <div id="pwa-modal">
        <div class="modal-content">
            <h2 style="font-family: 'Playfair Display', serif; color: #fff; margin-bottom: 30px;">Mode Application</h2>
            <div style="display: flex; flex-direction: column; gap: 25px; text-align: left; color: #a0a0a0; font-size: 0.9rem;">
                <div><span style="color:var(--gold); font-weight:bold;">01</span> Appuyez sur <strong style="color:#fff;">Partager</strong>.</div>
                <div><span style="color:var(--gold); font-weight:bold;">02</span> Sélectionnez <strong style="color:#fff;">Sur l'écran d'accueil</strong>.</div>
                <div><span style="color:var(--gold); font-weight:bold;">03</span> Validez : <strong style="color:#fff;">iCHEF OS</strong> est prêt.</div>
            </div>
            <button onclick="document.getElementById('pwa-modal').style.display='none'" style="margin-top: 40px; background: transparent; border: 1px solid #333; color: #666;">Fermer le guide</button>
        </div>
    </div>

    <script>
        const BACKEND_URL = "https://tableau-system.onrender.com";

        // Nettoyage automatique de la casse pour l'ID Restaurant
        document.getElementById('tenantID').addEventListener('input', function(e) {
            this.value = this.value.toUpperCase().replace(/\s+/g, '');
        });

        // Validation avec la touche "Entrée"
        document.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                login();
            }
        });

        async function login() {
            const rawTenant = document.getElementById('tenantID').value;
            // On normalise l'ID (minuscules, sans accents) pour coller à la base de données
            const tenantID = rawTenant.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
            const pinCode = document.getElementById('pinCode').value;
            const btn = document.getElementById('login-btn');
            const errorMsg = document.getElementById('error-msg');

            errorMsg.style.display = 'none';

            if (!tenantID || !pinCode) {
                errorMsg.innerText = "Veuillez saisir votre ID et votre Code PIN.";
                errorMsg.style.display = 'block';
                return;
            }

            btn.disabled = true;
            btn.innerText = "VÉRIFICATION...";

            try {
                // Création d'une empreinte d'appareil pour la gestion de la limite d'écrans
                let deviceId = localStorage.getItem('iChefDeviceID');
                if (!deviceId) {
                    deviceId = 'device_' + Math.random().toString(36).substr(2, 9);
                    localStorage.setItem('iChefDeviceID', deviceId);
                }

                const response = await fetch(`${BACKEND_URL}/api/verify-pin`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ tenantID, pin: pinCode, deviceId })
                });

                const data = await response.json();

                if (data.success) {
                    btn.style.background = "var(--success)";
                    btn.style.color = "#000";
                    btn.innerText = "ACCÈS AUTORISÉ";

                    // Enregistrement des données de session (Le sésame pour l'Admin)
                    localStorage.setItem('tenantID', data.safeTenantID || tenantID);
                    localStorage.setItem('pin', pinCode);
                    localStorage.setItem('role', data.role);
                    localStorage.setItem('plan', data.plan);
                    localStorage.setItem('specialite', data.specialite || 'cuisine');

                    // Redirection vers le tableau de bord (Cockpit/Admin)
                    setTimeout(() => {
                        window.location.href = 'cockpit.html'; // Ou admin.html selon le nom de ton dashboard
                    }, 800);
                } else {
                    errorMsg.innerText = data.error || "Identifiants incorrects ou accès refusé.";
                    errorMsg.style.display = 'block';
                    btn.disabled = false;
                    btn.innerText = "SE CONNECTER";
                }
            } catch (error) {
                console.error("Erreur login:", error);
                errorMsg.innerText = "Serveur injoignable. Vérifiez votre connexion.";
                errorMsg.style.display = 'block';
                btn.disabled = false;
                btn.innerText = "SE CONNECTER";
            }
        }

        function ouvrirGuideInstallation() { 
            document.getElementById('pwa-modal').style.display = 'flex'; 
        }
    </script>
</body>
</html>
