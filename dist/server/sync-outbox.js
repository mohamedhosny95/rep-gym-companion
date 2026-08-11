const JOB_PREFIX="syncjob:",RECEIPT_PREFIX="syncreceipt:";
const JOB_TTL=60*60*48,RECEIPT_TTL=60*60*24*30,MAX_ATTEMPTS=8;

const clean=(value,max=300)=>String(value??"").trim().slice(0,max);
const jobKey=id=>`${JOB_PREFIX}${id}`;
const receiptKey=id=>`${RECEIPT_PREFIX}${id}`;

async function readJson(env,key){
  const raw=await env.PUSH_KV?.get(key);
  if(!raw)return null;
  try{return JSON.parse(raw);}catch{return null;}
}

export async function findSyncReceipt(env,id){return env.PUSH_KV?readJson(env,receiptKey(id)):null;}
export async function findSyncJob(env,id){return env.PUSH_KV?readJson(env,jobKey(id)):null;}

export async function enqueueSyncJob(env,id,body,{force=false}={}){
  if(!env.PUSH_KV)return null;
  const receipt=await findSyncReceipt(env,id);
  if(receipt?.ok&&receipt?.verified)return {receipt};
  const key=jobKey(id),existing=await readJson(env,key);
  if(existing&&!(force&&existing.status==="failed"))return {job:existing};
  const now=Date.now(),job={id,body,status:"pending",attempts:0,lastError:"",createdAt:existing?.createdAt||new Date(now).toISOString(),updatedAt:new Date(now).toISOString(),nextAttemptAt:now};
  await env.PUSH_KV.put(key,JSON.stringify(job),{expirationTtl:JOB_TTL});
  console.log(JSON.stringify({event:"sync_job_accepted",id,status:job.status}));
  return {job};
}

export function acceptedSyncReceipt(job){
  return {ok:true,accepted:true,verified:false,jobId:job.id,status:job.status,attempts:Number(job.attempts)||0,nextAttemptAt:job.nextAttemptAt||null,error:job.status==="failed"?clean(job.lastError):undefined};
}

export async function processSyncJob(env,id,executor){
  if(!env.PUSH_KV)return null;
  const key=jobKey(id),job=await readJson(env,key);
  if(!job||job.status==="processing"||Number(job.nextAttemptAt)>Date.now())return job;
  job.status="processing";job.updatedAt=new Date().toISOString();
  await env.PUSH_KV.put(key,JSON.stringify(job),{expirationTtl:JOB_TTL});
  try{
    const response=await executor(job.body),receipt=await response.clone().json().catch(()=>null);
    if(!response.ok||!receipt?.ok||!receipt?.verified)throw Error(receipt?.error||`Sync failed (${response.status}).`);
    await env.PUSH_KV.put(receiptKey(id),JSON.stringify(receipt),{expirationTtl:RECEIPT_TTL});
    await env.PUSH_KV.delete(key);
    console.log(JSON.stringify({event:"sync_job_succeeded",id,attempts:job.attempts}));
    return {...job,status:"synced",receipt};
  }catch(error){
    job.attempts=(Number(job.attempts)||0)+1;job.lastError=clean(error?.message||error);job.updatedAt=new Date().toISOString();
    if(job.attempts>=MAX_ATTEMPTS){job.status="failed";job.nextAttemptAt=null;}
    else{const delay=Math.min(15*60*1000,30*1000*2**Math.min(job.attempts-1,5));job.status="pending";job.nextAttemptAt=Date.now()+delay;}
    await env.PUSH_KV.put(key,JSON.stringify(job),{expirationTtl:JOB_TTL});
    console.warn(JSON.stringify({event:job.status==="failed"?"sync_job_failed":"sync_job_retry_scheduled",id,attempts:job.attempts,nextAttemptAt:job.nextAttemptAt}));
    return job;
  }
}

export async function drainSyncOutbox(env,executor,limit=25){
  if(!env.PUSH_KV)return {processed:0};
  const list=await env.PUSH_KV.list({prefix:JOB_PREFIX,limit:Math.max(1,Math.min(limit,100))});let processed=0;
  for(const key of list.keys){
    const id=key.name.slice(JOB_PREFIX.length),job=await readJson(env,key.name);
    if(!job||job.status==="failed"||Number(job.nextAttemptAt)>Date.now())continue;
    await processSyncJob(env,id,executor);processed++;
  }
  return {processed};
}

export async function syncOutboxHealth(env){
  if(!env.PUSH_KV)return {configured:false,pending:0,failed:0,oldest:null};
  const list=await env.PUSH_KV.list({prefix:JOB_PREFIX,limit:1000});let pending=0,failed=0,oldest=null;
  for(const key of list.keys){const job=await readJson(env,key.name);if(!job)continue;if(job.status==="failed")failed++;else pending++;if(!oldest||job.createdAt<oldest)oldest=job.createdAt;}
  return {configured:true,pending,failed,oldest,truncated:Boolean(list.cursor)};
}
