/* Coverage-aware health UI. Keeps measurement confidence distinct from readiness. */
(function(){
  const coverage=window.REP_HEALTH_COVERAGE;
  if(!coverage)return;
  const shell=window.REP_UI_SHELL,uiState=window.REP_UI_STATE;
  const today=()=>coverage.dayKey();
  const ar=()=>state.lang==="ar";
  const num=(value,digits=0)=>value===null||value===undefined||!Number.isFinite(Number(value))?"—":Number(value).toFixed(digits);
  const labels={sleep:["Sleep","h",1],hrv:["HRV","ms",0],rhr:["Resting HR","bpm",0],resp:["Breathing","/min",1],vo2:["VO₂ max","",1]};

  function coverageCard(){
    const data=coverage.coverage(state,today()),missing=data.missing.length?data.missing.join(", "):"None",tone=data.confidence==="high"?"good":data.confidence==="medium"?"medium":"warning";
    return `<section class="coverage-card ${tone}">
      <div class="coverage-score" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${data.score}" aria-label="${ar()?"ثقة البيانات":"Data confidence"}"><strong>${data.score}%</strong><span>${ar()?"ثقة البيانات":"data confidence"}</span></div>
      <div><small>${ar()?"تغطية القياسات":"MEASUREMENT COVERAGE"}</small><h2>${data.confidence==="high"?(ar()?"جاهزة للتحليل":"Ready to interpret"):ar()?"النتيجة تحتاج سياقاً":"Treat the score cautiously"}</h2>
      <p>${ar()?"تفصل هذه النتيجة اكتمال القياس عن الاستعداد البدني.":"This measures data completeness, separately from physical readiness."}</p>
      <details><summary>${ar()?"تفاصيل التغطية":"Coverage details"}</summary><ul>${data.items.map(item=>`<li class="${item.available?"is-present":"is-missing"}"><span>${item.label}</span><b>${item.available?"✓":"Missing"}</b></li>`).join("")}</ul><p><b>${ar()?"الناقص":"Missing"}:</b> ${esc(missing)}</p></details></div>
    </section>`;
  }

  function morningCard(){
    const prior=coverage.checkinFor(state,today())||{},savedMessage=prior?(ar()?"تم حفظ فحص اليوم.":"Today's check-in is saved."):"";
    const options=value=>[1,2,3,4,5].map(n=>`<option value="${n}" ${Number(value)===n?"selected":""}>${n}</option>`).join("");
    return `<section class="morning-card"><div><small>${ar()?"فحص صباحي · دقيقة":"MORNING CHECK · 1 MINUTE"}</small><h2>${ar()?"أضف ما لا تقيسه الساعة":"Add what the Watch cannot measure"}</h2><p>${ar()?"الألم والضغط والطاقة سياق ضروري قبل تعديل التدريب.":"Pain, stress, soreness, and energy provide essential training context."}</p></div>
      <form data-morning-checkin>
        <label>${ar()?"الطاقة":"Energy"}<select name="energy">${options(prior?.energy||3)}</select></label>
        <label>${ar()?"الإجهاد العضلي":"Soreness"}<select name="soreness">${options(prior?.soreness||2)}</select></label>
        <label>${ar()?"الضغط":"Stress"}<select name="stress">${options(prior?.stress||3)}</select></label>
        <label class="wide check-choice"><input type="checkbox" name="pain" ${prior?.pain?"checked":""}> ${ar()?"ألم غير عضلي":"Pain beyond normal soreness"}</label>
        <label class="wide check-choice"><input type="checkbox" name="illness" ${prior?.illness?"checked":""}> ${ar()?"أعراض مرض":"Illness symptoms"}</label>
        <label class="wide">${ar()?"ملاحظة اختيارية":"Optional context"}<input name="notes" maxlength="180" value="${esc(prior?.notes||"")}"></label>
        <button type="submit">${ar()?"حفظ فحص اليوم":"Save today's check-in"}</button><output aria-live="polite">${savedMessage}</output>
      </form>
    </section>`;
  }

  function chargingCard(){
    const advice=coverage.chargingAdvice(state,today()),plan=state.chargingPlan||{time:"20:00",minutes:45};
    return `<section class="charging-card ${advice.tone}"><div><small>${ar()?"استمرارية الساعة":"WATCH CONTINUITY"}</small><h2>${esc(advice.title)}</h2><p>${esc(advice.detail)}</p></div>
      <form data-charging-plan><label>${ar()?"وقت الشحن":"Charging window"}<input name="time" type="time" value="${esc(plan.time||"20:00")}"></label><label>${ar()?"المدة بالدقائق":"Minutes"}<input name="minutes" type="number" min="20" max="120" step="5" value="${Number(plan.minutes)||45}"></label><button type="submit">${ar()?"حفظ الروتين":"Save routine"}</button><output aria-live="polite"></output></form>
    </section>`;
  }

  function workoutCard(){
    const guard=coverage.workoutGuard(state,today()),manual=state.workoutChecks?.[today()]||{};
    const effective=guard.ready&&manual.watch&&manual.workout;
    return `<section class="workout-guard ${effective?"good":"warning"}"><div><small>${ar()?"فحص ما قبل التمرين":"WORKOUT PREFLIGHT"}</small><h2>${effective?(ar()?"جاهز للتسجيل":"Ready to record"):(ar()?"أكمل الفحص":"Complete preflight")}</h2><p>${esc(guard.message)}</p></div>
      <ul>${guard.checks.map(item=>`<li class="${item.ok?"is-present":"is-missing"}"><span>${item.label}</span><b>${item.ok?"✓":"—"}</b></li>`).join("")}</ul>
      <form data-workout-check><label class="check-choice"><input name="watch" type="checkbox" ${manual.watch?"checked":""}> ${ar()?"الساعة مشحونة ومثبتة":"Watch charged and fitted"}</label><label class="check-choice"><input name="workout" type="checkbox" ${manual.workout?"checked":""}> ${ar()?"سأبدأ وضع التمرين":"I will start Workout mode"}</label><button type="submit">${ar()?"حفظ وفتح التدريب":"Save and open Training"}</button></form>
    </section>`;
  }

  function trendCard(){
    const report=coverage.longTerm(state,today());
    return `<section class="long-term-card"><div><small>${ar()?"خط أساس شخصي":"PERSONAL BASELINE"}</small><h2>${ar()?"اتجاهات 7 · 28 · 90 يوماً":"7 · 28 · 90 day trends"}</h2><p>${ar()?"نقارن جسمك بنفسه، لا بمتوسط السكان. الاتجاهات أهم من قراءة يوم واحد.":"Your body is compared with its own history, not a population grade. Trends matter more than one reading."}</p></div>
      <div class="trend-table" role="table" tabindex="0" aria-label="Long-term health trends"><div class="trend-row trend-head" role="row"><span role="columnheader">Metric</span><span role="columnheader">Now</span><span role="columnheader">7d</span><span role="columnheader">28d</span><span role="columnheader">90d</span></div>
      ${report.metrics.map(metric=>{const [label,unit,digits]=labels[metric.name];return `<div class="trend-row" role="row"><strong role="rowheader">${label}</strong><span role="cell">${num(metric.current,digits)} ${unit}</span><span role="cell">${num(metric.average7,digits)}</span><span role="cell">${num(metric.average28,digits)}</span><span role="cell">${num(metric.average90,digits)}</span></div>`;}).join("")}</div>
      <div class="measurement-summary"><span><b>${num(report.weight.current,1)} kg</b>Latest weight</span><span><b>${num(report.waistCm,1)} cm</b>Latest waist</span></div>
      <form data-body-measurement><label>Weight (kg)<input name="weight" type="number" min="30" max="300" step=".1"></label><label>Waist (cm)<input name="waist" type="number" min="40" max="250" step=".1"></label><label>Systolic<input name="systolic" type="number" min="70" max="250"></label><label>Diastolic<input name="diastolic" type="number" min="40" max="150"></label><button type="submit">${ar()?"حفظ القياسات":"Save measurements"}</button><button type="button" class="quiet" data-health-report>${ar()?"تصدير التقرير":"Export report"}</button><output aria-live="polite"></output></form>
      <p class="medical-boundary">${ar()?"للاتجاهات الصحية العامة، وليس للتشخيص أو الطوارئ.":"For general health trends, not diagnosis or emergency decisions."}</p>
    </section>`;
  }

  function bind({onWorkoutReady}={}){
    document.querySelector("[data-morning-checkin]")?.addEventListener("submit",event=>{
      event.preventDefault();const form=new FormData(event.currentTarget),date=today(),record={date:new Date().toISOString(),energy:Number(form.get("energy")),soreness:Number(form.get("soreness")),stress:Number(form.get("stress")),sleep:Number((state.sleepLogs||[]).find(row=>String(row.date).slice(0,10)===date)?.hours)||null,pain:form.get("pain")==="on",illness:form.get("illness")==="on",notes:String(form.get("notes")||"").trim()};
      state.recoveryCheckins=(state.recoveryCheckins||[]).filter(row=>String(row.date||"").slice(0,10)!==date);state.recoveryCheckins.unshift(record);state.recoveryCheckins=state.recoveryCheckins.slice(0,120);queueHealth("recovery",record);persist();renderVitals();
    });
    document.querySelector("[data-charging-plan]")?.addEventListener("submit",event=>{event.preventDefault();const form=new FormData(event.currentTarget);state.chargingPlan={time:String(form.get("time")||"20:00"),minutes:Math.max(20,Math.min(120,Number(form.get("minutes"))||45))};persist();event.currentTarget.querySelector("output").textContent=ar()?"تم الحفظ.":"Routine saved.";});
    document.querySelector("[data-workout-check]")?.addEventListener("submit",event=>{event.preventDefault();const form=new FormData(event.currentTarget);state.workoutChecks={...(state.workoutChecks||{}),[today()]:{watch:form.get("watch")==="on",workout:form.get("workout")==="on",checkedAt:new Date().toISOString()}};persist();document.querySelector(".workout-preflight-panel")?.remove();if(onWorkoutReady)onWorkoutReady();else setPrimaryTab("train");});
    document.querySelector("[data-body-measurement]")?.addEventListener("submit",event=>{event.preventDefault();const form=new FormData(event.currentTarget),date=today(),weight=Number(form.get("weight")),waist=Number(form.get("waist")),systolic=Number(form.get("systolic")),diastolic=Number(form.get("diastolic"));
      if(Number.isFinite(weight)&&weight>=30&&weight<=300){const week=weekKey(new Date());state.bodyWeights=(state.bodyWeights||[]).filter(row=>row.week!==week);state.bodyWeights.unshift({week,date:new Date().toISOString(),kg:weight});}
      if([waist,systolic,diastolic].some(Number.isFinite)){state.bodyMeasurements=(state.bodyMeasurements||[]).filter(row=>String(row.date||"").slice(0,10)!==date);state.bodyMeasurements.unshift({date:new Date().toISOString(),waist_cm:Number.isFinite(waist)?waist:null,systolic:Number.isFinite(systolic)?systolic:null,diastolic:Number.isFinite(diastolic)?diastolic:null});state.bodyMeasurements=state.bodyMeasurements.slice(0,400);}
      persist();renderInsights();
    });
    document.querySelector("[data-health-report]")?.addEventListener("click",()=>{const payload={generatedAt:new Date().toISOString(),coverage:coverage.coverage(state,today()),baseline:coverage.longTerm(state,today()),recentCheckins:(state.recoveryCheckins||[]).slice(0,28),measurements:(state.bodyMeasurements||[]).slice(0,90),disclaimer:"General wellness trends; not a diagnosis."},blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}),link=document.createElement("a");link.href=URL.createObjectURL(blob);link.download=`rep-health-report-${today()}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);});
  }

  function domainOverviewGrid(){
    const rtl=ar(),longTerm=coverage.longTerm(state,today());
    const metrics=state.healthMetrics?.[today()]||{};
    const sleep=(state.sleepLogs||[]).find(s=>String(s.date).slice(0,10)===today())||{};
    const energy=state.activeEnergy?.[today()]||0;
    const strain=window.health?.strain?window.health.strain(state,today()):0;
    const weights=[...(state.bodyWeights||[])].sort((a,b)=>b.week.localeCompare(a.week));
    const currentWeight=weights[0]?.kg||null,prevWeight=weights[1]?.kg||null;
    const weightDelta=(currentWeight&&prevWeight)?Math.round((currentWeight-prevWeight)*10)/10:null;

    const sleepMetric=longTerm.metrics.find(m=>m.name==="sleep");
    const sleepHours=sleep.hours||sleepMetric?.current||null;
    const sleepBase=sleepMetric?.average28||7.5;
    const sleepDebt=sleepHours?Math.round((sleepBase-sleepHours)*10)/10:null;
    const sleepStatus=!sleepHours?(rtl?"سجّل النوم":"Log sleep"):(sleepDebt<=0.3?(rtl?"ضمن المعدل":"In baseline"):(rtl?`دين: ${sleepDebt}س`:`Debt: ${sleepDebt}h`));
    const sleepTone=!sleepHours?"neutral":(sleepDebt<=0.3?"good":"warning");

    const hrvMetric=longTerm.metrics.find(m=>m.name==="hrv"),rhrMetric=longTerm.metrics.find(m=>m.name==="rhr");
    const hrv=sleep.hrv||hrvMetric?.current||null,rhr=sleep.rhr||rhrMetric?.current||null;
    const hrvBase=hrvMetric?.average28||null,rhrBase=rhrMetric?.average28||null;
    const heartStatus=(!hrv&&!rhr)?(rtl?"في انتظار الساعة":"Awaiting Watch"):((hrv&&hrvBase&&hrv>=hrvBase*0.9)?(rtl?"استشفاء ممتاز":"Balanced recovery"):(rtl?"إجهاد طفيف":"Mild strain"));
    const heartTone=(!hrv&&!rhr)?"neutral":((hrv&&hrvBase&&hrv>=hrvBase*0.9)?"good":"warning");

    const steps=metrics.steps||null;
    const activityStatus=strain>=14?(rtl?"حمل تدريبي عالي":"High strain"):strain>=8?(rtl?"حمل مثالي":"Optimal load"):(rtl?"استشفاء نشط":"Active recovery");

    const waist=longTerm.waistCm||null;
    const bodyMeasurements=state.bodyMeasurements?.[0]||{};
    const bp=(bodyMeasurements.systolic&&bodyMeasurements.diastolic)?`${bodyMeasurements.systolic}/${bodyMeasurements.diastolic}`:null;

    return `<section class="domain-cards-grid" aria-label="${rtl?"المجالات الفسيولوجية الأربعة":"Four physiological domains"}">
      <article class="domain-card tone-${sleepTone}">
        <div class="domain-head">
          <span><small>${rtl?"النوم والاستشفاء":"SLEEP & RECOVERY"}</small><h3>🌙 ${sleepHours?`${sleepHours}h`:"—"}</h3></span>
          <span class="domain-pill ${sleepTone}">${sleepStatus}</span>
        </div>
        <div class="domain-stats">
          <div><small>${rtl?"المعدل (28 يوم)":"28D BASELINE"}</small><strong>${sleepBase}h</strong></div>
          <div><small>${rtl?"النوم العميق":"DEEP SLEEP"}</small><strong>${metrics.deepSleepHours?`${metrics.deepSleepHours}h`:(sleep.bedtime?`${sleep.bedtime} → ${sleep.wake}`:"—")}</strong></div>
        </div>
      </article>
      <article class="domain-card tone-${heartTone}">
        <div class="domain-head">
          <span><small>${rtl?"القلب والاستجابة":"HEART & AUTONOMIC"}</small><h3>❤️ ${hrv?`${hrv} ms`:"—"} <span class="sub-metric">${rhr?`· ${rhr} bpm`:""}</span></h3></span>
          <span class="domain-pill ${heartTone}">${heartStatus}</span>
        </div>
        <div class="domain-stats">
          <div><small>${rtl?"معدل HRV":"HRV BASELINE"}</small><strong>${hrvBase?`${Math.round(hrvBase)} ms`:"—"}</strong></div>
          <div><small>${rtl?"النبض أثناء الراحة":"RESTING HR"}</small><strong>${rhrBase?`${Math.round(rhrBase)} bpm`:"—"}</strong></div>
        </div>
      </article>
      <article class="domain-card tone-good">
        <div class="domain-head">
          <span><small>${rtl?"النشاط والإجهاد":"ACTIVITY & STRAIN"}</small><h3>⚡ ${strain?`${strain.toFixed(1)}`:"0.0"} <small>/ 21</small></h3></span>
          <span class="domain-pill good">${activityStatus}</span>
        </div>
        <div class="domain-stats">
          <div><small>${rtl?"الطاقة النشطة":"ACTIVE KCAL"}</small><strong>${energy?`${energy} kcal`:"—"}</strong></div>
          <div><small>${rtl?"الخطوات":"STEPS"}</small><strong>${steps?steps.toLocaleString():"—"}</strong></div>
        </div>
      </article>
      <article class="domain-card tone-neutral">
        <div class="domain-head">
          <span><small>${rtl?"الجسم والقياسات":"BODY & COMPOSITION"}</small><h3>⚖️ ${currentWeight?`${currentWeight} kg`:"—"}</h3></span>
          <span class="domain-pill neutral">${weightDelta!==null?`${weightDelta>0?"+":""}${weightDelta} kg/wk`:(rtl?"ثابت":"Stable")}</span>
        </div>
        <div class="domain-stats">
          <div><small>${rtl?"محيط الخصر":"WAIST"}</small><strong>${waist?`${waist} cm`:"—"}</strong></div>
          <div><small>${rtl?"ضغط الدم":"BLOOD PRESSURE"}</small><strong>${bp||"—"}</strong></div>
        </div>
      </article>
    </section>`;
  }

  function organizeHealthWorkflow(){
    const active=uiState?.get("healthWorkflow")||"summary",rtl=ar();
    const nav=shell?.tabs({label:rtl?"مهام الحيوية":"Vitals workflows",active,items:[["summary",rtl?"الملخص":"Summary"],["log",rtl?"تسجيل":"Log"],["data",rtl?"البيانات":"Data & setup"]].map(([id,label])=>({id,label})),onChange:id=>{uiState?.set("healthWorkflow",id);renderVitals();},className:"workflow-nav health-workflow-nav"});
    const anchor=document.querySelector(".health-subnav");if(nav&&anchor)anchor.insertAdjacentElement("afterend",nav);
    const groups=[];
    document.querySelectorAll(".coverage-card,.health-coach-card,.domain-cards-grid,.vitals-trio").forEach(element=>groups.push([element,"summary"]));
    document.querySelectorAll(".morning-card,.sleep-card,.journal-card,.active-energy-card,.vitals-import-card.is-review").forEach(element=>groups.push([element,"log"]));
    document.querySelectorAll(".charging-card,.health-quality-card,.vitals-import-card:not(.is-review),.recovery-card.wide:not(.sleep-card):not(.journal-card)").forEach(element=>groups.push([element,"data"]));
    shell?.showOnly(groups,active);
    document.documentElement.dataset.healthWorkflow=active;
  }

  function needsWorkoutPreflight(){
    const guard=coverage.workoutGuard(state,today()),manual=state.workoutChecks?.[today()]||{};
    return !(guard.ready&&manual.watch&&manual.workout);
  }
  function openWorkoutPreflight(proceed){
    document.querySelector(".workout-preflight-panel")?.remove();
    const panel=document.createElement("div");panel.className="exit-confirm workout-preflight-panel";panel.setAttribute("role","dialog");panel.setAttribute("aria-modal","true");panel.setAttribute("aria-label",ar()?"فحص ما قبل التمرين":"Workout preflight");panel.innerHTML=REP_SAFE_DOM.sanitize(`<button class="dialog-close" data-close-preflight aria-label="${ar()?"إغلاق":"Close"}">×</button>${workoutCard()}`);document.body.append(panel);panel.querySelector("[data-close-preflight]").onclick=()=>panel.remove();bind({onWorkoutReady:proceed});panel.querySelector("input,button")?.focus();
  }

  const baseVitals=renderVitals,baseInsights=renderInsights,baseHome=renderHome;
  renderVitals=function(){baseVitals();document.querySelector(".health-subnav")?.insertAdjacentHTML("afterend",REP_SAFE_DOM.sanitize(`${domainOverviewGrid()}${coverageCard()}${morningCard()}${chargingCard()}`));organizeHealthWorkflow();bind();};
  renderInsights=function(){baseInsights();(document.querySelector(".trends-grid")||document.querySelector(".health-subnav"))?.insertAdjacentHTML("afterend",REP_SAFE_DOM.sanitize(trendCard()));bind();};
  renderHome=function(){baseHome();const start=document.querySelector("[data-start-today]");if(start){const proceed=start.onclick;start.onclick=null;start.addEventListener("click",()=>{if(needsWorkoutPreflight())openWorkoutPreflight(()=>proceed?.());else proceed?.();});}};
  if(state.activeTab==="vitals")renderVitals();else if(state.activeTab==="insights")renderInsights();
})();
