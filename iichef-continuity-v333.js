



<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex,nofollow">
  <meta name="theme-color" content="#101820">
  <title>Service momentanément indisponible | iCHEF OS</title>
  <style>
    :root { color-scheme: light; font-family: system-ui,-apple-system,"Segoe UI",Arial,sans-serif; }
    * { box-sizing: border-box; }
    html { min-height: 100%; }
    body {
      min-height: 100vh;
      min-height: 100dvh;
      margin: 0;
      padding: 32px 18px;
      display: grid;
      place-items: center;
      background-color: #111c25;
      /* Image déjà présente à la racine du dépôt tableau-system */
      background-image:
        linear-gradient(125deg, rgba(6,16,25,.78),rgba(10,21,30,.52)),
        url("/ChatGPT%20Image%2020%20sept.%202026%2C%2014_24_41.png");
      background-position: center;
      background-size: cover;
      background-repeat: no-repeat;
      background-attachment: fixed;
      color: #18232b;
    }
    main {
      width: min(100%, 580px);
      background: rgba(255,255,255,.96);
      border: 1px solid rgba(255,255,255,.75);
      border-radius: 22px;
      padding: clamp(27px,5.5vw,54px);
      box-shadow: 0 24px 90px rgba(2,9,16,.32);
      text-align: center;
    }
    .brand-logo {
      display: block;
      width: min(215px, 65%);
      max-height: 118px;
      object-fit: contain;
      margin: 0 auto 26px;
    }
    .brand-fallback { font-size: 33px; font-weight: 900; letter-spacing: -1.5px; margin: 0 auto 25px; }
    .brand-fallback small { font-size: 13px; font-weight: 650; vertical-align: middle; letter-spacing: 2px; }
    .indicator { width: 10px; height: 10px; border-radius: 50%; background: #d99042; display: inline-block; margin-right: 8px; }
    .eyebrow { color: #647482; letter-spacing: .14em; font-size: 11px; font-weight: 800; text-transform: uppercase; }
    h1 { margin: 14px 0 17px; font-size: clamp(24px,4vw,33px); line-height: 1.2; letter-spacing: -.035em; }
    p { margin: 0 0 14px; color: #4a5965; font-size: 15px; line-height: 1.65; }
    .note { margin-top: 19px; font-size: 13px; color: #63737f; }
    .actions { margin-top: 30px; }
    button { appearance: none; border: 0; border-radius: 11px; cursor: pointer; padding: 14px 32px; background: #101820; color: #fff; font-weight: 750; font-size: 15px; min-height: 48px; }
    button:hover { background: #283946; }
    button:focus-visible { outline: 3px solid #ec9a54; outline-offset: 4px; }
    footer { color: #788692; font-size: 12px; margin-top: 32px; }
    @media (max-width: 480px) {
      body { padding: 18px 12px; background-attachment: scroll; }
      main { padding: 29px 23px; }
      .actions button { width: 100%; }
    }
    @media (prefers-reduced-motion: reduce) { * { scroll-behavior: auto; } }
  </style>
</head>
<body>
  <main role="main">
    <!-- Le chemin pointe vers logo-ichef.png à la racine du dépôt. -->
    <img class="brand-logo" src="/logo-ichef.png" alt="iCHEF OS" onerror="this.hidden=true;document.getElementById('brand-fallback').hidden=false;">
    <div id="brand-fallback" class="brand-fallback" hidden>iCHEF <small>OS</small></div>
    <div class="eyebrow"><span class="indicator" aria-hidden="true"></span>Information de service</div>
    <h1>Votre espace est momentanément indisponible</h1>
    <p>Nous rencontrons actuellement une difficulté technique temporaire. Nous vous invitons à réessayer dans quelques instants.</p>
    <p class="note">Les opérations déjà confirmées par le serveur restent enregistrées. Si vous étiez en train de saisir une commande ou une modification, vérifiez son statut avant de la recommencer.</p>
    <div class="actions"><button id="ichef-retry" type="button">Réessayer</button></div>
    <footer>iCHEF OS · Votre activité, notre priorité.</footer>
  </main>
  <script>
    document.getElementById('ichef-retry').addEventListener('click', function () {
      window.location.reload();
    });
  </script>
</body>
</html>








<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex,nofollow">
  <meta name="theme-color" content="#101820">
  <title>Service momentanément indisponible | iCHEF OS</title>
  <style>
    :root { color-scheme: light; font-family: system-ui,-apple-system,"Segoe UI",Arial,sans-serif; }
    * { box-sizing: border-box; }
    html { min-height: 100%; }
    body {
      min-height: 100vh;
      min-height: 100dvh;
      margin: 0;
      padding: 32px 18px;
      display: grid;
      place-items: center;
      background-color: #111c25;
      /* Image déjà présente à la racine du dépôt tableau-system */
      background-image:
        linear-gradient(125deg, rgba(6,16,25,.78),rgba(10,21,30,.52)),
        url("/ChatGPT%20Image%2020%20sept.%202026%2C%2014_24_41.png");
      background-position: center;
      background-size: cover;
      background-repeat: no-repeat;
      background-attachment: fixed;
      color: #18232b;
    }
    main {
      width: min(100%, 580px);
      background: rgba(255,255,255,.96);
      border: 1px solid rgba(255,255,255,.75);
      border-radius: 22px;
      padding: clamp(27px,5.5vw,54px);
      box-shadow: 0 24px 90px rgba(2,9,16,.32);
      text-align: center;
    }
    .brand-logo {
      display: block;
      width: min(215px, 65%);
      max-height: 118px;
      object-fit: contain;
      margin: 0 auto 26px;
    }
    .brand-fallback { font-size: 33px; font-weight: 900; letter-spacing: -1.5px; margin: 0 auto 25px; }
    .brand-fallback small { font-size: 13px; font-weight: 650; vertical-align: middle; letter-spacing: 2px; }
    .indicator { width: 10px; height: 10px; border-radius: 50%; background: #d99042; display: inline-block; margin-right: 8px; }
    .eyebrow { color: #647482; letter-spacing: .14em; font-size: 11px; font-weight: 800; text-transform: uppercase; }
    h1 { margin: 14px 0 17px; font-size: clamp(24px,4vw,33px); line-height: 1.2; letter-spacing: -.035em; }
    p { margin: 0 0 14px; color: #4a5965; font-size: 15px; line-height: 1.65; }
    .note { margin-top: 19px; font-size: 13px; color: #63737f; }
    .actions { margin-top: 30px; }
    button { appearance: none; border: 0; border-radius: 11px; cursor: pointer; padding: 14px 32px; background: #101820; color: #fff; font-weight: 750; font-size: 15px; min-height: 48px; }
    button:hover { background: #283946; }
    button:focus-visible { outline: 3px solid #ec9a54; outline-offset: 4px; }
    footer { color: #788692; font-size: 12px; margin-top: 32px; }
    @media (max-width: 480px) {
      body { padding: 18px 12px; background-attachment: scroll; }
      main { padding: 29px 23px; }
      .actions button { width: 100%; }
    }
    @media (prefers-reduced-motion: reduce) { * { scroll-behavior: auto; } }
  </style>
</head>
<body>
  <main role="main">
    <!-- Le chemin pointe vers logo-ichef.png à la racine du dépôt. -->
    <img class="brand-logo" src="/logo-ichef.png" alt="iCHEF OS" onerror="this.hidden=true;document.getElementById('brand-fallback').hidden=false;">
    <div id="brand-fallback" class="brand-fallback" hidden>iCHEF <small>OS</small></div>
    <div class="eyebrow"><span class="indicator" aria-hidden="true"></span>Information de service</div>
    <h1>Votre espace est momentanément indisponible</h1>
    <p>Nous rencontrons actuellement une difficulté technique temporaire. Nous vous invitons à réessayer dans quelques instants.</p>
    <p class="note">Les opérations déjà confirmées par le serveur restent enregistrées. Si vous étiez en train de saisir une commande ou une modification, vérifiez son statut avant de la recommencer.</p>
    <div class="actions"><button id="ichef-retry" type="button">Réessayer</button></div>
    <footer>iCHEF OS · Votre activité, notre priorité.</footer>
  </main>
  <script>
    document.getElementById('ichef-retry').addEventListener('click', function () {
      window.location.reload();
    });
  </script>
</body>
</html>




