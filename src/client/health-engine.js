/* Rep Health Intelligence Engine v58.
   Pure, explainable calculations: no diagnosis and no population grading. */
globalThis.REP_HEALTH_ENGINE=(()=>{
  const DAY=86400000;
  const clamp=(n,min,max)=>Math.max(min,Math.min(max,Number(n)||0));
  const round=(n,d=0)=>{const p=10**d;return Math.round(n*p)/p;};
  const dateKey=value=>String(value||new Date().toISOString()).slice(0,10);
  const shiftDay=(date,days)=>new Date(new Date(`${dateKey(date)}T12:00:00Z`).getTime()+days*DAY).toISOString().slice(0,10);
  const average=values=>values.length?values.reduce((a,b)=>a+b,0)/values.length:null;
  const median=values=>{const sorted=values.filter(Number.isFinite).sort((a,b)=>a-b);if(!sorted.length)return null;const middle=Math.floor(sorted.length/2);return sorted.length%2?sorted[middle]:(sorted[middle-1]+sorted[middle])/2;};
  const metricRows=(state,field,date,days)=>{
    const end=new Date(`${dateKey(date)}T12:00:00Z`).getTime(),start=end-days*DAY;
    return (state.sleepLogs||[]).filter(row=>{const time=new Date(`${dateKey(row.date)}T12:00:00Z`).getTime(),value=Number(row[field]);return time<end&&time>=start&&Number.isFinite(value)&&value>0;}).map(row=>Number(row[field]));
  };
  function baseline(state,field,date=dateKey(),days=28){
    const values=metricRows(state,field,date,days),center=median(values);
    if(center===null)return {value:null,count:0,mature:false,spread:null};
    const deviations=values.map(value=>Math.abs(value-center));
    return {value:round(center,1),count:values.length,mature:values.length>=14,spread:round(median(deviations)||0,1)};
  }
  function strain(state,date=dateKey()){
    const key=dateKey(date),sessions=(state.history||[]).filter(item=>dateKey(item.date)===key);
    const sessionCalories=sessions.reduce((sum,item)=>sum+(Number(item.calories)||0),0);
    let load=sessions.reduce((sum,item)=>{
      const rpes=(item.entries||[]).map(entry=>Number(entry.rpe)).filter(Number.isFinite);
      const effort=rpes.length?average(rpes):6;
      return sum+(Number(item.calories)||0)*clamp(effort/10,.2,1);
    },0);
    const active=Number(state.activeEnergy?.[key]);
    if(Number.isFinite(active)&&active>0)load+=Math.max(0,active-sessionCalories)*.4;
    if(!load)return 0;
    return round(21*(1-Math.exp(-load/220)),1);
  }
  function sleepNeed(state,date=dateKey(),profile={}){
    const key=dateKey(date),baseTarget=clamp(profile.baseSleepHours||7.5,6,10),prior=metricRows(state,"hours",key,21);
    const personal=prior.length>=7?clamp(median(prior),6,9.5):baseTarget;
    const priorSeven=metricRows(state,"hours",key,7),debt=priorSeven.length?clamp(average(priorSeven.map(hours=>Math.max(0,personal-hours))),0,1.5):0;
    const demand=clamp(strain(state,shiftDay(key,-1))/21*.8,0,.8);
    return {baseline:round(personal,1),debt:round(debt,1),demand:round(demand,1),need:round(clamp(personal+debt+demand,6,10),1),personalized:prior.length>=7,nights:prior.length};
  }
  function metricScore(value,base,inverse=false){
    if(!Number.isFinite(Number(value))||!base?.value)return null;
    const direction=inverse?-1:1,deviation=((Number(value)-base.value)/base.value)*direction;
    return clamp(Math.round(60+deviation*260),0,100);
  }
  function readiness(state,date=dateKey(),profile={}){
    const key=dateKey(date),sleep=(state.sleepLogs||[]).find(row=>dateKey(row.date)===key),need=sleepNeed(state,key,profile),components=[];
    const add=(id,label,weight,value,detail,available=true)=>components.push({id,label,weight,value:available?clamp(Math.round(value),0,100):null,detail,available});
    if(sleep?.hours)add("sleep","Sleep",30,clamp(Number(sleep.hours)/need.need*100,0,110),`${round(Number(sleep.hours),1)}h of ${need.need}h`);else add("sleep","Sleep",30,0,"No sleep data",false);
    for(const item of [
      ["hrv","HRV",25,"hrv",false,"ms"],
      ["rhr","Resting HR",20,"rhr",true,"bpm"],
      ["resp","Respiratory rate",10,"resp",true,"/min"]
    ]){
      const [id,label,weight,field,inverse,unit]=item,base=baseline(state,field,key,Number(profile.baselineDays)||28),value=Number(sleep?.[field]),score=metricScore(value,base,inverse);
      add(id,label,weight,score||0,score===null?`Needs 7 prior nights`:`${round(value,1)} ${unit} · baseline ${base.value}`,score!==null&&base.count>=7);
    }
    const checkin=(state.recoveryCheckins||[]).find(row=>dateKey(row.date)===key);
    if(checkin){const flags=(Number(checkin.soreness)>=4?1:0)+(Number(checkin.energy)<=2?1:0)+(Number(checkin.sleep)<6?1:0)+(checkin.pain?2:0);add("checkin","Check-in",15,100-flags*20,checkin.pain?"Pain reported":"Subjective check-in");}else add("checkin","Check-in",15,0,"No check-in",false);
    const available=components.filter(item=>item.available),coverage=available.reduce((sum,item)=>sum+item.weight,0),score=available.length?Math.round(available.reduce((sum,item)=>sum+item.value*item.weight,0)/coverage):null;
    const baselineCounts=["hrv","rhr","resp"].map(field=>baseline(state,field,key,Number(profile.baselineDays)||28).count),matureSignals=baselineCounts.filter(count=>count>=14).length;
    const confidence=coverage>=80&&matureSignals>=2?"high":coverage>=45?"medium":"low";
    const reasons=available.slice().sort((a,b)=>a.value-b.value).slice(0,2).map(item=>`${item.label}: ${item.detail}`);
    const pain=Boolean(checkin?.pain),band=score===null?"unknown":pain||score<40?"red":score<70?"yellow":"green";
    return {score,band,confidence,coverage,components,reasons,calibrating:confidence!=="high",medical:false};
  }
  function trainingRecommendation(state,date=dateKey(),profile={}){
    const result=readiness(state,date,profile),checkin=(state.recoveryCheckins||[]).find(row=>dateKey(row.date)===dateKey(date));
    if(checkin?.pain)return {mode:"pause",title:"Pause and assess",detail:"Pain was reported. Skip loaded work; use gentle movement only if comfortable, and seek professional advice for severe or persistent symptoms.",volumeFactor:0,intensityFactor:0};
    if(result.score===null||result.confidence==="low")return {mode:"normal",title:"Use the planned session",detail:"There is not enough reliable data to adjust the plan. Use your warm-up and effort rating as the final check.",volumeFactor:1,intensityFactor:1};
    if(result.band==="red")return {mode:"recovery",title:"Recovery day recommended",detail:"Readiness is low. Choose walking, mobility, breathing, or the minimum session.",volumeFactor:.35,intensityFactor:.55};
    if(result.band==="yellow")return {mode:"reduced",title:"Reduce today’s dose",detail:"Keep technique work, but remove one set per exercise and stop with 3–4 reps in reserve.",volumeFactor:.7,intensityFactor:.85};
    return {mode:"normal",title:"Planned session is supported",detail:"Readiness supports the normal plan. Progress only if warm-up reps feel crisp and pain-free.",volumeFactor:1,intensityFactor:1};
  }
  const FACTORS=[
    ["caffeineLate","Caffeine after 2pm"],["screenLate","Screen before bed"],["heavyMeal","Heavy or late meal"],["relaxed","Relaxed before bed"]
  ];
  function experiments(state,profile={}){
    const result=[];
    for(const [key,label] of FACTORS){const withHabit=[],without=[];
      for(const [date,day] of Object.entries(state.daily?.journal||{})){
        const next=readiness(state,shiftDay(date,1),profile);
        if(next.score===null||next.confidence==="low")continue;
        (day.checked?.[key]?withHabit:without).push(next.score);
      }
      if(withHabit.length>=4&&without.length>=4){const effect=Math.round(average(withHabit)-average(without));if(Math.abs(effect)>=4)result.push({key,label,effect,withDays:withHabit.length,withoutDays:without.length,language:"association"});}
    }
    return result.sort((a,b)=>Math.abs(b.effect)-Math.abs(a.effect));
  }
  function dataQuality(state,date=dateKey(),profile={}){
    const r=readiness(state,date,profile),lastImport=state.lastVitalsImportDate?Math.max(0,Math.floor((new Date(`${dateKey(date)}T12:00:00Z`)-new Date(`${dateKey(state.lastVitalsImportDate)}T12:00:00Z`))/DAY)):null;
    return {confidence:r.confidence,coverage:r.coverage,lastImportDays:lastImport,needsImport:lastImport===null||lastImport>2,baselineNights:Math.max(...["hours","hrv","rhr","resp"].map(field=>baseline(state,field,date,Number(profile.baselineDays)||28).count)),missing:r.components.filter(item=>!item.available).map(item=>item.label)};
  }
  function weeklyReview(state,date=dateKey(),profile={}){
    const days=Array.from({length:7},(_,index)=>shiftDay(date,index-6)),scores=days.map(day=>readiness(state,day,profile)).filter(item=>item.score!==null),strains=days.map(day=>strain(state,day)),sleeps=days.map(day=>(state.sleepLogs||[]).find(row=>dateKey(row.date)===day)?.hours).filter(Number.isFinite),sessions=(state.history||[]).filter(item=>days.includes(dateKey(item.date))).length;
    const averageReadiness=scores.length?Math.round(average(scores.map(item=>item.score))):null,averageSleep=sleeps.length?round(average(sleeps),1):null,totalStrain=round(strains.reduce((a,b)=>a+b,0),1),highLoadLowRecovery=days.filter(day=>strain(state,day)>=14&&["red","yellow"].includes(readiness(state,day,profile).band)).length;
    let headline="Keep building your baseline",action="Log sleep and recovery signals on at least five days next week.";
    if(averageReadiness!==null&&averageReadiness<45){headline="Recovery needs priority";action="Protect sleep timing and reduce one hard session next week.";}
    else if(highLoadLowRecovery>=2){headline="Load is outrunning recovery";action="Separate hard days and use one recovery session between them.";}
    else if(averageReadiness>=70&&sessions>=2){headline="Your week is well balanced";action="Keep the schedule stable; progress only one training variable.";}
    return {averageReadiness,averageSleep,totalStrain,sessions,highLoadLowRecovery,daysLogged:scores.length,headline,action,experiments:experiments(state,profile).slice(0,2)};
  }
  function bedtime(state,date=dateKey(),profile={}){
    const need=sleepNeed(state,shiftDay(date,1),profile),wake=String(profile.wakeTime||"04:15"),parts=wake.split(":").map(Number),wakeMinutes=(parts[0]||0)*60+(parts[1]||0),minutes=(wakeMinutes-Math.round(need.need*60)+1440)%1440;
    return {time:`${String(Math.floor(minutes/60)).padStart(2,"0")}:${String(minutes%60).padStart(2,"0")}`,wakeTime:wake,need:need.need,reason:`${need.baseline}h baseline + ${need.debt}h debt + ${need.demand}h training demand`};
  }
  return {baseline,strain,sleepNeed,readiness,trainingRecommendation,experiments,dataQuality,weeklyReview,bedtime,shiftDay,dateKey};
})();
