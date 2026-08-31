/* Health OS v58 intelligence, safety, and flexibility layer.
   Kept separate from the recovered v55 client so upgrades remain reviewable. */
(function(){
  const APP_SCHEMA=18,features=window.REP_FEATURES,health=window.REP_HEALTH_ENGINE,syncCenter=window.REP_SYNC_CENTER,performance=window.REP_PERFORMANCE_INSIGHTS;
  const DAY_NAMES=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const DEFAULT_SCHEDULE={
    Sunday:{morning:true,focus:"gym"},Monday:{morning:true,focus:"football"},Tuesday:{morning:true,focus:"gym"},
    Wednesday:{morning:true,focus:"padel"},Thursday:{morning:true,focus:"gym"},Friday:{morning:false,focus:"rest"},Saturday:{morning:false,focus:"activespa"}
  };
  const SCHEDULE_FOCUS_OPTIONS=["gym","football","padel","cardio","recovery","spa","rest","activespa"];
  const DEFAULT_TARGETS={
    gym:{label:"Gym Day",calories:2162,protein:176,carbs:248,fat:70,fiber:30,water:3500},
    active:{label:"Active Day",calories:1990,protein:173,carbs:202,fat:70,fiber:30,water:3200},
    flex:{label:"Flex Day",calories:2480,protein:150,carbs:0,fat:70,fiber:30,water:3000,calorieCeiling:true,proteinFloor:true}
  };
  const clone=value=>JSON.parse(JSON.stringify(value));
  const safeText=(value,max=1800)=>String(value??"").trim().slice(0,max);
  const rawSaved=window.REP_HYDRATED_STATE||(()=>{try{return JSON.parse(localStorage.getItem(storageKey)||"{}");}catch{return {};}})();
  function normalizedPreferences(value={}){
    const schedule=clone(DEFAULT_SCHEDULE),targets=clone(DEFAULT_TARGETS);
    for(const day of DAY_NAMES){const incoming=value.schedule?.[day];if(incoming){schedule[day].morning=Boolean(incoming.morning);if(SCHEDULE_FOCUS_OPTIONS.includes(incoming.focus))schedule[day].focus=incoming.focus;}}
    for(const key of Object.keys(targets)){const incoming=value.targets?.[key]||{};for(const field of ["calories","protein","carbs","fat","fiber","water"]){const n=Number(incoming[field]);if(Number.isFinite(n)&&n>=0)targets[key][field]=n;}}
    return {weightUnit:value.weightUnit==="lb"?"lb":"kg",waterUnit:value.waterUnit==="oz"?"oz":"ml",schedule,targets};
  }

  state.preferences=normalizedPreferences(rawSaved.preferences);
  state.savedMeals=Array.isArray(rawSaved.savedMeals)?rawSaved.savedMeals:[];
  state.habitOrder=Array.isArray(rawSaved.habitOrder)?rawSaved.habitOrder:[];
  state.mealQuantities=rawSaved.mealQuantities&&typeof rawSaved.mealQuantities==="object"?rawSaved.mealQuantities:{};
  state.healthView=["care","insights","vitals"].includes(rawSaved.healthView)?rawSaved.healthView:"vitals";
  state.connectionCapabilities=rawSaved.connectionCapabilities&&typeof rawSaved.connectionCapabilities==="object"?rawSaved.connectionCapabilities:null;
  state.lastSyncedAt=rawSaved.lastSyncedAt||null;
  state.healthProfile={wakeTime:/^([01]\d|2[0-3]):[0-5]\d$/.test(rawSaved.healthProfile?.wakeTime||"")?rawSaved.healthProfile.wakeTime:"04:15",baseSleepHours:Math.max(6,Math.min(10,Number(rawSaved.healthProfile?.baseSleepHours)||7.5)),baselineDays:[21,28,42].includes(Number(rawSaved.healthProfile?.baselineDays))?Number(rawSaved.healthProfile.baselineDays):28};
  state.healthMetrics=rawSaved.healthMetrics&&typeof rawSaved.healthMetrics==="object"?rawSaved.healthMetrics:{};
  state.healthSummarySignatures=rawSaved.healthSummarySignatures&&typeof rawSaved.healthSummarySignatures==="object"?rawSaved.healthSummarySignatures:{};
  state.analyticsGoal=performance?.normalizeGoal(rawSaved.analyticsGoal)||{type:"strength",exercise:"Chest Press",target:0,updatedAt:null};
  state.insightControls={dismissed:rawSaved.insightControls?.dismissed&&typeof rawSaved.insightControls.dismissed==="object"?rawSaved.insightControls.dismissed:{},snoozed:rawSaved.insightControls?.snoozed&&typeof rawSaved.insightControls.snoozed==="object"?rawSaved.insightControls.snoozed:{}};
  state.analyticsQuestions=Array.isArray(rawSaved.analyticsQuestions)?rawSaved.analyticsQuestions.map(value=>safeText(value,180)).filter(Boolean).slice(0,5):[];
  state.analyticsLastQuestion=safeText(rawSaved.analyticsLastQuestion,180);
  state.bodyMeasurements=Array.isArray(rawSaved.bodyMeasurements)?rawSaved.bodyMeasurements.slice(0,400):[];
  state.chargingPlan=rawSaved.chargingPlan&&typeof rawSaved.chargingPlan==="object"?rawSaved.chargingPlan:{time:"20:00",minutes:45};
  state.workoutChecks=rawSaved.workoutChecks&&typeof rawSaved.workoutChecks==="object"?rawSaved.workoutChecks:{};
  state.settingsSection=["general","schedule","targets","coach","sync","security"].includes(rawSaved.settingsSection)?rawSaved.settingsSection:"general";state.pairHandoff=null;state.pairHandoffBusy=false;state.undoTimer=null;state.nutritionView=["log","today","plan"].includes(rawSaved.nutritionView)?rawSaved.nutritionView:"log";state.trainingView=["today","program"].includes(rawSaved.trainingView)?rawSaved.trainingView:"today";state.wellnessExpanded=false;state.systemHealth=rawSaved.systemHealth||null;state.syncActivity=Array.isArray(rawSaved.syncActivity)?rawSaved.syncActivity.slice(0,40):[];state.syncMessage="";state.syncProgress={done:0,total:0,failed:0};state.systemSelfTest=null;

  function statePayload(){
    return {version:APP_SCHEMA,guideVersion:REP_HEALTH_GUIDE.version,activeTab:state.activeTab,healthView:state.healthView,session:state.session,index:state.index,completed:state.completed,muted:state.muted,checkin:saved.checkin||{},speed:state.speed,paused:state.paused,muscles:state.muscles,viewMode:state.viewMode,logs:state.logs,swaps:state.swaps,history:state.history,sessionStartedAt:state.sessionStartedAt,reviews:state.reviews,fieldTest:state.fieldTest,voice:state.voice,syncQueue:state.syncQueue,syncActivity:state.syncActivity,recoveryCheckins:state.recoveryCheckins,daily:state.daily,habitOrder:state.habitOrder,cardioDraft:state.cardioDraft,programStart:state.programStart,foodEntries:state.foodEntries,savedMeals:state.savedMeals,water:state.water,foodNote:state.foodNote,foodMealType:state.foodMealType,foodLogMethod:state.foodLogMethod,preferences:state.preferences,mealQuantities:state.mealQuantities,lastBackupAt:state.lastBackupAt,backupSnoozedUntil:state.backupSnoozedUntil,bodyWeights:state.bodyWeights,bodyMeasurements:state.bodyMeasurements,chargingPlan:state.chargingPlan,workoutChecks:state.workoutChecks,mealTemplates:state.mealTemplates,sleepLogs:state.sleepLogs,pushTime:state.pushTime,pushEndpoint:state.pushEndpoint,activeEnergy:state.activeEnergy,lastVitalsImportDate:state.lastVitalsImportDate,lastVitalsImportAt:state.lastVitalsImportAt,connectionCapabilities:state.connectionCapabilities,lastSyncedAt:state.lastSyncedAt,healthProfile:state.healthProfile,healthMetrics:state.healthMetrics,healthSummarySignatures:state.healthSummarySignatures,analyticsGoal:state.analyticsGoal,insightControls:state.insightControls,analyticsQuestions:state.analyticsQuestions,analyticsLastQuestion:state.analyticsLastQuestion,nutritionView:state.nutritionView,trainingView:state.trainingView,settingsSection:state.settingsSection,systemHealth:state.systemHealth};
  }
  globalThis.persist=function(){const payload=statePayload();window.REP_STORE?.persist(storageKey,payload);features?.scheduleSnapshot(payload);};
  state.syncQueue=Array.isArray(state.syncQueue)?state.syncQueue:[];
  if((Number(rawSaved.version)||0)<APP_SCHEMA){features?.createDeviceSnapshot(rawSaved).catch(()=>{});persist();}

  function showUndo(message,undo){clearTimeout(state.undoTimer);document.querySelector(".undo-bar")?.remove();const bar=document.createElement("div");bar.className="undo-bar";bar.innerHTML=REP_SAFE_DOM.sanitize(`<span>${esc(message)}</span><button>${"Undo"}</button>`);document.body.appendChild(bar);bar.querySelector("button").onclick=()=>{clearTimeout(state.undoTimer);bar.remove();undo();};state.undoTimer=setTimeout(()=>bar.remove(),6500);}
  function daySchedule(day=currentDay()){return state.preferences.schedule[day]||DEFAULT_SCHEDULE[day];}
  function focusLabel(focus){const labels={gym:"Gym",football:"Football",padel:"Padel",cardio:"Cardio Workout",recovery:"Active recovery",spa:"Spa recovery",rest:"Rest",activespa:"Active recovery + Spa"};return labels[focus]||focus;}
  function profileKey(){const focus=daySchedule().focus;return focus==="gym"?"gym":["cardio","football","padel"].includes(focus)?"active":"flex";}
  todayPlan=function(day=currentDay()){const plan=daySchedule(day),focus=focusLabel(plan.focus);return plan.morning?`${"Activation"} + ${focus}`:focus;};
  nutritionPlanKey=function(){const key=profileKey();return key==="active"?"cardio":key==="flex"?"rest":"gym";};
  foodProfile=function(){
    const type=profileKey();
    const carbCycleBadge=type==="gym"?("⚡ CARB CYCLING: HIGH (TRAINING DAY)"):(type==="active"?("⚡ CARB CYCLING: MODERATE (CARDIO)"):("⚡ CARB CYCLING: RECOVERY / REST"));
    return {...clone(state.preferences.targets[type]),carbCycleBadge,cycleType:type};
  };
  function weightLabel(kg){const n=Number(kg);if(!Number.isFinite(n))return "—";return state.preferences.weightUnit==="lb"?`${Math.round(n*22.046226)/10} lb`:`${Math.round(n*10)/10} kg`;}
  function weightInput(kg){const n=Number(kg);if(!Number.isFinite(n))return "";return state.preferences.weightUnit==="lb"?Math.round(n*22.046226)/10:Math.round(n*10)/10;}
  function weightToKg(value){const n=Number(value);return state.preferences.weightUnit==="lb"?n/2.2046226:n;}
  function waterDisplay(ml){return state.preferences.waterUnit==="oz"?`${Math.round(Number(ml||0)/2.95735)/10} fl oz`:`${Math.round(Number(ml)||0)} ml`;}
  function waterToMl(value){return state.preferences.waterUnit==="oz"?Number(value)*29.5735:Number(value);}
  window.weightLabel=weightLabel;window.weightInput=weightInput;window.weightToKg=weightToKg;window.waterDisplay=waterDisplay;window.waterToMl=waterToMl;

  saveLog=function(base,item){const id=exerciseId(base),log=normalizedLog(id,item.sets);document.querySelectorAll("[data-log-set]").forEach(input=>{const i=Number(input.dataset.logSet),field=input.dataset.log;log.sets[i][field]=field==="weight"&&state.preferences.weightUnit==="lb"?(input.value===""?"":String(Math.round(weightToKg(input.value)*100)/100)):input.value;});persistDebounced();};

  weightTrackerCard=function(){const current=currentWeekWeight(),sorted=[...state.bodyWeights].sort((a,b)=>b.week.localeCompare(a.week)),unit=state.preferences.weightUnit;const rows=sorted.slice(0,8).map((w,i)=>{const prev=sorted[i+1],delta=prev?Number(w.kg)-Number(prev.kg):null;return `<div class="weight-row"><span>${new Date(w.date).toLocaleDateString("en-GB",{day:"numeric",month:"short"})}</span><strong>${weightLabel(w.kg)}</strong><small class="${delta>0?"up":delta<0?"down":""}">${delta===null?"":`${delta>0?"+":delta<0?"−":""}${weightLabel(Math.abs(delta)).replace(/^-/,'')}`}</small><button class="quiet" data-delete-weight="${w.week}" aria-label="${"Delete"}">×</button></div>`;}).join("");return `<section class="weight-card"><div class="weight-summary"><div><small>${"BODY WEIGHT · WEEKLY"}</small><strong>${current?weightLabel(current.kg):("Not logged this week")}</strong></div></div><form class="weight-form" data-weight-form><input data-weight-input type="number" min="${unit==="lb"?66:30}" max="${unit==="lb"?660:300}" step="0.1" inputmode="decimal" placeholder="${unit}" value="${current?weightInput(current.kg):""}" aria-label="${"Body weight"} ${unit}"><button type="submit">${current?("Update"):("Save")}</button></form>${rows?`<div class="weight-history">${rows}</div>`:`<p class="weight-empty">${"Log your weight once a week to track the trend."}</p>`}</section>`;};
  waterTrackerCard=function(water,goal){const remaining=Math.max(goal-water,0),progress=goal?Math.min(Math.round(water/goal*100),100):0,oz=state.preferences.waterUnit==="oz",actions=oz?[[-8,-236.588],[8,236.588],[16,473.176],[32,946.352]]:[[-250,-250],[250,250],[500,500],[1000,1000]];return `<section class="water-card"><div class="water-summary"><div><small>${"HYDRATION"}</small><strong>${waterDisplay(water)} / ${waterDisplay(goal)}</strong><span>${waterDisplay(remaining)} ${"remaining today"}</span></div><div aria-label="${"Water goal progress"}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress}" role="progressbar">${miniRing(progress,"var(--blue)")}</div></div><div class="water-actions">${actions.map(([label,delta])=>`<button data-water-delta="${delta}">${label>0?"+":""}${label}${oz?" oz":label===1000?" ml":""}</button>`).join("")}</div><form class="water-custom" data-water-form><label><span>${"Custom amount"} (${oz?"fl oz":"ml"})</span><input data-water-custom type="number" min="1" max="${oz?676:20000}" step="${oz?0.5:1}" inputmode="decimal" placeholder="${oz?12:330}"></label><button type="submit" data-water-custom-action="add">${"Add"}</button><button type="button" data-water-custom-action="set">${"Set total"}</button></form><button class="water-reset" data-water-reset>${"Reset today's water"}</button></section>`;};
  applyCustomWater=function(mode){const input=document.querySelector("[data-water-custom]"),amount=waterToMl(input?.value);if(!input||!Number.isFinite(amount)||amount<=0||amount>20000){input?.setCustomValidity("Enter a valid amount.");input?.reportValidity();return;}input.setCustomValidity("");setFoodWater(mode==="set"?amount:(Number(state.water[isoDay()])||0)+amount);};

  function foodNotionStatus(entry){
    if(entry.notionSync==="synced"&&entry.notionUrl)return `<a class="food-sync-state is-synced" href="${esc(entry.notionUrl)}" target="_blank" rel="noopener">${"✓ Confirmed in Notion"}</a>`;
    if(entry.notionSync==="failed"){const detail=safeText(entry.notionError,120);return `<span class="food-sync-state is-failed">${`Not saved to Notion${detail?` · ${esc(detail)}`:""} · use Sync everything`}</span>`;}
    if(entry.notionSync==="syncing")return `<span class="food-sync-state is-pending">${"Saving directly to Notion…"}</span>`;
    return `<span class="food-sync-state">${"Saved on this device only"}</span>`;
  }
  foodEntryCard=function(entry){const time=new Date(entry.date).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"});return `<article class="food-entry"><div><small>${esc(entry.mealType||"Meal")} · ${time} · ${esc(entry.logMethod||"Note")}</small><strong>${esc(entry.food_name||entry.rawNote||"Meal note")}</strong><span>${esc(entry.rawNote||entry.portion_size||"")}</span>${foodNotionStatus(entry)}</div><div class="food-entry-macros"><b>${Math.round(Number(entry.calories)||0)} kcal</b><em>P ${Math.round(Number(entry.protein_g)||0)} · C ${Math.round(Number(entry.carbs_g)||0)} · F ${Math.round(Number(entry.fat_g)||0)}</em></div><div class="food-entry-actions"><button data-save-template="${esc(entry.id)}">${"☆ Save as template"}</button><button class="danger" data-delete-food="${esc(entry.id)}">${"Delete"}</button></div></article>`;};
  saveFoodDraft=function(){const d=state.foodDraft;if(!d)return;document.querySelectorAll("[data-food-text]").forEach(input=>d[input.dataset.foodText]=String(input.value||"").trim());document.querySelectorAll("[data-food-macro]").forEach(input=>d[input.dataset.foodMacro]=Math.max(0,Number(input.value)||0));const entry={...d,id:`food-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,date:new Date().toISOString(),mealType:d.mealType||state.foodMealType,logMethod:d.logMethod||state.foodLogMethod,rawNote:d.rawNote||state.foodNote||d.food_name,notionSync:"syncing",notionUrl:"",notionSyncedAt:null};state.foodEntries.unshift(entry);state.foodEntries=state.foodEntries.slice(0,400);state.foodDraft=null;state.foodPendingPayload=null;state.foodNote="";state.foodError=false;state.foodStatus="Saved on this device and saving directly to Notion.";queueHealth("food",entry);queueNutritionSummary();persist();renderNutrition();};

  function portion(id){return Math.max(.25,Math.min(10,Number(state.mealQuantities[id])||1));}
  function mealKey(item){return `${String(item.food_name||item.rawNote||"").toLowerCase()}|${Math.round(Number(item.calories)||0)}`;}
  function recentMeals(){const seen=new Set(),result=[];for(const entry of state.foodEntries.slice(0,100)){const key=mealKey(entry);if(!seen.has(key)){seen.add(key);result.push(entry);}if(result.length===8)break;}return result;}
  function quickMealCard(item,favorite){const qty=portion(item.id);return `<article class="quick-meal"><div><small>${favorite?("FAVORITE"):("RECENT")}</small><strong>${esc(item.food_name||item.rawNote||"Meal")}</strong><span>${Math.round((Number(item.calories)||0)*qty)} kcal · P ${Math.round((Number(item.protein_g)||0)*qty)}g</span></div><div class="portion-stepper"><button data-portion-id="${esc(item.id)}" data-portion-delta="-.25" aria-label="Decrease portion">−</button><b>${qty}×</b><button data-portion-id="${esc(item.id)}" data-portion-delta=".25" aria-label="Increase portion">+</button></div><button class="quick-log" data-quick-log="${esc(item.id)}" data-quick-kind="${favorite?"favorite":"recent"}">${"Log"}</button>${favorite?`<button class="quiet" data-remove-favorite="${esc(item.id)}">${"Remove"}</button>`:""}</article>`;}
  function relogMeal(source,qty){if(!source)return;const scaled={...source};for(const key of ["calories","protein_g","carbs_g","fat_g","fiber_g","sugar_g","sodium_mg","estimated_weight_g"])scaled[key]=Math.round((Number(source[key])||0)*qty*10)/10;delete scaled.id;delete scaled.date;state.foodDraft={...scaled,rawNote:source.rawNote||source.food_name,mealType:state.foodMealType||autoMealType(),logMethod:"Re-log",source:"Saved meal"};state.foodStatus="Review the portion, then confirm.";renderNutrition();document.querySelector(".analysis-card")?.scrollIntoView({behavior:"smooth",block:"center"});}
  function saveFavorite(id){const source=state.foodEntries.find(item=>item.id===id);if(!source||state.savedMeals.some(item=>mealKey(item)===mealKey(source)))return;state.savedMeals.unshift({...source,id:`fav-${Date.now()}-${Math.random().toString(36).slice(2,6)}`});state.savedMeals=state.savedMeals.slice(0,30);persist();renderNutrition();}
  function removeFavorite(id){const index=state.savedMeals.findIndex(item=>item.id===id),removed=state.savedMeals[index];if(!removed)return;state.savedMeals.splice(index,1);persist();renderNutrition();showUndo("Favorite removed.",()=>{state.savedMeals.splice(index,0,removed);persist();renderNutrition();});}
  const baseRenderNutrition=renderNutrition;
  renderNutrition=function(){
    baseRenderNutrition();
    const recent=recentMeals(),anchor=document.querySelector(".food-log")?.previousElementSibling;
    const sections=[];
    if(state.savedMeals.length)sections.push(`<div class="food-section-head" data-nutrition-section="log"><h2>${"Favorite meals"}</h2><span>${"adjust portion, then log"}</span></div><section class="quick-meals">${state.savedMeals.map(item=>quickMealCard(item,true)).join("")}</section>`);
    if(recent.length)sections.push(`<div class="food-section-head" data-nutrition-section="log"><h2>${"Recent meals"}</h2><span>${"quick re-log"}</span></div><section class="quick-meals">${recent.map(item=>quickMealCard(item,false)).join("")}</section>`);
    if(anchor&&sections.length)anchor.insertAdjacentHTML("beforebegin",REP_SAFE_DOM.sanitize(sections.join("")));
    const todayEntries=todayFoodEntries(),savedKeys=new Set(state.savedMeals.map(mealKey));
    document.querySelectorAll(".food-entry").forEach((card,index)=>{
      const entry=todayEntries[index],actions=card.querySelector(".food-entry-actions");
      if(entry&&actions&&!actions.querySelector("[data-save-favorite]")){
        const button=document.createElement("button");
        button.dataset.saveFavorite=entry.id;
        const isFav=savedKeys.has(mealKey(entry));
        button.textContent=isFav?("★ Favorite"):("☆ Favorite");
        button.disabled=isFav;
        actions.prepend(button);
      }
    });
    document.querySelectorAll("[data-save-favorite]").forEach(button=>button.onclick=()=>saveFavorite(button.dataset.saveFavorite));
    document.querySelectorAll("[data-portion-id]").forEach(button=>button.onclick=()=>{const id=button.dataset.portionId;state.mealQuantities[id]=Math.max(.25,Math.min(10,Math.round((portion(id)+Number(button.dataset.portionDelta))*4)/4));persist();renderNutrition();});
    document.querySelectorAll("[data-quick-log]").forEach(button=>{button.onclick=()=>{const list=button.dataset.quickKind==="favorite"?state.savedMeals:state.foodEntries,source=list.find(item=>item.id===button.dataset.quickLog);relogMeal(source,portion(source?.id));};});
    document.querySelectorAll("[data-remove-favorite]").forEach(button=>button.onclick=()=>removeFavorite(button.dataset.removeFavorite));
    const weightForm=document.querySelector("[data-weight-form]");
    if(weightForm)weightForm.onsubmit=e=>{e.preventDefault();const input=document.querySelector("[data-weight-input]"),kg=weightToKg(input.value);if(!Number.isFinite(kg)||kg<30||kg>300){input.setCustomValidity("Enter a valid body weight.");input.reportValidity();return;}input.setCustomValidity("");saveBodyWeight(kg);renderNutrition();};
    const reset=document.querySelector("[data-water-reset]");
    if(reset)reset.onclick=()=>{const previous=Number(state.water[isoDay()])||0;if(!previous)return;setFoodWater(0);showUndo("Today's water was reset.",()=>setFoodWater(previous));};
    organizeNutrition();
  };
  function organizeNutrition(){
    const profile=document.querySelector(".food-profile"),shell=window.REP_UI_SHELL;if(!profile)return;
    document.querySelector("[data-food-note]")?.setAttribute("aria-label","Meal description");
    let nav=document.querySelector(".module-subnav[data-nav-for='nutrition']");
    if(!nav){
      nav=document.createElement("nav");nav.className="module-subnav";nav.dataset.navFor="nutrition";nav.setAttribute("aria-label","Nutrition sections");nav.innerHTML=REP_SAFE_DOM.sanitize([["log","Log"],["today","Today"],["plan","Plan"]].map(([id,label])=>`<button data-nutrition-view="${id}" class="${state.nutritionView===id?"is-active":""}">${label}</button>`).join(""));profile.insertAdjacentElement("afterend",nav);
      nav.querySelectorAll("[data-nutrition-view]").forEach(button=>button.onclick=()=>{state.nutritionView=button.dataset.nutritionView;persist();renderNutrition();});
    }
    const mark=(selector,view)=>document.querySelectorAll(selector).forEach(el=>{if(el)el.dataset.nutritionSection=view;});
    mark(".macro-dashboard, .supplement-card, .water-card, .food-log, .reminder-strip, .food-section-head", "today");
    mark(".meal-composer, .analysis-card, .meal-templates, .quick-meals", "log");
    mark(".weight-card, .nutrition-plan-note, .food-connect", "plan");
    const connection=document.querySelector(".food-connect");if(connection){connection.dataset.nutritionSection="plan";connection.hidden=state.nutritionView!=="plan"&&!state.foodPendingPayload;}
    document.querySelectorAll("[data-nutrition-section]").forEach(element=>{if(element!==connection)element.hidden=element.dataset.nutritionSection!==state.nutritionView;});
    const header=document.querySelector(".food-head"),disclosure=header?.querySelector(".integration-disclosure");if(disclosure){const details=shell?.disclose(disclosure,{label:"How nutrition estimates and AI work",className:"nutrition-disclosure"});const guide=header.querySelector(".guide-version");if(details&&guide)details.insertBefore(guide,disclosure);}
    if(state.nutritionView==="log"&&!localStorage.getItem(syncKeyStorage)&&!state.foodPendingPayload){const banner=document.createElement("button");banner.className="connection-banner";banner.type="button";banner.innerHTML=REP_SAFE_DOM.sanitize(`<span><strong>${"AI analysis is not connected"}</strong><small>${"Save a note now or set it up once"}</small></span><b>${"Set up"} →</b>`);banner.onclick=()=>{state.nutritionView="plan";persist();renderNutrition();};nav.insertAdjacentElement("afterend",banner);}
  }
  deleteFoodEntry=function(id){const index=state.foodEntries.findIndex(entry=>entry.id===id),entry=state.foodEntries[index];if(!entry)return;state.foodEntries.splice(index,1);queueNutritionSummary();persist();renderNutrition();showUndo("Meal deleted.",()=>{state.foodEntries.splice(index,0,entry);queueNutritionSummary();persist();renderNutrition();});};

  updatePrimaryTabs=function(){
    document.querySelectorAll("[data-app-tab]").forEach(button=>{
      const tab=button.dataset.appTab;
      const active=tab==="health"?["care","vitals"].includes(state.activeTab)||state.activeTab==="health":tab==="insights"?state.activeTab==="insights":tab===state.activeTab;
      button.setAttribute("aria-current",active?"page":"false");
      const labels={home:"Today",train:"Training",food:"Nutrition",health:"Health",insights:"Insights"};
      const span=button.querySelector("span");
      if(span)span.textContent=labels[tab]||tab;
    });
    
    const paletteLabel=document.querySelector("#commandPaletteButton span");if(paletteLabel)paletteLabel.textContent="Command palette";
    const previewLabel=document.querySelector("#previewModeButton span");if(previewLabel)previewLabel.textContent="Preview mode";
  };
  setPrimaryTab=function(tab){
    if(tab==="health")tab=state.healthView==="care"?"care":"vitals";
    state.activeTab=tab;persistDebounced();updatePrimaryTabs();
    if(tab==="home")renderOverview();
    else if(tab==="food")renderNutrition();
    else if(tab==="care")renderHygiene();
    else if(tab==="insights")renderInsights();
    else if(tab==="vitals")renderVitals();
    else renderHome();
    focusViewHeading();
    if(navigator.onLine&&localStorage.getItem(syncKeyStorage)&&typeof fetchPendingVitals==="function")setTimeout(()=>{fetchPendingVitals(false).catch(()=>{});},100);
  };
  function healthNav(){const items=[["vitals","Vitals"],["care","Wellness"],["insights","Trends"]];const nav=document.createElement("nav");nav.className="health-subnav";nav.setAttribute("aria-label","Health sections");nav.innerHTML=REP_SAFE_DOM.sanitize(items.map(([id,label])=>`<button data-health-view="${id}" class="${state.healthView===id?"is-active":""}">${label}</button>`).join(""));const header=app.querySelector(".module-head,.recovery-head");header?.insertAdjacentElement("afterend",nav);nav.querySelectorAll("[data-health-view]").forEach(button=>button.onclick=()=>setPrimaryTab(button.dataset.healthView));}
  const confidenceLabel=value=>({high:"High confidence",medium:"Medium confidence",low:"Low confidence"}[value]||value);
  function coachCard(compact=false){
    const ready=health.readiness(state,isoDay(),state.healthProfile),training=health.trainingRecommendation(state,isoDay(),state.healthProfile,ready),quality=health.dataQuality(state,isoDay(),state.healthProfile,ready),bed=health.bedtime(state,isoDay(),state.healthProfile),tone=ready.band||"unknown";
    const score=ready.score===null?"—":`${ready.score}%`,why=ready.reasons.length?ready.reasons:(["Log sleep and a recovery check-in to build a personal recommendation."]);
    return `<section class="health-coach-card tone-${tone} ${compact?"is-compact":""}"><div class="health-coach-head"><div><small>${"TODAY COACH"}</small><h2>${training.title}</h2></div><div class="readiness-score"><strong>${score}</strong><span>${confidenceLabel(ready.confidence)}</span></div></div><p>${training.detail}</p><div class="coach-reasons">${why.map(reason=>`<span>${esc(reason)}</span>`).join("")}</div>${compact?"":`<div class="coach-grid"><div><small>${"BEDTIME"}</small><strong>${bed.time}</strong><span>${`for ${bed.wakeTime} wake-up`}</span></div><div><small>${"DATA COVERAGE"}</small><strong>${ready.coverage}%</strong><span>${quality.needsImport?("import needs attention"):("import is current")}</span></div></div><details><summary>${"How this was calculated"}</summary>${ready.components.map(item=>`<div class="component-row ${item.available?"":"is-missing"}"><span>${esc(item.label)}</span><strong>${item.available?`${item.value}%`:"—"}</strong><small>${esc(item.detail)}</small></div>`).join("")}<p class="medical-boundary">${"General wellness guidance, not a diagnosis. Never ignore symptoms because of a score."}</p></details>`}</section>`;
  }
  function importQualityCard(){const quality=health.dataQuality(state,isoDay(),state.healthProfile),metrics=state.healthMetrics?.[isoDay()]||{},last=quality.lastImportDays===null?("Never imported"):quality.lastImportDays===0?("Today"):(`${quality.lastImportDays}d ago`);return `<section class="health-quality-card"><div><small>${"DATA PIPELINE"}</small><h2>${quality.needsImport?("Finish automatic connection"):("Data is current")}</h2><p>${"Detailed history stays on this device; only daily summaries are sent to Notion."}</p></div><div class="quality-facts"><span><b>${last}</b>${"Last import"}</span><span><b>${quality.baselineNights}</b>${"Baseline nights"}</span><span><b>${metrics.steps?Number(metrics.steps).toLocaleString():"—"}</b>${"Steps today"}</span></div><button data-health-import-check>${"Check for new data"}</button><a href="https://github.com/mohamedhosny95/rep-gym-companion/tree/main/ios/RepHealthCompanion" target="_blank" rel="noopener">${"Set up the native Apple Health bridge ↗"}</a></section>`;}
  function weeklyReviewCard(){const review=health.weeklyReview(state,isoDay(),state.healthProfile);return `<section class="weekly-health-review"><div class="weekly-review-head"><div><small>${"7-DAY HEALTH REVIEW"}</small><h2>${esc(review.headline)}</h2></div><strong>${review.averageReadiness===null?"—":`${review.averageReadiness}%`}</strong></div><div class="weekly-review-grid"><span><b>${review.averageSleep===null?"—":`${review.averageSleep}h`}</b>${"Avg sleep"}</span><span><b>${review.sessions}</b>${"Sessions"}</span><span><b>${review.totalStrain}</b>${"Total strain"}</span><span><b>${review.daysLogged}/7</b>${"Reliable days"}</span></div><p>${esc(review.action)}</p>${review.experiments.length?`<div class="experiment-results">${review.experiments.map(item=>`<span><b>${item.effect>0?"+":""}${item.effect}pp</b> ${esc(item.label)} · ${"next-day association"}</span>`).join("")}</div>`:`<div class="experiment-empty">${"Log each habit at least 4 days with and without it to reveal next-day associations."}</div>`}<small class="association-note">${"Association does not prove causation. Change one habit at a time for two weeks."}</small></section>`;}
  if(health){
    computeRecoveryScore=function(date=isoDay()){const result=health.readiness(state,date,state.healthProfile);return result.score===null?null:{score:result.score,band:result.band,calibrating:result.calibrating,confidence:result.confidence,components:result.components};};
    computeStrainScore=function(date=isoDay()){return health.strain(state,date);};
    computeBedtimeSuggestion=function(){return health.bedtime(state,isoDay(),state.healthProfile);};
    journalInsightsCard=function(){const findings=health.experiments(state,state.healthProfile);return `<section class="insights-card journal-insights"><div class="insights-head"><small>${"BEHAVIOR EXPERIMENTS"}</small></div>${findings.length?findings.map(item=>`<div class="journal-correlation"><strong class="${item.effect>=0?"down":"up"}">${item.effect>0?"+":""}${item.effect}pp</strong><p>${esc(item.label)} · ${"association with next-day readiness"} (${item.withDays}+${item.withoutDays} ${"days"})</p></div>`).join(""):`<p class="journal-empty">${"Log habits daily. No result appears until both groups contain at least 4 reliable days."}</p>`}<small class="association-note">${"Personal, non-medical observation; not proof of cause."}</small></section>`;};
  }
  const baseApplyVitalsEntry=applyVitalsEntry;
  applyVitalsEntry=function(entry){const report=baseApplyVitalsEntry(entry),date=entry.date||isoDay(),fields=["steps","exercise_minutes","stand_minutes","vo2_max","oxygen_saturation_pct","wrist_temperature_c","sleep_deep_hours","sleep_rem_hours","coverage_minutes","heart_rate_samples","workout_hr_samples","watch_battery_pct","source"];state.healthMetrics[date]={...(state.healthMetrics[date]||{})};for(const field of fields)if(entry[field]!==null&&entry[field]!==undefined&&entry[field]!=="")state.healthMetrics[date][field]=entry[field];return report;};
  const baseFetchPendingVitals=fetchPendingVitals;
  fetchPendingVitals=async function(showStatus=false){await baseFetchPendingVitals(showStatus);const date=state.lastVitalsImportDate,entry=state.sleepLogs.find(item=>item.date===date);if(!date||!entry)return;const ready=health.readiness(state,date,state.healthProfile),training=health.trainingRecommendation(state,date,state.healthProfile),metrics=state.healthMetrics?.[date]||{},summary=[`Readiness ${ready.score===null?"not available":`${ready.score}%`} (${ready.confidence} confidence, ${ready.coverage}% coverage)`,`Strain ${health.strain(state,date)}`,`Coach: ${training.title}`,metrics.steps?`Steps ${Math.round(metrics.steps)}`:"",metrics.vo2_max?`VO₂ max ${metrics.vo2_max}`:"","Wellness estimate; not a diagnosis."].filter(Boolean).join(" · "),signature=JSON.stringify([entry.hours,entry.hrv,entry.rhr,entry.resp,metrics,summary]);if(state.healthSummarySignatures[date]===signature)return;state.healthSummarySignatures[date]=signature;queueHealth("sleep",{date,sleep:entry.hours,notes:summary});};
  const baseVitals=renderVitals,baseCare=renderHygiene,baseInsights=renderInsights,baseOverview=renderOverview,baseTrainingHome=renderHome;
  renderVitals=function(){state.healthView="vitals";baseVitals();healthNav();document.querySelector(".health-subnav")?.insertAdjacentHTML("afterend",REP_SAFE_DOM.sanitize(`${coachCard()}${importQualityCard()}`));document.querySelector("[data-health-import-check]")?.addEventListener("click",()=>fetchPendingVitals(true));};
  function organizeWellness(){
    const hour=new Date().getHours(),current=hour<12?("Morning"):hour<18?("Post-workout"):("Evening");const cards=[...document.querySelectorAll(".module-card")];
    if(!state.wellnessExpanded)cards.forEach(card=>{const title=card.querySelector("h2")?.textContent||"";card.hidden=Boolean(title)&&title!==current&&!/Hair/i.test(title);});
    const reference=document.querySelector("[data-view-care-plan]");if(reference&&!document.querySelector("[data-wellness-expand]")){const button=document.createElement("button");button.className="wellness-expand";button.dataset.wellnessExpand="";button.textContent=state.wellnessExpanded?("Show current routine"):("Show full daily routine");button.onclick=()=>{state.wellnessExpanded=!state.wellnessExpanded;renderHygiene();};reference.insertAdjacentElement("beforebegin",button);}
  }
  renderHygiene=function(){state.healthView="care";baseCare();healthNav();organizeWellness();};
  renderInsights=function(){state.healthView="insights";baseInsights();healthNav();(document.querySelector(".trends-grid")||document.querySelector(".health-subnav"))?.insertAdjacentHTML("afterend",REP_SAFE_DOM.sanitize(weeklyReviewCard()));};
  renderOverview=function(){baseOverview();const anchor=document.querySelector(".vitals-trio");anchor?.insertAdjacentHTML("afterend",REP_SAFE_DOM.sanitize(coachCard(true)));};
  function organizeTraining(){
    const hero=document.querySelector(".hero");if(!hero)return;
    let nav=document.querySelector(".module-subnav[aria-label*='Training']");
    if(!nav){
      nav=document.createElement("nav");nav.className="module-subnav";nav.setAttribute("aria-label","Training sections");
      nav.innerHTML=REP_SAFE_DOM.sanitize([["today","Today"],["program","Program"],["history","History"]].map(([id,label])=>`<button data-training-view="${id}" class="${state.trainingView===id?"is-active":""}">${label}</button>`).join(""));
      hero.insertAdjacentElement("afterend",nav);
    }
    document.querySelector(".install-card")?.remove();
    const sessionGrid=document.querySelector(".session-grid:not(.training-tools)"),weekly=document.querySelector(".weekly"),toolsTitle=document.querySelector(".training-tools-title"),tools=document.querySelector(".training-tools");
    let advanced=document.querySelector(".training-advanced");
    if(toolsTitle&&tools&&!advanced){
      advanced=document.createElement("details");advanced.className="training-advanced";advanced.innerHTML=REP_SAFE_DOM.sanitize(`<summary>${"Tools & safety"}</summary>`);
      toolsTitle.insertAdjacentElement("beforebegin",advanced);advanced.append(toolsTitle,tools);
    }
    if(sessionGrid)sessionGrid.hidden=state.trainingView!=="program";
    if(weekly)weekly.hidden=state.trainingView!=="program";
    if(advanced)advanced.hidden=state.trainingView!=="program";
    document.querySelectorAll(".vitals-teaser,.today-strip,.health-status,.reminder-strip,.health-coach-card").forEach(el=>{el.hidden=state.trainingView!=="today";});
    if(state.trainingView==="today"){
      const focus=daySchedule().focus,id=["gym","football","padel","cardio"].includes(focus)?focus:"bad";
      document.querySelector(".today-training-action")?.remove();
      const card=document.createElement("section");card.className="today-training-action";card.innerHTML=REP_SAFE_DOM.sanitize(`<small>${"NEXT ACTION"}</small><h2>${esc(todayPlan())}</h2><p>${"Start today's plan, or choose cardio when there is no football or padel."}</p><div class="today-training-actions"><button data-start-today data-session-id="${id}">${"Start today's plan"}</button>${id!=="cardio"?`<button class="today-cardio-fallback" data-start-cardio-fallback data-session-id="cardio">${"No game? Choose cardio"}</button>`:""}</div>`);
      nav.insertAdjacentElement("afterend",card);
      card.querySelector("[data-start-today]").onclick=()=>showSessionPreview(id);
      const cardioFallback=card.querySelector("[data-start-cardio-fallback]");if(cardioFallback)cardioFallback.onclick=()=>showSessionPreview("cardio");
    } else if(state.trainingView==="program"){
      const focus=daySchedule().focus,recommendedId=["morning","gym","football","padel","general","cardio"].includes(focus)?focus:"morning";
      const recommended=document.querySelector(`[data-session="${recommendedId}"]`);
      recommended?.classList.add("is-recommended");
      recommended?.insertAdjacentHTML("afterbegin",REP_SAFE_DOM.sanitize(`<span class="session-recommended-badge">${"TODAY'S PLAN"}</span>`));
      const discovery=document.createElement("section");discovery.className="program-discovery";
      discovery.innerHTML=REP_SAFE_DOM.sanitize(`<div class="program-discovery-head"><div><small>${"WORKOUT LIBRARY"}</small><h2>${"Choose your environment"}</h2><p>${"Every plan stays connected to your real exercises, progress, and history."}</p></div><span>${Object.keys(sessions).filter(id=>!["bad","gymLite"].includes(id)).length} ${"plans"}</span></div><div class="program-filter-row" role="group" aria-label="${"Filter workout plans"}">${[["all","All"],["gym","Gym"],["home","Home"],["sport","Sport"],["cardio","Cardio"]].map(([id,label],index)=>`<button type="button" data-program-filter="${id}" class="${index===0?"is-active":""}" aria-pressed="${index===0}">${label}</button>`).join("")}</div>`);
      nav.insertAdjacentElement("afterend",discovery);
      const applyFilter=filter=>{
        sessionGrid?.querySelectorAll("[data-session]").forEach(card=>{card.hidden=filter!=="all"&&card.dataset.programCategory!==filter;});
        const logActivity=sessionGrid?.querySelector("[data-log-activity]");if(logActivity)logActivity.hidden=filter!=="all";
        discovery.querySelectorAll("[data-program-filter]").forEach(button=>{const active=button.dataset.programFilter===filter;button.classList.toggle("is-active",active);button.setAttribute("aria-pressed",String(active));});
      };
      discovery.querySelectorAll("[data-program-filter]").forEach(button=>button.onclick=()=>applyFilter(button.dataset.programFilter));
      const exporterCard=document.createElement("details");exporterCard.className="settings-card program-exporter-card";
      exporterCard.innerHTML=REP_SAFE_DOM.sanitize(`<summary><span><small>${"PROGRAM TOOLS"}</small><strong>${"Share & export your plan"}</strong></span><b>+</b></summary><div class="program-exporter-body"><p>${"Export your training split, exercise list, and target sets as a portable digital routine card."}</p><div><button class="settings-primary" data-export-program>${"📤 Export Program (JSON)"}</button><button class="quiet-setting" data-share-program>${"🔗 Copy Share Link"}</button><button class="quiet-setting" data-export-report-card>${"📄 Export Mesocycle PDF"}</button></div></div>`);
      sessionGrid?.insertAdjacentElement("afterend",exporterCard);
      exporterCard.querySelector("[data-export-program]")?.addEventListener("click",()=>{
        const exportData={app:"Rep Gym Companion",type:"mesocycle-program",version:1,exportedAt:new Date().toISOString(),schedule:state.preferences.schedule,sessions:window.sessions||{}};
        features.downloadJson(exportData,`rep-training-program-${Date.now()}.json`);
      });
      exporterCard.querySelector("[data-share-program]")?.addEventListener("click",()=>{
        if(navigator.clipboard){
          const shareUrl=`${window.location.origin}${window.location.pathname}#program-active`;
          navigator.clipboard.writeText(shareUrl).then(()=>showToast("Program link copied!"));
        }
      });
      exporterCard.querySelector("[data-export-report-card]")?.addEventListener("click",()=>{
        window.REP_REPORT_CARD?.openPrintableReport(state);
      });
    }
    nav.querySelectorAll("[data-training-view]").forEach(button=>button.onclick=()=>{if(button.dataset.trainingView==="history")return renderHistory();state.trainingView=button.dataset.trainingView;persist();renderHome();});
  }
  renderHome=function(){
    baseTrainingHome();
    const anchor=document.querySelector(".health-status");
    anchor?.insertAdjacentHTML("afterend",REP_SAFE_DOM.sanitize(coachCard(true)));
    organizeTraining();
  };

  // The single source of truth for pairing-key validation (app.js declares
  // no version of these — see the comment there).
  async function validatePairingCredential(key){const response=await fetch("/api/pair-check",{method:"POST",headers:{"x-rep-sync-key":key}}),data=await response.json().catch(()=>({}));if(!response.ok||!data.ok)throw Error(data.error||`Connection check failed (${response.status})`);return data;}
  window.validatePairingKey=validatePairingCredential;
  window.connectPairingKey=async function(input,requireFoodAi=false){const key=input?.value.trim();if(!key||key.length<32){state.pairMessage="Enter a random pairing key with at least 32 characters.";refreshConnectionUI();return false;}state.pairBusy=true;state.pairMessage="";refreshConnectionUI();try{const caps=await validatePairingCredential(key);if(requireFoodAi&&!caps.foodAi)throw Error("Food AI is not enabled.");state.connectionCapabilities={foodAi:Boolean(caps.foodAi),notion:Boolean(caps.notion),vitalsAi:Boolean(caps.vitalsAi),push:Boolean(caps.push)};repAuth.markPaired();state.syncState="idle";input.value="";persist();setTimeout(()=>probeSystemHealth(state.view==="nutrition"),0);return true;}catch(error){state.syncState="auth";state.pairMessage=String(error.message||error);return false;}finally{state.pairBusy=false;refreshConnectionUI();}};
  syncStatusText=function(){const key=localStorage.getItem(syncKeyStorage),caps=state.connectionCapabilities,progress=state.syncProgress||{};if(state.pairBusy)return "Checking connection…";if(!key)return state.syncState==="auth"?("Pair this device again"):("One-time connection needed");if(state.syncState==="syncing")return `Saving directly ${progress.done||0}/${progress.total||0}…`;if(caps&&caps.notion===false)return caps.foodAi?("AI ready · Notion not configured"):("Services not configured");if(state.syncState==="failed")return state.syncMessage||("A direct save failed");if(state.lastSyncedAt)return `Synced ${new Date(state.lastSyncedAt).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}`;return caps?.foodAi?("AI ready · direct sync"):("Device paired persistently");};
  window.REP_SYNC_RUNTIME?.install();
  foodConnectionCard=function(){const connected=Boolean(localStorage.getItem(syncKeyStorage)),caps=state.connectionCapabilities||{},notionHealthy=caps.notionHealthy;return `<section class="food-connect ${connected?"is-connected":"is-needed"}" aria-live="polite"><div class="food-connect-head"><span class="food-connect-icon">${connected?"✓":"N"}</span><div><small>${connected?("DEVICE PAIRED"):("ONE-TIME SETUP")}</small><strong>${connected?("Your services"):("Connect here")}</strong><span data-sync-status>${esc(state.pairMessage||syncStatusText())}</span></div></div>${connected?`<div class="capability-row"><span class="${caps.foodAi?"ready":"off"}">${"Food AI"} ${caps.foodAi?"✓":"—"}</span><span class="${notionHealthy===true?"ready":notionHealthy===false?"error":"checking"}">Notion ${notionHealthy===true?"✓":notionHealthy===false?"!":"…"}</span><span class="${caps.vitalsAi?"ready":"off"}">${"Vitals AI"} ${caps.vitalsAi?"✓":"—"}</span></div><div class="food-connect-actions"><button class="quiet" data-food-disconnect>${"Unpair this device"}</button></div>`:`<p>${"Enter the pairing key once. This device stays paired until you revoke it or clear site data; the master key is never stored."}</p><form class="food-pair-form" data-food-pair-form autocomplete="off"><input data-food-pair-key type="password" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="${"Paste pairing key"}" aria-label="${"App pairing key"}"><button data-food-pair-submit ${state.pairBusy?"disabled":""}>${state.pairBusy?("Checking…"):("Connect & continue")}</button></form>`}</section>`;};
  const baseForget=forgetPairingKey;forgetPairingKey=async function(){state.connectionCapabilities=null;state.lastSyncedAt=null;await baseForget();};

  function applyThemeSettings(){
    const mode=state.preferences?.themeMode||"default",accent=state.preferences?.themeAccent||"acid";
    if(mode==="oled")document.documentElement.setAttribute("data-theme","oled");
    else document.documentElement.removeAttribute("data-theme");
    if(accent&&accent!=="acid")document.documentElement.setAttribute("data-accent",accent);
    else document.documentElement.removeAttribute("data-accent");
  }
  window.applyThemeSettings=applyThemeSettings;
  applyThemeSettings();

  function settingsNav(active){return `<nav class="settings-nav" aria-label="${"Settings sections"}">${[["general","General"],["schedule","Schedule"],["targets","Targets"],["coach","Coach"],["sync","Sync"],["security","Security"]].map(([id,label])=>`<button data-settings-tab="${id}" class="${active===id?"is-active":""}">${label}</button>`).join("")}</nav>`;}
  function pwaInstallCard(){
    const isStandalone=window.navigator.standalone===true||window.matchMedia('(display-mode: standalone)').matches;
    if(isStandalone)return `<section class="settings-card" style="border-color:rgba(201,255,61,.3);background:linear-gradient(145deg,rgba(201,255,61,.06),var(--panel));"><small style="color:var(--acid);font-weight:900;">${"INSTALLED APP"}</small><h2>${"Health OS is running as a Standalone PWA"}</h2><p style="margin:0;color:var(--muted);font-size:11px;">✓ ${"Full screen with fast offline caching and no browser bar."}</p></section>`;
    return `<section class="settings-card pwa-install-card" style="border-color:rgba(125,201,255,.3);background:linear-gradient(145deg,rgba(125,201,255,.07),var(--panel));"><small style="color:var(--blue);font-weight:900;">${"INSTALL ON IPHONE"}</small><h2>${"Add to Home Screen for Native Experience"}</h2><div style="display:grid;gap:8px;margin:10px 0 12px;font-size:12px;color:var(--text);"><div style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:10px;background:rgba(255,255,255,.04);"><b>1</b><span>${"Tap the <b>Share (⎋)</b> icon at the bottom of Safari"}</span></div><div style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:10px;background:rgba(255,255,255,.04);"><b>2</b><span>${"Scroll down and tap <b>Add to Home Screen (+)</b>"}</span></div></div><button class="settings-primary" data-install-settings style="background:var(--blue);color:#03202e;">${"Install / Add to Home Screen"}</button></section>`;
  }
  function circadianRemindersCard(){
    return `<section class="settings-card push-card"><small style="color:var(--acid);font-weight:900;">${"CIRCADIAN REMINDERS & NOTIFICATIONS"}</small><h2>${"Smart Readiness & Wind-Down Alarms"}</h2>
      <div style="display:grid;gap:10px;margin:12px 0;">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-radius:12px;background:var(--panel-2);">
          <div><strong>🌅 ${"Morning Readiness Score"}</strong><small style="display:block;color:var(--muted);font-size:10px;">${"07:30 AM · Readiness score and training guidance"}</small></div>
          <span style="color:var(--acid);font-weight:900;">07:30</span>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-radius:12px;background:var(--panel-2);">
          <div><strong>🌙 ${"Evening Bedtime Wind-Down"}</strong><small style="display:block;color:var(--muted);font-size:10px;">${"10:30 PM · Wind-down reminder 45m before sleep"}</small></div>
          <span style="color:#7dc9ff;font-weight:900;">22:30</span>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-radius:12px;background:var(--panel-2);">
          <div><strong>📖 ${"Surat Al-Kahf Friday Reminder"}</strong><small style="display:block;color:var(--muted);font-size:10px;">${"09:00 AM every Friday"}</small></div>
          <span style="color:#ffd36a;font-weight:900;">09:00 Fri</span>
        </div>
      </div>
      <div class="push-actions" style="margin-top:10px;">
        <input type="time" data-push-time value="${state.pushTime}" aria-label="${"Daily reminder time"}" ${state.pushEndpoint?"disabled":""}>
        <button data-push-toggle>${state.pushEndpoint?("Disable"):("Enable Notifications")}</button>
      </div>
      <div style="display:flex;gap:8px;margin-top:10px;">
        <button type="button" data-local-notify-test class="quiet-setting" style="flex:1;">🔔 ${"Send Test Notification Now"}</button>
      </div>
    </section>`;
  }
  function generalSettings(){
    const themeMode=state.preferences?.themeMode||"default",themeAccent=state.preferences?.themeAccent||"acid",soundPack=state.preferences?.soundPack||"digital";
    return `${pwaInstallCard()}<section class="settings-card"><small>${"YOUR PREFERENCES"}</small><h2>${"Make the app feel familiar"}</h2>
      <div class="segmented-setting"><span>${"Theme Mode"}</span><div><button data-theme-mode="default" class="${themeMode==="default"?"is-active":""}">${"Charcoal"}</button><button data-theme-mode="oled" class="${themeMode==="oled"?"is-active":""}">🖤 ${"OLED Black"}</button></div></div>
      <div class="segmented-setting"><span>${"Sound Pack"}</span><div>
        <button data-sound-pack="digital" class="${soundPack==="digital"?"is-active":""}">${"Digital"}</button>
        <button data-sound-pack="click" class="${soundPack==="click"?"is-active":""}">${"Clicks"}</button>
        <button data-sound-pack="bell" class="${soundPack==="bell"?"is-active":""}">${"Gong"}</button>
      </div></div>
      <div class="segmented-setting"><span>${"Accent"}</span><div>
        <button data-theme-accent="acid" class="${themeAccent==="acid"?"is-active":""}"><span style="color:#c9ff3d;">●</span> ${"Lime"}</button>
        <button data-theme-accent="cyan" class="${themeAccent==="cyan"?"is-active":""}"><span style="color:#38bdf8;">●</span> ${"Cyan"}</button>
        <button data-theme-accent="flame" class="${themeAccent==="flame"?"is-active":""}"><span style="color:#fb923c;">●</span> ${"Flame"}</button>
        <button data-theme-accent="violet" class="${themeAccent==="violet"?"is-active":""}"><span style="color:#c084fc;">●</span> ${"Violet"}</button>
      </div></div>
      ${[["weightUnit","Weight",["kg","lb"]],["waterUnit","Water",["ml","oz"]]].map(([key,label,values])=>`<div class="segmented-setting"><span>${label}</span><div>${values.map(value=>`<button data-unit="${key}" data-value="${value}" class="${state.preferences[key]===value?"is-active":""}">${value==="oz"?"fl oz":value}</button>`).join("")}</div></div>`).join("")}
      <button class="quiet-setting" data-install-settings>${"Install Health OS on this device"}</button>
      <p>${"Stored values stay in kilograms and milliliters, so switching display units never changes your history."}</p></section>
      ${circadianRemindersCard()}
      <section class="settings-card data-migration-card"><small>${"DATA MIGRATION & BACKFILL"}</small><h2>${"Import from Strong, Hevy, or Apple Health"}</h2><p>${"Drop your CSV or XML export to backfill historical workouts, body weights, and meals."}</p><label class="settings-primary" style="display:inline-block;cursor:pointer;text-align:center;padding:10px 16px;margin-top:8px;">📥 ${"Choose File (CSV/XML)"}<input type="file" accept=".csv,.xml,.json" data-import-file style="display:none;"></label><span class="import-status-msg" data-import-status style="display:block;margin-top:8px;font-size:12px;color:var(--acid);"></span></section>`;
  }
  function scheduleSettings(){return `<section class="settings-card"><small>${"YOUR WEEK"}</small><h2>${"Choose each day's focus"}</h2><div class="schedule-editor">${DAY_NAMES.map(day=>{const plan=daySchedule(day),label=day.slice(0,3);return `<div class="schedule-row"><strong>${label}</strong><select data-schedule-focus="${day}">${SCHEDULE_FOCUS_OPTIONS.map(focus=>`<option value="${focus}" ${plan.focus===focus?"selected":""}>${focusLabel(focus)}</option>`).join("")}</select><label><input data-schedule-morning="${day}" type="checkbox" ${plan.morning?"checked":""}> ${"Activation"}</label></div>`;}).join("")}</div><button class="quiet-setting" data-reset-schedule>${"Reset default schedule"}</button></section>`;}
  function targetsSettings(){const labels={gym:"Gym day",active:"Cardio day",flex:"Recovery / rest"},fields=[["calories","Calories","kcal"],["protein","Protein","g"],["carbs","Carbs","g"],["fat","Fat","g"],["fiber","Fiber","g"],["water","Water",state.preferences.waterUnit==="oz"?"fl oz":"ml"]];return `<section class="settings-card"><small>${"DAILY TARGETS"}</small><h2>${"Make the plan yours"}</h2><p>${"Tracking targets, not a medical prescription."}</p><div class="target-editor">${Object.entries(state.preferences.targets).map(([profile,target])=>`<fieldset><legend>${labels[profile]}</legend>${fields.map(([field,label,unit])=>`<label><span>${label}<small>${unit}</small></span><input data-target-profile="${profile}" data-target-field="${field}" type="number" min="0" step="1" value="${Math.round(field==="water"&&state.preferences.waterUnit==="oz"?target[field]/29.5735:target[field])}"></label>`).join("")}</fieldset>`).join("")}</div><button class="quiet-setting" data-reset-targets>${"Reset default targets"}</button></section>`;}
  function coachSettings(){return `<section class="settings-card"><small>${"PERSONAL BASELINE"}</small><h2>${"Tune the coach to your day"}</h2><p>${"These values shape sleep timing and confidence; they are not medical targets."}</p><div class="coach-settings-grid"><label><span>${"Usual wake time"}</span><input data-health-profile="wakeTime" type="time" value="${state.healthProfile.wakeTime}"></label><label><span>${"Starting sleep need"}</span><input data-health-profile="baseSleepHours" type="number" min="6" max="10" step="0.1" value="${state.healthProfile.baseSleepHours}"><small>hours</small></label><label><span>${"Baseline window"}</span><select data-health-profile="baselineDays">${[21,28,42].map(days=>`<option value="${days}" ${state.healthProfile.baselineDays===days?"selected":""}>${days} ${"days"}</option>`).join("")}</select></label></div><div class="settings-callout">${"Wearable signals need 7 prior nights to enter the score and 14 for high confidence. Pain and symptoms always override the score."}</div></section>`;}
  function securitySettings(){
    const paired=Boolean(localStorage.getItem(syncKeyStorage)),handoff=state.pairHandoff,health=state.systemHealth,notion=health?.notion;
    const queued=window.REP_SYNC_OUTBOX?.summary(state.syncQueue).total||0,verifiedMode=health?.sync?.mode==="verified-outbox";
    const healthCard=`<section class="settings-card connection-health"><small>${"CONNECTION HEALTH"}</small><h2>${notion?.healthy?("Notion is healthy"):(notion?.error||health)?("Connection needs attention"):("Check your connection")}</h2><div class="health-facts"><span><b>${notion?.healthy?"✓":notion?.error?"!":"…"}</b>Notion</span><span><b>${verifiedMode?"✓":"…"}</b>${"Verified"}</span><span><b>${queued}</b>${"Queued"}</span></div>${notion?.error?`<p class="settings-callout">${esc(notion.error)}</p>`:""}<button class="quiet-setting" data-check-system>${"Check services again"}</button></section>`;
    return `${healthCard}<section class="settings-card security-card"><small>${"PAIR ANOTHER DEVICE"}</small><h2>${"Secure QR handoff"}</h2><p>${"The link expires within five minutes and never contains your Cloudflare master key."}</p>${paired?`<button class="settings-primary" data-create-handoff ${state.pairHandoffBusy?"disabled":""}>${state.pairHandoffBusy?("Creating…"):("Create 5-minute QR")}</button>`:`<p class="settings-callout">${"Connect once from Nutrition first."}</p>`}${handoff?`<div class="pair-qr"><img src="${handoff.qr}" alt="${"Device pairing QR code"}"><strong>${"Scan on the new phone"}</strong><span>${new Date(handoff.expiresAt).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"})}</span><div><button data-copy-handoff>${"Copy link"}</button><button data-share-handoff>${"Share"}</button></div></div>`:""}</section>${window.backupReminderStrip()}<section class="settings-card backup-card"><small>${"ENCRYPTED BACKUPS"}</small><h2>${"Private recovery"}</h2><p data-backup-status>${"Checking restore points…"}</p><div data-backup-history></div><form autocomplete="off"><label>${"Backup passphrase"}<input data-backup-passphrase type="password" minlength="8" autocomplete="new-password" placeholder="${"At least 8 characters"}"></label><button type="button" class="settings-primary" data-encrypted-export>${"Download encrypted backup"}</button></form><label class="file-action">${"Import backup"}<input data-backup-import type="file" accept="application/json,.json"></label><button data-restore-device>${"Restore latest automatic snapshot"}</button></section><section class="settings-card danger-zone"><small>${"PRIVACY"}</small><h2>${"This device's data"}</h2><p>${"This clears local history and pairing only. It does not delete Notion records."}</p><button data-delete-local>${"Delete all local data"}</button></section>`;
  }
  function bindSyncCenter(){
    document.querySelector("[data-sync-all]")?.addEventListener("click",()=>window.REP_SYNC_RUNTIME?.syncEverything());
    document.querySelector("[data-sync-pull]")?.addEventListener("click",()=>window.REP_SYNC_RUNTIME?.pullFromNotion());
    document.querySelector("[data-sync-retry-all]")?.addEventListener("click",()=>window.REP_SYNC_RUNTIME?.retryFailed());
    document.querySelector("[data-sync-refresh]")?.addEventListener("click",()=>probeSystemHealth(true));
    document.querySelector("[data-system-self-test]")?.addEventListener("click",async()=>{try{await syncCenter.backupSelfTest(features);await probeSystemHealth(false);state.systemSelfTest={ok:true,message:"Backup encryption round-trip and server connection passed."};}catch(error){state.systemSelfTest={ok:false,message:String(error.message||error)};}renderSettings("sync");});
    document.querySelector("[data-push-test]")?.addEventListener("click",async()=>{try{const response=await repAuth.fetch("/api/push/test",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({endpoint:state.pushEndpoint})}),data=await response.json().catch(()=>({}));if(!response.ok||!data.ok)throw Error(data.error||"Push test failed.");state.systemSelfTest={ok:true,message:"A test notification was sent to this device."};}catch(error){state.systemSelfTest={ok:false,message:String(error.message||error)};}renderSettings("sync");});
  }
  function renderSettings(section=state.settingsSection){stopExerciseClock();stopSessionClock();document.body.classList.remove("workout-mode");state.view="settings";state.settingsSection=section;persist();app.innerHTML=REP_SAFE_DOM.sanitize(`${moduleHeader("SETTINGS","Make it fit your life.","Units, schedule, targets, sync, and backups.")}${settingsNav(section)}${section==="general"?generalSettings():section==="schedule"?scheduleSettings():section==="targets"?targetsSettings():section==="coach"?coachSettings():section==="sync"?syncCenter.render(state):securitySettings()}`);bindSettings();if(section==="sync")bindSyncCenter();document.querySelectorAll("[data-app-tab]").forEach(button=>button.setAttribute("aria-current","false"));}
  window.renderRepSettings=renderSettings;
  app.addEventListener("change",event=>{const input=event.target.closest?.("[data-health-profile]");if(!input)return;const key=input.dataset.healthProfile,value=key==="wakeTime"?input.value:Number(input.value);if(key==="wakeTime"||Number.isFinite(value)){state.healthProfile[key]=value;persist();}});
  function bindSettings(){
    document.querySelectorAll("[data-settings-tab]").forEach(button=>button.onclick=()=>renderSettings(button.dataset.settingsTab));
    document.querySelectorAll("[data-theme-mode]").forEach(button=>button.onclick=()=>{state.preferences.themeMode=button.dataset.themeMode;persist();applyThemeSettings();renderSettings("general");});
    document.querySelectorAll("[data-theme-accent]").forEach(button=>button.onclick=()=>{state.preferences.themeAccent=button.dataset.themeAccent;persist();applyThemeSettings();renderSettings("general");});
    document.querySelectorAll("[data-sound-pack]").forEach(button=>button.onclick=()=>{state.preferences.soundPack=button.dataset.soundPack;persist();if(window.playChime)window.playChime();renderSettings("general");});
    document.querySelector("[data-install-settings]")?.addEventListener("click",installApp);
    document.querySelector("[data-local-notify-test]")?.addEventListener("click",async()=>{
      if("Notification" in window){
        if(Notification.permission!=="granted"){
          const p=await Notification.requestPermission();
          if(p!=="granted"){showToast("Please grant notification permission in browser settings.");return;}
        }
        try{
          const reg=await navigator.serviceWorker?.ready;
          if(reg?.showNotification) await reg.showNotification("⚡ Health OS: Today's Readiness 88%",{body:"High readiness today. Today's plan: Chest & Back.",icon:"./icon-192.png",badge:"./icon-192.png"});
          else new Notification("⚡ Health OS: Today's Readiness 88%",{body:"High readiness today."});
          showToast("Test notification sent successfully!");
        }catch{
          try{new Notification("⚡ Health OS: Test Notification",{body:"Notifications are working perfectly!"});showToast("Test notification sent successfully!");}catch(e){showToast(String(e.message||e));}
        }
      }else{showToast("Notifications are not supported in this browser.");}
    });
    document.querySelector("[data-check-system]")?.addEventListener("click",()=>probeSystemHealth(true));
    document.querySelectorAll("[data-unit]").forEach(button=>button.onclick=()=>{state.preferences[button.dataset.unit]=button.dataset.value;persist();renderSettings("general");});
    document.querySelectorAll("[data-schedule-focus]").forEach(select=>select.onchange=()=>{state.preferences.schedule[select.dataset.scheduleFocus].focus=select.value;persist();});
    document.querySelectorAll("[data-schedule-morning]").forEach(input=>input.onchange=()=>{state.preferences.schedule[input.dataset.scheduleMorning].morning=input.checked;persist();});
    document.querySelectorAll("[data-target-profile]").forEach(input=>input.onchange=()=>{const profile=input.dataset.targetProfile,field=input.dataset.targetField,value=field==="water"?waterToMl(input.value):Number(input.value);if(Number.isFinite(value)&&value>=0){state.preferences.targets[profile][field]=value;persist();}});
    document.querySelector("[data-reset-schedule]")?.addEventListener("click",()=>{state.preferences.schedule=clone(DEFAULT_SCHEDULE);persist();renderSettings("schedule");});
    document.querySelector("[data-reset-targets]")?.addEventListener("click",()=>{state.preferences.targets=clone(DEFAULT_TARGETS);persist();renderSettings("targets");});
    document.querySelector("[data-import-file]")?.addEventListener("change",async e=>{const file=e.target.files?.[0];if(!file)return;try{const text=await file.text(),res=window.REP_DATA_IMPORTER?.detectAndImport(text,state);if(res){persist();showToast(res.message);const status=document.querySelector("[data-import-status]");if(status)status.textContent=res.message;}}catch(err){showToast(String(err.message||err));}});
    document.querySelector("[data-create-handoff]")?.addEventListener("click",createPairHandoff);
    document.querySelector("[data-copy-handoff]")?.addEventListener("click",()=>shareHandoff(false));
    document.querySelector("[data-share-handoff]")?.addEventListener("click",()=>shareHandoff(true));
    document.querySelector("[data-encrypted-export]")?.addEventListener("click",()=>exportEncrypted(document.querySelector("[data-backup-passphrase]")?.value));
    document.querySelector("[data-backup-import]")?.addEventListener("change",importSecureBackup);
    document.querySelector("[data-restore-device]")?.addEventListener("click",()=>restoreSnapshot(0));
    document.querySelector("[data-delete-local]")?.addEventListener("click",deleteLocalData);
    document.querySelector("[data-backup-export]")?.addEventListener("click",exportData);
    document.querySelector("[data-backup-snooze]")?.addEventListener("click",()=>{snoozeBackupReminder();renderSettings("security");});
    features?.backupHistory().then(dates=>{const status=document.querySelector("[data-backup-status]"),history=document.querySelector("[data-backup-history]");if(status)status.textContent=dates.length?(`Latest: ${new Date(dates[0]).toLocaleString()}`):("A restore point will be created after the next change.");if(history&&dates.length>1){history.innerHTML=REP_SAFE_DOM.sanitize(dates.slice(1).map((date,index)=>`<button data-restore-index="${index+1}">${new Date(date).toLocaleString(undefined)}</button>`).join(""));history.querySelectorAll("[data-restore-index]").forEach(button=>button.onclick=()=>restoreSnapshot(Number(button.dataset.restoreIndex)));}});
  }
  function loadOptionalScript(src,globalName){if(window[globalName])return Promise.resolve();return new Promise((resolve,reject)=>{const existing=document.querySelector(`script[data-optional="${src}"]`);if(existing){existing.addEventListener("load",resolve,{once:true});existing.addEventListener("error",reject,{once:true});return;}const script=document.createElement("script");script.src=`${src}?v=${window.REP_BUILD_VERSION||"3e2f6ace6969"}`;script.dataset.optional=src;script.onload=resolve;script.onerror=()=>reject(Error(`Could not load ${src}`));document.head.appendChild(script);});}
  async function createPairHandoff(){if(!repAuth.isPaired())return;state.pairHandoffBusy=true;renderSettings("security");try{await loadOptionalScript("qrcode.js","qrcode");const response=await repAuth.fetch("/api/pair/handoff",{method:"POST"}),data=await response.json().catch(()=>({}));if(!response.ok||!data.ok)throw Error(data.error||`Pairing failed (${response.status})`);const qr=qrcode(0,"M");qr.addData(data.url);qr.make();state.pairHandoff={url:data.url,expiresAt:data.expiresAt,qr:qr.createDataURL(6,16)};}catch(error){showToast(String(error.message||error));}finally{state.pairHandoffBusy=false;renderSettings("security");}}
  async function shareHandoff(preferShare){const url=state.pairHandoff?.url;if(!url)return;try{if(preferShare&&navigator.share)await navigator.share({title:"Pair Health OS",url});else await navigator.clipboard.writeText(url);showToast("Pairing link copied.");}catch{showToast("Could not share the link.");}}
  async function exportEncrypted(passphrase){try{if(!passphrase)passphrase=prompt("Enter a backup passphrase (at least 8 characters):");if(passphrase===null)return;persist();const inner={app:"Rep Gym Companion",schema:APP_SCHEMA,guideVersion:REP_HEALTH_GUIDE.version,exportedAt:new Date().toISOString(),data:statePayload()},payload=await features.encryptExport(inner,passphrase);features.downloadJson(payload,`health-os-backup-${isoDay()}.json`);state.lastBackupAt=new Date().toISOString();state.backupSnoozedUntil=null;persist();showToast("Encrypted backup downloaded.");}catch(error){showToast(String(error.message||error));}}
  function safeBackupData(data){if(!data||typeof data!=="object"||Array.isArray(data))throw Error("Invalid backup data.");const text=JSON.stringify(data);if(text.length>25_000_000||text.includes('"__proto__"')||text.includes('"prototype"'))throw Error("Backup is too large or unsafe.");for(const key of ["history","foodEntries","bodyWeights","mealTemplates","sleepLogs","syncQueue"]){if(data[key]!==undefined&&!Array.isArray(data[key]))throw Error(`Invalid ${key} data.`);}return data;}
  async function importSecureBackup(event){const file=event.target.files?.[0];if(!file)return;try{if(file.size>25*1024*1024)throw Error("Backup is too large.");const payload=JSON.parse(await file.text());let inner;if(payload.encrypted){const passphrase=prompt("Enter the backup passphrase:");if(passphrase===null)return;inner=await features.decryptExport(payload,passphrase);}else inner=payload;const data=safeBackupData(inner.data||inner);if(!confirm("This replaces current app data. Continue?"))return;await features?.createDeviceSnapshot(statePayload());await window.REP_STORE?.replace(storageKey,data);location.reload();}catch(error){showToast(String(error.message||error));event.target.value="";}}
  async function restoreSnapshot(index){try{const snapshot=await features.restoreDeviceSnapshot(index);if(!confirm("Restore this automatic snapshot?"))return;await window.REP_STORE?.replace(storageKey,safeBackupData(snapshot.data));location.reload();}catch(error){showToast(String(error.message||error));}}
  async function deleteLocalData(){if(!confirm("Delete all Health OS data on this device?"))return;if(!confirm("This cannot be undone. Are you sure?"))return;await repAuth.fetch("/api/pair/disconnect",{method:"POST"}).catch(()=>{});await window.REP_STORE?.clear();localStorage.removeItem(storageKey);repAuth.clear();localStorage.removeItem(errorLogKey);indexedDB?.deleteDatabase("rep-device-vault-v1");location.reload();}
  exportData=function(){return exportEncrypted();};
  importData=importSecureBackup;
  const baseHistory=renderHistory;renderHistory=function(){baseHistory();const exportButton=document.querySelector("[data-export]");if(exportButton)exportButton.textContent="Export encrypted backup";const tools=document.querySelector(".data-tools");if(tools&&!tools.querySelector("[data-open-settings]")){const button=document.createElement("button");button.dataset.openSettings="";button.textContent="Settings & security";tools.prepend(button);button.onclick=()=>renderSettings("security");}};

  async function claimPairFromUrl(){const url=new URL(location.href),fromUrl=url.searchParams.get("pair"),token=fromUrl||sessionStorage.getItem("rep-pair-handoff-v1");if(!token)return;if(fromUrl){sessionStorage.setItem("rep-pair-handoff-v1",token);url.searchParams.delete("pair");history.replaceState({},"",`${url.pathname}${url.search}${url.hash}`);}try{const response=await repAuth.fetch("/api/pair/claim",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({token})}),data=await response.json().catch(()=>({}));if(!response.ok||!data.ok)throw Error(data.error||`Pairing failed (${response.status})`);repAuth.markPaired();state.connectionCapabilities={foodAi:Boolean(data.foodAi),notion:Boolean(data.notion),vitalsAi:Boolean(data.vitalsAi),push:Boolean(data.push)};sessionStorage.removeItem("rep-pair-handoff-v1");persist();showToast("This device is securely paired.");}catch(error){if(navigator.onLine){sessionStorage.removeItem("rep-pair-handoff-v1");showToast(String(error.message||error));}}}
  async function probeSystemHealth(render=false){if(!repAuth.isPaired()||!navigator.onLine)return;try{const response=await repAuth.fetch("/api/system-health"),data=await response.json().catch(()=>({}));if(!response.ok||!data.ok)throw Error(data.error||`Health check failed (${response.status})`);state.systemHealth=data;state.connectionCapabilities={...(state.connectionCapabilities||{}),notion:Boolean(data.notion?.configured),notionHealthy:Boolean(data.notion?.healthy),foodAi:Boolean(data.services?.foodAi),vitalsAi:Boolean(data.services?.vitalsAi),push:Boolean(data.services?.push)};persist();if(render){if(state.view==="settings")renderSettings(state.settingsSection);else if(state.view==="nutrition")renderNutrition();}}catch(error){state.systemHealth={checkedAt:new Date().toISOString(),notion:{configured:Boolean(state.connectionCapabilities?.notion),healthy:false,error:String(error.message||error)}};if(state.connectionCapabilities)state.connectionCapabilities.notionHealthy=false;persist();if(render&&state.view==="settings")renderSettings(state.settingsSection);}}
  async function refreshCapabilities(){if(!repAuth.isPaired()||!navigator.onLine)return;try{const caps=await repAuth.fetch("/api/pair-check",{method:"POST"}).then(async response=>{const data=await response.json().catch(()=>({}));if(!response.ok||!data.ok)throw Error(data.error||`Connection check failed (${response.status})`);return data;});repAuth.markPaired();state.connectionCapabilities={foodAi:Boolean(caps.foodAi),notion:Boolean(caps.notion),notionHealthy:state.connectionCapabilities?.notionHealthy,vitalsAi:Boolean(caps.vitalsAi),push:Boolean(caps.push),persistent:Boolean(caps.persistent)};persist();await probeSystemHealth(state.view==="nutrition");}catch(error){if(/incorrect|expired|revoked|not paired/i.test(String(error.message))){repAuth.clear();state.connectionCapabilities=null;state.syncState="auth";persist();}}}

  repAuth.onChange(()=>{if(state.view==="nutrition")renderNutrition();else if(state.view==="settings")renderSettings(state.settingsSection);else updateSyncPanel();});
  async function loadConnectedDevices(){
    if(!repAuth.isPaired())return;
    const card=document.querySelector(".security-card");if(!card)return;
    const host=document.createElement("div");host.className="device-list";host.innerHTML=REP_SAFE_DOM.sanitize(`<small>${"CONNECTED DEVICES"}</small><p>${"Loading…"}</p>`);card.appendChild(host);
    try{const response=await repAuth.fetch("/api/pair/devices"),data=await response.json().catch(()=>({}));if(!response.ok||!data.ok)throw Error(data.error||"Could not load devices.");host.innerHTML=REP_SAFE_DOM.sanitize(`<small>${"CONNECTED DEVICES"}</small>${data.devices.map(device=>`<div class="device-row"><div><strong>${device.current?("This device"):"Browser"}</strong><span>${esc(device.label||"")} · ${new Date(device.lastSeenAt||device.createdAt).toLocaleDateString(undefined)}</span></div><button data-revoke-device="${esc(device.id)}">${"Revoke"}</button></div>`).join("")||`<p>${"No registered devices."}</p>`}`);host.querySelectorAll("[data-revoke-device]").forEach(button=>button.onclick=async()=>{const revoke=await repAuth.fetch("/api/pair/devices",{method:"DELETE",headers:{"content-type":"application/json"},body:JSON.stringify({deviceId:button.dataset.revokeDevice})});if(!revoke.ok)return showToast("Could not revoke device.");const current=data.devices.find(device=>device.id===button.dataset.revokeDevice)?.current;if(current)repAuth.clear();renderSettings("security");});}catch(error){host.innerHTML=REP_SAFE_DOM.sanitize(`<p>${esc(String(error.message||error))}</p>`);}
  }
  const renderSettingsCore=renderSettings;
  renderSettings=function(section=state.settingsSection){renderSettingsCore(section);if(section==="security")loadConnectedDevices();if(["security","sync"].includes(section)){const stale=!state.systemHealth?.checkedAt||Date.now()-new Date(state.systemHealth.checkedAt).getTime()>5*60*1000;if(stale)probeSystemHealth(true);}};
  window.renderRepSettings=renderSettings;

  document.querySelector("#settingsButton")?.addEventListener("click",()=>renderSettings());
  async function syncFromTopBar(){
    if(!repAuth.isPaired()){showToast("Pair this device first in the Sync Center.");renderSettings("sync");return;}
    if(state.syncState==="syncing")return;
    showToast("Syncing everything…");
    await window.REP_SYNC_RUNTIME?.syncEverything();
    const queued=window.REP_SYNC_OUTBOX?.summary(state.syncQueue).total||0;
    showToast(queued?(`${queued} record${queued===1?"":"s"} still pending verification.`):("Everything is synced and verified in Notion."));
  }
  document.querySelector("#syncButton")?.addEventListener("click",()=>void syncFromTopBar());
  const updateSyncPanelCore=updateSyncPanel;updateSyncPanel=function(){updateSyncPanelCore();const button=document.querySelector("#syncButton"),badge=document.querySelector("[data-sync-badge]"),queued=window.REP_SYNC_OUTBOX?.summary(state.syncQueue).total||0,syncing=state.syncState==="syncing",label=(syncing?"Syncing everything":"Sync everything");if(badge){badge.hidden=!queued;badge.textContent=String(Math.min(queued,9));}if(button){button.disabled=syncing;button.setAttribute("aria-busy",String(syncing));button.setAttribute("aria-label",label);button.setAttribute("title",label);button.classList.toggle("is-syncing",syncing);button.classList.toggle("has-alert",Boolean(state.systemHealth?.notion?.healthy===false||queued));}};
  document.querySelector("#settingsButton")?.setAttribute("title","Settings");
  document.querySelector("#syncButton")?.setAttribute("title","Sync everything");
  function prepareDialog(element){
    if(!element||element.dataset.dialogReady)return;
    element.dataset.dialogReady="true";element.setAttribute("role","dialog");element.setAttribute("aria-modal","true");element.tabIndex=-1;
    const focusable=()=>[...element.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])')].filter(node=>!node.disabled);
    element.addEventListener("keydown",event=>{
      if(event.key==="Escape"){element.querySelector("[data-timed-close],[data-close-diagnostics],.timed-close,.install-help>button,[data-stay],.dialog-close,[data-builder-close],[data-hr-close],[data-barcode-close],.sheet-close")?.click();return;}
      if(event.key!=="Tab")return;const items=focusable();if(!items.length){event.preventDefault();return;}const first=items[0],last=items.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    });
    requestAnimationFrame(()=>focusable()[0]?.focus());
  }
  const DIALOG_SELECTORS=".timed-mode,.exit-confirm,.install-help,.rep-modal-backdrop,.plate-calc-backdrop";
  const dialogObserver=new MutationObserver(records=>{for(const record of records)for(const node of record.addedNodes)if(node.nodeType===1){if(node.matches?.(DIALOG_SELECTORS))prepareDialog(node);node.querySelectorAll?.(DIALOG_SELECTORS).forEach(prepareDialog);}});
  dialogObserver.observe(document.body,{childList:true,subtree:true});
  document.querySelectorAll(DIALOG_SELECTORS).forEach(prepareDialog);
  updatePrimaryTabs();updateSyncPanel();claimPairFromUrl();refreshCapabilities();setInterval(()=>probeSystemHealth(state.view==="settings"&&state.settingsSection==="sync"),5*60*1000);
  if(state.view==="home-overview")renderOverview();
})();
