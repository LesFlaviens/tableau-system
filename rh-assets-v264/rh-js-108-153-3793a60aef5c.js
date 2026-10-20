
;
/* RH V264 - preserved script #108 */
window.__ICHEF_RH_BUILD__='RH-V106-DOCUMENTS-FAST-PROOF-SECURE';


;
/* RH V264 - preserved script #109 */
(() => {
  'use strict';
  if (window.__ICHEF_RH_V186_AUTO_CURRENCY_AGREEMENT__) return;
  window.__ICHEF_RH_V186_AUTO_CURRENCY_AGREEMENT__ = true;
  const VERSION = 'RH-V186-AUTO-CURRENCY-CONVENTION';
  const RH_SETTINGS_KEY = 'ichef_rh_settings';
  const PAYROLL_KEY = 'ichef_payroll_settings_v2';
  function jsonGet(key, fallback = {}) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || 'null');
      return value && typeof value === 'object' ? value : fallback;
    } catch (_) {
      return fallback;
    }
  }
  function jsonSet(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (_) {}
  }
  function normalizeCountry(value) {
    const raw = String(value || '').trim().toUpperCase();
    if (['FR','FRA','FRANCE'].includes(raw)) return 'FR';
    if (['CH','CHE','SUISSE','SWITZERLAND','SCHWEIZ','SVIZZERA'].includes(raw)) return 'CH';
    return '';
  }
  function detectedCountryRecord() {
    try {
      const tenant = String(
        typeof tenantID_JS !== 'undefined'
          ? tenantID_JS
          : (typeof tenantID !== 'undefined' ? tenantID : 'default')
      );
      return jsonGet(`ichef_client_country_detected_v185_${tenant}`, {});
    } catch (_) {
      return {};
    }
  }
  function resolveCountry() {
    const fromV185 = normalizeCountry(
      window.ICHEF_CLIENT_COUNTRY_V185?.current?.country
    );
    if (fromV185) return fromV185;
    const record = detectedCountryRecord();
    const fromRecord = normalizeCountry(record?.country);
    if (fromRecord) return fromRecord;
    try {
      if (typeof getRhSettings === 'function') {
        const settings = getRhSettings() || {};
        const fromRh = normalizeCountry(settings.planningLegalCountry);
        if (fromRh) return fromRh;
        if (String(settings.currency || '').toUpperCase() === 'EUR') return 'FR';
        if (String(settings.currency || '').toUpperCase() === 'CHF') return 'CH';
      }
    } catch (_) {}
    const payroll = jsonGet(PAYROLL_KEY, {});
    const fromPayroll = normalizeCountry(payroll.country);
    if (fromPayroll) return fromPayroll;
    if (String(payroll.currency || '').toUpperCase() === 'EUR') return 'FR';
    if (String(payroll.currency || '').toUpperCase() === 'CHF') return 'CH';
    return 'CH';
  }
  function profile(country) {
    if (country === 'FR') {
      return {
        country: 'FR',
        currency: 'EUR',
        symbol: '€',
        agreement: 'Convention collective HCR · IDCC 1979',
        legalFramework: 'FR_HCR',
        frRegime: 'HCR'
      };
    }
    return {
      country: 'CH',
      currency: 'CHF',
      symbol: 'CHF',
      agreement: 'CCNT hôtels, restaurants & cafés (L-GAV)',
      legalFramework: 'CH_CCNT',
      chRegime: 'LGAV'
    };
  }
  function syncRhSettings(country) {
    const p = profile(country);
    const current = jsonGet(RH_SETTINGS_KEY, {});
    const next = {
      ...current,
      currency: p.currency,
      planningLegalCountry: p.country,
      planningLegalFramework: p.legalFramework,
      planningLegalCountryAuto: true,
      planningCurrencyAuto: true,
      planningCurrencySource: 'client-country',
      planningCurrencyUpdatedAt: new Date().toISOString()
    };
    if (
      current.currency !== next.currency ||
      current.planningLegalCountry !== next.planningLegalCountry ||
      current.planningLegalFramework !== next.planningLegalFramework ||
      current.planningCurrencyAuto !== true
    ) {
      jsonSet(RH_SETTINGS_KEY, next);
    }
  }
  function syncPayroll(country) {
    const p = profile(country);
    const current = jsonGet(PAYROLL_KEY, {});
    const needsUpdate =
      current.country !== p.country ||
      current.currency !== p.currency ||
      current.agreement !== p.agreement ||
      current.autoCountryFromTenant !== true ||
      current.autoCurrencyFromCountry !== true ||
      current.autoAgreementFromCountry !== true ||
      (country === 'FR' && current.frRegime !== 'HCR') ||
      (country === 'CH' && current.chRegime !== 'LGAV');
    if (!needsUpdate) return;
    const now = new Date().toISOString();
    const next = {
      ...current,
      country: p.country,
      currency: p.currency,
      agreement: p.agreement,
      autoCountryFromTenant: true,
      autoCurrencyFromCountry: true,
      autoAgreementFromCountry: true,
      autoCountryUpdatedAt: now,
      autoCurrencyUpdatedAt: now,
      autoAgreementUpdatedAt: now
    };
    if (country === 'FR') {
      next.frRegime = 'HCR';
    } else {
      next.chRegime = 'LGAV';
    }
    jsonSet(PAYROLL_KEY, next);
  }
  function setLockedSelect(id, value, title) {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = value;
    el.disabled = true;
    el.setAttribute('aria-disabled', 'true');
    el.title = title;
    el.style.cursor = 'not-allowed';
    el.style.opacity = '0.82';
  }
  function setReadOnlyInput(id, value, title) {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = value;
    el.readOnly = true;
    el.setAttribute('aria-readonly', 'true');
    el.title = title;
    el.style.cursor = 'default';
    el.style.opacity = '0.9';
  }
  function lockPayrollCountryButtons(country) {
    document
      .querySelectorAll('#payroll-country-segment button')
      .forEach(button => {
        button.disabled = true;
        button.setAttribute('aria-disabled', 'true');
        button.title = 'Automatique : le pays suit la fiche de l’établissement client.';
        button.classList.toggle('active', button.dataset.country === country);
        button.style.cursor = 'not-allowed';
      });
  }
  function syncUi(country) {
    const p = profile(country);
    setLockedSelect(
      'rh-setting-currency',
      p.currency,
      `Automatique selon le pays client : ${p.symbol}`
    );
    setLockedSelect(
      'ps-country',
      p.country,
      'Automatique : le pays suit la fiche de l’établissement client.'
    );
    setLockedSelect(
      'ps-currency',
      p.currency,
      `Automatique selon le pays client : ${p.symbol}`
    );
    setReadOnlyInput(
      'ps-agreement',
      p.agreement,
      'Automatique : convention de travail déterminée par le pays client.'
    );
    if (country === 'FR') {
      setLockedSelect(
        'ps-fr-regime',
        'HCR',
        'Automatique : Convention collective HCR · IDCC 1979.'
      );
    } else {
      setLockedSelect(
        'ps-ch-regime',
        'LGAV',
        'Automatique : CCNT hôtels, restaurants & cafés (L-GAV).'
      );
    }
    lockPayrollCountryButtons(country);
  }
  function syncAll() {
    const country = resolveCountry();
    syncRhSettings(country);
    syncPayroll(country);
    syncUi(country);
    return country;
  }
  // Les anciens boutons France/Suisse ne peuvent plus désynchroniser le client.
  const previousSetPayrollCountry = window.setPayrollCountry;
  window.setPayrollCountry = function() {
    const country = syncAll();
    if (typeof window.renderPayrollCenter === 'function') {
      window.renderPayrollCenter();
    } else if (typeof previousSetPayrollCountry === 'function') {
      // Secours uniquement si le rendu n'est pas encore chargé.
      previousSetPayrollCountry(country);
      syncAll();
    }
  };
  const previousOpenPayrollSettings = window.openPayrollSettings;
  if (typeof previousOpenPayrollSettings === 'function') {
    window.openPayrollSettings = function(...args) {
      syncAll();
      const result = previousOpenPayrollSettings.apply(this, args);
      setTimeout(syncAll, 0);
      return result;
    };
  }
  const previousSavePayrollSettings = window.savePayrollSettingsFromModal;
  if (typeof previousSavePayrollSettings === 'function') {
    window.savePayrollSettingsFromModal = function(...args) {
      const country = resolveCountry();
      const p = profile(country);
      const countryEl = document.getElementById('ps-country');
      const currencyEl = document.getElementById('ps-currency');
      const agreementEl = document.getElementById('ps-agreement');
      const frRegimeEl = document.getElementById('ps-fr-regime');
      const chRegimeEl = document.getElementById('ps-ch-regime');
      if (countryEl) countryEl.value = p.country;
      if (currencyEl) currencyEl.value = p.currency;
      if (agreementEl) agreementEl.value = p.agreement;
      if (frRegimeEl && country === 'FR') frRegimeEl.value = 'HCR';
      if (chRegimeEl && country === 'CH') chRegimeEl.value = 'LGAV';
      const result = previousSavePayrollSettings.apply(this, args);
      syncAll();
      return result;
    };
  }
  const previousRenderPayrollCenter = window.renderPayrollCenter;
  if (typeof previousRenderPayrollCenter === 'function') {
    window.renderPayrollCenter = function(...args) {
      const country = resolveCountry();
      syncRhSettings(country);
      syncPayroll(country);
      const result = previousRenderPayrollCenter.apply(this, args);
      syncUi(country);
      return result;
    };
  }
  window.rhAutoCurrencySymbolV186 = function(currency) {
    return String(currency || '').toUpperCase() === 'EUR' ? '€' : 'CHF';
  };
  window.ICHEF_AUTO_CURRENCY_CONVENTION_V186 = {
    sync: syncAll,
    get country() { return resolveCountry(); },
    get profile() { return profile(resolveCountry()); }
  };
  window.addEventListener('ichef:updateState', () => {
    setTimeout(syncAll, 0);
    setTimeout(syncAll, 500);
  });
  window.addEventListener('ichef:connected', () => {
    setTimeout(syncAll, 350);
    setTimeout(syncAll, 900);
  });
  window.addEventListener('focus', () => {
    setTimeout(syncAll, 0);
  });
  document.addEventListener('ichef:rh-settings-saved', () => {
    setTimeout(syncAll, 0);
  });
  function boot() {
    syncAll();
    // La détection serveur V185 peut arriver juste après le démarrage.
    setTimeout(syncAll, 550);
    setTimeout(syncAll, 1200);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
  window.__ICHEF_RH_BUILD__ = VERSION;
  console.info('[iCHEF RH V186] devise + convention automatiques selon le pays client');
})();


;
/* RH V264 - preserved script #110 */
window.__ICHEF_RH_BUILD__='RH-V186-AUTO-CURRENCY-CONVENTION';
console.info('[iCHEF RH V186] € / CHF + convention de travail automatiques');


;
/* RH V264 - preserved script #111 */
(() => {
  'use strict';
  if (window.__ICHEF_RH_V187_BRIGADE_LIVE_SYNC__) return;
  window.__ICHEF_RH_V187_BRIGADE_LIVE_SYNC__ = true;
  const VERSION = 'RH-V187-BRIGADE-LIVE-SYNC';
  const BRIGADE_ROOT = '#v169-brigade-container';
  let timer = null;
  let syncing = false;
  let rerun = false;
  let queuedReason = 'brigade';
  const safeCall = (fn, ...args) => {
    try {
      return typeof fn === 'function' ? fn(...args) : undefined;
    } catch (error) {
      console.warn('[iCHEF RH V187] appel non bloquant', error);
      return undefined;
    }
  };
  function setSyncState(state, reason) {
    try {
      if (typeof updateSyncBadge === 'function') {
        updateSyncBadge(state, reason || 'brigade');
      }
    } catch (_) {}
  }
  function brigadeSnapshot(settings) {
    const profile = String(
      document.getElementById('rh-setting-establishment-profile')?.value ||
      settings?.planningEstablishmentProfile ||
      'restaurant'
    );
    const roles = typeof readBrigadeRolesFormV169 === 'function'
      ? readBrigadeRolesFormV169()
      : Array.from(document.querySelectorAll('[data-v169-brigade-role]:checked'))
          .map(el => String(el.dataset.v169BrigadeRole || ''))
          .filter(Boolean);
    const counts = typeof readBrigadeRoleCountsV171 === 'function'
      ? readBrigadeRoleCountsV171()
      : {};
    const ratios = typeof readBrigadeRoleRatiosV179 === 'function'
      ? readBrigadeRoleRatiosV179()
      : {};
    const departments = {};
    roles.forEach(key => {
      const parts = String(key).split('::');
      const dept = parts.shift() || 'autre';
      const role = parts.join('::');
      if (!departments[dept]) departments[dept] = [];
      departments[dept].push({
        key,
        role,
        headcount: Math.max(0, Number(counts[key] || 0)),
        ratio: Object.prototype.hasOwnProperty.call(ratios, key)
          ? Math.max(1, Number(ratios[key] || 1))
          : null
      });
    });
    let directory = [];
    try {
      directory = typeof getDir === 'function'
        ? getDir().filter(staff => staff?.active !== false)
        : [];
    } catch (_) {
      directory = [];
    }
    return {
      schema: 'ICHEF_RH_BRIGADE_V187',
      tenantID: String(
        typeof tenantID_JS !== 'undefined'
          ? tenantID_JS
          : (typeof tenantID !== 'undefined' ? tenantID : '')
      ),
      profile,
      roles,
      roleCounts: counts,
      roleRatios: ratios,
      departments,
      activeStaffCount: directory.length,
      serviceLevel: settings?.planningServiceLevel || 'standard',
      currency: settings?.currency || document.getElementById('rh-setting-currency')?.value || 'CHF',
      legalCountry: settings?.planningLegalCountry || 'CH',
      updatedAt: new Date().toISOString(),
      source: 'RH_BRIGADE'
    };
  }
  function refreshConnectedViews(settings) {
    safeCall(
      typeof refreshRhServiceStrategyAdvice !== 'undefined'
        ? refreshRhServiceStrategyAdvice
        : null,
      settings
    );
    safeCall(
      typeof renderRhCashActivityV170 !== 'undefined'
        ? renderRhCashActivityV170
        : null,
      'brigade-live'
    );
    safeCall(
      typeof renderPlanningAssistantLocal !== 'undefined'
        ? renderPlanningAssistantLocal
        : null
    );
    if (
      document.getElementById('ia-predictions-modal')?.classList.contains('show')
    ) {
      safeCall(
        typeof schedulePlanningAssistantAutoRefresh !== 'undefined'
          ? schedulePlanningAssistantAutoRefresh
          : null
      );
    }
  }
  async function syncBrigadeNow(reason = 'brigade-live') {
    if (syncing) {
      rerun = true;
      queuedReason = reason;
      return;
    }
    syncing = true;
    setSyncState(navigator.onLine ? 'syncing' : 'offline', reason);
    try {
      // Source unique : on sauvegarde exactement les valeurs visibles.
      const settings = typeof saveRhPlanningSettings === 'function'
        ? saveRhPlanningSettings(true)
        : (typeof getRhSettings === 'function' ? getRhSettings() : {});
      const snapshot = brigadeSnapshot(settings || {});
      const tasks = [];
      // Noeud serveur dédié : les autres modules peuvent lire la brigade
      // sans avoir à décoder toute la configuration RH.
      if (window.API && typeof window.API.update === 'function') {
        tasks.push(
          Promise.resolve(
            window.API.update('RH_BRIGADE_MASTER', snapshot)
          )
        );
      }
      // Bus temps réel iCHEF : planning, portail staff, administration, etc.
      if (typeof publishRhSymbioseV172 === 'function') {
        tasks.push(
          Promise.resolve(
            publishRhSymbioseV172(
              'rh.brigade.updated',
              snapshot,
              'all'
            )
          )
        );
      }
      safeCall(
        typeof publishRhSettingsV172 !== 'undefined'
          ? publishRhSettingsV172
          : null,
        reason
      );
      safeCall(
        typeof publishRhStaffingV172 !== 'undefined'
          ? publishRhStaffingV172
          : null,
        reason
      );
      window.dispatchEvent(
        new CustomEvent('ichef:brigadeUpdated', {
          detail: snapshot
        })
      );
      let failed = !navigator.onLine;
      if (tasks.length) {
        const results = await Promise.allSettled(tasks);
        failed = failed || results.some(result => {
          if (result.status === 'rejected') return true;
          return result.value?.success === false;
        });
      }
      refreshConnectedViews(settings || {});
      // Le wrapper V161 resynchronise déjà les vues après saveRhPlanningSettings.
      // Ici on garde aussi un signal explicite pour les modules qui écoutent V187.
      safeCall(
        typeof scheduleUiSync !== 'undefined'
          ? scheduleUiSync
          : null,
        'brigade connectée'
      );
      setSyncState(
        failed ? 'offline' : 'ok',
        failed
          ? 'brigade enregistrée localement · serveur en attente'
          : 'brigade synchronisée'
      );
    } catch (error) {
      console.error('[iCHEF RH V187] synchronisation brigade', error);
      setSyncState('offline', 'brigade en attente de synchronisation');
    } finally {
      syncing = false;
      if (rerun) {
        rerun = false;
        const nextReason = queuedReason;
        setTimeout(() => syncBrigadeNow(nextReason), 80);
      }
    }
  }
  function queueBrigadeSync(reason = 'brigade-live', delay = 180) {
    queuedReason = reason;
    clearTimeout(timer);
    timer = setTimeout(() => syncBrigadeNow(queuedReason), delay);
  }
  function isBrigadeField(target) {
    if (!(target instanceof Element)) return false;
    return Boolean(
      target.matches('[data-v169-brigade-role]') ||
      target.matches('[data-v171-brigade-count]') ||
      target.matches('[data-v179-brigade-ratio]') ||
      target.matches('#rh-setting-server-ratio') ||
      target.matches('#rh-setting-kitchen-ratio') ||
      target.matches('#rh-setting-bar-ratio') ||
      target.matches('#rh-setting-kitchen-min')
    );
  }
  // Les champs métier/effectif/ratio deviennent réellement connectés.
  document.addEventListener('change', event => {
    const target = event.target;
    if (!isBrigadeField(target)) return;
    // Cohérence métier <-> effectif.
    if (target.matches('[data-v171-brigade-count]')) {
      const key = String(target.dataset.v171BrigadeCount || '');
      const root = document.querySelector(BRIGADE_ROOT);
      const check = root?.querySelector(
        `[data-v169-brigade-role="${CSS.escape(key)}"]`
      );
      const count = Math.max(0, Math.round(Number(target.value) || 0));
      target.value = String(count);
      if (check) check.checked = count > 0;
    }
    if (target.matches('[data-v179-brigade-ratio]')) {
      const ratio = Math.max(1, Math.min(999, Math.round(Number(target.value) || 1)));
      target.value = String(ratio);
    }
    queueBrigadeSync('brigade · valeur modifiée', 100);
  }, true);
  // TOUT / profil / appliquer brigade modifient plusieurs champs par code :
  // on synchronise juste après que leur gestionnaire historique a terminé.
  document.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    if (
      target.closest('[data-v169-toggle-dept]') ||
      target.closest('[data-v171-profile]') ||
      target.closest('#v169-apply-profile')
    ) {
      setTimeout(
        () => queueBrigadeSync('brigade · profil/équipe modifié', 80),
        0
      );
    }
  }, true);
  // Si le personnel ou les réglages changent ailleurs, l'assistant et
  // les vues de couverture sont recalculés avec la brigade courante.
  window.addEventListener('ichef:staffingUpdated', () => {
    const settings = typeof getRhSettings === 'function' ? getRhSettings() : {};
    refreshConnectedViews(settings);
  });
  window.addEventListener('ichef:updateState', event => {
    const remote = event?.detail?.activeOrders?.RH_BRIGADE_MASTER?.data;
    if (!remote || typeof remote !== 'object') return;
    // RH_SETTINGS reste la source de vérité. Ce noeud sert de diffusion
    // inter-modules ; on rafraîchit seulement les vues quand il arrive.
    const settings = typeof getRhSettings === 'function' ? getRhSettings() : {};
    refreshConnectedViews(settings);
  });
  window.ICHEF_RH_BRIGADE_V187 = {
    sync: syncBrigadeNow,
    snapshot: () => brigadeSnapshot(
      typeof getRhSettings === 'function' ? getRhSettings() : {}
    )
  };
  window.__ICHEF_RH_BUILD__ = VERSION;
  console.info('[iCHEF RH V187] brigade connectée : métiers + effectifs + ratios + planning + serveur');
})();


;
/* RH V264 - preserved script #112 */
window.__ICHEF_RH_BUILD__='RH-V187-BRIGADE-LIVE-SYNC';
console.info('[iCHEF RH V187] brigade synchronisée en temps réel');


;
/* RH V264 - preserved script #113 */
(() => {
  'use strict';
  const VERSION = 'RH-V188-GROSS-SALARY-HOURLY-AUTO';
  function refreshSalaryUi() {
    try {
      if (typeof updateStaffGrossHourlyCost === 'function') {
        updateStaffGrossHourlyCost();
      }
    } catch (error) {
      console.warn('[iCHEF RH V188] rafraîchissement salaire non bloquant', error);
    }
  }
  window.addEventListener('ichef:updateState', () => setTimeout(refreshSalaryUi, 0));
  window.addEventListener('ichef:connected', () => setTimeout(refreshSalaryUi, 200));
  document.addEventListener('ichef:rh-settings-saved', () => setTimeout(refreshSalaryUi, 0));
  window.addEventListener('focus', refreshSalaryUi);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', refreshSalaryUi, { once: true });
  } else {
    refreshSalaryUi();
  }
  window.__ICHEF_RH_BUILD__ = VERSION;
  console.info('[iCHEF RH V188] salaire brut mensuel -> coût horaire brut automatique + devise auto');
})();


;
/* RH V264 - preserved script #114 */
window.__ICHEF_RH_BUILD__='RH-V188-GROSS-SALARY-HOURLY-AUTO';


;
/* RH V264 - preserved script #115 */

window.__ICHEF_RH_BUILD__='RH-V192-FR-CH-13TH-SALARY';
console.info('[iCHEF RH V192] 13e salaire France/Suisse · source juridique · annuel/mensualisé · paie/export');



;
/* RH V264 - preserved script #116 */

(() => {
  'use strict';
  if (window.__ICHEF_RH_V193_PRO_LEGAL__) return;
  window.__ICHEF_RH_V193_PRO_LEGAL__ = true;

  const REF_DATE = '2026-09-29';

  function settings(){
    try { return typeof getRhSettings === 'function' ? getRhSettings() : {}; }
    catch (_) { return {}; }
  }
  function payrollProfile(staffId){
    try {
      const all = JSON.parse(localStorage.getItem('ichef_payroll_profiles_v2') || '{}') || {};
      return all?.[staffId] || all?.[String(staffId)] || {};
    } catch (_) { return {}; }
  }
  function currentStaff(pin){
    try {
      if (!pin || typeof getDir !== 'function') return null;
      return (getDir() || []).find(s => String(s.pin || '') === String(pin)) || null;
    } catch (_) { return null; }
  }
  function annualStatus(staffId,statuses){
    if (!staffId || typeof countAnnualStatusDays !== 'function') return null;
    try { return Number(countAnnualStatusDays(staffId,new Date().getFullYear(),statuses)) || 0; }
    catch (_) { return null; }
  }
  function setText(id,value){
    const el=document.getElementById(id);
    if(el) el.textContent=value;
  }
  function legalModel(){
    const s=settings();
    const country=String(s?.planningLegalCountry||'CH').toUpperCase()==='FR'?'FR':'CH';
    if(country==='FR'){
      return {
        country:'FR',
        countryLabel:'FRANCE',
        framework:'HCR · IDCC 1979 + Code du travail',
        leaveDays:25,
        leaveTitle:'5 semaines / an',
        leaveDetail:'Décompte iCHEF : 25 jours ouvrés équivalents. Référence légale : 30 jours ouvrables / 2,5 jours ouvrables par mois ; un décompte en jours ouvrés est admis s’il garantit un droit au moins équivalent.',
        holidayTitle:'1er Mai + régime HCR',
        holidayDetail:'En établissement permanent : 10 jours fériés en plus du 1er Mai après les conditions d’ancienneté HCR, dont 6 garantis. Le calcul dépend de l’ancienneté et du statut de l’établissement.',
        holidayRule:'6 garantis*',
        offTitle:'2 jours de repos HCR',
        offDetail:'Repos hebdomadaire distinct des congés et des jours fériés. Maximum planifié contrôlé avant publication.',
        restMin:'11 h',
        maxDays:'6 max.',
        note:'France HCR : vacances, jours fériés, repos hebdomadaire et récupération sont des compteurs distincts. Les situations particulières (maladie, mineur, apprentissage, nuit, maternité, accord d’entreprise) sont contrôlées selon les données renseignées.',
        thirteenthDefault:'Selon contrat / accord / usage',
        thirteenthDetail:'Le 13e mois n’est pas activé uniquement du fait de la convention HCR : iCHEF conserve sa source juridique dans le profil paie.'
      };
    }
    return {
      country:'CH',
      countryLabel:'SUISSE',
      framework:'CCNT hôtels-restaurants-cafés + LTr + OLT 1/2',
      leaveDays:35,
      leaveTitle:'5 semaines · 35 jours civils / an',
      leaveDetail:'CCNT : 35 jours civils par année, soit 2,92 jours civils par mois. Les jours de repos ne se cumulent pas avec les jours de vacances.',
      holidayTitle:'6 jours fériés payés / an',
      holidayDetail:'CCNT : 0,5 jour par mois. Les jours fériés sont indépendants des vacances et des jours de repos.',
      holidayRule:'0,5 j/mois',
      offTitle:'2 jours de repos / semaine',
      offDetail:'Au moins un jour entier. Le régime exceptionnel 7 jours n’est utilisé que s’il est explicitement activé et contrôlé.',
      restMin:'11 h',
      maxDays:(settings()?.planningSwissSevenDayException===true?'7* max.':'6 max.'),
      note:'Suisse CCNT : un jour doit être enregistré comme repos, vacances ou jour férié ; plusieurs avoirs ne doivent pas être consommés simultanément.',
      thirteenthDefault:'13e salaire · 100 %',
      thirteenthDetail:'CCNT : 100 % d’un salaire mensuel brut, au prorata si l’année est incomplète ; 8,33 % lorsqu’il est versé mensuellement ou avec le salaire horaire.'
    };
  }

  function thirteenthFor(model,profile,staff){
    const shownInEditor=document.getElementById('staff-modal')?.classList.contains('show');
    const selected=shownInEditor
      ? document.querySelector('input[name="staff-13th-mode"]:checked')?.value
      : '';
    const mode = (selected || staff?.thirteenthMode ||
      (model.country==='CH' ? profile?.chThirteenthMode : profile?.frThirteenthMode)) === 'monthly'
        ? 'monthly' : 'annual';
    const payment=mode==='monthly'?'Mensuel (1/12 séparé)':'Annuel (versement distinct)';
    if(model.country==='CH'){
      return {
        title:`13e salaire · ${payment}`,
        detail:`Salaire brut mensuel hors 13e. ${model.thirteenthDetail}`,
        badge:'CCNT'
      };
    }
    const source=String(profile?.frThirteenthSource||'none');
    const labels={
      contract:'Contrat de travail',
      agreement:'Accord collectif / entreprise',
      usage:'Usage d’entreprise',
      employer:'Engagement employeur',
      none:'Non configuré'
    };
    if(source==='none'){
      return {
        title:'Selon contrat / accord / usage',
        detail:'Aucun droit au 13e mois n’est actuellement identifié dans le profil paie de ce collaborateur.',
        badge:'À CONFIGURER'
      };
    }
    const pct=Math.max(0,Number(profile?.frThirteenthPct||100));
    return {
      title:`Oui · ${pct.toLocaleString('fr-FR',{maximumFractionDigits:2})} % d’un mois`,
      detail:`Source : ${labels[source]||source} · versement ${payment.toLowerCase()}.`,
      badge:'DROIT IDENTIFIÉ'
    };
  }

  function updateChecklist(model,staff,profile){
    const checks=[...document.querySelectorAll('#staff-legal-checklist .staff-pro-check')];
    const contractType=(document.getElementById('staff-contract-type')?.value||profile?.contractType||'').trim();
    const startDate=(document.getElementById('staff-start-date')?.value||profile?.startDate||'').trim();
    const birthDate=(document.getElementById('staff-birth-date')?.value||profile?.birthDate||'').trim();
    const minRest=Number(document.getElementById('staff-min-rest')?.value||0);
    const maxDays=Number(document.getElementById('staff-max-consecutive')?.value||0);
    const maxAllowed=model.country==='CH'&&settings()?.planningSwissSevenDayException===true?7:6;

    const rows=[
      {ok:true,text:`${model.country} · ${model.framework}`},
      {ok:Boolean(contractType&&startDate),warn:!contractType||!startDate,text:contractType&&startDate?'Contrat + date d’entrée renseignés':'Type de contrat ou date d’entrée manquant'},
      {ok:true,text:'Vacances / fériés / OFF / récupération séparés'},
      {ok:minRest>=11&&maxDays<=maxAllowed,block:minRest<11||maxDays>maxAllowed,text:minRest>=11&&maxDays<=maxAllowed?'Garde-fous internes compatibles':'Repos ou jours consécutifs à corriger'}
    ];
    if(/APPRENT/i.test(contractType)&&!birthDate){
      rows[1]={ok:false,warn:true,text:'Apprentissage : date de naissance à renseigner'};
    }
    checks.forEach((el,i)=>{
      const r=rows[i]||{};
      el.classList.remove('ok','warn','block');
      el.classList.add(r.block?'block':r.ok?'ok':'warn');
      const b=el.querySelector('b');
      const s=el.querySelector('span');
      if(b) b.textContent=r.block?'BLOQUANT':r.ok?'OK':'À COMPLÉTER';
      if(s) s.textContent=r.text;
    });

    const status=document.getElementById('staff-legal-status-pill');
    if(status){
      const hasBlock=rows.some(r=>r.block);
      const hasWarn=rows.some(r=>!r.ok&&!r.block);
      status.className=`staff-pro-status ${hasBlock?'block':hasWarn?'warn':'ok'}`;
      status.textContent=hasBlock?'À CORRIGER':hasWarn?'DOSSIER À COMPLÉTER':'RÉFÉRENTIEL ACTIF';
    }
  }

  window.updateStaffProfessionalLegalUIV193=function(pin=null){
    const model=legalModel();
    const staff=currentStaff(pin||document.getElementById('staff-edit-original-pin')?.value);
    const profile=payrollProfile(staff?.id);
    const leaveInput=document.getElementById('staff-leave-days');
    if(leaveInput) leaveInput.value=String(model.leaveDays);

    setText('staff-legal-country-badge',model.countryLabel);
    setText('staff-legal-framework',model.framework);
    setText('staff-legal-reference',`Référentiel vérifié · ${REF_DATE}`);
    setText('staff-right-leave-title',model.leaveTitle);
    setText('staff-right-leave-detail',model.leaveDetail);
    setText('staff-right-holiday-title',model.holidayTitle);
    setText('staff-right-holiday-detail',model.holidayDetail);
    setText('staff-right-holiday-rule',model.holidayRule);
    setText('staff-right-off-title',model.offTitle);
    setText('staff-right-off-detail',model.offDetail);
    setText('staff-right-rest-min',model.restMin);
    setText('staff-right-max-days',model.maxDays);
    setText('staff-rights-legal-note',model.note);

    const leaveUsed=annualStatus(staff?.id,['conge']);
    const holidayUsed=annualStatus(staff?.id,['ferie']);
    const carry=Math.max(0,Number(document.getElementById('staff-leave-carryover')?.value||0));
    setText('staff-right-leave-used',leaveUsed===null?'—':`${leaveUsed.toLocaleString('fr-FR',{maximumFractionDigits:1})} j`);
    setText('staff-right-leave-remaining',leaveUsed===null?'—':`${Math.max(0,model.leaveDays+carry-leaveUsed).toLocaleString('fr-FR',{maximumFractionDigits:1})} j`);
    setText('staff-right-holiday-used',holidayUsed===null?'—':`${holidayUsed.toLocaleString('fr-FR',{maximumFractionDigits:1})} j`);

    const t=thirteenthFor(model,profile,staff);
    setText('staff-right-13th-title',t.title);
    setText('staff-right-13th-detail',t.detail);
    setText('staff-right-13th-badge',t.badge);

    updateChecklist(model,staff,profile);
  };

  document.addEventListener('input',e=>{
    if(['staff-contract-type','staff-start-date','staff-end-date','staff-birth-date','staff-leave-carryover','staff-min-rest','staff-max-consecutive'].includes(e.target?.id)){
      updateStaffProfessionalLegalUIV193(document.getElementById('staff-edit-original-pin')?.value||null);
    }
  },true);
  document.addEventListener('change',e=>{
    if(['staff-contract-type','staff-start-date','staff-end-date','staff-birth-date'].includes(e.target?.id)){
      updateStaffProfessionalLegalUIV193(document.getElementById('staff-edit-original-pin')?.value||null);
    }
  },true);
  document.addEventListener('ichef:rh-settings-saved',()=>setTimeout(()=>updateStaffProfessionalLegalUIV193(document.getElementById('staff-edit-original-pin')?.value||null),0));
  window.addEventListener('ichef:updateState',()=>setTimeout(()=>updateStaffProfessionalLegalUIV193(document.getElementById('staff-edit-original-pin')?.value||null),0));

  window.__ICHEF_RH_BUILD__='RH-V193-PRO-LEGAL';
  console.info('[iCHEF RH V193] fiche RH professionnelle · droits séparés · contrat synchronisé paie · référentiel légal visible');
})();



;
/* RH V264 - preserved script #117 */

(() => {
  window.__ICHEF_RH_BUILD__='RH-V195-LIGHT-PRO';
  document.documentElement.dataset.ichefTheme='light-pro';
  console.info('[iCHEF RH V195] Light Pro · fond blanc · police noire · logique métier conservée');
})();



;
/* RH V264 - preserved script #118 */

