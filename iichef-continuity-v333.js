






/* iCHEF OS V333 — continuité visuelle, sans modifier les connexions ni les écritures.
 * Le contrôle de santé ne constitue PAS une preuve de sauvegarde.
 * À charger après les scripts métier dans RH / Planning / Staff.
 */
(function () {
  'use strict';
  if (window.__ichefContinuityV333) return;
  window.__ichefContinuityV333 = true;
  const cfg = window.ICHEF_CONTINUITY_V333 || {};
  const renderOrigin = 'https://tableau-system.onrender.com';
  const knownOrigins = ['os.ichef.ch', 'ichef.ch', 'www.ichef.ch', 'tableau-system.onrender.com'];
  const host = location.hostname.toLowerCase();
  const defaultEndpoint = (host === 'localhost' || host === '127.0.0.1')
    ? 'http://localhost:10000/health'
    : knownOrigins.includes(host) ? location.origin + '/health' : renderOrigin + '/health';
  let endpoint = defaultEndpoint;
  // URL configurée par l'exploitant : HTTPS (ou HTTP uniquement sur localhost).
  if (typeof cfg.healthUrl === 'string') {
    try {
      const url = new URL(cfg.healthUrl, location.href);
      const allowed = url.protocol === 'https:' ||
        (url.protocol === 'http:' && ['localhost','127.0.0.1'].includes(url.hostname));
      if (allowed && url.pathname === '/health') endpoint = url.toString();
    } catch (_) { /* configuration incorrecte : repli */ }
  }
  const pollMs = Math.max(10000, Math.min(120000, Number(cfg.intervalMs) || 25000));
  const timeoutMs = 6500;
  let failures = 0;
  let checking = false;
  let timer = null;
  let banner = null;
  let textNode = null;
  let retryButton = null;
  let offlineHint = false;

  function createBanner() {
    if (banner || !document.body) return;
    const style = document.createElement('style');
    style.id = 'ichef-v333-style';
    style.textContent = `
#ichef-v333-alert{position:fixed;z-index:2147483000;left:16px;right:16px;bottom:16px;max-width:720px;margin:auto;box-sizing:border-box;display:none;align-items:center;gap:14px;padding:17px 19px;border:1px solid #d7dfe5;border-radius:14px;background:#fff;color:#172d3d;box-shadow:0 12px 44px rgba(0,0,0,.22);font-family:system-ui,-apple-system,Segoe UI,Arial,sans-serif}
#ichef-v333-alert[data-show="true"]{display:flex}
#ichef-v333-alert .ichef-v333-copy{flex:1;min-width:0;font-size:13px;line-height:1.5}
#ichef-v333-alert strong{display:block;font-size:15px;margin-bottom:3px}
#ichef-v333-alert button{font:inherit;font-size:13px;font-weight:700;border:0;border-radius:9px;background:#172d3d;color:#fff;padding:11px 15px;cursor:pointer;min-height:42px}
#ichef-v333-alert button:disabled{opacity:.6;cursor:wait}
@media(max-width:480px){#ichef-v333-alert{flex-wrap:wrap;left:10px;right:10px;bottom:10px}#ichef-v333-alert button{width:100%}}
@media print{#ichef-v333-alert{display:none!important}}
`;
    document.head.appendChild(style);
    banner = document.createElement('aside');
    banner.id = 'ichef-v333-alert';
    banner.setAttribute('role', 'status');
    banner.setAttribute('aria-live', 'polite');
    const copy = document.createElement('div');
    copy.className = 'ichef-v333-copy';
    const title = document.createElement('strong');
    title.textContent = 'iCHEF OS · Connexion momentanément indisponible';
    textNode = document.createElement('span');
    textNode.textContent = 'Le service rencontre une difficulté technique. Les opérations non confirmées peuvent ne pas avoir été enregistrées.';
    retryButton = document.createElement('button');
    retryButton.type = 'button';
    retryButton.textContent = 'Réessayer';
    retryButton.addEventListener('click', function () { void check(true); });
    copy.appendChild(title);
    copy.appendChild(textNode);
    banner.append(copy, retryButton);
    document.body.appendChild(banner);
  }
  function show(message) {
    createBanner();
    if (!banner) return;
    textNode.textContent = message;
    banner.dataset.show = 'true';
    document.dispatchEvent(new CustomEvent('ichef:continuity', { detail: { online: false } }));
  }
  function hide() {
    if (banner) banner.dataset.show = 'false';
    document.dispatchEvent(new CustomEvent('ichef:continuity', { detail: { online: true } }));
  }
  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(function () { void check(false); }, pollMs);
  }
  async function check(manual) {
    if (checking) return;
    if (document.visibilityState === 'hidden' && !manual) { schedule(); return; }
    checking = true;
    if (retryButton) retryButton.disabled = true;
    const ctrl = new AbortController();
    const timeout = setTimeout(function () { ctrl.abort(); }, timeoutMs);
    try {
      const response = await fetch(endpoint, { method: 'GET', cache: 'no-store', credentials: 'omit', signal: ctrl.signal });
      // On attend une réponse HTTP valide, pas le statut métier des utilisateurs.
      if (!response.ok) throw new Error('HTTP ' + response.status);
      failures = 0;
      offlineHint = false;
      hide();
    } catch (_) {
      failures += 1;
      // Évite d'afficher un faux incident sur une brève interruption réseau.
      if (manual || offlineHint || failures >= 2) {
        show(navigator.onLine === false
          ? 'Votre appareil semble hors connexion. Les modifications non confirmées ne sont pas sauvegardées. Vérifiez votre réseau, puis réessayez.'
          : 'Nous rencontrons une difficulté technique temporaire. Les modifications non confirmées ne doivent pas être considérées comme enregistrées. Réessayez dans quelques instants.');
      }
    } finally {
      clearTimeout(timeout);
      checking = false;
      if (retryButton) retryButton.disabled = false;
      schedule();
    }
  }
  window.addEventListener('offline', function () {
    offlineHint = true;
    show('Votre appareil est hors connexion. Les opérations non confirmées ne sont pas enregistrées sur le serveur.');
  });
  window.addEventListener('online', function () { void check(false); });
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') void check(false);
  });
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { void check(false); }, { once: true });
  } else {
    void check(false);
  }
})();











