(function(root,factory){
  const api=factory();
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
  root.REP_ADAPTIVE_COACH=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  const DATE_RE=/^\d{4}-\d{2}-\d{2}$/;
  const LOAD_EXERCISES=new Set(["Leg Press","Back Extension","Hip Thrust Machine","Chest Press","Seated Cable Row","Lat Pulldown"]);
  const FOCUS_TO_SESSION={gym:"gym",football:"football",padel:"padel",cardio:"cardio",recovery:"bad",spa:"bad",activespa:"bad",rest:null};
  const clamp=(value,min,max)=>Math.min(max,Math.max(min,Number(value)||0));
  const roundTo=(value,step)=>Math.round((Number(value)||0)/step)*step;
  const dateKey=value=>{
    if(typeof value==="string"&&DATE_RE.test(value.slice(0,10)))return value.slice(0,10);
    const date=value instanceof Date?value:new Date(value||Date.now());
    return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
  };
  function normalizeOnboarding(value={}){
    const equipment=Array.isArray(value.equipment)?value.equipment.filter(item=>["machines","dumbbells","bodyweight","bands","cardio"].includes(item)):[];
    return {version:1,completedAt:value.completedAt||null,skipped:Boolean(value.skipped),goal:["strength","muscle","fat-loss","fitness","recovery"].includes(value.goal)?value.goal:"strength",experience:["new","returning","experienced"].includes(value.experience)?value.experience:"new",daysPerWeek:clamp(value.daysPerWeek||3,2,6),preferredSessionMinutes:[30,45,60].includes(Number(value.preferredSessionMinutes))?Number(value.preferredSessionMinutes):45,equipment:equipment.length?equipment:["machines","cardio"],healthConnection:value.healthConnection==="now"?"now":"later"};
  }
  function plannedSession(focus){return Object.hasOwn(FOCUS_TO_SESSION,focus)?FOCUS_TO_SESSION[focus]:"gym";}
  function todayPlan({state,focus="gym",recommendation,date=dateKey()}={}){
    const baseSession=plannedSession(focus),mode=recommendation?.mode||"normal";let targetSession=baseSession;
    if(!baseSession||mode==="pause")targetSession=null;else if(mode==="recovery")targetSession="bad";else if(mode==="reduced")targetSession=baseSession==="gym"?"gymLite":"bad";
    const adjustments=[];
    if(!targetSession)adjustments.push("No loaded training today","Gentle movement only if comfortable");
    else if(targetSession==="gymLite")adjustments.push("3 main lifts instead of 5","2 sets per lift","Start about 10% lighter","Stop with 3–4 reps in reserve");
    else if(targetSession==="bad")adjustments.push("5–7 minute recovery floor","No loaded exercises","Finish feeling better than you started");
    else adjustments.push("Keep the planned exercise order","Use accepted next-session targets","Only progress if warm-up reps are crisp and pain-free");
    return {id:`adaptive-${date}`,date,mode,targetSession,baseSession,focus,title:recommendation?.title||"Use the planned session",detail:recommendation?.detail||"Use your warm-up as the final check.",volumeFactor:clamp(recommendation?.volumeFactor??1,0,1),intensityFactor:clamp(recommendation?.intensityFactor??1,0,1),adjustments,appliedAt:state?.activeWorkoutPlan?.date===date?state.activeWorkoutPlan.appliedAt||null:null};
  }
  function latestWeight(state,name){
    const target=Number(state?.trainingTargets?.[name]?.targetWeight);if(target>0)return target;
    const log=state?.logs?.[name],sets=[...(log?.previousSets||[]),...(log?.sets||[])],weights=sets.map(set=>Number(set?.weight)).filter(value=>value>0);if(weights.length)return weights[0];
    for(const record of state?.history||[]){const rows=(record.entries||[]).filter(row=>row.exercise===name).map(row=>Number(row.weight)).filter(value=>value>0);if(rows.length)return Math.max(...rows);}return 0;
  }
  function applyPlan(state,plan,sessions){
    if(!state||!plan)return null;state.activeWorkoutPlan={...plan,appliedAt:new Date().toISOString()};const session=plan.targetSession&&sessions?.[plan.targetSession];if(!session)return state.activeWorkoutPlan;
    for(const item of session.exercises||[]){
      if(!LOAD_EXERCISES.has(item.name))continue;
      const name=item.name==="Back Extension"&&state.swaps?.backExtension?"Hip Thrust Machine":item.name,base=latestWeight(state,name);if(!base)continue;
      const factor=plan.mode==="reduced"?.9:plan.intensityFactor||1,step=["Leg Press","Back Extension","Hip Thrust Machine"].includes(name)?2.5:1.25,weight=Math.max(step,roundTo(base*factor,step)),previous=state.logs?.[name]?.sets||state.logs?.[name]?.previousSets||[];state.logs=state.logs||{};
      state.logs[name]={previousSets:(state.logs[name]?.previousSets||previous).map(set=>({...set})),sets:Array.from({length:item.sets||1},()=>({weight:String(weight),reps:"",rpe:"",note:""}))};
    }return state.activeWorkoutPlan;
  }
  function buildProgressionProposals(state,record,performance){
    if(!record||!["gym","gymLite"].includes(record.session))return [];
    const byExercise=new Map();
    for(const row of record.entries||[]){const weight=Number(row.weight),reps=Number(row.reps),rpe=Number(row.rpe);if(!LOAD_EXERCISES.has(row.exercise)||!weight)continue;const existing=byExercise.get(row.exercise)||{weights:[],reps:[],rpes:[]};existing.weights.push(weight);if(reps)existing.reps.push(reps);if(rpe)existing.rpes.push(rpe);byExercise.set(row.exercise,existing);}
    return [...byExercise].map(([exercise,rows])=>{const currentWeight=Math.max(...rows.weights),advice=performance?.progressionAdvice?.(exercise,state,dateKey(record.date))||{status:"initial"},step=["Leg Press","Back Extension","Hip Thrust Machine"].includes(exercise)?2.5:1.25,targetWeight=Math.max(step,roundTo(Number(advice.suggestedWeight)||currentWeight,step)),avgReps=rows.reps.length?Math.round(rows.reps.reduce((a,b)=>a+b,0)/rows.reps.length):10,status=advice.status||"initial";return {exercise,status,currentWeight,targetWeight,repsLow:status==="deload"?8:Math.min(10,avgReps),repsHigh:12,sets:record.session==="gymLite"?2:3,reason:advice.message||(status==="initial"?"Repeat this load once more to establish a reliable baseline.":"Hold and build clean reps."),sourceSessionId:record.id,createdAt:new Date().toISOString()};});
  }
  function applyProgression(state,proposals){
    state.trainingTargets=state.trainingTargets&&typeof state.trainingTargets==="object"?state.trainingTargets:{};state.logs=state.logs&&typeof state.logs==="object"?state.logs:{};const acceptedAt=new Date().toISOString();
    for(const proposal of proposals||[]){const accepted={...proposal,acceptedAt};state.trainingTargets[proposal.exercise]=accepted;const previous=state.logs[proposal.exercise]?.previousSets||state.logs[proposal.exercise]?.sets||[];state.logs[proposal.exercise]={previousSets:previous.map(set=>({...set})),sets:Array.from({length:proposal.sets||3},()=>({weight:String(proposal.targetWeight),reps:"",rpe:"",note:""}))};}return acceptedAt;
  }
  function suggestedSchedule(daysPerWeek){
    const count=clamp(daysPerWeek||3,2,6),gymDaysByCount={2:["Sunday","Thursday"],3:["Sunday","Tuesday","Thursday"],4:["Sunday","Monday","Tuesday","Thursday"],5:["Sunday","Monday","Tuesday","Wednesday","Thursday"],6:["Sunday","Monday","Tuesday","Wednesday","Thursday","Saturday"]},gymDays=gymDaysByCount[count],days=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],schedule={};
    for(const day of days)schedule[day]={morning:day!=="Friday",focus:gymDays.includes(day)?"gym":day==="Friday"?"rest":"recovery"};return schedule;
  }
  return Object.freeze({dateKey,normalizeOnboarding,plannedSession,todayPlan,applyPlan,buildProgressionProposals,applyProgression,suggestedSchedule});
});
