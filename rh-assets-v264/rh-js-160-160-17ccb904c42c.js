
;
/* RH V264 - preserved script #160 */

(() => {
  'use strict';
  if(window.__ICHEF_RH_V245_DOSSIER__) return;
  window.__ICHEF_RH_V245_DOSSIER__=true;

  let currentStaffId='';
  let docsToken='';
  let docsTokenExpires=0;
  let openSequence=0;

  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));

  function getDirRows(){
    try{return typeof getDir==='function'?(getDir()||[]):[]}catch(_){return []}
  }

  function getStaff(id){
    return getDirRows().find(x=>String(x?.id)===String(id))||null;
  }

  function jsonGet(key,fallback={}){
    try{
      const value=JSON.parse(localStorage.getItem(key)||'null');
      return value&&typeof value==='object'?value:fallback;
    }catch(_){return fallback}
  }

  function payrollProfile(id){
    const rows=jsonGet('ichef_payroll_profiles_v2',{});
    return rows?.[id]||rows?.[String(id)]||{};
  }

  function managerPin(){
    try{
      return typeof getRhDirectionAuthPin==='function'
        ? String(getRhDirectionAuthPin()||'').trim()
        : '';
    }catch(_){return ''}
  }

  function currentDevice(){
    try{
      return String(
        window.RH_DEVICE_ID ||
        (typeof RH_DEVICE_ID!=='undefined'?RH_DEVICE_ID:'') ||
        localStorage.getItem('ichef_device_id') ||
        ''
      ).trim();
    }catch(_){
      return String(localStorage.getItem('ichef_device_id')||'').trim();
    }
  }

  function apiBase(){
    try{
      return String(
        window.SERVER_URL_JS ||
        (typeof SERVER_URL_JS!=='undefined'?SERVER_URL_JS:'')
      ).replace(/\/$/,'');
    }catch(_){return ''}
  }

  function value(...items){
    for(const item of items){
      if(item!==undefined && item!==null && String(item).trim()!==''){
        return String(item).trim();
      }
    }
    return '';
  }

  function dateLabel(v){
    if(!v)return '—';
    const d=new Date(v);
    return Number.isFinite(d.getTime())
      ? d.toLocaleDateString('fr-FR')
      : String(v);
  }

  function countryOf(dossier){
    return String(dossier?.country||'').toUpperCase()==='FR'?'FR':'CH';
  }

  function profileRows(staff,dossier){
    const p=dossier?.profile||payrollProfile(staff?.id);
    const country=countryOf(dossier);
    const contractType=value(staff?.contractType,p?.contractType);
    const birthRequired=/APPRENT|MINEUR/i.test(contractType);
    const endRequired=/CDD|SAISON|TEMP|EXTRA/i.test(contractType);

    const rows=[
      ['Identité',value(staff?.name),'identité',true],
      ['Poste / fonction',value(staff?.title,staff?.role,staff?.dept),'poste',true],
      ['Email Staff',value(staff?.email,staff?.mail,staff?.emailAddress),'email',false],
      ['WhatsApp / téléphone',value(staff?.whatsappPhone,staff?.phone,staff?.telephone),'whatsapp',false],
      ['Type de contrat',contractType,'type contrat',true],
      ['Heures contractuelles / semaine',Number(staff?.contract)>0?`${Number(staff.contract)} h`:'','heures contrat',true],
      ['Date d’entrée',dateLabel(value(staff?.startDate,p?.startDate)),'date entrée',true],
      ['Date de fin',dateLabel(value(staff?.endDate,p?.endDate)),'date fin',endRequired],
      ['Date de naissance',dateLabel(value(staff?.birthDate,p?.birthDate)),'date naissance',birthRequired]
    ];

    if(country==='FR'){
      rows.push([
        'Classification HCR',
        [value(p?.hcrLevel),value(p?.hcrEchelon)].filter(Boolean).join(' / '),
        'classification HCR',
        true
      ]);
    }else{
      rows.push([
        'Catégorie CCNT',
        value(p?.chLgavCategory),
        'catégorie CCNT',
        true
      ]);
    }

    const gross=Number(
      p?.grossSalary ??
      staff?.grossSalary ??
      staff?.monthlySalary ??
      0
    );
    rows.push([
      'Salaire brut mensuel',
      gross>0?String(gross):'',
      'salaire brut',
      false
    ]);

    return rows.map(([label,val,key,required])=>({
      label,
      value:val && val!=='—'?val:'',
      key,
      required:Boolean(required)
    }));
  }

  function renderProfile(staff,dossier){
    const target=document.getElementById('rh-v245-profile-grid');
    if(!target)return;

    const legalMissing=new Set(
      Array.isArray(dossier?.missing)
        ? dossier.missing.map(x=>String(x))
        : []
    );

    target.innerHTML=profileRows(staff,dossier).map(row=>{
      const missing=row.required && (
        !row.value ||
        legalMissing.has(row.key)
      );
      const state=missing
        ? ['missing','MANQUANT']
        : row.value
          ? ['ok','RENSEIGNÉ']
          : ['info','OPTIONNEL'];
      return `<div class="rh-v245-row">
        <label>${esc(row.label)}</label>
        <strong>${esc(row.value||'—')}</strong>
        <span class="rh-v245-state ${state[0]}">${state[1]}</span>
      </div>`;
    }).join('');
  }

  async function ensureDocsSession(force=false){
    if(
      !force &&
      docsToken &&
      Date.now()<docsTokenExpires-60000
    ){
      return docsToken;
    }

    const pin=managerPin();
    if(!/^\d{4,12}$/.test(pin)){
      const e=new Error(
        'Reconnectez-vous avec un PIN Direction / Manager pour vérifier les pièces du coffre RH.'
      );
      e.code='RH_DOCS_AUTH_REQUIRED';
      throw e;
    }

    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),12000);

    try{
      const r=await fetch(
        `${apiBase()}/api/rh/documents/session`,
        {
          method:'POST',
          credentials:'include',
          cache:'no-store',
          headers:{
            'Content-Type':'application/json',
            'Accept':'application/json',
            'X-iCHEF-Tenant':String(window.tenantID_JS||tenantID_JS||''),
            'X-iCHEF-Device':currentDevice()
          },
          body:JSON.stringify({
            tenantID:String(window.tenantID_JS||tenantID_JS||''),
            pin,
            deviceId:currentDevice()
          }),
          signal:controller.signal
        }
      );

      const data=await r.json().catch(()=>({}));
      if(!r.ok || !data?.accessToken){
        const e=new Error(data.error||'Autorisation du coffre RH refusée.');
        e.status=r.status;
        throw e;
      }

      docsToken=String(data.accessToken);
      docsTokenExpires=
        Date.now()+
        Math.max(
          60000,
          Number(data.expiresInSeconds||7200)*1000
        );

      return docsToken;
    }catch(e){
      if(e?.name==='AbortError'){
        throw new Error('Le coffre RH met trop de temps à répondre.');
      }
      throw e;
    }finally{
      clearTimeout(timer);
    }
  }

  async function fetchDocuments(staffId,retry=true){
    const token=await ensureDocsSession(false);
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),15000);

    try{
      const r=await fetch(
        `${apiBase()}/api/rh/documents/list?tenantID=${encodeURIComponent(String(window.tenantID_JS||tenantID_JS||''))}&staffId=${encodeURIComponent(String(staffId))}`,
        {
          method:'GET',
          credentials:'include',
          cache:'no-store',
          headers:{
            'Accept':'application/json',
            'X-iCHEF-Tenant':String(window.tenantID_JS||tenantID_JS||''),
            'X-iCHEF-Device':currentDevice(),
            'Authorization':`Bearer ${token}`
          },
          signal:controller.signal
        }
      );

      if(r.status===401 && retry){
        docsToken='';
        docsTokenExpires=0;
        await ensureDocsSession(true);
        return fetchDocuments(staffId,false);
      }

      if(r.status===503 && retry){
        await new Promise(resolve=>setTimeout(resolve,750));
        return fetchDocuments(staffId,false);
      }

      const data=await r.json().catch(()=>({}));
      if(!r.ok || data.success===false){
        const e=new Error(data.error||`Coffre RH indisponible (${r.status}).`);
        e.status=r.status;
        throw e;
      }

      return Array.isArray(data.documents)
        ? data.documents
        : [];
    }catch(e){
      if(e?.name==='AbortError'){
        throw new Error('Le coffre RH met trop de temps à répondre.');
      }
      throw e;
    }finally{
      clearTimeout(timer);
    }
  }

  function docCategoryLabel(v){
    return ({
      PAYSLIP:'Bulletin de salaire',
      SALARY_CERTIFICATE:'Certificat de salaire',
      TAX_DOCUMENT:'Document fiscal',
      WITHHOLDING_TAX:'Impôt / retenue fiscale',
      SOCIAL_STATEMENT:'Cotisations / social',
      PAYROLL_OTHER:'Autre document paie',
      CONTRACT:'Contrat / avenant',
      ATTESTATION:'Attestation de travail',
      CERTIFICATE:'Certificat / formation',
      OTHER:'Autre document'
    })[String(v||'OTHER').toUpperCase()]||'Document';
  }

  function docExpiry(doc){
    const raw=value(
      doc?.expiresAt,
      doc?.expiryDate,
      doc?.validUntil,
      doc?.expirationDate
    );
    if(!raw)return {label:'',expired:false};
    const d=new Date(raw);
    if(!Number.isFinite(d.getTime()))return {label:String(raw),expired:false};
    return {
      label:d.toLocaleDateString('fr-FR'),
      expired:d.getTime()<Date.now()
    };
  }

  function renderDocuments(docs,loadError=''){
    const list=document.getElementById('rh-v245-doc-list');
    const status=document.getElementById('rh-v245-doc-status');
    const state=document.getElementById('rh-v245-doc-state');
    const kpi=document.getElementById('rh-v245-kpi-docs');
    if(!list||!status||!state||!kpi)return;

    if(loadError){
      kpi.textContent='NON VÉRIFIÉ';
      state.className='rh-v245-state warn';
      state.textContent='À VÉRIFIER';
      status.textContent=loadError;
      list.innerHTML='';
      return;
    }

    kpi.textContent=String(docs.length);
    const categories=new Map();
    docs.forEach(doc=>{
      const c=String(doc?.category||'OTHER').toUpperCase();
      categories.set(c,(categories.get(c)||0)+1);
    });

    const hasContract=(categories.get('CONTRACT')||0)>0;
    state.className=`rh-v245-state ${hasContract?'ok':'warn'}`;
    state.textContent=hasContract?'COFFRE VÉRIFIÉ':'CONTRAT À VÉRIFIER';

    status.innerHTML=
      `${docs.length} pièce(s) enregistrée(s). `+
      (hasContract
        ? '<strong style="color:#8bd8b5">Contrat / avenant présent.</strong>'
        : '<strong style="color:#f6c85f">Aucun document classé CONTRAT / AVENANT dans le coffre.</strong>');

    if(!docs.length){
      list.innerHTML=
        '<div class="rh-v245-doc-status">Aucune pièce enregistrée dans le coffre RH de ce collaborateur.</div>';
      return;
    }

    list.innerHTML=docs.map(doc=>{
      const expiry=docExpiry(doc);
      const title=value(doc?.title,doc?.fileName,'Document RH');
      const meta=[
        docCategoryLabel(doc?.category),
        value(doc?.period),
        dateLabel(value(doc?.issuedAt,doc?.uploadedAt,doc?.createdAt)),
        doc?.proofId?`Preuve ${doc.proofId}`:''
      ].filter(Boolean).join(' · ');

      return `<div class="rh-v245-doc">
        <div class="rh-v245-doc-code">${esc(String(doc?.category||'DOC').toUpperCase())}</div>
        <div>
          <strong>${esc(title)}</strong>
          <small>${esc(meta)}</small>
          ${expiry.label?`<small>Expiration : ${esc(expiry.label)}</small>`:''}
        </div>
        <span class="rh-v245-state ${expiry.expired?'missing':'ok'}">${expiry.expired?'EXPIRÉ':'PRÉSENT'}</span>
      </div>`;
    }).join('');
  }

  function renderMissing(staff,dossier,docsState){
    const target=document.getElementById('rh-v245-missing-list');
    const badge=document.getElementById('rh-v245-critical-state');
    const kpi=document.getElementById('rh-v245-kpi-missing');
    if(!target||!badge||!kpi)return;

    const missing=Array.isArray(dossier?.missing)
      ? [...dossier.missing]
      : [];

    if(docsState?.verified && !docsState.hasContract){
      missing.push('pièce contrat / avenant');
    }

    const unique=[...new Set(missing.map(x=>String(x).trim()).filter(Boolean))];

    kpi.textContent=String(unique.length);
    badge.className=`rh-v245-state ${unique.length?'missing':'ok'}`;
    badge.textContent=unique.length?`${unique.length} À COMPLÉTER`:'DOSSIER À JOUR';

    target.innerHTML=unique.length
      ? unique.map(x=>`<span class="rh-v245-missing-chip">${esc(x)}</span>`).join('')
      : '<span class="rh-v245-missing-chip good">Aucun élément obligatoire manquant détecté dans les données actuellement suivies.</span>';
  }

  function setText(id,value){
    const el=document.getElementById(id);
    if(el)el.textContent=String(value??'');
  }

  async function refreshCurrent(){
    const seq=++openSequence;
    const staff=getStaff(currentStaffId);
    const dossier=
      typeof window.getRhLegalDossierV245==='function'
        ? window.getRhLegalDossierV245(currentStaffId)
        : null;

    if(!staff || !dossier){
      setText('rh-v245-subtitle','Collaborateur introuvable.');
      return;
    }

    setText('rh-v245-name',staff.name||'Collaborateur');
    setText(
      'rh-v245-subtitle',
      [
        staff.title||staff.role||staff.dept||'',
        `ID ${staff.id}`,
        dossier.country||''
      ].filter(Boolean).join(' · ')
    );

    setText(
      'rh-v245-kpi-state',
      dossier.complete?'COMPLET':'À COMPLÉTER'
    );
    setText(
      'rh-v245-kpi-framework',
      dossier.country==='FR'?'HCR':'CCNT'
    );

    renderProfile(staff,dossier);
    renderMissing(staff,dossier,{verified:false,hasContract:false});

    setText('rh-v245-kpi-docs','…');
    const state=document.getElementById('rh-v245-doc-state');
    if(state){
      state.className='rh-v245-state info';
      state.textContent='CHARGEMENT';
    }
    const status=document.getElementById('rh-v245-doc-status');
    if(status)status.textContent='Connexion au coffre documentaire sécurisé…';
    const list=document.getElementById('rh-v245-doc-list');
    if(list)list.innerHTML='';

    try{
      const docs=await fetchDocuments(staff.id,true);
      if(seq!==openSequence)return;

      const hasContract=docs.some(
        d=>String(d?.category||'').toUpperCase()==='CONTRACT'
      );

      renderDocuments(docs,'');
      renderMissing(staff,dossier,{
        verified:true,
        hasContract
      });
    }catch(error){
      if(seq!==openSequence)return;
      renderDocuments(
        [],
        error?.message||
        'Impossible de vérifier les pièces du coffre RH.'
      );
      // Ne jamais déclarer une pièce absente si le coffre n'a pas pu être interrogé.
      renderMissing(staff,dossier,{
        verified:false,
        hasContract:false
      });
    }
  }

  window.openRhStaffDossierV245=function(staffId){
    currentStaffId=String(staffId||'');
    const modal=document.getElementById('rh-v245-dossier-modal');
    if(!modal)return;

    modal.classList.add('show');
    modal.setAttribute('aria-hidden','false');
    refreshCurrent().catch(error=>{
      console.error('[iCHEF RH V245 dossier]',error);
    });
  };

  window.closeRhStaffDossierV245=function(){
    openSequence++;
    currentStaffId='';
    const modal=document.getElementById('rh-v245-dossier-modal');
    if(modal){
      modal.classList.remove('show');
      modal.setAttribute('aria-hidden','true');
    }
  };

  document.addEventListener('click',event=>{
    const open=event.target.closest('.rh-v245-dossier-open');
    if(open){
      event.preventDefault();
      const encoded=String(open.dataset.rhV245Staff||'');
      let staffId='';
      try{staffId=decodeURIComponent(encoded)}catch(_){staffId=encoded}
      window.openRhStaffDossierV245(staffId);
      return;
    }

    if(event.target.id==='rh-v245-close-btn'){
      window.closeRhStaffDossierV245();
      return;
    }

    if(event.target.id==='rh-v245-refresh-btn'){
      refreshCurrent().catch(()=>{});
      return;
    }

    if(event.target.id==='rh-v245-edit-btn'){
      const staff=getStaff(currentStaffId);
      if(!staff)return;
      window.closeRhStaffDossierV245();
      if(typeof window.openStaffModal==='function'){
        window.openStaffModal(staff.pin);
      }
      return;
    }

    if(event.target.id==='rh-v245-docs-btn'){
      const staff=getStaff(currentStaffId);
      if(!staff)return;
      window.closeRhStaffDossierV245();
      if(typeof window.openStaffDocumentsV103==='function'){
        window.openStaffDocumentsV103(staff.id);
      }else if(typeof window.openStaffModal==='function'){
        window.openStaffModal(staff.pin);
      }
    }
  },true);

  window.__ICHEF_RH_BUILD__='RH-V245-DOSSIER-COLLABORATEUR-CONNECTE-SECURE';
  console.info('[iCHEF RH V245] Dossier collaborateur connecté · données + pièces manquantes · coffre RH sécurisé');
})();

