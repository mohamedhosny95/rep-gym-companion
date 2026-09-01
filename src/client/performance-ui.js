/* UI adapter for the deterministic performance-insights engine. */
(function(){
  const engine=window.REP_PERFORMANCE_INSIGHTS;if(!engine)return;
  const pct=value=>value===null||value===undefined?"—":`${Math.round(value)}%`;
  const signed=value=>value===null||value===undefined?"—":`${value>0?"+":""}${value}`;
  const confidence=value=>({high:"High confidence",medium:"Medium confidence",low:"Low confidence"}[value]||value);
  const goalName=type=>({strength:"Strength",fat_loss:"Fat loss",muscle_gain:"Muscle gain",recovery:"Recovery"}[type]||type);
  const statusCopy=goal=>{
    if(goal.status==="achieved")return {title:"Target reached",detail:"Your latest trend meets the saved target."};
    if(goal.status==="forecast")return {title:`${goal.dateRange[0]} – ${goal.dateRange[1]}`,detail:`Estimated ${goal.range[0]}–${goal.range[1]} weeks, not a promise.`};
    if(goal.status==="off_track")return {title:"Trend is not yet moving toward the target",detail:"Keep collecting data before changing more than one variable."};
    return {title:"Set a numeric target to unlock a forecast",detail:"Forecasts appear only when enough history supports a stable direction."};
  };

  function goalPanel(model){
    const goal=model.goal,saved=goal.goal,copy=statusCopy(goal),exercises=model.strength.exercises.map(item=>item.exercise),strength=saved.type==="strength",recovery=saved.type==="recovery",unit=recovery?"%":"kg";
    return `<section class="performance-card goal-forecast"><div class="performance-head"><div><small>${"GOAL FORECAST"}</small><h2>${esc(goalName(saved.type))}</h2></div><span class="confidence-pill tone-${goal.confidence}">${confidence(goal.confidence)}</span></div>
      <form data-analytics-goal class="analytics-goal-form">
        <label><span>${"Goal"}</span><select name="type">${engine.GOAL_TYPES.map(type=>`<option value="${type}" ${saved.type===type?"selected":""}>${esc(goalName(type))}</option>`).join("")}</select></label>
        ${strength?`<label><span>${"Exercise"}</span><select name="exercise">${(exercises.length?exercises:[saved.exercise]).map(name=>`<option ${name===saved.exercise?"selected":""}>${esc(name)}</option>`).join("")}</select></label>`:""}
        <label><span>${recovery?"Target readiness":"Target"} (${unit})</span><input name="target" type="number" min="1" max="${recovery?100:400}" step="0.1" value="${saved.target||""}" inputmode="decimal" required></label>
        <button type="submit">${"Save goal"}</button>
      </form>
      <div class="forecast-result"><div><small>${"CURRENT"}</small><strong>${goal.current===null?"—":`${goal.current}${goal.unit}`}</strong><span>${goal.rate===null?"Trend calibrating":`${signed(goal.rate)}${goal.unit}/${"week"}`}</span></div><div><small>${"FORECAST"}</small><strong>${esc(copy.title)}</strong><span>${esc(copy.detail)}</span></div></div>
      <div class="next-best-action"><small>${"NEXT BEST ACTION"}</small><p>${esc(goal.nextAction)}</p><span>${esc(goal.evidence)}</span></div>
    </section>`;
  }

  function sparklineSvg(records){
    if(!records||records.length<2)return "";
    const values=records.map(r=>Number(r.bestE1rm)||0),min=Math.min(...values),max=Math.max(...values),range=(max-min)||1,width=80,height=22,pad=3;
    const pts=values.map((v,i)=>{const x=Math.round(pad+(i/(values.length-1))*(width-2*pad)),y=Math.round(height-pad-((v-min)/range)*(height-2*pad));return `${x},${y}`;}).join(" ");
    const lastPt=pts.split(" ").at(-1).split(",");
    return `<svg class="lift-sparkline" viewBox="0 0 ${width} ${height}" aria-hidden="true"><polyline fill="none" stroke="var(--acid)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" points="${pts}"/><circle cx="${lastPt[0]}" cy="${lastPt[1]}" r="2.5" fill="var(--acid)"/></svg>`;
  }

  function strengthPanel(model){
    const data=model.strength,items=data.exercises.slice(0,6),muscles=Object.entries(data.muscleSets).sort((a,b)=>b[1]-a[1]);
    return `<details class="performance-card" open><summary><span><small>${"STRENGTH INTELLIGENCE"}</small><strong>${"Progress, volume, and plateaus"}</strong></span><b>${data.exercises.length}</b></summary>
      <div class="analytics-summary-grid"><span><small>${"7D VOLUME LOAD"}</small><strong>${Math.round(data.totalVolume).toLocaleString()} kg</strong><em>${data.volumeChange===null?"Needs prior week":`${signed(data.volumeChange)}%`}</em></span><span><small>${"RECENT PRs"}</small><strong>${data.prs.length}</strong><em>${confidence(data.confidence)}</em></span><span><small>${"PLATEAU FLAGS"}</small><strong>${data.plateaus.length}</strong><em>${"Rule-based"}</em></span></div>
      ${items.length?`<div class="lift-insight-list">${items.map(item=>`<article><div><strong>${esc(item.exercise)}</strong><span>${item.sessionCount} ${"sessions"} · ${confidence(item.confidence)}</span></div><div class="lift-metric-row"><b>${item.currentE1rm} <small>kg e1RM</small></b>${sparklineSvg(item.records)}</div><div class="lift-flags"><span class="${item.change28d!==null&&item.change28d<0?"warn":""}">${item.change28d===null?"28d calibrating":`${signed(item.change28d)}% / 28d`}</span>${item.plateau?`<span class="warn">${"Plateau"}</span>`:""}<span>${item.recommendation==="progress"?"Progress":"Hold"}</span></div></article>`).join("")}</div>`:`<p class="analytics-empty">${"Complete weighted sets with reps to unlock estimated 1RM trends."}</p>`}
      ${muscles.length?`<div class="muscle-volume"><small>${"HARD SETS BY MUSCLE · 7 DAYS"}</small>${muscles.map(([name,count])=>`<span><b>${esc(name)}</b><i style="--value:${Math.min(100,count/16*100)}%"></i><em>${count}</em></span>`).join("")}</div>`:""}
      <p class="analytics-boundary">${"e1RM uses the Epley estimate with reps capped at 15. It is a trend tool, not a maximal-lift instruction."}</p>
    </details>`;
  }

  function nutritionPanel(model){
    const data=model.nutrition,a7=data.adherence7,maintenance=data.maintenance;
    const metric=(label,value)=>`<span><small>${label}</small><strong>${pct(value)}</strong><i style="--value:${value||0}%"></i></span>`;
    return `<details class="performance-card" open><summary><span><small>${"NUTRITION → OUTCOMES"}</small><strong>${"Adherence and body-weight model"}</strong></span><b>${a7.loggedDays}/7</b></summary>
      <div class="adherence-grid">${metric("Calories",a7.calories)}${metric("Protein",a7.protein)}${metric("Hydration",a7.water)}</div>
      <div class="nutrition-model-grid"><div><small>${"ROBUST WEIGHT TREND"}</small><strong>${data.weightSlopePerWeek===null?"—":`${signed(data.weightSlopePerWeek)} kg/${"week"}`}</strong><span>${data.weights.length} ${"weigh-ins"}</span></div><div><small>${"ESTIMATED MAINTENANCE"}</small><strong>${maintenance?`${maintenance.low}–${maintenance.high}`:"—"}</strong><span>${maintenance?"kcal/day":"Needs 14 food days + 4 weigh-ins"}</span></div></div>
      <p class="analytics-boundary">${"Adherence is calculated only on logged days; coverage is shown separately. Maintenance is an uncertainty range, never a prescription."}</p>
    </details>`;
  }

  function inboxPanel(model){
    const cards=model.inbox,hidden=Object.keys(state.insightControls.dismissed||{}).length+Object.keys(state.insightControls.snoozed||{}).length;
    return `<details class="performance-card insight-inbox" open><summary><span><small>${"INSIGHT INBOX"}</small><strong>${"Only material changes"}</strong></span><b>${cards.length}</b></summary>
      ${cards.length?`<div class="inbox-list">${cards.map(card=>`<article class="priority-${card.priority}"><div class="inbox-copy"><small>${confidence(card.confidence)}</small><strong>${esc(card.title)}</strong><p>${esc(card.body)}</p><span>${esc(card.evidence)}</span><b>${"Action"}: ${esc(card.action)}</b></div><div class="inbox-actions"><button data-insight-snooze="${esc(card.id)}">${"7d snooze"}</button><button data-insight-dismiss="${esc(card.id)}">${"Dismiss"}</button></div></article>`).join("")}</div>`:`<p class="analytics-empty">${"No material change needs attention right now."}</p>`}
      ${hidden?`<button class="restore-insights" data-insight-restore>${`Restore ${hidden} hidden insight${hidden===1?"":"s"}`}</button>`:""}
    </details>`;
  }

  function experimentsPanel(model){
    const results=model.experiments;
    return `<details class="performance-card"><summary><span><small>${"PERSONAL OUTCOME LAB"}</small><strong>${"Behavior associations with performance"}</strong></span><b>${results.length}</b></summary>
      ${results.length?`<div class="experiment-list">${results.map(item=>`<article><strong class="${item.effect<0?"warn":""}">${signed(item.effect)}%</strong><div><b>${esc(item.label)}</b><span>${item.withDays}+${item.withoutDays} ${"sessions"} · ${confidence(item.confidence)}</span><small>${esc(item.dateRange)}</small></div></article>`).join("")}</div>`:`<p class="analytics-empty">${"Results require at least four comparable sessions in each group. Keep logging sleep, protein, timing, and weighted sets."}</p>`}
      <p class="analytics-boundary">${"Associations are exploratory and do not prove cause. Change one variable at a time."}</p>
    </details>`;
  }

  function qualityPanel(model){
    const data=model.quality;
    return `<details class="performance-card data-quality-card"><summary><span><small>${"WHOLE-APP DATA QUALITY"}</small><strong>${"Coverage, freshness, duplicates, sources"}</strong></span><b>${data.overall}%</b></summary>
      <div class="quality-domain-list">${data.domains.map(domain=>`<article><div><strong>${esc(domain.label)}</strong><span>${domain.records} ${"records"}${domain.freshnessDays===null?"":` · ${domain.freshnessDays}d ${"old"}`}</span></div><b>${domain.score}%</b><i style="--value:${domain.score}%"></i></article>`).join("")}</div>
      ${data.healthSources.length?`<div class="source-provenance"><small>${"HEALTH SOURCE PROVENANCE"}</small>${data.healthSources.map(item=>`<span><b>${esc(item.source)}</b><em>${item.count} ${"days"}</em></span>`).join("")}</div>`:""}
      ${data.warnings.length?`<ul class="quality-warnings">${data.warnings.map(item=>`<li>${esc(item)}</li>`).join("")}</ul>`:""}
    </details>`;
  }

  function answerMarkup(answer){
    if(!answer)return `<p class="analytics-empty">${"Try: “Why is my Chest Press stalled?” or “How consistent is my protein?”"}</p>`;
    return `<article class="data-answer"><div><small>${confidence(answer.confidence)}</small><h3>${esc(answer.title)}</h3><p>${esc(answer.summary)}</p></div>${answer.bullets.length?`<ul>${answer.bullets.map(item=>`<li>${esc(item)}</li>`).join("")}</ul>`:""}<details><summary>${"Evidence used"}</summary>${answer.evidence.length?answer.evidence.map(item=>`<span>${esc(item)}</span>`).join(""):`<span>${"No sufficient records"}</span>`}</details><small class="analytics-boundary">${esc(answer.boundary)}</small></article>`;
  }

  function thisWeekExecutivePanel(model){
    const weekAgo=Date.now()-7*86400000;
    const history7=state.history.filter(h=>new Date(h.date).getTime()>=weekAgo);
    const ready=window.health?.readiness ? window.health.readiness(state, (window.REP_HEALTH_COVERAGE?.dayKey()||new Date().toISOString().slice(0,10)), state.healthProfile) : {score:null,confidence:"medium"};
    const n7=model.nutrition?.adherence7||{protein:null};
    const slope=model.nutrition?.weightSlopePerWeek;
    const slopeText=slope===null?"—":`${slope>0?"+":""}${slope} kg/${"wk"}`;

    return `<section class="this-week-card" aria-label="${"This week at a glance"}">
      <div class="this-week-head">
        <small>${"THIS WEEK AT A GLANCE"}</small>
        <strong>${"Consistency & Trajectory"}</strong>
      </div>
      <div class="this-week-grid">
        <div>
          <small>${"TRAINING"}</small>
          <strong>${history7.length} ${"done"}</strong>
          <span>${"Target: 3/wk"}</span>
        </div>
        <div>
          <small>${"READINESS"}</small>
          <strong style="color:var(--acid);">${ready.score!==null?`${ready.score}%`:"—"}</strong>
          <span>${confidence(ready.confidence)}</span>
        </div>
        <div>
          <small>${"PROTEIN"}</small>
          <strong>${n7.protein!==null?`${Math.round(n7.protein)}%`:"—"}</strong>
          <span>${"Target hit"}</span>
        </div>
        <div>
          <small>${"WEIGHT RATE"}</small>
          <strong>${slopeText}</strong>
          <span>${"Robust slope"}</span>
        </div>
      </div>
    </section>`;
  }

  function askPanel(){
    const answer=state.analyticsLastQuestion?engine.ask(state,state.analyticsLastQuestion):null;
    const recent=(state.analyticsQuestions||[]).slice(0,3);
    const suggestedChips=[
      "Why has my Chest Press stalled?",
      "How did sleep below 7h affect my training?",
      "How consistent is my protein intake?",
      "What is my estimated maintenance calories?"
    ];
    return `<section class="performance-card ask-data">
      <div class="performance-head">
        <div>
          <small>${"ASK YOUR DATA · LOCAL"}</small>
          <h2>${"Answers grounded in your records"}</h2>
        </div>
        <span class="local-only">${"No upload"}</span>
      </div>
      <form data-ask-data>
        <label for="askDataQuestion">${"Question"}</label>
        <div>
          <input id="askDataQuestion" name="question" maxlength="180" value="${esc(state.analyticsLastQuestion||"")}" placeholder="${"Why has my Leg Press stalled?"}" required>
          <button>${"Analyze"}</button>
        </div>
      </form>
      <div class="prompt-chips-wrap" aria-label="${"Suggested questions"}">
        ${suggestedChips.map(chip=>`<button type="button" class="prompt-chip" data-ask-chip="${esc(chip)}">${esc(chip)}</button>`).join("")}
      </div>
      ${recent.length?`<div class="recent-questions">${recent.map(item=>`<button type="button" data-ask-example="${esc(item)}">${esc(item)}</button>`).join("")}</div>`:""}
      <div data-ask-answer aria-live="polite">${answerMarkup(answer)}</div>
    </section>`;
  }


  function renderPerformance(){
    const model=engine.analyze(state),anchor=document.querySelector(".weekly-health-review")||document.querySelector(".health-subnav")||document.querySelector(".module-head");if(!anchor)return;
    const container=document.createElement("section");container.className="performance-analytics";container.setAttribute("aria-label","Performance analytics");container.innerHTML=REP_SAFE_DOM.sanitize(`<div class="section-title performance-title"><h2>${"Performance Intelligence"}</h2><span>${"Deterministic · confidence-scored · local-first"}</span></div>${thisWeekExecutivePanel(model)}${window.REP_RECOVERY_MAP?.renderRecoveryMap(state)||""}${goalPanel(model)}${inboxPanel(model)}${strengthPanel(model)}${nutritionPanel(model)}${experimentsPanel(model)}${qualityPanel(model)}${askPanel()}`);anchor.insertAdjacentElement("afterend",container);bindPerformance();
  }

  function bindPerformance(){
    const goalForm=document.querySelector("[data-analytics-goal]");
    goalForm?.querySelector('[name="type"]')?.addEventListener("change",event=>{state.analyticsGoal={...state.analyticsGoal,type:event.target.value,target:0};persist();renderInsights();});
    goalForm?.addEventListener("submit",event=>{event.preventDefault();const form=new FormData(event.currentTarget);state.analyticsGoal=engine.normalizeGoal({type:form.get("type"),exercise:form.get("exercise")||state.analyticsGoal.exercise,target:Number(form.get("target")),updatedAt:new Date().toISOString()});persist();renderInsights();});
    document.querySelectorAll("[data-insight-snooze]").forEach(button=>button.onclick=()=>{state.insightControls.snoozed[button.dataset.insightSnooze]=new Date(Date.now()+7*86400000).toISOString();persist();renderInsights();});
    document.querySelectorAll("[data-insight-dismiss]").forEach(button=>button.onclick=()=>{state.insightControls.dismissed[button.dataset.insightDismiss]=new Date().toISOString();persist();renderInsights();});
    document.querySelector("[data-insight-restore]")?.addEventListener("click",()=>{state.insightControls={dismissed:{},snoozed:{}};persist();renderInsights();});
    const askForm=document.querySelector("[data-ask-data]");askForm?.addEventListener("submit",event=>{event.preventDefault();const question=String(new FormData(event.currentTarget).get("question")||"").trim();if(!question)return;state.analyticsLastQuestion=question;state.analyticsQuestions=[question,...(state.analyticsQuestions||[]).filter(item=>item!==question)].slice(0,5);persist();const output=document.querySelector("[data-ask-answer]");if(output)output.innerHTML=REP_SAFE_DOM.sanitize(answerMarkup(engine.ask(state,question)));});
    document.querySelectorAll("[data-ask-example]").forEach(button=>button.onclick=()=>{const input=document.querySelector("#askDataQuestion");if(input){input.value=button.dataset.askExample;askForm?.requestSubmit();}});
    document.querySelectorAll("[data-ask-chip]").forEach(button=>button.onclick=()=>{const input=document.querySelector("#askDataQuestion");if(input){input.value=button.dataset.askChip;askForm?.requestSubmit();}});
  }

  const baseInsights=renderInsights;
  renderInsights=function(){baseInsights();renderPerformance();};
  if(state.activeTab==="insights")renderInsights();
})();
