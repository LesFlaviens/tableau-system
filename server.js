<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>iCHEF Network - Tour de Controle</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;900&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg: #050505;
            --panel: #0A0A0A;
            --border: rgba(255, 255, 255, 0.05);
            --border-strong: rgba(255, 255, 255, 0.15);
            --text-main: #f8fafc;
            --text-muted: #64748b;
            --gold: #d4af37;
            --accent: #10b981;
            --accent-dim: rgba(16, 185, 129, 0.08);
            --alert: #ef4444;
            --shadow: 0 20px 50px rgba(0, 0, 0, 0.8);
        }

        body {
            font-family: 'Inter', sans-serif;
            background: var(--bg);
            color: var(--text-main);
            margin: 0;
            padding: 0;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            letter-spacing: 0.5px;
        }

        header {
            background: var(--panel);
            border-bottom: 1px solid var(--border);
            padding: 20px 40px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: var(--shadow);
        }

        .header-title {
            font-size: 1.2rem;
            font-weight: 900;
            letter-spacing: 2px;
            text-transform: uppercase;
        }

        .header-title span { color: var(--gold); }
        .subtitle { font-size: 0.85rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; }
        .container { max-width: 1400px; width: 100%; margin: 40px auto; padding: 0 20px; box-sizing: border-box; }
        .page-title { font-family: 'Playfair Display', serif; font-size: 2rem; font-weight: 700; margin-top: 0; margin-bottom: 30px; letter-spacing: 1px; }

        .table-container {
            background: var(--panel);
            border: 1px solid var(--border);
            border-radius: 12px;
            overflow: hidden;
            box-shadow: var(--shadow);
        }

        table { width: 100%; border-collapse: collapse; text-align: left; font-size: 0.9rem; }

        th {
            background: rgba(255, 255, 255, 0.02);
            border-bottom: 1px solid var(--border-strong);
            padding: 18px 20px;
            color: var(--text-muted);
            font-weight: 600;
            font-size: 0.75rem;
            text-transform: uppercase;
            letter-spacing: 1.5px;
        }

        td {
            padding: 18px 20px;
            border-bottom: 1px solid var(--border);
            color: var(--text-main);
            vertical-align: middle;
        }

        tr:last-child td { border-bottom: none; }
        tr:hover td { background: rgba(255, 255, 255, 0.01); }
        .establishment-name { font-weight: 700; font-size: 1rem; }
        .license-id { font-family: monospace; color: var(--text-muted); font-size: 0.95rem; }
        .contact-info { display: flex; flex-direction: column; gap: 4px; font-size: 0.85rem; }

        select.plan-selector {
            background: var(--bg) !important;
            color: var(--gold) !important;
            border: 1px solid var(--border-strong) !important;
            padding: 8px 12px;
            border-radius: 6px;
            font-family: inherit;
            font-size: 0.85rem;
            font-weight: 500;
            outline: none;
            cursor: pointer;
            transition: 0.3s;
        }

        .editable-field { display: inline-flex; align-items: center; gap: 8px; font-weight: 500; }
        .btn-edit-inline { background: transparent; border: none; color: var(--text-muted); cursor: pointer; padding: 4px; font-size: 0.8rem; transition: 0.2s; }
        .btn-edit-inline:hover { color: var(--gold); }

        .status-badge {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 4px;
            font-size: 0.75rem;
            font-weight: 700;
            letter-spacing: 1px;
            text-transform: uppercase;
            border: 1px solid transparent;
        }

        .status-badge.active { border-color: var(--accent); color: var(--accent); background: var(--accent-dim); }
        .status-badge.suspended { border-color: var(--alert); color: var(--alert); background: rgba(239, 68, 68, 0.05); }
        .actions-cell { display: flex; flex-direction: column; gap: 6px; align-items: flex-start; }
        .action-link { color: var(--accent); text-decoration: none; font-weight: 500; font-size: 0.85rem; cursor: pointer; transition: 0.2s; border: none; background: transparent; padding: 0; }
        .action-link:hover { text-decoration: underline; }
        .action-link.suspend { color: var(--alert); }
        .action-link.delete { color: var(--text-muted); }
    </style>
