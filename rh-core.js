
✅ J’ai préparé iCHEF OS — Planning RH Premium en PWA, avec une interface professionnelle et une connexion prévue avec les données centrales de ton système.

L'objectif est d'avoir un seul planning officiel, consultable depuis les différents modules, sans créer plusieurs versions des horaires.

🚀 Nouveau Planning RH Premium
La PWA comprend :

Planning semaine et mois, avec modification directe des horaires.

Connexion au serveur iCHEF OS et aux collaborateurs de l'établissement.

Synchronisation avec RH et Portail Staff à partir du planning central TIMESHEETS_MASTER.

Gestion des congés, absences, repos, services et coupures.

Historique des modifications avec identification du responsable.

Protection des accès et contrôle des modifications simultanées.

Installation sur ordinateur et téléphone, comme une application.

Chargement rapide, sans enregistrer les données RH sensibles dans le cache de la PWA.

La Pointeuse conserve séparément les heures réellement travaillées. L'Assistance IA reste accessible depuis le module RH existant.

📥 Télécharger la mise à jour
📦 

📄 

📄 

📋 

🔐 Attention à la connexion et à la sécurité
J'ai vérifié la syntaxe JavaScript et effectué un test de navigation et de modification avec une API simulée.

La synchronisation réelle n'est pas encore validée. Il faudra intégrer le correctif dans ton server.js actuel, sans remplacer les autres développements, puis tester les connexions avec MongoDB, RH, Portail Staff et Pointeuse.

J'ai également préparé un lien pour ouvrir la PWA depuis RH, sans remplacer les autres fonctionnalités.

Mon objectif pour iCHEF OS : un planning unique, élégant, intuitif et fiable, que le responsable peut modifier rapidement et que les collaborateurs retrouvent dans leur Portail Staff.






Fichier markdown(20261019-163807).md collé
Fichier

rh (7).html
Fichier

rh-core (1).js
JavaScript

rh-payroll (2).js
JavaScript

sw-rh (2).js
JavaScript

rh_COMPLET123.txt
Document
OK TU PEUX METTRE A JOUR LE CONNECTION ET SUPPRIMER CE QUI N EST PLUS UTILTER EN ENFECEANT ATTION A CONNECTION

aujourd’hui 0:34
SECTION HACCP


Texte collé(20261019-223647).txt
Document
le server.js

✅ J’ai préparé iCHEF OS RH V258 avec le Planning Premium comme planning principal et unique.

Désormais, l’objectif est que toutes les modifications du planning officiel se fassent dans PLANNING PREMIUM, tandis que rh.html et le Portail Staff consultent les mêmes données.

🔄 1. Connexion et synchronisation
Le fonctionnement prévu est le suivant :

PLANNING PREMIUM → SERVEUR iCHEF → RH.HTML → PORTAIL STAFF

✅ Planning Premium : modification des horaires, repos, congés et absences.

✅ RH.HTML : consultation du planning officiel, sans deuxième système de modification.

✅ Portail Staff : réception des horaires actualisés.

✅ Pointeuse : conservation des heures réellement travaillées.

✅ Serveur : enregistrement centralisé dans TIMESHEETS_MASTER.

✅ Sécurité : contrôle des droits, de l'établissement et de la session.

✅ Historique : conservation des modifications et de leur auteur.

⚡ 2. Modifications automatiques
Lorsqu'un responsable modifie un horaire dans Planning Premium, celui-ci est enregistré sur le serveur.

RH peut ensuite récupérer cette modification automatiquement, sans ressaisie.

La synchronisation entre onglets d'un même navigateur est déclenchée immédiatement. Une actualisation périodique est également prévue pour les autres sessions.

🔐 3. Suppression des anciens conflits
J'ai préparé le blocage des anciennes sauvegardes qui risquaient d'écraser les modifications récentes.

L'ancien moteur reste présent pour ses fonctions de consultation et ses dépendances RH, mais Planning Premium devient le seul éditeur officiel.

La publication automatique de l'ancien moteur IA est temporairement désactivée. Son adaptation au nouveau planning reste à terminer.

📥 4. Télécharger la mise à jour
📦 

Fichiers individuels :

📄 

📄 

🌐 

📄 

📋 

🛡️ 5. Vérifications
La syntaxe JavaScript a été vérifiée. Les contrôles de publication, de verrouillage et d'autorisation ont également été testés avec des données simulées.

Attention : la synchronisation réelle avec ton serveur Render, MongoDB et les autres modules n'est pas encore validée.

Je recommande d'abord une installation en préproduction, avec sauvegarde des données et des fichiers actuels. Le pack comprend les instructions pour activer progressivement le nouveau système.

🎯 Résultat recherché
Un seul planning officiel, une seule source de données, aucune double saisie et aucune modification perdue.

C'est la structure que je recommande pour rendre le Planning Premium fiable et professionnel dans l'ensemble d'iCHEF OS.







Afficher moins

aujourd’hui 10:21
SUR RH.html il faudrait  effacer tous le ancienne planning la fais

✅ J’ai préparé la mise à jour iCHEF RH V259 pour retirer les anciens plannings de rh.html.

Désormais, PLANNING PREMIUM devient l'unique interface de création et de modification des horaires.

