// ==========================================
// 🏠 VITRINE DE VENTE I CHEF (Focus Offre 0€ + % CA)
// ==========================================
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="fr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>I CHEF - Solutions Restaurants</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;900&display=swap');
                :root { --bg: #09090b; --panel: #11141d; --border: #2d313a; --gold: #fbbf24; --text: #f9fafb; --text-muted: #9ca3af; }
                body { background-color: var(--bg); color: var(--text); font-family: 'Inter', sans-serif; margin: 0; padding: 0; }
                
                .header-nav { padding: 25px 50px; display: flex; justify-content: space-between; align-items: center; }
                .logo { font-size: 1.8rem; font-weight: 900; letter-spacing: -1px; }
                .logo span { color: var(--gold); }
                
                .container { max-width: 1200px; width: 92%; margin: 40px auto; display: grid; grid-template-columns: 1fr 1.2fr; gap: 60px; align-items: start; }
                @media (max-width: 1100px) { .container { grid-template-columns: 1fr; } }

                .hero h1 { font-size: 3.8rem; font-weight: 900; margin: 0 0 20px 0; letter-spacing: -2px; line-height: 1.1; }
                .hero p { font-size: 1.2rem; color: var(--text-muted); margin-bottom: 40px; line-height: 1.6; }
                
                .feature-box { background: var(--panel); border: 1px solid var(--border); padding: 25px; border-radius: 20px; display: flex; gap: 20px; align-items: center; margin-bottom: 15px; }
                .feature-icon { background: #1c1f26; width: 50px; height: 50px; border-radius: 12px; display: flex; justify-content: center; align-items: center; font-size: 1.2rem; border: 1px solid var(--border); }

                /* SECTION PRIX */
                .pricing-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
                .card { background: var(--panel); border: 1px solid var(--border); border-radius: 24px; padding: 40px 25px; display: flex; flex-direction: column; transition: 0.3s; position: relative; }
                .card:hover { border-color: var(--gold); }
                .card.highlight { border: 2px solid var(--gold); }
                .badge { position: absolute; top: -15px; left: 50%; transform: translateX(-50%); background: var(--gold); color: #000; padding: 5px 15px; border-radius: 20px; font-weight: 900; font-size: 0.8rem; text-transform: uppercase; }
                
                .card h3 { font-size: 1.4rem; margin: 0 0 10px 0; }
                .price { font-size: 3.2rem; font-weight: 900; color: var(--gold); line-height: 1; }
                .price span { font-size: 0.9rem; color: var(--text-muted); font-weight: 400; }
                .commission { font-size: 1.1rem; font-weight: 700; color: #fff; margin-top: 5px; }
                .setup-fee { color: #f87171; font-weight: 600; font-size: 0.8rem; margin: 15px 0 25px 0; text-transform: uppercase; }

                .card ul { list-style: none; padding: 0; margin: 0 0 30px 0; flex-grow: 1; }
                .card ul li { margin-bottom: 12px; display: flex; gap: 10px; font-size: 0.9rem; color: var(--text-muted); }
                .card ul li::before { content: '✓'; color: var(--gold); font-weight: bold; }
                .card ul li strong { color: #fff; }

                .btn { background: var(--gold); color: #000; text-decoration: none; padding: 18px; border-radius: 14px; text-align: center; font-weight: 900; text-transform: uppercase; transition: 0.2s; }
                .btn-outline { background: transparent; color: #fff; border: 1px solid var(--border); }
            </style>
        </head>
        <body>
            <div class="header-nav">
                <div class="logo">I <span>CHEF</span></div>
                <div style="font-weight: 600; color: var(--text-muted);">Infrastructures de Restauration</div>
            </div>

            <div class="container" id="main-content">
                <div class="hero">
                    <h1>L'infrastructure technologique absolue.</h1>
                    <p>Équipez votre restaurant avec le SAS Cuisine et l'encaissement QR Code sans changer vos habitudes.</p>
                    
                    <div class="feature-box">
                        <div class="feature-icon">⚡</div>
                        <div>
                            <h3 style="margin:0">Cuisine Autonome</h3>
                            <p style="margin:0; font-size:0.9rem; color:var(--text-muted)">Régulation automatique des flux en rush.</p>
                        </div>
                    </div>
                    <div class="feature-box">
                        <div class="feature-icon">💳</div>
                        <div>
                            <h3 style="margin:0">Paiement Table</h3>
                            <p style="margin:0; font-size:0.9rem; color:var(--text-muted)">Encaissement instantané sans serveur.</p>
                        </div>
                    </div>
                </div>

                <div class="pricing-grid">
                    <!-- OFFRE FIXE -->
                    <div class="card">
                        <h3>Offre Sérénité</h3>
                        <div class="price">99€<span>/mois</span></div>
                        <div class="commission">0% de commission</div>
                        <div class="setup-fee">+ 300€ Installation & Formation</div>
                        <ul>
                            <li><strong>100% de votre CA pour vous</strong></li>
                            <li>Commandes QR illimitées</li>
                            <li>Support prioritaire 7j/7</li>
                        </ul>
                        <a href="/create-checkout-session" class="btn">Choisir Fixe</a>
                    </div>

                    <!-- OFFRE % (ZÉRO EURO) -->
                    <div class="card highlight">
                        <div class="badge">Zéro risque</div>
                        <h3>Offre Partenaire</h3>
                        <div class="price">0€<span>/mois</span></div>
                        <div class="commission">1.5% de commission sur CA</div>
                        <div class="setup-fee">+ 300€ Installation & Formation</div>
                        <ul>
                            <li><strong>Payez uniquement si vous travaillez</strong></li>
                            <li>Idéal pour débuter sans frais fixes</li>
                            <li>Toutes les fonctions incluses</li>
                        </ul>
                        <a href="#" class="btn btn-outline" onclick="alert('Nous allons configurer votre commission ensemble lors du rendez-vous.')">Nous Contacter</a>
                    </div>
                </div>
            </div>
            
            <script>
                if (new URLSearchParams(window.location.search).get('success') === 'true') {
                    document.getElementById('main-content').innerHTML = \`
                        <div style="grid-column: 1/-1; text-align: center; padding: 100px; background: var(--panel); border-radius: 30px; border: 1px solid var(--gold);">
                            <div style="font-size: 5rem;">✅</div>
                            <h1 style="font-size: 3rem;">Dossier Validé</h1>
                            <p style="color: var(--text-muted); font-size: 1.2rem;">L'infrastructure I CHEF est réservée. Préparez votre menu, nous arrivons pour l'installation des 300€.</p>
                            <a href="/" class="btn" style="display: inline-block; padding: 15px 40px; margin-top: 20px;">Retour</a>
                        </div>\`;
                }
            </script>
        </body>
        </html>
    `);
});
