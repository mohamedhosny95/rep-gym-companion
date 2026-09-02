/* Local-first post-launch product primitives. Pure functions stay testable in Node. */
(function(root,factory){
  const api=factory();
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
  root.REP_PRODUCT_SUITE=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  const DAY=86400000,TRAINING_FOCUS=new Set(["gym","football","padel","cardio"]),RECOVERY_FOCUS=new Set(["rest","recovery","spa","activespa"]);
  const DAY_NAMES=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const PRESETS=Object.freeze([
    {id:"caffeine",label:"Caffeine after 2pm"},{id:"late-meal",label:"Meal within 2 hours of bed"},
    {id:"supplement",label:"Supplement taken"},{id:"stretching",label:"10+ minutes stretching"}
  ]);
  const SUBSTITUTIONS=Object.freeze({
    "Leg Press":[{name:"Goblet Squat",equipment:["dumbbells"]},{name:"Bodyweight Box Squat",equipment:["bodyweight"]},{name:"Banded Squat",equipment:["bands"]}],
    "Back Extension":[{name:"Hip Thrust Machine",equipment:["machines"]},{name:"Dumbbell Romanian Deadlift",equipment:["dumbbells"]},{name:"Glute Bridge",equipment:["bodyweight"]},{name:"Banded Good Morning",equipment:["bands"]}],
    "Hip Thrust Machine":[{name:"Glute Bridge",equipment:["bodyweight"]},{name:"Dumbbell Hip Thrust",equipment:["dumbbells"]},{name:"Banded Hip Thrust",equipment:["bands"]}],
    "Chest Press":[{name:"Dumbbell Floor Press",equipment:["dumbbells"]},{name:"Push-Up",equipment:["bodyweight"]},{name:"Banded Chest Press",equipment:["bands"]}],
    "Seated Cable Row":[{name:"One-Arm Dumbbell Row",equipment:["dumbbells"]},{name:"Banded Row",equipment:["bands"]},{name:"Prone Bodyweight Row",equipment:["bodyweight"]}],
    "Lat Pulldown":[{name:"Dumbbell Pullover",equipment:["dumbbells"]},{name:"Banded Pulldown",equipment:["bands"]},{name:"Kneeling Lat Prayer",equipment:["bodyweight"]}]
  });
  const round=(value,digits=1)=>{const factor=10**digits;return Math.round((Number(value)||0)*factor)/factor;};
  const dateKey=value=>{const date=value instanceof Date?value:new Date(value||Date.now());return Number.isNaN(date.getTime())?null:`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;};
  const atNoon=key=>{const [y,m,d]=String(key).split("-").map(Number);return new Date(y,m-1,d,12);};
  const shiftDay=(key,days)=>{const date=atNoon(key);date.setDate(date.getDate()+days);return dateKey(date);};
  const dayName=key=>DAY_NAMES[atNoon(key).getDay()];
  const average=values=>{const clean=values.filter(Number.isFinite);return clean.length?clean.reduce((sum,value)=>sum+value,0)/clean.length:null;};
  const localReadiness=(state,key)=>{
    const sleep=(state.sleepLogs||[]).find(row=>dateKey(row.date)===key),check=(state.recoveryCheckins||[]).find(row=>dateKey(row.date)===key),parts=[];
    if(Number.isFinite(Number(sleep?.hours)))parts.push(Math.min(110,Math.max(0,Number(sleep.hours)/(Number(state.healthProfile?.baseSleepHours)||7.5)*100)));
    if(Number.isFinite(Number(check?.energy)))parts.push(Number(check.energy)/5*100);
    if(Number.isFinite(Number(check?.stress)))parts.push(Math.max(0,120-Number(check.stress)*20));
    if(check?.pain||check?.illness)parts.push(20);
    return average(parts);
  };

  function reconcileSchedule(state,now=dateKey()){
    const schedule=state?.preferences?.schedule||{},historyDates=new Set((state?.history||[]).map(row=>dateKey(row.date)).filter(Boolean));
    const onboarding=dateKey(state?.onboarding?.completedAt),overrides={...(state?.weekOverrides||{})},processed=new Set(state?.scheduleAdjustments||[]),today=atNoon(now),weekStart=new Date(today);weekStart.setDate(today.getDate()-today.getDay());
    for(let offset=0;offset<today.getDay();offset++){
      const source=dateKey(new Date(weekStart.getFullYear(),weekStart.getMonth(),weekStart.getDate()+offset,12)),plan=overrides[source]||schedule[dayName(source)];
      if(!plan||!TRAINING_FOCUS.has(plan.focus)||historyDates.has(source)||processed.has(source)||(onboarding&&source<onboarding))continue;
      for(let targetOffset=today.getDay();targetOffset<7;targetOffset++){
        const target=dateKey(new Date(weekStart.getFullYear(),weekStart.getMonth(),weekStart.getDate()+targetOffset,12)),targetName=dayName(target),targetPlan=overrides[target]||schedule[targetName];
        if(targetName==="Friday"||!targetPlan||!RECOVERY_FOCUS.has(targetPlan.focus)||historyDates.has(target))continue;
        overrides[target]={...plan,sourceDate:source,reason:"Missed workout moved to the next available recovery day"};processed.add(source);break;
      }
    }
    const floor=dateKey(weekStart);for(const key of Object.keys(overrides))if(key<floor)delete overrides[key];
    return {weekOverrides:overrides,scheduleAdjustments:[...processed].slice(-24)};
  }

  function normalizeExperiments(value){return (Array.isArray(value)?value:[]).filter(row=>row&&row.id&&row.label).map(row=>({id:String(row.id).slice(0,80),label:String(row.label).trim().slice(0,80),preset:String(row.preset||"custom").slice(0,40),active:row.active!==false,createdAt:row.createdAt||new Date().toISOString()})).slice(0,16);}
  function analyzeExperiments(state,now=dateKey()){
    const definitions=normalizeExperiments(state.customExperiments),checkins=state.experimentCheckins&&typeof state.experimentCheckins==="object"?state.experimentCheckins:{},start=shiftDay(now,-89);
    return definitions.map(experiment=>{
      const yes=[],no=[];
      for(const [key,values] of Object.entries(checkins)){
        if(key<start||key>now||typeof values?.[experiment.id]!=="boolean")continue;
        const score=localReadiness(state,shiftDay(key,1));if(!Number.isFinite(score))continue;
        (values[experiment.id]?yes:no).push(score);
      }
      const ready=yes.length>=5&&no.length>=5,yesAverage=average(yes),noAverage=average(no),effect=ready?round(yesAverage-noAverage,1):null;
      return {...experiment,yesDays:yes.length,noDays:no.length,minimumPerGroup:5,ready,effect,yesAverage:yesAverage===null?null:round(yesAverage,1),noAverage:noAverage===null?null:round(noAverage,1),language:"association",boundary:"This is an association in your logged data, not proof of causation.",windowDays:90};
    });
  }

  function weeklySummary(state,now=dateKey(),performanceApi=null){
    const start=shiftDay(now,-6),history=(state.history||[]).filter(row=>{const key=dateKey(row.date);return key>=start&&key<=now;}),schedule=state.preferences?.schedule||{};
    let planned=0;for(let i=0;i<7;i++){const key=shiftDay(now,i-6),plan=state.weekOverrides?.[key]||schedule[dayName(key)];if(TRAINING_FOCUS.has(plan?.focus))planned++;}
    const completed=history.length,adherence=planned?Math.min(100,Math.round(completed/planned*100)):completed?100:0;
    const insight=performanceApi?.analyze?.(state,{now})||{},prs=insight.strength?.prs||[],readiness=[];
    for(let i=0;i<7;i++){const score=localReadiness(state,shiftDay(now,i-6));if(Number.isFinite(score))readiness.push(score);}
    const avgReadiness=average(readiness),moved=Object.values(state.weekOverrides||{}).filter(row=>row.sourceDate&&row.sourceDate>=start).length,nextAction=completed<planned?(moved?"Complete the next rescheduled session; keep Friday as full rest.":"Complete the next planned session; keep Friday as full rest."):readiness.length<5?"Log recovery on five days next week before changing the plan.":prs.length?"Repeat the PR loads once with clean form before progressing again.":"Keep the current plan for another week and build one clean rep per main lift.";
    return {period:{start,end:now},planned,completed,adherence,prs:prs.slice(0,8).map(row=>({exercise:row.exercise,value:row.currentE1rm,unit:"kg e1RM",date:row.bestDate})),avgReadiness:avgReadiness===null?null:Math.round(avgReadiness),readinessDays:readiness.length,rescheduled:moved,nextAction,workouts:history.map(row=>({date:dateKey(row.date),session:row.session||row.name||"Workout",durationMinutes:row.durationMinutes||null}))};
  }

  function trackEvent(state,name,metadata={}){
    const allowed={};for(const [key,value] of Object.entries(metadata||{}).slice(0,8))if(["string","number","boolean"].includes(typeof value))allowed[String(key).slice(0,40)]=typeof value==="string"?value.slice(0,80):value;
    state.launchEvents=Array.isArray(state.launchEvents)?state.launchEvents:[];state.launchEvents.push({id:`evt-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,name:String(name).slice(0,60),at:new Date().toISOString(),metadata:allowed});state.launchEvents=state.launchEvents.slice(-250);return state.launchEvents.at(-1);
  }
  function launchPulse(state,now=dateKey()){
    const since=shiftDay(now,-6),events=(state.launchEvents||[]).filter(row=>dateKey(row.at)>=since),counts={};for(const row of events)counts[row.name]=(counts[row.name]||0)+1;
    return {since,events:events.length,counts,errors:events.filter(row=>row.name==="error").length,abandoned:events.filter(row=>row.name==="workout_abandoned").length};
  }
  function availableSubstitutions(name,equipment=[]){const available=new Set(equipment);return (SUBSTITUTIONS[name]||[]).filter(row=>row.equipment.some(item=>available.has(item)));}

  const b64url=bytes=>{let raw="";for(const byte of bytes)raw+=String.fromCharCode(byte);return btoa(raw).replaceAll("+","-").replaceAll("/","_").replaceAll("=","");};
  const unb64url=text=>{let raw=String(text).replaceAll("-","+").replaceAll("_","/");while(raw.length%4)raw+="=";const binary=atob(raw),bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);return bytes;};
  async function createPrivateWeeklyLink(payload,baseUrl){
    if(!globalThis.crypto?.subtle)throw Error("Private links require a secure browser context.");
    const keyBytes=crypto.getRandomValues(new Uint8Array(32)),iv=crypto.getRandomValues(new Uint8Array(12)),key=await crypto.subtle.importKey("raw",keyBytes,"AES-GCM",false,["encrypt"]),plain=new TextEncoder().encode(JSON.stringify({version:1,expiresAt:new Date(Date.now()+7*DAY).toISOString(),payload})),cipher=await crypto.subtle.encrypt({name:"AES-GCM",iv},key,plain),token=`${b64url(iv)}.${b64url(new Uint8Array(cipher))}.${b64url(keyBytes)}`,url=new URL(baseUrl||location.href);url.search="";url.hash=`weekly=${token}`;return url.toString();
  }
  async function readPrivateWeeklyLink(token){
    const [ivText,cipherText,keyText]=String(token||"").split(".");if(!ivText||!cipherText||!keyText)throw Error("This weekly report link is invalid.");
    const key=await crypto.subtle.importKey("raw",unb64url(keyText),"AES-GCM",false,["decrypt"]),plain=await crypto.subtle.decrypt({name:"AES-GCM",iv:unb64url(ivText)},key,unb64url(cipherText)),result=JSON.parse(new TextDecoder().decode(plain));if(new Date(result.expiresAt).getTime()<Date.now())throw Error("This weekly report link has expired.");return result;
  }
  return Object.freeze({PRESETS,SUBSTITUTIONS,dateKey,shiftDay,dayName,reconcileSchedule,normalizeExperiments,analyzeExperiments,weeklySummary,trackEvent,launchPulse,availableSubstitutions,createPrivateWeeklyLink,readPrivateWeeklyLink});
});
