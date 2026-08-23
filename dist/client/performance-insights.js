/* Deterministic, local-first performance analytics.
   The engine never diagnoses or claims causation. Every result carries its
   sample size, date range, and a confidence derived from coverage. */
(function(root,factory){
  const api=factory();
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
  root.REP_PERFORMANCE_INSIGHTS=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  const DAY=86400000,WEEK=7*DAY;
  const MUSCLES={
    "Leg Press":["Quads","Glutes"],"Back Extension":["Glutes","Hamstrings","Back"],"Hip Thrust Machine":["Glutes","Hamstrings"],
    "Chest Press":["Chest","Triceps","Shoulders"],"Seated Cable Row":["Back","Biceps"],"Lat Pulldown":["Back","Biceps"],
    "Glute Bridges":["Glutes","Hamstrings"],"Bird-Dog":["Core","Back"],"Plank":["Core"],"Hand Grip":["Forearms"]
  };
  const GOAL_TYPES=["strength","fat_loss","muscle_gain","recovery"];
  const round=(value,digits=1)=>{const factor=10**digits;return Math.round((Number(value)||0)*factor)/factor;};
  const finite=value=>Number.isFinite(Number(value));
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,Number(value)||0));
  const median=values=>{const clean=values.filter(finite).map(Number).sort((a,b)=>a-b);if(!clean.length)return null;const middle=Math.floor(clean.length/2);return clean.length%2?clean[middle]:(clean[middle-1]+clean[middle])/2;};
  const average=values=>{const clean=values.filter(finite).map(Number);return clean.length?clean.reduce((sum,value)=>sum+value,0)/clean.length:null;};
  const dateKey=value=>{const date=value?new Date(value):new Date();return Number.isNaN(date.getTime())?null:[date.getFullYear(),String(date.getMonth()+1).padStart(2,"0"),String(date.getDate()).padStart(2,"0")].join("-");};
  const atNoon=key=>{const [year,month,day]=String(key||"").split("-").map(Number);return new Date(year,month-1,day,12);};
  const daysBetween=(a,b)=>Math.round((atNoon(b)-atNoon(a))/DAY);
  const shiftDay=(key,days)=>{const date=atNoon(key);date.setDate(date.getDate()+days);return dateKey(date);};
  const inWindow=(key,end,days)=>key&&daysBetween(key,end)>=0&&daysBetween(key,end)<days;
  const rangeLabel=rows=>{const dates=rows.map(row=>dateKey(row.date)).filter(Boolean).sort();return dates.length?`${dates[0]} to ${dates.at(-1)}`:"No dated records";};
  const confidence=(sample,coverage=1)=>sample>=12&&coverage>=.75?"high":sample>=5&&coverage>=.4?"medium":"low";
  const confidenceScore=value=>({high:3,medium:2,low:1}[value]||0);
  const safeArray=value=>Array.isArray(value)?value:[];
  const normalizedSource=value=>String(value||"Unknown").trim().slice(0,80)||"Unknown";

  function normalizeGoal(goal={}){
    const type=GOAL_TYPES.includes(goal.type)?goal.type:"strength";
    return {type,exercise:String(goal.exercise||"Chest Press").slice(0,80),target:finite(goal.target)?Math.max(0,Number(goal.target)):0,updatedAt:goal.updatedAt||null};
  }

  function e1rm(weight,reps){
    const load=Number(weight),count=Number(reps);
    if(!Number.isFinite(load)||!Number.isFinite(count)||load<=0||count<1)return null;
    return round(load*(1+Math.min(count,15)/30),1);
  }

  function setRows(state){
    const rows=[];
    for(const session of safeArray(state?.history)){
      const key=dateKey(session.date);if(!key)continue;
      if(safeArray(session.entries).some(entry=>entry.exercise&&finite(entry.weight)&&finite(entry.reps))){
        session.entries.forEach((entry,index)=>{const weight=Number(entry.weight),reps=Number(entry.reps),estimate=e1rm(weight,reps);if(!estimate)return;rows.push({sessionId:String(session.id||session.date),date:key,time:session.date,exercise:String(entry.exercise).slice(0,80),set:Number(entry.set)||index+1,weight,reps,rpe:finite(entry.rpe)?Number(entry.rpe):null,e1rm:estimate,volume:round(weight*reps,1)});});
        continue;
      }
      for(const [exercise,log] of Object.entries(session.loads||{})){
        const sets=Array.isArray(log)?log:(Array.isArray(log?.sets)?log.sets:[]);
        sets.forEach((entry,index)=>{const weight=Number(entry?.weight),reps=Number(entry?.reps),estimate=e1rm(weight,reps);if(!estimate)return;rows.push({sessionId:String(session.id||session.date),date:key,time:session.date,exercise:String(exercise).slice(0,80),set:index+1,weight,reps,rpe:finite(entry?.rpe)?Number(entry.rpe):null,e1rm:estimate,volume:round(weight*reps,1)});});
      }
    }
    const seen=new Set();
    return rows.filter(row=>{const id=[row.sessionId,row.exercise,row.set,row.weight,row.reps].join("|");if(seen.has(id))return false;seen.add(id);return true;}).sort((a,b)=>a.date.localeCompare(b.date));
  }

  function sessionPerformance(rows){
    const bySession=new Map();
    for(const row of rows){const id=`${row.sessionId}|${row.exercise}`,current=bySession.get(id)||{sessionId:row.sessionId,date:row.date,time:row.time,exercise:row.exercise,bestE1rm:0,volume:0,sets:0,hardSets:0,meanRpe:null,rpes:[]};current.bestE1rm=Math.max(current.bestE1rm,row.e1rm);current.volume+=row.volume;current.sets++;if(row.rpe===null||row.rpe>=7)current.hardSets++;if(row.rpe!==null)current.rpes.push(row.rpe);bySession.set(id,current);}
    return [...bySession.values()].map(row=>({...row,volume:round(row.volume),meanRpe:round(average(row.rpes)||0,1)})).sort((a,b)=>a.date.localeCompare(b.date));
  }

  function theilSen(points){
    const slopes=[];
    for(let i=0;i<points.length;i++)for(let j=i+1;j<points.length;j++){const weeks=(atNoon(points[j].date)-atNoon(points[i].date))/WEEK;if(weeks>0)slopes.push((Number(points[j].value)-Number(points[i].value))/weeks);}
    return median(slopes);
  }

  function strength(state,nowKey=dateKey()){
    const rows=setRows(state),sessions=sessionPerformance(rows),byExercise={};
    for(const row of sessions)(byExercise[row.exercise]||(byExercise[row.exercise]=[])).push(row);
    const exercises=Object.entries(byExercise).map(([exercise,records])=>{
      const latest=records.at(-1),current=Math.max(...records.map(row=>row.bestE1rm)),bestRecord=records.find(row=>row.bestE1rm===current)||latest;
      const recent=records.filter(row=>inWindow(row.date,nowKey,28)),first=recent[0],last=recent.at(-1),change=recent.length>=2?round((last.bestE1rm-first.bestE1rm)/first.bestE1rm*100,1):null;
      const slope=theilSen(records.slice(-8).map(row=>({date:row.date,value:row.bestE1rm}))),latestThree=records.slice(-3),daysObserved=records.length>1?daysBetween(records[0].date,records.at(-1).date):0;
      const plateau=latestThree.length>=3&&daysObserved>=14&&Math.max(...latestThree.map(row=>row.bestE1rm))<=Math.max(...records.slice(0,-2).map(row=>row.bestE1rm),0)*1.005;
      const recommendation=latest.meanRpe&&latest.meanRpe>9?"reduce":latest.bestE1rm>=current*.995&&latest.meanRpe<=8.5&&average(rows.filter(row=>row.sessionId===latest.sessionId&&row.exercise===exercise).map(row=>row.reps))>=10?"progress":"hold";
      return {exercise,currentE1rm:round(current,1),bestDate:bestRecord.date,latestE1rm:latest.bestE1rm,latestDate:latest.date,change28d:change,slopePerWeek:slope===null?null:round(slope,2),sessionCount:records.length,setCount:rows.filter(row=>row.exercise===exercise).length,plateau,recommendation,confidence:confidence(records.length,Math.min(1,daysObserved/42)),records};
    }).sort((a,b)=>b.currentE1rm-a.currentE1rm);
    const recentRows=rows.filter(row=>inWindow(row.date,nowKey,7)),previousRows=rows.filter(row=>{const age=daysBetween(row.date,nowKey);return age>=7&&age<14;});
    const muscleSets={};for(const row of recentRows){if(row.rpe!==null&&row.rpe<7)continue;for(const muscle of MUSCLES[row.exercise]||["Other"]){muscleSets[muscle]=(muscleSets[muscle]||0)+1;}}
    const totalVolume=round(recentRows.reduce((sum,row)=>sum+row.volume,0)),previousVolume=round(previousRows.reduce((sum,row)=>sum+row.volume,0));
    const volumeChange=previousVolume?round((totalVolume-previousVolume)/previousVolume*100,1):null;
    return {rows,sessions,exercises,muscleSets,totalVolume,previousVolume,volumeChange,plateaus:exercises.filter(item=>item.plateau),prs:exercises.filter(item=>inWindow(item.bestDate,nowKey,7)),confidence:confidence(new Set(rows.map(row=>row.sessionId)).size,Math.min(1,rows.length/30)),dateRange:rangeLabel(rows)};
  }

  function nutritionTargetsForDate(state,key){
    const schedule=state?.preferences?.schedule||{},targets=state?.preferences?.targets||{},day=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][atNoon(key).getDay()],focus=schedule[day]?.focus;
    const profile=focus==="gym"?"gym":focus==="cardio"?"active":"flex";
    return targets[profile]||targets.gym||{calories:0,protein:0,water:0};
  }

  function nutrition(state,nowKey=dateKey()){
    const byDay=new Map(),seenFood=new Set();
    for(const entry of safeArray(state?.foodEntries)){const key=dateKey(entry.date),id=String(entry.id||"");if(!key||(id&&seenFood.has(id)))continue;if(id)seenFood.add(id);const day=byDay.get(key)||{date:key,calories:0,protein:0,carbs:0,fat:0,entries:0,sources:new Set()};day.calories+=Number(entry.calories)||0;day.protein+=Number(entry.protein_g)||0;day.carbs+=Number(entry.carbs_g)||0;day.fat+=Number(entry.fat_g)||0;day.entries++;day.sources.add(normalizedSource(entry.source||entry.logMethod));byDay.set(key,day);}
    const days=[...byDay.values()].sort((a,b)=>a.date.localeCompare(b.date)).map(day=>{const target=nutritionTargetsForDate(state,day.date),water=Number(state?.water?.[day.date])||0;return {...day,water,target,calorieAdherent:target.calories>0&&Math.abs(day.calories-target.calories)<=target.calories*.1,proteinAdherent:target.protein>0&&day.protein>=target.protein*.9,waterAdherent:target.water>0&&water>=target.water*.9};});
    function adherence(windowDays){const period=days.filter(day=>inWindow(day.date,nowKey,windowDays)),coverage=period.length/windowDays;return {windowDays,loggedDays:period.length,coverage:round(coverage*100,0),calories:period.length?round(period.filter(day=>day.calorieAdherent).length/period.length*100,0):null,protein:period.length?round(period.filter(day=>day.proteinAdherent).length/period.length*100,0):null,water:period.length?round(period.filter(day=>day.waterAdherent).length/period.length*100,0):null,averageCalories:round(average(period.map(day=>day.calories))||0,0),averageProtein:round(average(period.map(day=>day.protein))||0,0)};}
    const seenWeights=new Set(),weights=safeArray(state?.bodyWeights).filter(row=>{const key=String(row.week||dateKey(row.date)||"");if(!finite(row.kg)||!dateKey(row.date)||seenWeights.has(key))return false;seenWeights.add(key);return true;}).map(row=>({date:dateKey(row.date),value:Number(row.kg)})).sort((a,b)=>a.date.localeCompare(b.date));
    const weightSlope=weights.length>=3?theilSen(weights.slice(-12)):null,currentWeight=weights.length?weights.at(-1).value:null;
    const a28=adherence(28),maintenanceEligible=weights.length>=4&&a28.loggedDays>=14&&a28.coverage>=50;
    const maintenance=maintenanceEligible?round(a28.averageCalories-(weightSlope||0)*7700/7,0):null,maintenanceUncertainty=maintenance===null?null:Math.round(150+(100-a28.coverage)*3);
    return {days,adherence7:adherence(7),adherence28:a28,weights,currentWeight,weightSlopePerWeek:weightSlope===null?null:round(weightSlope,2),maintenance:maintenance===null?null:{mid:maintenance,low:Math.max(800,maintenance-maintenanceUncertainty),high:maintenance+maintenanceUncertainty,assumption:"Requires substantially complete intake logging; this is an estimate, not a prescription."},confidence:confidence(Math.min(days.length,weights.length*2),Math.min(1,a28.coverage/100)),dateRange:rangeLabel(days)};
  }

  function dailyReadiness(state,key){
    const sleep=safeArray(state?.sleepLogs).find(row=>dateKey(row.date)===key),check=safeArray(state?.recoveryCheckins).find(row=>dateKey(row.date)===key);if(!sleep&&!check)return null;
    const base=Number(state?.healthProfile?.baseSleepHours)||7.5,parts=[];if(finite(sleep?.hours))parts.push(clamp(Number(sleep.hours)/base*100,0,110));if(check){if(finite(check.energy))parts.push(clamp(Number(check.energy)/5*100,0,100));if(finite(check.stress))parts.push(clamp(120-Number(check.stress)*20,0,100));if(check.pain||check.illness)parts.push(20);}
    return parts.length?round(average(parts),0):null;
  }

  function experiments(state,nowKey=dateKey(),deps={}){
    const strengthData=deps.strengthData||strength(state,nowKey),nutritionData=deps.nutritionData||nutrition(state,nowKey),results=[],dailyFood=new Map(nutritionData.days.map(day=>[day.date,day]));
    const exerciseMedians={};for(const item of strengthData.exercises)exerciseMedians[item.exercise]=median(item.records.map(row=>row.bestE1rm));
    const performance=strengthData.sessions.map(row=>({...row,index:exerciseMedians[row.exercise]?row.bestE1rm/exerciseMedians[row.exercise]*100:null})).filter(row=>finite(row.index));
    function compare(id,label,withRows,withoutRows){if(withRows.length<4||withoutRows.length<4)return;const withMean=average(withRows.map(row=>row.index)),withoutMean=average(withoutRows.map(row=>row.index)),effect=round(withMean-withoutMean,1);results.push({id,label,effect,withDays:withRows.length,withoutDays:withoutRows.length,confidence:confidence(Math.min(withRows.length,withoutRows.length),Math.min(1,(withRows.length+withoutRows.length)/16)),language:"association",dateRange:rangeLabel([...withRows,...withoutRows])});}
    const sleepWith=[],sleepWithout=[],proteinWith=[],proteinWithout=[],early=[],late=[];
    for(const row of performance){const prior=shiftDay(row.date,-1),sleep=safeArray(state?.sleepLogs).find(item=>dateKey(item.date)===prior),base=Number(state?.healthProfile?.baseSleepHours)||7.5;if(finite(sleep?.hours))(Number(sleep.hours)>=base?sleepWith:sleepWithout).push(row);const food=dailyFood.get(prior);if(food)(food.proteinAdherent?proteinWith:proteinWithout).push(row);const hour=new Date(row.time).getHours();(hour<14?early:late).push(row);}
    compare("sleep-performance","Meeting sleep need before training",sleepWith,sleepWithout);compare("protein-performance","Meeting protein target before training",proteinWith,proteinWithout);compare("timing-performance","Training before 14:00",early,late);
    return results.sort((a,b)=>Math.abs(b.effect)-Math.abs(a.effect));
  }

  function dataQuality(state,nowKey=dateKey(),deps={}){
    const strengthData=deps.strengthData||strength(state,nowKey),nutritionData=deps.nutritionData||nutrition(state,nowKey),history=safeArray(state?.history),foods=safeArray(state?.foodEntries),weights=safeArray(state?.bodyWeights),sleep=safeArray(state?.sleepLogs),metrics=state?.healthMetrics||{};
    const duplicateIds=(rows,key)=>{const seen=new Set();let duplicates=0;for(const row of rows){const id=String(row?.[key]??"");if(!id)continue;if(seen.has(id))duplicates++;else seen.add(id);}return duplicates;};
    const duplicateWeeks=weights.length-new Set(weights.map(row=>row.week||dateKey(row.date))).size,healthDates=Object.keys(metrics).filter(key=>dateKey(key)),healthSources={};for(const key of healthDates){const source=normalizedSource(metrics[key]?.source);healthSources[source]=(healthSources[source]||0)+1;}
    const last=(rows,field="date")=>rows.map(row=>dateKey(row?.[field])).filter(Boolean).sort().at(-1)||null,freshness=key=>key===null?null:daysBetween(key,nowKey);
    const domains=[
      {id:"training",label:"Training",score:Math.round(Math.min(100,strengthData.rows.length/20*70+Math.min(30,new Set(strengthData.rows.map(row=>row.sessionId)).size/6*30))),records:strengthData.rows.length,freshnessDays:freshness(last(history)),issues:duplicateIds(history,"id")},
      {id:"nutrition",label:"Nutrition",score:Math.round(nutritionData.adherence28.coverage),records:foods.length,freshnessDays:freshness(last(foods)),issues:duplicateIds(foods,"id")},
      {id:"weight",label:"Body weight",score:Math.round(Math.min(100,Math.min(75,weights.length/8*75)+(freshness(last(weights))!==null&&freshness(last(weights))<=10?25:0))),records:weights.length,freshnessDays:freshness(last(weights)),issues:Math.max(0,duplicateWeeks)},
      {id:"health",label:"Health",score:Math.round(Math.min(100,(sleep.filter(row=>inWindow(dateKey(row.date),nowKey,14)).length/14*60)+(healthDates.filter(key=>inWindow(key,nowKey,14)).length/14*40))),records:sleep.length+healthDates.length,freshnessDays:freshness(last(sleep)),issues:0}
    ].map(domain=>({...domain,status:domain.score>=75?"good":domain.score>=40?"partial":"limited"}));
    const duplicateCount=domains.reduce((sum,domain)=>sum+domain.issues,0),overall=Math.round(average(domains.map(domain=>domain.score))||0),sourceList=Object.entries(healthSources).sort((a,b)=>b[1]-a[1]).map(([source,count])=>({source,count}));
    return {overall,domains,duplicateCount,healthSources:sourceList,confidence:confidence(domains.filter(domain=>domain.score>=40).length,overall/100),warnings:[...(duplicateCount?[`${duplicateCount} duplicate record key${duplicateCount===1?"":"s"} detected.`]:[]),...(nutritionData.adherence28.coverage<50?["Nutrition coverage is below 50%; calorie and maintenance estimates are limited."]:[]),...(strengthData.rows.length<12?["More completed weighted sets are needed for stable strength trends."]:[])]};
  }

  function goalForecast(state,goalInput,nowKey=dateKey(),deps={}){
    const goal=normalizeGoal(goalInput),strengthData=deps.strengthData||strength(state,nowKey),nutritionData=deps.nutritionData||nutrition(state,nowKey);let current=null,rate=null,unit="",label="",sample=0,nextAction="",evidence="";
    if(goal.type==="strength"){
      const item=strengthData.exercises.find(row=>row.exercise===goal.exercise)||strengthData.exercises[0];label=item?.exercise||goal.exercise;unit=" kg e1RM";current=item?.currentE1rm??null;rate=item?.slopePerWeek??null;sample=item?.sessionCount||0;evidence=item?`${item.sessionCount} ${item.exercise} sessions · best ${item.bestDate}`:"No weighted sessions";nextAction=!item?"Log weight and reps for at least three sessions.":item.recommendation==="progress"?"Increase by the smallest available increment only if warm-up reps are crisp and pain-free.":item.recommendation==="reduce"?"Repeat or reduce the load until RPE returns to the planned range.":item.plateau?"Keep the load and add one clean rep, or schedule a lighter week before progressing.":"Keep the current load and add a clean rep before increasing weight.";
    }else if(goal.type==="fat_loss"||goal.type==="muscle_gain"){
      label=goal.type==="fat_loss"?"Body-weight reduction":"Body-weight gain";unit=" kg";current=nutritionData.currentWeight;rate=nutritionData.weightSlopePerWeek;sample=nutritionData.weights.length;evidence=`${sample} weigh-ins · ${nutritionData.dateRange}`;const coverage=nutritionData.adherence28.coverage;nextAction=coverage<50?"Log food on at least five days each week before changing calorie targets.":nutritionData.adherence7.protein!==null&&nutritionData.adherence7.protein<80?"Make protein the next consistency target; keep calories unchanged for now.":"Hold the current plan for two more weeks, then review the weight trend rather than a single weigh-in.";
    }else{
      const recent=Array.from({length:7},(_,index)=>dailyReadiness(state,shiftDay(nowKey,index-6))).filter(finite),prior=Array.from({length:7},(_,index)=>dailyReadiness(state,shiftDay(nowKey,index-13))).filter(finite);label="Average readiness";unit="%";current=recent.length?round(average(recent),0):null;rate=recent.length>=4&&prior.length>=4?round(average(recent)-average(prior),1):null;sample=recent.length+prior.length;evidence=`${recent.length}/7 recent readiness days`;nextAction=recent.length<5?"Log sleep and recovery on at least five days this week.":"Protect a consistent sleep window and change only one recovery behavior for two weeks.";
    }
    const target=Number(goal.target)||0,conf=confidence(sample,Math.min(1,sample/8));let status="needs_target",weeks=null,range=null,dateRange=null;
    if(target>0&&current!==null){const delta=target-current,direction=goal.type==="fat_loss"?-1:1;if(Math.abs(delta)<.01)status="achieved";else if(rate!==null&&rate*direction>0&&delta*direction>0){weeks=Math.abs(delta/rate);const spread=conf==="high"?.2:conf==="medium"?.4:.75;range=[Math.max(1,Math.round(weeks*(1-spread))),Math.max(1,Math.round(weeks*(1+spread)))];dateRange=range.map(value=>shiftDay(nowKey,value*7));status="forecast";}else status="off_track";}
    return {goal,label,current,target,unit,rate,confidence:conf,sample,status,weeks:weeks===null?null:round(weeks,1),range,dateRange,nextAction,evidence};
  }

  function inbox(state,controls={},nowKey=dateKey(),deps={}){
    const strengthData=deps.strengthData||strength(state,nowKey),nutritionData=deps.nutritionData||nutrition(state,nowKey),quality=deps.quality||dataQuality(state,nowKey,{strengthData,nutritionData}),cards=[];
    function add(card){cards.push({confidence:"medium",priority:2,...card});}
    for(const item of strengthData.plateaus.slice(0,3))add({id:`plateau:${item.exercise}`,kind:"plateau",priority:3,title:`${item.exercise} may be plateauing`,body:`Estimated 1RM has not materially improved across the latest ${Math.min(3,item.sessionCount)} sessions.`,evidence:`${item.sessionCount} sessions · latest ${item.latestDate}`,action:"Keep the load, add one clean rep, or use a lighter week before progressing.",confidence:item.confidence});
    for(const item of strengthData.prs.slice(0,2))add({id:`pr:${item.exercise}:${item.bestDate}`,kind:"progress",priority:1,title:`New ${item.exercise} strength best`,body:`Estimated 1RM reached ${item.currentE1rm} kg.`,evidence:`Best set on ${item.bestDate} · ${item.sessionCount} sessions`,action:"Consolidate the result before adding another variable.",confidence:item.confidence});
    if(nutritionData.adherence7.loggedDays>=3&&nutritionData.adherence7.protein<70)add({id:`protein:${nowKey.slice(0,7)}`,kind:"nutrition",priority:2,title:"Protein consistency is below plan",body:`Protein reached at least 90% of target on ${nutritionData.adherence7.protein}% of logged days.`,evidence:`${nutritionData.adherence7.loggedDays}/7 days logged`,action:"Choose one repeatable meal that closes the daily protein gap.",confidence:nutritionData.confidence});
    if(nutritionData.weightSlopePerWeek!==null&&Math.abs(nutritionData.weightSlopePerWeek)>=.5)add({id:`weight-rate:${nowKey.slice(0,7)}`,kind:"weight",priority:3,title:"Body-weight trend changed quickly",body:`The robust trend is ${nutritionData.weightSlopePerWeek>0?"up":"down"} ${Math.abs(nutritionData.weightSlopePerWeek)} kg/week.`,evidence:`${nutritionData.weights.length} weigh-ins · ${nutritionData.dateRange}`,action:"Confirm with two more weigh-ins and review logging consistency before changing the plan.",confidence:nutritionData.confidence});
    if(quality.overall<55)add({id:"data-quality",kind:"quality",priority:2,title:"Some insights are still data-limited",body:`Cross-domain data confidence is ${quality.overall}%.`,evidence:quality.warnings.join(" ")||"Coverage is incomplete.",action:"Complete the lowest-coverage domain shown in Data Quality.",confidence:quality.confidence});
    const dismissed=controls?.dismissed||{},snoozed=controls?.snoozed||{},today=atNoon(nowKey).getTime();
    return cards.filter(card=>!dismissed[card.id]&&(!snoozed[card.id]||new Date(snoozed[card.id]).getTime()<=today)).sort((a,b)=>b.priority-a.priority||confidenceScore(b.confidence)-confidenceScore(a.confidence)).slice(0,8);
  }

  function ask(state,question,nowKey=dateKey()){
    const q=String(question||"").trim().toLowerCase(),strengthData=strength(state,nowKey),nutritionData=nutrition(state,nowKey),quality=dataQuality(state,nowKey,{strengthData,nutritionData}),goal=goalForecast(state,state?.analyticsGoal,nowKey,{strengthData,nutritionData});let title="Your data summary",summary="I can answer questions about strength, plateaus, training volume, protein, calories, body weight, goals, recovery, or data quality.",bullets=[],conf="low",evidence=[];
    const named=strengthData.exercises.find(item=>q.includes(item.exercise.toLowerCase())||(q.includes("bench")&&item.exercise==="Chest Press")||(q.includes("squat")&&item.exercise==="Leg Press")||(q.includes("back")&&item.exercise==="Seated Cable Row")||(/ضغط (الصدر|صدر)/.test(q)&&item.exercise==="Chest Press")||(/ضغط (الرجل|الساق)/.test(q)&&item.exercise==="Leg Press")||(/سحب.*(علوي|لات)/.test(q)&&item.exercise==="Lat Pulldown")||(/سحب.*(جالس|كابل)/.test(q)&&item.exercise==="Seated Cable Row"));
    if(named||/strong|e1rm|one rep|max|lift|progress|قوة|تقدم|أقصى حمل/.test(q)){
      const item=named||strengthData.exercises[0];title=item?`${item.exercise} strength`:"Strength needs more data";summary=item?`Your best estimated 1RM is ${item.currentE1rm} kg${item.change28d===null?"":`, ${item.change28d>=0?"up":"down"} ${Math.abs(item.change28d)}% across the available 28-day comparison`}.`:"Log weight and reps for at least three sessions to calculate lift-specific trends.";if(item){bullets=[item.plateau?"The recent pattern meets the app's plateau flag.":"No deterministic plateau flag is active.",`Recommended action: ${item.recommendation==="progress"?"use the smallest available increase if the warm-up is pain-free":item.recommendation==="reduce"?"repeat or reduce the load":"add a clean rep before adding load"}.`];conf=item.confidence;evidence=[`${item.sessionCount} sessions and ${item.setCount} weighted sets`,`${item.records[0].date} to ${item.records.at(-1).date}`,`Best recorded ${item.bestDate}`];}
    }else if(/plateau|stall|stuck|ثبات|متوقف|توقف/.test(q)){
      title="Plateau check";summary=strengthData.plateaus.length?`${strengthData.plateaus.map(item=>item.exercise).join(", ")} ${strengthData.plateaus.length===1?"is":"are"} currently flagged for no material e1RM improvement across recent sessions.`:"No exercise currently meets the deterministic plateau rule.";bullets=["The rule requires at least three sessions and at least 14 days of history.","A plateau flag is a training signal, not a medical conclusion."];conf=strengthData.confidence;evidence=[strengthData.dateRange,`${strengthData.sessions.length} exercise-session records`];
    }else if(/protein|calorie|nutrition|food|maintenance|tdee|بروتين|سعرات|تغذية|طعام|صيانة/.test(q)){
      title="Nutrition consistency";summary=`Over 7 days, food was logged on ${nutritionData.adherence7.loggedDays}/7 days. Protein adherence was ${nutritionData.adherence7.protein===null?"not available":`${nutritionData.adherence7.protein}%`} and calorie adherence was ${nutritionData.adherence7.calories===null?"not available":`${nutritionData.adherence7.calories}%`}.`;bullets=[nutritionData.maintenance?`Estimated maintenance range: ${nutritionData.maintenance.low}–${nutritionData.maintenance.high} kcal/day.`:"Maintenance calories need at least four weigh-ins and 14 logged food days with 50% coverage.","Nutrition values and maintenance are estimates, not medical prescriptions."];conf=nutritionData.confidence;evidence=[nutritionData.dateRange,`${nutritionData.days.length} logged days`,`${nutritionData.weights.length} weigh-ins`];
    }else if(/weight|fat|gain|lose|goal|forecast|when|وزن|دهون|زيادة|خسارة|هدف|توقع|متى/.test(q)){
      title="Goal and body-weight trend";summary=nutritionData.currentWeight===null?"No body-weight trend is available yet.":`Current recorded weight is ${nutritionData.currentWeight} kg and the robust trend is ${nutritionData.weightSlopePerWeek===null?"still calibrating":`${nutritionData.weightSlopePerWeek>0?"+":""}${nutritionData.weightSlopePerWeek} kg/week`}.`;bullets=[goal.status==="forecast"?`Current goal forecast: ${goal.dateRange[0]} to ${goal.dateRange[1]}.`:goal.status==="achieved"?"The saved goal target is currently achieved.":"A forecast needs a numeric target and a stable trend moving toward it.",goal.nextAction];conf=goal.confidence;evidence=[goal.evidence,nutritionData.dateRange];
    }else if(/quality|confidence|source|missing|duplicate|fresh|جودة|ثقة|مصدر|ناقص|مفقود|مكرر|تكرار|حديث/.test(q)){
      title="Data quality";summary=`Cross-domain data confidence is ${quality.overall}%. ${quality.duplicateCount?`${quality.duplicateCount} duplicate keys need attention.`:"No duplicate record keys were detected."}`;bullets=quality.domains.map(domain=>`${domain.label}: ${domain.score}% coverage score${domain.freshnessDays===null?"":` · ${domain.freshnessDays}d since latest record`}`);conf=quality.confidence;evidence=[...quality.healthSources.map(item=>`${item.source}: ${item.count} health days`),...quality.warnings];
    }else if(/sleep|recovery|readiness|hrv|rest|نوم|استشفاء|جاهزية|راحة|تقلب/.test(q)){
      const recent=Array.from({length:7},(_,index)=>dailyReadiness(state,shiftDay(nowKey,index-6))).filter(finite);title="Recovery pattern";summary=recent.length?`The local seven-day readiness estimate averages ${round(average(recent),0)}% across ${recent.length} logged days.`:"There are not enough sleep or recovery check-ins for a seven-day estimate.";bullets=["The main Health Coach remains the authoritative readiness calculation.","This answer is a wellness observation, not a diagnosis."];conf=confidence(recent.length,recent.length/7);evidence=[`${recent.length}/7 readiness days`,`${shiftDay(nowKey,-6)} to ${nowKey}`];
    }
    return {question:String(question||"").trim(),title,summary,bullets,confidence:conf,evidence:evidence.filter(Boolean),boundary:"Local association and trend analysis only; no diagnosis or proof of cause."};
  }

  const EXERCISE_SUBSTITUTIONS = {
    "Chest Press": ["Incline Dumbbell Press", "Dumbbell Bench Press", "Push-ups", "Dips", "Machine Chest Fly"],
    "Leg Press": ["Barbell Back Squat", "Goblet Squat", "Bulgarian Split Squat", "Leg Extension"],
    "Lat Pulldown": ["Pull-ups", "Single-Arm Dumbbell Row", "Resistance Band Pulldown"],
    "Seated Cable Row": ["Barbell Bent-Over Row", "Chest-Supported Row", "Inverted Row"],
    "Back Extension": ["Romanian Deadlift (RDL)", "Good Mornings", "Single-Leg RDL"],
    "Hip Thrust Machine": ["Barbell Hip Thrust", "Glute Bridges", "Cable Pull-Through"],
    "Glute Bridges": ["Hip Thrust Machine", "Single-Leg Glute Bridge", "Step-ups"],
    "Bird-Dog": ["Deadbug", "Plank", "Pallof Press"],
    "Plank": ["Ab Wheel Rollout", "Hollow Body Hold", "Deadbug"],
    "Hand Grip": ["Farmer's Walk", "Wrist Curls", "Dead Hang"]
  };

  function progressionAdvice(exerciseName, state, nowKey = dateKey()){
    const strengthData = strength(state, nowKey);
    const item = strengthData.exercises.find(e => e.exercise.toLowerCase() === String(exerciseName||"").toLowerCase());
    if(!item || item.records.length < 2){
      return { status: "initial", deltaKg: 0, badge: "🌱 Baseline", message: "Log 2+ sessions to unlock progression recommendations." };
    }
    const recentSessions = item.records.slice(-2);
    const s1Id = recentSessions[0].sessionId, s2Id = recentSessions[1].sessionId;
    const s1Rows = strengthData.rows.filter(r => r.sessionId === s1Id && r.exercise === item.exercise);
    const s2Rows = strengthData.rows.filter(r => r.sessionId === s2Id && r.exercise === item.exercise);

    const latestWeight = s2Rows.length ? Math.max(...s2Rows.map(r => r.weight)) : (item.records.at(-1)?.bestE1rm || 0);
    const isLower = ["Leg Press", "Hip Thrust Machine", "Glute Bridges", "Back Extension"].some(n => item.exercise.includes(n));
    const stepKg = isLower ? 2.5 : 1.25;

    const s1AvgReps = s1Rows.length ? (average(s1Rows.map(r => r.reps))||0) : 0;
    const s2AvgReps = s2Rows.length ? (average(s2Rows.map(r => r.reps))||0) : 0;
    const repsSolid = s1AvgReps >= 10 && s2AvgReps >= 10;
    const rpeLow = (recentSessions[1].meanRpe === null || recentSessions[1].meanRpe <= 8) && (recentSessions[0].meanRpe === null || recentSessions[0].meanRpe <= 8);
    const e1rmImproving = recentSessions[1].bestE1rm >= recentSessions[0].bestE1rm;

    if(repsSolid && rpeLow && e1rmImproving){
      return {
        status: "bump",
        deltaKg: stepKg,
        suggestedWeight: round(latestWeight + stepKg, 1),
        badge: `🚀 +${stepKg}kg Micro-load`,
        message: `Target reps hit at RPE ≤ 8 across last 2 sessions. Ready to bump weight to ${round(latestWeight + stepKg, 1)} kg.`
      };
    }

    const rpeHigh = recentSessions[1].meanRpe >= 9.5 && recentSessions[0].meanRpe >= 9.5;
    const repsDropping = s2AvgReps < s1AvgReps - 2;
    if((rpeHigh || repsDropping) && item.plateau){
      return {
        status: "deload",
        deltaKg: -round(latestWeight * 0.15, 1),
        suggestedWeight: round(latestWeight * 0.85, 1),
        badge: "🛡️ Auto-Deload",
        message: `High accumulated fatigue detected. Consider a deload session at ${round(latestWeight * 0.85, 1)} kg (15% reduction).`
      };
    }

    return {
      status: "hold",
      deltaKg: 0,
      suggestedWeight: latestWeight,
      badge: "🎯 Hold & Build",
      message: `Hold ${latestWeight} kg and build clean reps toward the top of the rep target.`
    };
  }

  function muscleVolumeHeatmap(state, nowKey = dateKey()){
    const history = safeArray(state?.history);
    const end = nowKey;
    const volumeByMuscle = {
      Chest: { sets: 0, volumeKg: 0, status: "recovered", color: "#4ade80", label: "Chest" },
      Back: { sets: 0, volumeKg: 0, status: "recovered", color: "#4ade80", label: "Back" },
      Quads: { sets: 0, volumeKg: 0, status: "recovered", color: "#4ade80", label: "Quads" },
      Hamstrings: { sets: 0, volumeKg: 0, status: "recovered", color: "#4ade80", label: "Hamstrings" },
      Glutes: { sets: 0, volumeKg: 0, status: "recovered", color: "#4ade80", label: "Glutes" },
      Shoulders: { sets: 0, volumeKg: 0, status: "recovered", color: "#4ade80", label: "Shoulders" },
      Arms: { sets: 0, volumeKg: 0, status: "recovered", color: "#4ade80", label: "Arms" },
      Core: { sets: 0, volumeKg: 0, status: "recovered", color: "#4ade80", label: "Core" }
    };

    for(const workout of history){
      if(!inWindow(workout.date, end, 7)) continue;
      const loads = workout.loads || {};
      for(const [exercise, rawSets] of Object.entries(loads)){
        const muscles = MUSCLES[exercise] || (exercise.includes("Press") ? ["Chest"] : exercise.includes("Row") || exercise.includes("Pull") ? ["Back"] : exercise.includes("Squat") ? ["Quads"] : ["Core"]);
        const rows = setRows(workout, exercise);
        for(const row of rows){
          const w = Number(row.weight) || 0, r = Number(row.reps) || 0;
          for(const m of muscles){
            if(volumeByMuscle[m]){
              volumeByMuscle[m].sets += 1;
              volumeByMuscle[m].volumeKg += w * r;
            }
          }
        }
      }
    }

    for(const [, data] of Object.entries(volumeByMuscle)){
      data.volumeKg = round(data.volumeKg, 0);
      if(data.sets < 6){
        data.status = "recovered";
        data.statusLabel = "Recovered / Primed";
        data.color = "#4ade80";
      } else if(data.sets <= 16){
        data.status = "optimal";
        data.statusLabel = "Optimal Stimulus";
        data.color = "#2dd4bf";
      } else {
        data.status = "fatigued";
        data.statusLabel = "High Volume";
        data.color = "#f87171";
      }
    }

    return volumeByMuscle;
  }

  function analyze(state,options={}){
    const nowKey=dateKey(options.now)||dateKey();
    const strengthData=strength(state,nowKey),nutritionData=nutrition(state,nowKey),deps={strengthData,nutritionData};
    const quality=dataQuality(state,nowKey,deps);
    return {nowKey,strength:strengthData,nutrition:nutritionData,quality,experiments:experiments(state,nowKey,deps),goal:goalForecast(state,state?.analyticsGoal,nowKey,deps),inbox:inbox(state,state?.insightControls,nowKey,{...deps,quality}),muscleVolume:muscleVolumeHeatmap(state,nowKey)};
  }

  return {GOAL_TYPES,MUSCLES,EXERCISE_SUBSTITUTIONS,dateKey,shiftDay,e1rm,normalizeGoal,setRows,strength,nutrition,dataQuality,experiments,goalForecast,inbox,ask,analyze,progressionAdvice,muscleVolumeHeatmap};
});
