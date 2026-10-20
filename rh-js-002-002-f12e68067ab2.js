
;
/* RH V264 - preserved script #2 */
        // 🛡️ SÉCURITÉ ET IDENTIFICATION
        const ICHEF_LOCAL_PREVIEW = window.location.protocol === "file:";
        if (!ICHEF_LOCAL_PREVIEW && window.location.hostname !== "os.ichef.ch" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
            document.documentElement.innerHTML = "<h1 style='color:red; text-align:center; margin-top:20%; font-family:sans-serif;'>VIOLATION DE LICENCE iCHEF OS</h1>";
            throw new Error("Exécution non autorisée.");
        }
        document.addEventListener('contextmenu', event => event.preventDefault());
        document.onkeydown = function(e) {
            if(e.keyCode == 123) return false;
            if(e.ctrlKey && e.shiftKey && e.keyCode == 'I'.charCodeAt(0)) return false;
            if(e.ctrlKey && e.shiftKey && e.keyCode == 'J'.charCodeAt(0)) return false;
            if(e.ctrlKey && e.keyCode == 'U'.charCodeAt(0)) return false;
        }
        const urlParams = new URLSearchParams(window.location.search);
        let tenantID = urlParams.get('tenantID') || localStorage.getItem('ichef_tenant_id');
        if(!tenantID) window.location.href = 'connexionpartenaire.html';
        const SERVER_URL = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") ? "http://localhost:10000" : "https://tableau-system.onrender.com";
