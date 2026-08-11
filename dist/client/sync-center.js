(function(){
  const DESTINATION_URL="https://app.notion.com/p/mohamedhosny95/6433f54c687e4813869aaadeaf3acaab?v=bde632d4554c4344a3a6a9e1eb15fd50&source=copy_link";
  const esc=value=>String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[char]);
  const time=(value,ar)=>value?new Date(value).toLocaleString(ar?"ar-EG":undefined,{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}):"—";
  const kindLabel=(kind,ar)=>({food:ar?"وجبة":"Meal",workout:ar?"تمرين":"Workout",nutrition:ar?"ملخص تغذية":"Nutrition summary",recovery:ar?"استشفاء":"Recovery",sleep:ar?"نوم":"Sleep",hygiene:ar?"عناية يومية":"Daily care"})[kind]||(ar?"سجل":"Log");
  function summary(item,ar){const payload=item.payload||item.workout||{};return payload.food_name||payload.rawNote||payload.type||payload.plan||payload.date||kindLabel(item.kind,ar);}
  function record(state,event){
    state.syncActivity=Array.isArray(state.syncActivity)?state.syncActivity:[];
    const id=String(event.id||"");if(!id)return;
    state.syncActivity=[{...state.syncActivity.find(item=>item.id===id),...event,id,updatedAt:event.updatedAt||new Date().toISOString()},...state.syncActivity.filter(item=>item.id!==id)].slice(0,40);
  }
  function statusRow(item,state,ar){
    const failed=Boolean(item.error)||item.status==="failed",status=failed?"failed":item.status||"pending",labels={pending:ar?"قيد الانتظار":"Pending",processing:ar?"جارٍ الإرسال":"Syncing",synced:ar?"تم التأكيد":"Confirmed",failed:ar?"فشل":"Failed"};
    return `<article class="sync-activity-row is-${esc(status)}"><div><small>${esc(kindLabel(item.kind,ar))}</small><strong>${esc(item.label||summary(item,ar))}</strong><span>${esc(labels[status]||status)} · ${esc(time(item.updatedAt||item.createdAt,ar))}</span>${item.error?`<p>${esc(item.error)}</p>`:""}</div><div class="sync-row-actions">${item.notionUrl?`<a href="${esc(item.notionUrl)}" target="_blank" rel="noopener">${ar?"فتح":"Open"}</a>`:""}${failed||status==="pending"?`<button data-sync-retry="${esc(item.id)}">${ar?"إعادة المحاولة":"Retry"}</button>`:""}</div></article>`;
  }
  function render(state,{ar=false}={}){
    const health=state.systemHealth||{},notion=health.notion||{},outbox=health.outbox||{},monitor=health.monitor||{},infra=health.infrastructure||{};
    const destination=notion.destination||{name:"View of Food Entries",url:DESTINATION_URL},queued=(state.syncQueue||[]).map(item=>({...item,status:item.error?"failed":state.syncState==="syncing"?"processing":"pending",updatedAt:item.updatedAt||item.createdAt||null}));
    const queuedIds=new Set(queued.map(item=>String(item.id))),activity=[...queued,...(state.syncActivity||[]).filter(item=>!queuedIds.has(String(item.id)))].slice(0,30);
    const checks=[["Notion",Boolean(notion.healthy)],[ar?"النسخ المشفرة":"Encrypted backups",Boolean(infra.backups?.configured)],[ar?"الإشعارات":"Push",Boolean(infra.push?.configured)],["HealthKit",Boolean(infra.healthkit?.configured)]];
    return `<section class="sync-center">
      <section class="settings-card sync-destination ${notion.healthy?"is-healthy":"needs-attention"}"><small>${ar?"وجهة NOTION":"NOTION DESTINATION"}</small><h2>${esc(destination.name||"View of Food Entries")}</h2><p>${notion.healthy?(ar?"المصدر الأصلي متاح ومخطط الأعمدة صحيح.":"The original source is available and its schema is valid."):(esc(notion.error)||(ar?"افحص الاتصال والمصدر.":"Check the connection and source database."))}</p><a class="settings-primary destination-link" href="${esc(destination.url||DESTINATION_URL)}" target="_blank" rel="noopener">${ar?"فتح العرض الصحيح":"Open the correct view"}</a><div class="destination-meta"><span>${ar?"آخر فحص":"Last check"}: ${esc(time(health.checkedAt||monitor.checkedAt,ar))}</span><span>${ar?"المصدر":"Source"}: ${esc(notion.sourceId||"—")}</span></div></section>
      <section class="settings-card"><div class="sync-center-head"><div><small>${ar?"مركز المزامنة":"SYNC CENTER"}</small><h2>${ar?"كل السجلات في مكان واحد":"Every record in one place"}</h2></div><button data-sync-refresh>${ar?"تحديث":"Refresh"}</button></div><div class="health-facts"><span><b>${queued.length}</b>${ar?"على الجهاز":"On device"}</span><span><b>${outbox.pending??"—"}</b>${ar?"على الخادم":"Server queue"}</span><span><b>${outbox.failed??"—"}</b>${ar?"فشل":"Failed"}</span></div><div class="sync-actions"><button class="settings-primary" data-sync-retry-all ${queued.length?"":"disabled"}>${ar?"مزامنة الكل الآن":"Sync all now"}</button><span>${ar?"آخر نجاح":"Last success"}: ${esc(time(state.lastSyncedAt,ar))}</span></div>${activity.length?`<div class="sync-activity-list">${activity.map(item=>statusRow(item,state,ar)).join("")}</div>`:`<p class="settings-callout">${ar?"لا توجد سجلات معلقة. كل شيء محدث.":"Nothing is pending. Everything is up to date."}</p>`}</section>
      <section class="settings-card"><small>${ar?"فحوصات البنية":"INFRASTRUCTURE CHECKS"}</small><h2>${ar?"تشخيص قابل للتشغيل":"Runnable diagnostics"}</h2><div class="diagnostic-grid">${checks.map(([label,ok])=>`<span class="${ok?"ready":"off"}"><b>${ok?"✓":"!"}</b>${esc(label)}</span>`).join("")}</div><div class="sync-actions"><button data-system-self-test>${ar?"تشغيل اختبار النسخة والاتصال":"Run backup & connection test"}</button>${state.pushEndpoint?`<button data-push-test>${ar?"إرسال إشعار تجريبي":"Send test notification"}</button>`:""}</div>${state.systemSelfTest?`<p class="settings-callout ${state.systemSelfTest.ok?"self-test-ok":"self-test-failed"}">${esc(state.systemSelfTest.message)}</p>`:""}<p class="diagnostic-note">${ar?"اختبار HealthKit النهائي يحتاج فتح تطبيق iPhone والضغط على Test connection.":"Final HealthKit validation requires opening the iPhone bridge and tapping Test connection."}</p></section>
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
