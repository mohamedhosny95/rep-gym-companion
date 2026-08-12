(function(){
  const HABITS=[
    {id:"sleep",icon:"bed",en:"Sleep",ar:"النوم",detailEn:"7–8 hours of night sleep",detailAr:"7–8 ساعات من النوم الليلي"},
    {id:"night-prayer",icon:"moon",en:"Night prayer",ar:"قيام الليل"},
    {id:"fajr",icon:"dawn",en:"Fajr prayer",ar:"صلاة الفجر"},
    {id:"sadqa",icon:"charity",en:"Sadqa",ar:"صدقة"},
    {id:"quran-wird",icon:"heart",en:"Quran wird",ar:"ورد القرآن",detailEn:"Read pages of the Quran",detailAr:"قراءة صفحات من القرآن"},
    {id:"quran",icon:"quran",en:"Quran memorization",ar:"حفظ القرآن"},
    {id:"workout",icon:"workout",en:"Workout",ar:"تمرين"},
    {id:"adhkar",icon:"list",en:"Morning & evening adhkar",ar:"أذكار الصباح والمساء"},
    {id:"read",icon:"book",en:"Reading",ar:"قراءة"},
    {id:"water",icon:"water",en:"Water",ar:"الماء",detailEn:"3 L",detailAr:"3 لتر"}
  ];
  const ICONS={
    bed:'<svg viewBox="0 0 24 24"><path d="M3 5v15M3 15h18v5M6 15V9h5a3 3 0 0 1 3 3v3M14 11h4a3 3 0 0 1 3 3v1"/></svg>',
    moon:'<svg viewBox="0 0 24 24"><path d="M20 15.5A8.5 8.5 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z"/></svg>',
    dawn:'<svg viewBox="0 0 24 24"><path d="M4 17a8 8 0 0 1 16 0M2 21h20M12 2v3M4.9 6.2l2.1 2M19.1 6.2l-2.1 2"/></svg>',
    charity:'<svg viewBox="0 0 24 24"><path d="M12 21s-8-4.7-8-11a4 4 0 0 1 7-2.7L12 9l1-1.7A4 4 0 0 1 20 10c0 6.3-8 11-8 11Z"/></svg>',
    heart:'<svg viewBox="0 0 24 24"><path d="M3 12h4l2-5 4 10 2-5h6M12 21S3 16 3 9a4 4 0 0 1 7-2.5L12 9l2-2.5A4 4 0 0 1 21 9c0 7-9 12-9 12Z"/></svg>',
    quran:'<svg viewBox="0 0 24 24"><path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H12v18H7.5A3.5 3.5 0 0 0 4 23ZM20 5.5A3.5 3.5 0 0 0 16.5 2H12v18h4.5A3.5 3.5 0 0 1 20 23Z"/></svg>',
    workout:'<svg viewBox="0 0 24 24"><path d="M2 9v6M5 7v10M5 12h14M19 7v10M22 9v6"/></svg>',
    list:'<svg viewBox="0 0 24 24"><path d="m3 6 2 2 3-4M11 6h10M3 13l2 2 3-4M11 13h10M3 20l2 2 3-4M11 20h10"/></svg>',
    book:'<svg viewBox="0 0 24 24"><path d="M3 4h6a3 3 0 0 1 3 3v14a3 3 0 0 0-3-3H3ZM21 4h-6a3 3 0 0 0-3 3v14a3 3 0 0 1 3-3h6Z"/></svg>',
    water:'<svg viewBox="0 0 24 24"><path d="M5 7h14l-1.5 14h-11ZM8 3h8M9 7l1-4h4l1 4"/></svg>'
  };
  const NOTION_HABITS_URL="https://app.notion.com/p/20e4226c53694ea79692dff9839a132f?pvs=204";
  const habitMap=new Map(HABITS.map(habit=>[habit.id,habit]));
  const syncTimers=new Map();
  let hygieneSyncTimer=null;
  let reorderMode=false,draggedId=null;

  function orderedHabits(){
    const valid=new Set(HABITS.map(habit=>habit.id)),savedOrder=Array.isArray(state.habitOrder)?state.habitOrder.filter(id=>valid.has(id)):[];
    const order=[...new Set(savedOrder),...HABITS.map(habit=>habit.id).filter(id=>!savedOrder.includes(id))];
    state.habitOrder=order;
    return order.map(id=>habitMap.get(id));
  }
  function saveOrder(order){state.habitOrder=order.map(habit=>habit.id);persist();renderOverview();}
  function moveHabit(id,delta){
    const order=orderedHabits(),index=order.findIndex(habit=>habit.id===id),target=index+delta;
    if(index<0||target<0||target>=order.length)return;
    [order[index],order[target]]=[order[target],order[index]];saveOrder(order);
  }
  function placeHabit(id,beforeId){
    if(!id||id===beforeId)return;
    const order=orderedHabits(),from=order.findIndex(habit=>habit.id===id);
    if(from<0||!order.some(habit=>habit.id===beforeId))return;
    const [habit]=order.splice(from,1),to=order.findIndex(item=>item.id===beforeId);order.splice(to,0,habit);saveOrder(order);
  }

  function dateKey(offset=0){const date=new Date();date.setHours(12,0,0,0);date.setDate(date.getDate()+offset);return localDay(date);}
  function bucket(date=isoDay(),create=false){
    state.daily=state.daily&&typeof state.daily==="object"?state.daily:{};
    state.daily.habits=state.daily.habits&&typeof state.daily.habits==="object"?state.daily.habits:{};
    if(create&&!state.daily.habits[date])state.daily.habits[date]={checked:{},updatedAt:null};
    const value=state.daily.habits[date];
    return value&&typeof value==="object"?value:{checked:{}};
  }
  function checked(date,id){return Boolean(bucket(date).checked?.[id]);}
  function completed(date){return orderedHabits().filter(habit=>checked(date,habit.id));}
  function streak(id){
    let count=0,offset=checked(dateKey(),id)?0:-1;
    while(offset>-370&&checked(dateKey(offset),id)){count++;offset--;}
    return count;
  }
  function totalStreak(){
    let count=0,offset=completed(dateKey()).length===HABITS.length?0:-1;
    while(offset>-370&&completed(dateKey(offset)).length===HABITS.length){count++;offset--;}
    return count;
  }
  function careFlags(date){
    const care=state.daily?.hygiene?.[date]||{},values=care.checked||{},keys=Object.keys(values);
    const complete=prefix=>{const group=keys.filter(key=>key.startsWith(`${prefix}-`));return group.length>0&&group.every(key=>values[key]);};
    return {care,values,keys,complete};
  }
  function payloadForDate(date){
    const {care,values,keys,complete}=careFlags(date),done=completed(date),habitChecks=bucket(date).checked||{};
    const careDone=keys.filter(key=>values[key]).length,total=keys.length+HABITS.length,doneTotal=careDone+done.length;
    const habitNote=`Habit tracker: ${done.length}/${HABITS.length}${done.length?` — ${done.map(habit=>habit.en).join(", ")}`:""}`;
    return {
      date,morningComplete:complete("morning"),eveningComplete:complete("evening"),postWorkoutComplete:complete("post"),hairRoutineComplete:complete("hair"),
      spf:Boolean(values["morning-0"]),floss:Boolean(values["evening-1"]),beardOil:Boolean(values["morning-3"]&&values["evening-3"]),showerWithin30m:Boolean(values["post-0"]),
      completion:total?Math.round(doneTotal/total*100):0,notes:[String(care.notes||"").trim(),habitNote].filter(Boolean).join("\n"),habitChecks
    };
  }
  function payloadForHabit(date,id){
    const habit=habitMap.get(id);if(!habit)return null;
    const isComplete=checked(date,id);
    return {date,id,name:habit.en,nameAr:habit.ar,completed:isComplete,streak:isComplete?streak(id):0,updatedAt:bucket(date).updatedAt||new Date().toISOString(),notes:detail(habit,false)||""};
  }
  function hasEntries(date){const value=bucket(date);return Object.keys(value.checked||{}).length>0;}
  function scheduleSync(date,id){
    if(!repAuth?.isPaired?.()||!navigator.onLine)return;
    const key=`${date}:${id}`;clearTimeout(syncTimers.get(key));
    syncTimers.set(key,setTimeout(()=>{const habitPayload=payloadForHabit(date,id);if(habitPayload)queueHealth("habit",habitPayload);syncTimers.delete(key);},650));
    clearTimeout(hygieneSyncTimer);hygieneSyncTimer=setTimeout(()=>queueHealth("hygiene",payloadForDate(date)),800);
  }
  function toggle(id){
    if(!habitMap.has(id))return;
    const date=isoDay(),value=bucket(date,true);value.checked=value.checked&&typeof value.checked==="object"?value.checked:{};
    value.checked[id]=!Boolean(value.checked[id]);value.updatedAt=new Date().toISOString();
    if(value.checked[id]&&navigator.vibrate)navigator.vibrate(30);
    persist();scheduleSync(date,id);renderOverview();
  }
  function label(habit,ar){return ar?habit.ar:habit.en;}
  function detail(habit,ar){return ar?habit.detailAr:habit.detailEn;}
  function render(){
    const ar=state.lang==="ar",date=isoDay(),done=completed(date),ordered=orderedHabits(),percent=Math.round(done.length/HABITS.length*100),days=Array.from({length:7},(_,index)=>dateKey(index-6));
    const section=document.createElement("section");section.className="habit-tracker";section.setAttribute("aria-labelledby","habitTrackerTitle");
    section.innerHTML=`<div class="habit-head"><div><small>${ar?"عاداتك اليومية":"DAILY HABITS"}</small><h2 id="habitTrackerTitle">${ar?"ابنِ اليوم الذي تريده.":"Build the day you want."}</h2><p>${ar?"تُحفظ العلامات على هذا الجهاز وتُحدَّث مباشرةً في سجل العادات داخل Notion.":"Check-ins stay available offline and update the Habit Log in Notion directly."}</p><div class="habit-head-actions"><button type="button" data-habit-reorder aria-pressed="${reorderMode}">${reorderMode?(ar?"تم":"Done"):(ar?"إعادة الترتيب":"Reorder")}</button><a href="${NOTION_HABITS_URL}" target="_blank" rel="noopener">${ar?"فتح سجل العادات":"Open Habit Log"}</a></div></div><div class="habit-progress" role="progressbar" aria-label="${ar?"تقدم العادات اليوم":"Today's habit progress"}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}">${miniRing(percent,"var(--acid)",54,6)}<strong>${done.length}/${HABITS.length}</strong></div></div>
      ${totalStreak()?`<div class="habit-streak-banner"><span>🔥</span><strong>${totalStreak()} ${ar?"أيام مكتملة متتالية":"fully completed days"}</strong></div>`:""}
      <div class="habit-grid ${reorderMode?"is-reordering":""}">${ordered.map((habit,index)=>{const isDone=checked(date,habit.id),days=streak(habit.id),name=label(habit,ar),description=detail(habit,ar),action=isDone?(ar?"مكتمل":"completed"):(ar?"غير مكتمل":"not completed");return `<article class="habit-card ${isDone?"is-done":""}" data-habit-card="${habit.id}" draggable="${reorderMode}"><button type="button" class="habit-toggle" data-habit-id="${habit.id}" aria-label="${esc([name,description,action].filter(Boolean).join(" · "))}" aria-pressed="${isDone}"><span class="habit-icon" aria-hidden="true">${ICONS[habit.icon]}</span><span class="habit-copy"><strong>${esc(name)}</strong>${description?`<small>${esc(description)}</small>`:""}<em>${days?`${days} ${ar?"يوم متتالٍ":"day streak"}`:(ar?"ابدأ اليوم":"Start today")}</em></span><span class="habit-check" aria-hidden="true">${isDone?"✓":""}</span></button>${reorderMode?`<div class="habit-order-controls"><span aria-hidden="true">↕</span><button type="button" data-habit-move="up" data-habit-order-id="${habit.id}" ${index===0?"disabled":""} aria-label="${ar?`نقل ${name} لأعلى`:`Move ${name} up`}">↑</button><button type="button" data-habit-move="down" data-habit-order-id="${habit.id}" ${index===ordered.length-1?"disabled":""} aria-label="${ar?`نقل ${name} لأسفل`:`Move ${name} down`}">↓</button></div>`:""}</article>`;}).join("")}</div>
      <details class="habit-history"><summary><span>${ar?"آخر 7 أيام":"Last 7 days"}</span><strong>${ar?"عرض التقدم":"View progress"}</strong></summary><div class="habit-week">${days.map(day=>{const n=completed(day).length,p=Math.round(n/HABITS.length*100),today=day===date;return `<div class="habit-day ${today?"is-today":""}"><span>${new Date(`${day}T12:00:00`).toLocaleDateString(ar?"ar-EG":"en-US",{weekday:"short"})}</span><i><b style="height:${p}%"></b></i><strong>${n}/${HABITS.length}</strong></div>`;}).join("")}</div></details>`;
    section.querySelectorAll("[data-habit-id]").forEach(button=>button.addEventListener("click",()=>toggle(button.dataset.habitId)));
    section.querySelector("[data-habit-reorder]")?.addEventListener("click",()=>{reorderMode=!reorderMode;renderOverview();});
    section.querySelectorAll("[data-habit-move]").forEach(button=>button.addEventListener("click",()=>moveHabit(button.dataset.habitOrderId,button.dataset.habitMove==="up"?-1:1)));
    section.querySelectorAll("[data-habit-card]").forEach(card=>{
      card.addEventListener("dragstart",event=>{if(!reorderMode){event.preventDefault();return;}draggedId=card.dataset.habitCard;card.classList.add("is-dragging");event.dataTransfer.effectAllowed="move";});
      card.addEventListener("dragend",()=>{draggedId=null;card.classList.remove("is-dragging");});
      card.addEventListener("dragover",event=>{if(reorderMode){event.preventDefault();event.dataTransfer.dropEffect="move";}});
      card.addEventListener("drop",event=>{event.preventDefault();placeHabit(draggedId,card.dataset.habitCard);});
    });
    return section;
  }
  function mount(){const existing=document.querySelector(".habit-tracker");existing?.remove();const section=render(),anchor=document.querySelector(".home-today-card");if(anchor)anchor.insertAdjacentElement("afterend",section);else app.append(section);}

  window.REP_HABITS={definitions:HABITS,orderedHabits,bucket,completed,streak,payloadForDate,payloadForHabit,hasEntries,notionUrl:NOTION_HABITS_URL};
  const baseOverview=renderOverview;
  renderOverview=function(){baseOverview();mount();};
  if(state.view==="home-overview")renderOverview();
})();