(() => {
  'use strict';
  if (window.__ICHEF_RH_V196_AUTO_CURRENCY_ZONE__) return;
  window.__ICHEF_RH_V196_AUTO_CURRENCY_ZONE__ = true;

  const VERSION = 'RH-V196-AUTO-EUR-CHF';
  const RH_SETTINGS_KEY = 'ichef_rh_settings';
  const PAYROLL_KEY = 'ichef_payroll_settings_v2';

  const safeJson = (raw, fallback={}) => {
    try { return JSON.parse(raw || '') || fallback; }
    catch (_) { return fallback; }
  };
  const getJson = (key, fallback={}) => safeJson(localStorage.getItem(key), fallback);
  const setJson = (key, value) => {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (_) { return false; }
  };

  function normCountry(value){
    const raw = String(value ?? '').trim().toUpperCase();
    if (!raw) return '';
    if (
      raw === 'FR' || raw === 'FRA' || raw === 'FRANCE' ||
      raw.includes('FRANCE')
    ) return 'FR';
    if (
      raw === 'CH' || raw === 'CHE' || raw === 'SUISSE' ||
      raw === 'SWITZERLAND' || raw === 'SCHWEIZ' || raw === 'SVIZZERA' ||
      raw.includes('SUISSE') || raw.includes('SWITZERLAND') ||
      raw.includes('SCHWEIZ') || raw.includes('SVIZZERA')
    ) return 'CH';
    return '';
  }

  function normCurrency(value){
    const raw = String(value ?? '').trim().toUpperCase();
    if (raw === 'EUR' || raw === '€') return 'FR';
    if (raw === 'CHF') return 'CH';
    return '';
  }

  function profile(country){
    return country === 'FR'
      ? {
          country:'FR',
          countryLabel:'France',
          currency:'EUR',
          symbol:'€',
          agreement:'Convention collective HCR · IDCC 1979',
          legalFramework:'FR_HCR'
        }
      : {
          country:'CH',
          countryLabel:'Suisse',
          currency:'CHF',
          symbol:'CHF',
          agreement:'CCNT hôtels, restaurants & cafés (L-GAV)',
          legalFramework:'CH_CCNT'
        };
  }

  function readObjectCountry(obj){
    if (!obj || typeof obj !== 'object') return '';
    const countryKeys = [
      'countryCode','country_code','country','pays',
      'companyCountry','company_country',
      'establishmentCountry','establishment_country',
      'businessCountry','business_country',
      'clientCountry','client_country',
      'tenantCountry','tenant_country',
      'legalCountry','legal_country'
    ];
    for (const key of countryKeys) {
      if (Object.prototype.hasOwnProperty.call(obj,key)) {
        const c = normCountry(obj[key]);
        if (c) return c;
      }
    }
    const currencyKeys = ['currency','devise','currencyCode','currency_code'];
    for (const key of currencyKeys) {
      if (Object.prototype.hasOwnProperty.call(obj,key)) {
        const c = normCurrency(obj[key]);
        if (c) return c;
      }
    }
    return '';
  }

  function detectFromState(){
    const state = window.ICHEF_LIVE_STATE;
    if (!state || typeof state !== 'object') return null;

    const candidates = [
      ['Établissement', state.establishment],
      ['Entreprise', state.company],
      ['Tenant', state.tenant],
      ['Client', state.client],
      ['Business', state.business],
      ['Configuration', state.settings],
      ['Profil', state.profile],
      ['État client', state]
    ];
    for (const [source,obj] of candidates) {
      const country = readObjectCountry(obj);
      if (country) return {country,source:`${source} connecté`};
    }

    const orders = state.activeOrders || {};
    const keys = Object.keys(orders).filter(k =>
      /(ESTABLISH|COMPANY|TENANT|CLIENT|BUSINESS|SETTING|CONFIG|PROFILE|VENUE|RESTAURANT|HOTEL)/i.test(String(k))
    );
    for (const key of keys) {
      const node = orders[key];
      const payload = node && typeof node === 'object' && 'data' in node ? node.data : node;
      const country = readObjectCountry(payload);
      if (country) return {country,source:`Serveur · ${key}`};
    }
    return null;
  }

  function detectCountry(){
    // 1. Détection automatique déjà faite par le moteur établissement V185.
    const v185 = normCountry(window.ICHEF_CLIENT_COUNTRY_V185?.current?.country);
    if (v185) {
      return {
        country:v185,
        source:window.ICHEF_CLIENT_COUNTRY_V185?.current?.source || 'Détection établissement iCHEF'
      };
    }

    // 2. État connecté du client / établissement.
    const live = detectFromState();
    if (live) return live;

    // 3. Fiche locale explicite de l'établissement.
    const localCountryKeys = [
      'ichef_establishment_country',
      'ichef_client_country',
      'ichef_company_country',
      'ichef_business_country',
      'ichef_country',
      'establishment_country',
      'client_country'
    ];
    for (const key of localCountryKeys) {
      const c = normCountry(localStorage.getItem(key));
      if (c) return {country:c,source:`Fiche établissement · ${key}`};
    }

    // 4. Référentiel RH déjà enregistré.
    try {
      if (typeof getRhSettings === 'function') {
        const s = getRhSettings() || {};
        const c = normCountry(s.planningLegalCountry) || normCurrency(s.currency);
        if (c) return {country:c,source:'Référentiel RH enregistré'};
      }
    } catch (_) {}

    // 5. Profil paie entreprise.
    const pay = getJson(PAYROLL_KEY,{});
    const pc = normCountry(pay.country) || normCurrency(pay.currency);
    if (pc) return {country:pc,source:'Configuration paie entreprise'};

    // 6. Dernière détection V185 par tenant.
    try {
      const tenant =
        typeof tenantID_JS !== 'undefined' && tenantID_JS
          ? String(tenantID_JS)
          : 'default';
      const saved = getJson(`ichef_client_country_detected_v185_${tenant}`,{});
      const c = normCountry(saved.country);
      if (c) return {country:c,source:saved.source || 'Dernière détection établissement'};
    } catch (_) {}

    // Compatibilité historique : iCHEF était initialement configuré Suisse.
    return {country:'CH',source:'Configuration de secours iCHEF'};
  }

  function persistCountryAndCurrency(detected){
    const p = profile(detected.country);

    // RH : ne jamais réécrire / renvoyer RH_SETTINGS si la valeur utile
    // est déjà correcte. V196 pouvait auparavant déclencher API.update()
    // sur de simples mutations d'interface.
    let rh = {};
    try {
      rh = typeof getRhSettings === 'function'
        ? (getRhSettings() || {})
        : getJson(RH_SETTINGS_KEY,{});
    } catch (_) {
      rh = getJson(RH_SETTINGS_KEY,{});
    }

    const stableSource = String(
      rh.planningLegalCountrySource ||
      detected.source ||
      'établissement'
    );

    const rhNeedsWrite =
      String(rh.currency || '') !== p.currency ||
      String(rh.planningLegalCountry || '').toUpperCase() !== p.country ||
      String(rh.planningLegalFramework || '') !== p.legalFramework ||
      rh.planningLegalCountryAuto !== true ||
      !String(rh.planningLegalCountrySource || '').trim();

    if (rhNeedsWrite) {
      const nextRh = {
        ...rh,
        currency:p.currency,
        planningLegalCountry:p.country,
        planningLegalFramework:p.legalFramework,
        planningLegalCountryAuto:true,
        planningLegalCountrySource:stableSource
      };
      if (typeof saveRhSettings === 'function') {
        try { saveRhSettings(nextRh); }
        catch (_) { setJson(RH_SETTINGS_KEY,nextRh); }
      } else {
        setJson(RH_SETTINGS_KEY,nextRh);
      }
    }

    // Paie : même principe, écriture locale uniquement si une valeur change.
    const pay = getJson(PAYROLL_KEY,{});
    const expectedRegime = p.country === 'FR' ? 'HCR' : 'LGAV';
    const currentRegime = p.country === 'FR' ? pay.frRegime : pay.chRegime;
    const payNeedsWrite =
      String(pay.country || '').toUpperCase() !== p.country ||
      String(pay.currency || '').toUpperCase() !== p.currency ||
      String(pay.agreement || '') !== p.agreement ||
      currentRegime !== expectedRegime ||
      pay.autoCountryFromTenant !== true ||
      pay.autoCurrencyFromCountry !== true ||
      pay.autoAgreementFromCountry !== true;

    if (payNeedsWrite) {
      const now = new Date().toISOString();
      const nextPay = {
        ...pay,
        country:p.country,
        currency:p.currency,
        agreement:p.agreement,
        autoCountryFromTenant:true,
        autoCurrencyFromCountry:true,
        autoAgreementFromCountry:true,
        autoCountryUpdatedAt:now,
        autoCurrencyUpdatedAt:now,
        autoAgreementUpdatedAt:now
      };
      if (p.country === 'FR') nextPay.frRegime = 'HCR';
      else nextPay.chRegime = 'LGAV';
      setJson(PAYROLL_KEY,nextPay);
    }

    return p;
  }

  function lockSelect(id,value,title){
    const el = document.getElementById(id);
    if (!el) return;
    el.value = value;
    el.disabled = true;
    el.setAttribute('aria-disabled','true');
    el.title = title;
    el.style.cursor = 'not-allowed';
  }

  function setText(id,value){
    const el = document.getElementById(id);
    const next = String(value ?? '');
    if (el && el.textContent !== next) el.textContent = next;
  }

  function updateCurrencyLabels(p){
    // Fiche employé
    setText('staff-gross-currency-label',p.symbol);
    setText('staff-hourly-currency-label',p.symbol);
    setText('staff-actual-cost-currency-label',p.symbol);

    // Paramètres RH / Paie
    lockSelect(
      'rh-setting-currency',
      p.currency,
      `Automatique : ${p.countryLabel} = ${p.currency} (${p.symbol})`
    );
    lockSelect(
      'ps-country',
      p.country,
      `Automatique : établissement ${p.countryLabel}`
    );
    lockSelect(
      'ps-currency',
      p.currency,
      `Automatique : ${p.countryLabel} = ${p.currency} (${p.symbol})`
    );

    const agreement = document.getElementById('ps-agreement');
    if (agreement) {
      agreement.value = p.agreement;
      agreement.readOnly = true;
      agreement.setAttribute('aria-readonly','true');
      agreement.title = 'Automatique selon le pays de l’établissement.';
    }

    document.querySelectorAll('#payroll-country-segment button').forEach(btn => {
      btn.disabled = true;
      btn.setAttribute('aria-disabled','true');
      btn.classList.toggle('active',String(btn.dataset.country||'').toUpperCase()===p.country);
      btn.title = `Pays automatique : ${p.countryLabel}`;
    });

    // Bouton d'optimisation : symbole cohérent partout.
    document.querySelectorAll('[data-v109-mode="cost"]').forEach(btn => {
      const small = btn.querySelector('small');
      const detail = small?.textContent || 'Optimise les effectifs sans ignorer les contraintes';
      const nextHtml = `${p.symbol} Réduire les coûts<small>${detail}</small>`;
      if (btn.innerHTML !== nextHtml) btn.innerHTML = nextHtml;
    });

    // Badge visible de la détection.
    const badge = document.getElementById('v185-country-auto-badge');
    if (badge) {
      const nextBadge = p.country === 'FR'
        ? 'AUTO · FRANCE · €'
        : 'AUTO · SUISSE · CHF';
      if (badge.textContent !== nextBadge) badge.textContent = nextBadge;
    }

    // Command Center
    setText('staff-legal-country-badge',p.country === 'FR' ? 'FRANCE · €' : 'SUISSE · CHF');
  }

  function updateKnownMoneySuffixes(p){
    // Certains éléments sont recréés dynamiquement. On ne remplace JAMAIS
    // les montants légaux spécifiques à un pays ; uniquement les unités
    // explicitement marquées comme devise de l'établissement.
    document.querySelectorAll('[data-ichef-currency-symbol]').forEach(el => {
      if (el.textContent !== p.symbol) el.textContent = p.symbol;
    });
    document.querySelectorAll('[data-ichef-currency-code]').forEach(el => {
      if (el.textContent !== p.currency) el.textContent = p.currency;
    });
  }

  let applying = false;
  let lastKey = '';

  function apply(reason='sync'){
    if (applying) return null;
    applying = true;
    try {
      const detected = detectCountry();
      const p = persistCountryAndCurrency(detected);
      updateCurrencyLabels(p);
      updateKnownMoneySuffixes(p);

      const key = `${p.country}|${p.currency}|${detected.source}`;
      if (key !== lastKey) {
        lastKey = key;
        window.dispatchEvent(new CustomEvent('ichef:currency-country-applied',{
          detail:{
            version:VERSION,
            country:p.country,
            countryLabel:p.countryLabel,
            currency:p.currency,
            symbol:p.symbol,
            source:detected.source,
            reason,
            at:new Date().toISOString()
          }
        }));
      }

      window.ICHEF_AUTO_CURRENCY_V196 = {
        country:p.country,
        currency:p.currency,
        symbol:p.symbol,
        source:detected.source,
        version:VERSION
      };
      return window.ICHEF_AUTO_CURRENCY_V196;
    } finally {
      applying = false;
    }
  }

  // Rendre les helpers accessibles aux autres modules.
  window.iChefCurrencyProfile = function(){
    const d = detectCountry();
    return {...profile(d.country),source:d.source};
  };
  window.iChefCurrencySymbol = function(){
    return window.iChefCurrencyProfile().symbol;
  };
  window.iChefCurrencyCode = function(){
    return window.iChefCurrencyProfile().currency;
  };
  window.iChefApplyAutoCurrency = apply;

  // Renforcer les anciens points d'entrée sans changer leur comportement métier.
  const priorRenderPayroll = window.renderPayrollCenter;
  if (typeof priorRenderPayroll === 'function') {
    window.renderPayrollCenter = function(...args){
      apply('before-payroll-render');
      const result = priorRenderPayroll.apply(this,args);
      queueMicrotask(() => apply('after-payroll-render'));
      return result;
    };
  }

  const priorOpenStaff = window.openStaffModal;
  if (typeof priorOpenStaff === 'function') {
    window.openStaffModal = function(...args){
      apply('before-staff-modal');
      const result = priorOpenStaff.apply(this,args);
      queueMicrotask(() => apply('after-staff-modal'));
      return result;
    };
  }

  // Les composants peuvent être reconstruits dynamiquement : resynchroniser
  // les libellés sans toucher aux calculs.
  let mutationTimer = null;
  const relevantCurrencySelector = [
    '#staff-modal',
    '#payroll-interface',
    '#payroll-settings-modal',
    '#payroll-profile-modal',
    '#rh-ai-settings-v103',
    '[data-ichef-currency-symbol]',
    '[data-ichef-currency-code]'
  ].join(',');

  const observer = new MutationObserver(mutations => {
    const relevant = mutations.some(mutation =>
      [...(mutation.addedNodes || [])].some(node =>
        node?.nodeType === 1 &&
        (
          node.matches?.(relevantCurrencySelector) ||
          node.querySelector?.(relevantCurrencySelector)
        )
      )
    );
    if (!relevant) return;
    clearTimeout(mutationTimer);
    mutationTimer = setTimeout(() => apply('ui-structure'),120);
  });

  function boot(){
    apply('boot');
    if (document.body) {
      observer.observe(document.body,{childList:true,subtree:true});
    }
    // Un seul fallback léger. Les vrais changements serveur déclenchent
    // déjà ichef:connected / ichef:updateState.
    setTimeout(() => apply('boot-fallback'),650);
  }

  window.addEventListener('ichef:updateState',() => setTimeout(() => apply('state-update'),0));
  window.addEventListener('ichef:connected',() => setTimeout(() => apply('connected'),250));
  window.addEventListener('focus',() => setTimeout(() => apply('focus'),0));
  document.addEventListener('ichef:rh-settings-saved',() => setTimeout(() => apply('rh-settings'),0));
  window.addEventListener('storage',e => {
    if (
      e.key === RH_SETTINGS_KEY ||
      e.key === PAYROLL_KEY ||
      /country/i.test(String(e.key||''))
    ) {
      setTimeout(() => apply('storage'),0);
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded',boot,{once:true});
  } else {
    boot();
  }

  window.__ICHEF_RH_BUILD__ = VERSION;
  console.info('[iCHEF RH V196] France = EUR (€) · Suisse = CHF · détection automatique établissement');
})();



;
/* RH V264 - preserved script #119 */

window.__ICHEF_RH_BUILD__='RH-V196-AUTO-EUR-CHF';
console.info('[iCHEF RH V196] devise automatique FR € / CH CHF');



;
/* RH V264 - preserved script #120 */

window.__ICHEF_RH_BUILD__='RH-V197-GLOBAL-LIGHT-FIX';
document.documentElement.dataset.ichefTheme='light-monochrome-pro';
console.info('[iCHEF RH V197] fond blanc · cadres blancs/gris · bordures noires · texte noir');



;
/* RH V264 - preserved script #121 */

(() => {
  'use strict';
  if (window.__ICHEF_RH_V198_LIGHT_LAYOUT__) return;
  window.__ICHEF_RH_V198_LIGHT_LAYOUT__ = true;

  function syncPlanningLayoutV198(){
    const hr = document.getElementById('hr-interface');
    const globalView = document.getElementById('global-view-container');
    if (!hr || !globalView) return;
    const globalVisible =
      globalView.style.display === 'block' ||
      getComputedStyle(globalView).display === 'block';
    hr.classList.toggle('rh-v198-global-fit', globalVisible);
  }

  const globalView = document.getElementById('global-view-container');
  if (globalView) {
    new MutationObserver(syncPlanningLayoutV198).observe(globalView,{
      attributes:true,attributeFilter:['style','class']
    });
  }
  const hr = document.getElementById('hr-interface');
  if (hr) {
    new MutationObserver(syncPlanningLayoutV198).observe(hr,{
      attributes:true,attributeFilter:['style']
    });
  }

  document.addEventListener('click',event => {
    if (
      event.target?.closest?.('#btn-toggle-view') ||
      event.target?.closest?.('[onclick*="selectStaff"]') ||
      event.target?.closest?.('[onclick*="openInterface"]')
    ) setTimeout(syncPlanningLayoutV198,0);
  },true);

  window.syncPlanningLayoutV198=syncPlanningLayoutV198;
  window.addEventListener('resize',syncPlanningLayoutV198);
  document.addEventListener('DOMContentLoaded',syncPlanningLayoutV198);
  setTimeout(syncPlanningLayoutV198,50);
  setTimeout(syncPlanningLayoutV198,500);

  window.__ICHEF_RH_BUILD__='RH-V198-LIGHT-LAYOUT-FIX';
  console.info('[iCHEF RH V198] couleurs résiduelles corrigées + planning plein écran optimisé');
})();



;
/* RH V264 - preserved script #122 */

window.__ICHEF_RH_BUILD__='RH-V198-LIGHT-LAYOUT-FIX';



;
/* RH V264 - preserved script #123 */

(() => {
  'use strict';
  if (window.__ICHEF_RH_V199_ASSISTANCE_FIX__) return;
  window.__ICHEF_RH_V199_ASSISTANCE_FIX__ = true;

  function repairModal(id){
    const modal=document.getElementById(id);
    if(!modal) return;

    const content=modal.querySelector('.modal-content');
    if(content){
      content.style.removeProperty('transform');
      content.style.removeProperty('top');
      content.style.removeProperty('left');
      content.style.removeProperty('right');
      content.style.removeProperty('bottom');
      content.style.removeProperty('position');
    }

    /* Si la modale est ouverte, elle reste dans le viewport. */
    const visible =
      modal.classList.contains('show') ||
      getComputedStyle(modal).display !== 'none';

    if(visible && content){
      requestAnimationFrame(() => {
        try{
          const r=content.getBoundingClientRect();
          if(r.top < 0 || r.left < -2 || r.right > innerWidth + 2){
            content.scrollIntoView({block:'start',inline:'nearest'});
          }
        }catch(_){}
      });
    }
  }

  function repairAll(){
    repairModal('ia-predictions-modal');
    repairModal('rh-ai-settings-v103');
  }

  /* Répare après les fonctions historiques qui construisent les réglages IA. */
  const previousPlanningSettings=window.openRhPlanningSettingsV103;
  if(typeof previousPlanningSettings==='function'){
    window.openRhPlanningSettingsV103=function(...args){
      const result=previousPlanningSettings.apply(this,args);
      requestAnimationFrame(repairAll);
      return result;
    };
  }

  const previousAssistant=window.openPlanningAssistant;
  if(typeof previousAssistant==='function'){
    window.openPlanningAssistant=function(...args){
      const result=previousAssistant.apply(this,args);
      requestAnimationFrame(repairAll);
      return result;
    };
  }

  /* Les deux interfaces sont très dynamiques : surveiller seulement leurs
     attributs et enfants, sans relancer les calculs métier. */
  function observe(id){
    const el=document.getElementById(id);
    if(!el) return;
    let frame=0;
    new MutationObserver(mutations => {
      const relevant=mutations.some(m =>
        m.type==='childList' ||
        (m.type==='attributes' && m.target===el && m.attributeName==='class')
      );
      if(!relevant || frame) return;
      frame=requestAnimationFrame(()=>{
        frame=0;
        repairModal(id);
      });
    }).observe(el,{attributes:true,childList:true,subtree:true,attributeFilter:['class']});
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',()=>{
      observe('ia-predictions-modal');
      observe('rh-ai-settings-v103');
      repairAll();
    },{once:true});
  }else{
    observe('ia-predictions-modal');
    observe('rh-ai-settings-v103');
    repairAll();
  }

  window.__ICHEF_RH_BUILD__='RH-V199-ASSISTANCE-LIGHT-MODAL-FIX';
  console.info('[iCHEF RH V199] assistance planning claire + modales au premier plan');
})();



;
/* RH V264 - preserved script #124 */

window.__ICHEF_RH_BUILD__='RH-V199-ASSISTANCE-LIGHT-MODAL-FIX';



;
/* RH V264 - preserved script #125 */

