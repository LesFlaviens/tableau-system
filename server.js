<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    
    <link rel="manifest" href="manifest.json">
    <link rel="apple-touch-icon" href="icon-192.png">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="theme-color" content="#0f172a">
    <title>iCHEF OS - HACCP V7.2 · EcoLabel formats desktop · Mobile First</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" crossorigin>
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap" rel="stylesheet" media="print" onload="this.media='all'">
    <noscript><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap" rel="stylesheet"></noscript>
    <link rel="preconnect" href="https://tableau-system.onrender.com" crossorigin>
    <script async src="https://cdn.socket.io/4.7.2/socket.io.min.js" onload="if(window.ICHEF_HACCP?.authenticated &amp;&amp; typeof connectHaccpRealtime === 'function') connectHaccpRealtime()"></script>

   <script>
"use strict";

if (!["os.ichef.ch", "localhost", "127.0.0.1"].includes(window.location.hostname)
    && !window.location.hostname.includes("render.com")
    && window.location.protocol !== "file:") {
    document.documentElement.innerHTML =
        "<h1 style='color:red;text-align:center;margin-top:20%;font-family:sans-serif'>ACCÈS iCHEF OS NON AUTORISÉ</h1>";
    throw new Error("Exécution non autorisée hors du domaine officiel.");
}

document.addEventListener("contextmenu", event => event.preventDefault());

function getDeviceFingerprint() {
    let deviceId =
        localStorage.getItem("ichef_device_id") ||
        localStorage.getItem("ichef_device_fingerprint");

    if (!deviceId) {
        deviceId = (window.crypto && crypto.randomUUID)
            ? crypto.randomUUID()
            : "device_" + Math.random().toString(36).slice(2, 11) + "_" + Date.now();
    }

    localStorage.setItem("ichef_device_id", deviceId);
    localStorage.setItem("ichef_device_fingerprint", deviceId);
    return deviceId;
}

const ICHEF_PARAMS = new URLSearchParams(window.location.search);
const ICHEF_URL_TENANT = String(ICHEF_PARAMS.get("tenantID") || "").trim();
const ICHEF_STORED_TENANT = String(localStorage.getItem("ichef_tenant_id") || "").trim();

if (ICHEF_URL_TENANT && ICHEF_STORED_TENANT && ICHEF_URL_TENANT !== ICHEF_STORED_TENANT) {
    localStorage.removeItem("EMPIRE_HACCP_SYNC_" + ICHEF_STORED_TENANT);
    sessionStorage.removeItem("ichef_access_token");
    sessionStorage.removeItem("ichef_csrf_token");
}

const ICHEF_TENANT_ID = ICHEF_URL_TENANT || ICHEF_STORED_TENANT;

if (!ICHEF_TENANT_ID) {
    window.location.replace("connexionpartenaire.html");
} else {
    localStorage.setItem("ichef_tenant_id", ICHEF_TENANT_ID);
}

localStorage.removeItem("ichef_master_pin");
localStorage.removeItem("pin");

window.ICHEF_HACCP = {
    tenantID: ICHEF_TENANT_ID,
    deviceId: getDeviceFingerprint(),
    authenticated: false,
    role: "",
    userName: "",
    socket: null
};
</script>

    <style>
        :root { --bg: #050505; --gold: #ffb300; --accent: #00e676; --alert: #ff1744; --panel: #111; --ordered: #2979ff;}
        body { background: var(--bg); color: #fff; font-family: 'Inter', sans-serif; margin: 0; display: flex; flex-direction: column; height: 100vh; overflow: hidden; touch-action: manipulation; }
        
        /* NAVIGATION */
        .nav-haccp { background: var(--panel); padding: 10px 20px; display: flex; gap: 10px; border-bottom: 1px solid #333; align-items: center; z-index: 100; flex-wrap: wrap;}
        .nav-btn { background: transparent; border: 1px solid #333; color: #888; padding: 10px 15px; cursor: pointer; font-weight: bold; border-radius: 4px; font-size: 0.75rem; text-transform: uppercase; transition: 0.2s;}
        .nav-btn.active { border-color: var(--gold); color: var(--gold); background: rgba(255, 179, 0, 0.05); }

        .admin-return { border-color: var(--alert) !important; color: #ff637a !important; }
        .admin-return:hover { background: rgba(255,23,68,.08) !important; }
        .sync-pill {
            border:1px solid #333; color:#888; padding:8px 11px; border-radius:999px;
            font-size:.68rem; font-weight:900; white-space:nowrap;
        }
        .sync-pill.online { color:var(--accent); border-color:rgba(0,230,118,.45); }
        .sync-pill.degraded { color:var(--gold); border-color:rgba(255,179,0,.45); }

        .reg-profile-pill {
            border:1px solid #333;
            color:#cbd5e1;
            padding:8px 11px;
            border-radius:999px;
            font-size:.68rem;
            font-weight:900;
            white-space:nowrap;
            background:rgba(255,255,255,.025);
        }
        .reg-profile-pill.fr { color:#60a5fa; border-color:rgba(96,165,250,.45); }
        .reg-profile-pill.ch { color:#ff6b6b; border-color:rgba(255,107,107,.45); }
        .reg-profile-pill.eu { color:#facc15; border-color:rgba(250,204,21,.45); }
        .reg-profile-pill.intl { color:#c4b5fd; border-color:rgba(196,181,253,.45); }

        .regulatory-banner {
            display:flex;
            align-items:flex-start;
            justify-content:space-between;
            gap:18px;
            padding:14px 16px;
            border:1px solid #2d3748;
            border-radius:10px;
            background:linear-gradient(135deg, rgba(15,23,42,.92), rgba(10,10,10,.92));
            box-shadow:0 8px 24px rgba(0,0,0,.18);
        }
        .regulatory-banner-main { min-width:0; }
        .regulatory-banner-kicker {
            color:var(--gold); font-size:.66rem; font-weight:900; letter-spacing:1.2px;
            text-transform:uppercase; margin-bottom:4px;
        }
        .regulatory-banner-title { font-size:.98rem; font-weight:900; color:#fff; }
        .regulatory-banner-text { margin-top:5px; color:#9ca3af; font-size:.74rem; line-height:1.45; }
        .regulatory-banner-authority { margin-top:4px; color:#64748b; font-size:.68rem; line-height:1.4; }
        .regulatory-country-chip {
            flex:0 0 auto; border:1px solid #334155; border-radius:8px; padding:9px 12px;
            min-width:112px; text-align:center; font-size:.72rem; font-weight:900; letter-spacing:.8px;
        }
        .regulatory-country-chip.fr { color:#60a5fa; border-color:rgba(96,165,250,.5); background:rgba(96,165,250,.06); }
        .regulatory-country-chip.ch { color:#ff7b7b; border-color:rgba(255,123,123,.5); background:rgba(255,123,123,.06); }
        .regulatory-country-chip.eu { color:#facc15; border-color:rgba(250,204,21,.5); background:rgba(250,204,21,.06); }
        .regulatory-country-chip.intl { color:#c4b5fd; border-color:rgba(196,181,253,.5); background:rgba(196,181,253,.06); }

        .login-reg-profile {
            margin:12px auto 0;
            width:min(520px, calc(100vw - 40px));
            color:#94a3b8;
            border:1px solid #273244;
            background:rgba(15,23,42,.55);
            border-radius:9px;
            padding:10px 14px;
            text-align:center;
            font-size:.72rem;
            font-weight:800;
            line-height:1.45;
        }



        .pad-link { display: none; padding: 10px 20px; border-radius: 4px; border: 2px solid; font-weight: 900; font-size: 0.8rem; cursor: pointer; background: #000; text-transform: uppercase; }
        .pad-link.cuisine { border-color: var(--gold); color: var(--gold); }
        .pad-link.patisserie { border-color: #f472b6; color: #f472b6; }
        .pad-link.bar { border-color: #00e5ff; color: #00e5ff; }
        .pad-link.service { border-color: #2979ff; color: #2979ff; }

        .content { flex: 1; padding: 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 20px; }
        .module { display: none; flex-direction: column; gap: 20px; height: 100%; }
        .module.active { display: flex; }
        
        .card { background: var(--panel); border-radius: 8px; padding: 15px; border: 1px solid #222; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
        
        .input-group { display: flex; flex-direction: column; gap: 8px; }
        input, select { background: #000; border: 1px solid #333; color: #fff; padding: 12px; border-radius: 4px; font-size: 1rem; width: 100%; box-sizing: border-box; outline: none; }
        input:focus { border-color: var(--gold); }
        
        /* BOUTONS CATALOGUE ET GOMME */
        .input-row { display: flex; gap: 10px; align-items: stretch; width: 100%; }
        .input-row input { flex: 1; min-width: 0; }
        
        .btn-clear { background: #1a1a1a; border: 1px solid #333; color: var(--alert); padding: 0 15px; border-radius: 4px; font-weight: 900; cursor: pointer; font-size: 1.2rem; transition: 0.2s; display: flex; align-items: center; justify-content: center;}
        .btn-clear:active { background: var(--alert); color: #fff; border-color: var(--alert); }

        .btn-catalog { background: #222; border: 1px solid #444; color: var(--gold); padding: 0 20px; border-radius: 4px; font-weight: 900; cursor: pointer; text-transform: uppercase; font-size: 0.8rem; white-space: nowrap; transition: 0.2s;}
        .btn-catalog:active { background: var(--gold); color: #000; }

        /* BOUTON PHOTO PERSONNALISÉ */
        .btn-file { background: #1a1a1a; border: 1px solid #333; color: #fff; padding: 12px; border-radius: 4px; font-size: 1rem; text-align: center; cursor: pointer; transition: 0.2s; display: block; box-sizing: border-box; font-weight: bold; }
        .btn-file.has-file { background: rgba(0, 230, 118, 0.1); border-color: var(--accent); color: var(--accent); }
        .btn-view-photo { background: #222; border: 1px solid #444; color: var(--ordered); cursor: pointer; padding: 6px 12px; border-radius: 4px; font-weight: bold; transition: 0.2s; }
        .btn-view-photo:active { background: var(--ordered); color: #fff; }

        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th { text-align: left; color: #555; font-size: 0.7rem; text-transform: uppercase; padding: 10px; border-bottom: 1px solid #333; }
        td { padding: 12px 10px; border-bottom: 1px solid #111; font-size: 0.85rem; vertical-align: middle; }
        
        .status-badge { padding: 4px 8px; border-radius: 4px; font-size: 0.7rem; font-weight: 900; text-transform: uppercase; }
        .status-ok { color: var(--accent); border: 1px solid var(--accent); background: rgba(0, 230, 118, 0.1); }
        .status-danger { color: var(--alert); border: 1px solid var(--alert); background: rgba(255, 23, 68, 0.1); }

        .btn-empire { background: var(--gold); color: #000; border: none; padding: 15px; font-weight: 900; border-radius: 4px; cursor: pointer; text-transform: uppercase; transition: 0.2s; }
        .btn-empire:active { transform: scale(0.98); }
        .btn-rectify { background: #222; border: 1px solid #444; color: #ccc; padding: 6px 10px; font-size: 0.7rem; border-radius: 4px; cursor: pointer; font-weight: bold; width: 100%; text-align: center;}
        
        .audit-trail { font-size: 0.65rem; color: #666; font-style: italic; margin-top: 5px; display: block; }
        .rectified-text { color: var(--gold); font-weight: bold; }
        .strikethrough { text-decoration: line-through; opacity: 0.5; }

        /* LOGIN SCREEN (PORTAIL) AVEC DESIGN iCHEF PREMIUM */
        #login-screen { 
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; 
            background: radial-gradient(circle at top, #1a202c 0%, #050505 80%); 
            z-index: 60000; display: flex; flex-direction: column; align-items: center; justify-content: center; 
        }
        .logo-container { display: flex; flex-direction: column; align-items: center; margin-bottom: 40px; }
        .ichef-logo { max-width: 200px; height: auto; margin-bottom: 15px; filter: drop-shadow(0px 4px 10px rgba(0,0,0,0.5)); }
        .ichef-title { color: var(--gold); font-size: 2.8rem; font-weight: 900; letter-spacing: 2px; margin: 0; }
        .ichef-subtitle { font-size: 1.5rem; color: #fff; font-weight: 900; letter-spacing: 4px; margin-top: 5px; }
        
        .dept-choice-btn { background: #111; border: 2px solid #333; border-radius: 12px; padding: 25px; font-size: 1.3rem; font-weight: 900; color: #fff; cursor: pointer; width: 200px; text-align: center; transition: 0.2s; }
        .dept-choice-btn.cuisine { border-color: var(--gold); color: var(--gold); }
        .dept-choice-btn.patisserie { border-color: #f472b6; color: #f472b6; }
        .dept-choice-btn.bar { border-color: #00e5ff; color: #00e5ff; }
        .dept-choice-btn.service { border-color: #2979ff; color: #2979ff; }
        
        .pin-pad { display: grid; grid-template-columns: repeat(3, 85px); gap: 15px; margin-top: 20px; }
        .pin-btn { background: #1a1a1a; border: 1px solid #333; color: #fff; font-size: 1.8rem; font-weight: bold; width: 85px; height: 85px; border-radius: 50%; cursor: pointer; }
        .pin-display { font-size: 2.5rem; letter-spacing: 12px; margin-bottom: 20px; color: var(--gold); min-height: 45px;}
        
        .dlc-alert { background: rgba(255, 23, 68, 0.1); border-left: 4px solid var(--alert); }

        /* MODALS */
        .modal { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.95); z-index: 50000; display: none; flex-direction: column; align-items: center; justify-content: center; }
        .modal.open { display: flex !important; }
        .catalog-box { background: #111; border: 2px solid #333; padding: 30px; border-radius: 8px; width: 800px; max-width: 95%; max-height: 85vh; display: flex; flex-direction: column; }
        #catalog-content { flex: 1; overflow-y: auto; padding-right: 15px; margin-top: 5px; }
        
        #catalog-search { margin-bottom: 15px; font-size: 1.2rem; padding: 15px; border-color: var(--ordered); background: #0a0a0a; }
        
        .catalog-folder-title { color: var(--gold); font-size: 1.2rem; font-weight: 900; margin: 15px 0 5px 0; border-bottom: 1px solid #333; padding-bottom: 10px; text-transform: uppercase; cursor: pointer; display: flex; justify-content: space-between; align-items: center; transition: 0.2s;}
        .catalog-folder-title:hover { background: #1a1a1a; padding-left: 10px; border-radius: 4px; }
        .folder-icon { font-size: 1rem; color: #555; }
        
        .catalog-grid { display: none; flex-wrap: wrap; gap: 10px; margin-top: 10px; margin-bottom: 15px; }
        .catalog-item { background: #222; border: 1px solid #444; padding: 12px 20px; border-radius: 6px; font-weight: bold; cursor: pointer; transition: 0.2s; display: flex; align-items: center; gap: 10px; }
        .catalog-item:active { background: var(--gold); color: #000; }
        
        .catalog-action { font-size: 1rem; cursor: pointer; padding: 4px 8px; border-radius: 4px; display: flex; align-items: center; justify-content: center; transition: 0.2s; }
        .catalog-action.print { background: rgba(41, 121, 255, 0.2); color: var(--ordered); border: 1px solid var(--ordered); }
        .catalog-action.print:active { background: var(--ordered); color: #fff; }
        .catalog-action.del { background: rgba(255, 23, 68, 0.1); color: var(--alert); border: 1px solid var(--alert); }
        .catalog-action.del:active { background: var(--alert); color: #fff; }

        /* BOUTONS GESTION DOSSIERS CATALOGUE */
        .folder-admin-actions { display: flex; gap: 10px; margin-bottom: 10px; width: 100%; }
        .btn-folder-edit { flex:1; background: transparent; border: 1px solid #555; color: #aaa; padding: 8px; border-radius: 4px; font-size: 0.75rem; cursor: pointer; font-weight: bold; text-align: center; transition: 0.2s;}
        .btn-folder-edit:hover { background: #222; color: #fff; border-color: #888; }
        .btn-folder-del { flex:1; background: rgba(255, 23, 68, 0.1); border: 1px solid var(--alert); color: var(--alert); padding: 8px; border-radius: 4px; font-size: 0.75rem; cursor: pointer; font-weight: bold; text-align: center; transition: 0.2s;}
        .btn-folder-del:hover { background: var(--alert); color: #fff; }

        /* CSS ARCHIVES 5 ANS */
        .archive-folder { padding: 10px; border-bottom: 1px solid #222; cursor: pointer; color: #aaa; font-size: 0.9rem; }
        .archive-folder:active { color: var(--gold); background: #111; }
        .archive-folder.active { color: var(--gold); font-weight: bold; border-left: 3px solid var(--gold); background: #111; }
        .btn-backup { background: transparent; border: 1px solid #555; color: #aaa; padding: 10px; border-radius: 4px; font-size: 0.7rem; cursor: pointer; font-weight: bold; text-align: center; }

        /* MASQUER L'INTERFACE PENDANT L'IMPRESSION */
        #print-report { display: none; }
        @media print {
            body { background: #fff !important; color: #000 !important; margin: 0; padding: 0; }
            body > *:not(#print-report) { display: none !important; }
            #print-report { display: block !important; width: 100%; }
        }

        /* ----- MOTEUR RESPONSIVE POUR SMARTPHONE ----- */
        @media (max-width: 768px) {
            .nav-haccp { padding: 10px; overflow-x: auto; flex-wrap: nowrap; -webkit-overflow-scrolling: touch; }
            .nav-btn, .pad-link { flex: 0 0 auto; white-space: nowrap; font-size: 0.75rem; padding: 10px 12px; }
            .content { padding: 10px; }
            .grid { grid-template-columns: 1fr; }
            .input-row { flex-wrap: wrap; }
            .input-row input { flex: 1 1 100%; margin-bottom: 8px; }
            .input-row button { flex: 1 1 auto; }
            .pin-pad { grid-template-columns: repeat(3, 75px); gap: 12px; }
            .pin-btn { width: 75px; height: 75px; font-size: 1.5rem; }
            .dept-choice-btn { width: 100%; max-width: 280px; padding: 15px; font-size: 1.1rem; }
            
            .archive-layout { flex-direction: column !important; height: auto !important; }
            .archive-layout > .card { flex: none !important; max-height: 350px; overflow-y: auto; }
            
            .card[style*="overflow:auto"] { padding: 0; border: none; }
            table { min-width: 600px; } /* Force scroll horizontal sur mobile */
            th, td { white-space: nowrap; padding: 10px; font-size: 0.8rem; }
            .btn-empire { padding: 12px; font-size: 0.9rem; }
            
            .catalog-box { padding: 15px; }
            #catalog-search { font-size: 1rem; padding: 10px; }
        }
    </style>

<style id="ichef-haccp-pro-v4">
:root{
  --bg:#07090d;
  --panel:#0d1117;
  --panel-2:#111722;
  --border-pro:#1e293b;
  --border-soft:#172033;
  --gold:#d7ad58;
  --accent:#3dd6a0;
  --alert:#ff647c;
  --ordered:#6c94ff;
  --text-main:#f8fafc;
  --text-muted-pro:#8b98aa;
}
body{
  background:
    radial-gradient(circle at 12% 0%, rgba(215,173,88,.075), transparent 24%),
    radial-gradient(circle at 88% 10%, rgba(108,148,255,.055), transparent 25%),
    var(--bg);
}
.nav-haccp{
  background:rgba(10,14,20,.96)!important;
  border-bottom:1px solid var(--border-pro)!important;
  box-shadow:0 8px 30px rgba(0,0,0,.22);
  padding:10px 14px!important;
  backdrop-filter:blur(14px);
}
.haccp-brand-mini{
  display:flex; align-items:center; gap:8px; padding:8px 11px;
  border:1px solid var(--border-pro); border-radius:10px;
  color:#fff; font-size:.72rem; font-weight:950; letter-spacing:.9px; white-space:nowrap;
}
.haccp-brand-mini span{color:var(--gold);font-weight:900}
.nav-btn,.pad-link{
  border-radius:9px!important;
  font-size:.69rem!important;
  letter-spacing:.45px;
  border-color:#263143!important;
  background:rgba(255,255,255,.018)!important;
}
.nav-btn:hover,.pad-link:hover{background:rgba(255,255,255,.045)!important;color:#fff!important}
.nav-btn.active{
  background:rgba(215,173,88,.10)!important;
  border-color:rgba(215,173,88,.55)!important;
  color:var(--gold)!important;
  box-shadow:inset 0 0 0 1px rgba(215,173,88,.05);
}
.content{gap:14px!important;padding:16px!important}
.card{
  background:linear-gradient(180deg,rgba(17,23,34,.96),rgba(11,15,22,.98))!important;
  border:1px solid var(--border-pro)!important;
  border-radius:16px!important;
  box-shadow:0 14px 36px rgba(0,0,0,.18)!important;
}
input,select,textarea{
  border-radius:9px!important;
  border-color:#283549!important;
  background:#090d13!important;
  color:#f8fafc!important;
}
input:focus,select:focus,textarea:focus{
  border-color:rgba(215,173,88,.75)!important;
  box-shadow:0 0 0 3px rgba(215,173,88,.09)!important;
  outline:none!important;
}
.btn-empire,.btn-catalog,.btn-backup,.btn-rectify{
  border-radius:9px!important;
  letter-spacing:.35px;
}
.btn-empire{
  background:linear-gradient(135deg,#e0b85f,#bd8d34)!important;
  color:#090b0f!important;
  border:none!important;
  box-shadow:0 8px 18px rgba(215,173,88,.14);
}
table{border-collapse:separate!important;border-spacing:0!important}
thead th{
  position:sticky;top:0;z-index:3;
  background:#111722!important;
  color:#9aa7b8!important;
  font-size:.67rem!important;
  letter-spacing:.55px;
  border-bottom:1px solid #273246!important;
}
tbody td{border-bottom:1px solid #182131!important}
tbody tr:hover td{background:rgba(255,255,255,.018)}
.regulatory-banner{
  border-radius:14px!important;
  border-color:var(--border-pro)!important;
  background:linear-gradient(135deg,rgba(17,23,34,.98),rgba(10,14,20,.98))!important;
}
.sync-pill,.reg-profile-pill{background:rgba(255,255,255,.025)}

/* INVENTAIRE PRO */
.inventory-pro-shell{display:flex;flex-direction:column;gap:14px;height:100%;min-height:0}
.inventory-pro-head{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}
.inventory-pro-title{margin:0;color:#fff;font-size:1rem;font-weight:950;letter-spacing:.25px}
.inventory-pro-subtitle{margin-top:5px;color:#8190a4;font-size:.72rem;line-height:1.45}
.inventory-actions{display:flex;gap:8px;flex-wrap:wrap}
.inventory-secondary-btn{
  background:#0c1119;border:1px solid #2a374a;color:#d6deea;
  border-radius:9px;padding:9px 12px;font-size:.69rem;font-weight:900;cursor:pointer
}
.inventory-secondary-btn:hover{border-color:rgba(215,173,88,.55);color:var(--gold)}
.inventory-kpis{
  display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px
}
.inventory-kpi{
  background:#090e15;border:1px solid #1c2737;border-radius:12px;padding:13px 14px;min-width:0
}
.inventory-kpi-label{font-size:.63rem;color:#738197;text-transform:uppercase;font-weight:900;letter-spacing:.7px}
.inventory-kpi-value{margin-top:7px;color:#fff;font-size:1.18rem;font-weight:950;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.inventory-kpi-note{margin-top:4px;color:#5f6d80;font-size:.66rem}
.inventory-count-grid{
  display:grid;grid-template-columns:minmax(220px,1.55fr) minmax(120px,.55fr) minmax(220px,1fr);gap:12px;align-items:end
}
.inventory-product-preview{
  display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:12px
}
.inv-mini{
  background:#0a0f17;border:1px solid #1c2737;border-radius:10px;padding:10px 11px;min-width:0
}
.inv-mini-label{font-size:.59rem;text-transform:uppercase;color:#69788e;font-weight:900;letter-spacing:.6px}
.inv-mini-value{margin-top:5px;color:#eef3f9;font-size:.78rem;font-weight:850;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.inv-product-status{
  display:inline-flex;align-items:center;gap:6px;margin-top:10px;padding:6px 9px;border-radius:999px;
  font-size:.63rem;font-weight:900;border:1px solid #283548;color:#8290a4
}
.inv-product-status.ok{color:var(--accent);border-color:rgba(61,214,160,.35);background:rgba(61,214,160,.055)}
.inv-product-status.missing{color:var(--alert);border-color:rgba(255,100,124,.35);background:rgba(255,100,124,.055)}
.money-positive{color:var(--ordered)!important}.money-negative{color:var(--alert)!important}.money-zero{color:var(--accent)!important}
.inventory-table-wrap{flex:1;min-height:0;overflow:auto;border-radius:13px;border:1px solid #1c2737}
.inventory-table-wrap table{margin:0!important}
.inventory-table-wrap td{vertical-align:middle}
.inv-product-name{font-weight:900;color:#f7f9fc}
.inv-product-meta{margin-top:3px;color:#6f7d91;font-size:.65rem}
.inv-money{font-weight:950;white-space:nowrap}
.inv-stock-value{font-size:.79rem;font-weight:900;color:#dfe7f2;white-space:nowrap}
.inventory-system-note{
  display:flex;align-items:flex-start;gap:9px;margin-top:10px;padding:9px 11px;border-radius:9px;
  border:1px solid rgba(108,148,255,.22);background:rgba(108,148,255,.045);color:#8fa7d9;font-size:.68rem;line-height:1.4
}
@media(max-width:1050px){
  .inventory-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}
  .inventory-count-grid{grid-template-columns:1fr 1fr}
  .inventory-count-grid .inventory-submit-cell{grid-column:1/-1}
  .inventory-product-preview{grid-template-columns:repeat(2,minmax(0,1fr))}
}
@media(max-width:700px){
  .content{padding:10px!important}
  .inventory-kpis,.inventory-count-grid,.inventory-product-preview{grid-template-columns:1fr}
  .inventory-count-grid .inventory-submit-cell{grid-column:auto}
  .inventory-table-wrap{overflow-x:auto}
  .inventory-table-wrap table{min-width:950px}
  .regulatory-banner{flex-direction:column}
}
</style>


<style id="ichef-haccp-v41-build-style">
#ichef-haccp-v41-build{
    position:fixed;
    right:12px;
    bottom:12px;
    z-index:999999;
    padding:7px 10px;
    border:1px solid rgba(61,214,160,.45);
    border-radius:999px;
    background:rgba(4,10,14,.94);
    color:#3dd6a0;
    font:900 10px/1.1 Inter,Arial,sans-serif;
    letter-spacing:.7px;
    box-shadow:0 8px 24px rgba(0,0,0,.28);
    pointer-events:none;
}
</style>


<style id="ichef-haccp-mobile-v42">
/* ============================================================
   iCHEF HACCP PRO V4.2 — SMARTPHONE / TABLETTE
   Couche responsive uniquement : aucune logique réseau modifiée.
   ============================================================ */
html, body { width:100%; max-width:100%; }
body { min-height:100vh; min-height:100dvh; }
button, input, select, textarea { font-family:inherit; }
button { -webkit-tap-highlight-color:transparent; }

@supports (height: 100dvh) {
  body { height:100dvh; }
  #login-screen { height:100dvh; }
}

@media (max-width: 820px) {
  body {
    overflow:hidden;
    overscroll-behavior:none;
  }

  /* ÉCRAN PIN / CHOIX SERVICE */
  #login-screen {
    box-sizing:border-box;
    justify-content:flex-start !important;
    overflow-y:auto;
    overflow-x:hidden;
    padding:
      max(22px, env(safe-area-inset-top))
      14px
      max(26px, env(safe-area-inset-bottom));
    -webkit-overflow-scrolling:touch;
  }
  .logo-container {
    margin:12px 0 20px !important;
    flex:0 0 auto;
  }
  .ichef-title { font-size:clamp(2rem, 10vw, 2.65rem) !important; }
  .ichef-subtitle { font-size:1rem !important; letter-spacing:3px !important; }
  .login-reg-profile {
    width:min(100%, 520px) !important;
    box-sizing:border-box;
    font-size:.68rem !important;
    margin-top:10px !important;
  }
  #login-step-1 {
    width:100%;
    max-width:520px !important;
    display:grid !important;
    grid-template-columns:1fr !important;
    gap:10px !important;
    padding-bottom:10px;
  }
  #login-step-2 {
    width:100%;
    max-width:430px;
    box-sizing:border-box;
    padding-bottom:12px;
  }
  #login-instruction {
    text-align:center;
    font-size:clamp(1.05rem, 5.4vw, 1.35rem) !important;
    line-height:1.25;
    margin:4px 0 8px !important;
  }
  .dept-choice-btn {
    width:100% !important;
    max-width:none !important;
    min-height:54px;
    padding:14px 16px !important;
    border-radius:12px !important;
    font-size:.94rem !important;
  }
  .pin-display {
    font-size:2rem !important;
    letter-spacing:8px !important;
    min-height:38px !important;
    margin:5px 0 10px !important;
    text-align:center;
  }
  .pin-pad {
    width:min(100%, 310px);
    grid-template-columns:repeat(3, minmax(0, 1fr)) !important;
    gap:10px !important;
    margin:10px auto 0 !important;
  }
  .pin-btn {
    width:min(22vw, 76px) !important;
    height:min(22vw, 76px) !important;
    min-width:60px;
    min-height:60px;
    justify-self:center;
    font-size:1.45rem !important;
    touch-action:manipulation;
  }
  #login-step-2 .nav-btn {
    min-height:46px;
    padding:11px 15px !important;
  }

  /* NAVIGATION MOBILE */
  .nav-haccp {
    position:sticky;
    top:0;
    z-index:1000;
    width:100%;
    box-sizing:border-box;
    display:flex !important;
    flex-wrap:nowrap !important;
    align-items:center;
    gap:7px !important;
    padding:
      8px
      max(9px, env(safe-area-inset-right))
      8px
      max(9px, env(safe-area-inset-left)) !important;
    overflow-x:auto !important;
    overflow-y:hidden;
    scrollbar-width:none;
    -ms-overflow-style:none;
    scroll-snap-type:x proximity;
    -webkit-overflow-scrolling:touch;
  }
  .nav-haccp::-webkit-scrollbar { display:none; }
  .haccp-brand-mini,
  .nav-btn,
  .pad-link,
  .sync-pill,
  .reg-profile-pill {
    flex:0 0 auto !important;
    scroll-snap-align:start;
  }
  .haccp-brand-mini {
    min-height:42px;
    font-size:.65rem !important;
    padding:7px 9px !important;
  }
  .nav-btn, .pad-link {
    min-height:42px;
    padding:9px 11px !important;
    font-size:.64rem !important;
    border-radius:9px !important;
  }
  .sync-pill, .reg-profile-pill {
    min-height:38px;
    box-sizing:border-box;
    display:flex;
    align-items:center;
    font-size:.60rem !important;
    padding:7px 9px !important;
  }

  /* CONTENU */
  .content {
    box-sizing:border-box;
    width:100%;
    min-width:0;
    padding:
      10px
      max(10px, env(safe-area-inset-right))
      max(14px, env(safe-area-inset-bottom))
      max(10px, env(safe-area-inset-left)) !important;
    gap:10px !important;
    overflow-y:auto !important;
    overflow-x:hidden !important;
    -webkit-overflow-scrolling:touch;
  }
  .module {
    width:100%;
    min-width:0;
    height:auto !important;
    min-height:0;
    gap:10px !important;
  }
  .card {
    width:100%;
    min-width:0;
    box-sizing:border-box;
    border-radius:13px !important;
    padding:13px !important;
  }
  .grid { grid-template-columns:1fr !important; gap:10px !important; }
  .input-row {
    display:grid !important;
    grid-template-columns:1fr !important;
    gap:9px !important;
  }
  .input-row > * { width:100% !important; box-sizing:border-box; margin:0 !important; }
  input, select, textarea {
    width:100%;
    box-sizing:border-box;
    min-height:46px;
    font-size:16px !important; /* évite le zoom automatique iPhone */
  }
  textarea { min-height:90px; }
  .btn-empire, .btn-file, .btn-backup, .btn-catalog {
    min-height:46px;
    width:100%;
    box-sizing:border-box;
    font-size:.78rem !important;
  }

  /* RÉFÉRENTIEL */
  .regulatory-banner {
    flex-direction:column !important;
    gap:10px !important;
    padding:12px !important;
  }
  .regulatory-banner-main { width:100%; }
  .regulatory-banner-title { font-size:.88rem !important; }
  .regulatory-banner-text,
  .regulatory-banner-authority { font-size:.67rem !important; }
  .regulatory-country-chip {
    width:100%;
    box-sizing:border-box;
    min-width:0 !important;
  }

  /* INVENTAIRE MOBILE */
  .inventory-pro-shell { gap:10px !important; height:auto !important; }
  .inventory-pro-head { align-items:stretch !important; }
  .inventory-pro-title { font-size:.91rem !important; line-height:1.3; }
  .inventory-pro-subtitle { font-size:.68rem !important; }
  .inventory-actions {
    display:grid !important;
    width:100%;
    grid-template-columns:1fr !important;
  }
  .inventory-secondary-btn { min-height:44px; width:100%; }
  .inventory-kpis {
    grid-template-columns:repeat(2,minmax(0,1fr)) !important;
    gap:8px !important;
  }
  .inventory-kpi { padding:11px !important; }
  .inventory-kpi-label { font-size:.56rem !important; }
  .inventory-kpi-value { font-size:.98rem !important; }
  .inventory-kpi-note { font-size:.59rem !important; }
  .inventory-count-grid {
    grid-template-columns:1fr !important;
    gap:9px !important;
  }
  .inventory-count-grid .inventory-submit-cell { grid-column:auto !important; }
  .inventory-product-preview {
    grid-template-columns:repeat(2,minmax(0,1fr)) !important;
    gap:7px !important;
  }
  .inv-mini { padding:9px !important; }
  .inventory-system-note { font-size:.63rem !important; }
  .inventory-table-wrap {
    width:100%;
    max-width:100%;
    overflow:auto !important;
    border-radius:11px !important;
    -webkit-overflow-scrolling:touch;
  }
  .inventory-table-wrap table { min-width:860px !important; }
  .inventory-table-wrap th,
  .inventory-table-wrap td { padding:9px 8px !important; font-size:.72rem !important; }
  .inventory-table-wrap th:first-child,
  .inventory-table-wrap td:first-child {
    position:sticky;
    left:0;
    z-index:2;
    background:#0d131d !important;
    box-shadow:6px 0 12px rgba(0,0,0,.15);
  }
  .inventory-table-wrap th:first-child { z-index:5; background:#111722 !important; }

  /* TABLEAUX HACCP */
  .card[style*="overflow:auto"],
  .card[style*="overflow: auto"] {
    overflow:auto !important;
    -webkit-overflow-scrolling:touch;
  }
  table { min-width:720px; }
  th, td { font-size:.72rem !important; padding:9px 8px !important; }

  /* ARCHIVES */
  .archive-layout {
    display:flex !important;
    flex-direction:column !important;
    height:auto !important;
    gap:10px !important;
  }
  .archive-layout > .card {
    flex:none !important;
    width:100% !important;
    max-height:none !important;
  }

  /* MODALES : comportement type bottom-sheet */
  .modal {
    justify-content:flex-end !important;
    padding-top:max(10px, env(safe-area-inset-top));
    box-sizing:border-box;
  }
  .catalog-box {
    width:100% !important;
    max-width:100% !important;
    max-height:90dvh !important;
    border-radius:18px 18px 0 0 !important;
    padding:16px !important;
    box-sizing:border-box;
  }
  #catalog-search { font-size:16px !important; min-height:46px; }
  .catalog-grid { display:none; grid-template-columns:1fr !important; }
  .catalog-item { min-height:44px; padding:11px 13px !important; }

  /* Le marqueur de test ne doit pas masquer les boutons du téléphone */
  #ichef-haccp-v41-build {
    right:7px !important;
    bottom:max(7px, env(safe-area-inset-bottom)) !important;
    font-size:8px !important;
    padding:5px 7px !important;
    opacity:.72;
  }
}

@media (max-width: 430px) {
  .inventory-kpis { grid-template-columns:1fr 1fr !important; }
  .inventory-product-preview { grid-template-columns:1fr !important; }
  .pin-pad { width:min(100%, 282px); }
  .pin-btn {
    width:min(21vw, 70px) !important;
    height:min(21vw, 70px) !important;
    min-width:58px;
    min-height:58px;
  }
  .haccp-brand-mini span { display:none; }
}

@media (max-width: 360px) {
  .inventory-kpis { grid-template-columns:1fr !important; }
  .pin-btn {
    width:62px !important;
    height:62px !important;
  }
  .pin-pad { width:236px; gap:8px !important; }
  .nav-btn, .pad-link { padding:8px 9px !important; }
}
</style>


<style id="ichef-inventory-kpi-interaction-v43">
.inventory-kpi-action{
  position:relative;
  cursor:pointer;
  user-select:none;
  -webkit-user-select:none;
  touch-action:pan-y;
  overflow:hidden;
  transition:border-color .18s ease, background .18s ease, transform .12s ease;
  outline:none;
}
.inventory-kpi-action:hover{border-color:#33445b}
.inventory-kpi-action:focus-visible{
  border-color:rgba(215,173,88,.85)!important;
  box-shadow:0 0 0 3px rgba(215,173,88,.12)!important;
}
.inventory-kpi-action.is-pressing{
  border-color:rgba(215,173,88,.70)!important;
  background:linear-gradient(180deg,rgba(215,173,88,.07),#090e15)!important;
}
.inventory-kpi-action.is-long-fired{
  border-color:rgba(61,214,160,.70)!important;
  transform:scale(.985);
}
.inventory-kpi-action::after{
  content:"";
  position:absolute;
  left:0; bottom:0;
  height:3px;
  width:0;
  background:linear-gradient(90deg,var(--gold),var(--accent));
  opacity:0;
}
.inventory-kpi-action.is-pressing::after{
  opacity:1;
  animation:inventoryHoldProgress .9s linear forwards;
}
@keyframes inventoryHoldProgress{from{width:0}to{width:100%}}
.inventory-kpi-hint{
  margin-top:8px;
  padding-top:7px;
  border-top:1px solid rgba(255,255,255,.055);
  color:#58687e;
  font-size:.57rem;
  font-weight:850;
  letter-spacing:.25px;
}
.inventory-kpi-sheet{
  position:fixed;
  inset:0;
  z-index:1000000;
  display:none;
  align-items:center;
  justify-content:center;
  padding:18px;
  box-sizing:border-box;
}
.inventory-kpi-sheet.open{display:flex}
.inventory-kpi-sheet-backdrop{
  position:absolute;
  inset:0;
  background:rgba(0,0,0,.66);
  backdrop-filter:blur(5px);
}
.inventory-kpi-sheet-card{
  position:relative;
  z-index:1;
  width:min(520px,100%);
  box-sizing:border-box;
  border:1px solid #263449;
  border-radius:18px;
  background:linear-gradient(180deg,#121925,#0b1018);
  box-shadow:0 28px 80px rgba(0,0,0,.48);
  padding:20px;
  color:#f8fafc;
}
.inventory-kpi-sheet-handle{display:none}
.inventory-kpi-sheet-top{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
.inventory-kpi-sheet-kicker{color:var(--gold);font-size:.59rem;font-weight:950;letter-spacing:1px}
.inventory-kpi-sheet-card h3{margin:5px 0 0;font-size:1.05rem}
.inventory-kpi-sheet-close{
  width:38px;height:38px;border-radius:10px;border:1px solid #2c394d;
  background:#0a0f16;color:#a8b4c5;font-size:1.4rem;cursor:pointer
}
.inventory-kpi-sheet-value{margin-top:18px;font-size:1.75rem;font-weight:950;color:#fff}
.inventory-kpi-sheet-description{margin-top:9px;color:#a3afbf;font-size:.78rem;line-height:1.55}
.inventory-kpi-sheet-formula{
  margin-top:13px;padding:12px;border-radius:10px;border:1px solid rgba(108,148,255,.22);
  background:rgba(108,148,255,.055);color:#a9bce7;font-size:.72rem;line-height:1.5
}
.inventory-kpi-sheet-tip{
  margin-top:12px;padding:10px 12px;border-radius:10px;background:#0a0f16;border:1px solid #1d2939;
  color:#77869a;font-size:.68rem;line-height:1.5
}
.inventory-kpi-sheet-go{
  width:100%;min-height:48px;margin-top:15px;border:1px solid rgba(215,173,88,.5);border-radius:10px;
  background:rgba(215,173,88,.08);color:var(--gold);font-size:.72rem;font-weight:950;letter-spacing:.55px;cursor:pointer
}
.inventory-kpi-sheet-go:hover{background:rgba(215,173,88,.13)}
#inventory-count-register.inventory-target-flash{
  animation:inventoryTargetFlash 1.15s ease 2;
}
@keyframes inventoryTargetFlash{
  0%,100%{box-shadow:0 0 0 0 rgba(215,173,88,0)}
  45%{box-shadow:0 0 0 4px rgba(215,173,88,.26);border-color:rgba(215,173,88,.65)}
}
.inventory-diff-highlight th:nth-child(7),
.inventory-diff-highlight td:nth-child(7){
  background:rgba(255,100,124,.07)!important;
  box-shadow:inset 2px 0 0 rgba(255,100,124,.42), inset -2px 0 0 rgba(255,100,124,.22);
}
@media(max-width:1100px){
  .inventory-kpi-hint{font-size:.54rem;line-height:1.35}
  .inventory-kpi-sheet{align-items:flex-end;padding:0}
  .inventory-kpi-sheet-card{
    width:100%;max-width:none;border-radius:20px 20px 0 0;padding:14px 15px max(18px,env(safe-area-inset-bottom));
    max-height:86dvh;overflow-y:auto;-webkit-overflow-scrolling:touch
  }
  .inventory-kpi-sheet-handle{
    display:block;width:46px;height:4px;background:#334155;border-radius:999px;margin:0 auto 13px
  }
  .inventory-kpi-sheet-value{font-size:1.5rem}
  .inventory-kpi-sheet-description{font-size:.75rem}
}
@media(prefers-reduced-motion:reduce){
  .inventory-kpi-action.is-pressing::after{animation:none;width:100%}
  #inventory-count-register.inventory-target-flash{animation:none;border-color:rgba(215,173,88,.65)}
}
</style>


<style id="ichef-haccp-system-v5-style">
.system-hub-btn{border-color:#253246!important;color:#9aabc1!important;background:rgba(255,255,255,.018)!important}
.system-hub-btn.system-live{border-color:rgba(61,214,160,.3)!important;color:#79dcb8!important}
.system-link-panel{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:8px;margin-top:10px}
.system-link-card{min-width:0;border:1px solid #1d2939;border-radius:10px;background:#090e15;padding:10px 11px}
.system-link-label{font-size:.56rem;text-transform:uppercase;letter-spacing:.65px;color:#64748b;font-weight:900}
.system-link-value{margin-top:5px;font-size:.73rem;color:#d8e2ef;font-weight:850;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.system-link-value.ok{color:var(--accent)}.system-link-value.warn{color:var(--gold)}
@media(max-width:1050px){.system-link-panel{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media(max-width:700px){.system-link-panel{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:380px){.system-link-panel{grid-template-columns:1fr}}
</style>


<style id="ichef-haccp-compact-v51">
/* ==========================================================
   iCHEF HACCP V5.1 — COMPACT / ERGONOMIQUE
   UI only: no network, PIN, tenant or sync logic modified.
   ========================================================== */

body { background:#070a0f; }

.nav-haccp{
  padding:7px 10px!important;
  gap:6px!important;
  min-height:0!important;
  align-items:center!important;
  flex-wrap:wrap!important;
  border-bottom:1px solid #182334!important;
}

.haccp-brand-mini{
  min-height:36px!important;
  padding:6px 9px!important;
  border-radius:8px!important;
  font-size:.64rem!important;
}

.nav-btn,.pad-link{
  min-height:36px!important;
  padding:7px 10px!important;
  border-radius:8px!important;
  font-size:.62rem!important;
  line-height:1!important;
}

.sync-pill,.reg-profile-pill{
  min-height:34px!important;
  padding:6px 9px!important;
  font-size:.58rem!important;
  border-radius:999px!important;
}

.content{
  padding:10px!important;
  gap:8px!important;
}

/* Référentiel compact */
#haccp-regulatory-banner{
  min-height:0!important;
  padding:9px 12px!important;
  border-radius:10px!important;
  display:grid!important;
  grid-template-columns:minmax(0,1fr) auto!important;
  gap:8px 12px!important;
  align-items:center!important;
}

.regulatory-banner-main{
  display:grid!important;
  grid-template-columns:auto minmax(0,1fr)!important;
  align-items:center!important;
  gap:5px 10px!important;
  min-width:0!important;
}

.regulatory-banner-kicker{
  grid-column:1!important;
  margin:0!important;
  font-size:.54rem!important;
  letter-spacing:.8px!important;
  white-space:nowrap!important;
}

.regulatory-banner-title{
  grid-column:2!important;
  margin:0!important;
  font-size:.80rem!important;
  line-height:1.15!important;
}

.regulatory-banner-text{
  grid-column:1 / -1!important;
  margin:0!important;
  font-size:.62rem!important;
  line-height:1.28!important;
  white-space:nowrap!important;
  overflow:hidden!important;
  text-overflow:ellipsis!important;
}

.regulatory-banner-authority{
  display:none!important;
}

.regulatory-country-chip{
  min-width:90px!important;
  padding:7px 9px!important;
  border-radius:8px!important;
  font-size:.62rem!important;
}

/* Etat système compact */
.system-link-panel{
  display:flex!important;
  flex-wrap:nowrap!important;
  gap:6px!important;
  margin-top:0!important;
  overflow-x:auto!important;
  overflow-y:hidden!important;
  padding:0 0 2px 0!important;
  scrollbar-width:none!important;
}
.system-link-panel::-webkit-scrollbar{display:none!important}

.system-link-card{
  flex:1 1 0!important;
  min-width:120px!important;
  padding:7px 9px!important;
  border-radius:8px!important;
  display:flex!important;
  align-items:center!important;
  justify-content:space-between!important;
  gap:8px!important;
}

.system-link-label{
  font-size:.50rem!important;
  line-height:1!important;
  white-space:nowrap!important;
}

.system-link-value{
  margin:0!important;
  font-size:.63rem!important;
  line-height:1!important;
  text-align:right!important;
}

/* Modules plus proches du haut */
.module{
  gap:8px!important;
}

.card{
  border-radius:11px!important;
  padding:11px!important;
}

.card h2{
  margin-top:0!important;
}

/* Actions principales compactes */
.inventory-pro-head{
  gap:8px!important;
}
.inventory-pro-title{
  font-size:.88rem!important;
}
.inventory-pro-subtitle{
  margin-top:3px!important;
  font-size:.63rem!important;
}
.inventory-actions{
  gap:6px!important;
}
.inventory-secondary-btn{
  min-height:36px!important;
  padding:7px 9px!important;
  font-size:.60rem!important;
}

/* KPI inventaire plus bas */
.inventory-kpis{
  gap:7px!important;
}
.inventory-kpi{
  padding:9px 10px!important;
  border-radius:9px!important;
}
.inventory-kpi-label{font-size:.54rem!important}
.inventory-kpi-value{margin-top:4px!important;font-size:.95rem!important}
.inventory-kpi-note{margin-top:2px!important;font-size:.56rem!important}
.inventory-kpi-hint{margin-top:5px!important;padding-top:5px!important;font-size:.50rem!important}

/* Masquer les boutons système secondaires sur très petit écran dans la ligne,
   sans supprimer leur fonction: ils restent accessibles via la barre scrollable */
@media (max-width:1100px){
  .system-link-card{
    flex:0 0 138px!important;
  }
}

@media (max-width:1100px){
  .nav-haccp{
    flex-wrap:nowrap!important;
    overflow-x:auto!important;
    padding:6px 8px!important;
  }

  #haccp-regulatory-banner{
    grid-template-columns:1fr auto!important;
    padding:8px 10px!important;
  }

  .regulatory-banner-main{
    grid-template-columns:1fr!important;
    gap:2px!important;
  }

  .regulatory-banner-kicker{
    grid-column:1!important;
    font-size:.50rem!important;
  }

  .regulatory-banner-title{
    grid-column:1!important;
    font-size:.74rem!important;
  }

  .regulatory-banner-text{
    display:none!important;
  }

  .regulatory-country-chip{
    min-width:74px!important;
    font-size:.56rem!important;
    padding:6px 8px!important;
  }

  .system-link-panel{
    margin-top:0!important;
  }

  .system-link-card{
    flex:0 0 125px!important;
    min-width:125px!important;
    padding:7px 8px!important;
  }

  .system-link-label{font-size:.47rem!important}
  .system-link-value{font-size:.58rem!important}

  .content{
    padding:7px!important;
    gap:6px!important;
  }

  .card{
    padding:9px!important;
  }
}

@media(max-width:430px){
  .haccp-brand-mini{
    min-height:34px!important;
    padding:6px 8px!important;
  }
  .nav-btn,.pad-link{
    min-height:34px!important;
    padding:6px 8px!important;
    font-size:.58rem!important;
  }
  .sync-pill,.reg-profile-pill{
    min-height:32px!important;
    padding:6px 8px!important;
    font-size:.53rem!important;
  }
}
</style>


<style id="ichef-v53-build-style">
#ichef-v53-build{
position:fixed;right:8px;bottom:8px;z-index:999999;
font:900 8px/1 Inter,Arial,sans-serif;letter-spacing:.45px;
padding:5px 7px;border-radius:999px;border:1px solid rgba(61,214,160,.24);
background:rgba(5,10,14,.78);color:rgba(61,214,160,.72);
pointer-events:none;opacity:.75
}
@media(max-width:1100px){#ichef-v53-build{font-size:7px;right:5px;bottom:5px}}
</style>


<style id="ichef-haccp-one-line-v56">
/* ==========================================================
   iCHEF HACCP V5.6 — BARRE SUPÉRIEURE UNIQUE
   UI uniquement : aucune logique PIN / API / tenant modifiée.
   ========================================================== */

.nav-haccp{
  display:flex!important;
  flex-direction:row!important;
  flex-wrap:nowrap!important;
  align-items:center!important;
  gap:6px!important;

  width:100%!important;
  max-width:100vw!important;

  overflow-x:auto!important;
  overflow-y:hidden!important;
  white-space:nowrap!important;

  padding:7px 10px 8px!important;
  min-height:0!important;

  -webkit-overflow-scrolling:touch!important;
  overscroll-behavior-x:contain!important;
  scroll-behavior:smooth!important;
  touch-action:pan-x!important;

  scrollbar-width:thin!important;
  scrollbar-color:#334155 #0a0f16!important;
}

/* Petite barre de défilement visible : on comprend immédiatement
   que la navigation continue vers la droite / gauche. */
.nav-haccp::-webkit-scrollbar{
  height:5px!important;
}
.nav-haccp::-webkit-scrollbar-track{
  background:#0a0f16!important;
}
.nav-haccp::-webkit-scrollbar-thumb{
  background:#334155!important;
  border-radius:999px!important;
}
.nav-haccp::-webkit-scrollbar-thumb:hover{
  background:#52677e!important;
}

/* Tous les éléments restent sur la même ligne et gardent leur largeur. */
.nav-haccp > *,
.nav-haccp .ichef-nav-core,
.nav-haccp .ichef-nav-core > *{
  flex-shrink:0!important;
  white-space:nowrap!important;
}

.nav-haccp .ichef-nav-core{
  display:flex!important;
  flex-direction:row!important;
  flex-wrap:nowrap!important;
  align-items:center!important;
  gap:6px!important;
}

/* L'ancien espace extensible ne doit plus créer une cassure visuelle. */
.nav-haccp > div[style*="flex-grow"]{
  flex:0 0 4px!important;
  width:4px!important;
  min-width:4px!important;
}

/* Boutons compacts pour conserver beaucoup d'actions visibles. */
.nav-haccp .haccp-brand-mini{
  min-height:36px!important;
  padding:6px 10px!important;
}
.nav-haccp .nav-btn,
.nav-haccp .pad-link{
  flex:0 0 auto!important;
  min-height:36px!important;
  padding:7px 10px!important;
}
.nav-haccp .sync-pill,
.nav-haccp .reg-profile-pill{
  flex:0 0 auto!important;
  min-height:34px!important;
}

/* Même comportement sur tablette / téléphone : jamais de deuxième ligne. */
@media(max-width:1100px){
  .nav-haccp{
    flex-wrap:nowrap!important;
    overflow-x:auto!important;
    overflow-y:hidden!important;
    padding:6px 8px 7px!important;
  }
}

/* iCHEF — logo HACCP en haut à gauche */
.haccp-top-logo-wrap {
    flex:0 0 auto;
    display:flex;
    align-items:center;
    justify-content:center;
    height:48px;
    padding:2px 8px 2px 2px;
}
.haccp-top-logo {
    display:block;
    width:auto;
    height:44px;
    max-width:132px;
    object-fit:contain;
    flex:0 0 auto;
}
@media (max-width:700px) {
    .haccp-top-logo-wrap { height:42px; padding-right:5px; }
    .haccp-top-logo { height:38px; max-width:108px; }
}

</style>


<style id="ichef-haccp-express-mobile-v60">
.haccp-express-temp{display:none}
.sr-only{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}

@media(max-width:1100px){
  body.haccp-express-mobile{
    height:100dvh!important;
    min-height:100dvh!important;
    overflow:hidden!important;
    background:#06090d!important;
  }
  body.haccp-express-mobile .nav-haccp,
  body.haccp-express-mobile #haccp-regulatory-banner,
  body.haccp-express-mobile #ichef-system-link-panel,
  body.haccp-express-mobile #ichef-haccp-v41-build,
  body.haccp-express-mobile #ichef-v53-build{
    display:none!important;
  }
  body.haccp-express-mobile .content{
    padding:0!important;
    margin:0!important;
    height:100dvh!important;
    min-height:100dvh!important;
    overflow:hidden!important;
    display:block!important;
  }
  body.haccp-express-mobile #mod-temp{
    display:block!important;
    height:100dvh!important;
    min-height:100dvh!important;
    padding:0!important;
    margin:0!important;
    overflow:hidden!important;
  }
  body.haccp-express-mobile #mod-temp > .card{
    display:none!important;
  }

  .haccp-express-temp{
    display:flex!important;
    flex-direction:column;
    box-sizing:border-box;
    width:100%;
    height:100dvh;
    min-height:100dvh;
    padding:
      max(10px,env(safe-area-inset-top))
      max(12px,env(safe-area-inset-right))
      max(10px,env(safe-area-inset-bottom))
      max(12px,env(safe-area-inset-left));
    background:
      radial-gradient(circle at 50% -10%,rgba(215,173,88,.13),transparent 34%),
      linear-gradient(180deg,#0b1118 0%,#070a0f 55%,#05070a 100%);
    color:#f8fafc;
    overflow:hidden;
  }

  .hx-top{
    display:flex;
    align-items:center;
    justify-content:space-between;
    gap:10px;
    flex:0 0 auto;
  }
  .hx-brand{display:flex;align-items:center;gap:9px;min-width:0}
  .hx-brand img{width:68px;height:34px;object-fit:contain;flex:0 0 auto}
  .hx-brand strong{display:block;font-size:.73rem;letter-spacing:1.1px;color:#fff}
  .hx-brand small{display:block;margin-top:2px;font-size:.54rem;color:#9ba9ba;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:48vw}
  .hx-full-mode{
    min-height:36px!important;width:auto!important;padding:7px 10px!important;
    border:1px solid #2b394c!important;border-radius:9px!important;
    background:#0b1119!important;color:#9fb0c2!important;
    font-size:.56rem!important;font-weight:900!important;letter-spacing:.55px!important;
  }

  .hx-progress-line{
    margin-top:8px;display:flex;align-items:center;gap:9px;flex:0 0 auto;
    color:#8392a4;font-size:.58rem;font-weight:900
  }
  .hx-progress-track{height:4px;flex:1;background:#17202d;border-radius:999px;overflow:hidden}
  .hx-progress-track i{display:block;height:100%;width:0;background:#d7ad58;border-radius:999px;transition:width .18s linear}

  .hx-main{
    flex:1 1 auto;
    min-height:0;
    display:flex;
    flex-direction:column;
    justify-content:center;
    align-items:stretch;
    text-align:center;
    gap:9px;
    padding:5px 0;
  }
  .hx-kicker{font-size:.54rem;letter-spacing:1.5px;font-weight:950;color:#6f7f91}
  #hx-equipment{
    margin:0 auto;
    max-width:95%;
    color:#fff;
    font-size:clamp(1.45rem,7vw,2.25rem);
    line-height:1.05;
    font-weight:950;
    letter-spacing:-.4px;
  }
  .hx-rule{
    margin:0 auto;
    max-width:94%;
    min-height:30px;
    color:#9aa9b9;
    font-size:.61rem;
    line-height:1.35;
  }

  .hx-temp-zone{
    display:grid;
    grid-template-columns:56px minmax(0,1fr) 56px;
    align-items:center;
    gap:8px;
    width:min(100%,390px);
    margin:2px auto;
  }
  .hx-adjust{
    width:56px!important;height:56px!important;min-height:56px!important;
    padding:0!important;border-radius:16px!important;
    border:1px solid #2b394b!important;background:#0d141d!important;
    color:#dbe5ef!important;font-size:2rem!important;font-weight:500!important;
    touch-action:manipulation;
  }
  .hx-temp-input-wrap{
    position:relative;
    display:flex;
    align-items:center;
    justify-content:center;
    height:92px;
    border:1px solid #33445a;
    border-radius:20px;
    background:#090e15;
    box-shadow:inset 0 1px 0 rgba(255,255,255,.03);
  }
  #hx-temp{
    width:100%!important;height:100%!important;min-height:0!important;
    padding:0 58px 0 12px!important;border:0!important;background:transparent!important;
    color:#fff!important;text-align:center!important;
    font-size:clamp(3rem,17vw,5rem)!important;line-height:1!important;
    font-weight:950!important;letter-spacing:-3px!important;
    outline:none!important;box-shadow:none!important;
    -moz-appearance:textfield;
  }
  #hx-temp::-webkit-inner-spin-button,#hx-temp::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}
  .hx-temp-input-wrap b{
    position:absolute;right:17px;top:50%;transform:translateY(-50%);
    color:#6d7d90;font-size:1rem
  }

  .hx-live-state{
    width:min(100%,390px);
    margin:0 auto;
    box-sizing:border-box;
    min-height:34px;
    padding:8px 10px;
    border-radius:10px;
    border:1px solid #1d2938;
    background:#090e15;
    color:#8392a4;
    font-size:.64rem;
    font-weight:850;
    display:flex;align-items:center;justify-content:center;
  }
  .hx-live-state.ok{border-color:rgba(61,214,160,.42);color:#67d9b0;background:rgba(61,214,160,.055)}
  .hx-live-state.alert{border-color:rgba(255,100,124,.48);color:#ff7e91;background:rgba(255,100,124,.065)}
  .hx-live-state.review{border-color:rgba(215,173,88,.45);color:#e3be6d;background:rgba(215,173,88,.06)}

  .hx-mic,.hx-save{
    width:min(100%,390px)!important;
    margin:0 auto!important;
    min-height:50px!important;
    border-radius:13px!important;
    font-size:.76rem!important;
    font-weight:950!important;
    letter-spacing:.65px!important;
    touch-action:manipulation;
  }
  .hx-mic{
    border:1px solid #35465b!important;
    background:#111925!important;color:#e5edf6!important;
  }
  .hx-mic.listening{
    border-color:#d7ad58!important;color:#e7c77f!important;background:rgba(215,173,88,.09)!important
  }
  .hx-mic-icon{display:inline-block;margin-right:7px;color:#d7ad58}
  .hx-save{
    border:1px solid #d7ad58!important;
    background:linear-gradient(135deg,#e0b85f,#bd8d34)!important;
    color:#07090d!important;
  }
  .hx-save:disabled,.hx-mic:disabled{opacity:.48!important}

  .hx-auto{
    width:min(100%,390px);
    margin:0 auto;
    display:flex;
    align-items:center;
    justify-content:center;
    gap:8px;
    color:#77869a;
    font-size:.58rem;
    line-height:1.3;
  }
  .hx-auto input{width:18px!important;height:18px!important;min-height:18px!important;flex:0 0 18px}

  .hx-nav{
    width:min(100%,390px);
    margin:0 auto;
    display:grid;
    grid-template-columns:1fr 1fr;
    gap:8px;
  }
  .hx-nav button{
    min-height:38px!important;width:100%!important;
    padding:7px!important;border-radius:9px!important;
    border:1px solid #1f2b3b!important;background:#090e15!important;
    color:#748398!important;font-size:.56rem!important;font-weight:900!important
  }

  .hx-confirm{
    flex:0 0 auto;
    min-height:18px;
    text-align:center;
    color:#6b7b8e;
    font-size:.56rem;
    line-height:1.2;
    overflow:hidden;
    white-space:nowrap;
    text-overflow:ellipsis;
  }

  @media(max-height:660px){
    .hx-main{gap:5px}
    .hx-temp-input-wrap{height:74px}
    .hx-adjust{height:50px!important;min-height:50px!important}
    .hx-mic,.hx-save{min-height:44px!important}
    .hx-auto{font-size:.53rem}
    .hx-rule{min-height:24px;font-size:.56rem}
  }
}
</style>


<style id="ichef-haccp-v60-identity-gate">
/* HACCP V6.0 — une identité iCHEF, aucun sélecteur de service */
#login-screen{
    box-sizing:border-box;
    padding:max(18px,env(safe-area-inset-top)) 16px max(18px,env(safe-area-inset-bottom));
}
#login-screen .logo-container{margin-bottom:22px!important}
#haccp-mobile-secure-gate.haccp-mobile-secure-gate{
    display:flex!important;
    width:min(440px,calc(100vw - 32px));
    box-sizing:border-box;
    margin:0 auto;
    padding:20px;
    border:1px solid #2a3546;
    border-radius:16px;
    background:linear-gradient(180deg,#111722,#0b1018);
    color:#f8fafc;
    flex-direction:column;
    align-items:center;
    gap:10px;
    text-align:center;
    box-shadow:0 20px 55px rgba(0,0,0,.28);
}
#haccp-mobile-secure-gate[hidden]{display:none!important}
#haccp-mobile-secure-gate .haccp-mobile-secure-icon{
    width:64px;height:64px;display:grid;place-items:center;
    border:1px solid #344258;border-radius:16px;
    background:#0a0f16;color:#d7ad58;font-size:.66rem;font-weight:950;letter-spacing:1px;
}
#haccp-mobile-secure-gate strong{font-size:1rem;color:#fff}
#haccp-mobile-secure-gate p{
    margin:0;max-width:360px;color:#96a2b3;font-size:.74rem;line-height:1.5
}
#haccp-mobile-secure-gate button{
    width:100%!important;min-height:48px!important;margin-top:5px!important;
    border:1px solid rgba(215,173,88,.55)!important;border-radius:11px!important;
    background:rgba(215,173,88,.10)!important;color:#e7c77f!important;
    font-size:.68rem!important;font-weight:950!important;letter-spacing:.35px
}
#haccp-mobile-secure-gate button[hidden]{display:none!important}
/* Ancien portail HACCP neutralisé : le secteur vient de l'identité signée. */
#login-step-1,#login-step-2,.dept-choice-btn,.pin-pad{display:none!important}

@media(max-width:820px){
    #login-screen{justify-content:center!important;overflow:hidden!important}
    #login-screen .logo-container{margin:0 0 16px!important}
    #haccp-mobile-secure-gate.haccp-mobile-secure-gate{
        width:min(420px,calc(100vw - 28px));padding:18px
    }
    #haccp-mobile-secure-gate p{font-size:.72rem}
}
</style>


<style id="ichef-haccp-fast-v61">
/* iCHEF HACCP V6.3 FAST · PHOTO RETENTION — performance UI uniquement */
.module { contain: layout style; }
.card { contain: layout style paint; }
@media (max-width:820px) {
  .module:not(.active) { content-visibility:hidden; contain-intrinsic-size:1px 1px; }
  .catalog-item, .inventory-kpi, .system-link-card { contain:layout paint; }
  * { -webkit-tap-highlight-color:transparent; }
}
</style>

</head>
<body>
<div id="ichef-v53-build">HACCP V6.0</div>
<div id="ichef-haccp-v41-build">HACCP V226 · SSO IDENTITÉ</div>


    <div id="print-report"></div>

    <div id="login-screen">
        <div class="logo-container">
            <h2 class="ichef-title">ichef.ch</h2>
            <span class="ichef-subtitle">HACCP</span>
            <div id="login-reg-profile" class="login-reg-profile">Référentiel sanitaire automatique selon le pays enregistré dans l’établissement iCHEF.</div>
        </div>

        <div id="haccp-mobile-secure-gate" class="haccp-mobile-secure-gate">
            <div class="haccp-mobile-secure-icon">HACCP</div>
            <strong id="haccp-identity-gate-title">Identification iCHEF…</strong>
            <p id="haccp-identity-gate-text">Vérification de votre session sécurisée, de votre rôle et de votre secteur.</p>
            <button id="haccp-identity-login-btn" type="button" onclick="openHaccpStaffPortal()" hidden>OUVRIR MA CONNEXION iCHEF</button>
        </div>
    </div>

    <div id="haccp-phone-appbar" class="haccp-phone-appbar" hidden>
        <div class="haccp-phone-brand">iCHEF <span>HACCP</span></div>
        <div class="haccp-phone-identity">
            <strong id="haccp-phone-user">Collaborateur</strong>
            <span id="haccp-phone-sector">Secteur</span>
        </div>
        <div id="haccp-phone-online" class="haccp-phone-online" aria-label="État connexion"></div>
    </div>

    <nav id="haccp-phone-dock" class="haccp-phone-dock" hidden aria-label="Navigation HACCP téléphone">
        <button type="button" data-haccp-phone-tab="temp" onclick="haccpPhoneOpen('temp')"><span>°C</span><b>TEMP.</b></button>
        <button type="button" data-haccp-phone-tab="cleaning" onclick="haccpPhoneOpen('cleaning')"><span>✓</span><b>NETTOY.</b></button>
        <button type="button" data-haccp-phone-tab="trace" onclick="haccpPhoneOpen('trace')"><span>▣</span><b>TRAÇA.</b></button>
        <button type="button" data-haccp-phone-tab="inventory" onclick="haccpPhoneOpen('inventory')"><span>≡</span><b>STOCK</b></button>
    </nav>

    <div class="nav-haccp">
        <div class="ichef-nav-core haccp-sector-nav-core">
            <div class="haccp-top-logo-wrap">
                <img class="haccp-top-logo"
                     src="Gemini_Generated_Image_q748ueq748ueq748-Photoroom (1) (1) (1).png"
                     alt="iCHEF"
                     title="iCHEF HACCP">
            </div>
            <button id="haccp-sector-return-btn"
                    class="nav-btn haccp-sector-return-btn"
                    type="button"
                    onclick="retourSecteurAttribue()">
                ← RETOUR BUREAU
            </button>
        </div>

        <div style="flex-grow: 1;"></div>
        
        <button class="nav-btn active" onclick="showModule('temp')">TEMPÉRATURES</button>
        <button class="nav-btn" onclick="showModule('cleaning')">NETTOYAGE</button>
        <button class="nav-btn" onclick="showModule('trace')">TRAÇABILITÉ</button>
        <button class="nav-btn" onclick="showModule('inventaire')">INVENTAIRE</button>
        <button class="nav-btn" style="border-color: var(--ordered); color: var(--ordered);" onclick="showModule('archive')">ARCHIVES</button>
        
        <span id="haccp-sync-status" class="sync-pill degraded">SYSTÈME · IDENTIFICATION…</span>
        <span id="haccp-reg-profile" class="reg-profile-pill">RÉFÉRENTIEL · AUTO</span>
        <button class="nav-btn admin-return" type="button" onclick="returnToAdmin()">← RETOUR BUREAU</button>
        <button class="nav-btn" style="border-color:var(--alert); color:var(--alert);" onclick="location.reload()">🔒 VERROUILLER</button>
    </div>

    <div class="content">
        <div id="haccp-regulatory-banner" class="regulatory-banner">
            <div class="regulatory-banner-main">
                <div class="regulatory-banner-kicker">Référentiel sanitaire iCHEF</div>
                <div id="regulatory-banner-title" class="regulatory-banner-title">Détection automatique après connexion</div>
                <div id="regulatory-banner-text" class="regulatory-banner-text">Le pays fiscal enregistré dans SETTINGS_MASTER détermine le profil HACCP utilisé par cet établissement.</div>
                <div id="regulatory-banner-authority" class="regulatory-banner-authority">Aucun profil n’est imposé avant lecture des paramètres du tenant.</div>
            </div>
            <div id="regulatory-country-chip" class="regulatory-country-chip intl">AUTO</div>
        </div>
        
        <div class="system-link-panel" id="ichef-system-link-panel">
            <div class="system-link-card"><div class="system-link-label">Établissement</div><div class="system-link-value" id="sys-tenant">—</div></div>
            <div class="system-link-card"><div class="system-link-label">Paramètres</div><div class="system-link-value" id="sys-settings">En attente</div></div>
            <div class="system-link-card"><div class="system-link-label">Inventaire</div><div class="system-link-value" id="sys-inventory">En attente</div></div>
            <div class="system-link-card"><div class="system-link-label">Recettes</div><div class="system-link-value" id="sys-recipes">En attente</div></div>
            <div class="system-link-card"><div class="system-link-label">Brigade</div><div class="system-link-value" id="sys-staff">En attente</div></div>
            <div class="system-link-card"><div class="system-link-label">Temps réel</div><div class="system-link-value" id="sys-realtime">Connexion…</div></div>
        </div>
<div id="mod-temp" class="module active">
<div id="haccp-express-temp" class="haccp-express-temp" aria-label="HACCP Express température">
    <div class="hx-top">
        <div class="hx-brand">
            <img src="logo-ichef.png" alt="iCHEF">
            <div>
                <strong>HACCP EXPRESS</strong>
                <small id="hx-profile-label">Référentiel automatique</small>
            </div>
        </div>
        <div class="hx-top-actions">
            <button type="button" class="hx-full-mode hx-cleaning-jump" id="hx-cleaning-jump">NETTOYAGE</button>
            <button type="button" class="hx-full-mode" id="hx-trace-jump">TRAÇABILITÉ</button>
            <button type="button" class="hx-full-mode" id="hx-full-mode">MODE COMPLET</button>
        </div>
    </div>

    <div class="hx-progress-line">
        <span id="hx-progress-text">1 / 1</span>
        <div class="hx-progress-track"><i id="hx-progress-bar"></i></div>
    </div>

    <main class="hx-main">
        <div class="hx-kicker">ÉQUIPEMENT À CONTRÔLER</div>
        <h1 id="hx-equipment">Équipement</h1>
        <div id="hx-rule" class="hx-rule">Référentiel en cours de chargement…</div>

        <div class="hx-temp-zone">
            <button type="button" class="hx-adjust" id="hx-minus" aria-label="Diminuer de 0,1 degré">−</button>
            <label class="hx-temp-input-wrap">
                <span class="sr-only">Température en degrés Celsius</span>
                <input id="hx-temp" type="number" inputmode="decimal" step="0.1" placeholder="—" autocomplete="off">
                <b>°C</b>
            </label>
            <button type="button" class="hx-adjust" id="hx-plus" aria-label="Augmenter de 0,1 degré">+</button>
        </div>

        <div id="hx-live-state" class="hx-live-state neutral" aria-live="polite">
            Entrez la température, prenez une photo ou utilisez le micro.
        </div>

        <div class="hx-photo-actions">
            <input id="hx-temp-photo-input" type="file" accept="image/*" capture="environment" hidden>
            <button type="button" class="hx-photo-btn" id="hx-temp-photo-btn">📷 PHOTO DU THERMOMÈTRE</button>
            <button type="button" class="hx-photo-clear" id="hx-temp-photo-clear" hidden aria-label="Retirer la photo">✕</button>
        </div>
        <div class="hx-photo-retention-note">Photo preuve : 30 jours maximum · relevé écrit conservé · aucune photo copiée dans le cache du téléphone.</div>
        <div id="hx-temp-photo-proof" class="hx-temp-photo-proof" hidden>
            <img id="hx-temp-photo-preview" alt="Photo preuve du thermomètre">
            <div>
                <strong id="hx-temp-photo-title">PHOTO PREUVE</strong>
                <span id="hx-temp-photo-status">Lecture automatique…</span>
            </div>
        </div>

        <button type="button" class="hx-mic" id="hx-mic">
            <span class="hx-mic-icon">●</span>
            <span id="hx-mic-text">DIRE LA TEMPÉRATURE</span>
        </button>

        <label class="hx-auto">
            <input id="hx-auto-save" type="checkbox" checked>
            <span>Après la dictée, enregistrer automatiquement après <strong>0,1 seconde</strong></span>
        </label>

        <button type="button" class="hx-save" id="hx-save">✓ ENREGISTRER</button>

        <div class="hx-nav">
            <button type="button" id="hx-prev">← PRÉCÉDENT</button>
            <button type="button" id="hx-next">SUIVANT →</button>
        </div>
    </main>

    <div id="hx-confirm" class="hx-confirm" aria-live="polite"></div>
</div>

            <section id="haccp-desktop-temp-hub" class="hd-temp-hub" aria-label="Parc HACCP températures">
                <div class="hd-temp-head">
                    <div>
                        <div class="hd-temp-kicker">MAÎTRISE DES TEMPÉRATURES · <span class="display-dept"></span></div>
                        <h1>Parc HACCP</h1>
                        <p>Un seul moteur HACCP, mais un parc, des relevés et des alertes indépendants pour chaque secteur.</p>
                    </div>
                    <div class="hd-temp-head-actions">
                        <span id="hd-profile-chip" class="hd-chip">RÉFÉRENTIEL</span>
                        <button type="button" class="hd-btn secondary hv227-desktop-admin" onclick="haccpV227OpenCategories()">⚙ GÉRER LES CATÉGORIES</button>
                        <button type="button" class="hd-btn primary" onclick="openDesktopEquipmentCreator()">+ ÉQUIPEMENT</button>
                    </div>
                </div>

                <div class="hd-kpis">
                    <button type="button" class="hd-kpi" onclick="filterDesktopEquipment('all')"><span>ÉQUIPEMENTS</span><strong id="hd-kpi-total">0</strong><small>dans ce secteur</small></button>
                    <button type="button" class="hd-kpi" onclick="filterDesktopEquipment('todo')"><span>À CONTRÔLER</span><strong id="hd-kpi-todo">0</strong><small>aujourd’hui</small></button>
                    <button type="button" class="hd-kpi" onclick="filterDesktopEquipment('ok')"><span>CONFORMES</span><strong id="hd-kpi-ok">0</strong><small>dernier relevé</small></button>
                    <button type="button" class="hd-kpi" onclick="filterDesktopEquipment('alert')"><span>ALERTES</span><strong id="hd-kpi-alert">0</strong><small>à traiter</small></button>
                </div>

                <div class="hd-temp-layout">
                    <aside class="hd-parc-panel">
                        <div class="hd-panel-title-row">
                            <div>
                                <h2>Équipements du secteur</h2>
                                <p id="hd-parc-subtitle">Sélectionnez un équipement.</p>
                            </div>
                            <button type="button" class="hd-icon-btn" onclick="startDesktopTemperatureRound()" title="Démarrer la tournée">▶</button>
                        </div>
                        <div id="hd-equipment-groups" class="hd-equipment-groups"></div>
                    </aside>

                    <section class="hd-reading-panel">
                        <div id="hd-empty-reading" class="hd-reading-empty">
                            <div class="hd-reading-empty-mark">HACCP</div>
                            <h2>Sélectionnez un équipement</h2>
                            <p>iCHEF applique le profil France / Suisse et adapte le contrôle au type d’équipement.</p>
                        </div>

                        <div id="hd-standard-reading" class="hd-reading-view" hidden>
                            <div class="hd-reading-topline">
                                <div>
                                    <div id="hd-reading-category" class="hd-reading-category">—</div>
                                    <h2 id="hd-reading-name">—</h2>
                                </div>
                                <span id="hd-last-status" class="hd-status neutral">PAS DE RELEVÉ</span>
                            </div>
                            <div id="hd-rule-box" class="hd-rule-box">Référentiel en cours de chargement…</div>
                            <div class="hd-reading-input-row">
                                <label>
                                    <span>TEMPÉRATURE RELEVÉE</span>
                                    <div class="hd-big-temp"><input id="hd-temp-value" type="number" step="0.1" inputmode="decimal" placeholder="—"><b>°C</b></div>
                                </label>
                                <button type="button" id="hd-save-temp" class="hd-save-reading" onclick="saveDesktopTemperatureReading()">ENREGISTRER</button>
                            </div>
                            <div id="hd-live-compliance" class="hd-compliance neutral">Entrez une valeur.</div>
                            <div class="hd-reading-meta">
                                <div><span>DERNIER RELEVÉ</span><strong id="hd-last-value">—</strong></div>
                                <div><span>HEURE</span><strong id="hd-last-time">—</strong></div>
                                <div><span>PAR</span><strong id="hd-last-user">—</strong></div>
                            </div>
                            <div class="hd-round-actions">
                                <button type="button" onclick="desktopRoundPrevious()">← PRÉCÉDENT</button>
                                <button type="button" onclick="desktopRoundNext()">SUIVANT →</button>
                            </div>
                        </div>

                        <div id="hd-cooling-reading" class="hd-reading-view" hidden>
                            <div class="hd-reading-topline">
                                <div><div class="hd-reading-category">CELLULE DE REFROIDISSEMENT</div><h2 id="hd-cooling-name">—</h2></div>
                                <span id="hd-cooling-status" class="hd-status neutral">CYCLE</span>
                            </div>
                            <div id="hd-cooling-rule" class="hd-rule-box">Référentiel du cycle en cours de chargement…</div>
                            <div class="hd-cooling-form">
                                <label class="wide"><span>PRODUIT / PRÉPARATION</span><input id="hd-cooling-product" type="text" placeholder="Ex. sauce, plat cuisiné, garniture…"></label>
                                <label><span>TEMPÉRATURE DE DÉPART</span><div class="hd-inline-temp"><input id="hd-cooling-start-temp" type="number" step="0.1"><b>°C</b></div></label>
                                <label><span>TEMPÉRATURE FINALE</span><div class="hd-inline-temp"><input id="hd-cooling-end-temp" type="number" step="0.1"><b>°C</b></div></label>
                            </div>
                            <div class="hd-cycle-clock">
                                <div><span>DÉBUT</span><strong id="hd-cooling-start-time">—</strong></div>
                                <div><span>DURÉE</span><strong id="hd-cooling-duration">—</strong></div>
                                <div><span>OBJECTIF</span><strong id="hd-cooling-target">—</strong></div>
                            </div>
                            <div class="hd-cooling-actions">
                                <button type="button" class="hd-btn secondary" id="hd-cooling-start-btn" onclick="startCoolingCycle()">DÉMARRER LE CYCLE</button>
                                <button type="button" class="hd-btn primary" id="hd-cooling-finish-btn" onclick="finishCoolingCycle()" disabled>TERMINER & ENREGISTRER</button>
                            </div>
                            <div id="hd-cooling-message" class="hd-compliance neutral">Renseignez la préparation et la température de départ.</div>
                        </div>
                    </section>
                </div>

                <section id="hd-equipment-creator" class="hd-equipment-creator" hidden>
                    <div class="hd-creator-head">
                        <div><div class="hd-temp-kicker">PARC DU SECTEUR · <span class="display-dept"></span></div><h2>Ajouter un équipement</h2></div>
                        <button type="button" class="hd-icon-btn" onclick="closeDesktopEquipmentCreator()">×</button>
                    </div>
                    <div class="hd-creator-grid">
                        <label><span>TYPE D’ÉQUIPEMENT</span><select id="hd-new-equipment-type"></select></label>
                        <label><span>NOM DANS L’ÉTABLISSEMENT</span><input id="hd-new-equipment-name" type="text" placeholder="Ex. Chambre froide poisson"></label>
                        <button type="button" class="hd-btn primary" onclick="saveDesktopEquipment()">AJOUTER AU SECTEUR</button>
                    </div>
                    <p>Le matériel ajouté ici appartient uniquement au secteur connecté.</p>
                </section>
            </section>

            <div class="card hd-legacy-temp-card">
                <h2 style="margin:0 0 15px 0; font-size: 0.9rem; color: var(--gold); text-transform: uppercase;">RELEVÉ DE TEMPÉRATURE : <span class="display-dept"></span></h2>
                <div class="grid">
                    <div class="input-group">
                        <label>Équipement (Saisie libre ou Catalogue)</label>
                        <div class="input-row">
                            <input type="text" id="temp-eq" list="list-temp-eq" placeholder="Ex: Frigo Positif 1...">
                            <button class="btn-clear" onclick="document.getElementById('temp-eq').value=''" title="Vider le champ">✖</button>
                            <datalist id="list-temp-eq"></datalist>
                            <button class="btn-catalog" onclick="openCatalog('eq')">📖 CATALOGUE</button>
                        </div>
                    </div>
                    <div class="input-group">
                        <label>Valeur Relevée (°C)</label>
                        <input type="number" id="temp-val" step="0.1" placeholder="Ex: 3.4">
                    </div>
                    <div class="input-group temp-photo-desktop-control">
                        <label>Preuve photo du thermomètre</label>
                        <button type="button" class="btn-file" id="temp-photo-desktop-btn" onclick="window.ICHEF_TEMP_EVIDENCE?.openPicker()">📷 PRENDRE / AJOUTER UNE PHOTO</button>
                        <small id="temp-photo-desktop-status" style="color:#7f8b99;line-height:1.35;">La valeur détectée sera proposée automatiquement puis devra être confirmée. Photo conservée 30 jours maximum ; relevé écrit conservé.</small>
                    </div>
                    <div class="input-group" style="justify-content: flex-end;">
                        <button class="btn-empire" id="btn-save-temp" onclick="saveEntry('temp')">ENREGISTRER</button>
                    </div>
                </div>
            </div>
            <div class="card hd-temp-history-card" style="flex:1; overflow:auto;">
                <table><thead><tr><th>Date/Heure</th><th>Équipement</th><th>°C</th><th>Statut</th><th>Audit & Signatures</th><th>Action</th></tr></thead><tbody id="logs-temp"></tbody></table>
            </div>
        </div>

        
<div id="mod-cleaning" class="module">
    <div id="haccp-express-cleaning" class="hclean-express" aria-label="HACCP Express nettoyage">
        <div class="hclean-top">
            <div class="hclean-brand">
                <img src="logo-ichef.png" alt="iCHEF">
                <div>
                    <strong>NETTOYAGE EXPRESS</strong>
                    <small id="hclean-sector">Secteur</small>
                </div>
            </div>
            <button type="button" class="hclean-mode-btn" id="hclean-full-mode">MODE COMPLET</button>
        </div>

        <div class="hclean-switch">
            <button type="button" id="hclean-to-temp">TEMP.</button>
            <button type="button" class="active">NETTOYAGE</button>
            <button type="button" id="hclean-to-trace">TRAÇABILITÉ</button>
        </div>

        <div class="hclean-progress-row">
            <span id="hclean-progress-text">0 / 0</span>
            <div class="hclean-progress-track"><i id="hclean-progress-bar"></i></div>
            <span id="hclean-done-text">0 fait</span>
        </div>

        <main class="hclean-main">
            <div class="hclean-kicker" id="hclean-category">PLAN DE NETTOYAGE</div>
            <h1 id="hclean-zone">Aucune zone</h1>

            <div id="hclean-last" class="hclean-last">À contrôler aujourd’hui</div>

            <div class="hclean-actions">
                <button type="button" class="hclean-conform" id="hclean-conform">
                    <span>✓</span>
                    <b>FAIT &amp; CONFORME</b>
                    <small>Enregistrer et passer au suivant</small>
                </button>

                <button type="button" class="hclean-nonconform" id="hclean-nonconform">
                    <span>!</span>
                    <b>NON CONFORME</b>
                    <small>Signaler une action corrective</small>
                </button>
            </div>

            <section id="hclean-corrective-box" class="hclean-corrective-box" hidden>
                <label for="hclean-corrective">ACTION CORRECTIVE</label>
                <textarea id="hclean-corrective" rows="2" placeholder="Ex. Refaire le nettoyage, dégraisser, désinfecter…"></textarea>
                <div class="hclean-corrective-actions">
                    <button type="button" id="hclean-cancel-corrective">ANNULER</button>
                    <button type="button" id="hclean-save-nonconform">ENREGISTRER L’ANOMALIE</button>
                </div>
            </section>

            <div id="hclean-feedback" class="hclean-feedback" aria-live="polite">
                Touchez simplement le résultat du contrôle.
            </div>

            <div class="hclean-nav">
                <button type="button" id="hclean-prev">← PRÉCÉDENT</button>
                <button type="button" id="hclean-next">SUIVANT →</button>
            </div>
        </main>

        <div class="hclean-footer">
            <span id="hclean-user">Session sécurisée</span>
        </div>
    </div>
            <div class="card">
                <h2 style="margin:0 0 15px 0; font-size: 0.9rem; color: var(--gold); text-transform: uppercase;">PLAN DE NETTOYAGE : <span class="display-dept"></span></h2>
                <div class="grid">
                    <div class="input-group">
                        <label>Zone / Matériel à valider (Saisie libre ou Catalogue)</label>
                        <div class="input-row">
                            <input type="text" id="clean-zone" list="list-clean-zone" placeholder="Ex: Sols et Siphons...">
                            <button class="btn-clear" onclick="document.getElementById('clean-zone').value=''" title="Vider le champ">✖</button>
                            <datalist id="list-clean-zone"></datalist>
                            <button class="btn-catalog" onclick="openCatalog('clean')">📖 CATALOGUE</button>
                        </div>
                    </div>
                    <div class="input-group">
                        <label>Statut</label>
                        <select id="clean-status" onchange="toggleCleanObs()">
                            <option value="CONFORME">FAIT ET CONFORME</option>
                            <option value="NON CONFORME">NON CONFORME</option>
                        </select>
                    </div>
                    <div class="input-group" id="clean-obs-group" style="display:none;">
                        <label style="color:var(--alert);">Action Corrective</label>
                        <input type="text" id="clean-obs" placeholder="Que faut-il refaire ?">
                    </div>
                    <div class="input-group" style="justify-content: flex-end;">
                        <button class="btn-empire" id="btn-save-cleaning" onclick="saveEntry('cleaning')">VALIDER LE NETTOYAGE</button>
                    </div>
                </div>
            </div>
            <div class="card" style="flex:1; overflow:auto;">
                <table><thead><tr><th>Date/Heure</th><th>Zone/Matériel</th><th>Statut</th><th>Action Corrective</th><th>Audit & Signatures</th><th>Action</th></tr></thead><tbody id="logs-cleaning"></tbody></table>
            </div>
        </div>

        
<div id="mod-trace" class="module">

    <!-- =========================
         TRAÇABILITÉ EXPRESS MOBILE
         ========================= -->
    <div id="haccp-express-trace" class="htrace-express" aria-label="Traçabilité Express">
        <div class="htrace-top">
            <div class="htrace-brand">
                <img src="logo-ichef.png" alt="iCHEF">
                <div>
                    <strong>TRAÇABILITÉ EXPRESS</strong>
                    <small id="htrace-sector">Secteur</small>
                </div>
            </div>
            <button type="button" class="htrace-mode-btn" id="htrace-full-mode">MODE COMPLET</button>
        </div>

        <div class="htrace-switch">
            <button type="button" id="htrace-to-temp">TEMP.</button>
            <button type="button" id="htrace-to-clean">NETTOYAGE</button>
            <button type="button" class="active">TRAÇABILITÉ</button>
        </div>

        <main class="htrace-main">
            <button type="button" id="htrace-scan" class="htrace-scan">
                <span class="htrace-camera">▣</span>
                <span>
                    <b>SCANNER L’ÉTIQUETTE</b>
                    <small>Photo + lecture automatique IA</small>
                </span>
            </button>

            <div id="htrace-scan-status" class="htrace-scan-status">Prenez l’étiquette en photo ou remplissez manuellement.</div>
            <button type="button" id="htrace-mobile-deliveries-btn" class="htrace-mobile-deliveries-btn">LIVRAISONS À RÉCEPTIONNER <span id="htrace-mobile-delivery-count">0</span></button>
            <div id="htrace-mobile-delivery-sheet" class="htrace-mobile-delivery-sheet" hidden>
                <div class="htrace-mobile-sheet-head"><strong>LIVRAISONS</strong><button type="button" id="htrace-mobile-delivery-close">×</button></div>
                <div id="htrace-mobile-delivery-list" class="htrace-mobile-delivery-list"></div>
            </div>
            <div id="htrace-mobile-context" class="htrace-mobile-context" hidden><span id="htrace-mobile-context-label">Livraison liée</span><button type="button" onclick="clearTraceDeliveryContext()">×</button></div>
            <label class="htrace-field">
                <span>PRODUIT</span>
                <input id="htrace-name" type="text" list="list-trace-name" placeholder="Ex. Entrecôte Angus" autocomplete="off">
            </label>

            <label class="htrace-field">
                <span>N° LOT / FOURNISSEUR</span>
                <input id="htrace-lot" type="text" placeholder="Ex. L2345 · Metro" autocomplete="off">
            </label>

            <div class="htrace-date-grid">
                <label class="htrace-field">
                    <span>OUVERTURE / FAB.</span>
                    <input id="htrace-open" type="date">
                </label>
                <label class="htrace-field">
                    <span>DLC SECONDAIRE</span>
                    <input id="htrace-dlc" type="date">
                </label>
            </div>

            <div id="htrace-validity" class="htrace-validity neutral">
                Renseignez la DLC.
            </div>

            <button type="button" id="htrace-save" class="htrace-save">
                ENREGISTRER LA TRAÇABILITÉ
            </button>

            <div id="htrace-feedback" class="htrace-feedback" aria-live="polite">
                Enregistrement sécurisé · secteur et collaborateur automatiques
            </div>
        </main>

        <div class="htrace-footer">
            <span id="htrace-user">Session sécurisée</span>
        </div>
    </div>

    <!-- =========================
         MODE ORDINATEUR
         ========================= -->
    <section id="htrace-desktop" class="htrace-desktop">
        <div class="htrace-desktop-head">
            <div>
                <div class="htrace-desktop-kicker">TRAÇABILITÉ · <span class="display-dept"></span></div>
                <h1>Étiquettes & lots</h1>
                <p>Scanner, vérifier et archiver une preuve de traçabilité en quelques secondes.</p>
            </div>
            <div class="htrace-desktop-stats">
                <div><span>AUJOURD’HUI</span><strong id="htrace-stat-today">0</strong></div>
                <div><span>DLC À SURVEILLER</span><strong id="htrace-stat-soon">0</strong></div>
                <div><span>EXPIRÉS</span><strong id="htrace-stat-expired">0</strong></div>
            </div>
        </div>

        <section class="htrace-delivery-hub">
            <div class="htrace-delivery-head">
                <div>
                    <div class="htrace-desktop-kicker">RÉCEPTION FOURNISSEUR · <span class="display-dept"></span></div>
                    <h2>Livraisons à réceptionner</h2>
                    <p>Valider ici met à jour le stock Économat sur le serveur. La traçabilité reste liée à la commande.</p>
                </div>
                <div class="htrace-delivery-head-actions">
                    <span id="htrace-delivery-count" class="htrace-delivery-count">0</span>
                    <button type="button" class="hd-btn secondary" onclick="loadTraceDeliveries()">ACTUALISER</button>
                    <button type="button" class="hd-btn secondary" onclick="openIchefModule('livraisons-staff.html')">RÉCEPTION COMPLÈTE</button>
                </div>
            </div>
            <div id="htrace-delivery-list" class="htrace-delivery-list"><div class="htrace-delivery-empty">Synchronisation des livraisons…</div></div>
            <div id="htrace-delivery-detail" class="htrace-delivery-detail" hidden>
                <div class="htrace-delivery-detail-head">
                    <div><strong id="htrace-delivery-supplier">Fournisseur</strong><span id="htrace-delivery-order">Commande</span></div>
                    <button type="button" class="hd-icon-btn" onclick="closeTraceDeliveryDetail()">×</button>
                </div>
                <div id="htrace-delivery-lines" class="htrace-delivery-lines"></div>
                <label class="htrace-delivery-note"><span>NOTE DE RÉCEPTION</span><input id="htrace-delivery-note" type="text" placeholder="Optionnel : écart, emballage, température à la réception…"></label>
                <div class="htrace-delivery-footer">
                    <div id="htrace-delivery-stock-info" class="htrace-delivery-stock-info">Les articles liés au stock seront incrémentés par le serveur.</div>
                    <button type="button" id="htrace-delivery-receive-btn" class="hd-btn primary" onclick="receiveTraceDelivery()">VALIDER RÉCEPTION + STOCK</button>
                </div>
            </div>
        </section>

        <div class="htrace-desktop-grid">
            <section class="htrace-step htrace-step-scan">
                <div class="htrace-step-number">1</div>
                <div class="htrace-step-title">
                    <strong>Scanner l’étiquette</strong>
                    <span>La photo est conservée avec la preuve.</span>
                </div>

                <button id="btn-scan-label"
                        class="htrace-desktop-scan"
                        type="button"
                        onclick="document.getElementById('scan-label-input').click()">
                    <span>▣</span>
                    <b>PHOTO + LECTURE IA</b>
                    <small>Produit, lot et DLC préremplis automatiquement</small>
                </button>

                <input type="file" id="scan-label-input" accept="image/*" capture="environment" style="display:none;" onchange="processLabelScan(this)">
                <input type="file" id="trace-img" accept="image/*" capture="environment" style="display:none;">

                <div id="htrace-photo-state" class="htrace-photo-state">
                    Aucune photo ajoutée
                </div>
            </section>

            <section class="htrace-step">
                <div class="htrace-step-number">2</div>
                <div class="htrace-step-title">
                    <strong>Produit & lot</strong>
                    <span>Vérifiez les données lues avant validation.</span>
                </div>

                <div id="htrace-delivery-context" class="htrace-delivery-context" hidden>
                    <span>LIVRAISON LIÉE</span><strong id="htrace-delivery-context-label">—</strong><button type="button" onclick="clearTraceDeliveryContext()">DÉLIER</button>
                </div>
                <label class="htrace-desktop-field htrace-wide">
                    <span>PRODUIT</span>
                    <div class="htrace-product-row">
                        <input type="text" id="trace-name" list="list-trace-name" placeholder="Ex. Entrecôte Angus">
                        <button class="btn-clear" type="button" onclick="document.getElementById('trace-name').value=''; syncTraceExpressFromLegacy();" title="Vider">×</button>
                        <datalist id="list-trace-name"></datalist>
                        <button class="btn-catalog" type="button" onclick="openCatalog('trace')">CATALOGUE</button>
                    </div>
                </label>

                <label class="htrace-desktop-field">
                    <span>N° LOT / FOURNISSEUR</span>
                    <input type="text" id="trace-lot" placeholder="Ex. L2345 · Metro">
                </label>
            </section>

            <section class="htrace-step">
                <div class="htrace-step-number">3</div>
                <div class="htrace-step-title">
                    <strong>Dates & validation</strong>
                    <span>iCHEF surveille automatiquement la DLC.</span>
                </div>

                <div class="htrace-desktop-date-grid">
                    <label class="htrace-desktop-field">
                        <span>OUVERTURE / FABRICATION</span>
                        <input type="date" id="trace-open">
                    </label>

                    <label class="htrace-desktop-field">
                        <span>DLC SECONDAIRE</span>
                        <input type="date" id="trace-dlc">
                    </label>
                </div>

                <div id="htrace-desktop-validity" class="htrace-validity neutral">
                    Renseignez la DLC secondaire.
                </div>

                <button class="btn-empire htrace-desktop-save"
                        id="btn-save-trace"
                        type="button"
                        onclick="saveEntry('trace')">
                    ENREGISTRER LA TRAÇABILITÉ
                </button>
            </section>
        </div>

        <section class="htrace-history">
            <div class="htrace-history-head">
                <div>
                    <strong>Registre récent</strong>
                    <span>Dernières preuves enregistrées dans ce secteur.</span>
                </div>
            </div>

            <div class="htrace-history-table">
                <table>
                    <thead>
                        <tr>
                            <th>Date opération</th>
                            <th>Produit & lot</th>
                            <th>Ouverture</th>
                            <th>DLC & statut</th>
                            <th>Photo</th>
                            <th>Audit & signatures</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody id="logs-trace"></tbody>
                </table>
            </div>
        </section>
    </section>
</div>

        <div id="mod-inventaire" class="module">
            <div class="inventory-pro-shell">
                <div class="card">
                    <div class="inventory-pro-head">
                        <div>
                            <h2 class="inventory-pro-title">INVENTAIRE CENTRAL & VALORISATION — <span class="display-dept"></span></h2>
                            <div class="inventory-pro-subtitle">Comptage physique relié au stock central iCHEF : quantité théorique, prix d’achat, fournisseur, valeur réelle et impact financier des écarts.</div>
                        </div>
                        <div class="inventory-actions">
                            <button class="inventory-secondary-btn" type="button" onclick="refreshInventoryFromSystem(this)">ACTUALISER LE STOCK</button>
                            <button class="inventory-secondary-btn" type="button" onclick="openIchefModule('economat.html')">OUVRIR L’ÉCONOMAT</button>
                        </div>
                    </div>

                    <div class="inventory-kpis" style="margin-top:14px;">
                        <div class="inventory-kpi inventory-kpi-action" data-inv-kpi="stock-value" role="button" tabindex="0" aria-label="Valeur du stock central. Touchez pour l'explication, maintenez 0,9 seconde pour ouvrir l'Économat.">
                            <div class="inventory-kpi-label">Valeur stock central</div>
                            <div class="inventory-kpi-value" id="inv-kpi-stock-value">—</div>
                            <div class="inventory-kpi-note">Quantités actuelles × prix unitaires</div>
                            <div class="inventory-kpi-hint">Toucher : détail · 0,9 s : Économat</div>
                        </div>
                        <div class="inventory-kpi inventory-kpi-action" data-inv-kpi="articles" role="button" tabindex="0" aria-label="Articles référencés. Touchez pour l'explication, maintenez 0,9 seconde pour ouvrir l'Économat.">
                            <div class="inventory-kpi-label">Articles référencés</div>
                            <div class="inventory-kpi-value" id="inv-kpi-articles">0</div>
                            <div class="inventory-kpi-note">Source INVENTORY_MASTER</div>
                            <div class="inventory-kpi-hint">Toucher : détail · 0,9 s : Économat</div>
                        </div>
                        <div class="inventory-kpi inventory-kpi-action" data-inv-kpi="today" role="button" tabindex="0" aria-label="Comptages aujourd'hui. Touchez pour l'explication, maintenez 0,9 seconde pour aller au registre des comptages.">
                            <div class="inventory-kpi-label">Comptages aujourd’hui</div>
                            <div class="inventory-kpi-value" id="inv-kpi-today">0</div>
                            <div class="inventory-kpi-note">Pour ce département</div>
                            <div class="inventory-kpi-hint">Toucher : détail · 0,9 s : Registre</div>
                        </div>
                        <div class="inventory-kpi inventory-kpi-action" data-inv-kpi="diff" role="button" tabindex="0" aria-label="Impact des écarts aujourd'hui. Touchez pour l'explication, maintenez 0,9 seconde pour voir les écarts financiers.">
                            <div class="inventory-kpi-label">Impact écarts aujourd’hui</div>
                            <div class="inventory-kpi-value" id="inv-kpi-diff-value">—</div>
                            <div class="inventory-kpi-note">Écart quantité × prix d’achat</div>
                            <div class="inventory-kpi-hint">Toucher : détail · 0,9 s : Écarts</div>
                        </div>
                    </div>

                    <div class="inventory-system-note">
                        <strong>Source unique :</strong>
                        <span>le prix et le fournisseur ne sont pas saisis ici. Ils sont lus depuis l’inventaire central iCHEF pour éviter les doublons et les incohérences entre Cuisine, Bar, Pâtisserie, Économat et HACCP.</span>
                    </div>
                </div>

                <div class="card">
                    <div class="inventory-count-grid">
                        <div class="input-group">
                            <label>Produit du stock central</label>
                            <input type="text" id="inv-name" list="list-inv-name" placeholder="Rechercher un produit iCHEF…" oninput="handleInventoryProductSelection()" onchange="handleInventoryProductSelection()" autocomplete="off">
                            <datalist id="list-inv-name"></datalist>
                        </div>
                        <div class="input-group">
                            <label>Quantité réellement comptée</label>
                            <input type="number" id="inv-qty" step="any" min="0" placeholder="0,00">
                        </div>
                        <div class="input-group inventory-submit-cell">
                            <button class="btn-empire" id="inv-count-btn" type="button" onclick="saveInventoryCount()">VALIDER LE COMPTAGE</button>
                        </div>
                    </div>

                    <div id="inv-product-status" class="inv-product-status">Sélectionnez un produit référencé dans iCHEF.</div>
                    <div class="inventory-product-preview">
                        <div class="inv-mini"><div class="inv-mini-label">Stock théorique</div><div class="inv-mini-value" id="inv-preview-theo">—</div></div>
                        <div class="inv-mini"><div class="inv-mini-label">Prix d’achat / unité</div><div class="inv-mini-value" id="inv-preview-unit-price">—</div></div>
                        <div class="inv-mini"><div class="inv-mini-label">Valeur théorique</div><div class="inv-mini-value" id="inv-preview-value">—</div></div>
                        <div class="inv-mini"><div class="inv-mini-label">Fournisseur</div><div class="inv-mini-value" id="inv-preview-supplier">—</div></div>
                    </div>
                </div>

                <div class="inventory-table-wrap" id="inventory-count-register">
                    <table>
                        <thead>
                            <tr>
                                <th>Produit</th>
                                <th>Fournisseur</th>
                                <th>Théorique</th>
                                <th>Réel</th>
                                <th>Prix / unité</th>
                                <th>Valeur réelle</th>
                                <th>Écart valeur</th>
                                <th>Audit</th>
                            </tr>
                        </thead>
                        <tbody id="logs-inventory">
                            <tr><td colspan="8" style="text-align:center;color:#64748b;padding:26px;">Aucun comptage récent.</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <div id="mod-archive" class="module">
            <div class="archive-layout" style="display: flex; gap: 20px; height: 100%;">
                <div class="card" style="flex: 0 0 250px; display: flex; flex-direction: column;">
                    <h2 style="margin:0 0 15px 0; font-size: 0.9rem; color: var(--ordered); text-transform: uppercase;">DOSSIER DE PREUVES HACCP</h2>
                    <div style="margin-bottom: 15px; font-size: 0.8rem; color: #888; line-height: 1.5;"><span id="archive-retention-note">La conservation des preuves est adaptée au référentiel de l’établissement et au type de document.</span></div>
                    
                    <button class="btn-backup" style="border-color: var(--accent); color: var(--accent); margin-bottom: 20px;" onclick="document.getElementById('import-file').click()">📥 RESTAURER UNE SAUVEGARDE</button>
                    <input type="file" id="import-file" style="display:none;" accept=".json" onchange="importArchive(this)">

                    <div style="flex:1; overflow-y:auto;" id="archive-folders"></div>
                </div>
                
                <div class="card" style="flex: 1; display: flex; flex-direction: column;">
                    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 1px solid #333; padding-bottom: 15px; margin-bottom: 15px; flex-wrap: wrap; gap: 10px;">
                        <h2 style="margin:0; font-size: 1.2rem; color: var(--ordered); text-transform: uppercase;" id="archive-title">SÉLECTIONNEZ UN MOIS</h2>
                        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                            <button class="btn-backup" id="btn-download-month" style="display:none; color: var(--gold); border-color: var(--gold);" onclick="downloadSelectedMonth()">💾 (.JSON)</button>
                            <button class="btn-backup" id="btn-print-month" style="display:none; color: var(--ordered); border-color: var(--ordered);" onclick="printArchiveMonth()">🖨️ IMPRIMER RAPPORT</button>
                        </div>
                    </div>
                    <div id="archive-results" style="flex:1; overflow-y:auto; padding-right: 15px;">
                        <div style="text-align:center; color:#555; margin-top:50px;">Sélectionnez une année et un mois à gauche pour voir les archives.</div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div id="catalog-modal" class="modal">
        <div class="catalog-box">
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 2px solid #333; padding-bottom: 15px;">
                <h2 style="color:var(--gold); margin:0;">🗂️ CATALOGUE</h2>
                <button style="background:transparent; border:none; color:#fff; font-size:1.5rem; cursor:pointer;" onclick="closeCatalog()">✕</button>
            </div>
            <input type="text" id="catalog-search" placeholder="🔍 Rechercher..." onkeyup="filterCatalog()" style="margin-top: 15px;">
            <div id="catalog-admin-tools" style="display:none; margin-bottom: 10px;">
                <button class="btn-catalog" style="width:100%; padding:15px; border-color:var(--accent); color:var(--accent);" onclick="promptNewItem()">➕ CRÉER UNE NOUVELLE CATÉGORIE / PRODUIT</button>
            </div>
            <div id="catalog-content"></div>
        </div>
    </div>

    <div id="photo-modal" class="modal" onclick="closePhoto()">
        <div class="catalog-box" style="width: auto; max-width: 95vw; background: transparent; border: none; align-items: center; justify-content: center; padding: 0;">
            <button style="background:var(--alert); border:none; color:#fff; font-size:1.5rem; cursor:pointer; border-radius:50%; width: 45px; height: 45px; margin-bottom: 15px; font-weight:bold; box-shadow: 0 4px 10px rgba(0,0,0,0.8);" onclick="closePhoto()">✕</button>
            <img id="photo-viewer-img" src="" style="max-width: 100%; max-height: 80vh; border-radius: 8px; border: 3px solid #333; box-shadow: 0 10px 30px rgba(0,0,0,0.8);" onclick="event.stopPropagation();">
        </div>
    </div>

    <script>
        const tenantID = String(window.ICHEF_HACCP?.tenantID || "").trim();
        const deviceId = String(window.ICHEF_HACCP?.deviceId || getDeviceFingerprint());
        const SERVER_URL =
            (window.location.hostname === "localhost" ||
             window.location.hostname === "127.0.0.1" ||
             window.location.protocol === "file:")
                ? "http://localhost:10000"
                : "https://tableau-system.onrender.com";

        const HACCP_CACHE_KEY = "EMPIRE_HACCP_SYNC_" + tenantID;
        function haccp223Staff(){return window.ICHEF_HACCP?.v223Staff === true;}
        function haccp223ScopedUrl(path){return `${SERVER_URL}/api/staff/haccp/${path}?tenantID=${encodeURIComponent(tenantID)}`;}


        const EU_COUNTRY_CODES = new Set([
            "AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU","IE",
            "IT","LV","LT","LU","MT","NL","PL","PT","RO","SK","SI","ES","SE"
        ]);

        const HACCP_REGULATORY_PROFILES = {
            FR: {
                id: "FR",
                css: "fr",
                countryCode: "FR",
                countryLabel: "FRANCE",
                shortLabel: "HACCP · FRANCE",
                title: "PMS / HACCP — France",
                framework: "Socle HACCP européen + exigences françaises applicables à l’établissement.",
                authority: "Contrôle sanitaire : autorité française compétente (notamment DDPP / DDETSPP selon le territoire).",
                exportTitle: "DOSSIER DE PREUVES PMS / HACCP — FRANCE",
                archiveNote: "Conserver les preuves selon leur nature, le PMS de l’établissement et les durées réglementaires applicables en France."
            },
            CH: {
                id: "CH",
                css: "ch",
                countryCode: "CH",
                countryLabel: "SUISSE",
                shortLabel: "HACCP · SUISSE",
                title: "Autocontrôle / HACCP — Suisse",
                framework: "Autocontrôle suisse, bonnes pratiques d’hygiène et principes HACCP applicables à l’établissement.",
                authority: "Contrôle officiel : autorité cantonale compétente en matière de denrées alimentaires.",
                exportTitle: "DOSSIER D’AUTOCONTRÔLE HACCP — SUISSE",
                archiveNote: "Conserver les preuves d’autocontrôle selon leur nature et les exigences applicables dans le canton et à l’activité."
            },
            EU: {
                id: "EU",
                css: "eu",
                countryCode: "EU",
                countryLabel: "UNION EUROPÉENNE",
                shortLabel: "HACCP · EUROPE",
                title: "HACCP — Union européenne",
                framework: "Socle HACCP européen ; les exigences nationales du pays d’implantation restent applicables.",
                authority: "Contrôle officiel : autorité compétente du pays où se situe l’établissement.",
                exportTitle: "DOSSIER DE PREUVES HACCP — UNION EUROPÉENNE",
                archiveNote: "Conserver les preuves selon les règles du pays d’implantation et le type de document ; le profil UE ne remplace pas les exigences nationales."
            },
            INTL: {
                id: "INTL",
                css: "intl",
                countryCode: "",
                countryLabel: "À CONFIGURER",
                shortLabel: "HACCP · À CONFIGURER",
                title: "Référentiel sanitaire à confirmer",
                framework: "Le pays enregistré ne permet pas d’appliquer automatiquement un profil France, Suisse ou Union européenne.",
                authority: "Vérifier le pays fiscal dans Administration avant d’utiliser ce dossier comme référentiel réglementaire.",
                exportTitle: "DOSSIER DE PREUVES HACCP — PROFIL À CONFIRMER",
                archiveNote: "Définir le pays de l’établissement afin d’adapter les mentions et règles de conservation."
            }
        };

        let currentRegulatoryProfile = HACCP_REGULATORY_PROFILES.INTL;
        let currentSystemSettings = {};

        function normalizeCountryCode(value) {
            const raw = String(value || "")
                .trim()
                .toUpperCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "");

            const aliases = {
                "SUISSE":"CH", "SWITZERLAND":"CH", "SCHWEIZ":"CH", "SVIZZERA":"CH",
                "FRANCE":"FR", "FRANCAISE":"FR",
                "BELGIQUE":"BE", "BELGIUM":"BE",
                "ESPAGNE":"ES", "SPAIN":"ES",
                "ITALIE":"IT", "ITALY":"IT",
                "ALLEMAGNE":"DE", "GERMANY":"DE",
                "PORTUGAL":"PT", "PAYS-BAS":"NL", "NETHERLANDS":"NL",
                "LUXEMBOURG":"LU", "AUTRICHE":"AT", "AUSTRIA":"AT"
            };

            return aliases[raw] || raw;
        }

        function resolveRegulatoryProfile(settings = {}) {
            const taxConfig = settings.taxConfig || {};
            const rawCountry =
                taxConfig.country ||
                settings.countryCode ||
                settings.country ||
                settings.fiscalCountry ||
                settings.address?.countryCode ||
                settings.address?.country ||
                "";

            const country = normalizeCountryCode(rawCountry);
            const currency = String(taxConfig.currency || settings.currency || "").trim().toUpperCase();

            // Le pays de l'établissement est toujours prioritaire sur la devise.
            // Cela évite par exemple de classer un établissement français en Suisse
            // uniquement parce qu'il accepte ou utilise le CHF.
            if (country === "CH") return HACCP_REGULATORY_PROFILES.CH;
            if (country === "FR") return HACCP_REGULATORY_PROFILES.FR;
            if (EU_COUNTRY_CODES.has(country)) return HACCP_REGULATORY_PROFILES.EU;

            // La devise n'est qu'un filet de sécurité pour les anciens tenants
            // dont le pays n'a pas encore été renseigné.
            if (!country && currency === "CHF") return HACCP_REGULATORY_PROFILES.CH;
            if (!country && (currency === "€" || currency === "EUR")) return HACCP_REGULATORY_PROFILES.FR;

            // CUSTOM ne doit pas inventer un pays réglementaire.
            return HACCP_REGULATORY_PROFILES.INTL;
        }

        function applyRegulatoryProfile(settings = {}) {
            currentSystemSettings = settings && typeof settings === "object" ? settings : {};
            currentRegulatoryProfile = resolveRegulatoryProfile(currentSystemSettings);
            window.ICHEF_HACCP.regulatoryProfile = currentRegulatoryProfile.id;
            window.ICHEF_HACCP.countryCode = currentRegulatoryProfile.countryCode;

            const pill = document.getElementById("haccp-reg-profile");
            if (pill) {
                pill.className = "reg-profile-pill " + currentRegulatoryProfile.css;
                pill.textContent = "RÉFÉRENTIEL · " + currentRegulatoryProfile.countryLabel;
            }

            const title = document.getElementById("regulatory-banner-title");
            const text = document.getElementById("regulatory-banner-text");
            const authority = document.getElementById("regulatory-banner-authority");
            const chip = document.getElementById("regulatory-country-chip");
            const archiveNote = document.getElementById("archive-retention-note");

            if (title) title.textContent = currentRegulatoryProfile.title;
            if (text) text.textContent = currentRegulatoryProfile.framework;
            if (authority) authority.textContent = currentRegulatoryProfile.authority;
            if (chip) {
                chip.className = "regulatory-country-chip " + currentRegulatoryProfile.css;
                chip.textContent = currentRegulatoryProfile.countryLabel;
            }
            if (archiveNote) archiveNote.textContent = currentRegulatoryProfile.archiveNote;
        }

        function regulatoryAuditMeta() {
            return {
                tenantID,
                regulatoryProfile: currentRegulatoryProfile.id,
                regulatoryCountry: currentRegulatoryProfile.countryCode,
                regulatoryLabel: currentRegulatoryProfile.title,
                regulatoryFramework: currentRegulatoryProfile.framework
            };
        }


        const ICHEF_HACCP_SECURITY_BUILD = "7.0 HACCP V251 · IDENTIFICATION RAPIDE";
        console.info("[iCHEF HACCP] Build sécurisé", ICHEF_HACCP_SECURITY_BUILD, "· SSO identité unique · tenant:", tenantID);

        function haccpSessionTokens() {
            // Le jeton doit venir d'une vraie connexion iCHEF déjà authentifiée.
            // Aucun PIN, rôle ou droit n'est lu dans l'URL ou le localStorage.
            const values = [
                window.ICHEF_HACCP?.accessToken,
                sessionStorage.getItem("ichef_chef_access_token"),
                sessionStorage.getItem("ichef_access_token"),
                sessionStorage.getItem("ichef_auth_token"),
                sessionStorage.getItem("ichef_ops_token"),
                window.ICHEF_SECURITY?.accessToken,
                window.ICHEF_SECURITY?.operationsToken
            ];
            return [...new Set(values.map(v => String(v || "").trim()).filter(v => v.length >= 20))];
        }

        function haccpSessionToken() {
            return String(
                window.ICHEF_HACCP?.accessToken ||
                haccpSessionTokens()[0] ||
                ""
            ).trim();
        }

        function systemHeaders(extra = {}) {
            // Les appels HACCP réutilisent la session signée déjà ouverte
            // (Chef, Cuisine, Pâtisserie, Bar ou Service). Aucun PIN n'est relu.
            const headers = Object.assign({
                "Accept": "application/json",
                "X-iCHEF-Tenant": tenantID,
                "X-iCHEF-Device": deviceId
            }, extra);

            const accessToken = haccpSessionToken();
            const csrfToken = sessionStorage.getItem("ichef_csrf_token");
            if (accessToken) headers["Authorization"] = "Bearer " + accessToken;
            if (csrfToken) headers["X-CSRF-Token"] = csrfToken;
            return headers;
        }

        function setSyncStatus(state, text) {
            const el = document.getElementById("haccp-sync-status");
            if (!el) return;
            el.className = "sync-pill " + (state || "degraded");
            el.textContent = text || "SYSTÈME";
        }

        function readHaccpCache() {
            try {
                const key=haccp223Staff()?`EMPIRE_HACCP_STAFF_V223_${tenantID}_${window.ICHEF_HACCP?.staffId||''}`:HACCP_CACHE_KEY;
                return JSON.parse(localStorage.getItem(key)) || { activeOrders: {} };
            } catch (_) {
                return { activeOrders: {} };
            }
        }

        function writeHaccpCache(state) {
            // Le cache local sert uniquement à ouvrir HACCP rapidement.
            // Les preuves photo ne sont JAMAIS dupliquées dans localStorage :
            // elles restent côté serveur pendant leur durée de conservation.
            try {
                const json = JSON.stringify(
                    state || { activeOrders: {} },
                    (key, value) => (key === "tempPhotoData" || key === "imgData") ? undefined : value
                );
                const key=haccp223Staff()?`EMPIRE_HACCP_STAFF_V223_${tenantID}_${window.ICHEF_HACCP?.staffId||''}`:HACCP_CACHE_KEY;
                localStorage.setItem(key, json);
            } catch (_) {}
        }

        async function getHaccpServerStateStrict() {
            const r = await fetch(
                (haccp223Staff()?haccp223ScopedUrl('state'):`${SERVER_URL}/get-current-state?tenantID=${encodeURIComponent(tenantID)}&_t=${Date.now()}&haccpBuild=5800`),
                {
                    method:"GET",
                    credentials:"include",
                    cache:"no-store",
                    headers:systemHeaders()
                }
            );
            if (!r.ok) {
                let err = {};
                try { err = await r.json(); } catch (_) {}
                throw new Error(err.error || err.message || `Lecture serveur refusée (${r.status})`);
            }
            return await r.json();
        }

        let haccpStateRequestInFlight = null;
        let haccpStateMemory = null;
        let haccpStateMemoryAt = 0;
        const HACCP_FAST_STATE_TTL = 1200;

        const API = {
            getState: async ({ force = false } = {}) => {
                const now = Date.now();
                if (!force && haccpStateMemory && (now - haccpStateMemoryAt) < HACCP_FAST_STATE_TTL) {
                    return haccpStateMemory;
                }
                if (!force && haccpStateRequestInFlight) return haccpStateRequestInFlight;

                const request = (async () => {
                    try {
                        const controller = new AbortController();
                        const timeout = setTimeout(() => controller.abort(), 6500);
                        let r;
                        try {
                            r = await fetch(
                                (haccp223Staff()?haccp223ScopedUrl('state'):`${SERVER_URL}/get-current-state?tenantID=${encodeURIComponent(tenantID)}&_t=${Date.now()}&haccpBuild=6100`),
                                {
                                    method: "GET",
                                    credentials: "include",
                                    cache: "no-store",
                                    headers: systemHeaders(),
                                    signal: controller.signal
                                }
                            );
                        } finally {
                            clearTimeout(timeout);
                        }

                        if (!r.ok) {
                            let err = {};
                            try { err = await r.json(); } catch (_) {}
                            throw new Error(err.error || err.message || `Lecture serveur refusée (${r.status})`);
                        }

                        const state = await r.json();
                        haccpStateMemory = state;
                        haccpStateMemoryAt = Date.now();
                        writeHaccpCache(state);
                        setSyncStatus("online", "SYSTÈME · SYNCHRONISÉ");
                        return state;
                    } catch (e) {
                        console.warn("[iCHEF HACCP] Lecture serveur indisponible :", e);
                        setSyncStatus("degraded", "SYSTÈME · MODE SECOURS");
                        // V224 : ne jamais révéler de données Staff hors vérification serveur.
                        if(haccp223Staff())throw e;
                        const cached = haccpStateMemory || readHaccpCache();
                        if (cached) {
                            haccpStateMemory = cached;
                            haccpStateMemoryAt = Date.now();
                        }
                        return cached;
                    } finally {
                        haccpStateRequestInFlight = null;
                    }
                })();

                haccpStateRequestInFlight = request;
                return request;
            },

            update: async (key, data) => {
                if(haccp223Staff()){
                    if(!['HACCP_TEMP','HACCP_CLEANING','HACCP_TRACE'].includes(key))throw new Error('Cette opération est réservée au responsable HACCP.');
                    const r=await fetch(haccp223ScopedUrl('records'),{method:'POST',cache:'no-store',credentials:'omit',headers:systemHeaders({'Content-Type':'application/json'}),body:JSON.stringify({tableId:key,data})});
                    const ans=await r.json().catch(()=>({}));
                    if(!r.ok||ans.success!==true)throw new Error(ans.error||'Enregistrement HACCP refusé.');
                    // On recharge l'état filtré et canonique après l'écriture.
                    haccpStateMemory=null;haccpStateMemoryAt=0;
                    const snap=await getHaccpServerStateStrict();writeHaccpCache(snap);applyHaccpState(snap);
                    return ans;
                }
                const r = await fetch(
                    `${SERVER_URL}/update-order?tenantID=${encodeURIComponent(tenantID)}&haccpBuild=5800`,
                    {
                        method: "POST",
                        credentials: "include",
                        cache: "no-store",
                        headers: systemHeaders({ "Content-Type": "application/json", "Accept": "application/json" }),
                        body: JSON.stringify({
                            tableId: key,
                            order: data === null ? null : { data }
                        })
                    }
                );

                let payload = {};
                try { payload = await r.json(); } catch (_) {}

                if (!r.ok || payload?.success === false) {
                    setSyncStatus("degraded", "SYSTÈME · SAUVEGARDE À REFAIRE");
                    throw new Error(payload.error || payload.message || `Sauvegarde serveur refusée (${r.status})`);
                }

                // Le cache n'est mis à jour qu'après confirmation réelle du serveur.
                const cache = readHaccpCache();
                cache.activeOrders = cache.activeOrders || {};
                if (data === null) delete cache.activeOrders[key];
                else cache.activeOrders[key] = { data };
                writeHaccpCache(cache);
                haccpStateMemory = cache;
                haccpStateMemoryAt = Date.now();

                // Signal commun ; le polling reste le filet de sécurité si le serveur
                // ne relaie pas un événement spécifique.
                try {
                    if (haccpSocket?.connected) {
                        haccpSocket.emit("orderUpdated", { tenantID, tableId:key, source:"HACCP" });
                        if (key === "INVENTORY_MASTER") {
                            haccpSocket.emit("inventory-updated", { tenantID, source:"HACCP" });
                        }
                    }
                } catch (_) {}

                setSyncStatus("online", "SYSTÈME · SAUVEGARDÉ");
                return payload;
            }
        };

        let db = {
            temp: [], cleaning: [], trace: [], inventoryMaster: [], inventoryLogs: [], inventoryMovements: [],
            recipesMaster: [], staffAccess: [], menuCuisine: {}, menuBar: {}, menuPatisserie: {},
            systemSettings: {}, haccpLists: null
        };
        let currentDept = "";
        let pin = "";
        let rectifiedId = null;
        let rectifiedType = null;
        let currentCatalogCategory = "";
        let selectedArchiveData = { temp: [], cleaning: [], trace: [] };
        let currentUser = { name: "", role: "", permissions: [] };


        function openIchefModule(page, extra = {}) {
            const params = new URLSearchParams();
            if (tenantID) params.set('tenantID', tenantID);
            params.set('from', 'haccp');
            Object.entries(extra || {}).forEach(([k,v]) => {
                if (v !== undefined && v !== null && String(v) !== '') params.set(k, String(v));
            });
            window.location.href = `${page}?${params.toString()}`;
        }

        function setSystemLinkState(id, text, state = '') {
            const el = document.getElementById(id);
            if (!el) return;
            el.textContent = text;
            el.className = 'system-link-value' + (state ? ' ' + state : '');
        }

        function applySystemStateIndicators() {
            setSystemLinkState('sys-tenant', tenantID || 'Non défini', tenantID ? 'ok' : 'warn');
            const settingsLoaded = db.systemSettings && Object.keys(db.systemSettings).length > 0;
            setSystemLinkState('sys-settings', settingsLoaded ? 'Synchronisés' : 'Non reçus', settingsLoaded ? 'ok' : 'warn');
            setSystemLinkState('sys-inventory', `${Array.isArray(db.inventoryMaster) ? db.inventoryMaster.length : 0} articles`, 'ok');
            setSystemLinkState('sys-recipes', `${Array.isArray(db.recipesMaster) ? db.recipesMaster.length : 0} recettes`, 'ok');
            setSystemLinkState('sys-staff', `${Array.isArray(db.staffAccess) ? db.staffAccess.length : 0} profils`, 'ok');
        }

        function normalizedRole(role) {
            return String(role || "")
                .trim()
                .toUpperCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "");
        }

        function isAdminRole() {
            return ["MASTER","ADMIN","MANAGER","DIRECTION","GERANT","OWNER","PATRON"]
                .includes(normalizedRole(currentUser.role));
        }

        function isBoss() {
            return [
                "MASTER","ADMIN","MANAGER","DIRECTION","GERANT","OWNER","PATRON",
                "CHEF","CHEF_CUISINE","CHEF_BAR","CHEF_PATISSERIE","CHEF_PATISSIER"
            ].includes(normalizedRole(currentUser.role));
        }

        function userAuditLabel() {
            return currentUser.name || currentUser.role || "Utilisateur iCHEF";
        }

        // V244 — Retour Bureau : navigation seulement (jamais preuve d'autorisation).
        // Le serveur reste le seul à valider la session et les permissions HACCP.
        function ichefHaccpDeskPage() {
            const params = new URLSearchParams(window.location.search);
            const from = String(params.get('from') || '').trim().toLowerCase()
                .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            const pages = {
                chef: 'chef.html', cuisine: 'chef.html', 'chef.html': 'chef.html',
                patisserie: 'chef-patissier.html', patissier: 'chef-patissier.html',
                'chef-patissier': 'chef-patissier.html', 'chef-patissier.html': 'chef-patissier.html',
                bar: 'chef-bar.html', 'chef-bar': 'chef-bar.html', 'chef-bar.html': 'chef-bar.html',
                service: 'pack-eco.html', caisse: 'pack-eco.html', salle: 'pack-eco.html',
                'pack-eco': 'pack-eco.html',
                staff: 'portail-staff.html', collaborateur: 'portail-staff.html',
                'portail-staff': 'portail-staff.html',
                admin: 'admin.html', administration: 'admin.html', direction: 'admin.html'
            };
            if (Object.prototype.hasOwnProperty.call(pages, from)) return pages[from];
            const dept = String(currentDept || window.ICHEF_HACCP?.department || '')
                .trim().toUpperCase();
            if (dept === 'CUISINE') return 'chef.html';
            if (dept === 'PATISSERIE') return 'chef-patissier.html';
            if (dept === 'BAR') return 'chef-bar.html';
            if (dept === 'SERVICE') return 'pack-eco.html';
            if (dept === 'ADMIN' || dept === 'DIRECTION') return 'admin.html';
            const ref = String(document.referrer || '');
            // On ne suit aucun domaine externe : uniquement une page iCHEF connue.
            try {
                const u = new URL(ref);
                if (u.origin === window.location.origin) {
                    const name = u.pathname.split('/').pop().toLowerCase();
                    if (Object.values(pages).includes(name)) return name;
                }
            } catch (_) {}
            return 'admin.html';
        }
        function ichefHaccpGoToDesk() {
            const page = ichefHaccpDeskPage();
            const q = tenantID ? '?tenantID=' + encodeURIComponent(tenantID) : '';
            window.location.assign(page + q);
        }
        function returnToAdmin() { ichefHaccpGoToDesk(); }

        let haccpSocket = null;
        let haccpRefreshTimer = null;

        function connectHaccpRealtime() {
            if (haccpSocket || !tenantID || typeof io !== "function") {
                if (typeof io !== "function") {
                    setSyncStatus("degraded", "SYSTÈME · TEMPS RÉEL INDISPONIBLE");
                }
                return;
            }

            try {
                haccpSocket = io(SERVER_URL, {
                    transports: ["polling", "websocket"],
                    upgrade: true,
                    withCredentials: true,
                    reconnection: true,
                    reconnectionAttempts: Infinity,
                    reconnectionDelay: 1000,
                    reconnectionDelayMax: 8000,
                    timeout: 20000,
                    auth: { tenantID, deviceId, page: "HACCP" }
                });

                window.ICHEF_HACCP.socket = haccpSocket;

                haccpSocket.on("connect", () => {
                    try { haccpSocket.emit("joinTenant", tenantID); } catch (_) {}
                    setSyncStatus("online", "SYSTÈME · TEMPS RÉEL");
                    setSystemLinkState("sys-realtime", "Connecté", "ok");
                    document.querySelectorAll(".system-hub-btn").forEach(b => b.classList.add("system-live"));
                });

                haccpSocket.on("disconnect", () => {
                    setSyncStatus("degraded", "SYSTÈME · RECONNEXION…");
                    setSystemLinkState("sys-realtime", "Reconnexion…", "warn");
                    document.querySelectorAll(".system-hub-btn").forEach(b => b.classList.remove("system-live"));
                });

                haccpSocket.on("connect_error", () => {
                    setSyncStatus("degraded", "SYSTÈME · TEMPS RÉEL DÉGRADÉ");
                    setSystemLinkState("sys-realtime", "Dégradé", "warn");
                });

                [
                    "updateState",
                    "state-updated",
                    "haccp-updated",
                    "inventory-updated",
                    "menu-updated",
                    "recipes-updated",
                    "staff-updated",
                    "settings-updated",
                    "ichef:core:update"
                ].forEach(evt => {
                    haccpSocket.on(evt, () => {
                        if (!window.ICHEF_HACCP?.authenticated) return;
                        clearTimeout(haccpRefreshTimer);
                        haccpRefreshTimer = setTimeout(() => {
                            loadData({ force:true }).catch(() => {});
                        }, 120);
                    });
                });
            } catch (e) {
                console.warn("[iCHEF HACCP] Socket indisponible :", e);
                setSyncStatus("degraded", "SYSTÈME · TEMPS RÉEL INDISPONIBLE");
            }
        }

        let haccpPollTimer = null;
        let haccpLastForegroundRefreshAt = 0;
        function startHaccpSharedPolling() {
            if (haccpPollTimer) return;
            haccpPollTimer = setInterval(async () => {
                if (!window.ICHEF_HACCP?.authenticated) return;
                if (document.visibilityState === 'hidden') return;
                if (haccpSocket?.connected) return; // le temps réel est prioritaire
                const active = document.activeElement;
                if (active && ['INPUT','TEXTAREA','SELECT'].includes(active.tagName)) return;
                if (document.querySelector('.modal.open')) return;
                try {
                    await loadData({ force:true });
                    await flushPendingInventoryAudits();
                    await flushPendingHaccpMovements();
                } catch (_) {}
            }, 30000);

            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState !== 'visible' || !window.ICHEF_HACCP?.authenticated) return;
                const now = Date.now();
                if (now - haccpLastForegroundRefreshAt < 4000) return;
                haccpLastForegroundRefreshAt = now;
                loadData({ force:true }).catch(() => {});
            }, { passive:true });
        }


        // ============================================================
        // iCHEF HACCP — PARC D'ÉQUIPEMENTS STANDARDISÉ
        // Typologie commune, contenu indépendant par secteur.
        // ============================================================
        const HACCP_EQUIPMENT_TYPES = [
            { id:"COLD_ROOM_POS", label:"Chambres froides positives", kind:"COLD" },
            { id:"COLD_ROOM_NEG", label:"Chambres froides négatives", kind:"FROZEN" },
            { id:"FRIDGE", label:"Frigos / Tours / Armoires", kind:"COLD" },
            { id:"FREEZER", label:"Congélateurs / Surgélateurs", kind:"FROZEN" },
            { id:"DISPLAY", label:"Vitrines / Meubles froids", kind:"COLD" },
            { id:"COOLING_CELL", label:"Cellules de refroidissement", kind:"COOLING" },
            { id:"HOT_HOLD", label:"Liaison / Maintien chaud", kind:"HOT" },
            { id:"REHEAT", label:"Remise en température", kind:"REHEAT" },
            { id:"BEVERAGE", label:"Caves / Boissons", kind:"COLD" },
            { id:"ICE", label:"Machines à glaçons", kind:"COLD" },
            { id:"OTHER", label:"Autres équipements", kind:"COLD" }
        ];

        let desktopTempSelected = null;
        let desktopTempFilter = "all";
        let desktopRound = [];
        let desktopRoundIndex = -1;

        function haccpNormalizeEquipmentText(value="") {
            return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase().trim();
        }

        function getEquipmentTypeByLabel(label="") {
            const n = haccpNormalizeEquipmentText(label);
            return HACCP_EQUIPMENT_TYPES.find(t => haccpNormalizeEquipmentText(t.label) === n) || null;
        }

        function classifyEquipmentType(name="", folder="") {
            // V227 : le type technique (et donc les règles de température) reste stable
            // lorsqu'un responsable renomme une catégorie visible.
            const defined = EMPIRE_LISTS?.[currentDept]?.eqCategoryTypes?.[folder];
            const mapped = HACCP_EQUIPMENT_TYPES.find(t => t.id === defined);
            if (mapped) return mapped;
            const legacy = getEquipmentTypeByLabel(folder);
            if (legacy) return legacy;
            const text = haccpNormalizeEquipmentText(folder + " " + name);
            if (/CELLULE|REFROIDISSEMENT/.test(text)) return HACCP_EQUIPMENT_TYPES.find(t=>t.id==="COOLING_CELL");
            if (/CHAMBRE/.test(text) && /NEGAT|CONGEL|SURGEL/.test(text)) return HACCP_EQUIPMENT_TYPES.find(t=>t.id==="COLD_ROOM_NEG");
            if (/CHAMBRE/.test(text)) return HACCP_EQUIPMENT_TYPES.find(t=>t.id==="COLD_ROOM_POS");
            if (/CONGEL|SURGEL|FREEZER|NEGAT/.test(text)) return HACCP_EQUIPMENT_TYPES.find(t=>t.id==="FREEZER");
            if (/REMISE|REGENERATION|REGENER/.test(text)) return HACCP_EQUIPMENT_TYPES.find(t=>t.id==="REHEAT");
            if (/LIAISON|MAINTIEN|BAIN.?MARIE|CHAUD/.test(text)) return HACCP_EQUIPMENT_TYPES.find(t=>t.id==="HOT_HOLD");
            if (/GLACON/.test(text)) return HACCP_EQUIPMENT_TYPES.find(t=>t.id==="ICE");
            if (/VITRINE|MEUBLE/.test(text)) return HACCP_EQUIPMENT_TYPES.find(t=>t.id==="DISPLAY");
            if (/CAVE|BOISSON|VIN/.test(text)) return HACCP_EQUIPMENT_TYPES.find(t=>t.id==="BEVERAGE");
            if (/FRIGO|TOUR|ARMOIRE|ARRIERE BAR/.test(text)) return HACCP_EQUIPMENT_TYPES.find(t=>t.id==="FRIDGE");
            return getEquipmentTypeByLabel(folder) || HACCP_EQUIPMENT_TYPES.find(t=>t.id==="OTHER");
        }

        function haccpEquipmentDisplay(name) {
            const key=String(name??'');
            const labels=EMPIRE_LISTS?.[currentDept]?.eqDisplayNames;
            const custom=labels&&Object.prototype.hasOwnProperty.call(labels,key)?labels[key]:null;
            return typeof custom==='string' && custom.trim() ? custom : key;
        }

        function getSectorEquipmentList() {
            const eq = EMPIRE_LISTS?.[currentDept]?.eq || {};
            const result = [];
            Object.entries(eq).forEach(([folder,items]) => {
                (Array.isArray(items)?items:[]).forEach(name => {
                    const type = classifyEquipmentType(name,folder);
                    result.push({name,folder,typeId:type.id,typeLabel:folder,kind:type.kind});
                });
            });
            return result;
        }

        function getLatestTemperatureForEquipment(name) {
            return (db.temp || [])
                .filter(x => x.dept === currentDept && x.eq === name && !x.originalId)
                .sort((a,b) => String(b.timestamp || "").localeCompare(String(a.timestamp || "")))[0] || null;
        }

        function isTemperatureLogToday(log) {
            if (!log) return false;
            const d = log.timestamp ? new Date(log.timestamp) : null;
            const n = new Date();
            if (!d || Number.isNaN(d.getTime())) return log.date === n.toLocaleDateString("fr-FR");
            return d.getFullYear()===n.getFullYear() && d.getMonth()===n.getMonth() && d.getDate()===n.getDate();
        }

        function escapeHaccpUi(value="") {
            return String(value ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
        }

        function desktopTemperatureRuleFor(item) {
            if (!item || item.kind === "COOLING") return null;
            const country = currentRegulatoryProfile?.id || "INTL";

            if (item.kind === "REHEAT") {
                if (country === "FR") return {
                    mode:"MIN", limit:63,
                    label:"Remise en température · +63 °C minimum",
                    source:"France · restauration collective : +10 °C à la température de service en moins d’1 h, sauf analyse des dangers validée."
                };
                if (country === "CH") return {
                    mode:"MIN", limit:70,
                    label:"Réchauffage · +70 °C",
                    source:"Suisse · recommandation OSAV : aliments déjà cuits réchauffés à au moins +70 °C."
                };
            }

            return typeof getTemperatureRule === "function" ? getTemperatureRule(item.name) : null;
        }

        function evaluateDesktopTemperature(item,value) {
            const val = Number(value);
            const rule = desktopTemperatureRuleFor(item);
            if (!rule || !Number.isFinite(val) || rule.mode === "NONE") return {ok:null,status:"À VÉRIFIER",rule};
            const ok = rule.mode === "MIN" ? val >= Number(rule.limit) : val <= Number(rule.limit);
            return {ok,status:ok?"OK":"ALERTE",rule};
        }

        function getCoolingReference() {
            const country = currentRegulatoryProfile?.id || "INTL";
            if (country === "FR") return {
                profile:"FR", startTarget:63, endTarget:10, maxMinutes:120,
                label:"+63 °C → +10 °C en moins de 2 h",
                source:"France · référence restauration collective. Le PMS/analyse des dangers peut prévoir un autre couple validé."
            };
            if (country === "CH") return {
                profile:"CH", startTarget:null, endTarget:5, maxMinutes:null,
                label:"Refroidissement rapide selon l’autocontrôle de l’établissement",
                source:"Suisse · OSAV : autocontrôle/HACCP et guide de bonnes pratiques. La durée doit suivre la règle validée de l’établissement."
            };
            return {profile:"INTL",startTarget:null,endTarget:null,maxMinutes:null,label:"Règle à configurer",source:"Définissez le pays et le référentiel de l’établissement."};
        }

        function coolingCycleStorageKey(name) {
            return `ICHEF_COOLING_ACTIVE_${tenantID}_${currentDept}_${String(name||"").replace(/\W+/g,"_")}`;
        }

        function renderDesktopTemperatureHub() {
            const hub = document.getElementById("haccp-desktop-temp-hub");
            if (!hub || !currentDept) return;

            const profile = document.getElementById("hd-profile-chip");
            if (profile) profile.textContent = currentRegulatoryProfile?.id==="CH" ? "SUISSE · AUTOCONTRÔLE" : currentRegulatoryProfile?.id==="FR" ? "FRANCE · PMS / HACCP" : "RÉFÉRENTIEL À CONFIRMER";

            const equipment = getSectorEquipmentList();
            const filtered = equipment.filter(item => {
                const last = getLatestTemperatureForEquipment(item.name);
                if (desktopTempFilter==="todo") return !isTemperatureLogToday(last);
                if (desktopTempFilter==="ok") return last?.status==="OK";
                if (desktopTempFilter==="alert") return last?.status==="ALERTE";
                return true;
            });

            const byType = new Map(HACCP_EQUIPMENT_TYPES.map(t=>[t.id,[]]));
            filtered.forEach(item => byType.get(item.typeId)?.push(item));

            let out = "";
            HACCP_EQUIPMENT_TYPES.forEach(type => {
                const items = byType.get(type.id) || [];
                const deletedTypes=EMPIRE_LISTS?.[currentDept]?.eqDeletedTypeIds||[];
                // La surveillance d'un équipement existant n'est jamais masquée.
                if (!items.length && Array.isArray(deletedTypes) && deletedTypes.includes(type.id)) return;
                if (!items.length && desktopTempFilter !== "all") return;

                out += `<div class="hd-eq-group"><div class="hd-eq-group-title"><span>${escapeHaccpUi(type.label)}</span><b>${items.length}</b></div><div class="hd-eq-items">`;
                if (!items.length) {
                    out += `<button type="button" class="hd-eq-empty" onclick="openDesktopEquipmentCreator('${type.id}')">+ Ajouter</button>`;
                } else {
                    items.forEach(item => {
                        const last = getLatestTemperatureForEquipment(item.name);
                        const cls = last?.status==="ALERTE" ? "alert" : last?.status==="OK" ? "ok" : "neutral";
                        const selected = desktopTempSelected?.name===item.name ? " selected" : "";
                        const lastText = last ? `${Number(last.val).toLocaleString("fr-FR")} °C · ${escapeHaccpUi(last.time||"")}` : "Pas encore contrôlé";
                        const safeName = String(item.name).replace(/\\/g,"\\\\").replace(/'/g,"\\'");
                        out += `<button type="button" class="hd-eq-item ${cls}${selected}" onclick="selectDesktopEquipmentByName('${safeName}')"><span class="hd-eq-dot"></span><span class="hd-eq-main"><b>${escapeHaccpUi(haccpEquipmentDisplay(item.name))}</b><small>${lastText}</small></span><span class="hd-eq-state">${last?.status||"—"}</span></button>`;
                    });
                }
                out += `</div></div>`;
            });

            const host = document.getElementById("hd-equipment-groups");
            if (host) host.innerHTML = out || `<div class="hd-parc-empty">Aucun équipement dans ce secteur.</div>`;

            const latest = equipment.map(x=>getLatestTemperatureForEquipment(x.name));
            const today = latest.filter(isTemperatureLogToday).length;
            const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=String(v)};
            set("hd-kpi-total",equipment.length);
            set("hd-kpi-todo",Math.max(0,equipment.length-today));
            set("hd-kpi-ok",latest.filter(x=>x?.status==="OK").length);
            set("hd-kpi-alert",latest.filter(x=>x?.status==="ALERTE").length);

            const sub=document.getElementById("hd-parc-subtitle");
            if(sub)sub.textContent=`${currentDept} · ${equipment.length} équipement${equipment.length>1?"s":""}`;

            if (desktopTempSelected) {
                const fresh = equipment.find(x=>x.name===desktopTempSelected.name);
                if (fresh) { desktopTempSelected=fresh; renderDesktopSelectedEquipment(); }
            }
        }

        function filterDesktopEquipment(filter){desktopTempFilter=filter||"all";renderDesktopTemperatureHub()}

        function selectDesktopEquipmentByName(name){
            const item=getSectorEquipmentList().find(x=>x.name===name);
            if(!item)return;
            desktopTempSelected=item;
            renderDesktopTemperatureHub();
            renderDesktopSelectedEquipment();
        }

        function renderDesktopSelectedEquipment(){
            const empty=document.getElementById("hd-empty-reading");
            const standard=document.getElementById("hd-standard-reading");
            const cooling=document.getElementById("hd-cooling-reading");
            if(!desktopTempSelected){
                if(empty)empty.hidden=false;if(standard)standard.hidden=true;if(cooling)cooling.hidden=true;return;
            }
            if(empty)empty.hidden=true;

            if(desktopTempSelected.kind==="COOLING"){
                if(standard)standard.hidden=true;if(cooling)cooling.hidden=false;
                const n=document.getElementById("hd-cooling-name");if(n)n.textContent=haccpEquipmentDisplay(desktopTempSelected.name);
                renderCoolingCycleState();return;
            }

            if(standard)standard.hidden=false;if(cooling)cooling.hidden=true;
            const c=document.getElementById("hd-reading-category");if(c)c.textContent=desktopTempSelected.typeLabel;
            const n=document.getElementById("hd-reading-name");if(n)n.textContent=haccpEquipmentDisplay(desktopTempSelected.name);

            const rule=desktopTemperatureRuleFor(desktopTempSelected);
            const rb=document.getElementById("hd-rule-box");
            if(rb)rb.innerHTML=rule?`<strong>${escapeHaccpUi(rule.label||"")}</strong><span>${escapeHaccpUi(rule.source||"")}</span>`:`<strong>Référentiel à confirmer</strong><span>Vérifiez le pays de l’établissement.</span>`;

            const last=getLatestTemperatureForEquipment(desktopTempSelected.name);
            const st=document.getElementById("hd-last-status");
            if(st){st.className=`hd-status ${last?.status==="OK"?"ok":last?.status==="ALERTE"?"alert":"neutral"}`;st.textContent=last?.status||"PAS DE RELEVÉ"}
            const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v};
            set("hd-last-value",last?`${Number(last.val).toLocaleString("fr-FR")} °C`:"—");
            set("hd-last-time",last?`${last.date||""} ${last.time||""}`.trim():"—");
            set("hd-last-user",last?.audit?String(last.audit).replace(/^Saisi par\s*/i,""):"—");

            const input=document.getElementById("hd-temp-value");
            if(input){input.value="";input.focus({preventScroll:true})}
            updateDesktopCompliancePreview();
        }

        function updateDesktopCompliancePreview(){
            const box=document.getElementById("hd-live-compliance");
            const input=document.getElementById("hd-temp-value");
            if(!box||!input||!desktopTempSelected)return;
            const val=Number(String(input.value||"").replace(",","."));
            if(!Number.isFinite(val)){box.className="hd-compliance neutral";box.textContent="Entrez une valeur.";return}
            const ev=evaluateDesktopTemperature(desktopTempSelected,val);
            if(ev.ok===true){box.className="hd-compliance ok";box.textContent=`CONFORME · ${val.toLocaleString("fr-FR")} °C`}
            else if(ev.ok===false){box.className="hd-compliance alert";box.textContent=`ALERTE · ${val.toLocaleString("fr-FR")} °C`}
            else{box.className="hd-compliance review";box.textContent="Référentiel à confirmer avant classement automatique."}
        }

        async function saveDesktopTemperatureReading(){
            if(!desktopTempSelected)return;
            const input=document.getElementById("hd-temp-value");
            const val=Number(String(input?.value||"").replace(",","."));
            if(!Number.isFinite(val)){input?.focus();return}
            const eq=document.getElementById("temp-eq"), legacyVal=document.getElementById("temp-val");
            if(!eq||!legacyVal)return;
            eq.value=desktopTempSelected.name;legacyVal.value=String(val);
            const btn=document.getElementById("hd-save-temp"), old=btn?.textContent||"";
            if(btn){btn.disabled=true;btn.textContent="ENREGISTREMENT…"}
            try{
                await saveEntry("temp");
                renderDesktopTemperatureHub();
                if(desktopRound.length)desktopRoundNext();else renderDesktopSelectedEquipment();
            }finally{
                if(btn){btn.disabled=false;btn.textContent=old||"ENREGISTRER"}
            }
        }

        function startDesktopTemperatureRound(){
            desktopRound=getSectorEquipmentList().filter(x=>x.kind!=="COOLING");
            desktopRoundIndex=0;
            if(!desktopRound.length)return;
            desktopTempFilter="all";desktopTempSelected=desktopRound[0];
            renderDesktopTemperatureHub();renderDesktopSelectedEquipment();
        }

        function desktopRoundNext(){
            const all=desktopRound.length?desktopRound:getSectorEquipmentList();
            if(!all.length)return;
            if(desktopRound.length){desktopRoundIndex=(desktopRoundIndex+1)%desktopRound.length;desktopTempSelected=desktopRound[desktopRoundIndex]}
            else{const i=Math.max(0,all.findIndex(x=>x.name===desktopTempSelected?.name));desktopTempSelected=all[(i+1)%all.length]}
            renderDesktopTemperatureHub();renderDesktopSelectedEquipment();
        }

        function desktopRoundPrevious(){
            const all=desktopRound.length?desktopRound:getSectorEquipmentList();
            if(!all.length)return;
            if(desktopRound.length){desktopRoundIndex=(desktopRoundIndex-1+desktopRound.length)%desktopRound.length;desktopTempSelected=desktopRound[desktopRoundIndex]}
            else{const i=Math.max(0,all.findIndex(x=>x.name===desktopTempSelected?.name));desktopTempSelected=all[(i-1+all.length)%all.length]}
            renderDesktopTemperatureHub();renderDesktopSelectedEquipment();
        }

        function openDesktopEquipmentCreator(typeId=""){
            const box=document.getElementById("hd-equipment-creator"), select=document.getElementById("hd-new-equipment-type");
            if(!box||!select)return;
            const groups=EMPIRE_LISTS?.[currentDept]?.eq||{};
            select.innerHTML=Object.keys(groups).map(folder=>`<option value="${escapeHaccpUi(folder)}">${escapeHaccpUi(folder)}</option>`).join("");
            if(typeId){
                const preset=HACCP_EQUIPMENT_TYPES.find(t=>t.id===typeId);
                if(preset&&groups[preset.label])select.value=preset.label;
                else if(groups[typeId])select.value=typeId;
            }
            box.hidden=false;
            const name=document.getElementById("hd-new-equipment-name");
            if(name){name.value="";setTimeout(()=>name.focus({preventScroll:true}),20)}
        }

        function closeDesktopEquipmentCreator(){const box=document.getElementById("hd-equipment-creator");if(box)box.hidden=true}

        async function saveDesktopEquipment(){
            if(!isBoss() || haccp223Staff())return alert("Accès réservé au responsable HACCP.");
            const folder=document.getElementById("hd-new-equipment-type")?.value||"";
            const name=document.getElementById("hd-new-equipment-name")?.value?.trim()||"";
            if(!name)return alert("Indiquez le nom de l’équipement.");
            if(!folder||!Array.isArray(EMPIRE_LISTS?.[currentDept]?.eq?.[folder]))return alert("Choisissez une catégorie existante.");
            if(getSectorEquipmentList().some(x=>haccpNormalizeEquipmentText(x.name)===haccpNormalizeEquipmentText(name)))return alert("Cet équipement existe déjà dans ce secteur.");
            const next=structuredClone(EMPIRE_LISTS);
            next[currentDept].eq[folder].push(name);
            try{
                await API.update("HACCP_LISTS_MASTER",next);
                EMPIRE_LISTS=next;
                localStorage.setItem('EMPIRE_HACCP_LISTS_V2_'+tenantID,JSON.stringify(next));
            }catch(e){alert("Enregistrement impossible : "+(e?.message||e));return}
            populateSelects();
            closeDesktopEquipmentCreator();
            desktopTempSelected=getSectorEquipmentList().find(x=>x.name===name)||null;
            renderDesktopTemperatureHub();renderDesktopSelectedEquipment();
            window.dispatchEvent(new Event('ichef:haccp:categories-changed'));
        }

        async function organizeCurrentSectorEquipment(){
            if(!haccpIsPhoneMode()){haccpV227OpenCategories();return}
            if(!EMPIRE_LISTS?.[currentDept]?.eq)return;
            const all=[];
            Object.entries(EMPIRE_LISTS[currentDept].eq).forEach(([folder,items])=>(Array.isArray(items)?items:[]).forEach(name=>all.push({name,folder})));
            if(!all.length)return alert("Aucun équipement à organiser.");
            if(!confirm(`Organiser automatiquement ${all.length} équipement(s) du secteur ${currentDept} par type HACCP ?\n\nAucun équipement ne sera supprimé.`))return;
            const next={};HACCP_EQUIPMENT_TYPES.forEach(t=>next[t.label]=[]);
            all.forEach(({name,folder})=>{const type=classifyEquipmentType(name,folder);if(!next[type.label].includes(name))next[type.label].push(name)});
            EMPIRE_LISTS[currentDept].eq=next;
            await persistHaccpLists();
            populateSelects();
            desktopTempSelected=null;
            renderDesktopTemperatureHub();renderDesktopSelectedEquipment();
        }

        function renderCoolingCycleState(){
            if(!desktopTempSelected)return;
            const ref=getCoolingReference();
            const rule=document.getElementById("hd-cooling-rule"), target=document.getElementById("hd-cooling-target");
            if(rule)rule.innerHTML=`<strong>${escapeHaccpUi(ref.label)}</strong><span>${escapeHaccpUi(ref.source)}</span>`;
            if(target)target.textContent=ref.profile==="FR"?"≤ 10 °C / 120 min":ref.profile==="CH"?"≤ 5 °C + règle autocontrôle":"À configurer";
            let active=null;try{active=JSON.parse(sessionStorage.getItem(coolingCycleStorageKey(desktopTempSelected.name))||"null")}catch(_){}
            const startTime=document.getElementById("hd-cooling-start-time"), duration=document.getElementById("hd-cooling-duration");
            const startBtn=document.getElementById("hd-cooling-start-btn"), finishBtn=document.getElementById("hd-cooling-finish-btn"), msg=document.getElementById("hd-cooling-message");
            if(!active){
                if(startTime)startTime.textContent="—";if(duration)duration.textContent="—";if(startBtn)startBtn.disabled=false;if(finishBtn)finishBtn.disabled=true;
                if(msg){msg.className="hd-compliance neutral";msg.textContent="Renseignez la préparation et la température de départ."}return;
            }
            if(startTime)startTime.textContent=new Date(active.startedAt).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"});
            const mins=Math.max(0,Math.round((Date.now()-new Date(active.startedAt).getTime())/60000));
            if(duration)duration.textContent=`${mins} min`;
            const product=document.getElementById("hd-cooling-product"), startTemp=document.getElementById("hd-cooling-start-temp");
            if(product)product.value=active.product||"";if(startTemp)startTemp.value=active.startTemp??"";
            if(startBtn)startBtn.disabled=true;if(finishBtn)finishBtn.disabled=false;
            if(msg){msg.className="hd-compliance review";msg.textContent=`Cycle en cours depuis ${mins} min.`}
        }

        function startCoolingCycle(){
            if(!desktopTempSelected)return;
            const product=document.getElementById("hd-cooling-product")?.value?.trim()||"";
            const startTemp=Number(String(document.getElementById("hd-cooling-start-temp")?.value||"").replace(",","."));
            if(!product)return alert("Indiquez la préparation refroidie.");
            if(!Number.isFinite(startTemp))return alert("Indiquez la température de départ.");
            sessionStorage.setItem(coolingCycleStorageKey(desktopTempSelected.name),JSON.stringify({equipment:desktopTempSelected.name,product,startTemp,startedAt:new Date().toISOString(),dept:currentDept}));
            renderCoolingCycleState();
        }

        async function finishCoolingCycle(){
            if(!desktopTempSelected)return;
            let active=null;try{active=JSON.parse(sessionStorage.getItem(coolingCycleStorageKey(desktopTempSelected.name))||"null")}catch(_){}
            if(!active)return alert("Aucun cycle en cours.");
            const endTemp=Number(String(document.getElementById("hd-cooling-end-temp")?.value||"").replace(",","."));
            if(!Number.isFinite(endTemp))return alert("Indiquez la température finale.");
            const finishedAt=new Date(), startedAt=new Date(active.startedAt), durationMin=Math.max(0,Math.round((finishedAt-startedAt)/60000)), ref=getCoolingReference();
            let status="À VÉRIFIER";
            if(ref.profile==="FR")status=(active.startTemp>=ref.startTarget&&endTemp<=ref.endTarget&&durationMin<=ref.maxMinutes)?"OK":"ALERTE";
            else if(ref.profile==="CH")status=endTemp<=ref.endTarget?"À VÉRIFIER":"ALERTE";

            const entry={
                id:Date.now(),timestamp:finishedAt.toISOString(),date:finishedAt.toLocaleDateString("fr-FR"),time:finishedAt.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"}),
                dept:currentDept,audit:"Saisi par "+userAuditLabel(),...regulatoryAuditMeta(),
                eq:desktopTempSelected.name,val:endTemp,status,processType:"COOLING_CYCLE",
                coolingProduct:active.product,coolingStartTemp:active.startTemp,coolingEndTemp:endTemp,coolingStartedAt:active.startedAt,coolingFinishedAt:finishedAt.toISOString(),coolingDurationMin:durationMin,
                coolingRuleLabel:ref.label,coolingRuleSource:ref.source
            };
            db.temp.unshift(entry);
            await API.update("HACCP_TEMP",db.temp);
            sessionStorage.removeItem(coolingCycleStorageKey(desktopTempSelected.name));
            const st=document.getElementById("hd-cooling-status");if(st){st.className=`hd-status ${status==="OK"?"ok":status==="ALERTE"?"alert":"neutral"}`;st.textContent=status}
            const msg=document.getElementById("hd-cooling-message");if(msg){msg.className=`hd-compliance ${status==="OK"?"ok":status==="ALERTE"?"alert":"review"}`;msg.textContent=`${active.startTemp.toLocaleString("fr-FR")} → ${endTemp.toLocaleString("fr-FR")} °C · ${durationMin} min · ${status}`}
            document.getElementById("hd-cooling-end-temp").value="";
            renderLogs();renderDesktopTemperatureHub();renderCoolingCycleState();
        }

        let EMPIRE_LISTS = {
            "CUISINE": {
                eq: {
                    "Chambres froides positives": ["Chambre Froide Positive"],
                    "Chambres froides négatives": ["Chambre Froide Négative"],
                    "Frigos / Tours / Armoires": ["Frigo Sous-Bassement"],
                    "Congélateurs / Surgélateurs": [], "Vitrines / Meubles froids": [],
                    "Cellules de refroidissement": [], "Liaison / Maintien chaud": ["Liaison Chaude"],
                    "Remise en température": [], "Caves / Boissons": [], "Machines à glaçons": [], "Autres équipements": []
                },
                clean: { "Sols & Surfaces": ["Sols et Siphons", "Plans de travail"], "Matériel Lourd": ["Chambres Froides", "Hottes et Filtres"], "Plonge": ["Plonge", "Lave-vaisselle"], "Petit Matériel": ["Trancheuse"] },
                trace: { "Viandes": ["Entrecôte", "Poulet"], "Poissons": ["Saumon"], "Sauces & Fonds": ["Fond de Veau", "Sauce Gribiche", "Sauce Bolognaise"] }
            },
            "PATISSERIE": {
                eq: {
                    "Chambres froides positives": [], "Chambres froides négatives": [],
                    "Frigos / Tours / Armoires": ["Tour Pâtissier", "Frigo Positif 1"],
                    "Congélateurs / Surgélateurs": ["Surgélateur", "Congélateur"], "Vitrines / Meubles froids": [],
                    "Cellules de refroidissement": [], "Liaison / Maintien chaud": [], "Remise en température": [],
                    "Caves / Boissons": [], "Machines à glaçons": [], "Autres équipements": ["Four Pâtissier", "Étuve"]
                },
                clean: { "Sols & Surfaces": ["Sols Labo", "Plans de travail (Marbre)"], "Matériel Lourd": ["Batteur", "Four", "Laminoir"], "Plonge": ["Plonge Batterie"] },
                trace: { "Laitages & Œufs": ["Beurre Tourage", "Œufs", "Crème 35%"], "Fruits & Purées": ["Purée Framboise", "Fraises"], "Chocolats": ["Chocolat Noir 70%", "Praliné"] }
            },
            "BAR": {
                eq: {
                    "Chambres froides positives": [], "Chambres froides négatives": [],
                    "Frigos / Tours / Armoires": ["Arrière Bar 1", "Arrière Bar 2"],
                    "Congélateurs / Surgélateurs": [], "Vitrines / Meubles froids": [], "Cellules de refroidissement": [],
                    "Liaison / Maintien chaud": [], "Remise en température": [], "Caves / Boissons": ["Cave à Vin"],
                    "Machines à glaçons": ["Machine à Glaçons"], "Autres équipements": []
                },
                clean: { "Service": ["Tirage Pression", "Plans de travail Bar"], "Entretien": ["Machine à Glaçons", "Lave-verres", "Sols Bar"] },
                trace: { "Softs & Jus": ["Jus d'orange", "Lait"], "Fûts": ["Fût de bière"], "Fruits": ["Citrons"] }
            },
            "SERVICE": {
                eq: {
                    "Chambres froides positives": [], "Chambres froides négatives": [],
                    "Frigos / Tours / Armoires": ["Frigo Boissons Salle"], "Congélateurs / Surgélateurs": [],
                    "Vitrines / Meubles froids": ["Vitrine Desserts"], "Cellules de refroidissement": [],
                    "Liaison / Maintien chaud": [], "Remise en température": [], "Caves / Boissons": [],
                    "Machines à glaçons": [], "Autres équipements": []
                },
                clean: { "Salles": ["Sols Salle", "Tables et Chaises"], "Accueil": ["TPE / Caisse", "Cartes / Menus"], "Sanitaires": ["Sanitaires Clients"] },
                trace: { "Condiments": ["Moutarde", "Ketchup", "Mayonnaise"] }
            },
            "ADMIN": {
                eq: { "Autres équipements": ["Équipement à contrôler"] },
                clean: { "Général": ["Zone à valider"] },
                trace: { "Général": ["Produit de contrôle"] }
            }
        };

        try {
            const savedLists = localStorage.getItem('EMPIRE_HACCP_LISTS_V2_' + tenantID);
            if (savedLists) EMPIRE_LISTS = JSON.parse(savedLists);
        } catch(e){}


        async function persistHaccpLists() {
            try { localStorage.setItem('EMPIRE_HACCP_LISTS_V2_' + tenantID, JSON.stringify(EMPIRE_LISTS)); } catch (_) {}
            try {
                await API.update('HACCP_LISTS_MASTER', EMPIRE_LISTS);
                setSyncStatus('online', 'SYSTÈME · CATALOGUE HACCP SYNCHRONISÉ');
            } catch (e) {
                console.warn('[iCHEF HACCP] Catalogue HACCP non synchronisé :', e);
                setSyncStatus('degraded', 'SYSTÈME · CATALOGUE À RESYNCHRONISER');
            }
        }

        function getBase64Image(file) {
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const img = new Image();
                    img.onload = function() {
                        const canvas = document.createElement('canvas');
                        const MAX_WIDTH = 800; 
                        let width = img.width; let height = img.height;
                        if (width > MAX_WIDTH) { height = height * (MAX_WIDTH / width); width = MAX_WIDTH; }
                        canvas.width = width; canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, width, height);
                        resolve(canvas.toDataURL('image/jpeg', 0.6)); 
                    }
                    img.src = e.target.result;
                };
                reader.readAsDataURL(file);
            });
        }

        // --- GESTION DU BOUTON RETOUR INTELLIGENT ---
        
        function retourAdmin() { ichefHaccpGoToDesk(); }

function haccpSectorReturnConfig() {
            return { label: '← RETOUR BUREAU', page: ichefHaccpDeskPage() };
        }

        function updateHaccpSectorReturnButton() {
            const btn = document.getElementById("haccp-sector-return-btn");
            if (!btn) return;
            const config = haccpSectorReturnConfig();
            btn.textContent = config.label;
            btn.dataset.destination = config.page;
        }

        function retourSecteurAttribue() { ichefHaccpGoToDesk(); }

        function retourAccueilApp() {
            retourSecteurAttribue();
        }


        // ============================================================
        // HACCP — ACCÈS DIRECT AU SECTEUR ATTRIBUÉ
        // Aucun choix libre de secteur : téléphone et ordinateur utilisent la session signée.
        // ============================================================
        function haccpIsPhoneMode() {
            const narrow = window.matchMedia("(max-width:1100px)").matches;
            const coarse = window.matchMedia("(pointer:coarse)").matches;
            const touch = Number(navigator.maxTouchPoints || 0) > 0;
            const mobileUA = /Android|iPhone|iPod|Mobile|IEMobile|Opera Mini/i.test(navigator.userAgent || "");
            const compactScreen = Math.min(
                Number(screen?.width || 9999),
                Number(screen?.height || 9999)
            ) <= 900;

            return narrow || mobileUA || (coarse && touch && compactScreen);
        }

        function haccpEntrySectorHint() {
            const params = new URLSearchParams(window.location.search);
            const fromPage = String(params.get("from") || "").toLowerCase();
            const sector = String(params.get("sectorKey") || params.get("sector") || "").toLowerCase();
            const ref = String(document.referrer || "").toLowerCase();

            if (sector === "cuisine" || fromPage === "cuisine" || fromPage === "chef" || ref.includes("chef.html")) return "CUISINE";
            if (sector === "patisserie" || sector === "pâtisserie" || fromPage === "patisserie" || ref.includes("chef-patissier.html")) return "PATISSERIE";
            if (sector === "bar" || fromPage === "bar" || ref.includes("chef-bar.html")) return "BAR";
            if (
                sector === "service" ||
                sector === "caisse" ||
                fromPage === "caisse" ||
                fromPage === "service" ||
                ref.includes("pack-eco.html") ||
                ref.includes("caissetactile.html")
            ) return "SERVICE";

            return "";
        }

        function openHaccpStaffPortal() {
            const q = tenantID ? "?tenantID=" + encodeURIComponent(tenantID) : "";
            window.location.href = "portail-staff.html" + q;
        }

        function showHaccpMobileSecureGate(departmentHint = "", options = {}) {
            const gate = document.getElementById("haccp-mobile-secure-gate");
            if (!gate) return;

            gate.hidden = false;
            const sector = String(departmentHint || "").trim();
            const strong = document.getElementById("haccp-identity-gate-title") || gate.querySelector("strong");
            const paragraph = document.getElementById("haccp-identity-gate-text") || gate.querySelector("p");
            const loginButton = document.getElementById("haccp-identity-login-btn");

            const checking = options?.checking === true;
            if (strong) {
                strong.textContent = checking
                    ? "Identification iCHEF…"
                    : (sector ? `Connexion iCHEF requise · ${sector}` : "Connexion iCHEF requise");
            }
            if (paragraph) {
                paragraph.textContent = checking
                    ? "Vérification de votre session sécurisée, de votre rôle et de votre secteur."
                    : "HACCP ne demande ni choix de service ni deuxième code. Connectez-vous à iCHEF avec votre propre identifiant puis revenez ici : votre espace sera reconnu automatiquement.";
            }
            if (loginButton) loginButton.hidden = checking;
        }

        function hideHaccpMobileSecureGate() {
            const gate = document.getElementById("haccp-mobile-secure-gate");
            if (gate) gate.hidden = true;
        }

        function openMobileAssignedHaccpWork() {
            if (!haccpIsPhoneMode() || !window.ICHEF_HACCP?.authenticated) return;

            hideHaccpMobileSecureGate();

            // Sur téléphone, le collaborateur arrive directement sur ses zones
            // de nettoyage à traiter. Températures et Traçabilité restent
            // accessibles via le sélecteur Express en haut de l'écran.
            document.querySelectorAll(".module").forEach(m => m.classList.remove("active"));
            document.getElementById("mod-cleaning")?.classList.add("active");

            if (typeof hcleanEnterExpress === "function") {
                hcleanEnterExpress(true);
            } else {
                document.body.classList.add("haccp-cleaning-express-mobile");
            }
        }

        async function bootHaccpMobileDirectAccess() {
            if (!haccpIsPhoneMode()) return false;

            // Téléphone = zéro PIN HACCP.
            // L'identité et le secteur viennent uniquement de la session signée
            // créée lors de la connexion du Chef / collaborateur à iCHEF.
            const resumed = await tryResumeHaccpStaffSession();
            if (resumed) {
                openMobileAssignedHaccpWork();
                return true;
            }

            // Un simple paramètre URL ne suffit jamais à identifier une personne.
            // Sans session valide, on demande de reprendre sa connexion iCHEF.
            showHaccpMobileSecureGate(haccpEntrySectorHint());
            setSyncStatus("degraded", "SYSTÈME · CONNEXION REQUISE");
            return true;
        }

        // HACCP V6.0 : aucun choix manuel de secteur et aucun second PIN.
        // Ces fonctions restent comme garde-fous de compatibilité pour d'anciens liens,
        // mais elles ne peuvent plus modifier le secteur de l'utilisateur.
        function showPinPad() {
            showHaccpMobileSecureGate(haccpEntrySectorHint());
            setSyncStatus("degraded", "SYSTÈME · CONNEXION iCHEF REQUISE");
        }
        function addPin() {}
        function clearPin() { pin = ""; }


        // ============================================================
        // iCHEF HACCP — SESSION UNIQUE PORTAIL STAFF
        // Le PIN n'est jamais relu ni stocké.
        // Un jeton signé par le serveur est revalidé via /api/ops/context.
        // ============================================================
        function normalizeHaccpDepartment(value = "") {
            const raw = String(value || "")
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .trim()
                .toUpperCase()
                .replace(/[\s_-]+/g, " ");

            if (/(CUISINE|KITCHEN|CHEF CUISINE|CUISINIER|COMMIS)/.test(raw)) return "CUISINE";
            if (/(PATISSERIE|PATISSIER|PASTRY)/.test(raw)) return "PATISSERIE";
            if (/(BAR|BARMAN|BARMAID)/.test(raw)) return "BAR";
            if (/(SERVICE|SALLE|SERVEUR|SERVEUSE|RESTAURANT|WAITER)/.test(raw)) return "SERVICE";
            return "";
        }

        function haccpStaffSessionHeaders(token) {
            return {
                "Accept": "application/json",
                "Authorization": "Bearer " + token,
                "X-iCHEF-Tenant": tenantID,
                "X-iCHEF-Device": deviceId
            };
        }

        function clearExpiredHaccpStaffSession() {
            sessionStorage.removeItem("ichef_haccp_authenticated");
            sessionStorage.removeItem("ichef_haccp_role");
            // Le token Staff n'est supprimé que lorsqu'il est effectivement refusé
            // par le serveur, jamais simplement parce que HACCP n'arrive pas à charger.
        }

        async function activateHaccpFromValidatedStaffContext(context, authSource = "SESSION_SIGNEE") {
            const self = context?.self || {};
            const roleText = String(self.role || "").trim();

            // Le secteur vient de l'identité signée par le serveur, jamais d'un choix HACCP.
            const departmentCandidates = [
                self.deptKey,
                self.departmentKey,
                self.primaryDepartment,
                self.assignedDepartment,
                self.dept,
                self.department,
                self.service,
                self.sectorKey,
                self.sector,
                context?.deptKey,
                context?.departmentKey,
                context?.department,
                context?.service,
                context?.sectorKey,
                context?.sector
            ];
            let dept = "";
            for (const candidate of departmentCandidates) {
                dept = normalizeHaccpDepartment(candidate);
                if (dept) break;
            }

            // En dernier recours seulement, un rôle explicitement sectorisé
            // (CHEF_BAR, RESPONSABLE_CUISINE, etc.) permet de retrouver le secteur.
            if (!dept) dept = normalizeHaccpDepartment(roleText);

            // Chef Desktop : le Chef, la Direction ou le Master qui arrive depuis
            // chef.html travaille dans le domaine CUISINE, même si son profil global
            // est enregistré comme DIRECTION / MASTER. La session a déjà été validée
            // côté serveur par /api/chef/context : aucun PIN HACCP supplémentaire.
            const chefDesktopValidated =
                authSource === "SESSION_CHEF_SIGNEE" ||
                String(context?.accessChannel || "").toUpperCase() === "CHEF_DESKTOP" ||
                context?.fullDomainAccess === true;

            if (!dept && context?.fullDomainAccess === true) {
                // L'URL ne donne pas de droit : le serveur a déjà certifié MASTER.
                dept = haccpEntrySectorHint() || "ADMIN";
            }
            if (!dept && chefDesktopValidated) {
                dept = haccpEntrySectorHint() || "CUISINE";
            }

            // Compatibilité avec le serveur déjà en production : un Master / Direction
            // peut être validé par /api/ops/context avec dept=DIRECTION, avant que
            // /api/chef/context ne soit disponible. Si cette session signée arrive
            // réellement depuis l'entrée Chef, on l'affecte au domaine CUISINE.
            const chefEntryHint = haccpEntrySectorHint() === "CUISINE";
            const privilegedChefRole = /(^|\b)(MASTER|SUPER_ADMIN|SUPERADMIN|ADMIN|DIRECTION|DIRECTEUR|GERANT|GÉRANT|OWNER|PROPRIETAIRE|PROPRIÉTAIRE|MANAGER|CHEF)(\b|$)/i.test(roleText);
            if (!dept && chefEntryHint && privilegedChefRole) {
                dept = "CUISINE";
            }

            // Chef non sectorisé : dans iCHEF, le domaine Chef correspond à la Cuisine.
            if (!dept && /(^|\b)(CHEF|CHEF EXECUTIF|CHEF EXECUTIVE|EXECUTIVE CHEF|HEAD CHEF)(\b|$)/i.test(roleText)) {
                dept = "CUISINE";
            }

            // Direction / management global : aucun choix manuel non plus.
            // Leur identité ouvre automatiquement l'espace HACCP de supervision.
            const globalSupervisorRole = /(^|\b)(MASTER|SUPER_ADMIN|SUPERADMIN|ADMIN|DIRECTION|DIRECTEUR|DIRECTRICE|GERANT|GÉRANT|OWNER|PROPRIETAIRE|PROPRIÉTAIRE|PATRON|MANAGER|RESPONSABLE|SUPERVISEUR|SUPERVISOR)(\b|$)/i.test(roleText);
            if (!dept && globalSupervisorRole) {
                dept = "ADMIN";
            }

            // Pour les collaborateurs ordinaires, le secteur doit toujours venir
            // de leur session signée. On ne fait jamais confiance à l'URL seule.
            if(window.ICHEF_HACCP?.v223Staff){
                const allowed=window.ICHEF_HACCP.allowedSectors||[];
                if(!allowed.includes(dept))dept=allowed[0]||'';
            }
            if (!dept) return false;

            currentDept = dept;
            currentUser = {
                name: String(self.name || "Collaborateur").trim(),
                role: roleText || "STAFF",
                permissions: Array.isArray(context?.permissions) ? context.permissions : []
            };

            window.ICHEF_HACCP.authenticated = true;
            window.ICHEF_HACCP.role = currentUser.role;
            window.ICHEF_HACCP.userName = currentUser.name;
            window.ICHEF_HACCP.authSource = authSource;
            window.ICHEF_HACCP.staffId = String(self.id || "");
            window.ICHEF_HACCP.department = currentDept;

            sessionStorage.setItem("ichef_haccp_authenticated", "1");
            sessionStorage.setItem("ichef_haccp_role", currentUser.role);
            sessionStorage.setItem("ichef_haccp_department", currentDept);
            sessionStorage.setItem("ichef_haccp_auth_source", authSource);

            document.querySelectorAll(".display-dept").forEach(el => el.innerText = currentDept);
            updateHaccpSectorReturnButton();

            const login = document.getElementById("login-screen");
            if (login) login.style.display = "none";

            populateSelects();

            const traceOpen = document.getElementById("trace-open");
            if (traceOpen) traceOpen.valueAsDate = new Date();

            // FAST START : les données locales déjà validées s'affichent immédiatement.
            // La session a été contrôlée par le serveur juste avant ; le réseau ne bloque
            // donc plus l'ouverture de l'interface HACCP.
            loadHaccpCacheInstant();

            connectHaccpRealtime();
            startHaccpSharedPolling();

            if (haccpIsPhoneMode()) {
                requestAnimationFrame(openMobileAssignedHaccpWork);
            }

            setSyncStatus(
                "online",
                `SYSTÈME · ${currentUser.name.toUpperCase()} · ${currentDept}`
            );

            // Les catégories responsables sont préchargées dès que le serveur
            // a authentifié l'identité. La fiche s'ouvre ensuite sans attendre
            // une NOUVELLE requête lors du clic sur « Catégories ».
            if (!haccpIsPhoneMode()) {
                setTimeout(() => {
                    try { window.ichefHaccpPrefetchCategories?.(); } catch (_) {}
                }, 80);
            }

            // Synchronisation fraîche en arrière-plan, sans bloquer l'utilisateur.
            loadData({ force:true }).then(() => {
                try { window.refreshHaccpDeliveryBridge?.(); } catch (_) {}
            }).catch(() => {});
            flushPendingInventoryAudits().catch(() => {});
            flushPendingHaccpMovements().catch(() => {});
            if (typeof window.requestIdleCallback === 'function') {
                window.requestIdleCallback(() => generateArchiveFolders(), { timeout: 800 });
            } else {
                setTimeout(generateArchiveFolders, 250);
            }

            return true;
        }

        // HACCP V251 — IDENTIFICATION RAPIDE, VALIDÉE PAR LE SERVEUR
        // Un endpoint lent ne doit jamais bloquer la réponse d'un autre endpoint.
        // L'identité, le secteur et les droits proviennent exclusivement du serveur.
        async function ichefTryResumeHaccpStaffSessionCore() {
            const tokens = haccpSessionTokens();
            if (!tokens.length || !tenantID) {
                window.ICHEF_HACCP_SSO_FAILURE = !tenantID ? 'TENANT' : 'NO_TOKEN';
                return false;
            }
            window.ICHEF_HACCP_SSO_FAILURE = null;

            const endpoints = [
                { path: '/api/chef/context', source: 'SESSION_CHEF_SIGNEE', rank: 0 },
                { path: '/api/ops/context', source: 'SESSION_SERVICE_SIGNEE', rank: 1 }
            ];
            const MAX_WAIT_MS = 7500; // Évite une attente de 35 s x 2 (= 70 s).
            const startedAt = Date.now();
            const controllers = [];
            const statuses = [];
            let hadNetworkError = false;
            let hadProfileError = false;
            let timedOut = false;
            let deadlineTimer = null;
            setSyncStatus('degraded', 'SYSTÈME · VÉRIFICATION DE LA SESSION…');

            // Chaque essai inclut le contrôle du secteur Staff si nécessaire.
            // Une réponse sans autorisation valable ne peut jamais gagner la course.
            const check = (token, tokenIndex, endpoint) => (async () => {
                const controller = new AbortController();
                controllers.push(controller);
                const headers = haccpStaffSessionHeaders(token);
                try {
                    const response = await fetch(`${SERVER_URL}${endpoint.path}`, {
                        method: 'GET', cache: 'no-store', credentials: 'omit',
                        headers, signal: controller.signal
                    });
                    statuses.push(response.status);
                    if (!response.ok) throw new Error('CONTEXT_REFUSED');
                    const data = await response.json().catch(() => ({}));
                    if (data?.success !== true || !data?.self) {
                        hadProfileError = true;
                        throw new Error('CONTEXT_INVALID');
                    }

                    const isStaffContext =
                        (endpoint.source === 'SESSION_SERVICE_SIGNEE' ||
                         new URLSearchParams(location.search).get('from') === 'staff') &&
                        !String(data.self.id || '').startsWith('MASTER:');
                    let grant = null;
                    if (isStaffContext) {
                        const grantResponse = await fetch(haccp223ScopedUrl('context'), {
                            method: 'GET', cache: 'no-store', credentials: 'omit',
                            headers, signal: controller.signal
                        });
                        statuses.push(grantResponse.status);
                        if (!grantResponse.ok) throw new Error('STAFF_PERMISSION_REFUSED');
                        grant = await grantResponse.json().catch(() => ({}));
                        if (grant.success !== true ||
                            !Array.isArray(grant.allowedSectors) || !grant.allowedSectors.length) {
                            hadProfileError = true;
                            throw new Error('NO_ASSIGNED_SECTOR');
                        }
                    }
                    return { token, tokenIndex, endpoint, data, grant, isStaffContext };
                } catch (error) {
                    if (error?.name !== 'AbortError' && !statuses.length) hadNetworkError = true;
                    throw error;
                }
            })();

            // Promise.any renvoie le PREMIER contexte authentifié et autorisé.
            // À l'inverse de Promise.all, aucun autre appel lent n'est attendu.
            const attempts = [];
            tokens.forEach((token, index) => endpoints.forEach(endpoint => {
                attempts.push(check(token, index, endpoint));
            }));
            const winnerPromise = Promise.any(attempts).catch(() => null);
            const deadlinePromise = new Promise(resolve => {
                deadlineTimer = setTimeout(() => {
                    timedOut = true;
                    resolve(null);
                }, MAX_WAIT_MS);
            });
            let winner = null;
            try {
                winner = await Promise.race([winnerPromise, deadlinePromise]);
            } finally {
                clearTimeout(deadlineTimer);
                controllers.forEach(controller => {
                    try { controller.abort(); } catch (_) {}
                });
            }

            if (winner) {
                // Le grant Staff a été vérifié avant l'affichage de l'interface.
                if (winner.isStaffContext) {
                    window.ICHEF_HACCP.v223Staff = true;
                    window.ICHEF_HACCP.allowedSectors = [...winner.grant.allowedSectors];
                    window.ICHEF_HACCP.staffId = String(
                        winner.grant.self?.id || winner.data.self.id || ''
                    );
                    haccpStateMemory = null;
                    haccpStateMemoryAt = 0;
                }
                window.ICHEF_HACCP.accessToken = winner.token;
                const success = await activateHaccpFromValidatedStaffContext(
                    winner.data, winner.endpoint.source
                );
                if (success === true) {
                    sessionStorage.setItem('ichef_access_token', winner.token);
                    window.ICHEF_HACCP_SSO_FAILURE = null;
                    console.info('[iCHEF HACCP] Session validée en', Date.now() - startedAt, 'ms');
                    return true;
                }
                window.ICHEF_HACCP.accessToken = '';
                window.ICHEF_HACCP_SSO_FAILURE = 'PROFILE';
                return false;
            }

            // Pas d'accès hors-ligne ni sur jeton périmé : échec explicite rapide.
            window.ICHEF_HACCP_SSO_FAILURE =
                statuses.includes(403) ? 'FORBIDDEN' :
                statuses.includes(401) ? 'EXPIRED' :
                statuses.includes(404) ? 'ROUTE_MISSING' :
                statuses.some(s => [502, 503, 504].includes(s)) ? 'BACKEND_BUSY' :
                hadProfileError ? 'PROFILE' :
                timedOut || hadNetworkError ? 'NETWORK' : 'UNKNOWN';
            if (statuses.length && statuses.every(s => s === 401 || s === 403)) {
                clearExpiredHaccpStaffSession();
            }
            setSyncStatus('degraded', 'SYSTÈME · CONNEXION À VÉRIFIER');
            return false;
        }

        // HACCP V249 : un seul appel d'authentification partagé par tous les
        // démarrages (ordinateur, téléphone, pageshow, reprise de session).
        // Le résultat reste UNIQUEMENT celui du serveur : aucun accès local ajouté.
        let ichefHaccpResumeInFlight = null;
        async function tryResumeHaccpStaffSession() {
            if (window.ICHEF_HACCP?.authenticated) return true;
            if (ichefHaccpResumeInFlight) return ichefHaccpResumeInFlight;
            const pending = ichefTryResumeHaccpStaffSessionCore();
            ichefHaccpResumeInFlight = pending;
            try {
                return await pending;
            } finally {
                if (ichefHaccpResumeInFlight === pending) ichefHaccpResumeInFlight = null;
            }
        }

        function scheduleHaccpStaffSessionResume() {
            const run = async () => {
                const login = document.getElementById("login-screen");
                if (!login || login.style.display === "none") return;

                // Le bootstrap mobile possède sa propre logique :
                // session Staff -> secteur attribué -> zones à traiter.
                if (haccpIsPhoneMode() && window.__HACCP_MOBILE_DIRECT_BOOT__) return;

                const resumed = await tryResumeHaccpStaffSession();
                if (!resumed) {
                    showHaccpMobileSecureGate(haccpEntrySectorHint());
                    setSyncStatus("degraded", "SYSTÈME · CONNEXION iCHEF REQUISE");
                    // La version précédente restait sur « Identification iCHEF… ».
                    // Ici l'utilisateur voit un message et peut revenir à son module.
                    ichef226DesktopGate();
                }
            };

            setTimeout(run, 30);
        }

        // Diagnostic partageable sans divulguer PIN, session, appareil ni ID client.
        window.ichefHaccpConnectionDiagnostic = function () {
            return {
                build: 'HACCP-V251-SSO-RACE',
                authenticated: window.ICHEF_HACCP?.authenticated === true,
                failure: window.ICHEF_HACCP_SSO_FAILURE || null,
                hasSessionToken: haccpSessionTokens().length > 0,
                online: navigator.onLine,
                at: new Date().toISOString()
            };
        };

        function ichef226DesktopGate(){
            if(haccpIsPhoneMode() || window.ICHEF_HACCP?.authenticated) return;
            const gate=document.getElementById('haccp-mobile-secure-gate');
            const btn=document.getElementById('haccp-identity-login-btn');
            const title=document.getElementById('haccp-identity-gate-title');
            const desc=document.getElementById('haccp-identity-gate-text');
            const failure=window.ICHEF_HACCP_SSO_FAILURE || 'UNKNOWN';
            const diagnostics={
              TENANT:'Établissement non identifié. Revenez à votre module habituel.',
              NO_TOKEN:'Aucune session signée iCHEF dans cet onglet. Retournez dans Chef, connectez-vous avec votre accès habituel, puis ouvrez HACCP dans LE MÊME ONGLET.',
              EXPIRED:'La session iCHEF a été refusée ou a expiré (401). Reconnectez-vous dans votre module, puis ouvrez HACCP.',
              FORBIDDEN:'La session existe mais le serveur refuse cet accès (403). Vérifiez le rôle Chef / Responsable et les autorisations HACCP.',
              ROUTE_MISSING:'La route d’authentification iCHEF est absente du serveur (404). Il faut vérifier la version server.js déployée.',
              BACKEND_BUSY:'Le serveur iCHEF ne répond pas correctement (502/503/504). Patientez, puis réessayez.',
              NETWORK:'Impossible de contacter le serveur ou délai dépassé. Patientez quelques instants puis réessayez.',
              PROFILE:'Le serveur a reconnu une session, mais aucun secteur HACCP autorisé n’a été trouvé. Vérifiez les affectations du collaborateur.',
              UNKNOWN:'Le serveur n’a pas pu confirmer cette session. Reconnectez-vous depuis Chef, sans utiliser de second PIN dans HACCP.'
            };
            if(title)title.textContent='Connexion HACCP à vérifier';
            if(desc)desc.textContent=diagnostics[failure] || diagnostics.UNKNOWN;
            if(btn){
              btn.hidden=false;
              btn.textContent='← RETOUR BUREAU';
              btn.onclick=ichefHaccpGoToDesk;
            }
            // Un bouton de nouvelle tentative est utile quand le serveur vient de se réveiller.
            // Il ne court-circuite jamais la validation des sessions côté serveur.
            let retry=document.getElementById('ichef-v243-sso-retry');
            if(!retry && gate){
              retry=document.createElement('button');
              retry.id='ichef-v243-sso-retry';
              retry.type='button';
              retry.textContent='↻ RÉESSAYER LA CONNEXION';
              retry.style.cssText='display:block;width:100%;margin:10px 0 0;padding:14px 12px;background:#122238;border:1px solid #516f90;border-radius:10px;color:#fff;font-size:.75rem;font-weight:800;cursor:pointer';
              (btn?.parentElement || gate).appendChild(retry);
              retry.onclick=async()=>{
                retry.disabled=true;
                retry.textContent='VÉRIFICATION DU SERVEUR…';
                try{
                  const resumed=await tryResumeHaccpStaffSession();
                  if(!resumed){showHaccpMobileSecureGate(haccpEntrySectorHint());ichef226DesktopGate();}
                }finally{retry.disabled=false;retry.textContent='↻ RÉESSAYER LA CONNEXION';}
              };
            }
            if(retry) retry.style.display=['NO_TOKEN','NETWORK','BACKEND_BUSY','UNKNOWN'].includes(failure)?'block':'none';
        }

        async function submitPin() {
            // V6.0 : HACCP n'authentifie plus une seconde fois l'utilisateur.
            // L'accès dépend exclusivement de la session iCHEF déjà signée.
            clearPin();
            showHaccpMobileSecureGate(haccpEntrySectorHint());
            setSyncStatus("degraded", "SYSTÈME · CONNEXION iCHEF REQUISE");
            return false;
        }

        function populateSelects() {
            ['eq', 'clean', 'trace'].forEach(cat => {
                let dataListId = cat === 'eq' ? 'list-temp-eq' : (cat === 'clean' ? 'list-clean-zone' : 'list-trace-name');
                let allItems = [];
                if (EMPIRE_LISTS[currentDept] && EMPIRE_LISTS[currentDept][cat]) {
                    for (let folder in EMPIRE_LISTS[currentDept][cat]) { allItems.push(...EMPIRE_LISTS[currentDept][cat][folder]); }
                }
                document.getElementById(dataListId).innerHTML = allItems.map(t => cat==='eq' ? `<option value="${escapeHaccpUi(t)}" label="${escapeHaccpUi(haccpEquipmentDisplay(t))}"></option>` : `<option value="${escapeHaccpUi(t)}"></option>`).join('');
            });
        }

        function openCatalog(category) {
            currentCatalogCategory = category;
            let data = EMPIRE_LISTS[currentDept][category];
            let html = "";
            let isBossUser = isBoss();

            document.getElementById('catalog-admin-tools').style.display = isBossUser ? 'block' : 'none';

            let folderIndex = 0;
            for (let folder in data) {
                let safeId = `folder-${folderIndex}`;
                html += `<div class="catalog-folder-title" onclick="toggleFolder('${safeId}')"><span>📁 ${folder}</span><span id="icon-${safeId}" class="folder-icon">▼</span></div>`;
                html += `<div class="catalog-grid" id="${safeId}">`;
                
                if (isBossUser) {
                    html += `<div class="folder-admin-actions">
                                <button class="btn-folder-edit" onclick="event.stopPropagation(); renameFolder('${category}', '${folder.replace(/'/g, "\\'")}')">✏️ RENOMMER</button>
                                <button class="btn-folder-del" onclick="event.stopPropagation(); deleteFolder('${category}', '${folder.replace(/'/g, "\\'")}')">✖ SUPPRIMER</button>
                             </div>`;
                }

                data[folder].forEach(item => {
                    html += `<div class="catalog-item" data-name="${item.toLowerCase()}"><span onclick="selectFromCatalog('${item.replace(/'/g, "\\'")}')" style="flex:1;">${category==='eq'?escapeHaccpUi(haccpEquipmentDisplay(item)):item}</span><div class="catalog-action print" title="Imprimer Étiquettes (5x3cm)" onclick="event.stopPropagation(); printDossier('${category}', '${item.replace(/'/g, "\\'")}')">🖨️</div>${isBossUser ? `<div class="catalog-action del" onclick="event.stopPropagation(); deleteFromCatalog('${category}', '${folder.replace(/'/g, "\\'")}', '${item.replace(/'/g, "\\'")}')">✖</div>` : ''}</div>`;
                });
                html += `</div>`;
                folderIndex++;
            }
            document.getElementById('catalog-content').innerHTML = html;
            document.getElementById('catalog-search').value = ""; 
            document.getElementById('catalog-modal').classList.add('open');
            document.getElementById('catalog-search').focus();
        }

        function renameFolder(category, oldFolderName) {
            if(category==="eq" && !haccpIsPhoneMode()) { haccpV227OpenCategories(); return; }
            let newFolderName = prompt(`Nouveau nom pour le dossier "${oldFolderName}" :`, oldFolderName);
            if (!newFolderName || newFolderName.trim() === "" || newFolderName === oldFolderName) return;
            
            newFolderName = newFolderName.trim();
            if (EMPIRE_LISTS[currentDept][category][newFolderName]) {
                alert("⚠️ Ce nom de dossier existe déjà.");
                return;
            }

            EMPIRE_LISTS[currentDept][category][newFolderName] = EMPIRE_LISTS[currentDept][category][oldFolderName];
            delete EMPIRE_LISTS[currentDept][category][oldFolderName];
            
            persistHaccpLists();
            populateSelects(); 
            openCatalog(category); 
        }

        function deleteFolder(category, folderName) {
            if(category==="eq" && !haccpIsPhoneMode()) { haccpV227OpenCategories(); return; }
            if(confirm(`⚠️ DANGER ! Vous allez supprimer le dossier "${folderName}" et TOUS LES ÉLÉMENTS qu'il contient.\n\nÊtes-vous absolument sûr ?`)) {
                delete EMPIRE_LISTS[currentDept][category][folderName];
                persistHaccpLists();
                populateSelects(); 
                openCatalog(category);
            }
        }

        function toggleFolder(id) {
            const grid = document.getElementById(id); const icon = document.getElementById('icon-' + id);
            if(grid.style.display === 'flex') { grid.style.display = 'none'; icon.innerText = '▼'; } else { grid.style.display = 'flex'; icon.innerText = '▲'; }
        }

        function closeCatalog() { document.getElementById('catalog-modal').classList.remove('open'); }

        function selectFromCatalog(item) {
            let inputId = currentCatalogCategory === 'eq' ? 'temp-eq' : (currentCatalogCategory === 'clean' ? 'clean-zone' : 'trace-name');
            document.getElementById(inputId).value = item; closeCatalog();
        }

        function filterCatalog() {
            let search = document.getElementById('catalog-search').value.toLowerCase();
            document.querySelectorAll('.catalog-item').forEach(el => { el.style.display = el.getAttribute('data-name').includes(search) ? 'flex' : 'none'; });
            document.querySelectorAll('.catalog-grid').forEach(grid => {
                let visibleItems = Array.from(grid.querySelectorAll('.catalog-item')).filter(child => child.style.display !== 'none');
                let title = grid.previousElementSibling; let icon = title.querySelector('.folder-icon');
                if (search.trim() !== "") { grid.style.display = visibleItems.length > 0 ? 'flex' : 'none'; title.style.display = visibleItems.length > 0 ? 'flex' : 'none'; if (icon) icon.innerText = '▲'; } 
                else { grid.style.display = 'none'; title.style.display = 'flex'; if (icon) icon.innerText = '▼'; }
            });
        }

        function promptNewItem() {
            if (currentCatalogCategory === "eq" && window.matchMedia("(min-width:821px)").matches) {
                closeCatalog();
                openDesktopEquipmentCreator();
                return;
            }
            let folder = prompt("Étape 1/2 : Nom du DOSSIER (Ex: Sauces, Viandes, Sols...)\n⚠️ S'il existe déjà, tapez son nom exact.");
            if(!folder || folder.trim() === "") return;
            let item = prompt(`Étape 2/2 : Nom de l'ÉLÉMENT à rajouter dans [${folder.toUpperCase()}] :`);
            if(!item || item.trim() === "") return;
            folder = folder.trim(); item = item.trim();

            if (!EMPIRE_LISTS[currentDept][currentCatalogCategory][folder]) EMPIRE_LISTS[currentDept][currentCatalogCategory][folder] = [];
            if (!EMPIRE_LISTS[currentDept][currentCatalogCategory][folder].includes(item)) {
                EMPIRE_LISTS[currentDept][currentCatalogCategory][folder].push(item);
                persistHaccpLists();
                populateSelects(); openCatalog(currentCatalogCategory); 
            } else { alert("⚠️ Cet élément existe déjà."); }
        }

        function deleteFromCatalog(category, folder, item) {
            if(confirm(`Supprimer définitivement "${item}" du dossier "${folder}" ?`)) {
                let idx = EMPIRE_LISTS[currentDept][category][folder].indexOf(item);
                if (idx > -1) {
                    EMPIRE_LISTS[currentDept][category][folder].splice(idx, 1);
                    persistHaccpLists();
                    populateSelects(); openCatalog(category); 
                }
            }
        }

        function toggleCleanObs() {
            const status = document.getElementById('clean-status').value;
            document.getElementById('clean-obs-group').style.display = (status === 'NON CONFORME') ? 'flex' : 'none';
        }

        function showModule(id) {
            document.querySelectorAll('.module').forEach(m => m.classList.remove('active'));
            const target = document.getElementById('mod-' + id);
            if (target) target.classList.add('active');

            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            try {
                if (typeof event !== 'undefined' && event?.target?.classList) {
                    event.target.classList.add('active');
                }
            } catch (_) {}

            // Sur téléphone, Températures et Nettoyage disposent chacun
            // d'une interface Express plein écran.
            if (haccpIsPhoneMode() && window.ICHEF_HACCP?.authenticated) {
                if (id === 'temp' && typeof hxEnterExpress === 'function') {
                    document.body.classList.remove('haccp-cleaning-express-mobile');
                    hxEnterExpress(true);
                } else if (id === 'cleaning' && typeof hcleanEnterExpress === 'function') {
                    document.body.classList.remove('haccp-express-mobile', 'haccp-trace-express-mobile');
                    hcleanEnterExpress(true);
                } else if (id === 'trace' && typeof htraceEnterExpress === 'function') {
                    document.body.classList.remove('haccp-express-mobile', 'haccp-cleaning-express-mobile');
                    htraceEnterExpress(true);
                } else {
                    document.body.classList.remove('haccp-express-mobile', 'haccp-cleaning-express-mobile', 'haccp-trace-express-mobile');
                }
            }
        }

        const ICHEF_TEMP_PHOTO_RETENTION_DAYS = 30;
        const ICHEF_TEMP_PHOTO_QUICK_DAYS = 7;
        let ichefTempPhotoRetentionTimer = null;
        let ichefTempPhotoRetentionSyncing = false;

        function estimateDataUrlBytes(dataUrl) {
            const text = String(dataUrl || "");
            const comma = text.indexOf(",");
            const base64 = comma >= 0 ? text.slice(comma + 1) : text;
            return Math.max(0, Math.floor(base64.length * 0.75));
        }

        function tempPhotoDate(entry) {
            const raw =
                entry?.tempPhotoCapturedAt ||
                entry?.timestamp ||
                "";
            const time = Date.parse(raw);
            return Number.isFinite(time) ? time : 0;
        }

        function applyTemperaturePhotoRetention(entries) {
            if (!Array.isArray(entries)) return { changed:false, purged:0 };
            const now = Date.now();
            const fullMs = ICHEF_TEMP_PHOTO_RETENTION_DAYS * 86400000;
            const quickMs = ICHEF_TEMP_PHOTO_QUICK_DAYS * 86400000;
            let changed = false;
            let purged = 0;

            for (const item of entries) {
                if (!item || typeof item !== "object") continue;
                const capturedAt = tempPhotoDate(item);
                const hasPhotoData = !!String(item.tempPhotoData || "");
                const hadPhoto = hasPhotoData || item.tempPhoto === true || item.tempPhotoEver === true;

                if (!hadPhoto) continue;

                if (item.tempPhotoEver !== true) {
                    item.tempPhotoEver = true;
                    changed = true;
                }

                if (!item.tempPhotoRetentionPolicy) {
                    item.tempPhotoRetentionPolicy = "FULL_30D_LOCAL_CACHE_0D";
                    changed = true;
                }

                if (capturedAt) {
                    const quickUntil = new Date(capturedAt + quickMs).toISOString();
                    const retentionUntil = new Date(capturedAt + fullMs).toISOString();
                    if (item.tempPhotoQuickUntil !== quickUntil) {
                        item.tempPhotoQuickUntil = quickUntil;
                        changed = true;
                    }
                    if (item.tempPhotoRetentionUntil !== retentionUntil) {
                        item.tempPhotoRetentionUntil = retentionUntil;
                        changed = true;
                    }
                }

                if (hasPhotoData && !item.tempPhotoBytes) {
                    item.tempPhotoBytes = estimateDataUrlBytes(item.tempPhotoData);
                    changed = true;
                }

                const expired = capturedAt > 0 && (now - capturedAt) >= fullMs;
                if (expired && hasPhotoData) {
                    delete item.tempPhotoData;
                    item.tempPhoto = false;
                    item.tempPhotoPurged = true;
                    item.tempPhotoPurgedAt = new Date(now).toISOString();
                    item.tempPhotoRetentionReason = "AUTO_PURGE_30_DAYS";
                    changed = true;
                    purged += 1;
                }
            }

            return { changed, purged };
        }

        function scheduleTemperaturePhotoRetentionSync() {
            clearTimeout(ichefTempPhotoRetentionTimer);
            ichefTempPhotoRetentionTimer = setTimeout(async () => {
                if (ichefTempPhotoRetentionSyncing || !Array.isArray(db.temp)) return;
                ichefTempPhotoRetentionSyncing = true;
                try {
                    await API.update("HACCP_TEMP", db.temp);
                    console.info("[iCHEF HACCP] Rétention photo température synchronisée.");
                } catch (err) {
                    console.warn("[iCHEF HACCP] Rétention photo non synchronisée :", err);
                } finally {
                    ichefTempPhotoRetentionSyncing = false;
                }
            }, 900);
        }

        let haccpDataApplyQueued = false;
        function applyHaccpState(state, { render = true } = {}) {
            const aO = state?.activeOrders || {};

            const settings = aO['SETTINGS_MASTER']?.data || {};
            db.systemSettings = settings;
            currentSystemSettings = settings;
            applyRegulatoryProfile(settings);

            db.temp = aO['HACCP_TEMP']?.data || [];
            const tempRetention = applyTemperaturePhotoRetention(db.temp);
            if (tempRetention.changed) {
                scheduleTemperaturePhotoRetentionSync();
                if (tempRetention.purged > 0) {
                    console.info(`[iCHEF HACCP] ${tempRetention.purged} preuve(s) photo température purgée(s) après ${ICHEF_TEMP_PHOTO_RETENTION_DAYS} jours.`);
                }
            }
            db.cleaning = aO['HACCP_CLEANING']?.data || [];
            db.trace = aO['HACCP_TRACE']?.data || [];
            db.inventoryLogs = aO['HACCP_INV_LOGS']?.data || [];
            db.inventoryMovements = Array.isArray(aO['INVENTORY_MOVEMENTS']?.data) ? aO['INVENTORY_MOVEMENTS'].data : [];

            db.inventoryMaster = Array.isArray(aO['INVENTORY_MASTER']?.data) ? aO['INVENTORY_MASTER'].data : [];
            db.recipesMaster = Array.isArray(aO['RECIPES_MASTER']?.data) ? aO['RECIPES_MASTER'].data : [];
            db.staffAccess = Array.isArray(aO['STAFF_ACCESS']?.data) ? aO['STAFF_ACCESS'].data : [];
            db.menuCuisine = aO['MENU_MASTER']?.data || {};
            db.menuBar = aO['MENU_MASTER_BAR']?.data || aO['MENU_BAR']?.data || {};
            db.menuPatisserie = aO['MENU_MASTER_PATISSERIE']?.data || aO['MENU_PATISSERIE']?.data || {};

            const serverLists = aO['HACCP_LISTS_MASTER']?.data;
            if (serverLists && typeof serverLists === 'object') {
                EMPIRE_LISTS = serverLists;
                db.haccpLists = serverLists;
                try { localStorage.setItem('EMPIRE_HACCP_LISTS_V2_' + tenantID, JSON.stringify(serverLists)); } catch (_) {}
            }

            if (!render) return;
            if (haccpDataApplyQueued) return;
            haccpDataApplyQueued = true;
            requestAnimationFrame(() => {
                haccpDataApplyQueued = false;
                renderLogs();
                populateInventoryDatalist();
                applySystemStateIndicators();
            });
        }

        function loadHaccpCacheInstant() {
            try {
                const cached = readHaccpCache();
                if (!cached || !cached.activeOrders || !Object.keys(cached.activeOrders).length) return false;
                haccpStateMemory = cached;
                haccpStateMemoryAt = Date.now();
                applyHaccpState(cached, { render:true });
                setSyncStatus('online', 'SYSTÈME · PRÊT');
                return true;
            } catch (_) {
                return false;
            }
        }

        async function loadData(options = {}) {
            const state = await API.getState(options);
            applyHaccpState(state, { render:true });
            return state;
        }

        function escapeHtml(value) {
            return String(value ?? '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        }

        function getInventoryCurrency() {
            const raw = String(
                currentSystemSettings?.taxConfig?.currency ||
                currentSystemSettings?.currency ||
                "€"
            ).trim().toUpperCase();
            if (raw === "EUR" || raw === "EURO") return "€";
            if (raw === "CHF") return "CHF";
            return raw || "€";
        }

        function formatInventoryMoney(value) {
            const num = Number(value || 0);
            const safe = Number.isFinite(num) ? num : 0;
            return `${safe.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${getInventoryCurrency()}`;
        }

        function normalizeInventoryName(value) {
            return String(value || "")
                .trim()
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "");
        }

        function findInventoryMasterItem(name) {
            const wanted = normalizeInventoryName(name);
            if (!wanted || !Array.isArray(db.inventoryMaster)) return null;
            return db.inventoryMaster.find(item => normalizeInventoryName(item?.name) === wanted) || null;
        }

        function getInventoryUnitPrice(item) {
            if (!item) return 0;
            const explicit = Number(item.unitPrice);
            if (Number.isFinite(explicit) && explicit >= 0) return explicit;

            const totalPrice = Number(item.totalPrice);
            const baseQty = Number(item.initialQty ?? item.currentQty);
            if (Number.isFinite(totalPrice) && Number.isFinite(baseQty) && baseQty > 0) {
                return totalPrice / baseQty;
            }
            return 0;
        }

        function getInventoryCurrentQty(item) {
            if (!item) return 0;
            const qty = Number(item.currentQty ?? item.initialQty ?? 0);
            return Number.isFinite(qty) ? qty : 0;
        }

        function inventoryMoneyClass(value) {
            const n = Number(value || 0);
            return n < 0 ? "money-negative" : (n > 0 ? "money-positive" : "money-zero");
        }

        function populateInventoryDatalist() {
            const dl = document.getElementById('list-inv-name');
            if (!dl) return;
            const items = Array.isArray(db.inventoryMaster) ? db.inventoryMaster : [];
            dl.innerHTML = items
                .filter(item => item && item.name)
                .sort((a,b) => String(a.name).localeCompare(String(b.name), 'fr'))
                .map(item => `<option value="${escapeHtml(String(item.name))}">${escapeHtml(String(item.fournisseur || item.cat || ''))}</option>`)
                .join('');
            refreshInventoryDashboard();
            handleInventoryProductSelection();
        }

        function handleInventoryProductSelection() {
            const nameEl = document.getElementById('inv-name');
            if (!nameEl) return;
            const item = findInventoryMasterItem(nameEl.value);

            const status = document.getElementById('inv-product-status');
            const theo = document.getElementById('inv-preview-theo');
            const price = document.getElementById('inv-preview-unit-price');
            const value = document.getElementById('inv-preview-value');
            const supplier = document.getElementById('inv-preview-supplier');
            const btn = document.getElementById('inv-count-btn');

            if (!item) {
                if (status) {
                    status.className = 'inv-product-status' + (nameEl.value.trim() ? ' missing' : '');
                    status.textContent = nameEl.value.trim()
                        ? 'Produit non trouvé dans INVENTORY_MASTER — créez-le d’abord dans l’Économat.'
                        : 'Sélectionnez un produit référencé dans iCHEF.';
                }
                if (theo) theo.textContent = '—';
                if (price) price.textContent = '—';
                if (value) value.textContent = '—';
                if (supplier) supplier.textContent = '—';
                if (btn) btn.disabled = true;
                return;
            }

            const qty = getInventoryCurrentQty(item);
            const unit = item.unit || 'u';
            const unitPrice = getInventoryUnitPrice(item);
            const stockValue = qty * unitPrice;

            if (status) {
                status.className = 'inv-product-status ok';
                status.textContent = `Connecté au stock central · ${item.cat || 'Sans catégorie'}`;
            }
            if (theo) theo.textContent = `${qty.toLocaleString('fr-FR', {maximumFractionDigits:3})} ${unit}`;
            if (price) price.textContent = formatInventoryMoney(unitPrice) + ` / ${unit}`;
            if (value) value.textContent = formatInventoryMoney(stockValue);
            if (supplier) supplier.textContent = item.fournisseur || 'Non renseigné';
            if (btn) btn.disabled = false;
        }

        function refreshInventoryDashboard() {
            const master = Array.isArray(db.inventoryMaster) ? db.inventoryMaster : [];
            const logs = Array.isArray(db.inventoryLogs) ? db.inventoryLogs : [];
            const today = new Date().toLocaleDateString('fr-FR');

            const totalValue = master.reduce((sum, item) => {
                return sum + (getInventoryCurrentQty(item) * getInventoryUnitPrice(item));
            }, 0);

            const todayLogs = logs.filter(l => l.dept === currentDept && l.date === today);
            const todayDiffValue = todayLogs.reduce((sum, l) => sum + Number(l.diffValue || 0), 0);

            const stockValueEl = document.getElementById('inv-kpi-stock-value');
            const articlesEl = document.getElementById('inv-kpi-articles');
            const todayEl = document.getElementById('inv-kpi-today');
            const diffEl = document.getElementById('inv-kpi-diff-value');

            if (stockValueEl) stockValueEl.textContent = formatInventoryMoney(totalValue);
            if (articlesEl) articlesEl.textContent = master.length.toLocaleString('fr-FR');
            if (todayEl) todayEl.textContent = todayLogs.length.toLocaleString('fr-FR');
            if (diffEl) {
                diffEl.textContent = formatInventoryMoney(todayDiffValue);
                diffEl.className = `inventory-kpi-value ${inventoryMoneyClass(todayDiffValue)}`;
            }
        }

        async function refreshInventoryFromSystem(btn = null) {
            const oldText = btn?.textContent;
            if (btn) { btn.disabled = true; btn.textContent = 'ACTUALISATION…'; }
            try {
                await loadData();
                setSyncStatus('online', 'SYSTÈME · STOCK ACTUALISÉ');
            } catch (e) {
                console.warn('[iCHEF HACCP] Actualisation stock impossible :', e);
                alert('Impossible d’actualiser le stock central pour le moment.');
            } finally {
                if (btn) { btn.disabled = false; btn.textContent = oldText || 'ACTUALISER LE STOCK'; }
            }
        }

        const HACCP_PENDING_AUDIT_KEY = `ICHEF_HACCP_PENDING_AUDIT_${tenantID}`;

        function readPendingInventoryAudits() {
            try {
                const rows = JSON.parse(localStorage.getItem(HACCP_PENDING_AUDIT_KEY) || "[]");
                return Array.isArray(rows) ? rows : [];
            } catch (_) { return []; }
        }

        function queuePendingInventoryAudit(entry) {
            const rows = readPendingInventoryAudits();
            if (!rows.some(x => String(x.id) === String(entry.id))) rows.unshift(entry);
            try { localStorage.setItem(HACCP_PENDING_AUDIT_KEY, JSON.stringify(rows.slice(0,100))); } catch (_) {}
        }

        async function flushPendingInventoryAudits() {
            const pending = readPendingInventoryAudits();
            if (!pending.length || !window.ICHEF_HACCP?.authenticated) return;
            try {
                const state = await getHaccpServerStateStrict();
                const current = Array.isArray(state?.activeOrders?.['HACCP_INV_LOGS']?.data)
                    ? state.activeOrders['HACCP_INV_LOGS'].data
                    : [];
                const ids = new Set(current.map(x => String(x?.id ?? "")));
                const merged = [...pending.filter(x => !ids.has(String(x.id))), ...current];
                await API.update('HACCP_INV_LOGS', merged);
                db.inventoryLogs = merged;
                localStorage.removeItem(HACCP_PENDING_AUDIT_KEY);
            } catch (_) {
                // La prochaine resynchronisation réessaiera.
            }
        }

        const HACCP_PENDING_MOVEMENTS_KEY = `ICHEF_HACCP_PENDING_MOVEMENTS_${tenantID}`;

        function readPendingHaccpMovements() {
            try {
                const rows = JSON.parse(localStorage.getItem(HACCP_PENDING_MOVEMENTS_KEY) || "[]");
                return Array.isArray(rows) ? rows : [];
            } catch (_) { return []; }
        }

        function queuePendingHaccpMovement(entry) {
            const rows = readPendingHaccpMovements();
            if (!rows.some(x => String(x.id) === String(entry.id))) rows.unshift(entry);
            try { localStorage.setItem(HACCP_PENDING_MOVEMENTS_KEY, JSON.stringify(rows.slice(0,200))); } catch (_) {}
        }

        async function appendHaccpInventoryMovement(entry) {
            try {
                const state = await getHaccpServerStateStrict();
                const current = Array.isArray(state?.activeOrders?.['INVENTORY_MOVEMENTS']?.data)
                    ? state.activeOrders['INVENTORY_MOVEMENTS'].data
                    : [];
                const ids = new Set(current.map(x => String(x?.id ?? "")));
                const merged = ids.has(String(entry.id)) ? current : [entry, ...current];
                await API.update('INVENTORY_MOVEMENTS', merged);
                db.inventoryMovements = merged;
                return true;
            } catch (e) {
                queuePendingHaccpMovement(entry);
                console.warn('[iCHEF HACCP] Mouvement stock en attente :', e);
                return false;
            }
        }

        async function flushPendingHaccpMovements() {
            const pending = readPendingHaccpMovements();
            if (!pending.length || !window.ICHEF_HACCP?.authenticated) return;
            try {
                const state = await getHaccpServerStateStrict();
                const current = Array.isArray(state?.activeOrders?.['INVENTORY_MOVEMENTS']?.data)
                    ? state.activeOrders['INVENTORY_MOVEMENTS'].data
                    : [];
                const ids = new Set(current.map(x => String(x?.id ?? "")));
                const merged = [...pending.filter(x => !ids.has(String(x.id))), ...current];
                await API.update('INVENTORY_MOVEMENTS', merged);
                db.inventoryMovements = merged;
                localStorage.removeItem(HACCP_PENDING_MOVEMENTS_KEY);
            } catch (_) {}
        }

        async function saveInventoryCount() {
            const name = document.getElementById('inv-name')?.value.trim() || '';
            const qtyStr = document.getElementById('inv-qty')?.value || '';

            if (!name || qtyStr === '') {
                return alert('Veuillez sélectionner un produit iCHEF et saisir la quantité réelle.');
            }

            const realQty = Number(String(qtyStr).replace(',', '.'));
            if (!Number.isFinite(realQty) || realQty < 0) return alert('Quantité réelle invalide.');

            const localItem = findInventoryMasterItem(name);
            if (!localItem) {
                return alert('Ce produit n’existe pas dans le stock central iCHEF. Créez-le d’abord dans l’Économat.');
            }

            const btn = document.getElementById('inv-count-btn');
            const previousText = btn?.textContent;
            if (btn) { btn.disabled = true; btn.textContent = 'SYNCHRONISATION…'; }

            try {
                // Relire la source maître juste avant le comptage pour ne pas écraser
                // une réception ou modification faite dans Économat sur un autre poste.
                const freshState = await getHaccpServerStateStrict();
                const freshOrders = freshState?.activeOrders || {};
                const latestInventory = Array.isArray(freshOrders['INVENTORY_MASTER']?.data)
                    ? freshOrders['INVENTORY_MASTER'].data.map(x => ({...x}))
                    : [];
                const latestLogs = Array.isArray(freshOrders['HACCP_INV_LOGS']?.data)
                    ? freshOrders['HACCP_INV_LOGS'].data.slice()
                    : [];

                const localId = localItem.id;
                let idx = localId !== undefined && localId !== null
                    ? latestInventory.findIndex(x => String(x?.id ?? '') === String(localId))
                    : -1;

                if (idx < 0) {
                    const target = String(localItem.name || name).trim().toLowerCase();
                    idx = latestInventory.findIndex(x => String(x?.name || '').trim().toLowerCase() === target);
                }

                if (idx < 0) {
                    throw new Error('Article supprimé ou renommé dans l’Économat. Actualisez puis recommencez.');
                }

                const stockItem = {...latestInventory[idx]};
                const theoreticalQty = getInventoryCurrentQty(stockItem);
                const unit = stockItem.unit || 'u';
                const unitPrice = getInventoryUnitPrice(stockItem);
                const diff = realQty - theoreticalQty;
                const theoreticalValue = theoreticalQty * unitPrice;
                const realValue = realQty * unitPrice;
                const diffValue = diff * unitPrice;
                const now = new Date();

                const logEntry = {
                    id: `haccp_count_${now.getTime()}_${String(stockItem.id ?? 'item')}`,
                    timestamp: now.toISOString(),
                    date: now.toLocaleDateString('fr-FR'),
                    time: now.toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'}),
                    dept: currentDept,
                    name: stockItem.name,
                    sourceInventoryId: stockItem.id ?? null,
                    inventorySource: 'INVENTORY_MASTER',
                    supplier: stockItem.fournisseur || '',
                    category: stockItem.cat || '',
                    theo: theoreticalQty,
                    real: realQty,
                    diff,
                    unit,
                    unitPrice,
                    theoreticalValue,
                    realValue,
                    diffValue,
                    currency: getInventoryCurrency(),
                    audit: 'Compté par ' + userAuditLabel(),
                    sourceModule: 'HACCP',
                    ...regulatoryAuditMeta()
                };

                const stockMovement = {
                    id: `count_${now.getTime()}_${String(stockItem.id ?? 'item')}`,
                    timestamp: now.toISOString(),
                    type: 'COUNT_ADJUSTMENT',
                    inventoryItemId: stockItem.id ?? null,
                    productName: stockItem.name || '',
                    category: stockItem.cat || '',
                    supplier: stockItem.fournisseur || '',
                    unit,
                    beforeQty: theoreticalQty,
                    deltaQty: diff,
                    afterQty: realQty,
                    unitPrice,
                    valueDelta: diffValue,
                    currency: getInventoryCurrency(),
                    sourceModule: 'HACCP',
                    actorRole: currentUser.role || '',
                    actorName: userAuditLabel(),
                    department: currentDept,
                    deviceId,
                    note: 'Comptage physique HACCP'
                };

                latestInventory[idx] = {
                    ...stockItem,
                    currentQty: realQty,
                    qtyStr: `${realQty} ${unit}`,
                    lastPhysicalCountAt: now.toISOString(),
                    lastPhysicalCountBy: userAuditLabel(),
                    lastPhysicalCountDept: currentDept,
                    updatedAt: now.toISOString(),
                    updatedByModule: 'HACCP'
                };

                // 1. Le stock central est prioritaire.
                await API.update('INVENTORY_MASTER', latestInventory);
                db.inventoryMaster = latestInventory;

                // Le même événement est également tracé dans le journal central des mouvements.
                await appendHaccpInventoryMovement(stockMovement);

                // 2. L'audit HACCP détaillé suit. S'il échoue, il est mis en file locale et
                // automatiquement réessayé, sans annuler le stock déjà confirmé.
                const mergedLogs = [logEntry, ...latestLogs.filter(x => String(x?.id) !== String(logEntry.id))];
                try {
                    await API.update('HACCP_INV_LOGS', mergedLogs);
                    db.inventoryLogs = mergedLogs;
                } catch (auditError) {
                    queuePendingInventoryAudit(logEntry);
                    console.warn('[iCHEF HACCP] Audit en attente de resynchronisation :', auditError);
                }

                document.getElementById('inv-name').value = '';
                document.getElementById('inv-qty').value = '';
                renderLogs();
                populateInventoryDatalist();
                setSyncStatus('online', 'SYSTÈME · STOCK HACCP SYNCHRONISÉ');
                flushPendingInventoryAudits().catch(() => {});
                flushPendingHaccpMovements().catch(() => {});
            } catch (e) {
                console.error('[iCHEF HACCP] Comptage non synchronisé :', e);
                alert(e?.message || 'Le comptage n’a pas été confirmé par le serveur.');
                throw e;
            } finally {
                if (btn) { btn.disabled = false; btn.textContent = previousText || 'VALIDER LE COMPTAGE'; }
            }
        }

        function renderLogs() {
            document.getElementById('logs-temp').innerHTML = db.temp.filter(l => l.dept === currentDept).slice(0,20).map(l => {
                const isCooling = l.processType === "COOLING_CYCLE";
                const detail = isCooling
                    ? `<div class="audit-trail">${escapeHaccpUi(l.coolingProduct || "Refroidissement")} · ${Number(l.coolingStartTemp).toLocaleString("fr-FR")} → ${Number(l.coolingEndTemp).toLocaleString("fr-FR")} °C · ${Number(l.coolingDurationMin || 0)} min</div>`
                    : "";
                const statusClass = l.status === "OK" ? "status-ok" : "status-danger";
                const tempProofBadge = l.tempPhotoData
                    ? `<div class="temp-proof-badge">📷 PREUVE PHOTO${Number.isFinite(Number(l.tempOcrValue)) ? ` · OCR ${Number(l.tempOcrValue).toLocaleString("fr-FR")}°C` : ""}</div>`
                    : (l.tempPhotoEver
                        ? `<div class="temp-proof-badge">${l.tempPhotoPurged ? "📷 PHOTO PURGÉE · RELEVÉ CONSERVÉ" : "📷 PREUVE PHOTO · SERVEUR"}</div>`
                        : "");
                return `
                <tr class="${l.originalId ? 'strikethrough' : ''}">
                    <td>${l.date} à ${l.time}</td><td><b>${escapeHaccpUi(haccpEquipmentDisplay(l.eq))}</b>${detail}${tempProofBadge}</td><td><span class="status-badge ${statusClass}">${l.val}°C</span></td>
                    <td>${l.status}</td><td><span class="audit-trail">${l.audit}</span>${l.rectified ? `<span class="audit-trail rectified-text">${l.rectified}</span>` : ''}</td>
                    <td>${!l.originalId && !isCooling ? `<div style="display:flex; gap:5px; flex-direction:column;"><button class="btn-rectify" onclick="initRectify('temp', ${l.id})">Corriger</button>${l.tempPhotoData ? `<button class="btn-rectify temp-proof-action" onclick="viewTemperaturePhoto(${l.id})">📷 Voir preuve</button><button class="btn-rectify temp-proof-action" onclick="downloadTemperatureProof(${l.id})">⬇ Télécharger</button><button class="btn-rectify temp-proof-action" onclick="printTemperatureProof(${l.id})">🖨 Imprimer preuve</button>` : `<button class="btn-rectify" onclick="printDossier('temp', '${l.eq.replace(/'/g, "\\'")}')">Imprimer</button>`}</div>` : ''}</td>
                </tr>`;
            }).join('');

            document.getElementById('logs-cleaning').innerHTML = db.cleaning.filter(l => l.dept === currentDept).slice(0,20).map(l => `
                <tr class="${l.originalId ? 'strikethrough' : ''}">
                    <td>${escapeHaccpUi(l.date)} à ${escapeHaccpUi(l.time)}</td><td><b>${escapeHaccpUi(l.zone)}</b>${l.recordType==='CORRECTIVE_ACTION'?'<br><small style="color:#2365a4">↳ Action corrective liée au contrôle</small>':''}</td><td><span class="status-badge ${l.status==='CONFORME'?'status-ok':'status-danger'}">${escapeHaccpUi(l.status)}</span></td>
                    <td style="color:var(--alert); font-weight:bold;">${escapeHaccpUi(l.obs || '-')}</td><td><span class="audit-trail">${escapeHaccpUi(l.audit)}</span>${l.rectified ? `<span class="audit-trail rectified-text">${escapeHaccpUi(l.rectified)}</span>` : ''}</td>
                    <td>${!l.originalId ? `<div style="display:flex; gap:5px; flex-direction:column;">${l.recordType==='CORRECTIVE_ACTION' ? '<small style="color:#2365a4">Action enregistrée</small>' : `<button class="btn-rectify" type="button" data-h242-source-id="${escapeHaccpUi(String(l.id))}">🛠 Action corrective</button><button class="btn-rectify" type="button" onclick="initRectify('cleaning',this.dataset.logId)" data-log-id="${escapeHaccpUi(String(l.id))}">✎ Rectifier la saisie</button>`}<button class="btn-rectify" style="background: rgba(41, 121, 255, 0.1); color: var(--ordered); border-color: var(--ordered);" onclick="printDossier('cleaning', '${l.zone.replace(/'/g, "\\'")}')">🖨️ Imprimer</button></div>` : ''}</td>
                </tr>`).join('');

            document.getElementById('logs-trace').innerHTML = db.trace.filter(l => l.dept === currentDept).slice(0,20).map(l => {
                let diffDays = l.dlc ? Math.ceil((new Date(l.dlc) - new Date().setHours(0,0,0,0)) / 86400000) : null;
                let dlcStatus = ""; let rowClass = "";
                if(diffDays !== null) {
                    if (diffDays < 0) { dlcStatus = `<b style="color:var(--alert);">PÉRIMÉ</b>`; rowClass = "dlc-alert"; }
                    else if (diffDays === 0) { dlcStatus = `<b style="color:var(--alert);">EXPIRE AUJ.</b>`; rowClass = "dlc-alert"; }
                    else dlcStatus = `<b style="color:var(--gold);">J-${diffDays}</b>`;
                }
                
                let photoCell = '-';
                if(l.imgData) { photoCell = `<button class="btn-view-photo" onclick="viewPhoto('${l.id}')">📷 VOIR</button>`; } 
                else if(l.img) { photoCell = '📷 Oui'; }

                return `<tr class="${rowClass} ${l.originalId ? 'strikethrough' : ''}">
                    <td>${l.date} à ${l.time}</td><td><b>${l.name}</b><br><span style="color:#aaa; font-size:0.7rem;">Lot: ${l.lot}</span></td><td>${l.openDate}</td>
                    <td>${l.dlc}<br>${dlcStatus}</td><td>${photoCell}</td><td><span class="audit-trail">${l.audit}</span>${l.rectified ? `<span class="audit-trail rectified-text">${l.rectified}</span>` : ''}</td>
                    <td>${!l.originalId ? `<div style="display:flex; gap:5px; flex-direction:column;"><button class="btn-rectify" onclick="initRectify('trace', ${l.id})">⚠️ Corriger</button><button class="btn-rectify" style="background: rgba(41, 121, 255, 0.1); color: var(--ordered); border-color: var(--ordered);" onclick="printDossier('trace', '${l.name.replace(/'/g, "\\'")}')">🖨️ Imprimer</button></div>` : ''}</td>
                </tr>`;
            }).join('');

            let invLogs = db.inventoryLogs || [];
            let invHtml = invLogs.filter(l => l.dept === currentDept).slice(0,50).map(l => {
                const diffValue = Number(l.diffValue ?? (Number(l.diff || 0) * Number(l.unitPrice || 0)));
                const unitPrice = Number(l.unitPrice || 0);
                const realValue = Number(l.realValue ?? (Number(l.real || 0) * unitPrice));
                const diffClass = inventoryMoneyClass(diffValue);
                const diffSign = diffValue > 0 ? '+' : '';
                const qtyDiffSign = Number(l.diff || 0) > 0 ? '+' : '';

                return `<tr>
                    <td>
                        <div class="inv-product-name">${escapeHtml(String(l.name || ''))}</div>
                        <div class="inv-product-meta">${escapeHtml(String(l.category || 'Stock iCHEF'))} · Écart ${qtyDiffSign}${Number(l.diff || 0).toLocaleString('fr-FR',{maximumFractionDigits:3})} ${escapeHtml(String(l.unit || 'u'))}</div>
                    </td>
                    <td>${escapeHtml(String(l.supplier || '—'))}</td>
                    <td><strong>${Number(l.theo || 0).toLocaleString('fr-FR',{maximumFractionDigits:3})}</strong> ${escapeHtml(String(l.unit || 'u'))}</td>
                    <td><strong>${Number(l.real || 0).toLocaleString('fr-FR',{maximumFractionDigits:3})}</strong> ${escapeHtml(String(l.unit || 'u'))}</td>
                    <td class="inv-money">${formatInventoryMoney(unitPrice)}</td>
                    <td class="inv-stock-value">${formatInventoryMoney(realValue)}</td>
                    <td class="inv-money ${diffClass}">${diffSign}${formatInventoryMoney(diffValue)}</td>
                    <td><span class="audit-trail">${escapeHtml(String(l.date || ''))} à ${escapeHtml(String(l.time || ''))}<br>${escapeHtml(String(l.audit || ''))}</span></td>
                </tr>`;
            }).join('');

            if (invHtml === '') invHtml = `<tr><td colspan="8" style="text-align:center;color:#64748b;padding:26px;">Aucun comptage récent.</td></tr>`;
            const logsInv = document.getElementById('logs-inventory');
            if (logsInv) logsInv.innerHTML = invHtml;
            refreshInventoryDashboard();
            handleInventoryProductSelection();
            try { renderDesktopTemperatureHub(); } catch (_) {}
            try {
                if (document.body.classList.contains("haccp-cleaning-express-mobile") &&
                    typeof hcleanEnterExpress === "function") {
                    hcleanEnterExpress(true);
                }
            } catch (_) {}
            try { refreshTraceDesktopStats(); } catch (_) {}
            try { updateTraceValidityIndicators(); } catch (_) {}
        }


        // ============================================================
        // iCHEF HACCP — MOTEUR TEMPÉRATURE FR / CH
        // Le profil pays vient des paramètres établissement.
        //
        // IMPORTANT :
        // - Les seuils ci-dessous sont des seuils génériques de surveillance
        //   pour les équipements.
        // - Les prescriptions spécifiques à une denrée, à un procédé, à une
        //   étiquette fournisseur ou au PMS/autocontrôle de l'établissement
        //   restent prioritaires.
        // ============================================================
        const ICHEF_TEMP_REFERENCE = {
            FR: {
                COLD: {
                    id: "FR_COLD_GENERIC_4",
                    mode: "MAX",
                    limit: 4,
                    label: "Froid positif · seuil générique +4 °C",
                    source: "France · chaîne du froid / arrêté du 21 décembre 2009",
                    note: "Certaines denrées ont des seuils spécifiques (ex. +2, +3, +7 ou +8 °C)."
                },
                FROZEN: {
                    id: "FR_FROZEN_18",
                    mode: "MAX",
                    limit: -18,
                    label: "Surgelé · −18 °C maximum",
                    source: "France · chaîne du froid / réglementation sur les surgelés",
                    note: "Des catégories congelées peuvent relever d'autres températures spécifiques."
                },
                HOT: {
                    id: "FR_HOT_63",
                    mode: "MIN",
                    limit: 63,
                    label: "Liaison chaude · +63 °C minimum",
                    source: "France · arrêté du 21 décembre 2009",
                    note: "Seuil de maintien en liaison chaude."
                }
            },
            CH: {
                COLD: {
                    id: "CH_COLD_GENERIC_5",
                    mode: "MAX",
                    limit: 5,
                    label: "Froid positif · inférieur à +5 °C",
                    source: "Suisse · OSAV · hygiène et aliments",
                    note: "Les prescriptions spécifiques à certains produits restent prioritaires."
                },
                FROZEN: {
                    id: "CH_FROZEN_18",
                    mode: "MAX",
                    limit: -18,
                    label: "Surgelé · −18 °C",
                    source: "Suisse · OSAV · conditions de conservation",
                    note: "Respecter aussi l'indication du fabricant et les prescriptions spécifiques."
                },
                HOT: {
                    id: "CH_HOT_65",
                    mode: "MIN",
                    limit: 65,
                    label: "Maintien chaud · +65 °C minimum",
                    source: "Suisse · standards de qualité restauration collective",
                    note: "Référence de bonnes pratiques ; l'autocontrôle et les règles spécifiques de l'établissement restent prioritaires."
                }
            }
        };

        function normalizeHaccpText(value = "") {
            return String(value || "")
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .toUpperCase()
                .trim();
        }

        function detectTemperatureRuleType(equipment = "") {
            // V227 : une catégorie personnalisée conserve son référentiel HACCP
            // même si « Frigo A » se trouve dans « Congélateurs de réserve ».
            try {
                const eq = getSectorEquipmentList().find(row => row.name === equipment);
                if (eq) {
                    if (eq.kind === "FROZEN") return "FROZEN";
                    if (eq.kind === "HOT" || eq.kind === "REHEAT") return "HOT";
                    return "COLD";
                }
            } catch (_) {}
            const name = normalizeHaccpText(equipment);
            if (/(NEGAT|CONGEL|SURGEL|FREEZER|FROID\s*-?\s*18)/.test(name)) return "FROZEN";
            if (/(CHAUD|LIAISON CHAUDE|BAIN.?MARIE|MAINTIEN CHAUD|HOT HOLD)/.test(name)) return "HOT";
            return "COLD";
        }

        function getTemperatureRule(equipment = "") {
            const profile = currentRegulatoryProfile?.id || "INTL";
            const type = detectTemperatureRuleType(equipment);
            const countryRules = ICHEF_TEMP_REFERENCE[profile];

            if (!countryRules) {
                return {
                    id: "PROFILE_REQUIRED",
                    mode: "NONE",
                    limit: null,
                    type,
                    label: "Référentiel pays à confirmer",
                    source: "Configurer le pays de l'établissement dans Administration.",
                    note: "Aucune conformité automatique n'est déclarée sans profil pays."
                };
            }

            return { ...countryRules[type], type, profile };
        }

        function evaluateTemperatureCompliance(equipment, value) {
            const val = Number(value);
            const rule = getTemperatureRule(equipment);
            if (!Number.isFinite(val) || rule.mode === "NONE") {
                return { ok: null, status: "À VÉRIFIER", rule };
            }

            const ok = rule.mode === "MIN"
                ? val >= Number(rule.limit)
                : val <= Number(rule.limit);

            return {
                ok,
                status: ok ? "OK" : "ALERTE",
                rule
            };
        }

        async function saveEntry(type) {
            const now = new Date();
            let entry = {
                id: Date.now(),
                timestamp: now.toISOString(),
                date: now.toLocaleDateString('fr-FR'),
                time: now.toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'}),
                dept: currentDept,
                audit: "Saisi par " + userAuditLabel(),
                ...regulatoryAuditMeta()
            };

            if (rectifiedId) {
                if(!isBoss()) return alert("⛔ ACCÈS REFUSÉ : Chef ou Direction requis pour rectifier.");
                entry.rectified = `[CORRIGÉ PAR ${userAuditLabel().toUpperCase()}] le ${entry.date} à ${entry.time}`;
                const oldIndex = db[type].findIndex(x => x.id === rectifiedId);
                if(oldIndex > -1) db[type][oldIndex].originalId = entry.id; 
            }

            if(type === 'temp') {
                entry.eq = document.getElementById('temp-eq').value.trim();
                entry.val = parseFloat(document.getElementById('temp-val').value);
                if(!entry.eq || isNaN(entry.val)) return alert("Remplissez l'équipement et la valeur.");

                const evaluation = evaluateTemperatureCompliance(entry.eq, entry.val);
                entry.status = evaluation.status;
                entry.temperatureRuleId = evaluation.rule.id;
                entry.temperatureRuleType = evaluation.rule.type;
                entry.temperatureRuleMode = evaluation.rule.mode;
                entry.temperatureRuleLimit = evaluation.rule.limit;
                entry.temperatureRuleLabel = evaluation.rule.label;
                entry.temperatureRuleSource = evaluation.rule.source;
                entry.temperatureRuleNote = evaluation.rule.note || "";
                entry.regulatoryProfileApplied = currentRegulatoryProfile?.id || "INTL";

                const tempEvidence = window.ICHEF_TEMP_EVIDENCE?.pending || null;
                if (tempEvidence?.imgData) {
                    entry.tempPhoto = true;
                    entry.tempPhotoEver = true;
                    entry.tempPhotoData = tempEvidence.imgData;
                    entry.tempPhotoCapturedAt = tempEvidence.capturedAt || now.toISOString();
                    entry.tempPhotoFileName = tempEvidence.fileName || "thermometre.jpg";
                    entry.tempPhotoBytes = estimateDataUrlBytes(tempEvidence.imgData);
                    entry.tempPhotoRetentionPolicy = "FULL_30D_LOCAL_CACHE_0D";
                    entry.tempPhotoQuickUntil = new Date(Date.parse(entry.tempPhotoCapturedAt) + ICHEF_TEMP_PHOTO_QUICK_DAYS * 86400000).toISOString();
                    entry.tempPhotoRetentionUntil = new Date(Date.parse(entry.tempPhotoCapturedAt) + ICHEF_TEMP_PHOTO_RETENTION_DAYS * 86400000).toISOString();
                    entry.tempPhotoPurged = false;
                    entry.tempOcrText = tempEvidence.ocrText || "";
                    entry.tempOcrValue = Number.isFinite(Number(tempEvidence.ocrValue)) ? Number(tempEvidence.ocrValue) : null;
                    entry.tempOcrEngine = tempEvidence.ocrEngine || "";
                    entry.tempValueSource = entry.tempOcrValue !== null ? "PHOTO_OCR_CONFIRMED" : "PHOTO_MANUAL_CONFIRMED";
                    entry.tempValueConfirmed = true;
                } else {
                    entry.tempPhoto = false;
                    entry.tempValueSource = "MANUAL_OR_VOICE";
                }
            } else if(type === 'cleaning') {
                entry.zone = document.getElementById('clean-zone').value.trim(); entry.status = document.getElementById('clean-status').value; entry.obs = document.getElementById('clean-obs').value.trim();
                if(!entry.zone) return alert("Veuillez indiquer la zone nettoyée.");
                if(entry.status === 'NON CONFORME' && !entry.obs) return alert("Une action corrective est obligatoire si NON CONFORME.");
            } else if(type === 'trace') {
                let imgInput = document.getElementById('trace-img');
                entry.name = document.getElementById('trace-name').value.trim(); entry.lot = document.getElementById('trace-lot').value.trim(); entry.openDate = document.getElementById('trace-open').value; entry.dlc = document.getElementById('trace-dlc').value; 
                
                if (imgInput && imgInput.files.length > 0) { entry.img = true; entry.imgData = await getBase64Image(imgInput.files[0]); } 
                else { entry.img = false; }
                if(!entry.name || !entry.lot || !entry.dlc) return alert("Produit, Lot et DLC obligatoires.");
                const deliveryCtx = window.HTRACE_DELIVERY_CONTEXT || null;
                if (deliveryCtx?.orderId && deliveryCtx?.item) {
                    entry.sourceType = "DELIVERY_RECEPTION";
                    entry.purchaseOrderId = String(deliveryCtx.orderId || "");
                    entry.supplierId = String(deliveryCtx.supplierId || "");
                    entry.supplierName = String(deliveryCtx.supplierName || "");
                    entry.purchaseOrderItemId = String(deliveryCtx.item.itemId || "");
                    entry.inventoryItemId = String(deliveryCtx.item.inventoryItemId || "");
                    entry.receivedQuantity = Number(deliveryCtx.receivedQuantity ?? deliveryCtx.item.receivedQuantity ?? 0);
                    entry.receivedUnit = String(deliveryCtx.item.unit || "");
                    entry.stockReceptionLinked = !!String(deliveryCtx.item.inventoryItemId || "").trim();
                }
            }

            db[type].unshift(entry);
            await API.update(`HACCP_${type.toUpperCase()}`, db[type]);
            if (type === "trace" && typeof window.htraceAfterTraceSaved === "function") {
                try { window.htraceAfterTraceSaved(entry); } catch (_) {}
            }
            rectifiedId = null;
            
            document.getElementById(`btn-save-${type}`).innerText = type === 'trace' ? "ARCHIVER PRODUIT" : (type === 'cleaning' ? "VALIDER LE NETTOYAGE" : "ENREGISTRER");
            document.querySelectorAll('input[type="text"], input[type="number"]').forEach(i => i.value = "");
            
            let fileInput = document.getElementById('trace-img'); if(fileInput) fileInput.value = '';
            if (type === "temp") {
                try { window.ICHEF_TEMP_EVIDENCE?.clearAfterSave?.(); } catch (_) {}
            }
            
            renderLogs();
            return entry;
        }

        function viewPhoto(id) {
            const item = db.trace.find(x => x.id.toString() === id.toString());
            if(item && item.imgData) {
                document.getElementById('photo-viewer-img').src = item.imgData;
                document.getElementById('photo-modal').classList.add('open');
            }
        }

        function closePhoto() { document.getElementById('photo-modal').classList.remove('open'); }

        function initRectify(type, id) {
            if(!isBoss()) return alert("⛔ CHEF OU DIRECTION UNIQUEMENT.");
            const item = (db[type] || []).find(x => String(x.id) === String(id));
            if (!item) return alert('Ce contrôle n’est plus disponible. Rechargez les données HACCP.');
            rectifiedId = item.id; rectifiedType = type;
            if(type === 'temp') { document.getElementById('temp-eq').value = item.eq; document.getElementById('temp-val').value = item.val; }
            else if(type === 'cleaning') { document.getElementById('clean-zone').value = item.zone; document.getElementById('clean-status').value = item.status; document.getElementById('clean-obs').value = item.obs || ""; toggleCleanObs();}
            else if(type === 'trace') { document.getElementById('trace-name').value = item.name; document.getElementById('trace-lot').value = item.lot; document.getElementById('trace-open').value = item.openDate; document.getElementById('trace-dlc').value = item.dlc; }
            document.getElementById(`btn-save-${type}`).innerText = "⚠️ SAUVEGARDER LA CORRECTION";
            const focusId={temp:'temp-eq',cleaning:'clean-zone',trace:'trace-name'}[type];
            const target=document.getElementById(focusId);
            target?.scrollIntoView({behavior:'smooth',block:'center'});
            target?.focus({preventScroll:true});
        }

        function printDossier(category, itemName) {
            let data = db[category].filter(l => {
                if (l.dept !== currentDept) return false;
                if (category === 'temp') return l.eq === itemName;
                if (category === 'cleaning') return l.zone === itemName;
                if (category === 'trace') return l.name === itemName;
            });
            let countStr = prompt(`🖨️ Impression d'étiquettes (5x3 cm)\nCombien d'étiquettes voulez-vous générer pour "${itemName}" ?`, "1");
            if (!countStr) return;
            let count = parseInt(countStr);
            if (isNaN(count) || count <= 0) return;
            let itemData = data.length > 0 ? data[0] : null; 

            let html = `<style>@page { margin: 5mm; } .print-label { width: 50mm; height: 30mm; border: 1px dashed #999; border-radius: 4px; box-sizing: border-box; padding: 3mm; display: flex; flex-direction: column; justify-content: space-between; font-family: Arial, sans-serif; color: #000; background: #fff; page-break-inside: avoid; overflow: hidden; } .l-head { font-size: 10px; font-weight: 900; text-align: center; text-transform: uppercase; border-bottom: 2px solid #000; padding-bottom: 2px; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } .l-row { font-size: 8px; display: flex; justify-content: space-between; margin-bottom: 1px; } .l-val { font-weight: bold; } #print-report { display: flex !important; flex-wrap: wrap; gap: 2mm; width: 100%; justify-content: flex-start; align-content: flex-start; }</style>`;
            
            for(let i=0; i<count; i++) {
                html += `<div class="print-label"><div class="l-head">${itemName}</div>`;
                if(itemData) {
                    if (category === 'trace') {
                        html += `<div class="l-row"><span>Lot:</span> <span class="l-val">${itemData.lot}</span></div>`;
                        html += `<div class="l-row"><span>Ouvert:</span> <span class="l-val">${itemData.openDate}</span></div>`;
                        html += `<div class="l-row"><span>DLC:</span> <span class="l-val" style="font-size:10px;">${itemData.dlc}</span></div>`;
                        html += `<div class="l-row"><span>Par:</span> <span class="l-val">${itemData.audit.replace('Saisi par ', '')}</span></div>`;
                    } else if (category === 'temp') {
                        html += `<div class="l-row"><span>Valeur:</span> <span class="l-val">${itemData.val}°C (${itemData.status})</span></div>`;
                        html += `<div class="l-row"><span>Le:</span> <span class="l-val">${itemData.date} ${itemData.time}</span></div>`;
                        html += `<div class="l-row"><span>Par:</span> <span class="l-val">${itemData.audit.replace('Saisi par ', '')}</span></div>`;
                    } else {
                        html += `<div class="l-row"><span>Statut:</span> <span class="l-val">${itemData.status}</span></div>`;
                        html += `<div class="l-row"><span>Le:</span> <span class="l-val">${itemData.date} ${itemData.time}</span></div>`;
                        html += `<div class="l-row"><span>Par:</span> <span class="l-val">${itemData.audit.replace('Saisi par ', '')}</span></div>`;
                    }
                } else {
                    html += `<div class="l-row"><span>Lot:</span> <span class="l-val">______________</span></div><div class="l-row"><span>Date:</span> <span class="l-val">__/__/____</span></div><div class="l-row"><span>DLC:</span> <span class="l-val">__/__/____</span></div><div class="l-row"><span>Sign:</span> <span class="l-val">________</span></div>`;
                }
                html += `</div>`;
            }
            document.getElementById('print-report').innerHTML = html;
            window.print();
        }

        function generateArchiveFolders() {
            const container = document.getElementById('archive-folders');
            container.innerHTML = "";
            const months = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
            const now = new Date();
            for(let i=0; i < 5; i++) {
                let year = now.getFullYear() - i;
                let h = document.createElement('div'); h.style = "color:#555; font-size:0.8rem; margin:15px 0 5px 0; font-weight:bold;"; h.innerText = year; container.appendChild(h);
                months.forEach((m, idx) => {
                    let f = document.createElement('div'); f.className = "archive-folder"; f.innerText = "📁 " + m;
                    f.onclick = () => viewArchive(year, idx, m);
                    container.appendChild(f);
                });
            }
        }

        function viewArchive(year, monthIdx, monthName) {
            document.querySelectorAll('.archive-folder').forEach(f => f.classList.remove('active'));
            event.target.classList.add('active');
            document.getElementById('archive-title').innerText = `${monthName.toUpperCase()} ${year} - ${currentDept}`;
            
            const filterFn = l => {
                if(!l.timestamp) return false;
                const d = new Date(l.timestamp);
                return d.getFullYear() === year && d.getMonth() === monthIdx && l.dept === currentDept;
            };

            selectedArchiveData = {
                temp: db.temp.filter(filterFn),
                cleaning: db.cleaning.filter(filterFn),
                trace: db.trace.filter(filterFn)
            };

            const res = document.getElementById('archive-results');
            if(selectedArchiveData.temp.length > 0 || selectedArchiveData.cleaning.length > 0 || selectedArchiveData.trace.length > 0) {
                document.getElementById('btn-download-month').style.display = 'inline-block';
                document.getElementById('btn-print-month').style.display = 'inline-block';
                
                res.innerHTML = `
                    <p style="color:var(--accent); font-weight:bold;">✅ Données trouvées pour cette période.</p>
                    <ul style="color:#aaa; line-height:1.8;">
                        <li>🌡️ <b>${selectedArchiveData.temp.length}</b> relevés de températures</li>
                        <li>🧼 <b>${selectedArchiveData.cleaning.length}</b> validations de nettoyage</li>
                        <li>🏷️ <b>${selectedArchiveData.trace.length}</b> étiquettes de traçabilité DLC</li>
                    </ul>
                    <p style="color:#555; font-size:0.8rem; margin-top:20px;">Utilisez les boutons en haut à droite pour télécharger la sauvegarde ou générer le rapport DDPP officiel.</p>
                `;
            } else {
                document.getElementById('btn-download-month').style.display = 'none';
                document.getElementById('btn-print-month').style.display = 'none';
                res.innerHTML = `<p style="text-align:center; color:#555; margin-top:50px;">Aucun relevé d'archive disponible pour cette période.</p>`;
            }
        }

        function downloadSelectedMonth() {
            const fileName = `ICHEF_HACCP_${currentRegulatoryProfile.id}_${currentDept}_${document.getElementById('archive-title').innerText.replace(/ /g, '_')}.json`;
            const exportData = {
                ...selectedArchiveData,
                _meta: {
                    exportedAt: new Date().toISOString(),
                    tenantID,
                    department: currentDept,
                    ...regulatoryAuditMeta()
                }
            };
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = fileName; a.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        }

        function printArchiveMonth() {
            const title = document.getElementById('archive-title').innerText;
            
            let html = `<style>
                @page { margin: 15mm; size: A4 portrait; }
                #print-report { display: block !important; width: 100%; font-family: Arial, sans-serif; color: #000; background: #fff; }
                .print-header { text-align: center; border-bottom: 3px solid #000; margin-bottom: 20px; padding-bottom: 10px; }
                .print-header h1 { font-size: 24px; margin: 0 0 5px 0; text-transform: uppercase; }
                .print-header p { font-size: 14px; color: #444; margin: 0; }
                .print-section { margin-bottom: 30px; page-break-inside: avoid; }
                .print-section h2 { font-size: 16px; background: #f0f0f0; padding: 8px; border: 1px solid #000; margin-bottom: 10px; text-transform: uppercase;}
                .print-table { width: 100%; border-collapse: collapse; font-size: 11px; }
                .print-table th, .print-table td { border: 1px solid #000; padding: 6px; text-align: left; vertical-align: middle; }
                .print-img { max-height: 60px; max-width: 100px; object-fit: contain; border: 1px solid #ccc; }
            </style>`;

            html += `<div class="print-header">
                <h1>${currentRegulatoryProfile.exportTitle}</h1>
                <p><strong>ÉTABLISSEMENT :</strong> ${tenantID} | <strong>PAYS / PROFIL :</strong> ${currentRegulatoryProfile.countryLabel}</p>
                <p><strong>PÉRIODE :</strong> ${title} | <strong>DATE D'ÉDITION :</strong> ${new Date().toLocaleString('fr-FR')}</p>
                <p style="margin-top:5px;font-size:11px;"><strong>RÉFÉRENTIEL :</strong> ${currentRegulatoryProfile.framework}</p>
                <p style="margin-top:3px;font-size:11px;"><strong>AUTORITÉ :</strong> ${currentRegulatoryProfile.authority}</p>
            </div>`;

            if(selectedArchiveData.temp.length > 0) {
                html += `<div class="print-section"><h2>🌡️ Relevés de Températures</h2><table class="print-table">
                    <thead><tr><th>Date / Heure</th><th>Équipement</th><th>Valeur (°C)</th><th>Statut</th><th>Preuve photo</th><th>Signature / Audit</th></tr></thead><tbody>`;
                selectedArchiveData.temp.forEach(l => {
                    const photoHtml = l.tempPhotoData
                        ? `<img src="${l.tempPhotoData}" class="print-img"><br><small>${Number.isFinite(Number(l.tempOcrValue)) ? `OCR : ${Number(l.tempOcrValue).toLocaleString("fr-FR")}°C · ` : ""}Valeur confirmée : ${Number(l.val).toLocaleString("fr-FR")}°C</small>`
                        : (l.tempPhotoEver
                            ? `<small>Photo preuve purgée automatiquement après ${ICHEF_TEMP_PHOTO_RETENTION_DAYS} jours · valeur écrite et audit conservés.</small>`
                            : "—");
                    html += `<tr><td>${l.date} ${l.time}</td><td>${l.eq}</td><td>${l.val}°C</td><td>${l.status}</td><td style="text-align:center;">${photoHtml}</td><td>${l.audit} ${l.rectified ? '<br><i>'+l.rectified+'</i>' : ''}</td></tr>`;
                });
                html += `</tbody></table></div>`;
            }

            if(selectedArchiveData.cleaning.length > 0) {
                html += `<div class="print-section"><h2>🧼 Plan de Nettoyage</h2><table class="print-table">
                    <thead><tr><th>Date / Heure</th><th>Zone / Matériel</th><th>Statut</th><th>Action Corrective</th><th>Signature / Audit</th></tr></thead><tbody>`;
                selectedArchiveData.cleaning.forEach(l => {
                    html += `<tr><td>${l.date} ${l.time}</td><td>${l.zone}</td><td>${l.status}</td><td>${l.obs || '-'}</td><td>${l.audit} ${l.rectified ? '<br><i>'+l.rectified+'</i>' : ''}</td></tr>`;
                });
                html += `</tbody></table></div>`;
            }

            if(selectedArchiveData.trace.length > 0) {
                html += `<div class="print-section"><h2>🏷️ Traçabilité & DLC</h2><table class="print-table">
                    <thead><tr><th>Opération</th><th>Produit</th><th>Lot / Ouverture</th><th>DLC</th><th>Photo Étiquette</th><th>Signature / Audit</th></tr></thead><tbody>`;
                selectedArchiveData.trace.forEach(l => {
                    let photoHtml = l.imgData ? `<img src="${l.imgData}" class="print-img">` : (l.img ? "Oui (Ancienne format)" : "Non");
                    html += `<tr>
                        <td>${l.date} ${l.time}</td><td><b>${l.name}</b></td>
                        <td>Lot: ${l.lot}<br>Ouv: ${l.openDate}</td><td>${l.dlc}</td>
                        <td style="text-align:center;">${photoHtml}</td>
                        <td>${l.audit} ${l.rectified ? '<br><i>'+l.rectified+'</i>' : ''}</td>
                    </tr>`;
                });
                html += `</tbody></table></div>`;
            }

            document.getElementById('print-report').innerHTML = html;
            window.print();
        }

       function importArchive(input) {
            const file = input.files[0];
            if(!file) return;
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const importedData = JSON.parse(e.target.result);
                    if(importedData.temp) {
                        const existTemp = new Set(db.temp.map(x => x.id));
                        importedData.temp.forEach(item => { if(!existTemp.has(item.id)) db.temp.push(item); });
                        await API.update('HACCP_TEMP', db.temp);
                    }
                    if(importedData.cleaning) {
                        const existClean = new Set(db.cleaning.map(x => x.id));
                        importedData.cleaning.forEach(item => { if(!existClean.has(item.id)) db.cleaning.push(item); });
                        await API.update('HACCP_CLEANING', db.cleaning);
                    }
                    if(importedData.trace) {
                        const existTrace = new Set(db.trace.map(x => x.id));
                        importedData.trace.forEach(item => { if(!existTrace.has(item.id)) db.trace.push(item); });
                        await API.update('HACCP_TRACE', db.trace);
                    }
                    alert("✅ Dossier de sauvegarde (JSON) chargé et fusionné avec succès !");
                    loadData(); 
                } catch(err) { alert("Erreur : Fichier archive invalide. Vérifiez qu'il s'agit bien du JSON d'Empire OS."); }
                input.value = ''; 
            };
            reader.readAsText(file);
        }

        // --- 🤖 MOTEUR IA (LECTURE DES ÉTIQUETTES) 🤖 ---
        async function processLabelScan(input) {
            const file = input.files[0];
            if (!file) return;

            const btn = document.getElementById('btn-scan-label');
            const originalText = btn.innerHTML;
            btn.innerHTML = "⏳ LECTURE EN COURS...";
            btn.style.backgroundColor = "var(--ordered)";
            btn.style.color = "#fff";

            try {
                const base64Full = await getBase64Image(file);
                const base64Data = base64Full.split(',')[1];

                const response = await fetch(`${SERVER_URL}/analyse-ticket`, {
                    method: 'POST',
                    headers: systemHeaders({ "Content-Type": "application/json" }),
                    credentials: "include",
                    cache: "no-store",
                    body: JSON.stringify({ 
                        tenantID,
                        regulatoryProfile: currentRegulatoryProfile.id,
                        regulatoryCountry: currentRegulatoryProfile.countryCode,
                        image: base64Data, 
                        mimeType: file.type || "image/jpeg",
                        isLabelScan: true
                    })
                });

                const data = await response.json();
                if (!response.ok) throw new Error(data.error || "Erreur serveur.");

                const res = data.resultat;

                if (res.nom) document.getElementById('trace-name').value = res.nom;
                if (res.lot) document.getElementById('trace-lot').value = res.lot;
                
                if (res.dlc) {
                    try {
                        let parts = res.dlc.split('/');
                        if (parts.length === 3) document.getElementById('trace-dlc').value = `20${parts[2].slice(-2)}-${parts[1]}-${parts[0]}`;
                    } catch(e) {}
                }

                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);
                document.getElementById('trace-img').files = dataTransfer.files;

                try { syncTraceExpressFromLegacy(); } catch (_) {}
                try { refreshTraceDesktopStats(); } catch (_) {}

                btn.innerHTML = "✅ ÉTIQUETTE ET PHOTO ENREGISTRÉES !";
                btn.style.backgroundColor = "var(--accent)";
                btn.style.borderColor = "var(--accent)";
                btn.style.color = "#000";
                
                setTimeout(() => { 
                    btn.innerHTML = originalText; 
                    btn.style.backgroundColor = "rgba(41, 121, 255, 0.1)"; 
                    btn.style.borderColor = "var(--ordered)";
                    btn.style.color = "var(--ordered)";
                }, 3000);

            } catch (e) {
                alert("❌ ERREUR IA : " + e.message);
                btn.innerHTML = originalText;
                btn.style.backgroundColor = "rgba(41, 121, 255, 0.1)"; 
            } finally {
                input.value = "";
            }
        }



        // ============================================================
        // INVENTAIRE — CARTES KPI INTELLIGENTES
        // Tap/clic : explication. Appui 0,9 s : zone concernée.
        // ============================================================
        const INVENTORY_KPI_HOLD_MS = 900;
        let inventoryKpiActiveKey = null;

        function getInventoryKpiConfig(key) {
            const currency = getInventoryCurrency();
            const configs = {
                "stock-value": {
                    title: "Valeur du stock central",
                    valueId: "inv-kpi-stock-value",
                    description: "Montant estimé de tout le stock actuellement présent dans INVENTORY_MASTER. iCHEF additionne la valeur de chaque article à partir de sa quantité actuelle et de son prix d’achat unitaire.",
                    formula: `Calcul : somme de (quantité actuelle × prix d’achat unitaire). Devise active : ${currency}.`,
                    destinationLabel: "OUVRIR L’ÉCONOMAT",
                    shortcutText: "Maintenez 0,9 seconde pour ouvrir directement l’Économat.",
                    action: "economat"
                },
                "articles": {
                    title: "Articles référencés",
                    valueId: "inv-kpi-articles",
                    description: "Nombre de références produits actuellement enregistrées dans le stock central iCHEF. Cela comprend les articles disponibles pour le comptage physique et la valorisation.",
                    formula: "Source : INVENTORY_MASTER. Un produit absent de cette base n’est volontairement pas créé depuis HACCP afin de conserver une source de stock unique.",
                    destinationLabel: "OUVRIR L’ÉCONOMAT",
                    shortcutText: "Maintenez 0,9 seconde pour ouvrir directement l’Économat.",
                    action: "economat"
                },
                "today": {
                    title: "Comptages effectués aujourd’hui",
                    valueId: "inv-kpi-today",
                    description: `Nombre de comptages physiques enregistrés aujourd’hui pour le département ${currentDept || "actuel"}. Chaque comptage conserve l’heure, l’utilisateur, le stock théorique et le stock réellement constaté.`,
                    formula: "Source : HACCP_INV_LOGS filtré sur la date du jour et le département connecté.",
                    destinationLabel: "VOIR LE REGISTRE DES COMPTAGES",
                    shortcutText: "Maintenez 0,9 seconde pour aller directement au registre des comptages HACCP.",
                    action: "register"
                },
                "diff": {
                    title: "Impact financier des écarts",
                    valueId: "inv-kpi-diff-value",
                    description: "Valeur financière cumulée des différences constatées aujourd’hui entre le stock théorique et le stock réellement compté.",
                    formula: `Pour chaque comptage : (quantité réelle − quantité théorique) × prix d’achat unitaire. Le résultat total est affiché en ${currency}.`,
                    destinationLabel: "VOIR LES ÉCARTS FINANCIERS",
                    shortcutText: "Maintenez 0,9 seconde pour afficher directement les écarts financiers HACCP.",
                    action: "diff"
                }
            };
            return configs[key] || null;
        }

        function openInventoryKpiSheet(key) {
            const cfg = getInventoryKpiConfig(key);
            if (!cfg) return;
            inventoryKpiActiveKey = key;

            const valueEl = document.getElementById(cfg.valueId);
            const sheet = document.getElementById('inventory-kpi-sheet');
            if (!sheet) return;

            document.getElementById('inventory-kpi-sheet-title').textContent = cfg.title;
            document.getElementById('inventory-kpi-sheet-value').textContent = valueEl?.textContent?.trim() || '—';
            document.getElementById('inventory-kpi-sheet-description').textContent = cfg.description;
            document.getElementById('inventory-kpi-sheet-formula').textContent = cfg.formula;
            const shortcut = document.getElementById('inventory-kpi-sheet-shortcut');
            if (shortcut) shortcut.textContent = cfg.shortcutText || 'Maintenez 0,9 seconde pour ouvrir directement la destination associée.';

            const go = document.getElementById('inventory-kpi-sheet-go');
            if (go) go.textContent = cfg.destinationLabel;

            sheet.classList.add('open');
            sheet.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
            setTimeout(() => document.querySelector('#inventory-kpi-sheet [data-kpi-close]')?.focus?.(), 30);
        }

        function closeInventoryKpiSheet() {
            const sheet = document.getElementById('inventory-kpi-sheet');
            if (!sheet) return;
            sheet.classList.remove('open');
            sheet.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
        }

        function openInventoryEconomat() {
            openIchefModule('economat.html');
        }

        function scrollToInventoryRegister(highlightDiff = false) {
            closeInventoryKpiSheet();
            const register = document.getElementById('inventory-count-register');
            if (!register) return;

            register.classList.remove('inventory-target-flash', 'inventory-diff-highlight');
            void register.offsetWidth;
            if (highlightDiff) register.classList.add('inventory-diff-highlight');
            register.classList.add('inventory-target-flash');
            register.scrollIntoView({ behavior: 'smooth', block: 'start' });

            if (highlightDiff) {
                setTimeout(() => register.classList.remove('inventory-diff-highlight'), 4200);
            }
            setTimeout(() => register.classList.remove('inventory-target-flash'), 2800);
        }

        function goToInventoryKpiDestination(key) {
            const cfg = getInventoryKpiConfig(key);
            if (!cfg) return;
            closeInventoryKpiSheet();
            if (navigator.vibrate) {
                try { navigator.vibrate(35); } catch (_) {}
            }

            if (cfg.action === 'economat') {
                openInventoryEconomat();
            } else if (cfg.action === 'register') {
                scrollToInventoryRegister(false);
            } else if (cfg.action === 'diff') {
                scrollToInventoryRegister(true);
            }
        }

        function bindInventoryKpiInteractions() {
            const cards = Array.from(document.querySelectorAll('.inventory-kpi-action[data-inv-kpi]'));
            if (!cards.length) return;

            cards.forEach(card => {
                if (card.dataset.kpiBound === '1') return;
                card.dataset.kpiBound = '1';

                let timer = null;
                let startX = 0;
                let startY = 0;
                let moved = false;
                let longFired = false;

                const clearPress = () => {
                    if (timer) clearTimeout(timer);
                    timer = null;
                    card.classList.remove('is-pressing');
                };

                card.addEventListener('pointerdown', event => {
                    if (event.button !== undefined && event.button !== 0) return;
                    startX = event.clientX;
                    startY = event.clientY;
                    moved = false;
                    longFired = false;
                    card.classList.remove('is-long-fired');
                    card.classList.add('is-pressing');

                    timer = setTimeout(() => {
                        if (moved) return;
                        longFired = true;
                        card.classList.remove('is-pressing');
                        card.classList.add('is-long-fired');
                        goToInventoryKpiDestination(card.dataset.invKpi);
                    }, INVENTORY_KPI_HOLD_MS);
                });

                card.addEventListener('pointermove', event => {
                    if (!timer) return;
                    const distance = Math.hypot(event.clientX - startX, event.clientY - startY);
                    if (distance > 12) {
                        moved = true;
                        clearPress();
                    }
                });

                card.addEventListener('pointerup', () => {
                    const shouldOpen = !moved && !longFired;
                    clearPress();
                    if (shouldOpen) openInventoryKpiSheet(card.dataset.invKpi);
                });

                card.addEventListener('pointercancel', clearPress);
                card.addEventListener('pointerleave', event => {
                    if (event.pointerType === 'mouse') clearPress();
                });
                card.addEventListener('contextmenu', event => event.preventDefault());
                card.addEventListener('click', event => event.preventDefault());
                card.addEventListener('keydown', event => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        openInventoryKpiSheet(card.dataset.invKpi);
                    }
                });
            });

            const sheet = document.getElementById('inventory-kpi-sheet');
            if (sheet && sheet.dataset.bound !== '1') {
                sheet.dataset.bound = '1';
                sheet.querySelectorAll('[data-kpi-close]').forEach(el => {
                    el.addEventListener('click', closeInventoryKpiSheet);
                });
                document.getElementById('inventory-kpi-sheet-go')?.addEventListener('click', () => {
                    if (inventoryKpiActiveKey) goToInventoryKpiDestination(inventoryKpiActiveKey);
                });
                document.addEventListener('keydown', event => {
                    if (event.key === 'Escape' && sheet.classList.contains('open')) closeInventoryKpiSheet();
                });
            }
        }


        // --- DÉMARRAGE iCHEF HACCP V6.0 : IDENTITÉ UNIQUE ---
        window.addEventListener("DOMContentLoaded", async () => {
            bindInventoryKpiInteractions();
            applyRegulatoryProfile({});
            showHaccpMobileSecureGate("", { checking:true });
            setSyncStatus("degraded", "SYSTÈME · IDENTIFICATION AUTOMATIQUE…");

            // Téléphone ET ordinateur : une seule règle.
            // HACCP reprend la session iCHEF déjà signée et le serveur fournit
            // l'identité, le rôle et le secteur. Aucun choix d'espace, aucun second PIN.
            let resumed = await tryResumeHaccpStaffSession();
            if (resumed) return;

            // V251 : pas de seconde attente bloquante. Si le serveur tarde, le
            // bouton « Réessayer » reste disponible sans contourner la sécurité.
            showHaccpMobileSecureGate(haccpEntrySectorHint());
            setSyncStatus('degraded','SYSTÈME · CONNEXION iCHEF À VÉRIFIER');
            ichef226DesktopGate();
        });
    </script>

<div id="inventory-kpi-sheet" class="inventory-kpi-sheet" aria-hidden="true">
    <div class="inventory-kpi-sheet-backdrop" data-kpi-close></div>
    <section class="inventory-kpi-sheet-card" role="dialog" aria-modal="true" aria-labelledby="inventory-kpi-sheet-title">
        <div class="inventory-kpi-sheet-handle"></div>
        <div class="inventory-kpi-sheet-top">
            <div>
                <div class="inventory-kpi-sheet-kicker">INDICATEUR INVENTAIRE</div>
                <h3 id="inventory-kpi-sheet-title">Détail</h3>
            </div>
            <button type="button" class="inventory-kpi-sheet-close" data-kpi-close aria-label="Fermer">×</button>
        </div>
        <div id="inventory-kpi-sheet-value" class="inventory-kpi-sheet-value">—</div>
        <div id="inventory-kpi-sheet-description" class="inventory-kpi-sheet-description"></div>
        <div id="inventory-kpi-sheet-formula" class="inventory-kpi-sheet-formula"></div>
        <div class="inventory-kpi-sheet-tip">
            <strong>Raccourci :</strong> <span id="inventory-kpi-sheet-shortcut">Maintenez 0,9 seconde pour ouvrir directement la destination associée.</span>
        </div>
        <button id="inventory-kpi-sheet-go" type="button" class="inventory-kpi-sheet-go">OUVRIR LA ZONE CONCERNÉE</button>
    </section>
</div>


<script id="ichef-haccp-horizontal-scroll-v56">
(function(){
  const nav = document.querySelector('.nav-haccp');
  if (!nav) return;

  nav.addEventListener('wheel', function(e){
    if (nav.scrollWidth <= nav.clientWidth) return;
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (!delta) return;
    nav.scrollLeft += delta;
    e.preventDefault();
  }, { passive:false });
})();
</script>
<!-- ========================================================= -->

<script id="ichef-haccp-express-mobile-v60-js">
(() => {
    "use strict";

    let hxIndex = 0;
    let hxEquipment = [];
    let hxRecognition = null;
    let hxAutoTimer = null;
    let hxSaving = false;
    let hxFullMode = false;

    const $hx = id => document.getElementById(id);

    function hxIsPhone() {
        return typeof haccpIsPhoneMode === "function"
            ? haccpIsPhoneMode()
            : window.matchMedia("(max-width:1100px)").matches;
    }

    function hxFlattenEquipment() {
        const source = window.EMPIRE_LISTS || (typeof EMPIRE_LISTS !== "undefined" ? EMPIRE_LISTS : null);
        const dept = typeof currentDept !== "undefined" ? currentDept : "";
        const groups = source?.[dept]?.eq || {};
        const list = [];
        Object.entries(groups).forEach(([folder, items]) => {
            (Array.isArray(items) ? items : []).forEach(name => {
                if (name && !list.some(x => x.name === name)) list.push({ name, folder });
            });
        });
        return list;
    }

    function hxProfileLabel() {
        const p = typeof currentRegulatoryProfile !== "undefined" ? currentRegulatoryProfile : null;
        if (p?.id === "FR") return "FRANCE · PMS / HACCP";
        if (p?.id === "CH") return "SUISSE · AUTOCONTRÔLE / HACCP";
        return "RÉFÉRENTIEL À CONFIRMER";
    }

    function hxCurrent() {
        return hxEquipment[hxIndex] || null;
    }

    function hxFormatLimit(rule) {
        if (!rule || rule.mode === "NONE" || !Number.isFinite(Number(rule.limit))) return "Seuil à confirmer";
        if (rule.mode === "MIN") return `≥ ${Number(rule.limit).toLocaleString("fr-FR")} °C`;
        return `≤ ${Number(rule.limit).toLocaleString("fr-FR")} °C`;
    }

    function hxRender() {
        const current = hxCurrent();
        if (!current) {
            if ($hx("hx-equipment")) $hx("hx-equipment").textContent = "Aucun équipement";
            if ($hx("hx-rule")) $hx("hx-rule").textContent = "Ajoutez les équipements dans le catalogue HACCP.";
            return;
        }

        const rule = typeof getTemperatureRule === "function" ? getTemperatureRule(current.name) : null;
        $hx("hx-equipment").textContent = typeof haccpEquipmentDisplay==='function'?haccpEquipmentDisplay(current.name):current.name;
        $hx("hx-profile-label").textContent = hxProfileLabel();
        $hx("hx-progress-text").textContent = `${hxIndex + 1} / ${hxEquipment.length}`;
        $hx("hx-progress-bar").style.width = `${((hxIndex + 1) / Math.max(1, hxEquipment.length)) * 100}%`;
        $hx("hx-rule").textContent = rule
            ? `${hxFormatLimit(rule)} · ${rule.label} · ${rule.source}`
            : "Référentiel en cours de chargement…";

        const input = $hx("hx-temp");
        if (input) input.value = "";
        hxSetLive(null);
        if ($hx("hx-confirm")) $hx("hx-confirm").textContent = current.folder ? current.folder : "";
    }

    function hxSetLive(value) {
        const box = $hx("hx-live-state");
        if (!box) return;

        box.className = "hx-live-state neutral";
        if (value === null || value === "" || !Number.isFinite(Number(value))) {
            box.textContent = "Entrez la température ou utilisez le micro.";
            return;
        }

        const current = hxCurrent();
        if (!current || typeof evaluateTemperatureCompliance !== "function") return;
        const e = evaluateTemperatureCompliance(current.name, Number(value));

        if (e.ok === true) {
            box.className = "hx-live-state ok";
            box.textContent = `✓ CONFORME · ${Number(value).toLocaleString("fr-FR")} °C · ${hxFormatLimit(e.rule)}`;
        } else if (e.ok === false) {
            box.className = "hx-live-state alert";
            box.textContent = `⚠ ALERTE · ${Number(value).toLocaleString("fr-FR")} °C · attendu ${hxFormatLimit(e.rule)}`;
        } else {
            box.className = "hx-live-state review";
            box.textContent = "Référentiel pays à confirmer avant validation automatique.";
        }
    }

    function hxAdjust(delta) {
        const input = $hx("hx-temp");
        if (!input) return;
        const current = Number(String(input.value || "0").replace(",", "."));
        const next = Math.round((current + delta) * 10) / 10;
        input.value = String(next);
        hxSetLive(next);
    }

    function hxNext(step = 1) {
        if (!hxEquipment.length) return;
        // Une photo est toujours liée à l'équipement actuellement affiché.
        // Si l'utilisateur passe au suivant sans enregistrer, on retire la preuve
        // pour éviter qu'elle soit associée au mauvais matériel.
        try { window.ICHEF_TEMP_EVIDENCE?.clear?.(); } catch (_) {}
        hxIndex = (hxIndex + step + hxEquipment.length) % hxEquipment.length;
        hxRender();
    }

    async function hxSave({auto = false} = {}) {
        if (hxSaving) return;
        const current = hxCurrent();
        const input = $hx("hx-temp");
        const value = Number(String(input?.value || "").replace(",", "."));

        if (!current || !Number.isFinite(value)) {
            hxSetLive(null);
            input?.focus({preventScroll:true});
            return;
        }

        // Les champs historiques restent la source d'entrée de saveEntry().
        const eq = document.getElementById("temp-eq");
        const val = document.getElementById("temp-val");
        if (!eq || !val || typeof saveEntry !== "function") return;

        const evaluation = typeof evaluateTemperatureCompliance === "function"
            ? evaluateTemperatureCompliance(current.name, value)
            : null;

        hxSaving = true;
        const saveBtn = $hx("hx-save");
        const micBtn = $hx("hx-mic");
        if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = "ENREGISTREMENT…"; }
        if (micBtn) micBtn.disabled = true;

        try {
            eq.value = current.name;
            val.value = String(value);
            await saveEntry("temp");

            if (navigator.vibrate) navigator.vibrate(evaluation?.ok === false ? [80,60,80] : 55);

            $hx("hx-confirm").textContent =
                `${current.name} · ${value.toLocaleString("fr-FR")} °C · ${evaluation?.status || "ENREGISTRÉ"}`;

            // En cas d'alerte on ne saute pas automatiquement :
            // l'utilisateur voit le problème avant de poursuivre.
            if (evaluation?.ok === false) {
                hxSetLive(value);
            } else {
                hxNext(1);
            }
        } catch (err) {
            const box = $hx("hx-live-state");
            if (box) {
                box.className = "hx-live-state alert";
                box.textContent = err?.message || "Enregistrement non confirmé par le serveur.";
            }
        } finally {
            hxSaving = false;
            if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = "✓ ENREGISTRER"; }
            if (micBtn) micBtn.disabled = false;
        }
    }

    function hxWordsToInteger(text) {
        const units = {
            "zero":0,"un":1,"une":1,"deux":2,"trois":3,"quatre":4,"cinq":5,
            "six":6,"sept":7,"huit":8,"neuf":9,"dix":10,"onze":11,"douze":12,
            "treize":13,"quatorze":14,"quinze":15,"seize":16,
            "dix-sept":17,"dix-huit":18,"dix-neuf":19,"vingt":20
        };
        const clean = String(text || "")
            .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
            .toLowerCase().trim().replace(/\s+/g," ");

        if (units[clean] !== undefined) return units[clean];

        const m = clean.match(/^vingt[\s-](un|une|deux|trois|quatre|cinq|six|sept|huit|neuf)$/);
        if (m && units[m[1]] !== undefined) return 20 + units[m[1]];

        const d = clean.match(/^dix[\s-](sept|huit|neuf)$/);
        if (d) return {"sept":17,"huit":18,"neuf":19}[d[1]];

        return null;
    }

    function hxParseSpokenTemperature(transcript) {
        let raw = String(transcript || "")
            .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
            .toLowerCase()
            .replace(/°\s*c?/g,"")
            .replace(/\bdegres?\b/g,"")
            .trim();

        // Les navigateurs renvoient souvent directement "3,4" / "-18".
        const numeric = raw.match(/(-?\s*\d+(?:[.,]\d+)?)/);
        if (numeric) {
            const n = Number(numeric[1].replace(/\s/g,"").replace(",","."));
            if (Number.isFinite(n)) return n;
        }

        let negative = /\b(moins|negatif|negative)\b/.test(raw);
        raw = raw.replace(/\b(moins|negatif|negative)\b/g,"").trim();

        const parts = raw.split(/\b(?:virgule|point)\b/).map(x => x.trim()).filter(Boolean);
        const whole = hxWordsToInteger(parts[0]);
        if (whole === null) return null;

        let value = whole;
        if (parts[1]) {
            const decimalWord = hxWordsToInteger(parts[1]);
            if (decimalWord !== null) {
                const digits = String(decimalWord);
                value += Number("0." + digits);
            }
        }

        return negative ? -value : value;
    }

    function hxSetupVoice() {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        const btn = $hx("hx-mic");
        if (!btn) return;

        if (!SR) {
            btn.disabled = true;
            $hx("hx-mic-text").textContent = "VOCAL NON DISPONIBLE SUR CE NAVIGATEUR";
            return;
        }

        hxRecognition = new SR();
        hxRecognition.lang = "fr-FR";
        hxRecognition.continuous = false;
        hxRecognition.interimResults = false;
        hxRecognition.maxAlternatives = 3;

        hxRecognition.onstart = () => {
            btn.classList.add("listening");
            $hx("hx-mic-text").textContent = "ÉCOUTE… DITES PAR EXEMPLE « TROIS VIRGULE QUATRE »";
            if (navigator.vibrate) navigator.vibrate(25);
        };

        hxRecognition.onend = () => {
            btn.classList.remove("listening");
            $hx("hx-mic-text").textContent = "DIRE LA TEMPÉRATURE";
        };

        hxRecognition.onerror = event => {
            btn.classList.remove("listening");
            $hx("hx-mic-text").textContent = "DIRE LA TEMPÉRATURE";
            const box = $hx("hx-live-state");
            if (box) {
                box.className = "hx-live-state review";
                box.textContent = event.error === "not-allowed"
                    ? "Autorisez le microphone pour utiliser la saisie vocale."
                    : "Je n'ai pas compris. Réessayez ou saisissez la valeur.";
            }
        };

        hxRecognition.onresult = event => {
            clearTimeout(hxAutoTimer);
            const alternatives = [];
            for (let i = 0; i < event.results[0].length; i++) {
                alternatives.push(event.results[0][i].transcript);
            }

            let value = null;
            let transcript = alternatives[0] || "";
            for (const candidate of alternatives) {
                const parsed = hxParseSpokenTemperature(candidate);
                if (parsed !== null && Number.isFinite(parsed)) {
                    value = parsed;
                    transcript = candidate;
                    break;
                }
            }

            if (value === null) {
                const box = $hx("hx-live-state");
                box.className = "hx-live-state review";
                box.textContent = `Entendu : « ${transcript} » · température non reconnue.`;
                return;
            }

            $hx("hx-temp").value = String(value);
            hxSetLive(value);
            $hx("hx-confirm").textContent = `Vocal : « ${transcript} » · préparation enregistrement…`;

            if ($hx("hx-auto-save")?.checked) {
                const saveBtn = $hx("hx-save");
                if (saveBtn) saveBtn.textContent = "✓ ENREGISTREMENT DANS 0,1 s…";
                hxAutoTimer = setTimeout(() => hxSave({auto:true}), 100);
            }
        };

        btn.addEventListener("click", () => {
            clearTimeout(hxAutoTimer);
            try { hxRecognition.start(); } catch (_) {}
        });
    }

    function hxEnterExpress(force = false) {
        if (!hxIsPhone() && !force) return;
        if (hxFullMode && !force) return;

        // Toujours rendre Température seul actif avant d'ouvrir l'interface Express.
        // Pour un profil ADMIN global sans secteur, on garde le module Température
        // standard visible au lieu de laisser la touche sans réaction.
        document.querySelectorAll(".module").forEach(m => m.classList.remove("active"));
        document.getElementById("mod-temp")?.classList.add("active");
        if (typeof currentDept !== "undefined" && currentDept === "ADMIN") {
            document.body.classList.remove("haccp-express-mobile");
            return;
        }

        hxFullMode = false;
        hxEquipment = hxFlattenEquipment();
        hxIndex = Math.min(hxIndex, Math.max(0, hxEquipment.length - 1));
        document.body.classList.add("haccp-express-mobile");
        hxRender();
    }

    function hxExitExpress() {
        hxFullMode = true;
        document.body.classList.remove("haccp-express-mobile");
    }

    function hxWire() {
        $hx("hx-minus")?.addEventListener("click", () => hxAdjust(-0.1));
        $hx("hx-plus")?.addEventListener("click", () => hxAdjust(0.1));
        $hx("hx-prev")?.addEventListener("click", () => hxNext(-1));
        $hx("hx-next")?.addEventListener("click", () => hxNext(1));
        $hx("hx-save")?.addEventListener("click", () => {
            clearTimeout(hxAutoTimer);
            hxSave({auto:false});
        });
        $hx("hx-full-mode")?.addEventListener("click", hxExitExpress);
        $hx("hx-temp")?.addEventListener("input", e => {
            clearTimeout(hxAutoTimer);
            hxSetLive(Number(String(e.target.value || "").replace(",", ".")));
        });
        $hx("hx-temp")?.addEventListener("keydown", e => {
            if (e.key === "Enter") {
                e.preventDefault();
                clearTimeout(hxAutoTimer);
                hxSave({auto:false});
            }
        });
        hxSetupVoice();
    }

    function hxObserveLogin() {
        const login = document.getElementById("login-screen");
        if (!login) return;
        new MutationObserver(() => {
            const hidden = login.style.display === "none";
            if (hidden && window.ICHEF_HACCP?.authenticated) {
                // Laisse loadData() appliquer d'abord le profil réglementaire.
                setTimeout(() => hxEnterExpress(false), 120);
            }
        }).observe(login, {attributes:true, attributeFilter:["style"]});
    }

    function hxBoot() {
        hxWire();
        hxObserveLogin();

        // Cas retour PWA / session déjà affichée.
        if (window.ICHEF_HACCP?.authenticated && document.getElementById("login-screen")?.style.display === "none") {
            setTimeout(() => hxEnterExpress(false), 120);
        }

        window.addEventListener("resize", () => {
            if (!hxFullMode && hxIsPhone() && window.ICHEF_HACCP?.authenticated) hxEnterExpress(false);
            if (!hxIsPhone()) document.body.classList.remove("haccp-express-mobile");
        }, {passive:true});

        // API interne utile depuis chef.html si l'URL contient ?express=1.
        const params = new URLSearchParams(location.search);
        if (params.get("express") === "1") hxFullMode = false;
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", hxBoot, {once:true});
    } else {
        hxBoot();
    }
})();
</script>


<style id="ichef-haccp-light-white-black-grey-v1">
/* ==========================================================
   iCHEF HACCP — THÈME CLAIR GLOBAL
   Fond blanc · Texte noir · Cadres gris
   UI uniquement : aucune logique métier / API / PIN modifiée
   ========================================================== */

:root{
  --bg:#ffffff !important;
  --panel:#ffffff !important;
  --panel-2:#ffffff !important;
  --border-pro:#d1d5db !important;
  --border-soft:#e5e7eb !important;
  --text-main:#111111 !important;
  --text-muted-pro:#5f6368 !important;
  --gold:#111111 !important;
  --accent:#111111 !important;
  --alert:#111111 !important;
  --ordered:#111111 !important;
}

html,
body{
  background:#ffffff !important;
  color:#111111 !important;
}

/* Navigation */
.nav-haccp{
  background:#ffffff !important;
  border-bottom:1px solid #cfd4d8 !important;
  box-shadow:none !important;
  backdrop-filter:none !important;
  -webkit-backdrop-filter:none !important;
}
.haccp-brand-mini,
.nav-btn,
.pad-link,
.sync-pill,
.reg-profile-pill,
.system-hub-btn{
  background:#ffffff !important;
  color:#111111 !important;
  border-color:#cfd4d8 !important;
  box-shadow:none !important;
}
.nav-btn.active,
.nav-btn:hover,
.pad-link:hover{
  background:#f3f4f5 !important;
  color:#111111 !important;
  border-color:#9ca3af !important;
}
.haccp-brand-mini span{
  color:#111111 !important;
}

/* Contenu / cartes */
.content,
.module,
.inventory-pro-shell{
  background:#ffffff !important;
  color:#111111 !important;
}
.card,
.inventory-kpi,
.inv-mini,
.system-link-card,
.inventory-system-note,
.regulatory-banner{
  background:#ffffff !important;
  background-image:none !important;
  color:#111111 !important;
  border-color:#d1d5db !important;
  box-shadow:none !important;
}

.card h1,
.card h2,
.card h3,
.inventory-pro-title,
.inventory-kpi-value,
.inv-mini-value,
.inv-product-name,
.system-link-value,
.regulatory-banner-title{
  color:#111111 !important;
}

.inventory-pro-subtitle,
.inventory-kpi-label,
.inventory-kpi-note,
.inv-mini-label,
.inv-product-meta,
.system-link-label,
.regulatory-banner-text,
.regulatory-banner-authority{
  color:#5f6368 !important;
}

/* Champs */
input,
select,
textarea{
  background:#ffffff !important;
  color:#111111 !important;
  border:1px solid #bfc5ca !important;
  box-shadow:none !important;
}
input::placeholder,
textarea::placeholder{
  color:#7b8186 !important;
}
input:focus,
select:focus,
textarea:focus{
  border-color:#6b7280 !important;
  box-shadow:0 0 0 2px rgba(107,114,128,.12) !important;
  outline:none !important;
}

/* Boutons */
button,
.btn-empire,
.btn-catalog,
.btn-backup,
.btn-rectify,
.btn-clear,
.btn-file,
.btn-view-photo,
.inventory-secondary-btn,
.inventory-kpi-sheet-go{
  background:#ffffff !important;
  color:#111111 !important;
  border-color:#bfc5ca !important;
  box-shadow:none !important;
}
button:hover,
.btn-empire:hover,
.btn-catalog:hover,
.btn-backup:hover,
.btn-rectify:hover,
.btn-file:hover,
.btn-view-photo:hover,
.inventory-secondary-btn:hover,
.inventory-kpi-sheet-go:hover{
  background:#f3f4f5 !important;
  color:#111111 !important;
  border-color:#8f969c !important;
}
.btn-empire:active,
.btn-catalog:active,
.btn-clear:active{
  background:#eceff1 !important;
  color:#111111 !important;
}

/* Tableaux */
table{
  background:#ffffff !important;
  color:#111111 !important;
}
thead th{
  background:#f5f6f7 !important;
  color:#111111 !important;
  border-bottom:1px solid #cfd4d8 !important;
}
tbody td{
  color:#111111 !important;
  border-bottom:1px solid #e1e4e7 !important;
  background:#ffffff !important;
}
tbody tr:hover td{
  background:#f8f9fa !important;
}
.inventory-table-wrap{
  border-color:#d1d5db !important;
  background:#ffffff !important;
}
.inventory-table-wrap th:first-child,
.inventory-table-wrap td:first-child{
  background:#ffffff !important;
  box-shadow:5px 0 10px rgba(0,0,0,.05) !important;
}
.inventory-table-wrap th:first-child{
  background:#f5f6f7 !important;
}

/* Statuts : monochrome clair */
.status-badge,
.status-ok,
.status-danger,
.regulatory-country-chip,
.reg-profile-pill.fr,
.reg-profile-pill.ch,
.reg-profile-pill.eu,
.reg-profile-pill.intl{
  color:#111111 !important;
  background:#f5f6f7 !important;
  border-color:#bfc5ca !important;
}

/* Login / PIN HACCP */
#login-screen{
  background:#ffffff !important;
  color:#111111 !important;
}
.logo-container,
.ichef-title,
.ichef-subtitle,
#login-instruction,
.login-reg-profile{
  color:#111111 !important;
}
.login-reg-profile{
  background:#ffffff !important;
  border-color:#d1d5db !important;
}
.dept-choice-btn,
.pin-btn{
  background:#ffffff !important;
  color:#111111 !important;
  border-color:#bfc5ca !important;
}
.pin-display{
  color:#111111 !important;
}
.dept-choice-btn.cuisine,
.dept-choice-btn.patisserie,
.dept-choice-btn.bar,
.dept-choice-btn.service,
.dept-choice-btn.admin{
  color:#111111 !important;
  border-color:#9ca3af !important;
}

/* Catalogues / modales */
.modal{
  background:rgba(255,255,255,.96) !important;
}
.catalog-box,
.inventory-kpi-sheet-card{
  background:#ffffff !important;
  background-image:none !important;
  color:#111111 !important;
  border-color:#cfd4d8 !important;
  box-shadow:0 18px 48px rgba(0,0,0,.10) !important;
}
.catalog-folder-title,
.catalog-item,
.folder-admin-actions button,
.inventory-kpi-sheet-close{
  background:#ffffff !important;
  color:#111111 !important;
  border-color:#cfd4d8 !important;
}
.catalog-folder-title:hover,
.catalog-item:hover{
  background:#f3f4f5 !important;
}

/* Archives */
.archive-folder,
.archive-folder.active{
  background:#ffffff !important;
  color:#111111 !important;
  border-color:#d1d5db !important;
}
.archive-folder.active{
  border-left-color:#6b7280 !important;
}

/* Marqueurs build */
#ichef-haccp-v41-build,
#ichef-v53-build{
  background:#ffffff !important;
  color:#111111 !important;
  border-color:#bfc5ca !important;
  box-shadow:none !important;
}

/* ==========================================================
   HACCP EXPRESS MOBILE — même thème blanc/noir/gris
   ========================================================== */
@media(max-width:1100px){
  body.haccp-express-mobile{
    background:#ffffff !important;
    color:#111111 !important;
  }

  .haccp-express-temp{
    background:#ffffff !important;
    color:#111111 !important;
  }

  .hx-brand strong,
  #hx-equipment{
    color:#111111 !important;
  }
  .hx-brand small,
  .hx-kicker,
  .hx-rule,
  .hx-confirm{
    color:#5f6368 !important;
  }

  .hx-full-mode,
  .hx-adjust,
  .hx-live-state,
  .hx-mic,
  .hx-save,
  .hx-nav button{
    background:#ffffff !important;
    color:#111111 !important;
    border-color:#bfc5ca !important;
    box-shadow:none !important;
  }

  .hx-temp-input-wrap{
    background:#ffffff !important;
    border-color:#bfc5ca !important;
    box-shadow:none !important;
  }
  #hx-temp{
    color:#111111 !important;
    background:#ffffff !important;
  }
  .hx-temp-input-wrap b{
    color:#5f6368 !important;
  }

  .hx-live-state.ok,
  .hx-live-state.alert,
  .hx-live-state.review{
    background:#f5f6f7 !important;
    color:#111111 !important;
    border-color:#bfc5ca !important;
  }

  .hx-progress-track{
    background:#e5e7eb !important;
  }
  .hx-progress-track i{
    background:#6b7280 !important;
  }

  .hx-mic.listening{
    background:#f3f4f5 !important;
    color:#111111 !important;
    border-color:#8f969c !important;
  }

  .hx-save{
    font-weight:950 !important;
  }
}

/* Impression reste noire sur blanc */
@media print{
  body,
  #print-report{
    background:#ffffff !important;
    color:#000000 !important;
  }
}
</style>


<style id="ichef-haccp-desktop-temperature-hub-v61">
.hd-temp-hub{display:none}
@media(min-width:1101px){
  #mod-temp.active{display:flex!important;flex-direction:column!important;gap:12px!important;min-height:0!important}
  #mod-temp>.hd-legacy-temp-card{display:none!important}
  .hd-temp-hub{display:flex;flex-direction:column;gap:12px;color:#111;background:#fff}
  .hd-temp-head{display:flex;align-items:flex-start;justify-content:space-between;gap:20px;padding:14px 16px;border:1px solid #d1d5db;border-radius:14px;background:#fff}
  .hd-temp-kicker{color:#666;font-size:.58rem;font-weight:900;letter-spacing:1.2px;text-transform:uppercase}
  .hd-temp-head h1{margin:4px 0 0;color:#111;font-size:1.4rem;line-height:1.1}
  .hd-temp-head p{margin:5px 0 0;color:#666;font-size:.70rem}
  .hd-temp-head-actions{display:flex;align-items:center;justify-content:flex-end;gap:7px;flex-wrap:wrap}
  .hd-chip{display:inline-flex;align-items:center;min-height:34px;padding:0 11px;border:1px solid #c8cdd1;border-radius:999px;background:#f7f7f7;color:#333;font-size:.58rem;font-weight:900;white-space:nowrap}
  .hd-btn{min-height:36px!important;width:auto!important;padding:8px 12px!important;border-radius:9px!important;font-size:.62rem!important;font-weight:900!important;letter-spacing:.35px!important}
  .hd-btn.primary{background:#111!important;color:#fff!important;border:1px solid #111!important}
  .hd-btn.secondary{background:#fff!important;color:#111!important;border:1px solid #c8cdd1!important}
  .hd-btn:disabled{opacity:.45!important;cursor:not-allowed!important}
  .hd-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px}
  .hd-kpi{min-width:0;min-height:78px;padding:11px 13px;display:grid!important;grid-template-columns:1fr auto;grid-template-rows:auto 1fr;align-items:center;text-align:left;border:1px solid #d1d5db!important;border-radius:12px!important;background:#fff!important;color:#111!important}
  .hd-kpi span{color:#666;font-size:.56rem;font-weight:900;letter-spacing:.75px}.hd-kpi strong{grid-row:1/3;grid-column:2;color:#111;font-size:1.45rem;line-height:1}.hd-kpi small{color:#8a8a8a;font-size:.57rem}.hd-kpi:hover{background:#f5f5f5!important}
  .hd-temp-layout{display:grid;grid-template-columns:minmax(330px,.9fr) minmax(430px,1.35fr);gap:12px;min-height:450px}
  .hd-parc-panel,.hd-reading-panel{min-width:0;border:1px solid #d1d5db;border-radius:14px;background:#fff}
  .hd-parc-panel{padding:13px;overflow:auto;max-height:58vh}
  .hd-panel-title-row{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;padding-bottom:10px;border-bottom:1px solid #e5e7eb}
  .hd-panel-title-row h2{margin:0;color:#111;font-size:.82rem}.hd-panel-title-row p{margin:4px 0 0;color:#777;font-size:.60rem}
  .hd-icon-btn{width:36px!important;height:36px!important;min-height:36px!important;padding:0!important;border:1px solid #c8cdd1!important;border-radius:9px!important;background:#fff!important;color:#111!important;font-size:1rem!important}
  .hd-equipment-groups{display:flex;flex-direction:column;gap:10px;margin-top:11px}.hd-eq-group{border:1px solid #e0e3e5;border-radius:11px;overflow:hidden;background:#fff}
  .hd-eq-group-title{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:8px 10px;background:#f5f6f7;border-bottom:1px solid #e2e5e7;color:#333;font-size:.59rem;font-weight:900;text-transform:uppercase;letter-spacing:.55px}
  .hd-eq-group-title b{display:grid;place-items:center;min-width:22px;height:22px;border:1px solid #d0d4d7;border-radius:999px;background:#fff;font-size:.58rem}
  .hd-eq-items{display:flex;flex-direction:column}
  .hd-eq-item{width:100%!important;min-height:54px!important;padding:8px 9px!important;display:grid!important;grid-template-columns:8px minmax(0,1fr) auto!important;align-items:center!important;gap:9px!important;border:0!important;border-bottom:1px solid #eceeef!important;border-radius:0!important;background:#fff!important;color:#111!important;text-align:left!important}
  .hd-eq-item:last-child{border-bottom:0!important}.hd-eq-item:hover,.hd-eq-item.selected{background:#f5f6f7!important}
  .hd-eq-dot{width:8px;height:8px;border-radius:999px;background:#a6adb2}.hd-eq-item.ok .hd-eq-dot{background:#4f6b5c}.hd-eq-item.alert .hd-eq-dot{background:#8c5454}
  .hd-eq-main{min-width:0}.hd-eq-main b{display:block;color:#111;font-size:.68rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.hd-eq-main small{display:block;margin-top:3px;color:#7b7f82;font-size:.56rem}.hd-eq-state{color:#666;font-size:.53rem;font-weight:900}
  .hd-eq-empty{width:100%!important;min-height:40px!important;border:0!important;background:#fff!important;color:#777!important;font-size:.58rem!important}.hd-parc-empty{padding:24px;text-align:center;color:#777;font-size:.68rem}
  .hd-reading-panel{padding:18px;display:flex;min-height:0}.hd-reading-empty{margin:auto;max-width:430px;text-align:center}.hd-reading-empty-mark{width:72px;height:72px;margin:0 auto 14px;display:grid;place-items:center;border:1px solid #d1d5db;border-radius:18px;color:#555;font-size:.60rem;font-weight:900;letter-spacing:1px}
  .hd-reading-empty h2{margin:0;color:#111;font-size:1.05rem}.hd-reading-empty p{margin:7px 0 0;color:#777;font-size:.68rem;line-height:1.5}
  .hd-reading-view{width:100%;display:flex;flex-direction:column;gap:13px;min-width:0}.hd-reading-view[hidden]{display:none!important}
  .hd-reading-topline{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;padding-bottom:11px;border-bottom:1px solid #e5e7eb}.hd-reading-category{color:#777;font-size:.56rem;font-weight:900;letter-spacing:.85px;text-transform:uppercase}.hd-reading-topline h2{margin:4px 0 0;color:#111;font-size:1.25rem}
  .hd-status{display:inline-flex;align-items:center;min-height:30px;padding:0 10px;border:1px solid #c8cdd1;border-radius:999px;background:#f7f7f7;color:#555;font-size:.56rem;font-weight:900;white-space:nowrap}.hd-status.ok{background:#edf2ef;color:#31493b;border-color:#b8c8bd}.hd-status.alert{background:#f4eded;color:#6c3535;border-color:#d9bcbc}
  .hd-rule-box{display:flex;flex-direction:column;gap:4px;padding:10px 12px;border:1px solid #d7dbde;border-radius:10px;background:#f7f8f8}.hd-rule-box strong{color:#111;font-size:.68rem}.hd-rule-box span{color:#666;font-size:.58rem;line-height:1.45}
  .hd-reading-input-row{display:grid;grid-template-columns:minmax(0,1fr) 160px;gap:12px;align-items:end}.hd-reading-input-row label>span,.hd-cooling-form label>span{display:block;margin-bottom:6px;color:#666;font-size:.56rem;font-weight:900;letter-spacing:.7px}
  .hd-big-temp{height:110px;display:flex;align-items:center;position:relative;border:1px solid #bfc5ca;border-radius:14px;background:#fff}.hd-big-temp input{width:100%!important;height:100%!important;padding:0 65px 0 16px!important;border:0!important;background:#fff!important;color:#111!important;text-align:center!important;font-size:3.4rem!important;font-weight:900!important;box-shadow:none!important}.hd-big-temp b{position:absolute;right:20px;color:#666;font-size:1.1rem}
  .hd-save-reading{height:110px!important;border:1px solid #111!important;border-radius:14px!important;background:#111!important;color:#fff!important;font-size:.72rem!important;font-weight:900!important}
  .hd-compliance{min-height:40px;display:flex;align-items:center;justify-content:center;padding:8px 12px;box-sizing:border-box;border:1px solid #d1d5db;border-radius:10px;background:#f7f7f7;color:#555;font-size:.67rem;font-weight:900}.hd-compliance.ok{background:#edf2ef;color:#31493b;border-color:#b8c8bd}.hd-compliance.alert{background:#f4eded;color:#6c3535;border-color:#d9bcbc}.hd-compliance.review{background:#f4f2ec;color:#655a3e;border-color:#d9d0b9}
  .hd-reading-meta{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.hd-reading-meta>div,.hd-cycle-clock>div{padding:9px 10px;border:1px solid #e0e3e5;border-radius:9px;background:#fff}.hd-reading-meta span,.hd-cycle-clock span{display:block;color:#888;font-size:.52rem;font-weight:900;letter-spacing:.55px}.hd-reading-meta strong,.hd-cycle-clock strong{display:block;margin-top:4px;color:#111;font-size:.69rem}
  .hd-round-actions{margin-top:auto;display:grid;grid-template-columns:1fr 1fr;gap:8px}.hd-round-actions button{min-height:38px!important;border:1px solid #c8cdd1!important;border-radius:9px!important;background:#fff!important;color:#111!important;font-size:.58rem!important;font-weight:900!important}
  .hd-cooling-form{display:grid;grid-template-columns:1fr 1fr;gap:10px}.hd-cooling-form .wide{grid-column:1/-1}.hd-inline-temp{position:relative}.hd-inline-temp input{padding-right:44px!important}.hd-inline-temp b{position:absolute;right:14px;top:50%;transform:translateY(-50%);color:#666;font-size:.72rem}.hd-cycle-clock{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.hd-cooling-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px}
  .hd-equipment-creator{padding:14px;border:1px solid #cfd4d8;border-radius:13px;background:#f8f9f9}.hd-equipment-creator[hidden]{display:none!important}.hd-creator-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.hd-creator-head h2{margin:3px 0 0;color:#111;font-size:.95rem}
  .hd-creator-grid{display:grid;grid-template-columns:minmax(180px,.8fr) minmax(260px,1.5fr) auto;gap:9px;align-items:end;margin-top:12px}.hd-creator-grid label>span{display:block;margin-bottom:5px;color:#666;font-size:.54rem;font-weight:900;letter-spacing:.6px}.hd-equipment-creator p{margin:8px 0 0;color:#777;font-size:.58rem}
  .hd-temp-history-card{border:1px solid #d1d5db!important;border-radius:13px!important;max-height:300px;min-height:150px}
  @media(max-width:1120px){.hd-temp-layout{grid-template-columns:minmax(300px,.85fr) minmax(390px,1.15fr)}.hd-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.hd-temp-head{flex-direction:column}.hd-temp-head-actions{justify-content:flex-start}.hd-creator-grid{grid-template-columns:1fr 1fr}.hd-creator-grid .hd-btn{grid-column:1/-1}}
}
@media(max-width:1100px){.hd-temp-hub{display:none!important}}
</style>


<script id="ichef-haccp-desktop-temperature-wire-v61">
(() => {
  "use strict";
  let intervalId = null;
  function bootDesktopTempHub(){
    const input=document.getElementById("hd-temp-value");
    if(input&&!input.dataset.hdWired){
      input.dataset.hdWired="1";
      input.addEventListener("input",()=>{try{updateDesktopCompliancePreview()}catch(_){}});
      input.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();saveDesktopTemperatureReading()}});
    }
    if(!intervalId){
      intervalId=setInterval(()=>{try{
        if(window.matchMedia("(min-width:821px)").matches&&desktopTempSelected?.kind==="COOLING"&&!document.getElementById("hd-cooling-reading")?.hidden)renderCoolingCycleState();
      }catch(_){}},30000);
    }
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",bootDesktopTempHub,{once:true});else bootDesktopTempHub();
})();
</script>


<script id="ichef-haccp-staff-sso-boot-v1">
(() => {
    "use strict";
    const start = () => {
        try {
            if (typeof scheduleHaccpStaffSessionResume === "function") {
                scheduleHaccpStaffSessionResume();
            }
        } catch (error) {
            console.warn("[iCHEF HACCP] Staff session boot", error);
        }
    };

    // V250 : la connexion initiale est déjà prise en charge par le boot
    // principal. Éviter les tentatives concurrentes au chargement.
    // pageshow sert uniquement à la restauration depuis le cache navigateur.
    window.addEventListener("pageshow", (event) => {
        if (!event.persisted) return;
        try {
            if (!window.ICHEF_HACCP?.authenticated &&
                typeof scheduleHaccpStaffSessionResume === "function") {
                scheduleHaccpStaffSessionResume();
            }
        } catch (_) {}
    });
})();
</script>


<script id="ichef-haccp-sector-return-v1">
(() => {
    "use strict";
    const sync = () => {
        try {
            if (typeof updateHaccpSectorReturnButton === "function") {
                updateHaccpSectorReturnButton();
            }
        } catch (_) {}
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", sync, { once:true });
    } else {
        sync();
    }
    window.addEventListener("pageshow", sync);
})();
</script>


<style id="ichef-haccp-sector-navigation-v1">
.haccp-sector-nav-core{
    display:flex !important;
    align-items:center !important;
    gap:10px !important;
    flex-wrap:nowrap !important;
}

.haccp-sector-return-btn{
    min-height:36px !important;
    padding:7px 13px !important;
    border:1px solid #bfc5ca !important;
    border-radius:9px !important;
    background:#ffffff !important;
    color:#111111 !important;
    font-size:.64rem !important;
    font-weight:900 !important;
    letter-spacing:.35px !important;
    white-space:nowrap !important;
}

.haccp-sector-return-btn:hover{
    background:#f3f4f5 !important;
    border-color:#8f969c !important;
    color:#111111 !important;
}

.system-hub-btn,
.pad-link,
#ichef-universal-home-btn{
    display:none !important;
}

@media(max-width:1100px){
    .haccp-sector-return-btn{
        min-height:34px !important;
        padding:6px 10px !important;
        font-size:.58rem !important;
    }
}
</style>


<style id="ichef-haccp-temperature-fast-100ms-v1">
@media(max-width:1100px){
    #hx-temp,
    #hx-save,
    #hx-mic,
    .hx-adjust{
        touch-action:manipulation !important;
    }

    #hx-save,
    #hx-mic,
    .hx-adjust{
        transition:none !important;
        animation:none !important;
    }
}
</style>


<style id="ichef-haccp-grey-frames-v2">
/* Cadres légèrement plus gris pour mieux les distinguer du fond blanc */
.card,
.inventory-kpi,
.inv-mini,
.system-link-card,
.inventory-system-note,
.regulatory-banner,
.hd-temp-head,
.hd-parc-panel,
.hd-reading-panel,
.hd-equipment-creator,
.hd-temp-history-card,
.hd-eq-group,
.hd-rule-box,
.hd-reading-meta > div,
.hd-cycle-clock > div,
.hd-big-temp,
.hd-status,
.hd-compliance,
input,
select,
textarea,
button,
.btn-empire,
.btn-catalog,
.btn-backup,
.btn-rectify,
.btn-clear,
.btn-file,
.btn-view-photo,
.inventory-secondary-btn,
.inventory-kpi-sheet-go {
    border-color:#aeb4b9 !important;
}

/* Les blocs secondaires gagnent un léger gris de fond */
.hd-eq-group-title,
thead th,
.hd-rule-box,
.hd-chip,
.hd-status,
.hd-compliance,
.inventory-kpi,
.inv-mini {
    background:#f1f2f3 !important;
}

/* Séparateurs plus lisibles */
tbody td,
.hd-panel-title-row,
.hd-reading-topline,
.hd-eq-item {
    border-color:#c6cbd0 !important;
}

/* HACCP Express mobile */
@media(max-width:1100px){
    .hx-temp-input-wrap,
    .hx-live-state,
    .hx-mic,
    .hx-save,
    .hx-adjust,
    .hx-nav button,
    .hx-full-mode {
        border-color:#aeb4b9 !important;
    }

    .hx-live-state,
    .hx-nav button,
    .hx-full-mode {
        background:#f1f2f3 !important;
    }
}
</style>


<script id="ichef-haccp-cleaning-express-mobile-v1">
(() => {
    "use strict";

    let hcleanItems = [];
    let hcleanIndex = 0;
    let hcleanSaving = false;
    let hcleanFullMode = false;

    const $c = id => document.getElementById(id);

    function hcleanIsPhone() {
        return typeof haccpIsPhoneMode === "function"
            ? haccpIsPhoneMode()
            : window.matchMedia("(max-width:1100px)").matches;
    }

    function hcleanFlattenPlan() {
        const groups = (typeof EMPIRE_LISTS !== "undefined" && EMPIRE_LISTS?.[currentDept]?.clean) || {};
        const list = [];

        Object.entries(groups).forEach(([category, items]) => {
            (Array.isArray(items) ? items : []).forEach(zone => {
                if (!zone) return;
                if (!list.some(x => x.zone === zone)) {
                    list.push({ zone, category });
                }
            });
        });

        return list;
    }

    function hcleanTodayLog(zone) {
        const today = new Date().toLocaleDateString("fr-FR");
        return (db.cleaning || []).find(x =>
            x.dept === currentDept &&
            x.zone === zone &&
            !x.originalId &&
            x.date === today
        ) || null;
    }

    function hcleanDoneCount() {
        return hcleanItems.filter(item => !!hcleanTodayLog(item.zone)).length;
    }

    function hcleanFindFirstPending() {
        const idx = hcleanItems.findIndex(item => !hcleanTodayLog(item.zone));
        return idx >= 0 ? idx : 0;
    }

    function hcleanCurrent() {
        return hcleanItems[hcleanIndex] || null;
    }

    function hcleanRender() {
        const item = hcleanCurrent();
        const zone = $c("hclean-zone");
        const category = $c("hclean-category");
        const progressText = $c("hclean-progress-text");
        const progressBar = $c("hclean-progress-bar");
        const doneText = $c("hclean-done-text");
        const last = $c("hclean-last");
        const user = $c("hclean-user");

        if (user) {
            user.textContent = `${currentUser?.name || "Collaborateur"} · ${currentDept || "Secteur"}`;
        }
        if ($c("hclean-sector")) {
            $c("hclean-sector").textContent = currentDept || "Secteur";
        }

        const total = hcleanItems.length;
        const done = hcleanDoneCount();

        if (progressText) progressText.textContent = total ? `${hcleanIndex + 1} / ${total}` : "0 / 0";
        if (doneText) doneText.textContent = `${done} fait${done > 1 ? "s" : ""}`;
        if (progressBar) progressBar.style.width = total ? `${(done / total) * 100}%` : "0%";

        if (!item) {
            if (zone) zone.textContent = "Aucune zone configurée";
            if (category) category.textContent = "PLAN DE NETTOYAGE";
            if (last) last.textContent = "Ajoutez les zones dans le catalogue HACCP.";
            hcleanDisableActions(true);
            return;
        }

        hcleanDisableActions(false);
        if (zone) zone.textContent = item.zone;
        if (category) category.textContent = item.category || "PLAN DE NETTOYAGE";

        const log = hcleanTodayLog(item.zone);
        if (last) {
            if (!log) {
                last.className = "hclean-last";
                last.textContent = "À contrôler aujourd’hui";
            } else if (log.status === "CONFORME") {
                last.className = "hclean-last ok";
                last.textContent = `✓ Déjà conforme aujourd’hui · ${log.time || ""}`;
            } else {
                last.className = "hclean-last alert";
                last.textContent = `⚠ Non conforme aujourd’hui · ${log.time || ""}`;
            }
        }

        hcleanCloseCorrective();
        const feedback = $c("hclean-feedback");
        if (feedback) feedback.textContent = "Touchez simplement le résultat du contrôle.";
    }

    function hcleanDisableActions(disabled) {
        ["hclean-conform","hclean-nonconform","hclean-prev","hclean-next"].forEach(id => {
            const el = $c(id);
            if (el) el.disabled = !!disabled;
        });
    }

    function hcleanOpenCorrective() {
        const box = $c("hclean-corrective-box");
        if (box) box.hidden = false;
        const input = $c("hclean-corrective");
        if (input) {
            input.value = "";
            setTimeout(() => input.focus({preventScroll:true}), 20);
        }
    }

    function hcleanCloseCorrective() {
        const box = $c("hclean-corrective-box");
        if (box) box.hidden = true;
        const input = $c("hclean-corrective");
        if (input) input.value = "";
    }

    function hcleanNextPending() {
        if (!hcleanItems.length) return;

        // Cherche d'abord le prochain élément non contrôlé aujourd'hui.
        for (let step = 1; step <= hcleanItems.length; step++) {
            const idx = (hcleanIndex + step) % hcleanItems.length;
            if (!hcleanTodayLog(hcleanItems[idx].zone)) {
                hcleanIndex = idx;
                hcleanRender();
                return;
            }
        }

        // Tournée terminée : reste sur le suivant logique.
        hcleanIndex = (hcleanIndex + 1) % hcleanItems.length;
        hcleanRender();

        const feedback = $c("hclean-feedback");
        if (feedback) {
            feedback.className = "hclean-feedback ok";
            feedback.textContent = "✓ Tournée de nettoyage terminée pour aujourd’hui.";
        }
    }

    function hcleanMove(delta) {
        if (!hcleanItems.length) return;
        hcleanIndex = (hcleanIndex + delta + hcleanItems.length) % hcleanItems.length;
        hcleanRender();
    }

    async function hcleanSave(status, corrective = "") {
        if (hcleanSaving) return;

        const item = hcleanCurrent();
        if (!item) return;

        if (status === "NON CONFORME" && !String(corrective || "").trim()) {
            const input = $c("hclean-corrective");
            input?.focus({preventScroll:true});
            return;
        }

        const zoneLegacy = document.getElementById("clean-zone");
        const statusLegacy = document.getElementById("clean-status");
        const obsLegacy = document.getElementById("clean-obs");

        if (!zoneLegacy || !statusLegacy || !obsLegacy || typeof saveEntry !== "function") return;

        hcleanSaving = true;
        hcleanDisableActions(true);

        const feedback = $c("hclean-feedback");
        if (feedback) {
            feedback.className = "hclean-feedback saving";
            feedback.textContent = "Enregistrement…";
        }

        try {
            zoneLegacy.value = item.zone;
            statusLegacy.value = status;
            obsLegacy.value = status === "NON CONFORME" ? String(corrective).trim() : "";
            toggleCleanObs();

            await saveEntry("cleaning");

            if (navigator.vibrate) {
                navigator.vibrate(status === "CONFORME" ? 35 : [70,45,70]);
            }

            if (feedback) {
                feedback.className = status === "CONFORME" ? "hclean-feedback ok" : "hclean-feedback alert";
                feedback.textContent = status === "CONFORME"
                    ? `✓ ${item.zone} · conforme`
                    : `⚠ ${item.zone} · anomalie enregistrée`;
            }

            // Transition presque immédiate, tout en laissant le feedback apparaître.
            setTimeout(() => hcleanNextPending(), 100);
        } catch (error) {
            if (feedback) {
                feedback.className = "hclean-feedback alert";
                feedback.textContent = error?.message || "Enregistrement non confirmé.";
            }
        } finally {
            hcleanSaving = false;
            hcleanDisableActions(false);
        }
    }

    function hcleanEnterExpress(force = false) {
        if (!hcleanIsPhone() && !force) return;
        if (hcleanFullMode && !force) return;
        if (typeof currentDept !== "undefined" && currentDept === "ADMIN") return;

        document.body.classList.remove("haccp-express-mobile");
        document.body.classList.add("haccp-cleaning-express-mobile");

        hcleanItems = hcleanFlattenPlan();
        hcleanIndex = Math.min(hcleanFindFirstPending(), Math.max(0, hcleanItems.length - 1));

        document.querySelectorAll(".module").forEach(m => m.classList.remove("active"));
        document.getElementById("mod-cleaning")?.classList.add("active");

        hcleanRender();
    }

    function hcleanExitExpress() {
        hcleanFullMode = true;
        document.body.classList.remove("haccp-cleaning-express-mobile");
        document.querySelectorAll(".module").forEach(m => m.classList.remove("active"));
        document.getElementById("mod-cleaning")?.classList.add("active");
    }

    function hcleanWire() {
        $c("hclean-conform")?.addEventListener("click", () => hcleanSave("CONFORME"));
        $c("hclean-nonconform")?.addEventListener("click", hcleanOpenCorrective);
        $c("hclean-cancel-corrective")?.addEventListener("click", hcleanCloseCorrective);
        $c("hclean-save-nonconform")?.addEventListener("click", () => {
            hcleanSave("NON CONFORME", $c("hclean-corrective")?.value || "");
        });

        $c("hclean-prev")?.addEventListener("click", () => hcleanMove(-1));
        $c("hclean-next")?.addEventListener("click", () => hcleanMove(1));
        $c("hclean-full-mode")?.addEventListener("click", hcleanExitExpress);

        $c("hclean-to-temp")?.addEventListener("click", () => {
            document.body.classList.remove("haccp-cleaning-express-mobile");
            document.querySelectorAll(".module").forEach(m => m.classList.remove("active"));
            document.getElementById("mod-temp")?.classList.add("active");
            if (typeof hxEnterExpress === "function") hxEnterExpress(true);
        });

        document.getElementById("hx-cleaning-jump")?.addEventListener("click", () => {
            hcleanFullMode = false;
            hcleanEnterExpress(true);
        });
    }

    // Exposé volontairement pour showModule().
    window.hcleanEnterExpress = hcleanEnterExpress;
    window.hcleanExitExpress = hcleanExitExpress;

    function hcleanBoot() {
        hcleanWire();

        // Si l'utilisateur revient sur Nettoyage alors que la session est déjà ouverte.
        window.addEventListener("pageshow", () => {
            if (
                hcleanIsPhone() &&
                window.ICHEF_HACCP?.authenticated &&
                document.getElementById("mod-cleaning")?.classList.contains("active") &&
                !hcleanFullMode
            ) {
                hcleanEnterExpress(false);
            }
        });

        window.addEventListener("resize", () => {
            if (!hcleanIsPhone()) {
                document.body.classList.remove("haccp-cleaning-express-mobile");
            }
        }, {passive:true});
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", hcleanBoot, {once:true});
    } else {
        hcleanBoot();
    }
})();
</script>


<style id="ichef-haccp-cleaning-express-mobile-v1-style">
.hclean-express{display:none}

.hx-top-actions{
    display:flex;
    align-items:center;
    gap:6px;
}

@media(max-width:1100px){
    body.haccp-cleaning-express-mobile{
        height:100dvh !important;
        min-height:100dvh !important;
        overflow:hidden !important;
        background:#ffffff !important;
        color:#111111 !important;
    }

    body.haccp-cleaning-express-mobile .nav-haccp,
    body.haccp-cleaning-express-mobile #haccp-regulatory-banner,
    body.haccp-cleaning-express-mobile #ichef-system-link-panel,
    body.haccp-cleaning-express-mobile #ichef-haccp-v41-build,
    body.haccp-cleaning-express-mobile #ichef-v53-build{
        display:none !important;
    }

    body.haccp-cleaning-express-mobile .content{
        margin:0 !important;
        padding:0 !important;
        width:100% !important;
        height:100dvh !important;
        min-height:100dvh !important;
        overflow:hidden !important;
    }

    body.haccp-cleaning-express-mobile #mod-cleaning{
        display:block !important;
        margin:0 !important;
        padding:0 !important;
        width:100% !important;
        height:100dvh !important;
        min-height:100dvh !important;
        overflow:hidden !important;
    }

    body.haccp-cleaning-express-mobile #mod-cleaning > .card{
        display:none !important;
    }

    .hclean-express{
        display:flex !important;
        flex-direction:column;
        box-sizing:border-box;
        width:100%;
        height:100dvh;
        min-height:100dvh;
        padding:
            max(10px,env(safe-area-inset-top))
            max(12px,env(safe-area-inset-right))
            max(10px,env(safe-area-inset-bottom))
            max(12px,env(safe-area-inset-left));
        background:#ffffff;
        color:#111111;
        overflow:hidden;
    }

    .hclean-top{
        flex:0 0 auto;
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:10px;
    }

    .hclean-brand{
        display:flex;
        align-items:center;
        min-width:0;
        gap:9px;
    }

    .hclean-brand img{
        width:66px;
        height:34px;
        object-fit:contain;
        flex:0 0 auto;
    }

    .hclean-brand strong{
        display:block;
        color:#111;
        font-size:.72rem;
        font-weight:950;
        letter-spacing:1px;
    }

    .hclean-brand small{
        display:block;
        margin-top:2px;
        color:#6b7074;
        font-size:.56rem;
        font-weight:750;
    }

    .hclean-mode-btn{
        width:auto !important;
        min-height:36px !important;
        padding:7px 10px !important;
        border:1px solid #aeb4b9 !important;
        border-radius:9px !important;
        background:#fff !important;
        color:#111 !important;
        font-size:.56rem !important;
        font-weight:900 !important;
    }

    .hclean-switch{
        flex:0 0 auto;
        display:grid;
        grid-template-columns:1fr 1fr;
        gap:7px;
        margin-top:9px;
    }

    .hclean-switch button{
        min-height:36px !important;
        border:1px solid #aeb4b9 !important;
        border-radius:10px !important;
        background:#fff !important;
        color:#555 !important;
        font-size:.58rem !important;
        font-weight:900 !important;
    }

    .hclean-switch button.active{
        background:#111 !important;
        color:#fff !important;
        border-color:#111 !important;
    }

    .hclean-progress-row{
        flex:0 0 auto;
        display:grid;
        grid-template-columns:auto 1fr auto;
        align-items:center;
        gap:8px;
        margin-top:9px;
        color:#686d71;
        font-size:.56rem;
        font-weight:900;
    }

    .hclean-progress-track{
        height:5px;
        border-radius:999px;
        overflow:hidden;
        background:#e3e5e7;
    }

    .hclean-progress-track i{
        display:block;
        height:100%;
        width:0;
        border-radius:999px;
        background:#555b60;
        transition:width .12s linear;
    }

    .hclean-main{
        flex:1 1 auto;
        min-height:0;
        display:flex;
        flex-direction:column;
        justify-content:center;
        gap:10px;
        padding:7px 0;
        text-align:center;
    }

    .hclean-kicker{
        color:#6d7276;
        font-size:.56rem;
        font-weight:950;
        letter-spacing:1.2px;
        text-transform:uppercase;
    }

    #hclean-zone{
        margin:0 auto;
        width:min(100%,430px);
        color:#111;
        font-size:clamp(1.65rem,8vw,2.55rem);
        line-height:1.05;
        font-weight:950;
        letter-spacing:-.5px;
    }

    .hclean-last{
        width:min(100%,430px);
        box-sizing:border-box;
        margin:0 auto;
        padding:8px 10px;
        border:1px solid #aeb4b9;
        border-radius:10px;
        background:#f1f2f3;
        color:#5d6266;
        font-size:.61rem;
        font-weight:850;
    }

    .hclean-last.ok{
        background:#edf2ef;
        border-color:#b8c8bd;
        color:#31493b;
    }

    .hclean-last.alert{
        background:#f4eded;
        border-color:#d9bcbc;
        color:#6c3535;
    }

    .hclean-actions{
        width:min(100%,430px);
        margin:0 auto;
        display:grid;
        grid-template-columns:1fr;
        gap:9px;
    }

    .hclean-actions button{
        width:100% !important;
        min-height:92px !important;
        display:grid !important;
        grid-template-columns:48px 1fr !important;
        grid-template-rows:auto auto !important;
        align-items:center !important;
        column-gap:10px !important;
        padding:12px 14px !important;
        border-radius:16px !important;
        text-align:left !important;
        touch-action:manipulation !important;
        transition:none !important;
        animation:none !important;
    }

    .hclean-actions button > span{
        grid-row:1/3;
        display:grid;
        place-items:center;
        width:48px;
        height:48px;
        border-radius:14px;
        font-size:1.45rem;
        font-weight:950;
    }

    .hclean-actions button b{
        align-self:end;
        font-size:.82rem;
        font-weight:950;
        letter-spacing:.25px;
    }

    .hclean-actions button small{
        align-self:start;
        margin-top:3px;
        font-size:.57rem;
        line-height:1.25;
        font-weight:700;
        opacity:.76;
    }

    .hclean-conform{
        border:1px solid #75867b !important;
        background:#eef3f0 !important;
        color:#23372b !important;
    }

    .hclean-conform > span{
        background:#dfe9e3;
        color:#2e513b;
    }

    .hclean-nonconform{
        border:1px solid #aa7c7c !important;
        background:#f5eeee !important;
        color:#613737 !important;
    }

    .hclean-nonconform > span{
        background:#eadcdc;
        color:#743f3f;
    }

    .hclean-corrective-box{
        width:min(100%,430px);
        box-sizing:border-box;
        margin:0 auto;
        padding:10px;
        border:1px solid #aeb4b9;
        border-radius:13px;
        background:#f4f5f6;
        text-align:left;
    }

    .hclean-corrective-box[hidden]{
        display:none !important;
    }

    .hclean-corrective-box label{
        display:block;
        margin-bottom:6px;
        color:#333;
        font-size:.56rem;
        font-weight:950;
        letter-spacing:.6px;
    }

    #hclean-corrective{
        width:100% !important;
        min-height:64px !important;
        box-sizing:border-box !important;
        resize:none !important;
        padding:10px !important;
        border:1px solid #9fa6ab !important;
        border-radius:10px !important;
        background:#fff !important;
        color:#111 !important;
        font-size:.78rem !important;
    }

    .hclean-corrective-actions{
        display:grid;
        grid-template-columns:.8fr 1.2fr;
        gap:7px;
        margin-top:8px;
    }

    .hclean-corrective-actions button{
        min-height:42px !important;
        border:1px solid #aeb4b9 !important;
        border-radius:9px !important;
        background:#fff !important;
        color:#111 !important;
        font-size:.56rem !important;
        font-weight:900 !important;
    }

    #hclean-save-nonconform{
        background:#111 !important;
        color:#fff !important;
        border-color:#111 !important;
    }

    .hclean-feedback{
        width:min(100%,430px);
        margin:0 auto;
        min-height:34px;
        display:flex;
        align-items:center;
        justify-content:center;
        box-sizing:border-box;
        padding:7px 9px;
        border:1px solid #c2c7cb;
        border-radius:10px;
        background:#f3f4f5;
        color:#686d71;
        font-size:.58rem;
        font-weight:850;
    }

    .hclean-feedback.ok{
        background:#edf2ef;
        border-color:#b8c8bd;
        color:#31493b;
    }

    .hclean-feedback.alert{
        background:#f4eded;
        border-color:#d9bcbc;
        color:#6c3535;
    }

    .hclean-feedback.saving{
        background:#f1f2f3;
        color:#333;
    }

    .hclean-nav{
        width:min(100%,430px);
        margin:0 auto;
        display:grid;
        grid-template-columns:1fr 1fr;
        gap:7px;
    }

    .hclean-nav button{
        min-height:38px !important;
        border:1px solid #aeb4b9 !important;
        border-radius:9px !important;
        background:#fff !important;
        color:#555 !important;
        font-size:.56rem !important;
        font-weight:900 !important;
    }

    .hclean-footer{
        flex:0 0 auto;
        min-height:18px;
        text-align:center;
        color:#818589;
        font-size:.52rem;
        font-weight:750;
        white-space:nowrap;
        overflow:hidden;
        text-overflow:ellipsis;
    }

    .hx-cleaning-jump{
        border-color:#aeb4b9 !important;
    }

    @media(max-height:680px){
        .hclean-main{gap:6px;padding:4px 0}
        .hclean-actions button{min-height:76px !important;padding:9px 11px !important}
        .hclean-actions button > span{width:42px;height:42px}
        #hclean-zone{font-size:clamp(1.35rem,7vw,2rem)}
        .hclean-last,.hclean-feedback{min-height:30px;padding:5px 8px}
    }
}
</style>


<script id="ichef-haccp-trace-express-v1">
(() => {
    "use strict";

    let htraceSaving = false;
    let htraceFullMode = false;

    const $t = id => document.getElementById(id);

    function htraceIsPhone() {
        return typeof haccpIsPhoneMode === "function"
            ? haccpIsPhoneMode()
            : window.matchMedia("(max-width:1100px)").matches;
    }

    function traceDaysUntil(dateValue) {
        if (!dateValue) return null;
        const target = new Date(dateValue + "T00:00:00");
        if (Number.isNaN(target.getTime())) return null;
        const today = new Date();
        today.setHours(0,0,0,0);
        return Math.ceil((target - today) / 86400000);
    }

    window.updateTraceValidityIndicators = function() {
        const dlc = document.getElementById("trace-dlc")?.value || $t("htrace-dlc")?.value || "";
        const diff = traceDaysUntil(dlc);

        const targets = [
            document.getElementById("htrace-desktop-validity"),
            document.getElementById("htrace-validity")
        ].filter(Boolean);

        targets.forEach(box => {
            box.className = "htrace-validity neutral";

            if (diff === null) {
                box.textContent = "Renseignez la DLC secondaire.";
                return;
            }

            if (diff < 0) {
                box.className = "htrace-validity expired";
                box.textContent = `EXPIRÉE · ${Math.abs(diff)} jour${Math.abs(diff)>1?"s":""}`;
            } else if (diff === 0) {
                box.className = "htrace-validity warning";
                box.textContent = "EXPIRE AUJOURD’HUI";
            } else if (diff <= 2) {
                box.className = "htrace-validity warning";
                box.textContent = `À SURVEILLER · J-${diff}`;
            } else {
                box.className = "htrace-validity ok";
                box.textContent = `DLC OK · J-${diff}`;
            }
        });
    };

    window.refreshTraceDesktopStats = function() {
        const rows = (db.trace || []).filter(x => x.dept === currentDept && !x.originalId);
        const today = new Date().toLocaleDateString("fr-FR");

        let todayCount = 0;
        let soon = 0;
        let expired = 0;

        rows.forEach(row => {
            if (row.date === today) todayCount++;
            const diff = traceDaysUntil(row.dlc);
            if (diff !== null) {
                if (diff < 0) expired++;
                else if (diff <= 2) soon++;
            }
        });

        const set = (id,val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = String(val);
        };

        set("htrace-stat-today", todayCount);
        set("htrace-stat-soon", soon);
        set("htrace-stat-expired", expired);
    };

    window.syncTraceExpressFromLegacy = function() {
        const pairs = [
            ["trace-name","htrace-name"],
            ["trace-lot","htrace-lot"],
            ["trace-open","htrace-open"],
            ["trace-dlc","htrace-dlc"]
        ];

        pairs.forEach(([legacyId,mobileId]) => {
            const legacy = document.getElementById(legacyId);
            const mobile = document.getElementById(mobileId);
            if (legacy && mobile) mobile.value = legacy.value || "";
        });

        const photo = document.getElementById("trace-img");
        const photoState = document.getElementById("htrace-photo-state");
        const scanStatus = document.getElementById("htrace-scan-status");

        if (photoState) {
            photoState.textContent = photo?.files?.length
                ? "✓ Photo liée à cette preuve"
                : "Aucune photo ajoutée";
        }

        if (scanStatus && photo?.files?.length) {
            scanStatus.className = "htrace-scan-status ok";
            scanStatus.textContent = "✓ Étiquette lue · vérifiez les informations avant d’enregistrer.";
        }

        updateTraceValidityIndicators();
    };

    function syncLegacyFromTraceExpress() {
        const pairs = [
            ["htrace-name","trace-name"],
            ["htrace-lot","trace-lot"],
            ["htrace-open","trace-open"],
            ["htrace-dlc","trace-dlc"]
        ];

        pairs.forEach(([mobileId,legacyId]) => {
            const mobile = document.getElementById(mobileId);
            const legacy = document.getElementById(legacyId);
            if (mobile && legacy) legacy.value = mobile.value || "";
        });
    }

    function resetTraceExpress() {
        ["htrace-name","htrace-lot","htrace-dlc"].forEach(id => {
            const el = $t(id);
            if (el) el.value = "";
        });

        const open = $t("htrace-open");
        if (open) open.valueAsDate = new Date();

        const status = $t("htrace-scan-status");
        if (status) {
            status.className = "htrace-scan-status";
            status.textContent = "Prenez l’étiquette en photo ou remplissez manuellement.";
        }

        const legacyImg = document.getElementById("trace-img");
        if (legacyImg) legacyImg.value = "";

        updateTraceValidityIndicators();
    }

    async function saveTraceExpress() {
        if (htraceSaving) return;

        syncLegacyFromTraceExpress();

        const name = document.getElementById("trace-name")?.value?.trim() || "";
        const lot = document.getElementById("trace-lot")?.value?.trim() || "";
        const dlc = document.getElementById("trace-dlc")?.value || "";

        if (!name || !lot || !dlc) {
            const feedback = $t("htrace-feedback");
            if (feedback) {
                feedback.className = "htrace-feedback alert";
                feedback.textContent = "Produit, lot et DLC sont obligatoires.";
            }
            return;
        }

        htraceSaving = true;
        const btn = $t("htrace-save");
        if (btn) {
            btn.disabled = true;
            btn.textContent = "ENREGISTREMENT…";
        }

        const feedback = $t("htrace-feedback");
        if (feedback) {
            feedback.className = "htrace-feedback saving";
            feedback.textContent = "Archivage sécurisé de la preuve…";
        }

        try {
            await saveEntry("trace");

            if (navigator.vibrate) {
                try { navigator.vibrate(35); } catch (_) {}
            }

            if (feedback) {
                feedback.className = "htrace-feedback ok";
                feedback.textContent = "✓ Traçabilité enregistrée";
            }

            refreshTraceDesktopStats();

            setTimeout(() => {
                resetTraceExpress();
                if (feedback) {
                    feedback.className = "htrace-feedback";
                    feedback.textContent = "Prêt pour l’étiquette suivante.";
                }
            }, 100);

        } catch (error) {
            if (feedback) {
                feedback.className = "htrace-feedback alert";
                feedback.textContent = error?.message || "Enregistrement non confirmé.";
            }
        } finally {
            htraceSaving = false;
            if (btn) {
                btn.disabled = false;
                btn.textContent = "ENREGISTRER LA TRAÇABILITÉ";
            }
        }
    }

    window.htraceEnterExpress = function(force = false) {
        if (!htraceIsPhone() && !force) return;
        if (htraceFullMode && !force) return;
        if (typeof currentDept !== "undefined" && currentDept === "ADMIN") return;

        document.body.classList.remove("haccp-express-mobile","haccp-cleaning-express-mobile");
        document.body.classList.add("haccp-trace-express-mobile");

        document.querySelectorAll(".module").forEach(m => m.classList.remove("active"));
        document.getElementById("mod-trace")?.classList.add("active");

        if ($t("htrace-sector")) $t("htrace-sector").textContent = currentDept || "Secteur";
        if ($t("htrace-user")) $t("htrace-user").textContent = `${currentUser?.name || "Collaborateur"} · ${currentDept || "Secteur"}`;

        syncTraceExpressFromLegacy();

        const open = $t("htrace-open");
        if (open && !open.value) open.valueAsDate = new Date();

        updateTraceValidityIndicators();
    };

    window.htraceExitExpress = function() {
        htraceFullMode = true;
        document.body.classList.remove("haccp-trace-express-mobile");
        document.querySelectorAll(".module").forEach(m => m.classList.remove("active"));
        document.getElementById("mod-trace")?.classList.add("active");
    };

    function goTraceToTemp() {
        document.body.classList.remove("haccp-trace-express-mobile","haccp-cleaning-express-mobile");
        document.querySelectorAll(".module").forEach(m => m.classList.remove("active"));
        document.getElementById("mod-temp")?.classList.add("active");
        if (typeof hxEnterExpress === "function") hxEnterExpress(true);
    }

    function goTraceToClean() {
        document.body.classList.remove("haccp-trace-express-mobile","haccp-express-mobile");
        document.querySelectorAll(".module").forEach(m => m.classList.remove("active"));
        document.getElementById("mod-cleaning")?.classList.add("active");
        if (typeof hcleanEnterExpress === "function") hcleanEnterExpress(true);
    }

    function wireTrace() {
        $t("htrace-scan")?.addEventListener("click", () => {
            document.getElementById("scan-label-input")?.click();
        });

        $t("htrace-save")?.addEventListener("click", saveTraceExpress);
        $t("htrace-full-mode")?.addEventListener("click", htraceExitExpress);
        $t("htrace-to-temp")?.addEventListener("click", goTraceToTemp);
        $t("htrace-to-clean")?.addEventListener("click", goTraceToClean);

        document.getElementById("hx-trace-jump")?.addEventListener("click", () => {
            htraceFullMode = false;
            htraceEnterExpress(true);
        });

        document.getElementById("hclean-to-trace")?.addEventListener("click", () => {
            htraceFullMode = false;
            htraceEnterExpress(true);
        });

        ["htrace-name","htrace-lot","htrace-open","htrace-dlc"].forEach(id => {
            $t(id)?.addEventListener("input", () => {
                syncLegacyFromTraceExpress();
                updateTraceValidityIndicators();
            });
            $t(id)?.addEventListener("change", () => {
                syncLegacyFromTraceExpress();
                updateTraceValidityIndicators();
            });
        });

        ["trace-name","trace-lot","trace-open","trace-dlc"].forEach(id => {
            document.getElementById(id)?.addEventListener("input", () => {
                syncTraceExpressFromLegacy();
                updateTraceValidityIndicators();
            });
            document.getElementById(id)?.addEventListener("change", () => {
                syncTraceExpressFromLegacy();
                updateTraceValidityIndicators();
            });
        });

        window.addEventListener("pageshow", () => {
            try {
                refreshTraceDesktopStats();
                updateTraceValidityIndicators();

                if (
                    htraceIsPhone() &&
                    window.ICHEF_HACCP?.authenticated &&
                    document.getElementById("mod-trace")?.classList.contains("active") &&
                    !htraceFullMode
                ) {
                    htraceEnterExpress(false);
                }
            } catch (_) {}
        });

        window.addEventListener("resize", () => {
            if (!htraceIsPhone()) document.body.classList.remove("haccp-trace-express-mobile");
        }, {passive:true});
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", wireTrace, {once:true});
    } else {
        wireTrace();
    }
})();
</script>


<style id="ichef-haccp-trace-redesign-v1">
.htrace-express{display:none}

.htrace-desktop{
    display:none;
}

@media(min-width:1101px){
    #mod-trace.active{
        display:block !important;
    }

    .htrace-desktop{
        display:flex;
        flex-direction:column;
        gap:12px;
        color:#111;
    }

    .htrace-desktop-head{
        display:flex;
        justify-content:space-between;
        align-items:flex-start;
        gap:20px;
        padding:14px 16px;
        border:1px solid #aeb4b9;
        border-radius:14px;
        background:#fff;
    }

    .htrace-desktop-kicker{
        color:#666;
        font-size:.57rem;
        font-weight:900;
        letter-spacing:1.05px;
    }

    .htrace-desktop-head h1{
        margin:4px 0 0;
        color:#111;
        font-size:1.35rem;
        line-height:1.05;
    }

    .htrace-desktop-head p{
        margin:6px 0 0;
        color:#666;
        font-size:.68rem;
    }

    .htrace-desktop-stats{
        display:grid;
        grid-template-columns:repeat(3,minmax(105px,1fr));
        gap:7px;
    }

    .htrace-desktop-stats>div{
        min-width:105px;
        padding:9px 11px;
        border:1px solid #aeb4b9;
        border-radius:10px;
        background:#f3f4f5;
    }

    .htrace-desktop-stats span{
        display:block;
        color:#666;
        font-size:.49rem;
        font-weight:900;
        letter-spacing:.55px;
    }

    .htrace-desktop-stats strong{
        display:block;
        margin-top:4px;
        color:#111;
        font-size:1rem;
    }

    .htrace-desktop-grid{
        display:grid;
        grid-template-columns:.85fr 1.05fr 1fr;
        gap:10px;
    }

    .htrace-step{
        position:relative;
        min-width:0;
        padding:15px;
        border:1px solid #aeb4b9;
        border-radius:14px;
        background:#fff;
    }

    .htrace-step-number{
        width:28px;
        height:28px;
        display:grid;
        place-items:center;
        border:1px solid #9fa6ab;
        border-radius:999px;
        background:#f1f2f3;
        color:#111;
        font-size:.62rem;
        font-weight:950;
    }

    .htrace-step-title{
        margin-top:9px;
        margin-bottom:13px;
    }

    .htrace-step-title strong{
        display:block;
        color:#111;
        font-size:.79rem;
    }

    .htrace-step-title span{
        display:block;
        margin-top:3px;
        color:#777;
        font-size:.57rem;
        line-height:1.35;
    }

    .htrace-desktop-scan{
        width:100% !important;
        min-height:146px !important;
        padding:18px !important;
        display:flex !important;
        flex-direction:column !important;
        align-items:center !important;
        justify-content:center !important;
        gap:6px !important;
        border:1px dashed #8f969c !important;
        border-radius:13px !important;
        background:#f4f5f6 !important;
        color:#111 !important;
        text-align:center !important;
    }

    .htrace-desktop-scan>span{
        font-size:1.45rem;
    }

    .htrace-desktop-scan b{
        font-size:.72rem;
    }

    .htrace-desktop-scan small{
        max-width:230px;
        color:#666;
        font-size:.55rem;
        line-height:1.4;
    }

    .htrace-photo-state{
        margin-top:8px;
        padding:7px 9px;
        border:1px solid #c0c5c9;
        border-radius:9px;
        background:#fff;
        color:#777;
        font-size:.56rem;
        text-align:center;
    }

    .htrace-desktop-field{
        display:block;
        margin-top:9px;
    }

    .htrace-desktop-field>span{
        display:block;
        margin-bottom:5px;
        color:#666;
        font-size:.54rem;
        font-weight:900;
        letter-spacing:.55px;
    }

    .htrace-product-row{
        display:grid;
        grid-template-columns:minmax(0,1fr) 38px auto;
        gap:6px;
    }

    .htrace-product-row .btn-clear{
        width:38px !important;
        min-width:38px !important;
        padding:0 !important;
        font-size:1rem !important;
    }

    .htrace-product-row .btn-catalog{
        width:auto !important;
        padding:8px 10px !important;
        font-size:.57rem !important;
    }

    .htrace-desktop-date-grid{
        display:grid;
        grid-template-columns:1fr 1fr;
        gap:8px;
    }

    .htrace-validity{
        min-height:38px;
        margin-top:10px;
        display:flex;
        align-items:center;
        justify-content:center;
        padding:7px 10px;
        box-sizing:border-box;
        border:1px solid #aeb4b9;
        border-radius:9px;
        background:#f1f2f3;
        color:#555;
        font-size:.60rem;
        font-weight:900;
    }

    .htrace-validity.ok{
        background:#edf2ef;
        border-color:#aebdaf;
        color:#31493b;
    }

    .htrace-validity.warning{
        background:#f3f0e8;
        border-color:#cfc6aa;
        color:#695c38;
    }

    .htrace-validity.expired{
        background:#f4eded;
        border-color:#d2b2b2;
        color:#703737;
    }

    .htrace-desktop-save{
        width:100% !important;
        min-height:48px !important;
        margin-top:9px !important;
        border:1px solid #111 !important;
        background:#111 !important;
        color:#fff !important;
        font-size:.65rem !important;
        font-weight:950 !important;
    }

    .htrace-history{
        border:1px solid #aeb4b9;
        border-radius:14px;
        background:#fff;
        overflow:hidden;
    }

    .htrace-history-head{
        padding:10px 13px;
        border-bottom:1px solid #c6cbd0;
        background:#f3f4f5;
    }

    .htrace-history-head strong{
        display:block;
        color:#111;
        font-size:.72rem;
    }

    .htrace-history-head span{
        display:block;
        margin-top:2px;
        color:#777;
        font-size:.54rem;
    }

    .htrace-history-table{
        max-height:340px;
        overflow:auto;
    }

    @media(max-width:1120px){
        .htrace-desktop-grid{
            grid-template-columns:1fr 1fr;
        }

        .htrace-step-scan{
            grid-row:span 2;
        }

        .htrace-desktop-head{
            flex-direction:column;
        }
    }
}

@media(max-width:1100px){
    body.haccp-trace-express-mobile{
        height:100dvh !important;
        min-height:100dvh !important;
        overflow:hidden !important;
        background:#fff !important;
        color:#111 !important;
    }

    body.haccp-trace-express-mobile .nav-haccp,
    body.haccp-trace-express-mobile #haccp-regulatory-banner,
    body.haccp-trace-express-mobile #ichef-system-link-panel,
    body.haccp-trace-express-mobile #ichef-haccp-v41-build,
    body.haccp-trace-express-mobile #ichef-v53-build{
        display:none !important;
    }

    body.haccp-trace-express-mobile .content{
        width:100% !important;
        height:100dvh !important;
        min-height:100dvh !important;
        margin:0 !important;
        padding:0 !important;
        overflow:hidden !important;
    }

    body.haccp-trace-express-mobile #mod-trace{
        display:block !important;
        width:100% !important;
        height:100dvh !important;
        min-height:100dvh !important;
        margin:0 !important;
        padding:0 !important;
        overflow:hidden !important;
    }

    body.haccp-trace-express-mobile .htrace-desktop{
        display:none !important;
    }

    .htrace-express{
        display:flex !important;
        flex-direction:column;
        box-sizing:border-box;
        width:100%;
        height:100dvh;
        min-height:100dvh;
        padding:
            max(10px,env(safe-area-inset-top))
            max(12px,env(safe-area-inset-right))
            max(10px,env(safe-area-inset-bottom))
            max(12px,env(safe-area-inset-left));
        background:#fff;
        color:#111;
        overflow:hidden;
    }

    .htrace-top{
        flex:0 0 auto;
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:9px;
    }

    .htrace-brand{
        min-width:0;
        display:flex;
        align-items:center;
        gap:8px;
    }

    .htrace-brand img{
        width:64px;
        height:33px;
        object-fit:contain;
    }

    .htrace-brand strong{
        display:block;
        color:#111;
        font-size:.69rem;
        font-weight:950;
        letter-spacing:.85px;
    }

    .htrace-brand small{
        display:block;
        margin-top:2px;
        color:#6d7276;
        font-size:.54rem;
        font-weight:800;
    }

    .htrace-mode-btn{
        width:auto !important;
        min-height:35px !important;
        padding:6px 9px !important;
        border:1px solid #aeb4b9 !important;
        border-radius:9px !important;
        background:#fff !important;
        color:#111 !important;
        font-size:.53rem !important;
        font-weight:900 !important;
    }

    .htrace-switch{
        flex:0 0 auto;
        display:grid;
        grid-template-columns:.7fr 1fr 1fr;
        gap:6px;
        margin-top:8px;
    }

    .htrace-switch button{
        min-height:35px !important;
        padding:5px !important;
        border:1px solid #aeb4b9 !important;
        border-radius:9px !important;
        background:#fff !important;
        color:#555 !important;
        font-size:.52rem !important;
        font-weight:900 !important;
    }

    .htrace-switch button.active{
        background:#111 !important;
        color:#fff !important;
        border-color:#111 !important;
    }

    .htrace-main{
        flex:1 1 auto;
        min-height:0;
        display:flex;
        flex-direction:column;
        justify-content:center;
        gap:8px;
        padding:6px 0;
    }

    .htrace-scan{
        width:min(100%,440px) !important;
        min-height:82px !important;
        margin:0 auto !important;
        padding:11px 13px !important;
        display:grid !important;
        grid-template-columns:52px minmax(0,1fr) !important;
        align-items:center !important;
        gap:10px !important;
        border:1px dashed #858d93 !important;
        border-radius:14px !important;
        background:#f1f2f3 !important;
        color:#111 !important;
        text-align:left !important;
        touch-action:manipulation !important;
    }

    .htrace-camera{
        width:52px;
        height:52px;
        display:grid;
        place-items:center;
        border:1px solid #a5acb1;
        border-radius:13px;
        background:#fff;
        font-size:1.3rem;
    }

    .htrace-scan b{
        display:block;
        font-size:.76rem;
        font-weight:950;
    }

    .htrace-scan small{
        display:block;
        margin-top:3px;
        color:#666;
        font-size:.55rem;
    }

    .htrace-scan-status,
    .htrace-feedback{
        width:min(100%,440px);
        min-height:31px;
        box-sizing:border-box;
        margin:0 auto;
        padding:6px 8px;
        display:flex;
        align-items:center;
        justify-content:center;
        border:1px solid #b8bdc1;
        border-radius:9px;
        background:#f5f6f7;
        color:#666;
        font-size:.55rem;
        font-weight:800;
        text-align:center;
    }

    .htrace-scan-status.ok,
    .htrace-feedback.ok{
        background:#edf2ef;
        border-color:#aebdaf;
        color:#31493b;
    }

    .htrace-feedback.alert{
        background:#f4eded;
        border-color:#d2b2b2;
        color:#703737;
    }

    .htrace-feedback.saving{
        color:#333;
    }

    .htrace-field{
        display:block;
        width:min(100%,440px);
        margin:0 auto;
    }

    .htrace-field>span{
        display:block;
        margin-bottom:4px;
        color:#555;
        font-size:.52rem;
        font-weight:950;
        letter-spacing:.55px;
    }

    .htrace-field input{
        width:100% !important;
        min-height:45px !important;
        box-sizing:border-box !important;
        padding:9px 11px !important;
        border:1px solid #aeb4b9 !important;
        border-radius:10px !important;
        background:#fff !important;
        color:#111 !important;
        font-size:.79rem !important;
        box-shadow:none !important;
    }

    .htrace-date-grid{
        width:min(100%,440px);
        margin:0 auto;
        display:grid;
        grid-template-columns:1fr 1fr;
        gap:7px;
    }

    .htrace-validity{
        width:min(100%,440px);
        margin:0 auto;
    }

    .htrace-save{
        width:min(100%,440px) !important;
        min-height:53px !important;
        margin:0 auto !important;
        border:1px solid #111 !important;
        border-radius:12px !important;
        background:#111 !important;
        color:#fff !important;
        font-size:.69rem !important;
        font-weight:950 !important;
        letter-spacing:.3px !important;
        touch-action:manipulation !important;
        transition:none !important;
        animation:none !important;
    }

    .htrace-footer{
        flex:0 0 auto;
        min-height:18px;
        text-align:center;
        color:#85898c;
        font-size:.50rem;
        font-weight:750;
        white-space:nowrap;
        overflow:hidden;
        text-overflow:ellipsis;
    }

    /* Cleaning switch becomes 3-way too */
    .hclean-switch{
        grid-template-columns:.7fr 1fr 1fr !important;
    }

    @media(max-height:690px){
        .htrace-main{gap:5px;padding:3px 0}
        .htrace-scan{min-height:68px !important}
        .htrace-camera{width:44px;height:44px}
        .htrace-field input{min-height:40px !important;padding:7px 9px !important}
        .htrace-save{min-height:46px !important}
        .htrace-scan-status,.htrace-feedback{min-height:27px;padding:4px 7px}
    }
}
</style>


<script id="ichef-haccp-trace-desktop-wire-v1">
(() => {
    "use strict";

    const wire = () => {
        ["trace-name","trace-lot","trace-open","trace-dlc"].forEach(id => {
            const el = document.getElementById(id);
            if (!el || el.dataset.traceWired === "1") return;
            el.dataset.traceWired = "1";

            const sync = () => {
                try { syncTraceExpressFromLegacy(); } catch (_) {}
                try { updateTraceValidityIndicators(); } catch (_) {}
            };

            el.addEventListener("input", sync);
            el.addEventListener("change", sync);
        });

        try { refreshTraceDesktopStats(); } catch (_) {}
        try { updateTraceValidityIndicators(); } catch (_) {}
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", wire, {once:true});
    } else {
        wire();
    }
})();
</script>

<script id="ichef-haccp-delivery-trace-stock-v1">
(()=>{'use strict';
let HTRACE_DELIVERIES=[], HTRACE_ACTIVE_DELIVERY=null;
window.HTRACE_DELIVERY_CONTEXT=null;
const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
function token(){return (typeof haccpSessionToken==='function'?haccpSessionToken():(sessionStorage.getItem('ichef_auth_token')||sessionStorage.getItem('ichef_access_token')||sessionStorage.getItem('ichef_chef_access_token')||sessionStorage.getItem('ichef_ops_token')||window.ICHEF_SECURITY?.accessToken||window.ICHEF_SECURITY?.operationsToken||''))}
function headers(extra={}){const b=typeof systemHeaders==='function'?systemHeaders(extra):{...extra},t=token();if(t&&!b.Authorization)b.Authorization='Bearer '+t;if(tenantID&&!b['X-iCHEF-Tenant'])b['X-iCHEF-Tenant']=tenantID;if(deviceId&&!b['X-iCHEF-Device'])b['X-iCHEF-Device']=deviceId;return b}
async function api(path,opt={}){const r=await fetch(`${SERVER_URL}${path}`,{cache:'no-store',credentials:'omit',...opt,headers:headers({...opt.body?{'Content-Type':'application/json'}:{},...(opt.headers||{})})});const d=await r.json().catch(()=>({}));if(!r.ok||d.success===false)throw new Error(d.error||`Erreur ${r.status}`);return d}
function sector(){const d=String(currentDept||'').toUpperCase();return d==='CUISINE'?'cuisine':d==='PATISSERIE'?'patisserie':d==='BAR'?'bar':d==='SERVICE'?'service':''}
function remain(i={}){return Math.max(0,Number(i.quantity||0)-Number(i.receivedQuantity||0))}
function mine(d={}){const s=sector(),k=String(d.sectorKey||'').toLowerCase();return !s||!k||k===s||k==='economat'}
function counts(n){const a=document.getElementById('htrace-delivery-count'),b=document.getElementById('htrace-mobile-delivery-count');if(a)a.textContent=String(n);if(b)b.textContent=String(n)}
function render(){counts(HTRACE_DELIVERIES.length);const a=document.getElementById('htrace-delivery-list'),b=document.getElementById('htrace-mobile-delivery-list');if(!HTRACE_DELIVERIES.length){const e='<div class="htrace-delivery-empty">Aucune livraison à réceptionner pour ce secteur.</div>';if(a)a.innerHTML=e;if(b)b.innerHTML=e;return}
const dh=HTRACE_DELIVERIES.map(d=>{const n=(d.items||[]).filter(i=>remain(i)>0).length;return `<button type="button" class="htrace-delivery-card" onclick="openTraceDelivery('${esc(d.id)}')"><span class="htrace-delivery-card-main"><b>${esc(d.supplierName||'Fournisseur')}</b><small>${esc(d.sectorLabel||'Secteur')} · ${n} article${n>1?'s':''} à recevoir</small></span><span class="htrace-delivery-card-state">${esc(d.status||'')}</span></button>`}).join('');
const mh=HTRACE_DELIVERIES.map(d=>{const n=(d.items||[]).filter(i=>remain(i)>0).length;return `<button type="button" class="htrace-mobile-delivery-row" onclick="openTraceDelivery('${esc(d.id)}',true)"><span><b>${esc(d.supplierName||'Fournisseur')}</b><small>${n} article${n>1?'s':''} · ${esc(d.status||'')}</small></span><strong>›</strong></button>`}).join('');if(a)a.innerHTML=dh;if(b)b.innerHTML=mh}
window.loadTraceDeliveries=async()=>{const a=document.getElementById('htrace-delivery-list'),b=document.getElementById('htrace-mobile-delivery-list');if(a)a.innerHTML='<div class="htrace-delivery-empty">Synchronisation…</div>';if(b)b.innerHTML='<div class="htrace-delivery-empty">Synchronisation…</div>';try{const d=await api('/api/ops/deliveries');HTRACE_DELIVERIES=(d.deliveries||[]).filter(mine);render()}catch(e){const t=esc(e.message||'Livraisons indisponibles.');if(a)a.innerHTML=`<div class="htrace-delivery-empty">${t}</div>`;if(b)b.innerHTML=`<div class="htrace-delivery-empty">${t}</div>`;counts(0)}};
window.openTraceDelivery=(id,mobile=false)=>{const d=HTRACE_DELIVERIES.find(x=>String(x.id)===String(id));if(!d)return;HTRACE_ACTIVE_DELIVERY=d;const det=document.getElementById('htrace-delivery-detail');if(det)det.hidden=false;const s=document.getElementById('htrace-delivery-supplier'),o=document.getElementById('htrace-delivery-order');if(s)s.textContent=d.supplierName||'Fournisseur';if(o)o.textContent=`Commande ${d.id} · ${d.sectorLabel||''}`;const lines=document.getElementById('htrace-delivery-lines');if(lines)lines.innerHTML=(d.items||[]).map(i=>{const rem=remain(i),q=rem>0?rem:Number(i.receivedQuantity||0),linked=!!String(i.inventoryItemId||'').trim();return `<div class="htrace-delivery-line"><div class="htrace-delivery-line-copy"><b>${esc(i.name)}</b><small>Commandé ${Number(i.quantity||0)} ${esc(i.unit||'')} · déjà reçu ${Number(i.receivedQuantity||0)}</small><span class="${linked?'linked':'unlinked'}">${linked?'STOCK LIÉ':'NON LIÉ AU STOCK'}</span></div><label><span>À recevoir maintenant</span><input type="number" min="0" step="0.001" value="${q}" data-delivery-receive-item="${esc(i.itemId)}"></label><button type="button" class="htrace-line-trace-btn" onclick="linkTraceToDeliveryItem('${esc(d.id)}','${esc(i.itemId)}')">TRACER</button></div>`}).join('');const linked=(d.items||[]).filter(i=>String(i.inventoryItemId||'').trim()).length,info=document.getElementById('htrace-delivery-stock-info');if(info)info.textContent=`${linked}/${(d.items||[]).length} article(s) liés au stock Économat. Le serveur met uniquement ceux-ci à jour.`;if(mobile){const sh=document.getElementById('htrace-mobile-delivery-sheet'),li=document.getElementById('htrace-mobile-delivery-list');if(sh)sh.hidden=false;if(li)li.innerHTML=(d.items||[]).map(i=>`<button type="button" class="htrace-mobile-item-row" onclick="linkTraceToDeliveryItem('${esc(d.id)}','${esc(i.itemId)}',true)"><span><b>${esc(i.name)}</b><small>${remain(i)} ${esc(i.unit||'')} restant · ${String(i.inventoryItemId||'').trim()?'stock lié':'hors stock'}</small></span><strong>TRACER</strong></button>`).join('')}};
window.closeTraceDeliveryDetail=()=>{HTRACE_ACTIVE_DELIVERY=null;const d=document.getElementById('htrace-delivery-detail');if(d)d.hidden=true};
window.receiveTraceDelivery=async()=>{const d=HTRACE_ACTIVE_DELIVERY;if(!d)return;const received={};let issue=false;document.querySelectorAll('[data-delivery-receive-item]').forEach(inp=>{const i=(d.items||[]).find(x=>String(x.itemId)===String(inp.dataset.deliveryReceiveItem));if(!i)return;const prev=Math.max(0,Number(i.receivedQuantity||0)),add=Math.max(0,Number(inp.value||0)),next=prev+add;received[i.itemId]=next;if(Math.abs(next-Number(i.quantity||0))>1e-9)issue=true});const note=document.getElementById('htrace-delivery-note')?.value||'',btn=document.getElementById('htrace-delivery-receive-btn');if(btn){btn.disabled=true;btn.textContent='RÉCEPTION EN COURS…'}try{await api(`/api/ops/purchase-orders/${encodeURIComponent(d.id)}`,{method:'PUT',body:JSON.stringify({action:'RECEIVE',received,receptionNote:note,hasIssue:issue})});try{await loadData()}catch(_){}try{refreshInventoryDashboard()}catch(_){}const det=document.getElementById('htrace-delivery-detail');if(det)det.hidden=true;await loadTraceDeliveries();const st=document.getElementById('htrace-photo-state');if(st)st.textContent=`✓ Livraison ${d.id} réceptionnée · stock synchronisé`;try{navigator.vibrate?.(45)}catch(_){}}catch(e){alert(e.message||'Réception non enregistrée.')}finally{if(btn){btn.disabled=false;btn.textContent='VALIDER RÉCEPTION + STOCK'}}};
window.linkTraceToDeliveryItem=(oid,iid,mobile=false)=>{const d=HTRACE_DELIVERIES.find(x=>String(x.id)===String(oid))||HTRACE_ACTIVE_DELIVERY,i=d?.items?.find(x=>String(x.itemId)===String(iid));if(!d||!i)return;window.HTRACE_DELIVERY_CONTEXT={orderId:d.id,supplierId:d.supplierId||'',supplierName:d.supplierName||'',sectorKey:d.sectorKey||'',item:{...i},receivedQuantity:Number(i.receivedQuantity||0)};const a=document.getElementById('trace-name'),b=document.getElementById('htrace-name');if(a)a.value=i.name||'';if(b)b.value=i.name||'';updateTraceDeliveryContextUi();const sh=document.getElementById('htrace-mobile-delivery-sheet');if(sh)sh.hidden=true;if(mobile)setTimeout(()=>document.getElementById('htrace-scan')?.focus({preventScroll:true}),20);else document.getElementById('trace-lot')?.focus({preventScroll:true})};
window.updateTraceDeliveryContextUi=()=>{const c=window.HTRACE_DELIVERY_CONTEXT,d=document.getElementById('htrace-delivery-context'),dl=document.getElementById('htrace-delivery-context-label'),m=document.getElementById('htrace-mobile-context'),ml=document.getElementById('htrace-mobile-context-label');if(!c?.orderId||!c?.item){if(d)d.hidden=true;if(m)m.hidden=true;return}const l=`${c.supplierName||'Fournisseur'} · ${c.orderId} · ${c.item.name||''}`;if(d)d.hidden=false;if(dl)dl.textContent=l;if(m)m.hidden=false;if(ml)ml.textContent=l};
window.clearTraceDeliveryContext=()=>{window.HTRACE_DELIVERY_CONTEXT=null;updateTraceDeliveryContextUi()};
window.htraceAfterTraceSaved=e=>{const c=window.HTRACE_DELIVERY_CONTEXT;if(c?.orderId&&e?.purchaseOrderId){const st=document.getElementById('htrace-photo-state');if(st)st.textContent=`✓ Preuve liée à la commande ${e.purchaseOrderId} et au stock`}clearTraceDeliveryContext()};
function wire(){document.getElementById('htrace-mobile-deliveries-btn')?.addEventListener('click',async()=>{const s=document.getElementById('htrace-mobile-delivery-sheet');if(s)s.hidden=false;await loadTraceDeliveries()});document.getElementById('htrace-mobile-delivery-close')?.addEventListener('click',()=>{const s=document.getElementById('htrace-mobile-delivery-sheet');if(s)s.hidden=true});window.addEventListener('pageshow',()=>{if(window.ICHEF_HACCP?.authenticated){loadTraceDeliveries().catch(()=>{});updateTraceDeliveryContextUi()}})}wire();window.refreshHaccpDeliveryBridge=()=>loadTraceDeliveries().catch(()=>{});
})();
</script>
<style id="ichef-haccp-delivery-trace-stock-v1-css">
.htrace-delivery-hub{border:1px solid #aeb4b9;border-radius:14px;background:#fff;overflow:hidden}.htrace-delivery-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:13px 15px;border-bottom:1px solid #c6cbd0;background:#f3f4f5}.htrace-delivery-head h2{margin:3px 0 0;color:#111;font-size:.88rem}.htrace-delivery-head p{margin:4px 0 0;color:#666;font-size:.57rem}.htrace-delivery-head-actions{display:flex;align-items:center;gap:7px;flex-wrap:wrap;justify-content:flex-end}.htrace-delivery-count{min-width:32px;height:32px;display:grid;place-items:center;border:1px solid #9fa6ab;border-radius:999px;background:#fff;color:#111;font-size:.68rem;font-weight:950}.htrace-delivery-list{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;padding:10px}.htrace-delivery-card{min-width:0;min-height:62px;padding:9px 10px!important;display:flex!important;align-items:center!important;justify-content:space-between!important;gap:10px!important;border:1px solid #aeb4b9!important;border-radius:10px!important;background:#fff!important;color:#111!important;text-align:left!important}.htrace-delivery-card:hover{background:#f3f4f5!important}.htrace-delivery-card-main{min-width:0}.htrace-delivery-card-main b{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.66rem}.htrace-delivery-card-main small{display:block;margin-top:3px;color:#777;font-size:.53rem}.htrace-delivery-card-state{flex:0 0 auto;padding:4px 6px;border:1px solid #c0c5c9;border-radius:999px;color:#555;font-size:.48rem;font-weight:900}.htrace-delivery-empty{grid-column:1/-1;padding:16px;color:#777;font-size:.61rem;text-align:center}.htrace-delivery-detail{padding:12px;border-top:1px solid #c6cbd0;background:#fff}.htrace-delivery-detail[hidden]{display:none!important}.htrace-delivery-detail-head{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:9px}.htrace-delivery-detail-head strong{display:block;color:#111;font-size:.76rem}.htrace-delivery-detail-head span{display:block;margin-top:3px;color:#777;font-size:.55rem}.htrace-delivery-lines{display:flex;flex-direction:column;gap:6px}.htrace-delivery-line{display:grid;grid-template-columns:minmax(0,1fr) 150px 78px;align-items:center;gap:9px;padding:8px;border:1px solid #c5cacf;border-radius:9px;background:#f7f8f8}.htrace-delivery-line-copy b{display:block;color:#111;font-size:.66rem}.htrace-delivery-line-copy small{display:block;margin-top:3px;color:#74797d;font-size:.53rem}.htrace-delivery-line-copy span{display:inline-flex;margin-top:5px;padding:3px 6px;border:1px solid #b7bdc1;border-radius:999px;font-size:.46rem;font-weight:900}.htrace-delivery-line-copy span.linked{background:#edf2ef;color:#31493b}.htrace-delivery-line-copy span.unlinked{background:#f4eded;color:#703737}.htrace-delivery-line label>span{display:block;margin-bottom:4px;color:#666;font-size:.48rem;font-weight:900}.htrace-delivery-line input{min-height:36px!important}.htrace-line-trace-btn{min-height:36px!important;padding:6px!important;border:1px solid #111!important;border-radius:8px!important;background:#111!important;color:#fff!important;font-size:.52rem!important;font-weight:950!important}.htrace-delivery-note{display:block;margin-top:9px}.htrace-delivery-note>span{display:block;margin-bottom:4px;color:#666;font-size:.50rem;font-weight:900}.htrace-delivery-footer{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:9px}.htrace-delivery-stock-info{color:#666;font-size:.55rem;line-height:1.4}.htrace-delivery-context{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:8px;margin-bottom:9px;padding:8px 9px;border:1px solid #9fa6ab;border-radius:9px;background:#f1f2f3}.htrace-delivery-context[hidden]{display:none!important}.htrace-delivery-context>span{color:#666;font-size:.48rem;font-weight:900}.htrace-delivery-context>strong{min-width:0;color:#111;font-size:.57rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.htrace-delivery-context>button{min-height:28px!important;padding:4px 7px!important;border:1px solid #aeb4b9!important;background:#fff!important;color:#555!important;font-size:.46rem!important;font-weight:900!important}.htrace-mobile-deliveries-btn,.htrace-mobile-delivery-sheet,.htrace-mobile-context{display:none}
@media(min-width:1101px) and (max-width:1120px){.htrace-delivery-list{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:1100px){.htrace-mobile-deliveries-btn{display:flex!important;width:min(100%,440px)!important;min-height:38px!important;margin:0 auto!important;align-items:center!important;justify-content:space-between!important;padding:7px 10px!important;border:1px solid #aeb4b9!important;border-radius:9px!important;background:#fff!important;color:#111!important;font-size:.54rem!important;font-weight:900!important}.htrace-mobile-deliveries-btn span{min-width:24px;height:24px;display:grid;place-items:center;border:1px solid #aeb4b9;border-radius:999px;background:#f1f2f3}.htrace-mobile-delivery-sheet{display:block;position:fixed;inset:0;z-index:10000040;padding:max(12px,env(safe-area-inset-top)) max(12px,env(safe-area-inset-right)) max(12px,env(safe-area-inset-bottom)) max(12px,env(safe-area-inset-left));box-sizing:border-box;background:#fff;overflow:auto}.htrace-mobile-delivery-sheet[hidden]{display:none!important}.htrace-mobile-sheet-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding-bottom:10px;border-bottom:1px solid #c6cbd0}.htrace-mobile-sheet-head strong{color:#111;font-size:.76rem}.htrace-mobile-sheet-head button{width:38px!important;height:38px!important;min-height:38px!important;padding:0!important;border:1px solid #aeb4b9!important;border-radius:9px!important;background:#fff!important;color:#111!important;font-size:1.1rem!important}.htrace-mobile-delivery-list{display:flex;flex-direction:column;gap:7px;margin-top:10px}.htrace-mobile-delivery-row,.htrace-mobile-item-row{width:100%!important;min-height:62px!important;padding:9px 10px!important;display:flex!important;align-items:center!important;justify-content:space-between!important;gap:10px!important;border:1px solid #aeb4b9!important;border-radius:10px!important;background:#fff!important;color:#111!important;text-align:left!important}.htrace-mobile-delivery-row b,.htrace-mobile-item-row b{display:block;font-size:.67rem}.htrace-mobile-delivery-row small,.htrace-mobile-item-row small{display:block;margin-top:3px;color:#777;font-size:.54rem}.htrace-mobile-item-row strong{flex:0 0 auto;color:#111;font-size:.52rem}.htrace-mobile-context{display:flex;width:min(100%,440px);margin:0 auto;align-items:center;justify-content:space-between;gap:8px;padding:7px 9px;box-sizing:border-box;border:1px solid #9fa6ab;border-radius:9px;background:#f1f2f3}.htrace-mobile-context[hidden]{display:none!important}.htrace-mobile-context span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#333;font-size:.53rem;font-weight:850}.htrace-mobile-context button{width:28px!important;height:28px!important;min-height:28px!important;padding:0!important;border:1px solid #aeb4b9!important;border-radius:8px!important;background:#fff!important;color:#111!important}.htrace-delivery-hub{display:none!important}}
</style>

<style id="ichef-haccp-mobile-direct-sector-v1">
.haccp-mobile-secure-gate{
    display:none;
}

@media(max-width:1100px){
    /* Sur téléphone, le collaborateur ne choisit jamais librement son secteur. */
    #login-step-1{
        display:none !important;
    }

    .haccp-mobile-secure-gate{
        width:min(420px,calc(100% - 28px));
        box-sizing:border-box;
        margin:0 auto;
        padding:18px;
        border:1px solid #aeb4b9;
        border-radius:16px;
        background:#ffffff;
        color:#111111;
        text-align:center;
    }

    .haccp-mobile-secure-gate[hidden]{
        display:none !important;
    }

    .haccp-mobile-secure-gate:not([hidden]){
        display:flex !important;
        flex-direction:column;
        align-items:center;
        gap:9px;
    }

    .haccp-mobile-secure-icon{
        width:66px;
        height:66px;
        display:grid;
        place-items:center;
        border:1px solid #aeb4b9;
        border-radius:16px;
        background:#f1f2f3;
        color:#111;
        font-size:.63rem;
        font-weight:950;
        letter-spacing:1px;
    }

    .haccp-mobile-secure-gate strong{
        font-size:1rem;
        color:#111;
    }

    .haccp-mobile-secure-gate p{
        margin:0;
        max-width:310px;
        color:#666;
        font-size:.67rem;
        line-height:1.45;
    }

    .haccp-mobile-secure-gate button{
        width:100% !important;
        min-height:48px !important;
        margin-top:4px !important;
        border:1px solid #111 !important;
        border-radius:11px !important;
        background:#111 !important;
        color:#fff !important;
        font-size:.66rem !important;
        font-weight:950 !important;
    }

    /* Évite le flash des boutons secteurs pendant la validation Staff. */
    body:not(.haccp-cleaning-express-mobile):not(.haccp-express-mobile):not(.haccp-trace-express-mobile)
    #login-screen #login-step-1{
        visibility:hidden !important;
    }
}
</style>


<script id="ichef-haccp-real-phone-detection-v2">
(() => {
    "use strict";

    function syncHaccpDeviceClass() {
        let phone = false;
        try {
            phone = typeof haccpIsPhoneMode === "function"
                ? haccpIsPhoneMode()
                : window.matchMedia("(max-width:1100px)").matches;
        } catch (_) {}

        document.body.classList.toggle("haccp-real-phone", !!phone);

        if (phone && window.ICHEF_HACCP?.authenticated) {
            // Si un module desktop était visible, bascule immédiatement
            // vers sa version Express correspondante.
            const tempActive = document.getElementById("mod-temp")?.classList.contains("active");
            const cleaningActive = document.getElementById("mod-cleaning")?.classList.contains("active");
            const traceActive = document.getElementById("mod-trace")?.classList.contains("active");

            if (tempActive && typeof hxEnterExpress === "function") {
                hxEnterExpress(true);
            } else if (cleaningActive && typeof hcleanEnterExpress === "function") {
                hcleanEnterExpress(true);
            } else if (traceActive && typeof htraceEnterExpress === "function") {
                htraceEnterExpress(true);
            }
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", syncHaccpDeviceClass, {once:true});
    } else {
        syncHaccpDeviceClass();
    }

    window.addEventListener("pageshow", syncHaccpDeviceClass);
    window.addEventListener("resize", syncHaccpDeviceClass, {passive:true});
    window.addEventListener("orientationchange", syncHaccpDeviceClass, {passive:true});
})();
</script>


<style id="ichef-haccp-real-phone-ui-v2">
/* ==========================================================
   TÉLÉPHONE : JAMAIS LE COCKPIT ORDINATEUR COMPRESSÉ
   ========================================================== */

body.haccp-real-phone{
    width:100% !important;
    max-width:100% !important;
    min-width:0 !important;
    overflow-x:hidden !important;
    background:#ffffff !important;
}

body.haccp-real-phone .nav-haccp,
body.haccp-real-phone #haccp-regulatory-banner,
body.haccp-real-phone #ichef-system-link-panel,
body.haccp-real-phone #ichef-haccp-v41-build,
body.haccp-real-phone #ichef-v53-build{
    display:none !important;
}

/* Les interfaces ordinateur ne doivent jamais apparaître sur téléphone. */
body.haccp-real-phone .hd-temp-hub,
body.haccp-real-phone .hd-temp-history-card,
body.haccp-real-phone .hd-legacy-temp-card,
body.haccp-real-phone .htrace-desktop,
body.haccp-real-phone .htrace-delivery-hub{
    display:none !important;
}

body.haccp-real-phone .content{
    width:100% !important;
    min-width:0 !important;
    max-width:100% !important;
    height:100dvh !important;
    min-height:100dvh !important;
    margin:0 !important;
    padding:0 !important;
    overflow:hidden !important;
}

/* Température Express */
body.haccp-real-phone.haccp-express-mobile #mod-temp{
    display:block !important;
    width:100% !important;
    min-width:0 !important;
    max-width:100% !important;
    height:100dvh !important;
    margin:0 !important;
    padding:0 !important;
    overflow:hidden !important;
}

body.haccp-real-phone.haccp-express-mobile #mod-temp > .card{
    display:none !important;
}

body.haccp-real-phone.haccp-express-mobile .haccp-express-temp{
    display:flex !important;
}

/* Nettoyage Express */
body.haccp-real-phone.haccp-cleaning-express-mobile #mod-cleaning{
    display:block !important;
    width:100% !important;
    min-width:0 !important;
    max-width:100% !important;
    height:100dvh !important;
    margin:0 !important;
    padding:0 !important;
    overflow:hidden !important;
}

body.haccp-real-phone.haccp-cleaning-express-mobile #mod-cleaning > .card{
    display:none !important;
}

body.haccp-real-phone.haccp-cleaning-express-mobile .hclean-express{
    display:flex !important;
}

/* Traçabilité Express */
body.haccp-real-phone.haccp-trace-express-mobile #mod-trace{
    display:block !important;
    width:100% !important;
    min-width:0 !important;
    max-width:100% !important;
    height:100dvh !important;
    margin:0 !important;
    padding:0 !important;
    overflow:hidden !important;
}

body.haccp-real-phone.haccp-trace-express-mobile .htrace-express{
    display:flex !important;
}

/* Confort tactile et lecture */
body.haccp-real-phone input,
body.haccp-real-phone select,
body.haccp-real-phone textarea{
    font-size:16px !important; /* empêche le zoom automatique iPhone */
}

body.haccp-real-phone .hx-top,
body.haccp-real-phone .hclean-top,
body.haccp-real-phone .htrace-top{
    padding-top:2px !important;
}

body.haccp-real-phone #hx-equipment,
body.haccp-real-phone #hclean-zone{
    font-size:clamp(1.65rem,8vw,2.4rem) !important;
    line-height:1.05 !important;
}

body.haccp-real-phone .hx-temp-input-wrap{
    min-height:96px !important;
}

body.haccp-real-phone #hx-temp{
    font-size:clamp(3.2rem,17vw,4.8rem) !important;
}

body.haccp-real-phone .hx-mic,
body.haccp-real-phone .hx-save,
body.haccp-real-phone .htrace-save{
    min-height:54px !important;
}

body.haccp-real-phone .hclean-actions button{
    min-height:96px !important;
}

/* Pas de scrolling horizontal, même si un ancien composant a une largeur fixe. */
body.haccp-real-phone *,
body.haccp-real-phone *::before,
body.haccp-real-phone *::after{
    max-width:100%;
    box-sizing:border-box;
}
</style>


<style id="ichef-haccp-phone-sso-v59-style">
/* iCHEF HACCP V5.9 — vrai mode téléphone, session unique, gros tactile */
.haccp-phone-appbar,.haccp-phone-dock{display:none}
@media(max-width:1100px){
  body.haccp-real-phone{background:#f4f5f6!important;color:#111!important;padding-top:0!important}
  body.haccp-real-phone .nav-haccp{display:none!important}
  body.haccp-real-phone #haccp-regulatory-banner,
  body.haccp-real-phone #ichef-system-link-panel,
  body.haccp-real-phone #ichef-haccp-v41-build,
  body.haccp-real-phone #ichef-v53-build{display:none!important}

  body.haccp-real-phone .haccp-phone-appbar:not([hidden]){
    position:fixed;top:0;left:0;right:0;z-index:1000020;
    height:calc(58px + env(safe-area-inset-top));
    padding:max(8px,env(safe-area-inset-top)) 12px 8px;
    box-sizing:border-box;display:grid!important;
    grid-template-columns:auto minmax(0,1fr) 12px;align-items:end;gap:10px;
    background:rgba(255,255,255,.97);border-bottom:1px solid #d7dadd;
    color:#111;backdrop-filter:blur(14px)
  }
  .haccp-phone-brand{font-size:14px;font-weight:950;letter-spacing:.7px;white-space:nowrap}
  .haccp-phone-brand span{font-weight:750;color:#666}
  .haccp-phone-identity{min-width:0;display:flex;align-items:baseline;justify-content:flex-end;gap:7px;overflow:hidden}
  .haccp-phone-identity strong{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px;color:#111}
  .haccp-phone-identity span{flex:0 0 auto;font-size:11px;font-weight:900;color:#61666b;text-transform:uppercase}
  .haccp-phone-online{width:9px;height:9px;border-radius:999px;background:#2fba73;margin-bottom:4px;box-shadow:0 0 0 3px rgba(47,186,115,.12)}
  .haccp-phone-online.degraded{background:#d6a031;box-shadow:0 0 0 3px rgba(214,160,49,.12)}

  body.haccp-real-phone .haccp-phone-dock:not([hidden]){
    position:fixed;left:8px;right:8px;bottom:max(8px,env(safe-area-inset-bottom));z-index:1000030;
    height:66px;box-sizing:border-box;display:grid!important;grid-template-columns:repeat(4,1fr);gap:5px;
    padding:5px;border:1px solid #d3d7da;border-radius:17px;background:rgba(255,255,255,.98);
    box-shadow:0 12px 36px rgba(0,0,0,.18);backdrop-filter:blur(16px)
  }
  .haccp-phone-dock button{
    min-width:0!important;min-height:54px!important;margin:0!important;padding:5px 2px!important;
    display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:3px!important;
    border:0!important;border-radius:12px!important;background:transparent!important;color:#5c6267!important;
    font-family:Inter,sans-serif!important;touch-action:manipulation!important
  }
  .haccp-phone-dock button span{font-size:18px!important;line-height:18px!important;font-weight:800!important}
  .haccp-phone-dock button b{font-size:10px!important;line-height:11px!important;letter-spacing:.15px!important}
  .haccp-phone-dock button.active{background:#111!important;color:#fff!important}

  body.haccp-real-phone .content{
    padding-top:calc(66px + env(safe-area-inset-top))!important;
    padding-bottom:calc(88px + env(safe-area-inset-bottom))!important;
    padding-left:10px!important;padding-right:10px!important;
    box-sizing:border-box!important;overflow-y:auto!important;overflow-x:hidden!important
  }
  body.haccp-real-phone input,
  body.haccp-real-phone select,
  body.haccp-real-phone textarea{font-size:16px!important;min-height:48px!important;border-radius:11px!important}
  body.haccp-real-phone .btn-empire,
  body.haccp-real-phone .btn-catalog,
  body.haccp-real-phone .btn-file,
  body.haccp-real-phone .inventory-secondary-btn{min-height:48px!important;font-size:13px!important;border-radius:11px!important}
  body.haccp-real-phone .card{padding:12px!important;border-radius:14px!important}

  /* Express : la navigation reste toujours accessible sans bandeau horizontal. */
  body.haccp-real-phone.haccp-express-mobile .content,
  body.haccp-real-phone.haccp-cleaning-express-mobile .content,
  body.haccp-real-phone.haccp-trace-express-mobile .content{
    padding-top:calc(66px + env(safe-area-inset-top))!important;
    padding-bottom:calc(88px + env(safe-area-inset-bottom))!important
  }

  /* Sur téléphone, le clavier PIN HACCP n'est jamais présenté. */
  body.haccp-real-phone #login-step-1,
  body.haccp-real-phone #login-step-2{display:none!important}
  body.haccp-real-phone #login-screen{
    padding:max(18px,env(safe-area-inset-top)) 14px max(18px,env(safe-area-inset-bottom))!important;
    justify-content:center!important;background:#f4f5f6!important;color:#111!important
  }
  body.haccp-real-phone #login-screen .logo-container{margin:0 0 18px!important}
  body.haccp-real-phone #login-screen .ichef-title{color:#111!important;font-size:32px!important}
  body.haccp-real-phone #login-screen .ichef-subtitle{color:#666!important;font-size:14px!important}
  body.haccp-real-phone #login-screen .login-reg-profile{display:none!important}
  body.haccp-real-phone .haccp-mobile-secure-gate{box-shadow:0 16px 44px rgba(0,0,0,.09)!important}
  body.haccp-real-phone .haccp-mobile-secure-gate strong{font-size:18px!important}
  body.haccp-real-phone .haccp-mobile-secure-gate p{font-size:14px!important;line-height:1.45!important}
  body.haccp-real-phone .haccp-mobile-secure-gate button{min-height:54px!important;font-size:13px!important}
}
@media(max-width:370px){
  .haccp-phone-brand{font-size:12px}.haccp-phone-identity strong{font-size:11px}.haccp-phone-identity span{font-size:9px}
  .haccp-phone-dock button b{font-size:9px!important}
}
</style>
<script id="ichef-haccp-phone-sso-v59-js">
(() => {
  "use strict";

  function phoneMode(){
    try{return typeof haccpIsPhoneMode === "function" ? haccpIsPhoneMode() : window.matchMedia("(max-width:1100px)").matches}catch(_){return false}
  }

  function setPhoneTab(key){
    document.querySelectorAll("[data-haccp-phone-tab]").forEach(btn=>btn.classList.toggle("active",btn.dataset.haccpPhoneTab===key));
  }

  window.haccpPhoneOpen = function(key){
    if(!window.ICHEF_HACCP?.authenticated)return;

    // Une seule source de vérité : on active d'abord le vrai module HACCP.
    // Cela évite de laisser Stock/Nettoyage/Traçabilité actif derrière Température Express.
    document.body.classList.remove("haccp-express-mobile","haccp-cleaning-express-mobile","haccp-trace-express-mobile");

    const moduleId = key === "inventory" ? "inventaire" : key;
    if(typeof showModule === "function"){
      showModule(moduleId);
    }else{
      document.querySelectorAll(".module").forEach(m=>m.classList.remove("active"));
      document.getElementById("mod-" + moduleId)?.classList.add("active");
    }

    // showModule() ouvre déjà les interfaces Express sur téléphone.
    // Les appels ci-dessous servent uniquement de filet de sécurité si une ancienne
    // version de showModule est encore en cache dans le navigateur.
    if(key === "temp" && typeof hxEnterExpress === "function" && !document.body.classList.contains("haccp-express-mobile")){
      hxEnterExpress(true);
    }else if(key === "cleaning" && typeof hcleanEnterExpress === "function" && !document.body.classList.contains("haccp-cleaning-express-mobile")){
      hcleanEnterExpress(true);
    }else if(key === "trace" && typeof htraceEnterExpress === "function" && !document.body.classList.contains("haccp-trace-express-mobile")){
      htraceEnterExpress(true);
    }

    setPhoneTab(key);

    const content = document.querySelector(".content");
    try{content?.scrollTo({top:0,left:0,behavior:"auto"})}catch(_){ }
    try{window.scrollTo({top:0,left:0,behavior:"auto"})}catch(_){ }

    // Sur Température, le champ est immédiatement prêt pour une saisie terrain.
    if(key === "temp"){
      setTimeout(()=>{
        try{document.getElementById("hx-temp")?.focus({preventScroll:true})}catch(_){ }
      },60);
    }
  };

  function syncShell(){
    const phone=phoneMode();
    const authenticated=!!window.ICHEF_HACCP?.authenticated;
    const app=document.getElementById("haccp-phone-appbar");
    const dock=document.getElementById("haccp-phone-dock");
    if(!phone||!authenticated){if(app)app.hidden=true;if(dock)dock.hidden=true;return}

    if(app)app.hidden=false;if(dock)dock.hidden=false;
    const user=document.getElementById("haccp-phone-user");
    const sector=document.getElementById("haccp-phone-sector");
    if(user)user.textContent=String(window.ICHEF_HACCP?.userName||"Collaborateur");
    if(sector)sector.textContent=String(window.ICHEF_HACCP?.department||"Secteur");

    const temp=document.getElementById("mod-temp")?.classList.contains("active")||document.body.classList.contains("haccp-express-mobile");
    const clean=document.getElementById("mod-cleaning")?.classList.contains("active")||document.body.classList.contains("haccp-cleaning-express-mobile");
    const trace=document.getElementById("mod-trace")?.classList.contains("active")||document.body.classList.contains("haccp-trace-express-mobile");
    const inv=document.getElementById("mod-inventory")?.classList.contains("active")||document.getElementById("mod-inventaire")?.classList.contains("active");
    setPhoneTab(temp?"temp":clean?"cleaning":trace?"trace":inv?"inventory":"cleaning");
  }

  const originalSetSyncStatus=window.setSyncStatus;
  // setSyncStatus est une déclaration globale dans le script principal.
  if(typeof setSyncStatus==="function"){
    const base=setSyncStatus;
    window.setSyncStatus=function(state,text){base(state,text);const dot=document.getElementById("haccp-phone-online");if(dot)dot.classList.toggle("degraded",state!=="online")};
  }

  document.addEventListener("click",()=>setTimeout(syncShell,0),true);
  window.addEventListener("pageshow",()=>setTimeout(syncShell,40));
  window.addEventListener("resize",()=>setTimeout(syncShell,40));
  document.addEventListener("DOMContentLoaded",()=>{
    setTimeout(syncShell,80);
    const observer=new MutationObserver(()=>syncShell());
    observer.observe(document.body,{attributes:true,attributeFilter:["class"]});
  },{once:true});

  // Les fonctions d'activation changent l'état après des appels async ; un petit
  // observateur périodique court uniquement pendant les premières secondes.
  let tries=0;
  const boot=setInterval(()=>{syncShell();if(++tries>40||window.ICHEF_HACCP?.authenticated)clearInterval(boot)},150);
})();
</script>


<style id="ichef-haccp-temp-photo-v62">
.hx-photo-actions{width:min(100%,390px);margin:0 auto;display:grid;grid-template-columns:minmax(0,1fr) 48px;gap:8px}
.hx-photo-retention-note{width:min(100%,390px);margin:5px auto 0;color:#6f7d8d;font-size:.58rem;line-height:1.35;text-align:center}
.hx-photo-btn,.hx-photo-clear{min-height:44px;border:1px solid #2b394b;border-radius:12px;background:#0d141d;color:#dbe5ef;font-weight:900;font-size:.72rem;letter-spacing:.25px;cursor:pointer;touch-action:manipulation}
.hx-photo-clear{font-size:1.05rem;color:#ff7e91}
.hx-temp-photo-proof{width:min(100%,390px);margin:0 auto;display:grid;grid-template-columns:68px minmax(0,1fr);gap:10px;align-items:center;padding:8px;border:1px solid rgba(61,214,160,.28);border-radius:12px;background:rgba(61,214,160,.045);box-sizing:border-box;text-align:left}
.hx-temp-photo-proof[hidden]{display:none!important}
.hx-temp-photo-proof img{width:68px;height:52px;object-fit:cover;border-radius:8px;border:1px solid #2a3748;background:#000}
.hx-temp-photo-proof strong{display:block;color:#6eddb5;font-size:.63rem;letter-spacing:.55px}
.hx-temp-photo-proof span{display:block;margin-top:3px;color:#9cacbd;font-size:.63rem;line-height:1.35}
.temp-proof-badge{display:inline-flex;margin-top:5px;padding:4px 7px;border:1px solid rgba(61,214,160,.32);border-radius:999px;color:#62d7ac;background:rgba(61,214,160,.045);font-size:.58rem;font-weight:900}
.temp-proof-action{border-color:rgba(61,214,160,.35)!important;color:#73dcb7!important}
@media(max-width:1100px){
 body.haccp-express-mobile .hx-photo-btn,body.haccp-express-mobile .hx-photo-clear{background:#fff!important;color:#111!important;border-color:#bfc5ca!important}
 body.haccp-express-mobile .hx-temp-photo-proof{background:#f7f8f8!important;border-color:#cfd4d8!important}
 body.haccp-express-mobile .hx-temp-photo-proof strong{color:#167a55!important}
 body.haccp-express-mobile .hx-temp-photo-proof span{color:#5f6368!important}
 .temp-photo-desktop-control{display:none!important}
}
</style>
<script id="ichef-haccp-temp-photo-v62-js">
(() => {
  "use strict";

  const state = {
    pending: null,
    tesseractPromise: null,
    tesseractWorkerPromise: null,
    ocrBusy: false
  };

  const $ = id => document.getElementById(id);

  function setPhotoStatus(text, kind="neutral"){
    const el=$("hx-temp-photo-status");
    if(el) el.textContent=text;
    const desk=$("temp-photo-desktop-status");
    if(desk) desk.textContent=text;
    const proof=$("hx-temp-photo-proof");
    if(proof) proof.dataset.state=kind;
  }

  function syncPreview(){
    const proof=$("hx-temp-photo-proof");
    const preview=$("hx-temp-photo-preview");
    const clear=$("hx-temp-photo-clear");
    if(!state.pending?.imgData){
      if(proof) proof.hidden=true;
      if(preview) preview.removeAttribute("src");
      if(clear) clear.hidden=true;
      return;
    }
    if(preview) preview.src=state.pending.imgData;
    if(proof) proof.hidden=false;
    if(clear) clear.hidden=false;
  }

  function clearPending(message="Aucune photo sélectionnée."){
    state.pending=null;
    const inp=$("hx-temp-photo-input"); if(inp) inp.value="";
    syncPreview();
    setPhotoStatus(message);
  }

  async function compressEvidence(file){
    return await new Promise((resolve,reject)=>{
      const reader=new FileReader();
      reader.onerror=reject;
      reader.onload=e=>{
        const img=new Image();
        img.onerror=reject;
        img.onload=()=>{
          try{
            let maxSide=680;
            let quality=.52;
            let output="";
            for(let pass=0;pass<4;pass++){
              const scale=Math.min(1,maxSide/Math.max(img.width,img.height));
              const c=document.createElement("canvas");
              c.width=Math.max(1,Math.round(img.width*scale));
              c.height=Math.max(1,Math.round(img.height*scale));
              const ctx=c.getContext("2d");
              ctx.drawImage(img,0,0,c.width,c.height);
              output=c.toDataURL("image/jpeg",quality);
              // ~120 000 caractères base64 ≈ 90 Ko binaires.
              if(output.length<=120000) break;
              maxSide=Math.max(420,Math.round(maxSide*.82));
              quality=Math.max(.36,quality-.06);
            }
            resolve(output);
          }catch(err){reject(err)}
        };
        img.src=e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  async function dataUrlToBlob(dataUrl){
    const r=await fetch(dataUrl); return await r.blob();
  }

  async function preprocessForOcr(dataUrl){
    const img=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src=dataUrl;});
    const scale=Math.min(2.2,1400/Math.max(1,img.width));
    const c=document.createElement("canvas");
    c.width=Math.max(1,Math.round(img.width*scale));c.height=Math.max(1,Math.round(img.height*scale));
    const ctx=c.getContext("2d",{willReadFrequently:true});ctx.drawImage(img,0,0,c.width,c.height);
    const d=ctx.getImageData(0,0,c.width,c.height);const a=d.data;
    for(let i=0;i<a.length;i+=4){
      const g=Math.round(a[i]*.299+a[i+1]*.587+a[i+2]*.114);
      const v=g<110?0:g>205?255:Math.max(0,Math.min(255,Math.round((g-110)*2.7)));
      a[i]=a[i+1]=a[i+2]=v;
    }
    ctx.putImageData(d,0,0);
    return c.toDataURL("image/png");
  }

  function parseTemperature(text){
    const raw=String(text||"").replace(/[Oo]/g,"0").replace(/[−–—]/g,"-").replace(/,/g,".");
    const matches=[...raw.matchAll(/-?\d{1,3}(?:\.\d{1,2})?/g)].map(m=>({raw:m[0],value:Number(m[0])})).filter(x=>Number.isFinite(x.value)&&x.value>=-80&&x.value<=250);
    if(!matches.length) return null;
    const scored=matches.map(x=>{
      let score=0;
      if(x.raw.includes(".")) score+=5;
      if(x.value>=-40&&x.value<=80) score+=4;
      if(Math.abs(x.value)<=40) score+=2;
      if(/°|c/i.test(raw.slice(Math.max(0,raw.indexOf(x.raw)-3),raw.indexOf(x.raw)+x.raw.length+4))) score+=4;
      return {...x,score};
    }).sort((a,b)=>b.score-a.score);
    return scored[0];
  }

  async function nativeTextDetect(dataUrl){
    if(!(window.TextDetector)) return null;
    try{
      const blob=await dataUrlToBlob(dataUrl);const bitmap=await createImageBitmap(blob);const detector=new TextDetector();
      const blocks=await detector.detect(bitmap);bitmap.close?.();
      const text=blocks.map(b=>b.rawValue||"").join(" ");
      return text?{text,engine:"NATIVE_TEXT_DETECTOR"}:null;
    }catch(_){return null}
  }

  function loadTesseract(){
    if(window.Tesseract) return Promise.resolve(window.Tesseract);
    if(state.tesseractPromise) return state.tesseractPromise;
    state.tesseractPromise=new Promise((resolve,reject)=>{
      const sc=document.createElement("script");
      sc.src="https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js";
      sc.async=true;sc.onload=()=>resolve(window.Tesseract);sc.onerror=()=>reject(new Error("Moteur OCR indisponible"));
      document.head.appendChild(sc);
    });
    return state.tesseractPromise;
  }

  async function getTesseractWorker(){
    if(state.tesseractWorkerPromise) return state.tesseractWorkerPromise;
    state.tesseractWorkerPromise=(async()=>{
      const T=await loadTesseract();
      const worker=await T.createWorker("eng");
      await worker.setParameters({tessedit_char_whitelist:"0123456789.,-°C"});
      return worker;
    })();
    try{return await state.tesseractWorkerPromise}catch(err){state.tesseractWorkerPromise=null;throw err}
  }

  async function tesseractDetect(dataUrl){
    const processed=await preprocessForOcr(dataUrl);
    const worker=await getTesseractWorker();
    const out=await worker.recognize(processed);
    const text=String(out?.data?.text||"").trim();
    return {text,engine:"TESSERACT_LOCAL"};
  }

  function applyDetectedValue(value, sourceText, engine){
    if(!Number.isFinite(value)) return;
    const hx=$("hx-temp"); if(hx) hx.value=String(value);
    const legacy=$("temp-val"); if(legacy) legacy.value=String(value);
    try{hx?.dispatchEvent(new Event("input",{bubbles:true}))}catch(_){}
    if(state.pending){state.pending.ocrValue=value;state.pending.ocrText=sourceText||"";state.pending.ocrEngine=engine||"";}
    setPhotoStatus(`Détecté : ${value.toLocaleString("fr-FR")} °C · vérifiez puis ENREGISTRER`,"ok");
    const confirm=$("hx-confirm");if(confirm)confirm.textContent=`📷 ${value.toLocaleString("fr-FR")} °C détecté sur la photo · confirmation humaine requise`;
  }

  async function analyzePhoto(){
    if(!state.pending?.imgData||state.ocrBusy)return;
    state.ocrBusy=true;setPhotoStatus("Lecture automatique de l’écran du thermomètre…","busy");
    try{
      let result=await nativeTextDetect(state.pending.imgData);
      let parsed=result?parseTemperature(result.text):null;
      if(!parsed){
        result=await tesseractDetect(state.pending.imgData);
        parsed=parseTemperature(result?.text||"");
      }
      state.pending.ocrText=result?.text||"";state.pending.ocrEngine=result?.engine||"";
      if(parsed){applyDetectedValue(parsed.value,state.pending.ocrText,state.pending.ocrEngine)}
      else{
        state.pending.ocrValue=null;
        setPhotoStatus("Photo conservée · température non lue automatiquement. Saisissez la valeur puis ENREGISTRER.","review");
      }
    }catch(err){
      console.warn("[iCHEF HACCP] OCR température :",err);
      setPhotoStatus("Photo conservée · lecture automatique indisponible. Saisissez la valeur puis ENREGISTRER.","review");
    }finally{state.ocrBusy=false}
  }

  async function handleFile(file){
    if(!file)return;
    setPhotoStatus("Compression de la photo…","busy");
    try{
      const imgData=await compressEvidence(file);
      state.pending={imgData,fileName:file.name||"thermometre.jpg",capturedAt:new Date().toISOString(),ocrText:"",ocrValue:null,ocrEngine:""};
      syncPreview();
      await analyzePhoto();
    }catch(err){
      clearPending("Impossible de lire cette photo.");
      alert("Photo illisible. Reprenez une photo bien cadrée sur l’écran du thermomètre.");
    }
  }

  function openPicker(){const input=$("hx-temp-photo-input");if(input){input.value="";input.click();}}

  window.ICHEF_TEMP_EVIDENCE={
    get pending(){return state.pending},
    openPicker,
    clearAfterSave(){clearPending("Photo enregistrée avec le relevé.")},
    clear(){clearPending()}
  };

  window.viewTemperaturePhoto=function(id){
    const items=(typeof db!=="undefined"&&Array.isArray(db?.temp))?db.temp:[];
    const item=items.find(x=>String(x.id)===String(id));
    if(!item?.tempPhotoData)return;
    const img=$("photo-viewer-img");if(img)img.src=item.tempPhotoData;
    $("photo-modal")?.classList.add("open");
  };

  function safeFileName(value){return String(value||"temperature").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9_-]+/gi,"_").replace(/^_+|_+$/g,"").slice(0,80)||"temperature"}
  function wrapCanvasText(ctx,text,x,y,maxWidth,lineHeight,maxLines=4){
    const words=String(text||"").split(/\s+/);let line="",lines=[];
    for(const word of words){const test=line?line+" "+word:word;if(ctx.measureText(test).width>maxWidth&&line){lines.push(line);line=word}else line=test}
    if(line)lines.push(line);lines=lines.slice(0,maxLines);lines.forEach((l,i)=>ctx.fillText(l,x,y+i*lineHeight));return y+lines.length*lineHeight;
  }
  async function proofCanvas(item){
    const c=document.createElement("canvas");c.width=1240;c.height=1754;const ctx=c.getContext("2d");
    ctx.fillStyle="#fff";ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle="#111";
    ctx.font="900 54px Arial";ctx.fillText("iCHEF HACCP",70,90);ctx.font="700 28px Arial";ctx.fillText("PREUVE DE RELEVÉ DE TEMPÉRATURE",70,138);
    ctx.strokeStyle="#111";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(70,165);ctx.lineTo(1170,165);ctx.stroke();
    let y=225;ctx.font="700 25px Arial";
    const rows=[
      ["Équipement",item.eq],["Température confirmée",`${Number(item.val).toLocaleString("fr-FR")} °C`],["Statut",item.status],["Date / heure",`${item.date} ${item.time}`],["Secteur",item.dept],["Utilisateur",String(item.audit||"").replace(/^Saisi par\s*/i,"")],["Profil réglementaire",item.regulatoryProfileApplied||item.regulatoryProfile||"—"]
    ];
    for(const [lab,val] of rows){ctx.fillStyle="#555";ctx.font="700 22px Arial";ctx.fillText(lab.toUpperCase(),70,y);ctx.fillStyle="#111";ctx.font="800 30px Arial";y=wrapCanvasText(ctx,val||"—",70,y+38,1100,36,2)+22;}
    if(Number.isFinite(Number(item.tempOcrValue))){ctx.fillStyle="#166b4a";ctx.font="800 25px Arial";ctx.fillText(`LECTURE PHOTO DÉTECTÉE : ${Number(item.tempOcrValue).toLocaleString("fr-FR")} °C · VALEUR CONFIRMÉE PAR L’UTILISATEUR`,70,y);y+=48;}
    if(item.tempPhotoData){
      const img=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src=item.tempPhotoData});
      const boxX=70,boxY=y+15,boxW=1100,boxH=Math.min(720,1754-boxY-150);const sc=Math.min(boxW/img.width,boxH/img.height);const w=img.width*sc,h=img.height*sc;
      ctx.fillStyle="#f5f5f5";ctx.fillRect(boxX,boxY,boxW,boxH);ctx.drawImage(img,boxX+(boxW-w)/2,boxY+(boxH-h)/2,w,h);ctx.strokeStyle="#bbb";ctx.lineWidth=2;ctx.strokeRect(boxX,boxY,boxW,boxH);
      y=boxY+boxH+40;
    }
    const tid=(typeof tenantID!=="undefined"&&tenantID)?tenantID:(localStorage.getItem("ichef_tenant_id")||"");
    ctx.fillStyle="#555";ctx.font="20px Arial";ctx.fillText(`Preuve générée le ${new Date().toLocaleString("fr-FR")} · Établissement ${String(tid)}`,70,1690);
    return c;
  }
  function findTemp(id){const items=(typeof db!=="undefined"&&Array.isArray(db?.temp))?db.temp:[];return items.find(x=>String(x.id)===String(id))||null}
  window.downloadTemperatureProof=async function(id){
    const item=findTemp(id);if(!item)return;
    const c=await proofCanvas(item);c.toBlob(blob=>{if(!blob)return;const a=document.createElement("a");const u=URL.createObjectURL(blob);a.href=u;a.download=`HACCP_PREUVE_${safeFileName(item.eq)}_${String(item.date||"").replace(/\//g,"-")}.png`;a.click();setTimeout(()=>URL.revokeObjectURL(u),1500)},"image/png");
  };
  window.printTemperatureProof=async function(id){
    const item=findTemp(id);if(!item)return;const c=await proofCanvas(item);const url=c.toDataURL("image/png");
    const w=window.open("","_blank");if(!w)return alert("Autorisez les fenêtres pour imprimer la preuve.");
    try{w.opener=null}catch(_){}
    w.document.write(`<html><head><title>Preuve HACCP</title><style>@page{size:A4 portrait;margin:8mm}body{margin:0;background:#fff}img{width:100%;height:auto;display:block}</style></head><body><img src="${url}" onload="setTimeout(()=>window.print(),250)">

</body></html>`);w.document.close();
  };

  document.addEventListener("DOMContentLoaded",()=>{
    $("hx-temp-photo-btn")?.addEventListener("click",openPicker);
    $("hx-temp-photo-clear")?.addEventListener("click",()=>clearPending());
    $("hx-temp-photo-input")?.addEventListener("change",e=>handleFile(e.target.files?.[0]));
  },{once:true});
})();
</script>


<script id="ichef-haccp-temp-photo-retention-v63">
(() => {
  "use strict";
  async function runRetentionMaintenance(){
    try{
      if(!Array.isArray(window.db?.temp) && !(typeof db !== "undefined" && Array.isArray(db.temp))) return;
      const rows = (typeof db !== "undefined" && Array.isArray(db.temp)) ? db.temp : window.db.temp;
      const result = typeof applyTemperaturePhotoRetention === "function"
        ? applyTemperaturePhotoRetention(rows)
        : {changed:false,purged:0};
      if(result.changed && typeof scheduleTemperaturePhotoRetentionSync === "function"){
        scheduleTemperaturePhotoRetentionSync();
        try{ typeof renderLogs === "function" && renderLogs(); }catch(_){}
      }
    }catch(err){
      console.warn("[iCHEF HACCP] Maintenance rétention photo :",err);
    }
  }
  document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")runRetentionMaintenance()});
  window.addEventListener("focus",runRetentionMaintenance);
  setInterval(runRetentionMaintenance, 6 * 60 * 60 * 1000);
})();
</script>



<style id="ichef-haccp-v7-mobile-reception-style">
/* iCHEF HACCP V7 — couche mobile métier. Aucun stock/fournisseur dupliqué. */
.hv7-only-phone{display:none!important}
.hv7-reception-shell{display:flex;flex-direction:column;gap:12px;min-height:0}
.hv7-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap}
.hv7-kicker{font-size:.62rem;font-weight:950;letter-spacing:.9px;color:var(--gold);text-transform:uppercase}
.hv7-title{margin:4px 0 0;font-size:1.08rem;color:#f8fafc;font-weight:950}
.hv7-sub{margin-top:5px;color:#8290a4;font-size:.7rem;line-height:1.45;max-width:760px}
.hv7-badges{display:flex;gap:6px;flex-wrap:wrap}
.hv7-badge{display:inline-flex;align-items:center;min-height:30px;padding:5px 9px;border:1px solid #2a3749;border-radius:999px;background:#0a0f16;color:#9cadbf;font-size:.58rem;font-weight:900}
.hv7-badge.ok{color:#66d9b1;border-color:rgba(61,214,160,.35)}
.hv7-badge.warn{color:#e6ba65;border-color:rgba(215,173,88,.4)}
.hv7-reception-grid{display:grid;grid-template-columns:minmax(260px,.9fr) minmax(420px,1.6fr);gap:12px;min-height:0;flex:1}
.hv7-panel{border:1px solid #1d2939;border-radius:14px;background:#0b1018;min-width:0;overflow:hidden}
.hv7-panel-head{padding:12px 13px;border-bottom:1px solid #1d2939;display:flex;align-items:center;justify-content:space-between;gap:8px}
.hv7-panel-head strong{font-size:.72rem;color:#e8eef6}.hv7-panel-head span{font-size:.6rem;color:#738197}
.hv7-list{padding:9px;display:flex;flex-direction:column;gap:7px;max-height:62vh;overflow:auto}
.hv7-delivery-card{width:100%;border:1px solid #273548;border-radius:11px;background:#0d141e;color:#eef3f9;padding:10px 11px;text-align:left;cursor:pointer;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center}
.hv7-delivery-card.active{border-color:rgba(215,173,88,.65);background:rgba(215,173,88,.06)}
.hv7-delivery-card b{display:block;font-size:.72rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.hv7-delivery-card small{display:block;margin-top:3px;color:#7e8da2;font-size:.58rem;line-height:1.35}.hv7-delivery-card em{font-style:normal;color:#aab6c5;font-size:.57rem;font-weight:900}
.hv7-empty{padding:20px 12px;text-align:center;color:#6f7d91;font-size:.68rem;line-height:1.5}
.hv7-detail{padding:12px;display:flex;flex-direction:column;gap:10px;max-height:68vh;overflow:auto}
.hv7-detail[hidden]{display:none!important}
.hv7-order-title{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.hv7-order-title h3{margin:0;color:#fff;font-size:.9rem}.hv7-order-title p{margin:4px 0 0;color:#748398;font-size:.62rem}
.hv7-lines{display:flex;flex-direction:column;gap:8px}
.hv7-line{border:1px solid #202c3d;border-radius:11px;padding:10px;background:#090e15}
.hv7-line-top{display:flex;align-items:flex-start;justify-content:space-between;gap:9px}.hv7-line-top b{font-size:.7rem;color:#edf3f9}.hv7-line-top small{display:block;margin-top:3px;color:#708097;font-size:.56rem}.hv7-stock-link{flex:0 0 auto;padding:4px 7px;border-radius:999px;border:1px solid #374357;color:#8fa1b6;font-size:.5rem;font-weight:900}.hv7-stock-link.linked{color:#58cfa5;border-color:rgba(61,214,160,.34)}
.hv7-line-fields{display:grid;grid-template-columns:repeat(4,minmax(90px,1fr));gap:7px;margin-top:9px}.hv7-line-fields label{min-width:0}.hv7-line-fields span,.hv7-field-label{display:block;margin-bottom:4px;color:#6f7f94;font-size:.52rem;font-weight:900;text-transform:uppercase;letter-spacing:.4px}.hv7-line-fields input,.hv7-note{min-height:42px!important;padding:8px 9px!important;font-size:16px!important;border-radius:9px!important}
.hv7-line-actions{display:flex;gap:7px;margin-top:8px}.hv7-trace-btn,.hv7-anomaly-btn{min-height:38px;border-radius:9px;border:1px solid #2a394e;background:#0c131d;color:#cbd7e4;font-size:.57rem;font-weight:900;padding:7px 10px;cursor:pointer}.hv7-trace-btn{border-color:rgba(108,148,255,.42);color:#96afff}.hv7-anomaly-btn.active{border-color:rgba(255,100,124,.45);color:#ff8295;background:rgba(255,100,124,.06)}
.hv7-bl{display:grid;grid-template-columns:minmax(0,1fr) 112px;gap:9px;align-items:stretch}.hv7-bl-main{border:1px solid #202c3d;border-radius:11px;padding:10px}.hv7-photo-btn{width:100%;min-height:48px;border:1px dashed #3a4a61;border-radius:10px;background:#0a1018;color:#d8e2ee;font-weight:900;font-size:.65rem;cursor:pointer}.hv7-photo-meta{margin-top:6px;color:#6e7d90;font-size:.55rem;line-height:1.4}.hv7-photo-preview{border:1px solid #253247;border-radius:11px;overflow:hidden;background:#05070a;display:flex;align-items:center;justify-content:center;min-height:92px}.hv7-photo-preview img{width:100%;height:100%;min-height:92px;object-fit:cover}.hv7-photo-preview span{color:#59677a;font-size:.55rem;text-align:center;padding:8px}
.hv7-note{width:100%;box-sizing:border-box;resize:vertical;min-height:58px!important}
.hv7-validation{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center}.hv7-warning{color:#8d9aad;font-size:.57rem;line-height:1.4}.hv7-save{min-height:50px;border:0;border-radius:10px;padding:10px 16px;background:linear-gradient(135deg,#e0b85f,#bd8d34);color:#090b0f;font-size:.66rem;font-weight:950;letter-spacing:.45px;cursor:pointer}.hv7-save:disabled{opacity:.55;cursor:not-allowed}
.hv7-recent{display:flex;flex-direction:column;gap:6px}.hv7-recent-row{border:1px solid #1d2939;border-radius:9px;padding:8px 9px;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center}.hv7-recent-row b{font-size:.62rem}.hv7-recent-row small{display:block;color:#6f7e91;font-size:.53rem;margin-top:2px}.hv7-mini-actions{display:flex;gap:5px}.hv7-mini-actions button{min-height:34px;border:1px solid #2a374a;border-radius:8px;background:#0a0f16;color:#aab8c8;font-size:.52rem;font-weight:900;padding:6px 8px}

/* Home / more / catégories — uniquement téléphone */
.hv7-mobile-layer{position:fixed;inset:0;z-index:55000;background:#f4f5f6;color:#111;display:none;overflow:auto;padding:max(62px,env(safe-area-inset-top)) 12px calc(86px + env(safe-area-inset-bottom));box-sizing:border-box;-webkit-overflow-scrolling:touch}
.hv7-mobile-layer.open{display:block}.hv7-mobile-inner{width:min(100%,520px);margin:0 auto}.hv7-mobile-hero{display:flex;align-items:flex-end;justify-content:space-between;gap:10px;margin:4px 2px 14px}.hv7-mobile-hero h2{margin:0;font-size:22px}.hv7-mobile-hero p{margin:4px 0 0;color:#666;font-size:12px}.hv7-mobile-chip{padding:6px 9px;border-radius:999px;border:1px solid #c9cdd1;background:#fff;font-size:10px;font-weight:900;white-space:nowrap}
.hv7-home-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.hv7-home-card{min-height:118px;border:1px solid #c8ccd0;border-radius:14px;background:#fff;color:#111;padding:13px;text-align:left;display:flex;flex-direction:column;justify-content:space-between;cursor:pointer}.hv7-home-card strong{font-size:15px}.hv7-home-card span{font-size:25px;font-weight:950}.hv7-home-card small{font-size:11px;line-height:1.35;color:#666}.hv7-home-card .hv7-count{font-size:11px;font-weight:900;color:#555}.hv7-home-card.primary{border-color:#b49a62;background:#fffdf8}
.hv7-more-list,.hv7-cat-list{display:flex;flex-direction:column;gap:8px}.hv7-more-btn{min-height:58px;border:1px solid #c6cbd0;border-radius:12px;background:#fff;color:#111;text-align:left;padding:10px 12px;display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:14px;font-weight:850}.hv7-more-btn small{display:block;color:#747474;font-size:10px;font-weight:600;margin-top:2px}.hv7-layer-close{width:100%;min-height:50px;margin-top:12px;border:1px solid #bfc4c8;border-radius:11px;background:#fff;color:#111;font-weight:900}
.hv7-cat-toolbar{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-bottom:10px}.hv7-cat-toolbar select,.hv7-cat-toolbar input{background:#fff!important;color:#111!important;border-color:#c5c9cd!important;min-height:46px!important;font-size:16px!important}.hv7-cat-add{grid-column:1/-1;min-height:48px;border:0;border-radius:10px;background:#111;color:#fff;font-weight:900}.hv7-cat-group{border:1px solid #c7ccd0;border-radius:12px;background:#fff;overflow:hidden}.hv7-cat-group-head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 11px;border-bottom:1px solid #e1e3e5}.hv7-cat-group-head strong{font-size:13px}.hv7-cat-group-head button{border:1px solid #d0d3d6;background:#fff;border-radius:8px;min-height:34px;padding:5px 8px;font-size:10px}.hv7-cat-items{padding:7px 10px 10px;display:flex;flex-wrap:wrap;gap:6px}.hv7-cat-item{padding:6px 8px;border-radius:999px;border:1px solid #d3d6d8;background:#fafafa;font-size:10px}.hv7-cat-note{padding:10px 11px;border:1px solid #d3d6d9;border-radius:11px;background:#fff;color:#62666a;font-size:11px;line-height:1.45;margin-bottom:10px}

@media(max-width:1100px){
 .hv7-only-phone{display:block!important}
 body.haccp-v7-reception-mobile .nav-haccp{display:none!important}
 body.haccp-v7-reception-mobile .content{padding:0!important;overflow:hidden!important}
 body.haccp-v7-reception-mobile #mod-reception{display:flex!important;height:calc(100dvh - 122px)!important;padding:8px 9px calc(74px + env(safe-area-inset-bottom))!important;background:#f4f5f6!important;color:#111!important;overflow:auto!important}
 body.haccp-v7-reception-mobile #mod-reception .hv7-head{margin-bottom:0}
 body.haccp-v7-reception-mobile #mod-reception .hv7-title{color:#111;font-size:17px}
 body.haccp-v7-reception-mobile #mod-reception .hv7-sub{color:#666;font-size:11px}
 body.haccp-v7-reception-mobile #mod-reception .hv7-kicker{color:#876b31;font-size:10px}
 body.haccp-v7-reception-mobile #mod-reception .hv7-badge{background:#fff;color:#555;border-color:#cbd0d4;font-size:9px}
 body.haccp-v7-reception-mobile #mod-reception .hv7-badge.ok{color:#137b56;border-color:#9fcfbc}
 .hv7-reception-grid{grid-template-columns:1fr!important;gap:8px}.hv7-panel{background:#fff!important;border-color:#c8cdd1!important;border-radius:13px!important}.hv7-panel-head{border-color:#e2e4e6!important;padding:10px 11px!important}.hv7-panel-head strong{color:#111!important;font-size:12px!important}.hv7-panel-head span{color:#70757a!important;font-size:10px!important}.hv7-list{max-height:none;padding:7px}.hv7-delivery-card{background:#fff!important;color:#111!important;border-color:#c8cdd1!important;min-height:62px;padding:9px 10px}.hv7-delivery-card.active{border-color:#9a7b3f!important;background:#fffaf0!important}.hv7-delivery-card b{font-size:12px}.hv7-delivery-card small{font-size:10px;color:#6b7075}.hv7-delivery-card em{font-size:9px;color:#5f6469}.hv7-detail{max-height:none;padding:9px}.hv7-order-title h3{color:#111;font-size:14px}.hv7-order-title p{font-size:10px;color:#676c71}.hv7-line{background:#fff!important;border-color:#d0d4d7!important;padding:9px}.hv7-line-top b{color:#111;font-size:12px}.hv7-line-top small{font-size:9px;color:#70757a}.hv7-stock-link{font-size:8px;color:#666;border-color:#c8cdd0}.hv7-stock-link.linked{color:#147b57;border-color:#a3d0be}.hv7-line-fields{grid-template-columns:repeat(2,minmax(0,1fr))!important}.hv7-line-fields span,.hv7-field-label{font-size:9px;color:#676c71}.hv7-line-fields input,.hv7-note{background:#fff!important;color:#111!important;border-color:#c6cbd0!important}.hv7-trace-btn,.hv7-anomaly-btn{background:#fff;color:#111;border-color:#c5c9cd;min-height:42px;font-size:10px;flex:1}.hv7-trace-btn{color:#3158a5;border-color:#a9bce1}.hv7-bl{grid-template-columns:1fr 94px}.hv7-bl-main{border-color:#d0d4d7;background:#fff}.hv7-photo-btn{background:#fff;color:#111;border-color:#aeb5bb;min-height:50px}.hv7-photo-meta{font-size:9px;color:#6f7377}.hv7-photo-preview{border-color:#c8cdd1;background:#eee}.hv7-warning{font-size:9px;color:#666}.hv7-save{font-size:11px;min-height:52px}.hv7-validation{grid-template-columns:1fr}.hv7-recent-row{border-color:#d0d4d7;background:#fff}.hv7-recent-row b{font-size:11px}.hv7-recent-row small{font-size:9px}.hv7-mini-actions button{background:#fff;color:#111;border-color:#c4c9cd}
 .haccp-phone-dock{grid-template-columns:repeat(5,minmax(0,1fr))!important}.haccp-phone-dock button{min-width:0!important;padding:6px 2px!important}.haccp-phone-dock button b{font-size:8px!important}.haccp-phone-dock button span{font-size:18px!important}
}
@media(max-width:370px){.hv7-home-card{min-height:108px;padding:11px}.hv7-home-card strong{font-size:13px}.hv7-line-fields{grid-template-columns:1fr!important}.hv7-bl{grid-template-columns:1fr}.hv7-photo-preview{min-height:80px}}
</style>

<script id="ichef-haccp-v7-mobile-reception-js">
(() => {
  "use strict";
  const V7={deliveries:[],active:null,receipts:[],blPhoto:null,lastReceiptId:null,ready:false};
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
  const phone=()=>{try{return typeof haccpIsPhoneMode==="function"?haccpIsPhoneMode():matchMedia("(max-width:1100px)").matches}catch(_){return false}};
  const role=()=>String((typeof currentUser!=="undefined"&&currentUser?.role)||window.ICHEF_HACCP?.role||"").toUpperCase();
  const canManageCategories=()=>{try{return typeof isBoss==="function"?isBoss():["MASTER","ADMIN","MANAGER","DIRECTION","GERANT","OWNER","PATRON","CHEF","CHEF_CUISINE","CHEF_BAR","CHEF_PATISSERIE","RESPONSABLE","SUPERVISEUR"].some(r=>role().includes(r))}catch(_){return false}};
  const sessionToken=()=>{try{return typeof haccpSessionToken==="function"?haccpSessionToken():(sessionStorage.getItem("ichef_auth_token")||sessionStorage.getItem("ichef_access_token")||sessionStorage.getItem("ichef_chef_access_token")||sessionStorage.getItem("ichef_ops_token")||"")}catch(_){return ""}};
  const requestHeaders=(extra={})=>{let h={...extra};try{if(typeof systemHeaders==="function")h=systemHeaders(h)}catch(_){}const t=sessionToken();if(t&&!h.Authorization)h.Authorization="Bearer "+t;if(typeof tenantID!=="undefined"&&tenantID&&!h["X-iCHEF-Tenant"])h["X-iCHEF-Tenant"]=tenantID;if(typeof deviceId!=="undefined"&&deviceId&&!h["X-iCHEF-Device"])h["X-iCHEF-Device"]=deviceId;return h};
  async function api(path,opt={}){const r=await fetch(`${SERVER_URL}${path}`,{cache:"no-store",credentials:"omit",...opt,headers:requestHeaders({...(opt.body?{"Content-Type":"application/json"}:{}),...(opt.headers||{})})});const d=await r.json().catch(()=>({}));if(!r.ok||d.success===false)throw new Error(d.error||`Erreur ${r.status}`);return d}
  function currentSector(){const d=String((typeof currentDept!=="undefined"?currentDept:window.ICHEF_HACCP?.department)||"").toUpperCase();return d==="CUISINE"?"cuisine":d==="PATISSERIE"?"patisserie":d==="BAR"?"bar":d==="SERVICE"?"service":d==="ECONOMAT"?"economat":""}
  function remain(i={}){return Math.max(0,Number(i.quantity||0)-Number(i.receivedQuantity||0))}
  function mine(d={}){const s=currentSector(),k=String(d.sectorKey||"").toLowerCase();return !s||!k||k===s||k==="economat"||["MASTER","DIRECTION","MANAGER","ADMIN","GERANT","OWNER","PATRON"].includes(role())}
  function closeLayers(){["hv7-home","hv7-more","hv7-categories"].forEach(id=>$(id)?.classList.remove("open"))}
  function setDock(key){document.querySelectorAll("[data-haccp-phone-tab]").forEach(b=>b.classList.toggle("active",b.dataset.haccpPhoneTab===key))}
  function releaseExpress(){document.body.classList.remove("haccp-express-mobile","haccp-cleaning-express-mobile","haccp-trace-express-mobile","haccp-v7-reception-mobile")}
  function ensureUi(){if(V7.ready)return;V7.ready=true;
    const dock=$("haccp-phone-dock");if(dock)dock.innerHTML=`<button type="button" data-haccp-phone-tab="home" onclick="haccpV7Open('home')"><span>⌂</span><b>ACCUEIL</b></button><button type="button" data-haccp-phone-tab="reception" onclick="haccpV7Open('reception')"><span>▤</span><b>RÉCEPTION</b></button><button type="button" data-haccp-phone-tab="temp" onclick="haccpV7Open('temp')"><span>°C</span><b>TEMP.</b></button><button type="button" data-haccp-phone-tab="trace" onclick="haccpV7Open('trace')"><span>▣</span><b>TRAÇA.</b></button><button type="button" data-haccp-phone-tab="more" onclick="haccpV7Open('more')"><span>•••</span><b>PLUS</b></button>`;
    const content=document.querySelector(".content");if(content&&!$("mod-reception"))content.insertAdjacentHTML("beforeend",receptionHtml());
    if(!$("hv7-home"))document.body.insertAdjacentHTML("beforeend",mobileLayersHtml());
    const nav=document.querySelector(".nav-haccp");if(nav&&!$("hv7-desktop-reception")){const archive=[...nav.querySelectorAll("button")].find(b=>String(b.textContent||"").includes("ARCHIVES"));const b=document.createElement("button");b.id="hv7-desktop-reception";b.className="nav-btn";b.type="button";b.textContent="📦 RÉCEPTION BL";b.onclick=()=>window.haccpV7Open("reception");archive?.parentNode?.insertBefore(b,archive)}
    $("hv7-bl-photo-input")?.addEventListener("change",e=>handleBlPhoto(e.target.files?.[0]));
    $("hv7-cat-kind")?.addEventListener("change",renderCategories);
  }
  function receptionHtml(){return `<div id="mod-reception" class="module"><div class="hv7-reception-shell"><div class="hv7-head"><div><div class="hv7-kicker">RÉCEPTION HACCP · BL CONNECTÉ</div><h2 class="hv7-title">Réception fournisseurs</h2><div class="hv7-sub">Les commandes viennent d’Économat. La validation utilise la réception centrale iCHEF : stock et mouvements d’inventaire restent synchronisés, sans double saisie.</div></div><div class="hv7-badges"><span class="hv7-badge ok" id="hv7-session-badge">SESSION iCHEF</span><span class="hv7-badge" id="hv7-delivery-badge">0 À RECEVOIR</span></div></div><div class="hv7-reception-grid"><section class="hv7-panel"><div class="hv7-panel-head"><strong>LIVRAISONS ATTENDUES</strong><span id="hv7-delivery-sector">Secteur</span></div><div id="hv7-delivery-list" class="hv7-list"><div class="hv7-empty">Synchronisation…</div></div></section><section class="hv7-panel"><div class="hv7-panel-head"><strong>CONTRÔLE DU BL</strong><span>Quantité · lot · DLC · température · preuve</span></div><div id="hv7-delivery-empty" class="hv7-empty">Touchez une livraison pour contrôler le BL.</div><div id="hv7-delivery-detail" class="hv7-detail" hidden></div></section></div><section class="hv7-panel"><div class="hv7-panel-head"><strong>RÉCEPTIONS RÉCENTES</strong><span>preuve HACCP liée à la commande</span></div><div id="hv7-recent-receipts" class="hv7-list hv7-recent"><div class="hv7-empty">Aucune réception enregistrée.</div></div></section></div></div>`}
  function mobileLayersHtml(){return `<section id="hv7-home" class="hv7-mobile-layer" aria-label="Accueil HACCP"><div class="hv7-mobile-inner"><div class="hv7-mobile-hero"><div><h2>HACCP</h2><p id="hv7-home-identity">Utilisateur · Secteur</p></div><span class="hv7-mobile-chip" id="hv7-home-sync">CONNECTÉ</span></div><div class="hv7-home-grid"><button class="hv7-home-card primary" onclick="haccpV7Open('reception')"><span>▤</span><div><strong>Réception BL</strong><small>Commande, quantité, lot, DLC, température et preuve.</small><div class="hv7-count" id="hv7-home-delivery-count">…</div></div></button><button class="hv7-home-card" onclick="haccpV7Open('temp')"><span>°C</span><div><strong>Températures</strong><small>Photo thermomètre + OCR + preuve.</small></div></button><button class="hv7-home-card" onclick="haccpV7Open('cleaning')"><span>✓</span><div><strong>Nettoyage</strong><small>Plan du secteur et anomalies.</small></div></button><button class="hv7-home-card" onclick="haccpV7Open('trace')"><span>▣</span><div><strong>Traçabilité</strong><small>Lot, DLC, photo et lien livraison.</small></div></button><button class="hv7-home-card" onclick="haccpV7Open('inventory')"><span>≡</span><div><strong>Stock</strong><small>Inventaire central iCHEF.</small></div></button><button class="hv7-home-card" onclick="haccpV7Open('categories')"><span>＋</span><div><strong>Catégories</strong><small>Créer les catégories HACCP depuis le téléphone.</small></div></button></div></div></section><section id="hv7-more" class="hv7-mobile-layer"><div class="hv7-mobile-inner"><div class="hv7-mobile-hero"><div><h2>Plus</h2><p>Fonctions HACCP du secteur</p></div></div><div class="hv7-more-list"><button class="hv7-more-btn" onclick="haccpV7Open('cleaning')"><span><b>Nettoyage</b><small>Plan et actions correctives</small></span><strong>›</strong></button><button class="hv7-more-btn" onclick="haccpV7Open('inventory')"><span><b>Stock / inventaire</b><small>Données centrales iCHEF</small></span><strong>›</strong></button><button class="hv7-more-btn" onclick="haccpV7Open('archive')"><span><b>Archives</b><small>Rapports et preuves HACCP</small></span><strong>›</strong></button><button class="hv7-more-btn" onclick="haccpV7Open('categories')"><span><b>Catégories HACCP</b><small>Gestion mobile responsable</small></span><strong>›</strong></button></div><button class="hv7-layer-close" onclick="haccpV7Open('home')">RETOUR ACCUEIL</button></div></section><section id="hv7-categories" class="hv7-mobile-layer"><div class="hv7-mobile-inner"><div class="hv7-mobile-hero"><div><h2>Catégories</h2><p id="hv7-cat-sector">Secteur</p></div><span class="hv7-mobile-chip">TÉLÉPHONE</span></div><div class="hv7-cat-note">Les catégories <b>Températures / Nettoyage / Traçabilité</b> appartiennent au catalogue HACCP du secteur. <b>Réception / BL n’est pas dupliqué ici</b> : produits, fournisseurs et catégories restent ceux d’Économat / Stock iCHEF.</div><div id="hv7-cat-editor" class="hv7-cat-toolbar"><select id="hv7-cat-kind"><option value="eq">Températures</option><option value="clean">Nettoyage</option><option value="trace">Traçabilité</option></select><input id="hv7-cat-name" type="text" placeholder="Nouvelle catégorie"><button id="hv7-cat-add" class="hv7-cat-add" type="button" onclick="haccpV7AddCategory()">AJOUTER LA CATÉGORIE</button></div><div id="hv7-cat-list" class="hv7-cat-list"></div><button class="hv7-layer-close" onclick="haccpV7Open('more')">RETOUR</button></div></section>`}
  window.haccpV7Open=async function(key){ensureUi();closeLayers();releaseExpress();if(key==="home"){if(!phone()){key="reception"}else{$("hv7-home")?.classList.add("open");setDock("home");syncHome();loadDeliveries(false).catch(()=>{});return}}if(key==="more"){if(phone()){$("hv7-more")?.classList.add("open");setDock("more");return}key="archive"}if(key==="categories"){if(!phone()){alert("La création de catégories HACCP V7 est réservée au mode téléphone.");return}$("hv7-categories")?.classList.add("open");setDock("more");renderCategories();return}if(key==="reception"){document.body.classList.add("haccp-v7-reception-mobile");if(typeof showModule==="function")showModule("reception");else{document.querySelectorAll(".module").forEach(m=>m.classList.remove("active"));$("mod-reception")?.classList.add("active")}setDock("reception");await Promise.allSettled([loadDeliveries(true),loadReceipts()]);return}const map=key==="inventory"?"inventaire":key;if(typeof window.haccpPhoneOpen==="function"&&["temp","cleaning","trace","inventory"].includes(key)){window.haccpPhoneOpen(key)}else if(typeof showModule==="function")showModule(map);setDock(key==="inventory"?"more":key)};
  async function loadDeliveries(showLoading=true){ensureUi();const list=$("hv7-delivery-list");if(showLoading&&list)list.innerHTML='<div class="hv7-empty">Synchronisation des commandes…</div>';try{const d=await api("/api/ops/deliveries");V7.deliveries=(d.deliveries||[]).filter(mine);renderDeliveries();syncHome()}catch(e){if(list)list.innerHTML=`<div class="hv7-empty">${esc(e.message||"Livraisons indisponibles")}</div>`;$("hv7-delivery-badge")&&( $("hv7-delivery-badge").textContent="INDISPONIBLE" )}}
  function renderDeliveries(){const list=$("hv7-delivery-list");const count=V7.deliveries.length;if($("hv7-delivery-badge"))$("hv7-delivery-badge").textContent=`${count} À RECEVOIR`;if($("hv7-delivery-sector"))$("hv7-delivery-sector").textContent=String((typeof currentDept!=="undefined"?currentDept:window.ICHEF_HACCP?.department)||"Secteur");if(!list)return;if(!count){list.innerHTML='<div class="hv7-empty">Aucune livraison à réceptionner pour ce secteur.</div>';return}list.innerHTML=V7.deliveries.map(d=>{const n=(d.items||[]).filter(i=>remain(i)>0).length;const active=V7.active&&String(V7.active.id)===String(d.id);return `<button type="button" class="hv7-delivery-card${active?' active':''}" onclick="haccpV7SelectDelivery('${esc(d.id)}')"><span><b>${esc(d.supplierName||"Fournisseur")}</b><small>${esc(d.sectorLabel||"Secteur")} · ${n} article${n>1?'s':''} à contrôler${d.requestedDeliveryAt?` · ${new Date(d.requestedDeliveryAt).toLocaleDateString('fr-FR')}`:''}</small></span><em>${esc(d.status||"")}</em></button>`}).join("")}
  window.haccpV7SelectDelivery=function(id){const d=V7.deliveries.find(x=>String(x.id)===String(id));if(!d)return;V7.active=d;V7.blPhoto=null;renderDeliveries();const empty=$("hv7-delivery-empty"),detail=$("hv7-delivery-detail");if(empty)empty.hidden=true;if(!detail)return;detail.hidden=false;detail.innerHTML=`<div class="hv7-order-title"><div><h3>${esc(d.supplierName||"Fournisseur")}</h3><p>Commande ${esc(d.id)} · ${esc(d.sectorLabel||"")} · ${Number(d.totalEstimated||0).toLocaleString('fr-FR',{maximumFractionDigits:2})} ${esc(d.currency||"")}</p></div><div class="hv237-po-actions"><span class="hv7-badge warn">${esc(d.status||"")}</span><button type="button" class="hv237-po-open" onclick="haccpV7ShowPurchaseOrderCopy('${esc(d.id)}')">📄 VOIR LA COMMANDE</button></div></div><div class="hv7-lines">${(d.items||[]).map(lineHtml).join("")}</div><div class="hv7-bl"><div class="hv7-bl-main"><span class="hv7-field-label">PREUVE DU BON DE LIVRAISON</span><input id="hv7-bl-photo-input" type="file" accept="image/*" capture="environment" hidden><button class="hv7-photo-btn" type="button" onclick="document.getElementById('hv7-bl-photo-input').click()">📷 PHOTOGRAPHIER LE BL</button><div class="hv7-photo-meta" id="hv7-bl-photo-status">Photo compressée · conservation 30 jours · relevé écrit conservé.</div></div><div class="hv7-photo-preview" id="hv7-bl-photo-preview"><span>Aucune photo</span></div></div><div><span class="hv7-field-label">NOTE / ANOMALIE GÉNÉRALE</span><textarea id="hv7-reception-note" class="hv7-note" placeholder="Ex. carton abîmé, température non conforme, produit manquant…"></textarea></div><div class="hv7-validation"><div class="hv7-warning">✓ Le serveur met à jour le stock uniquement pour les articles déjà liés à l’inventaire central. Les contrôles HACCP restent attachés à la commande ${esc(d.id)}.</div><button id="hv7-receive-btn" class="hv7-save" type="button" onclick="haccpV7ValidateReception()">VALIDER RÉCEPTION + STOCK</button></div>`;$("hv7-bl-photo-input")?.addEventListener("change",e=>handleBlPhoto(e.target.files?.[0]))};
  function lineHtml(i){const r=remain(i),linked=!!String(i.inventoryItemId||"").trim();return `<article class="hv7-line" data-v7-line="${esc(i.itemId)}"><div class="hv7-line-top"><div><b>${esc(i.name||"Article")}</b><small>Commandé ${Number(i.quantity||0)} ${esc(i.unit||"")} · déjà reçu ${Number(i.receivedQuantity||0)}</small></div><span class="hv7-stock-link ${linked?'linked':''}">${linked?'STOCK LIÉ':'HORS STOCK'}</span></div><div class="hv7-line-fields"><label><span>REÇU MAINTENANT</span><input data-v7-field="qty" type="number" min="0" step="0.001" value="${r}"></label><label><span>LOT</span><input data-v7-field="lot" type="text" placeholder="Lot"></label><label><span>DLC / DDM</span><input data-v7-field="dlc" type="date"></label><label><span>TEMP. °C</span><input data-v7-field="temp" type="number" step="0.1" placeholder="—"></label></div><div class="hv7-line-actions"><button type="button" class="hv7-trace-btn" onclick="haccpV7TraceItem('${esc(i.itemId)}')">▣ TRACER</button><button type="button" class="hv7-anomaly-btn" onclick="this.classList.toggle('active');this.dataset.issue=this.classList.contains('active')?'1':'0'">! ANOMALIE</button></div></article>`}
  window.haccpV7TraceItem=function(itemId){const d=V7.active,i=d?.items?.find(x=>String(x.itemId)===String(itemId));if(!d||!i)return;if(typeof window.linkTraceToDeliveryItem==="function"){try{window.linkTraceToDeliveryItem(d.id,i.itemId,true);window.haccpV7Open("trace");return}catch(_){}}window.HTRACE_DELIVERY_CONTEXT={orderId:d.id,supplierId:d.supplierId||"",supplierName:d.supplierName||"",sectorKey:d.sectorKey||"",item:{...i},receivedQuantity:Number(i.receivedQuantity||0)};if($("trace-name"))$("trace-name").value=i.name||"";if($("htrace-name"))$("htrace-name").value=i.name||"";window.haccpV7Open("trace")};
  async function compressPhoto(file){return await new Promise((resolve,reject)=>{const fr=new FileReader();fr.onerror=reject;fr.onload=e=>{const im=new Image();im.onerror=reject;im.onload=()=>{try{let side=900,q=.58,out="";for(let n=0;n<5;n++){const sc=Math.min(1,side/Math.max(im.width,im.height)),c=document.createElement("canvas");c.width=Math.max(1,Math.round(im.width*sc));c.height=Math.max(1,Math.round(im.height*sc));c.getContext("2d").drawImage(im,0,0,c.width,c.height);out=c.toDataURL("image/jpeg",q);if(out.length<=135000)break;side=Math.max(520,Math.round(side*.82));q=Math.max(.36,q-.06)}resolve(out)}catch(err){reject(err)}};im.src=e.target.result};fr.readAsDataURL(file)})}
  async function handleBlPhoto(file){if(!file)return;const st=$("hv7-bl-photo-status");if(st)st.textContent="Compression de la photo…";try{const data=await compressPhoto(file);V7.blPhoto={data,capturedAt:new Date().toISOString(),expiresAt:new Date(Date.now()+30*86400000).toISOString(),name:file.name||"BL.jpg"};const p=$("hv7-bl-photo-preview");if(p)p.innerHTML=`<img src="${data}" alt="Photo du bon de livraison">`;if(st)st.textContent="✓ Photo BL prête · conservation 30 jours · puis purge automatique."}catch(e){V7.blPhoto=null;if(st)st.textContent="Photo illisible. Reprenez le BL bien cadré."}}
  function collectLines(){const d=V7.active;if(!d)return[];return (d.items||[]).map(i=>{const row=document.querySelector(`[data-v7-line="${CSS.escape(String(i.itemId))}"]`);const get=f=>row?.querySelector(`[data-v7-field="${f}"]`)?.value||"";const issue=row?.querySelector(".hv7-anomaly-btn")?.dataset.issue==="1";const nowQty=Math.max(0,Number(get("qty")||0));return{itemId:i.itemId,name:i.name||"",unit:i.unit||"",ordered:Number(i.quantity||0),previousReceived:Number(i.receivedQuantity||0),receivedNow:nowQty,totalAfter:Number(i.receivedQuantity||0)+nowQty,inventoryItemId:i.inventoryItemId||"",lot:String(get("lot")).trim(),dlc:String(get("dlc")).trim(),temperature:get("temp")!==""?Number(get("temp")):null,issue}})}
  async function loadReceipts(){try{const state=await API.getState({force:true}),a=state?.activeOrders||{};V7.receipts=Array.isArray(a.HACCP_RECEPTION?.data)?a.HACCP_RECEPTION.data:[];purgeReceiptPhotos();renderRecent()}catch(e){console.warn("[HACCP V7] réception logs",e)}}
  function purgeReceiptPhotos(){const now=Date.now();let changed=false;for(const r of V7.receipts){if(r.blPhotoData&&r.blPhotoExpiresAt&&new Date(r.blPhotoExpiresAt).getTime()<=now){delete r.blPhotoData;r.blPhotoPurgedAt=new Date().toISOString();changed=true}}if(changed)API.update("HACCP_RECEPTION",V7.receipts).catch(()=>{})}
  window.haccpV7ValidateReception=async function(){const d=V7.active;if(!d)return;const lines=collectLines();if(!lines.some(x=>x.receivedNow>0)){alert("Indiquez au moins une quantité reçue.");return}const received={},partial=[];for(const l of lines){received[l.itemId]=l.totalAfter;if(l.totalAfter+1e-9<l.ordered)partial.push(l.name)}const issue=lines.some(x=>x.issue)||partial.length>0;const note=String($("hv7-reception-note")?.value||"").trim();const btn=$("hv7-receive-btn");if(btn){btn.disabled=true;btn.textContent="SYNCHRONISATION…"}try{await api(`/api/ops/purchase-orders/${encodeURIComponent(d.id)}`,{method:"PUT",body:JSON.stringify({action:"RECEIVE",received,receptionNote:note,hasIssue:issue})});const now=new Date();const rec={id:`REC_${Date.now()}`,timestamp:now.toISOString(),date:now.toLocaleDateString("fr-FR"),time:now.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"}),dept:String((typeof currentDept!=="undefined"?currentDept:window.ICHEF_HACCP?.department)||""),user:String((typeof userAuditLabel==="function"?userAuditLabel():window.ICHEF_HACCP?.userName)||"Utilisateur iCHEF"),role:role(),orderId:d.id,supplierId:d.supplierId||"",supplierName:d.supplierName||"",sectorKey:d.sectorKey||"",sectorLabel:d.sectorLabel||"",hasIssue:issue,note,items:lines,blPhotoEver:!!V7.blPhoto,blPhotoCapturedAt:V7.blPhoto?.capturedAt||null,blPhotoExpiresAt:V7.blPhoto?.expiresAt||null};if(V7.blPhoto?.data)rec.blPhotoData=V7.blPhoto.data;V7.receipts.unshift(rec);V7.receipts=V7.receipts.slice(0,1500);await API.update("HACCP_RECEPTION",V7.receipts);V7.lastReceiptId=rec.id;V7.active=null;V7.blPhoto=null;try{await loadData()}catch(_){}try{typeof refreshInventoryDashboard==="function"&&refreshInventoryDashboard()}catch(_){}await loadDeliveries(false);renderRecent();const det=$("hv7-delivery-detail");if(det)det.hidden=true;const emp=$("hv7-delivery-empty");if(emp){emp.hidden=false;emp.textContent="✓ Réception enregistrée et système iCHEF synchronisé."}try{navigator.vibrate?.([35,30,35])}catch(_){}}catch(e){alert(e.message||"Réception non enregistrée.")}finally{if(btn){btn.disabled=false;btn.textContent="VALIDER RÉCEPTION + STOCK"}}};
  function renderRecent(){const box=$("hv7-recent-receipts");if(!box)return;const sector=String((typeof currentDept!=="undefined"?currentDept:window.ICHEF_HACCP?.department)||"");const rows=V7.receipts.filter(r=>!sector||String(r.dept||"")===sector).slice(0,12);if(!rows.length){box.innerHTML='<div class="hv7-empty">Aucune réception enregistrée.</div>';return}box.innerHTML=rows.map(r=>`<div class="hv7-recent-row"><span><b>${esc(r.supplierName||"Fournisseur")} · ${esc(r.orderId||"")}</b><small>${esc(r.date||"")} ${esc(r.time||"")} · ${esc(r.user||"")} · ${r.hasIssue?'ANOMALIE':'CONFORME'}${r.blPhotoPurgedAt?' · photo purgée':''}</small></span><span class="hv7-mini-actions"><button type="button" class="hv237-po-recent" onclick="haccpV7ShowPurchaseOrderCopy('${esc(r.orderId||'')}')">COMMANDE</button><button type="button" onclick="haccpV7PrintReception('${esc(r.id)}')">IMPRIMER</button><button type="button" onclick="haccpV7DownloadReception('${esc(r.id)}')">TÉL.</button></span></div>`).join("")}
  function receiptById(id){return V7.receipts.find(x=>String(x.id)===String(id))}
  window.haccpV7DownloadReception=function(id){const r=receiptById(id);if(!r)return;const clean={...r};const blob=new Blob([JSON.stringify(clean,null,2)],{type:"application/json"}),u=URL.createObjectURL(blob),a=document.createElement("a");a.href=u;a.download=`iCHEF_HACCP_RECEPTION_${String(r.orderId||r.id).replace(/[^a-z0-9_-]/gi,"_")}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(u),1500)};
  window.haccpV7PrintReception=function(id){const r=receiptById(id);if(!r)return;const photo=r.blPhotoData?`<img src="${r.blPhotoData}" style="max-width:100%;max-height:320px;border:1px solid #999">`:`<p><i>${r.blPhotoEver?'Photo BL purgée après délai de conservation.':'Aucune photo BL.'}</i></p>`;const rows=(r.items||[]).map(i=>`<tr><td>${esc(i.name)}</td><td>${i.receivedNow} ${esc(i.unit)}</td><td>${esc(i.lot||'-')}</td><td>${esc(i.dlc||'-')}</td><td>${i.temperature===null||i.temperature===undefined?'-':Number(i.temperature).toLocaleString('fr-FR')+' °C'}</td><td>${i.issue?'ANOMALIE':'OK'}</td></tr>`).join("");const html=`<style>@page{margin:12mm}body{font-family:Arial;color:#111}h1{font-size:22px}h2{font-size:15px;margin-top:22px}table{width:100%;border-collapse:collapse;font-size:11px}th,td{border:1px solid #bbb;padding:6px;text-align:left}.meta{font-size:11px;line-height:1.5}.bad{color:#b00020;font-weight:bold}</style><h1>iCHEF HACCP — RÉCEPTION FOURNISSEUR</h1><div class="meta"><b>Commande :</b> ${esc(r.orderId)}<br><b>Fournisseur :</b> ${esc(r.supplierName)}<br><b>Secteur :</b> ${esc(r.dept)}<br><b>Date :</b> ${esc(r.date)} ${esc(r.time)}<br><b>Contrôlé par :</b> ${esc(r.user)}<br><b>Statut :</b> <span class="${r.hasIssue?'bad':''}">${r.hasIssue?'ANOMALIE / PARTIEL':'CONFORME'}</span><br><b>Note :</b> ${esc(r.note||'-')}</div><h2>Articles réceptionnés</h2><table><thead><tr><th>Article</th><th>Reçu</th><th>Lot</th><th>DLC/DDM</th><th>Temp.</th><th>Contrôle</th></tr></thead><tbody>${rows}</tbody></table><h2>Preuve du BL</h2>${photo}`;const pr=$("print-report");if(pr){pr.innerHTML=html;window.print()}};
  function syncHome(){const ident=$("hv7-home-identity");if(ident)ident.textContent=`${window.ICHEF_HACCP?.userName||"Utilisateur"} · ${window.ICHEF_HACCP?.department||"Secteur"}`;if($("hv7-home-delivery-count"))$("hv7-home-delivery-count").textContent=`${V7.deliveries.length} livraison${V7.deliveries.length>1?'s':''} à recevoir`;if($("hv7-cat-sector"))$("hv7-cat-sector").textContent=String(window.ICHEF_HACCP?.department||"Secteur")}
  function renderCategories(){
    ensureUi();
    const box=$("hv7-cat-list"),kind=$("hv7-cat-kind")?.value||"eq";
    if(!box)return;
    const editable=canManageCategories();
    if($("hv7-cat-editor"))$("hv7-cat-editor").style.display=editable?"grid":"none";
    const dep=String((typeof currentDept!=="undefined"?currentDept:window.ICHEF_HACCP?.department)||"");
    const groups=(typeof EMPIRE_LISTS!=="undefined"&&EMPIRE_LISTS?.[dep]?.[kind])||{};
    const entries=Object.entries(groups);
    if(!entries.length){box.innerHTML='<div class="hv7-cat-note">Aucune catégorie pour ce secteur.</div>';return}
    box.innerHTML=entries.map(([name,items])=>{
      const enc=encodeURIComponent(name);
      const deleteBtn=editable?`<button type="button" onclick="haccpV7DeleteCategory('${esc(kind)}',decodeURIComponent('${enc}'))">SUPPRIMER</button>`:"";
      const add=editable?`<div style="padding:0 10px 10px;display:grid;grid-template-columns:1fr auto;gap:6px"><input id="hv7-item-${enc}" type="text" placeholder="Ajouter un élément" style="background:#fff;color:#111;border-color:#c5c9cd;font-size:16px;min-height:42px"><button type="button" onclick="haccpV7AddItem('${esc(kind)}',decodeURIComponent('${enc}'))" style="min-height:42px;border:0;border-radius:8px;background:#111;color:#fff;font-weight:900;padding:7px 11px">AJOUTER</button></div>`:"";
      return `<section class="hv7-cat-group"><div class="hv7-cat-group-head"><strong>${esc(name)}</strong>${deleteBtn}</div><div class="hv7-cat-items">${(Array.isArray(items)?items:[]).map(x=>`<span class="hv7-cat-item">${esc(x)}</span>`).join("")||'<span class="hv7-cat-item">Catégorie vide</span>'}</div>${add}</section>`;
    }).join("");
  }
  window.haccpV7AddCategory=async function(){if(!canManageCategories()){alert("Responsable / Chef / Manager / Direction requis.");return}const dep=String((typeof currentDept!=="undefined"?currentDept:window.ICHEF_HACCP?.department)||""),kind=$("hv7-cat-kind")?.value||"eq",name=String($("hv7-cat-name")?.value||"").trim();if(!name)return alert("Saisissez un nom de catégorie.");if(!EMPIRE_LISTS?.[dep]?.[kind])return alert("Secteur indisponible.");if(EMPIRE_LISTS[dep][kind][name])return alert("Cette catégorie existe déjà.");EMPIRE_LISTS[dep][kind][name]=[];await persistHaccpLists();$("hv7-cat-name").value="";populateSelects();renderCategories()};
  window.haccpV7AddItem=async function(kind,name){if(!canManageCategories())return;const dep=String((typeof currentDept!=="undefined"?currentDept:window.ICHEF_HACCP?.department)||""),id=`hv7-item-${encodeURIComponent(name)}`,input=$(id),value=String(input?.value||"").trim();if(!value)return;const arr=EMPIRE_LISTS?.[dep]?.[kind]?.[name];if(!Array.isArray(arr))return;if(arr.some(x=>String(x).toLowerCase()===value.toLowerCase()))return alert("Cet élément existe déjà.");arr.push(value);await persistHaccpLists();populateSelects();renderCategories()};
  window.haccpV7DeleteCategory=async function(kind,name){if(!canManageCategories())return;const dep=String((typeof currentDept!=="undefined"?currentDept:window.ICHEF_HACCP?.department)||"");if(!confirm(`Supprimer la catégorie « ${name} » et ses éléments ?`))return;delete EMPIRE_LISTS?.[dep]?.[kind]?.[name];await persistHaccpLists();populateSelects();renderCategories()};
  window.haccpV7GetPurchaseOrderCopy=async function(orderId){ const id=String(orderId||'').trim();if(!/^[A-Za-z0-9_:\-]{2,150}$/.test(id))throw new Error('Référence de commande invalide.');const response=await api('/api/ops/purchase-orders/'+encodeURIComponent(id)+'/copy');return response.order;};
  function bootstrap(){ensureUi();if(window.ICHEF_HACCP?.authenticated){syncHome();loadReceipts().catch(()=>{});loadDeliveries(false).catch(()=>{});if(phone()&&!document.querySelector(".hv7-mobile-layer.open")&&!document.body.classList.contains("haccp-express-mobile")&&!document.body.classList.contains("haccp-cleaning-express-mobile")&&!document.body.classList.contains("haccp-trace-express-mobile"))setDock("home")}}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",bootstrap,{once:true});else bootstrap();window.addEventListener("pageshow",()=>setTimeout(bootstrap,30));window.addEventListener("focus",()=>{if(window.ICHEF_HACCP?.authenticated){loadDeliveries(false).catch(()=>{});purgeReceiptPhotos()}});
  window.addEventListener("ops-purchase-order-changed",()=>loadDeliveries(false).catch(()=>{}));
  let hv7AuthWatch=0;
  const hv7AuthTimer=setInterval(()=>{
    hv7AuthWatch++;
    if(window.ICHEF_HACCP?.authenticated){
      clearInterval(hv7AuthTimer);
      bootstrap();
      if(phone()&&!document.querySelector(".hv7-mobile-layer.open")){
        setTimeout(()=>window.haccpV7Open("home"),80);
      }
    }else if(hv7AuthWatch>60){clearInterval(hv7AuthTimer)}
  },150);
  window.ICHEF_HACCP_V7={loadDeliveries,loadReceipts,open:window.haccpV7Open};
})();
</script>



<style id="ichef-haccp-v71-prepared-label-style">
/* iCHEF HACCP V7.2 — EcoLabel multi-formats desktop + ticket DLC mobile */
.hv71-layer{display:none;position:fixed;inset:0;z-index:120500;background:#f4f6f8;color:#101214;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:env(safe-area-inset-top) 0 calc(76px + env(safe-area-inset-bottom));box-sizing:border-box}
.hv71-layer.open{display:block}
.hv71-shell{width:min(100%,760px);margin:0 auto;padding:14px;box-sizing:border-box}
.hv71-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:14px}
.hv71-back{width:44px;height:44px;border:0;border-radius:12px;background:#fff;color:#111;font-size:22px;font-weight:900;box-shadow:0 1px 0 rgba(0,0,0,.08)}
.hv71-head-text{min-width:0;flex:1}.hv71-head-text strong{display:block;font-size:20px;line-height:1.15}.hv71-head-text small{display:block;margin-top:3px;color:#697178;font-size:12px}
.hv71-chip{flex:0 0 auto;border:1px solid #cbd1d6;border-radius:999px;padding:7px 9px;background:#fff;color:#4a5259;font-size:10px;font-weight:950;letter-spacing:.45px}
.hv71-menu{display:grid;gap:10px}.hv71-menu-btn{display:grid;grid-template-columns:54px 1fr 22px;gap:12px;align-items:center;width:100%;min-height:94px;border:1px solid #d7dce0;border-radius:16px;background:#fff;color:#15191c;padding:13px;text-align:left}.hv71-menu-btn.primary{border:2px solid #0a6ed1;background:#f8fbff}.hv71-menu-icon{width:50px;height:50px;border:1px solid #d8dde1;border-radius:14px;display:grid;place-items:center;font-size:24px;background:#fafbfc}.hv71-menu-btn strong{display:block;font-size:16px}.hv71-menu-btn small{display:block;margin-top:4px;color:#6a7279;font-size:12px;line-height:1.4}.hv71-menu-arrow{font-size:24px;color:#6c747b;text-align:center}
.hv71-card{background:#fff;border:1px solid #d9dee2;border-radius:16px;padding:14px;margin-bottom:12px}.hv71-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.hv71-field{display:flex;flex-direction:column;gap:6px;min-width:0}.hv71-field.full{grid-column:1/-1}.hv71-field>span{font-size:11px;font-weight:950;color:#5a6268;letter-spacing:.28px}.hv71-field input,.hv71-field select{min-height:48px!important;background:#fff!important;color:#111!important;border:1px solid #cbd2d8!important;border-radius:10px!important;font-size:16px!important;padding:10px 11px!important;box-sizing:border-box;width:100%}.hv71-category-row{display:grid;grid-template-columns:1fr auto;gap:7px}.hv71-category-row button{min-width:48px;border:1px solid #cbd2d8;border-radius:10px;background:#fff;color:#111;font-size:19px;font-weight:900}.hv71-help{margin-top:8px;padding:10px 11px;border-radius:10px;background:#f7f8f9;border:1px solid #e0e4e7;color:#687078;font-size:11px;line-height:1.45}.hv71-primary{width:100%;min-height:52px;border:0;border-radius:12px;background:#0a6ed1;color:#fff;font-size:14px;font-weight:950;letter-spacing:.25px}.hv71-secondary{width:100%;min-height:48px;border:1px solid #cbd2d8;border-radius:12px;background:#fff;color:#20262b;font-weight:900}
.hv71-label-wrap{display:flex;justify-content:center;padding:8px 0 14px}.hv71-label{position:relative;width:min(100%,500px);aspect-ratio:5/3;background:#fff;color:#111;border:1px solid #b9bec2;border-radius:8px;padding:16px;box-sizing:border-box;display:flex;flex-direction:column;overflow:hidden}.hv71-label-top{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;padding-bottom:7px;border-bottom:2px solid #111}.hv71-label-brand{font-size:22px;font-weight:950;letter-spacing:-.6px}.hv71-label-site{text-align:right;font-size:9px;font-weight:900;line-height:1.15;text-transform:uppercase}.hv71-label-name{font-size:20px;font-weight:950;line-height:1.05;margin:9px 0 7px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.hv71-label-row{display:flex;gap:6px;align-items:baseline;font-size:11px;line-height:1.45;padding-right:72px}.hv71-label-qr{position:absolute;right:14px;bottom:34px;width:64px;height:64px}.hv71-label-qr svg{width:100%;height:100%;display:block}.hv71-label-row b{font-size:13px}.hv71-label-dlc{font-size:18px!important;font-weight:950}.hv71-label-bottom{margin-top:auto;padding-top:6px;border-top:1px solid #111;display:flex;justify-content:space-between;gap:8px;font-size:9px;font-weight:800}.hv71-copy{display:flex;align-items:center;justify-content:center;gap:0;margin:5px 0 12px}.hv71-copy button{width:52px;height:48px;border:1px solid #cdd3d8;background:#eef1f3;color:#111;font-size:24px}.hv71-copy button:first-child{border-radius:10px 0 0 10px}.hv71-copy button:last-child{border-radius:0 10px 10px 0}.hv71-copy output{height:48px;min-width:110px;display:grid;place-items:center;border-top:1px solid #cdd3d8;border-bottom:1px solid #cdd3d8;background:#fff;font-size:18px;font-weight:950}.hv71-preview-actions{display:grid;grid-template-columns:1fr 1fr;gap:9px}.hv71-preview-actions .print{grid-column:1/-1;background:#0a6ed1;color:#fff;border:0}.hv71-preview-actions button{min-height:50px;border-radius:11px;border:1px solid #cbd2d8;background:#fff;color:#111;font-size:13px;font-weight:950}.hv71-status{min-height:20px;margin:8px 0 0;text-align:center;color:#4d5962;font-size:11px;font-weight:800}.hv71-status.ok{color:#168451}.hv71-status.error{color:#bc2236}
/* V7.2 — Choix du format uniquement sur ordinateur */
.hv72-format-panel{display:none;margin-bottom:12px;padding:14px;border:1px solid #d9dee2;border-radius:14px;background:#fff}
.hv72-format-title{font-size:11px;font-weight:950;letter-spacing:.35px;color:#596168;margin-bottom:9px}
.hv72-format-options{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}
.hv72-format-card{display:block;cursor:pointer;min-width:0}
.hv72-format-card input{position:absolute;opacity:0;pointer-events:none}
.hv72-format-body{display:block;border:1px solid #cfd5da;border-radius:12px;padding:11px;background:#fafbfc;min-height:78px;transition:.15s}
.hv72-format-body strong{display:block;font-size:13px;color:#161a1d}.hv72-format-body small{display:block;margin-top:4px;font-size:10px;line-height:1.35;color:#677078}
.hv72-format-card input:checked + .hv72-format-body{border:2px solid #0a6ed1;background:#f3f8ff;padding:10px}
.hv72-format-note{margin-top:9px;font-size:10px;line-height:1.4;color:#6b7379}
.hv71-label[data-format="eco"]{width:min(100%,455px);aspect-ratio:7/4;padding:13px}.hv71-label[data-format="eco"] .hv71-label-name{margin-top:7px;font-size:18px}.hv71-label[data-format="eco"] .hv71-label-row{font-size:10px;line-height:1.35;padding-right:66px}.hv71-label[data-format="eco"] .hv71-label-dlc{font-size:15px!important}.hv71-label[data-format="eco"] .hv71-label-qr{width:56px;height:56px;right:12px;bottom:23px}.hv71-label[data-format="eco"] .hv71-label-bottom{font-size:8px}
.hv71-label[data-format="standard"]{width:min(100%,500px);aspect-ratio:5/3}
.hv71-label[data-format="complete"]{width:min(100%,540px);aspect-ratio:3/2;padding:17px}.hv71-label[data-format="complete"] .hv71-label-name{font-size:22px}.hv71-label[data-format="complete"] .hv71-label-row{font-size:12px;line-height:1.55;padding-right:82px}.hv71-label[data-format="complete"] .hv71-label-qr{width:70px;height:70px;right:15px;bottom:36px}
@media(max-width:560px){.hv71-shell{padding:10px}.hv71-grid{grid-template-columns:1fr}.hv71-field.full{grid-column:auto}.hv71-label{padding:12px}.hv71-label-brand{font-size:19px}.hv71-label-name{font-size:17px}.hv71-label-row{font-size:10px}.hv71-label-row b{font-size:11px}.hv71-label-dlc{font-size:16px!important}.hv72-format-panel{display:none!important}.hv71-label[data-format]{width:min(100%,500px)!important;aspect-ratio:5/3!important}}
@media(min-width:821px){.hv71-layer{padding-bottom:20px}.hv71-shell{padding:24px}.hv71-menu{grid-template-columns:1fr 1fr}.hv71-menu-btn{min-height:110px}.hv72-format-panel{display:block}}
</style>

<script id="ichef-haccp-v71-prepared-label-script">
(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const V71 = {ready:false,copies:1,current:null,savedId:null,savedSignature:"",bypassTrace:false,format:"standard"};
  const isPhone = () => document.body.classList.contains("haccp-real-phone") || window.matchMedia?.("(max-width:820px)")?.matches;
  const esc = v => String(v ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const pad = n => String(n).padStart(2,"0");
  const localDate = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const localTime = d => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const frDate = v => { if(!v) return "—"; const [y,m,d]=String(v).split("-"); return d&&m&&y?`${d}/${m}/${y}`:v; };
  const currentDeptValue = () => String((typeof currentDept!=="undefined"?currentDept:window.ICHEF_HACCP?.department)||"Secteur");
  const currentUser = () => String(window.ICHEF_HACCP?.userName || (typeof userAuditLabel==="function"?userAuditLabel():"") || "Utilisateur iCHEF");
  const closeLayers = () => ["hv71-trace-hub","hv71-prepared","hv71-preview"].forEach(id=>$(id)?.classList.remove("open"));
  const setDockTrace = () => document.querySelectorAll("[data-haccp-phone-tab]").forEach(b=>b.classList.toggle("active",b.dataset.haccpPhoneTab==="trace"));

  function ensureUi(){
    if(V71.ready) return; V71.ready=true;
    document.body.insertAdjacentHTML("beforeend", `
      <section id="hv71-trace-hub" class="hv71-layer" aria-label="Traçabilité">
        <div class="hv71-shell">
          <div class="hv71-head"><button class="hv71-back" type="button" onclick="haccpV7Open('home')">‹</button><div class="hv71-head-text"><strong>Traçabilité</strong><small id="hv71-trace-ident">Secteur · utilisateur</small></div><span class="hv71-chip">iCHEF HACCP</span></div>
          <div class="hv71-menu">
            <button type="button" class="hv71-menu-btn" onclick="haccpV71OpenReceived()"><span class="hv71-menu-icon">□</span><span><strong>Produit reçu</strong><small>Étiquette fournisseur · lot · DLC/DDM · photo.</small></span><span class="hv71-menu-arrow">›</span></button>
            <button type="button" class="hv71-menu-btn primary" onclick="haccpV71OpenPrepared()"><span class="hv71-menu-icon">♨</span><span><strong>Produit préparé</strong><small>Créer un ticket DLC secondaire prêt à imprimer.</small></span><span class="hv71-menu-arrow">›</span></button>
            <button type="button" class="hv71-menu-btn" onclick="haccpV71OpenHistory()"><span class="hv71-menu-icon">◷</span><span><strong>Historique traçabilité</strong><small>Relevés, DLC et tickets déjà créés.</small></span><span class="hv71-menu-arrow">›</span></button>
            <button type="button" class="hv71-menu-btn" onclick="haccpV71ScanReceived()"><span class="hv71-menu-icon">▣</span><span><strong>Scanner une étiquette</strong><small>Photo + lecture IA de l’étiquette fournisseur.</small></span><span class="hv71-menu-arrow">›</span></button>
          </div>
        </div>
      </section>
      <section id="hv71-prepared" class="hv71-layer" aria-label="Créer un ticket DLC">
        <div class="hv71-shell">
          <div class="hv71-head"><button class="hv71-back" type="button" onclick="haccpV71TraceHub()">‹</button><div class="hv71-head-text"><strong>Produit préparé</strong><small>Créer un ticket DLC</small></div><span id="hv71-mode-chip" class="hv71-chip">TÉLÉPHONE</span></div>
          <div class="hv71-card"><div class="hv71-grid">
            <label class="hv71-field full"><span>NOM DU PRODUIT *</span><input id="hv71-product" type="text" list="list-trace-name" placeholder="Ex. Sauce tomate maison" autocomplete="off"></label>
            <label class="hv71-field full"><span>CATÉGORIE</span><div class="hv71-category-row"><select id="hv71-category"><option value="">Sans catégorie</option></select><button type="button" title="Gérer les catégories" onclick="haccpV71QuickCategory()">＋</button></div></label>
            <label class="hv71-field"><span>DATE DE PRÉPARATION *</span><input id="hv71-prep-date" type="date"></label>
            <label class="hv71-field"><span>HEURE *</span><input id="hv71-prep-time" type="time"></label>
            <label class="hv71-field"><span>DLC SECONDAIRE *</span><input id="hv71-dlc-date" type="date"></label>
            <label class="hv71-field"><span>HEURE DLC</span><input id="hv71-dlc-time" type="time"></label>
            <label class="hv71-field full"><span>LOT INTERNE (OPTIONNEL)</span><input id="hv71-lot" type="text" placeholder="Généré automatiquement si vide"></label>
            <label class="hv71-field full"><span>CONSERVATION</span><select id="hv71-storage"><option value="Selon PMS / fiche produit">Selon PMS / fiche produit</option><option value="≤ 4 °C · froid positif">≤ 4 °C · froid positif</option><option value="≤ 8 °C · froid positif">≤ 8 °C · froid positif</option><option value="≤ -18 °C · congelé">≤ -18 °C · congelé</option><option value="≥ 63 °C · maintien chaud">≥ 63 °C · maintien chaud</option><option value="Autre · selon PMS">Autre · selon PMS</option></select></label>
            <label class="hv71-field full"><span>ALLERGÈNES (OPTIONNEL)</span><input id="hv71-allergens" type="text" placeholder="Ex. Lait, gluten, moutarde…"></label>
            <label class="hv71-field full"><span>PRÉPARÉ PAR</span><input id="hv71-prepared-by" type="text" readonly></label>
          </div><div class="hv71-help">La DLC n’est pas calculée automatiquement : elle doit être validée selon le PMS / la fiche produit de l’établissement.</div></div>
          <button type="button" class="hv71-primary" onclick="haccpV71PreviewPrepared()">VOIR L’APERÇU DE L’ÉTIQUETTE</button>
          <div id="hv71-form-status" class="hv71-status" aria-live="polite"></div>
        </div>
      </section>
      <section id="hv71-preview" class="hv71-layer" aria-label="Aperçu étiquette">
        <div class="hv71-shell">
          <div class="hv71-head"><button class="hv71-back" type="button" onclick="haccpV71BackToPrepared()">‹</button><div class="hv71-head-text"><strong>Aperçu étiquette</strong><small>Vérifier puis imprimer</small></div><span id="hv71-format-chip" class="hv71-chip">50 × 30 MM</span></div>
          <div class="hv72-format-panel" id="hv72-format-panel">
            <div class="hv72-format-title">FORMAT D’IMPRESSION · ORDINATEUR UNIQUEMENT</div>
            <div class="hv72-format-options">
              <label class="hv72-format-card"><input type="radio" name="hv72-format" value="eco" onchange="haccpV72SetFormat('eco')"><span class="hv72-format-body"><strong>Eco · 35 × 20 mm</strong><small>Petit format économique · informations essentielles + QR.</small></span></label>
              <label class="hv72-format-card"><input type="radio" name="hv72-format" value="standard" onchange="haccpV72SetFormat('standard')" checked><span class="hv72-format-body"><strong>Standard · 50 × 30 mm</strong><small>Format recommandé pour la majorité des préparations.</small></span></label>
              <label class="hv72-format-card"><input type="radio" name="hv72-format" value="complete" onchange="haccpV72SetFormat('complete')"><span class="hv72-format-body"><strong>Complet · 60 × 40 mm</strong><small>Plus d’espace pour lot, allergènes et informations détaillées.</small></span></label>
            </div>
            <div class="hv72-format-note">Le format Eco privilégie la rapidité et le QR. Utilisez Standard ou Complet lorsque votre PMS ou votre usage exige davantage d’informations visibles directement sur l’étiquette. Sur téléphone, iCHEF reste automatiquement en Standard 50 × 30 mm.</div>
          </div>
          <div class="hv71-card"><div class="hv71-label-wrap"><div id="hv71-label-preview" class="hv71-label" data-format="standard"></div></div>
            <div style="text-align:center;font-size:11px;font-weight:900;color:#626b72">NOMBRE D’ÉTIQUETTES</div>
            <div class="hv71-copy"><button type="button" onclick="haccpV71Copies(-1)">−</button><output id="hv71-copy-count">1</output><button type="button" onclick="haccpV71Copies(1)">＋</button></div>
            <div class="hv71-preview-actions"><button type="button" class="print" onclick="haccpV71PrintPrepared()">🖨 IMPRIMER</button><button type="button" onclick="haccpV71DownloadPdf()">⬇ TÉLÉCHARGER PDF</button><button type="button" onclick="haccpV71BackToPrepared()">✎ MODIFIER</button></div>
            <div id="hv71-preview-status" class="hv71-status" aria-live="polite"></div>
          </div>
        </div>
      </section>`);
    const resetSaved=()=>{V71.savedId=null;V71.savedSignature="";V71.current=null;};
    ["hv71-product","hv71-category","hv71-prep-date","hv71-prep-time","hv71-dlc-date","hv71-dlc-time","hv71-lot","hv71-storage","hv71-allergens"].forEach(id=>$(id)?.addEventListener("input",resetSaved));
  }

  function traceCatalog(){
    const dep=currentDeptValue();
    const groups=(typeof EMPIRE_LISTS!=="undefined" && EMPIRE_LISTS?.[dep]?.trace) || {};
    return groups;
  }
  function populateCategories(){
    const sel=$("hv71-category"); if(!sel) return;
    const groups=traceCatalog(); const current=sel.value;
    sel.innerHTML='<option value="">Sans catégorie</option>'+Object.keys(groups).map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join("");
    if([...sel.options].some(o=>o.value===current)) sel.value=current;
  }
  function defaultPreparedForm(){
    const now=new Date();
    if(!$("hv71-prep-date").value) $("hv71-prep-date").value=localDate(now);
    if(!$("hv71-prep-time").value) $("hv71-prep-time").value=localTime(now);
    if(!$("hv71-dlc-time").value) $("hv71-dlc-time").value=localTime(now);
    $("hv71-prepared-by").value=`${currentUser()} (${currentDeptValue()})`;
    populateCategories();
  }
  function autoLot(d){return `PRP-${String(d.prepDate||"").replaceAll("-","")}-${String(d.prepTime||"").replace(":","")}`}
  function readForm(){
    const d={
      name:String($("hv71-product")?.value||"").trim(),category:String($("hv71-category")?.value||"").trim(),
      prepDate:String($("hv71-prep-date")?.value||""),prepTime:String($("hv71-prep-time")?.value||""),
      dlcDate:String($("hv71-dlc-date")?.value||""),dlcTime:String($("hv71-dlc-time")?.value||""),
      lot:String($("hv71-lot")?.value||"").trim(),storage:String($("hv71-storage")?.value||"Selon PMS / fiche produit"),
      allergens:String($("hv71-allergens")?.value||"").trim(),preparedBy:currentUser(),dept:currentDeptValue()
    };
    if(!d.lot) d.lot=autoLot(d);
    d.labelId=`LBL-${Date.now()}`;
    return d;
  }
  function validateForm(d){
    if(!d.name) return "Indiquez le nom du produit préparé.";
    if(!d.prepDate||!d.prepTime) return "Indiquez la date et l’heure de préparation.";
    if(!d.dlcDate) return "Indiquez la DLC secondaire selon votre PMS.";
    const a=new Date(`${d.prepDate}T${d.prepTime||"00:00"}`), b=new Date(`${d.dlcDate}T${d.dlcTime||"23:59"}`);
    if(Number.isFinite(a.getTime())&&Number.isFinite(b.getTime())&&b<a) return "La DLC ne peut pas être antérieure à la préparation.";
    return "";
  }

  function qrMatrix(text){
    const bytes=Array.from(String(text||"")).map(ch=>ch.charCodeAt(0)&255); if(bytes.length>17)bytes.splice(17);
    const exp=new Array(512).fill(0),log=new Array(256).fill(0);let gx=1;
    for(let i=0;i<255;i++){exp[i]=gx;log[gx]=i;gx<<=1;if(gx&256)gx^=0x11d}for(let i=255;i<512;i++)exp[i]=exp[i-255];
    const mul=(a,b)=>!a||!b?0:exp[log[a]+log[b]];
    let gen=[1];for(let i=0;i<7;i++){const ng=new Array(gen.length+1).fill(0);for(let j=0;j<gen.length;j++){ng[j]^=gen[j];ng[j+1]^=mul(gen[j],exp[i])}gen=ng}
    const bits=[];const put=(v,n)=>{for(let i=n-1;i>=0;i--)bits.push((v>>>i)&1)};put(4,4);put(bytes.length,8);bytes.forEach(b=>put(b,8));for(let i=0;i<Math.min(4,152-bits.length);i++)bits.push(0);while(bits.length%8)bits.push(0);
    const data=[];for(let i=0;i<bits.length;i+=8){let v=0;for(let j=0;j<8;j++)v=(v<<1)|(bits[i+j]||0);data.push(v)}let pi=0;while(data.length<19)data.push(pi++%2?0x11:0xec);
    const rem=data.concat(new Array(7).fill(0));for(let i=0;i<data.length;i++){const coef=rem[i];if(coef)for(let j=0;j<gen.length;j++)rem[i+j]^=mul(coef,gen[j])}const codewords=data.concat(rem.slice(-7));
    const size=21,m=Array.from({length:size},()=>Array(size).fill(false)),fn=Array.from({length:size},()=>Array(size).fill(false));
    const setf=(x,y,v)=>{if(x>=0&&x<size&&y>=0&&y<size){m[y][x]=!!v;fn[y][x]=true}};
    const finder=(cx,cy)=>{for(let dy=-4;dy<=4;dy++)for(let dx=-4;dx<=4;dx++){const x=cx+dx,y=cy+dy;if(x>=0&&x<size&&y>=0&&y<size){const d=Math.max(Math.abs(dx),Math.abs(dy));setf(x,y,d!==2&&d!==4)}}};finder(3,3);finder(size-4,3);finder(3,size-4);
    for(let i=8;i<size-8;i++){setf(6,i,i%2===0);setf(i,6,i%2===0)}
    let fmtData=8,remFmt=fmtData<<10;for(let i=14;i>=10;i--)if((remFmt>>>i)&1)remFmt^=0x537<<(i-10);const fmt=((fmtData<<10)|(remFmt&0x3ff))^0x5412;
    for(let i=0;i<6;i++)setf(8,i,(fmt>>>i)&1);setf(8,7,(fmt>>>6)&1);setf(8,8,(fmt>>>7)&1);setf(7,8,(fmt>>>8)&1);for(let i=9;i<15;i++)setf(14-i,8,(fmt>>>i)&1);for(let i=0;i<8;i++)setf(size-1-i,8,(fmt>>>i)&1);for(let i=8;i<15;i++)setf(8,size-15+i,(fmt>>>i)&1);setf(8,size-8,true);
    const db=[];codewords.forEach(c=>{for(let i=7;i>=0;i--)db.push((c>>>i)&1)});let idx=0,right=size-1,up=true;while(right>=1){if(right===6)right--;for(let v=0;v<size;v++){const y=up?size-1-v:v;for(let j=0;j<2;j++){const x=right-j;if(!fn[y][x]){let bit=idx<db.length?db[idx]:0;idx++;if((x+y)%2===0)bit^=1;m[y][x]=!!bit}}}up=!up;right-=2}return m;
  }
  function qrSvg(text){const q=qrMatrix(text),b=4,n=q.length+2*b,parts=[`<svg viewBox="0 0 ${n} ${n}" aria-label="QR iCHEF" role="img" xmlns="http://www.w3.org/2000/svg"><rect width="${n}" height="${n}" fill="#fff"/>`];for(let y=0;y<q.length;y++)for(let x=0;x<q.length;x++)if(q[y][x])parts.push(`<rect x="${x+b}" y="${y+b}" width="1" height="1" fill="#000"/>`);parts.push("</svg>");return parts.join("")}
  function drawQrCanvas(ctx,text,x,y,size){const q=qrMatrix(text),b=4,n=q.length+2*b,cell=size/n;ctx.fillStyle="#fff";ctx.fillRect(x,y,size,size);ctx.fillStyle="#000";for(let r=0;r<q.length;r++)for(let c=0;c<q.length;c++)if(q[r][c])ctx.fillRect(x+(c+b)*cell,y+(r+b)*cell,Math.ceil(cell),Math.ceil(cell))}

  const V72_FORMATS={
    eco:{key:"eco",label:"Eco",widthMm:35,heightMm:20,chip:"35 × 20 MM"},
    standard:{key:"standard",label:"Standard",widthMm:50,heightMm:30,chip:"50 × 30 MM"},
    complete:{key:"complete",label:"Complet",widthMm:60,heightMm:40,chip:"60 × 40 MM"}
  };
  function formatStorageKey(){const t=String(window.ICHEF_HACCP?.tenantID||localStorage.getItem("ichef_tenant_id")||"default");return `ichef_haccp_label_format_${t}`}
  function formatKey(){return isPhone()?"standard":(V72_FORMATS[V71.format]?V71.format:"standard")}
  function formatCfg(key=formatKey()){return V72_FORMATS[key]||V72_FORMATS.standard}
  function syncFormatUi(){const key=formatKey(),cfg=formatCfg(key),chip=$("hv71-format-chip"),preview=$("hv71-label-preview");if(chip)chip.textContent=isPhone()?`${cfg.chip} · AUTO`:cfg.chip;if(preview)preview.dataset.format=key;document.querySelectorAll('input[name="hv72-format"]').forEach(i=>i.checked=i.value===key);if(V71.current&&preview)preview.innerHTML=labelMarkup(V71.current,key)}
  window.haccpV72SetFormat=function(key){if(isPhone())return; if(!V72_FORMATS[key])key="standard";V71.format=key;try{localStorage.setItem(formatStorageKey(),key)}catch(_){}syncFormatUi()};
  function loadDesktopFormat(){if(isPhone()){V71.format="standard";return}try{const k=localStorage.getItem(formatStorageKey());V71.format=V72_FORMATS[k]?k:"standard"}catch(_){V71.format="standard"}}

  function labelMarkup(d,key=formatKey()){
    const allergens=d.allergens||"Non renseigné";
    const top=`<div class="hv71-label-top"><div class="hv71-label-brand">iCHEF</div><div class="hv71-label-site">${esc(d.dept)}<br>HACCP</div></div><div class="hv71-label-name">${esc(d.name)}</div>`;
    const qr=`<div class="hv71-label-qr">${qrSvg(d.labelId)}</div>`;
    if(key==="eco") return `${top}<div class="hv71-label-row"><span>Prép. :</span><b>${esc(frDate(d.prepDate))} ${esc(d.prepTime)}</b></div><div class="hv71-label-row"><span>DLC :</span><b class="hv71-label-dlc">${esc(frDate(d.dlcDate))} ${esc(d.dlcTime||"")}</b></div><div class="hv71-label-row"><span>Conservation :</span><b>${esc(d.storage)}</b></div>${qr}<div class="hv71-label-bottom"><span>Lot ${esc(d.lot)}</span><span>${esc(d.labelId)}</span></div>`;
    const extra=key==="complete"?`<div class="hv71-label-row"><span>Catégorie :</span><b>${esc(d.category||"—")}</b></div>`:"";
    return `${top}<div class="hv71-label-row"><span>Préparé le :</span><b>${esc(frDate(d.prepDate))} ${esc(d.prepTime)}</b></div><div class="hv71-label-row"><span>DLC :</span><b class="hv71-label-dlc">${esc(frDate(d.dlcDate))} ${esc(d.dlcTime||"")}</b></div><div class="hv71-label-row"><span>Lot :</span><b>${esc(d.lot)}</b></div><div class="hv71-label-row"><span>Conservation :</span><b>${esc(d.storage)}</b></div><div class="hv71-label-row"><span>Allergènes :</span><b>${esc(allergens)}</b></div>${extra}${qr}<div class="hv71-label-bottom"><span>Préparé par : ${esc(d.preparedBy)}</span><span>${esc(d.labelId)}</span></div>`;
  }
  function signature(d){return JSON.stringify([d.name,d.category,d.prepDate,d.prepTime,d.dlcDate,d.dlcTime,d.lot,d.storage,d.allergens,d.preparedBy,d.dept])}
  async function savePreparedTrace(d){
    const sig=signature(d); if(V71.savedId && V71.savedSignature===sig) return V71.savedId;
    if(typeof db==="undefined" || !Array.isArray(db.trace) || typeof API?.update!=="function") return null;
    const now=new Date();
    const id=Date.now();
    const entry={id,timestamp:now.toISOString(),date:now.toLocaleDateString("fr-FR"),time:now.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"}),dept:d.dept,audit:`Saisi par ${d.preparedBy}`,name:d.name,lot:d.lot,openDate:d.prepDate,dlc:d.dlcDate,img:false,preparedProduct:true,category:d.category||"",prepDate:d.prepDate,prepTime:d.prepTime,dlcTime:d.dlcTime||"",storage:d.storage,allergens:d.allergens||"",labelId:d.labelId,labelCopies:V71.copies,labelFormat:formatKey(),source:"PREPARED_PRODUCT_LABEL"};
    db.trace.unshift(entry); await API.update("HACCP_TRACE",db.trace); V71.savedId=id; V71.savedSignature=sig; try{typeof renderLogs==="function"&&renderLogs()}catch(_){} return id;
  }

  function drawWrapped(ctx,text,x,y,maxWidth,lineHeight,maxLines=2){
    const words=String(text||"").split(/\s+/); let line="", lines=[];
    for(const w of words){const test=line?line+" "+w:w;if(ctx.measureText(test).width>maxWidth&&line){lines.push(line);line=w}else line=test}
    if(line)lines.push(line); lines=lines.slice(0,maxLines); lines.forEach((l,i)=>ctx.fillText(l,x,y+i*lineHeight)); return y+lines.length*lineHeight;
  }
  function labelCanvas(d,key=formatKey()){
    const cfg=formatCfg(key),ppm=30,c=document.createElement("canvas");c.width=Math.round(cfg.widthMm*ppm);c.height=Math.round(cfg.heightMm*ppm);const x=c.getContext("2d"),W=c.width,H=c.height,s=Math.min(W/1500,H/900);
    const left=70*s,right=W-70*s;x.fillStyle="#fff";x.fillRect(0,0,W,H);x.fillStyle="#111";x.font=`900 ${74*s}px Arial`;x.fillText("iCHEF",left,105*s);x.font=`900 ${30*s}px Arial`;x.textAlign="right";x.fillText(String(d.dept||"HACCP").toUpperCase(),right,82*s);x.font=`700 ${25*s}px Arial`;x.fillText("HACCP",right,118*s);x.textAlign="left";x.fillRect(left,145*s,W-left*2,Math.max(2,5*s));x.font=`900 ${66*s}px Arial`;let y=235*s;y=drawWrapped(x,d.name,left,y,W-left*2,70*s,key==="eco"?1:2)+5*s;
    if(key==="eco"){x.font=`700 ${34*s}px Arial`;x.fillText(`Prép. : ${frDate(d.prepDate)} ${d.prepTime}`,left,y);y+=60*s;x.font=`900 ${52*s}px Arial`;x.fillText(`DLC : ${frDate(d.dlcDate)} ${d.dlcTime||""}`,left,y);y+=62*s;x.font=`700 ${28*s}px Arial`;x.fillText(`Conservation : ${d.storage}`,left,y);drawQrCanvas(x,d.labelId,W-315*s,H-330*s,240*s);x.fillRect(left,H-120*s,W-left*2,Math.max(2,3*s));x.font=`700 ${22*s}px Arial`;x.fillText(`Lot : ${d.lot}`,left,H-70*s);x.textAlign="right";x.fillText(d.labelId,right,H-70*s);return c}
    x.font=`700 ${34*s}px Arial`;x.fillText(`Préparé le : ${frDate(d.prepDate)} ${d.prepTime}`,left,y);y+=58*s;x.font=`900 ${52*s}px Arial`;x.fillText(`DLC : ${frDate(d.dlcDate)} ${d.dlcTime||""}`,left,y);y+=62*s;x.font=`700 ${30*s}px Arial`;x.fillText(`Lot : ${d.lot}`,left,y);y+=46*s;x.fillText(`Conservation : ${d.storage}`,left,y);y+=46*s;x.fillText(`Allergènes : ${d.allergens||"Non renseigné"}`,left,y);if(key==="complete"){y+=46*s;x.fillText(`Catégorie : ${d.category||"—"}`,left,y)}drawQrCanvas(x,d.labelId,W-340*s,H-400*s,240*s);x.fillRect(left,H-130*s,W-left*2,Math.max(2,3*s));x.font=`700 ${24*s}px Arial`;x.fillText(`Préparé par : ${d.preparedBy}`,left,H-75*s);x.textAlign="right";x.fillText(d.labelId,right,H-75*s);return c;
  }
  function bytesFromBase64(b64){const bin=atob(b64),out=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)out[i]=bin.charCodeAt(i);return out}
  function concatBytes(parts){let n=parts.reduce((a,b)=>a+b.length,0),out=new Uint8Array(n),o=0;for(const p of parts){out.set(p,o);o+=p.length}return out}
  function pdfForLabel(jpeg,w,h,copies,key=formatKey()){
    const enc=s=>new TextEncoder().encode(s), objs=[];const add=b=>{objs.push(typeof b==="string"?enc(b):b);return objs.length};
    const catalog=add(""); const pages=add(""); const imgObj=add(concatBytes([enc(`<< /Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`),jpeg,enc("\nendstream")]));
    const pageIds=[],cfg=formatCfg(key),W=cfg.widthMm*2.834645669,H=cfg.heightMm*2.834645669;
    for(let i=0;i<copies;i++){const content=`q\n${W.toFixed(3)} 0 0 ${H.toFixed(3)} 0 0 cm\n/Im0 Do\nQ\n`;const contentId=add(`<< /Length ${content.length} >>\nstream\n${content}endstream`);const pageId=add(`<< /Type /Page /Parent ${pages} 0 R /MediaBox [0 0 ${W.toFixed(3)} ${H.toFixed(3)}] /Resources << /XObject << /Im0 ${imgObj} 0 R >> >> /Contents ${contentId} 0 R >>`);pageIds.push(pageId)}
    objs[catalog-1]=enc(`<< /Type /Catalog /Pages ${pages} 0 R >>`);objs[pages-1]=enc(`<< /Type /Pages /Kids [${pageIds.map(x=>`${x} 0 R`).join(" ")}] /Count ${pageIds.length} >>`);
    const head=enc("%PDF-1.4\n%âãÏÓ\n"),parts=[head],offsets=[0];let pos=head.length;
    objs.forEach((obj,i)=>{offsets[i+1]=pos;const a=enc(`${i+1} 0 obj\n`),b=enc("\nendobj\n");parts.push(a,obj,b);pos+=a.length+obj.length+b.length});const xrefPos=pos;let xref=`xref\n0 ${objs.length+1}\n0000000000 65535 f \n`;for(let i=1;i<=objs.length;i++)xref+=String(offsets[i]).padStart(10,"0")+" 00000 n \n";xref+=`trailer\n<< /Size ${objs.length+1} /Root ${catalog} 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;parts.push(enc(xref));return concatBytes(parts)
  }

  window.haccpV71QuickCategory=async function(){
    const r=String(window.ICHEF_HACCP?.role||"").toUpperCase();
    if(!["MASTER","DIRECTION","DIRECTEUR","MANAGER","GERANT","OWNER","PATRON","CHEF","CHEF_DE_CUISINE","CHEF_EXECUTIF","CHEF_EXECUTIVE","RESPONSABLE","RESPONSABLE_CUISINE","RESPONSABLE_BAR","RESPONSABLE_SERVICE","RESPONSABLE_PATISSERIE"].includes(r)){alert("Responsable / Chef / Manager / Direction requis pour créer une catégorie.");return}
    const name=String(prompt("Nom de la nouvelle catégorie de traçabilité :","")||"").trim(); if(!name)return;
    const dep=currentDeptValue(); if(typeof EMPIRE_LISTS==="undefined"||!EMPIRE_LISTS?.[dep]?.trace)return alert("Catalogue du secteur indisponible.");
    if(EMPIRE_LISTS[dep].trace[name])return alert("Cette catégorie existe déjà.");
    EMPIRE_LISTS[dep].trace[name]=[]; try{if(typeof persistHaccpLists==="function")await persistHaccpLists();populateCategories();$("hv71-category").value=name;try{typeof populateSelects==="function"&&populateSelects()}catch(_){}}catch(e){delete EMPIRE_LISTS[dep].trace[name];alert(e.message||"Catégorie non enregistrée.")}
  };

  window.haccpV71TraceHub=function(){ensureUi();closeLayers();$("hv71-trace-hub")?.classList.add("open");const ident=$("hv71-trace-ident");if(ident)ident.textContent=`${currentUser()} · ${currentDeptValue()}`;setDockTrace()};
  window.haccpV71OpenPrepared=function(){ensureUi();closeLayers();defaultPreparedForm();const mc=$("hv71-mode-chip");if(mc)mc.textContent=isPhone()?"TÉLÉPHONE":"ORDINATEUR";$("hv71-prepared")?.classList.add("open");setDockTrace()};
  window.haccpV71BackToPrepared=function(){closeLayers();$("hv71-prepared")?.classList.add("open");setDockTrace()};
  window.haccpV71OpenReceived=async function(){closeLayers();V71.bypassTrace=true;try{await V71.originalOpen?.("trace")}finally{V71.bypassTrace=false}};
  window.haccpV71OpenHistory=window.haccpV71OpenReceived;
  window.haccpV71ScanReceived=async function(){await window.haccpV71OpenReceived();setTimeout(()=>$("htrace-scan")?.click(),120)};
  window.haccpV71PreviewPrepared=function(){const d=readForm(),err=validateForm(d),st=$("hv71-form-status");if(err){if(st){st.textContent=err;st.className="hv71-status error"}return}if(!$("hv71-lot").value)$("hv71-lot").value=d.lot;d.labelId=V71.current?.labelId||d.labelId;V71.current=d;V71.copies=1;loadDesktopFormat();if(st){st.textContent="";st.className="hv71-status"}closeLayers();$("hv71-label-preview").innerHTML=labelMarkup(d,formatKey());$("hv71-copy-count").textContent="1";$("hv71-preview")?.classList.add("open");syncFormatUi();setDockTrace()};
  window.haccpV71Copies=function(delta){V71.copies=Math.min(50,Math.max(1,V71.copies+Number(delta||0)));if($("hv71-copy-count"))$("hv71-copy-count").textContent=String(V71.copies)};
  function printCssForFormat(key){
    const cfg=formatCfg(key);
    if(key==="eco") return `@page{size:${cfg.widthMm}mm ${cfg.heightMm}mm;margin:0}*{box-sizing:border-box}body{margin:0;font-family:Arial;color:#111;background:#fff}.label{position:relative;width:${cfg.widthMm}mm;height:${cfg.heightMm}mm;padding:1.35mm;page-break-after:always;overflow:hidden}.label:last-child{page-break-after:auto}.hv71-label-top{display:flex;justify-content:space-between;border-bottom:.35mm solid #111;padding-bottom:.55mm}.hv71-label-brand{font-size:3mm;font-weight:900}.hv71-label-site{text-align:right;font-size:1.15mm;font-weight:700;text-transform:uppercase}.hv71-label-name{font-size:2.7mm;font-weight:900;margin:.65mm 0 .45mm;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.hv71-label-row{font-size:1.55mm;line-height:1.22;padding-right:8.2mm}.hv71-label-row b{font-size:1.65mm}.hv71-label-dlc{font-size:2.35mm!important}.hv71-label-qr{position:absolute;right:1.35mm;bottom:3.2mm;width:7.1mm;height:7.1mm}.hv71-label-qr svg{width:100%;height:100%;display:block}.hv71-label-bottom{position:absolute;left:1.35mm;right:1.35mm;bottom:1.1mm;border-top:.18mm solid #111;padding-top:.4mm;display:flex;justify-content:space-between;gap:1mm;font-size:1.05mm;font-weight:700}`;
    if(key==="complete") return `@page{size:${cfg.widthMm}mm ${cfg.heightMm}mm;margin:0}*{box-sizing:border-box}body{margin:0;font-family:Arial;color:#111;background:#fff}.label{position:relative;width:${cfg.widthMm}mm;height:${cfg.heightMm}mm;padding:2.7mm;page-break-after:always;overflow:hidden}.label:last-child{page-break-after:auto}.hv71-label-top{display:flex;justify-content:space-between;border-bottom:.55mm solid #111;padding-bottom:1.1mm}.hv71-label-brand{font-size:4.8mm;font-weight:900}.hv71-label-site{text-align:right;font-size:1.8mm;font-weight:700;text-transform:uppercase}.hv71-label-name{font-size:4.3mm;font-weight:900;margin:1.5mm 0 1mm;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.hv71-label-row{font-size:2.3mm;line-height:1.4;padding-right:12mm}.hv71-label-row b{font-size:2.5mm}.hv71-label-dlc{font-size:3.6mm!important}.hv71-label-qr{position:absolute;right:2.5mm;bottom:6mm;width:11mm;height:11mm}.hv71-label-qr svg{width:100%;height:100%;display:block}.hv71-label-bottom{position:absolute;left:2.7mm;right:2.7mm;bottom:2mm;border-top:.25mm solid #111;padding-top:.8mm;display:flex;justify-content:space-between;gap:2mm;font-size:1.8mm;font-weight:700}`;
    return `@page{size:${cfg.widthMm}mm ${cfg.heightMm}mm;margin:0}*{box-sizing:border-box}body{margin:0;font-family:Arial;color:#111;background:#fff}.label{position:relative;width:${cfg.widthMm}mm;height:${cfg.heightMm}mm;padding:2.2mm;page-break-after:always;overflow:hidden}.label:last-child{page-break-after:auto}.hv71-label-top{display:flex;justify-content:space-between;border-bottom:.5mm solid #111;padding-bottom:1mm}.hv71-label-brand{font-size:4.2mm;font-weight:900}.hv71-label-site{text-align:right;font-size:1.7mm;font-weight:700;text-transform:uppercase}.hv71-label-name{font-size:3.7mm;font-weight:900;margin:1.2mm 0 .8mm;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.hv71-label-row{font-size:2.15mm;line-height:1.3;padding-right:10.5mm}.hv71-label-qr{position:absolute;right:2.2mm;bottom:4.8mm;width:9.5mm;height:9.5mm}.hv71-label-qr svg{width:100%;height:100%;display:block}.hv71-label-row b{font-size:2.3mm}.hv71-label-dlc{font-size:3.2mm!important}.hv71-label-bottom{margin-top:1mm;padding-top:.8mm;border-top:.25mm solid #111;display:flex;justify-content:space-between;font-size:1.65mm;font-weight:700}`;
  }
  window.haccpV71PrintPrepared=async function(){const d=V71.current;if(!d)return;const st=$("hv71-preview-status"),key=formatKey(),cfg=formatCfg(key);try{if(st){st.textContent="Enregistrement HACCP…";st.className="hv71-status"}await savePreparedTrace(d);const labels=Array.from({length:V71.copies},()=>`<div class="label">${labelMarkup(d,key)}</div>`).join(""),w=window.open("","_blank");if(!w)return alert("Autorisez les fenêtres pour imprimer les étiquettes.");try{w.opener=null}catch(_){}w.document.write(`<html><head><title>iCHEF · ${esc(d.name)} · ${cfg.chip}</title><style>${printCssForFormat(key)}</style></head><body>${labels}<script>window.onload=()=>setTimeout(()=>window.print(),180)<\/script></body></html>`);w.document.close();if(st){st.textContent=`✓ ${V71.copies} étiquette${V71.copies>1?"s":""} ${cfg.chip} prête${V71.copies>1?"s":""} à imprimer.`;st.className="hv71-status ok"}}catch(e){if(st){st.textContent=e.message||"Impression impossible";st.className="hv71-status error"}}};
  window.haccpV71DownloadPdf=async function(){const d=V71.current;if(!d)return;const st=$("hv71-preview-status"),key=formatKey(),cfg=formatCfg(key);try{if(st){st.textContent="Création du PDF…";st.className="hv71-status"}await savePreparedTrace(d);const c=labelCanvas(d,key),url=c.toDataURL("image/jpeg",.94),jpeg=bytesFromBase64(url.split(",")[1]),pdf=pdfForLabel(jpeg,c.width,c.height,V71.copies,key),blob=new Blob([pdf],{type:"application/pdf"}),u=URL.createObjectURL(blob),a=document.createElement("a");a.href=u;a.download=`iCHEF_DLC_${d.name.replace(/[^a-z0-9_-]/gi,"_")}_${cfg.widthMm}x${cfg.heightMm}_${d.prepDate}.pdf`;a.click();setTimeout(()=>URL.revokeObjectURL(u),2000);if(st){st.textContent=`✓ PDF ${cfg.chip} téléchargé et traçabilité enregistrée.`;st.className="hv71-status ok"}}catch(e){if(st){st.textContent=e.message||"PDF impossible";st.className="hv71-status error"}}};

  function ensureDesktopTicketButton(){if(isPhone())return;const nav=document.querySelector(".nav-haccp");if(!nav||$("hv72-desktop-labels"))return;const trace=[...nav.querySelectorAll("button")].find(b=>String(b.textContent||"").toUpperCase().includes("TRAÇABILITÉ"));const b=document.createElement("button");b.id="hv72-desktop-labels";b.className="nav-btn";b.type="button";b.textContent="🏷️ TICKETS DLC";b.onclick=()=>window.haccpV71OpenPrepared();if(trace?.nextSibling)trace.parentNode.insertBefore(b,trace.nextSibling);else nav.appendChild(b)}
  function install(){ensureUi();loadDesktopFormat();syncFormatUi();ensureDesktopTicketButton();V71.originalOpen=window.haccpV7Open;if(typeof V71.originalOpen==="function")window.haccpV7Open=async function(key){if(key==="trace"&&isPhone()&&!V71.bypassTrace){if(typeof V71.originalOpen==="function")await V71.originalOpen("home");$("hv7-home")?.classList.remove("open");window.haccpV71TraceHub();return}closeLayers();return V71.originalOpen(key)};}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install,{once:true});else install();
  window.ICHEF_HACCP_V71={openPrepared:window.haccpV71OpenPrepared,traceHub:window.haccpV71TraceHub};
  window.ICHEF_HACCP_V72={formats:V72_FORMATS,setFormat:window.haccpV72SetFormat,getFormat:formatKey};
})();
</script>


<style id="ichef-haccp-v223-scope-style">
#haccp-v223-sector-bar{margin:10px 16px;padding:12px 14px;border:1px solid #467d6d;border-radius:12px;background:#10221f;color:#e7fff3;font:700 13px Inter,sans-serif;display:none;gap:9px;align-items:center;flex-wrap:wrap}
#haccp-v223-sector-bar select{width:auto;min-width:130px;max-width:80%;font-weight:800;padding:8px}
#haccp-v223-manage{display:none;margin:12px 16px;border:1px solid #7b6333;border-radius:14px;background:#121a20;padding:14px;max-width:780px;font:13px Inter,sans-serif;color:#eee}
#haccp-v223-manage h3{color:#d7ad58;margin:0 0 10px}
#haccp-v223-manage button{border:1px solid #907035;background:#263221;color:#ffe0a0;border-radius:9px;padding:10px;cursor:pointer;font-weight:800}
#haccp-v223-manage select{margin:8px 0;max-width:480px}
#haccp-v223-manage label{display:inline-flex;align-items:center;gap:6px;margin:9px}
#haccp-v223-manage label input{width:auto}
#haccp-v223-manage-status{font-size:12px;color:#9bd0b6;padding:8px 0}
/* QR des ETIQUETTES : création et impression uniquement sur ordinateur. */
body.haccp-v223-phone .hv71-menu-btn[onclick*="haccpV71OpenPrepared"],body.haccp-v223-phone #hv71-prepared,body.haccp-v223-phone #hv71-preview{display:none!important}
body.haccp-v223-staff .nav-haccp button[onclick*="inventaire"],body.haccp-v223-staff #haccp-phone-dock [data-haccp-phone-tab="inventory"],body.haccp-v223-staff .nav-haccp .admin-return,body.haccp-v223-staff #ichef-system-link-panel,body.haccp-v223-staff #mod-inventaire,body.haccp-v223-staff #mod-reception{display:none!important}
</style>
<script id="ichef-haccp-v223-scope-script">
(()=>{'use strict';
 const $=id=>document.getElementById(id),h=window.ICHEF_HACCP;
 const server=()=>typeof SERVER_URL!=='undefined'?SERVER_URL:'https://tableau-system.onrender.com';
 const tenant=()=>h?.tenantID||new URLSearchParams(location.search).get('tenantID')||'';
 const headers=()=>typeof systemHeaders==='function'?systemHeaders({'Content-Type':'application/json'}):{'Content-Type':'application/json'};
 const esc=s=>String(s??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
 const desktop=()=>typeof haccpIsPhoneMode==='function'?!haccpIsPhoneMode():innerWidth>=1101;
 if(!desktop())document.body.classList.add('haccp-v223-phone');
 // Blocage des fonctions de CRÉATION de QR pour mobile, sans toucher au scan.
 function restrictQr(){
  for(const f of ['haccpV71OpenPrepared','haccpV71PreviewPrepared','haccpV71PrintPrepared','haccpV71DownloadPdf']){
   const previous=window[f];if(typeof previous!=='function'||previous.__v223Wrapped)continue;
   const wrapper=function(...args){if(!desktop()){alert('Création de QR et étiquettes réservée au mode ordinateur. La lecture HACCP reste disponible sur téléphone.');return;}return previous.apply(this,args)};
   wrapper.__v223Wrapped=true;window[f]=wrapper;
  }
 }
 // Le script étiquettes se charge en dernier ; capture les fonctions après son init.
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',restrictQr,{once:true});else restrictQr();
 setTimeout(restrictQr,300);
 const bar=document.createElement('div');bar.id='haccp-v223-sector-bar';
 bar.innerHTML='<strong>🔐 Mes secteurs autorisés</strong> <select id="haccp-v223-sector-select" aria-label="Secteur HACCP autorisé"></select>';
 const nav=document.querySelector('.nav-haccp');if(nav)nav.insertAdjacentElement('afterend',bar);
 const mgr=document.createElement('div');mgr.id='haccp-v223-manage';
 mgr.innerHTML='<h3>🔐 Attribution des secteurs HACCP</h3><p>Sur ordinateur uniquement. Les secteurs non attribués restent invisibles au collaborateur.</p><button type="button" id="haccp-v223-manager-load">GÉRER LES ACCÈS</button><div id="haccp-v223-manager-inner" hidden><select id="haccp-v223-person"></select><div id="haccp-v223-checkboxes"></div><button id="haccp-v223-save" type="button">ENREGISTRER LES DROITS</button><div id="haccp-v223-manage-status"></div></div>';
 const content=document.querySelector('.content');if(content)content.prepend(mgr);else if(nav)bar.insertAdjacentElement('afterend',mgr);
 function refreshSectorBar(){
  if(!h?.v223Staff)return;
  const allowed=Array.isArray(h.allowedSectors)?h.allowedSectors:[];
  if(!allowed.length)return;
  bar.style.display='flex';let sel=$('haccp-v223-sector-select');
  sel.innerHTML=allowed.map(s=>`<option value="${esc(s)}">${esc(s)}</option>`).join('');
  sel.value=String(h.department||'');
 }
 $('haccp-v223-sector-select').addEventListener('change',e=>{
  if(!h.v223Staff||!h.allowedSectors.includes(e.target.value))return;
  if(typeof currentDept!=='undefined')currentDept=e.target.value;
  h.department=e.target.value;sessionStorage.setItem('ichef_haccp_department',e.target.value);
  document.querySelectorAll('.display-dept').forEach(x=>x.textContent=e.target.value);
  if(typeof populateSelects==='function')populateSelects();
  if(typeof renderLogs==='function')renderLogs();
  if(typeof hcleanEnterExpress==='function'&&typeof haccpIsPhoneMode==='function'&&haccpIsPhoneMode())hcleanEnterExpress(true);
  if(typeof updateHaccpSectorReturnButton==='function')updateHaccpSectorReturnButton();
 });
 let people=[];const zones=['CUISINE','PATISSERIE','BAR','SERVICE'];
 async function api(path,init={}){const r=await fetch(`${server()}/api/staff/haccp/${path}?tenantID=${encodeURIComponent(tenant())}`,{cache:'no-store',...init,headers:headers()});const d=await r.json().catch(()=>({}));if(!r.ok||!d.success)throw new Error(d.error||'Erreur HACCP '+r.status);return d}
 function updateForm(){const selected=people.find(p=>p.id===$('haccp-v223-person')?.value);$('haccp-v223-checkboxes').innerHTML=zones.map(k=>`<label><input type="checkbox" value="${k}" ${selected?.grant?.sectors?.includes(k)?'checked':''}> ${k}</label>`).join('');}
 $('haccp-v223-manager-load').addEventListener('click',async()=>{
  const status=$('haccp-v223-manage-status');try{const d=await api('manage');people=d.people||[];
   const target=$('haccp-v223-person');target.innerHTML=people.map(p=>`<option value="${esc(p.id)}">${esc(p.name)} — ${esc(p.dept||p.role||'')}</option>`).join('');
   $('haccp-v223-manager-inner').hidden=false;updateForm();status.textContent='';
  }catch(e){status.textContent=e.message;}
 });
 $('haccp-v223-person').addEventListener('change',updateForm);
 $('haccp-v223-save').addEventListener('click',async()=>{
  const id=$('haccp-v223-person').value;const checked=[...$('haccp-v223-checkboxes').querySelectorAll('input:checked')].map(x=>x.value);
  const status=$('haccp-v223-manage-status');try{await api('manage/'+encodeURIComponent(id),{method:'PUT',body:JSON.stringify({sectors:checked})});
   const p=people.find(p=>p.id===id);if(p)p.grant={sectors:checked};status.textContent='✓ Accès enregistrés. Les changements prennent effet à la prochaine validation serveur.';
  }catch(e){status.textContent='❌ '+e.message;}
 });
 async function initAccess(){
  if(!h?.authenticated)return;
  if(h.v223Staff){
   document.body.classList.add('haccp-v223-staff');
   refreshSectorBar();
   return;
  }
  // Seul un responsable connecté et sur ordinateur voit les réglages.
  if(!desktop())return;
  try{await api('manage');mgr.style.display='block'}catch(e){}
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(initAccess,450),{once:true});
 else setTimeout(initAccess,450);
 window.addEventListener('ichef:haccp:authenticated',()=>setTimeout(initAccess,90));
 setTimeout(initAccess,2500);
})();
</script>

<style id="ichef-v224-haccp-presence-style">
#ichef-v224-presence-lock{position:fixed;inset:0;z-index:999999;display:none;align-items:center;justify-content:center;
 background:rgba(4,8,13,.97);color:#fff;padding:24px;font-family:Inter,Arial,sans-serif;text-align:center}
#ichef-v224-presence-lock.visible{display:flex!important}
#ichef-v224-presence-lock .box{background:#0e1721;border:1px solid #5b4330;border-radius:18px;padding:30px 24px;max-width:410px}
#ichef-v224-presence-lock strong{font-size:21px;color:#f0bb70}
#ichef-v224-presence-lock p{color:#cbd5e1;line-height:1.65}
#ichef-v224-presence-lock button{border:0;border-radius:9px;background:#d7ad58;color:#0b0e14;padding:13px 16px;font-weight:900;cursor:pointer}
</style>
<div id="ichef-v224-presence-lock" role="alertdialog" aria-modal="true" aria-label="Accès HACCP désactivé">
 <div class="box"><strong>🔒 HACCP désactivé</strong><p id="ichef-v224-presence-reason">Vous êtes hors du réseau professionnel. Votre accès a expiré.</p>
 <button type="button" id="ichef-v224-presence-retry">Vérifier ma présence</button>
 <p><a href="portail-staff.html" style="color:#e7c88a">Retour à iCHEF Staff</a></p></div>
</div>
<script id="ichef-v224-haccp-presence-script">
(()=>{'use strict';
 const lock=document.getElementById('ichef-v224-presence-lock'),reason=document.getElementById('ichef-v224-presence-reason');
 let busy=false,lastValidated=false;
 function token(){return String(window.ICHEF_HACCP?.accessToken||sessionStorage.getItem('ichef_access_token')||'')}
 function device(){return String(window.ICHEF_HACCP?.deviceId||localStorage.getItem('ichef_device_id')||'')}
 async function check(){
  if(!window.ICHEF_HACCP?.v223Staff||busy)return;
  busy=true;
  try{
   const t=token(),id=window.ICHEF_HACCP.tenantID;
   if(!t||!id)throw Error('Session Staff absente.');
   const r=await fetch('https://tableau-system.onrender.com/api/staff/haccp/presence?tenantID='+encodeURIComponent(id),{
    cache:'no-store',credentials:'omit',headers:{Authorization:'Bearer '+t,'X-iCHEF-Tenant':id,'X-iCHEF-Device':device()}});
   const data=await r.json().catch(()=>({}));
   if(!r.ok||!data.success||!data.allowed){lastValidated=false;lock.classList.add('visible');
    reason.textContent='Votre présence dans l’établissement n’est pas vérifiée. Reconnectez-vous au réseau du restaurant, puis réessayez.';return;}
   lastValidated=true;lock.classList.remove('visible');
  }catch(e){lastValidated=false;lock.classList.add('visible');
   reason.textContent='Impossible de vérifier votre présence. Aucun relevé HACCP ne doit être enregistré hors connexion.';
  }finally{busy=false}
 }
 document.getElementById('ichef-v224-presence-retry')?.addEventListener('click',check);
 window.addEventListener('offline',()=>{if(window.ICHEF_HACCP?.v223Staff){lastValidated=false;lock.classList.add('visible')}});
 window.addEventListener('online',check);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)void check()});
 setInterval(()=>{if(!document.hidden)void check()},20000);
 const timer=setInterval(()=>{if(window.ICHEF_HACCP?.v223Staff){clearInterval(timer);void check()}},500);
 setTimeout(()=>clearInterval(timer),30000);
})();
</script>
<style id="ichef-haccp-v225-pro-desktop-css">
/* V225 — HABILLAGE DESKTOP. AUCUNE MODIFICATION DES APIS OU DU MOBILE. */
#hv225-bar,#hv225-sidebar,#hv225-filter-col,#hv225-data,#hv225-lower,#hv225-drawer-shade{display:none}
@media (min-width:1101px){
 body.hv225-ready {--hv225-ink:#111d2b;--hv225-gold:#f3bf49;--hv225-outline:#dfe5ed;background:#f4f7fb!important;color:#111d2b!important}
 body.hv225-ready>.nav-haccp{display:none!important}
 body.hv225-ready>.content{display:block!important;flex:none!important;position:relative!important;margin:74px 0 0 232px!important;width:calc(100% - 232px)!important;height:calc(100dvh - 74px)!important;min-height:0!important;padding:22px 24px 38px!important;box-sizing:border-box!important;overflow:auto!important;background:#f4f7fb!important}
 body.hv225-ready>.content>#haccp-regulatory-banner,body.hv225-ready>.content>#ichef-system-link-panel{display:none!important}
 body.hv225-ready>#haccp-v223-sector-bar{display:none!important}
 body.hv225-ready #haccp-v223-manage{max-width:none;margin:0;background:transparent!important;border:0!important;padding:0!important;color:#1c2736!important}
 body.hv225-ready #haccp-v223-manage h3{display:none!important}
 body.hv225-ready #haccp-v223-manage p{font-size:12px;color:#6b7482;margin:4px 0 8px}
 body.hv225-ready #haccp-v223-manage button{background:#fff!important;color:#1c2736!important;border:1px solid #cbd5e1!important;border-radius:9px!important;padding:9px 12px!important;font-size:12px!important}
 body.hv225-ready #haccp-v223-save{width:100%;font-size:12px!important;font-weight:900!important}
 body.hv225-ready #haccp-v223-manager-inner select{max-width:100%!important;margin:9px 0!important}
 body.hv225-ready #haccp-v223-checkboxes{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}
 body.hv225-ready #haccp-v223-checkboxes label{margin:0!important;font-size:12px!important;color:#1f2a3a!important;gap:8px!important}
 body.hv225-ready #haccp-v223-checkboxes input{accent-color:#2777e7}
 body.hv225-ready #hv225-bar{display:flex!important;position:fixed;top:0;left:0;right:0;height:74px;z-index:750;background:#111c29;box-shadow:0 3px 20px rgba(8,18,30,.12);align-items:center;padding:0 19px;gap:18px;box-sizing:border-box;color:#edf4ff}
 #hv225-bar .brand{display:flex;align-items:center;gap:13px;min-width:220px}
 #hv225-bar .brand b{font-size:27px;font-weight:950;letter-spacing:-1px;color:#f5c454}
 #hv225-bar .brand em{font-style:normal;font-weight:750;font-size:17px;color:#fff;border-left:1px solid #566273;padding-left:13px}
 #hv225-bar .top-site{font-size:12px;color:#ebf0f7;border:1px solid #35445a;border-radius:10px;padding:11px 13px;min-width:170px}
 #hv225-bar .top-pill{font-size:11px;color:#e9edf2;white-space:nowrap}
 #hv225-bar .top-status{margin-left:auto;font-size:12px;color:#52e3a6;white-space:nowrap}
 #hv225-bar .top-status:before{content:'●';margin-right:9px}
 #hv225-bar .top-time{font-size:12px;font-weight:800;color:#fff;white-space:nowrap;padding-left:14px}
 #hv225-bar button{background:#192535!important;color:#f5f8fd!important;border:1px solid #344258!important;border-radius:9px!important;padding:10px!important;font-size:12px!important;cursor:pointer}
 body.hv225-ready #hv225-sidebar{display:flex!important;position:fixed;left:0;top:74px;bottom:0;width:232px;box-sizing:border-box;background:#111c29;color:#dbe4ee;z-index:740;flex-direction:column;overflow:auto;padding:9px 12px 14px}
 #hv225-sidebar button{width:100%;border:0!important;background:transparent!important;color:#dce5ed!important;text-align:left!important;padding:14px 15px!important;font-size:13px!important;font-weight:650!important;border-radius:10px!important;display:flex;gap:12px;align-items:center;cursor:pointer!important}
 #hv225-sidebar button i{font-style:normal;font-size:19px;width:25px;text-align:center}
 #hv225-sidebar button.active{color:#ffd16e!important;background:#4c4232!important;border-left:3px solid #f6c24e!important;border-radius:8px!important}
 #hv225-sidebar button:hover{background:#202f42!important}
 #hv225-sidebar .group-label{font-size:10px;letter-spacing:2px;color:#7f90a4;margin:24px 12px 10px}
 #hv225-sidebar .sidebar-foot{margin-top:auto;padding:12px;border:1px solid #36475a;border-radius:12px;font-size:11px;line-height:1.8;color:#c9d7e6}
 #hv225-sidebar .sidebar-foot strong{display:block;color:#fff;font-size:12px}
 body.hv225-ready #mod-temp.active{display:flex!important;flex-direction:column!important;gap:0!important;background:transparent!important}
 body.hv225-ready #haccp-desktop-temp-hub{display:flex!important;background:transparent!important;gap:14px!important}
 body.hv225-ready #haccp-desktop-temp-hub .hd-temp-head{border:0!important;padding:0 0 8px!important;background:transparent!important;align-items:center!important}
 body.hv225-ready .hd-temp-kicker{color:#8993a3!important;letter-spacing:1px!important;font-size:10px!important}
 body.hv225-ready .hd-temp-head h1{color:#172435!important;font-size:29px!important;letter-spacing:-.8px!important}
 body.hv225-ready .hd-temp-head h1:before{content:'♨';color:#263d58;margin-right:12px}
 body.hv225-ready .hd-temp-head p{color:#6a7484!important;font-size:12px!important}
 body.hv225-ready .hd-temp-head-actions{gap:9px!important}
 body.hv225-ready #hv225-sector-control{display:flex;align-items:center;gap:9px;color:#536273;font-size:12px;font-weight:750}
 body.hv225-ready #hv225-sector-control select,body.hv225-ready #hv225-sector-control span{padding:11px 13px;border:1px solid #cbd5e1;border-radius:9px;background:#fff;color:#19283a;font-size:12px;min-width:110px}
 body.hv225-ready #hv225-sector-control select[hidden],body.hv225-ready #hv225-sector-control span[hidden]{display:none!important}
 body.hv225-ready .hd-chip{background:#ecf0f4!important;border:1px solid #cbd3dd!important;font-size:10px!important;color:#5e6e82!important}
 body.hv225-ready .hd-btn.primary{color:#16202e!important;background:#f8bf42!important;border:1px solid #e5af34!important;box-shadow:0 3px 10px rgba(179,122,18,.13)!important}
 body.hv225-ready .hd-btn.secondary{background:#fff!important;color:#152334!important;border:1px solid #cfd6df!important}
 body.hv225-ready .hd-btn{padding:12px 15px!important;font-size:11px!important;border-radius:9px!important;min-height:43px!important}
 body.hv225-ready .hd-kpis{gap:14px!important}
 body.hv225-ready .hd-kpi{min-height:108px!important;display:grid!important;grid-template-columns:64px 1fr!important;grid-template-rows:1fr auto auto 1fr!important;column-gap:18px!important;padding:14px!important;border-radius:12px!important;border:1px solid #dce3ed!important;background:#e7f2ff!important;text-align:left!important}
 body.hv225-ready .hd-kpi:before{content:'▣';display:grid;place-items:center;grid-row:1/5;grid-column:1;width:56px;height:56px;border-radius:50%;background:#c4defc;color:#2773da;font-size:25px;font-weight:800}
 body.hv225-ready .hd-kpi span{grid-column:2;grid-row:3!important;color:#233142!important;font-size:12px!important;letter-spacing:0!important;font-weight:850}
 body.hv225-ready .hd-kpi strong{grid-column:2!important;grid-row:2!important;color:#2570d6!important;font-size:29px!important}
 body.hv225-ready .hd-kpi small{grid-column:2;grid-row:4;color:#596a7d!important;font-size:10px!important}
 body.hv225-ready .hd-kpi:nth-child(2){background:#fff5de!important;border-color:#f5dfaf!important}
 body.hv225-ready .hd-kpi:nth-child(2):before{content:'◷';background:#ffe3a1;color:#af660e}
 body.hv225-ready .hd-kpi:nth-child(2) strong{color:#c9690f!important}
 body.hv225-ready .hd-kpi:nth-child(3){background:#e8faef!important;border-color:#caf1d9!important}
 body.hv225-ready .hd-kpi:nth-child(3):before{content:'✓';background:#b9edcd;color:#0b9c58}
 body.hv225-ready .hd-kpi:nth-child(3) strong{color:#0b9657!important}
 body.hv225-ready .hd-kpi:nth-child(4){background:#ffebee!important;border-color:#f9ced5!important}
 body.hv225-ready .hd-kpi:nth-child(4):before{content:'!';background:#ffc9cf;color:#d92c43}
 body.hv225-ready .hd-kpi:nth-child(4) strong{color:#d92c43!important}
 /* dashboard principal */
 body.hv225-ready #hv225-workgrid{display:grid;grid-template-columns:274px minmax(0,1fr);gap:15px;min-height:340px}
 body.hv225-ready #hv225-filter-col{display:flex!important;flex-direction:column;gap:14px}
 body.hv225-ready .hv225-card{background:#fff;border:1px solid #dce3ed;border-radius:12px;padding:14px;min-width:0;box-shadow:0 2px 8px rgba(22,40,67,.025)}
 body.hv225-ready .hv225-quick{background:linear-gradient(125deg,#ffe79a,#ffc74f);border-color:#f1c451;display:flex;flex-direction:column;gap:8px}
 body.hv225-ready .hv225-quick h3{font-size:18px;margin:2px 0 0;color:#1a2230}
 body.hv225-ready .hv225-quick p{font-size:12px;color:#443e35;margin:0 0 6px}
 body.hv225-ready .hv225-quick button{width:100%;background:#ffdd82!important;border:1px solid #9d730c!important;color:#111!important;min-height:45px;font-weight:850;font-size:12px;border-radius:8px;cursor:pointer}
 body.hv225-ready .hv225-filters h3{font-size:17px;color:#162335;margin:2px 0 13px}
 body.hv225-ready .hv225-filters label{display:block;margin:11px 0;color:#5a6472;font-size:11px}
 body.hv225-ready .hv225-filters select,body.hv225-ready .hv225-filters input{display:block;margin-top:6px;width:100%;padding:10px;border:1px solid #cad3dd!important;background:#fff!important;border-radius:9px!important;color:#1a2a3b!important;font-size:12px!important}
 body.hv225-ready #hv225-data{display:block!important;overflow:hidden;min-height:325px}
 body.hv225-ready .hv225-data-head{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:14px;flex-wrap:wrap}
 body.hv225-ready .hv225-data-head h2{font-size:17px;margin:0;color:#182637}
 body.hv225-ready .hv225-actions{display:flex;gap:7px;flex-wrap:wrap}
 body.hv225-ready .hv225-actions button,body.hv225-ready .hv225-list button{background:#fff!important;color:#152334!important;border:1px solid #cbd5df!important;border-radius:8px!important;padding:9px 11px!important;cursor:pointer;font-size:11px!important;font-weight:750!important}
 body.hv225-ready .hv225-actions button.active{background:#152334!important;color:#fff!important}
 body.hv225-ready #hv225-table-wrap{overflow-x:auto}
 body.hv225-ready #hv225-table{border-collapse:collapse!important;width:100%;min-width:650px!important;margin:0!important}
 body.hv225-ready #hv225-table th{font-size:10px!important;text-transform:none!important;background:#f0f3f7!important;color:#354256!important;padding:13px 10px!important}
 body.hv225-ready #hv225-table td{font-size:11px!important;color:#1c293a!important;padding:13px 10px!important;border-bottom:1px solid #e7ebf1!important;white-space:normal!important}
 body.hv225-ready #hv225-table tr:hover td{background:#f9fbff!important}
 body.hv225-ready #hv225-table .eqname{font-size:12px;font-weight:850;color:#1b2635}
 body.hv225-ready .hv225-thing{display:flex;align-items:center;gap:9px}
 body.hv225-ready .hv225-symbol{display:grid;place-items:center;font-size:23px;background:#eef3f8;border:1px solid #dce5ee;border-radius:6px;width:39px;height:39px;flex:0 0 39px}
 body.hv225-ready #hv225-table small{display:block;color:#7f8b9c;font-size:10px;margin-top:2px}
 body.hv225-ready .hv225-tag{display:inline-flex;padding:6px 9px;background:#e6f0ff;color:#3173c9;border-radius:6px;font-size:10px;font-weight:800;white-space:nowrap}
 body.hv225-ready .hv225-tag.frozen{background:#f0eafe;color:#8056db}
 body.hv225-ready .hv225-tempbadge{display:inline-block;padding:8px;border-radius:7px;background:#e8f8ed;color:#12824f;font-size:12px;font-weight:900;min-width:58px;text-align:center}
 body.hv225-ready .hv225-tempbadge.alert{background:#ffebed;color:#d1253b}
 body.hv225-ready .hv225-tempbadge.missing{background:#f2f4f6;color:#6e7b88}
 body.hv225-ready .hv225-status{display:inline-flex;align-items:center;gap:5px;font-weight:850;font-size:11px;white-space:nowrap}
 body.hv225-ready .hv225-status.ok{color:#128c55}body.hv225-ready .hv225-status.alert{color:#d12940}body.hv225-ready .hv225-status.todo{color:#bc710c}
 body.hv225-ready #hv225-cardgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(215px,1fr));gap:10px}
 body.hv225-ready .hv225-itemcard{padding:14px;border-radius:11px;border:1px solid #dce4eb;background:#f9fbfd;display:flex;flex-direction:column;gap:10px;align-items:flex-start;text-align:left;cursor:pointer;color:#1c2a3b}
 body.hv225-ready .hv225-itemcard b{font-size:12px}
 body.hv225-ready #hv225-lower{display:grid!important;grid-template-columns:1.15fr 1fr 1fr;gap:14px}
 body.hv225-ready .hv225-sectiontitle{font-size:17px;font-weight:850;display:flex;justify-content:space-between;align-items:center;gap:8px;color:#162337;margin:0 0 12px}
 body.hv225-ready .hv225-sectiontitle button{border:0!important;color:#2b7be5!important;background:transparent!important;font-size:11px;font-weight:800;cursor:pointer}
 body.hv225-ready .hv225-minirow{border:1px solid #e3e9f0;border-radius:9px;background:#fafcfe;margin-bottom:7px;padding:10px;display:flex;align-items:center;justify-content:space-between;gap:8px;color:#2b3b51}
 body.hv225-ready .hv225-minirow.warn{background:#fff4f3;border-color:#f7dedf}
 body.hv225-ready .hv225-minirow .info{min-width:0;font-size:11px}
 body.hv225-ready .hv225-minirow .info strong{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:12px}
 body.hv225-ready .hv225-minirow .info small{color:#768395;display:block;font-size:10px;margin-top:4px}
 body.hv225-ready .hv225-minirow button{border:1px solid #cbd6e3!important;border-radius:8px!important;background:#fff!important;color:#23364c!important;font-size:10px!important;font-weight:850;padding:9px!important;white-space:nowrap;cursor:pointer}
 body.hv225-ready .hv225-empty{padding:25px;text-align:center;color:#8792a0;font-size:12px}
 body.hv225-ready #hv225-permission-card{display:none}
 body.hv225-ready #hv225-permission-card.available{display:block}
 body.hv225-ready .hd-temp-layout{display:none!important}
 body.hv225-ready #hv225-drawer-shade{display:none;position:fixed;inset:0;z-index:840;background:rgba(10,21,36,.58)}
 body.hv225-ready #mod-temp.hv225-reading-open ~ #hv225-drawer-shade{display:block!important}
 body.hv225-ready .hd-reading-panel{display:none!important}
 body.hv225-ready #mod-temp.hv225-reading-open .hd-temp-layout{display:block!important;position:fixed;right:0;top:0;bottom:0;width:min(520px,95vw);z-index:850;padding:24px;box-sizing:border-box;background:#fff;box-shadow:-12px 0 32px rgba(8,24,44,.2);overflow:auto!important}
 body.hv225-ready #mod-temp.hv225-reading-open .hd-parc-panel{display:none!important}
 body.hv225-ready #mod-temp.hv225-reading-open .hd-reading-panel{display:flex!important;border:0!important;padding:12px 0!important}
 body.hv225-ready #hv225-close-reading{display:none!important}
 body.hv225-ready #mod-temp.hv225-reading-open #hv225-close-reading{display:block!important;text-align:right;width:100%;font-size:12px;font-weight:850;background:transparent!important;border:0!important;color:#2b3e52!important;padding:0 0 14px!important;cursor:pointer}
 body.hv225-ready #hd-equipment-creator:not([hidden]){position:fixed;z-index:870;top:90px;left:50%;transform:translateX(-50%);width:min(720px,88vw);box-sizing:border-box;box-shadow:0 18px 0 900px rgba(7,17,30,.52)!important;border-radius:16px!important;background:#fff!important}
 body.hv225-ready .hd-temp-history-card{display:none!important}
 body.hv225-ready #mod-temp>.haccp-express-temp{display:none!important}
 body.hv225-ready .hd-temp-hub{background:transparent!important}
 body.hv225-ready #hv225-filter-col button:focus-visible,body.hv225-ready #hv225-sidebar button:focus-visible{outline:3px solid #4895ff!important;outline-offset:2px}
 body.hv225-ready #hv225-bar #hv225-location{max-width:260px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
 body.hv225-ready #hv225-permission-card #haccp-v223-manager-load{display:block}
 body.hv225-ready .hd-temp-head .display-dept{text-transform:capitalize}
 body.hv225-ready #hv225-permission-card #haccp-v223-manager-inner[hidden]{display:none!important}
 body.hv225-ready #hv225-cardgrid[hidden]{display:none!important}
 body.hv225-ready #hv225-sidebar button[hidden]{display:none!important}
 body.hv225-ready.hv225-drawer-open #hv225-drawer-shade{display:block!important}
 body.hv225-ready #hv225-workgrid .hv225-quick button:hover{background:#ffd060!important}
}
@media(min-width:1101px) and (max-width:1350px){body.hv225-ready #hv225-bar .top-time{display:none}body.hv225-ready #hv225-workgrid{grid-template-columns:240px minmax(0,1fr)}body.hv225-ready #hv225-lower{grid-template-columns:1fr 1fr}body.hv225-ready #hv225-lower>section:last-child{grid-column:1 / -1}}
@media(max-width:1100px){#hv225-bar,#hv225-sidebar,#hv225-filter-col,#hv225-data,#hv225-lower,#hv225-drawer-shade,#hv225-workgrid{display:none!important}}
</style>
<script id="ichef-haccp-v225-pro-desktop-script">
(()=>{'use strict';
 const $=id=>document.getElementById(id);
 const PHONE=()=>{try{return typeof haccpIsPhoneMode==='function'?haccpIsPhoneMode():matchMedia('(max-width:1100px)').matches}catch(_){return innerWidth<=1100}};
 const safe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let view='list', search='', filter='all',kind='all',lastSignature='', currentSection='dashboard',created=false;
 let ids=[];
 function isSignedIn(){return !!window.ICHEF_HACCP?.authenticated}
 function create(){if(created)return;created=true;
  const bar=document.createElement('header');bar.id='hv225-bar';bar.innerHTML=`<div class="brand"><b>iCHEF</b><em>HACCP</em></div><span class="top-site">Établissement : <strong id="hv225-location">—</strong></span><span class="top-pill" id="hv225-profile">RÉFÉRENTIEL HACCP</span><span class="top-status" id="hv225-sync">Synchronisation…</span><span class="top-time" id="hv225-time"></span><button type="button" id="hv225-account">▣ &nbsp; Mon compte</button>`;document.body.append(bar);
  const side=document.createElement('aside');side.id='hv225-sidebar';side.setAttribute('aria-label','Navigation HACCP ordinateur');
  side.innerHTML=`<button type="button" data-hv225-action="dashboard"><i>⌂</i>Tableau de bord</button><button type="button" data-hv225-nav="temp"><i>♧</i>Températures</button><button type="button" data-hv225-nav="cleaning"><i>🧹</i>Nettoyage</button><button type="button" data-hv225-nav="trace"><i>▤</i>Traçabilité</button><button type="button" data-hv225-action="ticket"><i>◇</i>Tickets DLC</button><button type="button" data-hv225-nav="inventaire"><i>▣</i>Inventaire</button><button type="button" data-hv225-action="reception"><i>▰</i>Réception BL</button><button type="button" data-hv225-nav="archive"><i>▤</i>Archives</button><div class="group-label">ADMINISTRATION</div><button type="button" data-hv225-action="parc"><i>⚙</i>Parc HACCP</button><button type="button" data-hv225-action="rights" hidden><i>♟</i>Accès collaborateurs</button><div class="group-label">NAVIGATION</div><button type="button" data-hv225-action="return" class="hv225-admin-return"><i>↩</i>Retour bureau</button><div class="sidebar-foot"><strong>Référentiel sanitaire</strong><span id="hv225-side-reference">Chargement…</span><br><span id="hv225-side-presence">Contrôles iCHEF actifs</span></div>`;document.body.append(side);
  const hub=$('haccp-desktop-temp-hub');if(!hub)return;
  const actions=hub.querySelector('.hd-temp-head-actions');if(actions){const sec=document.createElement('div');sec.id='hv225-sector-control';sec.innerHTML='<label for="hv225-sector-select">Secteur</label><span id="hv225-sector-static">—</span><select id="hv225-sector-select" aria-label="Choisir un secteur autorisé" hidden></select>';actions.prepend(sec)}
  const grid=document.createElement('div');grid.id='hv225-workgrid';
  grid.innerHTML=`<aside id="hv225-filter-col"><section class="hv225-card hv225-quick"><h3>⚡ Contrôle rapide</h3><p>Ouvre le prochain équipement à contrôler.</p><button type="button" id="hv225-quick-start">▶ &nbsp; Démarrer le contrôle rapide</button></section><section class="hv225-card hv225-filters"><h3>⚲ Filtres</h3><label>Statut<select id="hv225-filter-status"><option value="all">Tous les statuts</option><option value="todo">À contrôler</option><option value="ok">Conformes</option><option value="alert">Alertes</option></select></label><label>Type d'équipement<select id="hv225-filter-kind"><option value="all">Tous les équipements</option><option value="COLD">Réfrigérateurs</option><option value="FROZEN">Congélateurs</option><option value="COOLING">Refroidissement</option><option value="HOT">Maintien au chaud</option><option value="REHEAT">Remise en température</option></select></label><label>Recherche<input id="hv225-search" placeholder="⌕ Rechercher…" autocomplete="off"></label></section></aside><section class="hv225-card" id="hv225-data"><div class="hv225-data-head"><h2>☷ &nbsp; Équipements du secteur <span id="hv225-count"></span></h2><div class="hv225-actions"><button type="button" id="hv225-cards">▦ &nbsp; Vue cartes</button><button type="button" id="hv225-list" class="active">☷ &nbsp; Vue liste</button><button type="button" id="hv225-organize">⚙ &nbsp; Catégories</button></div></div><div id="hv225-table-wrap"><table id="hv225-table"><thead><tr><th>Nom de l'équipement</th><th>Type</th><th>Dernier relevé</th><th>Température</th><th>Statut</th><th>Action</th></tr></thead><tbody id="hv225-tbody"></tbody></table></div><div id="hv225-cardgrid" hidden></div></section>`;
  const lower=document.createElement('div');lower.id='hv225-lower';lower.innerHTML=`<section class="hv225-card"><h3 class="hv225-sectiontitle">⚠ &nbsp; Alertes et actions à traiter <span id="hv225-alert-total"></span><button type="button" id="hv225-show-alerts">Voir tout</button></h3><div id="hv225-alerts"></div></section><section class="hv225-card"><h3 class="hv225-sectiontitle">◉ &nbsp; Derniers contrôles<button type="button" id="hv225-show-archive">Voir tout</button></h3><div id="hv225-recent"></div></section><section class="hv225-card" id="hv225-permission-card"><h3 class="hv225-sectiontitle">♟ &nbsp; Accès collaborateurs (Admin)</h3><div id="hv225-manage-slot"></div></section>`;
  hub.insertBefore(grid,hub.querySelector('.hd-temp-layout'));
  hub.insertBefore(lower,hub.querySelector('.hd-temp-layout'));
  const legacy=hub.querySelector('.hd-temp-layout');
  // V228: garder les champs métier existants; déplacer UNIQUEMENT le tiroir affiché
  // directement sous body pour qu'il soit toujours AU-DESSUS du voile sombre.
  // Un repère DOM permet de restaurer le tiroir à sa place en sortie.
  legacy.id='hv228-reading-drawer';
  const drawerAnchor=document.createComment('iCHEF HACCP V228: place du tiroir de relevé');
  legacy.parentNode.insertBefore(drawerAnchor,legacy);
  window.__ichefV228DrawerAnchor=drawerAnchor;
  const close=document.createElement('button');close.type='button';close.id='hv225-close-reading';close.textContent='✕   Fermer le contrôle';legacy.prepend(close);
  const progress=document.createElement('div');progress.id='hv228-progress';progress.setAttribute('aria-live','polite');
  progress.innerHTML='<div class="hv228-kicker">🌡  RELEVÉ HACCP <span>· CONTRÔLE RAPIDE</span></div><div id="hv228-step">Équipement à contrôler</div>';
  legacy.insertBefore(progress,legacy.querySelector('.hd-reading-panel'));
  const nameObserver=new MutationObserver(()=>updateDrawerProgress());
  ['hd-reading-name','hd-cooling-name'].forEach(id=>{const node=$(id);if(node)nameObserver.observe(node,{childList:true,characterData:true,subtree:true})});
  const shade=document.createElement('div');shade.id='hv225-drawer-shade';document.body.append(shade);
  const mgr=$('haccp-v223-manage');if(mgr)$('hv225-manage-slot').append(mgr);
  bar.querySelector('#hv225-account').addEventListener('click',()=>{try{if(typeof returnToAdmin==='function')returnToAdmin()}catch(_){}});
  side.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const mod=b.dataset.hv225Nav;const act=b.dataset.hv225Action;
   if(mod){closeReading();if(document.body.classList.contains('haccp-v223-staff')&&(mod==='inventaire'||mod==='reception'))return;currentSection=mod;typeof showModule==='function'&&showModule(mod);updateNav();if(mod==='temp')render();return}
   if(act==='dashboard'){closeReading();currentSection='dashboard';if(typeof showModule==='function')showModule('temp');updateNav();return}
   if(act==='ticket'){if(!PHONE()&&typeof window.haccpV71OpenPrepared==='function')window.haccpV71OpenPrepared();return}
   if(act==='reception'){closeReading();if(!document.body.classList.contains('haccp-v223-staff')&&typeof window.haccpV7Open==='function')window.haccpV7Open('reception');currentSection='reception';updateNav();return}
   if(act==='rights'){closeReading();if(!$('hv225-permission-card')?.classList.contains('available'))return;currentSection='temp';showModule('temp');updateNav();$('hv225-permission-card').scrollIntoView({behavior:'smooth',block:'center'});$('haccp-v223-manager-load')?.click();return}
   if(act==='parc'){closeReading();currentSection='temp';showModule('temp');updateNav();$('haccp-desktop-temp-hub')?.scrollIntoView({behavior:'smooth'});return}
   if(act==='return'&&typeof returnToAdmin==='function')returnToAdmin();
  });
  $('hv225-sector-select')?.addEventListener('change',e=>{const old=$('haccp-v223-sector-select');if(!old||![...old.options].some(o=>o.value===e.target.value)){e.target.value=window.ICHEF_HACCP?.department||'';return;}old.value=e.target.value;old.dispatchEvent(new Event('change',{bubbles:true}));render(true)});
  $('hv225-quick-start').addEventListener('click',()=>{if(typeof startDesktopTemperatureRound==='function'){startDesktopTemperatureRound();openReading()}});
  $('hv225-filter-status').addEventListener('change',e=>{filter=e.target.value;render(true)});
  $('hv225-filter-kind').addEventListener('change',e=>{kind=e.target.value;render(true)});
  $('hv225-search').addEventListener('input',e=>{search=e.target.value.toLocaleLowerCase('fr').trim();render(true)});
  $('hv225-cards').addEventListener('click',()=>{view='cards';render(true)});
  $('hv225-list').addEventListener('click',()=>{view='list';render(true)});
  $('hv225-organize').addEventListener('click',()=>{if(typeof haccpV227OpenCategories==='function')haccpV227OpenCategories()});
  $('hv225-show-alerts').addEventListener('click',()=>{filter='todo';$('hv225-filter-status').value='todo';render(true);$('hv225-data').scrollIntoView({behavior:'smooth'})});
  $('hv225-show-archive').addEventListener('click',()=>{if(typeof showModule==='function')showModule('archive');currentSection='archive';updateNav()});
  $('hv225-data').addEventListener('click',e=>{const b=e.target.closest('[data-hv225-eq]');if(!b)return;selectEquipment(b.dataset.hv225Eq)});
  $('hv225-alerts').addEventListener('click',e=>{const b=e.target.closest('[data-hv225-eq]');if(b)selectEquipment(b.dataset.hv225Eq)});
  $('hv225-recent').addEventListener('click',e=>{const b=e.target.closest('[data-hv225-eq]');if(b)selectEquipment(b.dataset.hv225Eq)});
  close.addEventListener('click',closeReading);shade.addEventListener('click',closeReading);
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeReading()});
  window.addEventListener('resize',()=>{if(PHONE())closeReading()});
 }
 function updateDrawerProgress(){
  const out=$('hv228-step');if(!out)return;
  const selected=String(typeof desktopTempSelected!=='undefined'?desktopTempSelected?.name||'':'');
  const inRound=(typeof desktopRound!=='undefined'&&Array.isArray(desktopRound)&&desktopRound.length)?desktopRound:[];
  const all=inRound.length?inRound:(typeof getSectorEquipmentList==='function'?getSectorEquipmentList():[]);
  const position=all.findIndex(eq=>String(eq.name)===selected);
  out.textContent=selected?`Équipement ${position>=0?position+1:'—'} sur ${all.length||'—'} · ${typeof haccpEquipmentDisplay==='function'?haccpEquipmentDisplay(selected):selected}`:'Sélectionnez un équipement';
 }
 function openReading(){
  if(PHONE())return;
  const m=$('mod-temp'),drawer=$('hv228-reading-drawer');if(!m||!drawer)return;
  // Evite que le voile assombrisse aussi le formulaire : nouveau contexte de pile.
  if(drawer.parentNode!==document.body)document.body.append(drawer);
  m.classList.add('hv225-reading-open');document.body.classList.add('hv225-drawer-open');
  updateDrawerProgress();$('hd-temp-value')?.focus({preventScroll:true});
 }
 function closeReading(){
  $('mod-temp')?.classList.remove('hv225-reading-open');document.body.classList.remove('hv225-drawer-open');
  const drawer=$('hv228-reading-drawer'), anchor=window.__ichefV228DrawerAnchor;
  if(drawer&&anchor?.parentNode&&drawer.parentNode===document.body)anchor.after(drawer);
 }
 function selectEquipment(name){if(typeof selectDesktopEquipmentByName==='function'){selectDesktopEquipmentByName(name);openReading()}}
 function updateNav(){document.querySelectorAll('#hv225-sidebar [data-hv225-nav],#hv225-sidebar [data-hv225-action="dashboard"]').forEach(b=>b.classList.toggle('active',(b.dataset.hv225Nav||b.dataset.hv225Action)===currentSection));}
 function readData(){try{
  if(typeof getSectorEquipmentList!=='function')return {rows:[],logs:[],sect:''};
  const items=getSectorEquipmentList();const logs=(typeof db!=='undefined'&&Array.isArray(db.temp))?db.temp:[];
  const sect=typeof currentDept!=='undefined'?currentDept:'';
  return {rows:items.map(item=>{
   const last=typeof getLatestTemperatureForEquipment==='function'?getLatestTemperatureForEquipment(item.name):null;
   const today=typeof isTemperatureLogToday==='function'?isTemperatureLogToday(last):false;
   return {...item,last,today,state:last?.status==='ALERTE'?'alert':!today?'todo':last?.status==='OK'?'ok':'todo'};
  }),logs:logs.filter(x=>x?.dept===sect&&!x?.originalId).sort((a,b)=>String(b.timestamp||'').localeCompare(String(a.timestamp||''))),sect};
 }catch(e){console.warn('[HACCP V225] donnée indisponible',e);return {rows:[],logs:[],sect:''}}}
 function syncLayout(){
  if(PHONE()||!isSignedIn()){document.body.classList.remove('hv225-ready');return false}
  document.body.classList.add('hv225-ready');
  const mgr=$('haccp-v223-manage');const manager=!!mgr&&mgr.style.display==='block'&&!window.ICHEF_HACCP?.v223Staff;
  $('hv225-permission-card')?.classList.toggle('available',manager);
  const rights=document.querySelector('#hv225-sidebar [data-hv225-action="rights"]');if(rights)rights.hidden=!manager;
  const account=document.querySelector('#hv225-sidebar [data-hv225-action="return"]');if(account)account.hidden=!!window.ICHEF_HACCP?.v223Staff;
  const inv=document.querySelector('#hv225-sidebar [data-hv225-nav="inventaire"]'),rec=document.querySelector('#hv225-sidebar [data-hv225-action="reception"]');
  if(inv)inv.hidden=!!window.ICHEF_HACCP?.v223Staff;
  if(rec)rec.hidden=!!window.ICHEF_HACCP?.v223Staff;
  const sectors=Array.isArray(window.ICHEF_HACCP?.allowedSectors)?window.ICHEF_HACCP.allowedSectors:[];const sector=String(window.ICHEF_HACCP?.department||'—');
  const sectorSelect=$('hv225-sector-select'),sectorStatic=$('hv225-sector-static');
  if(sectorSelect&&sectorStatic){const choices=window.ICHEF_HACCP?.v223Staff&&sectors.length>1?sectors:[];const joined=choices.join('|');if(sectorSelect.dataset.options!==joined){sectorSelect.innerHTML='';for(const val of choices){const o=document.createElement('option');o.value=val;o.textContent=val.charAt(0)+val.slice(1).toLowerCase();sectorSelect.append(o)}sectorSelect.dataset.options=joined}sectorSelect.hidden=choices.length<2;sectorStatic.hidden=choices.length>1;sectorStatic.textContent=sector.charAt(0)+sector.slice(1).toLowerCase();if(choices.length>1)sectorSelect.value=sector}
  $('hv225-location').textContent=window.ICHEF_HACCP?.tenantID||'Établissement';
  const profile=$('haccp-reg-profile')?.textContent?.trim()||'';$('hv225-profile').textContent=profile;
  $('hv225-side-reference').textContent=profile;
  const raw=$('haccp-sync-status')?.textContent||'';$('hv225-sync').textContent=/DEGRAD|RECONNEX|INDISP|IDENTIF/i.test(raw)?'Connexion à vérifier':'Synchronisé';
  const now=new Date();$('hv225-time').textContent=now.toLocaleDateString('fr-FR',{day:'2-digit',month:'short',year:'numeric'})+'  ·  '+now.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
  if(window.ICHEF_HACCP?.v223Staff)$('hv225-side-presence').textContent='Accès HACCP selon présence vérifiée';
  const shown=document.querySelector('.module.active')?.id?.replace('mod-','')||currentSection;currentSection=(shown==='temp'&&currentSection==='dashboard')?'dashboard':shown;
  updateNav();return true;
 }
 function render(force=false){if(!created||!syncLayout())return;
  const data=readData();const rows=data.rows;const signature=JSON.stringify([data.sect,rows.map(r=>[r.name,r.kind,r.last?.timestamp,r.last?.status,r.last?.val,r.today]),data.logs.slice(0,4).map(l=>l.id||l.timestamp),filter,kind,search,view]);
  if(!force&&signature===lastSignature)return;lastSignature=signature;
  const matches=rows.filter(r=>(filter==='all'||r.state===filter)&&(kind==='all'||r.kind===kind)&&(!search||`${r.name} ${r.typeLabel} ${typeof haccpEquipmentDisplay==='function'?haccpEquipmentDisplay(r.name):r.name}`.toLocaleLowerCase('fr').includes(search)));
  $('hv225-count').textContent='('+matches.length+')';$('hv225-table-wrap').hidden=view!=='list';$('hv225-cardgrid').hidden=view!=='cards';$('hv225-list').classList.toggle('active',view==='list');$('hv225-cards').classList.toggle('active',view==='cards');
  const button=(r,label='Relever')=>`<button type="button" data-hv225-eq="${safe(r.name)}">${label}</button>`;
  const tag=r=>`<span class="hv225-tag ${r.kind==='FROZEN'?'frozen':''}">${safe(r.kind==='FROZEN'?'Congélateur':r.kind==='COLD'?'Réfrigérateur':r.typeLabel)}</span>`;
  const status=r=>`<span class="hv225-status ${r.state}">${r.state==='ok'?'● Conforme':r.state==='alert'?'⚠ Alerte':'◷ À contrôler'}</span>`;
  const val=r=>`<span class="hv225-tempbadge ${r.state==='alert'?'alert':r.last?'':'missing'}">${r.last&&Number.isFinite(Number(r.last.val))?safe(Number(r.last.val).toLocaleString('fr-FR',{maximumFractionDigits:1})+' °C'):'—'}</span>`;
  const date=r=>r.last?`${safe(r.last.date||'')} ${safe(r.last.time||'')}<small>${safe((r.last.audit||'').replace(/^Saisi par\s*/i,''))}</small>`:'<span style="color:#8995a4">Aucun relevé</span>';
  $('hv225-tbody').innerHTML=matches.length?matches.map(r=>`<tr><td><div class="hv225-thing"><span class="hv225-symbol">${r.kind==='FROZEN'?'❄':'▣'}</span><div><span class="eqname">${safe(typeof haccpEquipmentDisplay==='function'?haccpEquipmentDisplay(r.name):r.name)}</span><small>${safe(r.typeLabel)}</small></div></div></td><td>${tag(r)}</td><td>${date(r)}</td><td>${val(r)}</td><td>${status(r)}</td><td>${button(r)}</td></tr>`).join(''):'<tr><td colspan="6" class="hv225-empty">Aucun équipement ne correspond aux filtres.</td></tr>';
  $('hv225-cardgrid').innerHTML=matches.length?matches.map(r=>`<button class="hv225-itemcard" data-hv225-eq="${safe(r.name)}"><span class="hv225-symbol">${r.kind==='FROZEN'?'❄':'▣'}</span><b>${safe(typeof haccpEquipmentDisplay==='function'?haccpEquipmentDisplay(r.name):r.name)}</b>${tag(r)} ${val(r)} ${status(r)}<span>Ouvrir le relevé →</span></button>`).join(''):'<div class="hv225-empty">Aucun équipement à afficher.</div>';
  const problems=rows.filter(r=>r.state==='alert'||r.state==='todo');
  $('hv225-alert-total').textContent='('+problems.length+')';
  $('hv225-alerts').innerHTML=problems.length?problems.slice(0,4).map(r=>`<div class="hv225-minirow ${r.state==='alert'?'warn':''}"><span>${r.state==='alert'?'⚠':'◷'}</span><div class="info"><strong>${safe(typeof haccpEquipmentDisplay==='function'?haccpEquipmentDisplay(r.name):r.name)}</strong><small>${r.state==='alert'?'Dernier relevé en alerte'+(r.last?.val!==undefined?' · '+safe(String(r.last.val))+' °C':''):'Contrôle du jour à effectuer'}</small></div>${button(r,r.state==='alert'?'Vérifier':'Contrôler')}</div>`).join(''):'<div class="hv225-empty">✓ Aucun contrôle manquant ou en alerte.</div>';
  const recent=data.logs.slice(0,4);
  $('hv225-recent').innerHTML=recent.length?recent.map(l=>`<div class="hv225-minirow"><div class="info"><strong>${safe(typeof haccpEquipmentDisplay==='function'?haccpEquipmentDisplay(l.eq||'Équipement'):l.eq||'Équipement')}</strong><small>${safe(String(l.val??'—'))} °C · ${safe(l.status||'')}<br>${safe(l.date||'')} ${safe(l.time||'')}</small></div>${rows.some(r=>r.name===l.eq)?`<button type="button" data-hv225-eq="${safe(l.eq)}">›</button>`:''}</div>`).join(''):'<div class="hv225-empty">Aucun contrôle enregistré.</div>';
 }
 function boot(){create();syncLayout();render(true);setInterval(()=>{syncLayout();render()},1400);window.addEventListener('ichef:haccp:authenticated',()=>{setTimeout(()=>render(true),200)});window.addEventListener('ichef:haccp:categories-changed',()=>render(true))}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
</script>
<!-- iCHEF HACCP V227 — catégories personnalisées · RESPONSABLE · ORDINATEUR -->
<!-- iCHEF HACCP V246 — Menu des types personnalisable + catégories, ORDINATEUR UNIQUEMENT. 
     Intégration conservant le stockage HACCP_LISTS_MASTER et les droits existants. -->
<style id="ichef-haccp-v227-category-styles">
#hv227-modal[hidden]{display:none!important}
#hv227-modal{position:fixed;inset:0;z-index:99000;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(7,15,25,.76);box-sizing:border-box;font-family:Inter,Arial,sans-serif;color:#182538}
#hv227-modal *{box-sizing:border-box}
#hv227-modal .hv227-box{width:min(1120px,96vw);max-height:min(92dvh,950px);overflow-y:auto;overscroll-behavior:contain;background:#f8fafc;border:1px solid #d9e0e9;box-shadow:0 22px 80px rgba(0,0,0,.4);border-radius:20px;padding:23px}
#hv227-modal .hv227-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:14px}
#hv227-modal .hv227-eyebrow{font-size:11px;letter-spacing:1.5px;font-weight:900;color:#a17417;text-transform:uppercase}
#hv227-modal h2{font-size:25px;line-height:1.2;margin:6px 0;color:#152638}
#hv227-modal p{font-size:13px;line-height:1.5;color:#65758a;margin:4px 0}
#hv227-modal button{font-family:inherit;cursor:pointer;border:1px solid #cbd5e1;background:white;border-radius:10px;color:#203144;font-weight:800;font-size:12px;padding:10px 12px;min-height:41px}
#hv227-modal button:hover{border-color:#bd8722}
#hv227-modal button:focus-visible,#hv227-modal input:focus-visible,#hv227-modal select:focus-visible{outline:3px solid #c18c2f;outline-offset:2px}
#hv227-modal button:disabled{opacity:.5;cursor:not-allowed}
#hv227-modal .hv227-primary{background:#f4bf49;border-color:#e4ab29;color:#182637}
#hv227-modal .hv227-danger{color:#a42031;border-color:#f4bec5}
#hv227-modal .hv227-info{border:1px solid #dce8f2;border-radius:12px;background:#f0f7fc;padding:11px 15px;font-size:12px;line-height:1.5;color:#3e5870;margin-bottom:14px}
#hv227-modal .hv227-new{border:1px solid #ead7ad;border-radius:14px;background:#fffdf8;padding:14px;display:grid;grid-template-columns:minmax(170px,1.7fr) minmax(170px,1.05fr) auto;gap:12px;align-items:end}
#hv227-modal .hv227-section-title{font-size:13px;font-weight:900;color:#192c40;margin:14px 0 8px;display:flex;align-items:center;justify-content:space-between;gap:10px}
#hv227-modal .hv227-new label,#hv227-modal .hv227-move-label,#hv227-modal .hv227-transfer label{display:flex;flex-direction:column;gap:6px;font-size:11px;font-weight:850;color:#54677b}
#hv227-modal input,#hv227-modal select{padding:10px 11px!important;height:43px!important;min-width:0!important;width:100%;border:1px solid #cbd5e1!important;border-radius:9px!important;background:#fff!important;color:#142334!important;font:500 14px Inter,Arial,sans-serif!important;box-shadow:none!important}
#hv227-modal #hv227-search{max-width:300px}
#hv227-modal .hv227-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:12px}
#hv227-modal .hv227-category{border:1px solid #dce4ed;border-radius:14px;background:#fff;padding:14px;min-width:0}
#hv227-modal .hv227-cat-head{display:flex;align-items:center;justify-content:space-between;gap:10px}
#hv227-modal .hv227-cat-head strong{font-size:15px;line-height:1.35;overflow-wrap:anywhere;color:#15283b}
#hv227-modal .hv227-cat-head small{display:block;margin-top:6px;font-size:12px;color:#66768a}
#hv227-modal .hv227-count{background:#f1f5f9;color:#42556b;padding:4px 8px;border-radius:16px;display:inline-block;font-size:11px;font-weight:800;margin-top:7px}
#hv227-modal .hv227-cat-buttons{display:flex;gap:7px;flex-wrap:wrap;justify-content:flex-end}
#hv227-modal .hv227-cat-buttons button{font-size:12px;padding:8px 10px;min-height:36px;white-space:nowrap}
#hv227-modal .hv227-transfer{display:grid;grid-template-columns:minmax(140px,1fr) auto;gap:10px;align-items:end;margin-top:12px;padding:12px;background:#fffaf1;border:1px solid #e9d9b8;border-radius:10px}
#hv227-modal .hv227-transfer[hidden]{display:none!important}
#hv227-modal .hv227-transfer p{grid-column:1/-1;font-size:12px}
#hv227-modal .hv227-eq-details{margin-top:11px;padding-top:10px;border-top:1px solid #edf0f4;font-size:12px}
#hv227-modal .hv227-eq-details summary{cursor:pointer;font-weight:800;color:#496278;padding:5px 0;list-style-position:inside}
#hv227-modal .hv227-eq-row{border-top:1px solid #edf0f4;padding:10px 0 0;margin-top:10px;display:grid;grid-template-columns:minmax(120px,1fr) minmax(150px,1fr) auto;gap:7px;align-items:center}
#hv227-modal .hv227-eq-row b{font-size:12px;font-weight:700;overflow-wrap:anywhere}
#hv227-modal .hv227-eq-row select{height:37px!important;font-size:11px!important}
#hv227-modal .hv227-eq-row button{font-size:11px;padding:7px 10px;min-height:36px}
#hv227-modal #hv227-status{min-height:23px;padding-top:12px;font-size:12px;font-weight:700;color:#406447}
#hv227-modal .hv227-empty{padding:18px;background:#fff;border:1px solid #e1e7ef;border-radius:12px;grid-column:1/-1}
#hv227-modal .hv248-reset-box{display:flex;gap:16px;justify-content:space-between;align-items:center;border:1px solid #e9d8c6;border-radius:14px;background:#fff8f0;padding:14px 16px;margin:0 0 15px}
#hv227-modal .hv248-reset-box strong{display:block;font-size:14px;color:#53330e;margin:0 0 5px}
#hv227-modal .hv248-reset-box small{display:block;line-height:1.5;color:#735e44;font-size:12px}
#hv227-modal button.hv248-reset-action{background:#fff;border-color:#d29a63;color:#813812;white-space:nowrap;min-width:188px}
#hv227-modal .hv248-pending{padding:14px;border:1px solid #cbded2;background:#f4fbf6;border-radius:14px;margin-top:15px}
#hv227-modal .hv248-pending h3{font-size:15px;margin:0 0 4px;color:#1d513a}
#hv227-modal .hv248-pending p{font-size:12px;color:#415a4b;margin:0 0 12px}
#hv227-modal .hv248-pending-row{display:grid;grid-template-columns:minmax(130px,1fr) minmax(180px,1fr) auto;gap:10px;align-items:end;padding:10px 0;border-top:1px solid #dbe9df}
#hv227-modal .hv248-pending-row b{font-size:12px;display:block;color:#223c2f}
#hv227-modal .hv248-pending-row span{font-size:11px;color:#53715f}
#hv227-modal .hv248-pending-row label{font-size:11px;font-weight:800;color:#446050}
#hv227-modal .hv248-pending-row input{margin-top:5px}
#hv227-modal .hv248-pending-row input:focus{outline:2px solid #247b52;outline-offset:1px}
#hv227-modal .hv249-pending-items{display:flex;flex-direction:column;gap:4px;margin-top:5px}
#hv227-modal .hv249-pending-item{display:flex;align-items:center;justify-content:space-between;gap:8px;min-width:0;color:#334d3d;font-size:12px}
#hv227-modal .hv249-pending-item span{font-size:12px;white-space:normal;overflow-wrap:anywhere}
#hv227-modal button.hv249-rename{border-color:#c7dccf;background:#fff;color:#25694d;min-height:30px;padding:4px 9px;font-size:11px;white-space:nowrap}
#hv227-modal button.hv249-rename:hover{background:#e8f5ec;border-color:#3e9871}
/* V254 : suppression définitive d'un équipement à reclasser, sans toucher aux relevés */
#hv227-modal .hv254-pending-actions{display:flex;align-items:center;gap:6px;flex-shrink:0}
#hv227-modal button.hv254-delete-pending{background:#fff4f4;color:#9a2432;border:1px solid #e6b5be;border-radius:9px;min-height:30px;padding:4px 9px;font-size:11px;font-weight:800;white-space:nowrap;cursor:pointer}
#hv227-modal button.hv254-delete-pending:hover{background:#ffe2e5;border-color:#c93f53}
#hv227-modal button.hv254-delete-pending:disabled{opacity:.55;cursor:wait}
@media(max-width:1000px){#hv227-modal .hv249-pending-item{align-items:flex-start;flex-wrap:wrap}#hv227-modal .hv254-pending-actions{margin-left:auto}}
#hv227-modal .hv249-item-name{display:flex;align-items:center;justify-content:space-between;gap:9px;min-width:0}
#hv227-modal .hv249-item-name b{overflow-wrap:anywhere}
#hv227-modal .hv249-technical{font-size:10px;color:#789180;font-weight:600}
@media(max-width:900px){#hv227-modal .hv248-reset-box{flex-direction:column;align-items:stretch}#hv227-modal .hv248-pending-row{grid-template-columns:1fr}}

#hv227-modal .hv227-type-manager{border:1px solid #cfdeeb;background:white;border-radius:14px;margin:13px 0;padding:13px 15px}
#hv227-modal .hv227-type-manager>summary{cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:10px;font-weight:900;font-size:14px;color:#233e56;list-style:none}
#hv227-modal .hv227-type-manager>summary::after{content:'▾';font-size:16px;color:#a17417}
#hv227-modal .hv227-type-manager[open]>summary::after{content:'▴'}
#hv227-modal .hv227-type-description{font-size:12px;color:#5c6f7f;margin:10px 0}
#hv227-modal .hv227-type-form{display:grid;grid-template-columns:minmax(160px,1.4fr) minmax(180px,1fr) auto;align-items:end;gap:10px;margin:9px 0 14px;padding:11px;border-radius:10px;background:#f8fafc}
#hv227-modal .hv227-type-form label{font-weight:800;font-size:11px;color:#526980;display:flex;flex-direction:column;gap:7px}
#hv227-modal .hv227-type-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}
#hv227-modal .hv227-type-line{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:9px 10px;border:1px solid #e2e8f0;border-radius:9px;background:white;min-width:0}
#hv227-modal .hv227-type-line.is-hidden{background:#f5f6f7;opacity:.78}
#hv227-modal .hv227-type-line strong{display:block;color:#233a52;font-size:12px;overflow-wrap:anywhere}
#hv227-modal .hv227-type-line small{display:block;color:#64748b;margin-top:3px;font-size:11px;overflow-wrap:anywhere}
#hv227-modal .hv227-type-line button{white-space:nowrap;font-size:11px;min-height:36px;padding:7px 9px}
#hv227-modal .hv227-type-actions{display:flex;align-items:center;gap:5px;flex-wrap:wrap}
#hv227-modal .hv227-restore{color:#205837;background:#f2fff6}
#hv227-modal .hv227-type-manager[hidden]{display:none!important}
#hv227-modal .hv251-permanent{white-space:normal;text-align:center;min-height:38px}
#hv227-modal .hv227-type-actions{flex-wrap:wrap;justify-content:flex-end}
@media(max-width:900px){#hv227-modal .hv227-type-form{grid-template-columns:1fr}#hv227-modal .hv227-type-list{grid-template-columns:1fr}}

@media(max-width:900px){#hv227-modal .hv227-list{grid-template-columns:1fr}#hv227-modal .hv227-new{grid-template-columns:1fr}#hv227-modal .hv227-transfer{grid-template-columns:1fr}#hv227-modal .hv227-eq-row{grid-template-columns:1fr 1fr}#hv227-modal .hv227-eq-row b{grid-column:1/-1}}
/* Édition pour ordinateur/tablette paysage, jamais téléphone.
   La vraie permission est vérifiée côté serveur, pas ici. */
@media(max-width:860px){#hv227-modal{display:none!important} .hv227-desktop-admin{display:none!important}}

/* iCHEF HACCP V250 — suppression distincte et sans perte de matériel */
#hv227-modal .hv227-cat-buttons .hv250-delete{background:#fff4f5!important;border:1px solid #eaa5af!important;color:#9b1c31!important;font-weight:900!important}
#hv227-modal .hv227-cat-buttons .hv250-delete:hover{background:#ffe6e9!important;border-color:#cb5265!important}
#hv227-modal .hv227-cat-buttons .hv250-delete:focus-visible{outline:3px solid #d46a7a!important;outline-offset:2px}
@media(max-width:1150px){#hv227-modal .hv227-cat-head{align-items:flex-start}#hv227-modal .hv227-cat-buttons{max-width:230px}}
</style>
<div id="hv227-modal" role="dialog" aria-modal="true" aria-labelledby="hv227-title" hidden>
  <div class="hv227-box">
    <header class="hv227-head">
      <div><span class="hv227-eyebrow">iCHEF HACCP · SECTEUR</span><h2 id="hv227-title">Mes catégories d'équipements</h2><p id="hv227-sector">Gestion par secteur</p></div>
      <button type="button" id="hv227-close" aria-label="Fermer la gestion des catégories">✕ FERMER</button>
    </header>
    <div class="hv227-info"><strong>Vos catégories sont entièrement personnalisables.</strong> Ajoutez et renommez librement les catégories. Les équipements et leurs relevés restent conservés lorsque vous réorganisez le parc.</div>
    <div class="hv248-reset-box"><div><strong>Repartir de zéro avec mes propres catégories</strong><small>Supprime tous les anciens noms de catégories du secteur en une seule opération. Les équipements sont placés dans « Matériel à reclasser », restent utilisables et gardent leurs règles HACCP et leurs relevés.</small></div><button type="button" id="hv248-reset-all" class="hv248-reset-action">↻ REFAIRE MES CATÉGORIES</button></div>
    <div class="hv227-new">
      <label>NOUVELLE CATÉGORIE<input type="text" id="hv227-new-name" maxlength="65" placeholder="Ex. Chambre froide poissons" autocomplete="off"></label>
      <label>TYPE DE CONTRÔLE HACCP<select id="hv227-new-type"></select></label>
      <button type="button" class="hv227-primary" id="hv227-add">＋ AJOUTER</button>
    </div>
    <div class="hv227-section-title"><span>MES CATÉGORIES · Ajouter, renommer, supprimer</span><input id="hv227-search" type="search" placeholder="Rechercher une catégorie…" aria-label="Rechercher une catégorie"></div>
    <div id="hv227-list" class="hv227-list"></div>
    <div id="hv248-pending" class="hv248-pending" hidden></div>
    <details class="hv227-type-manager" id="hv227-type-manager">
      <summary>⚙ MODIFIER LA LISTE DES TYPES · Ajouter ou supprimer définitivement</summary>
      <p class="hv227-type-description"><strong>Suppression définitive des choix :</strong> un type supprimé disparaît de cette liste et du menu de création, sans bouton de réactivation. Si des catégories l’utilisent déjà, leur nom et leurs équipements restent consultables, et la règle technique HACCP ainsi que les anciens relevés sont conservés. Les règles de contrôle ne sont jamais supprimées.</p>
      <div class="hv227-type-form">
        <label>NOM À AFFICHER DANS LE MENU<input id="hv227-choice-name" maxlength="65" placeholder="Ex. Cave à vins" autocomplete="off"></label>
        <label>RÈGLE TECHNIQUE HACCP ASSOCIÉE (CONSERVÉE)<select id="hv227-choice-rule"></select></label>
        <button type="button" id="hv227-choice-add" class="hv227-primary">＋ AJOUTER AU MENU</button>
      </div>
      <div id="hv227-type-list" class="hv227-type-list" aria-label="Choix disponibles et masqués"></div>
    </details>
    <div id="hv227-status" role="status" aria-live="polite"></div>
  </div>
</div>
<script id="ichef-haccp-v227-categories-script">
(()=>{'use strict';
  const $=id=>document.getElementById(id);
  const safe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm=s=>String(s||'').trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  // La page HACCP doit être authentifiée. Les droits détaillés sont accordés
  // exclusivement par /api/haccp/category-admin après contrôle du serveur.
  const eligible=()=>!!window.ICHEF_HACCP?.authenticated && matchMedia('(min-width:861px)').matches && !window.ICHEF_HACCP?.v223Staff;
  let catalogRevision=null;
  let catalogReady=false;
  let catalogLoading=false;
  let catalogPromise=null;
  let catalogRequestSector='';
  let catalogSector='';
  let catalogSessionToken='';
  let catalogLoadedAt=0;
  const catalogPrefetchMaxAgeMs=15000;
  const categoryApi='/api/haccp/category-admin';
  async function requestCategoryApi(method='GET',payload={}) {
    const dep=actual();
    const url=`${SERVER_URL}${categoryApi}${method==='GET'?('?sector='+encodeURIComponent(dep)):''}`;
    const response=await fetch(url,{method,credentials:'include',cache:'no-store',headers:systemHeaders(method==='POST'?{'Content-Type':'application/json'}:{}),...(method==='POST'?{body:JSON.stringify(payload)}:{})});
    let data={};try{data=await response.json()}catch(_){}
    if(!response.ok||data.success!==true)throw Error(data.error||`Serveur HACCP HTTP ${response.status}`);
    return data;
  }
  function loadCatalog({quiet=false}={}) {
    // Une seule lecture des catégories en cours, même si l'authentification,
    // l'ouverture et le bouton Actualiser surviennent en même temps.
    if(!eligible())return Promise.resolve(false);
    const requestedSector=actual();
    if(catalogPromise){
      return catalogRequestSector===requestedSector
        ? catalogPromise
        : catalogPromise.then(()=>loadCatalog({quiet}));
    }
    catalogRequestSector=requestedSector;
    catalogLoading=true;
    if(!catalogReady && !quiet)msg('Vos catégories sont affichées · vérification du serveur…');
    const pending=(async()=>{
      try{
        const data=await requestCategoryApi('GET');
        if(!data.sectorData||typeof data.sectorData!=='object')throw Error('Référentiel non reçu du serveur.');
        const revision=Number(data.revision);
        if(!Number.isSafeInteger(revision))throw Error('Version du référentiel invalide.');
        const dept=actual();
        if(dept!==requestedSector)return false;
        if(data.initialized)EMPIRE_LISTS[dept]=data.sectorData;
        catalogSector=dept;
        catalogSessionToken=haccpSessionToken();
        catalogRevision=revision;
        catalogLoadedAt=Date.now();
        catalogReady=true;
        refresh();
        msg('✓ Catégories prêtes · serveur synchronisé.');
        return true;
      }catch(e){
        // Les noms éventuellement affichés proviennent d'un cache purement
        // visuel. Les actions d'écriture sont interdites si la lecture a échoué.
        catalogReady=false;
        catalogRevision=null;
        catalogSector='';
        catalogSessionToken='';
        catalogLoadedAt=0;
        msg('Connexion nécessaire pour modifier : '+(e?.message||e),true);
        return false;
      }finally{
        catalogLoading=false;
        catalogPromise=null;
        catalogRequestSector='';
      }
    })();
    catalogPromise=pending;
    return pending;
  }
  window.ichefHaccpPrefetchCategories=()=>{
    if(!eligible())return Promise.resolve(false);
    if(catalogReady && catalogSector===actual() && catalogSessionToken===haccpSessionToken() && Date.now()-catalogLoadedAt<catalogPrefetchMaxAgeMs)return Promise.resolve(true);
    return loadCatalog({quiet:true});
  };
  const actual=()=>{try{return String(currentDept||'')}catch(_){return ''}};
  const catalog=()=>{try{return EMPIRE_LISTS?.[actual()]?.eq||{}}catch(_){return {}}};
  const typeMap=()=>{try{return EMPIRE_LISTS?.[actual()]?.eqCategoryTypes||{}}catch(_){return {}}};
  const types=()=>{try{return HACCP_EQUIPMENT_TYPES||[]}catch(_){return []}};
  // Les ID techniques d'origine restent immuables : seules les options proposées au chef changent.
  // Les données sont enregistrées dans le même HACCP_LISTS_MASTER que les catégories du secteur.
  const customChoices=()=>{try{const a=EMPIRE_LISTS?.[actual()]?.eqCustomTypeOptions;return Array.isArray(a)?a:[]}catch(_){return []}};
  const hiddenDefaults=()=>{try{const a=EMPIRE_LISTS?.[actual()]?.eqHiddenTypeIds;return Array.isArray(a)?a:[]}catch(_){return []}};
  const deletedChoiceIds=()=>{try{const a=EMPIRE_LISTS?.[actual()]?.eqDeletedTypeIds;return Array.isArray(a)?a:[]}catch(_){return []}};
  const categoryChoiceMap=()=>{try{return EMPIRE_LISTS?.[actual()]?.eqCategoryOptionIds||{}}catch(_){return {}}};
  const displayEquipment=(name)=>{try{
    const raw=String(name??'');const labels=EMPIRE_LISTS?.[actual()]?.eqDisplayNames;
    return labels&&typeof labels[raw]==='string'&&labels[raw].trim()?labels[raw]:raw;
  }catch(_){return String(name??'')}};
  // Les clés temporaires restent dans eq pour préserver les contrôles.
  // Elles n'apparaissent pas comme catégories client et se rangent à part.
  const pendingKeys=()=>{try{
    const stored=EMPIRE_LISTS?.[actual()]?.eqResetPendingKeys;
    return Array.isArray(stored)?stored.filter(k=>typeof k==='string'&&Array.isArray(catalog()[k])):[];
  }catch(_){return []}};
  // Un type supprimé reste uniquement en mémoire technique si une catégorie historique le référence.
  // Il n'est jamais proposé à la création et ne peut pas être réactivé depuis cette interface.
  const allChoiceRecords=()=>[
    ...types().map(t=>({id:t.id,label:t.label,baseTypeId:t.id,system:true,hidden:hiddenDefaults().includes(t.id)})),
    ...customChoices().filter(c=>c&&types().some(t=>t.id===c.baseTypeId)&&/^OPT_[A-Za-z0-9_-]+$/.test(String(c.id||''))).map(c=>({id:c.id,label:String(c.label||''),baseTypeId:c.baseTypeId,system:false,hidden:!!c.hidden}))
  ];
  const offered=()=>allChoiceRecords().filter(c=>!deletedChoiceIds().includes(c.id));
  const displayType=(folder)=>{
    const choice=allChoiceRecords().find(t=>t.id===categoryChoiceMap()[folder]);
    const technical=folderType(folder);
    return choice ? `${choice.label} · contrôle ${technical?.label||'à vérifier'}` : (technical?.label||'À vérifier');
  };
  const normalizeChoices=(sector)=>{
    sector.eqCustomTypeOptions=Array.isArray(sector.eqCustomTypeOptions)?sector.eqCustomTypeOptions:[];
    sector.eqHiddenTypeIds=Array.isArray(sector.eqHiddenTypeIds)?sector.eqHiddenTypeIds:[];
    sector.eqDeletedTypeIds=Array.isArray(sector.eqDeletedTypeIds)?sector.eqDeletedTypeIds:[];
    sector.eqCategoryOptionIds=sector.eqCategoryOptionIds&&typeof sector.eqCategoryOptionIds==='object'&&!Array.isArray(sector.eqCategoryOptionIds)?sector.eqCategoryOptionIds:{};
  };
  function refreshChoices(){
    const opts=offered(),active=opts.filter(x=>!x.hidden),prior=$('hv227-new-type')?.value||'';
    $('hv227-new-type').innerHTML=active.map(t=>`<option value="${safe(t.id)}">${safe(t.label)}</option>`).join('');
    if(active.some(t=>t.id===prior))$('hv227-new-type').value=prior;
    $('hv227-new-type').disabled=!active.length;
    const rule=$('hv227-choice-rule'),previous=rule?.value||'';
    if(rule){rule.innerHTML=types().map(t=>`<option value="${safe(t.id)}">${safe(t.label)}</option>`).join('');if(types().some(t=>t.id===previous))rule.value=previous}
    const box=$('hv227-type-list');if(!box)return;
    box.innerHTML=opts.map(t=>{
      const used=Object.keys(catalog()).filter(k=>(categoryChoiceMap()[k]||typeMap()[k])===t.id).length;
      const ruleName=types().find(r=>r.id===t.baseTypeId)?.label||'À vérifier';
      const caption=t.system?'Type standard · règle technique conservée':`Choix personnalisé · contrôle ${ruleName}`;
      const del=`<button type="button" class="hv227-danger hv251-permanent" data-choice="permanent-delete" data-choice-id="${safe(t.id)}" title="Suppression définitive du choix, sans effacer les contrôles ni les relevés">🗑 Supprimer définitivement</button>`;
      const rename=t.system?'':`<button type="button" data-choice="rename" data-choice-id="${safe(t.id)}">Renommer</button>`;
      return `<div class="hv227-type-line${t.hidden?' is-hidden':''}"><div><strong>${safe(t.label)}</strong><small>${safe(caption)}${used?' · '+used+' catégorie(s) conservée(s)':''}${t.hidden?' · choix déjà masqué':''}</small></div><div class="hv227-type-actions">${rename}${del}</div></div>`;
    }).join('');
  }
  const folderType=folder=>{
    const saved=typeMap()[folder];return types().find(t=>t.id===saved)
      || types().find(t=>norm(t.label)===norm(folder))
      || (()=>{const name=catalog()[folder]?.[0]||'';return typeof classifyEquipmentType==='function'?classifyEquipmentType(name,folder):types().at(-1)})();
  };
  let saving=false;
  // Conserver le texte saisi lors des actualisations du catalogue.
  const pendingCategoryDrafts=new Map();
  const msg=(value,isError=false)=>{const s=$('hv227-status');if(s){s.textContent=value;s.style.color=isError?'#a8293c':'#406447'}};
  // La notification ne confirme jamais une suppression avant la réponse 2xx du serveur.
  let hv252ToastTimer;
  function hv252ShowSavedToast(){
    let el=document.getElementById('hv252-saved-toast');
    if(!el){
      el=document.createElement('div');
      el.id='hv252-saved-toast';
      el.setAttribute('role','status');
      el.setAttribute('aria-live','polite');
      Object.assign(el.style,{
        position:'fixed',bottom:'28px',right:'28px',zIndex:'2147483646',
        background:'#e8f7eb',border:'1px solid #93cba0',color:'#14532d',
        padding:'13px 18px',borderRadius:'12px',boxShadow:'0 8px 32px rgba(0,0,0,.19)',
        font:'700 15px/1.3 Inter,Arial,sans-serif',maxWidth:'min(360px,calc(100vw - 32px))',
        pointerEvents:'none',transition:'opacity .2s ease'
      });
      document.body.appendChild(el);
    }
    el.textContent='✓ Bien supprimé';
    el.style.opacity='1';
    clearTimeout(hv252ToastTimer);
    hv252ToastTimer=setTimeout(()=>{el.style.opacity='0'},2400);
  }
  const keysList=()=>Object.keys(catalog()).filter(k=>!pendingKeys().includes(k));
  const validateName=(name,old='')=>{
    const trimmed=String(name||'').trim();
    if(trimmed.length<2||trimmed.length>65)throw Error('Nom : 2 à 65 caractères.');
    if(/[<>\u0000-\u001f]/.test(trimmed))throw Error('Caractères non autorisés dans ce nom.');
    if(keysList().some(k=>norm(k)===norm(trimmed)&&norm(k)!==norm(old)))throw Error('Une catégorie porte déjà ce nom.');
    return trimmed;
  };
  function refresh(){
    if(!$('hv227-modal')||$('hv227-modal').hidden)return;
    const dep=actual(),eq=catalog(),keys=keysList(),pending=pendingKeys(),filter=norm($('hv227-search')?.value);
    $('hv227-sector').textContent='Secteur : '+dep+' · '+keys.length+' catégorie'+(keys.length>1?'s':'');
    refreshChoices();
    $('hv227-list').dataset.keys=JSON.stringify(keys);
    const visible=keys.map((folder,index)=>({folder,index})).filter(x=>!filter||norm(x.folder).includes(filter));
    $('hv227-list').innerHTML=visible.length?visible.map(({folder,index})=>{
      const arr=Array.isArray(eq[folder])?eq[folder]:[];
      const t=folderType(folder),typeId=t?.id||'';
      const sameType=keys.filter(k=>k!==folder&&folderType(k)?.id===typeId);
      const allTargets=keys.filter(k=>k!==folder).map(k=>`<option value="${safe(k)}">${safe(k)}</option>`).join('');
      const items=arr.map((item,i)=>`<div class="hv227-eq-row"><div class="hv249-item-name"><b>${safe(displayEquipment(item))}</b><button type="button" class="hv249-rename" data-act="rename-equipment" data-index="${index}" data-item-index="${i}" aria-label="Renommer ${safe(displayEquipment(item))}">✎ Renommer</button></div><label class="hv227-move-label">Déplacer vers<select data-kind="destination" data-index="${index}" data-item-index="${i}"><option value="">Choisir une catégorie</option>${allTargets}</select></label><button type="button" data-act="move" data-index="${index}" data-item-index="${i}">Déplacer</button></div>`).join('');
      const transfer=arr.length?`<div class="hv227-transfer" data-transfer="${index}" hidden>${sameType.length?`<label>CATÉGORIE DESTINATION (MÊME TYPE)<select data-kind="bulk-destination" data-index="${index}"><option value="">Choisir…</option>${sameType.map(k=>`<option value="${safe(k)}">${safe(k)}</option>`).join('')}</select></label><button type="button" class="hv227-danger" data-act="bulk-remove" data-index="${index}">Déplacer puis supprimer</button><p>Les ${arr.length} équipement(s) seront transférés. Les relevés historiques seront conservés.</p>`:`<p>Créez d'abord une autre catégorie de type « ${safe(t?.label||'identique')} » pour déplacer les équipements avant suppression.</p>`}</div>`:'';
      return `<section class="hv227-category"><div class="hv227-cat-head"><div><strong>${safe(folder)}</strong><small>Type : ${safe(displayType(folder))}</small><span class="hv227-count">${arr.length} équipement${arr.length>1?'s':''}</span></div><div class="hv227-cat-buttons"><button type="button" data-act="rename" data-index="${index}" aria-label="Renommer ${safe(folder)}">✎ Renommer</button>${arr.length?`<button type="button" data-act="plan" data-index="${index}">Déplacer</button>`:''}<button type="button" class="hv227-danger hv250-delete" data-act="remove" data-index="${index}" aria-label="Supprimer la catégorie ${safe(folder)}">🗑 Supprimer</button></div></div>${transfer}${arr.length?`<details class="hv227-eq-details"><summary>Voir / déplacer un équipement (${arr.length})</summary>${items}</details>`:''}</section>`;
    }).join(''):`<div class="hv227-empty">${keys.length?'Aucune catégorie ne correspond à la recherche.':'Vous repartez de zéro : ajoutez votre première catégorie ci-dessus.'}</div>`;
    // La liste « Matériel à reclasser » est distincte et ne contient aucun relevé supprimé.
    const box=$('hv248-pending');
    if(box){
      const populated=pending.filter(k=>eq[k]?.length);
      box.hidden=!populated.length;
      box.dataset.keys=JSON.stringify(populated);
      box.innerHTML=populated.length?`<h3>📦 Matériel conservé · À reclasser (${populated.reduce((n,k)=>n+eq[k].length,0)})</h3><p>Écrivez librement le nom de votre nouvelle catégorie et cliquez sur AFFECTER : elle sera créée et le matériel reclassé en une seule opération. Les règles HACCP et les relevés historiques sont conservés.</p>${populated.map((k,idx)=>{
        const t=folderType(k)?.id;
        const draft=pendingCategoryDrafts.get(k)||'';
        return `<div class="hv248-pending-row"><div><b><span class="hv249-pending-title" data-hv249-title="${idx}">${safe(draft.trim()||types().find(x=>x.id===t)?.label||'Contrôle HACCP')}</span> · ${eq[k].length} équipement(s)</b><small class="hv249-technical">Contrôle : ${safe(types().find(x=>x.id===t)?.label||'HACCP')}</small><div class="hv249-pending-items">${eq[k].map((item,i)=>`<div class="hv249-pending-item"><span>${safe(displayEquipment(item))}</span><div class="hv254-pending-actions"><button type="button" class="hv249-rename" data-hv249-rename-pending="${idx}" data-item-index="${i}" aria-label="Renommer ${safe(displayEquipment(item))}" title="Renommer l’équipement">✎</button><button type="button" class="hv254-delete-pending" data-hv254-delete-pending="${idx}" data-item-index="${i}" aria-label="Supprimer définitivement ${safe(displayEquipment(item))}" title="Retirer définitivement cet équipement du catalogue actif ; les relevés historiques sont conservés">🗑 Supprimer</button></div></div>`).join('')}</div></div><label>Nom de ma nouvelle catégorie<input type="text" data-hv248-dest="${idx}" maxlength="65" placeholder="Écrire ma propre catégorie…" value="${safe(draft)}" autocomplete="off" aria-label="Nom de la catégorie pour ${safe(types().find(x=>x.id===t)?.label||'contrôle HACCP')}"></label><button type="button" class="hv227-primary" data-hv248-move="${idx}">AFFECTER</button></div>`;
      }).join('')}`:'';
    }
  }
  async function renameEquipment(source,equipment){
    if(!eligible()||saving)return;
    if(!catalogReady)return msg('Connexion au serveur requise pour modifier le nom.',true);
    if(!source||!Array.isArray(catalog()[source])||!catalog()[source].includes(equipment))
      return msg('Équipement non retrouvé, actualisez le catalogue.',true);
    const before=displayEquipment(equipment);
    const answer=prompt('Nouveau nom de cet équipement :',before);
    if(answer===null)return;
    const label=String(answer).trim();
    if(label===before)return;
    if(label.length<2||label.length>65||/[<>\u0000-\u001f.$]/.test(label))
      return msg('Nom invalide : 2 à 65 caractères, sans caractères réservés.',true);
    const all=Object.values(catalog()).flatMap(arr=>Array.isArray(arr)?arr:[]);
    if(all.some(name=>name!==equipment&&norm(displayEquipment(name))===norm(label)))
      return msg('Un autre équipement porte déjà ce nom.',true);
    await commit(null,'Équipement renommé « '+label+' » (historique conservé)',{
      action:'RENAME_EQUIPMENT_DISPLAY',name:source,equipment,label
    });
  }
  async function commit(update,label,operation){
    if(!eligible()||saving){msg('Session non reconnue ou sauvegarde déjà en cours.',true);return false}
    if(!catalogReady||!operation||!Number.isSafeInteger(catalogRevision)){
      msg('Catalogue non chargé ou serveur incompatible. Réessayez après actualisation.',true);return false;
    }
    saving=true;msg('Enregistrement sécurisé sur le serveur…');
    try{
      const dep=actual();
      // Les mutations sont réalisées côté serveur à partir du catalogue stocké
      // dans MongoDB, et non à partir d'un état fourni arbitrairement par le client.
      const result=await requestCategoryApi('POST',{
        sector:dep,revision:catalogRevision,initialSector:EMPIRE_LISTS?.[dep]||{},...operation
      });
      catalogRevision=Number(result.revision);
      catalogLoadedAt=Date.now();
      EMPIRE_LISTS[dep]=result.sectorData;
      try{localStorage.setItem('EMPIRE_HACCP_LISTS_V2_'+tenantID,JSON.stringify(EMPIRE_LISTS))}catch(_){}
      try{haccpStateMemory=null;haccpStateMemoryAt=0}catch(_){}
      if(typeof populateSelects==='function')populateSelects();
      if(typeof renderDesktopTemperatureHub==='function')renderDesktopTemperatureHub();
      if(typeof renderDesktopSelectedEquipment==='function')renderDesktopSelectedEquipment();
      if(typeof renderLogs==='function')renderLogs();
      window.dispatchEvent(new Event('ichef:haccp:categories-changed'));
      refresh();msg(label+' · sauvegardé sur le serveur.');
      if(['RESET_CATEGORIES','DELETE_CATEGORY','DELETE_CATEGORY_PRESERVE_EQUIPMENT','MOVE_AND_DELETE_CATEGORY','PERMANENT_DELETE_CHOICE','DELETE_PENDING_EQUIPMENT'].includes(operation.action))hv252ShowSavedToast();
      return true;
    }catch(e){
      console.warn('[HACCP V247 catégories]',e);
      msg('Action non enregistrée : '+(e?.message||e),true);
      // Ne pas inventer de succès : recharger l'état faisant autorité.
      if(/Catalogue modifié/i.test(String(e?.message||'')))await loadCatalog();
      return false;
    }finally{saving=false}
  }
  window.haccpV227OpenCategories=function(){
    if(!eligible()){alert('Ouvrez HACCP avec votre compte responsable authentifié sur ordinateur.');return}
    // Ouverture IMMEDIATE de la fenêtre et des catégories déjà affichables.
    // Le serveur seul autorise et confirme ensuite les modifications.
    $('hv227-modal').hidden=false;document.body.classList.add('hv227-categories-open');
    refresh();
    if(catalogReady && catalogSector===actual() && catalogSessionToken===haccpSessionToken() && Date.now()-catalogLoadedAt<catalogPrefetchMaxAgeMs){
      msg('✓ Catégories prêtes.');
    }else{
      msg(catalogReady?'Actualisation du catalogue en arrière-plan…':'Vos catégories sont affichées · connexion sécurisée en cours…');
      void loadCatalog({quiet:true});
    }
    requestAnimationFrame(()=>$('hv227-new-name')?.focus({preventScroll:true}));
  };
  function close(){const m=$('hv227-modal');if(m)m.hidden=true;document.body.classList.remove('hv227-categories-open')}
  function boot(){
    $('hv227-close')?.addEventListener('click',close);
    $('hv248-reset-all')?.addEventListener('click',async()=>{
      if(!eligible()||saving||!catalogReady)return msg('Veuillez vous identifier et attendre le chargement du catalogue.',true);
      const n=Object.keys(catalog()).length;
      const total=Object.values(catalog()).reduce((acc,a)=>acc+(Array.isArray(a)?a.length:0),0);
      if(!n)return msg('Il n’y a aucune catégorie à réinitialiser. Créez directement la vôtre.');
      await commit(null,'Anciennes catégories retirées. Créez et affectez maintenant vos propres catégories',{action:'RESET_CATEGORIES'});
    });
    $('hv248-pending')?.addEventListener('input',e=>{
      const input=e.target.closest('input[data-hv248-dest]');if(!input)return;
      const idx=Number(input.dataset.hv248Dest);
      const keys=JSON.parse($('hv248-pending')?.dataset.keys||'[]');
      if(keys[idx])pendingCategoryDrafts.set(keys[idx],input.value);
      const title=$('hv248-pending')?.querySelector(`[data-hv249-title="${idx}"]`);
      if(title)title.textContent=input.value.trim()||String(types().find(x=>x.id===folderType(keys[idx])?.id)?.label||'Contrôle HACCP');
    });
    $('hv248-pending')?.addEventListener('keydown',e=>{
      if(e.key==='Enter'&&e.target.matches('input[data-hv248-dest]')){
        e.preventDefault();
        const idx=e.target.dataset.hv248Dest;
        $('hv248-pending')?.querySelector(`button[data-hv248-move="${idx}"]`)?.click();
      }
    });
    $('hv248-pending')?.addEventListener('click',async e=>{
      const renamer=e.target.closest('button[data-hv249-rename-pending]');
      if(renamer){
        const idx=Number(renamer.dataset.hv249RenamePending),pos=Number(renamer.dataset.itemIndex);
        const keys=JSON.parse($('hv248-pending')?.dataset.keys||'[]');
        const source=keys[idx],equipment=catalog()[source]?.[pos];
        if(source&&typeof equipment==='string')await renameEquipment(source,equipment);
        return;
      }
      // V254 : suppression directe du matériel en attente, sans réaffectation.
      // L'API existante contrôle la session, le secteur et la révision côté serveur.
      const deleter=e.target.closest('button[data-hv254-delete-pending]');
      if(deleter){
        if(!eligible()||saving||!catalogReady)return msg('Session et catalogue serveur requis pour supprimer.',true);
        const idx=Number(deleter.dataset.hv254DeletePending);
        const pos=Number(deleter.dataset.itemIndex);
        const keys=JSON.parse($('hv248-pending')?.dataset.keys||'[]');
        const source=keys[idx];
        const equipment=catalog()[source]?.[pos];
        if(!source||!pendingKeys().includes(source)||typeof equipment!=='string')
          return msg('Équipement à reclasser introuvable. Actualisez le catalogue.',true);
        deleter.disabled=true;
        try{
          await commit(null,'Équipement « '+displayEquipment(equipment)+' » supprimé définitivement du parc actif ; historique conservé',{
            action:'DELETE_PENDING_EQUIPMENT',name:source,equipment
          });
        }finally{deleter.disabled=false}
        return;
      }
      const button=e.target.closest('button[data-hv248-move]');if(!button||!eligible()||saving)return;
      if(!catalogReady)return msg('Connexion au serveur requise pour enregistrer votre catégorie.',true);
      const idx=Number(button.dataset.hv248Move);
      const keys=JSON.parse($('hv248-pending')?.dataset.keys||'[]');
      const source=keys[idx];
      const input=$('hv248-pending')?.querySelector(`input[data-hv248-dest="${idx}"]`);
      if(!source||!pendingKeys().includes(source)||!Array.isArray(catalog()[source]))return msg('Matériel à reclasser introuvable : actualisez le catalogue.',true);
      let dest;
      try{dest=validateName(input?.value)}catch(err){msg(err.message,true);input?.focus();return}
      if(norm(dest)===norm(source))return msg('Écrivez un nouveau nom de catégorie.',true);
      button.disabled=true;
      try{
        const ok=await commit(null,'Catégorie « '+dest+' » créée et matériel reclassé',{
          action:'CREATE_AND_ASSIGN_PENDING',name:source,target:dest
        });
        if(ok)pendingCategoryDrafts.delete(source);
      }finally{button.disabled=false}
    });
    $('hv227-modal')?.addEventListener('click',e=>{if(e.target===$('hv227-modal'))close()});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('hv227-modal')?.hidden)close()});
    $('hv227-search')?.addEventListener('input',refresh);
    $('hv227-choice-name')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();$('hv227-choice-add')?.click()}});
    $('hv227-choice-add')?.addEventListener('click',async()=>{
      if(!eligible())return;
      const el=$('hv227-choice-name'),label=String(el?.value||'').trim();
      if(label.length<2||label.length>65||/[<>\u0000-\u001f]/.test(label))return msg('Le nom du choix doit contenir 2 à 65 caractères valides.',true);
      const rule=$('hv227-choice-rule')?.value;
      if(!types().some(t=>t.id===rule))return msg('Choisissez la règle HACCP associée.',true);
      if(offered().some(t=>norm(t.label)===norm(label)))return msg('Ce choix existe déjà dans la liste.',true);
      const id='OPT_'+(crypto.randomUUID?crypto.randomUUID().replace(/-/g,''):String(Date.now())+Math.random().toString(36).slice(2));
      const ok=await commit(sector=>{
        if([...types().map(t=>t.label),...sector.eqCustomTypeOptions.map(t=>t.label)].some(x=>norm(x)===norm(label)))throw Error('Ce choix existe déjà.');
        sector.eqCustomTypeOptions.push({id,label,baseTypeId:rule,hidden:false});
      },'Choix « '+label+' » ajouté au menu',{action:'ADD_CHOICE',label,baseTypeId:rule});
      if(ok)el.value='';
    });
    $('hv227-type-list')?.addEventListener('click',async e=>{
      const btn=e.target.closest('button[data-choice]');if(!btn||!eligible())return;
      const id=btn.dataset.choiceId,choice=offered().find(t=>t.id===id),action=btn.dataset.choice;
      if(!choice)return msg('Choix introuvable. Actualisez.',true);
      if(action==='rename'){
        if(choice.system)return msg('Les libellés des règles standard ne peuvent pas être modifiés.',true);
        const value=prompt('Renommer le choix du menu :',choice.label);if(value===null)return;
        const label=String(value||'').trim();if(label.length<2||label.length>65||/[<>\u0000-\u001f]/.test(label))return msg('Nom invalide : 2 à 65 caractères.',true);
        if(offered().some(t=>t.id!==id&&norm(t.label)===norm(label)))return msg('Ce choix existe déjà.',true);
        await commit(sector=>{const c=sector.eqCustomTypeOptions.find(t=>t.id===id);if(!c)throw Error('Choix introuvable.');c.label=label},'Choix renommé',{action:'RENAME_CHOICE',id,label});return;
      }
      if(action==='permanent-delete'){
        if(!catalogReady||saving)return msg('Veuillez attendre la synchronisation du catalogue.',true);
        await commit(null,'Choix « '+choice.label+' » supprimé définitivement du menu',{action:'PERMANENT_DELETE_CHOICE',id});
        return;
      }
      // Les anciens boutons « retirer/réactiver » ne sont plus proposés.
      // Le serveur protège également les choix supprimés contre toute réactivation.
    });
    $('hv227-new-name')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();$('hv227-add')?.click()}});
    $('hv227-add')?.addEventListener('click',async()=>{
      if(!eligible())return;const el=$('hv227-new-name');let name;
      try{name=validateName(el?.value)}catch(e){msg(e.message,true);return}
      const option=$('hv227-new-type')?.value;
      const selected=offered().find(t=>t.id===option&&!t.hidden);
      if(!selected)return msg('Sélectionnez un choix de contrôle HACCP valide.',true);
      const ok=await commit(sector=>{
        if(sector.eq[name])throw Error('Catégorie existante.');
        sector.eq[name]=[];
        sector.eqCategoryTypes[name]=selected.baseTypeId;
        sector.eqCategoryOptionIds[name]=selected.id;
      },'Catégorie « '+name+' » créée',{action:'CREATE_CATEGORY',name,id:selected.id});
      if(ok&&el){el.value='';el.focus({preventScroll:true})}
    });
    $('hv227-list')?.addEventListener('click',async e=>{
      const btn=e.target.closest('button[data-act]');if(!btn||!eligible())return;
      const keys=JSON.parse($('hv227-list')?.dataset.keys||'[]');const idx=Number(btn.dataset.index),folder=keys[idx];
      if(!folder||!Object.prototype.hasOwnProperty.call(catalog(),folder))return msg('Catégorie introuvable, actualisez.',true);
      const kind=btn.dataset.act,eq=catalog();
      if(kind==='rename-equipment'){
        const equipment=eq[folder]?.[Number(btn.dataset.itemIndex)];
        if(typeof equipment==='string')await renameEquipment(folder,equipment);
        return;
      }
      if(kind==='plan'){
        const pane=$('hv227-list').querySelector(`[data-transfer="${idx}"]`);
        if(pane)pane.hidden=!pane.hidden;
        return;
      }
      if(kind==='rename'){
        const proposed=prompt('Renommer la catégorie :',folder);if(proposed===null)return;
        let name;try{name=validateName(proposed,folder)}catch(err){msg(err.message,true);return}
        if(name===folder)return;
        await commit(sector=>{
          if(!Object.prototype.hasOwnProperty.call(sector.eq,folder))throw Error('Catégorie introuvable.');
          const revised={};for(const [k,v] of Object.entries(sector.eq))revised[k===folder?name:k]=v;sector.eq=revised;
          sector.eqCategoryTypes[name]=sector.eqCategoryTypes[folder]||folderType(folder)?.id||'OTHER';delete sector.eqCategoryTypes[folder];
          if(sector.eqCategoryOptionIds[folder]){sector.eqCategoryOptionIds[name]=sector.eqCategoryOptionIds[folder];delete sector.eqCategoryOptionIds[folder]}
        },'Catégorie renommée',{action:'RENAME_CATEGORY',name:folder,label:name});
        return;
      }
      if(kind==='remove'){
        if(!catalogReady)return msg('Connexion au serveur requise pour supprimer.',true);
        const count=Array.isArray(eq[folder])?eq[folder].length:0;
        const action=count?'DELETE_CATEGORY_PRESERVE_EQUIPMENT':'DELETE_CATEGORY';
        const confirmation=count?'Catégorie « '+folder+' » supprimée · '+count+' équipement(s) conservés à reclasser':'Catégorie vide « '+folder+' » supprimée';
        await commit(null,confirmation,{action,name:folder});
        return;
      }
      if(kind==='bulk-remove'){
        const sel=$('hv227-list')?.querySelector(`select[data-kind="bulk-destination"][data-index="${idx}"]`);
        const target=sel?.value,srcType=folderType(folder)?.id;
        if(!target||target===folder||!Array.isArray(eq[target]))return msg('Choisissez une catégorie destination.',true);
        if(folderType(target)?.id!==srcType)return msg('Pour éviter un changement de seuil HACCP, choisissez une catégorie du même type.',true);
        const items=eq[folder]||[],targetItems=eq[target]||[];
        if(items.some(item=>targetItems.includes(item)))return msg('Un équipement est déjà présent dans la catégorie cible. Déplacez-le individuellement.',true);
        await commit(sector=>{
          const origin=sector.eq[folder],dest=sector.eq[target];if(!Array.isArray(origin)||!Array.isArray(dest))throw Error('Catégorie indisponible.');
          if(origin.some(item=>dest.includes(item)))throw Error('Équipement déjà présent dans la destination.');
          dest.push(...origin);delete sector.eq[folder];delete sector.eqCategoryTypes[folder];delete sector.eqCategoryOptionIds[folder];
        },'Équipements déplacés et catégorie supprimée',{action:'MOVE_AND_DELETE_CATEGORY',name:folder,target});
        return;
      }
      if(kind==='move'){
        const itemIdx=Number(btn.dataset.itemIndex),equipment=eq[folder]?.[itemIdx];
        const sel=$('hv227-list')?.querySelector(`select[data-kind="destination"][data-index="${idx}"][data-item-index="${itemIdx}"]`);
        const target=sel?.value;if(!equipment||!target||target===folder||!Array.isArray(eq[target]))return msg('Choisissez une autre catégorie.',true);
        const sourceKind=folderType(folder)?.kind,targetKind=folderType(target)?.kind;
        if(sourceKind!==targetKind&&!confirm(`Attention : déplacer « ${equipment} » vers un autre type HACCP peut modifier les seuils des futurs relevés. Confirmer ?`))return;
        if(!confirm(`Déplacer « ${equipment} » vers « ${target} » ? Les anciens relevés seront conservés.`))return;
        await commit(sector=>{
          const from=sector.eq[folder],to=sector.eq[target];if(!Array.isArray(from)||!Array.isArray(to))throw Error('Catégorie introuvable.');
          const pos=from.indexOf(equipment);if(pos<0||to.includes(equipment))throw Error('Équipement introuvable ou déjà présent.');
          from.splice(pos,1);to.push(equipment);
        },'Équipement déplacé',{action:'MOVE_EQUIPMENT',name:folder,target,equipment});
      }
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
</script>

<!-- iCHEF HACCP V228 — tiroir de contrôle rapide clair et lisible · ORDINATEUR UNIQUEMENT -->
<style id="ichef-haccp-v228-quick-reading-css">
@media (min-width:1101px){
  /* Le tiroir est momentanément déplacé comme enfant direct de body. Il ne peut
     plus être obscurci par l'overlay du tableau de bord, quelle que soit la
     création de contextes d'empilement dans le panneau HACCP principal. */
  body.hv225-ready.hv225-drawer-open > #hv225-drawer-shade{
    display:block!important;z-index:840!important;background:rgba(10,23,41,.52)!important;
  }
  body.hv225-ready.hv225-drawer-open > #hv228-reading-drawer{
    display:block!important;position:fixed!important;inset:0 0 0 auto!important;
    width:min(670px,94vw)!important;height:100dvh!important;max-height:100dvh!important;
    z-index:850!important;padding:20px 30px 32px!important;margin:0!important;
    overflow-x:hidden!important;overflow-y:auto!important;box-sizing:border-box!important;
    background:#fff!important;border:0!important;border-left:5px solid #eebc4d!important;
    box-shadow:-22px 0 70px rgba(4,16,34,.25)!important;color:#132236!important;
    font-family:Inter,Arial,sans-serif!important;overscroll-behavior:contain;
  }
  body.hv225-ready.hv225-drawer-open > #hv228-reading-drawer .hd-parc-panel{display:none!important}
  body.hv225-ready.hv225-drawer-open > #hv228-reading-drawer .hd-reading-panel{
    display:flex!important;border:0!important;padding:20px 0!important;min-height:0!important;
    box-shadow:none!important;background:#fff!important;color:#122338!important;
  }
  body.hv225-ready.hv225-drawer-open > #hv228-reading-drawer .hd-reading-view{gap:17px!important}
  body.hv225-ready.hv225-drawer-open > #hv228-reading-drawer #hv225-close-reading{
    position:sticky!important;top:-20px!important;z-index:3!important;
    display:block!important;width:100%!important;text-align:right!important;
    padding:15px 4px 13px!important;background:#fff!important;
    border:0!important;border-bottom:1px solid #e6ecf3!important;color:#293b50!important;
    font:800 14px Inter,Arial,sans-serif!important;cursor:pointer;
  }
  body.hv225-ready.hv225-drawer-open > #hv228-reading-drawer #hv225-close-reading:hover{color:#b06b0c!important}
  body.hv225-ready.hv225-drawer-open > #hv228-reading-drawer #hv228-progress{
    display:block!important;margin:16px 0 7px!important;padding:17px 19px!important;
    background:#f5f8fd!important;border:1px solid #dce5ef!important;border-radius:12px!important;
    color:#182a41!important;
  }
  #hv228-progress .hv228-kicker{font-size:12px!important;font-weight:950!important;letter-spacing:1px!important;color:#a86e15!important}
  #hv228-progress .hv228-kicker span{color:#77899f!important}
  #hv228-step{font-size:16px!important;font-weight:900!important;line-height:1.45!important;margin-top:7px!important}
  body.hv225-ready.hv225-drawer-open > #hv228-reading-drawer .hd-reading-category{
    font-size:12px!important;color:#66788d!important;letter-spacing:.6px!important;
  }
  body.hv225-ready.hv225-drawer-open > #hv228-reading-drawer .hd-reading-topline h2{
    font-size:27px!important;line-height:1.2!important;color:#16263a!important;margin-top:8px!important;
    overflow-wrap:anywhere;
  }
  body.hv225-ready.hv225-drawer-open > #hv228-reading-drawer .hd-status{
    font-size:12px!important;min-height:35px!important;padding:6px 12px!important;
    border-radius:99px!important;border-width:1px!important;color:#26394f!important;
  }
  body.hv225-ready.hv225-drawer-open > #hv228-reading-drawer .hd-status.alert{
    color:#bd273b!important;background:#fff0f1!important;border-color:#efb5bb!important;
  }
  body.hv225-ready.hv225-drawer-open > #hv228-reading-drawer .hd-status.ok{
    color:#167446!important;background:#ecf9f0!important;border-color:#acd9b9!important;
  }
  body.hv225-ready.hv225-drawer-open > #hv228-reading-drawer .hd-rule-box{
    background:#fff8e8!important;border:1px solid #ecd59c!important;
    border-left:4px solid #eabf56!important;padding:16px 18px!important;border-radius:12px!important;
  }
  body.hv225-ready.hv225-drawer-open > #hv228-reading-drawer .hd-rule-box strong{
    font-size:15px!important;line-height:1.45!important;color:#344256!important;
  }
  body.hv225-ready.hv225-drawer-open > #hv228-reading-drawer .hd-rule-box span{
    font-size:12px!important;line-height:1.55!important;color:#6c7787!important;
  }
  body.hv225-ready.hv225-drawer-open > #hv228-reading-drawer .hd-reading-input-row{
    display:grid!important;grid-template-columns:minmax(0,1fr) 185px!important;
    gap:14px!important;align-items:end!important;
  }
  body.hv225-ready.hv225-drawer-open > #hv228-reading-drawer .hd-reading-input-row label>span{
    display:block!important;font-size:13px!important;color:#33465b!important;letter-spacing:.55px!important;margin-bottom:10px!important;
  }
  body.hv225-ready.hv225-drawer-open > #hv228-reading-drawer .hd-big-temp{
    height:96px!important;border:2px solid #a7bdce!important;border-radius:14px!important;
    background:#fff!important;box-shadow:0 0 0 3px #f1f5f9!important;
  }
  body.hv225-ready.hv225-drawer-open > #hv228-reading-drawer .hd-big-temp:focus-within{
    border-color:#e4ad3d!important;box-shadow:0 0 0 4px rgba(239,192,77,.19)!important;
  }
  body.hv225-ready.hv225-drawer-open > #hv228-reading-drawer #hd-temp-value{
    font-size:48px!important;font-weight:900!important;color:#102339!important;
    opacity:1!important;line-height:1.2!important;
  }
  body.hv225-ready.hv225-drawer-open > #hv228-reading-drawer .hd-big-temp b{
    color:#5d6c7c!important;font-size:20px!important;
  }
  body.hv225-ready.hv225-drawer-open > #hv228-reading-drawer #hd-save-temp{
    height:96px!important;min-height:96px!important;border-radius:14px!important;
    background:#f5c75d!important;border:2px solid #d4a039!important;
    color:#172335!important;font-size:16px!important;font-weight:950!important;
    box-shadow:0 4px 12px rgba(151,100,12,.12)!important;cursor:pointer;
  }
  body.hv225-ready.hv225-drawer-open > #hv228-reading-drawer #hd-save-temp:not(:disabled):hover{
    background:#edb945!important;
  }
  body.hv225-ready.hv225-drawer-open > #hv228-reading-drawer #hd-save-temp:disabled{opacity:.6!important;cursor:wait!important}
  body.hv225-ready.hv225-drawer-open > #hv228-reading-drawer .hd-compliance{
    min-height:52px!important;padding:12px!important;border-radius:11px!important;
    font-size:15px!important;color:#425063!important;
  }
  body.hv225-ready.hv225-drawer-open > #hv228-reading-drawer .hd-compliance.ok{
    background:#e7f7ed!important;border-color:#a6d6b8!important;color:#13804b!important;
  }
  body.hv225-ready.hv225-drawer-open > #hv228-reading-drawer .hd-compliance.alert{
    background:#fff0f1!important;border-color:#f3b3b8!important;color:#bc243b!important;
  }
  body.hv225-ready.hv225-drawer-open > #hv228-reading-drawer .hd-reading-meta{gap:10px!important}
  body.hv225-ready.hv225-drawer-open > #hv228-reading-drawer .hd-reading-meta>div{
    background:#f8fafc!important;border:1px solid #dce5ed!important;
    padding:14px 12px!important;border-radius:10px!important;
  }
  body.hv225-ready.hv225-drawer-open > #hv228-reading-drawer .hd-reading-meta span{
    font-size:11px!important;color:#687a91!important;font-weight:850!important;
  }
  body.hv225-ready.hv225-drawer-open > #hv228-reading-drawer .hd-reading-meta strong{
    display:block!important;font-size:14px!important;color:#16273b!important;line-height:1.4!important;overflow-wrap:anywhere;
  }
  body.hv225-ready.hv225-drawer-open > #hv228-reading-drawer .hd-round-actions{
    display:grid!important;grid-template-columns:1fr 1fr!important;gap:12px!important;margin-top:8px!important;
  }
  body.hv225-ready.hv225-drawer-open > #hv228-reading-drawer .hd-round-actions button{
    min-height:52px!important;border-radius:12px!important;font-size:14px!important;
    background:#f5f8fc!important;color:#18293c!important;border:1px solid #cdd8e4!important;
    cursor:pointer;
  }
  body.hv225-ready.hv225-drawer-open > #hv228-reading-drawer .hd-round-actions button:hover{
    background:#e8f1fd!important;
  }
  /* Les contrôles de refroidissement utilisent également ce tiroir. */
  body.hv225-ready.hv225-drawer-open > #hv228-reading-drawer .hd-cooling-form label>span{
    font-size:13px!important;color:#41536a!important;
  }
  body.hv225-ready.hv225-drawer-open > #hv228-reading-drawer .hd-cooling-form input{
    font-size:17px!important;background:#fff!important;color:#1a2b3e!important;
  }
  body.hv225-ready.hv225-drawer-open > #hv228-reading-drawer .hd-cooling-actions button{
    min-height:49px!important;font-size:13px!important;
  }
  @media(max-width:1240px){
    body.hv225-ready.hv225-drawer-open > #hv228-reading-drawer{width:min(610px,94vw)!important;padding:15px 20px 26px!important}
  }
}
</style>
<style id="ichef-v229-invoices-css">
#v229-backdrop{position:fixed;inset:0;background:rgba(9,16,27,.74);z-index:99990;display:none;align-items:center;justify-content:center;padding:16px;box-sizing:border-box}
#v229-backdrop.open{display:flex!important}
#v229-panel{width:min(1120px,98vw);max-height:min(93vh,960px);overflow:auto;background:#f5f7fb;color:#142235;border-radius:20px;box-shadow:0 24px 80px rgba(0,0,0,.6);font-family:Inter,Arial,sans-serif}
#v229-panel *,#v229-panel *::before{box-sizing:border-box}
#v229-panel .v229-header{background:#14202e;color:white;padding:20px 24px;display:flex;justify-content:space-between;gap:12px;align-items:center}
#v229-panel .v229-header h2{margin:0;font-size:22px;font-weight:900;color:white}
#v229-panel .v229-header p{font-size:12px;color:#c5d1df;margin:5px 0 0}
#v229-panel button{cursor:pointer;border:1px solid #d2dae4;background:white;color:#1a293b;border-radius:10px;padding:12px 14px;font-size:13px;font-weight:800;min-height:44px}
#v229-panel button.primary{background:#e8b84a;border-color:#caa043;color:#152232}
#v229-panel button:disabled{opacity:.55;cursor:wait}
#v229-panel .v229-body{padding:20px;display:grid;gap:16px}
#v229-panel .v229-steps{display:flex;gap:9px;flex-wrap:wrap}
#v229-panel .v229-steps span{background:white;border:1px solid #d5ddea;padding:8px 12px;border-radius:30px;font-size:12px;font-weight:800}
#v229-panel .v229-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
#v229-panel label{display:flex;flex-direction:column;gap:5px;font-size:11px;font-weight:800;letter-spacing:.25px;color:#42526a;min-width:0}
#v229-panel input,#v229-panel select{background:#fff!important;color:#172536!important;border:1px solid #b7c4d2!important;border-radius:9px!important;font-size:14px!important;padding:11px 9px!important;width:100%;min-width:0;box-shadow:none!important}
#v229-panel .v229-tablebox{overflow:auto;border:1px solid #d5dce7;border-radius:12px;background:#fff}
#v229-panel table{width:100%;border-collapse:collapse;min-width:850px;margin:0;font-size:12px}
#v229-panel th,#v229-panel td{padding:9px 7px;border-bottom:1px solid #e2e9f1;vertical-align:middle;color:#213249}
#v229-panel th{position:static;background:#e9eef5!important;color:#394c66!important;text-align:left;white-space:nowrap}
#v229-panel td input,#v229-panel td select{font-size:12px!important;padding:8px 6px!important}
#v229-panel .v229-status{background:#fff;border:1px solid #d8e1ea;border-radius:11px;padding:13px;font-size:13px;white-space:pre-wrap;line-height:1.5}
#v229-panel .v229-status.good{background:#e8f9ee;color:#165d3c}
#v229-panel .v229-status.error{background:#fff0f2;color:#9c2138}
#v229-panel .v229-totals{display:flex;flex-wrap:wrap;gap:12px;justify-content:flex-end;font-weight:900;font-size:14px}
#v229-panel .v229-totals span{background:white;border:1px solid #d5dce7;padding:12px;border-radius:10px}
#v229-panel .v229-actions{display:flex;gap:12px;justify-content:space-between;flex-wrap:wrap}
#v229-panel .v229-note{background:#fff7e2;color:#6d5119;border-left:4px solid #ddaf44;padding:12px;border-radius:9px;font-size:12px;line-height:1.5}
#v229-panel .v229-mini{font-size:11px;color:#63748a}
#v229-open{font-size:12px!important;font-weight:900!important}
/* iCHEF V233 : les actions IA/ligne renvoient un état visible, en haut du formulaire. */
#v229-panel .v233-feedback{display:block;border:1px solid #d6e2ee;border-radius:11px;padding:11px 14px;
 background:#edf5fe;color:#163d65;font-size:13px;font-weight:750;line-height:1.45;
 position:relative;min-height:42px;box-shadow:inset 3px 0 0 #488bd1}
#v229-panel .v233-feedback.error{background:#fff0f2;border-color:#f7c1cb;color:#a32235;box-shadow:inset 3px 0 0 #df3a54}
#v229-panel .v233-feedback.good{background:#e6f8ee;border-color:#b4e4c8;color:#14613b;box-shadow:inset 3px 0 0 #23ad70}
#v229-panel .v233-feedback.working{background:#fff8e7;border-color:#e9cb77;color:#715000;box-shadow:inset 3px 0 0 #dba836}
#v229-panel .v233-line-count{display:inline-flex;align-items:center;background:#eef3fa;color:#2c4b6d;
 border:1px solid #cbd9e7;padding:7px 11px;border-radius:999px;font-weight:900;font-size:12px}
#v229-panel tr.v233-new-line td{background:#fff7d9!important;border-top:2px solid #e0b64d!important}
#v229-panel #v229-file.v233-attention{outline:3px solid #e76576!important;outline-offset:2px}
#v229-panel .v229-actions>button{min-width:155px;white-space:normal}
@media(max-width:760px){#v229-panel .v233-feedback{font-size:12px}}
@media(max-width:760px){#v229-backdrop{padding:0}#v229-panel{width:100vw;max-height:100dvh;height:100dvh;border-radius:0}#v229-panel .v229-header{padding:14px}#v229-panel .v229-header h2{font-size:17px}#v229-panel .v229-body{padding:12px}#v229-panel .v229-grid{grid-template-columns:repeat(2,minmax(0,1fr))}#v229-panel table{min-width:840px}}
</style>
<script id="ichef-v229-invoice-ui-script">
(function(){'use strict';
 const $=id=>document.getElementById(id);
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const tenant=()=>String(window.ICHEF_HACCP?.tenantID||new URLSearchParams(location.search).get('tenantID')||'');
 const server=()=>location.hostname==='localhost'||location.hostname==='127.0.0.1'?'http://localhost:10000':'https://tableau-system.onrender.com';
 let context={suppliers:[],orders:[],canValidate:false},rows=[],busy=false,recentlyAdded=-1;
 const num=x=>Number(String(x??'').replace(',','.'))||0;
 const money=x=>num(x).toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2});
 const round=x=>Math.round((Number(x)||0)*100)/100;
 const normal=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
 function headers(body){const tok=String(window.ICHEF_HACCP?.accessToken||sessionStorage.getItem('ichef_access_token')||sessionStorage.getItem('ichef_ops_token')||sessionStorage.getItem('ichef_chef_access_token')||'');const h={'Accept':'application/json','X-iCHEF-Tenant':tenant(),'X-iCHEF-Device':String(window.ICHEF_HACCP?.deviceId||localStorage.getItem('ichef_device_id')||'')};if(tok)h.Authorization='Bearer '+tok;if(body)h['Content-Type']='application/json';return h}
 async function request(path,method='GET',body){const url=server()+path+(path.includes('?')?'&':'?')+'tenantID='+encodeURIComponent(tenant());const r=await fetch(url,{method,cache:'no-store',credentials:'omit',headers:headers(!!body),body:body?JSON.stringify(body):undefined});const d=await r.json().catch(()=>({}));if(!r.ok||!d.success)throw Error(d.error||`Erreur ${r.status}`);return d;}
 function status(t,kind=''){
  const e=$('v229-status');if(e){e.textContent=t;e.className='v229-status '+kind}
  const top=$('v233-feedback');if(top){top.textContent=t;top.className='v233-feedback '+(kind||'');top.setAttribute('role',kind==='error'?'alert':'status')}
 }
 function focusNewLine(){
   const last=$('v229-lines')?.querySelector('tr[data-row]:last-child');
   if(!last)return;
   const input=last.querySelector('[data-field="name"]');
   try{last.scrollIntoView({behavior:'smooth',block:'center'});}catch(_){last.scrollIntoView();}
   // Évite un deuxième saut de la page sur les navigateurs modernes.
   try{input?.focus({preventScroll:true})}catch(_){input?.focus()}
 }
 function unitOptions(u){return ['kg','g','L','ml','u','carton'].map(x=>`<option value="${x}"${x===u?' selected':''}>${x}</option>`).join('')}
 function orderOptions(){const chosen=$('v229-supplier')?.value||'';return '<option value="">Aucune commande — comptabilité seulement</option>'+context.orders.filter(o=>!chosen||o.supplierId===chosen).map(o=>`<option value="${esc(o.id)}">${esc(o.id)} · ${esc(o.name)} · ${esc(o.status)}</option>`).join('');}
 function orderById(){return context.orders.find(o=>o.id===$('v229-order')?.value)}
 function inventoryChoices(line){const order=orderById();return '<option value="">Non lié au stock</option>'+(order?.items||[]).filter(it=>it.inventoryItemId&&it.receivedQuantity>0&&String(it.unit).toLowerCase()===String(line.unit).toLowerCase()).map(it=>`<option value="${esc(it.inventoryItemId)}"${it.inventoryItemId===line.inventoryItemId?' selected':''}>${esc(it.name)} · ${esc(it.inventoryItemId)}</option>`).join('');}
 function readRows(){rows=[...$('v229-lines').querySelectorAll('tr[data-row]')].map(tr=>{const get=s=>tr.querySelector(`[data-field="${s}"]`)?.value||'';return {name:get('name'),quantity:get('quantity')===''?'':num(get('quantity')),unit:get('unit'),unitPriceHT:get('unitPriceHT')===''?'':num(get('unitPriceHT')),taxRate:get('taxRate')===''?'':num(get('taxRate')),inventoryItemId:get('inventoryItemId')}});}
 function calculations(){let ht=0;const groups={};for(const l of rows){const base=round(l.quantity*l.unitPriceHT);ht=round(ht+base);const key=String(l.taxRate);groups[key]=round((groups[key]||0)+base);}const tax=round(Object.entries(groups).reduce((a,[r,b])=>a+round(b*num(r)/100),0));return {ht,tax,ttc:round(ht+tax)}}
 function drawRows(){const box=$('v229-lines');box.innerHTML=rows.map((l,i)=>`<tr data-row="${i}" class="${i===recentlyAdded?'v233-new-line':''}"><td><input aria-label="Produit" data-field="name" value="${esc(l.name)}"></td><td><input aria-label="Quantité" data-field="quantity" type="number" min="0.001" step="any" value="${l.quantity||''}"></td><td><select data-field="unit">${unitOptions(l.unit)}</select></td><td><input aria-label="Prix unitaire HT" data-field="unitPriceHT" type="number" min="0" step="0.001" value="${l.unitPriceHT??''}"></td><td><input aria-label="TVA en pourcentage" data-field="taxRate" type="number" min="0" step="0.1" value="${l.taxRate??''}"></td><td data-total="${i}">${money(round(l.quantity*l.unitPriceHT))}</td><td><select data-field="inventoryItemId">${inventoryChoices(l)}</select></td><td><button type="button" data-del="${i}" title="Supprimer">×</button></td></tr>`).join('');refreshTotals();const count=$('v233-line-count');if(count)count.textContent=rows.length+' ligne'+(rows.length>1?'s':'')+' de facture';}
 function refreshTotals(){const x=calculations();for(let i=0;i<rows.length;i++){const e=$('v229-lines')?.querySelector(`[data-total="${i}"]`);if(e)e.textContent=money(round(rows[i].quantity*rows[i].unitPriceHT));}$('v229-totals').innerHTML=`<span>HT : ${money(x.ht)}</span><span>TVA : ${money(x.tax)}</span><span>TTC : ${money(x.ttc)}</span>`;}
 function skeleton(){if($('v229-backdrop'))return;const wrap=document.createElement('div');wrap.id='v229-backdrop';wrap.innerHTML=`<section id="v229-panel" role="dialog" aria-modal="true" aria-label="Factures fournisseurs"><header class="v229-header"><div><h2>📸 Factures fournisseurs — iCHEF IA</h2><p>Photographier → contrôler → rapprocher le BL → synchroniser les modules</p></div><button type="button" id="v229-close">✕ Fermer</button></header><div class="v229-body"><div class="v229-steps"><span>1. Photo</span><span>2. Lecture IA</span><span>3. Vérification</span><span>4. Validation</span><span id="v233-line-count" class="v233-line-count">0 ligne de facture</span></div><div class="v229-actions"><label>Photo de facture (JPG / PNG / WebP)<input id="v229-file" type="file" accept="image/jpeg,image/png,image/webp" capture="environment"></label><button type="button" class="primary" id="v229-scan">📷 Analyser la facture</button><button type="button" id="v229-new-line">＋ Ajouter une ligne</button></div><div class="v233-feedback" id="v233-feedback" role="status" aria-live="polite">Choisissez une photo pour lancer la reconnaissance, ou ajoutez une ligne pour saisir manuellement.</div><div class="v229-grid"><label>FOURNISSEUR<select id="v229-supplier"></select></label><label>N° FACTURE<input id="v229-number" placeholder="FAC-2026-001"></label><label>DATE<input id="v229-date" type="date"></label><label>DEVISE<select id="v229-currency"><option value="CHF">CHF</option><option value="EUR">EUR</option></select></label></div><label>RAPPROCHEMENT DU BON DE LIVRAISON<select id="v229-order"></select></label><div class="v229-tablebox"><table><thead><tr><th>Produit</th><th>Quantité</th><th>Unité</th><th>Prix unitaire HT</th><th>TVA %</th><th>Total ligne HT</th><th>Article réceptionné</th><th></th></tr></thead><tbody id="v229-lines"></tbody></table></div><div id="v229-totals" class="v229-totals"></div><div class="v229-note">Le BL validé est la seule entrée de stock. Cette facture met à jour les prix d'achat des articles liés et le food cost, sans ajouter de quantités. Les lignes non rapprochées restent dans le journal facture. L'export comptable reste à contrôler.</div><div class="v229-actions"><button type="button" id="v229-history">Historique</button><button type="button" id="v229-validate" class="primary">✓ Vérifier et valider la facture</button></div><div id="v229-status" class="v229-status">Préparation de la facture…</div><div class="v229-mini">Reconnaissance automatique indicative. Confirmation obligatoire par un responsable. Photo analysée mais non enregistrée par V229.</div></div></section>`;document.body.appendChild(wrap);
 $('v229-close').onclick=()=>{wrap.classList.remove('open')};wrap.addEventListener('click',e=>{if(e.target===wrap)wrap.classList.remove('open')});
 $('v229-order').onchange=()=>{readRows();rows.forEach(r=>r.inventoryItemId='');drawRows()};
 $('v229-supplier').onchange=()=>{const p=$('v229-order').value;$('v229-order').innerHTML=orderOptions();if(context.orders.some(x=>x.id===p&&x.supplierId===$('v229-supplier').value))$('v229-order').value=p;readRows();rows.forEach(r=>r.inventoryItemId='');drawRows()};
 $('v229-lines').addEventListener('input',e=>{if(e.target.closest('tr')){readRows();refreshTotals()}});
 $('v229-lines').addEventListener('change',e=>{if(e.target.matches('[data-field="unit"]')){readRows();rows.forEach(r=>r.inventoryItemId='');drawRows()}else{readRows();refreshTotals()}});
 $('v229-lines').onclick=e=>{const b=e.target.closest('[data-del]');if(!b)return;readRows();rows.splice(Number(b.dataset.del),1);drawRows()};
 $('v229-new-line').onclick=()=>{
   readRows();rows.push({name:'',quantity:1,unit:'kg',unitPriceHT:0,taxRate:0,inventoryItemId:''});
   recentlyAdded=rows.length-1;drawRows();
   status('✓ Ligne '+rows.length+' ajoutée. Saisissez le nom du produit, la quantité, l’unité, le prix HT et le taux de TVA.','good');
   focusNewLine();
 };
 $('v229-file').addEventListener('change',()=>{
   const file=$('v229-file').files?.[0];$('v229-file').classList.remove('v233-attention');
   if(file)status('Photo sélectionnée : '+file.name+'. Cliquez sur « Analyser la facture » pour lancer la lecture IA.','good');
 });
 $('v229-scan').onclick=scan;
 $('v229-validate').onclick=validate;
 $('v229-history').onclick=history;
 }
 async function open(){skeleton();$('v229-backdrop').classList.add('open');status('Chargement des fournisseurs et commandes…','working');try{const d=await request('/api/ops/supplier-invoices/context');context=d;$('v229-supplier').innerHTML='<option value="">Choisir le fournisseur</option>'+context.suppliers.map(s=>`<option value="${esc(s.id)}">${esc(s.name)}</option>`).join('');$('v229-order').innerHTML=orderOptions();if(!rows.length)rows=[{name:'',quantity:1,unit:'kg',unitPriceHT:0,taxRate:0,inventoryItemId:''}];recentlyAdded=-1;drawRows();$('v229-validate').disabled=!d.canValidate;status(d.canValidate?'Prêt. Vérifiez le fournisseur, les unités, les taux et chaque montant avant validation.':'Lecture autorisée : la validation nécessite un responsable des achats.')}catch(e){status('Contexte factures indisponible : '+e.message+'. Vous pouvez préparer les lignes, mais la validation nécessite une session responsable et une connexion serveur.','error')}}
 function imageData(file){return new Promise((resolve,reject)=>{const img=new Image(),u=URL.createObjectURL(file);img.onload=()=>{const scale=Math.min(1,2000/Math.max(img.width,img.height)),cv=document.createElement('canvas');cv.width=Math.max(1,Math.round(img.width*scale));cv.height=Math.max(1,Math.round(img.height*scale));cv.getContext('2d').drawImage(img,0,0,cv.width,cv.height);URL.revokeObjectURL(u);const src=cv.toDataURL('image/jpeg',.80);resolve({imageBase64:src.split(',')[1],mimeType:'image/jpeg'})};img.onerror=()=>{URL.revokeObjectURL(u);reject(Error('Photo impossible à lire.'))};img.src=u})}
 async function scan(){
   const fileInput=$('v229-file'),f=fileInput?.files?.[0];
   if(!f){fileInput?.classList.add('v233-attention');status('📷 Choisissez d’abord une photo de facture (JPG, PNG ou WebP) à gauche, puis cliquez sur « Analyser la facture ».','error');return}
   fileInput?.classList.remove('v233-attention');
   if(!/^image\/(jpeg|png|webp)$/.test(f.type)){status('Format non accepté : utilisez JPG, PNG ou WebP.','error');return}
   if(f.size>15_000_000){status('Photo trop volumineuse. Essayez une photo plus petite.','error');return}
   try{status('Lecture de « '+f.name+' » : reconnaissance IA en cours…','working');$('v229-scan').disabled=true;const data=await imageData(f),d=await request('/api/ops/supplier-invoices/scan','POST',data),p=d.draft||{};$('v229-number').value=p.numero||'';$('v229-date').value=/^\d{4}-\d{2}-\d{2}$/.test(p.date)?p.date:'';$('v229-currency').value=['CHF','EUR'].includes(p.devise)?p.devise:'CHF';const s=context.suppliers.find(s=>normal(s.name)===normal(p.fournisseur))||context.suppliers.find(s=>normal(s.name).includes(normal(p.fournisseur))&&normal(p.fournisseur).length>3);if(s){$('v229-supplier').value=s.id;$('v229-order').innerHTML=orderOptions()}recentlyAdded=-1;rows=(p.articles||[]).map(l=>({name:l.nom,quantity:Number.isFinite(l.quantite)?l.quantite:'',unit:l.unite||'u',unitPriceHT:Number.isFinite(l.prixUnitaire)?l.prixUnitaire:'',taxRate:Number.isFinite(l.tvaTaux)?l.tvaTaux:'',inventoryItemId:''}));if(!rows.length)rows=[{name:'',quantity:1,unit:'kg',unitPriceHT:0,taxRate:0,inventoryItemId:''}];drawRows();const x=calculations();status(`IA terminée. Fournisseur lu : ${p.fournisseur||'non reconnu'}. HT détecté : ${money(p.totalHT)}, HT calculé : ${money(x.ht)}.\nContrôlez TOUTES les lignes, les éventuels taux de TVA manquants, puis choisissez le BL.`, 'good')}catch(e){status('Analyse non effectuée : '+e.message+'. Vérifiez votre connexion et votre autorisation, ou renseignez les lignes manuellement.','error')}finally{$('v229-scan').disabled=false}}
 async function validate(){if(busy)return;readRows();const x=calculations();if(rows.some(r=>r.taxRate===''||r.unitPriceHT===''||r.quantity===''))return status('Vérifiez et renseignez toutes les quantités, les prix HT et les taux de TVA manquants (0 uniquement si la facture indique vraiment 0 %).','error');const invoice={supplierId:$('v229-supplier').value,number:$('v229-number').value.trim(),date:$('v229-date').value,currency:$('v229-currency').value,orderId:$('v229-order').value,lines:rows.map(r=>({...r,lineTotalHT:round(r.quantity*r.unitPriceHT)})),totalHT:x.ht,totalTax:x.tax,totalTTC:x.ttc};if(!invoice.supplierId||!invoice.number||!invoice.date)return status('Fournisseur, numéro et date obligatoires.','error');if(!confirm(`Confirmer la facture ${invoice.number} ?\nTotal TTC : ${money(x.ttc)} ${invoice.currency}\nAucune entrée de stock ne sera créée par la facture.`))return;try{busy=true;$('v229-validate').disabled=true;status('Vérification des droits, des montants et synchronisation…');const d=await request('/api/ops/supplier-invoices/validate','POST',invoice);status(`✓ Facture enregistrée. ID : ${d.id}\nCommande liée : ${d.orderLinked?'oui':'non'}\nArticles dont le prix a été synchronisé : ${d.priceLinkedCount||0}\nStock ajouté par facture : AUCUN.\nComptabilité : écriture prête à vérifier et exporter.`, 'good')}catch(e){status(e.message,'error')}finally{busy=false;$('v229-validate').disabled=!context.canValidate}}
 async function history(){try{status('Chargement des factures…');const d=await request('/api/ops/supplier-invoices');status((d.invoices||[]).slice(0,12).map(x=>`${x.date} · ${x.supplierName} · ${x.number} · ${money(x.ttc)} ${x.currency} · ${x.status}`).join('\n')||'Aucune facture enregistrée.')}catch(e){status(e.message,'error')}}
 function install(){let b=$('v229-open');if(!b){b=document.createElement('button');b.id='v229-open';b.type='button';b.textContent='📸 FACTURES IA';b.onclick=open;const nav=document.querySelector('.nav-haccp');const after=$('hv7-desktop-reception');if(nav&&after){after.insertAdjacentElement('afterend',b);b.className='nav-btn'}else if(nav){nav.appendChild(b);b.className='nav-btn'}else document.body.appendChild(b)}const side=$('hv225-sidebar');if(side&&!$('v229-side')){const s=document.createElement('button');s.id='v229-side';s.type='button';s.innerHTML='<i>▤</i>Factures IA';s.onclick=open;const ref=side.querySelector('[data-hv225-action="reception"]');if(ref)ref.insertAdjacentElement('afterend',s);else side.appendChild(s)}if(document.body.classList.contains('haccp-v223-staff')){b.hidden=true;const adminButton=$('v229-side');if(adminButton)adminButton.hidden=true;if(!b.dataset.permissionCheck){b.dataset.permissionCheck='1';request('/api/ops/supplier-invoices/context').then(data=>{if(data.canValidate||data.suppliers){b.hidden=false;if(adminButton)adminButton.hidden=false}}).catch(()=>{})}}}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,500));else setTimeout(install,500);
 setTimeout(install,1700);
 window.iCHEF229OpenInvoices=open;
})();
</script>

<!-- iCHEF V230 : finition et centrage des vues sur ordinateur. Aucun changement métier ni de permissions. -->
<style id="ichef-haccp-v230-centering-desktop">
@media (min-width:1101px){
 /* Espace de travail centré dans la zone disponible, sans réduire la navigation gauche. */
 body.hv225-ready>.content{
   padding:26px clamp(18px,2.6vw,44px) 70px!important;
   overflow-x:hidden!important;
   scrollbar-gutter:stable;
 }
 body.hv225-ready #mod-temp.active,
 body.hv225-ready #haccp-desktop-temp-hub,
 body.hv225-ready #mod-trace.active>.htrace-desktop{
   width:100%!important;
   max-width:1480px!important;
   margin-left:auto!important;
   margin-right:auto!important;
   box-sizing:border-box!important;
   min-width:0!important;
 }
 /* Entête et actions température alignés, même si la fenêtre rétrécit. */
 body.hv225-ready #haccp-desktop-temp-hub .hd-temp-head{
   display:flex!important;flex-wrap:wrap!important;gap:16px 24px!important;
   justify-content:space-between!important;align-items:center!important;
   padding:6px 0 18px!important;
 }
 body.hv225-ready #haccp-desktop-temp-hub .hd-temp-head>div:first-child{
   flex:1 1 330px!important;min-width:0!important;
 }
 body.hv225-ready #haccp-desktop-temp-hub .hd-temp-head-actions{
   display:flex!important;flex-wrap:wrap!important;gap:10px!important;
   align-items:center!important;justify-content:flex-end!important;
   max-width:100%!important;
 }
 body.hv225-ready #haccp-desktop-temp-hub .hd-temp-head-actions>button{
   white-space:nowrap!important;
 }
 body.hv225-ready #hv225-sector-control{flex-wrap:wrap!important}
 /* Indicateurs de même taille et textes réellement alignés. */
 body.hv225-ready .hd-kpis{
   display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;
   gap:16px!important;margin:0 0 20px!important;
 }
 body.hv225-ready .hd-kpi{
   min-width:0!important;min-height:118px!important;align-content:center!important;
   grid-template-rows:1fr auto auto 1fr!important;
   padding:16px!important;
 }
 /* Colonne des filtres et table bien proportionnées. */
 body.hv225-ready #hv225-workgrid{
   width:100%!important;grid-template-columns:minmax(235px,286px) minmax(0,1fr)!important;
   gap:18px!important;align-items:start!important;
 }
 body.hv225-ready #hv225-filter-col{min-width:0!important;gap:18px!important}
 body.hv225-ready #hv225-data{min-width:0!important;padding:20px!important;}
 body.hv225-ready .hv225-data-head{min-height:46px!important;gap:14px!important;margin-bottom:16px!important}
 body.hv225-ready .hv225-data-head h2{line-height:1.3!important}
 body.hv225-ready .hv225-actions{align-items:center!important;justify-content:flex-end!important;gap:8px!important}
 body.hv225-ready .hv225-actions button{
   display:inline-flex!important;align-items:center!important;justify-content:center!important;
   min-height:39px!important;white-space:nowrap!important;
 }
 body.hv225-ready #hv225-table-wrap{
   width:100%!important;min-width:0!important;max-width:100%!important;
   overflow-x:auto!important;overflow-y:hidden!important;
   border:1px solid #e5eaf0!important;border-radius:10px!important;
 }
 body.hv225-ready #hv225-table{
   table-layout:fixed!important;width:100%!important;min-width:805px!important;
   border-collapse:collapse!important;
 }
 body.hv225-ready #hv225-table th:nth-child(1){width:30%!important}
 body.hv225-ready #hv225-table th:nth-child(2){width:16%!important}
 body.hv225-ready #hv225-table th:nth-child(3){width:16%!important}
 body.hv225-ready #hv225-table th:nth-child(4){width:13%!important}
 body.hv225-ready #hv225-table th:nth-child(5){width:13%!important}
 body.hv225-ready #hv225-table th:nth-child(6){width:12%!important}
 body.hv225-ready #hv225-table th,
 body.hv225-ready #hv225-table td{
   vertical-align:middle!important;padding:14px 12px!important;
   box-sizing:border-box!important;overflow-wrap:anywhere!important;
 }
 body.hv225-ready #hv225-table th:nth-child(n+4),
 body.hv225-ready #hv225-table td:nth-child(n+4){text-align:center!important}
 body.hv225-ready #hv225-table .hv225-thing{min-width:0!important;align-items:center!important}
 body.hv225-ready #hv225-table .hv225-thing>div{min-width:0!important}
 body.hv225-ready #hv225-table .eqname{display:block!important;line-height:1.35!important}
 body.hv225-ready #hv225-table .hv225-tag,
 body.hv225-ready #hv225-table .hv225-tempbadge,
 body.hv225-ready #hv225-table .hv225-status{vertical-align:middle!important}
 body.hv225-ready #hv225-table td:last-child button{
   display:inline-flex!important;align-items:center!important;justify-content:center!important;
   width:auto!important;min-width:88px!important;min-height:39px!important;
   padding:9px 12px!important;margin:0 auto!important;
   border:1px solid #ccd6e3!important;border-radius:9px!important;
   background:#fff!important;color:#14283d!important;
   box-shadow:0 1px 2px rgba(17,38,62,.06)!important;
   font-weight:800!important;font-size:11px!important;line-height:1.2!important;
   cursor:pointer!important;text-decoration:none!important;
 }
 body.hv225-ready #hv225-table td:last-child button:hover{
   border-color:#d5a23a!important;background:#fff9ea!important;
 }
 body.hv225-ready #hv225-lower{
   width:100%!important;display:grid!important;
   grid-template-columns:repeat(3,minmax(0,1fr))!important;
   gap:18px!important;margin-top:20px!important;
 }
 body.hv225-ready #hv225-lower>section{min-width:0!important}
 body.hv225-ready #hv225-lower .hv225-sectiontitle{flex-wrap:wrap!important;line-height:1.3!important}
 /* Traçabilité : 3 colonnes de largeur égale et espace homogène. */
 body.hv225-ready #mod-trace.active>.htrace-desktop{gap:18px!important}
 body.hv225-ready .htrace-desktop-head,
 body.hv225-ready .htrace-delivery-hub,
 body.hv225-ready .htrace-history{
   border:1px solid #dce3eb!important;
   border-radius:16px!important;box-shadow:0 2px 12px rgba(20,37,58,.035)!important;
   overflow:hidden!important;
 }
 body.hv225-ready .htrace-desktop-head{
   padding:20px 24px!important;align-items:center!important;
 }
 body.hv225-ready .htrace-desktop-stats{align-items:stretch!important;gap:10px!important}
 body.hv225-ready .htrace-desktop-stats>div{min-width:120px!important;padding:12px 15px!important}
 body.hv225-ready .htrace-delivery-head{
   padding:18px 22px!important;align-items:center!important;gap:16px!important;
 }
 body.hv225-ready .htrace-delivery-head-actions{
   display:flex!important;align-items:center!important;justify-content:flex-end!important;
   flex-wrap:wrap!important;gap:10px!important;
 }
 body.hv225-ready .htrace-desktop-grid{
   display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;
   gap:18px!important;align-items:stretch!important;
 }
 body.hv225-ready .htrace-step{
   min-width:0!important;padding:22px!important;border:1px solid #dce3eb!important;
   border-radius:16px!important;box-shadow:0 2px 12px rgba(20,37,58,.035)!important;
 }
 body.hv225-ready .htrace-step-title{min-height:52px!important;margin-bottom:18px!important}
 body.hv225-ready .htrace-step-title strong{font-size:15px!important;line-height:1.3!important}
 body.hv225-ready .htrace-step-title span{font-size:12px!important;line-height:1.4!important}
 body.hv225-ready .htrace-desktop-scan{min-height:185px!important}
 body.hv225-ready .htrace-desktop-grid input,
 body.hv225-ready .htrace-desktop-grid select{
   max-width:100%!important;min-width:0!important;box-sizing:border-box!important;
 }
 /* Formulaire 'Produit préparé' : centré et moins étroit sur desktop. */
 #hv71-prepared .hv71-shell{
   width:min(100% - 56px,1020px)!important;max-width:1020px!important;
   margin-inline:auto!important;padding:26px 10px 40px!important;
 }
 #hv71-prepared .hv71-card{padding:25px!important;border-radius:18px!important}
 #hv71-prepared .hv71-grid{gap:16px 18px!important}
 #hv71-prepared .hv71-head{gap:14px!important;margin-bottom:20px!important}
 #hv71-prepared .hv71-field>span{font-size:12px!important}
 #hv71-prepared .hv71-field input,
 #hv71-prepared .hv71-field select{min-height:52px!important}
 #hv71-prepared .hv71-help{line-height:1.5!important}
 /* Numéro de version : ne doit plus recouvrir les cellules en bas à droite. */
 #ichef-haccp-v41-build{display:none!important}
}
@media (min-width:1101px) and (max-width:1480px){
 body.hv225-ready #hv225-workgrid{
   grid-template-columns:minmax(218px,252px) minmax(0,1fr)!important;
 }
 body.hv225-ready .hd-kpis{gap:12px!important}
 body.hv225-ready .hd-kpi{grid-template-columns:51px 1fr!important;column-gap:10px!important;padding:12px!important}
 body.hv225-ready .hd-kpi:before{width:46px!important;height:46px!important}
 body.hv225-ready #hv225-lower{grid-template-columns:repeat(2,minmax(0,1fr))!important}
 body.hv225-ready #hv225-lower>section:last-child{grid-column:1/-1!important}
 body.hv225-ready .htrace-desktop-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}
 body.hv225-ready .htrace-step-scan{grid-row:auto!important}
 body.hv225-ready .htrace-step:last-child{grid-column:1 / -1!important}
}
@media(min-width:1101px) and (max-width:1240px){
 body.hv225-ready .hd-kpis{grid-template-columns:repeat(2,minmax(0,1fr))!important}
 body.hv225-ready #hv225-workgrid{grid-template-columns:1fr!important}
 body.hv225-ready #hv225-filter-col{display:grid!important;grid-template-columns:1fr 1fr!important;align-items:start!important}
 body.hv225-ready .htrace-desktop-stats{width:100%!important}
 body.hv225-ready .htrace-desktop-stats>div{min-width:0!important}
}
</style>
<!-- iCHEF HACCP V231 — CORRECTIF DE DÉFILEMENT ORDINATEUR : bas de page entièrement accessible. CSS seul. -->
<style id="ichef-haccp-v231-scroll-desktop">
@media (min-width:1101px){
  /* V230 : .module héritait de height:100% ; son enfant dépassait sans
     agrandir le scrollHeight de .content. Le bas du tableau paraissait coupé. */
  body.hv225-ready > .content > .module.active,
  body.hv225-ready > .content > #mod-temp.active {
    height:auto!important;
    min-height:0!important;
    max-height:none!important;
    overflow:visible!important;
  }
  body.hv225-ready #haccp-desktop-temp-hub {
    height:auto!important;
    min-height:0!important;
    max-height:none!important;
    overflow:visible!important;
  }
  /* La zone principale reste la seule zone de défilement ; on garde de
     l'espace sous la dernière ligne, au-dessus de la barre des tâches. */
  body.hv225-ready > .content {
    overflow-y:auto!important;
    overflow-x:hidden!important;
    min-height:0!important;
    padding-bottom:105px!important;
    overscroll-behavior-y:contain;
    scrollbar-gutter:stable;
  }
  body.hv225-ready #hv225-workgrid,
  body.hv225-ready #hv225-lower {
    height:auto!important;
    max-height:none!important;
  }
  body.hv225-ready #hv225-data {
    height:auto!important;
    max-height:none!important;
    overflow:visible!important;
  }
  body.hv225-ready #hv225-table-wrap {
    max-width:100%!important;
    overflow-x:auto!important;
  }
  body.hv225-ready #hv225-table td:last-child {
    padding-right:18px!important;
    text-align:center!important;
  }
  body.hv225-ready #hv225-table td:last-child button {
    max-width:100%!important;
  }
}
@media (min-width:1101px) and (max-height:920px){
  /* Gain modéré d'espace sur les écrans d'ordinateur 768–900 px de haut. */
  body.hv225-ready > .content {
    padding-top:16px!important;
  }
  body.hv225-ready #haccp-desktop-temp-hub .hd-temp-head {
    padding-bottom:12px!important;
  }
  body.hv225-ready .hd-kpis {
    margin-bottom:14px!important;
  }
  body.hv225-ready .hd-kpi {
    min-height:98px!important;
    padding:12px!important;
  }
  body.hv225-ready #hv225-table th,
  body.hv225-ready #hv225-table td {
    padding-top:11px!important;
    padding-bottom:11px!important;
  }
}
</style>

<style id="iCHEF-HACCP-V232-INSPECTION-CSS">
/* iCHEF HACCP V232 — Espace inspecteur ordinateur (aucun changement mobile) */
@media(min-width:1101px){
  #h232-entry{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:16px 20px;margin:0 0 18px;border:1px solid #e1bd66;border-radius:14px;background:linear-gradient(105deg,#fff8ea,#fff)}
  #h232-entry>div{display:flex;flex-direction:column;gap:4px}
  #h232-entry strong{font-size:16px;color:#172033}
  #h232-entry span{font-size:13px;color:#657083}
}
@media(max-width:1100px){#h232-entry{display:none!important}}
.h232-primary,.h232-outline{cursor:pointer;border-radius:10px;padding:12px 16px;min-height:44px;font-size:13px;font-weight:800;white-space:normal}
.h232-primary{border:1px solid #ce9733;background:#f7c657;color:#171b21}
.h232-primary:hover{background:#ffe09b}
.h232-outline{background:#fff;border:1px solid #c8d1dd;color:#263447}
.h232-primary:disabled,.h232-outline:disabled{opacity:.5;cursor:wait}
#h232-dialog[hidden]{display:none!important}
#h232-dialog{position:fixed;inset:0;z-index:100500;display:flex;align-items:flex-start;justify-content:center;overflow:auto;padding:30px 18px;background:rgba(10,17,29,.72);color:#1d2939}
#h232-dialog .h232-sheet{width:min(1220px,100%);background:#f7f9fc;border-radius:18px;padding:28px;box-shadow:0 24px 85px #0005;margin:auto;min-width:0}
#h232-dialog .h232-head{display:flex;align-items:flex-start;justify-content:space-between;gap:15px;margin-bottom:24px}
#h232-dialog .h232-head h2{font-size:26px;margin:4px 0 5px;color:#142135}
#h232-dialog .h232-head p{font-size:14px;margin:0;color:#66758a}
#h232-dialog .h232-overline{font-size:11px;letter-spacing:1px;color:#956b23;font-weight:900}
#h232-dialog .h232-controls{display:grid;grid-template-columns:1fr 1fr 1.35fr auto;gap:12px;align-items:end;background:white;border:1px solid #dce4ee;border-radius:14px;padding:16px}
#h232-dialog .h232-controls label{display:flex;flex-direction:column;gap:7px;font-size:12px;font-weight:850;color:#4a5569}
#h232-dialog .h232-controls input,#h232-dialog .h232-controls select{width:100%;min-width:0;box-sizing:border-box;min-height:44px;padding:10px 12px;font-size:14px;color:#172033;background:#fff;border:1px solid #bcc9d8;border-radius:9px}
#h232-dialog .h232-status{margin:12px 0;padding:12px;border:1px solid #cbe4d5;border-radius:9px;background:#eefaf3;font-size:13px;color:#17603a}
#h232-dialog .h232-status.bad{background:#fff1f0;color:#a42621;border-color:#f1c1b9}
#h232-dialog .h232-synopsis{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin:16px 0}
#h232-dialog .h232-synopsis>div{background:white;border:1px solid #dce4ee;border-radius:12px;display:flex;flex-direction:column;gap:5px;padding:16px;min-width:0}
#h232-dialog .h232-synopsis b{font-size:20px;color:#1b2b45;overflow-wrap:anywhere}
#h232-dialog .h232-synopsis span{font-size:12px;color:#617084}
#h232-dialog .h232-actions{display:flex;flex-wrap:wrap;gap:10px;margin:14px 0 18px}
#h232-dialog .h232-flags{padding:10px 15px;background:#fffaf0;border:1px solid #f0dfbe;border-radius:12px;color:#725625;font-size:12px;margin:12px 0}
#h232-dialog .h232-flags p{margin:5px 0}
#h232-dialog .h232-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
#h232-dialog .h232-card{min-width:0;background:white;border:1px solid #d8e0eb;border-radius:12px;overflow:hidden}
#h232-dialog .h232-card summary{cursor:pointer;display:flex;align-items:center;justify-content:space-between;padding:17px;gap:8px;font-weight:850;color:#17243b;list-style:none}
#h232-dialog .h232-card summary strong{background:#e7f2ff;color:#2365a4;padding:6px 10px;border-radius:9px}
#h232-dialog .h232-table{overflow-x:auto;padding:0 14px 14px}
#h232-dialog .h232-table table{width:100%;min-width:0;border-collapse:collapse;font-size:12px;color:#263447}
#h232-dialog .h232-table th,#h232-dialog .h232-table td{padding:9px 7px;text-align:left;border-bottom:1px solid #e8edf3;white-space:normal;overflow-wrap:anywhere}
#h232-dialog .h232-table th{background:#f5f7fa;color:#526176}
#h232-dialog .h232-table small{color:#657083}
#h232-dialog .h232-note{font-size:12px;color:#66758a;line-height:1.5;margin-top:18px}
@media(max-width:920px){#h232-dialog .h232-controls{grid-template-columns:1fr 1fr}#h232-dialog .h232-grid{grid-template-columns:1fr}#h232-dialog .h232-sheet{padding:18px}}
@media(max-width:600px){#h232-dialog{padding:10px}#h232-dialog .h232-head{flex-direction:column}#h232-dialog .h232-controls{grid-template-columns:1fr}#h232-dialog .h232-synopsis{grid-template-columns:1fr}}
@media print{#h232-dialog{display:none!important}}

</style>
<script id="iCHEF-HACCP-V232-INSPECTION-JS">
/* iCHEF V232 — Dossier sanitaire inspecteur (interface ordinateur, lecture seule)
   Jamais de preuve issue du cache : uniquement l'API authentifiee du serveur. */
(()=>{
  'use strict';
  if(window.ICHEF_HACCP_INSPECTION_V232)return;
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const labels={temperatures:'Relevés de températures',nettoyage:'Nettoyage et désinfection',tracabilite:'Traçabilité et étiquettes DLC',receptions_haccp:'Réceptions HACCP et justificatifs BL',inventaires_haccp:'Comptages / audits HACCP',bons_livraison:'Bons de livraison réceptionnés',referentiel_haccp:'Référentiel actuel : équipements et zones'};
  const idKeys=['id','recordId','orderId','labelId','invoiceId'];
  let dossier=null,dialog=null;
  const dateToday=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
  const monthAgo=()=>{const d=new Date();d.setDate(d.getDate()-30);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
  function desktop(){return window.matchMedia('(min-width:1101px)').matches && !document.body.classList.contains('haccp-v223-staff')}
  function status(msg,isError=false){const el=$('h232-status');if(el){el.textContent=msg;el.classList.toggle('bad',!!isError)}}
  function modal(){
    if(dialog)return dialog;
    dialog=document.createElement('div');dialog.id='h232-dialog';dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-label','Préparer un contrôle sanitaire');
    dialog.hidden=true;
    dialog.innerHTML=`<div class="h232-sheet">
      <div class="h232-head"><div><span class="h232-overline">iCHEF HACCP · ESPACE RESPONSABLE</span><h2>📋 Dossier de contrôle sanitaire</h2><p>Consultez et exportez les preuves disponibles, sans aucune modification.</p></div><button id="h232-close" type="button" class="h232-outline" aria-label="Fermer le dossier">✕ Fermer</button></div>
      <div class="h232-controls"><label>Du <input id="h232-from" type="date" value="${monthAgo()}"></label><label>Au <input id="h232-to" type="date" value="${dateToday()}"></label><label>Secteur <select id="h232-sector"><option value="ALL">Tous les secteurs autorisés</option><option value="CUISINE">Cuisine</option><option value="PATISSERIE">Pâtisserie</option><option value="BAR">Bar</option><option value="SERVICE">Service</option></select></label><button id="h232-generate" type="button" class="h232-primary">Préparer le dossier</button></div>
      <div id="h232-status" class="h232-status" role="status">Choisissez une période et préparez votre dossier. Les données proviennent du serveur.</div>
      <section id="h232-results" hidden><div class="h232-synopsis"><div><b id="h232-records">0</b><span>preuves dans la période</span></div><div><b id="h232-sectors">–</b><span>secteurs autorisés</span></div><div><b id="h232-exported">–</b><span>extraction serveur</span></div></div>
        <div class="h232-actions"><button type="button" id="h232-print" class="h232-primary">🖨 Imprimer / Enregistrer en PDF</button><button type="button" id="h232-zip" class="h232-primary">📦 Télécharger le dossier ZIP</button><button type="button" id="h232-json" class="h232-outline">⬇ JSON brut</button></div>
        <div id="h232-flags" class="h232-flags"></div><div class="h232-grid" id="h232-grid"></div>
        <p class="h232-note">Lecture seule. Aucune preuve n'est créée si un contrôle manque. Les photographies déjà purgées ne peuvent pas être reconstituées. Pour un accès inspecteur à distance, une autorisation temporaire dédiée reste à développer.</p>
      </section>
    </div>`;
    document.body.appendChild(dialog);
    $('h232-close').addEventListener('click',close);
    dialog.addEventListener('click',e=>{if(e.target===dialog)close()});
    $('h232-generate').addEventListener('click',generate);
    $('h232-json').addEventListener('click',()=>{if(dossier)downloadBlob('iCHEF_HACCP_INSPECTION_'+dossier.meta.from+'_'+dossier.meta.to+'.json',new Blob([JSON.stringify(dossier,null,2)],{type:'application/json;charset=utf-8'}))});
    $('h232-zip').addEventListener('click',downloadZip);
    $('h232-print').addEventListener('click',printDossier);
    return dialog;
  }
  function open(){if(!desktop()){alert('Le dossier inspecteur est réservé au mode ordinateur et à un responsable authentifié.');return}modal();dialog.hidden=false;$('h232-from').focus()}
  function close(){if(dialog)dialog.hidden=true}
  async function generate(){
    dossier=null;
    $('h232-results').hidden=true;
    const btn=$('h232-generate'),from=$('h232-from').value,to=$('h232-to').value,sector=$('h232-sector').value;
    if(!from||!to||from>to){status('Sélectionnez une période valide.',true);return}
    const tenant=String(window.ICHEF_HACCP?.tenantID||'');
    if(!tenant||!window.ICHEF_HACCP?.authenticated){status('Connectez-vous avec un compte responsable autorisé.',true);return}
    btn.disabled=true;status('Récupération des preuves originales sur iCHEF OS…');
    try{
      const qs=new URLSearchParams({tenantID:tenant,from,to,sector});
      const endpoint=(typeof SERVER_URL==='string'?SERVER_URL:'https://tableau-system.onrender.com')+'/api/haccp/inspection/dossier?'+qs;
      const headers=(typeof systemHeaders==='function'?systemHeaders():{'Accept':'application/json'});
      const ctrl=new AbortController(),timeout=setTimeout(()=>ctrl.abort(),45000);
      let r;
      try{r=await fetch(endpoint,{method:'GET',headers,cache:'no-store',credentials:'omit',signal:ctrl.signal})}finally{clearTimeout(timeout)}
      const data=await r.json().catch(()=>({}));
      if(!r.ok||data.success!==true)throw new Error(data.error||`Erreur serveur (${r.status})`);
      dossier=data;
      render(data);status('✓ Dossier chargé depuis le serveur en lecture seule. Vérifiez les sources manquantes avant diffusion.');
    }catch(e){status(e.name==='AbortError'?'Le serveur met trop longtemps à répondre. Réduisez la période.':(e.message||'Dossier non disponible.'),true)}
    finally{btn.disabled=false}
  }
  function formatDate(s){try{return new Date(s).toLocaleString('fr-FR')}catch(_){return String(s||'–')}}
  function rowTitle(r,label){return String(r?.eq||r?.zone||r?.name||r?.productName||r?.supplierName||r?.orderId||r?.itemName||r?.id||labels[label]||'Contrôle')}
  function render(data){
    const sections=data.sections||{}, meta=data.meta||{};
    const counts=Object.entries(sections);
    $('h232-records').textContent=counts.reduce((n,[,v])=>n+(Array.isArray(v)?v.length:0),0).toLocaleString('fr-FR');
    $('h232-sectors').textContent=(meta.sectors||[]).join(', ')||'—';
    $('h232-exported').textContent=formatDate(meta.generatedAt);
    const issues=[];
    (meta.missingSources||[]).forEach(x=>issues.push('Source absente : '+x));
    Object.entries(meta.undatedNotExported||{}).filter(([,n])=>n>0).forEach(([key,n])=>issues.push(`${n} enregistrement(s) ${labels[key]||key} sans date utilisable, non inclus`));
    if(!issues.length)issues.push('Aucune source absente détectée parmi les modules raccordés. Cela ne garantit pas que tous les contrôles obligatoires ont été effectués.');
    $('h232-flags').innerHTML=issues.map(t=>`<p>⚠ ${esc(t)}</p>`).join('');
    $('h232-grid').innerHTML=counts.map(([key,rows])=>{
      const count=Array.isArray(rows)?rows.length:0;
      const details=count?rows.slice(0,20).map(x=>`<tr><td>${esc(ichef232RowDate(x))}</td><td>${esc(rowTitle(x,key))}</td><td>${esc(x.status||x.val||x.dlc||x.receivedByName||'–')}</td></tr>`).join(''):'<tr><td colspan="3">Aucune preuve pour cette période</td></tr>';
      return `<details class="h232-card"><summary><span>${esc(labels[key]||key)}</span><strong>${count}</strong></summary><div class="h232-table"><table><thead><tr><th>Date</th><th>Élément</th><th>Résultat</th></tr></thead><tbody>${details}</tbody></table>${count>20?`<small>20 premières lignes affichées ; l'export contient les ${count} lignes.</small>`:''}</div></details>`;
    }).join('');
    $('h232-results').hidden=false;
  }
  function ichef232RowDate(r){return String(r?.timestamp||r?.receivedAt||r?.date||r?.createdAt||r?.capturedAt||'–')}
  function downloadBlob(filename,blob){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),20000)}
  function csvCell(v){let s=typeof v==='string'?v:(v===null||v===undefined?'':String(v));if(/^[\s]*[=+\-@\t\r]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"'}
  function sectionCsv(key,rows){const columns=['date','secteur','element','statut','valeur','identifiant','audit','details_JSON'];const lines=[columns.join(';')];
    for(const r of rows){const vals=[ichef232RowDate(r),r.dept||r.sectorKey||r.sectorLabel||'',rowTitle(r,key),r.status||'',r.val??r.temperature??'',idKeys.map(k=>r[k]).find(Boolean)||'',r.audit||r.user||r.receivedByName||'',JSON.stringify(r)];lines.push(vals.map(csvCell).join(';'))}return '\ufeff'+lines.join('\r\n')+'\r\n'}
  // Prepare les pieces jointes existantes dans le ZIP, jamais les donnees effacees.
  function prepareFiles(d){
    const photos=[], warnings=[], sectionCopies={};
    for(const [type,rows] of Object.entries(d.sections||{})){
      sectionCopies[type]=rows.map((row,i)=>{
        const clone=JSON.parse(JSON.stringify(row));
        function scan(obj,prefix='',depth=0){
          if(!obj||typeof obj!=='object'||depth>7)return;
          for(const [k,v] of Object.entries(obj)){
            if(typeof v==='string'&&/^data:image\/(png|jpeg|webp);base64,/i.test(v)){
              const match=/^data:image\/(png|jpeg|webp);base64,(.+)$/i.exec(v);
              if(!match)continue;
              const ext=match[1].toLowerCase()==='jpeg'?'jpg':match[1].toLowerCase();
              const path=`preuves/${type}/preuve_${String(i+1).padStart(5,'0')}_${(prefix+k).replace(/[^a-z0-9_-]/gi,'_')}.${ext}`;
              try{const bin=atob(match[2]),b=new Uint8Array(bin.length);for(let j=0;j<bin.length;j++)b[j]=bin.charCodeAt(j);photos.push({name:path,data:b});obj[k]='[Photo jointe : '+path+']'}catch(_){warnings.push('Photo illisible pour '+type+' / '+(i+1))}
            }else if(typeof v==='object'&&v!==null)scan(v,prefix+k+'_',depth+1);
          }
        }
        scan(clone);return clone;
      });
    }
    return {sectionCopies,photos,warnings};
  }
  function htmlReport(d,sections){
    const m=d.meta||{},counts=Object.entries(sections).map(([k,v])=>`<li>${esc(labels[k]||k)} : <b>${v.length}</b></li>`).join('');
    const tables=Object.entries(sections).map(([k,rows])=>{
      const content=rows.map(x=>`<tr><td>${esc(ichef232RowDate(x))}</td><td>${esc(x.dept||x.sectorLabel||'—')}</td><td>${esc(rowTitle(x,k))}</td><td>${esc(x.status||x.val||x.dlc||'—')}</td><td>${esc(x.audit||x.user||x.receivedByName||'—')}</td><td>${esc(x.obs||x.note||x.receptionNote||'—')}</td></tr>`).join('');
      return `<h2>${esc(labels[k]||k)} (${rows.length})</h2><table><thead><tr><th>Date</th><th>Secteur</th><th>Élément</th><th>Résultat</th><th>Collaborateur / audit</th><th>Observation</th></tr></thead><tbody>${content||'<tr><td colspan="6">Aucune donnée retrouvée pour cette période.</td></tr>'}</tbody></table>`;
    }).join('');
    const issues=[...(m.missingSources||[]),...Object.entries(m.undatedNotExported||{}).filter(([,n])=>n>0).map(([k,n])=>`${k} : ${n} lignes sans date non exportées`)];
    return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>Dossier HACCP ${esc(m.from||'')} – ${esc(m.to||'')}</title><style>body{font:12px Arial,sans-serif;color:#111;margin:15mm}h1{font-size:24px}h2{font-size:15px;margin-top:24px;break-after:avoid}table{border-collapse:collapse;width:100%;font-size:10px;table-layout:fixed}th,td{border:1px solid #aaa;padding:6px;word-wrap:break-word;vertical-align:top}thead{display:table-header-group}tr{break-inside:avoid}small{color:#444}@page{size:A4 landscape;margin:12mm}</style></head><body><h1>iCHEF · Dossier de contrôle sanitaire</h1><p><b>Établissement :</b> ${esc(m.tenantID)} · <b>Période :</b> ${esc(m.from)} au ${esc(m.to)} · <b>Édité :</b> ${esc(formatDate(m.generatedAt))}</p><p><b>Secteurs :</b> ${esc((m.sectors||[]).join(', '))} · <b>Établi par :</b> ${esc(m.exportedBy)} · <b>Sources :</b> ${esc(m.source)}</p><p>Rapport en lecture seule ; les preuves photographiques disponibles sont jointes dans le dossier ZIP, et non dans ce rapport imprimé.</p><h2>Sommaire</h2><ul>${counts}</ul><p><b>Vigilance :</b> ${esc(issues.length?issues.join(' | '):'Aucune absence de source détectée parmi celles raccordées.')} Une absence d'enregistrement ne prouve jamais qu'un contrôle a été effectué.</p>${tables}</body></html>`;
  }
  function printDossier(){if(!dossier)return;
    const report=$('print-report');if(!report){status('Conteneur d’impression introuvable.',true);return}
    const {sectionCopies}=prepareFiles(dossier);
    // Même conteneur natif utilisé par les rapports HACCP précédents.
    const full=htmlReport(dossier,sectionCopies);
    const doc=new DOMParser().parseFromString(full,'text/html');
    const styles=doc.querySelector('style')?.outerHTML||'';
    report.innerHTML=styles+doc.body.innerHTML;
    window.print();
  }
  const crcTable=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})();
  function checksum(bytes){let c=0xffffffff;for(const b of bytes)c=crcTable[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0}
  function zipStore(files){
    const encoder=new TextEncoder(),chunks=[],central=[];let offset=0;
    const u16=(view,p,v)=>view.setUint16(p,v,true),u32=(view,p,v)=>view.setUint32(p,v>>>0,true);
    for(const f of files){const name=encoder.encode(f.name),content=typeof f.data==='string'?encoder.encode(f.data):f.data;
      if(name.length>65535||content.length>0xFFFFFFFF)throw new Error('Fichier ZIP trop grand.');
      const crc=checksum(content),local=new Uint8Array(30+name.length),v=new DataView(local.buffer);
      u32(v,0,0x04034b50);u16(v,4,20);u16(v,6,0x0800);u16(v,8,0);u32(v,14,crc);u32(v,18,content.length);u32(v,22,content.length);u16(v,26,name.length);local.set(name,30);
      chunks.push(local,content);
      const dir=new Uint8Array(46+name.length),dv=new DataView(dir.buffer);
      u32(dv,0,0x02014b50);u16(dv,4,20);u16(dv,6,20);u16(dv,8,0x0800);u16(dv,10,0);u32(dv,16,crc);u32(dv,20,content.length);u32(dv,24,content.length);u16(dv,28,name.length);u32(dv,42,offset);dir.set(name,46);central.push(dir);offset+=local.length+content.length;
    }
    const cdOffset=offset;for(const c of central){chunks.push(c);offset+=c.length}
    if(files.length>65535||offset>0xffffffff)throw new Error('Archive ZIP trop volumineuse.');
    const end=new Uint8Array(22),dv=new DataView(end.buffer);
    u32(dv,0,0x06054b50);u16(dv,8,files.length);u16(dv,10,files.length);u32(dv,12,offset-cdOffset);u32(dv,16,cdOffset);chunks.push(end);
    return new Blob(chunks,{type:'application/zip'});
  }
  async function downloadZip(){if(!dossier)return;
    const btn=$('h232-zip');btn.disabled=true;status('Création locale du ZIP, des tableaux CSV et des preuves disponibles…');
    try{
      const {sectionCopies,photos,warnings}=prepareFiles(dossier),files=[];
      const noPhotos={...dossier,sections:sectionCopies};
      files.push({name:'dossier_integral.json',data:JSON.stringify(noPhotos,null,2)});
      files.push({name:'rapport_imprimable.html',data:htmlReport(dossier,sectionCopies)});
      for(const [key,rows] of Object.entries(sectionCopies))files.push({name:`tableaux/${key}.csv`,data:sectionCsv(key,rows)});
      files.push(...photos);
      files.push({name:'LIRE_AVANT_CONTROLE.txt',data:`iCHEF HACCP - DOSSIER SANITAIRE\nÉtablissement : ${dossier.meta.tenantID}\nPériode : ${dossier.meta.from} au ${dossier.meta.to}\nSecteurs : ${dossier.meta.sectors.join(', ')}\nGénéré : ${dossier.meta.generatedAt}\nPhotos présentes : ${photos.length}\nSources absentes : ${(dossier.meta.missingSources||[]).join(', ')||'aucune dans les sources raccordees'}\nPhotos exclues ou illisibles : ${warnings.length}\nDonnées en lecture seule. Rapports CSV, JSON, HTML et photos encore disponibles.\nLes controles non enregistres et les preuves purgées ne sont pas reconstruits.\nUn examen de conformité exige la vérification des données et du PMS.\n`});
      const blob=zipStore(files);
      downloadBlob(`iCHEF_HACCP_INSPECTION_${dossier.meta.from}_${dossier.meta.to}.zip`,blob);
      status(`✓ ZIP créé : ${files.length} fichiers dont ${photos.length} photo(s) disponibles. ${warnings.length?'Certaines photos sont illisibles.':''}`);
    }catch(e){status('Création ZIP impossible : '+(e.message||e),true)}finally{btn.disabled=false}
  }
  function install(){
    const archive=$('mod-archive');
    if(!archive||$('h232-entry'))return;
    const wrap=document.createElement('div');wrap.id='h232-entry';wrap.innerHTML='<div><strong>📋 Contrôle sanitaire</strong><span>Rassembler les relevés et justificatifs du serveur pour une inspection, en lecture seule.</span></div><button type="button" id="h232-open" class="h232-primary">PRÉPARER UN CONTRÔLE SANITAIRE →</button>';
    archive.insertAdjacentElement('afterbegin',wrap);
    $('h232-open').addEventListener('click',open);
    // Entrée accessible depuis la barre latérale ordinateur, sans toucher aux modules existants.
    let attempts=0;const addSide=()=>{const side=$('hv225-sidebar');if(side&&!$('h232-side')){const btn=document.createElement('button');btn.type='button';btn.id='h232-side';btn.innerHTML='<i>▤</i> Dossier inspecteur';btn.addEventListener('click',open);const marker=side.querySelector('[data-hv225-nav="archive"]');(marker||side.lastElementChild)?.insertAdjacentElement('afterend',btn);return true}return false};
    if(!addSide()){const poll=setInterval(()=>{if(addSide()||++attempts>40)clearInterval(poll)},500)}
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&dialog&&!dialog.hidden)close()});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
  window.ICHEF_HACCP_INSPECTION_V232={open,build:'V232'};
})();

</script>
<style id="ichef-v234-inspection-qr-css">
#h234-box{background:#f6f8fb;border:1px solid #b7c5d9;border-radius:15px;padding:17px;margin:15px 0;color:#112235}
#h234-qrwrap[hidden]{display:none!important}#h234-box h3{margin:0 0 6px;font-size:19px}#h234-box p{margin:5px 0 12px;color:#526277}
#h234-options{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:8px;margin:12px 0}
#h234-options label{display:flex;gap:8px;align-items:center;padding:8px;background:white;border-radius:8px;color:#142137;font-size:13px}
#h234-options input{width:auto;margin:0}#h234-actions{display:flex;flex-wrap:wrap;gap:9px;align-items:center}
#h234-actions button{padding:12px 16px;border-radius:8px;background:#deb45b;color:#111;border:1px solid #cda247;font-weight:800;cursor:pointer}
#h234-actions button:disabled{opacity:.5;cursor:wait}#h234-qrwrap{margin:15px 0;display:flex;flex-wrap:wrap;gap:20px;align-items:center}
#h234-qr{padding:15px;background:white;min-height:200px;min-width:200px;display:grid;place-items:center}
#h234-link{overflow-wrap:anywhere;color:#1354ad;font-size:12px}#h234-status{font-size:13px;margin-top:10px}
</style>
<script id="ichef-v234-inspection-qr">
(()=>{'use strict';if(window.iCHEF234Installed)return;window.iCHEF234Installed=true;
const keys={temperatures:'Températures',nettoyage:'Nettoyage',tracabilite:'Traçabilité et lots',receptions_haccp:'Réceptions HACCP',inventaires_haccp:'Inventaires',bons_livraison:'Bons de livraison',referentiel_haccp:'Référentiel des équipements'};
let token='';
function mount(){const controls=document.querySelector('#h232-dialog .h232-controls');if(!controls||document.getElementById('h234-box'))return;
const wrap=document.createElement('section');wrap.id='h234-box';wrap.innerHTML='<h3>▦ Partager le dossier avec l’inspecteur</h3><p>Choisissez uniquement les rubriques demandées. QR à durée limitée : 2 heures, lecture seule, révocable.</p><div id="h234-options"></div><div id="h234-actions"><button type="button" id="h234-create">GÉNÉRER LE QR INSPECTION</button><button type="button" id="h234-revoke" disabled>Révoquer cet accès</button></div><div id="h234-status" role="status">Sélectionnez la période, le secteur et les rubriques, puis générez le QR. Vous pouvez aussi préparer le dossier séparément.</div><div id="h234-qrwrap" hidden><div id="h234-qr"></div><div><p>Adresse sécurisée :</p><a id="h234-link" target="_blank" rel="noopener noreferrer"></a><p id="h234-expiry"></p></div></div>';
controls.insertAdjacentElement('afterend',wrap);document.getElementById('h234-options').innerHTML=Object.entries(keys).map(([k,v])=>`<label><input type="checkbox" value="${k}" checked>${v}</label>`).join('');
const msg=x=>document.getElementById('h234-status').textContent=x;
document.getElementById('h234-create').addEventListener('click',async()=>{
const b=document.getElementById('h234-create');const selected=[...document.querySelectorAll('#h234-options input:checked')].map(x=>x.value);
if(!selected.length){msg('Choisissez au moins une rubrique.');return}b.disabled=true;msg('Création du dossier temporaire…');
try{const headers=(typeof systemHeaders==='function'?systemHeaders():{});headers['Content-Type']='application/json';
const response=await fetch((typeof SERVER_URL==='string'?SERVER_URL:'https://tableau-system.onrender.com')+'/api/haccp/inspection/share',{method:'POST',headers,credentials:'omit',body:JSON.stringify({from:document.getElementById('h232-from').value,to:document.getElementById('h232-to').value,sector:document.getElementById('h232-sector').value,sections:selected})});
const d=await response.json();if(!response.ok||!d.success)throw Error(d.error||'Erreur de création');
token=d.token;const link=document.getElementById('h234-link');link.href=d.url;link.textContent=d.url;link.referrerPolicy='no-referrer';document.getElementById('h234-expiry').textContent='Expiration : '+new Date(d.expiresAt).toLocaleString('fr-FR');
const q=document.getElementById('h234-qr');q.innerHTML='';const show=()=>{if(window.QRCode){new window.QRCode(q,{text:d.url,width:200,height:200,correctLevel:window.QRCode.CorrectLevel.M});}else{q.textContent='QR indisponible : ouvrez le lien ci-contre.'}};
if(!window.QRCode){const script=document.createElement('script');script.src='https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';script.onload=show;script.onerror=show;document.head.append(script)}else show();
document.getElementById('h234-qrwrap').hidden=false;document.getElementById('h234-revoke').disabled=false;msg('✓ Lien temporaire actif. Ne l’envoyez qu’à l’inspecteur concerné.');
}catch(e){msg('✕ '+e.message)}finally{b.disabled=false}});
document.getElementById('h234-revoke').addEventListener('click',async()=>{if(!token)return;const b=document.getElementById('h234-revoke');b.disabled=true;try{const h=(typeof systemHeaders==='function'?systemHeaders():{});h['Content-Type']='application/json';const r=await fetch((typeof SERVER_URL==='string'?SERVER_URL:'https://tableau-system.onrender.com')+'/api/haccp/inspection/share/revoke',{method:'POST',headers:h,body:JSON.stringify({token})});if(!r.ok)throw Error('Révocation refusée');document.getElementById('h234-qrwrap').hidden=true;msg('Accès révoqué.');token=''}catch(e){msg(e.message);b.disabled=false}})
}
const observer=new MutationObserver(mount);observer.observe(document.documentElement,{subtree:true,childList:true});mount();
})();
</script>
<style id="ichef-v236-desktop-reception-cards-light">
/*
 * iCHEF HACCP V236 — Réception BL : cadres clairs sur ORDINATEUR
 * Correctif CSS de présentation uniquement.
 * Portée stricte : #mod-reception à partir de 1101px.
 * Aucune modification du mobile, des accès, du serveur ou des données.
 */
@media screen and (min-width: 1101px) {
  /* Titre actuellement trop pâle sur le fond clair */
  #mod-reception .hv7-kicker { color: #996a22 !important; }
  #mod-reception .hv7-title { color: #14283e !important; font-size: 1.5rem; }
  #mod-reception .hv7-sub { color: #52657b !important; font-size: .83rem; }

  /* Petits indicateurs de session et de livraison */
  #mod-reception .hv7-badge {
    background: #eef3fa !important;
    color: #32475e !important;
    border-color: #c8d4e3 !important;
  }
  #mod-reception .hv7-badge.ok {
    background: #eaf8f1 !important;
    color: #117b52 !important;
    border-color: #addcc3 !important;
  }
  #mod-reception .hv7-badge.warn {
    background: #fff5df !important;
    color: #9e6114 !important;
    border-color: #edce86 !important;
  }

  /* Les TROIS panneaux : Livraisons / Contrôle du BL / Réceptions récentes */
  #mod-reception .hv7-panel {
    background: #fbfdff !important;
    color: #14253a !important;
    border: 1px solid #d2deea !important;
    box-shadow: 0 8px 22px rgba(30, 55, 90, .05);
  }
  #mod-reception .hv7-panel-head {
    background: #eaf1f9 !important;
    border-bottom: 1px solid #d4e0eb !important;
  }
  #mod-reception .hv7-panel-head strong { color: #16293f !important; font-size: .79rem; }
  #mod-reception .hv7-panel-head span { color: #5b6d82 !important; font-size: .65rem; }
  #mod-reception .hv7-list,
  #mod-reception .hv7-detail { background: #fbfdff !important; color: #14253a !important; }
  #mod-reception .hv7-empty {
    color: #617287 !important;
    font-size: .79rem !important;
    padding: 27px 16px;
  }

  /* Une livraison sélectionnée reste nettement visible */
  #mod-reception .hv7-delivery-card {
    background: #fff !important;
    color: #14253a !important;
    border-color: #d6e0eb !important;
  }
  #mod-reception .hv7-delivery-card:hover,
  #mod-reception .hv7-delivery-card:focus-visible {
    background: #eff5fc !important;
    border-color: #8cadcf !important;
  }
  #mod-reception .hv7-delivery-card.active {
    background: #fff5dc !important;
    border-color: #d3a64c !important;
  }
  #mod-reception .hv7-delivery-card small { color: #627489 !important; }
  #mod-reception .hv7-delivery-card em { color: #50657b !important; }

  /* Lisibilité des détails après ouverture d'un bon de livraison */
  #mod-reception .hv7-order-title h3,
  #mod-reception .hv7-line-top b { color: #15293e !important; }
  #mod-reception .hv7-order-title p,
  #mod-reception .hv7-line-top small,
  #mod-reception .hv7-photo-meta,
  #mod-reception .hv7-warning { color: #607388 !important; }
  #mod-reception .hv7-line,
  #mod-reception .hv7-bl-main,
  #mod-reception .hv7-recent-row {
    background: #f4f8fc !important;
    color: #15293e !important;
    border-color: #dbe4ed !important;
  }
  #mod-reception .hv7-line-fields span,
  #mod-reception .hv7-field-label,
  #mod-reception .hv7-recent-row small { color: #607388 !important; }
  #mod-reception .hv7-recent-row b { color: #193149 !important; }
  #mod-reception .hv7-stock-link { color: #50657b !important; border-color: #b7c8d9 !important; }
  #mod-reception .hv7-stock-link.linked { color: #08794f !important; border-color: #9bd9bd !important; }
  #mod-reception input:not([type="file"]),
  #mod-reception select,
  #mod-reception textarea {
    background: #fff !important;
    color: #162a40 !important;
    border-color: #bdccdc !important;
  }
  #mod-reception .hv7-photo-btn,
  #mod-reception .hv7-trace-btn,
  #mod-reception .hv7-anomaly-btn,
  #mod-reception .hv7-mini-actions button {
    background: #fff !important;
    color: #274461 !important;
    border-color: #b8cbdc !important;
  }
  #mod-reception .hv7-photo-preview { background: #f0f4f8 !important; border-color: #cbd9e7 !important; }
  #mod-reception .hv7-photo-preview span { color: #65758a !important; }
  #mod-reception .hv7-anomaly-btn.active { color: #b32344 !important; border-color: #f0a4b5 !important; background: #fff0f3 !important; }
}
</style>

<style id="ichef-v237-commande-copie-styles">
/* V237 : association de la commande fournisseur d'origine et du contrôle BL. */
.hv237-po-actions{display:flex;align-items:center;justify-content:flex-end;flex-wrap:wrap;gap:9px}
.hv237-po-open,.hv237-po-recent{border:1px solid #b38b37!important;border-radius:8px!important;background:#fff9e9!important;color:#4b3300!important;font-weight:900!important;min-height:36px!important;padding:7px 12px!important;font-size:12px!important;cursor:pointer!important}
.hv237-po-open:hover,.hv237-po-recent:hover{background:#ffedbd!important}
.hv237-po-backdrop{position:fixed;inset:0;z-index:220000;display:flex;align-items:center;justify-content:center;background:rgba(7,15,26,.79);padding:16px;box-sizing:border-box}
.hv237-po-backdrop[hidden]{display:none!important}
.hv237-po-window{background:#fff;color:#172439;width:min(980px,100%);max-height:calc(100dvh - 32px);min-height:240px;border-radius:16px;overflow:auto;box-shadow:0 30px 80px rgba(0,0,0,.32);font:14px/1.5 Inter,Arial,sans-serif}
.hv237-po-head{display:flex;justify-content:space-between;align-items:flex-start;gap:18px;background:#102031;color:#fff;padding:20px 24px}
.hv237-po-head h2{margin:2px 0 5px;color:#fff;font-size:23px;font-weight:850}.hv237-po-head p{margin:0;color:#bed0e0;font-size:12px}
.hv237-po-close{flex:0 0 auto;width:40px;height:40px;background:#fff!important;border:0;border-radius:10px;color:#172439!important;font-weight:900!important;font-size:20px!important;cursor:pointer}
.hv237-po-body{padding:20px 24px 23px;max-width:100%;box-sizing:border-box}
.hv237-po-message{border:1px solid #cbd7e2;border-radius:10px;padding:13px 14px;background:#f2f6fa;color:#31475e}
.hv237-po-info{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin-bottom:15px}
.hv237-po-info div{border:1px solid #d5e0e9;border-radius:9px;padding:9px 11px;min-width:0;overflow-wrap:anywhere}
.hv237-po-info small{display:block;color:#60758b;font-weight:800;font-size:10px;text-transform:uppercase;letter-spacing:.4px}
.hv237-po-info strong{display:block;margin-top:4px;color:#182d43;font-size:14px}
.hv237-po-table-scroll{overflow-x:auto;border:1px solid #d5e0e9;border-radius:10px}
.hv237-po-table{width:100%;border-collapse:collapse;min-width:620px;margin:0!important;font-size:12px;color:#172439}
.hv237-po-table th,.hv237-po-table td{text-align:left;padding:11px 12px!important;border-bottom:1px solid #e1e8ef!important;white-space:normal!important;vertical-align:middle}
.hv237-po-table th{position:static!important;background:#edf3f8!important;color:#31465c!important;font-size:11px!important}
.hv237-po-total{margin-top:12px;padding:12px 14px;border-radius:8px;background:#fff5d8;color:#4b3500;font-size:15px;text-align:right;font-weight:850}
.hv237-po-note{margin:12px 0 15px;color:#566a7f;font-size:12px;line-height:1.55}
.hv237-po-footer{display:flex;gap:10px;flex-wrap:wrap;justify-content:flex-end}
.hv237-po-footer button{border:1px solid #c8d3de!important;background:#fff!important;color:#172439!important;border-radius:9px!important;padding:11px 15px!important;min-height:44px!important;font-weight:850!important;cursor:pointer!important;font-size:13px!important}
.hv237-po-footer button.primary{border-color:#b58425!important;background:#efbc50!important;color:#17150e!important}
@media (max-width:1100px){
 /* Corriger en plus les textes blancs sur fond blanc de la capture téléphone. */
 body.haccp-v7-reception-mobile #mod-reception{background:#f3f6fa!important;color:#12263b!important}
 body.haccp-v7-reception-mobile #mod-reception .hv7-kicker{color:#875e13!important}
 body.haccp-v7-reception-mobile #mod-reception .hv7-title{color:#10283e!important;text-shadow:none!important}
 body.haccp-v7-reception-mobile #mod-reception .hv7-sub{color:#526780!important;opacity:1!important}
 body.haccp-v7-reception-mobile #mod-reception .hv7-panel{background:#fff!important;border:1px solid #c5d3df!important;color:#10283e!important;box-shadow:0 2px 9px rgba(12,29,46,.06)!important}
 body.haccp-v7-reception-mobile #mod-reception .hv7-panel-head{background:#edf3f8!important;border-color:#d5e0ea!important}
 body.haccp-v7-reception-mobile #mod-reception .hv7-panel-head strong{color:#132d45!important;font-weight:900!important}
 body.haccp-v7-reception-mobile #mod-reception .hv7-panel-head span{color:#536982!important;opacity:1!important}
 body.haccp-v7-reception-mobile #mod-reception .hv7-list,body.haccp-v7-reception-mobile #mod-reception .hv7-detail{background:#fff!important;color:#1b3146!important}
 body.haccp-v7-reception-mobile #mod-reception .hv7-empty{color:#52667b!important;opacity:1!important;font-weight:650!important}
 body.haccp-v7-reception-mobile #mod-reception .hv7-delivery-card{background:#fff!important;color:#1b3146!important;border-color:#cbd8e5!important}
 body.haccp-v7-reception-mobile #mod-reception .hv7-delivery-card b{color:#132d45!important}
 body.haccp-v7-reception-mobile #mod-reception .hv7-delivery-card small,body.haccp-v7-reception-mobile #mod-reception .hv7-delivery-card em{color:#567087!important}
 body.haccp-v7-reception-mobile #mod-reception .hv7-order-title h3,body.haccp-v7-reception-mobile #mod-reception .hv7-line-top b{color:#142c42!important}
 body.haccp-v7-reception-mobile #mod-reception .hv7-order-title p,body.haccp-v7-reception-mobile #mod-reception .hv7-line-top small{color:#536b83!important}
 body.haccp-v7-reception-mobile #mod-reception .hv7-line,body.haccp-v7-reception-mobile #mod-reception .hv7-bl-main,body.haccp-v7-reception-mobile #mod-reception .hv7-recent-row{background:#fbfdff!important;color:#122d43!important;border-color:#cbd8e5!important}
 .hv237-po-backdrop{padding:8px!important;align-items:flex-end!important}
 .hv237-po-window{max-height:calc(100dvh - 16px);border-radius:14px 14px 0 0!important}
 .hv237-po-head{padding:15px}.hv237-po-head h2{font-size:19px}.hv237-po-body{padding:14px}
 .hv237-po-info{grid-template-columns:repeat(2,minmax(0,1fr))}
 .hv237-po-footer button{flex:1 1 auto}
}
@media(max-width:380px){.hv237-po-info{grid-template-columns:1fr}.hv237-po-actions{justify-content:flex-start}}
</style>


<script id="ichef-v237-copie-commande-js">
(()=>{
  'use strict';
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const number=v=>{const n=Number(v);return Number.isFinite(n)?n:0};
  const format=v=>number(v).toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2});
  const date=v=>{if(!v)return'—';const d=new Date(v);return Number.isFinite(d.getTime())?d.toLocaleDateString('fr-FR'):'—'};
  let current=null,lastFocus=null;
  function shell(){let o=$('hv237-po-backdrop');if(o)return o;
    o=document.createElement('div');o.id='hv237-po-backdrop';o.className='hv237-po-backdrop';o.hidden=true;
    o.innerHTML='<section class="hv237-po-window" role="dialog" aria-modal="true" aria-labelledby="hv237-po-title"><div class="hv237-po-head"><div><h2 id="hv237-po-title">📄 Copie de la commande fournisseur</h2><p>iCHEF OS · Réception BL synchronisée</p></div><button type="button" class="hv237-po-close" id="hv237-po-close" aria-label="Fermer">×</button></div><div class="hv237-po-body" id="hv237-po-body"><div class="hv237-po-message">Chargement…</div></div></section>';
    document.body.appendChild(o);
    $('hv237-po-close').addEventListener('click',close);
    o.addEventListener('click',e=>{if(e.target===o)close()});
    return o;
  }
  function close(){const o=$('hv237-po-backdrop');if(o)o.hidden=true;current=null;if(lastFocus?.focus)lastFocus.focus()}
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('hv237-po-backdrop')&&!$('hv237-po-backdrop').hidden){e.preventDefault();close()}});
  const safeId=x=>String(x||'').replace(/[^a-z0-9_-]/gi,'_').slice(0,100);
  function values(order){
    const items=Array.isArray(order.items)?order.items:[];
    return items.slice(0,160).map(i=>({name:String(i.name||'Article'),sku:String(i.sku||''),q:Math.max(0,number(i.quantity)),done:Math.max(0,number(i.receivedQuantity)),unit:String(i.unit||'unité'),unitPrice:Math.max(0,number(i.unitPrice)),total:Math.max(0,number(i.quantity))*Math.max(0,number(i.unitPrice))}));
  }
  function rowsHtml(order){return values(order).map(i=>`<tr><td><strong>${esc(i.name)}</strong>${i.sku?`<br><small>${esc(i.sku)}</small>`:''}</td><td>${format(i.q)} ${esc(i.unit)}</td><td>${format(i.done)} ${esc(i.unit)}</td><td>${format(i.unitPrice)} ${esc(order.currency||'')}</td><td>${format(i.total)} ${esc(order.currency||'')}</td></tr>`).join('')}
  function documentHtml(order){const cells=[['Fournisseur',order.supplierName||'—'],['Commande iCHEF',order.id],['Secteur',order.sectorLabel||order.sectorKey||'—'],['État',order.status||'—'],['Date de création',date(order.createdAt)],['Livraison demandée',date(order.requestedDeliveryAt)]];
    return `<div class="hv237-po-info">${cells.map(([label,v])=>`<div><small>${esc(label)}</small><strong>${esc(v)}</strong></div>`).join('')}</div><div class="hv237-po-table-scroll"><table class="hv237-po-table"><thead><tr><th>Produit commandé</th><th>Quantité commandée</th><th>Déjà réceptionné</th><th>Prix unitaire estimé</th><th>Montant estimé</th></tr></thead><tbody>${rowsHtml(order)||'<tr><td colspan="5">Aucune ligne enregistrée.</td></tr>'}</tbody></table></div><div class="hv237-po-total">Total estimé : ${format(order.totalEstimated)} ${esc(order.currency||'')}</div>${order.notes?`<div class="hv237-po-note"><strong>Observation :</strong> ${esc(order.notes)}</div>`:''}<p class="hv237-po-note">Document récapitulatif généré à partir de la commande fournisseur iCHEF <strong>${esc(order.id)}</strong>. Il est lié au fournisseur <strong>${esc(order.supplierName||'—')}</strong> et aux réceptions enregistrées sur cette référence. Ce document n'est ni un bon de livraison signé, ni une facture. Les prix indiqués sont estimatifs ; TVA non calculée dans ce récapitulatif.</p>`;
  }
  function printable(order){return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>iCHEF · Copie de commande ${esc(order.id)}</title><style>body{margin:25px auto;padding:0 16px;max-width:980px;font:14px/1.5 Arial,sans-serif;color:#183047}h1{color:#a77920;font-size:25px;margin:0 0 7px}h2{font-size:17px}.note{color:#536478}.hv237-po-info{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:18px 0}.hv237-po-info div{border:1px solid #cbd5df;border-radius:5px;padding:9px}.hv237-po-info small{display:block;color:#5c7185}.hv237-po-info strong{display:block}.hv237-po-table-scroll{overflow:visible}.hv237-po-table{border-collapse:collapse;width:100%;font-size:12px}.hv237-po-table th,.hv237-po-table td{border:1px solid #cbd5df;text-align:left;padding:9px}.hv237-po-table th{background:#eef2f7}.hv237-po-total{text-align:right;padding:12px;background:#fff2c7;font-weight:700}.hv237-po-note{margin:17px 0;color:#526274;font-size:12px;line-height:1.5}@media print{@page{size:A4 landscape;margin:11mm}body{max-width:none;padding:0;margin:0}.hv237-po-info{grid-template-columns:repeat(3,1fr)}tr{break-inside:avoid}}</style></head><body><h1>iCHEF · BON DE COMMANDE</h1><p class="note">COPIE RÉCAPITULATIVE · DOCUMENT DE COMMANDE</p>${documentHtml(order)}<p class="note">État de la commande lors de la consultation : ${esc(new Date().toLocaleString('fr-FR'))}.</p></body></html>`;}
  function saveHtml(){if(!current)return;const b=new Blob([printable(current)],{type:'text/html;charset=utf-8'}),u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download='iCHEF_COMMANDE_'+safeId(current.id)+'.html';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),30000)}
  function printCopy(){if(!current)return;const w=window.open('','_blank');if(!w){const message=$('hv237-po-message');if(message)message.textContent='Fenêtre d’impression bloquée. Utilisez « Télécharger la copie », puis imprimez-la.';return;}w.document.open();w.document.write(printable(current));w.document.close();w.focus();setTimeout(()=>{try{w.print()}catch(e){/* Le document reste ouvert pour imprimer. */}},350)}
  function render(order){const body=$('hv237-po-body');if(!body)return;body.innerHTML=documentHtml(order)+'<div class="hv237-po-footer"><button type="button" id="hv237-po-refresh">↻ Actualiser</button><button type="button" id="hv237-po-download">⬇ Télécharger la copie</button><button type="button" class="primary" id="hv237-po-print">🖨 Imprimer / PDF</button></div><p id="hv237-po-message" class="hv237-po-note" role="status">Synchronisé à la commande d’origine ; toute réception est liée par le numéro de commande.</p>';
    $('hv237-po-download').addEventListener('click',saveHtml);$('hv237-po-print').addEventListener('click',printCopy);$('hv237-po-refresh').addEventListener('click',()=>open(order.id));
  }
  async function open(id){const o=shell(),body=$('hv237-po-body');const orderId=String(id||'').trim();lastFocus=document.activeElement;o.hidden=false;body.innerHTML='<div class="hv237-po-message" role="status">Chargement de la commande fournisseur enregistrée dans iCHEF…</div>';$('hv237-po-close').focus();
    try{if(typeof window.haccpV7GetPurchaseOrderCopy!=='function')throw new Error('Session HACCP indisponible.');const order=await window.haccpV7GetPurchaseOrderCopy(orderId);if(o.hidden)return;if(String(order?.id)!==orderId)throw new Error('Référence de commande incohérente.');current=order;render(order)}catch(e){current=null;body.innerHTML='<div class="hv237-po-message" role="alert">Impossible d’afficher la commande : '+esc(e?.message||'Erreur serveur')+'. La réception ne doit pas être validée sur la base d’un document introuvable.</div>'}
  }
  window.haccpV7ShowPurchaseOrderCopy=open;
})();
</script>
<!-- iCHEF HACCP V241 — Appui prolongé 500 ms : catégories / éléments du catalogue -->
<style id="ichef-v241-hold-style">
#catalog-content .hv241-holdable{
  touch-action:pan-y;
  -webkit-user-select:none;
  user-select:none;
  -webkit-touch-callout:none;
}
#catalog-content .hv241-holdable:focus-visible{outline:3px solid #d8a746;outline-offset:3px;border-radius:5px}
#catalog-hold-help{margin:6px 0 10px;padding:10px 12px;border:1px solid #dec897;border-radius:8px;background:#fff7e4;color:#654b17;font:600 13px/1.45 Inter,Arial,sans-serif}
#catalog-hold-help[hidden]{display:none!important}
#catalog-content .hv241-rename-item{margin-left:auto;min-width:40px;min-height:40px;cursor:pointer;border:1px solid #ccb66f;border-radius:7px;background:#fff5d5;color:#47350e;font-size:16px;font-weight:800;touch-action:manipulation}
#catalog-content .hv241-rename-item:focus-visible{outline:3px solid #d8a746;outline-offset:2px}
@media (max-width:768px){#catalog-hold-help{font-size:12px}#catalog-content .hv241-rename-item{min-width:44px;min-height:44px}}
</style>
<script id="ichef-v241-hold-script">
(function(){
 'use strict';
 const content=document.getElementById('catalog-content');
 const search=document.getElementById('catalog-search');
 const baseOpen=window.openCatalog;
 if(!content||!search||typeof baseOpen!=='function')return;
 const normalize=(s)=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLocaleLowerCase('fr');
 const permitted=()=>{
  try{return !!window.ICHEF_HACCP?.authenticated && !window.ICHEF_HACCP?.v223Staff && typeof isBoss==='function' && isBoss()}
  catch(_){return false}
 };
 let activePress=null, suppress=null, saving=false;
 const clearPress=()=>{if(activePress?.timer)clearTimeout(activePress.timer);activePress=null};
 const contextFrom=(target)=>{
  const dept=String(currentDept||''),kind=String(currentCatalogCategory||'');
  const table=EMPIRE_LISTS?.[dept]?.[kind];
  if(!table||typeof table!=='object')return null;
  const folderNode=target.classList.contains('catalog-folder-title')?target:null;
  const itemNode=target.classList.contains('catalog-item')?target:null;
  if(!folderNode&&!itemNode)return null;
  const index=Number(target.dataset.hv241Folder);
  if(!Number.isSafeInteger(index)||index<0)return null;
  const folder=Object.keys(table)[index];
  if(!folder||!Array.isArray(table[folder]))return null;
  if(folderNode)return {dept,kind,folder,level:'folder'};
  // Les équipements température sont liés à des relevés historiques :
  // ne pas rompre leur identité en renommant seulement leur libellé.
  if(kind==='eq')return null;
  const itemIndex=Number(target.dataset.hv241Item);
  if(!Number.isSafeInteger(itemIndex)||itemIndex<0)return null;
  const item=table[folder][itemIndex];
  if(typeof item!=='string')return null;
  return {dept,kind,folder,item,level:'item'};
 };
 function decorate(){
  const edit=permitted(),category=String(currentCatalogCategory||'');
  const titles=[...content.querySelectorAll('.catalog-folder-title')];
  titles.forEach((title,index)=>{
   title.dataset.hv241Folder=String(index);
   title.tabIndex=0;
   title.setAttribute('role','button');
   title.setAttribute('aria-label',edit?'Catégorie, appuyer pendant 0,5 seconde pour renommer; appuyer brièvement pour ouvrir':'Catégorie, appuyer pour ouvrir');
   title.classList.toggle('hv241-holdable',edit);
   const grid=title.nextElementSibling;
   if(!grid||!grid.classList.contains('catalog-grid'))return;
   [...grid.querySelectorAll('.catalog-item')].forEach((row,itemIndex)=>{
    row.dataset.hv241Folder=String(index);
    row.dataset.hv241Item=String(itemIndex);
    row.classList.toggle('hv241-holdable',edit&&category!=='eq');
    if(edit&&category!=='eq'){
     row.tabIndex=0;
     row.title='Maintenir 0,5 seconde pour renommer cet élément';
     if(!row.querySelector('.hv241-rename-item')){
      const b=document.createElement('button');
      b.type='button';b.className='hv241-rename-item';b.textContent='✎';
      b.title='Renommer cet élément';b.setAttribute('aria-label','Renommer cet élément');
      b.addEventListener('click',(e)=>{e.preventDefault();e.stopPropagation();void rename(contextFrom(row))});
      row.appendChild(b);
     }
    }
   });
  });
  let tip=document.getElementById('catalog-hold-help');
  if(!tip){
   tip=document.createElement('div');tip.id='catalog-hold-help';tip.setAttribute('role','note');
   search.insertAdjacentElement('afterend',tip);
  }
  tip.hidden=!edit;
  tip.textContent=category==='eq'
   ? '✎ Responsable : maintenez une catégorie 0,5 seconde pour la renommer. Les noms des équipements restent protégés pour préserver leurs relevés.'
   : '✎ Responsable : maintenez une catégorie ou un élément 0,5 seconde pour le renommer. Sur ordinateur, touche F2 également.';
 }
 window.openCatalog=function(...args){const result=baseOpen.apply(this,args);clearPress();decorate();return result};
 async function rename(ctx){
  if(!ctx||!permitted()||saving)return;
  const original=ctx.level==='folder'?ctx.folder:ctx.item;
  const label=ctx.level==='folder'?'catégorie':'élément';
  const answer=prompt('Renommer '+label+' « '+original+' » :',original);
  if(answer===null)return;
  const proposed=answer.trim();
  if(proposed===original)return;
  if(proposed.length<2||proposed.length>75||/[<>\u0000-\u001f\u007f]/.test(proposed)){
   alert('Le nom doit contenir entre 2 et 75 caractères, sans chevrons ni caractères de contrôle.');return;
  }
  if(!permitted()){alert('Session responsable non autorisée.');return;}
  const current=EMPIRE_LISTS?.[ctx.dept]?.[ctx.kind];
  if(!current||!Object.prototype.hasOwnProperty.call(current,ctx.folder)){
   alert('Cette catégorie a changé entre-temps. Réouvrez le catalogue.');return;
  }
  if(ctx.level==='folder'){
   if(Object.keys(current).some(name=>name!==ctx.folder&&normalize(name)===normalize(proposed))){
    alert('Une catégorie porte déjà ce nom.');return;
   }
  }else{
   if(!current[ctx.folder].includes(ctx.item)){
    alert('Cet élément a changé entre-temps. Réouvrez le catalogue.');return;
   }
   if(current[ctx.folder].some(name=>name!==ctx.item&&normalize(name)===normalize(proposed))){
    alert('Un élément porte déjà ce nom dans cette catégorie.');return;
   }
  }
  if(!confirm('Confirmer le renommage de « '+original+' » en « '+proposed+' » ?\nLes relevés HACCP déjà enregistrés conservent leur libellé historique.'))return;
  saving=true;
  try{
   const next=JSON.parse(JSON.stringify(EMPIRE_LISTS));
   const sector=next[ctx.dept];
   if(!sector||!sector[ctx.kind])throw Error('Secteur introuvable.');
   if(ctx.level==='folder'){
    if(!Object.prototype.hasOwnProperty.call(sector[ctx.kind],ctx.folder))throw Error('Catégorie introuvable.');
    sector[ctx.kind]=Object.fromEntries(Object.entries(sector[ctx.kind]).map(([key,value])=>[key===ctx.folder?proposed:key,value]));
    if(ctx.kind==='eq'&&sector.eqCategoryTypes&&Object.prototype.hasOwnProperty.call(sector.eqCategoryTypes,ctx.folder)){
     sector.eqCategoryTypes=Object.fromEntries(Object.entries(sector.eqCategoryTypes).map(([key,value])=>[key===ctx.folder?proposed:key,value]));
    }
   }else{
    const entries=sector[ctx.kind][ctx.folder];
    const index=entries.indexOf(ctx.item);
    if(index<0)throw Error('Élément introuvable.');
    entries[index]=proposed;
   }
   if(typeof API==='undefined'||typeof API.update!=='function')throw Error('Connexion serveur indisponible.');
   await API.update('HACCP_LISTS_MASTER',next);
   EMPIRE_LISTS=next;
   if(typeof db!=='undefined')db.haccpLists=next;
   try{localStorage.setItem('EMPIRE_HACCP_LISTS_V2_'+tenantID,JSON.stringify(next))}catch(_){}
   if(typeof populateSelects==='function')populateSelects();
   if(ctx.kind==='eq')window.dispatchEvent(new Event('ichef:haccp:categories-changed'));
   window.openCatalog(ctx.kind);
  }catch(err){
   console.warn('[iCHEF HACCP V241] Renommage refusé :',err);
   alert('Renommage non enregistré : '+String(err?.message||err)+'\nLe catalogue existant a été conservé.');
  }finally{saving=false}
 }
 if(content.querySelector('.catalog-folder-title'))decorate();
 content.addEventListener('pointerdown',(event)=>{
  clearPress();
  if(!permitted()||saving||event.button!==0||!event.isPrimary)return;
  if(event.target.closest('button,.catalog-action,.folder-admin-actions'))return;
  const node=event.target.closest('.catalog-folder-title,.catalog-item');
  if(!node||!content.contains(node))return;
  const ctx=contextFrom(node);if(!ctx)return;
  activePress={pointerId:event.pointerId,x:event.clientX,y:event.clientY,node,ctx,fired:false,timer:null};
  const reference=activePress;
  reference.timer=setTimeout(()=>{
   if(activePress!==reference||!permitted())return;
   reference.fired=true;
   suppress={node,until:Date.now()+2000};
   void rename(ctx);
  },500);
 },{passive:true});
 content.addEventListener('pointermove',(event)=>{
  if(!activePress||activePress.pointerId!==event.pointerId||activePress.fired)return;
  if(Math.hypot(event.clientX-activePress.x,event.clientY-activePress.y)>12)clearPress();
 },{passive:true});
 const done=event=>{if(activePress&&activePress.pointerId===event.pointerId){if(activePress.fired)suppress={node:activePress.node,until:Date.now()+2000};clearPress()}};
 content.addEventListener('pointerup',done,{passive:true});
 content.addEventListener('pointercancel',done,{passive:true});
 content.addEventListener('pointerleave',(event)=>{if(event.pointerType==='mouse')clearPress()},{passive:true});
 content.addEventListener('click',(event)=>{
  if(!suppress)return;
  if(Date.now()>suppress.until){suppress=null;return;}
  if(event.target===suppress.node||suppress.node.contains(event.target)){
   event.preventDefault();event.stopImmediatePropagation();suppress=null;
  }
 },true);
 content.addEventListener('contextmenu',(event)=>{
  if(permitted()&&event.target.closest('.hv241-holdable'))event.preventDefault();
 });
 content.addEventListener('keydown',(event)=>{
  if(!permitted()||saving)return;
  const node=event.target.closest('.catalog-folder-title,.catalog-item');
  if(!node||!content.contains(node))return;
  if(event.key==='F2'){
   const ctx=contextFrom(node);if(!ctx)return;
   event.preventDefault();void rename(ctx);
  }else if(node.classList.contains('catalog-folder-title')&&(event.key==='Enter'||event.key===' ')){
   event.preventDefault();const grid=node.nextElementSibling;
   if(grid?.id&&typeof toggleFolder==='function')toggleFolder(grid.id);
  }else if(node.classList.contains('catalog-item')&&event.key==='Enter'){
   const ctx=contextFrom(node);
   if(!ctx||typeof selectFromCatalog!=='function')return;
   event.preventDefault();selectFromCatalog(ctx.item);
  }
 });
})();
</script>

<!-- iCHEF HACCP V242 — Correction QR inspection + actions correctives liées -->
<style id="ichef-v242-corrective-css">
#h242-dialog[hidden]{display:none!important}
#h242-dialog{position:fixed;inset:0;z-index:100600;background:rgba(4,11,22,.7);display:flex;align-items:center;justify-content:center;padding:18px;overflow:auto;box-sizing:border-box}
#h242-dialog .h242-card{background:#f8fafc;border-radius:17px;border:1px solid #cdd7e4;color:#142235;width:min(600px,100%);max-height:95%;overflow-y:auto;padding:24px;box-sizing:border-box;box-shadow:0 18px 65px #0005}
#h242-dialog h2{margin:0 0 8px;font-size:23px;color:#15283d}
#h242-dialog p{color:#52647a;font-size:13px;line-height:1.5}
#h242-dialog label{display:block;margin:14px 0 5px;color:#293d52;font-weight:800;font-size:13px}
#h242-dialog textarea,#h242-dialog select{display:block;box-sizing:border-box;width:100%;min-height:46px;padding:10px 12px;border:1px solid #aab9ca;background:#fff;border-radius:9px;color:#18283a;font-size:16px}
#h242-dialog textarea{min-height:115px;resize:vertical}
#h242-dialog .h242-actions{display:flex;gap:10px;flex-wrap:wrap;justify-content:flex-end;margin-top:15px}
#h242-dialog button{border:1px solid #b5c3d4;padding:12px 15px;min-height:44px;border-radius:8px;background:white;color:#16283a;font-weight:800;cursor:pointer}
#h242-dialog button[type=submit]{background:#f2c45e;border-color:#c79a38}
#h242-dialog button:disabled{opacity:.6;cursor:wait}
#h242-message{min-height:19px;color:#244d70;font-size:13px}
@media(max-width:600px){#h242-dialog .h242-card{padding:17px}#h242-dialog .h242-actions button{flex:1}}
</style>
<script id="ichef-v242-corrective-js">
(()=>{'use strict';if(window.ICHEF_V242_CORRECTIVE)return;
const $=id=>document.getElementById(id);
let sourceRecord=null,dlg=null,inFlight=false;
const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function show(){
 if(dlg)return;
 dlg=document.createElement('div');dlg.id='h242-dialog';dlg.hidden=true;dlg.setAttribute('role','dialog');dlg.setAttribute('aria-modal','true');dlg.setAttribute('aria-label','Action corrective HACCP');
 dlg.innerHTML='<div class="h242-card"><form id="h242-form"><h2>🛠 Action corrective HACCP</h2><p id="h242-origin"></p><label for="h242-action">Action réalisée ou à réaliser *</label><textarea id="h242-action" minlength="8" maxlength="1500" required placeholder="Ex. Re-nettoyage puis désinfection du matériel, nouvelle vérification…"></textarea><label for="h242-status">Résultat du contrôle après action</label><select id="h242-status"><option value="NON CONFORME">Anomalie en cours de traitement</option><option value="CONFORME">Correction effectuée et conformité vérifiée</option></select><p>Le contrôle original reste conservé. L’action est ajoutée comme nouvel enregistrement horodaté, signé et lié au contrôle.</p><div role="status" id="h242-message"></div><div class="h242-actions"><button type="button" id="h242-cancel">Annuler</button><button type="submit" id="h242-submit">Enregistrer l’action</button></div></form></div>';
 document.body.append(dlg);
 $('h242-cancel').addEventListener('click',close);
 dlg.addEventListener('click',ev=>{if(ev.target===dlg&&!inFlight)close()});
 $('h242-form').addEventListener('submit',save);
}
function close(){if(inFlight)return;if(dlg)dlg.hidden=true;sourceRecord=null}
function open(recordId){
 if(typeof isBoss!=='function'||!isBoss()){alert('Responsable habilité requis pour enregistrer une action corrective.');return}
 const row=(typeof db!=='undefined'&&Array.isArray(db.cleaning)?db.cleaning:[]).find(x=>String(x.id)===String(recordId));
 if(!row||row.recordType==='CORRECTIVE_ACTION'){alert('Contrôle introuvable. Rechargez la page HACCP.');return}
 show();sourceRecord=row;dlg.hidden=false;
 $('h242-origin').innerHTML='<strong>'+escape(row.zone||'Zone')+'</strong> · Contrôle du '+escape(row.date||'')+' à '+escape(row.time||'')+'<br>Statut initial : <strong>'+escape(row.status||'—')+'</strong>';
 $('h242-action').value='';$('h242-status').value='NON CONFORME';$('h242-message').textContent='';$('h242-action').focus();
}
async function save(e){
 e.preventDefault();if(inFlight||!sourceRecord)return;
 const action=$('h242-action').value.trim();const status=$('h242-status').value;
 if(action.length<8||action.length>1500){$('h242-message').textContent='Précisez l’action corrective (8 caractères minimum).';return}
 if(!['CONFORME','NON CONFORME'].includes(status))return;
 if(!window.ICHEF_HACCP?.authenticated){$('h242-message').textContent='Session HACCP non connectée.';return}
 inFlight=true;const submit=$('h242-submit');submit.disabled=true;$('h242-cancel').disabled=true;$('h242-message').textContent='Enregistrement sécurisé sur le serveur…';
 try{
  const server=typeof SERVER_URL==='string'?SERVER_URL:'https://tableau-system.onrender.com';
  const headers=typeof systemHeaders==='function'?systemHeaders({'Content-Type':'application/json'}):{'Content-Type':'application/json'};
  const r=await fetch(server+'/api/haccp/cleaning/corrective',{method:'POST',headers,credentials:'include',cache:'no-store',body:JSON.stringify({sourceId:String(sourceRecord.id),sector:String(sourceRecord.dept||''),action,status})});
  const ans=await r.json().catch(()=>({}));if(!r.ok||ans.success!==true)throw Error(ans.error||'Sauvegarde refusée ('+r.status+').');
  $('h242-message').textContent='✓ Action corrective enregistrée.';
  // Actualiser à partir du serveur ; aucune correction locale non enregistrée.
  if(typeof loadData==='function')await loadData({force:true});
  setTimeout(()=>{inFlight=false;close()},650);
 }catch(err){$('h242-message').textContent='✕ '+(err?.message||'Erreur de connexion. Réessayez.');inFlight=false}
 finally{submit.disabled=false;$('h242-cancel').disabled=false}
}
function install(){document.addEventListener('click',e=>{const btn=e.target.closest('[data-h242-source-id]');if(btn){e.preventDefault();open(btn.getAttribute('data-h242-source-id'))}},true);
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&dlg&&!dlg.hidden&&!inFlight)close()});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
window.ICHEF_V242_CORRECTIVE={open,build:'V242'};
})();
</script>

</body>
</html>
