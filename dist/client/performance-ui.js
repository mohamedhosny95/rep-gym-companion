/* UI adapter for the deterministic performance-insights engine. */
(function(){
  const engine=window.REP_PERFORMANCE_INSIGHTS;if(!engine)return;
  const tr=(ar,en,arabic)=>ar?arabic:en;
  const pct=value=>value===null||value===undefined?"—":`${Math.round(value)}%`;
  const signed=value=>value===null||value===undefined?"—":`${value>0?"+":""}${value}`;
  const confidence=(value,ar)=>({high:tr(ar,"High confidence","ثقة عالية"),medium:tr(ar,"Medium confidence","ثقة متوسطة"),low:tr(ar,"Low confidence","ثقة منخفضة")}[value]||value);
  const goalName=(type,ar)=>({strength:tr(ar,"Strength","القوة"),fat_loss:tr(ar,"Fat loss","خفض الدهون"),muscle_gain:tr(ar,"Muscle gain","زيادة العضلات"),recovery:tr(ar,"Recovery","الاستشفاء")}[type]||type);
  const actionText=(action,ar)=>{
    if(!ar)return action;
    const map={
      "Log weight and reps for at least three sessions.":"سجّل الوزن والتكرارات في ثلاث حصص على الأقل.",
      "Increase by the smallest available increment only if warm-up reps are crisp and pain-free.":"زِد بأصغر درجة متاحة فقط إذا كانت تكرارات الإحماء ثابتة وبدون ألم.",
      "Repeat or reduce the load until RPE returns to the planned range.":"كرّر الحمل أو خفّضه حتى يعود الجهد للنطاق المخطط.",
      "Keep the load and add one clean rep, or schedule a lighter week before progressing.":"ثبّت الحمل وأضف تكراراً نظيفاً، أو نفّذ أسبوعاً أخف قبل التقدم.",
      "Keep the current load and add a clean rep before increasing weight.":"ثبّت الحمل الحالي وأضف تكراراً نظيفاً قبل زيادة الوزن.",
      "Log food on at least five days each week before changing calorie targets.":"سجّل الطعام خمسة أيام على الأقل أسبوعياً قبل تغيير هدف السعرات.",
      "Make protein the next consistency target; keep calories unchanged for now.":"اجعل البروتين هدف الاتساق التالي، واترك السعرات دون تغيير الآن.",
      "Hold the current plan for two more weeks, then review the weight trend rather than a single weigh-in.":"ثبّت الخطة أسبوعين آخرين ثم راجع اتجاه الوزن بدلاً من قراءة واحدة.",
      "Log sleep and recovery on at least five days this week.":"سجّل النوم والاستشفاء خمسة أيام على الأقل هذا الأسبوع.",
      "Protect a consistent sleep window and change only one recovery behavior for two weeks.":"حافظ على نافذة نوم ثابتة وغيّر سلوك استشفاء واحداً فقط لمدة أسبوعين."
    };return map[action]||action;
  };
  const statusCopy=(goal,ar)=>{
    if(goal.status==="achieved")return {title:tr(ar,"Target reached","تم الوصول للهدف"),detail:tr(ar,"Your latest trend meets the saved target.","الاتجاه الأخير يحقق الهدف المحفوظ.")};
    if(goal.status==="forecast")return {title:tr(ar,`${goal.dateRange[0]} – ${goal.dateRange[1]}`,`${goal.dateRange[0]} – ${goal.dateRange[1]}`),detail:tr(ar,`Estimated ${goal.range[0]}–${goal.range[1]} weeks, not a promise.`,`تقدير ${goal.range[0]}–${goal.range[1]} أسبوعاً، وليس وعداً.`)};
    if(goal.status==="off_track")return {title:tr(ar,"Trend is not yet moving toward the target","الاتجاه لا يتحرك نحو الهدف بعد"),detail:tr(ar,"Keep collecting data before changing more than one variable.","استمر في جمع البيانات قبل تغيير أكثر من متغير واحد.")};
    return {title:tr(ar,"Set a numeric target to unlock a forecast","حدد هدفاً رقمياً لعرض التوقع"),detail:tr(ar,"Forecasts appear only when enough history supports a stable direction.","لا تظهر التوقعات إلا عندما يدعم السجل اتجاهاً مستقراً.")};
  };

  function goalPanel(model,ar){
    const goal=model.goal,saved=goal.goal,copy=statusCopy(goal,ar),exercises=model.strength.exercises.map(item=>item.exercise),strength=saved.type==="strength",recovery=saved.type==="recovery",unit=recovery?"%":"kg";
    return `<section class="performance-card goal-forecast"><div class="performance-head"><div><small>${tr(ar,"GOAL FORECAST","توقع الهدف")}</small><h2>${esc(goalName(saved.type,ar))}</h2></div><span class="confidence-pill tone-${goal.confidence}">${confidence(goal.confidence,ar)}</span></div>
      <form data-analytics-goal class="analytics-goal-form">
        <label><span>${tr(ar,"Goal","الهدف")}</span><select name="type">${engine.GOAL_TYPES.map(type=>`<option value="${type}" ${saved.type===type?"selected":""}>${esc(goalName(type,ar))}</option>`).join("")}</select></label>
        ${strength?`<label><span>${tr(ar,"Exercise","التمرين")}</span><select name="exercise">${(exercises.length?exercises:[saved.exercise]).map(name=>`<option ${name===saved.exercise?"selected":""}>${esc(name)}</option>`).join("")}</select></label>`:""}
        <label><span>${tr(ar,recovery?"Target readiness":"Target",recovery?"الاستشفاء المستهدف":"الهدف")} (${unit})</span><input name="target" type="number" min="1" max="${recovery?100:400}" step="0.1" value="${saved.target||""}" inputmode="decimal" required></label>
        <button type="submit">${tr(ar,"Save goal","حفظ الهدف")}</button>
      </form>
      <div class="forecast-result"><div><small>${tr(ar,"CURRENT","الحالي")}</small><strong>${goal.current===null?"—":`${goal.current}${goal.unit}`}</strong><span>${goal.rate===null?tr(ar,"Trend calibrating","الاتجاه قيد المعايرة"):`${signed(goal.rate)}${goal.unit}/${tr(ar,"week","أسبوع")}`}</span></div><div><small>${tr(ar,"FORECAST","التوقع")}</small><strong>${esc(copy.title)}</strong><span>${esc(copy.detail)}</span></div></div>
      <div class="next-best-action"><small>${tr(ar,"NEXT BEST ACTION","أفضل خطوة تالية")}</small><p>${esc(actionText(goal.nextAction,ar))}</p><span>${esc(goal.evidence)}</span></div>
    </section>`;
  }

  function sparklineSvg(records){
    if(!records||records.length<2)return "";
    const values=records.map(r=>Number(r.bestE1rm)||0),min=Math.min(...values),max=Math.max(...values),range=(max-min)||1,width=80,height=22,pad=3;
    const pts=values.map((v,i)=>{const x=Math.round(pad+(i/(values.length-1))*(width-2*pad)),y=Math.round(height-pad-((v-min)/range)*(height-2*pad));return `${x},${y}`;}).join(" ");
    const lastPt=pts.split(" ").at(-1).split(",");
    return `<svg class="lift-sparkline" viewBox="0 0 ${width} ${height}" aria-hidden="true"><polyline fill="none" stroke="var(--acid)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" points="${pts}"/><circle cx="${lastPt[0]}" cy="${lastPt[1]}" r="2.5" fill="var(--acid)"/></svg>`;
  }

  function strengthPanel(model,ar){
    const data=model.strength,items=data.exercises.slice(0,6),muscles=Object.entries(data.muscleSets).sort((a,b)=>b[1]-a[1]);
    return `<details class="performance-card" open><summary><span><small>${tr(ar,"STRENGTH INTELLIGENCE","تحليلات القوة")}</small><strong>${tr(ar,"Progress, volume, and plateaus","التقدم والحجم والثبات")}</strong></span><b>${data.exercises.length}</b></summary>
      <div class="analytics-summary-grid"><span><small>${tr(ar,"7D VOLUME LOAD","حمل 7 أيام")}</small><strong>${Math.round(data.totalVolume).toLocaleString()} kg</strong><em>${data.volumeChange===null?tr(ar,"Needs prior week","يحتاج أسبوعاً سابقاً"):`${signed(data.volumeChange)}%`}</em></span><span><small>${tr(ar,"RECENT PRs","أرقام حديثة")}</small><strong>${data.prs.length}</strong><em>${confidence(data.confidence,ar)}</em></span><span><small>${tr(ar,"PLATEAU FLAGS","إشارات الثبات")}</small><strong>${data.plateaus.length}</strong><em>${tr(ar,"Rule-based","بقواعد واضحة")}</em></span></div>
      ${items.length?`<div class="lift-insight-list">${items.map(item=>`<article><div><strong>${esc(item.exercise)}</strong><span>${item.sessionCount} ${tr(ar,"sessions","حصص")} · ${confidence(item.confidence,ar)}</span></div><div class="lift-metric-row"><b>${item.currentE1rm} <small>kg e1RM</small></b>${sparklineSvg(item.records)}</div><div class="lift-flags"><span class="${item.change28d!==null&&item.change28d<0?"warn":""}">${item.change28d===null?tr(ar,"28d calibrating","28 يوم قيد المعايرة"):`${signed(item.change28d)}% / 28d`}</span>${item.plateau?`<span class="warn">${tr(ar,"Plateau","ثبات")}</span>`:""}<span>${tr(ar,item.recommendation==="progress"?"Progress":"Hold",item.recommendation==="progress"?"تقدم":"ثبّت")}</span></div></article>`).join("")}</div>`:`<p class="analytics-empty">${tr(ar,"Complete weighted sets with reps to unlock estimated 1RM trends.","أكمل مجموعات بأوزان وتكرارات لعرض اتجاه القوة التقديري.")}</p>`}
      ${muscles.length?`<div class="muscle-volume"><small>${tr(ar,"HARD SETS BY MUSCLE · 7 DAYS","المجموعات الجادة حسب العضلة · 7 أيام")}</small>${muscles.map(([name,count])=>`<span><b>${esc(name)}</b><i style="--value:${Math.min(100,count/16*100)}%"></i><em>${count}</em></span>`).join("")}</div>`:""}
      <p class="analytics-boundary">${tr(ar,"e1RM uses the Epley estimate with reps capped at 15. It is a trend tool, not a maximal-lift instruction.","يستخدم e1RM معادلة Epley مع حد 15 تكراراً. هو أداة اتجاه وليس توجيهاً لاختبار أقصى حمل.")}</p>
    </details>`;
  }

  function nutritionPanel(model,ar){
    const data=model.nutrition,a7=data.adherence7,maintenance=data.maintenance;
    const metric=(label,value)=>`<span><small>${label}</small><strong>${pct(value)}</strong><i style="--value:${value||0}%"></i></span>`;
    return `<details class="performance-card" open><summary><span><small>${tr(ar,"NUTRITION → OUTCOMES","التغذية ← النتائج")}</small><strong>${tr(ar,"Adherence and body-weight model","الالتزام ونموذج الوزن")}</strong></span><b>${a7.loggedDays}/7</b></summary>
      <div class="adherence-grid">${metric(tr(ar,"Calories","السعرات"),a7.calories)}${metric(tr(ar,"Protein","البروتين"),a7.protein)}${metric(tr(ar,"Hydration","الترطيب"),a7.water)}</div>
      <div class="nutrition-model-grid"><div><small>${tr(ar,"ROBUST WEIGHT TREND","اتجاه الوزن المتين")}</small><strong>${data.weightSlopePerWeek===null?"—":`${signed(data.weightSlopePerWeek)} kg/${tr(ar,"week","أسبوع")}`}</strong><span>${data.weights.length} ${tr(ar,"weigh-ins","قراءات وزن")}</span></div><div><small>${tr(ar,"ESTIMATED MAINTENANCE","الصيانة التقديرية")}</small><strong>${maintenance?`${maintenance.low}–${maintenance.high}`:"—"}</strong><span>${maintenance?"kcal/day":tr(ar,"Needs 14 food days + 4 weigh-ins","يحتاج 14 يوم طعام + 4 قراءات وزن")}</span></div></div>
      <p class="analytics-boundary">${tr(ar,"Adherence is calculated only on logged days; coverage is shown separately. Maintenance is an uncertainty range, never a prescription.","يُحسب الالتزام على الأيام المسجلة فقط وتظهر التغطية منفصلة. سعرات الصيانة نطاق غير مؤكد وليست وصفة.")}</p>
    </details>`;
  }

  function inboxPanel(model,ar){
    const cards=model.inbox,hidden=Object.keys(state.insightControls.dismissed||{}).length+Object.keys(state.insightControls.snoozed||{}).length;
    return `<details class="performance-card insight-inbox" open><summary><span><small>${tr(ar,"INSIGHT INBOX","صندوق التحليلات")}</small><strong>${tr(ar,"Only material changes","التغييرات المهمة فقط")}</strong></span><b>${cards.length}</b></summary>
      ${cards.length?`<div class="inbox-list">${cards.map(card=>`<article class="priority-${card.priority}"><div class="inbox-copy"><small>${confidence(card.confidence,ar)}</small><strong>${esc(card.title)}</strong><p>${esc(card.body)}</p><span>${esc(card.evidence)}</span><b>${tr(ar,"Action","الإجراء")}: ${esc(card.action)}</b></div><div class="inbox-actions"><button data-insight-snooze="${esc(card.id)}">${tr(ar,"7d snooze","تأجيل 7 أيام")}</button><button data-insight-dismiss="${esc(card.id)}">${tr(ar,"Dismiss","إخفاء")}</button></div></article>`).join("")}</div>`:`<p class="analytics-empty">${tr(ar,"No material change needs attention right now.","لا يوجد تغيير مهم يحتاج انتباهك الآن.")}</p>`}
      ${hidden?`<button class="restore-insights" data-insight-restore>${tr(ar,`Restore ${hidden} hidden insight${hidden===1?"":"s"}`,`استعادة ${hidden} ملاحظة مخفية`)}</button>`:""}
    </details>`;
  }

  function experimentsPanel(model,ar){
    const results=model.experiments;
    return `<details class="performance-card"><summary><span><small>${tr(ar,"PERSONAL OUTCOME LAB","مختبر النتائج الشخصي")}</small><strong>${tr(ar,"Behavior associations with performance","ارتباط السلوك بالأداء")}</strong></span><b>${results.length}</b></summary>
      ${results.length?`<div class="experiment-list">${results.map(item=>`<article><strong class="${item.effect<0?"warn":""}">${signed(item.effect)}%</strong><div><b>${esc(item.label)}</b><span>${item.withDays}+${item.withoutDays} ${tr(ar,"sessions","حصص")} · ${confidence(item.confidence,ar)}</span><small>${esc(item.dateRange)}</small></div></article>`).join("")}</div>`:`<p class="analytics-empty">${tr(ar,"Results require at least four comparable sessions in each group. Keep logging sleep, protein, timing, and weighted sets.","تحتاج النتائج أربع حصص قابلة للمقارنة على الأقل في كل مجموعة. استمر في تسجيل النوم والبروتين ووقت التمرين والأوزان.")}</p>`}
      <p class="analytics-boundary">${tr(ar,"Associations are exploratory and do not prove cause. Change one variable at a time.","الارتباطات استكشافية ولا تثبت السبب. غيّر متغيراً واحداً في كل مرة.")}</p>
    </details>`;
  }

  function qualityPanel(model,ar){
    const data=model.quality;
    return `<details class="performance-card data-quality-card"><summary><span><small>${tr(ar,"WHOLE-APP DATA QUALITY","جودة بيانات التطبيق")}</small><strong>${tr(ar,"Coverage, freshness, duplicates, sources","التغطية والحداثة والتكرار والمصادر")}</strong></span><b>${data.overall}%</b></summary>
      <div class="quality-domain-list">${data.domains.map(domain=>`<article><div><strong>${esc(domain.label)}</strong><span>${domain.records} ${tr(ar,"records","سجلات")}${domain.freshnessDays===null?"":` · ${domain.freshnessDays}d ${tr(ar,"old","منذ آخر سجل")}`}</span></div><b>${domain.score}%</b><i style="--value:${domain.score}%"></i></article>`).join("")}</div>
      ${data.healthSources.length?`<div class="source-provenance"><small>${tr(ar,"HEALTH SOURCE PROVENANCE","مصادر بيانات الصحة")}</small>${data.healthSources.map(item=>`<span><b>${esc(item.source)}</b><em>${item.count} ${tr(ar,"days","أيام")}</em></span>`).join("")}</div>`:""}
      ${data.warnings.length?`<ul class="quality-warnings">${data.warnings.map(item=>`<li>${esc(item)}</li>`).join("")}</ul>`:""}
    </details>`;
  }

  function answerMarkup(answer,ar){
    if(!answer)return `<p class="analytics-empty">${tr(ar,"Try: “Why is my Chest Press stalled?” or “How consistent is my protein?”","جرّب: «لماذا ثبت تمرين Chest Press؟» أو «ما مدى انتظام البروتين؟»")}</p>`;
    return `<article class="data-answer"><div><small>${confidence(answer.confidence,ar)}</small><h3>${esc(answer.title)}</h3><p>${esc(answer.summary)}</p></div>${answer.bullets.length?`<ul>${answer.bullets.map(item=>`<li>${esc(item)}</li>`).join("")}</ul>`:""}<details><summary>${tr(ar,"Evidence used","الأدلة المستخدمة")}</summary>${answer.evidence.length?answer.evidence.map(item=>`<span>${esc(item)}</span>`).join(""):`<span>${tr(ar,"No sufficient records","لا توجد سجلات كافية")}</span>`}</details><small class="analytics-boundary">${esc(answer.boundary)}</small></article>`;
  }

  function askPanel(ar){
    const answer=state.analyticsLastQuestion?engine.ask(state,state.analyticsLastQuestion):null,recent=(state.analyticsQuestions||[]).slice(0,3);
    return `<section class="performance-card ask-data"><div class="performance-head"><div><small>${tr(ar,"ASK YOUR DATA · LOCAL","اسأل بياناتك · محلي")}</small><h2>${tr(ar,"Answers grounded in your records","إجابات مبنية على سجلاتك")}</h2></div><span class="local-only">${tr(ar,"No upload","بدون رفع")}</span></div><form data-ask-data><label for="askDataQuestion">${tr(ar,"Question","السؤال")}</label><div><input id="askDataQuestion" name="question" maxlength="180" value="${esc(state.analyticsLastQuestion||"")}" placeholder="${tr(ar,"Why has my Leg Press stalled?","لماذا ثبت تقدم Leg Press؟")}" required><button>${tr(ar,"Analyze","حلّل")}</button></div></form>${recent.length?`<div class="recent-questions">${recent.map(item=>`<button data-ask-example="${esc(item)}">${esc(item)}</button>`).join("")}</div>`:""}<div data-ask-answer aria-live="polite">${answerMarkup(answer,ar)}</div></section>`;
  }

  function muscleHeatmapPanel(model,ar){
    const heatmap=model.muscleVolume||engine.muscleVolumeHeatmap(state);
    const muscles=Object.entries(heatmap);
    return `<section class="performance-card muscle-heatmap-card">
      <div class="performance-head">
        <div>
          <small>${tr(ar,"WEEKLY MUSCLE RECOVERY & VOLUME","استشفاء وحجم العضلات الأسبوعي")}</small>
          <h2>${tr(ar,"7-Day Muscle Group Stimulus","مستوى تحفيز المجموعات العضلية خلال 7 أيام")}</h2>
        </div>
        <span class="confidence-pill tone-high">${tr(ar,"Adaptive MEV/MRV","حسابات الحجم التكيفي")}</span>
      </div>
      <div class="muscle-heatmap-grid">
        ${muscles.map(([name,data])=>`
          <div class="muscle-heatmap-cell status-${data.status}" style="--tone-color:${data.color}">
            <div class="cell-head">
              <strong>${tr(ar,name,{"Chest":"الصدر","Back":"الظهر","Quads":"الأفخاذ الأمامية","Hamstrings":"الأفخاذ الخلفية","Glutes":"المؤخرة","Shoulders":"الأكتاف","Arms":"الذراعين","Core":"عضلات البطن"}[name]||name)}</strong>
              <span class="status-badge" style="color:${data.color}">${tr(ar,data.statusLabel,{"Recovered / Primed":"مستشفى / مهيأ","Optimal Stimulus":"تحفيز مثالي","High Volume":"حجم مرتفع"}[data.statusLabel]||data.statusLabel)}</span>
            </div>
            <div class="cell-body">
              <span><b>${data.sets}</b> ${tr(ar,"sets","مجموعات")}</span>
              <small>${data.volumeKg.toLocaleString()} kg</small>
            </div>
            <div class="volume-bar-bg"><div class="volume-bar-fill" style="width:${Math.min(100,(data.sets/20)*100)}%;background-color:${data.color}"></div></div>
          </div>
        `).join("")}
      </div>
    </section>`;
  }

  function renderPerformance(){
    const ar=state.lang==="ar",model=engine.analyze(state),anchor=document.querySelector(".weekly-health-review")||document.querySelector(".health-subnav")||document.querySelector(".module-head");if(!anchor)return;
    const container=document.createElement("section");container.className="performance-analytics";container.setAttribute("aria-label",tr(ar,"Performance analytics","تحليلات الأداء"));container.innerHTML=`<div class="section-title performance-title"><h2>${tr(ar,"Performance Intelligence","ذكاء الأداء")}</h2><span>${tr(ar,"Deterministic · confidence-scored · local-first","حسابات واضحة · ثقة معلنة · محلي أولاً")}</span></div>${window.REP_RECOVERY_MAP?.renderRecoveryMap(state)||""}${goalPanel(model,ar)}${muscleHeatmapPanel(model,ar)}${inboxPanel(model,ar)}${strengthPanel(model,ar)}${nutritionPanel(model,ar)}${experimentsPanel(model,ar)}${qualityPanel(model,ar)}${askPanel(ar)}`;anchor.insertAdjacentElement("afterend",container);bindPerformance(ar);
  }

  function bindPerformance(ar){
    const goalForm=document.querySelector("[data-analytics-goal]");
    goalForm?.querySelector('[name="type"]')?.addEventListener("change",event=>{state.analyticsGoal={...state.analyticsGoal,type:event.target.value,target:0};persist();renderInsights();});
    goalForm?.addEventListener("submit",event=>{event.preventDefault();const form=new FormData(event.currentTarget);state.analyticsGoal=engine.normalizeGoal({type:form.get("type"),exercise:form.get("exercise")||state.analyticsGoal.exercise,target:Number(form.get("target")),updatedAt:new Date().toISOString()});persist();renderInsights();});
    document.querySelectorAll("[data-insight-snooze]").forEach(button=>button.onclick=()=>{state.insightControls.snoozed[button.dataset.insightSnooze]=new Date(Date.now()+7*86400000).toISOString();persist();renderInsights();});
    document.querySelectorAll("[data-insight-dismiss]").forEach(button=>button.onclick=()=>{state.insightControls.dismissed[button.dataset.insightDismiss]=new Date().toISOString();persist();renderInsights();});
    document.querySelector("[data-insight-restore]")?.addEventListener("click",()=>{state.insightControls={dismissed:{},snoozed:{}};persist();renderInsights();});
    const askForm=document.querySelector("[data-ask-data]");askForm?.addEventListener("submit",event=>{event.preventDefault();const question=String(new FormData(event.currentTarget).get("question")||"").trim();if(!question)return;state.analyticsLastQuestion=question;state.analyticsQuestions=[question,...(state.analyticsQuestions||[]).filter(item=>item!==question)].slice(0,5);persist();const output=document.querySelector("[data-ask-answer]");if(output)output.innerHTML=answerMarkup(engine.ask(state,question),ar);});
    document.querySelectorAll("[data-ask-example]").forEach(button=>button.onclick=()=>{const input=document.querySelector("#askDataQuestion");if(input){input.value=button.dataset.askExample;askForm?.requestSubmit();}});
  }

  const baseInsights=renderInsights;
  renderInsights=function(){baseInsights();renderPerformance();};
  if(state.activeTab==="insights")renderInsights();
})();
