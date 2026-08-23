(function(){
  const REQUEST_TIMEOUT_MS=30000,SIGNATURES_KEY="rep-sync-signatures-v1",outbox=window.REP_SYNC_OUTBOX;
  const typeMap={morning:"Morning Activation",gym:"Gym",cardio:"Cardio",bad:"Bad Day Floor",gymLite:"Reduced Gym"};
  const activityLabel=item=>item.payload?.food_name||item.payload?.rawNote||item.payload?.name||item.workout?.type||item.payload?.plan||item.payload?.date||item.kind||"Sync record";
  const record=(item,status,extra={})=>window.REP_SYNC_CENTER?.record(state,{id:item.id,kind:item.kind,label:activityLabel(item),status,...extra});
  const signatures=()=>{try{return JSON.parse(localStorage.getItem(SIGNATURES_KEY)||"{}");}catch{return {};}};
  const saveSignatures=value=>localStorage.setItem(SIGNATURES_KEY,JSON.stringify(value));
  const workoutItem=entry=>({id:`workout-${entry.id}`,kind:"workout",workout:{id:String(entry.id),date:entry.date,type:typeMap[entry.session]||entry.activityLabel||"Recovery",duration:entry.duration,entries:entry.entries}});
  const healthItem=(kind,payload)=>({id:`${kind}-${kind==="food"?(payload.id||Date.now()):kind==="habit"?`${payload.date}-${payload.id}`:payload.date}`,kind,payload:{...payload}});
  let processing=false,retryTimer=null;

  function nutritionItem(){
    if(typeof foodProfile!=="function"||typeof todayFoodEntries!=="function")return null;
    const profile=foodProfile(),entries=todayFoodEntries(),totals=foodTotals(entries),water=Number(state.water?.[isoDay()])||0;
    const completion=Math.round((Math.min(totals.calories/profile.calories,1)+Math.min(totals.protein_g/profile.protein,1)+Math.min(water/profile.water,1))/3*100);
    return healthItem("nutrition",{date:isoDay(),plan:profile.label,caloriesTarget:profile.calories,proteinTarget:profile.protein,waterTarget:profile.water/1000,mealsComplete:entries.length,mealsTotal:entries.length,hydrationComplete:water>=profile.water,supplementsComplete:supplementsAllComplete(),weightKg:todayWeighIn()?.kg,completion,notes:`Logged ${Math.round(totals.calories)} kcal · P ${Math.round(totals.protein_g)}g · C ${Math.round(totals.carbs_g)}g · F ${Math.round(totals.fat_g)}g · Water ${water}ml`});
  }
  function hygieneItems(){
    const care=state.daily?.hygiene||{},habits=state.daily?.habits||{},dates=new Set([...Object.keys(care),...Object.entries(habits).filter(([,day])=>Object.keys(day?.checked||{}).length>0).map(([date])=>date)]);
    return [...dates].filter(date=>Object.values(care[date]?.checked||{}).some(Boolean)||care[date]?.notes||Object.keys(habits[date]?.checked||{}).length>0).map(date=>{
      const combined=window.REP_HABITS?.payloadForDate?.(date);if(combined)return healthItem("hygiene",combined);
      const day=care[date]||{},checked=day.checked||{},keys=Object.keys(checked),done=keys.filter(key=>checked[key]).length,complete=prefix=>{const group=keys.filter(key=>key.startsWith(`${prefix}-`));return group.length>0&&group.every(key=>checked[key]);};
      return healthItem("hygiene",{date,morningComplete:complete("morning"),eveningComplete:complete("evening"),postWorkoutComplete:complete("post"),hairRoutineComplete:complete("hair"),spf:Boolean(checked["morning-0"]),floss:Boolean(checked["evening-1"]),beardOil:Boolean(checked["morning-3"]&&checked["evening-3"]),showerWithin30m:Boolean(checked["post-0"]),completion:keys.length?Math.round(done/keys.length*100):0,notes:day.notes||""});
    });
  }
  function habitItems(){return Object.entries(state.daily?.habits||{}).flatMap(([date,day])=>Object.keys(day?.checked||{}).map(id=>window.REP_HABITS?.payloadForHabit?.(date,id))).filter(Boolean).map(payload=>healthItem("habit",payload));}
  function collectEverything(){
    const items=[...(state.history||[]).filter(entry=>entry?.entries?.length).map(workoutItem),...(state.foodEntries||[]).filter(entry=>entry?.id&&entry?.date).map(entry=>healthItem("food",entry)),...(state.recoveryCheckins||[]).filter(entry=>entry?.date).map(entry=>healthItem("recovery",entry)),...(state.sleepLogs||[]).filter(entry=>entry?.date).map(entry=>healthItem("sleep",{...entry,sleep:entry.sleep??entry.hours})),...hygieneItems(),...habitItems()];
    const nutrition=nutritionItem();if(nutrition)items.push(nutrition);return [...new Map(items.map(item=>[item.id,item])).values()];
  }
  function markFood(item,status,error=""){
    if(item.kind!=="food")return;const entry=(state.foodEntries||[]).find(food=>food.id===item.payload?.id);if(!entry)return;
    entry.notionSync=status;entry.notionError=error||undefined;
  }
  function enqueue(item,{force=false}={}){
    state.syncQueue=outbox.enqueue(state.syncQueue,item,{force});record(item,"pending",{updatedAt:new Date().toISOString(),error:""});markFood(item,"pending");persist();return item;
  }
  function scheduleRetry(){
    clearTimeout(retryTimer);retryTimer=null;if(!navigator.onLine||!repAuth.isPaired())return;
    const pending=outbox.due(state.syncQueue),future=(state.syncQueue||[]).filter(entry=>entry.status==="retryable_failed"&&entry.nextAttemptAt).map(entry=>Date.parse(entry.nextAttemptAt)).filter(Number.isFinite).sort((a,b)=>a-b)[0];
    const delay=pending.length?500:future?Math.max(500,Math.min(future-Date.now(),30*60*1000)):null;
    if(delay!==null)retryTimer=setTimeout(()=>void processOutbox(),delay);
  }
  async function sendItem(item,{force=false}={}){
    if(!navigator.onLine)throw Error("You are offline. This record remains safely pending on this device.");
    if(!repAuth.isPaired())throw Object.assign(Error("Pair this device once before syncing."),{auth:true});
    const body=item.kind==="workout"?{workout:item.workout}:{kind:item.kind,payload:item.payload},serialized=JSON.stringify(body),known=signatures();
    if(!force&&known[item.id]===serialized){state.syncQueue=outbox.remove(state.syncQueue,item.id);return {ok:true,verified:true,unchanged:true};}
    state.syncQueue=outbox.transmitting(state.syncQueue,item.id);record(item,"transmitting",{updatedAt:new Date().toISOString(),error:""});markFood(item,"syncing");persist();
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),REQUEST_TIMEOUT_MS);let response;
    try{response=await repAuth.fetch("/api/notion-sync",{method:"POST",headers:{"content-type":"application/json","x-rep-idempotency-key":item.id},body:serialized,signal:controller.signal});}
    catch(error){if(controller.signal.aborted)throw Error("The Notion save timed out. The record remains pending and will retry.");throw error;}
    finally{clearTimeout(timeout);}
    const data=await response.json().catch(()=>({})),receiptMatches=data.verified===true&&(item.kind==="workout"||Boolean(data.notionPageId))&&(item.kind==="workout"||data.kind===item.kind)&&(item.kind!=="food"||data.entryId===item.payload?.id);
    if(!response.ok||!data.ok||!receiptMatches)throw Object.assign(Error(data.error||"Notion did not return a verified save receipt."),{auth:response.status===401,permanent:response.status>=400&&response.status<500&&![408,409,425,429].includes(response.status)});
    known[item.id]=serialized;saveSignatures(known);state.syncQueue=outbox.remove(state.syncQueue,item.id);
    if(item.kind==="food"){const entry=(state.foodEntries||[]).find(food=>food.id===item.payload?.id);if(entry){entry.notionSync="synced";entry.notionUrl=data.notionUrl||"";entry.notionPageId=data.notionPageId;entry.notionSyncedAt=new Date().toISOString();delete entry.notionError;}}
    state.lastSyncedAt=new Date().toISOString();record(item,"synced",{notionUrl:data.notionUrl||"",updatedAt:state.lastSyncedAt,error:""});persist();return data;
  }
  function markFailure(entry,error){
    const item=entry.item,message=String(error.message||error).slice(0,180),permanent=Boolean(error.auth||error.permanent);
    state.syncQueue=outbox.failed(state.syncQueue,item.id,message,{permanent});record(item,permanent?"permanently_failed":"retryable_failed",{error:message,updatedAt:new Date().toISOString()});markFood(item,permanent?"failed":"pending",message);
    if(error.auth){repAuth.clear();state.connectionCapabilities=null;state.syncState="auth";state.pairMessage=state.lang==="ar"?"تم إلغاء اقتران هذا الجهاز. تبقى السجلات معلّقة.":"This device was unpaired. Pending records remain on this device.";}
  }
  async function processOutbox({all=false,force=false}={}){
    if(processing||!navigator.onLine||!repAuth.isPaired()){scheduleRetry();return;}
    const entries=outbox.due(state.syncQueue,{all});if(!entries.length){scheduleRetry();return;}
    processing=true;state.syncState="syncing";state.syncProgress={done:0,total:entries.length,failed:0};state.syncMessage="";updateSyncPanel();
    for(const entry of entries){
      try{await sendItem(entry.item,{force});state.syncProgress.done++;}
      catch(error){markFailure(entry,error);state.syncProgress.failed++;state.syncProgress.done++;if(error.auth)break;}
      persist();updateSyncPanel();
    }
    processing=false;if(state.syncState!=="auth")state.syncState=state.syncProgress.failed?"pending":"synced";
    const summary=outbox.summary(state.syncQueue);
    state.syncMessage=summary.permanently_failed?`${summary.permanently_failed} record${summary.permanently_failed===1?"":"s"} failed and need${summary.permanently_failed===1?"s":""} review in Sync Center.`:summary.total?`${summary.total} record${summary.total===1?"":"s"} pending verification.`:"";
    persist();updateSyncPanel();scheduleRetry();
  }
  async function syncRecord(item){enqueue(item);await processOutbox();}
  async function syncEverything(){
    if(processing)return;if(!repAuth.isPaired()){state.syncState="auth";state.pairMessage=state.lang==="ar"?"اقرن هذا الجهاز مرة واحدة أولاً.":"Pair this device once first.";updateSyncPanel();return;}
    if(typeof fetchPendingVitals==="function") fetchPendingVitals(false).catch(()=>{});
    for(const item of collectEverything())enqueue(item,{force:true});
    if(!navigator.onLine){state.syncState="pending";state.syncMessage=state.lang==="ar"?"لا يوجد اتصال. السجلات محفوظة وستُعاد المحاولة تلقائياً.":"You are offline. Records are safely pending and will retry automatically.";persist();updateSyncPanel();return;}
    await processOutbox({all:true,force:true});
  }
  async function retryFailed(id){
    state.syncQueue=(state.syncQueue||[]).map(entry=>(!id||entry.id===id)&&["retryable_failed","permanently_failed"].includes(entry.status)?{...entry,status:"pending",nextAttemptAt:null,lastError:"",updatedAt:new Date().toISOString()}:entry);persist();await processOutbox({all:true});
  }
  async function pullFromNotion(){
    if(!navigator.onLine){state.syncMessage=state.lang==="ar"?"أنت غير متصل بالإنترنت.":"You are offline.";persist();updateSyncPanel();return;}
    if(!repAuth.isPaired()){state.syncState="auth";state.pairMessage=state.lang==="ar"?"اقرن هذا الجهاز أولاً.":"Pair this device first.";updateSyncPanel();return;}
    state.syncState="syncing";state.syncMessage=state.lang==="ar"?"جارٍ سحب التحديثات من Notion…":"Pulling updates from Notion…";updateSyncPanel();
    try{
      const response=await repAuth.fetch("/api/notion-pull",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({since:state.lastPulledAt||null})});
      const data=await response.json().catch(()=>({}));
      if(!response.ok||!data.ok)throw Error(data.error||"Failed to pull updates from Notion.");
      let updatedCount=0;
      if(Array.isArray(data.foodEntries)){
        for(const remote of data.foodEntries){
          const localIndex=(state.foodEntries||[]).findIndex(e=>e.id===remote.id||(e.notionPageId&&e.notionPageId===remote.notionPageId)||(e.date===remote.date&&e.food_name===remote.food_name));
          if(localIndex>=0){
            const local=state.foodEntries[localIndex];
            if(!local.notionSyncedAt||new Date(remote.notionSyncedAt)>=new Date(local.notionSyncedAt)){
              state.foodEntries[localIndex]={...local,...remote};updatedCount++;
            }
          }else{
            state.foodEntries.unshift(remote);updatedCount++;
          }
        }
        state.foodEntries=state.foodEntries.slice(0,400);
      }
      if(Array.isArray(data.habits)){
        for(const h of data.habits){
          if(h.date&&h.id){
            const b=window.REP_HABITS?.bucket?.(h.date,true);
            if(b&&b.checked){
              if(b.checked[h.id]!==h.completed){b.checked[h.id]=h.completed;b.updatedAt=h.updatedAt;updatedCount++;}
            }
          }
        }
      }
      state.lastPulledAt=data.syncedAt||new Date().toISOString();
      state.syncState="synced";
      state.syncMessage=state.lang==="ar"?`تم تحديث ${updatedCount} سجل من Notion.`:`Updated ${updatedCount} record${updatedCount===1?"":"s"} from Notion.`;
      persist();
      if(typeof renderNutrition==="function"&&(state.view==="food"||state.activeTab==="food"))renderNutrition();
      if(typeof renderOverview==="function"&&(state.view==="home-overview"||state.activeTab==="home"))renderOverview();
      updateSyncPanel();
    }catch(error){
      state.syncState="pending";
      state.syncMessage=String(error.message||error);
      persist();
      updateSyncPanel();
    }
  }
  function install(){
    state.syncQueue=(state.syncQueue||[]).map(outbox.normalize).filter(Boolean);persist();syncPending=syncEverything;
    queueWorkout=record=>{if(!record?.entries?.length)return;persist();void syncRecord(workoutItem(record));};
    queueHealth=(kind,payload)=>{persist();void syncRecord(healthItem(kind,payload));};
    addEventListener("online",()=>void processOutbox());document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")void processOutbox();});
    if(repAuth.isPaired())repAuth.fetch("/api/pair-check",{method:"POST"}).then(async response=>{const data=await response.json().catch(()=>({}));if(!response.ok||!data.ok)throw Error(data.error||"Pairing check failed.");state.connectionCapabilities=data;persist();updateSyncPanel();void processOutbox();}).catch(()=>{});scheduleRetry();
  }
  window.REP_SYNC_RUNTIME={install,syncEverything,syncRecord,pullFromNotion,retryFailed,processOutbox,collectEverything,REQUEST_TIMEOUT_MS};
})();