</head>
<body>

    <header>
        <div class="header-title"><span>iCHEF</span> NETWORK</div>
        <div class="subtitle">Portail Createur</div>
    </header>

    <div class="container">
        <h1 class="page-title">Base de donnees Reseau</h1>

        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Etablissement</th>
                        <th>ID Licence</th>
                        <th>Contact</th>
                        <th>Forfait</th>
                        <th>Mot de passe (PIN)</th>
                        <th>Ecrans actifs / Max</th>
                        <th>Staff Max</th>
                        <th>Statut</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody id="network-table-body">
                    <tr>
                        <td colspan="9" style="text-align:center; color:var(--text-muted); font-style:italic; padding:40px;">
                            Chargement des etablissements reseau...
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>

    <script>
        const SERVER_URL = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" || window.location.protocol === "file:") 
            ? "http://localhost:10000" : "https://tableau-system.onrender.com";

        const ADMIN_PASS = "Empire2026";

        async function loadNetworkDatabase() {
            const tbody = document.getElementById('network-table-body');
            try {
                const res = await fetch(`${SERVER_URL}/api/get-all-tenants-admin`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ masterKey: ADMIN_PASS })
                });
                const data = await res.json();
                
                if (!data.success || !data.tenants || data.tenants.length === 0) {
                    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; color:var(--text-muted); padding:40px; font-style:italic;">Aucun etablissement enregistre.</td></tr>`;
                    return;
                }

                tbody.innerHTML = data.tenants.map(client => {
                    const statusClass = client.status === 'SUSPENDU' ? 'suspended' : 'active';
                    const statusText = client.status === 'SUSPENDU' ? 'Suspendu' : 'Actif';
                    
                    return `
                    <tr>
                        <td><span class="establishment-name">${client.name}</span></td>
                        <td><span class="license-id">${client.id}</span></td>
                        <td>
                            <div class="contact-info">
                                <span>${client.email}</span>
                                <span style="color: var(--text-muted);">${client.phone}</span>
                            </div>
                        </td>
                        <td>
                            <select class="plan-selector" onchange="updateClientPlan('${client.id}', this.value)">
                                <option value="CHEF" ${client.pack === 'CHEF' || client.pack === 'CHEF_CUISINE' ? 'selected' : ''}>Chef Cuisine (19€)</option>
                                <option value="PATISSIER" ${client.pack === 'PATISSIER' || client.pack === 'CHEF_PATISSERIE' ? 'selected' : ''}>Chef Patissier (19€)</option>
                                <option value="BAR" ${client.pack === 'BAR' || client.pack === 'CHEF_BAR' ? 'selected' : ''}>Chef Barman (19€)</option>
                                <option value="BUSINESS" ${client.pack === 'BUSINESS' || client.pack === 'RENTABILITE' || client.pack === 'ECO' ? 'selected' : ''}>Business (49€)</option>
                                <option value="EMPIRE" ${client.pack === 'EMPIRE' || client.pack === 'BRIGADE' || client.pack === 'BRIGADES' || client.pack === 'PREMIUM' ? 'selected' : ''}>Empire (99€)</option>
                            </select>
                        </td>
                        <td>
                            <div class="editable-field">
                                <span>${client.pin || '9999'}</span>
                                <button class="btn-edit-inline" onclick="executeAdminAction('${client.id}', 'set_pin')">Modifier</button>
                            </div>
                        </td>
                        <td>
                            <div class="editable-field">
                                <span>${client.activeScreens} / ${client.maxScreens}</span>
                                <button class="btn-edit-inline" onclick="executeAdminAction('${client.id}', 'set_screens')">Modifier</button>
                            </div>
                        </td>
                        <td>
                            <div class="editable-field">
                                <span>${client.maxStaff}</span>
                                <button class="btn-edit-inline" onclick="executeAdminAction('${client.id}', 'set_max_staff')">Modifier</button>
                            </div>
                        </td>
                        <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                        <td>
                            <div class="actions-cell">
                                <button class="action-link" onclick="autologinClient('${client.id}')">Acceder</button>
                                <button class="action-link suspend" onclick="executeAdminAction('${client.id}', '${client.status === 'SUSPENDU' ? 'activate' : 'suspend'}')">
                                    ${client.status === 'SUSPENDU' ? 'Activer' : 'Suspendre'}
                                </button>
                                <button class="action-link delete" onclick="executeAdminAction('${client.id}', 'delete')">Supprimer</button>
                            </div>
                        </td>
                    </tr>`;
                }).join('');

            } catch (e) {
                console.error(e);
                tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; color:var(--alert); padding:40px; font-weight:500;">Erreur de liaison avec le serveur MongoDB. Veuillez verifier l API.</td></tr>`;
            }
        }

        async function updateClientPlan(tenantID, newPlan) {
            try {
                const res = await fetch(`${SERVER_URL}/api/update-plan-admin`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ masterKey: ADMIN_PASS, tenantID, newPlan })
                });
                const data = await res.json();
                if(data.success) loadNetworkDatabase();
            } catch(e) { console.error(e); }
        }

        async function executeAdminAction(tenantID, action) {
            let bodyData = { masterKey: ADMIN_PASS, tenantID, action };

            if (action === 'delete' && !confirm(`Supprimer definitivement la licence de ${tenantID} ?`)) return;
            if (action === 'suspend' && !confirm(`Suspendre la licence de ${tenantID} ?`)) return;

            if (action === 'set_pin') {
                const manualPin = prompt("Nouveau code PIN Maître :");
                if(!manualPin) return;
                bodyData.manualPin = manualPin;
            }
            if (action === 'set_screens') {
                const manualScreens = prompt("Nouvelle limite d ecrans :");
                if(!manualScreens) return;
                bodyData.manualScreens = manualScreens;
            }
            if (action === 'set_max_staff') {
                const manualMaxStaff = prompt("Nouvelle limite de personnel :");
                if(!manualMaxStaff) return;
                bodyData.manualMaxStaff = manualMaxStaff;
            }

            try {
                const res = await fetch(`${SERVER_URL}/api/admin-action`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(bodyData)
                });
                const data = await res.json();
                if(data.success) loadNetworkDatabase();
            } catch(e) { console.error(e); }
        }

        function autologinClient(tenantID) {
            window.open(`administration.html?tenantID=${tenantID}`, '_blank');
        }

        window.addEventListener('load', loadNetworkDatabase);
    </script>
</body>
</html>
