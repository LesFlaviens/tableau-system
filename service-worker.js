let deferredPrompt = null;

function ichefIsStandalone() {
    return (
        window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true
    );
}

function ichefIsIOS() {
    return /iphone|ipad|ipod/i.test(
        navigator.userAgent || ''
    );
}

function refreshPwaInstallButton() {
    const button =
        document.getElementById('pwa-install-btn');

    if (!button) return;

    // Déjà installé
    if (ichefIsStandalone()) {
        button.style.display = 'none';
        return;
    }

    // iPhone/iPad : bouton visible pour afficher le guide
    if (ichefIsIOS()) {
        button.style.display = 'block';
        button.disabled = false;
        button.textContent =
            '📲 Installer iCHEF sur iPhone / iPad';
        return;
    }

    // Chrome / Edge :
    // ne montrer le bouton QUE lorsque l'installation
    // est réellement disponible.
    if (deferredPrompt) {
        button.style.display = 'block';
        button.disabled = false;
        button.textContent =
            '📲 Installer l’App iCHEF OS';
    } else {
        button.style.display = 'none';
    }
}


// ======================================================
// LE NAVIGATEUR DIT : ICHEF PEUT ÊTRE INSTALLÉ
// ======================================================

window.addEventListener(
    'beforeinstallprompt',
    (event) => {

        event.preventDefault();

        deferredPrompt = event;

        console.log(
            '✅ iCHEF OS est prêt à être installé'
        );

        refreshPwaInstallButton();
    }
);


// ======================================================
// CLIC SUR INSTALLER
// ======================================================

async function ouvrirGuideInstallation() {

    if (ichefIsStandalone()) {
        return;
    }

    // ------------------------------------------
    // Chrome / Edge / Android
    // ------------------------------------------

    if (deferredPrompt) {

        try {

            await deferredPrompt.prompt();

            const choice =
                await deferredPrompt.userChoice;

            console.log(
                'Choix installation :',
                choice.outcome
            );

            if (choice.outcome === 'accepted') {

                const button =
                    document.getElementById(
                        'pwa-install-btn'
                    );

                if (button) {
                    button.textContent =
                        '✅ Installation…';
                }
            }

        } catch (error) {

            console.error(
                'Erreur installation PWA :',
                error
            );

        } finally {

            deferredPrompt = null;

            refreshPwaInstallButton();
        }

        return;
    }


    // ------------------------------------------
    // iPhone / iPad
    // ------------------------------------------

    if (ichefIsIOS()) {

        const modal =
            document.getElementById('pwa-modal');

        const guide =
            document.getElementById('ios-guide');

        const instructions =
            document.getElementById(
                'pwa-instructions'
            );

        if (instructions) {
            instructions.textContent =
                'Pour installer iCHEF OS sur votre iPhone ou iPad :';
        }

        if (guide) {
            guide.style.display = 'block';
        }

        if (modal) {
            modal.style.display = 'flex';
        }

        return;
    }


    alert(
        "Installation pas encore disponible. Rechargez la page."
    );
}


// ======================================================
// INSTALLATION TERMINÉE
// ======================================================

window.addEventListener(
    'appinstalled',
    () => {

        deferredPrompt = null;

        const button =
            document.getElementById(
                'pwa-install-btn'
            );

        if (button) {
            button.style.display = 'none';
        }

        console.log(
            '✅ iCHEF OS installé avec succès'
        );
    }
);


// ======================================================
// SERVICE WORKER V24
// ======================================================

async function registerIchefPWA() {

    if (!('serviceWorker' in navigator)) {
        console.warn(
            'Service Worker non supporté'
        );
        return;
    }

    try {

        const registration =
            await navigator.serviceWorker.register(
                '/service-worker.js?v=24',
                {
                    scope: '/',
                    updateViaCache: 'none'
                }
            );

        await registration.update();

        console.log(
            '✅ iCHEF Service Worker V24 actif',
            registration.scope
        );

    } catch (error) {

        console.error(
            '❌ Service Worker iCHEF :',
            error
        );
    }
}


window.addEventListener(
    'load',
    async () => {

        await registerIchefPWA();

        refreshPwaInstallButton();
    }
);
