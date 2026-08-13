(function(){
  const DESTINATION_URL="https://app.notion.com/p/mohamedhosny95/6433f54c687e4813869aaadeaf3acaab?v=bde632d4554c4344a3a6a9e1eb15fd50&source=copy_link";
  const esc=value=>String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[char]);
  const time=(value,ar)=>value?new Date(value).toLocaleString(ar?"ar-EG":undefined,{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}):"—";
  const kindLabel=(kind,ar)=>({food:ar?"وجبة":"Meal",workout:ar?"تمرين":"Workout",nutrition:ar?"ملخص تغذية":"Nutrition summary",recovery:ar?"استشفاء":"Recovery",sleep:ar?"نوم":"Sleep",hygiene:ar?"عناية يومية":"Daily care",habit:ar?"عادة":"Habit"})[kind]||(ar?"سجل":"Log");
  function summary(item,ar){const payload=item.payload||item.workout||{};return payload.food_name||payload.rawNote||payload.type||payload.plan||payload.date||kindLabel(item.kind,ar);}
  function record(state,event){
    state.syncActivity=Array.isArray(state.syncActivity)?state.syncActivity:[];
    const id=String(event.id||"");if(!id)return;
    state.syncActivity=[{...state.syncActivity.find(item=>item.id===id),...event,id,updatedAt:event.updatedAt||new Date().toISOString()},...state.syncActivity.filter(item=>item.id!==id)].slice(0,40);
  }
  function statusRow(item,state,ar){
    const failed=Boolean(item.error)||item.status==="failed",status=failed?"failed":item.status||"synced",labels={processing:ar?"جارٍ الحفظ المباشر":"Saving directly",synced:ar?"تم التأكيد":"Confirmed",failed:ar?"لم يُحفظ":"Not saved"};
    return `<article class="sync-activity-row is-${esc(status)}"><div><small>${esc(kindLabel(item.kind,ar))}</small><strong>${esc(item.label||summary(item,ar))}</strong><span>${esc(labels[status]||status)} · ${esc(time(item.updatedAt||item.createdAt,ar))}</span>${item.error?`<p>${esc(item.error)}</p>`:""}</div><div class="sync-row-actions">${item.notionUrl?`<a href="${esc(item.notionUrl)}" target="_blank" rel="noopener">${ar?"فتح":"Open"}</a>`:""}</div></article>`;
  }
  function render(state,{ar=false}={}){
    const health=state.systemHealth||{},notion=health.notion||{},monitor=health.monitor||{},infra=health.infrastructure||{},progress=state.syncProgress||{};
    const destination=notion.destination||{name:"View of Food Entries",url:DESTINATION_URL},activity=(state.syncActivity||[]).slice(0,30),total=window.REP_SYNC_RUNTIME?.collectEverything?.().length||0;
    const checks=[["Notion",Boolean(notion.healthy)],[ar?"النسخ المشفرة":"Encrypted backups",Boolean(infra.backups?.configured)],[ar?"الإشعارات":"Push",Boolean(infra.push?.configured)],["HealthKit",Boolean(infra.healthkit?.configured)]];
    return `<section class="sync-center">
      <section class="settings-card sync-destination ${notion.healthy?"is-healthy":"needs-attention"}"><small>${ar?"وجهة NOTION":"NOTION DESTINATION"}</small><h2>${esc(destination.name||"View of Food Entries")}</h2><p>${notion.healthy?(ar?"المصدر الأصلي متاح ومخطط الأعمدة صحيح.":"The original source is available and its schema is valid."):(esc(notion.error)||(ar?"افحص الاتصال والمصدر.":"Check the connection and source database."))}</p><a class="settings-primary destination-link" href="${esc(destination.url||DESTINATION_URL)}" target="_blank" rel="noopener">${ar?"فتح العرض الصحيح":"Open the correct view"}</a><div class="destination-meta"><span>${ar?"آخر فحص":"Last check"}: ${esc(time(health.checkedAt||monitor.checkedAt,ar))}</span><span>${ar?"المصدر":"Source"}: ${esc(notion.sourceId||"—")}</span></div></section>
      <section class="settings-card"><div class="sync-center-head"><div><small>${ar?"مزامنة مباشرة":"DIRECT SYNC"}</small><h2>${ar?"زر واحد لكل بياناتك":"One button for all your data"}</h2></div><button data-sync-refresh>${ar?"تحديث الفحص":"Refresh check"}</button></div><div class="health-facts"><span><b>${total}</b>${ar?"سجل متاح":"Available records"}</span><span><b>0</b>${ar?"في قائمة انتظار":"In a queue"}</span><span><b>${progress.failed||0}</b>${ar?"لم يُحفظ":"Not saved"}</span></div><div class="sync-actions"><button class="settings-primary" data-sync-all ${state.syncState==="syncing"?"disabled":""}>${state.syncState==="syncing"?(ar?`جارٍ الحفظ ${progress.done||0}/${progress.total||total}…`:`Saving ${progress.done||0}/${progress.total||total}…`):(ar?"مزامنة كل شيء":"Sync everything")}</button><span>${ar?"آخر نجاح":"Last success"}: ${esc(time(state.lastSyncedAt,ar))}</span></div><p class="settings-callout">${ar?"تُحفظ التغييرات فوراً في Notion. لا توجد قائمة انتظار على الجهاز أو الخادم.":"Changes save directly to Notion. There is no device or server queue."}</p>${state.syncMessage?`<p class="settings-callout self-test-failed">${esc(state.syncMessage)}</p>`:""}${activity.length?`<div class="sync-activity-list">${activity.map(item=>statusRow(item,state,ar)).join("")}</div>`:""}</section>
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
