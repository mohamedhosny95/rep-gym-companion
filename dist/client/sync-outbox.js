(function(){
  const SCHEMA=1,MAX_ATTEMPTS=12,MAX_DELAY_MS=30*60*1000;
  const nowIso=()=>new Date().toISOString();
  const cloneItem=item=>JSON.parse(JSON.stringify(item));
  const delayFor=attempts=>Math.min(MAX_DELAY_MS,5000*2**Math.max(0,Math.min(10,attempts-1)));
  function normalize(entry){
    if(!entry?.item?.id)return null;
    return {schema:SCHEMA,id:String(entry.item.id),item:cloneItem(entry.item),status:entry.status||"pending",attempts:Math.max(0,Number(entry.attempts)||0),createdAt:entry.createdAt||nowIso(),updatedAt:entry.updatedAt||nowIso(),nextAttemptAt:entry.nextAttemptAt||null,lastError:String(entry.lastError||"").slice(0,180)};
  }
  function enqueue(queue,item,{force=false}={}){
    const list=Array.isArray(queue)?queue.map(normalize).filter(Boolean):[],index=list.findIndex(entry=>entry.id===item.id),previous=index>=0?list[index]:null;
    if(previous&&!force&&["pending","transmitting","retryable_failed"].includes(previous.status)){previous.item=cloneItem(item);previous.updatedAt=nowIso();return list;}
    const next={schema:SCHEMA,id:String(item.id),item:cloneItem(item),status:"pending",attempts:previous?.attempts||0,createdAt:previous?.createdAt||nowIso(),updatedAt:nowIso(),nextAttemptAt:null,lastError:""};
    if(index>=0)list.splice(index,1,next);else list.push(next);
    return list.slice(-1000);
  }
  function update(queue,id,changes){return (Array.isArray(queue)?queue:[]).map(normalize).filter(Boolean).map(entry=>entry.id===id?{...entry,...changes,updatedAt:nowIso()}:entry);}
  function transmitting(queue,id){const entry=(queue||[]).find(item=>item?.id===id);return update(queue,id,{status:"transmitting",attempts:(Number(entry?.attempts)||0)+1,nextAttemptAt:null,lastError:""});}
  function failed(queue,id,error,{permanent=false}={}){
    const entry=(queue||[]).find(item=>item?.id===id),attempts=Number(entry?.attempts)||1,exhausted=attempts>=MAX_ATTEMPTS,status=permanent||exhausted?"permanently_failed":"retryable_failed";
    return update(queue,id,{status,lastError:String(error||"Synchronization failed.").slice(0,180),nextAttemptAt:status==="retryable_failed"?new Date(Date.now()+delayFor(attempts)).toISOString():null});
  }
  const remove=(queue,id)=>(Array.isArray(queue)?queue:[]).map(normalize).filter(Boolean).filter(entry=>entry.id!==id);
  const due=(queue,{all=false}={})=>(Array.isArray(queue)?queue:[]).map(normalize).filter(Boolean).filter(entry=>all||entry.status==="pending"||(entry.status==="retryable_failed"&&(!entry.nextAttemptAt||Date.parse(entry.nextAttemptAt)<=Date.now())));
  const summary=queue=>(Array.isArray(queue)?queue:[]).map(normalize).filter(Boolean).reduce((result,entry)=>{result.total++;result[entry.status]=(result[entry.status]||0)+1;return result;},{total:0,pending:0,transmitting:0,retryable_failed:0,permanently_failed:0});
  window.REP_SYNC_OUTBOX={SCHEMA,MAX_ATTEMPTS,normalize,enqueue,transmitting,failed,remove,due,summary,delayFor};
})();
