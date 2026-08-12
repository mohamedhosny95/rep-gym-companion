/* Rep Health Coverage Engine v67.
   Scores measurement completeness separately from wellness readiness. */
globalThis.REP_HEALTH_COVERAGE=(()=>{
  const DAY=86400000;
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,Number(value)||0));
  const dayKey=value=>{const date=value instanceof Date?value:new Date(value||Date.now());return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;};
  const shift=(key,amount)=>{const [year,month,date]=String(key).split("-").map(Number),value=new Date(year,month-1,date);value.setDate(value.getDate()+amount);return dayKey(value);};
  const finite=value=>Number.isFinite(Number(value));
  const sleepFor=(state,key)=>(state.sleepLogs||[]).find(row=>String(row.date||"").slice(0,10)===key)||{};
  const metricsFor=(state,key)=>state.healthMetrics?.[key]||{};
  const checkinFor=(state,key)=>(state.recoveryCheckins||[]).find(row=>String(row.date||"").slice(0,10)===key)||null;
  const weightFor=(state,key)=>(state.bodyWeights||[]).find(row=>String(row.date||"").slice(0,10)===key)||null;
  const metricValue=(state,key,name)=>{
    const sleep=sleepFor(state,key),metrics=metricsFor(state,key);
    const aliases={sleep:sleep.hours,hrv:sleep.hrv,rhr:sleep.rhr,resp:sleep.resp,steps:metrics.steps,activeEnergy:metrics.active_energy_kcal??state.activeEnergy?.[key],temperature:metrics.wrist_temperature_c,spo2:metrics.oxygen_saturation_pct,vo2:metrics.vo2_max,coverage:metrics.coverage_minutes,battery:metrics.watch_battery_pct};
    return aliases[name];
  };
  const coverage=(state,key=dayKey())=>{
    const sleep=sleepFor(state,key),metrics=metricsFor(state,key),checkin=checkinFor(state,key);
    const definitions=[
      ["sleep","Sleep",20,finite(sleep.hours)&&Number(sleep.hours)>0],
      ["hrv","HRV",15,finite(sleep.hrv)],
      ["rhr","Resting heart rate",15,finite(sleep.rhr)],
      ["resp","Respiratory rate",10,finite(sleep.resp)],
      ["activity","Activity",10,finite(metrics.steps)||finite(metrics.active_energy_kcal)||finite(state.activeEnergy?.[key])],
      ["wear","Watch coverage",15,finite(metrics.coverage_minutes)&&Number(metrics.coverage_minutes)>=1080],
      ["workout","Workout heart rate",5,finite(metrics.workout_hr_samples)&&Number(metrics.workout_hr_samples)>=5],
      ["checkin","Morning check-in",10,Boolean(checkin)]
    ];
    const items=definitions.map(([id,label,weight,available])=>({id,label,weight,available}));
    const score=items.reduce((sum,item)=>sum+(item.available?item.weight:0),0);
    const missing=items.filter(item=>!item.available).map(item=>item.label);
    const lastImport=state.lastVitalsImportAt||state.lastSyncedAt||null;
    const staleHours=lastImport?Math.max(0,(Date.now()-Date.parse(lastImport))/3600000):null;
    const confidence=score>=85?"high":score>=60?"medium":"low";
    return {date:key,score,confidence,missing,items,lastImport,staleHours,coverageMinutes:finite(metrics.coverage_minutes)?Number(metrics.coverage_minutes):null,sampleCount:finite(metrics.heart_rate_samples)?Number(metrics.heart_rate_samples):null};
  };
  const series=(state,name,key,days)=>{
    const values=[];
    for(let offset=days-1;offset>=0;offset--){const date=shift(key,-offset),value=metricValue(state,date,name);if(finite(value))values.push({date,value:Number(value)});}
    return values;
  };
  const average=values=>values.length?values.reduce((sum,row)=>sum+row.value,0)/values.length:null;
  const trend=(state,name,key=dayKey())=>{
    const seven=series(state,name,key,7),twentyEight=series(state,name,key,28),ninety=series(state,name,key,90);
    const current=seven.length?seven[seven.length-1].value:null,baseline=average(twentyEight.slice(0,-1));
    const delta=current===null||baseline===null?null:current-baseline;
    return {name,current,delta,average7:average(seven),average28:average(twentyEight),average90:average(ninety),count7:seven.length,count28:twentyEight.length,count90:ninety.length,mature:twentyEight.length>=14};
  };
  const longTerm=(state,key=dayKey())=>{
    const metrics=["sleep","hrv","rhr","resp","vo2"].map(name=>trend(state,name,key));
    const weights=(state.bodyWeights||[]).filter(row=>finite(row.kg??row.weight)&&String(row.date||"").slice(0,10)<=key).slice().sort((a,b)=>String(a.date).localeCompare(String(b.date))).slice(-90);
    const weightValues=weights.map(row=>({date:String(row.date).slice(0,10),value:Number(row.kg??row.weight)}));
    const waist=(state.bodyMeasurements||[]).filter(row=>finite(row.waist_cm)&&String(row.date||"").slice(0,10)<=key).slice().sort((a,b)=>String(a.date).localeCompare(String(b.date))).slice(-1)[0]||null;
    return {date:key,metrics,weight:{current:weightValues.at(-1)?.value??null,average7:average(weightValues.slice(-7)),average28:average(weightValues.slice(-28)),count:weightValues.length},waistCm:waist?Number(waist.waist_cm):null};
  };
  const chargingAdvice=(state,key=dayKey())=>{
    const data=coverage(state,key),battery=metricValue(state,key,"battery"),missingWear=data.items.find(item=>item.id==="wear"&&!item.available);
    if(finite(battery)&&Number(battery)<30)return {tone:"warning",title:"Charge before sleep",detail:`Watch battery was ${Math.round(Number(battery))}%. Charge during a shower or desk block, then wear it overnight.`};
    if(missingWear)return {tone:"warning",title:"Close the coverage gap",detail:"Less than 18 hours of Watch coverage was received. Pick a repeatable daytime charging window."};
    return {tone:"good",title:"Coverage routine is working",detail:"Keep charging during a low-value daytime window so overnight measurements remain complete."};
  };
  const workoutGuard=(state,key=dayKey())=>{
    const battery=metricValue(state,key,"battery"),data=coverage(state,key),checks=[
      {id:"sync",label:"Health data synced",ok:data.staleHours!==null&&data.staleHours<=24},
      {id:"battery",label:"Watch battery ready",ok:!finite(battery)||Number(battery)>=25},
      {id:"baseline",label:"Recovery baseline available",ok:(state.sleepLogs||[]).length>=7},
      {id:"checkin",label:"Pain and energy checked",ok:Boolean(checkinFor(state,key))}
    ];
    const pain=Boolean(checkinFor(state,key)?.pain),ready=checks.every(item=>item.ok)&&!pain;
    return {ready,pain,checks,message:pain?"Pain was reported. Modify or stop the session and assess it.":ready?"Watch and recovery inputs are ready. Start Workout mode before the first set.":"Complete the missing checks before relying on today’s training recommendation."};
  };
  return Object.freeze({dayKey,shift,coverage,trend,longTerm,chargingAdvice,workoutGuard,checkinFor,weightFor});
})();
