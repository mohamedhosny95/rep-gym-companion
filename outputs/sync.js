(function(){
  const REQUEST_TIMEOUT_MS=25000,HEARTBEAT_MS=60000;
  function install(){
    syncPending=async function(force=false){
      const key=localStorage.getItem(syncKeyStorage);if(!key||state.syncState==="syncing"||!navigator.onLine||state.connectionCapabilities?.notion===false)return;
      const manual=force===true||Boolean(force?.isTrusted);if(manual)for(const item of state.syncQueue){delete item.nextAttemptAt;delete item.serverJobId;}
      state.syncState="syncing";updateSyncPanel();
      for(const item of [...state.syncQueue]){
        if(!manual&&item.nextAttemptAt&&Date.now()<item.nextAttemptAt)continue;
        try{
          const legacy=item.workout&&!item.kind,body=(legacy||item.kind==="workout")?{workout:item.workout}:{kind:item.kind,payload:item.payload},id=item.id||`workout-${item.workout?.id}`;
          const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),REQUEST_TIMEOUT_MS);let response;
          try{
            const statusPath=item.serverJobId?`/api/sync-status?id=${encodeURIComponent(item.serverJobId)}`:"/api/notion-sync";
            response=await repAuth.fetch(statusPath,item.serverJobId?{method:"GET",signal:controller.signal}:{method:"POST",headers:{"content-type":"application/json","x-rep-idempotency-key":id,...(manual?{"x-rep-sync-force":"true"}:{})},body:JSON.stringify(body),signal:controller.signal});
          }catch(error){if(controller.signal.aborted)throw Error("Notion confirmation timed out; automatic retry is scheduled.");throw error;}finally{clearTimeout(timeout);}
          const data=await response.json().catch(()=>({}));
          if(response.status===202&&data.accepted){item.serverJobId=data.jobId;item.attempts=Number(data.attempts)||item.attempts||0;item.nextAttemptAt=Math.max(Date.now()+5000,Number(data.nextAttemptAt)||0);item.error="";const entry=item.kind==="food"&&state.foodEntries.find(food=>food.id===item.payload?.id);if(entry){entry.notionSync="pending";delete entry.notionError;}persist();continue;}
          const receiptMatches=data.verified===true&&(item.kind==="workout"||Boolean(data.notionPageId))&&(!item.kind||item.kind==="workout"||data.kind===item.kind)&&(item.kind!=="food"||data.entryId===item.payload?.id);
          if(!response.ok||!data.ok||!receiptMatches){if(item.serverJobId&&response.status>=400&&response.status!==401)delete item.serverJobId;const error=Error(data.error||"Notion did not return a verified save receipt.");error.auth=response.status===401;throw error;}
          if(item.kind==="food"){const entry=state.foodEntries.find(food=>food.id===item.payload.id);if(entry){entry.notionSync="synced";entry.notionUrl=data.notionUrl||"";entry.notionPageId=data.notionPageId;entry.notionSyncedAt=new Date().toISOString();delete entry.notionError;}}
          state.syncQueue=state.syncQueue.filter(q=>(q.id||`workout-${q.workout?.id}`)!==id);state.lastSyncedAt=new Date().toISOString();persist();
        }catch(error){
          item.attempts=(item.attempts||0)+1;item.error=String(error.message||error).slice(0,180);const entry=item.kind==="food"&&state.foodEntries.find(food=>food.id===item.payload?.id);if(entry){entry.notionSync="failed";entry.notionError=item.error;}
          if(error.auth){repAuth.clear();state.connectionCapabilities=null;state.syncState="auth";state.pairMessage=state.lang==="ar"?"انتهى اقتران الجهاز. أعد الاتصال.":"Device pairing expired. Reconnect.";}
          else{state.syncState="failed";const delay=Math.min(15*60*1000,30*1000*2**Math.min(item.attempts-1,5));item.nextAttemptAt=Date.now()+delay;setTimeout(()=>syncPending(),delay);}
          persist();if(state.view==="nutrition")renderNutrition();else updateSyncPanel();return;
        }
      }
      state.syncState=state.syncQueue.length?"pending":"synced";persist();if(state.view==="nutrition")renderNutrition();else updateSyncPanel();
    };
    const resume=()=>{if(document.visibilityState==="visible"&&navigator.onLine&&state.syncQueue.length&&localStorage.getItem(syncKeyStorage))syncPending();};
    document.addEventListener("visibilitychange",resume);addEventListener("pageshow",resume);addEventListener("focus",resume);setInterval(resume,HEARTBEAT_MS);setTimeout(resume,1200);
  }
  window.REP_SYNC_RUNTIME={install,REQUEST_TIMEOUT_MS,HEARTBEAT_MS};
})();