(() => {
  'use strict';
  if (window.__ICHEF_RH_V200_FAST_MANUAL__) return;
  window.__ICHEF_RH_V200_FAST_MANUAL__ = true;

  const VERSION = 'RH-V200-FAST-MANUAL-PLANNING';
  const selected = new Set();
  const STATUS_WORK = new Set(['present','off_matin','off_soir','ferie']);
  let selectionMode = false;
  let brushMode = false;
  let drawerCtx = null;
  let drawerScope = 'day';
  let clipboard = null;
  let lastSelected = null;
  let currentToolbarStatus = 'present';
  let currentToolbarTemplate = 'coupure';

  const esc = v => String(v ?? '').replace(/[&<>"']/g,c=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));

  function toast(message){
    let el=document.getElementById('rh-v200-toast');
    if(!el){
      el=document.createElement('div');
      el.id='rh-v200-toast';
      document.body.appendChild(el);
    }
    el.textContent=String(message||'');
    el.classList.add('show');
    clearTimeout(el._t);
    el._t=setTimeout(()=>el.classList.remove('show'),1700);
  }

  function monthValue(){
    return String(document.getElementById('month-selector')?.value||'');
  }

  function dateStringFromDay(day){
    const month=monthValue();
    return month ? `${month}-${String(Number(day)).padStart(2,'0')}` : '';
  }

  function keyOf(staffId,dateStr){
    return `${String(staffId)}|${String(dateStr)}`;
  }

  function parseKey(key){
    const idx=String(key).indexOf('|');
    return {
      staffId:String(key).slice(0,idx),
      dateStr:String(key).slice(idx+1)
    };
  }

  function staffById(id){
    try{
      return typeof getDir==='function'
        ? (getDir()||[]).find(s=>String(s.id)===String(id))
        : null;
    }catch(_){ return null; }
  }

  function getPlan(staffId,dateStr){
    const [y,m,d]=String(dateStr).split('-').map(Number);
    const month=`${y}-${String(m).padStart(2,'0')}`;
    const ts=typeof getTs==='function'?getTs():{};
    const staff=staffById(staffId);
    const raw=ts?.[month]?.[String(staffId)]?.[d]
      || ts?.[month]?.[String(staffId)]?.[String(d)]
      || ts?.[month]?.[staffId]?.[d]
      || {};
    return {
      month,day:d,staff,
      plan:{
        status:'off',
        poste:staff?.dept||'salle',
        s1:'',
        s2:'',
        pause:0,
        obs:'',
        managerNote:'',
        ...raw
      }
    };
  }

  function settings(){
    try{return typeof getRhSettings==='function'?(getRhSettings()||{}):{}}
    catch(_){return{}}
  }

  function defaultTemplates(){
    const s=settings();
    const lunchStart=String(s.lunchWorkStart||s.lunchStart||'10:00');
    const lunchEnd=String(s.lunchWorkEnd||s.lunchEnd||'14:45');
    const dinnerStart=String(s.dinnerWorkStart||s.dinnerStart||'18:00');
    const dinnerEnd=String(s.dinnerWorkEnd||s.dinnerEnd||'22:45');
    return [
      {id:'matin',name:'Matin',status:'off_soir',s1:`${lunchStart}-${lunchEnd}`,s2:'',pause:0},
      {id:'soir',name:'Soir',status:'off_matin',s1:'',s2:`${dinnerStart}-${dinnerEnd}`,pause:0},
      {id:'coupure',name:'Coupure',status:'present',s1:`${lunchStart}-${lunchEnd}`,s2:`${dinnerStart}-${dinnerEnd}`,pause:30},
      {id:'journee',name:'Journée',status:'present',s1:'08:00-16:00',s2:'',pause:30},
      {id:'fermeture',name:'Fermeture',status:'present',s1:'',s2:'16:00-23:00',pause:30}
    ];
  }

  function templateStorageKey(){
    let tenant='default';
    try{
      tenant=String(
        (typeof tenantID_JS!=='undefined'&&tenantID_JS) ||
        (typeof tenantID!=='undefined'&&tenantID) ||
        localStorage.getItem('ichef_tenant_id') ||
        'default'
      );
    }catch(_){}
    return `ichef_rh_shift_templates_v200_${tenant}`;
  }

  function getTemplates(){
    const defs=defaultTemplates();
    try{
      const custom=JSON.parse(localStorage.getItem(templateStorageKey())||'[]');
      return Array.isArray(custom)?[...defs,...custom]:defs;
    }catch(_){return defs}
  }

  function saveCustomTemplate(tpl){
    try{
      const key=templateStorageKey();
      const current=JSON.parse(localStorage.getItem(key)||'[]');
      const list=Array.isArray(current)?current:[];
      list.push(tpl);
      localStorage.setItem(key,JSON.stringify(list.slice(-20)));
      return true;
    }catch(_){return false}
  }

  function templateById(id){
    return getTemplates().find(t=>String(t.id)===String(id)) || getTemplates()[0];
  }

  function planFromTemplate(id,base={}){
    const t=templateById(id);
    return {
      ...base,
      status:t?.status||'present',
      poste:base.poste||'salle',
      s1:String(t?.s1||''),
      s2:String(t?.s2||''),
      pause:Number(t?.pause||0)
    };
  }

  function normalizedCandidate(base,next){
    let p={...base,...next};
    p.status=String(p.status||'off');
    p.categoryId=String(p.categoryId||base.categoryId||p.status||'off');
    p.poste=String(p.poste||base.poste||'salle');
    p.s1=String(p.s1||'').trim();
    p.s2=String(p.s2||'').trim();
    p.pause=Math.max(0,Math.min(240,Number(p.pause)||0));
    p.obs=String(p.obs||'').trim().slice(0,500);
    p.managerNote=String(p.managerNote||'').trim().slice(0,40);

    if(!STATUS_WORK.has(p.status)){
      p.s1='';p.s2='';p.pause=0;
    }
    if(p.status==='off_soir') p.s2='';
    if(p.status==='off_matin') p.s1='';
    return p;
  }

  function comparable(n){
    return JSON.stringify({
      status:String(n?.status||'off'),
      categoryId:String(n?.categoryId||n?.status||'off'),
      poste:String(n?.poste||''),
      s1:String(n?.s1||''),
      s2:String(n?.s2||''),
      pause:Number(n?.pause||0),
      obs:String(n?.obs||''),
      managerNote:String(n?.managerNote||'')
    });
  }

  function validatePlan(p){
    const pat=/^\d{1,2}:\d{2}-\d{1,2}:\d{2}$/;
    if(p.s1&&!pat.test(p.s1)) return 'Horaire matin invalide. Exemple : 10:00-14:45';
    if(p.s2&&!pat.test(p.s2)) return 'Horaire soir invalide. Exemple : 18:00-22:45';
    return '';
  }

  function actor(){
    try{
      if(typeof window.rhAuditActorV94==='function') return window.rhAuditActorV94();
    }catch(_){}
    return 'Direction / RH';
  }

  function planningWindow(dateStr,before,after){
    try{
      if(typeof window.rhPlanningChangeWindowV102==='function'){
        return window.rhPlanningChangeWindowV102(dateStr,before,after);
      }
    }catch(_){}
    const dt=new Date(`${dateStr}T12:00:00`);
    return dt.getTime()<=Date.now()
      ? {needsReason:true,kind:'STARTED_OR_PAST'}
      : {needsReason:false,kind:'NORMAL'};
  }

  function ensureEditable(){
    const s=settings();
    if(String(s.planningStatus||'draft')!=='locked') return true;
    const ok=confirm('Ce planning est verrouillé. Voulez-vous le repasser en BROUILLON pour le modifier ?');
    if(!ok) return false;
    try{saveRhSettings?.({...s,planningStatus:'draft'});}catch(_){}
    return true;
  }

  function horizonAccepts(dateStr){
    try{
      const h=window.getRhPlanningHorizonEnd?.();
      if(!h) return true;
      const d=new Date(`${dateStr}T12:00:00`);
      return Number.isNaN(d.getTime()) || d.getTime()<=h.getTime();
    }catch(_){return true}
  }

  async function applyToTargets(targets,producer,source='DIRECTION_QUICK_EDIT'){
    if(!targets?.length) return false;
    if(!ensureEditable()) return false;

    const unique=[];
    const seen=new Set();
    targets.forEach(t=>{
      const k=keyOf(t.staffId,t.dateStr);
      if(!seen.has(k)){seen.add(k);unique.push({staffId:String(t.staffId),dateStr:String(t.dateStr)});}
    });

    const over=unique.find(t=>!horizonAccepts(t.dateStr));
    if(over){
      alert(`La date ${over.dateStr} dépasse l’horizon de préparation autorisé.`);
      return false;
    }

    const ts=typeof getTs==='function'?getTs():{};
    const changes=[];
    let reasonNeeded=false;

    for(const target of unique){
      const data=getPlan(target.staffId,target.dateStr);
      const before=JSON.parse(JSON.stringify(data.plan||{}));
      const nextRaw=typeof producer==='function'
        ? producer({target,before,data})
        : producer;
      const after=normalizedCandidate(before,nextRaw||{});
      const error=validatePlan(after);
      if(error){alert(error);return false;}
      if(comparable(before)===comparable(after)) continue;

      const windowInfo=planningWindow(target.dateStr,before,after);
      if(windowInfo?.needsReason) reasonNeeded=true;

      changes.push({
        ...target,
        month:data.month,
        day:data.day,
        staff:data.staff,
        before,after,
        windowInfo
      });
    }

    if(!changes.length){
      toast('Aucune modification');
      return true;
    }

    let reason='';
    if(reasonNeeded){
      reason=String(prompt(
        'Une ou plusieurs modifications concernent un service dans moins de 5 h, déjà commencé ou une date passée.\n\nMotif obligatoire pour la traçabilité :'
      )||'').trim().slice(0,180);
      if(!reason) return false;
    }

    const auditAt=new Date().toISOString();
    const auditBy=actor();

    changes.forEach(c=>{
      if(!ts[c.month]) ts[c.month]={};
      if(!ts[c.month][String(c.staffId)]) ts[c.month][String(c.staffId)]={};

      const perChangeReason=c.windowInfo?.needsReason?reason:'';
      ts[c.month][String(c.staffId)][c.day]={
        ...c.after,
        lastChangeReason:perChangeReason,
        lastChangeAt:auditAt,
        lastChangeBy:auditBy,
        planningChangeKind:c.windowInfo?.kind||'NORMAL',
        planningUrgent:c.windowInfo?.kind==='URGENT_5H',
        updatedAt:auditAt
      };

      try{
        recordRhChange?.({
          type:'PLANNING_MANUAL_EDIT',
          source,
          staffId:String(c.staffId),
          staffName:String(c.staff?.name||''),
          date:c.dateStr,
          month:c.month,
          day:Number(c.day),
          reason:perChangeReason,
          changeKind:c.windowInfo?.kind||'NORMAL',
          managerNote:String(c.after.managerNote||''),
          by:auditBy,
          before:c.before,
          after:JSON.parse(JSON.stringify(ts[c.month][String(c.staffId)][c.day])),
          message:perChangeReason
            ? `Planning modifié · ${c.dateStr} · ${perChangeReason}`
            : `Planning modifié · ${c.dateStr} · édition rapide iCHEF`
        });
      }catch(_){}
    });

    let ok=true;
    try{
      if(typeof saveTs==='function'){
        const first=changes[0];
        window.iChefV201SaveState?.('saving',changes.length);
        const syncPromise=saveTs(ts,{
          source,
          reason,
          staffId:String(first.staffId),
          date:first.dateStr
        });
        // saveTs enregistre déjà le snapshot local AVANT l'appel réseau.
        // L'édition peut donc continuer immédiatement sans attendre le serveur.
        ok=true;
        window.iChefV201SaveState?.('local',changes.length);
        Promise.resolve(syncPromise)
          .then(syncOk=>{
            window.iChefV201SaveState?.(syncOk===false?'pending':'synced',changes.length);
          })
          .catch(err=>{
            console.warn('[iCHEF RH V201] synchronisation planning différée',err);
            window.iChefV201SaveState?.('pending',changes.length);
          });
      }else{
        localStorage.setItem('empire_hr_timesheets',JSON.stringify(ts));
        window.iChefV201SaveState?.('local',changes.length);
      }
    }catch(e){
      console.error('[iCHEF RH V201] save local',e);
      ok=false;
      window.iChefV201SaveState?.('pending',changes.length);
    }

    // V217 : toutes les vues planning passent par le même bus.
    // On évite plusieurs rerenders concurrents (source de clignotements et
    // d'écrans momentanément désynchronisés).
    try{
      if(typeof window.iChefPlanningMasterSyncV217==='function'){
        window.iChefPlanningMasterSyncV217({
          source,
          snapshot:ts,
          local:true
        });
      }else{
        loadMonthData?.();
        requestAnimationFrame(()=>{ try{ renderRhCockpit?.(); }catch(_){} });
        setTimeout(()=>{ try{ loadPublicPlanning?.(); }catch(_){} },120);
      }
      setTimeout(()=>{
        try{ Promise.resolve(broadcastStaffingLevels?.()).catch(()=>{}); }catch(_){}
      },120);
    }catch(_){}

    setTimeout(reapplySelection,30);
    toast(ok
      ? `${changes.length} case${changes.length>1?'s':''} enregistrée${changes.length>1?'s':''}`
      : 'Enregistré localement · synchronisation en attente'
    );
    return ok;
  }

  function visibleTargets(){
    const month=monthValue();
    const result=[];

    [...selected].forEach(key=>{
      const target=parseKey(key);
      const validDate=/^\d{4}-\d{2}-\d{2}$/.test(target.dateStr);
      const sameMonth=validDate && target.dateStr.startsWith(`${month}-`);
      const day=sameMonth ? Number(target.dateStr.slice(-2)) : 0;

      // La cible doit appartenir au mois actuellement affiché ET exister
      // encore dans la matrice visible. Cela élimine les sélections fantômes
      // après changement de mois / rerender.
      const visibleCell = sameMonth && day
        ? [...document.querySelectorAll('#global-view-container .rh-status-quick-btn')].some(btn =>
            String(btn.dataset.rhStaff||'')===String(target.staffId) &&
            Number(btn.dataset.rhDay||0)===day
          )
        : false;

      if(!sameMonth || !visibleCell){
        selected.delete(key);
        return;
      }
      result.push(target);
    });

    return result;
  }

  function toolbarPlan(){
    const template=templateById(currentToolbarTemplate);
    const categoryId=String(document.getElementById('rh-v200-toolbar-status')?.value||currentToolbarStatus||'present');
    const category=window.iChefPlanningCategoryByIdV202?.(categoryId);
    const status=String(category?.legalType||categoryId||'present');
    let p={
      status,
      categoryId:category?.id||categoryId||status,
      s1:template?.s1||'',
      s2:template?.s2||'',
      pause:Number(template?.pause||0)
    };
    if(status==='off') p={...p,status:'off',s1:'',s2:'',pause:0};
    if(status==='conge') p={...p,status:'conge',s1:'',s2:'',pause:0};
    if(status==='recup') p={...p,status:'recup',s1:'',s2:'',pause:0};
    if(status==='maladie') p={...p,status:'maladie',s1:'',s2:'',pause:0};
    if(status==='formation') p={...p,status:'formation',s1:'',s2:'',pause:0};
    return p;
  }

  function refreshToolbar(){
    const count=document.querySelector('#rh-v200-fastbar .rh-v200-count');
    if(count){
      const visibleCount=visibleTargets().length;
      if(typeof window.iChefV216UpdateMonthSlot==='function'){
        window.iChefV216UpdateMonthSlot(count,visibleCount);
      }else{
        count.textContent=visibleCount
          ? `${visibleCount} case${visibleCount>1?'s':''} sélectionnée${visibleCount>1?'s':''}`
          : 'Aucune case sélectionnée';
      }
    }
    document.querySelector('#rh-v200-fastbar .rh-v200-select-mode')?.classList.toggle('active',selectionMode);
    document.querySelector('#rh-v200-fastbar .rh-v200-brush')?.classList.toggle('active',brushMode);
    document.querySelectorAll('#global-view-container .rh-status-quick-btn')
      .forEach(btn=>btn.classList.toggle('rh-v200-brush-ready',brushMode));
  }

  function reapplySelection(){
    document.querySelectorAll('#global-view-container .rh-status-quick-btn').forEach(btn=>{
      const dateStr=dateStringFromDay(btn.dataset.rhDay);
      const key=keyOf(btn.dataset.rhStaff,dateStr);
      btn.classList.toggle('rh-v200-selected',selected.has(key));
      btn.classList.toggle('rh-v200-brush-ready',brushMode);
    });
    refreshToolbar();
    window.iChefV201RefreshTouchState?.();
  }

  function selectRange(staffId,fromDate,toDate){
    const a=new Date(`${fromDate}T12:00:00`);
    const b=new Date(`${toDate}T12:00:00`);
    if(Number.isNaN(a.getTime())||Number.isNaN(b.getTime())) return;
    const start=a<=b?a:b;
    const end=a<=b?b:a;
    const month=monthValue();
    for(let d=new Date(start);d<=end;d.setDate(d.getDate()+1)){
      const ds=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      if(ds.startsWith(month)) selected.add(keyOf(staffId,ds));
    }
  }

  function toggleSelection(staffId,dateStr,event){
    const key=keyOf(staffId,dateStr);
    if(event?.shiftKey && lastSelected?.staffId===String(staffId)){
      selectRange(String(staffId),lastSelected.dateStr,dateStr);
    }else if(selected.has(key)){
      selected.delete(key);
    }else{
      selected.add(key);
    }
    lastSelected={staffId:String(staffId),dateStr:String(dateStr)};
    reapplySelection();
  }

  function clearSelection(){
    selected.clear();
    lastSelected=null;
    reapplySelection();
  }

  // V205 · API tactile publique.
  // Elle réutilise EXACTEMENT le moteur V200 (validation, historique,
  // motif si modification tardive, sauvegarde locale + synchro serveur).
  async function applyCategoryToSelectionV205(categoryId,{clearAfter=true}={}){
    const targets=visibleTargets();
    if(!targets.length){
      toast('Sélectionnez d’abord les jours');
      return false;
    }

    const category=window.iChefPlanningCategoryByIdV202?.(String(categoryId||''));
    if(!category){
      toast('Catégorie planning introuvable');
      return false;
    }

    const toolbarCategory=document.getElementById('rh-v200-toolbar-status');

    const template=templateById(currentToolbarTemplate);
    const legalStatus=String(category.legalType||'off');

    const ok=await applyToTargets(
      targets,
      ({before})=>{
        const next={
          ...before,
          status:legalStatus,
          categoryId:category.id
        };

        // Pour TRAVAIL / MATIN / SOIR :
        // conserver l'horaire existant si la case en possède déjà un.
        // Sinon utiliser le modèle sélectionné dans la barre rapide.
        if(legalStatus==='present'){
          if(!String(before.s1||'').trim() && !String(before.s2||'').trim()){
            next.s1=String(template?.s1||'');
            next.s2=String(template?.s2||'');
            next.pause=Number(template?.pause||0);
          }
        }else if(legalStatus==='off_soir'){
          next.s1=String(before.s1||templateById('matin')?.s1||'');
          next.s2='';
          next.pause=0;
        }else if(legalStatus==='off_matin'){
          next.s1='';
          next.s2=String(before.s2||templateById('soir')?.s2||'');
          next.pause=0;
        }else if(legalStatus==='ferie'){
          // Un férié peut être travaillé ou non selon la situation.
          // On conserve donc les horaires déjà présents, sans en inventer.
          next.s1=String(before.s1||'');
          next.s2=String(before.s2||'');
          next.pause=Number(before.pause||0);
        }else{
          // Repos, congé, récupération, maladie, formation, etc.
          next.s1='';
          next.s2='';
          next.pause=0;
        }

        return next;
      },
      'DIRECTION_TOUCH_CATEGORY'
    );

    if(ok){
      if(toolbarCategory){
        toolbarCategory.value=category.id;
        currentToolbarStatus=category.id;
        toolbarCategory.dispatchEvent(new Event('change',{bubbles:true}));
      }
      toast(`${targets.length} case${targets.length>1?'s':''} → ${category.short||category.label}`);
      if(clearAfter) clearSelection();
    }
    return ok;
  }

  window.ICHEF_FAST_PLANNING_V205={
    getSelectedTargets:()=>visibleTargets().map(x=>({...x})),
    getSelectionCount:()=>selected.size,
    clearSelection,
    applyCategory:applyCategoryToSelectionV205,
    setCategory(categoryId){
      const category=window.iChefPlanningCategoryByIdV202?.(String(categoryId||''));
      const select=document.getElementById('rh-v200-toolbar-status');
      if(!category||!select) return false;
      select.value=category.id;
      currentToolbarStatus=category.id;
      select.dispatchEvent(new Event('change',{bubbles:true}));
      return true;
    }
  };

  function ensureFastUi(){
    const global=document.getElementById('global-view-container');
    if(!global) return;

    if(!document.getElementById('rh-v200-fastbar')){
      const bar=document.createElement('div');
      bar.id='rh-v200-fastbar';
      bar.innerHTML=`
        <div class="rh-v200-count">Aucune case sélectionnée</div>
        <button type="button" class="rh-v200-select-mode">☑ SÉLECTION</button>
        <select id="rh-v200-toolbar-status" title="Statut à appliquer">
          <option value="present">TRAVAIL</option>
          <option value="off">REPOS / OFF</option>
          <option value="conge">CONGÉ</option>
          <option value="recup">RÉCUP.</option>
          <option value="maladie">MALADIE</option>
          <option value="formation">FORMATION</option>
        </select>
        <select id="rh-v200-toolbar-template" title="Modèle d'horaire"></select>
        <button type="button" class="rh-v200-copy">⧉ COPIER</button>
        <button type="button" class="rh-v200-paste">COLLER</button>
        <button type="button" class="rh-v200-apply">APPLIQUER</button>
        <button type="button" class="rh-v200-brush">✎ PINCEAU</button>
        <button type="button" class="rh-v200-tools-toggle">OUTILS ▾</button>
        <button type="button" class="rh-v200-clear">EFFACER SÉLECTION</button>
        <div class="rh-v200-spacer"></div>
        <div class="rh-v200-draft">Brouillon · publication séparée</div>`;
      global.insertBefore(bar,global.firstChild);

      bar.querySelector('.rh-v200-select-mode').onclick=()=>{
        selectionMode=!selectionMode;
        if(selectionMode) brushMode=false;
        refreshToolbar();
      };
      bar.querySelector('#rh-v200-toolbar-status').onchange=e=>{
        currentToolbarStatus=e.target.value;
      };
      bar.querySelector('#rh-v200-toolbar-template').onchange=e=>{
        currentToolbarTemplate=e.target.value;
      };
      bar.querySelector('.rh-v200-copy').onclick=copySelected;
      bar.querySelector('.rh-v200-paste').onclick=pasteSelected;
      bar.querySelector('.rh-v200-apply').onclick=()=>{
        const targets=visibleTargets();
        if(!targets.length){toast('Sélectionnez au moins une case');return;}
        applyToTargets(targets,()=>toolbarPlan(),'DIRECTION_QUICK_BULK');
      };
      bar.querySelector('.rh-v200-brush').onclick=()=>{
        brushMode=!brushMode;
        if(brushMode) selectionMode=false;
        refreshToolbar();
        toast(brushMode?'Pinceau activé · cliquez les cases':'Pinceau désactivé');
      };
      bar.querySelector('.rh-v200-tools-toggle').onclick=()=>{
        document.getElementById('rh-v200-tools-deck')?.classList.toggle('show');
      };
      bar.querySelector('.rh-v200-clear').onclick=clearSelection;
    }

    if(!document.getElementById('rh-v200-tools-deck')){
      const deck=document.createElement('div');
      deck.id='rh-v200-tools-deck';
      deck.innerHTML=`
        <section class="rh-v200-tool-card">
          <div class="rh-v200-tool-head"><span>MODÈLES D'HORAIRES</span><button type="button" id="rh-v200-new-template" style="width:auto;margin:0;padding:0 8px">+ NOUVEAU</button></div>
          <div id="rh-v200-template-list" class="rh-v200-template-list"></div>
        </section>
        <section class="rh-v200-tool-card">
          <div class="rh-v200-tool-head"><span>COPIER / COLLER</span></div>
          <select id="rh-v200-copy-mode">
            <option value="previous-week">Semaine précédente</option>
          </select>
          <button type="button" id="rh-v200-copy-week">DUPLIQUER LA SEMAINE</button>
          <button type="button" id="rh-v200-fill-selection">REMPLIR AVEC LA 1re CASE</button>
        </section>
        <section class="rh-v200-tool-card">
          <div class="rh-v200-tool-head"><span>OUTILS RAPIDES</span></div>
          <div class="rh-v200-four-tools">
            <button type="button" id="rh-v200-brush-card">✎<br>PINCEAU</button>
            <button type="button" id="rh-v200-off-card">OFF<br>REPOS</button>
            <button type="button" id="rh-v200-copy-card">⧉<br>COPIER</button>
            <button type="button" id="rh-v200-paste-card">↳<br>COLLER</button>
          </div>
        </section>
        <section class="rh-v200-tool-card">
          <div class="rh-v200-tool-head"><span>RÉPÉTER CE RYTHME</span></div>
          <div class="rh-v200-cycle-grid">
            <label>Travail<input id="rh-v200-cycle-work" type="number" min="1" max="14" value="3"></label>
            <label>Repos<input id="rh-v200-cycle-off" type="number" min="1" max="14" value="2"></label>
          </div>
          <label style="display:block;color:#555;font-size:.49rem;font-weight:800;text-transform:uppercase;margin-top:4px">Sur</label>
          <select id="rh-v200-cycle-weeks">
            <option value="2">2 semaines</option>
            <option value="4" selected>4 semaines</option>
            <option value="6">6 semaines</option>
            <option value="8">8 semaines</option>
          </select>
          <button type="button" id="rh-v200-cycle-apply">APPLIQUER LE CYCLE</button>
        </section>`;
      global.insertBefore(deck,document.getElementById('rh-v200-fastbar')?.nextSibling || global.firstChild);

      deck.querySelector('#rh-v200-new-template').onclick=saveCurrentAsTemplate;
      deck.querySelector('#rh-v200-copy-week').onclick=duplicatePreviousWeek;
      deck.querySelector('#rh-v200-fill-selection').onclick=fillSelectionFromFirst;
      deck.querySelector('#rh-v200-brush-card').onclick=()=>{
        document.querySelector('#rh-v200-fastbar .rh-v200-brush')?.click();
      };
      deck.querySelector('#rh-v200-off-card').onclick=()=>{
        currentToolbarStatus='off';
        const sel=document.getElementById('rh-v200-toolbar-status');
        if(sel) sel.value='off';
        const targets=visibleTargets();
        if(!targets.length){toast('Sélectionnez des cases');return;}
        applyToTargets(targets,{status:'off',s1:'',s2:'',pause:0},'DIRECTION_QUICK_OFF');
      };
      deck.querySelector('#rh-v200-copy-card').onclick=copySelected;
      deck.querySelector('#rh-v200-paste-card').onclick=pasteSelected;
      deck.querySelector('#rh-v200-cycle-apply').onclick=applyCycle;
    }

    populateTemplateUi();
    reapplySelection();
  }

  function populateTemplateUi(){
    const templates=getTemplates();
    const select=document.getElementById('rh-v200-toolbar-template');
    if(select){
      const old=select.value||currentToolbarTemplate;
      select.innerHTML=templates.map(t=>
        `<option value="${esc(t.id)}">${esc(t.name)}${t.s1||t.s2?' · '+esc([t.s1,t.s2].filter(Boolean).join(' / ')):''}</option>`
      ).join('');
      if(templates.some(t=>String(t.id)===String(old))) select.value=old;
      currentToolbarTemplate=select.value||templates[0]?.id||'coupure';
    }
    const list=document.getElementById('rh-v200-template-list');
    if(list){
      list.innerHTML=templates.slice(0,9).map((t,i)=>`
        <div class="rh-v200-template-row" data-template="${esc(t.id)}">
          <i class="rh-v200-template-dot"></i>
          <strong>${esc(t.name)}</strong>
          <small>${esc([t.s1,t.s2].filter(Boolean).join(' / ')||String(t.status||''))}</small>
        </div>`).join('');
      list.querySelectorAll('[data-template]').forEach(row=>{
        row.onclick=()=>{
          currentToolbarTemplate=row.dataset.template;
          const sel=document.getElementById('rh-v200-toolbar-template');
          if(sel) sel.value=currentToolbarTemplate;
          toast(`Modèle : ${templateById(currentToolbarTemplate)?.name||''}`);
        };
      });
    }
  }

  function ensureDrawer(){
    let drawer=document.getElementById('rh-v200-quick-drawer');
    if(drawer) return drawer;
    drawer=document.createElement('aside');
    drawer.id='rh-v200-quick-drawer';
    document.body.appendChild(drawer);
    return drawer;
  }

  function drawerPlan(){
    if(!drawerCtx) return {};
    const activeCategory=document.querySelector('#rh-v200-quick-drawer [data-status].active');
    return normalizedCandidate(drawerCtx.base,{
      status:activeCategory?.dataset.status||drawerCtx.base.status||'off',
      categoryId:activeCategory?.dataset.categoryId||drawerCtx.base.categoryId||activeCategory?.dataset.status||drawerCtx.base.status||'off',
      poste:document.getElementById('rh-v200-drawer-poste')?.value||drawerCtx.base.poste||'salle',
      s1:document.getElementById('rh-v200-drawer-s1')?.value||'',
      s2:document.getElementById('rh-v200-drawer-s2')?.value||'',
      pause:Number(document.getElementById('rh-v200-drawer-pause')?.value)||0,
      managerNote:document.getElementById('rh-v200-drawer-note')?.value||''
    });
  }

  function setDrawerStatus(statusOrCategory){
    let selectedButton=null;
    document.querySelectorAll('#rh-v200-quick-drawer [data-status]').forEach(b=>{
      const selected=
        String(b.dataset.categoryId||'')===String(statusOrCategory||'') ||
        (!b.dataset.categoryId && String(b.dataset.status||'')===String(statusOrCategory||''));
      b.classList.toggle('active',selected);
      if(selected&&!selectedButton) selectedButton=b;
    });
    if(!selectedButton){
      selectedButton=[...document.querySelectorAll('#rh-v200-quick-drawer [data-status]')]
        .find(b=>String(b.dataset.status||'')===String(statusOrCategory||''))||null;
      if(selectedButton) selectedButton.classList.add('active');
    }
    const legalStatus=String(selectedButton?.dataset.status||statusOrCategory||'off');
    const plan=drawerPlan();
    if(!STATUS_WORK.has(legalStatus)){
      setDrawerTimes('','',0);
    }else if(legalStatus==='present'&&!plan.s1&&!plan.s2){
      applyDrawerPreset('coupure');
    }
  }

  function setDrawerTimes(s1,s2,pause){
    const a=document.getElementById('rh-v200-drawer-s1');
    const b=document.getElementById('rh-v200-drawer-s2');
    const p=document.getElementById('rh-v200-drawer-pause');
    if(a)a.value=s1||'';
    if(b)b.value=s2||'';
    if(p)p.value=Number(pause||0);
  }

  function applyDrawerPreset(id){
    const t=templateById(id);
    if(!t)return;
    setDrawerTimes(t.s1,t.s2,t.pause);
    setDrawerStatus(t.categoryId||t.status||'present');
    document.querySelectorAll('#rh-v200-quick-drawer [data-preset]').forEach(b=>{
      b.classList.toggle('active',b.dataset.preset===id);
    });
  }

  function openDrawer(staffId,dateStr){
    const data=getPlan(staffId,dateStr);
    if(!data.staff){toast('Collaborateur introuvable');return;}
    drawerCtx={staffId:String(staffId),dateStr:String(dateStr),base:data.plan,staff:data.staff};
    drawerScope='day';

    const d=new Date(`${dateStr}T12:00:00`);
    const dateLabel=d.toLocaleDateString('fr-FR',{weekday:'short',day:'2-digit',month:'2-digit'});
    const drawer=ensureDrawer();
    const p=data.plan;

    drawer.innerHTML=`
      <div class="rh-v200-drawer-head">
        <div><strong>${esc(data.staff.name||'Collaborateur')} · ${esc(dateLabel)}</strong><small>Édition rapide · double clic = fiche complète</small></div>
        <button type="button" class="rh-v200-close" aria-label="Fermer">×</button>
      </div>
      <div class="rh-v200-drawer-body">
        <div class="rh-v200-kicker">Statut</div>
        <div class="rh-v200-status-grid">
          ${window.iChefPlanningCategoryButtonsV202?.(p.categoryId||p.status) || [
            ['present','TRAVAIL'],['off','REPOS'],['conge','CONGÉ'],
            ['recup','RÉCUP.'],['maladie','MALADIE'],['formation','FORMATION']
          ].map(([v,l])=>`<button type="button" data-status="${v}" data-category-id="${v}" class="${String(p.status)===v?'active':''}">${l}</button>`).join('')}
        </div>

        <div class="rh-v200-field">
          <label>Poste</label>
          <select id="rh-v200-drawer-poste">
            ${[['salle','Salle'],['cuisine','Cuisine'],['patisserie','Pâtisserie'],['bar','Bar'],['admin','Admin']]
              .map(([v,l])=>`<option value="${v}" ${String(p.poste||data.staff.dept||'salle')===v?'selected':''}>${l}</option>`).join('')}
          </select>
        </div>

        <div class="rh-v200-kicker">Horaire rapide</div>
        <div class="rh-v200-presets">
          <button type="button" data-preset="matin">MATIN</button>
          <button type="button" data-preset="soir">SOIR</button>
          <button type="button" data-preset="coupure">COUPURE</button>
          <button type="button" data-preset="journee">JOURNÉE</button>
          <button type="button" data-preset="fermeture">FERMETURE</button>
        </div>

        <div class="rh-v200-time-grid">
          <div class="rh-v200-field"><label>Matin (S1)</label><input id="rh-v200-drawer-s1" value="${esc(p.s1||'')}" placeholder="10:00-14:45"></div>
          <div class="rh-v200-field"><label>Soir (S2)</label><input id="rh-v200-drawer-s2" value="${esc(p.s2||'')}" placeholder="18:00-22:45"></div>
        </div>

        <div class="rh-v200-field"><label>Pause (minutes)</label><input id="rh-v200-drawer-pause" type="number" min="0" max="240" step="5" value="${Number(p.pause)||0}"></div>
        <div class="rh-v200-field"><label>Note visible dans la case · optionnel</label><input id="rh-v200-drawer-note" maxlength="40" value="${esc(p.managerNote||'')}" placeholder="Ex. Remplace Paul à 18h"></div>

        <div class="rh-v200-drawer-tools">
          <button type="button" id="rh-v200-drawer-detail">+ OPTIONS AVANCÉES</button>
          <button type="button" id="rh-v200-drawer-save-template">ENREGISTRER COMME MODÈLE</button>
          <button type="button" id="rh-v200-drawer-copy">⧉ COPIER</button>
        </div>

        <div class="rh-v200-kicker">Appliquer à</div>
        <div class="rh-v200-scope">
          <button type="button" data-scope="day" class="active">CE JOUR</button>
          <button type="button" data-scope="week">SEMAINE</button>
          <button type="button" data-scope="selected">JOURS SÉLECTIONNÉS</button>
        </div>
      </div>
      <div class="rh-v200-drawer-actions">
        <button type="button" class="rh-v200-drawer-cancel">FERMER</button>
        <button type="button" class="primary rh-v200-drawer-apply">APPLIQUER</button>
      </div>`;

    drawer.querySelector('.rh-v200-close').onclick=closeDrawer;
    drawer.querySelector('.rh-v200-drawer-cancel').onclick=closeDrawer;
    drawer.querySelectorAll('[data-status]').forEach(btn=>{
      btn.onclick=()=>setDrawerStatus(btn.dataset.categoryId||btn.dataset.status);
    });
    drawer.querySelectorAll('[data-preset]').forEach(btn=>{
      btn.onclick=()=>applyDrawerPreset(btn.dataset.preset);
    });
    drawer.querySelectorAll('[data-scope]').forEach(btn=>{
      btn.onclick=()=>{
        drawerScope=btn.dataset.scope;
        drawer.querySelectorAll('[data-scope]').forEach(x=>x.classList.toggle('active',x===btn));
      };
    });
    drawer.querySelector('#rh-v200-drawer-detail').onclick=()=>{
      closeDrawer();
      window.openRhCockpitShiftEditor?.(staffId,dateStr);
    };
    drawer.querySelector('#rh-v200-drawer-save-template').onclick=saveCurrentAsTemplate;
    drawer.querySelector('#rh-v200-drawer-copy').onclick=()=>{
      clipboard={...drawerPlan()};
      toast('Horaire copié');
    };
    drawer.querySelector('.rh-v200-drawer-apply').onclick=applyDrawer;

    drawer.classList.add('show');
  }

  function closeDrawer(){
    document.getElementById('rh-v200-quick-drawer')?.classList.remove('show');
    drawerCtx=null;
  }

  function datesOfWeek(dateStr){
    const d=new Date(`${dateStr}T12:00:00`);
    const day=(d.getDay()+6)%7; // lundi=0
    d.setDate(d.getDate()-day);
    return Array.from({length:7},(_,i)=>{
      const x=new Date(d);
      x.setDate(d.getDate()+i);
      return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`;
    });
  }

  async function applyDrawer(){
    if(!drawerCtx)return;
    const plan=drawerPlan();
    let targets=[];
    if(drawerScope==='week'){
      targets=datesOfWeek(drawerCtx.dateStr).map(dateStr=>({staffId:drawerCtx.staffId,dateStr}));
    }else if(drawerScope==='selected'){
      targets=visibleTargets();
      if(!targets.length) targets=[{staffId:drawerCtx.staffId,dateStr:drawerCtx.dateStr}];
    }else{
      targets=[{staffId:drawerCtx.staffId,dateStr:drawerCtx.dateStr}];
    }
    const ok=await applyToTargets(targets,()=>plan,'DIRECTION_QUICK_DRAWER');
    if(ok){
      closeDrawer();
      clearSelection();
    }
  }

  function copySelected(){
    const targets=visibleTargets();
    const first=targets[0] || (drawerCtx?{staffId:drawerCtx.staffId,dateStr:drawerCtx.dateStr}:null);
    if(!first){toast('Sélectionnez une case');return;}
    clipboard=JSON.parse(JSON.stringify(getPlan(first.staffId,first.dateStr).plan));
    toast('Horaire copié');
  }

  function pasteSelected(){
    if(!clipboard){toast('Aucun horaire copié');return;}
    const targets=visibleTargets();
    if(!targets.length){toast('Sélectionnez les cases à remplir');return;}
    applyToTargets(targets,({before})=>({...before,...clipboard}),'DIRECTION_QUICK_PASTE');
  }

  function fillSelectionFromFirst(){
    const targets=visibleTargets();
    if(targets.length<2){toast('Sélectionnez au moins 2 cases');return;}
    const source=getPlan(targets[0].staffId,targets[0].dateStr).plan;
    applyToTargets(targets.slice(1),({before})=>({...before,...source}),'DIRECTION_QUICK_FILL');
  }

  function duplicatePreviousWeek(){
    const targets=visibleTargets();
    const anchor=targets[0] || (drawerCtx?{staffId:drawerCtx.staffId,dateStr:drawerCtx.dateStr}:null);
    if(!anchor){toast('Sélectionnez une case de la semaine cible');return;}

    const staffIds=[...new Set((targets.length?targets:[anchor]).map(t=>String(t.staffId)))];
    const week=datesOfWeek(anchor.dateStr);
    const operations=[];

    staffIds.forEach(staffId=>{
      week.forEach(targetDate=>{
        const td=new Date(`${targetDate}T12:00:00`);
        const sourceDate=new Date(td);
        sourceDate.setDate(sourceDate.getDate()-7);
        const sourceStr=`${sourceDate.getFullYear()}-${String(sourceDate.getMonth()+1).padStart(2,'0')}-${String(sourceDate.getDate()).padStart(2,'0')}`;
        const sourcePlan=getPlan(staffId,sourceStr).plan;
        operations.push({staffId,targetDate,sourcePlan});
      });
    });

    applyToTargets(
      operations.map(x=>({staffId:x.staffId,dateStr:x.targetDate})),
      ({target,before})=>{
        const op=operations.find(x=>String(x.staffId)===String(target.staffId)&&x.targetDate===target.dateStr);
        return {...before,...(op?.sourcePlan||{})};
      },
      'DIRECTION_DUPLICATE_PREVIOUS_WEEK'
    );
  }

  function saveCurrentAsTemplate(){
    let plan=null;
    if(drawerCtx) plan=drawerPlan();
    else{
      const t=visibleTargets()[0];
      if(t) plan=getPlan(t.staffId,t.dateStr).plan;
    }
    if(!plan){toast('Ouvrez une case ou sélectionnez-en une');return;}
    const name=String(prompt('Nom du modèle d’horaire :','Mon modèle')||'').trim().slice(0,30);
    if(!name)return;
    const tpl={
      id:`custom_${Date.now()}`,
      name,
      status:String(plan.status||'present'),
      s1:String(plan.s1||''),
      s2:String(plan.s2||''),
      pause:Number(plan.pause||0)
    };
    if(saveCustomTemplate(tpl)){
      populateTemplateUi();
      currentToolbarTemplate=tpl.id;
      const sel=document.getElementById('rh-v200-toolbar-template');
      if(sel)sel.value=tpl.id;
      toast('Modèle enregistré');
    }
  }

  function applyCycle(){
    const targets=visibleTargets();
    const anchor=targets[0] || (drawerCtx?{staffId:drawerCtx.staffId,dateStr:drawerCtx.dateStr}:null);
    if(!anchor){toast('Sélectionnez la première case du cycle');return;}
    const work=Math.max(1,Math.min(14,Number(document.getElementById('rh-v200-cycle-work')?.value)||3));
    const off=Math.max(1,Math.min(14,Number(document.getElementById('rh-v200-cycle-off')?.value)||2));
    const weeks=Math.max(1,Math.min(12,Number(document.getElementById('rh-v200-cycle-weeks')?.value)||4));
    const cycle=work+off;
    const total=weeks*7;
    const start=new Date(`${anchor.dateStr}T12:00:00`);
    const items=[];

    for(let i=0;i<total;i++){
      const d=new Date(start);
      d.setDate(start.getDate()+i);
      const dateStr=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      const isWork=(i%cycle)<work;
      items.push({
        staffId:anchor.staffId,
        dateStr,
        plan:isWork?toolbarPlan():{status:'off',s1:'',s2:'',pause:0}
      });
    }

    applyToTargets(
      items.map(x=>({staffId:x.staffId,dateStr:x.dateStr})),
      ({target,before})=>{
        const item=items.find(x=>x.dateStr===target.dateStr&&String(x.staffId)===String(target.staffId));
        return {...before,...(item?.plan||{})};
      },
      'DIRECTION_REPEAT_CYCLE'
    );
  }

  // Remplace le vieux petit menu de statut par le nouveau panneau rapide.
  window.openRhQuickStatus=function(event,staffId,day){
    event?.preventDefault?.();
    event?.stopPropagation?.();

    const dateStr=dateStringFromDay(day);
    if(!dateStr)return;

    if(brushMode){
      applyToTargets(
        [{staffId:String(staffId),dateStr}],
        ()=>toolbarPlan(),
        'DIRECTION_BRUSH'
      );
      return;
    }

    if(selectionMode || event?.ctrlKey || event?.metaKey || event?.shiftKey){
      toggleSelection(String(staffId),dateStr,event);
      return;
    }

    openDrawer(String(staffId),dateStr);
  };

  // Double clic = fenêtre complète existante.
  document.addEventListener('dblclick',event=>{
    const btn=event.target?.closest?.('.rh-status-quick-btn');
    if(!btn)return;
    event.preventDefault();
    event.stopPropagation();
    closeDrawer();
    const dateStr=dateStringFromDay(btn.dataset.rhDay);
    window.openRhCockpitShiftEditor?.(btn.dataset.rhStaff,dateStr);
  },true);

  // Raccourcis clavier copier/coller pour les cases sélectionnées.
  document.addEventListener('keydown',event=>{
    const tag=String(event.target?.tagName||'').toLowerCase();
    if(['input','textarea','select'].includes(tag))return;

    if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='c'&&selected.size){
      event.preventDefault();
      copySelected();
    }
    if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='v'&&selected.size){
      event.preventDefault();
      pasteSelected();
    }
    if(event.key==='Escape'){
      if(drawerCtx)closeDrawer();
      if(selectionMode||brushMode){
        selectionMode=false;brushMode=false;refreshToolbar();
      }
    }
  });

  // Recréer la barre après les re-rendus du planning, au maximum
  // une fois par frame même si le tableau injecte beaucoup de cellules.
  const global=document.getElementById('global-view-container');
  if(global){
    let renderFrame=0;
    new MutationObserver(mutations=>{
      const relevant=
        !document.getElementById('rh-v200-fastbar') ||
        mutations.some(m => [...(m.addedNodes||[])].some(n =>
          n?.nodeType===1 && (
            n.matches?.('.global-table,tbody,tr,.rh-status-quick-btn,#rh-v200-fastbar') ||
            n.querySelector?.('.rh-status-quick-btn,#rh-v200-fastbar')
          )
        ));
      if(!relevant || renderFrame) return;
      renderFrame=requestAnimationFrame(()=>{
        renderFrame=0;
        if(!document.getElementById('rh-v200-fastbar')) ensureFastUi();
        reapplySelection();
      });
    }).observe(global,{childList:true,subtree:true});
  }

  const oldLoad=window.loadMonthData;
  if(typeof oldLoad==='function'){
    window.loadMonthData=function(...args){
      const result=oldLoad.apply(this,args);
      setTimeout(()=>{ensureFastUi();reapplySelection();},0);
      return result;
    };
  }

  window.addEventListener('resize',()=>{
    if(drawerCtx && innerWidth<760){
      const drawer=document.getElementById('rh-v200-quick-drawer');
      if(drawer)drawer.scrollTop=0;
    }
  });

  document.addEventListener('DOMContentLoaded',()=>setTimeout(ensureFastUi,0));
  setTimeout(ensureFastUi,140);

  window.__ICHEF_RH_BUILD__=VERSION;
  console.info('[iCHEF RH V200] planning manuel rapide · multi-sélection · modèles · copier/coller · pinceau · cycles');
})();




;
/* RH V264 - preserved script #126 */

window.__ICHEF_RH_BUILD__='RH-V200-FAST-MANUAL-PLANNING';



;
/* RH V264 - preserved script #127 */

(() => {
  'use strict';
  if(window.__ICHEF_RH_V201_STATUS_TOUCH__) return;
  window.__ICHEF_RH_V201_STATUS_TOUCH__=true;

  const STATUS_COLORS={
    present:{label:'TRAVAIL',bg:'#dff6e7',border:'#278a52'},
    off_soir:{label:'MATIN',bg:'#e4f1ff',border:'#4d82b8'},
    off_matin:{label:'SOIR',bg:'#eee8ff',border:'#7657b2'},
    off:{label:'REPOS',bg:'#eeeeee',border:'#777777'},
    conge:{label:'CONGÉ',bg:'#fff1bd',border:'#b48200'},
    recup:{label:'RÉCUP.',bg:'#dff4fb',border:'#29879e'},
    maladie:{label:'MALADIE',bg:'#fde1e1',border:'#bd4242'},
    accident_travail:{label:'ACCIDENT',bg:'#ffd6d6',border:'#a72f2f'},
    maternite:{label:'MATERNITÉ',bg:'#f8e2f0',border:'#a45182'},
    paternite:{label:'PATERNITÉ',bg:'#f8e2f0',border:'#a45182'},
    parental:{label:'PARENTAL',bg:'#f8e2f0',border:'#a45182'},
    enfant_malade:{label:'PROCHE',bg:'#f8e2f0',border:'#a45182'},
    evenement_familial:{label:'ÉVÉN.',bg:'#f8e2f0',border:'#a45182'},
    deces:{label:'DEUIL',bg:'#f8e2f0',border:'#a45182'},
    formation:{label:'FORMATION',bg:'#eee6ff',border:'#7652a8'},
    sans_solde:{label:'SANS SOLDE',bg:'#f2e7da',border:'#8a6846'},
    absence_autorisee:{label:'ABSENCE',bg:'#ffe6cf',border:'#b65e24'},
    absence_injustifiee:{label:'ABSENCE !',bg:'#ffe6cf',border:'#b65e24'},
    ferie:{label:'FÉRIÉ',bg:'#ffe9c9',border:'#b66b10'}
  };
  window.ICHEF_RH_STATUS_COLORS_V201=STATUS_COLORS;

  /* -------------------------------------------------------
     ENREGISTREMENT RAPIDE
     L'état local est immédiat. La synchronisation serveur
     continue en arrière-plan via saveTs.
     ------------------------------------------------------- */
  window.iChefV201SaveState=function(state,count=0){
    const el=document.querySelector('#rh-v200-fastbar .rh-v200-draft');
    if(!el) return;
    el.dataset.saveState=state;
    const labels={
      saving:'Enregistrement…',
      local:'✓ Enregistré · synchro…',
      synced:'✓ Synchronisé',
      pending:'⚠ Local · serveur en attente'
    };
    el.textContent=labels[state]||'Brouillon';
    el.title=count?`${count} modification${count>1?'s':''}`:'État de sauvegarde du planning';
  };

  /* -------------------------------------------------------
     LÉGENDE COULEUR
     ------------------------------------------------------- */
  function ensureLegend(){
    const global=document.getElementById('global-view-container');
    const bar=document.getElementById('rh-v200-fastbar');
    if(!global||!bar) return;

    if(!document.getElementById('rh-v201-legend')){
      const legend=document.createElement('div');
      legend.id='rh-v201-legend';
      legend.innerHTML=`
        <button type="button" class="rh-v201-legend-chip work rh-v205-category-action" data-rh-category="present"><i></i>TRAVAIL</button>
        <button type="button" class="rh-v201-legend-chip rest rh-v205-category-action" data-rh-category="off"><i></i>REPOS</button>
        <button type="button" class="rh-v201-legend-chip leave rh-v205-category-action" data-rh-category="conge"><i></i>CONGÉ</button>
        <button type="button" class="rh-v201-legend-chip recup rh-v205-category-action" data-rh-category="recup"><i></i>RÉCUP.</button>
        <button type="button" class="rh-v201-legend-chip sick rh-v205-category-action" data-rh-category="maladie"><i></i>MALADIE</button>
        <button type="button" class="rh-v201-legend-chip training rh-v205-category-action" data-rh-category="formation"><i></i>FORMATION</button>
        <button type="button" class="rh-v201-legend-chip holiday rh-v205-category-action" data-rh-category="ferie"><i></i>FÉRIÉ</button>`;
      bar.insertAdjacentElement('afterend',legend);
    }

    if(!document.getElementById('rh-v201-touch-help')){
      const hint=document.createElement('span');
      hint.id='rh-v201-touch-help';
      hint.innerHTML='<b>☝</b> Tactile : activez SÉLECTION puis glissez sur plusieurs jours · appui long fonctionne aussi';
      bar.appendChild(hint);
    }

    const selectBtn=bar.querySelector('.rh-v200-select-mode');
    if(selectBtn){
      selectBtn.textContent='☝ MULTI / TACTILE';
      selectBtn.title='Sur écran tactile : activez puis glissez sur plusieurs cases. Un appui long sur une case active aussi ce mode.';
    }

    const save=bar.querySelector('.rh-v200-draft');
    if(save&&!save.dataset.saveState){
      save.dataset.saveState='synced';
      save.textContent='✓ Synchronisé';
    }
  }

  /* -------------------------------------------------------
     COLORER LES COMPOSANTS DYNAMIQUES QUI NE PORTENT PAS
     ENCORE UNE CLASSE CSS DE STATUT.
     ------------------------------------------------------- */
  function paintDynamicStatusControls(root=document){
    root.querySelectorAll('[data-status]').forEach(el=>{
      const status=String(el.dataset.status||'');
      const c=STATUS_COLORS[status];
      if(!c) return;
      if(
        el.classList.contains('rh-cse-status-action') ||
        el.closest('#rh-v200-quick-drawer')
      ){
        el.style.setProperty('--rh-v201-bg',c.bg);
        el.style.setProperty('--rh-v201-border',c.border);
      }
    });

    const toolbarStatus=document.getElementById('rh-v200-toolbar-status');
    if(toolbarStatus){
      const c=STATUS_COLORS[String(toolbarStatus.value||'present')]||STATUS_COLORS.present;
      toolbarStatus.style.background=c.bg;
      toolbarStatus.style.borderColor=c.border;
      toolbarStatus.style.color='#111111';
    }
  }

  /* -------------------------------------------------------
     DÉCORER LES EN-TÊTES DE JOUR
     Permet un tap sur un jour pour sélectionner toute la
     colonne lorsque le mode multi-sélection est actif.
     ------------------------------------------------------- */
  function decorateDayHeaders(){
    const head=document.querySelectorAll('#global-thead th');
    if(!head.length) return;
    head.forEach((th,index)=>{
      if(index===0||index===head.length-1) return;
      th.dataset.rhDay=String(index);
      th.classList.add('rh-v201-day-selectable');
      th.title='Mode MULTI : toucher pour sélectionner/désélectionner toute cette journée';
    });
  }

  function selectionButton(){
    return document.querySelector('#rh-v200-fastbar .rh-v200-select-mode');
  }

  function selectionIsActive(){
    return selectionButton()?.classList.contains('active')===true;
  }

  function activateSelection(){
    const btn=selectionButton();
    if(btn&&!btn.classList.contains('active')) btn.click();
    syncTouchMode();
  }

  function syncTouchMode(){
    const global=document.getElementById('global-view-container');
    if(!global) return;
    global.classList.toggle('rh-v201-touch-mode',selectionIsActive());
  }

  function monthValue(){
    return String(document.getElementById('month-selector')?.value||'');
  }

  function selectCellIfNeeded(btn){
    if(!btn||btn.classList.contains('rh-v200-selected')) return false;
    const staff=btn.dataset.rhStaff;
    const day=btn.dataset.rhDay;
    if(!staff||!day) return false;
    window.openRhQuickStatus?.(
      {
        preventDefault(){},
        stopPropagation(){},
        ctrlKey:false,
        metaKey:false,
        shiftKey:false
      },
      staff,
      Number(day)
    );
    return true;
  }

  function deselectCellIfNeeded(btn){
    if(!btn||!btn.classList.contains('rh-v200-selected')) return false;
    const staff=btn.dataset.rhStaff;
    const day=btn.dataset.rhDay;
    if(!staff||!day) return false;
    window.openRhQuickStatus?.(
      {
        preventDefault(){},
        stopPropagation(){},
        ctrlKey:false,
        metaKey:false,
        shiftKey:false
      },
      staff,
      Number(day)
    );
    return true;
  }

  function toggleWholeDay(day){
    if(!selectionIsActive()) activateSelection();
    const cells=[...document.querySelectorAll(`#global-view-container .rh-status-quick-btn[data-rh-day="${CSS.escape(String(day))}"]`)];
    if(!cells.length) return;
    const allSelected=cells.every(x=>x.classList.contains('rh-v200-selected'));
    cells.forEach(btn=>{
      if(allSelected) deselectCellIfNeeded(btn);
      else selectCellIfNeeded(btn);
    });
    updateDayHeaderSelection();
  }

  function updateDayHeaderSelection(){
    document.querySelectorAll('#global-thead th[data-rh-day]').forEach(th=>{
      const day=th.dataset.rhDay;
      const cells=[...document.querySelectorAll(`#global-view-container .rh-status-quick-btn[data-rh-day="${CSS.escape(day)}"]`)];
      th.classList.toggle('rh-v201-day-selected',cells.length>0&&cells.every(x=>x.classList.contains('rh-v200-selected')));
    });
  }

  /* -------------------------------------------------------
     SÉLECTION TACTILE PAR GLISSER
     - si MULTI est actif : toucher + glisser immédiatement
     - sinon : appui long ~330 ms puis glisser
     ------------------------------------------------------- */
  let gesture=null;
  let suppressClickUntil=0;

  function cellAtPoint(x,y){
    const el=document.elementFromPoint(x,y);
    return el?.closest?.('#global-view-container .rh-status-quick-btn')||null;
  }

  function autoScroll(x,y){
    const scroller=document.getElementById('global-view-container');
    if(!scroller) return;
    const r=scroller.getBoundingClientRect();
    const edge=42;
    if(x>r.right-edge) scroller.scrollLeft+=28;
    else if(x<r.left+edge) scroller.scrollLeft-=28;
    if(y>r.bottom-edge) scroller.scrollTop+=24;
    else if(y<r.top+edge) scroller.scrollTop-=24;
  }

  function startGesture(btn,event,longPress=false){
    activateSelection();
    const visited=new Set();
    gesture={
      pointerId:event.pointerId,
      visited,
      active:true,
      longPress,
      startX:event.clientX,
      startY:event.clientY
    };
    const key=`${btn.dataset.rhStaff}|${btn.dataset.rhDay}`;
    visited.add(key);
    selectCellIfNeeded(btn);
    suppressClickUntil=Date.now()+800;
    try{navigator.vibrate?.(12)}catch(_){}
  }

  function onPointerDown(event){
    if(!['touch','pen'].includes(String(event.pointerType||''))) return;
    const btn=event.target?.closest?.('#global-view-container .rh-status-quick-btn');
    if(!btn) return;

    const base={
      pointerId:event.pointerId,
      btn,
      startX:event.clientX,
      startY:event.clientY,
      moved:false,
      active:false,
      timer:null
    };

    if(selectionIsActive()){
      startGesture(btn,event,false);
      gesture.pointerId=event.pointerId;
      event.preventDefault();
      return;
    }

    gesture=base;
    gesture.timer=setTimeout(()=>{
      if(gesture&&gesture.pointerId===event.pointerId&&!gesture.moved){
        startGesture(btn,event,true);
      }
    },330);
  }

  function onPointerMove(event){
    if(!gesture||gesture.pointerId!==event.pointerId) return;

    const dx=Math.abs(event.clientX-gesture.startX);
    const dy=Math.abs(event.clientY-gesture.startY);

    if(!gesture.active){
      if(dx>9||dy>9){
        gesture.moved=true;
        clearTimeout(gesture.timer);
        gesture.timer=null;
      }
      return;
    }

    event.preventDefault();
    autoScroll(event.clientX,event.clientY);

    const btn=cellAtPoint(event.clientX,event.clientY);
    if(!btn) return;
    const key=`${btn.dataset.rhStaff}|${btn.dataset.rhDay}`;
    if(gesture.visited.has(key)) return;
    gesture.visited.add(key);
    selectCellIfNeeded(btn);
    updateDayHeaderSelection();
  }

  function finishGesture(event){
    if(!gesture||gesture.pointerId!==event.pointerId) return;
    clearTimeout(gesture.timer);
    if(gesture.active){
      suppressClickUntil=Date.now()+700;
      updateDayHeaderSelection();
    }
    gesture=null;
  }

  document.addEventListener('pointerdown',onPointerDown,{capture:true,passive:false});
  document.addEventListener('pointermove',onPointerMove,{capture:true,passive:false});
  document.addEventListener('pointerup',finishGesture,true);
  document.addEventListener('pointercancel',finishGesture,true);

  // Empêche le click synthétique après un geste tactile déjà traité.
  document.addEventListener('click',event=>{
    const btn=event.target?.closest?.('#global-view-container .rh-status-quick-btn');
    if(btn&&Date.now()<suppressClickUntil){
      event.preventDefault();
      event.stopImmediatePropagation();
      event.stopPropagation();
      return;
    }

    const th=event.target?.closest?.('#global-thead th[data-rh-day]');
    if(th&&selectionIsActive()){
      event.preventDefault();
      event.stopPropagation();
      toggleWholeDay(th.dataset.rhDay);
    }

    if(event.target?.closest?.('#rh-v200-fastbar .rh-v200-select-mode')){
      setTimeout(syncTouchMode,0);
    }
  },true);

  /* La sélection peut être changée par le code V200 : synchroniser les headers. */
  window.iChefV201RefreshTouchState=function(){
    syncTouchMode();
    updateDayHeaderSelection();
  };

  const global=document.getElementById('global-view-container');
  if(global){
    let touchFrame=0;
    new MutationObserver(mutations=>{
      const relevant=mutations.some(m => [...(m.addedNodes||[])].some(n =>
        n?.nodeType===1 && (
          n.matches?.('.global-table,thead,tbody,tr,.rh-status-quick-btn,#rh-v201-legend') ||
          n.querySelector?.('.rh-status-quick-btn,#rh-v201-legend')
        )
      ));
      if(!relevant || touchFrame) return;
      touchFrame=requestAnimationFrame(()=>{
        touchFrame=0;
        ensureLegend();
        decorateDayHeaders();
        paintDynamicStatusControls(global);
        syncTouchMode();
        updateDayHeaderSelection();
      });
    }).observe(global,{childList:true,subtree:true});
  }

  document.addEventListener('change',event=>{
    if(event.target?.id==='rh-v200-toolbar-status'){
      paintDynamicStatusControls();
    }
  });

  function boot(){
    ensureLegend();
    decorateDayHeaders();
    paintDynamicStatusControls();
    syncTouchMode();
    updateDayHeaderSelection();
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',boot,{once:true});
  }else{
    boot();
  }
  setTimeout(boot,180);

  window.__ICHEF_RH_BUILD__='RH-V201-COLOR-TOUCH-FASTSAVE';
  console.info('[iCHEF RH V201] code couleur global + sauvegarde immédiate + sélection tactile multi-jours');
})();



;
/* RH V264 - preserved script #128 */

window.__ICHEF_RH_BUILD__='RH-V201-COLOR-TOUCH-FASTSAVE';



;
/* RH V264 - preserved script #129 */

(() => {
  'use strict';
  if(window.__ICHEF_RH_V202_CLIENT_CATEGORIES__) return;
  window.__ICHEF_RH_V202_CLIENT_CATEGORIES__=true;

  const VERSION='RH-V202-CLIENT-CATEGORIES';

  const LEGAL_TYPES=[
    ['present','Travail / service travaillé'],
    ['off_soir','Travail matin uniquement'],
    ['off_matin','Travail soir uniquement'],
    ['off','Repos / OFF'],
    ['conge','Congé payé / vacances'],
    ['recup','Récupération'],
    ['maladie','Maladie'],
    ['accident_travail','Accident du travail'],
    ['maternite','Maternité'],
    ['paternite','Paternité'],
    ['parental','Congé parental'],
    ['enfant_malade','Enfant / proche malade'],
    ['evenement_familial','Événement familial'],
    ['deces','Décès / deuil'],
    ['formation','Formation'],
    ['sans_solde','Sans solde'],
    ['absence_autorisee','Absence autorisée'],
    ['absence_injustifiee','Absence injustifiée'],
    ['ferie','Jour férié']
  ];

  const DEFAULTS=[
    ['present','TRAVAIL','TRAV','#dff6e7','present','Temps de travail planifié et comptabilisé.'],
    ['off_soir','MATIN SEUL','MATIN','#e4f1ff','off_soir','Travail uniquement sur le service du matin.'],
    ['off_matin','SOIR SEUL','SOIR','#eee8ff','off_matin','Travail uniquement sur le service du soir.'],
    ['off','REPOS / OFF','REPOS','#eeeeee','off','Repos planifié. Ne consomme pas les vacances.'],
    ['conge','CONGÉ PAYÉ','CP','#fff1bd','conge','Vacances / congé payé. Consomme le compteur de congés selon le référentiel applicable.'],
    ['recup','RÉCUPÉRATION','RÉCUP','#dff4fb','recup','Repos ou récupération issu du compteur prévu par l’établissement.'],
    ['maladie','MALADIE','MAL','#fde1e1','maladie','Absence pour maladie.'],
    ['accident_travail','ACCIDENT TRAVAIL','AT','#ffd6d6','accident_travail','Absence liée à un accident du travail.'],
    ['maternite','MATERNITÉ','MAT.','#f8e2f0','maternite','Congé maternité.'],
    ['paternite','PATERNITÉ','PAT.','#f8e2f0','paternite','Congé paternité.'],
    ['parental','CONGÉ PARENTAL','PAR.','#f8e2f0','parental','Congé parental.'],
    ['enfant_malade','ENFANT / PROCHE MALADE','PROCHE','#f8e2f0','enfant_malade','Absence liée à un enfant ou proche malade.'],
    ['evenement_familial','ÉVÉNEMENT FAMILIAL','ÉVÉN.','#f8e2f0','evenement_familial','Absence pour événement familial.'],
    ['deces','DÉCÈS / DEUIL','DEUIL','#f8e2f0','deces','Absence liée à un décès / deuil.'],
    ['formation','FORMATION','FORM.','#eee6ff','formation','Temps ou absence consacrée à une formation.'],
    ['sans_solde','SANS SOLDE','S/SOLDE','#f2e7da','sans_solde','Absence sans solde.'],
    ['absence_autorisee','ABSENCE AUTORISÉE','ABS.','#ffe6cf','absence_autorisee','Absence autorisée par l’employeur.'],
    ['absence_injustifiee','ABSENCE INJUSTIFIÉE','ABS !','#ffe6cf','absence_injustifiee','Absence non justifiée.'],
    ['ferie','JOUR FÉRIÉ','FÉRIÉ','#ffe9c9','ferie','Jour férié, traité selon le pays et la convention.']
  ].map((r,i)=>({
    id:r[0],label:r[1],short:r[2],color:r[3],legalType:r[4],
    meaning:r[5],active:true,builtin:true,order:i
  }));

  const legalSet=new Set(LEGAL_TYPES.map(x=>x[0]));

  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));

  const normHex=v=>/^#[0-9a-f]{6}$/i.test(String(v||''))?String(v).toLowerCase():'#eeeeee';

  function darken(hex,amount=.28){
    const h=normHex(hex).slice(1);
    const n=parseInt(h,16);
    const r=Math.max(0,Math.round(((n>>16)&255)*(1-amount)));
    const g=Math.max(0,Math.round(((n>>8)&255)*(1-amount)));
    const b=Math.max(0,Math.round((n&255)*(1-amount)));
    return '#'+[r,g,b].map(x=>x.toString(16).padStart(2,'0')).join('');
  }

  function cleanId(v,fallback){
    return String(v||fallback||'categorie')
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .replace(/[^a-z0-9_-]+/g,'_')
      .replace(/^_+|_+$/g,'')
      .slice(0,48)||fallback||'categorie';
  }

  function normalize(input){
    const source=Array.isArray(input)?input:[];
    const byId=new Map(source.map(c=>[String(c?.id||''),c]));
    const out=[];

    DEFAULTS.forEach(def=>{
      const custom=byId.get(def.id);
      out.push({
        ...def,
        ...(custom||{}),
        id:def.id,
        legalType:def.legalType,
        builtin:true,
        color:normHex(custom?.color||def.color),
        active:custom?.active!==false,
        order:Number.isFinite(Number(custom?.order))?Number(custom.order):def.order
      });
      byId.delete(def.id);
    });

    let nextOrder=DEFAULTS.length;
    for(const raw of byId.values()){
      if(out.length>=40) break;
      const id=cleanId(raw?.id,`custom_${nextOrder}`);
      if(out.some(x=>x.id===id)) continue;
      out.push({
        id,
        label:String(raw?.label||'Catégorie personnalisée').trim().slice(0,42)||'Catégorie personnalisée',
        short:String(raw?.short||raw?.label||'CAT').trim().slice(0,12)||'CAT',
        color:normHex(raw?.color),
        legalType:legalSet.has(String(raw?.legalType||''))?String(raw.legalType):'off',
        meaning:String(raw?.meaning||'').trim().slice(0,180),
        active:raw?.active!==false,
        builtin:false,
        order:Number.isFinite(Number(raw?.order))?Number(raw.order):nextOrder++
      });
    }
    return out.sort((a,b)=>Number(a.order||0)-Number(b.order||0));
  }

  function settings(){
    try{return typeof getRhSettings==='function'?(getRhSettings()||{}):{}}
    catch(_){return{}}
  }

  function getCatalog(){
    return normalize(settings().planningStatusCatalogV202);
  }

  function saveCatalog(catalog){
    const normalized=normalize(catalog);
    const active=normalized.filter(x=>x.active!==false);
    if(!active.some(x=>['present','off_soir','off_matin'].includes(x.legalType))){
      alert('Il faut conserver au moins une catégorie active qui correspond à du TRAVAIL.');
      return false;
    }
    if(!active.some(x=>x.legalType==='off')){
      alert('Il faut conserver au moins une catégorie active qui correspond à du REPOS / OFF.');
      return false;
    }

    try{
      if(typeof saveRhSettings==='function'){
        saveRhSettings({...settings(),planningStatusCatalogV202:normalized});
      }else{
        const s=settings();
        localStorage.setItem('ichef_rh_settings',JSON.stringify({...s,planningStatusCatalogV202:normalized}));
      }
      try{
        recordRhChange?.({
          type:'PLANNING_CATEGORY_SETTINGS',
          source:'DIRECTION_RH',
          by:typeof window.rhAuditActorV94==='function'?window.rhAuditActorV94():'Direction / RH',
          count:normalized.length,
          activeCount:active.length,
          message:'Catégories et couleurs du planning mises à jour'
        });
      }catch(_){}
      applyCatalogEverywhere();
      return true;
    }catch(error){
      console.error('[iCHEF RH V202] sauvegarde catalogue',error);
      alert('Impossible d’enregistrer les catégories.');
      return false;
    }
  }

  function byId(id){
    return getCatalog().find(x=>x.id===String(id||''))||null;
  }

  function categoryForPlan(plan){
    const status=String(plan?.status||'off');
    const wanted=String(plan?.categoryId||status);
    return byId(wanted) || byId(status) || {
      id:status,label:status.toUpperCase(),short:status.slice(0,8).toUpperCase(),
      color:'#eeeeee',legalType:status,meaning:'',active:true,builtin:true
    };
  }

  window.iChefPlanningCategoryCatalogV202=getCatalog;
  window.iChefPlanningCategoryByIdV202=byId;
  window.iChefPlanningMetaV202=categoryForPlan;
  window.iChefLegalTypeLabelV202=type=>LEGAL_TYPES.find(x=>x[0]===String(type||''))?.[1]||String(type||'');

  window.iChefPlanningCategoryOptionsV202=function(selected){
    const catalog=getCatalog().filter(x=>x.active!==false || x.id===String(selected||''));
    return catalog.map(c=>`<option value="${esc(c.id)}" ${c.id===String(selected||'')?'selected':''}>${esc(c.label)}</option>`).join('');
  };

  window.iChefPlanningCategoryButtonsV202=function(selected){
    const catalog=getCatalog().filter(x=>x.active!==false || x.id===String(selected||''));
    return catalog.map(c=>`
      <button
        type="button"
        data-status="${esc(c.legalType)}"
        data-category-id="${esc(c.id)}"
        title="${esc(c.meaning||window.iChefLegalTypeLabelV202(c.legalType))}"
        style="background:${esc(c.color)};border-color:${esc(darken(c.color))}"
        class="${c.id===String(selected||'')?'active':''}">
        ${esc(c.short||c.label)}
      </button>`).join('');
  };

  function ensureDefaultsSaved(){
    // Les catégories par défaut existent déjà dans le code via normalize().
    // On ne déclenche donc plus saveRhSettings/API.update au démarrage.
    // Elles ne sont persistées que lorsque le client personnalise le catalogue.
    const s=settings();
    return Array.isArray(s.planningStatusCatalogV202) && s.planningStatusCatalogV202.length > 0;
  }

  function dynamicCss(){
    const styleId='rh-v202-dynamic-category-css';
    let style=document.getElementById(styleId);
    if(!style){
      style=document.createElement('style');
      style.id=styleId;
      document.head.appendChild(style);
    }

    style.textContent=getCatalog().map(c=>{
      const id=CSS.escape(c.id);
      const bg=normHex(c.color);
      const border=darken(bg);
      return `
        [data-rh-category="${id}"],
        [data-category-id="${id}"]{
          --rh-v202-category-color:${bg};
          background-color:${bg}!important;
          border-color:${border}!important;
          color:#111!important;
        }`;
    }).join('\n');
  }

  function updateToolbar(){
    const bar=document.getElementById('rh-v200-fastbar');
    if(!bar) return;
    const select=document.getElementById('rh-v200-toolbar-status');
    if(select){
      const old=String(select.value||'present');
      const catalog=getCatalog().filter(x=>x.active!==false);
      const signature=catalog.map(c=>`${c.id}:${c.short||c.label}`).join('|');
      if(select.dataset.v202Signature!==signature){
        select.innerHTML=catalog.map(c=>`<option value="${esc(c.id)}">${esc(c.short||c.label)}</option>`).join('');
        select.dataset.v202Signature=signature;
      }
      select.value=catalog.some(c=>c.id===old)?old:(catalog.find(c=>c.legalType==='present')?.id||catalog[0]?.id||'present');
      const current=byId(select.value);
      if(current){
        select.style.background=current.color;
        select.style.borderColor=darken(current.color);
      }
    }

    if(!bar.querySelector('.rh-v202-categories-btn')){
      const btn=document.createElement('button');
      btn.type='button';
      btn.className='rh-v202-categories-btn';
      btn.textContent='CATÉGORIES / COULEURS';
      btn.title='Choisir les couleurs, noms, sens et catégories du planning';
      btn.addEventListener('click',openManager);
      const tools=bar.querySelector('.rh-v200-tools-toggle');
      if(tools) tools.insertAdjacentElement('beforebegin',btn);
      else bar.appendChild(btn);
    }

    const selected=byId(select?.value);
    bar.style.setProperty('--rh-v202-current-color',selected?.color||'#777777');
  }

  function updateLegend(){
    const legend=document.getElementById('rh-v201-legend');
    if(!legend) return;
    const active=getCatalog().filter(x=>x.active!==false);
    const signature=active.map(c=>`${c.id}:${c.short||c.label}:${c.color}:${c.meaning}`).join('|');
    if(legend.dataset.v202Signature===signature) return;
    legend.innerHTML=active.map(c=>`
      <button type="button"
              class="rh-v201-legend-chip rh-v205-category-action"
              data-rh-category="${esc(c.id)}"
              title="Appliquer ${esc(c.label)} aux jours sélectionnés · ${esc(c.meaning||window.iChefLegalTypeLabelV202(c.legalType))}">
        <i style="background:${esc(darken(c.color))}"></i>${esc(c.short||c.label)}
      </button>`).join('');
    legend.dataset.v202Signature=signature;
  }

  function planFromEditChip(chip){
    const sid=String(chip?.dataset?.rhEditStaff||'');
    const dateStr=String(chip?.dataset?.rhEditDate||'');
    if(!sid||!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
    const [y,m,d]=dateStr.split('-').map(Number);
    const mk=`${y}-${String(m).padStart(2,'0')}`;
    try{
      const ts=typeof getTs==='function'?getTs():{};
      return ts?.[mk]?.[sid]?.[d] || ts?.[mk]?.[sid]?.[String(d)] || {status:'off'};
    }catch(_){return null}
  }

  function colorRenderedPlanning(){
    document.querySelectorAll('#global-view-container .rh-status-quick-btn').forEach(btn=>{
      const sid=String(btn.dataset.rhStaff||'');
      const day=Number(btn.dataset.rhDay||0);
      const month=String(document.getElementById('month-selector')?.value||'');
      if(!sid||!day||!/^\d{4}-\d{2}$/.test(month)) return;
      let p=null;
      try{
        const ts=typeof getTs==='function'?getTs():{};
        p=ts?.[month]?.[sid]?.[day] || ts?.[month]?.[sid]?.[String(day)] || {status:'off'};
      }catch(_){p={status:'off'}}
      const cat=categoryForPlan(p);
      btn.dataset.rhCategory=cat.id;
      btn.style.backgroundColor=cat.color;
      btn.style.borderColor=darken(cat.color);
      btn.title=[cat.label,cat.meaning,btn.closest('td')?.title].filter(Boolean).join(' · ');
      const statusEl=btn.querySelector('.rh-cell-status');
      const nextStatusText=cat.short||cat.label;
      if(statusEl && statusEl.textContent!==nextStatusText) statusEl.textContent=nextStatusText;
    });

    document.querySelectorAll('.rh-cockpit-edit-chip[data-rh-edit-staff][data-rh-edit-date]').forEach(chip=>{
      const p=planFromEditChip(chip);
      if(!p) return;
      const cat=categoryForPlan(p);
      chip.dataset.rhCategory=cat.id;
      chip.style.backgroundColor=cat.color;
      chip.style.borderColor=darken(cat.color);
      chip.title=[cat.label,cat.meaning,chip.title].filter(Boolean).join(' · ');
      if(chip.classList.contains('rh-month-mini')){
        const nextChipText=cat.short||cat.label;
        if(chip.textContent!==nextChipText) chip.textContent=nextChipText;
      }
    });

    const categorySelect=document.getElementById('rh-cse-category');
    if(categorySelect){
      const cat=byId(categorySelect.value);
      if(cat){
        categorySelect.style.background=cat.color;
        categorySelect.style.borderColor=darken(cat.color);
      }
    }

    document.querySelectorAll('#rh-v200-quick-drawer [data-category-id]').forEach(btn=>{
      const cat=byId(btn.dataset.categoryId);
      if(cat){
        btn.style.background=cat.color;
        btn.style.borderColor=darken(cat.color);
      }
    });
  }

  function applyCatalogEverywhere(){
    dynamicCss();
    updateToolbar();
    updateLegend();
    colorRenderedPlanning();
    try{loadMonthData?.();}catch(_){}
    try{renderRhCockpit?.();}catch(_){}
    setTimeout(colorRenderedPlanning,30);
    window.dispatchEvent(new CustomEvent('ichef:planning-categories-updated',{
      detail:{version:VERSION,count:getCatalog().length,at:new Date().toISOString()}
    }));
  }

  function ensureModal(){
    let modal=document.getElementById('rh-v202-category-modal');
    if(modal) return modal;
    modal=document.createElement('div');
    modal.id='rh-v202-category-modal';
    modal.setAttribute('role','dialog');
    modal.setAttribute('aria-modal','true');
    modal.innerHTML=`
      <div class="rh-v202-category-panel">
        <div class="rh-v202-category-head">
          <div>
            <h3>Catégories & couleurs du planning</h3>
            <p>Chaque client peut choisir son vocabulaire et ses couleurs. Le « comportement légal » reste séparé afin que les calculs RH, les compteurs et les contrôles continuent de fonctionner correctement.</p>
          </div>
          <button type="button" class="rh-v202-category-close" aria-label="Fermer">×</button>
        </div>
        <div class="rh-v202-category-body">
          <div class="rh-v202-category-note">
            <strong>Exemple :</strong> vous pouvez créer « ÉCOLE » en violet et lui donner le comportement légal « Formation », ou « REPOS COMP. » en bleu avec le comportement « Récupération ». Masquer une catégorie standard ne supprime jamais les anciennes données du planning.
          </div>
          <div class="rh-v202-category-labels">
            <span>Actif</span><span>Couleur</span><span>Nom</span><span>Court</span>
            <span class="meaning-label">Signification pour votre équipe</span>
            <span class="legal-label">Comportement légal iCHEF</span><span>Action</span>
          </div>
          <div id="rh-v202-category-list"></div>
        </div>
        <div class="rh-v202-category-actions">
          <div class="rh-v202-category-actions-left">
            <button type="button" id="rh-v202-add-category">+ AJOUTER UNE CATÉGORIE</button>
            <button type="button" id="rh-v202-reset-categories">RÉINITIALISER</button>
          </div>
          <div class="rh-v202-category-actions-right">
            <button type="button" class="rh-v202-category-cancel">ANNULER</button>
            <button type="button" class="primary" id="rh-v202-save-categories">ENREGISTRER</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(modal);

    modal.addEventListener('click',e=>{
      if(e.target!==modal) return;
      const handler=window.iChefCategoryManagerCloseV209;
      if(typeof handler==='function') handler('cancel');
      else closeManager();
    });
    modal.querySelector('.rh-v202-category-close').addEventListener('click',()=>{
      const handler=window.iChefCategoryManagerCloseV209;
      if(typeof handler==='function') handler('save');
      else saveManager();
    });
    modal.querySelector('.rh-v202-category-cancel').addEventListener('click',()=>{
      const handler=window.iChefCategoryManagerCloseV209;
      if(typeof handler==='function') handler('cancel');
      else closeManager();
    });
    modal.querySelector('#rh-v202-add-category').addEventListener('click',addRow);
    modal.querySelector('#rh-v202-reset-categories').addEventListener('click',()=>{
      if(confirm('Réinitialiser toutes les catégories et couleurs par défaut ?')){
        renderRows(DEFAULTS);
      }
    });
    modal.querySelector('#rh-v202-save-categories').addEventListener('click',saveManager);
    return modal;
  }

  function legalOptions(selected,builtin=false){
    return LEGAL_TYPES.map(([v,l])=>`<option value="${esc(v)}" ${v===selected?'selected':''}>${esc(l)}</option>`).join('');
  }

  function rowHtml(c,index){
    const border=darken(c.color);
    return `
      <div class="rh-v202-category-row ${c.active===false?'inactive':''}" data-id="${esc(c.id)}" data-builtin="${c.builtin?'1':'0'}">
        <label class="rh-v202-active"><input type="checkbox" class="rh-v202-enabled" ${c.active!==false?'checked':''}><span>Actif</span></label>
        <input type="color" class="rh-v202-color" value="${esc(normHex(c.color))}" title="Couleur">
        <input type="text" class="rh-v202-label" maxlength="42" value="${esc(c.label)}" placeholder="Nom">
        <input type="text" class="rh-v202-short" maxlength="12" value="${esc(c.short)}" placeholder="Court">
        <input type="text" class="rh-v202-meaning rh-v202-meaning" maxlength="180" value="${esc(c.meaning||'')}" placeholder="Ex. Jour école / présence non opérationnelle">
        <select class="rh-v202-legal" ${c.builtin?'disabled title="Le comportement légal d’une catégorie standard est protégé."':''}>${legalOptions(c.legalType,c.builtin)}</select>
        <button type="button" class="rh-v202-remove">${c.builtin?'MASQUER':'SUPPRIMER'}</button>
        <div class="rh-v202-preview" style="display:none;background:${esc(c.color)};border-color:${esc(border)}">${esc(c.short||c.label)}</div>
      </div>`;
  }

  function renderRows(catalog){
    const list=document.getElementById('rh-v202-category-list');
    if(!list) return;
    list.innerHTML=normalize(catalog).map(rowHtml).join('');

    list.querySelectorAll('.rh-v202-category-row').forEach(row=>{
      const enabled=row.querySelector('.rh-v202-enabled');
      const color=row.querySelector('.rh-v202-color');
      const label=row.querySelector('.rh-v202-label');
      const short=row.querySelector('.rh-v202-short');
      const remove=row.querySelector('.rh-v202-remove');

      enabled?.addEventListener('change',()=>row.classList.toggle('inactive',!enabled.checked));
      color?.addEventListener('input',()=>{
        row.style.borderColor=darken(color.value);
        const preview=row.querySelector('.rh-v202-preview');
        if(preview) preview.style.background=color.value;
      });
      label?.addEventListener('input',()=>{
        if(!short?.dataset?.manual){
          short.value=String(label.value||'CAT').slice(0,10).toUpperCase();
        }
      });
      short?.addEventListener('input',()=>{short.dataset.manual='1';});
      remove?.addEventListener('click',()=>{
        const builtin=row.dataset.builtin==='1';
        if(builtin){
          enabled.checked=false;
          row.classList.add('inactive');
        }else{
          row.remove();
        }
      });
    });
  }

  function collectRows(){
    const rows=[...document.querySelectorAll('#rh-v202-category-list .rh-v202-category-row')];
    const used=new Set();
    return rows.map((row,index)=>{
      const builtin=row.dataset.builtin==='1';
      let id=cleanId(row.dataset.id,builtin?row.dataset.id:`custom_${index+1}`);
      while(used.has(id)) id=`${id}_${index+1}`;
      used.add(id);
      const legal=builtin
        ? (DEFAULTS.find(x=>x.id===id)?.legalType||'off')
        : String(row.querySelector('.rh-v202-legal')?.value||'off');
      return {
        id,
        label:String(row.querySelector('.rh-v202-label')?.value||'Catégorie').trim().slice(0,42)||'Catégorie',
        short:String(row.querySelector('.rh-v202-short')?.value||'CAT').trim().slice(0,12)||'CAT',
        color:normHex(row.querySelector('.rh-v202-color')?.value),
        legalType:legalSet.has(legal)?legal:'off',
        meaning:String(row.querySelector('.rh-v202-meaning')?.value||'').trim().slice(0,180),
        active:row.querySelector('.rh-v202-enabled')?.checked!==false,
        builtin,
        order:index
      };
    });
  }

  function addRow(){
    const list=document.getElementById('rh-v202-category-list');
    if(!list) return;
    const n=[...list.children].filter(x=>x.dataset.builtin!=='1').length+1;
    const cat={
      id:`custom_${Date.now()}_${n}`,
      label:'NOUVELLE CATÉGORIE',
      short:'NOUV.',
      color:'#e6f0ff',
      legalType:'off',
      meaning:'Décrivez ce que cette catégorie signifie pour votre équipe.',
      active:true,builtin:false,order:list.children.length
    };
    list.insertAdjacentHTML('beforeend',rowHtml(cat,list.children.length));
    renderRows(collectRows());
    list.lastElementChild?.scrollIntoView({block:'nearest'});
  }

  function openManager(){
    const modal=ensureModal();
    renderRows(getCatalog());
    modal.classList.add('show');
    window.iChefCategoryManagerOpenedV209?.();
  }

  function closeManager(){
    document.getElementById('rh-v202-category-modal')?.classList.remove('show');
  }

  function saveManager(){
    const catalog=collectRows();
    if(saveCatalog(catalog)){
      window.iChefCategoryManagerSavedV209?.();
      closeManager();
      try{showToast?.('Catégories planning enregistrées');}catch(_){}
    }
  }

  window.openPlanningCategoryManagerV202=openManager;

  /* Bouton et select peuvent être recréés par V200. */
  document.addEventListener('change',e=>{
    if(e.target?.id==='rh-v200-toolbar-status'){
      const c=byId(e.target.value);
      if(c){
        e.target.style.background=c.color;
        e.target.style.borderColor=darken(c.color);
        document.getElementById('rh-v200-fastbar')?.style.setProperty('--rh-v202-current-color',c.color);
      }
    }
    if(e.target?.id==='rh-cse-category'){
      setTimeout(colorRenderedPlanning,0);
    }
  },true);

  let refreshFrame=0;
  function scheduleV202Refresh(){
    if(refreshFrame) return;
    refreshFrame=requestAnimationFrame(()=>{
      refreshFrame=0;
      updateToolbar();
      updateLegend();
      colorRenderedPlanning();
    });
  }

  const observer=new MutationObserver(mutations=>{
    const relevant=mutations.some(m =>
      [...(m.addedNodes||[])].some(n =>
        n?.nodeType===1 && (
          n.matches?.('#rh-v200-fastbar,#rh-v201-legend,.rh-status-quick-btn,.rh-cockpit-edit-chip') ||
          n.querySelector?.('#rh-v200-fastbar,#rh-v201-legend,.rh-status-quick-btn,.rh-cockpit-edit-chip')
        )
      )
    );
    if(relevant) scheduleV202Refresh();
  });

  function boot(){
    ensureDefaultsSaved();
    dynamicCss();
    updateToolbar();
    updateLegend();
    colorRenderedPlanning();

    // Observer uniquement les zones réellement concernées par les catégories.
    // Plus de scan de tout document.body à chaque mutation.
    const roots=[
      document.getElementById('global-view-container'),
      document.getElementById('director-hub')
    ].filter(Boolean);
    roots.forEach(root=>observer.observe(root,{childList:true,subtree:true}));
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',boot,{once:true});
  }else{
    boot();
  }

  window.__ICHEF_RH_BUILD__=VERSION;
  console.info('[iCHEF RH V202] catégories/couleurs client · sens personnalisé · comportement légal séparé');
})();




;
/* RH V264 - preserved script #130 */

window.__ICHEF_RH_BUILD__='RH-V202-CLIENT-CATEGORIES';



;
/* RH V264 - preserved script #131 */

(() => {
  'use strict';
  if(window.__ICHEF_RH_V203_PIN_FIX__) return;
  window.__ICHEF_RH_V203_PIN_FIX__=true;

  window.setStaffPinStatusV203=function(type='neutral',message=''){
    const el=document.getElementById('rh-v203-pin-status');
    if(!el) return;
    el.className=`rh-v203-pin-status ${String(type||'neutral')}`;
    el.textContent=String(message||'');
  };

  window.testStaffPinV203=async function(){
    const input=document.getElementById('staff-pin');
    const btn=document.getElementById('rh-v203-test-pin');
    const pin=String(input?.value||'').replace(/\D+/g,'').slice(0,12);
    if(input) input.value=pin;

    if(!/^\d{4,12}$/.test(pin)){
      setStaffPinStatusV203('error','PIN invalide · 4 à 12 chiffres');
      return false;
    }

    // Si le PIN vient d'être modifié mais pas encore enregistré, prévenir
    // clairement : le serveur ne peut pas connaître une valeur non sauvegardée.
    const original=String(document.getElementById('staff-edit-original-pin')?.value||'').trim();
    const existing=(()=>{
      try{return getDir().find(s=>String(s.pin||'')===original)||null}
      catch(_){return null}
    })();

    if(existing && pin!==String(existing.pin||'')){
      setStaffPinStatusV203('warn','PIN modifié · enregistrez la fiche avant de le tester');
      return false;
    }

    if(!existing && !original){
      setStaffPinStatusV203('warn','Nouveau collaborateur · enregistrez d’abord la fiche');
      return false;
    }

    if(btn){btn.disabled=true;btn.textContent='TEST…';}
    setStaffPinStatusV203('syncing','Vérification sécurisée avec le serveur…');

    try{
      const auth=await verifyPinWithServer(pin);
      if(auth?.success){
        const role=String(auth.role||auth.dept||'accès').trim();
        setStaffPinStatusV203('ok',`✓ PIN reconnu${role?` · ${role}`:''}`);
        return true;
      }
      setStaffPinStatusV203('error',auth?.error||'PIN non reconnu par le serveur');
      return false;
    }catch(error){
      setStaffPinStatusV203('error',error?.message||'Serveur PIN indisponible');
      return false;
    }finally{
      if(btn){btn.disabled=false;btn.textContent='TESTER LE PIN';}
    }
  };

  // Nettoyage automatique : uniquement des chiffres dans la fiche employé.
  document.addEventListener('input',event=>{
    if(event.target?.id!=='staff-pin') return;
    const clean=String(event.target.value||'').replace(/\D+/g,'').slice(0,12);
    if(event.target.value!==clean) event.target.value=clean;
  },true);

  window.__ICHEF_RH_BUILD__='RH-V203-PIN-FIX-SYNC-TEST';
  console.info('[iCHEF RH V203] PIN : validation serveur renforcée · sync prioritaire · test intégré');
})();



;
/* RH V264 - preserved script #132 */

window.__ICHEF_RH_BUILD__='RH-V203-PIN-FIX-SYNC-TEST';



;
/* RH V264 - preserved script #133 */

(() => {
  'use strict';
  if(window.__ICHEF_RH_V204_PERF__) return;
  window.__ICHEF_RH_V204_PERF__=true;

  const started=performance.now();

  // Expose un diagnostic léger pour support, sans données personnelles.
  window.ICHEF_RH_PERF_V204={
    version:'RH-V204-PERFORMANCE-SAFE-CLEANUP',
    startedAt:Date.now(),
    idleSupported:'requestIdleCallback' in window,
    mark(name){
      try{performance.mark(`ichef-rh-v204:${String(name||'mark')}`)}catch(_){}
    }
  };

  const markReady=()=>{
    window.ICHEF_RH_PERF_V204.readyMs=Math.round(performance.now()-started);
    window.ICHEF_RH_PERF_V204.mark('ready');
  };

  if(document.readyState==='complete') markReady();
  else window.addEventListener('load',markReady,{once:true});

  window.__ICHEF_RH_BUILD__='RH-V204-PERFORMANCE-SAFE-CLEANUP';
  console.info('[iCHEF RH V204] nettoyage performance sûr · connexions/sécurité/fonctions conservées');
})();



;
/* RH V264 - preserved script #134 */

window.__ICHEF_RH_BUILD__='RH-V204-PERFORMANCE-SAFE-CLEANUP';



;
/* RH V264 - preserved script #135 */

(() => {
  'use strict';
  if(window.__ICHEF_RH_V205_TOUCH_CATEGORY__) return;
  window.__ICHEF_RH_V205_TOUCH_CATEGORY__=true;

  let applying=false;

  function legend(){
    return document.getElementById('rh-v201-legend');
  }

  function count(){
    try{
      return Number(window.ICHEF_FAST_PLANNING_V205?.getSelectionCount?.()||0);
    }catch(_){
      return document.querySelectorAll('#global-view-container .rh-v200-selected').length;
    }
  }

  function ensureTip(){
    const el=legend();
    if(!el || document.getElementById('rh-v205-touch-tip')) return;
    const tip=document.createElement('span');
    tip.id='rh-v205-touch-tip';
    tip.innerHTML='<strong>☝</strong> Touchez maintenant la catégorie à appliquer';
    el.appendChild(tip);
  }

  function refresh(){
    const el=legend();
    if(!el) return;
    ensureTip();

    const n=count();
    el.classList.toggle('rh-v205-has-selection',n>0);
    el.dataset.selectionLabel=n
      ? `${n} case${n>1?'s':''} sélectionnée${n>1?'s':''}`
      : '';

    const current=String(document.getElementById('rh-v200-toolbar-status')?.value||'');
    el.querySelectorAll('.rh-v205-category-action').forEach(btn=>{
      btn.classList.toggle('rh-v205-ready',String(btn.dataset.rhCategory||'')===current);
      btn.setAttribute(
        'aria-label',
        n
          ? `Appliquer ${btn.textContent.trim()} aux ${n} cases sélectionnées`
          : `Choisir ${btn.textContent.trim()} puis sélectionner des cases`
      );
    });
  }

  async function applyCategory(categoryId){
    const api=window.ICHEF_FAST_PLANNING_V205;
    if(!api?.applyCategory) return false;

    const n=count();
    if(!n){
      api.setCategory?.(categoryId);
      try{showToast?.('Catégorie choisie · sélectionnez maintenant les cases');}catch(_){}
      refresh();
      return false;
    }

    if(applying) return false;
    applying=true;

    const el=legend();
    el?.classList.add('rh-v205-applying');

    try{
      // clearAfter=true : exactement le flux tactile demandé.
      // 2 jours → FÉRIÉ, la sélection s'efface ;
      // puis 4 autres jours → TRAVAIL.
      return await api.applyCategory(categoryId,{clearAfter:true});
    }finally{
      applying=false;
      el?.classList.remove('rh-v205-applying');
      refresh();
    }
  }

  document.addEventListener('click',event=>{
    const btn=event.target?.closest?.('#rh-v201-legend .rh-v205-category-action[data-rh-category]');
    if(!btn) return;

    event.preventDefault();
    event.stopPropagation();

    applyCategory(String(btn.dataset.rhCategory||''));
  },true);

  // Sur tactile, click est déjà produit après pointerup ; pas de double handler.
  // On donne simplement un retour visuel dès le contact.
  document.addEventListener('pointerdown',event=>{
    const btn=event.target?.closest?.('#rh-v201-legend .rh-v205-category-action[data-rh-category]');
    if(!btn) return;
    if(['touch','pen'].includes(String(event.pointerType||''))){
      btn.style.transform='scale(.96)';
    }
  },true);

  document.addEventListener('pointerup',event=>{
    const btn=event.target?.closest?.('#rh-v201-legend .rh-v205-category-action[data-rh-category]');
    if(btn) btn.style.removeProperty('transform');
  },true);

  document.addEventListener('pointercancel',event=>{
    const btn=event.target?.closest?.('#rh-v201-legend .rh-v205-category-action[data-rh-category]');
    if(btn) btn.style.removeProperty('transform');
  },true);

  // La sélection change souvent sans reconstruction DOM.
  // On se branche donc sur l'API de rafraîchissement tactile V201.
  const oldRefresh=window.iChefV201RefreshTouchState;
  window.iChefV201RefreshTouchState=function(...args){
    const result=typeof oldRefresh==='function'
      ? oldRefresh.apply(this,args)
      : undefined;
    requestAnimationFrame(refresh);
    return result;
  };

  // Si la légende est reconstruite par les catégories client V202.
  const global=document.getElementById('global-view-container');
  if(global){
    let frame=0;
    new MutationObserver(mutations=>{
      const relevant=mutations.some(m =>
        [...(m.addedNodes||[])].some(n =>
          n?.nodeType===1 && (
            n.id==='rh-v201-legend' ||
            n.matches?.('.rh-v201-legend-chip') ||
            n.querySelector?.('#rh-v201-legend')
          )
        )
      );
      if(!relevant || frame) return;
      frame=requestAnimationFrame(()=>{
        frame=0;
        refresh();
      });
    }).observe(global,{childList:true,subtree:true});
  }

  document.addEventListener('change',event=>{
    if(event.target?.id==='rh-v200-toolbar-status') refresh();
  },true);

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',refresh,{once:true});
  }else{
    refresh();
  }
  setTimeout(refresh,180);

  window.__ICHEF_RH_BUILD__='RH-V205-TOUCH-APPLY-CATEGORY';
  console.info('[iCHEF RH V205] sélection tactile → catégorie en un tap');
})();



;
/* RH V264 - preserved script #136 */

window.__ICHEF_RH_BUILD__='RH-V205-TOUCH-APPLY-CATEGORY';



;
/* RH V264 - preserved script #137 */

(() => {
  'use strict';
  if(window.__ICHEF_RH_V206_BUGFIX__) return;
  window.__ICHEF_RH_V206_BUGFIX__=true;

  const HOUR_LIMIT=5;

  function parseCalendarDate(dateStr){
    const m=String(dateStr||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if(!m) return null;
    const y=Number(m[1]), mo=Number(m[2]), d=Number(m[3]);
    const test=new Date(y,mo-1,d,12,0,0,0);
    if(
      test.getFullYear()!==y ||
      test.getMonth()!==mo-1 ||
      test.getDate()!==d
    ) return null;
    return {y,mo,d};
  }

  function firstStartV206(plan){
    const p=plan&&typeof plan==='object'?plan:{};
    const starts=[p.s1,p.s2]
      .map(v=>String(v||'').match(/^(\d{1,2}):(\d{2})/)?.slice(1,3))
      .filter(Boolean)
      .map(([h,m])=>({h:Number(h),m:Number(m)}))
      .filter(x=>x.h>=0&&x.h<=23&&x.m>=0&&x.m<=59)
      .sort((a,b)=>(a.h*60+a.m)-(b.h*60+b.m));

    if(starts.length) return starts[0];

    const s=typeof getRhSettings==='function'?(getRhSettings()||{}):{};
    const st=String(p.status||'').toLowerCase();
    let raw='';
    if(st==='off_matin') raw=String(s.dinnerWorkStart||s.dinnerStart||'18:00');
    else if(['present','off_soir','ferie'].includes(st)) raw=String(s.lunchWorkStart||s.lunchStart||'10:00');
    else return null;

    const mm=raw.match(/^(\d{1,2}):(\d{2})/);
    if(!mm) return null;
    return {h:Number(mm[1]),m:Number(mm[2])};
  }

  /* Remplace seulement le calcul de fenêtre temporelle.
     La sécurité, le motif obligatoire et la sauvegarde signée V102 restent actifs. */
  const previousWindow=window.rhPlanningChangeWindowV102;
  window.rhPlanningChangeWindowV102=function(dateStr,before,after){
    const cal=parseCalendarDate(dateStr);
    if(!cal){
      console.warn('[iCHEF RH V206] date planning invalide ignorée',dateStr);
      return {needsReason:false,kind:'INVALID_DATE',start:'',hours:null};
    }

    const start=firstStartV206(after)||firstStartV206(before);

    // Pour une absence/repos sans horaire explicite :
    // on utilise midi comme V102, mais avec construction locale numérique
    // pour éviter toute ambiguïté de parsing navigateur.
    const dt=start
      ? new Date(cal.y,cal.mo-1,cal.d,start.h,start.m,0,0)
      : new Date(cal.y,cal.mo-1,cal.d,12,0,0,0);

    const hours=(dt.getTime()-Date.now())/3600000;

    if(hours<=0){
      return {
        needsReason:true,
        kind:'STARTED_OR_PAST',
        start:start?`${String(start.h).padStart(2,'0')}:${String(start.m).padStart(2,'0')}`:'',
        hours
      };
    }
    if(start && hours<=HOUR_LIMIT){
      return {
        needsReason:true,
        kind:'URGENT_5H',
        start:`${String(start.h).padStart(2,'0')}:${String(start.m).padStart(2,'0')}`,
        hours
      };
    }
    return {
      needsReason:false,
      kind:'NORMAL',
      start:start?`${String(start.h).padStart(2,'0')}:${String(start.m).padStart(2,'0')}`:'',
      hours
    };
  };
  window.rhPlanningChangeWindowV102.__v206Fixed=true;
  window.__rhPlanningChangeWindowBeforeV206=previousWindow;

  function clearPlanningSelection(reason=''){
    const api=window.ICHEF_FAST_PLANNING_V205;
    try{api?.clearSelection?.();}catch(_){}
    document.querySelectorAll('#global-view-container .rh-v200-selected')
      .forEach(el=>el.classList.remove('rh-v200-selected'));

    const legend=document.getElementById('rh-v201-legend');
    if(legend){
      legend.classList.remove('rh-v205-has-selection');
      legend.dataset.selectionLabel='';
    }

    if(reason){
      console.info('[iCHEF RH V206] sélection planning effacée',reason);
    }
  }

  /* Changement manuel de mois. */
  document.getElementById('month-selector')?.addEventListener('change',()=>{
    clearPlanningSelection('month-change');
  },true);

  /* Flèches mois précédent/suivant : changeMonth appelle handleMonthChange
     sans déclencher nécessairement l'événement change. */
  const previousChangeMonth=window.changeMonth;
  if(typeof previousChangeMonth==='function'&&!previousChangeMonth.__v206Wrapped){
    const wrapped=function(...args){
      clearPlanningSelection('month-navigation');
      return previousChangeMonth.apply(this,args);
    };
    wrapped.__v206Wrapped=true;
    window.changeMonth=wrapped;
  }

  const previousHandleMonth=window.handleMonthChange;
  if(typeof previousHandleMonth==='function'&&!previousHandleMonth.__v206Wrapped){
    const wrapped=function(...args){
      clearPlanningSelection('month-render');
      return previousHandleMonth.apply(this,args);
    };
    wrapped.__v206Wrapped=true;
    window.handleMonthChange=wrapped;
  }

  /* Si le mois est modifié par l'IA/autopilote de façon programmatique,
     détecter uniquement la valeur du sélecteur, pas tout le DOM. */
  const selector=document.getElementById('month-selector');
  let lastMonth=String(selector?.value||'');
  const checkMonth=()=>{
    const current=String(selector?.value||'');
    if(current!==lastMonth){
      lastMonth=current;
      clearPlanningSelection('programmatic-month-change');
    }
  };
  if(selector){
    selector.addEventListener('input',checkMonth,true);
    selector.addEventListener('change',checkMonth,true);
  }

  /* Avant toute action de catégorie, enlever un éventuel transform tactile
     resté après un pointercancel. */
  document.addEventListener('pointercancel',()=>{
    document.querySelectorAll('#rh-v201-legend .rh-v205-category-action')
      .forEach(btn=>btn.style.removeProperty('transform'));
  },true);

  /* Petit test interne non intrusif : décembre 2026 doit être futur depuis
     septembre 2026 et ne doit donc jamais demander un motif par erreur. */
  window.ICHEF_RH_V206_TESTS={
    planningWindow(dateStr,before={},after={}){
      return window.rhPlanningChangeWindowV102(dateStr,before,after);
    },
    clearSelection:clearPlanningSelection
  };

  window.__ICHEF_RH_BUILD__='RH-V206-BUGFIX-TACTILE-SELECTION';
  console.info('[iCHEF RH V206] bugs sélection fantôme / changement de mois / motif futur corrigés');
})();



;
/* RH V264 - preserved script #138 */

window.__ICHEF_RH_BUILD__='RH-V206-BUGFIX-TACTILE-SELECTION';



;
/* RH V264 - preserved script #139 */

(() => {
  'use strict';
  if(window.__ICHEF_RH_V207_FOCUS__) return;
  window.__ICHEF_RH_V207_FOCUS__=true;

  const HOLD_MS=500;
  const MOVE_CANCEL_PX=12;
  let hold=null;
  let suppressClickUntil=0;
  let savedScroll={globalLeft:0,globalTop:0};
  let hintTimer=0;

  const monthView=()=>document.getElementById('month-view-container');
  const globalView=()=>document.getElementById('global-view-container');

  function isFocus(){
    return document.body.classList.contains('rh-v207-focus-open');
  }

  function showHint(message){
    let hint=document.getElementById('rh-v207-focus-hint');
    if(!hint){
      hint=document.createElement('div');
      hint.id='rh-v207-focus-hint';
      document.body.appendChild(hint);
    }
    hint.textContent=String(message||'');
    hint.classList.add('show');
    clearTimeout(hintTimer);
    hintTimer=setTimeout(()=>hint.classList.remove('show'),1900);
  }

  function updateButton(){
    const btn=document.getElementById('rh-v207-focus-toggle');
    if(!btn) return;
    if(isFocus()){
      btn.innerHTML='× QUITTER PLEIN ÉCRAN';
      btn.title='Revenir à l’écran RH complet';
    }else{
      btn.innerHTML='⛶ VUE ÉQUIPE';
      btn.title='Plein écran planning · ou maintenir 0,5 s sur le cadre';
    }
  }

  function ensureButton(){
    const bar=document.getElementById('rh-v200-fastbar');
    if(!bar) return;

    let btn=document.getElementById('rh-v207-focus-toggle');
    if(!btn){
      btn=document.createElement('button');
      btn.type='button';
      btn.id='rh-v207-focus-toggle';

      const firstAction=bar.querySelector('.rh-v200-select-mode');
      if(firstAction) firstAction.insertAdjacentElement('beforebegin',btn);
      else bar.prepend(btn);

      btn.addEventListener('click',event=>{
        event.preventDefault();
        event.stopPropagation();
        toggleFocus('button');
      });
    }
    updateButton();
  }

  function saveScrollPosition(){
    const global=globalView();
    if(global){
      savedScroll.globalLeft=global.scrollLeft;
      savedScroll.globalTop=global.scrollTop;
    }
  }

  function restoreScrollPosition(){
    requestAnimationFrame(()=>{
      const global=globalView();
      if(global){
        global.scrollLeft=savedScroll.globalLeft||0;
        global.scrollTop=savedScroll.globalTop||0;
      }
    });
  }

  function enterFocus(source='touch'){
    if(isFocus()) return;

    const mv=monthView();
    if(!mv) return;

    saveScrollPosition();

    // Fermer les éléments qui mangeraient de la place,
    // sans modifier leur contenu ni leur état métier.
    document.getElementById('rh-v200-tools-deck')?.classList.remove('show');
    document.getElementById('rh-v200-quick-drawer')?.classList.remove('show');

    document.body.classList.add('rh-v207-focus-open');
    mv.classList.remove('rh-v207-holding');
    updateButton();
    restoreScrollPosition();

    try{navigator.vibrate?.(18)}catch(_){}
    showHint('Vue équipe plein écran · appui 0,5 s sur le cadre pour quitter');

    window.dispatchEvent(new CustomEvent('ichef:planning-focus-change',{
      detail:{open:true,source,at:new Date().toISOString()}
    }));
  }

  function exitFocus(source='touch'){
    if(!isFocus()) return;

    saveScrollPosition();
    document.body.classList.remove('rh-v207-focus-open');
    monthView()?.classList.remove('rh-v207-holding');
    updateButton();
    restoreScrollPosition();

    try{navigator.vibrate?.(10)}catch(_){}
    showHint('Retour à l’écran RH');

    window.dispatchEvent(new CustomEvent('ichef:planning-focus-change',{
      detail:{open:false,source,at:new Date().toISOString()}
    }));
  }

  function toggleFocus(source='touch'){
    if(isFocus()) exitFocus(source);
    else enterFocus(source);
  }

  /* Zones à NE PAS utiliser pour l'appui 0,5 s :
     - cases : leur appui long sert déjà à la sélection tactile
     - boutons/champs : leurs actions doivent rester normales
     - catégories : un tap applique la catégorie
     - scrollbar / drawer / modales
  */
  function isExcludedTarget(target){
    if(!target?.closest) return true;
    return !!target.closest([
      '.rh-status-quick-btn',
      'button',
      'select',
      'input',
      'textarea',
      'a',
      '[contenteditable="true"]',
      '#rh-v200-fastbar',
      '#rh-v201-legend',
      '#rh-v200-tools-deck',
      '#rh-v200-quick-drawer',
      '.modal',
      '[role="dialog"]'
    ].join(','));
  }

  function eligibleTarget(target){
    const mv=monthView();
    if(!mv || !mv.contains(target)) return false;
    if(isExcludedTarget(target)) return false;

    // Très pratique sur tablette :
    // nom collaborateur, en-tête du jour, bordure ou zone blanche.
    return !!target.closest(
      '#global-view-container, #table-container-individual, #annual-view-container, #month-view-container'
    );
  }

  function cancelHold(){
    if(!hold) return;
    clearTimeout(hold.timer);
    monthView()?.classList.remove('rh-v207-holding');
    hold=null;
  }

  function startHold(event){
    if(event.button != null && event.button !== 0) return;
    if(!['touch','pen','mouse'].includes(String(event.pointerType||'mouse'))) return;
    if(!eligibleTarget(event.target)) return;

    cancelHold();

    const mv=monthView();
    hold={
      pointerId:event.pointerId,
      startX:event.clientX,
      startY:event.clientY,
      target:event.target,
      timer:setTimeout(()=>{
        if(!hold || hold.pointerId!==event.pointerId) return;
        suppressClickUntil=Date.now()+850;
        mv?.classList.remove('rh-v207-holding');
        toggleFocus('long-press-500ms');
        hold=null;
      },HOLD_MS)
    };

    // Montrer que l'appui est bien détecté sans bloquer le scroll tout de suite.
    setTimeout(()=>{
      if(hold && hold.pointerId===event.pointerId){
        mv?.classList.add('rh-v207-holding');
      }
    },250);
  }

  function moveHold(event){
    if(!hold || hold.pointerId!==event.pointerId) return;
    const dx=Math.abs(event.clientX-hold.startX);
    const dy=Math.abs(event.clientY-hold.startY);

    // Un geste de scroll ne doit jamais déclencher le plein écran.
    if(dx>MOVE_CANCEL_PX || dy>MOVE_CANCEL_PX){
      cancelHold();
    }
  }

  function finishHold(event){
    if(!hold || hold.pointerId!==event.pointerId) return;
    cancelHold();
  }

  document.addEventListener('pointerdown',startHold,true);
  document.addEventListener('pointermove',moveHold,true);
  document.addEventListener('pointerup',finishHold,true);
  document.addEventListener('pointercancel',finishHold,true);

  // Supprime le clic synthétique qui suit un appui long réussi.
  document.addEventListener('click',event=>{
    if(Date.now()>=suppressClickUntil) return;
    if(!monthView()?.contains(event.target)) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  },true);

  // ESC sur ordinateur / clavier tablette.
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape' && isFocus()){
      event.preventDefault();
      exitFocus('escape');
    }
  },true);

  // Si on quitte complètement le module RH, ne pas laisser l'overlay.
  document.addEventListener('click',event=>{
    const nav=event.target?.closest?.('[onclick*="openInterface"], [onclick*="goHome"], .btn-accueil-ia');
    if(nav && isFocus()){
      exitFocus('navigation');
    }
  },true);

  // Le fastbar est injecté dynamiquement par V200.
  const mv=monthView();
  if(mv){
    let frame=0;
    new MutationObserver(()=>{
      if(frame) return;
      frame=requestAnimationFrame(()=>{
        frame=0;
        ensureButton();
      });
    }).observe(mv,{childList:true,subtree:true});
  }

  function boot(){
    ensureButton();
    updateButton();
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',boot,{once:true});
  }else{
    boot();
  }
  setTimeout(boot,160);

  window.ICHEF_PLANNING_FOCUS_V207={
    enter:enterFocus,
    exit:exitFocus,
    toggle:toggleFocus,
    isOpen:isFocus,
    holdMs:HOLD_MS
  };

  window.__ICHEF_RH_BUILD__='RH-V207-PLANNING-FOCUS-TOUCH';
  console.info('[iCHEF RH V207] appui 0,5 s planning → vue équipe plein écran');
})();



;
/* RH V264 - preserved script #140 */

window.__ICHEF_RH_BUILD__='RH-V207-PLANNING-FOCUS-TOUCH';



;
/* RH V264 - preserved script #141 */

(() => {
  'use strict';
  if(window.__ICHEF_RH_V208_HOLIDAYS__) return;
  window.__ICHEF_RH_V208_HOLIDAYS__=true;

  const VERSION='RH-V208-HOLIDAY-SYMBIOSIS';
  const SOURCE_VERSION='SECO-2024-12-12__FR-L3133-1-2026__LGAV-ART18';

  /* ---------------------------------------------------------
     1. JURIDICTIONS
     --------------------------------------------------------- */
  const CANTONS=[
    ['AG','Argovie'],['AI','Appenzell Rhodes-Intérieures'],
    ['AR','Appenzell Rhodes-Extérieures'],['BE','Berne'],
    ['BL','Bâle-Campagne'],['BS','Bâle-Ville'],
    ['FR','Fribourg'],['GE','Genève'],['GL','Glaris'],
    ['GR','Grisons'],['JU','Jura'],['LU','Lucerne'],
    ['NE','Neuchâtel'],['NW','Nidwald'],['OW','Obwald'],
    ['SG','Saint-Gall'],['SH','Schaffhouse'],['SO','Soleure'],
    ['SZ','Schwyz'],['TG','Thurgovie'],['TI','Tessin'],
    ['UR','Uri'],['VD','Vaud'],['VS','Valais'],
    ['ZG','Zoug'],['ZH','Zurich']
  ];

  const CANTON_NAMES=Object.fromEntries(CANTONS);

  const LOCAL_PROFILES={
    AG:[
      ['','— Sélection locale obligatoire —'],
      ['AG_AARAU','Aarau / Brugg / Kulm / Lenzburg / Zofingue + Bergdietikon'],
      ['AG_BADEN','Autres communes du district de Baden'],
      ['AG_BREMGARTEN','District de Bremgarten'],
      ['AG_LAUFENBURG_MURI','Districts de Laufenburg et Muri'],
      ['AG_RHEINFELDEN_A','Rheinfelden · Hellikon/Mumpf/Obermumpf/Schupfart/Stein/Wegenstetten'],
      ['AG_RHEINFELDEN_B','Rheinfelden · Kaiseraugst/Magden/Möhlin/Olsberg/Rheinfelden/Wallbach/Zeiningen/Zuzgen'],
      ['AG_ZURZACH','District de Zurzach']
    ],
    FR:[
      ['','— Sélection communale obligatoire —'],
      ['FR_CATHOLIC','Commune à population majoritairement catholique romaine'],
      ['FR_REFORMED','Commune à population majoritairement évangélique réformée']
    ],
    NE:[
      ['','— Sélection locale obligatoire —'],
      ['NE_GENERAL','Canton de Neuchâtel · hors Le Landeron'],
      ['NE_LANDERON','Commune du Landeron']
    ],
    SO:[
      ['','— Sélection locale obligatoire —'],
      ['SO_GENERAL','Canton de Soleure · hors district de Bucheggberg'],
      ['SO_BUCHEGGBERG','District de Bucheggberg']
    ]
  };

  const FR_ZONES=[
    ['','— Sélection de la zone obligatoire —'],
    ['GENERAL','France métropolitaine · cas général · 11 fêtes légales'],
    ['ALSACE_MOSELLE','Alsace-Moselle · 12 + Vendredi saint si commune concernée'],
    ['GUADELOUPE','Guadeloupe · 11 + abolition de l’esclavage'],
    ['GUYANE','Guyane · 11 + abolition de l’esclavage'],
    ['MARTINIQUE','Martinique · 11 + abolition de l’esclavage'],
    ['MAYOTTE','Mayotte · 11 + abolition de l’esclavage'],
    ['REUNION','La Réunion · 11 + abolition de l’esclavage'],
    ['SAINT_BARTHELEMY','Saint-Barthélemy · 11 + abolition de l’esclavage'],
    ['SAINT_MARTIN','Saint-Martin · 11 + abolition de l’esclavage']
  ];

  const EURO_AREA_2026=new Set([
    'AT','BE','BG','HR','CY','EE','FI','FR','DE','GR','IE',
    'IT','LV','LT','LU','MT','NL','PT','SK','SI','ES'
  ]);

  const NAME_TO_ISO={
    'FRANCE':'FR','SUISSE':'CH','SWITZERLAND':'CH','SCHWEIZ':'CH',
    'AUSTRIA':'AT','AUTRICHE':'AT','BELGIUM':'BE','BELGIQUE':'BE',
    'BULGARIA':'BG','BULGARIE':'BG','CROATIA':'HR','CROATIE':'HR',
    'CYPRUS':'CY','CHYPRE':'CY','ESTONIA':'EE','ESTONIE':'EE',
    'FINLAND':'FI','FINLANDE':'FI','GERMANY':'DE','ALLEMAGNE':'DE',
    'GREECE':'GR','GRECE':'GR','GRÈCE':'GR','IRELAND':'IE','IRLANDE':'IE',
    'ITALY':'IT','ITALIE':'IT','LATVIA':'LV','LETTONIE':'LV',
    'LITHUANIA':'LT','LITUANIE':'LT','LUXEMBOURG':'LU',
    'MALTA':'MT','MALTE':'MT','NETHERLANDS':'NL','PAYS-BAS':'NL',
    'PORTUGAL':'PT','SLOVAKIA':'SK','SLOVAQUIE':'SK',
    'SLOVENIA':'SI','SLOVENIE':'SI','SLOVÉNIE':'SI',
    'SPAIN':'ES','ESPAGNE':'ES'
  };

  /* ---------------------------------------------------------
     2. OUTILS DATE
     --------------------------------------------------------- */
  const pad=n=>String(n).padStart(2,'0');

  function isoDate(y,m,d){
    return `${y}-${pad(m)}-${pad(d)}`;
  }

  function localDate(y,m,d){
    return new Date(Number(y),Number(m)-1,Number(d),12,0,0,0);
  }

  function dateIso(date){
    return isoDate(date.getFullYear(),date.getMonth()+1,date.getDate());
  }

  function addDays(date,days){
    const d=new Date(date.getFullYear(),date.getMonth(),date.getDate(),12,0,0,0);
    d.setDate(d.getDate()+Number(days||0));
    return d;
  }

  // Meeus/Jones/Butcher · Pâques grégorienne.
  function easterSunday(year){
    const y=Number(year);
    const a=y%19;
    const b=Math.floor(y/100);
    const c=y%100;
    const d=Math.floor(b/4);
    const e=b%4;
    const f=Math.floor((b+8)/25);
    const g=Math.floor((b-f+1)/3);
    const h=(19*a+b-d-g+15)%30;
    const i=Math.floor(c/4);
    const k=c%4;
    const l=(32+2*e+2*i-h-k)%7;
    const m=Math.floor((a+11*h+22*l)/451);
    const month=Math.floor((h+l-7*m+114)/31);
    const day=((h+l-7*m+114)%31)+1;
    return localDate(y,month,day);
  }

  function firstWeekdayOfMonth(year,month,weekday){
    const first=localDate(year,month,1);
    const shift=(weekday-first.getDay()+7)%7;
    return addDays(first,shift);
  }

  function nthWeekdayOfMonth(year,month,weekday,n){
    return addDays(firstWeekdayOfMonth(year,month,weekday),(Number(n)-1)*7);
  }

  function holiday(key,name,date,extra={}){
    return {
      key,
      name,
      date:dateIso(date),
      fraction:1,
      official:true,
      ...extra
    };
  }

  function fixed(year,key,name,month,day,extra={}){
    return holiday(key,name,localDate(year,month,day),extra);
  }

  function movable(year,key,name,offset,extra={}){
    return holiday(key,name,addDays(easterSunday(year),offset),extra);
  }

  function naefelserFahrt(year){
    let d=firstWeekdayOfMonth(year,4,4); // jeudi
    const easter=easterSunday(year);
    const diff=Math.round((easter.getTime()-d.getTime())/86400000);
    if(diff>=1 && diff<=6) d=addDays(d,7);
    return holiday(
      'FAHRTSFEST',
      'Näfelser Fahrt',
      d,
      {source:'Canton de Glaris',sundayEquivalent:true}
    );
  }

  function genevaFast(year){
    const firstSunday=firstWeekdayOfMonth(year,9,0);
    return holiday(
      'GENEVA_FAST',
      'Jeûne genevois',
      addDays(firstSunday,4),
      {sundayEquivalent:true}
    );
  }

  function vaudFastMonday(year){
    const thirdSunday=nthWeekdayOfMonth(year,9,0,3);
    return holiday(
      'VAUD_FAST_MON',
      'Lundi du Jeûne fédéral',
      addDays(thirdSunday,1),
      {sundayEquivalent:true}
    );
  }

  /* ---------------------------------------------------------
     3. FRANCE
     --------------------------------------------------------- */
  function franceBase(year){
    return [
      fixed(year,'NY','Jour de l’An',1,1),
      movable(year,'EASTER_MON','Lundi de Pâques',1),
      fixed(year,'MAY1','Fête du Travail',5,1,{mandatoryRestGeneral:true}),
      fixed(year,'MAY8','Victoire 1945',5,8),
      movable(year,'ASCENSION','Ascension',39),
      movable(year,'WHIT_MON','Lundi de Pentecôte',50),
      fixed(year,'JUL14','Fête nationale',7,14),
      fixed(year,'ASSUMPTION','Assomption',8,15),
      fixed(year,'ALL_SAINTS','Toussaint',11,1),
      fixed(year,'NOV11','Armistice 1918',11,11),
      fixed(year,'XMAS','Noël',12,25)
    ].map(x=>({
      ...x,
      country:'FR',
      classification:'FÊTE LÉGALE · Code du travail L3133-1',
      sundayEquivalent:false
    }));
  }

  const FR_EXTRA={
    GUADELOUPE:[5,27,'Commémoration de l’abolition de l’esclavage'],
    GUYANE:[6,10,'Commémoration de l’abolition de l’esclavage'],
    MARTINIQUE:[5,22,'Commémoration de l’abolition de l’esclavage'],
    MAYOTTE:[4,27,'Commémoration de l’abolition de l’esclavage'],
    REUNION:[12,20,'Commémoration de l’abolition de l’esclavage'],
    SAINT_BARTHELEMY:[10,9,'Commémoration de l’abolition de l’esclavage'],
    SAINT_MARTIN:[5,27,'Commémoration de l’abolition de l’esclavage']
  };

  function franceCalendar(year,config){
    const zone=String(config?.frZone||'');
    if(!zone){
      return {
        complete:false,
        blockers:['France · sélectionnez la zone du calendrier des jours fériés.'],
        days:[],
        statutoryCount:null,
        summary:'Zone France non confirmée.'
      };
    }

    let days=franceBase(year);

    if(zone==='ALSACE_MOSELLE'){
      days.push(
        fixed(year,'ST_STEPHEN','Saint-Étienne · 26 décembre',12,26,{
          country:'FR',
          classification:'Alsace-Moselle · fête légale locale'
        })
      );
      if(config?.frGoodFriday===true){
        days.push(
          movable(year,'GOOD_FRIDAY','Vendredi saint',-2,{
            country:'FR',
            classification:'Alsace-Moselle · commune concernée'
          })
        );
      }
    }else if(FR_EXTRA[zone]){
      const [m,d,name]=FR_EXTRA[zone];
      days.push(
        fixed(year,`FR_${zone}_ABOLITION`,name,m,d,{
          country:'FR',
          classification:'Jour férié local · outre-mer'
        })
      );
    }

    days.sort((a,b)=>a.date.localeCompare(b.date));
    return {
      complete:true,
      blockers:[],
      days,
      statutoryCount:days.length,
      summary:
        zone==='GENERAL'
          ? `${days.length} fêtes légales · France cas général`
          : zone==='ALSACE_MOSELLE'
            ? `${days.length} fêtes légales configurées · Alsace-Moselle`
            : `${days.length} fêtes légales configurées · ${FR_ZONES.find(x=>x[0]===zone)?.[1]||zone}`
    };
  }

  /* ---------------------------------------------------------
     4. SUISSE · SECO ART. 20a LTr
     Les listes ci-dessous représentent les jours que le SECO
     indique comme assimilés au dimanche. Le 1er août est ajouté
     partout. Les cantons AG / FR / NE / SO exigent un profil local.
     --------------------------------------------------------- */
  const CH_ROW_SETS={
    NY:new Set(CANTONS.map(x=>x[0])),
    BERCH:new Set(['AG','BE','FR','NE','TG','VD']),
    EPIPHANY:new Set(['TI']),
    NE_REPUBLIC:new Set(['NE']),
    JOSEPH:new Set(['SZ','VS']),
    FAHRTSFEST:new Set(['GL']),
    GOOD_FRIDAY:new Set(['AG','AI','AR','BE','BL','BS','FR','GE','GL','GR','JU','LU','NE','NW','OW','SG','SH','SO','SZ','TG','UR','VD','ZG','ZH']),
    EASTER_MON:new Set(['AG','AI','AR','BE','BL','BS','FR','GE','GL','GR','JU','SG','SH','TG','TI','VD','ZH']),
    MAY1:new Set(['BL','BS','JU','NE','SH','SO','ZH']),
    ASCENSION:new Set(CANTONS.map(x=>x[0])),
    WHIT_MON:new Set(['AG','AI','AR','BE','BL','BS','FR','GE','GR','JU','SG','SH','TG','VD','ZH']),
    CORPUS:new Set(['AG','AI','FR','JU','LU','NE','NW','OW','SO','SZ','UR','VS','ZG']),
    AUG1:new Set(CANTONS.map(x=>x[0])),
    ASSUMPTION:new Set(['AG','FR','LU','NW','OW','SO','SZ','TI','UR','VS','ZG']),
    GENEVA_FAST:new Set(['GE']),
    VAUD_FAST_MON:new Set(['VD']),
    ALL_SAINTS:new Set(['AG','FR','GL','LU','NW','OW','SG','SO','SZ','TI','UR','VS','ZG']),
    IMMACULATE:new Set(['AG','FR','NW','OW','UR','VS','ZG']),
    XMAS:new Set(CANTONS.map(x=>x[0])),
    ST_STEPHEN:new Set(['AG','AI','AR','BE','BL','BS','FR','GL','GR','LU','NE','SG','SH','TG','TI','ZH']),
    GE_RESTORATION:new Set(['GE'])
  };

  function chEvent(year,key){
    const common={
      country:'CH',
      classification:'Assimilé au dimanche · art. 20a LTr / SECO',
      sundayEquivalent:true
    };
    switch(key){
      case 'NY': return fixed(year,key,'Nouvel an',1,1,common);
      case 'BERCH': return fixed(year,key,'Saint-Berchtold',1,2,common);
      case 'EPIPHANY': return fixed(year,key,'Épiphanie',1,6,common);
      case 'NE_REPUBLIC': return fixed(year,key,'Instauration de la République de Neuchâtel',3,1,common);
      case 'JOSEPH': return fixed(year,key,'Saint-Joseph',3,19,common);
      case 'FAHRTSFEST': return {...naefelserFahrt(year),...common};
      case 'GOOD_FRIDAY': return movable(year,key,'Vendredi saint',-2,common);
      case 'EASTER_MON': return movable(year,key,'Lundi de Pâques',1,common);
      case 'MAY1': return fixed(year,key,'Fête du Travail',5,1,common);
      case 'ASCENSION': return movable(year,key,'Ascension',39,common);
      case 'WHIT_MON': return movable(year,key,'Lundi de Pentecôte',50,common);
      case 'CORPUS': return movable(year,key,'Fête-Dieu',60,common);
      case 'AUG1': return fixed(year,key,'Fête nationale suisse',8,1,{
        ...common,
        classification:'Jour férié fédéral payé · assimilé au dimanche'
      });
      case 'ASSUMPTION': return fixed(year,key,'Assomption',8,15,common);
      case 'GENEVA_FAST': return {...genevaFast(year),...common};
      case 'VAUD_FAST_MON': return {...vaudFastMonday(year),...common};
      case 'ALL_SAINTS': return fixed(year,key,'Toussaint',11,1,common);
      case 'IMMACULATE': return fixed(year,key,'Immaculée Conception',12,8,common);
      case 'XMAS': return fixed(year,key,'Noël',12,25,common);
      case 'ST_STEPHEN': return fixed(year,key,'Saint-Étienne',12,26,common);
      case 'GE_RESTORATION': return fixed(year,key,'Restauration de la République',12,31,common);
      default: return null;
    }
  }

  const PROFILE_KEYS={
    AG_AARAU:['NY','BERCH','GOOD_FRIDAY','EASTER_MON','ASCENSION','WHIT_MON','XMAS','ST_STEPHEN'],
    AG_BADEN:['NY','GOOD_FRIDAY','EASTER_MON','ASCENSION','WHIT_MON','CORPUS','XMAS','ST_STEPHEN'],
    AG_BREMGARTEN:['NY','GOOD_FRIDAY','ASCENSION','CORPUS','ASSUMPTION','ALL_SAINTS','XMAS','ST_STEPHEN'],
    AG_LAUFENBURG_MURI:['NY','GOOD_FRIDAY','ASCENSION','CORPUS','ASSUMPTION','ALL_SAINTS','IMMACULATE','XMAS'],
    AG_RHEINFELDEN_A:['NY','GOOD_FRIDAY','ASCENSION','CORPUS','ASSUMPTION','ALL_SAINTS','IMMACULATE','XMAS'],
    AG_RHEINFELDEN_B:['NY','GOOD_FRIDAY','EASTER_MON','ASCENSION','WHIT_MON','ALL_SAINTS','XMAS','ST_STEPHEN'],
    AG_ZURZACH:['NY','BERCH','GOOD_FRIDAY','ASCENSION','CORPUS','ALL_SAINTS','XMAS','ST_STEPHEN'],

    FR_CATHOLIC:['NY','GOOD_FRIDAY','ASCENSION','CORPUS','ASSUMPTION','ALL_SAINTS','IMMACULATE','XMAS'],
    FR_REFORMED:['NY','BERCH','GOOD_FRIDAY','EASTER_MON','ASCENSION','WHIT_MON','XMAS','ST_STEPHEN'],

    NE_GENERAL:['NY','BERCH','NE_REPUBLIC','GOOD_FRIDAY','MAY1','ASCENSION','XMAS'],
    NE_LANDERON:['NY','BERCH','NE_REPUBLIC','GOOD_FRIDAY','MAY1','ASCENSION','CORPUS','XMAS'],

    SO_GENERAL:['NY','GOOD_FRIDAY','MAY1','ASCENSION','CORPUS','ASSUMPTION','ALL_SAINTS','XMAS'],
    SO_BUCHEGGBERG:['NY','GOOD_FRIDAY','MAY1','ASCENSION','XMAS']
  };

  function aiStephenAllowed(year){
    // La règle SECO: Saint-Étienne uniquement s'il ne crée pas
    // trois jours de repos consécutifs. Avec Noël + dimanche,
    // le cas se produit lorsque Noël tombe un lundi ou un vendredi.
    const dow=localDate(year,12,25).getDay();
    return ![1,5].includes(dow);
  }

  function arStephenAllowed(year){
    // SECO: pas de Saint-Étienne lorsque Noël tombe lundi ou vendredi.
    return ![1,5].includes(localDate(year,12,25).getDay());
  }

  function neConditional(year,key){
    const d=chEvent(year,key);
    return d && localDate(year,Number(d.date.slice(5,7)),Number(d.date.slice(8,10))).getDay()===1;
  }

  function chCalendar(year,config){
    const canton=String(config?.chCanton||'').toUpperCase();
    if(!CANTON_NAMES[canton]){
      return {
        complete:false,
        blockers:['Suisse · sélectionnez obligatoirement le canton de l’établissement.'],
        days:[chEvent(year,'AUG1')],
        count:null,
        summary:'Canton suisse non sélectionné.'
      };
    }

    const blockers=[];
    const profile=String(config?.chLocalProfile||'');
    if(LOCAL_PROFILES[canton] && !profile){
      blockers.push(
        `${CANTON_NAMES[canton]} · sélectionnez le profil local/communal requis par le référentiel SECO.`
      );
    }

    let keys=[];
    if(LOCAL_PROFILES[canton]){
      keys=[...(PROFILE_KEYS[profile]||[])];
    }else if(canton==='AI'){
      keys=['NY','GOOD_FRIDAY','EASTER_MON','ASCENSION','WHIT_MON','CORPUS','XMAS'];
      if(aiStephenAllowed(year)) keys.push('ST_STEPHEN');
    }else if(canton==='AR'){
      keys=['NY','GOOD_FRIDAY','EASTER_MON','ASCENSION','WHIT_MON','XMAS'];
      if(arStephenAllowed(year)) keys.push('ST_STEPHEN');
    }else{
      keys=Object.entries(CH_ROW_SETS)
        .filter(([key,set])=>key!=='AUG1' && set.has(canton))
        .map(([key])=>key);
    }

    if(canton==='NE' && profile){
      if(neConditional(year,'BERCH')) {
        if(!keys.includes('BERCH')) keys.push('BERCH');
      } else {
        keys=keys.filter(k=>k!=='BERCH');
      }
      if(neConditional(year,'ST_STEPHEN')) keys.push('ST_STEPHEN');
    }

    if(canton==='SO'){
      // Le SECO indique la Fête du Travail l'après-midi.
      // La journée reste signalée mais avec fraction 0,5.
    }

    if(!keys.includes('AUG1')) keys.push('AUG1');

    const days=keys
      .map(k=>chEvent(year,k))
      .filter(Boolean)
      .map(day=>{
        if(canton==='SO' && day.key==='MAY1'){
          return {...day,fraction:.5,name:'Fête du Travail · après-midi'};
        }
        return day;
      })
      .sort((a,b)=>a.date.localeCompare(b.date));

    return {
      complete:blockers.length===0,
      blockers,
      days,
      count:days.length,
      summary:blockers.length
        ? blockers[0]
        : `${days.length} date${days.length>1?'s':''} assimilée${days.length>1?'s':''} au dimanche configurée${days.length>1?'s':''} · ${CANTON_NAMES[canton]}`
    };
  }

  /* ---------------------------------------------------------
     5. STOCKAGE / SYMBIOSE
     --------------------------------------------------------- */
  function settings(){
    try{return typeof getRhSettings==='function'?(getRhSettings()||{}):{}}
    catch(_){return{}}
  }

  function payroll(){
    try{
      return JSON.parse(localStorage.getItem('ichef_payroll_settings_v2')||'{}')||{};
    }catch(_){return{}}
  }

  function normalizeDateList(value){
    return [...new Set(
      (Array.isArray(value)?value:String(value||'').split(/[\s,;]+/))
        .map(v=>String(v||'').trim())
        .filter(v=>/^20\d{2}-\d{2}-\d{2}$/.test(v))
    )].sort();
  }

  function config(){
    const s=settings();
    const p=payroll();
    return {
      country:String(s.planningLegalCountry||p.country||'CH').toUpperCase()==='FR'?'FR':'CH',
      chCanton:String(s.planningHolidayCanton||p.canton||'').toUpperCase(),
      chLocalProfile:String(s.planningHolidayLocalProfile||''),
      chLocality:String(s.planningHolidayLocality||'').trim(),
      frZone:String(s.planningFranceHolidayZone||''),
      frGoodFriday:s.planningFranceGoodFridayApplicable===true,
      addDates:normalizeDateList(s.planningHolidayAddDates),
      removeDates:normalizeDateList(s.planningHolidayRemoveDates),
      confirmed:s.planningHolidayJurisdictionConfirmed===true,
      sourceVersion:String(s.planningHolidaySourceVersion||SOURCE_VERSION)
    };
  }

  function calendarResult(year=Number(String(document.getElementById('month-selector')?.value||'').slice(0,4))||new Date().getFullYear()){
    const c=config();
    let result=c.country==='FR'
      ? franceCalendar(year,c)
      : chCalendar(year,c);

    const removed=new Set(c.removeDates);
    let days=(result.days||[]).filter(d=>!removed.has(d.date));
    const existing=new Set(days.map(d=>d.date));

    c.addDates.forEach(date=>{
      if(String(date).startsWith(`${year}-`) && !existing.has(date)){
        days.push({
          key:`MANUAL_${date}`,
          name:'Jour férié local ajouté',
          date,
          fraction:1,
          official:true,
          manual:true,
          classification:'Ajustement local validé par l’établissement',
          sundayEquivalent:c.country==='CH'
        });
      }
    });

    days.sort((a,b)=>a.date.localeCompare(b.date));
    result={...result,days,count:days.length};
    return result;
  }

  window.iChefHolidayCalendarV208=year=>calendarResult(Number(year)||new Date().getFullYear()).days;
  window.iChefHolidayForDateV208=function(dateStr){
    const y=Number(String(dateStr||'').slice(0,4));
    if(!y) return null;
    return calendarResult(y).days.find(d=>d.date===String(dateStr))||null;
  };
  window.iChefHolidayJurisdictionV208=config;
  window.iChefHolidayAuditV208=function(year){
    const result=calendarResult(Number(year)||new Date().getFullYear());
    const c=config();
    const blockers=[...(result.blockers||[])];

    if(!c.confirmed){
      blockers.push(
        c.country==='CH'
          ? 'Suisse · canton / profil jours fériés non confirmé par la Direction.'
          : 'France · zone des jours fériés non confirmée par la Direction.'
      );
    }
    return {
      country:c.country,
      complete:blockers.length===0,
      blockers:[...new Set(blockers)],
      count:result.days.length,
      days:result.days,
      summary:result.summary
    };
  };

  function saveHolidaySettings(){
    const s=settings();
    const country=String(s.planningLegalCountry||'CH').toUpperCase()==='FR'?'FR':'CH';

    const canton=String(document.getElementById('rh-v208-canton')?.value||'').toUpperCase();
    const localProfile=String(document.getElementById('rh-v208-local-profile')?.value||'');
    const locality=String(document.getElementById('rh-v208-locality')?.value||'').trim().slice(0,120);
    const frZone=String(document.getElementById('rh-v208-fr-zone')?.value||'');
    const frGoodFriday=document.getElementById('rh-v208-fr-good-friday')?.checked===true;
    const addDates=normalizeDateList(document.getElementById('rh-v208-add-dates')?.value||'');
    const removeDates=normalizeDateList(document.getElementById('rh-v208-remove-dates')?.value||'');

    if(country==='CH'){
      if(!CANTON_NAMES[canton]){
        alert('Sélectionnez le canton suisse de l’établissement.');
        return false;
      }
      if(LOCAL_PROFILES[canton]&&!localProfile){
        alert('Ce canton comporte des différences locales. Sélectionnez le profil communal / district.');
        return false;
      }
    }else if(!frZone){
      alert('Sélectionnez la zone France applicable à l’établissement.');
      return false;
    }

    const next=saveRhSettings({
      ...s,
      planningHolidayCanton:canton,
      planningHolidayLocalProfile:country==='CH'?localProfile:'',
      planningHolidayLocality:country==='CH'?locality:'',
      planningFranceHolidayZone:country==='FR'?frZone:'',
      planningFranceGoodFridayApplicable:country==='FR'&&frZone==='ALSACE_MOSELLE'&&frGoodFriday,
      planningHolidayAddDates:addDates,
      planningHolidayRemoveDates:removeDates,
      planningHolidayJurisdictionConfirmed:true,
      planningHolidaySourceVersion:SOURCE_VERSION,
      planningHolidayUpdatedAt:new Date().toISOString()
    });

    // Symbiose paie : le canton est une donnée unique.
    if(country==='CH'){
      const p=payroll();
      const nextP={...p,country:'CH',currency:'CHF',canton};
      localStorage.setItem('ichef_payroll_settings_v2',JSON.stringify(nextP));
      const ps=document.getElementById('ps-canton');
      if(ps) ps.value=canton;
    }

    try{
      recordRhChange?.({
        type:'HOLIDAY_JURISDICTION_SETTINGS',
        source:'DIRECTION_RH',
        by:typeof window.rhAuditActorV94==='function'?window.rhAuditActorV94():'Direction / RH',
        country,
        canton:country==='CH'?canton:'',
        localProfile:country==='CH'?localProfile:'',
        franceZone:country==='FR'?frZone:'',
        message:'Référentiel territorial des jours fériés confirmé'
      });
    }catch(_){}

    refreshAll();
    try{showToast?.('Jours fériés · juridiction enregistrée et connectée');}catch(_){}
    return next;
  }

  /* ---------------------------------------------------------
     6. INTERFACE
     --------------------------------------------------------- */
  function cantonOptions(selected=''){
    return [
      '<option value="">— Sélectionner le canton —</option>',
      ...CANTONS.map(([code,name])=>
        `<option value="${code}" ${code===selected?'selected':''}>${code} · ${name}</option>`
      )
    ].join('');
  }

  function frOptions(selected=''){
    return FR_ZONES.map(([value,label])=>
      `<option value="${value}" ${value===selected?'selected':''}>${label}</option>`
    ).join('');
  }

  function ensureLegalUi(){
    const anchor=document.querySelector('.v185-auto-country-row');
    if(!anchor || document.getElementById('rh-v208-holiday-jurisdiction')) return;

    const box=document.createElement('div');
    box.id='rh-v208-holiday-jurisdiction';
    box.className='rh-v208-full';
    box.innerHTML=`
      <div class="rh-v208-head">
        <div>
          <strong>JOURS FÉRIÉS · JURIDICTION TERRITORIALE</strong>
          <small>Le pays est automatique. La région/canton reste une donnée Direction obligatoire pour éviter d’appliquer un calendrier erroné.</small>
        </div>
        <span id="rh-v208-zone-badge">DÉTECTION…</span>
      </div>

      <div id="rh-v208-ch-fields" class="rh-v208-grid">
        <div class="input-group">
          <label>Canton suisse · obligatoire</label>
          <select id="rh-v208-canton" class="input-full"></select>
        </div>
        <div class="input-group" id="rh-v208-local-profile-group" hidden>
          <label>Profil local / commune · obligatoire</label>
          <select id="rh-v208-local-profile" class="input-full"></select>
        </div>
        <div class="input-group rh-v208-full">
          <label>Commune / district · information de preuve</label>
          <input id="rh-v208-locality" class="input-full" placeholder="Ex. Lausanne, Genève, Le Landeron, district de Bremgarten…">
        </div>
      </div>

      <div id="rh-v208-fr-fields" class="rh-v208-grid" hidden>
        <div class="input-group rh-v208-full">
          <label>Zone France · obligatoire</label>
          <select id="rh-v208-fr-zone" class="input-full"></select>
        </div>
        <label id="rh-v208-good-friday-row" class="rh-v208-check rh-v208-full" hidden>
          <input id="rh-v208-fr-good-friday" type="checkbox">
          <span><b>Vendredi saint applicable</b><br>À cocher uniquement pour une commune d’Alsace-Moselle dans laquelle le Vendredi saint est légalement férié.</span>
        </label>
      </div>

      <details style="margin-top:9px">
        <summary style="cursor:pointer;font-size:.58rem;font-weight:900">AJUSTEMENTS LOCAUX OFFICIELS · AVANCÉ</summary>
        <div class="rh-v208-grid" style="margin-top:8px">
          <div class="input-group">
            <label>Ajouter des dates officielles</label>
            <input id="rh-v208-add-dates" class="input-full" placeholder="2026-09-10, 2026-12-31">
          </div>
          <div class="input-group">
            <label>Retirer des dates du référentiel</label>
            <input id="rh-v208-remove-dates" class="input-full" placeholder="YYYY-MM-DD">
          </div>
        </div>
        <small class="rh-v208-source">Utiliser uniquement avec un fondement officiel local. Ces corrections sont tracées dans les réglages RH.</small>
      </details>

      <div id="rh-v208-summary"></div>

      <div class="rh-v208-actions">
        <span class="rh-v208-source">Sources : SECO · art. 20a LTr · état tableau 12.12.2024 · L-GAV art. 18 · France Code du travail L3133-1.</span>
        <div style="display:flex;gap:6px">
          <button type="button" id="rh-v208-preview-btn">VOIR LE CALENDRIER</button>
          <button type="button" class="primary" id="rh-v208-save-btn">ENREGISTRER & CONNECTER</button>
        </div>
      </div>
      <div id="rh-v208-calendar-preview"></div>
    `;

    anchor.insertAdjacentElement('afterend',box);

    box.querySelector('#rh-v208-canton')?.addEventListener('change',()=>{
      refreshLocalProfile();
      refreshSummary();
    });
    box.querySelector('#rh-v208-local-profile')?.addEventListener('change',refreshSummary);
    box.querySelector('#rh-v208-fr-zone')?.addEventListener('change',()=>{
      refreshFranceGoodFriday();
      refreshSummary();
    });
    box.querySelector('#rh-v208-fr-good-friday')?.addEventListener('change',refreshSummary);
    box.querySelector('#rh-v208-preview-btn')?.addEventListener('click',()=>{
      const preview=document.getElementById('rh-v208-calendar-preview');
      preview?.classList.toggle('show');
      renderPreview();
    });
    box.querySelector('#rh-v208-save-btn')?.addEventListener('click',saveHolidaySettings);

    hydrateHolidayUi();
  }

  function refreshLocalProfile(){
    const canton=String(document.getElementById('rh-v208-canton')?.value||'').toUpperCase();
    const group=document.getElementById('rh-v208-local-profile-group');
    const select=document.getElementById('rh-v208-local-profile');
    const profiles=LOCAL_PROFILES[canton];

    if(!group||!select) return;
    group.hidden=!profiles;

    if(profiles){
      const current=select.value;
      select.innerHTML=profiles.map(([v,l])=>`<option value="${v}">${l}</option>`).join('');
      if(profiles.some(x=>x[0]===current)) select.value=current;
    }else{
      select.innerHTML='<option value="">Non requis pour ce canton</option>';
      select.value='';
    }
  }

  function refreshFranceGoodFriday(){
    const zone=String(document.getElementById('rh-v208-fr-zone')?.value||'');
    const row=document.getElementById('rh-v208-good-friday-row');
    if(row) row.hidden=zone!=='ALSACE_MOSELLE';
  }

  function hydrateHolidayUi(){
    const c=config();
    const s=settings();
    const country=String(s.planningLegalCountry||c.country||'CH').toUpperCase()==='FR'?'FR':'CH';

    const ch=document.getElementById('rh-v208-ch-fields');
    const fr=document.getElementById('rh-v208-fr-fields');
    if(ch) ch.hidden=country!=='CH';
    if(fr) fr.hidden=country!=='FR';

    const canton=document.getElementById('rh-v208-canton');
    if(canton){
      canton.innerHTML=cantonOptions(c.chCanton);
      canton.value=CANTON_NAMES[c.chCanton]?c.chCanton:'';
    }

    const frZone=document.getElementById('rh-v208-fr-zone');
    if(frZone){
      frZone.innerHTML=frOptions(c.frZone);
      frZone.value=FR_ZONES.some(x=>x[0]===c.frZone)?c.frZone:'';
    }

    refreshLocalProfile();
    const local=document.getElementById('rh-v208-local-profile');
    if(local && [...local.options].some(o=>o.value===c.chLocalProfile)){
      local.value=c.chLocalProfile;
    }

    const locality=document.getElementById('rh-v208-locality');
    if(locality) locality.value=c.chLocality||'';

    const gf=document.getElementById('rh-v208-fr-good-friday');
    if(gf) gf.checked=c.frGoodFriday===true;

    const add=document.getElementById('rh-v208-add-dates');
    if(add) add.value=c.addDates.join(', ');
    const rem=document.getElementById('rh-v208-remove-dates');
    if(rem) rem.value=c.removeDates.join(', ');

    refreshFranceGoodFriday();
    refreshSummary();
  }

  function yearFromPlanning(){
    const y=Number(String(document.getElementById('month-selector')?.value||'').slice(0,4));
    return y||new Date().getFullYear();
  }

  function configFromUiForPreview(){
    const base=config();
    const country=String(settings().planningLegalCountry||base.country||'CH').toUpperCase()==='FR'?'FR':'CH';
    return {
      ...base,
      country,
      chCanton:String(document.getElementById('rh-v208-canton')?.value||base.chCanton||'').toUpperCase(),
      chLocalProfile:String(document.getElementById('rh-v208-local-profile')?.value||base.chLocalProfile||''),
      chLocality:String(document.getElementById('rh-v208-locality')?.value||base.chLocality||'').trim(),
      frZone:String(document.getElementById('rh-v208-fr-zone')?.value||base.frZone||''),
      frGoodFriday:document.getElementById('rh-v208-fr-good-friday')?.checked===true,
      addDates:normalizeDateList(document.getElementById('rh-v208-add-dates')?.value||base.addDates),
      removeDates:normalizeDateList(document.getElementById('rh-v208-remove-dates')?.value||base.removeDates)
    };
  }

  function previewResult(){
    const y=yearFromPlanning();
    const c=configFromUiForPreview();
    let result=c.country==='FR'?franceCalendar(y,c):chCalendar(y,c);
    const remove=new Set(c.removeDates||[]);
    let days=(result.days||[]).filter(d=>!remove.has(d.date));
    const set=new Set(days.map(d=>d.date));
    (c.addDates||[]).forEach(date=>{
      if(date.startsWith(`${y}-`)&&!set.has(date)){
        days.push({
          name:'Jour férié local ajouté',
          date,
          fraction:1,
          classification:'Ajustement local officiel',
          manual:true
        });
      }
    });
    days.sort((a,b)=>a.date.localeCompare(b.date));
    return {...result,days,count:days.length};
  }

  function refreshSummary(){
    const s=settings();
    const country=String(s.planningLegalCountry||'CH').toUpperCase()==='FR'?'FR':'CH';
    const c=configFromUiForPreview();
    const result=previewResult();
    const summary=document.getElementById('rh-v208-summary');
    const badge=document.getElementById('rh-v208-zone-badge');

    if(badge){
      badge.textContent=country==='CH'
        ? `SUISSE · CHF${c.chCanton?` · ${c.chCanton}`:''}`
        : `ZONE EURO · € · FRANCE`;
    }

    if(!summary) return;

    const missing=result.blockers?.length>0;
    summary.className=missing?'block':(config().confirmed?'ok':'warn');

    if(missing){
      summary.innerHTML=`
        <strong>CONFIGURATION OBLIGATOIRE AVANT PUBLICATION</strong>
        <span>${result.blockers.join(' ')}</span>`;
    }else{
      const rights=country==='CH'
        ? 'CCNT : 6 jours fériés payés/an (0,5/mois) · droit distinct du calendrier cantonal.'
        : 'France : le calendrier légal est distinct de la décision de chômage/travail des jours fériés et des règles conventionnelles HCR.';
      summary.innerHTML=`
        <strong>${result.summary} · année ${yearFromPlanning()}</strong>
        <span>${rights}${config().confirmed?' · Juridiction confirmée.':' · Cliquez ENREGISTRER & CONNECTER pour confirmer.'}</span>`;
    }

    renderPublicationState();
  }

  function renderPreview(){
    const box=document.getElementById('rh-v208-calendar-preview');
    if(!box) return;
    const result=previewResult();
    if(result.blockers?.length){
      box.innerHTML=`<div class="rh-v208-source">${result.blockers.join('<br>')}</div>`;
      return;
    }
    box.innerHTML=result.days.map(day=>{
      const date=new Date(`${day.date}T12:00:00`);
      const label=date.toLocaleDateString('fr-FR',{weekday:'short',day:'2-digit',month:'2-digit',year:'numeric'});
      return `
        <div class="rh-v208-day">
          <b>${label}</b>
          <span>${day.name}<small>${day.classification?` · ${day.classification}`:''}</small></span>
          <em>${day.fraction===.5?'½ JOUR':'FÉRIÉ'}</em>
        </div>`;
    }).join('');
  }

  function renderPublicationState(){
    const publish=document.querySelector('.rh-panel-actions .publish, button.publish[onclick*="publishRhPlanningToStaff"]');
    if(!publish) return;
    let badge=document.getElementById('rh-v208-publication-state');
    if(!badge){
      badge=document.createElement('span');
      badge.id='rh-v208-publication-state';
      publish.insertAdjacentElement('afterend',badge);
    }
    const audit=window.iChefHolidayAuditV208?.(yearFromPlanning());
    const ok=audit?.complete===true;
    badge.className=ok?'ok':'';
    badge.textContent=ok?'FÉRIÉS · OK':'FÉRIÉS · À CONFIGURER';
    badge.title=ok
      ? `${audit.count} dates dans le calendrier territorial`
      : (audit?.blockers||[]).join(' ');
  }

  /* ---------------------------------------------------------
     7. PLANNING
     --------------------------------------------------------- */
  function applyHolidayHeaders(){
    const month=String(document.getElementById('month-selector')?.value||'');
    if(!/^\d{4}-\d{2}$/.test(month)) return;

    const year=Number(month.slice(0,4));
    const audit=window.iChefHolidayAuditV208?.(year);
    const byDate=new Map((audit?.days||[]).map(day=>[day.date,day]));

    document.querySelectorAll('#global-thead th[data-rh-day]').forEach(th=>{
      th.classList.remove('rh-v208-holiday-head','rh-v208-half');
      th.querySelector('.rh-v208-holiday-badge')?.remove();

      const day=Number(th.dataset.rhDay||0);
      if(!day) return;
      const date=`${month}-${pad(day)}`;
      const holiday=byDate.get(date);
      if(!holiday) return;

      th.classList.add('rh-v208-holiday-head');
      if(holiday.fraction===.5) th.classList.add('rh-v208-half');
      const badge=document.createElement('span');
      badge.className='rh-v208-holiday-badge';
      badge.textContent=holiday.name;
      th.appendChild(badge);
      th.title=`${holiday.name} · ${holiday.classification||'Jour férié'}`;
    });
  }

  /* ---------------------------------------------------------
     8. PAIE / CANTON
     --------------------------------------------------------- */
  function ensurePayrollCantonSelect(){
    const old=document.getElementById('ps-canton');
    if(!old) return null;

    if(old.tagName==='SELECT'){
      const value=String(old.value||payroll().canton||config().chCanton||'').toUpperCase();
      old.innerHTML=cantonOptions(value);
      if(CANTON_NAMES[value]) old.value=value;
      return old;
    }

    const select=document.createElement('select');
    select.id='ps-canton';
    select.className=old.className||'input-full';
    select.innerHTML=cantonOptions(String(payroll().canton||config().chCanton||'').toUpperCase());
    select.setAttribute('aria-label','Canton suisse');
    old.replaceWith(select);
    return select;
  }

  function syncFromPayrollCanton(canton){
    const code=String(canton||'').toUpperCase();
    if(!CANTON_NAMES[code]) return;

    const s=settings();
    if(
      String(s.planningLegalCountry||'CH').toUpperCase()==='CH' &&
      String(s.planningHolidayCanton||'').toUpperCase()!==code
    ){
      saveRhSettings({
        ...s,
        planningHolidayCanton:code,
        planningHolidayLocalProfile:
          String(s.planningHolidayCanton||'').toUpperCase()===code
            ? s.planningHolidayLocalProfile
            : '',
        planningHolidayJurisdictionConfirmed:false,
        planningHolidaySourceVersion:SOURCE_VERSION,
        planningHolidayUpdatedAt:new Date().toISOString()
      });
    }
  }

  const previousOpenPayroll=window.openPayrollSettings;
  if(typeof previousOpenPayroll==='function'){
    window.openPayrollSettings=function(...args){
      ensurePayrollCantonSelect();
      const result=previousOpenPayroll.apply(this,args);
      requestAnimationFrame(()=>{
        const select=ensurePayrollCantonSelect();
        const c=config();
        if(select && CANTON_NAMES[c.chCanton]) select.value=c.chCanton;
      });
      return result;
    };
  }

  const previousSavePayroll=window.savePayrollSettingsFromModal;
  if(typeof previousSavePayroll==='function'){
    window.savePayrollSettingsFromModal=function(...args){
      const canton=String(document.getElementById('ps-canton')?.value||'').toUpperCase();
      const result=previousSavePayroll.apply(this,args);
      if(canton) syncFromPayrollCanton(canton);
      refreshAll();
      return result;
    };
  }

  /* ---------------------------------------------------------
     9. FICHE SALARIÉ · DROIT ≠ CALENDRIER
     --------------------------------------------------------- */
  function refreshStaffHolidayRights(){
    const s=settings();
    const country=String(s.planningLegalCountry||'CH').toUpperCase()==='FR'?'FR':'CH';
    const result=calendarResult(yearFromPlanning());

    if(country==='CH'){
      const title=document.getElementById('staff-right-holiday-title');
      const rule=document.getElementById('staff-right-holiday-rule');
      if(title) title.textContent='CCNT · 6 j fériés payés/an';
      if(rule) rule.textContent='0,5 j/mois · indépendant du calendrier cantonal';
    }else{
      const title=document.getElementById('staff-right-holiday-title');
      const rule=document.getElementById('staff-right-holiday-rule');
      if(title) title.textContent=`France · ${result.days.length||11} fêtes légales calendrier`;
      if(rule) rule.textContent='Calendrier légal ≠ automatiquement jour chômé';
    }

    const container=document.getElementById('staff-right-holiday-rule')?.parentElement?.parentElement;
    if(container && !container.querySelector('.rh-v208-rights-note')){
      const note=document.createElement('div');
      note.className='rh-v208-rights-note';
      note.textContent=country==='CH'
        ? 'CCNT art. 18 : 6 jours fériés payés/an, indépendants des jours fériés cantonaux officiels.'
        : 'France : 11 fêtes légales au cas général ; adaptations territoriales selon la zone sélectionnée.';
      container.appendChild(note);
    }
  }

  const previousOpenStaff=window.openStaffModal;
  if(typeof previousOpenStaff==='function'){
    window.openStaffModal=function(...args){
      const result=previousOpenStaff.apply(this,args);
      setTimeout(refreshStaffHolidayRights,0);
      return result;
    };
  }

  /* ---------------------------------------------------------
     10. DEVISE / ZONE
     --------------------------------------------------------- */
  function normIso(value){
    const raw=String(value||'').trim().toUpperCase();
    if(/^[A-Z]{2}$/.test(raw)) return raw;
    return NAME_TO_ISO[raw]||'';
  }

  function detectRawEstablishmentIso(){
    const candidates=[];
    try{
      const live=window.ICHEF_LIVE_STATE||{};
      [
        live.establishment?.country,
        live.company?.country,
        live.tenant?.country,
        live.client?.country,
        live.business?.country,
        live.settings?.country,
        live.profile?.country
      ].forEach(v=>candidates.push(v));
    }catch(_){}

    [
      'ichef_establishment_country',
      'ichef_client_country',
      'ichef_company_country',
      'ichef_business_country',
      'ichef_country',
      'establishment_country',
      'client_country'
    ].forEach(key=>{
      try{candidates.push(localStorage.getItem(key));}catch(_){}
    });

    for(const value of candidates){
      const iso=normIso(value);
      if(iso) return iso;
    }

    const legal=String(settings().planningLegalCountry||'').toUpperCase();
    return legal==='FR'||legal==='CH'?legal:'';
  }

  function syncCurrencyZone(){
    const iso=detectRawEstablishmentIso();
    const s=settings();

    let expectedCurrency='';
    let label='';
    if(iso==='CH'){
      expectedCurrency='CHF';
      label='AUTO · SUISSE · CHF';
    }else if(EURO_AREA_2026.has(iso)){
      expectedCurrency='EUR';
      label=iso==='FR'
        ? 'AUTO · ZONE EURO · € · FRANCE'
        : `AUTO · ZONE EURO · € · ${iso} · PACK JURIDIQUE PAYS NON ACTIVÉ`;
    }

    if(expectedCurrency && String(s.currency||'').toUpperCase()!==expectedCurrency){
      saveRhSettings({...s,currency:expectedCurrency});
    }

    const currency=document.getElementById('rh-setting-currency');
    if(currency && expectedCurrency) currency.value=expectedCurrency;

    const badge=document.getElementById('v185-country-auto-badge');
    if(badge && label) badge.textContent=label;

    return {iso,currency:expectedCurrency,legalSupported:iso==='CH'||iso==='FR'};
  }

  window.iChefCurrencyJurisdictionV208=syncCurrencyZone;

  /* ---------------------------------------------------------
     11. PUBLICATION BLOQUÉE SI TERRITOIRE NON CONFIRMÉ
     --------------------------------------------------------- */
  const previousPublish=window.publishRhPlanningToStaff;
  if(typeof previousPublish==='function'){
    window.publishRhPlanningToStaff=function(...args){
      const currencyZone=syncCurrencyZone();
      if(currencyZone.iso && EURO_AREA_2026.has(currencyZone.iso) && currencyZone.iso!=='FR'){
        alert(
          `Établissement détecté en zone euro (${currencyZone.iso}). La devise € est correcte, mais le pack juridique des jours fériés de ce pays n’est pas activé dans cette version. Publication bloquée pour éviter d’appliquer le droit français par défaut.`
        );
        return false;
      }

      const audit=window.iChefHolidayAuditV208?.(yearFromPlanning());
      if(!audit?.complete){
        alert(
          `Jours fériés : juridiction territoriale incomplète.\n\n${(audit?.blockers||['Configuration requise']).join('\n')}\n\nOuvrez Réglages IA RH → Droit du travail et sélectionnez la zone/canton.`
        );
        try{openRhPlanningSettingsV103?.();}catch(_){}
        setTimeout(()=>document.getElementById('rh-v208-holiday-jurisdiction')?.scrollIntoView({behavior:'smooth',block:'center'}),120);
        return false;
      }
      return previousPublish.apply(this,args);
    };
  }

  /* ---------------------------------------------------------
     12. RAFRAÎCHISSEMENT
     --------------------------------------------------------- */
  function refreshAll(){
    ensureLegalUi();
    ensurePayrollCantonSelect();
    hydrateHolidayUi();
    syncCurrencyZone();
    applyHolidayHeaders();
    renderPublicationState();
    refreshStaffHolidayRights();
    if(document.getElementById('rh-v208-calendar-preview')?.classList.contains('show')){
      renderPreview();
    }

    window.dispatchEvent(new CustomEvent('ichef:holiday-jurisdiction-updated',{
      detail:{
        version:VERSION,
        config:config(),
        year:yearFromPlanning(),
        count:calendarResult(yearFromPlanning()).days.length,
        at:new Date().toISOString()
      }
    }));
  }

  document.getElementById('month-selector')?.addEventListener('change',()=>{
    requestAnimationFrame(()=>{
      applyHolidayHeaders();
      refreshSummary();
      renderPreview();
    });
  },true);

  window.addEventListener('ichef:planning-categories-updated',()=>setTimeout(applyHolidayHeaders,0));
  window.addEventListener('ichef:updateState',()=>setTimeout(syncCurrencyZone,80));
  window.addEventListener('ichef:connected',()=>setTimeout(syncCurrencyZone,80));

  // Le tableau est reconstruit régulièrement : observer uniquement son THEAD.
  const head=document.getElementById('global-thead');
  if(head){
    let frame=0;
    new MutationObserver(()=>{
      if(frame) return;
      frame=requestAnimationFrame(()=>{
        frame=0;
        applyHolidayHeaders();
      });
    }).observe(head,{childList:true,subtree:true});
  }

  // Si la paie avait déjà un canton, le proposer au RH sans le confirmer silencieusement.
  function bootstrapCanton(){
    const s=settings();
    const p=payroll();
    const payrollCanton=String(p.canton||'').toUpperCase();
    if(
      String(s.planningLegalCountry||'CH').toUpperCase()==='CH' &&
      !String(s.planningHolidayCanton||'').trim() &&
      CANTON_NAMES[payrollCanton]
    ){
      saveRhSettings({
        ...s,
        planningHolidayCanton:payrollCanton,
        planningHolidayJurisdictionConfirmed:false,
        planningHolidaySourceVersion:SOURCE_VERSION
      });
    }
  }

  function boot(){
    bootstrapCanton();
    ensureLegalUi();
    ensurePayrollCantonSelect();
    refreshAll();
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',boot,{once:true});
  }else{
    boot();
  }
  setTimeout(boot,180);

  window.__ICHEF_RH_BUILD__=VERSION;
  console.info('[iCHEF RH V208] jours fériés FR/CH · canton/zone obligatoire · devise et paie synchronisées');
})();




;
/* RH V264 - preserved script #142 */

window.__ICHEF_RH_BUILD__='RH-V208-HOLIDAY-SYMBIOSIS';



;
/* RH V264 - preserved script #143 */

(() => {
  'use strict';
  if(window.__ICHEF_RH_V209_CATEGORY_FIX__) return;
  window.__ICHEF_RH_V209_CATEGORY_FIX__=true;

  let snapshot=null;
  let dirty=false;
  let previewStyle=null;
  let previewFrame=0;

  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));

  function darken(hex,amount=.28){
    const h=/^#[0-9a-f]{6}$/i.test(String(hex||''))?String(hex).slice(1):'eeeeee';
    const n=parseInt(h,16);
    const r=Math.max(0,Math.round(((n>>16)&255)*(1-amount)));
    const g=Math.max(0,Math.round(((n>>8)&255)*(1-amount)));
    const b=Math.max(0,Math.round((n&255)*(1-amount)));
    return '#'+[r,g,b].map(x=>x.toString(16).padStart(2,'0')).join('');
  }

  function ensureStateBadge(){
    const actions=document.querySelector('.rh-v202-category-actions-left');
    if(!actions) return null;

    let badge=document.getElementById('rh-v209-category-state');
    if(!badge){
      badge=document.createElement('span');
      badge.id='rh-v209-category-state';
      badge.textContent='Aucun changement';
      actions.appendChild(badge);
    }
    return badge;
  }

  function setState(type,message){
    const badge=ensureStateBadge();
    if(!badge) return;
    badge.className=String(type||'');
    badge.textContent=String(message||'');
  }

  function getSavedCatalog(){
    try{
      return JSON.parse(JSON.stringify(
        window.iChefPlanningCategoryCatalogV202?.() || []
      ));
    }catch(_){
      return [];
    }
  }

  function collectPreviewCatalog(){
    const rows=[...document.querySelectorAll('#rh-v202-category-list .rh-v202-category-row')];
    return rows.map((row,index)=>{
      const current=window.iChefPlanningCategoryByIdV202?.(row.dataset.id)||{};
      const builtin=row.dataset.builtin==='1';
      const color=String(row.querySelector('.rh-v202-color')?.value||current.color||'#eeeeee');
      return {
        ...current,
        id:String(row.dataset.id||current.id||`cat_${index}`),
        label:String(row.querySelector('.rh-v202-label')?.value||current.label||'Catégorie').trim(),
        short:String(row.querySelector('.rh-v202-short')?.value||current.short||'CAT').trim(),
        color:/^#[0-9a-f]{6}$/i.test(color)?color:'#eeeeee',
        meaning:String(row.querySelector('.rh-v202-meaning')?.value||current.meaning||'').trim(),
        legalType:String(row.querySelector('.rh-v202-legal')?.value||current.legalType||'off'),
        active:row.querySelector('.rh-v202-enabled')?.checked!==false,
        builtin,
        order:index
      };
    });
  }

  function applyPreviewCatalog(catalog){
    if(!previewStyle){
      previewStyle=document.createElement('style');
      previewStyle.id='rh-v209-category-preview-css';
      document.head.appendChild(previewStyle);
    }

    previewStyle.textContent=catalog.map(c=>{
      const id=CSS.escape(String(c.id||''));
      const bg=/^#[0-9a-f]{6}$/i.test(String(c.color||''))?c.color:'#eeeeee';
      return `
        [data-rh-category="${id}"],
        [data-category-id="${id}"]{
          background-color:${bg}!important;
          border-color:${darken(bg)}!important;
          color:#111!important;
        }`;
    }).join('\n');

    // Appliquer aussi directement aux cases déjà rendues.
    document.querySelectorAll('#global-view-container [data-rh-category]').forEach(el=>{
      const c=catalog.find(x=>String(x.id)===String(el.dataset.rhCategory||''));
      if(!c) return;
      el.style.setProperty('background-color',c.color,'important');
      el.style.setProperty('border-color',darken(c.color),'important');
    });

    // Légende
    document.querySelectorAll('#rh-v201-legend [data-rh-category]').forEach(el=>{
      const c=catalog.find(x=>String(x.id)===String(el.dataset.rhCategory||''));
      if(!c) return;
      el.style.setProperty('background-color',c.color,'important');
      el.style.setProperty('border-color',darken(c.color),'important');
    });
  }

  function schedulePreview(){
    if(previewFrame) return;
    previewFrame=requestAnimationFrame(()=>{
      previewFrame=0;
      applyPreviewCatalog(collectPreviewCatalog());
      setState('preview','Aperçu en direct · fermeture = enregistrement');
    });
  }

  function markDirty(row){
    dirty=true;
    row?.classList.add('rh-v209-dirty');
    setState('dirty','Modifications non encore enregistrées');
    schedulePreview();
  }

  function clearPreview(){
    previewStyle?.remove();
    previewStyle=null;
    document.getElementById('rh-v209-category-preview-css')?.remove();
  }

  function restoreSavedView(){
    clearPreview();
    try{
      const catalog=getSavedCatalog();
      // Redonner la couleur réellement enregistrée.
      document.querySelectorAll('#global-view-container [data-rh-category]').forEach(el=>{
        const c=catalog.find(x=>String(x.id)===String(el.dataset.rhCategory||''));
        if(!c) return;
        el.style.setProperty('background-color',c.color,'important');
        el.style.setProperty('border-color',darken(c.color),'important');
      });
    }catch(_){}
  }

  function clickSaveButton(){
    const btn=document.getElementById('rh-v202-save-categories');
    if(!btn) return false;
    btn.click();
    return true;
  }

  window.iChefCategoryManagerOpenedV209=function(){
    snapshot=getSavedCatalog();
    dirty=false;
    clearPreview();
    document.body.classList.add('rh-v209-category-open');
    document.querySelectorAll('.rh-v202-category-row').forEach(r=>r.classList.remove('rh-v209-dirty'));
    setState('saved','Couleurs enregistrées · aperçu en direct');
  };

  window.iChefCategoryManagerSavedV209=function(){
    snapshot=getSavedCatalog();
    dirty=false;
    clearPreview();
    document.body.classList.remove('rh-v209-category-open');
    setState('saved','✓ Enregistré');
  };

  window.iChefCategoryManagerCloseV209=function(mode='save'){
    const modal=document.getElementById('rh-v202-category-modal');
    if(!modal) return;

    if(mode==='cancel'){
      dirty=false;
      clearPreview();
      document.body.classList.remove('rh-v209-category-open');
      modal.classList.remove('show');
      restoreSavedView();
      try{showToast?.('Modifications annulées');}catch(_){}
      return;
    }

    if(!dirty){
      document.body.classList.remove('rh-v209-category-open');
      modal.classList.remove('show');
      return;
    }

    // Le X = enregistrer + fermer.
    // Le vrai saveManager V202 continue à faire toutes les validations,
    // la synchro RH et la mise à jour du planning.
    clickSaveButton();
  };

  // Toutes les modifications sont prévisualisées immédiatement.
  document.addEventListener('input',event=>{
    if(!event.target?.closest?.('#rh-v202-category-modal')) return;
    if(!event.target.matches(
      '.rh-v202-color,.rh-v202-label,.rh-v202-short,.rh-v202-meaning'
    )) return;

    markDirty(event.target.closest('.rh-v202-category-row'));
  },true);

  document.addEventListener('change',event=>{
    if(!event.target?.closest?.('#rh-v202-category-modal')) return;
    if(!event.target.matches(
      '.rh-v202-color,.rh-v202-label,.rh-v202-short,.rh-v202-meaning,.rh-v202-enabled,.rh-v202-legal'
    )) return;

    markDirty(event.target.closest('.rh-v202-category-row'));
  },true);

  // MASQUER / SUPPRIMER / AJOUTER / RESET doivent aussi marquer dirty.
  document.addEventListener('click',event=>{
    if(!event.target?.closest?.('#rh-v202-category-modal')) return;
    if(
      event.target.closest('.rh-v202-remove') ||
      event.target.closest('#rh-v202-add-category') ||
      event.target.closest('#rh-v202-reset-categories')
    ){
      setTimeout(()=>{
        dirty=true;
        setState('dirty','Modifications non encore enregistrées');
        schedulePreview();
      },0);
    }
  },true);

  // Echap = annuler, car c'est le comportement le moins risqué.
  document.addEventListener('keydown',event=>{
    if(event.key!=='Escape') return;
    const modal=document.getElementById('rh-v202-category-modal');
    if(!modal?.classList.contains('show')) return;

    event.preventDefault();
    window.iChefCategoryManagerCloseV209('cancel');
  },true);

  // Si le modal est fermé autrement, ne jamais laisser le planning
  // bloqué par pointer-events:none.
  const modal=document.getElementById('rh-v202-category-modal');
  if(modal){
    new MutationObserver(()=>{
      if(!modal.classList.contains('show')){
        document.body.classList.remove('rh-v209-category-open');
      }
    }).observe(modal,{attributes:true,attributeFilter:['class']});
  }

  window.__ICHEF_RH_BUILD__='RH-V209-CATEGORY-BUGFIX';
  console.info('[iCHEF RH V209] couleurs catégorie : aperçu live + X=enregistrer + annuler réel');
})();



;
/* RH V264 - preserved script #144 */

window.__ICHEF_RH_BUILD__='RH-V209-CATEGORY-BUGFIX';



;
/* RH V264 - preserved script #145 */

(() => {
  'use strict';
  if(window.__ICHEF_RH_V214_FULLSCREEN_FIX__) return;
  window.__ICHEF_RH_V214_FULLSCREEN_FIX__=true;

  function globalView(){
    return document.getElementById('global-view-container');
  }

  function normalizeBars(){
    const global=globalView();
    if(!global) return;

    const bar=document.getElementById('rh-v200-fastbar');
    const legend=document.getElementById('rh-v201-legend');
    const tools=document.getElementById('rh-v200-tools-deck');

    // Les barres restent dans le même conteneur que la matrice.
    // C'est le point qui évite la perte de boutons constatée dans la capture.
    if(bar && bar.parentElement!==global){
      global.insertBefore(bar,global.firstChild);
    }

    if(legend && legend.parentElement!==global){
      if(bar?.nextSibling) global.insertBefore(legend,bar.nextSibling);
      else global.appendChild(legend);
    }

    if(tools && tools.parentElement!==global){
      if(legend?.nextSibling) global.insertBefore(tools,legend.nextSibling);
      else global.appendChild(tools);
    }

    // Ordre garanti : barre 1 > catégories > outils > table.
    if(bar && global.firstElementChild!==bar){
      global.insertBefore(bar,global.firstChild);
    }
    if(legend && bar && bar.nextElementSibling!==legend){
      bar.insertAdjacentElement('afterend',legend);
    }
    if(tools && legend && legend.nextElementSibling!==tools){
      legend.insertAdjacentElement('afterend',tools);
    }

    // Nettoyage de l'ancien chrome V210/211/212.
    document.getElementById('rh-v210-focus-chrome')?.remove();
    document.documentElement.classList.remove('rh-v212-focus');
    document.documentElement.style.removeProperty('--rh-v211-chrome-height');
    document.documentElement.style.removeProperty('--rh-v212-chrome-height');

    // Les barres doivent toujours démarrer à gauche.
    if(bar) bar.scrollLeft=0;
    if(legend) legend.scrollLeft=0;
  }

  function refresh(){
    normalizeBars();
    requestAnimationFrame(normalizeBars);
  }

  // V207 reste le moteur officiel d'entrée/sortie plein écran.
  window.addEventListener('ichef:planning-focus-change',refresh);

  // Si le planning est reconstruit dynamiquement, on garde la structure saine.
  const month=document.getElementById('month-view-container');
  if(month){
    let frame=0;
    new MutationObserver(()=>{
      if(frame) return;
      frame=requestAnimationFrame(()=>{
        frame=0;
        normalizeBars();
      });
    }).observe(month,{childList:true,subtree:false});
  }

  // Compatibilité : si une autre partie du code appelle encore les anciennes API.
  window.ICHEF_RH_V210_FOCUS_FIX={
    mount:normalizeBars,
    restore:normalizeBars,
    sync:normalizeBars,
    isMounted:()=>false
  };
  window.ICHEF_RH_V211_FULLWIDTH={
    refresh:normalizeBars,
    height:()=>0
  };
  window.ICHEF_RH_V212_BARS={
    refresh:normalizeBars,
    resetScroll(){
      const bar=document.getElementById('rh-v200-fastbar');
      const legend=document.getElementById('rh-v201-legend');
      if(bar) bar.scrollLeft=0;
      if(legend) legend.scrollLeft=0;
    },
    isFocus:()=>document.body.classList.contains('rh-v207-focus-open')
  };

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',refresh,{once:true});
  }else{
    refresh();
  }
  setTimeout(refresh,180);

  window.__ICHEF_RH_BUILD__='RH-V214-FULLSCREEN-INPLACE-BARS';
  console.info('[iCHEF RH V214] plein écran corrigé : mêmes barres que la vue normale');
})();



;
/* RH V264 - preserved script #146 */

(() => {
  'use strict';
  if(window.__ICHEF_RH_V215_COLORS_WEEKEND__) return;
  window.__ICHEF_RH_V215_COLORS_WEEKEND__=true;

  let frame=0;

  function validHex(value){
    return /^#[0-9a-f]{6}$/i.test(String(value||''));
  }

  function darken(hex,amount=.34){
    const safe=validHex(hex)?hex:'#eeeeee';
    const n=parseInt(safe.slice(1),16);
    const r=Math.max(0,Math.round(((n>>16)&255)*(1-amount)));
    const g=Math.max(0,Math.round(((n>>8)&255)*(1-amount)));
    const b=Math.max(0,Math.round((n&255)*(1-amount)));
    return '#'+[r,g,b].map(v=>v.toString(16).padStart(2,'0')).join('');
  }

  function catalog(){
    try{
      return window.iChefPlanningCategoryCatalogV202?.() || [];
    }catch(_){
      return [];
    }
  }

  function categoryById(id){
    try{
      return window.iChefPlanningCategoryByIdV202?.(String(id||'')) || null;
    }catch(_){
      return null;
    }
  }

  function paintCategoryButtons(){
    const cats=catalog();

    document.querySelectorAll(
      '#rh-v201-legend [data-rh-category], #rh-v200-quick-drawer [data-category-id]'
    ).forEach(btn=>{
      const id=String(btn.dataset.rhCategory||btn.dataset.categoryId||'');
      const cat=cats.find(c=>String(c.id)===id) || categoryById(id);
      if(!cat) return;

      const color=validHex(cat.color)?String(cat.color):'#eeeeee';
      const border=darken(color);

      btn.style.setProperty('--rh-v215-category-color',color);
      btn.style.setProperty('--rh-v215-category-border',border);
      btn.style.setProperty('background-color',color,'important');
      btn.style.setProperty('border-color',border,'important');
      btn.style.setProperty('color','#111','important');
    });

    const select=document.getElementById('rh-v200-toolbar-status');
    if(select){
      const cat=categoryById(select.value);
      if(cat){
        const color=validHex(cat.color)?String(cat.color):'#eeeeee';
        const border=darken(color);
        select.style.setProperty('--rh-v215-toolbar-color',color);
        select.style.setProperty('--rh-v215-toolbar-border',border);
        select.style.setProperty('background-color',color,'important');
        select.style.setProperty('border-color',border,'important');
      }
    }
  }

  function monthValue(){
    return String(document.getElementById('month-selector')?.value||'');
  }

  function dateForDay(day){
    const month=monthValue();
    if(!/^\d{4}-\d{2}$/.test(month)) return null;
    const [y,m]=month.split('-').map(Number);
    const d=Number(day);
    if(!d) return null;

    const date=new Date(y,m-1,d,12,0,0,0);
    if(
      date.getFullYear()!==y ||
      date.getMonth()!==m-1 ||
      date.getDate()!==d
    ) return null;
    return date;
  }

  function paintWeekendColumns(){
    // V216 : mise à jour idempotente pour éviter le flash visuel
    // retrait/remise des couleurs à chaque frame.
    document.querySelectorAll('#global-thead th[data-rh-day]').forEach(th=>{
      const date=dateForDay(th.dataset.rhDay);
      const dow=date?.getDay();
      th.classList.toggle('rh-v215-saturday',dow===6);
      th.classList.toggle('rh-v215-sunday',dow===0);
    });

    document.querySelectorAll(
      '#global-view-container .rh-status-quick-btn[data-rh-day]'
    ).forEach(btn=>{
      const date=dateForDay(btn.dataset.rhDay);
      const td=btn.closest('td');
      if(!td) return;
      const dow=date?.getDay();

      td.classList.toggle('rh-v215-saturday',dow===6);
      td.classList.toggle('rh-v215-sunday',dow===0);
      btn.classList.toggle('rh-v215-saturday-button',dow===6);
      btn.classList.toggle('rh-v215-sunday-button',dow===0);
    });
  }

  function refresh(){
    if(frame) return;
    frame=requestAnimationFrame(()=>{
      frame=0;
      paintCategoryButtons();
      paintWeekendColumns();
    });
  }

  document.addEventListener('change',event=>{
    if(event.target?.id==='rh-v200-toolbar-status'){
      refresh();
    }
    if(event.target?.id==='month-selector'){
      refresh();
    }
  },true);

  window.addEventListener('ichef:planning-categories-updated',refresh);
  window.addEventListener('ichef:planning-focus-change',refresh);
  window.addEventListener('ichef:holiday-jurisdiction-updated',refresh);

  // Rerenders du planning / légende.
  const global=document.getElementById('global-view-container');
  if(global){
    new MutationObserver(mutations=>{
      const relevant=mutations.some(m =>
        [...(m.addedNodes||[])].some(n =>
          n?.nodeType===1 && (
            n.matches?.('thead,tbody,tr,.rh-status-quick-btn,#rh-v201-legend') ||
            n.querySelector?.('.rh-status-quick-btn,#rh-v201-legend')
          )
        )
      );
      if(relevant) refresh();
    }).observe(global,{
      childList:true,
      subtree:true
    });
  }

  // API légère si une autre partie du système veut forcer la mise à jour.
  window.ICHEF_RH_V215_COLORS={
    refresh,
    paintCategories:paintCategoryButtons,
    paintWeekend:paintWeekendColumns
  };

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',refresh,{once:true});
  }else{
    refresh();
  }
  setTimeout(refresh,180);

  window.__ICHEF_RH_BUILD__='RH-V215-COLORS-WEEKEND';
  console.info('[iCHEF RH V215] couleurs catégories sur touches + samedi/dimanche distincts');
})();



;
/* RH V264 - preserved script #147 */

(() => {
  'use strict';
  if(window.__ICHEF_RH_V216_MONTH_MOUSE__) return;
  window.__ICHEF_RH_V216_MONTH_MOUSE__=true;

  let monthPlaceholder=null;
  let mouseGesture=null;
  let suppressMouseClickUntil=0;
  let refreshFrame=0;

  function monthNav(){
    return document.getElementById('rh-v216-main-month-nav');
  }

  function ensureMonthSlot(count){
    if(!count) return;
    let slot=document.getElementById('rh-v216-month-slot');

    if(!slot){
      count.textContent='';
      slot=document.createElement('div');
      slot.id='rh-v216-month-slot';
      count.appendChild(slot);

      const badge=document.createElement('span');
      badge.id='rh-v216-selection-badge';
      count.appendChild(badge);
    }

    const nav=monthNav();
    if(nav && nav.parentElement!==slot){
      if(!monthPlaceholder){
        monthPlaceholder=document.createComment('V216:month-nav-home');
        nav.parentNode?.insertBefore(monthPlaceholder,nav);
      }
      slot.appendChild(nav);
    }
  }

  window.iChefV216UpdateMonthSlot=function(count,visibleCount=0){
    ensureMonthSlot(count);

    const badge=document.getElementById('rh-v216-selection-badge');
    if(badge){
      const n=Number(visibleCount||0);
      badge.textContent=n ? `${n} sélectionnée${n>1?'s':''}` : '';
      badge.classList.toggle('show',n>0);
    }
  };

  function installMonth(){
    const count=document.querySelector('#rh-v200-fastbar .rh-v200-count');
    if(!count) return;
    const n=Number(window.ICHEF_FAST_PLANNING_V205?.getSelectionCount?.()||0);
    window.iChefV216UpdateMonthSlot(count,n);
  }

  function multiActive(){
    return document.querySelector('#rh-v200-fastbar .rh-v200-select-mode')
      ?.classList.contains('active')===true;
  }

  function btnAt(x,y){
    return document.elementFromPoint(x,y)
      ?.closest?.('#global-view-container .rh-status-quick-btn') || null;
  }

  function selectMouseCell(btn){
    if(!btn || btn.classList.contains('rh-v200-selected')) return;
    const staff=String(btn.dataset.rhStaff||'');
    const day=Number(btn.dataset.rhDay||0);
    if(!staff || !day) return;

    window.openRhQuickStatus?.(
      {
        preventDefault(){},
        stopPropagation(){},
        ctrlKey:false,
        metaKey:false,
        shiftKey:false
      },
      staff,
      day
    );
  }

  function mouseDown(event){
    if(event.pointerType!=='mouse' || event.button!==0 || !multiActive()) return;
    const btn=event.target?.closest?.('#global-view-container .rh-status-quick-btn');
    if(!btn) return;

    event.preventDefault();
    mouseGesture={
      pointerId:event.pointerId,
      visited:new Set()
    };

    document.getElementById('global-view-container')
      ?.classList.add('rh-v216-mouse-drag');

    const key=`${btn.dataset.rhStaff}|${btn.dataset.rhDay}`;
    mouseGesture.visited.add(key);
    selectMouseCell(btn);
    suppressMouseClickUntil=Date.now()+700;
  }

  function mouseMove(event){
    if(!mouseGesture || event.pointerId!==mouseGesture.pointerId) return;
    event.preventDefault();

    const btn=btnAt(event.clientX,event.clientY);
    if(!btn) return;

    const key=`${btn.dataset.rhStaff}|${btn.dataset.rhDay}`;
    if(mouseGesture.visited.has(key)) return;

    mouseGesture.visited.add(key);
    selectMouseCell(btn);
  }

  function mouseEnd(event){
    if(!mouseGesture || event.pointerId!==mouseGesture.pointerId) return;
    suppressMouseClickUntil=Date.now()+500;
    mouseGesture=null;
    document.getElementById('global-view-container')
      ?.classList.remove('rh-v216-mouse-drag');
  }

  document.addEventListener('pointerdown',mouseDown,{capture:true,passive:false});
  document.addEventListener('pointermove',mouseMove,{capture:true,passive:false});
  document.addEventListener('pointerup',mouseEnd,true);
  document.addEventListener('pointercancel',mouseEnd,true);

  document.addEventListener('click',event=>{
    if(Date.now()>=suppressMouseClickUntil) return;
    const btn=event.target?.closest?.('#global-view-container .rh-status-quick-btn');
    if(!btn) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    event.stopPropagation();
  },true);

  function schedule(){
    if(refreshFrame) return;
    refreshFrame=requestAnimationFrame(()=>{
      refreshFrame=0;
      installMonth();
    });
  }

  const global=document.getElementById('global-view-container');
  if(global){
    new MutationObserver(mutations=>{
      const useful=mutations.some(m=>
        [...(m.addedNodes||[])].some(n=>
          n?.nodeType===1 &&
          (n.id==='rh-v200-fastbar' || n.querySelector?.('#rh-v200-fastbar'))
        )
      );
      if(useful) schedule();
    }).observe(global,{childList:true,subtree:true});
  }

  window.addEventListener('ichef:planning-focus-change',schedule);
  document.getElementById('month-selector')?.addEventListener('change',schedule,true);

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',schedule,{once:true});
  }else{
    schedule();
  }
  setTimeout(schedule,120);

  window.ICHEF_RH_V216={
    refresh:schedule,
    installMonth,
    mouseDrag:true,
    touchDrag:true
  };

  window.__ICHEF_RH_BUILD__='RH-V216-MONTH-MENU-MOUSE-STABLE';
  console.info('[iCHEF RH V216] mois dans barre planning · menu aligné · doigt+souris · anti-clignotement');
})();



;
/* RH V264 - preserved script #148 */

(() => {
  'use strict';
  if(window.__ICHEF_RH_V217_PLANNING_SYMBIOSIS__) return;
  window.__ICHEF_RH_V217_PLANNING_SYMBIOSIS__=true;

  const STORAGE_KEY='empire_hr_timesheets';
  const tenant=String(
    window.tenantID_JS ||
    (typeof tenantID_JS!=='undefined'?tenantID_JS:'') ||
    localStorage.getItem('ichef_tenant_id') ||
    'MASTER_STATE'
  );
  const CHANNEL_NAME=`ichef-rh-planning-${tenant}`;

  let bc=null;
  let frame=0;
  let pendingSources=new Set();
  let pendingSnapshot=null;
  let lastRenderedSignature='';
  let pendingForceRender=false;
  let lastBroadcastSignature='';
  let lastBroadcastAt=0;

  function clone(value){
    try{return JSON.parse(JSON.stringify(value||{}));}
    catch(_){return value||{}}
  }

  function signature(value){
    try{
      if(typeof rhPlanningSignature==='function') return rhPlanningSignature(value);
    }catch(_){}
    try{return JSON.stringify(value&&typeof value==='object'?value:{});}
    catch(_){return ''}
  }

  function currentMaster(){
    try{
      if(typeof getTs==='function') return getTs()||{};
    }catch(_){}
    try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}')||{};}
    catch(_){return{}}
  }

  function sourceIsAiApply(source){
    return /ASSISTANCE_PLANNING/i.test(String(source||''));
  }

  function markAssistantDraftStale(source,snapshot){
    if(sourceIsAiApply(source)) return;

    try{
      if(typeof planningAssistantDraft==='undefined' || !planningAssistantDraft) return;

      const currentSig=signature(snapshot||currentMaster());
      const draftSig=String(window.__ICHEF_PLANNING_DRAFT_MASTER_SIG_V217||'');

      if(draftSig && currentSig && draftSig!==currentSig){
        window.__ICHEF_PLANNING_DRAFT_STALE_V217=true;

        const apply=document.getElementById('assistant-apply-btn');
        if(apply){
          apply.disabled=true;
          apply.title='Planning officiel modifié · régénérez la proposition avant application';
        }

        const warnings=document.getElementById('ia-planning-draft-warnings');
        if(warnings){
          const message='PLANNING OFFICIEL MODIFIÉ · Régénérez la proposition avant de l’appliquer.';
          if(!String(warnings.innerText||'').includes(message)){
            warnings.innerText=message;
            warnings.style.display='';
          }
        }
      }
    }catch(error){
      console.warn('[iCHEF RH V217] contrôle brouillon IA',error);
    }
  }

  function syncPlanningMonthControls(){
    const main=String(document.getElementById('month-selector')?.value||'');
    if(!/^\d{4}-\d{2}$/.test(main)) return;

    // Les écrans liés au planning doivent ouvrir le même mois.
    // On ne touche pas aux champs si l'utilisateur est en train de les éditer.
    ['real-timesheet-month'].forEach(id=>{
      const el=document.getElementById(id);
      if(!el || document.activeElement===el) return;
      if(el.value!==main) el.value=main;
    });
  }

  function refreshEveryPlanningSurface(source='master'){
    syncPlanningMonthControls();

    try{
      if(typeof window.refreshPlanningScreensAfterSync==='function'){
        window.refreshPlanningScreensAfterSync(source);
      }else{
        if(typeof loadMonthData==='function') loadMonthData();
        if(typeof window.renderRhCockpit==='function') window.renderRhCockpit();
        if(typeof loadPublicPlanning==='function') loadPublicPlanning();
      }
    }catch(error){
      console.warn('[iCHEF RH V217] refresh principal',error);
    }

    // Les modules visibles ont déjà été rafraîchis par
    // refreshPlanningScreensAfterSync(). On évite de les rendre une 2e fois.

    // Les badges/couleurs/feriés/fullscreen lisent eux aussi le même master.
    try{window.ICHEF_RH_V215_COLORS?.refresh?.();}catch(_){}
    try{window.ICHEF_RH_V216?.refresh?.();}catch(_){}
    try{window.ICHEF_RH_V212_BARS?.refresh?.();}catch(_){}
    try{applyHolidayHeaders?.();}catch(_){}

    window.dispatchEvent(new CustomEvent('ichef:planning-symbiosis',{
      detail:{
        source:String(source||'master'),
        month:String(document.getElementById('month-selector')?.value||''),
        signature:lastRenderedSignature,
        at:new Date().toISOString()
      }
    }));
  }

  function flush(){
    frame=0;
    const snapshot=pendingSnapshot||currentMaster();
    pendingSnapshot=null;

    const sig=signature(snapshot);
    const source=[...pendingSources].join(' + ')||'master';
    pendingSources.clear();

    markAssistantDraftStale(source,snapshot);

    // Même snapshot reçu plusieurs fois (local + ack + socket) :
    // un seul rendu suffit, sauf ouverture explicite d'une vue.
    const force=pendingForceRender;
    pendingForceRender=false;
    if(sig && sig===lastRenderedSignature && !force){
      syncPlanningMonthControls();
      return;
    }

    lastRenderedSignature=sig;
    refreshEveryPlanningSurface(source);
  }

  function schedule(source='master',snapshot=null,forceRender=false){
    pendingSources.add(String(source||'master'));
    if(snapshot&&typeof snapshot==='object') pendingSnapshot=clone(snapshot);
    if(forceRender) pendingForceRender=true;

    if(frame) return;
    frame=requestAnimationFrame(flush);
  }

  function broadcast(source,snapshot){
    if(!bc) return;
    const sig=signature(snapshot);
    const now=Date.now();

    if(sig && sig===lastBroadcastSignature && now-lastBroadcastAt<500) return;
    lastBroadcastSignature=sig;
    lastBroadcastAt=now;

    try{
      bc.postMessage({
        type:'PLANNING_MASTER_CHANGED',
        tenant,
        source:String(source||'master'),
        signature:sig,
        at:now
      });
    }catch(_){}
  }

  window.iChefPlanningMasterSyncV217=function(payload={}){
    const source=String(payload.source||'master');
    const snapshot=payload.snapshot&&typeof payload.snapshot==='object'
      ? payload.snapshot
      : currentMaster();

    schedule(
      source,
      snapshot,
      payload.renderOnly===true || payload.forceRender===true
    );

    if(payload.renderOnly!==true){
      broadcast(source,snapshot);
    }

    return true;
  };

  // Autres onglets RH du même navigateur.
  try{
    if('BroadcastChannel' in window){
      bc=new BroadcastChannel(CHANNEL_NAME);
      bc.addEventListener('message',event=>{
        const data=event.data||{};
        if(data.type!=='PLANNING_MASTER_CHANGED'||String(data.tenant)!==tenant) return;
        schedule(`broadcast:${String(data.source||'other-tab')}`,currentMaster());
      });
    }
  }catch(_){bc=null;}

  // Fallback standard multi-onglets.
  window.addEventListener('storage',event=>{
    if(event.key!==STORAGE_KEY) return;
    schedule('storage-event',currentMaster());
  });

  // Synchroniser le mois des écrans planning à chaque navigation de mois.
  document.getElementById('month-selector')?.addEventListener('change',()=>{
    syncPlanningMonthControls();
    schedule('month-change',currentMaster());
  },true);

  // Le mois d'une feuille d'heures peut aussi piloter le planning si
  // l'utilisateur le choisit explicitement dans cet écran.
  document.getElementById('real-timesheet-month')?.addEventListener('change',event=>{
    const month=String(event.target?.value||'');
    const main=document.getElementById('month-selector');
    if(main && /^\d{4}-\d{2}$/.test(month) && main.value!==month){
      main.value=month;
      try{handleMonthChange?.();}catch(_){schedule('timesheet-month-change',currentMaster());}
    }
  },true);

  // Quand un nouveau brouillon IA vient d'être généré, il devient la
  // proposition basée sur le master courant.
  window.addEventListener('ichef-multimonth-update',()=>{
    try{
      if(typeof planningAssistantDraft!=='undefined' && planningAssistantDraft){
        window.__ICHEF_PLANNING_DRAFT_STALE_V217=false;
        window.__ICHEF_PLANNING_DRAFT_MASTER_SIG_V217=signature(currentMaster());
      }
    }catch(_){}
  });

  window.addEventListener('online',()=>schedule('online',currentMaster()));
  window.addEventListener('focus',()=>schedule('focus',currentMaster()));

  // Premier alignement sans écrire sur le serveur.
  lastRenderedSignature='';
  schedule('boot',currentMaster());

  window.ICHEF_PLANNING_SYMBIOSIS_V217={
    refresh:()=>schedule('manual-refresh',currentMaster()),
    master:()=>clone(currentMaster()),
    signature:()=>signature(currentMaster()),
    channel:CHANNEL_NAME,
    version:'RH-V217-PLANNING-SYMBIOSIS'
  };

  window.__ICHEF_RH_BUILD__='RH-V217-PLANNING-SYMBIOSIS';
  console.info('[iCHEF RH V217] TIMESHEETS_MASTER = source unique de tous les plannings');
})();



;
/* RH V264 - preserved script #149 */

(() => {
  'use strict';
  if(window.__ICHEF_RH_V218_STABILITY__) return;
  window.__ICHEF_RH_V218_STABILITY__=true;

  const diagnostics={
    version:'RH-V218-GLOBAL-STABILITY',
    errors:[],
    rejections:[],
    startedAt:new Date().toISOString()
  };

  function pushLimited(list,value){
    list.push(value);
    if(list.length>20) list.shift();
  }

  window.addEventListener('error',event=>{
    pushLimited(diagnostics.errors,{
      message:String(event.message||'Erreur JavaScript'),
      source:String(event.filename||''),
      line:Number(event.lineno||0),
      at:new Date().toISOString()
    });
  });

  window.addEventListener('unhandledrejection',event=>{
    pushLimited(diagnostics.rejections,{
      message:String(event.reason?.message||event.reason||'Promesse rejetée'),
      at:new Date().toISOString()
    });
  });

  // Une seule API de rafraîchissement support pour éviter de forcer
  // manuellement plusieurs moteurs différents.
  window.iChefRefreshAllVisibleV218=function(source='manual'){
    try{
      window.iChefPlanningMasterSyncV217?.({
        source:`V218:${source}`,
        snapshot:window.ICHEF_PLANNING_SYMBIOSIS_V217?.master?.(),
        renderOnly:true,
        forceRender:true
      });
    }catch(_){}

    try{window.ICHEF_RH_V215_COLORS?.refresh?.();}catch(_){}
    try{window.ICHEF_RH_V216?.refresh?.();}catch(_){}

    window.dispatchEvent(new CustomEvent('ichef:ui-stable-refresh',{
      detail:{source:String(source||'manual'),at:new Date().toISOString()}
    }));
  };

  // Nettoyer une éventuelle classe de transaction restée après une
  // interruption navigateur.
  window.addEventListener('pageshow',()=>{
    document.documentElement.classList.remove('rh-v218-view-switching');
  });

  window.ICHEF_RH_DIAGNOSTICS_V218=diagnostics;
  window.__ICHEF_RH_BUILD__='RH-V218-GLOBAL-STABILITY';
  console.info('[iCHEF RH V218] stabilité globale · observers filtrés · vues coalescées · modales sans flash');
})();



;
/* RH V264 - preserved script #150 */

(() => {
  'use strict';
  if(window.__ICHEF_RH_V222_PIN_ACTIVE__) return;
  window.__ICHEF_RH_V222_PIN_ACTIVE__=true;

  const state={
    version:'RH-V222-PIN-ACTIF-SECURISE',
    lastAction:'',
    lastError:'',
    lastOkAt:'',
    endpoint:''
  };

  function cleanPin(value){
    return String(value||'').replace(/\D+/g,'').slice(0,12);
  }

  function validPin(value){
    return /^\d{4,12}$/.test(cleanPin(value));
  }

  function setGatewayStatusSafe(message,type='ok'){
    try{
      if(typeof window.setOfficialGatewayStatus==='function'){
        window.setOfficialGatewayStatus(message,type);
        return;
      }
    }catch(_){}
    const text=document.getElementById('official-gateway-status-text');
    if(text) text.textContent=String(message||'');
  }

  // Exposer explicitement les fonctions du gateway qui étaient auparavant
  // seulement des déclarations globales historiques.
  [
    'appendOfficialGatewayPin',
    'deleteOfficialGatewayPin',
    'clearOfficialGatewayPin',
    'submitOfficialGatewayPin',
    'openOfficialAccessCenter',
    'closeOfficialAccessCenter'
  ].forEach(name=>{
    try{
      if(typeof globalThis[name]==='function') window[name]=globalThis[name];
    }catch(_){}
  });

  // Contrôleur délégué : le PIN continue de fonctionner même si un ancien
  // onclick inline est neutralisé par le navigateur ou par une couche UI.
  document.addEventListener('click',event=>{
    const target=event.target?.closest?.('button');
    if(!target) return;

    // Porte d'entrée officielle
    if(target.closest('#landing-portal')){
      if(target.classList.contains('gateway-key')){
        event.preventDefault();
        event.stopImmediatePropagation();

        const txt=String(target.textContent||'').trim();
        if(/^\d$/.test(txt)){
          window.appendOfficialGatewayPin?.(txt);
        }else if(/EFFACER/i.test(txt)){
          window.clearOfficialGatewayPin?.();
        }else{
          window.deleteOfficialGatewayPin?.();
        }
        return;
      }

      if(target.id==='official-gateway-submit'){
        event.preventDefault();
        event.stopImmediatePropagation();
        window.submitOfficialGatewayPin?.();
        return;
      }
    }

    // Ancien pad Direction / RH
    if(target.closest('#pin-modal') && target.classList.contains('pin-btn')){
      event.preventDefault();
      event.stopImmediatePropagation();

      const txt=String(target.textContent||'').trim();
      if(/^\d$/.test(txt)){
        window.appendPin?.(txt);
      }else if(/^X$/i.test(txt)){
        window.cancelPin?.();
      }else if(/^OK$/i.test(txt)){
        window.submitPin?.();
      }
    }
  },true);

  // Clavier physique pour le pad Direction secondaire.
  document.addEventListener('keydown',event=>{
    const modal=document.getElementById('pin-modal');
    if(!modal || getComputedStyle(modal).display==='none') return;

    if(/^\d$/.test(event.key)){
      event.preventDefault();
      window.appendPin?.(event.key);
    }else if(event.key==='Backspace'){
      event.preventDefault();
      try{
        currentPin=String(currentPin||'').slice(0,-1);
        const d=document.getElementById('pin-display');
        if(d) d.innerText='●'.repeat(currentPin.length);
      }catch(_){}
    }else if(event.key==='Enter'){
      event.preventDefault();
      window.submitPin?.();
    }else if(event.key==='Escape'){
      event.preventDefault();
      window.cancelPin?.();
    }
  },true);

  window.activateStaffPinV222=async function(){
    const input=document.getElementById('staff-pin');
    const button=document.getElementById('rh-v222-activate-pin');
    const pin=cleanPin(input?.value);
    if(input) input.value=pin;

    if(!validPin(pin)){
      window.setStaffPinStatusV203?.('error','PIN invalide · 4 à 12 chiffres');
      input?.focus?.();
      return false;
    }

    if(typeof window.saveStaff!=='function' && typeof saveStaff!=='function'){
      window.setStaffPinStatusV203?.('error','Fonction d’enregistrement indisponible');
      return false;
    }

    if(button){
      button.disabled=true;
      button.textContent='ACTIVATION…';
    }
    window.setStaffPinStatusV203?.('syncing','Enregistrement et activation du PIN…');

    try{
      const saver=typeof window.saveStaff==='function' ? window.saveStaff : saveStaff;
      const ok=await saver();
      if(ok){
        state.lastOkAt=new Date().toISOString();
        window.setStaffPinStatusV203?.('ok','✓ PIN actif et reconnu par le serveur');
        return true;
      }
      return false;
    }catch(error){
      state.lastError=String(error?.message||error||'Erreur activation PIN');
      window.setStaffPinStatusV203?.('error',state.lastError);
      return false;
    }finally{
      if(button){
        button.disabled=false;
        button.textContent='ACTIVER LE PIN';
      }
    }
  };

  // Test serveur direct avec diagnostic lisible.
  const previousTest=window.testStaffPinV203;
  window.testStaffPinV203=async function(){
    const input=document.getElementById('staff-pin');
    const btn=document.getElementById('rh-v203-test-pin');
    const pin=cleanPin(input?.value);
    if(input) input.value=pin;

    if(!validPin(pin)){
      window.setStaffPinStatusV203?.('error','PIN invalide · 4 à 12 chiffres');
      return false;
    }

    const original=String(document.getElementById('staff-edit-original-pin')?.value||'').trim();
    let savedStaff=null;
    try{
      savedStaff=(typeof getDir==='function'?getDir():[])
        .find(s=>String(s.pin||'')===String(original||pin))||null;
    }catch(_){}

    if(!savedStaff || pin!==String(savedStaff.pin||'')){
      window.setStaffPinStatusV203?.(
        'warn',
        'PIN pas encore synchronisé · cliquez ACTIVER LE PIN'
      );
      return false;
    }

    if(btn){
      btn.disabled=true;
      btn.textContent='TEST…';
    }
    window.setStaffPinStatusV203?.('syncing','Vérification sécurisée avec le serveur…');

    try{
      const verifier=window.verifyPinWithServer;
      if(typeof verifier!=='function') throw new Error('Moteur PIN non chargé');

      const auth=await verifier(pin);
      state.endpoint=String(auth?.endpoint||'');
      if(auth?.success){
        state.lastOkAt=new Date().toISOString();
        const role=String(auth.role||auth.dept||'accès').trim();
        window.setStaffPinStatusV203?.(
          'ok',
          `✓ PIN actif${role?` · ${role}`:''}`
        );
        return true;
      }

      state.lastError=String(auth?.error||'PIN non reconnu');
      window.setStaffPinStatusV203?.('error',state.lastError);
      return false;
    }catch(error){
      state.lastError=String(error?.message||'Serveur PIN indisponible');
      window.setStaffPinStatusV203?.('error',state.lastError);
      return false;
    }finally{
      if(btn){
        btn.disabled=false;
        btn.textContent='TESTER LE PIN';
      }
    }
  };

  // Input PIN : toujours interactif.
  document.addEventListener('input',event=>{
    if(event.target?.id!=='staff-pin') return;
    const cleaned=cleanPin(event.target.value);
    if(event.target.value!==cleaned) event.target.value=cleaned;

    const original=String(document.getElementById('staff-edit-original-pin')?.value||'');
    if(validPin(cleaned)){
      window.setStaffPinStatusV203?.(
        cleaned===original ? 'neutral' : 'warn',
        cleaned===original
          ? 'PIN enregistré · vous pouvez le tester'
          : 'PIN modifié · cliquez ACTIVER LE PIN'
      );
    }else{
      window.setStaffPinStatusV203?.('warn','4 chiffres minimum');
    }
  },true);

  window.ICHEF_RH_PIN_V222={
    state,
    verify:pin=>window.verifyPinWithServer?.(pin),
    activate:()=>window.activateStaffPinV222(),
    test:()=>window.testStaffPinV203(),
    valid:validPin
  };

  window.__ICHEF_RH_BUILD__='RH-V222-PIN-ACTIF-SECURISE';
  console.info('[iCHEF RH V222] PIN actif · clavier/tactile · activation serveur · aucun fallback local');
})();



;
/* RH V264 - preserved script #151 */

(() => {
  'use strict';
  if(window.__ICHEF_RH_V223_ASSISTANT_MENU_COLORS__) return;
  window.__ICHEF_RH_V223_ASSISTANT_MENU_COLORS__=true;

  let frame=0;
  let openWrapped=false;

  function modal(){
    return document.getElementById('ia-predictions-modal');
  }

  function content(){
    return modal()?.querySelector('.modal-content') || null;
  }

  function ensureNavButton(id, title, subtitle, action){
    let btn=document.getElementById(id);
    if(btn) return btn;

    btn=document.createElement('button');
    btn.id=id;
    btn.type='button';
    btn.innerHTML=`
      <span class="v153-btn-copy">
        <strong>${title}</strong>
        <small>${subtitle}</small>
      </span>
    `;
    btn.addEventListener('click',action);
    return btn;
  }

  function ensureToolbar(){
    const m=modal();
    const c=content();
    const header=c?.querySelector(':scope > .header') || c?.querySelector('.header');
    if(!m || !c || !header) return false;

    let host=document.getElementById('v223-assistant-top-stack');
    if(!host){
      host=document.createElement('div');
      host.id='v223-assistant-top-stack';
      header.insertAdjacentElement('afterend',host);
    }else if(host.parentElement!==c){
      header.insertAdjacentElement('afterend',host);
    }

    const period=document.getElementById('v128-period-actions-row');
    if(period && period.parentElement!==host){
      host.appendChild(period);
    }

    let toolbar=document.getElementById('v153-assistant-toolbar');
    if(!toolbar){
      toolbar=document.createElement('div');
      toolbar.id='v153-assistant-toolbar';
      toolbar.setAttribute('aria-label','Navigation planning iCHEF');
    }

    const planning=ensureNavButton(
      'v153-nav-planning',
      'PLANNING OFFICIEL',
      'Planning synchronisé',
      ()=>window.iChefAssistantShowOfficialV221?.()
    );
    planning.classList.add('v153-primary');

    const proposal=ensureNavButton(
      'v153-nav-proposal',
      'PLANNING PROPOSÉ',
      'Proposition iCHEF',
      ()=>window.iChefAssistantShowProposalV221?.()
    );
    proposal.classList.add('v153-proposal');

    const emergency=document.getElementById('v134-emergency-btn');
    const settings=document.getElementById('v131-planning-tools-btn');

    [planning,proposal,emergency,settings].filter(Boolean).forEach(btn=>{
      if(btn.parentElement!==toolbar) toolbar.appendChild(btn);
    });

    if(toolbar.parentElement!==host){
      host.appendChild(toolbar);
    }

    // Ordre définitif, sans clone : fonctions existantes conservées.
    [planning,proposal,emergency,settings].filter(Boolean).forEach(btn=>{
      toolbar.appendChild(btn);
    });

    toolbar.hidden=false;
    toolbar.removeAttribute('aria-hidden');

    m.dataset.v223Toolbar='1';
    return true;
  }

  function refresh(){
    if(frame) return;
    frame=requestAnimationFrame(()=>{
      frame=0;
      ensureToolbar();
    });
  }

  function resetModalScroll(){
    const c=content();
    if(c) c.scrollTop=0;
  }

  function wrapOpen(){
    if(openWrapped || typeof window.openPlanningAssistant!=='function') return;
    const original=window.openPlanningAssistant;
    if(original.__v223) {
      openWrapped=true;
      return;
    }

    const wrapped=function(...args){
      const result=original.apply(this,args);
      requestAnimationFrame(()=>{
        ensureToolbar();
        resetModalScroll();
      });
      setTimeout(()=>{
        ensureToolbar();
        resetModalScroll();
      },80);
      return result;
    };
    wrapped.__v223=true;
    window.openPlanningAssistant=wrapped;
    openWrapped=true;
  }

  window.addEventListener('ichef:planning-categories-updated',()=>{
    try{window.iChefAssistantRefreshColorsV223?.();}catch(_){}
    refresh();
  });

  window.addEventListener('ichef:planning-symbiosis',()=>{
    if(modal()?.classList.contains('show')){
      try{window.iChefAssistantRefreshColorsV223?.();}catch(_){}
    }
  });

  const m=modal();
  if(m){
    new MutationObserver(mutations=>{
      const relevant=mutations.some(x =>
        [...(x.addedNodes||[])].some(n =>
          n?.nodeType===1 && (
            n.id==='v128-period-actions-row' ||
            n.id==='v153-assistant-toolbar' ||
            n.id==='v131-planning-tools-btn' ||
            n.id==='v134-emergency-btn' ||
            n.querySelector?.('#v128-period-actions-row,#v153-assistant-toolbar,#v131-planning-tools-btn,#v134-emergency-btn')
          )
        )
      );
      if(relevant) refresh();
    }).observe(m,{childList:true,subtree:true});
  }

  function boot(){
    wrapOpen();
    refresh();
    setTimeout(()=>{wrapOpen();refresh();},120);
    setTimeout(refresh,450);
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',boot,{once:true});
  }else{
    boot();
  }

  window.ICHEF_RH_V223={
    repairAssistant:refresh,
    refreshColors:()=>window.iChefAssistantRefreshColorsV223?.()
  };

  window.__ICHEF_RH_BUILD__='RH-V223-IA-COLORS-MENU-FIX';
  console.info('[iCHEF RH V223] assistance visible + mêmes couleurs/libellés que le planning');
})();



;
/* RH V264 - preserved script #152 */

(() => {
  'use strict';
  if(window.__ICHEF_RH_V226_TARGET__) return;
  window.__ICHEF_RH_V226_TARGET__=true;

  const hub=document.getElementById('director-hub');
  if(!hub) return;

  const oldSidebar=hub.querySelector(':scope > .rh-cockpit-sidebar');
  const oldMain=hub.querySelector(':scope > .rh-cockpit-main');

  let frame=0;
  let observer=null;

  const esc=s=>String(s??'')
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;');

  function q(sel,root=document){return root.querySelector(sel);}
  function qa(sel,root=document){return [...root.querySelectorAll(sel)];}

  function originalNav(label){
    if(!oldSidebar) return null;
    return qa('button',oldSidebar).find(btn=>
      String(btn.textContent||'').trim().toLowerCase().includes(String(label).toLowerCase())
    )||null;
  }

  function clickOriginal(label){
    const btn=originalNav(label);
    if(btn){btn.click();return true;}
    return false;
  }

  function clickOriginalPlanningAction(selector,text=''){
    const root=oldMain;
    if(!root) return false;
    let btn=selector?q(selector,root):null;
    if(!btn && text){
      btn=qa('button',root).find(b=>String(b.textContent||'').toLowerCase().includes(text.toLowerCase()));
    }
    if(btn){btn.click();return true;}
    return false;
  }

  function makeShell(){
    if(document.getElementById('rh-v226-shell')) return;

    const shell=document.createElement('div');
    shell.id='rh-v226-shell';
    shell.innerHTML=`
      <aside id="rh-v226-sidebar">
        <div id="rh-v226-brand">
          <div class="brand-main">iCHEF <span class="brand-os">OS</span></div>
          <div class="brand-sub">Ressources Humaines</div>
        </div>

        <span class="rh-v226-nav-label">PILOTER</span>
        <button class="rh-v226-nav-btn active" data-v226-nav="dashboard"><span class="ico">⌂</span><span>Tableau de bord</span></button>
        <button class="rh-v226-nav-btn" data-v226-nav="planning" title="Ouvrir le Planning Premium PWA"><span class="ico">▦</span><span>Planning Premium</span></button>
        <button class="rh-v226-nav-btn" data-v226-nav="equipe"><span class="ico">♙</span><span>Équipe</span></button>

        <span class="rh-v226-nav-label">TEMPS</span>
        <button class="rh-v226-nav-btn" data-v226-nav="heures"><span class="ico">◷</span><span>Heures</span></button>
        <button class="rh-v226-nav-btn" data-v226-nav="demandes"><span class="ico">▤</span><span>Demandes</span><span id="rh-v226-request-badge" class="badge"></span></button>
        <button class="rh-v226-nav-btn" data-v226-nav="conges"><span class="ico">♢</span><span>Congés & absences</span></button>

        <span class="rh-v226-nav-label">ADMINISTRER</span>
        <button class="rh-v226-nav-btn" data-v226-nav="contrats"><span class="ico">▣</span><span>Contrats</span></button>
        <button class="rh-v226-nav-btn" data-v226-nav="documents"><span class="ico">▱</span><span>Documents</span></button>
        <button class="rh-v226-nav-btn" data-v226-nav="legal"><span class="ico">⚖</span><span>Dossier légal</span></button>

        <span class="rh-v226-nav-label">INTELLIGENCE</span>
        <button class="rh-v226-nav-btn" data-v226-nav="assistant"><span class="ico">✧</span><span>Assistance planning</span></button>
        <button class="rh-v226-nav-btn" data-v226-nav="ia"><span class="ico">⚙</span><span>Réglages IA</span></button>

        <span class="rh-v226-nav-label">PARAMÈTRES</span>
        <button class="rh-v226-nav-btn" data-v226-nav="etablissement"><span class="ico">▥</span><span>Établissement</span></button>
        <button class="rh-v226-nav-btn" data-v226-nav="couleurs"><span class="ico">◉</span><span>Catégories & couleurs</span></button>
        <button class="rh-v226-nav-btn" data-v226-nav="utilisateurs"><span class="ico">♙</span><span>Utilisateurs</span></button>

        <div id="rh-v226-side-bottom"><span>◩</span><strong>iCHEF</strong><small>V226</small></div>
      </aside>

      <main id="rh-v226-main">
        <header id="rh-v226-topbar">
          <div id="rh-v226-venue"><strong>iCHEF Établissement</strong><small>Établissement principal</small></div>
          <label id="rh-v226-search-wrap"><span>⌕</span><input id="rh-v226-search" type="search" placeholder="Rechercher un collaborateur…"></label>
          <div id="rh-v226-sync"><span class="dot"></span><div><strong>Synchronisé</strong><small id="rh-v226-sync-time">Dernière synchronisation</small></div></div>
          <div id="rh-v226-direction"><div id="rh-v226-bell">♧<span id="rh-v226-bell-badge" class="badge"></span></div><div id="rh-v226-avatar">D</div><strong>Direction⌄</strong></div>
        </header>

        <div id="rh-v226-content">
          <section id="rh-v226-kpis">
            <article class="rh-v226-kpi staff"><div class="icon">♙</div><div><div id="rh-v226-total" class="value">0</div><div class="label">collaborateurs</div><div id="rh-v226-active-sub" class="sub">0 actifs</div></div></article>
            <article class="rh-v226-kpi hours"><div class="icon">◷</div><div><div class="value"><span id="rh-v226-planned">0 h</span> <small>/ <span id="rh-v226-target">0 h</span></small></div><div class="label">heures planifiées</div><div class="rh-v226-progress"><i id="rh-v226-progress-bar"></i></div><div id="rh-v226-percent" class="sub">0 %</div></div></article>
            <article class="rh-v226-kpi requests"><div class="icon">▤</div><div><div id="rh-v226-requests" class="value">0</div><div class="label">demande à traiter</div><div id="rh-v226-request-sub" class="sub">Aucune demande</div></div></article>
            <article class="rh-v226-kpi alerts"><div class="icon">△</div><div><div id="rh-v226-alerts" class="value">0</div><div class="label">alertes</div><div id="rh-v226-alert-sub" class="sub">Aucune alerte prioritaire</div></div></article>
          </section>

          <section id="rh-v226-primary">
            <article class="rh-v226-card">
              <div id="rh-v226-planning-head">
                <div id="rh-v226-plan-title">PLANNING DE LA SEMAINE</div>
                <div id="rh-v226-week">Semaine en cours</div>
                <div id="rh-v226-tabs">
                  <button class="rh-v226-tab" data-v226-tab="today">Aujourd’hui</button>
                  <button class="rh-v226-tab active" data-v226-tab="week">Semaine</button>
                  <button class="rh-v226-tab" data-v226-tab="month">Mois</button>
                </div>
                <div id="rh-v226-plan-actions">
                  <button class="rh-v226-action" data-v226-action="analyse">▥ Analyser</button>
                  <button class="rh-v226-action" data-v226-action="holidays">▣ Fériés</button>
                  <button class="rh-v226-action publish" data-v226-action="publish">➤ PUBLIER AU STAFF</button>
                </div>
              </div>
              <div id="rh-v226-plan-table-wrap"></div>
              <button id="rh-v226-plan-full">OUVRIR LE PLANNING COMPLET →</button>
            </article>

            <article class="rh-v226-card">
              <div id="rh-v226-todo-head"><span>À FAIRE MAINTENANT</span><span id="rh-v226-todo-count" class="rh-v226-count">0</span></div>
              <div id="rh-v226-todo-list"></div>
              <button id="rh-v226-todo-all">VOIR TOUTES LES ALERTES →</button>
            </article>
          </section>

          <section id="rh-v226-analytics">
            <article class="rh-v226-card">
              <div class="rh-v226-analytics-head">ÉQUILIBRE HEURES</div>
              <div id="rh-v226-balance-body" class="rh-v226-analytics-body">
                <div id="rh-v226-donut"><div id="rh-v226-donut-text"><strong>0 h</strong><small>planifiées</small></div></div>
                <div>
                  <div class="rh-v226-statline"><span>Heures planifiées</span><strong id="rh-v226-stat-planned">0 h</strong></div>
                  <div class="rh-v226-statline"><span>Heures prévues</span><strong id="rh-v226-stat-target">0 h</strong></div>
                  <div class="rh-v226-statline"><span>Écart</span><strong id="rh-v226-gap">0 h</strong></div>
                  <div class="rh-v226-statline"><span>Taux de couverture</span><strong id="rh-v226-rate">0 %</strong></div>
                </div>
              </div>
            </article>

            <article class="rh-v226-card">
              <div class="rh-v226-analytics-head">COÛT & PRODUCTIVITÉ</div>
              <div id="rh-v226-productivity" class="rh-v226-analytics-body">
                <div class="big"><span class="ico">▥</span><div><strong id="rh-v226-prod-rate">0 %</strong><small>couverture<br>des heures</small></div></div>
                <div>
                  <div class="rh-v226-statline"><span>Heures planifiées</span><strong id="rh-v226-prod-planned">0 h</strong></div>
                  <div class="rh-v226-statline"><span>Objectif</span><strong id="rh-v226-prod-target">0 h</strong></div>
                  <div class="rh-v226-statline"><span>Écart</span><strong id="rh-v226-prod-gap">0 h</strong></div>
                  <div class="rh-v226-statline"><span>Synchronisation</span><strong>LIVE</strong></div>
                </div>
              </div>
            </article>

            <article id="rh-v226-alerts-card" class="rh-v226-card">
              <div class="rh-v226-analytics-head"><span>ALERTES LÉGALES & OPÉRATIONNELLES</span><span id="rh-v226-alert-count2" class="rh-v226-count">0</span></div>
              <div id="rh-v226-alert-list"></div>
            </article>
          </section>

          <div id="rh-v226-version">V226 · Dashboard cible · fonctions et sécurité conservées</div>
        </div>
      </main>
    `;
    hub.appendChild(shell);

    wireActions();
  }

  function hiddenText(sel,fallback=''){
    return String(q(sel,oldMain)?.textContent||fallback).trim();
  }

  function numFromText(value){
    const m=String(value||'').replace(',','.').match(/-?\d+(?:\.\d+)?/);
    return m?Number(m[0]):0;
  }

  function cloneRows(sourceSelector,targetId,limit=6){
    const source=q(sourceSelector,oldMain);
    const target=document.getElementById(targetId);
    if(!target) return [];

    const rows=source?qa('.rh-list-item',source).slice(0,limit):[];
    const signature=rows.map(r=>String(r.textContent||'').replace(/\s+/g,' ').trim()).join('||');

    if(target.__v236RowsSignature===signature){
      return rows;
    }
    target.__v236RowsSignature=signature;
    target.innerHTML='';

    if(!rows.length){
      target.innerHTML='<div class="rh-v226-list-row"><span class="ico">✓</span><div><strong>Rien à traiter</strong><small>Le tableau est à jour.</small></div></div>';
      return [];
    }

    rows.forEach((row,index)=>{
      const strong=q('strong',row)?.textContent?.trim() || q('.rh-list-main',row)?.textContent?.trim() || 'Action à traiter';
      const small=q('small',row)?.textContent?.trim() || '';
      const originalBtn=q('button',row);

      const v=document.createElement('div');
      v.className='rh-v226-list-row';
      v.innerHTML=`
        <span class="ico">${index===0?'!':'△'}</span>
        <div><strong>${esc(strong)}</strong><small>${esc(small)}</small></div>
        ${originalBtn?'<button type="button">VOIR</button>':''}
      `;
      const btn=q('button',v);
      if(btn) btn.addEventListener('click',()=>originalBtn?.click());
      target.appendChild(v);
    });
    return rows;
  }

  function syncPlanning(){
    const oldTable=q('.rh-planning-table',oldMain);
    const wrap=document.getElementById('rh-v226-plan-table-wrap');
    if(!wrap) return;

    if(!oldTable){
      const loading='<div style="padding:40px;text-align:center;color:#6c7782;font-size:10px">Planning en cours de chargement…</div>';
      if(wrap.innerHTML!==loading) wrap.innerHTML=loading;
      return;
    }

    const sourceSignature=oldTable.innerHTML;
    if(wrap.__v236PlanningSignature===sourceSignature){
      return;
    }
    wrap.__v236PlanningSignature=sourceSignature;

    const clone=oldTable.cloneNode(true);
    clone.removeAttribute('id');
    qa('[id]',clone).forEach(el=>el.removeAttribute('id'));
    wrap.replaceChildren(clone);

    // Le clic visible déclenche exactement le bouton historique correspondant.
    clone.addEventListener('click',event=>{
      const btn=event.target.closest?.('[data-rh-edit-staff][data-rh-edit-date]');
      if(!btn) return;
      event.preventDefault();
      const original=q(
        `[data-rh-edit-staff="${CSS.escape(btn.dataset.rhEditStaff)}"][data-rh-edit-date="${CSS.escape(btn.dataset.rhEditDate)}"]`,
        oldTable
      );
      original?.click();
    });

    const heads=qa('thead th',clone);
    const oldCells=qa('tbody tr:first-child [data-rh-edit-date]',clone);
    oldCells.forEach((cell,i)=>{
      const date=new Date(`${cell.dataset.rhEditDate}T12:00:00`);
      const th=heads[i+1];
      if(!th||Number.isNaN(date.getTime())) return;
      if(date.getDay()===6) th.classList.add('v226-sat');
      if(date.getDay()===0) th.classList.add('v226-sun');
    });

    const weekText=hiddenText('.rh-week-controls strong','Semaine en cours');
    const week=document.getElementById('rh-v226-week');
    if(week) week.textContent=weekText;
  }

  function syncData(){
    makeShell();

    const total=hiddenText('#stat-total-staff','0');
    const active=hiddenText('#stat-active-staff','0');
    const plannedText=hiddenText('#rh-cockpit-planned','0 h');
    const targetText=hiddenText('#rh-cockpit-target','0 h');
    const pctText=hiddenText('#rh-cockpit-percent','0 %');
    const reqText=hiddenText('#stat-pending-req','0');

    const planned=numFromText(plannedText);
    const target=numFromText(targetText);
    const pct=Math.max(0,Math.min(100,numFromText(pctText) || (target?planned/target*100:0)));
    const gap=planned-target;

    const set=(id,val)=>{
      const el=document.getElementById(id);
      const next=String(val);
      if(el && el.textContent!==next) el.textContent=next;
    };
    set('rh-v226-total',total);
    set('rh-v226-active-sub',`${active} actifs`);
    set('rh-v226-planned',plannedText);
    set('rh-v226-target',targetText);
    set('rh-v226-percent',`${Math.round(pct)} %`);
    set('rh-v226-requests',reqText);
    set('rh-v226-request-sub',Number(reqText)?`${reqText} décision${Number(reqText)>1?'s':''} à prendre`:'Aucune demande');

    const progress=document.getElementById('rh-v226-progress-bar');
    if(progress)progress.style.width=`${pct}%`;

    const todoRows=cloneRows('#rh-cockpit-todo','rh-v226-todo-list',5);
    const alertRows=cloneRows('#rh-cockpit-alerts','rh-v226-alert-list',4);
    const alertCount=alertRows.length;

    set('rh-v226-todo-count',String(todoRows.length));
    set('rh-v226-alerts',String(alertCount));
    set('rh-v226-alert-count2',String(alertCount));
    set('rh-v226-alert-sub',alertCount?`${alertCount} point${alertCount>1?'s':''} à vérifier`:'Aucune alerte prioritaire');

    const requestBadge=document.getElementById('rh-v226-request-badge');
    if(requestBadge){
      requestBadge.textContent=reqText;
      requestBadge.classList.toggle('show',Number(reqText)>0);
    }
    const bellBadge=document.getElementById('rh-v226-bell-badge');
    if(bellBadge){
      bellBadge.textContent=String(alertCount);
      bellBadge.classList.toggle('show',alertCount>0);
    }

    set('rh-v226-stat-planned',plannedText);
    set('rh-v226-stat-target',targetText);
    set('rh-v226-gap',`${gap>=0?'+':''}${gap.toFixed(1)} h`);
    set('rh-v226-rate',`${Math.round(pct)} %`);
    set('rh-v226-prod-rate',`${Math.round(pct)} %`);
    set('rh-v226-prod-planned',plannedText);
    set('rh-v226-prod-target',targetText);
    set('rh-v226-prod-gap',`${gap>=0?'+':''}${gap.toFixed(1)} h`);

    const donut=document.getElementById('rh-v226-donut');
    if(donut)donut.style.setProperty('--pct',`${pct*3.6}deg`);
    const donutText=q('#rh-v226-donut-text strong');
    if(donutText)donutText.textContent=plannedText;

    const oldVenue=q('.rh-cockpit-venue',oldMain);
    const vStrong=q('#rh-v226-venue strong');
    const vSmall=q('#rh-v226-venue small');
    if(oldVenue){
      if(vStrong)vStrong.textContent=q('strong',oldVenue)?.textContent?.trim()||'iCHEF Établissement';
      if(vSmall)vSmall.textContent=q('small',oldVenue)?.textContent?.trim()||'Établissement principal';
    }

    const oldOnline=q('.rh-cockpit-online',oldMain);
    const syncStrong=q('#rh-v226-sync strong');
    if(syncStrong && oldOnline)syncStrong.textContent=oldOnline.textContent?.trim()||'Synchronisé';

    const footerText=hiddenText('.rh-cockpit-footer','');
    const syncTime=q('#rh-v226-sync-time');
    if(syncTime){
      const m=footerText.match(/Dernière synchronisation\s*:?\s*([^|]+)/i);
      syncTime.textContent=m?`Dernière sync. ${m[1].trim()}`:'Dernière synchronisation';
    }

    syncPlanning();
  }

  function schedule(){
    if(frame)return;
    frame=requestAnimationFrame(()=>{
      frame=0;
      syncData();
    });
  }

  function wireActions(){
    const byNav={
      planning:()=>clickOriginal('planning'),
      equipe:()=>clickOriginal('équipe'),
      heures:()=>clickOriginal('heures'),
      demandes:()=>clickOriginal('demandes'),
      conges:()=>clickOriginal('congés'),
      contrats:()=>clickOriginal('contrats'),
      documents:()=>clickOriginal('documents'),
      assistant:()=>window.openPlanningAssistant?.(),
      ia:()=>clickOriginal('réglages ia'),
      legal:()=>window.openRhLegalCommandCenterV194?.(),
      etablissement:()=>window.openRhPlanningSettingsV103?.(),
      couleurs:()=>{
        const visible=document.querySelector('.rh-v202-categories-btn');
        if(visible){visible.click();return;}
        clickOriginal('planning');
        setTimeout(()=>document.querySelector('.rh-v202-categories-btn')?.click(),120);
      },
      utilisateurs:()=>{
        clickOriginal('équipe');
        setTimeout(()=>window.openStaffModal?.(),160);
      },
      dashboard:()=>{}
    };

    qa('[data-v226-nav]',document.getElementById('rh-v226-shell')).forEach(btn=>{
      btn.addEventListener('click',()=>byNav[btn.dataset.v226Nav]?.());
    });

    document.getElementById('rh-v226-plan-full')?.addEventListener('click',()=>clickOriginal('planning'));

    qa('[data-v226-tab]').forEach(btn=>{
      btn.addEventListener('click',()=>{
        const map={today:"aujourd",week:"semaine",month:"mois"};
        clickOriginalPlanningAction(null,map[btn.dataset.v226Tab]);
      });
    });

    q('[data-v226-action="analyse"]')?.addEventListener('click',()=>window.openPlanningAssistant?.());
    q('[data-v226-action="holidays"]')?.addEventListener('click',()=>{
      if(!clickOriginalPlanningAction(null,'féri')) window.openRhPlanningSettingsV103?.();
    });
    q('[data-v226-action="publish"]')?.addEventListener('click',()=>{
      if(!clickOriginalPlanningAction('.publish')) window.publishRhPlanningToStaff?.();
    });
    document.getElementById('rh-v226-todo-all')?.addEventListener('click',()=>clickOriginal('demandes'));

    const input=document.getElementById('rh-v226-search');
    const oldInput=q('.rh-cockpit-search input',oldMain);
    input?.addEventListener('input',()=>{
      if(oldInput){
        oldInput.value=input.value;
        oldInput.dispatchEvent(new Event('input',{bubbles:true}));
      }
    });
  }

  makeShell();

  if(oldMain){
    observer=new MutationObserver(mutations=>{
      const relevant=mutations.some(m=>
        m.type==='childList' &&
        (
          m.target?.closest?.('.rh-planning-panel,.rh-cockpit-bottom-grid,.rh-ops-overview') ||
          [...(m.addedNodes||[])].some(n=>
            n?.nodeType===1 &&
            (
              n.matches?.('table,tbody,tr,.rh-list-item') ||
              n.querySelector?.('table,tbody,tr,.rh-list-item')
            )
          )
        )
      );
      if(relevant)schedule();
    });
    observer.observe(oldMain,{childList:true,subtree:true});
  }

  if(oldSidebar){
    oldSidebar.dataset.v237ObserverDisabled='1';
  }

  window.addEventListener('ichef:planning-symbiosis',schedule);
  window.addEventListener('ichef:planning-categories-updated',schedule);
  window.addEventListener('ichef:planning-views-refreshed',schedule);
  window.addEventListener('focus',schedule);

  // Après chaque rendu historique, la nouvelle présentation se resynchronise.
  if(typeof window.renderRhCockpit==='function' && !window.renderRhCockpit.__v226){
    const original=window.renderRhCockpit;
    const wrapped=function(...args){
      const result=original.apply(this,args);
      schedule();
      return result;
    };
    wrapped.__v226=true;
    window.renderRhCockpit=wrapped;
  }

  schedule();
  setTimeout(schedule,120);
  setTimeout(schedule,500);

  window.ICHEF_RH_V226_DASHBOARD={refresh:schedule,version:'RH-V226-DASHBOARD-CIBLE'};
  window.__ICHEF_RH_BUILD__='RH-V226-DASHBOARD-CIBLE';
  console.info('[iCHEF RH V226] dashboard cible actif · ancien moteur conservé');
})();



;
/* RH V264 - preserved script #153 */

(() => {
  'use strict';
  if(window.__ICHEF_RH_V227_DASHBOARD_FIX__) return;
  window.__ICHEF_RH_V227_DASHBOARD_FIX__=true;

  let frame=0;
  let firstVisible=true;

  const q=(sel,root=document)=>root.querySelector(sel);
  const qa=(sel,root=document)=>[...root.querySelectorAll(sel)];

  function n(value){
    const m=String(value??'').replace(',','.').match(/-?\d+(?:\.\d+)?/);
    return m?Number(m[0]):0;
  }

  function categoryMeta(plan){
    try{
      const catalog=window.iChefPlanningCategoryCatalogV202?.()||[];
      const byId=id=>catalog.find(c=>String(c.id)===String(id))||null;

      if(plan?.categoryId && byId(plan.categoryId)) return byId(plan.categoryId);

      const status=String(plan?.status||'off');
      if((status==='present'||status==='off')&&(plan?.s1||plan?.s2)){
        if(plan.s1&&plan.s2){
          return catalog.find(c=>c.legalType==='present')||byId('present');
        }
        if(plan.s1){
          return catalog.find(c=>c.legalType==='off_soir')||byId('off_soir');
        }
        if(plan.s2){
          return catalog.find(c=>c.legalType==='off_matin')||byId('off_matin');
        }
      }

      return byId(status) || window.iChefPlanningMetaV202?.(plan) || null;
    }catch(_){
      return null;
    }
  }

  function getPlan(staffId,dateStr){
    try{
      const month=String(dateStr||'').slice(0,7);
      const day=Number(String(dateStr||'').slice(8,10));
      const ts=typeof getTs==='function'?getTs():{};
      return ts?.[month]?.[staffId]?.[day] ??
             ts?.[month]?.[String(staffId)]?.[day] ??
             null;
    }catch(_){
      return null;
    }
  }

  function cleanTime(value){
    return String(value||'')
      .replace(/\s+/g,'')
      .replace(/-/g,'–');
  }

  function shortLabel(plan,meta){
    if(plan?.__restaurantClosed===true || plan?.obs==='Établissement fermé') return 'FERMÉ';
    if(meta?.short) return String(meta.short).toUpperCase();
    if(meta?.label) return String(meta.label).toUpperCase().slice(0,9);

    const status=String(plan?.status||'off').toLowerCase();
    const fallbacks={
      present:'TRAV',
      off:'REPOS',
      conge:'CP',
      recup:'RÉCUP',
      maladie:'MAL',
      formation:'FORM.',
      ferie:'FÉRIÉ'
    };
    if(plan?.s1&&plan?.s2) return 'TRAV';
    if(plan?.s1) return 'MATIN';
    if(plan?.s2) return 'SOIR';
    return fallbacks[status]||status.toUpperCase().slice(0,9)||'REPOS';
  }

  function rewritePlanningCells(){
    const table=q('#rh-v226-plan-table-wrap table');
    if(!table) return;

    qa('[data-rh-edit-staff][data-rh-edit-date]',table).forEach(btn=>{
      const staffId=btn.dataset.rhEditStaff;
      const dateStr=btn.dataset.rhEditDate;
      const plan=getPlan(staffId,dateStr);
      const meta=categoryMeta(plan);
      const label=shortLabel(plan,meta);

      const s1=cleanTime(plan?.s1);
      const s2=cleanTime(plan?.s2);

      let timeHtml='';
      if(s1&&s2){
        timeHtml=`<span>${s1}</span><span>${s2}</span>`;
      }else if(s1||s2){
        timeHtml=`<span>${s1||s2}</span>`;
      }

      btn.dataset.v227Cell='1';
      btn.innerHTML=
        `<strong class="v227-cell-main">${label}</strong>` +
        (timeHtml?`<small class="v227-cell-time">${timeHtml}</small>`:'');

      // Color = same catalog as the rest of the system.
      const color=/^#[0-9a-f]{6}$/i.test(String(meta?.color||'')) ? String(meta.color) : '';
      if(color){
        btn.style.setProperty('background-color',color,'important');
      }

      // Force containment even if historical inline rules try to win.
      btn.style.setProperty('overflow','hidden','important');
      btn.style.setProperty('white-space','normal','important');
      btn.style.setProperty('max-width','100%','important');
      btn.style.setProperty('min-width','0','important');
    });
  }

  function pendingRequests(){
    try{
      const rows=typeof getReqs==='function'?getReqs():[];
      return (Array.isArray(rows)?rows:[]).filter(r=>{
        const s=String(r?.status||'pending').toLowerCase();
        return ![
          'approved','accepte','accepté','valide','validé',
          'rejected','refuse','refusé'
        ].includes(s);
      });
    }catch(_){
      return [];
    }
  }

  function syncKpis(){
    const set=(id,val)=>{
      const el=document.getElementById(id);
      if(el) el.textContent=String(val);
    };

    // Collaborators: "active" = enabled staff, not currently clocked-in.
    try{
      const dir=typeof getDir==='function'?getDir():[];
      const active=(Array.isArray(dir)?dir:[]).filter(s=>s?.active!==false);
      set('rh-v226-total',active.length);
      set('rh-v226-active-sub',`${active.length} actifs`);
    }catch(_){}

    // Requests: use the real request master, not a stale dashboard label.
    const pending=pendingRequests();
    set('rh-v226-requests',pending.length);
    set(
      'rh-v226-request-sub',
      pending.length
        ? `${pending.length} décision${pending.length>1?'s':''} à prendre`
        : 'Aucune demande'
    );

    const badge=document.getElementById('rh-v226-request-badge');
    if(badge){
      badge.textContent=String(pending.length);
      badge.classList.toggle('show',pending.length>0);
    }

    // Remove the unnecessary .0 on target when it is an integer.
    const target=document.getElementById('rh-v226-target');
    if(target){
      const val=n(target.textContent);
      if(Number.isFinite(val)){
        target.textContent=`${Number.isInteger(val)?val:val.toFixed(1)} h`;
      }
    }
  }

  function resetSidebar(){
    const sidebar=document.getElementById('rh-v226-sidebar');
    if(!sidebar) return;
    sidebar.classList.add('v227-reset-scroll');

    const hub=document.getElementById('director-hub');
    const visible=hub && getComputedStyle(hub).display!=='none';

    if(visible && (firstVisible || sidebar.scrollTop>0)){
      sidebar.scrollTop=0;
      firstVisible=false;
    }
  }

  function fixTopbar(){
    const input=document.getElementById('rh-v226-search');
    if(input){
      input.style.setProperty('border','0','important');
      input.style.setProperty('outline','0','important');
      input.style.setProperty('box-shadow','none','important');
    }
  }

  function refresh(){
    if(frame) return;
    frame=requestAnimationFrame(()=>{
      frame=0;
      fixTopbar();
      syncKpis();
      rewritePlanningCells();
      resetSidebar();

      const version=document.getElementById('rh-v226-version');
      if(version){
        version.textContent='V227 · Dashboard corrigé · fonctions et sécurité conservées';
      }
      const sideVersion=q('#rh-v226-side-bottom small');
      if(sideVersion) sideVersion.textContent='V227';
    });
  }

  // V226 rebuilds the visible planning from the hidden synchronized table.
  // Run after its refresh event and after DOM changes.
  const wrap=document.getElementById('rh-v226-plan-table-wrap');
  if(wrap){
    new MutationObserver(refresh).observe(wrap,{childList:true,subtree:true});
  }

  window.addEventListener('ichef:planning-symbiosis',refresh);
  window.addEventListener('ichef:planning-categories-updated',refresh);
  window.addEventListener('ichef:planning-views-refreshed',refresh);
  window.addEventListener('focus',refresh);

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',refresh,{once:true});
  }else{
    refresh();
  }
  setTimeout(refresh,120);
  setTimeout(refresh,550);

  window.ICHEF_RH_V227_DASHBOARD={
    refresh,
    rewritePlanningCells,
    version:'RH-V227-DASHBOARD-BUGFIX'
  };

  window.__ICHEF_RH_BUILD__='RH-V227-DASHBOARD-BUGFIX';
  console.info('[iCHEF RH V227] planning sans chevauchement + KPI cohérents + sidebar stabilisée');
})();

