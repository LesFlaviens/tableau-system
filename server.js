// ==========================================
// 🏠 VITRINE DE VENTE I CHEF (Design image_a12490.jpg)
// ==========================================
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="fr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>I CHEF - Infrastructure SaaS</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;900&display=swap');
                :root { --bg: #09090b; --panel: #111827; --border: #1f2937; --gold: #fbbf24; --text: #f9fafb; --text-muted: #9ca3af; }
                body { background-color: var(--bg); color: var(--text); font-family: 'Inter', sans-serif; margin: 0; padding: 0; display: flex; flex-direction: column; min-height: 100vh; }
                
                .header-nav { padding: 20px 50px; display: flex; justify-content: space-between; align-items: center; }
                .logo { font-size: 1.8rem; font-weight: 900; letter-spacing: -1px; }
                .logo span { color: var(--gold); }
                
                .container { max-width: 1200px; width: 92%; margin: 40px auto; display: grid; grid-template-columns: 1.1fr 1fr; gap: 50px; align-items: start; }
                @media (max-width: 1000px) { .container { grid-template-columns: 1fr; } }

                /* CÔTÉ GAUCHE : TEXTE & FEATURES */
                .hero h1 { font-size: 4rem; font-weight: 900; margin: 0 0 20px 0; letter-spacing: -2px; line-height: 1; }
                .hero p { font-size: 1.2rem; color: var(--text-muted); margin-bottom: 50px; line-height: 1.6; max-width: 500px; }
                
                .feature-box { background: #11141d; border: 1px solid var(--border); padding: 30px; border-radius: 20px; display: flex; gap: 25px; align-items: center; margin-bottom: 20px; }
                .feature-icon { background: #1c1f26; width: 50px; height: 50px; border-radius: 12px; display: flex; justify-content: center; align-items: center; font-size: 1.2rem; flex-shrink: 0; border: 1px solid #2d313a; }
                .feature-text h3 { margin: 0 0 5px 0; font-size: 1.3rem; }
                .feature-text p { margin: 0; color: var(--text-muted); font-size: 0.95rem; line-height: 1.4; }

                /* CÔTÉ DROIT : TARIFS (image_a12490.jpg) */
                .pricing-header { text-align: center; margin-bottom: 30px; }
                .pricing-header h2 { font-size: 2.2rem; margin: 0; }
                .pricing-header p { color: var(--text-muted); margin: 5px 0 0 0; }

                .pricing-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
                .card { background: #11141d; border: 1px solid #2d313a; border-radius: 24px; padding: 40px 25px; display: flex; flex-direction: column; transition: 0.3s; }
                .card:hover { border-color: var(--gold); }
                .card.active { border-color: #2d313a; position: relative; }
                
                .card h3 { font-size: 1.4rem; margin: 0 0 20px 0; font-weight: 600; }
                .price { font-size: 3.5rem; font-weight: 900; color: var(--gold); line-height: 1; }
                .price span { font-size: 1rem; color: var(--text-muted); font-weight: 400; }
                .setup-fee { color: #ff5f5f; font-weight: 600; font-size: 0.85rem; margin: 10px 0 30px 0; text-transform: uppercase; letter-spacing: 0.5px; }

                .card ul { list-style: none; padding: 0; margin: 0 0 40px 0; flex-grow: 1; }
                .card ul li { margin-bottom: 15px; display: flex; gap: 10px; font-size: 0.95rem; align-items: flex-start; }
                .card ul li::before { content: '✓'; color: var(--gold); font-weight: bold; }

                .btn { background: var(--gold); color: #000; text-decoration: none; padding: 20px; border-radius: 14px; text-align: center; font-weight: 900; font-size: 1rem; text-transform: uppercase; transition: 0.2s; }
                .btn:hover { transform: scale(1.02); box-shadow: 0 10px 20px rgba(251, 191, 36, 0.2); }
                .btn-outline { background: transparent; color: #fff; border: 1px solid var(--border); }
            </style>
        </head>
        <body>
            <div class="header-nav">
                <div class="logo">I <span>CHEF</span></div>
                <div style="font-weight: 600; font-size: 0.9rem; color: var(--text-muted);">Nos Offres</div>
            </div>

            <div class="container" id="main-content">
                <div class="hero">
                    <h1>L'infrastructure technologique absolue.</h1>
                    <p>Conçu pour les restaurants à haut volume. Automatisez votre production, maîtrisez vos flux et encaissez sans friction. Fini l'attente pour vos clients.</p>
                    
                    <div class="feature-box">
                        <div class="feature-icon">⚡</div>
                        <div class="feature-text">
                            <h3>SAS Cuisine Autonome</h3>
                            <p>Régulation algorithmique des commandes entrantes. Protégez votre brigade des surcharges de travail lors des rushs.</p>
                        </div>
                    </div>

                    <div class="feature-box">
                        <div class="feature-icon">💳</div>
                        <div class="feature-text">
                            <h3>Portail d'Encaissement</h3>
                            <p>Commande et division d'addition en 1 clic via QR Code ou NFC. Maximisez la rotation de vos tables sans serveurs mobilisés.</p>
                        </div>
                    </div>
                </div>

                <div class="pricing-area">
                    <div class="pricing-header">
                        <h2>Déployez votre instance</h2>
                        <p>Choisissez le modèle qui correspond à votre volume.</p>
                    </div>

                    <div class="pricing-grid">
                        <!-- OFFRE SÉRÉNITÉ -->
                        <div class="card">
                            <h3>Offre Sérénité</h3>
                            <div class="price">99€<span>/mois</span></div>
                            <div class="setup-fee">+ 300€ Installation & Formation</div>
                            <ul>
                                <li><strong>100% de vos marges conservées</strong></li>
                                <li>Prises de commandes QR illimitées</li>
                                <li>SAS Cuisine Anti-Stress inclus</li>
                                <li>Support prioritaire 7j/7</li>
                            </ul>
                            <a href="/create-checkout-session" class="btn">Souscrire (Fixe)</a>
                        </div>

                        <!-- OFFRE PARTENAIRE -->
                        <div class="card active">
                            <h3>Offre Partenaire</h3>
                            <div class="price">1.5%<span>/paiement</span></div>
                            <div class="setup-fee">+ 300€ Installation & Formation</div>
                            <ul>
                                <li>Abonnement mensuel 100% gratuit</li>
                                <li>Aucun risque : 0€ si vous êtes fermé</li>
                                <li>Toutes les fonctionnalités incluses</li>
                                <li>Paiement via Stripe Connect</li>
                            </ul>
                            <a href="#" class="btn btn-outline" onclick="alert('Contactez-nous pour configurer votre compte Partenaire.')">Nous Contacter</a>
                        </div>
                    </div>
                </div>
            </div>

            <script>
                if (new URLSearchParams(window.location.search).get('success') === 'true') {
                    document.getElementById('main-content').innerHTML = \`
                        <div style="grid-column: 1/-1; text-align: center; padding: 80px; background: #11141d; border: 1px solid var(--border); border-radius: 30px;">
                            <div style="font-size: 5rem; margin-bottom: 20px;">✅</div>
                            <h1 style="font-size: 3rem; margin-bottom: 10px;">Paiement validé</h1>
                            <p style="color: var(--text-muted); font-size: 1.1rem; margin-bottom: 40px;">Félicitations. Le déploiement de votre infrastructure I CHEF est en cours. Nous allons prendre contact avec vous pour l'installation et la formation.</p>
                            <a href="/" class="btn" style="display: inline-block; padding: 15px 40px;">Retour à l'accueil</a>
                        </div>\`;
                }
            </script>
        </body>
        </html>
    `);
});
