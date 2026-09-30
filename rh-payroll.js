(function(){
    const PS_KEY='ichef_payroll_settings_v2';
    const PP_KEY='ichef_payroll_profiles_v2';
    const PV_KEY='ichef_payroll_variables_v2';
    const PL_KEY='ichef_payroll_locks_v2';
    const ENGINE_VERSION='2026.6-FR-HCR-CH-LGAV-LPP-FOOD-FAK-SWISSDEC-FAIL-CLOSED';
    let lastPayrollPreviewHtml='';
    function jget(key,fallback){try{return JSON.parse(localStorage.getItem(key)||'null')??fallback}catch(e){return fallback}}
    function jset(key,val){localStorage.setItem(key,JSON.stringify(val));}
    function monthNow(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`}
    function esc(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
    function money(v,currency){return new Intl.NumberFormat('fr-FR',{style:'currency',currency:currency||'CHF',minimumFractionDigits:2}).format(Number(v||0));}
    function num(v){v=Number(v);return Number.isFinite(v)?v:0;}
    function download(name,content,type='text/plain;charset=utf-8'){const b=new Blob([content],{type});const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1000)}
    function payrollSettings(){return {...{
        country:'CH',currency:'CHF',company:'',employeeRate:13,employerRate:15,overtimePremium:25,
        agreement:'',siret:'',dsnProvider:'',frRegime:'HCR',frRulesEffectiveDate:'2026-01-01',frPayrollEngine:'',frSocialMode:'standard2026',canton:'VD',avsFund:'',lppProvider:'',laaProvider:'',swissdecProvider:'',chRegime:'LGAV',chEstablishmentType:'STANDARD',chEstablishmentConfirmed:false,chUid:'',chLaaBuRate:0,chLaaNbuRate:0,chKtgProvider:'',chKtgTotalRate:0,chFakRate:0,chFakEmployeeMode:'auto',chFakEmployeeRate:0,chAvsAdminRate:0,chQstProvider:'',chSalaryCertificateProvider:'',swissdecVersion:'ELM 6.0',
        accountWages:'5000',accountCharges:'5700',accountPayable:'2000',engineVersion:ENGINE_VERSION
    },...jget(PS_KEY,{})}}
    function payrollProfiles(){return jget(PP_KEY,{})}
    function payrollVariables(){return jget(PV_KEY,{})}
    function payrollLocks(){return jget(PL_KEY,{})}
    function payrollStaff(){try{return typeof getDir==='function'?(getDir()||[]).filter(s=>s.active!==false):[]}catch(e){return []}}
    function staffById(id){return payrollStaff().find(s=>String(s.id)===String(id))}
    function profileFor(staff){const p=payrollProfiles()[staff.id]||{};return {...{mode:'hourly',payrollId:'',monthlySalary:0,hourlyRate:0,startDate:'',endDate:'',birthDate:'',contractType:'',annualBonusPct:0,note:'',workTimeScheme:'weekly',hcrLevel:'',hcrEchelon:'',monthlyIncludesStructuralOvertime:true,mealBenefitEnabled:false,mealsPerWorkedDay:0,frCadre:false,frAlsaceMoselle:false,frPssMonthlyOverride:0,frMutuelleStatus:'applicable',frMutuelleEmployeeMonthly:0,frMutuelleEmployerMonthly:0,frPrevoyanceEmployeeMonthly:0,frPrevoyanceEmployerMonthly:0,frPasSubject:true,frPasRate:0,frThirteenthSource:'none',frThirteenthMode:'annual',frThirteenthPct:100,frProtectionStatus:'none',frYoungNightAuthorization:false,frNightWorkerStatus:'auto',frNightCompensationTracked:false,frFamilyNightConflict:false,frApprenticeshipYear:'',chLgavCategory:'',chProtectionStatus:'none',chPostpartumConsent:false,chFamilyObligations:false,chAvsStatus:'standard',chIntroReduction:false,chIntroUntil:'',chIntroConfirmed:false,chIntroRule:'',chIntroWritten:false,chHourlyVacationMode:'accrual',chHourlyIrregular:false,chThirteenthMode:'annual',chOvertimeMode:'balance',chLppStatus:'',chLppCalcMode:'minimum_ccnt',chLppAnnualInsuredSalary:0,chLppEmployeeMonthly:0,chLppEmployerMonthly:0,chBoardDeductionMode:'official',chQstSubject:false,chQstTariff:'',chLgavContributionExempt:false},...p}}
    function varsFor(staffId,month){return {...{bonus:0,allowances:0,deductions:0,withholding:0,note:'',frPasOverride:0,frMutuelleExtra:0,frPrevoyanceExtra:0,frTaxableEmployerReintegration:0,frOvertimeTaxExempt:0,frAdvance:0,frGarnishment:0,frOtherNetDeduction:0,frThirteenthPayout:0,chTimesheetSigned:false,chOtBalanceCommunicated:false,chOtPaidOnTime:false,chThirteenthPayout:0,chLgavExecDeduction:0,chBreakfastCount:0,chLunchCount:0,chDinnerCount:0,chLodgingDays:0,chBoardCustomCharge:0},...(((payrollVariables()[month]||{})[staffId])||{})}}
    function actualHours(staff,month){try{if(typeof getActualHoursSummary==='function'){const a=getActualHoursSummary(staff.id,month);if(a&&Number.isFinite(Number(a.total)))return Number(a.total)}}catch(e){}
        try{const rs=JSON.parse(localStorage.getItem('ichef_rh_real_timesheets')||'{}');const sm=rs?.months?.[month]?.[staff.id]||rs?.months?.[month]?.[String(staff.id)];if(sm?.days)return Object.values(sm.days).reduce((s,d)=>s+num(d?.workedHours),0)}catch(e){}
        return 0;
    }
    function leaveCount(staff,month){try{const [y,m]=month.split('-').map(Number);const days=new Date(y,m,0).getDate();const md=(typeof getTs==='function'?getTs():{})?.[month]?.[staff.id]||{};if(typeof getStaffMonthStats==='function'){return num(getStaffMonthStats(staff.id,y,m,days,md)?.leaveDays)}}catch(e){}return 0}
    function monthTarget(staff){return num(staff.contract)*52/12}
    const FR_RULES_2026=Object.freeze({
        version:'FR-2026-09-HCR-IDCC1979-SOCIAL-PAS-V194',effectiveFrom:'2026-01-01',
        // V194 · barèmes datés : ne jamais réécrire rétroactivement une paie antérieure.
        smicHourly:12.31,minimumGuaranteed:4.35,
        smicTimeline:[{from:'2026-01',value:12.02},{from:'2026-06',value:12.31}],
        minimumGuaranteedTimeline:[{from:'2026-01',value:4.25},{from:'2026-06',value:4.35}],
        pssMonthly:4005,passAnnual:48060,
        employee:{
            oldAgeCapped:0.069,oldAgeUncapped:0.004,
            csgDeductible:0.068,csgNonDeductible:0.024,crds:0.005,csgAbatement:0.9825,csgAbatementLimitPss:4,
            agircT1:0.0315,agircT2:0.0864,cegT1:0.0086,cegT2:0.0108,cet:0.0014,apec:0.00024,
            alsaceMoselleHealth:0.013,overtimeReliefCap:0.1131
        },
        hcrMinima:{'I':{'1':12.00,'2':12.08,'3':12.18},'II':{'1':12.28,'2':12.55,'3':13.17},'III':{'1':13.32,'2':13.54,'3':14.00},'IV':{'1':14.40,'2':14.77,'3':15.40},'V':{'1':18.43,'2':21.78,'3':28.12}}
    });
    function frIsHcr(s){return String(s.frRegime||s.agreement||'').toUpperCase().includes('HCR')||String(s.agreement||'').includes('1979')}
    function frHcrMinimum(p){return num(FR_RULES_2026.hcrMinima?.[String(p.hcrLevel||'').toUpperCase()]?.[String(p.hcrEchelon||'')])}
    function frAgeForPayroll(p){if(!p?.birthDate)return null;const d=new Date(`${String(p.birthDate).slice(0,10)}T12:00:00`);if(Number.isNaN(d.getTime()))return null;const now=new Date();let a=now.getFullYear()-d.getFullYear();const md=now.getMonth()-d.getMonth();if(md<0||(md===0&&now.getDate()<d.getDate()))a--;return a}
    function frIsApprenticeProfile(p){return /APPRENT/i.test(String(p?.contractType||''))}
    function frApprenticePctHcr(p){const age=frAgeForPayroll(p),year=Number(p?.frApprenticeshipYear||0);if(!Number.isFinite(age)||![1,2,3].includes(year))return 0;if(age>=26)return 1;if(age>=21)return [0,.55,.70,.82][year];if(age>=18)return [0,.45,.55,.71][year];return [0,.35,.45,.59][year]}
    function frTimelineValueV194(timeline,month,fallback){const m=/^\d{4}-\d{2}$/.test(String(month||''))?String(month):'2026-09';let value=num(fallback);(timeline||[]).forEach(x=>{if(String(x.from||'')<=m)value=num(x.value)});return value}
    function frSmicForMonthV194(month){return frTimelineValueV194(FR_RULES_2026.smicTimeline,month,FR_RULES_2026.smicHourly)}
    function frMinimumGuaranteedForMonthV194(month){return frTimelineValueV194(FR_RULES_2026.minimumGuaranteedTimeline,month,FR_RULES_2026.minimumGuaranteed)}
    function frApprenticeMinimumHourlyHcr(p,month){const pct=frApprenticePctHcr(p),year=Number(p?.frApprenticeshipYear||0);if(!pct||![1,2,3].includes(year))return 0;const conv=num(FR_RULES_2026.hcrMinima?.I?.[String(year)]);return Math.max(frSmicForMonthV194(month)*pct,conv*pct)}
    function frRequiredMinimum(p,s,month){if(frIsHcr(s)&&frIsApprenticeProfile(p))return frApprenticeMinimumHourlyHcr(p,month);return Math.max(frSmicForMonthV194(month),frIsHcr(s)?frHcrMinimum(p):0)}
    function isoWeekKey(dateStr){const d=new Date(`${dateStr}T12:00:00`);if(Number.isNaN(d.getTime()))return null;const x=new Date(d);x.setDate(d.getDate()+3-((d.getDay()+6)%7));const w1=new Date(x.getFullYear(),0,4,12);const week=1+Math.round(((x-w1)/86400000-3+((w1.getDay()+6)%7))/7);return `${x.getFullYear()}-W${String(week).padStart(2,'0')}`}
    function realStore(){try{return typeof getRealTimesheets==='function'?getRealTimesheets():JSON.parse(localStorage.getItem('ichef_rh_timesheet_real')||'{"months":{}}')}catch(e){return {months:{}}}}
    function allDays(staffId){const out=[];Object.entries(realStore()?.months||{}).forEach(([m,node])=>{const sh=node?.staff?.[String(staffId)]||node?.staff?.[staffId];Object.entries(sh?.days||{}).forEach(([dk,d])=>out.push({date:String(d?.date||`${m}-${String(dk).padStart(2,'0')}`).slice(0,10),workedHours:num(d?.workedHours),anomalies:Array.isArray(d?.anomalies)?d.anomalies:[],month:m}))});return out}
    function frWeeks(staff,month){const map={};allDays(staff.id).forEach(d=>{const k=isoWeekKey(d.date);if(!k)return;(map[k]||(map[k]={week:k,hours:0,anomalies:0})).hours+=num(d.workedHours);map[k].anomalies+=d.anomalies.length});const [y,m]=month.split('-').map(Number),days=new Date(y,m,0).getDate(),keys=[],sample={};for(let day=1;day<=days;day++){const ds=`${month}-${String(day).padStart(2,'0')}`,k=isoWeekKey(ds);if(k&&!keys.includes(k)){keys.push(k);sample[k]=ds}}const store=realStore();return keys.map(k=>{const d=new Date(`${sample[k]}T12:00:00`),dow=(d.getDay()+6)%7,mon=new Date(d),sun=new Date(d);mon.setDate(d.getDate()-dow);sun.setDate(d.getDate()+(6-dow));const ym=x=>`${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}`,needsPrev=ym(mon)!==month,needsNext=ym(sun)!==month,prevOK=!needsPrev||Boolean(store?.months?.[ym(mon)]?.staff?.[String(staff.id)]),nextOK=!needsNext||Boolean(store?.months?.[ym(sun)]?.staff?.[String(staff.id)]);return {week:k,hours:Math.round(num(map[k]?.hours)*100)/100,anomalies:num(map[k]?.anomalies),boundaryComplete:prevOK&&nextOK}})}
    function premiumForHour(h){if(h<=39)return .10;if(h<=43)return .20;return .50}
    function weightedMonthlyUnits(cw){cw=Math.max(0,num(cw));let u=Math.min(cw,35)*52/12;if(cw>35)u+=(Math.min(cw,39)-35)*52/12*1.10;if(cw>39)u+=(Math.min(cw,43)-39)*52/12*1.20;if(cw>43)u+=(cw-43)*52/12*1.50;return u}
    function frExtra(staff,month,p){const cw=num(staff.contract),weeks=frWeeks(staff,month),part=cw>0&&cw<35;let overtime=0,complementary=0,premiumEq=0,extraBase=0;const blockers=[],detail=[];weeks.forEach(w=>{let hs=0,hc=0,prem=0,base=0;if(w.boundaryComplete===false)blockers.push(`${w.week} : semaine frontière incomplète ; charger/valider le mois voisin avant paie officielle.`);if(part){hc=Math.max(0,Math.min(w.hours,35)-cw);const t10=cw*.10,first=Math.min(hc,t10),rest=Math.max(0,hc-t10);premiumEq+=first*.10+rest*.25;complementary+=hc;if(p.mode==='monthly')extraBase+=hc;if(hc>cw/3+.01)blockers.push(`${w.week} : heures complémentaires au-delà de 1/3 du contrat.`);if(w.hours>=35-.01&&hc>0)blockers.push(`${w.week} : le temps partiel atteint 35 h ; contrôler avenant/qualification.`)}else{hs=Math.max(0,w.hours-35);overtime+=hs;if(p.mode==='hourly'){for(let x=35;x<w.hours;x+=1){const sl=Math.min(1,w.hours-x);prem+=sl*premiumForHour(x+sl)}premiumEq+=prem}else{for(let x=Math.max(35,cw);x<w.hours;x+=1){const sl=Math.min(1,w.hours-x);base+=sl;prem+=sl*premiumForHour(x+sl)}extraBase+=base;premiumEq+=prem}}detail.push({week:w.week,hours:w.hours,overtime:hs,complementary:hc,premiumEquivalentHours:prem,extraBaseHours:base})});return {weeks:detail,overtime,complementary,premiumEq,extraBase,blockers:[...new Set(blockers)]}}
    function frEmploymentDays30(p,month){const [y,m]=month.split('-').map(Number);const ms=new Date(y,m-1,1,12),me=new Date(y,m,0,12);const start=p.startDate?new Date(p.startDate+'T12:00:00'):ms,end=p.endDate?new Date(p.endDate+'T12:00:00'):me;if(end<ms||start>me)return 0;const st=start>ms?Math.min(30,start.getDate()):1,en=end<me?Math.min(30,end.getDate()):30;return Math.max(0,en-st+1)}
    function frMonthlyPss(staff,p,month){if(num(p.frPssMonthlyOverride)>0)return num(p.frPssMonthlyOverride);const days=frEmploymentDays30(p,month)||30;let factor=days/30;const cw=num(staff.contract);if(cw>0&&cw<35)factor*=cw/35;return Math.max(0,FR_RULES_2026.pssMonthly*Math.min(1,factor))}
    function frSocialDeductions(staff,month,p,v,gross,overtimePay){
        const r=FR_RULES_2026.employee,pss=frMonthlyPss(staff,p,month),t1=Math.min(Math.max(0,gross),pss),t2=Math.min(Math.max(0,gross-pss),Math.max(0,7*pss));
        const oldAgeCapped=t1*r.oldAgeCapped,oldAgeUncapped=gross*r.oldAgeUncapped;
        const agircT1=t1*r.agircT1,agircT2=t2*r.agircT2,cegT1=t1*r.cegT1,cegT2=t2*r.cegT2,cet=gross>pss?Math.min(gross,8*pss)*r.cet:0;
        const apec=p.frCadre===true?Math.min(gross,4*pss)*r.apec:0;
        const alsaceMoselle=p.frAlsaceMoselle===true?gross*r.alsaceMoselleHealth:0;
        const employerHealth=Math.max(0,num(p.frMutuelleEmployerMonthly)),employerPrev=Math.max(0,num(p.frPrevoyanceEmployerMonthly));
        const abated=Math.min(gross,4*pss)*r.csgAbatement+Math.max(0,gross-4*pss),csgBase=Math.max(0,abated+employerHealth+employerPrev);
        const csgDeductible=csgBase*r.csgDeductible,csgNonDeductible=csgBase*r.csgNonDeductible,crds=csgBase*r.crds;
        const mutuelleEmployee=Math.max(0,num(p.frMutuelleEmployeeMonthly)+num(v.frMutuelleExtra)),prevoyanceEmployee=Math.max(0,num(p.frPrevoyanceEmployeeMonthly)+num(v.frPrevoyanceExtra));
        const retirementBeforeRelief=oldAgeCapped+oldAgeUncapped+agircT1+agircT2+cegT1+cegT2+cet;
        const overtimeRelief=Math.min(Math.max(0,num(overtimePay))*r.overtimeReliefCap,retirementBeforeRelief);
        const deductibleSocial=Math.max(0,retirementBeforeRelief-overtimeRelief)+apec+alsaceMoselle+csgDeductible+mutuelleEmployee+prevoyanceEmployee;
        const nonDeductibleSocial=csgNonDeductible+crds;
        const employeeSocial=Math.max(0,deductibleSocial+nonDeductibleSocial);
        return {pss,t1,t2,csgBase,oldAgeCapped,oldAgeUncapped,agircT1,agircT2,cegT1,cegT2,cet,apec,alsaceMoselle,csgDeductible,csgNonDeductible,crds,mutuelleEmployee,mutuelleEmployer:employerHealth,prevoyanceEmployee,prevoyanceEmployer:employerPrev,overtimeRelief,deductibleSocial,nonDeductibleSocial,employeeSocial};
    }
    function calcPayrollFrance(staff,month){
        const s=payrollSettings(),p=profileFor(staff),v=varsFor(staff.id,month),hours=actualHours(staff,month),target=monthTarget(staff),cw=num(staff.contract),ex=frExtra(staff,month,p),reqMin=frRequiredMinimum(p,s,month),units=weightedMonthlyUnits(cw);
        let rate=num(p.hourlyRate),base=0;if(p.mode==='monthly'){if(!rate&&num(p.monthlySalary)>0)rate=p.monthlyIncludesStructuralOvertime!==false&&units>0?num(p.monthlySalary)/units:num(p.monthlySalary)/(Math.min(cw||35,35)*52/12||151.6667);base=num(p.monthlySalary)||(rate>0?rate*units:0)}else base=hours*rate;
        let overtimePay=p.mode==='hourly'?ex.premiumEq*rate:(ex.extraBase+ex.premiumEq)*rate;if(p.mode==='monthly'&&p.monthlyIncludesStructuralOvertime===false&&cw>35)overtimePay+=Math.max(0,weightedMonthlyUnits(cw)-cw*52/12)*rate;
        const fr13Source=String(p.frThirteenthSource||'none'),fr13Enabled=fr13Source!=='none',fr13Pct=Math.max(0,num(p.frThirteenthPct||100));
        let annualBonus=0;
        if(p.mode==='monthly'&&fr13Enabled){
            annualBonus=(p.frThirteenthMode||'annual')==='monthly'
                ? base*(fr13Pct/100)/12
                : Math.max(0,num(v.frThirteenthPayout));
        }else if(p.mode==='monthly'&&num(p.annualBonusPct)>0){
            annualBonus=base*(num(p.annualBonusPct)/100)/12;
        }
        const workedDays=allDays(staff.id).filter(d=>d.date.startsWith(month+'-')&&d.workedHours>0).length,meal=(p.mealBenefitEnabled===true?workedDays*Math.max(0,Math.min(2,num(p.mealsPerWorkedDay)))*frMinimumGuaranteedForMonthV194(month):0);
        const gross=Math.max(0,base+overtimePay+annualBonus+meal+num(v.bonus)+num(v.allowances)-num(v.deductions));
        const contributions=frSocialDeductions(staff,month,p,v,gross,overtimePay);
        const taxableEmployerReintegration=Math.max(0,contributions.mutuelleEmployer+num(v.frTaxableEmployerReintegration));
        const overtimeTaxExempt=Math.max(0,num(v.frOvertimeTaxExempt));
        const netTaxable=Math.max(0,gross-contributions.deductibleSocial+taxableEmployerReintegration-overtimeTaxExempt);
        const pasRate=p.frPasSubject===true?Math.max(0,num(p.frPasRate)):0;
        const pasOverride=Math.max(0,num(v.frPasOverride));
        const sourceTax=p.frPasSubject===true?(pasOverride>0?pasOverride:netTaxable*pasRate/100):0;
        const advance=Math.max(0,num(v.frAdvance)),garnishment=Math.max(0,num(v.frGarnishment)),otherNetDeduction=Math.max(0,num(v.frOtherNetDeduction));
        const netBeforeTax=Math.max(0,gross-contributions.employeeSocial-meal);
        const employeeDeductions=contributions.employeeSocial+meal+sourceTax+advance+garnishment+otherNetDeduction;
        const net=Math.max(0,gross-employeeDeductions);
        const employerCharges=gross*num(s.employerRate)/100,employerCost=gross+employerCharges,anomalies=[],blockers=[...ex.blockers];
        if(!p.payrollId)blockers.push('Matricule paie manquant.');if(!rate)blockers.push('Taux horaire de référence impossible à déterminer.');if(frIsHcr(s)&&!frIsApprenticeProfile(p)&&(!p.hcrLevel||!p.hcrEchelon))blockers.push('Classification HCR niveau/échelon manquante.');if(frIsHcr(s)&&frIsApprenticeProfile(p)&&(!p.birthDate||![1,2,3].includes(Number(p.frApprenticeshipYear))))blockers.push('Apprentissage HCR : date de naissance et année du contrat obligatoires.');if(rate&&reqMin>0&&rate+1e-6<reqMin)blockers.push(`Taux horaire ${rate.toFixed(2)} € inférieur au minimum applicable ${reqMin.toFixed(2)} €.`);if(String(p.workTimeScheme||'weekly')!=='weekly')blockers.push('Annualisation/modulation : période de référence spécifique requise avant calcul officiel.');if(/PROFESSIONNALIS/i.test(String(p.contractType||'')))blockers.push('Contrat de professionnalisation : barème spécifique à valider avec le moteur réglementaire connecté.');if(!/^\d{14}$/.test(String(s.siret||'').replace(/\s/g,'')))blockers.push('SIRET valide manquant.');if(!s.agreement)blockers.push('Convention/régime non configuré.');
        if(String(s.frSocialMode||'standard2026')==='external'&&!s.frPayrollEngine)blockers.push('Référentiel cotisations externe sélectionné mais moteur paie France non configuré.');
        if(p.frMutuelleStatus==='applicable'&&num(p.frMutuelleEmployeeMonthly)<=0&&num(p.frMutuelleEmployerMonthly)<=0)blockers.push('Mutuelle obligatoire : parts salarié/employeur non renseignées ou dispense à documenter.');
        if(p.frPasSubject===true&&pasRate<=0&&pasOverride<=0)blockers.push('Prélèvement à la source : taux DGFiP ou montant de régularisation manquant.');
        if(fr13Enabled&&fr13Pct<=0)blockers.push('13e mois / prime annuelle France : pourcentage annuel manquant ou nul.');
        if(fr13Enabled&&p.mode!=='monthly')anomalies.push('13e mois / prime annuelle configuré sur un profil payé à l’heure : vérifier la base de calcul prévue par le contrat/accord/usage.');
        if(!fr13Enabled&&num(p.annualBonusPct)>0)anomalies.push('Ancienne prime annuelle détectée : migrer le profil vers le nouveau suivi France du 13e mois.');
        if(p.frCadre===true&&contributions.apec<=0)blockers.push('Cadre : cotisation APEC attendue, contrôler le plafond et le profil.');
        if(cw>0&&cw<35&&num(p.frPssMonthlyOverride)<=0)anomalies.push('PSS proratisé automatiquement pour temps partiel : à valider avec le moteur paie/DSN si situation particulière.');
        if(ex.overtime+ex.complementary>0&&overtimeTaxExempt<=0)anomalies.push('HS/HC détectées : vérifier le cumul annuel de l’exonération d’impôt (plafond fiscal) et renseigner le net fiscal exonéré validé.');
        if(garnishment>0)anomalies.push('Saisie sur salaire : montant saisi manuellement ; le barème légal de saisissabilité doit être calculé/validé hors de ce moteur.');
        blockers.push('Charges patronales France : encore estimatives tant que le moteur réglementaire exact (URSSAF/DSN) n’est pas techniquement connecté.');if(!s.dsnProvider)blockers.push('Connecteur DSN non configuré.');if(hours===0)anomalies.push('Aucune heure pointée.');if(target>0&&hours>target*1.35)anomalies.push('Volume d’heures très supérieur au contrat.');
        return {staff,settings:s,profile:p,variables:v,hours,target,overtime:ex.overtime+ex.complementary,rate,base,overtimePay,annualBonus,gross,employeeDeductions,netBeforeTax,netTaxable,sourceTax,net,employerCharges,employerCost,leaveDays:leaveCount(staff,month),configured:rate>0||base>0,anomalies,regulatoryBlockers:[...new Set(blockers)],regulatoryReady:false,fr:{rules:FR_RULES_2026,requiredMinimum:reqMin,weekly:ex.weeks,mealBenefit:meal,workedDays,contributions,taxableEmployerReintegration,overtimeTaxExempt,sourceTax,pasRate,advance,garnishment,otherNetDeduction,thirteenthSource:fr13Source,thirteenthMode:p.frThirteenthMode||'annual',thirteenthPct:fr13Pct,thirteenthPaid:annualBonus}};
    }
    const CH_RULES_2026=Object.freeze({
        version:'CH-2026-09-LGAV-AVS-LPP-LAA-ELM6',effectiveFrom:'2026-01-01',swissdec:'ELM 6.0 · base de certification 06.03.2026',
        avsAiApgEmployee:0.053,avsAiApgEmployer:0.053,acEmployee:0.011,acEmployer:0.011,acAnnualCap:148200,laaAnnualCap:148200,
        lppEntryThreshold:22680,lppCoordinationDeduction:26460,lppMaxInsuredSalary:90720,lppMinCoordinatedSalary:3780,lppMaxCoordinatedSalary:64260,
        naturalBenefits:{breakfast:3.50,lunch:10.00,dinner:8.00,lodging:11.50,fullBoardDaily:21.50,fullBoardMonthly:645,lodgingMonthly:345,fullBoardLodgingDaily:33.00,fullBoardLodgingMonthly:990},
        fakEmployeeAuto:{VS:0.0013},
        lgav:{weeklyHours:{STANDARD:42,SEASONAL:43.5,SMALL:45},vacationPct:0.1065,holidayPct:0.0227,thirteenthPct:0.0833,holidaysPerYear:6,vacationWeeks:5,executionFull:99,executionHalf:49.50,
            monthlyMin:{IA:3713,IB:3943,II:4070,IIIA:4528,IIIB:4635,IV:5293},
            hourlyBase:{STANDARD:{IA:20.40,IB:21.66,II:22.36,IIIA:24.88,IIIB:25.47,IV:29.08},SEASONAL:{IA:19.65,IB:20.86,II:21.53,IIIA:23.96,IIIB:24.52,IV:28.01},SMALL:{IA:19.04,IB:20.22,II:20.87,IIIA:23.22,IIIB:23.77,IV:27.14}}
        }
    });
    function chIsLgav(s){return String(s.chRegime||'').toUpperCase()==='LGAV'||/CCNT|L-?GAV|H[ÔO]TELS?.*RESTAUR|RESTAUR.*CAF/i.test(String(s.agreement||''))}
    function chEstType(s){return ['STANDARD','SEASONAL','SMALL'].includes(String(s.chEstablishmentType||''))?String(s.chEstablishmentType):'STANDARD'}
    function chWeeklyLimit(s){return CH_RULES_2026.lgav.weeklyHours[chEstType(s)]||42}
    function chLgavMinMonthly(p,s,month){let v=num(CH_RULES_2026.lgav.monthlyMin[String(p.chLgavCategory||'').toUpperCase()]);if(!v)return 0;if(p.chIntroReduction===true){const eligible=['IA','IB','II','IIIA'].includes(String(p.chLgavCategory||'').toUpperCase());const until=String(p.chIntroUntil||'');const monthEnd=`${month}-${String(new Date(Number(month.slice(0,4)),Number(month.slice(5,7)),0).getDate()).padStart(2,'0')}`;if(eligible&&p.chIntroConfirmed===true&&until&&until>=`${month}-01`)v*=.92;}return v}
    function chLgavMinHourlyBase(p,s,month){const t=chEstType(s),cat=String(p.chLgavCategory||'').toUpperCase();let v=num(CH_RULES_2026.lgav.hourlyBase?.[t]?.[cat]);if(!v)return 0;if(p.chIntroReduction===true&&['IA','IB','II','IIIA'].includes(cat)&&p.chIntroConfirmed===true&&String(p.chIntroUntil||'')>=`${month}-01`)v*=.92;return v}
    function chWeeks(staff,month){return frWeeks(staff,month).map(w=>({...w,target:Math.max(0,num(staff.contract))}))}
    function chConsecutiveWorkDays(staff,month){const days=allDays(staff.id).filter(d=>d.date.startsWith(month+'-')&&d.workedHours>0).sort((a,b)=>a.date.localeCompare(b.date));let max=0,cur=0,prev=null,maxHours=0;for(const d of days){const dt=new Date(d.date+'T12:00:00');if(prev&&((dt-prev)/86400000===1))cur++;else cur=1;prev=dt;max=Math.max(max,cur);maxHours=Math.max(maxHours,num(d.workedHours));}return {maxConsecutive:max,maxDailyHours:maxHours}}
    function chEmploymentDays30(p,month){const [y,m]=month.split('-').map(Number);const start=p.startDate?new Date(p.startDate+'T12:00:00'):new Date(y,m-1,1,12);const end=p.endDate?new Date(p.endDate+'T12:00:00'):new Date(y,m,0,12);const ms=new Date(y,m-1,1,12),me=new Date(y,m,0,12);if(end<ms||start>me)return 0;const st=start>ms?Math.min(30,start.getDate()):1;const en=end<me?Math.min(30,end.getDate()):30;return Math.max(0,en-st+1)}
    function chMonthlyInsuranceCap(p,month,annualCap){const days=chEmploymentDays30(p,month);return annualCap/360*days}
    function chOvertime(staff,month,p,s){const target=Math.max(0,num(staff.contract)),maxLegal=chWeeklyLimit(s),weeks=chWeeks(staff,month),detail=[],blockers=[];let overtime=0,over50=0;weeks.forEach(w=>{const ot=Math.max(0,w.hours-target),o50=Math.max(0,w.hours-50);overtime+=ot;over50+=o50;if(w.boundaryComplete===false)blockers.push(`${w.week} : semaine frontière incomplète ; valider le mois voisin avant décompte officiel.`);if(w.hours>50+.01)blockers.push(`${w.week} : ${w.hours.toFixed(2)} h dépassent 50 h ; travail supplémentaire soumis au traitement impératif de la LTr.`);detail.push({week:w.week,hours:w.hours,target,overtime:ot,workBeyond50:o50})});if(target>maxLegal+.01)blockers.push(`Contrat ${target.toFixed(2)} h supérieur à la durée CCNT ${maxLegal.toFixed(1)} h pour ce type d’établissement.`);return {weeks:detail,overtime,over50,blockers:[...new Set(blockers)]}}
    function chFakEmployeeRate(s){
        if(String(s.chFakEmployeeMode||'auto')==='manual') return Math.max(0,num(s.chFakEmployeeRate))/100;
        return num(CH_RULES_2026.fakEmployeeAuto?.[String(s.canton||'').toUpperCase()]||0);
    }
    function chLppAgeRule(p,month){
        const year=Number(String(month||'').slice(0,4));
        if(!p.birthDate||!year)return {known:false,totalPct:0,label:'Date de naissance manquante'};
        const birthYear=Number(String(p.birthDate).slice(0,4));
        if(!birthYear)return {known:false,totalPct:0,label:'Date de naissance invalide'};
        if(year>=birthYear+25)return {known:true,totalPct:0.14,label:'CCNT dès le 1er janvier suivant 24 ans · 14 % total minimum'};
        if(year>=birthYear+18)return {known:true,totalPct:0.01,label:'CCNT dès le 1er janvier suivant 17 ans · 1 % total minimum'};
        return {known:true,totalPct:0,label:'Pas encore dans la classe d’âge CCNT LPP obligatoire'};
    }
    function chProjectedAnnualLppSalary(p,staff,s,base,rate,isLgav){
        const explicit=Math.max(0,num(p.chLppAnnualInsuredSalary));
        if(explicit>0)return {annual:explicit,source:'PLAN'};
        let annual=0;
        if(p.mode==='monthly') annual=Math.max(0,num(base))*12*(isLgav?1+CH_RULES_2026.lgav.thirteenthPct:1);
        else {
            const annualBase=Math.max(0,num(rate))*Math.max(0,num(staff.contract))*52;
            annual=isLgav?annualBase*(1+CH_RULES_2026.lgav.vacationPct+CH_RULES_2026.lgav.holidayPct)*(1+CH_RULES_2026.lgav.thirteenthPct):annualBase;
        }
        return {annual,source:'ICHEF_PROJECTION'};
    }
    function chLppMinimumCalc(p,staff,s,month,base,rate,isLgav){
        const projected=chProjectedAnnualLppSalary(p,staff,s,base,rate,isLgav);
        const ageRule=chLppAgeRule(p,month);
        const annual=Math.max(0,projected.annual);
        const insured=Math.min(annual,CH_RULES_2026.lppMaxInsuredSalary);
        const mandatory=annual>=CH_RULES_2026.lppEntryThreshold && ageRule.totalPct>0;
        const coordinated=mandatory?Math.min(CH_RULES_2026.lppMaxCoordinatedSalary,Math.max(CH_RULES_2026.lppMinCoordinatedSalary,insured-CH_RULES_2026.lppCoordinationDeduction)):0;
        const totalAnnual=coordinated*ageRule.totalPct;
        return {annualSalary:annual,source:projected.source,insuredSalary:insured,coordinatedSalary:coordinated,mandatory,ageRule,totalPct:ageRule.totalPct,totalAnnual,employeeMonthly:totalAnnual/24,employerMonthly:totalAnnual/24};
    }
    function chBoardCalc(p,v){
        const r=CH_RULES_2026.naturalBenefits;
        const breakfast=Math.max(0,Math.floor(num(v.chBreakfastCount)))*r.breakfast;
        const lunch=Math.max(0,Math.floor(num(v.chLunchCount)))*r.lunch;
        const dinner=Math.max(0,Math.floor(num(v.chDinnerCount)))*r.dinner;
        const lodging=Math.max(0,Math.floor(num(v.chLodgingDays)))*r.lodging;
        const officialValue=breakfast+lunch+dinner+lodging;
        const mode=String(p.chBoardDeductionMode||'official');
        let employeeCashCharge=0;
        if(mode==='official') employeeCashCharge=officialValue;
        else if(mode==='custom') employeeCashCharge=Math.max(0,num(v.chBoardCustomCharge));
        const avsAddBack=Math.max(0,officialValue-employeeCashCharge);
        return {mode,breakfast,lunch,dinner,lodging,officialValue,employeeCashCharge,avsAddBack};
    }
    function calcPayrollSwitzerland(staff,month){
        const s=payrollSettings(),p=profileFor(staff),v=varsFor(staff.id,month),hours=actualHours(staff,month),target=monthTarget(staff),isLgav=chIsLgav(s),ot=chOvertime(staff,month,p,s),anomalies=[],blockers=[...ot.blockers];
        let rate=num(p.hourlyRate),base=0,vacationPay=0,vacationAccrued=0,holidayPay=0,thirteenthPaid=0,thirteenthAccrued=0,overtimePay=0;
        const minMonthly=isLgav?chLgavMinMonthly(p,s,month):0,minHourly=isLgav?chLgavMinHourlyBase(p,s,month):0;
        const monthlyHours=Math.max(1,num(staff.contract)*52/12);
        if(p.mode==='monthly'){
            base=num(p.monthlySalary);if(!rate&&base>0)rate=base/monthlyHours;
            thirteenthAccrued=base*CH_RULES_2026.lgav.thirteenthPct;
            if(isLgav&&p.chThirteenthMode==='monthly')thirteenthPaid=thirteenthAccrued;
            else if(isLgav&&p.chThirteenthMode==='annual')thirteenthPaid=Math.max(0,num(v.chThirteenthPayout));
            if(p.chOvertimeMode==='paid100')overtimePay=ot.overtime*rate;
            else if(p.chOvertimeMode==='paid125')overtimePay=ot.overtime*rate*1.25;
        }else{
            base=hours*rate;
            if(isLgav){
                vacationAccrued=base*CH_RULES_2026.lgav.vacationPct;
                if(p.chHourlyVacationMode==='percentage'){
                    if(p.chHourlyIrregular===true) vacationPay=vacationAccrued;
                    else blockers.push('Vacances au salaire horaire : l’indemnité de 10,65 % ne peut pas être versée automatiquement sans situation irrégulière/courte documentée et mention séparée au contrat/décompte.');
                }
                holidayPay=base*CH_RULES_2026.lgav.holidayPct;
                thirteenthAccrued=(base+vacationPay+holidayPay)*CH_RULES_2026.lgav.thirteenthPct;
                if(p.chThirteenthMode==='monthly') thirteenthPaid=thirteenthAccrued;
                else thirteenthPaid=Math.max(0,num(v.chThirteenthPayout));
            }
            if(p.chOvertimeMode==='paid125')overtimePay=ot.overtime*rate*.25;
        }
        const gross=Math.max(0,base+vacationPay+holidayPay+thirteenthPaid+overtimePay+num(v.bonus)+num(v.allowances)-num(v.deductions));
        const board=chBoardCalc(p,v);
        const socialBase=gross+board.avsAddBack;
        const acCap=chMonthlyInsuranceCap(p,month,CH_RULES_2026.acAnnualCap),laaCap=chMonthlyInsuranceCap(p,month,CH_RULES_2026.laaAnnualCap);
        let avsBase=socialBase,acBase=Math.min(socialBase,acCap||socialBase);
        const avsStatus=String(p.chAvsStatus||'standard');
        if(avsStatus==='not_yet_liable'){
            avsBase=0;acBase=0;
        }else if(avsStatus==='reference_franchise'){
            avsBase=Math.max(0,socialBase-1400);
            acBase=0;
        }else if(avsStatus==='reference_no_franchise'){
            avsBase=socialBase;acBase=0;
        }else if(avsStatus==='special'){
            avsBase=0;acBase=0;
            blockers.push('Assujettissement AVS/AC spécial ou détachement : calcul automatique bloqué jusqu’à validation du certificat/accord international et paramétrage expert.');
        }
        const laaBase=Math.min(socialBase,laaCap||socialBase);
        const avsEmployee=avsBase*CH_RULES_2026.avsAiApgEmployee,avsEmployer=avsBase*CH_RULES_2026.avsAiApgEmployer,acEmployee=acBase*CH_RULES_2026.acEmployee,acEmployer=acBase*CH_RULES_2026.acEmployer;
        const laaNbuEmployee=num(staff.contract)>=8?laaBase*num(s.chLaaNbuRate)/100:0,laaBuEmployer=laaBase*num(s.chLaaBuRate)/100;
        const ktgEmployee=isLgav?socialBase*num(s.chKtgTotalRate)/200:0,ktgEmployer=isLgav?socialBase*num(s.chKtgTotalRate)/200:0;
        const lppCalc=chLppMinimumCalc(p,staff,s,month,base,rate,isLgav);
        let lppEmployee=0,lppEmployer=0;
        if(p.chLppStatus==='applicable'){
            if(String(p.chLppCalcMode||'minimum_ccnt')==='plan'){
                lppEmployee=num(p.chLppEmployeeMonthly);lppEmployer=num(p.chLppEmployerMonthly);
            }else{
                lppEmployee=lppCalc.employeeMonthly;lppEmployer=lppCalc.employerMonthly;
            }
        }
        const fakEmployeeRate=chFakEmployeeRate(s),fakEmployee=socialBase*fakEmployeeRate,fakEmployer=socialBase*num(s.chFakRate)/100;
        const avsAdminEmployer=(avsEmployee+avsEmployer)*num(s.chAvsAdminRate)/100;
        const sourceTax=p.chQstSubject===true?Math.max(0,num(v.withholding)):0;
        const lgavContribution=isLgav&&p.chLgavContributionExempt!==true?(num(staff.contract)>=chWeeklyLimit(s)*.5?CH_RULES_2026.lgav.executionFull:CH_RULES_2026.lgav.executionHalf):0;
        const lgavExecEmployeeDeduction=Math.max(0,num(v.chLgavExecDeduction));
        if(lgavExecEmployeeDeduction>lgavContribution+.01&&lgavContribution>0)blockers.push(`Contribution CCNT prélevée CHF ${lgavExecEmployeeDeduction.toFixed(2)} supérieure au montant annuel attendu CHF ${lgavContribution.toFixed(2)} ; contrôler quittance/emploi antérieur.`);
        const employeeDeductionsSocial=avsEmployee+acEmployee+laaNbuEmployee+ktgEmployee+lppEmployee+fakEmployee;
        const employeeDeductions=employeeDeductionsSocial+sourceTax+lgavExecEmployeeDeduction+board.employeeCashCharge;
        const net=Math.max(0,gross-employeeDeductions),employerCharges=avsEmployer+acEmployer+laaBuEmployer+ktgEmployer+lppEmployer+fakEmployer+avsAdminEmployer,employerCost=gross+employerCharges;
        const configured=p.mode==='monthly'?base>0:rate>0;
        if(!configured)blockers.push('Rémunération non configurée.');
        if(!p.payrollId)blockers.push('Matricule paie manquant.');
        if(!s.canton)blockers.push('Canton de travail / décompte manquant.');
        if(!s.avsFund)blockers.push('Caisse AVS manquante.');
        if(!s.laaProvider)blockers.push('Assurance LAA / UVG manquante.');
        if(num(s.chLaaBuRate)<=0)blockers.push('Taux LAA accidents professionnels non configuré selon la police assureur.');
        if(num(staff.contract)>=8&&num(s.chLaaNbuRate)<=0)blockers.push('Taux LAA accidents non professionnels non configuré pour un collaborateur ≥ 8 h/semaine.');
        if(num(s.chFakRate)<=0)blockers.push('Taux employeur allocations familiales / FAK non configuré selon la caisse compétente.');
        if(String(s.chFakEmployeeMode||'auto')==='auto'&&String(s.canton||'').toUpperCase()==='VS'&&Math.abs(fakEmployeeRate-.0013)>.000001)blockers.push('Valais : la part salarié allocations familiales 2026 doit être 0,13 %.');
        if(avsStatus==='reference_franchise'&&socialBase>0&&avsBase===socialBase)blockers.push('Franchise AVS âge de référence attendue mais non appliquée.');
        const annualRef=lppCalc.annualSalary;
        if(annualRef>=CH_RULES_2026.lppEntryThreshold&&!p.chLppStatus)blockers.push(`Statut LPP à déterminer (seuil d’entrée 2026 : CHF ${CH_RULES_2026.lppEntryThreshold.toLocaleString('fr-CH')}).`);
        if(p.chLppStatus==='applicable'){
            if(!s.lppProvider)blockers.push('LPP assujetti : institution de prévoyance manquante.');
            if(!p.birthDate)blockers.push('LPP : date de naissance requise pour déterminer la classe d’âge CCNT.');
            if(String(p.chLppCalcMode||'minimum_ccnt')==='minimum_ccnt'&&annualRef<CH_RULES_2026.lppEntryThreshold)blockers.push('LPP déclarée applicable sous le seuil légal : utiliser les montants exacts du plan de prévoyance, car le minimum automatique ne peut pas déterminer une assurance plus favorable/volontaire.');
            if(String(p.chLppCalcMode||'minimum_ccnt')==='plan'){
                if(num(p.chLppEmployeeMonthly)<=0||num(p.chLppEmployerMonthly)<=0)blockers.push('LPP mode plan : cotisations mensuelles salarié/employeur du certificat de prévoyance requises.');
                if(num(p.chLppEmployerMonthly)+.01<num(p.chLppEmployeeMonthly))blockers.push('LPP : la contribution employeur ne peut pas être inférieure à la contribution totale du salarié selon le plan applicable.');
            }else{
                if(lppCalc.source==='ICHEF_PROJECTION')anomalies.push('LPP : salaire annuel assuré projeté automatiquement ; confirmer avec le certificat de l’institution de prévoyance.');
                if(lppCalc.mandatory&&lppCalc.totalAnnual<=0)blockers.push('LPP : cotisation minimale CCNT impossible à calculer.');
            }
        }
        if(board.officialValue>0&&String(p.chBoardDeductionMode||'official')==='custom'&&num(v.chBoardCustomCharge)>board.officialValue*2)anomalies.push('Nourriture/logement : déduction personnalisée très supérieure aux valeurs officielles ; vérifier l’accord écrit.');
        if(board.officialValue>0&&board.avsAddBack>0)anomalies.push(`Nourriture/logement : CHF ${board.avsAddBack.toFixed(2)} ajoutés au salaire déterminant AVS car la retenue cash est inférieure à la valeur officielle.`);
        if(isLgav){
            if(!p.chLgavCategory)blockers.push('Catégorie salariale CCNT Suisse manquante.');
            if(p.mode==='monthly'&&minMonthly&&base+.01<minMonthly)blockers.push(`Salaire mensuel CHF ${base.toFixed(2)} inférieur au minimum CCNT 2026 CHF ${minMonthly.toFixed(2)}.`);
            if(p.mode==='hourly'&&minHourly&&rate+.001<minHourly)blockers.push(`Taux horaire de base CHF ${rate.toFixed(2)} inférieur au minimum CCNT 2026 CHF ${minHourly.toFixed(2)}.`);
            if(p.chIntroReduction===true){
                const cat=String(p.chLgavCategory||'').toUpperCase();
                const rule=String(p.chIntroRule||'');
                if(!p.chIntroConfirmed||!p.chIntroUntil||!['IA','II','IIIA'].includes(cat))blockers.push('Réduction d’introduction -8 % : catégorie, durée et éligibilité doivent être documentées conformément à l’art. 10 CCNT.');
                if(p.chIntroWritten!==true)blockers.push('Réduction d’introduction -8 % : accord écrit dans le contrat ou avenant obligatoire.');
                if(!['IA12','IA3','II3','IIIA3'].includes(rule))blockers.push('Réduction d’introduction -8 % : base juridique/période maximale non sélectionnée.');
                if((rule==='II3'&&cat!=='II')||(rule==='IIIA3'&&cat!=='IIIA')||((rule==='IA12'||rule==='IA3')&&cat!=='IA'))blockers.push('Réduction d’introduction -8 % : catégorie et règle sélectionnée incohérentes.');
            }
            if(!s.chKtgProvider)blockers.push('Assurance indemnité journalière maladie CCNT manquante (80 % / 720 jours sur 900 ; délai d’attente max. 60 jours).');
            if(num(s.chKtgTotalRate)<=0)blockers.push('Prime IJM/KTG manquante ; la CCNT prévoit un partage à parts égales employeur/collaborateur.');
            if(v.chTimesheetSigned!==true)blockers.push('Art. 21 CCNT : enregistrement du temps de travail à signer/valider au moins une fois par mois.');
            if(p.chOvertimeMode==='paid100'&&ot.overtime>0&&!(v.chTimesheetSigned===true&&v.chOtBalanceCommunicated===true&&v.chOtPaidOnTime===true))blockers.push('Paiement des heures supplémentaires à 100 % interdit tant que les 3 conditions CCNT (enregistrement, solde écrit mensuel, paiement dans le délai) ne sont pas confirmées.');
            if(p.chOvertimeMode==='paid100'&&ot.over50>0)blockers.push('Travail supplémentaire au-delà de 50 h/semaine : majoration légale d’au moins 25 % ; paiement à 100 % interdit.');
            const seq=chConsecutiveWorkDays(staff,month);if(seq.maxConsecutive>=7)blockers.push('7 jours consécutifs détectés : vérifier limite de 9 h/jour et repos de 83 h consécutives immédiatement après le 7e jour.');
            if(seq.maxDailyHours>14)anomalies.push('Amplitude journalière très élevée à contrôler.');
            if(String(s.chEstablishmentType||'')==='SMALL'&&s.chEstablishmentConfirmed!==true)blockers.push('Petit établissement : statut non confirmé ; maximum 4 collaborateurs permanents en plus de l’employeur selon l’annexe CCNT.');
            if(String(s.chEstablishmentType||'')==='SEASONAL'&&s.chEstablishmentConfirmed!==true)blockers.push('Établissement saisonnier : statut/autorisation non confirmé selon l’annexe CCNT.');
            if(p.mode==='hourly'&&p.chHourlyVacationMode==='accrual'&&leaveCount(staff,month)>0)blockers.push('Vacances prises avec salaire horaire régulier : le salaire afférent aux vacances doit être calculé/versé sur la base applicable ; le simple provisionnement 10,65 % ne suffit pas.');
        }
        if(p.chQstSubject===true){if(!p.chQstTariff)blockers.push('Impôt à la source : code tarifaire manquant.');if(!s.chQstProvider)blockers.push('Impôt à la source : moteur/barèmes cantonaux AFC 2026 non connecté.');}
        if(!s.swissdecProvider)blockers.push('Swissdec ELM 6.0 : connecteur certifié non configuré ; transmission officielle bloquée.');
        if(!s.chSalaryCertificateProvider)blockers.push('Certificat de salaire : moteur/export réglementaire non configuré.');
        if(hours===0)anomalies.push('Aucune heure pointée.');
        return {staff,settings:s,profile:p,variables:v,hours,target,overtime:ot.overtime,rate,base,overtimePay,annualBonus:thirteenthPaid,gross,socialBase,employeeDeductions,net,employerCharges,employerCost,leaveDays:leaveCount(staff,month),configured,anomalies,regulatoryBlockers:[...new Set(blockers)],regulatoryReady:false,ch:{rules:CH_RULES_2026,isLgav,establishmentType:chEstType(s),weeklyLimit:chWeeklyLimit(s),requiredMinimumMonthly:minMonthly,requiredMinimumHourlyBase:minHourly,vacationPay,vacationAccrued,holidayPay,thirteenthPaid,thirteenthAccrued,weekly:ot.weeks,board,lpp:lppCalc,contributions:{avsBase,avsEmployee,avsEmployer,acBase,acEmployee,acEmployer,laaNbuEmployee,laaBuEmployer,ktgEmployee,ktgEmployer,lppEmployee,lppEmployer,fakEmployee,fakEmployer,fakEmployeeRate,avsAdminEmployer,sourceTax,lgavExecEmployeeDeduction,boardEmployeeCashCharge:board.employeeCashCharge,boardAvsAddBack:board.avsAddBack},insuranceCaps:{acCap,laaCap},lgavExecutionAnnual:lgavContribution}};
    }
    function calcPayroll(staff,month){
        const s=payrollSettings();
        if(s.country==='FR') return calcPayrollFrance(staff,month);
        return calcPayrollSwitzerland(staff,month);
    }
    window.openPayrollCenter=function(){
        document.querySelectorAll('.full-interface').forEach(el=>el.style.display='none');
        const el=document.getElementById('payroll-interface'); if(el) el.style.display='flex';
        const month=document.getElementById('payroll-month'); if(month&&!month.value) month.value=monthNow();
        renderPayrollCenter();
    };
    window.closePayrollCenter=function(){document.getElementById('payroll-interface').style.display='none';const hub=document.getElementById('director-hub');if(hub)hub.style.display='flex';};
    window.switchPayrollTab=function(tab){document.querySelectorAll('.payroll-tab').forEach(x=>x.classList.toggle('active',x.dataset.tab===tab));document.querySelectorAll('.payroll-panel').forEach(x=>x.classList.toggle('active',x.id===`payroll-tab-${tab}`));};
    window.setPayrollCountry=function(country){const s=payrollSettings();s.country=country;s.currency=country==='FR'?'EUR':'CHF';jset(PS_KEY,s);renderPayrollCenter();};
    window.closePayrollModal=function(id){const m=document.getElementById(id);if(m){m.classList.remove('show');m.style.display='none';}};
    function openModal(id){const m=document.getElementById(id);if(m){m.style.display='flex';setTimeout(()=>m.classList.add('show'),10)}}
    window.openPayrollSettings=function(){const s=payrollSettings();
        document.getElementById('ps-country').value=s.country;document.getElementById('ps-currency').value=s.currency;document.getElementById('ps-company').value=s.company||'';
        document.getElementById('ps-employee-rate').value=s.employeeRate;document.getElementById('ps-employer-rate').value=s.employerRate;document.getElementById('ps-overtime').value=s.overtimePremium;
        document.getElementById('ps-account-wages').value=s.accountWages||'';document.getElementById('ps-account-charges').value=s.accountCharges||'';document.getElementById('ps-account-payable').value=s.accountPayable||'';
        document.getElementById('ps-agreement').value=s.agreement||'';document.getElementById('ps-siret').value=s.siret||'';document.getElementById('ps-fr-regime').value=s.frRegime||'HCR';document.getElementById('ps-fr-social-mode').value=s.frSocialMode||'standard2026';document.getElementById('ps-fr-payroll-engine').value=s.frPayrollEngine||'';document.getElementById('ps-dsn-provider').value=s.dsnProvider||'';
        document.getElementById('ps-ch-regime').value=s.chRegime||'LGAV';document.getElementById('ps-ch-establishment-type').value=s.chEstablishmentType||'STANDARD';document.getElementById('ps-ch-establishment-confirmed').value=s.chEstablishmentConfirmed===true?'yes':'no';document.getElementById('ps-canton').value=s.canton||'';document.getElementById('ps-ch-uid').value=s.chUid||'';document.getElementById('ps-avs-fund').value=s.avsFund||'';document.getElementById('ps-lpp').value=s.lppProvider||'';document.getElementById('ps-laa').value=s.laaProvider||'';document.getElementById('ps-ch-laa-bu-rate').value=num(s.chLaaBuRate);document.getElementById('ps-ch-laa-nbu-rate').value=num(s.chLaaNbuRate);document.getElementById('ps-ch-ktg-provider').value=s.chKtgProvider||'';document.getElementById('ps-ch-ktg-total-rate').value=num(s.chKtgTotalRate);document.getElementById('ps-ch-fak-rate').value=num(s.chFakRate);document.getElementById('ps-ch-fak-employee-mode').value=s.chFakEmployeeMode||'auto';document.getElementById('ps-ch-fak-employee-rate').value=num(s.chFakEmployeeRate);document.getElementById('ps-ch-avs-admin-rate').value=num(s.chAvsAdminRate);document.getElementById('ps-ch-qst-provider').value=s.chQstProvider||'';document.getElementById('ps-ch-salary-certificate-provider').value=s.chSalaryCertificateProvider||'';document.getElementById('ps-swissdec-provider').value=s.swissdecProvider||'';
        togglePayrollSettingFields(s.country);document.getElementById('ps-country').onchange=e=>{togglePayrollSettingFields(e.target.value);document.getElementById('ps-currency').value=e.target.value==='FR'?'EUR':'CHF'};openModal('payroll-settings-modal');
    };
    function togglePayrollSettingFields(country){document.querySelectorAll('.fr-setting').forEach(x=>x.style.display=country==='FR'?'flex':'none');document.querySelectorAll('.ch-setting').forEach(x=>x.style.display=country==='CH'?'flex':'none');}
    window.savePayrollSettingsFromModal=function(){const country=document.getElementById('ps-country').value;const s={country,currency:document.getElementById('ps-currency').value,company:document.getElementById('ps-company').value.trim(),employeeRate:num(document.getElementById('ps-employee-rate').value),employerRate:num(document.getElementById('ps-employer-rate').value),overtimePremium:num(document.getElementById('ps-overtime').value),accountWages:document.getElementById('ps-account-wages').value.trim(),accountCharges:document.getElementById('ps-account-charges').value.trim(),accountPayable:document.getElementById('ps-account-payable').value.trim(),agreement:document.getElementById('ps-agreement').value.trim(),siret:document.getElementById('ps-siret').value.trim(),frRegime:document.getElementById('ps-fr-regime').value,frSocialMode:document.getElementById('ps-fr-social-mode').value,frRulesEffectiveDate:'2026-01-01',frPayrollEngine:document.getElementById('ps-fr-payroll-engine').value.trim(),dsnProvider:document.getElementById('ps-dsn-provider').value.trim(),chRegime:document.getElementById('ps-ch-regime').value,chEstablishmentType:document.getElementById('ps-ch-establishment-type').value,chEstablishmentConfirmed:document.getElementById('ps-ch-establishment-confirmed').value==='yes',canton:document.getElementById('ps-canton').value.trim().toUpperCase(),chUid:document.getElementById('ps-ch-uid').value.trim().toUpperCase(),avsFund:document.getElementById('ps-avs-fund').value.trim(),lppProvider:document.getElementById('ps-lpp').value.trim(),laaProvider:document.getElementById('ps-laa').value.trim(),chLaaBuRate:num(document.getElementById('ps-ch-laa-bu-rate').value),chLaaNbuRate:num(document.getElementById('ps-ch-laa-nbu-rate').value),chKtgProvider:document.getElementById('ps-ch-ktg-provider').value.trim(),chKtgTotalRate:num(document.getElementById('ps-ch-ktg-total-rate').value),chFakRate:num(document.getElementById('ps-ch-fak-rate').value),chFakEmployeeMode:document.getElementById('ps-ch-fak-employee-mode').value,chFakEmployeeRate:num(document.getElementById('ps-ch-fak-employee-rate').value),chAvsAdminRate:num(document.getElementById('ps-ch-avs-admin-rate').value),chQstProvider:document.getElementById('ps-ch-qst-provider').value.trim(),chSalaryCertificateProvider:document.getElementById('ps-ch-salary-certificate-provider').value.trim(),swissdecProvider:document.getElementById('ps-swissdec-provider').value.trim(),swissdecVersion:'ELM 6.0',engineVersion:ENGINE_VERSION};jset(PS_KEY,s);closePayrollModal('payroll-settings-modal');renderPayrollCenter();};
    window.openPayrollProfile=function(staffId){const staff=staffById(staffId);if(!staff)return;const p=profileFor(staff),country=payrollSettings().country;document.getElementById('pp-staff-id').value=staff.id;document.getElementById('pp-staff-name').textContent=staff.name;document.getElementById('pp-mode').value=p.mode;document.getElementById('pp-payroll-id').value=p.payrollId||'';document.getElementById('pp-monthly').value=p.monthlySalary||0;document.getElementById('pp-hourly').value=p.hourlyRate||0;document.getElementById('pp-start-date').value=p.startDate||'';document.getElementById('pp-end-date').value=p.endDate||'';document.getElementById('pp-birth-date').value=p.birthDate||'';document.getElementById('pp-contract-type').value=p.contractType||'';document.getElementById('pp-work-scheme').value=p.workTimeScheme||'weekly';document.getElementById('pp-fr-protection-status').value=p.frProtectionStatus||'none';document.getElementById('pp-fr-young-night-authorization').value=p.frYoungNightAuthorization===true?'yes':'no';document.getElementById('pp-fr-night-worker-status').value=p.frNightWorkerStatus||'auto';document.getElementById('pp-fr-night-compensation-tracked').value=p.frNightCompensationTracked===true?'yes':'no';document.getElementById('pp-fr-family-night-conflict').value=p.frFamilyNightConflict===true?'yes':'no';document.getElementById('pp-fr-apprenticeship-year').value=p.frApprenticeshipYear||'';document.getElementById('pp-hcr-level').value=p.hcrLevel||'';document.getElementById('pp-hcr-echelon').value=p.hcrEchelon||'';document.getElementById('pp-structural-ot').value=p.monthlyIncludesStructuralOvertime===false?'no':'yes';document.getElementById('pp-meal-enabled').value=p.mealBenefitEnabled===true?'yes':'no';document.getElementById('pp-meals-day').value=String(p.mealsPerWorkedDay||0);document.getElementById('pp-fr-cadre').value=p.frCadre===true?'cadre':'noncadre';document.getElementById('pp-fr-alsace').value=p.frAlsaceMoselle===true?'yes':'no';document.getElementById('pp-fr-pss-override').value=num(p.frPssMonthlyOverride);document.getElementById('pp-fr-mutuelle-status').value=p.frMutuelleStatus||'applicable';document.getElementById('pp-fr-mutuelle-employee').value=num(p.frMutuelleEmployeeMonthly);document.getElementById('pp-fr-mutuelle-employer').value=num(p.frMutuelleEmployerMonthly);document.getElementById('pp-fr-prevoyance-employee').value=num(p.frPrevoyanceEmployeeMonthly);document.getElementById('pp-fr-prevoyance-employer').value=num(p.frPrevoyanceEmployerMonthly);document.getElementById('pp-fr-pas-subject').value=p.frPasSubject===false?'no':'yes';document.getElementById('pp-fr-pas-rate').value=num(p.frPasRate);document.getElementById('pp-fr-13th-source').value=p.frThirteenthSource||'none';document.getElementById('pp-fr-13th-mode').value=p.frThirteenthMode||'annual';document.getElementById('pp-fr-13th-pct').value=num(p.frThirteenthPct||100);document.getElementById('pp-ch-protection-status').value=p.chProtectionStatus||'none';document.getElementById('pp-ch-postpartum-consent').value=p.chPostpartumConsent===true?'yes':'no';document.getElementById('pp-ch-family-obligations').value=p.chFamilyObligations===true?'yes':'no';document.getElementById('pp-ch-lgav-category').value=p.chLgavCategory||'';document.getElementById('pp-ch-avs-status').value=p.chAvsStatus||'standard';document.getElementById('pp-ch-intro-reduction').value=p.chIntroReduction===true?'yes':'no';document.getElementById('pp-ch-intro-until').value=p.chIntroUntil||'';document.getElementById('pp-ch-intro-confirmed').value=p.chIntroConfirmed===true?'yes':'no';document.getElementById('pp-ch-intro-rule').value=p.chIntroRule||'';document.getElementById('pp-ch-intro-written').value=p.chIntroWritten===true?'yes':'no';document.getElementById('pp-ch-hourly-vacation-mode').value=p.chHourlyVacationMode||'accrual';document.getElementById('pp-ch-hourly-irregular').value=p.chHourlyIrregular===true?'yes':'no';document.getElementById('pp-ch-13th-mode').value=p.chThirteenthMode||'annual';document.getElementById('pp-ch-ot-mode').value=p.chOvertimeMode||'balance';document.getElementById('pp-ch-lpp-status').value=p.chLppStatus||'';document.getElementById('pp-ch-lpp-calc-mode').value=p.chLppCalcMode||'minimum_ccnt';document.getElementById('pp-ch-lpp-annual-insured').value=num(p.chLppAnnualInsuredSalary);document.getElementById('pp-ch-lpp-employee').value=num(p.chLppEmployeeMonthly);document.getElementById('pp-ch-lpp-employer').value=num(p.chLppEmployerMonthly);document.getElementById('pp-ch-board-mode').value=p.chBoardDeductionMode||'official';document.getElementById('pp-ch-qst-subject').value=p.chQstSubject===true?'yes':'no';document.getElementById('pp-ch-qst-tariff').value=p.chQstTariff||'';document.getElementById('pp-ch-lgav-contrib-exempt').value=p.chLgavContributionExempt===true?'yes':'no';document.getElementById('pp-annual-bonus').value=p.annualBonusPct||0;document.getElementById('pp-note').value=p.note||'';document.querySelectorAll('.fr-profile-setting').forEach(el=>el.style.display=country==='FR'?'':'none');document.querySelectorAll('.ch-profile-setting').forEach(el=>el.style.display=country==='CH'?'':'none');openModal('payroll-profile-modal');};
    window.savePayrollProfile=function(){const id=document.getElementById('pp-staff-id').value;const all=payrollProfiles();all[id]={mode:document.getElementById('pp-mode').value,payrollId:document.getElementById('pp-payroll-id').value.trim(),monthlySalary:num(document.getElementById('pp-monthly').value),hourlyRate:num(document.getElementById('pp-hourly').value),startDate:document.getElementById('pp-start-date').value,endDate:document.getElementById('pp-end-date').value,birthDate:document.getElementById('pp-birth-date').value,contractType:document.getElementById('pp-contract-type').value.trim(),workTimeScheme:document.getElementById('pp-work-scheme').value,frProtectionStatus:document.getElementById('pp-fr-protection-status').value,frYoungNightAuthorization:document.getElementById('pp-fr-young-night-authorization').value==='yes',frNightWorkerStatus:document.getElementById('pp-fr-night-worker-status').value,frNightCompensationTracked:document.getElementById('pp-fr-night-compensation-tracked').value==='yes',frFamilyNightConflict:document.getElementById('pp-fr-family-night-conflict').value==='yes',frApprenticeshipYear:document.getElementById('pp-fr-apprenticeship-year').value,hcrLevel:document.getElementById('pp-hcr-level').value,hcrEchelon:document.getElementById('pp-hcr-echelon').value,monthlyIncludesStructuralOvertime:document.getElementById('pp-structural-ot').value!=='no',mealBenefitEnabled:document.getElementById('pp-meal-enabled').value==='yes',mealsPerWorkedDay:num(document.getElementById('pp-meals-day').value),frCadre:document.getElementById('pp-fr-cadre').value==='cadre',frAlsaceMoselle:document.getElementById('pp-fr-alsace').value==='yes',frPssMonthlyOverride:num(document.getElementById('pp-fr-pss-override').value),frMutuelleStatus:document.getElementById('pp-fr-mutuelle-status').value,frMutuelleEmployeeMonthly:num(document.getElementById('pp-fr-mutuelle-employee').value),frMutuelleEmployerMonthly:num(document.getElementById('pp-fr-mutuelle-employer').value),frPrevoyanceEmployeeMonthly:num(document.getElementById('pp-fr-prevoyance-employee').value),frPrevoyanceEmployerMonthly:num(document.getElementById('pp-fr-prevoyance-employer').value),frPasSubject:document.getElementById('pp-fr-pas-subject').value==='yes',frPasRate:num(document.getElementById('pp-fr-pas-rate').value),frThirteenthSource:document.getElementById('pp-fr-13th-source').value,frThirteenthMode:document.getElementById('pp-fr-13th-mode').value,frThirteenthPct:num(document.getElementById('pp-fr-13th-pct').value||100),chProtectionStatus:document.getElementById('pp-ch-protection-status').value,chPostpartumConsent:document.getElementById('pp-ch-postpartum-consent').value==='yes',chFamilyObligations:document.getElementById('pp-ch-family-obligations').value==='yes',chLgavCategory:document.getElementById('pp-ch-lgav-category').value,chAvsStatus:document.getElementById('pp-ch-avs-status').value,chIntroReduction:document.getElementById('pp-ch-intro-reduction').value==='yes',chIntroUntil:document.getElementById('pp-ch-intro-until').value,chIntroConfirmed:document.getElementById('pp-ch-intro-confirmed').value==='yes',chIntroRule:document.getElementById('pp-ch-intro-rule').value,chIntroWritten:document.getElementById('pp-ch-intro-written').value==='yes',chHourlyVacationMode:document.getElementById('pp-ch-hourly-vacation-mode').value,chHourlyIrregular:document.getElementById('pp-ch-hourly-irregular').value==='yes',chThirteenthMode:document.getElementById('pp-ch-13th-mode').value,chOvertimeMode:document.getElementById('pp-ch-ot-mode').value,chLppStatus:document.getElementById('pp-ch-lpp-status').value,chLppCalcMode:document.getElementById('pp-ch-lpp-calc-mode').value,chLppAnnualInsuredSalary:num(document.getElementById('pp-ch-lpp-annual-insured').value),chLppEmployeeMonthly:num(document.getElementById('pp-ch-lpp-employee').value),chLppEmployerMonthly:num(document.getElementById('pp-ch-lpp-employer').value),chBoardDeductionMode:document.getElementById('pp-ch-board-mode').value,chQstSubject:document.getElementById('pp-ch-qst-subject').value==='yes',chQstTariff:document.getElementById('pp-ch-qst-tariff').value.trim().toUpperCase(),chLgavContributionExempt:document.getElementById('pp-ch-lgav-contrib-exempt').value==='yes',annualBonusPct:num(document.getElementById('pp-annual-bonus').value),note:document.getElementById('pp-note').value.trim()};jset(PP_KEY,all);closePayrollModal('payroll-profile-modal');renderPayrollCenter();};
    window.openPayrollVariables=function(staffId){const staff=staffById(staffId);if(!staff)return;const month=document.getElementById('payroll-month').value||monthNow(),v=varsFor(staffId,month),country=payrollSettings().country;document.getElementById('pv-staff-id').value=staff.id;document.getElementById('pv-staff-name').textContent=staff.name;document.getElementById('pv-bonus').value=num(v.bonus);document.getElementById('pv-allowances').value=num(v.allowances);document.getElementById('pv-deductions').value=num(v.deductions);document.getElementById('pv-withholding').value=num(v.withholding);document.getElementById('pv-fr-pas-override').value=num(v.frPasOverride);document.getElementById('pv-fr-mutuelle-extra').value=num(v.frMutuelleExtra);document.getElementById('pv-fr-prevoyance-extra').value=num(v.frPrevoyanceExtra);document.getElementById('pv-fr-taxable-employer-reintegration').value=num(v.frTaxableEmployerReintegration);document.getElementById('pv-fr-overtime-tax-exempt').value=num(v.frOvertimeTaxExempt);document.getElementById('pv-fr-advance').value=num(v.frAdvance);document.getElementById('pv-fr-garnishment').value=num(v.frGarnishment);document.getElementById('pv-fr-other-net-deduction').value=num(v.frOtherNetDeduction);document.getElementById('pv-fr-13th-payout').value=num(v.frThirteenthPayout);document.getElementById('pv-ch-timesheet-signed').value=v.chTimesheetSigned===true?'yes':'no';document.getElementById('pv-ch-ot-balance-communicated').value=v.chOtBalanceCommunicated===true?'yes':'no';document.getElementById('pv-ch-ot-paid-on-time').value=v.chOtPaidOnTime===true?'yes':'no';document.getElementById('pv-ch-13th-payout').value=num(v.chThirteenthPayout);document.getElementById('pv-ch-lgav-exec-deduction').value=num(v.chLgavExecDeduction);document.getElementById('pv-ch-breakfast-count').value=num(v.chBreakfastCount);document.getElementById('pv-ch-lunch-count').value=num(v.chLunchCount);document.getElementById('pv-ch-dinner-count').value=num(v.chDinnerCount);document.getElementById('pv-ch-lodging-days').value=num(v.chLodgingDays);document.getElementById('pv-ch-board-custom-charge').value=num(v.chBoardCustomCharge);document.getElementById('pv-note').value=v.note||'';document.querySelectorAll('.fr-variable-setting').forEach(el=>el.style.display=country==='FR'?'':'none');document.querySelectorAll('.ch-variable-setting').forEach(el=>el.style.display=country==='CH'?'':'none');openModal('payroll-variable-modal');};
    window.savePayrollVariables=function(){const id=document.getElementById('pv-staff-id').value,month=document.getElementById('payroll-month').value||monthNow(),all=payrollVariables();all[month]=all[month]||{};all[month][id]={bonus:num(document.getElementById('pv-bonus').value),allowances:num(document.getElementById('pv-allowances').value),deductions:num(document.getElementById('pv-deductions').value),withholding:num(document.getElementById('pv-withholding').value),frPasOverride:num(document.getElementById('pv-fr-pas-override').value),frMutuelleExtra:num(document.getElementById('pv-fr-mutuelle-extra').value),frPrevoyanceExtra:num(document.getElementById('pv-fr-prevoyance-extra').value),frTaxableEmployerReintegration:num(document.getElementById('pv-fr-taxable-employer-reintegration').value),frOvertimeTaxExempt:num(document.getElementById('pv-fr-overtime-tax-exempt').value),frAdvance:num(document.getElementById('pv-fr-advance').value),frGarnishment:num(document.getElementById('pv-fr-garnishment').value),frOtherNetDeduction:num(document.getElementById('pv-fr-other-net-deduction').value),frThirteenthPayout:num(document.getElementById('pv-fr-13th-payout').value),chTimesheetSigned:document.getElementById('pv-ch-timesheet-signed').value==='yes',chOtBalanceCommunicated:document.getElementById('pv-ch-ot-balance-communicated').value==='yes',chOtPaidOnTime:document.getElementById('pv-ch-ot-paid-on-time').value==='yes',chThirteenthPayout:num(document.getElementById('pv-ch-13th-payout').value),chLgavExecDeduction:num(document.getElementById('pv-ch-lgav-exec-deduction').value),chBreakfastCount:num(document.getElementById('pv-ch-breakfast-count').value),chLunchCount:num(document.getElementById('pv-ch-lunch-count').value),chDinnerCount:num(document.getElementById('pv-ch-dinner-count').value),chLodgingDays:num(document.getElementById('pv-ch-lodging-days').value),chBoardCustomCharge:num(document.getElementById('pv-ch-board-custom-charge').value),note:document.getElementById('pv-note').value.trim()};jset(PV_KEY,all);closePayrollModal('payroll-variable-modal');renderPayrollCenter();};
    window.openPayrollPreview=function(staffId){
        const staff=staffById(staffId);if(!staff)return;
        const month=document.getElementById('payroll-month').value||monthNow(),c=calcPayroll(staff,month),s=c.settings;
        let franceRows='',swissRows='';
        if(s.country==='FR'&&c.fr){
            const x=c.fr.contributions||{};
            franceRows=`${c.annualBonus>0?`<tr><td>13e mois / prime annuelle versé ce mois</td><td style="text-align:right">+${money(c.annualBonus,s.currency)}</td></tr>`:''}<tr><td>Plafond Sécurité sociale utilisé</td><td style="text-align:right">${money(x.pss,s.currency)}</td></tr>
            <tr><td>Vieillesse plafonnée · 6,90 %</td><td style="text-align:right">-${money(x.oldAgeCapped,s.currency)}</td></tr>
            <tr><td>Vieillesse déplafonnée · 0,40 %</td><td style="text-align:right">-${money(x.oldAgeUncapped,s.currency)}</td></tr>
            <tr><td>Agirc-Arrco T1 · 3,15 %</td><td style="text-align:right">-${money(x.agircT1,s.currency)}</td></tr>
            <tr><td>Agirc-Arrco T2 · 8,64 %</td><td style="text-align:right">-${money(x.agircT2,s.currency)}</td></tr>
            <tr><td>CEG T1 / T2</td><td style="text-align:right">-${money(num(x.cegT1)+num(x.cegT2),s.currency)}</td></tr>
            <tr><td>CET · 0,14 % si rémunération &gt; PSS</td><td style="text-align:right">-${money(x.cet,s.currency)}</td></tr>
            <tr><td>APEC cadre · 0,024 %</td><td style="text-align:right">-${money(x.apec,s.currency)}</td></tr>
            <tr><td>Réduction cotisations HS/HC · plafond 11,31 %</td><td style="text-align:right">+${money(x.overtimeRelief,s.currency)}</td></tr>
            <tr><td>CSG déductible · 6,80 %</td><td style="text-align:right">-${money(x.csgDeductible,s.currency)}</td></tr>
            <tr><td>CSG non déductible · 2,40 %</td><td style="text-align:right">-${money(x.csgNonDeductible,s.currency)}</td></tr>
            <tr><td>CRDS · 0,50 %</td><td style="text-align:right">-${money(x.crds,s.currency)}</td></tr>
            <tr><td>Maladie Alsace-Moselle · 1,30 %</td><td style="text-align:right">-${money(x.alsaceMoselle,s.currency)}</td></tr>
            <tr><td>Mutuelle salarié</td><td style="text-align:right">-${money(x.mutuelleEmployee,s.currency)}</td></tr>
            <tr><td>Prévoyance salarié</td><td style="text-align:right">-${money(x.prevoyanceEmployee,s.currency)}</td></tr>
            <tr><td>Net imposable préparé</td><td style="text-align:right">${money(c.netTaxable,s.currency)}</td></tr>
            <tr><td>Prélèvement à la source · ${num(c.fr.pasRate).toFixed(2)} %</td><td style="text-align:right">-${money(c.sourceTax,s.currency)}</td></tr>
            <tr><td>Net avant PAS</td><td style="text-align:right">${money(c.netBeforeTax,s.currency)}</td></tr>
            <tr><td>Acompte / saisie / autres retenues net</td><td style="text-align:right">-${money(num(c.fr.advance)+num(c.fr.garnishment)+num(c.fr.otherNetDeduction),s.currency)}</td></tr>`;
        }
        if(s.country==='CH'&&c.ch){
            const x=c.ch.contributions||{},b=c.ch.board||{},lpp=c.ch.lpp||{};
            swissRows=`<tr><td>Salaire déterminant AVS</td><td style="text-align:right">${money(c.socialBase,s.currency)}</td></tr>
            <tr><td>AVS / AI / APG salarié · 5,30 %</td><td style="text-align:right">-${money(x.avsEmployee,s.currency)}</td></tr>
            <tr><td>AC salarié · 1,10 % plafonné</td><td style="text-align:right">-${money(x.acEmployee,s.currency)}</td></tr>
            <tr><td>LAA non professionnel salarié</td><td style="text-align:right">-${money(x.laaNbuEmployee,s.currency)}</td></tr>
            <tr><td>IJM / KTG salarié</td><td style="text-align:right">-${money(x.ktgEmployee,s.currency)}</td></tr>
            <tr><td>LPP salarié</td><td style="text-align:right">-${money(x.lppEmployee,s.currency)}</td></tr>
            <tr><td>Allocations familiales salarié · ${(num(x.fakEmployeeRate)*100).toFixed(2)} %</td><td style="text-align:right">-${money(x.fakEmployee,s.currency)}</td></tr>
            <tr><td>Impôt à la source</td><td style="text-align:right">-${money(x.sourceTax,s.currency)}</td></tr>
            <tr><td>Contribution CCNT</td><td style="text-align:right">-${money(x.lgavExecEmployeeDeduction,s.currency)}</td></tr>
            <tr><td>Nourriture / logement · valeur officielle</td><td style="text-align:right">${money(b.officialValue,s.currency)}</td></tr>
            <tr><td>Nourriture / logement · retenue cash</td><td style="text-align:right">-${money(b.employeeCashCharge,s.currency)}</td></tr>
            <tr><td>Avantage ajouté à la base AVS</td><td style="text-align:right">${money(b.avsAddBack,s.currency)}</td></tr>
            <tr><td>LPP · salaire coordonné de contrôle</td><td style="text-align:right">${money(lpp.coordinatedSalary,s.currency)}</td></tr>`;
        }
        const html=`<div class="payroll-preview-head"><div><div style="font-size:.6rem;color:var(--gold);font-weight:900;letter-spacing:1.4px;">PRÉPARATION DE PAIE · ${esc(s.country)}</div><h2>${esc(staff.name)}</h2><div style="color:#777;font-size:.7rem;">${esc(month)} · ${esc(c.profile.payrollId||'matricule non renseigné')}</div></div><div style="text-align:right;color:#777;font-size:.68rem;">${esc(s.company||'Établissement')}<br>${esc(s.agreement||'Régime à configurer')}</div></div>
        <div class="payroll-preview-sum"><div class="payroll-preview-box primary"><div class="lbl">Brut préparé</div><div class="val">${money(c.gross,s.currency)}</div></div><div class="payroll-preview-box"><div class="lbl">Net estimé</div><div class="val">${money(c.net,s.currency)}</div></div><div class="payroll-preview-box"><div class="lbl">Coût employeur estimé</div><div class="val">${money(c.employerCost,s.currency)}</div></div></div>
        <div class="payroll-card" style="margin:0;"><table class="payroll-table" style="min-width:0"><tbody><tr><td>Heures réelles</td><td style="text-align:right">${c.hours.toFixed(2)} h</td></tr><tr><td>Objectif contrat moyen</td><td style="text-align:right">${c.target.toFixed(2)} h</td></tr><tr><td>Heures supplémentaires détectées</td><td style="text-align:right">${c.overtime.toFixed(2)} h</td></tr><tr><td>Base</td><td style="text-align:right">${money(c.base,s.currency)}</td></tr><tr><td>Majoration H. sup.</td><td style="text-align:right">${money(c.overtimePay,s.currency)}</td></tr><tr><td>Prime annuelle / 13e payé</td><td style="text-align:right">${money(c.annualBonus,s.currency)}</td></tr><tr><td>Primes & indemnités</td><td style="text-align:right">${money(num(c.variables.bonus)+num(c.variables.allowances),s.currency)}</td></tr>${franceRows}${swissRows}<tr><td>Total retenues salarié</td><td style="text-align:right">-${money(c.employeeDeductions,s.currency)}</td></tr></tbody></table></div>
        <div class="payroll-danger-note" style="margin-top:14px;">${s.country==='FR'?'France : les retenues salariales nationales standard 2026 sont détaillées (vieillesse, Agirc-Arrco, CEG/CET, CSG/CRDS, APEC, Alsace-Moselle, mutuelle/prévoyance et PAS). Les cas particuliers, plafonds proratisés complexes, taux conventionnels dérogatoires et la DSN finale restent à valider par le moteur réglementaire connecté.':'Suisse : les taux dépendant d’une caisse, d’un assureur, d’un canton ou d’un plan LPP doivent provenir des paramètres réels de l’employeur. Aucune transmission Swissdec officielle n’est revendiquée sans connecteur certifié.'}</div>`;
        document.getElementById('payroll-preview-content').innerHTML=html;lastPayrollPreviewHtml=html;openModal('payroll-preview-modal');
    };
    window.printPayrollPreview=function(){
        const w=window.open('','_blank','width=900,height=800');
        if(!w)return;
        w.document.write(`<html><head><title>iCHEF - Préparation paie</title>




</head><body>${lastPayrollPreviewHtml}

</body></html>`);
        w.document.close();
        w.focus();
        setTimeout(()=>w.print(),250);
    };
    function renderKpis(calcs,month){const s=payrollSettings(),gross=calcs.reduce((x,c)=>x+c.gross,0),cost=calcs.reduce((x,c)=>x+c.employerCost,0),hours=calcs.reduce((x,c)=>x+c.hours,0),anoms=calcs.reduce((x,c)=>x+c.anomalies.length,0),locks=payrollLocks(),locked=Boolean(locks[month]);document.getElementById('payroll-kpis').innerHTML=`
        <div class="payroll-kpi gold"><div class="pk-label">Brut préparé</div><div class="pk-value">${money(gross,s.currency)}</div><div class="pk-note">Avant validation réglementaire.</div></div>
        <div class="payroll-kpi"><div class="pk-label">Coût employeur estimé</div><div class="pk-value">${money(cost,s.currency)}</div><div class="pk-note">Selon taux employeur configuré.</div></div>
        <div class="payroll-kpi"><div class="pk-label">Heures pointées</div><div class="pk-value">${hours.toFixed(1)} h</div><div class="pk-note">Source : pointage réel iCHEF.</div></div>
        <div class="payroll-kpi"><div class="pk-label">Anomalies paie</div><div class="pk-value">${anoms}</div><div class="pk-note">Éléments à contrôler avant export.</div></div>
        <div class="payroll-kpi"><div class="pk-label">Période</div><div class="pk-value" style="font-size:1.15rem">${locked?'CLÔTURÉE':'OUVERTE'}</div><div class="pk-note">${month}</div></div>`;}
    function renderBody(calcs){const s=payrollSettings();document.getElementById('payroll-body').innerHTML=calcs.map(c=>{const v=num(c.variables.bonus)+num(c.variables.allowances)-num(c.variables.deductions),blocks=(c.regulatoryBlockers||[]).length,status=blocks?'block':(c.anomalies.length?'warn':'ok'),label=blocks?`${blocks} blocage(s)`:(c.anomalies.length?`${c.anomalies.length} contrôle(s)`:'Préparation OK');return `<tr><td><div class="payroll-name">${esc(c.staff.name)}</div><div class="payroll-sub">${esc(c.staff.role||c.staff.dept||'')}</div></td><td>${c.profile.mode==='monthly'?'Mensuel':'Horaire'}<div class="payroll-sub">${esc(c.profile.payrollId||'Matricule à configurer')}</div></td><td>${c.hours.toFixed(2)} h</td><td>${c.overtime.toFixed(2)} h</td><td class="payroll-money">${money(v,s.currency)}</td><td class="payroll-money gold">${money(c.gross,s.currency)}</td><td class="payroll-money">${money(c.net,s.currency)}<div class="payroll-sub">estimé</div></td><td class="payroll-money">${money(c.employerCost,s.currency)}<div class="payroll-sub">estimé</div></td><td><span class="payroll-status ${status}">${label}</span></td><td><div class="payroll-actions"><button onclick="openPayrollProfile('${c.staff.id}')">PROFIL</button><button onclick="openPayrollVariables('${c.staff.id}')">VARIABLES</button><button onclick="openPayrollPreview('${c.staff.id}')">APERÇU</button></div></td></tr>`}).join('')||`<tr><td colspan="10" style="text-align:center;color:#666;padding:30px">Aucun collaborateur actif.</td></tr>`;}
    function complianceItems(s){if(s.country==='FR')return [
        ['law',true,'Référentiel France versionné',`SMIC 12,31 €/h · minimum garanti 4,35 € · règles au 01/06/2026 · ${FR_RULES_2026.version}`],
        ['agreement',!!s.agreement,'Convention / régime configuré','Renseigner la convention et le régime applicable.'],
        ['siret',/^\d{14}$/.test(String(s.siret||'').replace(/\s/g,'')),'SIRET établissement','14 chiffres requis.'],
        ['weekly',true,'Décompte hebdomadaire','Les heures supplémentaires sont calculées semaine par semaine.'],
        ['hcr',s.frRegime!=='HCR'||String(s.agreement||'').toUpperCase().includes('HCR')||String(s.agreement||'').includes('1979'),'HCR IDCC 1979','Majoration 36e-39e +10 %, 40e-43e +20 %, 44e+ +50 %.'],
        ['gross',true,'Contrôles du brut','SMIC, minimum HCR, HS/HC et avantage nourriture sont contrôlés dans la préparation.'],
        ['social',String(s.frSocialMode||'standard2026')==='standard2026'||!!s.frPayrollEngine,'Retenues salariales France 2026','Vieillesse 6,90 % plafonnée + 0,40 % déplafonnée, Agirc-Arrco T1/T2, CEG/CET, CSG 6,80 % + 2,40 %, CRDS 0,50 %, APEC cadre, Alsace-Moselle, mutuelle/prévoyance et réduction HS/HC.'],
        ['pas',true,'Prélèvement à la source','Calculé salarié par salarié à partir du taux DGFiP saisi ou d’un montant de régularisation.'],
        ['engine',!!s.frPayrollEngine,'Moteur paie réglementaire','Requis pour les cas particuliers, régularisations complexes, charges patronales exactes et validation finale.'],
        ['dsn',!!s.dsnProvider,'Connecteur DSN','Nécessaire pour la transmission déclarative officielle.'],
        ['audit',true,'Traçabilité','Pointages, corrections et validations sont conservés.']
    ];return [
        ['regime',!!s.chRegime,'Régime Suisse','CCNT hôtellerie-restauration ou autre régime applicable configuré.'],
        ['agreement',!!s.agreement,'CCNT / convention configurée','Cadre contractuel conservé dans le dossier de paie.'],
        ['canton',!!s.canton,'Canton configuré','Nécessaire pour l’impôt à la source et certains paramètres employeur.'],
        ['avs',!!s.avsFund,'Caisse AVS','AVS/AI/APG 2026 : 5,30 % salarié + 5,30 % employeur.'],
        ['ac',true,'Assurance-chômage','AC : 1,10 % salarié + 1,10 % employeur jusqu’au plafond légal de CHF 148’200/an.'],
        ['laa',!!s.laaProvider&&num(s.chLaaBuRate)>0,'Assurance LAA / UVG','Assureur et taux de prime réels nécessaires ; plafond assuré CHF 148’200/an.'],
        ['ktg',!chIsLgav(s)||(!!s.chKtgProvider&&num(s.chKtgTotalRate)>0),'Assurance IJM / KTG','Sous CCNT : couverture 80 % pendant 720/900 jours et primes partagées à parts égales.'],
        ['lpp',!!s.lppProvider,'Institution LPP',`2026 : seuil CHF 22’680 · déduction coordination CHF 26’460 · salaire coordonné min CHF 3’780 / max CHF 64’260. CCNT : 1 % total après 17 ans puis 14 % total après 24 ans, avec au maximum la moitié à charge du salarié.`],
        ['food',true,'Nourriture & logement CCNT','Valeurs officielles : petit-déjeuner CHF 3,50 · midi CHF 10 · soir CHF 8 · logement CHF 11,50/jour. Seules les prestations effectivement consommées sont déduites ; l’écart sous le minimum est ajouté au salaire AVS.'],
        ['fak',num(s.chFakRate)>0,'Allocations familiales / FAK',String(s.chFakEmployeeMode||'auto')==='auto'&&String(s.canton||'').toUpperCase()==='VS'?'Part salarié Valais 2026 automatique : 0,13 %. Taux employeur selon caisse.':'Part salarié automatique : 0 % hors Valais ; taux employeur selon caisse.'],
        ['qst',!!s.chQstProvider,'Impôt à la source 2026','Barèmes cantonaux AFC 2026 / moteur de calcul à connecter si salariés concernés.'],
        ['swissdec',!!s.swissdecProvider,'Swissdec ELM 6.0','Base de certification actuelle publiée le 06.03.2026 ; connecteur certifié requis pour l’envoi officiel.'],
        ['salarycert',!!s.chSalaryCertificateProvider,'Certificat de salaire','Export annuel conforme à connecter / valider.'],
        ['audit',true,'Traçabilité temps & paie','Pointages, corrections, validations et versions de règles sont conservés.']
    ]; }
    function renderCompliance(calcs){const s=payrollSettings();document.getElementById('payroll-compliance-title').textContent=`Checklist conformité · ${s.country==='FR'?'France':'Suisse'}`;document.getElementById('payroll-compliance-list').innerHTML=complianceItems(s).map(([k,ok,title,desc])=>`<div class="compliance-item"><div class="compliance-dot ${ok?'ok':'warn'}"></div><div><div class="compliance-title">${esc(title)}</div><div class="compliance-desc">${esc(desc)}</div></div><span class="payroll-status ${ok?'ok':'warn'}">${ok?'OK':'À configurer'}</span></div>`).join('');
        const all=[];calcs.forEach(c=>{(c.regulatoryBlockers||[]).forEach(a=>all.push({level:'block',text:`${c.staff.name} : ${a}`}));c.anomalies.forEach(a=>all.push({level:'warn',text:`${c.staff.name} : ${a}`}))});document.getElementById('payroll-anomaly-list').innerHTML=all.length?all.slice(0,80).map(a=>`<div class="compliance-item"><div class="compliance-dot warn"></div><div><div class="compliance-title">${esc(a.text)}</div></div><span class="payroll-status ${a.level}">${a.level==='block'?'BLOQUANT':'À contrôler'}</span></div>`).join(''):`<div style="color:#10b981;font-size:.75rem;">Aucune anomalie technique détectée sur la préparation.</div>`;}
    function renderRegulatory(){const s=payrollSettings();document.getElementById('payroll-reg-title').textContent=s.country==='FR'?'Préparation DSN':'Préparation Swissdec / ELM';document.getElementById('payroll-reg-desc').textContent=s.country==='FR'?'Prépare les données mensuelles pour un connecteur DSN. Aucun envoi à Net-entreprises n’est réalisé par ce module.':'Prépare les données Suisse 2026 (CCNT, AVS/AI/APG/AC, LPP, LAA, IJM/KTG, QST) pour Swissdec ELM 6.0. Aucun envoi officiel n’est déclaré sans connecteur certifié.';}
    window.renderPayrollCenter=function(){const monthEl=document.getElementById('payroll-month');if(!monthEl)return;if(!monthEl.value)monthEl.value=monthNow();const month=monthEl.value,s=payrollSettings(),calcs=payrollStaff().map(st=>calcPayroll(st,month));
        document.querySelectorAll('#payroll-country-segment button').forEach(b=>b.classList.toggle('active',b.dataset.country===s.country));document.getElementById('payroll-mode-label').textContent=s.country==='FR'?'France · HCR + retenues + PAS 2026':'Suisse · CCNT strict 2026 · Swissdec 6.0';document.getElementById('payroll-engine-version').textContent=s.engineVersion||ENGINE_VERSION;document.getElementById('payroll-cert-chip').innerHTML=(s.country==='FR'?(s.dsnProvider?`Connecteur : <strong>${esc(s.dsnProvider)}</strong>`:'Transmission officielle : non connectée'):(s.swissdecProvider?`Connecteur : <strong>${esc(s.swissdecProvider)}</strong>`:'Transmission officielle : non connectée'));
        renderKpis(calcs,month);renderBody(calcs);renderCompliance(calcs);renderRegulatory();};
    function csvRows(calcs){const s=payrollSettings(),month=document.getElementById('payroll-month').value||monthNow();return [['Période','Pays','Référentiel','Employé','Matricule','Département','Contrat h/semaine','Heures réelles','HS/HC','Absences j','Mode paie','Taux référence','Minimum applicable','13e / prime annuelle versé','Brut préparé','Retenues salarié','Net imposable','PAS / impôt source','Net estimé','Coût employeur estimé','Devise','Statut','Blocages'],...calcs.map(c=>[month,s.country,c.fr?.rules?.version||c.ch?.rules?.version||s.engineVersion||ENGINE_VERSION,c.staff.name,c.profile.payrollId||'',c.staff.dept||'',num(c.staff.contract).toFixed(2),c.hours.toFixed(2),c.overtime.toFixed(2),c.leaveDays.toFixed(2),c.profile.mode,num(c.rate).toFixed(4),num(c.fr?.requiredMinimum||c.ch?.requiredMinimumHourlyBase||c.ch?.requiredMinimumMonthly).toFixed(2),num(c.annualBonus).toFixed(2),c.gross.toFixed(2),c.employeeDeductions.toFixed(2),num(c.netTaxable).toFixed(2),num(c.sourceTax||c.ch?.contributions?.sourceTax).toFixed(2),c.net.toFixed(2),c.employerCost.toFixed(2),s.currency,(c.regulatoryBlockers||[]).length?'BLOQUE':(c.anomalies.length?'A_CONTROLER':'PREPARE'),(c.regulatoryBlockers||[]).join(' | ')])];}
    function toCsv(rows){return '\ufeff'+rows.map(r=>r.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(';')).join('\n')}
    window.exportPayrollCsvPremium=function(){const month=document.getElementById('payroll-month').value||monthNow(),calcs=payrollStaff().map(st=>calcPayroll(st,month));download(`iCHEF_RH_PAIE_PREPARATION_${month}.csv`,toCsv(csvRows(calcs)),'text/csv;charset=utf-8');};
    window.exportPayrollAccountingCsv=function(){const month=document.getElementById('payroll-month').value||monthNow(),s=payrollSettings(),calcs=payrollStaff().map(st=>calcPayroll(st,month)),gross=calcs.reduce((x,c)=>x+c.gross,0),net=calcs.reduce((x,c)=>x+c.net,0),charges=calcs.reduce((x,c)=>x+c.employerCharges,0);const rows=[['Période','Compte','Libellé','Débit','Crédit','Devise'],[month,s.accountWages,'Salaires bruts',gross.toFixed(2),'0.00',s.currency],[month,s.accountCharges,'Charges employeur estimées',charges.toFixed(2),'0.00',s.currency],[month,s.accountPayable,'Salaires nets à payer','0.00',net.toFixed(2),s.currency],[month,'A_CONFIGURER','Organismes sociaux / retenues','0.00',(gross+charges-net).toFixed(2),s.currency]];download(`iCHEF_JOURNAL_PAIE_${month}.csv`,toCsv(rows),'text/csv;charset=utf-8');};
    window.exportPayrollRegulatoryPrep=function(){const month=document.getElementById('payroll-month').value||monthNow(),s=payrollSettings(),calcs=payrollStaff().map(st=>calcPayroll(st,month));const payload={schema:`iCHEF-${s.country==='FR'?'DSN-PREP':'SWISSDEC-PREP'}`,version:ENGINE_VERSION,status:'PREPARATION_NON_TRANSMISE',country:s.country,period:month,company:{name:s.company,agreement:s.agreement,siret:s.country==='FR'?s.siret:undefined,canton:s.country==='CH'?s.canton:undefined},connector:s.country==='FR'?s.dsnProvider:s.swissdecProvider,employees:calcs.map(c=>({employee:c.staff.name,payrollId:c.profile.payrollId,department:c.staff.dept,hours:c.hours,overtime:c.overtime,leaveDays:c.leaveDays,annualBonusPaid:num(c.annualBonus),grossPrepared:c.gross,netEstimated:c.net,employerCostEstimated:c.employerCost,currency:s.currency,validation:(c.regulatoryBlockers||[]).length?'BLOCKED':(c.anomalies.length?'REVIEW':'PREPARED'),regulatoryBlockers:c.regulatoryBlockers||[],frRules:c.fr?.rules?.version||undefined,frContributions:c.fr?.contributions||undefined,frNetTaxable:c.netTaxable||undefined,frPas:c.sourceTax||undefined,chRules:c.ch?.rules?.version||undefined,chContributions:c.ch?.contributions||undefined,chWeekly:c.ch?.weekly||undefined})),officialReady:false,warning:s.country==='FR'?'Préparation iCHEF France 2026 : retenues salariales standard détaillées et PAS calculé à partir du taux DGFiP saisi. Les cas particuliers, régularisations, taux dérogatoires et la DSN officielle exigent toujours un moteur réglementaire exact et un connecteur déclaratif validés.':'Préparation iCHEF Suisse selon règles 2026 versionnées. Les composantes fédérales AVS/AI/APG/AC sont calculées ; LPP, LAA, IJM/KTG, allocations familiales et impôt à la source utilisent les paramètres réels de l’employeur. Toute transmission officielle reste bloquée sans connecteur Swissdec ELM 6.0 certifié.'};download(`iCHEF_${s.country==='FR'?'DSN':'SWISSDEC'}_PREP_${month}.json`,JSON.stringify(payload,null,2),'application/json;charset=utf-8');};
    window.exportPayrollAuditJson=function(){const month=document.getElementById('payroll-month').value||monthNow(),s=payrollSettings(),calcs=payrollStaff().map(st=>calcPayroll(st,month));let history=[];try{history=JSON.parse(localStorage.getItem('ichef_rh_change_history')||'[]')}catch(e){}download(`iCHEF_AUDIT_PAIE_${month}.json`,JSON.stringify({generatedAt:new Date().toISOString(),period:month,settings:s,checks:complianceItems(s),employees:calcs.map(c=>({id:c.staff.id,name:c.staff.name,anomalies:c.anomalies,hours:c.hours,gross:c.gross})),rhChangeHistory:history.slice(-300)},null,2),'application/json;charset=utf-8');};
    window.exportPayrollPaymentPrep=function(){const month=document.getElementById('payroll-month').value||monthNow(),s=payrollSettings(),calcs=payrollStaff().map(st=>calcPayroll(st,month));const rows=[['Période','Employé','Matricule','Net estimé','Devise','IBAN'],...calcs.map(c=>[month,c.staff.name,c.profile.payrollId||'',c.net.toFixed(2),s.currency,'À FOURNIR VIA COFFRE SÉCURISÉ'])];download(`iCHEF_VIREMENTS_PREP_${month}.csv`,toCsv(rows),'text/csv;charset=utf-8');};
    window.exportPayrollSnapshot=function(){const month=document.getElementById('payroll-month').value||monthNow(),s=payrollSettings(),calcs=payrollStaff().map(st=>calcPayroll(st,month));download(`iCHEF_PAIE_SNAPSHOT_${month}.json`,JSON.stringify({closedAt:new Date().toISOString(),engineVersion:ENGINE_VERSION,period:month,country:s.country,currency:s.currency,employees:calcs.map(c=>({id:c.staff.id,name:c.staff.name,hours:c.hours,annualBonusPaid:num(c.annualBonus),gross:c.gross,net:c.net,employerCost:c.employerCost,anomalies:c.anomalies}))},null,2),'application/json;charset=utf-8');};
    window.lockPayrollPeriod=function(){const month=document.getElementById('payroll-month').value||monthNow();if(!confirm(`Clôturer la préparation de paie ${month} ?`))return;const locks=payrollLocks();locks[month]={lockedAt:new Date().toISOString(),country:payrollSettings().country};jset(PL_KEY,locks);renderPayrollCenter();if(typeof showToast==='function')showToast('Préparation paie clôturée');};
    // ---------------------------------------------------------
    // AUTOMATISATION PAIE MENSUELLE
    // Génère une préparation persistante à partir des heures réelles.
    // La paie réglementaire finale reste soumise aux paramètres validés
    // et, le cas échéant, aux connecteurs DSN / Swissdec certifiés.
    // ---------------------------------------------------------
    const PRUN_KEY='ichef_payroll_runs_v1';
    function payrollRuns(){return jget(PRUN_KEY,{})}
    window.iChefPayrollGenerateAutomaticRun=function(month,opts={}){
        month=month||document.getElementById('payroll-month')?.value||monthNow();
        const s=payrollSettings();
        const calcs=payrollStaff().map(st=>calcPayroll(st,month));
        const run={
            period:month,
            country:s.country,
            currency:s.currency,
            generatedAt:new Date().toISOString(),
            source:'AUTO_POINTAGE_PAIE',
            status:'PREPARATION',
            totals:{
                employees:calcs.length,
                hours:Number(calcs.reduce((a,c)=>a+c.hours,0).toFixed(2)),
                gross:Number(calcs.reduce((a,c)=>a+c.gross,0).toFixed(2)),
                netEstimated:Number(calcs.reduce((a,c)=>a+c.net,0).toFixed(2)),
                employerCostEstimated:Number(calcs.reduce((a,c)=>a+c.employerCost,0).toFixed(2)),
                anomalies:calcs.reduce((a,c)=>a+c.anomalies.length,0),regulatoryBlockers:calcs.reduce((a,c)=>a+(c.regulatoryBlockers||[]).length,0)
            },
            employees:calcs.map(c=>({
                id:c.staff.id,
                name:c.staff.name,
                payrollId:c.profile.payrollId||'',
                department:c.staff.dept||'',
                mode:c.profile.mode,
                hours:Number(c.hours.toFixed(2)),
                target:Number(c.target.toFixed(2)),
                overtime:Number(c.overtime.toFixed(2)),
                leaveDays:Number(c.leaveDays.toFixed(2)),
                base:Number(c.base.toFixed(2)),
                overtimePay:Number(c.overtimePay.toFixed(2)),
                annualBonus:Number(c.annualBonus.toFixed(2)),
                variables:{
                    bonus:num(c.variables.bonus),
                    allowances:num(c.variables.allowances),
                    deductions:num(c.variables.deductions),
                    withholding:num(c.variables.withholding)
                },
                gross:Number(c.gross.toFixed(2)),
                employeeDeductionsEstimated:Number(c.employeeDeductions.toFixed(2)),
                netEstimated:Number(c.net.toFixed(2)),
                employerChargesEstimated:Number(c.employerCharges.toFixed(2)),
                employerCostEstimated:Number(c.employerCost.toFixed(2)),
                anomalies:[...c.anomalies],regulatoryBlockers:[...(c.regulatoryBlockers||[])],ch:c.ch?{rules:c.ch.rules.version,contributions:c.ch.contributions,requiredMinimumMonthly:c.ch.requiredMinimumMonthly,requiredMinimumHourlyBase:c.ch.requiredMinimumHourlyBase}:undefined
            }))
        };
        const all=payrollRuns();
        all[month]=run;
        jset(PRUN_KEY,all);
        try{if(typeof API!=='undefined'&&API?.update)API.update('RH_PAYROLL_PREPARATION',all);}catch(e){console.warn('[iCHEF RH] Sync préparation paie:',e)}
        if(!opts.silent&&typeof showToast==='function')showToast('Salaires préparés automatiquement');
        return run;
    };
    window.iChefPayrollGetAutomaticRun=function(month){return payrollRuns()[month||monthNow()]||null};
    function installPayrollEntry(){const grid=document.querySelector('#director-hub .grid-2');if(!grid||document.getElementById('ichef-payroll-entry'))return;const b=document.createElement('button');b.id='ichef-payroll-entry';b.className='pay-btn';b.style.cssText='border-color:var(--gold);color:var(--gold);background:rgba(212,175,55,.055);padding:30px;grid-column:span 2;margin-top:8px;';b.innerHTML='PAIE & CONFORMITÉ · FRANCE / SUISSE';b.onclick=openPayrollCenter;grid.insertBefore(b,grid.querySelector('button[onclick*="openPlanningAssistant"]')||null);}
    document.addEventListener('DOMContentLoaded',()=>{installPayrollEntry();const m=document.getElementById('payroll-month');if(m)m.value=monthNow();setTimeout(installPayrollEntry,600);});
})();