/* iCHEF OS V333 — continuité visuelle, sans modifier les connexions ni les écritures.
 * Le contrôle de santé ne constitue PAS une preuve de sauvegarde.
 * À charger après les scripts métier dans RH / Planning / Staff.
 */
(function () {
  'use strict';
  if (window.__ichefContinuityV333) return;
  window.__ichefContinuityV333 = true;
  const cfg = window.ICHEF_CONTINUITY_V333 || {};
  const renderOrigin = 'https://tableau-system.onrender.com';
  const knownOrigins = ['os.ichef.ch', 'ichef.ch', 'www.ichef.ch', 'tableau-system.onrender.com'];
  const host = location.hostname.toLowerCase();
  const defaultEndpoint = (host === 'localhost' || host === '127.0.0.1')
    ? 'http://localhost:10000/health'
    : knownOrigins.includes(host) ? location.origin + '/health' : renderOrigin + '/health';
  let endpoint = defaultEndpoint;
  // URL configurée par l'exploitant : HTTPS (ou HTTP uniquement sur localhost).
  if (typeof cfg.healthUrl === 'string') {
    try {
      const url = new URL(cfg.healthUrl, location.href);
      const allowed = url.protocol === 'https:' ||
        (url.protocol === 'http:' && ['localhost','127.0.0.1'].includes(url.hostname));
      if (allowed && url.pathname === '/health') endpoint = url.toString();
    } catch (_) { /* configuration incorrecte : repli */ }
  }
  const pollMs = Math.max(10000, Math.min(120000, Number(cfg.intervalMs) || 25000));
  const timeoutMs = 6500;
  let failures = 0;
  let checking = false;
  let timer = null;
  let banner = null;
  let textNode = null;
  let retryButton = null;
  let offlineHint = false;

  function createBanner() {
    if (banner || !document.body) return;
    const style = document.createElement('style');
    style.id = 'ichef-v333-style';
    style.textContent = `
#ichef-v333-alert{position:fixed;z-index:2147483000;left:16px;right:16px;bottom:16px;max-width:720px;margin:auto;box-sizing:border-box;display:none;align-items:center;gap:14px;padding:17px 19px;border:1px solid #d7dfe5;border-radius:14px;background:#fff;color:#172d3d;box-shadow:0 12px 44px rgba(0,0,0,.22);font-family:system-ui,-apple-system,Segoe UI,Arial,sans-serif}
#ichef-v333-alert[data-show="true"]{display:flex}
#ichef-v333-alert .ichef-v333-copy{flex:1;min-width:0;font-size:13px;line-height:1.5}
#ichef-v333-alert strong{display:block;font-size:15px;margin-bottom:3px}
#ichef-v333-alert button{font:inherit;font-size:13px;font-weight:700;border:0;border-radius:9px;background:#172d3d;color:#fff;padding:11px 15px;cursor:pointer;min-height:42px}
#ichef-v333-alert button:disabled{opacity:.6;cursor:wait}
@media(max-width:480px){#ichef-v333-alert{flex-wrap:wrap;left:10px;right:10px;bottom:10px}#ichef-v333-alert button{width:100%}}
@media print{#ichef-v333-alert{display:none!important}}
`;
    document.head.appendChild(style);
    banner = document.createElement('aside');
    banner.id = 'ichef-v333-alert';
    banner.setAttribute('role', 'status');
    banner.setAttribute('aria-live', 'polite');
    const copy = document.createElement('div');
    copy.className = 'ichef-v333-copy';
    const title = document.createElement('strong');
    title.textContent = 'iCHEF OS · Connexion momentanément indisponible';
    textNode = document.createElement('span');
    textNode.textContent = 'Le service rencontre une difficulté technique. Les opérations non confirmées peuvent ne pas avoir été enregistrées.';
    retryButton = document.createElement('button');
    retryButton.type = 'button';
    retryButton.textContent = 'Réessayer';
    retryButton.addEventListener('click', function () { void check(true); });
    copy.appendChild(title);
    copy.appendChild(textNode);
    banner.append(copy, retryButton);
    document.body.appendChild(banner);
  }
  function show(message) {
    createBanner();
    if (!banner) return;
    textNode.textContent = message;
    banner.dataset.show = 'true';
    document.dispatchEvent(new CustomEvent('ichef:continuity', { detail: { online: false } }));
  }
  function hide() {
    if (banner) banner.dataset.show = 'false';
    document.dispatchEvent(new CustomEvent('ichef:continuity', { detail: { online: true } }));
  }
  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(function () { void check(false); }, pollMs);
  }
  async function check(manual) {
    if (checking) return;
    if (document.visibilityState === 'hidden' && !manual) { schedule(); return; }
    checking = true;
    if (retryButton) retryButton.disabled = true;
    const ctrl = new AbortController();
    const timeout = setTimeout(function () { ctrl.abort(); }, timeoutMs);
    try {
      const response = await fetch(endpoint, { method: 'GET', cache: 'no-store', credentials: 'omit', signal: ctrl.signal });
      // On attend une réponse HTTP valide, pas le statut métier des utilisateurs.
      if (!response.ok) throw new Error('HTTP ' + response.status);
      failures = 0;
      offlineHint = false;
      hide();
    } catch (_) {
      failures += 1;
      // Évite d'afficher un faux incident sur une brève interruption réseau.
      if (manual || offlineHint || failures >= 2) {
        show(navigator.onLine === false
          ? 'Votre appareil semble hors connexion. Les modifications non confirmées ne sont pas sauvegardées. Vérifiez votre réseau, puis réessayez.'
          : 'Nous rencontrons une difficulté technique temporaire. Les modifications non confirmées ne doivent pas être considérées comme enregistrées. Réessayez dans quelques instants.');
      }
    } finally {
      clearTimeout(timeout);
      checking = false;
      if (retryButton) retryButton.disabled = false;
      schedule();
    }
  }
  window.addEventListener('offline', function () {
    offlineHint = true;
    show('Votre appareil est hors connexion. Les opérations non confirmées ne sont pas enregistrées sur le serveur.');
  });
  window.addEventListener('online', function () { void check(false); });
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') void check(false);
  });
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { void check(false); }, { once: true });
  } else {
    void check(false);
  }
})();




