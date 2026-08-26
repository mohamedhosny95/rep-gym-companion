#!/usr/bin/env node
// End-to-end staging contract: isolated Worker -> test Notion source -> verified
// read receipt -> cleanup. It refuses to run unless the Worker identifies itself
// as staging and a dedicated Notion test token is supplied.
const base=String(process.env.REP_STAGING_URL||"").replace(/\/$/,""),pairingKey=process.env.REP_STAGING_SYNC_KEY,notionToken=process.env.NOTION_TEST_TOKEN;
if(!/^https:\/\//.test(base)||!pairingKey||pairingKey.length<32||!notionToken){console.error("Set REP_STAGING_URL, REP_STAGING_SYNC_KEY (32+ characters), and NOTION_TEST_TOKEN.");process.exit(2);}
const headers={"content-type":"application/json","x-rep-sync-key":pairingKey};
const request=async(path,init={})=>{const response=await fetch(`${base}${path}`,{...init,headers:{...headers,...init.headers}}),body=await response.json().catch(()=>({}));if(!response.ok)throw Error(`${path} failed (${response.status}): ${body.error||"unknown error"}`);return body;};
let notionPageId="";
try{
  const health=await request("/api/system-health");
  if(health.environment!=="staging")throw Error(`Refusing to test environment ${health.environment||"unknown"}.`);
  if(!health.notion?.healthy)throw Error(`Staging Notion contract is unhealthy: ${health.notion?.error||"unknown"}`);
  const id=`staging-${crypto.randomUUID()}`,payload={kind:"food",payload:{id,date:new Date().toISOString(),food_name:"Rep staging contract — safe to archive",mealType:"Snack",logMethod:"Manual",calories:1,protein_g:0,carbs_g:0,fat_g:0,notes:"Automated staging contract row; archived in finally."}};
  const receipt=await request("/api/notion-sync",{method:"POST",headers:{"x-rep-idempotency-key":id},body:JSON.stringify(payload)});
  if(!receipt.verified||receipt.entryId!==id||!receipt.notionPageId)throw Error("Staging did not return a matching verified receipt.");
  notionPageId=receipt.notionPageId;
  const pageResponse=await fetch(`https://api.notion.com/v1/pages/${notionPageId}`,{headers:{authorization:`Bearer ${notionToken}`,"notion-version":"2026-03-11"}}),page=await pageResponse.json();
  if(!pageResponse.ok||page.id?.replaceAll("-","")!==notionPageId.replaceAll("-",""))throw Error("Notion post-write read did not match the receipt.");
  console.log(JSON.stringify({ok:true,environment:health.environment,notionSourceId:health.notion.sourceId,receiptVerified:true}));
}finally{
  if(notionPageId){const cleanup=await fetch(`https://api.notion.com/v1/pages/${notionPageId}`,{method:"PATCH",headers:{authorization:`Bearer ${notionToken}`,"notion-version":"2026-03-11","content-type":"application/json"},body:JSON.stringify({in_trash:true})});if(!cleanup.ok){console.error(`Cleanup failed for Notion page ${notionPageId}.`);process.exitCode=1;}}
}