🔄 Modifications apportées
✅ Ancien planning mensuel retiré de l'affichage RH.

✅ Ancien planning individuel remplacé par l'accès à Planning Premium.

✅ Anciens boutons de modification du planning masqués.

✅ Bouton OUVRIR PLANNING PREMIUM ajouté dans RH.

✅ Fiches employés, contrats, salaires, congés et pointages conservés.

✅ Connexion existante et contrôles de sécurité non modifiés.

🔗 Synchronisation
Le fonctionnement prévu reste :

PLANNING PREMIUM → SERVEUR → RH → PORTAIL STAFF

Toutes les modifications officielles doivent être réalisées dans Planning Premium.

Les autres modules consultent les données synchronisées selon les autorisations de chaque utilisateur.

📥 Télécharger RH V259
📦 

📄 

🌐 

📋 

🔐 Important : sécurité et fonctionnement
J'ai conservé le code interne de l'ancien planning lorsqu'il peut encore être utilisé par les calculs RH, les historiques et les autres modules.

Les anciennes interfaces sont retirées de l'affichage, mais leur code n'est pas encore supprimé physiquement. Cela évite de casser des fonctionnalités toujours dépendantes de l'ancien moteur.

La syntaxe JavaScript du correctif a été vérifiée. La synchronisation réelle avec MongoDB et le Portail Staff reste à valider en préproduction.

Mon objectif : un seul Planning Premium pour toute la gestion des horaires, sans double saisie ni conflit entre les modules iCHEF OS.





le chargement est trops long

✅ J’ai préparé une nouvelle version iCHEF RH V260 pour accélérer le chargement, sans supprimer les fonctions RH ni compromettre la connexion au Planning Premium.

En examinant tes fichiers, j’ai trouvé plusieurs causes possibles des lenteurs, notamment les tentatives de connexion répétées et les synchronisations simultanées.

⚡ Corrections apportées
Identification PIN plus rapide : suppression des tentatives réseau inutiles qui pouvaient prolonger l'attente jusqu'à une minute.

Chargement de l'interface : affichage sans attendre le téléchargement des polices et de Socket.IO.

Synchronisation optimisée : les demandes identiques envoyées simultanément au serveur sont regroupées.

Planning Premium : réutilisation de la session autorisée lorsqu'elle est encore valide.

Ancien planning : suppression d'une surveillance permanente de l'écran qui pouvait ralentir RH.

Cache PWA : actualisation ciblée, sans perturber les autres modules.

🔐 Sécurité et fonctionnalités
Les éléments suivants sont conservés : authentification par le serveur, droits des responsables, fiches employés, contrats, salaires, pointages, historique et accès au Planning Premium.

Planning Premium reste l'unique interface de modification des horaires.

📥 Télécharger iCHEF RH V260
📦 

Fichiers en format TXT :

📄 

📄 

📄 

✅ Vérifications
J'ai vérifié la syntaxe JavaScript et simulé plusieurs scénarios de connexion : PIN valide, PIN refusé, panne réseau et synchronisations simultanées.

La vitesse réelle sur Render et MongoDB reste à mesurer. Je ne peux donc pas encore garantir un chargement instantané.

⚠️ Important : les trois fichiers doivent être testés ensemble en préproduction avant installation. Ne remplace pas rh-payroll.js, server.js ou le Service Worker du Portail Staff.

Objectif : ouvrir RH rapidement, accéder au Planning Premium sans attente inutile et conserver une synchronisation fiable dans tout iCHEF OS.





Bibliothèque
/
rh-core_COMPLET.txt



const urlParamsJS = new URLSearchParams(window.location.search);
        const tenantID_JS = urlParamsJS.get('tenantID') || localStorage.getItem('ichef_tenant_id') || 'MASTER_STATE';
        const SERVER_URL_JS = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
    ? "http://localhost:10000"
    : "https://tableau-system.onrender.com";
        function getRhDirectionAuthPin() {
            try {
                const pin = String(rhDirectionAuthPin || '').trim();
                return /^\d{4,12}$/.test(pin) ? pin : '';
            } catch (_) {
                return '';
            }
        }
        // V260 : requêtes identiques simultanées mutualisées en mémoire VIVE.
        // Aucun cache de réponse RH : après la fin du fetch, une nouvelle lecture
        // appelle le serveur (en tenant compte du PIN courant). Pas de stale data.
        const rhStateReadsInFlight = new Map();
        const API = {
            getState: async () => {
                const authPin = getRhDirectionAuthPin();
                const fingerprint = JSON.stringify([tenantID_JS, authPin]);
                if (rhStateReadsInFlight.has(fingerprint)) {
                    return rhStateReadsInFlight.get(fingerprint);
                }
                const pending = (async () => {
                    const params = new URLSearchParams({ tenantID: tenantID_JS });
                    if (authPin) params.set('masterPin', authPin);
                    const r = await fetch(
                        `${SERVER_URL_JS}/get-current-state?${params.toString()}`,
                        {
                            method: 'GET',
                            credentials: 'include',
                            cache: 'no-store',
                            headers: {
                                'Accept': 'application/json',
                                'X-iCHEF-Tenant': tenantID_JS
                            }
                        }
                    );
                    if (!r.ok) {
                        const err = await r.json().catch(() => ({}));
                        throw new Error(
