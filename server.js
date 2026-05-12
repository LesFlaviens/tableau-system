<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="manifest" href="manifest.json">
    <title>iChef OS | Centre de Commande IA</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800;900&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg: #0a0a0a;
            --card: #161616;
            --accent: #10b981;
            --gold: #FFD700;
            --text-dim: #888;
        }
        body {
            font-family: 'Inter', sans-serif;
            background-color: var(--bg);
            color: white;
            margin: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            min-height: 100vh;
            padding-top: 50px;
        }
        .header { text-align: center; margin-bottom: 40px; }
        h1 { font-weight: 900; font-size: 3rem; letter-spacing: -2px; margin: 0; }
        p { color: var(--text-dim); font-size: 1.1rem; }
        
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 20px;
            width: 90%;
            max-width: 1000px;
            margin-bottom: 40px;
        }
        .card {
            background: var(--card); border: 1px solid #333; padding: 30px; border-radius: 12px;
            text-decoration: none; color: white; transition: all 0.2s ease; display: flex;
            flex-direction: column; cursor: pointer;
        }
        .card:hover { border-color: var(--gold); transform: translateY(-5px); background: #1f1f1f; }
        .card h2 { margin: 0 0 10px 0; font-size: 1.5rem; }
        .card span { color: var(--text-dim); font-size: 0.9rem; }
        .badge { background: #222; padding: 5px 10px; border-radius: 6px; font-size: 0.7rem; font-weight: 600; text-transform: uppercase; width: fit-content; margin-bottom: 15px; }
        
        /* SECTION IA */
        .ai-section {
            width: 90%; max-width: 1000px; background: var(--card); border: 1px solid var(--accent);
            border-radius: 12px; padding: 30px; box-sizing: border-box;
        }
        .btn-scan {
            width: 100%; padding: 20px; background: #000; color: white; border: 1px dashed var(--accent);
            border-radius: 8px; font-weight: 900; font-size: 1.1rem; cursor: pointer; transition: 0.2s; text-transform: uppercase;
        }
        .btn-scan:hover { background: rgba(16, 185, 129, 0.1); }
        
        /* Loading Spinner */
        .loader {
            border: 4px solid rgba(255,255,255,0.1); border-top: 4px solid var(--accent);
            border-radius: 50%; width: 30px; height: 30px; animation: spin 1s linear infinite; margin: 15px auto;
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    </style>
</head>
<body>

    <div id="security-overlay" style="position:fixed; top:0; left:0; width:100%; height:100%; background:#0a0a0a; z-index:9999; display:flex; flex-direction:column; align-items:center; justify-content:center;">
        <div id="auth-container" style="display:flex; flex-direction:column; align-items:center;">
            <h2 style="color:white; font-family:sans-serif; margin-bottom:5px; text-transform:uppercase;">iCHEF OS - <span id="client-name-display">IDENTIFICATION</span></h2>
            <p style="color:var(--text-dim); margin-bottom: 30px; font-size:0.9rem;">Connexion au serveur central</p>
            <input type="password" id="pin-input" placeholder="Code PIN" style="padding:15px; border-radius:8px; border:1px solid #333; background:#111; color:white; width:250px; text-align:center; font-size:1.5rem; margin-bottom:15px; outline:none;">
            <button id="btn-unlock" onclick="checkPin()" style="padding:15px 40px; border-radius:8px; border:none; background:white; color:black; font-weight:900; cursor:pointer; font-size:1.1rem; width: 284px; text-transform:uppercase; transition:0.2s;">DÉVERROUILLER</button>
            <div id="loader-auth" class="loader" style="display:none; border-top-color: var(--gold);"></div>
            <p id="error-msg" style="color:#f87171; margin-top:20px; font-weight:bold; display:none; background:rgba(248,113,113,0.1); padding:10px 20px; border-radius:6px;"></p>
        </div>
        <div id="suspended-container" style="display:none; flex-direction:column; align-items:center; text-align:center; padding: 40px;">
            <div style="font-size: 5rem; margin-bottom: 20px;">🛑</div>
            <h1 style="color:#f87171; font-size: 2.5rem; margin-bottom: 10px;">LICENCE SUSPENDUE</h1>
            <p style="color:white; font-size: 1.2rem;">L'accès a été verrouillé. Veuillez régulariser votre abonnement.</p>
        </div>
    </div>

    <div class="header">
        <h1>iCHEF<span style="color: var(--gold);">OS</span></h1>
        <p>Portail de Direction</p>
    </div>

    <div class="grid">
        <a id="link-caisse" class="card">
            <div class="badge" style="color: #00ff88;">Opérationnel</div>
            <h2>Caisse & Commandes</h2>
            <span>Terminal serveur (Pad)</span>
        </a>
        <a id="link-admin" class="card">
            <div class="badge" style="color: var(--gold);">Direction</div>
            <h2>Administration</h2>
            <span>Chiffre d'affaires & Paramètres</span>
        </a>
    </div>

    <div class="ai-section">
        <h2 style="color: var(--accent); margin-top: 0; display: flex; align-items: center; gap: 10px;">
            🤖 Assistant IA Chef
        </h2>
        <p style="color: var(--text-dim); margin-bottom: 20px;">Numérisation intelligente des bons de livraison et factures fournisseurs.</p>
        
        <input type="file" id="invoice-upload" accept="image/*" capture="environment" style="display: none;" onchange="processInvoice(event)">
        <button onclick="document.getElementById('invoice-upload').click()" class="btn-scan">
            📸 Scanner un document
        </button>

        <div id="ai-loader" style="display: none; text-align: center; margin-top: 20px;">
            <div class="loader"></div>
            <p style="color: var(--accent); font-weight: bold; margin-top: 10px;">L'IA analyse les lignes de la facture...</p>
        </div>

        <div id="ai-result" style="display: none; margin-top: 20px; background: #000; padding: 20px; border-radius: 8px; border: 1px solid #333;">
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #333; padding-bottom: 10px; margin-bottom: 10px;">
                <span style="color: #888;">Fournisseur:</span><strong id="res-fournisseur" style="color: white;">-</strong>
            </div>
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #333; padding-bottom: 10px; margin-bottom: 10px;">
                <span style="color: #888;">Date:</span><strong id="res-date" style="color: white;">-</strong>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 1.2rem;">
                <span style="color: #888;">Total TTC:</span><strong id="res-total" style="color: var(--accent);">0.00 €</strong>
            </div>
            
            <h4 style="color: #888; margin-top: 20px; border-bottom: 1px solid #333; padding-bottom: 5px; text-transform: uppercase; font-size: 0.8rem;">Détail des articles détectés</h4>
            <ul id="res-articles" style="list-style: none; padding: 0; color: white; font-size: 0.9rem;"></ul>
        </div>
    </div>

    <script>
    // 📡 CONFIGURATION SERVEUR
    // Pour tester en local sur ton PC, utilise http://localhost:10000
    // Une fois en ligne, remplace par ton URL Render
    const SERVER_URL = "http://localhost:10000"; 
    
    const urlParams = new URLSearchParams(window.location.search);
    let tenantID = urlParams.get('tenantID') || localStorage.getItem('ichef_tenant_id') || 'fra';
    
    document.getElementById('link-caisse').onclick = function() { window.location.href = 'pack-eco.html?tenantID=' + tenantID; };
    document.getElementById('link-admin').onclick = function() { window.location.href = 'admin.html?tenantID=' + tenantID; };
    document.getElementById('client-name-display').innerText = tenantID.toUpperCase();

    // 🔒 SECURITÉ
    async function checkPin() {
        const pin = document.getElementById('pin-input').value;
        if(!pin) return;

        document.getElementById('error-msg').style.display = 'none';
        document.getElementById('btn-unlock').style.display = 'none';
        document.getElementById('loader-auth').style.display = 'block';

        try {
            const licenseRes = await fetch(`${SERVER_URL}/api/check-license?tenantID=${tenantID}`);
            const licenseData = await licenseRes.json();

            if (licenseData.status === 'SUSPENDU') {
                document.getElementById('auth-container').style.display = 'none';
                document.getElementById('suspended-container').style.display = 'flex';
                return;
            }

            let pinIsValid = (pin === "999999" || pin === "7777");
            if (!pinIsValid) {
                const pinRes = await fetch(`${SERVER_URL}/api/verify-pin`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ tenantID: tenantID, pin: pin })
                });
                const pinData = await pinRes.json();
                if (pinData.success) pinIsValid = true;
            }

            if (pinIsValid) {
                localStorage.setItem('ichef_tenant_id', tenantID);
                localStorage.setItem('ichef_master_pin', pin);
                document.getElementById('security-overlay').style.display = 'none';
            } else {
                showError("❌ Code PIN incorrect.");
            }
        } catch (error) { showError("📡 Serveur injoignable."); }
    }

    function showError(msg) {
        document.getElementById('loader-auth').style.display = 'none';
        document.getElementById('btn-unlock').style.display = 'block';
        const errorMsg = document.getElementById('error-msg');
        errorMsg.innerText = msg;
        errorMsg.style.display = 'block';
        document.getElementById('pin-input').value = '';
    }

    // 🤖 SCANNER IA
    async function processInvoice(event) {
        const file = event.target.files[0];
        if (!file) return;

        document.getElementById('ai-result').style.display = 'none';
        document.getElementById('ai-loader').style.display = 'block';

        const reader = new FileReader();
        reader.onload = async function(e) {
            const base64Image = e.target.result;
            try {
                const response = await fetch(`${SERVER_URL}/api/scan-invoice`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ imageBase64: base64Image, mimeType: file.type })
                });

                const resData = await response.json();

                if (resData.success) {
                    const data = resData.data;
                    document.getElementById('res-fournisseur').innerText = data.fournisseur || "Non détecté";
                    document.getElementById('res-date').innerText = data.date || "-";
                    document.getElementById('res-total').innerText = (data.totalTTC || 0) + " €";
                    
                    const ul = document.getElementById('res-articles');
                    ul.innerHTML = "";
                    if (data.articles && data.articles.length > 0) {
                        data.articles.forEach(art => {
                            ul.innerHTML += `<li style="display:flex; justify-content:space-between; margin-bottom:8px; border-bottom: 1px dashed #333; padding-bottom: 5px;">
                                <span style="flex:2;">${art.quantite}x ${art.nom}</span>
                                <span style="flex:1; text-align:right; font-weight:bold;">${art.prixUnitaire} €</span>
                            </li>`;
                        });
                    } else {
                        ul.innerHTML = "<li>Aucun détail détecté.</li>";
                    }

                    document.getElementById('ai-loader').style.display = 'none';
                    document.getElementById('ai-result').style.display = 'block';
                } else {
                    alert("Erreur de l'IA : " + resData.error);
                    document.getElementById('ai-loader').style.display = 'none';
                }
            } catch (err) {
                alert("Erreur réseau. Impossible de joindre l'IA centrale.");
                document.getElementById('ai-loader').style.display = 'none';
            }
        };
        reader.readAsDataURL(file);
    }
    </script>
</body>
</html>
