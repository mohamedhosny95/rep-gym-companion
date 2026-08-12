(function(){
  const REQUEST_TIMEOUT_MS=30000,SIGNATURES_KEY="rep-sync-signatures-v1";
  const typeMap={morning:"Morning Activation",gym:"Gym",cardio:"Cardio",bad:"Bad Day Floor",gymLite:"Reduced Gym"};
  const activityLabel=item=>item.payload?.food_name||item.payload?.rawNote||item.workout?.type||item.payload?.plan||item.payload?.date||item.kind||"Sync record";
  const record=(item,status,extra={})=>window.REP_SYNC_CENTER?.record(state,{id:item.id,kind:item.kind,label:activityLabel(item),status,...extra});
  const signatures=()=>{try{return JSON.parse(localStorage.getItem(SIGNATURES_KEY)||"{}");}catch{return {};}};
  const saveSignatures=value=>localStorage.setItem(SIGNATURES_KEY,JSON.stringify(value));
  const workoutItem=entry=>({id:`workout-${entry.id}`,kind:"workout",workout:{id:String(entry.id),date:entry.date,type:typeMap[entry.session]||entry.activityLabel||"Recovery",duration:entry.duration,entries:entry.entries}});
  const healthItem=(kind,payload)=>({id:`${kind}-${kind==="food"?(payload.id||Date.now()):payload.date}`,kind,payload:{...payload}});

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
      const day=care[date]||{};
      const checked=day.checked||{},keys=Object.keys(checked),done=keys.filter(key=>checked[key]).length,complete=prefix=>{const group=keys.filter(key=>key.startsWith(`${prefix}-`));return group.length>0&&group.every(key=>checked[key]);};
      return healthItem("hygiene",{date,morningComplete:complete("morning"),eveningComplete:complete("evening"),postWorkoutComplete:complete("post"),hairRoutineComplete:complete("hair"),spf:Boolean(checked["morning-0"]),floss:Boolean(checked["evening-1"]),beardOil:Boolean(checked["morning-3"]&&checked["evening-3"]),showerWithin30m:Boolean(checked["post-0"]),completion:keys.length?Math.round(done/keys.length*100):0,notes:day.notes||""});
    });
  }

  function collectEverything(){
    const items=[
      ...(state.history||[]).filter(entry=>entry?.entries?.length).map(workoutItem),
      ...(state.foodEntries||[]).filter(entry=>entry?.id&&entry?.date).map(entry=>healthItem("food",entry)),
      ...(state.recoveryCheckins||[]).filter(entry=>entry?.date).map(entry=>healthItem("recovery",entry)),
      ...(state.sleepLogs||[]).filter(entry=>entry?.date).map(entry=>healthItem("sleep",{...entry,sleep:entry.sleep??entry.hours})),
      ...hygieneItems()
    ];
    const nutrition=nutritionItem();if(nutrition)items.push(nutrition);
    return [...new Map(items.map(item=>[item.id,item])).values()];
  }

  async function sendItem(item,{force=false}={}){
    if(!navigator.onLine)throw Error("You are offline. Your data is saved on this device; use Sync everything when you are online.");
    if(!repAuth.isPaired())throw Object.assign(Error("Pair this device once before syncing."),{auth:true});
    const body=item.kind==="workout"?{workout:item.workout}:{kind:item.kind,payload:item.payload},serialized=JSON.stringify(body),known=signatures();
    if(!force&&known[item.id]===serialized)return {ok:true,verified:true,unchanged:true};
    record(item,"processing",{updatedAt:new Date().toISOString(),error:""});
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),REQUEST_TIMEOUT_MS);
    let response;
    try{response=await repAuth.fetch("/api/notion-sync",{method:"POST",headers:{"content-type":"application/json","x-rep-idempotency-key":item.id},body:serialized,signal:controller.signal});}
    catch(error){if(controller.signal.aborted)throw Error("The direct Notion save timed out. Nothing was queued; tap Sync everything to try again.");throw error;}
    finally{clearTimeout(timeout);}
    const data=await response.json().catch(()=>({})),receiptMatches=data.verified===true&&(item.kind==="workout"||Boolean(data.notionPageId))&&(item.kind==="workout"||data.kind===item.kind)&&(item.kind!=="food"||data.entryId===item.payload?.id);
    if(!response.ok||!data.ok||!receiptMatches)throw Object.assign(Error(data.error||"Notion did not return a verified save receipt."),{auth:response.status===401});
    known[item.id]=serialized;saveSignatures(known);
    if(item.kind==="food"){
      const entry=state.foodEntries.find(food=>food.id===item.payload.id);
      if(entry){entry.notionSync="synced";entry.notionUrl=data.notionUrl||"";entry.notionPageId=data.notionPageId;entry.notionSyncedAt=new Date().toISOString();delete entry.notionError;}
    }
    state.lastSyncedAt=new Date().toISOString();record(item,"synced",{notionUrl:data.notionUrl||"",updatedAt:state.lastSyncedAt,error:""});persist();
    return data;
  }

  async function syncRecord(item){
    try{await sendItem(item);state.syncState="synced";state.syncMessage="";}
    catch(error){
      record(item,"failed",{error:String(error.message||error).slice(0,180),updatedAt:new Date().toISOString()});
      if(item.kind==="food"){const entry=state.foodEntries.find(food=>food.id===item.payload?.id);if(entry){entry.notionSync="failed";entry.notionError=String(error.message||error).slice(0,180);}}
      if(error.auth){repAuth.clear();state.connectionCapabilities=null;state.syncState="auth";state.pairMessage=state.lang==="ar"?"تم إلغاء اقتران هذا الجهاز. أدخل المفتاح مرة أخرى.":"This device was unpaired or revoked. Enter the pairing key again.";}
      else{state.syncState="failed";state.syncMessage=String(error.message||error).slice(0,180);}
    }
    persist();updateSyncPanel();
  }

  async function syncEverything(){
    if(state.syncState==="syncing")return;
    if(!repAuth.isPaired()){state.syncState="auth";state.pairMessage=state.lang==="ar"?"اقرن هذا الجهاز مرة واحدة أولاً.":"Pair this device once first.";updateSyncPanel();return;}
    if(!navigator.onLine){state.syncState="failed";state.syncMessage=state.lang==="ar"?"لا يوجد اتصال. لم تتم إضافة أي شيء إلى قائمة انتظار.":"You are offline. Nothing was added to a queue.";updateSyncPanel();return;}
    const items=collectEverything();state.syncState="syncing";state.syncProgress={done:0,total:items.length,failed:0};state.syncMessage="";updateSyncPanel();
    const markFailed=(item,message)=>{
      state.syncProgress.failed++;state.syncProgress.done++;
      record(item,"failed",{error:message,updatedAt:new Date().toISOString()});
      if(item.kind==="food"){const entry=state.foodEntries.find(food=>food.id===item.payload?.id);if(entry){entry.notionSync="failed";entry.notionError=message;}}
      updateSyncPanel();
    };
    for(let index=0;index<items.length;index++){
      const item=items[index];
      try{await sendItem(item,{force:true});state.syncProgress.done++;updateSyncPanel();}
      catch(error){
        markFailed(item,String(error.message||error).slice(0,180));
        if(error.auth){
          repAuth.clear();state.connectionCapabilities=null;state.syncState="auth";state.pairMessage=state.lang==="ar"?"تم إلغاء اقتران هذا الجهاز.":"This device was unpaired or revoked.";
          // Every item this run didn't reach is shown as not saved too, rather
          // than silently keeping whatever status it had before this run.
          const notAttempted=state.lang==="ar"?"لم تتم المحاولة: تم إلغاء اقتران الجهاز.":"Not attempted: this device was unpaired.";
          for(const remaining of items.slice(index+1))markFailed(remaining,notAttempted);
          break;
        }
      }
    }
    if(state.syncState!=="auth")state.syncState=state.syncProgress.failed?"failed":"synced";
    state.syncMessage=state.syncProgress.failed?`${state.syncProgress.failed} record${state.syncProgress.failed===1?"":"s"} could not be saved directly.`:"";persist();
    if(state.view==="nutrition")renderNutrition();else updateSyncPanel();
  }

  function install(){
    // v67 intentionally discards the legacy retry queue. Source data remains
    // in its normal local collections and can be sent with one global action.
    state.syncQueue=[];persist();
    syncPending=syncEverything;
    queueWorkout=record=>{if(!record?.entries?.length)return;persist();void syncRecord(workoutItem(record));};
    queueHealth=(kind,payload)=>{persist();void syncRecord(healthItem(kind,payload));};
    if(repAuth.isPaired())repAuth.fetch("/api/pair-check",{method:"POST"}).then(async response=>{const data=await response.json().catch(()=>({}));if(!response.ok||!data.ok)throw Error(data.error||"Pairing check failed.");state.connectionCapabilities=data;persist();updateSyncPanel();}).catch(()=>{});
  }
  window.REP_SYNC_RUNTIME={install,syncEverything,syncRecord,collectEverything,REQUEST_TIMEOUT_MS};
})();
