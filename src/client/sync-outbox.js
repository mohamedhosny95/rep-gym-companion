(function(){
  const SCHEMA=1,MAX_ATTEMPTS=12,MAX_DELAY_MS=30*60*1000,TRANSMIT_TIMEOUT_MS=30*1000;
  const nowIso=()=>new Date().toISOString();
  const cloneItem=item=>JSON.parse(JSON.stringify(item));
  const delayFor=attempts=>Math.min(MAX_DELAY_MS,5000*2**Math.max(0,Math.min(10,attempts-1)));
  function normalize(entry){
    if(!entry?.item?.id)return null;
    const revision=Math.max(1,Math.floor(Number(entry.revision??entry.version)||1));
    return {
      schema:SCHEMA,
      id:String(entry.item.id),
      item:cloneItem(entry.item),
      status:entry.status||"pending",
      attempts:Math.max(0,Number(entry.attempts)||0),
      createdAt:entry.createdAt||nowIso(),
      updatedAt:entry.updatedAt||nowIso(),
      nextAttemptAt:entry.nextAttemptAt||null,
      lastError:String(entry.lastError||"").slice(0,180),
      revision,
      version:revision,
      transmittingAt:entry.status==="transmitting"?(entry.transmittingAt||null):null
    };
  }
  function enqueue(queue,item,{force=false}={}){
    const list=Array.isArray(queue)?queue.map(normalize).filter(Boolean):[];
    const itemId=String(item?.id);
    const index=list.findIndex(entry=>entry.id===itemId),previous=index>=0?list[index]:null;
    if(previous&&!force&&["pending","transmitting","retryable_failed"].includes(previous.status)){
      const nextRevision=(Number(previous.revision)||1)+1;
      previous.item=cloneItem(item);
      previous.updatedAt=nowIso();
      previous.revision=nextRevision;
      previous.version=nextRevision;
      return list;
    }
    const baseRevision=previous?((Number(previous.revision)||1)+1):1;
    const next={
      schema:SCHEMA,
      id:itemId,
      item:cloneItem(item),
      status:"pending",
      attempts:force?0:(previous?.attempts||0),
      createdAt:previous?.createdAt||nowIso(),
      updatedAt:nowIso(),
      nextAttemptAt:null,
      lastError:"",
      revision:baseRevision,
      version:baseRevision,
      transmittingAt:null
    };
    if(index>=0)list.splice(index,1,next);else list.push(next);
    return list.slice(-1000);
  }
  function update(queue,id,changes){
    const targetId=String(id);
    return (Array.isArray(queue)?queue:[]).map(normalize).filter(Boolean).map(entry=>entry.id===targetId?{...entry,...changes,updatedAt:nowIso()}:entry);
  }
  function transmitting(queue,id){
    const targetId=String(id);
    const entry=(queue||[]).find(item=>String(item?.id||item?.item?.id)===targetId);
    return update(queue,targetId,{status:"transmitting",attempts:(Number(entry?.attempts)||0)+1,nextAttemptAt:null,lastError:"",transmittingAt:nowIso()});
  }
  function failed(queue,id,error,{permanent=false,revision}={}){
    const targetId=String(id);
    const targetRevision=typeof revision==="object"&&revision!==null?revision.revision:revision;
    const entry=(queue||[]).find(item=>String(item?.id||item?.item?.id)===targetId);
    if(targetRevision!=null&&entry&&Number(entry.revision)>Number(targetRevision)){
      return update(queue,targetId,{status:"pending",transmittingAt:null,nextAttemptAt:null});
    }
    const attempts=Number(entry?.attempts)||1,exhausted=attempts>=MAX_ATTEMPTS,status=permanent||exhausted?"permanently_failed":"retryable_failed";
    return update(queue,targetId,{status,transmittingAt:null,lastError:String(error||"Synchronization failed.").slice(0,180),nextAttemptAt:status==="retryable_failed"?new Date(Date.now()+delayFor(attempts)).toISOString():null});
  }
  function remove(queue,id,revisionOrOptions){
    const targetId=String(id);
    const targetRevision=typeof revisionOrOptions==="object"&&revisionOrOptions!==null?revisionOrOptions.revision:revisionOrOptions;
    return (Array.isArray(queue)?queue:[]).map(normalize).filter(Boolean).flatMap(entry=>{
      if(entry.id!==targetId)return [entry];
      if(targetRevision!=null&&Number(entry.revision)>Number(targetRevision)){
        return [{...entry,status:"pending",transmittingAt:null,nextAttemptAt:null,updatedAt:nowIso()}];
      }
      return [];
    });
  }
  function reclaim(queue,{timeoutMs=TRANSMIT_TIMEOUT_MS,now=Date.now(),startup=false}={}){
    return (Array.isArray(queue)?queue:[]).map(normalize).filter(Boolean).map(entry=>{
      if(entry.status!=="transmitting")return entry;
      const started=entry.transmittingAt?Date.parse(entry.transmittingAt):NaN;
      const stale=startup||!entry.transmittingAt||Number.isNaN(started)||(now-started>=timeoutMs);
      if(stale){
        return {...entry,status:"pending",transmittingAt:null,nextAttemptAt:null,updatedAt:nowIso()};
      }
      return entry;
    });
  }
  function due(queue,{all=false,timeoutMs=TRANSMIT_TIMEOUT_MS,now=Date.now()}={}){
    const reclaimed=reclaim(queue,{timeoutMs,now});
    return reclaimed.filter(entry=>all||entry.status==="pending"||(entry.status==="retryable_failed"&&(!entry.nextAttemptAt||Date.parse(entry.nextAttemptAt)<=now)));
  }
  const summary=queue=>(Array.isArray(queue)?queue:[]).map(normalize).filter(Boolean).reduce((result,entry)=>{result.total++;result[entry.status]=(result[entry.status]||0)+1;return result;},{total:0,pending:0,transmitting:0,retryable_failed:0,permanently_failed:0});
  window.REP_SYNC_OUTBOX={SCHEMA,MAX_ATTEMPTS,TRANSMIT_TIMEOUT_MS,normalize,enqueue,transmitting,failed,remove,reclaim,due,summary,delayFor};
})();
