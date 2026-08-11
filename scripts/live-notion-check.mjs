#!/usr/bin/env node

const token=process.env.NOTION_TEST_TOKEN||"",sourceId=String(process.env.NOTION_TEST_DATA_SOURCE_ID||"").replace(/-/g,"");
if(!token||!sourceId){console.log("Live Notion check skipped: configure NOTION_TEST_TOKEN and NOTION_TEST_DATA_SOURCE_ID.");process.exit(0);}

const version="2026-03-11",base="https://api.notion.com/v1";
async function notion(path,init={}){
  const response=await fetch(`${base}${path}`,{...init,headers:{authorization:`Bearer ${token}`,"notion-version":version,"content-type":"application/json",...(init.headers||{})}}),data=await response.json().catch(()=>({}));
  if(!response.ok)throw Error(data.message||`Notion request failed (${response.status}).`);
  return data;
}

const required={Name:"title",Date:"date","Meal Type":"select","Log Method":"select",Calories:"number",Protein:"number",Carbs:"number",Fat:"number",Fiber:"number",Sugar:"number",Sodium:"number","Portion Size":"rich_text",Confidence:"select",Notes:"rich_text"};
let createdPageId="";
try{
  const source=await notion(`/data_sources/${sourceId}`),missing=[],incompatible=[];
  for(const [name,type] of Object.entries(required)){const actual=source.properties?.[name]?.type;if(!actual)missing.push(name);else if(actual!==type)incompatible.push(`${name}: ${actual} != ${type}`);}
  if(source.archived||source.in_trash)throw Error("The test Food Entries source is in Trash.");
  if(missing.length||incompatible.length)throw Error(`Food schema mismatch. Missing: ${missing.join(", ")||"none"}. Incompatible: ${incompatible.join(", ")||"none"}.`);
  const marker=`Health OS live check ${new Date().toISOString()}`;
  const created=await notion("/pages",{method:"POST",body:JSON.stringify({parent:{type:"data_source_id",data_source_id:sourceId},properties:{Name:{title:[{type:"text",text:{content:marker}}]},Date:{date:{start:new Date().toISOString()}},"Meal Type":{select:{name:"Snack"}},"Log Method":{select:{name:"Ingredients"}},Notes:{rich_text:[{type:"text",text:{content:"Automated integration test; safe to archive."}}]}}})});
  createdPageId=created.id;
  const verified=await notion(`/pages/${createdPageId}`),parent=String(verified.parent?.data_source_id||verified.parent?.database_id||"").replace(/-/g,"");
  if(verified.archived||verified.in_trash||parent!==sourceId)throw Error("Notion did not verify the test page in the expected data source.");
  console.log(`Live Notion check passed for data source ${sourceId.slice(0,8)}…`);
}finally{
  if(createdPageId)await notion(`/pages/${createdPageId}`,{method:"PATCH",body:JSON.stringify({archived:true})}).catch(error=>console.warn(`Could not archive live-check page: ${error.message}`));
}
