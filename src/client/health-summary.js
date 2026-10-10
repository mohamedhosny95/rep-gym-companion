/* One date-aware view of health values for rings, detail screens and charts. */
globalThis.AWJ_HEALTH_SUMMARY=(()=>{
  const engine=globalThis.AWJ_HEALTH_ENGINE,coverage=globalThis.AWJ_HEALTH_COVERAGE;
  const ranges={sleep:[0.1,16],hrv:[5,300],rhr:[30,120],resp:[5,40],steps:[0,200000],activeEnergy:[0,10000]};
  const units={sleep:'h',recovery:'%',strain:'/ 21',hrv:'ms',rhr:'bpm',resp:'/min',steps:'steps',activeEnergy:'kcal'};
  function number(value,min=-Infinity,max=Infinity){
    if(typeof value!=='number'&&(typeof value!=='string'||!value.trim()))return null;
    const result=Number(value);return Number.isFinite(result)&&result>=min&&result<=max?result:null;
  }
  function rowFor(rows,date){
    return (rows||[]).filter(row=>row&&engine.dateKey(row)===date).sort((a,b)=>(Date.parse(b.createdAt||b.importedAt||'')||0)-(Date.parse(a.createdAt||a.importedAt||'')||0))[0]||{};
  }
  function valueFor(state,date,id){
    const row=rowFor(state.sleepLogs,date),metrics=state.healthMetrics?.[date]||{};
    const values={sleep:row.hours,hrv:row.hrv,rhr:row.rhr,resp:row.resp,steps:metrics.steps,activeEnergy:state.activeEnergy?.[date]??metrics.active_energy_kcal};
    return number(values[id],...(ranges[id]||[-Infinity,Infinity]));
  }
  /** @returns {import('./screens/contracts.ts').HealthMetric} */
  function measurement(state,date,id,{recent=false,now=Date.now()}={}){
    let measuredDate=date,value=valueFor(state,date,id);
    if(value===null&&recent){
      const days=[...new Set([...(state.sleepLogs||[]).filter(Boolean).map(row=>engine.dateKey(row)),...Object.keys(state.healthMetrics||{})])].filter(day=>day<date).sort().reverse();
      for(const day of days){const candidate=valueFor(state,day,id);if(candidate!==null){measuredDate=day;value=candidate;break;}}
    }
    const row=rowFor(state.sleepLogs,measuredDate),metrics=state.healthMetrics?.[measuredDate]||{};
    const fromSleep=['sleep','hrv','rhr','resp'].includes(id),manual=fromSleep&&row.source==='Manual log';
    const importedAt=manual?null:row.importedAt||metrics.importedAt||(state.lastVitalsImportDate===measuredDate?state.lastVitalsImportAt:null)||null;
    const age=importedAt&&Number.isFinite(Date.parse(importedAt))?Math.max(0,(now-Date.parse(importedAt))/3600000):null;
    const freshness=value===null?'missing':measuredDate!==date||(age!==null&&age>24)?'stale':age===null?'unknown':'fresh';
    return {id,value,unit:units[id]||'',date:value===null?null:measuredDate,source:value===null?null:(fromSleep?row.source||metrics.source:metrics.source)||(importedAt?'Apple Health':'Manual log'),importedAt,freshness,confidence:null,partial:false};
  }
  function activity(state,date){
    const sessions=(state.history||[]).filter(row=>engine.dateKey(row)===date);
    const activeEnergy=valueFor(state,date,'activeEnergy'),steps=valueFor(state,date,'steps');
    const usable=sessions.filter(row=>number(row.duration,0)!==null||number(row.calories,0)!==null);
    // Steps alone cannot reproduce AWJ's existing energy/effort strain estimate.
    const available=activeEnergy!==null||usable.length>0;
    return {available,activeEnergy,steps,sessions:usable.length,partial:available&&activeEnergy===null,inputs:[...(activeEnergy!==null?['Active energy']:[]),...(usable.length?['Logged workouts']:[])]};
  }
  function daily(state,date=engine.dateKey(),profile=state.healthProfile||{},now=Date.now()){
    const sleep=measurement(state,date,'sleep',{now}),need=engine.sleepNeed(state,date,profile),readiness=engine.readiness(state,date,profile),load=activity(state,date);
    const recovery={id:'recovery',value:readiness.score,unit:'%',date:readiness.score===null?null:date,source:'AWJ estimate',importedAt:sleep.importedAt,freshness:readiness.score===null?'missing':sleep.freshness==='stale'?'stale':'unknown',confidence:readiness.confidence,partial:readiness.coverage<100,band:readiness.band,calibrating:readiness.calibrating};
    const strain={id:'strain',value:load.available?engine.strain(state,date):null,unit:'/ 21',date:load.available?date:null,source:'AWJ estimate',importedAt:state.healthMetrics?.[date]?.importedAt||null,freshness:load.available?'unknown':'missing',confidence:null,partial:load.partial,inputs:load.inputs};
    const sleepPercent=sleep.value===null?null:Math.round(sleep.value/need.need*100);
    return {date,sleep:{...sleep,percent:sleepPercent,target:need.need,personalized:need.personalized},recovery,strain,readiness,advice:engine.trainingRecommendation(state,date,profile,readiness),coverage:coverage.coverage(state,date),vitals:['hrv','rhr','resp'].map(id=>measurement(state,date,id,{recent:true,now})),activity:load};
  }
  function series(state,id,date=engine.dateKey(),days=7,profile=state.healthProfile||{}){
    return Array.from({length:days},(_,index)=>{
      const day=engine.shiftDay(date,index-days+1);
      if(['sleep','recovery','strain'].includes(id)){const data=daily(state,day,profile);return {date:day,value:id==='sleep'?data.sleep.percent:data[id].value};}
      return {date:day,value:measurement(state,day,id).value};
    });
  }
  function average(rows){const valid=rows.filter(row=>row.value!==null&&Number.isFinite(row.value));return valid.length?valid.reduce((sum,row)=>sum+row.value,0)/valid.length:null;}
  return Object.freeze({number,rowFor,measurement,activity,daily,series,average});
})();
