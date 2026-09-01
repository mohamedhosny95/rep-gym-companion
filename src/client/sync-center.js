(function(){
  const DESTINATION_URL="https://app.notion.com/p/mohamedhosny95/6433f54c687e4813869aaadeaf3acaab?v=bde632d4554c4344a3a6a9e1eb15fd50&source=copy_link";
  const esc=value=>String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[char]);
  const time=value=>value?new Date(value).toLocaleString(undefined,{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}):"—";
  const kindLabel=kind=>({food:"Meal",workout:"Workout",nutrition:"Nutrition summary",recovery:"Recovery",sleep:"Sleep",hygiene:"Daily care",habit:"Habit"})[kind]||("Log");
  function summary(item){const payload=item.payload||item.workout||{};return payload.food_name||payload.rawNote||payload.type||payload.plan||payload.date||kindLabel(item.kind);}
  function record(state,event){
    state.syncActivity=Array.isArray(state.syncActivity)?state.syncActivity:[];
    const id=String(event.id||"");if(!id)return;
    state.syncActivity=[{...state.syncActivity.find(item=>item.id===id),...event,id,updatedAt:event.updatedAt||new Date().toISOString()},...state.syncActivity.filter(item=>item.id!==id)].slice(0,40);
  }
  function statusRow(item){
    const status=item.status||"synced",labels={pending:"Pending",transmitting:"Transmitting",retryable_failed:"Retry scheduled",permanently_failed:"Needs attention",synced:"Confirmed"};
    return `<article class="sync-activity-row is-${esc(status)}"><div><small>${esc(kindLabel(item.kind))}</small><strong>${esc(item.label||summary(item))}</strong><span>${esc(labels[status]||status)} · ${esc(time(item.updatedAt||item.createdAt))}</span>${item.error?`<p>${esc(item.error)}</p>`:""}</div><div class="sync-row-actions">${item.notionUrl?`<a href="${esc(item.notionUrl)}" target="_blank" rel="noopener">${"Open"}</a>`:""}</div></article>`;
  }
  function render(state){
    const health=state.systemHealth||{},notion=health.notion||{},monitor=health.monitor||{},infra=health.infrastructure||{},progress=state.syncProgress||{},queue=window.REP_SYNC_OUTBOX?.summary(state.syncQueue)||{total:0,permanently_failed:0,retryable_failed:0};
    const destination=notion.destination||{name:"View of Food Entries",url:DESTINATION_URL},activity=(state.syncActivity||[]).slice(0,30),total=window.REP_SYNC_RUNTIME?.collectEverything?.().length||0;
    const checks=[["Notion",Boolean(notion.healthy)],["Encrypted backups",Boolean(infra.backups?.configured)],["Push",Boolean(infra.push?.configured)],["HealthKit",Boolean(infra.healthkit?.configured)]];
    return `<section class="sync-center">
      <section class="settings-card sync-destination ${notion.healthy?"is-healthy":"needs-attention"}"><small>${"NOTION DESTINATION"}</small><h2>${esc(destination.name||"View of Food Entries")}</h2><p>${notion.healthy?("The original source is available and its schema is valid."):(esc(notion.error)||("Check the connection and source database."))}</p><a class="settings-primary destination-link" href="${esc(destination.url||DESTINATION_URL)}" target="_blank" rel="noopener">${"Open the correct view"}</a><div class="destination-meta"><span>${"Last check"}: ${esc(time(health.checkedAt||monitor.checkedAt))}</span><span>${"Source"}: ${esc(notion.sourceId||"—")}</span></div></section>
      <section class="settings-card"><div class="sync-center-head"><div><small>${"VERIFIED SYNC"}</small><h2>${"Durable locally, verified in Notion"}</h2></div><button data-sync-refresh>${"Refresh check"}</button></div><div class="health-facts"><span><b>${total}</b>${"Available records"}</span><span><b>${queue.total}</b>${"Pending"}</span><span><b>${queue.permanently_failed||0}</b>${"Needs attention"}</span></div><div class="sync-actions"><button class="settings-primary" data-sync-all ${state.syncState==="syncing"?"disabled":""}>${state.syncState==="syncing"?(`Saving ${progress.done||0}/${progress.total||total}…`):("Sync everything")}</button><button data-sync-pull ${state.syncState==="syncing"?"disabled":""}>${"Pull from Notion"}</button>${queue.total?`<button data-sync-retry-all>${"Retry pending now"}</button>`:""}<span>${"Last success"}: ${esc(time(state.lastSyncedAt))}</span>${state.lastPulledAt?`<span>${"Last pulled"}: ${esc(time(state.lastPulledAt))}</span>`:""}</div><p class="settings-callout">${"Changes remain in a durable device outbox during outages. Nothing is marked synced until Notion confirms a post-write read."}</p>${state.syncMessage?`<p class="settings-callout ${queue.permanently_failed?"self-test-failed":""}">${esc(state.syncMessage)}</p>`:""}${activity.length?`<div class="sync-activity-list">${activity.map(item=>statusRow(item)).join("")}</div>`:""}</section>
      <section class="settings-card"><small>${"INFRASTRUCTURE CHECKS"}</small><h2>${"Runnable diagnostics"}</h2><div class="diagnostic-grid">${checks.map(([label,ok])=>`<span class="${ok?"ready":"off"}"><b>${ok?"✓":"!"}</b>${esc(label)}</span>`).join("")}</div><div class="sync-actions"><button data-system-self-test>${"Run backup & connection test"}</button>${state.pushEndpoint?`<button data-push-test>${"Send test notification"}</button>`:""}</div>${state.systemSelfTest?`<p class="settings-callout ${state.systemSelfTest.ok?"self-test-ok":"self-test-failed"}">${esc(state.systemSelfTest.message)}</p>`:""}<p class="diagnostic-note">${"Final HealthKit validation requires opening the iPhone bridge and tapping Test connection."}</p></section>
    </section>`;
  }
  async function backupSelfTest(features){
    const sample={app:"Rep Gym Companion",test:true,createdAt:new Date().toISOString(),data:{foodEntries:[{id:"self-test"}] }},passphrase=`self-test-${crypto.randomUUID()}`;
    const encrypted=await features.encryptExport(sample,passphrase),decrypted=await features.decryptExport(encrypted,passphrase);
    if(JSON.stringify(sample)!==JSON.stringify(decrypted))throw Error("Encrypted backup round-trip did not match.");
    return true;
  }
  window.REP_SYNC_CENTER={DESTINATION_URL,record,render,backupSelfTest};
})();
