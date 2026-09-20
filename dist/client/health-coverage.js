/* Rep Health Coverage Engine v67.
   Scores measurement completeness separately from wellness readiness. */
globalThis.REP_HEALTH_COVERAGE=(()=>{
  const dateKey=(value,timeZone)=>{
    if(value&&typeof value==="object"&&!(value instanceof Date)){
      const raw=value.dateKey||value.date||value.createdAt;
      return dateKey(raw,timeZone);
    }
    if(!value){
      const d=new Date();
      if(timeZone)return new Intl.DateTimeFormat("en-CA",{timeZone,year:"numeric",month:"2-digit",day:"2-digit"}).format(d);
      return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");
    }
    if(typeof value==="number"&&Number.isFinite(value)){
      return dateKey(new Date(value),timeZone);
    }
    if(value instanceof Date){
      if(timeZone)return new Intl.DateTimeFormat("en-CA",{timeZone,year:"numeric",month:"2-digit",day:"2-digit"}).format(value);
      return [value.getFullYear(),String(value.getMonth()+1).padStart(2,"0"),String(value.getDate()).padStart(2,"0")].join("-");
    }
    const str=String(value);
    if(/^\d{4}-\d{2}-\d{2}$/.test(str))return str;
    if(timeZone&&!isNaN(Date.parse(str))){
      return new Intl.DateTimeFormat("en-CA",{timeZone,year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(str));
    }
    return str.slice(0,10);
  };
  const dayKey=dateKey;
  const shift=(key,amount)=>{
    const k=dateKey(key);
    const [year,month,date]=k.split("-").map(Number),value=new Date(Date.UTC(year,month-1,date));
    value.setUTCDate(value.getUTCDate()+amount);
    return [value.getUTCFullYear(),String(value.getUTCMonth()+1).padStart(2,"0"),String(value.getUTCDate()).padStart(2,"0")].join("-");
  };
  const finite=value=>Number.isFinite(Number(value));
  const getRowTime=r=>{
    if(!r)return 0;
    const t=Date.parse(r.createdAt||r.date||r.dateKey);
    return Number.isFinite(t)?t:0;
  };
  const invalidateCache=state=>{
    if(!state)return;
    delete state._sleepMap;
    delete state._checkinMap;
    delete state._longTermCache;
    delete state._baselineCache;
  };
  const getSleepMap=state=>{
    if(state)delete state._sleepMap;
    const map=new Map();
    for(const r of (state.sleepLogs||[])){
      const k=dateKey(r);
      if(!k)continue;
      if(!map.has(k)){
        map.set(k,r);
      } else {
        const existing=map.get(k);
        if(getRowTime(r)>getRowTime(existing))map.set(k,r);
      }
    }
    return map;
  };
  const getCheckinMap=state=>{
    if(state)delete state._checkinMap;
    const map=new Map();
    for(const r of (state.recoveryCheckins||[])){
      const k=dateKey(r);
      if(!k)continue;
      if(!map.has(k)){
        map.set(k,r);
      } else {
        const existing=map.get(k);
        if(getRowTime(r)>getRowTime(existing))map.set(k,r);
      }
    }
    return map;
  };
  const sleepFor=(state,key)=>getSleepMap(state).get(dateKey(key))||{};
  const metricsFor=(state,key)=>state.healthMetrics?.[dateKey(key)]||{};
  const checkinFor=(state,key)=>getCheckinMap(state).get(dateKey(key))||null;
  const weightFor=(state,key)=>{
    const target=dateKey(key);
    let best=null;
    for(const row of (state.bodyWeights||[])){
      if(dateKey(row)===target){
        if(!best)best=row;
        else if(getRowTime(row)>getRowTime(best))best=row;
      }
    }
    return best;
  };
  const metricValue=(state,key,name)=>{
    const sleep=sleepFor(state,key),metrics=metricsFor(state,key);
    const aliases={sleep:sleep.hours,hrv:sleep.hrv,rhr:sleep.rhr,resp:sleep.resp,steps:metrics.steps,activeEnergy:metrics.active_energy_kcal??state.activeEnergy?.[dateKey(key)],temperature:metrics.wrist_temperature_c,spo2:metrics.oxygen_saturation_pct,vo2:metrics.vo2_max,coverage:metrics.coverage_minutes,battery:metrics.watch_battery_pct};
    return aliases[name];
  };
  // Watch coverage and Workout heart rate are deliberately excluded from
  // scoring: neither the DIY Shortcut nor Health Auto Export import path can
  // ever populate coverage_minutes or workout_hr_samples (both require the
  // unbuilt native HealthKit bridge), so counting them would permanently cap
  // confidence for every non-native-bridge user rather than reflecting what
  // their actual pipeline can deliver.
  const coverage=(state,key=dayKey())=>{
    const k=dateKey(key),sleep=sleepFor(state,k),metrics=metricsFor(state,k),checkin=checkinFor(state,k);
    const definitions=[
      ["sleep","Sleep",20,finite(sleep.hours)&&Number(sleep.hours)>0],
      ["hrv","HRV",15,finite(sleep.hrv)],
      ["rhr","Resting heart rate",15,finite(sleep.rhr)],
      ["resp","Respiratory rate",10,finite(sleep.resp)],
      ["activity","Activity",10,finite(metrics.steps)||finite(metrics.active_energy_kcal)||finite(state.activeEnergy?.[k])],
      ["checkin","Morning check-in",10,Boolean(checkin)]
    ];
    const items=definitions.map(([id,label,weight,available])=>({id,label,weight,available}));
    const maxScore=items.reduce((sum,item)=>sum+item.weight,0);
    const earned=items.reduce((sum,item)=>sum+(item.available?item.weight:0),0);
    const score=maxScore?Math.round(earned/maxScore*100):0;
    const missing=items.filter(item=>!item.available).map(item=>item.label);
    const lastImport=state.lastVitalsImportAt||state.lastSyncedAt||null;
    const staleHours=lastImport?Math.max(0,(Date.now()-Date.parse(lastImport))/3600000):null;
    const confidence=score>=85?"high":score>=60?"medium":"low";
    return {date:k,score,confidence,missing,items,lastImport,staleHours,coverageMinutes:finite(metrics.coverage_minutes)?Number(metrics.coverage_minutes):null,sampleCount:finite(metrics.heart_rate_samples)?Number(metrics.heart_rate_samples):null};
  };
  const series=(state,name,key,days)=>{
    const values=[];
    for(let offset=days-1;offset>=0;offset--){const date=shift(key,-offset),value=metricValue(state,date,name);if(finite(value))values.push({date,value:Number(value)});}
    return values;
  };
  const average=values=>values.length?values.reduce((sum,row)=>sum+row.value,0)/values.length:null;
  const multiSeries=(state,key,days)=>{
    const sleepMap=getSleepMap(state),metricsMap=state.healthMetrics||{},dayMs=86400000,[y,m,d]=dateKey(key).split("-").map(Number),startTime=Date.UTC(y,m-1,d,12);
    const data={sleep:[],hrv:[],rhr:[],resp:[],vo2:[]};
    for(let offset=days-1;offset>=0;offset--){
      const dt=new Date(startTime-offset*dayMs),dateStr=[dt.getUTCFullYear(),String(dt.getUTCMonth()+1).padStart(2,"0"),String(dt.getUTCDate()).padStart(2,"0")].join("-");
      const sleep=sleepMap.get(dateStr)||{},metrics=metricsMap[dateStr]||{};
      if(finite(sleep.hours))data.sleep.push({date:dateStr,value:Number(sleep.hours)});
      if(finite(sleep.hrv))data.hrv.push({date:dateStr,value:Number(sleep.hrv)});
      if(finite(sleep.rhr))data.rhr.push({date:dateStr,value:Number(sleep.rhr)});
      if(finite(sleep.resp))data.resp.push({date:dateStr,value:Number(sleep.resp)});
      if(finite(metrics.vo2_max))data.vo2.push({date:dateStr,value:Number(metrics.vo2_max)});
    }
    return data;
  };
  const trendFromSeries=(name,ninety)=>{
    const twentyEight=ninety.slice(-28),seven=ninety.slice(-7);
    const current=seven.length?seven[seven.length-1].value:null,baseline=average(twentyEight.slice(0,-1));
    const delta=current===null||baseline===null?null:current-baseline;
    return {name,current,delta,average7:average(seven),average28:average(twentyEight),average90:average(ninety),count7:seven.length,count28:twentyEight.length,count90:ninety.length,mature:twentyEight.length>=14};
  };
  const trend=(state,name,key=dayKey())=>{
    const ninety=series(state,name,key,90);
    return trendFromSeries(name,ninety);
  };
  const longTerm=(state,key=dayKey())=>{
    if(state)delete state._longTermCache;
    const k=dateKey(key);
    const data90=multiSeries(state,k,90);
    const metrics=["sleep","hrv","rhr","resp","vo2"].map(name=>trendFromSeries(name,data90[name]||[]));
    const rawWeights=(state.bodyWeights||[]).filter(row=>finite(row.kg??row.weight)&&dateKey(row)<=k);
    const weightIndices=new Map(rawWeights.map((r,i)=>[r,i]));
    const sortedWeights=rawWeights.slice().sort((a,b)=>{
      const dComp=dateKey(a).localeCompare(dateKey(b));
      if(dComp!==0)return dComp;
      const tComp=getRowTime(a)-getRowTime(b);
      if(tComp!==0)return tComp;
      return (weightIndices.get(b)||0)-(weightIndices.get(a)||0);
    });
    const weightValues=sortedWeights.slice(-90).map(row=>({date:dateKey(row),value:Number(row.kg??row.weight)}));
    const rawWaist=(state.bodyMeasurements||[]).filter(row=>finite(row.waist_cm)&&dateKey(row)<=k);
    const waistIndices=new Map(rawWaist.map((r,i)=>[r,i]));
    const sortedWaist=rawWaist.slice().sort((a,b)=>{
      const dComp=dateKey(a).localeCompare(dateKey(b));
      if(dComp!==0)return dComp;
      const tComp=getRowTime(a)-getRowTime(b);
      if(tComp!==0)return tComp;
      return (waistIndices.get(b)||0)-(waistIndices.get(a)||0);
    });
    const waist=sortedWaist.at(-1)||null;
    return {
      date:k,
      metrics,
      weight:{
        current:weightValues.at(-1)?.value??null,
        average7:average(weightValues.slice(-7)),
        average28:average(weightValues.slice(-28)),
        count:weightValues.length
      },
      waistCm:waist?Number(waist.waist_cm):null
    };
  };
  const chargingAdvice=(state,key=dayKey())=>{
    const battery=metricValue(state,key,"battery");
    if(finite(battery)&&Number(battery)<30)return {tone:"warning",title:"Charge before sleep",detail:`Watch battery was ${Math.round(Number(battery))}%. Charge during a shower or desk block, then wear it overnight.`};
    return {tone:"good",title:"Coverage routine is working",detail:"Keep charging during a low-value daytime window so overnight measurements remain complete."};
  };
  const workoutGuard=(state,key=dayKey())=>{
    const k=dateKey(key),battery=metricValue(state,k,"battery"),data=coverage(state,k),checks=[
      {id:"sync",label:"Health data synced",ok:data.staleHours!==null&&data.staleHours<=24},
      {id:"battery",label:"Watch battery ready",ok:finite(battery)&&Number(battery)>=25},
      {id:"baseline",label:"Recovery baseline available",ok:(state.sleepLogs||[]).length>=7},
      {id:"checkin",label:"Pain and energy checked",ok:Boolean(checkinFor(state,k))}
    ];
    const checkin=checkinFor(state,k),pain=Boolean(checkin?.pain),illness=Boolean(checkin?.illness);
    const ready=checks.every(item=>item.ok)&&!pain&&!illness;
    const message=pain?"Pain was reported. Modify or stop the session and assess it.":illness?"Illness was reported. Modify or stop the session and focus on recovery.":ready?"Watch and recovery inputs are ready. Start Workout mode before the first set.":"Complete the missing checks before relying on today’s training recommendation.";
    return {ready,pain,illness,checks,message};
  };
  return Object.freeze({dayKey,dateKey,shift,coverage,trend,longTerm,chargingAdvice,workoutGuard,checkinFor,weightFor,invalidateCache});
})();
